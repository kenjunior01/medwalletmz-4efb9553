import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface CountryConfig {
  name: string;
  emergency_phone: string;
  dialect: string;
  health_system: string;
}

const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  MZ: { name: 'Moçambique', emergency_phone: '84 144 (INAS) ou 117', dialect: 'Português de Moçambique', health_system: 'Hospital Geral ou Centro de Saúde local' },
  BR: { name: 'Brasil', emergency_phone: '192 (SAMU)', dialect: 'Português do Brasil', health_system: 'UBS, UPA ou Hospital do SUS' },
  AO: { name: 'Angola', emergency_phone: '112', dialect: 'Português de Angola', health_system: 'Posto de Saúde ou Hospital Público' },
  PT: { name: 'Portugal', emergency_phone: '112 (INEM) ou 808 24 24 24 (Saúde 24)', dialect: 'Português de Portugal', health_system: 'Centro de Saúde ou Hospital do SNS' },
  IN: { name: 'Índia', emergency_phone: '102/108', dialect: 'English (India)', health_system: 'Government Hospital or local Clinic' },
};

// ============================================================
// FALLBACK LOCAL — Triagem baseada em regras clínicas
// Usado quando LOVABLE_API_KEY não está configurada ou a IA falha
// Mantém o app funcional SEM depender da IA externa
// ============================================================
interface RuleMatch {
  severity: 'baixa' | 'moderada' | 'alta' | 'emergência';
  recommendation: string;
  suggested_specialty: string;
  red_flags?: string[];
}

const EMERGENCY_KEYWORDS = [
  'dificuldade respirar', 'nao respiro', 'sem ar', 'sufocar', 'afogar',
  'dor no peito forte', 'aperto no peito', 'opressao no peito',
  'convulsao', 'convulsoes', 'ataque',
  'inconsciente', 'desmaio', 'desmaiou', 'perdeu os sentidos',
  'hemorragia', 'sangramento intenso', 'sangramento nao para',
  'queimadura grave', 'queimadura extensa',
  'acidente', 'acidente de viação', 'atropelamento',
  ' AVC', 'fraqueza num lado', 'boca torta', 'fala arrastada',
  'anafilaxia', 'choque anafilático', 'inchaço da garganta',
  'suicidio', 'pensamentos suicidas', 'auto-mutilação',
];

const HIGH_KEYWORDS = [
  'febre alta', 'febre 40', 'febre 41', 'calafrios intensos',
  'vómitos persistentes', 'nauseas e vómitos', 'nao consigo comer',
  'dor abdominal forte', 'dor na barriga forte', 'dor aguda',
  'sangue na urina', 'sangue nas fezes', 'fezes pretas',
  'icterícia', 'olhos amarelos', 'pele amarela',
  'dor lombar intensa', 'dor nas costas intensa',
  'tosse com sangue', 'hemoptise',
  'rigidez nuca', 'nuca rigida', 'fotofobia',
  'urina escassa', 'sem urina', 'anuria',
];

const MODERATE_KEYWORDS = [
  'febre', 'temperatura alta', 'calafrios',
  'dor de cabeça', 'cefaleia', 'enxaqueca',
  'tosse', 'tosse seca', 'tosse com catarro',
  'dor de garganta', 'amigdalite',
  'dor abdominal', 'dor na barriga', 'dispepsia',
  'diarreia', 'diarréia', 'fezes liquidas',
  'vómito', 'nausea', 'náusea',
  'dor articular', 'dor nas articulacoes', 'artrite',
  'dor muscular', 'mialgia',
  'tontura', 'vertigem',
  'erupção cutânea', 'manchas na pele', 'comichão', 'coceira',
  'olho vermelho', 'conjuntivite',
  'infecção urinária', 'ardor ao urinar', 'disúria',
  'sangramento', 'fluxo anormal',
];

const LOW_KEYWORDS = [
  'cansaço', 'fadiga', 'sem energia',
  'dor leve', 'incomodoo', 'pequena dor',
  'espirro', 'nariz entupido', 'coriza',
  'olho seco', 'boca seca',
  'insónia', 'insônia', 'dormir mal',
  'pergunta', 'conselho', 'dúvida',
];

function detectAgeRisk(age: number | null): 'emergência' | 'alta' | null {
  if (age === null) return null;
  if (age < 0) return null;
  if (age >= 65) return 'alta';
  if (age <= 1) return 'alta';
  if (age <= 5) return 'alta';
  return null;
}

