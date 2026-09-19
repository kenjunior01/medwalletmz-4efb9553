import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/presentation/auth_controller.dart';
import '../data/wallet_repository.dart';
import '../domain/wallet_models.dart';

final walletRepositoryProvider = Provider<WalletRepository>(
  (ref) => WalletRepository(ref.watch(supabaseClientProvider)),
);

/// Histórico de levantamentos (F32: movido para o controller — era
/// declarado no wallet_screen, o que impedia o WithdrawSheet de o
/// invalidar sem import circular).
final withdrawalsProvider = FutureProvider<List<WithdrawalRow>>((ref) async {
  final uid = ref.watch(currentUserIdProvider);
  if (uid == null) return const [];
  return ref.watch(walletRepositoryProvider).fetchWithdrawals(uid);
});

/// Saldo em tempo real — null enquanto não existir carteira.
final walletStreamProvider = StreamProvider<Wallet?>((ref) {
  final uid = ref.watch(currentUserIdProvider);
  if (uid == null) return const Stream.empty();
  return ref.watch(walletRepositoryProvider).watchWallet(uid);
});

/// Transações em tempo real.
final transactionsProvider = StreamProvider<List<WalletTransaction>>((ref) {
  final uid = ref.watch(currentUserIdProvider);
  if (uid == null) return const Stream.empty();
  return ref.watch(walletRepositoryProvider).watchTransactions(uid);
});

/// Estado de visibilidade do saldo (privacidade em público).
final balanceHiddenProvider =
    NotifierProvider<BalanceHidden, bool>(BalanceHidden.new);

class BalanceHidden extends Notifier<bool> {
  @override
  bool build() => false;
  void toggle() => state = !state;
}
