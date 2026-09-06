import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../data/circles_repository.dart';

/// Chat de grupo do círculo de apoio — REALTIME.
///
/// • Mensagens com ANONIMATO opcional (toggle no composer);
/// • Moderação do backend: a mensagem própria mostra o estado
///   (em revisão / sinalizada / removida);
/// • Stream realtime da tabela `support_circle_messages` (publicação
///   ativada pela migração aditiva 20260906000000) — reacções e novas
///   mensagens de outros membros aparecem sem polling;
/// • REACÇÕES: toque longo numa mensagem abre a folha de reacções e
///   acções; chips de emoji sob a bolha com contagem;
/// • RESPOSTAS: "Responder" cita a mensagem acima do composer;
/// • Marca de leitura automática (badges da lista de círculos);
/// • Diretrizes da comunidade sempre acessíveis no cabeçalho.
class CircleChatScreen extends ConsumerStatefulWidget {
  const CircleChatScreen({super.key, required this.circle});

  final SupportCircle circle;

  @override
  ConsumerState<CircleChatScreen> createState() => _CircleChatScreenState();
}

class _CircleChatScreenState extends ConsumerState<CircleChatScreen> {
  final _inputCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  List<CircleMessage> _messages = [];
  Map<String, String> _authorNames = const {};
  bool _anonymous = false;
  bool _loading = true;
  bool _sending = false;
  CircleMessage? _replyTo;
  StreamSubscription<List<CircleMessage>>? _sub;
  Timer? _markReadDebounce;

  CirclesRepository get _repo => ref.read(circlesRepositoryProvider);

  String get _myId => Supabase.instance.client.auth.currentUser?.id ?? '';

  @override
  void initState() {
    super.initState();
    _subscribe();
  }

