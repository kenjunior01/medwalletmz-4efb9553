import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../chat/chat_controller.dart';
import '../../chat/data/chat_models.dart';
import 'facility_image.dart';
import '../data/facility_model.dart';

/// Detalhe da instituição — SEM catálogo de produtos. Apresenta a
/// identidade, localização e contactos e dá acesso directo ao chat,
/// ao envio de receita e ao Google Maps (fotos e rota vivem lá, como
/// na versão web).
class FacilityDetailScreen extends ConsumerStatefulWidget {
  const FacilityDetailScreen({super.key, required this.facility});

  final HealthFacility facility;

  @override
  ConsumerState<FacilityDetailScreen> createState() =>
      _FacilityDetailScreenState();
}

class _FacilityDetailScreenState extends ConsumerState<FacilityDetailScreen> {
  bool _openingChat = false;

  HealthFacility get facility => widget.facility;

  // ── Ações externas ────────────────────────────────────────────────

  Future<void> _openUrl(String url) async {
    final uri = Uri.parse(url);
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Não foi possível abrir a app externa.')),
      );
    }
  }

  String? get _cleanPhone {
    final raw = facility.phone?.trim();
    if (raw == null || raw.isEmpty) return null;
    final digits = raw.replaceAll(RegExp(r'[^\d+]'), '');
    return digits.isEmpty ? null : digits;
  }

  String? get _whatsappUrl {
    final phone = _cleanPhone;
    if (phone == null) return null;
    final international = phone.startsWith('+') ? phone.substring(1) : phone;
    if (international.length < 9) return null;
    return 'https://wa.me/$international';
  }

  // ── Abrir conversa ────────────────────────────────────────────────

  Future<void> _openChat({bool attach = false}) async {
    if (_openingChat) return;
    setState(() => _openingChat = true);
    try {
      final repo = ref.read(chatRepositoryProvider);
      final conversationId = await repo.openConversation(facility);
      if (!mounted) return;
      await context.push(
        '/chat',
        extra: ChatTarget(
          conversationId: conversationId,
          facility: facility,
          autoAttach: attach,
        ),
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Chat indisponível. Confirma que a migração facility_chat foi '
              'aplicada ao Supabase.',
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _openingChat = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: CustomScrollView(
          slivers: [
            // ── Cabeçalho com imagem / marca ────────────────────────
            SliverAppBar(
              pinned: true,
              expandedHeight: 190,
              backgroundColor: Colors.transparent,
              leading: _circleIcon(Icons.arrow_back_rounded, () {
                context.pop();
              }),
              title: Text(
                facility.name,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
              flexibleSpace: FlexibleSpaceBar(
                background: Stack(
                  fit: StackFit.expand,
                  children: [
                    _HeroImage(facility: facility),
                    const DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [Colors.transparent, Color(0xCC060F1A)],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 130),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  // ── Identidade ────────────────────────────────────
                  Row(
                    children: [
                      FacilityImage(facility: facility, size: 58),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    facility.type.label,
                                    style: TextStyle(
                                      color: facility.typeColor,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 13,
                                      letterSpacing: 0.4,
                                    ),
                                  ),
                                ),
                                if (facility.isVerified) ...[
                                  const SizedBox(width: 6),
                                  const Icon(Icons.verified_rounded,
                                      size: 16, color: AppColors.accent),
                                ],
                                if (facility.emergency24h) ...[
                                  const SizedBox(width: 8),
                                  const Text(
                                    '24h',
                                    style: TextStyle(
                                      color: AppColors.danger,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              facility.city ?? 'Moçambique',
                              style: const TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (facility.rating != null && facility.rating! > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0x29F5A623),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.star_rounded,
                                  size: 15, color: AppColors.warning),
                              const SizedBox(width: 3),
                              Text(
                                facility.rating!.toStringAsFixed(1),
                                style: const TextStyle(
                                  color: AppColors.warning,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  )
                      .animate()
                      .fadeIn(duration: 300.ms)
                      .slideY(begin: 0.08),

                  const SizedBox(height: 16),

                  // ── Cartão de contacto / localização ──────────────
                  _GlassCard(
                    child: Column(
                      children: [
                        _InfoRow(
                          icon: Icons.place_rounded,
                          label: 'Localização',
                          value: facility.shortLocation,
                          trailing: facility.hasLocation
                              ? _TextAction(
                                  label: 'Mapa',
                                  onTap: () => _openUrl(facility.mapsUrl),
                                )
                              : null,
                        ),
                        if (_cleanPhone != null)
                          _InfoRow(
                            icon: Icons.call_rounded,
                            label: 'Telefone',
                            value: _cleanPhone!,
                            trailing: _TextAction(
                              label: 'Ligar',
                              onTap: () =>
                                  _openUrl('tel:${_cleanPhone!}'),
                            ),
                          ),
                        if (facility.email != null &&
                            facility.email!.isNotEmpty)
                          _InfoRow(
                            icon: Icons.mail_outline_rounded,
                            label: 'E-mail',
                            value: facility.email!,
                          ),
                        if (facility.website != null &&
                            facility.website!.isNotEmpty)
                          _InfoRow(
                            icon: Icons.language_rounded,
                            label: 'Website',
                            value: facility.website!,
                            trailing: _TextAction(
                              label: 'Abrir',
                              onTap: () => _openUrl(facility.website!),
                            ),
                          ),
                        if (facility.deliveryTime != null)
                          _InfoRow(
                            icon: Icons.schedule_rounded,
                            label: 'Atendimento / entrega',
                            value: facility.deliveryTime!,
                          ),
                      ],
                    ),
                  )
                      .animate(delay: 60.ms)
                      .fadeIn(duration: 300.ms)
                      .slideY(begin: 0.08),

                  const SizedBox(height: 16),

                  // ── Aviso do modelo (sem catálogo) ────────────────
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0x141E6B9C),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0x331E6B9C)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.info_outline_rounded,
                            color: AppColors.accent, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Esta instituição não vende pela app. Pergunta '
                            'pelo que precisas ou envia a tua receita pela '
                            'conversa — a equipa responde aqui mesmo.',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.75),
                              fontSize: 12.5,
                              height: 1.45,
                            ),
                          ),
                        ),
                      ],
                    ),
                  )
                      .animate(delay: 120.ms)
                      .fadeIn(duration: 300.ms)
                      .slideY(begin: 0.08),

                  const SizedBox(height: 20),

                  // ── Ações principais ──────────────────────────────
                  GradientButton(
                    label: _openingChat
                        ? 'A abrir conversa…'
                        : 'Conversar com a instituição',
                    icon: Icons.chat_bubble_rounded,
                    loading: _openingChat,
                    onPressed: () => _openChat(),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: _SecondaryAction(
                          icon: Icons.picture_as_pdf_rounded,
                          label: 'Enviar receita',
                          color: AppColors.success,
                          onTap: () => _openChat(attach: true),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _SecondaryAction(
                          icon: Icons.map_rounded,
                          label: 'Google Maps',
                          color: AppColors.accent,
                          onTap: () => _openUrl(facility.mapsUrl),
                        ),
                      ),
                    ],
                  ),
                  if (_whatsappUrl != null) ...[
                    const SizedBox(height: 10),
                    _SecondaryAction(
                      icon: Icons.chat_rounded,
                      label: 'Contactar por WhatsApp',
                      color: const Color(0xFF25D366),
                      onTap: () => _openUrl(_whatsappUrl!),
                      wide: true,
                    ),
                  ],

                  if (facility.description != null &&
                      facility.description!.trim().isNotEmpty) ...[
                    const SizedBox(height: 20),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Sobre',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.5),
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                          letterSpacing: 1.2,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      facility.description!,
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.82),
                        fontSize: 13.5,
                        height: 1.5,
                      ),
                    ),
                  ],
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _circleIcon(IconData icon, VoidCallback onTap) => Padding(
        padding: const EdgeInsets.only(left: 12),
        child: GestureDetector(
          onTap: onTap,
          child: Container(
            decoration: const BoxDecoration(
              color: Color(0x660B1D31),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: AppColors.textPrimary, size: 20),
          ),
        ),
      );
}

