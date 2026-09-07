import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Impacto Público (paridade com `PublicImpactDashboard.tsx` + a função
/// `getPublicImpactStats` de `lib/mzMonetization.ts` da web).
///
/// Apenas AGREGADOS anónimos — contagens head:true sem expor dados
/// pessoais, exactamente como o web faz client-side:
///   • `profiles`         → utilizadores registados;
///   • `subscriptions`    → subscrições activas (status = 'active');
///   • `triage_sessions`  → triagens realizadas.
/// Meta de cobertura fixada em 11 províncias (Moçambique), como na web.
/// Actualização automática a cada 60 s (o ecrã gere o Timer).
class PublicImpactStats {
  const PublicImpactStats({
    required this.totalUsers,
    required this.activeSubscriptions,
    required this.totalTriages,
    required this.provincesCovered,
    this.lastUpdated,
  });

  final int totalUsers;
  final int activeSubscriptions;
  final int totalTriages;
  final int provincesCovered;
  final DateTime? lastUpdated;

  /// Estado inicial/vazio (falha de rede ou antes da 1ª leitura).
  static const PublicImpactStats zero = PublicImpactStats(
    totalUsers: 0,
    activeSubscriptions: 0,
    totalTriages: 0,
    provincesCovered: 11,
  );
}

class ImpactRepository {
  ImpactRepository(this._client);

  final SupabaseClient _client;

  Future<PublicImpactStats> fetchStats() async {
    try {
      final usersRes = await _client
          .from('profiles')
          .select('id')
          .count(CountOption.exact);
      final subsRes = await _client
          .from('subscriptions')
          .select('id')
          .eq('status', 'active')
          .count(CountOption.exact);
      final triagesRes = await _client
          .from('triage_sessions')
          .select('id')
          .count(CountOption.exact);
      return PublicImpactStats(
        totalUsers: usersRes.count,
        activeSubscriptions: subsRes.count,
        totalTriages: triagesRes.count,
        provincesCovered: 11,
        lastUpdated: DateTime.now(),
      );
    } catch (_) {
      return PublicImpactStats.zero;
    }
  }
}

final impactRepositoryProvider = Provider<ImpactRepository>(
    (ref) => ImpactRepository(Supabase.instance.client));

/// Intervalo de actualização automática do dashboard público (60 s,
/// igual ao `refetchInterval` da web).
const Duration kImpactRefreshInterval = Duration(seconds: 60);
