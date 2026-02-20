/**
 * Fix scroll-to-top for the 43 remaining files that don't follow the standard
 * goToPhase/setPhase pattern. Uses useEffect on phase change instead.
 */
const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.join(__dirname, '..', 'components');

const TARGET_FILES = [
  'AdiabaticHeatingRenderer.tsx',
  'BoilingPressureRenderer.tsx',
  'BottleTornadoRenderer.tsx',
  'BrachistochroneRenderer.tsx',
  'BrewsterAngleRenderer.tsx',
  'BucklingRenderer.tsx',
  'CameraObscuraRenderer.tsx',
  'CapacitiveTouchRenderer.tsx',
  'ChainFountainRenderer.tsx',
  'ChipletsVsMonolithsRenderer.tsx',
  'ChladniPatternsRenderer.tsx',
  'ChromaticAberrationRenderer.tsx',
  'CleanroomYieldRenderer.tsx',
  'CloudInBottleRenderer.tsx',
  'CoupledPendulumsRenderer.tsx',
  'CycloidMotionRenderer.tsx',
  'DiffractionRenderer.tsx',
  'DirectionFindingRenderer.tsx',
  'FaradayCageRenderer.tsx',
  'FloatingPaperclipRenderer.tsx',
  'HydraulicJumpRenderer.tsx',
  'LaserSpeckleRenderer.tsx',
  'MakeMicrophoneRenderer.tsx',
  'MarangoniTearsRenderer.tsx',
  'MetronomeSyncRenderer.tsx',
  'MoirePatternsRenderer.tsx',
  'NetworkLatencyRenderer.tsx',
  'PhotoelasticityRenderer.tsx',
  'PowerLossRenderer.tsx',
  'RattlebackRenderer.tsx',
  'RetroreflectionRenderer.tsx',
  'RollingRaceRenderer.tsx',
  'RollingShutterRenderer.tsx',
  'SoundInterferenceRenderer.tsx',
  'StableLevitationRenderer.tsx',
  'StickSlipRenderer.tsx',
  'SupercoolingRenderer.tsx',
  'SuperhydrophobicRenderer.tsx',
  'TerminalVelocityRenderer.tsx',
  'TippingPointRenderer.tsx',
  'TunedMassDamperRenderer.tsx',
  'VortexRingsRenderer.tsx',
  'WagonWheelAliasingRenderer.tsx',
];

const SCROLL_EFFECT = `
  // Scroll to top on phase change
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
  }, [phase]);
`;

// Alternate for files using currentPhase
const SCROLL_EFFECT_CURRENT = `
  // Scroll to top on phase change
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
  }, [currentPhase]);
`;

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

  // Skip if already has scroll effect
  if (content.includes('Scroll to top on phase change')) {
    continue;
  }

  // Determine phase variable name
  const usesCurrentPhase = content.includes('currentPhase') && content.includes('setCurrentPhase');
  const usesInternalPhase = content.includes('internalPhase') || content.includes('setInternalPhase');

  // Choose the right dependency variable
  let effectCode;
  if (usesCurrentPhase) {
    effectCode = SCROLL_EFFECT_CURRENT;
  } else {
    effectCode = SCROLL_EFFECT;
  }

  // Ensure useEffect is imported
  if (!content.includes('useEffect')) {
    // Add useEffect to existing React import
    if (content.includes("import React, { useState")) {
      content = content.replace(
        /import React, \{ useState/,
        'import React, { useEffect, useState'
      );
    } else if (content.includes("import { useState")) {
      content = content.replace(
        /import \{ useState/,
        'import { useEffect, useState'
      );
    } else if (content.includes("import React, {")) {
      content = content.replace(
        /import React, \{/,
        'import React, { useEffect,'
      );
    } else if (content.includes("import React from")) {
      content = content.replace(
        "import React from 'react'",
        "import React, { useEffect } from 'react'"
      );
    }
  }

  // Find insertion point: after the phase state declaration
  // Look for const [phase, or const [currentPhase,
  const phaseStateRegex = /const \[(phase|currentPhase|internalPhase),\s*set\w+\]\s*=\s*useState/;
  const match = content.match(phaseStateRegex);

  if (!match) {
    errors.push(`NO PHASE STATE: ${file}`);
    continue;
  }

  // Find the end of the line containing the phase state
  const matchIdx = content.indexOf(match[0]);
  // Find the next semicolon or newline after the useState call
  let insertIdx = content.indexOf(';', matchIdx);
  if (insertIdx === -1) insertIdx = content.indexOf('\n', matchIdx);
  if (insertIdx === -1) {
    errors.push(`NO INSERTION POINT: ${file}`);
    continue;
  }

  // Insert the useEffect after the phase state line
  // Find the end of the current line
  const endOfLine = content.indexOf('\n', insertIdx);
  content = content.substring(0, endOfLine) + '\n' + effectCode + content.substring(endOfLine);

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
