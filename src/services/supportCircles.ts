/**
 * Support Circles Service
 * Peer-to-peer support groups by condition, with AI moderation
 * that flags dangerous medical advice, self-harm, or spam.
 *
 * Tables: support_circles, support_circle_members, support_circle_messages
 */

import { supabase as typedSupabase } from '@/integrations/supabase/client';
// Cast para acesso a tabelas ainda não presentes nos tipos gerados
const supabase = typedSupabase as any;
import { geminiStructured, isGeminiConfigured } from '@/lib/gemini';

export interface SupportCircle {
  id?: string;
  name: string;
  description?: string;
  condition_tag: string;
  country_code?: string;
  language?: string;
  is_private?: boolean;
  require_approval?: boolean;
  max_members?: number;
  ai_moderation_enabled?: boolean;
  ai_guidelines?: string;
  streak_bonus_enabled?: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  // Computed
  members_count?: number;
  messages_count?: number;
  is_member?: boolean;
  last_message_at?: string;
  last_message_preview?: string;
}

export interface CircleMember {
  id?: string;
  circle_id: string;
  user_id: string;
  role: 'member' | 'moderator' | 'admin';
  joined_at?: string;
  last_read_at?: string;
  is_muted?: boolean;
  // Joined
  full_name?: string;
  avatar_color?: string;
}

export type ModerationStatus = 'pending' | 'approved' | 'flagged' | 'rejected';

export interface CircleMessage {
  id?: string;
  circle_id: string;
  user_id: string;
  content: string;
  ai_moderation_status?: ModerationStatus;
  ai_moderation_reason?: string;
  ai_categories?: string[];
  is_anonymous?: boolean;
  reactions?: Record<string, number>;
  reply_to?: string;
  created_at?: string;
  // Joined
  author_name?: string;
  author_color?: string;
}

export interface ModerationResult {
  status: ModerationStatus;
  reason: string;
  categories: string[];
}

export const CONDITION_TAGS = [
  { tag: 'diabetes', label: 'Diabetes', emoji: '🩸', color: '#EF4444' },
  { tag: 'hypertension', label: 'Hipertensão', emoji: '❤️', color: '#EC4899' },
  { tag: 'mental_health', label: 'Saúde Mental', emoji: '🧠', color: '#8B5CF6' },
  { tag: 'maternal', label: 'Maternidade', emoji: '🤰', color: '#F59E0B' },
  { tag: 'cancer', label: 'Oncologia', emoji: '🎗️', color: '#3B82F6' },
  { tag: 'hiv', label: 'VIH/SIDA', emoji: '🟢', color: '#10B981' },
  { tag: 'tb', label: 'Tuberculose', emoji: '🫁', color: '#06B6D4' },
  { tag: 'chronic_pain', label: 'Dor Crónica', emoji: '💪', color: '#F97316' },
  { tag: 'caregivers', label: 'Cuidadores', emoji: '🤝', color: '#84CC16' },
  { tag: 'nutrition', label: 'Nutrição', emoji: '🥗', color: '#22C55E' },
  { tag: 'elderly', label: 'Idosos', emoji: '👵', color: '#A855F7' },
  { tag: 'recovery', label: 'Recuperação', emoji: '🌱', color: '#14B8A6' },
];

/* ---------- AI Moderation ---------- */

/**
 * Use Gemini to moderate a message before posting.
 * Returns whether to approve, flag, or reject — and why.
 *
 * Categories checked:
 *  - self_harm: suicidal ideation, self-injury
 *  - medical_advice: specific dosage/prescription instructions
 *  - spam: promotional content, repeated messages
 *  - harassment: attacks on other members
 *  - misinformation: false health claims (e.g. "vaccines cause autism")
 *  - crisis: needs immediate crisis resources
 */
export async function moderateMessage(content: string, language: string = 'pt'): Promise<ModerationResult> {
  // Quick keyword check first (instant)
  const lower = content.toLowerCase();
  const crisisKeywords = ['suicid', 'matar-me', 'tirar a vida', 'acabar com tudo', 'cut myself', 'end it all', 'suicidio', 'nao quero viver', 'acabar com a minha vida'];
  if (crisisKeywords.some((kw) => lower.includes(kw))) {
    return {
      status: 'flagged',
      reason: 'Conteúdo indica possível crise emocional. Recursos de apoio foram fornecidos.',
      categories: ['crisis', 'self_harm'],
    };
  }

  // If Gemini not configured, allow (with note)
  if (!isGeminiConfigured()) {
    return { status: 'approved', reason: 'Sem moderação IA (Gemini não configurado)', categories: [] };
  }

  const prompt = `Modera esta mensagem de um grupo de apoio à saúde. Categoriza e decide:
- Aprovar: partilha de experiência, dicas gerais de bem-estar, suporte emocional, perguntas
- Sinalizar: contém possível crise emocional, conselho médico específico (dosagem, prescrição), mas pode ficar visível com aviso
- Rejeitar: spam, assédio, desinformação perigosa, conteúdo ilegal

Mensagem: "${content}"

Responde APENAS com JSON: {"status": "approved|flagged|rejected", "reason": "explicação curta", "categories": ["lista"]}`;

  return await geminiStructured<ModerationResult>(prompt, {
    fallback: { status: 'approved', reason: 'Moderação IA indisponível', categories: [] },
    temperature: 0.1,
    maxOutputTokens: 200,
  });
}

