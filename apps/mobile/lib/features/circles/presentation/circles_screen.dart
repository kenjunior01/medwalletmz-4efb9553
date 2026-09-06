import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/circles_repository.dart';

/// Círculos de Apoio — descoberta de comunidades por condição de
/// saúde. Entrar num círculo dá acesso ao chat de grupo com
/// anonimato opcional e moderação do backend.
class CirclesScreen extends ConsumerStatefulWidget {
  const CirclesScreen({super.key});

  @override
  ConsumerState<CirclesScreen> createState() => _CirclesScreenState();
}

class _CirclesScreenState extends ConsumerState<CirclesScreen> {
  String? _tag;
  bool _loading = true;
  List<SupportCircle> _circles = const [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final circles = await ref
          .read(circlesRepositoryProvider)
          .fetchCircles(conditionTag: _tag);
      if (!mounted) return;
      setState(() {
        _circles = circles;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Não foi possível carregar os círculos.';
      });
    }
  }

  Future<void> _toggleJoin(SupportCircle circle) async {
    final repo = ref.read(circlesRepositoryProvider);
    try {
      if (circle.joined) {
        await repo.leave(circle.id);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Saíste de "${circle.name}".'),
          behavior: SnackBarBehavior.floating,
        ));
      } else {
        await repo.join(circle.id);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Bem-vindo a "${circle.name}"! 💙'),
          behavior: SnackBarBehavior.floating,
        ));
      }
      await _load();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Não foi possível atualizar a adesão.'),
        behavior: SnackBarBehavior.floating,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Cabeçalho ────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(6, 8, 16, 0),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => context.pop(),
                      icon: const Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    const Expanded(
                      child: Text(
                        'Círculos de Apoio',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 19,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 2, 20, 12),
                child: Text(
                  'Comunidades moderadas — partilha experiências com quem vive o mesmo que tu',
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5),
                ),
              ),

              // ── Filtros por condição ─────────────────────────────
              SizedBox(
                height: 42,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  itemCount: CircleTags.all.length + 1,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, i) {
                    final isAll = i == 0;
                    final tag = isAll ? null : CircleTags.all[i - 1];
                    final active = _tag == tag;
                    return FilterChip(
                      selected: active,
                      onSelected: (_) {
                        setState(() => _tag = tag);
                        _load();
                      },
                      backgroundColor: Colors.white.withOpacity(0.05),
                      selectedColor: AppColors.primary.withOpacity(0.35),
                      checkmarkColor: AppColors.accent,
                      side: BorderSide(
                        color: active
                            ? AppColors.accent.withOpacity(0.5)
                            : Colors.white.withOpacity(0.12),
                      ),
                      label: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (!isAll) ...[
                            Icon(
                              CircleTags.iconFor(tag!),
                              size: 14,
                              color: active
                                  ? AppColors.accent
                                  : AppColors.textSecondary,
                            ),
                            const SizedBox(width: 5),
                          ],
                          Text(
                            isAll ? 'Todos' : CircleTags.label(tag!),
                            style: TextStyle(
                              color: active
                                  ? AppColors.textPrimary
                                  : AppColors.textSecondary,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 12),

              // ── Lista ────────────────────────────────────────────
              Expanded(
                child: _loading
                    ? ListView(
                        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                        children: const [
                          AppSkeleton(width: double.infinity, height: 120, radius: 20),
                          SizedBox(height: 12),
                          AppSkeleton(width: double.infinity, height: 120, radius: 20),
                          SizedBox(height: 12),
                          AppSkeleton(width: double.infinity, height: 120, radius: 20),
                        ],
                      )
                    : _error != null
                        ? _ErrorPane(message: _error!, onRetry: _load)
                        : _circles.isEmpty
                            ? const _EmptyPane()
                            : RefreshIndicator(
                                color: AppColors.accent,
                                onRefresh: _load,
                                child: ListView.separated(
                                  padding:
                                      const EdgeInsets.fromLTRB(20, 4, 20, 24),
                                  itemCount: _circles.length,
                                  separatorBuilder: (_, __) =>
                                      const SizedBox(height: 12),
                                  itemBuilder: (context, i) {
                                    final c = _circles[i];
                                    return _CircleCard(
                                      circle: c,
                                      onToggleJoin: () => _toggleJoin(c),
                                      onOpen: c.joined
                                          ? () => context.push(
                                              '/circle-chat', extra: c)
                                          : null,
                                    )
                                        .animate(delay: (55 * i).ms)
                                        .fadeIn()
                                        .slideY(
                                            begin: 0.07,
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

class _CircleCard extends StatelessWidget {
  const _CircleCard({
    required this.circle,
    required this.onToggleJoin,
    this.onOpen,
  });

  final SupportCircle circle;
  final VoidCallback onToggleJoin;
  final VoidCallback? onOpen;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.055),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: circle.joined
              ? AppColors.accent.withOpacity(0.35)
              : Colors.white.withOpacity(0.10),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF2E86BF), Color(0xFF124B70)],
                  ),
                ),
                child: Icon(CircleTags.iconFor(circle.conditionTag),
                    color: Colors.white, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      circle.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.25),
                            borderRadius: BorderRadius.circular(7),
                          ),
                          child: Text(
                            CircleTags.label(circle.conditionTag),
                            style: const TextStyle(
                              color: AppColors.accent,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Icon(Icons.person_rounded,
                            size: 12, color: AppColors.textMuted),
                        const SizedBox(width: 3),
                        Text(
                          '${circle.memberCount} membros',
                          style: const TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 11,
                          ),
                        ),
                        if (circle.joined && circle.unread > 0) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.accent.withOpacity(0.18),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 5,
                                  height: 5,
                                  decoration: const BoxDecoration(
                                    color: AppColors.accent,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  circle.unread > 99
                                      ? '99+'
                                      : '${circle.unread} novas',
                                  style: const TextStyle(
                                    color: AppColors.accent,
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ],
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
          if (circle.description != null &&
              circle.description!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              circle.description!,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 12,
                height: 1.4,
              ),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(
                      color: circle.joined
                          ? AppColors.danger.withOpacity(0.5)
                          : AppColors.accent.withOpacity(0.5),
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  onPressed: onToggleJoin,
                  icon: Icon(
                    circle.joined
                        ? Icons.logout_rounded
                        : Icons.login_rounded,
                    size: 16,
                    color: circle.joined ? AppColors.danger : AppColors.accent,
                  ),
                  label: Text(
                    circle.joined ? 'Sair' : 'Entrar',
                    style: TextStyle(
                      color: circle.joined
                          ? AppColors.danger
                          : AppColors.accent,
                      fontWeight: FontWeight.w800,
                      fontSize: 12.5,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: circle.joined
                        ? AppColors.primary
                        : Colors.white.withOpacity(0.08),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  onPressed: onOpen,
                  icon: const Icon(Icons.chat_rounded, size: 16),
                  label: Text(
                    circle.joined && circle.unread > 0
                        ? 'Conversa (${circle.unread > 99 ? '99+' : circle.unread})'
                        : 'Conversa',
                    style: const TextStyle(
                        fontWeight: FontWeight.w800, fontSize: 12.5),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _EmptyPane extends StatelessWidget {
  const _EmptyPane();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.groups_rounded,
                size: 46, color: AppColors.textMuted),
            const SizedBox(height: 14),
            const Text(
              'Sem círculos nesta condição',
              style: TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w800,
                  fontSize: 16),
            ),
            const SizedBox(height: 6),
            const Text(
              'Escolhe outra condição ou verifica mais tarde — a comunidade cresce todos os dias.',
              textAlign: TextAlign.center,
              style:
                  TextStyle(color: AppColors.textSecondary, fontSize: 12.5),
            ),
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
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.wifi_off_rounded,
              size: 42, color: AppColors.textMuted),
          const SizedBox(height: 12),
          Text(message,
              style: const TextStyle(
                  color: AppColors.textSecondary, fontSize: 13)),
          const SizedBox(height: 12),
          TextButton(
            onPressed: onRetry,
            child: const Text('Tentar novamente',
                style: TextStyle(color: AppColors.accent)),
          ),
        ],
      ),
    );
  }
}
