import 'package:flutter/material.dart';

import '../branding/branding.dart';

/// Paleta completa de tokens de design — MedWallet.
///
/// F33 — o app passa a ter MODOS: o design dark "glassmorphism fintech"
/// (paridade com a versão web "Deep Medical Night") ganha um irmão claro
/// "Clareza Médica" (paridade com o modo claro da web), e a paleta efectiva
/// é resolvida em runtime combinando:
///
///   brilho (dark | light)  +  branding do país (countries.branding_config)
///
/// `AppColors` expõe estes tokens como getters estáticos que leem a
/// paleta "current" — assim as ~2900 referências existentes em todo o
/// código passam a ser dinâmicas sem alterar um único call-site.
class AppPalette {
  const AppPalette({
    required this.brightness,
    required this.primary,
    required this.primarySoft,
    required this.primaryDark,
    required this.accent,
    required this.teal,
    required this.bgDeep,
    required this.bgMid,
    required this.bgHigh,
    required this.card,
    required this.textPrimary,
    required this.textSecondary,
    required this.textMuted,
    required this.glassFill,
    required this.glassFillStrong,
    required this.glassBorder,
    required this.glassHighlight,
    required this.success,
    required this.warning,
    required this.danger,
    required this.info,
    required this.glowBlue,
    required this.glowTeal,
    required this.glowCyan,
    required this.heroCardGradient,
    required this.buttonGradient,
    required this.successGradient,
    required this.backgroundGradient,
    required this.navBar,
    required this.shadowTint,
    required this.skeletonBase,
    required this.skeletonHighlight,
    required this.starColor,
    required this.beamColor,
  });

  final Brightness brightness;
  bool get isDark => brightness == Brightness.dark;

  // ── Marca ──────────────────────────────────────────────────────────
  final Color primary;
  final Color primarySoft;
  final Color primaryDark;
  final Color accent;
  final Color teal;

  // ── Superfícies ────────────────────────────────────────────────────
  final Color bgDeep;
  final Color bgMid;
  final Color bgHigh;
  final Color card;

  // ── Texto ──────────────────────────────────────────────────────────
  final Color textPrimary;
  final Color textSecondary;
  final Color textMuted;

  // ── Vidro ──────────────────────────────────────────────────────────
  final Color glassFill;
  final Color glassFillStrong;
  final Color glassBorder;
  final Color glassHighlight;

  // ── Estados ────────────────────────────────────────────────────────
  final Color success;
  final Color warning;
  final Color danger;
  final Color info;

  // ── Brilhos do fundo (mesh) ────────────────────────────────────────
  final Color glowBlue;
  final Color glowTeal;
  final Color glowCyan;

  // ── Gradientes ─────────────────────────────────────────────────────
  final List<Color> heroCardGradient;
  final List<Color> buttonGradient;
  final List<Color> successGradient;
  final List<Color> backgroundGradient;

  // ── F33 — novos tokens de modo ─────────────────────────────────────
  /// Fundo da barra de navegação (sobre backdrop blur).
  final Color navBar;

  /// Cor-base para sombras grandes (usar com withOpacity no call-site).
  final Color shadowTint;

  /// Skeletons shimmer coerentes com o modo.
  final Color skeletonBase;
  final Color skeletonHighlight;

  /// Poeira cintilante do fundo (estrelas no escuro, brilho dourado-azul
  /// no claro).
  final Color starColor;

  /// Feixes de luz diagonais do fundo.
  final Color beamColor;

  // ── Modo escuro — "Noite Médica Abissal" (idêntico ao design F28–F32) ─
  static const AppPalette dark = AppPalette(
    brightness: Brightness.dark,
    primary: Color(0xFF1E6B9C), // Medical Trust Blue
    primarySoft: Color(0xFF2E86BF),
    primaryDark: Color(0xFF124B70),
    accent: Color(0xFF38BDF8), // glow ciano
    teal: Color(0xFF14B8A6),
    bgDeep: Color(0xFF060F1A),
    bgMid: Color(0xFF0A1826),
    bgHigh: Color(0xFF10263C),
    card: Color(0xFF0F2237),
    textPrimary: Color(0xFFF2F7FB),
    textSecondary: Color(0xFF9FB3C8),
    textMuted: Color(0xFF5D7285),
    glassFill: Color(0x14FFFFFF),
    glassFillStrong: Color(0x24FFFFFF),
    glassBorder: Color(0x1FFFFFFF),
    glassHighlight: Color(0x2EFFFFFF),
    success: Color(0xFF22C55E),
    warning: Color(0xFFF5A623),
    danger: Color(0xFFEF4444),
    info: Color(0xFF38BDF8),
    glowBlue: Color(0x3D1E6B9C),
    glowTeal: Color(0x2614B8A6),
    glowCyan: Color(0x1A38BDF8),
    heroCardGradient: [Color(0xFF2E86BF), Color(0xFF1E6B9C), Color(0xFF0C3555)],
    buttonGradient: [Color(0xFF2E86BF), Color(0xFF1E6B9C)],
    successGradient: [Color(0xFF34D399), Color(0xFF0E9F6E)],
    backgroundGradient: [Color(0xFF060F1A), Color(0xFF0A1826), Color(0xFF10263C)],
    navBar: Color(0xCC0B1D31),
    shadowTint: Color(0xFF020A14),
    skeletonBase: Color(0xFF16324D),
    skeletonHighlight: Color(0xFF245070),
    starColor: Color(0xB3FFFFFF),
    beamColor: Color(0x10FFFFFF),
  );

