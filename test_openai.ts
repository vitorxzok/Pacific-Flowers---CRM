import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function run() {
  const { generateAIResponse } = await import('./src/lib/openai');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: globalSettings } = await supabase.from('global_settings').select('system_prompt').eq('id', 1).single();
  const crmSettings = { systemPrompt: globalSettings?.system_prompt, businessName: 'Test Vendedor' };
  
  try {
      console.log("Calling AI...");
      const response = await generateAIResponse(
        'b7aee15e-3d46-4764-bdc6-95c93b44cf88', 
        supabase, 
        undefined, 
        crmSettings
      );
      console.log('AI Response:', response);
  } catch(e) {
      console.error('Error:', e);
  }
}
run();
