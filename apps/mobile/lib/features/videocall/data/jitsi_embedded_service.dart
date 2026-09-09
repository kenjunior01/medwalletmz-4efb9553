import 'dart:ui' show VoidCallback;

/// Videochamada — MODO EXTERNO (F18).
///
/// A sala Jitsi abre no browser / app Jitsi do dispositivo
/// (o ecrã de chamada trata `join() == false` como link externo).
/// O SDK nativo foi removido do build: arrastava o React Native
/// inteiro como dependência e excedia o espaço do pipeline local.
class JitsiEmbeddedService {
  JitsiEmbeddedService._();
  static final JitsiEmbeddedService instance = JitsiEmbeddedService._();

  /// Chamado quando a conferência termina (modo externo: null).
  VoidCallback? onTerminated;

  /// Sem SDK nativo: devolve sempre false — o ecrã de chamada abre
  /// automaticamente a sala por link externo (launchUrl).
  Future<bool> join({
    required String roomUrl,
    required String displayName,
    String? email,
    String? avatarUrl,
    bool audioMuted = false,
    bool videoMuted = false,
  }) async {
    return false;
  }

  /// Modo externo: o utilizador encerra pela app Jitsi/browser.
  Future<void> hangUp() async {}
}
