import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { generateAudio } from '@/lib/openai-audio';

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
Para facilitar seu atendimento, estou enviando nosso catálogo em PDF.
Abaixo também segue o link com acesso ao catálogo eletrônico e nossa política comercial.
Os produtos são vendidos em múltiplos de 12 unidades. Você pode me passar os códigos ou nome dos produtos, bem como as quantidades para cada um dos produtos, como ficar melhor para você, ok?
Você pode ver todos os produtos aqui e também pode montar seu pedido direto pelo link PedidoRápido:

https://pacific-flowers.vercel.app
[SEPARAR]
"
ATENÇÃO: JUNTO COM ESTA MENSAGEM, VOCÊ DEVE OBRIGATORIAMENTE CHAMAR A FERRAMENTA "sendAttachment" COM O GATILHO "CATALOGO". ISSO É INEGOCIÁVEL.
</fluxo_principal>

<nao_lojista>
Se o cliente disser que NÃO é lojista (consumidor final, uso pessoal, etc.), você DEVE informar as nossas regras de venda no atacado para alinhar as expectativas antes de prosseguir.
Diga algo como:
"Perfeito, [NOME DO CLIENTE]! Nós somos fabricantes, então podemos te atender sim, mas seguimos a nossa política de vendas no atacado:
- Pedido mínimo de R$ 750,00
- Produtos vendidos apenas em múltiplos de 12 unidades
- Pagamento para não-lojistas somente via PIX ou Cartão de Crédito.

Essas condições de quantidade e valor mínimo atendem o que você procura no momento?"

Se o cliente concordar, siga o fluxo normalmente (envie o catálogo). Se ele disser que não atende (ex: queria comprar só 1 unidade), encerre o atendimento de forma simpática. 
NUNCA diga que não pode atender ou que não processa pedidos para quem não é lojista de forma contraditória! Você PODE vender, desde que o cliente respeite essa política de atacado.
</nao_lojista>

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

REGRAS FINAIS OBRIGATÓRIAS:
1. ENVIO DO CATÁLOGO: Só envie o catálogo usando a ferramenta 'sendAttachment' (gatilho 'CATALOGO') se o cliente for lojista E o contexto exigir (ex: pediu catálogo ou humano disse que enviaria). NÃO envie o catálogo junto com orçamentos a não ser que tenha sido pedido.
2. NUNCA pergunte se o cliente deseja o catálogo: apenas envie imediatamente com a ferramenta caso ele demonstre interesse.
3. Sobre a Pacific Flowers: Empresa consolidada, mais de 25 anos de experiência (papelarias, supermercados, distribuidores). Produção própria, excelente qualidade. Produtos: giz de cera, envelopes kraft, cadernos, placas, splash, cartazes, jogos.
4. CADÊNCIA E FRASES CURTAS: Você simula um WhatsApp. NUNCA envie textos longos de uma vez. Quebre suas falas em frases curtas. Para separar suas mensagens em balões diferentes, coloque a tag secreta [SEPARAR] entre elas. Exemplo de uso: "Olá! Tudo bem? [SEPARAR] Segue o seu orçamento: ... [SEPARAR] Ficou alguma dúvida?". A tag [SEPARAR] fará o envio de mensagens separadas em cadência.

