/**
 * src/lib/mzPlans.ts
 * ====================================================================
 * FONTE ÚNICA DA VERDADE para os 14 planos MZ (6 B2C + 8 B2B).
 *
 * Os slugs aqui SÃO EXACTAMENTE os slugs seeded no migration
 * 20260820000000_mz_monetization_functional.sql.
 *
 * Quando o utilizador clica "Subscrever" em MzPricingPlans ou MzB2BPlans,
 * a app navega para /subscribe/:slug. O Subscribe.tsx faz lookup da BD;
 * se não encontrar (BD ainda não tem o migration applied), faz fallback
 * para MZ_ALL_PLANS definido aqui — garantindo que o fluxo NUNCA parte.
 *
 * Também fornece seedMzPlans() — upsert idempotente via supabase client.
 * Pode ser chamado no mount da página de planos para garantir que a BD
 * tem os planos actualizados mesmo se o admin não correu o migration.
 * ====================================================================
 */

import { supabase } from '@/integrations/supabase/client';

// ---------- Tipos ----------
export type Billing = 'monthly' | 'quarterly' | 'yearly';

export type B2CAudience = 'individual' | 'familia' | 'gravida' | 'cronico' | 'premium';
export type B2BAudience = 'doctor' | 'clinic' | 'hospital' | 'pharmacy' | 'lab' | 'driver';
export type PlanAudience = B2CAudience | B2BAudience;

export interface MzPlan {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  price_mzn: number;
  billing_period: 'monthly' | 'quarterly' | 'yearly';
  target_audience: PlanAudience;
  features: string[];
  badge?: string;
  highlighted?: boolean;
  cta: string;
  period_months: number; // 1, 3 ou 12
  kind: 'b2c' | 'b2b';
}

// ---------- Descontos por ciclo ----------
export const BILLING_DISCOUNT: Record<Billing, { multiplier: number; label: string; saving: string }> = {
  monthly:   { multiplier: 1,    label: 'Mensal',    saving: '' },
  quarterly: { multiplier: 2.7,  label: 'Trimestral', saving: 'Poupa 10%' },
  yearly:    { multiplier: 10,   label: 'Anual',     saving: 'Poupa 17%' },
};

