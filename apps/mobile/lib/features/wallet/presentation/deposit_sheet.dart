import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/gradient_button.dart';
import '../data/wallet_repository.dart';
import 'wallet_controller.dart';

/// Depósito multi-método: escolhe o método (M-Pesa, e-Mola, mKesh,
/// Banco) a partir das contas activas da plataforma, cria o pedido
/// manual com referência e mostra as instruções + comprovativo
/// opcional. O saldo entra quando a gestão confirma (realtime).
class DepositSheet extends ConsumerStatefulWidget {
  const DepositSheet({
    super.key,
    required this.userId,
    required this.payerName,
    this.payerPhone,
  });

  final String userId;
  final String payerName;
  final String? payerPhone;

  @override
  ConsumerState<DepositSheet> createState() => _DepositSheetState();
}

class _DepositSheetState extends ConsumerState<DepositSheet> {
  static const _quick = [100, 250, 500, 1000, 2000, 5000];

  double _amount = 0;
  final _custom = TextEditingController();
  final _phone = TextEditingController();
  bool _loading = false;
  bool _uploadingProof = false;
  List<PlatformAccount>? _accounts;
  int _accountIdx = 0;
  String? _reference; // não-nulo → ecrã de sucesso
  String? _error;

  @override
  void initState() {
    super.initState();
    _phone.text = widget.payerPhone != null && widget.payerPhone!.length > 8
        ? widget.payerPhone!.substring(widget.payerPhone!.length - 9)
        : '';
    _loadAccounts();
  }

