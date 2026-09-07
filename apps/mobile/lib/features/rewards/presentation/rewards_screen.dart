import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/rewards_repository.dart';

/// Recompensas & Conquistas (paridade com `pages/Rewards.tsx` da web):
/// cartão de nível com barra de XP, streak 🔥, pontos, grelha de conquistas
/// (desbloqueadas vs. bloqueadas) e histórico de pontos.
class RewardsScreen extends ConsumerStatefulWidget {
  const RewardsScreen({super.key});

  @override
  ConsumerState<RewardsScreen> createState() => _RewardsScreenState();
}

class _RewardsScreenState extends ConsumerState<RewardsScreen> {
  bool _loading = true;
  UserGamification _gamification = UserGamification.empty;
  List<Achievement> _achievements = [];
  List<JoyTransaction> _transactions = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final repo = ref.read(rewardsRepositoryProvider);
    try {
      final gamification = await repo.fetchGamification();
      final achievements = await repo.fetchAchievements();
      final transactions = await repo.fetchTransactions();
      if (!mounted) return;
      setState(() {
        _gamification = gamification;
        _achievements = achievements;
        _transactions = transactions;
      });
    } catch (_) {
      // silencioso — o cartão mostra estado vazio
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final unlockedCount = _achievements.where((a) => a.unlocked).length;
    return AppBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          title: const Text('Recompensas 🏆'),
          actions: [
            IconButton(
              onPressed: _load,
              icon: const Icon(Icons.refresh_rounded),
              tooltip: 'Actualizar',
            ),
          ],
        ),
        body: _loading
            ? ListView(
                padding: const EdgeInsets.all(16),
                children: const [
                  AppSkeleton(height: 150),
                  SizedBox(height: 12),
                  AppSkeleton(height: 180),
                  SizedBox(height: 12),
                  AppSkeleton(height: 120),
                ],
              )
            : RefreshIndicator(
                onRefresh: _load,
                color: AppColors.accent,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  children: [
                    _LevelCard(g: _gamification),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        _MiniStat(
                          icon: Icons.local_fire_department_rounded,
                          color: const Color(0xFFF97316),
                          value: '${_gamification.streakDays}',
                          label: 'dias seguidos',
                        ),
                        const SizedBox(width: 10),
                        _MiniStat(
                          icon: Icons.star_rounded,
                          color: AppColors.warning,
                          value: '${_gamification.joyCoins}',
                          label: 'pontos Pulse',
                        ),
                        const SizedBox(width: 10),
                        _MiniStat(
                          icon: Icons.emoji_events_rounded,
                          color: const Color(0xFF10B981),
                          value: '$unlockedCount/${_achievements.length}',
                          label: 'conquistas',
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    Text('Conquistas',
                        style: TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 16,
                            fontWeight: FontWeight.w800)),
                    const SizedBox(height: 10),
                    if (_achievements.isEmpty)
                      _EmptyCard(
                        icon: Icons.emoji_events_outlined,
                        text:
                            'As conquistas aparecem aqui conforme usas a app: '
                            'triagens, consultas, doações e check-ins dão XP.',
                      )
                    else
                      GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          mainAxisSpacing: 10,
                          crossAxisSpacing: 10,
                          childAspectRatio: 1.45,
                        ),
                        itemCount: _achievements.length,
                        itemBuilder: (_, i) =>
                            _AchievementCard(a: _achievements[i]),
                      ),
                    const SizedBox(height: 18),
                    Text('Histórico de pontos',
                        style: TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 16,
                            fontWeight: FontWeight.w800)),
                    const SizedBox(height: 10),
                    if (_transactions.isEmpty)
                      const _EmptyCard(
                        icon: Icons.receipt_long_rounded,
                        text: 'Sem movimentos de pontos ainda. '
                            'Cada acção saudável vale pontos!',
                      )
                    else
                      ..._transactions.map(_TransactionTile.new),
                  ],
                ),
              ),
      ),
    );
  }
}

