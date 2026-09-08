import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/vision_repository.dart';

/// Scanner de Visão — fotografar receitas, resultados de exames e
/// rótulos de medicamentos: a IA extrai os dados e guarda em
/// `vision_scans` (mesmas tabelas da web).
///
/// • Chips de tipo de documento (6 tipos);
/// • Captura pela câmara ou galeria (image_picker);
/// • Cartão de resultado: medicamentos detectados, tabela de parâmetros
///   com cores por estado (normal/alto/baixo/crítico), médico,
///   facilidade, data e badge de confiança;
/// • Histórico dos últimos scans com re-análise dos pendentes;
/// • Dica visível quando a chave IA não está configurada.
class VisionScannerScreen extends ConsumerStatefulWidget {
  const VisionScannerScreen({super.key});

  @override
  ConsumerState<VisionScannerScreen> createState() =>
      _VisionScannerScreenState();
}

class _VisionScannerScreenState extends ConsumerState<VisionScannerScreen> {
  String _type = 'prescription';
  bool _scanning = false;
  List<VisionScan>? _history;

  VisionRepository get _repo => ref.read(visionRepositoryProvider);

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    try {
      final scans = await _repo.fetchScans(limit: 12);
      if (!mounted) return;
      setState(() => _history = scans);
    } catch (_) {
      if (mounted) setState(() => _history = []);
    }
  }

  Future<void> _capture({required bool fromCamera}) async {
    if (_scanning) return;
    setState(() => _scanning = true);
    try {
      final xfile = await ImagePicker().pickImage(
        source: fromCamera ? ImageSource.camera : ImageSource.gallery,
        maxWidth: 1600,
        imageQuality: 82,
      );
      if (xfile == null) {
        if (mounted) setState(() => _scanning = false);
        return;
      }
      final scan = await _repo.scanImage(
        filePath: xfile.path,
        scanType: _type,
      );
      if (!mounted) return;
      setState(() => _scanning = false);
      _loadHistory();
      _showResult(scan);
    } catch (e) {
      if (!mounted) return;
      setState(() => _scanning = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Falha ao analisar: $e')),
      );
    }
  }

  void _showResult(VisionScan scan) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ResultSheet(scan: scan),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDeep,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Scanner de Saúde',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
      ),
      body: AppBackground(
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              const Text(
                'Fotografa um documento de saúde e a IA extrai os dados '
                'automaticamente — receitas, exames, rótulos e vacinas.',
                style: TextStyle(
                    fontSize: 13.5,
                    height: 1.5,
                    color: AppColors.textSecondary),
              ),
              const SizedBox(height: 16),
              _TypeSelector(
                selected: _type,
                onSelect: (t) => setState(() => _type = t),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _CaptureButton(
                      icon: Icons.camera_alt_rounded,
                      label: 'Câmara',
                      onTap: () => _capture(fromCamera: true),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _CaptureButton(
                      icon: Icons.photo_library_rounded,
                      label: 'Galeria',
                      onTap: () => _capture(fromCamera: false),
                    ),
                  ),
                ],
              ),
              if (_scanning)
                Container(
                  margin: const EdgeInsets.only(top: 16),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.glassFill,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.glassBorder),
                  ),
                  child: const Row(
                    children: [
                      SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                      SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'A analisar a imagem com IA… mantém o app aberto.',
                          style: TextStyle(
                              fontSize: 13.5, color: AppColors.textSecondary),
                        ),
                      ),
                    ],
                  ),
                ).animate().fadeIn(),
              const SizedBox(height: 24),
              Text(
                'Histórico',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 10),
              if (!isGeminiConfigured)
                const _NoKeyHint(),
              _HistoryList(
                loading: _history == null,
                scans: _history ?? const [],
                onTap: _showResult,
                onRefresh: _loadHistory,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Componentes ─────────────────────────────────────────────────────────

class _TypeSelector extends StatelessWidget {
  const _TypeSelector({required this.selected, required this.onSelect});
  final String selected;
  final void Function(String) onSelect;

  static const _types = <(String, String, IconData)>[
    ('prescription', 'Receita', Icons.receipt_long_rounded),
    ('lab_result', 'Exames', Icons.science_rounded),
    ('medicine_label', 'Medicamento', Icons.medication_rounded),
    ('vaccine_card', 'Vacinas', Icons.vaccines_rounded),
    ('doctor_note', 'Nota médica', Icons.description_rounded),
    ('other', 'Outro', Icons.folder_rounded),
  ];

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: _types.map((t) {
        final active = t.$1 == selected;
        return GestureDetector(
          onTap: () => onSelect(t.$1),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
            decoration: BoxDecoration(
              gradient: active
                  ? const LinearGradient(colors: AppColors.buttonGradient)
                  : null,
              color: active ? null : AppColors.glassFill,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: active ? Colors.transparent : AppColors.glassBorder,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(t.$3,
                    size: 16,
                    color:
                        active ? Colors.white : AppColors.textSecondary),
                const SizedBox(width: 6),
                Text(t.$2,
                    style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                        color: active
                            ? Colors.white
                            : AppColors.textSecondary)),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _CaptureButton extends StatelessWidget {
  const _CaptureButton(
      {required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 18),
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: AppColors.buttonGradient),
          borderRadius: BorderRadius.circular(16),
          boxShadow: const [BoxShadow(color: AppColors.glowBlue, blurRadius: 18)],
        ),
        child: Column(
          children: [
            Icon(icon, color: Colors.white, size: 28),
            const SizedBox(height: 6),
            Text(label,
                style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 14)),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 300.ms);
  }
}

class _NoKeyHint extends StatelessWidget {
  const _NoKeyHint();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.warning.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border:
            Border.all(color: AppColors.warning.withOpacity(0.35)),
      ),
      child: const Row(
        children: [
          Icon(Icons.info_outline_rounded, color: AppColors.warning, size: 20),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'A extração IA requer --dart-define=GEMINI_API_KEY. '
              'Sem ela, os documentos ficam guardados "pendentes".',
              style: TextStyle(
                  fontSize: 12,
                  height: 1.4,
                  color: AppColors.textSecondary),
            ),
          ),
        ],
      ),
    );
  }
}

