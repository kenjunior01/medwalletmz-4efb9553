import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/manager_models.dart';
import 'manager_controller.dart';
import 'manager_widgets.dart';

// ═══════════════════════════════════════════════════════════════════
// Instituições — gerir a rede do país (activar/desactivar/verificar)
// ═══════════════════════════════════════════════════════════════════

class InstitutionsPanel extends ConsumerStatefulWidget {
  const InstitutionsPanel({super.key, required this.countryId});

  final String countryId;

  @override
  ConsumerState<InstitutionsPanel> createState() =>
      _InstitutionsPanelState();
}

class _InstitutionsPanelState extends ConsumerState<InstitutionsPanel> {
  List<InstitutionRow>? _rows;
  String _filter = 'all'; // all | active | inactive
  bool _busy = false;

  Future<void> _load() async {
    final rows = await ref
        .read(managerRepositoryProvider)
        .fetchInstitutions(widget.countryId);
    if (!mounted) return;
    setState(() => _rows = rows);
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant InstitutionsPanel old) {
    super.didUpdateWidget(old);
    if (old.countryId != widget.countryId) _load();
  }

  Future<void> _toggle(InstitutionRow r) async {
    setState(() => _busy = true);
    try {
      await ref
          .read(managerRepositoryProvider)
          .setInstitutionActive(r.source, r.id, !r.isActive);
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          backgroundColor: AppColors.success,
          content: Text(
              '${r.name} ${r.isActive ? 'desactivada' : 'activada'}.'),
        ));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          backgroundColor: AppColors.danger,
          content: Text(
              'Sem permissão para alterar esta instituição (RLS).'),
        ));
      }
    }
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _verify(InstitutionRow r) async {
    setState(() => _busy = true);
    try {
      await ref
          .read(managerRepositoryProvider)
          .verifyInstitution(r.source, r.id);
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          backgroundColor: AppColors.success,
          content: Text('${r.name} verificada.'),
        ));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          backgroundColor: AppColors.danger,
          content: Text('Não foi possível verificar.'),
        ));
      }
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final rows = _rows;
    final filtered = (rows ?? const <InstitutionRow>[]).where((r) {
      switch (_filter) {
        case 'active':
          return r.isActive;
        case 'inactive':
          return !r.isActive;
        default:
          return true;
      }
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionTitle(
          'Instituições do país',
          subtitle: 'Farmácias, clínicas e veterinárias registadas. '
              'Desactiva entradas duplicadas ou encerradas.',
        ),
        Row(
          children: [
            FilterChip2(
              label: 'Todas',
              selected: _filter == 'all',
              onTap: () => setState(() => _filter = 'all'),
            ),
            const SizedBox(width: 8),
            FilterChip2(
              label: 'Activas',
              selected: _filter == 'active',
              onTap: () => setState(() => _filter = 'active'),
              color: AppColors.success,
            ),
            const SizedBox(width: 8),
            FilterChip2(
              label: 'Inactivas',
              selected: _filter == 'inactive',
              onTap: () => setState(() => _filter = 'inactive'),
              color: AppColors.danger,
            ),
            const Spacer(),
            IconButton(
              onPressed: _load,
              icon: const Icon(Icons.refresh_rounded,
                  color: AppColors.accent, size: 20),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (rows == null)
          const ListSkeleton(count: 4, itemHeight: 90)
        else if (filtered.isEmpty)
          const EmptyState(
            icon: Icons.storefront_rounded,
            title: 'Nada aqui',
            message:
                'Sem instituições neste filtro. Aprova submissões da '
                'comunidade para crescer a rede.',
          )
        else
          for (final r in filtered.take(60))
            _InstitutionCard(
              r: r,
              busy: _busy,
              onToggle: () => _toggle(r),
              onVerify: () => _verify(r),
            ).animate().fadeIn(duration: 180.ms),
      ],
    );
  }
}

class _InstitutionCard extends StatelessWidget {
  const _InstitutionCard({
    required this.r,
    required this.busy,
    required this.onToggle,
    required this.onVerify,
  });

  final InstitutionRow r;
  final bool busy;
  final VoidCallback onToggle;
  final VoidCallback onVerify;

  @override
  Widget build(BuildContext context) {
    final (typeLabel, icon, color) = r.typeInfo;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: r.isActive ? AppColors.glassBorder : AppColors.danger
              .withOpacity(0.35),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 11),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        r.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w700,
                          fontSize: 13.5,
                        ),
                      ),
                    ),
                    if (r.isVerified) ...[
                      const SizedBox(width: 5),
                      const Icon(Icons.verified_rounded,
                          color: AppColors.success, size: 15),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  '$typeLabel · ${r.city ?? '—'}'
                  '${r.isActive ? '' : ' · INACTIVA'}',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.5),
                    fontSize: 11.3,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Google Maps',
            onPressed: () => launchUrl(Uri.parse(r.mapsQuery),
                mode: LaunchMode.externalApplication),
            icon: const Icon(Icons.map_rounded,
                color: AppColors.accent, size: 20),
          ),
          PopupMenuButton<String>(
            color: AppColors.bgHigh,
            iconColor: AppColors.textSecondary,
            onSelected: (v) {
              if (v == 'toggle') onToggle();
              if (v == 'verify') onVerify();
            },
            itemBuilder: (_) => [
              PopupMenuItem(
                value: 'toggle',
                child: Text(r.isActive
                    ? 'Desactivar instituição'
                    : 'Activar instituição'),
              ),
              if (r.source != 'stores' && !r.isVerified)
                const PopupMenuItem(
                  value: 'verify',
                  child: Text('Marcar como verificada'),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// Pagamentos — fila de confirmações M-Pesa manuais
// ═══════════════════════════════════════════════════════════════════

class PaymentsPanel extends ConsumerStatefulWidget {
  const PaymentsPanel({super.key, required this.countryId});

  final String countryId;

  @override
  ConsumerState<PaymentsPanel> createState() => _PaymentsPanelState();
}

class _PaymentsPanelState extends ConsumerState<PaymentsPanel> {
  List<PendingPayment>? _rows;
  String _filter = 'pending';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final rows = await ref
        .read(managerRepositoryProvider)
        .fetchPayments(status: _filter == 'all' ? null : _filter);
    if (!mounted) return;
    setState(() => _rows = rows);
  }

  Future<void> _confirm(PendingPayment p) async {
    final txCtrl = TextEditingController(text: p.mpesaTxId ?? '');
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
            Text(
              'Confirmar ${p.reference}',
              style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 17,
                  fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 4),
            Text(
              'Confirma no telemóvel que o pagamento entrou e cola o ID '
              'da transacção M-Pesa.',
              style: TextStyle(
                  color: Colors.white.withOpacity(0.55), fontSize: 12.5),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: txCtrl,
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: const InputDecoration(
                  hintText: 'Ex.: QGH7JK2R91'),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: GlassGhostButton(
                    label: 'Cancelar',
                    onPressed: () => Navigator.of(ctx).pop(false),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: GradientButton(
                    label: 'Confirmar',
                    icon: Icons.check_rounded,
                    onPressed: () => Navigator.of(ctx).pop(true),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
    if (ok != true) return;
    try {
      await ref
          .read(managerRepositoryProvider)
          .confirmPayment(p.id, txCtrl.text.trim());
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          backgroundColor: AppColors.success,
          content:
              Text('Pagamento confirmado — saldo creditado na carteira.'),
        ));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          backgroundColor: AppColors.danger,
          content: Text('Falhou a confirmação — verifica o teu papel.'),
        ));
      }
    }
    _load();
  }

  Future<void> _reject(PendingPayment p) async {
    try {
      await ref.read(managerRepositoryProvider).rejectPayment(p.id);
    } catch (_) {}
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionTitle(
          'Pagamentos M-Pesa',
          subtitle:
              'Depósitos manuais à espera de confirmação. Confirmar '
              'credita a carteira do utilizador em dinheiro real.',
        ),
        Row(
          children: [
            for (final (k, l) in const [
              ('pending', 'Pendentes'),
              ('confirmed', 'Confirmados'),
              ('all', 'Todos'),
            ]) ...[
              FilterChip2(
                label: l,
                selected: _filter == k,
                onTap: () {
                  setState(() => _filter = k);
                  _load();
                },
              ),
              const SizedBox(width: 8),
            ],
          ],
        ),
        const SizedBox(height: 12),
        if (_rows == null)
          const ListSkeleton(count: 3, itemHeight: 100)
        else if (_rows!.isEmpty)
          const EmptyState(
            icon: Icons.payments_rounded,
            title: 'Sem pagamentos',
            message:
                'Nada nesta fila. Os depósitos manuais aparecem aqui '
                'quando os utilizadores enviam o comprovativo.',
          )
        else
          for (final p in _rows!.take(50))
            _PaymentCard(
              p: p,
              onConfirm: () => _confirm(p),
              onReject: () => _reject(p),
            ).animate().fadeIn(duration: 180.ms),
      ],
    );
  }
}

