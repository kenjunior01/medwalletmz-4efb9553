import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/reminders/meds_reminder_service.dart';
import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/confetti_overlay.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../../core/widgets/skeleton.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../meds/data/meds_repository.dart';
import '../data/reminders_repository.dart';

/// Lembretes de medicação — linha do tempo do dia, controlo de
/// notificações locais (funciona offline) e gráfico de adesão 14 dias.
///
/// O plano vem das receitas activas (mesma fonte do ecrã Medicação);
/// as preferências (ligar/desligar, silenciar por medicamento) ficam no
/// dispositivo para que os lembretes sobrevivam a falhas de rede.
class RemindersScreen extends ConsumerStatefulWidget {
  const RemindersScreen({super.key});

  @override
  ConsumerState<RemindersScreen> createState() => _RemindersScreenState();
}

class _RemindersScreenState extends ConsumerState<RemindersScreen> {
  RemindersSnapshot? _snap;
  bool _loading = true;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<RemindersRepository> _repo() async {
    final prefs = await SharedPreferences.getInstance();
    return RemindersRepository(ref.read(supabaseClientProvider), prefs);
  }

  Future<void> _load() async {
    final repo = await _repo();
    final snap = await repo.load();
    if (!mounted) return;
    setState(() {
      _snap = snap;
      _loading = false;
    });
  }

  Future<void> _toggleMaster(bool value) async {
    final repo = await _repo();
    await repo.setMasterOn(value);
    // setEnabled devolve void — sem await (cancela tudo se desligado).
    MedsReminderService.instance.setEnabled(value);
    await _load();
  }

  Future<void> _toggleMute(String itemId, bool mute) async {
    final repo = await _repo();
    await repo.setMuted(itemId, mute);
    await _load();
  }

  Future<void> _askPermissions() async {
    await MedsReminderService.instance.requestPermissions();
    final repo = await _repo();
    await repo.markPermsAsked();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
      content: Text('Permissões de notificação pedidas ✓'),
      behavior: SnackBarBehavior.floating,
    ));
    await _load();
  }

  Future<void> _toggleTaken(PlannedMedication med, bool taken) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final repo = _medsRepo;
      if (taken) {
        await repo.togglePlanned(
          prescriptionItemId: med.prescriptionItemId,
          name: med.name,
          dosage: med.dosage,
          taken: true,
        );
      } else {
        await repo.togglePlanned(
          prescriptionItemId: med.prescriptionItemId,
          name: med.name,
          dosage: med.dosage,
          taken: false,
        );
      }
      await _load();
      if (!mounted) return;
      // Celebração: plano do dia completo.
      final snap = _snap;
      if (taken && snap != null && snap.planned.isNotEmpty) {
        final map = snap.todayByItem;
        final allDone = snap.planned
            .where((m) => !snap.muted.contains(m.prescriptionItemId))
            .every((m) => map[m.prescriptionItemId]?.isTaken ?? false);
        if (allDone) {
          showConfetti(context, message: 'Plano do dia completo! 🎉');
        }
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  MedsRepository get _medsRepo =>
      MedsRepository(ref.read(supabaseClientProvider));

  @override
  Widget build(BuildContext context) {
    final snap = _snap;
    return AppBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          title: const Text('Lembretes 💊'),
        ),
        body: _loading
            ? ListView(
                padding: const EdgeInsets.all(16),
                children: const [
                  AppSkeleton(height: 96),
                  SizedBox(height: 12),
                  AppSkeleton(height: 120),
                  SizedBox(height: 12),
                  AppSkeleton(height: 220),
                ],
              )
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
                  children: [
                    _MasterToggle(
                      on: snap?.masterOn ?? true,
                      onChanged: _toggleMaster,
                      permsAsked: snap?.permsAsked ?? false,
                      onAsk: _askPermissions,
                    ).animate().fadeIn(duration: 280.ms),
                    const SizedBox(height: 12),
                    _NextDoseHero(snap: snap)
                        .animate(delay: 60.ms)
                        .fadeIn(duration: 300.ms)
                        .slideY(begin: 0.08),
                    const SizedBox(height: 12),
                    if (snap != null && snap.planned.isNotEmpty) ...[
                      _AdherenceCard(snap: snap)
                          .animate(delay: 100.ms)
                          .fadeIn(duration: 300.ms),
                      const SizedBox(height: 12),
                    ],
                    if (snap == null || snap.planned.isEmpty)
                      const _EmptyPlan()
                    else
                      _Timeline(
                        snap: snap,
                        busy: _busy,
                        onToggle: _toggleTaken,
                        onMute: _toggleMute,
                      ).animate(delay: 140.ms).fadeIn(duration: 300.ms),
                    if (snap != null && snap.muted.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      _MutedList(snap: snap, onUnmute: _toggleMute),
                    ],
                  ],
                ),
              ),
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════════
// Componentes
// ════════════════════════════════════════════════════════════════════

