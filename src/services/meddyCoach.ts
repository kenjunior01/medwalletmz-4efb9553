/**
 * Meddy AI Coach Service
 * Conversas diárias com o mascote Meddy via Google Gemini.
 * Multilingue, detecta crises emocionais.
 */

import { supabase } from '@/integrations/supabase/client';

// Cliente sem tipagem estrita para tabelas ainda não presentes nos tipos gerados.
const sb: any = supabase;
import { geminiChat, geminiStructured, isGeminiConfigured } from '@/lib/gemini';
import { useCountry } from '@/contexts/CountryContext';

// ─── Types ────────────────────────────────────────────────────────────────

export interface MeddyConversation {
  id: string;
  user_id: string;
  started_at: string;
  last_message_at: string;
  context: string;
  language: string;
  summary?: string;
  mood_before?: number;
  mood_after?: number;
  is_active: boolean;
  message_count: number;
}

export interface MeddyMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  detected_intent?: string;
  detected_language?: string;
  suggested_actions?: Array<{ type: string; label: string; url?: string }>;
  is_crisis_flagged: boolean;
  created_at: string;
}

export interface CrisisResource {
  country_code: string;
  hotline_name: string;
  phone: string;
  hours: string;
  languages: string[];
  notes?: string;
}

// ─── Crisis Resources by Country ──────────────────────────────────────────

const CRISIS_RESOURCES: CrisisResource[] = [
  {
    country_code: 'MZ',
    hotline_name: 'Linha de Apoio Psicológico - MISAU',
    phone: '847',
    hours: '24/7',
    languages: ['Português'],
    notes: 'Gratuito. Atendimento por psicólogos formados.'
  },
  {
    country_code: 'BR',
    hotline_name: 'CVV - Centro de Valorização da Vida',
    phone: '188',
    hours: '24/7',
    languages: ['Português'],
    notes: 'Gratuito. Sigilo absoluto.'
  },
  {
    country_code: 'IN',
    hotline_name: 'iCall - Mental Health Helpline',
    phone: '9152987821',
    hours: 'Seg-Sáb 8h-22h',
    languages: ['English', 'Hindi', 'Marathi'],
    notes: 'Gratuito.'
  },
  {
    country_code: 'KE',
    hotline_name: 'Befrienders Kenya',
    phone: '722178177',
    hours: 'Seg-Sex 7h-21h',
    languages: ['English', 'Swahili'],
    notes: 'Gratuito.'
  },
  {
    country_code: 'ZA',
    hotline_name: 'SADAG Suicide Crisis Line',
    phone: '0800567567',
    hours: '24/7',
    languages: ['English', 'Afrikaans'],
    notes: 'Gratuito.'
  },
  {
    country_code: 'ET',
    hotline_name: 'Befrienders Ethiopia',
    phone: '927',
    hours: '24/7',
    languages: ['Amharic', 'English'],
    notes: 'Gratuito.'
  },
];

const DEFAULT_CRISIS: CrisisResource = {
  country_code: '*',
  hotline_name: 'International SOS',
  phone: '+44 208 762 8384',
  hours: '24/7',
  languages: ['English'],
  notes: 'Linha internacional de emergência.'
};

export function getCrisisResource(countryCode: string): CrisisResource {
  return CRISIS_RESOURCES.find(r => r.country_code === countryCode) || DEFAULT_CRISIS;
}

// ─── System Prompts by Language ────────────────────────────────────────────

