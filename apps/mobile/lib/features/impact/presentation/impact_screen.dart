import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/impact_repository.dart';

/// Impacto Público — dashboard transparente da plataforma (paridade com
/// `PublicImpactDashboard.tsx`): apenas números agregados, sem dados
/// pessoais. Refresca a cada 60 s como o web (`refetchInterval`).
class ImpactScreen extends ConsumerStatefulWidget {
  const ImpactScreen({super.key});

  @override
  ConsumerState<ImpactScreen> createState() => _ImpactScreenState();
}

class _ImpactScreenState extends ConsumerState<ImpactScreen> {
  PublicImpactStats _stats = PublicImpactStats.zero;
  bool _loading = true;
  Timer? _ticker;

  @override
  void initState() {
    super.initState();
    _load();
    _ticker = Timer.periodic(const Duration(seconds: 60), (_) => _load());
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    final repo = ref.read(impactRepositoryProvider);
    final stats = await repo.fetchStats();
    if (!mounted) return;
    setState(() {
      _stats = stats;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return AppBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          title: const Text('Impacto Público 🌍'),
        ),
        body: _loading
            ? ListView(
                padding: const EdgeInsets.all(16),
                children: const [
                  AppSkeleton(height: 130),
                  SizedBox(height: 12),
                  AppSkeleton(height: 90),
                  SizedBox(height: 12),
                  AppSkeleton(height: 90),
                  SizedBox(height: 12),
                  AppSkeleton(height: 160),
                ],
              )
            : RefreshIndicator(
                onRefresh: _load,
                color: AppColors.accent,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  children: [
                    _HeroCard(stats: _stats),
                    const SizedBox(height: 14),
                    _KpiCard(
                      icon: Icons.people_alt_rounded,
                      colors: const [Color(0xFF3B82F6), Color(0xFF1D4ED8)],
                      label: 'Utilizadores registados',
                      value: _stats.totalUsers,
                      hint: 'Em todas as províncias',
                    ),
                    const SizedBox(height: 10),
                    _KpiCard(
                      icon: Icons.trending_up_rounded,
                      colors: const [Color(0xFF10B981), Color(0xFF047857)],
                      label: 'Subscrições activas',
                      value: _stats.activeSubscriptions,
                      hint: 'Planos Plus/Premium MZ',
                    ),
                    const SizedBox(height: 10),
                    _KpiCard(
                      icon: Icons.health_and_safety_rounded,
                      colors: const [Color(0xFF8B5CF6), Color(0xFF6D28D9)],
                      label: 'Triagens realizadas',
                      value: _stats.totalTriages,
                      hint: 'Triagem de sinais vitais com IA',
                    ),
                    const SizedBox(height: 10),
                    _ProvincesCard(covered: _stats.provincesCovered),
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.glassFill,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.glassBorder),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Transparência',
                              style: TextStyle(
                                  color: AppColors.textPrimary,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 13.5)),
                          const SizedBox(height: 6),
                          const Text(
                            'Este painel mostra apenas números agregados e '
                            'anónimos — nunca dados clínicos ou pessoais. '
                            'Os valores refrescam a cada 60 segundos.',
                            style: TextStyle(
                                color: AppColors.textMuted,
                                fontSize: 12,
                                height: 1.5),
                          ),
                          if (_stats.lastUpdated != null) ...[
                            const SizedBox(height: 6),
                            Text(
                              'Última actualização: '
                              '${_stats.lastUpdated!.toLocal().toString().substring(0, 16)}',
                              style: const TextStyle(
                                  color: AppColors.textMuted, fontSize: 11),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({required this.stats});
  final PublicImpactStats stats;

  @override
  Widget build(BuildContext context) {
    final total =
        stats.totalUsers + stats.activeSubscriptions + stats.totalTriages;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0EA5E9), Color(0xFF0C4A6E)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('A nossa missão em números',
              style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text(
            'Cada interação na MedWallet MZ aproxima Moçambique de uma saúde '
            'mais acessível. Estes são os impactos acumulados até hoje.',
            style: TextStyle(
                color: Colors.white.withOpacity(0.8),
                fontSize: 12.5,
                height: 1.45),
          ),
          const SizedBox(height: 14),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: total.toDouble()),
                duration: const Duration(milliseconds: 900),
                curve: Curves.easeOutCubic,
                builder: (_, v, __) => Text(
                  v.round().toString(),
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 34,
                      fontWeight: FontWeight.w900),
                ),
              ),
              const SizedBox(width: 8),
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text('acções registadas',
                    style: TextStyle(
                        color: Colors.white.withOpacity(0.7), fontSize: 12)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  const _KpiCard({
    required this.icon,
    required this.colors,
    required this.label,
    required this.value,
    required this.hint,
  });

  final IconData icon;
  final List<Color> colors;
  final String label;
  final int value;
  final String hint;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: colors),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: Colors.white, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(
                        color: AppColors.textSecondary, fontSize: 12)),
                Text(hint,
                    style: const TextStyle(
                        color: AppColors.textMuted, fontSize: 10.5)),
              ],
            ),
          ),
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: value.toDouble()),
            duration: const Duration(milliseconds: 900),
            curve: Curves.easeOutCubic,
            builder: (_, v, __) => Text(
              v.round().toString(),
              style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 22,
                  fontWeight: FontWeight.w900),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProvincesCard extends StatelessWidget {
  const _ProvincesCard({required this.covered});
  final int covered;

  static const List<String> provinces = [
    'Maputo Cidade',
    'Maputo Província',
    'Gaza',
    'Inhambane',
    'Sofala',
    'Manica',
    'Tete',
    'Zambézia',
    'Nampula',
    'Cabo Delgado',
    'Niassa',
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0E7490), Color(0xFF164E63)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.map_rounded, color: Colors.white, size: 18),
              const SizedBox(width: 8),
              Text('Cobertura: $covered de 11 províncias',
                  style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 13.5)),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: provinces.map((p) {
              final active = covered > provinces.indexOf(p);
              return Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                decoration: BoxDecoration(
                  color: active
                      ? Colors.white.withOpacity(0.18)
                      : Colors.white.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: active
                        ? Colors.white.withOpacity(0.35)
                        : Colors.white.withOpacity(0.12),
                  ),
                ),
                child: Text(
                  active ? '✓ $p' : '◦ $p',
                  style: TextStyle(
                    color: active
                        ? Colors.white
                        : Colors.white.withOpacity(0.45),
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
