import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_colors.dart';
import '../data/emergency_card_repository.dart';

/// ── Ficha de Emergência (EXCLUSIVO MÓVEL) ────────────────────────────
///
/// Ecrã legível por SOCORRISTAS: funciona SEM internet (cache local) e
/// é o ÚNICO ecrã acessível com a app bloqueada — o bypass do bloqueio
/// biométrico não expõe nada da app em si, apenas os dados médicos que
/// salvam vidas. Design de alto contraste, letras grandes, chamada de
/// 1 toque e QR com o resumo para qualquer leitor.
///
/// Usado em 3 sítios:
///   • Botão "Emergência" no ecrã de bloqueio (AppLockGate)
///   • Rota `/emergency-card` (SOS, Perfil, balcões rápidos)
///   • Long-press no ícone (App Shortcut nativo)
class EmergencyCardScreen extends StatelessWidget {
  const EmergencyCardScreen({
    super.key,
    this.data,
    this.onClose,
    this.showCloseButton = true,
  });

  /// Dados pré-carregados (bypass do bloqueio — evita recomputar).
  final EmergencyCardData? data;

  /// Se fornecido (modo overlay do lock), desenha o próprio botão de
  /// fecho em vez de depender do Navigator — o lock não tem rotas.
  final VoidCallback? onClose;

  final bool showCloseButton;

  @override
  Widget build(BuildContext context) {
    return _CardLoader(prefetched: data, onClose: onClose, showClose: showCloseButton);
  }
}

class _CardLoader extends StatefulWidget {
  const _CardLoader({
    this.prefetched,
    this.onClose,
    required this.showClose,
  });

  final EmergencyCardData? prefetched;
  final VoidCallback? onClose;
  final bool showClose;

  @override
  State<_CardLoader> createState() => _CardLoaderState();
}

class _CardLoaderState extends State<_CardLoader> {
  EmergencyCardData? _data;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    // 1º o cache local (instantâneo, offline), depois tenta refrescar
    // da BD apenas se houver sessão aberta — nunca bloqueia o socorrista.
    final cached = widget.prefetched ??
        await EmergencyCardRepository.instance.fromCache();
    if (mounted) {
      setState(() {
        _data = cached;
        _loading = false;
      });
    }
    // Refresco silencioso em background (não bloqueia a UI acima).
    final fresh = await EmergencyCardRepository.instance.refresh();
    if (fresh != null && mounted && _data == null) {
      setState(() => _data = fresh);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF12060A),
      body: SafeArea(
        child: Stack(
          children: [
            // Brilho vermelho de fundo (urgência, alto contraste).
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: Alignment.topCenter,
                    radius: 1.4,
                    colors: [
                      AppColors.danger.withOpacity(0.22),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
            Column(
              children: [
                _buildHeader(),
                Expanded(
                  child: _loading
                      ? const Center(
                          child: CircularProgressIndicator(
                              color: AppColors.danger))
                      : _data == null || _data!.isEmpty
                          ? _EmptyCard(onClose: widget.onClose)
                          : _CardContent(data: _data!),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 8, 20, 0),
      child: Row(
        children: [
          if (widget.showClose)
            IconButton(
              onPressed: () {
                if (widget.onClose != null) {
                  widget.onClose!();
                } else if (Navigator.of(context).canPop()) {
                  Navigator.of(context).pop();
                }
              },
              icon: const Icon(Icons.close_rounded,
                  color: AppColors.textPrimary),
            ),
          Expanded(
            child: Text(
              'FICHA DE EMERGÊNCIA',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppColors.danger,
                fontSize: 15,
                fontWeight: FontWeight.w900,
                letterSpacing: 2.2,
              ),
            ),
          ),
          const SizedBox(width: 48),
        ],
      ),
    );
  }
}

/// Conteúdo completo — só aparece se houver dados.
class _CardContent extends StatelessWidget {
  const _CardContent({required this.data});

  final EmergencyCardData data;

  @override
  Widget build(BuildContext context) {
    final contact = _bestContact;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
      children: [
        // ── Identidade + tipo de sangue ──────────────────────────────
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.glassFill,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppColors.danger.withOpacity(0.35)),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      data.fullName ?? 'Paciente MedWallet',
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _subtitle,
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.6),
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                width: 86,
                height: 86,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const LinearGradient(
                      colors: [Color(0xFFB91C1C), AppColors.danger]),
                  border: Border.all(
                      color: Colors.white.withOpacity(0.3), width: 2),
                  boxShadow: const [
                    BoxShadow(color: Color(0x66EF4444), blurRadius: 26),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      data.bloodType ?? '—',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 26,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    if (data.bloodType == null)
                      Text('sangue',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.7),
                            fontSize: 9,
                          )),
                  ],
                ),
              ),
            ],
          ),
        ).animate().fadeIn(duration: 220.ms).slideY(begin: 0.08, end: 0),

        const SizedBox(height: 14),

        // ── Alergias ─────────────────────────────────────────────────
        _SectionCard(
          icon: Icons.warning_amber_rounded,
          title: 'ALERGIAS',
          accent: AppColors.danger,
          items: data.allergies,
          emptyText: 'Nenhuma alergia registada',
          chipColor: AppColors.danger,
        ),
        const SizedBox(height: 12),

        // ── Condições crónicas ───────────────────────────────────────
        _SectionCard(
          icon: Icons.favorite_rounded,
          title: 'CONDIÇÕES CRÓNICAS',
          accent: AppColors.warning,
          items: data.chronicConditions,
          emptyText: 'Nenhuma condição registada',
          chipColor: AppColors.warning,
        ),
        const SizedBox(height: 12),

        // ── Medicação actual ─────────────────────────────────────────
        _SectionCard(
          icon: Icons.medication_rounded,
          title: 'MEDICAÇÃO ACTUAL',
          accent: AppColors.teal,
          items: data.currentMedications,
          emptyText: 'Sem medicação registada',
          chipColor: AppColors.teal,
        ),
        const SizedBox(height: 14),

        // ── Contacto de emergência (chamada de 1 toque) ─────────────
        if (contact != null && (contact.phone?.isNotEmpty ?? false)) ...[
          _CallCard(
            name: contact.name ?? 'Contacto de emergência',
            phone: contact.phone!,
            relationship: contact.relationship,
          ),
          const SizedBox(height: 14),
        ],

        // ── QR para o socorrista ─────────────────────────────────────
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
          ),
          child: Column(
            children: [
              QrImageView(
                data: data.toQrText(),
                size: 168,
                backgroundColor: Colors.white,
                eyeStyle: const QrEyeStyle(
                  eyeShape: QrEyeShape.square,
                  color: Color(0xFF12060A),
                ),
                dataModuleStyle: const QrDataModuleStyle(
                  dataModuleShape: QrDataModuleShape.square,
                  color: Color(0xFF12060A),
                ),
              ),
              const SizedBox(height: 10),
              const Text(
                'Aponte a câmara para ler o resumo médico',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Color(0xFF12060A),
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ).animate().fadeIn(duration: 260.ms, delay: 160.ms),

        const SizedBox(height: 12),

        // Rodapé honesto.
        Text(
          'Dados do perfil de saúde · actualizados a '
          '${data.updatedAt.day.toString().padLeft(2, '0')}/'
          '${data.updatedAt.month.toString().padLeft(2, '0')}/'
          '${data.updatedAt.year}',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.white.withOpacity(0.35),
            fontSize: 11,
          ),
        ),
      ],
    );
  }

  String get _subtitle {
    final parts = <String>[];
    final a = data.age;
    if (a != null) parts.add('$a anos');
    if (data.gender != null && data.gender!.isNotEmpty) parts.add(data.gender!);
    return parts.isEmpty ? 'Membro MedWallet MZ' : parts.join(' · ');
  }

  IceContact? get _bestContact {
    for (final c in data.contacts) {
      if (c.phone != null && c.phone!.isNotEmpty) return c;
    }
    if (data.primaryContact != null &&
        (data.primaryContact!.phone?.isNotEmpty ?? false)) {
      return data.primaryContact;
    }
    return null;
  }
}

