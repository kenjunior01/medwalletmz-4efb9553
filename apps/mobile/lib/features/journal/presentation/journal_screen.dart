import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/journal_repository.dart';

/// Diário de Saúde — paridade com `pages/health/HealthJournal.tsx`:
/// check-in diário (humor, energia, sono, dor, sintomas, notas, gratidão),
/// streak de dias e histórico de duas semanas.
class JournalScreen extends ConsumerStatefulWidget {
  const JournalScreen({super.key});

  @override
  ConsumerState<JournalScreen> createState() => _JournalScreenState();
}

class _JournalScreenState extends ConsumerState<JournalScreen> {
  bool _loading = true;
  JournalEntry? _today;
  List<JournalEntry> _history = const [];
  int _streak = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final repo = ref.read(journalRepositoryProvider);
    final today = await repo.fetchToday();
    final history = await repo.fetchRecent();
    if (!mounted) return;
    setState(() {
      _today = today;
      _history = history;
      _streak = repo.computeStreak(history);
      _loading = false;
    });
  }

  Future<void> _openCheckIn() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _CheckInSheet(existing: _today),
    );
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: RefreshIndicator(
            color: AppColors.accent,
            onRefresh: _load,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 40),
              children: [
                Row(
                  children: [
                    _IconBtn(
                        icon: Icons.arrow_back_rounded,
                        onTap: () => context.pop()),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'Diário de Saúde',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 21,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    if (_streak > 0)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 7),
                        decoration: BoxDecoration(
                          color: AppColors.warning.withOpacity(0.16),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                              color: AppColors.warning.withOpacity(0.4)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.local_fire_department_rounded,
                                size: 15, color: AppColors.warning),
                            const SizedBox(width: 4),
                            Text(
                              '$_streak dias',
                              style: const TextStyle(
                                color: AppColors.warning,
                                fontWeight: FontWeight.w900,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 14),
                if (_loading)
                  const Column(
                    children: [
                      AppSkeleton(height: 130),
                      SizedBox(height: 12),
                      AppSkeleton(height: 90),
                      SizedBox(height: 12),
                      AppSkeleton(height: 220),
                    ],
                  )
                else ...[
                  _TodayCard(
                    entry: _today,
                    onCheckIn: _openCheckIn,
                  ),
                  const SizedBox(height: 16),
                  if (_today?.aiInsight != null &&
                      _today!.aiInsight!.isNotEmpty) ...[
                    _AiInsightCard(insight: _today!.aiInsight!),
                    const SizedBox(height: 16),
                  ],
                  const Text(
                    'Últimos 14 dias',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 10),
                  if (_history.isEmpty)
                    const EmptyState(
                      icon: Icons.auto_stories_rounded,
                      title: 'Diário vazio',
                      message:
                          'Faz o teu primeiro check-in e acompanha o teu bem-estar dia após dia.',
                    )
                  else
                    ...[
                      for (final e in _history) _HistoryTile(entry: e),
                    ],
                ],
              ],
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCheckIn,
        backgroundColor: AppColors.accent,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.edit_note_rounded),
        label: const Text('Check-in de hoje',
            style: TextStyle(fontWeight: FontWeight.w800)),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Widgets
// ═══════════════════════════════════════════════════════════════════════════

const _moodEmojis = ['😞', '🙁', '😐', '🙂', '😄'];

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

class _TodayCard extends StatelessWidget {
  const _TodayCard({required this.entry, required this.onCheckIn});
  final JournalEntry? entry;
  final VoidCallback onCheckIn;

  @override
  Widget build(BuildContext context) {
    final filled = entry?.isFilled ?? false;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.accent.withOpacity(0.22),
            AppColors.primary.withOpacity(0.12),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.accent.withOpacity(0.25)),
      ),
      child: Row(
        children: [
          Text(
            filled ? _moodEmojis[(entry!.mood ?? 3) - 1] : '🗓️',
            style: const TextStyle(fontSize: 34),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  filled ? 'Já fizeste o check-in!' : 'Como te sentes hoje?',
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w900,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  filled
                      ? 'Toca para editar a entrada de hoje.'
                      : 'Regista o teu bem-estar em menos de 1 minuto.',
                  style: const TextStyle(
                      color: AppColors.textSecondary, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          FilledButton(
            onPressed: onCheckIn,
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.accent,
              foregroundColor: Colors.white,
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
            child: Text(filled ? 'Editar' : 'Começar',
                style:
                    const TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
          ),
        ],
      ),
    );
  }
}

class _AiInsightCard extends StatelessWidget {
  const _AiInsightCard({required this.insight});
  final String insight;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.warning.withOpacity(0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.auto_awesome_rounded,
                  size: 16, color: AppColors.warning),
              SizedBox(width: 8),
              Text(
                'Insight da semana',
                style: TextStyle(
                  color: AppColors.warning,
                  fontWeight: FontWeight.w900,
                  fontSize: 13,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            insight,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 12.5,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _HistoryTile extends StatelessWidget {
  const _HistoryTile({required this.entry});
  final JournalEntry entry;

  @override
  Widget build(BuildContext context) {
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
          Text(
            entry.mood != null ? _moodEmojis[entry.mood! - 1] : '·',
            style: const TextStyle(fontSize: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  formatRelative(entry.entryDate),
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 12.5,
                  ),
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    if (entry.sleepHours != null) ...[
                      const Icon(Icons.bedtime_rounded,
                          size: 12, color: AppColors.textMuted),
                      const SizedBox(width: 3),
                      Text(
                        '${entry.sleepHours!.toStringAsFixed(entry.sleepHours! == entry.sleepHours!.roundToDouble() ? 0 : 1)}h',
                        style: const TextStyle(
                            color: AppColors.textSecondary, fontSize: 11),
                      ),
                      const SizedBox(width: 10),
                    ],
                    if (entry.painLevel != null && entry.painLevel! > 0) ...[
                      const Icon(Icons.healing_rounded,
                          size: 12, color: AppColors.danger),
                      const SizedBox(width: 3),
                      Text(
                        'dor ${entry.painLevel}/10',
                        style: const TextStyle(
                            color: AppColors.textSecondary, fontSize: 11),
                      ),
                      const SizedBox(width: 10),
                    ],
                    if (entry.symptoms.isNotEmpty)
                      Flexible(
                        child: Text(
                          entry.symptoms.take(2).join(', '),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              color: AppColors.textMuted, fontSize: 11),
                        ),
                      ),
                  ],
                ),
                if (entry.notes != null && entry.notes!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    entry.notes!,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        color: AppColors.textSecondary, fontSize: 11.5),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Folha de check-in ──────────────────────────────────────────────────────

class _CheckInSheet extends ConsumerStatefulWidget {
  const _CheckInSheet({required this.existing});
  final JournalEntry? existing;

  @override
  ConsumerState<_CheckInSheet> createState() => _CheckInSheetState();
}

class _CheckInSheetState extends ConsumerState<_CheckInSheet> {
  late int _mood = widget.existing?.mood ?? 3;
  late int _energy = widget.existing?.energy ?? 3;
  late int _sleepQuality = widget.existing?.sleepQuality ?? 3;
  late int _pain = widget.existing?.painLevel ?? 0;
  late double _sleepHours = widget.existing?.sleepHours ?? 7;
  late List<String> _symptoms = List.of(widget.existing?.symptoms ?? const []);
  late final _notes = TextEditingController(text: widget.existing?.notes ?? '');
  late final _gratitude =
      TextEditingController(text: widget.existing?.gratitude ?? '');
  bool _saving = false;

  static const _commonSymptoms = [
    'dor de cabeça', 'fadiga', 'febre', 'tosse', 'garganta',
    'náusea', 'tontura', 'ansiedade', 'insónia', 'coriza',
  ];

  @override
  void dispose() {
    _notes.dispose();
    _gratitude.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    final err = await ref.read(journalRepositoryProvider).upsertToday(
          mood: _mood,
          energy: _energy,
          sleepHours: _sleepHours,
          sleepQuality: _sleepQuality,
          painLevel: _pain,
          symptoms: _symptoms,
          notes: _notes.text.trim(),
          gratitude: _gratitude.text.trim(),
        );
    if (!mounted) return;
    setState(() => _saving = false);
    if (err == null) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Check-in guardado. Um dia de cada vez!'),
        backgroundColor: AppColors.success,
      ));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(err),
        backgroundColor: AppColors.warning,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding:
          EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.9),
        decoration: const BoxDecoration(
          color: AppColors.bgHigh,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                'Check-in de hoje',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w900,
                  fontSize: 17,
                ),
              ),
              const SizedBox(height: 16),

              // Humor
              const _Label('Como te sentes?'),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  for (var i = 1; i <= 5; i++)
                    GestureDetector(
                      onTap: () => setState(() => _mood = i),
                      child: Container(
                        width: 52,
                        height: 52,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: _mood == i
                              ? AppColors.accent.withOpacity(0.25)
                              : AppColors.glassFill,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: _mood == i
                                ? AppColors.accent
                                : AppColors.glassBorder,
                          ),
                        ),
                        child: Text(_moodEmojis[i - 1],
                            style: const TextStyle(fontSize: 24)),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 16),

              // Energia
              _SliderSection(
                label: 'Nível de energia',
                value: _energy.toDouble(),
                max: 5,
                display: '$_energy/5',
                onChanged: (v) => setState(() => _energy = v.round()),
              ),

              // Sono
              _SliderSection(
                label: 'Horas de sono',
                value: _sleepHours,
                max: 12,
                display:
                    '${_sleepHours.toStringAsFixed(_sleepHours == _sleepHours.roundToDouble() ? 0 : 1)}h',
                divisions: 24,
                onChanged: (v) =>
                    setState(() => _sleepHours = (v / 2).round() / 2),
              ),

              // Qualidade do sono
              _SliderSection(
                label: 'Qualidade do sono',
                value: _sleepQuality.toDouble(),
                max: 5,
                display: '$_sleepQuality/5',
                onChanged: (v) =>
                    setState(() => _sleepQuality = v.round()),
              ),

              // Dor
              _SliderSection(
                label: 'Nível de dor',
                value: _pain.toDouble(),
                max: 10,
                display: _pain == 0 ? 'Sem dor' : '$_pain/10',
                accent: AppColors.danger,
                onChanged: (v) => setState(() => _pain = v.round()),
              ),

              const SizedBox(height: 14),
              const _Label('Sintomas de hoje'),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final s in _commonSymptoms)
                    FilterChip(
                      label: Text(s),
                      selected: _symptoms.contains(s),
                      selectedColor: AppColors.accent.withOpacity(0.28),
                      checkmarkColor: Colors.white,
                      labelStyle: TextStyle(
                        fontSize: 11.5,
                        color: _symptoms.contains(s)
                            ? Colors.white
                            : AppColors.textSecondary,
                      ),
                      side: BorderSide(
                        color: _symptoms.contains(s)
                            ? AppColors.accent
                            : AppColors.glassBorder,
                      ),
                      onSelected: (sel) => setState(() {
                        if (sel) {
                          _symptoms.add(s);
                        } else {
                          _symptoms.remove(s);
                        }
                      }),
                    ),
                ],
              ),
              const SizedBox(height: 14),
              const _Label('Notas'),
              const SizedBox(height: 8),
              _SheetField(
                  controller: _notes, hint: 'Como foi o teu dia?', maxLines: 3),
              const SizedBox(height: 12),
              const _Label('Gratidão'),
              const SizedBox(height: 8),
              _SheetField(
                  controller: _gratitude,
                  hint: 'Pelo que estás grato hoje?',
                  maxLines: 2),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _saving ? null : _save,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.accent,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _saving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Text('Guardar check-in',
                          style: TextStyle(fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Label extends StatelessWidget {
  const _Label(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        color: AppColors.textSecondary,
        fontSize: 12,
        fontWeight: FontWeight.w800,
      ),
    );
  }
}

