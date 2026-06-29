import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const evoApiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL;
    const evoApiKey = process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || process.env.EVOLUTION_API_KEY;

    if (!evoApiUrl || !evoApiKey) {
      return NextResponse.json({ error: 'Evolution API não configurada' }, { status: 500 });
    }

    const res = await fetch(`${evoApiUrl}/instance/fetchInstances`, {
      headers: { 'apikey': evoApiKey }
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Falha ao buscar instâncias' }, { status: res.status });
    }

    const instances = await res.json();
    
    // Filtramos apenas as instâncias que têm dados úteis e mapeamos para o front
    const mappedInstances = instances.map((inst: any) => ({
      name: inst.name || '',
      profileName: inst.profileName || 'Desconhecido',
      phone: inst.ownerJid ? inst.ownerJid.split('@')[0] : '',
      status: inst.connectionStatus || 'desconhecido'
    }));

    return NextResponse.json({ instances: mappedInstances });
  } catch (error: any) {
    console.error('Error fetching evolution instances:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
