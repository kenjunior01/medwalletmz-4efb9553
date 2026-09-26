import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// Botão primário com gradiente Medical Blue, glow externo, varrimento
/// de luz periódico (paridade `ShimmerButton` da web — um brilho branco
/// atravessa o botão a cada ~2.8 s) e micro-interação de pressão.
class GradientButton extends StatefulWidget {
   const GradientButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.loading = false,
    this.enabled = true,
    this.height = 54,
    this.gradient,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool loading;
  final bool enabled;
  final double height;
  final Gradient? gradient;

  @override
  State<GradientButton> createState() => _GradientButtonState();
}

class _GradientButtonState extends State<GradientButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _sweep;
  bool _pressed = false;

  bool get _interactive =>
      widget.enabled && !widget.loading && widget.onPressed != null;

  @override
  void initState() {
    super.initState();
    _sweep = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2800),
    )..repeat();
  }

  @override
  void dispose() {
    _sweep.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final disabled = !_interactive;
    final reduceMotion = MediaQuery.of(context).disableAnimations;
    final gradient = widget.gradient ??
        (disabled
            ? LinearGradient(
                colors: [
                  AppColors.glassFillStrong,
                  AppColors.glassFill,
                ],
              )
            : LinearGradient(
                colors: AppColors.buttonGradient,
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
              ));

    return AnimatedScale(
      scale: _pressed ? 0.97 : 1,
      duration: const Duration(milliseconds: 120),
      curve: Curves.easeOut,
      child: GestureDetector(
        onTapDown: (_) => setState(() => _pressed = true),
        onTapUp: (_) => setState(() => _pressed = false),
        onTapCancel: () => setState(() => _pressed = false),
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            gradient: gradient,
            border: Border.all(
              color: AppColors.isDark
                  ? (disabled
                      ? Colors.white.withOpacity(0.06)
                      : Colors.white.withOpacity(0.16))
                  : (disabled
                      ? AppColors.glassBorder
                      : Colors.white.withOpacity(0.35)),
            ),
            boxShadow: disabled
                ? null
                : [
                    BoxShadow(
                      color: AppColors.primary.withOpacity(
                          AppColors.isDark ? 0.55 : 0.30),
                      blurRadius: 26,
                      offset: const Offset(0, 10),
                    ),
                  ],
          ),
          child: Material(
            type: MaterialType.transparency,
            child: InkWell(
              onTap: _interactive ? widget.onPressed : null,
              borderRadius: BorderRadius.circular(18),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: Stack(
                  children: [
                    // ── Varrimento de luz (ShimmerButton da web) ────
                    if (!disabled && !reduceMotion)
                      Positioned.fill(
                        child: IgnorePointer(
                          child: AnimatedBuilder(
                            animation: _sweep,
                            builder: (context, _) => Align(
                              alignment: Alignment(
                                  _sweep.value * 2.6 - 1.8, 0),
                              child: Transform.rotate(
                                angle: -math.pi / 5.2, // ~105°/2 diagonal
                                child: Container(
                                  width: 44,
                                  height: 220,
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      colors: [
                                        Colors.white.withOpacity(0),
                                        Colors.white
                                            .withOpacity(AppColors.isDark
                                            ? 0.20
                                            : 0.34),
                                        Colors.white.withOpacity(0),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    SizedBox(
                      height: widget.height,
                      child: Center(
                        child: widget.loading
                            ? const SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.4,
                                  color: Colors.white,
                                ),
                              )
                            : Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (widget.icon != null) ...[
                                    Icon(widget.icon,
                                        size: 20, color: Colors.white),
                                    const SizedBox(width: 10),
                                  ],
                                  Text(
                                    widget.label,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 15.5,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 0.2,
                                    ),
                                  ),
                                ],
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Botão secundário "ghost" em vidro — para ações de apoio.
class GlassGhostButton extends StatelessWidget {
   const GlassGhostButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.danger = false,
    this.height = 54,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool danger;
  final double height;

  @override
  Widget build(BuildContext context) {
    return Material(
      type: MaterialType.transparency,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          height: height,
          padding: const EdgeInsets.symmetric(horizontal: 20),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            color: AppColors.glassFill,
            border: Border.all(
              color: danger
                  ? AppColors.danger.withOpacity(0.5)
                  : AppColors.glassBorder,
            ),
          ),
          child: Center(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (icon != null) ...[
                  Icon(icon,
                      size: 20,
                      color: danger ? AppColors.danger : AppColors.textPrimary),
                  const SizedBox(width: 10),
                ],
                Text(
                  label,
                  style: TextStyle(
                    color: danger ? AppColors.danger : AppColors.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
