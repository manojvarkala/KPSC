import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, upsertSupabaseData } from './_lib/supabase-service';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!supabase) return res.status(500).json({ error: "Supabase not configured" });

    try {
        // 1. Get current hit counter
        const { data: setting, error: fetchErr } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'hit_counter')
            .maybeSingle();

        let currentCount = 12345; // Default starting value as requested
        if (setting && setting.value) {
            currentCount = parseInt(setting.value);
        }

        // 2. Increment
        const newCount = currentCount + 1;

        // 3. Save back
        await upsertSupabaseData('settings', [{ key: 'hit_counter', value: String(newCount) }], 'key');

        return res.status(200).json({ count: newCount });
    } catch (error: any) {
        console.error("Hit counter error:", error);
        return res.status(500).json({ error: error.message });
    }
}
