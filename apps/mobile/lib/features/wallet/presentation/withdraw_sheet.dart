import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../wallet/presentation/wallet_controller.dart';

/// Levantamento de fundos via RPC `request_withdrawal`
/// (débito atómico + fundos retidos para aprovação financeira).
class WithdrawSheet extends ConsumerStatefulWidget {
  const WithdrawSheet({
    super.key,
    required this.availableBalance,
  });

  final double availableBalance;

  @override
  ConsumerState<WithdrawSheet> createState() => _WithdrawSheetState();
}

class _WithdrawSheetState extends ConsumerState<WithdrawSheet> {
  final _amount = TextEditingController();
  final _destination = TextEditingController();
  final _name = TextEditingController();
  String _method = 'mpesa';
  bool _loading = false;
  bool _done = false;
  String? _error;

  double get _value => double.tryParse(_amount.text.replaceAll(',', '.')) ?? 0;

  @override
  void dispose() {
    _amount.dispose();
    _destination.dispose();
    _name.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final inset = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: inset),
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
          const SizedBox(height: 14),
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.warning.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.warning.withOpacity(0.4)),
                ),
                child: const Icon(Icons.account_balance_rounded,
                    color: AppColors.warning, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Levantar fundos',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      'Disponível: ${formatMZN(widget.availableBalance)}',
                      style: const TextStyle(
                          color: AppColors.textMuted, fontSize: 12.5),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          TextField(
            controller: _amount,
            keyboardType:
                const TextInputType.numberWithOptions(decimal: true),
            style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 22,
                fontWeight: FontWeight.w800),
            decoration: const InputDecoration(
              hintText: 'Valor a levantar',
              suffixText: 'MT',
              suffixStyle: TextStyle(
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w700),
              prefixIcon: Icon(Icons.payments_rounded),
              contentPadding:
                  EdgeInsets.symmetric(horizontal: 18, vertical: 20),
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 14),
          _methodChips(),
          const SizedBox(height: 14),
          TextField(
            controller: _destination,
            keyboardType: _method == 'mpesa'
                ? TextInputType.phone
                : TextInputType.text,
            style: const TextStyle(color: AppColors.textPrimary),
            decoration: InputDecoration(
              hintText: _method == 'mpesa'
                  ? 'Número M-Pesa (84…)'
                  : 'IBAN / conta bancária',
              prefixIcon: Icon(_method == 'mpesa'
                  ? Icons.phone_iphone_rounded
                  : Icons.account_balance_rounded),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _name,
            style: const TextStyle(color: AppColors.textPrimary),
            decoration: const InputDecoration(
              hintText: 'Nome do titular (opcional)',
              prefixIcon: Icon(Icons.person_outline_rounded),
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
            label: 'Pedir levantamento',
            icon: Icons.local_atm_rounded,
            loading: _loading,
            enabled: _value >= 100,
            onPressed: _submit,
          ),
          const SizedBox(height: 10),
          Text(
            'Mínimo ${formatMZN(100)} · fundos ficam retidos até aprovação financeira',
            textAlign: TextAlign.center,
            style: TextStyle(
                color: Colors.white.withOpacity(0.4), fontSize: 11.5),
          ),
        ]
            .animate()
            .fadeIn(duration: 320.ms)
            .slideY(begin: 0.12, curve: Curves.easeOutCubic),
      );

  Widget _methodChips() => Row(
        children: [
          _chip('mpesa', 'M-Pesa', Icons.phone_android_rounded),
          const SizedBox(width: 10),
          _chip('bank', 'Banco', Icons.account_balance_rounded),
        ],
      );

  Widget _chip(String value, String label, IconData icon) {
    final selected = _method == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _method = value),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 13),
          decoration: BoxDecoration(
            gradient: selected
                ? const LinearGradient(colors: AppColors.buttonGradient)
                : null,
            color: selected ? null : AppColors.glassFill,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected ? Colors.white24 : AppColors.glassBorder,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon,
                  size: 17,
                  color: selected ? Colors.white : AppColors.textSecondary),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  color: selected ? Colors.white : AppColors.textSecondary,
                  fontWeight: FontWeight.w800,
                  fontSize: 13.5,
                ),
              ),
            ],
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
              gradient:
                  const LinearGradient(colors: AppColors.successGradient),
              boxShadow: [
                BoxShadow(
                  color: AppColors.success.withOpacity(0.4),
                  blurRadius: 30,
                  offset: const Offset(0, 12),
                ),
              ],
            ),
            child: const Icon(Icons.task_alt_rounded,
                color: Colors.white, size: 38),
          ).animate().scale(duration: 450.ms, curve: Curves.elasticOut),
          const SizedBox(height: 18),
          const Text(
            'Pedido registado!',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 21,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'O valor de ${formatMZN(_value)} foi debitado e fica retido '
            'até à aprovação da equipa financeira.',
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 13.5,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 24),
          GradientButton(
            label: 'Concluído',
            onPressed: () => Navigator.of(context).pop(),
          ),
        ],
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
    if (_value > widget.availableBalance) {
      setState(() => _error = 'Valor superior ao saldo disponível.');
      return;
    }
    if (_destination.text.trim().length < 8) {
      setState(() => _error = 'Indica o destino (número ou conta).');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final repo = ref.read(walletRepositoryProvider);
      await repo.requestWithdrawal(
        amount: _value,
        method: _method,
        destination: _method == 'mpesa'
            ? normalizeMzPhone(_destination.text)
            : _destination.text.trim(),
        destinationName: _name.text.trim().isEmpty ? null : _name.text.trim(),
      );
      if (mounted) setState(() => _done = true);
    } catch (e) {
      if (mounted) {
        final msg = e.toString().toLowerCase();
        setState(() => _error = msg.contains('insufficient') ||
                msg.contains('saldo')
            ? 'Saldo insuficiente para este levantamento.'
            : 'Não foi possível registar o pedido. Tenta de novo.');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}
