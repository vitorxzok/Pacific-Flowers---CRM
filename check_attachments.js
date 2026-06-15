const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const serviceKey = keyMatch[1].trim();
const url = urlMatch[1].trim() + '/auth/v1/admin/users';

async function checkAttachments() {
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey }});
  const data = await res.json();
  for (const user of data.users) {
    const atts = user.user_metadata?.crm_settings?.attachments || [];
    console.log('User', user.id, 'Attachments:', atts.map(a => a.trigger));
  }
}
checkAttachments();
