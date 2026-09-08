import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Planos & Subscrições — MESMAS tabelas/fluxo da versão web
/// (`mzMonetization.ts` → `initiateSubscription`):
///   1) planos públicos   → `subscription_plans` (audience patient/doctor/clinic)
///   2) subscrição        → `subscriptions` (status pending, amount_paid,
///                          expires_at calculado no cliente como no web)
///   3) referência M-Pesa → `mpesa_manual_payments` (MW-XXXXXX; fallback
///                          local se a tabela não existir — igual ao web)
///   4) comprovativo      → UPDATE subscriptions + upload `payment-proofs`
/// A activação é feita pelo admin (trigger trg_activate_sub_on_mpesa).
class SubPlan {
  const SubPlan({
    required this.id,
    required this.name,
    required this.slug,
    required this.audience,
    required this.price,
    required this.billingPeriod,
    required this.features,
    this.description,
    this.badge,
  });

  final String id;
  final String name;
  final String slug;
  final String audience; // patient | doctor | clinic
  final int price; // MZN (inteiro, como no web)
  final String billingPeriod;
  final List<String> features;
  final String? description;
  final String? badge;

  factory SubPlan.fromJson(Map<String, dynamic> j) => SubPlan(
        id: j['id'] as String,
        name: (j['name'] ?? 'Plano') as String,
        slug: (j['slug'] ?? '') as String,
        audience: (j['target_audience'] ?? 'patient') as String,
        price: (j['price_mzn'] as num?)?.toInt() ?? 0,
        billingPeriod: (j['billing_period'] ?? 'monthly') as String,
        features: [
          for (final f in (j['features'] as List?) ?? const [])
            if (f is String) f,
        ],
        description: j['description'] as String?,
        badge: j['badge'] as String?,
      );
}

/// A minha subscrição numa linha.
class MySubscription {
  const MySubscription({
    required this.id,
    required this.status,
    required this.createdAt,
    this.planName,
    this.expiresAt,
    this.amountPaid,
    this.paymentMethod,
    this.paymentReference,
  });

  final String id;
  final String status; // pending | active | expired | rejected | cancelled
  final DateTime createdAt;
  final String? planName;
  final DateTime? expiresAt;
  final int? amountPaid;
  final String? paymentMethod;
  final String? paymentReference;

  String get statusLabel {
    switch (status) {
      case 'pending':
        return 'Aguarda pagamento';
      case 'active':
        return 'Activa';
      case 'expired':
        return 'Expirada';
      case 'rejected':
        return 'Recusada';
      case 'cancelled':
        return 'Cancelada';
    }
    return status;
  }

  factory MySubscription.fromJson(Map<String, dynamic> j,
      {String? planName}) =>
      MySubscription(
        id: j['id'] as String,
        status: (j['status'] ?? 'pending') as String,
        createdAt:
            DateTime.tryParse(j['created_at']?.toString() ?? '') ??
                DateTime.now(),
        planName: planName,
        expiresAt: DateTime.tryParse(j['expires_at']?.toString() ?? ''),
        amountPaid: (j['amount_paid'] as num?)?.toInt(),
        paymentMethod: j['payment_method'] as String?,
        paymentReference: j['payment_reference'] as String?,
      );
}

/// Referência de pagamento manual (resultado de mpesa_manual_payments).
class MpesaManualPayment {
  const MpesaManualPayment({
    required this.reference,
    required this.amount,
    required this.destinationNumber,
  });

  final String reference;
  final int amount;
  final String destinationNumber;
}

class SubscriptionsRepository {
  SubscriptionsRepository(this._client);

  final SupabaseClient _client;

  String? get _uid => _client.auth.currentUser?.id;

  /// Número oficial M-Pesa da plataforma (config Central do web).
  static const mpesaNumber = '845555123';

  /// Planos activos para a audiência dada (público — igual ao web).
  Future<List<SubPlan>> fetchPlans(String audience) async {
    try {
      final rows = await _client
          .from('subscription_plans')
          .select()
          .eq('is_active', true)
          .eq('target_audience', audience)
          .order('sort_order');
      return [
        for (final r in (rows as List))
          SubPlan.fromJson((r as Map).cast<String, dynamic>()),
      ];
    } catch (_) {
      return const [];
    }
  }

