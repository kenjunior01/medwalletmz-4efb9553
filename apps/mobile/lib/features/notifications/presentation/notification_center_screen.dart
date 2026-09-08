import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/notification_models.dart';
import 'notifications_controller.dart';

/// Centro de notificações — tudo o que a plataforma enviou ao
/// utilizador, com filtros por vertical, não-lidas em destaque,
/// comunicados globais e "marcar tudo como lida".
class NotificationCenterScreen extends ConsumerStatefulWidget {
  const NotificationCenterScreen({super.key});

  @override
  ConsumerState<NotificationCenterScreen> createState() =>
      _NotificationCenterScreenState();
}

class _NotificationCenterScreenState
    extends ConsumerState<NotificationCenterScreen> {
  String _filter = 'all';

  @override
  Widget build(BuildContext context) {
    final notifications = ref.watch(myNotificationsProvider);
    final broadcasts = ref.watch(broadcastsProvider);

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Cabeçalho ────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 20, 0),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => context.pop(),
                      icon: const Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    const Expanded(
                      child: Text(
                        'Notificações',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 21,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    notifications.maybeWhen(
                      data: (list) {
                        final unread =
                            list.where((n) => n.isUnread).toList();
                        if (unread.isEmpty) return const SizedBox.shrink();
                        return GestureDetector(
                          onTap: () => ref
                              .read(notificationRepositoryProvider)
                              .markManyDelivered(
                                  unread.map((n) => n.id).toList()),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0x1A38BDF8),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Text(
                              'Marcar lidas',
                              style: TextStyle(
                                color: AppColors.accent,
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        );
                      },
                      orElse: () => const SizedBox.shrink(),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 4),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  'Tudo o que importa em tempo real — consultas, saúde, '
                  'carteira e comunidade.',
                  style: TextStyle(color: AppColors.textMuted, fontSize: 12.5),
                ),
              ),
              const SizedBox(height: 12),

              // ── Filtros por vertical ─────────────────────────────
              SizedBox(
                height: 38,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  children: [
                    _FilterChip(
                      label: 'Tudo',
                      selected: _filter == 'all',
                      onTap: () => setState(() => _filter = 'all'),
                    ),
                    for (final entry in notificationVerticals.entries)
                      _FilterChip(
                        label: entry.value.$1,
                        selected: _filter == entry.key,
                        onTap: () => setState(() => _filter = entry.key),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 10),

              // ── Lista ────────────────────────────────────────────
              Expanded(
                child: notifications.when(
                  loading: () => ListView(
                    padding: EdgeInsets.symmetric(horizontal: 20),
                    children: [ListSkeleton(count: 5, itemHeight: 88)],
                  ),
                  error: (e, _) => EmptyState(
                    icon: Icons.wifi_off_rounded,
                    title: 'Sem ligação às notificações',
                    message: 'Verifica a internet e tenta recarregar.',
                    actionLabel: 'Recarregar',
                    onAction: () => ref.invalidate(myNotificationsProvider),
                  ),
                  data: (list) {
                    final filtered = _filter == 'all'
                        ? list
                        : list.where((n) => n.vertical == _filter).toList();

                    return ListView(
                      padding: const EdgeInsets.fromLTRB(20, 2, 20, 40),
                      children: [
                        // Comunicados globais (dicas da comunidade).
                        broadcasts.maybeWhen(
                          data: (tips) => tips.isEmpty
                              ? const SizedBox.shrink()
                              : _BroadcastStrip(tips: tips),
                          orElse: () => const SizedBox.shrink(),
                        ),
                        if (filtered.isEmpty && list.isEmpty)
                          const Padding(
                            padding: EdgeInsets.only(top: 60),
                            child: EmptyState(
                              icon: Icons.notifications_none_rounded,
                              title: 'Tudo tranquilo',
                              message:
                                  'Ainda não recebeste notificações. Quando '
                                  'houver novidades — consultas, depósitos, '
                                  'dicas de saúde — aparecem aqui e no topo '
                                  'da app em tempo real.',
                            ),
                          )
                        else if (filtered.isEmpty)
                          const Padding(
                            padding: EdgeInsets.only(top: 40),
                            child: EmptyState(
                              icon: Icons.filter_alt_off_rounded,
                              title: 'Nada nesta categoria',
                              message:
                                  'Não há notificações desta vertical. '
                                  'Experimenta outro filtro.',
                            ),
                          )
                        else
                          ...filtered.map(
                            (n) => _NotificationCard(
                              notification: n,
                              onTap: () => _open(n),
                            ),
                          ),
                      ],
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _open(AppNotification n) {
    ref.read(notificationRepositoryProvider).markDelivered(n.id);
    final route = n.route;
    if (route != null && route.startsWith('/')) {
      context.push(route);
    }
  }
}

// ── Cartão de notificação ───────────────────────────────────────────────

class _NotificationCard extends ConsumerWidget {
  const _NotificationCard({required this.notification, required this.onTap});

  final AppNotification notification;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final (_, emoji) = verticalInfo(notification.vertical);
    final unread = notification.isUnread;
    final urgent = notification.priority == 'high' ||
        notification.priority == 'urgent';

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: unread
              ? AppColors.glassFillStrong
              : AppColors.glassFill,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: unread
                ? (urgent
                    ? AppColors.danger.withOpacity(0.5)
                    : AppColors.accent.withOpacity(0.45))
                : AppColors.glassBorder,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: const Color(0x141E6B9C),
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: Text(emoji, style: const TextStyle(fontSize: 18)),
                ),
                if (unread)
                  Positioned(
                    right: 0,
                    top: 0,
                    child: Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: urgent ? AppColors.danger : AppColors.accent,
                        shape: BoxShape.circle,
                        border: Border.all(
                            color: const Color(0xFF0B1D31), width: 2),
                      ),
                    ),
                  ),
              ],
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
                          notification.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight:
                                unread ? FontWeight.w800 : FontWeight.w600,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      Text(
                        formatRelative(notification.createdAt),
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.4),
                          fontSize: 10.5,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    notification.body,
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.66),
                      fontSize: 12.8,
                      height: 1.4,
                    ),
                  ),
                  if (notification.channel == 'sms')
                    const Padding(
                      padding: EdgeInsets.only(top: 6),
                      child: Text(
                        'Também enviada por SMS',
                        style: TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 10.5,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    )
        .animate()
        .fadeIn(duration: 260.ms)
        .slideY(begin: 0.06, curve: Curves.easeOutCubic);
  }
}

