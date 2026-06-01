// Force recompile
import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = session.user.id;
    const instanceName = `user_${userId}`;
    const apiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL;
    const apiKey = process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || process.env.EVOLUTION_API_KEY;

    if (!apiUrl || !apiKey) {
      return NextResponse.json({ error: 'Configuração da API ausente no servidor' }, { status: 500 });
    }

    // Attempt to create the instance and get the QR Code
    let response = await fetch(`${apiUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        instanceName: instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    });

    let data = await response.json();

    // Stringify the entire error response to reliably detect the error message regardless of API structure
    const isAlreadyInUse = JSON.stringify(data).includes('already in use');

    // If it already exists, fetch the connection QR code for the existing instance
    if (!response.ok && isAlreadyInUse) {
      response = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': apiKey,
        }
      });
      data = await response.json();
    } else if (!response.ok) {
      // If there is another error
      return NextResponse.json({ error: data.response?.message || data.message || 'Erro ao gerar QR Code' }, { status: response.status });
    }

    // --- CONFIGURAÇÃO AUTOMÁTICA DO WEBHOOK ---
    try {
      // Pega a origem do servidor atual (ex: http://localhost:3000 ou https://meu-crm.com)
      const baseUrl = new URL(request.url).origin;
      // Forçando a URL do túnel do Cloudflare para testes do webhook
      const webhookUrl = `https://pamela-renaissance-purchase-mil.trycloudflare.com/api/webhook/whatsapp`;
      
      await fetch(`${apiUrl}/webhook/set/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey,
        },
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: webhookUrl,
            webhookByEvents: false,
            events: [
              "MESSAGES_UPSERT"
            ]
          }
        }),
      });
      console.log(`Webhook configurado com sucesso para a instância ${instanceName}`);
    } catch (webhookError) {
      console.error('Erro ao configurar webhook:', webhookError);
      // Não bloqueia o retorno do QR Code, apenas loga o erro
    }
    // ------------------------------------------

    // Evolution API returns base64 in different formats depending on the endpoint (create vs connect)
    const base64Qr = data.qrcode?.base64 || data.base64;

    if (base64Qr) {
      return NextResponse.json({ success: true, qrcode: base64Qr });
    }

    return NextResponse.json({ success: true, message: 'Instância conectada ou QR não disponível', data });

  } catch (error: any) {
    console.error('Erro na rota do QR Code:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