/* ---------- Circles CRUD ---------- */

export async function getCircles(opts?: { countryCode?: string; conditionTag?: string; userId?: string }): Promise<SupportCircle[]> {
  let q = supabase.from('support_circles').select('*');
  if (opts?.countryCode) q = q.or(`country_code.eq.${opts.countryCode},country_code.is.null`);
  if (opts?.conditionTag) q = q.eq('condition_tag', opts.conditionTag);
  q = q.order('created_at', { ascending: false });
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  // Compute members count + last message + is_member
  const circles = data ?? [];
  if (circles.length === 0) return [];

  const circleIds = circles.map((c) => c.id);

  // Get member counts
  const { data: memberCounts } = await supabase
    .from('support_circle_members')
    .select('circle_id')
    .in('circle_id', circleIds);
  const countMap: Record<string, number> = {};
  for (const m of memberCounts ?? []) {
    countMap[m.circle_id] = (countMap[m.circle_id] ?? 0) + 1;
  }

  // Get last message preview per circle
  const { data: lastMessages } = await supabase
    .from('support_circle_messages')
    .select('circle_id, content, created_at')
    .in('circle_id', circleIds)
    .order('created_at', { ascending: false });
  const lastMsgMap: Record<string, any> = {};
  for (const m of lastMessages ?? []) {
    if (!lastMsgMap[m.circle_id]) lastMsgMap[m.circle_id] = m;
  }

  // Get user membership
  let userMembership = new Set<string>();
  if (opts?.userId) {
    const { data: myMemberships } = await supabase
      .from('support_circle_members')
      .select('circle_id')
      .eq('user_id', opts.userId)
      .in('circle_id', circleIds);
    userMembership = new Set((myMemberships ?? []).map((m) => m.circle_id));
  }

  return circles.map((c) => ({
    ...c,
    members_count: countMap[c.id] ?? 0,
    last_message_at: lastMsgMap[c.id]?.created_at,
    last_message_preview: lastMsgMap[c.id]?.content?.slice(0, 100),
    is_member: userMembership.has(c.id),
  }));
}

export async function getCircleById(id: string, userId?: string): Promise<SupportCircle | null> {
  const { data, error } = await supabase.from('support_circles').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  // Compute member count
  const { count } = await supabase
    .from('support_circle_members')
    .select('*', { count: 'exact', head: true })
    .eq('circle_id', id);

  let isMember = false;
  if (userId) {
    const { data: myMembership } = await supabase
      .from('support_circle_members')
      .select('id, role')
      .eq('circle_id', id)
      .eq('user_id', userId)
      .maybeSingle();
    isMember = Boolean(myMembership);
  }

  return { ...data, members_count: count ?? 0, is_member: isMember };
}

export async function createCircle(userId: string, circle: Omit<SupportCircle, 'id' | 'created_by' | 'created_at' | 'updated_at'>): Promise<SupportCircle> {
  const { data, error } = await supabase
    .from('support_circles')
    .insert({ ...circle, created_by: userId })
    .select()
    .single();
  if (error) throw new Error(error.message);

  // Auto-join creator as admin
  await supabase.from('support_circle_members').insert({
    circle_id: data.id,
    user_id: userId,
    role: 'admin',
  });

  return data;
}

/* ---------- Membership ---------- */

export async function joinCircle(circleId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('support_circle_members')
    .insert({ circle_id: circleId, user_id: userId, role: 'member' });
  if (error) {
    if (error.code === '23505') return; // already member
    throw new Error(error.message);
  }
}

