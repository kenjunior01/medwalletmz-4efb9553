import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../../core/widgets/skeleton.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../wallet/presentation/wallet_controller.dart';
import '../data/delivery_models.dart';
import '../data/delivery_repository.dart';

/// ENTREGAS DO PACIENTE (F14) — paridade com o fluxo de
/// `health_deliveries` da web: o paciente pede a recolha de
/// medicamentos/amostras/equipamento e acompanha a entrega em tempo
/// real (estado via stream Postgres, posição do estafeta via broadcast).
class DeliveriesScreen extends ConsumerStatefulWidget {
  const DeliveriesScreen({super.key});

  @override
  ConsumerState<DeliveriesScreen> createState() => _DeliveriesScreenState();
}

class _DeliveriesScreenState extends ConsumerState<DeliveriesScreen> {
  bool _loading = true;
  List<PatientDelivery> _deliveries = const [];

  Color _statusColor(DeliveryStatus s) {
    if (s == DeliveryStatus.delivered) return AppColors.success;
    if (s.isCancelledOrFailed) return AppColors.danger;
    if (s == DeliveryStatus.pending) return AppColors.warning;
    return AppColors.info;
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final list =
        await ref.read(deliveryRepositoryProvider).fetchMyDeliveries();
    if (!mounted) return;
    setState(() {
      _deliveries = list;
      _loading = false;
    });
  }

  Future<void> _openRequestSheet() async {
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _NewDeliverySheet(),
    );
    if (created == true) _load();
  }



  @override
  Widget build(BuildContext context) {
    final balance = ref.watch(walletStreamProvider).value?.balance ?? 0;
    return AppBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          title: const Text('Entregas',
              style: TextStyle(fontWeight: FontWeight.w700)),
          actions: [
            IconButton(
              onPressed: _load,
              icon: const Icon(Icons.refresh_rounded),
              tooltip: 'Actualizar',
            ),
          ],
        ),
        body: _loading
            ? ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                children: const [
                  AppSkeleton(height: 120, radius: 20),
                  SizedBox(height: 14),
                  AppSkeleton(height: 110, radius: 18),
                  SizedBox(height: 14),
                  AppSkeleton(height: 110, radius: 18),
                  SizedBox(height: 14),
                  AppSkeleton(height: 110, radius: 18),
                ],
              )
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
                  children: [
                    _HeroCard(balance: balance),
                    const SizedBox(height: 16),
                    if (_deliveries.isEmpty)
                      _EmptyState(onRequest: _openRequestSheet)
                    else ...[
                      Padding(
                        padding: const EdgeInsets.only(left: 4, bottom: 10),
                        child: Text('AS MINHAS ENTREGAS',
                            style: TextStyle(
                              fontSize: 11,
                              letterSpacing: 1.2,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textMuted,
                            )),
                      ),
                      ..._deliveries.asMap().entries.map((e) => Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: _DeliveryCard(
                              delivery: e.value,
                              statusColor: _statusColor(e.value.status),
                              onTap: () => context
                                  .push('/delivery/${e.value.id}')
                                  .then((_) => _load()),
                            )
                                .animate(delay: (e.key * 60).ms)
                                .fadeIn()
                                .slideY(begin: .06, end: 0),
                          )),
                    ],
                    const SizedBox(height: 8),
                    const _InfoCard(),
                  ],
                ),
              ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: _openRequestSheet,
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          icon: const Icon(Icons.local_shipping_rounded),
          label: const Text('Pedir entrega',
              style: TextStyle(fontWeight: FontWeight.w800)),
        ),
      ),
    );
  }
}

// ── Hero ──────────────────────────────────────────────────────────────

class _HeroCard extends StatelessWidget {
  const _HeroCard({required this.balance});

  final double balance;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1E6B9C), Color(0xFF124B70)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: AppColors.glowBlue, blurRadius: 24)],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Entregas de saúde ao domicílio',
                    style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: Colors.white)),
                const SizedBox(height: 6),
                Text(
                  'Medicamentos, amostras e equipamento recolhidos onde '
                  'estiverem — estafetas verificados, cadeia de frio e '
                  'tracking ao vivo.',
                  style: TextStyle(
                      fontSize: 12.5, color: Colors.white.withOpacity(.85)),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(.12),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Column(
              children: [
                Text('Saldo',
                    style: TextStyle(
                        fontSize: 10, color: Colors.white.withOpacity(.75))),
                const SizedBox(height: 2),
                Text(formatMZN(balance),
                    style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: Colors.white)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.onRequest});

  final VoidCallback onRequest;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        children: [
          const Text('🛵', style: TextStyle(fontSize: 44)),
          const SizedBox(height: 10),
          const Text('Ainda sem entregas',
              style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                  color: AppColors.textPrimary)),
          const SizedBox(height: 6),
          Text(
            'Peça a recolha numa farmácia, laboratório ou clínica e '
            'acompanhe o estafeta no mapa até à sua porta.',
            textAlign: TextAlign.center,
            style: TextStyle(
                fontSize: 13, color: AppColors.textSecondary, height: 1.5),
          ),
          const SizedBox(height: 16),
          GradientButton(
            label: 'Pedir a primeira entrega',
            icon: Icons.add_location_alt_rounded,
            onPressed: onRequest,
          ),
        ],
      ),
    );
  }
}

