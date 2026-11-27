// ╔════════════════════════════════════════════════════════════════════════╗
// ║  ai-embed-catalog — popula ai_med_embeddings (RAG do Assistente IA)    ║
// ║                                                                        ║
// ║  DIFERENTE de embed-catalog (esse sincroniza products →                ║
// ║  product_embeddings das farmácias parceiras). ESTA função alimenta o   ║
// ║  catálogo APROVADO que o match_ai_meds usa no chat.                    ║
// ║                                                                        ║
// ║  Modos (POST, JSON):                                                   ║
// ║    { "mode": "seed" }    → insere a lista inicial de essenciais (17)   ║
// ║    { "mode": "custom",   → insere items enviados:                     ║
// ║      "items": [...] }       [{ "nome": "...", "descricao": "..." }]    ║
// ║    { "mode": "status" }   → conta linhas na tabela                    ║
// ║                                                                        ║
// ║  Proteção: header x-embed-secret === EMBED_SYNC_SECRET (mesmo padrão   ║
// ║  do embed-catalog). Escrita via service_role — o RLS bloqueia          ║
// ║  authenticated por design (catálogo é conteúdo APROVADO).              ║
// ║                                                                        ║
// ║  PRÉ-REQUISITOS: 1) correr database/AI_ASSISTANT_SETUP.sql             ║
// ║                  2) secrets: NVIDIA_API_KEY + EMBED_SYNC_SECRET        ║
// ║                                                                        ║
// ║  Exemplo (supabase secrets set EMBED_SYNC_SECRET=um-segredo-longo):    ║
// ║  curl -X POST https://<project>.supabase.co/functions/v1/\             ║
// ║    ai-embed-catalog \                                                  ║
// ║    -H "x-embed-secret: um-segredo-longo" \                             ║
// ║    -H "Content-Type: application/json" \                               ║
// ║    -d '{"mode":"seed"}'                                                ║
// ║                                                                        ║
// ║  ⚠️ A LISTA SEED é uma lista INICIAL de medicamentos essenciais usados ║
// ║  em Moçambique. ANTES de publicar para utilizadores, validar nomes,    ║
// ║  indicações e doses contra o Formulário Nacional de Medicamentos       ║
// ║  (FNM/MISAU) e atualizar/remover o que for preciso (mode custom).      ║
// ╚════════════════════════════════════════════════════════════════════════╝

const NIM_EMBED_URL = "https://integrate.api.nvidia.com/v1/embeddings";
const EMBED_MODEL = "nvidia/nemotron-3.5-embed-8b"; // 4096 dims (validado)
const BATCH = 16;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-embed-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ────────────────────────────────────────────────────────────────────────
// Lista INICIAL de medicamentos essenciais (educativa — validar com FNM).
// descricao curta e autocontida: é o que o RAG injeta no chat (corta a 400).
// ────────────────────────────────────────────────────────────────────────
type SeedItem = { nome: string; descricao: string };

