import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apiKey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const API_KEY = "AIzaSyCSmjlxj48ngrPinTo4gdVBzmBf9CPVrFU"

    // 1. Get all active users with push tokens
    const { data: users } = await supabase.from('profiles').select('user_id, full_name, default_city, country_id')

    for (const user of users || []) {
      // 2. Get Weather/AQI for their city via Google Air Quality API
      // Note: This is a placeholder for the actual API call logic
      const aqi = 42; // Simulated AQI
      const temp = 28; // Simulated Temp

      let recommendation = "O dia está ótimo para uma caminhada matinal!";
      if (aqi > 100) recommendation = "Qualidade do ar moderada. Evite exercícios intensos ao ar livre.";
      if (temp > 32) recommendation = "Muito calor hoje. Beba muita água e mantenha-se fresco.";

      // 3. Send Notification (Simulated)
      console.log(`Sending morning health vibe to ${user.full_name}: ${recommendation}`)

      await supabase.from('notifications').insert({
        user_id: user.user_id,
        title: "Bom dia! Sua Vibe de Saúde",
        content: recommendation,
        type: 'health_tip',
        metadata: { aqi, temp }
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
