import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/reminders/meds_reminder_service.dart';
import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../../core/widgets/skeleton.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/meds_repository.dart';

/// Medicação — checklist diária (receitas + ad-hoc), streak e
/// histórico dos últimos 7 dias. Dados em `medication_logs`.
class MedsScreen extends ConsumerStatefulWidget {
  const MedsScreen({super.key});

  @override
  ConsumerState<MedsScreen> createState() => _MedsScreenState();
}

class _MedsScreenState extends ConsumerState<MedsScreen> {
  List<PlannedMedication>? _planned;
  List<MedicationLog>? _today;
  List<MedicationLog>? _recent;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  MedsRepository get _repo =>
      MedsRepository(ref.read(supabaseClientProvider));

  Future<void> _load() async {
    final repo = _repo;
    final results = await Future.wait([
      repo.fetchPlanned(),
      repo.fetchDay(DateTime.now()),
      repo.fetchRecent(days: 30),
    ]);
    if (!mounted) return;
    setState(() {
      _planned = results[0] as List<PlannedMedication>;
      _today = results[1] as List<MedicationLog>;
      _recent = results[2] as List<MedicationLog>;
      _loading = false;
    });

    // Lembretes locais (1–3 por dia, derivados da frequência da receita).
    final planned = _planned ?? const <PlannedMedication>[];
    if (planned.isNotEmpty) {
      try {
        await MedsReminderService.instance.scheduleForMedications([
          for (final p in planned)
            (
              id: p.prescriptionItemId,
              name: p.name,
              dosage: p.dosage,
              frequency: p.frequency,
            ),
        ]);
      } catch (_) {
        // Dispositivo sem permissões — silencioso (o plano continua funcional).
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: _loading
              ? const Center(
                  child: CircularProgressIndicator(color: AppColors.accent))
              : _Body(
                  repo: _repo,
                  planned: _planned ?? const [],
                  today: _today ?? const [],
                  recent: _recent ?? const [],
                  onChanged: _load,
                ),
        ),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({
    required this.repo,
    required this.planned,
    required this.today,
    required this.recent,
    required this.onChanged,
  });

  final MedsRepository repo;
  final List<PlannedMedication> planned;
  final List<MedicationLog> today;
  final List<MedicationLog> recent;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
      children: [
        Row(
          children: [
            IconButton(
              onPressed: () => context.pop(),
              icon: const Icon(Icons.arrow_back_rounded,
                  color: AppColors.textPrimary),
            ),
            const Expanded(
              child: Text(
                'Medicação',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        _StreakCard(recent: recent),
        const SizedBox(height: 16),
        const Text(
          'HOJE',
          style: TextStyle(
            color: AppColors.textMuted,
            fontSize: 11,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 10),
        ..._todayCards(context),
        const SizedBox(height: 14),
        GradientButton(
          label: 'Adicionar medicação manual',
          icon: Icons.add_rounded,
          height: 46,
          onPressed: () => _addAdHoc(context),
        ),
        const SizedBox(height: 18),
        const Text(
          'ÚLTIMOS 7 DIAS',
          style: TextStyle(
            color: AppColors.textMuted,
            fontSize: 11,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 10),
        _WeekDots(recent: recent),
      ],
    );
  }

  List<Widget> _todayCards(BuildContext context) {
    final plannedToday = <PlannedMedication>[
      for (final p in planned)
        if (!today.any((l) => l.prescriptionItemId == p.prescriptionItemId))
          p,
    ];
    final adHoc = [
      for (final l in today)
        if (l.prescriptionItemId == null) l,
    ];
    final doneToday = [
      for (final l in today)
        if (l.prescriptionItemId != null) l,
    ];

    if (planned.isEmpty && adHoc.isEmpty && doneToday.isEmpty) {
      return [
        const EmptyState(
          icon: Icons.medication_rounded,
          title: 'Sem medicação registada',
          message:
              'Quando um especialista te emitir uma receita, os '
              'medicamentos aparecem aqui para registares as tomas. '
              'Também podes adicionar medicação manual.',
        ),
      ];
    }

    return [
      for (final d in doneToday)
        _TodayCard(
          name: d.medicationName ?? 'Medicamento',
          dosage: d.dosage,
          state: d.isTaken ? _CardState.taken : _CardState.skipped,
          onToggle: () async {
            await repo.toggleAdHoc(d);
            onChanged();
          },
        ),
      for (final p in plannedToday)
        _TodayCard(
          name: p.name,
          dosage: p.dosage,
          frequency: p.frequency,
          state: _CardState.pending,
          onToggle: () async {
            await repo.togglePlanned(
              prescriptionItemId: p.prescriptionItemId,
              name: p.name,
              dosage: p.dosage,
              taken: true,
            );
            onChanged();
          },
          onSkip: () async {
            await repo.skipPlanned(
              prescriptionItemId: p.prescriptionItemId,
              name: p.name,
            );
            onChanged();
          },
        ),
      for (final l in adHoc)
        _TodayCard(
          name: l.medicationName ?? 'Medicação',
          dosage: l.dosage,
          state: l.isTaken ? _CardState.taken : _CardState.pending,
          onToggle: () async {
            await repo.toggleAdHoc(l);
            onChanged();
          },
          onDelete: () async {
            await repo.remove(l.id);
            onChanged();
          },
        ),
    ];
  }

  Future<void> _addAdHoc(BuildContext context) async {
    final nameCtrl = TextEditingController();
    final dosageCtrl = TextEditingController();
    final ok = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => Container(
        padding: EdgeInsets.fromLTRB(
            22, 18, 22, MediaQuery.of(ctx).viewInsets.bottom + 20),
        decoration: const BoxDecoration(
          gradient:
              LinearGradient(colors: [AppColors.bgHigh, AppColors.bgDeep]),
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Medicação manual',
              style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 17,
                  fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: nameCtrl,
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: const InputDecoration(labelText: 'Nome *'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: dosageCtrl,
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: const InputDecoration(
                  labelText: 'Dose (ex.: 500 mg, 2x dia)'),
            ),
            const SizedBox(height: 16),
            GradientButton(
              label: 'Adicionar para hoje',
              icon: Icons.medication_rounded,
              onPressed: () => Navigator.of(ctx).pop(true),
            ),
          ],
        ),
      ),
    );
    if (ok != true) return;
    if (nameCtrl.text.trim().isEmpty) return;
    await repo.addAdHoc(
        name: nameCtrl.text.trim(), dosage: dosageCtrl.text.trim());
    onChanged();
  }
}

enum _CardState { pending, taken, skipped }

class _TodayCard extends StatelessWidget {
  const _TodayCard({
    required this.name,
    required this.state,
    required this.onToggle,
    this.dosage,
    this.frequency,
    this.onSkip,
    this.onDelete,
  });

  final String name;
  final String? dosage;
  final String? frequency;
  final _CardState state;
  final VoidCallback onToggle;
  final VoidCallback? onSkip;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    final done = state == _CardState.taken;
    final skipped = state == _CardState.skipped;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: done
              ? AppColors.success.withOpacity(0.4)
              : skipped
                  ? Colors.white.withOpacity(0.06)
                  : AppColors.glassBorder,
        ),
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: onToggle,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 220),
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: done ? AppColors.success : Colors.transparent,
                border: Border.all(
                  color: done
                      ? AppColors.success
                      : AppColors.textMuted.withOpacity(0.5),
                  width: 2,
                ),
              ),
              child: Icon(
                done ? Icons.check_rounded : Icons.radio_button_unchecked,
                color: done ? Colors.white : AppColors.textMuted,
                size: done ? 20 : 22,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: TextStyle(
                    color: skipped
                        ? Colors.white.withOpacity(0.4)
                        : AppColors.textPrimary,
                    fontWeight: FontWeight.w700,
                    fontSize: 13.5,
                    decoration:
                        skipped ? TextDecoration.lineThrough : null,
                  ),
                ),
                if (dosage != null || frequency != null)
                  Text(
                    [
                      if (dosage?.isNotEmpty == true) dosage!,
                      if (frequency?.isNotEmpty == true) frequency!,
                    ].join(' · '),
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.45),
                      fontSize: 11.5,
                    ),
                  ),
              ],
            ),
          ),
          if (skipped)
            const Text(
              'não tomado',
              style: TextStyle(color: AppColors.textMuted, fontSize: 11),
            )
          else if (onSkip != null)
            TextButton(
              onPressed: onSkip,
              child: const Text('Não tomei',
                  style:
                      TextStyle(color: AppColors.textMuted, fontSize: 11.5)),
            ),
          if (onDelete != null)
            IconButton(
              onPressed: onDelete,
              icon: const Icon(Icons.close_rounded,
                  size: 18, color: AppColors.textMuted),
            ),
        ],
      ),
    ).animate().fadeIn(duration: 200.ms).slideX(
          begin: 0.05,
          curve: Curves.easeOutCubic,
        );
  }
}

