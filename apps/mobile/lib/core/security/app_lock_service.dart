import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Bloqueio da app por biometria/PIN do dispositivo (EXCLUSIVO MÓVEL).
///
/// Opt-in: desligado por defeito. Quando activo, sempre que a app vem
/// para o primeiro plano pede a impressão digital/rosto/PIN do sistema
/// antes de mostrar qualquer dado de saúde ou da carteira.
///
/// Estratégia à prova de bloqueio acidental:
///  - se o dispositivo não suportar biometria, o toggle não fica activo;
///  - se a autenticação falhar (ex.: biometria removida ao fim de um
///    update do sistema), o utilizador pode repetir ou desactivar.
class AppLockService {
  AppLockService._();
  static final AppLockService instance = AppLockService._();

  static const _prefKey = 'security.app_lock_enabled';

  final LocalAuthentication _auth = LocalAuthentication();

  bool? _enabledCached;

  /// Está o bloqueio activado nas definições?
  Future<bool> isEnabled() async {
    if (_enabledCached != null) return _enabledCached!;
    try {
      final prefs = await SharedPreferences.getInstance();
      _enabledCached = prefs.getBool(_prefKey) ?? false;
    } catch (_) {
      _enabledCached = false;
    }
    return _enabledCached!;
  }

  /// O dispositivo tem biometria/PIN seguro configurado?
  Future<bool> isSupported() async {
    try {
      final canCheck = await _auth.canCheckBiometrics ||
          await _auth.isDeviceSupported();
      final enrolled = await _auth.getAvailableBiometrics();
      return canCheck && enrolled.isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  Future<void> setEnabled(bool value) async {
    _enabledCached = value;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_prefKey, value);
    } catch (_) {}
  }

  /// Pede desbloqueio biometrico. Devolve true se desbloqueou.
  Future<bool> unlock() async {
    try {
      return await _auth.authenticate(
        localizedReason:
            'Desbloqueia a MedWallet para ver os teus dados de saúde',
        options: const AuthenticationOptions(
          biometricOnly: false, // aceita PIN/padrão do sistema
          stickyAuth: true, // continua após o app voltar ao foco
          useErrorDialogs: true,
        ),
      );
    } catch (_) {
      return false;
    }
  }
}
