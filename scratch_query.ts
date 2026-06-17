import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching recent clients...");
  const { data: clients } = await supabase.from('clientes').select('*').order('created_at', { ascending: false }).limit(5);
  
  for (const c of clients || []) {
    console.log(`\nClient: ${c.name} (ID: ${c.id}) - Status: ${c.status}`);
    const { data: msgs } = await supabase.from('mensagens').select('*').eq('client_id', c.id).order('timestamp', { ascending: true }).limit(20);
    for (const m of msgs || []) {
      console.log(`[${m.sender}] ${m.text}`);
    }
  }
}

run().catch(console.error);
