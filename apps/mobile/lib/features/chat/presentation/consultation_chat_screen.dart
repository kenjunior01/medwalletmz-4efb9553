import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../../bookings/domain/booking_models.dart';
import '../../bookings/presentation/prescription_composer_sheet.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/consultation_chat_models.dart';
import '../data/consultation_chat_repository.dart';
import '../consultation_chat_controller.dart';

/// Conversa especialista↔paciente dentro de uma consulta — texto,
/// anexos (receitas fotografadas, exames), respostas rápidas e, para o
/// especialista, emissão de receita sem sair do chat.
class ConsultationChatScreen extends ConsumerStatefulWidget {
  const ConsultationChatScreen({super.key});

  @override
  ConsumerState<ConsultationChatScreen> createState() =>
      _ConsultationChatScreenState();
}

class _ConsultationChatScreenState
    extends ConsumerState<ConsultationChatScreen> {
  ConsultationThread? _thread;
  bool _sending = false;
  bool _uploading = false;
  final _inputCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  final _picker = ImagePicker();

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_thread == null) {
      final extra = GoRouterState.of(context).extra;
      if (extra is ConsultationThread) {
        setState(() => _thread = extra);
        _scrollToBottom();
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.jumpTo(_scrollCtrl.position.maxScrollExtent);
      }
    });
  }

  @override
  void dispose() {
    _inputCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  // ── Ações ─────────────────────────────────────────────────────────

  Future<void> _send({String? body}) async {
    final thread = _thread;
    final text = body?.trim() ?? _inputCtrl.text.trim();
    if (thread == null || text.isEmpty || _sending) return;

    setState(() => _sending = true);
    _inputCtrl.clear();
    try {
      await ref.read(consultationChatRepositoryProvider).sendMessage(
            thread.consultation.id,
            message: text,
          );
      _scrollToBottom();
    } catch (_) {
      _inputCtrl.text = text;
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Não foi possível enviar. Tenta de novo.')),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _pickAndSendImage() async {
    final thread = _thread;
    if (thread == null || _uploading) return;

    try {
      final picked = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 72,
        maxWidth: 1600,
      );
      if (picked == null) return;
      if (!mounted) return;
      setState(() => _uploading = true);

      final repo = ref.read(consultationChatRepositoryProvider);
      final path = await repo.uploadAttachment(
        thread.consultation.id,
        File(picked.path),
        picked.name,
      );
      await repo.sendMessage(
        thread.consultation.id,
        message: 'Anexo enviado.',
        attachmentPath: path,
        attachmentType: 'image',
        attachmentName: picked.name,
      );
      _scrollToBottom();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Não foi possível enviar o anexo. Tenta de novo.')),
        );
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _emitPrescription(ConsultationThread thread) async {
    await PrescriptionComposerSheet.show(
      context,
      patientId: thread.consultation.patientId,
      consultationId: thread.consultation.id,
    );
  }

  @override
  Widget build(BuildContext context) {
    final thread = _thread;
    if (thread == null) {
      return const Scaffold(
        body: AppBackground(
          child: Center(
            child: CircularProgressIndicator(color: AppColors.accent),
          ),
        ),
      );
    }

    final messages = ref.watch(consultationMessagesProvider(
        thread.consultation.id));
    final consultation = thread.consultation;
    final statusColor = consultationStatusColor(consultation.status);
    final statusLabel = consultationStatusLabel(consultation.status);

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              // ── Cabeçalho ────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 16, 10),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => context.pop(),
                      icon: const Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: const Color(0x1A38BDF8),
                        shape: BoxShape.circle,
                        image: thread.counterpartAvatar != null &&
                                thread.counterpartAvatar!.startsWith('http')
                            ? DecorationImage(
                                image:
                                    NetworkImage(thread.counterpartAvatar!),
                                fit: BoxFit.cover,
                              )
                            : null,
                      ),
                      child: thread.counterpartAvatar == null ||
                              !thread.counterpartAvatar!.startsWith('http')
                          ? Center(
                              child: Text(
                                thread.title.characters.first
                                    .toUpperCase(),
                                style: const TextStyle(
                                  color: AppColors.accent,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 16,
                                ),
                              ),
                            )
                          : null,
                    ),
                    const SizedBox(width: 11),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            thread.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                            ),
                          ),
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  thread.subtitle,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: AppColors.accent.withOpacity(0.9),
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 7),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 7, vertical: 2),
                                decoration: BoxDecoration(
                                  color: statusColor.withOpacity(0.14),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  statusLabel,
                                  style: TextStyle(
                                    color: statusColor,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    // Videochamada da consulta (video_sessions).
                    IconButton(
                      tooltip: 'Videochamada',
                      onPressed: () =>
                          context.push('/video-call', extra: thread),
                      icon: const Icon(
                        Icons.videocam_rounded,
                        color: AppColors.accent,
                        size: 22,
                      ),
                    ),
                    // Receitas / emissão de receita.
                    IconButton(
                      tooltip: thread.asDoctor
                          ? 'Emitir receita'
                          : 'Ver receitas',
                      onPressed: () {
                        if (thread.asDoctor) {
                          _emitPrescription(thread);
                        } else {
                          context.push('/prescriptions');
                        }
                      },
                      icon: Icon(
                        thread.asDoctor
                            ? Icons.receipt_long_rounded
                            : Icons.description_outlined,
                        color: AppColors.accent,
                        size: 21,
                      ),
                    ),
                  ],
                ),
              ),

              // ── Mensagens ────────────────────────────────────────
              Expanded(
                child: messages.when(
                  loading: () => const Center(
                    child: CircularProgressIndicator(color: AppColors.accent),
                  ),
                  error: (e, _) => EmptyState(
                    icon: Icons.wifi_off_rounded,
                    title: 'Conversa indisponível',
                    message: 'Confirma a ligação e tenta de novo.',
                    actionLabel: 'Recarregar',
                    onAction: () => ref.invalidate(
                        consultationMessagesProvider(
                            thread.consultation.id)),
                  ),
                  data: (list) {
                    if (list.isEmpty) return _emptyThread(thread);
                    return ListView.builder(
                      controller: _scrollCtrl,
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
                      itemCount: list.length,
                      itemBuilder: (context, i) {
                        final myId =
                            ref.read(currentUserIdProvider);
                        return _MessageBubble(
                          message: list[i],
                          mine: list[i].senderId == myId,
                        );
                      },
                    );
                  },
                ),
              ),

              // ── Barra de escrita ─────────────────────────────────
              _Composer(
                controller: _inputCtrl,
                sending: _sending,
                uploading: _uploading,
                onSend: () => _send(),
                onAttach: _pickAndSendImage,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _emptyThread(ConsultationThread thread) {
    final quick = thread.asDoctor
        ? const [
            'Olá! Como se sente hoje?',
            'Pode enviar fotos dos exames?',
            'Vou emitir a receita em instantes.',
          ]
        : const [
            'Olá, doutor(a)!',
            'Estou a melhorar, obrigado(a).',
            'Os sintomas pioraram hoje.',
            'Posso obter uma receita?',
          ];

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.glassFill,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.glassBorder),
          ),
          child: Column(
            children: [
              const Icon(Icons.medical_information_rounded,
                  color: AppColors.accent, size: 34),
              const SizedBox(height: 10),
              Text(
                thread.asDoctor
                    ? 'Consulta com o teu paciente'
                    : 'Consulta com o teu especialista',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w800,
                  fontSize: 15,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Mensagens em tempo real, envio de exames e receitas — '
                'tudo fica registado na consulta.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.6),
                  fontSize: 12.5,
                  height: 1.5,
                ),
              ),
            ],
          ),
        )
            .animate()
            .fadeIn(duration: 300.ms)
            .slideY(begin: 0.1, curve: Curves.easeOutCubic),
        const SizedBox(height: 12),
        const Align(
          alignment: Alignment.centerLeft,
          child: Text(
            'RESPOSTAS RÁPIDAS',
            style: TextStyle(
              color: AppColors.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.2,
            ),
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final q in quick)
              _QuickChip(label: q, onTap: () => _send(body: q)),
          ],
        ).animate().fadeIn(duration: 260.ms),
      ],
    );
  }
}

