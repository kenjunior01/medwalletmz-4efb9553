import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/rider_repository.dart';

/// Rede de Riders de Saúde (paridade com `HealthRidersNetwork.tsx`):
/// onboarding em passos (dados → veículo → documentos → pagamento) e
/// dashboard do estafeta com modo online, ganhos (hoje/semana/mês),
/// entregas disponíveis (modo demonstração quando a RLS esconde as
/// pendentes, tal como na web), activas com avanço de estado e histórico.
class RiderScreen extends ConsumerStatefulWidget {
  const RiderScreen({super.key});

  @override
  ConsumerState<RiderScreen> createState() => _RiderScreenState();
}

class _RiderScreenState extends ConsumerState<RiderScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  HealthRider? _rider;
  bool _loading = true;
  List<HealthDelivery> _available = [];
  List<HealthDelivery> _active = [];
  List<HealthDelivery> _history = [];
  EarningsSummary? _earnings;
  bool _demoMode = false;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final repo = ref.read(ridersRepositoryProvider);
    try {
      final rider = await repo.fetchMyRider();
      if (!mounted) return;
      setState(() => _rider = rider);
      if (rider != null && rider.isVerified) {
        await _loadDashboard();
      }
    } catch (_) {
      // perfil não existe ou rede falhou → segue para onboarding
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadDashboard() async {
    final repo = ref.read(ridersRepositoryProvider);
    final rider = _rider;
    if (rider == null) return;
    try {
      final available = await repo.fetchAvailable(rider);
      if (!mounted) return;
      setState(() {
        _demoMode = available.isEmpty;
        _available =
            available.isEmpty ? repo.mockDeliveries() : available;
      });
      final active = await repo.fetchActive(rider.id);
      final history = await repo.fetchHistory(rider.id);
      final earnings = await repo.earningsSummary(rider.id);
      if (!mounted) return;
      setState(() {
        _active = active;
        _history = history;
        _earnings = earnings;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _demoMode = true;
        _available = repo.mockDeliveries();
      });
    }
  }

  Future<void> _accept(HealthDelivery d) async {
    final repo = ref.read(ridersRepositoryProvider);
    final rider = _rider!;
    try {
      if (!d.isMock) {
        await repo.acceptDelivery(d.id, rider.id);
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(d.isMock
            ? 'Demonstração: entrega aceite localmente'
            : 'Entrega aceite! Boa viagem 🛵'),
        backgroundColor: AppColors.success,
      ));
      await _loadDashboard();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Outro estafeta foi mais rápido — entrega já ocupada'),
        backgroundColor: AppColors.danger,
      ));
      await _loadDashboard();
    }
  }

  Future<void> _advance(HealthDelivery d, DeliveryStatus next) async {
    final repo = ref.read(ridersRepositoryProvider);
    try {
      if (!d.isMock) {
        await repo.advanceStatus(d.id, next);
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Estado: ${next.label}'),
        backgroundColor: AppColors.info,
      ));
      await _loadDashboard();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Não foi possível actualizar o estado'),
        backgroundColor: AppColors.danger,
      ));
    }
  }

  Future<void> _toggleOnline(bool value) async {
    final repo = ref.read(ridersRepositoryProvider);
    final rider = _rider!;
    setState(() => _rider = HealthRiderOnlineAdapter.toggle(rider, value));
    try {
      await repo.toggleOnline(rider.id, value);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return AppBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          title: const Text('Riders de Saúde 🛵'),
          actions: [
            if (_rider != null && _rider!.isVerified)
              IconButton(
                onPressed: _load,
                icon: const Icon(Icons.refresh_rounded),
                tooltip: 'Actualizar',
              ),
          ],
        ),
        body: _loading
            ? ListView(
                padding: const EdgeInsets.all(16),
                children: const [
                  AppSkeleton(height: 140),
                  SizedBox(height: 12),
                  AppSkeleton(height: 90),
                  SizedBox(height: 12),
                  AppSkeleton(height: 220),
                ],
              )
            : _rider == null
                ? _OnboardingWizard(onDone: _load)
                : !_rider!.isVerified
                    ? _PendingVerification(rider: _rider!)
                    : _Dashboard(
                        rider: _rider!,
                        tabs: _tabs,
                        available: _available,
                        active: _active,
                        history: _history,
                        earnings: _earnings,
                        demoMode: _demoMode,
                        isOnline: _rider!.isOnline,
                        onToggleOnline: _toggleOnline,
                        onAccept: _accept,
                        onAdvance: _advance,
                        onRefresh: _loadDashboard,
                      ),
      ),
    );
  }
}