  // ── Modo claro — "Clareza Médica" (paridade com o :root da web) ──────
  static const AppPalette light = AppPalette(
    brightness: Brightness.light,
    primary: Color(0xFF1E6B9C),
    primarySoft: Color(0xFF2E86BF),
    primaryDark: Color(0xFF124B70),
    accent: Color(0xFF0E7FC0), // ciano escurecido p/ contraste em fundo claro
    teal: Color(0xFF0D9488), // teal 600 — identidade MZ da web
    bgDeep: Color(0xFFF4F7FE),
    bgMid: Color(0xFFEDF2FB),
    bgHigh: Color(0xFFE5EBF7),
    card: Color(0xFFFFFFFF),
    textPrimary: Color(0xFF172033),
    textSecondary: Color(0xFF4E5D77),
    textMuted: Color(0xFF8892A8),
    glassFill: Color(0xB3FFFFFF), // vidro branco 70%
    glassFillStrong: Color(0xE6FFFFFF),
    glassBorder: Color(0x121B2A4A), // navy 7%
    glassHighlight: Color(0x80FFFFFF),
    success: Color(0xFF16A34A),
    warning: Color(0xFFD97706),
    danger: Color(0xFFDC2626),
    info: Color(0xFF0E7FC0),
    glowBlue: Color(0x1F1E6B9C),
    glowTeal: Color(0x1A0D9488),
    glowCyan: Color(0x170E7FC0),
    // O cartão-herói mantém o gradiente azul-abissal: ilha escura
    // premium flutuando na tela clara (mesma lógica do wallet da web).
    heroCardGradient: [Color(0xFF2E86BF), Color(0xFF1E6B9C), Color(0xFF0C3555)],
    buttonGradient: [Color(0xFF2E86BF), Color(0xFF1E6B9C)],
    successGradient: [Color(0xFF34D399), Color(0xFF0E9F6E)],
    backgroundGradient: [Color(0xFFF4F7FE), Color(0xFFEDF2FB), Color(0xFFE5EBF7)],
    navBar: Color(0xF7FFFFFF),
    shadowTint: Color(0xFF27334D),
    skeletonBase: Color(0xFFE3E9F5),
    skeletonHighlight: Color(0xFFF7FAFF),
    starColor: Color(0x5C1E6B9C),
    beamColor: Color(0x0F1E6B9C),
  );

  /// Copia com sobreposição do branding do país (gestor regional muda
  /// as cores na Consola → toda a app veste a bandeira, em ambos os
  /// modos).
  AppPalette copyWithBranding(EffectivePalette? branding) {
    if (branding == null) return this;
    final hasBrand = branding.countryName != null &&
        branding.primary != AppPalette.dark.primary;
    if (!hasBrand) return this;
    return AppPalette(
      brightness: brightness,
      primary: branding.primary,
      primarySoft: branding.primarySoft,
      primaryDark: branding.primaryDark,
      accent: branding.accent,
      teal: teal,
      bgDeep: bgDeep,
      bgMid: bgMid,
      bgHigh: bgHigh,
      card: card,
      textPrimary: textPrimary,
      textSecondary: textSecondary,
      textMuted: textMuted,
      glassFill: glassFill,
      glassFillStrong: glassFillStrong,
      glassBorder: glassBorder,
      glassHighlight: glassHighlight,
      success: success,
      warning: warning,
      danger: danger,
      info: info,
      glowBlue: glowBlue,
      glowTeal: glowTeal,
      glowCyan: glowCyan,
      heroCardGradient: branding.heroCardGradient,
      buttonGradient: branding.buttonGradient,
      successGradient: successGradient,
      backgroundGradient: backgroundGradient,
      navBar: navBar,
      shadowTint: shadowTint,
      skeletonBase: skeletonBase,
      skeletonHighlight: skeletonHighlight,
      starColor: starColor,
      beamColor: beamColor,
    );
  }

  /// Resolução completa: brilho + branding.
  static AppPalette resolve({
    required Brightness brightness,
    EffectivePalette? branding,
  }) {
    final base = brightness == Brightness.dark ? dark : light;
    return base.copyWithBranding(branding);
  }
}
