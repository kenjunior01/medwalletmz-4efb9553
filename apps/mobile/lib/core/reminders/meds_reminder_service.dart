import 'dart:ui' show Color;

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/data/latest_all.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import '../native/native_bridge.dart';

/// Lembretes de medicação — notificações locais (sem dependências de
/// FCM/APNs, funciona offline). Agenda 1–3 lembretes diários por
/// medicamento derivados da frequência da receita:
///
///   "1x ao dia"        → 08:00
///   "2x ao dia"        → 08:00 · 20:00
///   "3x ao dia"        → 08:00 · 14:00 · 20:00
///   "a cada 8 horas"   → 08:00 · 16:00 · 00:00
///   outro/sem frequência → 08:00
///
/// Os lembretes vivem no canal `meds_reminders` (importância alta) e são
/// re-agendados sempre que o plano de medicação muda.
class MedsReminderService {
  MedsReminderService._();
  static final MedsReminderService instance = MedsReminderService._();

  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();
  bool _ready = false;
  bool _enabled = true;

  static const _channelId = 'meds_reminders';
  static const _channelName = 'Lembretes de medicação';
  static const _channelDesc =
      'Avisos para tomar os medicamentos do teu plano diário';

  /// Inicializa o plugin e o timezone. Seguro chamar várias vezes.
  Future<void> ensureInitialized() async {
    if (_ready) return;
    tzdata.initializeTimeZones();
    _configureLocalZone();
    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosInit = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    await _plugin.initialize(
      const InitializationSettings(android: androidInit, iOS: iosInit),
    );
    _ready = true;

    // F33 — a preferência master sobrevive a restarts: sem isto, o flag
    // em memória voltava a `true` e os lembretes desligados ressuscitavam
    // sozinhos no próximo agendamento.
    try {
      final prefs = await SharedPreferences.getInstance();
      _enabled = prefs.getBool('reminders.master') ?? true;
    } catch (_) {}
  }

  /// F33 — `tz.local` por omissão é UTC no package `timezone`: sem
  /// `setLocalLocation`, as tomas diárias ancoravam no relógio UTC e
  /// disparavam 2 h tarde em Moçambique (UTC+2). Escolhe a zona IANA
  /// cujo offset ACTUAL iguala o do dispositivo — sem dependências
  /// nativas novas. Moçambique (público-alvo) resolve em 1.º lugar.
  static const _zoneCandidates = [
    'Africa/Maputo', // UTC+2 — o offset do público-alvo
    'Africa/Harare',
    'Africa/Cairo',
    'Africa/Lagos',
    'Africa/Nairobi',
    'Europe/Lisbon',
    'Europe/London',
    'Europe/Paris',
    'Europe/Moscow',
    'Asia/Dubai',
    'Asia/Karachi',
    'Asia/Kolkata',
    'Asia/Dhaka',
    'Asia/Bangkok',
    'Asia/Shanghai',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Sydney',
    'Pacific/Auckland',
    'UTC',
    'Atlantic/Azores',
    'America/Sao_Paulo',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
  ];

  void _configureLocalZone() {
    const fallback = 'Africa/Maputo';
    try {
      final deviceOffset = DateTime.now().timeZoneOffset;
      String best = fallback;
      for (final name in _zoneCandidates) {
        try {
          final loc = tz.getLocation(name);
          if (tz.TZDateTime.now(loc).timeZoneOffset == deviceOffset) {
            best = name;
            break;
          }
        } catch (_) {
          continue; // nome inexistente nesta versão da base
        }
      }
      tz.setLocalLocation(tz.getLocation(best));
    } catch (_) {
      try {
        tz.setLocalLocation(tz.getLocation(fallback));
      } catch (_) {}
    }
  }

  Future<void> requestPermissions() async {
    if (!_ready) await ensureInitialized();
    final android = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    await android?.requestNotificationsPermission();
    await android?.requestExactAlarmsPermission();
  }

