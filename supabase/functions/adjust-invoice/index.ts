import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
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
            return new Response(JSON.stringify({ error: 'Missing Authorization Header' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Create client scoped to the user
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        });

        // 2. Verify User
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            console.error("Auth Error Full Object:", JSON.stringify(userError));
            return new Response(JSON.stringify({
                error: 'Unauthorized',
                details: userError
            }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // 3. Parse Request
        const { currentData, userPrompt, scanId } = await req.json()
        if (!currentData || !userPrompt) {
            throw new Error('Missing currentData or userPrompt')
        }

        // 4. Call Gemini
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
        if (!geminiApiKey) throw new Error('Missing Gemini API Key')

        const model = 'gemini-2.0-flash-exp'; // UPDATED MODEL
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

        console.log(`Calling Gemini Model: ${model}`);

        const systemPrompt = `
      You are an EXPERT ACCOUNTING AI for SIKAI CX.
      Your goal is to MODIFY the provided JSON invoice data based on the User's Voice Command.

      CRITICAL INSTRUCTIONS:
      1. **Calculations**: You MUST perform mathematical calculations if implied. 
         - Example: "The beer is a 6-pack for 47,600 total" -> You must logic: Price = 47600/6. Update Unit Price (~7933), Quantity = 6. Update Line Total.
         - Example: "Change tax to 19%" -> Recalculate tax amounts for items and total tax.
      
      3. **Structure**: Return ONLY a JSON object with this EXACT structure (Use Matrix for items to save space):
         {
           "result": { 
               ... all invoice fields ...,
               "items_matrix": [
                  ["code", "description", quantity, "unit", unit_price, "tax_rate", tax_amount, total]
               ]
           },
           "suggested_rule": {
              "input_pattern": "string",
              "output_product_name": "string",
              "output_quantity_factor": number
           } OR null
         }

      4. **Rule Detection**: If renaming/re-unit, suggest a rule.
      5. **Safety**: Return original JSON if nonsensical.
    `

        const aiPayload = {
            contents: [{
                parts: [
                    { text: systemPrompt },
                    { text: `CURRENT DATA JSON (Convert items to matrix if needed):\n${JSON.stringify(currentData)}` },
                    { text: `USER COMMAND: "${userPrompt}"` }
                ]
            }],
            generationConfig: {
                response_mime_type: "application/json",
                max_output_tokens: 16384
            }
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(aiPayload)
        })

        const data = await response.json()

        if (!response.ok) {
            console.error("Gemini Error", data)
            throw new Error(`Gemini API Error: ${data.error?.message || 'Unknown'}`)
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (!text) throw new Error('No response from AI')

        // ROBUST JSON PARSING (Copied from scan-invoice)
        let cleanText = text.replace(/```json\n?|```/g, "").trim();

        // Find JSON start
        const firstBrace = cleanText.indexOf('{');
        if (firstBrace !== -1) {
            cleanText = cleanText.substring(firstBrace);
        }

        let parsedResponse;
        try {
            parsedResponse = JSON.parse(cleanText);
        } catch (e) {
            console.log("Direct JSON parse failed, attempting repair for truncation...");
            console.log("Response length:", cleanText.length, "characters");

            // 1. Remove trailing commas
            cleanText = cleanText.replace(/,(\s*[}\]])/g, '$1');

            // 2. Fix unclosed strings
            const lastQuoteIndex = cleanText.lastIndexOf('"');
            if (lastQuoteIndex > -1) {
                const afterLastQuote = cleanText.substring(lastQuoteIndex + 1).trim();
                if (afterLastQuote && !/^[\s,\]\}]*$/.test(afterLastQuote)) {
                    console.log("Removing incomplete string after last quote");
                    cleanText = cleanText.substring(0, lastQuoteIndex + 1);
                }
            }

            // 3. Remove trailing incomplete value
            if (cleanText.trim().match(/"\s*:\s*[^"\[\{\]\}\s,]+$/)) {
                console.log("Removing incomplete trailing value");
                const lastColonIndex = cleanText.lastIndexOf(':');
                if (lastColonIndex > -1) {
                    cleanText = cleanText.substring(0, lastColonIndex + 1) + ' null';
                }
            }

            // 4. Remove trailing comma again
            cleanText = cleanText.replace(/,(\s*[}\]])/g, '$1');
            if (cleanText.trim().endsWith(',')) {
                cleanText = cleanText.trim().slice(0, -1);
            }

            // 5. Auto-close truncated JSON
            const openBraces = (cleanText.match(/{/g) || []).length;
            const closeBraces = (cleanText.match(/}/g) || []).length;
            const openBrackets = (cleanText.match(/\[/g) || []).length;
            const closeBrackets = (cleanText.match(/\]/g) || []).length;

            const missingBraces = openBraces - closeBraces;
            const missingBrackets = openBrackets - closeBrackets;

            if (missingBraces > 0 || missingBrackets > 0) {
                console.log(`Repairing Truncation: Adding ${missingBrackets} ']' and ${missingBraces} '}'`);
                let closer = "";
                for (let i = 0; i < missingBrackets; i++) closer += "]";
                for (let i = 0; i < missingBraces; i++) closer += "}";
                cleanText += closer;
            }

            try {
                parsedResponse = JSON.parse(cleanText);
                console.log("✓ Successfully repaired truncated JSON");
            } catch (innerE) {
                console.error("Final JSON Parse Failed after repair.", innerE);
                console.error("Response stats: Length=", cleanText.length, "OpenBraces=", openBraces, "CloseBraces=", closeBraces);
                console.error("Text preview (last 300 chars):", cleanText.substring(Math.max(0, cleanText.length - 300)));
                throw new Error(`Fallo al ajustar factura: Comando muy complejo (${Math.round(cleanText.length / 1000)}KB de respuesta). Intente con un comando más simple.`);
            }
        }

        // Handle both old format (just result) and new format (result + suggested_rule) for safety
        const parsedResult = parsedResponse.result || parsedResponse
        const suggestedRule = parsedResponse.suggested_rule || null

        // EXPAND MATRIX TO OBJECTS IF NEEDED
        if (parsedResult.items_matrix && Array.isArray(parsedResult.items_matrix)) {
            console.log(`Expanding ${parsedResult.items_matrix.length} items from matrix (adjust-invoice)...`);
            parsedResult.items = parsedResult.items_matrix.map((row: any[]) => {
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
            delete parsedResult.items_matrix;
        }

        // 5. Log History (Smart Agent) - Use user-scoped client
        if (scanId) {
            const { error: historyError } = await supabaseClient.from('adjustment_history').insert({
                user_id: user.id, // Confirmed ID from token
                scan_id: scanId,
                user_prompt: userPrompt,
                previous_data: currentData,
                new_data: parsedResult,
                created_at: new Date().toISOString()
            })
            if (historyError) console.error("History Log Error:", historyError)
        }

        return new Response(JSON.stringify({ result: parsedResult, suggested_rule: suggestedRule }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error("Error:", error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 200, // Return 200 so frontend can read the error message
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
