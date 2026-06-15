const url = 'https://nkvesifvkyjbicnqefco.supabase.co/rest/v1/profiles?select=*';
const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rdmVzaWZ2a3lqYmljbnFlZmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNzgwMTUsImV4cCI6MjA5NTY1NDAxNX0.tDg0fBccwBlYC7tdHpvsx5-WQgd-4iP-19uF124JNZc';

fetch(url, {
  headers: {
    'apikey': apikey,
    'Authorization': 'Bearer ' + apikey
  }
}).then(r => r.json()).then(data => {
  console.log(JSON.stringify(data[0], null, 2));
});
