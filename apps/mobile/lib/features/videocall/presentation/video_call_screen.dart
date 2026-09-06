import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../chat/data/consultation_chat_models.dart';
import '../data/jitsi_embedded_service.dart';
import '../data/video_call_repository.dart';

/// Estado local do ecrã de chamada (micro/câmara são locais — a sala em
/// si vive no Jitsi Meet; o estado da sessão vive em video_sessions).
class _CallUiState {
  const _CallUiState({
    this.micOn = true,
    this.camOn = true,
    this.speakerOn = true,
    this.inRoom = false,
  });

  final bool micOn;
  final bool camOn;
  final bool speakerOn;
  final bool inRoom;

  _CallUiState copyWith({
    bool? micOn,
    bool? camOn,
    bool? speakerOn,
    bool? inRoom,
  }) =>
      _CallUiState(
        micOn: micOn ?? this.micOn,
        camOn: camOn ?? this.camOn,
        speakerOn: speakerOn ?? this.speakerOn,
        inRoom: inRoom ?? this.inRoom,
      );
}

/// Videochamada da consulta — sala sincronizada na base de dados
/// (video_sessions) com áudio/vídeo reais via Jitsi Meet.
///
/// Fluxo: ao abrir, garante a sessão (ensureSession) e marca-a como
/// `in_progress` quando o utilizador entra; o outro lado vê a mudança
/// de estado em realtime (waiting → in_progress → ended).
class VideoCallScreen extends ConsumerStatefulWidget {
  const VideoCallScreen({super.key, required this.thread});

  final ConsultationThread thread;

  @override
  ConsumerState<VideoCallScreen> createState() => _VideoCallScreenState();
}

class _VideoCallScreenState extends ConsumerState<VideoCallScreen> {
  VideoCallSession? _session;
  bool _loading = true;
  String? _error;
  _CallUiState _ui = const _CallUiState();
  Timer? _elapsedTicker;
  DateTime? _connectedSince;
  StreamSubscription<VideoCallSession?>? _sub;

  VideoCallRepository get _repo => ref.read(videoCallRepositoryProvider);

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    final session =
        await _repo.ensureSession(widget.thread.consultation.id);
    if (!mounted) return;
    if (session == null) {
      setState(() {
        _loading = false;
        _error = 'Não foi possível abrir a sala de vídeo.';
      });
      return;
    }
    setState(() {
      _session = session;
      _loading = false;
      if (session.isLive && session.startedAt != null) {
        _connectedSince = session.startedAt;
      }
    });

