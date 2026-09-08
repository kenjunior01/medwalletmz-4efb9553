import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/manager_models.dart';
import 'manager_controller.dart';
import 'manager_widgets.dart';

// ═══════════════════════════════════════════════════════════════════
// KPIs — indicadores com target e edição (admin/CEO/regional)
// ═══════════════════════════════════════════════════════════════════

const kpiCatalog = <(String, String, String)>[
  // (chave, rótulo, unidade)
  ('active_users', 'Utilizadores activos', 'count'),
  ('revenue_mtd', 'Receita do mês', 'currency'),
  ('partners_onboarded', 'Parceiros integrados', 'count'),
  ('consultations_booked', 'Consultas marcadas', 'count'),
  ('prescriptions_filled', 'Receitas emitidas', 'count'),
];

class KpisPanel extends ConsumerStatefulWidget {
  const KpisPanel({super.key, required this.countryId});

  final String countryId;

  @override
  ConsumerState<KpisPanel> createState() => _KpisPanelState();
}

class _KpisPanelState extends ConsumerState<KpisPanel> {
  List<RegionalKpi>? _rows;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final rows = await ref
        .read(managerRepositoryProvider)
        .fetchKpis(widget.countryId);
    if (!mounted) return;
    setState(() => _rows = rows);
  }

  Future<void> _addKpi() async {
    final valueCtrl = TextEditingController();
    final targetCtrl = TextEditingController();
    String selectedKey = kpiCatalog.first.$1;
    String unit = kpiCatalog.first.$3;

    final ok = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => Container(
          padding: EdgeInsets.fromLTRB(
              22, 18, 22, MediaQuery.of(ctx).viewInsets.bottom + 20),
          decoration: const BoxDecoration(
            gradient: LinearGradient(
                colors: [AppColors.bgHigh, AppColors.bgDeep]),
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Actualizar KPI',
                style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 17,
                    fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 4),
              Text(
                'Regista o valor actual do indicador para este mês — '
                'fica visível nos painéis de desempenho.',
                style: TextStyle(
                    color: Colors.white.withOpacity(0.55), fontSize: 12.5),
              ),
              const SizedBox(height: 14),
              DropdownButtonFormField<String>(
                value: selectedKey,
                dropdownColor: AppColors.bgHigh,
                style: const TextStyle(
                    color: AppColors.textPrimary, fontSize: 13.5),
                decoration:
                    const InputDecoration(labelText: 'Indicador'),
                items: [
                  for (final (k, label, u) in kpiCatalog)
                    DropdownMenuItem(
                        value: k,
                        child: Text(
                            '$label (${u == 'currency' ? 'moeda' : u})')),
                ],
                onChanged: (v) {
                  if (v == null) return;
                  setSheet(() {
                    selectedKey = v;
                    unit = kpiCatalog
                        .firstWhere((e) => e.$1 == v)
                        .$3;
                  });
                },
              ),
              const SizedBox(height: 12),
              TextField(
                controller: valueCtrl,
                keyboardType: TextInputType.number,
                style: const TextStyle(color: AppColors.textPrimary),
                decoration: const InputDecoration(
                    labelText: 'Valor actual'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: targetCtrl,
                keyboardType: TextInputType.number,
                style: const TextStyle(color: AppColors.textPrimary),
                decoration: const InputDecoration(
                    labelText: 'Meta (opcional)'),
              ),
              const SizedBox(height: 16),
              GradientButton(
                label: 'Guardar KPI',
                icon: Icons.save_rounded,
                onPressed: () => Navigator.of(ctx).pop(true),
              ),
            ],
          ),
        ),
      ),
    );
    if (ok != true) return;

    final value = double.tryParse(valueCtrl.text.replaceAll(',', '.'));
    if (value == null) return;
    final target = double.tryParse(targetCtrl.text.replaceAll(',', '.'));

    setState(() => _busy = true);
    try {
      final now = DateTime.now();
      await ref.read(managerRepositoryProvider).upsertKpi(
            countryCode: widget.countryId,
            kpiKey: selectedKey,
            value: value,
            unit: unit,
            periodStart: DateTime(now.year, now.month, 1),
            periodEnd: DateTime(now.year, now.month + 1, 0),
            target: target,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          backgroundColor: AppColors.success,
          content: const Text('KPI actualizado.'),
        ));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          backgroundColor: AppColors.danger,
          content: Text(
              'Sem permissão para escrever KPIs (admin/CEO/regional).'),
        ));
      }
    }
    if (mounted) setState(() => _busy = false);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final rows = _rows;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionTitle(
          'KPIs do país',
          subtitle:
              'Indicadores de desempenho registados por período. '
              'Actualiza mensalmente para acompanhar a trajectória.',
        ),
        Row(
          children: [
            const Spacer(),
            GradientButton(
              label: _busy ? 'A guardar…' : 'Actualizar KPI',
              icon: Icons.add_chart_rounded,
              height: 42,
              onPressed: _busy ? null : _addKpi,
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (rows == null)
          const ListSkeleton(count: 3, itemHeight: 90)
        else if (rows.isEmpty)
          const EmptyState(
            icon: Icons.monitoring_rounded,
            title: 'Sem KPIs',
            message:
                'Ainda não há indicadores registados para este país. '
                'Começa pelos utilizadores activos e receita do mês.',
          )
        else
          for (final k in rows.take(20)) _KpiCard(k: k),
      ],
    );
  }
}

