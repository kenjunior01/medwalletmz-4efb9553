import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/config.dart';
import '../../../core/l10n/app_strings.dart';
import '../../../core/l10n/locale_provider.dart';
import '../../../core/push/push_service.dart';
import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../chat/presentation/facility_inbox_screen.dart';
import '../../doctor/presentation/doctor_dashboard_screen.dart';
import '../../bookings/presentation/bookings_controller.dart';
import '../../regional/data/regional_models.dart';
import '../../wallet/presentation/wallet_controller.dart';
import '../data/profile_controller.dart';

/// Tipo de perfil actual (profiles.user_type — persona principal).
final userTypeProvider = FutureProvider<String>((ref) async {
  final client = Supabase.instance.client;
  final uid = client.auth.currentUser?.id;
  if (uid == null) return 'patient';
  try {
    final row = await client
        .from('profiles')
        .select('user_type')
        .eq('user_id', uid)
        .single();
    return (row['user_type'] ?? 'patient') as String;
  } catch (_) {
    return 'patient';
  }
});

const _userTypeCatalog = <(String, String, String, IconData)>[
  ('patient', 'Doente', 'Consultas, exames, medicação e círculos.',
      Icons.person_rounded),
  ('rider', 'Rider', 'Entregas de medicamentos e transporte.',
      Icons.pedal_bike_rounded),
  ('worker', 'Profissional',
      'Atende como médico, enfermeiro ou agente de saúde.',
      Icons.medical_services_rounded),
  ('caregiver', 'Cuidador',
      'Cuida da saúde de familiares e dependentes.',
      Icons.volunteer_activism_rounded),
  ('promoter', 'Promotor',
      'Indica parceiros e instituições e ganha comissões.',
      Icons.campaign_rounded),
];

Future<void> _showUserTypePicker(
    BuildContext context, WidgetRef ref) async {
  final client = Supabase.instance.client;
  final uid = client.auth.currentUser?.id;
  if (uid == null) return;

  var current = 'patient';
  try {
    final row = await client
        .from('profiles')
        .select('user_type')
        .eq('user_id', uid)
        .single();
    current = (row['user_type'] ?? 'patient') as String;
  } catch (_) {}

  var saving = false;
  await showModalBottomSheet<void>(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setSheet) => Container(
        padding: const EdgeInsets.fromLTRB(22, 18, 22, 24),
        decoration: const BoxDecoration(
          gradient: LinearGradient(
              colors: [AppColors.bgHigh, AppColors.bgDeep]),
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Tipo de perfil',
              style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 17,
                  fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 4),
            Text(
              'Como a plataforma te apresenta e personaliza. Podes '
              'mudar quando quiseres.',
              style: TextStyle(
                  color: Colors.white.withOpacity(0.5), fontSize: 12),
            ),
            const SizedBox(height: 12),
            for (final (key, label, desc, icon) in _userTypeCatalog)
              Padding(
                padding: const EdgeInsets.only(bottom: 7),
                child: InkWell(
                  borderRadius: BorderRadius.circular(14),
                  onTap: saving || key == current
                      ? null
                      : () async {
                          setSheet(() => saving = true);
                          try {
                            await client.rpc('set_user_primary_type',
                                params: {
                                  'p_user_id': uid,
                                  'p_type': key,
                                });
                            ref.invalidate(userTypeProvider);
                            ref.invalidate(profileProvider);
                            if (ctx.mounted) Navigator.of(ctx).pop();
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  backgroundColor: AppColors.success,
                                  content: Text(
                                      'Tipo de perfil alterado para '
                                      '"$label".'),
                                ),
                              );
                            }
                          } catch (_) {
                            setSheet(() => saving = false);
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  backgroundColor: AppColors.danger,
                                  content: Text(
                                      'Não foi possível actualizar o tipo.'),
                                ),
                              );
                            }
                          }
                        },
                  child: Container(
                    padding: const EdgeInsets.all(11),
                    decoration: BoxDecoration(
                      color: key == current
                          ? const Color(0x2638BDF8)
                          : AppColors.glassFill,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: key == current
                            ? const Color(0xFF38BDF8)
                            : AppColors.glassBorder,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(icon,
                            size: 19,
                            color: key == current
                                ? const Color(0xFF7DD3FC)
                                : Colors.white.withOpacity(0.5)),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment:
                                CrossAxisAlignment.start,
                            children: [
                              Text(
                                label,
                                style: const TextStyle(
                                    color: AppColors.textPrimary,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700),
                              ),
                              Text(desc,
                                  style: TextStyle(
                                      color: Colors.white
                                          .withOpacity(0.45),
                                      fontSize: 10.5)),
                            ],
                          ),
                        ),
                        if (saving && key == current)
                          const SizedBox(
                            width: 15,
                            height: 15,
                            child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AppColors.accent),
                          )
                        else if (key == current)
                          const Icon(Icons.check_circle_rounded,
                              color: Color(0xFF38BDF8), size: 18),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    ),
  );
}

