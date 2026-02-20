/**
 * Fix two issues across all renderers:
 * 1. Scroll to top on phase change — add scroll reset inside goToPhase after setPhase
 * 2. Increase paddingTop from 48px to 60px to properly clear fixed header bar
 */
const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.join(__dirname, '..', 'components');

const files = fs.readdirSync(COMPONENTS_DIR)
  .filter(f => f.endsWith('Renderer.tsx'))
  .map(f => path.join(COMPONENTS_DIR, f));

const SCROLL_CODE = `\n    // Scroll to top on phase change\n    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });`;

let stats = { scroll: 0, padding: 0, filesChanged: 0, scrollErrors: [] };

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  const basename = path.basename(filePath);

  // === 1. Add scroll-to-top in goToPhase after setPhase ===
  // Find the goToPhase definition line
  const lines = content.split('\n');
  let goToPhaseDefLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('goToPhase') &&
        (lines[i].includes('useCallback') || lines[i].includes('= (')) &&
        !lines[i].trim().startsWith('//') &&
        !lines[i].trim().startsWith('*')) {
      goToPhaseDefLine = i;
      break;
    }
  }

  if (goToPhaseDefLine !== -1) {
    // Find the first setPhase( line after goToPhase definition
    let setPhaseLineIdx = -1;
    for (let i = goToPhaseDefLine; i < Math.min(goToPhaseDefLine + 20, lines.length); i++) {
      if (lines[i].includes('setPhase(') && !lines[i].includes('// Scroll')) {
        setPhaseLineIdx = i;
        break;
      }
    }

    if (setPhaseLineIdx !== -1) {
      // Check if scroll code already added
      const nextLine = lines[setPhaseLineIdx + 1] || '';
      if (!nextLine.includes('Scroll to top') && !nextLine.includes('requestAnimationFrame')) {
        // Insert scroll code after the setPhase line
        lines.splice(setPhaseLineIdx + 1, 0,
          '    // Scroll to top on phase change',
          "    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });"
        );
        content = lines.join('\n');
        stats.scroll++;
      }
    } else {
      stats.scrollErrors.push(`NO setPhase in goToPhase: ${basename}`);
    }
  } else {
    stats.scrollErrors.push(`NO goToPhase: ${basename}`);
  }

  // === 2. Change paddingTop: '48px' to '60px' ===
  const padCount = (content.match(/paddingTop: '48px'/g) || []).length;
  content = content.replace(/paddingTop: '48px'/g, "paddingTop: '60px'");
  if (padCount > 0) stats.padding += padCount;

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    stats.filesChanged++;
  }
}

console.log(`Done: ${stats.filesChanged} files changed`);
console.log(`  scroll-to-top added: ${stats.scroll} files`);
console.log(`  paddingTop 48→60: ${stats.padding} replacements`);
if (stats.scrollErrors.length > 0) {
  console.log(`  scroll errors (${stats.scrollErrors.length}):`);
  stats.scrollErrors.forEach(e => console.log(`    ${e}`));
}
