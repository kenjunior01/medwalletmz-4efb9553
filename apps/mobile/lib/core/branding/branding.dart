import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config.dart';
import '../theme/app_colors.dart';

/// Configuração visual de um país — coluna `countries.branding_config`
/// editável pelos gestores regionais na Consola (F5). A app inteira
/// reflecte as cores: o mercado veste a bandeira.
///
/// ```json
/// {
///   "primary_color":   "#047857",
///   "secondary_color": "#064e3b",
///   "accent_color":    "#fbbf24",
///   "home_banner_url": null
/// }
/// ```
class BrandingConfig {
  const BrandingConfig({
    this.primary,
    this.secondary,
    this.accent,
    this.homeBannerUrl,
    this.countryName,
  });

  final Color? primary;
  final Color? secondary;
  final Color? accent;
  final String? homeBannerUrl;
  final String? countryName;

  /// Tema em falta → paleta padrão MedWallet (Medical Trust Blue).
  static const BrandingConfig fallback = BrandingConfig();

  factory BrandingConfig.fromJson(Map<String, dynamic> j,
      {String? countryName}) {
    return BrandingConfig(
      primary: _parseHex(j['primary_color'] as String?),
      secondary: _parseHex(j['secondary_color'] as String?),
      accent: _parseHex(j['accent_color'] as String?),
      homeBannerUrl: j['home_banner_url'] as String?,
      countryName: countryName,
    );
  }

  static Color? _parseHex(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    var hex = raw.trim().replaceFirst('#', '');
    if (hex.length == 6) hex = 'FF$hex';
    if (hex.length != 8) return null;
    final value = int.tryParse(hex, radix: 16);
    return value == null ? null : Color(value);
  }
}

/// Paleta efectiva da app — resolve defaults quando o país não define.
class EffectivePalette {
  const EffectivePalette({
    required this.primary,
    required this.primarySoft,
    required this.primaryDark,
    required this.accent,
    required this.heroCardGradient,
    required this.buttonGradient,
    required this.glowPrimary,
    required this.countryName,
  });

  final Color primary;
  final Color primarySoft;
  final Color primaryDark;
  final Color accent;
  final List<Color> heroCardGradient;
  final List<Color> buttonGradient;
  final Color glowPrimary;
  final String countryName;

  static const EffectivePalette defaults = EffectivePalette(
    primary: AppColors.primary,
    primarySoft: AppColors.primarySoft,
    primaryDark: AppColors.primaryDark,
    accent: AppColors.accent,
    heroCardGradient: AppColors.heroCardGradient,
    buttonGradient: AppColors.buttonGradient,
    glowPrimary: AppColors.glowBlue,
    countryName: null,
  );
}

/// Lê o país do utilizador pela carteira (wallets.country_id) e aplica
/// o branding_config. Utilizadores sem carteira ficam no tema padrão.
class BrandingRepository {
  BrandingRepository(this._client);

  final SupabaseClient _client;

  Future<BrandingConfig> fetchForCurrentUser() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return BrandingConfig.fallback;
    try {
      // 1) País da carteira.
      final walletRows = await _client
          .from('wallets')
          .select('country_id')
          .eq('user_id', uid)
          .limit(1);
      if (walletRows is! List || walletRows.isEmpty) {
        return BrandingConfig.fallback;
      }
      final countryId = (walletRows.first as Map)['country_id'] as String?;
      if (countryId == null || countryId.isEmpty) {
        return BrandingConfig.fallback;
      }

      // 2) Branding + nome do país.
      final countryRows = await _client
          .from('countries')
          .select('name, branding_config')
          .eq('id', countryId)
          .limit(1);
      if (countryRows is! List || countryRows.isEmpty) {
        return BrandingConfig.fallback;
      }
      final row = (countryRows.first as Map).cast<String, dynamic>();
      final config = row['branding_config'];
      return BrandingConfig.fromJson(
        config is Map ? (config).cast<String, dynamic>() : const {},
        countryName: row['name'] as String?,
      );
    } catch (_) {
      return BrandingConfig.fallback;
    }
  }
}

final brandingRepositoryProvider = Provider<BrandingRepository>((ref) {
  return BrandingRepository(Supabase.instance.client);
});

/// Paleta efectiva global — recarregável (puxa quando a carteira muda).
final effectivePaletteProvider =
    NotifierProvider<EffectivePaletteController, EffectivePalette>(
        EffectivePaletteController.new);

class EffectivePaletteController extends Notifier<EffectivePalette> {
  @override
  EffectivePalette build() {
    _load();
    return EffectivePalette.defaults;
  }

  Future<void> _load() async {
    if (!AppConfig.isConfigured) return;
    final repo = ref.read(brandingRepositoryProvider);
    final config = await repo.fetchForCurrentUser();
    state = _derive(config);
  }

  /// Recarrega manualmente (ex.: gestor acaba de mudar o branding).
  Future<void> refresh() => _load();

  EffectivePalette _derive(BrandingConfig config) {
    final primary = config.primary ?? AppColors.primary;
    final secondary = config.secondary ?? AppColors.primaryDark;
    final accent = config.accent ?? AppColors.accent;

    // Derivações HSL para manter o sistema glassmorphism coerente.
    final primarySoft = _lighten(primary, 0.14);
    final primaryDark = _darken(secondary, 0.06);
    final heroGradient = [primarySoft, primary, _darken(primary, 0.42)];
    final buttonGradient = [primarySoft, primary];
    final glow = primary.withOpacity(0.24);

    return EffectivePalette(
      primary: primary,
      primarySoft: primarySoft,
      primaryDark: primaryDark,
      accent: accent,
      heroCardGradient: heroGradient,
      buttonGradient: buttonGradient,
      glowPrimary: glow,
      countryName: config.countryName,
    );
  }

  Color _lighten(Color c, double amount) {
    final hsl = HSLColor.fromColor(c);
    return hsl
        .withLightness(
            (hsl.lightness + amount).clamp(0.0, 1.0))
        .toColor();
  }

  Color _darken(Color c, double amount) {
    final hsl = HSLColor.fromColor(c);
    return hsl
        .withLightness(
            (hsl.lightness - amount).clamp(0.0, 1.0))
        .toColor();
  }
}
