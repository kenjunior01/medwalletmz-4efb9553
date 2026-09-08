import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/gradient_button.dart';

/// Segurança da conta: alterar palavra-passe (com sessão activa) e
/// recuperar por e-mail (reset sem sessão — paridade com a web).
class ChangePasswordScreen extends ConsumerStatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  ConsumerState<ChangePasswordScreen> createState() =>
      _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends ConsumerState<ChangePasswordScreen> {
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();
  bool _obscure = true;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _confirm.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 8, 20, 0),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => context.pop(),
                      icon: const Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    const Text(
                      'Segurança',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(24, 16, 24, 40),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.accent.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                              color: AppColors.accent.withOpacity(0.3)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.shield_rounded,
                                color: AppColors.accent, size: 22),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                'Usa uma palavra-passe forte — ela protege o teu saldo, receitas e registos médicos.',
                                style: TextStyle(
                                  color: Colors.white.withOpacity(0.65),
                                  fontSize: 12.5,
                                  height: 1.45,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 22),
                      TextField(
                        controller: _next,
                        obscureText: _obscure,
                        style:
                            const TextStyle(color: AppColors.textPrimary),
                        decoration: InputDecoration(
                          labelText: 'Nova palavra-passe',
                          prefixIcon: const Icon(Icons.lock_outline_rounded),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscure
                                  ? Icons.visibility_rounded
                                  : Icons.visibility_off_rounded,
                              color: AppColors.textMuted,
                            ),
                            onPressed: () =>
                                setState(() => _obscure = !_obscure),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _confirm,
                        obscureText: _obscure,
                        style:
                            const TextStyle(color: AppColors.textPrimary),
                        decoration: const InputDecoration(
                          labelText: 'Confirmar nova palavra-passe',
                          prefixIcon: Icon(Icons.lock_rounded),
                        ),
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 12),
                        Text(
                          _error!,
                          style: const TextStyle(
                              color: Color(0xFFFCA5A5), fontSize: 13),
                        ),
                      ],
                      const SizedBox(height: 24),
                      GradientButton(
                        label: 'Alterar palavra-passe',
                        icon: Icons.key_rounded,
                        loading: _saving,
                        onPressed: _save,
                      ),
                      const SizedBox(height: 14),
                      TextButton(
                        onPressed: _sendResetEmail,
                        child: const Text(
                          'Esqueci-me da palavra-passe — enviar link por e-mail',
                          style: TextStyle(
                              color: AppColors.accent, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _save() async {
    final next = _next.text;
    if (next.length < 6) {
      setState(() => _error =
          'A palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }
    if (next != _confirm.text) {
      setState(() => _error = 'As palavras-passe não coincidem.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await Supabase.instance.client.auth.updateUser(
        UserAttributes(password: next),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Palavra-passe alterada com sucesso')),
        );
        context.pop();
      }
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Falha de rede. Tenta de novo.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _sendResetEmail() async {
    final email =
        Supabase.instance.client.auth.currentUser?.email?.trim();
    if (email == null || email.isEmpty) {
      setState(() => _error =
          'A tua conta não usa e-mail — usa a opção de alteração acima.');
      return;
    }
    try {
      await Supabase.instance.client.auth
          .resetPasswordForEmail(email);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(
                  'Enviámos um link de recuperação para $email')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Não foi possível enviar o e-mail agora')),
        );
      }
    }
  }
}
