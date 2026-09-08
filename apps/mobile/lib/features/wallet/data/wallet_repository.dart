import 'dart:math';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/wallet_models.dart';

/// Carteira: streams realtime de saldo e transações + pedidos de
/// depósito multi-método e histórico de levantamentos.
///
/// Fluxo de depósito (alinhado com produção/web):
///  1. App carrega as contas activas de `platform_payment_accounts`
///     (M-Pesa, e-Mola, mKesh, Banco) — leitura pública da BD.
///  2. Cria registo em `mpesa_manual_payments` com referência única,
///     destino = conta da plataforma e método em `metadata`.
///  3. Utilizador envia o valor e (opcional) anexa o comprovativo no
///     bucket `mpesa-proofs`.
///  4. Admin/country_manager confirma com `confirm_mpesa_payment` →
///     o saldo entra via `wallet_credit` e o realtime atualiza a UI.
class WalletRepository {
  WalletRepository(this._client);

  final SupabaseClient _client;

  /// Saldo em tempo real (stream Postgres Changes).
  Stream<Wallet?> watchWallet(String userId) => _client
      .from('wallets')
      .stream(primaryKey: ['user_id'])
      .eq('user_id', userId)
      .map((rows) => rows.isEmpty ? null : Wallet.fromJson(rows.first));

  /// Histórico em tempo real (mais recente primeiro).
  Stream<List<WalletTransaction>> watchTransactions(String userId) => _client
      .from('wallet_transactions')
      .stream(primaryKey: ['id'])
      .eq('user_id', userId)
      .order('created_at', ascending: false)
      .map((rows) => rows.map(WalletTransaction.fromJson).toList());

  // ── Contas da plataforma (multi-método) ────────────────────────────

  /// Contas de recebimento activas (mpesa/emola/mkesh/bank).
  /// Se a tabela não existir/estiver vazia, devolve fallback M-Pesa.
  Future<List<PlatformAccount>> fetchPaymentAccounts() async {
    try {
      final rows = await _client
          .from('platform_payment_accounts')
          .select()
          .eq('is_active', true)
          .order('method');
      if (rows.isEmpty) return PlatformAccount.fallback();
      return rows.map(PlatformAccount.fromJson).toList();
    } catch (_) {
      return PlatformAccount.fallback();
    }
  }

  /// Cria pedido de depósito e devolve a referência para o pagamento.
  Future<String> createDeposit({
    required double amount,
    required String payerName,
    required String payerPhone,
    required PlatformAccount account,
    String? proofPath,
  }) async {
    final ref = 'MW${DateTime.now().millisecondsSinceEpoch}${_rand()}';

    await _client.from('mpesa_manual_payments').insert({
      'reference': ref,
      'amount_mzn': amount,
      'description': 'Depósito de carteira (${account.methodLabel})',
      'payer_name': payerName,
      'payer_phone': payerPhone,
      'destination_number': account.accountNumber,
      'metadata': {
        'method': account.method,
        'account_name': account.accountName,
        if (proofPath != null) 'proof_path': proofPath,
        'origin': 'flutter_app',
      },
    });

    return ref;
  }

  /// Envia o comprovativo (foto do SMS/recibo) para o bucket privado
  /// `mpesa-proofs` e devolve o caminho.
  Future<String> uploadProof(String reference, List<int> bytes,
      {String ext = 'jpg'}) async {
    final path = 'proofs/$reference.$ext';
    await _client.storage.from('mpesa-proofs').uploadBinary(
          path,
          bytes,
          fileOptions: const FileOptions(upsert: true),
        );
    return path;
  }

  // ── Levantamentos ──────────────────────────────────────────────────

  /// Últimos pedidos de levantamento do utilizador.
  Future<List<WithdrawalRow>> fetchWithdrawals(String userId) async {
    try {
      final rows = await _client
          .from('withdrawal_requests')
          .select()
          .eq('user_id', userId)
          .order('created_at', ascending: false)
          .limit(20);
      return rows.map(WithdrawalRow.fromJson).toList();
    } catch (_) {
      return const [];
    }
  }

  String _rand() =>
      (Random().nextInt(900) + 100).toString(); // sufixo anti-colisão
}

/// Conta de recebimento da plataforma (leitura pública).
class PlatformAccount {
  const PlatformAccount({
    required this.method,
    required this.accountName,
    required this.accountNumber,
    this.instructions,
  });

  final String method; // mpesa | emola | mkesh | bank
  final String accountName;
  final String accountNumber;
  final String? instructions;

  String get methodLabel => switch (method) {
        'mpesa' => 'M-Pesa',
        'emola' => 'e-Mola',
        'mkesh' => 'mKesh',
        'bank' => 'Banco',
        _ => method.toUpperCase(),
      };

  IconData get icon => switch (method) {
        'mpesa' => Icons.phone_android_rounded,
        'emola' => Icons.phone_iphone_rounded,
        'mkesh' => Icons.smartphone_rounded,
        'bank' => Icons.account_balance_rounded,
        _ => Icons.payment_rounded,
      };

  Color get color => switch (method) {
        'mpesa' => const Color(0xFFE5484D),
        'emola' => const Color(0xFFF5A623),
        'mkesh' => const Color(0xFF38BDF8),
        'bank' => const Color(0xFF22C55E),
        _ => AppColors.accent,
      };

  factory PlatformAccount.fromJson(Map<String, dynamic> j) =>
      PlatformAccount(
        method: (j['method'] ?? 'mpesa') as String,
        accountName: (j['account_name'] ?? '') as String,
        accountNumber: (j['account_number'] ?? '') as String,
        instructions: j['instructions'] as String?,
      );

  /// Fallback quando a tabela não está acessível (config estática).
  static List<PlatformAccount> fallback() => const [
        PlatformAccount(
          method: 'mpesa',
          accountName: 'MedWallet',
          accountNumber: '+258840000000',
        ),
      ];
}

/// Linha da tabela `withdrawal_requests`.
class WithdrawalRow {
  const WithdrawalRow({
    required this.id,
    required this.amount,
    required this.method,
    required this.destination,
    required this.status,
    required this.createdAt,
    this.processedAt,
    this.adminNotes,
  });

  final String id;
  final double amount;
  final String method;
  final String destination;
  final String status;
  final DateTime createdAt;
  final DateTime? processedAt;
  final String? adminNotes;

  Color get statusColor => switch (status) {
        'pending' => AppColors.warning,
        'approved' || 'completed' || 'paid' => AppColors.success,
        'rejected' => AppColors.danger,
        _ => AppColors.textSecondary,
      };

  String get statusLabel => switch (status) {
        'pending' => 'Em análise',
        'approved' => 'Aprovado',
        'completed' => 'Pago',
        'paid' => 'Pago',
        'rejected' => 'Recusado',
        _ => status,
      };

  factory WithdrawalRow.fromJson(Map<String, dynamic> j) => WithdrawalRow(
        id: j['id'] as String,
        amount: (j['amount'] as num?)?.toDouble() ?? 0,
        method: (j['method'] ?? '') as String,
        destination: (j['destination'] ?? '') as String,
        status: (j['status'] ?? 'pending') as String,
        createdAt: DateTime.tryParse(j['created_at']?.toString() ?? '') ??
            DateTime.now(),
        processedAt: j['processed_at'] == null
            ? null
            : DateTime.tryParse(j['processed_at'].toString()),
        adminNotes: j['admin_notes'] as String?,
      );
}
