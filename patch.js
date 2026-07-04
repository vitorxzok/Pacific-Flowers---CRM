const fs = require('fs');
let code = fs.readFileSync('src/app/api/webhook/whatsapp/route.ts', 'utf8');

const target1 = 'console.log(`[Webhook] Humano usou código secreto "..". IA REATIVADA para o cliente ${clientId}.`);';
const insert1 = '            (request as any).aiReactivated = true;';

code = code.replace(target1, target1 + '\n' + insert1);

const target2 = '      if (isFromMe) {\n        // Se a mensagem for do atendente, apenas fazemos análise de sentimento no background';
const insert2 = `      if (isFromMe) {
        if ((request as any).aiReactivated && autoReplyEnabled) {
          console.log('[Webhook] IA foi reativada pelo humano. Forçando geração de resposta imediata...');
          generateAIResponse(clientId, supabase, undefined, crmSettings).then(async (result) => {
            if (result && (result.text || result.content)) {
              await sendAIMessage(clientId, result, instanceName, phone, sellerId, supabase);
            }
          }).catch(err => console.error('[Webhook] Erro ao forçar IA após reativação:', err));
        }

        // Se a mensagem for do atendente, apenas fazemos análise de sentimento no background`;

code = code.replace(target2, insert2);

fs.writeFileSync('src/app/api/webhook/whatsapp/route.ts', code);
console.log('Modified successfully.');
