import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../../core/widgets/skeleton.dart';
import '../../earn/data/proposal_models.dart';
import '../data/regional_models.dart';
import 'regional_controller.dart';

/// Painel de gestão regional — revisão de submissões de instituições
/// do país (aprovar/rejeitar com RPCs oficiais), KPIs e metas
/// trimestrais. Visível apenas a gestores (country_manager, admin,
/// regional_manager, regional_ceo).
class RegionalDashboardScreen extends ConsumerStatefulWidget {
  const RegionalDashboardScreen({super.key});

  @override
  ConsumerState<RegionalDashboardScreen> createState() =>
      _RegionalDashboardScreenState();
}

class _RegionalDashboardScreenState
    extends ConsumerState<RegionalDashboardScreen> {
  String? _country;
  String _tab = 'pendentes'; // pendentes | kpis | metas

  @override
  Widget build(BuildContext context) {
    final access = ref.watch(regionalAccessProvider);
    final countries = ref.watch(managerCountriesProvider);

    // Selecciona o primeiro país assim que a lista chega.
    if (_country == null && countries.value != null && countries.value!.isNotEmpty) {
      _country = countries.value!.first.id;
    }

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: access.when(
            loading: () => const Center(
              child: CircularProgressIndicator(color: AppColors.accent),
            ),
            error: (e, _) => EmptyState(
              icon: Icons.error_outline_rounded,
              title: 'Erro ao verificar papéis',
              message: 'Verifica a ligação e tenta novamente.',
              actionLabel: 'Recarregar',
              onAction: () => ref.invalidate(regionalAccessProvider),
            ),
            data: (managed) {
              // managed == null → admin global (acesso a todos os países).
              final hasAccess = managed == null || managed.isNotEmpty;
              if (!hasAccess) return const _NoAccess();
              return _Dashboard(
                countries: countries.value ?? const [],
                countryId: _country,
                onCountry: (id) => setState(() => _country = id),
                tab: _tab,
                onTab: (t) => setState(() => _tab = t),
                isAdminGlobal: managed == null,
              );
            },
          ),
        ),
      ),
    );
  }
}

// ── Sem acesso ──────────────────────────────────────────────────────────

class _NoAccess extends StatelessWidget {
  const _NoAccess();

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
                'Gestão Regional',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 40),
        const EmptyState(
          icon: Icons.shield_rounded,
          title: 'Área reservada a gestores',
          message:
              'Este painel é para gestores regionais/país: validar '
              'instituições submetidas pela comunidade, acompanhar KPIs e '
              'metas. Se deverias ter acesso, fala com a administração '
              'para receber o papel de country_manager.',
        ),
      ],
    );
  }
}

// ── Dashboard ───────────────────────────────────────────────────────────

class _Dashboard extends ConsumerWidget {
  const _Dashboard({
    required this.countries,
    required this.countryId,
    required this.onCountry,
    required this.tab,
    required this.onTab,
    required this.isAdminGlobal,
  });

  final List<CountryLite> countries;
  final String? countryId;
  final ValueChanged<String> onCountry;
  final String tab;
  final ValueChanged<String> onTab;
  final bool isAdminGlobal;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
                'Gestão Regional',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          'Crescimento da rede institucional, validação da comunidade e '
          'desempenho do país.',
          style: TextStyle(
            color: Colors.white.withOpacity(0.55),
            fontSize: 12.5,
            height: 1.4,
          ),
        ),
        const SizedBox(height: 14),

        // ── Selector de país ───────────────────────────────────────
        if (countries.isNotEmpty)
          SizedBox(
            height: 40,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                for (final c in countries)
                  _CountryChip(
                    label: '${c.flagUrl ?? ''} ${c.name}'.trim(),
                    selected: countryId == c.id,
                    onTap: () => onCountry(c.id),
                  ),
              ],
            ),
          )
        else
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.warning.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Text(
              'Sem país associado ao teu papel. A administração precisa de '
              'criar uma entrada em user_roles (role country_manager + '
              'country_id) ou country_management.',
              style: TextStyle(color: AppColors.warning, fontSize: 12.3,
                  height: 1.45),
            ),
          ),
        const SizedBox(height: 14),

        // ── Tabs ───────────────────────────────────────────────────
        Row(
          children: [
            for (final (key, label, icon) in const [
              ('pendentes', 'Pendentes', Icons.inbox_rounded),
              ('kpis', 'KPIs', Icons.insights_rounded),
              ('metas', 'Metas', Icons.flag_rounded),
            ])
              _TabChip(
                label: label,
                icon: icon,
                selected: tab == key,
                onTap: () => onTab(key),
              ),
          ],
        ),
        const SizedBox(height: 14),

        if (countryId == null)
          const EmptyState(
            icon: Icons.public_rounded,
            title: 'Escolhe um país',
            message: 'Selecciona um dos países que geres para ver o '
                'conteúdo.',
          )
        else if (tab == 'pendentes')
          _PendingList(countryId: countryId!)
        else if (tab == 'kpis')
          _KpiPanel(countryId: countryId!)
        else
          _GoalsPanel(countryId: countryId!),
      ],
    );
  }
}

