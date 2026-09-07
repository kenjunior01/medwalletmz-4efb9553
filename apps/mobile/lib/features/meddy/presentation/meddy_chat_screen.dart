import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/ai/gemini_client.dart';
import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../data/meddy_repository.dart';

/// Chat com o Meddy 🐻 — mascote IA do MedWallet.
///
/// • Conversa persistida em `meddy_conversations`/`meddy_messages`
///   (mesmas tabelas da web — histórico partilhado entre plataformas);
/// • Resposta via Gemini client-side (igual à web) com degradação
///   graciosa para "modo local" quando a chave não está definida;
/// • Cartão de CRISE com linha de apoio do país (MZ: 847) quando a IA
///   (ou o detector local) sinaliza risco;
/// • Chips de acção sugerida que navegam dentro do app;
/// • Estado vazio com sugestões rápidas.
class MeddyChatScreen extends ConsumerStatefulWidget {
  const MeddyChatScreen({super.key});

  @override
  ConsumerState<MeddyChatScreen> createState() => _MeddyChatScreenState();
}

class _MeddyChatScreenState extends ConsumerState<MeddyChatScreen> {
  final _inputCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();

  MeddyConversation? _conversation;
  List<MeddyMessage> _messages = [];
  bool _loading = true;
  bool _sending = false;
  String? _error;
  CrisisResource? _crisis;