/// Perfil: identidade, atalhos e saída de sessão.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(profileProvider);

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
            children: [
              const Text(
                'Perfil',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 18),

              // ── Cartão de identidade ────────────────────────────────
              profile.when(
                loading: () => const Padding(
                  padding: EdgeInsets.symmetric(vertical: 40),
                  child: Center(
                    child: CircularProgressIndicator(color: AppColors.accent),
                  ),
                ),
                error: (_, __) => const EmptyProfile(
                  icon: Icons.error_outline_rounded,
                  message: 'Não foi possível carregar o perfil.',
                ),
                data: (p) => Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(24),
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: AppColors.heroCardGradient,
                    ),
                    border: Border.all(color: Colors.white.withOpacity(0.18)),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withOpacity(0.4),
                        blurRadius: 30,
                        offset: const Offset(0, 14),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Container(
                        width: 76,
                        height: 76,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white.withOpacity(0.14),
                          border: Border.all(
                              color: Colors.white.withOpacity(0.3), width: 2),
                        ),
                        child: Text(
                          initials(p?.fullName),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 26,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),
                      Text(
                        p?.fullName ?? 'Utilizador MedWallet',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        p?.phone != null
                            ? maskMzPhone(p!.phone!)
                            : 'Sem telefone associado',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.7),
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 5),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.location_on_rounded,
                                size: 13, color: Colors.white70),
                            const SizedBox(width: 5),
                            Text(
                              p?.defaultCity ?? 'Maputo',
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.85),
                                fontSize: 11.5,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                )
                    .animate()
                    .fadeIn(duration: 350.ms)
                    .slideY(begin: 0.1, curve: Curves.easeOutCubic),
              ),

              const SizedBox(height: 14),

              // ── Papéis (roles) ──────────────────────────────────────
              _RolesStrip(),

              const SizedBox(height: 18),

              // ── Menu ────────────────────────────────────────────────
              _MenuGroup(
                items: [
                  _MenuItem(
                    icon: Icons.edit_rounded,
                    label: 'Editar perfil e foto',
                    onTap: () => context.push('/profile-edit'),
                  ),
                  _MenuItem(
                    icon: Icons.health_and_safety_rounded,
                    label: 'Perfil de saúde (ficha médica)',
                    onTap: () => context.push('/health-profile'),
                  ),
                  _MenuItem(
                    icon: Icons.event_note_rounded,
                    label: 'As minhas consultas',
                    onTap: () => context.push('/bookings'),
                  ),
                  _MenuItem(
                    icon: Icons.account_balance_wallet_rounded,
                    label: 'Carteira e transações',
                    onTap: () => context.go('/wallet'),
                  ),
                  _MenuItem(
                    icon: Icons.location_on_outlined,
                    label: 'Instituições de saúde',
                    onTap: () => context.go('/facilities'),
                  ),
                  _MenuItem(
                    icon: Icons.forum_outlined,
                    label: 'Conversas e mensagens',
                    onTap: () => context.push('/chats'),
                  ),
                  _MenuItem(
                    icon: Icons.notifications_rounded,
                    label: 'Centro de notificações',
                    onTap: () => context.push('/notifications'),
                  ),
                  _MenuItem(
                    icon: Icons.tune_rounded,
                    label: 'Preferências de notificação',
                    onTap: () => context.push('/notification-prefs'),
                  ),
                  _MenuItem(
                    icon: Icons.description_outlined,
                    label: 'As minhas receitas',
                    onTap: () => context.push('/prescriptions'),
                  ),
                  _MenuItem(
                    icon: Icons.verified_user_outlined,
                    label: 'Verificar receita (farmácias)',
                    onTap: () => context.push('/verify-prescription'),
                  ),
                  _MenuItem(
                    icon: Icons.menu_book_rounded,
                    label: 'Educação em saúde',
                    onTap: () => context.push('/health-hub'),
                  ),
                  _MenuItem(
                    icon: Icons.medication_rounded,
                    label: 'Medicação',
                    onTap: () => context.push('/meds'),
                  ),
                  _MenuItem(
                    icon: Icons.folder_shared_rounded,
                    label: 'Registos médicos',
                    onTap: () => context.push('/records'),
                  ),
                  _MenuItem(
                    icon: Icons.shield_outlined,
                    label: 'Seguros de saúde',
                    onTap: () => context.push('/insurance'),
                  ),
                  _MenuItem(
                    icon: Icons.emergency_rounded,
                    label: 'SOS Emergência',
                    onTap: () => context.push('/sos'),
                  ),
                  _MenuItem(
                    icon: Icons.groups_rounded,
                    label: 'Círculos de apoio',
                    onTap: () => context.push('/circles'),
                  ),
                  _MenuItem(
                    icon: Icons.bloodtype_rounded,
                    label: 'Banco de Sangue',
                    onTap: () => context.push('/blood'),
                  ),
                  _MenuItem(
                    icon: Icons.volunteer_activism_rounded,
                    label: 'Solidariedade',
                    onTap: () => context.push('/solidarity'),
                  ),
                  _MenuItem(
                    icon: Icons.auto_stories_rounded,
                    label: 'Diário de Saúde',
                    onTap: () => context.push('/journal'),
                  ),
                  _MenuItem(
                    icon: Icons.family_restroom_rounded,
                    label: 'Família',
                    onTap: () => context.push('/family'),
                  ),
                  _MenuItem(
                    icon: Icons.workspace_premium_rounded,
                    label: 'Planos MedWallet',
                    onTap: () => context.push('/plans'),
                  ),
                  // F11 — IA & Programas.
                  _MenuItem(
                    icon: Icons.smart_toy_rounded,
                    label: 'Meddy (assistente IA)',
                    onTap: () => context.push('/meddy'),
                  ),
                  _MenuItem(
                    icon: Icons.document_scanner_rounded,
                    label: 'Scanner de Saúde',
                    onTap: () => context.push('/vision-scan'),
                  ),
                  _MenuItem(
                    icon: Icons.mic_rounded,
                    label: 'Diário de Voz',
                    onTap: () => context.push('/voice-journal'),
                  ),
                  _MenuItem(
                    icon: Icons.pregnant_woman_rounded,
                    label: 'Saúde Maternal',
                    onTap: () => context.push('/maternal'),
                  ),
                  _MenuItem(
                    icon: Icons.medical_services_rounded,
                    label: 'Agentes de Saúde',
                    onTap: () => context.push('/health-workers'),
                  ),
                  _MenuItem(
                    icon: Icons.card_giftcard_rounded,
                    label: 'Convida e Ganha',
                    onTap: () => context.push('/referrals'),
                  ),
                  _MenuItem(
                    icon: Icons.savings_outlined,
                    label: 'Ganhe com o MedWallet',
                    onTap: () => context.push('/earn'),
                  ),
                  // F13 — Rede Nacional & Monetização.
                  _MenuItem(
                    icon: Icons.directions_bike_rounded,
                    label: 'Riders de Saúde (entregas)',
                    onTap: () => context.push('/riders'),
                  ),
                  _MenuItem(
                    icon: Icons.storefront_rounded,
                    label: 'Classificados de Saúde',
                    onTap: () => context.push('/ads'),
                  ),
                  _MenuItem(
                    icon: Icons.emoji_events_rounded,
                    label: 'Recompensas & Conquistas',
                    onTap: () => context.push('/rewards'),
                  ),
                  _MenuItem(
                    icon: Icons.savings_rounded,
                    label: 'Monetização',
                    onTap: () => context.push('/monetization'),
                  ),
                  _MenuItem(
                    icon: Icons.pets_rounded,
                    label: 'Clínicas Veterinárias',
                    onTap: () => context.push('/veterinary'),
                  ),
                  _MenuItem(
                    icon: Icons.groups_rounded,
                    label: 'Rede APE (comunitária)',
                    onTap: () => context.push('/ape-network'),
                  ),
                  _MenuItem(
                    icon: Icons.public_rounded,
                    label: 'Impacto Público',
                    onTap: () => context.push('/impact'),
                  ),
                  // Painel do médico — só quando há linha em doctor_profiles.
                  if (ref.watch(myDoctorProfileProvider).value != null)
                    _MenuItem(
                      icon: Icons.medical_services_outlined,
                      label: 'Painel do Médico',
                      onTap: () => context.push('/doctor-hub'),
                    ),
                  // Inbox da instituição — só para donos (owner_id).
                  if ((ref.watch(myFacilitiesProvider).value ?? const [])
                      .isNotEmpty)
                    _MenuItem(
                      icon: Icons.store_rounded,
                      label: 'Inbox das minhas instituições',
                      onTap: () => context.push('/facility-inbox'),
                    ),
                  // Gestão — visível apenas a gestores/admin.
                  if (ref.watch(userRolesProvider).value
                          ?.any(managerRoles.contains) ??
                      false)
                    _MenuItem(
                      icon: Icons.admin_panel_settings_outlined,
                      label: 'Gestão',
                      onTap: () => context.push('/manager-hub'),
                    ),
                  _MenuItem(
                    icon: Icons.badge_outlined,
                    label: 'Tipo de perfil',
                    onTap: () => _showUserTypePicker(context, ref),
                  ),
                  _MenuItem(
                    icon: Icons.language_rounded,
                    label: 'Idioma',
                    onTap: () => _showLanguagePicker(context, ref),
                  ),
                  _MenuItem(
                    icon: Icons.location_on_outlined,
                    label: 'As minhas moradas',
                    onTap: () => _showAddresses(context, ref),
                  ),
                  _MenuItem(
                    icon: Icons.lock_outline_rounded,
                    label: 'Segurança (palavra-passe)',
                    onTap: () => context.push('/change-password'),
                  ),
                  _MenuItem(
                    icon: Icons.help_outline_rounded,
                    label: 'Ajuda & Legal',
                    onTap: () => context.push('/help'),
                  ),
                  _MenuItem(
                    icon: Icons.description_rounded,
                    label: 'Termos e privacidade',
                    onTap: () => _showTerms(context),
                  ),
                ],
              ).animate(delay: 100.ms).fadeIn(duration: 320.ms),

              const SizedBox(height: 14),

              _MenuGroup(
                items: [
                  _MenuItem(
                    icon: Icons.info_outline_rounded,
                    label: 'Sobre a app',
                    trailing: Text(
                      'v${AppConfig.appVersion}',
                      style: const TextStyle(
                          color: AppColors.textMuted, fontSize: 13),
                    ),
                    onTap: () {},
                  ),
                ],
              ).animate(delay: 140.ms).fadeIn(duration: 320.ms),

              const SizedBox(height: 26),
              GlassGhostButton(
                label: 'Terminar sessão',
                icon: Icons.logout_rounded,
                danger: true,
                onPressed: () => _signOut(context, ref),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showLanguagePicker(BuildContext context, WidgetRef ref) {
    final current = ref.read(localeProvider);
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(ctx).size.height * 0.7,
        ),
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [AppColors.bgHigh, AppColors.bgDeep],
          ),
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 14),
            Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Escolhe o idioma',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            Flexible(
              child: ListView.builder(
                shrinkWrap: true,
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                itemCount: appLanguages.length,
                itemBuilder: (ctx, i) {
                  final lang = appLanguages[i];
                  final selected = lang.code == current;
                  return ListTile(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    leading: Text(
                      lang.flag,
                      style: const TextStyle(fontSize: 22),
                    ),
                    title: Text(
                      lang.nativeName,
                      style: TextStyle(
                        color: selected
                            ? const Color(0xFF7DD3FC)
                            : AppColors.textPrimary,
                        fontWeight:
                            selected ? FontWeight.w800 : FontWeight.w500,
                        fontSize: 14.5,
                      ),
                    ),
                    trailing: selected
                        ? const Icon(Icons.check_circle_rounded,
                            color: Color(0xFF7DD3FC))
                        : null,
                    onTap: () {
                      ref.read(localeProvider.notifier).set(lang.code);
                      Navigator.of(ctx).pop();
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showTerms(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        padding: const EdgeInsets.all(26),
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [AppColors.bgHigh, AppColors.bgDeep],
          ),
          borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
        ),
        child: const SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Termos e Privacidade',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
              SizedBox(height: 12),
              Text(
                'A MedWallet protege os teus dados de saúde com encriptação '
                'e políticas RLS no servidor: só tu vês os teus dados. '
                'Os pagamentos M-Pesa são confirmados pela equipa financeira '
                'antes de entrarem no saldo. Documento legal completo '
                'disponível em medwalletmz.online.',
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 13.5,
                  height: 1.6,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _signOut(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.card,
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Terminar sessão?'),
        content: const Text(
            'Poderás voltar a entrar com email/password ou por SMS.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancelar',
                style: TextStyle(color: AppColors.textSecondary)),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Sair',
                style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    // Remove o token de push deste dispositivo antes de sair.
    try {
      await PushService.instance.signOut();
    } catch (_) {}

    await Supabase.instance.client.auth.signOut();
    ref.invalidate(profileProvider);
    ref.invalidate(walletStreamProvider);
    ref.invalidate(transactionsProvider);
    ref.invalidate(myConsultationsProvider);
    if (context.mounted) context.go('/login');
  }
}

// ── Componentes locais ─────────────────────────────────────────────

class EmptyProfile extends StatelessWidget {
  const EmptyProfile({super.key, required this.icon, required this.message});

  final IconData icon;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(26),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        children: [
          Icon(icon, color: AppColors.textMuted, size: 34),
          const SizedBox(height: 10),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
          ),
        ],
      ),
    );
  }
}

