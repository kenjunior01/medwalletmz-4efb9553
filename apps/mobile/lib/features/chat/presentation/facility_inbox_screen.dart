import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../facilities/data/facility_model.dart';
import '../data/chat_models.dart';
import '../data/chat_repository.dart';
import '../chat_controller.dart';

/// Instituições que o utilizador actual possui (para decidir se a
/// entrada "Inbox das instituições" aparece no perfil).
final myFacilitiesProvider = FutureProvider<List<OwnedFacility>>((ref) async {
  final uid = ref.watch(currentUserIdProvider);
  if (uid == null) return const [];
  try {
    return await ref.watch(chatRepositoryProvider).fetchMyFacilities(uid);
  } catch (_) {
    return const [];
  }
});

/// Inbox do dono da instituição: conversas que os clientes abriram com
/// as instituições que possui (stores/clinics/veterinary via owner_id).
/// As respostas são enviadas como a instituição (sender_role='facility')
/// — a RLS da migração 20260905000000 autoriza via is_facility_owner.
class FacilityInboxScreen extends ConsumerStatefulWidget {
  const FacilityInboxScreen({super.key});

  @override
  ConsumerState<FacilityInboxScreen> createState() =>
      _FacilityInboxScreenState();
}

class _FacilityInboxScreenState extends ConsumerState<FacilityInboxScreen> {
  List<OwnedFacility>? _owned;
  List<FacilityConversation>? _conversations;
  bool _loading = true;
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
      final uid = ref.read(currentUserIdProvider);
      if (uid == null) throw StateError('sem sessão');
      final repo = ref.read(chatRepositoryProvider);
      final owned = await repo.fetchMyFacilities(uid);
      final convos = await repo.watchConversations().first;

      // Só conversas das MINHAS instituições (chave source+entity).
      final mine = owned.map((o) => '${o.source}|${o.entityId}').toSet();
      final filtered = convos
          .where((c) => mine.contains('${c.source.name}|${c.entityId}'))
          .toList();

      if (mounted) {
        setState(() {
          _owned = owned;
          _conversations = filtered;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Não foi possível carregar a inbox.';
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 8, 20, 0),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => context.pop(),
                      icon: const Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    const Expanded(
                      child: Text(
                        'Inbox das instituições',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 19,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: _load,
                      icon: const Icon(Icons.refresh_rounded,
                          color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: _loading
                    ? const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 20),
                        child: ListSkeleton(count: 4, itemHeight: 92),
                      )
                    : _error != null
                        ? EmptyState(
                            icon: Icons.wifi_off_rounded,
                            title: 'Inbox indisponível',
                            message: _error!,
                            actionLabel: 'Recarregar',
                            onAction: _load,
                          )
                        : _buildBody(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBody() {
    final owned = _owned ?? const <OwnedFacility>[];
    if (owned.isEmpty) {
      return const EmptyState(
        icon: Icons.store_rounded,
        title: 'Sem instituições',
        message:
            'Ainda não possuis instituições registadas na plataforma. Regista a tua farmácia/clinica no portal web para responder aos clientes aqui.',
      );
    }
    final convos = _conversations ?? const <FacilityConversation>[];
    final ownerLabel =
        owned.length == 1 ? owned.first.name : 'as tuas instituições';

    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.accent,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
        children: [
          // Chips das instituições que possuo
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final o in owned)
                  Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppColors.accent.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(11),
                      border: Border.all(
                          color: AppColors.accent.withOpacity(0.3)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.store_rounded,
                            color: AppColors.accent, size: 14),
                        const SizedBox(width: 6),
                        Text(
                          o.name,
                          style: const TextStyle(
                            color: AppColors.accent,
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ).animate().fadeIn(duration: 280.ms),
          const SizedBox(height: 14),
          if (convos.isEmpty)
            EmptyState(
              icon: Icons.forum_rounded,
              title: 'Nenhuma conversa ainda',
              message:
                  'Quando um cliente conversar com $ownerLabel, a conversa aparece aqui para responderes como a instituição.',
            )
          else
            for (final c in convos) _ConvTile(conversation: c),
        ],
      ),
    );
  }
}

class _ConvTile extends StatelessWidget {
  const _ConvTile({required this.conversation});

  final FacilityConversation conversation;

  void _open(BuildContext context) {
    final c = conversation;
    final type = switch (c.source) {
      FacilitySource.veterinary => FacilityType.veterinary,
      FacilitySource.store => FacilityType.pharmacy,
      _ => FacilityType.clinic,
    };
    final facility = HealthFacility(
      id: c.entityId,
      source: c.source,
      type: type,
      name: c.facilityName ?? 'Instituição',
    );
    context.push(
      '/chat',
      extra: ChatTarget(
        conversationId: c.id,
        facility: facility,
        staffMode: true,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = conversation;
    final hasNew =
        c.lastSenderRole == 'customer' && c.lastMessageAt != null;

    return GestureDetector(
      onTap: () => _open(context),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.glassFill,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.accent.withOpacity(0.12),
                border:
                    Border.all(color: AppColors.accent.withOpacity(0.35)),
              ),
              child: const Icon(Icons.person_rounded,
                  color: AppColors.accent, size: 22),
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
                          c.facilityName ?? 'Instituição',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      if (c.lastMessageAt != null)
                        Text(
                          formatTimeOnly(c.lastMessageAt!),
                          style: const TextStyle(
                              color: AppColors.textMuted, fontSize: 11),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          c.lastMessageText?.isNotEmpty == true
                              ? (c.lastSenderRole == 'facility'
                                  ? 'Tu: ${c.lastMessageText}'
                                  : c.lastMessageText!)
                              : 'Sem mensagens',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: hasNew
                                ? AppColors.textSecondary
                                : AppColors.textMuted,
                            fontSize: 12.5,
                            fontWeight:
                                hasNew ? FontWeight.w600 : FontWeight.w400,
                          ),
                        ),
                      ),
                      if (hasNew) ...[
                        const SizedBox(width: 8),
                        Container(
                          width: 9,
                          height: 9,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppColors.accent,
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
      ),
    ).animate(interval: 45.ms).fadeIn(duration: 300.ms);
  }
}
