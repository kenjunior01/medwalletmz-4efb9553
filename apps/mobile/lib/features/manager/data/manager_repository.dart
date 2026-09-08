import 'package:supabase_flutter/supabase_flutter.dart';

import '../../earn/data/proposal_models.dart';
import '../../regional/data/regional_models.dart';
import 'manager_models.dart';

/// Repositório da suite de gestão — cobre o painel do Gestor Global
/// (admin) e as consolas dos Gestores Regionais/País. Todas as
/// operações respeitam a RLS existente; falhas de permissão degradam
/// graciosamente (secção vazia com aviso) em vez de crashar.
class ManagerRepository {
  ManagerRepository(this._client);

  final SupabaseClient _client;

  SupabaseClient get client => _client;

  // ── Acesso ────────────────────────────────────────────────────────

  /// true se o utilizador actual é admin global (RPC oficial).
  Future<bool> isGlobalAdmin() async {
    try {
      final res = await _client.rpc('is_global_admin');
      return res == true;
    } catch (_) {
      return false;
    }
  }

  /// Países geridos: null = global (admin), vazio = sem acesso.
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
          if (countryId == null && role == 'admin') return null;
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

  Future<List<CountryFull>> fetchCountries({String? only}) async {
    try {
      var q = _client.from('countries').select('*').eq('is_active', true);
      if (only != null) q = q.eq('id', only);
      final rows = await q.order('name');
      return rows.map(CountryFull.fromJson).toList();
    } catch (_) {
      return const [];
    }
  }

  // ── Estatísticas por país (counts head:true) ─────────────────────

  Future<int> _count(Future<int> Function() fn) async {
    try {
      return await fn();
    } catch (_) {
      return 0;
    }
  }

  Future<CountryStats> fetchStats(String countryId) async {
    final c = <String, int>{};
    await Future.wait([
      _count(() async => c['users'] = await _tableCount(
          'profiles', (q) => q.eq('country_id', countryId))),
      _count(() async => c['stores'] = await _tableCount(
          'stores', (q) => q.eq('country_id', countryId))),
      _count(() async => c['clinics'] = await _tableCount(
          'clinics', (q) => q.eq('country_id', countryId))),
      _count(() async => c['veterinaries'] = await _tableCount(
          'veterinary_clinics', (q) => q.eq('country_id', countryId))),
      _count(() async => c['consultations'] = await _tableCount(
          'consultations', (q) => q.eq('country_id', countryId))),
      _count(() async => c['triages'] = await _tableCount(
          'triage_logs', (q) => q.eq('country_id', countryId))),
      _count(() async => c['pendingProposals'] = await _tableCount(
          'place_proposals',
          (q) => q.eq('country_id', countryId).eq('status', 'pending'))),
      _count(() async => c['approvedProposals'] = await _tableCount(
          'place_proposals',
          (q) => q.eq('country_id', countryId).eq('status', 'approved'))),
      _count(() async => c['pendingPayments'] = await _tableCount(
          'mpesa_manual_payments', (q) => q.eq('status', 'pending'))),
      _count(() async => c['activeSos'] = await _tableCount(
          'emergency_alerts', (q) => q.eq('status', 'active'))),
    ]);
    return CountryStats.fromCounts(countryId, c);
  }

  Future<int> _tableCount(
    String table,
    PostgrestFilterBuilder Function(PostgrestFilterBuilder) f,
  ) async {
    final res =
        await f(_client.from(table).select('id')).count(CountOption.exact);
    return res.count;
  }

  /// Agregado global — stats de todos os países (admin).
  Future<Map<String, CountryStats>> fetchGlobalStats(
      List<CountryFull> countries) async {
    final out = <String, CountryStats>{};
    const batch = 5;
    for (var i = 0; i < countries.length; i += batch) {
      final slice = countries.skip(i).take(batch).toList();
      final results = await Future.wait(
          slice.map((c) => fetchStats(c.id)));
      for (final s in results) {
        out[s.countryId] = s;
      }
    }
    return out;
  }

  // ── Instituições ──────────────────────────────────────────────────

  Future<List<InstitutionRow>> fetchInstitutions(String countryId) async {
    final out = <InstitutionRow>[];
    try {
      final rows = await _client
          .from('stores')
          .select('id, name, type, city, address, phone, is_active, '
              'latitude, longitude, created_at')
          .eq('country_id', countryId)
          .order('name')
          .limit(300);
      out.addAll(rows.map((j) => InstitutionRow.fromJson('stores', j)));
    } catch (_) {}
    try {
      final rows = await _client
          .from('clinics')
          .select('id, name, type, city, address, phone, is_active, '
              'is_verified, latitude, longitude, created_at')
          .eq('country_id', countryId)
          .order('name')
          .limit(300);
      out.addAll(rows.map((j) => InstitutionRow.fromJson('clinics', j)));
    } catch (_) {}
    try {
      final rows = await _client
          .from('veterinary_clinics')
          .select('id, name, type, city, address, phone, is_active, '
              'latitude, longitude, created_at')
          .eq('country_id', countryId)
          .order('name')
          .limit(300);
      out.addAll(
          rows.map((j) => InstitutionRow.fromJson('veterinary_clinics', j)));
    } catch (_) {}
    return out;
  }

