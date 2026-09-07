import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/manager_models.dart';
import 'manager_controller.dart';
import 'manager_ops_panels.dart';
import 'manager_permissions_panel.dart';
import 'manager_widgets.dart';
import 'meddy_copilot_sheet.dart';

/// Painel do Gestor Global — visão de toda a plataforma:
/// agregados por país, fila de pagamentos, SOS activo, equipa de
/// gestores e atalhos para as consolas.
class GlobalDashboardScreen extends ConsumerStatefulWidget {
  const GlobalDashboardScreen({super.key});

  @override
  ConsumerState<GlobalDashboardScreen> createState() =>
      _GlobalDashboardScreenState();
}

class _GlobalDashboardScreenState
    extends ConsumerState<GlobalDashboardScreen> {
  String _tab = 'paises'; // paises | pagamentos | sos | equipa

  @override
  Widget build(BuildContext context) {
    final access = ref.watch(managerAccessProvider);
    final countries = ref.watch(managerCountriesProvider);
    final globalStats = ref.watch(globalStatsProvider);

    // Acesso só para admin global.
    final isAdmin = access.value == null;

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: access.when(
            loading: () => const Center(
              child:
                  CircularProgressIndicator(color: AppColors.accent),
            ),
            error: (e, _) => const Center(
              child: Text('Erro ao verificar papéis.',
                  style: TextStyle(color: AppColors.textSecondary)),
            ),
            data: (_) {
              if (!isAdmin) {
                return ListView(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
                  children: [
                    _Header(onBack: () => context.pop()),
                    const SizedBox(height: 40),
                    const EmptyState(
                      icon: Icons.shield_rounded,
                      title: 'Só para o Gestor Global',
                      message:
                          'Este painel agrega todos os países e é '
                          'reservado ao papel de administrador global. '
                          'Usa a tua consola de país no hub de gestão.',
                    ),
                  ],
                );
              }

              final list = countries.value ?? const <CountryFull>[];
              final stats = globalStats.value ?? const {};

              // Totais agregados.
              var users = 0,
                  institutions = 0,
                  pending = 0,
                  payments = 0,
                  sos = 0,
                  consultations = 0;
              for (final s in stats.values) {
                users += s.users;
                institutions += s.institutions;
                pending += s.pendingProposals;
                payments += s.pendingPayments;
                sos += s.activeSos;
                consultations += s.consultations;
              }

              return ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
                children: [
                  _Header(onBack: () => context.pop()),
                  const SizedBox(height: 16),

                  // ── Totais da plataforma ─────────────────────────
                  if (globalStats.isLoading)
                    const ListSkeleton(count: 2, itemHeight: 110)
                  else ...[
                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1.55,
                      children: [
                        StatCard(
                          label: 'Utilizadores (todos os países)',
                          value: '$users',
                          icon: Icons.groups_rounded,
                          color: const Color(0xFF38BDF8),
                        ),
                        StatCard(
                          label: 'Instituições na rede',
                          value: '$institutions',
                          icon: Icons.local_pharmacy_rounded,
                          color: AppColors.success,
                        ),
                        StatCard(
                          label: 'Consultas marcadas',
                          value: '$consultations',
                          icon: Icons.medical_services_rounded,
                          color: const Color(0xFFA78BFA),
                        ),
                        StatCard(
                          label: 'Submissões pendentes',
                          value: '$pending',
                          icon: Icons.inbox_rounded,
                          color: AppColors.warning,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _UrgencyTile(
                            icon: Icons.payments_rounded,
                            label: 'M-Pesa por confirmar',
                            value: payments,
                            color: AppColors.warning,
                            onTap: () =>
                                setState(() => _tab = 'pagamentos'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _UrgencyTile(
                            icon: Icons.emergency_rounded,
                            label: 'SOS activos',
                            value: sos,
                            color: AppColors.danger,
                            onTap: () => setState(() => _tab = 'sos'),
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 18),

                  // ── Meddy global ─────────────────────────────────
                  GestureDetector(
                    onTap: () => MeddyCopilotSheet.show(
                      context,
                      buildContext: () => buildManagerContext(
                        countries: list,
                        stats: stats,
                      ),
                      suggestions: [
                        'Comparar o desempenho entre países.',
                        'Onde devo atribuir gestores primeiro?',
                        'Quais são os riscos operacionais actuais?',
                      ],
                    ),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(colors: [
                          Color(0x2E38BDF8),
                          Color(0x147DD3FC),
                        ]),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(
                            color: const Color(0x4D38BDF8)),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.auto_awesome_rounded,
                              color: Color(0xFF38BDF8), size: 22),
                          SizedBox(width: 11),
                          Expanded(
                            child: Text(
                              'Perguntar ao Meddy sobre toda a plataforma',
                              style: TextStyle(
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ).animate().fadeIn(duration: 220.ms),
                  const SizedBox(height: 18),

                  // ── Tabs ─────────────────────────────────────────
                  Row(
                    children: [
                      for (final (k, l) in const [
                        ('paises', 'Países'),
                        ('pagamentos', 'Pagamentos'),
                        ('sos', 'SOS'),
                        ('equipa', 'Equipa'),
                      ]) ...[
                        FilterChip2(
                          label: l,
                          selected: _tab == k,
                          onTap: () => setState(() => _tab = k),
                        ),
                        const SizedBox(width: 8),
                      ],
                    ],
                  ),
                  const SizedBox(height: 14),

                  if (_tab == 'paises') _CountriesTable(
                    countries: list,
                    stats: stats,
                    isLoading: globalStats.isLoading,
                  ),
                  if (_tab == 'pagamentos') const PaymentsEmbed(),
                  if (_tab == 'sos') const SosEmbed(),
                  if (_tab == 'equipa') const TeamEmbed(),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        IconButton(
          onPressed: onBack,
          icon: const Icon(Icons.arrow_back_rounded,
              color: AppColors.textPrimary),
        ),
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Gestor Global',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                ),
              ),
              Text(
                'Comando da plataforma em todos os países',
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 11.5,
                ),
              ),
            ],
          ),
        ),
        Container(
          padding:
              const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: const Color(0x2E22C55E),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0x4D22C55E)),
          ),
          child: const Text(
            'ADMIN',
            style: TextStyle(
              color: AppColors.success,
              fontSize: 10.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
            ),
          ),
        ),
      ],
    );
  }
}

