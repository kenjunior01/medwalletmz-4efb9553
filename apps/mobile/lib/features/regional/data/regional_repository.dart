import 'package:supabase_flutter/supabase_flutter.dart';

import '../../earn/data/proposal_models.dart';
import 'regional_models.dart';

/// Painel do gestor regional — países geridos (user_roles +
/// country_management), propostas pendentes do país (RLS via
/// `is_manager_of_country`), aprovação/rejeição via RPCs oficiais e
/// KPIs/metas regionais.
class RegionalRepository {
  RegionalRepository(this._client);

  final SupabaseClient _client;

  // ── Acesso ────────────────────────────────────────────────────────

  /// Países geridos pelo utilizador. Admin global (country_id nulo) tem
  /// acesso a todos — devolve null nesse caso.
  Future<Set<String>?> myManagedCountries(String uid) async {
    final managed = <String>{};

    try {
      final rows = await _client
          .from('user_roles')
          .select('role, country_id')
          .eq('user_id', uid);
      for (final r in rows) {
        final role = (r['role'] ?? '') as String;
        final countryId = r['country_id'] as String?;
        if (managerRoles.contains(role)) {
          if (countryId == null && role == 'admin') return null; // global
          if (countryId != null) managed.add(countryId);
        }
      }
    } catch (_) {}

    try {
      final rows = await _client
          .from('country_management')
          .select('country_id')
          .eq('user_id', uid);
      for (final r in rows) {
        final id = r['country_id'] as String?;
        if (id != null) managed.add(id);
      }
    } catch (_) {}

    return managed;
  }

  /// Lista de países (nome, moeda…) para os seletores.
  Future<List<CountryLite>> fetchCountries() async {
    try {
      final rows = await _client
          .from('countries')
          .select('id, name, currency_code, currency_symbol, phone_code, '
              'phone_prefix, flag_url')
          .eq('is_active', true)
          .order('name');
      return rows.map(CountryLite.fromJson).toList();
    } catch (_) {
      return const [];
    }
  }

  // ── Propostas (delega no repositório de crowdsourcing) ────────────

  Stream<List<PlaceProposal>> watchPending(String countryId) =>
      _client
          .from('place_proposals')
          .stream(primaryKey: ['id'])
          .eq('country_id', countryId)
          .eq('status', 'pending')
          .order('created_at', ascending: false)
          .limit(60)
          .map((rows) => rows.map(PlaceProposal.fromJson).toList());

  Future<Map<String, dynamic>> approve(String proposalId) async {
    final res = await _client.rpc(
      'approve_proposal',
      params: {'p_id': proposalId},
    );
    if (res is Map) return Map<String, dynamic>.from(res);
    return const {'ok': true};
  }

  Future<void> reject(String proposalId, String? notes) async {
    await _client.rpc(
      'reject_proposal',
      params: {'p_id': proposalId, 'p_notes': notes},
    );
  }

  // ── KPIs e metas ──────────────────────────────────────────────────

  Future<List<RegionalKpi>> fetchKpis(String countryCode) async {
    try {
      final rows = await _client
          .from('regional_kpis')
          .select()
          .eq('country_code', countryCode)
          .order('recorded_at', ascending: false)
          .limit(60);
      return rows.map(RegionalKpi.fromJson).toList();
    } catch (_) {
      return const [];
    }
  }

  Future<List<RegionalGoal>> fetchGoals(String countryCode) async {
    try {
      final rows = await _client
          .from('regional_goals')
          .select()
          .eq('country_code', countryCode)
          .order('quarter', ascending: false);
      return rows.map(RegionalGoal.fromJson).toList();
    } catch (_) {
      return const [];
    }
  }
}
