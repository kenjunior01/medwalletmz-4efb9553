import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// F42 — Vouchers de Saúde familiares (paridade com a web).
///
/// REA (MediWallet.co.za — "send health vouchers to loved ones"):
/// o emissor debita a carteira e gera um código; o destinatário resgata
/// o código e recebe o valor. O cliente envia APENAS dados do voucher;
/// `user_id`, débito e crédito são derivados/feitos no SERVIDOR via
/// RPCs SECURITY DEFINER (anti-manipulação, padrão F39/F41).
enum VoucherStatus { active, redeemed, cancelled, expired }

class HealthVoucher {
  const HealthVoucher({
    required this.id,
    required this.code,
    required this.senderId,
    required this.amount,
    required this.category,
    this.message,
    required this.status,
    this.recipientPhone,
    this.expiresAt,
    required this.createdAt,
  });

  final String id;
  final String code;
  final String senderId;
  final double amount;
  final String category;
  final String? message;
  final VoucherStatus status;
  final String? recipientPhone;
  final DateTime? expiresAt;
  final DateTime createdAt;

  static VoucherStatus _parseStatus(String? s) {
    switch (s) {
      case 'active':
        return VoucherStatus.active;
      case 'redeemed':
        return VoucherStatus.redeemed;
      case 'expired':
        return VoucherStatus.expired;
      default:
        return VoucherStatus.cancelled;
    }
  }

  factory HealthVoucher.fromMap(Map<String, dynamic> m) {
    return HealthVoucher(
      id: m['id'] as String,
      code: m['code'] as String,
      senderId: m['sender_id'] as String,
      amount: (m['amount'] as num?)?.toDouble() ?? 0,
      category: (m['category'] as String?) ?? 'qualquer',
      message: m['message'] as String?,
      status: _parseStatus(m['status'] as String?),
      recipientPhone: m['recipient_phone'] as String?,
      expiresAt: m['expires_at'] == null
          ? null
          : DateTime.tryParse(m['expires_at'] as String),
      createdAt: DateTime.tryParse(m['created_at'] as String? ?? '') ??
          DateTime.now(),
    );
  }
}

class VoucherRepository {
  VoucherRepository(this._client);

  final SupabaseClient _client;

  /// Id do utilizador autenticado (null = visitante).
  String? get currentUserId => _client.auth.currentUser?.id;

  /// Lista vouchers do utilizador (enviados + recebidos via RLS).
  /// Offline → lista vazia (ecrã mostra empty-state).
  Future<List<HealthVoucher>> fetchMine() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return const [];
    try {
      final rows = await _client
          .from('health_vouchers')
          .select()
          .order('created_at', ascending: false)
          .limit(60);
      return (rows as List<dynamic>)
          .map((r) => HealthVoucher.fromMap(r as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return const [];
    }
  }

  /// Emite um voucher: servidor debita a carteira e devolve o código.
  /// Lança PostgrestException com a mensagem do servidor em falha.
  Future<HealthVoucher> create({
    required double amount,
    String category = 'qualquer',
    String? message,
    String? recipientPhone,
    int daysValid = 60,
  }) async {
    final data = await _client.rpc(
      'create_health_voucher',
      params: {
        'p_amount': amount,
        'p_category': category,
        'p_message': (message?.trim().isEmpty ?? true) ? null : message!.trim(),
        'p_recipient_phone':
            (recipientPhone?.trim().isEmpty ?? true) ? null : recipientPhone!.trim(),
        'p_days_valid': daysValid,
      },
    );
    final m = data as Map<String, dynamic>;
    return HealthVoucher(
      id: m['id'] as String,
      code: m['code'] as String,
      senderId: _client.auth.currentUser!.id,
      amount: (m['amount'] as num?)?.toDouble() ?? amount,
      category: (m['category'] as String?) ?? category,
      status: VoucherStatus.active,
      expiresAt: DateTime.tryParse(m['expires_at'] as String? ?? ''),
      createdAt: DateTime.now(),
    );
  }

  /// Resgata por código; servidor credita a carteira de quem resgata.
  /// Devolve o valor recebido.
  Future<double> redeem(String code) async {
    final data = await _client.rpc(
      'redeem_health_voucher',
      params: {'p_code': code.trim()},
    );
    final m = data as Map<String, dynamic>;
    return (m['amount'] as num?)?.toDouble() ?? 0;
  }

  /// Emissor cancela um voucher ativo — servidor devolve o valor.
  Future<void> cancel(String voucherId) async {
    await _client.rpc(
      'cancel_health_voucher',
      params: {'p_voucher_id': voucherId},
    );
  }
}

final voucherRepositoryProvider = Provider<VoucherRepository>(
  (ref) => VoucherRepository(Supabase.instance.client),
);
