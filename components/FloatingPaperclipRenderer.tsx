'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ============================================================================
// FLOATING PAPERCLIP RENDERER - SURFACE TENSION PHYSICS
// Premium 10-phase educational game teaching surface tension support
// ============================================================================
// Physics: Surface tension creates a "skin" supporting heavy objects
// Steel paperclip floats despite being 8x denser than water
// Force balance: Weight = Surface tension x perimeter x sin(theta)

export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
    'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
    'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
    'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected';
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Explore',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Review',
  twist_predict: 'New Variable',
  twist_play: 'Deep Experiment',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge',
  mastery: 'Mastery'
};

interface FloatingPaperclipRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  phase?: Phase;
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// ============================================================================
// LIQUID PROPERTIES
// ============================================================================

const liquidProperties: Record<string, { gamma: number; color: string; name: string }> = {
  water: { gamma: 0.072, color: '#3b82f6', name: 'Water' },
  oil: { gamma: 0.032, color: '#eab308', name: 'Oil' },
  alcohol: { gamma: 0.022, color: '#a855f7', name: 'Alcohol' },
};

// ============================================================================
// PREDICTION DATA
// ============================================================================

const predictions = {
  initial: {
    question: "You have a steel paperclip and a bowl of water. What happens when you gently place the paperclip on the water surface?",
    options: [
      { id: 'A', text: 'Sinks immediately (steel is 8x denser than water)' },
      { id: 'B', text: 'Floats on the surface' },
      { id: 'C', text: 'Bobs up and down, then sinks' },
      { id: 'D', text: 'Dissolves in the water' },
    ],
    correct: 'B',
    explanation: "Surprisingly, the paperclip floats! Despite steel being 8 times denser than water, surface tension creates an invisible 'skin' on the water that can support lightweight objects. The key is gentle placement - this allows the surface to deform and distribute the weight across a larger area."
  },
  twist: {
    question: "A paperclip is floating on water. What happens when you add a drop of dish soap to the water nearby?",
    options: [
      { id: 'A', text: 'Paperclip floats higher (soap makes water "slippery")' },
      { id: 'B', text: "Nothing changes (soap doesn't affect floating)" },
      { id: 'C', text: 'Paperclip sinks immediately' },
      { id: 'D', text: 'Paperclip moves toward the soap' },
    ],
    correct: 'C',
    explanation: "The paperclip sinks immediately! Soap is a surfactant that breaks hydrogen bonds between water molecules, reducing surface tension by up to 65%. Without sufficient surface tension force, the water can no longer support the paperclip's weight, and it sinks instantly."
  }
};

// ============================================================================
// REAL-WORLD APPLICATIONS DATA (Detailed)
// ============================================================================

const realWorldApps = [
  {
    icon: '🦟',
    title: 'Water Strider Biomimicry',
    short: 'Robotic insects that walk on water',
    tagline: 'Engineering robots that mimic nature\'s water-walking masters',
    description: 'Water striders exploit surface tension to walk on water using superhydrophobic legs covered in microscopic hairs. Engineers have developed bio-inspired robots that replicate this ability, creating aquatic microrobots capable of traversing water surfaces for environmental monitoring, search and rescue operations, and scientific research in hard-to-reach aquatic environments.',
    connection: 'Just like our floating paperclip, water strider robots distribute their weight across the water surface using specialized leg structures that maximize contact perimeter while minimizing surface penetration. The key is maintaining the contact angle below the critical threshold where surface tension force equals weight.',
    howItWorks: 'These robots use superhydrophobic coatings (often mimicking the waxy, hairy structure of real water strider legs) to prevent water from wetting their leg surfaces. The legs create dimples in the water surface without breaking through, generating upward surface tension forces. Precise weight distribution and leg geometry ensure the robot stays afloat while actuators enable controlled locomotion.',
    stats: [
      { value: '1,200', label: 'microhairs per leg on real water striders' },
      { value: '15x', label: 'body weight supported by surface tension' },
      { value: '1.5 m/s', label: 'maximum speed of robotic water striders' }
    ],
    examples: [
      'Surveillance microrobots for water quality monitoring',
      'Search and rescue robots for flood disaster response',
      'Scientific sampling robots for remote lake research',
      'Military reconnaissance drones for coastal operations'
    ],
    companies: [
      'Harvard Microrobotics Lab',
      'Seoul National University Robotics',
      'MIT CSAIL',
      'Carnegie Mellon Robotics Institute'
    ],
    futureImpact: 'As materials science advances, we\'ll see swarms of water-walking robots deployed for large-scale environmental monitoring, oil spill detection, and even payload delivery across water bodies without the need for boats or submersibles.',
    color: '#22c55e'
  },
  {
    icon: '🛢️',
    title: 'Oil Spill Detection & Cleanup',
    short: 'Monitoring ocean contamination via surface tension',
    tagline: 'Using surface tension changes to detect environmental disasters',
    description: 'Oil spills dramatically alter water\'s surface tension properties. Clean seawater has a surface tension around 0.073 N/m, while oil-contaminated water drops to as low as 0.020 N/m. Environmental monitoring systems exploit this difference using specialized sensors and satellite imagery to detect oil slicks, track their spread, and coordinate cleanup efforts in real-time.',
    connection: 'Remember how soap caused our paperclip to sink by reducing surface tension? Oil contamination works similarly - the presence of hydrocarbons disrupts the hydrogen bonding network at the water surface, weakening the \'skin\' that supported our floating paperclip and changing how light reflects off the water.',
    howItWorks: 'Detection systems use multiple approaches: tensiometers measure surface tension directly from water samples; synthetic aperture radar (SAR) satellites detect the smoothing effect oil has on wave patterns; and fluorescence sensors identify oil\'s characteristic light emission. The dramatic surface tension change creates a measurable signature that automated systems can identify and track.',
    stats: [
      { value: '65%', label: 'reduction in surface tension from oil contamination' },
      { value: '< 0.1 mm', label: 'minimum detectable oil film thickness' },
      { value: '24/7', label: 'satellite monitoring of major shipping lanes' }
    ],
    examples: [
      'Real-time monitoring of offshore drilling platforms',
      'Early warning systems for pipeline leak detection',
      'Tracking illegal bilge dumping from ships',
      'Coordinating oil spill cleanup vessel deployment'
    ],
    companies: [
      'NOAA Ocean Service',
      'European Maritime Safety Agency',
      'Oil Spill Response Limited',
      'Airbus Defence and Space',
      'SINTEF Ocean'
    ],
    futureImpact: 'AI-powered satellite networks will provide real-time global ocean surface monitoring, detecting spills within minutes of occurrence and automatically dispatching cleanup resources, potentially preventing billions of dollars in environmental damage annually.',
    color: '#eab308'
  },
  {
    icon: '🔬',
    title: 'Microfluidics & Lab-on-Chip',
    short: 'Miniaturized medical diagnostics',
    tagline: 'Surface tension powers the future of point-of-care medicine',
    description: 'Microfluidic devices manipulate tiny fluid volumes (nanoliters to microliters) in channels smaller than a human hair. At these scales, surface tension dominates over gravity and inertia, enabling precise fluid control without pumps. Lab-on-chip technology leverages this to perform complex medical diagnostics - blood tests, genetic sequencing, drug screening - on devices the size of a credit card.',
    connection: 'In our paperclip experiment, surface tension created forces strong enough to support solid objects. In microfluidics, these same forces drive fluid movement, control droplet formation, and enable mixing of reagents - all without external pumps or moving parts. The physics of the water\'s \'skin\' becomes the engine of miniaturized laboratories.',
    howItWorks: 'Microfluidic channels are designed with specific surface properties (hydrophobic or hydrophilic) to guide fluid flow. Capillary action - driven by surface tension - pulls fluids through channels automatically. Surface tension gradients (created by temperature, surfactant concentration, or electric fields) can be used to move droplets precisely, merge samples with reagents, and separate components for analysis.',
    stats: [
      { value: '10 uL', label: 'blood sample needed for complete blood count' },
      { value: '< 15 min', label: 'time for full diagnostic panel results' },
      { value: '$0.50', label: 'cost per disposable chip vs $50+ lab tests' }
    ],
    examples: [
      'COVID-19 rapid antigen and PCR testing devices',
      'Glucose monitoring for diabetes management',
      'Pregnancy and fertility testing kits',
      'Cancer biomarker screening panels'
    ],
    companies: [
      'Abbott Laboratories',
      'Roche Diagnostics',
      'Danaher Corporation',
      'Illumina',
      'Bio-Rad Laboratories'
    ],
    futureImpact: 'Smartphone-integrated microfluidic devices will democratize medical diagnostics, enabling comprehensive health monitoring at home. Surface tension-driven chips will perform hundreds of tests simultaneously from a single drop of blood, revolutionizing preventive medicine and early disease detection globally.',
    color: '#8b5cf6'
  },
  {
    icon: '🖨️',
    title: 'Inkjet Printing Technology',
    short: 'Precision droplet formation for manufacturing',
    tagline: 'Surface tension shapes every printed dot with nanometer precision',
    description: 'Inkjet printing relies fundamentally on surface tension to form and control microscopic droplets. Whether printing documents, circuit boards, solar cells, or even human tissue, the process depends on precise manipulation of surface tension forces to create uniform droplets, control their trajectory, and ensure proper adhesion to surfaces. Modern inkjet technology prints droplets as small as 1 picoliter with placement accuracy of a few micrometers.',
    connection: 'Our floating paperclip demonstrated how surface tension creates a \'skin\' on water. In inkjet printing, this same force shapes ink into perfect spherical droplets as they exit the nozzle. The ink\'s surface tension must be carefully formulated - too high and droplets won\'t form properly; too low and they\'ll splatter on impact rather than forming crisp dots.',
    howItWorks: 'Thermal or piezoelectric actuators create pressure pulses that eject ink through microscopic nozzles. As ink exits the nozzle, surface tension immediately pulls it into a spherical droplet (minimizing surface area). The droplet\'s surface tension, combined with its velocity and the substrate\'s surface energy, determines how it spreads and adheres upon impact. Ink formulations precisely balance surface tension, viscosity, and drying properties for optimal print quality.',
    stats: [
      { value: '1 pL', label: 'droplet volume (one trillionth of a liter)' },
      { value: '50,000', label: 'droplets per second per nozzle' },
      { value: '2,400 dpi', label: 'resolution in high-end printers' }
    ],
    examples: [
      '3D printing of electronic circuits and sensors',
      'Bioprinting of tissues and organs for transplant',
      'Manufacturing of OLED display panels',
      'Printing of photovoltaic solar cells'
    ],
    companies: [
      'HP Inc.',
      'Canon Inc.',
      'Epson',
      'Fujifilm Dimatix',
      'Konica Minolta'
    ],
    futureImpact: 'Inkjet technology will expand beyond printing to become a primary manufacturing method. Surface tension-controlled deposition will enable printing of complex 3D structures, electronic devices, pharmaceutical pills with customized dosages, and even replacement organs from a patient\'s own cells.',
    color: '#0ea5e9'
  }
];

