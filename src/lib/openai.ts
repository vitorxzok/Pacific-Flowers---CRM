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
    const DEFAULT_SYSTEM_PROMPT = `Você é Clara, atendente virtual da Pacific Flowers.

Seu objetivo é atender, entender o cliente e conduzir para o pedido de forma rápida, simples e comercial.

<instrucao_interna>
REGRAS GERAIS DE COMPORTAMENTO:
1. Jamais escreva tags como <instrucao_interna> ou palavras em maiúsculo entre colchetes/parênteses (ex: [FLUXO PRINCIPAL], [SEPARAR]) na mensagem enviada ao cliente! Essas são apenas regras para você ler.
2. Ignore mensagens automáticas como "A conversa foi iniciada em um anúncio" ou "O compartilhamento de dados está ativado". Responda apenas mensagens reais do cliente.
3. Toda mensagem deve ser respondida. Termos como "ok", "sim", "👍" indicam interesse.
4. Nunca repita perguntas já respondidas.
5. Sempre continue do ponto atual da conversa.
</instrucao_interna>

<abordagem_inicial>
Seja simpática e direta.

Exemplo do que dizer:
"Olá, tudo bem? 😊
Seja bem-vindo à Pacific Flowers.

Sou consultor de vendas da Pacific Flowers Ind.

Para começarmos, qual é o seu nome? Somos fabricantes, Você é lojista? Caso seja lojista gostaria de receber nosso catalogo com todos os produtos que fabricamos?"
</abordagem_inicial>

<fluxo_principal>
"Perfeito, [NOME DO CLIENTE]!
Para facilitar seu atendimento, segue abaixo o acesso ao catálogo eletrônico com todos os produtos e também nossa política comercial.
Os produtos são vendidos em múltiplos de 12 unidades. Você pode me passar os códigos ou nome dos produtos, bem como as quantidades para cada um dos produtos, como ficar melhor para você, ok?
Você pode ver todos os produtos aqui e também pode montar seu pedido direto pelo link PedidoRápido:

https://pacific-flowers.vercel.app
[SEPARAR]
"
</fluxo_principal>

<pos_catalogo>
Após enviar o catálogo com a ferramenta e a mensagem acima, passe as seguintes instruções de forma amigável:

"PASSO A PASSO
1️⃣ Escolhe os itens
2️⃣ Acessa o carrinho
3️⃣ Seleciona forma de pagamento
4️⃣ Preenche dados da loja
5️⃣ Clica em enviar, baixa como PDF ou Excel e me manda aqui!

Pedido concluído ✅

Fique tranquilo que será apenas uma simulação, e caso queira ajustar algum detalhe antes de enviarmos à produção o faremos conforme sua autorização ok 😊"
</pos_catalogo>

<politica_comercial>
POLÍTICA COMERCIAL – PRODUTOS PADRONIZADOS
Pedido mínimo: R$ 750,00

Frete:
SC, PR, RS, SP: R$ 45,00
Acima de R$3000: CIF
Demais regiões: CIF até SP + redespacho por conta do cliente

Pagamento:
PIX / depósito: 5% de desconto
Link de pagamento: 30 / 60 dias
Boleto: 21 / 28 / 42 dias mediante análise

Após enviar a política, pergunte: "Essas condições atendem o que você precisa?"
Se o cliente disser que não, responda: "Sem problema 😊 Com qual valor você gostaria de trabalhar, para que eu monte uma sugestão de kit pra você?"
</politica_comercial>

<encaminhamento_humano>
Quando o cliente quiser fechar, pedir atendimento humano, ou disser que já enviou o pedido pelo link:

Responda ao cliente: "Perfeito, vou encaminhar seu pedido para nosso setor de cadastro para finalizar e agilizar seu atendimento 😊"

IMEDIATAMENTE APÓS DAR ESSA RESPOSTA, CHAME A FERRAMENTA "transferToHuman" COM O RESUMO DO QUE OCORREU.
Se você não chamar a ferramenta, o vendedor não será avisado!
</encaminhamento_humano>

<objetivo_final>
Conduzir sempre para:
* Pedido no link
* Encaminhamento para fechamento (usando a ferramenta)

REGRAS FINAIS:
* Sempre enviar catálogo link para lojistas (usando a ferramenta)
* Nunca perguntar se deseja catálogo (envie diretamente e avise)
* Nunca enviar o catálogo duas vezes
* Sobre a Pacific Flowers: Empresa consolidada, mais de 25 anos de experiência (papelarias, supermercados, distribuidores). Produção própria, excelente qualidade. Produtos: giz de cera, envelopes kraft, cadernos, placas, splash, cartazes, jogos.

MUITO IMPORTANTE - REGRAS DE SISTEMA E FERRAMENTAS:
- Para enviar o catálogo, chame OBRIGATORIAMENTE a ferramenta 'sendAttachment' com o gatilho exato: 'CATALOGO'.
- Toda vez que chamar 'sendAttachment', coloque a tag secreta [SEPARAR] no meio do seu texto no momento em que a imagem/PDF deve aparecer. O sistema apagará a tag e enviará o arquivo.
- Quando o cliente disser o nome dele, chame a função 'updateClientName'.
- Altere o status do cliente chamando 'changeClientStatus' sempre que a conversa avançar.
- MÍDIAS RECEBIDAS: Se o cliente enviar um áudio, foto, documento ou figurinha, você DEVE informar educadamente que é uma inteligência artificial e que só consegue compreender mensagens de texto (a não ser que ele esteja enviando o PDF do pedido!).
- ATENÇÃO: NUNCA mencione as chamadas de sistema, json, gatilhos, tags ou operações internas para o cliente. Comporte-se como um humano natural.`;
    prompt = DEFAULT_SYSTEM_PROMPT;
  }

  if (settings && settings.businessName && settings.businessName.trim() !== '') {
    prompt += `\n\n--- INFORMAÃ‡ÃƒO IMPORTANTE ---\nVocÃª Ã© o operador chamado: ${settings.businessName}. Apresente-se com este nome e assuma a identidade deste operador humano durante todo o atendimento.`;
  }
  
  return prompt;
};

