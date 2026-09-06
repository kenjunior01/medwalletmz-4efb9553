import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/records_repository.dart';

/// Registos médicos — o paciente guarda exames, receitas e relatórios
/// (com anexo por fotografia no bucket `medical-records`) e decide com
/// que médico partilha cada registo (revogável).
class RecordsScreen extends ConsumerStatefulWidget {
  const RecordsScreen({super.key});

  @override
  ConsumerState<RecordsScreen> createState() => _RecordsScreenState();
}

class _RecordsScreenState extends ConsumerState<RecordsScreen> {
  List<MedicalRecord> _records = [];
  bool _loading = true;
  bool _adding = false;
  final _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final records = await ref.read(recordsRepositoryProvider).fetchMyRecords();
    if (!mounted) return;
    setState(() {
      _records = records;
      _loading = false;
    });
  }

  Future<void> _addRecord() async {
    if (_adding) return;
    // Fonte do anexo (opcional).
    final source = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => Container(
        decoration: const BoxDecoration(
          color: AppColors.bgHigh,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 14),
              const Text('Anexo do registo',
                  style: TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w800,
                      fontSize: 15)),
              const SizedBox(height: 10),
              ListTile(
                leading: const Icon(Icons.photo_camera_rounded,
                    color: AppColors.accent),
                title: const Text('Fotografar agora',
                    style: TextStyle(color: AppColors.textPrimary)),
                onTap: () => Navigator.of(sheetCtx).pop('camera'),
              ),
              ListTile(
                leading: const Icon(Icons.photo_rounded,
                    color: AppColors.accent),
                title: const Text('Escolher da galeria',
                    style: TextStyle(color: AppColors.textPrimary)),
                onTap: () => Navigator.of(sheetCtx).pop('gallery'),
              ),
              ListTile(
                leading: const Icon(Icons.description_rounded,
                    color: AppColors.textSecondary),
                title: const Text('Sem anexo (só texto)',
                    style: TextStyle(color: AppColors.textSecondary)),
                onTap: () => Navigator.of(sheetCtx).pop('none'),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
    if (source == null || !mounted) return;

    File? attachment;
    String? mime;
    if (source != 'none') {
      try {
        final picked = await _picker.pickImage(
          source: source == 'camera'
              ? ImageSource.camera
              : ImageSource.gallery,
          maxWidth: 2048,
          imageQuality: 82,
        );
        if (picked != null) {
          attachment = File(picked.path);
          mime = picked.mimeType ?? 'image/jpeg';
        }
      } catch (_) {
        // Sem permissão de câmara/galeria — segue sem anexo.
      }
    }
    if (!mounted) return;
    _openCreateSheet(attachment, mime);
  }

  Future<void> _openCreateSheet(File? attachment, String? mime) async {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final issuedByCtrl = TextEditingController();
    String type = 'exam';
    DateTime? issuedAt = DateTime.now();

    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => StatefulBuilder(
        builder: (sheetCtx, setSheetState) => Padding(
          padding:
              EdgeInsets.only(bottom: MediaQuery.of(sheetCtx).viewInsets.bottom),
          child: Container(
            decoration: const BoxDecoration(
              color: AppColors.bgHigh,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.18),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    attachment != null
                        ? 'Novo registo com anexo'
                        : 'Novo registo',
                    style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 17,
                        fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 14),
                  _SheetField(
                    label: 'Título',
                    controller: titleCtrl,
                    hint: 'Ex.: Hemograma completo',
                  ),
                  const SizedBox(height: 10),
                  const Text('Tipo',
                      style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700)),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 7,
                    runSpacing: 7,
                    children: [
                      for (final t in const [
                        'exam',
                        'prescription',
                        'report',
                        'vaccine',
                        'image',
                        'other'
                      ])
                        ChoiceChip(
                          selected: type == t,
                          onSelected: (_) => setSheetState(() => type = t),
                          label: Text(_typeLabel(t)),
                          selectedColor:
                              AppColors.primary.withOpacity(0.4),
                          backgroundColor: Colors.white.withOpacity(0.05),
                          labelStyle: TextStyle(
                            color: type == t
                                ? AppColors.textPrimary
                                : AppColors.textSecondary,
                            fontSize: 12,
                          ),
                          side: BorderSide(
                              color: Colors.white.withOpacity(0.12)),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  _SheetField(
                    label: 'Emitido por (opcional)',
                    controller: issuedByCtrl,
                    hint: 'Dr. … / Laboratório …',
                  ),
                  const SizedBox(height: 10),
                  _SheetField(
                    label: 'Descrição (opcional)',
                    controller: descCtrl,
                    hint: 'Notas, resultados…',
                    maxLines: 3,
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    height: 46,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      onPressed: () => Navigator.of(sheetCtx).pop(true),
                      icon: const Icon(Icons.save_rounded, size: 18),
                      label: const Text('Guardar registo',
                          style: TextStyle(fontWeight: FontWeight.w800)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );

    if (ok == true && mounted) {
      setState(() => _adding = true);
      final err = await ref.read(recordsRepositoryProvider).createRecord(
            title: titleCtrl.text,
            recordType: type,
            description: descCtrl.text,
            issuedBy: issuedByCtrl.text,
            issuedAt: issuedAt,
            attachment: attachment,
            attachmentMime: mime,
          );
      if (!mounted) return;
      setState(() => _adding = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(err ?? 'Registo guardado com sucesso.'),
        backgroundColor: err == null ? AppColors.success : AppColors.danger,
        behavior: SnackBarBehavior.floating,
      ));
      await _load();
    }
  }

  Future<void> _openAttachment(MedicalRecord record) async {
    final url = await ref.read(recordsRepositoryProvider).signedUrl(record.fileUrl!);
    if (!mounted) return;
    if (url == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Anexo indisponível.'),
        behavior: SnackBarBehavior.floating,
      ));
      return;
    }
    try {
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    } catch (_) {}
  }

  Future<void> _deleteRecord(MedicalRecord record) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dlgCtx) => AlertDialog(
        backgroundColor: AppColors.bgHigh,
        title: const Text('Apagar registo',
            style: TextStyle(color: AppColors.textPrimary, fontSize: 17)),
        content: Text(
          'Apagar "${record.title}"? Esta acção não pode ser revertida.',
          style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dlgCtx).pop(false),
            child: const Text('Cancelar',
                style: TextStyle(color: AppColors.textSecondary)),
          ),
          TextButton(
            onPressed: () => Navigator.of(dlgCtx).pop(true),
            child: const Text('Apagar',
                style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    await ref.read(recordsRepositoryProvider).deleteRecord(record);
    await _load();
  }

  Future<void> _shareRecord(MedicalRecord record) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ShareSheet(record: record, onDone: _load),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              // ── Cabeçalho ────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(6, 8, 16, 4),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => context.pop(),
                      icon: const Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    const Expanded(
                      child: Text(
                        'Registos médicos',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 19,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    IconButton(
                      tooltip: 'Novo registo',
                      onPressed: _addRecord,
                      icon: const Icon(Icons.add_circle_rounded,
                          color: AppColors.accent),
                    ),
                  ],
                ),
              ),
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 0, 20, 10),
                child: Text(
                  'Exames, receitas e relatórios num lugar seguro — partilha com o médico quando quiseres',
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
                ),
              ),

              // ── Lista ────────────────────────────────────────────
              Expanded(
                child: _loading
                    ? ListView(
                        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                        children: const [
                          AppSkeleton(width: double.infinity, height: 96, radius: 20),
                          SizedBox(height: 12),
                          AppSkeleton(width: double.infinity, height: 96, radius: 20),
                          SizedBox(height: 12),
                          AppSkeleton(width: double.infinity, height: 96, radius: 20),
                        ],
                      )
                    : _records.isEmpty
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(32),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.folder_shared_rounded,
                                      size: 46, color: AppColors.textMuted),
                                  const SizedBox(height: 14),
                                  const Text(
                                    'Sem registos ainda',
                                    style: TextStyle(
                                        color: AppColors.textPrimary,
                                        fontWeight: FontWeight.w800,
                                        fontSize: 16),
                                  ),
                                  const SizedBox(height: 6),
                                  const Text(
                                    'Fotografa um exame ou receita e guarda aqui — depois partilha com o teu médico num toque.',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                        color: AppColors.textSecondary,
                                        fontSize: 12.5),
                                  ),
                                  const SizedBox(height: 18),
                                  ElevatedButton.icon(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.primary,
                                      foregroundColor: Colors.white,
                                    ),
                                    onPressed: _addRecord,
                                    icon: const Icon(Icons.add_rounded,
                                        size: 18),
                                    label: const Text('Adicionar registo'),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : RefreshIndicator(
                            color: AppColors.accent,
                            onRefresh: _load,
                            child: ListView.separated(
                              padding:
                                  const EdgeInsets.fromLTRB(20, 4, 20, 24),
                              itemCount: _records.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(height: 12),
                              itemBuilder: (context, i) {
                                final r = _records[i];
                                return _RecordCard(
                                  record: r,
                                  onOpenFile: r.hasFile
                                      ? () => _openAttachment(r)
                                      : null,
                                  onShare: () => _shareRecord(r),
                                  onDelete: () => _deleteRecord(r),
                                )
                                    .animate(delay: (45 * i).ms)
                                    .fadeIn()
                                    .slideY(
                                        begin: 0.06,
                                        curve: Curves.easeOut);
                              },
                            ),
                          ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String _typeLabel(String t) {
  switch (t) {
    case 'exam':
      return 'Exame';
    case 'prescription':
      return 'Receita';
    case 'report':
      return 'Relatório';
    case 'vaccine':
      return 'Vacina';
    case 'image':
      return 'Imagem';
    default:
      return 'Outro';
  }
}

class _RecordCard extends StatelessWidget {
  const _RecordCard({
    required this.record,
    this.onOpenFile,
    required this.onShare,
    required this.onDelete,
  });

  final MedicalRecord record;
  final VoidCallback? onOpenFile;
  final VoidCallback onShare;
  final VoidCallback onDelete;

  Color get _typeColor {
    switch (record.recordType) {
      case 'exam':
        return AppColors.accent;
      case 'prescription':
        return AppColors.success;
      case 'vaccine':
        return AppColors.warning;
      default:
        return AppColors.primarySoft;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.055),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.10)),
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
                  borderRadius: BorderRadius.circular(13),
                  color: _typeColor.withOpacity(0.16),
                ),
                child: Icon(
                  record.hasFile
                      ? Icons.image_rounded
                      : Icons.description_rounded,
                  color: _typeColor,
                  size: 21,
                ),
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      record.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w800,
                          fontSize: 14.5),
                    ),
                    Text(
                      [
                        record.typeLabel,
                        if (record.issuedAt != null)
                          formatDateShort(record.issuedAt!),
                        if (record.issuedBy != null &&
                            record.issuedBy!.isNotEmpty)
                          record.issuedBy!,
                      ].join(' · '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          color: AppColors.textSecondary, fontSize: 11.5),
                    ),
                  ],
                ),
              ),
              PopupMenuButton<String>(
                color: AppColors.bgHigh,
                icon: const Icon(Icons.more_vert_rounded,
                    color: AppColors.textSecondary, size: 20),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
                onSelected: (v) {
                  if (v == 'share') onShare();
                  if (v == 'delete') onDelete();
                },
                itemBuilder: (_) => [
                  const PopupMenuItem(
                    value: 'share',
                    child: Row(
                      children: [
                        Icon(Icons.share_rounded,
                            size: 17, color: AppColors.accent),
                        SizedBox(width: 9),
                        Text('Partilhar com médico',
                            style:
                                TextStyle(color: AppColors.textPrimary)),
                      ],
                    ),
                  ),
                  const PopupMenuItem(
                    value: 'delete',
                    child: Row(
                      children: [
                        Icon(Icons.delete_rounded,
                            size: 17, color: AppColors.danger),
                        SizedBox(width: 9),
                        Text('Apagar',
                            style: TextStyle(color: AppColors.danger)),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
          if (record.description != null &&
              record.description!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              record.description!,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  color: AppColors.textSecondary, fontSize: 12),
            ),
          ],
          if (record.hasFile) ...[
            const SizedBox(height: 10),
            TextButton.icon(
              onPressed: onOpenFile,
              icon: const Icon(Icons.open_in_new_rounded,
                  size: 14, color: AppColors.accent),
              label: const Text('Abrir anexo',
                  style: TextStyle(
                      color: AppColors.accent,
                      fontSize: 12,
                      fontWeight: FontWeight.w700)),
            ),
          ],
        ],
      ),
    );
  }
}

