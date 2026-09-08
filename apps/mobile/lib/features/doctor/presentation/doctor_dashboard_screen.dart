import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../../core/widgets/skeleton.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../bookings/domain/booking_models.dart'
    show consultationStatusColor, consultationStatusLabel;
import '../data/doctor_repository.dart';

/// Providers ──────────────────────────────────────────────────────────

final doctorRepositoryProvider = Provider<DoctorRepository>(
  (ref) => DoctorRepository(Supabase.instance.client),
);

/// Perfil de médico do utilizador actual (null quando não é médico).
final myDoctorProfileProvider = FutureProvider<MyDoctorProfile?>((ref) async {
  final uid = ref.watch(currentUserIdProvider);
  if (uid == null) return null;
  return ref.watch(doctorRepositoryProvider).fetchMyDoctorProfile(uid);
});

/// Agenda em tempo real (só activa com médico no perfil).
final doctorAgendaProvider =
    StreamProvider.family<List<DoctorConsultation>, String>((ref, doctorId) {
  return ref.watch(doctorRepositoryProvider).watchMyConsultations(doctorId);
});

/// ── Ecrã ─────────────────────────────────────────────────────────────

/// Painel do médico: KPIs, agenda, slots de disponibilidade, pacientes
/// e edição do perfil profissional. Visível para quem tem linha em
/// `doctor_profiles` (role `doctor` na plataforma).
class DoctorDashboardScreen extends ConsumerStatefulWidget {
  const DoctorDashboardScreen({super.key});

  @override
  ConsumerState<DoctorDashboardScreen> createState() =>
      _DoctorDashboardScreenState();
}