class _KpiCard extends StatelessWidget {
  const _KpiCard({required this.k});

  final RegionalKpi k;

  String get _label {
    for (final (key, label, _) in kpiCatalog) {
      if (key == k.kpiKey) return label;
    }
    return k.kpiKey;
  }

  String get _formatted {
    if (k.kpiUnit == 'currency') {
      return k.kpiValue.toStringAsFixed(0);
    }
    if (k.kpiUnit == 'percentage') {
      return '${k.kpiValue.toStringAsFixed(1)}%';
    }
    return k.kpiValue.round().toString();
  }

  @override
  Widget build(BuildContext context) {
    final delta = (k.previousValue != null && k.previousValue! != 0)
        ? (k.kpiValue - k.previousValue!) / k.previousValue! * 100
        : null;
    final up = delta != null && delta >= 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  _label,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 13.5,
                  ),
                ),
              ),
              if (delta != null)
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: (up ? AppColors.success : AppColors.danger)
                        .withOpacity(0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '${up ? '▲' : '▼'} ${delta.abs().toStringAsFixed(1)}%',
                    style: TextStyle(
                      color: up ? AppColors.success : AppColors.danger,
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                _formatted,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w800,
                  fontSize: 21,
                ),
              ),
              const Spacer(),
              if (k.targetValue != null)
                Text(
                  'meta ${k.targetValue!.toStringAsFixed(0)}',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.45),
                    fontSize: 11.5,
                  ),
                ),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 180.ms);
  }
}

// ═══════════════════════════════════════════════════════════════════
// Metas trimestrais com progresso
// ═══════════════════════════════════════════════════════════════════

class GoalsPanel extends ConsumerStatefulWidget {
  const GoalsPanel({super.key, required this.countryId});

  final String countryId;

  @override
  ConsumerState<GoalsPanel> createState() => _GoalsPanelState();
}

class _GoalsPanelState extends ConsumerState<GoalsPanel> {
  List<RegionalGoal>? _rows;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final rows = await ref
        .read(managerRepositoryProvider)
        .fetchGoals(widget.countryId);
    if (!mounted) return;
    setState(() => _rows = rows);
  }

  Future<void> _addGoal() async {
    final quarterCtrl = TextEditingController(
        text: '2026-Q${(DateTime.now().month - 1) ~/ 3 + 1}');
    final keyCtrl = TextEditingController();
    final valueCtrl = TextEditingController();

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
              'Definir meta trimestral',
              style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 17,
                  fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: quarterCtrl,
              style: const TextStyle(color: AppColors.textPrimary),
              decoration:
                  const InputDecoration(labelText: 'Trimestre (2026-Q3)'),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: 'users_target',
              dropdownColor: AppColors.bgHigh,
              style: const TextStyle(
                  color: AppColors.textPrimary, fontSize: 13.5),
              decoration: const InputDecoration(labelText: 'Tipo de meta'),
              items: const [
                DropdownMenuItem(
                    value: 'users_target',
                    child: Text('Utilizadores (users_target)')),
                DropdownMenuItem(
                    value: 'revenue_target',
                    child: Text('Receita (revenue_target)')),
                DropdownMenuItem(
                    value: 'partner_target',
                    child: Text('Parceiros (partner_target)')),
              ],
              onChanged: (v) => keyCtrl.text = v ?? 'users_target',
            ),
            const SizedBox(height: 12),
            TextField(
              controller: valueCtrl,
              keyboardType: TextInputType.number,
              style: const TextStyle(color: AppColors.textPrimary),
              decoration:
                  const InputDecoration(labelText: 'Valor da meta'),
            ),
            const SizedBox(height: 16),
            GradientButton(
              label: 'Guardar meta',
              icon: Icons.flag_rounded,
              onPressed: () => Navigator.of(ctx).pop(true),
            ),
          ],
        ),
      ),
    );
    if (ok != true) return;
    final goalValue = double.tryParse(valueCtrl.text.replaceAll(',', '.'));
    if (goalValue == null) return;

    setState(() => _busy = true);
    try {
      await ref.read(managerRepositoryProvider).upsertGoal(
            countryCode: widget.countryId,
            quarter: quarterCtrl.text.trim(),
            goalKey: keyCtrl.text.isEmpty
                ? 'users_target'
                : keyCtrl.text.trim(),
            goalValue: goalValue,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          backgroundColor: AppColors.success,
          content: const Text('Meta guardada.'),
        ));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          backgroundColor: AppColors.danger,
          content: Text(
              'Sem permissão para definir metas (admin/CEO regional).'),
        ));
      }
    }
    if (mounted) setState(() => _busy = false);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final rows = _rows;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionTitle(
          'Metas trimestrais',
          subtitle:
              'Objectivos por trimestre com progresso automático. '
              'Atribuídas pelo CEO regional ou admin global.',
        ),
        Row(
          children: [
            const Spacer(),
            GradientButton(
              label: _busy ? 'A guardar…' : 'Nova meta',
              icon: Icons.flag_rounded,
              height: 42,
              onPressed: _busy ? null : _addGoal,
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (rows == null)
          const ListSkeleton(count: 3, itemHeight: 110)
        else if (rows.isEmpty)
          const EmptyState(
            icon: Icons.flag_rounded,
            title: 'Sem metas',
            message:
                'Define metas trimestrais de utilizadores, receita ou '
                'parceiros para acompanhar o crescimento do país.',
          )
        else
          for (final g in rows.take(20)) _GoalCard(g: g),
      ],
    );
  }
}