// ── Lista pendente ──────────────────────────────────────────────────────

class _PendingList extends ConsumerWidget {
  const _PendingList({required this.countryId});

  final String countryId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pending =
        ref.watch(regionalRepositoryProvider).watchPending(countryId);

    return StreamBuilder<List<PlaceProposal>>(
      stream: pending,
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting && !snap.hasData) {
          return const ListSkeleton(count: 3, itemHeight: 200);
        }
        final list = snap.data ?? const [];
        if (list.isEmpty) {
          return const EmptyState(
            icon: Icons.verified_rounded,
            title: 'Tudo validado',
            message:
                'Não há submissões pendentes neste país. As novas entradas '
                'da comunidade aparecem aqui em tempo real.',
          );
        }
        return Column(
          children: list
              .map((p) => _ReviewCard(p: p))
              .toList(),
        );
      },
    );
  }
}

class _ReviewCard extends ConsumerWidget {
  const _ReviewCard({required this.p});

  final PlaceProposal p;

  Future<void> _approve(BuildContext context, WidgetRef ref) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      final res = await ref.read(regionalRepositoryProvider).approve(p.id);
      final reward = res['reward_amount'];
      final currency = res['currency'] ?? 'MZN';
      messenger.showSnackBar(SnackBar(
        backgroundColor: AppColors.success,
        content: Text(
          'Aprovada e publicada! Recompensa creditada'
          '${reward != null ? ' (${reward} ${currency})' : ''}.',
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
          gradient: LinearGradient(
              colors: [AppColors.bgHigh, AppColors.bgDeep]),
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
              'Explica a razão — o contribuidor vê esta nota no estado da '
              'submissão.',
              style: TextStyle(
                  color: Colors.white.withOpacity(0.55), fontSize: 12.5),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: notesCtrl,
              maxLines: 3,
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: const InputDecoration(
                  hintText: 'Ex.: telefone incompleto, já existe no '
                      'directório…'),
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
          .read(regionalRepositoryProvider)
          .reject(p.id, notesCtrl.text.trim().isEmpty ? null : notesCtrl.text.trim());
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
          // Cabeçalho
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
            ],
          ),

          // Fotos do exterior
          if (p.allPhotos.isNotEmpty) ...[
            const SizedBox(height: 12),
            SizedBox(
              height: 86,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: p.allPhotos.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, i) => ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.network(
                    p.allPhotos[i],
                    width: 92,
                    height: 86,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      width: 92,
                      height: 86,
                      color: Colors.white.withOpacity(0.05),
                      alignment: Alignment.center,
                      child: const Icon(Icons.broken_image_rounded,
                          color: AppColors.textMuted, size: 20),
                    ),
                  ),
                ),
              ),
            ),
          ],

          // Dados de contexto
          const SizedBox(height: 12),
          _DetailRow(
              icon: Icons.location_city_rounded,
              text: [p.neighborhood, p.address].nonNullsLabel),
          if (p.referencePoint != null)
            _DetailRow(
                icon: Icons.directions_bus_rounded,
                text: 'Referência: ${p.referencePoint}'),
          if (p.phone != null)
            GestureDetector(
              onTap: () => launchUrl(Uri.parse('tel:${p.phone}')),
              child: const _DetailRow(
                  icon: Icons.phone_rounded, text: 'Ligar ao contribuidor'),
            ),
          if (p.latitude != null && p.longitude != null)
            GestureDetector(
              onTap: () => launchUrl(Uri.parse(
                  'https://www.google.com/maps/search/?api=1&query='
                  '${p.latitude},${p.longitude}')),
              child: const _DetailRow(
                  icon: Icons.map_rounded,
                  text: 'Abrir localização no Google Maps'),
            ),
          if (p.description != null && p.description!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                p.description!,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.55),
                  fontSize: 12,
                  height: 1.45,
                ),
              ),
            ),

          // Ações
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: GlassGhostButton(
                  label: 'Rejeitar',
                  icon: Icons.close_rounded,
                  danger: true,
                  height: 46,
                  onPressed: () => _reject(context, ref),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: GradientButton(
                  label: 'Aprovar',
                  icon: Icons.check_rounded,
                  height: 46,
                  onPressed: () => _approve(context, ref),
                ),
              ),
            ],
          ),
        ],
      ),
    )
        .animate(delay: 45.ms)
        .fadeIn(duration: 260.ms)
        .slideY(begin: 0.07, curve: Curves.easeOutCubic);
  }
}