class _DoctorDashboardScreenState extends ConsumerState<DoctorDashboardScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs =
      TabController(length: 4, vsync: this, initialIndex: 1);

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final profileAsync = ref.watch(myDoctorProfileProvider);

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: profileAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.all(20),
              child: ListSkeleton(count: 4, itemHeight: 90),
            ),
            error: (e, _) => EmptyState(
              icon: Icons.wifi_off_rounded,
              title: 'Painel indisponível',
              message: 'Verifica a ligação e tenta novamente.',
              actionLabel: 'Recarregar',
              onAction: () => ref.invalidate(myDoctorProfileProvider),
            ),
            data: (profile) {
              if (profile == null) {
                return const EmptyState(
                  icon: Icons.medical_information_rounded,
                  title: 'Perfil de médico não encontrado',
                  message:
                      'Esta área é para profissionais registados como médicos na plataforma. O teu perfil ainda não tem linha em doctor_profiles.',
                );
              }
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(8, 8, 20, 0),
                    child: Row(
                      children: [
                        IconButton(
                          onPressed: () => context.pop(),
                          icon: const Icon(Icons.arrow_back_rounded,
                              color: AppColors.textPrimary),
                        ),
                        const Expanded(
                          child: Text(
                            'Painel do Médico',
                            style: TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 19,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        _AvailabilitySwitch(profile: profile),
                      ],
                    ),
                  ),
                  _KpiRow(profile: profile),
                  TabBar(
                    controller: _tabs,
                    isScrollable: true,
                    tabAlignment: TabAlignment.start,
                    dividerColor: Colors.transparent,
                    indicatorColor: AppColors.accent,
                    labelColor: AppColors.textPrimary,
                    unselectedLabelColor: AppColors.textMuted,
                    labelStyle: const TextStyle(
                        fontSize: 13.5, fontWeight: FontWeight.w700),
                    tabs: const [
                      Tab(text: 'Agenda'),
                      Tab(text: 'Horários'),
                      Tab(text: 'Pacientes'),
                      Tab(text: 'Perfil'),
                    ],
                  ),
                  Expanded(
                    child: TabBarView(
                      controller: _tabs,
                      children: [
                        _AgendaTab(profile: profile),
                        _SlotsTab(profile: profile),
                        _PatientsTab(profile: profile),
                        _DoctorProfileTab(profile: profile),
                      ],
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

/// ── Interruptor de disponibilidade ───────────────────────────────────

class _AvailabilitySwitch extends ConsumerWidget {
  const _AvailabilitySwitch({required this.profile});

  final MyDoctorProfile profile;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GestureDetector(
      onTap: () async {
        final next = !profile.isAvailable;
        try {
          await ref
              .read(doctorRepositoryProvider)
              .toggleAvailability(profile.userId, next);
          ref.invalidate(myDoctorProfileProvider);
        } catch (_) {
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                  content: Text('Não foi possível actualizar a disponibilidade')),
            );
          }
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: (profile.isAvailable ? AppColors.success : AppColors.warning)
              .withOpacity(0.14),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: (profile.isAvailable ? AppColors.success : AppColors.warning)
                .withOpacity(0.4),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: profile.isAvailable
                    ? AppColors.success
                    : AppColors.warning,
              ),
            ),
            const SizedBox(width: 7),
            Text(
              profile.isAvailable ? 'Disponível' : 'Indisponível',
              style: TextStyle(
                color: profile.isAvailable
                    ? AppColors.success
                    : AppColors.warning,
                fontSize: 12,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// ── KPIs ─────────────────────────────────────────────────────────────

class _KpiRow extends ConsumerWidget {
  const _KpiRow({required this.profile});

  final MyDoctorProfile profile;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final agenda = ref.watch(doctorAgendaProvider(profile.userId));
    final kpis = agenda.value != null
        ? ref.read(doctorRepositoryProvider).computeKpis(agenda.value!)
        : DoctorKpis.empty;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 10),
      child: Row(
        children: [
          _Kpi('Consultas do mês', '${kpis.monthCompleted}',
              Icons.check_circle_rounded, AppColors.success),
          const SizedBox(width: 10),
          _Kpi('Receita do mês', formatMZN(kpis.monthRevenue),
              Icons.payments_rounded, AppColors.accent),
          const SizedBox(width: 10),
          _Kpi('Pacientes', '${kpis.monthPatients}',
              Icons.people_rounded, const Color(0xFFC084FC)),
          const SizedBox(width: 10),
          _Kpi('Próximas', '${kpis.upcomingCount}',
              Icons.upcoming_rounded, AppColors.warning),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms);
  }
}

class _Kpi extends StatelessWidget {
  const _Kpi(this.label, this.value, this.icon, this.color);

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: AppColors.glassFill,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 6),
            FittedBox(
              child: Text(
                value,
                maxLines: 1,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 13.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: AppColors.textMuted, fontSize: 10),
            ),
          ],
        ),
      ),
    );
  }
}

/// ── Tab 1: Agenda ────────────────────────────────────────────────────

class _AgendaTab extends ConsumerStatefulWidget {
  const _AgendaTab({required this.profile});

  final MyDoctorProfile profile;

  @override
  ConsumerState<_AgendaTab> createState() => _AgendaTabState();
}

class _AgendaTabState extends ConsumerState<_AgendaTab> {
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final agenda = ref.watch(doctorAgendaProvider(widget.profile.userId));

