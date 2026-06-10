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

async function checkWebhook() {
  try {
    const res = await fetch(`${API_URL}/webhook/find/user_305ce3a3-1de2-4a55-bdb9-7ec0f832e89d`, {
      headers: { apikey: API_KEY }
    });
    const data = await res.json();
    console.log(`Webhook config for Fabio:`, JSON.stringify(data, null, 2));
  } catch(e) {
    console.error(e);
  }
}
checkWebhook();
