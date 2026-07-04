import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(line => line && !line.startsWith('#')).map(line => line.split('=')));

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: msgs, error } = await supabase
    .from('mensagens')
    .select('*')
    .eq('client_id', '09a9dc5d-0b4a-493f-9fbe-75148b05ed46') // Fabio
    .order('timestamp', { ascending: false })
    .limit(5);
    
  if (error) console.error(error);
  else console.log(msgs.map(m => `${m.timestamp} [${m.sender}] ${m.text}`));

  const { data: clients, error: cErr } = await supabase
    .from('clientes')
    .select('id, name, status, ai_enabled, needs_human')
    .eq('id', '09a9dc5d-0b4a-493f-9fbe-75148b05ed46');
    
  if (cErr) console.error(cErr);
  else console.log(clients);
}
check();
