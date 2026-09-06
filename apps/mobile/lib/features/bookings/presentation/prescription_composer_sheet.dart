import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/gradient_button.dart';
import '../data/prescription_repository.dart';
import 'prescriptions_controller.dart';

/// Compositor de receita — usado pelo especialista no chat da consulta.
/// Campos por medicamento: nome, dosagem, frequência, duração e
/// instruções. Grava em `prescriptions` + `prescription_items` e
/// notifica o paciente no chat com o código de verificação.
class PrescriptionComposerSheet extends ConsumerStatefulWidget {
  const PrescriptionComposerSheet({
    super.key,
    required this.patientId,
    required this.consultationId,
  });

  final String patientId;
  final String consultationId;

  static Future<void> show(
    BuildContext context, {
    required String patientId,
    required String consultationId,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => PrescriptionComposerSheet(
        patientId: patientId,
        consultationId: consultationId,
      ),
    );
  }

  @override
  ConsumerState<PrescriptionComposerSheet> createState() =>
      _PrescriptionComposerSheetState();
}

class _PrescriptionComposerSheetState
    extends ConsumerState<PrescriptionComposerSheet> {
  final _notesCtrl = TextEditingController();
  final _items = <_ItemForm>[_ItemForm()];
  bool _saving = false;
  String? _code;
  String? _error;

  @override
  void dispose() {
    _notesCtrl.dispose();
    for (final i in _items) {
      i.dispose();
    }
    super.dispose();
  }

  bool get _valid =>
      _items.isNotEmpty &&
      _items.every((i) => i.nameCtrl.text.trim().isNotEmpty);

  Future<void> _save() async {
    if (_saving || !_valid) return;
    setState(() => _saving = true);
    try {
      final code = await ref.read(prescriptionRepositoryProvider).createPrescription(
            patientId: widget.patientId,
            consultationId: widget.consultationId,
            notes: _notesCtrl.text,
            items: [
              for (final i in _items)
                PrescriptionItemDraft(
                  medicationName: i.nameCtrl.text.trim(),
                  dosage: i.dosageCtrl.text.trim(),
                  frequency: i.freqCtrl.text.trim(),
                  duration: i.durationCtrl.text.trim(),
                  instructions: i.instructionsCtrl.text.trim(),
                ),
            ],
          );
      if (!mounted) return;
      setState(() {
        _code = code;
        _saving = false;
      });
      ref.invalidate(prescriptionsProvider);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = 'Não foi possível emitir a receita. Tenta de novo.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.9,
      ),
      decoration: const BoxDecoration(
        gradient: LinearGradient(colors: [AppColors.bgHigh, AppColors.bgDeep]),
        borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
      ),
      child: AppBackground(
        child: SafeArea(
          top: false,
          child: Padding(
            padding: EdgeInsets.fromLTRB(
                22, 18, 22, MediaQuery.viewInsetsOf(context).bottom + 20),
            child: _code != null ? _successView() : _formView(),
          ),
        ),
      ),
    );
  }

  // ── Formulário ──────────────────────────────────────────────────────

  Widget _formView() {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              const Icon(Icons.receipt_long_rounded,
                  color: AppColors.accent, size: 22),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Emitir receita',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              IconButton(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.close_rounded,
                    color: AppColors.textMuted),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'A receita fica ligada à consulta e recebe um código de '
            'verificação único, visível ao paciente.',
            style: TextStyle(
              color: Colors.white.withOpacity(0.55),
              fontSize: 12.5,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 16),

          for (var i = 0; i < _items.length; i++) ...[
            _ItemCard(
              index: i + 1,
              form: _items[i],
              onRemove: _items.length > 1
                  ? () => setState(() {
                        _items[i].dispose();
                        _items.removeAt(i);
                      })
                  : null,
            ),
            const SizedBox(height: 10),
          ],

          GlassGhostButton(
            label: 'Adicionar medicamento',
            icon: Icons.add_rounded,
            onPressed: () => setState(() => _items.add(_ItemForm())),
          ),
          const SizedBox(height: 12),

          TextField(
            controller: _notesCtrl,
            maxLines: 2,
            style: const TextStyle(color: AppColors.textPrimary),
            decoration: const InputDecoration(
              hintText: 'Observações para o paciente (opcional)',
            ),
          ),

          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!,
                style:
                    const TextStyle(color: Color(0xFFFCA5A5), fontSize: 13)),
          ],

          const SizedBox(height: 16),
          GradientButton(
            label: 'Emitir receita',
            icon: Icons.check_rounded,
            loading: _saving,
            enabled: _valid,
            onPressed: _save,
          ),
        ],
      ),
    ).animate().fadeIn(duration: 260.ms);
  }

  // ── Sucesso ─────────────────────────────────────────────────────────

  Widget _successView() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 26),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Color(0x1A22C55E),
            ),
            child: const Icon(Icons.check_circle_rounded,
                color: AppColors.success, size: 40),
          ),
          const SizedBox(height: 16),
          const Text(
            'Receita emitida!',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 19,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _code == null
                ? 'O paciente já foi notificado no chat da consulta.'
                : 'Código de verificação: $_code\nO paciente já foi '
                    'notificado no chat da consulta.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white.withOpacity(0.6),
              fontSize: 13,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 20),
          GradientButton(
            label: 'Concluir',
            icon: Icons.done_all_rounded,
            onPressed: () => Navigator.of(context).pop(),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms).scale(begin: const Offset(0.92, 0.92));
  }
}

// ── Formulário de um medicamento ────────────────────────────────────────

class _ItemForm {
  final nameCtrl = TextEditingController();
  final dosageCtrl = TextEditingController();
  final freqCtrl = TextEditingController();
  final durationCtrl = TextEditingController();
  final instructionsCtrl = TextEditingController();

  void dispose() {
    nameCtrl.dispose();
    dosageCtrl.dispose();
    freqCtrl.dispose();
    durationCtrl.dispose();
    instructionsCtrl.dispose();
  }
}

class _ItemCard extends StatelessWidget {
  const _ItemCard({
    required this.index,
    required this.form,
    this.onRemove,
  });

  final int index;
  final _ItemForm form;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                'Medicamento $index',
                style: const TextStyle(
                  color: AppColors.accent,
                  fontWeight: FontWeight.w800,
                  fontSize: 12.5,
                ),
              ),
              const Spacer(),
              if (onRemove != null)
                GestureDetector(
                  onTap: onRemove,
                  child: const Icon(Icons.delete_outline_rounded,
                      color: AppColors.danger, size: 19),
                ),
            ],
          ),
          const SizedBox(height: 10),
          TextField(
            controller: form.nameCtrl,
            style: const TextStyle(color: AppColors.textPrimary),
            decoration: const InputDecoration(hintText: 'Nome (ex.: Paracetamol)'),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: form.dosageCtrl,
                  style: const TextStyle(color: AppColors.textPrimary),
                  decoration:
                      const InputDecoration(hintText: 'Dosagem (500mg)'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: form.freqCtrl,
                  style: const TextStyle(color: AppColors.textPrimary),
                  decoration:
                      const InputDecoration(hintText: 'Frequência (3x/dia)'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          TextField(
            controller: form.durationCtrl,
            style: const TextStyle(color: AppColors.textPrimary),
            decoration:
                const InputDecoration(hintText: 'Duração (ex.: 7 dias)'),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: form.instructionsCtrl,
            style: const TextStyle(color: AppColors.textPrimary),
            decoration: const InputDecoration(
                hintText: 'Instruções (após as refeições…)'),
          ),
        ],
      ),
    );
  }
}
