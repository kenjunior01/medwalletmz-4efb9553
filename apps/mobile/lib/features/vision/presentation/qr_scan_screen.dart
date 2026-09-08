import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../../core/theme/app_colors.dart';

/// ── Scanner de QR em tempo real (EXCLUSIVO MÓVEL) ────────────────────
///
/// A web não tem câmara: só o telemóvel lê o QR impresso no papel da
/// receita ou mostrado noutro ecrã. Devolve o texto lido via
/// `Navigator.pop(context, code)` — o chamador (ex.: Verificar receita)
/// preenche o formulário automaticamente.
///
/// Aceita qualquer payload de texto; o chamador decide se faz sentido
/// (ex.: prefixo MW- do código de verificação de receitas).
class QrScanScreen extends StatefulWidget {
  const QrScanScreen({super.key});

  @override
  State<QrScanScreen> createState() => _QrScanScreenState();
}

class _QrScanScreenState extends State<QrScanScreen> {
  MobileScannerController? _controller;
  bool _handled = false;
  String? _error;
  bool _torchOn = false;

  @override
  void initState() {
    super.initState();
    _start();
  }

  Future<void> _start() async {
    final controller = MobileScannerController(
      detectionSpeed: DetectionSpeed.normal,
      facing: CameraFacing.back,
      torchEnabled: false,
    );
    setState(() {
      _controller = controller;
      _error = null;
    });
    try {
      await controller.start();
    } catch (_) {
      if (mounted) {
        setState(() {
          _error =
              'Não foi possível abrir a câmara. Confirma a permissão nas '
              'definições do telemóvel.';
        });
      }
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_handled) return;
    for (final barcode in capture.barcodes) {
      final value = barcode.rawValue;
      if (value == null || value.isEmpty) continue;
      _handled = true;
      HapticFeedback.mediumImpact();
      if (mounted) Navigator.of(context).pop(value);
      return;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        title: const Text(
          'Escanear código',
          style: TextStyle(
            color: Colors.white,
            fontSize: 17,
            fontWeight: FontWeight.w800,
          ),
        ),
        actions: [
          IconButton(
            tooltip: 'Flash',
            onPressed: () async {
              HapticFeedback.selectionClick();
              final c = _controller;
              if (c == null) return;
              try {
                await c.toggleTorch();
                if (mounted) setState(() => _torchOn = !_torchOn);
              } catch (_) {}
            },
            icon: Icon(
              _torchOn ? Icons.flash_on_rounded : Icons.flash_off_rounded,
              color: Colors.white,
            ),
          ),
        ],
      ),
      body: Stack(
        children: [
          if (_controller != null && _error == null)
            MobileScanner(
              controller: _controller!,
              onDetect: _onDetect,
              errorBuilder: (context, error, __) => _ScanError(
                message: 'Câmara indisponível. ${error.errorCode.name}',
                onRetry: _start,
              ),
            )
          else if (_error != null)
            _ScanError(message: _error!, onRetry: _start)
          else
            const Center(
              child: CircularProgressIndicator(color: AppColors.accent),
            ),

          // Máscara com moldura de mira.
          if (_error == null)
            IgnorePointer(
              child: CustomPaint(painter: _ReticlePainter(), size: Size.infinite),
            ),

          // Dica no fundo.
          Positioned(
            left: 24,
            right: 24,
            bottom: 48,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.55),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white.withOpacity(0.12)),
              ),
              child: const Text(
                'Aponta para o QR da receita ou do cartão MedWallet. '
                'A leitura é automática.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 12.5,
                  height: 1.4,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ScanError extends StatelessWidget {
  const _ScanError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.no_photography_rounded,
                color: AppColors.textSecondary, size: 44),
            const SizedBox(height: 14),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 13.5,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 18),
            TextButton.icon(
              onPressed: () {
                context.pop();
              },
              icon: const Icon(Icons.arrow_back_rounded, size: 18),
              label: const Text('Voltar'),
              style: TextButton.styleFrom(foregroundColor: AppColors.accent),
            ),
          ],
        ),
      ),
    );
  }
}

/// Moldura central estilo viewfinder com cantos arredondados brilhantes.
class _ReticlePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final shortest = size.shortestSide;
    final side = shortest * 0.62;
    final rect = Rect.fromCenter(
      center: Offset(size.width / 2, size.height / 2 - 40),
      width: side,
      height: side,
    );

    // Escurece tudo fora da moldura.
    final dark = Paint()..color = Colors.black.withOpacity(0.45);
    canvas.drawPath(
      Path.combine(
        PathOperation.difference,
        Path()..addRect(Offset.zero & size),
        Path()
          ..addRRect(RRect.fromRectAndRadius(rect, const Radius.circular(24))),
      ),
      dark,
    );

    // Cantos brilhantes.
    final stroke = Paint()
      ..color = AppColors.accent
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;
    const corner = 28.0;

    final topLeft = Path()
      ..moveTo(rect.left, rect.top + corner)
      ..lineTo(rect.left, rect.top + 4)
      ..arcToPoint(
        Offset(rect.left + 4, rect.top),
        radius: const Radius.circular(24),
        clockwise: true,
      )
      ..lineTo(rect.left + corner, rect.top);
    canvas.drawPath(topLeft, stroke);

    final topRight = Path()
      ..moveTo(rect.right - corner, rect.top)
      ..lineTo(rect.right - 4, rect.top)
      ..arcToPoint(
        Offset(rect.right, rect.top + 4),
        radius: const Radius.circular(24),
        clockwise: true,
      )
      ..lineTo(rect.right, rect.top + corner);
    canvas.drawPath(topRight, stroke);

    final bottomLeft = Path()
      ..moveTo(rect.left, rect.bottom - corner)
      ..lineTo(rect.left, rect.bottom - 4)
      ..arcToPoint(
        Offset(rect.left + 4, rect.bottom),
        radius: const Radius.circular(24),
        clockwise: false,
      )
      ..lineTo(rect.left + corner, rect.bottom);
    canvas.drawPath(bottomLeft, stroke);

    final bottomRight = Path()
      ..moveTo(rect.right - corner, rect.bottom)
      ..lineTo(rect.right - 4, rect.bottom)
      ..arcToPoint(
        Offset(rect.right, rect.bottom - 4),
        radius: const Radius.circular(24),
        clockwise: false,
      )
      ..lineTo(rect.right, rect.bottom - corner);
    canvas.drawPath(bottomRight, stroke);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
