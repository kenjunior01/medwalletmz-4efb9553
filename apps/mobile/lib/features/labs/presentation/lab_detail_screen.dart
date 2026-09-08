import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/labs_repository.dart';

/// Detalhe do laboratório — catálogo de exames agrupado por categoria,
/// carrinho, agendamento (colheita ao domicílio opcional) e pagamento
/// integral da carteira via RPC `wallet_debit`.
class LabDetailScreen extends ConsumerStatefulWidget {
  const LabDetailScreen({super.key, required this.lab});

  final LabFacility lab;

  @override
  ConsumerState<LabDetailScreen> createState() => _LabDetailScreenState();
}

class _LabDetailScreenState extends ConsumerState<LabDetailScreen> {
  final Map<String, LabExam> _cart = {};
  bool _homeCollection = false;
  DateTime? _scheduledAt;
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  bool _submitting = false;
  String? _error;
  bool _loading = true;
  List<LabExam> _exams = const [];

  double get _total => _cart.values.fold(0, (s, e) => s + e.price);

  @override
  void initState() {
    super.initState();
    _loadExams();
  }

  Future<void> _loadExams() async {
    final exams =
        await ref.read(labsRepositoryProvider).fetchExams(widget.lab.id);
    if (!mounted) return;
    setState(() {
      _exams = exams;
      _loading = false;
    });
  }

  void _toggle(LabExam exam) {
    setState(() {
      if (_cart.containsKey(exam.id)) {
        _cart.remove(exam.id);
      } else {
        _cart[exam.id] = exam;
      }
    });
  }

