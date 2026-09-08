import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/theme/app_colors.dart';
import '../data/manager_models.dart';

/// Folha do Meddy Copilot — assistente IA de gestão (Edge Function
/// `meddy-copilot`). Recebe um snapshot de contexto (países, KPIs,
/// propostas…) e responde em Markdown com análise e recomendações.
class MeddyCopilotSheet extends StatefulWidget {
  const MeddyCopilotSheet({
    super.key,
    required this.buildContext,
    this.suggestions = const [
      'Que países precisam de mais instituições?',
      'Resume o desempenho actual e riscos.',
      'Que acções recomendadas para esta semana?',
    ],
  });

  /// Snapshot de contexto no formato esperado pela função.
  final Map<String, dynamic> Function() buildContext;
  final List<String> suggestions;

  static Future<void> show(
    BuildContext context, {
    required Map<String, dynamic> Function() buildContext,
    List<String> suggestions = const [
      'Que países precisam de mais instituições?',
      'Resume o desempenho actual e riscos.',
      'Que acções recomendadas para esta semana?',
    ],
  }) {
    return showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => MeddyCopilotSheet(
        buildContext: buildContext,
        suggestions: suggestions,
      ),
    );
  }

  @override
  State<MeddyCopilotSheet> createState() => _MeddyCopilotSheetState();
}

class _MeddyCopilotSheetState extends State<MeddyCopilotSheet> {
  final _controller = TextEditingController();
  final _scroll = ScrollController();
  final _messages = <_Msg>[];
  bool _loading = false;

