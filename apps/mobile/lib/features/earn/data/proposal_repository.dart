import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart';

import 'proposal_models.dart';

/// Crowdsourcing de instituições — tabela `place_proposals`.
///
/// Fluxo: contribuidor submete (INSERT autorizado pela RLS
/// "authenticated insert own") → fotos para o bucket público
/// `proposal-photos` ({user}/{proposal}/…) → triggers de BD preenchem
/// reward_amount/reward_currency → gestor regional aprova via RPC
/// `approve_proposal` → `wallet_credit` paga a recompensa.
class ProposalRepository {
  ProposalRepository(this._client);

  final SupabaseClient _client;

  static const _bucket = 'proposal-photos';

  /// As minhas submissões em tempo real.
  Stream<List<PlaceProposal>> watchMine(String uid) => _client
      .from('place_proposals')
      .stream(primaryKey: ['id'])
      .eq('proposed_by', uid)
      .order('created_at', ascending: false)
      .limit(80)
      .map((rows) => rows.map(PlaceProposal.fromJson).toList());

  /// Submete uma instituição e devolve o id criado. [photos] até 4
  /// imagens do exterior — a 1.ª vai para `image_url`, as restantes
  /// para `raw_payload.extra_photos` (URLs públicos do bucket).
  Future<String> submit({
    required String uid,
    required String entityType,
    required String name,
    required String city,
    required String countryId,
    String? address,
    String? neighborhood,
    String? referencePoint,
    String? phone,
    String? description,
    double? latitude,
    double? longitude,
    List<File> photos = const [],
    List<String> photoNames = const [],
  }) async {
    final row = await _client.from('place_proposals').insert({
      'source': 'user_submit',
      'entity_type': entityType,
      'name': name.trim(),
      'city': city.trim(),
      'country_id': countryId,
      if (address != null && address.trim().isNotEmpty)
        'address': address.trim(),
      if (neighborhood != null && neighborhood.trim().isNotEmpty)
        'neighborhood': neighborhood.trim(),
      if (referencePoint != null && referencePoint.trim().isNotEmpty)
        'reference_point': referencePoint.trim(),
      if (phone != null && phone.trim().isNotEmpty) 'phone': phone.trim(),
      if (description != null && description.trim().isNotEmpty)
        'description': description.trim(),
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      'proposed_by': uid,
    }).select('id').single();

    final proposalId = row['id'] as String;

    // Fotos — upload depois do INSERT para poder usar o id no caminho.
    if (photos.isNotEmpty) {
      final urls = <String>[];
      for (var i = 0; i < photos.length && i < 4; i++) {
        final file = photos[i];
        final raw = i < photoNames.length ? photoNames[i] : 'foto_$i.jpg';
        final safeName = raw.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_');
        final path = '$uid/$proposalId/'
            '${DateTime.now().millisecondsSinceEpoch}_${i}_$safeName';
        try {
          await _client.storage.from(_bucket).upload(path, file);
          urls.add(_client.storage.from(_bucket).getPublicUrl(path));
        } catch (_) {/* foto é best-effort — não falha a submissão */}
      }
      if (urls.isNotEmpty) {
        await _client.from('place_proposals').update({
          'image_url': urls.first,
          'raw_payload': {
            'extra_photos': urls.skip(1).toList(),
            'photo_count': urls.length,
            'submitted_from': 'flutter_app',
          },
        }).eq('id', proposalId);
      }
    }

    return proposalId;
  }

  /// Propostas pendentes de um país (para o painel do gestor regional).
  /// RLS permite via `is_manager_of_country(country_id)`.
  Stream<List<PlaceProposal>> watchPendingForCountry(String countryId) =>
      _client
          .from('place_proposals')
          .stream(primaryKey: ['id'])
          .eq('country_id', countryId)
          .eq('status', 'pending')
          .order('created_at', ascending: false)
          .limit(60)
          .map((rows) => rows.map(PlaceProposal.fromJson).toList());

  /// Aprova (RPC oficial — paga a recompensa e publica a instituição).
  Future<Map<String, dynamic>> approve(String proposalId) async {
    final res = await _client.rpc(
      'approve_proposal',
      params: {'p_id': proposalId},
    );
    if (res is Map) return Map<String, dynamic>.from(res);
    return const {'ok': true};
  }

  /// Rejeita com nota (RPC oficial).
  Future<void> reject(String proposalId, String? notes) async {
    await _client.rpc(
      'reject_proposal',
      params: {'p_id': proposalId, 'p_notes': notes},
    );
  }
}
