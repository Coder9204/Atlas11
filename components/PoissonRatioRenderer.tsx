'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Poisson's Ratio - Complete 10-Phase Game
// Understanding how materials deform when stretched or compressed
// -----------------------------------------------------------------------------

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

interface PoissonRatioRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound utility
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
      click: { freq: 600, duration: 0.1, type: 'sine' },
      success: { freq: 800, duration: 0.2, type: 'sine' },
      failure: { freq: 300, duration: 0.3, type: 'sine' },
      transition: { freq: 500, duration: 0.15, type: 'sine' },
      complete: { freq: 900, duration: 0.4, type: 'sine' }
    };
    const sound = sounds[type];
    oscillator.frequency.value = sound.freq;
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch { /* Audio not available */ }
};

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// -----------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: 'A materials science student is learning about the fundamental properties that describe how materials deform under load.',
    question: "What does Poisson's ratio measure in a material?",
    options: [
      { id: 'a', label: 'The ratio of applied stress to resulting strain (stiffness)' },
      { id: 'b', label: 'The ratio of lateral strain to axial strain when a material is stretched or compressed', correct: true },
      { id: 'c', label: 'The maximum stress a material can withstand before fracturing' },
      { id: 'd', label: 'The rate at which a material returns to its original shape after deformation' }
    ],
    explanation: "Poisson's ratio (v) specifically measures how much a material contracts in the perpendicular direction when stretched in one direction. When you pull on a material axially, it typically gets thinner laterally. This ratio of lateral strain to axial strain is the defining characteristic that Poisson's ratio captures."
  },
  {
    scenario: "You're stretching a thick rubber band between your fingers and notice it becomes noticeably thinner as it gets longer.",
    question: 'Why does the rubber band get so much thinner when stretched compared to a steel wire?',
    options: [
      { id: 'a', label: 'Rubber has weak molecular bonds that break easily during stretching' },
      { id: 'b', label: "Rubber has a Poisson's ratio near 0.5, meaning it's nearly incompressible and must thin significantly to conserve volume", correct: true },
      { id: 'c', label: 'The air trapped inside rubber escapes when stretched, reducing its width' },
      { id: 'd', label: 'Rubber molecules align in the stretch direction, pulling away from the sides' }
    ],
    explanation: "Rubber has a Poisson's ratio of approximately 0.49-0.50, which is the theoretical maximum for isotropic materials. This high value means rubber is nearly incompressible - its volume stays almost constant. When you stretch it longer, it must become proportionally thinner to maintain the same volume, resulting in dramatic lateral contraction."
  },
  {
    scenario: 'A sommelier explains to a wine enthusiast why cork has been the preferred material for wine bottle stoppers for centuries, while rubber stoppers often cause problems.',
    question: 'What property makes cork superior to rubber for bottle stoppers?',
    options: [
      { id: 'a', label: "Cork is more chemically inert and doesn't react with wine" },
      { id: 'b', label: "Cork has a Poisson's ratio near zero, so it compresses without bulging and slides easily into bottle necks", correct: true },
      { id: 'c', label: 'Cork is naturally antimicrobial and prevents wine contamination' },
      { id: 'd', label: 'Cork is more porous and allows the wine to breathe properly' }
    ],
    explanation: "Cork has an exceptionally low Poisson's ratio (approximately 0), meaning when you compress it to insert into a bottle neck, it doesn't bulge outward. Rubber, with v near 0.5, would expand sideways when compressed, making insertion difficult and creating uneven pressure. Cork's unique cellular structure allows it to compress uniformly."
  },
  {
    scenario: 'A biomedical engineer is designing a new arterial stent that needs to expand radially when a balloon catheter stretches it lengthwise during deployment.',
    question: 'What type of material structure would allow the stent to get WIDER when pulled lengthwise?',
    options: [
      { id: 'a', label: "A material with high Young's modulus for maximum stiffness" },
      { id: 'b', label: "An auxetic material with negative Poisson's ratio that expands laterally when stretched axially", correct: true },
      { id: 'c', label: 'A superelastic shape-memory alloy that remembers its expanded shape' },
      { id: 'd', label: 'A porous foam material that traps air for expansion' }
    ],
    explanation: "Auxetic materials have a negative Poisson's ratio, meaning they exhibit the counterintuitive behavior of expanding perpendicular to the direction of stretching. This is achieved through special re-entrant (inward-folding) geometric structures that unfold and expand outward when pulled. This property is invaluable for stents that need to open up when deployed."
  },
  {
    scenario: 'An automotive engineer is designing a metal stamping die for car body panels. The steel sheet will be compressed between dies, and the final dimensions must be precise.',
    question: "Why must the engineer account for Poisson's ratio when designing the stamping die dimensions?",
    options: [
      { id: 'a', label: 'The steel will spring back after stamping due to elastic recovery' },
      { id: 'b', label: 'When compressed vertically, the steel spreads laterally due to Poisson effect, requiring oversized dies to achieve target dimensions', correct: true },
      { id: 'c', label: "The steel's hardness changes during stamping, affecting final size" },
      { id: 'd', label: 'Friction between the die and steel causes unpredictable deformation' }
    ],
    explanation: "Steel has a Poisson's ratio of about 0.3, meaning when compressed in one direction, it expands in perpendicular directions. In metal stamping, vertical compression causes the sheet to spread horizontally. Engineers must design dies accounting for this lateral expansion to achieve precise final dimensions, or the parts will be oversized."
  },
  {
    scenario: 'A researcher is studying a perfectly incompressible material (theoretical v = 0.5) being stretched to 150% of its original length in a tensile test.',
    question: 'If the material maintains constant volume during stretching, what happens to its cross-sectional area?',
    options: [
      { id: 'a', label: 'Cross-sectional area increases by 50% to match the length increase' },
      { id: 'b', label: 'Cross-sectional area remains unchanged since the material is incompressible' },
      { id: 'c', label: 'Cross-sectional area decreases to approximately 67% of original to maintain constant volume', correct: true },
      { id: 'd', label: 'Cross-sectional area decreases by 50% to exactly offset the length increase' }
    ],
    explanation: 'For an incompressible material, Volume = Length x Area must remain constant. If length increases to 1.5x original, then Area must decrease to 1/1.5 = 0.667 (about 67%) of original. This is why truly incompressible materials with v = 0.5 show such dramatic thinning when stretched - the volume conservation requirement forces significant lateral contraction.'
  },
  {
    scenario: "A geophysicist is analyzing seismic wave data from an earthquake. P-waves (compression) and S-waves (shear) travel at different speeds through rock, and these speeds depend on elastic properties.",
    question: "How does Poisson's ratio affect seismic wave propagation through Earth's crust?",
    options: [
      { id: 'a', label: "Higher Poisson's ratio increases both P-wave and S-wave speeds equally" },
      { id: 'b', label: "Poisson's ratio determines the ratio of P-wave to S-wave velocities, helping identify rock types and fluid content", correct: true },
      { id: 'c', label: "Poisson's ratio only affects wave amplitude, not velocity" },
      { id: 'd', label: "Seismic waves are unaffected by Poisson's ratio since they travel through solids" }
    ],
    explanation: "The ratio of P-wave to S-wave velocity (Vp/Vs) is directly related to Poisson's ratio through elastic wave equations. Rocks saturated with fluids have higher Poisson's ratios (approaching 0.5) and thus higher Vp/Vs ratios. Geophysicists use this relationship to identify rock types, detect fluid-filled reservoirs, and locate potential earthquake zones."
  },
  {
    scenario: "An aerospace engineer is designing a carbon fiber composite wing that must be stiff in one direction but flexible in another to optimize aerodynamic performance.",
    question: "How can fiber orientation in composite materials be used to achieve different Poisson's ratios in different directions?",
    options: [
      { id: 'a', label: "By adding metallic particles aligned with the desired direction of low Poisson's ratio" },
      { id: 'b', label: "By orienting fiber layers at specific angles, engineers can create anisotropic materials with direction-dependent Poisson's ratios, even achieving negative values", correct: true },
      { id: 'c', label: "Poisson's ratio is an intrinsic material property that cannot be modified through structural design" },
      { id: 'd', label: 'By varying the resin content between fiber layers to create density gradients' }
    ],
    explanation: "Unlike isotropic materials, composites can have different Poisson's ratios in different directions (anisotropic behavior). By carefully orienting fiber layers at specific angles (e.g., +/-45 degrees), engineers can design laminates with tailored Poisson's ratios in each direction, including negative values. This enables optimization of structural response for specific loading conditions."
  },
  {
    scenario: 'A mechanical engineer is designing a thick-walled cylindrical pressure vessel to contain high-pressure gas. The vessel walls experience complex stress states.',
    question: "Why is Poisson's ratio critical in pressure vessel design calculations?",
    options: [
      { id: 'a', label: 'It determines the color change of the material under pressure for visual inspection' },
      { id: 'b', label: 'It affects how hoop stress and axial stress interact, influencing the total strain and potential failure modes in the vessel walls', correct: true },
      { id: 'c', label: 'It only matters for determining the weight of the pressure vessel' },
      { id: 'd', label: 'It controls the rate of gas leakage through the vessel walls' }
    ],
    explanation: "In pressure vessels, walls experience simultaneous hoop (circumferential) and axial stresses. Due to Poisson's effect, strain in one direction is influenced by stress in perpendicular directions. The total hoop strain includes both direct hoop stress effects AND Poisson-coupled effects from axial stress. Accurate Poisson's ratio values are essential for predicting deformation, fatigue life, and failure pressure."
  },
  {
    scenario: 'A quality control engineer needs to verify that a batch of metal alloy meets specifications. They perform a tensile test and measure both length extension and width reduction.',
    question: "During the tensile test, the specimen extends 2.0 mm in length (original 100 mm) while its width decreases by 0.12 mm (original 20 mm). What is the Poisson's ratio?",
    options: [
      { id: 'a', label: '0.15 - the material has unusually low lateral contraction' },
      { id: 'b', label: '0.30 - consistent with typical steel or aluminum alloys', correct: true },
      { id: 'c', label: '0.45 - the material behaves almost like rubber' },
      { id: 'd', label: '0.60 - this exceeds the theoretical maximum, indicating measurement error' }
    ],
    explanation: "Poisson's ratio = -(lateral strain)/(axial strain). Axial strain = 2.0/100 = 0.020. Lateral strain = -0.12/20 = -0.006 (negative because width decreases). Therefore v = -(-0.006)/(0.020) = 0.30. This value is typical for steel (~0.30) and aluminum (~0.33), confirming the alloy meets expected mechanical behavior for these material classes."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🍾',
    title: 'Cork Stoppers',
    short: 'Near-zero Poisson ratio enables easy insertion',
    tagline: 'The perfect bottle seal since ancient times',
    description: "Cork has a uniquely low Poisson's ratio of nearly zero. When compressed to insert into a bottle neck, it doesn't bulge outward, making insertion easy while still providing an excellent seal.",
    connection: "Cork's cellular structure contains air-filled cells that collapse upon compression without forcing material sideways. This is unlike rubber which would expand laterally.",
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
    description: "Auxetic materials have negative Poisson's ratio - they expand laterally when stretched. In body armor, this means the material becomes denser and thicker at the point of impact.",
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
    description: "Rubber has a Poisson's ratio near 0.5, meaning it conserves volume. When you stretch a rubber band, it becomes dramatically thinner to maintain constant volume.",
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
    description: "When stamping metal parts, the Poisson effect causes material to spread laterally under compression. Engineers must account for this expansion to achieve precise final dimensions.",
    connection: "Steel has a Poisson's ratio of about 0.3. Stamping compression causes lateral spread of 30% of the thickness reduction, requiring die compensation.",
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

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const PoissonRatioRenderer: React.FC<PoissonRatioRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Play phase simulation state
  const [material, setMaterial] = useState<'steel' | 'rubber' | 'cork'>('steel');
  const [stretch, setStretch] = useState(0);

  // Twist phase - auxetic materials
  const [auxeticStretch, setAuxeticStretch] = useState(0);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Navigation ref
  const isNavigating = useRef(false);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get Poisson's ratio for material
  const getPoissonRatio = (mat: string): number => {
    switch (mat) {
      case 'steel': return 0.3;
      case 'rubber': return 0.49;
      case 'cork': return 0.0;
      default: return 0.3;
    }
  };

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#8B5CF6', // Purple for materials science
    accentGlow: 'rgba(139, 92, 246, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Auxetics',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'poisson-ratio',
        gameTitle: "Poisson's Ratio",
        details: { phase: p },
        timestamp: Date.now()
      });
    }
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Material Stretch Visualization
  const MaterialStretchVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 300 : 360;

    const nu = getPoissonRatio(material);
    const axialStretch = stretch / 100;
    const lateralContraction = nu * axialStretch;

    const baseWidth = 80;
    const baseHeight = 120;
    const newWidth = baseWidth * (1 - lateralContraction);
    const newHeight = baseHeight * (1 + axialStretch);

    const materialColors: Record<string, string> = {
      steel: '#6B7280',
      rubber: '#EC4899',
      cork: '#D97706'
    };

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="materialGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={materialColors[material]} stopOpacity="1" />
            <stop offset="100%" stopColor={materialColors[material]} stopOpacity="0.7" />
          </linearGradient>
        </defs>

        {/* Title */}
        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Material Deformation Under Tension
        </text>

        {/* Force arrows (top) */}
        <g transform={`translate(${width/2}, 50)`}>
          <line x1="0" y1="0" x2="0" y2="-20" stroke="#EF4444" strokeWidth="3" />
          <polygon points="-6,-15 0,-25 6,-15" fill="#EF4444" />
          <text x="15" y="-12" fill="#EF4444" fontSize="10">F</text>
        </g>

        {/* Force arrows (bottom) */}
        <g transform={`translate(${width/2}, ${height - 50})`}>
          <line x1="0" y1="0" x2="0" y2="20" stroke="#EF4444" strokeWidth="3" />
          <polygon points="-6,15 0,25 6,15" fill="#EF4444" />
          <text x="15" y="18" fill="#EF4444" fontSize="10">F</text>
        </g>

        {/* Material specimen */}
        <g transform={`translate(${width/2 - newWidth/2}, ${height/2 - newHeight/2})`}>
          <rect
            width={newWidth}
            height={newHeight}
            fill="url(#materialGrad)"
            stroke={colors.textMuted}
            strokeWidth="2"
            rx="4"
          />

          {/* Grid lines to show deformation */}
          {[...Array(5)].map((_, i) => (
            <line
              key={`h-${i}`}
              x1={0}
              y1={(i + 1) * newHeight / 6}
              x2={newWidth}
              y2={(i + 1) * newHeight / 6}
              stroke="#1F2937"
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
              stroke="#1F2937"
              strokeWidth="1"
              opacity="0.5"
            />
          ))}
        </g>

        {/* Lateral contraction arrows */}
        {stretch > 5 && nu > 0 && (
          <g>
            <line
              x1={width/2 - newWidth/2 - 25}
              y1={height/2}
              x2={width/2 - newWidth/2 - 5}
              y2={height/2}
              stroke="#3B82F6"
              strokeWidth="2"
            />
            <polygon
              points={`${width/2 - newWidth/2 - 10},${height/2 - 4} ${width/2 - newWidth/2 - 5},${height/2} ${width/2 - newWidth/2 - 10},${height/2 + 4}`}
              fill="#3B82F6"
            />
            <line
              x1={width/2 + newWidth/2 + 25}
              y1={height/2}
              x2={width/2 + newWidth/2 + 5}
              y2={height/2}
              stroke="#3B82F6"
              strokeWidth="2"
            />
            <polygon
              points={`${width/2 + newWidth/2 + 10},${height/2 - 4} ${width/2 + newWidth/2 + 5},${height/2} ${width/2 + newWidth/2 + 10},${height/2 + 4}`}
              fill="#3B82F6"
            />
            <text x={width/2} y={height/2 + 80} textAnchor="middle" fill="#3B82F6" fontSize="10">
              Lateral contraction
            </text>
          </g>
        )}

        {/* Stats panel */}
        <g transform={`translate(${width - 130}, 50)`}>
          <rect x="0" y="0" width="115" height="90" rx="8" fill={colors.bgSecondary} stroke={colors.border} strokeWidth="1" />
          <text x="57" y="20" textAnchor="middle" fill={colors.textMuted} fontSize="10">Material Properties</text>
          <text x="57" y="40" textAnchor="middle" fill={materialColors[material]} fontSize="14" fontWeight="700">
            v = {nu}
          </text>
          <text x="57" y="58" textAnchor="middle" fill={colors.textMuted} fontSize="9">
            Axial: +{(axialStretch * 100).toFixed(1)}%
          </text>
          <text x="57" y="75" textAnchor="middle" fill={colors.textMuted} fontSize="9">
            Lateral: -{(lateralContraction * 100).toFixed(1)}%
          </text>
        </g>

        {/* Dimensions */}
        <g transform={`translate(20, ${height - 40})`}>
          <text x="0" y="0" fill={colors.textMuted} fontSize="10">
            Original: {baseWidth} x {baseHeight}
          </text>
          <text x="0" y="15" fill={colors.accent} fontSize="10">
            Current: {newWidth.toFixed(1)} x {newHeight.toFixed(1)}
          </text>
        </g>
      </svg>
    );
  };

  // Auxetic Material Visualization
  const AuxeticVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 280 : 320;

    const axialStretch = auxeticStretch / 100;
    const auxeticNu = -0.5;
    const lateralExpansion = -auxeticNu * axialStretch;

    const baseWidth = 70;
    const baseHeight = 90;
    const normalNewWidth = baseWidth * (1 - 0.3 * axialStretch);
    const normalNewHeight = baseHeight * (1 + axialStretch);
    const auxeticNewWidth = baseWidth * (1 + lateralExpansion);
    const auxeticNewHeight = baseHeight * (1 + axialStretch);

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Normal vs Auxetic Material
        </text>

        {/* Normal material (left side) */}
        <g transform={`translate(${width/4}, 60)`}>
          <text x="0" y="-10" textAnchor="middle" fill={colors.textMuted} fontSize="11">Normal (v = 0.3)</text>

          {/* Force arrows */}
          <line x1="0" y1="-5" x2="0" y2="15" stroke="#EF4444" strokeWidth="2" />
          <polygon points="-4,10 0,0 4,10" fill="#EF4444" />

          <line x1="0" y1={normalNewHeight + 25} x2="0" y2={normalNewHeight + 5} stroke="#EF4444" strokeWidth="2" />
          <polygon points="-4,{normalNewHeight + 10} 0,{normalNewHeight + 20} 4,{normalNewHeight + 10}" fill="#EF4444" />

          <rect
            x={-normalNewWidth/2}
            y={15}
            width={normalNewWidth}
            height={normalNewHeight}
            fill="#6B7280"
            stroke="#9CA3AF"
            strokeWidth="2"
            rx="3"
          />

          <text x="0" y={normalNewHeight + 45} textAnchor="middle" fill={colors.textMuted} fontSize="10">
            Gets thinner
          </text>
        </g>

        {/* Auxetic material (right side) */}
        <g transform={`translate(${3*width/4}, 60)`}>
          <text x="0" y="-10" textAnchor="middle" fill="#A78BFA" fontSize="11">Auxetic (v = -0.5)</text>

          {/* Force arrows */}
          <line x1="0" y1="-5" x2="0" y2="15" stroke="#EF4444" strokeWidth="2" />
          <polygon points="-4,10 0,0 4,10" fill="#EF4444" />

          <line x1="0" y1={auxeticNewHeight + 25} x2="0" y2={auxeticNewHeight + 5} stroke="#EF4444" strokeWidth="2" />

          <rect
            x={-auxeticNewWidth/2}
            y={15}
            width={auxeticNewWidth}
            height={auxeticNewHeight}
            fill="#7C3AED"
            stroke="#A78BFA"
            strokeWidth="2"
            rx="3"
          />

          {/* Re-entrant structure hint */}
          {auxeticStretch > 10 && (
            <g opacity="0.6">
              {[...Array(3)].map((_, row) => (
                [...Array(2)].map((_, col) => {
                  const cellX = -auxeticNewWidth/2 + 15 + col * (auxeticNewWidth - 30);
                  const cellY = 20 + row * (auxeticNewHeight - 10) / 3;
                  const expand = auxeticStretch / 100;
                  return (
                    <path
                      key={`${row}-${col}`}
                      d={`M ${cellX} ${cellY + 5 - expand * 8}
                          L ${cellX + 8 + expand * 4} ${cellY}
                          L ${cellX + 8 + expand * 4} ${cellY + 12 + expand * 8}
                          L ${cellX} ${cellY + 17 + expand * 8}
                          L ${cellX - 8 - expand * 4} ${cellY + 12 + expand * 8}
                          L ${cellX - 8 - expand * 4} ${cellY}
                          Z`}
                      fill="none"
                      stroke="#C4B5FD"
                      strokeWidth="1"
                    />
                  );
                })
              ))}
            </g>
          )}

          <text x="0" y={auxeticNewHeight + 45} textAnchor="middle" fill="#A78BFA" fontSize="10">
            Gets WIDER!
          </text>
        </g>

        {/* Expansion arrows for auxetic */}
        {auxeticStretch > 10 && (
          <g transform={`translate(${3*width/4}, 60)`}>
            <line x1={-auxeticNewWidth/2 - 20} y1={15 + auxeticNewHeight/2} x2={-auxeticNewWidth/2 - 5} y2={15 + auxeticNewHeight/2} stroke="#10B981" strokeWidth="2" />
            <polygon points={`${-auxeticNewWidth/2 - 15},${10 + auxeticNewHeight/2} ${-auxeticNewWidth/2 - 20},${15 + auxeticNewHeight/2} ${-auxeticNewWidth/2 - 15},${20 + auxeticNewHeight/2}`} fill="#10B981" />

            <line x1={auxeticNewWidth/2 + 20} y1={15 + auxeticNewHeight/2} x2={auxeticNewWidth/2 + 5} y2={15 + auxeticNewHeight/2} stroke="#10B981" strokeWidth="2" />
            <polygon points={`${auxeticNewWidth/2 + 15},${10 + auxeticNewHeight/2} ${auxeticNewWidth/2 + 20},${15 + auxeticNewHeight/2} ${auxeticNewWidth/2 + 15},${20 + auxeticNewHeight/2}`} fill="#10B981" />
          </g>
        )}

        {/* Stats */}
        <text x={width/2} y={height - 20} textAnchor="middle" fill={colors.textMuted} fontSize="11">
          Stretch: {auxeticStretch}% | Auxetic expands {(lateralExpansion * 100).toFixed(1)}% laterally
        </text>
      </svg>
    );
  };

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 100,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px 0',
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #7C3AED)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🔗↔️
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          The Rubber Band Mystery
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          Stretch a rubber band and watch closely - it gets <span style={{ color: '#3B82F6' }}>longer</span> but also gets <span style={{ color: '#EC4899' }}>thinner</span>! All materials do this to varying degrees. Why?
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
            "Poisson's ratio describes how materials behave when deformed - a fundamental property that determines everything from wine cork design to body armor effectiveness."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Materials Science Principles
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Investigate the Mystery
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'It gets thinner - volume is conserved so it must contract sideways', correct: true },
      { id: 'b', text: 'Stays the same - stretching only affects length' },
      { id: 'c', text: 'It gets wider - stretching pulls atoms apart in all directions' },
      { id: 'd', text: 'It depends on the color of the rubber band' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            You stretch a rubber band to twice its length. What happens to its width?
          </h2>

          {/* Simple diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '60px',
                  height: '30px',
                  background: '#EC4899',
                  borderRadius: '4px',
                  margin: '0 auto 8px'
                }} />
                <p style={{ ...typo.small, color: colors.textMuted }}>Original</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>-&gt;</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '120px',
                  height: '???',
                  background: `${colors.accent}33`,
                  borderRadius: '4px',
                  border: `2px dashed ${colors.accent}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.accent,
                  fontSize: '18px',
                  fontWeight: 600,
                  padding: '10px'
                }}>
                  ???
                </div>
                <p style={{ ...typo.small, color: colors.textMuted }}>Stretched 2x</p>
              </div>
            </div>
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setPrediction(opt.id); }}
                style={{
                  background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                  color: prediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

          {prediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Test My Prediction
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Material Deformation Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Poisson&apos;s Ratio Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Stretch different materials and observe how they deform
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <MaterialStretchVisualization />
            </div>

            {/* Material selector */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Material</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {[
                  { id: 'steel', label: 'Steel (v=0.30)', color: '#6B7280' },
                  { id: 'rubber', label: 'Rubber (v=0.49)', color: '#EC4899' },
                  { id: 'cork', label: 'Cork (v=0.00)', color: '#D97706' },
                ].map(mat => (
                  <button
                    key={mat.id}
                    onClick={() => { playSound('click'); setMaterial(mat.id as typeof material); }}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      border: `2px solid ${material === mat.id ? mat.color : colors.border}`,
                      background: material === mat.id ? `${mat.color}22` : 'transparent',
                      color: material === mat.id ? mat.color : colors.textSecondary,
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '14px',
                    }}
                  >
                    {mat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stretch slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Axial Stretch</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{stretch}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={stretch}
                onChange={(e) => setStretch(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Formula explanation */}
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                <strong style={{ color: colors.accent }}>Poisson&apos;s Ratio (v)</strong> = -(Lateral Strain) / (Axial Strain)
              </p>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px', marginBottom: 0 }}>
                Higher v = more lateral contraction when stretched
              </p>
            </div>
          </div>

          {/* Discovery prompt */}
          {stretch > 20 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Notice how rubber thins dramatically while cork barely changes width!
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'a';

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          {/* Prediction result */}
          <div style={{
            background: wasCorrect ? `${colors.success}22` : `${colors.warning}22`,
            border: `1px solid ${wasCorrect ? colors.success : colors.warning}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: wasCorrect ? colors.success : colors.warning, margin: 0 }}>
              {wasCorrect ? '✓ Correct! Materials do get thinner when stretched.' : 'Not quite - materials actually get thinner when stretched due to volume conservation.'}
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Physics of Poisson&apos;s Ratio
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>v = -(Lateral Strain) / (Axial Strain)</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                When you stretch a material in one direction (axial), it typically contracts in the perpendicular directions (lateral). Poisson&apos;s ratio quantifies this relationship.
              </p>
              <p>
                For most materials, <span style={{ color: colors.accent }}>0 &lt; v &lt; 0.5</span>. The theoretical maximum is 0.5, which represents a perfectly incompressible material.
              </p>
            </div>
          </div>

          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
              Key Material Values
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { material: 'Rubber', value: '~0.49', color: '#EC4899' },
                { material: 'Steel', value: '~0.30', color: '#6B7280' },
                { material: 'Cork', value: '~0.00', color: '#D97706' },
              ].map(item => (
                <div key={item.material} style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: item.color }}>{item.value}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>{item.material}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>
              Why Does This Matter?
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Cork&apos;s near-zero Poisson&apos;s ratio makes it perfect for bottle stoppers - it compresses without bulging sideways. Rubber&apos;s high ratio means it thins dramatically when stretched, conserving volume like an incompressible liquid.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            But Wait - What About Negative Values?
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Yes! "Auxetic" materials with special structures expand when pulled', correct: true },
      { id: 'b', text: 'No, negative v violates physics - all materials must contract' },
      { id: 'c', text: 'Only in theory - impossible to manufacture' },
      { id: 'd', text: "Only liquids can have negative Poisson's ratio" },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              The Twist: Negative Poisson&apos;s Ratio?
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            What if a material got <span style={{ color: '#A78BFA' }}>WIDER</span> when you stretched it? Do such materials exist?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              If Poisson&apos;s ratio could be negative, stretching would cause lateral <em>expansion</em> instead of contraction...
            </p>
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  background: '#7C3AED',
                  borderRadius: '4px',
                  margin: '0 auto 8px'
                }} />
                <p style={{ ...typo.small, color: colors.textMuted }}>Original</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>-&gt;</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '100px',
                  height: '80px',
                  background: '#7C3AED',
                  borderRadius: '4px',
                  margin: '0 auto 8px',
                  opacity: 0.7
                }} />
                <p style={{ ...typo.small, color: '#A78BFA' }}>Stretched & WIDER?</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                style={{
                  background: twistPrediction === opt.id ? `${colors.warning}22` : colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
                  color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

          {twistPrediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Discover Auxetic Materials
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Auxetic Materials
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Compare normal materials with auxetic structures
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <AuxeticVisualization />
            </div>

            {/* Stretch slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Stretch Amount</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{auxeticStretch}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={auxeticStretch}
                onChange={(e) => setAuxeticStretch(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Explanation */}
            <div style={{
              background: `${colors.accent}11`,
              borderRadius: '8px',
              padding: '16px',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: '#A78BFA' }}>Auxetic materials</strong> have special re-entrant (inward-pointing) geometric structures. When pulled, these structures unfold and expand outward, creating the counterintuitive effect of getting wider when stretched!
              </p>
            </div>
          </div>

          {auxeticStretch > 20 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                The auxetic material expands laterally while normal material contracts!
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Learn About Auxetic Applications
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'a';

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          {/* Prediction result */}
          <div style={{
            background: wasCorrect ? `${colors.success}22` : `${colors.warning}22`,
            border: `1px solid ${wasCorrect ? colors.success : colors.warning}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: wasCorrect ? colors.success : colors.warning, margin: 0 }}>
              {wasCorrect ? '✓ Correct! Auxetic materials with negative Poisson\'s ratio are real!' : 'Auxetic materials are real and have many practical applications!'}
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Wonder of Auxetic Materials
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔷</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Re-entrant Structures</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Auxetic materials use honeycomb-like structures with inward-pointing cells. When stretched, these structures unfold and expand outward, defying normal material behavior.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🛡️</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Body Armor Applications</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                When struck, auxetic materials densify at the impact point, spreading force over a larger area. This makes them excellent for protective equipment and body armor.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🏥</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Medical Devices</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Arterial stents use auxetic designs to expand radially when stretched longitudinally during deployment, opening clogged arteries more effectively.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🐱</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Natural Examples</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Some cat skin and cancellous bone naturally exhibit auxetic behavior! Nature discovered this useful property long before engineers.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Real-World Applications
          </h2>

          {/* App selector */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '24px',
          }}>
            {realWorldApps.map((a, i) => (
              <button
                key={i}
                onClick={() => {
                  playSound('click');
                  setSelectedApp(i);
                  const newCompleted = [...completedApps];
                  newCompleted[i] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{
                  background: selectedApp === i ? `${a.color}22` : colors.bgCard,
                  border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                {completedApps[i] && (
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: colors.success,
                    color: 'white',
                    fontSize: '12px',
                    lineHeight: '18px',
                  }}>
                    ✓
                  </div>
                )}
                <div style={{ fontSize: '28px', marginBottom: '4px' }}>{a.icon}</div>
                <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 500 }}>
                  {a.title.split(' ').slice(0, 2).join(' ')}
                </div>
              </button>
            ))}
          </div>

          {/* Selected app details */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            borderLeft: `4px solid ${app.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '48px' }}>{app.icon}</span>
              <div>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
              </div>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              {app.description}
            </p>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                How Poisson&apos;s Ratio Connects:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                  <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Progress indicator */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <p style={{ ...typo.small, color: colors.textMuted }}>
              Explore all 4 applications to continue ({completedApps.filter(c => c).length}/4)
            </p>
          </div>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100vh',
          background: colors.bgPrimary,
          padding: '24px',
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '🏆' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? "You understand Poisson's ratio and material deformation!"
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Complete Lesson
              </button>
            ) : (
              <button
                onClick={() => {
                  setTestSubmitted(false);
                  setTestAnswers(Array(10).fill(null));
                  setCurrentQuestion(0);
                  setTestScore(0);
                  goToPhase('hook');
                }}
                style={primaryButtonStyle}
              >
                Review and Try Again
              </button>
            )}
          </div>
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          {/* Progress */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>
              Question {currentQuestion + 1} of 10
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: i === currentQuestion
                    ? colors.accent
                    : testAnswers[i]
                      ? colors.success
                      : colors.border,
                }} />
              ))}
            </div>
          </div>

          {/* Scenario */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              {question.scenario}
            </p>
          </div>

          {/* Question */}
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
            {question.question}
          </h3>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {question.options.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  playSound('click');
                  const newAnswers = [...testAnswers];
                  newAnswers[currentQuestion] = opt.id;
                  setTestAnswers(newAnswers);
                }}
                style={{
                  background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '10px',
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                  color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '24px',
                  marginRight: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.small }}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                }}
              >
                Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white',
                  cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => {
                  const score = testAnswers.reduce((acc, ans, i) => {
                    const correct = testQuestions[i].options.find(o => o.correct)?.id;
                    return acc + (ans === correct ? 1 : 0);
                  }, 0);
                  setTestScore(score);
                  setTestSubmitted(true);
                  playSound(score >= 7 ? 'complete' : 'failure');
                }}
                disabled={testAnswers.some(a => a === null)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: 'white',
                  cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Poisson&apos;s Ratio Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how materials deform when stretched or compressed - a fundamental concept in materials science and engineering.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            You Learned:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              "Poisson's ratio = lateral strain / axial strain",
              'Most materials: 0 < v < 0.5',
              'Rubber ~ 0.5 (incompressible), Cork ~ 0',
              'Auxetic materials have v < 0 (expand when stretched)',
              'Applications: wine corks to body armor',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={() => goToPhase('hook')}
            style={{
              padding: '14px 28px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.textSecondary,
              cursor: 'pointer',
            }}
          >
            Play Again
          </button>
          <a
            href="/"
            style={{
              ...primaryButtonStyle,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Return to Dashboard
          </a>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default PoissonRatioRenderer;
