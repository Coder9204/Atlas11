#!/usr/bin/env node

/**
 * Prerender Script for Atlas Coach
 *
 * Uses Puppeteer to prerender key pages at build time for SEO.
 * Captures rendered HTML with meta tags and writes to dist/{route}/index.html.
 *
 * Run after Vite build: vite build && node scripts/prerender.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const PORT = 4173;

// Routes to prerender (high-priority pages only)
const ROUTES = [
  '/',
  '/games',
  '/pricing',
  '/paths',
  '/blog',
  '/glossary',
  '/for/teachers',
  '/for/students',
  '/for/engineers',
  '/for/parents',
  '/difficulty/beginner',
  '/difficulty/intermediate',
  '/difficulty/advanced',
];

// Add category pages
const CATEGORIES = [
  'mechanics', 'oscillations', 'fluids', 'thermodynamics',
  'electricity', 'optics', 'materials', 'semiconductors',
  'computing', 'solar', 'space', 'rf', 'experiments', 'storage',
];
for (const cat of CATEGORIES) {
  ROUTES.push(`/learn/${cat}`);
}

// Add topic pages — parse from topics.ts
const topicsFile = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'data', 'topics.ts'), 'utf-8'
);
const topicRegex = /^\s+slug:\s*'([^']+)'/gm;
let m2;
while ((m2 = topicRegex.exec(topicsFile)) !== null) {
  ROUTES.push(`/topics/${m2[1]}`);
}

// Add use-case pages — parse from useCases.ts
const useCasesFile = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'data', 'useCases.ts'), 'utf-8'
);
const ucRegex = /^\s+slug:\s*'([^']+)'/gm;
while ((m2 = ucRegex.exec(useCasesFile)) !== null) {
  ROUTES.push(`/use-cases/${m2[1]}`);
}

// Add alternatives pages — parse from alternatives.ts
const altFile = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'data', 'alternatives.ts'), 'utf-8'
);
const altRegex = /^\s+slug:\s*'([^']+)'/gm;
while ((m2 = altRegex.exec(altFile)) !== null) {
  ROUTES.push(`/alternatives/${m2[1]}`);
}

// Add comparison pages — parse from comparisons.ts
const compFile = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'data', 'comparisons.ts'), 'utf-8'
);
const compRegex = /comparisonSlug:\s*'([^']+)'/g;
while ((m2 = compRegex.exec(compFile)) !== null) {
  ROUTES.push(`/compare/${m2[1]}`);
}

// Add how-it-works pages — parse from howItWorks.ts
const howFile = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'data', 'howItWorks.ts'), 'utf-8'
);
const howRegex = /^\s+slug:\s*'([^']+)'/gm;
while ((m2 = howRegex.exec(howFile)) !== null) {
  ROUTES.push(`/how/${m2[1]}`);
}

// Add blog posts — parse from blogComparisonPosts.ts and blogRoundupPosts.ts
const blogCompFile = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'data', 'blogComparisonPosts.ts'), 'utf-8'
);
const blogCompRegex = /slug:\s*'([^']+)'/g;
while ((m2 = blogCompRegex.exec(blogCompFile)) !== null) {
  ROUTES.push(`/blog/${m2[1]}`);
}

const blogRoundupFile = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'data', 'blogRoundupPosts.ts'), 'utf-8'
);
const blogRoundupRegex = /slug:\s*'([^']+)'/g;
while ((m2 = blogRoundupRegex.exec(blogRoundupFile)) !== null) {
  ROUTES.push(`/blog/${m2[1]}`);
}

async function prerender() {
  let puppeteer;
  try {
    puppeteer = await import('puppeteer');
  } catch {
    console.warn('Puppeteer not installed. Skipping prerendering.');
    console.warn('Install with: npm install --save-dev puppeteer');
    return;
  }

  if (!fs.existsSync(DIST_DIR)) {
    console.error('dist/ directory not found. Run vite build first.');
    process.exit(1);
  }

  // Start preview server
  const { createServer } = await import('http');
  let serveHandler;
  try {
    serveHandler = (await import('serve-handler')).default;
  } catch {
    console.warn('serve-handler not installed. Install with: npm install --save-dev serve-handler');
    return;
  }

  const server = createServer((req, res) => {
    return serveHandler(req, res, {
      public: DIST_DIR,
      rewrites: [{ source: '**', destination: '/index.html' }],
    });
  });

  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Preview server running on port ${PORT}`);

  const browser = await puppeteer.default.launch({ headless: 'new' });
  let rendered = 0;

  for (const route of ROUTES) {
    try {
      const page = await browser.newPage();
      await page.goto(`http://localhost:${PORT}${route}`, {
        waitUntil: 'networkidle0',
        timeout: 15000,
      });

      await page.waitForSelector('#root', { timeout: 5000 }).catch(() => {});
      const html = await page.content();

      const outputPath = route === '/'
        ? path.join(DIST_DIR, 'index.html')
        : path.join(DIST_DIR, route, 'index.html');

      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, html);
      rendered++;
      console.log(`  Prerendered: ${route}`);
      await page.close();
    } catch (err) {
      console.warn(`  Failed to prerender ${route}: ${err.message}`);
    }
  }

  await browser.close();
  server.close();
  console.log(`\nPrerendered ${rendered}/${ROUTES.length} pages`);
}

prerender().catch(err => {
  console.error('Prerender failed:', err);
  process.exit(1);
});
