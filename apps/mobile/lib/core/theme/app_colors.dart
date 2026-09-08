import 'package:flutter/material.dart';

/// Design tokens — MedWallet Glassmorphism Fintech.
///
/// Paleta derivada do "Medical Trust Blue" (#1E6B9C) identificado no
/// design system do produto web, elevada para um modo escuro tipo
/// Revolut / Nubank: fundo azul-abissal, vidro translúcido e brilhos
/// ciano/turquesa (gradiente da bandeira marítima moçambicana
/// reinterpretado de forma premium).
abstract final class AppColors {
  // ── Marca ─────────────────────────────────────────────────────────
  static const Color primary = Color(0xFF1E6B9C); // Medical Trust Blue
  static const Color primarySoft = Color(0xFF2E86BF);
  static const Color primaryDark = Color(0xFF124B70);
  static const Color accent = Color(0xFF38BDF8); // Glow ciano
  static const Color teal = Color(0xFF14B8A6);

  // ── Superfícies (modo escuro) ─────────────────────────────────────
  static const Color bgDeep = Color(0xFF060F1A); // base do gradiente
  static const Color bgMid = Color(0xFF0A1826);
  static const Color bgHigh = Color(0xFF10263C);
  static const Color card = Color(0xFF0F2237);

  // ── Texto ─────────────────────────────────────────────────────────
  static const Color textPrimary = Color(0xFFF2F7FB);
  static const Color textSecondary = Color(0xFF9FB3C8);
  static const Color textMuted = Color(0xFF5D7285);

  // ── Vidro ─────────────────────────────────────────────────────────
  static const Color glassFill = Color(0x14FFFFFF); // branco 8%
  static const Color glassFillStrong = Color(0x24FFFFFF); // branco 14%
  static const Color glassBorder = Color(0x1FFFFFFF); // branco 12%
  static const Color glassHighlight = Color(0x2EFFFFFF); // topo do vidro

  // ── Estados ───────────────────────────────────────────────────────
  static const Color success = Color(0xFF22C55E);
  static const Color warning = Color(0xFFF5A623);
  static const Color danger = Color(0xFFEF4444);
  static const Color info = Color(0xFF38BDF8);

  // ── Brilhos do fundo (mesh) ───────────────────────────────────────
  static const Color glowBlue = Color(0x3D1E6B9C);
  static const Color glowTeal = Color(0x2614B8A6);
  static const Color glowCyan = Color(0x1A38BDF8);

  // ── Gradientes ────────────────────────────────────────────────────
  static const List<Color> heroCardGradient = [
    Color(0xFF2E86BF),
    Color(0xFF1E6B9C),
    Color(0xFF0C3555),
  ];
  static const List<Color> buttonGradient = [
    Color(0xFF2E86BF),
    Color(0xFF1E6B9C),
  ];
  static const List<Color> successGradient = [
    Color(0xFF34D399),
    Color(0xFF0E9F6E),
  ];
  static const List<Color> backgroundGradient = [
    bgDeep,
    bgMid,
    bgHigh,
  ];
}
