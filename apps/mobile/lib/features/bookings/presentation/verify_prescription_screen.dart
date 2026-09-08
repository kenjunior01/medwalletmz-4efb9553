import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/gradient_button.dart';

/// ── Modelo ───────────────────────────────────────────────────────────

/// Resultado do RPC `verify_prescription(_code)` (público na BD).
class PrescriptionCheck {
  const PrescriptionCheck({
    required this.code,
    required this.status,
    required this.isValid,
    this.doctorName,
    this.doctorLicense,
    this.patientInitials,
    this.emittedAt,
    this.expiresAt,
    this.itemsCount = 0,
    this.signatureHash,
  });

  final String code;
  final String status;
  final bool isValid;
  final String? doctorName;
  final String? doctorLicense;
  final String? patientInitials;
  final DateTime? emittedAt;
  final DateTime? expiresAt;
  final int itemsCount;
  final String? signatureHash;

  factory PrescriptionCheck.fromJson(Map<String, dynamic> j) =>
      PrescriptionCheck(
        code: (j['code'] ?? '') as String,
        status: (j['status'] ?? '') as String,
        isValid: (j['is_valid'] as bool?) ?? false,
        doctorName: j['doctor_name'] as String?,
        doctorLicense: j['doctor_license'] as String?,
        patientInitials: j['patient_initials'] as String?,
        emittedAt: _date(j['emitted_at']),
        expiresAt: _date(j['expires_at']),
        itemsCount: (j['items_count'] as num?)?.toInt() ?? 0,
        signatureHash: j['signature_hash'] as String?,
      );

  static DateTime? _date(Object? v) =>
      v == null ? null : DateTime.tryParse(v.toString());

  String get statusLabel => switch (status) {
        'active' => 'Válida',
        'expired' => 'Expirada',
        'cancelled' => 'Cancelada',
        'used' => 'Já utilizada',
        _ => status.isEmpty ? 'Desconhecido' : status,
      };
}

/// ── Ecrã ─────────────────────────────────────────────────────────────

/// Verificação pública de receitas (farmácias e pacientes): introduz o
/// código e valida contra o RPC oficial `verify_prescription` da base —
/// o mesmo usado pelo link /verify da web.
class VerifyPrescriptionScreen extends ConsumerStatefulWidget {
  const VerifyPrescriptionScreen({super.key});

  @override
  ConsumerState<VerifyPrescriptionScreen> createState() =>
      _VerifyPrescriptionScreenState();
}

