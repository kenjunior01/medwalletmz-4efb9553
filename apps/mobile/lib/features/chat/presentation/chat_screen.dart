import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../../facilities/data/facility_model.dart';
import '../../facilities/facilities_controller.dart';
import '../chat_controller.dart';
import '../data/chat_models.dart';

/// Conversa com uma instituição — mensagens em tempo real, anexo de
/// receita por fotografia e perguntas rápidas ("o que têm…?").
class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  ChatTarget? _target;
  bool _sending = false;
  bool _uploading = false;
  String? _lastMarkedMessageId;
  final _inputCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  final _picker = ImagePicker();

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_target == null) _resolveTarget();
  }

  Future<void> _resolveTarget() async {
    final extra = GoRouterState.of(context).extra;

    // Aberto a partir do detalhe da instituição: alvo completo.
    if (extra is ChatTarget) {
      setState(() => _target = extra);
      _scrollToBottom();
      if (extra.autoAttach) _pickAndSendReceipt();
      return;
    }

    // Aberto a partir da lista de conversas: resolver a instituição.
    if (extra is FacilityConversation) {
      final conv = extra;
      final repo = ref.read(facilityRepositoryProvider);
      HealthFacility? facility;
      try {
        facility = await repo.fetchFacility(conv.source, conv.entityId);
      } catch (_) {
        facility = null;
      }
      if (!mounted) return;
      setState(() {
        _target = ChatTarget(
          conversationId: conv.id,
          facility:
              facility ?? _fallbackFacility(conv),
        );
      });
      _scrollToBottom();
    }
  }

  /// Reserva quando a instituição já não existe na base — mantém a
  /// conversa navegável com o nome guardado.
  HealthFacility _fallbackFacility(FacilityConversation conv) {
    return HealthFacility(
      id: conv.entityId,
      source: conv.source,
      type: conv.source == FacilitySource.veterinary
          ? FacilityType.veterinary
          : conv.source == FacilitySource.store
              ? FacilityType.pharmacy
              : FacilityType.clinic,
      name: conv.facilityName ?? 'Instituição',
    );
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
    final target = _target;
    final text = body?.trim() ?? _inputCtrl.text.trim();
    if (target == null || (text.isEmpty) || _sending) return;

    setState(() => _sending = true);
    _inputCtrl.clear();
    try {
      await ref
          .read(chatRepositoryProvider)
          .sendMessage(
            target.conversationId,
            body: text,
            senderRole: target.staffMode ? 'facility' : 'customer',
          );
      _scrollToBottom();
    } catch (_) {
      _inputCtrl.text = text; // devolve o texto em caso de falha
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Não foi possível enviar. Tenta de novo.')),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _pickAndSendReceipt() async {
    final target = _target;
    if (target == null || _uploading) return;

    try {
      final picked = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 72,
        maxWidth: 1600,
      );
      if (picked == null) return;
      if (!mounted) return;
      setState(() => _uploading = true);

      final repo = ref.read(chatRepositoryProvider);
      final path = await repo.uploadAttachment(
        target.conversationId,
        File(picked.path),
        picked.name,
      );
      await repo.sendMessage(
        target.conversationId,
        body: 'Envio a minha receita em anexo.',
        attachmentPath: path,
        attachmentKind: 'image',
        senderRole: target.staffMode ? 'facility' : 'customer',
      );
      _scrollToBottom();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Não foi possível enviar a receita. Tenta de novo.'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  void _markReadIfNeeded(List<FacilityMessage> messages) {
    if (messages.isEmpty || _target == null) return;
    final newest = messages.last.id;
    if (newest != _lastMarkedMessageId) {
      _lastMarkedMessageId = newest;
      ref.read(chatRepositoryProvider).markRead(_target!.conversationId);
    }
  }

  // ── UI ────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final target = _target;

    // Resolução do alvo ainda em curso.
    if (target == null) {
      return const Scaffold(
        body: AppBackground(
          child: Center(
            child: CircularProgressIndicator(color: AppColors.accent),
          ),
        ),
      );
    }

    final messages = ref.watch(chatMessagesProvider(target.conversationId));
    final facility = target.facility;

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              // ── Cabeçalho da conversa ─────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 20, 10),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => context.pop(),
                      icon: const Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: facility.typeColor.withOpacity(0.18),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        _facilityIcon(facility.type),
                        color: facility.typeColor,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            facility.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                            ),
                          ),
                          Text(
                            facility.type.label,
                            style: TextStyle(
                              color: facility.typeColor,
                              fontSize: 11.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // ── Mensagens ─────────────────────────────────────────
              Expanded(
                child: messages.when(
                  loading: () => const Center(
                    child: CircularProgressIndicator(color: AppColors.accent),
                  ),
                  error: (e, _) => EmptyState(
                    icon: Icons.wifi_off_rounded,
                    title: 'Conversa indisponível',
                    message:
                        'Confirma que a migração facility_chat está aplicada '
                        'e tenta novamente.',
                    actionLabel: 'Recarregar',
                    onAction: () => ref
                        .invalidate(chatMessagesProvider(target.conversationId)),
                  ),
                  data: (list) {
                    _markReadIfNeeded(list);
                    if (list.isEmpty) return _emptyThread(facility);
                    return ListView.builder(
                      controller: _scrollCtrl,
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
                      itemCount: list.length,
                      itemBuilder: (context, i) => _MessageBubble(
                        message: list[i],
                        facilityColor: facility.typeColor,
                        target: target,
                      ),
                    );
                  },
                ),
              ),

              // ── Barra de escrita ──────────────────────────────────
              _Composer(
                controller: _inputCtrl,
                sending: _sending,
                uploading: _uploading,
                onSend: () => _send(),
                onAttach: _pickAndSendReceipt,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _emptyThread(HealthFacility facility) {
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
              Icon(_facilityIcon(facility.type),
                  color: facility.typeColor, size: 34),
              const SizedBox(height: 10),
              Text(
                'Fala com ${facility.name}',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w800,
                  fontSize: 15,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Pergunta se têm o medicamento que precisas ou envia uma '
                'foto da tua receita — sem expor produtos, sem catálogos.',
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
            'PERGUNTAS RÁPIDAS',
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
            for (final q in const [
              'Têm Paracetamol 500mg disponível?',
              'Quais serviços oferecem?',
              'Estão abertos agora?',
              'Aceitam receitas enviadas por aqui?',
            ])
              _QuickChip(label: q, onTap: () => _send(body: q)),
          ],
        ).animate(delay: 40.ms).fadeIn(duration: 260.ms),
      ],
    );
  }

  static IconData _facilityIcon(FacilityType type) {
    switch (type) {
      case FacilityType.pharmacy:
        return Icons.local_pharmacy_rounded;
      case FacilityType.hospital:
        return Icons.local_hospital_rounded;
      case FacilityType.clinic:
        return Icons.medical_services_rounded;
      case FacilityType.laboratory:
        return Icons.science_rounded;
      case FacilityType.veterinary:
        return Icons.pets_rounded;
    }
  }
}

