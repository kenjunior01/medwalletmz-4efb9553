import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/gradient_button.dart';
import '../data/triage_models.dart';
import 'triage_controller.dart';

/// Saída do wizard transportada para o ecrã de resultado.
class TriageOutcome {
  const TriageOutcome({required this.result, this.specialty});

  final TriageResult result;
  final Object? specialty;
}

/// Assistente de triagem em 5 passos — o máximo completo possível:
/// contexto do paciente → sintomas por área do corpo → duração →
/// severidade → revisão. Grava em `triage_logs` e recomenda a
/// especialidade para dar sequência à consulta.
class TriageScreen extends ConsumerStatefulWidget {
  const TriageScreen({super.key});

  @override
  ConsumerState<TriageScreen> createState() => _TriageScreenState();
}

class _TriageScreenState extends ConsumerState<TriageScreen> {
  int _step = 0;
  static const _totalSteps = 5;

  final _ageCtrl = TextEditingController();
  final _freeTextCtrl = TextEditingController();

  // Respostas.
  int? _age;
  final Set<String> _symptoms = {};
  String _duration = triageDurations[1];
  String _severity = 'moderada';
  final Set<String> _contexts = {};

  String? _expandedArea;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _expandedArea = triageSymptomGroups.first.area;
  }

  @override
  void dispose() {
    _ageCtrl.dispose();
    _freeTextCtrl.dispose();
    super.dispose();
  }

  bool get _canAdvance {
    switch (_step) {
      case 0:
        return _age == null || (_age! >= 0 && _age! <= 120);
      case 1:
        return _symptoms.isNotEmpty;
      case 3:
        return true;
      default:
        return true;
    }
  }

  TriageDraft get _draft => TriageDraft(
        symptoms: _symptoms.toList(),
        age: _age,
        duration: _duration,
        severity: _severity,
        contexts: _contexts.toList(),
        freeText: _freeTextCtrl.text,
      );

  Future<void> _submit() async {
    if (_submitting) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final (result, specialty) =
          await ref.read(triageRepositoryProvider).submit(_draft);
      if (!mounted) return;
      context.pushReplacement('/triage-result',
          extra: TriageOutcome(result: result, specialty: specialty));
    } catch (_) {
      if (!mounted) return;
      setState(() =>
          _error = 'Não foi possível concluir a triagem. Tenta de novo.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              // ── Cabeçalho + progresso ────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 20, 0),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () {
                        if (_step > 0) {
                          setState(() => _step -= 1);
                        } else {
                          context.pop();
                        }
                      },
                      icon: const Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    const Expanded(
                      child: Text(
                        'Triagem Inteligente',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    Text(
                      'Passo ${_step + 1} de $_totalSteps',
                      style: const TextStyle(
                        color: AppColors.accent,
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: (_step + 1) / _totalSteps,
                    minHeight: 6,
                    backgroundColor: Colors.white.withOpacity(0.08),
                    valueColor:
                        const AlwaysStoppedAnimation(AppColors.accent),
                  ),
                ),
              ),
              Expanded(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 280),
                  child: ListView(
                    key: ValueKey(_step),
                    padding: const EdgeInsets.fromLTRB(20, 18, 20, 40),
                    children: [_stepBody()],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Corpo por passo ────────────────────────────────────────────────

  Widget _stepBody() {
    switch (_step) {
      case 0:
        return _stepContext();
      case 1:
        return _stepSymptoms();
      case 2:
        return _stepDuration();
      case 3:
        return _stepSeverity();
      default:
        return _stepReview();
    }
  }

  Widget _stepContext() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _StepTitle(
            emoji: '👤',
            title: 'Sobre ti',
            subtitle:
                'A idade ajuda a calibrar a urgência e a especialidade '
                'recomendada. Tudo fica guardado no teu histórico.'),
        const SizedBox(height: 16),
        TextField(
          controller: _ageCtrl,
          keyboardType: TextInputType.number,
          maxLength: 3,
          style: const TextStyle(color: AppColors.textPrimary),
          onChanged: (v) => _age = int.tryParse(v),
          decoration: const InputDecoration(
            hintText: 'Idade (anos)',
            counterText: '',
          ),
        ),
        const SizedBox(height: 18),
        const Text(
          'Contexto adicional (opcional)',
          style: TextStyle(
            color: AppColors.textMuted,
            fontSize: 11,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.1,
          ),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final c in triageContextOptions)
              _SelectChip(
                label: c,
                selected: _contexts.contains(c),
                onTap: () => setState(() {
                  _contexts.contains(c)
                      ? _contexts.remove(c)
                      : _contexts.add(c);
                }),
              ),
          ],
        ),
        const SizedBox(height: 24),
        _NavButtons(
          canAdvance: _canAdvance,
          isLast: false,
          onBack: () => context.pop(),
          onNext: () => setState(() => _step = 1),
        ),
      ],
    ).animate().fadeIn(duration: 250.ms);
  }

  Widget _stepSymptoms() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _StepTitle(
            emoji: '🩺',
            title: 'O que estás a sentir?',
            subtitle:
                'Toca numa área para abrir os sintomas comuns e escolhe '
                'todos os que se aplicam.'),
        const SizedBox(height: 14),
        ...triageSymptomGroups.map((group) {
          final open = _expandedArea == group.area;
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            decoration: BoxDecoration(
              color: AppColors.glassFill,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: open
                    ? const Color(0x4438BDF8)
                    : AppColors.glassBorder,
              ),
            ),
            child: Column(
              children: [
                InkWell(
                  borderRadius: BorderRadius.circular(16),
                  onTap: () => setState(() => _expandedArea =
                      open ? null : group.area),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        Text(group.emoji,
                            style: const TextStyle(fontSize: 18)),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            group.area,
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.w700,
                              fontSize: 13.5,
                            ),
                          ),
                        ),
                        AnimatedRotation(
                          turns: open ? 0.5 : 0,
                          duration: const Duration(milliseconds: 200),
                          child: const Icon(Icons.expand_more_rounded,
                              color: AppColors.textMuted, size: 20),
                        ),
                      ],
                    ),
                  ),
                ),
                if (open)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final s in group.symptoms)
                          _SelectChip(
                            label: s,
                            selected: _symptoms.contains(s),
                            onTap: () => setState(() {
                              _symptoms.contains(s)
                                  ? _symptoms.remove(s)
                                  : _symptoms.add(s);
                            }),
                          ),
                      ],
                    ),
                  ),
              ],
            ),
          );
        }),
        if (_symptoms.isNotEmpty) ...[
          const SizedBox(height: 6),
          Text(
            '${_symptoms.length} sintoma(s) seleccionado(s)',
            style: const TextStyle(
              color: AppColors.accent,
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
        const SizedBox(height: 20),
        _NavButtons(
          canAdvance: _canAdvance,
          isLast: false,
          onBack: () => setState(() => _step = 0),
          onNext: () => setState(() => _step = 2),
        ),
      ],
    ).animate().fadeIn(duration: 250.ms);
  }

  Widget _stepDuration() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _StepTitle(
            emoji: '⏱️',
            title: 'Desde quando?',
            subtitle:
                'Durações longas pedem avaliação mais cedo — a IA usa '
                'isto para calcular a urgência.'),
        const SizedBox(height: 16),
        ...triageDurations.map((d) => _OptionRow(
              label: d,
              selected: _duration == d,
              onTap: () => setState(() => _duration = d),
            )),
        const SizedBox(height: 22),
        const _StepTitle(
            emoji: '📝',
            title: 'Queres detalhar mais?',
            subtitle:
                'Escreve livremente o que sentes — quanto mais contexto, '
                'melhor a orientação.'),
        const SizedBox(height: 12),
        TextField(
          controller: _freeTextCtrl,
          maxLines: 4,
          style: const TextStyle(color: AppColors.textPrimary),
          decoration: const InputDecoration(
            hintText:
                'Ex.: a dor piora à noite, já tomei paracetamol sem efeito…',
          ),
        ),
        const SizedBox(height: 24),
        _NavButtons(
          canAdvance: true,
          isLast: false,
          onBack: () => setState(() => _step = 1),
          onNext: () => setState(() => _step = 3),
        ),
      ],
    ).animate().fadeIn(duration: 250.ms);
  }

  Widget _stepSeverity() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _StepTitle(
            emoji: '📊',
            title: 'Como afecta o teu dia?',
            subtitle:
                'A severidade define a prioridade da recomendação e os '
                'sinais de alarme a vigiar.'),
        const SizedBox(height: 16),
        ...triageSeverityOptions.map((opt) {
          final (key, label, desc, icon) = opt;
          final selected = _severity == key;
          final color = switch (key) {
            'leve' => AppColors.success,
            'moderada' => AppColors.accent,
            'severa' => AppColors.warning,
            _ => AppColors.danger,
          };
          return GestureDetector(
            onTap: () => setState(() => _severity = key),
            child: Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: selected
                    ? color.withOpacity(0.12)
                    : AppColors.glassFill,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: selected
                      ? color.withOpacity(0.6)
                      : AppColors.glassBorder,
                ),
              ),
              child: Row(
                children: [
                  Icon(icon, color: color, size: 24),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          label,
                          style: TextStyle(
                            color: selected ? color : AppColors.textPrimary,
                            fontWeight: FontWeight.w800,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          desc,
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.55),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (selected)
                    Icon(Icons.check_circle_rounded, color: color, size: 20),
                ],
              ),
            ),
          );
        }),
        const SizedBox(height: 20),
        _NavButtons(
          canAdvance: true,
          isLast: false,
          onBack: () => setState(() => _step = 2),
          onNext: () => setState(() => _step = 4),
        ),
      ],
    ).animate().fadeIn(duration: 250.ms);
  }

  Widget _stepReview() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _StepTitle(
            emoji: '🚀',
            title: 'Tudo pronto',
            subtitle:
                'Revisa o resumo. Ao enviar, a IA analisa e recomenda a '
                'especialidade certa para a tua consulta.'),
        const SizedBox(height: 16),
        _ReviewRow(label: 'Idade', value: _age?.toString() ?? '—'),
        _ReviewRow(
            label: 'Sintomas', value: _symptoms.join(', ')),
        if (_freeTextCtrl.text.trim().isNotEmpty)
          _ReviewRow(label: 'Detalhes', value: _freeTextCtrl.text.trim()),
        _ReviewRow(label: 'Duração', value: _duration),
        _ReviewRow(label: 'Severidade', value: _severity),
        if (_contexts.isNotEmpty)
          _ReviewRow(label: 'Contexto', value: _contexts.join(', ')),
        const SizedBox(height: 22),
        GradientButton(
          label: 'Analisar com IA',
          icon: Icons.auto_awesome_rounded,
          loading: _submitting,
          enabled: true,
          onPressed: _submit,
        ),
        const SizedBox(height: 10),
        GlassGhostButton(
          label: 'Voltar e editar',
          icon: Icons.edit_rounded,
          onPressed: () => setState(() => _step = 3),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(_error!,
              style: const TextStyle(
                  color: Color(0xFFFCA5A5), fontSize: 13)),
        ],
      ],
    ).animate().fadeIn(duration: 250.ms);
  }
}

