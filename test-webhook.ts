import { POST } from './src/app/api/webhook/whatsapp/route';

async function run() {
  const req = new Request('http://localhost:3000/api/webhook/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'messages.upsert',
      instance: 'user_e9b95e91-eac3-45d3-ac12-f604b10384be',
      data: {
        key: {
          remoteJid: '559191521150@s.whatsapp.net',
          fromMe: false
        },
        message: {
          conversation: 'Oi'
        },
        pushName: 'Laudiene'
      }
    })
  });
  
  const res = await POST(req);
  console.log('Response:', res.status);
  console.log('Body:', await res.json());
}
run().catch(console.error);
