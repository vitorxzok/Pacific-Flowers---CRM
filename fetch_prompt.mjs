import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(line => line && !line.startsWith('#')).map(line => line.split('=').map(s => s.trim())));

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);
supabase.from('mensagens').select('text, sender, timestamp').eq('client_id', '07cae1f8-dae9-4edb-ad90-0c753b44c459').order('timestamp', {ascending: false}).limit(10).then(({data}) => console.log("MESSAGES:", data));
