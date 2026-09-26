import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../auth/presentation/auth_controller.dart';
import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../../core/widgets/skeleton.dart';
import '../../reminders/data/reminders_repository.dart';
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
      repo.fetchRecent(days: 84), // 12 semanas — alimenta o mapa de adesão
    ]);
    if (!mounted) return;
    setState(() {
      _planned = results[0] as List<PlannedMedication>;
      _today = results[1] as List<MedicationLog>;
      _recent = results[2] as List<MedicationLog>;
      _loading = false;
    });

    // Lembretes locais (1–3 por dia, derivados da frequência da receita).
    // F33 — re-agenda via RemindersRepository: respeita a preferência
    // master e os medicamentos silenciados (antes re-agendava tudo,
    // ressuscitando lembretes que o utilizador tinha desligado).
    try {
      final prefs = await SharedPreferences.getInstance();
      final remindersRepo = RemindersRepository(
        ref.read(supabaseClientProvider),
        prefs,
      );
      await remindersRepo.reschedule();
    } catch (_) {
      // Dispositivo sem permissões — silencioso (o plano continua funcional).
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: _loading
              ?        Center(
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
              icon:        Icon(Icons.arrow_back_rounded,
                  color: AppColors.textPrimary),
            ),
                   Expanded(
              child: Text(
                'Medicação',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            // F32 — atalho para Lembretes (horários + notificações).
            IconButton(
              onPressed: () => context.push('/reminders'),
              tooltip: 'Lembretes e horários',
              icon:        Icon(Icons.alarm_rounded,
                  color: AppColors.accent),
            ),
          ],
        ),
        const SizedBox(height: 10),
        _StreakCard(recent: recent),
        const SizedBox(height: 14),
        _AdherenceHeatmap(recent: recent),
        const SizedBox(height: 16),
               Text(
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
               Text(
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
        const SizedBox(height: 18),
        _MedTrends(planned: planned, recent: recent),
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
            HapticFeedback.lightImpact();
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
            HapticFeedback.mediumImpact(); // toma registada: toque firme
            await repo.togglePlanned(
              prescriptionItemId: p.prescriptionItemId,
              name: p.name,
              dosage: p.dosage,
              taken: true,
            );
            onChanged();
          },
          onSkip: () async {
            HapticFeedback.selectionClick(); // "não tomei": toque leve
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
            HapticFeedback.lightImpact();
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
        decoration:        BoxDecoration(
          gradient:
              LinearGradient(colors: [AppColors.bgHigh, AppColors.bgDeep]),
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
                   Text(
              'Medicação manual',
              style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 17,
                  fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: nameCtrl,
              style:        TextStyle(color: AppColors.textPrimary),
              decoration: const InputDecoration(labelText: 'Nome *'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: dosageCtrl,
              style:        TextStyle(color: AppColors.textPrimary),
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
                   Text(
              'não tomado',
              style: TextStyle(color: AppColors.textMuted, fontSize: 11),
            )
          else if (onSkip != null)
            TextButton(
              onPressed: onSkip,
              child:        Text('Não tomei',
                  style:
                      TextStyle(color: AppColors.textMuted, fontSize: 11.5)),
            ),
          if (onDelete != null)
            IconButton(
              onPressed: onDelete,
              icon:        Icon(Icons.close_rounded,
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
                  style:        TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
                Text(
                  takenToday
                      ? 'Tomas de hoje registadas. Continua assim.'
                      : 'Regista a primeira toma do dia na checklist.',
                  style:        TextStyle(
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

/// Mapa de adesão tipo calendário (12 semanas × 7 dias, Seg → Dom),
/// ao estilo das contribuições do GitHub: a cor do quadrado mostra quantas
/// tomas registadas houve no dia, relativo ao dia mais forte da janela.
/// Dias sem registos ficam neutros — o plano histórico pode ter sido outro.
class _AdherenceHeatmap extends StatelessWidget {
   const _AdherenceHeatmap({required this.recent});

  final List<MedicationLog> recent;

  static const double _cell = 13;
  static const double _gap = 3;
  static const _monthsPt = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ];

  bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  int _level(int count, int maxTaken) {
    if (count == 0 || maxTaken <= 0) return 0;
    final r = count / maxTaken;
    if (r <= 0.34) return 1;
    if (r <= 0.67) return 2;
    if (r < 1) return 3;
    return 4;
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    // Tomas por dia (só registos com toma efectiva).
    final counts = <DateTime, int>{};
    var maxTaken = 0;
    for (final l in recent) {
      if (l.takenAt == null) continue;
      final d = DateTime(
          l.loggedDate.year, l.loggedDate.month, l.loggedDate.day);
      final v = (counts[d] ?? 0) + 1;
      counts[d] = v;
      if (v > maxTaken) maxTaken = v;
    }

    // Segunda-feira da semana actual; janela = últimas 12 semanas.
    final monday = today.subtract(Duration(days: today.weekday - 1));
    final start = monday.subtract(const Duration(days: 11 * 7));

    const weeks = 12;
    const dowLetters = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

    // Rótulos dos meses na 1.ª coluna de cada mês.
    final monthLabels = <int, String>{};
    var lastMonth = -1;
    for (var w = 0; w < weeks; w++) {
      final m = start.add(Duration(days: w * 7)).month;
      if (m != lastMonth) monthLabels[w] = _monthsPt[m - 1];
      lastMonth = m;
    }

    Color levelColor(int level) {
      switch (level) {
        case -1:
          return Colors.transparent; // dias futuros: fora da janela
        case 1:
          return AppColors.accent.withOpacity(0.25);
        case 2:
          return AppColors.accent.withOpacity(0.45);
        case 3:
          return AppColors.accent.withOpacity(0.70);
        case 4:
          return AppColors.accent;
        default:
          return Colors.white.withOpacity(0.05);
      }
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
                 Text(
            'MAPA DE ADESÃO · 12 SEMANAS',
            style: TextStyle(
              color: AppColors.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 12),
          // Rótulos dos meses, alinhados com as colunas.
          Padding(
            padding: const EdgeInsets.only(left: 17),
            child: Row(
              children: [
                for (var w = 0; w < weeks; w++)
                  SizedBox(
                    width: _cell + _gap,
                    child: (monthLabels[w] != null)
                        ? Text(
                            monthLabels[w]!,
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.35),
                              fontSize: 9,
                              fontWeight: FontWeight.w700,
                            ),
                          )
                        : null,
                  ),
              ],
            ),
          ),
          const SizedBox(height: 4),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Letras dos dias da semana (Seg → Dom).
              SizedBox(
                width: 12,
                child: Column(
                  children: [
                    for (var d = 0; d < 7; d++)
                      Container(
                        width: 12,
                        height: _cell,
                        margin: EdgeInsets.only(bottom: _gap),
                        alignment: Alignment.center,
                        child: Text(
                          dowLetters[d],
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.28),
                            fontSize: 8,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 5),
              // Grade: cada coluna é uma semana.
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (var w = 0; w < weeks; w++)
                    Column(
                      children: [
                        for (var d = 0; d < 7; d++)
                          Builder(
                            key: ValueKey('hm-$w-$d'),
                            builder: (context) {
                              final day = start
                                  .add(Duration(days: w * 7 + d));
                              final future = day.isAfter(today);
                              final count =
                                  future ? 0 : (counts[day] ?? 0);
                              final isToday = _sameDay(day, today);
                              return Container(
                                width: _cell,
                                height: _cell,
                                margin:
                                    EdgeInsets.only(bottom: _gap),
                                decoration: BoxDecoration(
                                  color: levelColor(
                                      future ? -1 : _level(count, maxTaken)),
                                  borderRadius: BorderRadius.circular(3.5),
                                  border: isToday
                                      ? Border.all(
                                          color: Colors.white
                                              .withOpacity(0.65),
                                          width: 1,
                                        )
                                      : null,
                                ),
                              );
                            },
                          ),
                      ],
                    ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Text(
                'Tomas registadas por dia',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.35),
                  fontSize: 10,
                ),
              ),
              const Spacer(),
              Text(
                'menos',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.28),
                  fontSize: 9,
                ),
              ),
              const SizedBox(width: 4),
              for (var i = 0; i <= 4; i++)
                Container(
                  width: 10,
                  height: 10,
                  margin: const EdgeInsets.only(left: 3),
                  decoration: BoxDecoration(
                    color: levelColor(i),
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              const SizedBox(width: 4),
              Text(
                'mais',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.28),
                  fontSize: 9,
                ),
              ),
            ],
          ),
          if (maxTaken == 0)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                'Sem tomas registadas nesta janela — marca a primeira '
                'toma para ver o mapa ganhar cor.',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.3),
                  fontSize: 10,
                ),
              ),
            ),
        ],
      ),
    ).animate().fadeIn(duration: 260.ms).slideY(
          begin: 0.06,
          curve: Curves.easeOutCubic,
        );
  }
}

