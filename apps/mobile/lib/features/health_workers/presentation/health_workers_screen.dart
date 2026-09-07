import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/health_workers_repository.dart';

/// Agentes de Saúde — marketplace Yango-style (paridade com a web):
///
/// • 2 abas: Encontrar | As minhas reservas;
/// • Filtros por profissão (10 categorias) + ordenação por avaliação;
/// • Ficha do profissional em folha modal com bio, línguas, fees e
///   formulário de reserva (tipo de serviço, data/hora, duração,
///   motivo, morada p/ domicílio) com pagamento pela carteira;
/// • Reservas: estados coloridos, cancelar (futuro) e avaliar
///   (concluídas) — tudo por RLS existente.
class HealthWorkersScreen extends ConsumerStatefulWidget {
  const HealthWorkersScreen({super.key});

  @override
  ConsumerState<HealthWorkersScreen> createState() =>
      _HealthWorkersScreenState();
}

class _HealthWorkersScreenState extends ConsumerState<HealthWorkersScreen> {
  int _tab = 0;
  String? _profession;
  List<HealthWorker>? _workers;
  List<WorkerBooking>? _bookings;

  HealthWorkersRepository get _repo =>
      ref.read(healthWorkersRepositoryProvider);

  @override
  void initState() {
    super.initState();
    _loadWorkers();
  }

  Future<void> _loadWorkers() async {
    try {
      final list = await _repo.fetchWorkers(profession: _profession);
      if (!mounted) return;
      setState(() => _workers = list);
    } catch (e) {
      if (!mounted) return;
      setState(() => _workers = []);
    }
  }

  Future<void> _loadBookings() async {
    try {
      final list = await _repo.fetchMyBookings();
      if (!mounted) return;
      setState(() => _bookings = list);
    } catch (_) {
      if (!mounted) return;
      setState(() => _bookings = []);
    }
  }

  void _switchTab(int i) {
    setState(() => _tab = i);
    if (i == 1 && _bookings == null) _loadBookings();
  }

  void _openWorker(HealthWorker w) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _WorkerSheet(worker: w),
    ).then((_) => _loadWorkers());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDeep,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Agentes de Saúde',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
      ),
      body: AppBackground(
        child: SafeArea(
          child: Column(
            children: [
              // Tabs
              Container(
                margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: AppColors.glassFill,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.glassBorder),
                ),
                child: Row(
                  children: [
                    _Tab('Encontrar', 0, _tab, _switchTab),
                    _Tab('Reservas', 1, _tab, _switchTab),
                  ],
                ),
              ),
              Expanded(
                child: _tab == 0
                    ? _BrowseView(
                        workers: _workers,
                        profession: _profession,
                        onFilter: (p) {
                          setState(() {
                            _profession = p;
                            _workers = null;
                          });
                          _loadWorkers();
                        },
                        onOpen: _openWorker,
                      )
                    : _BookingsView(
                        bookings: _bookings,
                        onReload: _loadBookings,
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Componentes ─────────────────────────────────────────────────────────

class _Tab extends StatelessWidget {
  const _Tab(this.label, this.index, this.current, this.onTap);
  final String label;
  final int index;
  final int current;
  final void Function(int) onTap;

  @override
  Widget build(BuildContext context) {
    final active = index == current;
    return Expanded(
      child: GestureDetector(
        onTap: () => onTap(index),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            gradient: active
                ? const LinearGradient(colors: AppColors.buttonGradient)
                : null,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 13.5,
              color: active ? Colors.white : AppColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }
}

class _BrowseView extends StatelessWidget {
  const _BrowseView({
    required this.workers,
    required this.profession,
    required this.onFilter,
    required this.onOpen,
  });

  final List<HealthWorker>? workers;
  final String? profession;
  final void Function(String?) onFilter;
  final void Function(HealthWorker) onOpen;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SizedBox(
          height: 44,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            children: [
              _ProfChip(null, 'Todos', profession, onFilter),
              ...HealthWorker.professionLabels.entries
                  .take(7)
                  .map((e) => _ProfChip(e.key, e.value, profession, onFilter)),
            ],
          ),
        ),
        Expanded(
          child: workers == null
              ? const Padding(
                  padding: EdgeInsets.all(16),
                  child: AppSkeleton(height: 120),
                )
              : workers!.isEmpty
                  ? const Center(
                      child: Text(
                        'Ainda sem profissionais verificados\nnesta categoria.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            color: AppColors.textMuted, height: 1.6),
                      ),
                    )
                  : RefreshIndicator(
                      color: AppColors.accent,
                      onRefresh: () async => onFilter(profession),
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: workers!.length,
                        itemBuilder: (context, i) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: _WorkerCard(
                                worker: workers![i],
                                onTap: () => onOpen(workers![i])),
                          );
                        },
                      ),
                    ),
        ),
      ],
    );
  }
}

