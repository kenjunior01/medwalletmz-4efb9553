import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Recompensas & Conquistas (paridade com `pages/Rewards.tsx` da web):
///   • `user_gamification` — nível actual, XP, dias de streak, pontos;
///   • `achievements`      — catálogo activo ordenado por requisito;
///   • `user_achievements` — conquistas já desbloqueadas pelo utilizador;
///   • `joy_coin_transactions` — histórico de pontos (últimos 10);
///   • `weekly_leaderboard` (view) + top de pontos — Ranking da comunidade;
///   • `challenges` + `user_challenges` — Desafios da semana com adesão.
/// O progresso de nível usa a mesma regra da web: cada nível = 500 XP,
/// barra = (xp % 500) / 5 → percentagem. Zero alterações de backend.
class UserGamification {
  const UserGamification({
    required this.userId,
    required this.level,
    required this.experiencePoints,
    required this.joyCoins,
    required this.streakDays,
    required this.totalOrders,
    required this.totalReviews,
  });

  final String userId;
  final int level;
  final int experiencePoints;
  final int joyCoins;
  final int streakDays;
  final int totalOrders;
  final int totalReviews;

  /// Progresso dentro do nível actual (0–100), regra idêntica à web.
  double get levelProgress => ((experiencePoints % 500) / 5).clamp(0, 100);

  int get xpIntoLevel => experiencePoints % 500;

  factory UserGamification.fromMap(Map<String, dynamic> m) {
    return UserGamification(
      userId: m['user_id']?.toString() ?? '',
      level: (m['current_level'] as num?)?.toInt() ?? 1,
      experiencePoints: (m['experience_points'] as num?)?.toInt() ?? 0,
      joyCoins: (m['joy_coins'] as num?)?.toInt() ?? 0,
      streakDays: (m['streak_days'] as num?)?.toInt() ?? 0,
      totalOrders: (m['total_orders'] as num?)?.toInt() ?? 0,
      totalReviews: (m['total_reviews'] as num?)?.toInt() ?? 0,
    );
  }

  static const UserGamification empty = UserGamification(
    userId: '',
    level: 1,
    experiencePoints: 0,
    joyCoins: 0,
    streakDays: 0,
    totalOrders: 0,
    totalReviews: 0,
  );
}

class Achievement {
  const Achievement({
    required this.id,
    required this.code,
    required this.name,
    required this.description,
    required this.icon,
    required this.category,
    required this.requirementType,
    required this.requirementValue,
    required this.coinsReward,
    this.unlocked = false,
  });

  final String id;
  final String code;
  final String name;
  final String description;
  final String icon;
  final String category;
  final String requirementType;
  final int requirementValue;
  final int coinsReward;
  final bool unlocked;

  String get categoryEmoji {
    switch (category) {
      case 'explorer':
        return '🗺️';
      case 'gourmet':
        return '🍽️';
      case 'social':
        return '👥';
      case 'loyalty':
        return '💎';
      default:
        return '⭐';
    }
  }

  factory Achievement.fromMap(Map<String, dynamic> m, {required bool unlocked}) {
    return Achievement(
      id: m['id']?.toString() ?? '',
      code: m['code']?.toString() ?? '',
      name: m['name']?.toString() ?? '',
      description: m['description']?.toString() ?? '',
      icon: m['icon']?.toString() ?? '⭐',
      category: m['category']?.toString() ?? 'general',
      requirementType: m['requirement_type']?.toString() ?? '',
      requirementValue: (m['requirement_value'] as num?)?.toInt() ?? 0,
      coinsReward: (m['joy_coins_reward'] as num?)?.toInt() ?? 0,
      unlocked: unlocked,
    );
  }
}

class JoyTransaction {
  const JoyTransaction({
    required this.id,
    required this.amount,
    required this.type,
    this.description,
    this.createdAt,
  });

  final String id;
  final int amount;
  final String type;
  final String? description;
  final DateTime? createdAt;

  bool get isPositive => amount >= 0;

  String get typeLabel {
    switch (type) {
      case 'order':
        return 'Encomenda';
      case 'review':
        return 'Avaliação';
      case 'referral':
        return 'Convite';
      case 'streak':
        return 'Streak';
      case 'achievement':
        return 'Conquista';
      case 'redemption':
        return 'Resgate';
      default:
        return type;
    }
  }

