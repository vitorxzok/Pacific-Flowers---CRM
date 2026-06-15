const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const serviceKey = keyMatch[1].trim();
const url = urlMatch[1].trim() + '/auth/v1/admin/users';

async function logAll() {
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey }});
  const data = await res.json();
  let str = '';
  for (const user of data.users) {
    const prompt = user.user_metadata?.crm_settings?.systemPrompt || '';
    if (prompt) {
      str += '\n--- USER ' + user.id + ' ---\n';
      const start = prompt.indexOf('LOJISTA (FLUXO PRINCIPAL)');
      const end = prompt.indexOf('PASSO A PASSO');
      if (start > -1 && end > -1) {
        str += prompt.substring(start, end);
      } else {
        str += 'Could not slice, showing part: ' + prompt.substring(0, 200);
      }
    }
  }
  fs.writeFileSync('prompt_check.txt', str);
}
logAll();