  Future<void> setInstitutionActive(
      String source, String id, bool active) async {
    await _client.from(source).update({'is_active': active}).eq('id', id);
  }

  Future<void> verifyInstitution(String source, String id) async {
    if (source == 'stores') return; // stores não tem is_verified
    await _client.from(source).update({'is_verified': true}).eq('id', id);
  }

  // ── Submissões (crowdsourcing) ────────────────────────────────────

  Stream<List<PlaceProposal>> watchProposals(
      String countryId, {required bool onlyPending}) {
    var q = _client
        .from('place_proposals')
        .stream(primaryKey: ['id'])
        .eq('country_id', countryId);
    if (onlyPending) {
      q = q.inFilter('status', ['pending', 'in_review']);
    }
    return q
        .order('created_at', ascending: false)
        .limit(80)
        .map((rows) => rows.map(PlaceProposal.fromJson).toList());
  }

  Future<Map<String, dynamic>> approve(String proposalId) async {
    final res = await _client.rpc('approve_proposal',
        params: {'p_id': proposalId});
    if (res is Map) return Map<String, dynamic>.from(res);
    return const {'ok': true};
  }

  Future<void> reject(String proposalId, String? notes) async {
    await _client.rpc('reject_proposal',
        params: {'p_id': proposalId, 'p_notes': notes});
  }

  // ── Pagamentos manuais M-Pesa ─────────────────────────────────────

  Future<List<PendingPayment>> fetchPayments({String? status}) async {
    try {
      var q = _client
          .from('mpesa_manual_payments')
          .select('id, reference, amount_mzn, status, payer_name, '
              'payer_phone, mpesa_transaction_id, description, '
              'confirmed_at, created_at');
      if (status != null) q = q.eq('status', status);
      final rows = await q.order('created_at', ascending: false).limit(80);
      return rows.map(PendingPayment.fromJson).toList();
    } catch (_) {
      return const [];
    }
  }

  Future<Map<String, dynamic>> confirmPayment(
      String id, String? mpesaTxId) async {
    final res = await _client.rpc('confirm_mpesa_payment', params: {
      '_id': id,
      if (mpesaTxId != null && mpesaTxId.isNotEmpty) '_mpesa_tx_id': mpesaTxId,
    });
    if (res is Map) return Map<String, dynamic>.from(res);
    return const {'ok': true};
  }

  Future<void> rejectPayment(String id) async {
    await _client
        .from('mpesa_manual_payments')
        .update({'status': 'rejected'}).eq('id', id);
  }

  // ── Utilizadores (RPC oficial da gestão) ──────────────────────────

  Future<List<ManagerUserRow>> fetchUsers(String? countryId) async {
    try {
      final rows = await (_client
              .rpc('list_profiles_admin_full',
                  params:
                      countryId == null ? {} : {'p_country_id': countryId})
              .limit(200)) as List;
      return rows
          .map((j) =>
              ManagerUserRow.fromJson(Map<String, dynamic>.from(j as Map)))
          .toList();
    } catch (_) {
      return const [];
    }
  }

  // ── KPIs / Metas / Conteúdo / Ranking ─────────────────────────────

  Future<List<RegionalKpi>> fetchKpis(String countryCode) async {
    try {
      final rows = await _client
          .from('regional_kpis')
          .select()
          .eq('country_code', countryCode)
          .order('period_start', ascending: false)
          .limit(80);
      return rows.map(RegionalKpi.fromJson).toList();
    } catch (_) {
      return const [];
    }
  }

  /// Upsert de KPI (admin / regional_manager / regional_ceo).
  Future<void> upsertKpi({
    required String countryCode,
    required String kpiKey,
    required double value,
    required String unit,
    required DateTime periodStart,
    required DateTime periodEnd,
    double? target,
  }) async {
    await _client.from('regional_kpis').upsert({
      'country_code': countryCode,
      'kpi_key': kpiKey,
      'kpi_value': value,
      'kpi_unit': unit,
      'period_start': periodStart.toIso8601String().substring(0, 10),
      'period_end': periodEnd.toIso8601String().substring(0, 10),
      if (target != null) 'target_value': target,
      'source': 'manager_app',
    }, onConflict: 'country_code,kpi_key,period_start');
  }

