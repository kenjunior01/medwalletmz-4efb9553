/// Modelos da Loja Global (Shopify Storefront API).
///
/// Parsing manual e defensivo — a Storefront API devolve nulls em
/// campos opcionais e os preços chegam como string decimal.
library;

/// Converte qualquer valor dinâmico da API em Map tipado com segurança.
Map<String, dynamic> shopMap(dynamic v) =>
    v is Map ? Map<String, dynamic>.from(v) : <String, dynamic>{};

class ShopifyMoney {
  const ShopifyMoney({required this.amount, required this.currencyCode});

  final double amount;
  final String currencyCode;

  factory ShopifyMoney.fromJson(Map<String, dynamic> j) => ShopifyMoney(
        amount: double.tryParse(j['amount']?.toString() ?? '') ?? 0,
        currencyCode: (j['currencyCode'] as String?) ?? 'USD',
      );

  String formatted() {
    final symbol = switch (currencyCode) {
      'USD' => r'US$',
      'CAD' => r'CA$',
      'EUR' => '€',
      'GBP' => '£',
      'MZN' => 'MT',
      _ => '$currencyCode ',
    };
    final s = amount.toStringAsFixed(2);
    return '$symbol $s';
  }
}

class ShopifyImage {
  const ShopifyImage({required this.url, this.altText});

  final String url;
  final String? altText;

  factory ShopifyImage.fromJson(Map<String, dynamic> j) => ShopifyImage(
        url: (j['url'] as String?) ?? '',
        altText: j['altText'] as String?,
      );
}

class ShopifyProduct {
  const ShopifyProduct({
    required this.id,
    required this.handle,
    required this.title,
    this.vendor,
    required this.description,
    required this.descriptionHtml,
    required this.available,
    required this.images,
    required this.priceMin,
    required this.priceMax,
    this.priceCompareAt,
    required this.tags,
    required this.collectionTitles,
  });

  final String id;
  final String handle;
  final String title;
  final String? vendor;
  final String description;
  final String descriptionHtml;
  final bool available;
  final List<ShopifyImage> images;
  final ShopifyMoney priceMin;
  final ShopifyMoney priceMax;
  final ShopifyMoney? priceCompareAt;
  final List<String> tags;
  final List<String> collectionTitles;

  factory ShopifyProduct.fromJson(Map<String, dynamic> j) {
    final images = <ShopifyImage>[];
    final imgs = j['images'];
    if (imgs is Map && imgs['edges'] is List) {
      for (final e in (imgs['edges'] as List)) {
        final n = e?['node'];
        if (n is Map) images.add(ShopifyImage.fromJson(shopMap(n)));
      }
    }
    final collections = <String>[];
    final cols = j['collections'];
    if (cols is Map && cols['edges'] is List) {
      for (final e in (cols['edges'] as List)) {
        final n = e?['node'];
        if (n is Map && n['title'] is String) collections.add(n['title'] as String);
      }
    }
    final compare = j['compareAtPriceRange'] is Map
        ? ShopifyMoney.fromJson(
            shopMap(shopMap(j['compareAtPriceRange'])['minVariantPrice']))
        : null;
    final priceRange = j['priceRange'] as Map?;
    return ShopifyProduct(
      id: (j['id'] as String?) ?? '',
      handle: (j['handle'] as String?) ?? '',
      title: (j['title'] as String?) ?? '',
      vendor: j['vendor'] as String?,
      description: (j['description'] as String?) ?? '',
      descriptionHtml: (j['descriptionHtml'] as String?) ?? '',
      available: (j['availableForSale'] as bool?) ?? false,
      images: images,
      priceMin: ShopifyMoney.fromJson(shopMap(priceRange?['minVariantPrice'])),
      priceMax: ShopifyMoney.fromJson(shopMap(priceRange?['maxVariantPrice'])),
      priceCompareAt: compare,
      tags: ((j['tags'] as List?) ?? const []).whereType<String>().toList(),
      collectionTitles: collections,
    );
  }

  /// Desconto % arredondado (0 se não há desconto).
  int get discountPercent {
    final c = priceCompareAt;
    if (c == null || c.amount <= priceMin.amount || c.amount == 0) return 0;
    return (((c.amount - priceMin.amount) / c.amount) * 100).round();
  }
}

class ShopifyVariant {
  const ShopifyVariant({
    required this.id,
    required this.title,
    required this.available,
    required this.price,
    this.selectedOptions = const [],
  });

  final String id;
  final String title;
  final bool available;
  final ShopifyMoney price;

  /// Pares name/value que definem esta variante (ex.: Tamanho=M, Cor=Preto).
  final List<ShopifyOptionValue> selectedOptions;

  factory ShopifyVariant.fromJson(Map<String, dynamic> j) {
    final sel = <ShopifyOptionValue>[];
    final rawSel = (j['selectedOptions'] as List?) ?? const [];
    for (final o in rawSel) {
      if (o is Map) {
        sel.add(ShopifyOptionValue(
          name: (o['name'] as String?) ?? '',
          value: (o['value'] as String?) ?? '',
        ));
      }
    }
    return ShopifyVariant(
      id: (j['id'] as String?) ?? '',
      title: (j['title'] as String?) ?? '',
      available: (j['availableForSale'] as bool?) ?? false,
      price: ShopifyMoney.fromJson(shopMap(j['price'])),
      selectedOptions: sel,
    );
  }
}

