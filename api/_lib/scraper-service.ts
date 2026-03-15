
import { GoogleGenAI, Type } from "@google/genai";
import { readSheetData, findAndUpsertRow, batchUpsertRows } from './sheets-service.js';
import { supabase, upsertSupabaseData } from './supabase-service.js';

declare var process: any;
const AFFILIATE_TAG = 'tag=malayalambooks-21';

function getAi() {
    const key = process.env.API_KEY || process.env.GOOGLE_API_KEY;
    if (!key || key.trim() === "") throw new Error("API_KEY missing.");
    return new GoogleGenAI({ apiKey: key.trim() });
}

function createNumericHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

const ensureArray = (raw: any): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(String);
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(String) : [String(raw)];
    } catch {
        return [String(raw)];
    }
};

export const APPROVED_SUBJECTS = [
    "Arts, Culture & Sports", "Biology / Life Science", "Chemistry", "Computer Science / IT / Cyber Laws",
    "Current Affairs", "Educational Psychology / Pedagogy", "Electrical Engineering", "English",
    "Environment", "General Knowledge", "General Knowledge / Static GK", "General Science / Science & Tech",
    "Indian Economy", "Indian Geography", "Indian History", "Indian Polity / Constitution",
    "Kerala Geography", "Kerala History", "Kerala History / Renaissance", "Kerala Specific GK",
    "Malayalam", "Nursing Science / Health Care", "Physics", "Quantitative Aptitude",
    "Reasoning / Mental Ability", "Social Science / Sociology"
];

export const SYLLABUS_STRUCTURE = {
  'GK / Current Affairs / History / Geography / Polity / Economy': [
    'Indian History', 'Kerala History & Renaissance', 'World & Indian Geography', 'Kerala Geography', 
    'Indian Economy & Kerala Economy', 'Indian Polity & Constitution', 'Kerala Polity & Administration', 
    'Important Laws & Acts', 'Important National & International Events', 'Current Affairs & Renaissance', 
    'Environment & Forestry', 'Kerala Specific'
  ],
  'Science / Technical / Engineering': [
    'General Science - Physics', 'General Science - Chemistry', 'General Science - Biology & Public Health', 
    'Electrical Circuits & Machines', 'Structural Engineering', 'Power Systems', 'Thermodynamics', 
    'Civil Construction Basics', 'Mechanical Fitting', 'Electrical Wiring', 'Blood Banking Techniques', 
    'Anatomy & Physiology', 'Medical Surgical Nursing', 'Pharmacology & Pharmaceutics', 'Public Health & Sanitation'
  ],
  'Languages / Literature': [
    'Malayalam Grammar', 'Malayalam Vocabulary & Idioms', 'Grammar & Usage', 'Vocabulary & Comprehension', 
    'Basic English', 'Malayalam Language', 'Sanskrit Literature & Grammar', 'English Literature & Language', 
    'Arts Literature Culture & Sports'
  ],
  'Aptitude / Reasoning / Maths': [
    'Basic Arithmetic', 'Mental Ability & Logical Reasoning', 'Arithmetic & Reasoning', 'Simple Maths', 'Algebra & Calculus'
  ],
  'Education / Pedagogy': [
    'Teaching Aptitude & Pedagogy'
  ],
  'Specialized / Subject Specific': [
    'Computer Basics & IT Awareness', 'Library Management', 'Police & Law', 'Excise Laws Basics', 
    'Botany & Plant Physiology', 'Zoology & Animal Physiology', 'Organic & Inorganic Chemistry', 'Mechanics & Electromagnetism'
  ]
};

export const APPROVED_TOPICS = Object.values(SYLLABUS_STRUCTURE).flat();

/**
 * BULK UPLOAD LOGIC: Handles manual entries
 */
