/**
 * Phase 2b: Fix remaining 10 switch-case files with multi-line case bodies
 *
 * These files have `case 'transfer':` with multi-line bodies (not a simple
 * `return renderTransfer()`). Strategy:
 * 1. Extract TransferPhaseView JSX from the dead if-block
 * 2. Remove the dead if-block
 * 3. Find the render-switch case 'transfer' (the one right after where the dead
 *    if-block was) and replace its body up to the next case/default
 */
const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.join(__dirname, '..', 'components');

const TARGET_FILES = [
  'StringSizingRenderer.tsx',
  'SoapBoatRenderer.tsx',
  'SnellsLawRenderer.tsx',
  'SatelliteDopplerRenderer.tsx',
  'SatelliteThermalRenderer.tsx',
  'PVIVCurveRenderer.tsx',
  'DCDCConverterRenderer.tsx',
  'CoriolisEffectRenderer.tsx',
  'BatteryInternalResistanceRenderer.tsx',
  'AskForAssumptionsRenderer.tsx',
];

let fixed = 0;
let errors = [];

for (const file of TARGET_FILES) {
  const filePath = path.join(COMPONENTS_DIR, file);
  if (!fs.existsSync(filePath)) {
    errors.push(`NOT FOUND: ${file}`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Step 1: Extract TransferPhaseView JSX from dead if-block
  const deadBlockRegex = /\n(\s*)if \(phase === 'transfer'\) \{\s*\n\s*return \(\s*\n([\s\S]*?<TransferPhaseView[\s\S]*?\/>)\s*\n\s*\);\s*\n\s*\}/;
  const deadBlockMatch = content.match(deadBlockRegex);

  if (!deadBlockMatch) {
    errors.push(`NO DEAD BLOCK: ${file}`);
    continue;
  }

  const deadBlockIndex = deadBlockMatch.index;
  const deadBlockFull = deadBlockMatch[0];
  const transferJSX = deadBlockMatch[2].trim();

  // Step 2: Remove the dead if-block
  content = content.replace(deadBlockFull, '');

  // Step 3: Find the render case 'transfer' that was right after the dead block
  // Look for `case 'transfer':` followed by multi-line body, ending at next case/default
  // We want the one nearest to where the dead block was (now removed)
  // The dead block was at position deadBlockIndex, so the render case should be
  // very close to that position in the modified content

  // Find all case 'transfer': positions
  const caseRegex = /case 'transfer':/g;
  let match;
  let renderCasePos = -1;

  // Find the case 'transfer' that is closest to (but after) the dead block position
  // Since we removed the dead block, adjust search area
  while ((match = caseRegex.exec(content)) !== null) {
    // The render case should be near where the dead block was
    if (match.index >= deadBlockIndex - 200) {
      renderCasePos = match.index;
      break;
    }
  }

  if (renderCasePos === -1) {
    // Fallback: find the last case 'transfer': in the file
    const allMatches = [...content.matchAll(/case 'transfer':/g)];
    if (allMatches.length > 0) {
      // Find the one that has a multi-line body (not just `break;` or a single line)
      for (const m of allMatches) {
        const after = content.substring(m.index, m.index + 200);
        if (after.includes('return (') || after.includes('return renderTransfer')) {
          renderCasePos = m.index;
          break;
        }
      }
    }
  }

  if (renderCasePos === -1) {
    errors.push(`NO RENDER CASE: ${file}`);
    continue;
  }

  // Find the end of this case body: next `case '` or `default:` at the same indentation
  const afterCase = content.substring(renderCasePos);
  // Match from `case 'transfer':` up to (but not including) next case at same level
  const caseBodyEndRegex = /case 'transfer':[\s\S]*?(?=\n\s*case '|\n\s*default:)/;
  const caseBodyMatch = afterCase.match(caseBodyEndRegex);

  if (!caseBodyMatch) {
    errors.push(`NO CASE BODY END: ${file}`);
    continue;
  }

  const oldCaseBody = caseBodyMatch[0];

  // Build replacement: simple return of TransferPhaseView
  const indent = '          ';
  const jsxLines = transferJSX.split('\n').map(line => {
    const trimmed = line.trim();
    if (trimmed === '') return '';
    return indent + trimmed;
  }).filter(l => l !== '').join('\n');

  const newCaseBody = `case 'transfer': return (\n${jsxLines}\n        );`;

  content = content.substring(0, renderCasePos) + newCaseBody + content.substring(renderCasePos + oldCaseBody.length);

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    fixed++;
    console.log(`FIXED: ${file}`);
  } else {
    errors.push(`NO CHANGE: ${file}`);
  }
}

console.log(`\nDone: ${fixed} fixed, ${errors.length} errors`);
if (errors.length > 0) {
  console.log('Errors:');
  errors.forEach(e => console.log(`  ${e}`));
}