// ============================================================================
// TEST QUESTIONS (Scenario-based with explanations)
// ============================================================================

const testQuestions = [
  {
    scenario: "You're performing a classic surface tension demonstration. A steel paperclip (density 7,850 kg/m³) is being placed on water (density 1,000 kg/m³).",
    question: "Why does the paperclip float despite being nearly 8 times denser than water?",
    options: [
      { id: 'a', text: 'Steel becomes less dense when shaped as a paperclip' },
      { id: 'b', text: 'Surface tension creates an upward force that balances the weight', correct: true },
      { id: 'c', text: 'Air trapped inside the wire provides buoyancy' },
      { id: 'd', text: 'The paperclip is actually hollow' }
    ],
    explanation: "Surface tension creates an invisible 'skin' on the water surface. When the paperclip is gently placed, this skin deforms and creates an upward force (F = γ × L × sin(θ)) that balances the paperclip's weight. The density doesn't matter as long as the total weight is less than the maximum surface tension force."
  },
  {
    scenario: "A student drops a paperclip from 5 cm above the water instead of gently placing it on the surface.",
    question: "What happens to the paperclip and why?",
    options: [
      { id: 'a', text: 'It floats - the height doesn\'t matter' },
      { id: 'b', text: 'It sinks - momentum breaks through the surface tension before it can deform', correct: true },
      { id: 'c', text: 'It bounces back up like a trampoline' },
      { id: 'd', text: 'It floats initially but slowly sinks' }
    ],
    explanation: "When dropped, the paperclip hits the water with momentum that exceeds the surface tension's ability to resist. The surface is punctured before it can gradually deform to support the weight. Gentle placement allows the surface to slowly deform and create the supporting force."
  },
  {
    scenario: "You notice a water strider insect walking effortlessly on a pond's surface. Its legs have thousands of microscopic hairs coated in waxy oil.",
    question: "How do these features help the water strider stay afloat?",
    options: [
      { id: 'a', text: 'The hairs make the legs lighter' },
      { id: 'b', text: 'The waxy coating increases water\'s surface tension' },
      { id: 'c', text: 'The hairs increase contact perimeter while the wax prevents surface penetration', correct: true },
      { id: 'd', text: 'The insect constantly moves too fast to sink' }
    ],
    explanation: "The microscopic hairs dramatically increase the contact perimeter (L in F = γ × L × sin(θ)), multiplying the surface tension force. The waxy coating makes the legs superhydrophobic, maintaining a high contact angle that maximizes the upward force component without breaking through the surface."
  },
  {
    scenario: "A biology teacher adds a drop of dish soap near a floating paperclip during a demonstration.",
    question: "The paperclip immediately sinks. What physical mechanism causes this?",
    options: [
      { id: 'a', text: 'Soap makes the paperclip heavier by coating it' },
      { id: 'b', text: 'Soap molecules break hydrogen bonds, reducing surface tension by ~65%', correct: true },
      { id: 'c', text: 'Soap creates currents that push the paperclip down' },
      { id: 'd', text: 'Soap makes the water less dense' }
    ],
    explanation: "Soap is a surfactant - its molecules have a hydrophilic head and hydrophobic tail that disrupt the hydrogen bonding network between water molecules. This reduces surface tension from ~0.072 N/m to ~0.025 N/m (65% reduction). The weakened surface can no longer support the paperclip's weight."
  },
  {
    scenario: "An engineer is designing a microfluidic medical diagnostic chip where tiny blood samples must flow through channels 0.1 mm wide.",
    question: "Why does the engineer rely on surface tension rather than pumps to move fluid?",
    options: [
      { id: 'a', text: 'Pumps would contaminate the blood sample' },
      { id: 'b', text: 'At microscale, surface tension dominates over gravity and is sufficient to drive flow', correct: true },
      { id: 'c', text: 'Surface tension is cheaper than pumps' },
      { id: 'd', text: 'Pumps cannot move liquids' }
    ],
    explanation: "At microscale, the surface-to-volume ratio is enormous, making surface tension the dominant force over gravity and inertia. Capillary action (driven by surface tension) naturally pulls liquids through narrow channels. This passive flow requires no external power and enables simple, disposable diagnostic devices."
  },
  {
    scenario: "An inkjet printer produces 1 picoliter droplets (one trillionth of a liter) that must form perfect spheres during flight.",
    question: "What role does surface tension play in droplet formation?",
    options: [
      { id: 'a', text: 'Surface tension slows the droplet down' },
      { id: 'b', text: 'Surface tension pulls the droplet into a sphere (minimum surface area for given volume)', correct: true },
      { id: 'c', text: 'Surface tension colors the ink' },
      { id: 'd', text: 'Surface tension has no effect at this scale' }
    ],
    explanation: "Surface tension acts to minimize surface area. For a given volume, a sphere has the minimum surface area, so surface tension pulls the ink into a perfect spherical droplet. Ink formulation must balance surface tension - too high prevents clean droplet separation; too low causes splattering on impact."
  },
  {
    scenario: "During an oil spill response, sensors detect that seawater surface tension has dropped from 0.073 N/m to 0.028 N/m in a specific region.",
    question: "What does this measurement indicate about the contamination?",
    options: [
      { id: 'a', text: 'The water is getting cleaner' },
      { id: 'b', text: 'Heavy oil contamination - hydrocarbons are disrupting hydrogen bonds', correct: true },
      { id: 'c', text: 'The sensors are malfunctioning' },
      { id: 'd', text: 'Temperature has increased significantly' }
    ],
    explanation: "Oil hydrocarbons spread across the water surface, disrupting the hydrogen bonds between water molecules that create surface tension. A ~62% drop in surface tension indicates significant oil contamination. This principle enables surface tension sensors to detect oil spills before they're visible to the eye."
  },
  {
    scenario: "A researcher places a needle flat on water and it floats. They then place the same needle vertically, point down.",
    question: "What happens when the needle is placed vertically and why?",
    options: [
      { id: 'a', text: 'It still floats - weight is the same' },
      { id: 'b', text: 'It sinks - vertical orientation minimizes contact perimeter, reducing surface tension force', correct: true },
      { id: 'c', text: 'It bounces back to horizontal' },
      { id: 'd', text: 'It floats deeper in the water' }
    ],
    explanation: "Surface tension force depends on contact perimeter (F = γ × L × sin(θ)). A horizontal needle maximizes contact length; a vertical needle minimizes it to just the point. With dramatically less contact perimeter, the surface tension force is insufficient to support the same weight."
  },
  {
    scenario: "Water at 20°C has surface tension of 0.0728 N/m. When heated to 80°C, surface tension drops to 0.0626 N/m.",
    question: "How does this temperature effect impact a floating paperclip?",
    options: [
      { id: 'a', text: 'The paperclip floats higher because warm water is less dense' },
      { id: 'b', text: 'The paperclip sits lower and may sink - reduced surface tension provides less support', correct: true },
      { id: 'c', text: 'Temperature has no effect on floating' },
      { id: 'd', text: 'The paperclip expands and becomes too big to float' }
    ],
    explanation: "Higher temperature increases molecular kinetic energy, weakening hydrogen bonds between water molecules. This reduces surface tension (about 14% drop from 20°C to 80°C). With less surface tension force available, objects that barely floated at cold temperatures may sink when water is heated."
  },
  {
    scenario: "A mosquito lays eggs in a raft formation that floats on still water in a backyard puddle.",
    question: "What surface tension principle allows mosquito egg rafts to float?",
    options: [
      { id: 'a', text: 'The eggs are filled with air' },
      { id: 'b', text: 'The raft shape distributes weight across maximum perimeter, and eggs are hydrophobic', correct: true },
      { id: 'c', text: 'Mosquito eggs are less dense than water' },
      { id: 'd', text: 'The eggs stick to floating debris' }
    ],
    explanation: "Mosquito eggs have a hydrophobic coating and are arranged in a raft formation that maximizes the contact perimeter while distributing the weight. Just like our paperclip, the eggs don't float by buoyancy (they're denser than water) but by surface tension support. This is why soap in standing water can help control mosquito populations."
  }
];

// ============================================================================
// PREMIUM SVG DEFINITIONS
// ============================================================================