export async function bulkUploadQuestions(questions: any[]) {
    if (!supabase) throw new Error("Supabase required.");
    if (!questions.length) return { message: "No questions provided." };

    const { data: maxIdRow } = await supabase.from('questionbank').select('id').order('id', { ascending: false }).limit(1).single();
    let currentId = (maxIdRow?.id || 50000) + 1;

    const sanitized = questions.map(q => ({
        id: q.id || currentId++,
        topic: q.topic || 'General',
        question: q.question,
        options: ensureArray(q.options),
        correct_answer_index: parseInt(String(q.correct_answer_index || q.correctAnswerIndex || 1)),
        subject: q.subject || 'General Knowledge',
        difficulty: q.difficulty || 'PSC Level',
        explanation: q.explanation || ''
    }));

    await upsertSupabaseData('questionbank', sanitized);
    for (const q of sanitized) {
        await findAndUpsertRow('QuestionBank', String(q.id), [q.id, q.topic, q.question, JSON.stringify(q.options), q.correct_answer_index, q.subject, q.difficulty, q.explanation]);
    }
    return { message: `Successfully uploaded ${sanitized.length} questions.` };
}

/**
 * BACKFILL LOGIC: Repairs questions missing explanations
 */
export async function backfillExplanations() {
    if (!supabase) throw new Error("Supabase required.");
    const { data: missing, error } = await supabase.from('questionbank').select('*').or('explanation.is.null,explanation.eq.""').limit(15);
    if (error) throw error;
    if (!missing || missing.length === 0) return { message: "All questions already have explanations." };

    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate high-quality Kerala PSC explanations (in Malayalam) for these questions. Data: ${JSON.stringify(missing)}`,
            config: { responseMimeType: "application/json" }
        });
        const updates = JSON.parse(response.text || "[]");
        if (updates.length > 0) {
            const finalData = missing.map(q => ({ ...q, explanation: updates.find((u: any) => u.id == q.id)?.explanation || q.explanation }));
            await upsertSupabaseData('questionbank', finalData);
            for (const q of finalData) await findAndUpsertRow('QuestionBank', String(q.id), [q.id, q.topic, q.question, JSON.stringify(q.options), q.correct_answer_index, q.subject, q.difficulty, q.explanation]);
            return { message: `Successfully added explanations to ${finalData.length} questions.` };
        }
    } catch (e: any) { throw e; }
    return { message: "Explanation repair batch failed." };
}

/**
 * GENERATION LOGIC: Mirror to Sheets added
 */
export async function generateQuestionsForGaps(batchSizeOrTopic: number | string = 5) {
    if (!supabase) throw new Error("Supabase required.");
    let targetMappings: { topic: string, subject: string }[] = [];

    if (typeof batchSizeOrTopic === 'string') {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(batchSizeOrTopic);
        const queryOr = isUUID ? `id.eq.${batchSizeOrTopic}` : `topic.ilike.%${batchSizeOrTopic}%,title.ilike.%${batchSizeOrTopic}%`;
        
        const { data: mappings } = await supabase.from('syllabus').select('topic, subject, title, id').or(queryOr).limit(1);
        if (mappings?.[0]) {
            let t = mappings[0].topic;
            if (!t || String(t).toLowerCase() === 'null' || String(t).trim() === '') t = mappings[0].title;
            if (!t || String(t).toLowerCase() === 'null' || String(t).trim() === '') t = "General Knowledge";
            targetMappings = [{ topic: String(t), subject: mappings[0].subject || 'General Knowledge' }];
        }
        else throw new Error(`Area "${batchSizeOrTopic}" not found.`);
    } else {
        const { data: sData } = await supabase.from('syllabus').select('topic, subject, title');
        if (!sData?.length) return { message: "No syllabus found." };
        const { data: qData } = await supabase.from('questionbank').select('topic');
        const counts: Record<string, number> = {};
        qData?.forEach(q => { const t = String(q.topic || '').toLowerCase().trim(); if (t) counts[t] = (counts[t] || 0) + 1; });
        targetMappings = sData.map(s => {
            let t = s.topic;
            if (!t || t === 'null' || t.trim() === '') t = s.title;
            if (!t || t === 'null' || t.trim() === '') t = "Unnamed Topic";
            return { topic: t, subject: s.subject || 'General Knowledge', count: counts[String(t).toLowerCase().trim()] || 0 };
        }).sort((a, b) => a.count - b.count).slice(0, batchSizeOrTopic as number);
    }

    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview', 
            contents: `Generate 5 high-quality Kerala PSC MCQs for: ${targetMappings.map(m => `${m.subject} -> ${m.topic}`).join(', ')}.
            
            CONTEXT (Micro-topics grouped by category):
            ${JSON.stringify(SYLLABUS_STRUCTURE, null, 2)}

            CRITICAL RULES:
            1. Subject field MUST be exactly one from this list: [${APPROVED_SUBJECTS.join(', ')}]
            2. Topic field MUST be exactly the topic name provided above (e.g. if I asked for "Computer", the topic must be "Computer").
            3. Questions must be in Malayalam.
            4. Explanations must be in Malayalam.
            
            JSON format: { "topic": "string", "subject": "string", "question": "string", "options": ["A","B","C","D"], "correctAnswerIndex": 1-4, "explanation": "string" }`,
            config: { responseMimeType: "application/json" }
        });
        const items = JSON.parse(response.text || "[]");
        if (items.length > 0) {
            const { data: maxIdRow } = await supabase.from('questionbank').select('id').order('id', { ascending: false }).limit(1).single();
            let currentId = (maxIdRow?.id || 50000) + 1;
            
            const sbData = items.map((item: any) => {
                // If we were targeting a single specific topic, enforce it regardless of what AI returned
                const enforcedTopic = targetMappings.length === 1 ? targetMappings[0].topic : (item.topic || targetMappings[0].topic);
                const enforcedSubject = item.subject || targetMappings[0].subject;

                return {
                    id: currentId++, 
                    topic: enforcedTopic, 
                    question: item.question, 
                    options: ensureArray(item.options), 
                    correct_answer_index: parseInt(String(item.correctAnswerIndex || 1)), 
                    subject: enforcedSubject, 
                    difficulty: 'PSC Level', 
                    explanation: item.explanation || ''
                };
            });
            
            // Save to Supabase
            await upsertSupabaseData('questionbank', sbData);
            
            // Save to Sheets using batchUpsertRows
            const sheetRows = sbData.map((q: any) => ({
                id: String(q.id),
                data: [q.id, q.topic, q.question, JSON.stringify(q.options), q.correct_answer_index, q.subject, q.difficulty, q.explanation]
            }));
            await batchUpsertRows('QuestionBank', sheetRows);
            
            return { message: `Generated ${sbData.length} questions for ${targetMappings.map(m => m.topic).join(', ')}.` };
        }
    } catch (e: any) { 
        console.error("Gap Filler Error:", e.message);
        throw e; 
    }
    return { message: "No questions generated." };
}

export async function generateFlashCards(batchSize: number = 5) {
    if (!supabase) throw new Error("Supabase required.");
    
    // 1. Get topics that don't have many flashcards
    const { data: sData } = await supabase.from('syllabus').select('topic, title');
    const { data: fData } = await supabase.from('flashcards').select('topic');
    
    const counts: Record<string, number> = {};
    fData?.forEach(f => { const t = String(f.topic || '').toLowerCase().trim(); if (t) counts[t] = (counts[t] || 0) + 1; });
    
    const targetTopics = (sData || [])
        .map(s => ({ topic: s.topic || s.title, count: counts[String(s.topic || s.title).toLowerCase().trim()] || 0 }))
        .sort((a, b) => a.count - b.count)
        .slice(0, batchSize);

    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate 5 high-quality PSC Flashcards for these topics: ${targetTopics.map(t => t.topic).join(', ')}.
            
            Flashcards should be in Malayalam.
            Front: A clear question or term. 
            IMPORTANT: Do NOT use "താഴെ പറയുന്നവയിൽ നിന്നും" (from the following) or list-based questions. Rephrase them into direct questions.
            Back: The concise answer.
            Explanation: A detailed explanation of the answer.
            
            JSON format: { "topic": "string", "front": "string", "back": "string", "explanation": "string" }`,
            config: { 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            topic: { type: Type.STRING },
                            front: { type: Type.STRING },
                            back: { type: Type.STRING },
                            explanation: { type: Type.STRING }
                        },
                        required: ["topic", "front", "back", "explanation"]
                    }
                }
            }
        });

        const items = JSON.parse(response.text || "[]");
        if (items.length > 0) {
            const sbData = items.map((item: any) => ({
                id: createNumericHash(item.front + item.topic),
                topic: item.topic,
                front: item.front,
                back: item.back,
                explanation: item.explanation
            }));
            
            try {
                await upsertSupabaseData('flashcards', sbData);
            } catch (err: any) {
                if (err.message.includes('explanation')) {
                    console.warn("Explanation column missing in flashcards, retrying without it.");
                    const stripped = sbData.map(({ explanation, ...rest }: any) => rest);
                    await upsertSupabaseData('flashcards', stripped);
                } else {
                    throw err;
                }
            }
            for (const f of sbData) {
                await findAndUpsertRow('FlashCards', String(f.id), [f.id, f.front, f.back, f.topic, f.explanation]);
            }
            return { message: `Generated ${sbData.length} flashcards.` };
        }
    } catch (e: any) { throw e; }
    return { message: "No flashcards generated." };
}

