/**
 * Phase 4: Viewport/responsive fixes across all renderers
 *
 * 4a: Replace '100vh' with '100dvh' in height/minHeight properties
 * 4b: Convert fixed bottom bars to sticky (only bottom bars, not top bars)
 * 4c: Reduce excessive paddingBottom (100px/80px/120px → 16px)
 */
const fs = require('fs');
const path = require('path');
const glob = require('path');

const COMPONENTS_DIR = path.join(__dirname, '..', 'components');

// Get all Renderer files
const files = fs.readdirSync(COMPONENTS_DIR)
  .filter(f => f.endsWith('Renderer.tsx'))
  .map(f => path.join(COMPONENTS_DIR, f));

let stats = { viewport: 0, sticky: 0, padding: 0, filesChanged: 0 };
let errors = [];

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  const basename = path.basename(filePath);

  // Skip TransferPhaseView (already fixed in Phase 1)
  if (basename === 'TransferPhaseView.tsx') continue;

  // 4a: Replace 100vh with 100dvh in height/minHeight properties
  // Match: height: '100vh' or minHeight: '100vh'
  const vhCount = (content.match(/(?:min)?[Hh]eight: '100vh'/g) || []).length;
  content = content.replace(/((?:min)?[Hh]eight: )'100vh'/g, "$1'100dvh'");
  if (vhCount > 0) stats.viewport += vhCount;

  // 4b: Convert fixed bottom nav to sticky
  // Target: position: 'fixed' followed by bottom: 0 (within a few lines)
  // The bottom nav pattern: position: 'fixed',\n      bottom: 0,
  // The top progress bar: position: 'fixed',\n      top: 0, — leave this alone
  const stickyRegex = /(position: )'fixed'(,\s*\n\s*bottom:\s*(?:0|'0'))/g;
  const stickyCount = (content.match(stickyRegex) || []).length;
  content = content.replace(stickyRegex, "$1'sticky'$2");
  if (stickyCount > 0) stats.sticky += stickyCount;

  // 4c: Reduce excessive paddingBottom
  // Match paddingBottom: '100px' or '80px' or '120px'
  const padRegex = /paddingBottom: '(?:80|100|120)px'/g;
  const padCount = (content.match(padRegex) || []).length;
  content = content.replace(padRegex, "paddingBottom: '16px'");
  if (padCount > 0) stats.padding += padCount;

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    stats.filesChanged++;
    if (vhCount > 0 || stickyCount > 0 || padCount > 0) {
      console.log(`FIXED: ${basename} (vh:${vhCount} sticky:${stickyCount} pad:${padCount})`);
    }
  }
}

console.log(`\nDone: ${stats.filesChanged} files changed`);
console.log(`  viewport 100vh→100dvh: ${stats.viewport} replacements`);
console.log(`  fixed→sticky bottom nav: ${stats.sticky} replacements`);
console.log(`  paddingBottom reduced: ${stats.padding} replacements`);
if (errors.length > 0) {
  console.log('Errors:');
  errors.forEach(e => console.log(`  ${e}`));
}
