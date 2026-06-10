const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) env[line.slice(0,idx).trim()] = line.slice(idx+1).trim().replace(/['"]/g, '');
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAll() {
  while (true) {
    const { data: clients } = await supabase.from('clientes').select('id').eq('name', 'DEBUG LOG').limit(100);
    if (!clients || clients.length === 0) {
      console.log('All DEBUG LOGs deleted');
      break;
    }
    const ids = clients.map(c => c.id);
    await supabase.from('clientes').delete().in('id', ids);
    console.log(`Deleted ${ids.length} DEBUG LOGs`);
  }
}
deleteAll();