// ── Peças reutilizadas pelo wizard ──────────────────────────────────────

class _StepTitle extends StatelessWidget {
  const _StepTitle({
    required this.emoji,
    required this.title,
    required this.subtitle,
  });

  final String emoji;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(emoji, style: const TextStyle(fontSize: 22)),
            const SizedBox(width: 10),
            Text(
              title,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 19,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          subtitle,
          style: TextStyle(
            color: Colors.white.withOpacity(0.55),
            fontSize: 13,
            height: 1.45,
          ),
        ),
      ],
    );
  }
}

class _SelectChip extends StatelessWidget {
  const _SelectChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 8),
        decoration: BoxDecoration(
          color: selected
              ? const Color(0x2E38BDF8)
              : Colors.white.withOpacity(0.04),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected
                ? const Color(0x6638BDF8)
                : Colors.white.withOpacity(0.1),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? AppColors.accent : AppColors.textSecondary,
            fontSize: 12.5,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

class _OptionRow extends StatelessWidget {
  const _OptionRow({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        decoration: BoxDecoration(
          color: selected
              ? const Color(0x1A38BDF8)
              : AppColors.glassFill,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected
                ? const Color(0x5538BDF8)
                : AppColors.glassBorder,
          ),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: selected
                      ? AppColors.textPrimary
                      : AppColors.textSecondary,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                  fontSize: 13.5,
                ),
              ),
            ),
            Icon(
              selected
                  ? Icons.radio_button_checked_rounded
                  : Icons.radio_button_off_rounded,
              color: selected ? AppColors.accent : AppColors.textMuted,
              size: 19,
            ),
          ],
        ),
      ),
    );
  }
}

class _ReviewRow extends StatelessWidget {
  const _ReviewRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 86,
            child: Text(
              label,
              style: const TextStyle(
                color: AppColors.textMuted,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value.isEmpty ? '—' : value,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 12.8,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NavButtons extends StatelessWidget {
  const _NavButtons({
    required this.canAdvance,
    required this.isLast,
    required this.onBack,
    required this.onNext,
  });

  final bool canAdvance;
  final bool isLast;
  final VoidCallback onBack;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: GlassGhostButton(
            label: 'Voltar',
            icon: Icons.arrow_back_rounded,
            onPressed: onBack,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: GradientButton(
            label: 'Continuar',
            icon: Icons.arrow_forward_rounded,
            enabled: canAdvance,
            onPressed: canAdvance ? onNext : null,
          ),
        ),
      ],
    );
  }
}
