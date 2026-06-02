// Force recompile
import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = session.user.id;
    const instanceName = `user_${userId}`;
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;

    if (!apiUrl || !apiKey) {
      return NextResponse.json({ error: 'Configuração da API ausente no servidor' }, { status: 500 });
    }

    const response = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.response?.message || data.message || 'Erro ao buscar status' }, { status: response.status });
    }

    // Evolution API typically returns { instance: { state: "open" } } or similar
    const state = data.instance?.state || data.state || 'unknown';

    if (state === 'open') {
      // Try to get the owner (phone number) from another endpoint if it's connected
      const fetchInfo = await fetch(`${apiUrl}/instance/fetchInstances?instanceName=${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': apiKey,
        },
      });
      const infoData = await fetchInfo.json();
      
      let owner = '';
      if (Array.isArray(infoData) && infoData.length > 0) {
        owner = infoData[0].owner || ''; // Formato esperado: 554199999999@s.whatsapp.net
      } else if (infoData.instance && infoData.instance.owner) {
        owner = infoData.instance.owner;
      }

      if (owner) {
        const phoneNumber = owner.split('@')[0];
        // Atualiza a tabela profiles com o whatsapp_number
        await supabase
          .from('profiles')
          .update({ whatsapp_number: phoneNumber })
          .eq('id', userId);
      }
    }

    return NextResponse.json({ success: true, state });

  } catch (error: any) {
    console.error('Erro na rota de status:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
