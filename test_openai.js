require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { generateAIResponse } = require('./src/lib/openai');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: globalSettings } = await supabase.from('global_settings').select('system_prompt').eq('id', 1).single();
  const crmSettings = { systemPrompt: globalSettings?.system_prompt, businessName: 'Test Vendedor' };
  
  try {
      console.log("Calling AI...");
      const response = await generateAIResponse(
        'fc27d5a2-494d-41f1-ac0b-0391fb0f2cd9', 
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
