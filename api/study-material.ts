
import { readSheetData, findAndUpsertRow } from './_lib/sheets-service.js';
import { supabase, upsertSupabaseData } from './_lib/supabase-service.js';
import { GoogleGenAI } from "@google/genai";

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

    const { topic, forceRefresh } = body || {};
    if (!topic) return res.status(400).json({ error: 'Topic is required' });

    try {
        // 1. Check Cache Layers (Only if not force refreshing)
        if (!forceRefresh) {
            if (supabase) {
                const { data: cachedSb } = await supabase
                    .from('studymaterialscache')
                    .select('content')
                    .eq('topic', topic)
                    .single();
                if (cachedSb) return res.status(200).json({ notes: cachedSb.content, cached: true });
            }

            const cacheRows = await readSheetData('StudyMaterialsCache!A2:C');
            const cachedItem = cacheRows.find((r: any) => String(r[0] || '').toLowerCase() === topic.toLowerCase());
            if (cachedItem) return res.status(200).json({ notes: cachedItem[1], cached: true });
        }

        // 2. Generate specialized AI content
        const apiKey = process.env.API_KEY;
        if (!apiKey) throw new Error('AI API Key missing');

        const ai = new GoogleGenAI({ apiKey });
        
        const systemPrompt = forceRefresh 
            ? `You are an expert Kerala PSC researcher. Generate an extremely DEEP and COMPREHENSIVE masterclass on "${topic}" in Malayalam. 
               This should go beyond basic facts and include advanced historical contexts, rarely asked but important PSC data points, and detailed explanations.`
            : `You are a Senior Kerala PSC Teacher. Generate structured study notes in Malayalam for: "${topic}".`;

        const aiResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `${systemPrompt}
            
            Guidelines:
            - Provide structured points under clear headings.
            - Include important years, people, and specific PSC facts.
            - Use Markdown: # Main Title, ## Section, **Bold Key Terms**, Bullet Points.
            - Focus ONLY on data relevant to Kerala Government Exams.
            - Length: ${forceRefresh ? 'Extremely Extensive (1200+ words)' : 'Extensive (700-900 words)'}.`,
        });

        const content = aiResponse.text || "വിവരങ്ങൾ ലഭ്യമല്ല.";
        const timestamp = new Date().toISOString();

        // 3. Cache/Update the result
        await Promise.all([
            findAndUpsertRow('StudyMaterialsCache', topic, [topic, content, timestamp]),
            supabase ? upsertSupabaseData('studymaterialscache', [{ topic, content, last_updated: timestamp }], 'topic') : Promise.resolve()
        ]);

        return res.status(200).json({ notes: content, cached: false });

    } catch (error: any) {
        console.error("AI Notes Error:", error.message);
        return res.status(500).json({ error: error.message });
    }
}