  Future<List<RegionalGoal>> fetchGoals(String countryCode) async {
    try {
      final rows = await _client
          .from('regional_goals')
          .select()
          .eq('country_code', countryCode)
          .order('quarter', ascending: false)
          .limit(60);
      return rows.map(RegionalGoal.fromJson).toList();
    } catch (_) {
      return const [];
    }
  }

  Future<void> upsertGoal({
    required String countryCode,
    required String quarter,
    required String goalKey,
    required double goalValue,
    String? unit,
  }) async {
    await _client.from('regional_goals').upsert({
      'country_code': countryCode,
      'quarter': quarter,
      'goal_key': goalKey,
      'goal_value': goalValue,
      if (unit != null) 'goal_unit': unit,
    }, onConflict: 'country_code,quarter,goal_key');
  }

  Future<List<RegionalContentItem>> fetchContent(String countryCode) async {
    try {
      final rows = await _client
          .from('regional_content')
          .select()
          .eq('country_code', countryCode)
          .order('created_at', ascending: false)
          .limit(50);
      return rows.map(RegionalContentItem.fromJson).toList();
    } catch (_) {
      return const [];
    }
  }

  /// Cria um banner/conteúdo regional. Usa o RPC
  /// `create_regional_content_safe` (valida permissão + limite de
  /// itens activos) e cai para inserção directa se o RPC ainda não
  /// existir na base.
  Future<void> createContent({
    required String countryCode,
    required String contentType,
    required String title,
    String? description,
    String? imageUrl,
    String? accentColor,
    String? ctaLabel,
    String? ctaUrl,
    bool isPinned = false,
    DateTime? startsAt,
    DateTime? endsAt,
    List<String> audienceTags = const [],
  }) async {
    try {
      await _client.rpc('create_regional_content_safe', params: {
        'p_country_code': countryCode,
        'p_content_type': contentType,
        'p_title': title,
        if (description != null && description.isNotEmpty)
          'p_description': description,
        if (imageUrl != null && imageUrl.isNotEmpty)
          'p_image_url': imageUrl,
        if (accentColor != null && accentColor.isNotEmpty)
          'p_accent_color': accentColor,
        if (ctaLabel != null && ctaLabel.isNotEmpty)
          'p_cta_label': ctaLabel,
        if (ctaUrl != null && ctaUrl.isNotEmpty) 'p_cta_url': ctaUrl,
        'p_is_pinned': isPinned,
        if (startsAt != null) 'p_starts_at': startsAt.toIso8601String(),
        if (endsAt != null) 'p_ends_at': endsAt.toIso8601String(),
        if (audienceTags.isNotEmpty) 'p_audience_tags': audienceTags,
      });
    } catch (_) {
      // Fallback: inserção directa (a RLS de regional_content decide).
      await _client.from('regional_content').insert({
        'country_code': countryCode,
        'content_type': contentType,
        'title': title,
        if (description != null && description.isNotEmpty)
          'description': description,
        if (imageUrl != null && imageUrl.isNotEmpty) 'image_url': imageUrl,
        if (accentColor != null && accentColor.isNotEmpty)
          'accent_color': accentColor,
        if (ctaLabel != null && ctaLabel.isNotEmpty) 'cta_label': ctaLabel,
        if (ctaUrl != null && ctaUrl.isNotEmpty) 'cta_url': ctaUrl,
        'is_pinned': isPinned,
        if (startsAt != null) 'starts_at': startsAt.toIso8601String(),
        if (endsAt != null) 'ends_at': endsAt.toIso8601String(),
        if (audienceTags.isNotEmpty) 'audience_tags': audienceTags,
      });
    }
  }

  Future<void> setContentActive(String id, bool active) async {
    await _client
        .from('regional_content')
        .update({'is_active': active}).eq('id', id);
  }

  Future<List<RegionalRankingRow>> fetchRankings() async {
    try {
      final rows = await _client
          .from('regional_rankings')
          .select()
          .order('period', ascending: false)
          .limit(60);
      return rows.map(RegionalRankingRow.fromJson).toList();
    } catch (_) {
      return const [];
    }
  }

  // ── Permissões & Limites (Centro de Controlo) ───────────────────

