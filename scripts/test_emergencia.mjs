// scripts/test_emergencia.mjs — F57: regressão das regras de urgência
// Espelho EXACTO das regex de supabase/functions/ai-assistant/index.ts.
// Correr: node scripts/test_emergencia.mjs (exit 0 = tudo OK)
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const EMERGENCY_RULES = [
  { label: "dificuldade em respirar", re: /(dificuldade (de|em) respirar|nao consigo respirar|falta de ar|a sufocar|sufocando)/ },
  { label: "dor no peito", re: /(dor no peito|dor forte no peito|dor intensa no peito|aperto no peito)/ },
  { label: "inconsciência / desmaio", re: /(inconsciente|desmaiou|desmaiada|desmaiado|nao acorda|perdeu os sentidos)/ },
  { label: "convulsões", re: /(convuls|a ter ataques|ataque convulsivo|ataque epileptico|crise epileptica)/ },
  { label: "hemorragia", re: /(hemorragia|a sangrar muito|sangramento forte|sangramento intenso|perdeu muito sangue|nao para de sangrar)/ },
  { label: "sinais de AVC", re: /(avc|derrame|cara torta|boca torta|fala enrolada|fala embolada|braco dormente|forca de um lado so|perdi a fala|visao dupla)/ },
  { label: "gravidez com sangramento ou dor intensa", re: /(gravida|gravidez)[^.]{0,80}(sangue|sangrar|sangramento|dor forte|dor intensa)/ },
  { label: "bebé com febre", re: /\b(bebe|lactente|recem-nascido)\b[^.]{0,60}febre/ },
  { label: "criança com febre preocupante", re: /(crianca)[^.]{0,60}febre[^.]{0,60}(alta|convuls|nao baixa|tres dias|5 dias|cinco dias)/ },
  { label: "risco de suicídio", re: /(quero morrer|suicidio|me matar|tirar a minha propria vida)/ },
  { label: "vómito com sangue", re: /(vomit\w* (com )?sangue|hematemese)/ },
  { label: "sangue nas fezes", re: /(fezes com sangue|sangue nas fezes|sangue no cu)/ },
  { label: "engasgamento", re: /(engasgado|engasgada|engasgou|a engasgar|algo preso na garganta)/ },
  { label: "envenenamento / overdose", re: /(envenenamento|envenenou|engoli veneno|bebeu veneno|tomou veneno|overdose|tomou todos os comprimidos|tomou todos os remedios)/ },
  { label: "ferida grave", re: /(ferida profunda|ferimento grave|corte profundo|osso (a )?atravessar a pele)/ },
  { label: "incapaz de falar ou mover", re: /(nao consigo falar|nao consigo mover|perdi a fala|paralisad|paralisi)/ },
  { label: "olhos revirados / corpo mole", re: /(olhos revirados|corpo mole|crianca mole)/ },
  { label: "parto urgente", re: /(contraccoes muito fort|contracoes muito fort|vou ter (o )?bebe agora|bebe esta a nascer|rompeu (o )?saco|rompeu aguas)/ },
  { label: "auto-agressão", re: /(me cortar|quero cortar-me|vou cortar-me|quero machucar-me)/ },
];

function detect(text) {
  const t = norm(text);
  return EMERGENCY_RULES.filter((r) => r.re.test(t)).map((r) => r.label);
}

const URGENTES = [
  ["não consigo respirar bem", "dificuldade em respirar"],
  ["tenho uma dor forte no peito", "dor no peito"],
  ["ele desmaiou e não acorda", "inconsciência / desmaio"],
  ["o meu filho está a ter convulsões", "convulsões"],
  ["está a sangrar muito depois do corte", "hemorragia"],
  ["o meu pai teve um avc esta manhã", "sinais de AVC"],
  ["estou grávida e a perder sangue", "gravidez com sangramento ou dor intensa"],
  ["meu bebe de 2 meses tem febre alta", "bebé com febre"],
  ["criança com febre que não baixa há três dias", "criança com febre preocupante"],
  ["não quero mais viver, quero morrer", "risco de suicídio"],
  ["está a vomitar sangue", "vómito com sangue"],
  ["sangue nas fezes desde ontem", "sangue nas fezes"],
  ["o meu irmão engasgou com peixe", "engasgamento"],
  ["a criança engoliu veneno", "envenenamento / overdose"],
  ["tenho uma ferida profunda na perna", "ferida grave"],
  ["depois do derrame não consigo falar", "incapaz de falar ou mover"],
  ["o bebe está com olhos revirados", "olhos revirados / corpo mole"],
  ["contracções muito fortes e tenho 8 meses", "parto urgente"],
  ["quero me cortar", "auto-agressão"],
];

const NORMAIS = [
  "quero saber como tomar paracetamol",
  "que sintomas tem a malária?",
  "como prevenir a cólera",
  "tenho dor de cabeça leve desde manhã",
  "quanto custa uma consulta",
  "beber muita água ajuda na prevenção?",
];

let falhas = 0;
for (const [texto, esperado] of URGENTES) {
  const det = detect(texto);
  if (!det.includes(esperado)) {
    falhas++;
    console.log(`FALHOU: "${texto}" → [${det.join(", ")}] (esperado: ${esperado})`);
  } else {
    console.log(`OK: "${texto}" → ${det.join(", ")}`);
  }
}
for (const texto of NORMAIS) {
  const det = detect(texto);
  if (det.length) {
    falhas++;
    console.log(`FALSO POSITIVO: "${texto}" → ${det.join(", ")}`);
  } else {
    console.log(`OK (normal): "${texto}"`);
  }
}
console.log(falhas === 0
  ? `\nTodos os ${URGENTES.length + NORMAIS.length} testes passaram.`
  : `\n${falhas} falha(s) — corrigir as regex antes de deploy.`);
process.exit(falhas === 0 ? 0 : 1);
