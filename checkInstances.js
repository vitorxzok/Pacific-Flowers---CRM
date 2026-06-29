async function test() {
  const apiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL;
  const apiKey = process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || process.env.EVOLUTION_API_KEY;
  try {
    const res = await fetch(apiUrl + '/instance/fetchInstances', {
      headers: { apikey: apiKey }
    });
    const data = await res.json();
    for (const i of data) {
       console.log(i.instance.instanceName, i.instance.status);
       const whRes = await fetch(apiUrl + '/webhook/find/' + i.instance.instanceName, { headers: { apikey: apiKey } });
       const whData = await whRes.json();
       console.log('  Webhook URL:', whData.webhook?.url || 'NONE');
    }
  } catch(e) { console.log(e); }
}
test();
