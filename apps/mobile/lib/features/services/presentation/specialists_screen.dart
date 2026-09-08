import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../../core/widgets/skeleton.dart';
import '../../bookings/presentation/booking_sheet.dart';
import '../domain/service_models.dart';
import 'specialists_controller.dart';

/// Lista de especialistas de uma área — aberta a partir do resultado da
/// triagem (recomendação de especialidade) ou do catálogo de saúde.
/// Permite ordenar por avaliação/preço/experiência e agendar na hora.
class SpecialistsScreen extends ConsumerStatefulWidget {
  const SpecialistsScreen({super.key});

  @override
  ConsumerState<SpecialistsScreen> createState() => _SpecialistsScreenState();
}

class _SpecialistsScreenState extends ConsumerState<SpecialistsScreen> {
  Specialty? _specialty;
  SpecialistSort _sort = SpecialistSort.rating;
  String _search = '';
  bool _resolved = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_resolved) {
      _resolved = true;
      final extra = GoRouterState.of(context).extra;
      if (extra is Specialty) _specialty = extra;
    }
  }

  @override
  Widget build(BuildContext context) {
    final key = specialistsKey(_specialty?.id, _sort);
    final doctors = ref.watch(specialistsProvider(key));
    final title = _specialty?.name ?? 'Todos os especialistas';

    final filtered = doctors.maybeWhen(
      data: (list) => _search.trim().isEmpty
          ? list
          : list
              .where((d) =>
                  d.displayName.toLowerCase().contains(_search.trim()) ||
                  (d.specialtyName ?? '')
                      .toLowerCase()
                      .contains(_search.trim()))
              .toList(),
      orElse: () => <Doctor>[],
    );

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Cabeçalho ────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 20, 0),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => context.pop(),
                      icon: const Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
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
                              fontSize: 19,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          Text(
                            _specialty == null
                                ? 'Profissionais disponíveis agora'
                                : 'Consulta especializada recomendada pela triagem',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.5),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // ── Pesquisa + ordenação ─────────────────────────────
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        onChanged: (v) => setState(() => _search = v),
                        style: const TextStyle(
                            color: AppColors.textPrimary, fontSize: 13.5),
                        decoration: InputDecoration(
                          hintText: 'Pesquisar profissional…',
                          prefixIcon: const Icon(Icons.search_rounded,
                              color: AppColors.textMuted, size: 19),
                          isDense: true,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.glassBorder),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<SpecialistSort>(
                          value: _sort,
                          dropdownColor: const Color(0xFF0B1D31),
                          icon: const Icon(Icons.sort_rounded,
                              size: 18, color: AppColors.textMuted),
                          style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 12.5),
                          items: const [
                            DropdownMenuItem(
                              value: SpecialistSort.rating,
                              child: Text('Avaliação'),
                            ),
                            DropdownMenuItem(
                              value: SpecialistSort.price,
                              child: Text('Preço'),
                            ),
                            DropdownMenuItem(
                              value: SpecialistSort.experience,
                              child: Text('Experiência'),
                            ),
                          ],
                          onChanged: (v) {
                            if (v != null) setState(() => _sort = v);
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // ── Lista ────────────────────────────────────────────
              Expanded(
                child: doctors.when(
                  loading: () => ListView(
                    padding: EdgeInsets.symmetric(horizontal: 20),
                    children: [ListSkeleton(count: 5, itemHeight: 108)],
                  ),
                  error: (e, _) => EmptyState(
                    icon: Icons.wifi_off_rounded,
                    title: 'Não foi possível carregar',
                    message: 'Verifica a ligação e tenta de novo.',
                    actionLabel: 'Recarregar',
                    onAction: () => ref.invalidate(
                        specialistsProvider(key)),
                  ),
                  data: (_) => filtered.isEmpty
                      ? const EmptyState(
                          icon: Icons.person_search_rounded,
                          title: 'Sem especialistas nesta área',
                          message:
                              'Ainda não há profissionais disponíveis para '
                              'esta especialidade. Podes falar primeiro com '
                              'um clínico geral ou tentar mais tarde — novos '
                              'profissionais entram a toda hora.',
                        )
                      : ListView.builder(
                          padding:
                              const EdgeInsets.fromLTRB(20, 2, 20, 40),
                          itemCount: filtered.length,
                          itemBuilder: (context, i) => _SpecialistCard(
                            doctor: filtered[i],
                            highlighted: _specialty != null,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Cartão de especialista ──────────────────────────────────────────────

class _SpecialistCard extends StatelessWidget {
  const _SpecialistCard({required this.doctor, this.highlighted = false});

  final Doctor doctor;
  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(19),
        border: Border.all(
          color: highlighted
              ? const Color(0x4438BDF8)
              : AppColors.glassBorder,
        ),
      ),
      child: Column(
        children: [
          Row(
            children: [
              // Avatar ou iniciais
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0x1A38BDF8),
                  image: doctor.avatarUrl != null &&
                          doctor.avatarUrl!.startsWith('http')
                      ? DecorationImage(
                          image: NetworkImage(doctor.avatarUrl!),
                          fit: BoxFit.cover,
                        )
                      : null,
                ),
                child: doctor.avatarUrl == null ||
                        !doctor.avatarUrl!.startsWith('http')
                    ? Center(
                        child: Text(
                          _initials(doctor.displayName),
                          style: const TextStyle(
                            color: AppColors.accent,
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                          ),
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            doctor.displayName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.w800,
                              fontSize: 14.5,
                            ),
                          ),
                        ),
                        if (doctor.isVerified) ...[
                          const SizedBox(width: 5),
                          const Icon(Icons.verified_rounded,
                              color: AppColors.accent, size: 15),
                        ],
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      doctor.specialtyName ?? 'Clínica Geral',
                      style: const TextStyle(
                        color: AppColors.accent,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Row(
                      children: [
                        const Icon(Icons.star_rounded,
                            color: Color(0xFFFBBF24), size: 14),
                        const SizedBox(width: 3),
                        Text(
                          doctor.rating.toStringAsFixed(1),
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(width: 10),
                        const Icon(Icons.work_history_rounded,
                            color: AppColors.textMuted, size: 13),
                        const SizedBox(width: 3),
                        Text(
                          '${doctor.yearsExperience} anos',
                          style: const TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 11.5,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    formatMZN(doctor.consultationFee),
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w800,
                      fontSize: 13.5,
                    ),
                  ),
                  Text(
                    'por consulta',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.4),
                      fontSize: 10,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: GradientButton(
                  label: 'Agendar consulta',
                  icon: Icons.event_available_rounded,
                  height: 44,
                  onPressed: () => _openBooking(context),
                ),
              ),
            ],
          ),
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 240.ms)
        .slideY(begin: 0.08, curve: Curves.easeOutCubic);
  }

  void _openBooking(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => BookingSheet(doctor: doctor),
    );
  }

  String _initials(String name) {
    final parts =
        name.split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first[0].toUpperCase();
    return (parts.first[0] + parts.last[0]).toUpperCase();
  }
}
