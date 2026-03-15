
import { supabase, upsertSupabaseData } from './_lib/supabase-service.js';
import { readSheetData, findAndUpsertRow } from './_lib/sheets-service.js';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    let body = req.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            console.error("Failed to parse request body:", e);
        }
    }

    const { userId, action, planType } = body || {};

    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    try {
        if (req.method === 'POST' && action === 'upgrade') {
            // Calculate expiry: 365 days from now
            const now = new Date();
            const expiry = new Date();
            expiry.setDate(now.getDate() + 365);
            
            const subEntry = {
                id: userId, // User Clerk ID is used as unique subscription key
                user_id: userId,
                status: 'pro',
                plan_type: planType || 'Annual',
                start_date: now.toISOString(),
                expiry_date: expiry.toISOString(),
                last_updated: now.toISOString()
            };

            // Save to Supabase
            if (supabase) {
                await upsertSupabaseData('subscriptions', [subEntry]);
            }

            // Also mirror to Google Sheets for admin record
            await findAndUpsertRow('Subscriptions', userId, [
                userId, 'pro', subEntry.plan_type, subEntry.start_date, subEntry.expiry_date, subEntry.last_updated
            ]);

            return res.status(200).json({ message: 'Upgraded successfully', expiry: subEntry.expiry_date });
        }

        // Default: GET status (POST is used for body parameters)
        if (supabase) {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('status, expiry_date')
                .eq('user_id', userId)
                .single();

            if (data) {
                const now = new Date();
                const expiry = new Date(data.expiry_date);
                
                // Expiry Logic: If current date passed expiry, revert to free
                if (now > expiry) {
                    return res.status(200).json({ status: 'free', expired: true });
                }
                
                return res.status(200).json({ status: data.status, expiryDate: data.expiry_date });
            }
        }

        return res.status(200).json({ status: 'free' });

    } catch (e: any) {
        console.error("Subscription Error:", e.message);
        return res.status(500).json({ error: e.message });
    }
}
