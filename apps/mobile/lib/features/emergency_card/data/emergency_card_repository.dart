import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// ── Ficha de Emergência — repositório ────────────────────────────────
///
/// Agrega os dados que um socorrista precisa em segundos: identidade,
/// tipo de sangue, alergias, condições crónicas, medicação actual e
/// contactos de emergência. Fontes (MESMA BD da web):
///
///   • `profiles`            → full_name
///   • `patient_profiles`    → sangue, alergias, condições, medicação,
///                             contacto ICE (o mesmo que o SOS usa)
///   • `emergency_contacts`  → contactos registados no SOS
///
/// O resultado é CACHEADO em SharedPreferences. É esse cache que a
/// ficha lê quando a app está BLOQUEADA ou SEM INTERNET — o socorrista
/// vê a ficha mesmo que o dono esteja inconsciente ou sem rede.

/// Contacto de emergência (tabelas `emergency_contacts`/`patient_profiles`).
class IceContact {
  const IceContact({this.name, this.phone, this.relationship});

  final String? name;
  final String? phone;
  final String? relationship;

  bool get isEmpty =>
      (name == null || name!.isEmpty) && (phone == null || phone!.isEmpty);
}

/// Dados da ficha — tudo o que é mostrado no ecrã de emergência.
class EmergencyCardData {
  const EmergencyCardData({
    this.fullName,
    this.bloodType,
    this.dateOfBirth,
    this.gender,
    this.allergies = const [],
    this.chronicConditions = const [],
    this.currentMedications = const [],
    this.primaryContact,
    this.contacts = const [],
    required this.updatedAt,
  });

  final String? fullName;
  final String? bloodType;
  final DateTime? dateOfBirth;
  final String? gender;
  final List<String> allergies;
  final List<String> chronicConditions;
  final List<String> currentMedications;

  /// Contacto ICE do patient_profiles (campo simples nome+telefone).
  final IceContact? primaryContact;

  /// Contactos completos registados no SOS (emergency_contacts).
  final List<IceContact> contacts;

  final DateTime updatedAt;

  bool get isEmpty =>
      (fullName == null || fullName!.isEmpty) &&
      bloodType == null &&
      allergies.isEmpty &&
      chronicConditions.isEmpty &&
      currentMedications.isEmpty &&
      (primaryContact == null || primaryContact!.isEmpty) &&
      contacts.isEmpty;

  /// Idade calculada a partir da data de nascimento.
  int? get age {
    final d = dateOfBirth;
    if (d == null) return null;
    final now = DateTime.now();
    var a = now.year - d.year;
    if (now.month < d.month || (now.month == d.month && now.day < d.day)) a--;
    return a < 0 || a > 130 ? null : a;
  }

  Map<String, dynamic> toJson() => {
        'full_name': fullName,
        'blood_type': bloodType,
        'date_of_birth': dateOfBirth?.toIso8601String().substring(0, 10),
        'gender': gender,
        'allergies': allergies,
        'chronic_conditions': chronicConditions,
        'current_medications': currentMedications,
        'primary_contact':
            primaryContact == null ? null : _contactToJson(primaryContact!),
        'contacts': contacts.map(_contactToJson).toList(),
        'updated_at': updatedAt.toIso8601String(),
      };

  static Map<String, dynamic> _contactToJson(IceContact c) => {
        'name': c.name,
        'phone': c.phone,
        'relationship': c.relationship,
      };

