const fs = require('fs');
let code = fs.readFileSync('src/app/api/cron/automations/route.ts', 'utf8');

const newMapLogic = `    // Mapa de instâncias abertas na Evolution API
    let openInstancesMap: Record<string, string> = {};
    const allowedPhones = ['554792917061', '554796712581', '554792898076', '554797324781', '554797446984', '554797858049', '5547997858049'];
    try {
      const evoApiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL;
      const evoApiKey = process.env.NEXT_PUBLIC_EVOLUTION_GLOBAL_API_KEY || process.env.EVOLUTION_API_KEY;
      if (evoApiUrl && evoApiKey) {
        const res = await fetch(\`\${evoApiUrl}/instance/fetchInstances\`, { headers: { 'apikey': evoApiKey } });
        if (res.ok) {
          const instances = await res.json();
          instances.forEach((inst: any) => {
            if (inst.connectionStatus === 'open' && inst.name && inst.ownerJid) {
              const phone = inst.ownerJid.split('@')[0];
              if (allowedPhones.includes(phone) || allowedPhones.some(p => phone.includes(p.substring(2)))) {
                const baseName = inst.name.split('_').slice(0, 2).join('_'); // Extrai 'user_xxxx' de 'user_xxxx_1'
                openInstancesMap[baseName] = inst.name;
              }
            }
          });
        }
      }
    } catch (e) {
      console.error('Erro ao buscar instancias:', e);
    }`;

// Replace the map building logic
code = code.replace(
  /\/\/ Mapa de instâncias abertas na Evolution API[\s\S]*?console\.error\('Erro ao buscar instancias:', e\);\n    \}/,
  newMapLogic
);

// Add safety checks in both loops
// Lógica 1 (Reposição)
code = code.replace(
  /const baseInstance = client\.attendant_id \? `user_\$\{client\.attendant_id\}` : 'user_default';\s+const instanceName = openInstancesMap\[baseInstance\] \|\| baseInstance;/,
  `const baseInstance = client.attendant_id ? \`user_\${client.attendant_id}\` : 'user_default';
              const instanceName = openInstancesMap[baseInstance];
              if (!instanceName) continue;`
);

// Lógica 2 (Follow-up)
// There might be multiple occurrences of Lógica 2 (for 0 mins, and wait what? Oh, Lógica 2 has multiple nested checks, but it loops over `clientesInativos`.)
// Actually we replaced ALL occurrences globally using the patch script earlier.
// So let's replace all of them globally again.
code = code.replace(
  /const baseInstance = client\.attendant_id \? `user_\$\{client\.attendant_id\}` : 'user_default';\s+const instanceName = openInstancesMap\[baseInstance\] \|\| baseInstance;/g,
  `const baseInstance = client.attendant_id ? \`user_\${client.attendant_id}\` : 'user_default';
              const instanceName = openInstancesMap[baseInstance];
              if (!instanceName) continue;`
);

fs.writeFileSync('src/app/api/cron/automations/route.ts', code);
console.log('Fixed allowed phones and skipped unmapped instances');