class _GoalCard extends StatelessWidget {
  const _GoalCard({required this.g});

  final RegionalGoal g;

  Color get _statusColor => switch (g.status) {
        'achieved' || 'exceeded' => AppColors.success,
        'on_track' => const Color(0xFF38BDF8),
        'at_risk' => AppColors.warning,
        'behind' => AppColors.danger,
        _ => AppColors.textMuted,
      };

  String get _statusLabel => switch (g.status) {
        'achieved' => 'Alcançada',
        'exceeded' => 'Excedida',
        'on_track' => 'No caminho',
        'at_risk' => 'Em risco',
        'behind' => 'Atrasada',
        _ => g.status,
      };

  String get _keyLabel => switch (g.goalKey) {
        'users_target' => 'Utilizadores',
        'revenue_target' => 'Receita',
        'partner_target' => 'Parceiros',
        _ => g.goalKey,
      };

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '${_keyLabel} · ${g.quarter}',
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 13.5,
                  ),
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: _statusColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  _statusLabel,
                  style: TextStyle(
                    color: _statusColor,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: (g.progress / 100).clamp(0, 1),
              minHeight: 7,
              backgroundColor: Colors.white.withOpacity(0.08),
              valueColor:
                  AlwaysStoppedAnimation<Color>(_statusColor),
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Text(
                '${g.currentValue.toStringAsFixed(0)} / '
                '${g.goalValue.toStringAsFixed(0)}'
                '${g.goalUnit == null ? '' : ' ${g.goalUnit}'}',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.55),
                  fontSize: 11.5,
                ),
              ),
              const Spacer(),
              Text(
                '${g.progress.toStringAsFixed(0)}%',
                style: TextStyle(
                  color: _statusColor,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 180.ms);
  }
}

// ═══════════════════════════════════════════════════════════════════
// Conteúdo regional — campanhas e avisos do país
// ═══════════════════════════════════════════════════════════════════

class ContentPanel extends ConsumerStatefulWidget {
  const ContentPanel({super.key, required this.countryId});

  final String countryId;

  @override
  ConsumerState<ContentPanel> createState() => _ContentPanelState();
}

