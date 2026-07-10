import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { verifyAdminPassword } from '@/lib/adminAuth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    if (!password || !(await verifyAdminPassword(password))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    
    // Use service role key to bypass RLS and update all clients
    const adminClient = createAdminClient(supabaseUrl, supabaseKey);
    
    const { error: updateError } = await adminClient
      .from('clientes')
      .update({ ai_enabled: true })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
