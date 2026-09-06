import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/theme/app_colors.dart';
import '../../auth/presentation/auth_controller.dart';

/// ── Modelo ───────────────────────────────────────────────────────────

/// Conteúdo regional publicado pela gestão (tabela `regional_content`):
/// campanhas de saúde, avisos de emergência, dicas locais, etc.
class HomeRegionalContent {
  const HomeRegionalContent({
    required this.id,
    required this.title,
    required this.contentType,
    this.description,
    this.accentColor,
    this.imageUrl,
    this.isPinned = false,
  });

  final String id;
  final String title;
  final String contentType;
  final String? description;
  final String? accentColor;
  final String? imageUrl;
  final bool isPinned;

  IconData get icon => switch (contentType) {
        'health_campaign' => Icons.campaign_rounded,
        'emergency_notice' => Icons.warning_amber_rounded,
        'partner_highlight' => Icons.handshake_rounded,
        'holiday_schedule' => Icons.event_rounded,
        'local_tip' => Icons.lightbulb_rounded,
        _ => Icons.info_rounded,
      };

  Color get color {
    final parsed = accentColor;
    if (parsed != null && parsed.length >= 7 && parsed.startsWith('#')) {
      final hex = parsed.substring(1);
      final v = int.tryParse(hex, radix: 16);
      if (v != null) {
        return Color(0xFF000000 | v);
      }
    }
    return switch (contentType) {
      'emergency_notice' => AppColors.danger,
      'health_campaign' => AppColors.accent,
      'local_tip' => AppColors.success,
      _ => AppColors.warning,
    };
  }

  factory HomeRegionalContent.fromJson(Map<String, dynamic> j) =>
      HomeRegionalContent(
        id: j['id'] as String,
        title: (j['title'] ?? '') as String,
        contentType: (j['content_type'] ?? '') as String,
        description: j['description'] as String?,
        accentColor: j['accent_color'] as String?,
        imageUrl: j['image_url'] as String?,
        isPinned: (j['is_pinned'] as bool?) ?? false,
      );
}

/// ── Provider ─────────────────────────────────────────────────────────

/// Conteúdo activo para o país do utilizador (via wallets.country_id →
/// countries.country_code). Se não houver país, usa MZ como fallback.
final regionalContentProvider =
    FutureProvider<List<HomeRegionalContent>>((ref) async {
  final uid = ref.watch(currentUserIdProvider);
  if (uid == null) return const [];

  String countryCode = 'MZ';
  try {
    final rows = await Supabase.instance.client
        .from('wallets')
        .select('country_id, countries(country_code)')
        .eq('user_id', uid)
        .limit(1);
    if (rows.isNotEmpty) {
      final c = rows.first['countries'];
      if (c is Map && c['country_code'] != null) {
        countryCode = c['country_code'].toString();
      }
    }
  } catch (_) {}

  final now = DateTime.now().toUtc().toIso8601String();
  try {
    final rows = await Supabase.instance.client
        .from('regional_content')
        .select()
        .eq('is_active', true)
        .eq('country_code', countryCode)
        .or('starts_at.is.null,starts_at.lte.$now')
        .or('ends_at.is.null,ends_at.gte.$now')
        .order('is_pinned', ascending: false)
        .order('created_at', ascending: false)
        .limit(3);
    return rows.map(HomeRegionalContent.fromJson).toList();
  } catch (_) {
    return const [];
  }
});

/// ── Widget ───────────────────────────────────────────────────────────

/// Banner dinâmico do Home: campanhas e avisos da gestão regional do
/// país do utilizador (paridade+ com o CEO dashboard da web).
class RegionalBanner extends ConsumerWidget {
  const RegionalBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(regionalContentProvider);

    return items.maybeWhen(
      data: (list) {
        if (list.isEmpty) return const SizedBox.shrink();
        final first = list.first;
        final color = first.color;
        return GestureDetector(
          onTap: list.length > 1 ? () => _showAll(context, list) : null,
          child: Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(22),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  color.withOpacity(0.22),
                  const Color(0x1414B8A6),
                ],
              ),
              border: Border.all(color: color.withOpacity(0.35)),
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: color.withOpacity(0.18),
                    border: Border.all(color: color.withOpacity(0.4)),
                  ),
                  child: Icon(first.icon, color: color, size: 22),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              first.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: AppColors.textPrimary,
                                fontSize: 14.5,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          if (list.length > 1) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(
                                color: color.withOpacity(0.16),
                                borderRadius: BorderRadius.circular(7),
                              ),
                              child: Text(
                                '+${list.length - 1}',
                                style: TextStyle(
                                  color: color,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      if (first.description != null) ...[
                        const SizedBox(height: 3),
                        Text(
                          first.description!,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.6),
                            fontSize: 12,
                            height: 1.4,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (list.length > 1)
                  const Icon(Icons.expand_more_rounded,
                      color: AppColors.textMuted),
              ],
            ),
          ),
        ).animate(delay: 120.ms).fadeIn(duration: 350.ms);
      },
      orElse: () => const SizedBox.shrink(),
    );
  }

  void _showAll(BuildContext context, List<HomeRegionalContent> list) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [AppColors.bgHigh, AppColors.bgDeep],
          ),
          borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
          border: Border(top: BorderSide(color: AppColors.glassBorder)),
        ),
        child: SafeArea(
          top: false,
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.fromLTRB(24, 14, 24, 26),
            children: [
              Center(
                child: Container(
                  width: 44,
                  height: 5,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.18),
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Novidades da tua região',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 14),
              for (final item in list)
                Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(15),
                  decoration: BoxDecoration(
                    color: AppColors.glassFill,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.glassBorder),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(item.icon, color: item.color, size: 22),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.title,
                              style: const TextStyle(
                                color: AppColors.textPrimary,
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            if (item.description != null) ...[
                              const SizedBox(height: 4),
                              Text(
                                item.description!,
                                style: TextStyle(
                                  color: Colors.white.withOpacity(0.62),
                                  fontSize: 12.5,
                                  height: 1.5,
                                ),
                              ),
                            ],
                          ],
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
