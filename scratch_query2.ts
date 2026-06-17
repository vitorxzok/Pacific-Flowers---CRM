import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nkvesifvkyjbicnqefco.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rdmVzaWZ2a3lqYmljbnFlZmNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA3ODAxNSwiZXhwIjoyMDk1NjU0MDE1fQ.PHgrbW8kAreNiPKeIMb_9n1BvF6r5beBoFmOMvpT7as';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: msgs } = await supabase.from('mensagens')
    .select('client_id, text, timestamp, sender')
    .ilike('text', '%pacific-flowers.vercel.app%')
    .order('timestamp', { ascending: false })
    .limit(1);

  if (msgs && msgs.length > 0) {
    const clientId = msgs[0].client_id;
    console.log(`Found client: ${clientId}`);
    
    const { data: allMsgs } = await supabase.from('mensagens')
      .select('*')
      .eq('client_id', clientId)
      .order('timestamp', { ascending: false })
      .limit(10);
      
    for (const m of allMsgs.reverse() || []) {
      console.log(`[${m.sender}] ${m.text}`);
    }
  } else {
    console.log("No messages found.");
  }
}

run().catch(console.error);
