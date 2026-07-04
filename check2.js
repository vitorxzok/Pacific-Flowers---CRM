const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(line => line && !line.startsWith('#')).map(line => line.split('=')));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data: msgs } = await supabase.from('mensagens').select('client_id').ilike('text', '%encaminho..%').order('timestamp', { ascending: false }).limit(1);
  if (msgs[0]) {
    const { data: recentMsgs } = await supabase.from('mensagens').select('*').eq('client_id', msgs[0].client_id).order('timestamp', { ascending: false }).limit(5);
    console.log(recentMsgs.map(m => `${m.timestamp} [${m.sender}] ${m.text}`));
  }
})();