export async function runDailyUpdateScrapers() {
    await Promise.all([scrapeKpscNotifications(), scrapePscLiveUpdates(), scrapeCurrentAffairs(), scrapeGkFacts()]);
    await generateQuestionsForGaps(5);
    await generateFlashCards(3);
    return { message: "Daily Update Routine Finished." };
}

export async function scrapeGkFacts() {
    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: "10 Malayalam PSC facts. JSON: {fact, category}",
            config: { 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            fact: { type: Type.STRING },
                            category: { type: Type.STRING }
                        },
                        required: ["fact", "category"]
                    }
                }
            }
        });
        const items = JSON.parse(response.text || "[]");
        if (items.length > 0) {
            const sbData = items.map((it: any) => ({ id: createNumericHash(it.fact), fact: it.fact, category: it.category }));
            await upsertSupabaseData('gk', sbData);
            for (const it of sbData) await findAndUpsertRow('GK', String(it.id), [it.id, it.fact, it.category]);
        }
    } catch (e: any) { throw e; }
}

export async function scrapeCurrentAffairs() {
    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: "10 Latest CA items for Kerala. JSON: {title, source, date}",
            config: { 
                tools: [{ googleSearch: {} }], 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            source: { type: Type.STRING },
                            date: { type: Type.STRING }
                        },
                        required: ["title", "source", "date"]
                    }
                }
            }
        });
        const items = JSON.parse(response.text || "[]");
        if (items.length > 0) {
            const sbData = items.map((it: any) => ({ id: createNumericHash(it.title), title: it.title, source: it.source, date: it.date }));
            await upsertSupabaseData('currentaffairs', sbData);
            for (const it of sbData) await findAndUpsertRow('CurrentAffairs', String(it.id), [it.id, it.title, it.source, it.date]);
        }
    } catch (e: any) { throw e; }
}

