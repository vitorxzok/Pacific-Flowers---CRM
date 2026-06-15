const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const serviceKey = keyMatch[1].trim();
const url = urlMatch[1].trim() + '/auth/v1/admin/users';

async function updateAllUsers() {
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey }});
  const data = await res.json();
  
  for (const user of data.users) {
    const crmSettings = user.user_metadata?.crm_settings || {};
    const prompt = crmSettings.systemPrompt;
    if (prompt && prompt.includes("(INSTRUÇÃO DE SISTEMA: Chame a ferramenta 'sendAttachment'")) {
      let newPrompt = prompt.replace(
        /\(INSTRUÇÃO DE SISTEMA: Chame a ferramenta 'sendAttachment' com gatilho 'CATALOGO' nesta etapa\. NUNCA escreva no texto a ação de enviar, o cliente não pode ver comandos de sistema\.\)/g,
        "(ENVIAR CATÁLOGO)"
      );
      
      if (prompt !== newPrompt) {
        console.log(`[REVERT FINAL] Alterando prompt para o user ${user.id}`);
        const updateRes = await fetch(`${url}/${user.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_metadata: {
              ...user.user_metadata,
              crm_settings: {
                ...crmSettings,
                systemPrompt: newPrompt
              }
            }
          })
        });
        if (!updateRes.ok) console.error("Error updating", await updateRes.text());
        else console.log(`Success ${user.id}`);
      }
    }
  }
}
updateAllUsers();
