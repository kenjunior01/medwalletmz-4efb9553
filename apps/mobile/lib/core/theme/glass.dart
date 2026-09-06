import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';

/// Vidro translúcido com blur — componente-base do design MedWallet.
/// Gradiente diagonal branco (luz no topo-esquerda), borda hairline
/// branca a 12% e sombra profunda para flutuar sobre o fundo mesh.
class GlassContainer extends StatelessWidget {
  const GlassContainer({
    super.key,
    required this.child,
    this.radius = 24,
    this.blur = 22,
    this.padding = EdgeInsets.zero,
    this.margin,
    this.fill = AppGlass.fill,
    this.border,
    this.gradient,
    this.shadow,
    this.onTap,
  });

  final Widget child;
  final double radius;
  final double blur;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final Color fill;
  final Color? border;
  final Gradient? gradient;
  final List<BoxShadow>? shadow;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final borderRadius = BorderRadius.circular(radius);

    Widget glass = ClipRRect(
      borderRadius: borderRadius,
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: gradient ??
                LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [fill, AppGlass.bottom],
                ),
            borderRadius: borderRadius,
            border: Border.all(color: border ?? AppGlass.border, width: 1),
            boxShadow: shadow ??
                [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.25),
                    blurRadius: 30,
                    offset: const Offset(0, 12),
                  ),
                ],
          ),
          child: padding == EdgeInsets.zero
              ? child
              : Padding(padding: padding, child: child),
        ),
      ),
    );

    if (onTap != null) {
      glass = Material(
        type: MaterialType.transparency,
        child: InkWell(
          onTap: onTap,
          borderRadius: borderRadius,
          child: glass,
        ),
      );
    }

    return Padding(padding: margin ?? EdgeInsets.zero, child: glass);
  }
}

/// Tokens de vidro reutilizáveis.
abstract final class AppGlass {
  static const Color fill = Color(0x14FFFFFF); // branco 8%
  static const Color bottom = Color(0x08FFFFFF); // branco 3%
  static const Color border = Color(0x1FFFFFFF); // branco 12%
}
