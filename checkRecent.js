const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function recent() {
  const { data: msgs } = await supabase
    .from('mensagens')
    .select('client_id, text, timestamp, sender')
    .order('timestamp', { ascending: false })
    .limit(50);
  
  const clientMsgs = msgs.filter(m => m.sender === 'client');
  for (const m of clientMsgs) {
     const { data: client } = await supabase.from('clientes').select('name, phone').eq('id', m.client_id).single();
     console.log(client.name + ' (' + client.phone + '): ' + m.text + ' [' + m.timestamp + ']');
  }
}
recent();
