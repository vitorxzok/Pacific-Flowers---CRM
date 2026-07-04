import { config } from 'dotenv';
import OpenAI from 'openai';

config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function run() {
  const messages = [
    { role: "system", content: `Você é uma assistente.
REGRAS FINAIS OBRIGATÓRIAS:
1. ENVIO DO CATÁLOGO: Só envie o catálogo usando a ferramenta 'sendAttachment' (gatilho 'CATALOGO') se o cliente for lojista E o contexto exigir (ex: pediu catálogo ou humano disse que enviaria). NÃO envie o catálogo junto com orçamentos a não ser que tenha sido pedido.
2. CADÊNCIA E FRASES CURTAS: Você simula um WhatsApp. NUNCA envie textos longos de uma vez. Quebre suas falas em frases curtas. Para separar suas mensagens em balões diferentes, coloque a tag secreta [SEPARAR] entre elas. Exemplo de uso: "Olá! Tudo bem? [SEPARAR] Segue o seu orçamento: ... [SEPARAR] Ficou alguma dúvida?". A tag [SEPARAR] fará o envio de mensagens separadas em cadência.

REGRAS DE QUANTIDADE MÍNIMA:
Você NUNCA deve aceitar um pedido com quantidade inferior à "Quantidade Mínima OBRIGATÓRIA" informada ao lado de cada produto!
Mostre os cálculos de forma clara e amigável. IMPORTANTE: Quebre o orçamento em balões separados usando [SEPARAR] para que a mensagem não fique gigante num bloco só. Exemplo: "Aqui está o orçamento! [SEPARAR] 1. VENDO: 12 un x R$ ... [SEPARAR] Total: R$ ...".

[BASE DE DADOS DE PRODUTOS E PREÇOS OBRIGATÓRIA]
- [1] VENDO: R$ 2,28 (Quantidade Mínima OBRIGATÓRIA: 12 un)
- [2] ALUGO: R$ 2,28 (Quantidade Mínima OBRIGATÓRIA: 12 un)` },
    { role: "user", content: "Ola, quero fazer um pedido: 12 unidades de VENDO e 12 de ALUGO" },
    { role: "assistant", content: "ok ja te encaminho.." }
  ];

  const tools = [
    {
      type: 'function',
      function: {
        name: 'sendAttachment',
        description: 'ENVIA O CATÁLOGO OU ANEXO.',
        parameters: {
          type: 'object',
          properties: {
            triggerName: {
              type: 'string',
            }
          },
          required: ['triggerName']
        }
      }
    }
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages,
    tools: tools,
    tool_choice: "auto",
    temperature: 0.2
  });

  console.log("Response:", JSON.stringify(response.choices[0].message, null, 2));
}

run();
