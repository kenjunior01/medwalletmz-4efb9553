import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

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
  }

  Future<void> requestPermissions() async {
    if (!_ready) await ensureInitialized();
    final android = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    await android?.requestNotificationsPermission();
    await android?.requestExactAlarmsPermission();
  }

  /// Liga/desliga os lembretes (preferência local do utilizador).
  void setEnabled(bool value) {
    _enabled = value;
    if (!value) cancelAll();
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
    if (f.contains('8 horas')) return const [8, 16];
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
    if (!_enabled) return;
    if (!_ready) await ensureInitialized();
    await cancelAll();
    if (meds.isEmpty) return;

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
          matchDateTimeComponents: DateTimeComponents.time,
        );
      }
    }
  }

  /// Cancela todos os lembretes (fim do plano ou desligado).
  Future<void> cancelAll() => _plugin.cancelAll();
}
