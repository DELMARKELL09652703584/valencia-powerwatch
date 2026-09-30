const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

console.log('========================================================================');
console.log('   VALENCIA POWERWATCH - STARTING PUBLIC ONLINE DEPLOYMENT...           ');
console.log('========================================================================');

function checkServer() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:4000/api/health', (res) => resolve(res.statusCode === 200));
    req.on('error', () => resolve(false));
  });
}

async function main() {
  const isUp = await checkServer();
  if (!isUp) {
    console.log('  -> Starting local server (port 4000)...');
    const serverProcess = spawn('node', [path.join(__dirname, 'server', 'index.js')], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    serverProcess.unref();
    await new Promise((r) => setTimeout(r, 2000));
  } else {
    console.log('  -> Local server is active on port 4000.');
  }

  startTunnel();
}

function startTunnel() {
  console.log('  -> Connecting to Cloudflare global network for public HTTPS link...');

  const tunnel = spawn('.\\cloudflared.exe', ['tunnel', '--url', 'http://127.0.0.1:4000'], {
    cwd: __dirname,
    shell: true,
  });

  let opened = false;

  const onData = (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/([a-z0-9]+(?:-[a-z0-9]+)+\.trycloudflare\.com)/i);
    if (match && !opened && !match[1].startsWith('api.')) {
      opened = true;
      const publicUrl = `https://${match[1]}`;
      const communityUrl = `${publicUrl}/community`;
      const adminUrl = `${publicUrl}/admin`;

      fs.writeFileSync(path.join(__dirname, 'public-url.txt'), communityUrl);

      console.log('');
      console.log('========================================================================');
      console.log('   🎉 VALENCIA POWERWATCH IS NOW PUBLICLY LIVE ON THE INTERNET!         ');
      console.log('========================================================================');
      console.log('');
      console.log('  📱 USER / COMMUNITY PORTAL (Para sa Cellphone / Residente):');
      console.log(`     👉 ${communityUrl}`);
      console.log('');
      console.log('  🛡️  ADMIN PORTAL (Para sa Administrator):');
      console.log(`     👉 ${adminUrl}`);
      console.log('');
      console.log('========================================================================');
      console.log('  ✓ Gikopya na sa imong Clipboard ang link (Pwede na nimo i-Ctrl+V)!');
      console.log('  ✓ Gi-ablihan na pod nako diretso sa imong Chrome ang tinuod nga link!');
      console.log('');
      console.log('  ⚠️  AYAW I-CLOSE kining itom nga window samtang nag-test o nag-demo ka!');
      console.log('========================================================================');

      // Auto-open in Chrome
      exec(`start "" "${communityUrl}"`);

      // Copy to clipboard
      exec(`powershell -command "Set-Clipboard -Value '${communityUrl}'"`);
    }
  };

  tunnel.stdout.on('data', onData);
  tunnel.stderr.on('data', onData);

  tunnel.on('close', (code) => {
    if (!opened) {
      console.log('  -> Connection blip encountered, retrying in 3 seconds...');
      setTimeout(startTunnel, 3000);
    } else {
      console.log('  -> Tunnel disconnected. Reconnecting in 3 seconds...');
      opened = false;
      setTimeout(startTunnel, 3000);
    }
  });
}

main();
