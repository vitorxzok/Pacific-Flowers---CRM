import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateAIResponse } from '@/lib/openai';

// Essa rota pode ser chamada por um CRON Job (ex: cron-job.org ou Vercel Cron) a cada 1 minuto
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Buscar configurações do sistema
    const { data: config, error: configError } = await supabase
      .from('configuracoes')
      .select('*')
      .eq('id', 1)
      .single();

    if (configError || !config) {
      return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 500 });
    }

    const autoReplyEnabled = config.auto_reply_enabled;
    const minutesWithoutResponse = config.minutes_without_response || 5;

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
            .update({ status: 'Em Qualificação', updated_at: new Date().toISOString() })
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
    if (autoReplyEnabled) {
      // 1. Buscar clientes que estão em "Novo" ou "Contato Feito" e ainda NÃO receberam follow-up
      const { data: clientesInativos, error: inativosError } = await supabase
        .from('clientes')
        .select('id, name, phone, attendant_id, status')
        .in('status', ['Novo', 'Contato Feito'])
        .eq('followup_sent', false);

      if (clientesInativos && clientesInativos.length > 0) {
        for (const client of clientesInativos) {
          try {
            // Pegar a ÚLTIMA mensagem
            const { data: lastMessage, error: msgError } = await supabase
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

              // Se a última mensagem foi da IA, e o tempo passou do configurado
              if (diffMinutes >= minutesWithoutResponse) {
                // Marca logo como enviado para evitar spam se algo falhar no meio
                await supabase
                  .from('clientes')
                  .update({ followup_sent: true })
                  .eq('id', client.id);

                // Chama a IA com contexto de follow-up
                const aiResponseText = await generateAIResponse(client.id, supabase, "FOLLOW_UP_INATIVIDADE");

                if (aiResponseText) {
                  await supabase.from('mensagens').insert({
                    client_id: client.id,
                    text: aiResponseText,
                    sender: 'attendant',
                    read: true
                  });

                  // Envia via Evolution
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
                  results.followUpsEnviados++;
                }
              }
            }
          } catch (err) {
            console.error(`Erro ao processar follow-up para cliente ${client.id}:`, err);
          }
        }
      }
    }

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error('Erro na automação de CRON:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
