import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/solidarity_repository.dart';

/// Solidariedade — paridade com `pages/Solidarity.tsx` do web:
/// campanhas de apoio médico verificadas, progresso de angariação,
/// submissão de novos pedidos e doação (carteira / M-Pesa / e-Mola).
class SolidarityScreen extends ConsumerStatefulWidget {
  const SolidarityScreen({super.key});

  @override
  ConsumerState<SolidarityScreen> createState() => _SolidarityScreenState();
}

class _SolidarityScreenState extends ConsumerState<SolidarityScreen> {
  bool _loading = true;
  List<AidRequest> _requests = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final list = await ref.read(solidarityRepositoryProvider).fetchRequests();
    if (!mounted) return;
    setState(() {
      _requests = list;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final mine = _requests.where((r) => r.isMine).toList();
    final others =
        _requests.where((r) => r.status == 'approved' && !r.isMine).toList();

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: RefreshIndicator(
            color: AppColors.accent,
            onRefresh: _load,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
              children: [
                Row(
                  children: [
                    _IconBtn(
                        icon: Icons.arrow_back_rounded,
                        onTap: () => context.pop()),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'Solidariedade',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 21,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const _HeroCard(),
                const SizedBox(height: 18),
                if (mine.isNotEmpty) ...[
                  const Text(
                    'Os meus pedidos',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 10),
                  for (final r in mine) _MyRequestCard(request: r),
                  const SizedBox(height: 18),
                ],
                const Text(
                  'Campanhas verificadas',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 10),
                if (_loading)
                  const Column(
                    children: [
                      AppSkeleton(height: 170),
                      SizedBox(height: 12),
                      AppSkeleton(height: 170),
                      SizedBox(height: 12),
                      AppSkeleton(height: 170),
                    ],
                  )
                else if (others.isEmpty)
                  const EmptyState(
                    icon: Icons.volunteer_activism_rounded,
                    title: 'Ainda sem campanhas',
                    message:
                        'Os pedidos de apoio médico verificados pela equipa MedWallet aparecem aqui.',
                  )
                else
                  for (final r in others)
                    _AidCard(
                      request: r,
                      onDonate: () => _showDonateSheet(r),
                    ).animate().fadeIn(duration: 240.ms).slideY(
                        begin: 0.04, end: 0),
              ],
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreateSheet,
        backgroundColor: AppColors.accent,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_reaction_rounded),
        label: const Text('Pedir apoio',
            style: TextStyle(fontWeight: FontWeight.w800)),
      ),
    );
  }

  Future<void> _showDonateSheet(AidRequest r) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _DonateSheet(request: r),
    );
    _load();
  }

  Future<void> _showCreateSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _CreateRequestSheet(),
    );
    _load();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Widgets
// ═══════════════════════════════════════════════════════════════════════════

class _IconBtn extends StatelessWidget {
  const _IconBtn({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.glassFill,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.glassBorder),
          ),
          child: Icon(icon, color: AppColors.textPrimary, size: 20),
        ),
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.teal.withOpacity(0.32),
            AppColors.primary.withOpacity(0.18),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.teal.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Container(
            width: 52,
            height: 52,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.teal.withOpacity(0.2),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(Icons.volunteer_activism_rounded,
                color: AppColors.teal, size: 26),
          ),
          const SizedBox(width: 14),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Ajuda quem mais precisa',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w900,
                    fontSize: 15,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Cada pedido é verificado pela equipa MedWallet antes de receber doações.',
                  style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                      height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AidCard extends StatelessWidget {
  const _AidCard({required this.request, required this.onDonate});
  final AidRequest request;
  final VoidCallback onDonate;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: request.isCritical
              ? AppColors.danger.withOpacity(0.35)
              : AppColors.glassBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (request.isVerified)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.success.withOpacity(0.14),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.verified_rounded,
                          size: 12, color: AppColors.success),
                      SizedBox(width: 4),
                      Text(
                        'Verificado',
                        style: TextStyle(
                          color: AppColors.success,
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ),
              const Spacer(),
              if (request.isCritical)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.danger.withOpacity(0.16),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'CRÍTICO',
                    style: TextStyle(
                      color: AppColors.danger,
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            request.title,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w900,
              fontSize: 15.5,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '${request.patientName}'
            '${request.patientAge != null ? ', ${request.patientAge} anos' : ''}'
            ' · ${request.hospitalName}',
            style: const TextStyle(
                color: AppColors.textSecondary, fontSize: 12.5),
          ),
          const SizedBox(height: 8),
          Text(
            request.conditionDescription,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 12.5,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: request.progress,
              minHeight: 8,
              backgroundColor: Colors.white.withOpacity(0.08),
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.teal),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: Text(
                  '${formatMZN(request.collectedAmount)} de ${formatMZN(request.goalAmount)}',
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 12.5,
                  ),
                ),
              ),
              Text(
                '${(request.progress * 100).toStringAsFixed(0)}%',
                style: const TextStyle(
                  color: AppColors.teal,
                  fontWeight: FontWeight.w900,
                  fontSize: 12.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: onDonate,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.teal,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.favorite_rounded, size: 17),
              label: const Text('Doar agora',
                  style: TextStyle(fontWeight: FontWeight.w800)),
            ),
          ),
        ],
      ),
    );
  }
}