class _LevelCard extends StatelessWidget {
  const _LevelCard({required this.g});
  final UserGamification g;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF7C3AED), Color(0xFF4C1D95)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF7C3AED).withOpacity(0.3),
            blurRadius: 28,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 46,
                height: 46,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text('Nv ${g.level}',
                    style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 13)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Nível de Saúde',
                        style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                            fontSize: 15)),
                    const SizedBox(height: 2),
                    Text(
                      '${g.experiencePoints} XP no total · '
                      '${500 - g.xpIntoLevel} XP para o nível ${g.level + 1}',
                      style: TextStyle(
                          color: Colors.white.withOpacity(0.75), fontSize: 11.5),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: g.levelProgress / 100,
              minHeight: 10,
              backgroundColor: Colors.white.withOpacity(0.15),
              valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFA78BFA)),
            ),
          ),
          const SizedBox(height: 6),
          Text('${g.levelProgress.toStringAsFixed(0)}% do nível actual',
              style: TextStyle(
                  color: Colors.white.withOpacity(0.65), fontSize: 11)),
        ],
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({
    required this.icon,
    required this.color,
    required this.value,
    required this.label,
  });

  final IconData icon;
  final Color color;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: AppColors.glassFill,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 4),
            Text(value,
                style: TextStyle(
                    color: color, fontWeight: FontWeight.w800, fontSize: 15)),
            Text(label,
                style: const TextStyle(
                    color: AppColors.textMuted, fontSize: 10.5),
                textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

class _AchievementCard extends StatelessWidget {
  const _AchievementCard({required this.a});
  final Achievement a;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: a.unlocked
            ? AppColors.glassFillStrong
            : AppColors.glassFill,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: a.unlocked
              ? AppColors.warning.withOpacity(0.5)
              : AppColors.glassBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(a.icon,
                  style: TextStyle(
                      fontSize: 22,
                      color: a.unlocked ? null : AppColors.textMuted)),
              const Spacer(),
              if (a.unlocked)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withOpacity(0.18),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text('DESBLOQUEADA',
                      style: TextStyle(
                          color: AppColors.warning,
                          fontSize: 8.5,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.4)),
                ),
            ],
          ),
          const Spacer(),
          Text(
            a.name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: a.unlocked ? AppColors.textPrimary : AppColors.textSecondary,
              fontWeight: FontWeight.w800,
              fontSize: 12.5,
            ),
          ),
          const SizedBox(height: 3),
          Expanded(
            child: Text(
              a.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                  color: a.unlocked
                      ? AppColors.textSecondary
                      : AppColors.textMuted,
                  fontSize: 10.5,
                  height: 1.3),
            ),
          ),
          const SizedBox(height: 4),
          Text('+' + '${a.coinsReward} pontos · ${a.categoryEmoji}',
              style: TextStyle(
                  color:
                      a.unlocked ? AppColors.warning : AppColors.textMuted,
                  fontSize: 10,
                  fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

class _TransactionTile extends StatelessWidget {
  const _TransactionTile(this.t);
  final JoyTransaction t;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: (t.isPositive ? AppColors.success : AppColors.danger)
                  .withOpacity(0.14),
              shape: BoxShape.circle,
            ),
            child: Icon(
              t.isPositive
                  ? Icons.arrow_downward_rounded
                  : Icons.arrow_upward_rounded,
              size: 16,
              color: t.isPositive ? AppColors.success : AppColors.danger,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(t.description?.isNotEmpty == true
                    ? t.description!
                    : t.typeLabel,
                    style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w700,
                        fontSize: 12.5)),
                Text(t.typeLabel,
                    style: const TextStyle(
                        color: AppColors.textMuted, fontSize: 11)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${t.isPositive ? '+' : ''}${t.amount}',
                style: TextStyle(
                  color: t.isPositive ? AppColors.success : AppColors.danger,
                  fontWeight: FontWeight.w800,
                  fontSize: 13.5,
                ),
              ),
              if (t.createdAt != null)
                Text(formatDateTime(t.createdAt!),
                    style: const TextStyle(
                        color: AppColors.textMuted, fontSize: 10)),
            ],
          ),
        ],
      ),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  const _EmptyCard({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        children: [
          Icon(icon, size: 34, color: AppColors.textMuted),
          const SizedBox(height: 8),
          Text(text,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  color: AppColors.textMuted, height: 1.5, fontSize: 12.5)),
        ],
      ),
    );
  }
}
