/**
 * Phase 2: Fix 47 switch-case files where TransferPhaseView is dead code
 *
 * Pattern: Inside switch(phase), an unreachable `if (phase === 'transfer')` block
 * was inserted, while `case 'transfer': return renderTransfer()` still runs.
 *
 * Fix: Replace case body with the TransferPhaseView JSX from the dead if-block,
 * then remove the dead if-block.
 */
const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.join(__dirname, '..', 'components');

const TARGET_FILES = [
  'WirelessChargingRenderer.tsx',
  'ThinFilmInterferenceRenderer.tsx',
  'StringSizingRenderer.tsx',
  'SpeedOfSoundRenderer.tsx',
  'SoapBoatRenderer.tsx',
  'SiphonRenderer.tsx',
  'SnellsLawRenderer.tsx',
  'ShowerCurtainRenderer.tsx',
  'SatelliteDopplerRenderer.tsx',
  'SatelliteThermalRenderer.tsx',
  'QuantizationPrecisionRenderer.tsx',
  'RadiationEffectsRenderer.tsx',
  'ProjectileIndependenceRenderer.tsx',
  'PVIVCurveRenderer.tsx',
  'PendulumPeriodRenderer.tsx',
  'NewtonsThirdLawRenderer.tsx',
  'MagneticFieldRenderer.tsx',
  'LCResonanceRenderer.tsx',
  'InertiaRenderer.tsx',
  'InductiveKickbackRenderer.tsx',
  'HydrostaticPressureRenderer.tsx',
  'HeliumBalloonCarRenderer.tsx',
  'GyroscopeStabilityRenderer.tsx',
  'ForcedOscillationsRenderer.tsx',
  'FloatingPaperclipRenderer.tsx',
  'ELON_SpaceCommsRenderer.tsx',
  'ELON_PrecisionBudgetRenderer.tsx',
  'ElectromagneticInductionRenderer.tsx',
  'ElectromagnetRenderer.tsx',
  'ElectricPotentialRenderer.tsx',
  'ElectricFieldRenderer.tsx',
  'DampedOscillationsRenderer.tsx',
  'DampingRenderer.tsx',
  'DCDCConverterRenderer.tsx',
  'ConvectionRenderer.tsx',
  'CoriolisEffectRenderer.tsx',
  'ChromaticAberrationRenderer.tsx',
  'CarnotCycleRenderer.tsx',
  'CartesianDiverRenderer.tsx',
  'CavitationRenderer.tsx',
  'BypassDiodesRenderer.tsx',
  'CableSizingRenderer.tsx',
  'BernoulliRenderer.tsx',
  'BatteryInternalResistanceRenderer.tsx',
  'AskForAssumptionsRenderer.tsx',
  'AntennaPolarizationRenderer.tsx',
  'AngularMomentumTransferRenderer.tsx',
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

  // Step 1: Find and extract the dead if-block with TransferPhaseView JSX
  // Pattern: if (phase === 'transfer') { return ( <TransferPhaseView ... /> ); }
  const deadBlockRegex = /\n\s*if \(phase === 'transfer'\) \{\s*\n\s*return \(\s*\n([\s\S]*?<TransferPhaseView[\s\S]*?\/>)\s*\n\s*\);\s*\n\s*\}\s*\n/;
  const deadBlockMatch = content.match(deadBlockRegex);

  if (!deadBlockMatch) {
    errors.push(`NO DEAD BLOCK: ${file}`);
    continue;
  }

  // Extract just the <TransferPhaseView .../> JSX (trimmed)
  const transferJSX = deadBlockMatch[1].trim();

  // Step 2: Remove the dead if-block
  content = content.replace(deadBlockRegex, '\n');

  // Step 3: Replace `case 'transfer': return renderTransfer();` or renderTransferPhase()
  const caseRegex = /(case 'transfer':\s*return\s+)(?:renderTransfer|renderTransferPhase)\(\);/;
  const caseMatch = content.match(caseRegex);

  if (!caseMatch) {
    errors.push(`NO CASE TRANSFER: ${file}`);
    continue;
  }

  // Build the replacement case body with proper indentation
  const indent = '          ';
  const jsxLines = transferJSX.split('\n').map(line => {
    const trimmed = line.trim();
    if (trimmed === '') return '';
    return indent + trimmed;
  }).filter(l => l !== '').join('\n');

  content = content.replace(caseRegex, `case 'transfer': return (\n${jsxLines}\n        );`);

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
