import 'dart:ui';

/// Fonte de dados da instituição — cada uma mora numa tabela diferente
/// da MESMA base da versão web:
///   store      → `stores`               (farmácias)
///   clinic     → `clinics`              (clínicas, hospitais, laboratórios)
///   veterinary → `veterinary_clinics`   (clínicas veterinárias)
enum FacilitySource { store, clinic, veterinary }

/// Tipo apresentado ao utilizador. Derivado do campo `type` nas tabelas
/// web (pharmacy | hospital | clinic | laboratory) ou da fonte veterinária.
enum FacilityType {
  pharmacy('Farmácia'),
  hospital('Hospital'),
  clinic('Clínica'),
  laboratory('Laboratório'),
  veterinary('Veterinária');

  const FacilityType(this.label);
  final String label;

  static FacilityType parse(String? raw, FacilitySource source) {
    switch (raw) {
      case 'pharmacy':
        return FacilityType.pharmacy;
      case 'hospital':
        return FacilityType.hospital;
      case 'clinic':
        return FacilityType.clinic;
      case 'laboratory':
      case 'lab':
        return FacilityType.laboratory;
      case 'veterinary':
        return FacilityType.veterinary;
    }
    return source == FacilitySource.veterinary
        ? FacilityType.veterinary
        : FacilityType.clinic;
  }
}

/// Instituição de saúde unificada — diretório com localização e contacto.
///
/// Modelo deliberadamente SEM catálogo de produtos: o utilizador vê a
/// instituição (imagem/estilo Google Maps), localização, contactos e
/// conversa por chat — perguntando o que tem disponível e enviando
/// receitas por anexo, nunca comprando pela app.
class HealthFacility {
  const HealthFacility({
    required this.id,
    required this.source,
    required this.type,
    required this.name,
    this.city,
    this.address,
    this.description,
    this.rating,
    this.latitude,
    this.longitude,
    this.imageUrl,
    this.phone,
    this.email,
    this.website,
    this.isVerified = false,
    this.deliveryTime,
    this.emergency24h = false,
    this.googlePlaceId,
  });

  final String id;
  final FacilitySource source;
  final FacilityType type;
  final String name;
  final String? city;
  final String? address;
  final String? description;
  final double? rating;
  final double? latitude;
  final double? longitude;
  final String? imageUrl;
  final String? phone;
  final String? email;
  final String? website;
  final bool isVerified;
  final String? deliveryTime;
  final bool emergency24h;
  final String? googlePlaceId;

  // ── Factories por tabela de origem ─────────────────────────────────

  /// `stores` — farmácias da base web (type = 'pharmacy').
  factory HealthFacility.fromStore(Map<String, dynamic> j) {
    return HealthFacility(
      id: j['id'] as String,
      source: FacilitySource.store,
      type: FacilityType.pharmacy,
      name: (j['name'] ?? '') as String,
      city: j['city'] as String?,
      address: j['address'] as String?,
      description: j['description'] as String?,
      rating: _toDouble(j['rating']),
      latitude: _toDouble(j['latitude']),
      longitude: _toDouble(j['longitude']),
      imageUrl: j['image_url'] as String?,
      phone: j['phone'] as String?,
      isVerified: (j['google_place_id'] as String?) != null,
      deliveryTime: j['delivery_time'] as String?,
      googlePlaceId: j['google_place_id'] as String?,
    );
  }

  /// `clinics` — type = hospital | clinic | laboratory.
  factory HealthFacility.fromClinic(Map<String, dynamic> j) {
    return HealthFacility(
      id: j['id'] as String,
      source: FacilitySource.clinic,
      type: FacilityType.parse(j['type'] as String?, FacilitySource.clinic),
      name: (j['name'] ?? '') as String,
      city: j['city'] as String?,
      address: j['address'] as String?,
      description: j['description'] as String?,
      latitude: _toDouble(j['latitude']),
      longitude: _toDouble(j['longitude']),
      imageUrl: j['image_url'] as String?,
      phone: j['phone'] as String?,
      email: j['email'] as String?,
      website: j['website'] as String?,
      isVerified: (j['is_verified'] as bool?) ?? false,
      googlePlaceId: j['google_place_id'] as String?,
    );
  }

  /// `veterinary_clinics`.
  factory HealthFacility.fromVet(Map<String, dynamic> j) {
    return HealthFacility(
      id: j['id'] as String,
      source: FacilitySource.veterinary,
      type: FacilityType.veterinary,
      name: (j['name'] ?? '') as String,
      city: j['city'] as String?,
      address: j['address'] as String?,
      description: j['description'] as String?,
      rating: _toDouble(j['rating']),
      latitude: _toDouble(j['latitude']),
      longitude: _toDouble(j['longitude']),
      imageUrl: j['image_url'] as String?,
      phone: j['phone'] as String?,
      email: j['email'] as String?,
      website: j['website'] as String?,
      isVerified: (j['is_verified'] as bool?) ?? false,
      emergency24h: (j['emergency_24h'] as bool?) ?? false,
    );
  }

  // ── Derivados de apresentação ──────────────────────────────────────

  /// Cor temática por tipo de instituição (modo escuro glassmorphism).
  Color get typeColor {
    switch (type) {
      case FacilityType.pharmacy:
        return const Color(0xFF34D399); // verde saúde
      case FacilityType.hospital:
        return const Color(0xFFF87171); // urgência
      case FacilityType.clinic:
        return const Color(0xFF38BDF8); // ciano da marca
      case FacilityType.laboratory:
        return const Color(0xFFA78BFA); // violeta exames
      case FacilityType.veterinary:
        return const Color(0xFFFBBF24); // âmbar patinhas
    }
  }

  bool get hasLocation => latitude != null && longitude != null;

  bool get hasContact => (phone != null && phone!.trim().isNotEmpty) || email != null;

  /// Deep-link universal do Google Maps — abre a app nativa no telemóvel
  /// e o site no desktop (mesmo comportamento do botão web).
  String get mapsUrl {
    if (googlePlaceId != null && googlePlaceId!.isNotEmpty) {
      return 'https://www.google.com/maps/place/?q=place_id:$googlePlaceId';
    }
    if (hasLocation) {
      return 'https://www.google.com/maps/search/?api=1&query=$latitude,$longitude';
    }
    final q = Uri.encodeComponent('${name} ${city ?? ''} Moçambique'.trim());
    return 'https://www.google.com/maps/search/?api=1&query=$q';
  }

  /// Localização textual curta para cartões de lista.
  String get shortLocation {
    if (address != null && address!.trim().isNotEmpty) return address!;
    return city ?? 'Localização não indicada';
  }

  static double? _toDouble(Object? v) {
    if (v == null) return null;
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString());
  }
}
