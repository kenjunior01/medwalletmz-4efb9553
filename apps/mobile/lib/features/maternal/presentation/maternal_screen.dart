import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/maternal_repository.dart';

/// Saúde Maternal — acompanhamento da gravidez (paridade com a página
/// MaternalHealthPage da web, tabela `maternal_profiles`).
///
/// • Sem perfil → formulário de arranque: DUM (date picker) → DPP
///   calculada (Naegele), gravidez/nascimentos, tipo de sangue, risco;
/// • Com perfil → cartão de progressão (semanas, trimestre, contagem
///   para o parto) + barra do plano de 8 consultas ANC (checklist
///   tocável, atraso em laranja) + sinais vitais (TA e peso) com
///   actualização rápida;
/// • Aviso de emergência sempre visível (Liga 119).
class MaternalScreen extends ConsumerStatefulWidget {
  const MaternalScreen({super.key});

  @override
  ConsumerState<MaternalScreen> createState() => _MaternalScreenState();
}

class _MaternalScreenState extends ConsumerState<MaternalScreen> {
  MaternalProfile? _profile;
  bool _loading = true;
  String? _error;

  MaternalRepository get _repo => ref.read(maternalRepositoryProvider);

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final p = await _repo.fetchMine();
      if (!mounted) return;
      setState(() {
        _profile = p;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = '$e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDeep,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Saúde Maternal',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
      ),
      body: AppBackground(
        child: SafeArea(
          child: _loading
              ? const Padding(
                  padding: EdgeInsets.all(16),
                  child: AppSkeleton(height: 220),
                )
              : _error != null
                  ? Center(
                      child: Text(_error!,
                          style:
                              const TextStyle(color: AppColors.textSecondary)))
                  : _profile == null
                      ? _OnboardingForm(onSaved: _load)
                      : RefreshIndicator(
                          color: AppColors.accent,
                          onRefresh: _load,
                          child: ListView(
                            padding: const EdgeInsets.all(16),
                            children: [
                              _ProgressCard(profile: _profile!),
                              const SizedBox(height: 14),
                              _AncCard(profile: _profile!),
                              const SizedBox(height: 14),
                              _VitalsCard(profile: _profile!),
                              const SizedBox(height: 14),
                              const _EmergencyNote(),
                            ],
                          ),
                        ),
        ),
      ),
    );
  }
}

// ── Componentes ─────────────────────────────────────────────────────────

class _ProgressCard extends StatelessWidget {
  const _ProgressCard({required this.profile});
  final MaternalProfile profile;

  @override
  Widget build(BuildContext context) {
    final w = profile.weeksPregnant;
    final d = profile.daysToDue;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
            colors: [Color(0xFF9D5CE6), Color(0xFF6D3FC4)]),
        borderRadius: BorderRadius.circular(18),
        boxShadow: const [
          BoxShadow(color: Color(0x339D5CE6), blurRadius: 22),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text('🤰', style: TextStyle(fontSize: 30)),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      w != null ? 'Semana $w' : 'Gravidez a acompanhar',
                      style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: Colors.white),
                    ),
                    Text(
                      '${profile.trimester}'
                      '${profile.eddDate != null && d != null
                          ? ' · parto em ${formatDateShort(profile.eddDate!)} (${d >= 0 ? 'faltam $d dias' : '${-d} dias após a DPP'})'
                          : ''}',
                      style: TextStyle(
                          fontSize: 12.5, color: Colors.white.withOpacity(0.85)),
                    ),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: profile.isHighRisk
                      ? AppColors.danger
                      : profile.riskLevel == 'medium'
                          ? AppColors.warning
                          : AppColors.success,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  profile.isHighRisk
                      ? 'Risco alto'
                      : profile.riskLevel == 'medium'
                          ? 'Risco médio'
                          : 'Risco baixo',
                  style: const TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                      color: Colors.white),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              _Stat('Gravidezes', '${profile.gravida ?? '-'}'),
              _Stat('Nascimentos', '${profile.para ?? '-'}'),
              _Stat('Consultas', '${profile.ancVisitsDone}/8'),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms);
  }
}

class _Stat extends StatelessWidget {
  const _Stat(this.label, this.value);
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(value,
              style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: Colors.white)),
          Text(label,
              style: TextStyle(
                  fontSize: 11, color: Colors.white.withOpacity(0.75))),
        ],
      ),
    );
  }
}