const SYSTEM_PROMPTS: Record<string, string> = {
  pt: `És o Meddy, mascote da MedWallet. És empático, brincalhão, conheces o contexto cultural moçambicano e brasileiro. Falas português. NÃO dás diagnósticos médicos. Encaminhas para médicos quando apropriado. Detectas crises emocionais (suicídio, auto-mutilação) e ofereces recursos. Respostas curtas (1-3 frases). Usa emoji ocasionalmente. 💚`,
  en: `You are Meddy, the MedWallet mascot. You're empathetic, playful, aware of African and global health context. You speak English. You DO NOT give medical diagnoses. You refer to doctors when appropriate. You detect emotional crises (suicide, self-harm) and offer resources. Short replies (1-3 sentences). Use occasional emoji. 💚`,
  es: `Eres Meddy, la mascota de MedWallet. Eres empático, juguetón, conoces el contexto cultural africano y latinoamericano. Hablas español. NO das diagnósticos médicos. Derivas a médicos cuando es apropiado. Detectas crisis emocionales (suicidio, autolesión) y ofreces recursos. Respuestas cortas (1-3 frases). Usa emoji ocasionalmente. 💚`,
  fr: `Tu es Meddy, la mascotte de MedWallet. Tu es empathique, joueur, tu connais le contexte culturel africain. Tu parles français. Tu NE donnes PAS de diagnostics médicaux. Tu diriges vers des médecins quand c'est approprié. Tu détectes les crises émotionnelles (suicide, auto-mutilation) et offres des ressources. Réponses courtes (1-3 phrases). Utilise occasionnellement des emoji. 💚`,
  sw: `Wewe ni Meddy, maskoti ya MedWallet. Wewe ni mwingofu, mcheza mkono, unajua muktadha wa kitamaduni wa Kiafrika. Unazungumza Kiswahili. HUPII uaguzi wa matibabu. Unaelekeza kwa madaktari inapofaa. Unagundua migogoro ya kihisia (kujiua, kujiumiza) na unatoa rasilimali. Majibu mafupi (sentensi 1-3). Tumia emoji wakati mwingine. 💚`,
  hi: `आप मेडी हैं, मेडवॉलेट के शुभंकर। आप सहानुभूतिपूर्ण, चंचल हैं, और अफ्रीकी और भारतीय सांस्कृतिक संदर्भ जानते हैं। आप हिंदी बोलते हैं। आप चिकित्सा निदान नहीं देते। जब उपयुक्त हो तो आप डॉक्टरों के पास भेजते हैं। आप भावनात्मक संकट (आत्महत्या, आत्म-हानि) का पता लगाते हैं और संसाधन प्रदान करते हैं। छोटे उत्तर (1-3 वाक्य)। कभी-कभी इमोजी का उपयोग करें। 💚`,
  af: `Jy is Meddy, die maskot van MedWallet. Jy is empaties, speels, en bewus van die Afrika-konteks. Jy praat Afrikaans. Jy GEE NIE mediese diagnoses nie. Jy verwys na dokters wanneer toepaslik. Jy bespeur emosionele krisisse (selfmoord, selfbesering) en bied hulpbronne. Kort antwoorde (1-3 sinne). Gebruik af en toe emoji. 💚`,
  am: `እርስዎ ሜዲ ናችሁ፣ የሜድዋሌት ምስል። እርስዎ ተጋነካኪ፣ መጫዎቻ፣ የአፍሪካ ባህል የሚታወቁ ነዎት። አማርኛ ይናገራሉ። የሕክምና ምርመራ አይሰጡም። በግልጽ ሲገባ ዶክተሮችን ይመራሉ። ስሜታዊ ቀውሶችን (እራስን መግደል፣ እራስን ማጉላት) ይመርምሩ እና ሀገሪቱን ይሰጡ። አጭር ምላሽ (1-3 ዓረፍተ ነገር)። አንዳንዴ ኢሞጂ ይጠቀሙ። 💚`,
};

const QUICK_REPLIES = {
  pt: ['Como estás hoje?', 'Tenho uma dúvida', 'Sinto-me ansioso', 'Lembra-me de algo'],
  en: ['How are you today?', 'I have a question', 'I feel anxious', 'Remind me of something'],
  es: ['¿Cómo estás hoy?', 'Tengo una duda', 'Me siento ansioso', 'Recuérdame algo'],
  fr: ['Comment vas-tu aujourd\'hui ?', 'J\'ai une question', 'Je me sens anxieux', 'Rappelle-moi quelque chose'],
  sw: ['Habari yako leo?', 'Nina swali', 'Ninahisi wasiwasi', 'Nikumbushe kitu'],
  hi: ['आज आप कैसे हैं?', 'मेरा एक सवाल है', 'मुझे चिंता हो रही है', 'मुझे कुछ याद दिलाएं'],
  af: ['Hoe gaan dit vandag?', 'Ek het \'n vraag', 'Ek voel angstig', 'Herinner my aan iets'],
  am: ['ዛፍ እንዴት ነው?', 'ጥያቄ አለኝ', 'ጭንቀት ይሰማኛል', 'የሆነ ነገር አስታውሰኝ'],
};

// ─── Crisis Detection ─────────────────────────────────────────────────────

interface CrisisDetection {
  is_crisis: boolean;
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  categories: string[];
  suggested_response: string;
}