// ---------- 6 PLANOS B2C ----------
export const MZ_B2C_PLANS: MzPlan[] = [
  {
    slug: 'plus-individual',
    name: 'Plus Individual',
    tagline: 'Para ti que cuidas da tua saúde',
    description: 'Triagem IA, lembretes e cashback — para o dia-a-dia.',
    price_mzn: 199,
    billing_period: 'monthly',
    target_audience: 'individual',
    features: [
      '1 consulta Meddy grátis por mês',
      '10% desconto em farmácia',
      'Lembretes IA de medicação (ARV/TB/malária)',
      'Triagem IA ilimitada (Gemini + Groq)',
      'Carteira digital com cashback 1%',
      'Prontuário digital seguro',
    ],
    cta: 'Começar agora',
    period_months: 1,
    kind: 'b2c',
  },
  {
    slug: 'plus-familia',
    name: 'Plus Família',
    tagline: 'Saúde para toda a família (5 pessoas)',
    description: 'Planos partilhados para 5 pessoas da mesma família.',
    price_mzn: 399,
    billing_period: 'monthly',
    target_audience: 'familia',
    features: [
      '4 consultas partilhadas por mês',
      '15% desconto em farmácia para todos',
      'Controlo parental e perfis dependentes',
      'Pediatra + clínico geral disponíveis',
      'Cashback 2% em todas as contas',
      'Veterinária 20% off (pets da família)',
    ],
    cta: 'Proteger a família',
    period_months: 1,
    kind: 'b2c',
  },
  {
    slug: 'plus-gravida',
    name: 'Plus Grávida',
    tagline: '9 meses de cuidado integral materno',
    description: 'Pré-natais ilimitadas + SOS obstétrico 24/7.',
    price_mzn: 299,
    billing_period: 'monthly',
    target_audience: 'gravida',
    badge: 'Mais escolhido',
    highlighted: true,
    features: [
      'Pré-natais ILIMITADAS (online)',
      'SOS Obstétrico 24/7 via WhatsApp',
      'Rota para matemidade mais próxima (Google Maps)',
      'Lembretes de vitaminas + vacinas',
      'Educação maternal em português + Macua',
      '1ª consulta pediátrica OFEREcida',
    ],
    cta: 'Cuidar do meu bebé',
    period_months: 1,
    kind: 'b2c',
  },
  {
    slug: 'plus-cronico',
    name: 'Plus Crónico',
    tagline: 'ARV, TB, Hipertensão, Diabetes — refills ilimitados',
    description: 'Adesão garantida com refills sem filas e lembretes diários.',
    price_mzn: 249,
    billing_period: 'monthly',
    target_audience: 'cronico',
    badge: 'MISAU-aligned',
    features: [
      'Refills ARV/TB/HTN ilimitados (sem filas)',
      'Lembrete IA diário por WhatsApp + voz TTS',
      'Adesão tracking com relatório para médico',
      'Cashback 2% em farmácia',
      'Transporte para refills 50% off',
      'Linha verde 24/7 com farmacêutico',
    ],
    cta: 'Adesão garantida',
    period_months: 1,
    kind: 'b2c',
  },
  {
    slug: 'premium-individual',
    name: 'Premium Individual',
    tagline: 'Experiência premium com especialista e prioridade total',
    description: 'Acesso prioritário a especialistas e IA de imagem.',
    price_mzn: 499,
    billing_period: 'monthly',
    target_audience: 'premium',
    features: [
      'Tudo do Plus Individual',
      '2 consultas especialista/mês (30% off extra)',
      'Análise de imagem IA (RX, lâmina, ecografia)',
      'Triagem IA prioritária (sem filas)',
      'Cashback 3% em todas as contas',
      'Suporte VIP WhatsApp directo',
    ],
    cta: 'Ir Premium',
    period_months: 1,
    kind: 'b2c',
  },
  {
    slug: 'premium-familia',
    name: 'Premium Família',
    tagline: 'Premium para 5 pessoas — a experiência mais completa',
    description: 'A experiência premium partilhada com 5 pessoas.',
    price_mzn: 899,
    billing_period: 'monthly',
    target_audience: 'premium',
    badge: 'Top-tier',
    features: [
      'Tudo do Premium Individual para 5 pessoas',
      '6 consultas especialista partilhadas/mês',
      'SOS 24/7 para toda a família',
      'Cashback 3% + seguro funeral 50% off',
      'Veterinária premium 40% off',
      'Gestor de saúde dedicado (1 pessoa)',
    ],
    cta: 'Proteger a família Premium',
    period_months: 1,
    kind: 'b2c',
  },
];

