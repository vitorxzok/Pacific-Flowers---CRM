const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findUnanswered() {
  const { data: clients } = await supabase.from('clientes').select('id, name, phone, ai_enabled, status').eq('ai_enabled', true);
  for (const c of clients) {
    const { data: msgs } = await supabase.from('mensagens')
      .select('sender, timestamp, text')
      .eq('client_id', c.id)
      .order('timestamp', { ascending: false })
      .limit(2);
    if (msgs && msgs.length > 0) {
      if (msgs[0].sender === 'client') {
        const t = new Date(msgs[0].timestamp).getTime();
        const diff = (new Date().getTime() - t) / 60000;
        if (diff > 2 && diff < 60) {
          console.log(c.name + ' (' + c.phone + ') is unanswered! Msg: ' + msgs[0].text);
        }
      }
    }
  }
}
findUnanswered();