  /// Liga/desliga os lembretes (preferência local do utilizador).
  /// F33 — persiste em `reminders.master` (a mesma chave que
  /// RemindersRepository lê), senão o desligar morria com o processo.
  Future<void> setEnabled(bool value) async {
    _enabled = value;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('reminders.master', value);
    } catch (_) {}
    if (!value) {
      await cancelAll();
      // Widget sem plano: estado vazio honesto.
      NativeBridge.updateNextDoseWidget(hasDose: false);
    }
  }

  bool get isEnabled => _enabled;

  /// Horas do dia (0–23) derivadas da frequência textual da receita.
  static List<int> hoursForFrequency(String? frequency) {
    final f = (frequency ?? '').toLowerCase();
    if (f.contains('3x') || f.contains('3 vezes') || f.contains('terci')) {
      return const [8, 14, 20];
    }
    if (f.contains('2x') || f.contains('2 vezes') || f.contains('duas')) {
      return const [8, 20];
    }
    if (f.contains('8 horas')) return const [0, 8, 16]; // F33: faltava a dose das 00:00
    if (f.contains('6 horas')) return const [8, 14, 20, 2];
    if (f.contains('12 horas')) return const [8, 20];
    if (f.contains('noite') || f.contains('dormir')) return const [21];
    if (f.contains('manhã') || f.contains('manha')) return const [8];
    // 1x ao dia ou sem indicação → manhã.
    return const [8];
  }

  /// Agenda os lembretes do plano actual. Chamar depois de carregar os
  /// medicamentos planeados (PlannedMedication) no ecrã de medicação.
  Future<void> scheduleForMedications(
      List<({String id, String name, String? dosage, String? frequency})>
          meds) async {
    // F33 — lê a preferência master em cada agendamento: uma chamada
    // directa (ex.: ecrã Medicação) nunca ressuscita lembretes que o
    // utilizador desligou.
    try {
      final prefs = await SharedPreferences.getInstance();
      _enabled = prefs.getBool('reminders.master') ?? true;
    } catch (_) {}
    if (!_enabled) return;
    if (!_ready) await ensureInitialized();
    await cancelAll();
    if (meds.isEmpty) {
      // Widget vazio: sem plano não há próxima toma.
      NativeBridge.updateNextDoseWidget(hasDose: false);
      return;
    }

    // F32 — Widget "Próxima Toma": calcula a toma mais próxima de
    // TODO o plano (medicamento × horas da frequência) e envia ao
    // Android nativo. Falha silenciosa fora do Android.
    _updateNextDoseWidget(meds);

    final now = tz.TZDateTime.now(tz.local);
    for (var i = 0; i < meds.length && i < 12; i++) {
      final med = meds[i];
      final hours = hoursForFrequency(med.frequency);
      for (final hour in hours) {
        var scheduled = DateTime(now.year, now.month, now.day, hour);
        if (scheduled.isBefore(now)) {
          scheduled = scheduled.add(const Duration(days: 1));
        }
        final tzDate = tz.TZDateTime.from(scheduled, tz.local);
        final id = (i + 1) * 100 + hour;
        await _plugin.zonedSchedule(
          id,
          'Hora do medicamento',
          '${med.name}'
          '${med.dosage != null && med.dosage!.isNotEmpty ? ' · ${med.dosage}' : ''}',
          tzDate,
          const NotificationDetails(
            android: AndroidNotificationDetails(
              _channelId,
              _channelName,
              channelDescription: _channelDesc,
              importance: Importance.high,
              priority: Priority.high,
              category: AndroidNotificationCategory.reminder,
              colorized: true,
              color: Color(0xFF1E6B9C),
            ),
            iOS: DarwinNotificationDetails(
              presentAlert: true,
              presentSound: true,
            ),
          ),
          androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
          uiLocalNotificationDateInterpretation:
              UILocalNotificationDateInterpretation.absoluteTime,
          matchDateTimeComponents: DateTimeComponents.time,
        );
      }
    }
  }

  /// Calcula a próxima toma do plano e actualiza o widget nativo.
  void _updateNextDoseWidget(
      List<({String id, String name, String? dosage, String? frequency})>
          meds) {
    final now = DateTime.now();
    DateTime? next;
    String? nextTitle;
    for (final med in meds) {
      for (final hour in hoursForFrequency(med.frequency)) {
        var t = DateTime(now.year, now.month, now.day, hour);
        if (!t.isAfter(now)) t = t.add(const Duration(days: 1));
        if (next == null || t.isBefore(next)) {
          next = t;
          final dose = (med.dosage != null && med.dosage!.isNotEmpty)
              ? ' · ${med.dosage}'
              : '';
          nextTitle = '${med.name}$dose';
        }
      }
    }
    if (next == null || nextTitle == null) {
      NativeBridge.updateNextDoseWidget(hasDose: false);
      return;
    }
    final hh = next.hour.toString().padLeft(2, '0');
    final mm = next.minute.toString().padLeft(2, '0');
    final isTomorrow = next.day != now.day;
    final when = isTomorrow ? 'amanhã' : 'hoje';
    NativeBridge.updateNextDoseWidget(
      hasDose: true,
      title: nextTitle,
      subtitle: 'Próxima toma · $when às $hh:$mm',
    );
  }

  /// Cancela todos os lembretes (fim do plano ou desligado).
  Future<void> cancelAll() async {
    await _plugin.cancelAll();
    // O widget acompanha: sem lembretes, sem toma no ecrã inicial.
    NativeBridge.updateNextDoseWidget(hasDose: false);
  }
}
