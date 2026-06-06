import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing keys');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.storage.createBucket('media', {
    public: true,
    fileSizeLimit: 10485760, // 10MB
  });
  
  if (error) {
    if (error.message.includes('already exists')) {
      console.log('Bucket already exists.');
      await supabase.storage.updateBucket('media', { public: true });
    } else {
      console.error('Error creating bucket:', error.message);
    }
  } else {
    console.log('Bucket created successfully!');
  }
}

main();
