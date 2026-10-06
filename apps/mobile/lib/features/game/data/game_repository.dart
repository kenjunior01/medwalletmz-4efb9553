import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// F41 — SaúdeCraft: repositório do jogo de mineração (paridade com a web).
///
/// O cliente envia APENAS a contagem de golpes da sessão; o SERVIDOR
/// (RPC `submit_mine_session`) valida a quota diária (400 golpes) e
/// calcula moedas/XP — o cliente nunca envia quantias.
class MineQuota {
  const MineQuota({required this.blocks, required this.coins});

  final int blocks;
  final int coins;

  static const MineQuota empty = MineQuota(blocks: 0, coins: 0);
}

class MineSessionResult {
  const MineSessionResult({
    required this.success,
    this.blocksCredited = 0,
    this.coinsAwarded = 0,
    this.xpAwarded = 0,
    this.blocksRemainingToday = 0,
    this.totalJoyCoins,
    this.totalXp,
    this.level,
  });

  final bool success;
  final int blocksCredited;
  final int coinsAwarded;
  final int xpAwarded;
  final int blocksRemainingToday;
  final int? totalJoyCoins;
  final int? totalXp;
  final int? level;

  static const MineSessionResult failure = MineSessionResult(success: false);

  factory MineSessionResult.fromMap(Map<String, dynamic> m) {
    int? readInt(String k) => (m[k] as num?)?.toInt();
    return MineSessionResult(
      success: m['success'] == true,
      blocksCredited: readInt('blocks_credited') ?? 0,
      coinsAwarded: readInt('coins_awarded') ?? 0,
      xpAwarded: readInt('xp_awarded') ?? 0,
      blocksRemainingToday: readInt('blocks_remaining_today') ?? 0,
      totalJoyCoins: readInt('total_joy_coins'),
      totalXp: readInt('total_xp'),
      level: readInt('level'),
    );
  }
}

class GameRepository {
  GameRepository(this._client);

  final SupabaseClient _client;

  static const int dailyLimit = 400;

  /// Golpes já gastos hoje (outras sessões/dispositivos). Offline → 0.
  Future<MineQuota> fetchTodayQuota() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return MineQuota.empty;
    try {
      final today = DateTime.now().toUtc().toIso8601String().substring(0, 10);
      final rows = await _client
          .from('game_mine_daily')
          .select('blocks, coins')
          .eq('user_id', uid)
          .eq('day', today)
          .limit(1);
      final list = rows as List<dynamic>;
      if (list.isEmpty) return MineQuota.empty;
      final m = list.first as Map<String, dynamic>;
      return MineQuota(
        blocks: (m['blocks'] as num?)?.toInt() ?? 0,
        coins: (m['coins'] as num?)?.toInt() ?? 0,
      );
    } catch (_) {
      // Offline-safe: joga localmente e sincroniza mais tarde.
      return MineQuota.empty;
    }
  }

  /// Sincroniza golpes da sessão; o servidor credita Joy Coins + XP.
  /// Devolve `null` em caso de falha de rede (o chamador re-enfileira).
  Future<MineSessionResult?> submitSession(int blocksMined) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null || blocksMined <= 0) return null;
    try {
      final data = await _client.rpc(
        'submit_mine_session',
        params: {'p_blocks_mined': blocksMined},
      );
      if (data is Map<String, dynamic>) {
        return MineSessionResult.fromMap(data);
      }
      return MineSessionResult.failure;
    } catch (_) {
      // Offline-safe: devolve null → o ecrã mantém os golpes na fila.
      return null;
    }
  }
}

final gameRepositoryProvider = Provider<GameRepository>(
  (ref) => GameRepository(Supabase.instance.client),
);