  factory JoyTransaction.fromMap(Map<String, dynamic> m) {
    return JoyTransaction(
      id: m['id']?.toString() ?? '',
      amount: (m['amount'] as num?)?.toInt() ?? 0,
      type: m['transaction_type']?.toString() ?? 'outro',
      description: m['description']?.toString(),
      createdAt: m['created_at'] != null
          ? DateTime.tryParse(m['created_at'].toString())
          : null,
    );
  }
}

/// Entrada do ranking semanal — view `weekly_leaderboard` (mesma da web).
/// Nota RLS: a view usa security_invoker; com as políticas actuais cada
/// utilizador vê, no mínimo, a própria linha. Se a plataforma abrir o
/// ranking público, a app mostra-o completo sem alterações.
class LeaderboardEntry {
  const LeaderboardEntry({
    required this.userId,
    this.fullName,
    this.avatarUrl,
    this.weeklyOrders = 0,
    this.userLevel = 1,
    this.joyCoins = 0,
  });

  final String userId;
  final String? fullName;
  final String? avatarUrl;
  final int weeklyOrders;
  final int userLevel;
  final int joyCoins;

  factory LeaderboardEntry.fromMap(Map<String, dynamic> m) =>
      LeaderboardEntry(
        userId: m['user_id']?.toString() ?? '',
        fullName: m['full_name']?.toString(),
        avatarUrl: m['avatar_url']?.toString(),
        weeklyOrders: (m['weekly_orders'] as num?)?.toInt() ?? 0,
        userLevel: (m['user_level'] as num?)?.toInt() ?? 1,
        joyCoins: (m['joy_coins'] as num?)?.toInt() ?? 0,
      );
}

/// Entrada do top de pontos — `user_gamification` ORDER BY joy_coins
/// (mesma consulta de `useGamification.ts` da web, com join em profiles).
class PointsEntry {
  const PointsEntry({
    required this.userId,
    this.fullName,
    this.avatarUrl,
    this.joyCoins = 0,
    this.level = 1,
    this.streakDays = 0,
  });

  final String userId;
  final String? fullName;
  final String? avatarUrl;
  final int joyCoins;
  final int level;
  final int streakDays;

