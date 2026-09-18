/// Guias essenciais de saúde embutidos na app (funcionam SEM internet).
///
/// Conteúdo igual ao hub estático da versão web
/// (`src/pages/health/edu/HealthEducationHub.tsx`) — artigos validados por
/// protocolos MISAU/OMS. Na web existem em 5 línguas (pt, emakhuwa, tsonga,
/// changana, sena); aqui viaja a versão Português para manter o bundle leve.
/// As categorias usam os mesmos códigos da tabela `health_articles`.
library;

class OfflineArticle {
  const OfflineArticle({
    required this.id,
    required this.title,
    required this.excerpt,
    required this.category,
    required this.minutesRead,
    required this.paragraphs,
  });

  final String id;
  final String title;
  final String excerpt;
  final String category;
  final int minutesRead;
  final List<String> paragraphs;
}

const List<OfflineArticle> kOfflineArticles = [
  OfflineArticle(
    id: 'malaria-sintomas-tratamento',
    title: 'Malária: sintomas, teste RDT e tratamento',
    excerpt:
        'Aprenda a reconhecer os sinais precoces da malária e quando procurar tratamento em 24 horas.',
    category: 'prevention',
    minutesRead: 4,
    paragraphs: [
      'A malária é a principal causa de mortalidade infantil em Moçambique, responsável por aproximadamente 29% das mortes em crianças menores de 5 anos. A transmissão ocorre todo o ano, com picos durante a estação chuvosa (Novembro a Abril), sobretudo nas províncias do norte e centro do país.',
      'Os sintomas clássicos são febre, calafrios, dores de cabeça, dores musculares e fraqueza. Em crianças pequenas, podem incluir vómitos, recusa alimentar e sonolência. Sinais de alarme que exigem referência IMEDIATA ao hospital incluem: dificuldade respiratória, convulsões, sonolência extrema, urina escura, icterícia (olhos amarelos) ou sangramento.',
      'O teste rápido de diagnóstico (RDT) é gratuito em todas as unidades sanitárias do SNS. Em 15 minutos sabe se é malária. NÃO se deve tratar sem teste confirmatório, excepto em crianças com febre em zona de alta transmissão quando não há RDT disponível.',
      'O tratamento recomendado pelo MISAU é a Artemisinina-based Combination Therapy (ACT), especificamente Artemeter-Lumefantrina (AL), tomada durante 3 dias. É CRUCIAL completar todos os comprimidos mesmo que os sintomas desapareçam no segundo dia — caso contrário, o parasita pode voltar mais forte e resistente.',
      'A prevenção baseia-se em três pilares: (1) uso de redes mosquiteiras tratadas com inseticida (ITN) todas as noites, (2) controlo de águas estagnadas em redor da casa, e (3) quimioprofilaxia para mulheres grávidas (SP) a partir do 2º trimestre.',
    ],
  ),
  OfflineArticle(
    id: 'tb-sintomas-tratamento',
    title: 'Tuberculose: sinais, teste de escarro e tratamento DOTS',
    excerpt:
        'Tosse há mais de 2 semanas? Pode ser TB. Saiba como é feito o diagnóstico gratuito e o tratamento DOTS.',
    category: 'prevention',
    minutesRead: 5,
    paragraphs: [
      'A tuberculose (TB) é uma doença bacteriana causada pelo Mycobacterium tuberculosis, que afecta principalmente os pulmões. Moçambique está entre os 30 países de alta carga de TB no mundo, com aproximadamente 170.000 novos casos por ano, dos quais 70.000 são co-infectados com VIH.',
      'Os sintomas cardinais são tosse persistente por mais de 2 semanas, febre vespertina, suores nocturnos, perda de peso inexplicada e cansaço extremo. Em casos avançados pode haver hemoptise (tosse com sangue) — sinal de alarme que exige referência IMEDIATA.',
      'O diagnóstico é gratuito em todas as unidades sanitárias do SNS. Faz-se através do teste de escarro (BAAR / GeneXpert), que detecta a bactéria em 2 horas (GeneXpert) ou 24h (BAAR convencional). Em crianças que não conseguem expectorar, usa-se aspirado gástrico.',
      'O tratamento DOTS (Directly Observed Treatment, Short-course) dura 6 meses e é gratuito. Os primeiros 2 meses usam 4 fármacos (Rifampicina, Isoniazida, Pirazinamida, Etambutol); os 4 meses seguintes usam 2 (Rifampicina + Isoniazida). É CRUCIAL completar o tratamento — caso contrário, a TB pode voltar resistente (TB-MDR), cujo tratamento dura 2 anos e tem efeitos secundários graves.',
      'Em Moçambique, todos os pacientes com TB devem ser testados para VIH. Se positivo, devem iniciar ARV (TDF/3TC/DTG) dentro de 2 semanas. A co-infecção TB-VIH é a principal causa de morte em adultos jovens — o tratamento conjunto reduz mortalidade em 60%.',
    ],
  ),
  OfflineArticle(
    id: 'gravidez-cuidados-pre-natais',
    title: 'Gravidez: cuidados pré-natais e sinais de alarme',
    excerpt:
        'Pelo menos 4 consultas pré-natais gratuitas. Saiba quais os exames obrigatórios e os sinais que exigem ida imediata ao hospital.',
    category: 'maternal',
    minutesRead: 6,
    paragraphs: [
      'A assistência pré-natal (ANC) é gratuita em todas as unidades sanitárias de Moçambique. A OMS recomenda pelo menos 8 contactos pré-natais, mas o MISAU garante um mínimo de 4 consultas com calendário definido: 1ª entre 8-12 semanas, 2ª entre 20-24, 3ª entre 28-32, 4ª entre 36-40.',
      'Em cada consulta são verificados: pressão arterial, peso, altura uterina, batimentos cardíacos fetais, e feitos exames de urina (proteínas), sangue (hemoglobina, grupo RH, sífilis, VIH, malária). A vacina antitetânica é administrada a partir da 1ª consulta se a mulher não estiver vacinada.',
      'Sinais de alarme durante a gravidez que exigem ida IMEDIATA ao hospital: (1) sangramento vaginal, (2) dor de cabeça intensa com visão turva (suspeita de pré-eclâmpsia), (3) inchaço repentino de pernas/rosto, (4) febre alta, (5) perda de líquido amniótico, (6) diminuição de movimentos fetais, (7) convulsões.',
      'A pré-eclâmpsia é uma das principais causas de mortalidade materna em Moçambique. Aparece após a 20ª semana e caracteriza-se por pressão arterial ≥140/90 mmHg com proteínas na urina. Se não tratada, evolui para eclâmpsia (convulsões) que pode matar mãe e bebé em horas. Por isso, toda mulher grávida com dor de cabeça intensa deve medir a pressão imediatamente.',
      'A nutrição durante a gravidez deve incluir: ferro + ácido fólico (distribuídos grátis nas consultas), proteínas (peixe, feijão, ovo), frutas e vegetais (vitamina A para a visão do bebé), e iodo (sal iodado). Evitar álcool, tabaco, e medicamentos sem receita. Pelo menos 1,5L de água por dia.',
    ],
  ),
  OfflineArticle(
    id: 'arv-adesao-tratamento',
    title: 'VIH/SIDA: adesão ao tratamento ARV (TLD)',
    excerpt:
        'A toma do TLD (Tenofovir+Lamivudina+Dolutegravir) uma vez por dia mantém o VIH indetectável. Saiba porque NUNCA se pode parar.',
    category: 'prevention',
    minutesRead: 5,
    paragraphs: [
      'Moçambique tem cerca de 2,4 milhões de pessoas vivendo com VIH (PVVIH), sendo o terceiro país do mundo com maior carga viral. O governo fornece tratamento ARV gratuito a todos os PVVIH desde 2004, e desde 2019 adoptou o regime TLD (Tenofovir + Lamivudina + Dolutegravir) como primeira linha por ser mais eficaz, com menos efeitos secundários e apenas 1 comprimido por dia.',
      'A toma deve ser feita TODOS OS DIAS, à MESMA HORA, preferencialmente à noite antes de dormir. Esquecer 1 dia não é catastrofal, mas esquecer regularmente permite que o vírus se multiplique e desenvolva RESISTÊNCIA — situação em que o TLD deixa de funcionar e o paciente tem de mudar para regimes de 2ª linha, com mais comprimidos e mais efeitos secundários.',
      'A carga viral deve ser medida 6 meses após início do tratamento e depois anualmente. Se a carga for INDETECTÁVEL (<50 cópias/mL), significa que o tratamento está a funcionar, o sistema imunitário está a recuperar, e NÃO É POSSÍVEL transmitir o vírus sexualmente (conceito U=U: Undetectable = Untransmittable). Esta é a mensagem mais importante para desestigmatizar o VIH.',
      'Efeitos secundários comuns nas primeiras 4 semanas: dor de cabeça, náuseas, sonhos vividos, tonturas. Costumam desaparecer. Efeitos graves que exigem ida ao hospital: icterícia (olhos amarelos - lesão hepática), dor abdominal intensa, febre com erupção cutânea generalizada.',
      'A adesão é apoiada por grupos de ajuda mútua (GAAM) — grupos de 6-12 pessoas que se revezam para ir buscar medicação mensalmente, poupando viagens. O MedWallet MZ ajuda com lembretes diários e notificações push, para nunca mais esquecer a toma.',
    ],
  ),
  OfflineArticle(
    id: 'nutricao-crianca-1000-dias',
    title: 'Nutrição infantil: os primeiros 1000 dias',
    excerpt:
        'Da concepção aos 2 anos, a nutrição define o resto da vida. Saiba o que comer e o que evitar.',
    category: 'child',
    minutesRead: 4,
    paragraphs: [
      'Os primeiros 1000 dias — desde a concepção até aos 2 anos de idade — são a janela crítica para o desenvolvimento físico e cognitivo. A desnutrição neste período causa danos IRREVERSÍVEIS: baixa estatura adulta, QI reduzido em 10 pontos, maior risco de doenças crónicas na vida adulta.',
      'Durante a gravidez, a mãe precisa de 300 calorias extra/dia, ferro (60mg), ácido fólico (400μg), cálcio e iodo. Em Moçambique, distribui-se gratuitamente ferro + ácido fólico nas consultas pré-natais. Alimentos a privilegiar: peixe, ovo, feijão, amendoim, folhas verdes, manga, mamão.',
      'Aleitamento materno EXCLUSIVO até aos 6 meses — sem água, sem chá, sem outros alimentos. O leite materno tem tudo o que o bebé precisa, incluindo anticorpos que o protegem de diarreias e pneumonias (maiores causas de morte infantil em Moçambique).',
      'A partir dos 6 meses, introduzir alimentação complementar: papas de farinha de milho/fécula com óleo e amendoim moído, puré de banana/manga, ovo cozido, peixe desfiado. Mínimo 3 refeições/dia a partir dos 8 meses. Continuar aleitamento até aos 24 meses.',
      'Sinais de desnutrição aguda que exigem ida ao hospital: peso baixo para a altura, edema bilateral nos pés (kwashiorkor), perda de apetite, apatia. O tratamento é gratuito com Plumpy\'Nut (RUTF) nas unidades sanitárias.',
    ],
  ),
  OfflineArticle(
    id: 'hipertensao-diabetes-cronicos',
    title: 'Hipertensão e Diabetes: doenças crónicas em Moçambique',
    excerpt:
        '1 em cada 3 moçambicanos adultos tem hipertensão. Saiba como prevenir, detectar e tratar.',
    category: 'chronic',
    minutesRead: 5,
    paragraphs: [
      'As doenças crónicas não-transmissíveis (DCNT) — hipertensão, diabetes, doenças cardiovasculares e cancro — são hoje a principal causa de mortalidade em Moçambique, ultrapassando já as doenças infecciosas. A hipertensão afecta 33% dos adultos urbanos e 18% dos rurais; o diabetes tipo 2 afecta 6% e cresce 8% ao ano.',
      'A hipertensão é SILENCIOSA — a maioria não tem sintomas até ter um AVC (acidente vascular cerebral) ou enfarte. Por isso, é essencial medir a pressão pelo menos 1 vez por ano após os 40 anos, e a cada 6 meses se há história familiar. Valores normais: <130/80 mmHg. Valores alterados: ≥140/90 mmHg.',
      'Sinais de alarme que exigem ida IMEDIATA ao hospital: dor de cabeça intensa com visão turva, dor no peito que irradia para o braço esquerdo, fraqueza súbita de um lado do corpo, dificuldade de falar, perda de consciência. Estes são sinais de AVC ou enfarte — cada minuto conta.',
      'O diabetes apresenta os "3 Ps": Polidipsia (muita sede), Poliúria (muita urina), Polifagia (muita fome) — acompanhados de perda de peso inexplicada. A glicemia em jejum normal é <100 mg/dL; diabetes é ≥126 mg/dL. O tratamento inclui dieta, exercício, e medicação (Metformina primeira linha, gratuita no SNS).',
      'Prevenção comum a ambas: reduzir sal para <5g/dia (1 colher de chá), evitar fritos e ultraprocessados, comer 5 porções de fruta/vegetais por dia, caminhar 30 min/dia, NÃO fumar, moderar álcool, dormir 7-8h/noite, controlar o stress. Pequenos hábitos reduzem o risco em 80%.',
    ],
  ),
];
