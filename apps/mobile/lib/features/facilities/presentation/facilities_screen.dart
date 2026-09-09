import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/location/location_service.dart';
import '../../../core/utils/geo.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/facility_model.dart';
import '../data/facility_repository.dart';
import '../facilities_controller.dart';
import 'facility_image.dart';

/// Diretório de instituições de saúde — farmácias, clínicas, hospitais,
/// laboratórios e veterinárias com localização e chat. Sem produtos:
/// o utilizador pergunta e envia receitas pela conversa.
class FacilitiesScreen extends ConsumerStatefulWidget {
  const FacilitiesScreen({super.key});

  @override
  ConsumerState<FacilitiesScreen> createState() => _FacilitiesScreenState();
}

class _FacilitiesScreenState extends ConsumerState<FacilitiesScreen> {
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final facilities = ref.watch(facilitiesProvider);
    final onlyMyCity = ref.watch(onlyMyCityProvider);
    final sort = ref.watch(facilitySortProvider);
    final gpsMode = sort == FacilitySort.nearby;

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
            children: [
              Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Instituições',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: 'As minhas conversas',
                    onPressed: () => context.push('/chats'),
                    icon: const Icon(
                      Icons.chat_bubble_outline_rounded,
                      color: AppColors.accent,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                'Farmácias, clínicas, hospitais, laboratórios e veterinárias '
                'perto de ti — pergunta e envia a tua receita pelo chat.',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.55),
                  fontSize: 13.5,
                ),
              ),
              const SizedBox(height: 18),

              // ── Interruptor "só a minha cidade" (igual à web) ────────
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.glassFill,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.glassBorder),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.location_city_rounded,
                        size: 18, color: AppColors.accent),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        onlyMyCity
                            ? 'Só na minha cidade'
                            : 'Mostrar todas as cidades',
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w600,
                          fontSize: 13.5,
                        ),
                      ),
                    ),
                    Switch(
                      value: onlyMyCity,
                      activeColor: AppColors.accent,
                      onChanged: (v) {
                        ref.read(onlyMyCityProvider.notifier).state = v;
                        ref.invalidate(facilitiesProvider);
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // ── Pesquisa ────────────────────────────────────────────
              TextField(
                controller: _searchCtrl,
                onChanged: (v) {
                  ref.read(facilitySearchProvider.notifier).state = v.trim();
                  ref.invalidate(facilitiesProvider);
                },
                style: const TextStyle(color: AppColors.textPrimary),
                decoration: const InputDecoration(
                  hintText: 'Pesquisar instituição, bairro ou cidade…',
                  prefixIcon: Icon(Icons.search_rounded),
                ),
              ),
              const SizedBox(height: 14),

              // ── Chips de tipo ───────────────────────────────────────
              SizedBox(
                height: 38,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: FacilityFilter.values.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, i) {
                    final f = FacilityFilter.values[i];
                    return _FilterChip(
                      label: f.label,
                      selected: ref.watch(facilityFilterProvider) == f,
                      onTap: () {
                        HapticFeedback.selectionClick();
                        ref.read(facilityFilterProvider.notifier).state = f;
                        ref.invalidate(facilitiesProvider);
                      },
                    );
                  },
                ),
              ),
              const SizedBox(height: 10),

              // ── Ordenação ───────────────────────────────────────────
              SizedBox(
                height: 32,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    for (final s in const [
                      (FacilitySort.rating, 'Melhor avaliadas'),
                      (FacilitySort.nearby, 'Mais próximas'),
                      (FacilitySort.name, 'A → Z'),
                    ])
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: _SortChip(
                          label: s.$2,
                          selected: sort == s.$1,
                          onTap: () {
                            HapticFeedback.selectionClick();
                            ref.read(facilitySortProvider.notifier).state = s.$1;
                            ref.invalidate(facilitiesProvider);
                          },
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // ── Banner GPS exclusivo móvel (ordenar por proximidade real) ──
              if (gpsMode) ...[
                _GpsBanner(onRefresh: () {
                  HapticFeedback.lightImpact();
                  LocationService.instance
                      .getCurrentPosition(forceRefresh: true);
                  ref.invalidate(facilitiesProvider);
                }),
                const SizedBox(height: 12),
              ],

              // ── Lista ───────────────────────────────────────────────
              facilities.when(
                loading: () => const ListSkeleton(count: 4, itemHeight: 96),
                error: (e, _) => EmptyState(
                  icon: Icons.wifi_off_rounded,
                  title: 'Não foi possível carregar',
                  message: 'Verifica a ligação e tenta novamente.',
                  actionLabel: 'Recarregar',
                  onAction: () => ref.invalidate(facilitiesProvider),
                ),
                data: (list) {
                  if (list.isEmpty) {
                    return EmptyState(
                      icon: Icons.local_hospital_rounded,
                      title: 'Nenhuma instituição encontrada',
                      message: onlyMyCity
                          ? 'Não há resultados na tua cidade — mostra todas '
                              'as cidades ou ajusta a pesquisa.'
                          : 'Ajusta a pesquisa ou os filtros para ver mais.',
                    );
                  }
                  return Column(
                    children: [
                      for (final f in list)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _FacilityCard(
                            facility: f,
                            distance: ref
                                .read(facilityRepositoryProvider)
                                .distanceFor(f),
                          ),
                        ),
                    ],
                  )
                      .animate(delay: 45.ms)
                      .fadeIn(duration: 300.ms)
                      .slideY(begin: 0.07, curve: Curves.easeOutCubic);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Banner GPS ───────────────────────────────────────────────────────

/// Estados do GPS quando a ordenação é "Mais próximas":
///  - a obter posição → barra de progresso;
///  - permissão negada / GPS off → aviso com acção;
///  - posição OK → confirmação discreta com a precisão aproximada.
class _GpsBanner extends ConsumerWidget {
  const _GpsBanner({required this.onRefresh});

  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pos = ref.watch(devicePositionProvider);

    return pos.when(
      loading: () => _shell(
        const SizedBox(
          width: 16,
          height: 16,
          child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accent),
        ),
        'A obter a tua localização para ordenar por proximidade real…',
      ),
      error: (_, __) => _shell(
        const Icon(Icons.error_outline_rounded, size: 18, color: AppColors.warning),
        'Não foi possível usar o GPS — as distâncias ficam aproximadas.',
      ),
      data: (p) {
        if (p == null) {
          return _shell(
            const Icon(Icons.location_off_rounded, size: 18, color: AppColors.warning),
            'Localização indisponível — activa o GPS ou concede permissão '
                'nas definições para veres as distâncias reais.',
            actionLabel: 'Tentar novamente',
            onAction: onRefresh,
          );
        }
        final acc = p.accuracyM == null
            ? ''
            : ' · precisão ~${p.accuracyM!.round()} m';
        return _shell(
          const Icon(Icons.my_location_rounded, size: 17, color: Color(0xFF34D399)),
          'A ordenar pela tua posição GPS$acc',
        );
      },
    );
  }

  Widget _shell(
    Widget leading,
    String message, {
    String? actionLabel,
    VoidCallback? onAction,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        children: [
          leading,
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 12,
                height: 1.35,
              ),
            ),
          ),
          if (actionLabel != null && onAction != null)
            GestureDetector(
              onTap: onAction,
              child: Text(
                actionLabel,
                style: const TextStyle(
                  color: AppColors.accent,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ── Chips ───────────────────────────────────────────────────────────────

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : AppColors.glassFill,
          borderRadius: BorderRadius.circular(19),
          border: Border.all(
            color: selected ? AppColors.accent : AppColors.glassBorder,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : AppColors.textSecondary,
            fontWeight: FontWeight.w600,
            fontSize: 12.5,
          ),
        ),
      ),
    );
  }
}