    // Realtime: quando a outra parte entra/saí, a UI reflecte.
    _sub = _repo.watchSession(session.consultationId).listen((updated) {
      if (!mounted || updated == null) return;
      setState(() => _session = updated);
      if (updated.isLive && _connectedSince == null) {
        setState(() => _connectedSince = DateTime.now());
        _startTicker();
      }
      if (updated.hasEnded && mounted) {
        _stopTicker();
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Chamada encerrada pela outra parte.'),
          behavior: SnackBarBehavior.floating,
        ));
        context.pop();
      }
    });
  }

  void _startTicker() {
    _elapsedTicker?.cancel();
    _elapsedTicker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  void _stopTicker() => _elapsedTicker?.cancel();

  String get _elapsedLabel {
    final since = _connectedSince;
    if (since == null) return '00:00';
    final d = DateTime.now().difference(since);
    final h = d.inHours, m = d.inMinutes.remainder(60), s = d.inSeconds.remainder(60);
    String two(int n) => n.toString().padLeft(2, '0');
    return h > 0 ? '${two(h)}:${two(m)}:${two(s)}' : '${two(m)}:${two(s)}';
  }

  Future<void> _joinRoom() async {
    final session = _session;
    if (session == null) return;
    setState(() => _ui = _ui.copyWith(inRoom: true));
    if (session.isWaiting) {
      await _repo.markStarted(session.id);
      if (!mounted) return;
      setState(() {
        _connectedSince ??= DateTime.now();
      });
      _startTicker();
    }

    // 1ª tentativa — SDK Jitsi EMBUTIDO (áudio/vídeo dentro da app).
    JitsiEmbeddedService.instance.onTerminated = () {
      if (mounted) {
        setState(() => _ui = _ui.copyWith(inRoom: false));
      }
    };
    final embedded = await JitsiEmbeddedService.instance.join(
      roomUrl: session.jitsiUrl,
      displayName: widget.thread.title,
      avatarUrl: widget.thread.counterpartAvatar,
      audioMuted: !_ui.micOn,
      videoMuted: !_ui.camOn,
    );
    if (embedded) return;

    // Fallback — abre a sala no browser / app Jitsi externa.
    try {
      await launchUrl(Uri.parse(session.jitsiUrl),
          mode: LaunchMode.externalApplication);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Abre o link da sala no browser para entrar.'),
          behavior: SnackBarBehavior.floating,
        ));
      }
    }
  }

  Future<void> _endCall() async {
    final session = _session;
    _stopTicker();
    // Desliga também a conferência embutida (se estiver in-app).
    await JitsiEmbeddedService.instance.hangUp();
    if (session != null && !session.hasEnded) {
      await _repo.markEnded(session.id);
    }
    if (mounted) context.pop();
  }

  @override
  void dispose() {
    _stopTicker();
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final thread = widget.thread;
    final session = _session;

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          child: _loading
              ? const Center(
                  child: CircularProgressIndicator(color: AppColors.accent))
              : _error != null
                  ? _ErrorPane(message: _error!, onRetry: _boot)
                  : Column(
                      children: [
                        _Header(onBack: () => context.pop()),
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
                            child: Column(
                              children: [
                                const Spacer(),
                                // Avatar grande do interlocutor.
                                _BigAvatar(
                                  name: thread.title,
                                  avatarUrl: thread.counterpartAvatar,
                                  pulsing: session?.isWaiting ?? true,
                                ),
                                const SizedBox(height: 18),
                                Text(
                                  thread.title,
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    color: AppColors.textPrimary,
                                    fontSize: 22,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                AnimatedSwitcher(
                                  duration: const Duration(milliseconds: 350),
                                  child: (session?.isWaiting ?? true)
                                      ? const Text(
                                          'A chamar… aguardando a outra parte',
                                          key: ValueKey('wait'),
                                          style: TextStyle(
                                            color: AppColors.textSecondary,
                                            fontSize: 13.5,
                                          ),
                                        )
                                      : Text(
                                          'Em chamada · $_elapsedLabel',
                                          key: const ValueKey('live'),
                                          style: const TextStyle(
                                            color: AppColors.success,
                                            fontSize: 13.5,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                ),
                                if (session != null) ...[
                                  const SizedBox(height: 14),
                                  _RoomChip(roomUrl: session.jitsiUrl),
                                ],
                                const Spacer(),
                                // Controlos da chamada.
                                _CallControls(
                                  ui: _ui,
                                  onToggleMic: () => setState(
                                      () => _ui = _ui.copyWith(micOn: !_ui.micOn)),
                                  onToggleCam: () => setState(
                                      () => _ui = _ui.copyWith(camOn: !_ui.camOn)),
                                  onToggleSpeaker: () => setState(() =>
                                      _ui =
                                          _ui.copyWith(speakerOn: !_ui.speakerOn)),
                                  onOpenRoom: _joinRoom,
                                  onEnd: _endCall,
                                ),
                              ],
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

// ── Cabeçalho minimalista ─────────────────────────────────────────────
class _Header extends StatelessWidget {
  const _Header({required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 16, 0),
      child: Row(
        children: [
          IconButton(
            onPressed: onBack,
            icon: const Icon(Icons.arrow_back_rounded,
                color: AppColors.textPrimary),
          ),
          const Expanded(
            child: Text(
              'Videochamada segura',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w700,
                fontSize: 13.5,
              ),
            ),
          ),
          const Icon(Icons.verified_user_rounded,
              color: AppColors.success, size: 18),
          const SizedBox(width: 6),
          const Text(
            'Encriptada',
            style: TextStyle(
              color: AppColors.success,
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _BigAvatar extends StatelessWidget {
  const _BigAvatar({
    required this.name,
    required this.avatarUrl,
    required this.pulsing,
  });

  final String name;
  final String? avatarUrl;
  final bool pulsing;

  @override
  Widget build(BuildContext context) {
    final initial = name.isNotEmpty ? name.characters.first.toUpperCase() : '?';
    final avatar = Container(
      width: 122,
      height: 122,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF2E86BF), Color(0xFF124B70)],
        ),
        border: Border.all(color: Colors.white.withOpacity(0.18), width: 2),
        image: (avatarUrl != null && avatarUrl!.startsWith('http'))
            ? DecorationImage(
                image: NetworkImage(avatarUrl!), fit: BoxFit.cover)
            : null,
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.45),
            blurRadius: 34,
            spreadRadius: 4,
          ),
        ],
      ),
      child: (avatarUrl == null || !avatarUrl!.startsWith('http'))
          ? Center(
              child: Text(initial,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 42,
                    fontWeight: FontWeight.w800,
                  )))
          : null,
    );

    if (!pulsing) return avatar;
    return avatar
        .animate(onPlay: (c) => c.repeat(reverse: true))
        .scaleXY(begin: 0.97, end: 1.04, duration: 1200.ms, curve: Curves.easeInOut);
  }
}

class _RoomChip extends StatelessWidget {
  const _RoomChip({required this.roomUrl});

  final String roomUrl;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(30),
      onTap: () async {
        final messenger = ScaffoldMessenger.of(context);
        try {
          await launchUrl(Uri.parse(roomUrl),
              mode: LaunchMode.externalApplication);
        } catch (_) {
          messenger.showSnackBar(SnackBar(
            content: Text(roomUrl),
            behavior: SnackBarBehavior.floating,
          ));
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.06),
          borderRadius: BorderRadius.circular(30),
          border: Border.all(color: Colors.white.withOpacity(0.12)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.link_rounded,
                size: 14, color: AppColors.accent),
            const SizedBox(width: 6),
            Text(
              'Sala: meet.jit.si/medwallet-…',
              style: TextStyle(
                color: AppColors.textSecondary.withOpacity(0.9),
                fontSize: 11.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CallControls extends StatelessWidget {
  const _CallControls({
    required this.ui,
    required this.onToggleMic,
    required this.onToggleCam,
    required this.onToggleSpeaker,
    required this.onOpenRoom,
    required this.onEnd,
  });

  final _CallUiState ui;
  final VoidCallback onToggleMic;
  final VoidCallback onToggleCam;
  final VoidCallback onToggleSpeaker;
  final VoidCallback onOpenRoom;
  final VoidCallback onEnd;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _RoundToggle(
              icon: ui.micOn
                  ? Icons.mic_rounded
                  : Icons.mic_off_rounded,
              active: ui.micOn,
              onTap: onToggleMic,
            ),
            const SizedBox(width: 16),
            _RoundToggle(
              icon: ui.camOn
                  ? Icons.videocam_rounded
                  : Icons.videocam_off_rounded,
              active: ui.camOn,
              onTap: onToggleCam,
            ),
            const SizedBox(width: 16),
            _RoundToggle(
              icon: ui.speakerOn
                  ? Icons.volume_up_rounded
                  : Icons.volume_off_rounded,
              active: ui.speakerOn,
              onTap: onToggleSpeaker,
            ),
          ],
        ),
        const SizedBox(height: 22),
        Row(
          children: [
            Expanded(
              child: _GlassAction(
                icon: Icons.meeting_room_rounded,
                label: ui.inRoom ? 'Voltar à sala' : 'Entrar na sala',
                onTap: onOpenRoom,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: _EndButton(onTap: onEnd),
            ),
          ],
        ),
      ],
    );
  }
}

class _RoundToggle extends StatelessWidget {
  const _RoundToggle({
    required this.icon,
    required this.active,
    required this.onTap,
  });

  final IconData icon;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(30),
      child: Container(
        width: 58,
        height: 58,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: active
              ? Colors.white.withOpacity(0.10)
              : Colors.white.withOpacity(0.05),
          border: Border.all(
            color: active
                ? AppColors.accent.withOpacity(0.5)
                : Colors.white.withOpacity(0.10),
          ),
        ),
        child: Icon(icon,
            color: active ? AppColors.accent : AppColors.textMuted, size: 24),
      ),
    );
  }
}

class _GlassAction extends StatelessWidget {
  const _GlassAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        height: 52,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          color: Colors.white.withOpacity(0.08),
          border: Border.all(color: Colors.white.withOpacity(0.14)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 19, color: AppColors.accent),
            const SizedBox(width: 8),
            Text(label,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w700,
                  fontSize: 13.5,
                )),
          ],
        ),
      ),
    );
  }
}

class _EndButton extends StatelessWidget {
  const _EndButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        height: 52,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          gradient: const LinearGradient(
            colors: [Color(0xFFEF4444), Color(0xFFB91C1C)],
          ),
          boxShadow: [
            BoxShadow(
              color: AppColors.danger.withOpacity(0.35),
              blurRadius: 18,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.call_end_rounded, size: 21, color: Colors.white),
            SizedBox(width: 8),
            Text('Encerrar',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 14,
                )),
          ],
        ),
      ),
    );
  }
}

class _ErrorPane extends StatelessWidget {
  const _ErrorPane({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.videocam_off_rounded,
                size: 44, color: AppColors.textMuted),
            const SizedBox(height: 14),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  color: AppColors.textSecondary, fontSize: 14),
            ),
            const SizedBox(height: 18),
            TextButton(
              onPressed: onRetry,
              child: const Text('Tentar novamente',
                  style: TextStyle(color: AppColors.accent)),
            ),
          ],
        ),
      ),
    );
  }
}
