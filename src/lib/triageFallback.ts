/**
 * Triage Local Fallback — mirror do Edge Function `ai-triage`
 * -----------------------------------------------------------
 * Quando o Edge Function `ai-triage` falha (non-2xx), usamos este
 * módulo no client como fallback. Lógica idêntica à do Deno:
 *
 *   1. Google Gemini direto (VITE_GEMINI_API_KEY no browser)
 *   2. Motor local de regras clínicas (sempre funciona)
 *
 * Isto garante que a triagem continua a funcionar mesmo se:
 *   - O Edge Function não estiver deployed
 *   - O Edge Function estiver crashando
 *   - O Supabase estiver em manutenção
 *
 * NOTA: A chave VITE_GEMINI_API_KEY é do Google AI Studio e é segura
 * para uso client-side (tem quotas por IP / por utilizador).
 */

import { geminiChat } from "@/lib/gemini";

export interface TriageResult {
  severity: "baixa" | "moderada" | "alta" | "emergência" | string;
  recommendation: string;
  suggested_specialty: string;
  red_flags?: string[];
  _provider?: string;
  _note?: string;
}

interface CountryConfig {
  name: string;
  emergency_phone: string;
  dialect: string;
  health_system: string;
}

export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  MZ: {
    name: "Moçambique",
    emergency_phone: "117 ou 84 144 (INAS)",
    dialect: "Português de Moçambique",
    health_system: "Hospital Geral ou Centro de Saúde local",
  },
  BR: {
    name: "Brasil",
    emergency_phone: "192 (SAMU)",
    dialect: "Português do Brasil",
    health_system: "UBS, UPA ou Hospital do SUS",
  },
  AO: {
    name: "Angola",
    emergency_phone: "112",
    dialect: "Português de Angola",
    health_system: "Posto de Saúde ou Hospital Público",
  },
  PT: {
    name: "Portugal",
    emergency_phone: "112 (INEM) ou 808 24 24 24 (Saúde 24)",
    dialect: "Português de Portugal",
    health_system: "Centro de Saúde ou Hospital do SNS",
  },
  IN: {
    name: "Índia",
    emergency_phone: "102/108",
    dialect: "English (India)",
    health_system: "Government Hospital or local Clinic",
  },
};

// =====================================================================
// MOTOR LOCAL DE TRIAGEM (cópia exacta do Edge Function)
// =====================================================================

const EMERGENCY_KEYWORDS = [
  "dificuldade respirar", "nao respiro", "sem ar", "sufocar", "afogar",
  "dor no peito forte", "aperto no peito", "opressao no peito",
  "convulsao", "convulsoes", "ataque",
  "inconsciente", "desmaio", "desmaiou", "perdeu os sentidos",
  "hemorragia", "sangramento intenso", "sangramento nao para",
  "queimadura grave", "queimadura extensa",
  "acidente", "acidente de via", "atropelamento",
  "avc", "fraqueza num lado", "boca torta", "fala arrastada",
  "anafilaxia", "choque anafilático", "inchaço da garganta",
  "suicidio", "pensamentos suicidas", "auto-mutilação",
];

const HIGH_KEYWORDS = [
  "febre alta", "febre 40", "febre 41", "calafrios intensos",
  "vómitos persistentes", "nauseas e vómitos", "nao consigo comer",
  "dor abdominal forte", "dor na barriga forte", "dor aguda",
  "sangue na urina", "sangue nas fezes", "fezes pretas",
  "icterícia", "olhos amarelos", "pele amarela",
  "dor lombar intensa", "dor nas costas intensa",
  "tosse com sangue", "hemoptise",
  "rigidez nuca", "nuca rigida", "fotofobia",
  "urina escassa", "sem urina", "anuria",
];

