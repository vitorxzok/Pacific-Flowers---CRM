const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    envVars[key.trim()] = values.join('=').trim().replace(/^"|"$/g, '');
  }
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
      .from('clientes')
      .select('id, name, mensagens(id, text, timestamp)')
      .order('timestamp', { foreignTable: 'mensagens', ascending: false })
      .limit(1, { foreignTable: 'mensagens' })
      .limit(3);
      
  console.log(JSON.stringify(data, null, 2));
  if (error) console.error(error);
}
run();