class _ProfChip extends StatelessWidget {
  const _ProfChip(this.key_, this.label, this.selected, this.onTap);
  final String? key_;
  final String label;
  final String? selected;
  final void Function(String?) onTap;

  @override
  Widget build(BuildContext context) {
    final active = key_ == selected;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: () => onTap(key_),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            gradient: active
                ? const LinearGradient(colors: AppColors.buttonGradient)
                : null,
            color: active ? null : AppColors.glassFill,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
                color: active ? Colors.transparent : AppColors.glassBorder),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
              color: active ? Colors.white : AppColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }
}

class _WorkerCard extends StatelessWidget {
  const _WorkerCard({required this.worker, required this.onTap});
  final HealthWorker worker;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: Row(
          children: [
            Stack(
              children: [
                _Avatar(worker: worker, size: 52),
                if (worker.isAvailable)
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: Container(
                      width: 14,
                      height: 14,
                      decoration: BoxDecoration(
                        color: AppColors.success,
                        shape: BoxShape.circle,
                        border: Border.all(
                            color: AppColors.card, width: 2.5),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(worker.fullName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontWeight: FontWeight.w800, fontSize: 14.5)),
                  const SizedBox(height: 2),
                  Text(
                    [
                      worker.professionLabel,
                      if (worker.specialization != null)
                        worker.specialization!,
                    ].join(' · '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.star_rounded,
                          size: 15, color: AppColors.warning),
                      Text('${worker.rating.toStringAsFixed(1)}',
                          style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700)),
                      const SizedBox(width: 4),
                      Text('(${worker.totalBookings})',
                          style: const TextStyle(
                              fontSize: 11,
                              color: AppColors.textMuted)),
                      const Spacer(),
                      Text(
                        'desde ${feeLabel(effectiveFee(worker, 'telehealth') ?? worker.consultationFee)}',
                        style: const TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.accent),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded,
                color: AppColors.textMuted),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 250.ms).slideX(begin: 0.06, end: 0);
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({required this.worker, this.size = 48});
  final HealthWorker worker;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: AppColors.heroCardGradient),
        borderRadius: BorderRadius.circular(size * 0.3),
      ),
      child: worker.photoUrl != null
          ? ClipRRect(
              borderRadius: BorderRadius.circular(size * 0.3),
              child: Image.network(
                worker.photoUrl!,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => _initials(),
              ),
            )
          : _initials(),
    );
  }

  Widget _initials() => Center(
        child: Text(
          worker.initials,
          style: TextStyle(
            fontWeight: FontWeight.w800,
            fontSize: size * 0.36,
            color: Colors.white,
          ),
        ),
      );
}

class _WorkerSheet extends ConsumerStatefulWidget {
  const _WorkerSheet({required this.worker});
  final HealthWorker worker;

  @override
  ConsumerState<_WorkerSheet> createState() => _WorkerSheetState();
}

class _WorkerSheetState extends ConsumerState<_WorkerSheet> {
  String _service = 'clinic_consultation';
  DateTime? _date;
  int _duration = 30;
  final _reasonCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  bool _booking = false;

  late final List<(String, String, bool)> _services;

  @override
  void initState() {
    super.initState();
    _services = [
      ('clinic_consultation', 'Consulta', true),
      ('telehealth', 'Telessaúde', widget.worker.telehealthEnabled),
      ('home_visit', 'Domicílio', widget.worker.homeVisitsEnabled),
      ('caregiver_session', 'Cuidado', widget.worker.homeVisitsEnabled),
      ('translation', 'Tradução', true),
    ];
    _service = _services.firstWhere((s) => s.$3).$1;
  }

  double? get _fee => effectiveFee(widget.worker, _service);

