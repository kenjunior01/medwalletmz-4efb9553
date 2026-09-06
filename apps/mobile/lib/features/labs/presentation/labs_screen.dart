import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/labs_repository.dart';

/// Estado simples de carregamento dos laboratórios.
class _LabsState {
  const _LabsState({this.loading = true, this.labs = const [], this.error});
  final bool loading;
  final List<LabFacility> labs;
  final String? error;
}

/// Controller da lista de laboratórios (FutureProvider).
final _labsProvider = FutureProvider<List<LabFacility>>((ref) async {
  return ref.read(labsRepositoryProvider).fetchLabs();
});

/// Lista de laboratórios registados na plataforma — entrada para
/// agendar exames (catálogo, colheita ao domicílio, pagamento da
/// carteira) na MESMA base da versão web.
class LabsScreen extends ConsumerWidget {
  const LabsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final labsAsync = ref.watch(_labsProvider);

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Cabeçalho ────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(6, 8, 16, 0),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => context.pop(),
                      icon: const Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    const Expanded(
                      child: Text(
                        'Laboratórios',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 19,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    IconButton(
                      tooltip: 'Os meus pedidos',
                      onPressed: () => context.push('/lab-orders'),
                      icon: Badge(
                        isLabelVisible: false,
                        child: const Icon(
                            Icons.receipt_long_rounded,
                            color: AppColors.accent),
                      ),
                    ),
                  ],
                ),
              ),
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 2, 20, 14),
                child: Text(
                  'Analises e exames com colheita ao domicílio — pagas da carteira',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12.5,
                  ),
                ),
              ),

              // ── Lista ────────────────────────────────────────────
              Expanded(
                child: labsAsync.when(
                  loading: () => const _LabsSkeleton(),
                  error: (_, __) => const _EmptyPane(
                    icon: Icons.wifi_off_rounded,
                    title: 'Ligação indisponível',
                    subtitle:
                        'Não foi possível carregar os laboratórios. Puxa para atualizar.',
                  ),
                  data: (labs) {
                    if (labs.isEmpty) {
                      return const _EmptyPane(
                        icon: Icons.biotech_rounded,
                        title: 'Ainda sem laboratórios',
                        subtitle:
                            'Os laboratórios registados na plataforma aparecem aqui. Conheces um? Submete-o no Ganhe e ganha dinheiro real.',
                      );
                    }
                    return RefreshIndicator(
                      color: AppColors.accent,
                      onRefresh: () async {
                        ref.invalidate(_labsProvider);
                        await Future<void>.delayed(
                            const Duration(milliseconds: 400));
                      },
                      child: ListView.separated(
                        padding:
                            const EdgeInsets.fromLTRB(20, 4, 20, 24),
                        itemCount: labs.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: 12),
                        itemBuilder: (context, i) {
                          final lab = labs[i];
                          return _LabCard(lab: lab)
                              .animate(delay: (60 * i).ms)
                              .fadeIn()
                              .slideY(begin: 0.08, curve: Curves.easeOut);
                        },
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LabCard extends StatelessWidget {
  const _LabCard({required this.lab});

  final LabFacility lab;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: () => context.push('/lab-detail', extra: lab),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.055),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withOpacity(0.10)),
        ),
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            // Logotipo/imagem do laboratório (Google Maps quando existe).
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                color: AppColors.primary.withOpacity(0.25),
                image: (lab.imageUrl != null &&
                        lab.imageUrl!.startsWith('http'))
                    ? DecorationImage(
                        image: NetworkImage(lab.imageUrl!),
                        fit: BoxFit.cover,
                      )
                    : null,
              ),
              child: (lab.imageUrl == null ||
                      !lab.imageUrl!.startsWith('http'))
                  ? const Icon(Icons.biotech_rounded,
                      color: AppColors.accent, size: 26)
                  : null,
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    lab.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w800,
                      fontSize: 14.5,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    [
                      if (lab.city != null && lab.city!.isNotEmpty)
                        lab.city!,
                      if (lab.address != null && lab.address!.isNotEmpty)
                        lab.address!,
                    ].join(' · '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.accent.withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.arrow_forward_rounded,
                  size: 16, color: AppColors.accent),
            ),
          ],
        ),
      ),
    );
  }
}

class _LabsSkeleton extends StatelessWidget {
  const _LabsSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      itemCount: 5,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, __) => const AppSkeleton(
        width: double.infinity,
        height: 84,
        radius: 20,
      ),
    );
  }
}

class _EmptyPane extends StatelessWidget {
  const _EmptyPane({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 44, color: AppColors.textMuted),
            const SizedBox(height: 14),
            Text(title,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                )),
            const SizedBox(height: 6),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  color: AppColors.textSecondary, fontSize: 12.5),
            ),
          ],
        ),
      ),
    );
  }
}
