import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/offline/offline_cache.dart';

/// Laboratórios sobre as MESMAS tabelas da versão web:
///   • laboratórios      → `clinics` com type = 'lab' | 'laboratory'
///   • catálogo de exames → `lab_exams`  (por laboratório)
///   • pedidos           → `lab_exam_orders` (items JSONB + total_mzn)
/// O débito na carteira usa a RPC oficial `wallet_debit` (idempotente,
/// transacional e auditada em wallet_transactions).
class LabExam {
  const LabExam({
    required this.id,
    required this.labId,
    required this.name,
    required this.category,
    required this.price,
    this.description,
    this.prepInstructions,
  });

  final String id;
  final String labId;
  final String name;
  final String category;
  final double price;
  final String? description;
  final String? prepInstructions;

  factory LabExam.fromJson(Map<String, dynamic> j) => LabExam(
        id: j['id'] as String,
        labId: j['lab_id'] as String,
        name: (j['name'] ?? '') as String,
        category: (j['category'] ?? 'geral') as String,
        price: double.tryParse(j['price_mzn']?.toString() ?? '') ?? 0,
        description: j['description'] as String?,
        prepInstructions: j['prep_instructions'] as String?,
      );
}

/// Linha do pedido de exames — `lab_exam_orders`.
class LabOrder {
  const LabOrder({
    required this.id,
    required this.labId,
    required this.labName,
    required this.items,
    required this.total,
    required this.status,
    required this.createdAt,
    this.patientName,
    this.patientPhone,
    this.scheduledAt,
    this.homeCollection = false,
    this.collectionAddress,
    this.collectionCity,
    this.notes,
    this.resultUrl,
    this.resultUploadedAt,
  });

  final String id;
  final String labId;
  final String labName;
  final List<LabOrderItem> items;
  final double total;
  final String status;
  final DateTime createdAt;
  final String? patientName;
  final String? patientPhone;
  final DateTime? scheduledAt;
  final bool homeCollection;
  final String? collectionAddress;
  final String? collectionCity;
  final String? notes;
  final String? resultUrl;
  final DateTime? resultUploadedAt;

  bool get hasResult => (resultUrl ?? '').isNotEmpty;
  bool get isCancellable => status == 'pending';

  /// Rótulo amigável do estado (espelha a versão web).
  String get statusLabel {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'confirmed':
        return 'Confirmado';
      case 'sample_collected':
        return 'Amostra recolhida';
      case 'in_progress':
        return 'Em análise';
      case 'completed':
        return 'Concluído';
      case 'cancelled':
        return 'Cancelado';
    }
    return status;
  }

  factory LabOrder.fromJson(Map<String, dynamic> j, {String? labName}) {
    final rawItems = (j['items'] as List?) ?? const [];
    return LabOrder(
      id: j['id'] as String,
      labId: j['lab_id'] as String,
      labName: labName ?? (j['lab_name'] as String?) ?? 'Laboratório',
      items: [
        for (final it in rawItems)
          LabOrderItem.fromJson((it as Map).cast<String, dynamic>()),
      ],
      total: double.tryParse(j['total_mzn']?.toString() ?? '') ?? 0,
      status: (j['status'] ?? 'pending') as String,
      createdAt:
          DateTime.tryParse(j['created_at']?.toString() ?? '') ??
              DateTime.now(),
      patientName: j['patient_name'] as String?,
      patientPhone: j['patient_phone'] as String?,
      scheduledAt: DateTime.tryParse(j['scheduled_at']?.toString() ?? ''),
      homeCollection: j['home_collection'] as bool? ?? false,
      collectionAddress: j['collection_address'] as String?,
      collectionCity: j['collection_city'] as String?,
      notes: j['notes'] as String?,
      resultUrl: j['result_url'] as String?,
      resultUploadedAt:
          DateTime.tryParse(j['result_uploaded_at']?.toString() ?? ''),
    );
  }
}

/// Exame dentro do pedido (items JSONB — mesmo shape do web).
class LabOrderItem {
  const LabOrderItem({
    required this.examId,
    required this.name,
    required this.price,
    this.category,
  });

  final String examId;
  final String name;
  final double price;
  final String? category;

  Map<String, dynamic> toJson() => {
        'exam_id': examId,
        'name': name,
        'price_mzn': price,
        if (category != null) 'category': category,
      };

  factory LabOrderItem.fromJson(Map<String, dynamic> j) => LabOrderItem(
        examId: (j['exam_id'] ?? '') as String,
        name: (j['name'] ?? 'Exame') as String,
        price: double.tryParse(j['price_mzn']?.toString() ?? '') ?? 0,
        category: j['category'] as String?,
      );
}

/// Repositório dos laboratórios.
class LabsRepository {
  LabsRepository(this._client);

  final SupabaseClient _client;

  /// Lista de laboratórios registados (tabela clinics, type=lab).
  /// Com cache offline: sem internet serve a última cópia guardada.
  Future<List<LabFacility>> fetchLabs() async {
    try {
      final rows = await OfflineCache.instance.cachedList(
        'labs_all',
        fetch: () async {
          final r = await _client
              .from('clinics')
              .select(
                  'id, name, city, address, phone, image_url, type, is_active')
              .inFilter('type', ['lab', 'laboratory']);
          return [
            for (final x in (r as List))
              (x as Map).cast<String, dynamic>(),
          ];
        },
      );
      return [
        for (final r in rows) LabFacility.fromJson(r),
      ];
    } catch (_) {
      return const [];
    }
  }