  Future<void> _pickDateTime() async {
    final now = DateTime.now();
    final d = await showDatePicker(
      context: context,
      initialDate: now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 90)),
    );
    if (d == null) return;
    if (!mounted) return;
    final t = await showTimePicker(
      context: context,
      initialTime: const TimeOfDay(hour: 10, minute: 0),
    );
    if (t == null) return;
    setState(() {
      _date = DateTime(d.year, d.month, d.day, t.hour, t.minute);
    });
  }

  Future<void> _confirm() async {
    if (_date == null || _booking || _fee == null || _fee! <= 0) return;
    final walletBalance = await _fetchBalance();
    if (walletBalance != null && walletBalance < _fee!) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(
                'Saldo insuficiente (${formatMZN(walletBalance)}). '
                'Carrega a carteira para pagar ${formatMZN(_fee!)}.'),
            backgroundColor: AppColors.danger),
      );
      return;
    }
    setState(() => _booking = true);
    try {
      final b = await ref.read(healthWorkersRepositoryProvider).book(
            worker: widget.worker,
            serviceType: _service,
            scheduledAt: _date!,
            durationMinutes: _duration,
            reason: _reasonCtrl.text.trim(),
            address:
                _service == 'home_visit' || _service == 'caregiver_session'
                    ? _addressCtrl.text.trim()
                    : null,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(
                'Reserva paga ✓ ${formatMZN(b.fee)} debitados da carteira'),
            backgroundColor: AppColors.success),
      );
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      setState(() => _booking = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text('Falha na reserva: $e'),
            backgroundColor: AppColors.danger),
      );
    }
  }

  Future<double?> _fetchBalance() async {
    try {
      final uid = Supabase.instance.client.auth.currentUser?.id;
      if (uid == null) return null;
      final rows = await Supabase.instance.client
          .from('wallets')
          .select('balance')
          .eq('user_id', uid)
          .limit(1);
      if (rows is List && rows.isEmpty) return null;
      return (rows.first['balance'] as num?)?.toDouble();
    } catch (_) {
      return null;
    }
  }

  @override
  void dispose() {
    _reasonCtrl.dispose();
    _addressCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final w = widget.worker;
    return Container(
      constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.88),
      decoration: const BoxDecoration(
        color: AppColors.bgMid,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 12),
          Container(
            width: 44,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.textMuted,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Row(
                  children: [
                    _Avatar(worker: w, size: 60),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(w.fullName,
                              style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800)),
                          Text(
                            [
                              w.professionLabel,
                              if (w.yearsOfExperience != null)
                                '${w.yearsOfExperience} anos exp.',
                            ].join(' · '),
                            style: const TextStyle(
                                fontSize: 12.5,
                                color: AppColors.textSecondary),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              const Icon(Icons.star_rounded,
                                  size: 16, color: AppColors.warning),
                              Text(
                                '${w.rating.toStringAsFixed(1)} · '
                                '${w.totalBookings} reservas',
                                style: const TextStyle(
                                    fontSize: 12,
                                    color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                if (w.bio != null && w.bio!.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  Text(w.bio!,
                      style: const TextStyle(
                          fontSize: 13.5, height: 1.5)),
                ],
                if (w.languages.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: w.languages
                        .map((l) => Chip(
                              label: Text(l,
                                  style: const TextStyle(fontSize: 11.5)),
                              backgroundColor: AppColors.glassFill,
                              side: const BorderSide(
                                  color: AppColors.glassBorder),
                            ))
                        .toList(),
                  ),
                ],
                const Divider(color: AppColors.glassBorder, height: 28),
                const Text('Reservar',
                    style: TextStyle(
                        fontSize: 15, fontWeight: FontWeight.w800)),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _services
                      .where((s) => s.$3)
                      .map((s) => GestureDetector(
                            onTap: () =>
                                setState(() => _service = s.$1),
                            child: AnimatedContainer(
                              duration:
                                  const Duration(milliseconds: 150),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                gradient: _service == s.$1
                                    ? const LinearGradient(
                                        colors:
                                            AppColors.buttonGradient)
                                    : null,
                                color: _service == s.$1
                                    ? null
                                    : AppColors.glassFill,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                    color: _service == s.$1
                                        ? Colors.transparent
                                        : AppColors.glassBorder),
                              ),
                              child: Text(
                                '${s.$2} · ${feeLabel(effectiveFee(w, s.$1))}',
                                style: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w600,
                                  color: _service == s.$1
                                      ? Colors.white
                                      : AppColors.textSecondary,
                                ),
                              ),
                            ),
                          ))
                      .toList(),
                ),
                const SizedBox(height: 12),
                OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.textPrimary,
                    side: const BorderSide(color: AppColors.glassBorder),
                    backgroundColor: AppColors.glassFill,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onPressed: _pickDateTime,
                  child: Text(
                    _date == null
                        ? '📅 Escolher data e hora'
                        : '📅 ${formatDateTime(_date!)} · $_duration min',
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _reasonCtrl,
                  maxLines: 2,
                  style: const TextStyle(fontSize: 13.5),
                  decoration: _input('Motivo / sintomas (opcional)'),
                ),
                if (_service == 'home_visit' ||
                    _service == 'caregiver_session')
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: TextField(
                      controller: _addressCtrl,
                      style: const TextStyle(fontSize: 13.5),
                      decoration:
                          _input('Morada da visita (bairro, casa…)'),
                    ),
                  ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: [30, 60, 90]
                      .map((d) => ChoiceChip(
                            label: Text('$d min',
                                style: const TextStyle(fontSize: 12)),
                            selected: _duration == d,
                            selectedColor: AppColors.primarySoft,
                            labelStyle: TextStyle(
                                color: _duration == d
                                    ? Colors.white
                                    : AppColors.textSecondary),
                            side: const BorderSide(
                                color: AppColors.glassBorder),
                            onSelected: (_) =>
                                setState(() => _duration = d),
                          ))
                      .toList(),
                ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.glassFill,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.glassBorder),
                  ),
                  child: Row(
                    children: [
                      const Expanded(
                        child: Text('Total a pagar da carteira',
                            style: TextStyle(
                                fontSize: 13,
                                color: AppColors.textSecondary)),
                      ),
                      Text(
                        formatMZN(_fee ?? 0),
                        style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: AppColors.accent),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primarySoft,
                    padding: const EdgeInsets.symmetric(vertical: 13),
                  ),
                  onPressed:
                      (_date == null || _booking || _fee == null || _fee! <= 0)
                          ? null
                          : _confirm,
                  child: _booking
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Confirmar e pagar',
                          style: TextStyle(fontWeight: FontWeight.w700)),
                ),
                const SizedBox(height: 6),
                const Text(
                  '80% para o profissional · 20% plataforma. '
                  'Podes cancelar até à hora marcada falando com o suporte.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      fontSize: 11, color: AppColors.textMuted, height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  InputDecoration _input(String hint) => InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: AppColors.textMuted),
        filled: true,
        fillColor: AppColors.glassFill,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
      );
}

