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

async function check() {
  const { data, error } = await supabase.from('clientes').select('status');
  if (error) return console.error(error);
  
  const counts = {};
  data.forEach(c => {
    counts[c.status] = (counts[c.status] || 0) + 1;
  });
  console.log('Statuses:', counts);
}
check();