  /// Catálogo de exames activos do laboratório.
  Future<List<LabExam>> fetchExams(String labId) async {
    try {
      final rows = await _client
          .from('lab_exams')
          .select()
          .eq('lab_id', labId)
          .eq('is_active', true)
          .order('category')
          .order('name');
      return [
        for (final r in (rows as List))
          LabExam.fromJson((r as Map).cast<String, dynamic>()),
      ];
    } catch (_) {
      return const [];
    }
  }

  /// Nome do laboratório (para o histórico).
  Future<String> fetchLabName(String labId) async {
    try {
      final row = await _client
          .from('clinics')
          .select('name')
          .eq('id', labId)
          .limit(1);
      if (row is List && row.isNotEmpty) {
        return ((row.first as Map)['name'] ?? 'Laboratório') as String;
      }
    } catch (_) {}
    return 'Laboratório';
  }

  /// Cria o pedido e debita a carteira — MESMA sequência do web:
  /// 1) INSERT em lab_exam_orders (status=pending, items JSONB, total)
  /// 2) RPC wallet_debit (transacional, grava wallet_transactions)
  /// Devolve a mensagem de erro amigável ou null em caso de sucesso.
  Future<String?> createOrder({
    required String labId,
    required String patientName,
    String? patientPhone,
    required List<LabOrderItem> items,
    required double total,
    DateTime? scheduledAt,
    bool homeCollection = false,
    String? collectionAddress,
    String? collectionCity,
    String? notes,
  }) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return 'Sessão expirada. Entra novamente.';
    if (items.isEmpty) return 'Escolhe pelo menos um exame.';
    try {
      final created = await _client
          .from('lab_exam_orders')
          .insert({
            'user_id': uid,
            'lab_id': labId,
            'patient_name': patientName,
            'patient_phone': patientPhone,
            'items': [for (final i in items) i.toJson()],
            'total_mzn': total,
            'status': 'pending',
            if (scheduledAt != null)
              'scheduled_at': scheduledAt.toUtc().toIso8601String(),
            'home_collection': homeCollection,
            if (homeCollection && collectionAddress != null)
              'collection_address': collectionAddress,
            if (homeCollection && collectionCity != null)
              'collection_city': collectionCity,
            if (notes != null && notes.isNotEmpty) 'notes': notes,
          })
          .select('id')
          .single();
      final orderId = (created as Map)['id'] as String;

      // Débito na carteira via RPC oficial do backend (sem alterações).
      await _client.rpc('wallet_debit', params: {
        '_user_id': uid,
        '_amount': total,
        '_service_type': 'lab_exam',
        '_ref_id': orderId,
        '_description': 'Exames laboratoriais',
      });
      return null;
    } catch (e) {
      final msg = e.toString();
      if (msg.contains('Saldo insuficiente')) {
        return 'Saldo insuficiente na carteira. Carrega primeiro.';
      }
      return 'Não foi possível concluir o pedido. Tenta novamente.';
    }
  }

  /// Cancela um pedido ainda pendente (RLS: só o dono).
  Future<void> cancelOrder(String orderId) async {
    await _client
        .from('lab_exam_orders')
        .update({'status': 'cancelled'}).eq('id', orderId);
  }

  /// Histórico de pedidos do utilizador (realtime).
  Stream<List<LabOrder>> watchMyOrders() {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return Stream.value(const []);
    return _client
        .from('lab_exam_orders')
        .stream(primaryKey: ['id'])
        .eq('user_id', uid)
        .order('created_at')
        .asyncMap((rows) async {
          final orders = <LabOrder>[];
          for (final r in rows) {
            orders.add(LabOrder.fromJson((r as Map).cast<String, dynamic>()));
          }
          // Resolver nomes dos laboratórios em lote.
          final labIds = orders.map((o) => o.labId).toSet().toList();
          final names = <String, String>{};
          for (final id in labIds) {
            names[id] = await fetchLabName(id);
          }
          return [
            for (final o in orders)
              LabOrder(
                id: o.id,
                labId: o.labId,
                labName: names[o.labId] ?? o.labName,
                items: o.items,
                total: o.total,
                status: o.status,
                createdAt: o.createdAt,
                patientName: o.patientName,
                patientPhone: o.patientPhone,
                scheduledAt: o.scheduledAt,
                homeCollection: o.homeCollection,
                collectionAddress: o.collectionAddress,
                collectionCity: o.collectionCity,
                notes: o.notes,
                resultUrl: o.resultUrl,
                resultUploadedAt: o.resultUploadedAt,
              ),
          ];
        });
  }
}

/// Laboratório registado (linha de `clinics` com type=lab).
class LabFacility {
  const LabFacility({
    required this.id,
    required this.name,
    this.city,
    this.address,
    this.phone,
    this.imageUrl,
  });

  final String id;
  final String name;
  final String? city;
  final String? address;
  final String? phone;
  final String? imageUrl;

  factory LabFacility.fromJson(Map<String, dynamic> j) => LabFacility(
        id: j['id'] as String,
        name: (j['name'] ?? 'Laboratório') as String,
        city: j['city'] as String?,
        address: j['address'] as String?,
        phone: j['phone'] as String?,
        imageUrl: j['image_url'] as String?,
      );
}

final labsRepositoryProvider = Provider<LabsRepository>((ref) {
  return LabsRepository(Supabase.instance.client);
});