class _ContentPanelState extends ConsumerState<ContentPanel> {
  List<RegionalContentItem>? _rows;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final rows = await ref
        .read(managerRepositoryProvider)
        .fetchContent(widget.countryId);
    if (!mounted) return;
    setState(() => _rows = rows);
  }

  static const _accentPresets = <String>[
    '#F59E0B', '#10B981', '#38BDF8', '#F43F5E',
    '#A78BFA', '#F97316', '#14B8A6', '#EC4899',
  ];

  String _fmtDT(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/'
      '${d.month.toString().padLeft(2, '0')}/'
      '${d.year} ${d.hour.toString().padLeft(2, '0')}:'
      '${d.minute.toString().padLeft(2, '0')}';

  Future<void> _create() async {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final ctaLabelCtrl = TextEditingController();
    final ctaUrlCtrl = TextEditingController();
    final imageCtrl = TextEditingController();
    String type = 'health_campaign';
    String accent = _accentPresets.first;
    bool pinned = false;
    DateTime? startsAt;
    DateTime? endsAt;

    final ok = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) {
          Color accentColor() {
            final hex = accent.replaceAll('#', '');
            final v = int.tryParse('FF$hex', radix: 16);
            return v == null ? AppColors.accent : Color(v);
          }

          Future<void> pickDate({required bool isStart}) async {
            final base = isStart ? startsAt : endsAt;
            final d = await showDatePicker(
              context: ctx,
              initialDate: base ?? DateTime.now(),
              firstDate: DateTime(2024),
              lastDate: DateTime(2030),
              builder: (bctx, child) => Theme(
                data: Theme.of(bctx).copyWith(
                  colorScheme: const ColorScheme.dark(
                      primary: AppColors.accent,
                      surface: AppColors.bgHigh),
                ),
                child: child!,
              ),
            );
            if (d == null) return;
            final t = await showTimePicker(
              context: ctx,
              initialTime:
                  TimeOfDay.fromDateTime(base ?? DateTime.now()),
            );
            final dt = DateTime(
                d.year, d.month, d.day, t?.hour ?? 9, t?.minute ?? 0);
            setSheet(() {
              if (isStart) {
                startsAt = dt;
              } else {
                endsAt = dt;
              }
            });
          }

          Widget preview() {
            final c = accentColor();
            final (typeLabel, icon) =
                RegionalContentItem.typeInfo(type);
            final hasTitle = titleCtrl.text.trim().isNotEmpty;
            final hasDesc = descCtrl.text.trim().isNotEmpty;
            final hasCta = ctaLabelCtrl.text.trim().isNotEmpty;
            return Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [c, Color.alphaBlend(Colors.black38, c)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(18),
                boxShadow: [
                  BoxShadow(
                    color: c.withOpacity(0.35),
                    blurRadius: 18,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.22),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(icon, color: Colors.white, size: 18),
                      ),
                      const SizedBox(width: 9),
                      Expanded(
                        child: Text(
                          typeLabel.toUpperCase(),
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.75),
                            fontSize: 9.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.1,
                          ),
                        ),
                      ),
                      if (pinned)
                        const Icon(Icons.push_pin_rounded,
                            color: Colors.white70, size: 15),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    hasTitle ? titleCtrl.text.trim() : 'Título do banner',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  if (hasDesc) ...[
                    const SizedBox(height: 3),
                    Text(
                      descCtrl.text.trim(),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.85),
                        fontSize: 12,
                      ),
                    ),
                  ],
                  if (hasCta) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        ctaLabelCtrl.text.trim(),
                        style: const TextStyle(
                          color: Color(0xFF0B1D31),
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            );
          }

          return Container(
          padding: EdgeInsets.fromLTRB(
              22, 18, 22, MediaQuery.of(ctx).viewInsets.bottom + 20),
          decoration: const BoxDecoration(
            gradient: LinearGradient(
                colors: [AppColors.bgHigh, AppColors.bgDeep]),
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Banner Studio — publicar para o país',
                  style: TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 17,
                      fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text(
                  'Campanhas, avisos de emergência, dicas locais. '
                  'Pré-visualização em tempo real abaixo.',
                  style: TextStyle(
                      color: Colors.white.withOpacity(0.55),
                      fontSize: 12.5),
                ),
                const SizedBox(height: 14),
                DropdownButtonFormField<String>(
                  value: type,
                  dropdownColor: AppColors.bgHigh,
                  style: const TextStyle(
                      color: AppColors.textPrimary, fontSize: 13.5),
                  decoration: const InputDecoration(labelText: 'Tipo'),
                  items: [
                    for (final (k, label, _) in RegionalContentItem.types)
                      DropdownMenuItem(
                          value: k, child: Text(label)),
                  ],
                  onChanged: (v) => setSheet(() => type = v ?? type),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: titleCtrl,
                  onChanged: (_) => setSheet(() {}),
                  style: const TextStyle(color: AppColors.textPrimary),
                  decoration: const InputDecoration(
                      labelText: 'Título *'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: descCtrl,
                  maxLines: 3,
                  onChanged: (_) => setSheet(() {}),
                  style: const TextStyle(color: AppColors.textPrimary),
                  decoration: const InputDecoration(
                      labelText: 'Descrição'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: imageCtrl,
                  style: const TextStyle(color: AppColors.textPrimary),
                  decoration: const InputDecoration(
                      labelText: 'URL da imagem (opcional)'),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: ctaLabelCtrl,
                        onChanged: (_) => setSheet(() {}),
                        style: const TextStyle(
                            color: AppColors.textPrimary),
                        decoration: const InputDecoration(
                            labelText: 'Botão (opcional)'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: ctaUrlCtrl,
                        style: const TextStyle(
                            color: AppColors.textPrimary),
                        decoration: const InputDecoration(
                            labelText: 'Link do botão'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  'Cor de destaque',
                  style: TextStyle(
                      color: Colors.white.withOpacity(0.6),
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 9,
                  runSpacing: 9,
                  children: [
                    for (final p in _accentPresets)
                      InkWell(
                        borderRadius: BorderRadius.circular(17),
                        onTap: () => setSheet(() => accent = p),
                        child: Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: Color(int.tryParse(
                                    'FF${p.replaceAll('#', '')}',
                                    radix: 16) ??
                                0xFF38BDF8),
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: accent == p
                                  ? Colors.white
                                  : Colors.transparent,
                              width: 2.4,
                            ),
                          ),
                          child: accent == p
                              ? const Icon(Icons.check_rounded,
                                  color: Colors.white, size: 15)
                              : null,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => pickDate(isStart: true),
                        icon: const Icon(Icons.play_circle_rounded,
                            size: 15),
                        label: Text(
                          startsAt == null
                              ? 'Início'
                              : _fmtDT(startsAt!),
                          style: const TextStyle(fontSize: 11),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => pickDate(isStart: false),
                        icon: const Icon(Icons.event_busy_rounded,
                            size: 15),
                        label: Text(
                          endsAt == null ? 'Fim (opcional)' : _fmtDT(endsAt!),
                          style: const TextStyle(fontSize: 11),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                  ],
                ),
                SwitchListTile(
                  value: pinned,
                  onChanged: (v) => setSheet(() => pinned = v),
                  activeColor: AppColors.accent,
                  contentPadding: EdgeInsets.zero,
                  dense: true,
                  title: const Text(
                    'Fixar no topo da app',
                    style: TextStyle(
                        color: AppColors.textPrimary, fontSize: 13),
                  ),
                  subtitle: Text(
                    'Banners fixados aparecem primeiro na Home.',
                    style: TextStyle(
                        color: Colors.white.withOpacity(0.45),
                        fontSize: 11),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Pré-visualização',
                  style: TextStyle(
                      color: Colors.white.withOpacity(0.6),
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                preview(),
                const SizedBox(height: 16),
                GradientButton(
                  label: 'Publicar',
                  icon: Icons.campaign_rounded,
                  onPressed: () => Navigator.of(ctx).pop(true),
                ),
              ],
            ),
          ),
        );
        },
      ),
    );
    if (ok != true) return;
    if (titleCtrl.text.trim().isEmpty) return;

    setState(() => _busy = true);
    try {
      await ref.read(managerRepositoryProvider).createContent(
            countryCode: widget.countryId,
            contentType: type,
            title: titleCtrl.text.trim(),
            description: descCtrl.text.trim(),
            imageUrl: imageCtrl.text.trim(),
            accentColor: accent,
            ctaLabel: ctaLabelCtrl.text.trim(),
            ctaUrl: ctaUrlCtrl.text.trim(),
            isPinned: pinned,
            startsAt: startsAt,
            endsAt: endsAt,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          backgroundColor: AppColors.success,
          content: const Text('Banner publicado para o país.'),
        ));
      }
    } catch (e) {
      if (mounted) {
        final msg = e.toString();
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          backgroundColor: AppColors.danger,
          content: Text(
            msg.contains('content_limit_reached')
                ? 'Limite de banners activos atingido — desactiva um '
                    'banner antigo ou pede mais capacidade ao Gestor '
                    'Global.'
                : msg.contains('forbidden')
                    ? 'Sem permissão para publicar conteúdo neste país.'
                    : 'Não foi possível publicar. Tenta novamente.',
          ),
        ));
      }
    }
    if (mounted) setState(() => _busy = false);
    _load();
  }

  Future<void> _toggle(RegionalContentItem c) async {
    try {
      await ref
          .read(managerRepositoryProvider)
          .setContentActive(c.id, !c.isActive);
    } catch (_) {}
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final rows = _rows;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionTitle(
          'Conteúdo do país',
          subtitle:
              'Campanhas, avisos e dicas publicadas para os '
              'utilizadores deste país.',
        ),
        Row(
          children: [
            const Spacer(),
            GradientButton(
              label: _busy ? 'A publicar…' : 'Publicar',
              icon: Icons.add_rounded,
              height: 42,
              onPressed: _busy ? null : _create,
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (rows == null)
          const ListSkeleton(count: 3, itemHeight: 90)
        else if (rows.isEmpty)
          const EmptyState(
            icon: Icons.campaign_rounded,
            title: 'Sem conteúdo',
            message:
                'Publica a primeira campanha de saúde ou aviso para os '
                'utilizadores deste país.',
          )
        else
          for (final c in rows.take(30)) _ContentCard(c: c, onToggle: () => _toggle(c)),
      ],
    );
  }
}