// ── Cartão de entrega ─────────────────────────────────────────────────

class _DeliveryCard extends StatelessWidget {
  const _DeliveryCard({
    required this.delivery,
    required this.statusColor,
    required this.onTap,
  });

  final PatientDelivery delivery;
  final Color statusColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final d = delivery;
    return Material(
      color: AppColors.glassFill,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.glassBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    alignment: Alignment.center,
                    child: Text(d.packageType.emoji,
                        style: const TextStyle(fontSize: 20)),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(d.pickupName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 14,
                                color: AppColors.textPrimary)),
                        const SizedBox(height: 2),
                        Text(
                          d.dropoffName?.isNotEmpty == true
                              ? d.dropoffName!
                              : (d.dropoffAddress ?? 'Destino'),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(.14),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(d.status.emoji,
                            style: const TextStyle(fontSize: 11)),
                        const SizedBox(width: 4),
                        Text(d.status.label,
                            style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w800,
                                color: statusColor)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  _MiniStat(
                      icon: Icons.route_rounded,
                      label: d.estimatedDistanceKm != null
                          ? '${d.estimatedDistanceKm!.toStringAsFixed(1)} km'
                          : '—'),
                  const SizedBox(width: 8),
                  _MiniStat(
                      icon: Icons.payments_rounded,
                      label: formatMZN(d.deliveryFee)),
                  if (d.requiresColdChain) ...[
                    const SizedBox(width: 8),
                    _MiniStat(
                        icon: Icons.ac_unit_rounded, label: 'Cadeia de frio'),
                  ],
                  const Spacer(),
                  Text('Ver tracking →',
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppColors.accent)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: AppColors.textSecondary),
          const SizedBox(width: 4),
          Text(label,
              style: TextStyle(
                  fontSize: 11, color: AppColors.textSecondary)),
        ],
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        children: [
          const Icon(Icons.shield_rounded, size: 20, color: AppColors.teal),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'A taxa inclui a recolha e a entrega. O pagamento é feito da '
              'carteira no momento do pedido; o estafeta só recebe quando '
              'marca a entrega como concluída.',
              style: TextStyle(
                  fontSize: 12, color: AppColors.textSecondary, height: 1.45),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Folha de pedido (4 passos) ────────────────────────────────────────

class _NewDeliverySheet extends ConsumerStatefulWidget {
  const _NewDeliverySheet();

  @override
  ConsumerState<_NewDeliverySheet> createState() => _NewDeliverySheetState();
}

class _NewDeliverySheetState extends ConsumerState<_NewDeliverySheet> {
  int _step = 0;

  @override
  void initState() {
    super.initState();
    // Pré-preencher o receptor com o perfil (o utilizador pode editar).
    final profile = ref.read(profileProvider).value;
    _dropNameCtrl.text = profile?.fullName ?? '';
    _dropPhoneCtrl.text = profile?.phone ?? '';
  }

  // Recolha
  PickupKind _pickupKind = PickupKind.pharmacy;
  final _pickupNameCtrl = TextEditingController();
  final _pickupAddrCtrl = TextEditingController();
  LatLngPoint? _pickupPoint;

  // Entrega
  final _dropNameCtrl = TextEditingController();
  final _dropPhoneCtrl = TextEditingController();
  final _dropAddrCtrl = TextEditingController();
  LatLngPoint? _dropPoint;

  // Encomenda
  DeliveryPackage _package = DeliveryPackage.medication;
  final _descCtrl = TextEditingController();

  // Veículo / revisão
  String _vehicleKey = 'motorbike';
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _pickupNameCtrl.dispose();
    _pickupAddrCtrl.dispose();
    _dropNameCtrl.dispose();
    _dropPhoneCtrl.dispose();
    _dropAddrCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  bool get _canAdvance {
    switch (_step) {
      case 0:
        return _pickupNameCtrl.text.trim().length >= 3 && _pickupPoint != null;
      case 1:
        return _dropNameCtrl.text.trim().length >= 3 &&
            _dropPhoneCtrl.text.trim().length >= 9 &&
            _dropPoint != null;
      case 2:
        return true;
      default:
        return true;
    }
  }

  double get _distanceKm {
    if (_pickupPoint == null || _dropPoint == null) return 0;
    return _pickupPoint!.distanceToKm(_dropPoint!);
  }

  Future<void> _pickPoint(bool isPickup) async {
    final initial = isPickup ? _pickupPoint : _dropPoint;
    final result = await context.push<List<double>>('/picker',
        extra: initial == null ? null : [initial.lat, initial.lng]);
    if (result == null || result.length < 2 || !mounted) return;
    final point = LatLngPoint(lat: result[0], lng: result[1]);
    setState(() {
      if (isPickup) {
        _pickupPoint = point;
      } else {
        _dropPoint = point;
      }
    });
  }

  Future<void> _submit() async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final repo = ref.read(deliveryRepositoryProvider);
      final created = await repo.createDelivery(
        customerName: _dropNameCtrl.text.trim(),
        customerPhone: _dropPhoneCtrl.text.trim(),
        countryCode: 'MZ',
        pickupKind: _pickupKind,
        pickupName: _pickupNameCtrl.text.trim(),
        pickupLocation: _pickupPoint!,
        pickupAddress: _pickupAddrCtrl.text.trim().isEmpty
            ? null
            : _pickupAddrCtrl.text.trim(),
        dropoffName: _dropNameCtrl.text.trim(),
        dropoffLocation: _dropPoint!,
        dropoffAddress: _dropAddrCtrl.text.trim().isEmpty
            ? null
            : _dropAddrCtrl.text.trim(),
        dropoffPhone: _dropPhoneCtrl.text.trim(),
        packageType: _package,
        packageDescription: _descCtrl.text.trim().isEmpty
            ? null
            : _descCtrl.text.trim(),
        requiresColdChain: _package.coldChain,
        distanceKm: _distanceKm,
        vehicleKey: _vehicleKey,
        notes: null,
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
      context.push('/delivery/${created.id}');
    } catch (e) {
      setState(() {
        _submitting = false;
        _error = e.toString().contains('saldo') ||
                e.toString().contains('insuficiente')
            ? 'Saldo insuficiente na carteira. Carregue a carteira e tente de novo.'
            : 'Não foi possível criar o pedido. Verifique os dados e a sua ligação.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(profileProvider);
    final quote = DeliveryRepository.computeFee(
      distanceKm: _distanceKm,
      coldChain: _package.coldChain,
      vehicleKey: _vehicleKey,
    );
    return Padding(
      padding:
          EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * .92),
        decoration: const BoxDecoration(
          color: AppColors.bgMid,
          borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.glassBorder,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      ['Recolha', 'Destino', 'Encomenda', 'Revisão'][_step],
                      style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary),
                    ),
                  ),
                  Text('Passo ${_step + 1} de 4',
                      style: TextStyle(
                          fontSize: 12, color: AppColors.textMuted)),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18),
              child: Row(
                children: List.generate(4, (i) {
                  return Expanded(
                    child: Container(
                      height: 3,
                      margin: EdgeInsets.only(right: i == 3 ? 0 : 6),
                      decoration: BoxDecoration(
                        color: i <= _step
                            ? AppColors.primary
                            : AppColors.glassBorder,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  );
                }),
              ),
            ),
            const SizedBox(height: 8),
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 18),
                child: _buildStep(),
              ),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 8, 18, 0),
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.danger.withOpacity(.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline_rounded,
                          size: 18, color: AppColors.danger),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(_error!,
                            style: const TextStyle(
                                fontSize: 12, color: AppColors.danger)),
                      ),
                    ],
                  ),
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(18),
              child: Row(
                children: [
                  if (_step > 0)
                    TextButton(
                      onPressed: _submitting
                          ? null
                          : () => setState(() => _step--),
                      child: const Text('Voltar'),
                    ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _step < 3
                        ? GradientButton(
                            label: 'Continuar',
                            onPressed: _canAdvance
                                ? () => setState(() => _step++)
                                : null,
                          )
                        : GradientButton(
                            label:
                                'Confirmar e pagar ${formatMZN(quote.fee)}',
                            icon: Icons.check_circle_rounded,
                            loading: _submitting,
                            onPressed:
                                _canAdvance && !_submitting ? _submit : null,
                          ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep() {
    switch (_step) {
      case 0:
        return _pickupStep();
      case 1:
        return _dropoffStep();
      case 2:
        return _packageStep();
      default:
        return _reviewStep();
    }
  }

  Widget _pickupStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _FieldLabel('Onde recolher?'),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: PickupKind.values
              .map((k) => ChoiceChip(
                    label: Text('${k.emoji} ${k.label}'),
                    selected: _pickupKind == k,
                    onSelected: (_) => setState(() => _pickupKind = k),
                    selectedColor: AppColors.primary.withOpacity(.35),
                    labelStyle: const TextStyle(color: AppColors.textPrimary),
                    backgroundColor: AppColors.glassFill,
                  ))
              .toList(),
        ),
        const SizedBox(height: 14),
        _Field(
          controller: _pickupNameCtrl,
          hint: _pickupKind == PickupKind.pharmacy
              ? 'Ex.: Farmácia Moderna, Av. Nyerere'
              : 'Nome do local de recolha',
        ),
        const SizedBox(height: 10),
        _Field(
          controller: _pickupAddrCtrl,
          hint: 'Referência / andar (opcional)',
        ),
        const SizedBox(height: 14),
        _MapPickTile(
          label: _pickupPoint == null
              ? 'Escolher ponto de recolha no mapa'
              : 'Ponto definido · ${_pickupPoint!.lat.toStringAsFixed(4)}, ${_pickupPoint!.lng.toStringAsFixed(4)}',
          hasPoint: _pickupPoint != null,
          onTap: () => _pickPoint(true),
        ),
      ],
    );
  }

  Widget _dropoffStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _FieldLabel('Quem recebe?'),
        _Field(
          controller: _dropNameCtrl,
          hint: 'Nome de quem recebe',
        ),
        const SizedBox(height: 10),
        _Field(
          controller: _dropPhoneCtrl,
          hint: 'Telefone de contacto (+258…)',
          keyboard: TextInputType.phone,
        ),
        const SizedBox(height: 14),
        const _FieldLabel('Endereço de entrega'),
        _Field(
          controller: _dropAddrCtrl,
          hint: 'Bairro, rua, nº da porta',
        ),
        const SizedBox(height: 14),
        _MapPickTile(
          label: _dropPoint == null
              ? 'Marcar destino no mapa'
              : 'Destino definido · ${_dropPoint!.lat.toStringAsFixed(4)}, ${_dropPoint!.lng.toStringAsFixed(4)}',
          hasPoint: _dropPoint != null,
          onTap: () => _pickPoint(false),
        ),
      ],
    );
  }

  Widget _packageStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _FieldLabel('O que vai ser transportado?'),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: DeliveryPackage.values
              .map((p) => ChoiceChip(
                    label: Text('${p.emoji} ${p.label}'),
                    selected: _package == p,
                    onSelected: (_) => setState(() => _package = p),
                    selectedColor: AppColors.primary.withOpacity(.35),
                    labelStyle: const TextStyle(color: AppColors.textPrimary),
                    backgroundColor: AppColors.glassFill,
                  ))
              .toList(),
        ),
        if (_package.coldChain) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.info.withOpacity(.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(Icons.ac_unit_rounded,
                    size: 18, color: AppColors.info),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Encomenda térmica: +${formatMZN(30)} de cadeia de frio.',
                    style: TextStyle(
                        fontSize: 12, color: AppColors.textSecondary),
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 14),
        const _FieldLabel('Descrição (opcional)'),
        _Field(
          controller: _descCtrl,
          hint: 'Ex.: 2 caixas de insulina, sacarose…',
          maxLines: 2,
        ),
      ],
    );
  }

  Widget _reviewStep() {
    final quote = DeliveryRepository.computeFee(
      distanceKm: _distanceKm,
      coldChain: _package.coldChain,
      vehicleKey: _vehicleKey,
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _RouteSummary(
          pickupKind: _pickupKind,
          pickupName: _pickupNameCtrl.text.trim(),
          dropName: _dropNameCtrl.text.trim(),
          dropAddr: _dropAddrCtrl.text.trim(),
          distanceKm: _distanceKm,
        ),
        const SizedBox(height: 14),
        const _FieldLabel('Estafeta preferido'),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: DeliveryRepository.vehicleBase.entries
              .map((e) => ChoiceChip(
                    label: Text('${e.value.$1} · base ${formatMZN(e.value.$2)}'),
                    selected: _vehicleKey == e.key,
                    onSelected: (_) => setState(() => _vehicleKey = e.key),
                    selectedColor: AppColors.primary.withOpacity(.35),
                    labelStyle: const TextStyle(color: AppColors.textPrimary),
                    backgroundColor: AppColors.glassFill,
                  ))
              .toList(),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.glassFill,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.glassBorder),
          ),
          child: Column(
            children: [
              _QuoteRow('Distância estimada',
                  '${_distanceKm.toStringAsFixed(1)} km'),
              _QuoteRow('Cadeia de frio',
                  _package.coldChain ? '+${formatMZN(30)}' : '—'),
              const Divider(height: 18, color: AppColors.glassBorder),
              _QuoteRow('Total a pagar da carteira',
                  formatMZN(quote.fee),
                  bold: true),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Text(
          'O pedido fica visível para estafetas verificados da sua região. '
          'Pode cancelar gratuitamente enquanto estiver "Por aceitar".',
          style: TextStyle(
              fontSize: 11.5, color: AppColors.textMuted, height: 1.45),
        ),
      ],
    );
  }
}

