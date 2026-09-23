import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/config.dart';
import '../../auth/data/auth_repository.dart';
import '../../auth/domain/profile.dart';

/// Cliente Supabase partilhado (única fonte de verdade).
final supabaseClientProvider = Provider<SupabaseClient>((ref) {
  assert(AppConfig.isConfigured,
      'Supabase não configurado — faltam as --dart-define');
  return Supabase.instance.client;
});

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(ref.watch(supabaseClientProvider)),
);

/// ID do utilizador autenticado (reage a mudanças de sessão).
///
/// FIX F32: antes era um Provider estático que cachava o uid na 1.ª
/// leitura — após logout→login os dependentes (carteira, perfil,
/// papéis, notificações) ficavam presos ao uid antigo/vazio: saldo
/// 0,00 MT, "Utilizador" no lugar do nome, badge de notificações morto.
/// Agora re-avalia em CADA evento de auth, e todos os providers que
/// fazem `ref.watch(currentUserIdProvider)` recarregam sozinhos.
final currentUserIdProvider = Provider<String?>((ref) {
  if (!AppConfig.isConfigured) return null;
  final client = ref.watch(supabaseClientProvider);
  // F33 — só reage a eventos que mudam a IDENTIDADE: `tokenRefreshed`
  // (~1×/hora) disparava invalidação em cascata de TODOS os providers
  // dependentes (perfil, carteira, notificações) sem qualquer mudança.
  const identityEvents = {
    AuthChangeEvent.initialSession,
    AuthChangeEvent.signedIn,
    AuthChangeEvent.signedOut,
    AuthChangeEvent.userUpdated,
  };
  final sub = client.auth.onAuthStateChange.listen((data) {
    if (identityEvents.contains(data.event)) ref.invalidateSelf();
  });
  ref.onDispose(sub.cancel);
  return client.auth.currentUser?.id;
});

/// Perfil do utilizador — recarrega quando a sessão muda.
final profileProvider = FutureProvider<Profile?>((ref) async {
  final uid = ref.watch(currentUserIdProvider);
  if (uid == null) return null;
  final repo = ref.watch(authRepositoryProvider);
  return repo.fetchMyProfile();
});

/// Papéis do utilizador — RPC `get_user_roles` (granted ao authenticated).
final userRolesProvider = FutureProvider<List<String>>((ref) async {
  final uid = ref.watch(currentUserIdProvider);
  if (uid == null) return const [];
  final client = ref.watch(supabaseClientProvider);
  try {
    final res = await client.rpc('get_user_roles', params: {'_user_id': uid});
    if (res is! List) return const [];
    return res
        .map((r) {
          if (r is Map) return (r['role'] ?? '').toString();
          return r.toString();
        })
        .where((s) => s.isNotEmpty)
        .toList();
  } catch (_) {
    return const [];
  }
});

/// Invalida todos os providers dependentes de dados do utilizador
/// (chamado no login/logout e após mutações importantes).
void invalidateUserData(WidgetRef ref) {
  ref.invalidate(profileProvider);
  ref.invalidate(userRolesProvider);
}