class _AncCard extends ConsumerWidget {
  const _AncCard({required this.profile});
  final MaternalProfile profile;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Plano de consultas pré-natais (OMS)',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5)),
          const SizedBox(height: 10),
          ...profile.ancVisitsDue.map((v) {
            final color = v.done
                ? AppColors.success
                : v.isOverdue
                    ? AppColors.warning
                    : AppColors.textMuted;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () async {
                      final updated = await ref
                          .read(maternalRepositoryProvider)
                          .setVisitDone(profile, v.visit, !v.done);
                      // refresca via re-read local (simples)
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).hideCurrentSnackBar();
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                              content: Text(updated.ancVisitsDone == 8
                                  ? 'Plano completo! Parabéns 💜'
                                  : 'Consulta ${v.visit} '
                                      '${!v.done ? 'marcada como realizada' : 'reaberta'}')),
                        );
                      }
                    },
                    child: Icon(
                      v.done
                          ? Icons.check_circle_rounded
                          : Icons.radio_button_unchecked_rounded,
                      color: color,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Consulta ${v.visit}${_weekLabel(v)}',
                      style: TextStyle(
                        fontSize: 13.5,
                        color: v.done
                            ? AppColors.textMuted
                            : AppColors.textPrimary,
                        decoration:
                            v.done ? TextDecoration.lineThrough : null,
                      ),
                    ),
                  ),
                  Text(formatDateShort(v.dueDate),
                      style: TextStyle(fontSize: 12, color: color)),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  /// Semana gestacional alvo da visita — derivada da DPP
  /// (visita criada em edd − (40−w)×7 dias).
  String _weekLabel(AncVisit v) {
    final edd = profile.eddDate;
    if (edd == null) return '';
    final w = 40 - (edd.difference(v.dueDate).inDays / 7).round();
    if (w <= 0 || w > 42) return '';
    return ' · semana $w';
  }
}

class _VitalsCard extends ConsumerStatefulWidget {
  const _VitalsCard({required this.profile});
  final MaternalProfile profile;

  @override
  ConsumerState<_VitalsCard> createState() => _VitalsCardState();
}

class _VitalsCardState extends ConsumerState<_VitalsCard> {
  final _sysCtrl = TextEditingController();
  final _diaCtrl = TextEditingController();
  final _weightCtrl = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final p = widget.profile;
    if (p.lastBpSystolic != null) _sysCtrl.text = '${p.lastBpSystolic}';
    if (p.lastBpDiastolic != null) _diaCtrl.text = '${p.lastBpDiastolic}';
    if (p.lastWeightKg != null) _weightCtrl.text = '${p.lastWeightKg}';
  }

  Future<void> _save() async {
    final sys = int.tryParse(_sysCtrl.text);
    final dia = int.tryParse(_diaCtrl.text);
    final weight = double.tryParse(_weightCtrl.text.replaceAll(',', '.'));
    if (sys == null || dia == null || _saving) return;
    setState(() => _saving = true);
    try {
      await ref
          .read(maternalRepositoryProvider)
          .saveVitals(systolic: sys, diastolic: dia, weightKg: weight);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sinais vitais guardados ✓')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Falha: $e')),
      );
    }
    if (mounted) setState(() => _saving = false);
  }

  @override
  void dispose() {
    _sysCtrl.dispose();
    _diaCtrl.dispose();
    _weightCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bpHigh =
        (widget.profile.lastBpSystolic ?? 0) >= 140 ||
            (widget.profile.lastBpDiastolic ?? 0) >= 90;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Sinais vitais',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _VitalField(
                    controller: _sysCtrl, label: 'TA sistólica', hint: '120'),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _VitalField(
                    controller: _diaCtrl, label: 'TA diastólica', hint: '80'),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _VitalField(
                    controller: _weightCtrl, label: 'Peso (kg)', hint: '65'),
              ),
            ],
          ),
          if (bpHigh)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Row(
                children: const [
                  Icon(Icons.warning_amber_rounded,
                      color: AppColors.warning, size: 18),
                  SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'TA ≥ 140/90: fala com a tua unidade de saúde — pode '
                      'ser sinal de pré-eclâmpsia.',
                      style: TextStyle(
                          fontSize: 12, color: AppColors.warning, height: 1.4),
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primarySoft),
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Guardar sinais vitais'),
            ),
          ),
        ],
      ),
    );
  }
}

class _VitalField extends StatelessWidget {
  const _VitalField(
      {required this.controller, required this.label, required this.hint});
  final TextEditingController controller;
  final String label;
  final String hint;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(
                fontSize: 11.5, color: AppColors.textSecondary)),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          style: const TextStyle(fontSize: 15),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: AppColors.textMuted),
            filled: true,
            fillColor: AppColors.glassFill,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide.none,
            ),
          ),
        ),
      ],
    );
  }
}

class _EmergencyNote extends StatelessWidget {
  const _EmergencyNote();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.danger.withOpacity(0.12),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.danger.withOpacity(0.35)),
      ),
      child: const Row(
        children: [
          Icon(Icons.emergency_rounded, color: AppColors.danger, size: 22),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Sangramento, dores fortes, convulsão ou perda de líquido? '
              'Liga 119 (emergência) ou vai já à unidade de saúde.',
              style: TextStyle(
                  fontSize: 12.5, height: 1.45, color: AppColors.textPrimary),
            ),
          ),
        ],
      ),
    );
  }
}

