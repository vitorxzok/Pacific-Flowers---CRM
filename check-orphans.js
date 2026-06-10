const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim().replace(/^"|"$/g, '');
const SUPABASE_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim().replace(/^"|"$/g, '');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
(async () => {
  const { data: clients } = await supabase.from('clientes').select('id, name, phone, attendant_id, created_at').is('attendant_id', null).order('created_at', { ascending: false }).limit(10);
  console.log('Orphan clients:', clients);
})();
