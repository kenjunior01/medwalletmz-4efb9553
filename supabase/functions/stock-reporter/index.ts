import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// FLYWHEEL 2: Real-time Medication Data
// Users report medication stock/prices → earn Joy Coins → availability alerts

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
    const action = url.searchParams.get('action') || 'report';

    // ACTION: report — Submit stock report (POST)
    if (req.method === 'POST' && action === 'report') {
      const body = await req.json();
      if (!body.product_name || body.in_stock === undefined) {
        return json({ error: 'product_name e in_stock sao obrigatorios' }, 400);
      }

      const { data, error } = await supabase.rpc('report_medication_stock', {
        _reporter_user_id: user.id,
        _product_name: body.product_name,
        _store_name: body.store_name || null,
        _in_stock: body.in_stock,
        _price_mzn: body.price_mzn ?? null,
        _province: body.province ?? null,
        _city: body.city ?? null
      });

      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    // ACTION: search — Find available medication (GET)
    if (req.method === 'GET' && action === 'search') {
      const productName = url.searchParams.get('product_name');
      const province = url.searchParams.get('province');
      const city = url.searchParams.get('city');
      if (!productName) return json({ error: 'product_name obrigatorio' }, 400);

      const { data, error } = await supabase.rpc('suggest_farmacia_popular', {
        _product_name: productName,
        _province: province,
        _city: city
      });

      if (error) return json({ error: error.message }, 500);
      return json({ results: data, query: { product_name: productName, province, city } });
    }

    // ACTION: recent — Get recent reports (GET)
    if (req.method === 'GET' && action === 'recent') {
      const province = url.searchParams.get('province');
      let query = supabase
        .from('medication_stock_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (province) query = query.eq('province', province);
      const { data, error } = await query;
      if (error) return json({ error: error.message }, 500);
      return json({ reports: data });
    }

    return json({ error: 'Acao invalida. Use: report (POST), search (GET), recent (GET)' }, 400);

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