/// Adaptador imutável para alternar `is_online` sem mutar o modelo.
class HealthRiderOnlineAdapter {
  static HealthRider toggle(HealthRider r, bool online) {
    return HealthRider(
      id: r.id,
      countryCode: r.countryCode,
      fullName: r.fullName,
      phone: r.phone,
      vehicleType: r.vehicleType,
      nationalId: r.nationalId,
      vehiclePlate: r.vehiclePlate,
      vehicleColor: r.vehicleColor,
      licenseUrl: r.licenseUrl,
      idDocumentUrl: r.idDocumentUrl,
      vehicleDocumentUrl: r.vehicleDocumentUrl,
      isVerified: r.isVerified,
      isOnline: online,
      rating: r.rating,
      totalDeliveries: r.totalDeliveries,
      totalEarnings: r.totalEarnings,
      totalDistanceKm: r.totalDistanceKm,
      availableZones: r.availableZones,
      languages: r.languages,
      acceptsColdChain: r.acceptsColdChain,
      maxDeliveryDistanceKm: r.maxDeliveryDistanceKm,
      mobileMoneyNumber: r.mobileMoneyNumber,
      onboardingStep: r.onboardingStep,
      onboardingProgress: r.onboardingProgress,
      rejectionReason: r.rejectionReason,
    );
  }
}

/* ----------------------------- ONBOARDING ----------------------------- */

class _OnboardingWizard extends ConsumerStatefulWidget {
  const _OnboardingWizard({required this.onDone});

  final Future<void> Function() onDone;

  @override
  ConsumerState<_OnboardingWizard> createState() => _OnboardingWizardState();
}

class _OnboardingWizardState extends ConsumerState<_OnboardingWizard> {
  int _step = 0;
  bool _saving = false;

  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _nationalId = TextEditingController();
  final _plate = TextEditingController();
  final _zones = TextEditingController();
  final _mobileMoney = TextEditingController();