class _ContentCard extends StatelessWidget {
  const _ContentCard({required this.c, required this.onToggle});

  final RegionalContentItem c;
  final VoidCallback onToggle;

  Color? get _accent {
    final hex = (c.accentColor ?? '').replaceAll('#', '');
    if (hex.length != 6) return null;
    return Color(int.tryParse('FF$hex', radix: 16));
  }

  @override
  Widget build(BuildContext context) {
    final (typeLabel, icon) = RegionalContentItem.typeInfo(c.contentType);
    final accent = _accent;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: c.isActive
              ? (accent ?? AppColors.glassBorder).withOpacity(0.55)
              : Colors.white.withOpacity(0.06),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: (accent ?? const Color(0xFF38BDF8)).withOpacity(0.16),
              borderRadius: BorderRadius.circular(11),
            ),
            child: Icon(icon, color: accent ?? const Color(0xFF38BDF8),
                size: 19),
          ),
          const SizedBox(width: 11),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    if (c.isPinned) ...[
                      const Icon(Icons.push_pin_rounded,
                          color: Color(0xFFF59E0B), size: 12),
                      const SizedBox(width: 4),
                    ],
                    Expanded(
                      child: Text(
                        c.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w700,
                          fontSize: 13.5,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  '$typeLabel · ${c.isActive ? 'activo' : 'inactivo'}',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.5),
                    fontSize: 11,
                  ),
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    Icon(Icons.visibility_rounded,
                        size: 11,
                        color: Colors.white.withOpacity(0.4)),
                    const SizedBox(width: 3),
                    Text(
                      '${c.viewsCount}',
                      style: TextStyle(
                          color: Colors.white.withOpacity(0.45),
                          fontSize: 10.5),
                    ),
                    const SizedBox(width: 10),
                    Icon(Icons.touch_app_rounded,
                        size: 11,
                        color: Colors.white.withOpacity(0.4)),
                    const SizedBox(width: 3),
                    Text(
                      '${c.clicksCount}',
                      style: TextStyle(
                          color: Colors.white.withOpacity(0.45),
                          fontSize: 10.5),
                    ),
                    if (c.endsAt != null) ...[
                      const SizedBox(width: 10),
                      Icon(Icons.schedule_rounded,
                          size: 11,
                          color: Colors.white.withOpacity(0.4)),
                      const SizedBox(width: 3),
                      Text(
                        'até ${c.endsAt!.day}/${c.endsAt!.month}',
                        style: TextStyle(
                            color: Colors.white.withOpacity(0.45),
                            fontSize: 10.5),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: onToggle,
            icon: Icon(
              c.isActive
                  ? Icons.visibility_off_rounded
                  : Icons.visibility_rounded,
              color: AppColors.textSecondary,
              size: 20,
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 180.ms);
  }
}