/// Folha de partilha com médico: lista dos médicos com quem já tens
/// consulta + estado das partilhas do registo (revogável).
class _ShareSheet extends ConsumerStatefulWidget {
  const _ShareSheet({required this.record, required this.onDone});

  final MedicalRecord record;
  final VoidCallback onDone;

  @override
  ConsumerState<_ShareSheet> createState() => _ShareSheetState();
}

class _ShareSheetState extends ConsumerState<_ShareSheet> {
  List<DoctorOption> _doctors = const [];
  List<RecordShare> _shares = const [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    final repo = ref.read(recordsRepositoryProvider);
    final results = await Future.wait([
      repo.fetchMyDoctors(),
      repo.fetchShares(widget.record.id),
    ]);
    if (!mounted) return;
    setState(() {
      _doctors = results[0] as List<DoctorOption>;
      _shares = results[1] as List<RecordShare>;
      _loading = false;
    });
  }

  Future<void> _share(DoctorOption doctor) async {
    final err = await ref
        .read(recordsRepositoryProvider)
        .shareWithDoctor(widget.record, doctor.userId);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(err ?? 'Partilhado com ${doctor.name}.'),
      backgroundColor: err == null ? AppColors.success : AppColors.danger,
      behavior: SnackBarBehavior.floating,
    ));
    if (err == null) {
      final repo = ref.read(recordsRepositoryProvider);
      final shares = await repo.fetchShares(widget.record.id);
      if (mounted) setState(() => _shares = shares);
      widget.onDone();
    }
  }

  Future<void> _revoke(RecordShare share) async {
    await ref.read(recordsRepositoryProvider).revokeShare(share);
    final repo = ref.read(recordsRepositoryProvider);
    final shares = await repo.fetchShares(widget.record.id);
    if (mounted) setState(() => _shares = shares);
    widget.onDone();
  }

  @override
  Widget build(BuildContext context) {
    final activeShares = [
      for (final s in _shares)
        if (s.isActive) s,
    ];

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.bgHigh,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 26),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.18),
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
            const SizedBox(height: 14),
            Text(
              'Partilhar "${widget.record.title}"',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 4),
            const Text(
              'O médico vê o registo e o anexo até revogares.',
              style: TextStyle(color: AppColors.textMuted, fontSize: 11.5),
            ),
            const SizedBox(height: 14),

            if (_loading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(18),
                  child: CircularProgressIndicator(
                      color: AppColors.accent),
                ),
              )
            else ...[
              if (activeShares.isNotEmpty) ...[
                const Text('JÁ PARTILHADO COM',
                    style: TextStyle(
                        color: AppColors.accent,
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.7)),
                const SizedBox(height: 8),
                ...activeShares.map(
                  (s) => Container(
                    margin: const EdgeInsets.only(bottom: 7),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 9),
                    decoration: BoxDecoration(
                      color: AppColors.success.withOpacity(0.10),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                          color: AppColors.success.withOpacity(0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.verified_rounded,
                            size: 16, color: AppColors.success),
                        const SizedBox(width: 9),
                        Expanded(
                          child: Text(
                            s.doctorName ?? 'Médico',
                            style: const TextStyle(
                                color: AppColors.textPrimary,
                                fontSize: 13,
                                fontWeight: FontWeight.w700),
                          ),
                        ),
                        InkWell(
                          onTap: () => _revoke(s),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 9, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.danger.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text('Revogar',
                                style: TextStyle(
                                    color: AppColors.danger,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 10),
              ],

              const Text('PARTILHAR COM OS MEUS MÉDICOS',
                  style: TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.7)),
              const SizedBox(height: 8),

              if (_doctors.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    'Agenda primeiro uma consulta — depois podes partilhar os registos com esse especialista.',
                    style: TextStyle(
                        color: AppColors.textSecondary, fontSize: 12.5),
                  ),
                )
              else
                ..._doctors.map(
                  (d) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                    leading: CircleAvatar(
                      radius: 16,
                      backgroundColor:
                          AppColors.primary.withOpacity(0.3),
                      child: Text(
                        d.name.isNotEmpty
                            ? d.name.characters.first.toUpperCase()
                            : '?',
                        style: const TextStyle(
                            color: AppColors.accent,
                            fontSize: 12,
                            fontWeight: FontWeight.w800),
                      ),
                    ),
                    title: Text(d.name,
                        style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 13.5,
                            fontWeight: FontWeight.w700)),
                    trailing: const Icon(Icons.share_rounded,
                        size: 17, color: AppColors.accent),
                    onTap: () => _share(d),
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

// ── Campo simples da folha ───────────────────────────────────────────
class _SheetField extends StatelessWidget {
  const _SheetField({
    required this.label,
    required this.controller,
    required this.hint,
    this.maxLines = 1,
  });

  final String label;
  final TextEditingController controller;
  final String hint;
  final int maxLines;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 11.5,
                fontWeight: FontWeight.w700)),
        const SizedBox(height: 5),
        TextField(
          controller: controller,
          maxLines: maxLines,
          style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 13.5,
              fontWeight: FontWeight.w600),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle:
                const TextStyle(color: AppColors.textMuted, fontSize: 12.5),
            filled: true,
            fillColor: Colors.white.withOpacity(0.05),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.accent),
            ),
          ),
        ),
      ],
    );
  }
}
