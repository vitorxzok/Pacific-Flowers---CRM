const fs = require('fs');
const file = 'src/app/api/webhook/whatsapp/route.ts';
let code = fs.readFileSync(file, 'utf8');

// Declare aiReactivated
code = code.replace(
  "export async function POST(request: Request) {\r\n  try {\r\n    const body = await request.json();",
  "export async function POST(request: Request) {\r\n  try {\r\n    let aiReactivated = false;\r\n    const body = await request.json();"
);
code = code.replace(
  "export async function POST(request: Request) {\n  try {\n    const body = await request.json();",
  "export async function POST(request: Request) {\n  try {\n    let aiReactivated = false;\n    const body = await request.json();"
);

// Mutate local instead of request
code = code.replace(
  "            console.log(`[Webhook] Humano usou código secreto \"..\". IA REATIVADA para o cliente ${clientId}.`);\r\n            (request as any).aiReactivated = true;",
  "            console.log(`[Webhook] Humano usou código secreto \"..\". IA REATIVADA para o cliente ${clientId}.`);\r\n            aiReactivated = true;"
);
code = code.replace(
  "            console.log(`[Webhook] Humano usou código secreto \"..\". IA REATIVADA para o cliente ${clientId}.`);\n            (request as any).aiReactivated = true;",
  "            console.log(`[Webhook] Humano usou código secreto \"..\". IA REATIVADA para o cliente ${clientId}.`);\n            aiReactivated = true;"
);

// Use local
code = code.replace(
  "      } else if (isFromMe) {\r\n        if ((request as any).aiReactivated && autoReplyEnabled) {",
  "      } else if (isFromMe) {\r\n        if (aiReactivated && autoReplyEnabled) {"
);
code = code.replace(
  "      } else if (isFromMe) {\n        if ((request as any).aiReactivated && autoReplyEnabled) {",
  "      } else if (isFromMe) {\n        if (aiReactivated && autoReplyEnabled) {"
);

fs.writeFileSync(file, code, 'utf8');
console.log('Patched');
