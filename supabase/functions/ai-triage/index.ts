import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// =====================================================================
// AI TRIAGE — PRIORIDADE MÁXIMA: LOVABLE AI GATEWAY
// 1. Lovable AI Gateway (google/gemini-3-flash-preview) — PRIMÁRIA
// 2. Motor local de regras clínicas — fallback de emergência
// =====================================================================

interface CountryConfig {
  name: string;
  emergency_phone: string;
  dialect: string;
  health_system: string;
}

const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  MZ: { name: 'Moçambique', emergency_phone: '117 ou 84 144 (INAS)', dialect: 'Português de Moçambique', health_system: 'Hospital Geral ou Centro de Saúde local' },
  BR: { name: 'Brasil', emergency_phone: '192 (SAMU)', dialect: 'Português do Brasil', health_system: 'UBS, UPA ou Hospital do SUS' },
  AO: { name: 'Angola', emergency_phone: '112', dialect: 'Português de Angola', health_system: 'Posto de Saúde ou Hospital Público' },
  PT: { name: 'Portugal', emergency_phone: '112 (INEM) ou 808 24 24 24 (Saúde 24)', dialect: 'Português de Portugal', health_system: 'Centro de Saúde ou Hospital do SNS' },
  IN: { name: 'Índia', emergency_phone: '102/108', dialect: 'English (India)', health_system: 'Government Hospital or local Clinic' },
};

interface TriageResult {
  severity: 'baixa' | 'moderada' | 'alta' | 'emergência';
  recommendation: string;
  suggested_specialty: string;
  red_flags?: string[];
  self_care?: string[];
  possible_causes?: { name: string; likelihood?: 'baixa' | 'média' | 'alta' }[];
  when_to_seek_help?: string;
  _provider?: string;
}

// =====================================================================
// CAMADA 3: MOTOR LOCAL DE TRIAGEM (sempre disponível)
// =====================================================================
const EMERGENCY_KEYWORDS = [
  'dificuldade respirar','nao respiro','sem ar','sufocar','afogar',
  'dor no peito forte','aperto no peito','opressao no peito',
  'convulsao','convulsoes','ataque',
  'inconsciente','desmaio','desmaiou','perdeu os sentidos',
  'hemorragia','sangramento intenso','sangramento nao para',
  'queimadura grave','queimadura extensa',
  'acidente','acidente de via','atropelamento',
  'avc','fraqueza num lado','boca torta','fala arrastada',
  'anafilaxia','choque anafilático','inchaço da garganta',
  'suicidio','pensamentos suicidas','auto-mutilação',
];

const HIGH_KEYWORDS = [
  'febre alta','febre 40','febre 41','calafrios intensos',
  'vómitos persistentes','nauseas e vómitos','nao consigo comer',
  'dor abdominal forte','dor na barriga forte','dor aguda',
  'sangue na urina','sangue nas fezes','fezes pretas',
  'icterícia','olhos amarelos','pele amarela',
  'dor lombar intensa','dor nas costas intensa',
  'tosse com sangue','hemoptise',
  'rigidez nuca','nuca rigida','fotofobia',
  'urina escassa','sem urina','anuria',
];

const MODERATE_KEYWORDS = [
  'febre','temperatura alta','calafrios',
  'dor de cabeça','cefaleia','enxaqueca',
  'tosse','tosse seca','tosse com catarro',
  'dor de garganta','amigdalite',
  'dor abdominal','dor na barriga','dispepsia',
  'diarreia','diarréia','fezes liquidas',
  'vómito','nausea','náusea',
  'dor articular','dor nas articulacoes','artrite',
  'dor muscular','mialgia',
  'tontura','vertigem',
  'erupção cutânea','manchas na pele','comichão','coceira',
  'olho vermelho','conjuntivite',
  'infecção urinária','ardor ao urinar','disúria',
  'sangramento','fluxo anormal',
];

const LOW_KEYWORDS = [
  'cansaço','fadiga','sem energia',
  'dor leve','incomodoo','pequena dor',
  'espirro','nariz entupido','coriza',
  'olho seco','boca seca',
  'insónia','insônia','dormir mal',
  'pergunta','conselho','dúvida',
];

