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
  // Find the string between 'export function getSystemPrompt(clientId?: string | number, clientData?: any): string {' and '} // APÊNDICE OBRIGATÓRIO'
  const match = openaiCode.match(/export function getSystemPrompt\([\s\S]*?const toolInstructions/);
  if (match) {
    const replacement = `export function getSystemPrompt(clientId?: string | number, clientData?: any): string {
  if (clientData?.user_metadata?.crm_settings?.systemPrompt) {
    return clientData.user_metadata.crm_settings.systemPrompt;
  }

  // Se não houver prompt customizado, usa o padrão abaixo:
  if (clientId && clientData?.name) {
    return \`${prompt}\`.replace(/NOME/g, clientData.name);
  } else {
    return \`${prompt}\`;
  }

  const clientIdStr = clientId?.toString() || '';
  const currentStatus = (clientData as any)?.status || 'Aberto';

  // `;
    
    openaiCode = openaiCode.replace(match[0], replacement + 'const toolInstructions');
    fs.writeFileSync('src/lib/openai.ts', openaiCode);
  }

  // Update page.tsx
  let pageCode = fs.readFileSync('src/app/admin/page.tsx', 'utf8');
  const pageMatch = pageCode.match(/setSystemPrompt\(\`[\s\S]*?\`\);/);
  if (pageMatch) {
    pageCode = pageCode.replace(pageMatch[0], `setSystemPrompt(\`${prompt}\`);`);
    fs.writeFileSync('src/app/admin/page.tsx', pageCode);
  }
  
  console.log('Successfully updated code with the latest prompt from DB');
}).catch(console.error);
