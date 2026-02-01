'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

const realWorldApps = [
  {
    icon: '🍾',
    title: 'Cork Stoppers',
    short: 'Near-zero Poisson ratio enables easy insertion',
    tagline: 'The perfect bottle seal since ancient times',
    description: 'Cork has a uniquely low Poisson\'s ratio of nearly zero. When compressed to insert into a bottle neck, it doesn\'t bulge outward, making insertion easy while still providing an excellent seal.',
    connection: 'Cork\'s cellular structure contains air-filled cells that collapse upon compression without forcing material sideways. This is unlike rubber which would expand laterally.',
    howItWorks: 'Cork cells are arranged in a honeycomb pattern that absorbs compression. The cell walls buckle and fold rather than displacing material laterally, resulting in minimal lateral expansion.',
    stats: [
      { value: '~0', label: 'Poisson ratio', icon: '📏' },
      { value: '12B', label: 'corks produced yearly', icon: '🍾' },
      { value: '$2B', label: 'cork market', icon: '📈' }
    ],
    examples: ['Wine bottle corks', 'Champagne stoppers', 'Whiskey bottle seals', 'Cork flooring'],
    companies: ['Amorim', 'Corticeira Viking', 'Lafitte Cork', 'Jelinek Cork'],
    futureImpact: 'Sustainable cork farming and recycling ensure this ancient material remains relevant for centuries.',
    color: '#A1887F'
  },
  {
    icon: '🛡️',
    title: 'Auxetic Body Armor',
    short: 'Negative Poisson materials expand on impact',
    tagline: 'Armor that gets thicker when struck',
    description: 'Auxetic materials have negative Poisson\'s ratio - they expand laterally when stretched. In body armor, this means the material becomes denser and thicker at the point of impact.',
    connection: 'Re-entrant honeycomb structures unfold when stretched, causing lateral expansion. Under impact compression, they densify at the strike point, distributing force over a larger area.',
    howItWorks: 'Auxetic foam and fabric structures are engineered with inward-folding geometry. Impact causes localized densification that spreads force and prevents penetration.',
    stats: [
      { value: '-0.7', label: 'typical auxetic ratio', icon: '📊' },
      { value: '40%', label: 'better energy absorption', icon: '⚡' },
      { value: '$2B', label: 'armor market', icon: '📈' }
    ],
    examples: ['Military body armor', 'Sports helmets', 'Protective clothing', 'Impact-resistant cases'],
    companies: ['Auxetix', 'Under Armour', '3M', 'DuPont'],
    futureImpact: 'Advanced auxetic metamaterials will enable lighter, more effective protection for military and sports applications.',
    color: '#455A64'
  },
  {
    icon: '🔗',
    title: 'Rubber Bands and Seals',
    short: 'High Poisson ratio enables volume conservation',
    tagline: 'Stretch one way, shrink another',
    description: 'Rubber has a Poisson\'s ratio near 0.5, meaning it conserves volume. When you stretch a rubber band, it becomes dramatically thinner to maintain constant volume.',
    connection: 'Rubber molecules are long polymer chains that can uncoil when stretched. The material cannot compress, so elongation must be exactly compensated by lateral contraction.',
    howItWorks: 'Vulcanized rubber cross-links prevent chains from slipping past each other. When stretched, chains extend but volume stays constant, forcing proportional thickness reduction.',
    stats: [
      { value: '0.49', label: 'Poisson ratio', icon: '📏' },
      { value: '700%', label: 'max elongation', icon: '↔️' },
      { value: '$30B', label: 'rubber market', icon: '📈' }
    ],
    examples: ['O-ring seals', 'Elastic bands', 'Gaskets', 'Tire sidewalls'],
    companies: ['Trelleborg', 'Freudenberg', 'Parker Hannifin', 'SKF'],
    futureImpact: 'Smart rubber with tunable properties will enable seals that adapt to changing conditions.',
    color: '#E65100'
  },
  {
    icon: '🏭',
    title: 'Metal Forming',
    short: 'Poisson effect determines stamping die design',
    tagline: 'Precision manufacturing needs precision physics',
    description: 'When stamping metal parts, the Poisson effect causes material to spread laterally under compression. Engineers must account for this expansion to achieve precise final dimensions.',
    connection: 'Steel has a Poisson\'s ratio of about 0.3. Stamping compression causes lateral spread of 30% of the thickness reduction, requiring die compensation.',
    howItWorks: 'Dies are designed oversized or with specific clearances to account for material flow. Simulation software predicts Poisson expansion to optimize die geometry.',
    stats: [
      { value: '0.30', label: 'steel Poisson ratio', icon: '📏' },
      { value: '±0.1mm', label: 'typical tolerance', icon: '🎯' },
      { value: '$15B', label: 'die/mold market', icon: '📈' }
    ],
    examples: ['Automotive body panels', 'Beverage cans', 'Electronic enclosures', 'Appliance parts'],
    companies: ['Schuler', 'Komatsu', 'AIDA', 'Nidec Minster'],
    futureImpact: 'AI-driven forming simulation will optimize dies for complex geometries while accounting for precise material behavior.',
    color: '#37474F'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────
type Phase =
  | 'hook'
  | 'predict'
  | 'play'
  | 'review'
  | 'twist_predict'
  | 'twist_play'
  | 'twist_review'
  | 'transfer'
  | 'test'
  | 'mastery';

interface PoissonRatioRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const PHASES: Phase[] = [
  'hook', 'predict', 'play', 'review',
  'twist_predict', 'twist_play', 'twist_review',
  'transfer', 'test', 'mastery'
];

const testQuestions = [
  {
    scenario: 'A materials science student is learning about the fundamental properties that describe how materials deform under load.',
    question: 'What does Poisson\'s ratio measure in a material?',
    options: [
      { id: 'a', label: 'The ratio of applied stress to resulting strain (stiffness)', correct: false },
      { id: 'b', label: 'The ratio of lateral strain to axial strain when a material is stretched or compressed', correct: true },
      { id: 'c', label: 'The maximum stress a material can withstand before fracturing', correct: false },
      { id: 'd', label: 'The rate at which a material returns to its original shape after deformation', correct: false }
    ],
    explanation: 'Poisson\'s ratio (v) specifically measures how much a material contracts in the perpendicular direction when stretched in one direction. When you pull on a material axially, it typically gets thinner laterally. This ratio of lateral strain to axial strain is the defining characteristic that Poisson\'s ratio captures.'
  },
  {
    scenario: 'You\'re stretching a thick rubber band between your fingers and notice it becomes noticeably thinner as it gets longer.',
    question: 'Why does the rubber band get so much thinner when stretched compared to a steel wire?',
    options: [
      { id: 'a', label: 'Rubber has weak molecular bonds that break easily during stretching', correct: false },
      { id: 'b', label: 'Rubber has a Poisson\'s ratio near 0.5, meaning it\'s nearly incompressible and must thin significantly to conserve volume', correct: true },
      { id: 'c', label: 'The air trapped inside rubber escapes when stretched, reducing its width', correct: false },
      { id: 'd', label: 'Rubber molecules align in the stretch direction, pulling away from the sides', correct: false }
    ],
    explanation: 'Rubber has a Poisson\'s ratio of approximately 0.49-0.50, which is the theoretical maximum for isotropic materials. This high value means rubber is nearly incompressible - its volume stays almost constant. When you stretch it longer, it must become proportionally thinner to maintain the same volume, resulting in dramatic lateral contraction.'
  },
  {
    scenario: 'A sommelier explains to a wine enthusiast why cork has been the preferred material for wine bottle stoppers for centuries, while rubber stoppers often cause problems.',
    question: 'What property makes cork superior to rubber for bottle stoppers?',
    options: [
      { id: 'a', label: 'Cork is more chemically inert and doesn\'t react with wine', correct: false },
      { id: 'b', label: 'Cork has a Poisson\'s ratio near zero, so it compresses without bulging and slides easily into bottle necks', correct: true },
      { id: 'c', label: 'Cork is naturally antimicrobial and prevents wine contamination', correct: false },
      { id: 'd', label: 'Cork is more porous and allows the wine to breathe properly', correct: false }
    ],
    explanation: 'Cork has an exceptionally low Poisson\'s ratio (approximately 0), meaning when you compress it to insert into a bottle neck, it doesn\'t bulge outward. Rubber, with v near 0.5, would expand sideways when compressed, making insertion difficult and creating uneven pressure. Cork\'s unique cellular structure allows it to compress uniformly.'
  },
  {
    scenario: 'A biomedical engineer is designing a new arterial stent that needs to expand radially when a balloon catheter stretches it lengthwise during deployment.',
    question: 'What type of material structure would allow the stent to get WIDER when pulled lengthwise?',
    options: [
      { id: 'a', label: 'A material with high Young\'s modulus for maximum stiffness', correct: false },
      { id: 'b', label: 'An auxetic material with negative Poisson\'s ratio that expands laterally when stretched axially', correct: true },
      { id: 'c', label: 'A superelastic shape-memory alloy that remembers its expanded shape', correct: false },
      { id: 'd', label: 'A porous foam material that traps air for expansion', correct: false }
    ],
    explanation: 'Auxetic materials have a negative Poisson\'s ratio, meaning they exhibit the counterintuitive behavior of expanding perpendicular to the direction of stretching. This is achieved through special re-entrant (inward-folding) geometric structures that unfold and expand outward when pulled. This property is invaluable for stents that need to open up when deployed.'
  },
  {
    scenario: 'An automotive engineer is designing a metal stamping die for car body panels. The steel sheet will be compressed between dies, and the final dimensions must be precise.',
    question: 'Why must the engineer account for Poisson\'s ratio when designing the stamping die dimensions?',
    options: [
      { id: 'a', label: 'The steel will spring back after stamping due to elastic recovery', correct: false },
      { id: 'b', label: 'When compressed vertically, the steel spreads laterally due to Poisson effect, requiring oversized dies to achieve target dimensions', correct: true },
      { id: 'c', label: 'The steel\'s hardness changes during stamping, affecting final size', correct: false },
      { id: 'd', label: 'Friction between the die and steel causes unpredictable deformation', correct: false }
    ],
    explanation: 'Steel has a Poisson\'s ratio of about 0.3, meaning when compressed in one direction, it expands in perpendicular directions. In metal stamping, vertical compression causes the sheet to spread horizontally. Engineers must design dies accounting for this lateral expansion to achieve precise final dimensions, or the parts will be oversized.'
  },
  {
    scenario: 'A researcher is studying a perfectly incompressible material (theoretical v = 0.5) being stretched to 150% of its original length in a tensile test.',
    question: 'If the material maintains constant volume during stretching, what happens to its cross-sectional area?',
    options: [
      { id: 'a', label: 'Cross-sectional area increases by 50% to match the length increase', correct: false },
      { id: 'b', label: 'Cross-sectional area remains unchanged since the material is incompressible', correct: false },
      { id: 'c', label: 'Cross-sectional area decreases to approximately 67% of original to maintain constant volume', correct: true },
      { id: 'd', label: 'Cross-sectional area decreases by 50% to exactly offset the length increase', correct: false }
    ],
    explanation: 'For an incompressible material, Volume = Length x Area must remain constant. If length increases to 1.5x original, then Area must decrease to 1/1.5 = 0.667 (about 67%) of original. This is why truly incompressible materials with v = 0.5 show such dramatic thinning when stretched - the volume conservation requirement forces significant lateral contraction.'
  },
  {
    scenario: 'A geophysicist is analyzing seismic wave data from an earthquake. P-waves (compression) and S-waves (shear) travel at different speeds through rock, and these speeds depend on elastic properties.',
    question: 'How does Poisson\'s ratio affect seismic wave propagation through Earth\'s crust?',
    options: [
      { id: 'a', label: 'Higher Poisson\'s ratio increases both P-wave and S-wave speeds equally', correct: false },
      { id: 'b', label: 'Poisson\'s ratio determines the ratio of P-wave to S-wave velocities, helping identify rock types and fluid content', correct: true },
      { id: 'c', label: 'Poisson\'s ratio only affects wave amplitude, not velocity', correct: false },
      { id: 'd', label: 'Seismic waves are unaffected by Poisson\'s ratio since they travel through solids', correct: false }
    ],
    explanation: 'The ratio of P-wave to S-wave velocity (Vp/Vs) is directly related to Poisson\'s ratio through elastic wave equations. Rocks saturated with fluids have higher Poisson\'s ratios (approaching 0.5) and thus higher Vp/Vs ratios. Geophysicists use this relationship to identify rock types, detect fluid-filled reservoirs, and locate potential earthquake zones.'
  },
  {
    scenario: 'An aerospace engineer is designing a carbon fiber composite wing that must be stiff in one direction but flexible in another to optimize aerodynamic performance.',
    question: 'How can fiber orientation in composite materials be used to achieve different Poisson\'s ratios in different directions?',
    options: [
      { id: 'a', label: 'By adding metallic particles aligned with the desired direction of low Poisson\'s ratio', correct: false },
      { id: 'b', label: 'By orienting fiber layers at specific angles, engineers can create anisotropic materials with direction-dependent Poisson\'s ratios, even achieving negative values', correct: true },
      { id: 'c', label: 'Poisson\'s ratio is an intrinsic material property that cannot be modified through structural design', correct: false },
      { id: 'd', label: 'By varying the resin content between fiber layers to create density gradients', correct: false }
    ],
    explanation: 'Unlike isotropic materials, composites can have different Poisson\'s ratios in different directions (anisotropic behavior). By carefully orienting fiber layers at specific angles (e.g., +/-45 degrees), engineers can design laminates with tailored Poisson\'s ratios in each direction, including negative values. This enables optimization of structural response for specific loading conditions.'
  },
  {
    scenario: 'A mechanical engineer is designing a thick-walled cylindrical pressure vessel to contain high-pressure gas. The vessel walls experience complex stress states.',
    question: 'Why is Poisson\'s ratio critical in pressure vessel design calculations?',
    options: [
      { id: 'a', label: 'It determines the color change of the material under pressure for visual inspection', correct: false },
      { id: 'b', label: 'It affects how hoop stress and axial stress interact, influencing the total strain and potential failure modes in the vessel walls', correct: true },
      { id: 'c', label: 'It only matters for determining the weight of the pressure vessel', correct: false },
      { id: 'd', label: 'It controls the rate of gas leakage through the vessel walls', correct: false }
    ],
    explanation: 'In pressure vessels, walls experience simultaneous hoop (circumferential) and axial stresses. Due to Poisson\'s effect, strain in one direction is influenced by stress in perpendicular directions. The total hoop strain includes both direct hoop stress effects AND Poisson-coupled effects from axial stress. Accurate Poisson\'s ratio values are essential for predicting deformation, fatigue life, and failure pressure.'
  },
  {
    scenario: 'A quality control engineer needs to verify that a batch of metal alloy meets specifications. They perform a tensile test and measure both length extension and width reduction.',
    question: 'During the tensile test, the specimen extends 2.0 mm in length (original 100 mm) while its width decreases by 0.12 mm (original 20 mm). What is the Poisson\'s ratio?',
    options: [
      { id: 'a', label: '0.15 - the material has unusually low lateral contraction', correct: false },
      { id: 'b', label: '0.30 - consistent with typical steel or aluminum alloys', correct: true },
      { id: 'c', label: '0.45 - the material behaves almost like rubber', correct: false },
      { id: 'd', label: '0.60 - this exceeds the theoretical maximum, indicating measurement error', correct: false }
    ],
    explanation: 'Poisson\'s ratio = -(lateral strain)/(axial strain). Axial strain = 2.0/100 = 0.020. Lateral strain = -0.12/20 = -0.006 (negative because width decreases). Therefore v = -(-0.006)/(0.020) = 0.30. This value is typical for steel (~0.30) and aluminum (~0.33), confirming the alloy meets expected mechanical behavior for these material classes.'
  }
];

const TRANSFER_APPS = [
  {
    title: 'Cork Stoppers',
    description: 'Cork has ν ≈ 0, so it compresses without bulging - perfect for sliding into bottles!',
    icon: '🍾'
  },
  {
    title: 'Auxetic Foam',
    description: 'Used in body armor - expands to fill wounds and distribute impact over larger area.',
    icon: '🛡️'
  },
  {
    title: 'Rubber Bands',
    description: 'ν ≈ 0.5 means rubber maintains constant volume - watch it thin as you stretch!',
    icon: '🔗'
  },
  {
    title: 'Metal Forming',
    description: 'Engineers must account for Poisson contraction when designing stamped metal parts.',
    icon: '🏭'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
function playSound(type: 'click' | 'success' | 'failure' | 'transition' | 'complete'): void {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const sounds: Record<string, { freq: number; type: OscillatorType; duration: number }> = {
      click: { freq: 600, type: 'sine', duration: 0.08 },
      success: { freq: 880, type: 'sine', duration: 0.15 },
      failure: { freq: 220, type: 'sine', duration: 0.25 },
      transition: { freq: 440, type: 'triangle', duration: 0.12 },
      complete: { freq: 660, type: 'sine', duration: 0.2 }
    };

    const sound = sounds[type];
    oscillator.frequency.setValueAtTime(sound.freq, audioContext.currentTime);
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch {
    // Audio not available
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PREMIUM UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
const ProgressIndicator: React.FC<{ phases: Phase[]; currentPhase: Phase }> = ({ phases, currentPhase }) => {
  const currentIndex = phases.indexOf(currentPhase);
  return (
    <div className="flex items-center gap-1.5 mb-8">
      {phases.map((p, i) => (
        <div key={p} className="flex-1 flex items-center">
          <div
            className={`h-2 w-full rounded-full transition-all duration-500 ${
              i < currentIndex
                ? 'bg-gradient-to-r from-indigo-400 to-purple-400'
                : i === currentIndex
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/30'
                : 'bg-slate-700'
            }`}
          />
        </div>
      ))}
    </div>
  );
};

const PrimaryButton: React.FC<{
  children: React.ReactNode;
  onMouseDown: (e: React.MouseEvent) => void;
  variant?: 'indigo' | 'purple' | 'pink';
  disabled?: boolean;
  className?: string;
}> = ({ children, onMouseDown, variant = 'indigo', disabled = false, className = '' }) => {
  const gradients = {
    indigo: 'from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-indigo-500/25',
    purple: 'from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-purple-500/25',
    pink: 'from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 shadow-pink-500/25'
  };

  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        if (!disabled) onMouseDown(e);
      }}
      disabled={disabled}
      className={`px-8 py-3.5 bg-gradient-to-r ${gradients[variant]} rounded-2xl text-white font-semibold
        shadow-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${className}`}
    >
      {children}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// APPLICATION GRAPHICS
// ─────────────────────────────────────────────────────────────────────────────
const CorkStopperGraphic: React.FC = () => {
  const [compressionPhase, setCompressionPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCompressionPhase(p => (p + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const compression = Math.sin(compressionPhase * 0.06) * 0.5 + 0.5; // 0 to 1

  return (
    <svg viewBox="0 0 400 300" className="w-full h-64">
      <defs>
        <linearGradient id="corkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="50%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
        <linearGradient id="bottleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#064e3b" />
          <stop offset="50%" stopColor="#047857" />
          <stop offset="100%" stopColor="#064e3b" />
        </linearGradient>
      </defs>

      <rect width="400" height="300" fill="#0f172a" />

      {/* Wine bottle */}
      <g transform="translate(200, 150)">
        {/* Bottle neck */}
        <rect x="-25" y="-100" width="50" height="80" fill="url(#bottleGradient)" rx="3" />

        {/* Bottle body */}
        <path
          d="M-25 -20 L-25 50 Q-25 80 -50 100 L-50 130 Q-50 140 -40 140 L40 140 Q50 140 50 130 L50 100 Q25 80 25 50 L25 -20 Z"
          fill="url(#bottleGradient)"
        />

        {/* Wine level */}
        <path
          d="M-45 100 L-45 130 Q-45 135 -38 135 L38 135 Q45 135 45 130 L45 100 Q20 85 20 55 L20 -15 L-20 -15 L-20 55 Q-20 85 -45 100 Z"
          fill="#7f1d1d"
          opacity="0.8"
        />

        {/* Cork stopper - note it doesn't bulge when compressed! */}
        <g transform={`translate(0, ${-100 - 30 + compression * 25})`}>
          <rect
            x={-18}
            y={0}
            width={36}
            height={30 - compression * 5}
            fill="url(#corkGradient)"
            rx="2"
          />
          {/* Cork texture */}
          {[...Array(6)].map((_, i) => (
            <line
              key={i}
              x1={-15 + i * 6}
              y1={2}
              x2={-15 + i * 6}
              y2={28 - compression * 5}
              stroke="#78350f"
              strokeWidth="1"
              opacity="0.5"
            />
          ))}
        </g>

        {/* Force arrow */}
        <g transform={`translate(0, ${-135 + compression * 25})`}>
          <line x1="0" y1="-20" x2="0" y2="0" stroke="#ef4444" strokeWidth="3" />
          <polygon points="-6,-8 0,5 6,-8" fill="#ef4444" />
        </g>
      </g>

      {/* Labels */}
      <text x="200" y="25" textAnchor="middle" className="fill-amber-400 text-sm font-medium">
        Cork: ν ≈ 0 (No Lateral Bulge)
      </text>

      {/* Comparison diagram */}
      <g transform="translate(50, 180)">
        <text className="fill-gray-400 text-xs">Cork compressed:</text>
        <rect x="0" y="10" width="30" height={20 + compression * 10} fill="#d97706" rx="2" />
        <text x="35" y="28" className="fill-gray-500 text-xs">Width stays same!</text>
      </g>

      <g transform="translate(280, 180)">
        <text className="fill-gray-400 text-xs">Rubber compressed:</text>
        <rect x={(15 - compression * 5)} y="10" width={30 + compression * 10} height={20 + compression * 10} fill="#ec4899" rx="2" />
        <text x="45" y="28" className="fill-gray-500 text-xs">Width bulges</text>
      </g>
    </svg>
  );
};

const AuxeticFoamGraphic: React.FC = () => {
  const [impactPhase, setImpactPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setImpactPhase(p => (p + 1) % 120);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const impact = impactPhase < 60 ? impactPhase / 60 : (120 - impactPhase) / 60;

  return (
    <svg viewBox="0 0 400 300" className="w-full h-64">
      <defs>
        <linearGradient id="vestGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e40af" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        <radialGradient id="impactGradient" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="400" height="300" fill="#0f172a" />

      {/* Body armor vest */}
      <g transform="translate(200, 150)">
        {/* Vest outline */}
        <path
          d="M-60 -80 L-40 -90 L0 -95 L40 -90 L60 -80 L70 0 L60 80 L30 90 L-30 90 L-60 80 L-70 0 Z"
          fill="url(#vestGradient)"
          stroke="#3b82f6"
          strokeWidth="2"
        />

        {/* Auxetic foam layer (expands on impact) */}
        <g>
          {/* Honeycomb pattern that expands */}
          {[...Array(4)].map((_, row) => (
            [...Array(3)].map((_, col) => {
              const baseX = -30 + col * 30;
              const baseY = -50 + row * 35;
              const expand = impact * 8;

              return (
                <path
                  key={`${row}-${col}`}
                  d={`M ${baseX} ${baseY - 8 - expand}
                      L ${baseX + 10 + expand} ${baseY - 4}
                      L ${baseX + 10 + expand} ${baseY + 8}
                      L ${baseX} ${baseY + 12 + expand}
                      L ${baseX - 10 - expand} ${baseY + 8}
                      L ${baseX - 10 - expand} ${baseY - 4}
                      Z`}
                  fill="#7c3aed"
                  stroke="#a78bfa"
                  strokeWidth="1"
                  opacity="0.8"
                />
              );
            })
          ))}
        </g>

        {/* Impact point */}
        {impact > 0.1 && (
          <g>
            <circle cx="-10" cy="-20" r={15 + impact * 20} fill="url(#impactGradient)" opacity={0.6 - impact * 0.3} />
            <circle cx="-10" cy="-20" r="6" fill="#ef4444" />
          </g>
        )}
      </g>

      {/* Projectile */}
      <g transform={`translate(${50 + impact * 110}, ${100 - impact * 30})`}>
        <ellipse cx="0" cy="0" rx="10" ry="8" fill="#64748b" stroke="#94a3b8" strokeWidth="2" />
        <line x1="-15" y1="0" x2="-25" y2="0" stroke="#94a3b8" strokeWidth="2" />
      </g>

      {/* Labels */}
      <text x="200" y="25" textAnchor="middle" className="fill-purple-400 text-sm font-medium">
        Auxetic Body Armor (ν &lt; 0)
      </text>

      {/* Info panel */}
      <g transform="translate(20, 250)">
        <rect width="160" height="40" rx="6" fill="#1e293b" />
        <text x="80" y="18" textAnchor="middle" className="fill-purple-300 text-xs font-medium">
          Impact Response:
        </text>
        <text x="80" y="32" textAnchor="middle" className="fill-gray-400 text-xs">
          Foam EXPANDS to spread force
        </text>
      </g>

      {/* Force distribution arrows */}
      {impact > 0.3 && (
        <g transform="translate(200, 150)" opacity={impact}>
          {[-30, -15, 0, 15, 30].map((angle, i) => (
            <g key={i} transform={`rotate(${angle})`}>
              <line x1="0" y1="-30" x2="0" y2={-50 - impact * 20} stroke="#a78bfa" strokeWidth="2" />
              <polygon points="-4,-45 0,-55 4,-45" fill="#a78bfa" transform={`translate(0, ${-impact * 20})`} />
            </g>
          ))}
        </g>
      )}
    </svg>
  );
};

const RubberBandGraphic: React.FC = () => {
  const [stretchPhase, setStretchPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStretchPhase(p => (p + 1) % 100);
    }, 60);
    return () => clearInterval(interval);
  }, []);

  const stretch = Math.sin(stretchPhase * 0.063) * 0.5 + 0.5; // 0 to 1

  const bandWidth = 40 - stretch * 20; // Gets thinner as it stretches
  const bandLength = 100 + stretch * 80;

  return (
    <svg viewBox="0 0 400 300" className="w-full h-64">
      <defs>
        <linearGradient id="rubberGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="50%" stopColor="#db2777" />
          <stop offset="100%" stopColor="#be185d" />
        </linearGradient>
      </defs>

      <rect width="400" height="300" fill="#0f172a" />

      {/* Hands */}
      <g transform={`translate(100, ${150 - bandLength/2})`}>
        <ellipse cx="0" cy="0" rx="25" ry="15" fill="#d4a574" />
        <rect x="-8" y="10" width="16" height="20" fill="#d4a574" rx="4" />
        <line x1="0" y1="15" x2="0" y2="30" stroke="#c4956a" strokeWidth="2" />
      </g>

      <g transform={`translate(100, ${150 + bandLength/2})`}>
        <ellipse cx="0" cy="0" rx="25" ry="15" fill="#d4a574" />
        <rect x="-8" y="-30" width="16" height="20" fill="#d4a574" rx="4" />
        <line x1="0" y1="-15" x2="0" y2="-30" stroke="#c4956a" strokeWidth="2" />
      </g>

      {/* Rubber band */}
      <rect
        x={100 - bandWidth/2}
        y={150 - bandLength/2}
        width={bandWidth}
        height={bandLength}
        fill="url(#rubberGradient)"
        rx="4"
      />

      {/* Grid on rubber to show deformation */}
      {[...Array(8)].map((_, i) => (
        <line
          key={i}
          x1={100 - bandWidth/2}
          y1={150 - bandLength/2 + (i + 1) * bandLength/9}
          x2={100 + bandWidth/2}
          y2={150 - bandLength/2 + (i + 1) * bandLength/9}
          stroke="#9d174d"
          strokeWidth="1"
          opacity="0.5"
        />
      ))}

      {/* Dimension indicators */}
      <g transform="translate(180, 80)">
        <text className="fill-gray-400 text-xs font-medium">Dimensions:</text>
        <text x="0" y="20" className="fill-pink-400 text-xs">Width: {bandWidth.toFixed(0)} → {(40).toFixed(0)} original</text>
        <text x="0" y="35" className="fill-pink-400 text-xs">Length: {bandLength.toFixed(0)} → {(100).toFixed(0)} original</text>
        <text x="0" y="55" className="fill-gray-500 text-xs">ν ≈ 0.5 (incompressible)</text>
      </g>

      {/* Volume calculation */}
      <g transform="translate(180, 170)">
        <rect width="180" height="70" rx="8" fill="#1e293b" stroke="#334155" />
        <text x="90" y="20" textAnchor="middle" className="fill-gray-300 text-xs font-medium">Volume Conservation</text>
        <text x="90" y="40" textAnchor="middle" className="fill-pink-400 text-xs">
          V = {(bandWidth * bandLength).toFixed(0)} units²
        </text>
        <text x="90" y="55" textAnchor="middle" className="fill-green-400 text-xs">
          ≈ Constant! ({(40 * 100).toFixed(0)} original)
        </text>
      </g>

      {/* Stretch arrows */}
      <g transform={`translate(100, ${150 - bandLength/2 - 30})`}>
        <polygon points="-6,10 0,-5 6,10" fill="#ef4444" />
        <line x1="0" y1="10" x2="0" y2="25" stroke="#ef4444" strokeWidth="2" />
      </g>
      <g transform={`translate(100, ${150 + bandLength/2 + 30})`}>
        <polygon points="-6,-10 0,5 6,-10" fill="#ef4444" />
        <line x1="0" y1="-10" x2="0" y2="-25" stroke="#ef4444" strokeWidth="2" />
      </g>

      {/* Labels */}
      <text x="200" y="280" textAnchor="middle" className="fill-pink-400 text-sm font-medium">
        Rubber Band: Stretches thin but volume stays constant
      </text>
    </svg>
  );
};

const MetalFormingGraphic: React.FC = () => {
  const [pressPhase, setPressPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPressPhase(p => (p + 1) % 120);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const press = pressPhase < 60 ? pressPhase / 60 : (120 - pressPhase) / 60;
  const metalWidth = 120 + press * 20; // Metal spreads when compressed
  const metalHeight = 40 - press * 15;

  return (
    <svg viewBox="0 0 400 300" className="w-full h-64">
      <defs>
        <linearGradient id="metalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="50%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="pressGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e40af" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>

      <rect width="400" height="300" fill="#0f172a" />

      {/* Press machine frame */}
      <rect x="50" y="50" width="300" height="200" fill="#1e293b" stroke="#334155" strokeWidth="3" rx="8" />

      {/* Upper die */}
      <g transform={`translate(200, ${80 + press * 40})`}>
        <rect x="-80" y="0" width="160" height="40" fill="url(#pressGrad)" rx="4" />
        <rect x="-70" y="30" width="140" height="10" fill="#2563eb" />
        {/* Hydraulic pistons */}
        <rect x="-90" y="-50" width="20" height={50 + press * 40} fill="#475569" />
        <rect x="70" y="-50" width="20" height={50 + press * 40} fill="#475569" />
      </g>

      {/* Lower die (stationary) */}
      <rect x="120" y="200" width="160" height="30" fill="url(#pressGrad)" rx="4" />

      {/* Metal sheet being formed */}
      <rect
        x={200 - metalWidth/2}
        y={200 - metalHeight}
        width={metalWidth}
        height={metalHeight}
        fill="url(#metalGrad)"
        rx="2"
      />

      {/* Lateral spread arrows */}
      {press > 0.2 && (
        <g opacity={press}>
          <g transform={`translate(${200 - metalWidth/2 - 10}, ${200 - metalHeight/2})`}>
            <line x1="0" y1="0" x2="-15" y2="0" stroke="#3b82f6" strokeWidth="2" />
            <polygon points="0,-4 -10,0 0,4" fill="#3b82f6" />
          </g>
          <g transform={`translate(${200 + metalWidth/2 + 10}, ${200 - metalHeight/2})`}>
            <line x1="0" y1="0" x2="15" y2="0" stroke="#3b82f6" strokeWidth="2" />
            <polygon points="0,-4 10,0 0,4" fill="#3b82f6" />
          </g>
        </g>
      )}

      {/* Labels */}
      <text x="200" y="25" textAnchor="middle" className="fill-gray-400 text-sm font-medium">
        Metal Stamping Press
      </text>

      {/* Engineering specs panel */}
      <g transform="translate(280, 100)">
        <rect width="100" height="80" rx="6" fill="#1e293b" stroke="#334155" />
        <text x="50" y="18" textAnchor="middle" className="fill-gray-300 text-xs font-medium">Steel ν = 0.3</text>
        <text x="50" y="38" textAnchor="middle" className="fill-blue-400 text-xs">Width: {metalWidth.toFixed(0)}mm</text>
        <text x="50" y="53" textAnchor="middle" className="fill-blue-400 text-xs">Height: {metalHeight.toFixed(0)}mm</text>
        <text x="50" y="70" textAnchor="middle" className="fill-amber-400 text-xs">Accounts for spread!</text>
      </g>

      {/* Force indicator */}
      <g transform="translate(50, 100)">
        <rect width="60" height="50" rx="6" fill="#1e293b" stroke="#334155" />
        <text x="30" y="20" textAnchor="middle" className="fill-gray-400 text-xs">Force</text>
        <text x="30" y="40" textAnchor="middle" className="fill-red-400 text-sm font-bold">{(press * 100).toFixed(0)}%</text>
      </g>

      {/* Bottom label */}
      <text x="200" y="280" textAnchor="middle" className="fill-gray-500 text-xs">
        Engineers must compensate for Poisson lateral expansion in die design
      </text>
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function PoissonRatioRenderer({ phase, onPhaseComplete, onCorrectAnswer, onIncorrectAnswer }: PoissonRatioRendererProps) {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [currentPhase, setCurrentPhase] = useState<Phase>(phase || 'hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(testQuestions.length).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Simulation state
  const [material, setMaterial] = useState<'steel' | 'rubber' | 'cork'>('steel');
  const [stretch, setStretch] = useState(0);
  const [auxeticStretch, setAuxeticStretch] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Responsive detection
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

  // Poisson's ratios
  const getPoissonRatio = (mat: string): number => {
    switch (mat) {
      case 'steel': return 0.3;
      case 'rubber': return 0.49;
      case 'cork': return 0.0;
      default: return 0.3;
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const goToPhase = useCallback((newPhase: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (navigationLockRef.current) return;
    lastClickRef.current = now;
    navigationLockRef.current = true;

    playSound('transition');
    setCurrentPhase(newPhase);

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 200);
  }, []);

  const nextPhase = useCallback(() => {
    const currentIndex = PHASES.indexOf(currentPhase);
    if (currentIndex < PHASES.length - 1) {
      goToPhase(PHASES[currentIndex + 1]);
    }
  }, [currentPhase, goToPhase]);

  const handlePrediction = useCallback((id: string) => {
    playSound('click');
    setPrediction(id);
  }, []);

  const handleTwistPrediction = useCallback((id: string) => {
    playSound('click');
    setTwistPrediction(id);
  }, []);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = answerIndex;
    setTestAnswers(newAnswers);
  }, [testAnswers]);

  const handleAppComplete = useCallback((index: number) => {
    playSound('click');
    setCompletedApps(prev => new Set([...prev, index]));
    setActiveAppTab(index);
  }, []);

  const submitTest = useCallback(() => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 7 && onCorrectAnswer) onCorrectAnswer();
    else if (onIncorrectAnswer) onIncorrectAnswer();
  }, [testAnswers, onCorrectAnswer, onIncorrectAnswer]);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setMaterial('steel');
      setStretch(0);
    }
    if (phase === 'twist_play') {
      setAuxeticStretch(0);
    }
  }, [phase]);

  // ─── Render Helpers ──────────────────────────────────────────────────────────
  const renderStretchScene = () => {
    const nu = getPoissonRatio(material);
    const axialStretch = stretch / 100;
    const lateralContraction = nu * axialStretch;

    const baseWidth = 80;
    const baseHeight = 120;
    const newWidth = baseWidth * (1 - lateralContraction);
    const newHeight = baseHeight * (1 + axialStretch);

    const materialColors: Record<string, string> = {
      steel: '#6b7280',
      rubber: '#ec4899',
      cork: '#d97706'
    };

    return (
      <svg viewBox="0 0 400 300" className="w-full h-60 rounded-xl">
        <rect width="400" height="300" fill="#0f172a" />

        {/* Force arrows */}
        <g>
          <line x1="200" y1="30" x2="200" y2={50 - stretch / 2} stroke="#ef4444" strokeWidth="3" />
          <polygon points="195,35 200,20 205,35" fill="#ef4444" />
          <line x1="200" y1="270" x2="200" y2={250 + stretch / 2} stroke="#ef4444" strokeWidth="3" />
          <polygon points="195,265 200,280 205,265" fill="#ef4444" />
        </g>

        {/* Material specimen */}
        <g transform={`translate(${200 - newWidth / 2}, ${150 - newHeight / 2})`}>
          <rect
            width={newWidth}
            height={newHeight}
            fill={materialColors[material]}
            stroke="#9ca3af"
            strokeWidth="2"
            rx="3"
          />
          {[...Array(5)].map((_, i) => (
            <line
              key={`h-${i}`}
              x1={0}
              y1={(i + 1) * newHeight / 6}
              x2={newWidth}
              y2={(i + 1) * newHeight / 6}
              stroke="#1f2937"
              strokeWidth="1"
              opacity="0.5"
            />
          ))}
          {[...Array(3)].map((_, i) => (
            <line
              key={`v-${i}`}
              x1={(i + 1) * newWidth / 4}
              y1={0}
              x2={(i + 1) * newWidth / 4}
              y2={newHeight}
              stroke="#1f2937"
              strokeWidth="1"
              opacity="0.5"
            />
          ))}
        </g>

        {/* Dimension labels */}
        <g transform="translate(320, 100)">
          <text x="0" y="0" className="fill-gray-400 text-xs">Original:</text>
          <text x="0" y="18" className="fill-gray-300 text-xs">{baseWidth}×{baseHeight}</text>
          <text x="0" y="45" className="fill-gray-400 text-xs">Current:</text>
          <text x="0" y="63" className="fill-indigo-300 text-xs">{newWidth.toFixed(1)}×{newHeight.toFixed(1)}</text>
          <text x="0" y="90" className="fill-gray-400 text-xs">ν = {nu}</text>
          <text x="0" y="108" className="fill-amber-300 text-xs">
            Lateral: {(lateralContraction * 100).toFixed(1)}%
          </text>
        </g>

        {/* Lateral contraction arrows */}
        {stretch > 5 && nu > 0 && (
          <g>
            <line
              x1={200 - newWidth / 2 - 25}
              y1={150}
              x2={200 - newWidth / 2 - 5}
              y2={150}
              stroke="#3b82f6"
              strokeWidth="2"
            />
            <polygon
              points={`${200 - newWidth / 2 - 10},145 ${200 - newWidth / 2 - 5},150 ${200 - newWidth / 2 - 10},155`}
              fill="#3b82f6"
            />
            <line
              x1={200 + newWidth / 2 + 25}
              y1={150}
              x2={200 + newWidth / 2 + 5}
              y2={150}
              stroke="#3b82f6"
              strokeWidth="2"
            />
            <polygon
              points={`${200 + newWidth / 2 + 10},145 ${200 + newWidth / 2 + 5},150 ${200 + newWidth / 2 + 10},155`}
              fill="#3b82f6"
            />
          </g>
        )}

        <text x="200" y="290" textAnchor="middle" className="fill-gray-300 text-sm font-medium">
          {material.charAt(0).toUpperCase() + material.slice(1)} (ν = {nu})
        </text>
      </svg>
    );
  };

  const renderAuxeticScene = () => {
    const axialStretch = auxeticStretch / 100;
    const auxeticNu = -0.5;
    const lateralExpansion = -auxeticNu * axialStretch;

    const baseWidth = 80;
    const baseHeight = 100;
    const newWidth = baseWidth * (1 + lateralExpansion);
    const newHeight = baseHeight * (1 + axialStretch);

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56 rounded-xl">
        <rect width="400" height="280" fill="#0f172a" />

        {/* Normal material */}
        <g transform="translate(100, 60)">
          <text x="40" y="-15" textAnchor="middle" className="fill-gray-400 text-xs">Normal (ν = 0.3)</text>
          <line x1="40" y1="-5" x2="40" y2="10" stroke="#ef4444" strokeWidth="2" />
          <line x1="40" y1={baseHeight * (1 + axialStretch) + 25} x2="40" y2={baseHeight * (1 + axialStretch) + 10} stroke="#ef4444" strokeWidth="2" />
          <rect
            x={40 - (baseWidth * (1 - 0.3 * axialStretch)) / 2}
            y={10}
            width={baseWidth * (1 - 0.3 * axialStretch)}
            height={baseHeight * (1 + axialStretch)}
            fill="#6b7280"
            stroke="#9ca3af"
            strokeWidth="2"
            rx="3"
          />
          <text x="40" y={baseHeight * (1 + axialStretch) + 45} textAnchor="middle" className="fill-gray-500 text-xs">
            Gets thinner ↔
          </text>
        </g>

        {/* Auxetic material */}
        <g transform="translate(260, 60)">
          <text x="40" y="-15" textAnchor="middle" className="fill-purple-400 text-xs">Auxetic (ν = -0.5)</text>
          <line x1="40" y1="-5" x2="40" y2="10" stroke="#ef4444" strokeWidth="2" />
          <line x1="40" y1={newHeight + 25} x2="40" y2={newHeight + 10} stroke="#ef4444" strokeWidth="2" />
          <g>
            <rect
              x={40 - newWidth / 2}
              y={10}
              width={newWidth}
              height={newHeight}
              fill="#7c3aed"
              stroke="#a78bfa"
              strokeWidth="2"
              rx="3"
            />
            {auxeticStretch > 10 && (
              <g opacity="0.5">
                {[...Array(3)].map((_, row) => (
                  [...Array(2)].map((_, col) => {
                    const cellX = 40 - newWidth / 2 + 10 + col * (newWidth - 20) / 2;
                    const cellY = 15 + row * (newHeight - 10) / 3;
                    const expand = auxeticStretch / 100;
                    return (
                      <path
                        key={`${row}-${col}`}
                        d={`M ${cellX} ${cellY + 5 - expand * 10}
                            L ${cellX + 10 + expand * 5} ${cellY}
                            L ${cellX + 10 + expand * 5} ${cellY + 15 + expand * 10}
                            L ${cellX} ${cellY + 20 + expand * 10}
                            L ${cellX - 10 - expand * 5} ${cellY + 15 + expand * 10}
                            L ${cellX - 10 - expand * 5} ${cellY}
                            Z`}
                        fill="none"
                        stroke="#c4b5fd"
                        strokeWidth="1"
                      />
                    );
                  })
                ))}
              </g>
            )}
          </g>
          <text x="40" y={newHeight + 45} textAnchor="middle" className="fill-purple-400 text-xs">
            Gets WIDER! ↔
          </text>
        </g>

        <text x="200" y="260" textAnchor="middle" className="fill-gray-400 text-sm">
          Auxetic structures expand laterally when stretched!
        </text>
      </svg>
    );
  };

  const renderApplicationGraphic = (index: number) => {
    switch (index) {
      case 0: return <CorkStopperGraphic />;
      case 1: return <AuxeticFoamGraphic />;
      case 2: return <RubberBandGraphic />;
      case 3: return <MetalFormingGraphic />;
      default: return null;
    }
  };

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-indigo-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
        The Rubber Band Mystery
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover why materials change shape when stretched
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-6">🔗↔️</div>

          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              Stretch a rubber band and watch closely
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              It gets <span className="text-blue-400 font-semibold">longer</span> but also gets <span className="text-pink-400 font-semibold">thinner</span>! All materials do this (to varying degrees). Why?
            </p>
            <div className="pt-2">
              <p className="text-base text-indigo-400 font-semibold">
                Why do materials get thinner when you stretch them?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={() => { playSound('click'); nextPhase(); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Investigate!
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-indigo-400">✦</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-indigo-400">✦</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-indigo-400">✦</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Make Your Prediction</h2>
        <p className="text-gray-400">
          You stretch a rubber band to twice its length. What happens to its width?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 max-w-xl mx-auto">
        {[
          { id: 'thinner', text: 'It gets thinner - volume is conserved so it must contract sideways', icon: '↔️' },
          { id: 'same', text: 'Stays the same - stretching only affects length', icon: '=' },
          { id: 'wider', text: 'It gets wider - stretching pulls atoms apart', icon: '↕️' },
          { id: 'depends', text: 'It depends on the color of the rubber band', icon: '🎨' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            className={`p-5 rounded-2xl border-2 transition-all text-left ${
              prediction === option.id
                ? 'border-indigo-500 bg-indigo-900/30 shadow-lg shadow-indigo-500/20'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            }`}
          >
            <span className="text-2xl mr-3">{option.icon}</span>
            <span className="text-gray-200">{option.text}</span>
          </button>
        ))}
      </div>

      {prediction && (
        <div className="text-center">
          <PrimaryButton onMouseDown={() => { playSound('click'); nextPhase(); }}>
            Test It! →
          </PrimaryButton>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Poisson&apos;s Ratio</h2>

      {renderStretchScene()}

      <div className="max-w-xl mx-auto space-y-4">
        <div>
          <label className="text-gray-400 text-sm font-medium">Material:</label>
          <div className="flex gap-3 mt-2">
            {[
              { id: 'steel', label: 'Steel (ν=0.3)', color: 'bg-gray-600' },
              { id: 'rubber', label: 'Rubber (ν≈0.5)', color: 'bg-pink-600' },
              { id: 'cork', label: 'Cork (ν≈0)', color: 'bg-amber-600' }
            ].map((mat) => (
              <button
                key={mat.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  playSound('click');
                  setMaterial(mat.id as typeof material);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  material === mat.id
                    ? `${mat.color} text-white shadow-lg`
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                {mat.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-gray-400 text-sm font-medium">Axial Stretch: {stretch}%</label>
          <input
            type="range"
            min="0"
            max="50"
            value={stretch}
            onChange={(e) => setStretch(Number(e.target.value))}
            className="w-full mt-2"
          />
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 rounded-2xl p-5 max-w-xl mx-auto border border-indigo-500/20">
        <p className="text-indigo-300 text-sm text-center">
          <strong>Poisson&apos;s ratio (ν)</strong> = lateral strain / axial strain.
          Rubber (ν≈0.5) is nearly incompressible, so it thins a lot.
          Cork (ν≈0) barely changes width!
        </p>
      </div>

      <div className="text-center">
        <PrimaryButton onMouseDown={() => { playSound('click'); nextPhase(); }}>
          Continue →
        </PrimaryButton>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Understanding Poisson&apos;s Ratio</h2>

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 max-w-xl mx-auto border border-slate-700">
        <div className="space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">ν</div>
            <div>
              <h3 className="text-white font-semibold">Definition</h3>
              <p className="text-gray-400 text-sm">ν = -(lateral strain)/(axial strain)</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center text-white font-bold shadow-lg">0.5</div>
            <div>
              <h3 className="text-white font-semibold">Incompressible (rubber)</h3>
              <p className="text-gray-400 text-sm">Volume conserved → maximum lateral contraction</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold shadow-lg">0</div>
            <div>
              <h3 className="text-white font-semibold">Cork</h3>
              <p className="text-gray-400 text-sm">Cellular structure collapses without lateral expansion</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-indigo-900/30 rounded-2xl p-5 max-w-xl mx-auto text-center border border-indigo-500/20">
        <p className="text-indigo-300 font-semibold">Typical Values</p>
        <p className="text-gray-400 text-sm mt-2">
          Most metals: 0.25-0.35 | Rubber: ~0.5 | Cork: ~0 | Concrete: 0.1-0.2
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-4">
          Your prediction: <span className={prediction === 'thinner' ? 'text-green-400 font-semibold' : 'text-red-400'}>
            {prediction === 'thinner' ? '✓ Correct!' : '✗ Not quite'}
          </span>
        </p>
        <PrimaryButton onMouseDown={() => { playSound('click'); nextPhase(); }} variant="purple">
          But wait... →
        </PrimaryButton>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="space-y-8">
      <div className="text-center">
        <div className="text-5xl mb-4">🔄</div>
        <h2 className="text-2xl font-bold text-white mb-2">The Twist!</h2>
        <p className="text-gray-400 max-w-xl mx-auto">
          What if a material had a <span className="text-purple-400 font-semibold">NEGATIVE</span> Poisson&apos;s ratio?
          It would get <em>wider</em> when stretched! Do such materials exist?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 max-w-xl mx-auto">
        {[
          { id: 'yes', text: 'Yes! "Auxetic" materials with special structures expand when pulled', icon: '✓' },
          { id: 'no', text: 'No, negative ν violates physics - all materials must contract', icon: '✗' },
          { id: 'theory', text: 'Only in theory - impossible to manufacture', icon: '📐' },
          { id: 'liquid', text: 'Only liquids can have negative Poisson\'s ratio', icon: '💧' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            className={`p-5 rounded-2xl border-2 transition-all text-left ${
              twistPrediction === option.id
                ? 'border-purple-500 bg-purple-900/30 shadow-lg shadow-purple-500/20'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            }`}
          >
            <span className="text-2xl mr-3">{option.icon}</span>
            <span className="text-gray-200">{option.text}</span>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <div className="text-center">
          <PrimaryButton onMouseDown={() => { playSound('click'); nextPhase(); }} variant="purple">
            Test It! →
          </PrimaryButton>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Auxetic Materials</h2>

      {renderAuxeticScene()}

      <div className="max-w-xl mx-auto">
        <label className="text-gray-400 text-sm font-medium">Stretch Amount: {auxeticStretch}%</label>
        <input
          type="range"
          min="0"
          max="50"
          value={auxeticStretch}
          onChange={(e) => setAuxeticStretch(Number(e.target.value))}
          className="w-full mt-2"
        />
      </div>

      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-2xl p-5 max-w-xl mx-auto border border-purple-500/20">
        <p className="text-purple-300 text-sm text-center">
          <strong>Auxetic materials</strong> have re-entrant (inward-pointing) structures.
          When pulled, the structure unfolds and expands outward! Used in body armor,
          medical devices, and athletic shoes.
        </p>
      </div>

      <div className="text-center">
        <PrimaryButton onMouseDown={() => { playSound('click'); nextPhase(); }} variant="purple">
          Continue →
        </PrimaryButton>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Materials That Defy Intuition</h2>

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 max-w-xl mx-auto border border-slate-700">
        <p className="text-gray-300 text-center mb-5">
          Auxetic materials are <span className="text-purple-400 font-semibold">real and useful!</span>
        </p>

        <div className="space-y-4">
          <div className="bg-purple-900/40 rounded-xl p-4 border border-purple-500/20">
            <div className="text-purple-400 font-semibold">Re-entrant Structures</div>
            <div className="text-gray-400 text-sm">Honeycomb with inward-pointing cells</div>
          </div>
          <div className="bg-pink-900/40 rounded-xl p-4 border border-pink-500/20">
            <div className="text-pink-400 font-semibold">Applications</div>
            <div className="text-gray-400 text-sm">Body armor (spreads impact), medical stents, shoe soles</div>
          </div>
          <div className="bg-indigo-900/40 rounded-xl p-4 border border-indigo-500/20">
            <div className="text-indigo-400 font-semibold">Natural Examples</div>
            <div className="text-gray-400 text-sm">Some cat skin and cancellous bone show auxetic behavior!</div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-4">
          Your prediction: <span className={twistPrediction === 'yes' ? 'text-green-400 font-semibold' : 'text-red-400'}>
            {twistPrediction === 'yes' ? '✓ Correct!' : '✗ Not quite'}
          </span>
        </p>
        <PrimaryButton onMouseDown={() => { playSound('click'); nextPhase(); }} variant="pink">
          See Applications →
        </PrimaryButton>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Real-World Applications</h2>
        <p className="text-gray-400">Explore all 4 applications to unlock the quiz</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 max-w-2xl mx-auto overflow-x-auto pb-2">
        {TRANSFER_APPS.map((app, index) => (
          <button
            key={index}
            onMouseDown={(e) => { e.preventDefault(); handleAppComplete(index); }}
            className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-medium transition-all text-sm ${
              activeAppTab === index
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : completedApps.has(index)
                ? 'bg-indigo-900/40 text-indigo-300 border border-indigo-500/30'
                : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
            }`}
          >
            <span className="text-xl block mb-1">{app.icon}</span>
            <span className="block truncate">{app.title.split(' ')[0]}</span>
            {completedApps.has(index) && <span className="text-green-400 text-xs">✓</span>}
          </button>
        ))}
      </div>

      {/* Application Content */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 max-w-2xl mx-auto border border-slate-700">
        <div className="mb-4">
          {renderApplicationGraphic(activeAppTab)}
        </div>
        <h3 className="text-xl font-bold text-white mb-2">
          {TRANSFER_APPS[activeAppTab].icon} {TRANSFER_APPS[activeAppTab].title}
        </h3>
        <p className="text-gray-300">
          {TRANSFER_APPS[activeAppTab].description}
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="text-center">
        <p className="text-gray-400 mb-4">
          Applications explored: {completedApps.size}/4
        </p>
        {completedApps.size >= 4 && (
          <PrimaryButton onMouseDown={() => { playSound('click'); nextPhase(); }}>
            Take the Quiz →
          </PrimaryButton>
        )}
      </div>
    </div>
  );

  const renderTest = () => {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div className="text-center space-y-8">
          <div className="text-7xl">{passed ? '🎉' : '📚'}</div>
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Quiz Complete!</h2>
            <p className="text-xl text-gray-300">
              You scored <span className={passed ? 'text-green-400' : 'text-amber-400'}>{testScore}/10</span>
            </p>
            <p className="text-gray-500 mt-2">
              {passed ? 'Excellent! You\'ve mastered Poisson\'s ratio!' : 'Review the concepts and try again!'}
            </p>
          </div>

          {/* Show answers review */}
          <div className="space-y-4 max-w-2xl mx-auto text-left">
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} className={`p-4 rounded-xl border-2 ${isCorrect ? 'border-green-500 bg-green-900/20' : 'border-red-500 bg-red-900/20'}`}>
                  <p className="text-gray-400 text-sm mb-2 italic">{q.scenario}</p>
                  <p className="text-white font-medium mb-2">{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={opt.id} className={`py-1 px-2 rounded ${opt.correct ? 'text-green-400' : userAnswer === oIndex ? 'text-red-400' : 'text-gray-400'}`}>
                      {opt.correct ? '✓' : userAnswer === oIndex ? '✗' : '○'} ({opt.id}) {opt.label}
                    </div>
                  ))}
                  <div className="mt-3 p-3 bg-indigo-900/30 rounded-lg border border-indigo-500/20">
                    <p className="text-indigo-300 text-sm"><strong>Explanation:</strong> {q.explanation}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <PrimaryButton
            onMouseDown={() => {
              playSound(passed ? 'complete' : 'click');
              if (passed) nextPhase();
              else {
                setTestAnswers(new Array(testQuestions.length).fill(null));
                setTestSubmitted(false);
              }
            }}
            variant={passed ? 'indigo' : 'purple'}
          >
            {passed ? 'Continue to Mastery! 🎊' : 'Try Again'}
          </PrimaryButton>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Knowledge Check</h2>
          <p className="text-gray-400">Answer all 10 questions (70% to pass)</p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 max-w-xl mx-auto">
          {testQuestions.map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-all ${
                testAnswers[i] !== null ? 'bg-indigo-500' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Questions */}
        <div className="space-y-6 max-w-2xl mx-auto">
          {testQuestions.map((q, qIndex) => (
            <div
              key={qIndex}
              className={`bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border transition-all ${
                testAnswers[qIndex] !== null ? 'border-indigo-500/50' : 'border-slate-700'
              }`}
            >
              <p className="text-gray-400 text-sm mb-3 italic">{q.scenario}</p>
              <p className="text-white font-medium mb-4">
                <span className="text-indigo-400">{qIndex + 1}.</span> {q.question}
              </p>
              <div className="grid grid-cols-1 gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={option.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleTestAnswer(qIndex, oIndex);
                    }}
                    className={`p-3 rounded-xl text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? 'bg-indigo-600/30 border border-indigo-500 text-indigo-300'
                        : 'bg-slate-800 text-gray-300 hover:bg-slate-700 cursor-pointer'
                    }`}
                  >
                    <span className="font-medium text-indigo-400 mr-2">({option.id})</span>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onMouseDown={submitTest}
            disabled={testAnswers.includes(null)}
            className={`px-8 py-3 rounded-xl font-semibold transition-all ${
              testAnswers.includes(null)
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500'
            }`}
          >
            Submit Quiz
          </button>
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="text-center space-y-8">
      <div className="text-8xl animate-bounce">🏆</div>
      <div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Poisson&apos;s Ratio Master!
        </h2>
      </div>
      <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 rounded-2xl p-8 max-w-lg mx-auto border border-indigo-500/20">
        <p className="text-indigo-300 font-medium mb-4">You now understand:</p>
        <ul className="text-gray-300 text-sm space-y-3 text-left">
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Poisson&apos;s ratio = lateral strain / axial strain
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Most materials: 0 &lt; ν &lt; 0.5
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Rubber ≈ 0.5 (incompressible), Cork ≈ 0
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Auxetic materials have ν &lt; 0 (expand when stretched!)
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Real-world applications from wine bottles to body armor
          </li>
        </ul>
      </div>
      <p className="text-gray-400">
        Now you know why rubber bands get skinny when stretched! 🔗
      </p>
      <PrimaryButton
        onMouseDown={() => {
          playSound('complete');
          emitEvent('completion', { mastered: true });
        }}
      >
        Complete! 🎊
      </PrimaryButton>
    </div>
  );

  // ─── Main Render ─────────────────────────────────────────────────────────────
  const renderPhase = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Poisson&apos;s Ratio</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p, i) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  PHASES.indexOf(phase) === i
                    ? 'bg-indigo-400 w-6 shadow-lg shadow-indigo-400/30'
                    : PHASES.indexOf(phase) > i
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={p}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-indigo-400">{phase.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12 px-6">
        <div className="max-w-2xl mx-auto">
          {renderPhase()}
        </div>
      </div>
    </div>
  );
}