function detectSpecialty(text: string): string {
  if (text.includes('peito') || text.includes('coração') || text.includes('coracao')) return 'Cardiologia';
  if (text.includes('crianca') || text.includes('criança') || text.includes('bebe') || text.includes('bebé')) return 'Pediatria';
  if (text.includes('mulher') || text.includes('gravida') || text.includes('grávida') || text.includes('menstrua')) return 'Ginecologia / Obstetrícia';
  if (text.includes('pele') || text.includes('cutanea') || text.includes('mancha')) return 'Dermatologia';
  if (text.includes('olho') || text.includes('visao') || text.includes('visão')) return 'Oftalmologia';
  if (text.includes('ouvido') || text.includes('ouvir') || text.includes('surdez')) return 'Otorrinolaringologia';
  if (text.includes('dente') || text.includes('gengiva')) return 'Odontologia';
  if (text.includes('mente') || text.includes('depressao') || text.includes('ansiedade')) return 'Psiquiatria';
  if (text.includes('osso') || text.includes('fractura') || text.includes('fratura') || text.includes('articulacao')) return 'Ortopedia';
  if (text.includes('urina') || text.includes('rim') || text.includes('bexiga')) return 'Urologia / Nefrologia';
  if (text.includes('estomago') || text.includes('estômago') || text.includes('intestino')) return 'Gastroenterologia';
  return 'Clínica Geral';
}

function localTriage(symptoms: string, age: number | null, duration: string | null, config: CountryConfig): TriageResult {
  const text = (symptoms || '').toLowerCase();

  for (const kw of EMERGENCY_KEYWORDS) {
    if (text.includes(kw)) {
      return {
        severity: 'emergência',
        recommendation: `Sintomas sugerem uma emergência médica. Ligue imediatamente para ${config.emergency_phone} ou dirija-se ao serviço de urgência do hospital mais próximo. Não aguarde.`,
        suggested_specialty: 'Urgência / Emergência',
        red_flags: ['Procure atendimento médico IMEDIATO', `Contacte ${config.emergency_phone}`, 'Não conduza veículo se sentir tonturas ou fraqueza'],
      };
    }
  }

  for (const kw of HIGH_KEYWORDS) {
    if (text.includes(kw)) {
      return {
        severity: 'alta',
        recommendation: `Sintomas exigem avaliação médica rápida (nas próximas 2-6 horas). Dirija-se a ${config.health_system} ou contacte um serviço de urgência. Mantenha-se hidratado.`,
        suggested_specialty: 'Clínica Geral / Medicina Interna',
        red_flags: ['Monitore temperatura e hidratação', 'Procure atendimento se sintomas piorarem', 'Não use automedicação sem orientação'],
      };
    }
  }

  if (age !== null && age >= 0 && (age <= 5 || age >= 65)) {
    return {
      severity: 'alta',
      recommendation: `Por ser um grupo de risco (${age <= 5 ? 'criança' : 'idoso'}), recomendamos avaliação médica nas próximas horas em ${config.health_system}. Não subestime sintomas nestas idades.`,
      suggested_specialty: age <= 14 ? 'Pediatria' : 'Clínica Geral',
      red_flags: ['Grupo de risco etário', 'Procure avaliação presencial'],
    };
  }

  for (const kw of MODERATE_KEYWORDS) {
    if (text.includes(kw)) {
      const longDuration = duration && (
        duration.toLowerCase().includes('semana') ||
        duration.toLowerCase().includes('mes') ||
        duration.toLowerCase().includes('mês') ||
        duration.toLowerCase().includes('ano')
      );
      if (longDuration) {
        return {
          severity: 'alta',
          recommendation: `Sintomas persistem há bastante tempo. Recomendamos consulta médica presencial em ${config.health_system} nas próximas 24-48h para avaliação completa.`,
          suggested_specialty: detectSpecialty(text),
          red_flags: ['Duração prolongada aumenta preocupação', 'Não adie consulta médica'],
        };
      }
      return {
        severity: 'moderada',
        recommendation: `Sintomas sugerem necessidade de avaliação médica. Agende consulta em ${config.health_system} nas próximas 24-48 horas. Mantenha repouso e hidratação adequada.`,
        suggested_specialty: detectSpecialty(text),
      };
    }
  }

  for (const kw of LOW_KEYWORDS) {
    if (text.includes(kw)) {
      return {
        severity: 'baixa',
        recommendation: `Sintomas leves. Repouso, hidratação e observação. Se persistirem por mais de 3 dias ou piorarem, agende consulta em ${config.health_system}.`,
        suggested_specialty: 'Clínica Geral',
      };
    }
  }

  return {
    severity: 'moderada',
    recommendation: `Não conseguimos classificar os sintomas com precisão. Recomendamos avaliação em ${config.health_system} nas próximas 24-48h para diagnóstico adequado.`,
    suggested_specialty: 'Clínica Geral',
  };
}

