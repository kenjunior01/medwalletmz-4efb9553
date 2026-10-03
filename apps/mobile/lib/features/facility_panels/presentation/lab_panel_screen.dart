import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/facility_panels_repository.dart';
import 'clinic_panel_screen.dart' show facilityPanelsRepositoryProvider;

/// Providers ──────────────────────────────────────────────────────────

/// Painel do laboratório do utilizador (null quando não é dono).
final labPanelProvider =
    FutureProvider.autoDispose<LabPanelData?>((ref) async {
  final uid = ref.watch(currentUserIdProvider);
  if (uid == null) return null;
  return ref.watch(facilityPanelsRepositoryProvider).fetchLabPanel(uid);
});

/// ── Ecrã ─────────────────────────────────────────────────────────────

/// Painel do laboratório (papel `lab`): KPIs reais (pendentes,
/// concluídos, receita do mês, total), filtros por estado, upload de
/// resultado PDF (bucket `lab-results` + RPC `lab_order_set_result`)
/// e re-download via URL assinada. Paridade com a web LabDashboard.
class LabPanelScreen extends ConsumerStatefulWidget {
  const LabPanelScreen({super.key});

  @override
  ConsumerState<LabPanelScreen> createState() => _LabPanelScreenState();
}

class _LabPanelScreenState extends ConsumerState<LabPanelScreen> {
  String _filter = 'all'; // all | pending | completed
  String? _uploadingId;
  String? _downloadingId;

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
    ref.invalidate(labPanelProvider);
  }

  Future<void> _pickAndUpload(String uid, String orderId) async {
    if (_uploadingId != null) return;
    try {
      final res = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf'],
        withData: true,
      );
      final file = res?.files.single;
      if (file == null) return;
      var bytes = file.bytes;
      if (bytes == null && file.path != null) {
        bytes = await File(file.path!).readAsBytes();
      }
      if (bytes == null) {
        _snack('Não foi possível ler o ficheiro', error: true);
        return;
      }
      setState(() => _uploadingId = orderId);
      await ref
          .read(facilityPanelsRepositoryProvider)
          .uploadLabResult(uid: uid, orderId: orderId, bytes: bytes);
      _snack('Resultado enviado — ordem concluída');
      await _reload();
    } on Exception catch (_) {
      _snack('Falha no envio do resultado', error: true);
    } finally {
      if (mounted) setState(() => _uploadingId = null);
    }
  }

  Future<void> _download(String path, String orderId) async {
    if (_downloadingId != null) return;
    setState(() => _downloadingId = orderId);
    try {
      final url = await ref
          .read(facilityPanelsRepositoryProvider)
          .labResultSignedUrl(path);
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        _snack('Sem aplicação para abrir o resultado', error: true);
      }
    } on Exception catch (_) {
      _snack('Não foi possível abrir o resultado', error: true);
    } finally {
      if (mounted) setState(() => _downloadingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final panelAsync = ref.watch(labPanelProvider);

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
                  icon: Icons.biotech_rounded,
                  title: 'Sem laboratório associado',
                  message:
                      'A tua conta não gere nenhum laboratório. Regista o laboratório na plataforma web para aceder ao painel.',
                  actionLabel: 'Voltar',
                  onAction: () => context.pop(),
                );
              }
              final ownerId = (panel.lab['owner_id'] ?? '') as String;
              final visible = panel.orders.where((o) {
                if (_filter == 'all') return true;
                if (_filter == 'completed') return o.isCompleted;
                return !o.isCompleted;
              }).toList();

              return RefreshIndicator(
                color: AppColors.primary,
                onRefresh: _reload,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 40),
                  children: [
                    _LabHeader(panel: panel),
                    const SizedBox(height: 18),
                    _LabKpis(panel: panel)
                        .animate(delay: 60.ms)
                        .fadeIn(duration: 320.ms)
                        .slideY(begin: 0.06, end: 0),
                    const SizedBox(height: 18),
                    _LabFilters(
                      filter: _filter,
                      panel: panel,
                      onPick: (f) => setState(() => _filter = f),
                    ),
                    const SizedBox(height: 14),
                    if (visible.isEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 32),
                        child: Column(
                          children: [
                            Icon(Icons.inbox_rounded,
                                size: 38,
                                color: AppColors.textMuted.withOpacity(0.6)),
                            const SizedBox(height: 10),
                            Text(
                              'Sem pedidos neste filtro',
                              style: TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      ...visible.map(
                        (o) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: _OrderTile(
                            order: o,
                            uploading: _uploadingId == o.id,
                            downloading: _downloadingId == o.id,
                            onUpload: () => _pickAndUpload(ownerId, o.id),
                            onDownload: () => _download(o.resultUrl!, o.id),
                          ),
                        ),
                      ),
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

class _LabHeader extends StatelessWidget {
  const _LabHeader({required this.panel});

  final LabPanelData panel;

  @override
  Widget build(BuildContext context) {
    final lab = panel.lab;
    final name = (lab['name'] ?? 'Laboratório') as String;
    final city = (lab['city'] ?? '') as String;
    final verified = lab['is_verified'] == true;

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
                city.isEmpty
                    ? '${panel.total} pedidos'
                    : '$city · ${panel.total} pedidos',
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

class _LabKpis extends StatelessWidget {
  const _LabKpis({required this.panel});

  final LabPanelData panel;

  @override
  Widget build(BuildContext context) {
    final items = [
      (
        Icons.schedule_rounded,
        '${panel.pending}',
        'Pendentes',
        AppColors.warning,
      ),
      (
        Icons.check_circle_rounded,
        '${panel.done}',
        'Concluídos',
        AppColors.success,
      ),
      (
        Icons.payments_rounded,
        formatMZN(panel.monthRevenue),
        'Receita do mês',
        AppColors.accent,
      ),
      (
        Icons.bar_chart_rounded,
        '${panel.total}',
        'Total',
        AppColors.primary,
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

// ── Filtros ──────────────────────────────────────────────────────────

class _LabFilters extends StatelessWidget {
  const _LabFilters({
    required this.filter,
    required this.panel,
    required this.onPick,
  });

  final String filter;
  final LabPanelData panel;
  final void Function(String) onPick;

  @override
  Widget build(BuildContext context) {
    final tabs = [
      ('all', 'Todos', panel.total),
      ('pending', 'Pendentes', panel.pending),
      ('completed', 'Concluídos', panel.done),
    ];

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final (key, label, count) in tabs)
          InkWell(
            onTap: () => onPick(key),
            borderRadius: BorderRadius.circular(20),
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
              decoration: BoxDecoration(
                color: filter == key
                    ? AppColors.primary
                    : AppColors.glassFill,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: filter == key
                      ? AppColors.primary
                      : AppColors.glassBorder,
                ),
              ),
              child: Text(
                '$label ($count)',
                style: TextStyle(
                  color: filter == key
                      ? Colors.white
                      : AppColors.textSecondary,
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

// ── Tile de pedido ───────────────────────────────────────────────────

class _OrderTile extends StatelessWidget {
  const _OrderTile({
    required this.order,
    required this.uploading,
    required this.downloading,
    required this.onUpload,
    required this.onDownload,
  });

  final LabOrder order;
  final bool uploading;
  final bool downloading;
  final VoidCallback onUpload;
  final VoidCallback onDownload;

  @override
  Widget build(BuildContext context) {
    final o = order;
    final done = o.isCompleted;

    return Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        'Pedido #${o.id.substring(0, 8)}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: (done ? AppColors.success : AppColors.warning)
                            .withOpacity(0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        done ? 'Concluído' : o.status,
                        style: TextStyle(
                          color: done
                              ? AppColors.success
                              : AppColors.warning,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '${formatDateTime(o.createdAt)} · ${formatMZN(o.totalAmount)}',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 11.5,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          if (done && o.resultUrl != null)
            downloading
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: Padding(
                      padding: EdgeInsets.all(3),
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  )
                : IconButton(
                    tooltip: 'Descarregar resultado',
                    onPressed: onDownload,
                    icon: Icon(Icons.download_rounded,
                        size: 22, color: AppColors.primary),
                  )
          else if (!done)
            uploading
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: Padding(
                      padding: EdgeInsets.all(3),
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  )
                : IconButton(
                    tooltip: 'Enviar resultado (PDF)',
                    onPressed: onUpload,
                    icon: Icon(Icons.upload_file_rounded,
                        size: 22, color: AppColors.accent),
                  ),
        ],
      ),
    );
  }
}
