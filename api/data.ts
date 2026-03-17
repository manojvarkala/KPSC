
import { readSheetData } from './_lib/sheets-service.js';
import { supabase, upsertSupabaseData, fetchAllSupabaseData } from './_lib/supabase-service.js';
import { normalizeSubject, smartParseOptions } from './_lib/utils.js';

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

    const cleanTopic = String(topic || '').trim();
    const cleanSubject = String(subject || '').trim();

    try {
        if (supabase) {
            let query = supabase.from(tableName).select('*');
            if (tableName === 'syllabus' && examId) query = query.eq('exam_id', String(examId));
            let fetchLimit = limitCount;
            if (tableName === 'questionbank') {
                if (cleanTopic && cleanTopic.toLowerCase() !== 'mixed') {
                    // Use wildcards to handle variations and trailing spaces
                    query = query.ilike('topic', `%${cleanTopic}%`);
                    
                    if (cleanSubject && cleanSubject.toLowerCase() !== 'mixed' && cleanSubject.toLowerCase() !== 'general') {
                        query = query.ilike('subject', `%${cleanSubject}%`);
                    }
                    fetchLimit = 200; // Fetch more to increase chances of finding matches
                } else if (cleanSubject && cleanSubject.toLowerCase() !== 'mixed' && cleanSubject.toLowerCase() !== 'general') {
                    query = query.ilike('subject', `%${cleanSubject}%`);
                }
            }
            
            query = query.range(offsetCount, offsetCount + fetchLimit - 1);

            if (tableName === 'subscriptions' || tableName === 'currentaffairs' || tableName === 'gk' || tableName === 'notifications' || tableName === 'flashcards' || tableName === 'bookstore') {
                query = query.order('id', { ascending: false });
            }

            const { data, error } = await query;
            if (error) {
                console.error(`Supabase Query Error [${tableName}]:`, error.message);
                if (!error.message.includes('schema cache') && !error.message.includes('column')) {
                    throw error;
                }
            }
            
            let finalResult = data;
            if (!error && (!data || data.length === 0) && tableName === 'questionbank' && cleanTopic && cleanTopic.toLowerCase() !== 'mixed') {
                // FALLBACK: Try subject only if topic search failed
                let fallbackQuery = supabase.from(tableName).select('*');
                if (cleanSubject && cleanSubject.toLowerCase() !== 'mixed' && cleanSubject.toLowerCase() !== 'general') {
                    fallbackQuery = fallbackQuery.ilike('subject', `%${cleanSubject}%`);
                }
                const { data: fallbackData } = await fallbackQuery.limit(fetchLimit);
                if (fallbackData && fallbackData.length > 0) finalResult = fallbackData;
            }
            
            if (!error && finalResult && finalResult.length > 0) {
                if (tableName === 'questionbank') {
                    const finalData = finalResult.slice(0, limitCount);

                    const processedQuestions = finalData.map(q => {
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