class _MenuGroup extends StatelessWidget {
  const _MenuGroup({required this.items});

  final List<_MenuItem> items;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        children: [
          for (var i = 0; i < items.length; i++) ...[
            items[i],
            if (i < items.length - 1)
              const Padding(
                padding: EdgeInsets.only(left: 60),
                child: Divider(height: 1),
              ),
          ],
        ],
      ),
    );
  }
}

class _MenuItem extends StatelessWidget {
  const _MenuItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.trailing,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Material(
      type: MaterialType.transparency,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 15),
          child: Row(
            children: [
              Icon(icon, color: AppColors.accent, size: 21),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 14.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              if (trailing != null) trailing!,
              const Icon(Icons.chevron_right_rounded,
                  color: AppColors.textMuted, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Papéis ─────────────────────────────────────────────────────────

class _RolesStrip extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final roles = ref.watch(userRolesProvider);
    return roles.maybeWhen(
      data: (list) => list.isEmpty
          ? const SizedBox.shrink()
          : Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final r in list)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                          color: AppColors.primary.withOpacity(0.45)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.shield_outlined,
                            size: 13, color: AppColors.accent),
                        const SizedBox(width: 6),
                        Text(
                          _roleLabel(r),
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
      orElse: () => const SizedBox.shrink(),
    );
  }

  String _roleLabel(String r) => switch (r) {
        'customer' => 'Paciente',
        'store_owner' => 'Lojista',
        'driver' => 'Estafeta',
        'doctor' => 'Médico',
        'admin' => 'Administrador',
        'country_manager' => 'Gestor de País',
        _ => r,
      };
}

// ── Moradas (tabela addresses) ─────────────────────────────────────

Future<void> _showAddresses(BuildContext context, WidgetRef ref) async {
  final uid = ref.read(currentUserIdProvider);
  if (uid == null) return;

  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _AddressesSheet(
      repo: ref.read(addressRepositoryProvider),
      userId: uid,
    ),
  );
}

