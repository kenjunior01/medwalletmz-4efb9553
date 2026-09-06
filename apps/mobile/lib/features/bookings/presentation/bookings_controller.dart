import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/presentation/auth_controller.dart';
import '../data/bookings_repository.dart';
import '../domain/booking_models.dart';

final bookingsRepositoryProvider = Provider<BookingsRepository>(
  (ref) => BookingsRepository(ref.watch(supabaseClientProvider)),
);

/// Consultas do utilizador em tempo real (paciente).
final myConsultationsProvider =
    StreamProvider<List<Consultation>>((ref) {
  final uid = ref.watch(currentUserIdProvider);
  if (uid == null) return const Stream.empty();
  return ref.watch(bookingsRepositoryProvider).watchMyConsultations(uid);
});
