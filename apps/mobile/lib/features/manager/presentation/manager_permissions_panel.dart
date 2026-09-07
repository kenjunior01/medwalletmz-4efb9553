import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/manager_models.dart';
import 'manager_controller.dart';
import 'manager_widgets.dart';

/// Catálogo de permissões granulares (espelha `manager_permissions`).
const kPermissionCatalog = <(String, String, IconData)>[
  ('can_approve_doctors', 'Aprovar médicos', Icons.medical_services_rounded),
  ('can_approve_pharmacies', 'Aprovar farmácias', Icons.local_pharmacy_rounded),
  ('can_approve_institutions', 'Aprovar instituições', Icons.apartment_rounded),
  ('can_view_financials', 'Ver financeiros', Icons.payments_rounded),
  ('can_export_data', 'Exportar dados', Icons.ios_share_rounded),
  ('can_manage_drivers', 'Gerir riders', Icons.pedal_bike_rounded),
  ('can_manage_coupons', 'Gerir cupões', Icons.local_offer_rounded),
  ('can_manage_settings', 'Gerir definições', Icons.tune_rounded),
  ('can_manage_content', 'Gerir banners', Icons.campaign_rounded),
];

// ═══════════════════════════════════════════════════════════════════
// Painel "Permissões & Limites" — o que o gestor actual pode fazer
// e até onde pode ir (limites quantitativos).
// ═══════════════════════════════════════════════════════════════════

class PermissionsPanel extends ConsumerStatefulWidget {
  const PermissionsPanel({super.key, required this.countryId});

  final String countryId;

  @override
  ConsumerState<PermissionsPanel> createState() => _PermissionsPanelState();
}

class _PermissionsPanelState extends ConsumerState<PermissionsPanel> {
  Map<String, dynamic>? _perms;
  int? _approvalsToday;
  int _activeContent = 0;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final repo = ref.read(managerRepositoryProvider);
    final results = await Future.wait([
      repo.fetchMyPermissions(),
      repo.approvalsToday(),
      repo.fetchContent(widget.countryId),
    ]);
    final content = List<RegionalContentItem>.from(results[2] as List);
    if (!mounted) return;
    setState(() {
      _perms = results[0] as Map<String, dynamic>?;
      _approvalsToday = results[1] as int?;
      _activeContent = content.where((c) => c.isActive).length;
      _loading = false;
    });
  }

  bool _perm(String key) {
    final p = _perms?['permissions'];
    if (p is Map && p[key] == true) return true;
    return false;
  }

  int? _limit(String key) {
    final l = _perms?['limits'];
    if (l is Map && l[key] != null) return (l[key] as num).toInt();
    return null;
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const ListSkeleton(count: 3, itemHeight: 96);
    }

    final isGlobal = _perms?['is_global'] == true;
    final managed = _perms?['managed'] == true;
    final approvals = _approvalsToday ?? 0;
    final dailyLimit = _limit('daily_approval_limit');
    final contentLimit = _limit('max_active_content');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionTitle(
          'Permissões & Limites',
          subtitle:
              'O que podes fazer na tua região e até onde podes ir. '
              'Os limites são definidos pelo Gestor Global.',
        ),
        if (!managed)
          const EmptyState(
            icon: Icons.gpp_bad_rounded,
            title: 'Sem gestão atribuída',
            message:
                'Não encontrámos um país associado ao teu utilizador. '
                'Fala com o Gestor Global para seres atribuído.',
          )
        else ...[
          // ── Estado global ────────────────────────────────────────
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: isGlobal
                  ? const Color(0x2610B981)
                  : const Color(0x261E6B9C),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isGlobal
                    ? const Color(0xFF10B981)
                    : const Color(0xFF38BDF8),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  isGlobal
                      ? Icons.public_rounded
                      : Icons.map_rounded,
                  color: isGlobal
                      ? const Color(0xFF34D399)
                      : const Color(0xFF7DD3FC),
                  size: 22,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isGlobal
                            ? 'Gestor Global — acesso total'
                            : 'Gestor Regional — $_permsCountry',
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w800,
                          fontSize: 13.5,
                        ),
                      ),
                      Text(
                        isGlobal
                            ? 'Todas as permissões activas, sem limites.'
                            : 'Permissões concedidas pelo Gestor Global.',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.55),
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ).animate().fadeIn(duration: 160.ms),
          const SizedBox(height: 12),

          // ── Limites quantitativos ────────────────────────────────
          _LimitCard(
            icon: Icons.how_to_reg_rounded,
            title: 'Aprovações hoje',
            value: approvals,
            limit: dailyLimit,
            color: const Color(0xFF10B981),
          ),
          _LimitCard(
            icon: Icons.campaign_rounded,
            title: 'Banners activos',
            value: _activeContent,
            limit: contentLimit,
            color: const Color(0xFFF59E0B),
          ),
          const SizedBox(height: 12),

          // ── Grelha de permissões ─────────────────────────────────
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
                  'Permissões activas',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 13.5,
                  ),
                ),
                const SizedBox(height: 10),
                for (final (key, label, icon) in kPermissionCatalog)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 7),
                    child: Row(
                      children: [
                        Container(
                          width: 30,
                          height: 30,
                          decoration: BoxDecoration(
                            color: _perm(key)
                                ? const Color(0x2610B981)
                                : Colors.white.withOpacity(0.04),
                            borderRadius: BorderRadius.circular(9),
                          ),
                          child: Icon(
                            icon,
                            size: 16,
                            color: _perm(key)
                                ? const Color(0xFF34D399)
                                : Colors.white.withOpacity(0.3),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            label,
                            style: TextStyle(
                              color: _perm(key)
                                  ? AppColors.textPrimary
                                  : Colors.white.withOpacity(0.45),
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        Icon(
                          _perm(key)
                              ? Icons.check_circle_rounded
                              : Icons.remove_circle_outline_rounded,
                          size: 17,
                          color: _perm(key)
                              ? const Color(0xFF34D399)
                              : Colors.white.withOpacity(0.25),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'Precisas de mais? O Gestor Global pode ajustar permissões '
            'e limites em Gestão → Equipa.',
            style: TextStyle(
              color: Colors.white.withOpacity(0.4),
              fontSize: 11,
            ),
          ),
        ],
      ],
    );
  }

  String get _permsCountry {
    final c = _perms?['country_id'];
    return c is String ? c : '—';
  }
}

