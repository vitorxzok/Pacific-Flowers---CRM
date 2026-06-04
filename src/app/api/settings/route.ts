import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  try {
    const supabaseServer = await createServerClient();
    const { data: { session } } = await supabaseServer.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient(supabaseUrl, supabaseKey);
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(session.user.id);
    
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const settings = userData.user.user_metadata?.crm_settings || {};
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
    const adminClient = createAdminClient(supabaseUrl, supabaseKey);
    
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(session.user.id);
    
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { error } = await adminClient.auth.admin.updateUserById(session.user.id, {
      user_metadata: {
        ...userData.user.user_metadata,
        crm_settings: body
      }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
