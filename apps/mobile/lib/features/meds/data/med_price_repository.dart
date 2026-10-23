import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// F46 — Comparador de Preços de Medicamentos (paridade com a web).
///
/// Padrão GoodRx dos melhores do mundo: pesquisar o medicamento → comparar
/// preços em TODAS as farmácias → ver a poupança. Tudo calculado NO SERVIDOR
/// via RPC `compare_med_prices()` — o cliente nunca agrega preços.
class MedOffer {
  const MedOffer({
    required this.productId,
    required this.productName,
    required this.price,
    required this.storeId,
    required this.storeName,
    this.city,
    this.rating,
    this.deliveryFee,
    this.deliveryTime,
  });

  final String productId;
  final String productName;
  final int price;
  final String storeId;
  final String storeName;
  final String? city;
  final num? rating;
  final num? deliveryFee;
  final String? deliveryTime;

  factory MedOffer.fromMap(Map<String, dynamic> m) => MedOffer(
        productId: (m['product_id'] as String?) ?? '',
        productName: (m['product_name'] as String?) ?? '',
        price: ((m['price'] as num?) ?? 0).toInt(),
        storeId: (m['store_id'] as String?) ?? '',
        storeName: (m['store_name'] as String?) ?? '',
        city: m['city'] as String?,
        rating: m['rating'] as num?,
        deliveryFee: m['delivery_fee'] as num?,
        deliveryTime: m['delivery_time'] as String?,
      );
}

class MedCompareStats {
  const MedCompareStats({
    required this.count,
    this.lowest,
    this.highest,
    this.average,
    this.savingsPct = 0,
  });

  final int count;
  final num? lowest;
  final num? highest;
  final num? average;
  final int savingsPct;

  factory MedCompareStats.fromMap(Map<String, dynamic> m) => MedCompareStats(
        count: ((m['count'] as num?) ?? 0).toInt(),
        lowest: m['lowest'] as num?,
        highest: m['highest'] as num?,
        average: m['average'] as num?,
        savingsPct: ((m['savings_pct'] as num?) ?? 0).toInt(),
      );
}

class MedReference {
  const MedReference({
    required this.name,
    this.genericName,
    this.form,
    this.strength,
    this.referencePriceMzn,
    this.savingsVsReferencePct,
  });

  final String name;
  final String? genericName;
  final String? form;
  final String? strength;
  final num? referencePriceMzn;
  final int? savingsVsReferencePct;

  bool get hasPrice =>
      referencePriceMzn != null && (referencePriceMzn as num) > 0;

  factory MedReference.fromMap(Map<String, dynamic> m) => MedReference(
        name: (m['name'] as String?) ?? '',
        genericName: m['generic_name'] as String?,
        form: m['form'] as String?,
        strength: m['strength'] as String?,
        referencePriceMzn: m['reference_price_mzn'] as num?,
        savingsVsReferencePct: (m['savings_vs_reference_pct'] as num?)?.toInt(),
      );
}

class MedCompareResult {
  const MedCompareResult({
    required this.query,
    required this.offers,
    required this.stats,
    this.reference,
  });

  final String query;
  final List<MedOffer> offers;
  final MedCompareStats stats;
  final MedReference? reference;

  factory MedCompareResult.fromMap(Map<String, dynamic> m) {
    final rawOffers = m['offers'];
    final ref = m['reference'];
    return MedCompareResult(
      query: (m['query'] as String?) ?? '',
      offers: rawOffers is List
          ? rawOffers
              .whereType<Map<String, dynamic>>()
              .map(MedOffer.fromMap)
              .toList(growable: false)
          : const <MedOffer>[],
      stats: MedCompareStats.fromMap(
        (m['stats'] as Map<String, dynamic>?) ?? const <String, dynamic>{},
      ),
      reference: ref is Map<String, dynamic>
          ? MedReference.fromMap(ref)
          : null,
    );
  }
}

/// Provider do comparador (family por termo de pesquisa, autoDispose).
final medCompareProvider = FutureProvider.autoDispose
    .family<MedCompareResult, String>((ref, query) async {
  final res = await Supabase.instance.client.rpc(
    'compare_med_prices',
    params: {'p_query': query, 'p_country_id': null, 'p_limit': 30},
  );
  if (res is! Map<String, dynamic>) {
    throw const FormatException('compare_med_prices: resposta inesperada');
  }
  if (res['success'] != true) {
    throw StateError((res['error'] as String?) ?? 'erro_desconhecido');
  }
  return MedCompareResult.fromMap(res);
});