MUITO IMPORTANTE - REGRAS DE SISTEMA E FERRAMENTAS:
- Para enviar o catálogo, chame OBRIGATORIAMENTE a ferramenta 'sendAttachment' com o gatilho exato: 'CATALOGO'.
- Toda vez que chamar 'sendAttachment', coloque a tag secreta [SEPARAR] no meio do seu texto no momento em que a imagem/PDF deve aparecer. O sistema apagará a tag e enviará o arquivo.
- Quando o cliente disser o nome dele, chame a função 'updateClientName'.
- Altere o status do cliente chamando 'changeClientStatus' sempre que a conversa avançar.
- MÍDIAS RECEBIDAS: Se o cliente enviar um áudio, você DEVE LER A TRANSCRIÇÃO do áudio e OBRIGATORIAMENTE RESPONDER CHAMANDO A FERRAMENTA 'sendVoiceNote'. NUNCA responda um áudio com texto!
- ATENÇÃO: Se o cliente pedir para você enviar um áudio ou responder por voz, você DEVE OBRIGATORIAMENTE usar a ferramenta 'sendVoiceNote' para gerar o áudio, e não escrever a resposta no chat. NUNCA diga "Enviando o áudio...", apenas chame a ferramenta imediatamente!
- REGRA CRÍTICA DE ÁUDIO: NUNCA, em hipótese alguma, digite a tag [ÁUDIO ENVIADO] no meio do seu texto! A única forma de enviar áudio é fazendo a chamada de função (tool call) 'sendVoiceNote'. Se você escrever "[ÁUDIO ENVIADO]" como texto, ocorrerá um erro crítico.
- ATENÇÃO: NUNCA mencione as chamadas de sistema, gatilhos, tags ou operações internas para o cliente. Comporte-se como um humano natural.`;
    prompt = DEFAULT_SYSTEM_PROMPT;
  }

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

    // Pegar a última mensagem do assistente para forçar a não repetição
    const lastAssistantMessage = messages.slice().reverse().find((m: any) => m.sender === 'attendant')?.text || '';

    // Converter para o formato da OpenAI
    let openAiMessages = [
      { role: 'system', content: getSystemPrompt(settings) }
    ];

    // 1.5. Injetar a lista de produtos ativos no contexto
    const { data: produtos, error: produtosError } = await supabase
      .from('produtos')
      .select('name, price, code, min_quantity')
      .eq('active', true);
      
    if (!produtosError && produtos && produtos.length > 0) {
      const listaProdutos = produtos.map((p: any) => 
        `- ${p.code ? `[${p.code}] ` : ''}${p.name}: R$ ${Number(p.price).toFixed(2).replace('.', ',')} (Quantidade Mínima OBRIGATÓRIA: ${p.min_quantity || 1} un)`
      ).join('\n');
      
      openAiMessages.push({
        role: 'system',
        content: `[BASE DE DADOS DE PRODUTOS E PREÇOS OBRIGATÓRIA]
Abaixo está a lista atualizada de produtos disponíveis, seus preços e suas respectivas QUANTIDADES MÍNIMAS DE COMPRA. 
VOCÊ DEVE USAR EXCLUSIVAMENTE ESTES PRODUTOS E PREÇOS ao montar orçamentos ou responder dúvidas de clientes.
Se um cliente pedir um orçamento, calcule o valor total baseando-se nos preços abaixo e na quantidade solicitada. 

REGRAS DE QUANTIDADE MÍNIMA:
Você NUNCA deve aceitar um pedido com quantidade inferior à "Quantidade Mínima OBRIGATÓRIA" informada ao lado de cada produto!
Se o cliente pedir uma quantidade menor que o mínimo, informe educadamente que o produto possui quantidade mínima e corrija a quantidade no orçamento.
Mostre os cálculos de forma clara e amigável. IMPORTANTE: Quebre o orçamento em balões separados usando [SEPARAR] para que a mensagem não fique gigante num bloco só. Exemplo: "Aqui está o orçamento! [SEPARAR] 1. VENDO: 12 un x R$ ... [SEPARAR] Total: R$ ...".