// ═══════════════════════════════════════════════════════════════════
// Ranking regional — comparação saudável entre países
// ═══════════════════════════════════════════════════════════════════

class RankingPanel extends ConsumerStatefulWidget {
  const RankingPanel({super.key, required this.countryId});

  final String countryId;

  @override
  ConsumerState<RankingPanel> createState() => _RankingPanelState();
}

class _RankingPanelState extends ConsumerState<RankingPanel> {
  List<RegionalRankingRow>? _rows;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final rows =
        await ref.read(managerRepositoryProvider).fetchRankings();
    if (!mounted) return;
    setState(() => _rows = rows);
  }

  @override
  Widget build(BuildContext context) {
    final rows = _rows;
    final latest = (rows ?? const <RegionalRankingRow>[])
        .where((r) =>
            rows == null ||
            rows.isEmpty ||
            r.period == rows!.first.period)
        .toList()
      ..sort((a, b) => (a.rankOverall ?? 99)
          .compareTo(b.rankOverall ?? 99));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionTitle(
          'Ranking entre países',
          subtitle:
              'Score de saúde da operação: utilizadores, adesão a '
              'medicação, tempo de resposta SOS.',
        ),
        if (rows == null)
          const ListSkeleton(count: 4, itemHeight: 70)
        else if (latest.isEmpty)
          const EmptyState(
            icon: Icons.leaderboard_rounded,
            title: 'Sem ranking',
            message:
                'Ainda não há rankings publicados para este período.',
          )
        else
          for (final r in latest.take(12))
            Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.symmetric(
                  horizontal: 13, vertical: 11),
              decoration: BoxDecoration(
                color: r.countryCode == widget.countryId
                    ? const Color(0x2E1E6B9C)
                    : AppColors.glassFill,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.glassBorder),
              ),
              child: Row(
                children: [
                  Text(
                    '#${r.rankOverall ?? '—'}',
                    style: const TextStyle(
                      color: Color(0xFF7DD3FC),
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      r.countryCode,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                  ),
                  if (r.healthScore != null)
                    Text(
                      'score ${r.healthScore!.toStringAsFixed(0)}',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.55),
                        fontSize: 11.5,
                      ),
                    ),
                  if (r.activeUsers != null) ...[
                    const SizedBox(width: 10),
                    Text(
                      '${r.activeUsers} users',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.45),
                        fontSize: 11.5,
                      ),
                    ),
                  ],
                ],
              ),
            ),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// Configuração do país — comissões + branding (RLS: admin/CM)
