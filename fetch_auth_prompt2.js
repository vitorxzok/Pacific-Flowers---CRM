const url = 'https://nkvesifvkyjbicnqefco.supabase.co/auth/v1/admin/users';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rdmVzaWZ2a3lqYmljbnFlZmNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA3ODAxNSwiZXhwIjoyMDk1NjU0MDE1fQ.PHgrbW8kAreNiPKeIMb_9n1BvF6r5beBoFmOMvpT7as';

fetch(url, {
  headers: {
    'apikey': serviceKey,
    'Authorization': 'Bearer ' + serviceKey
  }
}).then(r => r.json()).then(data => {
  if (data.users) {
    for (const user of data.users) {
      if (user.user_metadata && user.user_metadata.crm_settings && user.user_metadata.crm_settings.systemPrompt) {
        console.log("Current Prompt in DB:");
        console.log(user.user_metadata.crm_settings.systemPrompt);
        break;
      }
    }
  } else {
    console.log("No users or unexpected response:", data);
  }
}).catch(console.error);
