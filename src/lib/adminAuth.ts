import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) return false;

    let currentAdminPwd = 'admin';
    for (const u of users || []) {
      if (u.user_metadata?.crm_settings?.admin_password) {
        currentAdminPwd = u.user_metadata.crm_settings.admin_password;
        break;
      }
    }

    return password === currentAdminPwd;
  } catch {
    return false;
  }
}