const PremiumSVGDefs: React.FC = () => (
  <defs>
    {/* Water Surface Gradients */}
    <linearGradient id="clipWaterDepth" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
      <stop offset="15%" stopColor="#3b82f6" stopOpacity="0.95" />
      <stop offset="40%" stopColor="#2563eb" stopOpacity="1" />
      <stop offset="70%" stopColor="#1d4ed8" stopOpacity="1" />
      <stop offset="90%" stopColor="#1e40af" stopOpacity="1" />
      <stop offset="100%" stopColor="#1e3a8a" stopOpacity="1" />
    </linearGradient>

    <linearGradient id="clipWaterSurface" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.3" />
      <stop offset="25%" stopColor="#60a5fa" stopOpacity="0.6" />
      <stop offset="50%" stopColor="#bfdbfe" stopOpacity="0.8" />
      <stop offset="75%" stopColor="#60a5fa" stopOpacity="0.6" />
      <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.3" />
    </linearGradient>

    <linearGradient id="clipTensionMembrane" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.9" />
      <stop offset="30%" stopColor="#bae6fd" stopOpacity="0.7" />
      <stop offset="60%" stopColor="#7dd3fc" stopOpacity="0.5" />
      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.2" />
    </linearGradient>

    {/* Paperclip Metallic Gradients */}
    <linearGradient id="clipMetallic" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#e2e8f0" />
      <stop offset="20%" stopColor="#cbd5e1" />
      <stop offset="40%" stopColor="#94a3b8" />
      <stop offset="60%" stopColor="#cbd5e1" />
      <stop offset="80%" stopColor="#e2e8f0" />
      <stop offset="100%" stopColor="#94a3b8" />
    </linearGradient>

    <linearGradient id="clipHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
      <stop offset="30%" stopColor="#f1f5f9" stopOpacity="0.6" />
      <stop offset="70%" stopColor="#e2e8f0" stopOpacity="0.3" />
      <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.1" />
    </linearGradient>

    <linearGradient id="clipShadow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#64748b" stopOpacity="0.3" />
      <stop offset="50%" stopColor="#475569" stopOpacity="0.5" />
      <stop offset="100%" stopColor="#334155" stopOpacity="0.7" />
    </linearGradient>

    {/* Container Gradients */}
    <linearGradient id="clipContainerGlass" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#334155" stopOpacity="0.9" />
      <stop offset="25%" stopColor="#1e293b" stopOpacity="0.95" />
      <stop offset="50%" stopColor="#0f172a" stopOpacity="1" />
      <stop offset="75%" stopColor="#1e293b" stopOpacity="0.95" />
      <stop offset="100%" stopColor="#334155" stopOpacity="0.9" />
    </linearGradient>

    <linearGradient id="clipContainerRim" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#64748b" />
      <stop offset="50%" stopColor="#475569" />
      <stop offset="100%" stopColor="#334155" />
    </linearGradient>

    {/* Force Arrow Gradients */}
    <linearGradient id="clipForceWeight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#fca5a5" />
      <stop offset="50%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#dc2626" />
    </linearGradient>

    <linearGradient id="clipForceTension" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stopColor="#86efac" />
      <stop offset="50%" stopColor="#22c55e" />
      <stop offset="100%" stopColor="#16a34a" />
    </linearGradient>

    {/* Filters */}
    <filter id="clipWaterGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <filter id="clipMetalGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1.5" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <filter id="clipForceGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <filter id="clipDimpleShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feOffset dx="0" dy="3" result="offset" />
      <feMerge>
        <feMergeNode in="offset" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <filter id="clipRippleGlow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="1" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    {/* Arrow Markers */}
    <marker id="clipArrowRed" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
      <path d="M0,1 L8,4 L0,7 Z" fill="url(#clipForceWeight)" />
    </marker>
    <marker id="clipArrowGreen" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
      <path d="M0,1 L8,4 L0,7 Z" fill="url(#clipForceTension)" />
    </marker>

    {/* Patterns */}
    <pattern id="clipWaterPattern" width="20" height="20" patternUnits="userSpaceOnUse">
      <rect width="20" height="20" fill="none" />
      <circle cx="10" cy="10" r="0.5" fill="#93c5fd" opacity="0.2" />
    </pattern>
  </defs>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FloatingPaperclipRenderer({
  onGameEvent,
  gamePhase,
  phase: phaseProp,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer
}: FloatingPaperclipRendererProps) {
  // State for self-managed phase
  const [internalPhase, setInternalPhase] = useState<Phase>('hook');
  const phase = (phaseProp || gamePhase || internalPhase) as Phase;
  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Responsive typography
  const typo = {
    title: isMobile ? '28px' : '36px',
    heading: isMobile ? '20px' : '24px',
    bodyLarge: isMobile ? '16px' : '18px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '10px' : '12px',
    pagePadding: isMobile ? '16px' : '24px',
    cardPadding: isMobile ? '12px' : '16px',
    sectionGap: isMobile ? '16px' : '20px',
    elementGap: isMobile ? '8px' : '12px',
  };

  // State management
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Simulation state
  const [clipState, setClipState] = useState<'hovering' | 'floating' | 'sinking'>('hovering');
  const [clipY, setClipY] = useState(30);
  const [dropMethod, setDropMethod] = useState<'gentle' | 'dropped'>('gentle');
  const [dimpleDepth, setDimpleDepth] = useState(0);
  const [hasDropped, setHasDropped] = useState(false);

  // Interactive parameters for play phase
  const [surfaceTension, setSurfaceTension] = useState(0.072);
  const [clipWeight, setClipWeight] = useState(0.5);
  const [waterTemperature, setWaterTemperature] = useState(20);
  const [showForceVectors, setShowForceVectors] = useState(true);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Twist state
  const [soapAdded, setSoapAdded] = useState(false);
  const [twistClipY, setTwistClipY] = useState(60);
  const [twistClipState, setTwistClipState] = useState<'floating' | 'sinking' | 'sunk'>('floating');

  // Twist play interactive parameters
  const [soapAmount, setSoapAmount] = useState(0);
  const [selectedLiquid, setSelectedLiquid] = useState<'water' | 'oil' | 'alcohol'>('water');
  const [contactAngle, setContactAngle] = useState(20);

  // Sound system
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      const sounds = {
        click: { freq: 600, duration: 0.1, type: 'sine' as OscillatorType },
        success: { freq: 800, duration: 0.2, type: 'sine' as OscillatorType },
        failure: { freq: 300, duration: 0.3, type: 'sine' as OscillatorType },
        transition: { freq: 500, duration: 0.15, type: 'sine' as OscillatorType },
        complete: { freq: 900, duration: 0.4, type: 'sine' as OscillatorType }
      };
      const sound = sounds[type];
      oscillator.frequency.value = sound.freq;
      oscillator.type = sound.type;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + sound.duration);
    } catch { /* Audio not available */ }
  }, []);

  const goToPhase = useCallback((newPhase: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setTimeout(() => { navigationLockRef.current = false; }, 400);

    setInternalPhase(newPhase);
    onPhaseComplete?.();
    playSound('transition');

    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'floating-paperclip',
        gameTitle: 'Floating Paperclip',
        details: { phase: newPhase },
        timestamp: Date.now()
      });
    }
  }, [onPhaseComplete, playSound, onGameEvent]);

  // Animation for force vectors
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 60);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Drop the paperclip
  const dropClip = () => {
    if (hasDropped) return;
    setHasDropped(true);
    setClipState('floating');

    if (dropMethod === 'gentle') {
      let y = clipY;
      let dimple = 0;
      const interval = setInterval(() => {
        if (y < 95) {
          y += 2;
          setClipY(y);
        } else {
          dimple = Math.min(dimple + 0.5, 8);
          setDimpleDepth(dimple);
          if (dimple >= 8) {
            clearInterval(interval);
            playSound('success');
          }
        }
      }, 30);
    } else {
      setClipState('sinking');
      let y = clipY;
      const interval = setInterval(() => {
        y += 4;
        setClipY(Math.min(y, 180));
        if (y >= 180) {
          clearInterval(interval);
          playSound('failure');
        }
      }, 30);
    }
  };

  const resetSimulation = () => {
    setClipState('hovering');
    setClipY(30);
    setDimpleDepth(0);
    setHasDropped(false);
  };

  const resetTwist = () => {
    setSoapAdded(false);
    setTwistClipY(60);
    setTwistClipState('floating');
    setSoapAmount(0);
  };

  // Progress bar
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: 'rgba(15, 23, 42, 0.8)',
      zIndex: 100,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: 'linear-gradient(90deg, #3b82f6, #22c55e)',
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Bottom navigation bar
  const currentIndex = phaseOrder.indexOf(phase);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === phaseOrder.length - 1;
  const canGoNext = !isLast && phase !== 'test';

  const renderBottomBar = () => (
    <div style={{
      flexShrink: 0,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 20px',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      background: 'rgba(0,0,0,0.3)',
    }}>
      <button
        onClick={() => !isFirst && goToPhase(phaseOrder[currentIndex - 1])}
        style={{
          padding: '8px 20px',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'transparent',
          color: isFirst ? 'rgba(255,255,255,0.3)' : 'white',
          cursor: isFirst ? 'not-allowed' : 'pointer',
          opacity: isFirst ? 0.4 : 1,
          transition: 'all 0.3s ease',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif',
        }}
      >
        ← Back
      </button>
      <div style={{ display: 'flex', gap: '6px' }}>
        {phaseOrder.map((p, i) => (
          <div
            key={p}
            onClick={() => i <= currentIndex && goToPhase(p)}
            title={phaseLabels[p]}
            style={{
              width: p === phase ? '20px' : '10px',
              height: '10px',
              borderRadius: '5px',
              background: p === phase ? '#3b82f6' : i < currentIndex ? '#10b981' : 'rgba(255,255,255,0.2)',
              cursor: i <= currentIndex ? 'pointer' : 'default',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>
      <button
        onClick={() => canGoNext && goToPhase(phaseOrder[currentIndex + 1])}
        style={{
          padding: '8px 20px',
          borderRadius: '8px',
          border: 'none',
          background: canGoNext ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.1)',
          color: 'white',
          cursor: canGoNext ? 'pointer' : 'not-allowed',
          opacity: canGoNext ? 1 : 0.4,
          transition: 'all 0.3s ease',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif',
        }}
      >
        Next →
      </button>
    </div>
  );

  // Calculate effective surface tension
  const getEffectiveSurfaceTension = useCallback(() => {
    const tempFactor = 1 - (waterTemperature - 20) * 0.0015;
    const soapFactor = 1 - (soapAmount / 100) * 0.65;
    const baseGamma = liquidProperties[selectedLiquid]?.gamma || 0.072;
    return baseGamma * tempFactor * soapFactor;
  }, [waterTemperature, soapAmount, selectedLiquid]);

  // Calculate if paperclip floats
  const calculateFloatability = useCallback(() => {
    const gamma = getEffectiveSurfaceTension();
    const perimeter = 0.08;
    const theta = contactAngle * (Math.PI / 180);
    const surfaceForce = gamma * perimeter * Math.cos(theta);
    const weight = (clipWeight / 1000) * 9.81;
    return surfaceForce >= weight;
  }, [getEffectiveSurfaceTension, contactAngle, clipWeight]);

  const handlePrediction = (choice: string) => {
    setPrediction(choice);
    setShowPredictionFeedback(true);
    playSound(choice === predictions.initial.correct ? 'success' : 'failure');
  };

  const handleTwistPrediction = (choice: string) => {
    setTwistPrediction(choice);
    setShowTwistFeedback(true);
    playSound(choice === predictions.twist.correct ? 'success' : 'failure');
  };

  const handleTestAnswer = (questionIndex: number, answerIndex: number) => {
    if (!showTestResults) {
      setTestAnswers(prev => {
        const newAnswers = [...prev];
        newAnswers[questionIndex] = answerIndex;
        return newAnswers;
      });
      playSound('click');
    }
  };

  const handleAppComplete = (appIndex: number) => {
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
  };

  const calculateScore = () => testAnswers.reduce((score, answer, index) => {
    const question = testQuestions[index];
    const selectedOption = question.options[answer];
    return score + (selectedOption?.correct ? 1 : 0);
  }, 0);

  // ============================================================================
  // PREMIUM PAPERCLIP SVG
  // ============================================================================

  const renderPremiumPaperclip = (x: number, y: number, scale: number = 1) => (
    <g transform={`translate(${x}, ${y}) scale(${scale})`} filter="url(#clipMetalGlow)">
      <path
        d="M 7,7 L 7,17 Q 7,22 12,22 L 52,22 Q 57,22 57,17 L 57,7 Q 57,2 52,2 L 17,2 Q 12,2 12,7 L 12,14"
        fill="none"
        stroke="url(#clipShadow)"
        strokeWidth={4 + clipWeight * 0.5}
        strokeLinecap="round"
        opacity="0.4"
      />
      <path
        d="M 5,5 L 5,15 Q 5,20 10,20 L 50,20 Q 55,20 55,15 L 55,5 Q 55,0 50,0 L 15,0 Q 10,0 10,5 L 10,12"
        fill="none"
        stroke="url(#clipMetallic)"
        strokeWidth={3 + clipWeight * 0.5}
        strokeLinecap="round"
      />
      <path
        d="M 8,3 L 8,13 Q 8,17 12,17 L 48,17"
        fill="none"
        stroke="url(#clipHighlight)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path d="M 8,3 L 12,3" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
    </g>
  );

  // ============================================================================
  // PREMIUM WATER CONTAINER SVG
  // ============================================================================

  const renderPremiumWaterContainer = (
    clipYPos: number,
    currentDimpleDepth: number,
    currentClipState: 'hovering' | 'floating' | 'sinking',
    showForces: boolean,
    surfaceForceN: number,
    weightForceN: number,
    gamma: number,
    weight: number
  ) => (
    <svg viewBox="0 0 400 280" className="w-full h-64">
      <PremiumSVGDefs />

      {/* Container */}
      <rect x="50" y="100" width="300" height="150" rx="8" fill="url(#clipContainerGlass)" />
      <rect x="50" y="100" width="300" height="4" fill="url(#clipContainerRim)" />

      {/* Water body */}
      <rect x="55" y="105" width="290" height="140" rx="5" fill="url(#clipWaterDepth)" />
      <rect x="55" y="105" width="290" height="140" rx="5" fill="url(#clipWaterPattern)" />

      {/* Surface tension visualization when floating */}
      {currentClipState === 'floating' && (
        <>
          <path
            d={`M 55,105
                Q 120,105 ${170 - currentDimpleDepth * 2},${105 + currentDimpleDepth * 0.5}
                Q 200,${105 + currentDimpleDepth * 1.5} ${230 + currentDimpleDepth * 2},${105 + currentDimpleDepth * 0.5}
                Q 280,105 345,105`}
            fill="url(#clipTensionMembrane)"
            filter="url(#clipDimpleShadow)"
          />
          <path
            d={`M 55,105
                Q 120,105 ${170 - currentDimpleDepth * 2},${105 + currentDimpleDepth * 0.5}
                Q 200,${105 + currentDimpleDepth * 1.5} ${230 + currentDimpleDepth * 2},${105 + currentDimpleDepth * 0.5}
                Q 280,105 345,105`}
            fill="none"
            stroke="url(#clipWaterSurface)"
            strokeWidth="2"
            filter="url(#clipWaterGlow)"
          />
          <ellipse
            cx="200"
            cy="105"
            rx={50 + Math.sin(animationFrame * 0.2) * 5}
            ry={3 + Math.sin(animationFrame * 0.2) * 1}
            fill="none"
            stroke="#bfdbfe"
            strokeWidth="0.8"
            opacity={0.6 - (animationFrame % 30) / 60}
            filter="url(#clipRippleGlow)"
          />
        </>
      )}

      {/* Normal water surface when not floating */}
      {currentClipState !== 'floating' && (
        <ellipse cx="200" cy="105" rx="140" ry="5" fill="url(#clipWaterSurface)" opacity="0.6" />
      )}

      {/* Paperclip - using rect shapes */}
      <g transform={`translate(170, ${clipYPos})`} filter="url(#clipMetalGlow)">
        <rect x="0" y="0" width="60" height="5" rx="2" fill="url(#clipMetallic)" stroke="url(#clipShadow)" strokeWidth="1" />
        <rect x="0" y="8" width="60" height="5" rx="2" fill="url(#clipMetallic)" stroke="url(#clipShadow)" strokeWidth="1" />
        <rect x="0" y="0" width="5" height="13" rx="2" fill="url(#clipMetallic)" />
        <rect x="55" y="0" width="5" height="13" rx="2" fill="url(#clipMetallic)" />
        <rect x="2" y="1" width="30" height="2" rx="1" fill="url(#clipHighlight)" opacity="0.7" />
      </g>

      {/* Grid lines */}
      <g opacity="0.3">
        <line x1="55" y1="115" x2="345" y2="115" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="55" y1="135" x2="345" y2="135" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="55" y1="155" x2="345" y2="155" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="55" y1="175" x2="345" y2="175" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="130" y1="100" x2="130" y2="250" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="200" y1="100" x2="200" y2="250" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="270" y1="100" x2="270" y2="250" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4" />
      </g>
      {/* Axis labels */}
      <text x="30" y="130" fill="#94a3b8" fontSize="11" textAnchor="middle">Depth</text>
      <text x="200" y="270" fill="#94a3b8" fontSize="11" textAnchor="middle">Horizontal Position</text>
      {/* Labels */}
      <text x="200" y="95" textAnchor="middle" fill="#60a5fa" fontSize="12" fontWeight="bold">Water Surface</text>
      <text x="70" y="130" fill="#3b82f6" fontSize="11">Water</text>
      <text x="70" y="145" fill="#3b82f6" fontSize="11">(γ = {gamma.toFixed(3)} N/m)</text>
      <text x="200" y="25" textAnchor="middle" fill="#94a3b8" fontSize="11">Paperclip ({weight.toFixed(1)}g)</text>
      {currentClipState === 'floating' && (
        <>
          <text x="310" y="115" fill="#22c55e" fontSize="11">Surface Tension</text>
          <text x="310" y="127" fill="#22c55e" fontSize="11">Supporting</text>
        </>
      )}

      {/* Force Vectors */}
      {showForces && currentClipState === 'floating' && (
        <g>
          <line
            x1="200" y1={clipYPos + 25}
            x2="200" y2={clipYPos + 25 + weightForceN * 300}
            stroke="url(#clipForceWeight)"
            strokeWidth="4"
            markerEnd="url(#clipArrowRed)"
            filter="url(#clipForceGlow)"
          />
          <line
            x1="175" y1={clipYPos + 20}
            x2={175 - surfaceForceN * 200} y2={clipYPos + 20 - surfaceForceN * 300}
            stroke="url(#clipForceTension)"
            strokeWidth="3"
            markerEnd="url(#clipArrowGreen)"
            filter="url(#clipForceGlow)"
          />
          <line
            x1="225" y1={clipYPos + 20}
            x2={225 + surfaceForceN * 200} y2={clipYPos + 20 - surfaceForceN * 300}
            stroke="url(#clipForceTension)"
            strokeWidth="3"
            markerEnd="url(#clipArrowGreen)"
            filter="url(#clipForceGlow)"
          />
        </g>
      )}

      {/* Surface tension force curve - shows force distribution along perimeter */}
      <g>
        <path
          d="M 60 260 L 88 230 L 116 200 L 144 175 L 172 158 L 200 150 L 228 158 L 256 175 L 284 200 L 312 230 L 340 260"
          fill="none"
          stroke="#22c55e"
          strokeWidth="2"
          opacity="0.7"
        />
      </g>
    </svg>
  );

  // ============================================================================
  // RENDER PHASES
  // ============================================================================

  const renderHook = () => (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }} className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-blue-400 tracking-wide">SURFACE PHYSICS</span>
      </div>

      <h1 style={{ fontSize: typo.title, fontWeight: 700, marginBottom: '16px', color: '#f8fafc' }} className="mb-4 bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent">
        Steel That Floats?
      </h1>

      <p style={{ fontSize: typo.bodyLarge, fontWeight: 400, color: '#94a3b8' }} className="text-slate-400 max-w-md mb-10">
        Steel is 8 times denser than water. It should sink immediately... right?
      </p>

      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5 rounded-3xl" />

        <div className="relative">
          <svg viewBox="0 0 400 250" className="w-full h-56 mb-4">
            <PremiumSVGDefs />

            {/* Premium container */}
            <rect x="50" y="100" width="300" height="130" fill="url(#clipContainerGlass)" rx="8" />
            <rect x="50" y="100" width="300" height="4" fill="url(#clipContainerRim)" />

            {/* Premium water with depth */}
            <rect x="55" y="105" width="290" height="120" fill="url(#clipWaterDepth)" rx="5" />
            <rect x="55" y="105" width="290" height="120" fill="url(#clipWaterPattern)" rx="5" />

            {/* Surface tension line */}
            <ellipse cx="200" cy="105" rx="140" ry="5" fill="url(#clipWaterSurface)" filter="url(#clipWaterGlow)" />

            {/* Surface dimple effect */}
            <path
              d="M 55,105 Q 140,105 165,112 Q 200,118 235,112 Q 260,105 345,105"
              fill="url(#clipTensionMembrane)"
              opacity="0.8"
            />

            {renderPremiumPaperclip(170, 95, 1)}

            {/* Density comparison badges */}
            <g transform="translate(70, 175)">
              <rect x="0" y="0" width="70" height="24" fill="#1e293b" rx="6" stroke="#475569" strokeWidth="1" />
            </g>
            <g transform="translate(260, 175)">
              <rect x="0" y="0" width="70" height="24" fill="#1e3a5f" rx="6" stroke="#3b82f6" strokeWidth="1" />
            </g>
          </svg>

          <div className="flex justify-between px-8 -mt-2">
            <div className="text-center">
              <p style={{ fontSize: typo.small }} className="font-bold text-slate-300">Steel: 7850</p>
              <p style={{ fontSize: typo.label }} className="text-slate-500">kg/m3</p>
            </div>
            <div className="text-center">
              <p style={{ fontSize: typo.small }} className="font-bold text-blue-400">Water: 1000</p>
              <p style={{ fontSize: typo.label }} className="text-slate-500">kg/m3</p>
            </div>
          </div>

          <div className="flex justify-center gap-40 -mt-36 mb-28">
            <span style={{ fontSize: typo.heading }} className="text-amber-400 font-bold animate-pulse">?</span>
            <span style={{ fontSize: typo.heading }} className="text-amber-400 font-bold animate-pulse">?</span>
          </div>

          <p style={{ fontSize: typo.body }} className="text-center text-white font-semibold mt-2">
            A steel paperclip floating on water!
          </p>
        </div>
      </div>

      <button
        onClick={() => goToPhase('predict')}
        style={{
          zIndex: 10,
          marginTop: '40px',
          padding: '16px 40px',
          background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
          color: 'white',
          fontSize: '18px',
          fontWeight: 700,
          borderRadius: '16px',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          maxWidth: '600px',
        }}
      >
        Discover the Secret →
      </button>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 style={{ fontSize: typo.heading }} className="font-bold text-white mb-6">Make Your Prediction</h2>
      <p style={{ fontSize: typo.body }} className="text-slate-400 mb-4 text-center max-w-md">
        {predictions.initial.question}
      </p>

      {/* Static visualization */}
      <div className="mb-6">
        <svg width="300" height="200" viewBox="0 0 300 200">
          <PremiumSVGDefs />
          {/* Water container */}
          <rect x="50" y="100" width="200" height="80" fill="url(#clipWaterDepth)" stroke="url(#clipContainerRim)" strokeWidth="3" rx="4" />
          <rect x="50" y="100" width="200" height="5" fill="url(#clipWaterSurface)" opacity="0.8" />
          {/* Paperclip hovering */}
          <g transform="translate(150, 60)">
            <ellipse cx="0" cy="15" rx="12" ry="3" fill="#1e293b" opacity="0.3" />
            <path d="M -15,-5 Q -10,-15 0,-15 Q 10,-15 15,-5 L 15,5 Q 10,15 0,15 Q -10,15 -15,5 Z"
              fill="url(#clipMetallic)" stroke="url(#clipShadow)" strokeWidth="1" />
            <ellipse cx="-3" cy="-8" rx="4" ry="6" fill="url(#clipHighlight)" opacity="0.6" />
          </g>
          <text x="150" y="35" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">Steel Paperclip</text>
          <text x="150" y="115" textAnchor="middle" fill="#60a5fa" fontSize="12" fontWeight="bold">Water Surface</text>
          <text x="60" y="195" fill="#64748b" fontSize="10">Density: 7,850 kg/m³</text>
          <text x="200" y="195" fill="#3b82f6" fontSize="10">1,000 kg/m³</text>
        </svg>
      </div>

      <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
        {predictions.initial.options.map(opt => (
          <button
            key={opt.id}
            onClick={() => handlePrediction(opt.id)}
            disabled={showPredictionFeedback}
            style={{ zIndex: 10 }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              prediction === opt.id
                ? opt.id === predictions.initial.correct
                  ? 'border-emerald-500 bg-emerald-500/20'
                  : 'border-red-500 bg-red-500/20'
                : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
            } ${showPredictionFeedback && opt.id === predictions.initial.correct ? 'border-emerald-500 bg-emerald-500/20' : ''}`}
          >
            <span style={{ fontSize: typo.body }} className={prediction === opt.id ? (opt.id === predictions.initial.correct ? 'text-emerald-300' : 'text-red-300') : 'text-slate-300'}>
              {opt.id}. {opt.text}
            </span>
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div className={`p-4 rounded-xl max-w-md mb-4 ${prediction === predictions.initial.correct ? 'bg-emerald-500/20 border border-emerald-500' : 'bg-amber-500/20 border border-amber-500'}`}>
          <p style={{ fontSize: typo.body }} className={`font-semibold ${prediction === predictions.initial.correct ? 'text-emerald-400' : 'text-amber-400'}`}>
            {prediction === predictions.initial.correct ? 'Correct!' : 'Not quite!'}
          </p>
          <p style={{ fontSize: typo.small }} className="text-slate-300 mt-2">
            {predictions.initial.explanation}
          </p>
        </div>
      )}

      {showPredictionFeedback && (
        <button
          onClick={() => {
            goToPhase('play');
            if (prediction === predictions.initial.correct) onCorrectAnswer?.();
            else onIncorrectAnswer?.();
          }}
          style={{ zIndex: 10 }}
          className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
        >
          Test It Yourself!
        </button>
      )}
    </div>
  );

  const renderPlay = () => {
    const effectiveGamma = getEffectiveSurfaceTension();
    const willFloat = calculateFloatability();
    const perimeter = 0.08;
    const theta = contactAngle * (Math.PI / 180);
    const surfaceForceN = effectiveGamma * perimeter * Math.cos(theta);
    const weightForceN = (clipWeight / 1000) * 9.81;
    const forceRatio = surfaceForceN / weightForceN;
    const criticalPoint = forceRatio < 1;

    return (
      <div className="flex flex-col items-center p-6">
        <h2 style={{ fontSize: typo.heading }} className="font-bold text-white mb-4">Surface Tension Laboratory</h2>
        <p style={{ fontSize: typo.body }} className="text-slate-400 mb-2">Adjust parameters to explore surface tension physics</p>

        {/* Educational context */}
        <div style={{ background: 'rgba(23,37,84,0.3)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '12px', padding: '16px', marginBottom: '16px', maxWidth: '600px', width: '100%' }} className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-4 mb-4 max-w-xl">
          <p style={{ fontSize: typo.body }} className="text-blue-200 mb-2">
            <strong className="text-blue-100">What you're seeing:</strong> The visualization shows how surface tension creates an invisible "skin" on water that can support objects denser than water itself. The dimple in the water's surface shows the deformation that generates the upward force.
          </p>
          <p style={{ fontSize: typo.body }} className="text-blue-200 mb-2">
            <strong className="text-blue-100">How it works:</strong> When you decrease surface tension (by lowering the coefficient or increasing temperature), the water's "skin" weakens and can no longer support the paperclip's weight. Increasing the paperclip weight requires stronger surface tension to maintain balance.
          </p>
          <p style={{ fontSize: typo.body }} className="text-blue-200">
            <strong className="text-blue-100">Why this matters:</strong> Surface tension enables water striders to walk on water, drives microfluidic medical devices, controls inkjet printing precision, and helps detect oil spills through surface tension changes. Understanding this physics unlocks technologies from lab-on-chip diagnostics to environmental monitoring.
          </p>
        </div>

        {/* Side-by-side layout */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '20px',
          width: '100%',
          alignItems: isMobile ? 'center' : 'flex-start',
          maxWidth: '900px',
        }}>
        <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
        {/* Visualization */}
        <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full">
          {renderPremiumWaterContainer(clipY, dimpleDepth, clipState, showForceVectors, surfaceForceN, weightForceN, surfaceTension, clipWeight)}

          <div className="mt-2 space-y-2">
            {showForceVectors && clipState === 'floating' && (
              <div className="flex justify-between px-4">
                <p style={{ fontSize: typo.label }} className="text-emerald-400 font-semibold">F = {(surfaceForceN * 1000).toFixed(2)} mN</p>
                <p style={{ fontSize: typo.label }} className="text-red-400 font-semibold">W = {(weightForceN * 1000).toFixed(2)} mN</p>
              </div>
            )}

            {criticalPoint && !hasDropped && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-2 text-center">
                <p style={{ fontSize: typo.small }} className="text-red-400 font-bold">Will sink with these settings!</p>
              </div>
            )}

            {clipState === 'floating' && (
              <p style={{ fontSize: typo.body }} className="text-center text-emerald-400 font-bold">
                It floats! (Force ratio: {forceRatio.toFixed(2)})
              </p>
            )}
            {clipState === 'sinking' && clipY > 100 && (
              <p style={{ fontSize: typo.body }} className="text-center text-red-400 font-bold">
                It sinks! Surface tension insufficient
              </p>
            )}

            <div style={{ background: 'rgba(15,23,42,0.8)', borderRadius: '8px', padding: '8px', textAlign: 'center', border: '1px solid rgba(71,85,105,0.3)' }} className="bg-slate-900/80 rounded-lg p-2 text-center">
              <p style={{ fontSize: typo.label }} className="text-slate-400">
                F = gamma x L x cos(theta) = {effectiveGamma.toFixed(3)} x 0.08 x cos({contactAngle})
              </p>
              <p style={{ fontSize: typo.label }} className={`font-bold ${willFloat ? 'text-emerald-400' : 'text-red-400'}`}>
                = {(surfaceForceN * 1000).toFixed(2)} mN {willFloat ? '>=' : '<'} {(weightForceN * 1000).toFixed(2)} mN (Weight)
              </p>
            </div>
          </div>
        </div>
        </div>

        <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
        {/* Interactive Controls */}
        <div className="bg-slate-800/60 rounded-2xl p-4 mb-4 w-full border border-slate-700/50">
          <h3 style={{ fontSize: typo.small }} className="font-semibold text-blue-400 mb-3">Experiment Controls</h3>

          {/* Surface Tension Slider */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <label style={{ fontSize: typo.label }} className="text-slate-400">Surface Tension</label>
              <span style={{ fontSize: typo.label }} className="font-mono text-blue-300">{surfaceTension.toFixed(3)} N/m</span>
            </div>
            <input
              type="range"
              min="0.02"
              max="0.08"
              step="0.001"
              value={surfaceTension}
              onChange={(e) => setSurfaceTension(parseFloat(e.target.value))}
              style={{ touchAction: 'pan-y', height: '20px', width: '100%', WebkitAppearance: 'none', accentColor: '#3b82f6', cursor: 'pointer' }}
            />
            <div className="flex justify-between mt-1">
              <span style={{ fontSize: typo.label }} className="text-slate-500">0.02</span>
              <span style={{ fontSize: typo.label }} className="text-slate-500">0.072</span>
            </div>
          </div>

          {/* Paperclip Weight Slider */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <label style={{ fontSize: typo.label }} className="text-slate-400">Clip Weight</label>
              <span style={{ fontSize: typo.label }} className="font-mono text-cyan-300">{clipWeight.toFixed(2)} g</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.0"
              step="0.1"
              value={clipWeight}
              onChange={(e) => setClipWeight(parseFloat(e.target.value))}
              style={{ touchAction: 'pan-y', height: '20px', width: '100%', WebkitAppearance: 'none', accentColor: '#3b82f6', cursor: 'pointer' }}
            />
          </div>

          {/* Temperature Slider */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <label style={{ fontSize: typo.label }} className="text-slate-400">Temperature</label>
              <span style={{ fontSize: typo.label }} className="font-mono text-amber-300">{waterTemperature}C</span>
            </div>
            <input
              type="range"
              min="5"
              max="80"
              step="1"
              value={waterTemperature}
              onChange={(e) => setWaterTemperature(parseInt(e.target.value))}
              style={{ touchAction: 'pan-y', height: '20px', width: '100%', WebkitAppearance: 'none', accentColor: '#3b82f6', cursor: 'pointer' }}
            />
          </div>

          <button
            onClick={() => setShowForceVectors(!showForceVectors)}
            style={{ zIndex: 10 }}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              showForceVectors ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
            }`}
          >
            {showForceVectors ? 'Hide Vectors' : 'Show Vectors'}
          </button>
        </div>
        </div>
        </div>

        {/* Drop Method Selection */}
        {!hasDropped && (
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setDropMethod('gentle')}
              style={{ zIndex: 10 }}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                dropMethod === 'gentle' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              Gentle Place
            </button>
            <button
              onClick={() => setDropMethod('dropped')}
              style={{ zIndex: 10 }}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                dropMethod === 'dropped' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              Drop It
            </button>
          </div>
        )}

        <div className="flex gap-3 mb-4">
          {!hasDropped ? (
            <button
              onClick={() => dropClip()}
              style={{ zIndex: 10 }}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
            >
              {dropMethod === 'gentle' ? 'Place Gently' : 'Drop!'}
            </button>
          ) : (
            <button
              onClick={() => resetSimulation()}
              style={{ zIndex: 10 }}
              className="px-6 py-3 bg-slate-700 text-white font-semibold rounded-xl"
            >
              Reset
            </button>
          )}
        </div>

        {hasDropped && (clipState === 'floating' || clipY > 150) && (
          <button
            onClick={() => goToPhase('review')}
            style={{ zIndex: 10 }}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
          >
            Learn the Physics
          </button>
        )}
      </div>
    );
  };

  const renderReview = () => (
    <div style={{ maxWidth: '600px', margin: '0 auto' }} className="flex flex-col items-center p-6">
      <h2 style={{ fontSize: typo.heading, fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>The Physics of Surface Support</h2>

      <div style={{ background: 'rgba(30,58,138,0.3)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '12px', padding: '16px', marginBottom: '16px', width: '100%' }}>
        <p style={{ fontSize: typo.body, color: '#bfdbfe' }}>
          {prediction && prediction === predictions.initial.correct
            ? '✓ You predicted correctly! As you saw, the paperclip floats because surface tension creates an invisible "skin" strong enough to support it.'
            : prediction
              ? `You predicted "${predictions.initial.options.find(o => o.id === prediction)?.text}", but as you observed, surface tension actually creates enough upward force to support the paperclip despite steel being 8 times denser than water.`
              : 'As you observed in the experiment, surface tension creates an invisible "skin" that can support the paperclip despite steel being 8x denser than water. You may have noticed how gently placing it is key.'}
        </p>
      </div>

      <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-6 max-w-xl mb-6">
        <h3 style={{ fontSize: typo.bodyLarge }} className="font-bold text-blue-400 mb-4">Why Does It Float?</h3>
        <p style={{ fontSize: typo.body }} className="text-slate-300 mb-4">
          The paperclip floats because water molecules create hydrogen bonds that form an invisible "skin" on the surface. When the paperclip is gently placed, this membrane deforms and creates an upward force along the contact perimeter. This force is strong enough to balance the weight because the paperclip distributes its weight across a large perimeter relative to its mass.
        </p>

        <svg viewBox="0 0 300 140" className="w-full h-32 mb-4">
          <PremiumSVGDefs />

          <rect x="20" y="70" width="260" height="60" fill="url(#clipWaterDepth)" opacity="0.5" rx="4" />
          <path d="M 20,70 Q 100,70 150,85 Q 200,70 280,70" fill="url(#clipTensionMembrane)" opacity="0.7" />
          <path d="M 20,70 Q 100,70 150,85 Q 200,70 280,70" fill="none" stroke="url(#clipWaterSurface)" strokeWidth="2" filter="url(#clipWaterGlow)" />

          <g transform="translate(125, 72)">
            <rect x="0" y="0" width="50" height="8" fill="url(#clipMetallic)" rx="2" filter="url(#clipMetalGlow)" />
          </g>

          <line x1="150" y1="95" x2="150" y2="120" stroke="url(#clipForceWeight)" strokeWidth="4" markerEnd="url(#clipArrowRed)" filter="url(#clipForceGlow)" />
          <line x1="125" y1="80" x2="95" y2="60" stroke="url(#clipForceTension)" strokeWidth="3" markerEnd="url(#clipArrowGreen)" filter="url(#clipForceGlow)" />
          <line x1="175" y1="80" x2="205" y2="60" stroke="url(#clipForceTension)" strokeWidth="3" markerEnd="url(#clipArrowGreen)" filter="url(#clipForceGlow)" />
        </svg>

        <div className="flex justify-between px-8 mb-4">
          <p style={{ fontSize: typo.label }} className="text-emerald-400 font-semibold">F = gamma x L x sin(theta)</p>
          <p style={{ fontSize: typo.label }} className="text-red-400 font-semibold">W (Weight)</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-3 mb-3">
          <p style={{ fontSize: typo.body }} className="text-center font-bold text-blue-400">F_vertical = gamma x L x sin(theta)</p>
          <p style={{ fontSize: typo.label }} className="text-center text-slate-400 mt-1">gamma = surface tension, L = perimeter, theta = contact angle</p>
        </div>

        <p style={{ fontSize: typo.small }} className="text-slate-300">
          When F_vertical &gt;= Weight, the object floats! The surface tension creates an upward force along the entire contact perimeter.
        </p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 max-w-xl mb-6">
        <h4 style={{ fontSize: typo.body }} className="font-bold text-amber-400 mb-2">Why Dropping Fails</h4>
        <p style={{ fontSize: typo.small }} className="text-slate-300">
          When dropped, the paperclip hits with enough momentum to <strong>punch through</strong> the surface tension barrier before it can deform and support the weight.
        </p>
      </div>

      <button
        onClick={() => goToPhase('twist_predict')}
        style={{ zIndex: 10 }}
        className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
      >
        Try a Twist!
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 style={{ fontSize: typo.heading }} className="font-bold text-amber-400 mb-6">The Soap Test</h2>
      <p style={{ fontSize: typo.body }} className="text-slate-400 mb-4 text-center max-w-md">
        {predictions.twist.question}
      </p>

      {/* Static visualization showing floating paperclip with soap droplet */}
      <div className="mb-6">
        <svg width="320" height="200" viewBox="0 0 320 200">
          <PremiumSVGDefs />
          {/* Water container */}
          <rect x="60" y="80" width="200" height="100" fill="url(#clipWaterDepth)" stroke="url(#clipContainerRim)" strokeWidth="3" rx="4" />
          <rect x="60" y="80" width="200" height="4" fill="url(#clipWaterSurface)" opacity="0.8" />
          {/* Floating paperclip - rect based */}
          <g transform="translate(115, 68)">
            <rect x="0" y="0" width="30" height="4" rx="2" fill="url(#clipMetallic)" stroke="url(#clipShadow)" strokeWidth="1" />
            <rect x="0" y="6" width="30" height="4" rx="2" fill="url(#clipMetallic)" stroke="url(#clipShadow)" strokeWidth="1" />
            <rect x="0" y="0" width="4" height="10" rx="2" fill="url(#clipMetallic)" />
            <rect x="26" y="0" width="4" height="10" rx="2" fill="url(#clipMetallic)" />
          </g>
          {/* Soap droplet */}
          <g transform="translate(220, 50)">
            <circle cx="0" cy="0" r="12" fill="#a855f7" opacity="0.6" />
            <circle cx="-3" cy="-3" r="4" fill="#e0e7ff" opacity="0.8" />
            <text x="0" y="30" textAnchor="middle" fill="#a855f7" fontSize="11" fontWeight="bold">Soap</text>
          </g>
          <text x="130" y="60" textAnchor="middle" fill="#94a3b8" fontSize="11">Paperclip Floating</text>
          <text x="160" y="95" textAnchor="middle" fill="#60a5fa" fontSize="11" fontWeight="bold">Water</text>
          <path d="M 220,60 Q 200,70 180,75" stroke="#a855f7" strokeWidth="2" strokeDasharray="3,3" fill="none" markerEnd="url(#clipArrowRed)" />
        </svg>
      </div>

      <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
        {predictions.twist.options.map(opt => (
          <button
            key={opt.id}
            onClick={() => handleTwistPrediction(opt.id)}
            disabled={showTwistFeedback}
            style={{ zIndex: 10 }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              twistPrediction === opt.id
                ? opt.id === predictions.twist.correct
                  ? 'border-emerald-500 bg-emerald-500/20'
                  : 'border-red-500 bg-red-500/20'
                : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
            } ${showTwistFeedback && opt.id === predictions.twist.correct ? 'border-emerald-500 bg-emerald-500/20' : ''}`}
          >
            <span style={{ fontSize: typo.body }} className={twistPrediction === opt.id ? (opt.id === predictions.twist.correct ? 'text-emerald-300' : 'text-red-300') : 'text-slate-300'}>
              {opt.id}. {opt.text}
            </span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className={`p-4 rounded-xl max-w-md mb-4 ${twistPrediction === predictions.twist.correct ? 'bg-emerald-500/20 border border-emerald-500' : 'bg-amber-500/20 border border-amber-500'}`}>
          <p style={{ fontSize: typo.body }} className={`font-semibold ${twistPrediction === predictions.twist.correct ? 'text-emerald-400' : 'text-amber-400'}`}>
            {twistPrediction === predictions.twist.correct ? 'Correct!' : 'Not quite!'}
          </p>
          <p style={{ fontSize: typo.small }} className="text-slate-300 mt-2">
            {predictions.twist.explanation}
          </p>
        </div>
      )}

      {showTwistFeedback && (
        <button
          onClick={() => {
            goToPhase('twist_play');
            if (twistPrediction === predictions.twist.correct) onCorrectAnswer?.();
            else onIncorrectAnswer?.();
          }}
          style={{ zIndex: 10 }}
          className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
        >
          See It Happen!
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => {
    const twistEffectiveGamma = liquidProperties[selectedLiquid].gamma * (1 - soapAmount / 100 * 0.65);
    const twistWillFloat = twistEffectiveGamma * 0.08 * Math.cos(contactAngle * Math.PI / 180) >= (clipWeight / 1000) * 9.81;
    const liquidColor = liquidProperties[selectedLiquid].color;

    return (
      <div className="flex flex-col items-center p-6">
        <h2 style={{ fontSize: typo.heading }} className="font-bold text-amber-400 mb-4">Surface Tension Laboratory</h2>
        <p style={{ fontSize: typo.body }} className="text-slate-400 mb-4">Explore how soap and different liquids affect surface tension</p>

        {/* Side-by-side layout */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '20px',
          width: '100%',
          alignItems: isMobile ? 'center' : 'flex-start',
          maxWidth: '900px',
        }}>
        <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
        {/* Visualization */}
        <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full">
          <svg viewBox="0 0 400 280" className="w-full h-60">
            <PremiumSVGDefs />

            <defs>
              <linearGradient id="clipDynamicLiquid" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={liquidColor} stopOpacity="0.7" />
                <stop offset="50%" stopColor={liquidColor} stopOpacity="0.9" />
                <stop offset="100%" stopColor={liquidColor} stopOpacity="1" />
              </linearGradient>
            </defs>

            <rect x="50" y="80" width="300" height="160" fill="url(#clipContainerGlass)" rx="8" />
            <rect x="50" y="80" width="300" height="4" fill="url(#clipContainerRim)" />

            <rect
              x="55"
              y="85"
              width="290"
              height="150"
              fill={soapAmount > 0 ? `${liquidColor}88` : "url(#clipDynamicLiquid)"}
              style={{ transition: 'fill 0.5s' }}
              rx="5"
            />

            {twistClipState === 'floating' && (
              <path
                d={`M 55,85 Q 140,85 ${180 - 20},${85 + 55} Q 200,${85 + 80} ${220 + 20},${85 + 55} Q 260,85 345,85`}
                fill="url(#clipTensionMembrane)"
              />
            )}

            {/* Soap bubbles */}
            {soapAmount > 0 && (
              <g>
                {Array.from({ length: Math.floor(soapAmount / 20) }).map((_, i) => (
                  <circle
                    key={i}
                    cx={100 + i * 60 + Math.sin(animationFrame * 0.1 + i) * 10}
                    cy={150 + Math.cos(animationFrame * 0.15 + i * 2) * 20}
                    r={3 + i}
                    fill="white"
                    opacity={0.2 + (i * 0.1)}
                  />
                ))}
              </g>
            )}

            {/* Paperclip in twist_play - rect based */}
            <g transform={`translate(170, ${twistClipY})`}>
              <rect x="0" y="0" width="60" height="5" rx="2" fill="url(#clipMetallic)" stroke="url(#clipShadow)" strokeWidth="1" />
              <rect x="0" y="8" width="60" height="5" rx="2" fill="url(#clipMetallic)" stroke="url(#clipShadow)" strokeWidth="1" />
              <rect x="0" y="0" width="5" height="13" rx="2" fill="url(#clipMetallic)" />
              <rect x="55" y="0" width="5" height="13" rx="2" fill="url(#clipMetallic)" />
            </g>

            {/* Contact angle indicator */}
            <g>
              <text x="200" y="255" textAnchor="middle" fill="#f59e0b" fontSize="11">
                Contact Angle: {contactAngle}
              </text>
              <line
                x1="200" y1="240"
                x2={200 + Math.cos((contactAngle - 90) * Math.PI / 180) * 30}
                y2={240 + Math.sin((contactAngle - 90) * Math.PI / 180) * 30}
                stroke="#f59e0b"
                strokeWidth="2"
                opacity="0.8"
              />
              <text x="200" y="270" textAnchor="middle" fill="#94a3b8" fontSize="11">
                gamma = {twistEffectiveGamma.toFixed(3)} N/m
              </text>
            </g>
          </svg>

          <div className="mt-2 space-y-2">
            {twistClipState === 'sunk' && (
              <p style={{ fontSize: typo.body }} className="text-center text-red-400 font-bold">
                SUNK! Surface tension broken by soap
              </p>
            )}
            {twistClipState === 'floating' && (
              <p style={{ fontSize: typo.body }} className="text-center text-emerald-400 font-semibold">
                Floating on {liquidProperties[selectedLiquid].name}
              </p>
            )}

            <div className="bg-slate-900/80 rounded-lg p-2 text-center">
              <p style={{ fontSize: typo.label }} className="text-slate-400">
                Effective gamma = {twistEffectiveGamma.toFixed(3)} N/m (Soap reduces by {(soapAmount * 0.65).toFixed(0)}%)
              </p>
            </div>
          </div>
        </div>
        </div>

        <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
        {/* Interactive Controls */}
        <div className="bg-slate-800/60 rounded-2xl p-4 mb-4 w-full border border-amber-500/30">
          <h3 style={{ fontSize: typo.small }} className="font-semibold text-amber-400 mb-3">Experiment Variables</h3>

          {/* Soap Slider */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <label style={{ fontSize: typo.label }} className="text-slate-400">Soap Amount</label>
              <span style={{ fontSize: typo.label }} className="font-mono text-purple-300">{soapAmount}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={soapAmount}
              onChange={(e) => {
                const newAmount = parseInt(e.target.value);
                setSoapAmount(newAmount);
                if (newAmount > 30 && twistClipState === 'floating') {
                  setSoapAdded(true);
                  setTwistClipState('sinking');
                  playSound('click');
                  let y = twistClipY;
                  const interval = setInterval(() => {
                    y += 3;
                    setTwistClipY(Math.min(y, 180));
                    if (y >= 180) {
                      clearInterval(interval);
                      setTwistClipState('sunk');
                      playSound('failure');
                    }
                  }, 40);
                }
              }}
              style={{ touchAction: 'pan-y', height: '20px', width: '100%', WebkitAppearance: 'none', accentColor: '#3b82f6', cursor: 'pointer' }}
            />
            <p style={{ fontSize: typo.label }} className="text-purple-400 mt-1">
              Effective gamma: {twistEffectiveGamma.toFixed(3)} N/m ({((1 - twistEffectiveGamma / liquidProperties[selectedLiquid].gamma) * 100).toFixed(0)}% reduction)
            </p>
          </div>

          {/* Liquid Selection */}
          <div className="mb-4">
            <label style={{ fontSize: typo.label }} className="text-slate-400 block mb-2">Compare Different Liquids</label>
            <div className="flex gap-2">
              {(Object.keys(liquidProperties) as Array<'water' | 'oil' | 'alcohol'>).map((liquid) => (
                <button
                  key={liquid}
                  onClick={() => {
                    setSelectedLiquid(liquid);
                    resetTwist();
                  }}
                  style={{ zIndex: 10 }}
                  className={`px-3 py-2 rounded-lg font-medium transition-all flex flex-col items-center ${
                    selectedLiquid === liquid
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <span style={{ fontSize: typo.label }} className="capitalize">{liquidProperties[liquid].name}</span>
                  <span style={{ fontSize: typo.label }} className="opacity-70">gamma = {liquidProperties[liquid].gamma}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Contact Angle Slider */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <label style={{ fontSize: typo.label }} className="text-slate-400">Contact Angle (theta)</label>
              <span style={{ fontSize: typo.label }} className="font-mono text-amber-300">{contactAngle} deg</span>
            </div>
            <input
              type="range"
              min="0"
              max="90"
              step="5"
              value={contactAngle}
              onChange={(e) => setContactAngle(parseInt(e.target.value))}
              style={{ touchAction: 'pan-y', height: '20px', width: '100%', WebkitAppearance: 'none', accentColor: '#3b82f6', cursor: 'pointer' }}
            />
          </div>

          {/* Float Prediction */}
          <div className={`p-2 rounded-lg text-center ${twistWillFloat ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
            <p style={{ fontSize: typo.small }} className={`font-semibold ${twistWillFloat ? 'text-emerald-400' : 'text-red-400'}`}>
              {twistWillFloat ? 'Paperclip WILL float' : 'Paperclip WILL SINK'}
            </p>
          </div>
        </div>
        </div>
        </div>

        <div className="flex gap-3 mb-4">
          <button
            onClick={() => resetTwist()}
            style={{ zIndex: 10 }}
            className="px-6 py-2 bg-slate-700 text-white font-semibold rounded-xl hover:bg-slate-600 transition-all"
          >
            Reset
          </button>
        </div>

        {twistClipState === 'sunk' && (
          <button
            onClick={() => goToPhase('twist_review')}
            style={{ zIndex: 10 }}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
          >
            Understand Why
          </button>
        )}
      </div>
    );
  };

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 style={{ fontSize: typo.heading }} className="font-bold text-amber-400 mb-6">Surfactants: Breaking the Surface</h2>

      <div className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 rounded-2xl p-6 max-w-xl mb-6">
        <h3 style={{ fontSize: typo.bodyLarge }} className="font-bold text-amber-400 mb-4">Before vs After Soap</h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-emerald-500/20 rounded-lg p-3 text-center">
            <p style={{ fontSize: typo.body }} className="font-bold text-emerald-400">Clean Water</p>
            <p style={{ fontSize: typo.heading }} className="font-bold text-emerald-300">gamma = 0.072 N/m</p>
            <p style={{ fontSize: typo.label }} className="text-emerald-300">Strong surface tension</p>
          </div>
          <div className="bg-red-500/20 rounded-lg p-3 text-center">
            <p style={{ fontSize: typo.body }} className="font-bold text-red-400">Soapy Water</p>
            <p style={{ fontSize: typo.heading }} className="font-bold text-red-300">gamma ~ 0.025 N/m</p>
            <p style={{ fontSize: typo.label }} className="text-red-300">~65% reduction!</p>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-4 mb-4">
          <h4 style={{ fontSize: typo.body }} className="font-bold text-white mb-2">How Soap Works</h4>
          <p style={{ fontSize: typo.small }} className="text-slate-300">
            Soap molecules are <strong>surfactants</strong> - they have a hydrophilic (water-loving) head and hydrophobic (water-fearing) tail. These molecules insert themselves between water molecules, disrupting the hydrogen bond network that creates surface tension.
          </p>
        </div>

        <div className="bg-slate-800 rounded-lg p-3">
          <p style={{ fontSize: typo.body }} className="text-center text-red-400">gamma_soap x L x sin(theta) &lt; Weight</p>
          <p style={{ fontSize: typo.label }} className="text-center text-slate-400 mt-1">Surface tension force can no longer support the clip</p>
        </div>
      </div>

      <button
        onClick={() => goToPhase('transfer')}
        style={{ zIndex: 10 }}
        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
      >
        See Real-World Applications
      </button>
    </div>
  );

  const renderTransfer = () => {
    const currentApp = realWorldApps[activeAppTab];

    return (
      <div className="flex flex-col items-center p-6">
        <h2 style={{ fontSize: typo.heading }} className="font-bold text-white mb-2">Surface Tension in the Real World</h2>
        <p style={{ fontSize: typo.body }} className="text-slate-400 mb-6 text-center">Explore all 4 applications to unlock the test</p>

        {/* Scrollable container for applications */}
        <div style={{ maxHeight: '70vh', overflowY: 'auto', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: '12px' }}>
        {/* App tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', justifyContent: 'center', borderRadius: '8px' }} className="flex gap-2 mb-6 flex-wrap justify-center">
          {realWorldApps.map((app, index) => (
            <button
              key={index}
              onClick={() => setActiveAppTab(index)}
              style={{ zIndex: 10 }}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeAppTab === index ? 'bg-blue-600 text-white'
                : completedApps.has(index) ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {app.icon} {app.title.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* App Card */}
        <div style={{ borderRadius: '16px', padding: '24px', maxWidth: '672px', width: '100%', background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(71,85,105,0.5)' }} className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full border border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{currentApp.icon}</span>
            <div>
              <h3 style={{ fontSize: typo.bodyLarge }} className="font-bold text-white">{currentApp.title}</h3>
              <p style={{ fontSize: typo.small }} className="text-slate-400">{currentApp.tagline}</p>
            </div>
          </div>

          <p style={{ fontSize: typo.body }} className="text-slate-300 mb-4">{currentApp.description}</p>

          <div className="bg-blue-900/30 rounded-lg p-4 mb-4 border border-blue-700/30">
            <h4 style={{ fontSize: typo.small }} className="font-bold text-blue-400 mb-2">Connection to Surface Tension</h4>
            <p style={{ fontSize: typo.small }} className="text-slate-300">{currentApp.connection}</p>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
            <h4 style={{ fontSize: typo.small }} className="font-bold text-cyan-400 mb-2">How It Works</h4>
            <p style={{ fontSize: typo.small }} className="text-slate-300">{currentApp.howItWorks}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {currentApp.stats.map((stat, i) => (
              <div key={i} className="bg-slate-900/50 rounded-lg p-3 text-center">
                <p style={{ fontSize: typo.bodyLarge, color: currentApp.color }} className="font-bold">{stat.value}</p>
                <p style={{ fontSize: typo.label }} className="text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Examples */}
          <div className="mb-4">
            <h4 style={{ fontSize: typo.small }} className="font-bold text-white mb-2">Real-World Examples</h4>
            <ul className="space-y-1">
              {currentApp.examples.map((example, i) => (
                <li key={i} style={{ fontSize: typo.small }} className="text-slate-400 flex items-start gap-2">
                  <span className="text-emerald-400">-</span> {example}
                </li>
              ))}
            </ul>
          </div>

          {/* Companies */}
          <div className="mb-4">
            <h4 style={{ fontSize: typo.small }} className="font-bold text-white mb-2">Key Players</h4>
            <div className="flex flex-wrap gap-2">
              {currentApp.companies.map((company, i) => (
                <span key={i} style={{ fontSize: typo.label }} className="px-2 py-1 bg-slate-700 rounded text-slate-300">{company}</span>
              ))}
            </div>
          </div>

          {/* Future Impact */}
          <div className="bg-emerald-900/20 rounded-lg p-3 border border-emerald-700/30 mb-4">
            <h4 style={{ fontSize: typo.small }} className="font-bold text-emerald-400 mb-1">Future Impact</h4>
            <p style={{ fontSize: typo.small }} className="text-slate-300">{currentApp.futureImpact}</p>
          </div>

          {!completedApps.has(activeAppTab) ? (
            <button
              onClick={() => handleAppComplete(activeAppTab)}
              style={{ zIndex: 10 }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium"
            >
              Mark as Understood
            </button>
          ) : (
            <button
              onClick={() => {
                if (activeAppTab < realWorldApps.length - 1) {
                  setActiveAppTab(activeAppTab + 1);
                }
              }}
              style={{ zIndex: 10 }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium"
            >
              {activeAppTab < realWorldApps.length - 1 ? 'Next Application' : 'All Complete!'}
            </button>
          )}
        </div>
        </div>

        {/* Progress */}
        <div className="mt-6 flex items-center gap-2">
          <span className="text-slate-400">Progress:</span>
          <div className="flex gap-1">
            {realWorldApps.map((_, i) => (
              <div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`} />
            ))}
          </div>
          <span className="text-slate-400">{completedApps.size}/4</span>
        </div>

        {completedApps.size >= 4 && (
          <button
            onClick={() => goToPhase('test')}
            style={{ zIndex: 10 }}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
          >
            Take the Knowledge Test
          </button>
        )}
      </div>
    );
  };

  const renderTest = () => {
    const score = calculateScore();

    if (showTestResults) {
      return (
        <div className="flex flex-col items-center p-6">
          <div className="text-6xl mb-4">{score >= 7 ? '🏆' : '📚'}</div>
          <h2 style={{ fontSize: typo.title }} className="font-bold text-white mb-2">Score: {score}/{testQuestions.length}</h2>
          <p style={{ fontSize: typo.body }} className="text-slate-400 mb-6">
            {score >= 7 ? 'Excellent! You\'ve mastered surface tension!' : 'Keep studying! Review and try again.'}
          </p>

          {/* Show answers with explanations */}
          <div className="space-y-4 max-w-2xl w-full max-h-[50vh] overflow-y-auto mb-6">
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = q.options[userAnswer]?.correct;
              return (
                <div key={qIndex} className={`bg-slate-800/50 rounded-xl p-4 border ${isCorrect ? 'border-emerald-500/50' : 'border-red-500/50'}`}>
                  <p style={{ fontSize: typo.small }} className="text-slate-400 mb-2">{q.scenario}</p>
                  <p style={{ fontSize: typo.body }} className="font-semibold text-white mb-2">{qIndex + 1}. {q.question}</p>
                  <p style={{ fontSize: typo.small }} className={`mb-2 ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                    Your answer: {q.options[userAnswer]?.text || 'None'} {isCorrect ? '(Correct!)' : '(Incorrect)'}
                  </p>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p style={{ fontSize: typo.small }} className="text-slate-300">{q.explanation}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {score >= 7 ? (
            <button
              onClick={() => {
                goToPhase('mastery');
                onCorrectAnswer?.();
              }}
              style={{ zIndex: 10 }}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
            >
              Claim Your Mastery Badge
            </button>
          ) : (
            <button
              onClick={() => {
                setShowTestResults(false);
                setTestAnswers(Array(10).fill(-1));
                goToPhase('review');
                onIncorrectAnswer?.();
              }}
              style={{ zIndex: 10 }}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
            >
              Review and Try Again
            </button>
          )}
        </div>
      );
    }

    return (
      <div style={{ maxWidth: '700px', margin: '0 auto' }} className="flex flex-col items-center p-6">
        <h2 style={{ fontSize: typo.heading, fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>Surface Tension Knowledge Test</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <p style={{ fontSize: typo.body, color: '#94a3b8' }}>Question 1 of 10</p>
          <div className="flex gap-1">
            {testQuestions.map((_, i) => (
              <div
                key={i}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  background: testAnswers[i] !== -1 ? '#2563eb' : 'rgba(71,85,105,0.8)',
                  color: testAnswers[i] !== -1 ? 'white' : '#94a3b8',
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>
          <p style={{ fontSize: typo.body, color: '#60a5fa', fontWeight: 600 }}>
            {testAnswers.filter(a => a !== -1).length} of 10 answered
          </p>
        </div>

        <div className="space-y-4 max-w-2xl w-full max-h-[60vh] overflow-y-auto mb-4">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <p style={{ fontSize: typo.small }} className="text-slate-500 mb-2 italic">{q.scenario}</p>
              <p style={{ fontSize: typo.body }} className="font-semibold text-white mb-3">{qIndex + 1}. {q.question}</p>
              <div className="grid gap-2">
                {q.options.map((opt, oIndex) => (
                  <button
                    key={oIndex}
                    onClick={() => handleTestAnswer(qIndex, oIndex)}
                    style={{
                      zIndex: 10,
                      padding: '12px',
                      borderRadius: '8px',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      border: testAnswers[qIndex] === oIndex ? '2px solid #3b82f6' : '2px solid rgba(71,85,105,0.5)',
                      background: testAnswers[qIndex] === oIndex ? 'rgba(37,99,235,0.8)' : 'rgba(51,65,85,0.5)',
                      color: testAnswers[qIndex] === oIndex ? 'white' : '#cbd5e1',
                      cursor: 'pointer',
                      fontWeight: testAnswers[qIndex] === oIndex ? 600 : 400,
                    }}
                  >
                    <span style={{ fontSize: typo.small }}>
                      {testAnswers[qIndex] === oIndex && '✓ '}
                      {opt.id.toUpperCase()}. {opt.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            setShowTestResults(true);
            playSound('complete');
          }}
          disabled={testAnswers.includes(-1)}
          style={{ zIndex: 10 }}
          className={`px-6 py-3 rounded-xl font-semibold ${
            testAnswers.includes(-1)
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
          }`}
        >
          Submit Answers ({testAnswers.filter(a => a !== -1).length}/{testQuestions.length})
        </button>
      </div>
    );
  };

  const renderMastery = () => {
    const finalScore = calculateScore();

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
        <div className="bg-gradient-to-br from-blue-900/50 via-cyan-900/50 to-teal-900/50 rounded-3xl p-8 max-w-2xl border border-blue-700/30">
          <div className="text-8xl mb-6">🏆</div>
          <h1 style={{ fontSize: typo.title }} className="font-bold text-white mb-4">Surface Tension Master!</h1>
          <p style={{ fontSize: typo.bodyLarge }} className="text-slate-300 mb-6">
            You now understand how water's invisible "skin" can support objects much denser than water itself!
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div style={{ fontSize: typo.heading }} className="font-bold text-blue-400">{finalScore}/10</div>
              <p style={{ fontSize: typo.small }} className="text-slate-400">Test Score</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div style={{ fontSize: typo.heading }} className="font-bold text-blue-400">4</div>
              <p style={{ fontSize: typo.small }} className="text-slate-400">Applications Explored</p>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 text-left mb-6">
            <p style={{ fontSize: typo.body }} className="font-semibold text-white mb-3">Key Takeaways:</p>
            <ul style={{ fontSize: typo.small }} className="text-slate-400 space-y-2">
              <li>- Surface tension creates a supportive "skin" due to hydrogen bonding</li>
              <li>- F = gamma x L x sin(theta) calculates the vertical supporting force</li>
              <li>- Gentle placement allows the surface to deform gradually</li>
              <li>- Surfactants (soap) break hydrogen bonds, reducing surface tension by ~65%</li>
              <li>- Applications: microfluidics, inkjet printing, oil spill detection, biomimicry</li>
            </ul>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-6">
            {realWorldApps.map((app, i) => (
              <div key={i} className="bg-slate-800/50 rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">{app.icon}</div>
                <p style={{ fontSize: typo.label }} className="text-slate-400">{app.title.split(' ')[0]}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              onPhaseComplete?.();
              playSound('complete');
            }}
            style={{ zIndex: 10 }}
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-bold text-lg rounded-xl"
          >
            Complete Lesson
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER PHASE SWITCH
  // ============================================================================

  const renderPhase = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      if (phase === 'transfer') {
        return (
          <TransferPhaseView
            conceptName="Floating Paperclip"
            applications={realWorldApps}
            onComplete={() => goToPhase('test')}
            isMobile={isMobile}
            colors={colors}
            typo={typo}
            playSound={playSound}
          />
        );
      }

      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a0f1a 0%, #0a1628 100%)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif',
      lineHeight: '1.6',
    }}>
      {/* Progress bar */}
      {renderProgressBar()}

      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span style={{ fontSize: typo.small }} className="font-semibold text-white/80 tracking-wide">Floating Paperclip</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{
                  zIndex: 10,
                  cursor: 'pointer',
                  width: phase === p ? '24px' : '8px',
                  height: '8px',
                  minHeight: '44px',
                  minWidth: phase === p ? '24px' : '8px',
                  borderRadius: '4px',
                  border: 'none',
                  background: phase === p ? '#3b82f6' : currentIndex > i ? '#10b981' : 'rgba(100,116,139,0.5)',
                  transition: 'all 0.3s ease',
                  padding: 0,
                }}
                title={phaseLabels[p]}
                aria-label={phaseLabels[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: typo.small }} className="font-medium text-blue-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: '48px',
        paddingBottom: '100px',
        position: 'relative'
      }}>
        {renderPhase()}
      </div>

      {/* Bottom navigation */}
      {renderBottomBar()}
    </div>
  );
}