const SEED_CATALOG: SeedItem[] = [
  { nome: "Paracetamol", descricao: "Analgésico e antipirético. Alivia dores leves a moderadas (cabeça, dentes, músculos) e baixa a febre. Dose usual no adulto: 500–1000 mg de 6 em 6 horas, sem exceder 4 g em 24 h. Evitar em doença grave do fígado e em quem consome álcool regularmente." },
  { nome: "Ibuprofeno", descricao: "Anti-inflamatório não esteroide (AINE) para dor com inflamação, cólicas menstruais e dores articulares. Tomar após as refeições. Dose usual no adulto: 200–400 mg de 6 a 8 em 8 horas. Evitar em úlcera gástrica, doença renal avançada e no 3.º trimestre de gravidez." },
  { nome: "Amoxicilina", descricao: "Antibiótico da família das penicilinas, para infeções do ouvido, garganta, sinusite, vias urinárias e pele. Dose usual no adulto: 500 mg de 8 em 8 horas, conforme prescrição. Tomar sempre até ao fim, mesmo quando os sintomas melhoram. Não trata gripe nem malária." },
  { nome: "Azitromicina", descricao: "Antibiótico macrolídeo para infeções respiratórias, alguns casos de diarreia infecciosa e infeções genitais. Dose usual no adulto: 500 mg 1 vez ao dia durante 3 dias. Pode tomar com ou sem comida. Só com prescrição." },
  { nome: "Metronidazol", descricao: "Antibiótico para infeções por bactérias anaeróbias, amibíase, giardíase e vaginose bacteriana. Dose usual no adulto: 400–500 mg de 8 em 8 horas, conforme prescrição. Não ingerir álcool durante o tratamento nem até 48 h depois." },
  { nome: "Artemeter + Lumefantrina (Coartem)", descricao: "Combinação oral de 1.ª linha para tratamento da malária não complicada em Moçambique. Tratamento de 3 dias com doses consoante o peso/idade. Tomar com alimento gorduroso para melhor absorção. Se vomitar até 30 min depois da toma ou piorar, voltar ao centro de saúde." },
  { nome: "Sulfadoxina + Pirimetamina (SP)", descricao: "Usada no pré-natal como profilaxia intermitente da malária na gravidez, sob supervisão da enfermeira, a partir do 2.º trimestre. Não serve para tratar malária já instalada. Faz parte do pacote do consulta pré-natal nos CSA." },
  { nome: "Sais de Reidratação Oral (SRO)", descricao: "Primeira linha na diarreia com desidratação. Dissolver 1 saqueta em 1 litro de água limpa e dar em colheradas frequentes, sobretudo a crianças. Não diluir em leite nem sumo. Continuar a alimentar a criança. Procurar o centro de saúde se houver sangue nas fezes, vómitos persistentes ou desidratação grave." },
  { nome: "Sulfato de zinco", descricao: "Suplemento dado às crianças com diarreia, junto com o SRO, para reduzir a duração do episódio. Esquema habitual: 20 mg/dia durante 10–14 dias para maiores de 6 meses (10 mg/dia para menores de 6 meses). Manter a amamentação." },
  { nome: "Ferro + Ácido Fólico", descricao: "Previne e trata anemia, sobretudo na gravidez. Dose usual na gravidez: 1 comprimido diário (60 mg de ferro elementar + 400 µg de ácido fólico). Pode escurecer as fezes (normal). Tomar com sumo de fruta rico em vitamina C melhora a absorção; evitar junto com chá ou leite." },
  { nome: "Vitamina A", descricao: "Suplementação periódica de crianças dos 6 meses aos 5 anos (megadoses em campanhas e consultas de crescimento) e tratamento de deficiência com sinais oculares. Doses elevadas só sob orientação do profissional de saúde." },
  { nome: "TDF + 3TC + DTG (ARV)", descricao: "Esquema padrão de 1.ª linha do tratamento do VIH em Moçambique (tenofovir + lamivudina + dolutegravir): 1 comprimido, à mesma hora, todos os dias — gratuito nos centros de saúde. Nunca interromper nem partilhar. Com carga viral controlada vive-se normal e evita-se a transmissão." },
  { nome: "Rifampicina + Isoniazida (TB)", descricao: "Base do tratamento da tuberculose, em dose combinada fixa, num regime de 6 meses gratuito nos centros de saúde. A urina pode ficar alaranjada (normal). Não interromper — o tratamento incompleto causa resistência. Comparecer aos exames de acompanhamento." },
  { nome: "Amlodipina", descricao: "Anti-hipertensivo para tratamento da pressão alta. Dose usual no adulto: 5–10 mg 1 vez ao dia. Pode causar inchaço leve dos tornozelos. Não parar por conta própria: a hipertensão é um tratamento contínuo, com controlo regular no centro de saúde." },
  { nome: "Metformina", descricao: "Primeira linha da diabetes tipo 2. Dose usual: 500–1000 mg 2 vezes ao dia junto com as refeições, conforme prescrição. Não usar em insuficiência renal avançada. Cuidado com hipoglicemia quando combinada com outros antidiabéticos." },
  { nome: "Salbutamol (inalador)", descricao: "Broncodilatador de alívio rápido para crises de asma e falta de ar com sibilos. 2 inaladas conforme prescrição, repetindo se necessário. Procurar ajuda URGENTE se não houver melhoria em poucos minutos ou se a pessoa não conseguir falar frases completas." },
  { nome: "Cetirizina / Loratadina", descricao: "Antihistamínicos para alergias (rinite, urticária, prurido). Dose usual no adulto: 10 mg 1 vez ao dia. Podem causar sonolência ligeira (mais rara com loratadina). Evitar álcool e cuidado ao conduzir." },
];

// Texto que vai ser embedado por item (curto e estável, igual ao padrão do embed-catalog)
function passageText(nome: string, descricao: string): string {
  return `${nome} — ${descricao} | medicamento essencial, bula, dose, Moçambique`.slice(0, 2000);
}

