/**
 * F53 — Inteligência da medicação via gateway nemotron-ai (NVIDIA NIM).
 * Liga os três modos que faltavam: interactions, explain_rx, health_insights.
 * Todas as funções degradam a null em qualquer falha — a UI esconde, nunca quebra.
 * Não substituem médico/farmacêutico (personas do gateway já impõem isso).
 */
import { nemotronChat, isNemotronAvailable } from '@/lib/nemotron';
import { logger } from '@/lib/logger';

/* ── Interações ─────────────────────────────────────────────────────────── */

export interface InteractionPair {
  a: string;
  b: string;
  severity: string;
  note: string;
}

export interface InteractionsResult {
  risk: 'none' | 'low' | 'moderate' | 'high';
  pairs: InteractionPair[];
  note: string;
}

const RISKS: InteractionsResult['risk'][] = ['none', 'low', 'moderate', 'high'];

/** Analisa interações entre as medicações actuais (modo 'interactions' do gateway). */
export async function checkInteractions(
  meds: Array<{ name: string; dosage?: string | null }>,
): Promise<InteractionsResult | null> {
  if (!isNemotronAvailable() || meds.length < 2) return null;
  try {
    const list = meds
      .map((m) => `- ${m.name}${m.dosage ? ` ${m.dosage}` : ''}`)
      .join('\n');
    const res = await nemotronChat({
      mode: 'interactions',
      userMessage: `Medicamentos actuais do paciente:\n${list}`,
      max_tokens: 700,
      temperature: 0.3,
      reasoning_budget: 512,
    });
    const match = res.text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as Partial<InteractionsResult>;
    if (!RISKS.includes(parsed.risk as InteractionsResult['risk'])) return null;
    return {
      risk: parsed.risk as InteractionsResult['risk'],
      note: String(parsed.note ?? ''),
      pairs: (Array.isArray(parsed.pairs) ? parsed.pairs : [])
        .slice(0, 6)
        .map((p) => ({
          a: String(p.a ?? ''),
          b: String(p.b ?? ''),
          severity: String(p.severity ?? ''),
          note: String(p.note ?? ''),
        })),
    };
  } catch (err) {
    logger.warn('[medIntelligence] checkInteractions falhou:', { error: err });
    return null;
  }
}

/* ── Explicar medicamento ───────────────────────────────────────────────── */

/** Explicação em linguagem simples (modo 'explain_rx' do gateway). */
export async function explainMedication(
  name: string,
  dosage?: string | null,
): Promise<string | null> {
  if (!isNemotronAvailable()) return null;
  try {
    const res = await nemotronChat({
      mode: 'explain_rx',
      userMessage: `Explica o medicamento: ${name}${dosage ? ` (${dosage})` : ''}.`,
      max_tokens: 500,
      temperature: 0.5,
      reasoning_budget: 512,
    });
    const text = res.text.trim();
    return text.length > 20 ? text : null;
  } catch (err) {
    logger.warn('[medIntelligence] explainMedication falhou:', { error: err });
    return null;
  }
}

/* ── Insights semanais ──────────────────────────────────────────────────── */

export interface HealthInsight {
  title: string;
  body: string;
  action: string;
}

export interface InsightsResult {
  summary: string;
  insights: HealthInsight[];
  tone: 'positive' | 'neutral' | 'attention';
}

const TONES: InsightsResult['tone'][] = ['positive', 'neutral', 'attention'];

/**
 * Resumo semanal com padrões reais da adesão (modo 'health_insights').
 * Só dados que a app já tem — nada inventado pelo modelo (persona do modo proíbe).
 */
export async function weeklyHealthInsights(data: {
  adherencePct: number | null;
  taken: number;
  planned: number;
  streak: number;
  bestStreak: number;
  meds: string[];
  missedReasons: string[];
}): Promise<InsightsResult | null> {
  if (!isNemotronAvailable()) return null;
  try {
    const context = [
      `Adesão últimos 7 dias: ${data.adherencePct == null ? 'sem dados' : `${data.adherencePct}%`} (${data.taken} de ${data.planned} tomas)`,
      `Sequência actual: ${data.streak} dias · melhor sequência (30d): ${data.bestStreak} dias`,
      data.meds.length ? `Medicamentos: ${data.meds.join(', ')}` : '',
      data.missedReasons.length
        ? `Motivos de tomas perdidas (recentes): ${data.missedReasons.join('; ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
    const res = await nemotronChat({
      mode: 'health_insights',
      userMessage: `Dados reais da semana do utilizador:\n${context}`,
      max_tokens: 800,
      temperature: 0.6,
      reasoning_budget: 512,
    });
    const match = res.text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as Partial<InsightsResult>;
    if (!TONES.includes(parsed.tone as InsightsResult['tone'])) return null;
    return {
      summary: String(parsed.summary ?? ''),
      tone: parsed.tone as InsightsResult['tone'],
      insights: (Array.isArray(parsed.insights) ? parsed.insights : [])
        .slice(0, 3)
        .map((i) => ({
          title: String(i.title ?? ''),
          body: String(i.body ?? ''),
          action: String(i.action ?? ''),
        })),
    };
  } catch (err) {
    logger.warn('[medIntelligence] weeklyHealthInsights falhou:', { error: err });
    return null;
  }
}
