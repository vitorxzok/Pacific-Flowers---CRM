const { createClient } = require('@supabase/supabase-js');


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runReactivation() {
  console.log("Iniciando varredura de reativação...");
  
  // 1. Busca todos os clientes com status ativos
  const activeStatuses = ['Novo', 'Contato Feito', 'Em Qualificação', 'Proposta Enviada'];
  
  const { data: clients, error: clientsError } = await supabase
    .from('clientes')
    .select('id, name, status, insistencia_count')
    .in('status', activeStatuses)
    .eq('ai_enabled', true);

  if (clientsError) {
    console.error("Erro ao buscar clientes:", clientsError);
    process.exit(1);
  }

  console.log(`Encontrados ${clients.length} clientes ativos na base.`);
  let resetCount = 0;

  for (const client of clients) {
    // 2. Verifica a última mensagem desse cliente
    const { data: lastMessage, error: msgError } = await supabase
      .from('mensagens')
      .select('sender, timestamp')
      .eq('client_id', client.id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (msgError && msgError.code !== 'PGRST116') {
      console.error(`Erro ao buscar mensagens do cliente ${client.id}:`, msgError);
      continue;
    }

    // 3. Se a última mensagem for nossa (attendant) e fizer mais de 24h
    if (lastMessage && lastMessage.sender === 'attendant') {
      const messageTime = new Date(lastMessage.timestamp).getTime();
      const now = new Date().getTime();
      const diffHours = (now - messageTime) / (1000 * 60 * 60);

      if (diffHours >= 24) {
        // Zera o insistencia_count
        const { error: updateError } = await supabase
          .from('clientes')
          .update({ insistencia_count: 0 })
          .eq('id', client.id);

        if (updateError) {
          console.error(`Erro ao resetar insistencia do cliente ${client.id}:`, updateError);
        } else {
          console.log(`[SUCESSO] Contador resetado para o cliente ${client.name} (Inativo há ${Math.round(diffHours)}h).`);
          resetCount++;
        }
      }
    }
  }

  console.log(`\nVarredura concluída! ${resetCount} clientes foram inseridos novamente na cadência de 10 passos.`);
}

runReactivation();
