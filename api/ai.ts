
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'AI API Key is not configured on the server.' });
    }

    let body = req.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            console.error("Failed to parse request body:", e);
        }
    }

    const { prompt, model = 'gemini-3-flash-preview', responseSchema, useSearch = false } = body || {};

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const config: any = {
            responseMimeType: responseSchema ? "application/json" : "text/plain",
        };

        if (responseSchema) {
            config.responseSchema = responseSchema;
        }

        // Enable Google Search tool if requested (critical for finding external PDF links)
        if (useSearch) {
            config.tools = [{ googleSearch: {} }];
        }

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config
        });

        // Extract text results
        const text = response.text || "";
        
        // Extract grounding chunks for compliance if search was used
        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

        if (responseSchema) {
            try {
                const jsonResult = JSON.parse(text);
                return res.status(200).json({ 
                    data: jsonResult, 
                    sources: groundingMetadata?.groundingChunks || [] 
                });
            } catch (e) {
                return res.status(500).json({ error: 'Failed to parse AI response as JSON', raw: text });
            }
        }

        return res.status(200).json({ text, sources: groundingMetadata?.groundingChunks || [] });

    } catch (error: any) {
        console.error("Gemini API Error:", error);
        return res.status(500).json({ error: error.message || 'An error occurred during AI generation' });
    }
}
