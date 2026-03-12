
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
    APPROVED_SUBJECTS
} from "./_lib/scraper-service.js";
import { auditAndCorrectQuestions } from "./_lib/audit-service.js";
import { supabase, upsertSupabaseData, deleteSupabaseRow } from "./_lib/supabase-service.js";

export default async function handler(req: any, res: any) {
    if (req.method === 'GET') {
        const authHeader = req.headers.authorization;
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'Unauthorized' });
        try {
            const result = await runDailyUpdateScrapers();
            return res.status(200).json({ message: 'Cron Success', result });
        } catch (e: any) { return res.status(500).json({ error: e.message }); }
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { action, id, resultData, sheet, data, topic, setting, questions, rowData } = req.body;

    if (action === 'save-result') {
        try {
            const resultId = resultData.id || Date.now();
            if (supabase) await upsertSupabaseData('results', [{ id: resultId, user_id: String(resultData.userId || 'guest'), user_email: String(resultData.userEmail || ''), test_title: String(resultData.testTitle || ''), score: resultData.score, total: resultData.total }]);
            await appendSheetData('Results!A1', [[resultId, resultData.userId, resultData.userEmail, resultData.testTitle, resultData.score, resultData.total, new Date().toISOString()]]);
            return res.status(200).json({ message: 'Saved' });
        } catch (e: any) { return res.status(500).json({ error: e.message }); }
    }

    try { await verifyAdmin(req); } catch (e: any) { return res.status(401).json({ error: e.message }); }

    try {
        switch (action) {
            case 'test-connection': {
                let sheetsStatus: any = { ok: false, error: null };
                let supabaseStatus: any = { ok: false, error: null };
                
                try { 
                    await readSheetData('Settings!A1:A1'); 
                    sheetsStatus.ok = true; 
                } catch (e: any) { 
                    sheetsStatus.error = e.message || "Failed to access spreadsheet";
                }

                if (supabase) {
                    try { 
                        const { error } = await supabase.from('settings').select('key').limit(1); 
                        if (error) throw error;
                        supabaseStatus.ok = true; 
                    } catch (e: any) { 
                        supabaseStatus.error = e.message || "Failed to query Supabase table";
                    }
                } else {
                    supabaseStatus.error = "SUPABASE_URL or KEY is missing from server env";
                }

                return res.status(200).json({ status: { sheets: sheetsStatus.ok, supabase: supabaseStatus.ok, sheetsErr: sheetsStatus.error, supabaseErr: supabaseStatus.error } });
            }
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
                const { data: qData } = await supabase.from('questionbank').select('topic, subject');
                
                const emptyTopics = (sData || []).filter(s => {
                    let t = s.topic;
                    if (!t || t === 'null' || t.trim() === '') t = s.title;
                    if (!t || t === 'null' || t.trim() === '') t = "Unnamed Topic";
                    
                    const sTopic = String(t).toLowerCase().trim();
                    const hasQuestions = qData?.some(q => {
                        const qTopic = String(q.topic || '').toLowerCase().trim();
                        const qSubject = String(q.subject || '').toLowerCase().trim();
                        if (qTopic === sTopic || qSubject === sTopic) return true;
                        if (sTopic.length >= 3 && (qTopic.includes(sTopic) || qSubject.includes(sTopic))) return true;
                        return false;
                    });
                    return !hasQuestions;
                }).map(s => {
                    let t = s.topic;
                    if (!t || t === 'null' || t.trim() === '') t = s.title;
                    if (!t || t === 'null' || t.trim() === '') t = "Unnamed Topic";
                    return t;
                });

                if (emptyTopics.length === 0) return res.status(200).json({ message: "No empty topics found." });
                const batch = emptyTopics.slice(0, 5);
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
                const { data: qData } = await supabase.from('questionbank').select('topic, subject');
                const { data: sData } = await supabase.from('syllabus').select('id, topic, title, subject');
                
                let unclassifiedCount = 0;
                qData?.forEach(q => { 
                    const s = String(q.subject || '').toLowerCase().trim();
                    if (s === 'other' || s.includes('manual') || s === '' || s === 'null') unclassifiedCount++;
                });

                const approvedLower = APPROVED_SUBJECTS.map(s => s.toLowerCase().trim());
                const subjectMismatches: string[] = [];
                let questionSubjectMismatches = 0;

                qData?.forEach(q => { 
                    const s = String(q.subject || '').trim();
                    if (s === 'other' || s.includes('manual') || s === '' || s === 'null') {
                        unclassifiedCount++;
                    } else if (!approvedLower.includes(s.toLowerCase())) {
                        questionSubjectMismatches++;
                        if (!subjectMismatches.includes(s)) subjectMismatches.push(s);
                    }
                });

                const gapReport = (sData || []).map(s => {
                    let topicName = s.topic;
                    if (!topicName || String(topicName).toLowerCase() === 'null' || String(topicName).trim() === '') {
                        topicName = s.title;
                    }
                    if (!topicName || String(topicName).toLowerCase() === 'null' || String(topicName).trim() === '') {
                        topicName = "General Topic";
                    }
                    
                    const sTopic = String(topicName).toLowerCase().trim();
                    const sSubject = String(s.subject || '').trim();

                    if (sSubject && !approvedLower.includes(sSubject.toLowerCase().trim())) {
                        if (!subjectMismatches.includes(sSubject)) subjectMismatches.push(sSubject);
                    }
                    
                    // Robust matching: Exact match or partial match for meaningful topics
                    const count = qData?.filter(q => {
                        const qTopic = String(q.topic || '').toLowerCase().trim();
                        const qSubject = String(q.subject || '').toLowerCase().trim();
                        
                        if (qTopic === sTopic || qSubject === sTopic) return true;
                        
                        // If syllabus topic is "Computer", match "Computer Science / IT / Cyber Laws"
                        if (sTopic.length >= 3) {
                            if (qTopic.includes(sTopic) || qSubject.includes(sTopic)) return true;
                            if (sTopic.includes(qTopic) && qTopic.length >= 3) return true;
                        }
                        return false;
                    }).length || 0;

                    return { id: s.id, topic: topicName, count, subject: s.subject };
                });

                return res.status(200).json({ 
                    syllabusReport: gapReport, 
                    unclassifiedCount,
                    questionSubjectMismatches,
                    subjectMismatches,
                    approvedSubjects: APPROVED_SUBJECTS
                });
            }
            case 'delete-row': await deleteRowById(sheet, id); if (supabase) await deleteSupabaseRow(sheet, id); return res.status(200).json({ message: 'Item deleted.' });
            default: return res.status(400).json({ error: 'Invalid Action' });
        }
    } catch (e: any) { return res.status(500).json({ error: e.message }); }
}
