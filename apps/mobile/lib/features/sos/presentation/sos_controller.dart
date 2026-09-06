import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/presentation/auth_controller.dart';
import '../data/sos_models.dart';
import '../data/sos_repository.dart';

final sosRepositoryProvider =
    Provider<SosRepository>((ref) {
  return SosRepository(ref.watch(supabaseClientProvider));
});

/// Contactos de emergência (recarregáveis).
final sosContactsProvider =
    FutureProvider<List<EmergencyContact>>((ref) {
  return ref.watch(sosRepositoryProvider).fetchContacts();
});

/// Os meus alertas SOS (realtime).
final mySosAlertsProvider =
    StreamProvider<List<SosAlert>>((ref) {
  return ref.watch(sosRepositoryProvider).watchMyAlerts();
});