class _SortChip extends StatelessWidget {
  const _SortChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected
              ? const Color(0x2E38BDF8)
              : Colors.white.withOpacity(0.04),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: selected
                ? const Color(0x5538BDF8)
                : Colors.white.withOpacity(0.08),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              selected ? Icons.check_rounded : Icons.sort_rounded,
              size: 13,
              color: selected ? AppColors.accent : AppColors.textMuted,
            ),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w600,
                color: selected ? AppColors.accent : AppColors.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Cartão de instituição ───────────────────────────────────────────────

class _FacilityCard extends StatelessWidget {
  const _FacilityCard({required this.facility, required this.distance});

  final HealthFacility facility;
  final double distance;

  @override
  Widget build(BuildContext context) {
    final hasDistance = distance != double.infinity;

    return GestureDetector(
      onTap: () => context.push('/facility-detail', extra: facility),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.glassFill,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            FacilityImage(facility: facility, size: 76),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          facility.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w700,
                            fontSize: 14.5,
                          ),
                        ),
                      ),
                      if (facility.isVerified)
                        const Icon(Icons.verified_rounded,
                            size: 15, color: AppColors.accent),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${facility.type.label}'
                    '${facility.city != null ? ' · ${facility.city}' : ''}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: facility.typeColor,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.star_rounded,
                          size: 14, color: AppColors.warning),
                      const SizedBox(width: 3),
                      Text(
                        facility.rating != null && facility.rating! > 0
                            ? facility.rating!.toStringAsFixed(1)
                            : 'Novo',
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (hasDistance) ...[
                        const SizedBox(width: 10),
                        Icon(Icons.near_me_rounded,
                            size: 13, color: AppColors.textMuted),
                        const SizedBox(width: 3),
                        Text(
                          formatDistanceKm(distance),
                          style: const TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 12,
                          ),
                        ),
                      ],
                      if (facility.emergency24h) ...[
                        const SizedBox(width: 10),
                        const Text(
                          '24h',
                          style: TextStyle(
                            color: AppColors.danger,
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 4),
            const Icon(Icons.chevron_right_rounded,
                color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}
