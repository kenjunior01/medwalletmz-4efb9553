import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../../../core/ai/recorder_service.dart';
import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/voice_journal_repository.dart';

/// Diário de Voz — grava, transcreve e analisa notas de áudio sobre
/// saúde e bem-estar (paridade com VoiceJournal.tsx da web).
///
/// • Botão de gravação com animação de pulso e cronómetro;
/// • Pacote `record` via core/ai/recorder_service.dart → m4a (AAC);
/// • Análise IA (Gemini áudio): transcrição, humor detectado, sintomas,
///   palavras-chave, resumo e insight empático;
/// • Lista de entradas com estado (pendente/completo) e detalhe em
///   folha modal; nota escrita manual como fallback sem IA.
class VoiceJournalScreen extends ConsumerStatefulWidget {
  const VoiceJournalScreen({super.key});

  @override
  ConsumerState<VoiceJournalScreen> createState() =>
      _VoiceJournalScreenState();
}

class _VoiceJournalScreenState extends ConsumerState<VoiceJournalScreen> {
  List<VoiceEntry>? _entries;
  bool _recording = false;
  int _seconds = 0;
  Timer? _ticker;
  bool _busy = false;

  VoiceJournalRepository get _repo =>
      ref.read(voiceJournalRepositoryProvider);

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final entries = await _repo.fetchEntries();
      if (!mounted) return;
      setState(() => _entries = entries);
    } catch (_) {
      if (mounted) setState(() => _entries = []);
    }
  }

  Future<void> _toggleRecording() async {
    if (_busy) return;
    final rec = VoiceRecorderService.instance;
    if (!_recording) {
      setState(() => _busy = true);
      try {
        final ok = await rec.hasPermission();
        if (!ok) {
          if (!mounted) return;
          setState(() => _busy = false);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
                content: Text(
                    'Concede permissão ao microfone para gravar notas.')),
          );
          return;
        }
        final tmp = await getTemporaryDirectory();
        final path = p.join(
            tmp.path, 'voice_${DateTime.now().millisecondsSinceEpoch}.m4a');
        await rec.start(path);
        if (!mounted) return;
        setState(() {
          _recording = true;
          _seconds = 0;
          _busy = false;
        });
        _ticker?.cancel();
        _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
          if (mounted && _recording) setState(() => _seconds++);
        });
      } catch (e) {
        if (!mounted) return;
        setState(() => _busy = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Microfone indisponível: $e')),
        );
      }
    } else {
      try {
        final path = await rec.stop();
        _ticker?.cancel();
        if (!mounted) return;
        setState(() => _recording = false);
        if (path != null && _seconds >= 1) {
          await _processEntry(path, _seconds);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
                content: Text('Gravação muito curta — toca e fala '
                    'pelo menos 1 segundo.')),
          );
        }
      } catch (e) {
        if (!mounted) return;
        setState(() => _busy = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Falha ao terminar: $e')),
        );
      }
    }
  }

  Future<void> _processEntry(String path, int seconds) async {
    setState(() => _busy = true);
    try {
      var entry = await _repo.createEntry(
        filePath: path,
        durationSeconds: seconds,
      );
      entry = await _repo.analyze(entry);
      if (!mounted) return;
      setState(() => _busy = false);
      _load();
      _showDetail(entry);
    } catch (e) {
      if (!mounted) return;
      setState(() => _busy = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Falha ao guardar: $e')),
      );
    }
  }

  void _showDetail(VoiceEntry entry) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _DetailSheet(entry: entry),
    );
    _load(); // lista fresca após apagar/guardar na folha
  }

  String get _timeLabel =>
      '${(_seconds ~/ 60).toString().padLeft(2, '0')}:'
      '${(_seconds % 60).toString().padLeft(2, '0')}';

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDeep,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Diário de Voz',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
      ),
      body: AppBackground(
        child: SafeArea(
          child: Column(
            children: [
              Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.glassBorder),
                ),
                child: Column(
                  children: [
                    Text(
                      _recording
                          ? 'A gravar… $_timeLabel'
                          : _busy
                              ? 'A processar com IA…'
                              : 'Toca para gravares como te sentes',
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w600,
                        color: _recording ? AppColors.danger : null,
                      ),
                    ),
                    const SizedBox(height: 16),
                    GestureDetector(
                      onTap: _toggleRecording,
                      child: Container(
                        width: 84,
                        height: 84,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: _recording
                              ? const LinearGradient(colors: [
                                  AppColors.danger,
                                  Color(0xFFB91C1C),
                                ])
                              : const LinearGradient(
                                  colors: AppColors.buttonGradient),
                          boxShadow: [
                            BoxShadow(
                              color: _recording
                                  ? AppColors.danger.withOpacity(0.4)
                                  : AppColors.glowBlue,
                              blurRadius: _recording ? 26 : 18,
                            ),
                          ],
                        ),
                        child: Center(
                          child: _busy
                              ? const SizedBox(
                                  width: 26,
                                  height: 26,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2.4),
                                )
                              : Icon(
                                  _recording
                                      ? Icons.stop_rounded
                                      : Icons.mic_rounded,
                                  color: Colors.white,
                                  size: 34,
                                ),
                        ),
                      ),
                    )
                        .animate(
                            onPlay: (c) =>
                                _recording ? c.repeat(reverse: true) : null)
                        .scale(
                          begin: const Offset(1, 1),
                          end: const Offset(1.07, 1.07),
                          duration: 900.ms,
                        ),
                    const SizedBox(height: 12),
                    const Text(
                      'A IA transcreve, detecta o humor e devolve um '
                      'insight empático. Nada é partilhado.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          fontSize: 12,
                          height: 1.4,
                          color: AppColors.textMuted),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text('As minhas notas',
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.w800)),
                ),
              ),
              Expanded(child: _list()),
            ],
          ),
        ),
      ),
    );
  }

  Widget _list() {
    final entries = _entries;
    if (entries == null) {
      return const Padding(
        padding: EdgeInsets.all(16),
        child: AppSkeleton(height: 90),
      );
    }
    if (entries.isEmpty) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.mic_none_rounded, size: 44, color: AppColors.textMuted),
            SizedBox(height: 10),
            Text(
              'Ainda sem notas de voz.\nToca no microfone para começar.',
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: AppColors.textMuted, height: 1.5, fontSize: 13.5),
            ),
          ],
        ),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: entries.length,
      itemBuilder: (context, i) {
        final e = entries[i];
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: GestureDetector(
            onTap: () => _showDetail(e),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.glassBorder),
              ),
              child: Row(
                children: [
                  Text(e.moodEmoji, style: const TextStyle(fontSize: 26)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          e.transcript?.isNotEmpty == true
                              ? (e.transcript!.length > 68
                                  ? '${e.transcript!.substring(0, 68)}…'
                                  : e.transcript!)
                              : (e.aiSummary ?? 'Nota de voz'),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 13.5, height: 1.35),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${formatDateTime(e.recordedAt)} · '
                          '${e.durationSeconds}s'
                          '${e.isDone ? '' : ' · pendente'}',
                          style: const TextStyle(
                              fontSize: 11.5, color: AppColors.textMuted),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right_rounded,
                      color: AppColors.textMuted),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _DetailSheet extends ConsumerStatefulWidget {
  const _DetailSheet({required this.entry});
  final VoiceEntry entry;

  @override
  ConsumerState<_DetailSheet> createState() => _DetailSheetState();
}

class _DetailSheetState extends ConsumerState<_DetailSheet> {
  late VoiceEntry _entry;
  final _noteCtrl = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _entry = widget.entry;
    _noteCtrl.text = _entry.aiSummary ?? '';
  }

  VoiceJournalRepository get _repo =>
      ref.read(voiceJournalRepositoryProvider);

  Future<void> _saveNote() async {
    final note = _noteCtrl.text.trim();
    if (note.isEmpty || _saving) return;
    setState(() => _saving = true);
    final updated = await _repo.saveManualNote(_entry.id, note);
    if (!mounted) return;
    setState(() {
      _entry = updated;
      _saving = false;
    });
    if (context.mounted) Navigator.pop(context);
  }

  Future<void> _delete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        backgroundColor: AppColors.bgHigh,
        title: const Text('Apagar nota?'),
        content: const Text(
            'A gravação e a análise serão apagadas permanentemente.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(c, false),
              child: const Text('Cancelar')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.pop(c, true),
            child: const Text('Apagar'),
          ),
        ],
      ),
    );
    if (ok == true) {
      await _repo.delete(_entry.id);
      if (mounted) Navigator.pop(context);
    }
  }

  @override
  void dispose() {
    _noteCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final e = _entry;
    return Container(
      constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.84),
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
                Text(e.moodEmoji, style: const TextStyle(fontSize: 30)),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    '${formatDateTime(e.recordedAt)} · ${e.durationSeconds}s',
                    style: const TextStyle(
                        fontSize: 13.5, color: AppColors.textSecondary),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline_rounded,
                      color: AppColors.danger),
                  onPressed: _delete,
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
                if (e.isDone) ...[
                  if (e.transcript != null && e.transcript!.isNotEmpty) ...[
                    const Text('Transcrição',
                        style: TextStyle(
                            fontWeight: FontWeight.w800, fontSize: 14.5)),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.card,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.glassBorder),
                      ),
                      child: Text(e.transcript!,
                          style: const TextStyle(
                              fontSize: 13.5, height: 1.5)),
                    ),
                    const SizedBox(height: 12),
                  ],
                  if (e.detectedSymptoms.isNotEmpty)
                    _ChipSection(
                        title: 'Sintomas detectados', items: e.detectedSymptoms),
                  if (e.detectedKeywords.isNotEmpty)
                    _ChipSection(
                        title: 'Temas', items: e.detectedKeywords),
                  if (e.aiInsight != null && e.aiInsight!.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                            colors: AppColors.buttonGradient),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Text('💡 ${e.aiInsight!}',
                          style: const TextStyle(
                              fontSize: 13.5, height: 1.5)),
                    ),
                  ],
                ] else ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.glassFill,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.glassBorder),
                    ),
                    child: const Text(
                      'Análise IA pendente. Podes escrever o que sentiste '
                      'na nota abaixo enquanto isso.',
                      style: TextStyle(
                          fontSize: 13,
                          height: 1.5,
                          color: AppColors.textSecondary),
                    ),
                  ),
                ],
                const SizedBox(height: 14),
                TextField(
                  controller: _noteCtrl,
                  maxLines: 3,
                  style: const TextStyle(fontSize: 14),
                  decoration: InputDecoration(
                    hintText: 'Nota escrita (opcional)…',
                    hintStyle: const TextStyle(color: AppColors.textMuted),
                    filled: true,
                    fillColor: AppColors.glassFill,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                FilledButton(
                  style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primarySoft),
                  onPressed: _saving ? null : _saveNote,
                  child: _saving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Guardar nota'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ChipSection extends StatelessWidget {
  const _ChipSection({required this.title, required this.items});
  final String title;
  final List<String> items;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title,
            style:
                const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: items
              .take(10)
              .map((s) => Chip(
                    label: Text(s, style: const TextStyle(fontSize: 12)),
                    backgroundColor: AppColors.glassFillStrong,
                    side: const BorderSide(color: AppColors.glassBorder),
                  ))
              .toList(),
        ),
      ],
    );
  }
}
