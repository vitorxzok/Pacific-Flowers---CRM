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

    const apiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL;
    const apiKey = process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || process.env.EVOLUTION_API_KEY;

    if (!apiUrl || !apiKey) {
      return NextResponse.json({ error: 'Configuração da API ausente' }, { status: 500 });
    }

    const fetchResponse = await fetch(`${apiUrl}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
      },
    });

    const data = await fetchResponse.json();

    if (!fetchResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch instances from Evolution API' }, { status: 500 });
    }

    const userInstances = (Array.isArray(data) ? data : []).filter((inst: any) => {
      const name = inst.name || inst.instanceName || '';
      return name.startsWith(`user_${user_id}_`) || name === `user_${user_id}`;
    });

    const connectingInstances = userInstances.filter((inst: any) => {
      const state = (inst.status || inst.connectionStatus || '').toLowerCase();
      return state === 'connecting' || state === 'close' || state === ''; // Include empty states which often indicate pending QR
    });

    if (connectingInstances.length === 0) {
      return NextResponse.json({ success: true, message: 'No connecting instances found', count: 0 });
    }

    // Remove do Evolution API
    for (const instance of connectingInstances) {
      const instanceName = instance.name || instance.instanceName;
      try {
        await fetch(`${apiUrl}/instance/logout/${instanceName}`, {
          method: 'DELETE',
          headers: {
            'apikey': apiKey!
          }
        });
        
        await fetch(`${apiUrl}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers: {
            'apikey': apiKey!
          }
        });
      } catch (err) {
        console.warn(`Failed to cleanup instance ${instanceName} in Evolution API (might not exist):`, err);
      }
    }

    // Deleta do Supabase
    const { error: deleteError } = await supabaseAdmin
      .from('whatsapp_instances')
      .delete()
      .eq('user_id', user_id)
      .eq('status', 'connecting');

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
