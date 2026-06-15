import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const password = searchParams.get('pwd');
    if (password !== 'admin') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { data, error } = await supabase.from('global_settings').select('system_prompt').eq('id', 1).single();
    if (error && error.code !== 'PGRST116') return NextResponse.json({ error: error.message }, { status: 500 });
    
    return NextResponse.json({ systemPrompt: data?.system_prompt || '' });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { password, systemPrompt } = await request.json();
    if (password !== 'admin') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { error } = await supabase.from('global_settings').upsert({ id: 1, system_prompt: systemPrompt });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
