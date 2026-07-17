import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apiKey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, target_lang, source_lang } = await req.json()
    const API_KEY = Deno.env.get('GOOGLE_CLOUD_API_KEY')

    if (!API_KEY) {
      // Fallback for demo/development if key is missing
      return new Response(JSON.stringify({
        translatedText: `[AUTO-TRANSLATED to ${target_lang}] ${text}`,
        status: 'mocked'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        q: text,
        target: target_lang,
        source: source_lang,
        format: 'text'
      })
    })

    const data = await response.json()
    return new Response(JSON.stringify({
      translatedText: data.data.translations[0].translatedText,
      status: 'success'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
