/**
 * Phase 3: Fix 14 JSX double-render files
 *
 * Pattern: In the JSX return, both TransferPhaseView AND the old renderTransfer()
 * are rendered for phase === 'transfer'. Remove the old renderTransfer line.
 */
const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.join(__dirname, '..', 'components');

const TARGET_FILES = [
  'StaticElectricityRenderer.tsx',
  'TotalInternalReflectionRenderer.tsx',
  'TwoBallCollisionRenderer.tsx',
  'ReactionTimeRenderer.tsx',
  'RollingVsSlidingRenderer.tsx',
  'RCTimeConstantRenderer.tsx',
  'ElectricFieldMappingRenderer.tsx',
  'ElasticPotentialEnergyRenderer.tsx',
  'EddyCurrentsRenderer.tsx',
  'DiffusionConvectionRenderer.tsx',
  'EchoTimeOfFlightRenderer.tsx',
  'DiffractionRenderer.tsx',
  'ConvectionCurrentsRenderer.tsx',
  'CircuitsRenderer.tsx',
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

  // Remove lines like: {phase === 'transfer' && renderTransfer()}
  // or: {phase === 'transfer' && renderTransferPhase()}
  // These may span one line or have whitespace variations
  const doubleRenderRegex = /\s*\{phase === 'transfer' && (?:renderTransfer|renderTransferPhase)\(\)\}\s*\n/g;
  content = content.replace(doubleRenderRegex, '\n');

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
