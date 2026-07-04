const fs = require('fs');
let code = fs.readFileSync('src/app/api/webhook/whatsapp/route.ts', 'utf8');

const target2 = `      } else if (!isAIEnabled) {
        // --- FLUXO 2: ANÁLISE SILENCIOSA DO FUNIL (QUANDO HUMANO ASSUMIU OU IA DESATIVADA) ---
        // A IA apenas lerá o contexto para ver se avança o Kanban (Apresentação, Negociação, etc.)
        // Executamos de forma assíncrona para não travar o webhook
        analyzeConversationAndMoveStatus(clientId, supabase).catch(err => {
          console.error('[AI Silent] Erro na análise silenciosa:', err);
        });
      }`;

const insert2 = `      } else if (!isAIEnabled) {
        // --- FLUXO 2: ANÁLISE SILENCIOSA DO FUNIL (QUANDO HUMANO ASSUMIU OU IA DESATIVADA) ---
        // A IA apenas lerá o contexto para ver se avança o Kanban (Apresentação, Negociação, etc.)
        // Executamos de forma assíncrona para não travar o webhook
        analyzeConversationAndMoveStatus(clientId, supabase).catch(err => {
          console.error('[AI Silent] Erro na análise silenciosa:', err);
        });
      } else if (isFromMe) {
        if ((request as any).aiReactivated && autoReplyEnabled) {
          console.log('[Webhook] IA foi reativada pelo humano. Forçando geração de resposta imediata...');
          generateAIResponse(clientId, supabase, undefined, crmSettings).then(async (result) => {
            if (result && (result.text || result.content)) {
              const { sendAIMessage } = await import('@/lib/openai');
              await sendAIMessage(clientId, result, instanceName, phone, sellerId, supabase);
            }
          }).catch(err => console.error('[Webhook] Erro ao forçar IA após reativação:', err));
        }
      }`;

code = code.replace(target2, insert2);

fs.writeFileSync('src/app/api/webhook/whatsapp/route.ts', code);
console.log('Modified target2 successfully.');