PRODUTOS DISPONÍVEIS:
${listaProdutos}
`
      });
    }

    if (contextOverride === 'REPOSICAO_25_DIAS') {
      openAiMessages.push({
        role: 'system',
        content: "Atenção: Já se passaram 25 dias desde a última compra deste cliente. Mande uma mensagem amigável, seguindo suas diretrizes de vendas e personalidade, para sugerir a reposição de estoque."
      });
    } else if (contextOverride === 'FOLLOW_UP_INATIVIDADE') {
      openAiMessages.push({
        role: 'system',
        content: "Atenção: O cliente parou de responder há alguns minutos. Mande uma mensagem de acompanhamento curta, estratégica e super amigável para retomar a conversa.\nREGRAS OBRIGATÓRIAS:\n1. LEIA O HISTÓRICO RECENTE: Analise o contexto exato de onde a conversa parou. Se você acabou de enviar a tabela, pergunte o que ele achou. Se estava tirando dúvidas, pergunte se restou alguma. Nunca mande um 'olá' genérico ignorando o contexto!\n2. NUNCA REPITA uma mensagem que você já enviou.\n3. FOCO NO FECHAMENTO: Direcione a conversa de forma inteligente para que o cliente se sinta seguro em fechar o pedido.\nSeja descontraído e aja como um humano prestativo."
      });
    } else if (contextOverride === 'INSISTENCIA_HORAS') {
      openAiMessages.push({
        role: 'system',
        content: "Atenção: Já se passaram várias horas sem resposta do cliente. Sua missão agora é retomar a conversa de forma inteligente, natural e humana.\nREGRAS OBRIGATÓRIAS:\n1. CONTEXTO É REI: Leia o que estava sendo discutido. Faça uma pergunta relacionada ao último assunto (ex: 'Conseguiu dar uma olhada na proposta?' ou 'Ficou alguma dúvida sobre os itens que te passei?').\n2. NUNCA REPITA as mesmas frases que você já usou. Seja criativo e original!\n3. GATILHO DE FECHAMENTO: Tente mostrar facilidade, ofereça ajuda para montar o pedido ideal e incentive o fechamento da venda de forma consultiva e sem parecer desesperado."
      });
    } else if (contextOverride && contextOverride.startsWith('INSISTENCIA_CUSTOM|')) {
      const customInstruction = contextOverride.split('|')[1];
      openAiMessages.push({
        role: 'system',
        content: `Atenção: O cliente está em cadência de insistência. Instrução específica para esta etapa: "${customInstruction}".\nREGRAS OBRIGATÓRIAS:\n1. INTEGRE AO CONTEXTO: Junte essa instrução com o contexto real do que estava sendo conversado antes do sumiço do cliente.\n2. NUNCA repita o que já foi dito anteriormente.\n3. OBJETIVO: Sua resposta deve ser inteligente, persuasiva e projetada exclusivamente para contornar objeções ocultas e levar o lead ao FECHAMENTO DO PEDIDO.\nComporte-se como o melhor vendedor da equipe.`
      });
    } else if (contextOverride && contextOverride.startsWith('REACTIVATION|')) {
      const days = contextOverride.split('|')[1];
      openAiMessages.push({
        role: 'system',
        content: `Atenção: Este cliente não responde há ${days} dias. Sua missão é reativá-lo.\nREGRAS OBRIGATÓRIAS:\n1. RESGATE O ASSUNTO: Analise as últimas interações. Mande uma mensagem natural e descontraída mencionando sutilmente onde pararam (ex: 'Oi! Passando só pra saber se conseguiu decidir sobre X...').\n2. NÃO SEJA AGRESSIVO: Aja como se estivesse apenas acompanhando para ver se ele precisa de algo.\n3. FOCO EM VENDER: O objetivo final é engajar para fechar negócio, ofereça facilidade para fechar o pedido hoje.\n4. NUNCA REPITA mensagens anteriores.`
      });
    }

    if (contextOverride && (contextOverride.startsWith('INSISTENCIA') || contextOverride.startsWith('REACTIVATION') || contextOverride === 'FOLLOW_UP_INATIVIDADE')) {
      if (lastAssistantMessage) {
        openAiMessages.push({
           role: 'system',
           content: `REGRA DE OURO CONTRA REPETIÇÃO: A sua última mensagem enviada foi EXATAMENTE esta:\n"${lastAssistantMessage}"\n\nVocê está ESTRITAMENTE PROIBIDO de repetir as mesmas frases, a mesma estrutura ou fazer a mesma pergunta novamente. Mude completamente a abordagem, seja criativo, ofereça uma alternativa diferente ou vá direto ao ponto para não parecer um robô repetitivo.`
        });
      }
    }

    if (clientInfo && clientInfo.status) {
      const myName = settings?.businessName || 'Atendente';
      let clientName = clientInfo.name || 'Desconhecido';
      const lowerName = clientName.toLowerCase();
      const lowerMyName = myName.toLowerCase();
      
      // Sanitização programática: se o nome tiver números, for "vendas", genérico, ou igual ao do vendedor, ocultamos da IA.
      if (
        /\\d/.test(clientName) || 
        lowerName.includes('venda') || 
        lowerName.includes('lead') || 
        lowerName.includes('atendimento') || 
        lowerName.includes('desconhecido') ||
        lowerName === lowerMyName
      ) {
        clientName = 'NOME_DESCONHECIDO';
      }

      openAiMessages.push({
        role: 'system',
        content: `[CONTEXTO INTERNO OBRIGATÓRIO]
