import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
  const { data: clients } = await supabase.from('clientes').select('*').limit(1);
  if (!clients || clients.length === 0) return console.log('No clients');
  
  const clientId = clients[0].id;
  console.log('Testing generateAIResponse for client:', clientId);
  
  // mock generateAIResponse locally
  const { generateAIResponse } = require('./src/lib/openai');
  const result = await generateAIResponse(clientId, supabase, undefined, {});
  console.log('Result:', result);
}

run().catch(console.error);
