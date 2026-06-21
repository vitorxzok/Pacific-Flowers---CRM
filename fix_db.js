const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length) {
    env[key.trim()] = value.join('=').trim().replace(/(^"|"$)/g, '');
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function run() {
  const getRes = await fetch(`${supabaseUrl}/rest/v1/global_settings?id=eq.1&select=id,system_prompt`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const data = await getRes.json();
  
  if (data && data.length > 0 && data[0].system_prompt) {
    let newPrompt = data[0].system_prompt;
    
    // Replace old prompt text with the new one asking for quantities
    newPrompt = newPrompt.replace(
      'Os produtos são vendidos em múltiplos de 12 unidades, ok.',
      'Os produtos são vendidos em múltiplos de 12 unidades. Você pode me passar os códigos ou nome dos produtos, bem como as quantidades para cada um dos produtos, como ficar melhor para você, ok?'
    );
    
    const updateRes = await fetch(`${supabaseUrl}/rest/v1/global_settings?id=eq.1`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ system_prompt: newPrompt })
    });
    
    console.log('Updated DB Prompt text. Status:', updateRes.status);
  } else {
    console.log('No global prompt found.');
  }
}
run();
