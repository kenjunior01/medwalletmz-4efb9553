import 'package:flutter/material.dart';

/// Consulta — tabela `consultations` (patient_id = auth.uid garantido por RLS).
class Consultation {
  const Consultation({
    required this.id,
    required this.doctorId,
    required this.patientId,
    required this.scheduledAt,
    required this.durationMinutes,
    required this.consultationType,
    required this.status,
    required this.fee,
    this.reason,
  });

  final String id;
  final String doctorId;
  final String patientId;
  final DateTime scheduledAt;
  final int durationMinutes;
  final String consultationType;
  final String status;
  final double fee;
  final String? reason;

  factory Consultation.fromJson(Map<String, dynamic> json) => Consultation(
        id: json['id'] as String,
        doctorId: json['doctor_id'] as String,
        patientId: json['patient_id'] as String,
        scheduledAt: DateTime.parse(json['scheduled_at'] as String),
        durationMinutes: (json['duration_minutes'] as num?)?.toInt() ?? 30,
        consultationType: json['consultation_type'] as String? ?? 'chat',
        status: json['status'] as String? ?? 'scheduled',
        fee: (json['fee'] as num?)?.toDouble() ?? 500,
        reason: json['reason'] as String?,
      );
}

String consultationStatusLabel(String s) => switch (s) {
      'scheduled' => 'Agendada',
      'in_progress' => 'Em curso',
      'completed' => 'Concluída',
      'cancelled' => 'Cancelada',
      'no_show' => 'Falta',
      _ => s,
    };

Color consultationStatusColor(String s) => switch (s) {
      'scheduled' => const Color(0xFF38BDF8),
      'in_progress' => const Color(0xFFF5A623),
      'completed' => const Color(0xFF22C55E),
      'cancelled' || 'no_show' => const Color(0xFFEF4444),
      _ => const Color(0xFF9FB3C8),
    };
