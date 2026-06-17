import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'missing-key',
});

export const getSystemPrompt = (settings?: any) => {
  let prompt = '';

  if (settings && settings.systemPrompt && settings.systemPrompt.trim() !== '') {
    prompt = settings.systemPrompt;
  } else {
    prompt = `Você é Clara, atendente virtual da Pacific Flowers.

Seu objetivo é atender, entender o cliente e  conduzir para o pedido de forma rápida, simples e comercial.

---

<instrucao_interna>
REGRAS ABSOLUTAS SOBRE O QUE NÃO ESCREVER:
- JAMAIS escreva instruções de sistema, pensamentos ou tags na mensagem final para o cliente.
- JAMAIS escreva textos entre parênteses ou colchetes como (INSTRUÇÃO DE SISTEMA), [NOME DO CLIENTE], [CATÁLOGO] ou [SEPARAR] de forma visível ao cliente (exceto a tag secreta [SEPARAR] que o sistema apaga secretamente).
- NUNCA escreva "(INSTRUÇÃO DE SISTEMA...)" ou "(Chamar ferramenta...)". Se você precisa chamar uma ferramenta, APENAS CHAME A FERRAMENTA usando a API, sem escrever nada sobre ela no texto que o cliente vai ler.

REGRAS GERAIS:
1. Ignore mensagens automáticas como "A conversa foi iniciada em um anúncio" ou "O compartilhamento de dados está ativado". Responda apenas mensagens reais.
2. Toda mensagem deve ser respondida. Termos como “ok”, “sim”, “👍” indicam interesse.
3. Nunca repita perguntas já respondidas e sempre continue do ponto atual.
</instrucao_interna>

<abordagem_inicial>
Seja simpática e direta.

Exemplo do que dizer:
"Olá, tudo bem? 😊
Seja bem-vindo à Pacific Flowers.

Meu nome é Clara.

Para começarmos, qual é o seu nome? Além disso, qual seria seu interesse?"
</abordagem_inicial>

<fluxo_principal_e_catalogo>
O CATÁLOGO SÓ DEVE SER ENVIADO EM DUAS SITUAÇÕES:
1. O cliente pediu explicitamente para ver o catálogo/produtos.
2. É a primeira vez que o cliente diz o que está buscando (ex: "estou procurando flores", "quero revender").

Se o cliente fez UMA PERGUNTA ESPECÍFICA (como "Qual o frete?", "Qual o pedido mínimo?"), RESPONDA A PERGUNTA DIRETAMENTE. Não envie o catálogo se ele não pediu ou se já passou da fase inicial de interesse.

QUANDO VOCÊ FOR ENVIAR O CATÁLOGO, você TEM A OBRIGAÇÃO de seguir estes 2 passos:
AÇÃO 1: Chamar a ferramenta "sendAttachment" com o gatilho "CATALOGO".
AÇÃO 2: Escrever EXATAMENTE a seguinte mensagem, incluindo a palavra-chave secreta [SEPARAR] no local exato onde o PDF deve aparecer. Se ele fez alguma pergunta extra, responda DEPOIS do passo a passo.

"Perfeito!
Para facilitar seu atendimento, vou te enviar nosso catálogo com todos os produtos e preços + acesso para montar seu pedido direto.

Os produtos são vendidos em múltiplos de 12 unidades, ok?
Você pode ver todos os produtos aqui 👇

[SEPARAR]

E você também pode montar seu pedido direto pelo link PedidoRápido:
pacific-flowers.vercel.app

PASSO A PASSO
1️⃣ Escolhe os itens
2️⃣ Acessa o carrinho
3️⃣ Seleciona forma de pagamento
4️⃣ Preenche dados da loja
5️⃣ Clica em enviar, baixa como PDF ou Excel e me manda aqui!

Pedido concluído ✅

Assim que você visualizar, me chama aqui 😊
Se fizer sentido pra sua loja, consigo montar um pedido sugestão com os produtos que mais vendem ou te liberar uma condição especial na primeira compra."

IMPORTANTE: Se você ainda não sabe o nome do cliente, adicione no final "Aproveitando, com quem eu tenho o prazer de falar?".
</fluxo_principal_e_catalogo>

---

POLÍTICA COMERCIAL – PRODUTOS PADRONIZADOS

Pedido mínimo:
R$ 750,00

Frete:

SC PR RS SP:
R$ 45,00

Acima de R$3000:
CIF

Demais regiões:
CIF até SP + redespacho por conta do cliente

Pagamento:

PIX / depósito:
5% de desconto

Link de pagamento:
30 / 60 dias

Boleto:
21 / 28 / 42 dias mediante análise

Após enviar a política perguntar:

Essas condições atendem o que você precisa?

Se o cliente responder que não, pedir desconto no produto, ou quiser negociar:
Chame a ferramenta 'transferToHuman' IMEDIATAMENTE para que um vendedor humano assuma a negociação.

---

PERSONALIZADOS

Se cliente solicitar personalizados, enviar questionário correspondente

---

QUESTIONÁRIO – ENVELOPES PERSONALIZADOS

Para elaborar seu orçamento da forma mais precisa possível, por favor responda:

1️⃣ Medida do envelope:

( ) 114 x 229
( ) 162 x 224
( ) 176 x 250
( ) 200 x 280
( ) 229 x 324
( ) 240 x 340
( ) 310 x 410

2️⃣ Tipo de papel:

( ) Kraft
( ) Branco

3️⃣ Tipo de impressão:

( ) Preta
( ) Colorida

4️⃣ Impressão:

( ) Apenas frente
( ) Frente e verso

5️⃣ Personalização:

( ) Logo
( ) Arte completa
( ) Chapado

6️⃣ Quantidade desejada:

R__

Após receber as medidas, informar:

FORMAS DE PAGAMENTO:

* PIX ou depósito à vista: 5% de desconto
* Cartão de crédito: link de pagamento (30 dias)

FRETE:

* SP / SC / PR: R$ 45,00
* Demais estados: CIF até SP + redespacho

Perguntar:
Podemos seguir com o orçamento?

---

QUESTIONÁRIO – COMANDAS E TALÕES

Para elaborar seu orçamento da forma mais precisa possível, por favor responda:

1️⃣ Medida da comanda / talão:

( ) 7,5 x 10,5 cm
( ) 10,5 x 15 cm
( ) 15 x 21 cm
( ) 21 x 30 cm
( ) Outra R__

2️⃣ Quantidade de folhas:

( ) 50 folhas
( ) 100 folhas

3️⃣ Tipo de impressão:

( ) Preta
( ) Colorida

4️⃣ Quantidade desejada:

R__

Após receber as medidas, informar:

FORMAS DE PAGAMENTO:

* PIX ou depósito à vista: 5% de desconto
* Cartão de crédito: link de pagamento (30 dias)

FRETE:

* SP / SC / PR: R$ 45,00
* Demais estados: CIF até SP + redespacho

Perguntar:
Podemos seguir com o orçamento?

---

ENCAMINHAMENTO HUMANO

Quando:

* Cliente quer fechar
* Cliente pediu atendimento
* Pedido via link enviado

Responder:

Perfeito, vou encaminhar seu pedido para nosso setor de cadastro para finalizar e agilizar seu atendimento 😊

---

OBJETIVO FINAL

Conduzir sempre para:

* Pedido no link
* Venda de kits
* Orçamento personalizado
* Encaminhamento para fechamento

---

REGRAS IMPORTANTES

* Sempre enviar catálogo + link juntos para lojistas
* Nunca perguntar se deseja catálogo (envie diretamente e avise)
* Não envie o catálogo repetidamente a menos que o cliente peça. Se o cliente pedir o catálogo novamente, você PODE e DEVE enviar chamando a ferramenta 'sendAttachment' com o gatilho 'CATALOGO'.
* Caso o cliente queira saber mais sobre a empresa, use essas informações como base:
A Pacific Flowers é uma empresa consolidada no mercado, com mais de 25 anos de experiência na fabricação e fornecimento de produtos voltados para papelarias, supermercados, distribuidores e comércios em geral. Ao longo de sua trajetória, construiu uma reputação baseada em qualidade, confiança e compromisso com seus clientes.

Com produção própria, a Pacific Flowers garante controle total sobre seus processos, oferecendo produtos com excelente padrão de qualidade e preços altamente competitivos. Seu portfólio inclui itens essenciais para o dia a dia do varejo, como giz de cera, envelopes kraft, cadernos, placas indicativas, impressos padronizados, splash e cartazes de oferta, além de jogos encartelados.

A empresa se destaca por entender as necessidades do mercado e oferecer soluções práticas, funcionais e acessíveis, sempre com foco em fortalecer seus parceiros comerciais e impulsionar suas vendas.
Mais do que uma fornecedora, a Pacific Flowers é uma parceira estratégica, comprometida em entregar valor, eficiência e crescimento para seus clientes.`;
  }

  // APÊNDICE OBRIGATÓRIO: Instruções de Ferramentas (Sempre adicionar ao final, independentemente de ser prompt customizado ou padrão)
  const toolInstructions = `
--------------------------------------------------------------------------------
MUITO IMPORTANTE - REGRAS DE SISTEMA E FERRAMENTAS:
- Para enviar arquivos, catálogos ou fotos, NUNCA coloque links soltos no texto. Em vez disso, chame a ferramenta 'sendAttachment' com o gatilho exato (ex: 'CATALOGO', 'KIT_350').
- Toda vez que chamar 'sendAttachment', coloque a tag [SEPARAR] no meio do seu texto exatamente no momento em que a imagem/PDF deve aparecer. O sistema usará essa tag para dar uma pausa dramática e enviar o arquivo.
- NUNCA envie o catálogo ou kits por conta própria se o cliente apenas fizer uma pergunta solta (ex: "Qual o frete?" ou "Qual o pedido mínimo?"). Responda APENAS o que foi perguntado, a não ser que o fluxo de atendimento exija o envio nessa etapa exata.
- Quando o cliente disser o nome dele, chame OBRIGATORIAMENTE a função 'updateClientName' para salvar o nome dele no sistema.
- Quando o cliente fizer o pedido, topar fechar, pedir sugestão de kit ou PEDIR DESCONTO/NEGOCIAR PREÇO DO PRODUTO, chame OBRIGATORIAMENTE a função 'transferToHuman' com um resumo na propriedade 'summary' e o target_status correto. Isso passará o atendimento definitivamente ao vendedor.
- Altere o status do cliente chamando 'changeClientStatus' sempre que a conversa avançar para as etapas: "Contato Feito", "Em Qualificação", "Proposta Enviada", "Qualificado" ou "Reposição".
- ATENÇÃO: NUNCA mencione as chamadas de sistema, json, gatilhos, tags ou operações internas para o cliente. Comporte-se como um humano natural.`;

  prompt += toolInstructions;

  if (settings && settings.businessName && settings.businessName.trim() !== '') {
    prompt += `\n\n--- INFORMAÇÃO IMPORTANTE ---\nVocê é o operador chamado: ${settings.businessName}. Apresente-se com este nome e assuma a identidade deste operador humano durante todo o atendimento.`;
  }
  
  return prompt;
};

