import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/blood_repository.dart';

/// Banco de Sangue — paridade com `pages/blood/*` do web:
/// pedidos abertos, campanhas, registo de dador e os meus voluntariados.
class BloodHubScreen extends ConsumerStatefulWidget {
  const BloodHubScreen({super.key});

  @override
  ConsumerState<BloodHubScreen> createState() => _BloodHubScreenState();
}

class _BloodHubScreenState extends ConsumerState<BloodHubScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab =
      TabController(length: 3, vsync: this, initialIndex: 1);

  bool _loading = true;
  BloodDonor? _donor;
  List<BloodRequest> _requests = const [];
  List<BloodCampaign> _campaigns = const [];
  List<BloodMatch> _matches = const [];

  static const _bloodTypes = [
    'O+', 'O−', 'A+', 'A−', 'B+', 'B−', 'AB+', 'AB−',
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final repo = ref.read(bloodRepositoryProvider);
    final donor = await repo.fetchMyDonor();
    final requests = await repo.fetchOpenRequests();
    final campaigns = await repo.fetchCampaigns();
    final matches = await repo.fetchMyMatches();
    if (!mounted) return;
    setState(() {
      _donor = donor;
      _requests = requests;
      _campaigns = campaigns;
      _matches = matches;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                child: Row(
                  children: [
                    _IconBtn(
                        icon: Icons.arrow_back_rounded,
                        onTap: () => context.pop()),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'Banco de Sangue',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 21,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    if (_donor != null)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 7),
                        decoration: BoxDecoration(
                          color: AppColors.danger.withOpacity(0.16),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                              color: AppColors.danger.withOpacity(0.4)),
                        ),
                        child: Text(
                          _donor!.bloodType,
                          style: const TextStyle(
                            color: AppColors.danger,
                            fontWeight: FontWeight.w900,
                            fontSize: 13,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: TabBar(
                  controller: _tab,
                  indicatorColor: AppColors.accent,
                  labelColor: AppColors.textPrimary,
                  unselectedLabelColor: AppColors.textMuted,
                  labelStyle: const TextStyle(
                      fontWeight: FontWeight.w800, fontSize: 13.5),
                  tabs: const [
                    Tab(text: 'Pedidos'),
                    Tab(text: 'Dador'),
                    Tab(text: 'Campanhas'),
                  ],
                ),
              ),
              const SizedBox(height: 4),
              Expanded(
                child: TabBarView(
                  controller: _tab,
                  children: [
                    _requestsTab(),
                    _donorTab(),
                    _campaignsTab(),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreateRequestSheet,
        backgroundColor: AppColors.danger,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.bloodtype_rounded),
        label: const Text('Pedir sangue',
            style: TextStyle(fontWeight: FontWeight.w800)),
      ),
    );
  }

  // ── Pedidos abertos ──────────────────────────────────────────────────────
  Widget _requestsTab() {
    if (_loading) {
      return ListView(
        padding: const EdgeInsets.all(20),
        children: const [
          AppSkeleton(height: 120),
          SizedBox(height: 12),
          AppSkeleton(height: 120),
          SizedBox(height: 12),
          AppSkeleton(height: 120),
        ],
      );
    }
    return RefreshIndicator(
      color: AppColors.accent,
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
        children: [
          if (_matches.isNotEmpty) ...[
            const Text(
              'As minhas disponibilizações',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 12.5,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 10),
            for (final m in _matches.take(3))
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _MatchChip(match: m),
              ),
            const SizedBox(height: 10),
          ],
          if (_requests.isEmpty)
            const EmptyState(
              icon: Icons.bloodtype_rounded,
              title: 'Sem pedidos abertos',
              message:
                  'Neste momento não há pedidos de sangue. Cria um pedido com o botão abaixo se precisares.',
            )
          else
            for (final r in _requests)
              _RequestCard(
                request: r,
                iAmDonor: _donor != null && _donor!.isAvailable,
                myBloodType: _donor?.bloodType,
                onVolunteer: () => _volunteer(r),
              ).animate().fadeIn(duration: 240.ms).slideY(begin: 0.04, end: 0),
        ],
      ),
    );
  }

  Future<void> _volunteer(BloodRequest r) async {
    if (_donor == null) {
      _tab.animateTo(1);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Regista-te primeiro como dador na aba "Dador".'),
        backgroundColor: AppColors.warning,
      ));
      return;
    }
    final err = await ref.read(bloodRepositoryProvider).volunteer(r.id);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(err ??
          'Disponibilidade enviada! A família do paciente vai contactar-te.'),
      backgroundColor: err == null ? AppColors.success : AppColors.warning,
    ));
    if (err == null) _load();
  }

  // ── Dador ────────────────────────────────────────────────────────────────
  Widget _donorTab() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 120),
      children: [
        if (_donor != null) _DonorSummaryCard(donor: _donor!),
        const SizedBox(height: 14),
        _DonorFormCard(
          donor: _donor,
          bloodTypes: _bloodTypes,
          onSaved: (err) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text(err ?? 'Registo guardado. Obrigado por doar vida!'),
              backgroundColor: err == null ? AppColors.success : AppColors.warning,
            ));
            if (err == null) _load();
          },
        ),
      ],
    );
  }

  // ── Campanhas ────────────────────────────────────────────────────────────
  Widget _campaignsTab() {
    if (_loading) {
      return ListView(
        padding: const EdgeInsets.all(20),
        children: const [
          AppSkeleton(height: 150),
          SizedBox(height: 12),
          AppSkeleton(height: 150),
        ],
      );
    }
    return RefreshIndicator(
      color: AppColors.accent,
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 120),
        children: [
          if (_campaigns.isEmpty)
            const EmptyState(
              icon: Icons.campaign_rounded,
              title: 'Sem campanhas activas',
              message:
                  'As campanhas de doação das associações e hospitais aparecem aqui. Volta em breve.',
            )
          else
            for (final c in _campaigns) _CampaignCard(campaign: c),
        ],
      ),
    );
  }

  // ── Folha: criar pedido de sangue ────────────────────────────────────────
  Future<void> _showCreateRequestSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _CreateRequestSheet(bloodTypes: _bloodTypes),
    );
    _load();
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

