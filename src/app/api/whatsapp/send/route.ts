import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { clientId, text, phone } = await request.json();

    if (!clientId || !text || !phone) {
      return NextResponse.json({ error: 'Dados incompletos (clientId, text, phone são obrigatórios)' }, { status: 400 });
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
    // Se não tiver, usamos a do usuário logado como fallback (assumindo slot 1)
    const sellerId = clientData.attendant_id || session.user.id;
    const instanceName = clientData.connected_instance || `user_${sellerId}_1`;

    const apiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL;
    const apiKey = process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || process.env.EVOLUTION_API_KEY;

    if (!apiUrl || !apiKey) {
      return NextResponse.json({ error: 'Configuração da API ausente no servidor' }, { status: 500 });
    }

    // Limpar o telefone para o padrão WhatsApp (apenas números, remover +, -, espaços, parênteses)
    const cleanedPhone = phone.replace(/\D/g, '');

    // Formatar o body esperado pela Evolution API (message/sendText)
    const evolutionBody = {
      number: cleanedPhone,
      text: text,
      linkPreview: true
    };

    const response = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify(evolutionBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.response?.message || data.message || 'Erro ao enviar mensagem no WhatsApp' }, { status: response.status });
    }

    // Se enviou com sucesso pela Evolution, registramos no banco
    const { error: insertError } = await supabase.from('mensagens').insert({
      client_id: clientId,
      text: text,
      sender: 'attendant',
      read: true
    });

    if (insertError) {
      console.error('Mensagem enviada no WhatsApp, mas falhou ao salvar no banco:', insertError);
      // Não retornamos erro porque no WhatsApp já foi.
    }

    // Se o humano mandou uma mensagem pelo painel, vamos verificar se ele quer reativar a IA
    const textTrimmed = text.trim();
    if (textTrimmed.endsWith('..') && !textTrimmed.endsWith('...')) {
      await supabase.from('clientes').update({ 
        ai_enabled: true, 
        needs_human: false,
        has_unread_messages: false,
        status: 'Novo', // Mantém ou volta para a IA
        updated_at: new Date().toISOString()
      }).eq('id', clientId);
    } else {
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
    }

    return NextResponse.json({ success: true, message: 'Mensagem enviada com sucesso!' });

  } catch (error: any) {
    console.error('Erro na rota de envio do WhatsApp:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