Status atual no CRM: "${clientInfo.status}".

VOCÊ (A IA / O Vendedor) se chama: "${myName}".
${clientName === 'NOME_DESCONHECIDO' 
  ? `Você NÃO SABE o nome do cliente. Você DEVE OBRIGATORIAMENTE perguntar o nome do cliente de forma amigável na sua primeira mensagem (ex: "Como posso te chamar?").` 
  : `O CLIENTE COM QUEM VOCÊ ESTÁ FALANDO se chama: "${clientName}". Você deve chamá-lo exclusivamente por esse nome.`}

REGRA 0 - EXTREMAMENTE IMPORTANTE SOBRE NOMES: 
- NUNCA chame o cliente de "${myName}"! "${myName}" é o SEU nome. Seria absurdo você chamar a outra pessoa pelo seu próprio nome.
- Se o cliente se apresentar com um novo nome durante a conversa, passe a chamá-lo exclusivamente pelo novo nome que ele informou e NUNCA MAIS use o nome antigo.
REGRA 2 - CATÁLOGO: Se o cliente disser a palavra "catálogo", pedir o catálogo, ou confirmar que é lojista, VOCÊ DEVE OBRIGATORIAMENTE E IMEDIATAMENTE chamar a ferramenta "sendAttachment" com o parâmetro triggerName igual a "CATALOGO". É ESTRITAMENTE PROIBIDO dizer "Aqui está o catálogo" e não chamar a ferramenta. Você tem que chamar a ferramenta!
REGRA 3 - ORÇAMENTOS E QUANTIDADE (CRÍTICA): 
- Cada produto do catálogo possui uma Quantidade Mínima OBRIGATÓRIA estipulada na tabela.
- Você É ESTRITAMENTE PROIBIDO de aceitar quantidades menores que a quantidade mínima do catálogo. ATENÇÃO: Se o mínimo é 12 e o cliente pede 6, você DEVE alterar para 12.
- Se o cliente pedir uma quantidade menor que a mínima, você DEVE aumentar a quantidade para a mínima permitida do catálogo e avisá-lo de forma educada: "Como a quantidade mínima para o [Produto] é de X unidades, ajustei para você, tudo bem?"
- PRODUTOS A GRANEL/PACOTES FECHADOS: Se o catálogo tiver "A Granel" no nome, o produto é vendido por PACOTE FECHADO e a quantidade mínima dele no sistema é sempre 1. Se o cliente pedir "5", ele quer 5 pacotes. NUNCA altere a quantidade de produtos a granel. Calcule: 5 x Preço.
- PRODUTOS UNITÁRIOS COM MÍNIMO EXIGIDO (Ex: Cartaz com Solapa): Se a quantidade mínima for 12, e o cliente pedir 100, NÃO REDUZA PARA 12. O cliente quer 100 unidades individuais. Calcule 100 x Preço Unitário. Só altere a quantidade se ele pedir MENOS que o mínimo (ex: pedir 6, aí você aumenta para 12). NUNCA diga "vamos considerar 12 pacotes" se o produto é unitário.
- GERAÇÃO IMEDIATA DO ORÇAMENTO: Quando o cliente informar os produtos e as quantidades, VOCÊ DEVE OBRIGATORIAMENTE E IMEDIATAMENTE gerar e entregar o orçamento completo NA MESMA MENSAGEM. É ESTRITAMENTE PROIBIDO dizer apenas "Vou montar o orçamento", "Um momento", ou enrolar o cliente. Entregue o orçamento na hora!
QUANDO APRESENTAR O ORÇAMENTO, USE EXATAMENTE ESTE FORMATO VISUAL OBRIGATÓRIO:

