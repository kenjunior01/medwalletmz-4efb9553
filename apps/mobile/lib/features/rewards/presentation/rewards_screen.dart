import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/confetti_overlay.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/rewards_repository.dart';

/// Recompensas (paridade com `pages/Rewards.tsx` da web) — 4 abas:
///   • Desafios  — `challenges` + adesão em `user_challenges` (mesmo INSERT);
///   • Ranking   — view `weekly_leaderboard` + top de pontos
///                 (`user_gamification` ORDER BY joy_coins), com destaque
///                 para a posição do utilizador;
///   • Conquistas — grelha de `achievements` vs. `user_achievements`;
///   • Histórico  — últimos movimentos de `joy_coin_transactions`.
class RewardsScreen extends ConsumerStatefulWidget {
  const RewardsScreen({super.key});

  @override
  ConsumerState<RewardsScreen> createState() => _RewardsScreenState();
}

class _RewardsScreenState extends ConsumerState<RewardsScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab = TabController(length: 4, vsync: this);

  bool _loading = true;
  UserGamification _gamification = UserGamification.empty;
  List<Achievement> _achievements = [];
  List<JoyTransaction> _transactions = [];
  List<Challenge> _challenges = [];
  List<LeaderboardEntry> _weekly = [];
  List<PointsEntry> _points = [];
  final Set<String> _joining = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final repo = ref.read(rewardsRepositoryProvider);
    final results = await Future.wait([
      repo.fetchGamification(),
      repo.fetchAchievements(),
      repo.fetchTransactions(),
      repo.fetchChallenges(),
      repo.fetchWeeklyLeaderboard(),
      repo.fetchPointsLeaderboard(),
    ]);
    if (!mounted) return;
    setState(() {
      _gamification = results[0] as UserGamification;
      _achievements = results[1] as List<Achievement>;
      _transactions = results[2] as List<JoyTransaction>;
      _challenges = results[3] as List<Challenge>;
      _weekly = results[4] as List<LeaderboardEntry>;
      _points = results[5] as List<PointsEntry>;
      _loading = false;
    });
  }

  Future<void> _join(Challenge c) async {
    if (_joining.contains(c.id)) return;
    setState(() => _joining.add(c.id));
    try {
      await ref.read(rewardsRepositoryProvider).joinChallenge(c.id);
      if (!mounted) return;
      // F32 — celebração ao aceitar desafio.
      showConfetti(context, message: 'Desafio aceite! 🎯');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Desafio aceite! Boa sorte! 🎯'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      await _load();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Não foi possível aceitar o desafio agora.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) setState(() => _joining.remove(c.id));
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
          bottom: TabBar(
            controller: _tab,
            indicatorColor: AppColors.warning,
            labelColor: AppColors.textPrimary,
            unselectedLabelColor: AppColors.textMuted,
            labelStyle:
                const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs:        [
              Tab(text: 'Desafios'),
              Tab(text: 'Ranking'),
              Tab(text: 'Conquistas'),
              Tab(text: 'Histórico'),
            ],
          ),
        ),
        body: _loading
            ? ListView(
                padding: const EdgeInsets.all(16),
                children:        [
                  AppSkeleton(height: 150),
                  SizedBox(height: 12),
                  AppSkeleton(height: 180),
                  SizedBox(height: 12),
                  AppSkeleton(height: 120),
                ],
              )
            : TabBarView(
                controller: _tab,
                children: [
                  _buildChallengesTab(),
                  _buildRankingTab(),
                  _buildAchievementsTab(unlockedCount),
                  _buildHistoryTab(),
                ],
              ),
      ),
    );
  }

  // ── Desafios ─────────────────────────────────────────────────────────
  Widget _buildChallengesTab() {
    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.accent,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          _LevelCard(g: _gamification),
          const SizedBox(height: 16),
          if (_challenges.isEmpty)
            const _EmptyCard(
              icon: Icons.flag_rounded,
              text: 'Sem desafios activos nesta semana. '
                  'Volta em breve — cada desafio vale pontos Pulse!',
            )
          else
            for (final c in _challenges)
              _ChallengeCard(
                c: c,
                joining: _joining.contains(c.id),
                onJoin: () => _join(c),
              ),
        ],
      ),
    );
  }

  // ── Ranking ──────────────────────────────────────────────────────────
  Widget _buildRankingTab() {
    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.accent,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
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
                icon: Icons.military_tech_rounded,
                color: const Color(0xFF10B981),
                value: 'Nv ${_gamification.level}',
                label: 'o teu nível',
              ),
            ],
          ),
          const SizedBox(height: 18),
                 Text('Ranking semanal',
              style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.w800)),
          const SizedBox(height: 2),
          Text('Pedidos feitos esta semana pela comunidade',
              style: TextStyle(
                  color: AppColors.textMuted, fontSize: 11.5)),
          const SizedBox(height: 10),
          if (_weekly.isEmpty)
            const _EmptyCard(
              icon: Icons.emoji_events_outlined,
              text: 'Nenhum pedido esta semana ainda. '
                  'Sê o primeiro no ranking!',
            )
          else
            ..._weekly.asMap().entries.map((e) => _LeaderTile(
                  position: e.key + 1,
                  name: e.value.fullName,
                  avatarUrl: e.value.avatarUrl,
                  subtitle: 'Nível ${e.value.userLevel}',
                  value: '${e.value.weeklyOrders}',
                  valueLabel: 'pedidos',
                  isMe: _gamification.userId.isNotEmpty &&
                      e.value.userId == _gamification.userId,
                )),
          const SizedBox(height: 18),
                 Text('Top de pontos Pulse',
              style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.w800)),
          const SizedBox(height: 2),
                 Text('Quem acumula mais pontos por acções saudáveis',
              style: TextStyle(color: AppColors.textMuted, fontSize: 11.5)),
          const SizedBox(height: 10),
          if (_points.isEmpty)
            const _EmptyCard(
              icon: Icons.stars_outlined,
              text: 'O top de pontos aparece aqui conforme a comunidade '
                  'usa a app: triagens, consultas e check-ins dão pontos.',
            )
          else
            ..._points.asMap().entries.map((e) => _LeaderTile(
                  position: e.key + 1,
                  name: e.value.fullName,
                  avatarUrl: e.value.avatarUrl,
                  subtitle: 'Nv ${e.value.level} · ${e.value.streakDays} dias 🔥',
                  value: '${e.value.joyCoins}',
                  valueLabel: 'pontos',
                  isMe: _gamification.userId.isNotEmpty &&
                      e.value.userId == _gamification.userId,
                )),
        ],
      ),
    );
  }

  // ── Conquistas ───────────────────────────────────────────────────────
  Widget _buildAchievementsTab(int unlockedCount) {
    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.accent,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
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
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 1.45,
              ),
              itemCount: _achievements.length,
              itemBuilder: (_, i) => _AchievementCard(a: _achievements[i]),
            ),
        ],
      ),
    );
  }

  // ── Histórico ────────────────────────────────────────────────────────
  Widget _buildHistoryTab() {
    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.accent,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
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
    );
  }
}