// ── Bolha de mensagem ───────────────────────────────────────────────────

class _MessageBubble extends ConsumerWidget {
  const _MessageBubble({required this.message, required this.facilityColor, required this.target});

  final FacilityMessage message;
  final Color facilityColor;
  final ChatTarget target;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mine = message.isMineFor(target.staffMode);
    final align = mine ? Alignment.centerRight : Alignment.centerLeft;

    return Align(
      alignment: align,
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
            if (message.hasAttachment) _Attachment(path: message.attachmentPath!),
            if (message.body != null && message.body!.isNotEmpty)
              Padding(
                padding: EdgeInsets.only(top: message.hasAttachment ? 8 : 0),
                child: Text(
                  message.body!,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 14,
                    height: 1.35,
                  ),
                ),
              ),
            const SizedBox(height: 4),
            Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (!mine) ...[
                  Icon(Icons.verified_user_rounded,
                      size: 10, color: facilityColor),
                  const SizedBox(width: 4),
                ],
                Text(
                  formatRelative(message.createdAt),
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.45),
                    fontSize: 10.5,
                  ),
                ),
              ],
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

/// Anexo (foto da receita) — URL assinado gerado a pedido porque o
/// bucket é privado.
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
    _future =
        ref.read(chatRepositoryProvider).signedAttachmentUrl(widget.path);
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
            onTap: () => _openFull(context, url),
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

  void _openFull(BuildContext context, String url) {
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
  }
}

// ── Perguntas rápidas ───────────────────────────────────────────────────

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

// ── Barra de escrita ────────────────────────────────────────────────────

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
      padding: const EdgeInsets.fromLTRB(6, 6, 6, 6),
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
                  : const Icon(Icons.photo_camera_back_rounded,
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
              style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
              decoration: const InputDecoration(
                hintText: 'Pergunta o que precisas…',
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
