/// F35 — Quizzes "Pulse points" da Educação em Saúde.
///
/// 3 perguntas por guia essencial (mesmo conteúdo clínico dos artigos,
/// protocolos MISAU/OMS). 10 pontos por resposta certa. Progresso
/// (pontos, guias lidos, melhor pontuação por quiz) persistido em
/// SharedPreferences — sobrevive a reinícios e funciona offline.
library;

import 'package:shared_preferences/shared_preferences.dart';

class QuizQuestion {
  const QuizQuestion({
    required this.prompt,
    required this.options,
    required this.correct,
    required this.explain,
  });

  final String prompt;
  final List<String> options;
  final int correct;
  final String explain;
}

class ArticleQuiz {
  const ArticleQuiz({required this.articleId, required this.questions});

  final String articleId;
  final List<QuizQuestion> questions;
}

const int kPointsPerCorrect = 10;

const List<ArticleQuiz> kArticleQuizzes = [
  ArticleQuiz(articleId: 'malaria-sintomas-tratamento', questions: [
    QuizQuestion(
      prompt: 'Quando deves fazer o teste rápido (RDT) da malária?',
      options: [
        'Assim que aparecer febre ou calafrios',
        'Só depois de 1 semana de dores',
        'Nunca — a malária cura-se sozinha',
      ],
      correct: 0,
      explain:
          'O RDT é gratuito no SNS e dá resultado em 15 minutos — quanto mais cedo testar, mais cedo trata.',
    ),
    QuizQuestion(
      prompt: 'O tratamento ACT (Artemeter-Lumefantrina) dura:',
      options: ['1 dia', '3 dias — e deves completar TODOS os comprimidos', '7 dias'],
      correct: 1,
      explain:
          'Parar ao 2º dia (quando os sintomas passam) faz o parasita voltar mais forte e resistente.',
    ),
    QuizQuestion(
      prompt: 'Qual destas práticas previne a malária?',
      options: [
        'Dormir debaixo de rede mosquiteira tratada (ITN)',
        'Beber água com sal',
        'Tomar banho com água fria',
      ],
      correct: 0,
      explain:
          'A rede tratada (ITN) todas as noites é o pilar nº 1 da prevenção, junto com eliminar águas estagnadas.',
    ),
  ]),
  ArticleQuiz(articleId: 'tb-sintomas-tratamento', questions: [
    QuizQuestion(
      prompt: 'Tosse há mais de 2 semanas pode ser sinal de:',
      options: [
        'Tuberculose — faz o teste de escarro',
        'Fome',
        'Má digestão',
      ],
      correct: 0,
      explain:
          'Tosse persistente + suores nocturnos + perda de peso = procura o SNS. O teste (BAAR/GeneXpert) é gratuito.',
    ),
    QuizQuestion(
      prompt: 'O tratamento DOTS da TB dura:',
      options: ['6 meses e é gratuito', '2 dias', '1 ano e é pago'],
      correct: 0,
      explain:
          '2 meses com 4 fármacos + 4 meses com 2. Completar é CRUCIAL — interromper cria TB-MDR (2 anos de tratamento).',
    ),
    QuizQuestion(
      prompt: 'Se tens TB e também VIH, o que deves fazer?',
      options: [
        'Esconder a condição',
        'Iniciar ARV dentro de 2 semanas do tratamento da TB',
        'Parar o tratamento da TB',
      ],
      correct: 1,
      explain:
          'O tratamento conjunto reduz a mortalidade em 60%. Todos os pacientes de TB devem testar o VIH.',
    ),
  ]),
  ArticleQuiz(articleId: 'gravidez-cuidados-pre-natais', questions: [
    QuizQuestion(
      prompt: 'Quantas consultas pré-natais são o mínimo garantido pelo MISAU?',
      options: ['1', '4', '10'],
      correct: 1,
      explain:
          'Mínimo de 4 consultas (8-12, 20-24, 28-32 e 36-40 semanas). A OMS recomenda 8 contactos.',
    ),
    QuizQuestion(
      prompt: 'Dor de cabeça intensa com visão turva na gravidez pode ser:',
      options: [
        'Pré-eclâmpsia — mede a pressão já!',
        'Fome normal',
        'Cansaço sem importância',
      ],
      correct: 0,
      explain:
          'Pressão ≥140/90 com proteínas na urina após a 20ª semana. Sem tratamento evolui para eclâmpsia, que mata em horas.',
    ),
    QuizQuestion(
      prompt: 'Que suplementos a grávida recebe grátis nas consultas?',
      options: [
        'Ferro + ácido fólico',
        'Analgésicos fortes',
        'Antibióticos diários',
      ],
      correct: 0,
      explain:
          'Ferro + ácido fólico previnem anemia e defeitos do tubo neural. Distribuídos nas consultas pré-natais.',
    ),
  ]),
  ArticleQuiz(articleId: 'arv-adesao-tratamento', questions: [
    QuizQuestion(
      prompt: 'O TLD toma-se:',
      options: [
        'Todos os dias, à mesma hora',
        'Só quando te sentes doente',
        'Uma vez por semana',
      ],
      correct: 0,
      explain:
          '1 comprimido por dia, à mesma hora. Esquecer regularmente cria RESISTÊNCIA e obriga a regimes de 2ª linha.',
    ),
    QuizQuestion(
      prompt: 'Carga viral INDETECTÁVEL (<50 cópias/mL) significa:',
      options: [
        'U=U — não transmites o VIH sexualmente',
        'Que o VIH foi curado',
        'Que podes parar os ARV',
      ],
      correct: 0,
      explain:
          'Indetectável = Intransmissível. O tratamento funciona, o sistema imunitário recupera — mas NUNCA pares.',
    ),
    QuizQuestion(
      prompt: 'O que são os GAAM?',
      options: [
        'Grupos de ajuda mútua que se revezam para buscar medicação',
        'Um tipo de medicamento',
        'Exames laboratoriais',
      ],
      correct: 0,
      explain:
          'Grupos de 6-12 pessoas que se revezam para ir buscar medicação mensalmente, poupando viagens.',
    ),
  ]),
  ArticleQuiz(articleId: 'nutricao-crianca-1000-dias', questions: [
    QuizQuestion(
      prompt: 'Aleitamento materno EXCLUSIVO até:',
      options: ['6 meses — sem água nem chá', '1 mês', '2 anos só com papas'],
      correct: 0,
      explain:
          'Até aos 6 meses SÓ leite materno — tem anticorpos que protegem de diarreias e pneumonias.',
    ),
    QuizQuestion(
      prompt: 'Os primeiros 1000 dias são críticos porque:',
      options: [
        'A desnutrição nesse período causa danos irreversíveis',
        'O bebé só precisa de leite estrangeiro',
        'É quando se dão todas as vacinas',
      ],
      correct: 0,
      explain:
        'Da concepção aos 2 anos: desnutrição = baixa estatura, QI reduzido e mais doenças crónicas na vida adulta.',
    ),
    QuizQuestion(
      prompt: 'Sinal de desnutrição aguda que exige hospital:',
      options: [
        'Edema bilateral nos pés (kwashiorkor)',
        'Bebé activo e barulhento',
        'Sono tranquilo',
      ],
      correct: 0,
      explain:
          'Edema nos pés + apatia + perda de apetite = procura já o SNS. Tratamento gratuito com Plumpy\'Nut (RUTF).',
    ),
  ]),
  ArticleQuiz(articleId: 'hipertensao-diabetes-cronicos', questions: [
    QuizQuestion(
      prompt: 'Valores de tensão considerados hipertensão:',
      options: ['≥140/90 mmHg', '100/60 mmHg', '90/60 mmHg'],
      correct: 0,
      explain:
          '≥140/90 = hipertensão. Normal <130/80. Mede a pressão 1×/ano após os 40 anos — é SILENCIOSA.',
    ),
    QuizQuestion(
      prompt: 'Os "3 Ps" do diabetes são:',
      options: [
        'Muita sede, muita urina, muita fome',
        'Paz, amor e alegria',
        'Febre, tosse e espirros',
      ],
      correct: 0,
      explain:
          'Polidipsia + Poliúria + Polifagia, com perda de peso inexplicada. Glicemia em jejum ≥126 mg/dL = diabetes.',
    ),
    QuizQuestion(
      prompt: 'Hábito que reduz muito o risco de DCNT:',
      options: [
        'Caminhar 30 min/dia e reduzir o sal para <5g',
        'Fumar só aos fins-de-semana',
        'Dormir 4 horas',
      ],
      correct: 0,
      explain:
          'Pequenos hábitos (5 porções de fruta/vegetais, 30 min de caminhada, <5g de sal) reduzem o risco em 80%.',
    ),
  ]),
];

