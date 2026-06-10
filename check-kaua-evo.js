const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) env[line.slice(0,idx).trim()] = line.slice(idx+1).trim().replace(/['"]/g, '');
});
const apiUrl = env['NEXT_PUBLIC_EVOLUTION_API_URL'] || env['EVOLUTION_API_URL'];
const apiKey = env['NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY'] || env['EVOLUTION_API_KEY'];

fetch(apiUrl + '/instance/fetchInstances', { headers: { 'apikey': apiKey } })
  .then(res => res.json())
  .then(async instances => {
    for (const inst of instances) {
      if (inst.name.includes('7474e18d')) {
        console.log("KAUA INSTANCE:", inst.name, "Status:", inst.connectionStatus);
        const whRes = await fetch(apiUrl + '/webhook/find/' + inst.name, { headers: { 'apikey': apiKey } });
        const wh = await whRes.json();
        console.log("Kaua Webhook config:", JSON.stringify(wh, null, 2));
      }
    }
  })
  .catch(console.error);