// ── Cabeçalho ───────────────────────────────────────────────────────────

class _HeroImage extends StatelessWidget {
  const _HeroImage({required this.facility});

  final HealthFacility facility;

  @override
  Widget build(BuildContext context) {
    final url = facility.imageUrl;
    final isRemote =
        url != null && (url.startsWith('http://') || url.startsWith('https://'));

    if (isRemote) {
      return Image.network(
        url!,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _brand(),
      );
    }
    return _brand();
  }

  Widget _brand() {
    final color = facility.typeColor;
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            color.withOpacity(0.4),
            const Color(0xFF0A1826),
          ],
        ),
      ),
      alignment: Alignment.center,
      child: Icon(
        FacilityImage.iconFor(facility.type),
        size: 64,
        color: color.withOpacity(0.9),
      ),
    );
  }
}

// ── Blocos auxiliares ───────────────────────────────────────────────────

class _GlassCard extends StatelessWidget {
  const _GlassCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: child,
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
    this.trailing,
  });

  final IconData icon;
  final String label;
  final String value;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.accent),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.45),
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 1),
                Text(
                  value,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

class _TextAction extends StatelessWidget {
  const _TextAction({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: const Color(0x2E38BDF8),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0x5538BDF8)),
        ),
        child: Text(
          label,
          style: const TextStyle(
            color: AppColors.accent,
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

class _SecondaryAction extends StatelessWidget {
  const _SecondaryAction({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
    this.wide = false,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  final bool wide;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 52,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.10),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.35)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: wide ? MainAxisSize.max : MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                label,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