class _MasterToggle extends StatelessWidget {
  const _MasterToggle({
    required this.on,
    required this.onChanged,
    required this.permsAsked,
    required this.onAsk,
  });

  final bool on;
  final ValueChanged<bool> onChanged;
  final bool permsAsked;
  final VoidCallback onAsk;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 6, 8, 6),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.accent.withOpacity(0.14),
              border: Border.all(color: AppColors.accent.withOpacity(0.35)),
            ),
            child: Icon(
              on ? Icons.notifications_active_rounded : Icons.notifications_off_rounded,
              color: on ? AppColors.accent : AppColors.textMuted,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Lembretes activos',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 14.5,
                  ),
                ),
                Text(
                  'Avisos no telemóvel, mesmo sem internet',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.55),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          Switch.adaptive(
            value: on,
            activeColor: AppColors.accent,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }
}

class _NextDoseHero extends StatelessWidget {
  const _NextDoseHero({required this.snap});

  final RemindersSnapshot? snap;

  @override
  Widget build(BuildContext context) {
    final s = snap;
    if (s == null || s.enabledMeds.isEmpty) return const SizedBox.shrink();

    final takenByItem = s.todayByItem;
    final now = DateTime.now();
    ({PlannedMedication med, DateTime time})? best;
    for (final m in s.enabledMeds) {
      if (takenByItem[m.prescriptionItemId]?.isTaken ?? false) continue;
      final hours =
          [...MedsReminderService.hoursForFrequency(m.frequency)]..sort();
      for (final h in hours) {
        var t = DateTime(now.year, now.month, now.day, h);
        if (t.isBefore(now)) t = t.add(const Duration(days: 1));
        if (best == null || t.isBefore(best!.time)) best = (med: m, time: t);
      }
    }

    // Plano completo?
    if (best == null) {
      final allTaken = s.planned
          .where((m) => !s.muted.contains(m.prescriptionItemId))
          .every((m) => takenByItem[m.prescriptionItemId]?.isTaken ?? false);
      final any = s.planned.isNotEmpty;
      if (any && allTaken) {
        return _heroShell(
          icon: Icons.verified_rounded,
          tint: AppColors.success,
          label: 'Plano do dia completo!',
          value: 'Excelente adesão. Continua assim 💪',
        );
      }
      return const SizedBox.shrink();
    }

    final t = best!.time;
    final hh = t.hour.toString().padLeft(2, '0');
    final mm = t.minute.toString().padLeft(2, '0');
    final diff = t.difference(now);
    final countdown = diff.isNegative
        ? 'agora'
        : diff.inHours > 0
            ? 'em ${diff.inHours}h'
            : 'em ${diff.inMinutes}min';

    return _heroShell(
      icon: Icons.alarm_rounded,
      tint: AppColors.accent,
      label: 'Próxima dose $countdown',
      value:
          '${best.med.name}${best.med.dosage != null && best.med.dosage!.isNotEmpty ? ' · ${best.med.dosage}' : ''} · $hh:$mm',
    );
  }

