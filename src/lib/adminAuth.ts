import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    const { data: settingsClient, error } = await supabase
      .from('clientes')
      .select('notes')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .single();
    
    if (error || !settingsClient) {
      console.warn("Could not fetch global settings from dummy client. Defaulting to 'admin'.", error);
      return password === 'admin';
    }

    let currentAdminPwd = 'admin';
    try {
      const settings = typeof settingsClient.notes === 'string' 
        ? JSON.parse(settingsClient.notes) 
        : settingsClient.notes;
        
      if (settings?.admin_password) {
        currentAdminPwd = settings.admin_password;
      }
    } catch (e) {}

    return password === currentAdminPwd;
  } catch {
    return password === 'admin';
  }
}
