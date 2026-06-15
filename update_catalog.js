const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);

const serviceKey = keyMatch[1].trim();
const url = urlMatch[1].trim();

const supabase = createClient(url, serviceKey);

async function addDefaultCatalog() {
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }

  for (const user of usersData.users) {
    const currentSettings = user.user_metadata?.crm_settings || {};
    let attachments = currentSettings.attachments || [];

    // Check if CATALOGO already exists
    const hasCatalog = attachments.some(a => a.trigger && a.trigger.toUpperCase() === 'CATALOGO');
    
    if (!hasCatalog) {
      attachments.push({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        trigger: 'CATALOGO',
        name: 'Catálogo Pacific Flowers.pdf',
        url: 'https://nkvesifvkyjbicnqefco.supabase.co/storage/v1/object/public/media/anexos/jkdnnhy7wi_1781464663523.pdf'
      });

      currentSettings.attachments = attachments;
      
      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          crm_settings: currentSettings
        }
      });
      
      if (updateError) {
        console.error('Error updating user', user.id, updateError);
      } else {
        console.log('Added CATALOGO to user', user.id);
      }
    } else {
      console.log('User already has a CATALOGO trigger:', user.id);
      
      // Update the URL of the existing CATALOGO just in case it's broken or old
      const catIndex = attachments.findIndex(a => a.trigger && a.trigger.toUpperCase() === 'CATALOGO');
      if (catIndex > -1) {
        attachments[catIndex].url = 'https://nkvesifvkyjbicnqefco.supabase.co/storage/v1/object/public/media/anexos/jkdnnhy7wi_1781464663523.pdf';
        currentSettings.attachments = attachments;
        await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...user.user_metadata,
            crm_settings: currentSettings
          }
        });
        console.log('Updated existing CATALOGO URL for user', user.id);
      }
    }
  }
}

addDefaultCatalog();