class _RequestCard extends StatelessWidget {
  const _RequestCard({
    required this.request,
    required this.onVolunteer,
    this.iAmDonor = false,
    this.myBloodType,
  });

  final BloodRequest request;
  final VoidCallback onVolunteer;
  final bool iAmDonor;
  final String? myBloodType;

  Color get _urgencyColor {
    switch (request.urgency) {
      case 'critical':
        return AppColors.danger;
      case 'urgent':
        return AppColors.warning;
      default:
        return AppColors.info;
    }
  }

  @override
  Widget build(BuildContext context) {
    final compatible =
        myBloodType != null && myBloodType == request.bloodType;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: request.isCritical
              ? AppColors.danger.withOpacity(0.35)
              : AppColors.glassBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 52,
                height: 52,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.danger.withOpacity(0.16),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Text(
                  request.bloodType,
                  style: const TextStyle(
                    color: AppColors.danger,
                    fontWeight: FontWeight.w900,
                    fontSize: 15,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            request.hospitalName ?? 'Hospital não indicado',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.w800,
                              fontSize: 14.5,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: _urgencyColor.withOpacity(0.16),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            request.urgencyLabel,
                            style: TextStyle(
                              color: _urgencyColor,
                              fontSize: 10.5,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${request.city} · ${request.unitsNeeded} unidade(s)'
                      ' · ${formatRelative(request.createdAt)}',
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (request.reason != null && request.reason!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              request.reason!,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  color: AppColors.textSecondary, fontSize: 12.5),
            ),
          ],
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: request.progress,
              minHeight: 6,
              backgroundColor: Colors.white.withOpacity(0.08),
              valueColor: AlwaysStoppedAnimation<Color>(_urgencyColor),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '${request.unitsReceived}/${request.unitsNeeded} unidades recebidas',
            style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              if (request.contactPhone != null) ...[
                Icon(Icons.phone_rounded,
                    size: 14, color: AppColors.textMuted),
                const SizedBox(width: 4),
                Text(
                  request.contactPhone!,
                  style: const TextStyle(
                      color: AppColors.textSecondary, fontSize: 12),
                ),
              ],
              const Spacer(),
              if (request.isMine)
                const Text(
                  'O meu pedido',
                  style: TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 12,
                      fontWeight: FontWeight.w700),
                )
              else
                FilledButton.icon(
                  onPressed: onVolunteer,
                  style: FilledButton.styleFrom(
                    backgroundColor: compatible
                        ? AppColors.danger
                        : AppColors.glassFillStrong,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: Icon(
                      compatible ? Icons.favorite_rounded : Icons.handshake_rounded,
                      size: 16),
                  label: Text(
                    compatible ? 'Compatível — doar' : 'Quero ajudar',
                    style: const TextStyle(
                        fontSize: 12.5, fontWeight: FontWeight.w800),
                  ),
                ),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 240.ms);
  }
}

