
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseKey) 
    ? createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      }) 
    : null;

export async function upsertSupabaseData(table: string, data: any[], onConflict: string = 'id') {
    if (!supabase || !data.length) return null;
    
    const cleanTable = table.toLowerCase();
    
    // 1. Clean and validate data types
    const processedData = data.map(item => {
        const entry: any = { ...item };
        
        // Define tables with integer IDs
        const intIdTables = ['questionbank', 'results', 'liveupdates'];
        if (intIdTables.includes(cleanTable) && entry.id !== undefined) {
            const parsedId = parseInt(String(entry.id));
            entry.id = isNaN(parsedId) ? (Date.now() + Math.floor(Math.random() * 1000)) : parsedId;
        } else if (entry.id !== undefined) {
            entry.id = String(entry.id).trim();
        }

        // Mandatory field protection (avoid null value violation)
        if (cleanTable === 'settings' && entry.value === undefined || entry.value === null) {
            entry.value = '';
        }

        // Numeric field sanitization
        if (entry.correct_answer_index !== undefined) entry.correct_answer_index = parseInt(String(entry.correct_answer_index || '0'));
        if (entry.questions !== undefined) entry.questions = parseInt(String(entry.questions || '0'));
        if (entry.duration !== undefined) entry.duration = parseInt(String(entry.duration || '0'));
        
        return entry;
    });

    // 2. CRITICAL: Deduplicate the input array by the primary key
    // This prevents "ON CONFLICT DO UPDATE command cannot affect row a second time"
    const uniqueMap = new Map();
    processedData.forEach(item => {
        const pkValue = item[onConflict];
        if (pkValue !== undefined && pkValue !== null) {
            uniqueMap.set(pkValue, item);
        }
    });
    
    const finalBatch = Array.from(uniqueMap.values());

    const { data: result, error } = await supabase
        .from(cleanTable)
        .upsert(finalBatch, { onConflict });

    if (error) {
        console.error(`Supabase Sync Error [${cleanTable}]:`, error.message);
        throw new Error(`Supabase Error: ${error.message}`);
    }
    return result;
}

export async function fetchAllSupabaseData(table: string, select: string = '*') {
    if (!supabase) return [];
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from(table)
            .select(select)
            .range(from, from + step - 1);
            
        if (error) {
            console.error(`Error fetching all data from ${table}:`, error.message);
            break;
        }

        if (data && data.length > 0) {
            allData = [...allData, ...data];
            from += step;
            if (data.length < step) {
                hasMore = false;
            }
        } else {
            hasMore = false;
        }
    }
    return allData;
}

export async function deleteSupabaseRow(table: string, id: string) {
    if (!supabase) return null;
    const cleanTable = table.toLowerCase();
    const intIdTables = ['questionbank', 'results', 'liveupdates'];
    const cleanId = intIdTables.includes(cleanTable) ? parseInt(id) : id;
    const { error } = await supabase.from(cleanTable).delete().eq('id', cleanId);
    if (error) throw error;
}