export async function leaveCircle(circleId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('support_circle_members')
    .delete()
    .eq('circle_id', circleId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function getMyCircles(userId: string): Promise<SupportCircle[]> {
  const { data: memberships, error } = await supabase
    .from('support_circle_members')
    .select('circle_id')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  if (!memberships || memberships.length === 0) return [];

  const circleIds = memberships.map((m) => m.circle_id);
  const { data: circles, error: e2 } = await supabase
    .from('support_circles')
    .select('*')
    .in('id', circleIds)
    .order('created_at', { ascending: false });
  if (e2) throw new Error(e2.message);

  // Get last message per circle
  const { data: lastMsgs } = await supabase
    .from('support_circle_messages')
    .select('circle_id, content, created_at')
    .in('circle_id', circleIds)
    .order('created_at', { ascending: false });

  const lastMsgMap: Record<string, any> = {};
  for (const m of lastMsgs ?? []) {
    if (!lastMsgMap[m.circle_id]) lastMsgMap[m.circle_id] = m;
  }

  return (circles ?? []).map((c) => ({
    ...c,
    is_member: true,
    last_message_at: lastMsgMap[c.id]?.created_at,
    last_message_preview: lastMsgMap[c.id]?.content?.slice(0, 100),
  }));
}

/* ---------- Messages ---------- */

export async function getMessages(circleId: string, limit = 50, before?: string): Promise<CircleMessage[]> {
  let q = supabase
    .from('support_circle_messages')
    .select(`
      *,
      author:auth.users!user_id(full_name)
    `)
    .eq('circle_id', circleId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (before) q = q.lt('created_at', before);

  const { data, error } = await q;
  if (error) {
    // Fallback without join (auth.users not always accessible from client)
    const { data: d2, error: e2 } = await supabase
      .from('support_circle_messages')
      .select('*')
      .eq('circle_id', circleId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (e2) throw new Error(e2.message);
    return (d2 ?? []).map((m) => ({ ...m, author_name: m.is_anonymous ? 'Anónimo' : 'Membro' }));
  }
  return (data ?? []).map((m) => ({
    ...m,
    author_name: m.is_anonymous ? 'Anónimo' : (m.author?.full_name ?? 'Membro'),
  }));
}

export async function sendMessage(
  circleId: string,
  userId: string,
  content: string,
  opts: { isAnonymous?: boolean; replyTo?: string; language?: string } = {},
): Promise<{ message: CircleMessage | null; moderation: ModerationResult }> {
  // 1. Moderate first
  const moderation = await moderateMessage(content, opts.language);

  // 2. If rejected, don't post
  if (moderation.status === 'rejected') {
    return { message: null, moderation };
  }

  // 3. Insert message
  const { data, error } = await supabase
    .from('support_circle_messages')
    .insert({
      circle_id: circleId,
      user_id: userId,
      content,
      ai_moderation_status: moderation.status,
      ai_moderation_reason: moderation.reason,
      ai_categories: moderation.categories,
      is_anonymous: opts.isAnonymous ?? false,
      reply_to: opts.replyTo ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  return { message: data, moderation };
}

export async function reactToMessage(messageId: string, emoji: string): Promise<void> {
  // Read current reactions, increment, save
  const { data: msg } = await supabase
    .from('support_circle_messages')
    .select('reactions')
    .eq('id', messageId)
    .maybeSingle();
  if (!msg) return;
  const reactions = (msg.reactions as Record<string, number>) ?? {};
  reactions[emoji] = (reactions[emoji] ?? 0) + 1;
  await supabase.from('support_circle_messages').update({ reactions }).eq('id', messageId);
}

export async function deleteMessage(messageId: string): Promise<void> {
  const { error } = await supabase.from('support_circle_messages').delete().eq('id', messageId);
  if (error) throw new Error(error.message);
}

export async function markCircleRead(circleId: string, userId: string): Promise<void> {
  await supabase
    .from('support_circle_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('circle_id', circleId)
    .eq('user_id', userId);
}

/* ---------- Crisis Resources ---------- */

export const CRISIS_RESOURCES: Record<string, { country: string; hotlines: { name: string; number: string }[] }> = {
  MZ: {
    country: 'Moçambique',
    hotlines: [
      { name: 'Linha Verde MISAU', number: '847' },
      { name: 'Emergência médica', number: '117' },
      { name: 'Polícia', number: '119' },
    ],
  },
  AO: {
    country: 'Angola',
    hotlines: [
      { name: 'Emergência médica', number: '116' },
      { name: 'Polícia', number: '113' },
    ],
  },
  BR: {
    country: 'Brasil',
    hotlines: [
      { name: 'CVV (Centro de Valorização da Vida)', number: '188' },
      { name: 'SAMU', number: '192' },
    ],
  },
  PT: {
    country: 'Portugal',
    hotlines: [
      { name: 'Voz de Apoio', number: '21 354 4545' },
      { name: 'SOS Vida', number: '21 354 4545' },
      { name: 'Emergência', number: '112' },
    ],
  },
  ZA: {
    country: 'África do Sul',
    hotlines: [
      { name: 'SADAG Suicide Crisis', number: '0800 567 567' },
      { name: 'Emergency', number: '10111' },
    ],
  },
};

export function getCrisisResource(countryCode: string) {
  return CRISIS_RESOURCES[countryCode] ?? CRISIS_RESOURCES.MZ;
}
