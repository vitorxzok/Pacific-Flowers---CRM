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
      const match = instanceName.match(/^user_([a-f0-9\-]{36})(?:_(\d+))?$/i);
      let sellerId: string | null = null;
      if (match) {
        sellerId = match[1];
      } else {
        console.warn(`Instância não utiliza formato válido: ${instanceName}. O attendant_id será nulo.`);
      }

      let clientId;

      // 1. Procurar o cliente no banco pelo telefone (limitando ao vendedor correto)
      const last8Digits = phone.slice(-8);
      const { data: clients, error: clientError } = await supabase
        .from('clientes')
        .select('id, phone, status, ai_enabled, attendant_id')
        .ilike('phone', `%${last8Digits}`)
        .eq('attendant_id', sellerId)
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
            attendant_id: sellerId,
            connected_instance: instanceName
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
          const updateData: any = { 
            followup_sent: false, 
            insistencia_count: 0, 
            updated_at: new Date().toISOString(),
            connected_instance: instanceName 
          };
          
          // Se o lead antigo não tiver vendedor associado, atribui ao atual (apenas se for válido)
          if (!clients[0].attendant_id && sellerId) {
            updateData.attendant_id = sellerId;
          }

          // Se a conversa estava inativa (Finalizado, Perdido, etc) e o cliente mandou mensagem, 
          // a conversa volta ao início e a IA assume novamente.
          const inactiveStatuses = ['Finalizado', 'Perdido', 'Reposição', 'Não Fechado'];
          if (inactiveStatuses.includes(clients[0].status)) {
            updateData.status = 'Novo';
            updateData.needs_human = false; // IA volta a atender
            console.log(`[Webhook] Cliente ${clientId} estava em ${clients[0].status} e enviou mensagem. Retornando para 'Novo' e devolvendo para a IA.`);
            
            // Registra no histórico do lead
            await supabase.from('history_events').insert({
              client_id: clientId,
              type: 'status_change',
              description: `Cliente enviou nova mensagem após encerramento. Status resetado para Novo e IA reativada.`,
              from_status: clients[0].status,
              to_status: 'Novo'
            });
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
      const { data: clientData } = await supabase.from('clientes').select('status, ai_enabled, attendant_id, needs_human').eq('id', clientId).single();
      
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

      // BUSCAR CONFIGURAÇÕES GLOBAIS (Anexos, Prompt, Business Name) de todos os usuários
      // Para que a configuração do Admin funcione para todos os atendentes
      const { data: allUsersData } = await supabase.auth.admin.listUsers();
      if (allUsersData?.users) {
        let globalAttachments: any[] = [];
        let fallbackSystemPrompt: string | null = null;
        let fallbackBusinessName: string | null = null;
        let fallbackAutoReplyEnabled = false;

        allUsersData.users.forEach(u => {
          const uSettings = u.user_metadata?.crm_settings;
          if (uSettings) {
            // Coletar anexos
            if (Array.isArray(uSettings.attachments)) {
              globalAttachments = [...globalAttachments, ...uSettings.attachments];
            }
            if (uSettings.businessName && !fallbackBusinessName) fallbackBusinessName = uSettings.businessName;
            if (uSettings.auto_reply_enabled === true) fallbackAutoReplyEnabled = true;
          }
        });
        
        // Fetch global system prompt from DB
        const { data: globalSettings } = await supabase.from('global_settings').select('system_prompt').eq('id', 1).single();
        if (globalSettings?.system_prompt) {
          fallbackSystemPrompt = globalSettings.system_prompt;
        }
        
        if (!crmSettings.attachments) crmSettings.attachments = [];
        
        const existingUrls = new Set(crmSettings.attachments.map((a: any) => a.url));
        for (const globalAtt of globalAttachments) {
          if (!existingUrls.has(globalAtt.url)) {
            crmSettings.attachments.push(globalAtt);
            existingUrls.add(globalAtt.url);
          }
        }

        // Aplicar fallbacks de prompt caso o atendente atual não tenha
        if (!crmSettings.systemPrompt && fallbackSystemPrompt) crmSettings.systemPrompt = fallbackSystemPrompt;
        if (!crmSettings.businessName && fallbackBusinessName) crmSettings.businessName = fallbackBusinessName;
        // Aplicar fallback para autoReplyEnabled se o cliente for genérico
        if (!clientData?.attendant_id && fallbackAutoReplyEnabled) autoReplyEnabled = true;
      }

      const autoReplyStatuses = ['Novo', 'Contato Feito', 'Em Qualificação', 'Proposta Enviada'];
      const isAutoReplyStage = autoReplyStatuses.includes(clientData?.status);
      const isAIEnabled = clientData?.ai_enabled !== false && clientData?.needs_human !== true;

      // Importar funções do OpenAI
      const { generateAIResponse, analyzeConversationAndMoveStatus } = await import('@/lib/openai');

      // DEBUG MESSAGE
      await supabase.from('mensagens').insert({
        client_id: clientId,
        text: `[DEBUG] isFromMe: ${isFromMe}, autoReplyEnabled: ${autoReplyEnabled}, isAIEnabled: ${isAIEnabled}, isAutoReplyStage: ${isAutoReplyStage}, att_id: ${clientData?.attendant_id}`,
        sender: 'system',
        read: true
      });

      if (!isFromMe && autoReplyEnabled && isAIEnabled && isAutoReplyStage) {
        // --- FLUXO 1: RESPOSTA AUTOMÁTICA DA IA ---
        console.log(`[AI] Gerando resposta para o cliente ${clientId}...`);
        const aiResponse = await generateAIResponse(clientId, supabase, undefined, crmSettings);
        const aiReply = aiResponse?.text;
        const mediaToSend = aiResponse?.mediaToSend || [];

        if (aiReply) {
          // Remove [SEPARAR] do texto antes de salvar no banco para ficar limpo no CRM
          const cleanText = aiReply.replace(/\[SEPARAR\]/g, '').trim();
          
          await supabase.from('mensagens').insert({
            client_id: clientId,
            text: cleanText,
            sender: 'attendant',
            read: true
          });

          // Se houver mídia, salva também no banco para aparecer no CRM
          if (mediaToSend && mediaToSend.length > 0) {
            for (const media of mediaToSend) {
              await supabase.from('mensagens').insert({
                client_id: clientId,
                text: media.caption || 'Anexo enviado',
                media_url: media.media,
                media_type: media.mediatype,
                sender: 'attendant',
                read: true
              });
            }
          }

          if (clientData?.status === 'Novo') {
            await supabase.from('clientes').update({ status: 'Contato Feito' }).eq('id', clientId);
          }

          const apiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL || '';
          const apiKey = process.env.EVOLUTION_API_KEY || process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || '';
          const instanceName = body.instance || '';

          if (apiUrl && apiKey && instanceName) {
            try {
              // 1. Envia a presença "digitando" (composing)
              fetch(`${apiUrl}/chat/sendPresence/${instanceName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                body: JSON.stringify({ number: phone, delay: 1000, presence: 'composing' })
              }).catch(() => {});

              // Divide a mensagem se houver a tag [SEPARAR]
              const aiReplyParts = aiReply.split('[SEPARAR]').map(p => p.trim()).filter(p => p.length > 0);
              
              if (aiReplyParts.length > 0) {
                // Envia a PRIMEIRA parte do texto
                await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                  body: JSON.stringify({ 
                    number: phone, 
                    text: aiReplyParts[0],
                    options: { delay: 100, presence: 'composing' }
                  })
                });
                console.log(`[AI] Resposta parte 1 enviada com sucesso para ${phone}`);
              }
              
              // 3. Se houver mídia (catálogo), aguarda exatamente 3 segundos e envia
              if (mediaToSend && mediaToSend.length > 0) {
                console.log(`[AI] Aguardando 3 segundos para enviar catálogo para ${phone}...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                for (const media of mediaToSend) {
                  const evoRes = await fetch(`${apiUrl}/message/sendMedia/${instanceName}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                    body: JSON.stringify(media)
                  });
                  if (!evoRes.ok) {
                    const evoErr = await evoRes.text();
                    console.error(`[AI] Erro do Evolution API ao enviar mídia: Status ${evoRes.status} - ${evoErr}`);
                  } else {
                    console.log(`[AI] Anexo enviado com sucesso para ${phone}`);
                  }
                }
              }

              // Se houver mais partes do texto, envia depois do anexo
              if (aiReplyParts.length > 1) {
                for (let i = 1; i < aiReplyParts.length; i++) {
                  console.log(`[AI] Aguardando 3 segundos para enviar parte ${i+1} do texto para ${phone}...`);
                  await new Promise(resolve => setTimeout(resolve, 3000));
                  
                  await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                    body: JSON.stringify({ 
                      number: phone, 
                      text: aiReplyParts[i],
                      options: { delay: 100, presence: 'composing' }
                    })
                  });
                  console.log(`[AI] Resposta parte ${i+1} enviada com sucesso para ${phone}`);
                }
              }
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
    } else if (body.event === 'connection.update') {
      const state = body.data?.state;
      const instanceName = body.instance;
      console.log(`[Webhook] Evento de conexão recebido para ${instanceName}: ${state}`);
      
      if (instanceName && state) {
        await supabase.from('whatsapp_instances').update({ status: state }).eq('instance_name', instanceName);
      }

      if (state === 'close' || state === 'disconnected') {
        const apiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL || '';
        const apiKey = process.env.EVOLUTION_API_KEY || process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || '';
        
        if (apiUrl && apiKey && instanceName) {
           console.log(`[Webhook] Conexão caiu para ${instanceName}. Tentando restart automático...`);
           fetch(`${apiUrl}/instance/restart/${instanceName}`, {
             method: 'POST',
             headers: { 'apikey': apiKey }
           }).catch(err => console.error(`[Webhook] Falha ao tentar restart de ${instanceName}:`, err));
        }
      }
      return NextResponse.json({ success: true, message: 'Evento de conexão processado.' });
    }

    return NextResponse.json({ success: true, message: 'Evento ignorado' });

  } catch (error: any) {
    console.error('Erro ao processar webhook:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', details: error?.message, stack: error?.stack }, { status: 500 });
  }
}