  void _subscribe() {
    _sub?.cancel();
    _sub = _repo.streamMessages(widget.circle.id).listen(
      (msgs) {
        if (!mounted) return;
        _resolveNames(msgs);
        setState(() {
          _messages = msgs;
          _loading = false;
        });
        _scrollToBottom();
        _scheduleMarkRead();
      },
      onError: (_) {
        if (mounted) setState(() => _loading = false);
      },
    );
    // Pintura imediata antes do primeiro snapshot do realtime.
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    try {
      final msgs = await _repo.fetchMessages(widget.circle.id);
      if (!mounted || _messages.isNotEmpty) return;
      _resolveNames(msgs);
      setState(() {
        _messages = msgs;
        _loading = false;
      });
      _scrollToBottom();
      _scheduleMarkRead();
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resolveNames(List<CircleMessage> msgs) async {
    final missing = [
      for (final m in msgs)
        if (!m.isAnonymous && !m.isMine && _authorNames[m.userId] == null)
          m.userId,
    ].toSet().toList();
    if (missing.isEmpty) return;
    final names = await _repo.fetchAuthorNames(missing);
    if (mounted && names.isNotEmpty) {
      setState(() => _authorNames = {..._authorNames, ...names});
    }
  }

  void _scheduleMarkRead() {
    _markReadDebounce?.cancel();
    _markReadDebounce = Timer(const Duration(milliseconds: 900), () {
      _repo.markRead(widget.circle.id);
    });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.jumpTo(_scrollCtrl.position.maxScrollExtent);
      }
    });
  }

  Future<void> _send() async {
    final text = _inputCtrl.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() {
      _sending = true;
      _replyTo = null;
    });
    _inputCtrl.clear();
    try {
      await _repo.sendMessage(
        widget.circle.id,
        text,
        anonymous: _anonymous,
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Não foi possível enviar. Tenta novamente.'),
          behavior: SnackBarBehavior.floating,
        ));
      }
    }
    if (mounted) setState(() => _sending = false);
  }

  Future<void> _toggleReaction(CircleMessage m, String emoji) async {
    try {
      await _repo.toggleReaction(m.id, emoji);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Não foi possível reagir agora.'),
          behavior: SnackBarBehavior.floating,
        ));
      }
    }
  }

  Future<void> _deleteMessage(CircleMessage m) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (dlgCtx) => AlertDialog(
        backgroundColor: AppColors.bgHigh,
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Apagar mensagem',
            style: TextStyle(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w800,
                fontSize: 16)),
        content: const Text(
            'A tua mensagem será removida do círculo para todos.',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dlgCtx, false),
            child: const Text('Cancelar',
                style: TextStyle(color: AppColors.textMuted)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(dlgCtx, true),
            child: const Text('Apagar',
                style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (ok == true) await _repo.deleteMessage(m.id);
  }

  /// Folha de reacções + acções (toque longo na bolha).
  void _showMessageActions(CircleMessage m) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => Container(
        decoration: const BoxDecoration(
          color: AppColors.bgHigh,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 30),
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
            const SizedBox(height: 18),
            Text(
              'Reagir',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 12,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.4,
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                for (final emoji in CircleReactions.emojis)
                  InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: () {
                      Navigator.pop(sheetCtx);
                      _toggleReaction(m, emoji);
                    },
                    child: Container(
                      padding: const EdgeInsets.all(9),
                      decoration: BoxDecoration(
                        color: m.iReacted(emoji, _myId)
                            ? AppColors.accent.withOpacity(0.22)
                            : Colors.white.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: m.iReacted(emoji, _myId)
                              ? AppColors.accent.withOpacity(0.5)
                              : Colors.white.withOpacity(0.08),
                        ),
                      ),
                      child: Text(emoji,
                          style: const TextStyle(fontSize: 21)),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _ActionTile(
                    icon: Icons.reply_rounded,
                    label: 'Responder',
                    onTap: () {
                      Navigator.pop(sheetCtx);
                      setState(() => _replyTo = m);
                    },
                  ),
                ),
                if (m.isMine) ...[
                  const SizedBox(width: 10),
                  Expanded(
                    child: _ActionTile(
                      icon: Icons.delete_outline_rounded,
                      label: 'Apagar',
                      danger: true,
                      onTap: () {
                        Navigator.pop(sheetCtx);
                        _deleteMessage(m);
                      },
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showGuidelines() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => Container(
        decoration: const BoxDecoration(
          color: AppColors.bgHigh,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(22, 18, 22, 26),
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
            const Text(
              'Diretrizes da comunidade',
              style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 17,
                  fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 12),
            Text(
              widget.circle.guidelines ??
                  'Permitido: partilha de experiências, dicas de bem-estar e suporte emocional. '
                      'Proibido: conselhos médicos específicos que substituam um profissional.',
              style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 13,
                  height: 1.5),
            ),
            const SizedBox(height: 12),
            Row(
              children: const [
                Icon(Icons.verified_user_rounded,
                    size: 16, color: AppColors.success),
                SizedBox(width: 7),
                Expanded(
                  child: Text(
                    'As mensagens passam por moderação automática (IA) antes de ficar visíveis para todos.',
                    style: TextStyle(color: AppColors.textMuted, fontSize: 11.5),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _sub?.cancel();
    _markReadDebounce?.cancel();
    _inputCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final circle = widget.circle;

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              // ── Cabeçalho ────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(6, 8, 12, 6),
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
                        borderRadius: BorderRadius.circular(13),
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [Color(0xFF2E86BF), Color(0xFF124B70)],
                        ),
                      ),
                      child: Icon(CircleTags.iconFor(circle.conditionTag),
                          color: Colors.white, size: 20),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  circle.name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: AppColors.textPrimary,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 14.5,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              Icon(Icons.circle,
                                  size: 7, color: AppColors.success),
                              const SizedBox(width: 3),
                              const Text(
                                'ao vivo',
                                style: TextStyle(
                                    color: AppColors.success,
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w700),
                              ),
                            ],
                          ),
                          Text(
                            '${circle.memberCount} membros · ${CircleTags.label(circle.conditionTag)}',
                            style: const TextStyle(
                              color: AppColors.textMuted,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: 'Diretrizes',
                      onPressed: _showGuidelines,
                      icon: const Icon(Icons.info_outline_rounded,
                          color: AppColors.accent, size: 20),
                    ),
                  ],
                ),
              ),

              // ── Mensagens ────────────────────────────────────────
              Expanded(
                child: _loading
                    ? const Center(
                        child: CircularProgressIndicator(
                            color: AppColors.accent))
                    : _messages.isEmpty
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(36),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.forum_outlined,
                                      size: 44, color: AppColors.textMuted),
                                  const SizedBox(height: 12),
                                  const Text(
                                    'Sê o primeiro a partilhar',
                                    style: TextStyle(
                                        color: AppColors.textPrimary,
                                        fontWeight: FontWeight.w800,
                                        fontSize: 15),
                                  ),
                                  const SizedBox(height: 6),
                                  const Text(
                                    'Como foi a tua experiência? Podes enviar anonimamente.',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                        color: AppColors.textSecondary,
                                        fontSize: 12.5),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : ListView.builder(
                            controller: _scrollCtrl,
                            padding:
                                const EdgeInsets.fromLTRB(16, 4, 16, 10),
                            itemCount: _messages.length,
                            itemBuilder: (context, i) {
                              final m = _messages[i];
                              return _MessageBubble(
                                message: m,
                                authorName: _authorNames[m.userId],
                                replySource: m.replyToId == null
                                    ? null
                                    : _messages
                                        .where(
                                            (x) => x.id == m.replyToId)
                                        .firstOrNull,
                                onLongPress: () => _showMessageActions(m),
                                onReactionTap: (emoji) =>
                                    _toggleReaction(m, emoji),
                                onReplyTap: () =>
                                    setState(() => _replyTo = m),
                              );
                            },
                          ),
              ),

              // ── Barra de resposta citada ─────────────────────────
              if (_replyTo != null)
                Container(
                  margin: const EdgeInsets.fromLTRB(14, 0, 14, 4),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.accent.withOpacity(0.10),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                        color: AppColors.accent.withOpacity(0.30)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.reply_rounded,
                          size: 15, color: AppColors.accent),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _replyTo!.isMine
                              ? 'A responder à tua mensagem: ${_replyTo!.content}'
                              : 'A responder a ${_replyTo!.isAnonymous ? 'Anónimo' : (_authorNames[_replyTo!.userId] ?? 'Membro')}: ${_replyTo!.content}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              color: AppColors.textSecondary, fontSize: 11.5),
                        ),
                      ),
                      GestureDetector(
                        onTap: () => setState(() => _replyTo = null),
                        child: const Icon(Icons.close_rounded,
                            size: 16, color: AppColors.textMuted),
                      ),
                    ],
                  ),
                ),

              // ── Composer ─────────────────────────────────────────
              Container(
                margin: const EdgeInsets.fromLTRB(14, 4, 14, 12),
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.06),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withOpacity(0.10)),
                ),
                child: Row(
                  children: [
                    // Toggle de anonimato.
                    Tooltip(
                      message: _anonymous
                          ? 'A publicar como Anónimo'
                          : 'A publicar com o teu nome',
                      child: InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: () =>
                            setState(() => _anonymous = !_anonymous),
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            color: _anonymous
                                ? AppColors.accent.withOpacity(0.18)
                                : Colors.transparent,
                          ),
                          child: Icon(
                            _anonymous
                                ? Icons.visibility_off_rounded
                                : Icons.visibility_rounded,
                            size: 19,
                            color: _anonymous
                                ? AppColors.accent
                                : AppColors.textMuted,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: _inputCtrl,
                        minLines: 1,
                        maxLines: 4,
                        textCapitalization: TextCapitalization.sentences,
                        style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 13.5),
                        decoration: InputDecoration(
                          hintText: _anonymous
                              ? 'Mensagem anónima…'
                              : 'Partilha com o círculo…',
                          hintStyle: const TextStyle(
                              color: AppColors.textMuted,
                              fontSize: 13),
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding:
                              const EdgeInsets.symmetric(vertical: 10),
                        ),
                        onSubmitted: (_) => _send(),
                      ),
                    ),
                    const SizedBox(width: 6),
                    InkWell(
                      borderRadius: BorderRadius.circular(14),
                      onTap: _sending ? null : _send,
                      child: Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: const LinearGradient(colors: [
                            Color(0xFF2E86BF),
                            Color(0xFF1E6B9C),
                          ]),
                        ),
                        child: _sending
                            ? const Padding(
                                padding: EdgeInsets.all(10),
                                child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white))
                            : const Icon(Icons.send_rounded,
                                size: 17, color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActionTile extends StatelessWidget {
  const _ActionTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.danger = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final color = danger ? AppColors.danger : AppColors.accent;
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.10),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withOpacity(0.30)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 17, color: color),
            const SizedBox(width: 7),
            Text(label,
                style: TextStyle(
                    color: color,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800)),
          ],
        ),
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({
    required this.message,
    this.authorName,
    this.replySource,
    this.onLongPress,
    this.onReactionTap,
    this.onReplyTap,
  });

  final CircleMessage message;
  final String? authorName;
  final CircleMessage? replySource;
  final VoidCallback? onLongPress;
  final ValueChanged<String>? onReactionTap;
  final VoidCallback? onReplyTap;

  @override
  Widget build(BuildContext context) {
    final mine = message.isMine;
    final hidden = !mine && message.isHiddenByModeration;
    final pending = mine && message.moderationStatus == 'pending';

    if (hidden) {
      return const SizedBox.shrink();
    }

    final displayName = mine
        ? 'Tu'
        : message.isAnonymous
            ? 'Anónimo'
            : (authorName ?? 'Membro');

    final reactions = message.reactionCounts;

    final bubble = Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 9),
        padding: const EdgeInsets.fromLTRB(13, 9, 13, 8),
        constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.78),
        decoration: BoxDecoration(
          color: mine
              ? AppColors.primary.withOpacity(0.38)
              : Colors.white.withOpacity(0.06),
          borderRadius: BorderRadius.only(
            topLeft: mine
                ? const Radius.circular(4)
                : const Radius.circular(16),
            topRight: mine
                ? const Radius.circular(16)
                : const Radius.circular(4),
            bottomLeft: const Radius.circular(16),
            bottomRight: const Radius.circular(16),
          ),
          border: Border.all(
            color: mine
                ? AppColors.accent.withOpacity(0.30)
                : Colors.white.withOpacity(0.08),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  message.isAnonymous
                      ? Icons.visibility_off_rounded
                      : Icons.person_rounded,
                  size: 11,
                  color: message.isAnonymous
                      ? AppColors.accent
                      : AppColors.textMuted,
                ),
                const SizedBox(width: 4),
                Text(
                  displayName,
                  style: TextStyle(
                    color: message.isAnonymous
                        ? AppColors.accent
                        : AppColors.textSecondary,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  _timeLabel(message.createdAt),
                  style: const TextStyle(
                      color: AppColors.textMuted, fontSize: 9.5),
                ),
              ],
            ),
            const SizedBox(height: 4),
            // Citação da mensagem respondida.
            if (replySource != null)
              GestureDetector(
                onTap: onReplyTap,
                child: Container(
                  margin: const EdgeInsets.only(bottom: 6, top: 2),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.22),
                    borderRadius: BorderRadius.circular(9),
                    border: Border(
                        left: BorderSide(
                            color: AppColors.accent.withOpacity(0.7),
                            width: 2.5)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        replySource!.isMine
                            ? 'Tu'
                            : replySource!.isAnonymous
                                ? 'Anónimo'
                                : 'Membro',
                        style: const TextStyle(
                            color: AppColors.accent,
                            fontSize: 10,
                            fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        replySource!.content,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            color: AppColors.textMuted, fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ),
            Text(
              message.content,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 13.5,
                height: 1.35,
              ),
            ),
            if (pending) ...[
              const SizedBox(height: 5),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.hourglass_top_rounded,
                      size: 11, color: AppColors.warning),
                  const SizedBox(width: 4),
                  Text(
                    message.moderationLabel,
                    style: TextStyle(
                        color: AppColors.warning.withOpacity(0.95),
                        fontSize: 10),
                  ),
                ],
              ),
            ],
            // Chips de reacções.
            if (reactions.isNotEmpty) ...[
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: [
                  for (final e in reactions.entries)
                    InkWell(
                      borderRadius: BorderRadius.circular(20),
                      onTap: onReactionTap == null
                          ? null
                          : () => onReactionTap!(e.key),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: message.iReacted(e.key,
                                      Supabase.instance.client.auth
                                          .currentUser?.id ??
                                      '')
                              ? AppColors.accent.withOpacity(0.25)
                              : Colors.white.withOpacity(0.07),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: message.iReacted(e.key,
                                        Supabase.instance.client.auth
                                            .currentUser?.id ??
                                        '')
                                    ? AppColors.accent.withOpacity(0.55)
                                    : Colors.white.withOpacity(0.10),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(e.key,
                                style:
                                    const TextStyle(fontSize: 12.5)),
                            const SizedBox(width: 4),
                            Text('${e.value}',
                                style: TextStyle(
                                    color: AppColors.textSecondary,
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w800)),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    )
        .animate(delay: (20 * (message.id.hashCode % 8)).ms)
        .fadeIn(duration: 180.ms);

    // Toque curto responde (cita) · toque longo abre reacções/acções.
    return GestureDetector(
      onLongPress: onLongPress,
      onTap: (replySource == null && onReplyTap == null)
          ? null
          : onReplyTap,
      child: bubble,
    );
  }

  String _timeLabel(DateTime dt) {
    final local = dt.toLocal();
    final h = local.hour.toString().padLeft(2, '0');
    final m = local.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }
}
