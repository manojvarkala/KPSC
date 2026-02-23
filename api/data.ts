
import { readSheetData } from './_lib/sheets-service.js';
import { supabase } from './_lib/supabase-service.js';

/**
 * Enhanced option parser that unwraps multiple layers of stringification.
 */
const smartParseOptions = (raw: any): string[] => {
    if (!raw) return [];
    
    const unwrap = (val: any): any => {
        if (Array.isArray(val)) {
            if (val.length === 1 && typeof val[0] === 'string' && val[0].startsWith('[')) {
                return unwrap(val[0]);
            }
            return val;
        }
        if (typeof val === 'string') {
            const trimmed = val.trim();
            if (trimmed.startsWith('[') || trimmed.startsWith('"[')) {
                try {
                    let cleaned = trimmed;
                    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                        cleaned = cleaned.slice(1, -1).replace(/\\"/g, '"');
                    }
                    const parsed = JSON.parse(cleaned);
                    return unwrap(parsed);
                } catch (e) {
                    return trimmed;
                }
            }
        }
        return val;
    };

    const final = unwrap(raw);
    if (Array.isArray(final)) return final.map(String);
    if (typeof final === 'string') {
        if (final.includes('|')) return final.split('|').map(s => s.trim());
        return [final];
    }
    return [];
};

/**
 * Normalizes subject names to strictly follow the Official Approved List provided by user.
 */
const normalizeSubject = (subject: string, topic: string, question: string = ''): string => {
    const s = String(subject || '').toLowerCase().trim();
    const t = String(topic || '').toLowerCase().trim();
    const q = String(question || '').toLowerCase().trim();
    const context = `${s} ${t} ${q}`;

    // 1. Core Subject Mapping
    if (context.includes('renaissance') || context.includes('നവോത്ഥാനം')) return "Kerala History / Renaissance";
    if (context.includes('kerala history') || context.includes('കേരള ചരിത്രം')) return "Kerala History";
    if (context.includes('kerala geo') || context.includes('കേരള ഭൂമിശാസ്ത്രം') || context.includes('river') || context.includes('district')) {
        if (context.includes('kerala')) return "Kerala Geography";
    }
    if (context.includes('kerala gk') || context.includes('കേരള സംബന്ധിയായ')) return "Kerala Specific GK";
    
    if (context.includes('indian history') || context.includes('ഇന്ത്യൻ ചരിത്രം') || context.includes('freedom struggle')) return "Indian History";
    if (context.includes('indian geo') || context.includes('ഇന്ത്യൻ ഭൂമിശാസ്ത്രം') || context.includes('himalaya') || context.includes('ganga')) return "Indian Geography";
    if (context.includes('polity') || context.includes('const') || context.includes('ഭരണഘടന') || context.includes('article') || context.includes('panchayat')) return "Indian Polity / Constitution";
    if (context.includes('economy') || context.includes('സാമ്പത്തിക') || context.includes('gdp') || context.includes('budget')) return "Indian Economy";
    
    if (context.includes('biology') || context.includes('ജീവശാസ്ത്രം') || context.includes('life science') || context.includes('cell') || context.includes('human body')) return "Biology / Life Science";
    if (context.includes('chemistry') || context.includes('രസതന്ത്രം') || context.includes('element') || context.includes('formula')) return "Chemistry";
    if (context.includes('physics') || context.includes('ഭൗതികശാസ്ത്രം') || context.includes('motion') || context.includes('energy')) return "Physics";
    if (context.includes('gen science') || context.includes('ശാസ്ത്രം') || context.includes('tech') || context.includes('space')) return "General Science / Science & Tech";
    
    if (context.includes('math') || context.includes('arithmetic') || context.includes('ഗണിതം') || context.includes('percentage') || context.includes('interest')) return "Quantitative Aptitude";
    if (context.includes('reasoning') || context.includes('logic') || context.includes('mental') || context.includes('coding-decoding')) return "Reasoning / Mental Ability";
    
    if (context.includes('it') || context.includes('computer') || context.includes('cyber') || context.includes('internet') || context.includes('software')) return "Computer Science / IT / Cyber Laws";
    if (context.includes('english') || context.includes('ഇംഗ്ലീഷ്') || context.includes('grammar') || context.includes('synonym')) return "English";
    if (context.includes('malayalam') || context.includes('മലയാളം') || context.includes('സാഹിത്യം')) return "Malayalam";
    
    if (context.includes('arts') || context.includes('sports') || context.includes('culture') || context.includes('കായികം') || context.includes('award') || context.includes('film')) return "Arts, Culture & Sports";
    if (context.includes('nursing') || context.includes('health') || context.includes('മെഡിക്കൽ') || context.includes('disease')) return "Nursing Science / Health Care";
    if (context.includes('electrical') || context.includes('എഞ്ചിനീയറിംഗ്')) return "Electrical Engineering";
    if (context.includes('psychology') || context.includes('pedagogy') || context.includes('ബോധന') || context.includes('teaching')) return "Educational Psychology / Pedagogy";
    if (context.includes('environment') || context.includes('പരിസ്ഥിതി') || context.includes('pollution') || context.includes('climate')) return "Environment";
    if (context.includes('social science') || context.includes('sociology') || context.includes('സമൂഹ')) return "Social Science / Sociology";
    if (context.includes('current') || context.includes('news') || context.includes('ആനുകാലികം')) return "Current Affairs";

    // 2. Static GK Fallback
    if (context.includes('gk') || context.includes('first in') || context.includes('largest')) return "General Knowledge / Static GK";
    
    // 3. Blacklist Catch-all (Default to General Knowledge)
    const blacklist = ['other', 'manual check', 'unknown', 'n/a', 'none', '', 'null', 'undefined', 'manual correction required'];
    if (blacklist.includes(s)) {
        return "General Knowledge";
    }

    return subject; // Return original if it doesn't match a context-fix but isn't blacklisted
};

