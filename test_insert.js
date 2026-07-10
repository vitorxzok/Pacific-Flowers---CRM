const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n');
let supabaseUrl = '';
let supabaseKey = '';
env.forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('whatsapp_instances').insert({
    id: '00000000-0000-0000-0000-000000000000',
    user_id: '00000000-0000-0000-0000-000000000000',
    instance_name: 'SYSTEM_SETTINGS',
    phone_number: '{"admin_password":"Pacific_adm"}'
  });
  console.log('insert error:', error);
}
run();
