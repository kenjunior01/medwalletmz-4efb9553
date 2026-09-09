import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/branding/branding.dart';
import 'core/config.dart';
import 'core/router/app_router.dart';
import 'core/security/app_lock_service.dart';
import 'core/theme/app_theme.dart';

/// Raiz da app — aplica o tema dark glassmorphism com a PALETA EFECTIVA
/// do país do utilizador (countries.branding_config). Quando o gestor
/// regional publica novas cores na Consola, a app veste a bandeira.
class MedWalletApp extends ConsumerWidget {
  const MedWalletApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final palette = ref.watch(effectivePaletteProvider);

    return MaterialApp.router(
      title: 'MedWallet MZ',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark(palette),
      themeMode: ThemeMode.dark,
      routerConfig: router,
      builder: (context, child) {
        // Aviso explícito se correr sem as dart-defines de ambiente.
        if (!AppConfig.isConfigured) {
          return _MissingConfig(child: child);
        }
        // Bloqueio biométrico (opt-in, exclusivo móvel): cobre TODA a
        // app enquanto não for desbloqueada com biometria/PIN.
        return AppLockGate(child: child ?? const SizedBox.shrink());
      },
    );
  }
}

/// Porta de segurança activada nas definições (Perfil → Segurança).
/// Estado global: `locked` quando a app perde o foco com o bloqueio
/// activo; desbloqueia com biometria/PIN do sistema.
class AppLockGate extends StatefulWidget {
  const AppLockGate({super.key, required this.child});

  final Widget child;

  @override
  State<AppLockGate> createState() => _AppLockGateState();
}

class _AppLockGateState extends State<AppLockGate> with WidgetsBindingObserver {
  bool _locked = false;
  bool _enabled = false;
  bool _checking = true;
  bool _authInProgress = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
  }

  Future<void> _load() async {
    final enabled = await AppLockService.instance.isEnabled();
    if (!mounted) return;
    setState(() {
      _enabled = enabled;
      _checking = false;
      // app a arrancar: se o bloqueio está activo, começa bloqueada.
      _locked = enabled;
    });
    if (enabled) _requestUnlock();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!_enabled) return;
    if (state == AppLifecycleState.hidden ||
        state == AppLifecycleState.paused) {
      _locked = true;
      if (mounted) setState(() {});
    } else if (state == AppLifecycleState.resumed && _locked) {
      _requestUnlock();
    }
  }

  Future<void> _requestUnlock() async {
    if (_authInProgress) return;
    _authInProgress = true;
    final ok = await AppLockService.instance.unlock();
    _authInProgress = false;
    if (!mounted) return;
    setState(() => _locked = !ok);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// Chamado pelo ecrã de bloqueio quando o utilizador desactiva o
  /// bloqueio em caso de emergência (não suportado → flag fica off).
  Future<void> refreshEnabled() async {
    final enabled = await AppLockService.instance.isEnabled();
    if (!mounted) return;
    setState(() {
      _enabled = enabled;
      if (!enabled) _locked = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_checking || !_enabled || !_locked) return widget.child;
    return _LockOverlay(
      onRetry: _requestUnlock,
      onDisable: () async {
        await AppLockService.instance.setEnabled(false);
        await refreshEnabled();
      },
    );
  }
}

class _LockOverlay extends StatelessWidget {
  const _LockOverlay({required this.onRetry, required this.onDisable});

  final VoidCallback onRetry;
  final Future<void> Function() onDisable;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFF05080F),
      child: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 88,
                  height: 88,
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      colors: [
                        const Color(0x331E6B9C),
                        const Color(0xFF05080F).withOpacity(0),
                      ],
                    ),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.health_and_safety_rounded,
                    color: Color(0xFF38BDF8),
                    size: 42,
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'MedWallet bloqueada',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Os teus dados de saúde estão protegidos.\n'
                  'Usa a impressão digital, o rosto ou o PIN do '
                  'dispositivo para continuar.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.55),
                    fontSize: 13.5,
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: 28),
                FilledButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.fingerprint_rounded),
                  label: const Text('Desbloquear'),
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: () async {
                    await onDisable();
                  },
                  child: Text(
                    'Desactivar bloqueio nesta sessão',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.4),
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MissingConfig extends StatelessWidget {
  const _MissingConfig({required this.child});

  final Widget? child;

  @override
  Widget build(BuildContext context) {
    return Banner(
      message: 'SEM CONFIG',
      location: BannerLocation.topEnd,
      color: Colors.red.shade700,
      child: child ?? const SizedBox.shrink(),
    );
  }
}