// ── Widgets auxiliares da folha ───────────────────────────────────────

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(text.toUpperCase(),
          style: TextStyle(
              fontSize: 11,
              letterSpacing: 1,
              fontWeight: FontWeight.w800,
              color: AppColors.textMuted)),
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({
    required this.controller,
    required this.hint,
    this.keyboard,
    this.maxLines = 1,
  });

  final TextEditingController controller;
  final String hint;
  final TextInputType? keyboard;
  final int maxLines;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: keyboard,
      maxLines: maxLines,
      style: const TextStyle(color: AppColors.textPrimary, fontSize: 13.5),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: AppColors.textMuted, fontSize: 13),
        filled: true,
        fillColor: AppColors.glassFill,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: AppColors.glassBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary),
        ),
      ),
    );
  }
}

class _MapPickTile extends StatelessWidget {
  const _MapPickTile({
    required this.label,
    required this.hasPoint,
    required this.onTap,
  });

  final String label;
  final bool hasPoint;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: hasPoint
          ? AppColors.success.withOpacity(.12)
          : AppColors.primary.withOpacity(.12),
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
                color: hasPoint
                    ? AppColors.success.withOpacity(.4)
                    : AppColors.primary.withOpacity(.4)),
          ),
          child: Row(
            children: [
              Icon(
                hasPoint ? Icons.check_circle_rounded : Icons.map_rounded,
                size: 19,
                color: hasPoint ? AppColors.success : AppColors.accent,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(label,
                    style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary)),
              ),
              Icon(hasPoint ? Icons.edit_location_alt_rounded : Icons.chevron_right_rounded,
                  size: 18, color: AppColors.textMuted),
            ],
          ),
        ),
      ),
    );
  }
}

