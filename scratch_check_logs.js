const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkLogs() {
  const { data: logs, error } = await supabase
    .from('webhook_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) console.error(error);
  else console.log("Recent webhook logs:", logs.map(l => ({ id: l.id, created_at: l.created_at, payload: JSON.stringify(l.payload).substring(0, 100) })));
  
  // also get logs from another table if there's an error log table? Or messages table?
  const { data: msgs } = await supabase
    .from('mensagens')
    .select('id, client_id, text, sender, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log("Recent messages:", msgs);
}
checkLogs();
