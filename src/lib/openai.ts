import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const getSystemPrompt = (settings?: any) => {
  let prompt = '';

  if (settings && settings.systemPrompt && settings.systemPrompt.trim() !== '') {
    prompt = settings.systemPrompt;
  } else {
    prompt = `Você é a atendente virtual da Pacific Flowers.

Seu objetivo é atender, entender o cliente e  conduzir para o pedido de forma rápida, simples e comercial.

---
FILTRO DE SISTEMA (PRIORIDADE MÁXIMA)
Ignore mensagens automáticas como:
"A conversa foi iniciada em um anúncio"
"O compartilhamento de dados está ativado"
Responda apenas mensagens reais do cliente.

---
REGRA DE RESPOSTA\n* Se o cliente fizer uma pergunta fora do roteiro, RESPONDA A PERGUNTA DE FORMA CLARA E DIRETA antes de tentar voltar ao roteiro.
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
1️⃣ Escolhe os itens
2️⃣ Acessa o carrinho
3️⃣ Seleciona forma de pagamento
4️⃣ Preenche dados da loja
5️⃣ Clica em enviar
Pedido concluído ✅

---
PÓS CATÁLOGO (GATILHO)
Assim que você visualizar, me chama aqui 😊
Se fizer sentido pra sua loja, consigo montar um pedido sugestão com os produtos que mais vendem ou te liberar uma condição especial na primeira compra.

---
APÓS ENVIO
Se reclamar do pedido mínimo:
Perguntar: Qual seria o valor ideal para iniciarmos nossa parceria?
Se menor que 350:
Estamos com uma campanha de novos clientes.
Você consegue ajustar para R$350 para aproveitarmos a oportunidade?

---
REGRA DOS KITS
* Até R$350 → Kit R$350
* Até R$850 → Kit R$850
* R$850 até R$1700 → 2x Kit 750
* Acima → multiplicar
Exemplo: 3 kits = R$2350

---
REGRA IMPORTANTE – SUGESTÃO DE VALOR
Sempre considerar o valor informado pelo cliente e sugerir o próximo kit acima.
Exemplos:
* Cliente: R$600 → sugerir Kit R$850
* Cliente: R$900 → sugerir 2x Kit R$850 (R$1700)
* Cliente: R$1200 → sugerir 2x Kit R$850
Nunca sugerir valor menor que o informado.

---
REGRAS DOS KITS
* Nunca enviar mais de um kit por vez
* Nunca enviar vários kits juntos
* Cada kit possui gatilho individual

---
EXPLICAÇÃO DOS KITS
Os kits são compostos pelos produtos mais vendidos, principalmente placas indicativas, pensados para alto giro em loja.

---
POLÍTICA COMERCIAL – PRODUTOS PADRONIZADOS
Pedido mínimo: R$ 750,00
Frete:
SC PR RS SP: R$ 45,00
Acima de R$3000: CIF
Demais regiões: CIF até SP + redespacho por conta do cliente
Pagamento:
PIX / depósito: 5% de desconto
Link de pagamento: 30 / 60 dias
Boleto: 21 / 28 / 42 dias mediante análise

Após enviar a política perguntar:
Essas condições atendem o que você precisa?
Se o cliente responder que não:
Sem problema 😊 Qual valor você gostaria de trabalhar que eu monto uma sugestão de kit pra você?

---
ENCAMINHAMENTO HUMANO
Quando:
* Cliente quer fechar
* Cliente pediu atendimento
* Pedido via link enviado
Responder:
Perfeito, vou encaminhar seu pedido para nosso setor de cadastro para finalizar e agilizar seu atendimento 😊

OBJETIVO FINAL
Conduzir sempre para:
* Pedido no link
* Venda de kits
* Encaminhamento para fechamento

---
REGRAS IMPORTANTES
* Sempre enviar catálogo + link juntos para lojistas
* Nunca enviar o catálogo duas vezes

--------------------------------------------------------------------------------
MUITO IMPORTANTE - CHAMADAS DE FUNÇÃO:
- Quando você precisar enviar o catálogo ou o link para o cliente lojista, chame a função 'sendAttachment' com o gatilho 'CATALOGO' e não escreva o link no texto, diga apenas que enviou o catálogo.
- Quando sugerir um kit, chame a função 'sendAttachment' com o gatilho exato (ex: 'KIT_350', 'KIT_850').
MUITO IMPORTANTE - CHAMADAS DE FUNÇÃO:
- Quando o cliente disser o nome dele, chame OBRIGATORIAMENTE a função 'updateClientName' para salvar o nome dele no sistema.
- Quando a condição de ENCAMINHAMENTO HUMANO for atendida, chame OBRIGATORIAMENTE a função 'transferToHuman' e faça um resumo da conversa na propriedade 'summary'. Isso passará o atendimento definitivamente ao vendedor humano.`;
  }

  if (settings && settings.businessName && settings.businessName.trim() !== '') {
    prompt += `\n\n--- INFORMAÇÃO IMPORTANTE ---\nVocê é o operador chamado: ${settings.businessName}. Apresente-se com este nome e assuma a identidade deste operador humano durante todo o atendimento.`;
  }
  
  return prompt;
};

