import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { createClient } from '@supabase/supabase-js';
import { transcribeAudio } from '@/lib/openai-audio';

// Usamos o supabase-js diretamente aqui para poder injetar a SERVICE_ROLE_KEY se disponível,
// pois webhooks não possuem cookies de sessão do usuário (bypassa RLS).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    let aiReactivated = false;
    const body = await request.json();
    console.log('Webhook WhatsApp recebido:', JSON.stringify(body, null, 2));
    
    // Log do payload para debugar e para deduplicação global
    const { data: logEntry } = await supabase.from('webhook_logs').insert({ payload: body }).select('id').single();
    const myLogId = logEntry?.id;

    // Apenas nos importamos com upsert de mensagens (novas mensagens recebidas)
    if (body.event === 'messages-upsert' || body.event === 'messages.upsert') {
      const data = body.data;
      const instanceName = body.instance || '';
      
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
        messageObj?.templateButtonReplyMessage?.selectedDisplayText ||
        messageObj?.listResponseMessage?.title ||
        messageObj?.buttonsResponseMessage?.selectedDisplayText ||
        '';

      if (!text) {
        if (messageObj?.imageMessage) text = `[IMAGEM] ${messageObj.imageMessage.caption || ''}`.trim();
        else if (messageObj?.audioMessage) {
          text = '[ÁUDIO]'; // Fallback initial
          
          try {
            const apiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL;
            const apiKey = process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || process.env.EVOLUTION_API_KEY;
            
            if (apiUrl && apiKey && instanceName) {
              // Buscar o base64 da mídia via Evolution API
              const b64Response = await fetch(`${apiUrl}/chat/getBase64FromMediaMessage/${instanceName}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': apiKey
                },
                body: JSON.stringify({ message: data }) // O Evolution precisa do objeto 'data' inteiro do webhook
              });
              
              if (b64Response.ok) {
                const b64Data = await b64Response.json();
                let base64String = b64Data.base64;
                
                // Remover prefixo "data:audio/ogg;base64," se houver
                if (base64String && base64String.includes(',')) {
                  base64String = base64String.split(',')[1];
                }
                
                if (base64String) {
                  const mimetype = messageObj.audioMessage.mimetype || 'audio/ogg';
                  const transcribedText = await transcribeAudio(base64String, mimetype);
                  if (transcribedText) {
                    text = `[ÁUDIO TRANSCRITO] ${transcribedText}`;
                    console.log(`[Webhook] Áudio transcrito com sucesso: ${text}`);
                  }
                }
              } else {
                console.error(`[Webhook] Erro ao buscar base64 do áudio na Evolution:`, await b64Response.text());
              }
            }
          } catch (audioErr) {
            console.error('[Webhook] Erro no processamento/transcrição do áudio:', audioErr);
          }
        }
        else if (messageObj?.videoMessage) text = `[VÍDEO] ${messageObj.videoMessage.caption || ''}`.trim();
        else if (messageObj?.documentMessage) text = `[ARQUIVO RECEBIDO: ${messageObj.documentMessage.fileName || 'Documento em anexo'}]`;
        else if (messageObj?.stickerMessage) text = '[Figurinha]';
        else if (messageObj?.contactMessage) text = '[Contato]';
        else if (messageObj?.locationMessage) text = '[Localização]';
      }

      if (!phone || !text) {
        return NextResponse.json({ success: true, message: 'Payload sem texto ou telefone.' });
      }

      // Extrair o ID do usuário (vendedor) a partir do nome da instância
      const match = instanceName.match(/^user_([a-f0-9\-]{36})(?:_(\d+))?$/i);
      let sellerId: string | null = null;
      if (match) {
        sellerId = match[1];
      } else {
        // Fallback: search profile by whatsapp_number (which might store the instance name or phone)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('whatsapp_number', instanceName)
          .limit(1);
          
        if (profiles && profiles.length > 0) {
          sellerId = profiles[0].id;
        } else {
          console.warn(`Instância não utiliza formato válido e não foi encontrada em nenhum perfil: ${instanceName}. O attendant_id será nulo.`);
        }
      }

      let clientId;

      // 1. Procurar o cliente no banco pelo telefone (limitando ao vendedor correto)
      const last8Digits = phone.slice(-8);
      const last8Formatted = `${last8Digits.slice(0,4)}-${last8Digits.slice(4)}`;
      
      let clientQuery = supabase
        .from('clientes')
        .select('id, phone, status, ai_enabled, attendant_id, needs_human')
        .or(`phone.ilike.%${last8Digits},phone.ilike.%${last8Formatted}`);

      if (sellerId) {
        clientQuery = clientQuery.eq('attendant_id', sellerId);
      }
      
      clientQuery = clientQuery.order('updated_at', { ascending: false }).limit(1);

      const { data: clients, error: clientError } = await clientQuery;

      if (clientError || !clients || clients.length === 0) {
        console.warn(`Cliente não encontrado para o telefone: ${phone} (Vendedor: ${sellerId}). Criando novo lead...`);
        
        let pushName = data?.pushName;
        // Se a mensagem foi enviada pelo vendedor, o pushName que vem é o do próprio vendedor!
        // Não queremos salvar o cliente com o nome do vendedor (ex: "Vendas 06").
        if (isFromMe || !pushName) {
           pushName = `Lead WhatsApp (${phone})`;
        }
        
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
        
        // Se for de atendente (isFromMe), verifica se é eco da IA ou se é o vendedor humano
        let isAiEcho = false;
        if (isFromMe) {
          // Tenta achar uma mensagem enviada pela IA há menos de 60 segundos
          const recentWindow = new Date(Date.now() - 60000).toISOString();
          const { data: recentAiMsgs } = await supabase
            .from('mensagens')
            .select('id, text')
            .eq('client_id', clientId)
            .eq('sender', 'attendant')
            .gte('timestamp', recentWindow);

          if (recentAiMsgs && recentAiMsgs.length > 0) {
            // Função para limpar a string (remove espaços e pontuações) para comparação robusta
            const cleanStr = (s: string) => (s || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const cleanText = cleanStr(text);
            
            const isEcho = recentAiMsgs.some(msg => {
              const cleanMsgText = cleanStr(msg.text);
              return cleanMsgText.includes(cleanText) || cleanText.includes(cleanMsgText);
            });

            if (isEcho) {
              isAiEcho = true;
              console.log(`[Webhook] Eco de mensagem da IA detectado (mesmo com SEPARAR). Ignorando duplicação.`);
              return NextResponse.json({ success: true, message: 'Echo da IA ignorado.' });
            }
          }
          
          if (!isAiEcho && (text.startsWith('[ARQUIVO RECEBIDO:') || text.startsWith('[Mídia]') || text === '[Mídia]')) {
            // Fallback para eco de mídia: Evolution API retorna textos padronizados que podem não bater exatamente
            const { data: recentMedia } = await supabase
              .from('mensagens')
              .select('id')
              .eq('client_id', clientId)
              .eq('sender', 'attendant')
              .not('media_url', 'is', null)
              .gte('timestamp', recentWindow)
              .limit(1);
            
            if (recentMedia && recentMedia.length > 0) {
              isAiEcho = true;
              console.log(`[Webhook] Eco de anexo da IA detectado. Ignorando duplicação.`);
              return NextResponse.json({ success: true, message: 'Echo de anexo da IA ignorado.' });
            }
          }
        }

        // Se a mensagem for do cliente, atualizamos followup_sent e resetamos a insistencia
        if (!isFromMe) {
          const updateData: any = { 
            followup_sent: false, 
            insistencia_count: 0, 
            updated_at: new Date().toISOString(),
            connected_instance: instanceName 
          };
          
          // Reatribuir o cliente ao vendedor atual, se for diferente
          if (sellerId && clients[0].attendant_id !== sellerId) {
            updateData.attendant_id = sellerId;
            console.log(`[Webhook] Cliente ${clientId} reatribuído para o vendedor ${sellerId}`);
          } else if (!clients[0].attendant_id && sellerId) {
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
          // Se for do vendedor, atualizar a instância e o vendedor se necessário
          if (sellerId && clients[0].attendant_id !== sellerId) {
             await supabase.from('clientes').update({ attendant_id: sellerId, connected_instance: instanceName, updated_at: new Date().toISOString() }).eq('id', clientId);
          }

          // Se for do vendedor (e não for eco da IA), significa que o humano assumiu o controle!
          // VERIFICAR CÓDIGO SECRETO ".." OU "/ia"
          const textTrimmed = text.trim();
          if (textTrimmed === '/ia' || (textTrimmed.endsWith('..') && !textTrimmed.endsWith('...'))) {
            // Humano usou o código secreto para reativar a IA!
            await supabase
              .from('clientes')
              .update({ 
                needs_human: false, 
                ai_enabled: true, 
                status: 'Novo', // Volta o status para que a IA possa conduzir o fluxo
                updated_at: new Date().toISOString() 
              })
              .eq('id', clientId);
            
            console.log(`[Webhook] Humano usou código secreto "..". IA REATIVADA para o cliente ${clientId}.`);
            aiReactivated = true;
          } else {
            // Comportamento normal: Desativamos a IA e atualizamos o status.
            let targetStatus = clients[0].status;
            if (targetStatus === 'Novo') {
              targetStatus = 'Contato Feito';
            }
            await supabase
              .from('clientes')
              .update({ 
                needs_human: false, 
                ai_enabled: false, 
                status: targetStatus,
                updated_at: new Date().toISOString() 
              })
              .eq('id', clientId);
            
            console.log(`[Webhook] Humano assumiu a conversa do cliente ${clientId}. IA desativada.`);
          }
          
          // Se o atendente enviou mensagem pelo celular, limpamos o status de não lida
          await supabase
            .from('mensagens')
            .update({ read: true })
            .eq('client_id', clientId)
            .eq('read', false);
        }
      }

      // 1.5. Deduplicar mensagens recebidas (evitar webhooks duplicados em curto intervalo)
      // Agora faremos isso DEPOIS da inserção para evitar race conditions.

      // 2. Inserir a mensagem na tabela `mensagens`
      const { data: insertedMsg, error: insertError } = await supabase
        .from('mensagens')
        .insert({
          client_id: clientId,
          text: text,
          sender: isFromMe ? 'attendant' : 'client',
          read: isFromMe
        })
        .select('id, timestamp')
        .single();

      if (insertError) {
        console.error('Erro ao salvar mensagem no banco:', insertError);
        return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 });
      }

      // 2.5 Ultimate Global Deduplication Check (Race-condition safe, cross-instance, cross-retry)
      if (!isFromMe && insertedMsg && key?.id && myLogId) {
        // Esperamos um pouco para garantir que webhooks concorrentes tenham tempo de inserir seus logs
        await new Promise(r => setTimeout(r, 400));
        
        const dedupeWindow = new Date(Date.now() - 120000).toISOString(); // 2 minutos
        
        const { data: duplicateLogs } = await supabase
          .from('webhook_logs')
          .select('id, created_at')
          .gte('created_at', dedupeWindow)
          .contains('payload', { data: { key: { id: key.id } } })
          .order('created_at', { ascending: true })
          .order('id', { ascending: true });

        // Se houver mais de um log para esta mensagem, apenas o PRIMEIRO de todos tem permissão para continuar.
        // Isso resolve:
        // 1. Retries da Evolution API (o log original será o primeiro)
        // 2. Instâncias duplicadas (ambas chegam juntas, mas concordam em qual é a primeira pelo created_at/id)
        // 3. Race conditions no exato mesmo milissegundo (o order('id') desempata)
        if (duplicateLogs && duplicateLogs.length > 0 && duplicateLogs[0].id !== myLogId) {
          console.log(`[Webhook] Duplicação global detectada (Message ID: ${key.id}). Abortando.`);
          await supabase.from('mensagens').delete().eq('id', insertedMsg.id);
          return NextResponse.json({ success: true, message: 'Webhook duplicado abortado.' });
        }
      }

      // 3. FETCH CLIENT DATA FIRST to determine AI state
      const { data: clientData } = await supabase.from('clientes').select('status, ai_enabled, attendant_id, needs_human').eq('id', clientId).single();

      // Atualizar o updated_at do cliente para que a ordenação funcione corretamente
      const updatePayload: any = { updated_at: new Date().toISOString() };
      if (!isFromMe) {
        updatePayload.has_unread_messages = true;
      } else {
        // Se a mensagem foi enviada por nós (AI ou Humano)
        // Só marcamos como lida se a IA NÃO estiver ativa ou se já precisar de humano.
        // Se a IA estiver ativa, significa que ela respondeu, então a mensagem deve continuar piscando para o humano ler.
        if (!clientData?.ai_enabled || clientData?.needs_human) {
          updatePayload.has_unread_messages = false;
        }
      }

      await supabase
        .from('clientes')
        .update(updatePayload)
        .eq('id', clientId);
      
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
        // Aplicar fallback para autoReplyEnabled se não foi configurado explicitamente
        if (crmSettings.auto_reply_enabled !== false && fallbackAutoReplyEnabled) autoReplyEnabled = true;
      }

      const isAIEnabled = clientData?.ai_enabled !== false && clientData?.needs_human !== true;

      // Importar funções do OpenAI
      const { generateAIResponse, analyzeConversationAndMoveStatus } = await import('@/lib/openai');

      // DEBUG MESSAGE
      console.log(`[DEBUG] isFromMe: ${isFromMe}, autoReplyEnabled: ${autoReplyEnabled}, isAIEnabled: ${isAIEnabled}, att_id: ${clientData?.attendant_id}`);

      if ((!isFromMe || aiReactivated) && autoReplyEnabled && isAIEnabled) {
        // --- DEBOUNCE PARA MENSAGENS SEGUIDAS ---
        // Aguarda 3 segundos para garantir que o cliente não enviou outras mensagens / imagens em lote
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        if (insertedMsg?.timestamp) {
          const { data: newerMessages } = await supabase
            .from('mensagens')
            .select('id')
            .eq('client_id', clientId)
            .eq('sender', 'client')
            .gt('timestamp', insertedMsg.timestamp)
            .limit(1);

          if (newerMessages && newerMessages.length > 0) {
            console.log(`[Webhook] Nova mensagem do cliente chegou durante o debounce. Abortando a IA desta chamada para evitar respostas duplicadas.`);
            return NextResponse.json({ success: true, message: 'Processo da IA abortado em favor da mensagem mais recente.' });
          }
        }

        // --- LOCK MECHANISM TO PREVENT CONCURRENT AI CALLS (RACE-CONDITION SAFE) ---
        let isLocked = true;
        let lockAttempts = 0;
        let myLockId: string | null = null;
        
        while (isLocked && lockAttempts < 5) {
          const lockWindow = new Date(Date.now() - 30000).toISOString();
          
          // Verifica se já existe um lock
          const { data: existingLocks } = await supabase
            .from('mensagens')
            .select('id, text')
            .eq('client_id', clientId)
            .like('text', '[AI_PROCESSING_LOCK%')
            .eq('sender', 'attendant')
            .gte('timestamp', lockWindow)
            .order('timestamp', { ascending: true })
            .order('id', { ascending: true });

          if (existingLocks && existingLocks.length > 0) {
            console.log(`[Webhook] Outra thread processando cliente ${clientId}. Aguardando 2s (tentativa ${lockAttempts + 1})...`);
            await new Promise(r => setTimeout(r, 2000));
            lockAttempts++;
            continue;
          }

          // Tenta adquirir o lock
          const myToken = Math.random().toString(36).substring(7);
          const myLockText = `[AI_PROCESSING_LOCK_${myToken}]`;
          
          const { data: insertedLock } = await supabase.from('mensagens').insert({
            client_id: clientId,
            text: myLockText,
            sender: 'attendant',
            read: true
          }).select('id').single();

          if (insertedLock) {
             // Aguarda um curto período para permitir que condições de corrida se manifestem no banco
             await new Promise(r => setTimeout(r, 400));
             
             // Verifica de novo todos os locks ativos
             const { data: verifyLocks } = await supabase
              .from('mensagens')
              .select('id, text')
              .eq('client_id', clientId)
              .like('text', '[AI_PROCESSING_LOCK%')
              .eq('sender', 'attendant')
              .gte('timestamp', lockWindow)
              .order('timestamp', { ascending: true })
              .order('id', { ascending: true });
              
             if (verifyLocks && verifyLocks.length > 0 && verifyLocks[0].text === myLockText) {
                // Nós somos o primeiro! Pegamos o lock.
                myLockId = insertedLock.id;
                isLocked = false;
             } else {
                // Outra thread inseriu antes ou no mesmo milissegundo.
                await supabase.from('mensagens').delete().eq('id', insertedLock.id);
                console.log(`[Webhook] Condição de corrida evitada para cliente ${clientId}. Aguardando 2s...`);
                await new Promise(r => setTimeout(r, 2000));
                lockAttempts++;
             }
          } else {
             await new Promise(r => setTimeout(r, 2000));
             lockAttempts++;
          }
        }

        if (isLocked) {
           console.log(`[Webhook] Lock persistente para o cliente ${clientId}. Abortando.`);
           return NextResponse.json({ success: true, message: 'Processo da IA abortado devido a lock persistente.' });
        }

        // --- FLUXO 1: RESPOSTA AUTOMÁTICA DA IA ---
        console.log(`[AI] Gerando resposta para o cliente ${clientId}...`);
        const aiResponse = await generateAIResponse(clientId, supabase, undefined, crmSettings);
        
        // Libera o lock
        if (myLockId) {
          await supabase.from('mensagens').delete().eq('id', myLockId);
        }

        const aiReply = aiResponse?.text;
        const mediaToSend = aiResponse?.mediaToSend || [];
        const audioTranscript = (aiResponse as any)?.audioTranscript || '';

        if (aiReply || mediaToSend.length > 0 || audioTranscript) {
          // Remove [SEPARAR] do texto antes de salvar no banco para ficar limpo no CRM
          const cleanText = (aiReply || '').replace(/\[SEPARAR\]/g, '').trim();
          const fullTextToSave = (cleanText + (audioTranscript ? `\n${audioTranscript}` : '')).trim();
          
          if (fullTextToSave) {
            await supabase.from('mensagens').insert({
              client_id: clientId,
              text: fullTextToSave,
              sender: 'attendant',
              read: true
            });
          }

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

          if (apiUrl && apiKey && instanceName) {
            try {
              // 1. Envia a presença "digitando" (composing)
              fetch(`${apiUrl}/chat/sendPresence/${instanceName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                body: JSON.stringify({ number: phone, delay: 1000, presence: 'composing' })
              }).catch(() => {});

              // Divide a mensagem se houver a tag [SEPARAR]
              const aiReplyParts = (aiReply || '').split('[SEPARAR]').map(p => p.trim()).filter(p => p.length > 0);
              
              if (aiReplyParts.length > 0) {
                if (aiReplyParts[0].trim()) {
                await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                  body: JSON.stringify({ 
                    number: phone, 
                    text: aiReplyParts[0],
                    linkPreview: true,
                    options: { delay: 100, presence: 'composing' }
                  })
                });
                console.log(`[AI] Resposta parte 1 enviada com sucesso para ${phone}`);
                }
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
                  console.log(`[AI] Aguardando 1.5 segundos para enviar parte ${i+1} do texto para ${phone}...`);
                  await new Promise(resolve => setTimeout(resolve, 1500));
                  
                  await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                    body: JSON.stringify({ 
                      number: phone, 
                      text: aiReplyParts[i],
                      linkPreview: true,
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
      } else if (!isAIEnabled) {
        // --- FLUXO 2: ANÁLISE SILENCIOSA DO FUNIL (QUANDO HUMANO ASSUMIU OU IA DESATIVADA) ---
        // A IA apenas lerá o contexto para ver se avança o Kanban (Apresentação, Negociação, etc.)
        // Executamos de forma assíncrona para não travar o webhook
        analyzeConversationAndMoveStatus(clientId, supabase).catch(err => {
          console.error('[AI Silent] Erro na análise silenciosa:', err);
        });
      }

    } else if (body.event === 'messages.update' || body.event === 'messages-update') {
      const data = body.data;
      if (Array.isArray(data)) {
        for (const msgUpdate of data) {
          const update = msgUpdate.update;
          if (update && (update.status === 'READ' || update.status === 3)) {
            const remoteJid = msgUpdate.key?.remoteJid;
            if (remoteJid && !remoteJid.includes('@g.us')) {
              const phone = remoteJid.split('@')[0];
              const last8Digits = phone.slice(-8);
              const last8Formatted = `${last8Digits.slice(0,4)}-${last8Digits.slice(4)}`;
              
              const { data: clients } = await supabase
                .from('clientes')
                .select('id')
                .or(`phone.ilike.%${last8Digits},phone.ilike.%${last8Formatted}`)
                .limit(1);

              if (clients && clients.length > 0) {
                 await supabase
                   .from('mensagens')
                   .update({ read: true })
                   .eq('client_id', clients[0].id)
                   .eq('read', false);
              }
            }
          }
        }
      }
      return NextResponse.json({ success: true, message: 'Evento de atualização de mensagens processado.' });
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
