import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config.dart';

/// Handler de mensagens FCM em background (isolate próprio).
/// Notificações "display" aparecem na bandeja pelo próprio sistema;
/// o handler existe para data messages silenciosas.
@pragma('vm:entry-point')
Future<void> firebaseBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp();
  } catch (_) {
    // ambiente sem Firebase configurado — nada a fazer
  }
}

/// Push REAL (FCM) — opt-in via `--dart-define=FCM_ENABLED=true`.
///
/// Fluxo:
///   1. `Firebase.initializeApp()` — sem Firebase configurado no
///      projecto nativo, falha silenciosamente e a app continua a
///      funcionar (push fica apenas in-app);
///   2. pede permissão de notificações;
///   3. obtém o token FCM e grava-o na tabela `fcm_tokens`
///      (migração aditiva 20260906000000 — a tabela que o dispatch
///      engine do backend já consulta em LEFT JOIN);
///   4. mensagens recebidas com a app ABERTA (onMessage) são
///      mostradas como notificação local no canal `push`;
///   5. renovação de token é re-gravada automaticamente.
///
/// Segurança: cada utilizador só escreve na PRÓPRIA linha de
/// `fcm_tokens` (RLS "User manages own fcm tokens").
class PushService {
  PushService._();
  static final PushService instance = PushService._();

  final FlutterLocalNotificationsPlugin _local =
      FlutterLocalNotificationsPlugin();
  bool _ready = false;
  String? _token;
  StreamSubscription<String>? _tokenSub;
  StreamSubscription<RemoteMessage>? _foregroundSub;

  bool get isReady => _ready;
  String? get token => _token;

  /// Inicializa o push (seguro chamar várias vezes; no-op se a flag
  /// FCM_ENABLED não estiver activa ou o Firebase não estiver
  /// configurado no projecto nativo).
  Future<void> initialize() async {
    if (!AppConfig.fcmEnabled || _ready) return;
    try {
      await Firebase.initializeApp();
    } catch (_) {
      return; // sem google-services.json / plist → push desligado
    }
    try {
      await _local.initialize(
        const InitializationSettings(
          android: AndroidInitializationSettings('@mipmap/ic_launcher'),
          iOS: DarwinInitializationSettings(),
        ),
      );

      await FirebaseMessaging.instance
          .setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      final settings = await FirebaseMessaging.instance
          .requestPermission(provisional: true);
      final status = settings.authorizationStatus;
      if (status != AuthorizationStatus.authorized &&
          status != AuthorizationStatus.provisional) {
        return;
      }

      FirebaseMessaging.onBackgroundMessage(firebaseBackgroundHandler);

      _foregroundSub =
          FirebaseMessaging.onMessage.listen((message) => _showLocal(message));

      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) await _upsertToken(token);
      _tokenSub = FirebaseMessaging.instance.onTokenRefresh
          .listen((t) => _upsertToken(t));

      _ready = true;
    } catch (_) {
      // qualquer falha (APNs, permissões, rede) → push silencioso
    }
  }

  /// Notificação local para mensagens FCM recebidas em foreground.
  Future<void> _showLocal(RemoteMessage message) async {
    final n = message.notification;
    if (n == null) return;
    try {
      final id = (message.messageId?.hashCode ??
              DateTime.now().millisecondsSinceEpoch) &
          0x7fffffff;
      await _local.show(
        id,
        n.title ?? 'MedWallet MZ',
        n.body ?? '',
        const NotificationDetails(
          android: AndroidNotificationDetails(
            'push',
            'Notificações MedWallet',
            channelDescription:
                'Novidades, mensagens e avisos importantes da tua saúde',
            importance: Importance.high,
            priority: Priority.high,
            colorized: true,
            color: Color(0xFF1E6B9C),
          ),
          iOS: DarwinNotificationDetails(
            presentAlert: true,
            presentSound: true,
          ),
        ),
      );
    } catch (_) {}
  }

  /// Grava/actualiza o token na tabela `fcm_tokens` (RLS própria).
  /// Tolerante a esquemas: se a tabela de produção existir sem a
  /// coluna `platform`, faz fallback para a inserção mínima.
  Future<void> _upsertToken(String token) async {
    _token = token;
    final client = Supabase.instance.client;
    final uid = client.auth.currentUser?.id;
    if (uid == null) return;

    final platform = kIsWeb
        ? 'web'
        : defaultTargetPlatform == TargetPlatform.iOS
            ? 'ios'
            : 'android';

    try {
      final existing = await client
          .from('fcm_tokens')
          .select('id')
          .eq('token', token)
          .limit(1);
      if (existing is List && existing.isNotEmpty) {
        await client.from('fcm_tokens').update({
          'user_id': uid,
          'platform': platform,
          'updated_at': DateTime.now().toUtc().toIso8601String(),
        }).eq('token', token);
      } else {
        try {
          await client.from('fcm_tokens').insert({
            'user_id': uid,
            'token': token,
            'platform': platform,
          });
        } catch (_) {
          await client
              .from('fcm_tokens')
              .insert({'user_id': uid, 'token': token});
        }
      }
    } catch (_) {
      // falhou gravar o token — notificações in-app continuam a funcionar
    }
  }

  /// Remove o token da BD no logout (o dispositivo deixa de receber
  /// push desta conta).
  Future<void> signOut() async {
    _tokenSub?.cancel();
    _foregroundSub?.cancel();
    final token = _token;
    _token = null;
    _ready = false;
    if (token == null) return;
    try {
      await Supabase.instance.client
          .from('fcm_tokens')
          .delete()
          .eq('token', token);
    } catch (_) {}
  }
}
