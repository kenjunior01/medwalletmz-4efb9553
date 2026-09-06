import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../../core/widgets/skeleton.dart';
import '../../earn/data/proposal_models.dart';
import '../data/manager_models.dart';
import 'manager_controller.dart';
import 'manager_growth_panels.dart';
import 'manager_ops_panels.dart';
import 'manager_widgets.dart';
import 'meddy_copilot_sheet.dart';

/// Consola completa de gestão de um país — 10 secções:
/// visão geral, submissões, instituições, KPIs, metas, conteúdo,
/// pagamentos, utilizadores, SOS e configuração.
class ManagerConsoleScreen extends ConsumerStatefulWidget {
  const ManagerConsoleScreen({super.key, this.countryId});

  final String? countryId;

  @override
  ConsumerState<ManagerConsoleScreen> createState() =>
      _ManagerConsoleScreenState();
}

class _ManagerConsoleScreenState extends ConsumerState<ManagerConsoleScreen> {
  String? _country;
  String _section = 'overview';

  static const _sections = <(String, String, IconData)>[
    ('overview', 'Visão geral', Icons.dashboard_rounded),
    ('submissions', 'Submissões', Icons.inbox_rounded),
    ('institutions', 'Instituições', Icons.local_pharmacy_rounded),
    ('kpis', 'KPIs', Icons.monitoring_rounded),
    ('goals', 'Metas', Icons.flag_rounded),
    ('content', 'Conteúdo', Icons.campaign_rounded),
    ('payments', 'Pagamentos', Icons.payments_rounded),
    ('users', 'Utilizadores', Icons.people_alt_rounded),
    ('sos', 'SOS', Icons.emergency_rounded),
    ('config', 'Configuração', Icons.tune_rounded),
  ];

  @override
  void initState() {
    super.initState();
    _country = widget.countryId;
  }

