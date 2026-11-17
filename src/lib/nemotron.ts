/**
 * Cliente do gateway nemotron-ai (NVIDIA NIM) — F49→F52.
 * A key NVIDIA vive só nos secrets do gateway; o cliente fala com o gateway
 * via anon key Supabase (nível de segurança igual às restantes functions).
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export class NemotronUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NemotronUnavailableError';
  }
}

/** Disponível = env configurada (o gateway pode ainda não estar deployado → degradação no catch do chamador). */
export function isNemotronAvailable(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

export interface NemotronImage {
  mime?: string;
  /** base64 SEM o prefixo data: */
  b64: string;
}

export interface NemotronChatOptions {
  /** Modo do gateway: chat | triage | explain_rx | interactions | health_insights | price_insights | raw */
  mode?: string;
  /** System prompt custom (complementa a persona do modo; único com mode 'raw') */
  systemPrompt?: string;
  /** Contexto real do utilizador (dados da app) — entra no system prompt */
  context?: string;
  /** Mensagem do utilizador */
  userMessage?: string;
  /** Histórico em formato OpenAI: [{role:'user'|'assistant', content}] */
  history?: Array<{ role: string; content: string }>;
  /** Imagens (máx. 3) — activa o modelo de visão no gateway */
  images?: NemotronImage[];
  /** Áudio (F51, modelo omni): wav/mp3 — base64 OU URL que o gateway descarrega (ex.: signed URL do storage) */
  audio?: { url?: string; b64?: string; format?: 'wav' | 'mp3' };
  /** Limita o reasoning (F51: 512 ≈ respostas rápidas — flagship 4.3s → 0.6-0.8s) */
  reasoning_budget?: number;
  language?: string;
  temperature?: number;
  max_tokens?: number;
  /** AbortSignal externo (ex.: cancelar ao fechar o chat) */
  signal?: AbortSignal;
}

export interface NemotronResult {
  text: string;
  reasoning?: string;
  model: string;
  provider: 'nemotron';
}

function endpoint(): string {
  if (!SUPABASE_URL) throw new NemotronUnavailableError('VITE_SUPABASE_URL ausente');
  return `${SUPABASE_URL}/functions/v1/nemotron-ai`;
}

async function post(body: Record<string, unknown>, signal?: AbortSignal): Promise<Response> {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new NemotronUnavailableError('credenciais ausentes');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  const onOuterAbort = () => controller.abort();
  signal?.addEventListener('abort', onOuterAbort, { once: true });
  try {
    const resp = await fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (resp.status === 404) throw new NemotronUnavailableError('function não deployada');
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      if (resp.status === 502 || resp.status === 503) throw new NemotronUnavailableError(`gateway ${resp.status} ${detail.slice(0, 120)}`);
      throw new Error(`nemotron-ai HTTP ${resp.status}: ${detail.slice(0, 200)}`);
    }
    return resp;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onOuterAbort);
  }
}

/** Resposta completa (não-streaming) via gateway Nemotron. */
export async function nemotronChat(opts: NemotronChatOptions): Promise<NemotronResult> {
  const resp = await post(
    {
      mode: opts.mode ?? 'chat',
      systemPrompt: opts.systemPrompt,
      context: opts.context,
      userMessage: opts.userMessage,
      history: opts.history,
      images: opts.images,
      audio: opts.audio,
      reasoning_budget: opts.reasoning_budget,
      language: opts.language,
      temperature: opts.temperature,
      max_tokens: opts.max_tokens,
      stream: false,
    },
    opts.signal,
  );
  const data = await resp.json();
  return { text: data.text ?? '', reasoning: data.reasoning, model: data.model ?? 'nemotron', provider: 'nemotron' };
}

/** Streaming token-a-token: cede {content, reasoning} por chunk SSE. */
export async function* nemotronChatStream(opts: NemotronChatOptions): AsyncGenerator<{ content: string; reasoning: string }> {
  const resp = await post(
    {
      mode: opts.mode ?? 'chat',
      systemPrompt: opts.systemPrompt,
      context: opts.context,
      userMessage: opts.userMessage,
      history: opts.history,
      images: opts.images,
      audio: opts.audio,
      reasoning_budget: opts.reasoning_budget,
      language: opts.language,
      temperature: opts.temperature,
      max_tokens: opts.max_tokens,
      stream: true,
    },
    opts.signal,
  );

  if (!resp.body) throw new NemotronUnavailableError('sem corpo de resposta');
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const json = JSON.parse(payload);
        const delta = json?.choices?.[0]?.delta ?? {};
        const content: string = delta.content ?? '';
        const reasoning: string = delta.reasoning_content ?? '';
        if (content || reasoning) yield { content, reasoning };
      } catch {
        // fragmento SSE incompleto/keepalive — ignora
      }
    }
  }
}

/* ── Embeddings (F50): texto/imagem → vector 4096 para busca semântica ── */

export interface NemotronEmbedOptions {
  input: string[];
  input_type?: 'query' | 'passage';
  signal?: AbortSignal;
}

/** Devolve um vector por input (mesma ordem). Lança NemotronUnavailableError se o gateway não existir. */
export async function nemotronEmbed(opts: NemotronEmbedOptions): Promise<number[][]> {
  const resp = await post(
    {
      op: 'embed',
      input: opts.input.slice(0, 16),
      input_type: opts.input_type ?? 'passage',
    },
    opts.signal,
  );
  const data = await resp.json();
  const embeddings: number[][] = data?.embeddings ?? [];
  if (!Array.isArray(embeddings) || embeddings.length === 0) {
    throw new Error('nemotron-ai: embeddings vazios');
  }
  return embeddings;
}
