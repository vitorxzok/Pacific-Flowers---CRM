import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { verifyAdminPassword } from '@/lib/adminAuth';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    let userId = '';

    if (body.pwd && (await verifyAdminPassword(body.pwd)) && body.targetUserId) {
      userId = body.targetUserId;
    } else {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
      userId = session.user.id;
    }

    const slotId = body.slotId || 1;
    // Usa o instanceName exato se enviado do frontend (para suportar instâncias antigas sem _slotId)
    const instanceName = body.instanceName || `user_${userId}_${slotId}`;

    const apiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL;
    const apiKey = process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || process.env.EVOLUTION_API_KEY;

    if (!apiUrl || !apiKey) {
      return NextResponse.json({ error: 'Configuração da API ausente no servidor' }, { status: 500 });
    }

    // Call Evolution API to logout and delete instance
    const logoutResponse = await fetch(`${apiUrl}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': apiKey,
      },
    });

    // Even if logout fails, try to delete
    const deleteResponse = await fetch(`${apiUrl}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': apiKey,
      },
    });

    if (!deleteResponse.ok) {
      const data = await deleteResponse.json();
      console.warn('Erro ao deletar instância na API Evolution, forçando limpeza no banco:', data.response?.message || 'Unknown');
    }

    // Update the database to set status as disconnected
    await supabase.from('whatsapp_instances').delete().eq('instance_name', instanceName);

    return NextResponse.json({ success: true, message: 'Instância desconectada e deletada' });

  } catch (error: any) {
    console.error('Erro na rota de disconnect:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
