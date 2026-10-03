import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/facility_panels_repository.dart';
import 'clinic_panel_screen.dart' show facilityPanelsRepositoryProvider;

/// Providers ──────────────────────────────────────────────────────────

/// Painel da seguradora do utilizador (null quando não é dono).
final insurancePanelProvider =
    FutureProvider.autoDispose<InsurancePanelData?>((ref) async {
  final uid = ref.watch(currentUserIdProvider);
  if (uid == null) return null;
  return ref
      .watch(facilityPanelsRepositoryProvider)
      .fetchInsurancePanel(uid);
});

/// ── Ecrã ─────────────────────────────────────────────────────────────

/// Painel da seguradora (papel `insurance`): membros activos reais
/// (user_insurance ↔ planos), MRR, cobertura média e gestão completa
/// de planos (criar, editar, eliminar). Paridade com a web
/// InsuranceDashboard (F34).
class InsurancePanelScreen extends ConsumerStatefulWidget {
  const InsurancePanelScreen({super.key});

  @override
  ConsumerState<InsurancePanelScreen> createState() =>
      _InsurancePanelScreenState();
}

class _InsurancePanelScreenState extends ConsumerState<InsurancePanelScreen> {
  String? _deletingId;

  void _snack(String msg, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: error ? AppColors.danger : null,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _reload() async {
    ref.invalidate(insurancePanelProvider);
  }

  Future<void> _openPlanForm(InsurancePanelData panel,
      {InsurancePlan? editing}) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _PlanFormSheet(
        companyId: panel.company['id'] as String,
        editing: editing,
      ),
    );
    if (saved == true) await _reload();
  }

  Future<void> _deletePlan(String planId, String name) async {
    if (_deletingId != null) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.card,
        title: Text('Eliminar plano',
            style: TextStyle(color: AppColors.textPrimary)),
        content: Text(
          'Eliminar o plano "$name"? Esta acção não pode ser revertida.',
          style: TextStyle(color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child:
                Text('Eliminar', style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _deletingId = planId);
    try {
      await ref.read(facilityPanelsRepositoryProvider).deletePlan(planId);
      _snack('Plano eliminado');
      await _reload();
    } on Exception catch (_) {
      _snack('Não foi possível eliminar o plano', error: true);
    } finally {
      if (mounted) setState(() => _deletingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final panelAsync = ref.watch(insurancePanelProvider);

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: panelAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.all(20),
              child: ListSkeleton(count: 5, itemHeight: 92),
            ),
            error: (e, _) => EmptyState(
              icon: Icons.wifi_off_rounded,
              title: 'Painel indisponível',
              message: 'Verifica a ligação e tenta novamente.',
              actionLabel: 'Recarregar',
              onAction: _reload,
            ),
            data: (panel) {
              if (panel == null) {
                return EmptyState(
                  icon: Icons.health_and_safety_rounded,
                  title: 'Sem seguradora associada',
                  message:
                      'A tua conta não gere nenhuma seguradora. Regista a empresa na plataforma web para aceder ao painel.',
                  actionLabel: 'Voltar',
                  onAction: () => context.pop(),
                );
              }
              return RefreshIndicator(
                color: AppColors.primary,
                onRefresh: _reload,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 40),
                  children: [
                    _InsHeader(panel: panel),
                    const SizedBox(height: 18),
                    _InsKpis(panel: panel)
                        .animate(delay: 60.ms)
                        .fadeIn(duration: 320.ms)
                        .slideY(begin: 0.06, end: 0),
                    const SizedBox(height: 18),
                    _PlansSection(
                      panel: panel,
                      deletingId: _deletingId,
                      onCreate: () => _openPlanForm(panel),
                      onEdit: (p) => _openPlanForm(panel, editing: p),
                      onDelete: _deletePlan,
                    ),
                    const SizedBox(height: 18),
                    _MembersSection(panel: panel),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

// ── Cabeçalho ────────────────────────────────────────────────────────

class _InsHeader extends StatelessWidget {
  const _InsHeader({required this.panel});

  final InsurancePanelData panel;

  @override
  Widget build(BuildContext context) {
    final name =
        (panel.company['name'] ?? 'Seguradora') as String;
    final city = (panel.company['city'] ?? '') as String;

    return Row(
      children: [
        IconButton(
          onPressed: () => context.pop(),
          icon:
              Icon(Icons.arrow_back_rounded, color: AppColors.textPrimary),
        ),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                city.isEmpty
                    ? 'Painel da seguradora'
                    : '$city · Painel da seguradora',
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 12.5,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ── KPIs ─────────────────────────────────────────────────────────────

class _InsKpis extends StatelessWidget {
  const _InsKpis({required this.panel});

  final InsurancePanelData panel;

  @override
  Widget build(BuildContext context) {
    final items = [
      (
        Icons.people_alt_rounded,
        '${panel.activeMembers}',
        'Membros activos',
        AppColors.primary,
      ),
      (
        Icons.trending_up_rounded,
        formatMZN(panel.mrr),
        'MRR mensal',
        AppColors.success,
      ),
      (
        Icons.shield_rounded,
        '${panel.avgCoverage}%',
        'Cobertura média',
        AppColors.accent,
      ),
      (
        Icons.card_membership_rounded,
        '${panel.plans.length}',
        'Planos',
        AppColors.teal,
      ),
    ];

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.65,
      children: [
        for (final (icon, value, label, color) in items)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.glassFill,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.glassBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Icon(icon, size: 20, color: color),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      value,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 19,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    Text(
                      label.toUpperCase(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 9.5,
                        letterSpacing: 0.6,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
      ],
    );
  }
}

// ── Planos ───────────────────────────────────────────────────────────

class _PlansSection extends StatelessWidget {
  const _PlansSection({
    required this.panel,
    required this.deletingId,
    required this.onCreate,
    required this.onEdit,
    required this.onDelete,
  });

  final InsurancePanelData panel;
  final String? deletingId;
  final VoidCallback onCreate;
  final void Function(InsurancePlan) onEdit;
  final void Function(String id, String name) onDelete;

  @override
  Widget build(BuildContext context) {
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
          Row(
            children: [
              Icon(Icons.card_membership_rounded,
                  size: 17, color: AppColors.accent),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Planos (${panel.plans.length})',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              InkWell(
                onTap: onCreate,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 7),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: AppColors.primary.withOpacity(0.45)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.add_rounded,
                          size: 15, color: AppColors.primary),
                      const SizedBox(width: 4),
                      Text(
                        'Novo',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (panel.plans.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 14),
              child: Text(
                'Ainda sem planos. Cria o primeiro plano para começar a vender seguro de saúde.',
                style:
                    TextStyle(color: AppColors.textSecondary, fontSize: 13),
              ),
            )
          else
            ...panel.plans.map(
              (p) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.glassFill,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.glassBorder),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              p.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: AppColors.textPrimary,
                                fontSize: 13.5,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          deletingId == p.id
                              ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: Padding(
                                    padding: EdgeInsets.all(3),
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2),
                                  ),
                                )
                              : Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                      tooltip: 'Editar',
                                      visualDensity: VisualDensity.compact,
                                      icon: Icon(Icons.edit_outlined,
                                          size: 19,
                                          color: AppColors.textSecondary),
                                      onPressed: () => onEdit(p),
                                    ),
                                    IconButton(
                                      tooltip: 'Eliminar',
                                      visualDensity: VisualDensity.compact,
                                      icon: Icon(
                                          Icons.delete_outline_rounded,
                                          size: 19,
                                          color: AppColors.danger),
                                      onPressed: () =>
                                          onDelete(p.id, p.name),
                                    ),
                                  ],
                                ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          _PillChip(
                            label:
                                '${formatMZN(p.monthlyPrice, withSymbol: false)} MT/mês',
                            color: AppColors.success,
                          ),
                          const SizedBox(width: 6),
                          _PillChip(
                            label: '${p.coveragePercent.toStringAsFixed(0)}% cobertura',
                            color: AppColors.primary,
                          ),
                        ],
                      ),
                      if (p.features.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(
                          p.features.join(' · '),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 11.5,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _PillChip extends StatelessWidget {
  const _PillChip({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 10.5,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

// ── Membros ──────────────────────────────────────────────────────────

class _MembersSection extends StatelessWidget {
  const _MembersSection({required this.panel});

  final InsurancePanelData panel;

  @override
  Widget build(BuildContext context) {
    final planName = <String, String>{
      for (final p in panel.plans) p.id: p.name,
    };

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
          Row(
            children: [
              Icon(Icons.badge_rounded, size: 17, color: AppColors.accent),
              const SizedBox(width: 8),
              Text(
                'Membros recentes (${panel.members.length})',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (panel.members.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 14),
              child: Text(
                'Sem membros inscritos nos teus planos por agora.',
                style:
                    TextStyle(color: AppColors.textSecondary, fontSize: 13),
              ),
            )
          else
            ...panel.members.map(
              (m) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 16,
                      backgroundColor: AppColors.primary.withOpacity(0.18),
                      child: Text(
                        m.name.isEmpty ? '?' : m.name[0].toUpperCase(),
                        style: TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w900,
                          fontSize: 13,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            m.name.isEmpty ? 'Paciente' : m.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          Text(
                            planName[m.planId] ?? 'Plano',
                            style: TextStyle(
                              color: AppColors.textMuted,
                              fontSize: 11.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: (m.isActive
                                ? AppColors.success
                                : AppColors.textMuted)
                            .withOpacity(0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        m.isActive ? 'Activo' : m.status,
                        style: TextStyle(
                          color: m.isActive
                              ? AppColors.success
                              : AppColors.textMuted,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ── Formulário de plano (bottom sheet) ──────────────────────────────

class _PlanFormSheet extends ConsumerStatefulWidget {
  const _PlanFormSheet({
    required this.companyId,
    required this.editing,
  });

  final String companyId;
  final InsurancePlan? editing;

  @override
  ConsumerState<_PlanFormSheet> createState() => _PlanFormSheetState();
}

class _PlanFormSheetState extends ConsumerState<_PlanFormSheet> {
  late final TextEditingController _name =
      TextEditingController(text: widget.editing?.name ?? '');
  late final TextEditingController _desc =
      TextEditingController(text: widget.editing?.description ?? '');
  late final TextEditingController _price = TextEditingController(
      text: widget.editing == null
          ? ''
          : widget.editing!.monthlyPrice.toStringAsFixed(0));
  late final TextEditingController _coverage = TextEditingController(
      text: widget.editing == null
          ? ''
          : widget.editing!.coveragePercent.toStringAsFixed(0));
  late final TextEditingController _max = TextEditingController(
      text: widget.editing == null
          ? ''
          : widget.editing!.maxCoverage.toStringAsFixed(0));
  late final TextEditingController _features = TextEditingController(
      text: widget.editing?.features.join('\n') ?? '');

  bool _saving = false;

  bool get _valid => _name.text.trim().isNotEmpty;

  @override
  void dispose() {
    _name.dispose();
    _desc.dispose();
    _price.dispose();
    _coverage.dispose();
    _max.dispose();
    _features.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_valid || _saving) return;
    setState(() => _saving = true);
    try {
      final features = _features.text
          .split('\n')
          .map((b) => b.trim())
          .where((b) => b.isNotEmpty)
          .toList();
      await ref.read(facilityPanelsRepositoryProvider).savePlan(
            companyId: widget.companyId,
            planId: widget.editing?.id,
            name: _name.text.trim(),
            description: _desc.text.trim().isEmpty
                ? null
                : _desc.text.trim(),
            monthlyPrice: num.tryParse(_price.text) ?? 0,
            coveragePercent: num.tryParse(_coverage.text) ?? 0,
            maxCoverage: num.tryParse(_max.text) ?? 0,
            features: features,
          );
      if (mounted) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.editing == null
                ? 'Plano criado'
                : 'Plano actualizado'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } on Exception catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content:
                const Text('Não foi possível guardar o plano'),
            backgroundColor: AppColors.danger,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding:
          EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: const BorderRadius.vertical(
              top: Radius.circular(24)),
          border: Border.all(color: AppColors.glassBorder),
        ),
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                widget.editing == null
                    ? 'Novo plano de saúde'
                    : 'Editar plano',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 17,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 14),
              _Field(
                  controller: _name,
                  label: 'Nome do plano *',
                  keyboard: TextInputType.text,
                  onChanged: () => setState(() {})),
              const SizedBox(height: 10),
              _Field(
                  controller: _desc,
                  label: 'Descrição',
                  keyboard: TextInputType.multiline,
                  maxLines: 2),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _Field(
                        controller: _price,
                        label: 'Preço mensal (MT)',
                        keyboard: TextInputType.number),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _Field(
                        controller: _coverage,
                        label: 'Cobertura (%)',
                        keyboard: TextInputType.number),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              _Field(
                  controller: _max,
                  label: 'Cobertura máxima (MT)',
                  keyboard: TextInputType.number),
              const SizedBox(height: 10),
              _Field(
                  controller: _features,
                  label: 'Benefícios (um por linha)',
                  keyboard: TextInputType.multiline,
                  maxLines: 3),
              const SizedBox(height: 16),
              GradientButton(
                label: widget.editing == null
                    ? 'Criar plano'
                    : 'Guardar alterações',
                loading: _saving,
                enabled: _valid,
                onPressed: _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({
    required this.controller,
    required this.label,
    required this.keyboard,
    this.maxLines = 1,
    this.onChanged,
  });

  final TextEditingController controller;
  final String label;
  final TextInputType keyboard;
  final int maxLines;
  final VoidCallback? onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            color: AppColors.textMuted,
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.3,
          ),
        ),
        const SizedBox(height: 5),
        TextField(
          controller: controller,
          keyboardType: keyboard,
          maxLines: maxLines,
          onChanged: (_) => onChanged?.call(),
          style: TextStyle(
              color: AppColors.textPrimary, fontSize: 13.5),
          decoration: InputDecoration(
            filled: true,
            fillColor: AppColors.glassFill,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: AppColors.glassBorder),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide:
                  BorderSide(color: AppColors.primary, width: 1.4),
            ),
          ),
        ),
      ],
    );
  }
}
