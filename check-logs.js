const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) env[line.slice(0,idx).trim()] = line.slice(idx+1).trim().replace(/['"]/g, '');
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || '';
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: dbgClient } = await supabase.from('clientes').select('id').eq('phone', '0000').limit(1).single();
  if (dbgClient) {
    const { data: msgs } = await supabase.from('mensagens').select('*').eq('client_id', dbgClient.id).order('timestamp', { ascending: false }).limit(30);
    console.log("DEBUG MESSAGES:");
    let foundFabio = false;
    msgs.forEach(m => {
      if (m.text.includes('305ce3a3')) {
        console.log(m.timestamp, m.text.substring(0, 300));
        foundFabio = true;
      }
    });
    if (!foundFabio) console.log("No messages found for Fabio's instance in the last 30 logs.");
  }
}

check();
