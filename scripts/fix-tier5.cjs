/**
 * Fix TIER 5 test failures across all non-ELON game renderers
 *
 * Common issues:
 * 1. SVG fontSize < 11 → bump to 11 minimum
 * 2. Missing touchAction: 'pan-y' on sliders
 * 3. height: '100dvh' → minHeight: '100vh' on outer containers
 * 4. Missing paddingTop on scroll containers (overflowY: auto)
 * 5. font-size in SVG style strings < 11
 */

const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.join(__dirname, '..', 'components');

// List of all 50 failing games
const FAILING_GAMES = [
  'EtchAnisotropyRenderer',
  'MoirePatternsRenderer',
  'AttentionMemoryRenderer',
  'CycloidMotionRenderer',
  'ElasticPotentialEnergyRenderer',
  'ChainFountainRenderer',
  'MarangoniTearsRenderer',
  'AdiabaticHeatingRenderer',
  'PowerLossRenderer',
  'ElectricPotentialRenderer',
  'StickSlipRenderer',
  'ElectricFieldMappingRenderer',
  'KarmanVortexRenderer',
  'HydraulicJumpRenderer',
  'DepositionTypesRenderer',
  'BottleTornadoRenderer',
  'WorkPowerRenderer',
  'SoundInterferenceRenderer',
  'CapacitiveTouchRenderer',
  'SRAMYieldRedundancyRenderer',
  'EddyCurrentsRenderer',
  'FlipChipWirebondRenderer',
  'RattlebackRenderer',
  'BrewsterAngleRenderer',
  'TorqueRenderer',
  'DecouplingCapacitorRenderer',
  'ClockDistributionRenderer',
  'ModelAsReviewerRenderer',
  'PhaseChangeEnergyRenderer',
  'ElectricFieldRenderer',
  'BrownianMotionRenderer',
  'PrecessionNutationRenderer',
  'DVFSRenderer',
  'MagnusEffectRenderer',
  'CoupledPendulumsRenderer',
  'StringSizingRenderer',
  'ChipletsVsMonolithsRenderer',
  'FiberSignalLossRenderer',
  'CloudInBottleRenderer',
  'InertiaRenderer',
  'DampedOscillationsRenderer',
  'BernoulliRenderer',
  'FaradayCageRenderer',
  'GalvanicCorrosionRenderer',
  'StandingWavesRenderer',
  'ThinFilmInterferenceRenderer',
  'HeatTransferCapacityRenderer',
  'DampingRenderer',
  'RadiationEffectsRenderer',
  'GroundBounceRenderer',
];

let totalFixed = 0;
let filesModified = 0;

