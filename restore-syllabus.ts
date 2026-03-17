import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1];
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1];

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('syllabus').select('*');
  console.log('Current syllabus count:', data?.length);
  
  // Try to fetch from google sheet
  // Actually, I can just use the /api/admin endpoint
  try {
    const res = await fetch('http://localhost:3000/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rebuild-db' })
    });
    const result = await res.json();
    console.log('Rebuild DB result:', result);
  } catch (e) {
    console.error(e);
  }
}

run();
