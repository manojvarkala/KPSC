
import { verifyAdmin } from "./_lib/clerk-auth.js";
import { findAndUpsertRow, deleteRowById, appendSheetData, readSheetData } from './_lib/sheets-service.js';
import { 
    runDailyUpdateScrapers, 
    runBookScraper, 
    scrapeKpscNotifications, 
    scrapePscLiveUpdates, 
    scrapeGkFacts,
    scrapeCurrentAffairs,
    generateQuestionsForGaps,
    generateFlashCards,
    syncAllFromSheetsToSupabase,
    syncSupabaseToSheets,
    repairLanguageMismatches,
    repairBlankTopics,
    backfillExplanations,
    bulkUploadQuestions,
    normalizeTopics,
    APPROVED_SUBJECTS
} from "./_lib/scraper-service.js";
import { auditAndCorrectQuestions } from "./_lib/audit-service.js";
import { supabase, upsertSupabaseData, deleteSupabaseRow, fetchAllSupabaseData } from "./_lib/supabase-service.js";

async function getRequestBody(req: any) {
    // If body is already an object, return it (standard for many serverless platforms)
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        return req.body;
    }
    
    // If body is a string, try to parse it
    if (typeof req.body === 'string' && req.body.length > 0) {
        try { return JSON.parse(req.body); } catch (e) { /* ignore */ }
    }
    
    // Fallback: Read from stream (for platforms that don't pre-parse)
    return new Promise((resolve) => {
        let body = '';
        req.on('data', (chunk: any) => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                resolve({});
            }
        });
        // Short timeout for stream reading
        setTimeout(() => resolve({}), 1000);
    });
}

async function handleTestConnection(res: any) {
    console.log("Testing connection...");
    let sheetsStatus: any = { ok: false, error: null };
    let supabaseStatus: any = { ok: false, error: null };
    
    try { 
        const data = await readSheetData('Exams!A1:A1'); 
        console.log("Sheets connection OK, data length:", data.length);
        sheetsStatus.ok = true; 
    } catch (e: any) { 
        console.error("Sheets connection FAILED:", e.message);
        sheetsStatus.error = e.message || "Failed to access spreadsheet";
    }

    if (supabase) {
        try { 
            const { error } = await supabase.from('exams').select('id').limit(1); 
            if (error) throw error;
            console.log("Supabase connection OK");
            supabaseStatus.ok = true; 
        } catch (e: any) { 
            console.error("Supabase connection FAILED:", e.message);
            supabaseStatus.error = e.message || "Failed to query Supabase table";
        }
    } else {
        console.warn("Supabase client is NULL");
        supabaseStatus.error = "SUPABASE_URL or KEY is missing from server env";
    }

    return res.status(200).json({ status: { sheets: sheetsStatus.ok, supabase: supabaseStatus.ok, sheetsErr: sheetsStatus.error, supabaseErr: supabaseStatus.error } });
}

