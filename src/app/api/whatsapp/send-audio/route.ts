import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const clientId = formData.get('clientId') as string;
    const phone = formData.get('phone') as string;
    const audioFile = formData.get('audio') as File;

    if (!clientId || !phone || !audioFile) {
      return NextResponse.json({ error: 'Dados incompletos (clientId, phone, audio são obrigatórios)' }, { status: 400 });
    }

    // Buscar o vendedor (attendant_id) associado a este cliente
    const { data: clientData, error: clientError } = await supabase
      .from('clientes')
      .select('attendant_id, connected_instance, status')
      .eq('id', clientId)
      .single();

    if (clientError || !clientData) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    // Usamos a instância associada ao vendedor que capturou o lead
    const sellerId = clientData.attendant_id || session.user.id;
    const instanceName = clientData.connected_instance || `user_${sellerId}_1`;

    const apiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL;
    const apiKey = process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || process.env.EVOLUTION_API_KEY;

    if (!apiUrl || !apiKey) {
      return NextResponse.json({ error: 'Configuração da API ausente no servidor' }, { status: 500 });
    }

    // Limpar o telefone para o padrão WhatsApp
    const cleanedPhone = phone.replace(/\D/g, '');

    // Convert File to base64
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Audio = buffer.toString('base64');
    
    const evoPayload = {
      number: cleanedPhone,
      audio: `data:${audioFile.type || 'audio/ogg'};base64,${base64Audio}`,
      delay: 1200,
      encoding: true // Força o envio como Voice Note (PTT)
    };

    const sendUrl = `${apiUrl}/message/sendWhatsAppAudio/${instanceName}`;
    const response = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify(evoPayload)
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.response?.message || data.message || 'Erro ao enviar áudio' }, { status: response.status });
    }

    // Registrar no banco de dados
    await supabase.from('mensagens').insert({
      client_id: clientId,
      text: `[Áudio enviado]`,
      sender: 'attendant',
      read: true
    });

    // Desativar a IA pois o humano interveio enviando áudio
    let targetStatus = clientData.status || 'Novo';
    if (targetStatus === 'Novo') {
      targetStatus = 'Contato Feito';
    }
    
    await supabase.from('clientes').update({ 
      ai_enabled: false, 
      needs_human: false,
      has_unread_messages: false,
      status: targetStatus,
      updated_at: new Date().toISOString()
    }).eq('id', clientId);

    return NextResponse.json({ success: true, message: 'Áudio enviado com sucesso' });

  } catch (error: any) {
    console.error('Erro na rota send-audio:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
