import 'package:flutter/foundation.dart';

/// Áudio/vídeo — consultas por link EXTERNO (meet.jit.si no browser).
///
/// A variante EMBUTIDA (SDK `jitsi_meet_flutter_sdk`) foi retirada do build
/// Android: o SDK oficial carrega ~400 MB de bibliotecas nativas (todas as
/// ABIs) e inviabilizava a compilação em ambientes com disco reduzido, para
/// uma funcionalidade cujo fluxo primário já era o link externo.
///
/// Esta classe MANTÉM a mesma API do serviço antigo:
///   • `join()` devolve sempre `false` — o chamador cai no fallback
///     documentado: abre a sala no browser (meet.jit.si).
///   • `hangUp()` é no-op (a sala do browser encerra sozinha quando todos
///     saem; o ecrã de chamada já trata o regresso ao estado normal).
///   • `onTerminated` mantém-se para compatibilidade do ecrã de chamada.
///
/// Reintegrar o modo embutido no futuro: voltar a adicionar
/// `jitsi_meet_flutter_sdk` ao pubspec e restaurar `join()` com o SDK.
class JitsiEmbeddedService {
  JitsiEmbeddedService._();

  static final JitsiEmbeddedService instance = JitsiEmbeddedService._();

  /// Mantido por compatibilidade: invocado quando uma conferência embutida
  /// termina. Sem SDK embutido, nunca é disparado (o browser é a sala).
  VoidCallback? onTerminated;

  /// Devolve:
  ///   true  — a conferência abriu in-app;
  ///   false — falhou/indisponível (o chamador abre o link externo).
  Future<bool> join({
    required String roomUrl,
    required String displayName,
    String? email,
    String? avatarUrl,
    bool audioMuted = false,
    bool videoMuted = false,
  }) async {
    // Sem SDK embutido nesta build — o fallback externo do chamador assume.
    return false;
  }

  /// Desligar da conferência — no-op sem SDK embutido.
  Future<void> hangUp() async {}
}
