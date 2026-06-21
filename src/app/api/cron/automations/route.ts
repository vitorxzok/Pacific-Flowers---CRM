import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateAIResponse } from '@/lib/openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
      }
    }

    // Resultados das execuções
    const results = {
      reposicoesEnviadas: 0,
      followUpsEnviados: 0
    };

    // ========================================================
    // LÓGICA 1: REPOSIÇÃO DE ESTOQUE (25 DIAS)
    // ========================================================
    // Acha clientes no status 'Reposição' que estão lá há mais de 25 dias
    const date25DaysAgo = new Date();
    date25DaysAgo.setDate(date25DaysAgo.getDate() - 25);
    const iso25DaysAgo = date25DaysAgo.toISOString();

    const { data: clientesReposicao, error: reposicaoError } = await supabase
      .from('clientes')
      .select('id, name, phone, attendant_id')
      .eq('status', 'Reposição')
      .lte('updated_at', iso25DaysAgo);

    if (clientesReposicao && clientesReposicao.length > 0) {
      for (const client of clientesReposicao) {
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
              const instanceName = client.attendant_id ? `user_${client.attendant_id}` : 'user_default';
              
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
      .select('id, name, phone, attendant_id, status')
      .in('status', autoReplyStatuses)
      .eq('followup_sent', false)
      .eq('ai_enabled', true);

    if (clientesInativos && clientesInativos.length > 0) {
      for (const client of clientesInativos) {
        try {
          const clientSettings = settingsByAttendant[client.attendant_id] || fallbackSettings;
          
          if (!clientSettings.auto_reply_enabled) {
            continue; // Pula se a resposta rápida estiver desativada para este atendente
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
              await supabase.from('clientes').update({ followup_sent: true }).eq('id', client.id);
              const aiResponseText = await generateAIResponse(client.id, supabase, "FOLLOW_UP_INATIVIDADE");

              if (aiResponseText) {
                await supabase.from('mensagens').insert({ client_id: client.id, text: aiResponseText, sender: 'attendant', read: true });

                const apiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL;
                const apiKey = process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || process.env.EVOLUTION_API_KEY;
                
                if (apiUrl && apiKey && client.phone) {
                  const cleanedPhone = client.phone.replace(/\D/g, '');
                  const instanceName = client.attendant_id ? `user_${client.attendant_id}` : 'user_default';
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
          .select('id, name, phone, attendant_id, status, insistencia_count')
          .in('status', autoReplyStatuses)
          .eq('ai_enabled', true);

        if (clientesInsistencia && clientesInsistencia.length > 0) {
          for (const client of clientesInsistencia) {
            try {
              const clientSettings = settingsByAttendant[client.attendant_id] || fallbackSettings;
              
              if (!clientSettings.auto_reply_enabled) {
                continue; // Pula se a resposta rápida/insistência estiver desativada
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
                const diffDays = diffHours / 24;

                let shouldInsist = false;
                let aiContextOverride = 'INSISTENCIA_HORAS';
                
                const cadences = clientSettings.insistencia_cadences || [];
                
                if (cadences.length > 0) {
                  // Custom cadences logic
                  if (currentInsistenciaCount < cadences.length) {
                    const currentCadence = cadences[currentInsistenciaCount];
                    if (diffHours >= (currentCadence.waitHours || 24)) {
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
                  // Original global hours logic
                  if (currentInsistenciaCount < maxRepetitions) {
                    if (diffHours >= followUpIntervalHours) {
                      shouldInsist = true;
                    }
                  } else {
                    if (diffDays >= daysInterval) {
                      shouldInsist = true;
                    }
                  }
                }

                if (shouldInsist) {
                  const generatedText = await generateAIResponse(client.id, supabase, aiContextOverride, clientSettings);

                  if (generatedText) {
                    await supabase.from('mensagens').insert({ client_id: client.id, text: generatedText, sender: 'attendant', read: true });

                    // Incrementa o contador de insistência
                    await supabase.from('clientes').update({ insistencia_count: currentInsistenciaCount + 1, updated_at: new Date().toISOString() }).eq('id', client.id);

                    const apiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL;
                    const apiKey = process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || process.env.EVOLUTION_API_KEY;
                    
                    if (apiUrl && apiKey && client.phone) {
                      const cleanedPhone = client.phone.replace(/\D/g, '');
                      const instanceName = client.attendant_id ? `user_${client.attendant_id}` : 'user_default';
                      await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                        body: JSON.stringify({ number: cleanedPhone, text: generatedText }),
                      });
                    }
                    results.followUpsEnviados++;
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
        .select('id, name, phone, attendant_id, status, purchase_date, custom_reposicao_date, ai_enabled')
        .in('status', ['Finalizado', 'Reposição'])
        .eq('ai_enabled', true);

      if (clientesFinalizados && clientesFinalizados.length > 0) {
        for (const client of clientesFinalizados) {
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
                const aiResponseText = await generateAIResponse(client.id, supabase, "REPOSICAO");

                if (aiResponseText) {
                  await supabase.from('mensagens').insert({ client_id: client.id, text: aiResponseText, sender: 'attendant', read: true });

                  // Limpa a data de custom_reposicao_date para não disparar todo dia (o vendedor precisa remarcar se quiser)
                  await supabase.from('clientes').update({ custom_reposicao_date: null, updated_at: new Date().toISOString() }).eq('id', client.id);

                  const apiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL;
                  const apiKey = process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || process.env.EVOLUTION_API_KEY;
                  
                  if (apiUrl && apiKey && client.phone) {
                    const cleanedPhone = client.phone.replace(/\D/g, '');
                    const instanceName = client.attendant_id ? `user_${client.attendant_id}` : 'user_default';
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