export default async function handler(req: any, res: any) {
    if (req.method === 'GET') {
        const { action } = req.query;
        if (action === 'test-connection') {
            return await handleTestConnection(res);
        }
        
        const authHeader = req.headers.authorization;
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'Unauthorized' });
        try {
            const result = await runDailyUpdateScrapers();
            return res.status(200).json({ message: 'Cron Success', result });
        } catch (e: any) { return res.status(500).json({ error: e.message }); }
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    
    const body: any = await getRequestBody(req);
    // Support action from both body and query for maximum resilience
    const action = body?.action || req.query?.action;
    const { id, resultData, sheet, data, topic, setting, questions, rowData, feedback } = body || {};

    if (action === 'save-result') {
        try {
            const rd = resultData || {};
            const resultId = rd.id || Date.now();
            if (supabase) await upsertSupabaseData('results', [{ id: resultId, user_id: String(rd.userId || 'guest'), user_email: String(rd.userEmail || ''), test_title: String(rd.testTitle || ''), score: rd.score || 0, total: rd.total || 0 }]);
            await appendSheetData('Results!A1', [[resultId, rd.userId || 'guest', rd.userEmail || '', rd.testTitle || '', rd.score || 0, rd.total || 0, new Date().toISOString()]]);
            return res.status(200).json({ message: 'Saved' });
        } catch (e: any) { return res.status(500).json({ error: e.message }); }
    }

    if (action === 'submit-feedback') {
        try {
            const fb = feedback || {};
            const feedbackId = Date.now();
            await appendSheetData('Feedback!A1', [[feedbackId, fb.userId || 'guest', fb.userEmail || '', fb.rating || 0, fb.comment || '', fb.topic || '', new Date().toISOString()]]);
            return res.status(200).json({ message: 'Feedback submitted' });
        } catch (e: any) { return res.status(500).json({ error: e.message }); }
    }

    if (action === 'test-connection') {
        return await handleTestConnection(res);
    }

    try { await verifyAdmin(req); } catch (e: any) { return res.status(401).json({ error: e.message }); }

    try {
        switch (action) {
            case 'rebuild-db': return res.status(200).json(await syncAllFromSheetsToSupabase());
            case 'sync-to-sheets': return res.status(200).json(await syncSupabaseToSheets());
            case 'run-daily-sync': return res.status(200).json(await runDailyUpdateScrapers());
            case 'run-gk-scraper': return res.status(200).json(await scrapeGkFacts());
            case 'run-ca-scraper': return res.status(200).json(await scrapeCurrentAffairs());
            case 'run-scraper-notifications': return res.status(200).json(await scrapeKpscNotifications());
            case 'run-scraper-updates': return res.status(200).json(await scrapePscLiveUpdates());
            case 'run-gap-filler': return res.status(200).json(await generateQuestionsForGaps(8));
            case 'run-flashcard-generator': return res.status(200).json(await generateFlashCards(5));
            case 'run-targeted-gap-fill': return res.status(200).json(await generateQuestionsForGaps(topic));
            case 'run-book-scraper': return res.status(200).json(await runBookScraper());
            case 'run-batch-qa': return res.status(200).json(await auditAndCorrectQuestions());
            case 'run-language-repair': return res.status(200).json(await repairLanguageMismatches());
            case 'run-topic-repair': return res.status(200).json(await repairBlankTopics());
            case 'run-explanation-repair': return res.status(200).json(await backfillExplanations());
            case 'normalize-topics': return res.status(200).json(await normalizeTopics());
            case 'upload-questions': return res.status(200).json(await bulkUploadQuestions(questions));
            
            case 'save-row': {
                const tableName = sheet.toLowerCase();
                if (supabase) await upsertSupabaseData(tableName, [rowData]);
                let sheetValues: any[] = [];
                if (tableName === 'exams') {
                    sheetValues = [rowData.id, rowData.title_ml, rowData.title_en, rowData.description_ml, rowData.description_en, rowData.category, rowData.level, rowData.icon_type];
                } else if (tableName === 'bookstore') {
                    sheetValues = [rowData.id, rowData.title, rowData.author, rowData.imageUrl, rowData.amazonLink];
                }
                await findAndUpsertRow(sheet, rowData.id, sheetValues);
                return res.status(200).json({ message: `${sheet} entry updated.` });
            }

            case 'run-all-gaps': {
                if (!supabase) throw new Error("Supabase required.");
                const { data: sData } = await supabase.from('syllabus').select('topic, title');
                const qData = await fetchAllSupabaseData('questionbank', 'topic, subject');
                
                const topicCounts = new Map<string, number>();
                qData?.forEach(q => {
                    const qTopic = String(q.topic || '').toLowerCase().trim();
                    const qSubject = String(q.subject || '').toLowerCase().trim();
                    if (qTopic) {
                        topicCounts.set(qTopic, (topicCounts.get(qTopic) || 0) + 1);
                    } else if (qSubject) {
                        topicCounts.set(qSubject, (topicCounts.get(qSubject) || 0) + 1);
                    }
                });

                const uniqueTopics = new Set<string>();
                const sortedTopics = (sData || []).map(s => {
                    let t = s.topic;
                    if (!t || t === 'null' || t.trim() === '') t = s.title;
                    if (!t || t === 'null' || t.trim() === '') t = "Unnamed Topic";
                    
                    const sTopic = String(t).toLowerCase().trim();
                    const count = topicCounts.get(sTopic) || 0;
                    return { topic: t, sTopic, count };
                }).filter(s => {
                    if (uniqueTopics.has(s.sTopic)) return false;
                    uniqueTopics.add(s.sTopic);
                    return true;
                }).sort((a, b) => a.count - b.count);

                if (sortedTopics.length === 0) return res.status(200).json({ message: "No topics found in syllabus." });
                
                const batch = sortedTopics.slice(0, 5).map(s => s.topic);
                for (const t of batch) { try { await generateQuestionsForGaps(t); } catch (err) {} }
                return res.status(200).json({ message: `Filled gaps for ${batch.length} topics.` });
            }

            case 'update-setting': {
                if (supabase) await upsertSupabaseData('settings', [setting], 'key');
                await findAndUpsertRow('Settings', setting.key, [setting.key, setting.value]);
                return res.status(200).json({ message: `Setting updated.` });
            }

            case 'get-audit-report': {
                if (!supabase) throw new Error("Supabase required.");
                
                // 1. Get the actual total count (not limited by fetch size)
                const { count: realTotalCount } = await supabase
                    .from('questionbank')
                    .select('*', { count: 'exact', head: true });

                // 2. Fetch data for classification audit (using pagination to get all rows)
                const qData = await fetchAllSupabaseData('questionbank', 'id, topic, subject');
                const { data: sData } = await supabase.from('syllabus').select('id, topic, title, subject');
                
                const totalQuestions = realTotalCount || qData?.length || 0;
                
                // 3. Fetch last audited ID
                const { data: lastAuditedSetting } = await supabase.from('settings').select('value').eq('key', 'last_audited_id').single();
                const lastAuditedId = parseInt(lastAuditedSetting?.value || '0');

                // 4. Prepare syllabus topic list for matching
                const syllabusTopicsLower = (sData || []).map(s => {
                    let name = s.topic;
                    if (!name || String(name).toLowerCase() === 'null' || String(name).trim() === '') name = s.title;
                    return String(name || '').toLowerCase().trim();
                }).filter(Boolean);

                let unclassifiedCount = 0;
                const approvedLower = APPROVED_SUBJECTS.map(s => s.toLowerCase().trim());
                const subjectMismatches: string[] = [];
                const unapprovedTopics: string[] = [];
                let questionSubjectMismatches = 0;
                
                const normalizationTodoIds: number[] = [];
                const repairTodoIds: number[] = [];

                qData?.forEach(q => { 
                    const s = String(q.subject || '').trim();
                    const sLower = s.toLowerCase();
                    const t = String(q.topic || '').trim();
                    const tLower = t.toLowerCase();

                    // Check if subject is invalid
                    const isInvalidSubject = sLower === 'other' || sLower.includes('manual') || sLower === '' || sLower === 'null' || !approvedLower.includes(sLower);
                    
                    // Check if topic is invalid (empty or not in syllabus)
                    const isInvalidTopic = tLower === '' || tLower === 'null' || !syllabusTopicsLower.includes(tLower);

                    if (isInvalidSubject || isInvalidTopic) {
                        unclassifiedCount++;
                        
                        if (sLower !== '' && sLower !== 'null' && !approvedLower.includes(sLower)) {
                            questionSubjectMismatches++;
                            if (!subjectMismatches.includes(s)) subjectMismatches.push(s);
                        }

                        if (tLower !== '' && tLower !== 'null' && !syllabusTopicsLower.includes(tLower)) {
                            if (!unapprovedTopics.includes(t)) unapprovedTopics.push(t);
                        }
                    }

                    // Populate TODO lists
                    if (tLower === '' || tLower === 'null' || sLower === '' || sLower === 'null' || !approvedLower.includes(sLower)) {
                        repairTodoIds.push(q.id);
                    }
                    if (tLower === '' || tLower === 'null' || !syllabusTopicsLower.includes(tLower)) {
                        normalizationTodoIds.push(q.id);
                    }
                });

                // Save TODO lists to settings
                await upsertSupabaseData('settings', [
                    { key: 'normalization_todo_ids', value: JSON.stringify(normalizationTodoIds) },
                    { key: 'repair_todo_ids', value: JSON.stringify(repairTodoIds) }
                ], 'key');

                const uniqueTopics = new Set<string>();
                const gapReport: any[] = [];
                
                (sData || []).forEach(s => {
                    // Prioritize 'topic' field as it's the "Syllabus Topic" in the sheet
                    let topicName = s.topic;
                    if (!topicName || String(topicName).toLowerCase() === 'null' || String(topicName).trim() === '') {
                        topicName = s.title; // Fallback to title if topic is truly empty
                    }
                    if (!topicName || String(topicName).toLowerCase() === 'null' || String(topicName).trim() === '') {
                        topicName = "General Topic";
                    }
                    
                    const sTopic = String(topicName).toLowerCase().trim();
                    if (uniqueTopics.has(sTopic)) return; // Skip duplicates
                    uniqueTopics.add(sTopic);

                    const sSubject = String(s.subject || '').toLowerCase().trim();

                    if (s.subject && !approvedLower.includes(s.subject.toLowerCase().trim())) {
                        if (!subjectMismatches.includes(s.subject)) subjectMismatches.push(s.subject);
                    }
                    
                    // Stricter matching: 
                    // 1. Exact match on topic
                    // 2. If topic is very specific, don't just match subject
                    const count = qData?.filter(q => {
                        const qTopic = String(q.topic || '').toLowerCase().trim();
                        const qSubject = String(q.subject || '').toLowerCase().trim();
                        
                        // Exact topic match is the gold standard
                        if (qTopic === sTopic) return true;
                        
                        // If the question's topic is empty but its subject matches this syllabus topic
                        // (Only if the syllabus topic is actually a subject name)
                        if (qTopic === '' && qSubject === sTopic) return true;

                        // Support for slight variations if they are clearly the same
                        // But avoid "Kerala" matching "Kerala History" if "Kerala History" is a separate topic
                        return false;
                    }).length || 0;

                    gapReport.push({ id: s.id, topic: topicName, count, subject: s.subject });
                });

                return res.status(200).json({ 
                    syllabusReport: gapReport, 
                    totalQuestions,
                    unclassifiedCount,
                    questionSubjectMismatches,
                    subjectMismatches,
                    unapprovedTopics,
                    lastAuditedId,
                    approvedSubjects: APPROVED_SUBJECTS
                });
            }
            case 'delete-row': await deleteRowById(sheet, id); if (supabase) await deleteSupabaseRow(sheet, id); return res.status(200).json({ message: 'Item deleted.' });
            default: return res.status(400).json({ error: 'Invalid Action' });
        }
    } catch (e: any) { return res.status(500).json({ error: e.message }); }
}
