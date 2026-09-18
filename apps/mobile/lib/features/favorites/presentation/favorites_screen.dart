import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/skeleton.dart';
import '../../facilities/data/facility_model.dart';
import '../data/favorites_repository.dart';

/// Constrói a HealthFacility (fonte `store`) a partir do favorito,
/// para navegar ao detalhe exactamente como no directório.
HealthFacility _facilityOf(FavoriteStore fav) {
  return HealthFacility(
    id: fav.id,
    source: FacilitySource.store,
    type: FacilityType.parse(fav.type, FacilitySource.store),
    name: fav.name,
    city: fav.city,
    address: fav.address,
    rating: fav.rating,
    imageUrl: fav.imageUrl,
  );
}

/// Favoritos — espelho da tabela `favorites` da versão web.
///
/// Sincronização em tempo real com a web: um coração posto no
/// StoreDetail do site aparece aqui sem refresh (Supabase Realtime
/// `.stream()`) e vice-versa. Secções: Farmácias (stores) e Produtos
/// (products), com remoção por coração e navegação para o detalhe.
class FavoritesScreen extends ConsumerStatefulWidget {
  const FavoritesScreen({super.key});

  @override
  ConsumerState<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends ConsumerState<FavoritesScreen> {
  StreamSubscription? _sub;
  List<FavoriteStore> _stores = [];
  List<FavoriteProduct> _products = [];
  bool _loading = true;

  FavoritesRepository get _repo => ref.read(favoritesRepositoryProvider);

  @override
  void initState() {
    super.initState();
    _load();
    // Realtime: qualquer alteração (web ou app) recarrega as listas.
    _sub = _repo.watchRaw().listen((_) => _load());
  }

  Future<void> _load() async {
    final stores = await _repo.fetchStores();
    final products = await _repo.fetchProducts();
    if (!mounted) return;
    setState(() {
      _stores = stores;
      _products = products;
      _loading = false;
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  Future<void> _remove(FavoriteStore fav) async {
    setState(() => _stores = _stores.where((s) => s != fav).toList());
    try {
      await _repo.remove(fav.favoriteId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${fav.name} removido dos favoritos')),
        );
      }
    } catch (_) {
      _load(); // rollback visual
    }
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
              // ── Cabeçalho ────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(6, 8, 16, 0),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => context.pop(),
                      icon: const Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    const Icon(Icons.favorite_rounded,
                        color: Color(0xFFF43F5E)),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'Favoritos',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 19,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    // Ponto "sync" — igual à web quando muda.
                    if (!_loading)
                      const Icon(Icons.sync_rounded,
                          size: 16, color: AppColors.textSecondary),
                  ],
                ),
              ),
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 2, 20, 10),
                child: Text(
                  'Sincronizado com a versão web, em tempo real',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12.5,
                  ),
                ),
              ),

              // ── Conteúdo ─────────────────────────────────────────
              Expanded(
                child: _loading
                    ? const _FavoritesSkeleton()
                    : (_stores.isEmpty && _products.isEmpty)
                        ? const _EmptyFavorites()
                        : RefreshIndicator(
                            onRefresh: _load,
                            child: ListView(
                              padding:
                                  const EdgeInsets.fromLTRB(20, 4, 20, 40),
                              children: [
                                if (_stores.isNotEmpty) ...[
                                  const _SectionHeader(
                                      icon: Icons.local_pharmacy_rounded,
                                      label: 'Farmácias'),
                                  for (final fav in _stores)
                                    _StoreCard(
                                            fav: fav,
                                            onRemove: () => _remove(fav))
                                        .animate()
                                        .fadeIn(
                                          duration:
                                              const Duration(milliseconds: 260),
                                        )
                                        .slideY(begin: 0.08, end: 0),
                                  const SizedBox(height: 18),
                                ],
                                if (_products.isNotEmpty) ...[
                                  const _SectionHeader(
                                      icon: Icons.medication_rounded,
                                      label: 'Produtos'),
                                  for (final fav in _products)
                                    _ProductCard(fav: fav)
                                        .animate()
                                        .fadeIn(
                                          duration:
                                              const Duration(milliseconds: 260),
                                        )
                                        .slideY(begin: 0.08, end: 0),
                                ],
                              ],
                            ),
                          ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Cabeçalho de secção ────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Icon(icon, size: 16, color: AppColors.textSecondary),
          const SizedBox(width: 8),
          Text(
            label.toUpperCase(),
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 11.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.1,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Cartão de farmácia ─────────────────────────────────────────────

class _StoreCard extends StatelessWidget {
  const _StoreCard({required this.fav, required this.onRemove});

  final FavoriteStore fav;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        leading: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: fav.imageUrl != null && fav.imageUrl!.isNotEmpty
              ? Image.network(
                  fav.imageUrl!,
                  width: 46,
                  height: 46,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => _leadingFallback,
                )
              : _leadingFallback,
        ),
        title: Text(
          fav.name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.w700,
            fontSize: 14.5,
          ),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 3),
          child: Text(
            [
              if ((fav.city ?? '').isNotEmpty) fav.city!,
              if ((fav.address ?? '').isNotEmpty) fav.address!,
              if (fav.rating != null) '★ ${fav.rating!.toStringAsFixed(1)}',
            ].join(' · '),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
                color: AppColors.textSecondary, fontSize: 12),
          ),
        ),
        trailing: IconButton(
          tooltip: 'Remover dos favoritos',
          onPressed: onRemove,
          icon: const Icon(Icons.favorite_rounded,
              color: Color(0xFFF43F5E)),
        ),
        onTap: () => context.push(
              '/facility-detail',
              extra: _facilityOf(fav),
            ),
      ),
    );
  }

  Widget get _leadingFallback => Container(
        width: 46,
        height: 46,
        alignment: Alignment.center,
        decoration: const BoxDecoration(
          color: Color(0x1438BDF8),
          borderRadius: BorderRadius.all(Radius.circular(12)),
        ),
        child: const Icon(Icons.local_pharmacy_rounded,
            color: AppColors.accent, size: 22),
      );
}