  Widget _heroShell({
    required IconData icon,
    required Color tint,
    required String label,
    required String value,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [tint.withOpacity(0.22), tint.withOpacity(0.06)],
        ),
        border: Border.all(color: tint.withOpacity(0.35)),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: tint.withOpacity(0.18),
              border: Border.all(color: tint.withOpacity(0.4)),
            ),
            child: Icon(icon, color: tint, size: 26),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.65),
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.4,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  value,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 15.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AdherenceCard extends StatelessWidget {
  const _AdherenceCard({required this.snap});

  final RemindersSnapshot snap;

  @override
  Widget build(BuildContext context) {
    final history = snap.adherenceHistory();
    final streak = MedsRepository.computeStreak(snap.recent);
    final weekAvg = history.length >= 7
        ? (history.skip(7).map((h) => h.percent).reduce((a, b) => a + b) / 7)
            .round()
        : 0;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text(
                'Adesão · últimos 14 dias',
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                ),
              ),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  color: AppColors.warning.withOpacity(0.15),
                  border:
                      Border.all(color: AppColors.warning.withOpacity(0.4)),
                ),
                child: Text(
                  '🔥 $streak dia${streak == 1 ? '' : 's'}',
                  style: const TextStyle(
                    color: AppColors.warning,
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            height: 84,
            child: CustomPaint(
              size: Size.infinite,
              painter: _AdherencePainter(history: history),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Text(
                'Última semana: ',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.5),
                  fontSize: 12,
                ),
              ),
              Text(
                '$weekAvg%',
                style: TextStyle(
                  color: weekAvg >= 80
                      ? AppColors.success
                      : weekAvg >= 50
                          ? AppColors.warning
                          : AppColors.danger,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const Spacer(),
              const Text(
                'meta: 100% todos os dias',
                style: TextStyle(color: AppColors.textMuted, fontSize: 11.5),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _AdherencePainter extends CustomPainter {
  const _AdherencePainter({required this.history});

  final List<({String day, int percent})> history;

  @override
  void paint(Canvas canvas, Size size) {
    if (history.isEmpty) return;
    final n = history.length;
    final gap = 4.0;
    final barW = (size.width - gap * (n - 1)) / n;
    final paint = Paint()..style = PaintingStyle.fill;

    for (var i = 0; i < n; i++) {
      final p = history[i].percent / 100;
      final h = (size.height - 6) * p;
      final isToday = i == n - 1;
      final x = i * (barW + gap);

      // trilho base
      paint.color = Colors.white.withOpacity(0.06);
      paint.shader = null;
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(x, 0, barW, size.height - 6),
          Radius.circular(barW * 0.35),
        ),
        paint,
      );

      if (p <= 0) continue;
      paint.shader = LinearGradient(
        begin: Alignment.bottomCenter,
        end: Alignment.topCenter,
        colors: isToday
            ? [AppColors.accent, AppColors.teal]
            : (p >= 0.99
                ? [AppColors.success, AppColors.success.withOpacity(0.7)]
                : [AppColors.primary, AppColors.primary.withOpacity(0.6)]),
      ).createShader(Rect.fromLTWH(x, size.height - 6 - h, barW, h));
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(x, size.height - 6 - h, barW, h),
          Radius.circular(barW * 0.35),
        ),
        paint,
      );
      paint.shader = null;
    }
  }

  @override
  bool shouldRepaint(_AdherencePainter old) => true;
}

class _Timeline extends StatelessWidget {
  const _Timeline({
    required this.snap,
    required this.busy,
    required this.onToggle,
    required this.onMute,
  });

  final RemindersSnapshot snap;
  final bool busy;
  final void Function(PlannedMedication med, bool taken) onToggle;
  final void Function(String itemId, bool mute) onMute;

  @override
  Widget build(BuildContext context) {
    final takenByItem = snap.todayByItem;
    final now = DateTime.now();

    // Slots (medicamento × hora) ordenados pela hora.
    final slots = <({PlannedMedication med, int hour})>[
      for (final m in snap.enabledMeds)
        for (final h in MedsReminderService.hoursForFrequency(m.frequency))
          (med: m, hour: h),
    ]..sort((a, b) => a.hour.compareTo(b.hour));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            'Horário de hoje',
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
          ),
        ),
        for (final s in slots)
          _SlotRow(
            med: s.med,
            hour: s.hour,
            log: takenByItem[s.med.prescriptionItemId],
            isNext: _isNext(s, slots, now, takenByItem),
            busy: busy,
            onToggle: onToggle,
            onMute: onMute,
          ),
      ],
    );
  }

  bool _isNext(
    ({PlannedMedication med, int hour}) slot,
    List<({PlannedMedication med, int hour})> slots,
    DateTime now,
    Map<String, MedicationLog> takenByItem,
  ) {
    if (takenByItem[slot.med.prescriptionItemId]?.isTaken ?? false) {
      return false;
    }
    final upcomingHours = [
      for (final s in slots)
        if (takenByItem[s.med.prescriptionItemId]?.isTaken != true &&
            s.hour >= now.hour)
          s.hour,
    ]..sort();
    return upcomingHours.isNotEmpty && slot.hour == upcomingHours.first;
  }
}

class _SlotRow extends StatelessWidget {
  const _SlotRow({
    required this.med,
    required this.hour,
    required this.log,
    required this.isNext,
    required this.busy,
    required this.onToggle,
    required this.onMute,
  });

  final PlannedMedication med;
  final int hour;
  final MedicationLog? log;
  final bool isNext;
  final bool busy;
  final void Function(PlannedMedication med, bool taken) onToggle;
  final void Function(String itemId, bool mute) onMute;

