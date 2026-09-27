import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/education_quizzes.dart';
import '../data/offline_articles.dart';

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
    this.isOffline = false,
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

  /// F35: guia embutido multilingue (renderiza na língua escolhida).
  final bool isOffline;

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

  /// Converte um guia embutido (offline) no mesmo modelo usado pela BD,
  /// para o leitor tratar as duas origens da mesma forma.
  factory HealthArticle.fromOffline(OfflineArticle o) => HealthArticle(
        id: o.id,
        title: o.titleIn('pt'),
        excerpt: o.excerptIn('pt'),
        category: o.category,
        bodyMd: o.paragraphsIn('pt').join('\n\n'),
        readMinutes: o.minutesRead,
        isOffline: true,
      );

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
/// a página /educacao da web) + guias essenciais multilingues embutidos
/// (pt, emakhuwa, tsonga, changana, sena) + quizzes Pulse points.
/// Cada leitura é contabilizada em `article_views`.
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
  String _search = '';

  // F35: língua dos guias offline + progresso Pulse
  String _lang = 'pt';
  final PulseProgress _progress = PulseProgress();
  bool _progressReady = false;

  static const _kLangPref = 'edu.lang';

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
    _loadPrefs();
  }

  Future<void> _loadPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    await _progress.load();
    if (!mounted) return;
    setState(() {
      _lang = prefs.getString(_kLangPref) ?? 'pt';
      _progressReady = true;
    });
  }

  Future<void> _setLang(String lang) async {
    setState(() => _lang = lang);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kLangPref, lang);
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

  /// Lista visível: artigos da BD (se houver rede) filtrados pela busca;
  /// em caso de falha/sem dados, os guias embutidos entram em cena.
  List<HealthArticle> get _dbVisible {
    final list = _articles ?? <HealthArticle>[];
    if (_search.isEmpty) return list;
    final q = _search.toLowerCase();
    return list
        .where((a) =>
            a.title.toLowerCase().contains(q) ||
            a.excerpt.toLowerCase().contains(q))
        .toList();
  }

  List<HealthArticle> get _offlineVisible {
    Iterable<OfflineArticle> list = kOfflineArticles;
    if (_category != null) {
      list = list.where((a) => a.category == _category);
    }
    if (_search.isNotEmpty) {
      final q = _search.toLowerCase();
      list = list.where((a) =>
          a.titleIn(_lang).toLowerCase().contains(q) ||
          a.titleIn('pt').toLowerCase().contains(q) ||
          a.excerptIn(_lang).toLowerCase().contains(q));
    }
    return list.map(HealthArticle.fromOffline).toList();
  }

  /// Título/resumo na língua escolhida (guias offline) ou original (BD).
  String _titleOf(HealthArticle a) {
    if (!a.isOffline) return a.title;
    final o = kOfflineArticles.firstWhere(
      (x) => x.id == a.id,
      orElse: () => kOfflineArticles.first,
    );
    return o.titleIn(_lang);
  }

  Future<void> _shareArticle(HealthArticle a) async {
    final link = 'https://medwalletmz.online/health/education/${a.id}';
    final text = '${_titleOf(a)}\n\n${a.excerpt}\n\n$link';
    try {
      await Clipboard.setData(ClipboardData(text: text));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Resumo e link copiados — cola onde quiseres partilhar'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (_) {}
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
                      icon: Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    Expanded(
                      child: Text(
                        'Educação em saúde',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 19,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    if (_progressReady) _PulseBadge(progress: _progress),
                    const SizedBox(width: 4),
                    IconButton(
                      onPressed: _load,
                      icon: Icon(Icons.refresh_rounded,
                          color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
              // F35: selector de língua dos guias (paridade web: 5 línguas)
              SizedBox(
                height: 40,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  children: [
                    for (final (code, label) in kEducationLanguages)
                      _LangChip(
                        label: label,
                        selected: _lang == code,
                        onTap: () => _setLang(code),
                      ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
                child: TextField(
                  onChanged: (v) => setState(() => _search = v.trim()),
                  style: TextStyle(
                      color: AppColors.textPrimary, fontSize: 13.5),
                  decoration: InputDecoration(
                    hintText: 'Buscar artigos… (malária, gravidez, TB…)',
                    hintStyle: TextStyle(
                        color: AppColors.textMuted, fontSize: 12.5),
                    prefixIcon: Icon(Icons.search_rounded,
                        color: AppColors.textMuted, size: 20),
                    isDense: true,
                    filled: true,
                    fillColor: AppColors.glassFill,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: AppColors.glassBorder),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: AppColors.glassBorder),
                    ),
                  ),
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
                    : _buildList(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Lista combinada: artigos da BD + guias embutidos (offline), com banner
  /// honesto quando estamos sem rede. Os guias ficam sempre acessíveis no fim
  /// da lista (sem busca/filtro) — educação à saúde funciona sem internet.
  Widget _buildList() {
    final db = _dbVisible;
    final offline = _offlineVisible;
    final onlyOffline = _error != null || db.isEmpty;

    if (db.isEmpty && offline.isEmpty) {
      return ListView(
        children: [
          EmptyState(
            icon: Icons.menu_book_rounded,
            title: 'Ainda sem artigos',
            message:
                'A equipa de saúde está a preparar conteúdo para esta categoria. Volta em breve.',
          ),
        ],
      );
    }

    final children = <Widget>[];
    if (_error != null) {
      children.add(Container(
        margin: const EdgeInsets.fromLTRB(20, 12, 20, 4),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.warning.withOpacity(0.12),
          borderRadius: BorderRadius.circular(14),
          border:
              Border.all(color: AppColors.warning.withOpacity(0.4)),
        ),
        child: Row(
          children: [
            Icon(Icons.wifi_off_rounded, color: AppColors.warning, size: 18),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Sem internet — a mostrar os guias essenciais incluídos na app.',
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 12,
                  height: 1.4,
                ),
              ),
            ),
          ],
        ),
      ));
    }
    children.addAll([
      for (final a in db)
        _ArticleCard(
          article: a,
          lang: _lang,
          read: _progress.readIds.contains(a.id),
          onTap: () => _open(a),
        ),
    ]);
    if (offline.isNotEmpty &&
        (onlyOffline || (_search.isEmpty && _category == null))) {
      if (!onlyOffline) {
        children.add(Padding(
          padding: const EdgeInsets.fromLTRB(0, 14, 0, 4),
          child: Row(
            children: [
              Icon(Icons.download_for_offline_outlined,
                  color: AppColors.accent, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Guias essenciais · sempre disponíveis · ${kEducationLanguages.map((e) => e.$2).join(' · ')}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
        ));
      }
      children.addAll([
        for (final a in offline)
          _ArticleCard(
            article: a,
            lang: _lang,
            read: _progress.readIds.contains(a.id),
            onTap: () => _open(a),
          ),
      ]);
    }
    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.accent,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 40),
        children: children,
      ),
    );
  }

  Future<void> _open(HealthArticle a) async {
    setState(() => _reading = a);
    _trackView(a.id);
    if (_progressReady) {
      await _progress.markRead(a.id);
      if (mounted) setState(() {});
    }
    // Corpo completo (a lista traz só o excerpt se a BD limitar campos).
    if (!a.isOffline && (a.bodyMd == null || a.bodyMd!.isEmpty)) {
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
    final paragraphs = _readerParagraphs(a);
    final quiz = quizFor(a.id);
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
                      icon: Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    Expanded(
                      child: Text(
                        a.categoryLabel,
                        style: TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: () => _shareArticle(a),
                      icon: Icon(Icons.ios_share_rounded,
                          color: AppColors.textSecondary, size: 20),
                      tooltip: 'Partilhar',
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(24, 12, 24, 40),
                  children: [
                    Text(
                      _titleOf(a),
                      style: TextStyle(
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
                          style: TextStyle(
                              color: AppColors.textMuted, fontSize: 11.5),
                        ),
                        if (a.isOffline) ...[
                          const SizedBox(width: 10),
                          Icon(Icons.wifi_off_rounded,
                              color: AppColors.textMuted, size: 13),
                        ],
                      ],
                    ),
                    if (a.authorName != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        'Por ${a.authorName}'
                        '${a.authorCredentials != null ? ' · ${a.authorCredentials}' : ''}',
                        style: TextStyle(
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
                              color: AppColors.textSecondary,
                              fontSize: 14.5,
                              height: 1.65,
                            ),
                          ),
                        ),
                    if (quiz != null) ...[
                      const SizedBox(height: 8),
                      _QuizCard(
                        quiz: quiz,
                        progress: _progress,
                        onScored: () => setState(() {}),
                      ),
                    ],
                    const SizedBox(height: 10),
                    Text(
                      'Conteúdo informativo — não substitui a consulta médica. Em emergência, usa o SOS da app ou liga 117.',
                      style: TextStyle(
                        color: AppColors.textMuted,
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

  /// Parágrafos na língua escolhida para guias offline; conteúdo BD original.
  List<String> _readerParagraphs(HealthArticle a) {
    if (!a.isOffline) return (a.bodyMd ?? a.excerpt).split(RegExp(r'\n{2,}'));
    final o = kOfflineArticles.firstWhere(
      (x) => x.id == a.id,
      orElse: () => kOfflineArticles.first,
    );
    return o.paragraphsIn(_lang);
  }
}

/// ── Widgets privados ─────────────────────────────────────────────────

/// Chip de língua (selector F35).
class _LangChip extends StatelessWidget {
  const _LangChip({
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
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          gradient: selected
              ? LinearGradient(colors: AppColors.buttonGradient)
              : null,
          color: selected ? null : AppColors.glassFill,
          borderRadius: BorderRadius.circular(11),
          border: Border.all(
            color: selected ? Colors.white24 : AppColors.glassBorder,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : AppColors.textSecondary,
            fontSize: 11.5,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

/// Badge de pontos Pulse no cabeçalho.
class _PulseBadge extends StatelessWidget {
  const _PulseBadge({required this.progress});

  final PulseProgress progress;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.accent.withOpacity(0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.accent.withOpacity(0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.bolt_rounded, color: AppColors.accent, size: 15),
          const SizedBox(width: 3),
          Text(
            '${progress.points}',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 12.5,
              fontWeight: FontWeight.w800,
            ),
          ),
          if (progress.streakDays > 1) ...[
            const SizedBox(width: 6),
            Text(
              '🔥${progress.streakDays}',
              style: const TextStyle(fontSize: 11),
            ),
          ],
        ],
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
              ? LinearGradient(colors: AppColors.buttonGradient)
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
  const _ArticleCard({
    required this.article,
    required this.lang,
    required this.read,
    required this.onTap,
  });

  final HealthArticle article;
  final String lang;
  final bool read;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final a = article;
    // Guias offline: localizar título/resumo na língua escolhida.
    String title = a.title;
    String excerpt = a.excerpt;
    if (a.isOffline) {
      final o = kOfflineArticles.firstWhere(
        (x) => x.id == a.id,
        orElse: () => kOfflineArticles.first,
      );
      title = o.titleIn(lang);
      excerpt = o.excerptIn(lang);
    }
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
                if (quizFor(a.id) != null) ...[
                  Icon(Icons.bolt_rounded,
                      color: AppColors.accent, size: 15),
                  const SizedBox(width: 4),
                ],
                if (read)
                  Icon(Icons.check_circle_rounded,
                      color: AppColors.success, size: 16)
                else if (a.isFeatured)
                  Icon(Icons.star_rounded,
                      color: AppColors.warning, size: 16),
                const SizedBox(width: 6),
                Text(
                  '${a.readMinutes} min',
                  style: TextStyle(
                      color: AppColors.textMuted, fontSize: 11),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: AppColors.textPrimary,
                fontSize: 15.5,
                fontWeight: FontWeight.w800,
                height: 1.35,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              excerpt,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: AppColors.textSecondary,
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

/// F35 — Quiz "Pulse points" no fim do leitor.
class _QuizCard extends StatefulWidget {
  const _QuizCard({
    required this.quiz,
    required this.progress,
    required this.onScored,
  });

  final ArticleQuiz quiz;
  final PulseProgress progress;
  final VoidCallback onScored;

  @override
  State<_QuizCard> createState() => _QuizCardState();
}

class _QuizCardState extends State<_QuizCard> {
  int _index = 0;
  int _correct = 0;
  int? _picked;
  bool _finished = false;
  bool _recorded = false;

  void _pick(int i) {
    if (_picked != null) return;
    setState(() => _picked = i);
    if (i == widget.quiz.questions[_index].correct) _correct++;
  }

  void _next() {
    if (_index + 1 < widget.quiz.questions.length) {
      setState(() {
        _index++;
        _picked = null;
      });
    } else {
      setState(() => _finished = true);
    }
  }

  Future<void> _record() async {
    if (_recorded) return;
    _recorded = true;
    await widget.progress.recordQuiz(widget.quiz.articleId, _correct);
    widget.onScored();
  }

  void _restart() {
    setState(() {
      _index = 0;
      _correct = 0;
      _picked = null;
      _finished = false;
      _recorded = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final accent = AppColors.accent;
    if (_finished) {
      _record();
      final total = widget.quiz.questions.length;
      final best = widget.progress.quizBest[widget.quiz.articleId] ?? 0;
      return Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppColors.glassFill,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: accent.withOpacity(0.4)),
        ),
        child: Column(
          children: [
            Icon(Icons.bolt_rounded, color: accent, size: 34),
            const SizedBox(height: 6),
            Text(
              '$_correct/$total certas · +${_correct * kPointsPerCorrect} Pulse points',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppColors.textPrimary,
                fontSize: 16,
                fontWeight: FontWeight.w800,
              ),
            ),
            if (best >= _correct && best > 0) ...[
              const SizedBox(height: 4),
              Text(
                'Melhor pontuação: $best/$total',
                style: TextStyle(
                    color: AppColors.textMuted, fontSize: 12),
              ),
            ],
            const SizedBox(height: 14),
            OutlinedButton.icon(
              onPressed: _restart,
              icon: Icon(Icons.refresh_rounded, size: 17, color: accent),
              label: Text('Tentar outra vez',
                  style: TextStyle(color: accent)),
            ),
          ],
        ),
      ).animate().fadeIn(duration: 300.ms);
    }

    final q = widget.quiz.questions[_index];
    return Container(
      padding: const EdgeInsets.all(18),
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
              Icon(Icons.bolt_rounded, color: accent, size: 17),
              const SizedBox(width: 6),
              Text(
                'Quiz · Pulse points  (${_index + 1}/${widget.quiz.questions.length})',
                style: TextStyle(
                  color: accent,
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            q.prompt,
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 15,
              fontWeight: FontWeight.w800,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 12),
          for (var i = 0; i < q.options.length; i++)
            _OptionTile(
              label: q.options[i],
              state: _picked == null
                  ? _OptionState.idle
                  : i == q.correct
                      ? _OptionState.correct
                      : i == _picked
                          ? _OptionState.wrong
                          : _OptionState.dim,
              onTap: () => _pick(i),
            ),
          if (_picked != null) ...[
            const SizedBox(height: 10),
            Text(
              q.explain,
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 12.5,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _next,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                ),
                child: Text(
                  _index + 1 < widget.quiz.questions.length
                      ? 'Próxima pergunta'
                      : 'Ver resultado',
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

enum _OptionState { idle, correct, wrong, dim }

class _OptionTile extends StatelessWidget {
  const _OptionTile({
    required this.label,
    required this.state,
    required this.onTap,
  });

  final String label;
  final _OptionState state;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    Color border = AppColors.glassBorder;
    Color? fill = AppColors.glassFill;
    Color text = AppColors.textSecondary;
    IconData? icon;
    Color? iconColor;
    switch (state) {
      case _OptionState.idle:
        break;
      case _OptionState.correct:
        border = AppColors.success;
        text = AppColors.textPrimary;
        icon = Icons.check_circle_rounded;
        iconColor = AppColors.success;
        break;
      case _OptionState.wrong:
        border = AppColors.danger;
        text = AppColors.textPrimary;
        icon = Icons.cancel_rounded;
        iconColor = AppColors.danger;
        break;
      case _OptionState.dim:
        text = AppColors.textMuted;
        fill = null;
        break;
    }
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: fill,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: border),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: TextStyle(color: text, fontSize: 13.5, height: 1.35),
              ),
            ),
            if (icon != null) ...[
              const SizedBox(width: 8),
              Icon(icon, color: iconColor, size: 17),
            ],
          ],
        ),
      ),
    );
  }
}
