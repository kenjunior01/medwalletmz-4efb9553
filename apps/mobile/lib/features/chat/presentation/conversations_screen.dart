import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../../bookings/domain/booking_models.dart';
import '../../facilities/data/facility_model.dart';
import '../chat_controller.dart';
import '../consultation_chat_controller.dart';
import '../data/chat_models.dart';
import '../data/consultation_chat_models.dart';

/// Hub unificado de conversas — duas secções:
/// 1. Instituições (farmácias, clínicas, veterinárias);
/// 2. Especialistas (chat dentro das consultas, paciente ou médico).
class ConversationsScreen extends ConsumerWidget {
  const ConversationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final conversations = ref.watch(conversationsProvider);
    final threads = ref.watch(consultationThreadsProvider);

    final facilityUnread = conversations.value
            ?.where((c) => c.hasUnread)
            .length ??
        0;
    final consultUnread = threads.value
            ?.where((t) =>
                t.consultation.status == 'scheduled' ||
                t.consultation.status == 'in_progress')
            .length ??
        0;

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        body: AppBackground(
          child: SafeArea(
            bottom: false,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                  child: Row(
                    children: [
                      GestureDetector(
                        onTap: () => context.pop(),
                        child: const Icon(Icons.arrow_back_rounded,
                            color: AppColors.textPrimary),
                      ),
                      const SizedBox(width: 14),
                      const Expanded(
                        child: Text(
                          'Conversas',
                          style: TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 6),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Text(
                    'Tudo o que é conversa na MedWallet num só lugar — em '
                    'tempo real.',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.55),
                      fontSize: 13,
                    ),
                  ),
                ),
                const SizedBox(height: 10),

                // ── Tabs ────────────────────────────────────────────
                TabBar(
                  indicatorColor: AppColors.accent,
                  indicatorSize: TabBarIndicatorSize.tab,
                  labelColor: AppColors.textPrimary,
                  unselectedLabelColor: AppColors.textMuted,
                  labelStyle: const TextStyle(
                      fontWeight: FontWeight.w800, fontSize: 13.5),
                  tabs: [
                    Tab(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text('Instituições'),
                          if (facilityUnread > 0) ...[
                            const SizedBox(width: 6),
                            _MiniBadge(count: facilityUnread),
                          ],
                        ],
                      ),
                    ),
                    Tab(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text('Especialistas'),
                          if (consultUnread > 0) ...[
                            const SizedBox(width: 6),
                            _MiniBadge(count: consultUnread),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: TabBarView(
                    children: [
                      // ── Tab 1: instituições ────────────────────────
                      conversations.when(
                        loading: () => ListView(
                          padding:
                              const EdgeInsets.symmetric(horizontal: 20),
                          children: const [
                            ListSkeleton(count: 4, itemHeight: 84),
                          ],
                        ),
                        error: (e, _) => EmptyState(
                          icon: Icons.wifi_off_rounded,
                          title: 'Não foi possível carregar',
                          message:
                              'Confirma a ligação e que a migração do chat '
                              'foi aplicada ao Supabase.',
                          actionLabel: 'Recarregar',
                          onAction: () =>
                              ref.invalidate(conversationsProvider),
                        ),
                        data: (list) {
                          if (list.isEmpty) {
                            return const EmptyState(
                              icon: Icons.forum_outlined,
                              title: 'Ainda sem conversas',
                              message:
                                  'Abre uma instituição no directório e '
                                  'inicia uma conversa — pergunta o que '
                                  'precisas.',
                            );
                          }
                          return ListView.separated(
                            padding: const EdgeInsets.fromLTRB(
                                20, 4, 20, 120),
                            itemCount: list.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 10),
                            itemBuilder: (context, i) => _ConversationTile(
                              conversation: list[i],
                            ).animate(delay: 45.ms).fadeIn(
                                  duration: 280.ms,
                                ),
                          );
                        },
                      ),

                      // ── Tab 2: especialistas ──────────────────────
                      threads.when(
                        loading: () => ListView(
                          padding:
                              EdgeInsets.symmetric(horizontal: 20),
                          children: [
                            ListSkeleton(count: 3, itemHeight: 84),
                          ],
                        ),
                        error: (e, _) => EmptyState(
                          icon: Icons.wifi_off_rounded,
                          title: 'Não foi possível carregar',
                          message:
                              'As conversas de consulta aparecem aqui '
                              'quando houver ligação.',
                          actionLabel: 'Recarregar',
                          onAction: () =>
                              ref.invalidate(consultationThreadsProvider),
                        ),
                        data: (list) {
                          if (list.isEmpty) {
                            return const EmptyState(
                              icon: Icons.medical_services_outlined,
                              title: 'Sem consultas com chat',
                              message:
                                  'Agenda uma consulta com um especialista '
                                  'e a conversa dela aparece aqui — '
                                  'mensagens, exames e receitas.',
                            );
                          }
                          return ListView.separated(
                            padding: const EdgeInsets.fromLTRB(
                                20, 4, 20, 120),
                            itemCount: list.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 10),
                            itemBuilder: (context, i) => _ThreadTile(
                              thread: list[i],
                            ).animate(delay: 45.ms).fadeIn(
                                  duration: 280.ms,
                                ),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ── Badge pequeno ───────────────────────────────────────────────────────

class _MiniBadge extends StatelessWidget {
  const _MiniBadge({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
      decoration: BoxDecoration(
        color: AppColors.danger,
        borderRadius: BorderRadius.circular(9),
      ),
      child: Text(
        '$count',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

// ── Tile de conversa com instituição ────────────────────────────────────

class _ConversationTile extends StatelessWidget {
  const _ConversationTile({required this.conversation});

  final FacilityConversation conversation;

  IconData get _sourceIcon {
    switch (conversation.source) {
      case FacilitySource.store:
        return Icons.local_pharmacy_rounded;
      case FacilitySource.clinic:
        return Icons.local_hospital_rounded;
      case FacilitySource.veterinary:
        return Icons.pets_rounded;
    }
  }

  Color get _sourceColor {
    switch (conversation.source) {
      case FacilitySource.store:
        return const Color(0xFF34D399);
      case FacilitySource.clinic:
        return const Color(0xFF38BDF8);
      case FacilitySource.veterinary:
        return const Color(0xFFFBBF24);
    }
  }

  @override
  Widget build(BuildContext context) {
    final unread = conversation.hasUnread;
    final preview = conversation.lastMessageText ?? 'Conversa iniciada';

    return GestureDetector(
      onTap: () => context.push('/chat', extra: conversation),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: unread ? const Color(0x1A38BDF8) : AppColors.glassFill,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: unread
                ? const Color(0x5538BDF8)
                : AppColors.glassBorder,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    _sourceColor.withOpacity(0.4),
                    _sourceColor.withOpacity(0.08),
                  ],
                ),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(_sourceIcon, color: _sourceColor, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          conversation.facilityName ?? 'Instituição',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight: unread
                                ? FontWeight.w800
                                : FontWeight.w700,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      if (conversation.lastMessageAt != null)
                        Text(
                          formatRelative(conversation.lastMessageAt!),
                          style: const TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 11,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          preview,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: unread
                                ? AppColors.textSecondary
                                : AppColors.textMuted,
                            fontSize: 12.5,
                            fontWeight: unread
                                ? FontWeight.w600
                                : FontWeight.w400,
                          ),
                        ),
                      ),
                      if (unread)
                        Container(
                          width: 9,
                          height: 9,
                          decoration: const BoxDecoration(
                            color: AppColors.accent,
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Tile de conversa de consulta ────────────────────────────────────────

class _ThreadTile extends StatelessWidget {
  const _ThreadTile({required this.thread});

  final ConsultationThread thread;

  @override
  Widget build(BuildContext context) {
    final consultation = thread.consultation;
    final live = consultation.status == 'scheduled' ||
        consultation.status == 'in_progress';

    return GestureDetector(
      onTap: () => context.push('/consultation-chat', extra: thread),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: live ? const Color(0x1A38BDF8) : AppColors.glassFill,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: live
                ? const Color(0x5538BDF8)
                : AppColors.glassBorder,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    AppColors.accent.withOpacity(0.4),
                    AppColors.accent.withOpacity(0.08),
                  ],
                ),
                shape: BoxShape.circle,
              ),
              child: Text(
                thread.title.characters.first.toUpperCase(),
                style: const TextStyle(
                  color: AppColors.accent,
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                ),
              ),
            ),
            const SizedBox(width: 12),
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
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    '${thread.subtitle} · '
                    '${formatDateShort(consultation.scheduledAt)}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 12.2,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chat_bubble_outline_rounded,
                color: AppColors.textMuted, size: 18),
          ],
        ),
      ),
    );
  }
}
