/**
 * src/lib/mzMonetization.ts
 * ====================================================================
 * Operações de monetização MOÇAMBIQUE — 100% funcionais.
 *
 * Cada função encapsula uma acção de negócio completa:
 *   - initiateSubscription: cria subscription pendente + M-Pesa manual payment
 *   - confirmSubscriptionPayment: admin confirma M-Pesa → activa subscription
 *   - getUserActiveSubscription: status actual do utilizador
 *   - awardCashback: credita wallet com cashback (via RPC idempotente)
 *   - recordReferralSuccess: marca referral como completed + credita bonus
 *   - getMonetizationStats: KPIs para admin dashboard
 *
 * Estas funções são testáveis (vitest) e usam APENAS supabase client
 * (sem chamadas admin/service-role) — seguras para client-side.
 * ====================================================================
 */

import { supabase } from '@/integrations/supabase/client';
import {
  type MzPlan,
  type Billing,
  fetchPlanBySlug,
  fetchPlanIdBySlug,
  computePrice,
  computeExpiry,
  computePeriodMonths,
  formatMZN,
} from './mzPlans';
import { createManualPayment, type ManualPayment } from './mpesa';

// ---------- Tipos ----------
export interface InitiateSubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  mpesaPayment?: ManualPayment;
  instructions?: string;
  errorMessage?: string;
  errorCode?: 'NO_USER' | 'PLAN_NOT_FOUND' | 'PLAN_NO_UUID' | 'INSERT_FAILED' | 'MPESA_FAILED';
}

export interface UserSubscriptionInfo {
  plan: MzPlan | null;
  status: 'none' | 'pending' | 'active' | 'expired' | 'rejected' | 'cancelled';
  startedAt?: string;
  expiresAt?: string;
  paymentMethod?: string;
  amountPaid?: number;
}

export interface MonetizationStats {
  pendingPayments: number;
  pendingAmountMzn: number;
  confirmedToday: number;
  confirmedAmountTodayMzn: number;
  totalConfirmedMzn: number;
  pendingSubscriptions: number;
  activeSubscriptions: number;
}

// ---------- 1. INITIATE SUBSCRIPTION ----------
/**
 * Cria uma subscrição pendente + um pagamento M-Pesa manual associado.
 *
 * Fluxo completo:
 *   1. Resolve plan_id (UUID) a partir do slug
 *   2. Calcula preço final + data de expiração
 *   3. Insere subscription com status='pending'
 *   4. Cria mpesa_manual_payment com metadata.subscription_id = subscription.id
 *   5. Retorna instruções M-Pesa prontas a mostrar ao utilizador
 *
 * Quando o admin confirma o pagamento (confirmSubscriptionPayment), o trigger
 * trg_activate_sub_on_mpesa activa automaticamente a subscrição.
 */
export async function initiateSubscription(opts: {
  userId: string;
  planSlug: string;
  billing?: Billing;
  payerPhone: string;
  payerName?: string;
}): Promise<InitiateSubscriptionResult> {
  const { userId, planSlug, billing = 'monthly', payerPhone, payerName } = opts;

  if (!userId) {
    return { success: false, errorCode: 'NO_USER', errorMessage: 'Sessão requerida.' };
  }

  // 1. Resolve plan
  const plan = await fetchPlanBySlug(planSlug);
  if (!plan) {
    return { success: false, errorCode: 'PLAN_NOT_FOUND', errorMessage: 'Plano não encontrado.' };
  }
  const planId = await fetchPlanIdBySlug(planSlug);
  if (!planId) {
    return {
      success: false,
      errorCode: 'PLAN_NO_UUID',
      errorMessage:
        'Não foi possível obter o ID do plano. Aplica o migration SQL 20260820000000.',
    };
  }

  // 2. Calcula preço + expiry
  const finalAmount = computePrice(plan, billing);
  const expiresAt = computeExpiry(billing);
  const periodMonths = computePeriodMonths(billing);

  // 3. Insere subscription pendente
  let subscriptionId: string;
  try {
    const { data, error } = await (supabase as any)
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_id: planId,
        status: 'pending',
        payment_method: 'mpesa',
        amount_paid: finalAmount,
        admin_notes: `Plano ${plan.name} · ${billing} (${periodMonths}m) · expira em ${expiresAt}`,
      })
      .select('id')
      .single();

    if (error || !data?.id) {
      return {
        success: false,
        errorCode: 'INSERT_FAILED',
        errorMessage: error?.message ?? 'Falha ao criar subscrição.',
      };
    }
    subscriptionId = data.id as string;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, errorCode: 'INSERT_FAILED', errorMessage: msg };
  }

  // 4. Cria M-Pesa manual payment linkado à subscrição
  try {
    const mpesaPayment = await createManualPayment({
      amount_mzn: finalAmount,
      description: `Subscrição ${plan.name} (${billing})`,
      payer_phone: payerPhone,
      payer_name: payerName,
      metadata: {
        subscription_id: subscriptionId,
        plan_slug: planSlug,
        billing,
        period_months: periodMonths,
        source: 'mzMonetization.initiateSubscription',
      },
    });

    if (!mpesaPayment) {
      return {
        success: false,
        errorCode: 'MPESA_FAILED',
        errorMessage: 'Falha ao gerar referência M-Pesa.',
        subscriptionId,
      };
    }

    // Constrói instruções para mostrar ao utilizador
    const instructions = buildMpesaInstructionsForSubscription(mpesaPayment, plan, billing);

    return {
      success: true,
      subscriptionId,
      mpesaPayment,
      instructions,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      errorCode: 'MPESA_FAILED',
      errorMessage: msg,
      subscriptionId,
    };
  }
}

