import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vqqofngkofjowzrcmndq.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxcW9mbmdrb2Zqb3d6cmNtbmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY4Mzg0MDAsImV4cCI6MjAzMjQxNDQwMH0.XXXX'; // We need the real key from .env

require('dotenv').config({ path: '.env.local' });

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: instances, error } = await supabase.from('whatsapp_instances').select('*').limit(5);
  console.log('Instances:', instances);
  console.log('Error:', error);
}

main().catch(console.error);
