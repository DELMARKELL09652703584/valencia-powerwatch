const https = require('https');

const BASE_URL = 'https://valencia-powerwatch-1.onrender.com';

function fetchUrl(path) {
  return new Promise((resolve) => {
    const url = `${BASE_URL}${path}`;
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          path,
          statusCode: res.statusCode,
          contentType: res.headers['content-type'],
          bodyLength: data.length,
          preview: data.slice(0, 200).replace(/\s+/g, ' ')
        });
      });
    });
    req.on('error', (err) => {
      resolve({ path, error: err.message });
    });
    req.setTimeout(15000, () => {
      req.destroy();
      resolve({ path, error: 'TIMEOUT' });
    });
  });
}

async function testLiveDeployment() {
  console.log(`\n=================== TESTING LIVE RENDER DEPLOYMENT (${BASE_URL}) ===================\n`);

  const endpoints = [
    '/api/health',
    '/',
    '/community',
    '/staff',
    '/admin',
    '/install',
    '/manifest.json',
    '/staff-manifest.json',
    '/sw.js',
    '/staff-sw.js',
    '/api/announcements',
    '/api/scheduled'
  ];

  for (const ep of endpoints) {
    const res = await fetchUrl(ep);
    if (res.error) {
      console.log(`❌ [${res.statusCode || 'ERR'}] ${ep} -> ERROR: ${res.error}`);
    } else {
      const ok = res.statusCode >= 200 && res.statusCode < 400;
      console.log(`${ok ? '✅' : '⚠️'} [${res.statusCode}] ${ep} (${res.bodyLength} bytes, ${res.contentType})`);
      if (ep === '/api/health') {
        console.log(`   Health Payload: ${res.preview}`);
      }
    }
  }
}

testLiveDeployment();