// ---------- 8 PLANOS B2B ----------
export const MZ_B2B_PLANS: MzPlan[] = [
  {
    slug: 'doctor-pro',
    name: 'Doctor Pro',
    tagline: 'Para médicos que querem crescer no digital',
    description: '50 teleconsultas/mês + prontuário IA + agenda inteligente.',
    price_mzn: 1500,
    billing_period: 'monthly',
    target_audience: 'doctor',
    features: [
      'Perfil verificado + destaque',
      'Até 50 teleconsultas/mês',
      'Receitas digitais ilimitadas',
      'Prontuário IA Gemini',
      'Agenda inteligente',
      'Relatórios de desempenho',
    ],
    cta: 'Subscrever Doctor Pro',
    period_months: 1,
    kind: 'b2b',
  },
  {
    slug: 'doctor-elite',
    name: 'Doctor Elite',
    tagline: 'Para médicos com consultório digital completo',
    description: 'Teleconsultas ilimitadas + IA dedicada + integração seguros.',
    price_mzn: 4500,
    billing_period: 'monthly',
    target_audience: 'doctor',
    badge: 'Premium',
    features: [
      'Tudo do Doctor Pro',
      'Teleconsultas ILIMITADAS',
      'Topo das pesquisas sempre',
      'Assistente Meddy AI dedicado',
      'Integração com seguros',
      'Dashboard avançado de faturação',
      'Multi-especialidade',
    ],
    cta: 'Subscrever Doctor Elite',
    period_months: 1,
    kind: 'b2b',
  },
  {
    slug: 'clinica-basic',
    name: 'Clínica Basic',
    tagline: 'Para clínicas pequenas (até 3 médicos)',
    description: 'Gestão de clínica com agenda e prontuário eletrônico.',
    price_mzn: 6000,
    billing_period: 'monthly',
    target_audience: 'clinic',
    features: [
      'Até 3 médicos',
      'Agenda partilhada',
      'Prontuário eletrônico',
      'Receitas digitais',
      'Suporte email',
      '1 filial',
    ],
    cta: 'Subscrever Basic',
    period_months: 1,
    kind: 'b2b',
  },
  {
    slug: 'clinica-pro',
    name: 'Clínica Pro',
    tagline: 'Para clínicas em crescimento (até 10 médicos)',
    description: 'Telemedicina + OCR + relatórios + 3 filiais.',
    price_mzn: 18000,
    billing_period: 'monthly',
    target_audience: 'clinic',
    badge: 'Mais Popular',
    features: [
      'Até 10 médicos',
      'Tudo do Basic',
      'Telemedicina ilimitada',
      'OCR de receitas (Vision)',
      'Relatórios avançados',
      '3 filiais',
      'Suporte prioritário WhatsApp',
    ],
    cta: 'Subscrever Pro',
    period_months: 1,
    kind: 'b2b',
  },
  {
    slug: 'hospital-enterprise',
    name: 'Hospital Enterprise',
    tagline: 'Para hospitais e clínicas grandes (50+ médicos)',
    description: 'Solução enterprise com integração MISAU + API dedicada.',
    price_mzn: 45000,
    billing_period: 'monthly',
    target_audience: 'hospital',
    badge: 'Enterprise',
    features: [
      'Médicos ilimitados',
      'Tudo do Pro',
      'Integração MISAU + SIS-MA',
      'Multi-filial ilimitada',
      'API dedicada',
      'Gestor de conta dedicado',
      'SLA 99.9%',
      'On-premise opcional',
    ],
    cta: 'Contactar vendas',
    period_months: 1,
    kind: 'b2b',
  },
  {
    slug: 'pharmacy-pro',
    name: 'Pharmacy Pro',
    tagline: 'Para farmácias — vendas online + delivery',
    description: 'Vendas online ilimitadas com delivery e OCR de receitas.',
    price_mzn: 3500,
    billing_period: 'monthly',
    target_audience: 'pharmacy',
    features: [
      'Vendas online ilimitadas',
      'Delivery com tracking',
      'OCR de receitas',
      'Gestão de stock',
      'Integração M-Pesa',
      'Cashback ao cliente (configurável)',
    ],
    cta: 'Subscrever Pharmacy Pro',
    period_months: 1,
    kind: 'b2b',
  },
  {
    slug: 'lab-pro',
    name: 'Lab Pro',
    tagline: 'Para laboratórios — resultados digitais + home collection',
    description: 'Resultados digitais PDF + tracking + notificações.',
    price_mzn: 5000,
    billing_period: 'monthly',
    target_audience: 'lab',
    features: [
      'Resultados digitais (PDF)',
      'Home collection tracking',
      'Integração com médicos',
      'OCR de requisições',
      'Notificação WhatsApp/Email',
      'Multi-colector',
    ],
    cta: 'Subscrever Lab Pro',
    period_months: 1,
    kind: 'b2b',
  },
  {
    slug: 'driver-plus',
    name: 'Driver Plus',
    tagline: 'Para motoristas de entrega de saúde',
    description: 'Comissões 80% + seguro + treino de manuseio.',
    price_mzn: 250,
    billing_period: 'monthly',
    target_audience: 'driver',
    features: [
      'Roteirização Google Maps',
      'Comissões 80% (vs 70% free)',
      'Saque diário M-Pesa',
      'Seguro acidente incluído',
      'Suporte prioritário',
      'Treino de manuseio de medicamentos',
    ],
    cta: 'Subscrever Driver Plus',
    period_months: 1,
    kind: 'b2b',
  },
];

// ---------- COMBINA TUDO ----------
export const MZ_ALL_PLANS: MzPlan[] = [...MZ_B2C_PLANS, ...MZ_B2B_PLANS];

// ---------- HELPERS ----------
export function getPlanBySlug(slug: string): MzPlan | undefined {
  return MZ_ALL_PLANS.find((p) => p.slug === slug);
}

export function getB2CPlanByAudience(audience: B2CAudience): MzPlan | undefined {
  return MZ_B2C_PLANS.find((p) => p.target_audience === audience);
}

export function getB2BPlansByAudience(audience: B2BAudience): MzPlan[] {
  return MZ_B2B_PLANS.filter((p) => p.target_audience === audience);
}

/** Preço final para o ciclo escolhido (mensal/trimestral/anual). */
export function computePrice(plan: MzPlan, billing: Billing): number {
  return Math.round(plan.price_mzn * BILLING_DISCOUNT[billing].multiplier);
}

