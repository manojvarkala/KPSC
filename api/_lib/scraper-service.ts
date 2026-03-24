
import { GoogleGenAI, Type } from "@google/genai";
import { readSheetData, findAndUpsertRow, batchUpsertRows } from './sheets-service.js';
import { supabase, upsertSupabaseData, fetchAllSupabaseData } from './supabase-service.js';
import { smartParseOptions } from './utils.js';

declare var process: any;
const AFFILIATE_TAG = 'tag=malayalambooks-21';

function getAi() {
    const key = process.env.API_KEY || process.env.GOOGLE_API_KEY;
    if (!key || key.trim() === "") throw new Error("API_KEY missing.");
    return new GoogleGenAI({ apiKey: key.trim() });
}

const createNumericHash = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
};

export const APPROVED_SUBJECTS = [
    "Arts, Culture & Sports", "Biology / Life Science", "Chemistry", "Computer Science / IT / Cyber Laws",
    "Current Affairs", "Educational Psychology / Pedagogy", "Electrical Engineering", "English",
    "Environment", "General Knowledge", "General Knowledge / Static GK", "General Science / Science & Tech",
    "Indian Economy", "Indian Geography", "Indian History", "Indian Polity / Constitution",
    "Kerala Geography", "Kerala History", "Kerala History / Renaissance", "Kerala Specific GK",
    "Malayalam", "Nursing Science / Health Care", "Physics", "Quantitative Aptitude",
    "Reasoning / Mental Ability", "Social Science / Sociology", "Mathematics", "Botany", "Zoology",
    "Economics", "Political Science", "Statistics", "Geography", "Sanskrit", "Kannada", "Philosophy",
    "Psychology", "Commerce", "Physical Education", "Music", "Arabic", "Hindi"
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
    if (!questions || !Array.isArray(questions)) throw new Error("Invalid questions data.");
    if (!questions.length) return { message: "No questions provided." };

    const { data: maxIdRow } = await supabase.from('questionbank').select('id').order('id', { ascending: false }).limit(1).single();
    let currentId = (maxIdRow?.id || 50000) + 1;

    // Fetch mappings for auto-normalization
    let mData: any[] = [];
    try {
        const { data } = await supabase.from('topic_mappings').select('*');
        mData = data || [];
    } catch (e) {}

    const sanitized = questions.map(q => {
        const id = q.id || currentId++;
        let topic = q.topic || 'General';
        let subject = q.subject || 'General Knowledge';

        // Auto-normalize if micro-topic matches mapping
        const tLower = String(topic).toLowerCase().trim();
        const mapping = mData.find(m => String(m.micro_topic || '').toLowerCase().trim() === tLower);
        if (mapping) {
            topic = mapping.topic;
            subject = mapping.subject;
        }

        return {
            id,
            topic,
            question: q.question,
            options: smartParseOptions(q.options),
            correct_answer_index: parseInt(String(q.correct_answer_index || q.correctAnswerIndex || 1)),
            subject,
            difficulty: q.difficulty || 'PSC Level',
            explanation: q.explanation || ''
        };
    });

    await upsertSupabaseData('questionbank', sanitized);
    
    // Batch upsert to Google Sheets to avoid quota limits
    const rowsToUpsert = sanitized.map(q => ({
        id: String(q.id),
        data: [q.id, q.topic, q.question, JSON.stringify(q.options), q.correct_answer_index, q.subject, q.difficulty, q.explanation]
    }));
    
    await batchUpsertRows('QuestionBank', rowsToUpsert);
    
    return { message: `Successfully uploaded ${sanitized.length} questions.` };
}