  VehicleType _vehicle = VehicleType.motorbike;
  bool _coldChain = true;
  int _maxDistance = 15;
  String? _licensePath;
  String? _idPath;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _nationalId.dispose();
    _plate.dispose();
    _zones.dispose();
    _mobileMoney.dispose();
    super.dispose();
  }

  Future<void> _pickDoc(bool isLicense) async {
    final picked = await ImagePicker().pickImage(
      source: ImageSource.camera,
      imageQuality: 70,
      maxWidth: 1600,
    );
    if (picked == null) return;
    setState(() {
      if (isLicense) {
        _licensePath = picked.path;
      } else {
        _idPath = picked.path;
      }
    });
  }

  Future<void> _submit() async {
    if (_name.text.trim().length < 3 ||
        _phone.text.trim().length < 9 ||
        _nationalId.text.trim().length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Preenche nome, telefone (9 dígitos) e nº do BI'),
        backgroundColor: AppColors.danger,
      ));
      return;
    }
    setState(() => _saving = true);
    final repo = ref.read(ridersRepositoryProvider);
    try {
      final licenseUrl =
          _licensePath != null ? await repo.uploadDocument('license', _licensePath!) : null;
      final idUrl =
          _idPath != null ? await repo.uploadDocument('id', _idPath!) : null;
      final zones = _zones.text
          .split(',')
          .map((z) => z.trim())
          .where((z) => z.isNotEmpty)
          .toList();
      await repo.createRider(HealthRider(
        id: '',
        countryCode: 'MZ',
        fullName: _name.text.trim(),
        phone: _phone.text.trim(),
        nationalId: _nationalId.text.trim(),
        vehicleType: _vehicle,
        vehiclePlate: _plate.text.trim().isEmpty ? null : _plate.text.trim(),
        licenseUrl: licenseUrl,
        idDocumentUrl: idUrl,
        acceptsColdChain: _coldChain,
        maxDeliveryDistanceKm: _maxDistance,
        mobileMoneyNumber:
            _mobileMoney.text.trim().isEmpty ? null : _mobileMoney.text.trim(),
        availableZones: zones,
        languages: const ['pt', 'changana'],
        onboardingStep: 'review',
        onboardingProgress: 80,
      ));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Candidatura enviada! A equipa verifica em breve.'),
        backgroundColor: AppColors.success,
      ));
      await widget.onDone();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Erro ao enviar: $e'),
        backgroundColor: AppColors.danger,
      ));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF059669), Color(0xFF064E3B)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('🛵',
                  style: TextStyle(fontSize: 34)),
              const SizedBox(height: 8),
              const Text('Torna-te Rider de Saúde',
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              Text(
                'Entrega medicamentos, amostras e equipamento e ganha '
                'DINHEIRO REAL por entrega — 80% da taxa é tua, paga por M-Pesa.',
                style: TextStyle(
                    color: Colors.white.withOpacity(0.85), height: 1.4),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: const [
                  _HeroChip(text: '💊 Medicamentos'),
                  _HeroChip(text: '🧪 Amostras'),
                  _HeroChip(text: '🏥 Equipamento'),
                  _HeroChip(text: '❄️ Cadeia de frio +30 MZN'),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Row(
          children: List.generate(4, (i) {
            final active = i <= _step;
            return Expanded(
              child: Container(
                height: 4,
                margin: EdgeInsets.only(right: i < 3 ? 6 : 0),
                decoration: BoxDecoration(
                  color: active ? AppColors.accent : AppColors.glassFill,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            );
          }),
        ),
        const SizedBox(height: 18),
        _StepCard(
          title: _stepTitle(_step),
          child: _stepBody(_step),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            if (_step > 0)
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => _step--),
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: AppColors.glassBorder),
                    foregroundColor: AppColors.textSecondary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text('Voltar'),
                ),
              ),
            if (_step > 0) const SizedBox(width: 10),
            Expanded(
              child: ElevatedButton(
                onPressed: _saving
                    ? null
                    : () {
                        if (_step < 3) {
                          setState(() => _step++);
                        } else {
                          _submit();
                        }
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.accent,
                  foregroundColor: AppColors.bgDeep,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                ),
                child: Text(
                  _saving ? 'A enviar…' : (_step < 3 ? 'Continuar' : 'Enviar candidatura'),
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  String _stepTitle(int step) {
    switch (step) {
      case 0:
        return '1 · Dados pessoais';
      case 1:
        return '2 · Veículo';
      case 2:
        return '3 · Documentos';
      default:
        return '4 · Pagamento & zonas';
    }
  }

  Widget _stepBody(int step) {
    switch (step) {
      case 0:
        return Column(
          children: [
            _Field(controller: _name, label: 'Nome completo', icon: Icons.person_rounded),
            const SizedBox(height: 10),
            _Field(
              controller: _phone,
              label: 'Telefone (M-Pesa/e-Mola)',
              icon: Icons.phone_rounded,
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 10),
            _Field(
              controller: _nationalId,
              label: 'Número do BI',
              icon: Icons.badge_rounded,
            ),
          ],
        );
      case 1:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: VehicleType.values.map((v) {
                final selected = v == _vehicle;
                return ChoiceChip(
                  label: Text('${v.emoji} ${v.label} (base ${v.minFee} MZN)'),
                  selected: selected,
                  onSelected: (_) => setState(() => _vehicle = v),
                  selectedColor: AppColors.accent.withOpacity(0.25),
                  labelStyle: TextStyle(
                    color: selected ? AppColors.accent : AppColors.textSecondary,
                    fontWeight: FontWeight.w700,
                  ),
                  backgroundColor: AppColors.glassFill,
                  side: BorderSide(color: AppColors.glassBorder),
                );
              }).toList(),
            ),
            const SizedBox(height: 12),
            _Field(
              controller: _plate,
              label: 'Matrícula (opcional)',
              icon: Icons.directions_bike_rounded,
            ),
            const SizedBox(height: 12),
            SwitchListTile(
              value: _coldChain,
              onChanged: (v) => setState(() => _coldChain = v),
              activeColor: AppColors.accent,
              contentPadding: EdgeInsets.zero,
              title: const Text('Aceito cadeia de frio',
                  style: TextStyle(color: AppColors.textPrimary)),
              subtitle: const Text('Medicamentos e amostras refrigeradas (+30 MZN)',
                  style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
            ),
            Row(
              children: [
                const Text('Distância máx.:',
                    style: TextStyle(color: AppColors.textSecondary)),
                Expanded(
                  child: Slider(
                    value: _maxDistance.toDouble(),
                    min: 5,
                    max: 50,
                    divisions: 9,
                    activeColor: AppColors.accent,
                    label: '$_maxDistance km',
                    onChanged: (v) => setState(() => _maxDistance = v.round()),
                  ),
                ),
              ],
            ),
          ],
        );
      case 2:
        return Column(
          children: [
            _DocRow(
              label: 'Carta de condução',
              path: _licensePath,
              onPick: () => _pickDoc(true),
            ),
            const SizedBox(height: 10),
            _DocRow(
              label: 'Cópia do BI',
              path: _idPath,
              onPick: () => _pickDoc(false),
            ),
            const SizedBox(height: 8),
            const Text(
              'As fotos vão para o bucket privado `rider-documents` e só são '
              'vistas pela equipa de verificação.',
              style: TextStyle(color: AppColors.textMuted, fontSize: 12),
            ),
          ],
        );
      default:
        return Column(
          children: [
            _Field(
              controller: _mobileMoney,
              label: 'Número M-Pesa para receber',
              icon: Icons.account_balance_wallet_rounded,
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 10),
            _Field(
              controller: _zones,
              label: 'Zonas (separadas por vírgula)',
              icon: Icons.map_rounded,
              hint: 'Ex.: Baixa, Sommerschield, Matola',
            ),
          ],
        );
    }
  }
}

class _HeroChip extends StatelessWidget {
  const _HeroChip({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.14),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(text,
          style: const TextStyle(
              color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
    );
  }
}

class _StepCard extends StatelessWidget {
  const _StepCard({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w800,
                  fontSize: 15)),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({
    required this.controller,
    required this.label,
    required this.icon,
    this.keyboardType,
    this.hint,
  });

  final TextEditingController controller;
  final String label;
  final IconData icon;
  final TextInputType? keyboardType;
  final String? hint;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      style: const TextStyle(color: AppColors.textPrimary),
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        hintStyle: const TextStyle(color: AppColors.textMuted),
        labelStyle: const TextStyle(color: AppColors.textSecondary),
        prefixIcon: Icon(icon, color: AppColors.textMuted, size: 20),
        filled: true,
        fillColor: AppColors.glassFill,
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: AppColors.glassBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.accent),
        ),
      ),
    );
  }
}