async function embedBatch(apiKey: string, inputs: string[]): Promise<number[][]> {
  const r = await fetch(NIM_EMBED_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      input: inputs,
      model: EMBED_MODEL,
      encoding_format: "float",
      input_type: "passage", // catálogo = passage (queries usam "query")
      truncate: "END",
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!r.ok) {
    const detail = (await r.text().catch(() => "")).slice(0, 300);
    throw new Error(`embed HTTP ${r.status} ${detail}`);
  }
  const data = await r.json();
  const vectors: number[][] = (data.data ?? []).map((d: { embedding: number[] }) => d.embedding);
  if (vectors.length !== inputs.length) {
    throw new Error(`recebidos ${vectors.length} vectores para ${inputs.length} textos`);
  }
  return vectors;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST obrigatório" }, 405);

  // Proteção por secret (mesmo padrão do embed-catalog)
  const secret = Deno.env.get("EMBED_SYNC_SECRET");
  if (!secret || req.headers.get("x-embed-secret") !== secret) {
    return json({ error: "unauthorized", dica: "Define EMBED_SYNC_SECRET e envia o header x-embed-secret" }, 401);
  }
  const apiKey = Deno.env.get("NVIDIA_API_KEY");
  if (!apiKey) {
    return json({ error: "no_key", detail: "NVIDIA_API_KEY não configurada (supabase secrets set NVIDIA_API_KEY=...)" }, 503);
  }

  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: any = {};
  try { body = await req.json(); } catch { /* corpo vazio → modo seed */ }
  const mode: string = body.mode ?? "seed";

  // Contagem atual na tabela (usada em todos os modos)
  const countRows = async () => {
    const { count } = await admin.from("ai_med_embeddings").select("id", { count: "exact", head: true });
    return count ?? 0;
  };

  try {
    if (mode === "status") {
      return json({ mode, total_in_table: await countRows(), model: EMBED_MODEL, dims_expected: 4096 });
    }

    // ── Determinar os itens a processar ──
    let items: SeedItem[] = [];
    let fonte = "embed-catalog";
    if (mode === "seed") {
      items = SEED_CATALOG;
      fonte = "embed-catalog (seed inicial — validar com FNM/MISAU)";
    } else if (mode === "custom") {
      const arr = Array.isArray(body.items) ? body.items : [];
      items = arr
        .filter((i: any) => i && String(i.nome ?? "").trim())
        .map((i: any) => ({ nome: String(i.nome).trim(), descricao: String(i.descricao ?? i.content ?? "").trim() }));
      if (!items.length) return json({ error: "bad_request", detail: 'modo custom exige "items": [{ "nome", "descricao" }] com pelo menos 1 item' }, 400);
      fonte = String(body.fonte ?? "embed-catalog (custom)").slice(0, 120);
    } else {
      return json({ error: "bad_request", detail: "mode deve ser seed | custom | status" }, 400);
    }

    // ── Embedar em lotes de BATCH ──
    const inserted: string[] = [];
    let processed = 0;
    for (let start = 0; start < items.length; start += BATCH) {
      const chunk = items.slice(start, start + BATCH);
      const vectors = await embedBatch(apiKey, chunk.map((i) => passageText(i.nome, i.descricao)));

      // Substituir versões antigas dos mesmos nomes (catálogo curado, poucas linhas)
      const nomes = chunk.map((i) => i.nome);
      await admin.from("ai_med_embeddings").delete().in("nome", nomes);

      const rows = chunk.map((i, k) => ({
        nome: i.nome,
        descricao: i.descricao,
        content: passageText(i.nome, i.descricao),
        embedding: JSON.stringify(vectors[k]),
        fonte,
      }));
      const { error: insError } = await admin.from("ai_med_embeddings").insert(rows);
      if (insError) throw new Error(`db_insert: ${insError.message}`);

      processed += chunk.length;
      inserted.push(...nomes);
    }

    return json({
      mode,
      processed,
      inserted,
      total_in_table: await countRows(),
      model: EMBED_MODEL,
      dims: 4096,
      aviso: mode === "seed"
        ? "Lista inicial educativa — validar nomes, indicações e doses com o Formulário Nacional de Medicamentos (FNM/MISAU) antes de publicar."
        : undefined,
    });
  } catch (e) {
    return json({ error: "catalog_error", detail: String(e?.message ?? e) }, 502);
  }
});