extension NonNullJoin on List<String?> {
  String get nonNullsLabel =>
      where((s) => s != null && s.isNotEmpty).join(', ');
}

// ── Detalhe ─────────────────────────────────────────────────────────────

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Row(
        children: [
          Icon(icon, size: 15, color: AppColors.textMuted),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                color: Colors.white.withOpacity(0.66),
                fontSize: 12.3,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── KPIs ────────────────────────────────────────────────────────────────

class _KpiPanel extends ConsumerStatefulWidget {
  const _KpiPanel({required this.countryId});

  final String countryId;

  @override
  ConsumerState<_KpiPanel> createState() => _KpiPanelState();
}

class _KpiPanelState extends ConsumerState<_KpiPanel> {
  late Future<List<RegionalKpi>> _future;

  @override
  void initState() {
    super.initState();
    _future =
        ref.read(regionalRepositoryProvider).fetchKpis(widget.countryId);
  }

  @override
  void didUpdateWidget(covariant _KpiPanel old) {
    super.didUpdateWidget(old);
    if (old.countryId != widget.countryId) {
      _future =
          ref.read(regionalRepositoryProvider).fetchKpis(widget.countryId);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<RegionalKpi>>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const ListSkeleton(count: 3, itemHeight: 90);
        }
        final all = snap.data ?? const [];

        // Último valor por kpi_key.
        final latest = <String, RegionalKpi>{};
        for (final k in all) {
          latest.putIfAbsent(k.kpiKey, () => k);
        }
        if (latest.isEmpty) {
          return const EmptyState(
            icon: Icons.insights_rounded,
            title: 'Sem KPIs registados',
            message:
                'Os KPIs regionais aparecem aqui quando a equipa central '
                'os publicar para este país.',
          );
        }
        return Column(
          children: [
            for (final k in latest.values)
              Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.glassFill,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.glassBorder),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _kpiLabel(k.kpiKey),
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.w700,
                              fontSize: 13.2,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            '${formatDateShort(k.recordedAt)}'
                            '${k.previousValue != null ? ' · anterior ${_num(k.previousValue!)}' : ''}',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.45),
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '${_num(k.kpiValue)}${k.kpiUnit ?? ''}',
                      style: const TextStyle(
                        color: AppColors.accent,
                        fontWeight: FontWeight.w800,
                        fontSize: 15.5,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        );
      },
    );
  }
}

String _num(double v) => v == v.roundToDouble()
    ? v.toInt().toString()
    : v.toStringAsFixed(2).replaceAll('.', ',');

String _kpiLabel(String key) => switch (key) {
      'health_score' => 'Índice de saúde',
      'medication_adherence' => 'Adesão à medicação',
      'active_users' => 'Utilizadores activos',
      'consultations_per_1000' => 'Consultas / 1000 hab.',
      'partner_satisfaction' => 'Satisfação de parceiros',
      'sos_response_time' => 'Tempo médio SOS',
      _ => key,
    };