class _HistoryList extends StatelessWidget {
  const _HistoryList({
    required this.loading,
    required this.scans,
    required this.onTap,
    required this.onRefresh,
  });

  final bool loading;
  final List<VisionScan> scans;
  final void Function(VisionScan) onTap;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Padding(
        padding: EdgeInsets.only(top: 8),
        child: AppSkeleton(height: 72),
      );
    }
    if (scans.isEmpty) {
      return Container(
        margin: const EdgeInsets.only(top: 8),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.glassFill,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: const Center(
          child: Text(
            'Ainda sem scans.\nFotografa a tua primeira receita acima 👆',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textMuted, height: 1.5),
          ),
        ),
      );
    }
    return Column(
      children: scans
          .map((s) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _HistoryTile(scan: s, onTap: () => onTap(s)),
              ))
          .toList(),
    );
  }
}

class _HistoryTile extends StatelessWidget {
  const _HistoryTile({required this.scan, required this.onTap});
  final VisionScan scan;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.primarySoft.withOpacity(0.18),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.image_rounded,
                  color: AppColors.accent, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(scan.typeLabel,
                      style: const TextStyle(
                          fontWeight: FontWeight.w700, fontSize: 14)),
                  const SizedBox(height: 2),
                  Text(
                    formatDateTime(scan.createdAt),
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
            if (scan.isPending)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.warning.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text('Pendente',
                    style: TextStyle(
                        fontSize: 10.5, color: AppColors.warning)),
              )
            else
              const Icon(Icons.chevron_right_rounded,
                  color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}

class _ResultSheet extends ConsumerStatefulWidget {
  const _ResultSheet({required this.scan});
  final VisionScan scan;

  @override
  ConsumerState<_ResultSheet> createState() => _ResultSheetState();
}

class _ResultSheetState extends ConsumerState<_ResultSheet> {
  late VisionScan _scan;
  bool _reAnalyzing = false;

  @override
  void initState() {
    super.initState();
    _scan = widget.scan;
  }

  Future<void> _reAnalyze() async {
    setState(() => _reAnalyzing = true);
    final updated =
        await ref.read(visionRepositoryProvider).reAnalyze(_scan);
    if (!mounted) return;
    setState(() {
      _scan = updated;
      _reAnalyzing = false;
    });
  }