class _UrgencyTile extends StatelessWidget {
  const _UrgencyTile({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final int value;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: value > 0
              ? color.withOpacity(0.12)
              : AppColors.glassFill,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: value > 0
                ? color.withOpacity(0.45)
                : AppColors.glassBorder,
          ),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '$value',
                    style: TextStyle(
                      color: value > 0 ? color : AppColors.textPrimary,
                      fontWeight: FontWeight.w800,
                      fontSize: 19,
                    ),
                  ),
                  Text(
                    label,
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
      ),
    );
  }
}

class _CountriesTable extends ConsumerWidget {
  const _CountriesTable({
    required this.countries,
    required this.stats,
    required this.isLoading,
  });

  final List<CountryFull> countries;
  final Map<String, CountryStats> stats;
  final bool isLoading;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (isLoading) {
      return const ListSkeleton(count: 4, itemHeight: 80);
    }
    if (countries.isEmpty) {
      return const EmptyState(
        icon: Icons.public_off_rounded,
        title: 'Sem países activos',
        message: 'A tabela `countries` não tem países activos.',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionTitle('Países', subtitle: 'Toca para abrir a '
            'consola completa do país.'),
        for (final c in countries)
          GestureDetector(
            onTap: () => context.push('/manager-console', extra: c.id),
            child: Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.glassFill,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.glassBorder),
              ),
              child: Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: const Color(0x1F38BDF8),
                      borderRadius: BorderRadius.circular(11),
                    ),
                    child: Text(
                      c.id,
                      style: const TextStyle(
                        color: Color(0xFF7DD3FC),
                        fontWeight: FontWeight.w800,
                        fontSize: 11.5,
                      ),
                    ),
                  ),
                  const SizedBox(width: 11),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          c.name,
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                          ),
                        ),
                        Text(
                          stats[c.id] == null
                              ? '—'
                              : '${stats[c.id]!.users} users · '
                                  '${stats[c.id]!.institutions} inst · '
                                  '${stats[c.id]!.pendingProposals} pend',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.45),
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (stats[c.id] != null &&
                      stats[c.id]!.activeSos > 0)
                    Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.danger,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        'SOS ${stats[c.id]!.activeSos}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  const Icon(Icons.chevron_right_rounded,
                      color: AppColors.textSecondary, size: 20),
                ],
              ),
            ),
          ).animate().fadeIn(duration: 160.ms),
      ],
    );
  }
}

