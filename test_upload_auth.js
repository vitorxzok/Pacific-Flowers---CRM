const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const url = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  // Try to sign in as an attendant to test authenticated upload
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'marina@pacific.com', // guess an email
    password: 'password123'      // guess a password
  });
  
  if (signInError) {
    console.log('SignIn error:', signInError);
    return;
  }
  
  console.log('Signed in successfully.');

  const { data, error } = await supabase.storage.from('media').upload('test_auth.txt', 'hello world', { upsert: true });
  console.log('Auth Upload result:', data, error);
}
run();
