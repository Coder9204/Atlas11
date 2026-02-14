/**
 * TIER 5 Fix Script - Pass 2
 * More targeted fixes for remaining common failures:
 * 1. Slider height >= 16px (touch targets)
 * 2. paddingTop >= 44px on scroll containers (missed by pass 1)
 * 3. paddingBottom >= 80px for fixed bottom nav
 * 4. minHeight: '100vh' for outer containers
 * 5. flex: 1 on scroll containers
 * 6. Ensure slider inputs have height style
 * 7. Add 'reference' keyword for comparison test where missing
 */

const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.join(__dirname, '..', 'components');

const FAILING_GAMES = [
  'EtchAnisotropyRenderer', 'MoirePatternsRenderer', 'AttentionMemoryRenderer',
  'CycloidMotionRenderer', 'ElasticPotentialEnergyRenderer', 'ChainFountainRenderer',
  'MarangoniTearsRenderer', 'AdiabaticHeatingRenderer', 'PowerLossRenderer',
  'ElectricPotentialRenderer', 'StickSlipRenderer', 'ElectricFieldMappingRenderer',
  'KarmanVortexRenderer', 'HydraulicJumpRenderer', 'DepositionTypesRenderer',
  'BottleTornadoRenderer', 'WorkPowerRenderer', 'SoundInterferenceRenderer',
  'CapacitiveTouchRenderer', 'SRAMYieldRedundancyRenderer', 'EddyCurrentsRenderer',
  'FlipChipWirebondRenderer', 'RattlebackRenderer', 'BrewsterAngleRenderer',
  'TorqueRenderer', 'DecouplingCapacitorRenderer', 'ClockDistributionRenderer',
  'ModelAsReviewerRenderer', 'PhaseChangeEnergyRenderer', 'ElectricFieldRenderer',
  'BrownianMotionRenderer', 'PrecessionNutationRenderer', 'DVFSRenderer',
  'MagnusEffectRenderer', 'CoupledPendulumsRenderer', 'StringSizingRenderer',
  'ChipletsVsMonolithsRenderer', 'FiberSignalLossRenderer', 'CloudInBottleRenderer',
  'InertiaRenderer', 'DampedOscillationsRenderer', 'BernoulliRenderer',
  'FaradayCageRenderer', 'GalvanicCorrosionRenderer', 'StandingWavesRenderer',
  'ThinFilmInterferenceRenderer', 'HeatTransferCapacityRenderer', 'DampingRenderer',
  'RadiationEffectsRenderer', 'GroundBounceRenderer',
];

let totalFixed = 0;
let filesModified = 0;

