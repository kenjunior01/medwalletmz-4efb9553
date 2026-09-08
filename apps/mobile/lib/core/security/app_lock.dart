import 'dart:convert';
import 'dart:io';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../theme/app_colors.dart';

/// ── Bloqueio biométrico da app (EXCLUSIVO MÓVEL) ─────────────────────
///
/// Quando activado nas Definições, a app exige impressão digital /
/// FaceID / credencial do dispositivo (PIN, padrão) sempre que volta do
/// segundo plano ou é reaberta. A chave nunca sai do dispositivo:
/// apenas a preferência "ligado/desligado" é guardada localmente.
///
/// Nota técnica: [LocalAuthentication] exige uma FlutterFragmentActivity
/// (MainActivity.kt já convertida) e a permissão USE_BIOMETRIC no
/// AndroidManifest.

class AppLock {
  AppLock._();
  static final AppLock instance = AppLock._();

  static const _fileName = 'medwallet_app_lock.json';

  final LocalAuthentication _auth = LocalAuthentication();

  bool? _enabled;

  /// Estado reactivo do bloqueio (o perfil escuta para o interruptor).
  final ValueNotifier<bool> enabledNotifier = ValueNotifier<bool>(false);

  /// Estado de bloqueio actual — o gate em volta da app observa.
  final ValueNotifier<bool> lockedNotifier = ValueNotifier<bool>(false);

  bool _loaded = false;

  Future<void> _load() async {
    if (_loaded) return;
    _loaded = true;
    try {
      final dir = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/$_fileName');
      if (file.existsSync()) {
        final map = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
        _enabled = map['enabled'] == true;
      }
    } catch (_) {
      _enabled = null;
    }
    enabledNotifier.value = _enabled ?? false;
  }

  bool get isEnabled => _enabled ?? false;

  Future<void> setEnabled(bool value) async {
    _enabled = value;
    enabledNotifier.value = value;
    try {
      final dir = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/$_fileName');
      file.writeAsStringSync(jsonEncode({'enabled': value}), flush: true);
    } catch (_) {}
  }

  /// O dispositivo tem biometria (ou credencial de ecrã) registada?
  Future<bool> canAuthenticate() async {
    try {
      final supported = await _auth.isDeviceSupported();
      final canCheck = await _auth.canCheckBiometrics;
      return supported || canCheck;
    } catch (_) {
      return false;
    }
  }

  /// Pede desbloqueio. Devolve true se o utilizador passou o desafio.
  Future<bool> authenticate() async {
    try {
      return await _auth.authenticate(
        localizedReason:
            'Desbloqueia a MedWallet para veres a tua saúde e carteira',
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: false, // permite PIN/padrão do dispositivo
        ),
      );
    } on PlatformException {
      return false;
    } catch (_) {
      return false;
    }
  }

  /// Bloqueia de imediato (chamado quando a app vai para segundo plano).
  void lockIfEnabled() {
    if (isEnabled && _hasSession) lockedNotifier.value = true;
  }

  bool get _hasSession =>
      Supabase.instance.client.auth.currentSession != null;

  /// Tenta desbloquear automaticamente (chamado ao voltar à app).
  Future<void> unlockInteractive() async {
    if (!lockedNotifier.value) return;
    final ok = await authenticate();
    if (ok) lockedNotifier.value = false;
  }

  /// Inicialização no arranque: carrega preferência e aplica bloqueio
  /// inicial se estava activo.
  Future<void> ensureInitialized() async {
    await _load();
    if (isEnabled && _hasSession) lockedNotifier.value = true;
  }
}

/// ── Gate visual ──────────────────────────────────────────────────────
///
/// Envolto em volta da aplicação (`MedWalletApp`): quando [AppLock]
/// sinaliza bloqueio, cobre toda a UI com um véu desfocado + botão de
/// desbloqueio — nada do conteúdo é renderizado por baixo do desafio.
class AppLockGate extends StatefulWidget {
  const AppLockGate({super.key, required this.child});

  final Widget child;

  @override
  State<AppLockGate> createState() => _AppLockGateState();
}

class _AppLockGateState extends State<AppLockGate>
    with WidgetsBindingObserver {
  bool _challengeInFlight = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    AppLock.instance.lockedNotifier.addListener(_onLockChanged);
    // Arranque: se deve estar bloqueada, lança o desafio após o primeiro
    // frame (LocalAuth não funciona antes do primeiro frame no Android).
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (AppLock.instance.lockedNotifier.value) _challenge();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    AppLock.instance.lockedNotifier.removeListener(_onLockChanged);
    super.dispose();
  }

  void _onLockChanged() {
    if (mounted) setState(() {});
    if (AppLock.instance.lockedNotifier.value) _challenge();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden) {
      AppLock.instance.lockIfEnabled();
    } else if (state == AppLifecycleState.resumed) {
      if (AppLock.instance.lockedNotifier.value) _challenge();
    }
  }

  Future<void> _challenge() async {
    if (_challengeInFlight) return;
    _challengeInFlight = true;
    // Pequena espera: o ciclo de vida precisa de assentar no resume.
    await Future<void>.delayed(const Duration(milliseconds: 350));
    try {
      await AppLock.instance.unlockInteractive();
    } finally {
      _challengeInFlight = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final locked = AppLock.instance.lockedNotifier.value;
    if (!locked) return widget.child;

    return Directionality(
      textDirection: TextDirection.ltr,
      child: Stack(
        children: [
          // Conteúdo por baixo com blur — nada legível.
          ImageFiltered(
            imageFilter: ImageFilter.blur(sigmaX: 22, sigmaY: 22),
            child: widget.child,
          ),
          // Véu sólido por cima do blur.
          Container(color: AppColors.bgDeep.withOpacity(0.92)),
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 84,
                  height: 84,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const LinearGradient(
                        colors: AppColors.heroCardGradient),
                    border: Border.all(
                        color: Colors.white.withOpacity(0.25), width: 1.5),
                    boxShadow: const [
                      BoxShadow(
                          color: AppColors.glowCyan,
                          blurRadius: 30,
                          spreadRadius: 4),
                    ],
                  ),
                  child: const Icon(Icons.health_and_safety_rounded,
                      color: Colors.white, size: 40),
                ),
                const SizedBox(height: 22),
                const Text(
                  'MedWallet bloqueada',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 19,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Confirma a tua identidade para continuar',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.55),
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 30),
                _UnlockButton(onTap: _challenge),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _UnlockButton extends StatelessWidget {
  const _UnlockButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.mediumImpact();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 15),
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: AppColors.buttonGradient),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: Colors.white.withOpacity(0.18)),
          boxShadow: const [
            BoxShadow(color: AppColors.glowBlue, blurRadius: 18),
          ],
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.fingerprint_rounded, color: Colors.white, size: 22),
            SizedBox(width: 10),
            Text(
              'Desbloquear',
              style: TextStyle(
                color: Colors.white,
                fontSize: 15,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
