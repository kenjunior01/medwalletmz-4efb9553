import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/otp_screen.dart';
import '../../features/auth/presentation/register_screen.dart';
import '../../features/auth/presentation/splash_screen.dart';
import '../../features/blood/presentation/blood_hub_screen.dart';
import '../../features/bookings/presentation/bookings_screen.dart';
import '../../features/bookings/presentation/prescriptions_screen.dart';
import '../../features/bookings/presentation/verify_prescription_screen.dart';
import '../../features/circles/data/circles_repository.dart';
import '../../features/circles/presentation/circle_chat_screen.dart';
import '../../features/circles/presentation/circles_screen.dart';
import '../../features/chat/data/consultation_chat_models.dart';
import '../../features/chat/presentation/chat_screen.dart';
import '../../features/chat/presentation/consultation_chat_screen.dart';
import '../../features/chat/presentation/conversations_screen.dart';
import '../../features/facilities/data/facility_model.dart';
import '../../features/earn/presentation/earn_home_screen.dart';
import '../../features/earn/presentation/map_picker_screen.dart';
import '../../features/earn/presentation/submit_proposal_screen.dart';
import '../../features/doctor/presentation/doctor_dashboard_screen.dart';
import '../../features/facilities/presentation/facilities_screen.dart';
import '../../features/facilities/presentation/facility_detail_screen.dart';
import '../../features/health_hub/presentation/health_hub_screen.dart';
import '../../features/health_workers/presentation/health_workers_screen.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/chat/presentation/facility_inbox_screen.dart';
import '../../features/family/presentation/family_hub_screen.dart';
import '../../features/insurance/presentation/insurance_screen.dart';
import '../../features/journal/presentation/journal_screen.dart';
import '../../features/labs/data/labs_repository.dart';
import '../../features/labs/presentation/lab_detail_screen.dart';
import '../../features/labs/presentation/lab_orders_screen.dart';
import '../../features/labs/presentation/labs_screen.dart';
import '../../features/manager/presentation/global_dashboard_screen.dart';
import '../../features/manager/presentation/manager_console_screen.dart';
import '../../features/manager/presentation/manager_hub_screen.dart';
import '../../features/maternal/presentation/maternal_screen.dart';
import '../../features/meddy/presentation/meddy_chat_screen.dart';
import '../../features/meds/presentation/meds_screen.dart';
import '../../features/notifications/data/notification_models.dart';
import '../../features/notifications/presentation/notification_center_screen.dart';
import '../../features/notifications/presentation/notification_prefs_screen.dart';
import '../../features/notifications/presentation/notifications_controller.dart';
import '../../features/videocall/presentation/video_call_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../features/profile/presentation/profile_edit_screen.dart';
import '../../features/profile/presentation/change_password_screen.dart';
import '../../features/profile/presentation/health_profile_screen.dart';
import '../../features/profile/presentation/help_legal_screen.dart';
import '../../features/ranking/presentation/ranking_screen.dart';
import '../../features/referrals/presentation/referrals_screen.dart';
import '../../features/records/presentation/records_screen.dart';
import '../../features/services/presentation/services_screen.dart';
import '../../features/services/presentation/specialists_screen.dart';
import '../../features/solidarity/presentation/solidarity_screen.dart';
import '../../features/sos/presentation/sos_screen.dart';
import '../../features/subscriptions/presentation/plans_screen.dart';
import '../../features/triage/presentation/triage_result_screen.dart';
import '../../features/triage/presentation/triage_wizard_screen.dart';
import '../../features/vision/presentation/vision_scanner_screen.dart';
import '../../features/voice_journal/presentation/voice_journal_screen.dart';
import '../../features/wallet/presentation/wallet_screen.dart';
import '../config.dart';
import '../l10n/app_strings.dart';
import '../l10n/locale_provider.dart';
import '../widgets/notification_banner.dart';

/// Índices das abas do shell.
abstract final class Tabs {
  static const home = 0,
      wallet = 1,
      services = 2,
      facilities = 3,
      profile = 4;
}

