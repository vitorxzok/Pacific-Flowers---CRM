import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nkvesifvkyjbicnqefco.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rdmVzaWZ2a3lqYmljbnFlZmNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA3ODAxNSwiZXhwIjoyMDk1NjU0MDE1fQ.PHgrbW8kAreNiPKeIMb_9n1BvF6r5beBoFmOMvpT7as';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: usersData, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error(error);
    return;
  }
  
  if (usersData?.users) {
    for (const u of usersData.users) {
      const settings = u.user_metadata?.crm_settings;
      if (settings?.attachments && settings.attachments.length > 0) {
        console.log(`User ${u.email}:`);
        console.log(JSON.stringify(settings.attachments, null, 2));
      }
    }
  }
}

run().catch(console.error);
