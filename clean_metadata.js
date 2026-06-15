const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);

const serviceKey = keyMatch[1].trim();
const url = urlMatch[1].trim();

const supabase = createClient(url, serviceKey);

async function cleanMetadata() {
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }

  for (const user of usersData.users) {
    const currentSettings = user.user_metadata?.crm_settings || {};
    
    // Delete huge strings that bloat the JWT
    delete currentSettings.systemPrompt;
    delete currentSettings.business_context;
    
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        crm_settings: currentSettings
      }
    });
    
    if (updateError) {
      console.error('Error updating user', user.id, updateError);
    } else {
      console.log('Cleaned metadata for user', user.id);
    }
  }
}

cleanMetadata();