class _MatchChip extends StatelessWidget {
  const _MatchChip({required this.match});
  final BloodMatch match;

  @override
  Widget build(BuildContext context) {
    final done = match.status == 'completed';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: done
            ? AppColors.success.withOpacity(0.10)
            : AppColors.glassFill,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
            color: done
                ? AppColors.success.withOpacity(0.4)
                : AppColors.glassBorder),
      ),
      child: Row(
        children: [
          Icon(
            done ? Icons.verified_rounded : Icons.schedule_rounded,
            size: 16,
            color: done ? AppColors.success : AppColors.warning,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              match.statusLabel,
              style: TextStyle(
                color: done ? AppColors.success : AppColors.textPrimary,
                fontWeight: FontWeight.w700,
                fontSize: 12.5,
              ),
            ),
          ),
          if (done)
            const Text(
              '+100 MT na carteira',
              style: TextStyle(
                  color: AppColors.success,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w800),
            ),
        ],
      ),
    );
  }
}

class _DonorSummaryCard extends StatelessWidget {
  const _DonorSummaryCard({required this.donor});
  final BloodDonor donor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.danger.withOpacity(0.30),
            const Color(0xFF7F1D1D).withOpacity(0.15),
          ],
        ),
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.danger.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Container(
            width: 54,
            height: 54,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.danger.withOpacity(0.22),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(Icons.favorite_rounded,
                color: AppColors.danger, size: 26),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${donor.totalDonations} doação(ões) até hoje',
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w900,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  donor.lastDonationDate != null
                      ? 'Última: ${formatDateShort(donor.lastDonationDate!)} · ${donor.bloodType}'
                      : 'Ainda sem doações registadas · ${donor.bloodType}',
                  style: const TextStyle(
                      color: AppColors.textSecondary, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DonorFormCard extends ConsumerStatefulWidget {
  const _DonorFormCard({
    required this.donor,
    required this.bloodTypes,
    required this.onSaved,
  });

  final BloodDonor? donor;
  final List<String> bloodTypes;
  final ValueChanged<String?> onSaved;

  @override
  ConsumerState<_DonorFormCard> createState() => _DonorFormCardState();
}

class _DonorFormCardState extends ConsumerState<_DonorFormCard> {
  late String _bloodType = widget.donor?.bloodType ?? 'O+';
  late final _name =
      TextEditingController(text: widget.donor?.fullName ?? '');
  late final _phone =
      TextEditingController(text: widget.donor?.phone ?? '');
  late final _hood =
      TextEditingController(text: widget.donor?.neighborhood ?? '');
  late final _notes =
      TextEditingController(text: widget.donor?.healthNotes ?? '');
  bool _saving = false;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _hood.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    final err = await ref.read(bloodRepositoryProvider).upsertMyDonor(
      bloodType: _bloodType,
      fullName: _name.text.trim(),
      phone: _phone.text.trim(),
      neighborhood: _hood.text.trim(),
      healthNotes: _notes.text.trim(),
    );
    setState(() => _saving = false);
    widget.onSaved(err);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.donor == null
                ? 'Torna-te dador'
                : 'Actualiza o teu registo',
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w900,
              fontSize: 15.5,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Dadores compatíveis são notificados quando alguém precisar do teu tipo de sangue.',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final t in widget.bloodTypes)
                GestureDetector(
                  onTap: () => setState(() => _bloodType = t),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: _bloodType == t
                          ? AppColors.danger.withOpacity(0.22)
                          : AppColors.glassFill,
                      borderRadius: BorderRadius.circular(10),
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
                        fontSize: 13,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),
          _Field(controller: _name, hint: 'Nome completo'),
          const SizedBox(height: 10),
          _Field(controller: _phone, hint: 'Telefone', keyboard: TextInputType.phone),
          const SizedBox(height: 10),
          _Field(controller: _hood, hint: 'Bairro / zona'),
          const SizedBox(height: 10),
          _Field(
              controller: _notes,
              hint: 'Notas de saúde (opcional)',
              maxLines: 2),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _saving ? null : _save,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.danger,
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
                  : const Text('Guardar registo de dador',
                      style: TextStyle(fontWeight: FontWeight.w800)),
            ),
          ),
        ],
      ),
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({
    required this.controller,
    required this.hint,
    this.maxLines = 1,
    this.keyboard,
  });

  final TextEditingController controller;
  final String hint;
  final int maxLines;
  final TextInputType? keyboard;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
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