  Future<void> _ask(String query) async {
    if (query.trim().isEmpty || _loading) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _messages.add(_Msg(query, true));
      _loading = true;
    });
    _controller.clear();
    _jumpBottom();

    String? answer;
    try {
      final res = await Supabase.instance.client.functions.invoke(
        'meddy-copilot',
        body: {
          'query': query.trim(),
          'context': widget.buildContext(),
          'user_scope': 'manager_mobile',
        },
      );
      final data = res.data;
      if (data is Map) {
        answer = (data['response'] ?? data['answer'])?.toString();
      } else if (data is String && data.isNotEmpty) {
        answer = data;
      }
      answer ??= 'Não consegui obter uma resposta — tenta de novo.';
    } catch (_) {
      answer = 'Falha ao contactar o Meddy Copilot. Verifica a ligação '
          'e se a Edge Function `meddy-copilot` está publicada.';
    }
    if (!mounted) return;
    setState(() {
      _messages.add(_Msg(answer!, false));
      _loading = false;
    });
    _jumpBottom();
  }

  void _jumpBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent + 240,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOutCubic,
      );
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        height: MediaQuery.of(context).size.height * 0.82,
        decoration: const BoxDecoration(
          gradient:
              LinearGradient(colors: [AppColors.bgHigh, AppColors.bgDeep]),
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          children: [
            const SizedBox(height: 12),
            Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [
                        Color(0xFF38BDF8),
                        Color(0xFF1E6B9C),
                      ]),
                      borderRadius: BorderRadius.circular(13),
                    ),
                    child: const Icon(Icons.auto_awesome_rounded,
                        color: Colors.white, size: 21),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Meddy Copilot · IA de gestão',
                          style: TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w800,
                            fontSize: 15.5,
                          ),
                        ),
                        Text(
                          'Analisa os dados dos teus painéis e recomenda '
                          'acções. Não dá conselhos médicos.',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 11.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const Divider(color: AppColors.glassBorder, height: 1),
            Expanded(
              child: _messages.isEmpty
                  ? ListView(
                      padding: const EdgeInsets.all(20),
                      children: [
                        const EmptyHint(),
                        const SizedBox(height: 16),
                        for (final s in widget.suggestions) ...[
                          _SuggestionChip(
                              label: s, onTap: () => _ask(s)),
                          const SizedBox(height: 8),
                        ],
                      ],
                    )
                  : ListView.builder(
                      controller: _scroll,
                      padding: const EdgeInsets.all(16),
                      itemCount: _messages.length + (_loading ? 1 : 0),
                      itemBuilder: (context, i) {
                        if (i == _messages.length) {
                          return const _TypingBubble();
                        }
                        return _Bubble(msg: _messages[i]);
                      },
                    ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              decoration: const BoxDecoration(
                color: Color(0x660B1D31),
                border: Border(top: BorderSide(color: AppColors.glassBorder)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      minLines: 1,
                      maxLines: 4,
                      textInputAction: TextInputAction.send,
                      onSubmitted: _ask,
                      style: const TextStyle(
                          color: AppColors.textPrimary, fontSize: 13.5),
                      decoration: InputDecoration(
                        hintText: 'Pergunta sobre os teus dados…',
                        hintStyle: TextStyle(
                            color: Colors.white.withOpacity(0.35),
                            fontSize: 13),
                        filled: true,
                        fillColor: const Color(0x1AFFFFFF),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 10),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  _loading
                      ? const SizedBox(
                          width: 44,
                          height: 44,
                          child: Padding(
                            padding: EdgeInsets.all(10),
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: AppColors.accent),
                          ),
                        )
                      : IconButton.filled(
                          style: IconButton.styleFrom(
                            backgroundColor: const Color(0xFF1E6B9C),
                          ),
                          onPressed: () => _ask(_controller.text),
                          icon: const Icon(Icons.send_rounded,
                              color: Colors.white, size: 20),
                        ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Msg {
  const _Msg(this.text, this.fromUser);
  final String text;
  final bool fromUser;
}

class EmptyHint extends StatelessWidget {
  const EmptyHint({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: const Text(
        'Pergunta em linguagem natural sobre os dados de gestão: '
        'crescimento por país, submissões pendentes, pagamentos, '
        'metas. O Meddy analisa o snapshot actual e responde com '
        'números concretos e acções recomendadas.',
        style: TextStyle(
          color: AppColors.textSecondary,
          fontSize: 12.5,
          height: 1.5,
        ),
      ),
    );
  }
}

class _SuggestionChip extends StatelessWidget {
  const _SuggestionChip({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      backgroundColor: const Color(0x1F38BDF8),
      side: const BorderSide(color: Color(0x4D38BDF8)),
      label: Text(
        label,
        style: const TextStyle(color: Color(0xFF7DD3FC), fontSize: 12.5),
      ),
      onPressed: onTap,
    );
  }
}

class _TypingBubble extends StatelessWidget {
  const _TypingBubble();

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.glassFill,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (i) {
            return Container(
              width: 7,
              height: 7,
              margin: const EdgeInsets.only(right: 5),
              decoration: const BoxDecoration(
                color: AppColors.accent,
                shape: BoxShape.circle,
              ),
            )
                .animate(onPlay: (c) => c.repeat(reverse: true))
                .fadeOut(
                  delay: (120 * i).ms,
                  duration: 500.ms,
                );
          }),
        ),
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.msg});

  final _Msg msg;

  @override
  Widget build(BuildContext context) {
    final fromUser = msg.fromUser;
    return Align(
      alignment: fromUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.78,
        ),
        decoration: BoxDecoration(
          color: fromUser
              ? const Color(0x331E6B9C)
              : AppColors.glassFill,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: const Radius.circular(18),
            bottomLeft: Radius.circular(fromUser ? 18 : 6),
            bottomRight: Radius.circular(fromUser ? 6 : 18),
          ),
          border: Border.all(
              color: fromUser
                  ? const Color(0x4D1E6B9C)
                  : AppColors.glassBorder),
        ),
        child: fromUser
            ? Text(
                msg.text,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 13.5,
                  height: 1.45,
                ),
              )
            : MarkdownBody(
                data: msg.text,
                selectable: true,
                styleSheet: MarkdownStyleSheet(
                  p: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 13,
                    height: 1.5,
                  ),
                  strong: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                  ),
                  listItemBullet: const TextStyle(color: AppColors.accent),
                  h2: const TextStyle(
                    color: Colors.white,
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                  ),
                  tableBorder: TableBorder.all(
                      color: AppColors.glassBorder, width: 0.5),
                  tableHead: const TextStyle(
                      color: Colors.white, fontWeight: FontWeight.w700),
                  tableCell: const TextStyle(
                      color: AppColors.textPrimary, fontSize: 12),
                ),
              ),
      ),
    );
  }
}

/// Constrói o snapshot de contexto a partir de países + stats +
/// contagens, no formato que o `meddy-copilot` espera.
Map<String, dynamic> buildManagerContext({
  required List<CountryFull> countries,
  Map<String, CountryStats> stats = const {},
  String? focusCountry,
}) {
  final countryList = [
    for (final c in countries)
      {
        'id': c.id,
        'name': c.name,
        'currency': c.currencyCode,
        'commission_rates': c.commissionRates,
        if (focusCountry == c.id) 'focus': true,
        if (stats[c.id] != null)
          'metrics': {
            'users': stats[c.id]!.users,
            'institutions': stats[c.id]!.institutions,
            'stores': stats[c.id]!.stores,
            'clinics': stats[c.id]!.clinics,
            'veterinaries': stats[c.id]!.veterinaries,
            'consultations': stats[c.id]!.consultations,
            'triages': stats[c.id]!.triages,
            'proposals_pending': stats[c.id]!.pendingProposals,
            'proposals_approved': stats[c.id]!.approvedProposals,
            'payments_pending': stats[c.id]!.pendingPayments,
            'sos_active': stats[c.id]!.activeSos,
          },
      },
  ];
  return {
    'scope': focusCountry ?? 'global',
    'generated_at': DateTime.now().toIso8601String(),
    'countries': countryList,
    'frameworks': const [],
    'partners': const [],
    'audit_recent': const [],
    'insurance_products': const [],
    'insurance_claims': const [],
  };
}
