import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apiKey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { order_id, user_id, method, amount, country_id } = await req.json()

    // 1. Lógica específica por método/país
    let qr_code = null;
    let payment_status = 'pending';
    let external_ref = `REF-${Math.random().toString(36).substring(7).toUpperCase()}`;

    if (method === 'pix') {
      // Simulação de geração de PIX via Pagar.me ou Gerencianet
      qr_code = "00020126580014BR.GOV.BCB.PIX0136medwallet-pix-key-sample-1234567895204000053039865802BR5913MEDWALLET BR6009SAO PAULO62070503***6304E22D";
    } else if (method === 'upi') {
      // Simulação de UPI Deep Link para Razorpay
      qr_code = `upi://pay?pa=medwallet@upi&pn=MedWallet%20India&am=${amount}&cu=INR&tn=Order%20${order_id}`;
    } else if (method === 'stripe' || method === 'paystack') {
      // Aqui retornaríamos uma URL de Checkout do Stripe
      qr_code = "https://checkout.stripe.com/pay/sample_session_id";
    } else if (method === 'paypal') {
      // Simulação de URL de aprovação do PayPal
      qr_code = `https://www.paypal.com/checkoutnow?token=EC-${Math.random().toString(36).substring(7).toUpperCase()}`;
    }

    // 2. Criar ou Atualizar o registro de pagamento
    const { data: payment, error: pError } = await supabaseClient
      .from('payments')
      .insert({
        order_id,
        user_id,
        amount,
        method,
        status: payment_status,
        qr_code_base64: qr_code,
        external_reference: external_ref
      })
      .select()
      .single();

    if (pError) throw pError;

    return new Response(
      JSON.stringify({
        ok: true,
        payment_id: payment.id,
        qr_code,
        method_type: method === 'pix' || method === 'upi' ? 'qr' : 'link',
        external_ref
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
