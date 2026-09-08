import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/gradient_button.dart';
import '../data/auth_repository.dart';

/// Registo: nome + telefone + email + password.
/// Os metadados alimentam `profiles` (trigger/fallback no primeiro login).
class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _loading = false;
  bool _accepted = false;
  String? _error;

  late final AuthRepository _auth =
      AuthRepository(Supabase.instance.client);

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
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
                      const Text(
                        'Criar conta',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Leva menos de 1 minuto',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.55),
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 28),
                      _field(
                        controller: _name,
                        hint: 'Nome completo',
                        icon: Icons.person_outline_rounded,
                        validator: (v) => (v == null || v.trim().length < 3)
                            ? 'Indica o teu nome'
                            : null,
                      ),
                      const SizedBox(height: 14),
                      _field(
                        controller: _phone,
                        hint: '84 123 4567',
                        icon: Icons.phone_android_rounded,
                        keyboardType: TextInputType.phone,
                        prefix: '+258 ',
                        validator: (v) => !isValidMzPhone(v ?? '')
                            ? 'Número Moçambicano inválido'
                            : null,
                      ),
                      const SizedBox(height: 14),
                      _field(
                        controller: _email,
                        hint: 'Email',
                        icon: Icons.alternate_email_rounded,
                        keyboardType: TextInputType.emailAddress,
                        validator: (v) =>
                            (v == null || !v.contains('@'))
                                ? 'Email inválido'
                                : null,
                      ),
                      const SizedBox(height: 14),
                      _field(
                        controller: _password,
                        hint: 'Password (mín. 8 caracteres)',
                        icon: Icons.lock_outline_rounded,
                        obscure: true,
                        validator: (v) =>
                            (v == null || v.length < 8)
                                ? 'Mínimo 8 caracteres'
                                : null,
                      ),
                      const SizedBox(height: 16),
                      _termsCheckbox(),
                      const SizedBox(height: 18),
                      GradientButton(
                        label: 'Criar a minha carteira',
                        icon: Icons.arrow_forward_rounded,
                        loading: _loading,
                        enabled: _accepted,
                        onPressed: _submit,
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 14),
                        Text(
                          _error!,
                          style: const TextStyle(
                              color: Color(0xFFFCA5A5), fontSize: 13),
                        ),
                      ],
                      const SizedBox(height: 20),
                      Center(
                        child: TextButton(
                          onPressed: () => context.pop(),
                          child: const Text(
                            'Já tenho conta — Entrar',
                            style: TextStyle(
                              color: AppColors.accent,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    ]
                        .animate()
                        .fadeIn(duration: 350.ms)
                        .slideY(
                          begin: 0.2,
                          duration: 350.ms,
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

  Widget _field({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
    bool obscure = false,
    String? prefix,
    String? Function(String?)? validator,
  }) =>
      TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        obscureText: obscure,
        autocorrect: false,
        validator: validator,
        style: const TextStyle(color: AppColors.textPrimary),
        decoration: InputDecoration(
          hintText: hint,
          prefixText: prefix,
          prefixStyle: const TextStyle(
              color: AppColors.textSecondary, fontWeight: FontWeight.w600),
          prefixIcon: Icon(icon),
        ),
      );

  Widget _termsCheckbox() => Row(
        children: [
          SizedBox(
            width: 26,
            height: 26,
            child: Checkbox(
              value: _accepted,
              onChanged: (v) => setState(() => _accepted = v ?? false),
              activeColor: AppColors.primary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(7),
              ),
              side: const BorderSide(color: AppColors.glassBorder),
            ),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Aceito os Termos e a Política de Privacidade da MedWallet',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5),
            ),
          ),
        ],
      );

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || !_accepted) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await _auth.signUp(
        email: _email.text.trim(),
        password: _password.text,
        fullName: _name.text.trim(),
        phone: _phone.text,
      );
      if (!mounted) return;
      if (res.session != null) {
        // Confirmação automática ativada no projeto.
        context.go('/home');
      } else {
        setState(() => _error =
            'Conta criada! Verifica o teu email para ativar antes de entrar.');
      }
    } on AuthException catch (e) {
      if (mounted) {
        final m = e.message.toLowerCase();
        setState(() => _error = m.contains('already registered')
            ? 'Já existe conta com este email. Tenta entrar.'
            : e.message);
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Falha de rede. Tenta novamente.');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}
