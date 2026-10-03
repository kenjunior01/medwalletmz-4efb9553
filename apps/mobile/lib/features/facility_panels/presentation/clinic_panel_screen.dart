import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../../core/widgets/skeleton.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../bookings/domain/booking_models.dart'
    show consultationStatusColor, consultationStatusLabel;
import '../data/facility_panels_repository.dart';

/// Providers ──────────────────────────────────────────────────────────

final facilityPanelsRepositoryProvider = Provider<FacilityPanelsRepository>(
  (ref) => FacilityPanelsRepository(Supabase.instance.client),
);

/// Painel da clínica do utilizador (null quando não é dono de clínica).
final clinicPanelProvider =
    FutureProvider.autoDispose<ClinicPanelData?>((ref) async {
  final uid = ref.watch(currentUserIdProvider);
  if (uid == null) return null;
  return ref.watch(facilityPanelsRepositoryProvider).fetchClinicPanel(uid);
});

/// ── Ecrã ─────────────────────────────────────────────────────────────

/// Painel da clínica (papel `clinic`/`hospital`): KPIs reais (equipa,
/// consultas de hoje, pacientes/mês, receita do mês), agenda de hoje
/// com conclusão via RPC e gestão da equipa médica. Paridade com a
/// web ClinicDashboard (F34).
class ClinicPanelScreen extends ConsumerStatefulWidget {
  const ClinicPanelScreen({super.key});

  @override
  ConsumerState<ClinicPanelScreen> createState() =>
      _ClinicPanelScreenState();
}

class _ClinicPanelScreenState extends ConsumerState<ClinicPanelScreen> {
  bool _completingId = false;
  String? _completing;
  String? _removing;
  bool _adding = false;
  final _doctorCtrl = TextEditingController();