// ── Filtro ──────────────────────────────────────────────────────────────

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected
              ? const Color(0x2E38BDF8)
              : Colors.white.withOpacity(0.04),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected
                ? const Color(0x5538BDF8)
                : Colors.white.withOpacity(0.08),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? AppColors.accent : AppColors.textMuted,
            fontSize: 12.5,
            fontWeight: selected ? FontWeight.w800 : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

// ── Faixa de comunicados globais ────────────────────────────────────────

class _BroadcastStrip extends StatelessWidget {
  const _BroadcastStrip({required this.tips});

  final List<AppNotification> tips;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0x221E6B9C),
            const Color(0x111E6B9C).withOpacity(0.4),
          ],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0x3338BDF8)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.campaign_rounded,
                  color: AppColors.accent, size: 17),
              SizedBox(width: 7),
              Text(
                'COMUNICADOS MEDWALLET',
                style: TextStyle(
                  color: AppColors.accent,
                  fontSize: 10.5,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.1,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...tips.take(2).map(
                (t) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('• ',
                          style: TextStyle(color: AppColors.accent)),
                      Expanded(
                        child: Text(
                          '${t.title} — ${t.body}',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.72),
                            fontSize: 12.3,
                            height: 1.35,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 300.ms)
        .slideY(begin: 0.08, curve: Curves.easeOutCubic);
  }
}
