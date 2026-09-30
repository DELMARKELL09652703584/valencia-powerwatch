const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'tunnel.log');
try { fs.unlinkSync(logFile); } catch {}
const out = fs.openSync(logFile, 'a');

const child = spawn(path.join(__dirname, 'cloudflared.exe'), ['tunnel', '--url', 'http://127.0.0.1:4000'], {
  detached: true,
  stdio: ['ignore', out, out],
  windowsHide: true,
});

child.unref();
console.log('CLOUDFLARE_PID:', child.pid);

let checkCount = 0;
const interval = setInterval(() => {
  checkCount++;
  try {
    const text = fs.readFileSync(logFile, 'utf8');
    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match) {
      clearInterval(interval);
      fs.writeFileSync(path.join(__dirname, 'public-url.txt'), match[0]);
      console.log('TUNNEL_LIVE_URL:', match[0]);
      process.exit(0);
    }
  } catch {}
  if (checkCount > 15) {
    clearInterval(interval);
    console.log('Check tunnel.log manually');
    process.exit(0);
  }
}, 1000);