    return agenda.when(
      loading: () => const ListSkeleton(count: 5, itemHeight: 110),
      error: (e, _) => EmptyState(
        icon: Icons.wifi_off_rounded,
        title: 'Agenda indisponível',
        message: 'Verifica a ligação e tenta novamente.',
        actionLabel: 'Recarregar',
        onAction: () =>
            ref.invalidate(doctorAgendaProvider(widget.profile.userId)),
      ),
      data: (list) {
        if (list.isEmpty) {
          return const EmptyState(
            icon: Icons.event_note_rounded,
            title: 'Agenda vazia',
            message:
                'Ainda não tens consultas marcadas. Define os teus horários disponíveis na aba Horários.',
          );
        }
        final today = list.where((c) => c.isUpcoming).toList()
          ..sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));
        final rest = list.where((c) => !c.isUpcoming).toList()
          ..sort((a, b) => b.scheduledAt.compareTo(a.scheduledAt));

        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 6, 20, 40),
          children: [
            if (today.isNotEmpty) ...[
              const _SectionLabel('Próximas consultas'),
              for (final c in today)
                _AgendaTile(consultation: c, busy: _busy, onAction: _act),
              const SizedBox(height: 8),
            ],
            const _SectionLabel('Histórico'),
            for (final c in rest.take(40))
              _AgendaTile(consultation: c, busy: _busy, onAction: _act),
          ],
        ).animate().fadeIn(duration: 300.ms);
      },
    );
  }

  Future<void> _act(DoctorConsultation c, _AgendaAction action) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final repo = ref.read(doctorRepositoryProvider);
      switch (action) {
        case _AgendaAction.complete:
          await repo.markCompleted(c.id);
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                content: Text(
                    'Consulta concluída — o saldo do paciente foi debitado e o teu crédito lançado.')));
          }
          break;
        case _AgendaAction.cancel:
          await repo.cancel(c.id);
          break;
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Não foi possível actualizar a consulta')),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}

enum _AgendaAction { complete, cancel }

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Text(
          text,
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 12.5,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.4,
          ),
        ),
      );
}

class _AgendaTile extends StatelessWidget {
  const _AgendaTile({
    required this.consultation,
    required this.busy,
    required this.onAction,
  });

  final DoctorConsultation consultation;
  final bool busy;
  final void Function(DoctorConsultation, _AgendaAction) onAction;

