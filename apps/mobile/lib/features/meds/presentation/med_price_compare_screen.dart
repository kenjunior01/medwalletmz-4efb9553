import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../data/med_price_repository.dart';

/// F46 — Comparador de Preços de Medicamentos 💊 (paridade com a web).
///
/// Padrão GoodRx: pesquisar → comparar farmácias → poupar. Inclui o preço de
/// referência oficial MISAU/WHO quando existe correspondência no catálogo.
class MedPriceCompareScreen extends ConsumerStatefulWidget {
  const MedPriceCompareScreen({super.key});

  @override
  ConsumerState<MedPriceCompareScreen> createState() =>
      _MedPriceCompareScreenState();
}

class _MedPriceCompareScreenState extends ConsumerState<MedPriceCompareScreen> {
  final _controller = TextEditingController();
  String? _activeQuery;

  static const _suggestions = [
    'Paracetamol',
    'Amoxicilina',
    'Ibuprofeno',
    'Coartem',
    'Vitamina C',
  ];

  void _search(String q) {
    final query = q.trim();
    if (query.length < 2) return;
    FocusScope.of(context).unfocus();
    setState(() => _activeQuery = query);
  }

  String _fmt(num? v) {
    if (v == null) return '—';
    final rounded = v.round();
    if (v == rounded) {
      final s = rounded.toString().replaceAllMapped(
            RegExp(r'(\d)(?=(\d{3})+$)'),
            (m) => '${m[1]} ',
          );
      return '$s MT';
    }
    return '${v.toStringAsFixed(2)} MT';
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final async = _activeQuery == null
        ? const AsyncValue<MedCompareResult>.loading()
        : ref.watch(medCompareProvider(_activeQuery!));

    return Scaffold(
      backgroundColor: Colors.transparent,
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
                      icon: Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    Text(
                      'Comparar Preços',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                child: TextField(
                  controller: _controller,
                  textInputAction: TextInputAction.search,
                  onSubmitted: _search,
                  style: TextStyle(color: AppColors.textPrimary),
                  decoration: InputDecoration(
                    hintText: 'Ex.: Paracetamol, Amoxicilina…',
                    hintStyle: TextStyle(color: AppColors.textMuted),
                    prefixIcon: Icon(Icons.search_rounded,
                        color: AppColors.textSecondary),
                    suffixIcon: _activeQuery == null
                        ? null
                        : IconButton(
                            icon: Icon(Icons.close_rounded,
                                color: AppColors.textSecondary),
                            onPressed: () {
                              _controller.clear();
                              setState(() => _activeQuery = null);
                            },
                          ),
                    filled: true,
                    fillColor: AppColors.glassFill,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide(color: AppColors.glassBorder),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide(color: AppColors.glassBorder),
                    ),
                  ),
                ),
              ),
              SizedBox(
                height: 44,
                child: ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  scrollDirection: Axis.horizontal,
                  itemCount: _suggestions.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (_, i) => ActionChip(
                    label: Text(_suggestions[i]),
                    onPressed: () {
                      _controller.text = _suggestions[i];
                      _search(_suggestions[i]);
                    },
                  ),
                ),
              ),
              Expanded(
                child: async.when(
                  loading: () => const Center(
                      child: CircularProgressIndicator(strokeWidth: 2)),
                  error: (e, _) => _ErrorView(
                      message: e.toString(),
                      onRetry: () => _activeQuery == null
                          ? null
                          : ref.invalidate(
                              medCompareProvider(_activeQuery!))),
                  data: (r) => _Body(result: r, fmt: _fmt),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/* ═════════════════════════ Resultado ═════════════════════════ */

class _Body extends StatelessWidget {
  const _Body({required this.result, required this.fmt});

  final MedCompareResult result;
  final String Function(num?) fmt;

  @override
  Widget build(BuildContext context) {
    if (result.offers.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.medication_rounded,
                  color: AppColors.textMuted, size: 40),
              const SizedBox(height: 12),
              Text(
                'Nenhuma farmácia tem «${result.query}» ainda',
                style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w700),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 6),
              Text(
                'Tente o nome genérico ou outra grafia.',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
              ),
            ],
          ),
        ),
      );
    }

    final ref = result.reference;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
      children: [
        // Estatísticas — o momento «poupança» do GoodRx
        Row(
          children: [
            _StatCard(
              label: 'Melhor preço',
              value: fmt(result.stats.lowest),
              highlight: true,
            ),
            const SizedBox(width: 10),
            _StatCard(
                label: 'Preço médio', value: fmt(result.stats.average)),
            const SizedBox(width: 10),
            _StatCard(
              label: 'Poupança até',
              value: '${result.stats.savingsPct}%',
              accent: AppColors.success,
            ),
          ],
        ),

        // Referência oficial MISAU/WHO
        if (ref != null && ref.hasPrice) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.glassFill,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.glassBorder),
            ),
            child: Row(
              children: [
                Icon(Icons.verified_rounded, color: AppColors.primary),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        (ref.genericName?.isNotEmpty ?? false)
                            ? '${ref.genericName}${ref.strength != null ? ' ${ref.strength}' : ''}'
                            : ref.name,
                        style: TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w700,
                            fontSize: 14),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Referência MISAU/WHO: ${fmt(ref.referencePriceMzn)}',
                        style: TextStyle(
                            color: AppColors.textSecondary, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                if ((ref.savingsVsReferencePct ?? 0) > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.success.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      '-${ref.savingsVsReferencePct}%',
                      style: TextStyle(
                          color: AppColors.success,
                          fontWeight: FontWeight.w800,
                          fontSize: 12),
                    ),
                  ),
              ],
            ),
          ),
        ],

        const SizedBox(height: 16),
        ...List.generate(result.offers.length, (i) {
          final o = result.offers[i];
          return _OfferTile(offer: o, best: i == 0, fmt: fmt);
        }),

        const SizedBox(height: 8),
        Text(
          'Preços fornecidos pelas farmácias registadas e podem variar com '
          'stock e campanhas. A referência MISAU/WHO é o preço oficial do '
          'medicamento essencial em Moçambique.',
          style: TextStyle(color: AppColors.textMuted, fontSize: 11),
        ),
      ],
    );
  }
}