  @override
  void dispose() {
    _custom.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _loadAccounts() async {
    try {
      final accs =
          await ref.read(walletRepositoryProvider).fetchPaymentAccounts();
      if (mounted) setState(() => _accounts = accs);
    } catch (_) {
      if (mounted) {
        setState(() => _accounts = PlatformAccount.fallback());
      }
    }
  }

  PlatformAccount get _account {
    final accs = _accounts ?? PlatformAccount.fallback();
    return accs[_accountIdx.clamp(0, accs.length - 1)];
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
          border: Border(
            top: BorderSide(color: AppColors.glassBorder),
          ),
        ),
        child: SafeArea(
          top: false,
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 14, 24, 26),
            child: _reference == null ? _form() : _success(),
          ),
        ),
      ),
    );
  }

  // ── Formulário ────────────────────────────────────────────────────
  Widget _form() => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _grabber(),
          const SizedBox(height: 14),
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.success.withOpacity(0.16),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                      color: AppColors.success.withOpacity(0.4)),
                ),
                child: const Icon(Icons.phone_android_rounded,
                    color: AppColors.success, size: 22),
              ),
              const SizedBox(width: 14),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Depositar',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Sem taxas · entra no saldo após confirmação',
                      style: TextStyle(
                          color: AppColors.textMuted, fontSize: 12.5),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          // ── Escolha do método ────────────────────────────────────────
          if (_accounts == null)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(8),
                child: SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            )
          else if ((_accounts!.length) > 1)
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (var i = 0; i < _accounts!.length; i++)
                  _methodChip(i),
              ],
            ).animate().fadeIn(duration: 280.ms),
          const SizedBox(height: 18),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: _quick
                .map((v) => _chip(v))
                .toList(),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _custom,
            keyboardType:
                const TextInputType.numberWithOptions(decimal: true),
            style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 22,
                fontWeight: FontWeight.w800),
            decoration: InputDecoration(
              hintText: 'Outro valor',
              suffixText: 'MT',
              suffixStyle: const TextStyle(
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w700),
              prefixIcon: const Icon(Icons.payments_rounded),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
            ),
            onChanged: (v) {
              final parsed = double.tryParse(v.replaceAll(',', '.'));
              setState(() => _amount = parsed ?? 0);
            },
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            style: const TextStyle(color: AppColors.textPrimary),
            decoration: const InputDecoration(
              hintText: 'Teu número (84…)',
              prefixText: '+258 ',
              prefixStyle: TextStyle(
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w600),
              prefixIcon: Icon(Icons.phone_iphone_rounded),
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
            label: 'Criar pedido de depósito',
            icon: Icons.lock_rounded,
            loading: _loading,
            enabled: _amount >= 10 && isValidMzPhone('+258${_phone.text}'),
            onPressed: _submit,
          ),
          const SizedBox(height: 10),
          Text(
            'Valor mínimo: ${formatMZN(10)}',
            textAlign: TextAlign.center,
            style: TextStyle(
                color: Colors.white.withOpacity(0.4), fontSize: 11.5),
          ),
        ],
      );

  Widget _methodChip(int idx) {
    final acc = _accounts![idx];
    final selected = idx == _accountIdx;
    return GestureDetector(
      onTap: () => setState(() => _accountIdx = idx),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 170),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          gradient: selected
              ? LinearGradient(colors: [acc.color, acc.color])
              : null,
          color: selected ? null : AppColors.glassFill,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? acc.color : AppColors.glassBorder,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(acc.icon,
                size: 16,
                color: selected ? Colors.white : acc.color),
            const SizedBox(width: 6),
            Text(
              acc.methodLabel,
              style: TextStyle(
                color: selected ? Colors.white : AppColors.textSecondary,
                fontSize: 12.5,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _chip(int value) {
    final selected = _amount == value;
    return GestureDetector(
      onTap: () {
        _custom.clear();
        setState(() => _amount = value.toDouble());
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOut,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        decoration: BoxDecoration(
          gradient: selected ? const LinearGradient(colors: AppColors.buttonGradient) : null,
          color: selected ? null : AppColors.glassFill,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? Colors.white24 : AppColors.glassBorder,
          ),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: AppColors.primary.withOpacity(0.45),
                    blurRadius: 18,
                    offset: const Offset(0, 8),
                  ),
                ]
              : null,
        ),
        child: Text(
          formatMZN(value, withSymbol: false),
          style: TextStyle(
            color: selected ? Colors.white : AppColors.textSecondary,
            fontWeight: FontWeight.w800,
            fontSize: 14.5,
          ),
        ),
      ),
    );
  }

  // ── Sucesso ───────────────────────────────────────────────────────
  Widget _success() => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _grabber(),
          const SizedBox(height: 20),
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
            child: const Icon(Icons.check_rounded, color: Colors.white, size: 40),
          ).animate().scale(duration: 450.ms, curve: Curves.elasticOut),
          const SizedBox(height: 18),
          const Text(
            'Pedido criado!',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 22),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.glassFill,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.glassBorder),
            ),
            child: Column(
              children: [
                _row('Valor', formatMZN(_amount)),
                _row('Referência', _reference!, mono: true),
                _row('Método', _account.methodLabel),
                _row('Pagar para', _account.accountNumber, mono: true),
                if (_account.accountName.isNotEmpty)
                  _row('Nome da conta', _account.accountName),
              ],
            ),
          ),
          if (_account.instructions != null &&
              _account.instructions!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.accent.withOpacity(0.08),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.accent.withOpacity(0.3)),
              ),
              child: Text(
                _account.instructions!,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.65),
                  fontSize: 12.5,
                  height: 1.5,
                ),
              ),
            ),
          ],
          const SizedBox(height: 18),
          Text(
            'Como concluir:',
            style: TextStyle(
              color: Colors.white.withOpacity(0.6),
              fontWeight: FontWeight.w700,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 10),
          _step('1', 'Abre o ${_account.methodLabel} no teu telefone.'),
          _step('2', 'Envia ${formatMZN(_amount)} para ${_account.accountNumber}.'),
          _step('3', 'Usa a referência acima na descrição, se possível.'),
          _step('4',
              'Anexa o comprovativo abaixo (opcional) — acelera a confirmação.'),
          const SizedBox(height: 14),
          _proofTile(),
          const SizedBox(height: 18),
          GradientButton(
            label: 'Concluído',
            onPressed: () => Navigator.of(context).pop(),
          ),
        ],
      );

  Widget _proofTile() {
    if (_proofPath != null) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.success.withOpacity(0.1),
          borderRadius: BorderRadius.circular(13),
          border: Border.all(color: AppColors.success.withOpacity(0.35)),
        ),
        child: Row(
          children: [
            const Icon(Icons.check_circle_rounded,
                color: AppColors.success, size: 20),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                'Comprovativo anexado ao pedido',
                style: TextStyle(
                    color: AppColors.textSecondary, fontSize: 12.5),
              ),
            ),
          ],
        ),
      );
    }
    return GestureDetector(
      onTap: _uploadingProof ? null : _pickProof,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        decoration: BoxDecoration(
          color: AppColors.glassFill,
          borderRadius: BorderRadius.circular(13),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: Row(
          children: [
            _uploadingProof
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.camera_alt_rounded,
                    color: AppColors.accent, size: 20),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                'Anexar foto do comprovativo (opcional)',
                style: TextStyle(
                    color: AppColors.textSecondary, fontSize: 12.5),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String? _proofPath;

  Future<void> _pickProof() async {
    if (_reference == null) return;
    try {
      final picked = await ImagePicker().pickImage(
        source: ImageSource.gallery,
        imageQuality: 70,
        maxWidth: 1600,
      );
      if (picked == null) return;
      setState(() => _uploadingProof = true);
      final bytes = await picked.readAsBytes();
      final ext = picked.name.split('.').last.toLowerCase();
      final path = await ref
          .read(walletRepositoryProvider)
          .uploadProof(_reference!, bytes, ext: ext);
      if (mounted) {
        setState(() {
          _proofPath = path;
        });
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Não foi possível anexar o comprovativo')),
        );
      }
    } finally {
      if (mounted) setState(() => _uploadingProof = false);
    }
  }

  Widget _step(String n, String text) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 22,
              height: 22,
              alignment: Alignment.center,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.primary,
              ),
              child: Text(
                n,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                text,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 13.5,
                  height: 1.4,
                ),
              ),
            ),
          ],
        ),
      );

  Widget _row(String label, String value, {bool mono = false}) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Row(
          children: [
            Text(
              label,
              style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
            ),
            const Spacer(),
            Flexible(
              child: Text(
                value,
                textAlign: TextAlign.right,
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  fontFamily: mono ? 'monospace' : null,
                ),
              ),
            ),
          ],
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

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final reference = await ref.read(walletRepositoryProvider).createDeposit(
            amount: _amount,
            payerName: widget.payerName,
            payerPhone: normalizeMzPhone(_phone.text),
            account: _account,
          );
      if (mounted) setState(() => _reference = reference);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Não foi possível criar o pedido. Tenta de novo.');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}
