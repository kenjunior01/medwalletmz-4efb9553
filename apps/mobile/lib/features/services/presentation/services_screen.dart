import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../../bookings/presentation/booking_sheet.dart';
import '../domain/service_models.dart';
import 'services_controller.dart';

/// Serviços: pesquisa, chips de especialidade e cartões de médicos.
class ServicesScreen extends ConsumerStatefulWidget {
  const ServicesScreen({super.key});

  @override
  ConsumerState<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends ConsumerState<ServicesScreen> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final specialties = ref.watch(specialtiesProvider);
    final doctors = ref.watch(doctorsProvider);

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
            children: [
              const Text(
                'Serviços de saúde',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Encontra o cuidado certo, perto de ti',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.55),
                  fontSize: 13.5,
                ),
              ),
              const SizedBox(height: 18),
              _searchField(),
              const SizedBox(height: 14),
              _LabsBanner(),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(
                  child: _MiniServiceBanner(
                    icon: Icons.menu_book_rounded,
                    title: 'Educação',
                    subtitle: 'Artigos de saúde',
                    colors: const [Color(0xFF0EA5E9), Color(0xFF0C4A6E)],
                    onTap: () => context.push('/health-hub'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _MiniServiceBanner(
                    icon: Icons.verified_user_rounded,
                    title: 'Verificar receita',
                    subtitle: 'Valida o código',
                    colors: const [Color(0xFF22C55E), Color(0xFF14532D)],
                    onTap: () => context.push('/verify-prescription'),
                  ),
                ),
              ]),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(
                  child: _MiniServiceBanner(
                    icon: Icons.bloodtype_rounded,
                    title: 'Banco de sangue',
                    subtitle: 'Doar ou pedir',
                    colors: const [Color(0xFFEF4444), Color(0xFF7F1D1D)],
                    onTap: () => context.push('/blood'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _MiniServiceBanner(
                    icon: Icons.volunteer_activism_rounded,
                    title: 'Solidariedade',
                    subtitle: 'Apoio médico',
                    colors: const [Color(0xFF14B8A6), Color(0xFF134E4A)],
                    onTap: () => context.push('/solidarity'),
                  ),
                ),
              ]),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(
                  child: _MiniServiceBanner(
                    icon: Icons.auto_stories_rounded,
                    title: 'Diário',
                    subtitle: 'Bem-estar diário',
                    colors: const [Color(0xFF8B5CF6), Color(0xFF4C1D95)],
                    onTap: () => context.push('/journal'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _MiniServiceBanner(
                    icon: Icons.family_restroom_rounded,
                    title: 'Família',
                    subtitle: 'Cuidar à distância',
                    colors: const [Color(0xFF3B82F6), Color(0xFF1E3A8A)],
                    onTap: () => context.push('/family'),
                  ),
                ),
              ]),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(
                  child: _MiniServiceBanner(
                    icon: Icons.workspace_premium_rounded,
                    title: 'Planos',
                    subtitle: 'Subscrição M-Pesa',
                    colors: const [Color(0xFFF59E0B), Color(0xFF78350F)],
                    onTap: () => context.push('/plans'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _MiniServiceBanner(
                    icon: Icons.emoji_events_rounded,
                    title: 'Ranking',
                    subtitle: 'Melhor avaliados',
                    colors: const [Color(0xFFEC4899), Color(0xFF831843)],
                    onTap: () => context.push('/ranking'),
                  ),
                ),
              ]),
              // F11 — IA & Programas.
              const SizedBox(height: 10),
              Row(children: [
                Expanded(
                  child: _MiniServiceBanner(
                    icon: Icons.document_scanner_rounded,
                    title: 'Scanner',
                    subtitle: 'Lê receitas e exames',
                    colors: const [Color(0xFF6366F1), Color(0xFF312E81)],
                    onTap: () => context.push('/vision-scan'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _MiniServiceBanner(
                    icon: Icons.mic_rounded,
                    title: 'Voz',
                    subtitle: 'Diário falado com IA',
                    colors: const [Color(0xFF06B6D4), Color(0xFF164E63)],
                    onTap: () => context.push('/voice-journal'),
                  ),
                ),
              ]),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(
                  child: _MiniServiceBanner(
                    icon: Icons.pregnant_woman_rounded,
                    title: 'Maternal',
                    subtitle: 'Acompanha a gravidez',
                    colors: const [Color(0xFFA855F7), Color(0xFF581C87)],
                    onTap: () => context.push('/maternal'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _MiniServiceBanner(
                    icon: Icons.medical_services_rounded,
                    title: 'Agentes de saúde',
                    subtitle: 'Enfermeiros, APEs…',
                    colors: const [Color(0xFF10B981), Color(0xFF064E3B)],
                    onTap: () => context.push('/health-workers'),
                  ),
                ),
              ]),
              // F13 — Rede Nacional & Monetização.
              const SizedBox(height: 10),
              Row(children: [
                Expanded(
                  child: _MiniServiceBanner(
                    icon: Icons.directions_bike_rounded,
                    title: 'Riders',
                    subtitle: 'Entrega e ganha',
                    colors: const [Color(0xFF059669), Color(0xFF064E3B)],
                    onTap: () => context.push('/riders'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _MiniServiceBanner(
                    icon: Icons.storefront_rounded,
                    title: 'Classificados',
                    subtitle: 'Compra e vende',
                    colors: const [Color(0xFF7C3AED), Color(0xFF4C1D95)],
                    onTap: () => context.push('/ads'),
                  ),
                ),
              ]),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(
                  child: _MiniServiceBanner(
                    icon: Icons.emoji_events_rounded,
                    title: 'Recompensas',
                    subtitle: 'Níveis e conquistas',
                    colors: const [Color(0xFFF59E0B), Color(0xFF78350F)],
                    onTap: () => context.push('/rewards'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _MiniServiceBanner(
                    icon: Icons.public_rounded,
                    title: 'Impacto',
                    subtitle: 'Números da rede',
                    colors: const [Color(0xFF0EA5E9), Color(0xFF0C4A6E)],
                    onTap: () => context.push('/impact'),
                  ),
                ),
              ]),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(
                  child: _MiniServiceBanner(
                    icon: Icons.pets_rounded,
                    title: 'Veterinária',
                    subtitle: 'Cuidado animal',
                    colors: const [Color(0xFF16A34A), Color(0xFF14532D)],
                    onTap: () => context.push('/veterinary'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _MiniServiceBanner(
                    icon: Icons.groups_rounded,
                    title: 'Rede APE',
                    subtitle: 'Agentes comunitários',
                    colors: const [Color(0xFFEA580C), Color(0xFF92400E)],
                    onTap: () => context.push('/ape-network'),
                  ),
                ),
              ]),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(
                  child: _MiniServiceBanner(
                    icon: Icons.savings_rounded,
                    title: 'Monetização',
                    subtitle: 'Convite & ganhos',
                    colors: const [Color(0xFF1D4ED8), Color(0xFF172554)],
                    onTap: () => context.push('/monetization'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _MiniServiceBanner(
                    icon: Icons.local_shipping_rounded,
                    title: 'Entregas',
                    subtitle: 'Pedir & tracking ao vivo',
                    colors: const [Color(0xFFEA580C), Color(0xFF7C2D12)],
                    onTap: () => context.push('/deliveries'),
                  ),
                ),
              ]),
              const SizedBox(height: 6),
              specialties.maybeWhen(
                data: (list) => list.isEmpty
                    ? const SizedBox.shrink()
                    : _specialtyChips(list),
                orElse: () => const SizedBox(
                    height: 38, child: Center(child: AppSkeleton(width: 240))),
              ),
              const SizedBox(height: 20),
              const Text(
                'Médicos disponíveis',
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.6,
                ),
              ),
              const SizedBox(height: 12),
              doctors.when(
                loading: () => const ListSkeleton(count: 4, itemHeight: 96),
                error: (e, _) => EmptyState(
                  icon: Icons.wifi_off_rounded,
                  title: 'Não foi possível carregar',
                  message: 'Verifica a ligação e tenta novamente.',
                  actionLabel: 'Recarregar',
                  onAction: () => ref.invalidate(doctorsProvider),
                ),
                data: (list) {
                  final filtered = _query.isEmpty
                      ? list
                      : list.where((d) {
                          final q = _query.toLowerCase();
                          return (d.specialtyName ?? '').toLowerCase().contains(q) ||
                              (d.bio ?? '').toLowerCase().contains(q);
                        }).toList();
                  if (filtered.isEmpty) {
                    return const EmptyState(
                      icon: Icons.person_search_rounded,
                      title: 'Nenhum médico encontrado',
                      message:
                          'Ajusta a pesquisa ou remove o filtro de especialidade.',
                    );
                  }
                  return Column(
                    children: [
                      for (final d in filtered) _DoctorCard(doctor: d),
                    ],
                  )
                      .animate(delay: 55.ms)
                      .fadeIn(duration: 320.ms)
                      .slideY(begin: 0.08, curve: Curves.easeOutCubic);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _searchField() => TextField(
        onChanged: (v) => setState(() => _query = v.trim()),
        style: const TextStyle(color: AppColors.textPrimary),
        decoration: const InputDecoration(
          hintText: 'Pesquisar especialidade ou médico…',
          prefixIcon: Icon(Icons.search_rounded),
        ),
      );

  Widget _specialtyChips(List<Specialty> list) {
    final selected = ref.watch(selectedSpecialtyProvider);
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: list.length,
        separatorBuilder: (_, __) => const SizedBox(width: 9),
        itemBuilder: (context, i) {
          final s = list[i];
          final active = selected == s.id;
          return GestureDetector(
            onTap: () {
              ref.read(selectedSpecialtyProvider.notifier).state =
                  active ? null : s.id;
              ref.invalidate(doctorsProvider);
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding: const EdgeInsets.symmetric(horizontal: 15),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                gradient: active
                    ? const LinearGradient(colors: AppColors.buttonGradient)
                    : null,
                color: active ? null : AppColors.glassFill,
                borderRadius: BorderRadius.circular(13),
                border: Border.all(
                  color:
                      active ? Colors.white24 : AppColors.glassBorder,
                ),
              ),
              child: Row(
                children: [
                  Text(s.icon ?? '🩺', style: const TextStyle(fontSize: 14)),
                  const SizedBox(width: 7),
                  Text(
                    s.name,
                    style: TextStyle(
                      color: active
                          ? Colors.white
                          : AppColors.textSecondary,
                      fontWeight: FontWeight.w700,
                      fontSize: 12.5,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Banner de entrada dos laboratórios — F6.
class _LabsBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: () => context.push('/labs'),
      child: Container(
        padding: const EdgeInsets.all(15),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF7C3AED), Color(0xFF4C1D95)],
          ),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF7C3AED).withOpacity(0.35),
              blurRadius: 22,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.16),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Icon(Icons.biotech_rounded,
                  color: Colors.white, size: 24),
            ),
            const SizedBox(width: 13),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Laboratórios e análises',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 14.5,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'Exames com colheita ao domicílio · paga da carteira',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 11.5,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_rounded,
                color: Colors.white70, size: 20),
          ],
        ),
      ),
    );
  }
}

class _DoctorCard extends StatelessWidget {
  const _DoctorCard({required this.doctor});

