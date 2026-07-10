import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const adminClient = createAdminClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function GET() {
  try {
    const supabaseServer = await createServerClient();
    const { data: { session } } = await supabaseServer.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: settingsClient, error } = await adminClient
      .from('clientes')
      .select('notes')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .single();
    
    if (error || !settingsClient) {
      return NextResponse.json({});
    }

    let settings: any = {};
    try {
      settings = typeof settingsClient.notes === 'string' 
        ? JSON.parse(settingsClient.notes || '{}') 
        : (settingsClient.notes || {});
    } catch (e) {}

    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabaseServer = await createServerClient();
    const { data: { session } } = await supabaseServer.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    const { data: settingsClient, error: fetchErr } = await adminClient
      .from('clientes')
      .select('notes')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .single();

    let currentSettings: any = {};
    if (!fetchErr && settingsClient) {
      try {
        currentSettings = typeof settingsClient.notes === 'string' 
          ? JSON.parse(settingsClient.notes || '{}') 
          : (settingsClient.notes || {});
      } catch (e) {}
    }

    const newSettings = {
      ...currentSettings,
      ...body,
      use_global_insistence_strategy: body.use_global_insistence_strategy
    };

    const { error: updateErr } = await adminClient
      .from('clientes')
      .update({ notes: JSON.stringify(newSettings) })
      .eq('id', '00000000-0000-0000-0000-000000000000');

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