export async function bulkUploadMappings(mappings: any[]) {
    if (!supabase) throw new Error("Supabase required.");
    if (!mappings || !Array.isArray(mappings)) throw new Error("Invalid mappings data.");
    const mapped = mappings.map(r => ({
        id: r.id ? parseInt(r.id) : undefined,
        subject: r.subject,
        topic: r.topic,
        micro_topic: r.micro_topic
    }));
    
    try {
        await upsertSupabaseData('topic_mappings', mapped, 'id');
    } catch (e: any) {
        console.warn("Could not sync mappings to Supabase (table missing), syncing to Sheets only.");
    }
    
    const sheetRows = mapped.map(m => ({
        id: String(m.id || ''),
        data: [m.id, m.subject, m.topic, m.micro_topic]
    }));
    await batchUpsertRows('TopicMappings', sheetRows);
    
    return { message: `Successfully uploaded ${mapped.length} mappings to Sheets (Supabase sync skipped if table missing).`, data: mapped };
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
            
            const rowsToUpsert = finalData.map(q => ({
                id: String(q.id),
                data: [q.id, q.topic, q.question, JSON.stringify(q.options), q.correct_answer_index, q.subject, q.difficulty, q.explanation]
            }));
            await batchUpsertRows('QuestionBank', rowsToUpsert);
            
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

    if (typeof batchSizeOrTopic === 'string' || typeof batchSizeOrTopic === 'number') {
        const isUUID = typeof batchSizeOrTopic === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(batchSizeOrTopic);
        const isNumericId = typeof batchSizeOrTopic === 'number' || (typeof batchSizeOrTopic === 'string' && /^\d+$/.test(batchSizeOrTopic));
        
        let query;
        if (isUUID || isNumericId) {
            query = supabase.from('syllabus').select('topic, subject, title, id').eq('id', batchSizeOrTopic);
        } else {
            query = supabase.from('syllabus').select('topic, subject, title, id').or(`topic.ilike.%${batchSizeOrTopic}%,title.ilike.%${batchSizeOrTopic}%`);
        }
        
        const { data: mappings } = await query.limit(1);
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
        const qData = await fetchAllSupabaseData('questionbank', 'topic, subject');
        const counts: Record<string, number> = {};
        qData?.forEach(q => { 
            const t = String(q.topic || '').toLowerCase().trim(); 
            const s = String(q.subject || '').toLowerCase().trim();
            const key = `${s}|${t}`;
            if (t) counts[key] = (counts[key] || 0) + 1; 
        });
        targetMappings = sData.map(s => {
            let t = s.topic;
            if (!t || t === 'null' || t.trim() === '') t = s.title;
            if (!t || t === 'null' || t.trim() === '') t = "Unnamed Topic";
            const sub = s.subject || 'General Knowledge';
            const key = `${sub.toLowerCase().trim()}|${String(t).toLowerCase().trim()}`;
            return { topic: t, subject: sub, count: counts[key] || 0 };
        }).sort((a, b) => a.count - b.count).slice(0, batchSizeOrTopic as number);
    }

    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview', 
            contents: `Generate 5 high-quality Kerala PSC MCQs for each of these micro-topics:
            ${targetMappings.map(m => `- Subject: "${m.subject}", Topic: "${m.topic}"`).join('\n')}
            
            CONTEXT (Micro-topics grouped by category):
            ${JSON.stringify(SYLLABUS_STRUCTURE, null, 2)}

            CRITICAL RULES:
            1. Subject field MUST be exactly one from this list: [${APPROVED_SUBJECTS.join(', ')}]
            2. Topic field MUST be exactly the topic name provided above.
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
                // Find the matching target mapping to enforce correct Subject + Topic
                const target = targetMappings.find(m => 
                    m.topic.toLowerCase().trim() === String(item.topic || '').toLowerCase().trim()
                ) || targetMappings[0];

                return {
                    id: currentId++, 
                    topic: target.topic, 
                    question: item.question, 
                    options: smartParseOptions(item.options), 
                    correct_answer_index: parseInt(String(item.correctAnswerIndex || 1)), 
                    subject: target.subject, 
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
            const rowsToUpsert = sbData.map((f: any) => ({
                id: String(f.id),
                data: [f.id, f.front, f.back, f.topic, f.explanation]
            }));
            await batchUpsertRows('FlashCards', rowsToUpsert);
            
            return { message: `Generated ${sbData.length} flashcards.` };
        }
    } catch (e: any) { throw e; }
    return { message: "No flashcards generated." };
}

export async function runDailyUpdateScrapers() {
    if (!supabase) return { message: "Supabase not initialized." };
    const { data: settings } = await supabase.from('settings').select('key, value');
    const getSetting = (key: string, def: boolean) => {
        const s = settings?.find(x => x.key === key);
        if (!s) return def;
        return s.value === 'true';
    };

    const runNews = getSetting('auto_update_news', true);
    const runCA = getSetting('auto_update_ca', true);
    const runGK = getSetting('auto_update_gk', true);
    const runAI = getSetting('auto_update_ai_gaps', false); // Default false to save costs
    const runFlash = getSetting('auto_update_flashcards', true);

    const tasks: Promise<any>[] = [];
    if (runNews) {
        tasks.push(scrapeKpscNotifications());
        tasks.push(scrapePscLiveUpdates());
    }
    if (runCA) tasks.push(scrapeCurrentAffairs());
    if (runGK) tasks.push(scrapeGkFacts());
    
    await Promise.all(tasks);
    
    // Fetch top 5 topics with gaps and generate 5 questions for each
    if (supabase && runAI) {
        try {
            const { data: sData } = await supabase.from('syllabus').select('topic, title');
            const qData = await fetchAllSupabaseData('questionbank', 'topic, subject');
            
            const uniqueTopics = new Set<string>();
            const sortedTopics = (sData || []).map(s => {
                let t = s.topic;
                if (!t || t === 'null' || t.trim() === '') t = s.title;
                if (!t || t === 'null' || t.trim() === '') t = "Unnamed Topic";
                const sTopic = String(t).toLowerCase().trim();
                
                const sTopicWords = sTopic.split(/[\s,.-]+/).filter(w => w.length > 2);
                const count = qData?.filter(q => {
                    const qTopic = String(q.topic || '').toLowerCase().trim();
                    const qSubject = String(q.subject || '').toLowerCase().trim();
                    
                    if (qTopic === sTopic) return true;
                    if (qTopic === '' && qSubject === sTopic) return true;
                    if (sTopicWords.length > 0) {
                        const qText = `${qTopic} ${qSubject}`;
                        let score = 0;
                        sTopicWords.forEach(w => { if (qText.includes(w)) score++; });
                        if (score >= Math.ceil(sTopicWords.length / 2)) return true;
                    }
                    return false;
                }).length || 0;

                return { topic: t, sTopic, count };
            }).filter(s => {
                if (uniqueTopics.has(s.sTopic)) return false;
                uniqueTopics.add(s.sTopic);
                return true;
            }).sort((a, b) => a.count - b.count);

            const batch = sortedTopics.slice(0, 5).map(s => s.topic);
            for (const t of batch) { 
                try { await generateQuestionsForGaps(t); } catch (err) { console.error(`Error filling gap for ${t}:`, err); } 
            }
        } catch (e) {
            console.error("Error in daily gap filling:", e);
        }
    }

    if (runFlash) await generateFlashCards(3);
    return { message: "Daily Update Routine Finished." };
}

export async function generateSyllabusForExam(exam: { id: string, title_en: string, level: string }) {
    const title = String(exam.title_en || '').toLowerCase();
    const level = String(exam.level || '').toLowerCase();
    const isMains = title.includes('mains') || title.includes('main') || level.includes('main');
    const isHsst = title.includes('hsst') || title.includes('higher secondary school teacher');
    const isTeaching = title.includes('teacher') || 
                       title.includes('lp/up') || 
                       title.includes('lpsa') || 
                       title.includes('upsa') || 
                       title.includes('school assistant') || 
                       title.includes('hsa') ||
                       (title.includes('assistant') && (title.includes('malayalam') || title.includes('tamil') || title.includes('kannada') || title.includes('arabic') || title.includes('hindi') || title.includes('sanskrit')));

    let topics: any[] = [];

    if (isHsst || isTeaching) {
        // Find the subject from the title
        const subjectMatch = APPROVED_SUBJECTS.find(s => title.includes(s.toLowerCase()));
        const subject = subjectMatch || (isHsst ? 'General Knowledge' : 'Educational Psychology / Pedagogy');
        
        let coreTopics: any[] = [];
        
        const hsstMicroTopics: Record<string, string[]> = {
            'Physics': ['Classical Mechanics', 'Mathematical Methods', 'Electronics', 'Quantum Mechanics', 'Electrodynamics', 'Statistical Physics', 'Spectroscopy', 'Condensed Matter', 'Nuclear Physics', 'Particle Physics'],
            'Chemistry': ['Inorganic Chemistry', 'Organic Chemistry', 'Physical Chemistry', 'Analytical Chemistry', 'Polymer Chemistry', 'Environmental Chemistry'],
            'Botany': ['Phycology & Mycology', 'Bryology & Pteridology', 'Microbiology & Plant Pathology', 'Angiosperm Anatomy & Taxonomy', 'Environmental Biology', 'Cell Biology & Genetics', 'Plant Physiology & Biochemistry', 'Biotechnology'],
            'Zoology': ['Systematics & Evolutionary Biology', 'Physiology & Biochemistry', 'Microbiology & Immunology', 'Cell Biology & Genetics', 'Developmental Biology', 'Ecology & Ethology', 'Biotechnology & Bioinformatics'],
            'Mathematics': ['Algebra', 'Real Analysis', 'Complex Analysis', 'Topology', 'Differential Equations', 'Differential Geometry', 'Functional Analysis', 'Number Theory'],
            'Economics': ['Micro Economic Analysis', 'Macro Economic Analysis', 'Development & Planning', 'Public Finance', 'International Economics', 'Indian Economy', 'Statistical Methods', 'Kerala Economy'],
            'Political Science': ['Political Theory', 'Public Administration', 'Comparative Politics', 'International Relations', 'Indian Constitution & Politics', 'Political Thought'],
            'Geography': ['Geomorphology', 'Climatology', 'Oceanography', 'Geographic Thought', 'Population Geography', 'Economic Geography', 'Geography of India'],
            'English': ['Chaucer to Neo-Classicism', 'The Romantics & Victorians', 'Twentieth Century Literature', 'Indian Literature in English', 'American Literature', 'Literary Theory & Criticism', 'Linguistics & Phonetics'],
            'Malayalam': ['Pracheena Kavitha', 'Madhyakala Kavitha', 'Adhunika Kavitha', 'Gadhyasahithyam', 'Sahithya Vimarsanam', 'Bhashasasthram', 'Vyakaranam'],
            'Sanskrit': ['Vyakarana', 'Nyaya', 'Sahitya', 'Vedanta', 'Jyotisha', 'General Sanskrit'],
            'Commerce': ['Financial Accounting', 'Cost Accounting', 'Management Accounting', 'Financial Management', 'Marketing Management', 'Human Resource Management', 'Business Environment', 'Income Tax'],
            'Sociology': ['Sociological Concepts', 'Sociological Thought', 'Research Methodology', 'Rural & Urban Sociology', 'Sociology of Development', 'Indian Society'],
            'Statistics': ['Probability Theory', 'Distribution Theory', 'Estimation', 'Testing of Hypotheses', 'Sampling Techniques', 'Design of Experiments', 'Multivariate Analysis'],
            'Psychology': ['Cognitive Psychology', 'Personality Theories', 'Social Psychology', 'Developmental Psychology', 'Clinical Psychology', 'Research Methodology'],
            'Kannada': ['Ancient Literature', 'Medieval Literature', 'Modern Literature', 'Folk Literature', 'Poetics & Literary Criticism', 'History of Kannada Language'],
            'Arabic': ['Classical Prose & Poetry', 'Modern Prose & Poetry', 'History of Arabic Literature', 'Arabic Grammar & Rhetoric', 'Translation & Composition'],
            'Hindi': ['History of Hindi Literature', 'Ancient & Medieval Poetry', 'Modern Poetry', 'Hindi Fiction & Drama', 'Literary Criticism', 'Hindi Language & Grammar'],
            'Physical Education': ['History of Physical Education', 'Anatomy & Physiology', 'Kinesiology & Biomechanics', 'Sports Psychology', 'Methods of Physical Education', 'Health Education', 'Test & Measurement', 'Training Methods'],
            'Music': ['History of Indian Music', 'Musical Forms', 'Raga System', 'Tala System', 'Musical Instruments', 'Biographies of Great Musicians', 'Theory of Music'],
            'Computer Science / IT / Cyber Laws': ['Computer Organization', 'Data Structures & Algorithms', 'Operating Systems', 'Database Management Systems', 'Software Engineering', 'Computer Networks', 'Web Technologies', 'Cyber Laws & Ethics']
        };

        const teachingMicroTopics = [
            'Child Development & Learning',
            'Educational Psychology',
            'Pedagogy & Teaching Aptitude',
            'Inclusive Education',
            'Educational Philosophy',
            'Classroom Management',
            'Evaluation & Assessment',
            'ICT in Education',
            'Learning Theories',
            'Motivation & Personality'
        ];

        let predefinedTopics = hsstMicroTopics[subject];
        
        // If it's a teaching exam but not HSST, and we have a language subject, combine teaching + language
        if (isTeaching && !isHsst) {
            if (subject !== 'Educational Psychology / Pedagogy') {
                // Language or other subject + Teaching
                predefinedTopics = [...(predefinedTopics || []), ...teachingMicroTopics];
            } else {
                predefinedTopics = teachingMicroTopics;
            }
        }

        if (predefinedTopics && predefinedTopics.length > 0) {
            const totalCoreQ = isHsst ? 70 : 60; // Reduced core for LP/UP to allow more general topics
            const qPerTopic = Math.max(1, Math.floor(totalCoreQ / predefinedTopics.length));
            const dPerTopic = Math.max(1, Math.floor(80 / predefinedTopics.length));
            
            let totalQ = 0;
            predefinedTopics.forEach((ut, idx) => {
                const isLast = idx === predefinedTopics.length - 1;
                const qCount = isLast ? (totalCoreQ - totalQ) : qPerTopic;
                totalQ += qCount;
                
                coreTopics.push({
                    topic: ut,
                    subject: teachingMicroTopics.includes(ut) ? 'Educational Psychology / Pedagogy' : subject,
                    questions: qCount,
                    duration: dPerTopic
                });
            });
        } else {
            // Fallback if no specific topics found
            coreTopics = [{ topic: `${subject} (Core Subject)`, subject: subject, questions: isHsst ? 70 : 60, duration: 80 }];
        }
        
        if (isHsst) {
            topics = [
                ...coreTopics,
                { topic: 'Research Methodology & Teaching Aptitude', subject: 'Educational Psychology / Pedagogy', questions: 10, duration: 15 },
                { topic: 'General Knowledge & Current Affairs', subject: 'General Knowledge', questions: 10, duration: 15 },
                { topic: 'Indian Constitution & Social Welfare', subject: 'Indian Polity / Constitution', questions: 10, duration: 10 }
            ];
        } else {
            // LP/UP or other teaching exams
            topics = [
                ...coreTopics,
                { topic: 'General Knowledge & Current Affairs', subject: 'General Knowledge', questions: 10, duration: 10 },
                { topic: 'Kerala History & Renaissance', subject: 'Kerala History', questions: 5, duration: 5 },
                { topic: 'Indian Constitution', subject: 'Indian Polity / Constitution', questions: 5, duration: 5 },
                { topic: 'General Science', subject: 'General Science / Science & Tech', questions: 5, duration: 5 },
                { topic: 'Basic Arithmetic', subject: 'Quantitative Aptitude', questions: 5, duration: 5 },
                { topic: 'Basic English', subject: 'English', questions: 5, duration: 5 },
                { topic: 'Malayalam Language', subject: 'Malayalam', questions: 5, duration: 5 }
            ];
        }
    } else {
        const qPerTopic = 10; 
        const dPerTopic = isMains ? 12 : 9;
        
        let specificTopics: any[] = [];
        
        if (exam.id === 'staff_nurse') {
            specificTopics = [
                { topic: 'Medical Surgical Nursing', subject: 'Nursing Science / Health Care', questions: 30, duration: 30 },
                { topic: 'Anatomy & Physiology', subject: 'Biology / Life Science', questions: 20, duration: 20 },
                { topic: 'Public Health & Sanitation', subject: 'Nursing Science / Health Care', questions: 20, duration: 20 }
            ];
        } else if (exam.id.includes('electrical') || exam.id.includes('kseb')) {
            specificTopics = [
                { topic: 'Electrical Circuits & Machines', subject: 'Physics', questions: 30, duration: 30 },
                { topic: 'Power Systems', subject: 'Physics', questions: 20, duration: 20 },
                { topic: 'Electrical Wiring', subject: 'Physics', questions: 20, duration: 20 }
            ];
        } else if (exam.id.includes('civil') || exam.id.includes('draughtsman')) {
            specificTopics = [
                { topic: 'Structural Engineering', subject: 'Physics', questions: 30, duration: 30 },
                { topic: 'Civil Construction Basics', subject: 'Physics', questions: 40, duration: 40 }
            ];
        } else if (exam.id.includes('mechanical') || exam.id.includes('fitter') || exam.id.includes('turner')) {
            specificTopics = [
                { topic: 'Thermodynamics', subject: 'Physics', questions: 30, duration: 30 },
                { topic: 'Mechanical Fitting', subject: 'Physics', questions: 40, duration: 40 }
            ];
        } else if (exam.id === 'jphn_anm' || exam.id === 'junior_health_inspector') {
            specificTopics = [
                { topic: 'Public Health & Sanitation', subject: 'Nursing Science / Health Care', questions: 40, duration: 40 },
                { topic: 'Anatomy & Physiology', subject: 'Biology / Life Science', questions: 30, duration: 30 }
            ];
        } else if (exam.id === 'pharmacist_gr2') {
            specificTopics = [
                { topic: 'Pharmacology & Pharmaceutics', subject: 'Nursing Science / Health Care', questions: 50, duration: 50 },
                { topic: 'Anatomy & Physiology', subject: 'Biology / Life Science', questions: 20, duration: 20 }
            ];
        } else if (exam.id === 'blood_bank_tech') {
            specificTopics = [
                { topic: 'Blood Banking Techniques', subject: 'Nursing Science / Health Care', questions: 50, duration: 50 },
                { topic: 'Anatomy & Physiology', subject: 'Biology / Life Science', questions: 20, duration: 20 }
            ];
        } else if (exam.id === 'lp_up_assistant_malayalam') {
            specificTopics = [
                { topic: 'Teaching Aptitude & Pedagogy', subject: 'Educational Psychology / Pedagogy', questions: 30, duration: 30 },
                { topic: 'Malayalam Grammar', subject: 'Malayalam', questions: 20, duration: 20 },
                { topic: 'Malayalam Vocabulary & Idioms', subject: 'Malayalam', questions: 20, duration: 20 }
            ];
        }

        if (specificTopics.length > 0) {
            topics = [
                ...specificTopics,
                { topic: 'General Knowledge', subject: 'General Knowledge', questions: 10, duration: 10 },
                { topic: 'Kerala History & Renaissance', subject: 'Kerala History', questions: 10, duration: 10 },
                { topic: 'Basic Arithmetic', subject: 'Quantitative Aptitude', questions: 10, duration: 10 }
            ];
        } else {
            const qPerTopic = 5; 
            const dPerTopic = isMains ? 6 : 5;
            topics = [
                { topic: 'Current Affairs & Renaissance', subject: 'Current Affairs', questions: qPerTopic, duration: dPerTopic },
                { topic: 'Important National & International Events', subject: 'Current Affairs', questions: qPerTopic, duration: dPerTopic },
                { topic: 'Kerala History & Renaissance', subject: 'Kerala History', questions: qPerTopic, duration: dPerTopic },
                { topic: 'Indian History', subject: 'Indian History', questions: qPerTopic, duration: dPerTopic },
                { topic: 'Kerala Geography', subject: 'Kerala Geography', questions: qPerTopic, duration: dPerTopic },
                { topic: 'World & Indian Geography', subject: 'Indian Geography', questions: qPerTopic, duration: dPerTopic },
                { topic: 'Indian Economy & Kerala Economy', subject: 'Indian Economy', questions: qPerTopic, duration: dPerTopic },
                { topic: 'Indian Polity & Constitution', subject: 'Indian Polity / Constitution', questions: qPerTopic, duration: dPerTopic },
                { topic: 'Environment & Forestry', subject: 'Environment', questions: qPerTopic, duration: dPerTopic },
                { topic: 'Kerala Specific', subject: 'Kerala Specific GK', questions: qPerTopic, duration: dPerTopic },
                { topic: 'Basic Arithmetic', subject: 'Quantitative Aptitude', questions: qPerTopic, duration: dPerTopic },
                { topic: 'Mental Ability & Logical Reasoning', subject: 'Reasoning / Mental Ability', questions: qPerTopic, duration: dPerTopic },
                { topic: 'Basic English', subject: 'English', questions: qPerTopic, duration: dPerTopic },
                { topic: 'Malayalam Language', subject: 'Malayalam', questions: qPerTopic, duration: dPerTopic },
                { topic: 'General Science - Physics', subject: 'Physics', questions: qPerTopic, duration: dPerTopic },
                { topic: 'General Science - Chemistry', subject: 'Chemistry', questions: qPerTopic, duration: dPerTopic },
                { topic: 'General Science - Biology & Public Health', subject: 'Biology / Life Science', questions: qPerTopic, duration: dPerTopic },
                { topic: 'Arts Literature Culture & Sports', subject: 'Arts, Culture & Sports', questions: qPerTopic, duration: dPerTopic }
            ];
        }
    }

    const syllabusEntries = topics.map(t => ({
        exam_id: exam.id,
        topic: t.topic,
        title: t.topic,
        subject: t.subject,
        questions: t.questions,
        duration: t.duration
    }));

    // Delete existing syllabus for this exam to avoid duplicates
    if (supabase) {
        await supabase.from('syllabus').delete().eq('exam_id', exam.id);

        // Use a loop to insert to avoid potential payload size issues
        for (let i = 0; i < syllabusEntries.length; i += 50) {
            await upsertSupabaseData('syllabus', syllabusEntries.slice(i, i + 50), 'id');
        }
    }

    return syllabusEntries;
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
            const rowsToUpsert = sbData.map((it: any) => ({
                id: String(it.id),
                data: [it.id, it.fact, it.category]
            }));
            await batchUpsertRows('GK', rowsToUpsert);
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
            const rowsToUpsert = sbData.map((it: any) => ({
                id: String(it.id),
                data: [it.id, it.title, it.source, it.date]
            }));
            await batchUpsertRows('CurrentAffairs', rowsToUpsert);
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
            const rowsToUpsert = sbData.map((it: any) => ({
                id: String(it.id),
                data: [it.id, it.title, it.categoryNumber, it.lastDate, it.link]
            }));
            await batchUpsertRows('Notifications', rowsToUpsert);
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
            const rowsToUpsert = sbData.map((it: any) => ({
                id: String(it.id),
                data: [it.title, it.url, it.section, it.published_date]
            }));
            await batchUpsertRows('LiveUpdates', rowsToUpsert);
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
                id: it.asin ? createNumericHash(it.asin) : createNumericHash(it.title),
                title: it.title, author: it.author, 
                imageUrl: it.asin ? `https://images-na.ssl-images-amazon.com/images/P/${it.asin.toUpperCase()}.01._SCLZZZZZZZ_SX400_.jpg` : "", 
                amazonLink: it.amazonLink + (it.amazonLink.includes('?') ? '&' : '?') + AFFILIATE_TAG 
            }));
            await upsertSupabaseData('bookstore', finalItems);
            const rowsToUpsert = finalItems.map((it: any) => ({
                id: String(it.id),
                data: [it.id, it.title, it.author, it.imageUrl, it.amazonLink]
            }));
            await batchUpsertRows('Bookstore', rowsToUpsert);
        }
    } catch (e: any) { throw e; }
}

