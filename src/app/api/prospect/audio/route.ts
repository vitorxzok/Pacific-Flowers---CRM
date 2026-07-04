import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateAudio } from '@/lib/openai-audio';

// Endpoint para envio de prospecção ativa via áudio (Voice Note)
// POST /api/prospect/audio
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clientIds, promptTemplate, sellerId } = body;

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json({ error: 'Nenhum cliente selecionado.' }, { status: 400 });
    }

    if (!promptTemplate) {
      return NextResponse.json({ error: 'Nenhum prompt fornecido.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar configurações do vendedor para pegar a URL e Key da Evolution API e a Instance
    const { data: settings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', sellerId)
      .single();

    if (!settings) {
      return NextResponse.json({ error: 'Configurações do vendedor não encontradas.' }, { status: 400 });
    }

    const apiUrl = settings.evolution_api_url || process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL;
    const apiKey = settings.evolution_api_key || process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || process.env.EVOLUTION_API_KEY;
    const instanceName = settings.evolution_instance_name || `user_${sellerId}`;

    if (!apiUrl || !apiKey) {
      return NextResponse.json({ error: 'Credenciais da Evolution API não configuradas.' }, { status: 400 });
    }

    let successCount = 0;
    let errorCount = 0;

    for (const clientId of clientIds) {
      try {
        const { data: client } = await supabase
          .from('clientes')
          .select('*')
          .eq('id', clientId)
          .single();

        if (!client) {
          errorCount++;
          continue;
        }

        // Substituir variáveis no template (ex: {nome})
        const messageText = promptTemplate
          .replace(/{nome}/gi, client.name || 'Cliente');

        // 1. Gerar o áudio com a OpenAI TTS
        const base64Audio = await generateAudio(messageText);
        
        if (!base64Audio) {
          throw new Error('Falha ao gerar áudio TTS.');
        }

        // 2. Enviar o áudio pela Evolution API usando o endpoint sendWhatsAppAudio
        const sendUrl = `${apiUrl}/message/sendWhatsAppAudio/${instanceName}`;
        
        const evoPayload = {
          number: client.phone,
          audio: `data:audio/ogg;base64,${base64Audio}`, // Evolution API aceita base64 ou URL
          delay: 1200,
          encoding: true // Força o envio como Voice Note (PTT)
        };

        const response = await fetch(sendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': apiKey
          },
          body: JSON.stringify(evoPayload)
        });

        if (!response.ok) {
          const errData = await response.text();
          console.error(`Erro ao enviar áudio para ${client.name} (${client.phone}):`, errData);
          throw new Error('Falha na Evolution API');
        }

        // 3. Registrar a mensagem no banco de dados (como se o atendente tivesse enviado o áudio)
        await supabase
          .from('mensagens')
          .insert({
            client_id: client.id,
            text: `[ÁUDIO ENVIADO] ${messageText}`,
            sender: 'attendant',
            timestamp: new Date().toISOString()
          });

        successCount++;
        
        // Pausa de 2 segundos entre envios para evitar bloqueios/limitações da API
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        console.error(`Erro processando cliente ${clientId}:`, err);
        errorCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Prospecção concluída. Sucessos: ${successCount}. Erros: ${errorCount}.` 
    });

  } catch (error: any) {
    console.error('Erro na rota de prospect/audio:', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