class _ChallengeCard extends StatelessWidget {
   const _ChallengeCard({
    required this.c,
    required this.joining,
    required this.onJoin,
  });

  final Challenge c;
  final bool joining;
  final VoidCallback onJoin;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.isCompleted
            ? AppColors.success.withOpacity(0.08)
            : AppColors.glassFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: c.isCompleted
              ? AppColors.success.withOpacity(0.4)
              : AppColors.glassBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(c.icon, style: const TextStyle(fontSize: 24)),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  c.title,
                  style:        TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 14.5,
                  ),
                ),
              ),
              if (c.isCompleted)
                       Icon(Icons.check_circle_rounded,
                    color: AppColors.success, size: 20),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            c.description,
            style: TextStyle(
              color: Colors.white.withOpacity(0.6),
              fontSize: 12,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _chip(Icons.star_rounded, '+${c.coinsReward} pontos',
                  AppColors.warning),
              const SizedBox(width: 8),
              _chip(Icons.bolt_rounded, '+${c.xpReward} XP',
                  const Color(0xFF60A5FA)),
            ],
          ),
          const SizedBox(height: 12),
          if (c.joined) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(
                value: c.progressPercent / 100,
                minHeight: 8,
                backgroundColor: Colors.white.withOpacity(0.10),
                valueColor: AlwaysStoppedAnimation<Color>(
                    c.isCompleted ? AppColors.success : AppColors.accent),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              c.isCompleted
                  ? 'Concluído — recompensa a caminho!'
                  : '${c.currentValue}/${c.targetValue} · '
                      '${c.progressPercent.toStringAsFixed(0)}% do objectivo',
              style: TextStyle(
                color: c.isCompleted
                    ? AppColors.success
                    : AppColors.textSecondary,
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ] else
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: joining ? null : onJoin,
                icon: joining
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.flag_rounded, size: 18),
                label: Text(joining ? 'A aceitar…' : 'Aceitar desafio'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF7C3AED),
                  foregroundColor: Colors.white,
                  disabledBackgroundColor:
                      const Color(0xFF7C3AED).withOpacity(0.6),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
        ],
      ),
    ).animate(delay: 40.ms).fadeIn(duration: 280.ms);
  }

  Widget _chip(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 4),
          Text(label,
              style: TextStyle(
                  color: color, fontSize: 11, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}

class _LeaderTile extends StatelessWidget {
   const _LeaderTile({
    required this.position,
    required this.name,
    required this.avatarUrl,
    required this.subtitle,
    required this.value,
    required this.valueLabel,
    this.isMe = false,
  });

  final int position;
  final String? name;
  final String? avatarUrl;
  final String subtitle;
  final String value;
  final String valueLabel;
  final bool isMe;

  Color get _rankColor {
    switch (position) {
      case 1:
        return const Color(0xFFFBBF24); // ouro
      case 2:
        return const Color(0xFF9CA3AF); // prata
      case 3:
        return const Color(0xFFD97706); // bronze
      default:
        return AppColors.textMuted;
    }
  }

  String get _rankIcon {
    switch (position) {
      case 1:
        return '👑';
      case 2:
      case 3:
        return '🏅';
      default:
        return '$position';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isTop3 = position <= 3;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isMe
            ? AppColors.accent.withOpacity(0.10)
            : isTop3
                ? _rankColor.withOpacity(0.08)
                : AppColors.glassFill,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isMe
              ? AppColors.accent.withOpacity(0.6)
              : isTop3
                  ? _rankColor.withOpacity(0.35)
                  : AppColors.glassBorder,
          width: isMe ? 1.6 : 1,
        ),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 28,
            child: Text(
              _rankIcon,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: _rankColor,
                fontSize: position <= 3 ? 16 : 13,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Container(
            width: 36,
            height: 36,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.accent.withOpacity(0.15),
              shape: BoxShape.circle,
              image: (avatarUrl != null && avatarUrl!.isNotEmpty)
                  ? DecorationImage(
                      image: NetworkImage(avatarUrl!), fit: BoxFit.cover)
                  : null,
            ),
            child: (avatarUrl == null || avatarUrl!.isEmpty)
                ? Text(
                    (name ?? '?').isEmpty ? '?' : name![0].toUpperCase(),
                    style:        TextStyle(
                        color: AppColors.accent,
                        fontWeight: FontWeight.w800,
                        fontSize: 14),
                  )
                : null,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  (name == null || name!.isEmpty)
                      ? 'Anónimo'
                      : (isMe ? '$name (tu)' : name!),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                      color: isMe
                          ? AppColors.accent
                          : AppColors.textPrimary,
                      fontWeight: FontWeight.w700,
                      fontSize: 13),
                ),
                Text(subtitle,
                    style:        TextStyle(
                        color: AppColors.textMuted, fontSize: 11)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(value,
                  style: TextStyle(
                      color: isTop3 ? _rankColor : AppColors.textPrimary,
                      fontWeight: FontWeight.w800,
                      fontSize: 14)),
              Text(valueLabel,
                  style:        TextStyle(
                      color: AppColors.textMuted, fontSize: 10)),
            ],
          ),
        ],
      ),
    ).animate(delay: 30.ms).fadeIn(duration: 260.ms);
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
        gradient:        LinearGradient(
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
                style:        TextStyle(
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
                  child:        Text('DESBLOQUEADA',
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
                    style:        TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w700,
                        fontSize: 12.5)),
                Text(t.typeLabel,
                    style:        TextStyle(
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
                    style:        TextStyle(
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
              style:        TextStyle(
                  color: AppColors.textMuted, height: 1.5, fontSize: 12.5)),
        ],
      ),
    );
  }
}