/// Secção genérica (alergias / condições / medicação).
class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.icon,
    required this.title,
    required this.accent,
    required this.items,
    required this.emptyText,
    required this.chipColor,
  });

  final IconData icon;
  final String title;
  final Color accent;
  final List<String> items;
  final String emptyText;
  final Color chipColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: accent.withOpacity(0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: accent, size: 18),
              const SizedBox(width: 8),
              Text(
                title,
                style: TextStyle(
                  color: accent,
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.6,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (items.isEmpty)
            Text(
              emptyText,
              style: TextStyle(
                color: Colors.white.withOpacity(0.4),
                fontSize: 13,
              ),
            )
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final item in items)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                    decoration: BoxDecoration(
                      color: chipColor.withOpacity(0.16),
                      borderRadius: BorderRadius.circular(12),
                      border:
                          Border.all(color: chipColor.withOpacity(0.4)),
                    ),
                    child: Text(
                      item,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
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

/// Cartão de chamada de 1 toque para o contacto de emergência.
class _CallCard extends StatelessWidget {
  const _CallCard({
    required this.name,
    required this.phone,
    this.relationship,
  });

  final String name;
  final String phone;
  final String? relationship;

  Future<void> _call() async {
    HapticFeedback.mediumImpact();
    final uri = Uri(scheme: 'tel', path: phone);
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
            colors: [Color(0xFFB91C1C), Color(0xFFDC2626)]),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.2)),
        boxShadow: const [
          BoxShadow(color: Color(0x59EF4444), blurRadius: 22),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'CONTACTO DE EMERGÊNCIA',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.75),
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                if (relationship != null && relationship!.isNotEmpty)
                  Text(
                    relationship!,
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.7),
                      fontSize: 12,
                    ),
                  ),
                const SizedBox(height: 2),
                Text(
                  phone,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.6,
                  ),
                ),
              ],
            ),
          ),
          GestureDetector(
            onTap: _call,
            child: Container(
              width: 62,
              height: 62,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white,
                boxShadow: const [
                  BoxShadow(color: Color(0x4D000000), blurRadius: 12),
                ],
              ),
              child: const Icon(Icons.call_rounded,
                  color: Color(0xFFB91C1C), size: 28),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 240.ms, delay: 80.ms);
  }
}

/// Estado vazio honesto — sem dados na ficha.
class _EmptyCard extends StatelessWidget {
  const _EmptyCard({this.onClose});

  final VoidCallback? onClose;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 76,
              height: 76,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.danger.withOpacity(0.15),
                border: Border.all(color: AppColors.danger.withOpacity(0.4)),
              ),
              child: const Icon(Icons.emergency_rounded,
                  color: AppColors.danger, size: 36),
            ),
            const SizedBox(height: 20),
            const Text(
              'Ficha ainda sem dados',
              style: TextStyle(
                color: AppColors.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Preenche o tipo de sangue, alergias e contacto de '
              'emergência no Perfil → Ficha de Saúde. Num momento '
              'crítico esta página pode salvar a tua vida — mesmo com '
              'a app bloqueada ou sem internet.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white.withOpacity(0.55),
                fontSize: 13,
                height: 1.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
