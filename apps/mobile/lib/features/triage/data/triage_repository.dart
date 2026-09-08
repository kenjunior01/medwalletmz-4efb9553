import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/domain/service_models.dart';
import 'triage_models.dart';

/// Repositório da triagem:
/// 1. Invoca a Edge Function `ai-triage` (a mesma do web);
/// 2. Fallback local por regras se a função estiver indisponível;
/// 3. Guarda sempre a resposta em `triage_logs` (histórico do paciente);
/// 4. Resolve a especialidade sugerida em `medical_specialties` para
///    dar sequência — a lista de especialistas dessa área.
class TriageRepository {
  TriageRepository(this._client);

  final SupabaseClient _client;

  /// Submete a triagem e devolve o resultado + especialidade resolvida.
  Future<(TriageResult, Specialty?)> submit(TriageDraft draft) async {
    var result = await _invokeEdge(draft);
    if (result == null) {
      result = localTriage(draft);
    }
    final specialty = await matchSpecialty(result.suggestedSpecialty);

    // Histórico — INSERT autorizado pela RLS "Patient owns triage".
    try {
      await _client.from('triage_logs').insert({
        'patient_id': _client.auth.currentUser!.id,
        'symptoms': draft.aiInput,
        if (draft.age != null) 'age': draft.age,
        'duration': draft.duration,
        'severity': result.severity,
        'recommendation': result.recommendation,
        'suggested_specialty': result.suggestedSpecialty,
        'ai_response': {
          'provider': result.provider ?? 'unknown',
          'red_flags': result.redFlags,
          'self_care': result.selfCare,
          'possible_causes': result.possibleCauses,
          if (result.whenToSeekHelp != null)
            'when_to_seek_help': result.whenToSeekHelp,
        },
      });
    } catch (_) {/* histórico é best-effort */}

    return (result, specialty);
  }

  /// Edge Function `ai-triage` — devolve null em qualquer falha para
  /// activar o motor local.
  Future<TriageResult?> _invokeEdge(TriageDraft draft) async {
    try {
      final res = await _client.functions.invoke(
        'ai-triage',
        body: {
          'symptoms': draft.composedSymptoms,
          if (draft.age != null) 'age': draft.age,
          'duration': draft.duration,
          'country': 'MZ',
        },
      );
      if (res.data is! Map) return null;
      return TriageResult.fromJson(
          Map<String, dynamic>.from(res.data as Map));
    } catch (_) {
      return null;
    }
  }

  /// Casamento tolerante entre o texto sugerido pela IA e as
  /// especialidades da tabela (nome exacto → contido → slug).
  Future<Specialty?> matchSpecialty(String suggested) async {
    final name = suggested.trim();
    if (name.isEmpty || name.toLowerCase() == 'emergência') return null;
    try {
      final rows = await _client
          .from('medical_specialties')
          .select('id, name, slug, icon, description')
          .order('name');
      final specialties = rows.map(Specialty.fromJson).toList();
      final lower = name.toLowerCase();
      for (final s in specialties) {
        if (s.name.toLowerCase() == lower) return s;
      }
      for (final s in specialties) {
        if (s.name.toLowerCase().contains(lower) ||
            lower.contains(s.name.toLowerCase())) {
          return s;
        }
      }
      for (final s in specialties) {
        final slug = (s.slug ?? '').toLowerCase();
        if (slug.isNotEmpty && (lower.contains(slug) || slug.contains(lower))) {
          return s;
        }
      }
    } catch (_) {}
    return null;
  }

  /// Histórico de triagens do utilizador, mais recente primeiro.
  Stream<List<TriageLog>> watchMyTriages(String uid) => _client
      .from('triage_logs')
      .stream(primaryKey: ['id'])
      .eq('patient_id', uid)
      .order('created_at', ascending: false)
      .limit(30)
      .map((rows) => rows.map(TriageLog.fromJson).toList());
}
