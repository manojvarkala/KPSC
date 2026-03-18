
import { createClient } from '@supabase/supabase-js';
import { smartParseOptions } from './utils.js';

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
        const intIdTables = ['questionbank', 'results', 'liveupdates', 'syllabus'];
        if (intIdTables.includes(cleanTable) && entry.id !== undefined && entry.id !== null) {
            const parsedId = parseInt(String(entry.id));
            if (isNaN(parsedId)) {
                delete entry.id; // Let DB handle it if it's not a valid number
            } else {
                entry.id = parsedId;
            }
        } else if (entry.id !== undefined && entry.id !== null) {
            entry.id = String(entry.id).trim();
        }

        // Mandatory field protection (avoid null value violation)
        if (cleanTable === 'settings' && (entry.value === undefined || entry.value === null)) {
            entry.value = '';
        }
        if (cleanTable === 'syllabus' && (entry.title === undefined || entry.title === null)) {
            entry.title = entry.topic || 'General Topic';
        }

        // Numeric field sanitization
        if (entry.correct_answer_index !== undefined) entry.correct_answer_index = parseInt(String(entry.correct_answer_index || '0'));
        if (entry.questions !== undefined) entry.questions = parseInt(String(entry.questions || '0'));
        if (entry.duration !== undefined) entry.duration = parseInt(String(entry.duration || '0'));
        
        // Options sanitization for questionbank
        if (cleanTable === 'questionbank' && entry.options !== undefined) {
            entry.options = smartParseOptions(entry.options);
        }

        return entry;
    });

    // 2. CRITICAL: Deduplicate the input array by the primary key
    // This prevents "ON CONFLICT DO UPDATE command cannot affect row a second time"
    const uniqueMap = new Map();
    const noPkItems: any[] = [];

    processedData.forEach(item => {
        const pkValue = item[onConflict];
        if (pkValue !== undefined && pkValue !== null && pkValue !== '') {
            uniqueMap.set(pkValue, item);
        } else {
            // For items without a PK, we can try to find a natural key to deduplicate within the batch
            // but we DON'T set it as the 'id' field because 'id' might be an integer/smallint
            let naturalKey = null;
            if (cleanTable === 'syllabus' && item.exam_id && item.topic) {
                naturalKey = `syllabus_${item.exam_id}_${item.topic}`;
            }
            
            if (naturalKey) {
                uniqueMap.set(naturalKey, item);
            } else {
                noPkItems.push(item);
            }
        }
    });
    
    const finalBatch = [...Array.from(uniqueMap.values()), ...noPkItems];

    if (finalBatch.length === 0) return null;

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
    const intIdTables = ['questionbank', 'results', 'liveupdates', 'syllabus'];
    const cleanId = intIdTables.includes(cleanTable) ? parseInt(id) : id;
    const { error } = await supabase.from(cleanTable).delete().eq('id', cleanId);
    if (error) throw error;
}
