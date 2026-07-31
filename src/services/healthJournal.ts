/**
 * Health Journal Service
 * Daily wellness diary with AI insights via Gemini.
 */

import { supabase } from '@/integrations/supabase/client';

// Cliente sem tipagem estrita para tabelas ainda não presentes nos tipos gerados.
const sb: any = supabase;
import { geminiChat, isGeminiConfigured } from '@/lib/gemini';

export interface JournalEntry {
  id?: string;
  user_id?: string;
  entry_date?: string;
  mood: number; // 1-5
  energy: number; // 1-5
  sleep_hours: number;
  sleep_quality: number; // 1-5
  pain_level: number; // 0-10
  symptoms: string[];
  notes?: string;
  gratitude?: string;
  weather?: string;
  location?: string;
  ai_insight?: string;
  ai_insight_generated_at?: string;
}

export interface JournalStats {
  avg_mood: number;
  avg_energy: number;
  avg_sleep_hours: number;
  avg_sleep_quality: number;
  avg_pain_level: number;
  total_entries: number;
  top_symptoms: string[];
}

function todayISO(): string { return new Date().toISOString().split('T')[0]; }
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export async function addEntry(userId: string, entry: Omit<JournalEntry, 'id' | 'user_id' | 'entry_date'>): Promise<JournalEntry> {
  const { data, error } = await sb
    .from('health_journal')
    .upsert({ user_id: userId, entry_date: todayISO(), ...entry }, { onConflict: 'user_id,entry_date' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as JournalEntry;
}

export async function getEntry(userId: string, date?: string): Promise<JournalEntry | null> {
  const d = date || todayISO();
  const { data, error } = await sb
    .from('health_journal')
    .select('*')
    .eq('user_id', userId)
    .eq('entry_date', d)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as JournalEntry | null;
}

export async function getEntries(userId: string, startDate: string, endDate: string): Promise<JournalEntry[]> {
  const { data, error } = await sb
    .from('health_journal')
    .select('*')
    .eq('user_id', userId)
    .gte('entry_date', startDate)
    .lte('entry_date', endDate)
    .order('entry_date', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as JournalEntry[];
}

export async function getWeeklyEntries(userId: string): Promise<JournalEntry[]> {
  return getEntries(userId, daysAgo(6), todayISO());
}

export async function generateWeeklyInsight(userId: string, language: string = 'pt'): Promise<string> {
  const entries = await getWeeklyEntries(userId);
  if (entries.length === 0) return '';

  // Re-use existing insight if generated recently
  const latestInsight = entries.find(e => e.ai_insight);
  if (latestInsight?.ai_insight_generated_at) {
    const daysSince = (Date.now() - new Date(latestInsight.ai_insight_generated_at).getTime()) / 86400000;
    if (daysSince < 7 && latestInsight.ai_insight) return latestInsight.ai_insight;
  }

  const moodLabels = ['muito mau', 'mau', 'normal', 'bom', 'muito bom'];
  const summary = entries.map(e =>
    `${e.entry_date}: humor ${e.mood}/5 (${moodLabels[e.mood - 1]}), energia ${e.energy}/5, sono ${e.sleep_hours}h (qualidade ${e.sleep_quality}/5), dor ${e.pain_level}/10${e.symptoms?.length ? `, sintomas: ${e.symptoms.join(', ')}` : ''}${e.gratitude ? `, gratidão: "${e.gratitude}"` : ''}`
  ).join('\n');

  const langInstruction = language === 'en'
    ? 'Respond in English, warm and personal tone. Max 4 sentences.'
    : language === 'sw'
    ? 'Jibu kwa Kiswahili, sauti ya joto na ya kibinafsi. Sentensi 4 zinatosha.'
    : 'Responde em português moçambicano, tom caloroso e pessoal. Máx 4 frases.';

  if (!isGeminiConfigured()) {
    return language === 'en'
      ? `This week you logged ${entries.length} entries. Your average mood was ${(entries.reduce((s, e) => s + e.mood, 0) / entries.length).toFixed(1)}/5. Keep journaling!`
      : `Esta semana registaste ${entries.length} entradas. O teu humor médio foi ${(entries.reduce((s, e) => s + e.mood, 0) / entries.length).toFixed(1)}/5. Continua a registar!`;
  }

  try {
    const insight = await geminiChat(
      `Analisa estes 7 dias de diário e dá uma perspetiva personalizada (2-4 frases, empática e encorajadora):\n\n${summary}`,
      { systemPrompt: `És um assistente de bem-estar. ${langInstruction}`, temperature: 0.7, maxOutputTokens: 250 }
    );

    // Persist insight on today's entry
    const todayEntry = await getEntry(userId);
    if (todayEntry?.id) {
      await sb.from('health_journal').update({
        ai_insight: insight,
        ai_insight_generated_at: new Date().toISOString(),
      }).eq('id', todayEntry.id);
    }
    return insight;
  } catch (err) {
    console.error('Weekly insight error:', err);
    return '';
  }
}

export async function getStreak(userId: string): Promise<number> {
  let streak = 0;
  let checkDate = new Date();
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const entry = await getEntry(userId, dateStr);
    if (entry) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else break;
  }
  return streak;
}

export async function getStats(userId: string, periodDays: number = 30): Promise<JournalStats> {
  const entries = await getEntries(userId, daysAgo(periodDays - 1), todayISO());
  const n = entries.length;
  if (n === 0) {
    return { avg_mood: 0, avg_energy: 0, avg_sleep_hours: 0, avg_sleep_quality: 0, avg_pain_level: 0, total_entries: 0, top_symptoms: [] };
  }
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const symptomCounts: Record<string, number> = {};
  entries.forEach(e => (e.symptoms || []).forEach(s => { symptomCounts[s] = (symptomCounts[s] || 0) + 1; }));
  const topSymptoms = Object.entries(symptomCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s]) => s);
  return {
    avg_mood: Math.round(sum(entries.map(e => e.mood)) / n * 10) / 10,
    avg_energy: Math.round(sum(entries.map(e => e.energy)) / n * 10) / 10,
    avg_sleep_hours: Math.round(sum(entries.map(e => e.sleep_hours)) / n * 10) / 10,
    avg_sleep_quality: Math.round(sum(entries.map(e => e.sleep_quality)) / n * 10) / 10,
    avg_pain_level: Math.round(sum(entries.map(e => e.pain_level)) / n * 10) / 10,
    total_entries: n,
    top_symptoms: topSymptoms,
  };
}
