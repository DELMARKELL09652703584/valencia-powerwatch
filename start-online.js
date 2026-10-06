const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const RENDER_BASE_URL = 'https://valencia-powerwatch.onrender.com';
const LOCAL_BASE_URL = 'http://localhost:4000';

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
      const installUrl = `${publicUrl}/install`;
      const communityUrl = `${publicUrl}/community`;
      const adminUrl = `${publicUrl}/admin`;
      const officialInstallUrl = `${RENDER_BASE_URL}/install`;

      fs.writeFileSync(path.join(__dirname, 'public-url.txt'), installUrl);

      console.log('');
      console.log('========================================================================');
      console.log('   VALENCIA POWERWATCH PORTAL LINKS                                     ');
      console.log('   Render is the official, stable online site.                          ');
      console.log('========================================================================');
      console.log('');
      console.log('  ADMIN PORTAL (Desktop / Web):');
      console.log(`     Online (Internet): ${RENDER_BASE_URL}/admin`);
      console.log(`     Local:              ${LOCAL_BASE_URL}/admin`);
      console.log('');
      console.log('  USER / COMMUNITY PORTAL (Mobile / PWA):');
      console.log(`     Online (Internet): ${RENDER_BASE_URL}/community`);
      console.log(`     Local:              ${LOCAL_BASE_URL}/community`);
      console.log('');
      console.log('  INSTALL / QR CODE PAGE:');
      console.log(`     Online (Internet): ${officialInstallUrl}`);
      console.log('');
      console.log('  Temporary Cloudflare Tunnel (changes when this process restarts):');
      console.log(`     Admin:     ${adminUrl}`);
      console.log(`     Community: ${communityUrl}`);
      console.log(`     Install:   ${installUrl}`);
      console.log('========================================================================');
      console.log('  The official Render install page will open and be copied to the clipboard.');
      console.log('');
      console.log('  Keep this window open only if you need the temporary Cloudflare Tunnel.');
      console.log('========================================================================');

      exec(`start "" "${officialInstallUrl}"`);

      exec(`powershell -command "Set-Clipboard -Value '${officialInstallUrl}'"`);
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
