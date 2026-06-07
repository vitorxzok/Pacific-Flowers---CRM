const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const url = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

async function run() {
  const fetch = require('node-fetch'); // We might not have node-fetch in this environment if it's node 18+ we can use global fetch
  
  // Create an explicit policy to allow anon uploads
  const response = await globalThis.fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({ query: `
      DROP POLICY IF EXISTS "Anon Upload Access" ON storage.objects;
      CREATE POLICY "Anon Upload Access" 
      ON storage.objects FOR INSERT 
      TO public
      WITH CHECK (bucket_id = 'media');
      
      DROP POLICY IF EXISTS "Public Update Access" ON storage.objects;
      CREATE POLICY "Public Update Access" 
      ON storage.objects FOR UPDATE 
      TO public
      WITH CHECK (bucket_id = 'media');
    `})
  });
  console.log(await response.text());
}
run();