class _StreakCard extends StatelessWidget {
  const _StreakCard({required this.recent});

  final List<MedicationLog> recent;

  @override
  Widget build(BuildContext context) {
    final streak = MedsRepository.computeStreak(recent);
    final now = DateTime.now();
    final takenToday = recent.any((l) =>
        l.isTaken &&
        l.loggedDate.year == now.year &&
        l.loggedDate.month == now.month &&
        l.loggedDate.day == now.day);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0x2EFBBF24), Color(0x141E6B9C)],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0x4DFBBF24)),
      ),
      child: Row(
        children: [
          const Icon(Icons.local_fire_department_rounded,
              color: Color(0xFFFBBF24), size: 38),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  streak > 0
                      ? '$streak dia${streak == 1 ? '' : 's'} seguidos'
                      : 'Começa hoje',
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
                Text(
                  takenToday
                      ? 'Tomas de hoje registadas. Continua assim.'
                      : 'Regista a primeira toma do dia na checklist.',
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 240.ms).slideY(
          begin: 0.08,
          curve: Curves.easeOutCubic,
        );
  }
}

class _WeekDots extends StatelessWidget {
  const _WeekDots({required this.recent});

  final List<MedicationLog> recent;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final days = List.generate(7, (i) => now.subtract(Duration(days: 6 - i)));
    const weekLetters = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        for (final d in days)
          Column(
            children: [
              Text(
                weekLetters[d.weekday % 7],
                style: TextStyle(
                  color: Colors.white.withOpacity(0.4),
                  fontSize: 10.5,
                ),
              ),
              const SizedBox(height: 6),
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _dayColor(d).withOpacity(0.2),
                  border: Border.all(color: _dayColor(d), width: 1.6),
                ),
                child: Icon(_dayIcon(d), size: 15, color: _dayColor(d)),
              ),
              const SizedBox(height: 4),
              Text(
                '${d.day}',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.4),
                  fontSize: 9.5,
                ),
              ),
            ],
          ),
      ],
    );
  }

  bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  Color _dayColor(DateTime d) {
    final dayLogs =
        recent.where((l) => _sameDay(l.loggedDate, d)).toList();
    if (dayLogs.any((l) => l.isTaken)) return AppColors.success;
    if (dayLogs.any((l) => l.skipped)) return AppColors.warning;
    return AppColors.textMuted;
  }

  IconData _dayIcon(DateTime d) {
    final dayLogs =
        recent.where((l) => _sameDay(l.loggedDate, d)).toList();
    if (dayLogs.any((l) => l.isTaken)) return Icons.check_rounded;
    if (dayLogs.any((l) => l.skipped)) return Icons.remove_rounded;
    return Icons.circle_outlined;
  }
}
