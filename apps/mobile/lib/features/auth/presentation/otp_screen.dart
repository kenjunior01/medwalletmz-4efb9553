import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/gradient_button.dart';
import '../data/auth_repository.dart';

/// Login por SMS: envia OTP para o telefone e verifica o código de 6 dígitos.
/// Recebe o telefone via `extra` (pode vir vazio do ecrã de login).
class OtpScreen extends StatefulWidget {
  const OtpScreen({super.key, this.initialPhone = ''});

  final String initialPhone;

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final _phone = TextEditingController();
  final _code = TextEditingController();
  final _codeFocus = FocusNode();
  bool _sending = false;
  bool _verifying = false;
  bool _sent = false;
  String? _error;

  late final AuthRepository _auth =
      AuthRepository(Supabase.instance.client);

  @override
  void initState() {
    super.initState();
    _phone.text = widget.initialPhone;
  }

  @override
  void dispose() {
    _phone.dispose();
    _code.dispose();
    _codeFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Align(
                  alignment: Alignment.centerLeft,
                  child: IconButton(
                    onPressed: () => context.pop(),
                    icon: const Icon(Icons.arrow_back_rounded,
                        color: AppColors.textPrimary),
                  ),
                ),
                const SizedBox(height: 8),
                Icon(
                  _sent ? Icons.sms_rounded : Icons.smartphone_rounded,
                  size: 56,
                  color: AppColors.accent,
                ).animate().scale(
                      duration: 400.ms,
                      curve: Curves.elasticOut,
                    ),
                const SizedBox(height: 18),
                Text(
                  _sent ? 'Introduz o código' : 'Entrar por SMS',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _sent
                      ? 'Enviámos 6 dígitos para ${maskMzPhone(_phone.text)}'
                      : 'Enviaremos um código de verificação para o teu número',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.55),
                    fontSize: 13.5,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 32),
                if (!_sent) ...[
                  TextField(
                    controller: _phone,
                    keyboardType: TextInputType.phone,
                    autocorrect: false,
                    style: const TextStyle(
                        color: AppColors.textPrimary, fontSize: 18),
                    decoration: const InputDecoration(
                      hintText: '84 123 4567',
                      prefixText: '+258 ',
                      prefixStyle: TextStyle(
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w600,
                        fontSize: 18,
                      ),
                      prefixIcon: Icon(Icons.phone_android_rounded),
                    ),
                  ),
                  const SizedBox(height: 22),
                  GradientButton(
                    label: 'Enviar código',
                    icon: Icons.send_rounded,
                    loading: _sending,
                    onPressed: _send,
                  ),
                ] else ...[
                  _codeBox(),
                  const SizedBox(height: 22),
                  GradientButton(
                    label: 'Verificar e entrar',
                    icon: Icons.verified_rounded,
                    loading: _verifying,
                    onPressed: _verify,
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: _sending ? null : _send,
                    child: const Text(
                      'Reenviar código',
                      style: TextStyle(color: AppColors.accent),
                    ),
                  ),
                ],
                if (_error != null) ...[
                  const SizedBox(height: 14),
                  Text(
                    _error!,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        color: Color(0xFFFCA5A5), fontSize: 13),
                  ),
                ],
              ]
                  .animate(interval: 50.ms)
                  .fadeIn(duration: 350.ms)
                  .slideY(begin: 0.15, curve: Curves.easeOutCubic),
            ),
          ),
        ),
      ),
    );
  }

  Widget _codeBox() => Container(
        decoration: BoxDecoration(
          color: AppColors.glassFill,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: TextField(
          controller: _code,
          focusNode: _codeFocus,
          keyboardType: TextInputType.number,
          maxLength: 6,
          autofocus: true,
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontSize: 30,
            fontWeight: FontWeight.w800,
            letterSpacing: 14,
          ),
          decoration: const InputDecoration(
            counterText: '',
            border: InputBorder.none,
            hintText: '••••••',
            hintStyle: TextStyle(color: AppColors.textMuted, letterSpacing: 14),
            contentPadding: EdgeInsets.symmetric(vertical: 18),
          ),
          onChanged: (v) {
            if (v.length == 6) _verify();
          },
        ),
      );

  bool get _phoneValid => isValidMzPhone(_phone.text);

  Future<void> _send() async {
    if (!_phoneValid) {
      setState(() => _error = 'Número Moçambicano inválido');
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await _auth.sendOtp(phone: _phone.text);
      if (mounted) setState(() => _sent = true);
    } catch (_) {
      if (mounted) {
        setState(() =>
            _error = 'Não foi possível enviar o SMS. Tenta de novo.');
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _verify() async {
    if (_code.text.trim().length < 6) {
      setState(() => _error = 'O código tem 6 dígitos.');
      return;
    }
    setState(() {
      _verifying = true;
      _error = null;
    });
    try {
      final res = await _auth.verifyOtp(
        phone: _phone.text,
        token: _code.text,
      );
      if (mounted && res.session != null) context.go('/home');
    } on AuthException catch (e) {
      if (mounted) {
        setState(() => _error = e.message.toLowerCase().contains('expired')
            ? 'Código expirado. Reenvia.'
            : 'Código incorreto. Confere e tenta de novo.');
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'Falha de rede. Tenta de novo.');
    } finally {
      if (mounted) setState(() => _verifying = false);
    }
  }
}
