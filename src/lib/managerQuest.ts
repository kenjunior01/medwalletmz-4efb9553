export type QuizOption = { id: string; label: string; points: number };
export type QuizPhase = 1 | 2 | 3;
export type QuizQuestion = {
  id: string;
  phase: QuizPhase;
  section: string;
  question: string;
  options: QuizOption[];
};

export const PHASES: { phase: QuizPhase; title: string; subtitle: string }[] = [
  { phase: 1, title: 'Fase 1 — Triagem', subtitle: 'Perfil, liderança e operação de base.' },
  { phase: 2, title: 'Fase 2 — Cenários', subtitle: 'Decisões reais de gestão regional.' },
  { phase: 3, title: 'Fase 3 — Simulação', subtitle: 'Simulação dos primeiros 90 dias na sua região.' },
];

/** Questionário de avaliação para candidatos a Gestor Regional. */
export const MANAGER_QUIZ: QuizQuestion[] = [
  {
    id: 'q1',
    phase: 1,
    section: 'Liderança',
    question: 'A sua equipa de 8 promotores falhou a meta mensal de novas farmácias em 40%. O que faz primeiro?',
    options: [
      { id: 'a', label: 'Analiso os dados por promotor e identifico o bloqueio real antes de decidir', points: 10 },
      { id: 'b', label: 'Aumento a meta do mês seguinte para compensar', points: 2 },
      { id: 'c', label: 'Substituo os dois piores promotores imediatamente', points: 3 },
      { id: 'd', label: 'Escalo para o admin global e espero instruções', points: 5 },
    ],
  },
  {
    id: 'q2',
    phase: 1,
    section: 'Operações',
    question: 'Uma clínica importada aparece com coordenadas erradas e já recebe pedidos. Qual é a acção correcta?',
    options: [
      { id: 'a', label: 'Despublico, corrijo as coordenadas na curadoria e volto a publicar', points: 10 },
      { id: 'b', label: 'Deixo como está, os utilizadores corrigem depois', points: 0 },
      { id: 'c', label: 'Apago o registo e peço nova importação', points: 4 },
      { id: 'd', label: 'Contacto a clínica e só depois avalio', points: 7 },
    ],
  },
  {
    id: 'q3',
    phase: 1,
    section: 'Crescimento',
    question: 'Com orçamento zero, qual é a alavanca mais eficaz para captar 100 novos utilizadores numa cidade?',
    options: [
      { id: 'a', label: 'Parcerias com farmácias e clínicas locais + código de convite', points: 10 },
      { id: 'b', label: 'Anúncios pagos nas redes sociais', points: 2 },
      { id: 'c', label: 'Distribuição de panfletos', points: 4 },
      { id: 'd', label: 'Esperar pelo crescimento orgânico', points: 0 },
    ],
  },
  {
    id: 'q4',
    phase: 2,
    section: 'Integridade',
    question: 'Um parceiro oferece-lhe um valor pessoal para acelerar a aprovação da sua clínica. O que faz?',
    options: [
      { id: 'a', label: 'Recuso e registo a ocorrência no painel de compliance', points: 10 },
      { id: 'b', label: 'Recuso discretamente e não digo nada', points: 5 },
      { id: 'c', label: 'Aceito, a clínica cumpre os requisitos na mesma', points: 0 },
      { id: 'd', label: 'Peço orientação ao admin global sem registar', points: 6 },
    ],
  },
  {
    id: 'q5',
    phase: 2,
    section: 'Dados',
    question: 'O painel mostra 300 consultas iniciadas e 90 concluídas no seu país. O que investiga primeiro?',
    options: [
      { id: 'a', label: 'O funil: onde exactamente o utilizador abandona (pagamento, agenda, chamada)', points: 10 },
      { id: 'b', label: 'Peço mais médicos', points: 4 },
      { id: 'c', label: 'Assumo que é normal', points: 0 },
      { id: 'd', label: 'Lanço uma campanha de descontos', points: 3 },
    ],
  },
  {
    id: 'q6',
    phase: 2,
    section: 'Suporte',
    question: 'Um paciente reclama que pagou por M-Pesa e a consulta não foi confirmada. Prioridade?',
    options: [
      { id: 'a', label: 'Verifico o comprovativo, confirmo ou reembolso no mesmo dia', points: 10 },
      { id: 'b', label: 'Peço para tentar de novo', points: 1 },
      { id: 'c', label: 'Encaminho para o médico', points: 3 },
      { id: 'd', label: 'Abro um ticket e respondo em 72h', points: 5 },
    ],
  },
  {
    id: 'q7',
    phase: 2,
    section: 'Conhecimento local',
    question: 'Qual destes é o factor mais decisivo para adopção de saúde digital na sua região?',
    options: [
      { id: 'a', label: 'Custo de dados móveis e confiança na plataforma', points: 10 },
      { id: 'b', label: 'Design da aplicação', points: 4 },
      { id: 'c', label: 'Número de idiomas suportados', points: 6 },
      { id: 'd', label: 'Publicidade televisiva', points: 2 },
    ],
  },
  {
    id: 'q8',
    phase: 2,
    section: 'Gestão financeira',
    question: 'A comissão da plataforma sobre consultas caiu 15% no seu país. O que faz?',
    options: [
      { id: 'a', label: 'Cruzo volume, ticket médio e reembolsos antes de propor medidas', points: 10 },
      { id: 'b', label: 'Aumento a comissão', points: 2 },
      { id: 'c', label: 'Reduzo o preço das consultas', points: 4 },
      { id: 'd', label: 'Não faço nada, é sazonal', points: 1 },
    ],
  },
  {
    id: 's1',
    phase: 3,
    section: 'Simulação · Dias 1-30',
    question: 'Assume a região amanhã. Qual é a primeira acção dos primeiros 30 dias?',
    options: [
      { id: 'a', label: 'Mapear e visitar as 20 unidades de saúde com mais tráfego da região', points: 20 },
      { id: 'b', label: 'Contratar imediatamente 10 promotores', points: 8 },
      { id: 'c', label: 'Lançar uma campanha nas redes sociais', points: 5 },
      { id: 'd', label: 'Esperar pelas metas do admin global', points: 0 },
    ],
  },
  {
    id: 's2',
    phase: 3,
    section: 'Simulação · Dias 31-60',
    question: 'Tem 60 utilizadores activos e a meta é 500 em 30 dias. Qual é a alavanca principal?',
    options: [
      { id: 'a', label: 'Rede de APEs e farmácias com código de convite e incentivo por adesão', points: 20 },
      { id: 'b', label: 'Descontos agressivos nas consultas', points: 7 },
      { id: 'c', label: 'Eventos comunitários semanais sem parceiros', points: 10 },
      { id: 'd', label: 'Comprar tráfego online', points: 3 },
    ],
  },
  {
    id: 's3',
    phase: 3,
    section: 'Simulação · Crise',
    question: 'Um surto de cólera atinge dois distritos e a rede móvel está instável. O que prioriza?',
    options: [
      { id: 'a', label: 'Modo offline/SMS, triagem simplificada e coordenação com as autoridades de saúde', points: 20 },
      { id: 'b', label: 'Suspendo operações até normalizar', points: 0 },
      { id: 'c', label: 'Reforço apenas o marketing sobre prevenção', points: 8 },
      { id: 'd', label: 'Envio todos os promotores para a zona afectada', points: 11 },
    ],
  },
  {
    id: 's4',
    phase: 3,
    section: 'Simulação · Dias 61-90',
    question: 'A receita da região cresce mas a margem cai. Como reage no fecho dos 90 dias?',
    options: [
      { id: 'a', label: 'Analiso custo de aquisição por canal e corto o canal menos rentável', points: 20 },
      { id: 'b', label: 'Aumento o volume para compensar', points: 9 },
      { id: 'c', label: 'Peço mais orçamento à sede', points: 4 },
      { id: 'd', label: 'Mantenho tudo igual até ao trimestre seguinte', points: 1 },
    ],
  },
];

