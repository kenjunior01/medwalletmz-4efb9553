import 'package:geolocator/geolocator.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'sos_models.dart';

/// SOS Emergência — criação de alertas (`emergency_alerts`), gestão de
/// contactos (`emergency_contacts`) e streaming do estado em tempo
/// real. Tenta primeiro a Edge Function `emergency-sos` (que também
/// notifica os contactos por push); se falhar, faz INSERT directo
/// (RLS permite o próprio utilizador).
class SosRepository {
  SosRepository(this._client);

  final SupabaseClient _client;

  // ── Contactos de emergência ───────────────────────────────────────

  Future<List<EmergencyContact>> fetchContacts() async {
    try {
      final rows = await _client
          .from('emergency_contacts')
          .select()
          .order('is_primary', ascending: false)
          .order('name');
      return rows.map(EmergencyContact.fromJson).toList();
    } catch (_) {
      return const [];
    }
  }

  Future<void> addContact({
    required String name,
    required String phone,
    String? relationship,
    bool isPrimary = false,
  }) async {
    await _client.from('emergency_contacts').insert({
      'name': name,
      'phone': phone,
      if (relationship != null && relationship.isNotEmpty)
        'relationship': relationship,
      'is_primary': isPrimary,
      'notify_on_sos': true,
    });
  }

  Future<void> deleteContact(String id) async {
    await _client.from('emergency_contacts').delete().eq('id', id);
  }

  // ── Alertas ───────────────────────────────────────────────────────

  Stream<List<SosAlert>> watchMyAlerts() {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return const Stream.empty();
    return _client
        .from('emergency_alerts')
        .stream(primaryKey: ['id'])
        .eq('user_id', uid)
        .order('activated_at', ascending: false)
        .limit(20)
        .map((rows) => rows.map(SosAlert.fromJson).toList());
  }

  /// Activa um SOS: recolhe a posição actual e cria o alerta.
  /// Devolve o id do alerta criado (ou null se falhou).
  Future<String?> activate({
    required String? bloodType,
    required List<String> chronicConditions,
    required List<String> allergies,
    required String? city,
    required String? countryId,
    required String? anonymousPhone,
  }) async {
    Position? position;
    try {
      position = await Geolocator.getCurrentPosition(
        locationSettings:
            const LocationSettings(accuracy: LocationAccuracy.high),
      );
    } catch (_) {
      // Sem permissão/GPS — o alerta continua sem coordenadas.
    }

    final payload = <String, dynamic>{
      'location': position == null
          ? null
          : {
              'latitude': position.latitude,
              'longitude': position.longitude,
              'accuracy': position.accuracy,
            },
      'city': city,
      'country_id': countryId,
      'blood_type': bloodType,
      'chronic_conditions': chronicConditions,
      'allergies': allergies,
      'source': 'mobile_app',
      'device_info': {'platform': 'flutter'},
    };

    // 1) Edge Function oficial (notifica contactos).
    try {
      final res = await _client.functions.invoke('emergency-sos', body: {
        ...payload,
        'timestamp': DateTime.now().toUtc().toIso8601String(),
      });
      final data = res.data;
      if (data is Map && data['alert_id'] != null) {
        return data['alert_id'] as String;
      }
    } catch (_) {}

    // 2) Fallback: INSERT directo (RLS do próprio utilizador).
    try {
      final uid = _client.auth.currentUser?.id;
      final row = await _client
          .from('emergency_alerts')
          .insert({
            ...payload,
            if (uid != null) 'user_id': uid,
            if (uid == null && anonymousPhone != null)
              'anonymous_phone': anonymousPhone,
          })
          .select('id')
          .single();
      return row['id'] as String?;
    } catch (_) {
      return null;
    }
  }

  Future<void> cancel(String alertId) async {
    await _client
        .from('emergency_alerts')
        .update({
          'status': 'cancelled',
          'resolved_at': DateTime.now().toUtc().toIso8601String(),
        })
        .eq('id', alertId);
  }
}
