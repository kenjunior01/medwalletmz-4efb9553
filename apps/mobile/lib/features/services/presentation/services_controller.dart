import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/presentation/auth_controller.dart';
import '../data/services_repository.dart';
import '../domain/service_models.dart';

final servicesRepositoryProvider = Provider<ServicesRepository>(
  (ref) => ServicesRepository(ref.watch(supabaseClientProvider)),
);

/// Especialidades (uma consulta; cache até invalidate).
final specialtiesProvider = FutureProvider<List<Specialty>>(
  (ref) => ref.watch(servicesRepositoryProvider).fetchSpecialties(),
);

/// Médicos — reage à especialidade selecionada (null = todas).
final selectedSpecialtyProvider = StateProvider<String?>((_) => null);

final doctorsProvider = FutureProvider<List<Doctor>>((ref) async {
  final repo = ref.watch(servicesRepositoryProvider);
  final specialtyId = ref.watch(selectedSpecialtyProvider);
  return repo.fetchDoctors(specialtyId: specialtyId);
});

/// F32 FIX: especialistas em destaque da HOME — provider próprio, SEM
/// ligação ao filtro da aba Serviços. Antes, escolher "Cardiologia" nos
/// Serviços vazava para a Home: os destaques ficavam só de cardiologia
/// (ou desapareciam) e o skeleton piscava a cada invalidate.
final featuredDoctorsProvider = FutureProvider<List<Doctor>>((ref) async {
  return ref.watch(servicesRepositoryProvider).fetchDoctors();
});