/** Calcula meses de duração para o ciclo (1/3/12). */
export function computePeriodMonths(billing: Billing): number {
  return billing === 'monthly' ? 1 : billing === 'quarterly' ? 3 : 12;
}

/** Calcula data de expiração ISO a partir de hoje. */
export function computeExpiry(billing: Billing): string {
  const months = computePeriodMonths(billing);
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

/** Formata valor em MZN no locale pt-MZ. */
export function formatMZN(value: number): string {
  return value.toLocaleString('pt-MZ', { maximumFractionDigits: 0 });
}

/**
 * Faz upsert idempotente dos 14 planos MZ para a BD.
 * Requer que o caller seja admin (RLS policy). Se for chamado por
 * utilizador não-admin, falha silenciosamente (não lança).
 *
 * @returns {seeded: number, failed: string[]} contagem de sucesso/erro.
 */
export async function seedMzPlans(): Promise<{ seeded: number; failed: string[] }> {
  const failed: string[] = [];
  let seeded = 0;

  for (const plan of MZ_ALL_PLANS) {
    try {
      const { error } = await (supabase as any).from('subscription_plans').upsert(
        {
          slug: plan.slug,
          name: plan.name,
          description: plan.description,
          price_mzn: plan.price_mzn,
          billing_period: plan.billing_period,
          target_audience: plan.target_audience,
          features: plan.features,
          badge: plan.badge || null,
          is_active: true,
          sort_order: plan.kind === 'b2c'
            ? MZ_B2C_PLANS.indexOf(plan) + 1
            : 50 + MZ_B2B_PLANS.indexOf(plan),
          period_months: plan.period_months,
        },
        { onConflict: 'slug' }
      );
      if (error) {
        console.warn(`[mzPlans] seed falhou para ${plan.slug}:`, error.message);
        failed.push(plan.slug);
      } else {
        seeded++;
      }
    } catch (e) {
      console.warn(`[mzPlans] seed exception para ${plan.slug}:`, e);
      failed.push(plan.slug);
    }
  }

  return { seeded, failed };
}

/**
 * Tenta buscar um plano da BD por slug. Se não existir (ou BD indisponível),
 * faz fallback para o plano em memória (MZ_ALL_PLANS).
 *
 * Isto garante que o fluxo /subscribe/:slug NUNCA parte — mesmo se a BD
 * ainda não tiver o migration applied.
 */
export async function fetchPlanBySlug(slug: string): Promise<MzPlan | null> {
  // 1. Tenta BD primeiro
  try {
    const { data, error } = await (supabase as any)
      .from('subscription_plans')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (!error && data) {
      // Merge com versão em memória (se slug coincide) para preencher campos extra
      // como tagline, cta, kind — que não estão na BD mas existem em MZ_ALL_PLANS.
      const memPlan = getPlanBySlug(data.slug);
      return {
        slug: data.slug,
        name: data.name || memPlan?.name || '',
        tagline: memPlan?.tagline || data.description || '',
        description: data.description || memPlan?.description || '',
        price_mzn: Number(data.price_mzn) || memPlan?.price_mzn || 0,
        billing_period: data.billing_period || memPlan?.billing_period || 'monthly',
        target_audience: data.target_audience as PlanAudience,
        features: Array.isArray(data.features) && data.features.length > 0
          ? data.features
          : (memPlan?.features || []),
        badge: data.badge || memPlan?.badge || undefined,
        cta: memPlan?.cta || 'Subscrever agora',
        period_months: Number(data.period_months) || memPlan?.period_months || 1,
        kind: memPlan?.kind || (MZ_B2B_PLANS.some((p) => p.slug === slug) ? 'b2b' : 'b2c'),
      };
    }
  } catch (e) {
    console.warn('[mzPlans] fetchPlanBySlug BD lookup falhou, usando fallback:', e);
  }

  // 2. Fallback: MZ_ALL_PLANS em memória
  return getPlanBySlug(slug) || null;
}

/**
 * Tenta buscar o UUID do plano na BD por slug. Necessário porque a tabela
 * subscriptions exige plan_id (uuid), não slug.
 *
 * Se falhar, devolve null — o caller deve abortar com mensagem clara.
 */
export async function fetchPlanIdBySlug(slug: string): Promise<string | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('subscription_plans')
      .select('id')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();
    if (!error && data?.id) return data.id as string;
  } catch (e) {
    console.warn('[mzPlans] fetchPlanIdBySlug falhou:', e);
  }
  return null;
}
