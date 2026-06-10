const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const EVOLUTION_API_URL = env.match(/EVOLUTION_API_URL=(.*)/)[1].trim().replace(/^"|"$/g, '');
const EVOLUTION_API_KEY = env.match(/EVOLUTION_API_KEY=(.*)/)[1].trim().replace(/^"|"$/g, '');

(async () => {
  const instanceName = 'user_305ce3a3-1de2-4a55-bdb9-7ec0f832e89d'; // Fabio's instance
  console.log(`Buscando e deletando a instancia ${instanceName}...`);
  try {
    const res = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: { 'apikey': EVOLUTION_API_KEY }
    });
    
    if (res.ok) {
        const data = await res.json();
        console.log('Instancia deletada com sucesso!', JSON.stringify(data, null, 2));
    } else {
        const errorData = await res.text();
        console.log(`Falha ao deletar a instancia. Status: ${res.status}. Body:`, errorData);
    }
  } catch (err) {
    console.error('Erro na chamada da API:', err);
  }
})();
