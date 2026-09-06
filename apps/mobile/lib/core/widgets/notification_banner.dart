import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../features/notifications/data/notification_models.dart';
import '../theme/app_colors.dart';

/// Banner in-app de notificação — aparece por cima de tudo (overlay
/// raiz) quando chega uma nova notificação em tempo real, tal como o
/// pipeline do web. Auto-dismiss aos 4,5 s ou ao tocar.
class NotificationBanner {
  NotificationBanner._();

  static void show(
    BuildContext context,
    AppNotification notification, {
    VoidCallback? onTap,
  }) {
    final overlay = Overlay.of(context, rootOverlay: true);
    late final OverlayEntry entry;
    var removed = false;
    void remove() {
      if (removed) return;
      removed = true;
      entry.remove();
    }

    entry = OverlayEntry(
      builder: (_) => _BannerView(
        notification: notification,
        onDismiss: remove,
        onTap: () {
          remove();
          onTap?.call();
        },
      ),
    );
    overlay.insert(entry);
    Timer(const Duration(milliseconds: 4500), remove);
  }
}

class _BannerView extends StatelessWidget {
  const _BannerView({
    required this.notification,
    required this.onDismiss,
    required this.onTap,
  });

  final AppNotification notification;
  final VoidCallback onDismiss;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final (label, emoji) = verticalInfo(notification.vertical);
    final urgent = notification.priority == 'high' ||
        notification.priority == 'urgent';

    return Positioned(
      top: MediaQuery.paddingOf(context).top + 10,
      left: 16,
      right: 16,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
          decoration: BoxDecoration(
            color: const Color(0xE60B1D31),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: urgent
                  ? AppColors.danger.withOpacity(0.55)
                  : const Color(0x2E38BDF8),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.5),
                blurRadius: 26,
                offset: const Offset(0, 12),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: const Color(0x1A38BDF8),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(emoji, style: const TextStyle(fontSize: 18)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            notification.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.w800,
                              fontSize: 13.5,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          label,
                          style: TextStyle(
                            color: AppColors.accent.withOpacity(0.9),
                            fontSize: 10.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      notification.body,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.72),
                        fontSize: 12.5,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: onDismiss,
                icon: Icon(Icons.close_rounded,
                    size: 18, color: Colors.white.withOpacity(0.5)),
              ),
            ],
          ),
        ),
      )
          .animate()
          .slideY(begin: -1.2, duration: 380.ms, curve: Curves.easeOutCubic)
          .fadeIn(duration: 240.ms),
    );
  }
}