// ═══════════════════════════════════════════════════════════════════

class ConfigPanel extends ConsumerStatefulWidget {
  const ConfigPanel({super.key, required this.countryId});

  final String countryId;

  @override
  ConsumerState<ConfigPanel> createState() => _ConfigPanelState();
}

class _ConfigPanelState extends ConsumerState<ConfigPanel> {
  CountryFull? _country;
  bool _busy = false;
  late final Map<String, TextEditingController> _commission;
  final _primaryCtrl = TextEditingController();
  final _secondaryCtrl = TextEditingController();
  final _accentCtrl = TextEditingController();
  final _bannerCtrl = TextEditingController();

  /// Paletas rápidas — toca para aplicar a combinação completa.
  static const _palettePresets = <(String, String, String, String)>[
    ('Moçambique', '#009739', '#0B1D31', '#FFD100'),
    ('Oceano', '#1E6B9C', '#0B1D31', '#38BDF8'),
    ('Esmeralda', '#047857', '#064E3B', '#FBBF24'),
    ('Coral', '#E11D48', '#4C0519', '#FB7185'),
    ('Violeta', '#7C3AED', '#2E1065', '#C4B5FD'),
    ('Terra', '#C2410C', '#431407', '#FDBA74'),
  ];

  @override
  void initState() {
    super.initState();
    _commission = {
      for (final k in const ['pharmacy', 'doctor', 'lab', 'delivery'])
        k: TextEditingController(),
    };
    _load();
  }

  @override
  void dispose() {
    for (final c in _commission.values) {
      c.dispose();
    }
    _primaryCtrl.dispose();
    _secondaryCtrl.dispose();
    _accentCtrl.dispose();
    _bannerCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final list = await ref
        .read(managerRepositoryProvider)
        .fetchCountries(only: widget.countryId);
    if (!mounted || list.isEmpty) return;
    final c = list.first;
    for (final e in _commission.entries) {
      e.value.text = c.commissionFor(e.key).toStringAsFixed(0);
    }
    _primaryCtrl.text = (c.branding['primary_color'] ?? '#1E6B9C') as String;
    _secondaryCtrl.text =
        (c.branding['secondary_color'] ?? '#0B1D31') as String;
    _accentCtrl.text = (c.branding['accent_color'] ?? '#38BDF8') as String;
    _bannerCtrl.text = (c.branding['home_banner_url'] ?? '') as String;
    setState(() => _country = c);
  }

