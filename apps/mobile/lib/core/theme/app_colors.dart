import 'package:flutter/material.dart';

import 'app_palette.dart';

/// Facade de tokens de design — MedWallet.
///
/// F33 — os tokens deixaram de ser `const` fixos do modo escuro e
/// passaram a GETTERS que leem a paleta efectiva (`AppPalette.current`),
/// aplicada em `app.dart` antes de construir o MaterialApp. Resultado:
/// os ~2900 call-sites existentes (`AppColors.card`, etc.) continuam
/// intactos, mas agora respondem ao MODO (claro/escuro) e ao branding
/// do país escolhido pelo gestor regional.
///
/// ⚠️ Não usar estes getters dentro de `const` — são resolvidos em
/// runtime. (Um script de CI remove automaticamente `const` em
/// contextos que os referenciam.)
abstract final class AppColors {
  static AppPalette _current = AppPalette.dark;

  static AppPalette get current => _current;
  static bool get isDark => _current.isDark;

  /// Aplica a paleta efectiva (chamado no build de `MedWalletApp`,
  /// antes do MaterialApp — toda a árvore reavalia os getters).
  static void apply(AppPalette palette) => _current = palette;

  // ── Marca ─────────────────────────────────────────────────────────
  static Color get primary => _current.primary;
  static Color get primarySoft => _current.primarySoft;
  static Color get primaryDark => _current.primaryDark;
  static Color get accent => _current.accent;
  static Color get teal => _current.teal;

  // ── Superfícies ───────────────────────────────────────────────────
  static Color get bgDeep => _current.bgDeep;
  static Color get bgMid => _current.bgMid;
  static Color get bgHigh => _current.bgHigh;
  static Color get card => _current.card;

  // ── Texto ─────────────────────────────────────────────────────────
  static Color get textPrimary => _current.textPrimary;
  static Color get textSecondary => _current.textSecondary;
  static Color get textMuted => _current.textMuted;

  // ── Vidro ─────────────────────────────────────────────────────────
  static Color get glassFill => _current.glassFill;
  static Color get glassFillStrong => _current.glassFillStrong;
  static Color get glassBorder => _current.glassBorder;
  static Color get glassHighlight => _current.glassHighlight;

  // ── Estados ───────────────────────────────────────────────────────
  static Color get success => _current.success;
  static Color get warning => _current.warning;
  static Color get danger => _current.danger;
  static Color get info => _current.info;

  // ── Brilhos do fundo (mesh) ───────────────────────────────────────
  static Color get glowBlue => _current.glowBlue;
  static Color get glowTeal => _current.glowTeal;
  static Color get glowCyan => _current.glowCyan;

  // ── Gradientes ────────────────────────────────────────────────────
  static List<Color> get heroCardGradient => _current.heroCardGradient;
  static List<Color> get buttonGradient => _current.buttonGradient;
  static List<Color> get successGradient => _current.successGradient;
  static List<Color> get backgroundGradient => _current.backgroundGradient;

  // ── F33 — novos tokens de modo ────────────────────────────────────
  static Color get navBar => _current.navBar;
  static Color get shadowTint => _current.shadowTint;
  static Color get skeletonBase => _current.skeletonBase;
  static Color get skeletonHighlight => _current.skeletonHighlight;
  static Color get starColor => _current.starColor;
  static Color get beamColor => _current.beamColor;
}
