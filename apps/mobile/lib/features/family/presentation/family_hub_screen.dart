import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/family_repository.dart';

/// Família — paridade com `pages/health/FamilyHub.tsx`:
/// gerir familiares (ficha de saúde por pessoa) e medicação do dia
/// (tomou / saltou), pensado para cuidar à distância.
class FamilyHubScreen extends ConsumerStatefulWidget {
  const FamilyHubScreen({super.key});

  @override
  ConsumerState<FamilyHubScreen> createState() => _FamilyHubScreenState();
}

class _FamilyHubScreenState extends ConsumerState<FamilyHubScreen> {
  bool _loading = true;
  List<FamilyMember> _members = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final list = await ref.read(familyRepositoryProvider).fetchMembers();
    if (!mounted) return;
    setState(() {
      _members = list;
      _loading = false;
    });
  }

  Future<void> _openMemberSheet([FamilyMember? member]) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _MemberSheet(member: member),
    );
    _load();
  }

  Future<void> _confirmRemove(FamilyMember m) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.bgHigh,
        title: const Text('Remover familiar',
            style: TextStyle(color: AppColors.textPrimary, fontSize: 17)),
        content: Text(
            'Remover ${m.fullName} da tua lista? Os dados de medicação ficam guardados.',
            style: const TextStyle(
                color: AppColors.textSecondary, fontSize: 13)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Remover'),
          ),
        ],
      ),
    );
    if (ok == true) {
      await ref.read(familyRepositoryProvider).removeMember(m.id);
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: RefreshIndicator(
            color: AppColors.accent,
            onRefresh: _load,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
              children: [
                Row(
                  children: [
                    _IconBtn(
                        icon: Icons.arrow_back_rounded,
                        onTap: () => context.pop()),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'Família',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 21,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const _HeroCard(),
                const SizedBox(height: 18),
                const Text(
                  'Os meus familiares',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 10),
                if (_loading)
                  const Column(
                    children: [
                      AppSkeleton(height: 200),
                      SizedBox(height: 12),
                      AppSkeleton(height: 200),
                    ],
                  )
                else if (_members.isEmpty)
                  const EmptyState(
                    icon: Icons.family_restroom_rounded,
                    title: 'Sem familiares',
                    message:
                        'Adiciona os teus entes queridos e acompanha a saúde deles à distância.',
                  )
                else
                  for (final m in _members)
                    _MemberCard(
                      member: m,
                      onEdit: () => _openMemberSheet(m),
                      onRemove: () => _confirmRemove(m),
                    ).animate().fadeIn(duration: 240.ms).slideY(
                        begin: 0.04, end: 0),
              ],
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openMemberSheet(),
        backgroundColor: AppColors.accent,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.person_add_rounded),
        label: const Text('Adicionar',
            style: TextStyle(fontWeight: FontWeight.w800)),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Widgets
// ═══════════════════════════════════════════════════════════════════════════

class _IconBtn extends StatelessWidget {
  const _IconBtn({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.glassFill,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.glassBorder),
          ),
          child: Icon(icon, color: AppColors.textPrimary, size: 20),
        ),
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF3B82F6).withOpacity(0.30),
            AppColors.primary.withOpacity(0.16),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF3B82F6).withOpacity(0.3)),
      ),
      child: const Row(
        children: [
          Icon(Icons.family_restroom_rounded,
              color: Color(0xFF60A5FA), size: 30),
          SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Cuida de quem amas',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w900,
                    fontSize: 15,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Guarda a ficha de saúde de cada familiar e controla a medicação do dia, mesmo de longe.',
                  style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                      height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MemberCard extends ConsumerWidget {
  const _MemberCard({
    required this.member,
    required this.onEdit,
    required this.onRemove,
  });

  final FamilyMember member;
  final VoidCallback onEdit;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final color = member.uiColor;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: color.withOpacity(0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 46,
                height: 46,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Text(
                  member.fullName.isEmpty
                      ? '?'
                      : member.fullName[0].toUpperCase(),
                  style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.w900,
                    fontSize: 18,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      member.fullName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w900,
                        fontSize: 14.5,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${member.relationshipLabel}'
                      '${member.age != null ? ' · ${member.age} anos' : ''}'
                      '${member.bloodType != null ? ' · ${member.bloodType}' : ''}',
                      style: const TextStyle(
                          color: AppColors.textSecondary, fontSize: 12),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: onEdit,
                icon: const Icon(Icons.edit_rounded,
                    size: 18, color: AppColors.textSecondary),
              ),
              IconButton(
                onPressed: onRemove,
                icon: const Icon(Icons.delete_outline_rounded,
                    size: 18, color: AppColors.textMuted),
              ),
            ],
          ),
          if (member.allergies.isNotEmpty ||
              member.chronicConditions.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final a in member.allergies)
                  _tag(a, AppColors.danger),
                for (final c in member.chronicConditions)
                  _tag(c, AppColors.warning),
              ],
            ),
          ],
          if (member.medications.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Text(
              'Medicação do familiar',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 11.5,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 6),
            ...member.medications.map(
              (med) => _MedRow(memberId: member.id, medName: med),
            ),
          ],
        ],
      ),
    );
  }

  Widget _tag(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.13),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

