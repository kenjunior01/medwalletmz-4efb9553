import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../utils/formatters.dart';
import 'amount_counter.dart';

/// Cartão-herói da carteira: gradiente Medical Blue, reflexo diagonal
/// de luz, chip NFC estilizado, saldo com contador animado e ações
/// rápidas. Estilo cartão bancário premium (Revolut physical card).
class WalletCard extends StatefulWidget {
  const WalletCard({
    super.key,
    required this.balance,
    required this.ownerName,
    this.hidden = false,
    this.onToggleHidden,
    this.onDeposit,
    this.mini = false,
    this.onTap,
  });

  final double balance;
  final String? ownerName;
  final bool hidden;
  final VoidCallback? onToggleHidden;
  final VoidCallback? onDeposit;
  final bool mini;
  final VoidCallback? onTap;

  @override
  State<WalletCard> createState() => _WalletCardState();
}

class _WalletCardState extends State<WalletCard> {
  @override
  Widget build(BuildContext context) {
    final card = _buildCard(context);
    return widget.onTap == null
        ? card
        : GestureDetector(onTap: widget.onTap, child: card);
  }

  Widget _buildCard(BuildContext context) {
    final radius = widget.mini ? 20.0 : 26.0;
    return Container(
      height: widget.mini ? 120 : 196,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(radius),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: AppColors.heroCardGradient,
        ),
        border: Border.all(color: Colors.white.withOpacity(0.18)),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.5),
            blurRadius: 34,
            offset: const Offset(0, 16),
          ),
          BoxShadow(
            color: Colors.black.withOpacity(0.35),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: Stack(
          children: [
            // Reflexo de luz diagonal (sheen)
            Positioned.fill(
              child: IgnorePointer(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: const Alignment(-1.2, -1.4),
                      end: const Alignment(1.0, 1.4),
                      colors: [
                        Colors.white.withOpacity(0.22),
                        Colors.white.withOpacity(0.02),
                        Colors.transparent,
                      ],
                      stops: const [0, 0.35, 1],
                    ),
                  ),
                ),
              ),
            ),
            // Círculos decorativos (moedas/ondas)
            Positioned(
              right: -46,
              bottom: -56,
              child: IgnorePointer(
                child: Container(
                  width: 190,
                  height: 190,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Colors.white.withOpacity(0.10),
                      width: 22,
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              right: 34,
              top: -38,
              child: IgnorePointer(
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Colors.white.withOpacity(0.08),
                      width: 14,
                    ),
                  ),
                ),
              ),
            ),
            // Conteúdo
            Padding(
              padding: EdgeInsets.all(widget.mini ? 16 : 22),
              child: widget.mini ? _miniContent() : _fullContent(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _fullContent() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const _BrandBadge(),
              const Spacer(),
              if (widget.onToggleHidden != null)
                _IconPill(
                  icon: widget.hidden
                      ? Icons.visibility_off_rounded
                      : Icons.visibility_rounded,
                  onTap: widget.onToggleHidden,
                ),
            ],
          ),
          const Spacer(),
          Text(
            'Saldo disponível',
            style: TextStyle(
              color: Colors.white.withOpacity(0.75),
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.4,
            ),
          ),
          const SizedBox(height: 4),
          AmountCounter(
            value: widget.balance,
            hidden: widget.hidden,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 34,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.5,
            ),
          ),
          const Spacer(),
          Row(
            children: [
              Text(
                maskMzPhone(_ownerDisplay()),
                style: TextStyle(
                  color: Colors.white.withOpacity(0.85),
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const Spacer(),
              if (widget.onDeposit != null)
                GestureDetector(
                  onTap: widget.onDeposit,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 9),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Text(
                      '+ Depositar',
                      style: TextStyle(
                        color: Color(0xFF0C3555),
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      );

  Widget _miniContent() => Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Row(
                  children: [
                    const _BrandBadge(compact: true),
                    const SizedBox(width: 8),
                    Text(
                      'Saldo',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.75),
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                AmountCounter(
                  value: widget.balance,
                  hidden: widget.hidden,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right_rounded, color: Colors.white70),
        ],
      );

  String _ownerDisplay() => widget.ownerName ?? '';
}

class _BrandBadge extends StatelessWidget {
  const _BrandBadge({this.compact = false});

  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.14),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withOpacity(0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.health_and_safety_rounded,
              size: 14, color: Colors.white),
          const SizedBox(width: 6),
          Text(
            'MedWallet',
            style: TextStyle(
              color: Colors.white,
              fontSize: compact ? 11 : 12.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }
}

class _IconPill extends StatelessWidget {
  const _IconPill({required this.icon, this.onTap});

  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white.withOpacity(0.12),
          border: Border.all(color: Colors.white.withOpacity(0.18)),
        ),
        child: Icon(icon, size: 18, color: Colors.white),
      ),
    );
  }
}
