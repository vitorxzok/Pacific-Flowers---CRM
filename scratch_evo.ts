import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nkvesifvkyjbicnqefco.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rdmVzaWZ2a3lqYmljbnFlZmNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA3ODAxNSwiZXhwIjoyMDk1NjU0MDE1fQ.PHgrbW8kAreNiPKeIMb_9n1BvF6r5beBoFmOMvpT7as';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const apiUrl = "https://evo.crmpacific.tech";
  const apiKey = "801ac10f9ec707530c046cab79913777";
  
  // get a valid instance name from clientes
  const { data: clients } = await supabase.from('clientes').select('connected_instance').not('connected_instance', 'is', null).limit(1);
  const instanceName = clients?.[0]?.connected_instance;
  console.log(`Using instance: ${instanceName}`);
  
  const payloadRoot = {
    number: "5511999999999",
    mediatype: "document",
    mimetype: "application/pdf",
    caption: "",
    media: "https://nkvesifvkyjbicnqefco.supabase.co/storage/v1/object/public/media/anexos/6gc53cm7ld_1781629339490.pdf",
    fileName: "Catálogo - Com Preço.pdf"
  };

  const payloadMessage = {
    number: "5511999999999",
    mediaMessage: {
      mediatype: "document",
      media: "https://nkvesifvkyjbicnqefco.supabase.co/storage/v1/object/public/media/anexos/6gc53cm7ld_1781629339490.pdf",
      fileName: "Catálogo - Com Preço.pdf"
    }
  };

  console.log("Testing root payload...");
  const res1 = await fetch(`${apiUrl}/message/sendMedia/${instanceName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
    body: JSON.stringify(payloadRoot)
  });
  console.log("Status:", res1.status);
  console.log("Response:", await res1.text());

  console.log("\nTesting mediaMessage payload...");
  const res2 = await fetch(`${apiUrl}/message/sendMedia/${instanceName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
    body: JSON.stringify(payloadMessage)
  });
  console.log("Status:", res2.status);
  console.log("Response:", await res2.text());
}

run().catch(console.error);
