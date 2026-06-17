import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vqqofngkofjowzrcmndq.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function main() {
  const { data: instances, error } = await supabase.from('whatsapp_instances').select('*').limit(5);
  console.log('Instances:', instances);
  if (error) console.error('Error:', error);
}

main();