class _DocRow extends StatelessWidget {
  const _DocRow({required this.label, required this.path, required this.onPick});
  final String label;
  final String? path;
  final VoidCallback onPick;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        children: [
          Icon(
            path != null ? Icons.check_circle_rounded : Icons.add_a_photo_rounded,
            color: path != null ? AppColors.success : AppColors.textMuted,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              path != null ? '$label ✓ anexado' : label,
              style: TextStyle(
                color: path != null ? AppColors.textPrimary : AppColors.textSecondary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          TextButton(onPressed: onPick, child: const Text('Tirar foto')),
        ],
      ),
    );
  }
}

/* ---------------------- VERIFICAÇÃO PENDENTE ---------------------- */

class _PendingVerification extends StatelessWidget {
  const _PendingVerification({required this.rider});
  final HealthRider rider;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 84,
              height: 84,
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFFF59E0B), Color(0xFFB45309)]),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFF59E0B).withOpacity(0.35),
                    blurRadius: 32,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: const Icon(Icons.hourglass_top_rounded,
                  color: Colors.white, size: 40),
            ),
            const SizedBox(height: 20),
            const Text('Verificação em curso',
                style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 19,
                    fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text(
              'A tua candidatura (${rider.vehicleType.emoji} ${rider.vehicleType.label}) '
              'está a ser verificada pela equipa MedWallet. '
              'Quando ficar aprovada, o dashboard do rider abre aqui automaticamente.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                  color: AppColors.textSecondary, height: 1.5),
            ),
            const SizedBox(height: 18),
            OutlinedButton(
              onPressed: () => context.push('/services'),
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: AppColors.glassBorder),
                foregroundColor: AppColors.textSecondary,
              ),
              child: const Text('Explorar outros serviços'),
            ),
          ],
        ),
      ),
    );
  }
}