export async function scrapeKpscNotifications() {
    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `5 newest jobs from keralapsc.gov.in. JSON: title, categoryNumber, lastDate, link`,
            config: { 
                tools: [{ googleSearch: {} }], 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            categoryNumber: { type: Type.STRING },
                            lastDate: { type: Type.STRING },
                            link: { type: Type.STRING }
                        },
                        required: ["title", "categoryNumber", "lastDate", "link"]
                    }
                }
            }
        });
        const items = JSON.parse(response.text || "[]");
        if (items.length > 0) {
            const sbData = items.map((it: any) => ({ ...it, id: createNumericHash(it.categoryNumber || it.title) }));
            await upsertSupabaseData('notifications', sbData);
            for (const it of sbData) await findAndUpsertRow('Notifications', String(it.id), [it.id, it.title, it.categoryNumber, it.lastDate, it.link]);
        }
    } catch (e: any) { throw e; }
}

export async function scrapePscLiveUpdates() {
    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `5 results from keralapsc.gov.in. JSON: title, url, section, published_date`,
            config: { 
                tools: [{ googleSearch: {} }], 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            url: { type: Type.STRING },
                            section: { type: Type.STRING },
                            published_date: { type: Type.STRING }
                        },
                        required: ["title", "url", "section", "published_date"]
                    }
                }
            }
        });
        const items = JSON.parse(response.text || "[]");
        if (items.length > 0) {
            const sbData = items.map((it: any) => ({ id: createNumericHash(it.url || it.title), title: it.title, url: it.url, section: it.section, published_date: it.published_date }));
            await upsertSupabaseData('liveupdates', sbData);
            for (const it of sbData) await findAndUpsertRow('LiveUpdates', String(it.id), [it.title, it.url, it.section, it.published_date]);
        }
    } catch (e: any) { throw e; }
}

