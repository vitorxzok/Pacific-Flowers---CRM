import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateAIResponse } from '@/lib/openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: Request) {
  try {
    const { pwd, daysAgo } = await request.json();

    if (pwd !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!daysAgo || isNaN(Number(daysAgo))) {
      return NextResponse.json({ error: 'Invalid daysAgo parameter' }, { status: 400 });
    }

    const days = Number(daysAgo);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar configurações globais/por atendente para injetar no gerador de AI, se necessário
    const { data: usersData } = await supabase.auth.admin.listUsers();
    const settingsByAttendant: Record<string, any> = {};
    if (usersData && usersData.users) {
      for (const u of usersData.users) {
        if (u.user_metadata?.crm_settings) {
          settingsByAttendant[u.id] = u.user_metadata.crm_settings;
        }
      }
    }

    // Calcular data de corte
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - days);
    const targetIsoDate = targetDate.toISOString();

    // Buscar clientes ativos
    const activeStatuses = ['Novo', 'Contato Feito', 'Em Qualificação', 'Proposta Enviada'];
    const { data: activeClients, error: clientsError } = await supabase
      .from('clientes')
      .select('id, name, phone, attendant_id, status')
      .in('status', activeStatuses)
      .eq('ai_enabled', true)
      // Modificados há N dias ou menos (ou criados) para reativar
      .gte('updated_at', targetIsoDate);

    if (clientsError || !activeClients) {
      throw clientsError || new Error('Failed to fetch clients');
    }

    let reactivatedCount = 0;
    const errors: string[] = [];

    // Para cada cliente ativo nesse período
    for (const client of activeClients) {
      try {
        // Verificar a última mensagem
        const { data: lastMessage } = await supabase
          .from('mensagens')
          .select('sender, timestamp')
          .eq('client_id', client.id)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();

        // Só tenta reativar se a ÚLTIMA MENSAGEM foi do atendente (vácuo)
        if (lastMessage && lastMessage.sender === 'attendant') {
          // Checar se a mensagem realmente foi enviada HÁ PELO MENOS 1 dia para não incomodar prematuramente
          const messageTime = new Date(lastMessage.timestamp).getTime();
          const now = new Date().getTime();
          const diffHours = (now - messageTime) / (1000 * 60 * 60);

          if (diffHours >= 12) { // Pelo menos 12h sem resposta (vácuo real)
            const clientSettings = settingsByAttendant[client.attendant_id] || {};
            const contextOverride = `REACTIVATION|${days}`;
            
            const aiResponseText = await generateAIResponse(client.id, supabase, contextOverride, clientSettings);

            if (aiResponseText) {
              await supabase.from('mensagens').insert({
                client_id: client.id,
                text: aiResponseText,
                sender: 'attendant',
                read: true
              });

              // Send via Evolution API
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
              
              reactivatedCount++;
            }
          }
        }
      } catch (clientErr: any) {
        console.error(`Erro ao processar reativação para cliente ${client.id}:`, clientErr);
        errors.push(`Cliente ${client.name || client.id}: ${clientErr.message}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      reactivatedCount,
      totalEvaluated: activeClients.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (err: any) {
    console.error('Retroactive cadence error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
