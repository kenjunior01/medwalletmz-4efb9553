import 'package:record/record.dart';

/// Serviço de gravação de áudio — wrapper mínimo do pacote `record`
/// para o Diário de Voz (m4a/AAC-LC mono, qualidade de voz).
///
/// Centralizado num único ponto para trocar o pacote sem tocar nos
/// ecrãs. Requer RECORD_AUDIO (Android) e NSMicrophoneUsageDescription
/// (iOS) — ver README F11.
class VoiceRecorderService {
  VoiceRecorderService._();
  static final VoiceRecorderService instance = VoiceRecorderService._();

  final AudioRecorder _rec = AudioRecorder();
  bool _started = false;

  /// 'granted' | 'denied'
  Future<bool> hasPermission() => _rec.hasPermission();

  Future<void> start(String path) async {
    await _rec.start(
      const RecordConfig(
        encoder: AudioEncoder.aacLc,
        bitRate: 96000,
        sampleRate: 44100,
        numChannels: 1,
      ),
      path: path,
    );
    _started = true;
  }

  /// Devolve o caminho do ficheiro gravado (null se não gravou).
  Future<String?> stop() async {
    if (!_started) return null;
    _started = false;
    return _rec.stop();
  }

  Future<void> dispose() => _rec.dispose();
}