  @override
  Widget build(BuildContext context) {
    final countries = ref.watch(managerCountriesProvider);

    if (_country == null && countries.value?.isNotEmpty == true) {
      _country = countries.value!.first.id;
    }
    CountryFull? country;
    for (final c in countries.value ?? const <CountryFull>[]) {
      if (c.id == _country) country = c;
    }

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              // ── Cabeçalho ────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 4, 20, 0),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => context.pop(),
                      icon: const Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            country?.name ?? _country ?? 'Consola',
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          Text(
                            'Consola de gestão · '
                            '${country?.currencyCode ?? ''}',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.45),
                              fontSize: 11.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: 'Perguntar ao Meddy',
                      onPressed: () {
                        if (_country == null) return;
                        final s = ref
                            .read(countryStatsProvider(_country!))
                            .valueOrNull;
                        MeddyCopilotSheet.show(
                          context,
                          buildContext: () => buildManagerContext(
                            countries: countries.value ?? const [],
                            stats: {
                              if (s != null) _country!: s,
                            },
                            focusCountry: _country,
                          ),
                          suggestions: [
                            'Resume o estado do país e os riscos.',
                            'Que submissões devo prioritizar?',
                            'Como crescer as instituições este trimestre?',
                          ],
                        );
                      },
                      icon: const Icon(Icons.auto_awesome_rounded,
                          color: Color(0xFF38BDF8)),
                    ),
                  ],
                ),
              ),

              // ── Selector de país ─────────────────────────────────
              if ((countries.value?.length ?? 0) > 1)
                SizedBox(
                  height: 42,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    children: [
                      for (final c in countries.value!)
                        Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: FilterChip2(
                            label: '${c.flagUrl ?? ''} ${c.name}'.trim(),
                            selected: _country == c.id,
                            onTap: () => setState(() => _country = c.id),
                          ),
                        ),
                    ],
                  ),
                ),

              // ── Secções ──────────────────────────────────────────
              SizedBox(
                height: 44,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.fromLTRB(20, 6, 20, 0),
                  children: [
                    for (final (key, label, icon) in _sections)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: FilterChip2(
                          label: label,
                          selected: _section == key,
                          onTap: () => setState(() => _section = key),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 6),

              // ── Conteúdo ─────────────────────────────────────────
              Expanded(
                child: _country == null
                    ? const EmptyState(
                        icon: Icons.public_rounded,
                        title: 'Sem país',
                        message: 'Não há países associados ao teu papel.',
                      )
                    : RefreshIndicator(
                        color: AppColors.accent,
                        backgroundColor: AppColors.bgHigh,
                        onRefresh: () async {
                          ref.invalidate(countryStatsProvider(_country!));
                        },
                        child: ListView(
                          padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
                          children: [
                            _buildSection(),
                          ],
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSection() {
    final id = _country!;
    switch (_section) {
      case 'submissions':
        return const _SubmissionsPanel();
      case 'institutions':
        return InstitutionsPanel(countryId: id);
      case 'kpis':
        return KpisPanel(countryId: id);
      case 'goals':
        return GoalsPanel(countryId: id);
      case 'content':
        return ContentPanel(countryId: id);
      case 'payments':
        return PaymentsPanel(countryId: id);
      case 'users':
        return UsersPanel(countryId: id);
      case 'sos':
        return SosMonitorPanel(countryId: id);
      case 'config':
        return ConfigPanel(countryId: id);
      default:
        return _OverviewPanel(countryId: id);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// Visão geral
// ═══════════════════════════════════════════════════════════════════

class _OverviewPanel extends ConsumerWidget {
  const _OverviewPanel({required this.countryId});

  final String countryId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stats = ref.watch(countryStatsProvider(countryId));

    return stats.when(
      loading: () => const Padding(
        padding: EdgeInsets.only(top: 40),
        child: ListSkeleton(count: 2, itemHeight: 120),
      ),
      error: (e, _) => const EmptyState(
        icon: Icons.error_outline_rounded,
        title: 'Erro',
        message: 'Não foi possível carregar as estatísticas.',
      ),
      data: (s) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.55,
            children: [
              StatCard(
                label: 'Utilizadores',
                value: '${s.users}',
                icon: Icons.people_alt_rounded,
                color: const Color(0xFF38BDF8),
              ),
              StatCard(
                label: 'Instituições na rede',
                value: '${s.institutions}',
                icon: Icons.local_pharmacy_rounded,
                color: AppColors.success,
                sub: '${s.stores} farm · ${s.clinics} clin',
              ),
              StatCard(
                label: 'Consultas',
                value: '${s.consultations}',
                icon: Icons.medical_services_rounded,
                color: const Color(0xFFA78BFA),
              ),
              StatCard(
                label: 'Triagens',
                value: '${s.triages}',
                icon: Icons.health_and_safety_rounded,
                color: const Color(0xFFFBBF24),
              ),
              StatCard(
                label: 'Submissões pendentes',
                value: '${s.pendingProposals}',
                icon: Icons.inbox_rounded,
                color: const Color(0xFFF87171),
              ),
              StatCard(
                label: 'Instituições aprovadas (crowd)',
                value: '${s.approvedProposals}',
                icon: Icons.verified_rounded,
                color: AppColors.success,
              ),
            ],
          ),
          const SizedBox(height: 18),
          SectionTitle(
            'Acções prioritárias',
            subtitle: 'Atalhos para o que costuma precisar de atenção '
                'primeiro.',
          ),
          Row(
            children: [
              Expanded(
                child: _ActionTile(
                  icon: Icons.inbox_rounded,
                  label: 'Rever submissões',
                  badge: s.pendingProposals,
                  onTap: () => context.push('/manager-console',
                      extra: countryId),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _ActionTile(
                  icon: Icons.payments_rounded,
                  label: 'Confirmar M-Pesa',
                  badge: s.pendingPayments,
                  onTap: () => context.push('/manager-console',
                      extra: countryId),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _ActionTile(
                  icon: Icons.campaign_rounded,
                  label: 'Publicar conteúdo',
                  onTap: () => context.push('/manager-console',
                      extra: countryId),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _ActionTile(
                  icon: Icons.emergency_rounded,
                  label: 'Monitor SOS',
                  badge: s.activeSos,
                  danger: s.activeSos > 0,
                  onTap: () => context.push('/manager-console',
                      extra: countryId),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ActionTile extends StatelessWidget {
  const _ActionTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.badge = 0,
    this.danger = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final int badge;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final showBadge = badge > 0;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: danger
              ? AppColors.danger.withOpacity(0.12)
              : AppColors.glassFill,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: danger
                ? AppColors.danger.withOpacity(0.4)
                : AppColors.glassBorder,
          ),
        ),
        child: Row(
          children: [
            Icon(icon,
                color: danger ? AppColors.danger : AppColors.accent,
                size: 22),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                label,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 12.8,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            if (showBadge)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: danger
                      ? AppColors.danger
                      : const Color(0xFF38BDF8),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '$badge',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// Submissões (pendentes + histórico) — aprovar/rejeitar
// ═══════════════════════════════════════════════════════════════════

class _SubmissionsPanel extends ConsumerStatefulWidget {
  const _SubmissionsPanel();

  @override
  ConsumerState<_SubmissionsPanel> createState() =>
      _SubmissionsPanelState();
}

class _SubmissionsPanelState extends ConsumerState<_SubmissionsPanel> {
  bool _history = false;

  @override
  Widget build(BuildContext context) {
    final countryId =
        context.findAncestorStateOfType<_ManagerConsoleScreenState>()!._country!;
    final stream = _history
        ? ref.watch(managerProposalHistoryProvider(countryId))
        : ref.watch(managerPendingProposalsProvider(countryId));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            FilterChip2(
              label: 'Por rever',
              selected: !_history,
              onTap: () => setState(() => _history = false),
            ),
            const SizedBox(width: 8),
            FilterChip2(
              label: 'Histórico',
              selected: _history,
              onTap: () => setState(() => _history = true),
              color: AppColors.success,
            ),
          ],
        ),
        const SizedBox(height: 14),
        stream.when(
          loading: () => const ListSkeleton(count: 3, itemHeight: 180),
          error: (e, _) => const EmptyState(
            icon: Icons.error_outline_rounded,
            title: 'Erro',
            message: 'Não foi possível carregar as submissões.',
          ),
          data: (list) {
            if (list.isEmpty) {
              return EmptyState(
                icon: _history
                    ? Icons.history_rounded
                    : Icons.verified_rounded,
                title: _history ? 'Sem histórico' : 'Tudo validado',
                message: _history
                    ? 'Ainda não há submissões processadas neste país.'
                    : 'Não há submissões à espera de revisão. Novas '
                        'entradas da comunidade aparecem aqui em tempo '
                        'real.',
              );
            }
            return Column(
              children: [
                for (final p in list)
                  ProposalReviewCard(
                    p: p,
                    canReview: !_history,
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}

/// Cartão de revisão de submissão — reutilizado pela consola.
class ProposalReviewCard extends ConsumerWidget {
  const ProposalReviewCard({
    super.key,
    required this.p,
    required this.canReview,
  });

  final ProposalRow p;
  final bool canReview;

  Future<void> _approve(BuildContext context, WidgetRef ref) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      final res =
          await ref.read(managerRepositoryProvider).approve(p.id);
      final reward = res['reward_amount'];
      final currency = res['currency'] ?? 'MZN';
      messenger.showSnackBar(SnackBar(
        backgroundColor: AppColors.success,
        content: Text(
          'Aprovada e publicada! Recompensa real creditada na carteira '
          'do contribuidor'
          '${reward != null ? ' (${reward} $currency)' : ''}.',
        ),
      ));
    } catch (_) {
      messenger.showSnackBar(const SnackBar(
        backgroundColor: AppColors.danger,
        content: Text('Falhou a aprovação — confirma o teu papel de '
            'gestor deste país.'),
      ));
    }
  }

  Future<void> _reject(BuildContext context, WidgetRef ref) async {
    final notesCtrl = TextEditingController();
    final confirmed = await showModalBottomSheet<bool>(
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
              'Rejeitar submissão',
              style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 17,
                  fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(
              'Explica a razão — o contribuidor vê esta nota e não '
              'recebe recompensa.',
              style: TextStyle(
                  color: Colors.white.withOpacity(0.55), fontSize: 12.5),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: notesCtrl,
              maxLines: 3,
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: const InputDecoration(
                  hintText:
                      'Ex.: telefone incompleto, já existe no directório…'),
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
                    label: 'Rejeitar',
                    icon: Icons.block_rounded,
                    onPressed: () => Navigator.of(ctx).pop(true),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
    if (confirmed != true) return;
    if (!context.mounted) return;
    try {
      await ref
          .read(managerRepositoryProvider)
          .reject(p.id,
              notesCtrl.text.trim().isEmpty ? null : notesCtrl.text.trim());
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Submissão rejeitada.')),
        );
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              backgroundColor: AppColors.danger,
              content: Text('Falhou a rejeição — confirma o teu papel.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final (label, icon, color) = entityTypeInfo(p.entityType);
    final (statusLabel, statusColor) = _statusInfo(p.status);

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(20),
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
                decoration: BoxDecoration(
                  color: color.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: Icon(icon, color: color, size: 21),
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
                        fontWeight: FontWeight.w800,
                        fontSize: 14.5,
                      ),
                    ),
                    Text(
                      '$label · ${p.city}${p.countryId != 'MZ' ? ' (${p.countryId})' : ''}',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.5),
                        fontSize: 11.5,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  statusLabel,
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (p.address?.isNotEmpty == true)
            KeyValueRow('Endereço', p.address!, icon: Icons.place_rounded),
          if (p.neighborhood?.isNotEmpty == true)
            KeyValueRow('Bairro', p.neighborhood!, icon: Icons.map_rounded),
          if (p.referencePoint?.isNotEmpty == true)
            KeyValueRow(
                'Referência/Paragem', p.referencePoint!,
                icon: Icons.directions_bus_rounded),
          if (p.phone?.isNotEmpty == true)
            KeyValueRow('Telefone', p.phone!, icon: Icons.call_rounded),
          KeyValueRow('Recompensa',
              p.rewardAmount == null
                  ? '—'
                  : '${p.rewardAmount!.toStringAsFixed(0)} ${p.rewardCurrency ?? 'MZN'} (dinheiro real)',
              icon: Icons.payments_rounded),
          if (p.reviewNotes?.isNotEmpty == true)
            KeyValueRow('Nota da revisão', p.reviewNotes!,
                icon: Icons.sticky_note_2_rounded),
          if (p.allPhotos.isNotEmpty) ...[
            const SizedBox(height: 10),
            SizedBox(
              height: 74,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount:
                    p.allPhotos.length.clamp(0, 4),
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, i) {
                  final path = p.allPhotos[i];
                  final url = path.startsWith('http')
                      ? path
                      : Supabase.instance.client.storage
                          .from('proposal-photos')
                          .getPublicUrl(path);
                  return ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.network(
                      url,
                      width: 96,
                      height: 74,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        width: 96,
                        height: 74,
                        color: AppColors.glassFill,
                        child: const Icon(Icons.broken_image_rounded,
                            color: AppColors.textMuted, size: 20),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
          const SizedBox(height: 6),
          Row(
            children: [
              Text(
                formatRelative(p.createdAt),
                style: TextStyle(
                  color: Colors.white.withOpacity(0.4),
                  fontSize: 11,
                ),
              ),
              const Spacer(),
              TextButton.icon(
                onPressed: () => launchUrl(
                    Uri.parse(
                        'https://www.google.com/maps/search/?api=1&query=${p.latitude ?? ''},${p.longitude ?? ''}'),
                    mode: LaunchMode.externalApplication),
                icon: const Icon(Icons.map_rounded, size: 16),
                label: const Text('Mapa'),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.accent,
                  textStyle: const TextStyle(fontSize: 12),
                ),
              ),
              if (canReview) ...[
                const SizedBox(width: 4),
                GradientButton(
                  label: 'Aprovar',
                  icon: Icons.check_rounded,
                  height: 40,
                  onPressed: () => _approve(context, ref),
                ),
                const SizedBox(width: 8),
                GlassGhostButton(
                  label: 'Rejeitar',
                  height: 40,
                  onPressed: () => _reject(context, ref),
                ),
              ],
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 220.ms).slideY(
          begin: 0.05,
          curve: Curves.easeOutCubic,
        );
  }
}

(String, Color) _statusInfo(String s) => switch (s) {
      'pending' || 'in_review' => ('Por rever', AppColors.warning),
      'approved' => ('Aprovada', AppColors.success),
      'rejected' => ('Rejeitada', AppColors.danger),
      'duplicate' => ('Duplicada', AppColors.textMuted),
      'merged' => ('Fundida', AppColors.textMuted),
      _ => (s, AppColors.textMuted),
    };