export async function detectCrisis(message: string): Promise<CrisisDetection> {
  // Quick keyword check first (instant, no API call)
  const crisisKeywords = [
    'suicid', 'matar-me', 'tirar a vida', 'acabar com tudo', 'não vale a pena viver',
    'self-harm', 'kill myself', 'end it all', 'cut myself', 'die',
    'suicidio', 'matarme', 'acabar con todo',
    'suicide', 'me tuer', 'en finir',
    'kujiua', 'kuua nafsi',
    'आत्महत्या', 'खुद को मारना',
    'selfmoord', 'myself doodmaak',
    'እራስን መግደል',
  ];

  const lowerMsg = message.toLowerCase();
  const hasKeyword = crisisKeywords.some(k => lowerMsg.includes(k));

  if (hasKeyword) {
    return {
      is_crisis: true,
      severity: 'severe',
      categories: ['self_harm'],
      suggested_response: 'Estou aqui contigo. Não estás sozinho. Por favor, liga agora para alguém que te pode ajudar:',
    };
  }

  // Use Gemini for nuanced detection
  if (!isGeminiConfigured()) {
    return { is_crisis: false, severity: 'none', categories: [], suggested_response: '' };
  }

  try {
    return await geminiStructured<CrisisDetection>(
      `Analisa esta mensagem do utilizador e detecta se há indícios de crise emocional (suicídio, auto-mutilação, abuso, depressão severa):\n\n"${message}"\n\nResponde em JSON.`,
      {
        fallback: { is_crisis: false, severity: 'none', categories: [], suggested_response: '' },

        body: {
          contents: [{
            role: 'user',
            parts: [{ text: `Analisa esta mensagem e detecta crise emocional. Responde JSON: {is_crisis: boolean, severity: "none"|"mild"|"moderate"|"severe", categories: string[], suggested_response: string}\n\nMensagem: "${message}"` }]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 200, responseMimeType: 'application/json' },
        },
      }
    );
  } catch {
    return { is_crisis: false, severity: 'none', categories: [], suggested_response: '' };
  }
}

// ─── Conversation Management ──────────────────────────────────────────────

export async function startConversation(
  userId: string,
  context: string = 'general',
  language: string = 'pt'
): Promise<MeddyConversation> {
  const { data, error } = await sb
    .from('meddy_conversations')
    .insert({
      user_id: userId,
      context,
      language,
      is_active: true,
      message_count: 0,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as MeddyConversation;
}

export async function getConversationHistory(conversationId: string): Promise<MeddyMessage[]> {
  const { data, error } = await sb
    .from('meddy_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as MeddyMessage[];
}

export async function getRecentConversations(userId: string, limit: number = 10): Promise<MeddyConversation[]> {
  const { data, error } = await sb
    .from('meddy_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data || []) as MeddyConversation[];
}

export async function sendMessage(
  conversationId: string,
  userMessage: string,
  language: string = 'pt'
): Promise<MeddyMessage> {
  // 1. Persist user message
  const crisisCheck = await detectCrisis(userMessage);

  const { data: userMsg } = await sb
    .from('meddy_messages')
    .insert({
      conversation_id: conversationId,
      role: 'user',
      content: userMessage,
      detected_language: language,
      is_crisis_flagged: crisisCheck.is_crisis,
    })
    .select()
    .single();

  // 2. Get history for context
  const history = await getConversationHistory(conversationId);
  const geminiHistory = history.slice(-10).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    text: m.content,
  }));

  // 3. Build prompt with crisis-aware system prompt
  const systemPrompt = SYSTEM_PROMPTS[language] || SYSTEM_PROMPTS.pt;
  const finalSystemPrompt = crisisCheck.is_crisis
    ? `${systemPrompt}\n\nIMPORTANTE: O utilizador pode estar em crise emocional. Sê especialmente calmo, validante, e oferece imediatamente recursos de apoio. NUNCA ignores um pedido de ajuda.`
    : systemPrompt;

  // 4. Call Gemini
  let meddyReply: string;
  let suggestedActions: Array<{ type: string; label: string; url?: string }> = [];

  if (isGeminiConfigured()) {
    try {
      meddyReply = await geminiChat(userMessage, {
        systemPrompt: finalSystemPrompt,
        history: geminiHistory,
        temperature: 0.8,
        maxOutputTokens: 250,
      });
    } catch (err) {
      console.error('Meddy Gemini error:', err);
      meddyReply = getFallbackReply(language, crisisCheck.is_crisis);
    }
  } else {
    meddyReply = getFallbackReply(language, crisisCheck.is_crisis);
  }

  // 5. Detect intent and suggest actions
  const intent = detectIntent(userMessage, language);
  if (intent === 'book_appointment') {
    suggestedActions.push({ type: 'book_appointment', label: 'Marcar consulta', url: '/health/book' });
  } else if (intent === 'medication_question') {
    suggestedActions.push({ type: 'view_medications', label: 'Ver medicação', url: '/health/wallet' });
  } else if (intent === 'emergency') {
    suggestedActions.push({ type: 'emergency_sos', label: 'SOS Emergência', url: '/health/emergency' });
  }

  // 6. Persist Meddy reply
  const { data: assistantMsg } = await sb
    .from('meddy_messages')
    .insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: meddyReply,
      detected_intent: intent,
      suggested_actions: suggestedActions,
      is_crisis_flagged: crisisCheck.is_crisis,
    })
    .select()
    .single();

  // 7. Update conversation stats
  await sb
    .from('meddy_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      message_count: (history.length + 2) / 2,
    })
    .eq('id', conversationId);

  return assistantMsg as MeddyMessage;
}

