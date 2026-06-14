import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSystemPrompt } from '@/lib/openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { messages, settings } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Mensagens inválidas' }, { status: 400 });
    }

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
      tool_choice: 'auto',
    });

    const aiMessage = response.choices[0].message;
    let finalContent = aiMessage.content;
    let attachmentTrigger = null;
    let attachment = null;

    if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
      for (const toolCall of aiMessage.tool_calls as any[]) {
        if (toolCall.function.name === 'sendAttachment') {
          const args = JSON.parse(toolCall.function.arguments);
          attachmentTrigger = args.triggerName;
          
          if (settings && settings.attachments && attachmentTrigger) {
            const normalizeStr = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() : "";
            const targetTrigger = normalizeStr(attachmentTrigger);
            
            const matchedAttachment = settings.attachments.find(
              (a: any) => normalizeStr(a.trigger) === targetTrigger
            );
            if (matchedAttachment) {
              attachment = matchedAttachment;
            }
          }
        } 
      }
    }

    if (!finalContent && attachmentTrigger && !attachment) {
      finalContent = `[A IA tentou enviar um anexo com o gatilho "${attachmentTrigger}", mas nenhum arquivo com esse gatilho exato foi encontrado nas Configurações]`;
    } else if (attachmentTrigger && attachment) {
      finalContent = (finalContent || '') + `\n\n[Sistema: O anexo do gatilho "${attachmentTrigger}" foi enviado ao cliente com sucesso.]`;
    } else if (!finalContent && !attachmentTrigger) {
      finalContent = '[A IA não gerou nenhuma resposta ou anexo. Isso pode ocorrer se ela já tiver encerrado o fluxo.]';
    }

    return NextResponse.json({ 
      success: true, 
      text: finalContent || '',
      attachmentTrigger,
      attachment
    });

  } catch (err: any) {
    console.error('Simulator error:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