// ── Metas ───────────────────────────────────────────────────────────────

class _GoalsPanel extends ConsumerStatefulWidget {
  const _GoalsPanel({required this.countryId});

  final String countryId;

  @override
  ConsumerState<_GoalsPanel> createState() => _GoalsPanelState();
}

class _GoalsPanelState extends ConsumerState<_GoalsPanel> {
  late Future<List<RegionalGoal>> _future;

  @override
  void initState() {
    super.initState();
    _future =
        ref.read(regionalRepositoryProvider).fetchGoals(widget.countryId);
  }

  @override
  void didUpdateWidget(covariant _GoalsPanel old) {
    super.didUpdateWidget(old);
    if (old.countryId != widget.countryId) {
      _future =
          ref.read(regionalRepositoryProvider).fetchGoals(widget.countryId);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<RegionalGoal>>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const ListSkeleton(count: 3, itemHeight: 96);
        }
        final goals = snap.data ?? const [];
        if (goals.isEmpty) {
          return const EmptyState(
            icon: Icons.flag_rounded,
            title: 'Sem metas definidas',
            message:
                'As metas trimestrais do país aparecem aqui quando forem '
                'definidas pela equipa regional.',
          );
        }
        return Column(
          children: [
            for (final g in goals)
              Container(
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
                            '${_goalLabel(g.goalKey)} · ${g.quarter}',
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.w700,
                              fontSize: 13.2,
                            ),
                          ),
                        ),
                        _GoalStatusChip(status: g.status),
                      ],
                    ),
                    const SizedBox(height: 10),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(5),
                      child: LinearProgressIndicator(
                        value: (g.progress / 100).clamp(0, 1),
                        minHeight: 7,
                        backgroundColor: Colors.white.withOpacity(0.08),
                        valueColor: AlwaysStoppedAnimation(
                            _goalColor(g.status)),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${_num(g.currentValue)} / ${_num(g.goalValue)}'
                      '${g.goalUnit != null ? ' ${g.goalUnit}' : ''} '
                      '(${g.progress.toStringAsFixed(0)}%)',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.5),
                        fontSize: 11.5,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        );
      },
    );
  }
}

Color _goalColor(String status) => switch (status) {
      'achieved' || 'exceeded' => AppColors.success,
      'on_track' => AppColors.accent,
      'at_risk' => AppColors.warning,
      _ => AppColors.danger,
    };

String _goalLabel(String key) => switch (key) {
      'institutions_published' => 'Instituições publicadas',
      'active_users' => 'Utilizadores activos',
      'consultations' => 'Consultas realizadas',
      'contributors' => 'Contribuidores activos',
      _ => key,
    };

class _GoalStatusChip extends StatelessWidget {
  const _GoalStatusChip({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final label = switch (status) {
      'on_track' => 'No caminho',
      'at_risk' => 'Em risco',
      'behind' => 'Atrasada',
      'achieved' => 'Alcançada',
      'exceeded' => 'Superada',
      _ => status,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: _goalColor(status).withOpacity(0.14),
        borderRadius: BorderRadius.circular(9),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: _goalColor(status),
          fontSize: 10,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

// ── Chips de país/tabs ──────────────────────────────────────────────────

class _CountryChip extends StatelessWidget {
  const _CountryChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected
              ? const Color(0x2E38BDF8)
              : Colors.white.withOpacity(0.04),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected
                ? const Color(0x5538BDF8)
                : Colors.white.withOpacity(0.08),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? AppColors.accent : AppColors.textMuted,
            fontSize: 12.5,
            fontWeight: selected ? FontWeight.w800 : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

class _TabChip extends StatelessWidget {
  const _TabChip({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 8),
        decoration: BoxDecoration(
          color: selected
              ? const Color(0x1A38BDF8)
              : Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected
                ? const Color(0x5538BDF8)
                : Colors.white.withOpacity(0.07),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon,
                size: 15,
                color: selected ? AppColors.accent : AppColors.textMuted),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color:
                    selected ? AppColors.accent : AppColors.textMuted,
                fontSize: 12.3,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
