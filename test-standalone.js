
const http = require('http');
const { spawn } = require('child_process');

const env = { ...process.env, PORT: '3005', NODE_ENV: 'production', DATABASE_URL: 'mysql://root:bismillah123@localhost:3306/alba_finance_v3' };
const serverProcess = spawn('node', ['server.js'], { cwd: './deploy-package', env });

serverProcess.stdout.on('data', (data) => {
  console.log('SERVER OUT:', data.toString());
  if (data.toString().includes('Ready on')) {
    http.get('http://localhost:3005/health', (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('HEALTH CHECK RESPONSE:', body);
        serverProcess.kill();
        process.exit(0);
      });
    }).on('error', err => {
      console.error('HEALTH CHECK ERROR:', err.message);
      serverProcess.kill();
      process.exit(1);
    });
  }
});

serverProcess.stderr.on('data', (data) => {
  console.error('SERVER ERR:', data.toString());
});

setTimeout(() => {
  console.error('TIMEOUT WAITING FOR SERVER');
  serverProcess.kill();
  process.exit(1);
}, 10000);
  