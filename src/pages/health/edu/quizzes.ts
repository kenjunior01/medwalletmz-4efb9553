/**
 * src/pages/health/edu/quizzes.ts
 * ────────────────────────────────────────────────────────────────────
 * F35 — Quizzes "Pulse points" da Educação em Saúde (paridade com o APK:
 * apps/mobile/lib/features/health_hub/data/education_quizzes.dart).
 *
 * 3 perguntas por guia essencial (mesmo conteúdo clínico dos artigos,
 * protocolos MISAU/OMS). 10 pontos por resposta certa.
 * Progresso persistido em localStorage: pontos, guias lidos, melhor
 * pontuação por quiz e streak diário de leitura.
 */

export interface QuizQuestion {
  prompt: string;
  options: string[];
  correct: number;
  explain: string;
}

export interface ArticleQuiz {
  articleId: string;
  questions: QuizQuestion[];
}

export const POINTS_PER_CORRECT = 10;

export const ARTICLE_QUIZZES: ArticleQuiz[] = [
  {
    articleId: 'malaria-sintomas-tratamento',
    questions: [
      {
        prompt: 'Quando deves fazer o teste rápido (RDT) da malária?',
        options: [
          'Assim que aparecer febre ou calafrios',
          'Só depois de 1 semana de dores',
          'Nunca — a malária cura-se sozinha',
        ],
        correct: 0,
        explain:
          'O RDT é gratuito no SNS e dá resultado em 15 minutos — quanto mais cedo testar, mais cedo trata.',
      },
      {
        prompt: 'O tratamento ACT (Artemeter-Lumefantrina) dura:',
        options: ['1 dia', '3 dias — e deves completar TODOS os comprimidos', '7 dias'],
        correct: 1,
        explain:
          'Parar ao 2º dia (quando os sintomas passam) faz o parasita voltar mais forte e resistente.',
      },
      {
        prompt: 'Qual destas práticas previne a malária?',
        options: [
          'Dormir debaixo de rede mosquiteira tratada (ITN)',
          'Beber água com sal',
          'Tomar banho com água fria',
        ],
        correct: 0,
        explain:
          'A rede tratada (ITN) todas as noites é o pilar nº 1 da prevenção, junto com eliminar águas estagnadas.',
      },
    ],
  },
  {
    articleId: 'tb-sintomas-tratamento',
    questions: [
      {
        prompt: 'Tosse há mais de 2 semanas pode ser sinal de:',
        options: ['Tuberculose — faz o teste de escarro', 'Fome', 'Má digestão'],
        correct: 0,
        explain:
          'Tosse persistente + suores nocturnos + perda de peso = procura o SNS. O teste (BAAR/GeneXpert) é gratuito.',
      },
      {
        prompt: 'O tratamento DOTS da TB dura:',
        options: ['6 meses e é gratuito', '2 dias', '1 ano e é pago'],
        correct: 0,
        explain:
          '2 meses com 4 fármacos + 4 meses com 2. Completar é CRUCIAL — interromper cria TB-MDR (2 anos de tratamento).',
      },
      {
        prompt: 'Se tens TB e também VIH, o que deves fazer?',
        options: [
          'Esconder a condição',
          'Iniciar ARV dentro de 2 semanas do tratamento da TB',
          'Parar o tratamento da TB',
        ],
        correct: 1,
        explain:
          'O tratamento conjunto reduz a mortalidade em 60%. Todos os pacientes de TB devem testar o VIH.',
      },
    ],
  },
  {
    articleId: 'gravidez-cuidados-pre-natais',
    questions: [
      {
        prompt: 'Quantas consultas pré-natais são o mínimo garantido pelo MISAU?',
        options: ['1', '4', '10'],
        correct: 1,
        explain:
          'Mínimo de 4 consultas (8-12, 20-24, 28-32 e 36-40 semanas). A OMS recomenda 8 contactos.',
      },
      {
        prompt: 'Dor de cabeça intensa com visão turva na gravidez pode ser:',
        options: [
          'Pré-eclâmpsia — mede a pressão já!',
          'Fome normal',
          'Cansaço sem importância',
        ],
        correct: 0,
        explain:
          'Pressão ≥140/90 com proteínas na urina após a 20ª semana. Sem tratamento evolui para eclâmpsia, que mata em horas.',
      },
      {
        prompt: 'Que suplementos a grávida recebe grátis nas consultas?',
        options: ['Ferro + ácido fólico', 'Analgésicos fortes', 'Antibióticos diários'],
        correct: 0,
        explain:
          'Ferro + ácido fólico previnem anemia e defeitos do tubo neural. Distribuídos nas consultas pré-natais.',
      },
    ],
  },
  {
    articleId: 'arv-adesao-tratamento',
    questions: [
      {
        prompt: 'O TLD toma-se:',
        options: ['Todos os dias, à mesma hora', 'Só quando te sentes doente', 'Uma vez por semana'],
        correct: 0,
        explain:
          '1 comprimido por dia, à mesma hora. Esquecer regularmente cria RESISTÊNCIA e obriga a regimes de 2ª linha.',
      },
      {
        prompt: 'Carga viral INDETECTÁVEL (<50 cópias/mL) significa:',
        options: [
          'U=U — não transmites o VIH sexualmente',
          'Que o VIH foi curado',
          'Que podes parar os ARV',
        ],
        correct: 0,
        explain:
          'Indetectável = Intransmissível. O tratamento funciona, o sistema imunitário recupera — mas NUNCA pares.',
      },
      {
        prompt: 'O que são os GAAM?',
        options: [
          'Grupos de ajuda mútua que se revezam para buscar medicação',
          'Um tipo de medicamento',
          'Exames laboratoriais',
        ],
        correct: 0,
        explain:
          'Grupos de 6-12 pessoas que se revezam para ir buscar medicação mensalmente, poupando viagens.',
      },
    ],
  },
  {
    articleId: 'nutricao-crianca-1000-dias',
    questions: [
      {
        prompt: 'Aleitamento materno EXCLUSIVO até:',
        options: ['6 meses — sem água nem chá', '1 mês', '2 anos só com papas'],
        correct: 0,
        explain:
          'Até aos 6 meses SÓ leite materno — tem anticorpos que protegem de diarreias e pneumonias.',
      },
      {
        prompt: 'Os primeiros 1000 dias são críticos porque:',
        options: [
          'A desnutrição nesse período causa danos irreversíveis',
          'O bebé só precisa de leite estrangeiro',
          'É quando se dão todas as vacinas',
        ],
        correct: 0,
        explain:
          'Da concepção aos 2 anos: desnutrição = baixa estatura, QI reduzido e mais doenças crónicas na vida adulta.',
      },
      {
        prompt: 'Sinal de desnutrição aguda que exige hospital:',
        options: [
          'Edema bilateral nos pés (kwashiorkor)',
          'Bebé activo e barulhento',
          'Sono tranquilo',
        ],
        correct: 0,
        explain:
          "Edema nos pés + apatia + perda de apetite = procura já o SNS. Tratamento gratuito com Plumpy'Nut (RUTF).",
      },
    ],
  },
  {
    articleId: 'hipertensao-diabetes-cronicos',
    questions: [
      {
        prompt: 'Valores de tensão considerados hipertensão:',
        options: ['≥140/90 mmHg', '100/60 mmHg', '90/60 mmHg'],
        correct: 0,
        explain:
          '≥140/90 = hipertensão. Normal <130/80. Mede a pressão 1×/ano após os 40 anos — é SILENCIOSA.',
      },
      {
        prompt: 'Os "3 Ps" do diabetes são:',
        options: ['Muita sede, muita urina, muita fome', 'Paz, amor e alegria', 'Febre, tosse e espirros'],
        correct: 0,
        explain:
          'Polidipsia + Poliúria + Polifagia, com perda de peso inexplicada. Glicemia em jejum ≥126 mg/dL = diabetes.',
      },
      {
        prompt: 'Hábito que reduz muito o risco de DCNT:',
        options: [
          'Caminhar 30 min/dia e reduzir o sal para <5g',
          'Fumar só aos fins-de-semana',
          'Dormir 4 horas',
        ],
        correct: 0,
        explain:
          'Pequenos hábitos (5 porções de fruta/vegetais, 30 min de caminhada, <5g de sal) reduzem o risco em 80%.',
      },
    ],
  },
];

