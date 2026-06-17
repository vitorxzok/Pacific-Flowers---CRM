import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data: msgs, error } = await supabase.from('mensagens').select('text, sender, created_at, client_id, clientes(name, status, needs_human, ai_enabled)').order('created_at', { ascending: false }).limit(10);
  if (error) console.error(error);
  console.log('Last messages:', JSON.stringify(msgs, null, 2));
}

main();