/// Embebido da fila de pagamentos (reutiliza o painel da consola).
class PaymentsEmbed extends ConsumerWidget {
  const PaymentsEmbed({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Painel sem país específico — usa 'GLOBAL' apenas como key.
    return const PaymentsPanel(countryId: 'GLOBAL');
  }
}

class SosEmbed extends ConsumerWidget {
  const SosEmbed({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return const SosMonitorPanel(countryId: 'GLOBAL');
  }
}

class TeamEmbed extends ConsumerWidget {
  const TeamEmbed({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return const TeamPanel();
  }
}

/// Equipa de gestão — atribuições country_management + user_roles.
/// O admin pode editar permissões/limites de cada gestor na app.
class TeamPanel extends ConsumerStatefulWidget {
  const TeamPanel({super.key});

  @override
  ConsumerState<TeamPanel> createState() => _TeamPanelState();
}

class _TeamPanelState extends ConsumerState<TeamPanel> {
  List<ManagerAssignment>? _rows;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final rows = await ref
        .read(managerRepositoryProvider)
        .fetchAssignments(null);
    if (!mounted) return;
    setState(() => _rows = rows);
  }

  @override
  Widget build(BuildContext context) {
    final rows = _rows;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionTitle(
          'Equipa de gestão',
          subtitle:
              'Gestores atribuídos e o que cada um pode fazer. Toca no '
              'escudo para editar permissões e limites.',
        ),
        if (rows == null)
          const ListSkeleton(count: 4, itemHeight: 70)
        else if (rows.isEmpty)
          const EmptyState(
            icon: Icons.manage_accounts_rounded,
            title: 'Sem atribuições visíveis',
            message:
                'A RLS só mostra atribuições a admins globais. Cria '
                'entradas em country_management para dar países a '
                'gestores.',
          )
        else
          for (final a in rows.take(60))
            Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.symmetric(
                  horizontal: 13, vertical: 11),
              decoration: BoxDecoration(
                color: AppColors.glassFill,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.glassBorder),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 16,
                    backgroundColor: const Color(0x2E22C55E),
                    child: Text(
                      initials(a.fullName ?? '?'),
                      style: const TextStyle(
                        color: AppColors.success,
                        fontSize: 11.5,
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
                          a.fullName ?? a.userId.substring(0, 8),
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                          ),
                        ),
                        Text(
                          '${a.roleLabel ?? 'Gestor'} · '
                          '${a.countryId == '*' ? 'Todos os países' : a.countryId}',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.45),
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (a.phone != null && a.phone!.isNotEmpty)
                    Text(
                      a.phone!,
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.4),
                        fontSize: 10.5,
                      ),
                    ),
                  if (a.countryId != '*')
                    IconButton(
                      tooltip: 'Permissões & limites',
                      onPressed: () async {
                        await ManagerPermissionsEditorSheet.show(
                          context,
                          userId: a.userId,
                          countryId: a.countryId,
                          userName: a.fullName ?? a.userId.substring(0, 8),
                        );
                        if (mounted) _load();
                      },
                      icon: const Icon(
                        Icons.shield_rounded,
                        size: 20,
                        color: Color(0xFF7DD3FC),
                      ),
                    ),
                ],
              ),
            ),
      ],
    );
  }
}
