
import { GoogleGenAI, Type } from "@google/genai";
import { findAndUpsertRow } from './sheets-service.js';
import { supabase, upsertSupabaseData } from './supabase-service.js';
import { APPROVED_SUBJECTS, APPROVED_TOPICS } from './scraper-service.js';
import { smartParseOptions } from './utils.js';

declare var process: any;

function getAi() {
    const key = process.env.API_KEY || process.env.GOOGLE_API_KEY;
    if (!key || key.trim() === "") throw new Error("API_KEY missing.");
    return new GoogleGenAI({ apiKey: key.trim() });
}

/**
 * CORE AUDIT LOGIC: Sequential batch processing by ID
 */
export async function auditAndCorrectQuestions() {
    if (!supabase) throw new Error("Supabase required for auditing.");
    
    // 1. Get the last audited ID from settings
    const { data: setting } = await supabase.from('settings').select('value').eq('key', 'last_audited_id').single();
    const lastId = parseInt(setting?.value || '0');

    // 2. FETCH CONDITION: Process the next batch of questions sequentially
    const { data: questions, error: qErr } = await supabase
        .from('questionbank')
        .select('id, question, topic, subject, options, correct_answer_index, difficulty, explanation')
        .gt('id', lastId)
        .order('id', { ascending: true })
        .limit(20); // Smaller batch for higher quality

    if (qErr) throw qErr;
    if (!questions || questions.length === 0) return { message: "All questions audited. Resetting to 0.", completed: true, reset: true };

    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `As a PSC Quality Auditor, your task is to audit and correct these questions.
            
            TASKS:
            1. RE-CLASSIFY: Assign the best matching subject from: [${APPROVED_SUBJECTS.join(', ')}]
            2. TOPIC: Assign the best matching micro-topic from: [${APPROVED_TOPICS.join(', ')}]
            3. RE-WRITE: If the question contains phrases like "താഴെ പറയുന്നവയിൽ നിന്നും" (from the following), re-write it to be direct and clear without needing to see the options first.
            4. EXPLAIN: Ensure a high-quality Malayalam explanation is present.
            5. VALIDATE: Ensure options and correct_answer_index are accurate.
            
            Return JSON array:
            {
              "audited": [
                { 
                  "id": ID, 
                  "question": "Updated Question", 
                  "topic": "Topic Name",
                  "subject": "Subject Name",
                  "explanation": "Detailed Malayalam Explanation",
                  "options": ["A", "B", "C", "D"],
                  "correct_answer_index": 1-4
                }
              ]
            }
            
            Data: ${JSON.stringify(questions)}`,
            config: { 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        audited: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.INTEGER },
                                    question: { type: Type.STRING },
                                    topic: { type: Type.STRING },
                                    subject: { type: Type.STRING },
                                    explanation: { type: Type.STRING },
                                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    correct_answer_index: { type: Type.INTEGER }
                                },
                                required: ["id", "question", "topic", "subject", "explanation", "options", "correct_answer_index"]
                            }
                        }
                    }
                }
            }
        });

        const result = JSON.parse(response.text || "{}");
        const updates = result.audited || [];

        if (updates.length > 0) {
            try {
                await upsertSupabaseData('questionbank', updates);
            } catch (err: any) {
                if (err.message.includes('explanation')) {
                    console.warn("Explanation column missing in questionbank, retrying without it.");
                    const stripped = updates.map(({ explanation, ...rest }: any) => rest);
                    await upsertSupabaseData('questionbank', stripped);
                } else {
                    throw err;
                }
            }
            for (const q of updates) {
                const originalQ = questions.find(oq => oq.id === q.id);
                const finalTopic = q.topic || originalQ?.topic || 'General';
                await findAndUpsertRow('QuestionBank', String(q.id), [
                    q.id, finalTopic, q.question, JSON.stringify(q.options), q.correct_answer_index, q.subject, q.difficulty || 'PSC Level', q.explanation
                ]);
            }
            
            // Update the last audited ID
            const newLastId = Math.max(...updates.map((u: any) => u.id));
            await upsertSupabaseData('settings', [{ key: 'last_audited_id', value: String(newLastId) }], 'key');
            await findAndUpsertRow('Settings', 'last_audited_id', ['last_audited_id', String(newLastId)]);
        }
        
        return { 
            message: `Audited batch up to ID ${Math.max(...updates.map((u: any) => u.id))}.`, 
            changesCount: updates.length 
        };

    } catch (e: any) { 
        console.error("Batch Audit Error:", e.message);
        throw e; 
    }
}
