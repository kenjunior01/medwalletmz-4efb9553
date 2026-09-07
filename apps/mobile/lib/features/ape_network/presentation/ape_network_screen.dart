import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';

/// Rede APE — Agentes Polivalentes Elementares (paridade estática com
/// `pages/ApeNetwork.tsx` da web, que também não consulta a BD):
/// distribuição por província, APEs em destaque, benefícios do programa
/// e CTA para se juntar via marketplace de agentes de saúde.
class ApeNetworkScreen extends StatelessWidget {
  const ApeNetworkScreen({super.key});

  static const List<(String, int, Color)> _byProvince = [
    ('Maputo Cidade', 184, Color(0xFF10B981)),
    ('Maputo Província', 312, Color(0xFF14B8A6)),
    ('Gaza', 248, Color(0xFF06B6D4)),
    ('Inhambane', 156, Color(0xFF3B82F6)),
    ('Sofala', 287, Color(0xFF6366F1)),
    ('Manica', 174, Color(0xFF8B5CF6)),
    ('Tete', 198, Color(0xFFA855F7)),
    ('Zambézia', 412, Color(0xFFD946EF)),
    ('Nampula', 386, Color(0xFFEC4899)),
    ('Cabo Delgado', 142, Color(0xFFF43F5E)),
    ('Niassa', 98, Color(0xFFF97316)),
  ];

  static const List<(String, String, int, int)> _topApes = [
    ('A.M.', 'Zambézia', 184, 14),
    ('F.C.', 'Nampula', 167, 11),
    ('H.J.', 'Sofala', 142, 9),
    ('M.S.', 'Maputo Prov.', 138, 12),
    ('R.T.', 'Tete', 121, 8),
  ];

  static const List<(IconData, String, String)> _benefits = [
    (
      Icons.account_balance_wallet_rounded,
      'Bónus M-Pesa 250 MZN',
      'Por cada paciente activo durante 30 dias (D30). Recebimento semanal via M-Pesa.',
    ),
    (
      Icons.workspace_premium_rounded,
      'Conta Pro Grátis',
      'Acesso completo ao MedWallet Pro (1.500 MZN/mês) sem custo para APEs verificados.',
    ),
    (
      Icons.trending_up_rounded,
      'Pontos Pulse',
      'Cada triagem e registo vale pontos convertíveis em bónus M-Pesa.',
    ),
    (
      Icons.verified_user_rounded,
      'Formação certificada',
      'Curso online + certificado MedWallet/MISAU após 50 pacientes activos.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final total = _byProvince.fold<int>(0, (a, b) => a + b.$2);
    final maxCount =
        _byProvince.fold<int>(0, (a, b) => b.$2 > a ? b.$2 : a);
    return AppBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          title: const Text('Rede APE 🧑🏾‍⚕️'),
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFEA580C), Color(0xFF92400E)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('🧑🏾‍⚕️', style: TextStyle(fontSize: 32)),
                  const SizedBox(height: 8),
                  const Text('Rede APE MedWallet',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w800)),
                  const SizedBox(height: 6),
                  Text(
                    'Agentes Polivalentes Elementares ligados à plataforma — '
                    'o coração comunitário da saúde primária, digitalizado.',
                    style: TextStyle(
                        color: Colors.white.withOpacity(0.85),
                        height: 1.45),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      _HeroStat(value: '$total', label: 'APEs na rede'),
                      const SizedBox(width: 14),
                      _HeroStat(
                          value:
                              '${_byProvince.fold<int>(0, (a, b) => a + b.$3 ~/ 4)}k+',
                          label: 'pacientes acompanhados'),
                      const SizedBox(width: 14),
                      _HeroStat(value: '11', label: 'províncias'),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _SectionCard(
              title: 'Distribuição por província',
              child: Column(
                children: _byProvince.map((p) {
                  final width = p.$2 / maxCount;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        SizedBox(
                          width: 110,
                          child: Text(p.$1,
                              style: const TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 11)),
                        ),
                        Expanded(
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: width,
                              minHeight: 8,
                              backgroundColor: AppColors.glassFill,
                              valueColor:
                                  AlwaysStoppedAnimation<Color>(p.$3),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        SizedBox(
                          width: 34,
                          child: Text('${p.$2}',
                              textAlign: TextAlign.right,
                              style: TextStyle(
                                  color: p.$3,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 11.5)),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 14),
            _SectionCard(
              title: 'APEs em destaque',
              child: Column(
                children: _topApes.map((a) {
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.glassFill,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 17,
                          backgroundColor: AppColors.primary,
                          child: Text(a.$1,
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w800)),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('APE ${a.$1} — ${a.$2}',
                                  style: const TextStyle(
                                      color: AppColors.textPrimary,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 12.5)),
                              Text('${a.$4} meses activo',
                                  style: const TextStyle(
                                      color: AppColors.textMuted,
                                      fontSize: 10.5)),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text('${a.$3}',
                                style: const TextStyle(
                                    color: AppColors.success,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 14)),
                            const Text('pacientes',
                                style: TextStyle(
                                    color: AppColors.textMuted,
                                    fontSize: 10)),
                          ],
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 14),
            _SectionCard(
              title: 'Benefícios do programa',
              child: Column(
                children: _benefits.map((b) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: const Color(0xFFEA580C).withOpacity(0.16),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(b.$1,
                              color: const Color(0xFFFB923C), size: 18),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(b.$2,
                                  style: const TextStyle(
                                      color: AppColors.textPrimary,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 13)),
                              const SizedBox(height: 2),
                              Text(b.$3,
                                  style: const TextStyle(
                                      color: AppColors.textMuted,
                                      fontSize: 11.5,
                                      height: 1.4)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFEA580C), Color(0xFFD97706)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Column(
                children: [
                  const Text('És APE ou conheces um?',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w800)),
                  const SizedBox(height: 6),
                  Text(
                    'Regista-te no marketplace de agentes de saúde e o gestor '
                    'regional da tua província faz a verificação.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        color: Colors.white.withOpacity(0.85),
                        fontSize: 12.5,
                        height: 1.45),
                  ),
                  const SizedBox(height: 14),
                  ElevatedButton.icon(
                    onPressed: () => context.push('/health-workers'),
                    icon: const Icon(Icons.group_add_rounded, size: 18),
                    label: const Text('Juntar-me à rede',
                        style: TextStyle(fontWeight: FontWeight.w800)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF92400E),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 22, vertical: 12),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                    ),
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

class _HeroStat extends StatelessWidget {
  const _HeroStat({required this.value, required this.label});
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(value,
            style: const TextStyle(
                color: Colors.white,
                fontSize: 19,
                fontWeight: FontWeight.w900)),
        Text(label,
            style: TextStyle(
                color: Colors.white.withOpacity(0.7), fontSize: 10.5)),
      ],
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w800,
                  fontSize: 14)),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}
