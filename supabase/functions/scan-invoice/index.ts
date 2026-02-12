import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Initialize Supabase Admin Client
    // We need service_role_key to update user credits securely (bypassing RLS if needed, or complying with it)
    // Actually, RLS for 'users_credits' allows update? No, we set policy for SELECT only for users.
    // So we need Service Role to UPDATE credits.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Get User from Auth Header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error("Missing Authorization Header");
      return new Response(JSON.stringify({ error: 'Missing Authorization Header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      console.error("Auth Error:", userError);
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userError }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Check Credits
    const { data: creditData, error: creditError } = await supabaseAdmin
      .from('users_credits')
      .select('credits')
      .eq('user_id', user.id)
      .single()

    if (creditError) {
      throw new Error(`Error fetching credits: ${creditError.message}`);
    }

    if (!creditData || creditData.credits < 1) {
      return new Response(JSON.stringify({ error: 'Insufficient credits', code: 'NO_CREDITS' }), {
        status: 402, // Payment Required
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Parse Request
    let body;
    try {
      body = await req.json();
    } catch (e) {
      throw new Error('Invalid JSON body');
    }

    const { imageBase64, mimeType } = body;
    if (!imageBase64) {
      throw new Error('Image data missing');
    }
    if (!mimeType) {
      throw new Error('Mime type missing');
    }

    // Validate mimeType
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validMimeTypes.includes(mimeType)) {
      throw new Error(`Invalid mime type: ${mimeType}`);
    }

    // 5. Call Gemini
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('Server configuration error: Missing Gemini API Key');
    }

    const model = 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

    const payload = {
      contents: [{
        parts: [
          { text: "Extract the following data from this invoice as JSON: date, nit (tax id), provider_name, total_amount, iva_amount, city. Return ONLY raw JSON without markdown formatting. Ensure 'date' is in ISO format YYYY-MM-DD if possible." },
          {
            inline_data: {
              mime_type: mimeType || "image/jpeg",
              data: imageBase64
            }
          }
        ]
      }]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify(data), { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleanText = text.replace(/```json\n|\n```/g, "").trim();
    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanText);
    } catch (e) {
      throw new Error("Failed to parse AI response as JSON");
    }

    // 6. Deduct Credit
    const { error: updateError } = await supabaseAdmin
      .from('users_credits')
      .decrement('credits', 1)
      .eq('user_id', user.id)

    if (updateError) {
      console.error("Failed to decrement credit", updateError);
      // We continue anyway, but log it. Ideally we should use a transaction or RPC, but simple decrement is fine for MVP.
    }

    // 7. Save Scan
    const { error: scanError } = await supabaseAdmin.from('scans').insert({
      user_id: user.id,
      result: parsedResult,
      created_at: new Date().toISOString()
    });

    if (scanError) {
      console.error("Failed to save scan", scanError);
    }

    return new Response(JSON.stringify({ result: parsedResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
