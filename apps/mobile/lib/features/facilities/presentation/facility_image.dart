import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../data/facility_model.dart';

/// Imagem da instituição. Usa a foto registada na base (quando existe,
/// ex.: fotografia do Google Maps / Unsplash semeada pela versão web);
/// caso contrário desenha um cabeçalho de marca com gradiente temático
/// do tipo de instituição — nunca um catálogo de produtos.
class FacilityImage extends StatelessWidget {
  const FacilityImage({
    super.key,
    required this.facility,
    this.size = 76,
    this.borderRadius = 14,
  });

  final HealthFacility facility;
  final double size;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    final url = facility.imageUrl;
    final isRemote = url != null &&
        (url.startsWith('http://') || url.startsWith('https://'));

    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: SizedBox(
        width: size,
        height: size,
        child: isRemote
            ? Image.network(
                url!,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => _brandTile(),
                loadingBuilder: (context, child, progress) =>
                    progress == null ? child : _brandTile(),
              )
            : _brandTile(),
      ),
    );
  }

  Widget _brandTile() {
    final color = facility.typeColor;
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            color.withOpacity(0.35),
            color.withOpacity(0.08),
          ],
        ),
      ),
      alignment: Alignment.center,
      child: Icon(
        iconFor(facility.type),
        color: color,
        size: facility.type == FacilityType.hospital ? size * 0.42 : size * 0.46,
      ),
    );
  }

  /// Ícone temático por tipo — público para reutilizar no cabeçalho
  /// do ecrã de detalhe.
  static IconData iconFor(FacilityType type) {
    switch (type) {
      case FacilityType.pharmacy:
        return Icons.local_pharmacy_rounded;
      case FacilityType.hospital:
        return Icons.local_hospital_rounded;
      case FacilityType.clinic:
        return Icons.medical_services_rounded;
      case FacilityType.laboratory:
        return Icons.science_rounded;
      case FacilityType.veterinary:
        return Icons.pets_rounded;
    }
  }
}
