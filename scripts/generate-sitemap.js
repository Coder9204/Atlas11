#!/usr/bin/env node

/**
 * Sitemap Generator for Coach Atlas
 *
 * Generates a comprehensive sitemap.xml including all page types.
 * Uses sitemap index format when >1000 URLs.
 *
 * Usage: node scripts/generate-sitemap.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_URL = 'https://atlascoach-5e3af.web.app';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'public');
const TODAY = new Date().toISOString().split('T')[0];

// Convert PascalCase to kebab-case
function toSlug(name) {
  return name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}

function subCatSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ============================================================
// Load game data by parsing gameCategories.ts
// ============================================================

const categoriesFile = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'data', 'gameCategories.ts'),
  'utf-8'
);

// Extract category IDs
const categories = [];
const catRegex = /id:\s*'([^']+)',\s*\n\s*name:\s*'([^']+)'/g;
let match;
while ((match = catRegex.exec(categoriesFile)) !== null) {
  categories.push({ id: match[1], name: match[2] });
}

// Extract subcategories with their games
const subCategories = [];
const catIdPositions = [];
const catIdRegex = /id:\s*'([^']+)'/g;
let m;
while ((m = catIdRegex.exec(categoriesFile)) !== null) {
  catIdPositions.push({ id: m[1], pos: m.index });
}

const subRegex = /name:\s*'([^']+)',\s*\n\s*games:\s*\[([^\]]+)\]/g;
while ((match = subRegex.exec(categoriesFile)) !== null) {
  let catId = 'unknown';
  for (let i = catIdPositions.length - 1; i >= 0; i--) {
    if (catIdPositions[i].pos < match.index) {
      catId = catIdPositions[i].id;
      break;
    }
  }
  const games = match[2].match(/'([^']+)'/g)?.map(g => g.replace(/'/g, '')) || [];
  subCategories.push({ catId, name: match[1], games });
}

// ============================================================
// Collect all URLs
// ============================================================

const urls = [];

// Static pages
urls.push({ loc: '/', priority: '1.0', changefreq: 'weekly' });
urls.push({ loc: '/games', priority: '0.9', changefreq: 'weekly' });
urls.push({ loc: '/pricing', priority: '0.8', changefreq: 'monthly' });
urls.push({ loc: '/paths', priority: '0.7', changefreq: 'weekly' });
urls.push({ loc: '/blog', priority: '0.7', changefreq: 'weekly' });

// Game pages
const allGames = new Set();
for (const sub of subCategories) {
  for (const game of sub.games) {
    allGames.add(game);
  }
}
for (const game of allGames) {
  urls.push({ loc: `/games/${toSlug(game)}`, priority: '0.8', changefreq: 'monthly' });
}

// Category pages
for (const cat of categories) {
  urls.push({ loc: `/learn/${cat.id}`, priority: '0.85', changefreq: 'weekly' });
}

// Subcategory pages
for (const sub of subCategories) {
  urls.push({ loc: `/learn/${sub.catId}/${subCatSlug(sub.name)}`, priority: '0.75', changefreq: 'monthly' });
}

// Difficulty pages
for (const level of ['beginner', 'intermediate', 'advanced']) {
  urls.push({ loc: `/difficulty/${level}`, priority: '0.7', changefreq: 'monthly' });
}

// Audience pages
for (const audience of ['teachers', 'students', 'engineers', 'parents']) {
  urls.push({ loc: `/for/${audience}`, priority: '0.8', changefreq: 'monthly' });
}

// Comparison pages — parse from comparisons.ts
const comparisonsFile = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'data', 'comparisons.ts'), 'utf-8'
);
const compRegex = /comparisonSlug:\s*'([^']+)'/g;
while ((match = compRegex.exec(comparisonsFile)) !== null) {
  urls.push({ loc: `/compare/${match[1]}`, priority: '0.6', changefreq: 'monthly' });
}

// How-it-works pages — parse from howItWorks.ts
const howFile = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'data', 'howItWorks.ts'), 'utf-8'
);
const howRegex = /^\s+slug:\s*'([^']+)'/gm;
while ((match = howRegex.exec(howFile)) !== null) {
  urls.push({ loc: `/how/${match[1]}`, priority: '0.6', changefreq: 'monthly' });
}

// Glossary pages — parse from glossary.ts
const glossaryFile = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'data', 'glossary.ts'), 'utf-8'
);
urls.push({ loc: '/glossary', priority: '0.7', changefreq: 'weekly' });
const glossRegex = /^\s+slug:\s*'([^']+)'/gm;
while ((match = glossRegex.exec(glossaryFile)) !== null) {
  urls.push({ loc: `/glossary/${match[1]}`, priority: '0.5', changefreq: 'monthly' });
}

// Topic pages — parse from topics.ts
const topicsFile = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'data', 'topics.ts'), 'utf-8'
);
const topicRegex = /^\s+slug:\s*'([^']+)'/gm;
while ((match = topicRegex.exec(topicsFile)) !== null) {
  urls.push({ loc: `/topics/${match[1]}`, priority: '0.7', changefreq: 'monthly' });
}

// Use case pages — parse from useCases.ts
const useCasesFile = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'data', 'useCases.ts'), 'utf-8'
);
const ucRegex = /^\s+slug:\s*'([^']+)'/gm;
while ((match = ucRegex.exec(useCasesFile)) !== null) {
  urls.push({ loc: `/use-cases/${match[1]}`, priority: '0.7', changefreq: 'monthly' });
}

// Alternatives pages — parse from alternatives.ts
const alternativesFile = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'data', 'alternatives.ts'), 'utf-8'
);
const altRegex = /^\s+slug:\s*'([^']+)'/gm;
while ((match = altRegex.exec(alternativesFile)) !== null) {
  urls.push({ loc: `/alternatives/${match[1]}`, priority: '0.7', changefreq: 'monthly' });
}

// Blog posts — parse from blogComparisonPosts.ts and blogRoundupPosts.ts
const blogCompFile = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'data', 'blogComparisonPosts.ts'), 'utf-8'
);
const blogCompRegex = /slug:\s*'([^']+)'/g;
while ((match = blogCompRegex.exec(blogCompFile)) !== null) {
  urls.push({ loc: `/blog/${match[1]}`, priority: '0.7', changefreq: 'monthly' });
}

const blogRoundupFile = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'data', 'blogRoundupPosts.ts'), 'utf-8'
);
const blogRoundupRegex = /slug:\s*'([^']+)'/g;
while ((match = blogRoundupRegex.exec(blogRoundupFile)) !== null) {
  urls.push({ loc: `/blog/${match[1]}`, priority: '0.75', changefreq: 'monthly' });
}

// ============================================================
// Generate XML
// ============================================================

function generateSitemap(urlEntries) {
  const xmlUrls = urlEntries.map(u => `  <url>
    <loc>${BASE_URL}${u.loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlUrls}
</urlset>`;
}

function generateSitemapIndex(sitemapFiles) {
  const entries = sitemapFiles.map(f => `  <sitemap>
    <loc>${BASE_URL}/${f}</loc>
    <lastmod>${TODAY}</lastmod>
  </sitemap>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;
}

// Write output
if (urls.length > 1000) {
  const chunkSize = 500;
  const sitemapFiles = [];
  for (let i = 0; i < urls.length; i += chunkSize) {
    const chunk = urls.slice(i, i + chunkSize);
    const idx = Math.floor(i / chunkSize) + 1;
    const filename = `sitemap-${idx}.xml`;
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), generateSitemap(chunk));
    sitemapFiles.push(filename);
    console.log(`  Generated ${filename} (${chunk.length} URLs)`);
  }
  fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), generateSitemapIndex(sitemapFiles));
  console.log(`Generated sitemap index with ${sitemapFiles.length} sitemaps (${urls.length} total URLs)`);
} else {
  fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), generateSitemap(urls));
  console.log(`Generated sitemap.xml with ${urls.length} URLs`);
}
