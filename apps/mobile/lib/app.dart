import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/branding/branding.dart';
import 'core/config.dart';
import 'core/router/app_router.dart';
import 'core/security/app_lock_service.dart';
import 'core/theme/app_colors.dart';
import 'core/theme/app_palette.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_controller.dart';

/// Raiz da app — F33: MODOS (sistema/claro/escuro) + paleta efectiva
/// do país (countries.branding_config). A paleta resolvida é aplicada
/// nos tokens globais (AppColors) ANTES de construir o MaterialApp, e
/// os dois temas (claro/escuro) partilham a mesma gramática visual.
/// Quando o gestor regional publica novas cores na Consola, a app veste
/// a bandeira — em ambos os modos.
class MedWalletApp extends ConsumerStatefulWidget {
  const MedWalletApp({super.key});

  @override
  ConsumerState<MedWalletApp> createState() => _MedWalletAppState();
}

class _MedWalletAppState extends ConsumerState<MedWalletApp>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  // Tema "Sistema": segue a mudança de brilho do SO em tempo real.
  @override
  void didChangePlatformBrightness() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final mode = ref.watch(appThemeModeProvider);
    final branding = ref.watch(effectivePaletteProvider);

    final platformBright =
        WidgetsBinding.instance.platformDispatcher.platformBrightness;
    final brightness = resolveBrightness(mode, platformBright);

    final palette = AppPalette.resolve(
      brightness: brightness,
      branding: branding,
    );
    // Tokens dinâmicos (AppColors.*) coerentes com o modo em toda a
    // árvore — os getters reavaliam a cada rebuild do MaterialApp.
    AppColors.apply(palette);

    // Ícones da status bar acompanham o modo (claro → ícones escuros).
    WidgetsBinding.instance.addPostFrameCallback((_) {
      SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness:
            brightness == Brightness.dark ? Brightness.light : Brightness.dark,
        statusBarBrightness: brightness, // iOS
      ));
    });

    final themeMode = switch (mode) {
      AppThemeMode.system => ThemeMode.system,
      AppThemeMode.light => ThemeMode.light,
      AppThemeMode.dark => ThemeMode.dark,
    };

    return MaterialApp.router(
      title: 'MedWallet MZ',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(palette),
      darkTheme: AppTheme.dark(palette),
      themeMode: themeMode,
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
    // F33 — durante a verificação das preferências, véu OPACO em vez da
    // app: antes o conteúdo (saldo incluído) aparecia num flash antes do
    // bloqueio — fuga de privacidade numa app de saúde.
    if (_checking) {
      return const Material(color: Color(0xFF05080F), child: SizedBox.expand());
    }
    if (!_enabled || !_locked) return widget.child;
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
