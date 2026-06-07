const fs = require('fs');
let content = fs.readFileSync('src/app/settings/page.tsx', 'utf8');
content = content.replace(/\\\${/g, '${');
fs.writeFileSync('src/app/settings/page.tsx', content);
console.log('Fixed settings/page.tsx literals');
