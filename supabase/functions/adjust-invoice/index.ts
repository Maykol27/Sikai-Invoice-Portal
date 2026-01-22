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
        // 1. Initialize Supabase (for Auth check)
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase Config')

        const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

        // 2. Auth Check
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing Authorization Header' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 3. Parse Request
        const { currentData, userPrompt, scanId } = await req.json()
        if (!currentData || !userPrompt) {
            throw new Error('Missing currentData or userPrompt')
        }

        // 3a. Log partial history (User Request) - Optional, or we log at the end with result.
        // We will log at the end to save tokens/db calls, or start a transaction if needed.
        // For now, simple insert after success.

        // 4. Call Gemini
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
        if (!geminiApiKey) throw new Error('Missing Gemini API Key')

        const model = 'gemini-1.5-flash-002' // Using 1.5 Flash 002 for stability and precision
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`

        const systemPrompt = `
      You are an EXPERT ACCOUNTING AI for SIKAI CX.
      Your goal is to MODIFY the provided JSON invoice data based on the User's Voice Command.

      CRITICAL INSTRUCTIONS:
      1. **Calculations**: You MUST perform mathematical calculations if implied. 
         - Example: "The beer is a 6-pack for 47,600 total" -> You must logic: Price = 47600/6. Update Unit Price (~7933), Quantity = 6. Update Line Total.
         - Example: "Change tax to 19%" -> Recalculate tax amounts for items and total tax.
      
      2. **Structure**: Return ONLY a JSON object with this EXACT structure:
         {
           "result": { ...modified invoice data... },
           "suggested_rule": {
              "input_pattern": "string (the original text that caused the issue, e.g. 'PL' or 'Cerveza')",
              "output_product_name": "string (the new corrected name, e.g. 'Pilsen')",
              "output_quantity_factor": number (e.g. 6 if it was a 6-pack, otherwise 1)
           } OR null
         }

      3. **Rule Detection**: If the user is renaming a product or changing its unit logic (e.g. "This comes in boxes of 24"), suggest a rule so we can do this automatically next time.
      4. **Safety**: If the request is nonsensical, return the original JSON unmodified.
    `

        const aiPayload = {
            contents: [{
                parts: [
                    { text: systemPrompt },
                    { text: `CURRENT DATA JSON:\n${JSON.stringify(currentData)}` },
                    { text: `USER COMMAND: "${userPrompt}"` }
                ]
            }]
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

        const cleanText = text.replace(/```json\n ?|\n ?```/g, "").trim()
        const parsedResponse = JSON.parse(cleanText)

        // Handle both old format (just result) and new format (result + suggested_rule) for safety
        const parsedResult = parsedResponse.result || parsedResponse
        const suggestedRule = parsedResponse.suggested_rule || null

        // 5. Log History (Smart Agent)
        if (scanId) {
            const { error: historyError } = await supabaseAdmin.from('adjustment_history').insert({
                user_id: user.id,
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
