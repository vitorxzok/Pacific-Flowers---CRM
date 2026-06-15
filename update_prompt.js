const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    env[key.trim()] = values.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error(error);
    return;
  }

  // Find the first user with a custom systemPrompt
  let currentPrompt = '';
  for (const user of users) {
    if (user.user_metadata?.crm_settings?.systemPrompt) {
      currentPrompt = user.user_metadata.crm_settings.systemPrompt;
      break;
    }
  }

  if (!currentPrompt) {
    console.log("Nenhum prompt customizado encontrado no banco.");
    return;
  }

  console.log("Prompt atual:");
  console.log("-------------------");
  console.log(currentPrompt);
  console.log("-------------------");

  const newApproach = `ABORDAGEM INICIAL
Sua primeira mensagem para o cliente (quando for um novo atendimento) DEVE SER EXATAMENTE o texto abaixo, sem alterar, omitir ou adicionar nenhuma palavra:
"Olá, tudo bem? 😊
Seja bem-vindo à Pacific Flowers.

Para começarmos, qual é o seu nome?
Somos fabricantes, você é lojista?"

Caso o cliente responda que não é lojista, encerre o atendimento educadamente.`;

  const blocks = currentPrompt.split('---');
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].includes('ABORDAGEM INICIAL')) {
      blocks[i] = '\n' + newApproach + '\n\n';
    }
  }

  const updatedPrompt = blocks.join('---');

  console.log("Novo Prompt:");
  console.log("-------------------");
  console.log(updatedPrompt);
  console.log("-------------------");

  for (const user of users) {
    const currentSettings = user.user_metadata?.crm_settings || {};
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        crm_settings: {
          ...currentSettings,
          systemPrompt: updatedPrompt
        }
      }
    });
  }
  console.log("Atualizado para todos os usuários com sucesso.");
}

main();
