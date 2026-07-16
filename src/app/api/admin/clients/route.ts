import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminPassword } from '@/lib/adminAuth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const password = searchParams.get('pwd');

    if (!password || !(await verifyAdminPassword(password))) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('clientes')
      .select('*, profiles(name), cliente_tags(tags(name, color))')
      .neq('status', 'SYSTEM');

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
      connected_instance: c.connected_instance || undefined,
      storeName: c.store_name || '',
      purchaseValue: c.purchase_value ? Number(c.purchase_value) : undefined,
      purchaseDate: c.purchase_date || undefined,
      insistencia_count: c.insistencia_count || 0,
      needs_human: c.needs_human,
      is_exported: c.is_exported || false,
      messages: c.last_message_at ? [{
        id: 'dummy',
        text: 'Última interação',
        sender: 'client',
        timestamp: c.last_message_at,
        read: true,
      }] : [],
      history: [],
      created_at: c.created_at,
      updated_at: c.updated_at,
      last_message_at: c.last_message_at,
    }));

    return NextResponse.json({ clients: formattedClients });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
