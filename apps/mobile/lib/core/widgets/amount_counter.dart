import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../utils/formatters.dart';

/// Contador animado de saldo: os dígitos deslizam para cima quando o
/// valor muda (efeito "odometer" das fintechs premium).
class AmountCounter extends StatelessWidget {
  const AmountCounter({
    super.key,
    required this.value,
    this.style,
    this.hidden = false,
    this.duration = const Duration(milliseconds: 900),
  });

  final double value;
  final TextStyle? style;
  final bool hidden;
  final Duration duration;

  @override
  Widget build(BuildContext context) {
    if (hidden) return _masked();

    return TweenAnimationBuilder<double>(
      tween: Tween(end: value),
      duration: duration,
      curve: Curves.easeOutExpo,
      builder: (context, anim, _) => Text(
        formatMZN(anim),
        style: style,
      ),
    );
  }

  Widget _masked() {
    final base = (style ?? const TextStyle());
    final fontSize = base.fontSize ?? 34;
    return Text(
      '•••••• MT',
      style: base.copyWith(
        color: base.color?.withOpacity(0.45) ??
            AppColors.textPrimary.withOpacity(0.45),
        letterSpacing: fontSize * 0.06,
      ),
    );
  }
}
