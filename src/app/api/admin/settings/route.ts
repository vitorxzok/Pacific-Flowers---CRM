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
            kanban_columns: settings.kanbanColumns,
            kanban_column_names: settings.kanbanColumnNames,
            business_name: settings.businessName,
            products_catalog: settings.productsCatalog,
            minutes_without_response: settings.minutesWithoutResponse,
            followup_interval_hours: settings.followUpIntervalHours,
            insistencia_max_repetitions: settings.insistenciaMaxRepetitions,
            insistencia_days_interval: settings.insistenciaDaysInterval,
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pwd = searchParams.get('pwd');
    if (pwd !== 'admin') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Find the first user with crm_settings
    let settings = {};
    for (const user of users) {
      if (user.user_metadata?.crm_settings) {
        settings = user.user_metadata.crm_settings;
        break;
      }
    }

    return NextResponse.json(settings);
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
