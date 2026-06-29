import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateAIResponse } from '@/lib/openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Essa rota pode ser chamada por um CRON Job (ex: cron-job.org ou Vercel Cron) a cada 1 minuto
export async function GET(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar usuários e suas configurações (user_metadata)
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError || !usersData) {
      return NextResponse.json({ error: 'Erro ao buscar configurações dos usuários' }, { status: 500 });
    }

    // Mapa de configurações por attendant_id e fallback global
    const settingsByAttendant: Record<string, any> = {};
    let fallbackSettings: any = {
      auto_reply_enabled: false,
      minutes_without_response: 15,
      followup_interval_hours: 24,
      insistencia_max_repetitions: 3,
      insistencia_days_interval: 2,
      working_hours_start: '07:30',
      working_hours_end: '20:00'
    };

    for (const u of usersData.users) {
      const uSettings = u.user_metadata?.crm_settings;
      if (uSettings) {
        settingsByAttendant[u.id] = uSettings;
        // Pega qualquer configuração válida como fallback para clientes sem atendente
        if (uSettings.auto_reply_enabled === true) fallbackSettings.auto_reply_enabled = true;
        if (uSettings.minutes_without_response) fallbackSettings.minutes_without_response = uSettings.minutes_without_response;
        if (uSettings.followup_interval_hours) fallbackSettings.followup_interval_hours = uSettings.followup_interval_hours;
        if (uSettings.insistencia_max_repetitions) fallbackSettings.insistencia_max_repetitions = uSettings.insistencia_max_repetitions;
        if (uSettings.insistencia_days_interval) fallbackSettings.insistencia_days_interval = uSettings.insistencia_days_interval;
        if (uSettings.working_hours_start) fallbackSettings.working_hours_start = uSettings.working_hours_start;
        if (uSettings.working_hours_end) fallbackSettings.working_hours_end = uSettings.working_hours_end;
        if (uSettings.insistencia_cadences && uSettings.insistencia_cadences.length > 0) {
          fallbackSettings.insistencia_cadences = uSettings.insistencia_cadences;
        }
        if (uSettings.recovery_instances) fallbackSettings.recovery_instances = uSettings.recovery_instances;
      }
    }

    // Resultados das execuções
    const results = {
      reposicoesEnviadas: 0,
      followUpsEnviados: 0
    };

        // Mapa de instâncias abertas na Evolution API
    let openInstancesMap: Record<string, string> = {};
    let activeInternalPhones: string[] = [];
    try {
      const evoApiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL;
      const evoApiKey = process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || process.env.EVOLUTION_API_KEY;
      if (evoApiUrl && evoApiKey) {
        const res = await fetch(`${evoApiUrl}/instance/fetchInstances`, { headers: { 'apikey': evoApiKey } });
        if (res.ok) {
          const instances = await res.json();
          instances.forEach((inst: any) => {
            if (inst.connectionStatus === 'open' && inst.name) {
              const baseName = inst.name.split('_').slice(0, 2).join('_'); // Extrai 'user_xxxx' de 'user_xxxx_1'
              openInstancesMap[baseName] = inst.name;
              openInstancesMap[inst.name] = inst.name;
              
              if (inst.ownerJid) {
                const phone = inst.ownerJid.split('@')[0];
                activeInternalPhones.push(phone);
                // Mapeia variações com e sem ddd 9 para garantir que ignoramos
                if (phone.length === 13) { // 55 + 2 DDD + 9 + 8 digitos
                  activeInternalPhones.push(phone.slice(0, 4) + phone.slice(5)); // Remove o 9
                } else if (phone.length === 12) {
                  activeInternalPhones.push(phone.slice(0, 4) + '9' + phone.slice(4)); // Adiciona o 9
                }
              }
            }
          });
        }
      }
    } catch (e) {
      console.error('Erro ao buscar instancias:', e);
    }

    // ========================================================
    // LÓGICA 1: REPOSIÇÃO DE ESTOQUE (25 DIAS)
    // ========================================================
    // Acha clientes no status 'Reposição' que estão lá há mais de 25 dias
    const date25DaysAgo = new Date();
    date25DaysAgo.setDate(date25DaysAgo.getDate() - 25);
    const iso25DaysAgo = date25DaysAgo.toISOString();

    const { data: clientesReposicao, error: reposicaoError } = await supabase
      .from('clientes')
      .select('id, name, phone, attendant_id, connected_instance')
      .eq('status', 'Reposição')
      .lte('updated_at', iso25DaysAgo);

    if (clientesReposicao && clientesReposicao.length > 0) {
      for (const client of clientesReposicao) {
        const cleanedClientPhone = client.phone ? client.phone.replace(/\D/g, '') : '';
        if (cleanedClientPhone && activeInternalPhones.includes(cleanedClientPhone)) continue; // Ignora números internos
        try {
          // Muda o status para 'Em Qualificação' primeiro para evitar disparos duplicados se der timeout
          await supabase
            .from('clientes')
            .update({ status: 'Em Qualificação', needs_human: false, updated_at: new Date().toISOString() })
            .eq('id', client.id);

          // Gera a resposta da IA forçando um system prompt customizado
          const aiResponseText = await generateAIResponse(client.id, supabase, "REPOSICAO_25_DIAS");

          if (aiResponseText) {
            // Salva a mensagem no banco
            await supabase.from('mensagens').insert({
              client_id: client.id,
              text: aiResponseText,
              sender: 'attendant',
              read: true
            });

            // Envia para a API Evolution
            const apiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL;
            const apiKey = process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || process.env.EVOLUTION_API_KEY;
            
            if (apiUrl && apiKey && client.phone) {
              const cleanedPhone = client.phone.replace(/\D/g, '');
              const baseInstance = client.attendant_id ? `user_${client.attendant_id}` : 'user_default';
              const instanceName = (client.connected_instance && openInstancesMap[client.connected_instance]) 
                ? client.connected_instance 
                : openInstancesMap[baseInstance];
              if (!instanceName) continue;
              
              await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': apiKey,
                },
                body: JSON.stringify({ number: cleanedPhone, text: aiResponseText }),
              });
            }
            results.reposicoesEnviadas++;
          }
        } catch (err) {
          console.error(`Erro ao processar reposição para cliente ${client.id}:`, err);
        }
      }
    }

    // ========================================================
    // LÓGICA 2: FOLLOW-UP INATIVIDADE (X MINUTOS)
    // ========================================================
    const autoReplyStatuses = ['Novo', 'Contato Feito', 'Em Qualificação', 'Proposta Enviada'];

    // 1. Buscar clientes que estão em status ativos e ainda NÃO receberam o follow-up rápido
    const { data: clientesInativos, error: inativosError } = await supabase
      .from('clientes')
      .select('id, name, phone, attendant_id, status, connected_instance')
      .in('status', autoReplyStatuses)
      .eq('followup_sent', false)
      .eq('ai_enabled', true);

    if (clientesInativos && clientesInativos.length > 0) {
      let processedInativos = 0;
      for (const client of clientesInativos) {
        if (processedInativos >= 5) break; // Evitar Rate Limit da OpenAI
        const cleanedClientPhone = client.phone ? client.phone.replace(/\D/g, '') : '';
        if (cleanedClientPhone && activeInternalPhones.includes(cleanedClientPhone)) continue; // Ignora números internos
        try {
          const clientSettings = settingsByAttendant[client.attendant_id] || fallbackSettings;
          
          const baseInstance = client.attendant_id ? `user_${client.attendant_id}` : 'user_default';
          const instanceName = (client.connected_instance && openInstancesMap[client.connected_instance]) 
            ? client.connected_instance 
            : openInstancesMap[baseInstance];

          if (!instanceName) continue; // Instância não está online

          const allowedInstances = clientSettings.recovery_instances || [];
          const isRecoveryEnabled = allowedInstances.includes(instanceName);

          if (!isRecoveryEnabled) {
            continue; // Pula se a recuperação estiver desativada para a instância na qual o lead chegou
          }

          // Checar se estamos no horário comercial de Brasília
          const brtDate = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
          const currentHour = brtDate.getHours();
          const currentMinute = brtDate.getMinutes();
          const currentTimeInMinutes = currentHour * 60 + currentMinute;
          
          const startStr = clientSettings.working_hours_start || '07:30';
          const endStr = clientSettings.working_hours_end || '20:00';
          
          const [startHour, startMin] = startStr.split(':').map(Number);
          const [endHour, endMin] = endStr.split(':').map(Number);
          
          const startInMinutes = (startHour * 60) + (startMin || 0);
          const endInMinutes = (endHour * 60) + (endMin || 0);
          
          const isBusinessHours = currentTimeInMinutes >= startInMinutes && currentTimeInMinutes <= endInMinutes;

          if (!isBusinessHours) {
            continue; // Fora do horário comercial, não manda follow-up rápido
          }

          const minutesWithoutResponse = clientSettings.minutes_without_response || 15;

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

            if (diffMinutes >= minutesWithoutResponse) {
              // 1. Lock Optimista para prevenir disparos concorrentes (timeout retry)
              const { data: lockClient, error: lockError } = await supabase
                .from('clientes')
                .update({ followup_sent: true })
                .eq('id', client.id)
                .eq('followup_sent', false)
                .select('id');

              if (lockError || !lockClient || lockClient.length === 0) {
                console.log(`[Follow-up] Concorrência evitada para cliente ${client.id}`);
                continue;
              }

              const aiResponse = await generateAIResponse(client.id, supabase, "FOLLOW_UP_INATIVIDADE");
              const aiResponseText = aiResponse?.text;

              if (aiResponseText) {
                processedInativos++;

                const cleanText = aiResponseText.replace(/\[SEPARAR\]/g, '').trim();
                const { error: msgError } = await supabase.from('mensagens').insert({ client_id: client.id, text: cleanText, sender: 'attendant', read: true });
                if (msgError) {
                  console.error(`Erro ao salvar mensagem de inatividade para cliente ${client.id}:`, msgError);
                  // Rollback lock
                  await supabase.from('clientes').update({ followup_sent: false }).eq('id', client.id);
                  continue; // Pula o envio se o DB falhar
                }

                const apiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL;
                const apiKey = process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || process.env.EVOLUTION_API_KEY;
                
                if (apiUrl && apiKey && client.phone) {
                  const cleanedPhone = client.phone.replace(/\D/g, '');
                  await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                    body: JSON.stringify({ number: cleanedPhone, text: cleanText }),
                  });
                }
                results.followUpsEnviados++;
              } else {
                // Rollback lock se a IA falhou em gerar texto
                await supabase.from('clientes').update({ followup_sent: false }).eq('id', client.id);
              }
            }
          }
        } catch (err) {
          console.error(`Erro ao processar follow-up rapido para cliente ${client.id}:`, err);
        }
      }
    }

    // ========================================================
    // LÓGICA 3: INSISTÊNCIA DA IA (HORÁRIO COMERCIAL E LIMITES)
    // ========================================================
    
    // Checar se estamos no horário comercial de Brasília
      const brtDate = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
      const currentHour = brtDate.getHours();
      const currentMinute = brtDate.getMinutes();
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      
      const startStr = fallbackSettings.working_hours_start || '07:30';
      const endStr = fallbackSettings.working_hours_end || '20:00';
      
      const [startHour, startMin] = startStr.split(':').map(Number);
      const [endHour, endMin] = endStr.split(':').map(Number);
      
      const startInMinutes = (startHour * 60) + (startMin || 0);
      const endInMinutes = (endHour * 60) + (endMin || 0);
      
      const isBusinessHours = currentTimeInMinutes >= startInMinutes && currentTimeInMinutes <= endInMinutes;

      if (isBusinessHours) {
        const { data: clientesInsistencia, error: insistenciaError } = await supabase
          .from('clientes')
          .select('id, name, phone, attendant_id, status, insistencia_count, connected_instance')
          .in('status', autoReplyStatuses)
          .eq('ai_enabled', true);

        if (clientesInsistencia && clientesInsistencia.length > 0) {
          let processedInsistencia = 0;
          for (const client of clientesInsistencia) {
            if (processedInsistencia >= 5) break;
            const cleanedClientPhone = client.phone ? client.phone.replace(/\D/g, '') : '';
            if (cleanedClientPhone && activeInternalPhones.includes(cleanedClientPhone)) continue; // Ignora números internos
            try {
              const clientSettings = settingsByAttendant[client.attendant_id] || fallbackSettings;
              
              const baseInstance = client.attendant_id ? `user_${client.attendant_id}` : 'user_default';
              const instanceName = (client.connected_instance && openInstancesMap[client.connected_instance]) 
                ? client.connected_instance 
                : openInstancesMap[baseInstance];

              if (!instanceName) continue; // Instância não está online

              const allowedInstances = clientSettings.recovery_instances || [];
              const isRecoveryEnabled = allowedInstances.includes(instanceName);
              
              if (!isRecoveryEnabled) {
                continue; // Pula se a recuperação/insistência estiver desativada para esta instância
              }

              const followUpIntervalHours = clientSettings.followup_interval_hours || 24;
              const maxRepetitions = clientSettings.insistencia_max_repetitions || 3;
              const daysInterval = clientSettings.insistencia_days_interval || 2;
              
              const currentInsistenciaCount = client.insistencia_count || 0;

              const { data: lastMessage } = await supabase
                .from('mensagens')
                .select('sender, timestamp')
                .eq('client_id', client.id)
                .order('timestamp', { ascending: false })
                .limit(1)
                .single();

              // Só insiste se a última mensagem tiver sido da IA/vendedor
              if (lastMessage && lastMessage.sender === 'attendant') {
                const messageTime = new Date(lastMessage.timestamp).getTime();
                const now = new Date().getTime();
                const diffHours = (now - messageTime) / (1000 * 60 * 60);
                const diffMinutes = (now - messageTime) / (1000 * 60);
                const diffDays = diffHours / 24;

                let shouldInsist = false;
                let aiContextOverride = 'INSISTENCIA_HORAS';
                
                const cadences = clientSettings.insistencia_cadences || [];
                const useGlobalStrategy = clientSettings.use_global_insistence_strategy || false;
                
                if (cadences.length > 0 && !useGlobalStrategy) {
                  // Custom cadences logic
                  if (currentInsistenciaCount < cadences.length) {
                    const currentCadence = cadences[currentInsistenciaCount];
                    // waitHours is now treated as MINUTES according to new requirements
                    if (diffMinutes >= (currentCadence.waitHours || 60)) {
                      shouldInsist = true;
                      if (currentCadence.text && currentCadence.text.trim()) {
                        aiContextOverride = `INSISTENCIA_CUSTOM|${currentCadence.text.trim()}`;
                      }
                    }
                  } else {
                    // Exhausted custom cadences, fallback to days
                    if (diffDays >= daysInterval) {
                      shouldInsist = true;
                    }
                  }
                } else {
                  // Original global logic (now with fallback to cadences)
                  if (currentInsistenciaCount < maxRepetitions) {
                    if (diffMinutes >= followUpIntervalHours) {
                      shouldInsist = true;
                    }
                  } else {
                    // Após atingir o limite global, entra nas cadências personalizadas (se existirem)
                    if (cadences.length > 0) {
                      const cadenceIndex = currentInsistenciaCount - maxRepetitions;
                      if (cadenceIndex < cadences.length) {
                        const currentCadence = cadences[cadenceIndex];
                        if (diffMinutes >= (currentCadence.waitHours || 60)) {
                          shouldInsist = true;
                          if (currentCadence.text && currentCadence.text.trim()) {
                            aiContextOverride = `INSISTENCIA_CUSTOM|${currentCadence.text.trim()}`;
                          }
                        }
                      } else {
                        // Se esgotar as cadências personalizadas também, cai nos dias
                        if (diffDays >= daysInterval) {
                          shouldInsist = true;
                        }
                      }
                    } else {
                      // Após atingir o limite em minutos e sem cadências, passa a insistir por dias
                      if (diffDays >= daysInterval) {
                        shouldInsist = true;
                      }
                    }
                  }
                }

                if (shouldInsist) {
                  // 1. Lock Optimista para prevenir disparos concorrentes
                  const { data: lockClient, error: lockError } = await supabase
                    .from('clientes')
                    .update({ insistencia_count: currentInsistenciaCount + 1, updated_at: new Date().toISOString() })
                    .eq('id', client.id)
                    .eq('insistencia_count', currentInsistenciaCount)
                    .select('id');

                  if (lockError || !lockClient || lockClient.length === 0) {
                    console.log(`[Insistencia] Concorrência evitada para cliente ${client.id}`);
                    continue;
                  }

                  processedInsistencia++;
                  const aiResponse = await generateAIResponse(client.id, supabase, aiContextOverride, clientSettings);
                  const generatedText = aiResponse?.text;

                  if (generatedText) {
                    const cleanText = generatedText.replace(/\[SEPARAR\]/g, '').trim();

                    const { error: msgError } = await supabase.from('mensagens').insert({ client_id: client.id, text: cleanText, sender: 'attendant', read: true });
                    if (msgError) {
                      console.error(`Erro ao salvar mensagem de insistencia para cliente ${client.id}:`, msgError);
                      // Rollback lock
                      await supabase.from('clientes').update({ insistencia_count: currentInsistenciaCount, updated_at: new Date().toISOString() }).eq('id', client.id);
                      continue; // Pula se o DB falhar
                    }

                    const apiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL;
                    const apiKey = process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || process.env.EVOLUTION_API_KEY;
                    
                    if (apiUrl && apiKey && client.phone) {
                      const cleanedPhone = client.phone.replace(/\D/g, '');
                      await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                        body: JSON.stringify({ number: cleanedPhone, text: cleanText }),
                      });
                    }
                    results.followUpsEnviados++;
                  } else {
                    // Rollback lock se IA falhou
                    await supabase.from('clientes').update({ insistencia_count: currentInsistenciaCount, updated_at: new Date().toISOString() }).eq('id', client.id);
                  }
                }
              }
            } catch (err) {
              console.error(`Erro ao processar insistencia para cliente ${client.id}:`, err);
            }
          }
        }
      }

      // ========================================================
      // LÓGICA 4: PÓS-VENDA / REPOSIÇÃO
      // ========================================================
      const { data: clientesFinalizados, error: finalizadosError } = await supabase
        .from('clientes')
        .select('id, name, phone, attendant_id, status, purchase_date, custom_reposicao_date, ai_enabled, connected_instance')
        .in('status', ['Finalizado', 'Reposição'])
        .eq('ai_enabled', true);

      if (clientesFinalizados && clientesFinalizados.length > 0) {
        let processedFinalizados = 0;
        for (const client of clientesFinalizados) {
          if (processedFinalizados >= 5) break;
          const cleanedClientPhone = client.phone ? client.phone.replace(/\D/g, '') : '';
          if (cleanedClientPhone && activeInternalPhones.includes(cleanedClientPhone)) continue; // Ignora números internos
          try {
            const clientSettings = settingsByAttendant[client.attendant_id] || { reposicao_days_global: 30 };
            const reposicaoDays = clientSettings.reposicao_days_global || 30;
            
            let shouldRepor = false;
            const now = new Date();
            now.setHours(0, 0, 0, 0); // Ignore time for days calculation
            
            if (client.custom_reposicao_date) {
              const customDate = new Date(client.custom_reposicao_date);
              customDate.setHours(0, 0, 0, 0);
              if (now.getTime() >= customDate.getTime()) {
                shouldRepor = true;
              }
            } else if (client.purchase_date) {
              const purchaseDate = new Date(client.purchase_date);
              purchaseDate.setDate(purchaseDate.getDate() + reposicaoDays);
              purchaseDate.setHours(0, 0, 0, 0);
              
              if (now.getTime() >= purchaseDate.getTime()) {
                shouldRepor = true;
              }
            }

            if (shouldRepor) {
              // Verifica se já mandou mensagem de reposição nos últimos 3 dias para não floodar
              const { data: recentMsgs } = await supabase
                .from('mensagens')
                .select('timestamp')
                .eq('client_id', client.id)
                .eq('sender', 'attendant')
                .order('timestamp', { ascending: false })
                .limit(1)
                .single();

              let sentRecently = false;
              if (recentMsgs) {
                const msgDate = new Date(recentMsgs.timestamp);
                const diffDays = (new Date().getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24);
                if (diffDays < 3) {
                  sentRecently = true;
                }
              }

              if (!sentRecently && isBusinessHours) {
                // Move para Reposição se estiver Finalizado e devolve o controle para a IA
                if (client.status === 'Finalizado') {
                  await supabase.from('clientes').update({ status: 'Reposição', needs_human: false }).eq('id', client.id);
                  await supabase.from('history').insert({
                    client_id: client.id,
                    type: 'status_change',
                    description: `Status alterado de Finalizado para Reposição automaticamente. Controle retornado para a IA.`,
                    from_status: 'Finalizado',
                    to_status: 'Reposição'
                  });
                } else {
                  // Se já estiver em Reposição, apenas devolve o controle
                  await supabase.from('clientes').update({ needs_human: false }).eq('id', client.id);
                }

                // Injeta contexto pra IA e manda mensagem de reposição
                processedFinalizados++;
                const aiResponseText = await generateAIResponse(client.id, supabase, "REPOSICAO");

                if (aiResponseText) {
                  const { error: msgError } = await supabase.from('mensagens').insert({ client_id: client.id, text: aiResponseText, sender: 'attendant', read: true });
                  if (msgError) {
                    console.error(`Erro ao salvar reposicao para cliente ${client.id}:`, msgError);
                    continue; // Pula se o DB falhar
                  }

                  // Limpa a data de custom_reposicao_date para não disparar todo dia (o vendedor precisa remarcar se quiser)
                  const { error: updateError } = await supabase.from('clientes').update({ custom_reposicao_date: null, updated_at: new Date().toISOString() }).eq('id', client.id);
                  if (updateError) {
                    console.error(`Erro ao atualizar custom_reposicao_date para cliente ${client.id}:`, updateError);
                    continue; // Pula se o DB falhar
                  }

                  const apiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL;
                  const apiKey = process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || process.env.EVOLUTION_API_KEY;
                  
                  if (apiUrl && apiKey && client.phone) {
                    const cleanedPhone = client.phone.replace(/\D/g, '');
                    const baseInstance = client.attendant_id ? `user_${client.attendant_id}` : 'user_default';
                    const instanceName = (client.connected_instance && openInstancesMap[client.connected_instance]) 
                      ? client.connected_instance 
                      : openInstancesMap[baseInstance];
                    if (!instanceName) continue;
                    
                    await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                      body: JSON.stringify({ number: cleanedPhone, text: aiResponseText }),
                    });
                  }
                  results.followUpsEnviados++;
                }
              }
            }
          } catch (err) {
            console.error(`Erro ao processar reposição para cliente ${client.id}:`, err);
          }
        }
      }

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error('Erro na automação de CRON:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
