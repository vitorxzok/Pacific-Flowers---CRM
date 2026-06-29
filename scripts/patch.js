const fs = require('fs');
let code = fs.readFileSync('src/app/api/cron/automations/route.ts', 'utf8');

code = code.replace(
  /const instanceName = client\.attendant_id \? `user_\$\{client\.attendant_id\}` : 'user_default';/g,
  `const baseInstance = client.attendant_id ? \`user_\${client.attendant_id}\` : 'user_default';
              const instanceName = openInstancesMap[baseInstance] || baseInstance;`
);

fs.writeFileSync('src/app/api/cron/automations/route.ts', code);
console.log('Fixed all instances');