class _AddressesSheet extends StatefulWidget {
  const _AddressesSheet({required this.repo, required this.userId});

  final AddressRepository repo;
  final String userId;

  @override
  State<_AddressesSheet> createState() => _AddressesSheetState();
}

class _AddressesSheetState extends State<_AddressesSheet> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  bool _adding = false;
  final _label = TextEditingController();
  final _line = TextEditingController();
  final _city = TextEditingController(text: 'Maputo');
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _label.dispose();
    _line.dispose();
    _city.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final items = await widget.repo.fetchMyAddresses(widget.userId);
      if (mounted) setState(() {
        _items = items;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _add() async {
    if (_line.text.trim().length < 6) {
      setState(() => _error = 'Indica a morada completa.');
      return;
    }
    setState(() {
      _adding = true;
      _error = null;
    });
    try {
      await widget.repo.addAddress(
        userId: widget.userId,
        label: _label.text.trim().isEmpty ? 'Casa' : _label.text.trim(),
        addressLine: _line.text.trim(),
        city: _city.text.trim().isEmpty ? 'Maputo' : _city.text.trim(),
      );
      _label.clear();
      _line.clear();
      await _load();
    } catch (_) {
      if (mounted) setState(() => _error = 'Falha ao guardar morada.');
    } finally {
      if (mounted) setState(() => _adding = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.bgHigh, AppColors.bgDeep],
        ),
        borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 26),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'As minhas moradas',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 19,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 14),
              if (_loading)
                const Padding(
                  padding: EdgeInsets.all(20),
                  child: Center(
                    child: CircularProgressIndicator(
                        color: AppColors.accent, strokeWidth: 2),
                  ),
                )
              else
                Flexible(
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: _items.length,
                    itemBuilder: (_, i) {
                      final a = _items[i];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(13),
                        decoration: BoxDecoration(
                          color: AppColors.glassFill,
                          borderRadius: BorderRadius.circular(14),
                          border:
                              Border.all(color: AppColors.glassBorder),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.home_rounded,
                                color: AppColors.accent, size: 19),
                            const SizedBox(width: 11),
                            Expanded(
                              child: Column(
                                crossAxisAlignment:
                                    CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${a['label'] ?? 'Morada'}${a['is_default'] == true ? ' · padrão' : ''}',
                                    style: const TextStyle(
                                      color: AppColors.textPrimary,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 13,
                                    ),
                                  ),
                                  Text(
                                    '${a['address_line'] ?? ''}, ${a['city'] ?? ''}',
                                    style: const TextStyle(
                                        color: AppColors.textMuted,
                                        fontSize: 12),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              const Divider(color: AppColors.glassBorder),
              TextField(
                controller: _label,
                style: const TextStyle(color: AppColors.textPrimary),
                decoration: const InputDecoration(
                  hintText: 'Etiqueta (Casa, Trabalho…)',
                  isDense: true,
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _line,
                style: const TextStyle(color: AppColors.textPrimary),
                decoration: const InputDecoration(
                  hintText: 'Bairro, rua e número',
                  prefixIcon: Icon(Icons.location_on_outlined),
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _city,
                style: const TextStyle(color: AppColors.textPrimary),
                decoration: const InputDecoration(
                  hintText: 'Cidade',
                  prefixIcon: Icon(Icons.location_city_rounded),
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(_error!,
                    style: const TextStyle(
                        color: Color(0xFFFCA5A5), fontSize: 12.5)),
              ],
              const SizedBox(height: 16),
              GradientButton(
                label: 'Adicionar morada',
                icon: Icons.add_rounded,
                loading: _adding,
                onPressed: _add,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