export async function generateAIResponse(clientId: string, supabase: any, contextOverride?: string, settings?: any) {
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
      { role: 'system', content: getSystemPrompt(settings) }
    ];

    if (contextOverride === 'REPOSICAO_25_DIAS') {
      openAiMessages.push({
        role: 'system',
        content: "Atenção: Já se passaram 25 dias desde a última compra deste cliente. Mande uma mensagem amigável, seguindo suas diretrizes de vendas e personalidade, para sugerir a reposição de estoque."
      });
    } else if (contextOverride === 'FOLLOW_UP_INATIVIDADE') {
      openAiMessages.push({
        role: 'system',
        content: "Atenção: O cliente parou de responder há alguns minutos. Mande uma mensagem de acompanhamento curta e amigável para retomar a conversa, mantendo estritamente as regras e a personalidade do seu prompt principal."
      });
    } else if (contextOverride === 'INSISTENCIA_HORAS') {
      openAiMessages.push({
        role: 'system',
        content: "Atenção: Já se passaram algumas horas sem resposta. Sua missão agora é tentar retomar a conversa de forma natural e amigável, seguindo rigorosamente sua identidade e regras do prompt principal."
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
            name: 'sendAttachment',
            description: 'Envia um anexo (mídia, catálogo, foto de kit) para o cliente pelo WhatsApp com base em um gatilho configurado.',
            parameters: {
              type: 'object',
              properties: {
                triggerName: {
                  type: 'string',
                  description: 'O nome exato do gatilho configurado pelo vendedor. Ex: "CATALOGO", "KIT_350", "KIT_850"'
                }
              },
              required: ['triggerName']
            }
          }
        },
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
        },
        {
          type: 'function',
          function: {
            name: 'changeClientStatus',
            description: 'Altera a etapa do funil do cliente com base no andamento do atendimento (Ex: Contato Feito, Em Qualificação, Proposta Enviada, Reposição). Use quando o cliente avançar naturalmente na conversa.',
            parameters: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  description: 'O novo status do cliente no Kanban. Opções válidas: "Contato Feito", "Em Qualificação", "Proposta Enviada", "Qualificado", "Reposição"'
                }
              },
              required: ['status']
            }
          }
        }
      ],
      tool_choice: 'auto'
    });

    let responseMessage = response.choices[0].message;
    let finalContent = '';
    let catalogSentThisTurn = false;

    // Processar Chamadas de Ferramenta (Tool Calls)
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      // Adiciona a mensagem da assistente contendo as chamadas de ferramenta
      openAiMessages.push(responseMessage as any);

      for (const tC of responseMessage.tool_calls) {
        const toolCall = tC as any;
        const args = JSON.parse(toolCall.function.arguments);
        let toolResult = "Operação realizada com sucesso.";
        
        if (toolCall.function.name === 'sendAttachment') {
          console.log(`[AI TOOL] Solicitado envio do anexo com gatilho: ${args.triggerName}`);
          
          const attachments = settings?.attachments || [];
          const attachment = attachments.find((a: any) => a.trigger?.toUpperCase() === args.triggerName?.toUpperCase());
          
          if (attachment && attachment.url) {
            // Obter phone e instanceName do cliente
            const { data: clientInfo } = await supabase.from('clientes').select('phone, attendant_id').eq('id', clientId).single();
            if (clientInfo && clientInfo.phone && clientInfo.attendant_id) {
              const apiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL || '';
              const apiKey = process.env.EVOLUTION_API_KEY || process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || '';
              const instanceName = `user_${clientInfo.attendant_id}`;
              const phone = clientInfo.phone;
              
              if (apiUrl && apiKey && instanceName) {
                try {
                  console.log(`[AI TOOL] Enviando mídias para ${phone} via Evolution API`);
                  
                  // Evolution API endpoint: /message/sendMedia/:instance
                  const mediaPayload = {
                    number: phone,
                    mediatype: "document", // can be document or image depending on evolution api mapping, usually document handles pdfs well
                    mimetype: attachment.name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
                    caption: `Aqui está o que você pediu! (${args.triggerName})`,
                    media: attachment.url,
                    fileName: attachment.name || 'arquivo.pdf'
                  };
                  
                  const evoRes = await fetch(`${apiUrl}/message/sendMedia/${instanceName}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                    body: JSON.stringify(mediaPayload)
                  });
                  
                  if (!evoRes.ok) {
                    const evoErr = await evoRes.text();
                    console.error(`[AI TOOL] Erro do Evolution API: Status ${evoRes.status} - ${evoErr}`);
                    throw new Error(`Evolution API error: ${evoRes.status} ${evoErr}`);
                  }
                  
                  toolResult = `Anexo '${args.triggerName}' enviado com sucesso para o cliente.`;
                  finalContent = finalContent + `\n\n[ANEXO ENVIADO: ${args.triggerName}]`;
                  if (args.triggerName?.toUpperCase() === 'CATALOGO') {
                    catalogSentThisTurn = true;
                  }
                } catch (err) {
                  console.error('[AI TOOL] Erro ao enviar anexo:', err);
                  toolResult = `Erro ao tentar enviar o anexo: ${args.triggerName}`;
                }
              } else {
                toolResult = `Faltam configurações de API para enviar o anexo.`;
              }
            } else {
              toolResult = `Não foi possível identificar o telefone ou instância do cliente.`;
            }
          } else {
            console.log(`[AI TOOL] Gatilho '${args.triggerName}' não encontrado nas configurações do vendedor.`);
            toolResult = `O gatilho '${args.triggerName}' não está configurado. Diga ao cliente que houve um erro ao buscar o arquivo.`;
          }
        } else if (toolCall.function.name === 'updateClientName') {
          console.log(`[AI TOOL] Atualizando nome do cliente para: ${args.name}`);
          await supabase
            .from('clientes')
            .update({ name: args.name })
            .eq('id', clientId);
          toolResult = `Nome atualizado com sucesso para ${args.name}.`;
        } else if (toolCall.function.name === 'changeClientStatus') {
          console.log(`[AI TOOL] Alterando status do cliente para: ${args.status}`);
          
          if (args.status === 'Em Qualificação' || args.status === 'Qualificado') {
            const { data: msgs } = await supabase
              .from('mensagens')
              .select('text')
              .eq('client_id', clientId)
              .ilike('text', '%[ANEXO ENVIADO: CATALOGO]%');
              
            const alreadySent = msgs && msgs.length > 0;
            
            if (!alreadySent && !catalogSentThisTurn) {
              toolResult = "ERRO DE SEGURANÇA: O catálogo ainda não foi enviado. Você é OBRIGADO a enviar o catálogo para o cliente (usando a ferramenta sendAttachment com trigger 'CATALOGO') ANTES de alterar o status para 'Em Qualificação'. Explique isso ao cliente ou envie o catálogo agora.";
              openAiMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: toolResult
              } as any);
              console.log("[AI TOOL] Bloqueada mudança de status: Catálogo não enviado.");
              continue; // Interrompe a alteração no BD e no histórico
            }
          }
          
          await supabase
            .from('clientes')
            .update({ status: args.status })
            .eq('id', clientId);
          
          await supabase
            .from('history_events')
            .insert({
              client_id: clientId,
              type: 'status_change',
              description: `A IA Clara alterou o status para ${args.status}.`,
            });
            
          toolResult = `Status atualizado com sucesso para ${args.status}.`;
        }

        if (toolCall.function.name === 'transferToHuman') {
          console.log(`[AI TOOL] Transferindo cliente para humano. Resumo: ${args.summary}`);
          
          // Mudar status para 'Qualificado' e setar needs_human
          await supabase
            .from('clientes')
            .update({ status: 'Qualificado', needs_human: true })
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
    if (responseMessage.content || finalContent) {
      if (catalogSentThisTurn) {
        // Avançar o lead para Qualificação quando receber o catálogo, conforme solicitado pelo cliente (Tarefa 9)
        await supabase.from('clientes').update({ status: 'Em Qualificação' }).eq('id', clientId);
        await supabase.from('history_events').insert({
          client_id: clientId,
          type: 'status_change',
          description: 'A IA Clara enviou o catálogo e avançou o status para Em Qualificação.',
        });
      }
      return (responseMessage.content || '') + finalContent;
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
