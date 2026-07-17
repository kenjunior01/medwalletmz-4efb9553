/**
 * Google Gemini API Utility — MedWallet MZ
 * ---------------------------------------------------------------
 * Fornece 3 primitivas reutilizáveis para as páginas verticais:
 *   1. `geminiChat`        — chat de triagem clínica com system prompt
 *   2. `geminiAnalyzeImage`— visão (RDT, rótulo de medicamento, etc.)
 *   3. `geminiStructured`  — resposta JSON estruturada (e.g. classificação)
 *
 * Estratégia resiliente:
 *  - API key via VITE_GEMINI_API_KEY (Google AI Studio)
 *  - Fallback automático para simulacao local quando:
 *      a) chave ausente / placeholder
 *      b) quota excedida (RESOURCE_EXHAUSTED — comum no free tier)
 *      c) erro de rede / região não suportada
 *  - Sempre retorna string legível para o utilizador final.
 *
 * NOTA: O SDK @google/generative-ai é deliberadamente NÃO usado — fazemos
 * fetch direto para evitar uma nova dependência e manter bundle leve.
 */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Modelos suportados (na data de implementação). Lista em ordem de preferência.
const CHAT_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite"];
const VISION_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite"];

export interface GeminiMessage {
  role: "user" | "model";
  text: string;
}

export interface GeminiChatOptions {
  systemPrompt?: string;
  temperature?: number;
  maxOutputTokens?: number;
  history?: GeminiMessage[];
}

export interface GeminiStructuredOptions<T> extends GeminiChatOptions {
  schema?: Record<string, unknown>; // JSON schema leve (apenas para documentação)
  fallback: T; // valor retornado quando API falha
}

/** Verifica se a chave Gemini está configurada. */
export function isGeminiConfigured(): boolean {
  return Boolean(API_KEY && !API_KEY.includes("your_") && API_KEY.length > 20);
}

/**
 * Detecta erros de quota do free-tier do Gemini.
 * O free tier tem limite 0 em algumas regiões/foresights; retornamos
 * gracefully para o fallback em vez de lançar.
 */
function isQuotaError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("resource_exhausted") ||
      msg.includes("quota") ||
      msg.includes("429")
    );
  }
  return false;
}

/**
 * Extrai o texto da resposta Gemini (suporta candidatos múltiplos).
 */
function extractText(data: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }): string {
  const candidate = data.candidates?.[0];
  if (!candidate?.content?.parts) return "";
  return candidate.content.parts.map((p) => p.text ?? "").join("").trim();
}

/**
 * Chamada HTTP centralizada com fallback de modelo.
 * Tenta cada modelo em ordem até um funcionar.
 */
