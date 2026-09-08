import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Sessão de videochamada — tabela `video_sessions` (1 por consulta).
///
/// Ciclo de vida espelhado na versão web:
///   waiting → in_progress → ended
/// A sala é identificada por `room_id` (único) e pode ser aberta no
/// Jitsi Meet (sala pública por link) a partir de qualquer dispositivo —
/// a app gestiona o estado na MESMA base de dados Supabase.
enum VideoSessionStatus { waiting, inProgress, ended }

VideoSessionStatus _parseStatus(String? raw) {
  switch (raw) {
    case 'in_progress':
    case 'active':
    case 'live':
      return VideoSessionStatus.inProgress;
    case 'ended':
    case 'completed':
      return VideoSessionStatus.ended;
    default:
      return VideoSessionStatus.waiting;
  }
}

class VideoCallSession {
  const VideoCallSession({
    required this.id,
    required this.consultationId,
    required this.roomId,
    required this.status,
    this.startedAt,
    this.endedAt,
    this.createdAt,
  });

  final String id;
  final String consultationId;
  final String roomId;
  final VideoSessionStatus status;
  final DateTime? startedAt;
  final DateTime? endedAt;
  final DateTime? createdAt;

  bool get isWaiting => status == VideoSessionStatus.waiting;
  bool get isLive => status == VideoSessionStatus.inProgress;
  bool get hasEnded => status == VideoSessionStatus.ended;

  factory VideoCallSession.fromJson(Map<String, dynamic> j) => VideoCallSession(
        id: j['id'] as String,
        consultationId: j['consultation_id'] as String,
        roomId: (j['room_id'] ?? '') as String,
        status: _parseStatus(j['status']?.toString()),
        startedAt: DateTime.tryParse(j['started_at']?.toString() ?? ''),
        endedAt: DateTime.tryParse(j['ended_at']?.toString() ?? ''),
        createdAt: DateTime.tryParse(j['created_at']?.toString() ?? ''),
      );

  /// URL da sala no Jitsi Meet — funciona no browser e abre a app
  /// instalada no Android/iOS quando presente (sem SDK nativo).
  String get jitsiUrl => 'https://meet.jit.si/medwallet-$roomId';
}

/// Repositório de videochamadas sobre `video_sessions` (RLS: apenas as
/// partes da consulta leem/criam/editam; realtime publication activa).
class VideoCallRepository {
  VideoCallRepository(this._client);

  final SupabaseClient _client;

  /// Busca a sessão da consulta ou cria-a (idempotente por consulta).
  /// O `room_id` deriva da consulta + tempo, garantindo unicidade.
  Future<VideoCallSession?> ensureSession(String consultationId) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return null;
    try {
      final existing = await _client
          .from('video_sessions')
          .select()
          .eq('consultation_id', consultationId)
          .limit(1);
      if (existing is List && existing.isNotEmpty) {
        return VideoCallSession.fromJson(
            (existing.first as Map).cast<String, dynamic>());
      }
      final roomId =
          'c-${consultationId.substring(0, 8).replaceAll('-', '')}-${DateTime.now().millisecondsSinceEpoch ~/ 1000 % 100000}';
      final created = await _client
          .from('video_sessions')
          .insert({
            'consultation_id': consultationId,
            'room_id': roomId,
            'status': 'waiting',
          })
          .select()
          .single();
      return VideoCallSession.fromJson((created as Map).cast<String, dynamic>());
    } catch (_) {
      return null;
    }
  }

  /// Estado da sala em tempo real — usado para saber quando a outra
  /// parte entrou (waiting → in_progress) e quando terminou.
  Stream<VideoCallSession?> watchSession(String consultationId) {
    return _client
        .from('video_sessions')
        .stream(primaryKey: ['id'])
        .eq('consultation_id', consultationId)
        .limit(1)
        .map((rows) {
          if (rows.isEmpty) return null;
          return VideoCallSession.fromJson(
              (rows.first as Map).cast<String, dynamic>());
        });
  }

  /// A outra parte marcou presença: sala fica `in_progress`.
  Future<void> markStarted(String sessionId) async {
    try {
      await _client.from('video_sessions').update({
        'status': 'in_progress',
        'started_at': DateTime.now().toUtc().toIso8601String(),
      }).eq('id', sessionId);
    } catch (_) {}
  }

  /// Encerra a chamada.
  Future<void> markEnded(String sessionId) async {
    try {
      await _client.from('video_sessions').update({
        'status': 'ended',
        'ended_at': DateTime.now().toUtc().toIso8601String(),
      }).eq('id', sessionId);
    } catch (_) {}
  }
}

final videoCallRepositoryProvider = Provider<VideoCallRepository>((ref) {
  return VideoCallRepository(Supabase.instance.client);
});