  MeddyRepository get _repo => ref.read(meddyRepositoryProvider);

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    try {
      final conv = await _repo.getOrCreateConversation();
      final msgs = await _repo.fetchMessages(conv.id);
      if (!mounted) return;
      setState(() {
        _conversation = conv;
        _messages = msgs;
        _loading = false;
        _crisis = msgs.any((m) => m.isCrisisFlagged)
            ? CrisisResource.forCountry(null)
            : null;
      });
      _scrollToBottom();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Não foi possível abrir a conversa: $e';
      });
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollCtrl.hasClients) return;
      _scrollCtrl.animateTo(
        _scrollCtrl.position.maxScrollExtent,
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeOutCubic,
      );
    });
  }

  Future<void> _send([String? preset]) async {
    final text = (preset ?? _inputCtrl.text).trim();
    if (text.isEmpty || _sending || _conversation == null) return;
    _inputCtrl.clear();
    setState(() => _sending = true);
    // Bolha optimista do utilizador.
    final optimistic = MeddyMessage(
      id: 'tmp-${DateTime.now().millisecondsSinceEpoch}',
      role: 'user',
      content: text,
      createdAt: DateTime.now(),
    );
    setState(() {
      _messages = [..._messages, optimistic];
    });
    _scrollToBottom();
    try {
      final reply = await _repo.send(
        _conversation!.id,
        content: text,
        history: _messages.where((m) => !m.id.startsWith('tmp')).toList(),
      );
      if (!mounted) return;
      setState(() {
        _messages = [..._messages, reply];
        if (reply.isCrisisFlagged) _crisis = CrisisResource.forCountry(null);
        _sending = false;
      });
      _scrollToBottom();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _sending = false;
        _messages = [..._messages]
          ..removeWhere((m) => m.id == optimistic.id);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Falha ao enviar: $e')),
      );
    }
  }

  void _runAction(MeddyAction a) {
    switch (a.type) {
      case 'book_appointment':
      case 'open_doctors':
        context.push('/specialists');
      case 'open_journal':
        context.push('/journal');
      case 'open_wallet':
        context.push('/wallet');
      case 'open_circles':
        context.push('/circles');
      case 'open_meds':
        context.push('/meds');
      case 'open_records':
        context.push('/records');
      default:
        context.push('/services');
    }
  }

  @override
  void dispose() {
    _inputCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDeep,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Row(
          children: [
            const _MeddyAvatar(size: 40),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Meddy',
                    style:
                        TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                Text(
                  _sending ? 'a escrever…' : 'o teu companheiro de saúde',
                  style: TextStyle(
                      fontSize: 11.5,
                      color: _sending
                          ? AppColors.accent
                          : AppColors.textSecondary),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Nova conversa',
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _conversation == null
                ? null
                : () async {
                    await _repo.closeConversation(_conversation!.id);
                    if (!mounted) return;
                    setState(() {
                      _messages = [];
                      _conversation = null;
                      _crisis = null;
                      _loading = true;
                    });
                    _boot();
                  },
          ),
        ],
      ),
      body: AppBackground(
        child: SafeArea(
          child: Column(
            children: [
              Expanded(
                child: _loading
                    ? const Center(child: CircularProgressIndicator())
                    : _error != null
                        ? _ErrorView(message: _error!)
                        : _messages.isEmpty
                            ? _Welcome(onPick: _send)
                            : ListView.builder(
                                controller: _scrollCtrl,
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 16, vertical: 12),
                                itemCount: _messages.length + (_sending ? 1 : 0),
                                itemBuilder: (context, i) {
                                  if (i == _messages.length) {
                                    return const _TypingBubble();
                                  }
                                  return _Bubble(
                                    message: _messages[i],
                                    onAction: _runAction,
                                  );
                                },
                              ),
              ),
              if (_crisis != null) _CrisisCard(resource: _crisis!),
              _Composer(
                controller: _inputCtrl,
                sending: _sending,
                onSend: () => _send(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Componentes ─────────────────────────────────────────────────────────

class _MeddyAvatar extends StatelessWidget {
  const _MeddyAvatar({this.size = 44});
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: AppColors.buttonGradient),
        borderRadius: BorderRadius.circular(size * 0.32),
        boxShadow: const [BoxShadow(color: AppColors.glowCyan, blurRadius: 14)],
      ),
      child: Center(
        child: Text(
          '🐻',
          style: TextStyle(fontSize: size * 0.52),
        ),
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message, required this.onAction});
  final MeddyMessage message;
  final void Function(MeddyAction) onAction;

  @override
  Widget build(BuildContext context) {
    final isUser = message.isUser;
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.78),
        decoration: BoxDecoration(
          color: isUser
              ? const Color(0xFF1E5A86)
              : AppColors.card.withOpacity(0.9),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isUser ? 16 : 4),
            bottomRight: Radius.circular(isUser ? 4 : 16),
          ),
          border: Border.all(
            color: isUser ? Colors.transparent : AppColors.glassBorder,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!isUser)
              const Padding(
                padding: EdgeInsets.only(bottom: 4),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('🐻 Meddy',
                        style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppColors.accent)),
                  ],
                ),
              ),
            Text(
              message.content,
              style: const TextStyle(
                  fontSize: 14.5, height: 1.45, color: AppColors.textPrimary),
            ),
            if (message.suggestedActions.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: message.suggestedActions
                      .map((a) => ActionChip(
                            label: Text(a.label,
                                style: const TextStyle(fontSize: 12)),
                            backgroundColor:
                                AppColors.glassFillStrong,
                            side: const BorderSide(
                                color: AppColors.glassBorder),
                            onPressed: () => onAction(a),
                          ))
                      .toList(),
                ),
              ),
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                formatTimeOnly(message.createdAt),
                style: const TextStyle(
                    fontSize: 10, color: AppColors.textMuted),
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 250.ms).slideY(begin: 0.15, end: 0);
  }
}

class _TypingBubble extends StatelessWidget {
  const _TypingBubble();

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (i) {
            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 2),
              width: 7,
              height: 7,
              decoration: const BoxDecoration(
                color: AppColors.accent,
                shape: BoxShape.circle,
              ),
            )
                .animate(onPlay: (c) => c.repeat(reverse: true))
                .fade(begin: 0.3, end: 1, delay: (120 * i).ms);
          }),
        ),
      ),
    );
  }
}

