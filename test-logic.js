const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
(async () => {
  const { data: config } = await supabase.from('configuracoes').select('*').eq('id', 1).single();
  console.log('Configuracoes:', config);
  
  const autoReplyStatuses = ['Novo', 'Contato Feito', 'Em Qualificação', 'Qualificado', 'Apresentação', 'Proposta Enviada'];
  const { data: clientes } = await supabase
        .from('clientes')
        .select('id, name, phone, attendant_id, status, followup_sent, ai_enabled')
        .in('status', autoReplyStatuses)
        .eq('followup_sent', false)
        .eq('ai_enabled', true);
        
  console.log('Clientes elegíveis para followup rapido:', clientes?.length);
  
  if (!clientes) return;

  for (const client of clientes) {
      const { data: lastMessage } = await supabase
          .from('mensagens')
          .select('sender, timestamp')
          .eq('client_id', client.id)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();
          
      if (lastMessage && lastMessage.sender === 'attendant') {
          const messageTime = new Date(lastMessage.timestamp).getTime();
          const now = new Date().getTime();
          const diffMinutes = (now - messageTime) / (1000 * 60);
          console.log('- Cliente', client.name, 'DiffMinutes:', diffMinutes.toFixed(2), 'Minutes needed:', config.minutes_without_response);
          if (diffMinutes >= config.minutes_without_response) {
            console.log('=> DEVERIA DISPARAR!');
          }
      } else {
          console.log('- Cliente', client.name, 'LastSender:', lastMessage?.sender);
      }
  }
})();
