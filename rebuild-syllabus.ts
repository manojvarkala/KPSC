import * as dotenv from 'dotenv';
dotenv.config();

import { supabase } from './api/_lib/supabase-service.js';
import { generateSyllabusForExam } from './api/_lib/scraper-service.js';

async function run() {
    console.log("Starting syllabus rebuild...");
    
    if (!supabase) {
        console.error("Supabase not initialized. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment variables.");
        return;
    }

    console.log("Fetching exams from Supabase...");
    const { data: exams, error } = await supabase.from('exams').select('id, title_en, level');
    
    if (error) {
        console.error("Error fetching exams from Supabase:", error.message);
        return;
    }

    if (!exams || exams.length === 0) {
        console.log("No exams found in Supabase.");
        return;
    }

    console.log(`Processing ${exams.length} exams...`);
    
    for (const exam of exams) {
        console.log(`Generating syllabus for: ${exam.title_en || exam.id}`);
        try {
            const syllabus = await generateSyllabusForExam(exam);
            if (syllabus && syllabus.length > 0) {
                console.log(`  Generated and saved ${syllabus.length} topics.`);
            }
        } catch (err) {
            console.error(`  Error processing ${exam.id}:`, err);
        }
    }

    console.log("Syllabus rebuild complete.");
}

run().catch(console.error);