/* --------------------------- DASHBOARD --------------------------- */

class _Dashboard extends StatelessWidget {
  const _Dashboard({
    required this.rider,
    required this.tabs,
    required this.available,
    required this.active,
    required this.history,
    required this.earnings,
    required this.demoMode,
    required this.isOnline,
    required this.onToggleOnline,
    required this.onAccept,
    required this.onAdvance,
    required this.onRefresh,
  });

  final HealthRider rider;
  final TabController tabs;
  final List<HealthDelivery> available;
  final List<HealthDelivery> active;
  final List<HealthDelivery> history;
  final EarningsSummary? earnings;
  final bool demoMode;
  final bool isOnline;
  final ValueChanged<bool> onToggleOnline;
  final Future<void> Function(HealthDelivery) onAccept;
  final Future<void> Function(HealthDelivery, DeliveryStatus) onAdvance;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      color: AppColors.accent,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          _RiderHeader(
            rider: rider,
            isOnline: isOnline,
            onToggleOnline: onToggleOnline,
          ),
          const SizedBox(height: 12),
          _EarningsCard(earnings: earnings, rider: rider),
          if (demoMode) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.warning.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.warning.withOpacity(0.4)),
              ),
              child: const Text(
                'ℹ️ Modo demonstração: ainda não há entregas reais publicadas '
                'para o teu país. Estas entregas de exemplo mostram como o fluxo funciona.',
                style: TextStyle(color: AppColors.warning, fontSize: 12.5, height: 1.4),
              ),
            ),
          ],
          const SizedBox(height: 16),
          TabBar(
            controller: tabs,
            indicatorColor: AppColors.accent,
            labelColor: AppColors.textPrimary,
            unselectedLabelColor: AppColors.textMuted,
            labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
            tabs: const [
              Tab(text: 'Disponíveis'),
              Tab(text: 'Activas'),
              Tab(text: 'Histórico'),
            ],
          ),
          SizedBox(
            height: 420,
            child: TabBarView(
              controller: tabs,
              children: [
                _AvailableList(
                    deliveries: available, onAccept: onAccept, working: active.isNotEmpty),
                _ActiveList(deliveries: active, onAdvance: onAdvance),
                _HistoryList(deliveries: history),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _RiderHeader extends StatelessWidget {
  const _RiderHeader({
    required this.rider,
    required this.isOnline,
    required this.onToggleOnline,
  });

  final HealthRider rider;
  final bool isOnline;
  final ValueChanged<bool> onToggleOnline;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 52,
            height: 52,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [
                isOnline ? const Color(0xFF10B981) : AppColors.primary,
                isOnline ? const Color(0xFF064E3B) : AppColors.primaryDark,
              ]),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Text(rider.vehicleType.emoji,
                style: const TextStyle(fontSize: 24)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(rider.fullName,
                    style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w800,
                        fontSize: 15)),
                const SizedBox(height: 2),
                Row(
                  children: [
                    const Icon(Icons.star_rounded,
                        color: AppColors.warning, size: 15),
                    const SizedBox(width: 3),
                    Text(
                      '${(rider.rating ?? 5.0).toStringAsFixed(1)} · '
                      '${rider.totalDeliveries} entregas · '
                      '${rider.vehicleType.label}',
                      style: const TextStyle(
                          color: AppColors.textSecondary, fontSize: 12),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Column(
            children: [
              Switch(
                value: isOnline,
                activeColor: AppColors.success,
                onChanged: onToggleOnline,
              ),
              Text(
                isOnline ? 'Online' : 'Offline',
                style: TextStyle(
                  color: isOnline ? AppColors.success : AppColors.textMuted,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _EarningsCard extends StatelessWidget {
  const _EarningsCard({required this.earnings, required this.rider});
  final EarningsSummary? earnings;
  final HealthRider rider;

  @override
  Widget build(BuildContext context) {
    final e = earnings;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0E7490), Color(0xFF164E63)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.payments_rounded, color: Colors.white, size: 18),
              const SizedBox(width: 6),
              Text('Ganhos (80% por entrega)',
                  style: TextStyle(
                      color: Colors.white.withOpacity(0.85),
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600)),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _EarnStat('Hoje', formatMZN(e?.today ?? 0), '${e?.todayCount ?? 0} entregas'),
              _EarnStat('7 dias', formatMZN(e?.week ?? 0), '${e?.weekCount ?? 0} entregas'),
              _EarnStat('30 dias', formatMZN(e?.month ?? 0), '${e?.monthCount ?? 0} entregas'),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Total histórico: ${formatMZN(rider.totalEarnings)} · '
            '${formatKm(rider.totalDistanceKm)} percorridos',
            style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 11.5),
          ),
        ],
      ),
    );
  }
}

class _EarnStat extends StatelessWidget {
  const _EarnStat(this.label, this.value, this.sub);
  final String label;
  final String value;
  final String sub;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label.toUpperCase(),
              style: TextStyle(
                  color: Colors.white.withOpacity(0.6),
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.6)),
          const SizedBox(height: 3),
          Text(value,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16.5,
                  fontWeight: FontWeight.w800)),
          Text(sub,
              style: TextStyle(
                  color: Colors.white.withOpacity(0.55), fontSize: 10.5)),
        ],
      ),
    );
  }
}

