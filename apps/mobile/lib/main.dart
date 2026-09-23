import 'dart:async';

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

  // Bloqueio biométrico: F33 — removida a inicialização duplicada do
  // app_lock.dart (implementação morta em paralelo ao AppLockService
  // que o AppLockGate realmente usa; só escrevia prefs a mais).

  // Push real (FCM) — F33: fire-and-forget; Firebase init + prompt de
  // permissões + getToken (rede) já NÃO atrasam o primeiro frame. O
  // registo pós-login é feito pelo listener de auth no próprio serviço.
  if (AppConfig.isConfigured) {
    unawaited(PushService.instance.initialize().catchError((_) {}));
  }

  runApp(const ProviderScope(child: MedWalletApp()));

  // F32 — ponte nativa: App Shortcuts (long-press no ícone) navegam
  // com GoRouter. Falha silenciosa fora do Android.
  NativeBridge.init((route) {
    router.go(route);
  });
}