class _PaymentCard extends StatelessWidget {
  const _PaymentCard({
    required this.p,
    required this.onConfirm,
    required this.onReject,
  });

  final PendingPayment p;
  final VoidCallback onConfirm;
  final VoidCallback onReject;

  @override
  Widget build(BuildContext context) {
    final pending = p.status == 'pending';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: pending
                      ? AppColors.warning.withOpacity(0.15)
                      : AppColors.success.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  pending
                      ? Icons.hourglass_top_rounded
                      : Icons.check_circle_rounded,
                  color: pending ? AppColors.warning : AppColors.success,
                  size: 20,
                ),
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${formatMZN(p.amount)} · ${p.reference}',
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w800,
                        fontSize: 13.5,
                      ),
                    ),
                    Text(
                      '${p.payerName ?? 'Pagador desconhecido'} · '
                      '${p.payerPhone ?? '—'}',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.5),
                        fontSize: 11.3,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                formatRelative(p.createdAt),
                style: TextStyle(
                  color: Colors.white.withOpacity(0.4),
                  fontSize: 10.5,
                ),
              ),
            ],
          ),
          if (pending) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: GradientButton(
                    label: 'Confirmar',
                    icon: Icons.check_rounded,
                    height: 42,
                    onPressed: onConfirm,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: GlassGhostButton(
                    label: 'Rejeitar',
                    height: 42,
                    onPressed: onReject,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// Utilizadores — listagem oficial da gestão (RPC admin)
// ═══════════════════════════════════════════════════════════════════

class UsersPanel extends ConsumerStatefulWidget {
  const UsersPanel({super.key, required this.countryId});

  final String countryId;

  @override
  ConsumerState<UsersPanel> createState() => _UsersPanelState();
}

class _UsersPanelState extends ConsumerState<UsersPanel> {
  List<ManagerUserRow>? _rows;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final rows = await ref
        .read(managerRepositoryProvider)
        .fetchUsers(widget.countryId);
    if (!mounted) return;
    setState(() => _rows = rows);
  }

  @override
  Widget build(BuildContext context) {
    final rows = _rows ?? const <ManagerUserRow>[];
    final filtered = rows.where((u) {
      if (_query.isEmpty) return true;
      final q = _query.toLowerCase();
      return (u.fullName ?? '').toLowerCase().contains(q) ||
          (u.phone ?? '').contains(q) ||
          (u.city ?? '').toLowerCase().contains(q);
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionTitle(
          'Utilizadores',
          subtitle:
              'Admin global vê todos; gestor de país vê só os seus. '
              'Pesquisa por nome, telefone ou cidade.',
        ),
        TextField(
          onChanged: (v) => setState(() => _query = v),
          style: const TextStyle(color: AppColors.textPrimary),
          decoration: const InputDecoration(
            prefixIcon: Icon(Icons.search_rounded, color: AppColors.textMuted),
            hintText: 'Pesquisar utilizadores…',
          ),
        ),
        const SizedBox(height: 12),
        if (_rows == null)
          const ListSkeleton(count: 5, itemHeight: 70)
        else if (filtered.isEmpty)
          const EmptyState(
            icon: Icons.person_search_rounded,
            title: 'Sem resultados',
            message:
                'Sem utilizadores visíveis. A RLS pode não permitir a '
                'listagem para o teu papel neste país.',
          )
        else
          for (final u in filtered.take(80))
            Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding:
                  const EdgeInsets.symmetric(horizontal: 13, vertical: 11),
              decoration: BoxDecoration(
                color: AppColors.glassFill,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.glassBorder),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 17,
                    backgroundColor: const Color(0x2E1E6B9C),
                    child: Text(
                      initials(u.fullName ?? u.phone ?? '?'),
                      style: const TextStyle(
                        color: Color(0xFF7DD3FC),
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  const SizedBox(width: 11),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          u.fullName ?? 'Sem nome',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Text(
                          [u.phone, u.city, u.countryId]
                              .whereType<String>()
                              .where((s) => s.isNotEmpty)
                              .join(' · '),
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.45),
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// Monitor SOS — alertas de emergência (admin via RLS)
// ═══════════════════════════════════════════════════════════════════

class SosMonitorPanel extends ConsumerStatefulWidget {
  const SosMonitorPanel({super.key, required this.countryId});

  final String countryId;

  @override
  ConsumerState<SosMonitorPanel> createState() => _SosMonitorPanelState();
}

class _SosMonitorPanelState extends ConsumerState<SosMonitorPanel> {
  List<SosAlertRow>? _rows;
  bool _onlyActive = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final rows = await ref
        .read(managerRepositoryProvider)
        .fetchSosAlerts(onlyActive: _onlyActive);
    if (!mounted) return;
    setState(() => _rows = rows);
  }

  Future<void> _setStatus(SosAlertRow a, String status) async {
    try {
      await ref
          .read(managerRepositoryProvider)
          .updateSosStatus(a.id, status);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          backgroundColor: AppColors.danger,
          content: Text(
              'Sem permissão para actualizar alertas (precisas de papel '
              'admin ou emergency_responder).'),
        ));
        return;
      }
    }
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionTitle(
          'Monitor SOS',
          subtitle:
              'Alertas de emergência activos com localização, grupo '
              'sanguíneo e condições. A RLS limita a admin/resposta '
              'de emergência.',
        ),
        Row(
          children: [
            FilterChip2(
              label: 'Activos',
              selected: _onlyActive,
              onTap: () {
                setState(() => _onlyActive = true);
                _load();
              },
              color: AppColors.danger,
            ),
            const SizedBox(width: 8),
            FilterChip2(
              label: 'Todos',
              selected: !_onlyActive,
              onTap: () {
                setState(() => _onlyActive = false);
                _load();
              },
            ),
            const Spacer(),
            IconButton(
              onPressed: _load,
              icon: const Icon(Icons.refresh_rounded,
                  color: AppColors.accent, size: 20),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (_rows == null)
          const ListSkeleton(count: 3, itemHeight: 120)
        else if (_rows!.isEmpty)
          const EmptyState(
            icon: Icons.health_and_safety_rounded,
            title: 'Nenhum alerta',
            message:
                'Sem alertas SOS nesta vista. Se activares SOS na app, '
                'o alerta aparece aqui em tempo real.',
          )
        else
          for (final a in _rows!)
            _SosCard(
              a: a,
              onAck: () => _setStatus(a, 'acknowledged'),
              onResolve: () => _setStatus(a, 'resolved'),
              onFalse: () => _setStatus(a, 'false_alarm'),
            ).animate().fadeIn(duration: 180.ms),
      ],
    );
  }
}

class _SosCard extends StatelessWidget {
  const _SosCard({
    required this.a,
    required this.onAck,
    required this.onResolve,
    required this.onFalse,
  });

  final SosAlertRow a;
  final VoidCallback onAck;
  final VoidCallback onResolve;
  final VoidCallback onFalse;

  @override
  Widget build(BuildContext context) {
    final (statusLabel, statusColor) = a.statusInfo;
    final active = a.status == 'active' || a.status == 'acknowledged';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: a.status == 'active'
            ? AppColors.danger.withOpacity(0.10)
            : AppColors.glassFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: a.status == 'active'
              ? AppColors.danger.withOpacity(0.5)
              : AppColors.glassBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.emergency_rounded,
                  color: statusColor, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  '${a.city ?? 'Local desconhecido'}'
                  '${a.countryId != null ? ' (${a.countryId})' : ''}',
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 13.5,
                  ),
                ),
              ),
              Text(
                statusLabel,
                style: TextStyle(
                  color: statusColor,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (a.bloodType != null)
            KeyValueRow('Grupo sanguíneo', a.bloodType!,
                icon: Icons.water_drop_rounded),
          if (a.chronicConditions.isNotEmpty)
            KeyValueRow(
                'Condições', a.chronicConditions.join(', '),
                icon: Icons.medical_information_rounded),
          if (a.allergies.isNotEmpty)
            KeyValueRow('Alergias', a.allergies.join(', '),
                icon: Icons.warning_amber_rounded),
          KeyValueRow('Activado às', formatDateTime(a.activatedAt),
              icon: Icons.schedule_rounded),
          if (a.latitude != null && a.longitude != null)
            TextButton.icon(
              onPressed: () => launchUrl(
                  Uri.parse(
                      'https://www.google.com/maps?q=${a.latitude},${a.longitude}'),
                  mode: LaunchMode.externalApplication),
              icon: const Icon(Icons.map_rounded, size: 15),
              label: const Text('Ver localização no Maps'),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.danger,
                textStyle: const TextStyle(fontSize: 12),
              ),
            ),
          if (active)
            Row(
              children: [
                if (a.status == 'active')
                  Expanded(
                    child: GradientButton(
                      label: 'Reconhecer',
                      icon: Icons.touch_app_rounded,
                      height: 40,
                      onPressed: onAck,
                    ),
                  ),
                const SizedBox(width: 8),
                Expanded(
                  child: GlassGhostButton(
                    label: 'Resolvido',
                    height: 40,
                    onPressed: onResolve,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: GlassGhostButton(
                    label: 'Falso',
                    height: 40,
                    onPressed: onFalse,
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}