class _DeliveryCard extends StatelessWidget {
  const _DeliveryCard({
    required this.delivery,
    this.onAccept,
    this.onNext,
    this.nextStatus,
    this.showEarnings = true,
  });

  final HealthDelivery delivery;
  final VoidCallback? onAccept;
  final VoidCallback? onNext;
  final DeliveryStatus? nextStatus;
  final bool showEarnings;

  @override
  Widget build(BuildContext context) {
    final d = delivery;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: d.status.color.withOpacity(0.35),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(d.packageType.emoji, style: const TextStyle(fontSize: 20)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(d.packageType.label,
                    style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w800,
                        fontSize: 13.5)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: Color(d.status.color).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  d.status.label,
                  style: TextStyle(
                      color: Color(d.status.color),
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _RouteRow(
            icon: Icons.store_rounded,
            color: const Color(0xFF38BDF8),
            title: d.pickupName,
            subtitle: d.pickupAddress,
          ),
          const SizedBox(height: 6),
          _RouteRow(
            icon: Icons.home_rounded,
            color: const Color(0xFF10B981),
            title: d.dropoffName ?? d.customerName,
            subtitle: d.dropoffAddress,
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 10,
            runSpacing: 6,
            children: [
              _MetaChip(icon: Icons.straighten_rounded, text: formatKm(d.estimatedDistanceKm)),
              _MetaChip(icon: Icons.schedule_rounded, text: '~${d.estimatedDurationMin ?? 25} min'),
              if (d.requiresColdChain)
                const _MetaChip(icon: Icons.ac_unit_rounded, text: 'Cadeia de frio'),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      showEarnings
                          ? 'Tu recebes ${formatMZN(d.riderEarnings ?? 0)}'
                          : 'Taxa ${formatMZN(d.deliveryFee ?? 0)}',
                      style: const TextStyle(
                          color: AppColors.success,
                          fontWeight: FontWeight.w800,
                          fontSize: 14),
                    ),
                    Text(
                      d.isMock ? 'Entrega de demonstração' : d.customerName,
                      style: const TextStyle(
                          color: AppColors.textMuted, fontSize: 11),
                    ),
                  ],
                ),
              ),
              if (onAccept != null)
                ElevatedButton.icon(
                  onPressed: onAccept,
                  icon: const Icon(Icons.touch_app_rounded, size: 16),
                  label: const Text('Aceitar'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.success,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              if (onNext != null && nextStatus != null)
                ElevatedButton.icon(
                  onPressed: onNext,
                  icon: Icon(_nextIcon(nextStatus!), size: 16),
                  label: Text(_nextLabel(nextStatus!)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Color(nextStatus!.color),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  IconData _nextIcon(DeliveryStatus s) {
    switch (s) {
      case DeliveryStatus.arrivingPickup:
        return Icons.directions_rounded;
      case DeliveryStatus.pickedUp:
        return Icons.inventory_2_rounded;
      case DeliveryStatus.inTransit:
        return Icons.local_shipping_rounded;
      case DeliveryStatus.delivered:
        return Icons.check_circle_rounded;
      default:
        return Icons.arrow_forward_rounded;
    }
  }

  String _nextLabel(DeliveryStatus s) {
    switch (s) {
      case DeliveryStatus.arrivingPickup:
        return 'Cheguei ao pickup';
      case DeliveryStatus.pickedUp:
        return 'Recolhi';
      case DeliveryStatus.inTransit:
        return 'Em trânsito';
      case DeliveryStatus.delivered:
        return 'Entregue ✓';
      default:
        return s.label;
    }
  }
}

class _RouteRow extends StatelessWidget {
  const _RouteRow({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 26,
          height: 26,
          decoration: BoxDecoration(
            color: color.withOpacity(0.15),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 14, color: color),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title,
                  style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
              Text(subtitle,
                  style: const TextStyle(
                      color: AppColors.textMuted, fontSize: 11),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
            ],
          ),
        ),
      ],
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: AppColors.textMuted),
        const SizedBox(width: 3),
        Text(text,
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 11.5)),
      ],
    );
  }
}