/// Linha de medicação: cria/ver lembretes e marca "tomou".
class _MedRow extends ConsumerStatefulWidget {
  const _MedRow({required this.memberId, required this.medName});
  final String memberId;
  final String medName;

  @override
  ConsumerState<_MedRow> createState() => _MedRowState();
}

class _MedRowState extends ConsumerState<_MedRow> {
  List<FamilyMedLog> _logs = const [];
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _loadLogs();
  }

  Future<void> _loadLogs() async {
    final logs =
        await ref.read(familyRepositoryProvider).fetchMedLogs(widget.memberId);
    if (!mounted) return;
    setState(() {
      _logs = logs.where((l) => l.medicationName == widget.medName).toList();
      _loaded = true;
    });
  }

  Future<void> _addReminder() async {
    final time = await showTimePicker(
      context: context,
      initialTime: const TimeOfDay(hour: 8, minute: 0),
    );
    if (time == null) return;
    final err = await ref.read(familyRepositoryProvider).addMedLog(
          memberId: widget.memberId,
          medicationName: widget.medName,
          scheduledTime:
              '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}',
        );
    if (!mounted) return;
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(err),
        backgroundColor: AppColors.warning,
      ));
    } else {
      _loadLogs();
    }
  }

  Future<void> _mark(FamilyMedLog log, bool taken) async {
    await ref
        .read(familyRepositoryProvider)
        .markLog(logId: log.id, taken: taken);
    _loadLogs();
  }

  @override
  Widget build(BuildContext context) {
    final pending = _logs.where((l) => l.isPending).toList();
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.medication_rounded,
                  size: 15, color: AppColors.accent),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  widget.medName,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              GestureDetector(
                onTap: _addReminder,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.accent.withOpacity(0.14),
                    borderRadius: BorderRadius.circular(7),
                  ),
                  child: const Text(
                    '+ Lembrete',
                    style: TextStyle(
                      color: AppColors.accent,
                      fontSize: 10.5,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
            ],
          ),
          if (_loaded && _logs.isNotEmpty) ...[
            const SizedBox(height: 6),
            for (final log in _logs.take(3))
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  children: [
                    Text(
                      log.timeLabel,
                      style: const TextStyle(
                          color: AppColors.textMuted, fontSize: 11.5),
                    ),
                    const SizedBox(width: 8),
                    if (log.isTaken)
                      const Text(
                        'Tomou ✓',
                        style: TextStyle(
                            color: AppColors.success,
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800),
                      )
                    else if (log.isSkipped)
                      const Text(
                        'Saltou',
                        style: TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700),
                      )
                    else ...[
                      const Text('Pendente',
                          style: TextStyle(
                              color: AppColors.warning, fontSize: 11.5)),
                      const Spacer(),
                      GestureDetector(
                        onTap: () => _mark(log, true),
                        child: const Icon(Icons.check_circle_outline_rounded,
                            size: 18, color: AppColors.success),
                      ),
                    ],
                  ],
                ),
              ),
          ],
          if (pending.isEmpty && _logs.isEmpty && _loaded)
            const SizedBox.shrink(),
        ],
      ),
    );
  }
}

// ── Folha: adicionar/editar familiar ───────────────────────────────────────

class _MemberSheet extends ConsumerStatefulWidget {
  const _MemberSheet({required this.member});
  final FamilyMember? member;

  @override
  ConsumerState<_MemberSheet> createState() => _MemberSheetState();
}

class _MemberSheetState extends ConsumerState<_MemberSheet> {
  static const _relationships = [
    ('parent', 'Pai/Mãe'),
    ('child', 'Filho(a)'),
    ('spouse', 'Cônjuge'),
    ('sibling', 'Irmão(ã)'),
    ('grandparent', 'Avô/Avó'),
    ('other', 'Outro'),
  ];
  static const _bloodTypes = ['O+', 'O−', 'A+', 'A−', 'B+', 'B−', 'AB+', 'AB−'];
  static const _colors = [
    '#3B82F6', '#EF4444', '#22C55E', '#F5A623', '#A855F7', '#14B8A6',
  ];

  late final _name =
      TextEditingController(text: widget.member?.fullName ?? '');
  late String _relationship =
      widget.member?.relationship ?? 'parent';
  late String? _bloodType = widget.member?.bloodType;
  late String _color = widget.member?.color ?? _colors.first;
  bool _saving = false;
  late final TextEditingController _birth;
  late final TextEditingController _allergies;
  late final TextEditingController _chronics;
  late final TextEditingController _meds;
  late final TextEditingController _emergency;

  @override
  void initState() {
    super.initState();
    _birth = TextEditingController();
    _allergies = TextEditingController(
        text: widget.member?.allergies.join(', ') ?? '');
    _chronics = TextEditingController(
        text: widget.member?.chronicConditions.join(', ') ?? '');
    _meds = TextEditingController(
        text: widget.member?.medications.join(', ') ?? '');
    _emergency = TextEditingController(
        text: widget.member?.emergencyContact ?? '');
  }

