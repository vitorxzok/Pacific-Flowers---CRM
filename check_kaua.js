import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vqqofngkofjowzrcmndq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxcW9mbmdrb2Zqb3d6cmNtbmRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNzUzNjUzNSwiZXhwIjoyMDMzMTEyNTM1fQ.vSihNlG2lC10gHntG8o8oDMBdWeJ93O2V7i21s1gT2E'
);

async function main() {
  const { data: clients } = await supabase.from('clientes').select('id, name, phone, status, needs_human, attendant_id').eq('attendant_id', '7474e18d-4ec6-4cd9-b105-35a812f4e0cd').order('updated_at', { ascending: false }).limit(2);
  console.log('Last Kaua clients:', clients);

  const { data: instances } = await supabase.from('whatsapp_instances').select('id, instance_name, status').eq('user_id', '7474e18d-4ec6-4cd9-b105-35a812f4e0cd');
  console.log('Kaua instances:', instances);
}

main();
