import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const password = searchParams.get('pwd');

    // Senha hardcoded solicitada pelo usuário
    if (password !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('clientes')
      .select('*, profiles(name), cliente_tags(tags(name, color)), mensagens(*)');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // O mesmo formato usado no store para os clientes
    const formattedClients = data.map((c: any) => ({
      id: c.id,
      name: c.name || 'Desconhecido',
      phone: c.phone || '',
      email: c.email || '',
      status: c.status,
      tags: c.cliente_tags ? c.cliente_tags.map((ct: any) => ct.tags?.name).filter(Boolean) : [],
      attendant: c.profiles?.name || '',
      avatarUrl: undefined,
      notes: c.notes || '',
      ai_enabled: c.ai_enabled !== false,
      messages: c.mensagens ? c.mensagens.map((m: any) => ({
        id: m.id,
        text: m.text,
        sender: m.sender === 'client' ? 'client' : m.sender,
        timestamp: m.timestamp || new Date().toISOString(),
        read: m.read || true,
      })) : [],
      history: c.mensagens ? c.mensagens.map((m: any) => ({
        id: m.id,
        type: 'message',
        date: m.timestamp || new Date().toISOString(),
        description: `Mensagem: ${m.text}`
      })) : [],
    }));

    return NextResponse.json({ clients: formattedClients });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
