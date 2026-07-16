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
    const clientId = searchParams.get('clientId');

    if (!password || !(await verifyAdminPassword(password))) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!clientId) {
      return NextResponse.json({ error: 'clientId não fornecido' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('mensagens')
      .select('*')
      .eq('client_id', clientId)
      .order('timestamp', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedMessages = data.map(m => ({
      id: m.id,
      text: m.text,
      sender: m.sender === 'client' ? 'client' : m.sender,
      timestamp: m.timestamp || new Date().toISOString(),
      read: m.read || true
    }));

    return NextResponse.json({ messages: formattedMessages });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