  Future<void> _pickDateTime({VoidCallback? onChanged}) async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 90)),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.dark(primary: AppColors.accent),
        ),
        child: child!,
      ),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: const TimeOfDay(hour: 9, minute: 0),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.dark(primary: AppColors.accent),
        ),
        child: child!,
      ),
    );
    if (time == null || !mounted) return;
    setState(() {
      _scheduledAt =
          DateTime(date.year, date.month, date.day, time.hour, time.minute);
    });
    onChanged?.call();
  }

  Future<void> _checkout() async {
    if (_cart.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Escolhe pelo menos um exame.'),
        behavior: SnackBarBehavior.floating,
      ));
      return;
    }
    if (_nameCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Indica o nome do paciente.'),
        behavior: SnackBarBehavior.floating,
      ));
      return;
    }
    if (_homeCollection && _addressCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Indica a morada da colheita ao domicílio.'),
        behavior: SnackBarBehavior.floating,
      ));
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    final err = await ref.read(labsRepositoryProvider).createOrder(
          labId: widget.lab.id,
          patientName: _nameCtrl.text.trim(),
          patientPhone: _phoneCtrl.text.trim(),
          items: [for (final e in _cart.values) LabOrderItem(
            examId: e.id,
            name: e.name,
            price: e.price,
            category: e.category,
          )],
          total: _total,
          scheduledAt: _scheduledAt,
          homeCollection: _homeCollection,
          collectionAddress: _addressCtrl.text.trim(),
          collectionCity: _cityCtrl.text.trim(),
          notes: _notesCtrl.text.trim(),
        );
    if (!mounted) return;
    setState(() => _submitting = false);
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(err),
        backgroundColor: AppColors.danger,
        behavior: SnackBarBehavior.floating,
      ));
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
      content: Text('Pedido de exames criado! Podes acompanhar no histórico.'),
      backgroundColor: AppColors.success,
      behavior: SnackBarBehavior.floating,
    ));
    context.pushReplacement('/lab-orders');
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _addressCtrl.dispose();
    _cityCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final lab = widget.lab;
    final grouped = <String, List<LabExam>>{};
    for (final e in _exams) {
      grouped.putIfAbsent(e.category, () => []).add(e);
    }

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              // ── Cabeçalho ────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(6, 8, 16, 4),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => context.pop(),
                      icon: const Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    Expanded(
                      child: Text(
                        lab.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    IconButton(
                      tooltip: 'Histórico de pedidos',
                      onPressed: () => context.push('/lab-orders'),
                      icon: const Icon(Icons.history_rounded,
                          color: AppColors.accent),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                child: Row(
                  children: [
                    const Icon(Icons.location_on_rounded,
                        size: 14, color: AppColors.accent),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        [
                          if (lab.address != null &&
                              lab.address!.isNotEmpty)
                            lab.address!,
                          if (lab.city != null && lab.city!.isNotEmpty)
                            lab.city!,
                        ].join(', '),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            color: AppColors.textSecondary, fontSize: 12),
                      ),
                    ),
                    if (lab.phone != null &&
                        lab.phone!.isNotEmpty) ...[
                      const SizedBox(width: 8),
                      InkWell(
                        onTap: () async {
                          try {
                            await launchUrl(
                              Uri.parse('tel:${lab.phone}'),
                            );
                          } catch (_) {}
                        },
                        child: Container(
                          padding: const EdgeInsets.all(7),
                          decoration: BoxDecoration(
                            color: AppColors.success.withOpacity(0.14),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.phone_rounded,
                              size: 15, color: AppColors.success),
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              // ── Catálogo ─────────────────────────────────────────
              Expanded(
                child: _loading
                    ? ListView(
                        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                        children: const [
                          AppSkeleton(width: double.infinity, height: 54, radius: 16),
                          SizedBox(height: 10),
                          AppSkeleton(width: double.infinity, height: 54, radius: 16),
                          SizedBox(height: 10),
                          AppSkeleton(width: double.infinity, height: 54, radius: 16),
                        ],
                      )
                    : _exams.isEmpty
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(32),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.science_outlined,
                                      size: 44, color: AppColors.textMuted),
                                  const SizedBox(height: 14),
                                  const Text(
                                    'Catálogo em preparação',
                                    style: TextStyle(
                                        color: AppColors.textPrimary,
                                        fontWeight: FontWeight.w800,
                                        fontSize: 15),
                                  ),
                                  const SizedBox(height: 6),
                                  const Text(
                                    'Este laboratório ainda não publicou o catálogo de exames. Liga para perguntar o que tem disponível.',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                        color: AppColors.textSecondary,
                                        fontSize: 12.5),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : ListView(
                            padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                            children: [
                              for (final entry in grouped.entries) ...[
                                Padding(
                                  padding: const EdgeInsets.only(top: 12, bottom: 8),
                                  child: Text(
                                    _categoryLabel(entry.key),
                                    style: const TextStyle(
                                      color: AppColors.accent,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 0.6,
                                    ),
                                  ),
                                ),
                                ...entry.value.map(_ExamRow),
                                const SizedBox(height: 6),
                              ],
                            ],
                          ),
              ),

              // ── Barra de carrinho ────────────────────────────────
              if (_cart.isNotEmpty)
                Container(
                  margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.card.withOpacity(0.92),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: Colors.white.withOpacity(0.12)),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Text(
                            '${_cart.length} exame${_cart.length > 1 ? 's' : ''}',
                            style: const TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 12.5,
                                fontWeight: FontWeight.w600),
                          ),
                          const Spacer(),
                          Text(
                            formatMZN(_total),
                            style: const TextStyle(
                                color: AppColors.textPrimary,
                                fontSize: 16,
                                fontWeight: FontWeight.w800),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        height: 46,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          onPressed: _submitting ? null : _openSchedulingSheet,
                          icon: _submitting
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2, color: Colors.white))
                              : const Icon(Icons.schedule_rounded, size: 18),
                          label: Text(
                            _submitting ? 'A processar…' : 'Agendar e pagar',
                            style: const TextStyle(
                                fontWeight: FontWeight.w800, fontSize: 13.5),
                          ),
                        ),
                      ),
                    ],
                  ),
                )
                    .animate()
                    .fadeIn()
                    .slideY(begin: 0.25, curve: Curves.easeOut),
            ],
          ),
        ),
      ),
    );
  }

  Widget _ExamRow(LabExam exam) {
    final selected = _cart.containsKey(exam.id);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => _toggle(exam),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: selected
                ? AppColors.primary.withOpacity(0.18)
                : Colors.white.withOpacity(0.045),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: selected
                  ? AppColors.accent.withOpacity(0.55)
                  : Colors.white.withOpacity(0.08),
            ),
          ),
          child: Row(
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: selected ? AppColors.accent : Colors.transparent,
                  border: Border.all(
                    color: selected
                        ? AppColors.accent
                        : Colors.white.withOpacity(0.25),
                    width: 1.6,
                  ),
                ),
                child: selected
                    ? const Icon(Icons.check_rounded,
                        size: 14, color: Colors.white)
                    : null,
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      exam.name,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w700,
                        fontSize: 13.5,
                      ),
                    ),
                    if (exam.prepInstructions != null &&
                        exam.prepInstructions!.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          exam.prepInstructions!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: AppColors.warning.withOpacity(0.9),
                            fontSize: 11,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              Text(
                formatMZN(exam.price),
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Folha de agendamento ─────────────────────────────────────────
  void _openSchedulingSheet() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => StatefulBuilder(
        builder: (sheetCtx, setSheetState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(sheetCtx).viewInsets.bottom,
          ),
          child: Container(
            decoration: const BoxDecoration(
              color: AppColors.bgHigh,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.18),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    'Agendar colheita',
                    style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 17,
                        fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 14),
                  _Field(
                    label: 'Nome do paciente',
                    controller: _nameCtrl,
                    hint: 'Nome completo',
                  ),
                  const SizedBox(height: 10),
                  _Field(
                    label: 'Telefone',
                    controller: _phoneCtrl,
                    hint: '+258 84 123 4567',
                    keyboardType: TextInputType.phone,
                  ),
                  const SizedBox(height: 12),
                  // Colheita ao domicílio.
                  InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: () =>
                        setSheetState(() => _homeCollection = !_homeCollection),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _homeCollection
                            ? AppColors.primary.withOpacity(0.2)
                            : Colors.white.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: _homeCollection
                              ? AppColors.accent.withOpacity(0.5)
                              : Colors.white.withOpacity(0.1),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            _homeCollection
                                ? Icons.check_box_rounded
                                : Icons.check_box_outline_blank_rounded,
                            color: AppColors.accent,
                            size: 20,
                          ),
                          const SizedBox(width: 10),
                          const Expanded(
                            child: Text(
                              'Colheita ao domicílio (profissional vai a casa)',
                              style: TextStyle(
                                  color: AppColors.textPrimary,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (_homeCollection) ...[
                    const SizedBox(height: 10),
                    _Field(
                      label: 'Morada da colheita',
                      controller: _addressCtrl,
                      hint: 'Av. …, casa …',
                    ),
                    const SizedBox(height: 10),
                    _Field(
                      label: 'Cidade / bairro',
                      controller: _cityCtrl,
                      hint: 'Maputo, Polana Caniço',
                    ),
                  ],
                  const SizedBox(height: 12),
                  // Data e hora.
                  InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: () =>
                        _pickDateTime(onChanged: () => setSheetState(() {})),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                            color: Colors.white.withOpacity(0.1)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.event_rounded,
                              color: AppColors.accent, size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _scheduledAt == null
                                  ? 'Escolher data e hora (opcional)'
                                  : formatDateTime(_scheduledAt!),
                              style: TextStyle(
                                color: _scheduledAt == null
                                    ? AppColors.textSecondary
                                    : AppColors.textPrimary,
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  _Field(
                    label: 'Notas (opcional)',
                    controller: _notesCtrl,
                    hint: 'Alergias, instruções…',
                    maxLines: 2,
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      onPressed: () {
                        Navigator.of(sheetCtx).pop();
                        _checkout();
                      },
                      icon: const Icon(Icons.account_balance_wallet_rounded,
                          size: 18),
                      label: Text(
                        'Pagar ${formatMZN(_total)} da carteira',
                        style: const TextStyle(
                            fontWeight: FontWeight.w800, fontSize: 14),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Center(
                    child: Text(
                      'Débito seguro na carteira MedWallet · RPC wallet_debit',
                      style: TextStyle(
                        color: AppColors.textMuted.withOpacity(0.9),
                        fontSize: 10.5,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _categoryLabel(String raw) {
    switch (raw.toLowerCase()) {
      case 'hematologia':
        return 'HEMATOLOGIA · SANGUE';
      case 'bioquimica':
      case 'bioquímica':
        return 'BIOQUÍMICA';
      case 'serologia':
        return 'SEROLOGIA';
      case 'microbiologia':
        return 'MICROBIOLOGIA';
      case 'urina':
        return 'URINA';
      case 'imagem':
      case 'diagnostico por imagem':
        return 'IMAGIOLOGIA';
      default:
        return raw.toUpperCase();
    }
  }
}

// ── Campo de formulário da folha ─────────────────────────────────────
class _Field extends StatelessWidget {
  const _Field({
    required this.label,
    required this.controller,
    required this.hint,
    this.maxLines = 1,
    this.keyboardType,
  });

  final String label;
  final TextEditingController controller;
  final String hint;
  final int maxLines;
  final TextInputType? keyboardType;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 11.5,
              fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 5),
        TextField(
          controller: controller,
          maxLines: maxLines,
          keyboardType: keyboardType,
          style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 13.5,
              fontWeight: FontWeight.w600),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(
                color: AppColors.textMuted, fontSize: 12.5),
            filled: true,
            fillColor: Colors.white.withOpacity(0.05),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide:
                  BorderSide(color: Colors.white.withOpacity(0.1)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.accent),
            ),
          ),
        ),
      ],
    );
  }
}