export async function repairLanguageMismatches() {
    if (!supabase) throw new Error("Supabase required.");
    const technicalSubjects = ['English', 'Engineering', 'IT', 'Computer Science', 'Technical', 'Nursing'];
    const { data: mismatches } = await supabase.from('questionbank').select('*').in('subject', technicalSubjects).limit(50);
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
            const rowsToUpsert = repaired.map((q: any) => ({
                id: String(q.id),
                data: [q.id, q.topic, q.question, JSON.stringify(q.options), q.correct_answer_index, q.subject, q.difficulty, q.explanation]
            }));
            await batchUpsertRows('QuestionBank', rowsToUpsert);
        }
    } catch (e: any) { throw e; }
    return { message: "Language repair batch finished." };
}

export async function repairBlankTopics() {
    if (!supabase) throw new Error("Supabase required.");
    
    // Read TODO list from settings
    const { data: todoSetting } = await supabase.from('settings').select('value').eq('key', 'repair_todo_ids').single();
    let unmappedIds: number[] = [];
    if (todoSetting && todoSetting.value) {
        try { unmappedIds = JSON.parse(todoSetting.value); } catch (e) {}
    }

    if (!unmappedIds || unmappedIds.length === 0) {
        return { message: "No questions needing repair found. Please click 'Refresh Report' to scan the database first." };
    }

    const batchIds = unmappedIds.slice(0, 100);

    // Fetch the full data for the questions to repair
    const { data: toRepair, error: repairErr } = await supabase
        .from('questionbank')
        .select('*')
        .in('id', batchIds);

    if (repairErr) throw repairErr;
    if (!toRepair || toRepair.length === 0) {
        const remainingIds = unmappedIds.filter(id => !batchIds.includes(id));
        await upsertSupabaseData('settings', [{ key: 'repair_todo_ids', value: JSON.stringify(remainingIds) }], 'key');
        return { message: "Could not fetch questions to repair. Cleaned up stale IDs." };
    }

    try {
        // Get approved mappings from syllabus for strict mapping
        const { data: sData } = await supabase.from('syllabus').select('topic, title, subject');
        const approvedMappings = (sData || []).map(s => ({
            topic: s.topic || s.title || 'General',
            subject: s.subject || 'General Knowledge'
        })).filter(m => m.topic && m.subject);

        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analyze these Kerala PSC questions and assign the most appropriate Subject and Topic for each from the approved list.
            
            CRITICAL RULES:
            1. You MUST pick a pair from the Approved Mappings list below.
            2. Do NOT invent new topics or subjects.
            3. If no perfect match exists, pick the most relevant pair.
            
            Approved Mappings (Subject -> Topic):
            ${JSON.stringify(approvedMappings.map(m => `${m.subject} -> ${m.topic}`), null, 2)}
            
            Syllabus Context for understanding categories:
            ${JSON.stringify(SYLLABUS_STRUCTURE, null, 2)}
            
            Questions to repair: ${JSON.stringify(toRepair.map(q => ({ id: q.id, question: q.question, currentSubject: q.subject, currentTopic: q.topic })))}
            
            Return JSON array: [{ "id": number, "topic": "string", "subject": "string" }]`,
            config: { responseMimeType: "application/json" }
        });
        
        const updates = JSON.parse(response.text || "[]");
        if (updates.length > 0) {
            const finalData = toRepair.map(q => {
                const update = updates.find((u: any) => u.id == q.id);
                if (!update) return q;
                
                // Strict mapping: Ensure Subject + Topic pair is from the approved list
                const matchedMapping = approvedMappings.find(m => 
                    m.topic.toLowerCase().trim() === String(update.topic || '').toLowerCase().trim() &&
                    m.subject.toLowerCase().trim() === String(update.subject || '').toLowerCase().trim()
                );
                
                if (matchedMapping) {
                    return { 
                        ...q, 
                        topic: matchedMapping.topic,
                        subject: matchedMapping.subject
                    };
                } else {
                    // If AI returned a non-existent combo, try to at least match the topic
                    const topicMatch = approvedMappings.find(m => m.topic.toLowerCase().trim() === String(update.topic || '').toLowerCase().trim());
                    if (topicMatch) {
                        return { ...q, topic: topicMatch.topic, subject: topicMatch.subject };
                    }
                    return q; // Fallback to original if no match found
                }
            });
            
            await upsertSupabaseData('questionbank', finalData);
            const sheetRows = finalData.map(q => ({
                id: String(q.id),
                data: [q.id, q.topic, q.question, JSON.stringify(q.options), q.correct_answer_index, q.subject, q.difficulty, q.explanation]
            }));
            await batchUpsertRows('QuestionBank', sheetRows);
            
            // Update TODO list
            const remainingIds = unmappedIds.filter(id => !batchIds.includes(id));
            await upsertSupabaseData('settings', [{ key: 'repair_todo_ids', value: JSON.stringify(remainingIds) }], 'key');
            
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
        { name: 'Syllabus', table: 'syllabus', cols: ['id', 'exam_id', 'title', 'questions', 'duration', 'subject', 'topic'] },
        { name: 'TopicMappings', table: 'topic_mappings', cols: ['id', 'subject', 'topic', 'micro_topic'] },
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


export async function normalizeTopics() {
    if (!supabase) throw new Error("Supabase required.");
    
    // 1. Get approved mappings from syllabus
    const { data: sData } = await supabase.from('syllabus').select('topic, title, subject');
    
    let mData: any[] = [];
    try {
        const { data } = await supabase.from('topic_mappings').select('*');
        mData = data || [];
    } catch (e) {
        console.warn("topic_mappings table missing, using syllabus only for normalization.");
    }
    
    const approvedMappings = (sData || []).map(s => ({
        topic: s.topic || s.title || 'General',
        subject: s.subject || 'General Knowledge'
    })).filter(m => m.topic && m.subject);
    
    if (approvedMappings.length === 0) throw new Error("No syllabus topics found to normalize against.");

    // 2. Read TODO list from settings
    const { data: todoSetting } = await supabase.from('settings').select('value').eq('key', 'normalization_todo_ids').single();
    let unmappedIds: number[] = [];
    if (todoSetting && todoSetting.value) {
        try { unmappedIds = JSON.parse(todoSetting.value); } catch (e) {}
    }

    if (!unmappedIds || unmappedIds.length === 0) {
        return { message: "No pending questions found. Please click 'Refresh Report' to scan the database first." };
    }

    const batchIds = unmappedIds.slice(0, 500);

    // 3. Fetch the full data for the questions to repair
    const { data: toRepair, error: repairErr } = await supabase
        .from('questionbank')
        .select('*')
        .in('id', batchIds);

    if (repairErr) throw repairErr;
    
    if (!toRepair || toRepair.length === 0) {
        const remainingIds = unmappedIds.filter(id => !batchIds.includes(id));
        await upsertSupabaseData('settings', [{ key: 'normalization_todo_ids', value: JSON.stringify(remainingIds) }], 'key');
        return { message: "Could not fetch questions to repair. Cleaned up stale IDs." };
    }

    // 4. Try auto-mapping using the topic_mappings table first
    const autoMapped: any[] = [];
    const remainingToRepair: any[] = [];

    toRepair.forEach(q => {
        const tLower = String(q.topic || '').toLowerCase().trim();
        const sLower = String(q.subject || '').toLowerCase().trim();

        // Check mapping table
        const mapping = (mData || []).find(m => String(m.micro_topic || '').toLowerCase().trim() === tLower);
        if (mapping) {
            autoMapped.push({ ...q, subject: mapping.subject, topic: mapping.topic });
            return;
        }

        remainingToRepair.push(q);
    });

    if (autoMapped.length > 0) {
        await upsertSupabaseData('questionbank', autoMapped.map(q => ({ id: q.id, subject: q.subject, topic: q.topic })), 'id');
    }

    let totalNormalized = autoMapped.length;
    let totalFailed = 0;

    // 5. Process remaining with AI
    if (remainingToRepair.length > 0) {
        for (let i = 0; i < remainingToRepair.length; i += 100) {
            const smallBatch = remainingToRepair.slice(i, i + 100);
            const result = await processNormalizationBatch(smallBatch, approvedMappings);
            
            const match = result.message.match(/normalized (\d+) questions/);
            if (match) {
                totalNormalized += parseInt(match[1]);
            } else {
                totalFailed += smallBatch.length;
            }
        }
    }

    // 6. Update TODO list
    const remainingIds = unmappedIds.filter(id => !batchIds.includes(id));
    await upsertSupabaseData('settings', [{ key: 'normalization_todo_ids', value: JSON.stringify(remainingIds) }], 'key');

    return { message: `Processed ${toRepair.length} questions. Auto-mapped ${autoMapped.length}. AI-normalized ${totalNormalized - autoMapped.length}. Failed to map ${totalFailed}.` };
}

async function processNormalizationBatch(toRepair: any[], approvedMappings: { topic: string, subject: string }[]) {
    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `You are a Kerala PSC syllabus expert. Map these "Old Topics" to the most appropriate "Approved Syllabus Mappings" from the provided list.
            
            Approved Syllabus Mappings (Subject -> Topic):
            ${JSON.stringify(approvedMappings.map(m => `${m.subject} -> ${m.topic}`), null, 2)}
            
            Approved Subjects:
            ${JSON.stringify(APPROVED_SUBJECTS)}
            
            Questions to map:
            ${JSON.stringify(toRepair.map(q => ({ id: q.id, question: q.question, oldTopic: q.topic, subject: q.subject })))}
            
            Rules:
            1. You MUST pick a pair from the Approved Mappings list.
            2. If no direct match, pick the most relevant micro-topic from the Approved Mappings list. DO NOT invent new topics.
            3. Ensure the Subject is also correct according to the new Topic and must be from the Approved Subjects list.
            
            Return JSON array: [{ "id": number, "topic": "string", "subject": "string" }]`,
            config: { responseMimeType: "application/json" }
        });
        
        const updates = JSON.parse(response.text || "[]");
        if (updates.length > 0 && supabase) {
            // Fetch existing topic mappings
            const { data: mappingData } = await supabase.from('settings').select('value').eq('key', 'topic_mappings').maybeSingle();
            let topicMappings: Record<string, string[]> = {};
            if (mappingData && mappingData.value) {
                try { topicMappings = JSON.parse(mappingData.value); } catch (e) {}
            }

            let mappedCount = 0;

            updates.forEach((update: any) => {
                const originalQuestion = toRepair.find(q => q.id === update.id);
                const oldTopic = originalQuestion ? originalQuestion.topic : null;
                const newTopic = update.topic;

                if (!oldTopic || !newTopic) return;

                // Strict mapping: Ensure Subject + Topic pair is from the approved list
                const matchedMapping = approvedMappings.find(m => 
                    m.topic.toLowerCase().trim() === String(newTopic).toLowerCase().trim() &&
                    m.subject.toLowerCase().trim() === String(update.subject || '').toLowerCase().trim()
                );
                
                let finalTopic = null;
                if (matchedMapping) {
                    finalTopic = matchedMapping.topic;
                } else {
                    // Fallback: Try to match just the topic if combo fails
                    const topicMatch = approvedMappings.find(m => m.topic.toLowerCase().trim() === String(newTopic).toLowerCase().trim());
                    if (topicMatch) {
                        finalTopic = topicMatch.topic;
                    }
                }

                if (finalTopic) {
                    if (!topicMappings[finalTopic]) {
                        topicMappings[finalTopic] = [];
                    }
                    if (!topicMappings[finalTopic].includes(oldTopic)) {
                        topicMappings[finalTopic].push(oldTopic);
                    }
                    mappedCount++;
                }
            });
            
            // Save updated mappings
            await upsertSupabaseData('settings', [{ key: 'topic_mappings', value: JSON.stringify(topicMappings) }], 'key');
            
            return { message: `Successfully normalized ${mappedCount} questions to approved syllabus topics.` };
        }
    } catch (e: any) {
        console.error("Normalize Topics Error:", e.message);
        throw e;
    }
    return { message: "Normalization batch failed." };
}

export async function syncAllFromSheetsToSupabase(targetTable?: string) {
    if (!supabase) throw new Error("No Supabase.");
    const tables = [
        { 
            sheet: 'Exams', 
            supabase: 'exams', 
            map: (r: any[]) => ({ 
                id: r[0], 
                title_ml: r[1], 
                title_en: r[2], 
                description_ml: r[3], 
                description_en: r[4], 
                category: r[5], 
                level: r[6], 
                icon_type: r[7] 
            }) 
        },
        { 
            sheet: 'Syllabus', 
            supabase: 'syllabus', 
            map: (r: any[]) => {
                // Handle 6 columns (no ID) or 7 columns (with ID)
                const offset = r.length >= 7 ? 1 : 0;
                return {
                    exam_id: r[0 + offset],
                    title: r[1 + offset],
                    questions: parseInt(r[2 + offset] || '0'),
                    duration: parseInt(r[3 + offset] || '0'),
                    subject: r[4 + offset],
                    topic: r[5 + offset]
                };
            }
        },
        { 
            sheet: 'TopicMappings', 
            supabase: 'topic_mappings', 
            map: (r: any[]) => {
                // Handle 3 columns (no ID) or 4 columns (with ID)
                const offset = r.length >= 4 ? 1 : 0;
                return {
                    subject: r[0 + offset],
                    topic: r[1 + offset],
                    micro_topic: r[2 + offset]
                };
            }
        },
        { 
            sheet: 'QuestionBank', 
            supabase: 'questionbank', 
            map: (r: any[]) => {
                // Handle 7 columns (no ID) or 8 columns (with ID)
                const offset = r.length >= 8 ? 1 : 0;
                return {
                    topic: r[0 + offset] || 'General',
                    question: r[1 + offset],
                    options: smartParseOptions(r[2 + offset]),
                    correct_answer_index: parseInt(r[3 + offset] || '1'),
                    subject: r[4 + offset] || 'General Knowledge',
                    difficulty: r[5 + offset] || 'PSC Level',
                    explanation: r[6 + offset] || ''
                };
            }
        }
    ];

    const targetTables = targetTable ? tables.filter(t => t.supabase === targetTable) : tables;
    if (targetTable && targetTables.length === 0) {
        throw new Error(`Table ${targetTable} not found in sync configuration.`);
    }

    for (const t of targetTables) {
        try {
            console.log(`Syncing ${t.sheet} -> ${t.supabase}...`);
            const rows = await readSheetData(`${t.sheet}!A2:Z`);
            console.log(`Read ${rows?.length || 0} rows from ${t.sheet}`);
            if (rows?.length) {
                // Filter out rows where the first "data" column is empty or row is mostly empty
                const mappedData = rows.filter(r => {
                    // Row must have at least some non-empty content
                    const hasContent = r.some(cell => cell && String(cell).trim() !== '');
                    if (!hasContent) return false;
                    
                    // Specific validation for each table
                    if (t.supabase === 'questionbank') {
                        // QuestionBank must have a question (column 1 or 2 depending on offset)
                        const offset = r.length >= 8 ? 1 : 0;
                        return r[1 + offset] && String(r[1 + offset]).trim() !== '';
                    }
                    if (t.supabase === 'syllabus') {
                        // Syllabus must have an exam_id and title
                        const offset = r.length >= 7 ? 1 : 0;
                        return r[0 + offset] && r[1 + offset];
                    }
                    return true;
                }).map(t.map as any);
                
                console.log(`Mapped ${mappedData.length} valid rows for ${t.supabase}`);
                
                if (mappedData.length === 0) {
                    console.warn(`No valid data found for ${t.supabase}. Skipping sync to avoid clearing table.`);
                    continue;
                }

                if (t.supabase === 'exams') {
                    // Exams use string IDs, upsert is fine
                    await upsertSupabaseData(t.supabase, mappedData);
                } else {
                    // For tables with auto-id (int), delete and insert to avoid "non-DEFAULT value" error
                    console.log(`Clearing table ${t.supabase}...`);
                    const { error: delError } = await supabase.from(t.supabase).delete().neq('id', -1);
                    if (delError) {
                        if (delError.message.includes('not find the table')) {
                            console.warn(`Table ${t.supabase} not found in Supabase. Skipping.`);
                            continue;
                        }
                        console.error(`Delete failed for ${t.supabase}:`, delError.message);
                        // If delete fails, we might still want to try insert if it was a partial failure, 
                        // but usually it means something is wrong with the table.
                    }

                    // Batch insert to avoid payload limits
                    let inserted = 0;
                    for (let i = 0; i < mappedData.length; i += 100) {
                        const batch = mappedData.slice(i, i + 100);
                        const { error: insError } = await supabase.from(t.supabase).insert(batch);
                        if (insError) {
                            console.error(`Insert failed for ${t.supabase} batch ${i}:`, insError.message);
                            // We don't break here, try next batch? 
                            // Actually, if it's a schema error, all batches will fail.
                            // But if it's a single bad row, only one batch fails.
                        } else {
                            inserted += batch.length;
                        }
                    }
                    console.log(`Successfully inserted ${inserted} rows into ${t.supabase}`);
                }
            }
        } catch (e: any) {
            console.error(`Sync failed for table ${t.supabase}:`, e.message);
        }
    }
    return { message: "Sync complete." };
}
