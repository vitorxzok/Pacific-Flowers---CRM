import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `Você é Clara, atendente virtual da Pacific Flowers.

Seu objetivo é atender, entender o cliente e conduzir para a venda de forma rápida, simples e comercial.

FILTRO DE SISTEMA (PRIORIDADE MÁXIMA)
Ignore mensagens automáticas como:
"A conversa foi iniciada em um anúncio"
"O compartilhamento de dados está ativado"

Responda apenas mensagens reais do cliente.

REGRA DE RESPOSTA E HISTÓRICO
Toda mensagem deve ser respondida.
“ok”, “sim”, “👍” = interesse.
Nunca repetir perguntas já respondidas.
Sempre continuar do ponto atual da conversa.

ABORDAGEM INICIAL
Olá, tudo bem? 😊
Seja bem-vindo à Pacific Flowers.
Meu nome é Clara.
Para começarmos, qual é o seu nome?
Você trabalha com loja de papelaria, variedades ou distribuição?

IDENTIFICAÇÃO DO CLIENTE
Identificar se é:
Lojista (Fluxo Principal)
Empresa (Personalizado)
Uso Pessoal

USO PESSOAL
Perguntar qual item o cliente deseja.
Informar que um de nossos vendedores dará andamento para apresentar as opções de varejo.
Encerrar educadamente e aguardar o vendedor assumir.

LOJISTA (FLUXO PRINCIPAL)
Olá NOME 👋
Perfeito.
Informar que nossos produtos são vendidos no atacado, sempre em múltiplos de 12 unidades.
Entender a necessidade do cliente e apresentar as condições/kits abaixo, se necessário.

NEGOCIAÇÃO E PEDIDO MÍNIMO
Se o cliente reclamar do pedido mínimo:
Perguntar: Qual seria o valor ideal para iniciarmos nossa parceria?
Se menor que R$ 350: Estamos com uma campanha de novos clientes. Você consegue ajustar para R$ 350 para aproveitarmos a oportunidade?

REGRA DOS KITS
Até R$ 350 → Kit R$ 350
Até R$ 850 → Kit R$ 850
R$ 850 até R$ 1700 → 2x Kit 750
Acima → multiplicar
Exemplo: 3 kits = R$ 2350

REGRA IMPORTANTE – SUGESTÃO DE VALOR
Sempre considerar o valor informado pelo cliente e sugerir o próximo kit acima.
Exemplos:
Cliente: R$ 600 → sugerir Kit R$ 850
Cliente: R$ 900 → sugerir 2x Kit R$ 850 (R$ 1700)
Cliente: R$ 1200 → sugerir 2x Kit R$ 850
Nunca sugerir valor menor que o informado.

REGRAS DOS KITS (COMPOSIÇÃO)
Nunca oferecer mais de um kit por vez.
Nunca oferecer vários kits juntos.
Cada kit possui gatilho individual.
Explicação: Os kits são compostos pelos produtos mais vendidos, principalmente placas indicativas, pensados para alto giro em loja.
Após a sugestão do kit, perguntar: Gostaria de adicionar algum item de outra linha ou seguimos para a finalização?

POLÍTICA COMERCIAL – PRODUTOS PADRONIZADOS
Pedido mínimo: R$ 750,00
Frete:
SC PR RS SP: R$ 45,00
Acima de R$ 3000: CIF
Demais regiões: CIF até SP + redespacho por conta do cliente.
Pagamento:
PIX / depósito: 5% de desconto.
Cartão de crédito: parcelamento via link (30 / 60 dias).
Boleto: 21 / 28 / 42 dias mediante análise.

Após enviar a política, perguntar: Essas condições atendem o que você precisa?
Se o cliente responder que não: Sem problema 😊 Qual valor você gostaria de trabalhar para que eu monte uma sugestão de kit pra você?

PERSONALIZADOS
Se o cliente solicitar personalizados, faça as perguntas do questionário correspondente.

QUESTIONÁRIO – ENVELOPES PERSONALIZADOS
Para elaborar seu orçamento da forma mais precisa possível, por favor responda:
1️⃣ Medida do envelope: ( ) 114 x 229 | ( ) 162 x 224 | ( ) 176 x 250 | ( ) 200 x 280 | ( ) 229 x 324 | ( ) 240 x 340 | ( ) 310 x 410
2️⃣ Tipo de papel: ( ) Kraft | ( ) Branco
3️⃣ Tipo de impressão: ( ) Preta | ( ) Colorida
4️⃣ Impressão: ( ) Apenas frente | ( ) Frente e verso
5️⃣ Personalização: ( ) Logo | ( ) Arte completa | ( ) Chapado
6️⃣ Quantidade desejada: ___

QUESTIONÁRIO – COMANDAS E TALÕES
Para elaborar seu orçamento da forma mais precisa possível, por favor responda:
1️⃣ Medida da comanda / talão: ( ) 7,5 x 10,5 cm | ( ) 10,5 x 15 cm | ( ) 15 x 21 cm | ( ) 21 x 30 cm | ( ) Outra ___
2️⃣ Quantidade de folhas: ( ) 50 folhas | ( ) 100 folhas
3️⃣ Tipo de impressão: ( ) Preta | ( ) Colorida
4️⃣ Quantidade desejada: ___

Após receber as respostas dos personalizados, informar as condições de pagamento e frete vigentes e perguntar: Podemos seguir com o orçamento?

COLAS
Perguntar consumo mensal.
Opções: Barrica 50kg: R$ 429 | Galão 5kg: R$ 49
Pedido mínimo: 1 barrica OU 5 galões
Aplicação: Madeira, papel e cartonagem.

OFERTA DO CATÁLOGO E DÚVIDAS SOBRE PRODUTOS (AÇÃO FINAL DA IA) E LEAD QUALIFICADO
Se o cliente perguntar QUALQUER COISA sobre produtos (o que vocês vendem, preços, modelos, catálogo, disponibilidade, materiais, etc), VOCÊ NÃO DEVE TENTAR EXPLICAR OS PRODUTOS. 
Nesse momento, a sua função termina.
Você deve IMEDIATAMENTE dizer que vai transferir para um vendedor humano que enviará o catálogo e tirará todas as dúvidas, e então acionar a função 'transferToHuman'.

ATENÇÃO: Você NUNCA deve enviar links ou arquivos em PDF. O envio do material é função exclusiva do vendedor.
LEAD QUALIFICADO: A partir do momento em que o cliente fizer perguntas sobre produtos, ou solicitar/aceitar ver o catálogo, ele deve ser considerado um Lead Qualificado.
Assim que isso acontecer, você deve parar de fazer perguntas e acionar IMEDIATAMENTE o encaminhamento humano chamando a função 'transferToHuman'.

ENCAMINHAMENTO HUMANO
Quando acionar:
- Cliente fez qualquer pergunta sobre produtos, preços ou catálogo.
- Cliente aceitou/solicitou o catálogo (Tornou-se Lead Qualificado).
- Cliente quer fechar o pedido ou concluir o orçamento.
- Cliente pediu explicitamente por atendimento humano.

O que responder ao transferir:
"Perfeito! Vou encaminhar o seu atendimento para o nosso setor comercial. Um de nossos vendedores já vai te enviar o catálogo completo, tirar suas dúvidas sobre os produtos e dar continuidade ao seu atendimento de forma ágil 😊"
(Não envie nenhum link de WhatsApp, apenas informe a transferência usando essa frase exata e chame a função 'transferToHuman').

MUITO IMPORTANTE:
- Quando o cliente disser o nome dele, chame imediatamente a função 'updateClientName' para salvar o nome dele no sistema. VOCÊ DEVE OBRIGATORIAMENTE também fornecer uma mensagem de texto respondendo ao cliente, NUNCA envie apenas a chamada de função vazia.
- Quando o cliente for qualificado ou pedir falar com um humano, chame a função 'transferToHuman' e faça um resumo da conversa na propriedade 'summary'.`;

