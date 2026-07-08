import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apiKey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { table_name, record_id, column_name, source_text, target_locales } = await req.json()

    if (!source_text || !target_locales) {
      throw new Error('Missing source_text or target_locales')
    }

    const translations = []

    for (const locale of target_locales) {
      // Aqui integraríamos com Google Cloud Translation API ou OpenAI
      // Por agora, simulamos a chamada de IA para não quebrar sem chaves de API
      console.log(`Translating to ${locale}: ${source_text}`)

      const translated_text = `[${locale.toUpperCase()}] ${source_text}` // Simulação

      const { error: upsertError } = await supabaseClient
        .from('content_translations')
        .upsert({
          table_name,
          record_id,
          column_name,
          locale,
          translated_text,
          is_auto_translated: true
        }, {
          onConflict: 'table_name,record_id,column_name,locale'
        })

      if (upsertError) throw upsertError
      translations.push({ locale, translated_text })
    }

    return new Response(
      JSON.stringify({ ok: true, translations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