  final Doctor doctor;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        children: [
          // Avatar
          Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const LinearGradient(
                  colors: AppColors.heroCardGradient),
              border: Border.all(color: Colors.white.withOpacity(0.2)),
            ),
            child: Center(
              child: Text(
                (doctor.specialtyIcon ?? '🩺'),
                style: const TextStyle(fontSize: 26),
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        doctor.specialtyName ?? 'Consulta geral',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 15.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    if (doctor.isVerified) ...[
                      const SizedBox(width: 6),
                      const Icon(Icons.verified_rounded,
                          color: AppColors.accent, size: 16),
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                if (doctor.bio != null && doctor.bio!.isNotEmpty)
                  Text(
                    doctor.bio!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        color: AppColors.textMuted, fontSize: 12.5),
                  ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(Icons.star_rounded,
                        color: AppColors.warning, size: 15),
                    const SizedBox(width: 3),
                    Text(
                      doctor.rating.toStringAsFixed(1),
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      '${doctor.yearsExperience} anos exp.',
                      style: const TextStyle(
                          color: AppColors.textMuted, fontSize: 12),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                formatMZN(doctor.consultationFee),
                style: const TextStyle(
                  color: AppColors.accent,
                  fontSize: 14.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              GestureDetector(
                onTap: () => _book(context),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                        colors: AppColors.buttonGradient),
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withOpacity(0.4),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: const Text(
                    'Agendar',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _book(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => BookingSheet(doctor: doctor),
    );
  }
}

/// Banner mini de serviços (2 por linha) — educação em saúde e
/// verificação de receitas.
class _MiniServiceBanner extends StatelessWidget {
  const _MiniServiceBanner({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.colors,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final List<Color> colors;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: colors,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.16),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 12.5,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 10.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
