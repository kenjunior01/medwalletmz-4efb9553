import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: due, error } = await admin
    .from('consultation_reminders')
    .select('id')
    .is('sent_at', null)
    .lte('remind_at', new Date().toISOString())
    .limit(200);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (due && due.length) {
    await admin.from('consultation_reminders')
      .update({ sent_at: new Date().toISOString() })
      .in('id', due.map(d => d.id));
  }
  return new Response(JSON.stringify({ dispatched: due?.length ?? 0 }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});