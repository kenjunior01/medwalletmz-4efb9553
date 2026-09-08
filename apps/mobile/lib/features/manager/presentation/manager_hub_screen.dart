import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/manager_models.dart';
import 'manager_controller.dart';
import 'meddy_copilot_sheet.dart';

/// Hub de gestão — entrada única para:
///  · Painel do Gestor Global (admin): visão de todos os países;
///  · Consolas por país (gestores regionais/país);
///  · Meddy Copilot (IA de gestão).
class ManagerHubScreen extends ConsumerStatefulWidget {
  const ManagerHubScreen({super.key});

  @override
  ConsumerState<ManagerHubScreen> createState() => _ManagerHubScreenState();
}

class _ManagerHubScreenState extends ConsumerState<ManagerHubScreen> {
  @override
  Widget build(BuildContext context) {
    final access = ref.watch(managerAccessProvider);
    final countries = ref.watch(managerCountriesProvider);

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
              child: Text(
                'Não foi possível verificar os teus papéis.',
                style: TextStyle(color: AppColors.textSecondary),
              ),
            ),
            data: (managed) {
              final hasAccess = managed == null || managed.isNotEmpty;
              if (!hasAccess) return const _NoAccess();
              return _Hub(
                managed: managed,
                countries: countries.value ?? const [],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _Hub extends ConsumerWidget {
  const _Hub({required this.managed, required this.countries});

  /// null = admin global.
  final Set<String>? managed;
  final List<CountryFull> countries;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isGlobal = managed == null;

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
                'Gestão',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: isGlobal
                    ? const Color(0x2E22C55E)
                    : const Color(0x2E38BDF8),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isGlobal
                      ? const Color(0x4D22C55E)
                      : const Color(0x4D38BDF8),
                ),
              ),
              child: Text(
                isGlobal ? 'GESTOR GLOBAL' : 'GESTÃO REGIONAL',
                style: TextStyle(
                  color: isGlobal
                      ? AppColors.success
                      : const Color(0xFF7DD3FC),
                  fontSize: 10.5,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.8,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          isGlobal
              ? 'Comando de toda a plataforma: países, submissões, '
                  'pagamentos, SOS e desempenho — tudo num só lugar.'
              : 'O teu comando no país: validar submissões, acompanhar '
                  'KPIs, metas e conteúdo local.',
          style: TextStyle(
            color: Colors.white.withOpacity(0.55),
            fontSize: 12.5,
            height: 1.45,
          ),
        ),
        const SizedBox(height: 18),

        // ── Painel Global (só admin) ───────────────────────────────
        if (isGlobal)
          _GlobalCard()
              .animate()
              .fadeIn(duration: 260.ms)
              .slideY(begin: 0.08, curve: Curves.easeOutCubic),

        // ── Consolas por país ──────────────────────────────────────
        if (countries.isNotEmpty) ...[
          const SizedBox(height: 22),
          _SectionLabel(
              'Consolas por país (${countries.length})'),
          const SizedBox(height: 10),
          for (final c in countries)
            _CountryCard(c: c, isGlobal: isGlobal)
                .animate(delay: (40 * countries.indexOf(c)).ms)
                .fadeIn(duration: 240.ms)
                .slideX(begin: 0.06, curve: Curves.easeOutCubic),
        ] else if (!isGlobal) ...[
          const SizedBox(height: 22),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.warning.withOpacity(0.1),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.warning.withOpacity(0.3)),
            ),
            child: const Text(
              'Tens papel de gestão mas nenhum país associado. A '
              'administração precisa de criar a atribuição em '
              'user_roles (country_id) ou country_management.',
              style: TextStyle(
                color: AppColors.warning,
                fontSize: 12.3,
                height: 1.5,
              ),
            ),
          ),
        ],

        const SizedBox(height: 22),
        // ── Meddy Copilot ──────────────────────────────────────────
        _MeddyCard(countries: countries),
      ],
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: TextStyle(
        color: Colors.white.withOpacity(0.45),
        fontSize: 11,
        fontWeight: FontWeight.w800,
        letterSpacing: 1.2,
      ),
    );
  }
}

class _GlobalCard extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GestureDetector(
      onTap: () => context.push('/global-dashboard'),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0x331E6B9C), Color(0x1422C55E)],
          ),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0x4D1E6B9C)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: const Color(0x2E38BDF8),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(Icons.public_rounded,
                      color: Color(0xFF38BDF8), size: 24),
                ),
                const SizedBox(width: 13),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Painel do Gestor Global',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                        ),
                      ),
                      SizedBox(height: 3),
                      Text(
                        'Todos os países · pagamentos · SOS · equipa',
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right_rounded,
                    color: AppColors.textSecondary),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CountryCard extends ConsumerWidget {
  const _CountryCard({required this.c, required this.isGlobal});

  final CountryFull c;
  final bool isGlobal;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stats = ref.watch(countryStatsProvider(c.id));

    return GestureDetector(
      onTap: () => context.push('/manager-console', extra: c.id),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(15),
        decoration: BoxDecoration(
          color: AppColors.glassFill,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: const Color(0x1F38BDF8),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Text(
                c.flagUrl ?? c.id.substring(0, 2),
                style: const TextStyle(
                  color: Color(0xFF7DD3FC),
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                ),
              ),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    c.name,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w800,
                      fontSize: 14.5,
                    ),
                  ),
                  const SizedBox(height: 3),
                  stats.maybeWhen(
                    data: (s) => Text(
                      '${s.institutions} instituições · ${s.users} '
                      'utilizadores · ${s.pendingProposals} pendentes',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.5),
                        fontSize: 11.5,
                      ),
                    ),
                    orElse: () => Text(
                      'A carregar estatísticas…',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.35),
                        fontSize: 11.5,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded,
                color: AppColors.textSecondary),
          ],
        ),
      ),
    );
  }
}

class _MeddyCard extends ConsumerWidget {
  const _MeddyCard({required this.countries});

  final List<CountryFull> countries;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GestureDetector(
      onTap: () {
        final countriesAsync = ref.read(managerCountriesProvider);
        final list = countriesAsync.value ?? countries;
        MeddyCopilotSheet.show(
          context,
          buildContext: () => buildManagerContext(countries: list),
        );
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0x2E38BDF8), Color(0x147DD3FC)],
          ),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0x4D38BDF8)),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: const Color(0x2E38BDF8),
                borderRadius: BorderRadius.circular(13),
              ),
              child: const Icon(Icons.auto_awesome_rounded,
                  color: Color(0xFF38BDF8), size: 22),
            ),
            const SizedBox(width: 13),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Meddy Copilot · IA de gestão',
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                    ),
                  ),
                  SizedBox(height: 3),
                  Text(
                    'Pergunta o que quiser sobre os dados e recebe '
                    'análise + acções recomendadas.',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 11.8,
                      height: 1.4,
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
                'Gestão',
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
              'Este painel é para o Gestor Global e Gestores Regionais/'
              'País. Se deverias ter acesso, fala com a administração '
              'para receber o papel adequado.',
        ),
      ],
    );
  }
}