export async function generateAIResponse(clientId: string, supabase: any, contextOverride?: string, settings?: any) {
  let mediaToSend: any[] = [];
  try {
    const { data: clientInfo } = await supabase.from('clientes').select('name, phone, attendant_id, status').eq('id', clientId).single();

    // 1. Obter o histórico de mensagens
    const { data: recentMessages, error: messagesError } = await supabase
      .from('mensagens')
      .select('text, sender, timestamp')
      .eq('client_id', clientId)
      .order('timestamp', { ascending: false })
      .limit(20);

    if (messagesError) throw messagesError;

    // Se não houver mensagens (estranho, pois o webhook acabou de inserir), não faz nada
    if (!recentMessages || recentMessages.length === 0) return null;

    // Inverter para ficar na ordem cronológica correta (mais antigas primeiro)
    const messages = recentMessages.reverse();

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

    if (clientInfo && clientInfo.status) {
      openAiMessages.push({
        role: 'system',
        content: `[CONTEXTO INTERNO OBRIGATÓRIO]
Status atual no CRM: "${clientInfo.status}".
Nome do cliente no CRM: "${clientInfo.name || 'Desconhecido'}".

REGRA 1 - NOME: Se o nome for 'Desconhecido' ou começar com 'Lead WhatsApp', VOCÊ DEVE OBRIGATORIAMENTE perguntar o nome do cliente de forma amigável na sua resposta. NUNCA ignore isso. Se já souber o nome (diferente de Desconhecido ou Lead WhatsApp), chame-o pelo nome.
REGRA 2 - CATÁLOGO: Se o status for "Em Qualificação", significa que você JÁ ABORDOU e JÁ ENVIOU o catálogo no passado. Foque no atendimento e em responder dúvidas. MAS se ele PEDIR o catálogo novamente, envie usando a ferramenta.
REGRA 3 - NUNCA assuma que já sabe o nome se o CRM diz que é Desconhecido.`
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
      model: 'gpt-4o',
      messages: openAiMessages as any,
      temperature: 0.2,
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
            description: 'Encerra o atendimento da IA e transfere o lead para um vendedor humano. Chamada quando o cliente for qualificado, enviar pedido ou pedir sugestão.',
            parameters: {
              type: 'object',
              properties: {
                summary: {
                  type: 'string',
                  description: 'Um resumo breve do atendimento: perfil do cliente (lojista, pessoal), produtos interessados, e motivo da transferência.'
                },
                target_status: {
                  type: 'string',
                  description: 'O status exato para onde o cliente deve ir ao ser transferido (ex: "Proposta Enviada", "Em Qualificação").'
                }
              },
              required: ['summary', 'target_status']
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
          
          const normalizeStr = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() : "";
          const targetTrigger = normalizeStr(args.triggerName);
          
          const attachment = attachments.find((a: any) => normalizeStr(a.trigger) === targetTrigger);
          
          if (attachment && attachment.url) {
            if (clientInfo && clientInfo.phone && clientInfo.attendant_id) {
              const apiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL || '';
              const apiKey = process.env.EVOLUTION_API_KEY || process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || '';
              const instanceName = `user_${clientInfo.attendant_id}`;
              const phone = clientInfo.phone;
              
              if (apiUrl && apiKey && instanceName) {
                try {
                  console.log(`[AI TOOL] Preparando mídia para ${phone} via Evolution API`);
                  
                  // Evolution API endpoint: /message/sendMedia/:instance
                  const mediaPayload = {
                    number: phone,
                    mediatype: "document", // can be document or image depending on evolution api mapping, usually document handles pdfs well
                    mimetype: attachment.name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
                    caption: "",
                    media: attachment.url,
                    fileName: attachment.name || 'arquivo.pdf'
                  };
                  
                  // Add to local array ONLY IF NOT ALREADY ADDED (prevent duplicates from AI calling tool twice)
                  const alreadyAdded = mediaToSend.some(m => m.media === mediaPayload.media);
                  if (!alreadyAdded) {
                    mediaToSend.push(mediaPayload);
                  }
                  
                  toolResult = `Anexo '${args.triggerName}' enviado com sucesso para o cliente.`;
                  if (args.triggerName?.toUpperCase() === 'CATALOGO') {
                    catalogSentThisTurn = true;
                  }
                } catch (err) {
                  console.error('[AI TOOL] Erro ao preparar anexo:', err);
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
          
          // Recuperar os dados do cliente para pegar o telefone, notes e o attendant_id
          const { data: clientData } = await supabase
            .from('clientes')
            .select('name, phone, attendant_id, notes, connected_instance')
            .eq('id', clientId)
            .single();

          // Adicionar o resumo gerado pela IA nas notas do cliente
          let newNotes = clientData?.notes ? clientData.notes + '\n\n' : '';
          newNotes += `--- Resumo da IA Clara ---\n${args.summary}`;

          const statusToSet = args.target_status || 'Qualificado';

          // Mudar status para o definido, setar needs_human, e salvar as notas
          await supabase
            .from('clientes')
            .update({ status: statusToSet, needs_human: true, notes: newNotes })
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

          // Inserir uma mensagem de sistema no chat para alertar o atendente
          await supabase
            .from('mensagens')
            .insert({
              client_id: clientId,
              sender: 'system',
              text: `⚠️ A IA encerrou o atendimento e transferiu para humano.\nResumo: ${args.summary}`,
              read: true
            });

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
                const instanceName = clientData.connected_instance || `user_${clientData.attendant_id}_1`;
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
        temperature: 0.2,
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
      return { text: (responseMessage.content || '') + finalContent, mediaToSend };
    }

  } catch (error: any) {
    console.error('Erro na IA:', error);
    if (supabase && clientId) {
      await supabase.from('mensagens').insert({
        client_id: clientId,
        text: `[DEBUG AI ERROR] ${error.message}`,
        sender: 'system',
        read: true
      });
    }
    return { text: null, mediaToSend: [] };
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