const maxOf = (qs: QuizQuestion[]) =>
  qs.reduce((sum, q) => sum + Math.max(...q.options.map((o) => o.points)), 0);

export const questionsForPhase = (phase: QuizPhase) => MANAGER_QUIZ.filter((q) => q.phase === phase);

export const MAX_QUIZ_SCORE = maxOf(MANAGER_QUIZ);

export const MAX_PHASE_SCORE: Record<QuizPhase, number> = {
  1: maxOf(questionsForPhase(1)),
  2: maxOf(questionsForPhase(2)),
  3: maxOf(questionsForPhase(3)),
};

function sumPoints(qs: QuizQuestion[], answers: Record<string, string>): number {
  return qs.reduce((sum, q) => {
    const opt = q.options.find((o) => o.id === answers[q.id]);
    return sum + (opt?.points ?? 0);
  }, 0);
}

export function scoreQuiz(answers: Record<string, string>): number {
  return sumPoints(MANAGER_QUIZ, answers);
}

/** Pontuação por fase: { "1": n, "2": n, "3": n } */
export function scoreByPhase(answers: Record<string, string>): Record<string, number> {
  return {
    '1': sumPoints(questionsForPhase(1), answers),
    '2': sumPoints(questionsForPhase(2), answers),
    '3': sumPoints(questionsForPhase(3), answers),
  };
}
