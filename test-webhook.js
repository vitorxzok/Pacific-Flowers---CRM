

async function testWebhook() {
  const url = 'http://localhost:3000/api/webhook/whatsapp'; // Or deployed URL, let's use deployed to see if Vercel gets it.
  const deployedUrl = 'https://pacific-flowers-crm.vercel.app/api/webhook/whatsapp';

  const payload = {
    event: 'messages.upsert',
    instance: 'user_305ce3a3-1de2-4a55-bdb9-7ec0f832e89d',
    data: {
      key: {
        remoteJid: '5511999999999@s.whatsapp.net',
        fromMe: false
      },
      message: {
        conversation: 'Mensagem de teste para o Fabio'
      },
      pushName: 'Teste Lead Fabio'
    }
  };

  const res = await fetch(deployedUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}
testWebhook();
