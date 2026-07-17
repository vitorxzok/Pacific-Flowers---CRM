import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: Request) {
  try {
    const supabaseServer = await createServerClient();
    const { data: { session } } = await supabaseServer.auth.getSession();
    
    // Auth check - Optional depending on your setup. If using password, we can bypass strict RLS or verify here.
    // Assuming the admin page is protected, we can proceed.
    
    const adminClient = createAdminClient(supabaseUrl, supabaseKey);
    const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers();
    
    if (usersError || !usersData.users) {
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    const { data: instancesData } = await supabaseServer
      .from('whatsapp_instances')
      .select('instance_name, phone_number, status');

    const usersList = usersData.users.map(u => {
      const crmSettings = u.user_metadata?.crm_settings || {};
      const userInstances = instancesData?.filter(i => i.instance_name.startsWith(`user_${u.id}`)) || [];
      
      return {
        id: u.id,
        name: u.user_metadata?.name || 'Vendedor Sem Nome',
        email: u.email,
        auto_reply_enabled: crmSettings.auto_reply_enabled || false,
        recovery_enabled: crmSettings.recovery_enabled || false,
        recovery_instances: crmSettings.recovery_instances || [],
        visible_password: u.user_metadata?.visible_password || '',
        instances: userInstances.map(i => ({
          name: i.instance_name,
          phone: i.phone_number,
          status: i.status
        }))
      };
    });
    
    return NextResponse.json({ users: usersList });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabaseServer = await createServerClient();
    const { data: { session } } = await supabaseServer.auth.getSession();
    
    const { userId, enabled, recovery_enabled, toggle_recovery_instance, password, name } = await request.json();
    
    if (!userId) {
       return NextResponse.json({ error: 'UserId required' }, { status: 400 });
    }
    
    const adminClient = createAdminClient(supabaseUrl, supabaseKey);
    
    const { data: userData, error: fetchError } = await adminClient.auth.admin.getUserById(userId);
    if (fetchError || !userData?.user) {
       return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const currentMeta = userData.user.user_metadata || {};
    const currentSettings = currentMeta.crm_settings || {};
    
    let newRecoveryInstances = currentSettings.recovery_instances || [];
    if (toggle_recovery_instance) {
      const { instanceName, enabled: instanceEnabled } = toggle_recovery_instance;
      if (instanceEnabled) {
        if (!newRecoveryInstances.includes(instanceName)) {
          newRecoveryInstances.push(instanceName);
        }
      } else {
        newRecoveryInstances = newRecoveryInstances.filter((name: string) => name !== instanceName);
      }
    }
    
    const updatedMetadata = {
      ...currentMeta,
      ...(name && { name: name }),
      ...(password && password.trim() !== '' && { visible_password: password }),
      crm_settings: {
        ...currentSettings,
        ...(enabled !== undefined && { auto_reply_enabled: enabled }),
        ...(recovery_enabled !== undefined && { recovery_enabled: recovery_enabled }),
        ...(toggle_recovery_instance && { recovery_instances: newRecoveryInstances }),
        ...(name && { businessName: name })
      }
    };

    const updatePayload: any = {
      user_metadata: updatedMetadata
    };

    if (password && password.trim() !== '') {
      updatePayload.password = password;
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, updatePayload);

    if (updateError) throw updateError;
    
    return NextResponse.json({ success: true, userId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
