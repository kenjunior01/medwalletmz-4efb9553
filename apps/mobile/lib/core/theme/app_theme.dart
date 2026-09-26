import 'package:flutter/cupertino.dart' show CupertinoPageTransitionsBuilder;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_palette.dart';

/// Tema MedWallet — glassmorphism, tipografia Plus Jakarta Sans
/// (títulos) + Inter (corpo). Compatível com Flutter 3.24+.
///
/// F33 — construção unificada por paleta: `AppTheme.light()` e
/// `AppTheme.dark()` partilham a mesma gramática visual, mudando só os
/// tokens (a paleta efectiva já vem com o branding do país aplicado).
abstract final class AppTheme {
  static ThemeData dark([AppPalette? palette]) =>
      _build(palette ?? AppPalette.dark);

  static ThemeData light([AppPalette? palette]) =>
      _build(palette ?? AppPalette.light);

  static ThemeData _build(AppPalette p) {
    final base = ThemeData(brightness: p.brightness, useMaterial3: true);

    final colorScheme = base.colorScheme.copyWith(
      primary: p.primary,
      secondary: p.accent,
      surface: p.card,
      error: p.danger,
      onPrimary: Colors.white,
      onSurface: p.textPrimary,
    );

    final headline = GoogleFonts.plusJakartaSans(
      color: p.textPrimary,
      fontWeight: FontWeight.w700,
    );
    final body = GoogleFonts.inter(color: p.textPrimary);

    return base.copyWith(
      colorScheme: colorScheme,
      scaffoldBackgroundColor: p.bgDeep,
      splashFactory: InkSparkle.splashFactory,
      // Transições de página com feel de sistema: volta preditiva no
      // Android 14+ (o ecrã segue o gesto antes de sair) e swipe-back
      // estilo iOS. Em plataformas sem gesto, zoom Material 3.
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: PredictiveBackPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.macOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.windows: ZoomPageTransitionsBuilder(),
          TargetPlatform.linux: ZoomPageTransitionsBuilder(),
          TargetPlatform.fuchsia: ZoomPageTransitionsBuilder(),
        },
      ),
      textTheme: base.textTheme.copyWith(
        displaySmall: headline.copyWith(fontSize: 32, letterSpacing: -0.5),
        headlineMedium: headline.copyWith(fontSize: 26, letterSpacing: -0.4),
        headlineSmall: headline.copyWith(fontSize: 22, letterSpacing: -0.3),
        titleLarge: headline.copyWith(fontSize: 18, fontWeight: FontWeight.w700),
        titleMedium: GoogleFonts.plusJakartaSans(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: p.textPrimary,
        ),
        titleSmall: GoogleFonts.plusJakartaSans(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: p.textPrimary,
        ),
        bodyLarge: body.copyWith(fontSize: 16, color: p.textPrimary),
        bodyMedium: body.copyWith(fontSize: 14, color: p.textSecondary),
        bodySmall: body.copyWith(fontSize: 12.5, color: p.textMuted),
        labelLarge: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.w700,
          color: Colors.white,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: p.glassFill,
        hintStyle: body.copyWith(color: p.textMuted),
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: BorderSide(color: p.glassBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: BorderSide(color: p.glassBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: BorderSide(color: p.accent, width: 1.4),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: BorderSide(color: p.danger),
        ),
        prefixIconColor: p.textSecondary,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: p.card,
        contentTextStyle: body.copyWith(color: p.textPrimary),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      dividerTheme: DividerThemeData(color: p.glassBorder, thickness: 1),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: Colors.transparent,
        modalBackgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
      ),
      datePickerTheme: DatePickerThemeData(
        backgroundColor: p.card,
        headerForegroundColor: p.textPrimary,
      ),
      timePickerTheme: TimePickerThemeData(
        backgroundColor: p.card,
        dialHandColor: p.primary,
      ),
    );
  }
}
