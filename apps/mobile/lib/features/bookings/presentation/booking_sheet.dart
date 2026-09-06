import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../services/domain/service_models.dart';
import '../data/bookings_repository.dart';

/// Agendar consulta.
///
/// Modo slots (preferido): escolhe um dos horários publicados pelo
/// médico em `doctor_availability_slots` e confirma via RPC
/// `book_consultation_atomic` — o saldo é debitado de imediato.
/// Modo manual (fallback): data/hora livres quando o médico não tem
/// slots — o débito ocorre depois, na realização da consulta.
class BookingSheet extends ConsumerStatefulWidget {
  const BookingSheet({super.key, required this.doctor});

  final Doctor doctor;

  @override
  ConsumerState<BookingSheet> createState() => _BookingSheetState();
}

class _BookingSheetState extends ConsumerState<BookingSheet> {
  List<DoctorSlotOption>? _slots; // null = a carregar
  String? _selectedSlotId;
  DateTime? _date;
  TimeOfDay? _time;
  final _reason = TextEditingController();
  bool _loading = false;
  bool _done = false;
  bool _paidNow = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadSlots();
  }

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  Future<void> _loadSlots() async {
    try {
      final slots =
          await ref.read(bookingsRepositoryProvider).fetchAvailableSlots(
                widget.doctor.userId,
              );
      if (mounted) setState(() => _slots = slots);
    } catch (_) {
      if (mounted) setState(() => _slots = const []);
    }
  }

  bool get _hasSlots => _slots != null && _slots!.isNotEmpty;

  DateTime? get _scheduledAt {
    if (_hasSlots) {
      for (final s in _slots!) {
        if (s.id == _selectedSlotId) return s.startsAt;
      }
      return null;
    }
    if (_date == null || _time == null) return null;
    return DateTime(
      _date!.year, _date!.month, _date!.day, _time!.hour, _time!.minute,
    );
  }

  Map<DateTime, List<DoctorSlotOption>> get _slotsByDay {
    final map = <DateTime, List<DoctorSlotOption>>{};
    for (final s in _slots ?? const <DoctorSlotOption>[]) {
      final day =
          DateTime(s.startsAt.year, s.startsAt.month, s.startsAt.day);
      map.putIfAbsent(day, () => []).add(s);
    }
    final keys = map.keys.toList()..sort();
    return {for (final k in keys) k: map[k]!};
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
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 14, 24, 26),
            child: _done ? _success() : _form(),
          ),
        ),
      ),
    );
  }

  Widget _form() => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _grabber(),
          const SizedBox(height: 16),
          Row(
            children: [
              Container(
                width: 52,
                height: 52,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                      colors: AppColors.heroCardGradient),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white.withOpacity(0.2)),
                ),
                child: Text(
                  widget.doctor.specialtyIcon ?? '🩺',
                  style: const TextStyle(fontSize: 24),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.doctor.specialtyName ?? 'Consulta geral',
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${formatMZN(widget.doctor.consultationFee)} · 30 min',
                      style: const TextStyle(
                          color: AppColors.textMuted, fontSize: 12.5),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 22),
          if (_slots == null)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 26),
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            )
          else if (_hasSlots) ...[
            _modeTag('Horários do médico — pagamento imediato do saldo'),
            const SizedBox(height: 12),
            ..._slotGroups(),
          ] else ...[
            _modeTag('O médico não publicou horários — escolhe data e hora livres'),
            const SizedBox(height: 12),
            _pickerTile(
              icon: Icons.calendar_month_rounded,
              label: _date == null
                  ? 'Escolher data'
                  : formatDateShort(_date!),
              onTap: _pickDate,
            ),
            const SizedBox(height: 12),
            _pickerTile(
              icon: Icons.schedule_rounded,
              label:
                  _time == null ? 'Escolher hora' : _time!.format(context),
              onTap: _pickTime,
            ),
          ],
          const SizedBox(height: 14),
          TextField(
            controller: _reason,
            maxLines: 3,
            style: const TextStyle(color: AppColors.textPrimary),
            decoration: const InputDecoration(
              hintText: 'Motivo da consulta (opcional)',
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(
              _error!,
              style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 13),
            ),
          ],
          const SizedBox(height: 22),
          GradientButton(
            label: _hasSlots
                ? 'Confirmar e pagar da carteira'
                : 'Confirmar agendamento',
            icon: Icons.event_available_rounded,
            loading: _loading,
            enabled: _scheduledAt != null,
            onPressed: _submit,
          ),
          const SizedBox(height: 10),
          Text(
            _hasSlots
                ? 'O valor é debitado do teu saldo agora, de forma segura.'
                : 'O pagamento do saldo é debitado apenas na realização da consulta.',
            textAlign: TextAlign.center,
            style: TextStyle(
                color: Colors.white.withOpacity(0.4), fontSize: 11.5),
          ),
        ]
            .animate(interval: 45.ms)
            .fadeIn(duration: 320.ms)
            .slideY(begin: 0.12, curve: Curves.easeOutCubic),
      );

  Widget _modeTag(String text) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.accent.withOpacity(0.1),
          borderRadius: BorderRadius.circular(11),
          border: Border.all(color: AppColors.accent.withOpacity(0.3)),
        ),
        child: Row(
          children: [
            const Icon(Icons.info_outline_rounded,
                color: AppColors.accent, size: 15),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                text,
                style: const TextStyle(
                    color: AppColors.accent,
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      );

  List<Widget> _slotGroups() {
    final widgets = <Widget>[];
    for (final entry in _slotsByDay.entries) {
      widgets.add(
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Text(
            _dayLabel(entry.key),
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 12.5,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      );
      widgets.add(
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: entry.value
              .map((s) => _slotChip(s))
              .toList(),
        ),
      );
      widgets.add(const SizedBox(height: 6));
    }
    return widgets;
  }

  String _dayLabel(DateTime d) {
    final now = DateTime.now();
    final tomorrow = DateTime(now.year, now.month, now.day + 1);
    if (d.year == now.year && d.month == now.month && d.day == now.day) {
      return 'Hoje';
    }
    if (d == tomorrow) return 'Amanhã';
    return formatDateShort(d);
  }

  Widget _slotChip(DoctorSlotOption slot) {
    final selected = _selectedSlotId == slot.id;
    final label =
        '${slot.startsAt.hour.toString().padLeft(2, '0')}:${slot.startsAt.minute.toString().padLeft(2, '0')}';
    return GestureDetector(
      onTap: () => setState(() {
        _selectedSlotId = selected ? null : slot.id;
        _error = null;
      }),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          gradient: selected
              ? const LinearGradient(colors: AppColors.buttonGradient)
              : null,
          color: selected ? null : AppColors.glassFill,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? Colors.white24 : AppColors.glassBorder,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : AppColors.textSecondary,
            fontWeight: FontWeight.w800,
            fontSize: 13.5,
          ),
        ),
      ),
    );
  }

  Widget _success() => Column(
        children: [
          _grabber(),
          const SizedBox(height: 22),
          Container(
            width: 76,
            height: 76,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const LinearGradient(colors: AppColors.successGradient),
              boxShadow: [
                BoxShadow(
                  color: AppColors.success.withOpacity(0.4),
                  blurRadius: 30,
                  offset: const Offset(0, 12),
                ),
              ],
            ),
            child: const Icon(Icons.event_available_rounded,
                color: Colors.white, size: 38),
          ).animate().scale(duration: 450.ms, curve: Curves.elasticOut),
          const SizedBox(height: 18),
          const Text(
            'Consulta agendada!',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 21,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            _scheduledAt == null ? '' : formatDateTime(_scheduledAt!),
            style: const TextStyle(
                color: AppColors.textSecondary, fontSize: 14),
          ),
          const SizedBox(height: 8),
          if (_paidNow)
            Text(
              'Pagamento de ${formatMZN(widget.doctor.consultationFee)} confirmado da carteira.',
              style: const TextStyle(color: AppColors.success, fontSize: 12.5),
            ),
          const SizedBox(height: 24),
          GradientButton(
            label: 'Ver as minhas consultas',
            onPressed: () => Navigator.of(context).pop(),
          ),
        ],
      );

  Widget _pickerTile({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) =>
      Material(
        type: MaterialType.transparency,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
            decoration: BoxDecoration(
              color: AppColors.glassFill,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.glassBorder),
            ),
            child: Row(
              children: [
                Icon(icon, color: AppColors.accent, size: 21),
                const SizedBox(width: 12),
                Text(
                  label,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 14.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                const Icon(Icons.expand_more_rounded,
                    color: AppColors.textMuted),
              ],
            ),
          ),
        ),
      );

  Widget _grabber() => Center(
        child: Container(
          width: 44,
          height: 5,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.18),
            borderRadius: BorderRadius.circular(3),
          ),
        ),
      );

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 90)),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.dark(
            primary: AppColors.primary,
            surface: AppColors.card,
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.dark(
            primary: AppColors.primary,
            surface: AppColors.card,
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) setState(() => _time = picked);
  }

  Future<void> _submit() async {
    final uid = ref.read(currentUserIdProvider);
    final at = _scheduledAt;
    if (uid == null || at == null) return;

    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final repo = ref.read(bookingsRepositoryProvider);
      if (_hasSlots) {
        await repo.bookViaSlot(_selectedSlotId!, _reason.text);
        if (mounted) {
          setState(() {
            _paidNow = true;
            _done = true;
          });
        }
      } else {
        await repo.createConsultation(
          patientId: uid,
          doctorId: widget.doctor.userId,
          scheduledAt: at,
          reason: _reason.text,
          fee: widget.doctor.consultationFee,
        );
        if (mounted) setState(() => _done = true);
      }
    } on BookingException catch (e) {
      if (mounted) setState(() => _error = e.message);
      await _loadSlots();
    } on PostgrestException {
      if (mounted) {
        setState(() => _error =
            'Não foi possível agendar. Tenta outro horário.');
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Falha de rede. Tenta de novo.');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}
