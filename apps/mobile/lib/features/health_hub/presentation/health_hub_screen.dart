import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';

/// ── Modelos ──────────────────────────────────────────────────────────

/// Artigo de educação em saúde (`health_articles` — leitura pública
/// das linhas publicadas).
class HealthArticle {
  const HealthArticle({
    required this.id,
    required this.title,
    required this.excerpt,
    required this.category,
    this.bodyMd,
    this.coverUrl,
    this.authorName,
    this.authorCredentials,
    this.readMinutes = 3,
    this.isFeatured = false,
    this.viewsCount = 0,
  });

  final String id;
  final String title;
  final String excerpt;
  final String category;
  final String? bodyMd;
  final String? coverUrl;
  final String? authorName;
  final String? authorCredentials;
  final int readMinutes;
  final bool isFeatured;
  final int viewsCount;

  static const _cats = {
    'prevention': 'Prevenção',
    'nutrition': 'Nutrição',
    'maternal': 'Maternal',
    'child': 'Saúde infantil',
    'chronic': 'Doenças crónicas',
    'mental_health': 'Saúde mental',
    'sexual_health': 'Saúde sexual',
    'first_aid': 'Primeiros socorros',
    'mozambique_focus': 'Moçambique',
  };

  String get categoryLabel => _cats[category] ?? category;
  Color get categoryColor => switch (category) {
        'prevention' => const Color(0xFF38BDF8),
        'nutrition' => const Color(0xFF22C55E),
        'maternal' => const Color(0xFFF472B6),
        'child' => const Color(0xFFF5A623),
        'chronic' => const Color(0xFFC084FC),
        'mental_health' => const Color(0xFF60A5FA),
        'first_aid' => const Color(0xFFEF4444),
        'mozambique_focus' => const Color(0xFFFBBF24),
        _ => AppColors.accent,
      };

  factory HealthArticle.fromJson(Map<String, dynamic> j) => HealthArticle(
        id: j['id'] as String,
        title: (j['title'] ?? '') as String,
        excerpt: (j['excerpt'] ?? '') as String,
        category: (j['category'] ?? '') as String,
        bodyMd: j['body_md'] as String?,
        coverUrl: j['cover_url'] as String?,
        authorName: j['author_name'] as String?,
        authorCredentials: j['author_credentials'] as String?,
        readMinutes: (j['read_minutes'] as num?)?.toInt() ?? 3,
        isFeatured: (j['is_featured'] as bool?) ?? false,
        viewsCount: (j['views_count'] as num?)?.toInt() ?? 0,
      );
}

/// ── Ecrã ─────────────────────────────────────────────────────────────

/// Educação em saúde: artigos publicados pela plataforma (paridade com
/// a página /educacao da web). Cada leitura é contabilizada em
/// `article_views`.
class HealthHubScreen extends ConsumerStatefulWidget {
  const HealthHubScreen({super.key});

  @override
  ConsumerState<HealthHubScreen> createState() => _HealthHubScreenState();
}

class _HealthHubScreenState extends ConsumerState<HealthHubScreen> {
  List<HealthArticle>? _articles;
  String? _category; // null = todas
  bool _loading = true;
  String? _error;
  HealthArticle? _reading;