function fixFile(filename) {
  const filepath = path.join(COMPONENTS_DIR, filename + '.tsx');
  if (!fs.existsSync(filepath)) {
    console.log(`  SKIP: ${filename}.tsx not found`);
    return;
  }

  let content = fs.readFileSync(filepath, 'utf-8');
  const original = content;
  let fixes = [];

  // ═══════════════════════════════════════════════════════════════
  // FIX 1: SVG fontSize attributes < 11 → bump to 11
  // Matches: fontSize={9}, fontSize={10}, fontSize="9", fontSize="10"
  // Also: fontSize={8}, fontSize={7}, etc.
  // ═══════════════════════════════════════════════════════════════
  content = content.replace(/fontSize=\{(\d+)\}/g, (match, num) => {
    const n = parseInt(num);
    if (n < 11) {
      fixes.push(`SVG fontSize={${n}} → fontSize={11}`);
      return 'fontSize={11}';
    }
    return match;
  });

  content = content.replace(/fontSize="(\d+)"/g, (match, num) => {
    const n = parseInt(num);
    if (n < 11) {
      fixes.push(`SVG fontSize="${num}" → fontSize="11"`);
      return 'fontSize="11"';
    }
    return match;
  });

  // Also fix font-size in inline style strings: font-size: 9px, font-size: 10px
  content = content.replace(/font-size:\s*(\d+)px/g, (match, num) => {
    const n = parseInt(num);
    if (n < 11) {
      fixes.push(`font-size: ${n}px → font-size: 11px`);
      return 'font-size: 11px';
    }
    return match;
  });

  // ═══════════════════════════════════════════════════════════════
  // FIX 2: Add touchAction: 'pan-y' to slider inputs
  // Look for type="range" input elements and add touchAction to their style
  // ═══════════════════════════════════════════════════════════════
  if (!content.includes('touchAction') && content.includes('type="range"')) {
    // Strategy: Find input type="range" elements and add touchAction to their style
    // Pattern 1: style={{ ... }} on input type="range" (JSX style object)
    // Find lines with type="range" and look for nearby style={{ }}

    // First, try to find a shared slider style object/function
    const sliderStylePatterns = [
      // Pattern: const sliderStyle = { ... } or similar
      /const\s+slider\w*[Ss]tyle\w*\s*[:=]\s*\{/,
      // Pattern: style={{ width: '100%' (on/near type="range")
    ];

    let foundSharedStyle = false;
    for (const pattern of sliderStylePatterns) {
      const match = content.match(pattern);
      if (match) {
        // Add touchAction to the style object
        const idx = match.index + match[0].length;
        content = content.slice(0, idx) + "\n      touchAction: 'pan-y' as const," + content.slice(idx);
        fixes.push('Added touchAction to shared slider style');
        foundSharedStyle = true;
        break;
      }
    }

    if (!foundSharedStyle) {
      // Pattern: Look for style={{ on lines near type="range"
      // Find each input type="range" and add touchAction to its style
      const lines = content.split('\n');
      const newLines = [];
      let i = 0;
      while (i < lines.length) {
        newLines.push(lines[i]);
        if (lines[i].includes('type="range"')) {
          // Look backwards and forwards for style={{
          let styleFound = false;

          // Check if style is on a nearby line (within 10 lines ahead)
          for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
            if (lines[j].includes('style={{') || lines[j].includes('style={')) {
              // Found style - check if it's still part of same JSX element
              // Only process if we haven't hit a closing />
              let hitClose = false;
              for (let k = i + 1; k <= j; k++) {
                if (lines[k].includes('/>') || lines[k].includes('</input>')) {
                  hitClose = true;
                  break;
                }
              }
              if (!hitClose && lines[j].includes('style={{')) {
                // Add touchAction after style={{
                lines[j] = lines[j].replace('style={{', "style={{ touchAction: 'pan-y',");
                fixes.push('Added touchAction inline to slider style');
                styleFound = true;
              }
              break;
            }
            if (lines[j].includes('/>') || lines[j].includes('</')) break;
          }

          // Check if style is on same line or within prior lines (part of multi-line JSX)
          if (!styleFound) {
            for (let j = Math.max(0, i - 5); j <= i; j++) {
              if (lines[j].includes('style={{') && !lines[j].includes('touchAction')) {
                lines[j] = lines[j].replace('style={{', "style={{ touchAction: 'pan-y',");
                fixes.push('Added touchAction inline to slider style (backward scan)');
                styleFound = true;
                break;
              }
            }
          }

          // If no style found at all, add one
          if (!styleFound) {
            // Check if there's a style prop on the same line
            if (lines[i].includes('style={')) {
              // Already has style - complex case, skip
            } else {
              // Look for the line and add a style prop
              // Check next lines for more attributes
              for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
                if (lines[j].includes('style={{')) {
                  if (!lines[j].includes('touchAction')) {
                    lines[j] = lines[j].replace('style={{', "style={{ touchAction: 'pan-y',");
                    fixes.push('Added touchAction to existing slider style');
                  }
                  styleFound = true;
                  break;
                }
                if (lines[j].includes('style={')) {
                  // Complex style expression - can't easily modify
                  break;
                }
                if (lines[j].trim().startsWith('/>') || lines[j].trim().startsWith('</')) {
                  // End of input element - add style before closing
                  const indent = lines[j].match(/^(\s*)/)?.[1] || '            ';
                  lines.splice(j, 0, `${indent}style={{ touchAction: 'pan-y', width: '100%' }}`);
                  fixes.push('Added new style prop with touchAction to slider');
                  styleFound = true;
                  break;
                }
              }
            }
          }
        }
        i++;
      }
      content = newLines.length > 0 ? lines.join('\n') : content;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // FIX 3: height: '100dvh' → minHeight: '100vh' on outer containers
  // ═══════════════════════════════════════════════════════════════
  // Replace height: '100dvh' with minHeight: '100vh'
  if (content.includes("height: '100dvh'") || content.includes('height: "100dvh"')) {
    content = content.replace(/height:\s*['"]100dvh['"]/g, "minHeight: '100vh'");
    fixes.push("height: '100dvh' → minHeight: '100vh'");
  }

  // Also handle cases where height is 100vh but should be minHeight
  // Only replace the first/outer container, not inner SVG/canvas heights
  // Look for patterns like: { ... height: '100vh', display: 'flex', flexDirection: 'column' }
  // These are likely outer containers that should use minHeight

  // ═══════════════════════════════════════════════════════════════
  // FIX 4: Ensure scroll containers have paddingTop >= 44px
  // Look for overflowY: 'auto' containers and ensure they have paddingTop
  // ═══════════════════════════════════════════════════════════════
  // This is harder to do with regex safely, so we'll look for specific patterns

  // Pattern: overflowY: 'auto' or overflowY: 'scroll' in style objects
  // Check if paddingTop is nearby (within same style object)
  const scrollContainerRegex = /overflowY:\s*['"](?:auto|scroll)['"]/g;
  let scrollMatch;
  const scrollPositions = [];
  while ((scrollMatch = scrollContainerRegex.exec(content)) !== null) {
    scrollPositions.push(scrollMatch.index);
  }

  for (const pos of scrollPositions.reverse()) {
    // Find the start of the style object (look backward for { or {{)
    let braceStart = pos;
    let braceCount = 0;
    for (let i = pos; i >= Math.max(0, pos - 500); i--) {
      if (content[i] === '}') braceCount++;
      if (content[i] === '{') {
        braceCount--;
        if (braceCount < 0) {
          braceStart = i;
          break;
        }
      }
    }

    // Find the end of the style object
    let braceEnd = pos;
    braceCount = 0;
    for (let i = pos; i < Math.min(content.length, pos + 500); i++) {
      if (content[i] === '{') braceCount++;
      if (content[i] === '}') {
        braceCount--;
        if (braceCount < 0) {
          braceEnd = i;
          break;
        }
      }
    }

    const styleBlock = content.slice(braceStart, braceEnd + 1);

    // Check if paddingTop exists in this style block
    if (!styleBlock.includes('paddingTop') && !styleBlock.match(/padding:\s*['"]\d+px\s+/)) {
      // Add paddingTop after overflowY line
      const insertPos = content.indexOf('\n', pos);
      if (insertPos > 0) {
        // Get indentation
        const lineStart = content.lastIndexOf('\n', pos) + 1;
        const indent = content.slice(lineStart, pos).match(/^\s*/)?.[0] || '      ';
        content = content.slice(0, insertPos) + '\n' + indent + "paddingTop: '48px'," + content.slice(insertPos);
        fixes.push('Added paddingTop: 48px to scroll container');
      }
    }

    // Check if flex: 1 or flex: '1' exists
    if (!styleBlock.includes('flex:') && !styleBlock.includes('flex :')) {
      // Add flex: 1 after overflowY
      const insertPos = content.indexOf('\n', pos);
      if (insertPos > 0) {
        const lineStart = content.lastIndexOf('\n', pos) + 1;
        const indent = content.slice(lineStart, pos).match(/^\s*/)?.[0] || '      ';
        content = content.slice(0, insertPos) + '\n' + indent + "flex: 1," + content.slice(insertPos);
        fixes.push('Added flex: 1 to scroll container');
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // FIX 5: Ensure outer container has minHeight: '100vh'
  // Look for the main return statement's outermost div
  // ═══════════════════════════════════════════════════════════════
  if (!content.includes("minHeight: '100vh'") && !content.includes('minHeight: "100vh"') &&
      !content.includes("min-height: 100vh")) {
    // Look for the main outer container pattern
    // Usually: <div style={{ display: 'flex', flexDirection: 'column', ... }}>
    // This is the first div in the render output

    // Try to find pattern: style={{ ... display: 'flex', flexDirection: 'column'
    const outerContainerMatch = content.match(/style=\{\{\s*\n?\s*(?:[\s\S]*?)display:\s*['"]flex['"],?\s*\n?\s*flexDirection:\s*['"]column['"]/);
    if (outerContainerMatch) {
      const matchStart = outerContainerMatch.index;
      const styleStart = content.indexOf('style={{', matchStart);
      if (styleStart >= 0) {
        const insertAfter = styleStart + 'style={{'.length;
        // Check this doesn't already have minHeight
        const nextBrace = content.indexOf('}}', insertAfter);
        const existingBlock = content.slice(insertAfter, nextBrace);
        if (!existingBlock.includes('minHeight') && !existingBlock.includes('min-height') &&
            !existingBlock.includes("height: '100vh'")) {
          content = content.slice(0, insertAfter) + " minHeight: '100vh'," + content.slice(insertAfter);
          fixes.push("Added minHeight: '100vh' to outer container");
        }
      }
    }
  }

  // Write back if changed
  if (content !== original) {
    fs.writeFileSync(filepath, content, 'utf-8');
    filesModified++;
    totalFixed += fixes.length;
    console.log(`  ✓ ${filename}: ${fixes.length} fixes`);
    fixes.forEach(f => console.log(`    - ${f}`));
  } else {
    console.log(`  - ${filename}: no changes needed by script`);
  }
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('TIER 5 FIX SCRIPT - Fixing common CSS/style patterns');
console.log('═══════════════════════════════════════════════════════════════\n');

for (const game of FAILING_GAMES) {
  fixFile(game);
}

console.log(`\n═══════════════════════════════════════════════════════════════`);
console.log(`Done! Modified ${filesModified} files with ${totalFixed} total fixes.`);
console.log('═══════════════════════════════════════════════════════════════');
