import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// FLYWHEEL 5: Health Finance Score + Cashback + Micro-insurance
// Calculates composite health score, processes cashback, suggests insurance

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Token obrigatorio' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return json({ error: 'Token invalido' }, 401);

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'score';

    // ACTION: score — Calculate/retrieve health finance score (GET)
    if (req.method === 'GET' && action === 'score') {
      const { data, error } = await supabase.rpc('calculate_health_finance_score', {
        _user_id: user.id
      });
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    // ACTION: cashback — Process cashback for a transaction (POST)
    if (req.method === 'POST' && action === 'cashback') {
      const body = await req.json();
      if (!body.source_type || !body.source_id || !body.amount_mzn) {
        return json({ error: 'source_type, source_id, amount_mzn obrigatorios' }, 400);
      }
      const { data, error } = await supabase.rpc('process_cashback', {
        _user_id: user.id,
        _source_type: body.source_type,
        _source_id: body.source_id,
        _amount_mzn: body.amount_mzn,
        _cashback_pct: body.cashback_pct || 5
      });
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    // ACTION: history — Get cashback history (GET)
    if (req.method === 'GET' && action === 'cashback_history') {
      const { data, error } = await supabase
        .from('cashback_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) return json({ error: error.message }, 500);

      const { data: summary } = await supabase
        .from('cashback_transactions')
        .select('cashback_amount_mzn')
        .eq('user_id', user.id);

      const totalEarned = (summary || []).reduce((sum: number, t: { cashback_amount_mzn: number }) => sum + parseFloat(String(t.cashback_amount_mzn)), 0);

      return json({ transactions: data, total_earned_mzn: totalEarned });
    }

    // ACTION: insurance — Suggest micro-insurance based on score (GET)
    if (req.method === 'GET' && action === 'insurance_suggest') {
      // Get current score
      const { data: score } = await supabase.rpc('calculate_health_finance_score', {
        _user_id: user.id
      });

      // Get available micro-insurance products
      const { data: products, error } = await supabase
        .from('micro_insurance_products')
        .select('*')
        .eq('active', true)
        .order('premium_amount', { ascending: true });

      // Suggest based on score: low score → basic insurance, high score → premium
      const suggested = (products || []).filter((p: { premium_amount: number }) => {
        const total = score?.total_score || 50;
        return total < 60 ? p.premium_amount <= 50 : p.premium_amount <= 200;
      });

      return json({ score, suggested_products: suggested, all_products: products });
    }

    return json({
      error: 'Acao invalida. Use: score (GET), cashback (POST), cashback_history (GET), insurance_suggest (GET)'
    }, 400);

  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}