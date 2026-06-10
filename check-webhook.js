const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const EVOLUTION_API_URL = env.match(/EVOLUTION_API_URL=(.*)/)[1].trim().replace(/^"|"$/g, '');
const EVOLUTION_API_KEY = env.match(/EVOLUTION_API_KEY=(.*)/)[1].trim().replace(/^"|"$/g, '');
(async () => {
  const instanceName = 'user_305ce3a3-1de2-4a55-bdb9-7ec0f832e89d';
  try {
    const res = await fetch(`${EVOLUTION_API_URL}/webhook/find/${instanceName}`, {
      headers: { 'apikey': EVOLUTION_API_KEY }
    });
    const data = await res.json();
    console.log('Webhook info:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
})();
