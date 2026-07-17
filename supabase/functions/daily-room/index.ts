import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const DAILY_API = 'https://api.daily.co/v1';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('DAILY_API_KEY');
    if (!apiKey) throw new Error('DAILY_API_KEY em falta');

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return json({ error: 'unauthenticated' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: userRes } = await supabase.auth.getUser(token);
    const user = userRes?.user;
    if (!user) return json({ error: 'unauthenticated' }, 401);

    const { consultation_id } = await req.json();
    if (!consultation_id) return json({ error: 'consultation_id required' }, 400);

    const { data: consult } = await supabase
      .from('consultations')
      .select('id, doctor_id, patient_id, scheduled_at')
      .eq('id', consultation_id).maybeSingle();
    if (!consult) return json({ error: 'consultation not found' }, 404);
    if (consult.doctor_id !== user.id && consult.patient_id !== user.id) {
      return json({ error: 'forbidden' }, 403);
    }

    const isOwner = consult.doctor_id === user.id;

    // Reuse or create session
    const { data: existing } = await supabase
      .from('video_sessions').select('*')
      .eq('consultation_id', consultation_id)
      .in('status', ['waiting', 'active'])
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle();

    let session = existing;
    let roomName = existing?.room_name as string | undefined;
    let roomUrl = existing?.room_url as string | undefined;

    if (!session || !roomName || !roomUrl) {
      roomName = `mw-${consultation_id.slice(0, 8)}-${Date.now().toString(36)}`;
      const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 3; // 3h
      const r = await fetch(`${DAILY_API}/rooms`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roomName,
          privacy: 'private',
          properties: {
            exp,
            enable_prejoin_ui: false,
            enable_chat: true,
            enable_screenshare: true,
            start_video_off: false,
            start_audio_off: false,
            eject_at_room_exp: true,
          },
        }),
      });
      if (!r.ok) return json({ error: 'daily room error', detail: await r.text() }, 500);
      const room = await r.json();
      roomUrl = room.url;

      const { data: ins, error: insErr } = await supabase.from('video_sessions').insert({
        consultation_id,
        room_id: roomName,
        room_name: roomName,
        room_url: roomUrl,
        provider: 'daily',
        status: 'waiting',
        created_by: user.id,
        started_at: new Date().toISOString(),
      }).select().single();
      if (insErr) return json({ error: insErr.message }, 500);
      session = ins;
    }

    // Meeting token per user
    const tokenRes = await fetch(`${DAILY_API}/meeting-tokens`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_id: user.id,
          user_name: user.email?.split('@')[0] ?? 'Participante',
          is_owner: isOwner,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 3,
        },
      }),
    });
    if (!tokenRes.ok) return json({ error: 'daily token error', detail: await tokenRes.text() }, 500);
    const { token: meetingToken } = await tokenRes.json();

    return json({
      session_id: session!.id,
      room_url: roomUrl,
      room_name: roomName,
      token: meetingToken,
      is_owner: isOwner,
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