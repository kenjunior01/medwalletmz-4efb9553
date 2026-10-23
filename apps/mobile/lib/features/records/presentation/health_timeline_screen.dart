import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../data/health_timeline_repository.dart';

/// F46 — Linha Temporal de Saúde 📜 (paridade com a web).
///
/// Padrão MyChart/Epic: tudo o que aconteceu ao paciente numa única linha
/// temporal — consultas, análises, prescrições, registos e diário.
class HealthTimelineScreen extends ConsumerWidget {
  const HealthTimelineScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(healthTimelineProvider);
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 8, 20, 0),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => context.pop(),
                      icon: Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    Text(
                      'Linha Temporal de Saúde',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      onPressed: () =>
                          ref.invalidate(healthTimelineProvider),
                      tooltip: 'Atualizar',
                      icon: Icon(Icons.refresh_rounded,
                          color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: async.when(
                  loading: () => const Center(
                      child: CircularProgressIndicator(strokeWidth: 2)),
                  error: (e, _) => _ErrorView(
                    message: e.toString(),
                    onRetry: () =>
                        ref.invalidate(healthTimelineProvider),
                  ),
                  data: (items) => _Body(items: items),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/* ═════════════════════════ Metadados por tipo ═════════════════════════ */

class _KindMeta {
  const _KindMeta(this.icon, this.color, this.label);

  final IconData icon;
  final Color color;
  final String label;
}

_KindMeta _metaFor(String kind) {
  switch (kind) {
    case 'consultation':
      return _KindMeta(Icons.medical_services_rounded, const Color(0xFF5B6CFF),
          'Consulta');
    case 'lab':
      return _KindMeta(Icons.science_rounded, const Color(0xFF38BDF8),
          'Análises');
    case 'prescription':
      return _KindMeta(Icons.medication_rounded, const Color(0xFF34D399),
          'Prescrição');
    case 'journal':
      return _KindMeta(Icons.edit_note_rounded, const Color(0xFFFB7185),
          'Diário');
    default:
      return _KindMeta(Icons.description_rounded, const Color(0xFFFBBF24),
          'Registo');
  }
}

/* ═════════════════════════ Corpo ═════════════════════════ */

class _Body extends StatelessWidget {
  const _Body({required this.items});

  final List<TimelineItem> items;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.history_rounded, color: AppColors.textMuted, size: 40),
              const SizedBox(height: 12),
              Text(
                'Ainda não há episódios por aqui',
                style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              Text(
                'Consultas, análises, prescrições e entradas do diário '
                'aparecem aqui automaticamente.',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    // Agrupar por mês — padrão MyChart
    final groups = <String, List<TimelineItem>>{};
    for (final it in items) {
      final m = DateFormat('MMMM yyyy', 'pt_PT').format(it.at);
      (groups[m] ??= []).add(it);
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
      children: [
        for (final entry in groups.entries) ...[
          Text(
            entry.key[0].toUpperCase() + entry.key.substring(1),
            style: TextStyle(
              color: AppColors.textMuted,
              fontSize: 12,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.6,
            ),
          ),
          const SizedBox(height: 10),
          for (final it in entry.value) _Tile(item: it),
          const SizedBox(height: 14),
        ],
        Text(
          'A sua linha temporal reúne consultas, análises, prescrições, '
          'registos e diário num só lugar. Os dados são seus e privados.',
          style: TextStyle(color: AppColors.textMuted, fontSize: 11),
        ),
      ],
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({required this.item});

  final TimelineItem item;

  @override
  Widget build(BuildContext context) {
    final meta = _metaFor(item.kind);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: meta.color.withOpacity(0.16),
              shape: BoxShape.circle,
            ),
            child: Icon(meta.icon, color: meta.color, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        item.title,
                        style: TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w700,
                            fontSize: 14),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      meta.label.toUpperCase(),
                      style: TextStyle(
                          color: meta.color,
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5),
                    ),
                  ],
                ),
                if (item.detail != null && item.detail!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    item.detail!,
                    style:
                        TextStyle(color: AppColors.textSecondary, fontSize: 12),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                const SizedBox(height: 6),
                Row(
                  children: [
                    Text(
                      DateFormat('dd MMM yyyy · HH:mm', 'pt_PT').format(item.at),
                      style: TextStyle(
                          color: AppColors.textMuted, fontSize: 11),
                    ),
                    if (item.hasResult) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.success.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          'Resultado disponível',
                          style: TextStyle(
                              color: AppColors.success,
                              fontSize: 10,
                              fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/* ═════════════════════════ Estado de erro ═════════════════════════ */

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.info_outline_rounded,
                color: Color(0xFFF59E0B), size: 40),
            const SizedBox(height: 12),
            Text(
              'Não foi possível carregar a linha temporal',
              style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.w700),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Se persistir, a migração F46 (RPC health_timeline) ainda '
              'não foi aplicada no Supabase.',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Tentar novamente'),
            ),
          ],
        ),
      ),
    );
  }
}
