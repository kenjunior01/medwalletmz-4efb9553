import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../../auth/presentation/auth_controller.dart';
import '../domain/prescription_models.dart';
import 'prescriptions_controller.dart';

/// As minhas receitas — recebidas do especialista ou emitidas (médico),
/// com itens, código de verificação e validade.
class PrescriptionsScreen extends ConsumerWidget {
  const PrescriptionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final prescriptions = ref.watch(prescriptionsProvider);
    final asDoctor =
        ref.watch(userRolesProvider).value?.contains('doctor') ?? false;

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 20, 0),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => context.pop(),
                      icon: const Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    const Expanded(
                      child: Text(
                        'Receitas',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 21,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 4),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  asDoctor
                      ? 'Receitas que emitiste aos teus pacientes.'
                      : 'Receitas emitidas pelos teus especialistas — envia '
                          'a qualquer instituição pelo chat.',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.55),
                    fontSize: 13,
                    height: 1.45,
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Expanded(
                child: prescriptions.when(
                  loading: () => const ListView(
                    padding: EdgeInsets.symmetric(horizontal: 20),
                    children: [ListSkeleton(count: 4, itemHeight: 92)],
                  ),
                  error: (e, _) => EmptyState(
                    icon: Icons.wifi_off_rounded,
                    title: 'Não foi possível carregar',
                    message: 'Verifica a ligação e tenta de novo.',
                    actionLabel: 'Recarregar',
                    onAction: () => ref.invalidate(prescriptionsProvider),
                  ),
                  data: (list) => list.isEmpty
                      ? const EmptyState(
                          icon: Icons.receipt_long_rounded,
                          title: 'Ainda sem receitas',
                          message:
                              'Quando o teu especialista emitir uma receita, '
                              'ela aparece aqui com o código de verificação '
                              'e os medicamentos.',
                        )
                      : ListView(
                          padding:
                              const EdgeInsets.fromLTRB(20, 2, 20, 40),
                          children:
                              list.map((p) => _PrescriptionCard(p: p)).toList(),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Cartão de receita ───────────────────────────────────────────────────

class _PrescriptionCard extends ConsumerStatefulWidget {
  const _PrescriptionCard({required this.p});

  final Prescription p;

  @override
  ConsumerState<_PrescriptionCard> createState() => _PrescriptionCardState();
}

class _PrescriptionCardState extends ConsumerState<_PrescriptionCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final p = widget.p;
    final items = _expanded
        ? ref.watch(prescriptionItemsProvider(p.id)).when(
              data: (list) => list,
              loading: () => const <PrescriptionItem>[],
              error: (_, __) => const <PrescriptionItem>[],
            )
        : null;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: p.isValid
              ? const Color(0x4422C55E)
              : AppColors.glassBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: p.isValid
                      ? const Color(0x1A22C55E)
                      : Colors.white.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: Icon(
                  Icons.receipt_long_rounded,
                  color: p.isValid ? AppColors.success : AppColors.textMuted,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Receita ${p.verificationCode ?? 'pendente'}',
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w800,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${formatDateShort(p.createdAt)} · '
                      '${p.daysLeft == null ? 'sem prazo' : '${p.daysLeft} dias restantes'}',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.45),
                        fontSize: 11.5,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: p.isValid
                      ? const Color(0x1A22C55E)
                      : const Color(0x1AEF4444),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  p.isValid ? 'VÁLIDA' : 'INVÁLIDA',
                  style: TextStyle(
                    color: p.isValid ? AppColors.success : AppColors.danger,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.6,
                  ),
                ),
              ),
            ],
          ),

          if (p.notes != null && p.notes!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              p.notes!,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 12.5,
                height: 1.4,
              ),
            ),
          ],

          // Código de verificação copiável.
          if (p.verificationCode != null) ...[
            const SizedBox(height: 10),
            GestureDetector(
              onTap: () {
                Clipboard.setData(ClipboardData(text: p.verificationCode!));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                      content: Text('Código copiado para a área de '
                          'transferência.')),
                );
              },
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                decoration: BoxDecoration(
                  color: const Color(0x141E6B9C),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0x3338BDF8)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.copy_rounded,
                        size: 13, color: AppColors.accent),
                    const SizedBox(width: 6),
                    Text(
                      'Código: ${p.verificationCode} (toca para copiar)',
                      style: const TextStyle(
                        color: AppColors.accent,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],

          // Expandir itens.
          const SizedBox(height: 10),
          GestureDetector(
            onTap: () => setState(() => _expanded = !_expanded),
            child: Row(
              children: [
                Text(
                  _expanded
                      ? 'Esconder medicamentos'
                      : 'Ver medicamentos',
                  style: const TextStyle(
                    color: AppColors.accent,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Icon(
                  _expanded
                      ? Icons.expand_less_rounded
                      : Icons.expand_more_rounded,
                  size: 18,
                  color: AppColors.accent,
                ),
              ],
            ),
          ),
          if (_expanded)
            items == null
                ? const Padding(
                    padding: EdgeInsets.only(top: 10),
                    child: SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: AppColors.accent),
                    ),
                  )
                : items.isEmpty
                    ? const Padding(
                        padding: EdgeInsets.only(top: 10),
                        child: Text(
                          'Sem medicamentos registados.',
                          style: TextStyle(
                              color: AppColors.textMuted, fontSize: 12),
                        ),
                      )
                    : ...items.map((item) => _ItemRow(item: item)),
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 240.ms)
        .slideY(begin: 0.08, curve: Curves.easeOutCubic);
  }
}

class _ItemRow extends StatelessWidget {
  const _ItemRow({required this.item});

  final PrescriptionItem item;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            item.medicationName,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w700,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            [
              if (item.dosage?.isNotEmpty == true) item.dosage!,
              if (item.frequency?.isNotEmpty == true) item.frequency!,
              if (item.duration?.isNotEmpty == true)
                'durante ${item.duration}',
            ].join(' · '),
            style: TextStyle(
              color: Colors.white.withOpacity(0.55),
              fontSize: 11.8,
            ),
          ),
          if (item.instructions?.isNotEmpty == true)
            Padding(
              padding: const EdgeInsets.only(top: 3),
              child: Text(
                item.instructions!,
                style: const TextStyle(
                  color: AppColors.textMuted,
                  fontSize: 11.3,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