  @override
  Widget build(BuildContext context) {
    final c = consultation;
    final color = consultationStatusColor(c.status);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.accent.withOpacity(0.12),
                  border:
                      Border.all(color: AppColors.accent.withOpacity(0.35)),
                ),
                child: Text(
                  c.patientName.isNotEmpty ? c.patientName[0].toUpperCase() : 'P',
                  style: const TextStyle(
                    color: AppColors.accent,
                    fontWeight: FontWeight.w800,
                    fontSize: 15,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      c.patientName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 14.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${formatDateTime(c.scheduledAt)} · ${c.durationMinutes} min',
                      style: const TextStyle(
                          color: AppColors.textSecondary, fontSize: 12),
                    ),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(7),
                ),
                child: Text(
                  consultationStatusLabel(c.status),
                  style: TextStyle(
                      color: color,
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ),
          if (c.reason?.isNotEmpty == true) ...[
            const SizedBox(height: 8),
            Text(
              c.reason!,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  color: AppColors.textMuted, fontSize: 12.5),
            ),
          ],
          const SizedBox(height: 10),
          Row(
            children: [
              Text(
                formatMZN(c.fee),
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const Spacer(),
              if (c.status == 'scheduled') ...[
                _MiniButton(
                  label: 'Cancelar',
                  color: AppColors.danger,
                  onTap: busy ? null : () => onAction(c, _AgendaAction.cancel),
                ),
                const SizedBox(width: 8),
                _MiniButton(
                  label: 'Concluir',
                  color: AppColors.success,
                  filled: true,
                  onTap: busy
                      ? null
                      : () => onAction(c, _AgendaAction.complete),
                ),
              ] else if (c.status == 'in_progress') ...[
                _MiniButton(
                  label: 'Marcar concluída',
                  color: AppColors.success,
                  filled: true,
                  onTap:
                      busy ? null : () => onAction(c, _AgendaAction.complete),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _MiniButton extends StatelessWidget {
  const _MiniButton({
    required this.label,
    required this.color,
    required this.onTap,
    this.filled = false,
  });

  final String label;
  final Color color;
  final VoidCallback? onTap;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: filled ? color.withOpacity(0.9) : color.withOpacity(0.12),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withOpacity(0.4)),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: filled ? Colors.white : color,
            fontSize: 12,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

/// ── Tab 2: Horários (slots) ──────────────────────────────────────────

class _SlotsTab extends ConsumerStatefulWidget {
  const _SlotsTab({required this.profile});

  final MyDoctorProfile profile;

  @override
  ConsumerState<_SlotsTab> createState() => _SlotsTabState();
}

class _SlotsTabState extends ConsumerState<_SlotsTab> {
  List<DoctorSlot>? _slots;
  bool _loading = true;
  bool _busy = false;

  int _days = 7;
  int _startHour = 8;
  int _endHour = 17;
  int _duration = 30;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final slots = await ref
          .read(doctorRepositoryProvider)
          .fetchSlots(widget.profile.userId);
      if (mounted) setState(() => _slots = slots);
    } catch (_) {
      if (mounted) setState(() => _slots = []);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const ListSkeleton(count: 5, itemHeight: 72);

    final slots = _slots ?? const <DoctorSlot>[];
    final byDay = <DateTime, List<DoctorSlot>>{};
    for (final s in slots) {
      final day =
          DateTime(s.startsAt.year, s.startsAt.month, s.startsAt.day);
      byDay.putIfAbsent(day, () => []).add(s);
    }
    final days = byDay.keys.toList()..sort();

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 6, 20, 40),
      children: [
        _SeriesCard(
          days: _days,
          startHour: _startHour,
          endHour: _endHour,
          duration: _duration,
          onDays: (v) => setState(() => _days = v),
          onStart: (v) => setState(() => _startHour = v),
          onEnd: (v) => setState(() => _endHour = v),
          onDuration: (v) => setState(() => _duration = v),
          busy: _busy,
          onCreate: _createSeries,
        ),
        const SizedBox(height: 14),
        if (slots.isEmpty)
          const EmptyState(
            icon: Icons.schedule_rounded,
            title: 'Sem horários publicados',
            message:
                'Cria a tua primeira série de horários — os pacientes só conseguem marcar consultas nos slots que publicares aqui.',
          )
        else
          for (final day in days) ...[
            _SectionLabel(_dayLabel(day)),
            for (final s in byDay[day]!)
              _SlotTile(slot: s, busy: _busy, onDelete: _delete),
          ],
      ],
    ).animate().fadeIn(duration: 300.ms);
  }

  String _dayLabel(DateTime d) {
    final now = DateTime.now();
    final tomorrow = DateTime(now.year, now.month, now.day + 1);
    if (d.year == now.year && d.month == now.month && d.day == now.day) {
      return 'Hoje';
    }
    if (d == tomorrow) return 'Amanhã';
    return formatDateShort(d);
  }

  Future<void> _createSeries() async {
    if (_busy || _endHour <= _startHour) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('A hora final deve ser depois da inicial')));
      return;
    }
    setState(() => _busy = true);
    try {
      final created = await ref.read(doctorRepositoryProvider).addSlotSeries(
            doctorId: widget.profile.userId,
            days: _days,
            startHour: _startHour,
            endHour: _endHour,
            durationMinutes: _duration,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$created horários criados com sucesso')),
        );
      }
      await _load();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Não foi possível criar os horários')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _delete(DoctorSlot s) async {
    if (_busy || s.isBooked) return;
    setState(() => _busy = true);
    try {
      await ref.read(doctorRepositoryProvider).deleteSlot(s.id);
      await _load();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Não foi possível apagar o horário')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}

class _SeriesCard extends StatelessWidget {
  const _SeriesCard({
    required this.days,
    required this.startHour,
    required this.endHour,
    required this.duration,
    required this.onDays,
    required this.onStart,
    required this.onEnd,
    required this.onDuration,
    required this.busy,
    required this.onCreate,
  });

  final int days;
  final int startHour;
  final int endHour;
  final int duration;
  final ValueChanged<int> onDays;
  final ValueChanged<int> onStart;
  final ValueChanged<int> onEnd;
  final ValueChanged<int> onDuration;
  final bool busy;
  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [
          Color(0x331E6B9C),
          Color(0x1414B8A6),
        ]),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.auto_awesome_rounded,
                  color: AppColors.accent, size: 18),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Criar série de horários',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _HourPicker(
            label: 'Dias seguidos',
            value: days,
            min: 1,
            max: 30,
            suffix: 'dias',
            onChanged: onDays,
          ),
          _HourPicker(
            label: 'Hora inicial',
            value: startHour,
            min: 6,
            max: 21,
            suffix: 'h',
            onChanged: onStart,
          ),
          _HourPicker(
            label: 'Hora final',
            value: endHour,
            min: 7,
            max: 22,
            suffix: 'h',
            onChanged: onEnd,
          ),
          _HourPicker(
            label: 'Duração da consulta',
            value: duration,
            min: 15,
            max: 60,
            step: 15,
            suffix: 'min',
            onChanged: onDuration,
          ),
          const SizedBox(height: 14),
          GradientButton(
            label: 'Publicar horários',
            icon: Icons.event_available_rounded,
            loading: busy,
            onPressed: onCreate,
          ),
        ],
      ),
    );
  }
}

