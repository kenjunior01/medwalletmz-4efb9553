import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/gradient_button.dart';
import '../data/auth_repository.dart';

/// Login: email + password (com atalho para entrada por SMS).
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _loading = false;
  bool _hidePassword = true;
  String? _error;

  late final AuthRepository _auth =
      AuthRepository(Supabase.instance.client);

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: true,
      body: AppBackground(
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _header(),
                      const SizedBox(height: 34),
                      _emailField(),
                      const SizedBox(height: 14),
                      _passwordField(),
                      const SizedBox(height: 22),
                      GradientButton(
                        label: 'Entrar',
                        icon: Icons.login_rounded,
                        loading: _loading,
                        onPressed: _submit,
                      ),
                      if (_error != null) _errorBox(),
                      const SizedBox(height: 18),
                      _otpShortcut(),
                      const SizedBox(height: 20),
                      _registerLink(),
                    ]
                        .animate() // stagger
                        .fadeIn(duration: 380.ms)
                        .slideY(
                          begin: 0.25,
                          duration: 380.ms,
                          curve: Curves.easeOutCubic,
                        ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _header() => Column(
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(22),
              gradient: const LinearGradient(
                colors: AppColors.heroCardGradient,
              ),
              border: Border.all(color: Colors.white.withOpacity(0.18)),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withOpacity(0.5),
                  blurRadius: 30,
                  offset: const Offset(0, 12),
                ),
              ],
            ),
            child: const Icon(Icons.health_and_safety_rounded,
                size: 36, color: Colors.white),
          ),
          const SizedBox(height: 20),
          const Text(
            'Bem-vindo de volta',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 26,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'A tua carteira de saúde em Moçambique',
            style: TextStyle(
                color: Colors.white.withOpacity(0.55), fontSize: 14),
          ),
        ],
      );

  Widget _emailField() => TextFormField(
        controller: _email,
        keyboardType: TextInputType.emailAddress,
        autocorrect: false,
        validator: (v) =>
            (v == null || !v.contains('@')) ? 'Email inválido' : null,
        style: const TextStyle(color: AppColors.textPrimary),
        decoration: const InputDecoration(
          hintText: 'Email',
          prefixIcon: Icon(Icons.alternate_email_rounded),
        ),
      );

  Widget _passwordField() => TextFormField(
        controller: _password,
        obscureText: _hidePassword,
        validator: (v) =>
            (v == null || v.length < 6) ? 'Mínimo 6 caracteres' : null,
        style: const TextStyle(color: AppColors.textPrimary),
        decoration: InputDecoration(
          hintText: 'Password',
          prefixIcon: const Icon(Icons.lock_outline_rounded),
          suffixIcon: IconButton(
            icon: Icon(
              _hidePassword
                  ? Icons.visibility_off_outlined
                  : Icons.visibility_outlined,
              color: AppColors.textMuted,
            ),
            onPressed: () =>
                setState(() => _hidePassword = !_hidePassword),
          ),
        ),
      );

  Widget _errorBox() => Padding(
        padding: const EdgeInsets.only(top: 14),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.danger.withOpacity(0.12),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.danger.withOpacity(0.35)),
          ),
          child: Row(
            children: [
              const Icon(Icons.error_outline_rounded,
                  color: AppColors.danger, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  _error!,
                  style: const TextStyle(
                      color: Color(0xFFFCA5A5), fontSize: 13),
                ),
              ),
            ],
          ),
        ),
      );

  Widget _otpShortcut() => TextButton(
        onPressed: () => context.pushReplacement('/otp', extra: ''),
        child: const Text.rich(
          TextSpan(
            text: 'Sem password? ',
            style: TextStyle(color: AppColors.textMuted, fontSize: 13.5),
            children: [
              TextSpan(
                text: 'Entrar por SMS',
                style: TextStyle(
                  color: AppColors.accent,
                  fontWeight: FontWeight.w700,
                  fontSize: 13.5,
                ),
              ),
            ],
          ),
        ),
      );

  Widget _registerLink() => Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'Ainda não tens conta?',
            style: TextStyle(
              color: Colors.white.withOpacity(0.55),
              fontSize: 13.5,
            ),
          ),
          TextButton(
            onPressed: () => context.push('/register'),
            child: const Text(
              'Criar conta',
              style: TextStyle(
                color: AppColors.accent,
                fontWeight: FontWeight.w700,
                fontSize: 13.5,
              ),
            ),
          ),
        ],
      );

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await _auth.signInWithEmail(
        email: _email.text.trim(),
        password: _password.text,
      );
      if (!mounted) return;
      if (res.session != null) {
        context.go('/home');
      } else {
        setState(() => _error = 'Confirma o teu email antes de entrar.');
      }
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = _friendly(e.message));
    } catch (_) {
      if (mounted) {
        setState(() => _error =
            'Sem ligação ao servidor. Verifica a internet e tenta de novo.');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _friendly(String msg) {
    final m = msg.toLowerCase();
    if (m.contains('invalid login') || m.contains('invalid credentials')) {
      return 'Email ou password incorretos.';
    }
    if (m.contains('email not confirmed')) {
      return 'Confirma o teu email antes de entrar.';
    }
    if (m.contains('rate limit')) {
      return 'Muitas tentativas. Aguarda 1 minuto.';
    }
    return msg;
  }
}
