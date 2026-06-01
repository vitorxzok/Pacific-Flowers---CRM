const fetch = require('node-fetch');

async function testWebhook() {
  const payload = {
    event: "messages.upsert",
    instance: "user_test123", // seller ID (should exist or it'll just use 'test123' as ID)
    data: {
      message: {
        key: {
          fromMe: false,
          remoteJid: "5511999999999@s.whatsapp.net"
        },
        pushName: "Cliente Teste",
        message: {
          conversation: "Olá, me chamo Roberto. Queria saber sobre os kits da Pacific Flowers."
        }
      }
    }
  };

  try {
    console.log("Enviando webhook simulado...");
    const res = await fetch('http://localhost:3000/api/webhook/whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Resposta do Webhook:", data);
  } catch (err) {
    console.error("Erro no teste:", err);
  }
}

testWebhook();