export async function runBookScraper() {
    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview", 
            contents: `8 PSC guides on Amazon.in. JSON: title, author, asin, amazonLink`,
            config: { 
                tools: [{ googleSearch: {} }], 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            author: { type: Type.STRING },
                            asin: { type: Type.STRING },
                            amazonLink: { type: Type.STRING }
                        },
                        required: ["title", "author", "amazonLink"]
                    }
                }
            }
        });
        const items = JSON.parse(response.text || "[]");
        if (items.length > 0) {
            const finalItems = items.map((it: any) => ({ 
                id: it.asin || createNumericHash(it.title),
                title: it.title, author: it.author, 
                imageUrl: it.asin ? `https://images-na.ssl-images-amazon.com/images/P/${it.asin.toUpperCase()}.01._SCLZZZZZZZ_SX400_.jpg` : "", 
                amazonLink: it.amazonLink + (it.amazonLink.includes('?') ? '&' : '?') + AFFILIATE_TAG 
            }));
            await upsertSupabaseData('bookstore', finalItems);
            for (const it of finalItems) await findAndUpsertRow('Bookstore', String(it.id), [it.id, it.title, it.author, it.imageUrl, it.amazonLink]);
        }
    } catch (e: any) { throw e; }
}

export async function repairLanguageMismatches() {
    if (!supabase) throw new Error("Supabase required.");
    const technicalSubjects = ['English', 'Engineering', 'IT', 'Computer Science', 'Technical', 'Nursing'];
    const { data: mismatches } = await supabase.from('questionbank').select('*').in('subject', technicalSubjects).limit(30);
    if (!mismatches || mismatches.length === 0) return { message: "No mismatches found." };

    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Restore these questions to ENGLISH: ${JSON.stringify(mismatches)}`,
            config: { responseMimeType: "application/json" }
        });
        const repaired = JSON.parse(response.text || "[]");
        if (repaired.length > 0) {
            await upsertSupabaseData('questionbank', repaired);
            for (const q of repaired) {
                await findAndUpsertRow('QuestionBank', String(q.id), [q.id, q.topic, q.question, JSON.stringify(q.options), q.correct_answer_index, q.subject, q.difficulty, q.explanation]);
            }
        }
    } catch (e: any) { throw e; }
    return { message: "Language repair batch finished." };
}

export async function repairBlankTopics() {
    if (!supabase) throw new Error("Supabase required.");
    
    // 1. Try to find questions with blank topics or subjects first (highest priority)
    const { data: blanks, error: blankErr } = await supabase
        .from('questionbank')
        .select('*')
        .or('topic.is.null,topic.eq."",subject.is.null,subject.eq.""')
        .limit(20);
        
    if (blankErr) throw blankErr;
    
    let toRepair = blanks || [];
    
    // 2. If no blanks, look for subjects not in the approved list
    if (toRepair.length < 20) {
        const approvedListString = `(${APPROVED_SUBJECTS.map(s => `"${s}"`).join(',')})`;
        const { data: invalid, error: invErr } = await supabase
            .from('questionbank')
            .select('*')
            .not('subject', 'in', approvedListString)
            .limit(20 - toRepair.length);
            
        if (invErr) {
            console.warn("Invalid subject query failed (likely due to special characters), falling back to batch check.");
        } else if (invalid && invalid.length > 0) {
            toRepair = [...toRepair, ...invalid];
        }
    }

    // 3. Fallback: If still nothing found via targeted queries, check a random batch
    if (toRepair.length === 0) {
        const { data: batch } = await supabase
            .from('questionbank')
            .select('*')
            .limit(200);
            
        toRepair = (batch || []).filter(q => 
            !q.topic || q.topic.trim() === "" || 
            !q.subject || q.subject.trim() === "" || 
            !APPROVED_SUBJECTS.includes(q.subject)
        ).slice(0, 20);
    }
        
    if (toRepair.length === 0) return { message: "No questions needing repair found." };

    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analyze these Kerala PSC questions and assign the most appropriate Topic and Subject for each.
            
            CRITICAL: Subject MUST be exactly one from this list: [${APPROVED_SUBJECTS.join(', ')}]
            Topic should be a specific micro-topic (e.g., "Rivers of Kerala", "Fundamental Rights", "Percentage").
            
            Syllabus Context for mapping:
            ${JSON.stringify(SYLLABUS_STRUCTURE, null, 2)}
            
            Questions to repair: ${JSON.stringify(toRepair.map(q => ({ id: q.id, question: q.question, currentSubject: q.subject, currentTopic: q.topic })))}
            
            Return JSON array: [{ "id": number, "topic": "string", "subject": "string" }]`,
            config: { responseMimeType: "application/json" }
        });
        
        const updates = JSON.parse(response.text || "[]");
        if (updates.length > 0) {
            const finalData = toRepair.map(q => {
                const update = updates.find((u: any) => u.id == q.id);
                return { 
                    ...q, 
                    topic: update?.topic || q.topic || 'General',
                    subject: update?.subject || q.subject || 'General Knowledge'
                };
            });
            
            await upsertSupabaseData('questionbank', finalData);
            const sheetRows = finalData.map(q => ({
                id: String(q.id),
                data: [q.id, q.topic, q.question, JSON.stringify(q.options), q.correct_answer_index, q.subject, q.difficulty, q.explanation]
            }));
            await batchUpsertRows('QuestionBank', sheetRows);
            return { message: `Successfully repaired ${finalData.length} questions (Fixed blanks or unapproved subjects).` };
        }
    } catch (e: any) { 
        console.error("Topic Repair Error:", e.message);
        throw e; 
    }
    return { message: "Topic repair batch failed." };
}

