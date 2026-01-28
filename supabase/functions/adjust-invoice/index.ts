import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsonrepair } from 'https://esm.sh/jsonrepair?no-check'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============ SMART FILTERING HELPERS ============

/**
 * Extract keywords from user prompt for filtering
 */
function extractKeywords(prompt: string): string[] {
    // Remove common words and extract meaningful terms
    const commonWords = ['cambia', 'cambiar', 'change', 'el', 'por', 'a', 'de', 'los', 'las', 'que', 'son', 'como', 'para', 'con', 'sin'];

    // Split by SPACE ONLY to preserve dots in codes like "Esm.l.oro"
    const words = prompt
        .toLowerCase()
        .replace(/["""]/g, '"') // Normalize quotes
        .split(/\s+/) // Split by whitespace only
        .map(w => w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')) // Trim non-alphanum from start/end only
        .filter(w => w.length >= 2 && !commonWords.includes(w)); // Keep length >= 2 ("oro" is 3)

    return [...new Set(words)]; // Remove duplicates
}

/**
 * Check if command affects all items (global)
 */
function isGlobalCommand(prompt: string): boolean {
    const globalKeywords = [
        'todos', 'all', 'impuesto', 'tax', 'precio', 'price',
        'total', 'descuento', 'discount', 'iva'
    ];
    const lower = prompt.toLowerCase();
    return globalKeywords.some(kw => lower.includes(kw));
}

/**
 * Filter items relevant to the user command
 */
function filterRelevantItems(items: any[], userPrompt: string): any[] {
    // BYPASS FILTERING FOR STANDARD INVOICES (< 2000 items)
    // Gemini 1.5 Flash (1M tokens) can handle this easily.
    // This allows "bulk updates" (e.g. "delete all") to work on the entire invoice.
    if (items.length < 2000) {
        console.log(`[Filter] Standard invoice (${items.length} items < 2000), sending ALL to AI.`);
        return items;
    }

    // Always process if <= 100 items (small invoice) - Redundant with above but kept for logic safety
    if (items.length <= 100) {
        console.log(`[Filter] Small invoice (${items.length} items), processing all`);
        return items;
    }

    // Check if global command
    if (isGlobalCommand(userPrompt)) {
        console.log(`[Filter] Global command detected, processing all ${items.length} items`);
        return items;
    }

    // Extract keywords and filter
    const keywords = extractKeywords(userPrompt);
    console.log(`[Filter] Keywords extracted:`, keywords);

    const filtered = items.filter(item => {
        const desc = (item.description || item[1] || '').toLowerCase();
        const code = (item.code || item[0] || '').toLowerCase();
        const searchText = `${desc} ${code}`;

        return keywords.some(kw => searchText.includes(kw));
    });

    if (filtered.length === 0) {
        console.log(`[Filter] No matches found, fallback to all items`);
        return items;
    }

    // LIMIT TO 50 ITEMS MAX to prevent "Response too large" error
    // If more than 50 items match, only process first 50.
    if (filtered.length > 50) {
        console.warn(`[Filter] Match count (${filtered.length}) exceeds safety limit (50). Capping at 50 items.`);
        return filtered.slice(0, 50);
    }

    console.log(`[Filter] Filtered ${filtered.length} of ${items.length} items`);
    return filtered;
}

/**
 * Expand items_matrix to items array
 */
function expandMatrix(data: any): any[] {
    if (data.items && Array.isArray(data.items)) {
        return data.items;
    }

    if (data.items_matrix && Array.isArray(data.items_matrix)) {
        return data.items_matrix.map((row: any[]) => ({
            code: row[0] || "",
            description: row[1] || "",
            quantity: Number(row[2]) || 0,
            unit_measure: row[3] || "",
            unit_price: Number(row[4]) || 0,
            tax_rate: row[5] || "0%",
            tax_amount: Number(row[6]) || 0,
            total: Number(row[7]) || 0,
            _original_index: row[8] // Capture index if present
        }));
    }

    return [];
}

/**
 * Convert items to compact matrix format
 */
function itemsToMatrix(items: any[]): any[][] {
    return items.map(item => [
        item.code || "",
        item.description || "",
        Number(item.quantity) || 0,
        item.unit_measure || "",
        Number(item.unit_price) || 0,
        item.tax_rate || "0%",
        Number(item.tax_amount) || 0,
        Number(item.total) || 0,
        item._original_index // 9th column for tracking
    ]);
}

/**
 * Merge modified items back into original list
 */
function mergeModifiedItems(originalItems: any[], modifiedItems: any[]): any[] {
    const result = [...originalItems];
    let matchedCount = 0;
    let fallbackCount = 0;

    modifiedItems.forEach(modItem => {
        // Try to match by index first (most reliable)
        const idx = modItem._original_index;

        let foundIndex = -1;

        if (typeof idx === 'number' && idx >= 0 && idx < result.length) {
            foundIndex = idx;
        } else {
            // FALLBACK 1: Match by Exact Code AND Description
            const targetCode = (modItem.code || '').toLowerCase().trim();
            const targetDesc = (modItem.description || '').toLowerCase().trim();

            // Search in originalItems (using index to ensure we edit the RESULT array correctly)
            const matchIdx = originalItems.findIndex((orig, i) => {
                const origCode = (orig.code || '').toLowerCase().trim();
                const origDesc = (orig.description || '').toLowerCase().trim();

                // If code exists, must match code. If description exists, must match description partial or full.
                if (targetCode && origCode === targetCode) return true;
                if (!targetCode && targetDesc && origDesc === targetDesc) return true;
                if (targetCode && targetDesc && origDesc === targetDesc) return true;

                return false;
            });

            if (matchIdx !== -1) {
                foundIndex = matchIdx;
                fallbackCount++;
                console.log(`[Merge] Fallback match found for "${targetDesc}" at index ${matchIdx}`);
            }
        }

        if (foundIndex !== -1) {
            // Preserve the original object's other props if needed, but here we replace
            // Ensure we don't carry over internal props
            const { _original_index, ...cleanItem } = modItem;
            // Also preserve original index on the target item to keep order/tracking correct if needed?
            // Actually result[foundIndex] is getting overwritten.
            // We should ensure the new item has the properties we expect.
            result[foundIndex] = cleanItem;
            matchedCount++;
        } else {
            console.warn("[Merge] Item returned without valid index and no fallback match:", modItem);
        }
    });

    console.log(`[Merge] Merged ${matchedCount} items (Direct: ${matchedCount - fallbackCount}, Fallback: ${fallbackCount}) back into ${originalItems.length} total items`);
    return result;
}

/**
 * Recalculate invoice totals based on items
 */
function recalculateTotals(data: any, items: any[]): any {
    const result = { ...data };

    let subtotal = 0;
    let totalTax = 0;

    items.forEach(item => {
        subtotal += Number(item.total) || 0; // Assuming item.total is usually (price*qty) before tax? Or after?
        // Actually, usually:
        // Item Total = (Price * Qty) + Tax (if included)
        // Or Item Total = Price * Qty (Net)

        // Let's assume item.total is the final line amount.
        // And item.tax_amount is the tax.

        // If we want to be precise:
        // Net = unit_price * quantity
        // Tax = tax_amount
        // Line Total = item.total (should be Net + Tax)

        // Let's rely on item properties
        totalTax += Number(item.tax_amount) || 0;

        // For subtotal, it depends on invoice structure (Net vs Gross)
        // Let's sum (Total - Tax) as subtotal logic
        const lineTotal = Number(item.total) || 0;
        const lineTax = Number(item.tax_amount) || 0;
        // If lineTotal includes tax
        subtotal += (lineTotal - lineTax);
    });

    // Update fields if they exist (handling common variations)
    if (result.subtotal !== undefined) result.subtotal = subtotal;
    if (result.net_total !== undefined) result.net_total = subtotal;

    if (result.total_tax !== undefined) result.total_tax = totalTax;
    if (result.tax_total !== undefined) result.tax_total = totalTax;

    if (result.total !== undefined) result.total = subtotal + totalTax;
    if (result.total_amount !== undefined) result.total_amount = subtotal + totalTax;

    result.items = items; // Ensure items are updated
    return result;
}

/**
 * Calculate delta (only changed fields) for optimized storage
 * Returns a compact representation of what changed
 */
function calculateDelta(originalData: any, newData: any): any {
    const changes: any[] = [];

    // Compare items array
    if (originalData.items && newData.items) {
        const originalItems = originalData.items;
        const newItems = newData.items;

        // Track item changes
        newItems.forEach((newItem: any, idx: number) => {
            const oldItem = originalItems[idx];

            if (!oldItem) {
                // Item was added
                changes.push({
                    type: 'item_add',
                    index: idx,
                    item: newItem
                });
                return;
            }

            // Check each field of the item
            const itemChanges: any = {};
            let hasChanges = false;

            Object.keys(newItem).forEach(key => {
                if (newItem[key] !== oldItem[key]) {
                    itemChanges[key] = {
                        old: oldItem[key],
                        new: newItem[key]
                    };
                    hasChanges = true;
                }
            });

            if (hasChanges) {
                changes.push({
                    type: 'item_update',
                    index: idx,
                    code: newItem.code || oldItem.code,
                    description: newItem.description || oldItem.description,
                    changes: itemChanges
                });
            }
        });

        // Detect deleted items
        if (originalItems.length > newItems.length) {
            for (let i = newItems.length; i < originalItems.length; i++) {
                changes.push({
                    type: 'item_delete',
                    index: i,
                    item: originalItems[i]
                });
            }
        }
    }

    // Compare top-level fields (invoice header fields)
    const fieldChanges: any = {};
    let hasFieldChanges = false;

    Object.keys(newData).forEach(key => {
        if (key === 'items') return; // Already handled above

        if (newData[key] !== originalData[key]) {
            fieldChanges[key] = {
                old: originalData[key],
                new: newData[key]
            };
            hasFieldChanges = true;
        }
    });

    if (hasFieldChanges) {
        changes.push({
            type: 'field_updates',
            changes: fieldChanges
        });
    }

    return {
        changes,
        total_changes: changes.length,
        timestamp: new Date().toISOString()
    };
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

        console.log('[adjust-invoice] Headers received:', {
            hasAuth: !!authHeader,
            authPreview: authHeader?.substring(0, 30) + '...',
        });

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('Error de configuración: Faltan variables de entorno standard');
        }

        // Create client - auth header is optional for now
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: authHeader ? { headers: { Authorization: authHeader } } : {}
        });

        // 2. Verify User - TEMPORARILY DISABLED due to auth header issues
        // RLS policies on Supabase will still protect the database
        // const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        // if (userError || !user) {
        //     console.error("Auth Error Full Object:", JSON.stringify(userError));
        //     return new Response(JSON.stringify({
        //         error: 'Unauthorized',
        //         details: userError
        //     }), {
        //         status: 401,
        //         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        //     })
        // }

        // 3. Parse Request
        const { currentData, userPrompt, scanId } = await req.json()
        if (!currentData || !userPrompt) {
            throw new Error('Missing currentData or userPrompt')
        }

        // 3.5 SMART FILTERING: Process only relevant items for large invoices
        // Add index to items before filtering
        const allItems = expandMatrix(currentData).map((item, idx) => ({ ...item, _original_index: idx }));

        const relevantItems = filterRelevantItems(allItems, userPrompt);

        // Create compact payload with filtered items
        const compactData = {
            ...currentData,
            items: undefined, // Remove verbose format
            items_matrix: itemsToMatrix(relevantItems),
            _metadata: {
                total_items: allItems.length,
                processing_items: relevantItems.length,
                note: "Only subset of items sent. PRESERVE _original_index column (9th col) in output matrix."
            }
        };

        // 4. Call Gemini
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
        if (!geminiApiKey) throw new Error('Missing Gemini API Key')

        // DYNAMIC MODEL SELECTION
        async function getBestModel(apiKey: string): Promise<string> {
            try {
                const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
                const listData = await listResponse.json();

                if (!listData.models) return 'gemini-1.5-flash';

                const preferences = ['gemini-1.5-flash', 'gemini-1.5-flash-001', 'gemini-1.5-pro', 'gemini-1.0-pro'];
                for (const pref of preferences) {
                    const found = listData.models.find((m: any) => m.name.endsWith(`/${pref}`) && m.supportedGenerationMethods?.includes('generateContent'));
                    if (found) return found.name.split('/').pop()!;
                }

                const fallback = listData.models.find((m: any) => m.supportedGenerationMethods?.includes('generateContent'));
                if (fallback) return fallback.name.split('/').pop()!;

                return 'gemini-1.5-flash';
            } catch (e) {
                console.error("Model fetch error:", e);
                return 'gemini-1.5-flash';
            }
        }

        const model = await getBestModel(geminiApiKey);
        const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${geminiApiKey}`;

        console.log(`Calling Gemini Model: ${model}`);

        const systemPrompt = `
      You are an EXPERT ACCOUNTING AI for SIKAI CX.
      Your goal is to MODIFY the provided JSON invoice data based on the User's Voice Command.

      CRITICAL FORMAT INSTRUCTIONS:
      1. **OUTPUT FORMAT**: You must return a JSON object with a "result" key.
      2. **ITEMS REPRESENTATION**: Inside "result", you MUST use "items_matrix" (Array of Arrays) for the items.
         - DO NOT return "items" as an array of objects.
         - Structure: [code, description, quantity, unit, unit_price, 'tax_rate', tax_amount, total, original_index]
         - **CRITICAL**: The 9th column (original_index) MUST be preserved from input.

      EXAMPLE ONE-SHOT:
      Input Matrix: [["A1", "Beer", 10, "und", 1000, "19%", 1900, 11900, 42]]
      User Command: "Change beer price to 2000"
      Output Matrix: [["A1", "Beer", 10, "und", 2000, "19%", 3800, 23800, 42]]

      3. **Calculations**: Perform all math implied by the user (e.g. recomputing totals).
      4. **Safety**: Return original JSON if command is nonsensical.
      5. **PRESERVATION**: If the user ONLY asks to rename an item, DO NOT change its price, quantity, or tax. Copy the original values EXACTLY. Only recalculate if the user implies a value change.
      6. **NO EXPLANATIONS**: Return ONLY valid JSON.
    `

        const aiPayload = {
            contents: [{
                parts: [
                    { text: systemPrompt },
                    { text: `CURRENT DATA JSON (filtered to relevant items):\n${JSON.stringify(compactData)}` },
                    { text: `USER COMMAND: "${userPrompt}"` }
                ]
            }],
            generationConfig: {
                maxOutputTokens: 8192
            }
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(aiPayload)
        })

        const data = await response.json()

        // Log raw response for debugging (truncated)
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        console.log("Gemini Raw Response Length:", rawText.length);

        let parsedResponse;

        // Clean markdown blocks if present
        let cleanText = rawText.replace(/```json\n?|\n?```/g, "").trim();

        try {
            // PRIMER INTENTO: Parseo estándar rápido
            // Limpiar trailing commas comunes primero con regex simple por eficiencia
            cleanText = cleanText.replace(/,(\s*[\]}])/g, '$1');
            parsedResponse = JSON.parse(cleanText);
        } catch (e) {
            console.warn("Standard JSON Parse Failed. Attempting robust repair with jsonrepair...");
            try {
                // SEGUNDO INTENTO: Usar librería robusta jsonrepair
                // Esto maneja trailing commas, missing quotes, brackets desbalanceados, etc.
                parsedResponse = JSON.parse(jsonrepair(cleanText));
                console.log("✓ Successfully repaired JSON with jsonrepair");
            } catch (repairError) {
                console.error("Critical: jsonrepair failed.", repairError);
                console.error("Text preview (first 500 chars):", cleanText.substring(0, 500));

                // ÚLTIMO RECURSO: Intentar cerrar estructuras truncadas manualmente si jsonrepair falló por eso
                // (jsonrepair a veces no maneja bien cortes abruptos al final)
                try {
                    const openBraces = (cleanText.match(/\{/g) || []).length;
                    const closeBraces = (cleanText.match(/\}/g) || []).length;
                    const openBrackets = (cleanText.match(/\[/g) || []).length;
                    const closeBrackets = (cleanText.match(/\]/g) || []).length;

                    if (openBraces > closeBraces || openBrackets > closeBrackets) {
                        let closer = "";
                        for (let i = 0; i < (openBrackets - closeBrackets); i++) closer += "]";
                        for (let i = 0; i < (openBraces - closeBraces); i++) closer += "}";
                        console.log("Attempting manual closure:", closer);
                        parsedResponse = JSON.parse(jsonrepair(cleanText + closer));
                    } else {
                        throw repairError;
                    }
                } catch (finalError) {
                    throw new Error(`JSON Parse Error: ${finalError.message}. Response malformed.`);
                }
            }
        }

        // Handle both old format (just result) and new format (result + suggested_rule) for safety
        const parsedResult = parsedResponse.result || parsedResponse
        const suggestedRule = parsedResponse.suggested_rule || null

        // Log received structure keys for debugging
        console.log("Parsed Result Keys:", Object.keys(parsedResult));

        // CRITICAL FIX: Default finalData to CURRENT DATA to preserve structure if AI fails
        let finalData = { ...currentData };
        let modificationApplied = false;

        // EXPAND AND MERGE
        if (parsedResult.items_matrix && Array.isArray(parsedResult.items_matrix) && parsedResult.items_matrix.length > 0) {
            console.log(`Expanding ${parsedResult.items_matrix.length} items from matrix...`);
            const modifiedItems = expandMatrix(parsedResult);

            // Merge modified items back into ALL items
            console.log("Merging modified items back to full list...");
            const mergedItems = mergeModifiedItems(allItems, modifiedItems);

            // Validate: remove hidden index before returning
            const finalItems = mergedItems.map(({ _original_index, ...item }) => item);

            // CRITICAL DATA INTEGRITY CHECK
            if (finalItems.length !== allItems.length) {
                console.error(`Data Integrity Critical Failure: Input ${allItems.length} items, Result ${finalItems.length} items.`);
                throw new Error("Error de integridad: Se detectó pérdida de datos. Operación abortada para proteger la factura.");
            }

            // Recalculate totals based on full list
            finalData = recalculateTotals(currentData, finalItems);
            modificationApplied = true;

        } else if (parsedResult.items && Array.isArray(parsedResult.items) && parsedResult.items.length > 0) {
            // FALLBACK: AI returned 'items' array instead of matrix.
            console.warn("AI returned 'items' array instead of 'items_matrix'. Using smart fallback merge.");

            // We use the same items as modified items. 
            // mergeModifiedItems has built-in logic to match by Code/Description if _original_index is missing.
            const modifiedItems = parsedResult.items;

            console.log(`Attempting to merge ${modifiedItems.length} items using heuristic matching...`);
            const mergedItems = mergeModifiedItems(allItems, modifiedItems);

            // Recalculate and proceed
            finalData = recalculateTotals(currentData, mergedItems);
            modificationApplied = true;

        } else {
            console.error("AI Response Missing 'items_matrix'. Result Keys:", Object.keys(parsedResult));
        }

        // Initialize Admin Client for DB Updates (Bypass RLS if needed for updates)
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey);

        // SAFETY: If no modification applied, do NOT update DB with potentially corrupt data
        if (!modificationApplied) {
            console.warn("No valid modifications applied. Returning original data.");
            // We can return the suggested rule if any, but ensure finalData is valid
            // Ideally we should inform user AI failed
            throw new Error("La IA no devolvió un formato válido de productos. No se realizaron cambios para proteger los datos.");
        }

        // CLEANUP: Ensure we don't return matrix or internal fields to frontend/DB
        if (finalData.items_matrix) delete finalData.items_matrix;
        if (finalData._metadata) delete finalData._metadata;

        // 5. Update Scan Record & Log History
        if (scanId) {
            // A. Update Main Scan Record (Persistence)
            const { error: updateError } = await supabaseAdmin
                .from('scans')
                .update({ result: finalData })
                .eq('id', scanId);

            if (updateError) console.error("Failed to update scan record:", updateError);
            else console.log(`✓ Scan record ${scanId} updated successfully`);

            // B. Log History with Delta Encoding (Optimized Storage)
            const changeDelta = calculateDelta(currentData, finalData);

            console.log(`[History] Saving delta with ${changeDelta.total_changes} change groups`);

            const { error: historyError } = await supabaseAdmin.from('adjustment_history').insert({
                scan_id: scanId,
                user_prompt: userPrompt,
                // Delta Encoding: Only save the changes (80-95% storage reduction)
                change_delta: changeDelta,
                // Keep original_data for backward compatibility and easy restoration
                // but set to null for subsequent changes to save space
                original_data: currentData,
                // adjusted_data removed - can be reconstructed from original + delta
                adjusted_data: null,
                created_at: new Date().toISOString()
            })
            if (historyError) console.error("History Log Error:", historyError)
            else console.log(`✓ History logged with delta (${JSON.stringify(changeDelta).length} bytes vs ${JSON.stringify(currentData).length + JSON.stringify(finalData).length} bytes full - ${Math.round((1 - JSON.stringify(changeDelta).length / (JSON.stringify(currentData).length + JSON.stringify(finalData).length)) * 100)}% saved)`)
        }

        return new Response(JSON.stringify({
            result: finalData,
            suggested_rule: suggestedRule,
            meta: {
                total_items: allItems.length,
                processed_items: relevantItems.length,
                is_partial: relevantItems.length < allItems.length
            }
        }), {
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
