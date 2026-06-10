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

async function checkEvolution() {
  try {
    const res = await fetch(`${API_URL}/instance/connectionState/user_305ce3a3-1de2-4a55-bdb9-7ec0f832e89d`, {
      headers: { apikey: API_KEY }
    });
    const text = await res.text();
    console.log(`Status for user_305ce3a3-1de2-4a55-bdb9-7ec0f832e89d: ${text}`);

    const res2 = await fetch(`${API_URL}/instance/fetchInstances`, {
      headers: { apikey: API_KEY }
    });
    const instances = await res2.json();
    console.log("All Instances: ", instances.map(i => i.instance.instanceName));

  } catch(e) {
    console.error(e);
  }
}
checkEvolution();