class _CrisisCard extends StatelessWidget {
  const _CrisisCard({required this.resource});
  final CrisisResource resource;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.danger.withOpacity(0.14),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.danger.withOpacity(0.4)),
      ),
      child: Row(
        children: [
          const Icon(Icons.support_agent_rounded,
              color: AppColors.danger, size: 26),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(resource.name,
                    style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary)),
                Text(resource.hours,
                    style: const TextStyle(
                        fontSize: 11.5, color: AppColors.textSecondary)),
              ],
            ),
          ),
          FilledButton.icon(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.danger,
              padding: const EdgeInsets.symmetric(horizontal: 12),
            ),
            onPressed: () async {
              final uri = Uri(scheme: 'tel', path: resource.phone);
              await launchUrl(uri, mode: LaunchMode.externalApplication);
            },
            icon: const Icon(Icons.call_rounded, size: 16),
            label: const Text('Ligar'),
          ),
        ],
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.sending,
    required this.onSend,
  });

  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 8, 14, 12),
      decoration: const BoxDecoration(
        color: Color(0xCC0A1826),
        border: Border(top: BorderSide(color: AppColors.glassBorder)),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              minLines: 1,
              maxLines: 4,
              textCapitalization: TextCapitalization.sentences,
              style: const TextStyle(
                  color: AppColors.textPrimary, fontSize: 14.5),
              decoration: InputDecoration(
                hintText: 'Fala com o Meddy…',
                hintStyle: const TextStyle(color: AppColors.textMuted),
                filled: true,
                fillColor: AppColors.glassFill,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(22),
                  borderSide: BorderSide.none,
                ),
              ),
              onSubmitted: (_) => onSend(),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: sending ? null : onSend,
            child: Container(
              width: 46,
              height: 46,
              decoration: const BoxDecoration(
                gradient: LinearGradient(colors: AppColors.buttonGradient),
                shape: BoxShape.circle,
              ),
              child: sending
                  ? const Padding(
                      padding: EdgeInsets.all(13),
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.send_rounded,
                      color: Colors.white, size: 20),
            ),
          ),
        ],
      ),
    );
  }
}

class _Welcome extends StatelessWidget {
  const _Welcome({required this.onPick});
  final void Function(String) onPick;

  static const _suggestions = [
    'Como está o meu humor esta semana?',
    'Esqueci-me de tomar o medicamento, e agora?',
    'Tenho tido dores de cabeça…',
    'Estou um pouco ansioso com o trabalho',
  ];

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 24),
        const Center(child: _MeddyAvatar(size: 84)),
        const SizedBox(height: 18),
        const Text(
          'Olá! Eu sou o Meddy 🐻',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        const Text(
          'Estou aqui para conversar sobre o teu bem-estar, lembrar '
          'medicação e ajudar-te a usar o MedWallet. Como te sentes hoje?',
          textAlign: TextAlign.center,
          style: TextStyle(
              fontSize: 14.5, height: 1.5, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 22),
        ..._suggestions.map(
          (s) => Container(
            margin: const EdgeInsets.only(bottom: 10),
            child: OutlinedButton(
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.textPrimary,
                side: const BorderSide(color: AppColors.glassBorder),
                backgroundColor: AppColors.glassFill,
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
                alignment: Alignment.centerLeft,
              ),
              onPressed: () => onPick(s),
              child: Text(s, style: const TextStyle(fontSize: 14)),
            ),
          ),
        ),
      ],
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.wifi_off_rounded,
                size: 42, color: AppColors.textMuted),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style:
                  const TextStyle(color: AppColors.textSecondary, height: 1.5),
            ),
            const SizedBox(height: 8),
            Text(
              isGeminiConfigured
                  ? 'Tenta novamente em instantes.'
                  : kGeminiUnavailableHint,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  fontSize: 12.5, color: AppColors.textMuted, height: 1.5),
            ),
          ],
        ),
      ),
    );
  }
}