  Color _statusColor(String? status) {
    switch (status) {
      case 'critical':
        return AppColors.danger;
      case 'high':
      case 'low':
        return AppColors.warning;
      default:
        return AppColors.success;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.86),
      decoration: const BoxDecoration(
        color: AppColors.bgMid,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 12),
          Container(
            width: 44,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.textMuted,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    _scan.typeLabel,
                    style: const TextStyle(
                        fontSize: 17, fontWeight: FontWeight.w800),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          Flexible(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
              children: [
                if (_scan.isPending) ...[
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.glassFill,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.glassBorder),
                    ),
                    child: const Text(
                      'Análise IA pendente — o documento ficou guardado e '
                      'podes re-analisar quando a chave IA estiver activa.',
                      style: TextStyle(
                          fontSize: 13,
                          height: 1.5,
                          color: AppColors.textSecondary),
                    ),
                  ),
                  const SizedBox(height: 10),
                  FilledButton.icon(
                    style: FilledButton.styleFrom(
                        backgroundColor: AppColors.primarySoft),
                    onPressed: _reAnalyzing ? null : _reAnalyze,
                    icon: _reAnalyzing
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child:
                                CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.auto_awesome_rounded, size: 18),
                    label: const Text('Re-analisar com IA'),
                  ),
                ] else ...[
                  if (_scan.confidenceScore != null)
                    Row(
                      children: [
                        const Icon(Icons.verified_rounded,
                            size: 16, color: AppColors.success),
                        const SizedBox(width: 6),
                        Text(
                          'Confiança da IA: '
                          '${(_scan.confidenceScore! * 100).round()}%',
                          style: const TextStyle(
                              fontSize: 12.5,
                              color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  const SizedBox(height: 12),
                  if (_scan.detectedMedications.isNotEmpty) ...[
                    const Text('Medicamentos detectados',
                        style: TextStyle(
                            fontWeight: FontWeight.w800, fontSize: 14.5)),
                    const SizedBox(height: 8),
                    ..._scan.detectedMedications.map((m) => Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.card,
                            borderRadius: BorderRadius.circular(12),
                            border:
                                Border.all(color: AppColors.glassBorder),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(m.name,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w700)),
                              const SizedBox(height: 4),
                              Text(
                                [
                                  if (m.dosage != null) m.dosage!,
                                  if (m.frequency != null) m.frequency!,
                                  if (m.duration != null)
                                    'durante ${m.duration!}',
                                ].join(' · '),
                                style: const TextStyle(
                                    fontSize: 12.5,
                                    color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        )),
                  ],
                  if (_scan.detectedResults.isNotEmpty) ...[
                    const Text('Parâmetros',
                        style: TextStyle(
                            fontWeight: FontWeight.w800, fontSize: 14.5)),
                    const SizedBox(height: 8),
                    Container(
                      decoration: BoxDecoration(
                        color: AppColors.card,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.glassBorder),
                      ),
                      child: Column(
                        children: _scan.detectedResults.map((r) {
                          final c = _statusColor(r.status);
                          return Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              border: Border(
                                bottom: BorderSide(
                                    color: AppColors.glassBorder),
                              ),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(r.parameter,
                                      style: const TextStyle(
                                          fontSize: 13.5)),
                                ),
                                Text(
                                  '${r.value}${r.unit != null ? ' ${r.unit}' : ''}',
                                  style: TextStyle(
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.w700,
                                      color: c),
                                ),
                                const SizedBox(width: 8),
                                if (r.referenceRange != null)
                                  Text(r.referenceRange!,
                                      style: const TextStyle(
                                          fontSize: 11,
                                          color: AppColors.textMuted)),
                              ],
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  if (_scan.extractedData['summary'] is String)
                    Text(
                      _scan.extractedData['summary'] as String,
                      style: const TextStyle(
                          fontSize: 13.5,
                          height: 1.5,
                          color: AppColors.textSecondary),
                    ),
                  if (_scan.detectedDoctor != null ||
                      _scan.detectedFacility != null ||
                      _scan.detectedDate != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        [
                          if (_scan.detectedDoctor != null)
                            '👩‍⚕️ ${_scan.detectedDoctor}',
                          if (_scan.detectedFacility != null)
                            '🏥 ${_scan.detectedFacility}',
                          if (_scan.detectedDate != null)
                            '📅 ${_scan.detectedDate}',
                        ].join('\n'),
                        style: const TextStyle(
                            fontSize: 12.5, color: AppColors.textMuted),
                      ),
                    ),
                  const SizedBox(height: 14),
                  FilledButton(
                    style: FilledButton.styleFrom(
                        backgroundColor: AppColors.primarySoft),
                    onPressed: () async {
                      await ref
                          .read(visionRepositoryProvider)
                          .markReviewed(_scan.id);
                      if (context.mounted) Navigator.pop(context);
                    },
                    child: const Text('Guardar e fechar'),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
