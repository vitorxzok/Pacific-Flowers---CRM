const url = 'https://nkvesifvkyjbicnqefco.supabase.co/auth/v1/admin/users';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rdmVzaWZ2a3lqYmljbnFlZmNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA3ODAxNSwiZXhwIjoyMDk1NjU0MDE1fQ.PHgrbW8kAreNiPKeIMb_9n1BvF6r5beBoFmOMvpT7as';

fetch(url, {
  headers: {
    'apikey': serviceKey,
    'Authorization': 'Bearer ' + serviceKey
  }
}).then(r => r.json()).then(data => {
  if (data.users && data.users.length > 0) {
    const user = data.users.find(u => u.email === 'vendas01@pacificflowers.com.br') || data.users[0];
    const currentMeta = user.user_metadata || {};
    const currentCrm = currentMeta.crm_settings || {};
    console.log("PROMPT_START\n" + currentCrm.systemPrompt + "\nPROMPT_END");
  }
}).catch(console.error);
