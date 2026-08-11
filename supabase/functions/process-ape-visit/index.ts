import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface VisitRequest {
  visit_id?: string;
  patient_name?: string;
  patient_phone?: string;
  referral_reason?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized: token ausente' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return json({ error: 'Token invalido' }, 401);

    // Verify APE role — use role::text comparison
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    const roleNames = (roles || []).map(r => r.role);
    const isAPE = roleNames.includes('health_worker') || 
                  roleNames.includes('admin') || 
                  roleNames.includes('country_manager');
    if (!isAPE) return json({ error: 'Acesso negado: apenas APEs ou admin' }, 403);

    const body: VisitRequest = await req.json();
    if (!body.visit_id) {
      return json({ error: 'visit_id e obrigatorio' }, 400);
    }

    // Step 1: Process compensation via atomic RPC
    const { data: compResult, error: compErr } = await supabase.rpc('process_ape_visit_compensation', {
      _visit_id: body.visit_id,
      _bonus_amount: 0,
      _reason: 'visit_completed'
    });

    if (compErr || !compResult?.success) {
      return json({ error: 'Falha na compensacao', details: compResult?.error || compErr?.message }, 500);
    }

    // Step 2: Track patient referral (if new patient)
    let referralResult = null;
    if (body.patient_name && body.patient_phone) {
      const { data } = await supabase
        .from('ape_patient_referrals')
        .insert({
          ape_user_id: user.id,
          patient_name: body.patient_name,
          patient_phone: body.patient_phone,
          referral_reason: body.referral_reason || 'new_patient'
        })
        .select('id, reward_joy_coins, reward_mzn')
        .single();
      referralResult = data;
    }

    // Step 3: Get APE stats
    const { data: stats } = await supabase.rpc('get_ape_dashboard', {
      _ape_user_id: user.id
    });

    return json({
      success: true,
      compensation: {
        id: compResult.compensation_id,
        amount_mzn: compResult.amount_mzn,
        new_balance: compResult.new_balance,
        joy_coins: compResult.joy_coins,
        reason: compResult.reason
      },
      referral: referralResult ? {
        id: referralResult.id,
        reward_joy_coins: referralResult.reward_joy_coins,
        reward_mzn: referralResult.reward_mzn
      } : null,
      stats: stats?.[0] || null
    });

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