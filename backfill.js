require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching all clients...");
  const { data: clients, error: clientsErr } = await supabase
    .from('clientes')
    .select('id, created_at, last_message_at')
    .neq('status', 'SYSTEM');

  if (clientsErr) {
    console.error("Error fetching clients", clientsErr);
    return;
  }

  console.log(`Found ${clients.length} clients. Processing...`);

  let count = 0;
  for (const client of clients) {
    if (client.last_message_at) continue; // skip already processed

    const { data: msgs, error: msgsErr } = await supabase
      .from('mensagens')
      .select('timestamp')
      .eq('client_id', client.id)
      .order('timestamp', { ascending: false })
      .limit(1);

    if (msgs && msgs.length > 0) {
      const lastMsgDate = msgs[0].timestamp;
      await supabase
        .from('clientes')
        .update({ last_message_at: lastMsgDate })
        .eq('id', client.id);
      console.log(`Updated client ${client.id} with last_message_at: ${lastMsgDate}`);
    } else {
      // If no messages, set last_message_at to created_at
      await supabase
        .from('clientes')
        .update({ last_message_at: client.created_at })
        .eq('id', client.id);
      console.log(`Updated client ${client.id} with created_at as fallback`);
    }
    
    count++;
    if (count % 10 === 0) console.log(`Processed ${count} clients...`);
  }
  
  console.log("Finished!");
}

run();