// =====================================================================
// CAMADA 1: GOOGLE GEMINI API (FREE — 1500 req/dia)
// Requer: GEMINI_API_KEY env var
// Get key: https://aistudio.google.com/apikey
// =====================================================================
async function triageWithGemini(
  symptoms: string, age: number | null, duration: string | null, config: CountryConfig
): Promise<TriageResult | null> {
  const KEY = Deno.env.get('GEMINI_API_KEY');
  if (!KEY) return null;

  try {
    const system = `És um assistente de triagem médica em ${config.name}. Responde sempre em ${config.dialect}.
Avalia sintomas e devolve APENAS JSON válido com: severity ("baixa"|"moderada"|"alta"|"emergência"), recommendation (texto curto e claro), suggested_specialty (ex: "Clínica Geral", "Pediatria", "Cardiologia"), red_flags (array de strings).
Adapta a tua recomendação ao contexto local: ${config.health_system}.
NUNCA dês diagnóstico definitivo. Em caso de "emergência" recomenda ligar para ${config.emergency_phone} ou ir ao hospital mais próximo.`;

    const userMsg = `Sintomas: ${symptoms}\nIdade: ${age ?? 'n/d'}\nDuração: ${duration ?? 'n/d'}\nPaís: ${config.name}`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: userMsg }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              severity: { type: 'STRING', enum: ['baixa', 'moderada', 'alta', 'emergência'] },
              recommendation: { type: 'STRING' },
              suggested_specialty: { type: 'STRING' },
              red_flags: { type: 'ARRAY', items: { type: 'STRING' } },
            },
            required: ['severity', 'recommendation', 'suggested_specialty'],
          },
        },
      }),
    });

    if (!res.ok) {
      console.warn('Gemini error', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const parsed = JSON.parse(text);
    if (!parsed.severity || !parsed.recommendation) return null;

    return { ...parsed, _provider: 'gemini' };
  } catch (e) {
    console.warn('Gemini exception:', e);
    return null;
  }
}

// =====================================================================
// CAMADA 2: GROQ API (ultra-rápido, free tier generoso)
// Requer: GROQ_API_KEY env var
// Endpoint: https://api.groq.com/openai/v1/chat/completions (compatível OpenAI)
// Modelos: llama-3.3-70b-versatile, llama-3.1-8b-instant
// =====================================================================
async function triageWithGroq(
  symptoms: string, age: number | null, duration: string | null, config: CountryConfig
): Promise<TriageResult | null> {
  const KEY = Deno.env.get('GROQ_API_KEY');
  if (!KEY) return null;

  try {
    const system = `És um assistente de triagem médica em ${config.name}. Responde sempre em ${config.dialect}.
Avalia sintomas e devolve APENAS JSON válido com: severity ("baixa"|"moderada"|"alta"|"emergência"), recommendation (texto curto e claro), suggested_specialty (ex: "Clínica Geral", "Pediatria", "Cardiologia"), red_flags (array de strings).
Adapta a tua recomendação ao contexto local: ${config.health_system}.
NUNCA dês diagnóstico definitivo. Em caso de "emergência" recomenda ligar para ${config.emergency_phone} ou ir ao hospital mais próximo.`;

    const userMsg = `Sintomas: ${symptoms}\nIdade: ${age ?? 'n/d'}\nDuração: ${duration ?? 'n/d'}\nPaís: ${config.name}\n\nDevolve APENAS o JSON, sem markdown.`;

    // Tentar llama-3.3-70b-versatile primeiro, fallback para 8b-instant
    const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
    for (const model of models) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: userMsg },
            ],
            temperature: 0.3,
            max_tokens: 600,
            response_format: { type: 'json_object' },
          }),
        });

        if (!res.ok) {
          console.warn(`Groq ${model} error`, res.status, await res.text());
          continue;
        }

        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (!text) continue;

        const parsed = JSON.parse(text);
        if (!parsed.severity || !parsed.recommendation) continue;
        return { ...parsed, _provider: 'groq' };
      } catch (e) {
        console.warn(`Groq ${model} exception:`, e);
        continue;
      }
    }
    return null;
  } catch (e) {
    console.warn('Groq exception:', e);
    return null;
  }
}