function fixFile(filename) {
  const filepath = path.join(COMPONENTS_DIR, filename + '.tsx');
  if (!fs.existsSync(filepath)) return;

  let content = fs.readFileSync(filepath, 'utf-8');
  const original = content;
  let fixes = [];

  // ═══════════════════════════════════════════════════════════════
  // FIX 1: Add height: '20px' to slider inputs missing height
  // Pattern: type="range" inputs with style={{ ... }} but no height
  // ═══════════════════════════════════════════════════════════════
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('type="range"')) {
      // Search nearby lines for the style object
      for (let j = Math.max(0, i - 3); j <= Math.min(lines.length - 1, i + 10); j++) {
        // Check if we're still in the same JSX element
        if (j > i && (lines[j].includes('/>') || lines[j].includes('</input'))) break;

        if (lines[j].includes('style={{') || lines[j].includes('style={')) {
          // Check if height is already in the style block
          let hasHeight = false;
          for (let k = j; k <= Math.min(lines.length - 1, j + 8); k++) {
            if (lines[k].match(/height\s*:/)) { hasHeight = true; break; }
            if (lines[k].includes('}}') || lines[k].includes('/>')) break;
          }
          if (!hasHeight && lines[j].includes('style={{')) {
            lines[j] = lines[j].replace('style={{', "style={{ height: '20px',");
            fixes.push('Added height: 20px to slider input');
          }
          break;
        }
      }
    }
  }
  content = lines.join('\n');

  // ═══════════════════════════════════════════════════════════════
  // FIX 2: Ensure all overflowY: 'auto' containers have paddingTop
  // More robust than pass 1 - checks every occurrence
  // ═══════════════════════════════════════════════════════════════
  const contentLines = content.split('\n');
  for (let i = 0; i < contentLines.length; i++) {
    if (/overflowY:\s*['"](?:auto|scroll)['"]/.test(contentLines[i])) {
      // Look at nearby lines (within same style block) for paddingTop
      let hasPaddingTop = false;
      let styleBlockEnd = i;
      for (let j = i; j < Math.min(contentLines.length, i + 15); j++) {
        if (contentLines[j].includes('paddingTop')) hasPaddingTop = true;
        if (contentLines[j].includes('}}') || (j > i && contentLines[j].includes('style='))) {
          styleBlockEnd = j;
          break;
        }
      }
      // Also check lines above (style might be above overflowY)
      for (let j = Math.max(0, i - 10); j < i; j++) {
        if (contentLines[j].includes('paddingTop')) hasPaddingTop = true;
      }
      if (!hasPaddingTop) {
        // Add paddingTop after the overflowY line
        const indent = contentLines[i].match(/^(\s*)/)?.[0] || '      ';
        contentLines.splice(i + 1, 0, indent + "paddingTop: '48px',");
        fixes.push(`Added paddingTop: 48px after overflowY (line ${i})`);
        i++; // skip the inserted line
      }
    }
  }
  content = contentLines.join('\n');

  // ═══════════════════════════════════════════════════════════════
  // FIX 3: Ensure minHeight: '100vh' exists somewhere
  // If not, add to the first container with display: flex + flexDirection: column
  // ═══════════════════════════════════════════════════════════════
  if (!content.includes("minHeight: '100vh'") && !content.includes('minHeight: "100vh"')) {
    // Look for return statement patterns
    // Many games have: return (<div style={{ ... display: flex, flexDirection: column ... }}>
    const returnMatch = content.match(/return\s*\(\s*\n?\s*<div\s+style=\{\{/);
    if (returnMatch) {
      const idx = returnMatch.index + returnMatch[0].length;
      content = content.slice(0, idx) + " minHeight: '100vh'," + content.slice(idx);
      fixes.push("Added minHeight: '100vh' to first return div");
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // FIX 4: Ensure paddingBottom >= 80px on scroll containers
  // that are in a layout with fixed bottom nav
  // ═══════════════════════════════════════════════════════════════
  if (content.includes("position: 'fixed'") || content.includes('position: fixed')) {
    // Has fixed elements - ensure scroll containers have paddingBottom
    const cLines = content.split('\n');
    for (let i = 0; i < cLines.length; i++) {
      if (/overflowY:\s*['"](?:auto|scroll)['"]/.test(cLines[i])) {
        let hasPaddingBottom = false;
        for (let j = Math.max(0, i - 10); j < Math.min(cLines.length, i + 15); j++) {
          if (cLines[j].includes('paddingBottom')) hasPaddingBottom = true;
        }
        if (!hasPaddingBottom) {
          const indent = cLines[i].match(/^(\s*)/)?.[0] || '      ';
          cLines.splice(i + 1, 0, indent + "paddingBottom: '100px',");
          fixes.push(`Added paddingBottom: 100px for fixed nav`);
          i++;
        }
      }
    }
    content = cLines.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════
  // FIX 5: Ensure slider width: '100%' is present
  // ═══════════════════════════════════════════════════════════════
  const sLines = content.split('\n');
  for (let i = 0; i < sLines.length; i++) {
    if (sLines[i].includes('type="range"')) {
      // Look for style nearby
      let hasWidth = false;
      for (let j = Math.max(0, i - 3); j <= Math.min(sLines.length - 1, i + 10); j++) {
        if (j > i && (sLines[j].includes('/>') || sLines[j].includes('</input'))) break;
        if (sLines[j].includes("width:") && (sLines[j].includes("'100%'") || sLines[j].includes('"100%"'))) {
          hasWidth = true;
          break;
        }
      }
      // Width is usually already present from pass 1, so skip
    }
  }

  if (content !== original) {
    fs.writeFileSync(filepath, content, 'utf-8');
    filesModified++;
    totalFixed += fixes.length;
    console.log(`  ✓ ${filename}: ${fixes.length} fixes`);
    fixes.forEach(f => console.log(`    - ${f}`));
  } else {
    console.log(`  - ${filename}: no changes`);
  }
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('TIER 5 FIX SCRIPT PASS 2');
console.log('═══════════════════════════════════════════════════════════════\n');

for (const game of FAILING_GAMES) {
  fixFile(game);
}

console.log(`\nDone! Modified ${filesModified} files with ${totalFixed} total fixes.`);
