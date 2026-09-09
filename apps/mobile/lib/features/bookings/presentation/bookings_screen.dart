import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/bookings_repository.dart';
import '../domain/booking_models.dart';
import 'bookings_controller.dart';

/// Histórico de consultas do paciente (realtime) com cancelamento e
/// avaliação do médico — paridade com o my-consultations da web.
class BookingsScreen extends ConsumerWidget {
  const BookingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final consults = ref.watch(myConsultationsProvider);

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 8, 20, 0),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.of(context).maybePop(),
                      icon: const Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    const Text(
                      'As minhas consultas',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              Expanded(
                child: consults.when(
                  loading: () => const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 20),
                    child: ListSkeleton(count: 4, itemHeight: 96),
                  ),
                  error: (e, _) => EmptyState(
                    icon: Icons.wifi_off_rounded,
                    title: 'Consultas indisponíveis',
                    message: 'Verifica a ligação e tenta novamente.',
                    actionLabel: 'Recarregar',
                    onAction: () => ref.invalidate(myConsultationsProvider),
                  ),
                  data: (list) {
                    if (list.isEmpty) {
                      return const EmptyState(
                        icon: Icons.event_busy_rounded,
                        title: 'Ainda sem consultas',
                        message:
                            'Agenda a tua primeira consulta na aba Serviços — paga com o saldo da carteira.',
                      );
                    }
                    return ListView.builder(
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 120),
                      itemCount: list.length,
                      itemBuilder: (context, i) => _ConsultTile(
                        consultation: list[i],
                      ).animate(delay: 55.ms).fadeIn(duration: 320.ms).slideY(
                            begin: 0.08,
                            curve: Curves.easeOutCubic,
                          ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ConsultTile extends ConsumerWidget {
  const _ConsultTile({required this.consultation});

  final Consultation consultation;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final color = consultationStatusColor(consultation.status);
    final upcoming = consultation.scheduledAt.isAfter(DateTime.now()) &&
        consultation.status == 'scheduled';
    final cancellable = upcoming;
    final reviewable = consultation.status == 'completed';

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: color.withOpacity(0.14),
                  border: Border.all(color: color.withOpacity(0.35)),
                ),
                child: Icon(
                  upcoming
                      ? Icons.upcoming_rounded
                      : Icons.medical_information_rounded,
                  color: color,
                  size: 26,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            consultation.reason?.isNotEmpty == true
                                ? consultation.reason!
                                : 'Consulta médica',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: color.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(7),
                          ),
                          child: Text(
                            consultationStatusLabel(consultation.status),
                            style: TextStyle(
                              color: color,
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 5),
                    Text(
                      formatDateTime(consultation.scheduledAt),
                      style: const TextStyle(
                          color: AppColors.textSecondary, fontSize: 12.5),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${formatMZN(consultation.fee)} · ${consultation.durationMinutes} min',
                      style: const TextStyle(
                          color: AppColors.textMuted, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (cancellable || reviewable) ...[
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (cancellable)
                  _ActionChip(
                    icon: Icons.close_rounded,
                    label: 'Cancelar',
                    color: AppColors.danger,
                    onTap: () => _confirmCancel(context, ref),
                  ),
                if (reviewable) ...[
                  const SizedBox(width: 10),
                  _ActionChip(
                    icon: Icons.star_rounded,
                    label: 'Avaliar médico',
                    color: AppColors.warning,
                    onTap: () => _openReviewSheet(context, ref),
                  ),
                ],
              ],
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _confirmCancel(BuildContext context, WidgetRef ref) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF12263C),
        title: const Text('Cancelar consulta?',
            style: TextStyle(color: AppColors.textPrimary, fontSize: 18)),
        content: const Text(
          'O horário do médico fica imediatamente livre para outros pacientes.',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 13.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Manter',
                style: TextStyle(color: AppColors.textMuted)),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Cancelar consulta',
                style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref
          .read(bookingsRepositoryProvider)
          .cancel(consultation.id);
      ref.invalidate(myConsultationsProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Consulta cancelada')),
        );
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Não foi possível cancelar. Tenta de novo.')),
        );
      }
    }
  }

  Future<void> _openReviewSheet(BuildContext context, WidgetRef ref) async {
    final repo = ref.read(bookingsRepositoryProvider);
    bool already = false;
    try {
      already = await repo.hasReview(consultation.id);
    } catch (_) {}
    if (!context.mounted) return;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ReviewSheet(
        consultation: consultation,
        alreadyRated: already,
      ),
    );
  }
}

class _ActionChip extends StatelessWidget {
  const _ActionChip({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          color: color.withOpacity(0.12),
          borderRadius: BorderRadius.circular(11),
          border: Border.all(color: color.withOpacity(0.4)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 16),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 12.5,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Folha de avaliação — grava em `doctor_reviews` (UNIQUE por consulta,
/// por isso um segundo toque actualiza a nota em vez de duplicar).
class _ReviewSheet extends ConsumerStatefulWidget {
  const _ReviewSheet({required this.consultation, required this.alreadyRated});

  final Consultation consultation;
  final bool alreadyRated;

  @override
  ConsumerState<_ReviewSheet> createState() => _ReviewSheetState();
}

class _ReviewSheetState extends ConsumerState<_ReviewSheet> {
  int _rating = 0;
  final _comment = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [AppColors.bgHigh, AppColors.bgDeep],
          ),
          borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
          border: Border(top: BorderSide(color: AppColors.glassBorder)),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 14, 24, 26),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 44,
                    height: 5,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.18),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  widget.alreadyRated
                      ? 'Actualizar a tua avaliação'
                      : 'Como foi a consulta?',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 19,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(5, (i) {
                    final filled = i < _rating;
                    return GestureDetector(
                      onTap: () => setState(() => _rating = i + 1),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 5),
                        child: Icon(
                          filled
                              ? Icons.star_rounded
                              : Icons.star_outline_rounded,
                          color: AppColors.warning,
                          size: 42,
                        ),
                      ),
                    );
                  }),
                ).animate(delay: 40.ms).fadeIn(duration: 250.ms),
                const SizedBox(height: 18),
                TextField(
                  controller: _comment,
                  maxLines: 3,
                  style: const TextStyle(color: AppColors.textPrimary),
                  decoration: const InputDecoration(
                    hintText:
                        'Comentário (opcional) — pontualidade, cuidado, clareza…',
                  ),
                ),
                const SizedBox(height: 20),
                _submitWidget(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _submitWidget() {
    final label =
        widget.alreadyRated ? 'Actualizar avaliação' : 'Enviar avaliação';
    if (_saving) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(10),
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      );
    }
    return GradientButton(
      label: label,
      icon: Icons.star_rounded,
      enabled: _rating > 0,
      onPressed: _save,
    );
  }

  Future<void> _save() async {
    if (_rating == 0 || _saving) return;
    setState(() => _saving = true);
    try {
      await ref.read(bookingsRepositoryProvider).submitReview(
            consultationId: widget.consultation.id,
            doctorId: widget.consultation.doctorId,
            patientId: widget.consultation.patientId,
            rating: _rating,
            comment: _comment.text,
          );
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Obrigado pela tua avaliação!')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Não foi possível enviar. Tenta de novo.')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}
