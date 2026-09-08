import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/prescription_models.dart';

/// Receitas — `prescriptions` + `prescription_items`. RLS existente:
/// paciente e médico leem; médico (doctor_id = auth.uid) cria.
class PrescriptionRepository {
  PrescriptionRepository(this._client);

  final SupabaseClient _client;

  /// Receitas recebidas (paciente) ou emitidas (médico), recentes 1.º.
  Stream<List<Prescription>> watchPrescriptions(String uid,
      {required bool asDoctor}) =>
      _client
          .from('prescriptions')
          .stream(primaryKey: ['id'])
          .eq(asDoctor ? 'doctor_id' : 'patient_id', uid)
          .order('created_at', ascending: false)
          .map((rows) => rows.map(Prescription.fromJson).toList());

  /// Itens de várias receitas numa única consulta.
  Future<List<PrescriptionItem>> fetchItems(List<String> ids) async {
    if (ids.isEmpty) return const [];
    try {
      final rows = await _client
          .from('prescription_items')
          .select()
          .inFilter('prescription_id', ids);
      return rows.map(PrescriptionItem.fromJson).toList();
    } catch (_) {
      return const [];
    }
  }

  /// Criação de receita pelo especialista (chat da consulta) —
  /// INSERT autorizado pela política `doctor_id = auth.uid()`.
  /// Devolve o código de verificação gerado pelo trigger.
  Future<String?> createPrescription({
    required String patientId,
    required String consultationId,
    String? notes,
    required List<PrescriptionItemDraft> items,
  }) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) throw AuthException('Sessão inexistente');

    final row = await _client.from('prescriptions').insert({
      'patient_id': patientId,
      'doctor_id': uid,
      'consultation_id': consultationId,
      if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
    }).select('id, verification_code').single();

    final prescriptionId = row['id'] as String;
    await _client.from('prescription_items').insert([
      for (final item in items)
        {
          'prescription_id': prescriptionId,
          'medication_name': item.medicationName,
          if (item.dosage != null && item.dosage!.isNotEmpty)
            'dosage': item.dosage,
          if (item.frequency != null && item.frequency!.isNotEmpty)
            'frequency': item.frequency,
          if (item.duration != null && item.duration!.isNotEmpty)
            'duration': item.duration,
          if (item.instructions != null && item.instructions!.isNotEmpty)
            'instructions': item.instructions,
        }
    ]);

    // Notifica o paciente no chat da consulta.
    await sendMessage(
      consultationId,
      message:
          'Receita emitida (${items.length} medicamento(s)). Código de '
          'verificação: ${row['verification_code'] ?? prescriptionId}.',
    );

    return row['verification_code'] as String?;
  }

  /// Mensagem de sistema no chat (usada ao emitir receita).
  Future<void> sendMessage(String consultationId,
      {required String message}) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return;
    await _client.from('consultation_messages').insert({
      'consultation_id': consultationId,
      'sender_id': uid,
      'message': message,
    });
  }
}

/// Rascunho de item usado no compositor de receitas.
class PrescriptionItemDraft {
  const PrescriptionItemDraft({
    required this.medicationName,
    this.dosage,
    this.frequency,
    this.duration,
    this.instructions,
  });

  final String medicationName;
  final String? dosage;
  final String? frequency;
  final String? duration;
  final String? instructions;
}
