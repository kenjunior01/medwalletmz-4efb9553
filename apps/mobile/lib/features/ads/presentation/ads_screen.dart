import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/ad_repository.dart';

/// Classificados de Saúde (paridade com `pages/ads/` da web):
/// 2 abas — Explorar (aprovados, filtro por cidade/categoria/pesquisa) e
/// Os Meus (próprios com estado pendente/aprovado) + folha de criação.
class AdsScreen extends ConsumerStatefulWidget {
  const AdsScreen({super.key});

  @override
  ConsumerState<AdsScreen> createState() => _AdsScreenState();
}

class _AdsScreenState extends ConsumerState<AdsScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  String? _city;
  String? _category;
  String _search = '';
  bool _loading = true;
  List<ClassifiedAd> _browse = [];
  List<ClassifiedAd> _mine = [];

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    _tabs.addListener(() {
      if (!_tabs.indexIsChanging && _tabs.index == 1) _loadMine();
    });
    _load();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final repo = ref.read(adRepositoryProvider);
    try {
      final list = await repo.fetchApproved(
        city: _city,
        category: _category,
        search: _search,
      );
      if (!mounted) return;
      setState(() => _browse = list);
    } catch (_) {
      if (!mounted) return;
      setState(() => _browse = []);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadMine() async {
    final repo = ref.read(adRepositoryProvider);
    try {
      final list = await repo.fetchMine();
      if (!mounted) return;
      setState(() => _mine = list);
    } catch (_) {
      if (!mounted) return;
      setState(() => _mine = []);
    }
  }

  Future<void> _remove(ClassifiedAd ad) async {
    final repo = ref.read(adRepositoryProvider);
    try {
      await repo.removeAd(ad.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Anúncio removido'),
        backgroundColor: AppColors.info,
      ));
      await _loadMine();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Não foi possível remover'),
        backgroundColor: AppColors.danger,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          title: const Text('Classificados 🛍️'),
          bottom: TabBar(
            controller: _tabs,
            indicatorColor: AppColors.accent,
            labelColor: AppColors.textPrimary,
            unselectedLabelColor: AppColors.textMuted,
            tabs: const [
              Tab(text: 'Explorar'),
              Tab(text: 'Os meus'),
            ],
          ),
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () => _openCreateSheet(),
          backgroundColor: AppColors.accent,
          foregroundColor: AppColors.bgDeep,
          icon: const Icon(Icons.add_business_rounded),
          label: const Text('Anunciar',
              style: TextStyle(fontWeight: FontWeight.w800)),
        ),
        body: TabBarView(
          controller: _tabs,
          children: [
            _BrowseTab(
              loading: _loading,
              ads: _browse,
              city: _city,
              category: _category,
              onRefresh: _load,
              onCityChanged: (c) {
                setState(() => _city = c);
                _load();
              },
              onCategoryChanged: (c) {
                setState(() => _category = c);
                _load();
              },
              onSearch: (s) {
                setState(() => _search = s);
                _load();
              },
            ),
            _MineTab(ads: _mine, onRemove: _remove, onReload: _loadMine),
          ],
        ),
      ),
    );
  }

  void _openCreateSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.bgMid,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => _CreateAdSheet(onCreated: () {
        _load();
        _loadMine();
      }),
    );
  }
}

/* ------------------------------ EXPLORAR ------------------------------ */

class _BrowseTab extends StatefulWidget {
  const _BrowseTab({
    required this.loading,
    required this.ads,
    required this.city,
    required this.category,
    required this.onRefresh,
    required this.onCityChanged,
    required this.onCategoryChanged,
    required this.onSearch,
  });

  final bool loading;
  final List<ClassifiedAd> ads;
  final String? city;
  final String? category;
  final Future<void> Function() onRefresh;
  final ValueChanged<String?> onCityChanged;
  final ValueChanged<String?> onCategoryChanged;
  final ValueChanged<String> onSearch;

  @override
  State<_BrowseTab> createState() => _BrowseTabState();
}

