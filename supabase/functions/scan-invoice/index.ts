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
    // 1. Initialize Supabase Client with User Context
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const authHeader = req.headers.get('Authorization');

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Error de configuración: Faltan variables de entorno standard');
    }

    if (!authHeader) {
      console.error("Missing Authorization Header");
      // RETURN 200 for Debugging visibility in Frontend
      return new Response(JSON.stringify({
        error: 'DEBUG: Missing Authorization Header',
        debug_info: {
          hasAuthHeader: false,
          envUrl: !!supabaseUrl,
          envKey: !!supabaseAnonKey
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Debug Logs
    console.log("Debug: Checking Env Vars");
    console.log("SUPABASE_URL exists:", !!supabaseUrl);
    console.log("SUPABASE_ANON_KEY exists:", !!supabaseAnonKey);
    console.log("Auth Header present:", !!authHeader);

    // Create client scoped to the user
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Initialize Admin Client for Check/Update Credits & AI Logging
    // Use Service Role Key if available, otherwise fall back to Anon Key (though some admin ops might fail)
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey);

    // 2. Verify User
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    // Explicit Log for Debugging
    console.log("Auth User Result:", JSON.stringify({ userFound: !!user, error: userError }));

    if (userError || !user) {
      console.error("Auth Error Full Object:", JSON.stringify(userError));
      // RETURN 200 for Debugging visibility in Frontend
      return new Response(JSON.stringify({
        error: 'DEBUG: Unauthorized User',
        details: userError,
        debug_env_anon: !!supabaseAnonKey,
        debug_header_len: authHeader ? authHeader.length : 0,
        debug_header_preview: authHeader ? authHeader.substring(0, 10) + '...' : 'none'
      }), {
        status: 200,
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

    if (body.imageBase64) {
      console.log(`Received Payload Size: ~${Math.round(body.imageBase64.length / 1024)} KB`);
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

    // DYNAMIC MODEL SELECTION
    // Instead of hardcoding, we ask Google what's available to avoid 404s
    async function getBestModel(apiKey: string): Promise<string> {
      try {
        console.log("Fetching available Gemini models...");
        const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
        const listData = await listResponse.json();

        if (!listData.models) {
          console.warn("Could not list models, defaulting to gemini-1.5-flash");
          return 'gemini-1.5-flash';
        }

        // Prioritized list of preferred models
        // Added 'gemini-1.5-flash-8b' as top priority for speed/timeout avoidance
        const preferences = ['gemini-1.5-flash-8b', 'gemini-1.5-flash', 'gemini-1.5-flash-001', 'gemini-1.5-pro', 'gemini-1.0-pro'];

        // Find the first preferred model that exists in the available list
        for (const pref of preferences) {
          const found = listData.models.find((m: any) => m.name.endsWith(`/${pref}`) && m.supportedGenerationMethods?.includes('generateContent'));
          if (found) {
            console.log(`Selected Dynamic Model: ${found.name}`);
            return found.name.split('/').pop()!; // Return just the model name part
          }
        }

        // Fallback: Pick first available 'generateContent' model
        const fallback = listData.models.find((m: any) => m.supportedGenerationMethods?.includes('generateContent'));
        if (fallback) {
          console.log(`Fallback Model Selected: ${fallback.name}`);
          return fallback.name.split('/').pop()!;
        }

        return 'gemini-1.5-flash'; // Hard fallback
      } catch (err) {
        console.error("Error fetching models:", err);
        return 'gemini-1.5-flash';
      }
    }

    const model = await getBestModel(geminiApiKey);
    // Use v1beta endpoint if possible as it supports more features, but stick to v1 for stability requested by user
    // Actually, dynamic model usually implies checking the endpoint too, but let's stick to v1 structure for the URL for now
    // NOTE: Some models are only on v1beta. If v1 fails to list them, we might need v1beta for listing.
    // Let's try v1 first as intended.
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${geminiApiKey}`;

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

    C. ITEMS LIST (Compact Matrix Mode):
       - To save tokens, return items ONLY as an array of arrays named "items_matrix".
       - DO NOT use objects with keys for items.
       - Column Order: [code, description, quantity, unit_measure, unit_price, tax_rate, tax_amount, total]
       - If a value is missing, use null or 0.

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
      "items_matrix": [
         ["code", "description", quantity, "unit", unit_price, "tax_rate", tax_amount, total],
         ["code", "description", quantity, "unit", unit_price, "tax_rate", tax_amount, total]
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
      }],
      generationConfig: {
        maxOutputTokens: 65536, // 1.5 Flash supports higher output
        temperature: 0.1 // Lower temp for more precision
      }
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

    // Generic cleanup first (remove markdown code blocks)
    let cleanText = text.replace(/```json\n?|```/g, "").trim();

    // Aggressive cleanup: Find the first '{'
    const firstBrace = cleanText.indexOf('{');
    if (firstBrace !== -1) {
      cleanText = cleanText.substring(firstBrace);
    } else {
      throw new Error("No JSON start found in response");
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanText);
    } catch (e) {
      console.log("Direct JSON parse failed, attempting repair for truncation...");
      console.log("Response length:", cleanText.length, "characters");

      // 1. Remove trailing commas (common LLM error)
      cleanText = cleanText.replace(/,(\s*[}\]])/g, '$1');

      // 2. Fix unclosed strings (remove incomplete trailing string)
      // If the text ends with an incomplete string like: "field": "incomplete value
      // We need to close it properly
      const lastQuoteIndex = cleanText.lastIndexOf('"');
      if (lastQuoteIndex > -1) {
        const afterLastQuote = cleanText.substring(lastQuoteIndex + 1).trim();
        // If there's text after the last quote that's not a valid JSON char, truncate it
        if (afterLastQuote && !/^[\s,\]\}]*$/.test(afterLastQuote)) {
          console.log("Removing incomplete string after last quote");
          cleanText = cleanText.substring(0, lastQuoteIndex + 1);
        }
      }

      // 3. Remove trailing incomplete value if it ends mid-field
      // Pattern: ..."field": incomplete_or_truncated
      if (cleanText.trim().match(/"\s*:\s*[^"\[\{\]\}\s,]+$/)) {
        console.log("Removing incomplete trailing value");
        const lastColonIndex = cleanText.lastIndexOf(':');
        if (lastColonIndex > -1) {
          cleanText = cleanText.substring(0, lastColonIndex + 1) + ' null';
        }
      }

      // 4. Remove trailing comma again after cleanup
      cleanText = cleanText.replace(/,(\s*[}\]])/g, '$1');
      if (cleanText.trim().endsWith(',')) {
        cleanText = cleanText.trim().slice(0, -1);
      }

      // 5. Auto-close truncated JSON
      // Basic logic: Count open/close braces and brackets, append missing ones
      const openBraces = (cleanText.match(/{/g) || []).length;
      const closeBraces = (cleanText.match(/}/g) || []).length;
      const openBrackets = (cleanText.match(/\[/g) || []).length;
      const closeBrackets = (cleanText.match(/\]/g) || []).length;

      const missingBraces = openBraces - closeBraces;
      const missingBrackets = openBrackets - closeBrackets;

      if (missingBraces > 0 || missingBrackets > 0) {
        console.log(`Repairing Truncation: Adding ${missingBrackets} ']' and ${missingBraces} '}'`);

        // Append closers. Standard assumption: close arrays first, then objects.
        let closer = "";
        for (let i = 0; i < missingBrackets; i++) closer += "]";
        for (let i = 0; i < missingBraces; i++) closer += "}";

        cleanText += closer;
      }

      try {
        parsedResult = JSON.parse(cleanText);
        console.log("✓ Successfully repaired truncated JSON");
      } catch (innerE) {
        console.error("Final JSON Parse Failed after repair.", innerE);
        console.error("Response stats: Length=", cleanText.length, "OpenBraces=", openBraces, "CloseBraces=", closeBraces);
        console.error("Text preview (last 300 chars):", cleanText.substring(Math.max(0, cleanText.length - 300)));
        throw new Error(`Fallo al procesar PDF: Documento muy extenso (${Math.round(cleanText.length / 1000)}KB de respuesta). Por favor, intente dividir el PDF en archivos más pequeños o contacte soporte.`);
      }
    }

    // EXPAND MATRIX TO OBJECTS (Optimization Reversal)
    if (parsedResult.items_matrix && Array.isArray(parsedResult.items_matrix)) {
      console.log(`Expanding ${parsedResult.items_matrix.length} items from matrix...`);
      parsedResult.items = parsedResult.items_matrix.map((row: any[]) => {
        // Schema: [code, description, quantity, unit, unit_price, tax_rate, tax_amount, total]
        return {
          code: row[0] || "",
          description: row[1] || "",
          quantity: Number(row[2]) || 0,
          unit_measure: row[3] || "",
          unit_price: Number(row[4]) || 0,
          tax_rate: row[5] || "0%",
          tax_amount: Number(row[6]) || 0,
          total: Number(row[7]) || 0
        };
      });
      // Clean up matrix
      delete parsedResult.items_matrix;
    }

    // 5.5. Apply Smart Product Rules (Phase 3)
    if (parsedResult.provider_name && parsedResult.items && Array.isArray(parsedResult.items)) {
      try {
        const { data: rules } = await supabaseAdmin
          .from('product_learning')
          .select('*')
          .eq('provider_name', parsedResult.provider_name)
          .eq('user_id', user.id); // Scan is specific to user

        if (rules && rules.length > 0) {
          console.log(`Applying ${rules.length} rules for ${parsedResult.provider_name}`);

          parsedResult.items = parsedResult.items.map((item: any) => {
            const rule = rules.find((r: any) => {
              // Simple substring or exact match check for now
              // In future could be regex if stored as such
              return item.description && item.description.includes(r.input_pattern);
            });

            if (rule) {
              console.log(`Applying rule: ${rule.input_pattern} -> ${rule.output_product_name}`);
              // Transformation Logic
              // 1. Rename
              item.description = rule.output_product_name;

              // 2. Adjust Quantity/Price if factor > 1
              // If detected "Sixpack", input Qty is 1, but Real Qty is 6.
              // Unit Price should be divided by 6.
              const factor = Number(rule.output_quantity_factor) || 1;
              if (factor > 1) {
                item.quantity = (item.quantity || 1) * factor;
                if (item.unit_price) {
                  item.unit_price = item.unit_price / factor;
                }
              }
            }
            return item;
          });
        }
      } catch (ruleErr) {
        console.error("Error applying rules:", ruleErr);
        // Don't fail the scan if rules fail
      }
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

    const { data: insertedScan, error: scanError } = await supabaseAdmin.from('scans').insert({
      user_id: user.id,
      name: scanName,
      result: parsedResult,
      created_at: new Date().toISOString()
    }).select(); // Select to return the ID

    if (scanError) {
      console.error("Failed to save scan", scanError);
    }

    return new Response(JSON.stringify({
      result: parsedResult,
      scanId: insertedScan?.[0]?.id || null
    }), {
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
