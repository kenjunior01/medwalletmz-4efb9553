import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/ranking_repository.dart';

/// Ranking de confiança — paridade com `pages/Ranking.tsx`:
/// quem são os médicos e instituições melhor avaliados da comunidade.
class RankingScreen extends ConsumerStatefulWidget {
  const RankingScreen({super.key});

  @override
  ConsumerState<RankingScreen> createState() => _RankingScreenState();
}

class _RankingScreenState extends ConsumerState<RankingScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab = TabController(length: 4, vsync: this)
    ..addListener(_onTab);
  RankingTab _current = RankingTab.doctors;

  bool _loading = true;
  List<RankedDoctor> _doctors = const [];
  List<RankedFacility> _facilities = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _tab.removeListener(_onTab);
    _tab.dispose();
    super.dispose();
  }

  void _onTab() {
    if (_tab.indexIsChanging) return;
    final t = RankingTab.values[_tab.index];
    if (t == _current) return;
    setState(() => _current = t);
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final repo = ref.read(rankingRepositoryProvider);
    if (_current == RankingTab.doctors) {
      _doctors = await repo.fetchTopDoctors();
      _facilities = const [];
    } else {
      _doctors = const [];
      _facilities = await repo.fetchTopFacilities(_current);
    }
    if (!mounted) return;
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                child: Row(
                  children: [
                    _IconBtn(
                        icon: Icons.arrow_back_rounded,
                        onTap: () => context.pop()),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'Ranking',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 21,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    const Icon(Icons.emoji_events_rounded,
                        color: AppColors.warning, size: 22),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: TabBar(
                  controller: _tab,
                  isScrollable: true,
                  tabAlignment: TabAlignment.start,
                  indicatorColor: AppColors.warning,
                  labelColor: AppColors.textPrimary,
                  unselectedLabelColor: AppColors.textMuted,
                  labelStyle: const TextStyle(
                      fontWeight: FontWeight.w800, fontSize: 13),
                  tabs: const [
                    Tab(text: 'Médicos'),
                    Tab(text: 'Farmácias'),
                    Tab(text: 'Clínicas'),
                    Tab(text: 'Hospitais'),
                  ],
                ),
              ),
              const SizedBox(height: 4),
              Expanded(
                child: _loading
                    ? ListView(
                        padding: const EdgeInsets.all(20),
                        children: const [
                          AppSkeleton(height: 72),
                          SizedBox(height: 10),
                          AppSkeleton(height: 72),
                          SizedBox(height: 10),
                          AppSkeleton(height: 72),
                          SizedBox(height: 10),
                          AppSkeleton(height: 72),
                        ],
                      )
                    : RefreshIndicator(
                        color: AppColors.accent,
                        onRefresh: _load,
                        child: _current == RankingTab.doctors
                            ? _doctorsList()
                            : _facilitiesList(),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _doctorsList() {
    if (_doctors.isEmpty) {
      return ListView(
        children: const [
          EmptyState(
            icon: Icons.emoji_events_rounded,
            title: 'Sem avaliações ainda',
            message:
                'O ranking aparece quando os pacientes começarem a avaliar os médicos.',
          ),
        ],
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 40),
      itemCount: _doctors.length,
      itemBuilder: (_, i) {
        final d = _doctors[i];
        return _RankTile(
          position: i + 1,
          title: d.name,
          subtitle: d.specialty ?? 'Médico',
          rating: d.rating,
          reviews: d.reviews,
        ).animate().fadeIn(
            duration: 200.ms, delay: Duration(milliseconds: i * 12));
      },
    );
  }

  Widget _facilitiesList() {
    if (_facilities.isEmpty) {
      return ListView(
        children: const [
          EmptyState(
            icon: Icons.storefront_rounded,
            title: 'Sem avaliações ainda',
            message:
                'As instituições melhor avaliadas aparecem quando houver avaliações.',
          ),
        ],
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 40),
      itemCount: _facilities.length,
      itemBuilder: (_, i) {
        final f = _facilities[i];
        return _RankTile(
          position: i + 1,
          title: f.name,
          subtitle: [f.city, f.address].whereType<String>().join(' · '),
          rating: f.rating,
          reviews: f.reviews,
          isFacility: true,
        ).animate().fadeIn(
            duration: 200.ms, delay: Duration(milliseconds: i * 12));
      },
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Widgets
// ═══════════════════════════════════════════════════════════════════════════

class _IconBtn extends StatelessWidget {
  const _IconBtn({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.glassFill,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.glassBorder),
          ),
          child: Icon(icon, color: AppColors.textPrimary, size: 20),
        ),
      ),
    );
  }
}

class _RankTile extends StatelessWidget {
  const _RankTile({
    required this.position,
    required this.title,
    required this.subtitle,
    required this.rating,
    required this.reviews,
    this.isFacility = false,
  });

  final int position;
  final String title;
  final String subtitle;
  final double rating;
  final int reviews;
  final bool isFacility;

  Color get _positionColor {
    switch (position) {
      case 1:
        return const Color(0xFFFFD700); // ouro
      case 2:
        return const Color(0xFFC0C0C0); // prata
      case 3:
        return const Color(0xFFCD7F32); // bronze
      default:
        return AppColors.textMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: position <= 3
              ? _positionColor.withOpacity(0.4)
              : AppColors.glassBorder,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: position <= 3
                  ? _positionColor.withOpacity(0.15)
                  : Colors.transparent,
              shape: BoxShape.circle,
            ),
            child: Text(
              '$position',
              style: TextStyle(
                color: _positionColor,
                fontWeight: FontWeight.w900,
                fontSize: 14,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 13.5,
                  ),
                ),
                if (subtitle.isNotEmpty)
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        color: AppColors.textMuted, fontSize: 11.5),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    isFacility
                        ? Icons.storefront_rounded
                        : Icons.star_rounded,
                    size: 15,
                    color: AppColors.warning,
                  ),
                  const SizedBox(width: 3),
                  Text(
                    rating.toStringAsFixed(rating == rating.roundToDouble() ? 0 : 1),
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w900,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 2),
              Text(
                '$reviews avaliações',
                style: const TextStyle(
                    color: AppColors.textMuted, fontSize: 10.5),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