  factory PointsEntry.fromMap(Map<String, dynamic> m) {
    final profile = (m['profiles'] as Map?)?.cast<String, dynamic>();
    return PointsEntry(
      userId: m['user_id']?.toString() ?? '',
      fullName: profile?['full_name']?.toString(),
      avatarUrl: profile?['avatar_url']?.toString(),
      joyCoins: (m['joy_coins'] as num?)?.toInt() ?? 0,
      level: (m['current_level'] as num?)?.toInt() ?? 1,
      streakDays: (m['streak_days'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Desafio da semana (`challenges`) + estado de adesão do utilizador
/// (`user_challenges`) — mesmas tabelas do `WeeklyChallenges.tsx`.
class Challenge {
  const Challenge({
    required this.id,
    required this.title,
    required this.description,
    required this.icon,
    required this.targetValue,
    required this.coinsReward,
    required this.xpReward,
    this.joined = false,
    this.currentValue = 0,
    this.completedAt,
  });

  final String id;
  final String title;
  final String description;
  final String icon;
  final int targetValue;
  final int coinsReward;
  final int xpReward;
  final bool joined;
  final int currentValue;
  final DateTime? completedAt;

  bool get isCompleted => completedAt != null;

  /// Progresso 0–100 (só conta quando já aderiu, igual à web).
  double get progressPercent =>
      joined ? ((currentValue / targetValue) * 100).clamp(0, 100) : 0;

  factory Challenge.fromMaps(
    Map<String, dynamic> c,
    Map<String, dynamic>? mine,
  ) =>
      Challenge(
        id: c['id']?.toString() ?? '',
        title: c['title']?.toString() ?? '',
        description: c['description']?.toString() ?? '',
        icon: c['icon']?.toString() ?? '🎯',
        targetValue: (c['target_value'] as num?)?.toInt() ?? 1,
        coinsReward: (c['joy_coins_reward'] as num?)?.toInt() ?? 0,
        xpReward: (c['xp_reward'] as num?)?.toInt() ?? 0,
        joined: mine != null,
        currentValue: (mine?['current_value'] as num?)?.toInt() ?? 0,
        completedAt: mine?['completed_at'] != null
            ? DateTime.tryParse(mine!['completed_at'].toString())
            : null,
      );
}

class RewardsRepository {
  RewardsRepository(this._client);

  final SupabaseClient _client;

  Future<UserGamification> fetchGamification() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return UserGamification.empty;
    try {
      final rows = await _client
          .from('user_gamification')
          .select()
          .eq('user_id', uid)
          .limit(1);
      if (rows.isEmpty) return UserGamification.empty;
      return UserGamification.fromMap(Map<String, dynamic>.from(rows.first));
    } catch (_) {
      return UserGamification.empty;
    }
  }

  Future<List<Achievement>> fetchAchievements() async {
    final uid = _client.auth.currentUser?.id;
    final unlocked = <String>{};
    if (uid != null) {
      try {
        final mine = await _client
            .from('user_achievements')
            .select('achievement_id')
            .eq('user_id', uid);
        for (final row in mine) {
          final m = Map<String, dynamic>.from(row);
          unlocked.add(m['achievement_id']?.toString() ?? '');
        }
      } catch (_) {}
    }
    final rows = await _client
        .from('achievements')
        .select()
        .eq('is_active', true)
        .order('requirement_value');
    final list = <Achievement>[];
    for (final row in rows) {
      final m = Map<String, dynamic>.from(row);
      list.add(Achievement.fromMap(
        m,
        unlocked: unlocked.contains(m['id']?.toString()),
      ));
    }
    return list;
  }

  Future<List<JoyTransaction>> fetchTransactions({int limit = 10}) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return [];
    try {
      final rows = await _client
          .from('joy_coin_transactions')
          .select()
          .eq('user_id', uid)
          .order('created_at', ascending: false)
          .limit(limit);
      final list = <JoyTransaction>[];
      for (final row in rows) {
        list.add(JoyTransaction.fromMap(Map<String, dynamic>.from(row)));
      }
      return list;
    } catch (_) {
      return [];
    }
  }
  /// Ranking semanal — mesma view e limite da web (`WeeklyLeaderboard.tsx`).
  Future<List<LeaderboardEntry>> fetchWeeklyLeaderboard({int limit = 10}) async {
    try {
      final rows = await _client
          .from('weekly_leaderboard')
          .select()
          .limit(limit);
      return [
        for (final r in (rows as List))
          LeaderboardEntry.fromMap(Map<String, dynamic>.from(r)),
      ];
    } catch (_) {
      return const [];
    }
  }

  /// Top de pontos — mesma consulta de `useGamification.ts` da web.
  Future<List<PointsEntry>> fetchPointsLeaderboard({int limit = 20}) async {
    try {
      final rows = await _client
          .from('user_gamification')
          .select(
              'user_id, joy_coins, experience_points, current_level, streak_days, profiles!user_id(full_name, avatar_url)')
          .order('joy_coins', ascending: false)
          .limit(limit);
      return [
        for (final r in (rows as List))
          PointsEntry.fromMap(Map<String, dynamic>.from(r)),
      ];
    } catch (_) {
      return const [];
    }
  }

  /// Desafios activos com a janela vigente (mesmos filtros da web) + adesão.
  Future<List<Challenge>> fetchChallenges() async {
    final now = DateTime.now().toUtc().toIso8601String();
    List<Map<String, dynamic>> rows;
    try {
      final data = await _client
          .from('challenges')
          .select()
          .eq('is_active', true)
          .gte('ends_at', now)
          .lte('starts_at', now)
          .order('joy_coins_reward', ascending: false);
      rows = [
        for (final r in (data as List))
          Map<String, dynamic>.from(r as Map),
      ];
    } catch (_) {
      return const [];
    }
    if (rows.isEmpty) return const [];
    final mine = <String, Map<String, dynamic>>{};
    final uid = _client.auth.currentUser?.id;
    if (uid != null) {
      try {
        final uc = await _client
            .from('user_challenges')
            .select()
            .eq('user_id', uid);
        for (final r in (uc as List)) {
          final m = Map<String, dynamic>.from(r);
          mine[m['challenge_id']?.toString() ?? ''] = m;
        }
      } catch (_) {}
    }
    return [
      for (final c in rows)
        Challenge.fromMaps(c, mine[c['id']?.toString() ?? '']),
    ];
  }

  /// Aderir a um desafio — mesmo INSERT da web
  /// (`user_challenges {user_id, challenge_id}`).
  Future<void> joinChallenge(String challengeId) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return;
    await _client.from('user_challenges').insert({
      'user_id': uid,
      'challenge_id': challengeId,
    });
  }
}

final rewardsRepositoryProvider = Provider<RewardsRepository>(
    (ref) => RewardsRepository(Supabase.instance.client));