class _AvailableList extends StatelessWidget {
  const _AvailableList({
    required this.deliveries,
    required this.onAccept,
    required this.working,
  });

  final List<HealthDelivery> deliveries;
  final Future<void> Function(HealthDelivery) onAccept;
  final bool working;

  @override
  Widget build(BuildContext context) {
    if (deliveries.isEmpty) {
      return _EmptyTab(
        icon: Icons.inbox_rounded,
        text: 'Sem entregas disponíveis agora.\nLiga-te ao modo Online e actualiza em breve.',
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.only(top: 12),
      itemCount: deliveries.length,
      itemBuilder: (_, i) => _DeliveryCard(
        delivery: deliveries[i],
        onAccept: working ? () {} : () => onAccept(deliveries[i]),
      ),
    );
  }
}

class _ActiveList extends StatelessWidget {
  const _ActiveList({required this.deliveries, required this.onAdvance});
  final List<HealthDelivery> deliveries;
  final Future<void> Function(HealthDelivery, DeliveryStatus) onAdvance;

  DeliveryStatus? _nextStep(DeliveryStatus s) {
    switch (s) {
      case DeliveryStatus.accepted:
        return DeliveryStatus.arrivingPickup;
      case DeliveryStatus.arrivingPickup:
        return DeliveryStatus.pickedUp;
      case DeliveryStatus.pickedUp:
        return DeliveryStatus.inTransit;
      case DeliveryStatus.inTransit:
        return DeliveryStatus.arrivingDropoff;
      case DeliveryStatus.arrivingDropoff:
        return DeliveryStatus.delivered;
      default:
        return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (deliveries.isEmpty) {
      return const _EmptyTab(
        icon: Icons.local_shipping_rounded,
        text: 'Nenhuma entrega activa.\nAceita uma entrega disponível para começar.',
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.only(top: 12),
      itemCount: deliveries.length,
      itemBuilder: (_, i) {
        final d = deliveries[i];
        final next = _nextStep(d.status);
        return _DeliveryCard(
          delivery: d,
          showEarnings: false,
          nextStatus: next,
          onNext: next == null ? null : () => onAdvance(d, next),
        );
      },
    );
  }
}

class _HistoryList extends StatelessWidget {
  const _HistoryList({required this.deliveries});
  final List<HealthDelivery> deliveries;

  @override
  Widget build(BuildContext context) {
    if (deliveries.isEmpty) {
      return const _EmptyTab(
        icon: Icons.history_rounded,
        text: 'O histórico das tuas entregas aparece aqui.',
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.only(top: 12),
      itemCount: deliveries.length,
      itemBuilder: (_, i) {
        final d = deliveries[i];
        return _DeliveryCard(
          delivery: d,
          showEarnings: d.status == DeliveryStatus.delivered,
        );
      },
    );
  }
}

class _EmptyTab extends StatelessWidget {
  const _EmptyTab({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 44, color: AppColors.textMuted),
          const SizedBox(height: 10),
          Text(
            text,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.textMuted, height: 1.5),
          ),
        ],
      ),
    );
  }
}
