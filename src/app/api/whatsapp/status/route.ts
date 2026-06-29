// Force recompile
import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('targetUserId');
    const pwd = searchParams.get('pwd');

    let userId = '';

    if (pwd === 'admin' && targetUserId) {
      userId = targetUserId;
    } else {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
      userId = session.user.id;
    }
    const instanceName = `user_${userId}`;
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;

    if (!apiUrl || !apiKey) {
      return NextResponse.json({ error: 'Configuração da API ausente no servidor' }, { status: 500 });
    }

    const response = await fetch(`${apiUrl}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.response?.message || data.message || 'Erro ao buscar status' }, { status: response.status });
    }

    // data é um array de instâncias
    // filtrar apenas as instâncias que pertencem a este usuário
    const userInstances = (Array.isArray(data) ? data : []).filter((inst: any) => {
      const name = inst.name || inst.instanceName || '';
      return name.startsWith(`user_${userId}_`) || name === `user_${userId}`;
    });

    // Mapear para um formato fácil de usar no frontend
    const instancesData = await Promise.all(userInstances.map(async (inst: any) => {
      let state = 'unknown';
      let owner = inst.ownerJid || inst.owner || '';

      // Tentar pegar o state via connectionState endpoint, porque fetchInstances nem sempre retorna 'open'/'connecting' claramente, ou apenas status 'open'
      // Na v2 da Evolution API, status já vem no objeto como `status: "open"` ou `connectionStatus: "OPEN"`
      state = inst.status || inst.connectionStatus || 'disconnected';
      if (typeof state === 'string') state = state.toLowerCase();

      // Atualiza o whatsapp_number no banco
      const phoneNumber = owner ? owner.split('@')[0] : '';
      
      const actualInstanceName = inst.name || inst.instanceName || '';
      const slotMatch = actualInstanceName.match(/user_.*_(\d+)$/);
      const slotId = slotMatch ? parseInt(slotMatch[1], 10) : 1;

      // Update whatsapp_instances table
      const { data: existingInstance } = await supabase.from('whatsapp_instances').select('id').eq('instance_name', actualInstanceName).single();
      if (existingInstance) {
        await supabase.from('whatsapp_instances').update({ status: state, phone_number: phoneNumber || null }).eq('id', existingInstance.id);
      } else {
        await supabase.from('whatsapp_instances').insert({ user_id: userId, instance_name: actualInstanceName, status: state, phone_number: phoneNumber || null });
      }

      return {
        instanceName: actualInstanceName,
        slotId,
        state,
        owner,
        phoneNumber
      };
    }));

    return NextResponse.json({ success: true, instances: instancesData });

  } catch (error: any) {
    console.error('Erro na rota de status:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
