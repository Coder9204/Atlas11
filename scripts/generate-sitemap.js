import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const componentsDir = path.join(__dirname, '../components');
const publicDir = path.join(__dirname, '../public');

// Get all renderer files
const renderers = fs.readdirSync(componentsDir)
  .filter(f => f.endsWith('Renderer.tsx') && !f.includes('Remote') && !f.includes('Overlay') && !f.includes('AskFor') && !f.includes('Model') && !f.includes('Patch') && !f.includes('Prompt') && !f.includes('Spec') && !f.includes('Test') && !f.includes('Tool') && !f.includes('Verification'))
  .map(f => f.replace('Renderer.tsx', ''));

// Convert to URL slugs
const toSlug = (name) => name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');

const baseUrl = 'https://atlascoach-5e3af.web.app';
const today = new Date().toISOString().split('T')[0];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/games</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
${renderers.map(name => `  <url>
    <loc>${baseUrl}/games/${toSlug(name)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
</urlset>`;

fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
console.log(`Generated sitemap.xml with ${renderers.length + 2} URLs`);
