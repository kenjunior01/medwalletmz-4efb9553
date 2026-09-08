import 'package:flutter/foundation.dart';
import 'package:jitsi_meet_flutter_sdk/jitsi_meet_flutter_sdk.dart';

/// Áudio/vídeo EMBUTIDO — o Jitsi Meet corre dentro da app (SDK oficial
/// `jitsi_meet_flutter_sdk`), sem sair para o browser.
///
/// • `join()` tenta abrir a conferência in-app e devolve `true` se
///   conseguiu; em caso de falha (SDK não inicializado, permissões
///   negadas, plataforma sem suporte) devolve `false` e o chamador faz
///   fallback para o link externo (`meet.jit.si` no browser).
/// • `onTerminated` é invocado quando a conferência termina dentro do
///   SDK (utilizador desligou-se pela UI do Jitsi) — o ecrã de chamada
///   usa isto para voltar ao estado "fora da sala".
///
/// Requisitos nativos (documentados no README):
///   Android: minSdkVersion ≥ 26; iOS: plataforma ≥ 15 + permissões de
///   câmara/microfone no Info.plist. O pacote faz o merge dos manifests.
class JitsiEmbeddedService {
  JitsiEmbeddedService._();

  static final JitsiEmbeddedService instance = JitsiEmbeddedService._();

  final JitsiMeet _jitsi = JitsiMeet();
  bool _listenerBound = false;

  /// Chamado quando a conferência termina dentro do SDK.
  VoidCallback? onTerminated;

  /// Tenta entrar na sala EMBUTIDO. Devolve:
  ///   true  — a conferência abriu in-app;
  ///   false — falhou (o chamador deve abrir o link externo).
  Future<bool> join({
    required String roomUrl,
    required String displayName,
    String? email,
    String? avatarUrl,
    bool audioMuted = false,
    bool videoMuted = false,
  }) async {
    try {
      if (!_listenerBound) {
        _jitsi.addListener(
          JitsiMeetEventListener(
            conferenceTerminated: (url, error) {
              onTerminated?.call();
            },
          ),
        );
        _listenerBound = true;
      }

      final options = JitsiMeetConferenceOptions(
        room: roomUrl,
        configOverrides: {
          'startWithAudioMuted': audioMuted,
          'startWithVideoMuted': videoMuted,
          'subject': 'MedWallet MZ · Consulta',
        },
        featureFlags: {
          FeatureFlags.welcomePageEnabled: false,
          FeatureFlags.pipEnabled: true,
          FeatureFlags.inviteEnabled: false,
          FeatureFlags.addPeopleEnabled: false,
          FeatureFlags.kickoutEnabled: false,
        },
        userInfo: JitsiMeetUserInfo(
          displayName: displayName,
          email: email,
          avatar: avatarUrl,
        ),
      );

      await _jitsi.join(options);
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Desliga-se da conferência (usado pelo botão Encerrar chamada).
  Future<void> hangUp() async {
    try {
      await _jitsi.hangUp();
    } catch (_) {
      // nada — a sala Jitsi encerra sozinha quando todos saem
    }
  }
}
