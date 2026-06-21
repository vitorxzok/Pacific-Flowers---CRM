import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(req: Request) {
  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Busca as instâncias conectando do usuário
    const { data: instances, error: fetchError } = await supabaseAdmin
      .from('whatsapp_instances')
      .select('*')
      .eq('user_id', user_id)
      .eq('connection_status', 'connecting');

    if (fetchError) {
      console.error('Error fetching connecting instances:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch instances' }, { status: 500 });
    }

    if (!instances || instances.length === 0) {
      return NextResponse.json({ success: true, message: 'No connecting instances found', count: 0 });
    }

    const apiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL;
    const apiKey = process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || process.env.EVOLUTION_API_KEY;

    // Remove do Evolution API tentando fazer logout, ignora erros pois elas provavelmente estão presas
    for (const instance of instances) {
      try {
        await fetch(`${apiUrl}/instance/logout/${instance.instance_name}`, {
          method: 'DELETE',
          headers: {
            'apikey': apiKey!
          }
        });
        
        await fetch(`${apiUrl}/instance/delete/${instance.instance_name}`, {
          method: 'DELETE',
          headers: {
            'apikey': apiKey!
          }
        });
      } catch (err) {
        console.warn(`Failed to cleanup instance ${instance.instance_name} in Evolution API (might not exist):`, err);
      }
    }

    // Deleta do Supabase
    const { error: deleteError } = await supabaseAdmin
      .from('whatsapp_instances')
      .delete()
      .eq('user_id', user_id)
      .eq('connection_status', 'connecting');

    if (deleteError) {
      console.error('Error deleting connecting instances from db:', deleteError);
      return NextResponse.json({ error: 'Failed to delete instances from db' }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: instances.length });

  } catch (error) {
    console.error('Error in cleanup API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