class _HourPicker extends StatelessWidget {
  const _HourPicker({
    required this.label,
    required this.value,
    required this.min,
    required this.max,
    required this.suffix,
    required this.onChanged,
    this.step = 1,
  });

  final String label;
  final int value;
  final int min;
  final int max;
  final int step;
  final String suffix;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          SizedBox(
            width: 150,
            child: Text(
              label,
              style: const TextStyle(
                  color: AppColors.textSecondary, fontSize: 12.5),
            ),
          ),
          _RoundStep(
            icon: Icons.remove_rounded,
            onTap: value - step >= min ? () => onChanged(value - step) : null,
          ),
          Expanded(
            child: Center(
              child: Text(
                '$value $suffix',
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
          _RoundStep(
            icon: Icons.add_rounded,
            onTap: value + step <= max ? () => onChanged(value + step) : null,
          ),
        ],
      ),
    );
  }
}

class _RoundStep extends StatelessWidget {
  const _RoundStep({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 32,
        height: 32,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: AppColors.glassFill,
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: Icon(icon,
            size: 18,
            color: onTap == null ? AppColors.textMuted : AppColors.accent),
      ),
    );
  }
}

class _SlotTile extends StatelessWidget {
  const _SlotTile({required this.slot, required this.busy, required this.onDelete});

  final DoctorSlot slot;
  final bool busy;
  final void Function(DoctorSlot) onDelete;

  @override
  Widget build(BuildContext context) {
    final color = slot.isBooked ? AppColors.warning : AppColors.success;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        children: [
          Icon(Icons.schedule_rounded, color: color, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              '${slot.startsAt.hour.toString().padLeft(2, '0')}:${slot.startsAt.minute.toString().padLeft(2, '0')}'
              ' – '
              '${slot.endsAt.hour.toString().padLeft(2, '0')}:${slot.endsAt.minute.toString().padLeft(2, '0')}',
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 13.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(7),
            ),
            child: Text(
              slot.isBooked ? 'Reservado' : 'Livre',
              style: TextStyle(
                  color: color, fontSize: 10.5, fontWeight: FontWeight.w800),
            ),
          ),
          if (!slot.isBooked) ...[
            const SizedBox(width: 8),
            GestureDetector(
              onTap: busy ? null : () => onDelete(slot),
              child: const Icon(Icons.delete_outline_rounded,
                  color: AppColors.danger, size: 20),
            ),
          ],
        ],
      ),
    );
  }
}

/// ── Tab 3: Pacientes ─────────────────────────────────────────────────

class _PatientsTab extends ConsumerStatefulWidget {
  const _PatientsTab({required this.profile});

  final MyDoctorProfile profile;

  @override
  ConsumerState<_PatientsTab> createState() => _PatientsTabState();
}

