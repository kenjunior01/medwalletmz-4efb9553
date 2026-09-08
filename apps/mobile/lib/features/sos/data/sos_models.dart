/// Contacto de emergência — tabela `emergency_contacts`.
class EmergencyContact {
  const EmergencyContact({
    required this.id,
    required this.name,
    required this.phone,
    this.relationship,
    this.isPrimary = false,
    this.notifyOnSos = true,
  });

  final String id;
  final String name;
  final String phone;
  final String? relationship;
  final bool isPrimary;

  /// Se deve ser notificado num SOS (booleano notify_on_sos).
  final bool notifyOnSos;

  factory EmergencyContact.fromJson(Map<String, dynamic> j) =>
      EmergencyContact(
        id: j['id'] as String,
        name: (j['name'] ?? '') as String,
        phone: (j['phone'] ?? '') as String,
        relationship: j['relationship'] as String?,
        isPrimary: j['is_primary'] as bool? ?? false,
        notifyOnSos: j['notify_on_sos'] as bool? ?? true,
      );
}

/// Alerta SOS do utilizador — tabela `emergency_alerts`.
class SosAlert {
  const SosAlert({
    required this.id,
    required this.status,
    required this.activatedAt,
    this.city,
    this.latitude,
    this.longitude,
    this.bloodType,
    this.contactsNotified = const [],
  });

  final String id;

  /// active | acknowledged | resolved | cancelled | false_alarm
  final String status;
  final String? city;
  final double? latitude;
  final double? longitude;
  final String? bloodType;
  final List<String> contactsNotified;
  final DateTime activatedAt;

  factory SosAlert.fromJson(Map<String, dynamic> j) {
    final loc = j['location'];
    double? lat, lng;
    if (loc is Map) {
      lat = (loc['latitude'] as num?)?.toDouble();
      lng = (loc['longitude'] as num?)?.toDouble();
    }
    final notified = j['contacts_notified'];
    return SosAlert(
      id: j['id'] as String,
      status: j['status'] as String? ?? 'active',
      city: j['city'] as String?,
      latitude: lat,
      longitude: lng,
      bloodType: j['blood_type'] as String?,
      contactsNotified: notified is List
          ? notified.map((e) => e.toString()).toList()
          : const [],
      activatedAt: DateTime.tryParse(j['activated_at']?.toString() ?? '') ??
          DateTime.now(),
    );
  }

  bool get isActive => status == 'active' || status == 'acknowledged';
}