*🧾 ORÇAMENTO - PACIFIC FLOWERS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*Cliente:* [Nome do Cliente]
*Data:* ${new Date().toLocaleDateString('pt-BR')}

*PRODUTOS:*
1. [NOME EXATO E COMPLETO DO PRODUTO CONFORME O CATÁLOGO. PROIBIDO RESUMIR, COPIE IGUAL À LISTA]
   [Qtd] un x R$ [Preço Unitário] = *R$ [Total do Item]*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*💰 VALOR TOTAL: R$ [Soma Total]*

AVISO CRÍTICO DE FORMATAÇÃO: 
- NUNCA, SOB NENHUMA HIPÓTESE escreva "[Data Atual]". Escreva EXATAMENTE a data numérica acima (${new Date().toLocaleDateString('pt-BR')}).
- Não copie erros de formatação de mensagens antigas do histórico. Use APENAS este formato exato.
- Você DEVE escrever o nome do produto IDÊNTICO ao que está na sua base de dados, sem omitir partes como "c/ 100 unidades" ou "Combo".

[Sua mensagem final: Pergunte obrigatoriamente qual a forma de pagamento preferida para prosseguir]

REGRA 4 - NUNCA assuma que já sabe o nome se o CRM diz que é Desconhecido. Se o cliente der um nome novo, ignore o nome registrado no sistema.

REGRA 5 - PEDIDO MÍNIMO GLOBAL (R$ 750,00): O valor total do pedido NUNCA pode ser inferior a R$ 750,00. Se a soma do orçamento ficar abaixo de R$ 750,00, você DEVE avisar o cliente educadamente que o pedido mínimo da loja é R$ 750,00 e sugerir que ele adicione mais itens para atingir o valor. 
- Se o cliente ACEITAR adicionar mais itens, ajude-o a escolher.
- Se o cliente RECUSAR adicionar mais itens ou disser que não pode chegar a esse valor, VOCÊ DEVE DIZER EXATAMENTE: "Entendo perfeitamente! Como o valor ficou abaixo do nosso pedido mínimo, vou passar o seu atendimento para um de nossos especialistas analisar o seu caso com carinho, ok? Um momento, por favor." (E encerre o assunto, aguardando intervenção humana).

