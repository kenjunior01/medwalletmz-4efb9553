import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app_strings.dart';

/// Locale activo da app. Carrega de `profiles.preferred_locale`
/// (coluna oficial) e persiste a escolha na BD — o idioma segue o
/// utilizador em qualquer dispositivo.
class LocaleController extends Notifier<String> {
  @override
  String build() {
    // Carrega em segundo plano assim que o provider é lido.
    Future.microtask(_loadFromProfile);
    return 'pt';
  }

  Future<void> _loadFromProfile() async {
    try {
      final client = Supabase.instance.client;
      final uid = client.auth.currentUser?.id;
      if (uid == null) return;
      final rows = await client
          .from('profiles')
          .select('preferred_locale')
          .eq('user_id', uid)
          .limit(1);
      if (rows.isEmpty) return;
      final locale = rows.first['preferred_locale'] as String?;
      if (locale != null &&
          locale.isNotEmpty &&
          appLanguages.any((l) => l.code == locale)) {
        state = locale;
      }
    } catch (_) {
      // Sem perfil/coluna — mantém pt.
    }
  }

  Future<void> set(String locale) async {
    if (!appLanguages.any((l) => l.code == locale)) return;
    state = locale;
    try {
      final client = Supabase.instance.client;
      final uid = client.auth.currentUser?.id;
      if (uid == null) return;
      await client
          .from('profiles')
          .update({'preferred_locale': locale}).eq('user_id', uid);
    } catch (_) {
      // Escolha mantida em memória se a escrita falhar.
    }
  }
}

final localeProvider =
    NotifierProvider<LocaleController, String>(LocaleController.new);
