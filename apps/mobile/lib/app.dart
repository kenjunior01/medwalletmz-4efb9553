import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/branding/branding.dart';
import 'core/config.dart';
import 'core/router/app_router.dart';
import 'core/security/app_lock.dart';
import 'core/theme/app_theme.dart';

/// Raiz da app — aplica o tema dark glassmorphism com a PALETA EFECTIVA
/// do país do utilizador (countries.branding_config). Quando o gestor
/// regional publica novas cores na Consola, a app veste a bandeira.
class MedWalletApp extends ConsumerWidget {
  const MedWalletApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final palette = ref.watch(effectivePaletteProvider);

    return MaterialApp.router(
      title: 'MedWallet MZ',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark(palette),
      themeMode: ThemeMode.dark,
      routerConfig: router,
      builder: (context, child) {
        // Aviso explícito se correr sem as dart-defines de ambiente.
        if (!AppConfig.isConfigured) {
          return _MissingConfig(child: child);
        }
        // Bloqueio biométrico (exclusivo móvel): véu + desafio quando a
        // preferência está activa e a app volta do segundo plano.
        return AppLockGate(child: child ?? const SizedBox.shrink());
      },
    );
  }
}

class _MissingConfig extends StatelessWidget {
  const _MissingConfig({required this.child});

  final Widget? child;

  @override
  Widget build(BuildContext context) {
    return Banner(
      message: 'SEM CONFIG',
      location: BannerLocation.topEnd,
      color: Colors.red.shade700,
      child: child ?? const SizedBox.shrink(),
    );
  }
}