class _BookingsView extends StatelessWidget {
  const _BookingsView({required this.bookings, required this.onReload});
  final List<WorkerBooking>? bookings;
  final VoidCallback onReload;

  @override
  Widget build(BuildContext context) {
    final list = bookings;
    if (list == null) {
      return const Padding(
        padding: EdgeInsets.all(16),
        child: AppSkeleton(height: 100),
      );
    }
    if (list.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: const [
            Icon(Icons.event_busy_rounded,
                size: 44, color: AppColors.textMuted),
            SizedBox(height: 10),
            Text(
              'Ainda sem reservas.\nEncontra um profissional na aba "Encontrar".',
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: AppColors.textMuted, height: 1.6, fontSize: 13.5),
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      color: AppColors.accent,
      onRefresh: () async => onReload(),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: list.length,
        itemBuilder: (context, i) {
          final b = list[i];
          final statusColor = switch (b.status) {
            'completed' => AppColors.success,
            'cancelled' || 'no_show' => AppColors.textMuted,
            'in_progress' => AppColors.accent,
            'confirmed' => AppColors.primarySoft,
            _ => AppColors.warning,
          };
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.glassBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        b.workerName ?? 'Profissional',
                        style: const TextStyle(
                            fontWeight: FontWeight.w800, fontSize: 14.5),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(b.statusLabel,
                          style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                              color: statusColor)),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  '${b.serviceLabel} · ${formatDateTime(b.scheduledAt)} · ${b.durationMinutes} min',
                  style: const TextStyle(
                      fontSize: 12.5, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Text(formatMZN(b.fee),
                        style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            color: AppColors.accent)),
                    const SizedBox(width: 8),
                    if (b.paymentStatus == 'paid')
                      const Icon(Icons.verified_rounded,
                          size: 15, color: AppColors.success)
                    else
                      const Text('não pago',
                          style: TextStyle(
                              fontSize: 11, color: AppColors.warning)),
                    const Spacer(),
                    if (b.isCancellable)
                      TextButton(
                        onPressed: () async {
                          final ok = await showDialog<bool>(
                            context: context,
                            builder: (c) => AlertDialog(
                              backgroundColor: AppColors.bgHigh,
                              title: const Text('Cancelar reserva?'),
                              content: const Text(
                                  'Fala com o suporte para o reembolso '
                                  'do pagamento.'),
                              actions: [
                                TextButton(
                                    onPressed: () =>
                                        Navigator.pop(c, false),
                                    child: const Text('Voltar')),
                                FilledButton(
                                    style: FilledButton.styleFrom(
                                        backgroundColor:
                                            AppColors.danger),
                                    onPressed: () =>
                                        Navigator.pop(c, true),
                                    child: const Text('Cancelar')),
                              ],
                            ),
                          );
                          if (ok == true) {
                            await Supabase.instance.client
                                .from('health_worker_bookings')
                                .update({'status': 'cancelled'})
                                .eq('id', b.id);
                            onReload();
                          }
                        },
                        child: const Text('Cancelar',
                            style:
                                TextStyle(color: AppColors.danger)),
                      ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
