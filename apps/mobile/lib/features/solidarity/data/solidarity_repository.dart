import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Solidariedade MedWallet — MESMAS tabelas da versão web:
///   • pedidos de apoio médico → `medical_aid_requests`
///     (status pending → approved/rejected; verificação admin)
///   • doações                 → `medical_aid_donations`
///     (trigger `update_aid_collected_amount` soma o valor arrecadado
///      quando a doação é marcada 'completed' pelo backend).
/// Doar por M-Pesa/e-Mola mostra as instruções de transferência; doar pela
/// carteira usa a RPC oficial `wallet_debit` e cria a doação já 'completed'.
class AidRequest {
  const AidRequest({
    required this.id,
    required this.title,
    required this.patientName,
    required this.conditionDescription,
    required this.hospitalName,
    required this.goalAmount,
    required this.collectedAmount,
    required this.createdAt,
    required this.urgencyLevel,
    required this.isVerified,
    this.patientAge,
    this.treatingDoctor,
    this.contactPhone,
    this.imageUrl,
    this.status = 'approved',
    this.isMine = false,
  });

  final String id;
  final String title;
  final String patientName;
  final String conditionDescription;
  final String hospitalName;
  final double goalAmount;
  final double collectedAmount;
  final DateTime createdAt;
  final String urgencyLevel; // normal | urgent | critical
  final bool isVerified;
  final int? patientAge;
  final String? treatingDoctor;
  final String? contactPhone;
  final String? imageUrl;
  final String status;
  final bool isMine;

  double get progress =>
      goalAmount <= 0 ? 0 : (collectedAmount / goalAmount).clamp(0, 1);
  double get remaining =>
      (goalAmount - collectedAmount).clamp(0, double.infinity);
  bool get isCritical => urgencyLevel == 'critical';

  String get urgencyLabel {
    switch (urgencyLevel) {
      case 'critical':
        return 'Crítico';
      case 'urgent':
        return 'Urgente';
      default:
        return 'Normal';
    }
  }

  factory AidRequest.fromJson(Map<String, dynamic> j, {String? myId}) =>
      AidRequest(
        id: j['id'] as String,
        title: (j['title'] ?? 'Pedido de apoio') as String,
        patientName: (j['patient_name'] ?? 'Paciente') as String,
        conditionDescription:
            (j['condition_description'] ?? '') as String,
        hospitalName: (j['hospital_name'] ?? '—') as String,
        goalAmount: double.tryParse(j['goal_amount_mzn']?.toString() ?? '') ?? 0,
        collectedAmount:
            double.tryParse(j['collected_amount_mzn']?.toString() ?? '') ?? 0,
        createdAt:
            DateTime.tryParse(j['created_at']?.toString() ?? '') ??
                DateTime.now(),
        urgencyLevel: (j['urgency_level'] ?? 'normal') as String,
        isVerified: j['is_verified'] as bool? ?? false,
        patientAge: (j['patient_age'] as num?)?.toInt(),
        treatingDoctor: j['treating_doctor'] as String?,
        contactPhone: j['contact_phone'] as String?,
        imageUrl: j['image_url'] as String?,
        status: (j['status'] ?? 'approved') as String,
        isMine: myId != null && j['user_id'] == myId,
      );
}

class SolidarityRepository {
  SolidarityRepository(this._client);

  final SupabaseClient _client;

  String? get _uid => _client.auth.currentUser?.id;

  /// Pedidos aprovados (públicos) + os meus (mesmo pending) — igual ao web.
  Future<List<AidRequest>> fetchRequests() async {
    final uid = _uid;
    try {
      final rows = await _client
          .from('medical_aid_requests')
          .select()
          .order('created_at', ascending: false)
          .limit(40);
      return [
        for (final r in (rows as List))
          AidRequest.fromJson((r as Map).cast<String, dynamic>(), myId: uid),
      ].where((r) => r.status == 'approved' || r.isMine).toList();
    } catch (_) {
      return const [];
    }
  }

  /// Submete um novo pedido (entra em 'pending' para verificação admin).
  Future<String?> createRequest({
    required String title,
    required String patientName,
    int? patientAge,
    required String conditionDescription,
    required String hospitalName,
    String? treatingDoctor,
    String urgencyLevel = 'normal',
    required double goalAmount,
    String? contactPhone,
  }) async {
    final uid = _uid;
    if (uid == null) return 'Sessão expirada. Entra novamente.';
    if (goalAmount <= 0) return 'Indica um valor de meta válido.';
    try {
      await _client.from('medical_aid_requests').insert({
        'user_id': uid,
        'title': title,
        'patient_name': patientName,
        if (patientAge != null) 'patient_age': patientAge,
        'condition_description': conditionDescription,
        'hospital_name': hospitalName,
        if (treatingDoctor != null && treatingDoctor.isNotEmpty)
          'treating_doctor': treatingDoctor,
        'urgency_level': urgencyLevel,
        'goal_amount_mzn': goalAmount,
        if (contactPhone != null && contactPhone.isNotEmpty)
          'contact_phone': contactPhone,
        'status': 'pending',
      });
      return null;
    } catch (_) {
      return 'Não foi possível submeter o pedido. Tenta novamente.';
    }
  }

  /// Registra uma doação.
  ///
  /// • method 'wallet' → debita via RPC `wallet_debit` (service_type
  ///   'solidarity') e marca a doação 'completed' (o trigger soma o valor).
  /// • method 'mpesa'/'emola' → doação 'pending' com instruções de
  ///   transferência; a confirmação admin actualiza o total arrecadado.
  Future<String?> donate({
    required AidRequest request,
    required double amount,
    required String method, // wallet | mpesa | emola
    String? donorName,
    String? message,
  }) async {
    final uid = _uid;
    if (uid == null) return 'Sessão expirada. Entra novamente.';
    if (amount <= 0) return 'Indica um valor de doação válido.';
    try {
      if (method == 'wallet') {
        final donation = await _client
            .from('medical_aid_donations')
            .insert({
              'request_id': request.id,
              'user_id': uid,
              'amount_mzn': amount,
              'donor_name':
                  (donorName == null || donorName.trim().isEmpty)
                      ? 'Anónimo'
                      : donorName.trim(),
              'message': message,
              'payment_method': 'wallet',
              'status': 'completed',
            })
            .select('id')
            .single();
        final donationId = (donation as Map)['id'] as String;
        await _client.rpc('wallet_debit', params: {
          '_user_id': uid,
          '_amount': amount,
          '_service_type': 'solidarity',
          '_ref_id': donationId,
          '_description': 'Doação solidária — ${request.title}',
        });
        return null;
      }
      // M-Pesa / e-Mola: doação pendente de confirmação admin.
      await _client.from('medical_aid_donations').insert({
        'request_id': request.id,
        'user_id': uid,
        'amount_mzn': amount,
        'donor_name': (donorName == null || donorName.trim().isEmpty)
            ? 'Anónimo'
            : donorName.trim(),
        'message': message,
        'payment_method': method,
        'status': 'pending',
      });
      return null;
    } catch (e) {
      final msg = e.toString();
      if (msg.contains('Saldo insuficiente')) {
        return 'Saldo insuficiente na carteira. Carrega primeiro.';
      }
      return 'Não foi possível registar a doação. Tenta novamente.';
    }
  }
}

final solidarityRepositoryProvider = Provider<SolidarityRepository>((ref) {
  return SolidarityRepository(Supabase.instance.client);
});
