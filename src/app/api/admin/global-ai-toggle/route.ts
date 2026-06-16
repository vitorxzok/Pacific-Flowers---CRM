import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: Request) {
  try {
    const supabaseServer = await createServerClient();
    const { data: { session } } = await supabaseServer.auth.getSession();
    
    // The admin page uses its own password logic, so we bypass Supabase session check here
    // as the admin might not be logged into a normal user account.

    const { enabled } = await request.json();
    
    const adminClient = createAdminClient(supabaseUrl, supabaseKey);
    
    // Get all users
    const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers();
    
    if (usersError || !usersData.users) {
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Update each user's crm_settings.auto_reply_enabled
    const updatePromises = usersData.users.map(async (u) => {
      const currentMeta = u.user_metadata || {};
      const currentSettings = currentMeta.crm_settings || {};
      
      return adminClient.auth.admin.updateUserById(u.id, {
        user_metadata: {
          ...currentMeta,
          crm_settings: {
            ...currentSettings,
            auto_reply_enabled: enabled
          }
        }
      });
    });

    await Promise.all(updatePromises);
    
    return NextResponse.json({ success: true, count: usersData.users.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
