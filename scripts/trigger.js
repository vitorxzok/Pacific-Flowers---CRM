const http = require('http');

async function trigger() {
  try {
    console.log('[' + new Date().toISOString() + '] Triggering local cron...');
    const res = await fetch('http://localhost:3000/api/cron/automations');
    const data = await res.json().catch(() => null);
    console.log('[' + new Date().toISOString() + '] Status:', res.status, 'Body:', data);
  } catch (err) {
    console.error('[' + new Date().toISOString() + '] Error:', err.message);
  }
}

setInterval(trigger, 60000); // 1 minute
trigger();