class ShopifyOptionValue {
  const ShopifyOptionValue({required this.name, required this.value});

  final String name;
  final String value;
}

class ShopifyOption {
  const ShopifyOption({required this.name, required this.values});

  final String name;
  final List<String> values;
}

class ShopifyProductFull {
  const ShopifyProductFull({
    required this.product,
    required this.options,
    required this.variants,
    this.totalInventory,
  });

  final ShopifyProduct product;
  final List<ShopifyOption> options;
  final List<ShopifyVariant> variants;
  final int? totalInventory;

  /// A primeira variante disponível (fallback) ou null.
  ShopifyVariant? get firstAvailable {
    for (final v in variants) {
      if (v.available) return v;
    }
    return variants.isNotEmpty ? variants.first : null;
  }
}

class ShopifyCollection {
  const ShopifyCollection({
    required this.id,
    required this.handle,
    required this.title,
    this.imageUrl,
  });

  final String id;
  final String handle;
  final String title;
  final String? imageUrl;

  factory ShopifyCollection.fromJson(Map<String, dynamic> j) =>
      ShopifyCollection(
        id: (j['id'] as String?) ?? '',
        handle: (j['handle'] as String?) ?? '',
        title: (j['title'] as String?) ?? '',
        imageUrl: j['image'] is Map ? j['image']['url'] as String? : null,
      );
}

class ShopifyCartLine {
  const ShopifyCartLine({
    required this.id,
    required this.quantity,
    required this.variantTitle,
    required this.linePrice,
    required this.productTitle,
    required this.productHandle,
    this.vendor,
    this.imageUrl,
  });

  final String id;
  final int quantity;
  final String variantTitle;
  final ShopifyMoney linePrice;
  final String productTitle;
  final String productHandle;
  final String? vendor;
  final String? imageUrl;
}

class ShopifyCart {
  const ShopifyCart({
    required this.id,
    required this.checkoutUrl,
    required this.totalQuantity,
    required this.lines,
    this.subtotal,
  });

  final String id;
  final String checkoutUrl;
  final int totalQuantity;
  final List<ShopifyCartLine> lines;
  final ShopifyMoney? subtotal;

  factory ShopifyCart.fromJson(Map<String, dynamic> j) {
    final lines = <ShopifyCartLine>[];
    final raw = j['lines'];
    if (raw is Map && raw['edges'] is List) {
      for (final e in (raw['edges'] as List)) {
        final node = e?['node'];
        if (node is! Map) continue;
        final merch = node['merchandise'];
        if (merch is! Map) continue;
        final product = merch['product'];
        final img = merch['image'];
        final cost = node['cost'];
        lines.add(ShopifyCartLine(
          id: (node['id'] as String?) ?? '',
          quantity: (node['quantity'] as num?)?.toInt() ?? 0,
          variantTitle: (merch['title'] as String?) ?? '',
          linePrice: ShopifyMoney.fromJson(
              (cost is Map && cost['totalAmount'] is Map)
                  ? shopMap(cost['totalAmount'])
                  : shopMap(merch['price'])),
          productTitle: product is Map ? (product['title'] as String?) ?? '' : '',
          productHandle:
              product is Map ? (product['handle'] as String?) ?? '' : '',
          vendor: product is Map ? product['vendor'] as String? : null,
          imageUrl: img is Map ? img['url'] as String? : null,
        ));
      }
    }
    final cost = j['cost'];
    return ShopifyCart(
      id: (j['id'] as String?) ?? '',
      checkoutUrl: (j['checkoutUrl'] as String?) ?? '',
      totalQuantity: (j['totalQuantity'] as num?)?.toInt() ?? 0,
      lines: lines,
      subtotal: cost is Map && cost['subtotalAmount'] is Map
          ? ShopifyMoney.fromJson(shopMap(cost['subtotalAmount']))
          : null,
    );
  }
}

class ShopifyShopInfo {
  const ShopifyShopInfo({required this.name, this.description});

  final String name;
  final String? description;

  factory ShopifyShopInfo.fromJson(Map<String, dynamic> j) => ShopifyShopInfo(
        name: (j['name'] as String?) ?? '',
        description: j['description'] as String?,
      );
}

/// Remove tags HTML da descrição (a app não renderiza HTML arbitrário).
String stripHtml(String html) {
  var text = html
      .replaceAll(RegExp(r'<(br|/p|/div|/li|/h[1-6])[^>]*>'), '\n')
      .replaceAll(RegExp(r'<li[^>]*>'), '• ');
  text = text.replaceAll(RegExp(r'<[^>]*>'), '');
  text = text
      .replaceAll('&amp;', '&')
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&quot;', '"')
      .replaceAll('&#39;', "'")
      .replaceAll('&nbsp;', ' ');
  // Colapsa linhas vazias duplicadas
  return text
      .split('\n')
      .map((l) => l.trim())
      .toList()
      .join('\n')
      .replaceAll(RegExp(r'\n{3,}'), '\n\n')
      .trim();
}