async function callGemini(
  models: string[],
  body: Record<string, unknown>,
): Promise<string> {
  if (!isGeminiConfigured()) {
    throw new Error("GEMINI_NOT_CONFIGURED");
  }

  let lastError: unknown = null;

  for (const model of models) {
    try {
      const url = `${BASE_URL}/${model}:generateContent?key=${API_KEY}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        const errMsg =
          (errorPayload as { error?: { message?: string } }).error?.message ??
          response.statusText;
        throw new Error(`Gemini API ${response.status}: ${errMsg}`);
      }

      const data = await response.json();
      const text = extractText(data);
      if (text) return text;
      throw new Error("Resposta vazia do Gemini");
    } catch (error) {
      lastError = error;
      // Se for quota, nao adianta tentar outro modelo — todos vao falhar
      if (isQuotaError(error)) break;
      // Caso contrario, tenta proximo modelo
      continue;
    }
  }

  throw lastError ?? new Error("GEMINI_UNKNOWN_ERROR");
}

/**
 * 1) Chat de triagem clínica / assistência ao APE / enfermeiro.
 *
 * @example
 * const reply = await geminiChat(
 *   "Paciente 3 anos, febre 39°C, vómitos. Próximo passo?",
 *   { systemPrompt: "És um enfermeiro moçambicano..." }
 * );
 */
export async function geminiChat(
  prompt: string,
  options: GeminiChatOptions = {},
): Promise<string> {
  const {
    systemPrompt,
    temperature = 0.4,
    maxOutputTokens = 600,
    history = [],
  } = options;

  const contents = [
    ...history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    { role: "user" as const, parts: [{ text: prompt }] },
  ];

  const body: Record<string, unknown> = {
    contents,
    generationConfig: { temperature, maxOutputTokens, topP: 0.95 },
  };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  return callGemini(CHAT_MODELS, body);
}

/**
 * 2) Análise de imagem (RDT positivo/negativo, rótulo de medicamento, etc.).
 * O `file` é convertido para base64 e enviado inline.
 *
 * Retorna um texto descritivo da análise.
 */
export async function geminiAnalyzeImage(
  file: File,
  prompt: string,
  options: Omit<GeminiChatOptions, "history"> = {},
): Promise<string> {
  const { temperature = 0.2, maxOutputTokens = 400 } = options;
  const base64 = await fileToBase64(file);
  const inlineData = {
    mimeType: file.type || "image/jpeg",
    data: base64.split(",")[1],
  };

  const body = {
    contents: [
      {
        role: "user" as const,
        parts: [{ text: prompt }, { inlineData }],
      },
    ],
    generationConfig: { temperature, maxOutputTokens, topP: 0.9 },
  };

  return callGemini(VISION_MODELS, body);
}

/**
 * 3) Resposta JSON estruturada.
 * Tenta forçar JSON no prompt e faz parse; em falha retorna `fallback`.
 */
export async function geminiStructured<T>(
  prompt: string,
  options: GeminiStructuredOptions<T>,
): Promise<T> {
  const { fallback, systemPrompt, temperature = 0.2, maxOutputTokens = 400 } = options;
  const enforcedPrompt = `${prompt}\n\nResponde APENAS com JSON válido, sem markdown, sem texto adicional.`;

  try {
    const text = await geminiChat(enforcedPrompt, {
      systemPrompt:
        systemPrompt ??
        "És um assistente que responde sempre em JSON válido.",
      temperature,
      maxOutputTokens,
    });

    // Tenta extrair JSON mesmo se houver markdown envolvente
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback;
    return JSON.parse(jsonMatch[0]) as T;
  } catch {
    return fallback;
  }
}

/**
 * Helpers de System Prompts específicos para cada vertical.
 * Mantém a linha clínica moçambicana (Protocolo MISAU / OMS).
 */
export const GEMINI_SYSTEM_PROMPTS = {
  ape: `És um assistente de triagem para Agentes Polivalentes Elementares (APE) em Moçambique.
Respondes em português de Moçambique, com tom respeitoso e simples.
Tens formação em protocolos MISAU/OMS para malária, TB, HIV, vacinação e saúde materno-infantil.
Sempre que o caso parecer grave, recomendas REFER para a unidade sanitária mais próxima.
Nunca prescreves medicamentos — apenas orientas sobre próximos passos.`,

  tb: `És um assistente do programa TB-DOT em Moçambique.
Ajudas o técnico de saúde a interpretar sintomas, efeitos adversos da medicação e adesão ao tratamento.
Respondes em português moçambicano, conciso (máx 4 frases).
Sempre que houver sinal de alerta (hepatotoxicidade, neuropatia, falência terapêutica), recomendas REFER ao médico.`,

  art: `És um conselheiro de adesão ao tratamento ARV (HIV) em Moçambique.
Ajudas o paciente/técnico a gerir efeitos adversos e a manter adesão.
Respondes em português moçambicano, empático e breve.
NUNCA alteras posologia — apenas reforças a prescrição médica.
Em caso de efeito adverso grave (rash difuso, hepatotoxicidade, acidose láctica), recomendas REFER urgente à unidade sanitária.`,

  malaria: `És um assistente para fluxo de malária em Moçambique.
Ajudas a interpretar resultado de TDR (teste diagnóstico rápido) e a decidir próximo passo (ACT, referência, etc.).
Respondes em português moçambicano, prático e curto.
Sempre que houver sinal de malária grave (convulsões, dificuldade respiratória, prostração), recomandas REFER urgente.`,

  maternal: `És um assistente de saúde materno-infantil em Moçambique.
Ajudas o técnico com dúvidas de pré-natal, sinais de perigo obstétrico e planeamento familiar.
Respondes em português moçambicano, claro e compassivo.
Qualquer sinal de perigo obstétrico (sangramento, convulsões, cefaleia intensa) = REFER urgente à maternidade.`,
} as const;

/**
 * Fallback local — usado quando a API falha (quota/região/chave).
 * Mantém o app utilizável offline-style.
 */
export function simulateGeminiResponse(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes("malária") || lower.includes("malaria")) {
    return "Triagem de malária: se TDR positivo em paciente não-grávida, iniciar ACT (arteméter+lumefantrina) oral. Se grávida, REFER à unidade sanitária para quinino IV. Sinais de malária grave: prostração, convulsões, dificuldade respiratória — REFER urgente.";
  }
  if (lower.includes("tb") || lower.includes("tuberculose")) {
    return "TB-DOT: confirmar adesão diária (observar ingestão). Efeitos adversos comuns: náuseas, urina alaranjada (rifampicina). Sinal de alerta: icterícia ou vómitos persistentes — suspender e REFER ao médico.";
  }
  if (lower.includes("arv") || lower.includes("hiv")) {
    return "Adesão ARV: tomar à mesma hora todos os dias, não falhar doses. Efeitos comuns: náuseas iniciais, sonhos vívidos (efavirenz). Se rash cutâneo difuso, SUSPENDER e ir à unidade sanitária imediatamente.";
  }
  if (lower.includes("gravidez") || lower.includes("pré-natal") || lower.includes("prenatal")) {
    return "Pré-natal: pelo menos 4 consultas (OMS). Sinais de perigo obstétrico: sangramento, cefaleia intensa, visão turva, convulsões, febre alta → REFER urgente à maternidade.";
  }
  return "Assistente Gemini indisponível (quota/região). Caso clínico: avaliar sinais vitais, história e exame físico. Se gravidade, REFER à unidade sanitária mais próxima. Para emergência, ligar 117.";
}

// ---- util ----

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