/// Notifica o router sempre que o estado de autenticação muda.
class AuthRefresh extends ChangeNotifier {
  AuthRefresh() {
    if (!AppConfig.isConfigured) return;
    Supabase.instance.client.auth.onAuthStateChange.listen((_) {
      notifyListeners();
    });
  }

  Session? get session =>
      AppConfig.isConfigured ? Supabase.instance.client.auth.currentSession : null;
}

final authRefresh = AuthRefresh();

final router = GoRouter(
  initialLocation: '/splash',
  refreshListenable: authRefresh,
  redirect: (context, state) {
    final session = authRefresh.session;
    final loc = state.matchedLocation;
    final isPublic = loc == '/login' || loc == '/register' || loc == '/otp';
    final onSplash = loc == '/splash';

    if (session == null && !isPublic && !onSplash) return '/login';
    if (session != null && (loc == '/login' || loc == '/register')) {
      return '/home';
    }
    return null;
  },
  routes: [
    GoRoute(
      path: '/splash',
      builder: (context, state) => const SplashScreen(),
    ),
    GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
    GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
    GoRoute(path: '/otp', builder: (_, __) => const OtpScreen()),

    // Shell com navegação inferior (5 abas em IndexedStack — estado vivo).
    StatefulShellRoute.indexedStack(
      builder: (context, state, shell) => AppShell(shell: shell),
      branches: [
        StatefulShellBranch(routes: [
          GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
        ]),
        StatefulShellBranch(routes: [
          GoRoute(path: '/wallet', builder: (_, __) => const WalletScreen()),
        ]),
        StatefulShellBranch(routes: [
          GoRoute(path: '/services', builder: (_, __) => const ServicesScreen()),
        ]),
        StatefulShellBranch(routes: [
          GoRoute(
              path: '/facilities',
              builder: (_, __) => const FacilitiesScreen()),
        ]),
        StatefulShellBranch(routes: [
          GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
        ]),
      ],
    ),

    // Ecrãs full-screen por cima do shell.
    GoRoute(path: '/bookings', builder: (_, __) => const BookingsScreen()),
    // Triagem (wizard 5 passos) + resultado com especialidade.
    GoRoute(path: '/triage', builder: (_, __) => const TriageScreen()),
    GoRoute(
        path: '/triage-result',
        builder: (_, __) => const TriageResultScreen()),
    GoRoute(path: '/chats', builder: (_, __) => const ConversationsScreen()),

    // Chat de consulta (especialista↔paciente) + receitas.
    GoRoute(
        path: '/consultation-chat',
        builder: (_, __) => const ConsultationChatScreen()),
    GoRoute(
        path: '/prescriptions',
        builder: (_, __) => const PrescriptionsScreen()),

    // Ganhe — crowdsourcing de instituições com recompensa.
    GoRoute(path: '/earn', builder: (_, __) => const EarnHomeScreen()),
    GoRoute(
        path: '/earn-submit',
        builder: (_, __) => const SubmitProposalScreen()),
    GoRoute(
        path: '/map-picker',
        builder: (_, __) => const MapPickerScreen()),

    // Gestão regional (legado) — o painel original foi consolidado
    // na suite de gestão F5+/F12; qualquer link antigo cai no hub.
    GoRoute(
      path: '/regional',
      redirect: (_, __) => '/manager-hub',
    ),

    // Suite de gestão F5 — hub, consola por país e painel global.
    GoRoute(
        path: '/manager-hub',
        builder: (_, __) => const ManagerHubScreen()),
    GoRoute(
      path: '/manager-console',
      builder: (_, state) =>
          ManagerConsoleScreen(countryId: state.extra as String?),
    ),
    GoRoute(
        path: '/global-dashboard',
        builder: (_, __) => const GlobalDashboardScreen()),

    // Especialistas de uma especialidade (pós-triagem ou catálogo).
    GoRoute(
        path: '/specialists',
        builder: (_, __) => const SpecialistsScreen()),

    // Notificações — centro + preferências.
    GoRoute(
        path: '/notifications',
        builder: (_, __) => const NotificationCenterScreen()),
    GoRoute(
        path: '/notification-prefs',
        builder: (_, __) => const NotificationPrefsScreen()),

    // F5 — SOS emergência, medicação e seguros.
    GoRoute(path: '/sos', builder: (_, __) => const SosScreen()),
    GoRoute(path: '/meds', builder: (_, __) => const MedsScreen()),
    GoRoute(
        path: '/insurance',
        builder: (_, __) => const InsuranceScreen()),

    // F6 — Laboratórios (catálogo, pedido, histórico).
    GoRoute(path: '/labs', builder: (_, __) => const LabsScreen()),
    GoRoute(
      path: '/lab-detail',
      builder: (_, state) {
        final lab = state.extra;
        if (lab is LabFacility) return LabDetailScreen(lab: lab);
        return const LabsScreen();
      },
    ),
    GoRoute(path: '/lab-orders', builder: (_, __) => const LabOrdersScreen()),

    // F7 — Círculos de apoio (comunidade) + chat de grupo.
    GoRoute(path: '/circles', builder: (_, __) => const CirclesScreen()),
    GoRoute(
      path: '/circle-chat',
      builder: (_, state) {
        final circle = state.extra;
        if (circle is SupportCircle) {
          return CircleChatScreen(circle: circle);
        }
        return const CirclesScreen();
      },
    ),

    // F7 — Registos médicos (bucket medical-records + partilhas).
    GoRoute(path: '/records', builder: (_, __) => const RecordsScreen()),

    // F7 — Convites e recompensas (dinheiro real, sem coins).
    GoRoute(
        path: '/referrals', builder: (_, __) => const ReferralsScreen()),

    // F6 — Videochamada da consulta (extra: ConsultationThread).
    GoRoute(
      path: '/video-call',
      builder: (_, state) {
        final extra = state.extra;
        if (extra is ConsultationThread) {
          return VideoCallScreen(thread: extra);
        }
        // Sem thread no extra → volta ao hub de conversas.
        return const ConversationsScreen();
      },
    ),

    // Detalhe da instituição (extra: HealthFacility).
    GoRoute(
      path: '/facility-detail',
      builder: (_, state) {
        final facility = state.extra;
        if (facility is HealthFacility) {
          return FacilityDetailScreen(facility: facility);
        }
        return const FacilitiesScreen();
      },
    ),

    // Conversa com a instituição (extra: ChatTarget ou FacilityConversation).
    GoRoute(path: '/chat', builder: (_, __) => const ChatScreen()),

    // F9 — Painel do médico (agenda, horários, pacientes, perfil).
    GoRoute(
        path: '/doctor-hub', builder: (_, __) => const DoctorDashboardScreen()),

    // F9 — Inbox das instituições do dono (responder como instituição).
    GoRoute(
        path: '/facility-inbox',
        builder: (_, __) => const FacilityInboxScreen()),

    // F9 — Perfil: edição, segurança, ficha de saúde, ajuda.
    GoRoute(
        path: '/profile-edit', builder: (_, __) => const ProfileEditScreen()),
    GoRoute(
        path: '/change-password',
        builder: (_, __) => const ChangePasswordScreen()),
    GoRoute(
        path: '/health-profile',
        builder: (_, __) => const HealthProfileScreen()),
    GoRoute(path: '/help', builder: (_, __) => const HelpLegalScreen()),

    // F9 — Verificação pública de receitas (RPC verify_prescription).
    GoRoute(
        path: '/verify-prescription',
        builder: (_, __) => const VerifyPrescriptionScreen()),

    // F9 — Educação em saúde (health_articles).
    GoRoute(
        path: '/health-hub', builder: (_, __) => const HealthHubScreen()),

    // F10 — Comunidade e bem-estar (paridade total com a web).
    GoRoute(path: '/blood', builder: (_, __) => const BloodHubScreen()),
    GoRoute(
        path: '/solidarity', builder: (_, __) => const SolidarityScreen()),
    GoRoute(path: '/journal', builder: (_, __) => const JournalScreen()),
    GoRoute(
        path: '/family', builder: (_, __) => const FamilyHubScreen()),
    GoRoute(path: '/plans', builder: (_, __) => const PlansScreen()),
    GoRoute(path: '/ranking', builder: (_, __) => const RankingScreen()),

    // F11 — IA & Programas (paridade final: Meddy, visão, voz,
    // maternal e agentes de saúde).
    GoRoute(path: '/meddy', builder: (_, __) => const MeddyChatScreen()),
    GoRoute(
        path: '/vision-scan',
        builder: (_, __) => const VisionScannerScreen()),
    GoRoute(
        path: '/voice-journal',
        builder: (_, __) => const VoiceJournalScreen()),
    GoRoute(path: '/maternal', builder: (_, __) => const MaternalScreen()),
    GoRoute(
        path: '/health-workers',
        builder: (_, __) => const HealthWorkersScreen()),
  ],
);