// ── Bolha ───────────────────────────────────────────────────────────────

class _MessageBubble extends ConsumerWidget {
  const _MessageBubble({required this.message, required this.mine});

  final ConsultationMessage message;
  final bool mine;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.78,
        ),
        decoration: BoxDecoration(
          color: mine
              ? const Color(0xFF1E6B9C)
              : AppColors.glassFillStrong,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: const Radius.circular(18),
            bottomLeft: Radius.circular(mine ? 18 : 4),
            bottomRight: Radius.circular(mine ? 4 : 18),
          ),
          border: mine ? null : Border.all(color: AppColors.glassBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (message.hasAttachment)
              _Attachment(path: message.attachmentPath!),
            Padding(
              padding:
                  EdgeInsets.only(top: message.hasAttachment ? 8 : 0),
              child: Text(
                message.message,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 14,
                  height: 1.35,
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              formatRelative(message.createdAt),
              style: TextStyle(
                color: Colors.white.withOpacity(0.45),
                fontSize: 10.5,
              ),
            ),
          ],
        ),
      ),
    )
        .animate()
        .fadeIn(duration: 220.ms)
        .slideY(begin: 0.1, curve: Curves.easeOutCubic);
  }
}

class _Attachment extends ConsumerStatefulWidget {
  const _Attachment({required this.path});