// =====================================================================
// CAMADA 3: LOVABLE AI GATEWAY (fallback)
// Requer: LOVABLE_API_KEY env var
// =====================================================================
async function triageWithLovable(
  symptoms: string, age: number | null, duration: string | null, config: CountryConfig
): Promise<TriageResult | null> {
  const KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!KEY) {
    console.error('LOVABLE_API_KEY não configurada');
    return null;
  }

  try {
    const system = `És um assistente de triagem médica em ${config.name}. Responde sempre em ${config.dialect}.
Avalia os sintomas do utente e devolve um relatório clínico estruturado (JSON) com:
- severity: "baixa" | "moderada" | "alta" | "emergência"
- recommendation: 1-2 frases curtas com a próxima acção certa (marcar consulta, ir à urgência, cuidar em casa...)
- suggested_specialty: especialidade médica indicada (ex: "Clínica Geral", "Pediatria", "Cardiologia")
- red_flags: sinais de alarme que exigem urgência imediata (0-5 itens curtos)
- self_care: 3 a 6 orientações práticas de auto-cuidado ANTES da consulta (hidratação, repouso, medicação OTC segura por idade, sinais a monitorar). NUNCA prescrever antibióticos nem doses específicas de medicação sujeita a receita.
- possible_causes: 2 a 4 hipóteses diagnósticas prováveis, cada uma com {name, likelihood: "baixa"|"média"|"alta"}. Deixa claro que são apenas hipóteses, não diagnóstico.
- when_to_seek_help: 1 frase indicando quando piorar deve levar à urgência.
Adapta ao contexto local: ${config.health_system}. Em emergência recomenda ${config.emergency_phone}. NUNCA dês diagnóstico definitivo.`;

    const userMsg = `Sintomas: ${symptoms}\nIdade: ${age ?? 'n/d'}\nDuração: ${duration ?? 'n/d'}\nPaís: ${config.name}`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [{ role: 'system', content: system }, { role: 'user', content: userMsg }],
        tools: [{
          type: 'function',
          function: {
            name: 'triage_result',
            description: 'Resultado de triagem',
            parameters: {
              type: 'object',
              properties: {
                severity: { type: 'string', enum: ['baixa', 'moderada', 'alta', 'emergência'] },
                recommendation: { type: 'string' },
                suggested_specialty: { type: 'string' },
                red_flags: { type: 'array', items: { type: 'string' } },
                self_care: { type: 'array', items: { type: 'string' } },
                possible_causes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      likelihood: { type: 'string', enum: ['baixa', 'média', 'alta'] },
                    },
                    required: ['name'],
                    additionalProperties: false,
                  },
                },
                when_to_seek_help: { type: 'string' },
              },
              required: ['severity', 'recommendation', 'suggested_specialty'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'triage_result' } },
      }),
    });

    if (!aiRes.ok) {
      const errTxt = await aiRes.text().catch(() => '');
      console.error('Lovable AI error', aiRes.status, errTxt);
      return null;
    }

    const data = await aiRes.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : null;
    if (!parsed) {
      console.error('Lovable AI: sem tool_call na resposta', JSON.stringify(data).slice(0, 500));
      return null;
    }
    return { ...parsed, _provider: 'lovable' };
  } catch (e) {
    console.error('Lovable AI exception:', e);
    return null;
  }
}

// =====================================================================
// HANDLER PRINCIPAL
// =====================================================================
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // NÃO exigir auth na triagem — é funcionalidade pública de saúde
    // (qualquer pessoa deve conseguir fazer triagem, mesmo sem login)

    const { symptoms, age, duration, country = 'MZ' } = await req.json();
    if (!symptoms || typeof symptoms !== 'string') {
      return new Response(JSON.stringify({ error: 'symptoms obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const config = COUNTRY_CONFIGS[country] || COUNTRY_CONFIGS.MZ;

    // CAMADA 1 (PRIORITÁRIA): Lovable AI Gateway
    const lovableResult = await triageWithLovable(symptoms, age, duration, config);
    if (lovableResult) {
      return new Response(JSON.stringify(lovableResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // CAMADA 2 (fallback): Regras clínicas locais
    const localResult = localTriage(symptoms, age, duration, config);
    return new Response(JSON.stringify({
      ...localResult,
      _provider: 'local_rules',
      _note: 'Lovable AI indisponível — usando triagem local de fallback.',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('triage err', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erro' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
