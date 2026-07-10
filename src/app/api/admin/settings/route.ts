import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function POST(request: Request) {
  try {
    const { password, settings } = await request.json();

    const { data: settingsClient, error: fetchErr } = await supabase
      .from('whatsapp_instances')
      .select('phone_number')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .single();

    if (fetchErr || !settingsClient) {
      return NextResponse.json({ 
        error: 'Erro de comunicação com o banco de dados. O cliente base de configurações não existe.' 
      }, { status: 500 });
    }

    let currentSettings: any = {};
    try {
      currentSettings = typeof settingsClient.phone_number === 'string' 
        ? JSON.parse(settingsClient.phone_number || '{}') 
        : (settingsClient.phone_number || {});
    } catch (e) {}

    const currentAdminPwd = currentSettings.admin_password || 'admin';
    if (password !== currentAdminPwd) return NextResponse.json({ error: 'Nǜo autorizado' }, { status: 401 });

    const newSettings = {
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
      admin_password: settings.adminPassword || currentAdminPwd
    };

    const { error: updateErr } = await supabase
      .from('whatsapp_instances')
      .update({ phone_number: JSON.stringify(newSettings) })
      .eq('id', '00000000-0000-0000-0000-000000000000');

    if (updateErr) {
      return NextResponse.json({ error: 'Falha ao salvar no banco de dados.' }, { status: 500 });
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

    const { data: settingsClient, error } = await supabase
      .from('whatsapp_instances')
      .select('phone_number')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .single();
    
    if (error || !settingsClient) {
      if (pwd !== 'admin') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      return NextResponse.json({});
    }

    let settings: any = {};
    try {
      settings = typeof settingsClient.phone_number === 'string' 
        ? JSON.parse(settingsClient.phone_number || '{}') 
        : (settingsClient.phone_number || {});
    } catch (e) {}

    const currentAdminPwd = settings.admin_password || 'admin';
    if (pwd !== currentAdminPwd) return NextResponse.json({ error: 'Nǜo autorizado' }, { status: 401 });

    return NextResponse.json(settings);
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