/// Shell de navegação: fundo mesh + conteúdo + barra inferior de vidro.
/// Ouve o stream de notificações e mostra o banner in-app em tempo real.
class AppShell extends ConsumerStatefulWidget {
  const AppShell({super.key, required this.shell});

  final StatefulNavigationShell shell;

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> {
  String? _lastBannerId;

  @override
  Widget build(BuildContext context) {
    // Banner in-app quando chega uma nova notificação não lida.
    ref.listen<AsyncValue<List<AppNotification>>>(
      myNotificationsProvider,
      (previous, next) {
        final list = next.value;
        if (list == null || list.isEmpty) return;
        final newest = list.firstWhere(
          (n) => n.isUnread,
          orElse: () => list.first,
        );
        if (!newest.isUnread || newest.id == _lastBannerId) return;
        _lastBannerId = newest.id;
        NotificationBanner.show(context, newest);
      },
    );

    return Scaffold(
      extendBody: true,
      backgroundColor: Colors.transparent,
      body: widget.shell,
      bottomNavigationBar: _GlassNavBar(
        currentIndex: widget.shell.currentIndex,
        onTap: (i) => widget.shell.goBranch(
          i,
          initialLocation: i == widget.shell.currentIndex,
        ),
      ),
    );
  }
}

/// Barra de navegação flutuante em vidro, indicador animado por baixo
/// do ícone ativo (cápsula deslizante com glow). Rótulos localizados
/// com o idioma escolhido (14 línguas).
class _GlassNavBar extends ConsumerWidget {
  const _GlassNavBar({required this.currentIndex, required this.onTap});

