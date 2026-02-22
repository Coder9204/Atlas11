/**
 * Submit all sitemap URLs to IndexNow (Bing, Yandex, Seznam, Naver)
 *
 * IndexNow allows instant URL submission — Bing indexes within hours.
 * Run: node scripts/submit-indexnow.cjs
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const HOST = 'coachatlas.ai';
const KEY = '4796e4a81ff69ab6e24e503ba9bde2bd';
const INDEXNOW_ENDPOINT = 'api.indexnow.org';

// Extract all URLs from sitemap
const sitemap = fs.readFileSync(path.join(__dirname, '..', 'public', 'sitemap.xml'), 'utf8');
const locRegex = /<loc>(.*?)<\/loc>/g;
const urls = [];
let match;
while ((match = locRegex.exec(sitemap)) !== null) {
  urls.push(match[1]);
}

console.log(`Found ${urls.length} URLs in sitemap.xml`);

// IndexNow allows batch submission of up to 10,000 URLs per request
const payload = JSON.stringify({
  host: HOST,
  key: KEY,
  keyLocation: `https://${HOST}/${KEY}.txt`,
  urlList: urls,
});

const options = {
  hostname: INDEXNOW_ENDPOINT,
  port: 443,
  path: '/IndexNow',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  },
};

console.log(`Submitting ${urls.length} URLs to IndexNow (${INDEXNOW_ENDPOINT})...`);

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log(`Response status: ${res.statusCode}`);
    if (res.statusCode === 200) {
      console.log('SUCCESS: All URLs submitted to IndexNow.');
      console.log('Bing, Yandex, Seznam, and Naver will process these URLs.');
    } else if (res.statusCode === 202) {
      console.log('ACCEPTED: URLs accepted for processing.');
    } else if (res.statusCode === 422) {
      console.log('WARNING: URLs not valid or key file not accessible at the expected location.');
      console.log('Make sure the site is deployed and https://coachatlas.ai/' + KEY + '.txt is accessible.');
      console.log('Response:', body);
    } else {
      console.log('Response body:', body);
    }
  });
});

req.on('error', (e) => {
  console.error('Error submitting to IndexNow:', e.message);
  console.log('\nThis is expected if coachatlas.ai is not yet resolving.');
  console.log('Deploy to Firebase with custom domain first, then re-run this script.');
});

req.write(payload);
req.end();
