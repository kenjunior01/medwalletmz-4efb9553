/// Receita médica — tabela `prescriptions` (doctor_id/patient_id são
/// auth users; validade = status active + expires_at no futuro).
class Prescription {
  const Prescription({
    required this.id,
    required this.doctorId,
    required this.patientId,
    required this.status,
    required this.createdAt,
    required this.expiresAt,
    this.consultationId,
    this.notes,
    this.verificationCode,
  });

  final String id;
  final String doctorId;
  final String patientId;
  final String status;
  final DateTime createdAt;
  final DateTime? expiresAt;
  final String? consultationId;
  final String? notes;
  final String? verificationCode;

  bool get isValid =>
      status == 'active' &&
      (expiresAt == null || expiresAt!.isAfter(DateTime.now()));

  int? get daysLeft {
    final exp = expiresAt;
    if (exp == null) return null;
    return exp.difference(DateTime.now()).inDays;
  }

  factory Prescription.fromJson(Map<String, dynamic> j) => Prescription(
        id: j['id'] as String,
        doctorId: (j['doctor_id'] ?? '') as String,
        patientId: (j['patient_id'] ?? '') as String,
        status: j['status'] as String? ?? 'active',
        createdAt: DateTime.tryParse(j['created_at']?.toString() ?? '') ??
            DateTime.now(),
        expiresAt: j['expires_at'] == null
            ? null
            : DateTime.tryParse(j['expires_at'].toString()),
        consultationId: j['consultation_id'] as String?,
        notes: j['notes'] as String?,
        verificationCode: j['verification_code'] as String?,
      );
}

/// Item da receita — tabela `prescription_items`.
class PrescriptionItem {
  const PrescriptionItem({
    required this.id,
    required this.prescriptionId,
    required this.medicationName,
    this.dosage,
    this.frequency,
    this.duration,
    this.instructions,
  });

  final String id;
  final String prescriptionId;
  final String medicationName;
  final String? dosage;
  final String? frequency;
  final String? duration;
  final String? instructions;

  factory PrescriptionItem.fromJson(Map<String, dynamic> j) =>
      PrescriptionItem(
        id: j['id'] as String,
        prescriptionId: j['prescription_id'] as String,
        medicationName: (j['medication_name'] ?? '') as String,
        dosage: j['dosage'] as String?,
        frequency: j['frequency'] as String?,
        duration: j['duration'] as String?,
        instructions: j['instructions'] as String?,
      );
}
