import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/confetti_overlay.dart';
import '../data/savings_repository.dart';

/// F42 — Poupança de Saúde com metas (paridade com a web).
///
/// Torre de blocos estilo Minecraft: cada 10% da meta = um bloco.
/// Depósitos via RPC `deposit_savings` (servidor debita a carteira).
class SavingsScreen extends ConsumerWidget {
  const SavingsScreen({super.key});

  static const _depositChips = [50.0, 100.0, 250.0, 500.0];

  static const _categories = <String, (String, String)>{
    'parto': ('👶', 'Parto seguro'),
    'cirurgia': ('🏥', 'Cirurgia'),
    'medicacao': ('💊', 'Medicação crónica'),
    'consulta': ('🩺', 'Consultas'),
    'exames': ('🔬', 'Exames'),
    'equipamento': ('🦽', 'Equipamento'),
    'outro': ('🎯', 'Outro objetivo'),
  };

  String _fmt(double v) =>
      v.truncateToDouble() == v ? v.toStringAsFixed(0) : v.toStringAsFixed(2);

  void _snack(BuildContext ctx, String msg, {bool error = false}) {
    ScaffoldMessenger.of(ctx).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor:
            error ? Theme.of(ctx).colorScheme.error : const Color(0xFFB45309),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _openCreateSheet(BuildContext context, WidgetRef ref) async {
    final nameCtrl = TextEditingController();
    final targetCtrl = TextEditingController();
    String category = 'outro';
    bool sending = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetCtx) => StatefulBuilder(
        builder: (sheetCtx, setSheet) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(sheetCtx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Nova meta de poupança',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Text('Define o objetivo; cada depósito coloca um bloco na tua torre.',
                  style: TextStyle(
                      fontSize: 12.5, color: Theme.of(sheetCtx).hintColor)),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: category,
                decoration: const InputDecoration(
                  labelText: 'Para quê?',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                items: _categories.entries
                    .map((e) => DropdownMenuItem(
                        value: e.key,
                        child: Text('${e.value.$1} ${e.value.$2}')))
                    .toList(),
                onChanged: (v) => setSheet(() => category = v ?? 'outro'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: nameCtrl,
                maxLength: 80,
                decoration: const InputDecoration(
                  labelText: 'Nome da meta',
                  hintText: 'Ex.: Parto na Maternidade',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: targetCtrl,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                decoration: const InputDecoration(
                  labelText: 'Alvo (MZN)',
                  hintText: 'Ex.: 15000',
                  border: OutlineInputBorder(),
                  isDense: true,
                  prefixText: 'MZN ',
                ),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFFEA580C),
                  minimumSize: const Size.fromHeight(48),
                ),
                onPressed: sending
                    ? null
                    : () async {
                        final name = nameCtrl.text.trim();
                        final target =
                            double.tryParse(targetCtrl.text.trim()) ?? 0;
                        if (name.length < 2) {
                          _snack(sheetCtx, 'Dá um nome à meta', error: true);
                          return;
                        }
                        if (target < 50) {
                          _snack(sheetCtx, 'Alvo mínimo: 50 MZN', error: true);
                          return;
                        }
                        setSheet(() => sending = true);
                        final goal = await ref
                            .read(savingsRepositoryProvider)
                            .createGoal(
                                name: name,
                                targetAmount: target,
                                category: category);
                        if (sheetCtx.mounted) Navigator.of(sheetCtx).pop();
                        ref.invalidate(savingsGoalsProvider);
                        if (goal != null) {
                          _snack(sheetCtx,
                              'Meta “${goal.name}” criada — cada bloco é um passo! 🧱');
                        } else {
                          _snack(sheetCtx, 'Falha ao criar a meta',
                              error: true);
                        }
                      },
                icon: sending
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.add),
                label: Text(sending ? 'A criar…' : 'Criar meta'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openDepositSheet(
      BuildContext context, WidgetRef ref, SavingsGoal goal) async {
    final customCtrl = TextEditingController();
    bool sending = false;

    final remaining = (goal.targetAmount - goal.savedAmount)
        .clamp(0.0, double.infinity)
        .toDouble();

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetCtx) => StatefulBuilder(
        builder: (sheetCtx, setSheet) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(sheetCtx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Depositar em “${goal.name}”',
                  style: const TextStyle(
                      fontSize: 17, fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Text(
                  remaining > 0
                      ? 'Faltam ${_fmt(remaining)} MZN para concluir.'
                      : 'Meta concluída — parabéns!',
                  style: TextStyle(
                      fontSize: 12.5, color: Theme.of(sheetCtx).hintColor)),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _depositChips.map((a) {
                  return ChoiceChip(
                    label: Text(_fmt(a)),
                    selected: false,
                    onSelected: (_) =>
                        setSheet(() => customCtrl.text = _fmt(a)),
                  );
                }).toList(),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: customCtrl,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                decoration: const InputDecoration(
                  labelText: 'Outro valor (mín. 10)',
                  prefixText: 'MZN ',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFFEA580C),
                  minimumSize: const Size.fromHeight(48),
                ),
                onPressed: sending
                    ? null
                    : () async {
                        final amount =
                            double.tryParse(customCtrl.text.trim()) ?? 0;
                        if (amount < 10) {
                          _snack(sheetCtx, 'Depósito mínimo: 10 MZN',
                              error: true);
                          return;
                        }
                        setSheet(() => sending = true);
                        final result = await ref
                            .read(savingsRepositoryProvider)
                            .deposit(goal.id, amount);
                        if (sheetCtx.mounted) Navigator.of(sheetCtx).pop();
                        ref.invalidate(savingsGoalsProvider);
                        if (result == null) {
                          if (context.mounted) {
                            _snack(context,
                                'Saldo insuficiente ou falha de rede',
                                error: true);
                          }
                          return;
                        }
                        if (result.completed) {
                          if (context.mounted) {
                            showConfetti(context,
                                message:
                                    '🏆 Meta concluída! +${result.bonusXp} XP de bónus');
                          }
                        } else {
                          if (context.mounted) {
                            _snack(context,
                                '+${_fmt(amount)} MZN guardados (+10 XP) 🧱');
                          }
                        }
                      },
                icon: sending
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.add),
                label: Text(sending ? 'A depositar…' : 'Colocar bloco 🧱'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final goalsAsync = ref.watch(savingsGoalsProvider);
    final goals = goalsAsync.value ?? const <SavingsGoal>[];
    final active = goals.where((g) => g.status == GoalStatus.active).toList();
    final done = goals.where((g) => g.status != GoalStatus.active).toList();

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            expandedHeight: 132,
            backgroundColor: const Color(0xFFB45309),
            foregroundColor: Colors.white,
            title: const Text('Poupança de Saúde',
                style: TextStyle(fontWeight: FontWeight.w800)),
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Color(0xFFF59E0B),
                      Color(0xFFEA580C),
                      Color(0xFFE11D48)
                    ],
                  ),
                ),
                child: Align(
                  alignment: Alignment.bottomLeft,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                    child: Text(
                      'Constrói a tua torre de saúde, bloco a bloco 🧱  ·  ${active.length} metas ativas',
                      style: TextStyle(
                          color: Colors.white.withOpacity(0.9),
                          fontSize: 12.5),
                    ),
                  ),
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                  side: const BorderSide(color: Color(0xFFEA580C)),
                  foregroundColor: const Color(0xFFEA580C),
                ),
                onPressed: () => _openCreateSheet(context, ref),
                icon: const Icon(Icons.add),
                label: const Text('Nova meta de poupança',
                    style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ),
          ),
          if (goalsAsync.isLoading)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(40),
                child: Center(child: CircularProgressIndicator()),
              ),
            )
          else if (goals.isEmpty)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 48),
                child: Column(
                  children: [
                    const Text('🧱', style: TextStyle(fontSize: 44)),
                    const SizedBox(height: 10),
                    Text('A tua primeira torre começa com um bloco',
                        style: theme.textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w800)),
                    const SizedBox(height: 6),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 32),
                      child: Text(
                        'Poupa para um parto, cirurgia ou medicação. '
                        'Cada depósito adiciona um bloco e dá XP.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontSize: 13, color: theme.hintColor),
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (ctx, i) {
                    final g = [...active, ...done][i];
                    return _GoalCard(
                      goal: g,
                      fmt: _fmt,
                      onDeposit: (g.status == GoalStatus.active)
                          ? () => _openDepositSheet(context, ref, g)
                          : null,
                    );
                  },
                  childCount: active.length + done.length,
                ),
              ),
            ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.verified_user, size: 14, color: theme.hintColor),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'O dinheiro fica na tua carteira MedWallet — os depósitos só saem '
                      'quando tu mandas. Meta concluída desbloqueia +50 XP.',
                      style:
                          TextStyle(fontSize: 11, color: theme.hintColor),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _GoalCard extends StatelessWidget {
  const _GoalCard({
    required this.goal,
    required this.fmt,
    required this.onDeposit,
  });

  final SavingsGoal goal;
  final String Function(double) fmt;
  final VoidCallback? onDeposit;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final completed = goal.status == GoalStatus.completed;
    final pct = (goal.progress * 100).round();
    final (emoji, label) = SavingsScreen._categories[goal.category] ??
        ('🎯', 'Meta');

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: completed
              ? const Color(0xFFF59E0B).withOpacity(0.5)
              : theme.dividerColor.withOpacity(0.5),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(completed ? '🏆' : emoji,
                    style: const TextStyle(fontSize: 24)),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(goal.name,
                          style: const TextStyle(
                              fontWeight: FontWeight.w800, fontSize: 14.5)),
                      Text(label,
                          style: TextStyle(
                              fontSize: 11.5, color: theme.hintColor)),
                    ],
                  ),
                ),
                if (completed)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(999),
                      color: const Color(0xFFF59E0B).withOpacity(0.14),
                    ),
                    child: const Text('Concluída',
                        style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFFD97706))),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            // Torre de blocos estilo Minecraft — 10 blocos = 100%
            SizedBox(
              height: 22,
              child: Row(
                children: List.generate(10, (i) {
                  final blockFill = (goal.progress * 10) - i;
                  final full = blockFill >= 1;
                  final partial = !full && blockFill > 0;
                  return Expanded(
                    child: Container(
                      margin: const EdgeInsets.only(right: 4),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(3),
                        color: full || partial
                            ? const Color(0xFF10B981)
                            : theme.dividerColor.withOpacity(0.35),
                      ),
                      alignment: Alignment.centerLeft,
                      child: partial
                          ? FractionallySizedBox(
                              widthFactor: blockFill,
                              child: Container(
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(3),
                                  color: completed
                                      ? const Color(0xFFF59E0B)
                                      : const Color(0xFF10B981),
                                ),
                              ),
                            )
                          : full && completed
                              ? Container(
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(3),
                                    color: const Color(0xFFF59E0B),
                                  ),
                                )
                              : null,
                    ),
                  );
                }),
              ),
            ),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${fmt(goal.savedAmount)} / ${fmt(goal.targetAmount)} MZN',
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                ),
                Text('$pct%',
                    style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 14,
                        color: completed
                            ? const Color(0xFFD97706)
                            : const Color(0xFF059669))),
              ],
            ),
            if (!completed && onDeposit != null) ...[
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFFEA580C),
                  ),
                  onPressed: onDeposit,
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('Depositar bloco',
                      style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Metas do utilizador (RLS: só as próprias). Offline → vazio.
final savingsGoalsProvider =
    FutureProvider.autoDispose<List<SavingsGoal>>((ref) async {
  return ref.watch(savingsRepositoryProvider).fetchGoals();
});