/// Cartão de limite (valor actual vs máximo, com barra de progresso).
class _LimitCard extends StatelessWidget {
  const _LimitCard({
    required this.icon,
    required this.title,
    required this.value,
    required this.limit,
    required this.color,
  });

  final IconData icon;
  final String title;
  final int value;
  final int? limit;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final unlimited = limit == null;
    final pct = unlimited
        ? 0.0
        : (limit! <= 0 ? 1.0 : (value / limit!).clamp(0.0, 1.0));
    final nearLimit = !unlimited && pct >= 0.85;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(15),
        border: Border.all(
          color: nearLimit
              ? color.withOpacity(0.65)
              : AppColors.glassBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Text(
                unlimited ? '$value · sem limite' : '$value / $limit',
                style: TextStyle(
                  color: nearLimit ? color : Colors.white.withOpacity(0.6),
                  fontSize: 11.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          if (!unlimited) ...[
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: pct,
                minHeight: 5,
                backgroundColor: Colors.white.withOpacity(0.08),
                valueColor: AlwaysStoppedAnimation<Color>(
                  nearLimit ? color : color.withOpacity(0.55),
                ),
              ),
            ),
          ],
        ],
      ),
    ).animate().fadeIn(duration: 180.ms);
  }
}

// ═══════════════════════════════════════════════════════════════════
// Editor de permissões (só Gestor Global) — folha modal
// ═══════════════════════════════════════════════════════════════════

class ManagerPermissionsEditorSheet extends ConsumerStatefulWidget {
  const ManagerPermissionsEditorSheet({
    super.key,
    required this.userId,
    required this.countryId,
    required this.userName,
  });

  final String userId;
  final String countryId;
  final String userName;

  static Future<void> show(
    BuildContext context, {
    required String userId,
    required String countryId,
    required String userName,
  }) {
    return showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => ManagerPermissionsEditorSheet(
        userId: userId,
        countryId: countryId,
        userName: userName,
      ),
    );
  }

  @override
  ConsumerState<ManagerPermissionsEditorSheet> createState() =>
      _ManagerPermissionsEditorSheetState();
}

