import re

with open('src/lib/openai.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add sendAttachment tool
tools_insert_point = "          type: 'function',\n          function: {\n            name: 'updateClientName',"
tool_to_add = """          type: 'function',
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
"""
content = content.replace(tools_insert_point, tool_to_add + tools_insert_point)

# 2. Add handler logic for sendAttachment
handler_insert_point = "if (toolCall.function.name === 'updateClientName') {"
handler_to_add = """if (toolCall.function.name === 'sendAttachment') {
          console.log(`[AI TOOL] Solicitado envio do anexo com gatilho: ${args.triggerName}`);
          
          const attachments = settings?.attachments || [];
          const attachment = attachments.find((a: any) => a.trigger === args.triggerName);
          
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
                    mimetype: attachment.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
                    caption: `Aqui está o que você pediu! (${args.triggerName})`,
                    media: attachment.url,
                    fileName: attachment.name || 'arquivo.pdf'
                  };
                  
                  await fetch(`${apiUrl}/message/sendMedia/${instanceName}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                    body: JSON.stringify(mediaPayload)
                  });
                  toolResult = `Anexo '${args.triggerName}' enviado com sucesso para o cliente.`;
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
        } else """

content = content.replace(handler_insert_point, handler_to_add + handler_insert_point)

# 3. Add explicit instruction to use sendAttachment in prompt
prompt_insert_point = "MUITO IMPORTANTE - CHAMADAS DE FUNÇÃO:"
prompt_to_add = """MUITO IMPORTANTE - CHAMADAS DE FUNÇÃO:
- Quando você precisar enviar o catálogo ou o link para o cliente lojista, chame a função 'sendAttachment' com o gatilho 'CATALOGO' e não escreva o link no texto, diga apenas que enviou o catálogo.
- Quando sugerir um kit, chame a função 'sendAttachment' com o gatilho exato (ex: 'KIT_350', 'KIT_850').
"""

content = content.replace(prompt_insert_point, prompt_to_add + prompt_insert_point)

with open('src/lib/openai.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated openai.ts successfully")
