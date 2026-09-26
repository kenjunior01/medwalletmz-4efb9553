import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// F33 — micro-interação universal de toque (paridade `.mw-tap-bounce`
/// e `.press-effect` da web): encolhe ao pressionar e volta com curva
/// elástica `cubic-bezier(0.34, 1.56, 0.64, 1)` + haptic subtil.
///
/// Envolvê-la em vez de `GestureDetector` dá o "feel" tátil da web a
/// qualquer cartão/tile com uma linha. Respeita "reduzir movimento".
class Pressable extends StatefulWidget {
  const Pressable({
    super.key,
    required this.child,
    required this.onTap,
    this.scale = 0.955,
    this.haptic = true,
    this.enabled = true,
    this.behavior = HitTestBehavior.opaque,
  });

  final Widget child;
  final VoidCallback? onTap;

  /// Escala ao pressionar (0.955 ≈ press-effect da web; usar 0.88 para
  /// o tap-bounce exagerado dos ícones).
  final double scale;
  final bool haptic;
  final bool enabled;
  final HitTestBehavior behavior;

  @override
  State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable> {
  bool _down = false;

  bool get _reduceMotion =>
      MediaQuery.maybeOf(context)?.disableAnimations ?? false;

  void _set(bool v) {
    if (_down == v) return;
    setState(() => _down = v);
  }

  @override
  Widget build(BuildContext context) {
    final onTap = widget.enabled && widget.onTap != null ? widget.onTap : null;

    return GestureDetector(
      behavior: widget.behavior,
      onTapDown: onTap == null || _reduceMotion
          ? null
          : (_) => _set(true),
      onTapUp: onTap == null || _reduceMotion
          ? null
          : (_) => _set(false),
      onTapCancel: onTap == null || _reduceMotion ? null : () => _set(false),
      onTap: onTap == null
          ? null
          : () {
              if (widget.haptic) HapticFeedback.selectionClick();
              onTap!();
            },
      child: AnimatedScale(
        scale: _down ? widget.scale : 1.0,
        duration: Duration(milliseconds: _down ? 90 : 260),
        curve: _down ? Curves.easeOut : Curves.easeOutBack,
        child: widget.child,
      ),
    );
  }
}
