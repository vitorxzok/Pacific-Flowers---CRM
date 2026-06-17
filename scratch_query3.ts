import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nkvesifvkyjbicnqefco.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rdmVzaWZ2a3lqYmljbnFlZmNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA3ODAxNSwiZXhwIjoyMDk1NjU0MDE1fQ.PHgrbW8kAreNiPKeIMb_9n1BvF6r5beBoFmOMvpT7as';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: settings } = await supabase.from('global_settings').select('*').single();
  console.log("Settings:");
  console.log(JSON.stringify(settings, null, 2));
}

run().catch(console.error);
