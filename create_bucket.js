const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const url = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) {
    console.error('Error listing buckets:', bucketsError);
    return;
  }
  
  if (!buckets.some(b => b.name === 'media')) {
    const { data, error } = await supabase.storage.createBucket('media', { public: true });
    console.log('Bucket creation result:', data, error);
  } else {
    console.log('Bucket "media" already exists.');
  }
}
run();
