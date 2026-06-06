import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usamos a SERVICE_ROLE_KEY para ignorar as restrições de RLS (Row Level Security) do Supabase Storage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const filePath = formData.get('filePath') as string;

    if (!file || !filePath) {
      return NextResponse.json({ error: 'Arquivo não fornecido ou caminho inválido' }, { status: 400 });
    }

    const { data, error } = await supabase.storage.from('media').upload(filePath, file, {
      upsert: true,
    });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (err: any) {
    console.error('Upload handler error:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
