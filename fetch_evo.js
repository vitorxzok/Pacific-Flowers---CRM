import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const apiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL;
  const apiKey = process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || process.env.EVOLUTION_API_KEY;

  if (!apiUrl || !apiKey) {
    console.error("Missing API URL or KEY in .env.local");
    return;
  }

  const response = await fetch(`${apiUrl}/instance/fetchInstances`, {
    headers: { 'apikey': apiKey }
  });

  const data = await response.json();
  console.log(JSON.stringify(data.slice(0, 2), null, 2));
}

main();
