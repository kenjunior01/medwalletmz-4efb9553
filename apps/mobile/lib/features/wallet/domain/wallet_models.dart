/// Modelos da carteira — tabelas `wallets` e `wallet_transactions`.
class Wallet {
  const Wallet({
    required this.userId,
    required this.balance,
    required this.totalDeposited,
    required this.totalSpent,
  });

  final String userId;
  final double balance;
  final double totalDeposited;
  final double totalSpent;

  factory Wallet.fromJson(Map<String, dynamic> json) => Wallet(
        userId: json['user_id'] as String,
        balance: _toNum(json['balance_mzn']),
        totalDeposited: _toNum(json['total_deposited']),
        totalSpent: _toNum(json['total_spent']),
      );

  static double _toNum(dynamic v) =>
      v is num ? v.toDouble() : double.tryParse('$v') ?? 0;
}

enum TxType { deposit, debit, credit, refund, bonus, commission, referral }

enum TxStatus { pending, completed, failed, reversed }

class WalletTransaction {
  const WalletTransaction({
    required this.id,
    required this.type,
    required this.amount,
    required this.balanceAfter,
    required this.status,
    this.description,
    this.paymentMethod,
    required this.createdAt,
  });

  final String id;
  final TxType type;
  final double amount;
  final double balanceAfter;
  final TxStatus status;
  final String? description;
  final String? paymentMethod;
  final DateTime createdAt;

  factory WalletTransaction.fromJson(Map<String, dynamic> json) =>
      WalletTransaction(
        id: json['id'] as String,
        type: _type(json['type'] as String?),
        amount: _toNum(json['amount']),
        balanceAfter: _toNum(json['balance_after']),
        status: _status(json['status'] as String? ?? 'completed'),
        description: json['description'] as String?,
        paymentMethod: json['payment_method'] as String?,
        createdAt: DateTime.parse(json['created_at'] as String),
      );

  /// Depósitos e créditos aumentam o saldo; débitos gastam.
  bool get isPositive =>
      type == TxType.deposit ||
      type == TxType.credit ||
      type == TxType.refund ||
      type == TxType.bonus ||
      type == TxType.commission ||
      type == TxType.referral;

  static TxType _type(String? t) => TxType.values.firstWhere(
        (e) => e.name == t,
        orElse: () => TxType.debit,
      );

  static TxStatus _status(String? s) => TxStatus.values.firstWhere(
        (e) => e.name == s,
        orElse: () => TxStatus.completed,
      );

  static double _toNum(dynamic v) =>
      v is num ? v.toDouble() : double.tryParse('$v') ?? 0;
}

/// Etiquetas legíveis (pt-MZ).
String txTypeLabel(TxType t) => switch (t) {
      TxType.deposit => 'Depósito',
      TxType.debit => 'Pagamento',
      TxType.credit => 'Crédito',
      TxType.refund => 'Reembolso',
      TxType.bonus => 'Bónus',
      TxType.commission => 'Comissão',
      TxType.referral => 'Referência',
    };

String txStatusLabel(TxStatus s) => switch (s) {
      TxStatus.pending => 'Pendente',
      TxStatus.completed => 'Concluído',
      TxStatus.failed => 'Falhou',
      TxStatus.reversed => 'Revertido',
    };