  factory EmergencyCardData.fromJson(Map<String, dynamic> j) =>
      EmergencyCardData(
        fullName: j['full_name'] as String?,
        bloodType: j['blood_type'] as String?,
        dateOfBirth: j['date_of_birth'] == null
            ? null
            : DateTime.tryParse(j['date_of_birth'].toString()),
        gender: j['gender'] as String?,
        allergies: _strList(j['allergies']),
        chronicConditions: _strList(j['chronic_conditions']),
        currentMedications: _strList(j['current_medications']),
        primaryContact: j['primary_contact'] == null
            ? null
            : _contactFromJson(j['primary_contact'] as Map<String, dynamic>),
        contacts: ((j['contacts'] as List?) ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(_contactFromJson)
            .toList(),
        updatedAt:
            DateTime.tryParse(j['updated_at']?.toString() ?? '') ??
                DateTime.fromMillisecondsSinceEpoch(0),
      );

  static IceContact _contactFromJson(Map<String, dynamic> j) => IceContact(
        name: j['name'] as String?,
        phone: j['phone'] as String?,
        relationship: j['relationship'] as String?,
      );

  static List<String> _strList(Object? v) => v is List
      ? v.map((e) => e.toString()).where((s) => s.isNotEmpty).toList()
      : const [];

  /// Resumo textual codificado no QR (legível por qualquer leitor).
  String toQrText() {
    final b = StringBuffer('MEDWALLET MZ · FICHA DE EMERGÊNCIA\n');
    if (fullName != null && fullName!.isNotEmpty) b.writeln('Nome: $fullName');
    final a = age;
    if (a != null) b.write('Idade: $a');
    if (gender != null && gender!.isNotEmpty) {
      b.write(a != null ? ' · Sexo: $gender' : 'Sexo: $gender');
    }
    if (a != null || (gender != null && gender!.isNotEmpty)) b.writeln();
    if (bloodType != null && bloodType!.isNotEmpty) {
      b.writeln('Sangue: $bloodType');
    }
    if (allergies.isNotEmpty) b.writeln('Alergias: ${allergies.join(', ')}');
    if (chronicConditions.isNotEmpty) {
      b.writeln('Condições: ${chronicConditions.join(', ')}');
    }
    if (currentMedications.isNotEmpty) {
      b.writeln('Medicação: ${currentMedications.join(', ')}');
    }
    final c = _bestContact;
    if (c != null && c.phone != null && c.phone!.isNotEmpty) {
      b.write('Contacto emergência: ${c.name ?? ''} ${c.phone}');
    }
    return b.toString();
  }

  IceContact? get _bestContact {
    for (final c in contacts) {
      if (c.phone != null && c.phone!.isNotEmpty) return c;
    }
    if (primaryContact != null && primaryContact!.phone != null) {
      return primaryContact;
    }
    return null;
  }
}

class EmergencyCardRepository {
  EmergencyCardRepository._();
  static final EmergencyCardRepository instance = EmergencyCardRepository._();

  static const _cacheKey = 'emergency_card_cache';

  /// Busca os dados na BD e actualiza o cache local. Seguro chamar
  /// depois do login / gravação da ficha de saúde. Nunca lança —
  /// devolve os dados ou null (sem sessão/falha).
  Future<EmergencyCardData?> refresh() async {
    try {
      final client = Supabase.instance.client;
      final uid = client.auth.currentUser?.id;
      if (uid == null) return null;

      final results = await Future.wait([
        client.from('profiles').select('full_name').eq('user_id', uid).limit(1),
        client.from('patient_profiles').select().eq('user_id', uid).limit(1),
        client
            .from('emergency_contacts')
            .select('name,phone,relationship,is_primary,notify_on_sos')
            .eq('user_id', uid)
            .order('is_primary', ascending: false)
            .limit(5),
      ]);

      final profileRows = results[0] as List;
      final patientRows = results[1] as List;
      final contactRows = results[2] as List;

      final patient =
          patientRows.isEmpty ? null : patientRows.first as Map<String, dynamic>;

      List<String> strList(Object? v) => v is List
          ? v.map((e) => e.toString()).where((s) => s.isNotEmpty).toList()
          : const [];

      final data = EmergencyCardData(
        fullName: profileRows.isEmpty
            ? null
            : (profileRows.first as Map<String, dynamic>)['full_name']
                as String?,
        bloodType: patient?['blood_type'] as String?,
        dateOfBirth: patient?['date_of_birth'] == null
            ? null
            : DateTime.tryParse(patient!['date_of_birth'].toString()),
        gender: patient?['gender'] as String?,
        allergies: patient == null ? const [] : strList(patient['allergies']),
        chronicConditions: patient == null
            ? const []
            : strList(patient['chronic_conditions']),
        currentMedications:
            patient == null ? const [] : strList(patient['current_medications']),
        primaryContact: patient == null
            ? null
            : IceContact(
                name: patient['emergency_contact_name'] as String?,
                phone: patient['emergency_contact_phone'] as String?,
              ),
        contacts: contactRows
            .whereType<Map<String, dynamic>>()
            .map((r) => IceContact(
                  name: r['name'] as String?,
                  phone: r['phone'] as String?,
                  relationship: r['relationship'] as String?,
                ))
            .toList(),
        updatedAt: DateTime.now(),
      );

      await _writeCache(data);
      return data;
    } catch (_) {
      return null;
    }
  }

  /// Lê o cache local (funciona SEM internet e com a app BLOQUEADA).
  Future<EmergencyCardData?> fromCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_cacheKey);
      if (raw == null || raw.isEmpty) return null;
      return EmergencyCardData.fromJson(
          jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<void> _writeCache(EmergencyCardData data) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_cacheKey, jsonEncode(data.toJson()));
    } catch (_) {}
  }
}
