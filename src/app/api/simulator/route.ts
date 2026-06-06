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
    let attachment = null;

    if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
      for (const toolCall of aiMessage.tool_calls as any[]) {
        if (toolCall.function.name === 'sendAttachment') {
          const args = JSON.parse(toolCall.function.arguments);
          attachmentTrigger = args.triggerName; // O parâmetro correto definido na tool é triggerName
          
          if (settings && settings.attachments && attachmentTrigger) {
            const matchedAttachment = settings.attachments.find(
              (a: any) => a.trigger?.toUpperCase() === attachmentTrigger?.toUpperCase()
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
    } else if (!finalContent && attachmentTrigger && attachment) {
      // Deixa vazio para só renderizar o anexo visualmente, ou põe um aviso de sistema se quiser
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
