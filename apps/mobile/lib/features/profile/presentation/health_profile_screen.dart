import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../auth/presentation/auth_controller.dart';

/// ── Modelo ───────────────────────────────────────────────────────────

/// Perfil de saúde do paciente (tabela `patient_profiles` — dados que
/// alimentam o SOS, a triagem e a ficha de emergência).
class PatientProfile {
  const PatientProfile({
    this.dateOfBirth,
    this.gender,
    this.bloodType,
    this.allergies = const [],
    this.chronicConditions = const [],
    this.currentMedications = const [],
    this.emergencyContactName,
    this.emergencyContactPhone,
  });

  final DateTime? dateOfBirth;
  final String? gender;
  final String? bloodType;
  final List<String> allergies;
  final List<String> chronicConditions;
  final List<String> currentMedications;
  final String? emergencyContactName;
  final String? emergencyContactPhone;

  bool get isEmpty =>
      dateOfBirth == null &&
      gender == null &&
      bloodType == null &&
      allergies.isEmpty &&
      chronicConditions.isEmpty &&
      currentMedications.isEmpty &&
      (emergencyContactName == null || emergencyContactName!.isEmpty);

  factory PatientProfile.fromJson(Map<String, dynamic> j) => PatientProfile(
        dateOfBirth: j['date_of_birth'] == null
            ? null
            : DateTime.tryParse(j['date_of_birth'].toString()),
        gender: j['gender'] as String?,
        bloodType: j['blood_type'] as String?,
        allergies: _strList(j['allergies']),
        chronicConditions: _strList(j['chronic_conditions']),
        currentMedications: _strList(j['current_medications']),
        emergencyContactName: j['emergency_contact_name'] as String?,
        emergencyContactPhone: j['emergency_contact_phone'] as String?,
      );

  static List<String> _strList(Object? v) => v is List
      ? v.map((e) => e.toString()).where((s) => s.isNotEmpty).toList()
      : const [];

  Map<String, dynamic> toJson() => {
        'date_of_birth': dateOfBirth?.toIso8601String().substring(0, 10),
        'gender': gender,
        'blood_type': bloodType,
        'allergies': allergies,
        'chronic_conditions': chronicConditions,
        'current_medications': currentMedications,
        'emergency_contact_name': emergencyContactName,
        'emergency_contact_phone': emergencyContactPhone,
      };
}

/// ── Provider ─────────────────────────────────────────────────────────

final patientProfileProvider = FutureProvider<PatientProfile?>((ref) async {
  final uid = ref.watch(currentUserIdProvider);
  if (uid == null) return null;
  final rows = await Supabase.instance.client
      .from('patient_profiles')
      .select()
      .eq('user_id', uid)
      .limit(1);
  if (rows.isEmpty) return null;
  return PatientProfile.fromJson(rows.first);
});

/// ── Ecrã ─────────────────────────────────────────────────────────────

/// Ficha de saúde: tipo de sangue, alergias, condições crónicas,
/// medicação actual e contacto de emergência. Alimentada por upsert em
/// `patient_profiles` (RLS própria) — os mesmos dados usados pelo SOS.
class HealthProfileScreen extends ConsumerStatefulWidget {
  const HealthProfileScreen({super.key});

  @override
  ConsumerState<HealthProfileScreen> createState() =>
      _HealthProfileScreenState();
}

class _HealthProfileScreenState extends ConsumerState<HealthProfileScreen> {
  static const _bloodTypes = [
    'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Não sei',
  ];

