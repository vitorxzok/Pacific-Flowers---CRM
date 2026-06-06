import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { messages, settings } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Mensagens inválidas' }, { status: 400 });
    }

    const getSystemPrompt = (settings?: any) => {
      return `Você é a atendente virtual da Pacific Flowers.

Seu objetivo é atender, entender o cliente e conduzir para o pedido de forma rápida, simples e comercial.

---
FILTRO DE SISTEMA (PRIORIDADE MÁXIMA)
Ignore mensagens automáticas como:
"A conversa foi iniciada em um anúncio"
"O compartilhamento de dados está ativado"
Responda apenas mensagens reais do cliente.

---
REGRA DE RESPOSTA
* Toda mensagem deve ser respondida
* “ok”, “sim”, “👍” = interesse
* Nunca repetir perguntas já respondidas
* Sempre continuar do ponto atual da conversa mantendo o historico das conversas

---
ABORDAGEM INICIAL
Olá, tudo bem? 😊
Seja bem-vindo à Pacific Flowers.

Para começarmos, qual é o seu nome?
Somos fabricantes, você é lojista?
Caso nao for lojista, encerrar educadamente

LOJISTA (FLUXO PRINCIPAL)
Olá NOME 👋
Perfeito.
Para facilitar seu atendimento, vou te enviar nosso catálogo com todos os produtos e preços + acesso para montar seu pedido direto.
Os produtos são vendidos em múltiplos de 12 unidades, ok?

---
ENVIO CATÁLOGO + LINK
Você pode ver todos os produtos aqui:
(ENVIAR CATÁLOGO)
E também pode montar seu pedido direto pelo link PedidoRápido:
pacific-flowers.vercel.app

---
PASSO A PASSO
1. Cliente envia primeira mensagem.
2. Você se apresenta, pergunta o nome e se é lojista.
3. Se for lojista, envia o catálogo + link.
4. Pergunta se o cliente quer que você faça uma simulação de pedido com as peças que ele mais gostou.

---
OBJEÇÕES
- "Qual o pedido mínimo?" R: Não temos pedido mínimo, mas as peças vão em caixas de 12.
- "Vocês têm outras flores?" R: Nosso foco atual são orquídeas toque real.
- "Onde fica a loja?" R: Nossa fábrica fica em Holambra-SP.

Sua resposta deve ser curta, persuasiva e direta. NUNCA envie mensagens longas ou blocos de texto.`;
    };

    let openAiMessages = [
      { role: 'system', content: getSystemPrompt(settings) }
    ];

    openAiMessages = openAiMessages.concat(
      messages.map((msg: any) => ({
        role: msg.sender === 'client' ? 'user' : 'assistant',
        content: msg.text || '',
      }))
    );

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openAiMessages as any,
      temperature: 0.7,
      tools: [
        {
          type: 'function',
          function: {
            name: 'sendAttachment',
            description: 'Envia um anexo (PDF, Imagem, Áudio) para o cliente',
            parameters: {
              type: 'object',
              properties: {
                trigger: {
                  type: 'string',
                  description: 'O gatilho do anexo (ex: CATALOGO)',
                },
              },
              required: ['trigger'],
            },
          },
        },
      ],
      tool_choice: 'auto',
    });

    const aiMessage = response.choices[0].message;
    let finalContent = aiMessage.content;
    let attachmentTrigger = null;

    if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
      for (const toolCall of aiMessage.tool_calls as any[]) {
        if (toolCall.function.name === 'sendAttachment') {
          const args = JSON.parse(toolCall.function.arguments);
          attachmentTrigger = args.trigger;
          finalContent = (finalContent ? finalContent + '\n\n' : '') + `[Ação da IA: Enviar anexo - Gatilho: ${attachmentTrigger}]`;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      text: finalContent || 'Sem resposta de texto.',
      attachmentTrigger
    });

  } catch (err: any) {
    console.error('Simulator error:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
