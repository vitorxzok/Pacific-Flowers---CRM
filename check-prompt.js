const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim().replace(/^"|"$/g, '');
const SUPABASE_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim().replace(/^"|"$/g, '');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error(error);
    return;
  }
  
  data.users.forEach(u => {
      const prompt = u.user_metadata?.crm_settings?.systemPrompt;
      if (prompt) {
          console.log(`User ${u.id} has systemPrompt of length ${prompt.length}:`);
          console.log(prompt.substring(0, 100) + '...\n');
      }
  });
})();