class _MyRequestCard extends StatelessWidget {
  const _MyRequestCard({required this.request});
  final AidRequest request;

  @override
  Widget build(BuildContext context) {
    final statusColor = switch (request.status) {
      'approved' => AppColors.success,
      'pending' => AppColors.warning,
      'rejected' => AppColors.danger,
      'completed' => AppColors.info,
      _ => AppColors.textMuted,
    };
    final statusLabel = switch (request.status) {
      'approved' => 'Aprovado',
      'pending' => 'Em verificação',
      'rejected' => 'Recusado',
      'completed' => 'Concluído',
      _ => request.status,
    };
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  request.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 13.5,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  '${formatMZN(request.collectedAmount)} de ${formatMZN(request.goalAmount)}',
                  style: const TextStyle(
                      color: AppColors.textSecondary, fontSize: 11.5),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.14),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              statusLabel,
              style: TextStyle(
                color: statusColor,
                fontSize: 10.5,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Folha de doação ────────────────────────────────────────────────────────

class _DonateSheet extends ConsumerStatefulWidget {
  const _DonateSheet({required this.request});
  final AidRequest request;

  @override
  ConsumerState<_DonateSheet> createState() => _DonateSheetState();
}

class _DonateSheetState extends ConsumerState<_DonateSheet> {
  String _method = 'wallet';
  double _amount = 100;
  final _name = TextEditingController();
  final _message = TextEditingController();
  bool _saving = false;

  static const _amountChips = [50.0, 100.0, 250.0, 500.0];

  @override
  void dispose() {
    _name.dispose();
    _message.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _saving = true);
    final err = await ref.read(solidarityRepositoryProvider).donate(
          request: widget.request,
          amount: _amount,
          method: _method,
          donorName: _name.text.trim(),
          message: _message.text.trim().isEmpty ? null : _message.text.trim(),
        );
    if (!mounted) return;
    setState(() => _saving = false);
    if (err == null) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(
          _method == 'wallet'
              ? 'Doação feita! Obrigado pelo teu coração.'
              : 'Doação registada. Transfere ${formatMZN(_amount)} para confirmar.',
        ),
        backgroundColor: AppColors.success,
      ));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(err),
        backgroundColor: AppColors.warning,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding:
          EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: const BoxDecoration(
          color: AppColors.bgHigh,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
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
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Text(
                'Doar para "${widget.request.title}"',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w900,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final a in _amountChips)
                    GestureDetector(
                      onTap: () => setState(() => _amount = a),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 9),
                        decoration: BoxDecoration(
                          color: _amount == a
                              ? AppColors.teal.withOpacity(0.25)
                              : AppColors.glassFill,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: _amount == a
                                ? AppColors.teal
                                : AppColors.glassBorder,
                          ),
                        ),
                        child: Text(
                          formatMZN(a, withSymbol: false),
                          style: TextStyle(
                            color: _amount == a
                                ? Colors.white
                                : AppColors.textSecondary,
                            fontWeight: FontWeight.w900,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 16),
              const Text('Método',
                  style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                      fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              Row(
                children: [
                  for (final m in const [
                    ('wallet', 'Carteira', Icons.account_balance_wallet_rounded),
                    ('mpesa', 'M-Pesa', Icons.phone_android_rounded),
                    ('emola', 'e-Mola', Icons.phone_iphone_rounded),
                  ])
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: GestureDetector(
                          onTap: () => setState(() => _method = m.$1),
                          child: Container(
                            padding:
                                const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              color: _method == m.$1
                                  ? AppColors.teal.withOpacity(0.2)
                                  : AppColors.glassFill,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: _method == m.$1
                                    ? AppColors.teal
                                    : AppColors.glassBorder,
                              ),
                            ),
                            child: Column(
                              children: [
                                Icon(m.$3,
                                    size: 20,
                                    color: _method == m.$1
                                        ? AppColors.teal
                                        : AppColors.textSecondary),
                                const SizedBox(height: 4),
                                Text(
                                  m.$2,
                                  style: TextStyle(
                                    color: _method == m.$1
                                        ? Colors.white
                                        : AppColors.textSecondary,
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              _SheetField(controller: _name, hint: 'O teu nome (opcional)'),
              const SizedBox(height: 10),
              _SheetField(
                  controller: _message, hint: 'Mensagem de apoio (opcional)'),
              if (_method != 'wallet') ...[
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: AppColors.warning.withOpacity(0.3)),
                  ),
                  child: const Text(
                    'Registamos a tua intenção. Transfere o valor por M-Pesa/e-Mola para a conta oficial MedWallet — a confirmação actualiza o total arrecadado.',
                    style: TextStyle(
                        color: AppColors.textSecondary, fontSize: 11.5),
                  ),
                ),
              ],
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _saving ? null : _submit,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.teal,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _saving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : Text(
                          _method == 'wallet'
                              ? 'Doar ${formatMZN(_amount)} da carteira'
                              : 'Registar doação de ${formatMZN(_amount)}',
                          style:
                              const TextStyle(fontWeight: FontWeight.w800),
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

// ── Folha: pedir apoio ─────────────────────────────────────────────────────

class _CreateRequestSheet extends ConsumerStatefulWidget {
  const _CreateRequestSheet();

  @override
  ConsumerState<_CreateRequestSheet> createState() =>
      _CreateRequestSheetState();
}

class _CreateRequestSheetState extends ConsumerState<_CreateRequestSheet> {
  final _title = TextEditingController();
  final _patient = TextEditingController();
  final _age = TextEditingController();
  final _condition = TextEditingController();
  final _hospital = TextEditingController();
  final _doctor = TextEditingController();
  final _goal = TextEditingController();
  final _phone = TextEditingController();
  String _urgency = 'normal';
  bool _saving = false;

  @override
  void dispose() {
    _title.dispose();
    _patient.dispose();
    _age.dispose();
    _condition.dispose();
    _hospital.dispose();
    _doctor.dispose();
    _goal.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_title.text.trim().isEmpty ||
        _patient.text.trim().isEmpty ||
        _condition.text.trim().isEmpty ||
        _hospital.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Preenche título, paciente, condição e hospital.'),
        backgroundColor: AppColors.warning,
      ));
      return;
    }
    setState(() => _saving = true);
    final err = await ref.read(solidarityRepositoryProvider).createRequest(
          title: _title.text.trim(),
          patientName: _patient.text.trim(),
          patientAge: int.tryParse(_age.text.trim()),
          conditionDescription: _condition.text.trim(),
          hospitalName: _hospital.text.trim(),
          treatingDoctor: _doctor.text.trim(),
          urgencyLevel: _urgency,
          goalAmount: double.tryParse(_goal.text.replaceAll(',', '.')) ?? 0,
          contactPhone: _phone.text.trim(),
        );
    if (!mounted) return;
    setState(() => _saving = false);
    if (err == null) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text(
            'Pedido submetido! A equipa MedWallet vai verificar e publicar.'),
        backgroundColor: AppColors.success,
      ));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(err),
        backgroundColor: AppColors.warning,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding:
          EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.85),
        decoration: const BoxDecoration(
          color: AppColors.bgHigh,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
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
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                'Pedir apoio médico',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w900,
                  fontSize: 17,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Depois de submetido, a equipa verifica a documentação antes de publicar.',
                style: TextStyle(color: AppColors.textMuted, fontSize: 11.5),
              ),
              const SizedBox(height: 14),
              _SheetField(controller: _title, hint: 'Título do pedido *'),
              const SizedBox(height: 10),
              _SheetField(controller: _patient, hint: 'Nome do paciente *'),
              const SizedBox(height: 10),
              _SheetField(controller: _age, hint: 'Idade', keyboard: TextInputType.number),
              const SizedBox(height: 10),
              _SheetField(
                  controller: _condition,
                  hint: 'Condição médica *',
                  maxLines: 3),
              const SizedBox(height: 10),
              _SheetField(controller: _hospital, hint: 'Hospital *'),
              const SizedBox(height: 10),
              _SheetField(controller: _doctor, hint: 'Médico tratante'),
              const SizedBox(height: 10),
              _SheetField(
                  controller: _goal,
                  hint: 'Meta em MT (ex: 50000)',
                  keyboard: TextInputType.number),
              const SizedBox(height: 10),
              _SheetField(controller: _phone, hint: 'Contacto', keyboard: TextInputType.phone),
              const SizedBox(height: 14),
              Row(
                children: [
                  const Text('Urgência',
                      style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                          fontWeight: FontWeight.w800)),
                  const Spacer(),
                  for (final u in const [
                    ('normal', 'Normal'),
                    ('urgent', 'Urgente'),
                    ('critical', 'Crítico'),
                  ])
                    Padding(
                      padding: const EdgeInsets.only(left: 6),
                      child: ChoiceChip(
                        label: Text(u.$2),
                        selected: _urgency == u.$1,
                        selectedColor: AppColors.accent.withOpacity(0.3),
                        labelStyle: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          color: _urgency == u.$1
                              ? Colors.white
                              : AppColors.textSecondary,
                        ),
                        side: BorderSide(
                          color: _urgency == u.$1
                              ? AppColors.accent
                              : AppColors.glassBorder,
                        ),
                        onSelected: (_) => setState(() => _urgency = u.$1),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _saving ? null : _submit,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.accent,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _saving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Text('Submeter pedido',
                          style: TextStyle(fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SheetField extends StatelessWidget {
  const _SheetField({
    required this.controller,
    required this.hint,
    this.maxLines = 1,
    this.keyboard,
  });

  final TextEditingController controller;
  final String hint;
  final int maxLines;
  final TextInputType? keyboard;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
      keyboardType: keyboard,
      style: const TextStyle(color: AppColors.textPrimary, fontSize: 13.5),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 13),
        filled: true,
        fillColor: AppColors.glassFill,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.glassBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.accent),
        ),
      ),
    );
  }
}