/**
 * Shuffles an array in place using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

export default async function handler(req: any, res: any) {
    const { type, examId, subject, topic, count, offset, limit } = req.query;
    if (!type) return res.status(400).json({ error: 'Type required' });

    const tType = type.toLowerCase();
    const tableMap: Record<string, string> = {
        'exams': 'exams', 'questions': 'questionbank', 'books': 'bookstore',
        'updates': 'liveupdates', 'affairs': 'currentaffairs', 'gk': 'gk',
        'syllabus': 'syllabus', 'notifications': 'notifications', 'settings': 'settings',
        'subscriptions': 'subscriptions', 'flash_cards': 'flashcards'
    };
    
    const tableName = tableMap[tType] || tType;
    const offsetCount = parseInt(offset as string) || 0;
    let limitCount = parseInt(limit as string) || parseInt(count as string);

    if (isNaN(limitCount)) {
        if (tableName === 'exams') limitCount = 100;
        else if (tableName === 'gk' || tableName === 'currentaffairs' || tableName === 'flashcards') limitCount = 20; 
        else if (tableName === 'bookstore') limitCount = 20;
        else limitCount = 20;
    }

    try {
        if (supabase) {
            let query = supabase.from(tableName).select('*');
            if (tableName === 'syllabus' && examId) query = query.eq('exam_id', String(examId));
            if (tableName === 'questionbank') {
                if (subject && subject !== 'mixed' && subject !== 'General') {
                    query = query.or(`subject.ilike.%${subject}%,topic.ilike.%${subject}%`);
                } else if (topic && topic !== 'mixed') {
                    query = query.ilike('topic', `%${topic}%`);
                }
            }
            
            query = query.range(offsetCount, offsetCount + limitCount - 1);

            if (tableName === 'subscriptions' || tableName === 'currentaffairs' || tableName === 'gk' || tableName === 'notifications' || tableName === 'flashcards' || tableName === 'bookstore') {
                query = query.order('id', { ascending: false });
            }

            const { data, error } = await query;
            if (error) {
                console.error(`Supabase Query Error [${tableName}]:`, error.message);
                // If it's a schema cache error, we trigger the fallback to sheets
                if (!error.message.includes('schema cache') && !error.message.includes('column')) {
                    throw error;
                }
                console.warn("Schema mismatch detected, falling back to Sheets.");
            }
            
            if (!error && data && data.length > 0) {
                if (tableName === 'questionbank') {
                    const processedQuestions = data.map(q => {
                        const originalOptions = smartParseOptions(q.options);
                        if (originalOptions.length === 0) return { ...q, options: [], correctAnswerIndex: 1, subject: normalizeSubject(q.subject, q.topic, q.question) };
                        const originalCorrectIdx = Math.max(0, Math.min(parseInt(String(q.correct_answer_index || '1')) - 1, originalOptions.length - 1));
                        const correctText = originalOptions[originalCorrectIdx];
                        const shuffled = shuffleArray(originalOptions);
                        const newCorrectIdx = shuffled.indexOf(correctText) + 1;

                        return {
                            ...q,
                            options: shuffled,
                            correctAnswerIndex: newCorrectIdx || 1,
                            subject: normalizeSubject(q.subject, q.topic, q.question)
                        };
                    });

                    return res.status(200).json(processedQuestions.sort(() => 0.5 - Math.random()));
                }
                return res.status(200).json(data);
            }
        }

        // Sheets Fallback
        const sheetName = type.charAt(0).toUpperCase() + type.slice(1);
        try {
            const rows = await readSheetData(`${sheetName}!A2:Z`);
            const paginatedRows = rows.slice(offsetCount, offsetCount + limitCount);
            
            if (tType === 'questions') {
                 return res.status(200).json(paginatedRows.map((r, i) => {
                    const originalOptions = smartParseOptions(r[3]);
                    const originalCorrectIdx = Math.max(0, Math.min(parseInt(String(r[4] || '1')) - 1, originalOptions.length - 1));
                    const correctText = originalOptions[originalCorrectIdx];
                    const shuffled = shuffleArray(originalOptions);
                    const newCorrectIdx = shuffled.indexOf(correctText) + 1;

                    return {
                        id: String(r[0] || (offsetCount + i)), 
                        topic: r[1], 
                        question: r[2], 
                        options: shuffled, 
                        correctAnswerIndex: newCorrectIdx || 1, 
                        subject: normalizeSubject(r[5], r[1], r[2]), 
                        difficulty: r[6]
                    };
                 }).sort(() => 0.5 - Math.random()));
            }
            return res.status(200).json(paginatedRows);
        } catch (sheetErr: any) {
            return res.status(200).json([]);
        }

    } catch (error: any) { 
        return res.status(500).json({ error: "Database Request Failed" }); 
    }
}