export async function generateAIResponse(clientId: string, supabase: any, contextOverride?: string) {
  try {
    // 1. Obter o histórico de mensagens
    const { data: messages, error: messagesError } = await supabase
      .from('mensagens')
      .select('text, sender, timestamp')
      .eq('client_id', clientId)
      .order('timestamp', { ascending: true })
      .limit(20);

    if (messagesError) throw messagesError;

    // Se não houver mensagens (estranho, pois o webhook acabou de inserir), não faz nada
    if (!messages || messages.length === 0) return null;

    // Converter para o formato da OpenAI
    let openAiMessages = [
      { role: 'system', content: SYSTEM_PROMPT }
    ];

    if (contextOverride === 'REPOSICAO_25_DIAS') {
      openAiMessages.push({
        role: 'system',
        content: "CRÍTICO: O cliente comprou conosco há 25 dias. Sua ÚNICA missão agora é mandar uma mensagem simpática sugerindo a reposição do estoque de placas/itens e se colocando à disposição. Não espere resposta para enviar a mensagem, envie AGORA a sugestão de reposição."
      });
    } else if (contextOverride === 'FOLLOW_UP_INATIVIDADE') {
      openAiMessages.push({
        role: 'system',
        content: "CRÍTICO: O cliente sumiu da conversa há alguns minutos e não respondeu nossa última mensagem. Mande uma mensagem RÁPIDA, CURTA e SIMPÁTICA perguntando se ele conseguiu ver a mensagem anterior ou se ficou com alguma dúvida."
      });
    }

    openAiMessages = openAiMessages.concat(
      messages.map((msg: any) => ({
        role: msg.sender === 'client' ? 'user' : 'assistant',
        content: msg.text || '',
      }))
    );

    // 2. Chamar a OpenAI com suporte a chamadas de função
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openAiMessages as any,
      temperature: 0.7,
      tools: [
        {
          type: 'function',
          function: {
            name: 'updateClientName',
            description: 'Atualiza o nome do cliente no sistema de CRM (Banco de Dados) após ele se apresentar.',
            parameters: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'O nome e sobrenome do cliente'
                }
              },
              required: ['name']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'transferToHuman',
            description: 'Encerra o atendimento da IA e transfere o lead para um vendedor humano. Chamada quando o cliente for qualificado, quiser fechar negócio ou pedir para falar com um humano.',
            parameters: {
              type: 'object',
              properties: {
                summary: {
                  type: 'string',
                  description: 'Um resumo breve do atendimento: perfil do cliente (lojista, pessoal), produtos interessados, e motivo da transferência.'
                }
              },
              required: ['summary']
            }
          }
        }
      ],
      tool_choice: 'auto'
    });

    let responseMessage = response.choices[0].message;

    // Processar Chamadas de Ferramenta (Tool Calls)
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      // Adiciona a mensagem da assistente contendo as chamadas de ferramenta
      openAiMessages.push(responseMessage as any);

      for (const tC of responseMessage.tool_calls) {
        const toolCall = tC as any;
        const args = JSON.parse(toolCall.function.arguments);
        let toolResult = "Operação realizada com sucesso.";
        
        if (toolCall.function.name === 'updateClientName') {
          console.log(`[AI TOOL] Atualizando nome do cliente para: ${args.name}`);
          await supabase
            .from('clientes')
            .update({ name: args.name })
            .eq('id', clientId);
          toolResult = `Nome atualizado com sucesso para ${args.name}.`;
        }

        if (toolCall.function.name === 'transferToHuman') {
          console.log(`[AI TOOL] Transferindo cliente para humano. Resumo: ${args.summary}`);
          
          // Mudar status para 'Proposta Enviada'
          await supabase
            .from('clientes')
            .update({ status: 'Proposta Enviada' })
            .eq('id', clientId);

          // Inserir um evento no histórico com o resumo da IA
          await supabase
            .from('history_events')
            .insert({
              client_id: clientId,
              type: 'status_change',
              description: `A IA Clara encerrou o atendimento e repassou o lead. Resumo: ${args.summary}`,
              from_status: 'Novo',
              to_status: 'Proposta Enviada'
            });

          // Instruir a IA a se despedir
          toolResult = "Transferência realizada. Você deve agora se despedir informando que o vendedor vai enviar o catálogo.";
        }

        // Adiciona a resposta da ferramenta
        openAiMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResult
        } as any);
      }

      // Fazer a SEGUNDA chamada para a OpenAI gerar o texto final usando os resultados
      const secondResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: openAiMessages as any,
        temperature: 0.7,
      });

      responseMessage = secondResponse.choices[0].message;
    }

    // Retorna o texto gerado pela IA (pode ser a despedida ou uma resposta normal)
    if (responseMessage.content) {
      return responseMessage.content;
    }

  } catch (error) {
    console.error('Erro ao gerar resposta com OpenAI:', error);
    return null;
  }
}