  @override
  void dispose() {
    _doctorCtrl.dispose();
    super.dispose();
  }

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
    ref.invalidate(clinicPanelProvider);
  }

  Future<void> _complete(String id) async {
    if (_completingId) return;
    setState(() {
      _completingId = true;
      _completing = id;
    });
    try {
      await ref
          .read(facilityPanelsRepositoryProvider)
          .completeConsultation(id);
      _snack('Consulta concluída');
      await _reload();
    } catch (_) {
      _snack('Não foi possível concluir a consulta', error: true);
    } finally {
      if (mounted) {
        setState(() {
          _completingId = false;
          _completing = null;
        });
      }
    }
  }

  Future<void> _addDoctor(String clinicId) async {
    final name = _doctorCtrl.text.trim();
    if (name.isEmpty || _adding) return;
    setState(() => _adding = true);
    try {
      final fullName = await ref
          .read(facilityPanelsRepositoryProvider)
          .addDoctorByName(clinicId, name);
      _doctorCtrl.clear();
      _snack('$fullName adicionado à equipa');
      await _reload();
    } catch (e) {
      _snack(
        '$e'.contains('não encontrado')
            ? 'Médico não encontrado — verifica o nome'
            : 'Não foi possível adicionar o médico',
        error: true,
      );
    } finally {
      if (mounted) setState(() => _adding = false);
    }
  }

  Future<void> _removeDoctor(String rowId, String name) async {
    if (_removing != null) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.card,
        title: Text('Remover médico',
            style: TextStyle(color: AppColors.textPrimary)),
        content: Text(
          'Remover $name da equipa da clínica?',
          style: TextStyle(color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('Remover',
                style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _removing = rowId);
    try {
      await ref.read(facilityPanelsRepositoryProvider).removeDoctor(rowId);
      _snack('Médico removido');
      await _reload();
    } catch (_) {
      _snack('Não foi possível remover', error: true);
    } finally {
      if (mounted) setState(() => _removing = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final panelAsync = ref.watch(clinicPanelProvider);

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
                  icon: Icons.local_hospital_rounded,
                  title: 'Sem clínica associada',
                  message:
                      'A tua conta não gere nenhuma clínica. Regista a clínica na plataforma web para aceder ao painel.',
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
                    _Header(panel: panel),
                    const SizedBox(height: 18),
                    _Kpis(panel: panel)
                        .animate(delay: 60.ms)
                        .fadeIn(duration: 320.ms)
                        .slideY(begin: 0.06, end: 0),
                    const SizedBox(height: 18),
                    _TodayAgenda(
                      panel: panel,
                      completingId: _completingId,
                      completing: _completing,
                      onComplete: _complete,
                    ),
                    const SizedBox(height: 18),
                    _TeamSection(
                      panel: panel,
                      doctorCtrl: _doctorCtrl,
                      adding: _adding,
                      removing: _removing,
                      onAdd: () => _addDoctor(panel.clinic['id'] as String),
                      onRemove: _removeDoctor,
                    ),
                    if (!panel.subActive) ...[
                      const SizedBox(height: 18),
                      _ProUpsell(),
                    ],
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

class _Header extends StatelessWidget {
  const _Header({required this.panel});

  final ClinicPanelData panel;

  @override
  Widget build(BuildContext context) {
    final clinic = panel.clinic;
    final name = (clinic['name'] ?? 'Clínica') as String;
    final city = (clinic['city'] ?? '') as String;
    final verified = clinic['is_verified'] == true;

    return Row(
      children: [
        IconButton(
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back_rounded,
              color: AppColors.textPrimary),
        ),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Flexible(
                    child: Text(
                      name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  if (verified) ...[
                    const SizedBox(width: 6),
                    Icon(Icons.verified_rounded,
                        size: 18, color: AppColors.success),
                  ],
                ],
              ),
              const SizedBox(height: 2),
              Text(
                city.isEmpty ? 'Painel da clínica' : '$city · Painel da clínica',
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

class _Kpis extends StatelessWidget {
  const _Kpis({required this.panel});

  final ClinicPanelData panel;

  @override
  Widget build(BuildContext context) {
    final items = [
      (
        Icons.medical_services_rounded,
        '${panel.teamSize}',
        'Médicos',
        AppColors.primary,
      ),
      (
        Icons.today_rounded,
        '${panel.todayCount}',
        'Consultas hoje',
        AppColors.accent,
      ),
      (
        Icons.people_alt_rounded,
        '${panel.monthPatients}',
        'Pacientes no mês',
        AppColors.teal,
      ),
      (
        Icons.payments_rounded,
        formatMZN(panel.monthRevenue),
        'Receita do mês',
        AppColors.success,
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

// ── Agenda de hoje ───────────────────────────────────────────────────

class _TodayAgenda extends StatelessWidget {
  const _TodayAgenda({
    required this.panel,
    required this.completingId,
    required this.completing,
    required this.onComplete,
  });

  final ClinicPanelData panel;
  final bool completingId;
  final String? completing;
  final void Function(String id) onComplete;

  @override
  Widget build(BuildContext context) {
    return _PanelSection(
      icon: Icons.event_available_rounded,
      title: 'Agenda de hoje',
      child: panel.today.isEmpty
          ? Padding(
              padding: const EdgeInsets.symmetric(vertical: 18),
              child: Column(
                children: [
                  Icon(Icons.event_busy_rounded,
                      size: 34,
                      color: AppColors.textMuted.withOpacity(0.6)),
                  const SizedBox(height: 8),
                  Text(
                    'Sem consultas marcadas para hoje',
                    style: TextStyle(
                        color: AppColors.textSecondary, fontSize: 13),
                  ),
                ],
              ),
            )
          : Column(
              children: [
                for (final c in panel.today)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _AgendaTile(
                      consultation: c,
                      busy: completingId && completing == c.id,
                      onComplete: () => onComplete(c.id),
                    ),
                  ),
              ],
            ),
    );
  }
}

class _AgendaTile extends StatelessWidget {
  const _AgendaTile({
    required this.consultation,
    required this.busy,
    required this.onComplete,
  });

  final PanelConsultation consultation;
  final bool busy;
  final VoidCallback onComplete;

  @override
  Widget build(BuildContext context) {
    final c = consultation;
    final time = c.scheduledAt == null
        ? '--:--'
        : formatTimeOnly(c.scheduledAt!);
    final done = c.status == 'completed';

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 52,
            padding: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Column(
              children: [
                Icon(Icons.schedule_rounded,
                    size: 14, color: AppColors.primary),
                const SizedBox(height: 2),
                Text(
                  time,
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  c.patientName.isEmpty ? 'Paciente' : c.patientName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 13.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: consultationStatusColor(c.status)
                            .withOpacity(0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        consultationStatusLabel(c.status),
                        style: TextStyle(
                          color: consultationStatusColor(c.status),
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    if (c.fee > 0) ...[
                      const SizedBox(width: 8),
                      Text(
                        formatMZN(c.fee),
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          if (!done)
            busy
                ? const SizedBox(
                    width: 26,
                    height: 26,
                    child: Padding(
                      padding: EdgeInsets.all(4),
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  )
                : IconButton(
                    tooltip: 'Marcar concluída',
                    onPressed: onComplete,
                    icon: Icon(Icons.check_circle_outline_rounded,
                        size: 24, color: AppColors.success),
                  )
          else
            Icon(Icons.check_circle_rounded,
                size: 22, color: AppColors.success),
        ],
      ),
    );
  }
}

// ── Equipa médica ────────────────────────────────────────────────────

class _TeamSection extends StatelessWidget {
  const _TeamSection({
    required this.panel,
    required this.doctorCtrl,
    required this.adding,
    required this.removing,
    required this.onAdd,
    required this.onRemove,
  });

  final ClinicPanelData panel;
  final TextEditingController doctorCtrl;
  final bool adding;
  final String? removing;
  final VoidCallback onAdd;
  final void Function(String rowId, String name) onRemove;

  @override
  Widget build(BuildContext context) {
    return _PanelSection(
      icon: Icons.groups_rounded,
      title: 'Equipa médica (${panel.teamSize})',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (panel.team.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 14),
              child: Text(
                'Ainda sem médicos na equipa. Adiciona pelo nome do perfil.',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
              ),
            )
          else
            ...panel.team.map(
              (m) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: AppColors.glassFill,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.glassBorder),
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 17,
                        backgroundColor:
                            AppColors.primary.withOpacity(0.18),
                        child: Text(
                          m.fullName.isEmpty
                              ? '?'
                              : m.fullName[0].toUpperCase(),
                          style: TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w900,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              m.fullName.isEmpty
                                  ? 'Perfil por completar'
                                  : m.fullName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: AppColors.textPrimary,
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            if ((m.phone ?? '').isNotEmpty)
                              Text(
                                m.phone!,
                                style: TextStyle(
                                  color: AppColors.textMuted,
                                  fontSize: 11.5,
                                ),
                              ),
                          ],
                        ),
                      ),
                      removing == m.rowId
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: Padding(
                                padding: EdgeInsets.all(3),
                                child: CircularProgressIndicator(
                                    strokeWidth: 2),
                              ),
                            )
                          : IconButton(
                              tooltip: 'Remover',
                              icon: Icon(Icons.remove_circle_outline_rounded,
                                  size: 22, color: AppColors.danger),
                              onPressed: () =>
                                  onRemove(m.rowId, m.fullName),
                            ),
                    ],
                  ),
                ),
              ),
            ),
          const SizedBox(height: 4),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: doctorCtrl,
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => onAdd(),
                  style: TextStyle(
                      color: AppColors.textPrimary, fontSize: 13.5),
                  decoration: InputDecoration(
                    hintText: 'Nome do médico no perfil',
                    hintStyle:
                        TextStyle(color: AppColors.textMuted, fontSize: 12.5),
                    filled: true,
                    fillColor: AppColors.glassFill,
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 12),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide:
                          BorderSide(color: AppColors.glassBorder),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide:
                          BorderSide(color: AppColors.primary, width: 1.4),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              GradientButton(
                label: 'Adicionar',
                loading: adding,
                height: 46,
                onPressed: onAdd,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Upsell Pro ───────────────────────────────────────────────────────

class _ProUpsell extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primary.withOpacity(0.14),
            AppColors.accent.withOpacity(0.10),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primary.withOpacity(0.35)),
      ),
      child: Row(
        children: [
          Icon(Icons.workspace_premium_rounded,
              size: 26, color: AppColors.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Plano Pro para clínicas',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w900,
                    fontSize: 13.5,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Destaque na pesquisa, verificações prioritárias e mais ferramentas de gestão.',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Icon(Icons.chevron_right_rounded,
              color: AppColors.textMuted, size: 22),
        ],
      ),
    );
  }
}

// ── Secção reutilizável ─────────────────────────────────────────────

class _PanelSection extends StatelessWidget {
  const _PanelSection({
    required this.icon,
    required this.title,
    required this.child,
  });

  final IconData icon;
  final String title;
  final Widget child;

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
              Icon(icon, size: 17, color: AppColors.accent),
              const SizedBox(width: 8),
              Text(
                title,
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}