  final int currentIndex;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final destinations = [
      (icon: Icons.home_rounded, label: tr(S.home, locale)),
      (
        icon: Icons.account_balance_wallet_rounded,
        label: tr(S.wallet, locale),
      ),
      (icon: Icons.medical_services_rounded, label: tr(S.health, locale)),
      (
        icon: Icons.location_on_rounded,
        label: tr(S.institutions, locale),
      ),
      (icon: Icons.person_rounded, label: tr(S.profile, locale)),
    ];

    return SafeArea(
      top: false,
      child: Container(
        margin: const EdgeInsets.fromLTRB(20, 0, 20, 14),
        height: 68,
        decoration: BoxDecoration(
          color: const Color(0xCC0B1D31),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0x1FFFFFFF)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.45),
              blurRadius: 30,
              offset: const Offset(0, 14),
            ),
          ],
        ),
        child: Row(
          children: List.generate(destinations.length, (i) {
            final d = destinations[i];
            final active = i == currentIndex;
            return Expanded(
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => onTap(i),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 260),
                      curve: Curves.easeOutCubic,
                      height: 34,
                      width: 44,
                      decoration: BoxDecoration(
                        color: active
                            ? const Color(0x2E1E6B9C)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(
                        d.icon,
                        size: 24,
                        color: active
                            ? const Color(0xFF38BDF8)
                            : const Color(0xFF5D7285),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      d.label,
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight:
                            active ? FontWeight.w700 : FontWeight.w500,
                        color: active
                            ? const Color(0xFFF2F7FB)
                            : const Color(0xFF5D7285),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}