// ── Cartão de produto ──────────────────────────────────────────────

class _ProductCard extends StatelessWidget {
  const _ProductCard({required this.fav});

  final FavoriteProduct fav;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        leading: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: fav.imageUrl != null && fav.imageUrl!.isNotEmpty
              ? Image.network(
                  fav.imageUrl!,
                  width: 46,
                  height: 46,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => _fallback,
                )
              : _fallback,
        ),
        title: Text(
          fav.name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.w700,
            fontSize: 14.5,
          ),
        ),
        subtitle: fav.price != null
            ? Padding(
                padding: const EdgeInsets.only(top: 3),
                child: Text(
                  '${fav.price!.toStringAsFixed(0)} MZN',
                  style: const TextStyle(
                      color: AppColors.accent,
                      fontWeight: FontWeight.w700,
                      fontSize: 12.5),
                ),
              )
            : null,
        trailing: const Icon(Icons.favorite_rounded,
            color: Color(0xFFF43F5E)),
      ),
    );
  }

  Widget get _fallback => Container(
        width: 46,
        height: 46,
        alignment: Alignment.center,
        decoration: const BoxDecoration(
          color: Color(0x1438BDF8),
          borderRadius: BorderRadius.all(Radius.circular(12)),
        ),
        child: const Icon(Icons.medication_rounded,
            color: AppColors.accent, size: 22),
      );
}

// ── Estados vazios e skeleton ──────────────────────────────────────

class _EmptyFavorites extends StatelessWidget {
  const _EmptyFavorites();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(22),
            decoration: const BoxDecoration(
              color: Color(0x14F43F5E),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.favorite_border_rounded,
                size: 44, color: Color(0xFFF43F5E)),
          ),
          const SizedBox(height: 18),
          const Text(
            'Ainda sem favoritos',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 40),
            child: Text(
              'Toca no ♥ no detalhe de uma farmácia — ou no site — '
              'e aparece aqui nos dois lados.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 12.5,
                height: 1.5,
              ),
            ),
          ),
          const SizedBox(height: 20),
          TextButton.icon(
            onPressed: () => context.go('/facilities'),
            icon: const Icon(Icons.local_pharmacy_rounded, size: 18),
            label: const Text('Ver farmácias'),
            style: TextButton.styleFrom(foregroundColor: AppColors.accent),
          ),
        ],
      ),
    );
  }
}

class _FavoritesSkeleton extends StatelessWidget {
  const _FavoritesSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 20),
      children: [
        for (var i = 0; i < 4; i++)
          const Padding(
            padding: EdgeInsets.only(bottom: 10),
            child: AppSkeleton(height: 74, radius: 18),
          ),
      ],
    );
  }
}
