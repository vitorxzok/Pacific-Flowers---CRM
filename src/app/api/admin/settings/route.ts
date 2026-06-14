import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function POST(request: Request) {
  try {
    const { password, settings } = await request.json();
    if (password !== 'admin') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    for (const user of users) {
      const currentSettings = user.user_metadata?.crm_settings || {};
      
      // We merge the global settings from the admin panel into EVERY user's crm_settings
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          crm_settings: {
            ...currentSettings,
            attachments: settings.attachments,
            kanbanColumns: settings.kanbanColumns,
            kanbanColumnNames: settings.kanbanColumnNames,
            businessName: settings.businessName,
            productsCatalog: settings.productsCatalog,
            minutesWithoutResponse: settings.minutesWithoutResponse,
            followUpIntervalHours: settings.followUpIntervalHours,
            insistenciaMaxRepetitions: settings.insistenciaMaxRepetitions,
            insistenciaDaysInterval: settings.insistenciaDaysInterval,
            reposicao_days_global: settings.reposicao_days_global
          }
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
