import dotenv from 'dotenv';
dotenv.config();
import { supabase } from './api/_lib/supabase-service.js';
async function test() {
  if (!supabase) { console.log("No supabase"); return; }
  const { data, error } = await supabase.from('questionbank').select('micro_topic').limit(1);
  console.log(error ? error.message : "Column exists");
}
test();