  final String path;

  @override
  ConsumerState<_Attachment> createState() => _AttachmentState();
}

class _AttachmentState extends ConsumerState<_Attachment> {
  late Future<String?> _future;

  @override
  void initState() {
    super.initState();
    _future = ref
        .read(consultationChatRepositoryProvider)
        .signedAttachmentUrl(widget.path);
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: FutureBuilder<String?>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return Container(
              width: 190,
              height: 130,
              color: Colors.white.withOpacity(0.06),
              child: const Center(
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: AppColors.accent),
                ),
              ),
            );
          }
          final url = snap.data;
          if (url == null) {
            return Container(
              width: 190,
              height: 80,
              color: Colors.white.withOpacity(0.06),
              alignment: Alignment.center,
              child: const Text(
                'Anexo indisponível',
                style: TextStyle(color: AppColors.textMuted, fontSize: 12),
              ),
            );
          }
          return GestureDetector(
            onTap: () {
              showDialog<void>(
                context: context,
                builder: (_) => Dialog(
                  backgroundColor: Colors.transparent,
                  child: GestureDetector(
                    onTap: () => Navigator.of(context).pop(),
                    child: InteractiveViewer(child: Image.network(url)),
                  ),
                ),
              );
            },
            child: Image.network(
              url,
              width: 190,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                width: 190,
                height: 80,
                color: Colors.white.withOpacity(0.06),
                alignment: Alignment.center,
                child: const Text(
                  'Anexo indisponível',
                  style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _QuickChip extends StatelessWidget {
  const _QuickChip({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          color: const Color(0x1A38BDF8),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0x4438BDF8)),
        ),
        child: Text(
          label,
          style: const TextStyle(
            color: AppColors.accent,
            fontSize: 12.5,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.sending,
    required this.uploading,
    required this.onSend,
    required this.onAttach,
  });

  final TextEditingController controller;
  final bool sending;
  final bool uploading;
  final VoidCallback onSend;
  final VoidCallback onAttach;

  @override
  Widget build(BuildContext context) {
    final busy = sending || uploading;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 4, 16, 14),
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: const Color(0xCC0B1D31),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: busy ? null : onAttach,
            child: Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: uploading
                    ? const Color(0x2E22C55E)
                    : Colors.white.withOpacity(0.05),
                shape: BoxShape.circle,
              ),
              child: uploading
                  ? const Padding(
                      padding: EdgeInsets.all(12),
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: AppColors.success),
                    )
                  : const Icon(Icons.attach_file_rounded,
                      color: AppColors.success, size: 20),
            ),
          ),
          Expanded(
            child: TextField(
              controller: controller,
              minLines: 1,
              maxLines: 4,
              textInputAction: TextInputAction.send,
              onSubmitted: (_) => onSend(),
              style: const TextStyle(
                  color: AppColors.textPrimary, fontSize: 14),
              decoration: const InputDecoration(
                hintText: 'Escreve a tua mensagem…',
                border: InputBorder.none,
                contentPadding:
                    EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
            ),
          ),
          GestureDetector(
            onTap: busy ? null : onSend,
            child: Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                gradient: busy
                    ? const LinearGradient(
                        colors: [Color(0xFF22344A), Color(0xFF1A2939)])
                    : const LinearGradient(
                        colors: AppColors.buttonGradient),
                shape: BoxShape.circle,
              ),
              child: sending
                  ? const Padding(
                      padding: EdgeInsets.all(12),
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.send_rounded,
                      color: Colors.white, size: 19),
            ),
          ),
        ],
      ),
    );
  }
}
