import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';

/// Ajuda & Legal — FAQ em acordeão + termos/privacidade + canais de
/// contacto (paridade com Help.tsx / Legal.tsx da web).
class HelpLegalScreen extends StatelessWidget {
  const HelpLegalScreen({super.key});

  static const _faq = <(String, String)>[
    (
      'Como deposito saldo na carteira?',
      'Vai à aba Carteira, toca em Depositar e escolhe o valor. Envia o montante por M-Pesa para o número indicado e aguarda a confirmação — o saldo entra automaticamente na tua carteira e recebes uma notificação.',
    ),
    (
      'Como agendo uma consulta?',
      'Na aba Serviços escolhe a especialidade e o médico. Nos horários publicados, a consulta é paga imediatamente do teu saldo; se o médico não tiver horários, escolhe data e hora livres e o débito acontece na realização.',
    ),
    (
      'Posso cancelar uma consulta?',
      'Sim — em As minhas consultas, toca em Cancelar na consulta agendada. O horário do médico fica imediatamente livre para outros pacientes.',
    ),
    (
      'Como funcionam as receitas digitais?',
      'O médico emite a receita no chat da consulta e recebes um código de verificação. Qualquer farmácia pode validar o código em Verificar receita (aba Serviços).',
    ),
    (
      'O que é o Ganhe?',
      'Submete instituições de saúde que ainda não estão na plataforma (farmácias, clínicas, laboratórios). Quando a tua submissão é aprovada pela gestão regional, recebes dinheiro real na carteira — sem pontos nem moedas virtuais.',
    ),
    (
      'Os meus dados de saúde estão seguros?',
      'Sim. Todos os dados são protegidos por políticas de acesso (RLS) no servidor: só tu vês os teus registos, e os médicos só acedem ao que partilhares com eles. Os anexos são guardados em armazenamento privado com URLs temporários.',
    ),
    (
      'Como funcionam os Círculos de apoio?',
      'São comunidades por condição (diabetes, hipertensão, maternidade, saúde mental…). Podes conversar de forma anónima — o teu nome nunca é mostrado nas mensagens do círculo.',
    ),
    (
      'Preciso de pagar para usar a app?',
      'A app é gratuita. Só pagas os serviços de saúde que usares (consultas, exames) e isso sai do saldo da tua carteira quando confirmares.',
    ),
  ];

  static const _supportEmail = 'suporte@medwalletmz.online';
  static const _whatsapp = '+258840000000';

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
                      onPressed: () => Navigator.of(context).maybePop(),
                      icon: const Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    const Text(
                      'Ajuda & Legal',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 10, 20, 40),
                  children: [
                    _contactCard(),
                    const SizedBox(height: 18),
                    const _SectionTitle('Perguntas frequentes'),
                    for (var i = 0; i < _faq.length; i++)
                      _FaqCard(
                        question: _faqQ(i),
                        answer: _faqA(i),
                        index: i,
                      ),
                    const SizedBox(height: 18),
                    const _SectionTitle('Documentos legais'),
                    _LegalTile(
                      icon: Icons.description_rounded,
                      title: 'Termos de Utilização',
                      subtitle:
                          'Regras de uso da plataforma, carteira e serviços',
                      onTap: () => _open('https://medwalletmz.online/legal'),
                    ),
                    _LegalTile(
                      icon: Icons.privacy_tip_rounded,
                      title: 'Privacidade & Dados',
                      subtitle:
                          'Como recolhemos, usamos e protegemos os teus dados',
                      onTap: () => _open('https://medwalletmz.online/legal'),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'MedWallet MZ — carteira de saúde para Moçambique e 21 outros países. Conteúdo informativo; em emergências liga sempre ao 117 (ISEM).',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.35),
                        fontSize: 11.5,
                        height: 1.5,
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

  // acesso indexado simples às entradas do FAQ (registos tuplo)
  static String _faqQ(int i) => _faq[i].$1;
  static String _faqA(int i) => _faq[i].$2;

  Widget _contactCard() => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [
            Color(0x331E6B9C),
            Color(0x1414B8A6),
          ]),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.support_agent_rounded,
                    color: AppColors.accent, size: 22),
                SizedBox(width: 10),
                Text(
                  'Precisas de ajuda?',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 15.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              'A equipa responde em dias úteis. Para emergências médicas usa o botão SOS da app ou liga 117.',
              style: TextStyle(
                color: Colors.white.withOpacity(0.6),
                fontSize: 12.5,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _ContactChip(
                  icon: Icons.chat_rounded,
                  label: 'WhatsApp',
                  onTap: () => _open(
                      'https://wa.me/${_whatsapp.replaceAll('+', '').replaceAll(' ', '')}'),
                ),
                const SizedBox(width: 10),
                _ContactChip(
                  icon: Icons.email_rounded,
                  label: _supportEmail,
                  onTap: () => _open('mailto:$_supportEmail'),
                ),
              ],
            ),
          ],
        ),
      ).animate().fadeIn(duration: 280.ms);

  Future<void> _open(String url) async {
    final uri = Uri.parse(url);
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {}
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Text(
          text,
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 12.5,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.4,
          ),
        ),
      );
}

class _FaqCard extends StatelessWidget {
  const _FaqCard({
    required this.question,
    required this.answer,
    required this.index,
  });

  final String question;
  final String answer;
  final int index;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
          childrenPadding:
              const EdgeInsets.fromLTRB(16, 0, 16, 14),
          iconColor: AppColors.accent,
          collapsedIconColor: AppColors.textMuted,
          title: Text(
            question,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 13.5,
              fontWeight: FontWeight.w700,
            ),
          ),
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                answer,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.62),
                  fontSize: 12.8,
                  height: 1.55,
                ),
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 260.ms);
  }
}

class _LegalTile extends StatelessWidget {
  const _LegalTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.glassFill,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: Row(
          children: [
            Icon(icon, color: AppColors.accent, size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(
                        color: AppColors.textMuted, fontSize: 11.5),
                  ),
                ],
              ),
            ),
            const Icon(Icons.open_in_new_rounded,
                color: AppColors.textMuted, size: 18),
          ],
        ),
      ),
    );
  }
}

class _ContactChip extends StatelessWidget {
  const _ContactChip({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.07),
          borderRadius: BorderRadius.circular(11),
          border: Border.all(color: Colors.white.withOpacity(0.16)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: AppColors.accent, size: 16),
            const SizedBox(width: 7),
            Text(
              label,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
