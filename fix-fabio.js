const fetch = globalThis.fetch || require('node-fetch');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) env[line.slice(0,idx).trim()] = line.slice(idx+1).trim().replace(/['"]/g, '');
});

const API_URL = env['EVOLUTION_API_URL'];
const API_KEY = env['EVOLUTION_API_KEY'];

async function fixFabio() {
  const instanceName = 'user_305ce3a3-1de2-4a55-bdb9-7ec0f832e89d';
  
  // 1. Update Webhook explicitly
  console.log('Updating webhook for Fabio...');
  const whRes = await fetch(`${API_URL}/webhook/set/${instanceName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: API_KEY },
    body: JSON.stringify({
      webhook: {
        enabled: true,
        url: 'https://pacific-flowers-crm.vercel.app/api/webhook/whatsapp',
        webhookByEvents: false,
        webhookBase64: false,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE']
      }
    })
  });
  console.log('Webhook update response:', await whRes.text());

  // 2. Restart Instance
  console.log('Restarting Fabio instance...');
  const rRes = await fetch(`${API_URL}/instance/restart/${instanceName}`, {
    method: 'PUT', // or POST depending on Evolution v1/v2, v1 is PUT, wait, earlier I used POST. Let me try POST.
    headers: { apikey: API_KEY }
  });
  console.log('Restart response PUT:', await rRes.text());
  
  const rRes2 = await fetch(`${API_URL}/instance/restart/${instanceName}`, {
    method: 'POST',
    headers: { apikey: API_KEY }
  });
  console.log('Restart response POST:', await rRes2.text());
}
fixFabio();
