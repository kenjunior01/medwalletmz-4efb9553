import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Recompensas & Conquistas (paridade com `pages/Rewards.tsx` da web):
///   • `user_gamification` — nível actual, XP, dias de streak, pontos;
///   • `achievements`      — catálogo activo ordenado por requisito;
///   • `user_achievements` — conquistas já desbloqueadas pelo utilizador;
///   • `joy_coin_transactions` — histórico de pontos (últimos 10).
/// O progresso de nível usa a mesma regra da web: cada nível = 500 XP,
/// barra = (xp % 500) / 5 → percentagem. Zero alterações de backend.
class UserGamification {
  const UserGamification({
    required this.level,
    required this.experiencePoints,
    required this.joyCoins,
    required this.streakDays,
    required this.totalOrders,
    required this.totalReviews,
  });

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
      level: (m['current_level'] as num?)?.toInt() ?? 1,
      experiencePoints: (m['experience_points'] as num?)?.toInt() ?? 0,
      joyCoins: (m['joy_coins'] as num?)?.toInt() ?? 0,
      streakDays: (m['streak_days'] as num?)?.toInt() ?? 0,
      totalOrders: (m['total_orders'] as num?)?.toInt() ?? 0,
      totalReviews: (m['total_reviews'] as num?)?.toInt() ?? 0,
    );
  }

  static const UserGamification empty = UserGamification(
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
}

final rewardsRepositoryProvider = Provider<RewardsRepository>(
    (ref) => RewardsRepository(Supabase.instance.client));