  @override
  void dispose() {
    _name.dispose();
    _birth.dispose();
    _allergies.dispose();
    _chronics.dispose();
    _meds.dispose();
    _emergency.dispose();
    super.dispose();
  }

  List<String> _split(TextEditingController c) => [
        for (final p in c.text.split(','))
          if (p.trim().isNotEmpty) p.trim(),
      ];

  Future<void> _save() async {
    if (_name.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Indica o nome do familiar.'),
        backgroundColor: AppColors.warning,
      ));
      return;
    }
    setState(() => _saving = true);
    final err = await ref.read(familyRepositoryProvider).upsertMember(
          id: widget.member?.id,
          fullName: _name.text.trim(),
          relationship: _relationship,
          birthDate: DateTime.tryParse(_birth.text.trim()),
          bloodType: _bloodType ?? '',
          allergies: _split(_allergies),
          chronicConditions: _split(_chronics),
          medications: _split(_meds),
          emergencyContact: _emergency.text.trim(),
          color: _color,
        );
    if (!mounted) return;
    setState(() => _saving = false);
    if (err == null) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(widget.member == null
            ? 'Familiar adicionado!'
            : 'Familiar actualizado!'),
        backgroundColor: AppColors.success,
      ));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(err),
        backgroundColor: AppColors.warning,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding:
          EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.88),
        decoration: const BoxDecoration(
          color: AppColors.bgHigh,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Text(
                widget.member == null
                    ? 'Adicionar familiar'
                    : 'Editar familiar',
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w900,
                  fontSize: 17,
                ),
              ),
              const SizedBox(height: 14),
              _Field(controller: _name, hint: 'Nome completo *'),
              const SizedBox(height: 10),
              _Field(
                  controller: _birth,
                  hint: 'Nascimento (AAAA-MM-DD)',
                  keyboard: TextInputType.datetime),
              const SizedBox(height: 12),
              const Text('Relação',
                  style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                      fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final r in _relationships)
                    ChoiceChip(
                      label: Text(r.$2),
                      selected: _relationship == r.$1,
                      selectedColor: AppColors.accent.withOpacity(0.3),
                      labelStyle: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w800,
                        color: _relationship == r.$1
                            ? Colors.white
                            : AppColors.textSecondary,
                      ),
                      side: BorderSide(
                        color: _relationship == r.$1
                            ? AppColors.accent
                            : AppColors.glassBorder,
                      ),
                      onSelected: (_) =>
                          setState(() => _relationship = r.$1),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              const Text('Tipo sanguíneo',
                  style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                      fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final t in _bloodTypes)
                    GestureDetector(
                      onTap: () => setState(() =>
                          _bloodType = _bloodType == t ? null : t),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 7),
                        decoration: BoxDecoration(
                          color: _bloodType == t
                              ? AppColors.danger.withOpacity(0.2)
                              : AppColors.glassFill,
                          borderRadius: BorderRadius.circular(9),
                          border: Border.all(
                            color: _bloodType == t
                                ? AppColors.danger
                                : AppColors.glassBorder,
                          ),
                        ),
                        child: Text(
                          t,
                          style: TextStyle(
                            color: _bloodType == t
                                ? AppColors.danger
                                : AppColors.textSecondary,
                            fontWeight: FontWeight.w900,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              _Field(
                  controller: _allergies,
                  hint: 'Alergias (separadas por vírgula)'),
              const SizedBox(height: 10),
              _Field(
                  controller: _chronics,
                  hint: 'Condições crónicas (vírgula)'),
              const SizedBox(height: 10),
              _Field(controller: _meds, hint: 'Medicamentos (vírgula)'),
              const SizedBox(height: 10),
              _Field(controller: _emergency, hint: 'Contacto de emergência'),
              const SizedBox(height: 12),
              const Text('Cor de identificação',
                  style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                      fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              Row(
                children: [
                  for (final c in _colors)
                    GestureDetector(
                      onTap: () => setState(() => _color = c),
                      child: Container(
                        width: 34,
                        height: 34,
                        margin: const EdgeInsets.only(right: 8),
                        decoration: BoxDecoration(
                          color: Color(0xFF000000 |
                              (int.tryParse(c.replaceFirst('#', ''),
                                      radix: 16) ??
                                  0x3B82F6)),
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: _color == c
                                ? Colors.white
                                : Colors.transparent,
                            width: 3,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _saving ? null : _save,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.accent,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _saving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Text('Guardar familiar',
                          style: TextStyle(fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({
    required this.controller,
    required this.hint,
    this.keyboard,
  });

  final TextEditingController controller;
  final String hint;
  final TextInputType? keyboard;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: keyboard,
      style: const TextStyle(color: AppColors.textPrimary, fontSize: 13.5),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 13),
        filled: true,
        fillColor: AppColors.glassFill,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.glassBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.accent),
        ),
      ),
    );
  }
}
