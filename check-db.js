const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) env[line.slice(0,idx).trim()] = line.slice(idx+1).trim().replace(/['"]/g, '');
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || '';
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // Check users CRM settings
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error("User error:", userError);
  } else {
    console.log("USERS:");
    users.users.forEach(u => {
      console.log(`User ${u.id}: auto_reply_enabled = ${u.user_metadata?.crm_settings?.auto_reply_enabled}`);
    });
  }

  // Check recent clients
  const { data: clients, error: clientError } = await supabase.from('clientes').select('id, name, phone, status, ai_enabled, attendant_id').order('created_at', { ascending: false }).limit(3);
  console.log("\nRECENT CLIENTS:");
  console.log(clients);
}

check();