  static const _categories = <(String?, String)>[
    (null, 'Todas'),
    ('prevention', 'Prevenção'),
    ('nutrition', 'Nutrição'),
    ('maternal', 'Maternal'),
    ('child', 'Infantil'),
    ('chronic', 'Crónicas'),
    ('mental_health', 'Mental'),
    ('first_aid', 'Socorros'),
    ('mozambique_focus', 'Moçambique'),
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      var query = Supabase.instance.client
          .from('health_articles')
          .select()
          .eq('is_published', true);
      if (_category != null) query = query.eq('category', _category!);
      final rows =
          await query.order('created_at', ascending: false).limit(60);
      if (mounted) {
        setState(() {
          _articles =
              rows.map((r) => HealthArticle.fromJson(r)).toList();
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Não foi possível carregar os artigos.';
          _loading = false;
        });
      }
    }
  }

  Future<void> _trackView(String articleId) async {
    try {
      await Supabase.instance.client.from('article_views').insert({
        'article_id': articleId,
        if (Supabase.instance.client.auth.currentUser?.id != null)
          'user_id': Supabase.instance.client.auth.currentUser!.id,
      });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final reading = _reading;
    if (reading != null) return _reader(reading);

    return Scaffold(
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
                      onPressed: () => Navigator.of(context).maybePop(),
                      icon: const Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    const Expanded(
                      child: Text(
                        'Educação em saúde',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 19,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: _load,
                      icon: const Icon(Icons.refresh_rounded,
                          color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
              SizedBox(
                height: 46,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
                  children: _categories
                      .map((c) => _CatChip(
                            label: c.$2,
                            selected: _category == c.$1,
                            onTap: () {
                              setState(() => _category = c.$1);
                              _load();
                            },
                          ))
                      .toList(),
                ),
              ),
              Expanded(
                child: _loading
                    ? const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 20),
                        child: ListSkeleton(count: 4, itemHeight: 110),
                      )
                    : _error != null
                        ? EmptyState(
                            icon: Icons.wifi_off_rounded,
                            title: 'Artigos indisponíveis',
                            message: _error!,
                            actionLabel: 'Recarregar',
                            onAction: _load,
                          )
                        : (_articles?.isEmpty ?? true)
                            ? const EmptyState(
                                icon: Icons.menu_book_rounded,
                                title: 'Ainda sem artigos',
                                message:
                                    'A equipa de saúde está a preparar conteúdo para esta categoria. Volta em breve.',
                              )
                            : RefreshIndicator(
                                onRefresh: _load,
                                color: AppColors.accent,
                                child: ListView.builder(
                                  padding: const EdgeInsets.fromLTRB(
                                      20, 10, 20, 40),
                                  itemCount: _articles!.length,
                                  itemBuilder: (context, i) => _ArticleCard(
                                    article: _articles![i],
                                    onTap: () => _open(_articles![i]),
                                  ),
                                ),
                              ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _open(HealthArticle a) async {
    setState(() => _reading = a);
    _trackView(a.id);
    // Corpo completo (a lista traz só o excerpt se a BD limitar campos).
    if (a.bodyMd == null || a.bodyMd!.isEmpty) {
      try {
        final rows = await Supabase.instance.client
            .from('health_articles')
            .select('body_md')
            .eq('id', a.id)
            .limit(1);
        if (rows.isNotEmpty && mounted) {
          setState(() {
            _reading = HealthArticle.fromJson({
              'id': a.id,
              'title': a.title,
              'excerpt': a.excerpt,
              'category': a.category,
              'body_md': rows.first['body_md'],
              'cover_url': a.coverUrl,
              'author_name': a.authorName,
              'author_credentials': a.authorCredentials,
              'read_minutes': a.readMinutes,
              'is_featured': a.isFeatured,
              'views_count': a.viewsCount,
            });
          });
        }
      } catch (_) {}
    }
  }

  Widget _reader(HealthArticle a) {
    final paragraphs =
        (a.bodyMd ?? a.excerpt).split(RegExp(r'\n{2,}'));
    return Scaffold(
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
                      onPressed: () => setState(() => _reading = null),
                      icon: const Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    Expanded(
                      child: Text(
                        a.categoryLabel,
                        style: const TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(24, 12, 24, 40),
                  children: [
                    Text(
                      a.title,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 23,
                        fontWeight: FontWeight.w800,
                        height: 1.3,
                      ),
                    ).animate().fadeIn(duration: 300.ms),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 9, vertical: 4),
                          decoration: BoxDecoration(
                            color: a.categoryColor.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            a.categoryLabel,
                            style: TextStyle(
                              color: a.categoryColor,
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          '${a.readMinutes} min de leitura',
                          style: const TextStyle(
                              color: AppColors.textMuted, fontSize: 11.5),
                        ),
                      ],
                    ),
                    if (a.authorName != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        'Por ${a.authorName}'
                        '${a.authorCredentials != null ? ' · ${a.authorCredentials}' : ''}',
                        style: const TextStyle(
                            color: AppColors.textMuted, fontSize: 11.5),
                      ),
                    ],
                    const SizedBox(height: 20),
                    for (final p in paragraphs)
                      if (p.trim().isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 14),
                          child: Text(
                            p.trim().replaceAll(RegExp(r'^#+\s*'), ''),
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.78),
                              fontSize: 14.5,
                              height: 1.65,
                            ),
                          ),
                        ),
                    const SizedBox(height: 10),
                    Text(
                      'Conteúdo informativo — não substitui a consulta médica. Em emergência, usa o SOS da app ou liga 117.',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.38),
                        fontSize: 11.5,
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CatChip extends StatelessWidget {
  const _CatChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
        decoration: BoxDecoration(
          gradient: selected
              ? const LinearGradient(colors: AppColors.buttonGradient)
              : null,
          color: selected ? null : AppColors.glassFill,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? Colors.white24 : AppColors.glassBorder,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : AppColors.textSecondary,
            fontSize: 12.5,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

class _ArticleCard extends StatelessWidget {
  const _ArticleCard({required this.article, required this.onTap});

  final HealthArticle article;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final a = article;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.glassFill,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    color: a.categoryColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    a.categoryLabel,
                    style: TextStyle(
                      color: a.categoryColor,
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                const Spacer(),
                if (a.isFeatured)
                  const Icon(Icons.star_rounded,
                      color: AppColors.warning, size: 16),
                const SizedBox(width: 6),
                Text(
                  '${a.readMinutes} min',
                  style: const TextStyle(
                      color: AppColors.textMuted, fontSize: 11),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              a.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 15.5,
                fontWeight: FontWeight.w800,
                height: 1.35,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              a.excerpt,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: Colors.white.withOpacity(0.58),
                fontSize: 12.8,
                height: 1.45,
              ),
            ),
          ],
        ),
      ),
    ).animate(delay: 45.ms).fadeIn(duration: 300.ms);
  }
}
