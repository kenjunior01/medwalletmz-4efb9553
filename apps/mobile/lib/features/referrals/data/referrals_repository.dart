import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Convites com recompensa — MESMA mecânica do produto web:
///
///   • o utilizador tem um código próprio (`profiles.referral_code`);
///   • quem é convidado aplica o código — INSERT em `user_referrals`
///     com o próprio id (`referred_id`, RLS "Users can create referrals");
///   • quando a plataforma verifica o convite (status → completed), o
///     trigger do backend credita DINHEIRO REAL nas carteiras via
///     `wallet_credit` — referrer recebe o bónus cheio, o convidado
///     metade ("bónus boas-vindas").
///
/// A app mostra EXCLUSIVAMENTE dinheiro real — nada de pontos/coins
/// (os `joy_coin_transactions` do backend são ignorados por decisão
/// de produto).
class Referral {
  const Referral({
    required this.id,
    required this.referrerId,
    required this.referredId,
    required this.status,
    required this.createdAt,
    this.completedAt,
  });

  final String id;
  final String referrerId;
  final String referredId;
  final String status;
  final DateTime createdAt;
  final DateTime? completedAt;

  bool get isCompleted => status == 'completed';
  bool get isPending => status == 'pending';

  String get statusLabel {
    switch (status) {
      case 'completed':
        return 'Concluído';
      case 'pending':
        return 'Em verificação';
      case 'rejected':
        return 'Inválido';
      default:
        return status;
    }
  }

  factory Referral.fromJson(Map<String, dynamic> j) => Referral(
        id: j['id'] as String,
        referrerId: (j['referrer_id'] ?? '') as String,
        referredId: (j['referred_id'] ?? '') as String,
        status: (j['status'] ?? 'pending') as String,
        createdAt:
            DateTime.tryParse(j['created_at']?.toString() ?? '') ??
                DateTime.now(),
        completedAt:
            DateTime.tryParse(j['completed_at']?.toString() ?? ''),
      );
}

class ReferralRepository {
  ReferralRepository(this._client);

  final SupabaseClient _client;

  /// O meu código de convite (`profiles.referral_code` — coluna
  /// pública-legível para authenticated). Se o perfil não tiver código
  /// (perfis antigos), gera um determinístico e tenta gravar.
  Future<String?> fetchMyCode() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return null;
    try {
      final rows = await _client
          .from('profiles')
          .select('referral_code')
          .eq('user_id', uid)
          .limit(1);
      if (rows is! List || rows.isEmpty) return null;
      final code = (rows.first as Map)['referral_code'] as String?;
      if (code != null && code.isNotEmpty) return code;

      // Sem código → propõe um curto e grava (UPDATE do próprio perfil,
      // permitido pela RLS "Users update own profile").
      final generated = _generateCode(uid);
      try {
        await _client.from('profiles').update({
          'referral_code': generated,
        }).eq('user_id', uid);
        return generated;
      } catch (_) {
        return null;
      }
    } catch (_) {
      return null;
    }
  }

  String _generateCode(String uid) {
    final base = uid.replaceAll('-', '').toUpperCase();
    final letters = base.codeUnits
        .where((c) => c >= 65 && c <= 90)
        .take(3)
        .map(String.fromCharCode)
        .join();
    final tail = base.length >= 3 ? base.substring(base.length - 3) : base;
    return '${letters.isEmpty ? 'MWZ' : letters}$tail'.substring(0, 8);
  }

  /// Histórico: convites que enviei (sou referrer) — RLS permite ver
  /// os dois lados; a UI destaca os meus convites.
  Future<List<Referral>> fetchMyInvites() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return const [];
    try {
      final rows = await _client
          .from('user_referrals')
          .select()
          .eq('referrer_id', uid)
          .order('created_at', ascending: false)
          .limit(50);
      return [
        for (final r in (rows as List))
          Referral.fromJson((r as Map).cast<String, dynamic>()),
      ];
    } catch (_) {
      return const [];
    }
  }

  /// Aplica o código de um amigo (utilizador convidado). Devolve null
  /// em sucesso ou mensagem amigável.
  Future<String?> applyFriendCode(String code) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return 'Sessão expirada. Entra novamente.';
    final clean = code.trim().toUpperCase();
    if (clean.length < 4) return 'Código inválido. Confere com o amigo.';

    try {
      // 1) Resolve o referrer pelo código.
      final owners = await _client
          .from('profiles')
          .select('user_id')
          .eq('referral_code', clean)
          .limit(1);
      if (owners is! List || owners.isEmpty) {
        return 'Código não encontrado. Confere e tenta de novo.';
      }
      final referrerId = (owners.first as Map)['user_id'] as String;
      if (referrerId == uid) {
        return 'Não podes usar o teu próprio código 😉';
      }

      // 2) Já apliquei algum convite? (referred_id é UNIQUE)
      final mine = await _client
          .from('user_referrals')
          .select('id')
          .eq('referred_id', uid)
          .limit(1);
      if (mine is List && mine.isNotEmpty) {
        return 'Já aplicaste um convite — só um código por conta.';
      }

      // 3) Cria o convite (status pending; a plataforma verifica).
      await _client.from('user_referrals').insert({
        'referrer_id': referrerId,
        'referred_id': uid,
        'referral_code': clean,
        'status': 'pending',
      });
      return null;
    } catch (_) {
      return 'Não foi possível aplicar o código. Tenta novamente.';
    }
  }

  /// Estatísticas do conviter.
  Future<({int invites, int completed})> fetchStats() async {
    final invites = await fetchMyInvites();
    final completed = invites.where((r) => r.isCompleted).length;
    return (invites: invites.length, completed: completed);
  }
}

final referralRepositoryProvider = Provider<ReferralRepository>((ref) {
  return ReferralRepository(Supabase.instance.client);
});
