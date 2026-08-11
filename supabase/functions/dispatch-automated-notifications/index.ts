import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const BATCH_SIZE = 50;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '').trim();
    if (!token) return json({ error: 'Token obrigatorio' }, 401);

    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload?.role !== 'service_role') {
      return json({ error: 'Acesso negado: apenas service_role' }, 403);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json().catch(() => ({}));
    const limit = (body?.limit as number) || BATCH_SIZE;
    const channels = (body?.channels as string[]) || ['push'];

    // Step 1: Fetch pending notifications
    const { data: pending, error: fetchErr } = await supabase
      .rpc('get_pending_notifications', { _limit: limit });

    if (fetchErr || !pending?.length) {
      return json({ dispatched: 0, message: pending?.length ? fetchErr.message : 'Sem notificacoes pendentes' });
    }

    let pushSent = 0, smsSent = 0, whatsappSent = 0, inAppSent = 0, failed = 0;

    for (const notif of pending) {
      const targetChannels = [notif.channel || 'push'];
      const dispatchChannels = channels.includes('all') ? targetChannels : targetChannels.filter((c: string) => channels.includes(c));

      for (const channel of dispatchChannels) {
        try {
          if (channel === 'push' || channel === 'in_app') {
            // In-app notifications are stored in automated_notifications table itself (status = 'sent' makes them visible)
            // Push notifications: TODO integrate Firebase/OneSignal
            await supabase.rpc('mark_notification_sent', {
              _notification_id: notif.id,
              _status: 'sent'
            });
            if (channel === 'in_app') inAppSent++;
            else pushSent++;
          } else if (channel === 'sms') {
            // TODO: Integrate SMS gateway (Vodacom/Movitel)
            await supabase.rpc('mark_notification_sent', {
              _notification_id: notif.id,
              _status: 'sent'
            });
            smsSent++;
          } else if (channel === 'whatsapp') {
            // Log to whatsapp_messages for tracking
            if (notif.phone) {
              await supabase.from('whatsapp_messages').insert({
                phone_to: notif.phone,
                message_body: (notif.title ? notif.title + ': ' : '') + notif.body,
                vertical: notif.vertical,
                metadata: { notification_id: notif.id }
              });
            }
            await supabase.rpc('mark_notification_sent', {
              _notification_id: notif.id,
              _status: 'sent'
            });
            whatsappSent++;
          }
        } catch {
          failed++;
        }
      }
    }

    return json({
      success: true,
      total_pending: pending.length,
      dispatched: { push: pushSent, sms: smsSent, whatsapp: whatsappSent, in_app: inAppSent },
      failed
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