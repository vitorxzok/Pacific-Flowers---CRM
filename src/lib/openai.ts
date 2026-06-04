import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `Papel e Identidade: Você é um assistente virtual de vendas e representante comercial da PacificFlowers Indústria & Comércio. A PacificFlowers está presente no mercado desde o ano 2000, destacando-se pela fabricação própria e nacional de uma ampla linha de produtos. Seu objetivo é atender os clientes de forma educada e prestativa, tirar dúvidas gerais sobre os produtos e, obrigatoriamente, incentivar e direcionar o cliente para o site da empresa para a visualização do catálogo e realização de orçamentos.
Tom de Voz: Profissional, amigável, direto, focado no bem-estar do cliente e em facilitar a jornada de compra através do site.
Informações de Contato da Empresa:
Telefone: (47) 3371-9993.
E-mails: pedido@pacificflowers.com.br / sac@pacificflowers.com.br.
Endereço: Jaraguá do Sul - SC.
CNPJ: 03.772.965/0001-90.

--------------------------------------------------------------------------------
BASE DE CONHECIMENTO: CATÁLOGO DE PRODUTOS (Use estas informações apenas para tirar dúvidas rápidas dos clientes sobre o que vendemos)
1. Placas Indicativas (PS/Poliestireno com impressão UV, uso interno/externo):
Tamanhos: 15x20cm, 10x30cm, 7x30cm, 20x30cm e Placas de Extintor. Vendido em pacotes com 12 unidades.
2. Splash e Cartaz de Oferta (Papel 220g):
Splash Solapa e Granel (Tamanhos P, M e G).
Cartaz de Oferta Solapa e Granel (Tamanhos P, M, G e GG).
Opções de combos pacotes com vários tamanhos.
3. Impressos Padronizados (Papel Offset 56g - Talões com 50 folhas):
Talão de Pedido, Comanda, Vale e Recibo Comercial em diversos tamanhos.
4. Envelopes Kraft Natural (Papel Kraft 80g, 90g e 115g):
Tamanhos disponíveis de 162x229mm até 250x350mm. Vendidos em pacotes com 10 un., ou caixas com 100 e 250 un.
5. Jogos e Atividades Infantis:
Dinheirinho e Dinheirão, Jogo da Memória e Quebra Cabeça (3 em 1), Desenhos para Colorir (com brinde de giz), Caligrafia e Jogos de Tabuleiro (Mercado Imobiliário, Ludo, Trilha, Damas).
6. Cadernos e Cadernetas (Capa Flexível 250g, Folhas 56g):
Cadernetas e Cadernos (Pauta e Desenho) de 48 ou 96 folhas.
7. Giz de Cera:
Giz de Cera Padrão, Gizão de Cera e Meu 1º Giz (Jumbo) em caixas de 6 ou 12 cores.

--------------------------------------------------------------------------------
REGRAS DE ATENDIMENTO PARA A IA (MUITO IMPORTANTE):
NÃO FAÇA ORÇAMENTOS: Você nunca deve calcular preços, montar orçamentos, ou tentar fechar o pedido manualmente. O seu papel é orientar o cliente a fazer isso no site.
INCENTIVE O USO DO CATÁLOGO/SITE: Sempre que um cliente pedir o catálogo, perguntar sobre preços ou quiser fazer um orçamento/pedido, você deve incentivá-lo a usar a nossa plataforma online.
MENSAGEM PADRÃO PARA ORÇAMENTOS: Envie a seguinte mensagem ao cliente: "Para ver todos os nossos produtos, preços atualizados e fazer o seu orçamento, convido você a acessar o nosso catálogo online! É só clicar neste link: https://pacific-flowers.vercel.app. Lá você pode montar um carrinho com tudo o que precisa. Depois, basta me enviar de volta aqui no chat o orçamento que o próprio site vai gerar, e nós faremos o seu pedido por aqui! 😊"
RETORNO DO ORÇAMENTO: Quando o cliente mandar no chat o orçamento pronto que ele gerou no site, agradeça o envio e informe que o pedido será repassado para a equipe humana dar andamento ao faturamento. Peça também o endereço de entrega e a forma de pagamento, se ele ainda não tiver informado.
DÚVIDAS PONTUAIS: Se o cliente fizer uma pergunta muito específica sobre um produto (ex: "As placas vêm com quantas unidades?"), responda rapidamente com base na sua Base de Conhecimento, mas sempre termine a mensagem reforçando o link (https://pacific-flowers.vercel.app) para ele conferir o catálogo completo e montar o carrinho.

MUITO IMPORTANTE - CHAMADAS DE FUNÇÃO:
- Quando o cliente disser o nome dele (caso ainda não saibamos), chame imediatamente a função 'updateClientName' para salvar o nome dele no sistema. VOCÊ DEVE OBRIGATORIAMENTE também fornecer uma mensagem de texto respondendo ao cliente, NUNCA envie apenas a chamada de função vazia.
- Quando o cliente enviar o orçamento pronto e você já tiver avisado do repasse (ou quando pedir explicitamente um humano), chame a função 'transferToHuman' e faça um resumo da conversa na propriedade 'summary'. Isso passará o atendimento definitivamente ao vendedor humano.`;

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
        content: "CRÍTICO: O cliente parou de responder há alguns minutos. Mande uma mensagem RÁPIDA, CURTA e SIMPÁTICA fingindo que você esqueceu de mandar o link do nosso catálogo. Exemplo: 'Esqueci de te mandar o link direto do nosso catálogo! É só clicar aqui para ver os valores das orquídeas e outros itens: https://pacific-flowers.vercel.app. Conseguiu abrir?'"
      });
    } else if (contextOverride === 'INSISTENCIA_HORAS') {
      openAiMessages.push({
        role: 'system',
        content: "CRÍTICO: O cliente não nos responde há muito tempo. Sua ÚNICA missão agora é tentar retomar a conversa com um tom comercial e proativo. Mande uma mensagem como: 'Olá, bom dia/tarde! Passando para ver se você conseguiu dar uma olhada no catálogo. Tem algum arranjo ou kit que você mais gostou para eu simular um orçamento para você?'"
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
          
          // Mudar status para 'Qualificado'
          await supabase
            .from('clientes')
            .update({ status: 'Qualificado' })
            .eq('id', clientId);

          // Inserir um evento no histórico com o resumo da IA
          await supabase
            .from('history_events')
            .insert({
              client_id: clientId,
              type: 'status_change',
              description: `A IA Clara encerrou o atendimento e repassou o lead. Resumo: ${args.summary}`,
              from_status: 'Em Qualificação',
              to_status: 'Qualificado'
            });

          // Recuperar os dados do cliente para pegar o telefone e o attendant_id
          const { data: clientData } = await supabase
            .from('clientes')
            .select('name, phone, attendant_id')
            .eq('id', clientId)
            .single();

          if (clientData && clientData.attendant_id) {
            // Recuperar o número de WhatsApp do vendedor
            const { data: profile } = await supabase
              .from('profiles')
              .select('whatsapp_number')
              .eq('id', clientData.attendant_id)
              .single();

            if (profile && profile.whatsapp_number) {
              const apiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL;
              const apiKey = process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || process.env.EVOLUTION_API_KEY;
              
              if (apiUrl && apiKey) {
                const sellerPhone = profile.whatsapp_number.replace(/\D/g, '');
                const instanceName = `user_${clientData.attendant_id}`;
                const alertMessage = `⚠️ *Lead Qualificado!*\nO lead *${clientData.name || 'Sem Nome'}* (${clientData.phone}) foi qualificado pela IA e está pronto para receber o catálogo e atendimento humano.\n\n*Resumo da IA:* ${args.summary}`;

                fetch(`${apiUrl}/message/sendText/${instanceName}`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': apiKey,
                  },
                  body: JSON.stringify({
                    number: sellerPhone,
                    text: alertMessage
                  }),
                }).catch(err => console.error('[AI TOOL] Erro ao enviar alerta para o vendedor:', err));
              }
            }
          }

          // Instruir a IA a se despedir
          toolResult = "Transferência realizada para 'Qualificado'. Você deve agora se despedir informando que o vendedor vai enviar o catálogo e não deve enviar mais perguntas.";
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

/**
 * Análise Silenciosa:
 * Lê o histórico recente da conversa (focado nas falas do atendente humano e do cliente)
 * e avalia em qual etapa do funil o lead se encontra. Se houver mudança clara, atualiza.
 */
export async function analyzeConversationAndMoveStatus(clientId: string, supabase: any) {
  try {
    // 1. Pegar dados atuais do cliente
    const { data: clientData } = await supabase
      .from('clientes')
      .select('status, name')
      .eq('id', clientId)
      .single();

    if (!clientData) return;

    // Etapas que a IA auto-reply atua (se estiver aqui, a auto-reply cuida, então não mexemos)
    const initialStages = ['Novo', 'Contato Feito', 'Em Qualificação'];
    // Etapas finais
    const finalStages = ['Finalizado', 'Perdido', 'Reposição'];

    if (initialStages.includes(clientData.status) || finalStages.includes(clientData.status)) {
      return; // Não analisa silenciosamente nestes estados
    }

    // 2. Buscar últimas 15 mensagens para contexto
    const { data: mensagens } = await supabase
      .from('mensagens')
      .select('text, sender, timestamp')
      .eq('client_id', clientId)
      .order('timestamp', { ascending: false })
      .limit(15);

    if (!mensagens || mensagens.length === 0) return;

    // Inverter para ordem cronológica
    const contextMessages = mensagens.reverse().map((m: any) => {
      const isSeller = m.sender === 'attendant';
      return `${isSeller ? 'VENDEDOR' : 'CLIENTE'}: ${m.text}`;
    }).join('\n');

    const SILENT_SYSTEM_PROMPT = `Você é um supervisor silencioso de um funil de vendas.
Sua única função é ler o histórico recente da conversa e determinar se o lead avançou ou retrocedeu de etapa.
Status atual do lead: "${clientData.status}"
Nome do lead: "${clientData.name || 'Desconhecido'}"

Etapas permitidas para você mover:
- "Proposta Enviada": O vendedor enviou um orçamento, preço ou proposta clara.
- "Finalizado": O cliente comprou, pagou ou o negócio foi fechado com sucesso.
- "Reposição": O cliente precisa voltar a comprar no futuro (recorrente) ou pediu para avisar depois.
- "Perdido": O cliente disse não, achou caro, não tem interesse ou parou de responder definitivamente.

Regras:
1. SÓ chame a ferramenta \`updateStatus\` se você tiver absoluta certeza de que a conversa avançou para um novo status DIFERENTE do atual.
2. Se a conversa ainda está no status atual, NÃO FAÇA NADA. Apenas não chame a ferramenta.
3. Não retorne nenhum texto de resposta para o cliente.`;

    const openAiMessages = [
      { role: 'system', content: SILENT_SYSTEM_PROMPT },
      { role: 'user', content: `Histórico Recente:\n${contextMessages}` }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openAiMessages as any,
      temperature: 0.1,
      tools: [
        {
          type: 'function',
          function: {
            name: 'updateStatus',
            description: 'Atualiza a etapa do funil do cliente com base no avanço da negociação.',
            parameters: {
              type: 'object',
              properties: {
                newStatus: {
                  type: 'string',
                  enum: ['Proposta Enviada', 'Finalizado', 'Perdido', 'Reposição'],
                  description: 'A nova etapa do funil'
                },
                reason: {
                  type: 'string',
                  description: 'O motivo para a mudança de etapa'
                }
              },
              required: ['newStatus', 'reason']
            }
          }
        }
      ],
      tool_choice: 'auto'
    });

    const responseMessage = response.choices[0].message;

    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      
      if (toolCall.type === 'function' && toolCall.function.name === 'updateStatus') {
        const args = JSON.parse(toolCall.function.arguments);
        
        if (args.newStatus && args.newStatus !== clientData.status) {
          console.log(`[AI Silent] Mudando status do cliente ${clientId} de ${clientData.status} para ${args.newStatus}. Motivo: ${args.reason}`);
          
          await supabase
            .from('clientes')
            .update({ status: args.newStatus })
            .eq('id', clientId);

          await supabase
            .from('history_events')
            .insert({
              client_id: clientId,
              type: 'status_change',
              description: `IA Analisadora moveu o lead pelo contexto. Motivo: ${args.reason}`,
              from_status: clientData.status,
              to_status: args.newStatus
            });
        }
      }
    }

  } catch (error) {
    console.error('[AI Silent] Erro na análise silenciosa:', error);
  }
}