  /// As minhas subscrições (com nome do plano resolvido em lote).
  Future<List<MySubscription>> fetchMySubscriptions() async {
    final uid = _uid;
    if (uid == null) return const [];
    try {
      final rows = await _client
          .from('subscriptions')
          .select('*, subscription_plans(name)')
          .eq('user_id', uid)
          .order('created_at', ascending: false)
          .limit(10);
      return [
        for (final r in (rows as List))
          MySubscription.fromJson(
            (r as Map).cast<String, dynamic>(),
            planName:
                (((r as Map)['subscription_plans'] as Map?)?['name'])
                    as String?,
          ),
      ];
    } catch (_) {
      // Fallback sem join (política de SELECT em subscription_plans).
      try {
        final rows = await _client
            .from('subscriptions')
            .select()
            .eq('user_id', uid)
            .order('created_at', ascending: false)
            .limit(10);
        return [
          for (final r in (rows as List))
            MySubscription.fromJson((r as Map).cast<String, dynamic>()),
        ];
      } catch (_) {
        return const [];
      }
    }
  }

  /// Referência única MW-XXXXXX — mesmo gerador do web (sem 0/O/1/I).
  String generateReference() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    final rnd = Random();
    final s = List.generate(6, (_) => chars[rnd.nextInt(chars.length)]).join();
    return 'MW-$s';
  }

  /// Fluxo completo de subscrição (igual ao `initiateSubscription` do web):
  /// INSERT subscriptions → INSERT mpesa_manual_payments (tolerante a falha).
  Future<(String?, MpesaManualPayment?)> subscribe({
    required SubPlan plan,
    required String phone,
  }) async {
    final uid = _uid;
    if (uid == null) return ('Sessão expirada. Entra novamente.', null);
    final reference = generateReference();
    try {
      final created = await _client
          .from('subscriptions')
          .insert({
            'user_id': uid,
            'plan_id': plan.id,
            'status': 'pending',
            'payment_method': 'mpesa',
            'amount_paid': plan.price,
            'expires_at':
                DateTime.now().add(const Duration(days: 30)).toUtc().toIso8601String(),
            'admin_notes': 'Plano ${plan.name} · monthly (1m) · via app',
          })
          .select('id')
          .single();
      final subscriptionId = (created as Map)['id'] as String;

      // Pagamento manual M-Pesa (se a tabela existir no backend).
      try {
        await _client.from('mpesa_manual_payments').insert({
          'reference': reference,
          'amount_mzn': plan.price,
          'description': 'Subscrição ${plan.name}',
          'status': 'pending',
          'payer_phone': phone,
          'destination_number': mpesaNumber,
          'metadata': {'subscription_id': subscriptionId},
        });
      } catch (_) {
        // Tabela não disponível → seguimos igual ao web (mock local).
      }
      return (
        null,
        MpesaManualPayment(
          reference: reference,
          amount: plan.price,
          destinationNumber: mpesaNumber,
        ),
      );
    } catch (_) {
      return ('Não foi possível iniciar a subscrição. Tenta novamente.', null);
    }
  }

  /// Após pagar: submete o tx ID + comprovativo (igual ao web).
  Future<String?> submitProof({
    required String subscriptionId,
    required String txReference,
    required String phone,
    String? notes,
  }) async {
    try {
      await _client.from('subscriptions').update({
        'payment_reference': txReference,
        'payment_phone': phone,
        'admin_notes': notes != null && notes.isNotEmpty
            ? 'Comprovativo: $notes'
            : 'Aguarda confirmação admin — tx ID M-Pesa submetido pela app.',
      }).eq('id', subscriptionId);
      return null;
    } catch (_) {
      return 'Não foi possível enviar o comprovativo. Tenta novamente.';
    }
  }
}

final subscriptionsRepositoryProvider = Provider<SubscriptionsRepository>((ref) {
  return SubscriptionsRepository(Supabase.instance.client);
});
