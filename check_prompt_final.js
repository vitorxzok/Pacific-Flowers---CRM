const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const serviceKey = keyMatch[1].trim();
const url = urlMatch[1].trim() + '/auth/v1/admin/users';

async function check() {
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey }});
  const data = await res.json();
  const user = data.users.find(u => u.id === 'e9b95e91-eac3-45d3-ac12-f604b10384be');
  console.log(user.user_metadata?.crm_settings?.systemPrompt);
}
check();
