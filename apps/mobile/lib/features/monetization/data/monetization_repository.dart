import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Hub de Monetização (paridade com `pages/MonetizationHub.tsx` da web):
/// junta num só ecrã o estado de subscrição, o código de convite com
/// estatísticas, a configuração de bónus (`platform_settings`) e os
/// últimos movimentos da carteira — atalhos para os restantes módulos.
/// Zero alterações de backend.
class ReferralInfo {
  const ReferralInfo({
    required this.referralCode,
    required this.referrals,
    required this.completedCount,
    required this.totalBonusMzn,
  });

  final String referralCode;
  final List<ReferralRow> referrals;
  final int completedCount;
  final double totalBonusMzn;
}

class ReferralRow {
  const ReferralRow({
    required this.status,
    this.referredName,
    this.bonusMzn,
    this.createdAt,
  });

  final String status;
  final String? referredName;
  final double? bonusMzn;
  final DateTime? createdAt;

  bool get isCompleted => status == 'completed';
}

class HubWalletTx {
  const HubWalletTx({
    required this.id,
    required this.type,
    required this.amount,
    required this.currency,
    this.createdAt,
  });

  final String id;
  final String type;
  final double amount;
  final String currency;
  final DateTime? createdAt;

  bool get isPositive => amount >= 0;
}

class MonetizationRepository {
  MonetizationRepository(this._client);

  final SupabaseClient _client;

  static const Map<String, String> _statusLabels = {
    'active': 'Activa',
    'pending': 'Pendente',
    'cancelled': 'Cancelada',
    'expired': 'Expirada',
  };

  static String subscriptionLabel(String status) =>
      _statusLabels[status] ?? 'Sem subscrição';

  Future<ReferralInfo> fetchReferralInfo() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) {
      return const ReferralInfo(
          referralCode: '', referrals: [], completedCount: 0, totalBonusMzn: 0);
    }
    String code = '';
    String? fullName;
    try {
      final prof = await _client
          .from('profiles')
          .select('referral_code, full_name')
          .eq('user_id', uid)
          .limit(1);
      if (prof.isNotEmpty) {
        final p = Map<String, dynamic>.from(prof.first);
        code = p['referral_code']?.toString() ?? '';
        fullName = p['full_name']?.toString();
      }
    } catch (_) {}
    final rows = <ReferralRow>[];
    try {
      final refs = await _client
          .from('user_referrals')
          .select(
              'status, bonus_mzn, created_at, referred:profiles!user_referrals_referred_id_fkey(full_name)')
          .eq('referrer_id', uid)
          .order('created_at', ascending: false);
      for (final r in refs) {
        final m = Map<String, dynamic>.from(r);
        final referred = m['referred'];
        rows.add(ReferralRow(
          status: m['status']?.toString() ?? 'pending',
          referredName: referred is Map
              ? (referred as Map)['full_name']?.toString()
              : null,
          bonusMzn: (m['bonus_mzn'] as num?)?.toDouble(),
          createdAt: m['created_at'] != null
              ? DateTime.tryParse(m['created_at'].toString())
              : null,
        ));
      }
    } catch (_) {}
    // Garante código de convite (mesma política de 8 caracteres da web).
    if (code.isEmpty) {
      code = _generateCode(fullName ?? 'MW');
      try {
        await _client
            .from('profiles')
            .update({'referral_code': code}).eq('user_id', uid);
      } catch (_) {}
    }
    return ReferralInfo(
      referralCode: code,
      referrals: rows,
      completedCount: rows.where((r) => r.isCompleted).length,
      totalBonusMzn: rows.fold<double>(
          0, (a, r) => a + (r.isCompleted ? (r.bonusMzn ?? 0) : 0)),
    );
  }

  /// Referência MW-XXXXXX (sem 0/O/1/I) — igual à web.
  static const String _alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  String _generateCode(String seed) {
    final rng = DateTime.now().microsecondsSinceEpoch;
    var out = '';
    for (var i = 0; i < 8; i++) {
      out += _alphabet[(rng >> (i * 3)) % _alphabet.length];
    }
    return 'MW-$out';
  }

  /// Bónus configurados pelo admin (keys `referral_bonus_mzn` /
  /// `referral_bonus_coins`). Devolve zeros se ausentes.
  Future<(double, int)> fetchReferralBonus() async {
    try {
      final rows = await _client
          .from('platform_settings')
          .select('key, value')
          .inFilter('key', ['referral_bonus_mzn', 'referral_bonus_coins']);
      double mzn = 0;
      int coins = 0;
      for (final row in rows) {
        final m = Map<String, dynamic>.from(row);
        final key = m['key']?.toString();
        final value = num.tryParse(m['value']?.toString() ?? '') ?? 0;
        if (key == 'referral_bonus_mzn') mzn = value.toDouble();
        if (key == 'referral_bonus_coins') coins = value.toInt();
      }
      return (mzn, coins);
    } catch (_) {
      return (0.0, 0);
    }
  }

  Future<List<HubWalletTx>> fetchRecentTransactions({int limit = 5}) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return [];
    try {
      final rows = await _client
          .from('wallet_transactions')
          .select()
          .eq('user_id', uid)
          .order('created_at', ascending: false)
          .limit(limit);
      final list = <HubWalletTx>[];
      for (final row in rows) {
        final m = Map<String, dynamic>.from(row);
        list.add(HubWalletTx(
          id: m['id']?.toString() ?? '',
          type: m['type']?.toString() ?? 'outro',
          amount: (m['amount'] as num?)?.toDouble() ?? 0,
          currency: m['currency']?.toString() ?? 'MZN',
          createdAt: m['created_at'] != null
              ? DateTime.tryParse(m['created_at'].toString())
              : null,
        ));
      }
      return list;
    } catch (_) {
      return [];
    }
  }

  Future<String?> fetchSubscriptionStatus() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return null;
    try {
      final rows = await _client
          .from('subscriptions')
          .select('status')
          .eq('user_id', uid)
          .order('created_at', ascending: false)
          .limit(1);
      if (rows.isEmpty) return null;
      return Map<String, dynamic>.from(rows.first)['status']?.toString();
    } catch (_) {
      return null;
    }
  }
}

final monetizationRepositoryProvider = Provider<MonetizationRepository>(
    (ref) => MonetizationRepository(Supabase.instance.client));