REGRA 6 - FECHAMENTO DE PEDIDO: Siga EXATAMENTE esta ordem passo a passo após enviar o orçamento aprovado (acima de R$ 750,00):
PASSO 1: Ao enviar o orçamento, pergunte qual a forma de pagamento o cliente prefere.
PASSO 2: Após o cliente responder a forma de pagamento, solicite o CNPJ e o Endereço da loja para a entrega do pedido.
PASSO 3: Após o cliente enviar o CNPJ e o endereço, você deve encaminhar para aprovação dizendo EXATAMENTE: "Perfeito! Tudo anotado. Estou enviando o seu pedido para aprovação e um de nossos especialistas vai assumir o atendimento para finalizar a sua compra. Muito obrigado!" (E encerre o assunto, aguardando intervenção humana).`
      });
    }

    openAiMessages = openAiMessages.concat(
      messages.map((msg: any) => ({
        role: msg.sender === 'client' ? 'user' : 'assistant',
        content: (msg.text || '').replace(/\[ÁUDIO ENVIADO\]/g, '[Voice Note Enviada pela Ferramenta]'),
      }))
    );

    const tools: any[] = [
      {
        type: 'function',
        function: {
          name: 'sendAttachment',
          description: 'ENVIA O CATÁLOGO OU ANEXO. Você DEVE e TEM A OBRIGAÇÃO de chamar esta função IMEDIATAMENTE sempre que o cliente pedir o catálogo, usar a palavra "catálogo" ou confirmar que é lojista.',
          parameters: {
            type: 'object',
            properties: {
              triggerName: {
                type: 'string',
                description: 'O nome exato do gatilho configurado pelo vendedor. Ex: "CATALOGO", "KIT_350"'
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
          description: 'Encerra o atendimento da IA e transfere o lead para um vendedor humano. Chamada quando o cliente for qualificado, enviar pedido ou pedir sugestão.',
          parameters: {
            type: 'object',
            properties: {
              summary: {
                type: 'string',
                description: 'Um resumo breve do atendimento: perfil do cliente (lojista, pessoal), produtos interessados, e motivo da transferÃªncia.'
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
    ];

    if (settings?.audio_replies_enabled !== false && settings?.audioRepliesEnabled !== false) {
      tools.push({
        type: 'function',
        function: {
          name: 'sendVoiceNote',
          description: 'Gera e envia um áudio (Voice Note) para o cliente. Use esta função apenas quando quiser enviar uma mensagem de voz em vez de texto (por exemplo, quando o cliente mandar um áudio ou pedir uma mensagem de voz). O conteúdo do áudio deve ser humanizado.',
          parameters: {
            type: 'object',
            properties: {
              textToSpeak: {
                type: 'string',
                description: 'O texto exato e humanizado que será falado no áudio. Não inclua emojis.'
              }
            },
            required: ['textToSpeak']
          }
        }
      });
    }

    // 2. Chamar a OpenAI com suporte a chamadas de função
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openAiMessages as any,
      temperature: 0.2,
      tools: tools,
      tool_choice: 'auto'
    });

    let responseMessage = response.choices[0].message;
    let finalContent = '';
    let audioTranscript = '';
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
                toolResult = 'Erro: Credenciais da Evolution API ausentes.';
              }
            } else {
              toolResult = 'Erro: Faltam informações do cliente (phone/attendant_id).';
            }
          } else {
            console.log(`[AI TOOL] Gatilho '${args.triggerName}' não encontrado nas configurações do vendedor.`);
            toolResult = `O gatilho '${args.triggerName}' não está configurado. Diga ao cliente que houve um erro ao buscar o arquivo.`;
          }
        } else if (toolCall.function.name === 'sendVoiceNote') {
          console.log(`[AI TOOL] Solicitado envio de Voice Note: ${args.textToSpeak}`);
          
          if (clientInfo && clientInfo.phone && clientInfo.attendant_id) {
            const apiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL || '';
            const apiKey = process.env.EVOLUTION_API_KEY || process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || '';
            const instanceName = `user_${clientInfo.attendant_id}`;
            const phone = clientInfo.phone;
            
            if (apiUrl && apiKey && instanceName) {
              try {
                // 1. Gera o áudio TTS
                const base64Audio = await generateAudio(args.textToSpeak);
                if (base64Audio) {
                  // 2. Prepara o payload do áudio PTT
                  const sendUrl = `${apiUrl}/message/sendWhatsAppAudio/${instanceName}`;
                  const evoPayload = {
                    number: phone,
                    audio: `data:audio/ogg;base64,${base64Audio}`,
                    delay: 1200,
                    encoding: true
                  };
                  
                  // Executa a requisição assincronamente
                  fetch(sendUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                    body: JSON.stringify(evoPayload)
                  }).catch(e => console.error('[AI TOOL] Erro no envio de Voice Note via fetch:', e));
                  
                  toolResult = `Áudio gerado e enviado com sucesso com o texto: "${args.textToSpeak}"`;
                  audioTranscript = `\n[ÁUDIO ENVIADO] ${args.textToSpeak}`;
                } else {
                  toolResult = `Erro ao gerar o áudio TTS.`;
                }
              } catch (err) {
                console.error('[AI TOOL] Erro ao enviar Voice Note:', err);
                toolResult = `Erro interno ao enviar Voice Note.`;
              }
            } else {
              toolResult = 'Erro: Credenciais da Evolution API ausentes para Voice Note.';
            }
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

          // O resumo da IA é adicionado nas notas do cliente e enviado para o WhatsApp do vendedor.
          // Foi removida a inserção dessa mensagem no histórico do chat (mensagens) para não sujar o visual.

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
                const alertMessage = `âš ï¸� *Lead Qualificado!*\nO lead *${clientData.name || 'Sem Nome'}* (${clientData.phone}) foi qualificado pela IA e estÃ¡ pronto para receber o catálogo e atendimento humano.\n\n*Resumo da IA:* ${args.summary}`;

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

    // Se a IA enviou áudio, suprimimos qualquer texto gerado para evitar envio duplo no WhatsApp
    if (audioTranscript) {
       responseMessage.content = '';
       finalContent = '';
    }

    // Retorna o texto gerado pela IA (pode ser a despedida ou uma resposta normal)
    if (responseMessage.content || finalContent || audioTranscript) {
      if (catalogSentThisTurn) {
        // Avançar o lead para Qualificação quando receber o catálogo, conforme solicitado pelo cliente (Tarefa 9)
        await supabase.from('clientes').update({ status: 'Em Qualificação' }).eq('id', clientId);
        await supabase.from('history_events').insert({
          client_id: clientId,
          type: 'status_change',
          description: 'A IA Clara enviou o catálogo e avançou o status para Em Qualificação.',
        });
      }
      return { text: (responseMessage.content || '') + finalContent, mediaToSend, audioTranscript };
    }

  } catch (error: any) {
    console.error('Erro na IA:', error);
    return { text: null, mediaToSend: [], audioTranscript: null };
  }
}

/**
 * AnÃ¡lise Silenciosa:
 * LÃª o histórico recente da conversa (focado nas falas do atendente humano e do cliente)
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

    // Etapas que a IA auto-reply atua (se estiver aqui, a auto-reply cuida, entÃ£o não mexemos)
    const initialStages = ['Novo', 'Contato Feito', 'Em Qualificação'];
    // Etapas finais
    const finalStages = ['Finalizado', 'Perdido', 'Reposição'];

    if (initialStages.includes(clientData.status) || finalStages.includes(clientData.status)) {
      return; // Não analisa silenciosamente nestes estados
    }

    // 2. Buscar Ãºltimas 15 mensagens para contexto
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
      const cleanText = (m.text || '').replace(/\[ÁUDIO ENVIADO\]/g, '[Voice Note Enviada pela Ferramenta]');
      return `${isSeller ? 'VENDEDOR' : 'CLIENTE'}: ${cleanText}`;
    }).join('\n');

    const SILENT_SYSTEM_PROMPT = `Você Ã© um supervisor silencioso de um funil de vendas.
Sua Ãºnica funÃ§Ã£o Ã© ler o histórico recente da conversa e determinar se o lead avanÃ§ou ou retrocedeu de etapa.
Status atual do lead: "${clientData.status}"
Nome do lead: "${clientData.name || 'Desconhecido'}"

Etapas permitidas para você mover:
- "Proposta Enviada": O vendedor enviou um orÃ§amento, preÃ§o ou proposta clara.
- "Finalizado": O cliente comprou, pagou ou o negÃ³cio foi fechado com sucesso.
- "Reposição": O cliente precisa voltar a comprar no futuro (recorrente) ou pediu para avisar depois.
- "Perdido": O cliente disse não, achou caro, não tem interesse ou parou de responder definitivamente.

Regras:
1. SÃ“ chame a ferramenta \`updateStatus\` se você tiver absoluta certeza de que a conversa avanÃ§ou para um novo status DIFERENTE do atual.
2. Se a conversa ainda estÃ¡ no status atual, NÃƒO FAÃ‡A NADA. Apenas não chame a ferramenta.
3. Não retorne nenhum texto de resposta para o cliente.`;

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
                  enum: ['Proposta Enviada', 'Finalizado', 'Perdido', 'Reposição'],
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
