import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Function initialized");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Error de configuración del servidor: Faltan variables de entorno (SUPABASE_URL o KEY)');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

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
      .maybeSingle()

    if (creditError) {
      throw new Error(`Error fetching credits: ${creditError.message}`);
    }

    const currentCredits = creditData?.credits ?? 0;

    if (currentCredits < 1) {
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

    const { imageBase64, mimeType, name } = body;
    if (!imageBase64) throw new Error('Image data missing');
    if (!mimeType) throw new Error('Mime type missing');

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

    const model = 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

    console.log(`Calling Gemini Model: ${model}`);

    // Updated prompt for better accuracy with complex tables and handwritten text
    // Updated prompt for SIKAI CX Enterprise Level Extraction v3.5 (Colombian Strict Mode)
    const prompt = `You are the SIKAI CX Intelligence Engine.
    Analyze the provided invoice image and extract ALL available data into a strict JSON format.
    
    CRITICAL FORMATTING INSTRUCTIONS (COLOMBIAN CONTEXT):
    1. NUMBERS (STRICT INTEGER MODE): 
       - COLOMBIAN PESO (COP) HAS NO DECIMALS.
       - "1.241.000" IS ONE MILLION... -> 1241000
       - "24.370" IS TWENTY FOUR THOUSAND... -> 24370
       - "15.126" IS FIFTEEN THOUSAND... -> 15126
       - NEVER interpret a dot (.) as a decimal point. REMOVE ALL DOTS before parsing.
       - Example: Input "24.370" -> Output Number 24370 (NOT 24.37).
       - REJECT any result that looks like a small decimal number for a price (e.g. 24.37 is IMPOSSIBLE for a product price, must be 24370).
    
    2. DATES: ISO format YYYY-MM-DD.
    
    3. ITEMS TABLE (EXTRACT EVERYTHING):
       - Look for column headers like "Item", "Código", "Descripción", "Cantid", "Vr. Unit", "Total".
       - "code": Extract the text from the "Código" or "Referencia" column (e.g., "NT-COOL", "NT-CUT").
       - "description": Extract the FULL multi-line text from the description column. DO NOT TRUNCATE.
       - "tax_rate": Look for "% IVA" or similar.
    
    EXTRACT THESE FIELDS:
    
    A. HEADER INFO:
       - provider_name (e.g. NEW TURBO SAS)
       - nit (Clean number)
       - invoice_number (Clean number)
       - dian_resolution_text (Full legal text)
       - date
       - due_date
       - seller
       - payment_method
       - order_number
       - remission_number

    B. CLIENT INFO:
       - client_name
       - client_nit
       - address
       - city
       - phone

    C. ITEMS LIST (Array):
       - code (Make sure to populate this from the 'Código' column)
       - description
       - quantity (number)
       - unit_measure
       - unit_price (number)
       - tax_rate (string, e.g. "19%")
       - tax_amount (number)
       - total (number)

    D. TOTALS:
       - subtotal
       - discount
       - subtotal_after_discount
       - total_iva
       - total_amount (This is the grand total. Ensure it matches the visual "Total de la Operación")
       - amount_text

    4. "raw_data": Any extra info.

    Required JSON Structure:
    {
      "provider_name": "string",
      "nit": "string",
      "invoice_number": "string",
      "dian_resolution_text": "string",
      "date": "string",
      "due_date": "string",
      "seller": "string",
      "payment_method": "string",
      "order_number": "string",
      "remission_number": "string",
      "client_name": "string",
      "client_nit": "string",
      "address": "string",
      "city": "string",
      "phone": "string",
      "items": [
        { 
          "code": "string",
          "description": "string", 
          "quantity": number, 
          "unit_measure": "string",
          "unit_price": number, 
          "tax_rate": "string",
          "tax_amount": number,
          "total": number 
        }
      ],
      "subtotal": number,
      "discount": number,
      "subtotal_after_discount": number,
      "total_iva": number,
      "total_amount": number,
      "amount_text": "string",
      "raw_data": {}
    }

    Return ONLY raw JSON. No markdown.`;

    const payload = {
      contents: [{
        parts: [
          { text: prompt },
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
      console.error("Gemini API Error Full Response:", JSON.stringify(data));

      // Return 200 to ensure the body is seen by frontend
      return new Response(JSON.stringify({
        error: `Gemini Error ${response.status}: ${data.error?.message || 'Unknown'} `,
        details: data
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("AI Raw Response:", text);

    if (!text) {
      throw new Error("La IA no devolvió texto.");
    }

    const cleanText = text.replace(/```json\n ?|\n ? ```/g, "").trim();
    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanText);
    } catch (e) {
      console.error("JSON Parse Error. Clean Text:", cleanText);
      throw new Error("Fallo al leer respuesta de IA (JSON inválido)");
    }

    // 6. Deduct Credit
    const { error: updateError } = await supabaseAdmin
      .from('users_credits')
      .update({ credits: currentCredits - 1 })
      .eq('user_id', user.id);

    if (updateError) {
      console.error("Failed to decrement credit", updateError);
    }

    // 7. Save Scan
    // Include 'name' in the insert (default to provider name or date if empty, handled by frontend usually but good to fallback)
    const scanName = name || parsedResult.provider_name || `Scan ${new Date().toLocaleDateString()} `;

    const { error: scanError } = await supabaseAdmin.from('scans').insert({
      user_id: user.id,
      name: scanName,
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
    console.error("UNHANDLED ERROR:", error);
    // Return 200 to ensure the body is seen by frontend
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack,
      isr_error: true
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
