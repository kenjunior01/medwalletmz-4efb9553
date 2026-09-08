import 'package:flutter/material.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';

/// Clínicas Veterinárias (paridade com `health/Veterinary.tsx` da web):
/// lista estática de clínicas parceiras com pesquisa local. A web usa
/// dados mock no cliente — mantemos a mesma abordagem até existir uma
/// tabela dedicada (zero alterações de backend).
class _Vet {
  const _Vet({
    required this.name,
    required this.specialty,
    required this.address,
    required this.rating,
    required this.reviews,
    required this.emoji,
    required this.services,
  });

  final String name;
  final String specialty;
  final String address;
  final double rating;
  final int reviews;
  final String emoji;
  final List<String> services;
}

const List<_Vet> _kVets = [
  _Vet(
    name: 'Clínica VetMaputo',
    specialty: 'Animais de estimação',
    address: 'Av. Julius Nyerere, Maputo',
    rating: 4.8,
    reviews: 124,
    emoji: '🐕',
    services: ['Consultas', 'Vacinação', 'Cirurgia', 'Emergência 24h'],
  ),
  _Vet(
    name: 'Dr. João Silva (Veterinário)',
    specialty: 'Grandes animais & gado',
    address: 'Matola Rio',
    rating: 4.5,
    reviews: 56,
    emoji: '🐄',
    services: ['Visitas ao campo', 'Vacinação de gado', 'Cuidados reprodutivos'],
  ),
];

class VeterinaryScreen extends StatefulWidget {
  const VeterinaryScreen({super.key});

  @override
  State<VeterinaryScreen> createState() => _VeterinaryScreenState();
}

class _VeterinaryScreenState extends State<VeterinaryScreen> {
  String _search = '';

  @override
  Widget build(BuildContext context) {
    final filtered = _kVets
        .where((v) =>
            _search.isEmpty ||
            v.name.toLowerCase().contains(_search.toLowerCase()) ||
            v.specialty.toLowerCase().contains(_search.toLowerCase()))
        .toList();
    return AppBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          title: const Text('Veterinária 🐾'),
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF059669), Color(0xFF065F46)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Row(
                children: [
                  const Text('🐾', style: TextStyle(fontSize: 30)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Cuidado para os teus animais',
                            style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 15.5)),
                        const SizedBox(height: 4),
                        Text(
                          'Clínicas veterinárias parceiras — cães, gatos, '
                          'aves e gado. Ligar e marcar directamente.',
                          style: TextStyle(
                              color: Colors.white.withOpacity(0.8),
                              fontSize: 12,
                              height: 1.4),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              onChanged: (v) => setState(() => _search = v),
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: InputDecoration(
                hintText: 'Procurar clínica ou especialidade…',
                hintStyle: const TextStyle(color: AppColors.textMuted),
                prefixIcon:
                    const Icon(Icons.search_rounded, color: AppColors.textMuted),
                filled: true,
                fillColor: AppColors.glassFill,
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide(color: AppColors.glassBorder),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: AppColors.accent),
                ),
              ),
            ),
            const SizedBox(height: 14),
            if (filtered.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 48),
                child: Column(
                  children: [
                    Icon(Icons.pets_rounded, size: 44, color: AppColors.textMuted),
                    SizedBox(height: 10),
                    Text(
                      'Nenhuma clínica encontrada.',
                      style: TextStyle(color: AppColors.textMuted),
                    ),
                  ],
                ),
              ),
            ...filtered.map(_VetCard.new),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.glassFill,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.glassBorder),
              ),
              child: const Text(
                'ℹ️ A tua clínica veterinária aparece aqui — fala com o gestor '
                'regional da tua província para ser verificada e listada.',
                style: TextStyle(color: AppColors.textMuted,
                    fontSize: 12, height: 1.5),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _VetCard extends StatelessWidget {
  const _VetCard(this.vet);
  final _Vet vet;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.primaryDark.withOpacity(0.5),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(vet.emoji, style: const TextStyle(fontSize: 24)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(vet.name,
                        style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w800,
                            fontSize: 14)),
                    const SizedBox(height: 2),
                    Text(vet.specialty,
                        style: const TextStyle(
                            color: AppColors.textSecondary, fontSize: 12)),
                  ],
                ),
              ),
              Column(
                children: [
                  Row(
                    children: [
                      const Icon(Icons.star_rounded,
                          color: AppColors.warning, size: 15),
                      const SizedBox(width: 2),
                      Text(vet.rating.toStringAsFixed(1),
                          style: const TextStyle(
                              color: AppColors.warning,
                              fontWeight: FontWeight.w800,
                              fontSize: 12.5)),
                    ],
                  ),
                  Text('${vet.reviews} avaliações',
                      style: const TextStyle(
                          color: AppColors.textMuted, fontSize: 10)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.location_on_rounded,
                  size: 14, color: AppColors.textMuted),
              const SizedBox(width: 4),
              Expanded(
                child: Text(vet.address,
                    style: const TextStyle(
                        color: AppColors.textMuted, fontSize: 12)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: vet.services
                .map((s) => Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 9, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.accent.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Text(s,
                          style: const TextStyle(
                              color: AppColors.accent,
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700)),
                    ))
                .toList(),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.verified_rounded,
                  size: 14, color: AppColors.success),
              const SizedBox(width: 4),
              const Text('Parceiro verificado pela equipa regional',
                  style: TextStyle(color: AppColors.success, fontSize: 11.5)),
            ],
          ),
        ],
      ),
    );
  }
}
