import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'core/config.dart';
import 'core/native/native_bridge.dart';
import 'core/push/push_service.dart';
import 'core/reminders/meds_reminder_service.dart';
import 'core/router/app_router.dart';
import 'core/security/app_lock.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Edge-to-edge: conteúdo desenha atrás das barras de sistema
  // (Android 15 impõe; aqui fica consistente em todas as versões).
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    statusBarBrightness: Brightness.dark, // iOS
  ));

  if (AppConfig.isConfigured) {
    await Supabase.initialize(
      url: AppConfig.supabaseUrl,
      anonKey: AppConfig.supabaseAnonKey,
      debug: false,
    );
  }

  // Lembretes de medicação (notificações locais — offline, sem FCM).
  // Falha silenciosa em dispositivos/emuladores sem suporte.
  try {
    await MedsReminderService.instance.ensureInitialized();
  } catch (_) {}

  // Bloqueio biométrico: carrega a preferência local ANTES do primeiro
  // frame para a app já abrir bloqueada se o utilizador activou.
  try {
    await AppLock.instance.ensureInitialized();
  } catch (_) {}

  // Push real (FCM) — apenas se FCM_ENABLED=true e o Firebase nativo
  // estiver configurado; caso contrário é no-op silencioso.
  if (AppConfig.isConfigured) {
    try {
      await PushService.instance.initialize();
    } catch (_) {}
  }

  runApp(const ProviderScope(child: MedWalletApp()));

  // F32 — ponte nativa: App Shortcuts (long-press no ícone) navegam
  // com GoRouter. Falha silenciosa fora do Android.
  NativeBridge.init((route) {
    router.go(route);
  });
}
