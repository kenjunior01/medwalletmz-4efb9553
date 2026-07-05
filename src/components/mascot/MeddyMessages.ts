import type { MeddyRole, MeddyState } from './Meddy';

/**
 * MeddyMessages — mensagens contextuais por (role, state) e contexto da página.
 *
 * Para cada role, definimos falas específicas:
 *   - greetings[]        : quando aparece pela 1ª vez no turno
 *   - encouragements[]   : quando o utilizador está hesitante (empty states, etc.)
 *   - tips[]             : dicas de saúde contextual
 *
 * Cada fala carrega:
 *   - text: o que Meddy diz
 *   - emoji: reforço visual
 *   - actionLabel + actionHref: CTA opcional
 *   - language: 'pt-MZ' | 'en'
 */

export interface MeddyMessage {
  text: string;
  emoji?: string;
  actionLabel?: string;
  actionHref?: string;
}

export type Context = 'home' | 'empty_doctors' | 'empty_pharmacies' | 'triage' | 'orders' | 'profile' | 'curation' | 'education' | 'wallet' | 'default';

const messages: Record<MeddyRole, Record<Context, MeddyMessage[]>> = {
  patient: {
    home: [
      { text: "Olá, {{name}}! Sou a Meddy 🌿 Posso ajudar-te a encontrar médico, farmácia ou marcar teleconsulta em {{city}}.", emoji: "🌿" },
      { text: "Sabias que podes sugerir farmácias que conheces? Cada aprovação dá-te +25 MZN 💰", emoji: "💰" },
      { text: "Tens XXXX pedido(s) ou acompanhamento(s) em aberto. Posso levar-te ao ponto certo.", emoji: "📅" },
    ],
    empty_doctors: [
      { text: "Ainda não há médicos nesta especialidade. Queres ser avisado quando aparecer?", emoji: "🔔", actionLabel: "Lista de espera", actionHref: "/health/doctors" },
      { text: "Faz uma Meddy Consulta agora — é gratuita e dá-te sugestões imediatas.", emoji: "✨", actionLabel: "Meddy Consulta", actionHref: "/health/triage" },
      { text: "Lê artigos de saúde sobre o teu sintoma enquanto esperas.", emoji: "📚", actionLabel: "Saúde MZ", actionHref: "/health/education" },
    ],
    empty_pharmacies: [
      { text: "Sem farmácias por perto? Sugere uma — recebes 25 MZN se for aprovada!", emoji: "💊", actionLabel: "Sugerir farmácia", actionHref: "/suggest-place" },
    ],
    triage: [
      { text: "Descreve os teus sintomas com calma. Não te esqueças de mencionar a duração!", emoji: "🩺" },
      { text: "Em emergência, liga 84 144. A triagem não substitui consulta presencial.", emoji: "⚠️" },
    ],
    orders: [
      { text: "Os teus pedidos estão a caminho! 🛵", emoji: "🛵" },
      { text: "Precisas de uma farmácia 24h? Temos várias em Maputo.", emoji: "💊" },
    ],
    profile: [
      { text: "Já fizeste a tua primeira teleconsulta? É super-rápido.", emoji: "🎥" },
      { text: "Convida amigos e ganha saldo + Pulse!", emoji: "🎁", actionLabel: "Convidar", actionHref: "/referrals" },
    ],
    wallet: [
      { text: "Sabias que podes carregar MZN directamente via M-Pesa?", emoji: "💸" },
      { text: "Cada vez que sugeres uma farmácia aprovada, recebes +25 MZN.", emoji: "💰" },
    ],
    education: [
      { text: "Bem-vindo à biblioteca de saúde de Moçambique! 🇲🇿", emoji: "🇲🇿" },
      { text: "Dica: lê sobre prevenção — 70% das doenças evitáveis são preveníveis.", emoji: "🛡️" },
    ],
    curation: [],
    default: [
      { text: "Estou aqui se precisares de ajuda. 💙", emoji: "💙" },
    ],
  },

  doctor: {
    home: [
      { text: "Bem-vindo, Dr(a). {{name}}. Tens XXXX consulta(s) activas ou marcadas.", emoji: "🩺" },
      { text: "Não te esqueças de marcar disponibilidade na agenda.", emoji: "📅", actionLabel: "Disponibilidade", actionHref: "/doctor/availability" },
      { text: "Os pacientes confiam em ti. Faz o check-in rápido das consultas.", emoji: "⭐" },
    ],
    empty_doctors: [],
    empty_pharmacies: [],
    triage: [],
    orders: [],
    profile: [
      { text: "Mantém o teu perfil actualizado — os pacientes procuram por especialidade.", emoji: "📝" },
    ],
    wallet: [],
    education: [
      { text: "A leitura rápida dos artigos MZ mantém-te actualizado sobre a realidade local.", emoji: "📖" },
    ],
    curation: [],
    default: [
      { text: "Pronto para mais um dia a cuidar da saúde de Moçambique.", emoji: "🇲🇿" },
    ],
  },

  pharmacist: {
    home: [
      { text: "Olá, {{name}}! Tens XXXX pedido(s) pendentes na farmácia.", emoji: "💊" },
      { text: "Confirma os pedidos dentro de 15 min para manter boa reputação.", emoji: "⏱️" },
    ],
    empty_doctors: [],
    empty_pharmacies: [
      { text: "Sem farmácias listadas. Adiciona a tua para começar a receber pedidos.", emoji: "🏪" },
    ],
    triage: [],
    orders: [
      { text: "Os pedidos aparecem aqui. Confirma rapidamente para manter 5⭐.", emoji: "⭐" },
    ],
    profile: [],
    wallet: [],
    education: [],
    curation: [],
    default: [
      { text: "Estou contigo na operação da farmácia — pedidos, produtos e carteira num só lugar.", emoji: "💊" },
    ],
  },

  driver: {
    home: [
      { text: "Boas, {{name}}! Tens XXXX entrega(s) à tua espera. Verifica o mapa 🗺️", emoji: "🛵" },
      { text: "Lembra-te: a segurança vem primeiro. Capacete sempre!", emoji: "🪖" },
    ],
    empty_doctors: [],
    empty_pharmacies: [],
    triage: [],
    orders: [
      { text: "Boas viagens! Cada entrega concluída = mais ganhos 💸", emoji: "🚀" },
    ],
    profile: [],
    wallet: [],
    education: [],
    curation: [],
    default: [
      { text: "Boas viagens! Mantém as entregas seguras e confirma cada etapa no app.", emoji: "🛵" },
    ],
  },

  clinic: {
    home: [
      { text: "Bem-vindo, {{name}}. A tua clínica/hospital pode acompanhar médicos, marcações e carteira aqui.", emoji: "🏥" },
    ],
    empty_doctors: [],
    empty_pharmacies: [],
    triage: [],
    orders: [],
    profile: [],
    wallet: [],
    education: [],
    curation: [],
    default: [
      { text: "Posso ajudar a gerir a tua unidade de saúde, equipa médica e marcações.", emoji: "🏥" },
    ],
  },

  admin: {
    home: [
      { text: "Olá, {{name}}! Tens XXXX proposta(s) pendentes ou em revisão na curadoria.", emoji: "🛡️", actionLabel: "Abrir curadoria", actionHref: "/admin/curation" },
      { text: "Verifica o /admin/import para puxar farmácias via Google Places.", emoji: "📥", actionLabel: "Importar", actionHref: "/admin/import" },
    ],
    empty_doctors: [],
    empty_pharmacies: [],
    triage: [],
    orders: [],
    profile: [],
    wallet: [],
    education: [],
    curation: [
      { text: "Aqui decides o que aparece para os utilizadores. Filtra por cidade/tipo, valida o mapa e aprova com cuidado!", emoji: "✅" },
      { text: "Dica: usa aprovação ou rejeição em massa só depois de confirmar as coordenadas e contactos.", emoji: "⚡" },
    ],
    default: [
      { text: "Tens superpoderes aqui. Usa-os com sabedoria 🛡️", emoji: "🛡️" },
    ],
  },
};

/**
 * Devolve uma mensagem apropriada para (role, context), evitando repetir
 * a mesma mensagem duas vezes seguidas (estado interno do componente).
 */
export function pickMeddyMessage(
  role: MeddyRole,
  context: Context,
  lastText?: string,
): MeddyMessage | null {
  const pool = messages[role]?.[context] ?? messages[role]?.default ?? [];
  if (pool.length === 0) return null;
  // Tenta encontrar uma diferente da última
  const candidates = pool.filter(m => m.text !== lastText);
  const arr = candidates.length > 0 ? candidates : pool;
  return arr[Math.floor(Math.random() * arr.length)];
}

export const CONTEXTS = [
  'home', 'empty_doctors', 'empty_pharmacies', 'triage',
  'orders', 'profile', 'curation', 'education', 'wallet', 'default',
] as const;