class _RouteSummary extends StatelessWidget {
  const _RouteSummary({
    required this.pickupKind,
    required this.pickupName,
    required this.dropName,
    required this.dropAddr,
    required this.distanceKm,
  });

  final PickupKind pickupKind;
  final String pickupName;
  final String dropName;
  final String dropAddr;
  final double distanceKm;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(pickupKind.emoji, style: const TextStyle(fontSize: 16)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(pickupName,
                    style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary)),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.only(left: 7),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 2,
                  height: 18,
                  color: AppColors.primary.withOpacity(.5),
                ),
                Text('${distanceKm.toStringAsFixed(1)} km · estafeta verificado',
                    style: TextStyle(fontSize: 10.5, color: AppColors.textMuted)),
                Container(
                  width: 2,
                  height: 14,
                  color: AppColors.success.withOpacity(.5),
                ),
              ],
            ),
          ),
          Row(
            children: [
              const Text('🏠', style: TextStyle(fontSize: 16)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  dropAddr.isEmpty ? dropName : '$dropName · $dropAddr',
                  style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _QuoteRow extends StatelessWidget {
  const _QuoteRow(this.label, this.value, {this.bold = false});

  final String label;
  final String value;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Expanded(
            child: Text(label,
                style: TextStyle(
                    fontSize: bold ? 13 : 12.5,
                    fontWeight: bold ? FontWeight.w800 : FontWeight.w400,
                    color: bold ? AppColors.textPrimary : AppColors.textSecondary)),
          ),
          Text(value,
              style: TextStyle(
                  fontSize: bold ? 14 : 12.5,
                  fontWeight: FontWeight.w800,
                  color: bold ? AppColors.accent : AppColors.textPrimary)),
        ],
      ),
    );
  }
}