  DateTime? _dob;
  String? _gender;
  String? _blood;
  late List<String> _allergies;
  late List<String> _chronic;
  late List<String> _meds;
  final _ecName = TextEditingController();
  final _ecPhone = TextEditingController();
  final _tagCtrl = TextEditingController();

  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _allergies = [];
    _chronic = [];
    _meds = [];
    _load();
  }

  @override
  void dispose() {
    _ecName.dispose();
    _ecPhone.dispose();
    _tagCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final p = await ref.read(patientProfileProvider.future);
      if (!mounted) return;
      setState(() {
        _dob = p?.dateOfBirth;
        _gender = p?.gender;
        _blood = p?.bloodType;
        _allergies = [...?p?.allergies];
        _chronic = [...?p?.chronicConditions];
        _meds = [...?p?.currentMedications];
        _ecName.text = p?.emergencyContactName ?? '';
        _ecPhone.text = p?.emergencyContactPhone ?? '';
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
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
                      onPressed: () => context.pop(),
                      icon: const Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    const Text(
                      'Perfil de saúde',
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
                child: _loading
                    ? const Center(
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : SingleChildScrollView(
                        padding: const EdgeInsets.fromLTRB(20, 14, 20, 40),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _card(
                              icon: Icons.water_drop_rounded,
                              title: 'Dados essenciais',
                              child: Column(
                                children: [
                                  _dateTile(),
                                  const SizedBox(height: 12),
                                  _genderChips(),
                                  const SizedBox(height: 14),
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: _bloodTypes
                                        .map((b) => _selectChip(
                                              b,
                                              selected: _blood == b,
                                              color: AppColors.danger,
                                              onTap: () =>
                                                  setState(() => _blood = b),
                                            ))
                                        .toList(),
                                  ),
                                ],
                              ),
                            ),
                            _card(
                              icon: Icons.report_rounded,
                              title: 'Alergias',
                              child: _tagEditor(
                                controller: _allergies,
                                hint: 'Ex.: penicilina, amendoim…',
                                tagCtrl: _tagCtrl,
                                color: AppColors.warning,
                              ),
                            ),
                            _card(
                              icon: Icons.favorite_rounded,
                              title: 'Condições crónicas',
                              child: _tagEditor(
                                controller: _chronic,
                                hint: 'Ex.: diabetes, hipertensão…',
                                color: const Color(0xFFC084FC),
                              ),
                            ),
                            _card(
                              icon: Icons.medication_rounded,
                              title: 'Medicação actual',
                              child: _tagEditor(
                                controller: _meds,
                                hint: 'Ex.: metformina 500mg…',
                                color: AppColors.success,
                              ),
                            ),
                            _card(
                              icon: Icons.contact_phone_rounded,
                              title: 'Contacto de emergência',
                              child: Column(
                                children: [
                                  TextField(
                                    controller: _ecName,
                                    style: const TextStyle(
                                        color: AppColors.textPrimary),
                                    decoration: const InputDecoration(
                                      labelText: 'Nome',
                                      prefixIcon:
                                          Icon(Icons.person_rounded),
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  TextField(
                                    controller: _ecPhone,
                                    keyboardType: TextInputType.phone,
                                    style: const TextStyle(
                                        color: AppColors.textPrimary),
                                    decoration: const InputDecoration(
                                      labelText: 'Telefone',
                                      hintText: '+258 84 000 0000',
                                      prefixIcon: Icon(Icons.phone_rounded),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            GradientButton(
                              label: 'Guardar ficha de saúde',
                              icon: Icons.save_rounded,
                              loading: _saving,
                              onPressed: _save,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Estes dados são usados na emergência (SOS) e ajudam os médicos a atender-te melhor. Só tu e os profissionais autorizados os conseguem ver.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.4),
                                fontSize: 11.5,
                                height: 1.5,
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
    );
  }

  Widget _card({
    required IconData icon,
    required String title,
    required Widget child,
  }) =>
      Container(
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.glassFill,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: AppColors.accent, size: 19),
                const SizedBox(width: 9),
                Text(
                  title,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            child,
          ],
        ),
      ).animate().fadeIn(duration: 280.ms);

  Widget _dateTile() => GestureDetector(
        onTap: _pickDob,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: AppColors.glassFill,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.glassBorder),
          ),
          child: Row(
            children: [
              const Icon(Icons.cake_rounded,
                  color: AppColors.textMuted, size: 20),
              const SizedBox(width: 12),
              Text(
                _dob == null
                    ? 'Data de nascimento'
                    : '${_dob!.day.toString().padLeft(2, '0')}/${_dob!.month.toString().padLeft(2, '0')}/${_dob!.year}',
                style: TextStyle(
                  color: _dob == null
                      ? AppColors.textMuted
                      : AppColors.textPrimary,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      );

  Future<void> _pickDob() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _dob ?? DateTime(now.year - 30),
      firstDate: DateTime(now.year - 110),
      lastDate: now,
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.dark(
            primary: AppColors.primary,
            surface: AppColors.card,
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) setState(() => _dob = picked);
  }

  Widget _genderChips() => Wrap(
        spacing: 8,
        runSpacing: 8,
        children: ['Feminino', 'Masculino', 'Outro']
            .map((g) => _selectChip(
                  g,
                  selected: _gender == g,
                  color: AppColors.accent,
                  onTap: () => setState(() => _gender = g),
                ))
            .toList(),
      );

  Widget _selectChip(
    String label, {
    required bool selected,
    required Color color,
    required VoidCallback onTap,
  }) =>
      GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 9),
          decoration: BoxDecoration(
            gradient:
                selected ? LinearGradient(colors: [color, color]) : null,
            color: selected ? null : AppColors.glassFill,
            borderRadius: BorderRadius.circular(11),
            border: Border.all(
              color: selected ? color : AppColors.glassBorder,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? Colors.white : AppColors.textSecondary,
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      );

  Widget _tagEditor({
    required List<String> controller,
    required String hint,
    required Color color,
    TextEditingController? tagCtrl,
  }) =>
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (controller.isNotEmpty)
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: controller
                  .map((t) => Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 7),
                        decoration: BoxDecoration(
                          color: color.withOpacity(0.13),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: color.withOpacity(0.4)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              t,
                              style: TextStyle(
                                  color: color,
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(width: 6),
                            GestureDetector(
                              onTap: () =>
                                  setState(() => controller.remove(t)),
                              child: Icon(Icons.close_rounded,
                                  size: 14, color: color),
                            ),
                          ],
                        ),
                      ))
                  .toList(),
            )
          else
            Text(
              'Nenhum registado — adiciona abaixo',
              style: TextStyle(
                  color: Colors.white.withOpacity(0.35), fontSize: 12.5),
            ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: tagCtrl,
                  style: const TextStyle(color: AppColors.textPrimary),
                  decoration: InputDecoration(
                    hintText: hint,
                    isDense: true,
                  ),
                  onSubmitted: (v) => _addTag(controller, v, tagCtrl),
                ),
              ),
              const SizedBox(width: 10),
              GestureDetector(
                onTap: () =>
                    _addTag(controller, tagCtrl?.text ?? '', tagCtrl),
                child: Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: color.withOpacity(0.16),
                    border: Border.all(color: color.withOpacity(0.4)),
                  ),
                  child: Icon(Icons.add_rounded, color: color, size: 22),
                ),
              ),
            ],
          ),
        ],
      );

  void _addTag(
      List<String> list, String value, TextEditingController? ctrl) {
    final v = value.trim();
    if (v.isEmpty || list.contains(v)) return;
    setState(() {
      list.add(v);
      ctrl?.clear();
    });
  }

  Future<void> _save() async {
    if (_saving) return;
    final uid = ref.read(currentUserIdProvider);
    if (uid == null) return;
    setState(() => _saving = true);
    try {
      final payload = PatientProfile(
        dateOfBirth: _dob,
        gender: _gender,
        bloodType: _blood,
        allergies: _allergies,
        chronicConditions: _chronic,
        currentMedications: _meds,
        emergencyContactName:
            _ecName.text.trim().isEmpty ? null : _ecName.text.trim(),
        emergencyContactPhone:
            _ecPhone.text.trim().isEmpty ? null : _ecPhone.text.trim(),
      ).toJson();
      payload['user_id'] = uid;
      await Supabase.instance.client
          .from('patient_profiles')
          .upsert(payload, onConflict: 'user_id');
      ref.invalidate(patientProfileProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ficha de saúde guardada')),
        );
        context.pop();
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Não foi possível guardar. Tenta de novo.')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}