/* ═════════════════════════ Componentes ═════════════════════════ */

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    this.highlight = false,
    this.accent,
  });

  final String label;
  final String value;
  final bool highlight;
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    final color = accent ?? (highlight ? AppColors.success : AppColors.primary);
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.12),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withOpacity(0.35)),
        ),
        child: Column(
          children: [
            Text(label,
                style:
                    TextStyle(color: AppColors.textSecondary, fontSize: 11)),
            const SizedBox(height: 4),
            Text(value,
                style: TextStyle(
                    color: color,
                    fontSize: 16,
                    fontWeight: FontWeight.w900)),
          ],
        ),
      ),
    );
  }
}

class _OfferTile extends StatelessWidget {
  const _OfferTile({required this.offer, required this.best, required this.fmt});

  final MedOffer offer;
  final bool best;
  final String Function(num?) fmt;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: best
              ? AppColors.success.withOpacity(0.4)
              : AppColors.glassBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (best) ...[
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.success.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text('MELHOR PREÇO',
                      style: TextStyle(
                          color: AppColors.success,
                          fontSize: 10,
                          fontWeight: FontWeight.w800)),
                ),
                const SizedBox(width: 8),
              ],
              Expanded(
                child: Text(
                  offer.productName,
                  style: TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w700,
                      fontSize: 14),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              Text(fmt(offer.price),
                  style: TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.w900)),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Icon(Icons.storefront_rounded,
                  size: 14, color: AppColors.textSecondary),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  offer.storeName +
                      (offer.city != null && offer.city!.isNotEmpty
                          ? ' · ${offer.city}'
                          : ''),
                  style:
                      TextStyle(color: AppColors.textSecondary, fontSize: 12),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (offer.rating != null && (offer.rating as num) > 0) ...[
                Icon(Icons.star_rounded,
                    size: 14, color: const Color(0xFFF59E0B)),
                Text(' ${offer.rating}',
                    style: TextStyle(
                        color: AppColors.textSecondary, fontSize: 12)),
              ],
              if (offer.deliveryTime != null &&
                  offer.deliveryTime!.isNotEmpty) ...[
                const SizedBox(width: 10),
                Icon(Icons.schedule_rounded,
                    size: 14, color: AppColors.textSecondary),
                Text(' ${offer.deliveryTime}',
                    style: TextStyle(
                        color: AppColors.textSecondary, fontSize: 12)),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

/* ═════════════════════════ Estado de erro ═════════════════════════ */

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.info_outline_rounded,
                color: Color(0xFFF59E0B), size: 40),
            const SizedBox(height: 12),
            Text(
              'Não foi possível comparar preços',
              style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Text(
              'Se persistir, a migração F46 (RPC compare_med_prices) ainda '
              'não foi aplicada no Supabase.',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Tentar novamente'),
            ),
          ],
        ),
      ),
    );
  }
}