  Future<void> _save() async {
    setState(() => _busy = true);
    try {
      await ref.read(managerRepositoryProvider).updateCountryConfig(
            widget.countryId,
            commissionRates: {
              for (final e in _commission.entries)
                if (double.tryParse(e.value.text) != null)
                  e.key: double.parse(e.value.text),
            },
            branding: {
              'primary_color': _primaryCtrl.text.trim(),
              'secondary_color': _secondaryCtrl.text.trim(),
              'accent_color': _accentCtrl.text.trim(),
              'home_banner_url': _bannerCtrl.text.trim(),
            },
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          backgroundColor: AppColors.success,
          content:
              const Text('Configuração do país actualizada e registada '
                  'no log de auditoria.'),
        ));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          backgroundColor: AppColors.danger,
          content: Text(
              'Sem permissão para editar este país (só admin ou o '
              'gestor do próprio país).'),
        ));
      }
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final c = _country;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionTitle(
          'Configuração do país',
          subtitle:
              'Comissões por tipo de serviço e cores da marca. Cada '
              'alteração fica registada no log de auditoria.',
        ),
        if (c == null)
          const ListSkeleton(count: 2, itemHeight: 100)
        else ...[
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.glassFill,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.glassBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Comissões (%)',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 13.5,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    for (final e in _commission.entries) ...[
                      Expanded(
                        child: TextField(
                          controller: e.value,
                          keyboardType: TextInputType.number,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 13),
                          decoration: InputDecoration(
                            labelText: e.key,
                            labelStyle: TextStyle(
                                color: Colors.white.withOpacity(0.45),
                                fontSize: 10.5),
                          ),
                        ),
                      ),
                      if (e.key != 'delivery') const SizedBox(width: 8),
                    ],
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.glassFill,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.glassBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Branding (cores em HEX)',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 13.5,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    _ColorSwatch(
                        ctrl: _primaryCtrl,
                        label: 'Primária',
                        onChanged: () => setState(() {})),
                    const SizedBox(width: 8),
                    _ColorSwatch(
                        ctrl: _secondaryCtrl,
                        label: 'Secundária',
                        onChanged: () => setState(() {})),
                    const SizedBox(width: 8),
                    _ColorSwatch(
                        ctrl: _accentCtrl,
                        label: 'Accent',
                        onChanged: () => setState(() {})),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  'Paletas rápidas',
                  style: TextStyle(
                      color: Colors.white.withOpacity(0.6),
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 44,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _palettePresets.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (ctx, i) {
                      final (name, p, s, a) = _palettePresets[i];
                      return InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: () => setState(() {
                          _primaryCtrl.text = p;
                          _secondaryCtrl.text = s;
                          _accentCtrl.text = a;
                        }),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 9, vertical: 7),
                          decoration: BoxDecoration(
                            color: AppColors.glassFill,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: AppColors.glassBorder,
                            ),
                          ),
                          child: Row(
                            children: [
                              for (final hex in [p, a]) ...[
                                Container(
                                  width: 14,
                                  height: 14,
                                  margin:
                                      const EdgeInsets.only(right: 3),
                                  decoration: BoxDecoration(
                                    color: Color(int.tryParse(
                                            'FF${hex.replaceAll('#', '')}',
                                            radix: 16) ??
                                        0xFF38BDF8),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ],
                              const SizedBox(width: 2),
                              Text(
                                name,
                                style: const TextStyle(
                                    color: AppColors.textPrimary,
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w700),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _bannerCtrl,
                  style: const TextStyle(
                      color: AppColors.textPrimary, fontSize: 12.5),
                  decoration: const InputDecoration(
                    labelText: 'Banner da Home (URL da imagem)',
                    hintText: 'https://…',
                  ),
                ),
                const SizedBox(height: 12),
                _BrandingPreview(
                  name: c.name,
                  primaryHex: _primaryCtrl.text,
                  secondaryHex: _secondaryCtrl.text,
                  accentHex: _accentCtrl.text,
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          GradientButton(
            label: _busy ? 'A guardar…' : 'Guardar configuração',
            icon: Icons.save_rounded,
            onPressed: _busy ? null : _save,
          ),
          const SizedBox(height: 18),
          KeyValueRow('País', c.name, icon: Icons.public_rounded),
          KeyValueRow('Moeda', c.currencyCode ?? '—',
              icon: Icons.currency_exchange_rounded),
          KeyValueRow('Código de telefone', '+${c.phoneCode ?? '—'}',
              icon: Icons.call_rounded),
          KeyValueRow('Locale padrão', c.defaultLocale ?? '—',
              icon: Icons.language_rounded),
          KeyValueRow('Fuso horário', c.timezone ?? '—',
              icon: Icons.schedule_rounded),
        ],
      ],
    );
  }
}

class _ColorSwatch extends StatelessWidget {
  const _ColorSwatch(
      {required this.ctrl, required this.label, this.onChanged});

  final TextEditingController ctrl;
  final String label;
  final VoidCallback? onChanged;

  Color? get _preview {
    final hex = ctrl.text.replaceAll('#', '');
    if (hex.length != 6) return null;
    return Color(int.parse('FF$hex', radix: 16));
  }

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Container(
            height: 34,
            decoration: BoxDecoration(
              color: _preview ?? Colors.grey,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.glassBorder),
            ),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: ctrl,
            onChanged: (_) => onChanged?.call(),
            textAlign: TextAlign.center,
            style:
                const TextStyle(color: AppColors.textPrimary, fontSize: 11),
            decoration: InputDecoration(
              labelText: label,
              labelStyle: TextStyle(
                  color: Colors.white.withOpacity(0.45), fontSize: 10),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
            ),
          ),
        ],
      ),
    );
  }
}

/// Faixa de pré-visualização ao vivo do branding do país.
class _BrandingPreview extends StatelessWidget {
  const _BrandingPreview({
    required this.name,
    required this.primaryHex,
    required this.secondaryHex,
    required this.accentHex,
  });

  final String name;
  final String primaryHex;
  final String secondaryHex;
  final String accentHex;

  Color _parse(String hex, String fallback) {
    final h = hex.replaceAll('#', '');
    final v = h.length == 6
        ? int.tryParse('FF$h', radix: 16)
        : null;
    return v == null
        ? Color(int.parse('FF$fallback', radix: 16))
        : Color(v);
  }

  @override
  Widget build(BuildContext context) {
    final p = _parse(primaryHex, '1E6B9C');
    final s = _parse(secondaryHex, '0B1D31');
    final a = _parse(accentHex, '38BDF8');
    return Container(
      height: 66,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [p, Color.alphaBlend(Colors.black26, s)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: a,
              borderRadius: BorderRadius.circular(11),
            ),
            child: const Icon(Icons.healing_rounded,
                color: Color(0xFF0B1D31), size: 21),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text(
                  'MedWallet',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 13.5,
                  ),
                ),
                Text(
                  name,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.7),
                    fontSize: 10.5,
                  ),
                ),
              ],
            ),
          ),
          Text(
            'Pré-visualização',
            style: TextStyle(
              color: Colors.white.withOpacity(0.55),
              fontSize: 9.5,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}