class _BrowseTabState extends State<_BrowseTab> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: widget.onRefresh,
      color: AppColors.accent,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Column(
                children: [
                  TextField(
                    controller: _searchController,
                    onSubmitted: widget.onSearch,
                    style: const TextStyle(color: AppColors.textPrimary),
                    decoration: InputDecoration(
                      hintText: 'Procurar classificados…',
                      hintStyle: const TextStyle(color: AppColors.textMuted),
                      prefixIcon: const Icon(Icons.search_rounded,
                          color: AppColors.textMuted),
                      filled: true,
                      fillColor: AppColors.glassFill,
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(color: AppColors.glassBorder),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: AppColors.accent),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    height: 38,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: [
                        _CityChip(
                          label: 'Todas as cidades',
                          selected: widget.city == null,
                          onTap: () => widget.onCityChanged(null),
                        ),
                        ...AdRepository.cities.map(
                          (c) => _CityChip(
                            label: c,
                            selected: widget.city == c,
                            onTap: () => widget.onCityChanged(c),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 38,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: [
                        _CityChip(
                          label: 'Todas as categorias',
                          selected: widget.category == null,
                          onTap: () => widget.onCategoryChanged(null),
                        ),
                        ...AdRepository.categories.map(
                          (c) => _CityChip(
                            label: '${c.$3} ${c.$2}',
                            selected: widget.category == c.$1,
                            onTap: () => widget.onCategoryChanged(c.$1),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (widget.loading)
            const SliverPadding(
              padding: EdgeInsets.all(16),
              sliver: SliverToBoxAdapter(
                child: AppSkeleton(height: 260),
              ),
            )
          else if (widget.ads.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: const [
                    Icon(Icons.storefront_rounded,
                        size: 46, color: AppColors.textMuted),
                    SizedBox(height: 10),
                    Text(
                      'Sem classificados por aqui.\nPublica o teu ou muda os filtros.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.textMuted, height: 1.5),
                    ),
                  ],
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  mainAxisSpacing: 10,
                  crossAxisSpacing: 10,
                  childAspectRatio: 0.72,
                ),
                delegate: SliverChildBuilderDelegate(
                  (_, i) => _AdCard(ad: widget.ads[i]),
                  childCount: widget.ads.length,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _CityChip extends StatelessWidget {
  const _CityChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: selected
                ? AppColors.accent.withOpacity(0.2)
                : AppColors.glassFill,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: selected ? AppColors.accent : AppColors.glassBorder,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? AppColors.accent : AppColors.textSecondary,
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}

class _AdCard extends StatelessWidget {
  const _AdCard({required this.ad});
  final ClassifiedAd ad;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _openDetail(context),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.glassFill,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.glassBorder),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (ad.imageUrl != null && ad.imageUrl!.startsWith('http'))
                    Image.network(ad.imageUrl!, fit: BoxFit.cover)
                  else
                    Container(
                      color: AppColors.primaryDark.withOpacity(0.4),
                      alignment: Alignment.center,
                      child: Text(
                        AdRepository.categoryEmoji(ad.category),
                        style: const TextStyle(fontSize: 40),
                      ),
                    ),
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.55),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        '${AdRepository.categoryEmoji(ad.category)} '
                        '${AdRepository.categoryLabel(ad.category)}',
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    ad.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w800,
                        fontSize: 13),
                  ),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      const Icon(Icons.location_on_rounded,
                          size: 12, color: AppColors.textMuted),
                      const SizedBox(width: 2),
                      Expanded(
                        child: Text(
                          ad.city ?? 'Moçambique',
                          style: const TextStyle(
                              color: AppColors.textMuted, fontSize: 11),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 5),
                  Text(
                    ad.priceMzn != null ? formatMZN(ad.priceMzn!) : 'Sob consulta',
                    style: const TextStyle(
                        color: AppColors.success,
                        fontWeight: FontWeight.w800,
                        fontSize: 13.5),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openDetail(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bgMid,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => _AdDetailSheet(ad: ad),
    );
  }
}

class _AdDetailSheet extends StatelessWidget {
  const _AdDetailSheet({required this.ad});
  final ClassifiedAd ad;

  Future<void> _launch(BuildContext context, String? raw, String label) async {
    if (raw == null || raw.trim().isEmpty) return;
    final cleaned = raw.replaceAll(' ', '');
    final Uri uri = label == 'tel'
        ? Uri(scheme: 'tel', path: cleaned)
        : Uri(scheme: 'https', host: 'wa.me', path: '/$cleaned');
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Não foi possível abrir'),
          backgroundColor: AppColors.danger,
        ));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  '${AdRepository.categoryEmoji(ad.category)} '
                  '${AdRepository.categoryLabel(ad.category)}',
                  style: const TextStyle(
                      color: AppColors.accent,
                      fontSize: 12,
                      fontWeight: FontWeight.w800),
                ),
                const Spacer(),
                if (ad.city != null)
                  Text(ad.city!,
                      style: const TextStyle(
                          color: AppColors.textMuted, fontSize: 12)),
              ],
            ),
            const SizedBox(height: 8),
            Text(ad.title,
                style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 19,
                    fontWeight: FontWeight.w800)),
            if (ad.description != null && ad.description!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(ad.description!,
                  style: const TextStyle(
                      color: AppColors.textSecondary,
                      height: 1.5,
                      fontSize: 13.5)),
            ],
            const SizedBox(height: 12),
            Text(
              ad.priceMzn != null ? formatMZN(ad.priceMzn!) : 'Sob consulta',
              style: const TextStyle(
                  color: AppColors.success,
                  fontSize: 22,
                  fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                if (ad.contactWhatsapp != null &&
                    ad.contactWhatsapp!.isNotEmpty)
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _launch(context, ad.contactWhatsapp, 'wa'),
                      icon: const Icon(Icons.chat_rounded, size: 18),
                      label: const Text('WhatsApp'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF25D366),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                if (ad.contactPhone != null && ad.contactPhone!.isNotEmpty) ...[
                  if (ad.contactWhatsapp != null &&
                      ad.contactWhatsapp!.isNotEmpty)
                    const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _launch(context, ad.contactPhone, 'tel'),
                      icon: const Icon(Icons.call_rounded, size: 18),
                      label: const Text('Ligar'),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: AppColors.glassBorder),
                        foregroundColor: AppColors.textPrimary,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/* ------------------------------- OS MEUS ------------------------------ */

class _MineTab extends ConsumerWidget {
  const _MineTab({
    required this.ads,
    required this.onRemove,
    required this.onReload,
  });

  final List<ClassifiedAd> ads;
  final Future<void> Function(ClassifiedAd) onRemove;
  final Future<void> Function() onReload;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (ads.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            Icon(Icons.campaign_rounded, size: 46, color: AppColors.textMuted),
            SizedBox(height: 10),
            Text(
              'Ainda não tens anúncios.\nToca em "Anunciar" para criar o primeiro.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textMuted, height: 1.5),
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: onReload,
      color: AppColors.accent,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: ads.length,
        itemBuilder: (_, i) {
          final ad = ads[i];
          final color = ad.isApproved
              ? AppColors.success
              : (ad.isPending ? AppColors.warning : AppColors.danger);
          final label = ad.isApproved
              ? 'Aprovado'
              : (ad.isPending ? 'Pendente de aprovação' : 'Rejeitado');
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.glassFill,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.glassBorder),
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: AppColors.primaryDark.withOpacity(0.5),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(AdRepository.categoryEmoji(ad.category),
                      style: const TextStyle(fontSize: 20)),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(ad.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.w800)),
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          Container(
                            width: 7,
                            height: 7,
                            decoration:
                                BoxDecoration(color: color, shape: BoxShape.circle),
                          ),
                          const SizedBox(width: 5),
                          Text(label,
                              style:
                                  TextStyle(color: color, fontSize: 11.5)),
                          const SizedBox(width: 8),
                          Text('👁 ${ad.views}',
                              style: const TextStyle(
                                  color: AppColors.textMuted, fontSize: 11)),
                        ],
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => onRemove(ad),
                  icon: const Icon(Icons.delete_outline_rounded,
                      color: AppColors.danger, size: 20),
                  tooltip: 'Remover',
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

/* ------------------------------- CRIAR -------------------------------- */

class _CreateAdSheet extends ConsumerStatefulWidget {
  const _CreateAdSheet({required this.onCreated});
  final VoidCallback onCreated;

  @override
  ConsumerState<_CreateAdSheet> createState() => _CreateAdSheetState();
}

class _CreateAdSheetState extends ConsumerState<_CreateAdSheet> {
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _price = TextEditingController();
  final _phone = TextEditingController();
  final _whatsapp = TextEditingController();
  final _neighborhood = TextEditingController();

  String _category = 'general';
  String _city = 'Maputo';
  bool _saving = false;

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    _price.dispose();
    _phone.dispose();
    _whatsapp.dispose();
    _neighborhood.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_title.text.trim().length < 4) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Dá um título ao anúncio (mín. 4 letras)'),
        backgroundColor: AppColors.danger,
      ));
      return;
    }
    setState(() => _saving = true);
    final repo = ref.read(adRepositoryProvider);
    try {
      final price = double.tryParse(_price.text.replaceAll(',', '.'));
      await repo.createAd(
        title: _title.text.trim(),
        description: _description.text.trim().isEmpty
            ? null
            : _description.text.trim(),
        category: _category,
        priceMzn: price,
        contactPhone: _phone.text.trim().isEmpty ? null : _phone.text.trim(),
        contactWhatsapp:
            _whatsapp.text.trim().isEmpty ? null : _whatsapp.text.trim(),
        city: _city,
        neighborhood: _neighborhood.text.trim().isEmpty
            ? null
            : _neighborhood.text.trim(),
      );
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Anúncio enviado para aprovação ✅'),
        backgroundColor: AppColors.success,
      ));
      widget.onCreated();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Erro ao publicar: $e'),
        backgroundColor: AppColors.danger,
      ));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
            20, 16, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Novo classificado',
                  style: TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              const Text(
                'O anúncio é revisto pelo admin antes de ficar visível.',
                style: TextStyle(color: AppColors.textMuted, fontSize: 12),
              ),
              const SizedBox(height: 14),
              _SheetField(controller: _title, label: 'Título *'),
              const SizedBox(height: 10),
              _SheetField(
                  controller: _description, label: 'Descrição', maxLines: 3),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _SheetField(
                      controller: _price,
                      label: 'Preço (MZN)',
                      keyboardType: TextInputType.number,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _SheetField(
                      controller: _neighborhood,
                      label: 'Bairro',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _SheetField(
                      controller: _phone,
                      label: 'Telefone',
                      keyboardType: TextInputType.phone,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _SheetField(
                      controller: _whatsapp,
                      label: 'WhatsApp',
                      keyboardType: TextInputType.phone,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 40,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: AdRepository.categories
                      .map((c) => Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ChoiceChip(
                              label: Text('${c.$3} ${c.$2}'),
                              selected: _category == c.$1,
                              onSelected: (_) =>
                                  setState(() => _category = c.$1),
                              selectedColor: AppColors.accent.withOpacity(0.25),
                              labelStyle: TextStyle(
                                color: _category == c.$1
                                    ? AppColors.accent
                                    : AppColors.textSecondary,
                                fontWeight: FontWeight.w700,
                              ),
                              backgroundColor: AppColors.glassFill,
                              side: BorderSide(color: AppColors.glassBorder),
                            ),
                          ))
                      .toList(),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                height: 40,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: AdRepository.cities
                      .map((c) => Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ChoiceChip(
                              label: Text(c),
                              selected: _city == c,
                              onSelected: (_) => setState(() => _city = c),
                              selectedColor: AppColors.accent.withOpacity(0.25),
                              labelStyle: TextStyle(
                                color: _city == c
                                    ? AppColors.accent
                                    : AppColors.textSecondary,
                                fontWeight: FontWeight.w700,
                              ),
                              backgroundColor: AppColors.glassFill,
                              side: BorderSide(color: AppColors.glassBorder),
                            ),
                          ))
                      .toList(),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _saving ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.accent,
                    foregroundColor: AppColors.bgDeep,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                  ),
                  child: Text(_saving ? 'A publicar…' : 'Publicar anúncio',
                      style: const TextStyle(fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SheetField extends StatelessWidget {
  const _SheetField({
    required this.controller,
    required this.label,
    this.maxLines = 1,
    this.keyboardType,
  });

  final TextEditingController controller;
  final String label;
  final int maxLines;
  final TextInputType? keyboardType;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
      keyboardType: keyboardType,
      style: const TextStyle(color: AppColors.textPrimary),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
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