const MODERATE_KEYWORDS = [
  "febre", "temperatura alta", "calafrios",
  "dor de cabeça", "cefaleia", "enxaqueca",
  "tosse", "tosse seca", "tosse com catarro",
  "dor de garganta", "amigdalite",
  "dor abdominal", "dor na barriga", "dispepsia",
  "diarreia", "diarréia", "fezes liquidas",
  "vómito", "nausea", "náusea",
  "dor articular", "dor nas articulacoes", "artrite",
  "dor muscular", "mialgia",
  "tontura", "vertigem",
  "erupção cutânea", "manchas na pele", "comichão", "coceira",
  "olho vermelho", "conjuntivite",
  "infecção urinária", "ardor ao urinar", "disúria",
  "sangramento", "fluxo anormal",
];

const LOW_KEYWORDS = [
  "cansaço", "fadiga", "sem energia",
  "dor leve", "incomodoo", "pequena dor",
  "espirro", "nariz entupido", "coriza",
  "olho seco", "boca seca",
  "insónia", "insônia", "dormir mal",
  "pergunta", "conselho", "dúvida",
];

function detectSpecialty(text: string): string {
  if (text.includes("peito") || text.includes("coração") || text.includes("coracao")) return "Cardiologia";
  if (text.includes("crianca") || text.includes("criança") || text.includes("bebe") || text.includes("bebé")) return "Pediatria";
  if (text.includes("mulher") || text.includes("gravida") || text.includes("grávida") || text.includes("menstrua")) return "Ginecologia / Obstetrícia";
  if (text.includes("pele") || text.includes("cutanea") || text.includes("mancha")) return "Dermatologia";
  if (text.includes("olho") || text.includes("visao") || text.includes("visão")) return "Oftalmologia";
  if (text.includes("ouvido") || text.includes("ouvir") || text.includes("surdez")) return "Otorrinolaringologia";
  if (text.includes("dente") || text.includes("gengiva")) return "Odontologia";
  if (text.includes("mente") || text.includes("depressao") || text.includes("ansiedade")) return "Psiquiatria";
  if (text.includes("osso") || text.includes("fractura") || text.includes("fratura") || text.includes("articulacao")) return "Ortopedia";
  return "Clínica Geral";
}

export function localTriage(
  symptoms: string,
  age: number | null,
  duration: string | null,
  config: CountryConfig,
): TriageResult {
  const text = (symptoms || "").toLowerCase();

  for (const kw of EMERGENCY_KEYWORDS) {
    if (text.includes(kw)) {
      return {
        severity: "emergência",
        recommendation: `Sintomas sugerem uma emergência médica. Ligue imediatamente para ${config.emergency_phone} ou dirija-se ao serviço de urgência do hospital mais próximo. Não aguarde.`,
        suggested_specialty: "Urgência / Emergência",
        red_flags: [
          "Procure atendimento médico IMEDIATO",
          `Contacte ${config.emergency_phone}`,
          "Não conduza veículo se sentir tonturas ou fraqueza",
        ],
      };
    }
  }

  for (const kw of HIGH_KEYWORDS) {
    if (text.includes(kw)) {
      return {
        severity: "alta",
        recommendation: `Sintomas exigem avaliação médica rápida (nas próximas 2-6 horas). Dirija-se a ${config.health_system} ou contacte um serviço de urgência. Mantenha-se hidratado.`,
        suggested_specialty: "Clínica Geral / Medicina Interna",
        red_flags: [
          "Monitore temperatura e hidratação",
          "Procure atendimento se sintomas piorarem",
          "Não use automedicação sem orientação",
        ],
      };
    }
  }

  if (age !== null && age >= 0 && (age <= 5 || age >= 65)) {
    return {
      severity: "alta",
      recommendation: `Por ser um grupo de risco (${age <= 5 ? "criança" : "idoso"}), recomendamos avaliação médica nas próximas horas em ${config.health_system}. Não subestime sintomas nestas idades.`,
      suggested_specialty: age <= 14 ? "Pediatria" : "Clínica Geral",
      red_flags: ["Grupo de risco etário", "Procure avaliação presencial"],
    };
  }

  for (const kw of MODERATE_KEYWORDS) {
    if (text.includes(kw)) {
      const longDuration = duration && (
        duration.toLowerCase().includes("semana") ||
        duration.toLowerCase().includes("mes") ||
        duration.toLowerCase().includes("mês") ||
        duration.toLowerCase().includes("ano")
      );
      if (longDuration) {
        return {
          severity: "alta",
          recommendation: `Sintomas persistem há bastante tempo. Recomendamos consulta médica presencial em ${config.health_system} nas próximas 24-48h para avaliação completa.`,
          suggested_specialty: detectSpecialty(text),
          red_flags: ["Duração prolongada aumenta preocupação", "Não adie consulta médica"],
        };
      }
      return {
        severity: "moderada",
        recommendation: `Sintomas sugerem necessidade de avaliação médica. Agende consulta em ${config.health_system} nas próximas 24-48 horas. Mantenha repouso e hidratação adequada.`,
        suggested_specialty: detectSpecialty(text),
      };
    }
  }

  for (const kw of LOW_KEYWORDS) {
    if (text.includes(kw)) {
      return {
        severity: "baixa",
        recommendation: `Sintomas leves. Repouso, hidratação e observação. Se persistirem por mais de 3 dias ou piorarem, agende consulta em ${config.health_system}.`,
        suggested_specialty: "Clínica Geral",
      };
    }
  }

  return {
    severity: "moderada",
    recommendation: `Não conseguimos classificar os sintomas com precisão. Recomendamos avaliação em ${config.health_system} nas próximas 24-48h para diagnóstico adequado.`,
    suggested_specialty: "Clínica Geral",
  };
}

