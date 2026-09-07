import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Classificados de Saúde — marketplace de anúncios entre utilizadores
/// (paridade com `pages/ads/` da web: `Ads.tsx`, `MyAds.tsx`, `AdForm.tsx`).
///
/// Tabela `advertisements` (migração 20260703071551):
///   • leitura pública de `status = 'approved'` + os próprios anúncios;
///   • INSERT/UPDATE próprios via RLS — o admin global aprova no painel web.
/// Zero alterações de backend.
class ClassifiedAd {
  const ClassifiedAd({
    required this.id,
    required this.title,
    required this.category,
    required this.status,
    this.description,
    this.imageUrl,
    this.priceMzn,
    this.contactPhone,
    this.contactWhatsapp,
    this.city,
    this.neighborhood,
    this.views = 0,
    this.isMine = false,
    this.createdAt,
  });

  final String id;
  final String title;
  final String category;
  final String status;
  final String? description;
  final String? imageUrl;
  final double? priceMzn;
  final String? contactPhone;
  final String? contactWhatsapp;
  final String? city;
  final String? neighborhood;
  final int views;
  final bool isMine;
  final DateTime? createdAt;

  bool get isApproved => status == 'approved';
  bool get isPending => status == 'pending';

  factory ClassifiedAd.fromMap(Map<String, dynamic> m, {required String? myId}) {
    return ClassifiedAd(
      id: m['id']?.toString() ?? '',
      title: m['title']?.toString() ?? '',
      description: m['description']?.toString(),
      category: m['category']?.toString() ?? 'general',
      imageUrl: m['image_url']?.toString(),
      priceMzn: (m['price_mzn'] as num?)?.toDouble(),
      contactPhone: m['contact_phone']?.toString(),
      contactWhatsapp: m['contact_whatsapp']?.toString(),
      city: m['city']?.toString(),
      neighborhood: m['neighborhood']?.toString(),
      status: m['status']?.toString() ?? 'pending',
      views: (m['views'] as num?)?.toInt() ?? 0,
      isMine: myId != null && m['user_id']?.toString() == myId,
      createdAt: m['created_at'] != null
          ? DateTime.tryParse(m['created_at'].toString())
          : null,
    );
  }
}

class AdRepository {
  AdRepository(this._client);

  final SupabaseClient _client;

  /// Categorias de classificados (etiquetas PT-MZ).
  static const List<(String, String, String)> categories = [
    ('general', 'Geral', '📦'),
    ('medicine', 'Medicamentos', '💊'),
    ('equipment', 'Equipamento médico', '🏥'),
    ('services', 'Serviços de saúde', '🩺'),
    ('mobility', 'Mobilidade & apoio', '🦽'),
    ('baby', 'Mãe & bebé', '🍼'),
    ('jobs', 'Emprego', '💼'),
  ];

  static String categoryLabel(String key) {
    for (final c in categories) {
      if (c.$1 == key) return c.$2;
    }
    return 'Geral';
  }

  static String categoryEmoji(String key) {
    for (final c in categories) {
      if (c.$1 == key) return c.$3;
    }
    return '📦';
  }

  static const List<String> cities = [
    'Maputo',
    'Matola',
    'Beira',
    'Nampula',
    'Quelimane',
    'Tete',
    'Chimoio',
    'Pemba',
    'Inhambane',
    'Xai-Xai',
    'Lichinga',
  ];

  Future<List<ClassifiedAd>> fetchApproved({
    String? city,
    String? category,
    String? search,
    int limit = 60,
  }) async {
    // Filtros primeiro (PostgrestFilterBuilder), ordenação/limite no fim
    // (PostgrestTransformBuilder) — a mesma ordem usada na web.
    var query = _client
        .from('advertisements')
        .select()
        .eq('status', 'approved');
    if (city != null && city.isNotEmpty) {
      query = query.eq('city', city);
    }
    if (category != null && category.isNotEmpty) {
      query = query.eq('category', category);
    }
    if (search != null && search.trim().isNotEmpty) {
      query = query.ilike('title', '%${search.trim()}%');
    }
    final myId = _client.auth.currentUser?.id;
    final rows = await query.order('created_at', ascending: false).limit(limit);
    final list = <ClassifiedAd>[];
    for (final r in rows) {
      list.add(ClassifiedAd.fromMap(Map<String, dynamic>.from(r), myId: myId));
    }
    return list;
  }

  Future<List<ClassifiedAd>> fetchMine() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return [];
    final rows = await _client
        .from('advertisements')
        .select()
        .eq('user_id', uid)
        .order('created_at', ascending: false);
    final list = <ClassifiedAd>[];
    for (final r in rows) {
      list.add(ClassifiedAd.fromMap(Map<String, dynamic>.from(r), myId: uid));
    }
    return list;
  }

  Future<void> createAd({
    required String title,
    String? description,
    required String category,
    double? priceMzn,
    String? contactPhone,
    String? contactWhatsapp,
    required String city,
    String? neighborhood,
  }) async {
    final uid = _client.auth.currentUser!.id;
    await _client.from('advertisements').insert({
      'user_id': uid,
      'title': title,
      'description': description,
      'category': category,
      'price_mzn': priceMzn,
      'contact_phone': contactPhone,
      'contact_whatsapp': contactWhatsapp,
      'city': city,
      'neighborhood': neighborhood,
    });
  }

  Future<void> removeAd(String adId) async {
    await _client.from('advertisements').delete().eq('id', adId);
  }
}

final adRepositoryProvider =
    Provider<AdRepository>((ref) => AdRepository(Supabase.instance.client));