class _PatientsTabState extends ConsumerState<_PatientsTab> {
  List<DoctorPatient>? _patients;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final list = await ref
          .read(doctorRepositoryProvider)
          .fetchPatients(widget.profile.userId);
      if (mounted) setState(() => _patients = list);
    } catch (_) {
      if (mounted) setState(() => _patients = []);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const ListSkeleton(count: 6, itemHeight: 76);

    final list = _patients ?? const <DoctorPatient>[];
    if (list.isEmpty) {
      return const EmptyState(
        icon: Icons.people_rounded,
        title: 'Ainda sem pacientes',
        message:
            'Os pacientes que consultares aparecem aqui com o histórico de visitas.',
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.accent,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(20, 6, 20, 40),
        itemCount: list.length,
        itemBuilder: (context, i) {
          final p = list[i];
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
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
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient:
                        const LinearGradient(colors: AppColors.heroCardGradient),
                    border: Border.all(color: Colors.white.withOpacity(0.2)),
                  ),
                  child: Text(
                    p.name.isNotEmpty ? p.name[0].toUpperCase() : 'P',
                    style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 15),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        p.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        p.lastVisit != null
                            ? 'Última visita · ${formatDateShort(p.lastVisit!)}'
                            : 'Paciente',
                        style: const TextStyle(
                            color: AppColors.textMuted, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: AppColors.accent.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(9),
                  ),
                  child: Text(
                    '${p.consultationCount}x',
                    style: const TextStyle(
                        color: AppColors.accent,
                        fontSize: 12,
                        fontWeight: FontWeight.w800),
                  ),
                ),
              ],
            ),
          ).animate().fadeIn(duration: 280.ms);
        },
      ),
    );
  }
}

/// ── Tab 4: Perfil profissional ───────────────────────────────────────

class _DoctorProfileTab extends ConsumerStatefulWidget {
  const _DoctorProfileTab({required this.profile});

  final MyDoctorProfile profile;

  @override
  ConsumerState<_DoctorProfileTab> createState() => _DoctorProfileTabState();
}

class _DoctorProfileTabState extends ConsumerState<_DoctorProfileTab> {
  late final TextEditingController _bio =
      TextEditingController(text: widget.profile.bio ?? '');
  late final TextEditingController _fee = TextEditingController(
      text: widget.profile.consultationFee.toString());
  late final TextEditingController _years =
      TextEditingController(text: widget.profile.yearsExperience.toString());
  late final TextEditingController _license =
      TextEditingController(text: widget.profile.licenseNumber);
  bool _saving = false;

  @override
  void dispose() {
    _bio.dispose();
    _fee.dispose();
    _years.dispose();
    _license.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 6, 20, 40),
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.glassFill,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.glassBorder),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  Container(
                    width: 54,
                    height: 54,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient:
                          const LinearGradient(colors: AppColors.heroCardGradient),
                      border:
                          Border.all(color: Colors.white.withOpacity(0.2)),
                    ),
                    child: const Icon(Icons.medical_services_rounded,
                        color: Colors.white, size: 26),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Flexible(
                              child: Text(
                                'Perfil profissional',
                                style: TextStyle(
                                  color: AppColors.textPrimary,
                                  fontSize: 15,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                            if (widget.profile.isVerified) ...[
                              const SizedBox(width: 6),
                              Icon(Icons.verified_rounded,
                                  color: AppColors.accent, size: 17),
                            ],
                          ],
                        ),
                        const SizedBox(height: 3),
                        Text(
                          'Rating ${widget.profile.rating.toStringAsFixed(1)} · '
                          '${widget.profile.totalConsultations} consultas',
                          style: const TextStyle(
                              color: AppColors.textMuted, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _license,
                style: const TextStyle(color: AppColors.textPrimary),
                decoration: const InputDecoration(
                  labelText: 'Nº de licença (cédula)',
                  prefixIcon: Icon(Icons.badge_rounded),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _fee,
                      keyboardType: TextInputType.number,
                      style: const TextStyle(color: AppColors.textPrimary),
                      decoration: const InputDecoration(
                        labelText: 'Preço (MT)',
                        prefixIcon: Icon(Icons.payments_rounded),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _years,
                      keyboardType: TextInputType.number,
                      style: const TextStyle(color: AppColors.textPrimary),
                      decoration: const InputDecoration(
                        labelText: 'Anos exp.',
                        prefixIcon: Icon(Icons.work_history_rounded),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _bio,
                maxLines: 4,
                style: const TextStyle(color: AppColors.textPrimary),
                decoration: const InputDecoration(
                  labelText: 'Bio profissional',
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 18),
              GradientButton(
                label: 'Guardar alterações',
                icon: Icons.save_rounded,
                loading: _saving,
                onPressed: _save,
              ),
            ],
          ),
        ).animate().fadeIn(duration: 300.ms),
        const SizedBox(height: 14),
        // Upload de foto profissional (bucket avatars).
        _AvatarCard(avatarUrl: widget.profile.avatarUrl),
      ],
    );
  }

  Future<void> _save() async {
    if (_saving) return;
    final fee = int.tryParse(_fee.text.trim()) ?? widget.profile.consultationFee;
    final years = int.tryParse(_years.text.trim()) ?? 0;
    if (_license.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('O nº de licença é obrigatório')),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(doctorRepositoryProvider).updateDoctorProfile(
            widget.profile.userId,
            bio: _bio.text.trim(),
            consultationFee: fee,
            yearsExperience: years,
            licenseNumber: _license.text.trim(),
          );
      ref.invalidate(myDoctorProfileProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Perfil actualizado com sucesso')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Não foi possível guardar o perfil')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}

