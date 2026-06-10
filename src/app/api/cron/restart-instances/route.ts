import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Opcional: Proteger a rota com um token secreto se não estiver usando Vercel Cron.
  // const authHeader = request.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new Response('Unauthorized', { status: 401 });
  // }

  console.log('[Cron] Iniciando restart automático das instâncias do WhatsApp...');

  const apiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL || '';
  const apiKey = process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || process.env.EVOLUTION_API_KEY || '';

  if (!apiUrl || !apiKey) {
    console.error('[Cron] EVOLUTION API URL ou KEY não configurada.');
    return NextResponse.json({ error: 'Configuração da Evolution API ausente.' }, { status: 500 });
  }

  try {
    // 1. Obter todas as instâncias
    const instancesRes = await fetch(`${apiUrl}/instance/fetchInstances`, {
      headers: { 'apikey': apiKey }
    });
    
    if (!instancesRes.ok) {
      throw new Error(`Erro ao buscar instâncias: ${instancesRes.statusText}`);
    }

    const instances = await instancesRes.json();
    let restarted = 0;

    // 2. Iterar e reiniciar apenas as que estão 'open' ou 'connecting'
    for (const inst of instances) {
      if (inst.connectionStatus === 'open' || inst.connectionStatus === 'connecting') {
        console.log(`[Cron] Reiniciando instância: ${inst.name}`);
        await fetch(`${apiUrl}/instance/restart/${inst.name}`, {
          method: 'POST',
          headers: { 'apikey': apiKey }
        }).catch(err => console.error(`[Cron] Erro ao reiniciar ${inst.name}:`, err));
        
        restarted++;
        
        // Evitar rate limiting dando um pequeno delay entre restarts
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    console.log(`[Cron] Finalizado. ${restarted} instâncias reiniciadas.`);
    return NextResponse.json({ success: true, restarted });

  } catch (error: any) {
    console.error('[Cron] Erro geral ao reiniciar instâncias:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
