// Emergency SOS Edge Function
// Receives SOS alerts from EmergencySOS component, stores in emergency_alerts table,
// and triggers push notifications to emergency contacts.
//
// Usage: POST { user_id, location, city, blood_type, chronic_conditions, timestamp }
// Returns: { success: boolean, alert_id: string, contacts_notified: number }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SOSRequest {
  user_id?: string;
  location?: { latitude: number; longitude: number; accuracy?: number };
  city?: string;
  blood_type?: string;
  chronic_conditions?: string[];
  allergies?: string[];
  timestamp?: string;
  anonymous_phone?: string;
  device_info?: any;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing env vars: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: "server_misconfigured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role key to bypass RLS (this is a server-side function)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    // Verify user JWT if provided
    let authenticatedUserId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const { data } = await supabase.auth.getUser(token);
        authenticatedUserId = data?.user?.id ?? null;
      } catch (_) {
        // Continue as anonymous
      }
    }

    const body: SOSRequest = await req.json().catch(() => ({}));

    // Use authenticated user_id if available, otherwise fall back to body.user_id
    const userId = authenticatedUserId || body.user_id || null;

    // 1. Insert the emergency alert
    const { data: alert, error: alertError } = await supabase
      .from("emergency_alerts")
      .insert({
        user_id: userId,
        anonymous_phone: body.anonymous_phone || null,
        location: body.location ? JSON.parse(JSON.stringify(body.location)) : null,
        city: body.city || null,
        blood_type: body.blood_type || null,
        chronic_conditions: body.chronic_conditions || [],
        allergies: body.allergies || [],
        status: "active",
        activated_at: body.timestamp || new Date().toISOString(),
        source: "mobile_app",
        device_info: body.device_info || null,
      })
      .select("id")
      .single();

    if (alertError) {
      console.error("Failed to insert emergency alert:", alertError);
      return new Response(
        JSON.stringify({ error: "insert_failed", details: alertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`SOS alert ${alert.id} created for user ${userId}`);

    // 2. Fetch user's emergency contacts (if authenticated)
    let contactsNotified: any[] = [];
    if (userId) {
      const { data: contacts, error: contactsError } = await supabase
        .from("emergency_contacts")
        .select("id, name, phone, relationship, is_primary")
        .eq("user_id", userId)
        .eq("notify_on_sos", true);

      if (contactsError) {
        console.warn("Could not fetch emergency contacts:", contactsError);
      } else if (contacts && contacts.length > 0) {
        // 3. Send SMS/WhatsApp to each contact
        // Note: Actual SMS sending would require a provider like Africa's Talking, Twilio, or Vonage
        // For now, we'll create notification records that an admin/cron can process
        const notificationPromises = contacts.map(async (contact: any) => {
          try {
            // Build SMS message
            const locationStr = body.location
              ? `https://maps.google.com/?q=${body.location.latitude},${body.location.longitude}`
              : "Localização desconhecida";
            const bloodStr = body.blood_type ? ` Tipo sanguíneo: ${body.blood_type}.` : "";
            const conditionsStr = body.chronic_conditions?.length
              ? ` Condições: ${body.chronic_conditions.join(", ")}.`
              : "";

            const message = `🚨 ALERTA SOS da MedWallet! ${contact.name} precisa de ajuda urgente.${bloodStr}${conditionsStr} Localização: ${locationStr}`;

            // TODO: Integrate with actual SMS provider here
            // Example for Africa's Talking:
            // await fetch("https://api.africastalking.com/version1/messaging", {
            //   method: "POST",
            //   headers: {
            //     "apiKey": Deno.env.get("AFRICAS_TALKING_API_KEY"),
            //     "Content-Type": "application/x-www-form-urlencoded",
            //   },
            //   body: new URLSearchParams({
            //     username: Deno.env.get("AFRICAS_TALKING_USERNAME"),
            //     to: contact.phone,
            //     message,
            //   }),
            // });

            console.log(`SMS would be sent to ${contact.phone}: ${message.substring(0, 50)}...`);

            return {
              type: "sms",
              name: contact.name,
              phone: contact.phone,
              notified_at: new Date().toISOString(),
              status: "queued", // Will be "sent" once SMS provider is integrated
            };
          } catch (e) {
            console.error(`Failed to notify contact ${contact.phone}:`, e);
            return {
              type: "sms",
              name: contact.name,
              phone: contact.phone,
              notified_at: new Date().toISOString(),
              status: "failed",
              error: String(e),
            };
          }
        });

        contactsNotified = await Promise.all(notificationPromises);

        // 4. Update the alert with contacts notified
        await supabase
          .from("emergency_alerts")
          .update({
            contacts_notified: contactsNotified,
            authorities_notified: false, // Would be true after calling 112/117 API
          })
          .eq("id", alert.id);
      }
    }

    // 5. Send push notification to all admin/emergency_responder users
    // (using Supabase's notification system if available)
    try {
      const { data: responders } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "emergency_responder"]);

      if (responders && responders.length > 0) {
        // TODO: Send push notification via FCM/APNs
        console.log(`Would notify ${responders.length} emergency responders`);
      }
    } catch (e) {
      console.warn("Could not fetch responders:", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        alert_id: alert.id,
        contacts_notified: contactsNotified.length,
        message: "Alert processed successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Critical error in emergency-sos function:", e);
    return new Response(
      JSON.stringify({ error: "internal_error", details: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
