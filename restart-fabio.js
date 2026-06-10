const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) env[line.slice(0,idx).trim()] = line.slice(idx+1).trim().replace(/['"]/g, '');
});
const apiUrl = env['NEXT_PUBLIC_EVOLUTION_API_URL'] || env['EVOLUTION_API_URL'];
const apiKey = env['NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY'] || env['EVOLUTION_API_KEY'];

fetch(apiUrl + '/instance/restart/user_305ce3a3-1de2-4a55-bdb9-7ec0f832e89d', {
  method: 'PUT',
  headers: { 'apikey': apiKey }
}).then(r => r.text()).then(console.log).catch(console.error);