export async function generateAIResponse(clientId: string, supabase: any, contextOverride?: string, settings?: any) {
  let mediaToSend: any[] = [];
  try {
    const { data: clientInfo } = await supabase.from('clientes').select('name, phone, attendant_id, status').eq('id', clientId).single();

    // 1. Obter o histÃ³rico de mensagens
    const { data: recentMessages, error: messagesError } = await supabase
      .from('mensagens')
      .select('text, sender, timestamp')
      .eq('client_id', clientId)
      .order('timestamp', { ascending: false })
      .limit(20);

    if (messagesError) throw messagesError;

    // Se nÃ£o houver mensagens (estranho, pois o webhook acabou de inserir), nÃ£o faz nada
    if (!recentMessages || recentMessages.length === 0) return null;

    // Inverter para ficar na ordem cronolÃ³gica correta (mais antigas primeiro)
    const messages = recentMessages.reverse();

    // Converter para o formato da OpenAI
    let openAiMessages = [
      { role: 'system', content: getSystemPrompt(settings) }
    ];

    if (contextOverride === 'REPOSICAO_25_DIAS') {
      openAiMessages.push({
        role: 'system',
        content: "AtenÃ§Ã£o: JÃ¡ se passaram 25 dias desde a Ãºltima compra deste cliente. Mande uma mensagem amigÃ¡vel, seguindo suas diretrizes de vendas e personalidade, para sugerir a reposiÃ§Ã£o de estoque."
      });
    } else if (contextOverride === 'FOLLOW_UP_INATIVIDADE') {
      openAiMessages.push({
        role: 'system',
        content: "AtenÃ§Ã£o: O cliente parou de responder hÃ¡ alguns minutos. Mande uma mensagem de acompanhamento curta e amigÃ¡vel para retomar a conversa, mantendo estritamente as regras e a personalidade do seu prompt principal."
      });
    } else if (contextOverride === 'INSISTENCIA_HORAS') {
      openAiMessages.push({
        role: 'system',
        content: "AtenÃ§Ã£o: JÃ¡ se passaram algumas horas sem resposta. Sua missÃ£o agora Ã© tentar retomar a conversa de forma natural e amigÃ¡vel, seguindo rigorosamente sua identidade e regras do prompt principal."
      });
    }

    if (clientInfo && clientInfo.status) {
      openAiMessages.push({
        role: 'system',
        content: `[CONTEXTO INTERNO OBRIGATÃ“RIO]
Status atual no CRM: "${clientInfo.status}".
Nome do cliente no CRM: "${clientInfo.name || 'Desconhecido'}".

REGRA 1 - NOME: Se o nome for 'Desconhecido' ou comeÃ§ar com 'Lead WhatsApp', VOCÃŠ DEVE OBRIGATORIAMENTE perguntar o nome do cliente de forma amigÃ¡vel na sua resposta. NUNCA ignore isso. Se jÃ¡ souber o nome (diferente de Desconhecido ou Lead WhatsApp), chame-o pelo nome.
REGRA 2 - CATÃ�LOGO: Se o status for "Em QualificaÃ§Ã£o", significa que vocÃª JÃ� ABORDOU e JÃ� ENVIOU o catÃ¡logo no passado. Foque no atendimento e em responder dÃºvidas. MAS se ele PEDIR o catÃ¡logo novamente, envie usando a ferramenta.
REGRA 3 - NUNCA assuma que jÃ¡ sabe o nome se o CRM diz que Ã© Desconhecido.`
      });
    }

    openAiMessages = openAiMessages.concat(
      messages.map((msg: any) => ({
        role: msg.sender === 'client' ? 'user' : 'assistant',
        content: msg.text || '',
      }))
    );

    // 2. Chamar a OpenAI com suporte a chamadas de funÃ§Ã£o
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openAiMessages as any,
      temperature: 0.2,
      tools: [
        {
          type: 'function',
          function: {
            name: 'sendAttachment',
            description: 'Envia um anexo (mÃ­dia, catÃ¡logo, foto de kit) para o cliente pelo WhatsApp com base em um gatilho configurado.',
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
            description: 'Atualiza o nome do cliente no sistema de CRM (Banco de Dados) apÃ³s ele se apresentar.',
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
            description: 'Encerra o atendimento da IA e transfere o lead para um vendedor humano. Chamada quando o cliente for qualificado, enviar pedido ou pedir sugestÃ£o.',
            parameters: {
              type: 'object',
              properties: {
                summary: {
                  type: 'string',
                  description: 'Um resumo breve do atendimento: perfil do cliente (lojista, pessoal), produtos interessados, e motivo da transferÃªncia.'
                },
                target_status: {
                  type: 'string',
                  description: 'O status exato para onde o cliente deve ir ao ser transferido (ex: "Proposta Enviada", "Em QualificaÃ§Ã£o").'
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
            description: 'Altera a etapa do funil do cliente com base no andamento do atendimento (Ex: Contato Feito, Em QualificaÃ§Ã£o, Proposta Enviada, ReposiÃ§Ã£o). Use quando o cliente avanÃ§ar naturalmente na conversa.',
            parameters: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  description: 'O novo status do cliente no Kanban. OpÃ§Ãµes vÃ¡lidas: "Contato Feito", "Em QualificaÃ§Ã£o", "Proposta Enviada", "Qualificado", "ReposiÃ§Ã£o"'
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
        let toolResult = "OperaÃ§Ã£o realizada com sucesso.";
        
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
                  console.log(`[AI TOOL] Preparando mÃ­dia para ${phone} via Evolution API`);
                  
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
                toolResult = `Faltam configuraÃ§Ãµes de API para enviar o anexo.`;
              }
            } else {
              toolResult = `NÃ£o foi possÃ­vel identificar o telefone ou instÃ¢ncia do cliente.`;
            }
          } else {
            console.log(`[AI TOOL] Gatilho '${args.triggerName}' nÃ£o encontrado nas configuraÃ§Ãµes do vendedor.`);
            toolResult = `O gatilho '${args.triggerName}' nÃ£o estÃ¡ configurado. Diga ao cliente que houve um erro ao buscar o arquivo.`;
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
          
          if (args.status === 'Em QualificaÃ§Ã£o' || args.status === 'Qualificado') {
            const { data: msgs } = await supabase
              .from('mensagens')
              .select('text')
              .eq('client_id', clientId)
              .ilike('text', '%[ANEXO ENVIADO: CATALOGO]%');
              
            const alreadySent = msgs && msgs.length > 0;
            
            if (!alreadySent && !catalogSentThisTurn) {
              toolResult = "ERRO DE SEGURANÃ‡A: O catÃ¡logo ainda nÃ£o foi enviado. VocÃª Ã© OBRIGADO a enviar o catÃ¡logo para o cliente (usando a ferramenta sendAttachment com trigger 'CATALOGO') ANTES de alterar o status para 'Em QualificaÃ§Ã£o'. Explique isso ao cliente ou envie o catÃ¡logo agora.";
              openAiMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: toolResult
              } as any);
              console.log("[AI TOOL] Bloqueada mudanÃ§a de status: CatÃ¡logo nÃ£o enviado.");
              continue; // Interrompe a alteraÃ§Ã£o no BD e no histÃ³rico
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

          // Inserir um evento no histÃ³rico com o resumo da IA
          await supabase
            .from('history_events')
            .insert({
              client_id: clientId,
              type: 'status_change',
              description: `A IA Clara encerrou o atendimento e repassou o lead. Resumo: ${args.summary}`,
              from_status: 'Em QualificaÃ§Ã£o',
              to_status: 'Qualificado'
            });

          // Inserir uma mensagem de sistema no chat para alertar o atendente
          await supabase
            .from('mensagens')
            .insert({
              client_id: clientId,
              sender: 'attendant',
              text: `[SISTEMA] ⚠️ A IA encerrou o atendimento e transferiu para humano.\nResumo: ${args.summary}`,
              read: true
            });

          if (clientData && clientData.attendant_id) {
            // Recuperar o nÃºmero de WhatsApp do vendedor
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
                const alertMessage = `âš ï¸� *Lead Qualificado!*\nO lead *${clientData.name || 'Sem Nome'}* (${clientData.phone}) foi qualificado pela IA e estÃ¡ pronto para receber o catÃ¡logo e atendimento humano.\n\n*Resumo da IA:* ${args.summary}`;

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
          toolResult = "Transferência realizada para 'Qualificado'. Você deve agora se despedir de forma educada confirmando que um especialista assumirá o atendimento, mas NUNCA prometa envio de catálogos ou kits se eles já foram enviados.";
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
        // AvanÃ§ar o lead para QualificaÃ§Ã£o quando receber o catÃ¡logo, conforme solicitado pelo cliente (Tarefa 9)
        await supabase.from('clientes').update({ status: 'Em QualificaÃ§Ã£o' }).eq('id', clientId);
        await supabase.from('history_events').insert({
          client_id: clientId,
          type: 'status_change',
          description: 'A IA Clara enviou o catÃ¡logo e avanÃ§ou o status para Em QualificaÃ§Ã£o.',
        });
      }
      return { text: (responseMessage.content || '') + finalContent, mediaToSend };
    }

  } catch (error: any) {
    console.error('Erro na IA:', error);
    return { text: null, mediaToSend: [] };
  }
}

/**
 * AnÃ¡lise Silenciosa:
 * LÃª o histÃ³rico recente da conversa (focado nas falas do atendente humano e do cliente)
 * e avalia em qual etapa do funil o lead se encontra. Se houver mudanÃ§a clara, atualiza.
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

    // Etapas que a IA auto-reply atua (se estiver aqui, a auto-reply cuida, entÃ£o nÃ£o mexemos)
    const initialStages = ['Novo', 'Contato Feito', 'Em QualificaÃ§Ã£o'];
    // Etapas finais
    const finalStages = ['Finalizado', 'Perdido', 'ReposiÃ§Ã£o'];

    if (initialStages.includes(clientData.status) || finalStages.includes(clientData.status)) {
      return; // NÃ£o analisa silenciosamente nestes estados
    }

    // 2. Buscar Ãºltimas 15 mensagens para contexto
    const { data: mensagens } = await supabase
      .from('mensagens')
      .select('text, sender, timestamp')
      .eq('client_id', clientId)
      .order('timestamp', { ascending: false })
      .limit(15);

    if (!mensagens || mensagens.length === 0) return;

    // Inverter para ordem cronolÃ³gica
    const contextMessages = mensagens.reverse().map((m: any) => {
      const isSeller = m.sender === 'attendant';
      return `${isSeller ? 'VENDEDOR' : 'CLIENTE'}: ${m.text}`;
    }).join('\n');

    const SILENT_SYSTEM_PROMPT = `VocÃª Ã© um supervisor silencioso de um funil de vendas.
Sua Ãºnica funÃ§Ã£o Ã© ler o histÃ³rico recente da conversa e determinar se o lead avanÃ§ou ou retrocedeu de etapa.
Status atual do lead: "${clientData.status}"
Nome do lead: "${clientData.name || 'Desconhecido'}"

Etapas permitidas para vocÃª mover:
- "Proposta Enviada": O vendedor enviou um orÃ§amento, preÃ§o ou proposta clara.
- "Finalizado": O cliente comprou, pagou ou o negÃ³cio foi fechado com sucesso.
- "ReposiÃ§Ã£o": O cliente precisa voltar a comprar no futuro (recorrente) ou pediu para avisar depois.
- "Perdido": O cliente disse nÃ£o, achou caro, nÃ£o tem interesse ou parou de responder definitivamente.

Regras:
1. SÃ“ chame a ferramenta \`updateStatus\` se vocÃª tiver absoluta certeza de que a conversa avanÃ§ou para um novo status DIFERENTE do atual.
2. Se a conversa ainda estÃ¡ no status atual, NÃƒO FAÃ‡A NADA. Apenas nÃ£o chame a ferramenta.
3. NÃ£o retorne nenhum texto de resposta para o cliente.`;

    const openAiMessages = [
      { role: 'system', content: SILENT_SYSTEM_PROMPT },
      { role: 'user', content: `HistÃ³rico Recente:\n${contextMessages}` }
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
            description: 'Atualiza a etapa do funil do cliente com base no avanÃ§o da negociaÃ§Ã£o.',
            parameters: {
              type: 'object',
              properties: {
                newStatus: {
                  type: 'string',
                  enum: ['Proposta Enviada', 'Finalizado', 'Perdido', 'ReposiÃ§Ã£o'],
                  description: 'A nova etapa do funil'
                },
                reason: {
                  type: 'string',
                  description: 'O motivo para a mudanÃ§a de etapa'
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
    console.error('[AI Silent] Erro na anÃ¡lise silenciosa:', error);
  }
}