export function quizFor(articleId: string): ArticleQuiz | undefined {
  return ARTICLE_QUIZZES.find((q) => q.articleId === articleId);
}

/* ── Progresso persistido (localStorage) ──────────────────────────── */

export interface PulseState {
  points: number;
  readIds: string[];
  quizBest: Record<string, number>;
  streakDays: number;
  lastReadDay: string | null;
}

const KEY = 'medwallet.edu.pulse';

function today(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

export function loadPulse(): PulseState {
  const empty: PulseState = {
    points: 0,
    readIds: [],
    quizBest: {},
    streakDays: 0,
    lastReadDay: null,
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    return { ...empty, ...(JSON.parse(raw) as Partial<PulseState>) };
  } catch {
    return empty;
  }
}

function savePulse(state: PulseState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage indisponível — ignora */
  }
}

/** Marca leitura + actualiza streak diário. Devolve o estado novo. */
export function markRead(articleId: string): PulseState {
  const s = loadPulse();
  if (!s.readIds.includes(articleId)) s.readIds.push(articleId);
  const t = today();
  if (s.lastReadDay !== t) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
    s.streakDays = s.lastReadDay === yStr ? s.streakDays + 1 : 1;
    s.lastReadDay = t;
  }
  if (s.streakDays === 0) s.streakDays = 1;
  savePulse(s);
  return s;
}

/** Regista score do quiz; devolve os pontos ganhos nesta sessão. */
export function recordQuiz(articleId: string, correctCount: number): { state: PulseState; gained: number } {
  const s = loadPulse();
  const gained = correctCount * POINTS_PER_CORRECT;
  s.points += gained;
  if ((s.quizBest[articleId] ?? 0) < correctCount) s.quizBest[articleId] = correctCount;
  savePulse(s);
  return { state: s, gained };
}
