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

    const { data: { users }, error: uErr } = await supabase.auth.admin.listUsers();
    if (uErr) {
      return NextResponse.json({ 
        error: 'Chave SUPABASE_SERVICE_ROLE_KEY faltando na Vercel. Por favor, adicione-a como variável de ambiente no seu projeto Vercel para poder salvar configurações globais.' 
      }, { status: 500 });
    }

    let currentAdminPwd = 'admin';
    for (const u of users || []) {
      if (u.user_metadata?.crm_settings?.admin_password) {
        currentAdminPwd = u.user_metadata.crm_settings.admin_password;
        break;
      }
    }

    if (password !== currentAdminPwd) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

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
            use_global_insistence_strategy: settings.useGlobalInsistenceStrategy,
            insistencia_cadences: settings.insistenciaCadences,
            reposicao_days_global: settings.reposicao_days_global,
            admin_password: settings.adminPassword || currentSettings.admin_password || 'admin'
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

    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    // If it fails (missing service role key), fallback to an empty settings object
    if (error) {
      if (pwd !== 'admin') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      return NextResponse.json({});
    }

    let currentAdminPwd = 'admin';
    let settings: any = {};
    for (const user of users || []) {
      if (user.user_metadata?.crm_settings) {
        settings = user.user_metadata.crm_settings;
        if (settings.admin_password) {
          currentAdminPwd = settings.admin_password;
        }
        break;
      }
    }

    if (pwd !== currentAdminPwd) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    return NextResponse.json(settings);
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