function localTriage(symptoms: string, age: number | null, duration: string | null, config: CountryConfig): RuleMatch {
  const text = (symptoms || '').toLowerCase();

  // Detect emergency keywords
  for (const kw of EMERGENCY_KEYWORDS) {
    if (text.includes(kw)) {
      return {
        severity: 'emergência',
        recommendation: `Sintomas sugerem uma emergência médica. Ligue imediatamente para ${config.emergency_phone} ou dirija-se ao serviço de urgência do hospital mais próximo. Não aguarde.`,
        suggested_specialty: 'Urgência / Emergência',
        red_flags: [
          'Procure atendimento médico IMEDIATO',
          `Contacte ${config.emergency_phone}`,
          'Não conduza veículo se sentir tonturas ou fraqueza',
        ],
      };
    }
  }

  // Detect high severity keywords
  for (const kw of HIGH_KEYWORDS) {
    if (text.includes(kw)) {
      return {
        severity: 'alta',
        recommendation: `Sintomas exigem avaliação médica rápida (nas próximas 2-6 horas). Dirija-se a ${config.health_system} ou contacte um serviço de urgência. Mantenha-se hidratado.`,
        suggested_specialty: 'Clínica Geral / Medicina Interna',
        red_flags: [
          'Monitore temperatura e hidratação',
          'Procure atendimento se sintomas piorarem',
          'Não use automedicação sem orientação',
        ],
      };
    }
  }

  // Age risk upgrade (children <5 and elderly ≥65)
  const ageRisk = detectAgeRisk(age);
  if (ageRisk === 'alta') {
    return {
      severity: 'alta',
      recommendation: `Por ser um grupo de risco (${age! <= 5 ? 'criança' : 'idoso'}), recomendamos avaliação médica nas próximas horas em ${config.health_system}. Não subestime sintomas nestas idades.`,
      suggested_specialty: 'Pediatria' /* if child */ === 'Pediatria' && age! <= 14 ? 'Pediatria' : 'Clínica Geral',
      red_flags: ['Grupo de risco etário', 'Procure avaliação presencial'],
    };
  }

  // Moderate keywords
  for (const kw of MODERATE_KEYWORDS) {
    if (text.includes(kw)) {
      // Check duration to bump severity
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

  // Low keywords
  for (const kw of LOW_KEYWORDS) {
    if (text.includes(kw)) {
      return {
        severity: 'baixa',
        recommendation: `Sintomas leves. Repouso, hidratação e observação. Se persistirem por mais de 3 dias ou piorarem, agende consulta em ${config.health_system}.`,
        suggested_specialty: 'Clínica Geral',
      };
    }
  }

  // Default — unknown symptoms → moderate to be safe
  return {
    severity: 'moderada',
    recommendation: `Não conseguimos classificar os sintomas com precisão. Recomendamos avaliação em ${config.health_system} nas próximas 24-48h para diagnóstico adequado.`,
    suggested_specialty: 'Clínica Geral',
  };
}

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

// ============================================================
// MAIN HANDLER
// ============================================================
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify auth — but don't fail hard if claims API is unavailable (allow graceful degradation)
    let isAuthenticated = false;
    try {
      const { data: claims, error: claimsErr } = await sb.auth.getClaims(authHeader.replace('Bearer ', ''));
      isAuthenticated = !claimsErr && !!claims?.claims;
    } catch {
      isAuthenticated = false;
    }

    const { symptoms, age, duration, country = 'MZ' } = await req.json();
    if (!symptoms || typeof symptoms !== 'string') {
      return new Response(JSON.stringify({ error: 'symptoms obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const config = COUNTRY_CONFIGS[country] || COUNTRY_CONFIGS.MZ;
    const KEY = Deno.env.get('LOVABLE_API_KEY');

    // ─── PATH 1: LOVABLE AI (primary, when configured) ───
    if (KEY) {
      try {
        const system = `És um assistente de triagem médica em ${config.name}. Responde sempre em ${config.dialect}.
Avalia sintomas e devolve JSON com: severity ("baixa"|"moderada"|"alta"|"emergência"), recommendation (texto curto e claro), suggested_specialty (ex: "Clínica Geral", "Pediatria", "Cardiologia").
Adapta a tua recomendação ao contexto local: ${config.health_system}.
NUNCA dês diagnóstico definitivo. Em caso de "emergência" recomenda ligar para ${config.emergency_phone} ou ir ao hospital mais próximo.`;

        const userMsg = `Sintomas: ${symptoms}\nIdade: ${age ?? 'n/d'}\nDuração: ${duration ?? 'n/d'}\nPaís: ${config.name}`;

        const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.0-flash-exp',
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
                  },
                  required: ['severity', 'recommendation', 'suggested_specialty'],
                  additionalProperties: false,
                },
              },
            }],
            tool_choice: { type: 'function', function: { name: 'triage_result' } },
          }),
        });

        if (aiRes.status === 429) {
          // Rate limited → fall back to local
          console.warn('Lovable AI 429, usando fallback local');
        } else if (aiRes.status === 402) {
          console.warn('Lovable AI 402 (sem créditos), usando fallback local');
        } else if (!aiRes.ok) {
          const errText = await aiRes.text();
          console.error('AI error', aiRes.status, errText);
        } else {
          const data = await aiRes.json();
          const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
          const parsed = args ? JSON.parse(args) : null;
          if (parsed) {
            return new Response(JSON.stringify({
              ...parsed,
              _provider: 'lovable_ai',
              _authenticated: isAuthenticated,
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        }
      } catch (e) {
        console.error('Lovable AI exception, fallback local:', e);
      }
    } else {
      console.warn('LOVABLE_API_KEY não configurada — usando triagem local baseada em regras');
    }

    // ─── PATH 2: LOCAL RULE-BASED FALLBACK ───
    const result = localTriage(symptoms, age, duration, config);
    return new Response(JSON.stringify({
      ...result,
      _provider: 'local_rules',
      _authenticated: isAuthenticated,
      _note: KEY ? 'IA indisponível, usada triagem local baseada em regras clínicas' : 'LOVABLE_API_KEY não configurada — usando triagem local',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('triage err', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erro' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
