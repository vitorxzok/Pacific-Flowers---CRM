const fs = require('fs');
const url = 'https://nkvesifvkyjbicnqefco.supabase.co/auth/v1/admin/users';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rdmVzaWZ2a3lqYmljbnFlZmNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA3ODAxNSwiZXhwIjoyMDk1NjU0MDE1fQ.PHgrbW8kAreNiPKeIMb_9n1BvF6r5beBoFmOMvpT7as';

fetch(url, {
  headers: {
    'apikey': serviceKey,
    'Authorization': 'Bearer ' + serviceKey
  }
}).then(r => r.json()).then(data => {
  const user = data.users.find(u => u.email === 'vendas01@pacificflowers.com.br') || data.users[0];
  const prompt = user.user_metadata.crm_settings.systemPrompt;
  
  // Update openai.ts
  let openaiCode = fs.readFileSync('src/lib/openai.ts', 'utf8');
  // Need to replace the contents inside getSystemPrompt returning the default prompt
  // In openai.ts the string starts at 'Você é a atendente virtual da Pacific Flowers' and ends at '- Encaminhamento para fechamento com atendimento humano.`'
  
  const openaiStart = openaiCode.indexOf('Você é a atendente virtual da Pacific Flowers.');
  const openaiEnd = openaiCode.indexOf('- Encaminhamento para fechamento com atendimento humano.`;') + '- Encaminhamento para fechamento com atendimento humano.'.length;
  
  if (openaiStart !== -1 && openaiEnd !== -1) {
    openaiCode = openaiCode.substring(0, openaiStart) + prompt + openaiCode.substring(openaiEnd);
    fs.writeFileSync('src/lib/openai.ts', openaiCode);
    console.log('openai.ts updated');
  } else {
    console.log('Failed to find replacement points in openai.ts');
  }

  // Update page.tsx
  let pageCode = fs.readFileSync('src/app/admin/page.tsx', 'utf8');
  const pageStart = pageCode.indexOf('setSystemPrompt(`Você é a atendente virtual da Pacific Flowers.');
  const pageEnd = pageCode.indexOf('- Encaminhamento para fechamento com atendimento humano.`);', pageStart) + '- Encaminhamento para fechamento com atendimento humano.'.length;
  
  if (pageStart !== -1 && pageEnd !== -1) {
    pageCode = pageCode.substring(0, pageStart + 'setSystemPrompt(`'.length) + prompt + pageCode.substring(pageEnd);
    fs.writeFileSync('src/app/admin/page.tsx', pageCode);
    console.log('page.tsx updated');
  } else {
    console.log('Failed to find replacement points in page.tsx');
  }
  
}).catch(console.error);