/// Tendências por medicamento: nº de tomas registadas, consistência
/// (dias com toma ÷ dias desde o 1.º registo, máx. 84) e os últimos 14
/// dias em pontos. Métrica honesta — só registos reais; o plano histórico
/// pode ter sido diferente, por isso não acusamos falhas.
class _MedTrends extends StatelessWidget {
   const _MedTrends({required this.planned, required this.recent});

  final List<PlannedMedication> planned;
  final List<MedicationLog> recent;

  bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    final rows = <Widget>[];
    for (final med in planned) {
      final takenLogs = [
        for (final l in recent)
          if (l.prescriptionItemId == med.prescriptionItemId && l.isTaken) l,
      ];
      final days = <DateTime>{
        for (final l in takenLogs)
          DateTime(l.loggedDate.year, l.loggedDate.month, l.loggedDate.day),
      };
      final sorted = days.toList()..sort();
      final first = sorted.isEmpty ? null : sorted.first;
      final last = sorted.isEmpty ? null : sorted.last;

      var span = 1;
      if (first != null) {
        final raw = today.difference(first).inDays + 1;
        span = raw < 1 ? 1 : (raw > 84 ? 84 : raw);
      }
      final pct = first == null ? null : ((days.length / span) * 100).round();

      final pctColor = pct == null
          ? AppColors.textMuted
          : pct >= 80
              ? AppColors.success
              : pct >= 50
                  ? AppColors.warning
                  : AppColors.danger;

      final lastLabel = last == null
          ? 'sem registo ainda'
          : _sameDay(last, today)
              ? 'última toma: hoje'
              : 'última toma: '
                  '${last.day} ${_AdherenceHeatmap._monthsPt[last.month - 1]}';

      rows.add(Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: AppColors.glassFill,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        med.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style:        TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w700,
                          fontSize: 13.5,
                        ),
                      ),
                      if (med.dosage?.isNotEmpty == true ||
                          med.frequency?.isNotEmpty == true)
                        Text(
                          [
                            if (med.dosage?.isNotEmpty == true) med.dosage!,
                            if (med.frequency?.isNotEmpty == true)
                              med.frequency!,
                          ].join(' · '),
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.45),
                            fontSize: 11.5,
                          ),
                        ),
                    ],
                  ),
                ),
                if (pct != null) ...[
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '$pct%',
                        style: TextStyle(
                          color: pctColor,
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                        ),
                      ),
                      Text(
                        'consistência',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.35),
                          fontSize: 9,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
            const SizedBox(height: 6),
            Text(
              '${takenLogs.length} toma'
              '${takenLogs.length == 1 ? '' : 's'} '
              'registada${takenLogs.length == 1 ? '' : 's'} · $lastLabel',
              style: TextStyle(
                color: Colors.white.withOpacity(0.45),
                fontSize: 11,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                for (var i = 13; i >= 0; i--)
                  Expanded(
                    child: Builder(
                      key: ValueKey('trend-$i'),
                      builder: (context) {
                        final d = today.subtract(Duration(days: i));
                        final taken =
                            days.any((x) => _sameDay(x, d));
                        return Container(
                          height: 8,
                          margin: EdgeInsets.only(
                              right: i == 0 ? 0 : 3),
                          decoration: BoxDecoration(
                            color: taken
                                ? AppColors.success
                                    .withOpacity(0.85)
                                : Colors.white.withOpacity(0.05),
                            borderRadius:
                                BorderRadius.circular(4),
                            border: i == 0
                                ? Border.all(
                                    color: Colors.white
                                        .withOpacity(0.5),
                                    width: 1,
                                  )
                                : null,
                          ),
                        );
                      },
                    ),
                  ),
                const SizedBox(width: 4),
                Text(
                  '14 dias',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.3),
                    fontSize: 9,
                  ),
                ),
              ],
            ),
          ],
        ),
      ));
    }

    if (rows.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
               Text(
          'POR MEDICAMENTO',
          style: TextStyle(
            color: AppColors.textMuted,
            fontSize: 11,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 10),
        ...rows,
      ],
    ).animate().fadeIn(duration: 260.ms);
  }
}