// =====================================================================
// CAMADA 1: GOOGLE GEMINI (chave do browser — VITE_GEMINI_API_KEY)
// =====================================================================

export async function triageWithGeminiLocal(
  symptoms: string,
  age: number | null,
  duration: string | null,
  config: CountryConfig,
): Promise<TriageResult | null> {
  const system = `És um assistente de triagem médica em ${config.name}. Responde sempre em ${config.dialect}.
Avalia sintomas e devolve APENAS JSON válido com: severity ("baixa"|"moderada"|"alta"|"emergência"), recommendation (texto curto e claro), suggested_specialty (ex: "Clínica Geral", "Pediatria", "Cardiologia"), red_flags (array de strings).
Adapta a tua recomendação ao contexto local: ${config.health_system}.
NUNCA dês diagnóstico definitivo. Em caso de "emergência" recomenda ligar para ${config.emergency_phone} ou ir ao hospital mais próximo.`;

  const userMsg = `Sintomas: ${symptoms}\nIdade: ${age ?? "n/d"}\nDuração: ${duration ?? "n/d"}\nPaís: ${config.name}\n\nDevolde APENAS o JSON.`;

  try {
    const text = await geminiChat(userMsg, {
      systemPrompt: system,
      temperature: 0.3,
      maxOutputTokens: 600,
    });

    // Extrai JSON mesmo se houver markdown envolvente
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as Partial<TriageResult>;
    if (!parsed.severity || !parsed.recommendation) return null;

    return {
      severity: parsed.severity,
      recommendation: parsed.recommendation,
      suggested_specialty: parsed.suggested_specialty ?? "Clínica Geral",
      red_flags: parsed.red_flags,
      _provider: "gemini-browser",
    };
  } catch (e) {
    console.warn("Triage local Gemini falhou:", e);
    return null;
  }
}

// =====================================================================
// HANDLER PRINCIPAL — chaamdo quando Edge Function falha
// =====================================================================

export async function triageLocalFallback(
  symptoms: string,
  age: number | null,
  duration: string | null,
  countryCode: string,
): Promise<TriageResult> {
  const config = COUNTRY_CONFIGS[countryCode] || COUNTRY_CONFIGS.MZ;

  // Camada 1: Gemini browser
  const geminiResult = await triageWithGeminiLocal(symptoms, age, duration, config);
  if (geminiResult) return geminiResult;

  // Camada 2: Local rules (sempre funciona)
  const localResult = localTriage(symptoms, age, duration, config);
  return {
    ...localResult,
    _provider: "local_rules",
    _note: "Edge Function indisponível — triagem local aplicada (regras clínicas).",
  };
}
