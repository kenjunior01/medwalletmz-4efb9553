import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// F42 — Poupança de Saúde com metas (paridade com a web).
///
/// REA (M-TIBA/CarePay — poupança de saúde em carteira): o utilizador
/// cria metas (parto, cirurgia, medicação…) e deposita da carteira.
/// O depósito é feito por RPC SECURITY DEFINER que debita a carteira,
/// registra a transação e credita XP — o cliente nunca envia user_id
/// nem saldos (anti-manipulação, padrão F39/F41).
enum GoalStatus { active, completed, cancelled }

class SavingsGoal {
  const SavingsGoal({
    required this.id,
    required this.name,
    required this.category,
    required this.targetAmount,
    required this.savedAmount,
    required this.status,
  });

  final String id;
  final String name;
  final String category;
  final double targetAmount;
  final double savedAmount;
  final GoalStatus status;

  double get progress => targetAmount <= 0 ? 0 : (savedAmount / targetAmount).clamp(0.0, 1.0);

  factory SavingsGoal.fromMap(Map<String, dynamic> m) {
    return SavingsGoal(
      id: m['id'] as String,
      name: (m['name'] as String?) ?? '',
      category: (m['category'] as String?) ?? 'outro',
      targetAmount: (m['target_amount'] as num?)?.toDouble() ?? 0,
      savedAmount: (m['saved_amount'] as num?)?.toDouble() ?? 0,
      status: switch (m['status'] as String?) {
        'completed' => GoalStatus.completed,
        'cancelled' => GoalStatus.cancelled,
        _ => GoalStatus.active,
      },
    );
  }
}

class SavingsDepositResult {
  const SavingsDepositResult({
    required this.savedAmount,
    required this.targetAmount,
    required this.completed,
    required this.bonusXp,
  });

  final double savedAmount;
  final double targetAmount;
  final bool completed;
  final int bonusXp;

  factory SavingsDepositResult.fromMap(Map<String, dynamic> m) {
    return SavingsDepositResult(
      savedAmount: (m['saved_amount'] as num?)?.toDouble() ?? 0,
      targetAmount: (m['target_amount'] as num?)?.toDouble() ?? 0,
      completed: m['completed'] == true,
      bonusXp: (m['bonus_xp'] as num?)?.toInt() ?? 0,
    );
  }
}

class SavingsRepository {
  SavingsRepository(this._client);

  final SupabaseClient _client;

  /// Metas do utilizador (RLS: só as próprias). Offline → vazio.
  Future<List<SavingsGoal>> fetchGoals() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return const [];
    try {
      final rows = await _client
          .from('savings_goals')
          .select()
          .order('status', ascending: true)
          .order('created_at', ascending: false)
          .limit(40);
      return (rows as List<dynamic>)
          .map((r) => SavingsGoal.fromMap(r as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return const [];
    }
  }

  /// Cria uma meta (INSERT direto com RLS — não toca na carteira).
  Future<SavingsGoal?> createGoal({
    required String name,
    required double targetAmount,
    String category = 'outro',
  }) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return null;
    try {
      final row = await _client
          .from('savings_goals')
          .insert({
            'user_id': uid,
            'name': name.trim(),
            'category': category,
            'target_amount': targetAmount,
          })
          .select()
          .single();
      return SavingsGoal.fromMap(row as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  /// Deposita na meta: servidor debita a carteira, registra e dá XP.
  Future<SavingsDepositResult?> deposit(String goalId, double amount) async {
    try {
      final data = await _client.rpc(
        'deposit_savings',
        params: {'p_goal_id': goalId, 'p_amount': amount},
      );
      if (data is Map<String, dynamic>) {
        return SavingsDepositResult.fromMap(data);
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}

final savingsRepositoryProvider = Provider<SavingsRepository>(
  (ref) => SavingsRepository(Supabase.instance.client),
);