export async function endConversation(
  conversationId: string,
  moodBefore?: number,
  moodAfter?: number
): Promise<string | null> {
  const history = await getConversationHistory(conversationId);

  let summary: string | null = null;
  if (isGeminiConfigured() && history.length > 2) {
    try {
      const conversationText = history.map(m => `${m.role}: ${m.content}`).join('\n');
      summary = await geminiChat(
        `Resume esta conversa em 1-2 frases, destacando o que foi discutido e qualquer recomendação:\n\n${conversationText}`,
        { temperature: 0.5, maxOutputTokens: 100 }
      );
    } catch {
      summary = null;
    }
  }

  await sb
    .from('meddy_conversations')
    .update({
      is_active: false,
      mood_before: moodBefore,
      mood_after: moodAfter,
      summary,
    })
    .eq('id', conversationId);

  return summary;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function detectIntent(message: string, language: string): string {
  const lower = message.toLowerCase();
  const intents: Record<string, string[]> = {
    book_appointment: ['consulta', 'marcar', 'marcada', 'appointment', 'book', 'cita', 'rendez', 'miadi', 'अपॉइंटमेंट', 'afspraak', 'ቀጠሮ'],
    medication_question: ['medicamento', 'remédio', 'medication', 'medicine', 'pastilha', 'dawa', 'दवा', 'medisyne', 'መድኃኒት'],
    emergency: ['emergência', 'urgente', 'sos', 'socorro', 'emergency', 'urgent', 'urgente', 'dharura', 'आपातकाल', 'noodgeval', 'አደጋ'],
  };
  for (const [intent, keywords] of Object.entries(intents)) {
    if (keywords.some(k => lower.includes(k))) return intent;
  }
  return 'general';
}

function getFallbackReply(language: string, isCrisis: boolean): string {
  if (isCrisis) {
    const replies: Record<string, string> = {
      pt: 'Estou aqui contigo. Não estás sozinho. Por favor, liga para alguém de confiança ou para a linha de apoio emocional da tua região. 💚',
      en: 'I\'m here with you. You\'re not alone. Please call someone you trust or your local emotional support hotline. 💚',
    };
    return replies[language] || replies.pt;
  }
  const replies: Record<string, string> = {
    pt: 'Olá! Sou o Meddy, o teu companheiro de saúde. Como te posso ajudar hoje? 💚',
    en: 'Hi! I\'m Meddy, your health companion. How can I help you today? 💚',
    es: '¡Hola! Soy Meddy, tu compañero de salud. ¿Cómo puedo ayudarte hoy? 💚',
    fr: 'Salut ! Je suis Meddy, ton compagnon de santé. Comment puis-je t\'aider aujourd\'hui ? 💚',
    sw: 'Habari! Mimi ni Meddy, mwenza wako wa afya. Naweza kukusaidia vipi leo? 💚',
    hi: 'नमस्ते! मैं मेडी हूं, आपका स्वास्थ्य साथी। आज मैं आपकी कैसे मदद कर सकता हूं? 💚',
    af: 'Haai! Ek is Meddy, jou gesondheidsmaat. Hoe kan ek jou vandag help? 💚',
    am: 'ሰላም! እኔ ሜዲ ነኝ፣ የጤናዎ ተባባሪ። ዛሬ እንዴት ልረዳዎት? 💚',
  };
  return replies[language] || replies.pt;
}

export function getQuickReplies(language: string = 'pt'): string[] {
  return QUICK_REPLIES[language] || QUICK_REPLIES.pt;
}
