import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/presentation/auth_controller.dart';
import '../data/proposal_models.dart';
import '../data/proposal_repository.dart';

final proposalRepositoryProvider = Provider<ProposalRepository>(
  (ref) => ProposalRepository(ref.watch(supabaseClientProvider)),
);

/// As minhas submissões em tempo real.
final myProposalsProvider = StreamProvider<List<PlaceProposal>>((ref) {
  final uid = ref.watch(currentUserIdProvider);
  if (uid == null) return const Stream.empty();
  return ref.watch(proposalRepositoryProvider).watchMine(uid);
});

/// Estatísticas do contribuidor derivadas da lista.
class ContributorStats {
  const ContributorStats({
    required this.total,
    required this.approved,
    required this.pending,
    required this.earned,
    required this.currency,
  });

  final int total;
  final int approved;
  final int pending;
  final double earned;
  final String currency;
}

final contributorStatsProvider = Provider<ContributorStats>((ref) {
  final list = ref.watch(myProposalsProvider).value ?? const [];
  var approved = 0;
  var pending = 0;
  var earned = 0.0;
  var currency = 'MZN';
  for (final p in list) {
    if (p.status == 'approved') {
      approved += 1;
      if (p.rewardPaid) {
        earned += p.rewardAmount ?? 0;
        currency = p.rewardCurrency ?? currency;
      }
    } else if (p.status == 'pending' || p.status == 'in_review') {
      pending += 1;
    }
  }
  return ContributorStats(
    total: list.length,
    approved: approved,
    pending: pending,
    earned: earned,
    currency: currency,
  );
});