/// Cartão de avatar do médico — upload para o bucket `avatars` com
/// upsert em `{uid}/avatar.jpg` (mesmo caminho usado pela web).
class _AvatarCard extends ConsumerStatefulWidget {
  const _AvatarCard({required this.avatarUrl});

  final String? avatarUrl;

  @override
  ConsumerState<_AvatarCard> createState() => _AvatarCardState();
}

class _AvatarCardState extends ConsumerState<_AvatarCard> {
  bool _uploading = false;

  Future<void> _pickAndUpload() async {
    if (_uploading) return;
    final uid = ref.read(currentUserIdProvider);
    if (uid == null) return;
    final picker = ImagePicker();
    final XFile? file;
    try {
      file = await picker.pickImage(source: ImageSource.gallery, imageQuality: 82);
    } catch (_) {
      return;
    }
    if (file == null) return;

    setState(() => _uploading = true);
    try {
      final client = Supabase.instance.client;
      final bytes = await file.readAsBytes();
      final ext = file.name.split('.').last.toLowerCase();
      final safeExt = (ext.length == 3 || ext.length == 4) ? ext : 'jpg';
      final path = '$uid/avatar.$safeExt';
      await client.storage.from('avatars').uploadBinary(
            path,
            bytes,
            fileOptions: const FileOptions(upsert: true),
          );
      final publicUrl = client.storage.from('avatars').getPublicUrl(path);
      // cache-buster para a UI refrescar de imediato
      final bust = '$publicUrl?v=${DateTime.now().millisecondsSinceEpoch}';
      await ref.read(doctorRepositoryProvider).updateDoctorProfile(
            uid,
            avatarUrl: bust,
          );
      ref.invalidate(myDoctorProfileProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Foto profissional actualizada')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Não foi possível enviar a foto')),
        );
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        children: [
          const Icon(Icons.photo_camera_rounded,
              color: AppColors.accent, size: 22),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Foto profissional\n(o cartão de médico da app)',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5),
            ),
          ),
          GestureDetector(
            onTap: _pickAndUpload,
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
              decoration: BoxDecoration(
                color: AppColors.accent.withOpacity(0.14),
                borderRadius: BorderRadius.circular(11),
                border: Border.all(color: AppColors.accent.withOpacity(0.4)),
              ),
              child: _uploading
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text(
                      'Escolher',
                      style: TextStyle(
                        color: AppColors.accent,
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