export async function syncSupabaseToSheets() {
    if (!supabase) throw new Error("Supabase required.");
    
    const tables = [
        { name: 'Exams', table: 'exams', cols: ['id', 'title_ml', 'title_en', 'description_ml', 'description_en', 'category', 'level', 'icon_type'] },
        { name: 'QuestionBank', table: 'questionbank', cols: ['id', 'topic', 'question', 'options', 'correct_answer_index', 'subject', 'difficulty', 'explanation'] },
        { name: 'Syllabus', table: 'syllabus', cols: ['id', 'exam_id', 'subject', 'topic', 'title', 'description'] },
        { name: 'Bookstore', table: 'bookstore', cols: ['id', 'title', 'author', 'imageUrl', 'amazonLink'] }
    ];

    let totalUpdated = 0;
    for (const t of tables) {
        const { data, error } = await supabase.from(t.table).select('*');
        if (error) continue;
        if (!data || data.length === 0) continue;

        const sheetRows = data.map(row => {
            const values = t.cols.map(col => {
                const val = row[col];
                return typeof val === 'object' ? JSON.stringify(val) : val;
            });
            return { id: String(row.id), data: values };
        });

        await batchUpsertRows(t.name, sheetRows);
        totalUpdated += sheetRows.length;
    }
    return { message: `Pushed ${totalUpdated} records from Supabase to Sheets.` };
}

const TOPICS_TO_REPLACE = [
    "Active and Passive Voice", "Ancient Indian History", "Chemical Formulas", "Digestive System", "Districts of Kerala", 
    "Electrical Engineering", "Formation of Kerala", "General Science / Science & Tech", "Human Respiratory System", 
    "Indian Independence Movement", "Indus Valley Civilization", "Maurya Empire", "Modern Indian History", "Nouns", 
    "Periodic Table", "Post-Independent India", "Renaissance Leaders", "Respiratory System", "Revolt of 1857", 
    "Rivers and Lakes of Kerala", "Rivers of Kerala", "Singular and Plural Nouns", "Tense and Verbs", "Vaikom Satyagraha", 
    "Welfare Schemes in Kerala", "Ancient Indian Literature", "Banking in India", "Battle of Buxar", "British Rule in Kerala", 
    "Clocks", "Cognitive Development", "Communal Award", "Communication Skills", "Computer Hardware", "Computer Memory", 
    "Delhi Sultanate", "Direction Sense Test", "Educational Reforms in British India", "Factors of Development", 
    "Five Year Plans", "Gandhiji in Kerala", "Goods and Services Tax (GST)", "Governor Generals & Viceroys", 
    "Growth and Development", "GST", "Gupta Empire", "History of Psychology", "Indian National Congress", 
    "Indian National Movement", "Industrial Revolution", "Input Devices", "Intelligence Quotient", "Jnanpith Award", 
    "Kerala Renaissance Leaders", "L.C.M", "Learning Theories", "Malayalam Literature", "Maratha Administration", 
    "Mauryan Administration", "Medieval Indian History", "Memory and Forgetting", "Mughal Empire", "Muscular System", 
    "NITI Aayog", "Output Devices", "Pazhassi Revolt", "Peasant Movements", "Post-Mauryan Period", "Press and Newspapers", 
    "Principles of Development", "Reading Comprehension", "Reserve Bank of India", "Sandhi", "Satavahana Dynasty", 
    "Schools of Psychology", "Scientific Discoveries", "Scientific Inventions", "Simon Commission", "Spelling and Word Usage", 
    "Square and Square Root", "Stages of Development", "Tense", "Time and Distance", "Time and Work", "Travancore Kingdom", 
    "Vaccines and Immunization", "Vigraharoopam", "Voice"
];

