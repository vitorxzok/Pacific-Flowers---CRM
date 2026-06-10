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
const apiUrl = env['NEXT_PUBLIC_EVOLUTION_API_URL'] || env['EVOLUTION_API_URL'];
const apiKey = env['NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY'] || env['EVOLUTION_API_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- 1. Check DEBUG LOG ---');
  const { data: dbg } = await supabase.from('clientes').select('id, name').ilike('name', '%DEBUG%');
  console.log('DEBUG clients:', dbg);
  if (dbg && dbg.length > 0) {
    for (let c of dbg) {
      await supabase.from('clientes').delete().eq('id', c.id);
      console.log('Deleted:', c.name);
    }
  }

  console.log('\n--- 2. Fetch Fabio User ID ---');
  const { data: users } = await supabase.from('profiles').select('id, full_name, role').ilike('full_name', '%Fabio%');
  console.log('Fabio profiles:', users);

  if (users && users.length > 0) {
    for (let user of users) {
      const instanceName = user.id;
      console.log(`\n--- Checking Instance: ${instanceName} ---`);
      
      const connRes = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
        headers: { 'apikey': apiKey }
      });
      const conn = await connRes.json();
      console.log('Connection State:', JSON.stringify(conn));

      const whRes = await fetch(`${apiUrl}/webhook/find/${instanceName}`, {
        headers: { 'apikey': apiKey }
      });
      const wh = await whRes.json();
      console.log('Webhook Config:', JSON.stringify(wh));
    }
  }
}
check();
