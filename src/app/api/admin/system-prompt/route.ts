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

    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    
    // Find the first user that has systemPrompt, or return empty
    let systemPrompt = '';
    for (const user of users) {
      if (user.user_metadata?.crm_settings?.systemPrompt) {
        systemPrompt = user.user_metadata.crm_settings.systemPrompt;
        break;
      }
    }
    
    return NextResponse.json({ systemPrompt });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { password, systemPrompt } = await request.json();
    if (password !== 'admin') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Update ALL users
    for (const user of users) {
      const currentSettings = user.user_metadata?.crm_settings || {};
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          crm_settings: {
            ...currentSettings,
            systemPrompt
          }
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