class _CampaignCard extends StatelessWidget {
  const _CampaignCard({required this.campaign});
  final BloodCampaign campaign;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: campaign.isLive
                      ? AppColors.success.withOpacity(0.16)
                      : AppColors.warning.withOpacity(0.16),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  campaign.isLive ? 'A DECORRER' : 'EM BREVE',
                  style: TextStyle(
                    color: campaign.isLive
                        ? AppColors.success
                        : AppColors.warning,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              const Spacer(),
              Text(
                '${formatDateShort(campaign.startsAt)} → ${formatDateShort(campaign.endsAt)}',
                style: const TextStyle(
                    color: AppColors.textMuted, fontSize: 11),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            campaign.title,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w900,
              fontSize: 15,
            ),
          ),
          if (campaign.description != null &&
              campaign.description!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              campaign.description!,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  color: AppColors.textSecondary, fontSize: 12.5),
            ),
          ],
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(Icons.place_rounded,
                  size: 14, color: AppColors.textMuted),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  [campaign.city, campaign.address]
                      .whereType<String>()
                      .join(' · '),
                  style: const TextStyle(
                      color: AppColors.textSecondary, fontSize: 12),
                ),
              ),
              if (campaign.targetUnits != null)
                Text(
                  'Meta: ${campaign.targetUnits} un.',
                  style: const TextStyle(
                      color: AppColors.textMuted, fontSize: 11.5),
                ),
            ],
          ),
          if (campaign.bloodTypesNeeded.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final t in campaign.bloodTypesNeeded)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.danger.withOpacity(0.14),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      t,
                      style: const TextStyle(
                        color: AppColors.danger,
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _CreateRequestSheet extends ConsumerStatefulWidget {
  const _CreateRequestSheet({required this.bloodTypes});
  final List<String> bloodTypes;

  @override
  ConsumerState<_CreateRequestSheet> createState() =>
      _CreateRequestSheetState();
}

class _CreateRequestSheetState extends ConsumerState<_CreateRequestSheet> {
  late String _bloodType = 'O+';
  late String _urgency = 'urgent';
  final _hospital = TextEditingController();
  final _city = TextEditingController();
  final _patient = TextEditingController();
  final _phone = TextEditingController();
  final _reason = TextEditingController();
  int _units = 1;
  bool _saving = false;

  @override
  void dispose() {
    _hospital.dispose();
    _city.dispose();
    _patient.dispose();
    _phone.dispose();
    _reason.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_hospital.text.trim().isEmpty ||
        _city.text.trim().isEmpty ||
        _phone.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Preenche hospital, cidade e contacto.'),
        backgroundColor: AppColors.warning,
      ));
      return;
    }
    setState(() => _saving = true);
    final err = await ref.read(bloodRepositoryProvider).createRequest(
      bloodType: _bloodType,
      city: _city.text.trim(),
      hospitalName: _hospital.text.trim(),
      contactPhone: _phone.text.trim(),
      patientName: _patient.text.trim(),
      unitsNeeded: _units,
      urgency: _urgency,
      reason: _reason.text.trim(),
    );
    if (!mounted) return;
    setState(() => _saving = false);
    if (err == null) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Pedido publicado! Dadores compatíveis serão notificados.'),
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
              const Text(
                'Pedir sangue',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w900,
                  fontSize: 17,
                ),
              ),
              const SizedBox(height: 14),
              _Field(
                  controller: _hospital, hint: 'Hospital / banco de sangue *'),
              const SizedBox(height: 10),
              _Field(controller: _city, hint: 'Cidade *'),
              const SizedBox(height: 10),
              _Field(controller: _patient, hint: 'Nome do paciente'),
              const SizedBox(height: 10),
              _Field(controller: _phone, hint: 'Contacto telefónico *', keyboard: TextInputType.phone),
              const SizedBox(height: 10),
              _Field(controller: _reason, hint: 'Motivo (cirurgia, acidente…)', maxLines: 2),
              const SizedBox(height: 14),
              const Text('Tipo de sangue',
                  style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                      fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final t in widget.bloodTypes)
                    GestureDetector(
                      onTap: () => setState(() => _bloodType = t),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: _bloodType == t
                              ? AppColors.danger.withOpacity(0.22)
                              : AppColors.glassFill,
                          borderRadius: BorderRadius.circular(10),
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
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  const Text('Urgência',
                      style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                          fontWeight: FontWeight.w800)),
                  const Spacer(),
                  for (final u in const [
                    ('normal', 'Normal'),
                    ('urgent', 'Urgente'),
                    ('critical', 'Crítico'),
                  ])
                    Padding(
                      padding: const EdgeInsets.only(left: 6),
                      child: ChoiceChip(
                        label: Text(u.$2),
                        selected: _urgency == u.$1,
                        selectedColor: AppColors.danger.withOpacity(0.3),
                        labelStyle: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          color: _urgency == u.$1
                              ? Colors.white
                              : AppColors.textSecondary,
                        ),
                        side: BorderSide(
                          color: _urgency == u.$1
                              ? AppColors.danger
                              : AppColors.glassBorder,
                        ),
                        onSelected: (_) => setState(() => _urgency = u.$1),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  const Text('Unidades',
                      style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                          fontWeight: FontWeight.w800)),
                  const Spacer(),
                  IconButton(
                    onPressed: _units > 1
                        ? () => setState(() => _units--)
                        : null,
                    icon: const Icon(Icons.remove_circle_outline_rounded,
                        color: AppColors.textSecondary),
                  ),
                  Text('$_units',
                      style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w900,
                          fontSize: 15)),
                  IconButton(
                    onPressed: _units < 10
                        ? () => setState(() => _units++)
                        : null,
                    icon: const Icon(Icons.add_circle_outline_rounded,
                        color: AppColors.accent),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _saving ? null : _submit,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.danger,
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
                      : const Text('Publicar pedido',
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