  /// Permissões efectivas do utilizador actual (RPC
  /// `my_manager_permissions`). null = RPC indisponível (migration
  /// ainda não aplicada) — a UI degrada para "acesso completo local".
  Future<Map<String, dynamic>?> fetchMyPermissions() async {
    try {
      final res = await _client.rpc('my_manager_permissions');
      if (res is Map) return Map<String, dynamic>.from(res);
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Upsert de permissões/limites de um gestor (só admin global).
  Future<void> upsertManagerPermissions({
    required String userId,
    String? countryId,
    Map<String, bool> permissions = const {},
    int? dailyApprovalLimit,
    int? maxActiveContent,
    String? notes,
  }) async {
    await _client.rpc('upsert_manager_permissions', params: {
      'p_user_id': userId,
      if (countryId != null) 'p_country_id': countryId,
      'p_permissions': permissions,
      if (dailyApprovalLimit != null)
        'p_daily_approval_limit': dailyApprovalLimit,
      if (maxActiveContent != null) 'p_max_active_content': maxActiveContent,
      if (notes != null) 'p_notes': notes,
    });
  }

  /// Linha bruta de permissões de um gestor (admin lê qualquer;
  /// gestor lê apenas a própria).
  Future<Map<String, dynamic>?> fetchManagerPermissions(
      String userId) async {
    try {
      final rows = await _client
          .from('manager_permissions')
          .select()
          .eq('user_id', userId)
          .limit(1);
      if (rows.isEmpty) return null;
      return Map<String, dynamic>.from(rows.first);
    } catch (_) {
      return null;
    }
  }

  /// Aprovações feitas pelo utilizador hoje (RPC
  /// `manager_approvals_today`) — alimenta o widget de limite diário.
  Future<int> approvalsToday() async {
    try {
      final res = await _client.rpc('manager_approvals_today');
      if (res is num) return res.toInt();
      return 0;
    } catch (_) {
      return 0;
    }
  }

  // ── Configuração do país (comissões + branding) ───────────────────

  Future<void> updateCountryConfig(
    String countryId, {
    Map<String, dynamic>? commissionRates,
    Map<String, dynamic>? branding,
  }) async {
    final patch = <String, dynamic>{
      if (commissionRates != null) 'commission_rates': commissionRates,
      if (branding != null) 'branding_config': branding,
    };
    if (patch.isEmpty) return;
    await _client.from('countries').update(patch).eq('id', countryId);
  }

  // ── Equipa de gestão (admin) ──────────────────────────────────────

  Future<List<ManagerAssignment>> fetchAssignments(String? countryId) async {
    final out = <ManagerAssignment>[];
    try {
      var q = _client.from('country_management').select('user_id, '
          'country_id, permissions');
      if (countryId != null) q = q.eq('country_id', countryId);
      final rows = await q.limit(100);
      for (final r in rows) {
        out.add(ManagerAssignment(
          userId: r['user_id'] as String,
          countryId: r['country_id'] as String,
          roleLabel: 'Gestor de País',
        ));
      }
    } catch (_) {}
    try {
      var q = _client
          .from('user_roles')
          .select('user_id, country_id, role')
          .inFilter('role', managerRoles);
      if (countryId != null) q = q.eq('country_id', countryId);
      final rows = await q.limit(100);
      for (final r in rows) {
        final role = (r['role'] ?? '') as String;
        final cid = r['country_id'] as String?;
        if (cid == null && role == 'admin') {
          out.add(ManagerAssignment(
              userId: r['user_id'] as String,
              countryId: '*',
              roleLabel: managerRoleLabel(role)));
        } else if (cid != null) {
          out.add(ManagerAssignment(
              userId: r['user_id'] as String,
              countryId: cid,
              roleLabel: managerRoleLabel(role)));
        }
      }
    } catch (_) {}
    // Enriquecer com nomes (se a RLS de profiles permitir).
    if (out.isNotEmpty) {
      final ids = out.map((a) => a.userId).toSet().toList();
      try {
        final profs = await _client
            .from('profiles')
            .select('user_id, full_name, phone')
            .inFilter('user_id', ids);
        final byId = {
          for (final p in profs)
            p['user_id'] as String: p,
        };
        for (var i = 0; i < out.length; i++) {
          final p = byId[out[i].userId];
          if (p != null) {
            out[i] = ManagerAssignment(
              userId: out[i].userId,
              countryId: out[i].countryId,
              roleLabel: out[i].roleLabel,
              fullName: p['full_name'] as String?,
              phone: p['phone'] as String?,
            );
          }
        }
      } catch (_) {}
    }
    return out;
  }

  // ── SOS (monitor de gestão — admin via RLS) ───────────────────────

  Future<List<SosAlertRow>> fetchSosAlerts({bool onlyActive = false}) async {
    try {
      var q = _client
          .from('emergency_alerts')
          .select('id, status, city, country_id, blood_type, location, '
              'chronic_conditions, allergies, activated_at');
      if (onlyActive) q = q.inFilter('status', ['active', 'acknowledged']);
      final rows = await q.order('activated_at', ascending: false).limit(50);
      return rows.map(SosAlertRow.fromJson).toList();
    } catch (_) {
      return const [];
    }
  }

  Future<void> updateSosStatus(String id, String status) async {
    await _client.from('emergency_alerts').update({'status': status}).eq(
        'id', id);
  }
}
