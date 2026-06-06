import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const { filePath } = await request.json();

    if (!filePath) {
      return NextResponse.json({ error: 'Caminho inválido' }, { status: 400 });
    }

    const { data, error } = await supabase.storage.from('media').createSignedUploadUrl(filePath);

    if (error) {
      console.error('Supabase signed url error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // publicUrl para o frontend salvar nas configurações do CRM
    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);

    return NextResponse.json({ success: true, token: data.token, publicUrl });
  } catch (err: any) {
    console.error('Signed URL handler error:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