ArticleQuiz? quizFor(String articleId) {
  for (final q in kArticleQuizzes) {
    if (q.articleId == articleId) return q;
  }
  return null;
}

/// ── Progresso persistido ─────────────────────────────────────────────
class PulseProgress {
  PulseProgress({
    this.points = 0,
    this.readIds = const {},
    this.quizBest = const {},
    this.streakDays = 0,
    this.lastReadDay,
  });

  int points;
  Set<String> readIds;
  Map<String, int> quizBest;
  int streakDays;
  String? lastReadDay;

  static const _kPoints = 'edu.pulse.points';
  static const _kRead = 'edu.pulse.read';
  static const _kQuiz = 'edu.pulse.quiz';
  static const _kStreak = 'edu.pulse.streak';
  static const _kLastDay = 'edu.pulse.lastday';

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    points = prefs.getInt(_kPoints) ?? 0;
    readIds = (prefs.getStringList(_kRead) ?? const []).toSet();
    quizBest = {
      for (final e in (prefs.getStringList(_kQuiz) ?? const <String>[]))
        e.split(':').first: int.tryParse(e.split(':').last) ?? 0,
    };
    streakDays = prefs.getInt(_kStreak) ?? 0;
    lastReadDay = prefs.getString(_kLastDay);
  }

  Future<void> _save() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_kPoints, points);
    await prefs.setStringList(_kRead, readIds.toList());
    await prefs.setStringList(
        _kQuiz, [for (final e in quizBest.entries) '${e.key}:${e.value}']);
    await prefs.setInt(_kStreak, streakDays);
    if (lastReadDay != null) await prefs.setString(_kLastDay, lastReadDay!);
  }

  static String _today() {
    final n = DateTime.now();
    return '${n.year}-${n.month.toString().padLeft(2, '0')}-${n.day.toString().padLeft(2, '0')}';
  }

  /// Marca leitura + actualiza streak diário.
  Future<void> markRead(String articleId) async {
    readIds.add(articleId);
    final today = _today();
    if (lastReadDay != today) {
      final yesterday = DateTime.now().subtract(const Duration(days: 1));
      final yStr =
          '${yesterday.year}-${yesterday.month.toString().padLeft(2, '0')}-${yesterday.day.toString().padLeft(2, '0')}';
      streakDays = lastReadDay == yStr ? streakDays + 1 : 1;
      lastReadDay = today;
    }
    if (streakDays == 0) streakDays = 1;
    await _save();
    // retornos via campos; isNew útil para animações futuras
  }

  /// Regista score de quiz; devolve pontos ganhos nesta sessão.
  Future<int> recordQuiz(String articleId, int correctCount) async {
    final gained = correctCount * kPointsPerCorrect;
    points += gained;
    final prev = quizBest[articleId] ?? 0;
    if (correctCount > prev) quizBest[articleId] = correctCount;
    await _save();
    return gained;
  }
}