class _OnboardingForm extends ConsumerStatefulWidget {
  const _OnboardingForm({required this.onSaved});
  final VoidCallback onSaved;

  @override
  ConsumerState<_OnboardingForm> createState() => _OnboardingFormState();
}

class _OnboardingFormState extends ConsumerState<_OnboardingForm> {
  DateTime? _lmp;
  int _gravida = 1;
  int _para = 0;
  String _bloodType = '';
  String _risk = 'low';
  bool _saving = false;

  static const _bloodTypes = [
    '', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-',
  ];

  Future<void> _pickLmp() async {
    final now = DateTime.now();
    final d = await showDatePicker(
      context: context,
      initialDate: now.subtract(const Duration(days: 60)),
      firstDate: now.subtract(const Duration(days: 300)),
      lastDate: now,
      helpText: 'Primeiro dia da última menstruação (DUM)',
    );
    if (d != null) setState(() => _lmp = d);
  }

  Future<void> _save() async {
    if (_lmp == null || _saving) return;
    setState(() => _saving = true);
    try {
      await ref.read(maternalRepositoryProvider).upsertProfile(
            lmpDate: _lmp,
            gravida: _gravida,
            para: _para,
            bloodType: _bloodType.isEmpty ? null : _bloodType,
            riskLevel: _risk,
          );
      if (!mounted) return;
      widget.onSaved();
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Falha ao guardar: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final edd = _lmp?.add(const Duration(days: 280));
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const SizedBox(height: 8),
        const Text('💜 Vamos acompanhar a tua gravidez',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        const Text(
          'Precisamos da data da última menstruação (DUM) para calcular '
          'a data provável do parto e o plano de 8 consultas pré-natais.',
          style: TextStyle(
              fontSize: 13.5, height: 1.5, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 20),
        OutlinedButton(
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.textPrimary,
            side: const BorderSide(color: AppColors.glassBorder),
            backgroundColor: AppColors.glassFill,
            padding: const EdgeInsets.symmetric(vertical: 14),
          ),
          onPressed: _pickLmp,
          child: Text(
            _lmp == null
                ? '📅 Escolher a DUM'
                : '📅 DUM: ${formatDateShort(_lmp!)}',
          ),
        ),
        if (edd != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              'Parto previsto: ${formatDateShort(edd)}',
              textAlign: TextAlign.center,
              style: const TextStyle(
                  color: AppColors.accent, fontWeight: FontWeight.w700),
            ),
          ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _Stepper(
                label: 'Gravidez nº',
                value: _gravida,
                onChanged: (v) => setState(() => _gravida = v),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _Stepper(
                label: 'Nascimentos',
                value: _para,
                onChanged: (v) => setState(() => _para = v),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _bloodTypes
              .map((b) => ChoiceChip(
                    label: Text(b.isEmpty ? 'Grupo sanguíneo?' : b),
                    selected: _bloodType == b,
                    selectedColor: AppColors.primarySoft,
                    labelStyle: TextStyle(
                        color: _bloodType == b
                            ? Colors.white
                            : AppColors.textSecondary),
                    side: const BorderSide(color: AppColors.glassBorder),
                    onSelected: (_) => setState(() => _bloodType = b),
                  ))
              .toList(),
        ),
        const SizedBox(height: 16),
        SegmentedButton<String>(
          segments: const [
            ButtonSegment(value: 'low', label: Text('Risco baixo')),
            ButtonSegment(value: 'medium', label: Text('Médio')),
            ButtonSegment(value: 'high', label: Text('Alto')),
          ],
          selected: {_risk},
          onSelectionChanged: (s) => setState(() => _risk = s.first),
        ),
        const SizedBox(height: 22),
        FilledButton(
          style: FilledButton.styleFrom(
            backgroundColor: const Color(0xFF9D5CE6),
            padding: const EdgeInsets.symmetric(vertical: 14),
          ),
          onPressed: _lmp == null || _saving ? null : _save,
          child: _saving
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2))
              : const Text('Criar plano de acompanhamento',
                  style: TextStyle(fontWeight: FontWeight.w700)),
        ),
      ],
    );
  }
}

class _Stepper extends StatelessWidget {
  const _Stepper(
      {required this.label, required this.value, required this.onChanged});
  final String label;
  final int value;
  final void Function(int) onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        children: [
          Text(label,
              style: const TextStyle(
                  fontSize: 11.5, color: AppColors.textSecondary)),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                onPressed: value > 0 ? () => onChanged(value - 1) : null,
                icon: const Icon(Icons.remove_circle_outline_rounded,
                    size: 20),
              ),
              Text('$value',
                  style: const TextStyle(
                      fontSize: 17, fontWeight: FontWeight.w800)),
              IconButton(
                onPressed: () => onChanged(value + 1),
                icon: const Icon(Icons.add_circle_outline_rounded, size: 20),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
