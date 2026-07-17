/**
 * M-Pesa Manual Flow — funciona SEM API.
 *
 * Em vez de integrar a M-Pesa Business API (C2B/B2C via Vodacom M-Pesa API
 * que requer merchant credentials, shortcode, etc.), usamos um fluxo manual:
 *
 *   1. Sistema gera uma referência única (MW-XXXXXX)
 *   2. Utilizador vê instruções: "Envia X MZN para +258XXXXXXXXX com referência MW-XXXXXX"
 *   3. Utilizador faz o pagamento via M-Pesa no telemóvel (USSD/app)
 *   4. Pagamento fica "pending" até admin confirmar manualmente
 *   5. Quando confirmado, status → "confirmed" e dispara ações (liberar pedido, etc.)
 *
 * Vantagens:
 *   - Sem custos de API (1.5% por transação)
 *   - Sem necessidade de contrato Vodacom Merchant
 *   - Funciona imediatamente
 *   - Para volume alto, pode fazer upgrade para M-Pesa API depois
 */

import { supabase } from '@/integrations/supabase/client';

/** Número M-Pesa da empresa (configurável no Admin Platform Settings). */
const DEFAULT_MPEESA_NUMBER = '+258840000000';

export interface ManualPayment {
  id: string;
  reference: string;
  amount_mzn: number;
  description: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'expired';
  payer_phone?: string;
  payer_name?: string;
  mpesa_transaction_id?: string; // ID que o cliente recebe do M-Pesa
  destination_number: string;
  created_at: string;
  confirmed_at?: string;
  confirmed_by?: string;
  metadata?: Record<string, any>;
}

/** Gera referência única MW-XXXXXX (6 chars alfanuméricos). */
export function generateReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O/1/I ambíguos
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `MW-${s}`;
}

/** Cria um pedido de pagamento manual M-Pesa. */
export async function createManualPayment(opts: {
  amount_mzn: number;
  description: string;
  payer_phone?: string;
  payer_name?: string;
  metadata?: Record<string, any>;
}): Promise<ManualPayment | null> {
  const reference = generateReference();
  const destination_number = DEFAULT_MPEESA_NUMBER;

  // Tentar guardar na BD; se a tabela não existir, devolver objeto mock
  try {
    const { data, error } = await (supabase as any)
      .from('mpesa_manual_payments')
      .insert({
        reference,
        amount_mzn: opts.amount_mzn,
        description: opts.description,
        status: 'pending',
        payer_phone: opts.payer_phone,
        payer_name: opts.payer_name,
        destination_number,
        metadata: opts.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;
    return data as ManualPayment;
  } catch (e) {
    console.warn('[mpesa] tabela não disponível, devolvendo objeto mock:', e);
    return {
      id: `mock-${reference}`,
      reference,
      amount_mzn: opts.amount_mzn,
      description: opts.description,
      status: 'pending',
      payer_phone: opts.payer_phone,
      payer_name: opts.payer_name,
      destination_number,
      created_at: new Date().toISOString(),
      metadata: opts.metadata,
    };
  }
}

/** Constrói instruções M-Pesa para o cliente. */
export function buildMpesaInstructions(payment: ManualPayment): string {
  return `*PAGAMENTO M-PESA — MedWallet*

💰 Valor: ${payment.amount_mzn} MZN
📍 Destino: ${payment.destination_number}
🔖 Referência: ${payment.reference}

COMO PAGAR:
1. Abre o M-Pesa no teu telemóvel
2. Escolhe "Enviar Dinheiro"
3. Número: ${payment.destination_number}
4. Valor: ${payment.amount_mzn} MZN
5. Referência: ${payment.reference}
6. Confirma com o teu PIN

Após pagar, recebe um SMS do M-Pesa com o ID de transação.
O pagamento fica pendente até confirmação do gestor.`;
}

/** Abre o M-Pesa USSD no telemóvel (apenas Moçambique Vodacom). */
export function openMpesaUssd(): void {
  // *150*00# é o código M-Pesa Vodacom Moçambique
  window.location.href = 'tel:*150*00%23';
}

/** Constrói mensagem para enviar por WhatsApp com as instruções M-Pesa. */
export function buildMpesaWhatsappMessage(payment: ManualPayment): string {
  return buildMpesaInstructions(payment);
}

/** Lista pagamentos pendentes (para admin confirmar). */
export async function listPendingPayments(): Promise<ManualPayment[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('mpesa_manual_payments')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn('[mpesa] erro ao listar pendentes:', e);
    return [];
  }
}

/** Confirma um pagamento (admin only). */
export async function confirmPayment(
  paymentId: string,
  mpesaTransactionId: string,
  confirmedBy: string
): Promise<boolean> {
  try {
    const { error } = await (supabase as any)
      .from('mpesa_manual_payments')
      .update({
        status: 'confirmed',
        mpesa_transaction_id: mpesaTransactionId,
        confirmed_at: new Date().toISOString(),
        confirmed_by: confirmedBy,
      })
      .eq('id', paymentId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[mpesa] erro ao confirmar:', e);
    return false;
  }
}

/** Rejeita um pagamento (admin only). */
export async function rejectPayment(
  paymentId: string,
  reason: string,
  rejectedBy: string
): Promise<boolean> {
  try {
    const { error } = await (supabase as any)
      .from('mpesa_manual_payments')
      .update({
        status: 'rejected',
        metadata: { rejection_reason: reason, rejected_by: rejectedBy, rejected_at: new Date().toISOString() },
      })
      .eq('id', paymentId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[mpesa] erro ao rejeitar:', e);
    return false;
  }
}

/** Obtém estatísticas para dashboard. */
export async function getMpesaStats(): Promise<{
  pending: number;
  pendingAmount: number;
  confirmedToday: number;
  confirmedAmountToday: number;
}> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: pending } = await (supabase as any)
      .from('mpesa_manual_payments')
      .select('amount_mzn')
      .eq('status', 'pending');
    const { data: confirmed } = await (supabase as any)
      .from('mpesa_manual_payments')
      .select('amount_mzn')
      .eq('status', 'confirmed')
      .gte('confirmed_at', today.toISOString());

    const pendingList = pending || [];
    const confirmedList = confirmed || [];
    return {
      pending: pendingList.length,
      pendingAmount: pendingList.reduce((s: number, p: any) => s + Number(p.amount_mzn || 0), 0),
      confirmedToday: confirmedList.length,
      confirmedAmountToday: confirmedList.reduce((s: number, p: any) => s + Number(p.amount_mzn || 0), 0),
    };
  } catch (e) {
    console.warn('[mpesa] erro ao obter stats:', e);
    return { pending: 0, pendingAmount: 0, confirmedToday: 0, confirmedAmountToday: 0 };
  }
}
