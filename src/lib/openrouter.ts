/**
 * OpenRouter API Utility — MedWallet MZ
 * ---------------------------------------------------------------
 * OpenRouter é um gateway multi-modelo (OpenAI, Anthropic, Meta, Mistral,
 * Google, etc.) com free tier generoso e API compatível com OpenAI.
 *
 * IMPORTANTE — "Lovable AI":
 *  - Lovable (lovable.dev) é um construtor de sites no-code com IA,
 *    NÃO oferece API pública de inferência (chat/completions).
 *  - Por isso, OpenRouter é usado como 3ª camada de IA no lugar de
 *    "Lovable AI" — cumpre o mesmo papel: um provedor de inferência
 *    alternativo caso Gemini e Groq falhem.
 *
 * Modelos recomendados (Free Tier, set 2025):
 *   - meta-llama/llama-3.3-70b-instruct:free
 *   - mistralai/mistral-7b-instruct:free
 *   - google/gemma-2-9b-it:free
 *   - qwen/qwen-2.5-7b-instruct:free
 *
 * Estratégia resiliente:
 *  - API key via VITE_OPENROUTER_API_KEY (https://openrouter.ai/keys)
 *  - Se a chave estiver ausente, isConfigured() retorna false e o módulo
 *    é silenciosamente ignorado na cadeia de fallback da triagem.
 *  - Fallback automático quando:
 *      a) chave ausente / placeholder
 *      b) 401/403 (chave inválida ou bloqueada)
 *      c) 429 (quota excedida)
 *      d) erro de rede
 *  - Cabeçalhos HTTP-Referer e X-Title exigidos pela OpenRouter policy.
 */

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;

const BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

// Modelos free em ordem de preferência (capaz → rápido)
const CHAT_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "google/gemma-2-9b-it:free",
];

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterChatOptions {
  systemPrompt?: string;
  temperature?: number;
  maxOutputTokens?: number;
  history?: OpenRouterMessage[];
  /** Força JSON output usando response_format. */
  jsonMode?: boolean;
}

/** Verifica se a chave OpenRouter está configurada. */
export function isOpenRouterConfigured(): boolean {
  return Boolean(
    API_KEY &&
      !API_KEY.includes("your_") &&
      !API_KEY.includes("placeholder") &&
      API_KEY.length > 20,
  );
}

/**
 * Detecta erros conhecidos do OpenRouter:
 *  - 401/403: chave inválida ou região bloqueada
 *  - 429: quota excedida
 */
function isKnownError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("forbidden") ||
      msg.includes("quota") ||
      msg.includes("429") ||
      msg.includes("403") ||
      msg.includes("401")
    );
  }
  return false;
}

/**
 * Chamada centralizada com fallback de modelo.
 */
async function callOpenRouter(
  messages: OpenRouterMessage[],
  options: {
    temperature: number;
    maxOutputTokens: number;
    jsonMode?: boolean;
  },
): Promise<string> {
  if (!isOpenRouterConfigured()) {
    throw new Error("OPENROUTER_NOT_CONFIGURED");
  }

  let lastError: unknown = null;

  for (const model of CHAT_MODELS) {
    try {
      const body: Record<string, unknown> = {
        model,
        messages,
        temperature: options.temperature,
        max_tokens: options.maxOutputTokens,
        top_p: 0.95,
      };
      if (options.jsonMode) {
        body.response_format = { type: "json_object" };
      }

      const response = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
          // OpenRouter pede estes cabeçalhos para ranking/atribuição
          "HTTP-Referer":
            (typeof window !== "undefined" && window.location?.origin) ||
            "https://medwallet.mz",
          "X-Title": "MedWallet MZ",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        const errMsg =
          (errorPayload as { error?: { message?: string } }).error?.message ??
          response.statusText;
        throw new Error(`OpenRouter API ${response.status}: ${errMsg}`);
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      if (text && typeof text === "string") return text.trim();
      throw new Error("Resposta vazia do OpenRouter");
    } catch (error) {
      lastError = error;
      // Se for 401/403/429, não adianta tentar outro modelo (mesma chave)
      if (isKnownError(error)) break;
      continue;
    }
  }

  throw lastError ?? new Error("OPENROUTER_UNKNOWN_ERROR");
}

/**
 * Chat com system prompt + histórico opcional.
 *
 * @example
 * const reply = await openRouterChat(
 *   "Paciente com febre 39°C há 2 dias.",
 *   { systemPrompt: "És um enfermeiro moçambicano..." }
 * );
 */
export async function openRouterChat(
  prompt: string,
  options: OpenRouterChatOptions = {},
): Promise<string> {
  const {
    systemPrompt,
    temperature = 0.4,
    maxOutputTokens = 600,
    history = [],
    jsonMode = false,
  } = options;

  const messages: OpenRouterMessage[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  for (const m of history) {
    messages.push(m);
  }
  messages.push({ role: "user", content: prompt });

  return callOpenRouter(messages, { temperature, maxOutputTokens, jsonMode });
}

/**
 * Resposta JSON estruturada com fallback.
 */
export async function openRouterStructured<T>(
  prompt: string,
  options: OpenRouterChatOptions & { fallback: T },
): Promise<T> {
  const { fallback, ...rest } = options;
  const enforcedPrompt = `${prompt}\n\nResponde APENAS com JSON válido, sem markdown, sem texto adicional. O JSON deve ser um objeto (não array).`;

  try {
    const text = await openRouterChat(enforcedPrompt, {
      ...rest,
      jsonMode: true,
    });
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback;
    return JSON.parse(jsonMatch[0]) as T;
  } catch {
    return fallback;
  }
}

/**
 * Fallback local — usado quando OpenRouter falha.
 * Mantém o app utilizável mesmo sem qualquer cloud IA.
 */
export function simulateOpenRouterResponse(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes("malária") || lower.includes("malaria")) {
    return "Triagem de malária: se TDR positivo em paciente não-grávida, iniciar ACT oral. Se grávida, REFER à unidade sanitária para quinino IV. Sinais de malária grave: prostração, convulsões, dificuldade respiratória — REFER urgente.";
  }
  if (lower.includes("tb") || lower.includes("tuberculose")) {
    return "TB-DOT: confirmar adesão diária (observar ingestão). Efeitos adversos comuns: náuseas, urina alaranjada (rifampicina). Sinal de alerta: icterícia ou vómitos persistentes — suspender e REFER ao médico.";
  }
  if (lower.includes("arv") || lower.includes("hiv")) {
    return "Adesão ARV: tomar à mesma hora todos os dias, não falhar doses. Efeitos comuns: náuseas iniciais, sonhos vívidos (efavirenz). Se rash cutâneo difuso, SUSPENDER e ir à unidade sanitária imediatamente.";
  }
  if (
    lower.includes("gravidez") ||
    lower.includes("pré-natal") ||
    lower.includes("prenatal")
  ) {
    return "Pré-natal: pelo menos 4 consultas (OMS). Sinais de perigo obstétrico: sangramento, cefaleia intensa, visão turva, convulsões, febre alta → REFER urgente à maternidade.";
  }
  return "Assistente IA indisponível (cloud). Caso clínico: avaliar sinais vitais, história e exame físico. Se gravidade, REFER à unidade sanitária mais próxima. Para emergência, ligar 117.";
}
