/**
 * Groq API Utility — MedWallet MZ
 * ---------------------------------------------------------------
 * Groq é ultra-rápido (inferência em LPU) e tem free tier generoso.
 * Compatível com OpenAI SDK (endpoint /openai/v1/chat/completions).
 *
 * Modelos suportados (verificar sempre via /v1/models):
 *   - llama-3.3-70b-versatile  (mais capaz)
 *   - llama-3.1-8b-instant     (mais rápido)
 *   - mixtral-8x7b-32768       (contexto longo)
 *   - gemma2-9b-it             (leve)
 *
 * Estratégia resiliente:
 *  - API key via VITE_GROQ_API_KEY (https://console.groq.com/keys)
 *  - Fallback automático quando:
 *      a) chave ausente
 *      b) 403 Forbidden (região bloqueada pela Cloudflare do Groq)
 *      c) 429 quota excedida
 *      d) erro de rede
 */

const API_KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined;

const BASE_URL = "https://api.groq.com/openai/v1/chat/completions";

// Modelos em ordem de preferência (capaz → rápido)
const CHAT_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
];

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqChatOptions {
  systemPrompt?: string;
  temperature?: number;
  maxOutputTokens?: number;
  history?: GroqMessage[];
  /** Permite forçar JSON output usando response_format. */
  jsonMode?: boolean;
}

/** Verifica se a chave Groq está configurada. */
export function isGroqConfigured(): boolean {
  return Boolean(
    API_KEY && !API_KEY.includes("your_") && API_KEY.startsWith("gsk_"),
  );
}

/**
 * Detecta erros conhecidos do Groq:
 *  - 403 Forbidden: região bloqueada (Cloudflare do Groq)
 *  - 429 Too Many Requests: quota excedida
 *  - 401: chave inválida
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
async function callGroq(
  messages: GroqMessage[],
  options: {
    temperature: number;
    maxOutputTokens: number;
    jsonMode?: boolean;
  },
): Promise<string> {
  if (!isGroqConfigured()) {
    throw new Error("GROQ_NOT_CONFIGURED");
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
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        const errMsg =
          (errorPayload as { error?: { message?: string } }).error?.message ??
          response.statusText;
        throw new Error(`Groq API ${response.status}: ${errMsg}`);
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      if (text && typeof text === "string") return text.trim();
      throw new Error("Resposta vazia do Groq");
    } catch (error) {
      lastError = error;
      // Se for 403/429/401, não adianta tentar outro modelo
      if (isKnownError(error)) break;
      continue;
    }
  }

  throw lastError ?? new Error("GROQ_UNKNOWN_ERROR");
}

/**
 * Chat com system prompt + histórico opcional.
 *
 * @example
 * const reply = await groqChat(
 *   "Paciente com febre 39°C há 2 dias. Próximo passo?",
 *   { systemPrompt: "És um enfermeiro moçambicano..." }
 * );
 */
export async function groqChat(
  prompt: string,
  options: GroqChatOptions = {},
): Promise<string> {
  const {
    systemPrompt,
    temperature = 0.4,
    maxOutputTokens = 600,
    history = [],
    jsonMode = false,
  } = options;

  const messages: GroqMessage[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  for (const m of history) {
    messages.push(m);
  }
  messages.push({ role: "user", content: prompt });

  return callGroq(messages, { temperature, maxOutputTokens, jsonMode });
}

/**
 * Resposta JSON estruturada com fallback.
 */
export async function groqStructured<T>(
  prompt: string,
  options: GroqChatOptions & { fallback: T },
): Promise<T> {
  const { fallback, ...rest } = options;
  const enforcedPrompt = `${prompt}\n\nResponde APENAS com JSON válido, sem markdown, sem texto adicional. O JSON deve ser um objeto (não array).`;

  try {
    const text = await groqChat(enforcedPrompt, {
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
 * Fallback local — usado quando Groq falha (região/quota/chave).
 * Mantém o app utilizável.
 */
export function simulateGroqResponse(prompt: string): string {
  // Reaproveita a mesma simulação do Gemini para consistência
  // (importado dinamicamente para evitar ciclo)
  // Implementação local para manter independência:
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
  if (lower.includes("gravidez") || lower.includes("pré-natal") || lower.includes("prenatal")) {
    return "Pré-natal: pelo menos 4 consultas (OMS). Sinais de perigo obstétrico: sangramento, cefaleia intensa, visão turva, convulsões, febre alta → REFER urgente à maternidade.";
  }
  return "Assistente IA indisponível (região/quota). Caso clínico: avaliar sinais vitais, história e exame físico. Se gravidade, REFER à unidade sanitária mais próxima. Para emergência, ligar 117.";
}
