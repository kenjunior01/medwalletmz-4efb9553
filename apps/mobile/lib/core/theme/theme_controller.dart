import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// F33 — MODOS da app: tema (sistema/claro/escuro) e nível de efeitos.
///
/// Persistidos em SharedPreferences para sobreviverem a reinícios.
/// O provider é lido no build de `MedWalletApp`, que resolve a
/// `AppPalette` e o `ThemeMode` do MaterialApp.

enum AppThemeMode { system, light, dark }

enum MotionLevel {
  /// Todos os efeitos: mesh drift, poeira cintilante, feixes de luz,
  /// shimmer nos botões, etc.
  full,

  /// Fundo estático e brilhos sem animação — poupa bateria e GPU
  /// (útil em aparelhos mais modestos, comuns no mercado MZ).
  reduced,
}

final appThemeModeProvider =
    NotifierProvider<ThemeModeController, AppThemeMode>(
        ThemeModeController.new);

final motionLevelProvider =
    NotifierProvider<MotionLevelController, MotionLevel>(
        MotionLevelController.new);

class ThemeModeController extends Notifier<AppThemeMode> {
  static const _key = 'ui.theme_mode';

  @override
  AppThemeMode build() {
    _load();
    return AppThemeMode.system;
  }

  Future<void> _load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_key);
      if (raw == null) return;
      final mode = AppThemeMode.values.firstWhere(
        (m) => m.name == raw,
        orElse: () => AppThemeMode.system,
      );
      state = mode;
    } catch (_) {
      // preferências indisponíveis: mantém system
    }
  }

  Future<void> setMode(AppThemeMode mode) async {
    state = mode;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_key, mode.name);
    } catch (_) {}
  }
}

class MotionLevelController extends Notifier<MotionLevel> {
  static const _key = 'ui.motion_level';

  @override
  MotionLevel build() {
    _load();
    return MotionLevel.full;
  }

  Future<void> _load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_key);
      if (raw == null) return;
      state = MotionLevel.values.firstWhere(
        (m) => m.name == raw,
        orElse: () => MotionLevel.full,
      );
    } catch (_) {}
  }

  Future<void> setLevel(MotionLevel level) async {
    state = level;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_key, level.name);
    } catch (_) {}
  }
}

/// Resolve o brilho efectivo a partir do modo escolhido + brilho do
/// sistema.
Brightness resolveBrightness(AppThemeMode mode, Brightness platform) {
  switch (mode) {
    case AppThemeMode.system:
      return platform;
    case AppThemeMode.light:
      return Brightness.light;
    case AppThemeMode.dark:
      return Brightness.dark;
  }
}