class _VerifyPrescriptionScreenState
    extends ConsumerState<VerifyPrescriptionScreen> {
  final _codeCtrl = TextEditingController();
  PrescriptionCheck? _result;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _codeCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 8, 20, 0),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.of(context).maybePop(),
                      icon: const Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    const Text(
                      'Verificar receita',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 14, 20, 40),
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(colors: [
                          Color(0x331E6B9C),
                          Color(0x1414B8A6),
                        ]),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.glassBorder),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.verified_user_rounded,
                              color: AppColors.accent, size: 26),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Text(
                              'Introduz o código da receita para confirmar se é autêntica, quem a emitiu e se continua válida — ideal para farmácias.',
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.65),
                                fontSize: 12.5,
                                height: 1.5,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ).animate().fadeIn(duration: 280.ms),
                    const SizedBox(height: 20),
                    TextField(
                      controller: _codeCtrl,
                      textCapitalization: TextCapitalization.characters,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.6,
                        fontFamily: 'monospace',
                      ),
                      decoration: const InputDecoration(
                        hintText: 'MW-XXXX-XXXX',
                        labelText: 'Código de verificação',
                        prefixIcon: Icon(Icons.badge_rounded),
                      ),
                      onSubmitted: (_) => _verify(),
                    ),
                    const SizedBox(height: 14),
                    GradientButton(
                      label: 'Verificar',
                      icon: Icons.search_rounded,
                      loading: _loading,
                      enabled: _codeCtrl.text.trim().length >= 4,
                      onPressed: _verify,
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 16),
                      _StatusCard(
                        icon: Icons.error_outline_rounded,
                        color: AppColors.danger,
                        title: 'Não encontrada',
                        message: _error!,
                      ),
                    ],
                    if (_result != null) ...[
                      const SizedBox(height: 16),
                      _resultCard(_result!),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _resultCard(PrescriptionCheck r) {
    final ok = r.isValid;
    final color = ok ? AppColors.success : AppColors.danger;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.45)),
      ),
      child: Column(
        children: [
          Container(
            width: 62,
            height: 62,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: color.withOpacity(0.14),
              border: Border.all(color: color.withOpacity(0.5)),
            ),
            child: Icon(
              ok ? Icons.check_circle_rounded : Icons.cancel_rounded,
              color: color,
              size: 34,
            ),
          ).animate().scale(duration: 380.ms, curve: Curves.elasticOut),
          const SizedBox(height: 12),
          Text(
            ok ? 'Receita autêntica' : 'Receita não válida',
            style: TextStyle(
              color: color,
              fontSize: 17,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: color.withOpacity(0.13),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              r.statusLabel,
              style: TextStyle(
                  color: color, fontSize: 11.5, fontWeight: FontWeight.w800),
            ),
          ),
          const SizedBox(height: 16),
          _kv('Código', r.code, mono: true),
          _kv('Médico', r.doctorName ?? '—'),
          if (r.doctorLicense != null) _kv('Licença', r.doctorLicense!),
          _kv('Paciente', r.patientInitials ?? '—'),
          if (r.emittedAt != null) _kv('Emitida a', formatDateTime(r.emittedAt!)),
          if (r.expiresAt != null) _kv('Válida até', formatDateTime(r.expiresAt!)),
          _kv('Medicamentos', '${r.itemsCount}'),
          if (r.signatureHash != null)
            _kv('Assinatura', r.signatureHash!, mono: true),
          const SizedBox(height: 14),
          QrImageView(
            data: 'https://medwalletmz.online/verify/${r.code}',
            size: 120,
            backgroundColor: Colors.white,
            eyeStyle: const QrEyeStyle(
                eyeShape: QrEyeShape.square, color: Color(0xFF0B1D31)),
            dataModuleStyle: const QrDataModuleStyle(
                dataModuleShape: QrDataModuleShape.square,
                color: Color(0xFF0B1D31)),
          ),
          const SizedBox(height: 8),
          Text(
            'Mostra este QR na farmácia para validação rápida.',
            style: TextStyle(
                color: Colors.white.withOpacity(0.4), fontSize: 11),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 320.ms);
  }

  Widget _kv(String label, String value, {bool mono = false}) => Padding(
        padding: const EdgeInsets.only(bottom: 9),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 108,
              child: Text(
                label,
                style: const TextStyle(
                    color: AppColors.textMuted, fontSize: 12.5),
              ),
            ),
            Expanded(
              child: GestureDetector(
                onLongPress: mono
                    ? () {
                        Clipboard.setData(ClipboardData(text: value));
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('$label copiado')),
                        );
                      }
                    : null,
                child: Text(
                  value,
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    fontFamily: mono ? 'monospace' : null,
                  ),
                ),
              ),
            ),
          ],
        ),
      );

  Future<void> _verify() async {
    final code = _codeCtrl.text.trim().toUpperCase();
    if (code.length < 4 || _loading) return;
    setState(() {
      _loading = true;
      _error = null;
      _result = null;
    });
    try {
      final res = await Supabase.instance.client
          .rpc('verify_prescription', params: {'_code': code});
      if (res is List && res.isNotEmpty) {
        if (mounted) {
          setState(() => _result = PrescriptionCheck.fromJson(
              Map<String, dynamic>.from(res.first as Map)));
        }
      } else if (res is Map) {
        if (mounted) {
          setState(() => _result =
              PrescriptionCheck.fromJson(Map<String, dynamic>.from(res)));
        }
      } else {
        if (mounted) {
          setState(() => _error =
              'Nenhuma receita com o código "$code". Confere os caracteres.');
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Falha ao verificar. Tenta de novo.');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}

/// Cartão de estado (erro) com o mesmo estilo do resultado.
class _StatusCard extends StatelessWidget {
  const _StatusCard({
    required this.icon,
    required this.color,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: color.withOpacity(0.4)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 30),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                      color: color,
                      fontSize: 14.5,
                      fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 3),
                Text(
                  message,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.62),
                    fontSize: 12.5,
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