class _ManagerPermissionsEditorSheetState
    extends ConsumerState<ManagerPermissionsEditorSheet> {
  final Map<String, bool> _perms = {
    for (final (k, _, _) in kPermissionCatalog) k: false,
  };
  final _dailyCtrl = TextEditingController();
  final _contentCtrl = TextEditingController();
  bool _loading = true;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _dailyCtrl.dispose();
    _contentCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final row = await ref
        .read(managerRepositoryProvider)
        .fetchManagerPermissions(widget.userId);
    if (!mounted) return;
    if (row != null) {
      for (final key in _perms.keys) {
        _perms[key] = row[key] == true;
      }
      _dailyCtrl.text =
          ((row['daily_approval_limit'] as num?)?.toInt() ?? 100)
              .toString();
      _contentCtrl.text =
          ((row['max_active_content'] as num?)?.toInt() ?? 30)
              .toString();
    } else {
      _dailyCtrl.text = '100';
      _contentCtrl.text = '30';
      // Base útil por omissão: aprovações + conteúdo.
      _perms['can_approve_institutions'] = true;
      _perms['can_approve_doctors'] = true;
      _perms['can_approve_pharmacies'] = true;
      _perms['can_manage_content'] = true;
      _perms['can_view_financials'] = true;
    }
    setState(() => _loading = false);
  }

  Future<void> _save() async {
    setState(() => _busy = true);
    try {
      await ref.read(managerRepositoryProvider).upsertManagerPermissions(
            userId: widget.userId,
            countryId: widget.countryId,
            permissions: _perms,
            dailyApprovalLimit:
                int.tryParse(_dailyCtrl.text.trim()) ?? 100,
            maxActiveContent:
                int.tryParse(_contentCtrl.text.trim()) ?? 30,
          );
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          backgroundColor: AppColors.success,
          content: Text('Permissões de ${widget.userName} actualizadas.'),
        ));
      }
    } catch (_) {
      if (mounted) {
        setState(() => _busy = false);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          backgroundColor: AppColors.danger,
          content: Text(
              'Não foi possível guardar (só o Gestor Global edita '
              'permissões).'),
        ));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(
          22, 18, 22, MediaQuery.of(context).viewInsets.bottom + 20),
      decoration: const BoxDecoration(
        gradient:
            LinearGradient(colors: [AppColors.bgHigh, AppColors.bgDeep]),
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Permissões — ${widget.userName}',
              style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 17,
                  fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 4),
            Text(
              'País: ${widget.countryId} · definido pelo Gestor Global',
              style: TextStyle(
                  color: Colors.white.withOpacity(0.5), fontSize: 12),
            ),
            const SizedBox(height: 14),
            if (_loading)
              const ListSkeleton(count: 4, itemHeight: 44)
            else ...[
              for (final (key, label, icon) in kPermissionCatalog)
                SwitchListTile(
                  value: _perms[key] ?? false,
                  onChanged: (v) => setState(() => _perms[key] = v),
                  activeColor: AppColors.accent,
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  secondary: Icon(icon,
                      color: (_perms[key] ?? false)
                          ? AppColors.accent
                          : Colors.white.withOpacity(0.35),
                      size: 20),
                  title: Text(
                    label,
                    style: const TextStyle(
                        color: AppColors.textPrimary, fontSize: 13.5),
                  ),
                ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _dailyCtrl,
                      keyboardType: TextInputType.number,
                      style: const TextStyle(
                          color: AppColors.textPrimary, fontSize: 13),
                      decoration: const InputDecoration(
                          labelText: 'Limite diário de aprovações'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _contentCtrl,
                      keyboardType: TextInputType.number,
                      style: const TextStyle(
                          color: AppColors.textPrimary, fontSize: 13),
                      decoration: const InputDecoration(
                          labelText: 'Máx. banners activos'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _busy ? null : _save,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.accent,
                    foregroundColor: const Color(0xFF062033),
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                  ),
                  icon: _busy
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Color(0xFF062033)))
                      : const Icon(Icons.save_rounded, size: 19),
                  label: Text(
                    _busy ? 'A guardar…' : 'Guardar permissões',
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