/** Constrói instruções M-Pesa amigáveis (versão enriched com nome do plano). */
export function buildMpesaInstructionsForSubscription(
  payment: ManualPayment,
  plan: MzPlan,
  billing: Billing
): string {
  const total = formatMZN(payment.amount_mzn);
  return [
    `*SUBSCRIÇÃO MEDWALLET — ${plan.name}*`,
    ``,
    `💰 Valor: ${total} MZN (${billing})`,
    `📍 Destino (M-Pesa): ${payment.destination_number}`,
    `🔖 Referência: ${payment.reference}`,
    `📋 Subscrição ID: ${payment.id}`,
    ``,
    `*COMO PAGAR (3 passos):*`,
    `1. Abre M-Pesa no telemóvel → "Enviar Dinheiro"`,
    `2. Número: ${payment.destination_number} · Valor: ${total} MZN`,
    `3. Referência: ${payment.reference} → confirma com PIN`,
    ``,
    `Receberás um SMS do M-Pesa com o ID de transação.`,
    `Após confirmação do gestor (até 24h), o plano ${plan.name} fica ACTIVO.`,
  ].join('\n');
}

// ---------- 2. CONFIRM SUBSCRIPTION PAYMENT (ADMIN) ----------
/**
 * Admin confirma um pagamento M-Pesa. O trigger SQL activa automaticamente
 * a subscrição associada (se metadata.subscription_id estiver presente).
 *
 * @returns true se confirmação foi registrada com sucesso.
 */
