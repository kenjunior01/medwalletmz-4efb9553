import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// FLYWHEEL 4: Community Viral Loop
// Track shares → award Joy Coins → deep link attribution → weekly leaderboard

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
    const action = url.searchParams.get('action') || 'share';

    // ACTION: share — Track a content share (POST)
    if (req.method === 'POST' && action === 'share') {
      const body = await req.json();
      const { data, error } = await supabase.rpc('track_content_share', {
        _user_id: user.id,
        _content_type: body.content_type || 'health_tip',
        _content_id: body.content_id || null,
        _share_channel: body.share_channel || 'whatsapp',
        _recipient_phone: body.recipient_phone || null
      });
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    // ACTION: stats — Get sharing stats for user (GET)
    if (req.method === 'GET' && action === 'stats') {
      const days = parseInt(url.searchParams.get('days') || '30');

      const { count: totalShares } = await supabase
        .from('health_content_shares')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - days * 86400000).toISOString());

      const { count: conversions } = await supabase
        .from('health_content_shares')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('recipient_signed_up', true);

      // Get shares count and user names via separate profiles query
      const { data: shares } = await supabase
        .from('health_content_shares')
        .select('user_id, content_type, share_channel, created_at')
        .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      // Aggregate shares per user for leaderboard
      const userShares: Record<string, { count: number; user_id: string }> = {};
      for (const s of shares || []) {
        const uid = s.user_id;
        if (!userShares[uid]) userShares[uid] = { count: 0, user_id: uid };
        userShares[uid].count++;
      }

      // Fetch profiles for top sharers
      const topUserIds = Object.values(userShares)
        .sort((a, b) => b.count - a.count)
        .slice(0, 20)
        .map(u => u.user_id);

      let leaderboard: Array<{ user_id: string; full_name: string | null; avatar_url: string | null; share_count: number }> = [];
      if (topUserIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', topUserIds);

        const profMap = new Map((profs || []).map((p: { user_id: string; full_name: string; avatar_url: string }) => [p.user_id, p]));
        leaderboard = topUserIds.map(uid => ({
          user_id: uid,
          full_name: profMap.get(uid)?.full_name || null,
          avatar_url: profMap.get(uid)?.avatar_url || null,
          share_count: userShares[uid].count
        }));
      }

      return json({
        my_shares: totalShares || 0,
        my_conversions: conversions || 0,
        weekly_leaderboard: leaderboard
      });
    }

    // ACTION: challenges — Get active community challenges (GET)
    if (req.method === 'GET' && action === 'challenges') {
      const { data, error } = await supabase
        .from('community_challenges')
        .select('*')
        .eq('is_active', true)
        .gte('ends_at', new Date().toISOString())
        .order('starts_at', { ascending: false });
      if (error) return json({ error: error.message }, 500);
      return json({ challenges: data });
    }

    return json({ error: 'Acao invalida. Use: share (POST), stats (GET), challenges (GET)' }, 400);

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