  @override
  Widget build(BuildContext context) {
    final taken = log?.isTaken ?? false;
    final skipped = log?.skipped ?? false;
    final hh = hour.toString().padLeft(2, '0');

    return GestureDetector(
      onTap: busy ? null : () => onToggle(med, !taken),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: taken
              ? AppColors.success.withOpacity(0.08)
              : isNext
                  ? AppColors.accent.withOpacity(0.10)
                  : AppColors.glassFill,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: taken
                ? AppColors.success.withOpacity(0.35)
                : isNext
                    ? AppColors.accent.withOpacity(0.4)
                    : AppColors.glassBorder,
          ),
        ),
        child: Row(
          children: [
            // Hora
            Container(
              width: 52,
              padding: const EdgeInsets.symmetric(vertical: 6),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                color: taken
                    ? AppColors.success.withOpacity(0.14)
                    : isNext
                        ? AppColors.accent.withOpacity(0.16)
                        : Colors.white.withOpacity(0.05),
              ),
              child: Text(
                '$hh:00',
                style: TextStyle(
                  color: taken
                      ? AppColors.success
                      : isNext
                          ? AppColors.accent
                          : AppColors.textSecondary,
                  fontWeight: FontWeight.w800,
                  fontSize: 12.5,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    med.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: taken
                          ? Colors.white.withOpacity(0.55)
                          : AppColors.textPrimary,
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      decoration:
                          taken ? TextDecoration.lineThrough : null,
                    ),
                  ),
                  if (med.dosage != null && med.dosage!.isNotEmpty)
                    Text(
                      med.dosage!,
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.45),
                        fontSize: 12,
                      ),
                    ),
                ],
              ),
            ),
            if (isNext)
              Container(
                margin: const EdgeInsets.only(right: 8),
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(10),
                  color: AppColors.accent.withOpacity(0.18),
                ),
                child: const Text(
                  'próxima',
                  style: TextStyle(
                    color: AppColors.accent,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            // Silenciar este medicamento
            IconButton(
              tooltip: 'Silenciar lembretes deste medicamento',
              onPressed: busy
                  ? null
                  : () => onMute(med.prescriptionItemId, true),
              icon: Icon(
                Icons.volume_off_rounded,
                size: 20,
                color: Colors.white.withOpacity(0.35),
              ),
            ),
            // Estado
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: taken
                    ? AppColors.success.withOpacity(0.2)
                    : skipped
                        ? AppColors.danger.withOpacity(0.15)
                        : Colors.white.withOpacity(0.06),
                border: Border.all(
                  color: taken
                      ? AppColors.success
                      : skipped
                          ? AppColors.danger.withOpacity(0.6)
                          : Colors.white.withOpacity(0.25),
                ),
              ),
              child: Icon(
                taken
                    ? Icons.check_rounded
                    : skipped
                        ? Icons.close_rounded
                        : Icons.radio_button_unchecked_rounded,
                color: taken
                    ? AppColors.success
                    : skipped
                        ? AppColors.danger
                        : Colors.white.withOpacity(0.5),
                size: 19,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MutedList extends StatelessWidget {
  const _MutedList({required this.snap, required this.onUnmute});

  final RemindersSnapshot snap;
  final void Function(String itemId, bool mute) onUnmute;

  @override
  Widget build(BuildContext context) {
    final mutedMeds = [
      for (final m in snap.planned)
        if (snap.muted.contains(m.prescriptionItemId)) m,
    ];
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Silenciados',
            style: TextStyle(
              color: AppColors.textMuted,
              fontSize: 12,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 8),
          for (final m in mutedMeds)
            ListTile(
              dense: true,
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.volume_off_rounded,
                  color: AppColors.textMuted, size: 20),
              title: Text(
                m.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    color: AppColors.textSecondary, fontSize: 13.5),
              ),
              trailing: TextButton(
                onPressed: () => onUnmute(m.prescriptionItemId, false),
                child: const Text('Reactivar',
                    style: TextStyle(color: AppColors.accent, fontSize: 12.5)),
              ),
            ),
        ],
      ),
    );
  }
}

class _EmptyPlan extends StatelessWidget {
  const _EmptyPlan();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.accent.withOpacity(0.12),
              border: Border.all(color: AppColors.accent.withOpacity(0.3)),
            ),
            child: const Icon(Icons.medication_rounded,
                color: AppColors.accent, size: 30),
          ),
          const SizedBox(height: 14),
          const Text(
            'Sem plano de medicação activo',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 15.5,
              fontWeight: FontWeight.w800,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          const Text(
            'Quando tiveres receitas activas (últimos 60 dias), os '
            'lembretes aparecem aqui automaticamente — com notificações '
            'no telemóvel, mesmo offline.',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          GradientButton(
            label: 'Gerir medicação',
            icon: Icons.medication_rounded,
            height: 48,
            onPressed: () => context.push('/meds'),
          ),
        ],
      ),
    );
  }
}