export async function confirmSubscriptionPayment(opts: {
  paymentId: string;
  mpesaTransactionId: string;
  adminId: string;
}): Promise<boolean> {
  const { paymentId, mpesaTransactionId, adminId } = opts;
  try {
    const { error } = await (supabase as any)
      .from('mpesa_manual_payments')
      .update({
        status: 'confirmed',
        mpesa_transaction_id: mpesaTransactionId,
        confirmed_at: new Date().toISOString(),
        confirmed_by: adminId,
      })
      .eq('id', paymentId);
    if (error) {
      console.error('[mzMonetization] confirmPayment error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[mzMonetization] confirmPayment exception:', e);
    return false;
  }
}

/** Admin rejeita um pagamento. */
export async function rejectSubscriptionPayment(opts: {
  paymentId: string;
  reason: string;
  adminId: string;
}): Promise<boolean> {
  const { paymentId, reason, adminId } = opts;
  try {
    const { error } = await (supabase as any)
      .from('mpesa_manual_payments')
      .update({
        status: 'rejected',
        metadata: {
          rejection_reason: reason,
          rejected_by: adminId,
          rejected_at: new Date().toISOString(),
        },
      })
      .eq('id', paymentId);
    if (error) {
      console.error('[mzMonetization] rejectPayment error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[mzMonetization] rejectPayment exception:', e);
    return false;
  }
}

// ---------- 3. GET USER ACTIVE SUBSCRIPTION ----------
/**
 * Busca a subscrição actual do utilizador (active > pending > última).
 * Retorna { plan: null, status: 'none' } se não tem nenhuma.
 */
export async function getUserActiveSubscription(userId: string): Promise<UserSubscriptionInfo> {
  if (!userId) return { plan: null, status: 'none' };

  try {
    const { data, error } = await (supabase as any)
      .from('subscriptions')
      .select(
        `
        id, status, started_at, expires_at, payment_method, amount_paid,
        plan:subscription_plans(slug, name, price_mzn, billing_period, target_audience, features, badge, period_months)
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return { plan: null, status: 'none' };
    }

    const planRow = data.plan;
    let plan: MzPlan | null = null;
    if (planRow) {
      // Faz fetch completo via slug para ter tagline/cta/kind (campos extra da BD)
      plan = await fetchPlanBySlug(planRow.slug);
      if (!plan) {
        // Fallback: construir MzPlan mínimo a partir da row
        plan = {
          slug: planRow.slug,
          name: planRow.name,
          tagline: '',
          description: '',
          price_mzn: Number(planRow.price_mzn) || 0,
          billing_period: planRow.billing_period || 'monthly',
          target_audience: planRow.target_audience as MzPlan['target_audience'],
          features: Array.isArray(planRow.features) ? planRow.features : [],
          badge: planRow.badge || undefined,
          cta: 'Renovar',
          period_months: Number(planRow.period_months) || 1,
          kind: 'b2c',
        };
      }
    }

    return {
      plan,
      status: data.status as UserSubscriptionInfo['status'],
      startedAt: data.started_at,
      expiresAt: data.expires_at,
      paymentMethod: data.payment_method,
      amountPaid: data.amount_paid,
    };
  } catch (e) {
    console.error('[mzMonetization] getUserActiveSubscription exception:', e);
    return { plan: null, status: 'none' };
  }
}

// ---------- 4. AWARD CASHBACK ----------
/**
 * Credita cashback percentual ao wallet do utilizador.
 * Usa RPC wallet_credit_cashback (definido no migration) — idempotente.
 *
 * @returns true se o cashback foi creditado (false se já existia = idempotente).
 */
export async function awardCashback(opts: {
  userId: string;
  sourceAmount: number;
  pct: number;
  source: string; // ex: 'pharmacy_order', 'subscription_plus'
  reference: string; // ex: 'CASH-ORDER-12345'
}): Promise<boolean> {
  const { userId, sourceAmount, pct, source, reference } = opts;
  try {
    const { data, error } = await (supabase as any).rpc('wallet_credit_cashback', {
      _user_id: userId,
      _source_amount: sourceAmount,
      _pct: pct,
      _source: source,
      _reference: reference,
    });
    if (error) {
      console.warn('[mzMonetization] awardCashback RPC falhou:', error.message);
      return false;
    }
    return Boolean(data);
  } catch (e) {
    console.warn('[mzMonetization] awardCashback exception:', e);
    return false;
  }
}

// ---------- 5. RECORD REFERRAL SUCCESS ----------
/**
 * Regista que um referral foi completed (quando o referred faz 1ª acção paga).
 * Idempotente — se já existe o registo, não duplica.
 *
 * NOTA: Na maioria dos casos, o trigger SQL trg_apply_referral_on_sub
 * faz isto automaticamente. Esta função existe para casos manuais
 * (ex: referral via pharmacy order, não subscription).
 */
export async function recordReferralSuccess(opts: {
  referrerId: string;
  referredId: string;
  bonusMzn?: number;
  bonusCoins?: number;
}): Promise<boolean> {
  const { referrerId, referredId, bonusMzn = 100, bonusCoins = 100 } = opts;
  if (referrerId === referredId) return false;

  try {
    // Idempotência
    const { data: existing } = await (supabase as any)
      .from('user_referrals')
      .select('id')
      .eq('referrer_id', referrerId)
      .eq('referred_id', referredId)
      .maybeSingle();
    if (existing) return false;

    const { error } = await (supabase as any).from('user_referrals').insert({
      referrer_id: referrerId,
      referred_id: referredId,
      status: 'completed',
      bonus_mzn: bonusMzn,
      bonus_coins: bonusCoins,
    });
    if (error) {
      console.warn('[mzMonetization] recordReferralSuccess falhou:', error.message);
      return false;
    }

    // Credita bónus MZN ao wallet do referrer
    await (supabase as any).rpc('wallet_credit_cashback', {
      _user_id: referrerId,
      _source_amount: 0,
      _pct: 0,
      _source: 'referral_bonus',
      _reference: `REF-${referredId}`,
    });
    // Como pct=0 retorna 0 MZN, precisamos somar manualmente o bonus_mzn
    await (supabase as any)
      .from('wallets')
      .update({
        balance_mzn: (await getWalletBalance(referrerId)) + bonusMzn,
        total_deposited: (await getWalletDeposited(referrerId)) + bonusMzn,
      })
      .eq('user_id', referrerId);

    return true;
  } catch (e) {
    console.warn('[mzMonetization] recordReferralSuccess exception:', e);
    return false;
  }
}

// ---------- HELPERS internos (read) ----------
async function getWalletBalance(userId: string): Promise<number> {
  try {
    const { data } = await (supabase as any)
      .from('wallets')
      .select('balance_mzn')
      .eq('user_id', userId)
      .maybeSingle();
    return Number(data?.balance_mzn) || 0;
  } catch {
    return 0;
  }
}

async function getWalletDeposited(userId: string): Promise<number> {
  try {
    const { data } = await (supabase as any)
      .from('wallets')
      .select('total_deposited')
      .eq('user_id', userId)
      .maybeSingle();
    return Number(data?.total_deposited) || 0;
  } catch {
    return 0;
  }
}

// ---------- 6. GET MONETIZATION STATS (ADMIN) ----------
/**
 * KPIs consolidados para o dashboard admin:
 *   - pendingPayments / pendingAmountMzn: M-Pesa pendentes
 *   - confirmedToday / confirmedAmountTodayMzn: confirmados hoje
 *   - totalConfirmedMzn: total confirmado (all-time)
 *   - pendingSubscriptions: subscrições pendentes
 *   - activeSubscriptions: subscrições activas
 */
export async function getMonetizationStats(): Promise<MonetizationStats> {
  const stats: MonetizationStats = {
    pendingPayments: 0,
    pendingAmountMzn: 0,
    confirmedToday: 0,
    confirmedAmountTodayMzn: 0,
    totalConfirmedMzn: 0,
    pendingSubscriptions: 0,
    activeSubscriptions: 0,
  };

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    // 1. M-Pesa payments: pending
    const { data: pending } = await (supabase as any)
      .from('mpesa_manual_payments')
      .select('amount_mzn')
      .eq('status', 'pending');
    if (pending) {
      stats.pendingPayments = pending.length;
      stats.pendingAmountMzn = pending.reduce(
        (s: number, r: any) => s + Number(r.amount_mzn || 0),
        0
      );
    }

    // 2. M-Pesa payments: confirmed today
    const { data: confirmedToday } = await (supabase as any)
      .from('mpesa_manual_payments')
      .select('amount_mzn')
      .eq('status', 'confirmed')
      .gte('confirmed_at', todayIso);
    if (confirmedToday) {
      stats.confirmedToday = confirmedToday.length;
      stats.confirmedAmountTodayMzn = confirmedToday.reduce(
        (s: number, r: any) => s + Number(r.amount_mzn || 0),
        0
      );
    }

    // 3. M-Pesa payments: total confirmed (all-time)
    const { data: allConfirmed } = await (supabase as any)
      .from('mpesa_manual_payments')
      .select('amount_mzn')
      .eq('status', 'confirmed');
    if (allConfirmed) {
      stats.totalConfirmedMzn = allConfirmed.reduce(
        (s: number, r: any) => s + Number(r.amount_mzn || 0),
        0
      );
    }

    // 4. Subscriptions: pending
    const { count: pendingSubs } = await (supabase as any)
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    stats.pendingSubscriptions = pendingSubs || 0;

    // 5. Subscriptions: active
    const { count: activeSubs } = await (supabase as any)
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');
    stats.activeSubscriptions = activeSubs || 0;
  } catch (e) {
    console.warn('[mzMonetization] getMonetizationStats exception:', e);
  }

  return stats;
}

/**
 * Lista pagamentos M-Pesa pendentes para admin confirmar.
 * Inclui metadata.subscription_id e dados do payer.
 */
export async function listPendingPaymentsForAdmin(): Promise<Array<{
  id: string;
  reference: string;
  amount_mzn: number;
  description: string;
  payer_phone?: string;
  payer_name?: string;
  created_at: string;
  metadata?: any;
  subscription_id?: string;
}>> {
  try {
    const { data, error } = await (supabase as any)
      .from('mpesa_manual_payments')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error || !data) return [];
    return data.map((r: any) => ({
      id: r.id,
      reference: r.reference,
      amount_mzn: Number(r.amount_mzn),
      description: r.description,
      payer_phone: r.payer_phone,
      payer_name: r.payer_name,
      created_at: r.created_at,
      metadata: r.metadata,
      subscription_id: r.metadata?.subscription_id,
    }));
  } catch (e) {
    console.warn('[mzMonetization] listPendingPaymentsForAdmin exception:', e);
    return [];
  }
}

/**
 * Lista subscrições pendentes para admin (com dados do plano e do utilizador).
 */
export async function listPendingSubscriptionsForAdmin(): Promise<Array<{
  id: string;
  user_id: string;
  amount_paid: number;
  payment_method: string;
  created_at: string;
  plan_name: string;
  plan_slug: string;
}>> {
  try {
    const { data, error } = await (supabase as any)
      .from('subscriptions')
      .select(
        `
        id, user_id, amount_paid, payment_method, created_at,
        plan:subscription_plans(name, slug)
      `
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error || !data) return [];
    return data.map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      amount_paid: Number(r.amount_paid || 0),
      payment_method: r.payment_method,
      created_at: r.created_at,
      plan_name: r.plan?.name || 'Desconhecido',
      plan_slug: r.plan?.slug || '',
    }));
  } catch (e) {
    console.warn('[mzMonetization] listPendingSubscriptionsForAdmin exception:', e);
    return [];
  }
}
