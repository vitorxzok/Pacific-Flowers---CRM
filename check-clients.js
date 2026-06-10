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
  const { data, error } = await supabase.from('clientes').select('id, name, phone').ilike('name', '%Erro%');
  if (error) return console.error(error);
  console.log('Ilike Erro:', data);
  
  const { data: data2 } = await supabase.from('clientes').select('id, name, phone').eq('name', '');
  console.log('Empty name:', data2);

  const { data: data3 } = await supabase.from('clientes').select('id, name, phone').is('name', null);
  console.log('Null name:', data3);
}
check();