class _SliderSection extends StatelessWidget {
  const _SliderSection({
    required this.label,
    required this.value,
    required this.max,
    required this.display,
    required this.onChanged,
    this.divisions,
    this.accent = AppColors.accent,
  });

  final String label;
  final double value;
  final double max;
  final String display;
  final ValueChanged<double> onChanged;
  final int? divisions;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(label, style: const _LabelStyle()),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: accent.withOpacity(0.16),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  display,
                  style: TextStyle(
                    color: accent,
                    fontWeight: FontWeight.w900,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              activeTrackColor: accent,
              inactiveTrackColor: Colors.white.withOpacity(0.1),
              thumbColor: accent,
              overlayColor: accent.withOpacity(0.15),
              trackHeight: 4,
            ),
            child: Slider(
              value: value,
              max: max,
              divisions: divisions ?? max.round(),
              onChanged: onChanged,
            ),
          ),
        ],
      ),
    );
  }
}

class _LabelStyle extends TextStyle {
  const _LabelStyle()
      : super(
          color: AppColors.textSecondary,
          fontSize: 12,
          fontWeight: FontWeight.w800,
        );
}

class _SheetField extends StatelessWidget {
  const _SheetField({
    required this.controller,
    required this.hint,
    this.maxLines = 1,
    this.keyboard,
  });

  final TextEditingController controller;
  final String hint;
  final int maxLines;
  final TextInputType? keyboard;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
      keyboardType: keyboard,
      style: const TextStyle(color: AppColors.textPrimary, fontSize: 13.5),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 13),
        filled: true,
        fillColor: AppColors.glassFill,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.glassBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.accent),
        ),
      ),
    );
  }
}