export async function normalizeTopics() {
    if (!supabase) throw new Error("Supabase required.");
    
    // 1. Get approved topics from syllabus
    const { data: sData } = await supabase.from('syllabus').select('topic, title, subject');
    const approvedTopics = (sData || []).map(s => s.topic || s.title).filter(Boolean);
    
    // 2. Find questions with topics in the "to replace" list
    const { data: toRepair } = await supabase
        .from('questionbank')
        .select('*')
        .in('topic', TOPICS_TO_REPLACE)
        .limit(50); // Process in batches
        
    if (!toRepair || toRepair.length === 0) return { message: "No questions found with topics needing replacement." };

    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `You are a Kerala PSC syllabus expert. Map these "Old Topics" to the most appropriate "Approved Syllabus Topics" from the provided list.
            
            Approved Syllabus Topics:
            ${JSON.stringify(approvedTopics)}
            
            Approved Subjects:
            ${JSON.stringify(APPROVED_SUBJECTS)}
            
            Questions to map:
            ${JSON.stringify(toRepair.map(q => ({ id: q.id, question: q.question, oldTopic: q.topic, subject: q.subject })))}
            
            Rules:
            1. If a direct match exists in Approved Topics, use it.
            2. If no direct match, pick the most relevant micro-topic.
            3. Ensure the Subject is also correct according to the new Topic.
            
            Return JSON array: [{ "id": number, "topic": "string", "subject": "string" }]`,
            config: { responseMimeType: "application/json" }
        });
        
        const updates = JSON.parse(response.text || "[]");
        if (updates.length > 0) {
            const finalData = toRepair.map(q => {
                const update = updates.find((u: any) => u.id == q.id);
                if (!update) return q;
                return { 
                    ...q, 
                    topic: update.topic,
                    subject: update.subject
                };
            });
            
            await upsertSupabaseData('questionbank', finalData);
            const sheetRows = finalData.map(q => ({
                id: String(q.id),
                data: [q.id, q.topic, q.question, JSON.stringify(q.options), q.correct_answer_index, q.subject, q.difficulty, q.explanation]
            }));
            await batchUpsertRows('QuestionBank', sheetRows);
            return { message: `Successfully normalized ${finalData.length} questions to approved syllabus topics.` };
        }
    } catch (e: any) {
        console.error("Normalize Topics Error:", e.message);
        throw e;
    }
    return { message: "Normalization batch failed." };
}

export async function syncAllFromSheetsToSupabase() {
    if (!supabase) throw new Error("No Supabase.");
    const tables = [
        { sheet: 'Exams', supabase: 'exams', map: (r: any[]) => ({ id: r[0], title_ml: r[1], title_en: r[2], description_ml: r[3], description_en: r[4], category: r[5], level: r[6], icon_type: r[7] }) },
        { sheet: 'Syllabus', supabase: 'syllabus', map: (r: any[]) => ({ id: r[0], exam_id: r[1], title: r[2], questions: parseInt(r[3] || '0'), duration: parseInt(r[4] || '0'), subject: r[5], topic: r[6] }) },
        { sheet: 'QuestionBank', supabase: 'questionbank', map: (r: any[]) => ({ id: parseInt(r[0]), topic: r[1], question: r[2], options: ensureArray(r[3]), correct_answer_index: parseInt(r[4] || '1'), subject: r[5], difficulty: r[6], explanation: r[7] }) }
    ];
    for (const t of tables) {
        const rows = await readSheetData(`${t.sheet}!A2:Z`);
        if (rows?.length) {
            const mappedData = rows.filter(r => r[0]).map(t.map as any);
            await upsertSupabaseData(t.supabase, mappedData);
        }
    }
    return { message: "Sync complete." };
}
