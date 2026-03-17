
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
import { normalizeSubject } from "./_lib/utils.js";

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

            case 'clean-database': {
                if (!supabase) throw new Error("Supabase required.");
                const qData = await fetchAllSupabaseData('questionbank', 'id, topic, subject');
                let cleanedCount = 0;
                const toUpdate = qData.filter(q => {
                    const t = String(q.topic || '');
                    const s = String(q.subject || '');
                    return t !== t.trim() || s !== s.trim();
                });

                for (const q of toUpdate) {
                    await supabase.from('questionbank').update({
                        topic: String(q.topic || '').trim(),
                        subject: String(q.subject || '').trim()
                    }).eq('id', q.id);
                    cleanedCount++;
                }
                return res.json({ success: true, message: `Cleaned whitespace from ${cleanedCount} questions.` });
            }

            case 'rebuild-syllabus': {
                if (!supabase) throw new Error("Supabase required.");
                const { data: exams } = await supabase.from('exams').select('id, title_en, level');
                if (!exams || exams.length === 0) return res.status(200).json({ message: "No exams found to rebuild syllabus for." });

                const syllabusEntries: any[] = [];
                const topics = [
                    { topic: 'General Knowledge', subject: 'General Knowledge' },
                    { topic: 'Kerala History & Renaissance', subject: 'Kerala History' },
                    { topic: 'Indian Polity & Constitution', subject: 'Indian Polity / Constitution' },
                    { topic: 'Basic Arithmetic', subject: 'Quantitative Aptitude' },
                    { topic: 'Mental Ability & Logical Reasoning', subject: 'Reasoning / Mental Ability' },
                    { topic: 'Basic English', subject: 'English' },
                    { topic: 'Malayalam Language', subject: 'Malayalam' },
                    { topic: 'General Science - Physics', subject: 'Physics' },
                    { topic: 'General Science - Chemistry', subject: 'Chemistry' },
                    { topic: 'General Science - Biology & Public Health', subject: 'Biology / Life Science' }
                ];

                for (const exam of exams) {
                    const title = String(exam.title_en || '').toLowerCase();
                    const level = String(exam.level || '').toLowerCase();
                    const isMains = title.includes('mains') || title.includes('main') || level.includes('main');
                    
                    // Standard PSC: Prelims = 100 Qs / 75-90 Mins, Mains = 100 Qs / 90-120 Mins
                    // With 10 topics, we distribute them:
                    const qPerTopic = 10; 
                    const dPerTopic = isMains ? 12 : 9; // 120 mins total for mains, 90 mins for prelims

                    for (const t of topics) {
                        syllabusEntries.push({
                            exam_id: exam.id,
                            topic: t.topic,
                            title: t.topic,
                            subject: t.subject,
                            questions: qPerTopic,
                            duration: dPerTopic
                        });
                    }
                }

                // Use a loop to insert to avoid potential payload size issues
                for (let i = 0; i < syllabusEntries.length; i += 50) {
                    await upsertSupabaseData('syllabus', syllabusEntries.slice(i, i + 50), 'id');
                }
                return res.status(200).json({ message: `Rebuilt syllabus with ${syllabusEntries.length} entries with exam-specific configs.` });
            }

            case 'reconfigure-syllabus': {
                if (!supabase) throw new Error("Supabase required.");
                const { data: syllabus } = await supabase.from('syllabus').select('id, exam_id, questions, duration');
                const { data: exams } = await supabase.from('exams').select('id, title_en, level');
                
                if (!syllabus || syllabus.length === 0) return res.status(200).json({ message: "No syllabus entries found." });

                const examMap = new Map(exams?.map(e => [e.id, { title: e.title_en, level: e.level }]) || []);
                const updates: any[] = [];

                for (const entry of syllabus) {
                    // Only update if questions or duration are 0
                    if (entry.questions === 0 || entry.duration === 0) {
                        const examInfo = examMap.get(entry.exam_id);
                        const examTitle = String(examInfo?.title || '').toLowerCase();
                        const examLevel = String(examInfo?.level || '').toLowerCase();
                        const isMains = examTitle.includes('mains') || examTitle.includes('main') || examLevel.includes('main');
                        
                        updates.push({
                            id: entry.id,
                            questions: 10,
                            duration: isMains ? 12 : 9
                        });
                    }
                }

                if (updates.length > 0) {
                    for (let i = 0; i < updates.length; i += 50) {
                        await upsertSupabaseData('syllabus', updates.slice(i, i + 50), 'id');
                    }
                    return res.status(200).json({ message: `Reconfigured ${updates.length} syllabus entries with proper question counts and durations.` });
                }

                return res.status(200).json({ message: "All syllabus entries already have valid configurations." });
            }

            case 'normalize-subjects': {
                if (!supabase) throw new Error("Supabase required.");
                const qData = await fetchAllSupabaseData('questionbank', 'id, subject');
                const updates = qData.map(q => {
                    const original = String(q.subject || '');
                    const normalized = normalizeSubject(original);
                    if (original !== normalized) {
                        return { id: q.id, subject: normalized };
                    }
                    return null;
                }).filter(Boolean) as any[];

                if (updates.length > 0) {
                    for (let i = 0; i < updates.length; i += 100) {
                        await upsertSupabaseData('questionbank', updates.slice(i, i + 100));
                    }
                }
                return res.status(200).json({ message: `Normalized ${updates.length} subjects.` });
            }

            case 'run-all-gaps': {
                if (!supabase) throw new Error("Supabase required.");
                const { data: sData } = await supabase.from('syllabus').select('id, topic, title, subject');
                const qData = await fetchAllSupabaseData('questionbank', 'topic, subject');
                
                const uniqueTopics = new Set<string>();
                const sortedTopics = (sData || []).map(s => {
                    let t = s.topic;
                    if (!t || t === 'null' || t.trim() === '') t = s.title;
                    if (!t || t === 'null' || t.trim() === '') t = "Unnamed Topic";
                    
                    const sTopic = String(t).toLowerCase().trim();
                    const sSubject = String(s.subject || '').toLowerCase().trim();
                    const compositeKey = `${sSubject}|${sTopic}`;
                    
                    // Strict matching: Must match BOTH subject and topic exactly
                    const count = qData?.filter(q => {
                        const qTopic = String(q.topic || '').toLowerCase().trim();
                        const qSubject = String(q.subject || '').toLowerCase().trim();
                        return qTopic === sTopic && qSubject === sSubject;
                    }).length || 0;

                    return { id: s.id, topic: t, compositeKey, count };
                }).filter(s => {
                    if (uniqueTopics.has(s.compositeKey)) return false;
                    uniqueTopics.add(s.compositeKey);
                    return true;
                }).sort((a, b) => a.count - b.count);

                if (sortedTopics.length === 0) return res.status(200).json({ message: "No topics found in syllabus." });
                
                const batch = sortedTopics.slice(0, 5);
                for (const item of batch) { 
                    try { 
                        // Pass the specific syllabus ID to ensure correct subject/topic targeting
                        await generateQuestionsForGaps(item.id); 
                    } catch (err) {
                        console.error(`Gap fill failed for ${item.topic}:`, err);
                    } 
                }
                return res.status(200).json({ message: `Filled gaps for ${batch.length} topics.` });
            }

            case 'get-settings': {
                if (!supabase) throw new Error("Supabase required.");
                const { data: settings } = await supabase.from('settings').select('*');
                return res.status(200).json(settings || []);
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

                // 4. Prepare syllabus mapping for matching
                const syllabusMappings = (sData || []).map(s => {
                    let name = s.topic;
                    if (!name || String(name).toLowerCase() === 'null' || String(name).trim() === '') name = s.title;
                    const t = String(name || '').toLowerCase().trim();
                    const sub = String(s.subject || '').toLowerCase().trim();
                    return { t, sub, composite: `${sub}|${t}` };
                }).filter(m => m.t);

                const syllabusTopicsLower = Array.from(new Set(syllabusMappings.map(m => m.t)));
                const syllabusComposites = new Set(syllabusMappings.map(m => m.composite));

                const normalizationTodoIds: number[] = [];
                const repairTodoIds: number[] = [];
                const approvedLower = APPROVED_SUBJECTS.map(s => s.toLowerCase().trim());
                const subjectMismatches: string[] = [];
                const unapprovedTopics: string[] = [];
                let questionSubjectMismatches = 0;
                let unclassifiedCount = 0;
                let classifiedCount = 0;

                qData?.forEach(q => { 
                    const s = String(q.subject || '').trim();
                    const sLower = s.toLowerCase();
                    const t = String(q.topic || '').trim();
                    const tLower = t.toLowerCase();
                    const composite = `${sLower}|${tLower}`;

                    const isTopicInSyllabus = syllabusTopicsLower.includes(tLower);
                    const isComboValid = syllabusComposites.has(composite);
                    const isSubjectApproved = approvedLower.includes(sLower);

                    // A question is "Classified" ONLY if its Subject+Topic combo exists in the syllabus
                    // AND the subject is in the approved list.
                    const isInvalid = !isComboValid || !isSubjectApproved;

                    if (isInvalid) {
                        unclassifiedCount++;
                        
                        // If subject is not in approved list, it's a mismatch
                        if (sLower !== '' && sLower !== 'null' && !isSubjectApproved) {
                            questionSubjectMismatches++;
                            if (!subjectMismatches.includes(s)) subjectMismatches.push(s);
                        }

                        // If topic is not in syllabus at all, it's unapproved
                        if (tLower !== '' && tLower !== 'null' && !isTopicInSyllabus) {
                            if (!unapprovedTopics.includes(t)) unapprovedTopics.push(t);
                        }

                        // Populate TODO lists
                        // 1. If topic exists but is not in syllabus -> Normalization (needs mapping)
                        if (tLower !== '' && tLower !== 'null' && !isTopicInSyllabus) {
                            normalizationTodoIds.push(q.id);
                        } 
                        // 2. If topic is missing OR is valid but subject is wrong -> Repair
                        else {
                            repairTodoIds.push(q.id);
                        }
                    } else {
                        classifiedCount++;
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
                    let topicName = s.topic;
                    if (!topicName || String(topicName).toLowerCase() === 'null' || String(topicName).trim() === '') {
                        topicName = s.title;
                    }
                    if (!topicName || String(topicName).toLowerCase() === 'null' || String(topicName).trim() === '') {
                        topicName = "General Topic";
                    }
                    
                    const sTopic = String(topicName).toLowerCase().trim();
                    const sSubject = String(s.subject || '').toLowerCase().trim();
                    const compositeKey = `${sSubject}|${sTopic}`;

                    if (uniqueTopics.has(compositeKey)) return;
                    uniqueTopics.add(compositeKey);

                    // Check if syllabus subject is approved
                    if (s.subject && !approvedLower.includes(sSubject)) {
                        if (!subjectMismatches.includes(s.subject)) subjectMismatches.push(s.subject);
                    }
                    
                    const matchedTopics = new Set<string>();
                    const matchedQs = qData?.filter(q => {
                        const qTopic = String(q.topic || '').toLowerCase().trim();
                        const qSubject = String(q.subject || '').toLowerCase().trim();
                        
                        // Must match BOTH subject and topic exactly
                        const isMatch = qTopic === sTopic && qSubject === sSubject;
                        if (isMatch && qTopic) matchedTopics.add(q.topic);
                        return isMatch;
                    }) || [];

                    gapReport.push({ 
                        id: s.id, 
                        topic: topicName, 
                        count: matchedQs.length, 
                        subject: s.subject, 
                        matchedTopics: Array.from(matchedTopics) 
                    });
                });

                return res.status(200).json({ 
                    syllabusReport: gapReport.sort((a, b) => a.count - b.count), 
                    totalQuestions,
                    unclassifiedCount,
                    classifiedCount,
                    normalizationTodoCount: normalizationTodoIds.length,
                    repairTodoCount: repairTodoIds.length,
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
