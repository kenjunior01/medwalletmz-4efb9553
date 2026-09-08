import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../branding/branding.dart';
import 'app_colors.dart';

/// Tema MedWallet — escuro, glassmorphism, tipografia Plus Jakarta Sans
/// (títulos) + Inter (corpo). Compatível com Flutter 3.24+.
///
/// Aceita uma paleta efectiva opcional (EffectivePalette) derivada do
/// `branding_config` do país do utilizador — o gestor regional muda as
/// cores na Consola e toda a app veste a bandeira do mercado.
abstract final class AppTheme {
  static ThemeData dark([EffectivePalette? palette]) {
    final base = ThemeData.dark(useMaterial3: true);
    final p = palette ?? EffectivePalette.defaults;

    final colorScheme = base.colorScheme.copyWith(
      primary: p.primary,
      secondary: p.accent,
      surface: AppColors.card,
      error: AppColors.danger,
      onPrimary: Colors.white,
      onSurface: AppColors.textPrimary,
    );

    final headline = GoogleFonts.plusJakartaSans(
      color: AppColors.textPrimary,
      fontWeight: FontWeight.w700,
    );
    final body = GoogleFonts.inter(color: AppColors.textPrimary);

    return base.copyWith(
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.bgDeep,
      splashFactory: InkSparkle.splashFactory,
      textTheme: base.textTheme.copyWith(
        displaySmall: headline.copyWith(fontSize: 32, letterSpacing: -0.5),
        headlineMedium: headline.copyWith(fontSize: 26, letterSpacing: -0.4),
        headlineSmall: headline.copyWith(fontSize: 22, letterSpacing: -0.3),
        titleLarge: headline.copyWith(fontSize: 18, fontWeight: FontWeight.w700),
        titleMedium: GoogleFonts.plusJakartaSans(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: AppColors.textPrimary,
        ),
        titleSmall: GoogleFonts.plusJakartaSans(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: AppColors.textPrimary,
        ),
        bodyLarge: body.copyWith(fontSize: 16, color: AppColors.textPrimary),
        bodyMedium: body.copyWith(fontSize: 14, color: AppColors.textSecondary),
        bodySmall: body.copyWith(fontSize: 12.5, color: AppColors.textMuted),
        labelLarge: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.w700,
          color: Colors.white,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.glassFill,
        hintStyle: body.copyWith(color: AppColors.textMuted),
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: BorderSide(color: AppColors.glassBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: BorderSide(color: AppColors.glassBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: AppColors.accent, width: 1.4),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: AppColors.danger),
        ),
        prefixIconColor: AppColors.textSecondary,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.card,
        contentTextStyle: body.copyWith(color: AppColors.textPrimary),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      dividerTheme: DividerThemeData(color: AppColors.glassBorder, thickness: 1),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: Colors.transparent,
        modalBackgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
      ),
      datePickerTheme: DatePickerThemeData(
        backgroundColor: AppColors.card,
        headerForegroundColor: AppColors.textPrimary,
      ),
      timePickerTheme: TimePickerThemeData(
        backgroundColor: AppColors.card,
        dialHandColor: AppColors.primary,
      ),
    );
  }
}
