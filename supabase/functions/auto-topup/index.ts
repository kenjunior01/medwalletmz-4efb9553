import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// FLYWHEEL 5: Auto Top-up configuration
// User sets min balance threshold → system auto-queues top-up when low

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
    const action = url.searchParams.get('action') || 'get';

    // ACTION: get — Get current auto-topup config (GET)
    if (req.method === 'GET' && action === 'get') {
      const { data, error } = await supabase
        .from('auto_topup_configs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      return json({ config: data });
    }

    // ACTION: set — Create or update auto-topup config (POST)
    if (req.method === 'POST' && action === 'set') {
      const body = await req.json();
      const minBalance = body.min_balance_mzn ?? 100;
      const topupAmount = body.topup_amount_mzn ?? 500;
      const paymentMethod = body.payment_method || 'mpesa';

      if (minBalance < 0 || topupAmount < 50) {
        return json({ error: 'Valores invalidos' }, 400);
      }

      const { data, error } = await supabase
        .from('auto_topup_configs')
        .upsert({
          user_id: user.id,
          min_balance_mzn: minBalance,
          topup_amount_mzn: topupAmount,
          payment_method: paymentMethod,
          is_active: body.is_active !== false
        }, { onConflict: 'user_id' })
        .select('*')
        .single();

      if (error) return json({ error: error.message }, 500);
      return json({ success: true, config: data });
    }

    // ACTION: toggle — Enable/disable auto-topup (POST)
    if (req.method === 'POST' && action === 'toggle') {
      const body = await req.json().catch(() => ({}));
      const { data: current } = await supabase
        .from('auto_topup_configs')
        .select('id, is_active')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!current) return json({ error: 'Configure o auto-topup primeiro' }, 400);

      // Toggle: if body.is_active is explicitly provided use it, otherwise flip
      const newState = body.is_active !== undefined ? body.is_active : !current.is_active;

      const { data, error } = await supabase
        .from('auto_topup_configs')
        .update({ is_active: newState })
        .eq('user_id', user.id)
        .select('*')
        .single();

      if (error) return json({ error: error.message }, 500);
      return json({ success: true, config: data });
    }

    return json({ error: 'Acao invalida. Use: get (GET), set (POST), toggle (POST)' }, 400);

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