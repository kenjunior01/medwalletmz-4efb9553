import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/booking_models.dart';

/// Agendamento de consultas.
///
/// Fluxo principal (paridade com a web): o paciente escolhe um slot de
/// `doctor_availability_slots` e chama o RPC transacional
/// `book_consultation_atomic(_slot_id, _reason)` — que marca o slot,
/// cria a consulta e debita a carteira de forma atómica (rollback
/// automático se o saldo for insuficiente).
/// Fallback: se o médico não tiver slots publicados, mantém-se a criação
/// directa em `consultations` (pagamento posterior na confirmação).
class BookingsRepository {
  BookingsRepository(this._client);

  final SupabaseClient _client;

  /// Minhas consultas (como paciente), mais próxima primeiro.
  Stream<List<Consultation>> watchMyConsultations(String patientId) => _client
      .from('consultations')
      .stream(primaryKey: ['id'])
      .eq('patient_id', patientId)
      .order('scheduled_at')
      .map((rows) => rows.map(Consultation.fromJson).toList());

  /// Slots livres do médico (futuros), ordenados por início.
  Future<List<DoctorSlotOption>> fetchAvailableSlots(String doctorId) async {
    final rows = await _client
        .from('doctor_availability_slots')
        .select()
        .eq('doctor_id', doctorId)
        .eq('is_booked', false)
        .gte('starts_at', DateTime.now().toUtc().toIso8601String())
        .order('starts_at')
        .limit(300);
    return rows.map(DoctorSlotOption.fromJson).toList();
  }

  /// Agendar via slot com o RPC transacional do backend.
  ///
  /// Devolve o `consultation_id`. Lança [BookingException] com mensagem
  /// amigável quando o slot já foi tomado ou o saldo é insuficiente.
  Future<String> bookViaSlot(String slotId, String? reason) async {
    try {
      final res = await _client.rpc(
        'book_consultation_atomic',
        params: {
          '_slot_id': slotId,
          '_reason': (reason == null || reason.trim().isEmpty) ? null : reason.trim(),
        },
      );
      if (res is Map && res['consultation_id'] != null) {
        return res['consultation_id'].toString();
      }
      return '';
    } on PostgrestException catch (e) {
      throw BookingException(_friendly(e.message));
    } catch (_) {
      throw BookingException('Falha de rede. Tenta de novo.');
    }
  }

  String _friendly(String raw) {
    if (raw.contains('slot_unavailable')) {
      return 'Este horário acaba de ser reservado por outra pessoa. Escolhe outro.';
    }
    if (raw.contains('insufficient') ||
        raw.contains('balance') ||
        raw.contains('Insufficient')) {
      return 'Saldo insuficiente na carteira. Deposita primeiro e tenta de novo.';
    }
    return 'Não foi possível agendar. Tenta outro horário.';
  }

  /// Agendar sem slots (fallback — cria linha em `consultations`).
  Future<void> createConsultation({
    required String patientId,
    required String doctorId,
    required DateTime scheduledAt,
    String? reason,
    required double fee,
  }) async {
    await _client.from('consultations').insert({
      'patient_id': patientId,
      'doctor_id': doctorId,
      'scheduled_at': scheduledAt.toUtc().toIso8601String(),
      'duration_minutes': 30,
      'consultation_type': 'chat',
      'fee': fee,
      if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
    });
  }

  /// Cancelar (RLS permite patient ou doctor) e libertar o slot
  /// associado — mesmo comportamento do cancelamento da web.
  Future<void> cancel(String consultationId) async {
    await _client
        .from('consultations')
        .update({'status': 'cancelled'}).eq('id', consultationId);
    try {
      await _client
          .from('doctor_availability_slots')
          .update({'is_booked': false, 'consultation_id': null})
          .eq('consultation_id', consultationId);
    } catch (_) {
      // a libertação do slot é best-effort (pode não existir slot)
    }
  }

  /// Avaliação (tabela `doctor_reviews` — UNIQUE por consulta).
  Future<void> submitReview({
    required String consultationId,
    required String doctorId,
    required String patientId,
    required int rating,
    String? comment,
  }) =>
      _client.from('doctor_reviews').upsert({
        'consultation_id': consultationId,
        'doctor_id': doctorId,
        'patient_id': patientId,
        'rating': rating.clamp(1, 5),
        if (comment != null && comment.trim().isNotEmpty)
          'comment': comment.trim(),
      }, onConflict: 'consultation_id');

  /// Já avaliou esta consulta?
  Future<bool> hasReview(String consultationId) async {
    try {
      final rows = await _client
          .from('doctor_reviews')
          .select('id')
          .eq('consultation_id', consultationId)
          .limit(1);
      return rows.isNotEmpty;
    } catch (_) {
      return false;
    }
  }
}

/// Slot apresentado na folha de agendamento.
class DoctorSlotOption {
  const DoctorSlotOption({required this.id, required this.startsAt});

  final String id;
  final DateTime startsAt;

  factory DoctorSlotOption.fromJson(Map<String, dynamic> j) =>
      DoctorSlotOption(
        id: j['id'] as String,
        startsAt: DateTime.tryParse(j['starts_at']?.toString() ?? '') ??
            DateTime.now(),
      );
}

/// Erro de agendamento com mensagem já pronta para o utilizador.
class BookingException implements Exception {
  BookingException(this.message);

  final String message;

  @override
  String toString() => message;
}
