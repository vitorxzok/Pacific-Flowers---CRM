import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usamos o supabase-js diretamente aqui para poder injetar a SERVICE_ROLE_KEY se disponível,
// pois webhooks não possuem cookies de sessão do usuário (bypassa RLS).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Webhook WhatsApp recebido:', JSON.stringify(body, null, 2));

    // Apenas nos importamos com upsert de mensagens (novas mensagens recebidas)
    if (body.event === 'messages-upsert' || body.event === 'messages.upsert') {
      const data = body.data;
      
      // A chave (key) contém informações de quem enviou
      const key = data?.key;
      const messageObj = data?.message;

      // Identificar quem enviou a mensagem
      const isFromMe = key?.fromMe || false;

      // Extrair telefone (remover @s.whatsapp.net ou @c.us)
      const remoteJid = key?.remoteJid || '';
      const phone = remoteJid.split('@')[0];

      // Extrair o texto da mensagem
      const text = 
        messageObj?.conversation || 
        messageObj?.extendedTextMessage?.text || 
        '';

      if (!phone || !text) {
        return NextResponse.json({ success: true, message: 'Payload sem texto ou telefone.' });
      }

      let clientId;

      // 1. Procurar o cliente no banco pelo telefone (usando os últimos 8 dígitos para ignorar o nono dígito)
      const last8Digits = phone.slice(-8);
      const { data: clients, error: clientError } = await supabase
        .from('clientes')
        .select('id, phone, status, ai_enabled')
        .ilike('phone', `%${last8Digits}`)
        .limit(1);

      if (clientError || !clients || clients.length === 0) {
        if (isFromMe) {
           return NextResponse.json({ success: true, message: 'Mensagem própria para lead inexistente ignorada.' });
        }
        console.warn(`Cliente não encontrado para o telefone: ${phone}. Criando novo lead...`);
        
        // Extrair o ID do usuário (vendedor) a partir do nome da instância
        const instanceName = body.instance || '';
        const sellerId = instanceName.replace('user_', '');
        const pushName = data?.pushName || `Lead WhatsApp (${phone})`;

        const { data: newClient, error: createError } = await supabase
          .from('clientes')
          .insert({
            name: pushName,
            phone: phone,
            status: 'Novo',
            attendant_id: sellerId
          })
          .select()
          .single();

        if (createError || !newClient) {
          console.error("Erro ao criar novo lead automaticamente:", createError);
          return NextResponse.json({ error: 'Erro ao criar lead' }, { status: 500 });
        }
        
        clientId = newClient.id;
        console.log(`Novo lead criado com ID: ${clientId}`);
      } else {
        clientId = clients[0].id;
        
        // Se a mensagem for do cliente, atualizamos followup_sent
        if (!isFromMe) {
          const { error: updateError } = await supabase
            .from('clientes')
            .update({ followup_sent: false, updated_at: new Date().toISOString() })
            .eq('id', clientId);

          if (updateError) {
            console.error('Erro ao atualizar cliente:', updateError);
          }
        }
      }

      // 2. Inserir a mensagem na tabela `mensagens`
      const { error: insertError } = await supabase
        .from('mensagens')
        .insert({
          client_id: clientId,
          text: text,
          sender: isFromMe ? 'attendant' : 'client',
          read: isFromMe
        });

      if (insertError) {
        console.error('Erro ao salvar mensagem no banco:', insertError);
        return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 });
      }

      // 3. LÓGICA DE INTELIGÊNCIA ARTIFICIAL (AUTO-REPLY E ANÁLISE SILENCIOSA)
      const { data: config } = await supabase.from('configuracoes').select('auto_reply_enabled').eq('id', 1).single();
      const { data: clientData } = await supabase.from('clientes').select('status, ai_enabled').eq('id', clientId).single();

      const autoReplyStatuses = ['Novo', 'Contato Feito', 'Em Qualificação', 'Qualificado', 'Apresentação', 'Proposta Enviada'];
      const isAutoReplyStage = autoReplyStatuses.includes(clientData?.status);
      const isAIEnabled = clientData?.ai_enabled !== false;

      // Importar funções do OpenAI
      const { generateAIResponse, analyzeConversationAndMoveStatus } = await import('@/lib/openai');

      if (!isFromMe && config?.auto_reply_enabled && isAIEnabled && isAutoReplyStage) {
        // --- FLUXO 1: RESPOSTA AUTOMÁTICA DA IA ---
        console.log(`[AI] Gerando resposta para o cliente ${clientId}...`);
        const aiReply = await generateAIResponse(clientId, supabase);

        if (aiReply) {
          await supabase.from('mensagens').insert({
            client_id: clientId,
            text: aiReply,
            sender: 'attendant',
            read: true
          });

          if (clientData?.status === 'Novo') {
            await supabase.from('clientes').update({ status: 'Contato Feito' }).eq('id', clientId);
          }

          const apiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL || '';
          const apiKey = process.env.EVOLUTION_API_KEY || process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || '';
          const instanceName = body.instance || '';

          if (apiUrl && apiKey && instanceName) {
            try {
              await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                body: JSON.stringify({ number: phone, text: aiReply })
              });
              console.log(`[AI] Resposta enviada com sucesso para ${phone}`);
            } catch (err) {
              console.error('[AI] Erro ao enviar resposta via Evolution API:', err);
            }
          }
        }
      } else if (!isAutoReplyStage || !isAIEnabled) {
        // --- FLUXO 2: ANÁLISE SILENCIOSA DO FUNIL (QUANDO HUMANO ASSUMIU OU IA DESATIVADA) ---
        // A IA apenas lerá o contexto para ver se avança o Kanban (Apresentação, Negociação, etc.)
        // Executamos de forma assíncrona para não travar o webhook
        analyzeConversationAndMoveStatus(clientId, supabase).catch(err => {
          console.error('[AI Silent] Erro na análise silenciosa:', err);
        });
      }

      return NextResponse.json({ success: true, message: 'Mensagem processada com sucesso!' });
    }

    return NextResponse.json({ success: true, message: 'Evento ignorado' });

  } catch (error: any) {
    console.error('Erro ao processar webhook:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
