const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkUnanswered() {
  const { data: clients } = await supabase
    .from('clientes')
    .select('id, name, phone, ai_enabled, status')
    .eq('ai_enabled', true)
    .order('updated_at', { ascending: false })
    .limit(30);

  for (const c of clients) {
    const { data: msgs } = await supabase
      .from('mensagens')
      .select('sender, timestamp, text')
      .eq('client_id', c.id)
      .order('timestamp', { ascending: false })
      .limit(3);
      
    if (msgs && msgs.length > 0 && msgs[0].sender === 'client') {
      const timeDiff = new Date().getTime() - new Date(msgs[0].timestamp).getTime();
      const diffMins = Math.floor(timeDiff / 60000);
      if (diffMins > 1) {
        console.log('UNANSWERED -> Client: ' + c.name + ' (' + c.phone + ') - ' + diffMins + ' mins ago. Msg: ' + msgs[0].text);
      }
    }
  }
}
checkUnanswered();
