import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/presentation/auth_controller.dart';
import '../data/wallet_repository.dart';
import '../domain/wallet_models.dart';

final walletRepositoryProvider = Provider<WalletRepository>(
  (ref) => WalletRepository(ref.watch(supabaseClientProvider)),
);

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
