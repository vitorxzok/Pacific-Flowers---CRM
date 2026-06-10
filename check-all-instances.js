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
    const res = await fetch(`${API_URL}/instance/fetchInstances`, {
      headers: { apikey: API_KEY }
    });
    const instances = await res.json();
    console.log("Found", instances.length, "instances.");
    for (const inst of instances) {
      // API seems to return an array of objects which ARE the instances directly, not `{ instance: { ... } }`
      const name = inst.instanceName || inst.name;
      const status = inst.status;
      const state = inst.state || inst.connectionStatus;
      console.log(`- ${name} (Status: ${status}, State: ${state})`);
      
      const whRes = await fetch(`${API_URL}/webhook/find/${name}`, {
        headers: { apikey: API_KEY }
      });
      const whData = await whRes.json();
      console.log(`  Webhook enabled: ${whData.enabled}, url: ${whData.url}, events: ${whData.events?.join(',')}`);
    }
  } catch(e) {
    console.error(e);
  }
}
checkEvolution();
