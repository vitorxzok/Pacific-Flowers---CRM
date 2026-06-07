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

    // -- INÍCIO DO LOG --
    try {
      await supabase.from('clientes').insert({ name: 'DEBUG LOG', phone: '0000', status: 'Novo' });
      const { data: dbgClient } = await supabase.from('clientes').select('id').eq('phone', '0000').limit(1).single();
      if (dbgClient) {
        await supabase.from('mensagens').insert({ client_id: dbgClient.id, text: JSON.stringify(body).substring(0, 5000), sender: 'client', read: false });
      }
    } catch (e) {
      console.error(e);
    }
    // -- FIM DO LOG --

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
      let text = 
        messageObj?.conversation || 
        messageObj?.extendedTextMessage?.text || 
        '';

      if (!text) {
        if (messageObj?.imageMessage) text = messageObj.imageMessage.caption || '[Imagem]';
        else if (messageObj?.audioMessage) text = '[Áudio]';
        else if (messageObj?.videoMessage) text = messageObj.videoMessage.caption || '[Vídeo]';
        else if (messageObj?.documentMessage) text = messageObj.documentMessage.fileName || '[Documento]';
        else if (messageObj?.stickerMessage) text = '[Figurinha]';
        else if (messageObj?.contactMessage) text = '[Contato]';
        else if (messageObj?.locationMessage) text = '[Localização]';
      }

      if (!phone || !text) {
        return NextResponse.json({ success: true, message: 'Payload sem texto ou telefone.' });
      }

      // Extrair o ID do usuário (vendedor) a partir do nome da instância
      const instanceName = body.instance || '';
      let sellerId: string | null = instanceName.replace('user_', '');

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(sellerId)) {
        console.warn(`Instância não utiliza formato UUID: ${instanceName}. O attendant_id será nulo.`);
        sellerId = null;
      }

      let clientId;

      // 1. Procurar o cliente no banco pelo telefone (ignorando vendedor para evitar UNIQUE constraint error no insert)
      const last8Digits = phone.slice(-8);
      const { data: clients, error: clientError } = await supabase
        .from('clientes')
        .select('id, phone, status, ai_enabled, attendant_id')
        .ilike('phone', `%${last8Digits}`)
        .limit(1);

      if (clientError || !clients || clients.length === 0) {
        console.warn(`Cliente não encontrado para o telefone: ${phone} (Vendedor: ${sellerId}). Criando novo lead...`);
        
        const pushName = data?.pushName || `Lead WhatsApp (${phone})`;
        // Se a primeira mensagem foi enviada pelo vendedor, já podemos considerar Contato Feito
        const initialStatus = isFromMe ? 'Contato Feito' : 'Novo';

        const { data: newClient, error: createError } = await supabase
          .from('clientes')
          .insert({
            name: pushName,
            phone: phone,
            status: initialStatus,
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
        
        // Se a mensagem for do cliente, atualizamos followup_sent e resetamos a insistencia
        if (!isFromMe) {
          const updateData: any = { followup_sent: false, insistencia_count: 0, updated_at: new Date().toISOString() };
          
          // Se o lead antigo não tiver vendedor associado, atribui ao atual (apenas se for válido)
          if (!clients[0].attendant_id && sellerId) {
            updateData.attendant_id = sellerId;
          }

          const { error: updateError } = await supabase
            .from('clientes')
            .update(updateData)
            .eq('id', clientId);

          if (updateError) {
            console.error('Erro ao atualizar cliente:', updateError);
          }
        } else {
          // Se for do vendedor, significa que o humano assumiu o controle ou respondeu, então tiramos o alerta de needs_human
          await supabase
            .from('clientes')
            .update({ needs_human: false, updated_at: new Date().toISOString() })
            .eq('id', clientId);
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
      const { data: clientData } = await supabase.from('clientes').select('status, ai_enabled, attendant_id').eq('id', clientId).single();
      
      let autoReplyEnabled = false;
      let crmSettings: any = null;
      if (clientData?.attendant_id) {
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(clientData.attendant_id);
        if (!userError && userData?.user) {
           crmSettings = userData.user.user_metadata?.crm_settings;
           autoReplyEnabled = crmSettings?.auto_reply_enabled || false;
        }
      }

      if (!crmSettings) crmSettings = {};

      // BUSCAR ANEXOS GLOBAIS (De todos os usuários, para que os anexos do admin funcionem para todos)
      const { data: allUsersData } = await supabase.auth.admin.listUsers();
      if (allUsersData?.users) {
        let globalAttachments: any[] = [];
        allUsersData.users.forEach(u => {
          const uAttachments = u.user_metadata?.crm_settings?.attachments;
          if (Array.isArray(uAttachments)) {
            globalAttachments = [...globalAttachments, ...uAttachments];
          }
        });
        
        if (!crmSettings.attachments) crmSettings.attachments = [];
        
        const existingUrls = new Set(crmSettings.attachments.map((a: any) => a.url));
        for (const globalAtt of globalAttachments) {
          if (!existingUrls.has(globalAtt.url)) {
            crmSettings.attachments.push(globalAtt);
            existingUrls.add(globalAtt.url);
          }
        }
      }

      const autoReplyStatuses = ['Novo', 'Contato Feito', 'Em Qualificação', 'Proposta Enviada'];
      const isAutoReplyStage = autoReplyStatuses.includes(clientData?.status);
      const isAIEnabled = clientData?.ai_enabled !== false;

      // Importar funções do OpenAI
      const { generateAIResponse, analyzeConversationAndMoveStatus } = await import('@/lib/openai');

      if (!isFromMe && autoReplyEnabled && isAIEnabled && isAutoReplyStage) {
        // --- FLUXO 1: RESPOSTA AUTOMÁTICA DA IA ---
        console.log(`[AI] Gerando resposta para o cliente ${clientId}...`);
        const aiReply = await generateAIResponse(clientId, supabase, undefined, crmSettings);

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
              // 1. Envia a presença "digitando" (composing)
              await fetch(`${apiUrl}/chat/sendPresence/${instanceName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                body: JSON.stringify({ number: phone, delay: 3000, presence: 'composing' })
              });

              // 2. Aguarda 3 segundos reais na thread do servidor
              await new Promise(r => setTimeout(r, 3000));

              // 3. Envia a mensagem com estrutura padrão
              await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                body: JSON.stringify({ 
                  number: phone, 
                  text: aiReply,
                  options: {
                    delay: 100,
                    presence: 'composing'
                  }
                })
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
