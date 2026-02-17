import React, { useState, useEffect, useCallback } from 'react';

interface SuperhydrophobicRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const realWorldApps = [
  {
    icon: '🏢',
    title: 'Self-Cleaning Buildings',
    short: 'Architecture that washes itself',
    tagline: 'Let the rain do the work',
    description: 'Superhydrophobic coatings on buildings, bridges, and monuments cause water droplets to bead up and roll off, carrying dirt and pollution with them. Inspired by the lotus leaf effect.',
    connection: 'The Cassie-Baxter state traps air under water droplets on rough hydrophobic surfaces, creating contact angles above 150 degrees. Dirt particles are picked up by rolling drops.',
    howItWorks: 'Nanostructured surfaces with low surface energy chemistry create stable air pockets. Water droplets ball up and roll, gathering contaminants. Solar photocatalysts can enhance cleaning action.',
    stats: [
      { value: '150°+', label: 'Contact angle', icon: '💧' },
      { value: '70%', label: 'Cleaning cost reduction', icon: '💰' },
      { value: '10yr', label: 'Coating lifespan', icon: '⏰' }
    ],
    examples: ['Museum facades', 'Bridge cables', 'Solar panels', 'Traffic signs'],
    companies: ['Sto Corp', 'PPG Industries', 'NeverWet', 'Ultra-Ever Dry'],
    futureImpact: 'Self-healing superhydrophobic surfaces will maintain water-repellency even after abrasion, making maintenance-free infrastructure a reality.',
    color: '#3b82f6'
  },
  {
    icon: '✈️',
    title: 'Anti-Icing Surfaces',
    short: 'Preventing ice formation on aircraft',
    tagline: 'When ice wont stick',
    description: 'Superhydrophobic surfaces prevent ice accumulation by repelling water before it freezes. Aircraft wings, wind turbines, and power lines can stay ice-free without energy-intensive heating.',
    connection: 'Ice formation requires water to first wet the surface. Superhydrophobic textures prevent wetting, so water drops roll off before freezing. Even in freezing conditions, ice adhesion is dramatically reduced.',
    howItWorks: 'Nanotextured surfaces with icephobic chemistry minimize ice adhesion. Water droplets bounce off or roll away before nucleation. Any ice that does form sheds under its own weight or airflow.',
    stats: [
      { value: '90%', label: 'Ice adhesion reduction', icon: '❄️' },
      { value: '$3B', label: 'Annual de-icing costs', icon: '💰' },
      { value: '-40°C', label: 'Operating temperature', icon: '🌡️' }
    ],
    examples: ['Aircraft wings', 'Wind turbine blades', 'Power transmission lines', 'Satellite antennas'],
    companies: ['Aerospace coating companies', 'GE Renewable Energy', 'NASA', 'Rolls-Royce'],
    futureImpact: 'Durable icephobic coatings will enable renewable energy in cold climates and safer aviation without chemical de-icers that harm the environment.',
    color: '#06b6d4'
  },
  {
    icon: '👕',
    title: 'Stain-Resistant Textiles',
    short: 'Fabrics that repel spills',
    tagline: 'Spill, dont worry',
    description: 'Superhydrophobic fabric treatments cause liquids to bead up and roll off clothing and upholstery. Water, wine, and coffee slide off without leaving stains.',
    connection: 'Textile fibers coated with hydrophobic nanostructures create a Cassie state where water cannot penetrate. The fabric stays dry even under splash impacts.',
    howItWorks: 'Silane or fluoropolymer treatments create low surface energy. Nanoparticles add roughness. Air trapped between treated fibers prevents liquid infiltration. Breathability is maintained for comfort.',
    stats: [
      { value: '130°', label: 'Fabric contact angle', icon: '👔' },
      { value: '100+', label: 'Wash cycle durability', icon: '🧺' },
      { value: '40%', label: 'Less laundry needed', icon: '💧' }
    ],
    examples: ['Dress shirts', 'Outdoor gear', 'Medical scrubs', 'Automotive interiors'],
    companies: ['Nanotex', 'Schoeller', 'HeiQ', 'Nano-Tex'],
    futureImpact: 'Eco-friendly superhydrophobic treatments using plant-based chemistry will provide stain resistance without persistent fluorinated compounds.',
    color: '#8b5cf6'
  },
  {
    icon: '🚢',
    title: 'Drag-Reducing Ship Hulls',
    short: 'Saving fuel through surface engineering',
    tagline: 'Slipping through the water',
    description: 'Superhydrophobic ship hull coatings trap a thin air layer underwater, reducing friction between the hull and water. This can significantly reduce fuel consumption for maritime vessels.',
    connection: 'The plastron (air layer) trapped by superhydrophobic surfaces acts as a slip boundary. Water flows over air rather than directly touching the hull, reducing drag.',
    howItWorks: 'Hierarchical textures trap stable air pockets. Special geometries prevent air dissolution. The lubricating air layer reduces skin friction by up to 30%. Coatings also prevent biofouling.',
    stats: [
      { value: '10-30%', label: 'Drag reduction', icon: '⛽' },
      { value: '$50B', label: 'Annual shipping fuel', icon: '💰' },
      { value: '3%', label: 'Global CO2 from shipping', icon: '🌍' }
    ],
    examples: ['Container ships', 'Tankers', 'Navy vessels', 'Racing yachts'],
    companies: ['International Paint', 'Jotun', 'Hempel', 'PPG Marine'],
    futureImpact: 'Durable underwater superhydrophobic coatings could reduce shipping emissions by millions of tons annually, with major climate benefits.',
    color: '#22c55e'
  }
];

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: 'rgba(148,163,184,0.7)',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#06b6d4',
  accentGlow: 'rgba(6, 182, 212, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  water: '#3b82f6',
  waterLight: '#60a5fa',
  surface: '#64748b',
  air: '#e0f2fe',
};

const PHASE_ORDER = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'] as const;

const SuperhydrophobicRenderer: React.FC<SuperhydrophobicRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [surfaceRoughness, setSurfaceRoughness] = useState(0.8);
  const [surfaceChemistry, setSurfaceChemistry] = useState<'hydrophilic' | 'hydrophobic' | 'superhydrophobic'>('superhydrophobic');
  const [hasDetergent, setHasDetergent] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dropletPosition, setDropletPosition] = useState({ x: 200, y: 120 });
  const [dropletVelocity, setDropletVelocity] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTransferApp, setCurrentTransferApp] = useState(0);
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [internalPhase, setInternalPhase] = useState(phase || 'hook');

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync internal phase with prop
  useEffect(() => {
    setInternalPhase(phase || 'hook');
  }, [phase]);

  // Get current phase index
  const currentPhaseIndex = PHASE_ORDER.indexOf(internalPhase as typeof PHASE_ORDER[number]);

  // Navigate to next phase
  const goToNextPhase = () => {
    if (currentPhaseIndex < PHASE_ORDER.length - 1) {
      setInternalPhase(PHASE_ORDER[currentPhaseIndex + 1]);
    }
    if (onPhaseComplete) {
      onPhaseComplete();
    }
  };

  // Navigate to previous phase
  const goToPrevPhase = () => {
    if (currentPhaseIndex > 0) {
      setInternalPhase(PHASE_ORDER[currentPhaseIndex - 1]);
    }
  };

  // Navigate to specific phase
  const goToPhase = (index: number) => {
    if (index >= 0 && index < PHASE_ORDER.length) {
      setInternalPhase(PHASE_ORDER[index]);
    }
  };

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

  // Calculate contact angle based on surface properties
  const calculateContactAngle = useCallback(() => {
    if (hasDetergent) {
      // Detergent reduces surface tension, causing wetting
      return 30 + Math.random() * 20;
    }

    const baseAngle = {
      'hydrophilic': 30,
      'hydrophobic': 100,
      'superhydrophobic': 150,
    }[surfaceChemistry];

    // Cassie-Baxter effect: roughness amplifies the intrinsic wettability
    const roughnessEffect = surfaceChemistry === 'superhydrophobic'
      ? surfaceRoughness * 20
      : surfaceChemistry === 'hydrophobic'
        ? surfaceRoughness * 10
        : -surfaceRoughness * 10;

    return Math.min(175, Math.max(10, baseAngle + roughnessEffect));
  }, [surfaceRoughness, surfaceChemistry, hasDetergent]);

  const contactAngle = calculateContactAngle();

  // Animation for rolling droplet
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setDropletPosition(prev => {
        const rollSpeed = contactAngle > 150 ? 3 : contactAngle > 90 ? 1 : 0.2;
        const newX = prev.x + rollSpeed;
        if (newX > 380) {
          return { x: 20, y: prev.y };
        }
        return { x: newX, y: prev.y };
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isAnimating, contactAngle]);

  const predictions = [
    { id: 'flat', label: 'Water spreads flat like on glass - low contact angle' },
    { id: 'slight', label: 'Water forms slight beads - moderate contact angle' },
    { id: 'ball', label: 'Water balls up into near-perfect spheres that roll easily' },
    { id: 'absorb', label: 'The surface absorbs the water completely' },
  ];

  const twistPredictions = [
    { id: 'nothing', label: 'Nothing changes - detergent only affects dirty water' },
    { id: 'stronger', label: 'The beading becomes even stronger' },
    { id: 'collapse', label: 'The beading collapses - water spreads and wets the surface' },
    { id: 'color', label: 'The water changes color' },
  ];

  const transferApplications = [
    {
      title: 'Self-Cleaning Surfaces',
      description: 'Building facades and solar panels use superhydrophobic coatings developed by companies like NeverWet and PPG Industries. When rain hits, dirt particles are picked up by rolling water droplets and carried away. Studies show 70% reduction in cleaning costs and contact angles exceeding 150 degrees. The lotus effect has been replicated in over 200 commercial products worldwide.',
      question: 'Why do superhydrophobic surfaces stay cleaner than regular surfaces?',
      answer: 'Water droplets on superhydrophobic surfaces roll instead of sliding. As they roll, they pick up dirt particles (which adhere better to water than to the low-energy surface), carrying debris away - the "lotus effect." Contact angles above 150° mean minimal surface contact and maximum rolling mobility.',
    },
    {
      title: 'Water-Repellent Fabrics',
      description: 'Gore-Tex and similar materials from companies like Nanotex and HeiQ use micro/nano texture plus hydrophobic chemistry to repel water while allowing vapor to pass through. Modern treatments achieve 130° contact angles with 100+ wash cycle durability. The global market for waterproof breathable fabrics exceeded $2.5 billion in 2023.',
      question: 'How do breathable waterproof fabrics work?',
      answer: 'The fabric has pores large enough for water vapor molecules to pass (sweat evaporation) but the hydrophobic surface prevents liquid water droplets from entering. The contact angle keeps droplets from penetrating the texture while vapor molecules are small enough to slip through.',
    },
    {
      title: 'Anti-Icing Coatings',
      description: 'Aircraft manufacturers, GE Renewable Energy, and NASA use superhydrophobic coatings to prevent ice accumulation on wings, wind turbine blades, and power lines. These surfaces achieve 90% reduction in ice adhesion strength and operate at temperatures down to -40°C. The global de-icing market is worth $3 billion annually - superhydrophobic coatings could eliminate most of this cost.',
      question: 'Why do superhydrophobic surfaces resist ice formation?',
      answer: 'Water has minimal contact with the surface, so it either rolls off before freezing or freezes with minimal adhesion. The air pockets in the texture also act as thermal insulators, slowing heat transfer and delaying nucleation by 5-10 degrees.',
    },
    {
      title: 'Lotus Leaves in Nature',
      description: 'The lotus leaf (Nelumbo nucifera) achieves contact angles of 160-170° using waxy micro-bumps (20-40 micrometers) covered with nano-pillars (1-2 nanometers). This hierarchical structure keeps the leaf clean in muddy water at just a 2-degree tilt angle. Scientists have identified this mechanism in over 340 plant species, including rice leaves (157°) and butterfly wings.',
      question: 'What makes the lotus leaf "self-cleaning"?',
      answer: 'Hierarchical roughness (micro + nano features) plus waxy chemistry creates a Cassie-Baxter state where water sits on air pockets. The extremely low adhesion (rolling angle under 2 degrees) lets droplets collect any particles, removing 95%+ of contaminants with each drop.',
    },
  ];

  const testQuestions = [
    {
      question: 'Scenario: You drop water on two surfaces. On Surface A, the droplet spreads into a thin film. On Surface B, the droplet forms a tall sphere. Which surface is superhydrophobic?',
      options: [
        { text: 'Surface A - the water spreads showing high contact area', correct: false },
        { text: 'Surface B - the spherical droplet indicates contact angle above 150°', correct: true },
        { text: 'Both surfaces - all smooth surfaces are hydrophobic', correct: false },
        { text: 'Neither - superhydrophobic requires water to bounce off', correct: false },
      ],
    },
    {
      question: 'Scenario: A lotus leaf in a muddy pond stays perfectly clean while a regular leaf gets coated in mud. What two features combine to create this self-cleaning effect?',
      options: [
        { text: 'High temperature and pressure from the leaf cells', correct: false },
        { text: 'Surface texture (micro/nano roughness) and low surface energy chemistry', correct: true },
        { text: 'Electrical charge and magnetic repulsion', correct: false },
        { text: 'Smooth surface coating and high surface tension', correct: false },
      ],
    },
    {
      question: 'Scenario: In the Cassie-Baxter state, a water droplet on a textured surface appears to "float." What is physically happening underneath the droplet?',
      options: [
        { text: 'Water completely fills and wets the surface texture', correct: false },
        { text: 'Air pockets are trapped in the texture - the droplet sits on air cushions', correct: true },
        { text: 'The droplet absorbs into the material at the nano level', correct: false },
        { text: 'Chemical bonds form between water and surface atoms', correct: false },
      ],
    },
    {
      question: 'Scenario: A perfectly superhydrophobic surface is tested, then a tiny drop of dish soap is added to the water. The contact angle drops from 160° to 35°. What caused this?',
      options: [
        { text: 'The soap heated the water, changing its density', correct: false },
        { text: 'The soap changed the water color making it absorb more', correct: false },
        { text: 'The soap (surfactant) lowered water surface tension, allowing it to wet the texture', correct: true },
        { text: 'The soap made the water molecules heavier', correct: false },
      ],
    },
    {
      question: 'Young\'s equation (cos θ = (γSV - γSL) / γLV) relates contact angle to surface tensions. What does γLV represent?',
      options: [
        { text: 'Temperature and pressure at the contact line', correct: false },
        { text: 'The liquid-vapor interface surface tension', correct: true },
        { text: 'Water volume divided by droplet size', correct: false },
        { text: 'Gravitational constant times air resistance', correct: false },
      ],
    },
    {
      question: 'Scenario: A hydrophobic surface (contact angle 100°) has nano-texture added. The new contact angle is 155°. What physics explains this amplification?',
      options: [
        { text: 'Roughness makes the surface more hydrophilic', correct: false },
        { text: 'Roughness has no effect on wettability - other factors changed', correct: false },
        { text: 'The Cassie-Baxter effect: roughness amplifies the hydrophobic chemistry', correct: true },
        { text: 'Only the color of the surface changed due to texture', correct: false },
      ],
    },
    {
      question: 'Scenario: You observe that water droplets on a lotus leaf roll off with only a 2-degree tilt, while droplets on a waxy surface need a 30-degree tilt. What explains the lotus leaf\'s advantage?',
      options: [
        { text: 'The lotus leaf surface is tilted at a steep angle naturally', correct: false },
        { text: 'Minimal contact area from air pockets means extremely low adhesion', correct: true },
        { text: 'Lotus leaf water is lighter than tap water', correct: false },
        { text: 'Magnetic forces in the lotus leaf repel water', correct: false },
      ],
    },
    {
      question: 'A company wants superhydrophobic solar panels that stay clean. Rolling droplets carry away dust particles because:',
      options: [
        { text: 'The panel surface absorbs and neutralizes dirt', correct: false },
        { text: 'Rolling droplets pick up and carry away particles as they move', correct: true },
        { text: 'Chemical reactions on the surface destroy the dirt', correct: false },
        { text: 'UV light from the sun sterilizes the surface', correct: false },
      ],
    },
    {
      question: 'Hierarchical surface structure (like the lotus leaf) means:',
      options: [
        { text: 'Multiple scales of texture working together: micro bumps + nano pillars', correct: true },
        { text: 'A completely smooth surface at all scales', correct: false },
        { text: 'Only microscale roughness with no nano features', correct: false },
        { text: 'A surface that changes structure over time', correct: false },
      ],
    },
    {
      question: 'Scenario: An engineer coats aircraft wings superhydrophobically, but after months of use the ice-repellency fails. The Cassie-Baxter state transitioned to Wenzel state. What happened?',
      options: [
        { text: 'Wenzel to Cassie-Baxter transition - air pockets multiplied', correct: false },
        { text: 'Cassie-Baxter to Wenzel transition - air pockets collapsed, water filled texture', correct: true },
        { text: 'Solid to liquid phase change in the coating', correct: false },
        { text: 'Color change of the surface destroyed the effect', correct: false },
      ],
    },
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  // Premium SVG Defs for realistic graphics
  const renderSVGDefs = () => (
    <defs>
      {/* === LINEAR GRADIENTS FOR DEPTH === */}

      {/* Premium water droplet gradient - vertical depth */}
      <linearGradient id="shphobWaterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.95" />
        <stop offset="25%" stopColor="#60a5fa" stopOpacity="0.9" />
        <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.85" />
        <stop offset="75%" stopColor="#2563eb" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.95" />
      </linearGradient>

      {/* Sky/background gradient */}
      <linearGradient id="shphobSkyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#1e3a5f" />
        <stop offset="30%" stopColor="#0f2847" />
        <stop offset="60%" stopColor="#0c1e36" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>

      {/* Lotus leaf surface gradient - organic green tones */}
      <linearGradient id="shphobLotusSurface" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#166534" />
        <stop offset="25%" stopColor="#15803d" />
        <stop offset="50%" stopColor="#16a34a" />
        <stop offset="75%" stopColor="#15803d" />
        <stop offset="100%" stopColor="#14532d" />
      </linearGradient>

      {/* Micro-pillar gradient for 3D pillars */}
      <linearGradient id="shphobPillarGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#22c55e" />
        <stop offset="30%" stopColor="#16a34a" />
        <stop offset="70%" stopColor="#15803d" />
        <stop offset="100%" stopColor="#166534" />
      </linearGradient>

      {/* Air pocket gradient - ethereal blue */}
      <linearGradient id="shphobAirPocket" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.6" />
        <stop offset="50%" stopColor="#bae6fd" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.2" />
      </linearGradient>

      {/* Contact angle arc gradient */}
      <linearGradient id="shphobAngleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="50%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>

      {/* Grid line gradient */}
      <linearGradient id="shphobGridGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.3" />
      </linearGradient>

      {/* === RADIAL GRADIENTS FOR 3D EFFECTS === */}

      {/* Water droplet 3D sphere effect */}
      <radialGradient id="shphobDroplet3D" cx="35%" cy="25%" r="65%" fx="30%" fy="20%">
        <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.95" />
        <stop offset="20%" stopColor="#93c5fd" stopOpacity="0.9" />
        <stop offset="45%" stopColor="#60a5fa" stopOpacity="0.85" />
        <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#1e40af" stopOpacity="0.95" />
      </radialGradient>

      {/* Droplet highlight - specular reflection */}
      <radialGradient id="shphobHighlight" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
        <stop offset="50%" stopColor="#ffffff" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>

      {/* Secondary highlight for realism */}
      <radialGradient id="shphobHighlight2" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
        <stop offset="70%" stopColor="#ffffff" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>

      {/* Pillar top glow */}
      <radialGradient id="shphobPillarTop" cx="50%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#4ade80" />
        <stop offset="60%" stopColor="#22c55e" />
        <stop offset="100%" stopColor="#16a34a" />
      </radialGradient>

      {/* Detergent effect - spreading water */}
      <radialGradient id="shphobDetergentWater" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.7" />
        <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#2563eb" stopOpacity="0.3" />
      </radialGradient>

      {/* === GLOW FILTERS === */}

      {/* Water droplet glow filter */}
      <filter id="shphobDropletGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
        <feFlood floodColor="#3b82f6" floodOpacity="0.5" />
        <feComposite in2="blur" operator="in" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Highlight glow for specular reflections */}
      <filter id="shphobHighlightGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Air pocket shimmer */}
      <filter id="shphobAirShimmer" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
        <feFlood floodColor="#e0f2fe" floodOpacity="0.3" />
        <feComposite in2="blur" operator="in" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Contact angle indicator glow */}
      <filter id="shphobAngleGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
        <feFlood floodColor="#fbbf24" floodOpacity="0.6" />
        <feComposite in2="blur" operator="in" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Surface texture shadow */}
      <filter id="shphobSurfaceShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.3" />
      </filter>

      {/* Label background blur */}
      <filter id="shphobLabelBg" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
      </filter>

      {/* Interactive point glow filter */}
      <filter id="shphobInteractivePoint" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
        <feFlood floodColor="#06b6d4" floodOpacity="0.8" />
        <feComposite in2="blur" operator="in" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );

  const renderDroplet = (cx: number, cy: number, radius: number, angle: number, showMicrostructure: boolean = false) => {
    // Calculate droplet shape based on contact angle
    const angleRad = (angle * Math.PI) / 180;

    // For high contact angles, droplet is more spherical
    // Contact angle > 150 = nearly perfect sphere (superhydrophobic)
    // Contact angle < 90 = flat spreading (hydrophilic)
    const heightRatio = angle > 90 ? 1 - (180 - angle) / 180 : 0.3 + angle / 300;
    const width = radius;
    const height = radius * heightRatio * 1.5;

    // Droplet base position (where it touches surface)
    const dropletBaseY = cy;
    const dropletCenterY = cy - height / 2;

    return (
      <g>
        {/* Droplet shadow on surface */}
        <ellipse
          cx={cx}
          cy={dropletBaseY + 2}
          rx={width * 0.8}
          ry={4}
          fill="rgba(0, 0, 0, 0.3)"
          filter="url(#shphobLabelBg)"
        />

        {/* Main droplet body with 3D radial gradient */}
        <ellipse
          cx={cx}
          cy={dropletCenterY}
          rx={width}
          ry={height}
          fill="url(#shphobDroplet3D)"
          filter="url(#shphobDropletGlow)"
        />

        {/* Internal refraction effect */}
        <ellipse
          cx={cx + width * 0.1}
          cy={dropletCenterY + height * 0.2}
          rx={width * 0.6}
          ry={height * 0.5}
          fill="url(#shphobWaterGradient)"
          opacity="0.3"
        />

        {/* Primary specular highlight (top-left) */}
        <ellipse
          cx={cx - width * 0.35}
          cy={dropletCenterY - height * 0.4}
          rx={width * 0.25}
          ry={height * 0.2}
          fill="url(#shphobHighlight)"
          filter="url(#shphobHighlightGlow)"
        />

        {/* Secondary highlight (smaller, more intense) */}
        <ellipse
          cx={cx - width * 0.25}
          cy={dropletCenterY - height * 0.5}
          rx={width * 0.12}
          ry={height * 0.08}
          fill="url(#shphobHighlight2)"
          opacity="0.9"
        />

        {/* Interactive marker: rim light effect with glow */}
        <circle
          cx={cx + width * 0.3}
          cy={dropletCenterY + height * 0.1}
          r={10}
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          filter="url(#shphobInteractivePoint)"
          opacity="0.6"
        />

        {/* Contact angle visualization */}
        <g filter="url(#shphobAngleGlow)">
          {/* Surface line (reference) */}
          <line
            x1={cx - 35}
            y1={dropletBaseY}
            x2={cx + 35}
            y2={dropletBaseY}
            stroke="rgba(255, 255, 255, 0.6)"
            strokeWidth="1.5"
            strokeDasharray="4,2"
          />

          {/* Contact angle arc */}
          <path
            d={`M ${cx + 25} ${dropletBaseY} A 25 25 0 0 0 ${cx + 25 * Math.cos(Math.PI - angleRad)} ${dropletBaseY - 25 * Math.sin(Math.PI - angleRad)}`}
            stroke="url(#shphobAngleGradient)"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />

          {/* Angle indicator line along droplet tangent */}
          <line
            x1={cx}
            y1={dropletBaseY}
            x2={cx + 30 * Math.cos(Math.PI - angleRad)}
            y2={dropletBaseY - 30 * Math.sin(Math.PI - angleRad)}
            stroke={colors.warning}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      </g>
    );
  };

  const renderSurface = (showMicrostructure: boolean, roughness: number) => {
    const width = 400;
    const surfaceY = 200;
    const elements: JSX.Element[] = [];

    // Grid lines for reference - dashed
    for (let i = 1; i <= 3; i++) {
      elements.push(
        <line
          key={`grid-h-${i}`}
          x1={0}
          y1={surfaceY - i * 50}
          x2={width}
          y2={surfaceY - i * 50}
          stroke="#94a3b8"
          strokeWidth="0.5"
          strokeDasharray="4 4"
          opacity="0.3"
        />
      );
    }

    // Base substrate with gradient
    elements.push(
      <rect
        key="substrate"
        x={0}
        y={surfaceY}
        width={width}
        height={60}
        fill="url(#shphobLotusSurface)"
        filter="url(#shphobSurfaceShadow)"
      />
    );

    // Add subtle texture pattern to base
    for (let i = 0; i < 20; i++) {
      elements.push(
        <line
          key={`texture-${i}`}
          x1={i * 20}
          y1={surfaceY + 5}
          x2={i * 20 + 10}
          y2={surfaceY + 55}
          stroke="rgba(0, 0, 0, 0.1)"
          strokeWidth="1"
        />
      );
    }

    if (showMicrostructure && roughness > 0.3) {
      // Render premium micro-pillars with 3D effect
      const numPillars = Math.floor(25 + roughness * 25);
      const basePillarWidth = 7 - roughness * 2;
      const basePillarHeight = 10 + roughness * 18;
      const spacing = (width - 40) / numPillars;

      // Air pockets layer (behind pillars)
      if (surfaceChemistry === 'superhydrophobic' && !hasDetergent) {
        for (let i = 1; i < numPillars; i++) {
          const x = 20 + i * spacing;
          const h = basePillarHeight * (0.85 + Math.random() * 0.3);

          elements.push(
            <rect
              key={`air-${i}`}
              x={x - spacing + basePillarWidth / 2 + 1}
              y={surfaceY - h + 3}
              width={spacing - basePillarWidth - 2}
              height={h - 5}
              fill="url(#shphobAirPocket)"
              filter="url(#shphobAirShimmer)"
              rx="1"
            />
          );
        }

        // Add shimmer particles in air pockets
        for (let i = 0; i < 15; i++) {
          const x = 30 + Math.random() * (width - 60);
          const y = surfaceY - basePillarHeight * 0.5 + Math.random() * basePillarHeight * 0.3;
          elements.push(
            <circle
              key={`shimmer-${i}`}
              cx={x}
              cy={y}
              r={0.8}
              fill="rgba(255, 255, 255, 0.6)"
            />
          );
        }
      }

      // Wetted state (detergent added) - water fills the texture
      if (hasDetergent) {
        elements.push(
          <rect
            key="wetted-water"
            x={10}
            y={surfaceY - basePillarHeight - 5}
            width={width - 20}
            height={basePillarHeight + 5}
            fill="url(#shphobDetergentWater)"
            rx="2"
          />
        );
      }

      // Render micro-pillars with 3D gradient
      for (let i = 0; i < numPillars; i++) {
        const x = 20 + i * spacing;
        const h = basePillarHeight * (0.85 + Math.random() * 0.3);
        const w = basePillarWidth * (0.9 + Math.random() * 0.2);

        // Pillar shadow
        elements.push(
          <rect
            key={`pillar-shadow-${i}`}
            x={x - w / 2 + 1}
            y={surfaceY - h + 1}
            width={w}
            height={h}
            fill="rgba(0, 0, 0, 0.3)"
            rx="1"
          />
        );

        // Main pillar body with gradient
        elements.push(
          <rect
            key={`pillar-${i}`}
            x={x - w / 2}
            y={surfaceY - h}
            width={w}
            height={h}
            fill="url(#shphobPillarGradient)"
            stroke="#15803d"
            strokeWidth={0.5}
            rx="1"
          />
        );

        // Pillar top highlight
        elements.push(
          <ellipse
            key={`pillar-top-${i}`}
            cx={x}
            cy={surfaceY - h + 1}
            rx={w / 2 - 0.5}
            ry={1.5}
            fill="url(#shphobPillarTop)"
          />
        );

        // Side highlight for 3D effect
        elements.push(
          <rect
            key={`pillar-highlight-${i}`}
            x={x - w / 2}
            y={surfaceY - h}
            width={w * 0.3}
            height={h}
            fill="rgba(255, 255, 255, 0.15)"
            rx="1"
          />
        );
      }

      // Nano-scale bumps on pillar tops (hierarchical structure)
      if (roughness > 0.5) {
        for (let i = 0; i < numPillars * 2; i++) {
          const pillarIdx = Math.floor(i / 2);
          const x = 20 + pillarIdx * spacing + (i % 2 === 0 ? -1.5 : 1.5);
          const h = basePillarHeight * (0.85 + (pillarIdx % 3) * 0.1);

          elements.push(
            <circle
              key={`nano-${i}`}
              cx={x}
              cy={surfaceY - h - 1}
              r={1}
              fill="#4ade80"
              opacity="0.7"
            />
          );
        }
      }
    }

    return <g>{elements}</g>;
  };

  const renderVisualization = (interactive: boolean, showMicrostructure: boolean = false) => {
    const width = 400;
    const height = 300;

    // Determine state color and text
    const getStateInfo = () => {
      if (hasDetergent) return { color: colors.error, text: 'Wenzel (Wetted)', icon: '💧' };
      if (contactAngle > 150) return { color: colors.success, text: 'Cassie-Baxter', icon: '🌿' };
      if (contactAngle > 90) return { color: colors.warning, text: 'Hydrophobic', icon: '💦' };
      return { color: colors.error, text: 'Wenzel', icon: '🌊' };
    };

    const stateInfo = getStateInfo();

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            background: 'linear-gradient(180deg, #1e3a5f 0%, #0f2847 40%, #0f172a 100%)',
            borderRadius: '12px',
            maxWidth: '500px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
          }}
        >
          {/* Premium SVG Definitions */}
          {renderSVGDefs()}

          {/* Ambient light effect at top */}
          <ellipse
            cx={200}
            cy={-50}
            rx={250}
            ry={100}
            fill="url(#shphobSkyGradient)"
            opacity="0.3"
          />

          {/* Surface */}
          {renderSurface(showMicrostructure, surfaceRoughness)}

          {/* Droplet */}
          {renderDroplet(
            interactive ? dropletPosition.x : 200,
            200,
            25,
            contactAngle,
            showMicrostructure
          )}

          {/* Combined Status Display - Single box to avoid overlap */}
          <g transform="translate(8, 8)">
            <rect
              x={0}
              y={0}
              width={384}
              height={70}
              rx={10}
              fill="rgba(0, 0, 0, 0.75)"
              stroke="rgba(100, 116, 139, 0.5)"
              strokeWidth="1.5"
            />

            {/* Left Section: Surface State */}
            <text x={10} y={18} fill={colors.textMuted} fontSize={11} fontWeight="500">
              SURFACE STATE
            </text>
            <text x={10} y={38} fill={stateInfo.color} fontSize={12} fontWeight="bold">
              {stateInfo.text}
            </text>
            <text x={10} y={56} fill={colors.textMuted} fontSize={11}>
              {hasDetergent ? 'Air collapsed' : contactAngle > 150 ? 'Air trapped' : 'Partial wet'}
            </text>

            {/* Center Section: Contact Angle */}
            <text x={192} y={18} fill={colors.textMuted} fontSize={11} textAnchor="middle" fontWeight="500">
              CONTACT ANGLE
            </text>
            <text
              x={192}
              y={46}
              fill={contactAngle > 150 ? colors.success : contactAngle > 90 ? colors.warning : colors.error}
              fontSize={24}
              fontWeight="bold"
              textAnchor="middle"
            >
              {contactAngle.toFixed(0)}°
            </text>
            <text x={192} y={62} fill={colors.textMuted} fontSize={11} textAnchor="middle">
              {contactAngle > 150 ? 'Superhydrophobic' : contactAngle > 90 ? 'Hydrophobic' : 'Hydrophilic'}
            </text>

            {/* Right Section: Water Behavior */}
            <text x={374} y={18} fill={colors.textMuted} fontSize={11} textAnchor="end" fontWeight="500">
              BEHAVIOR
            </text>
            <text x={374} y={40} fill={interactive && contactAngle > 150 && !hasDetergent ? colors.success : colors.textMuted} fontSize={12} fontWeight="bold" textAnchor="end">
              {interactive && contactAngle > 150 && !hasDetergent ? 'ROLLING' : hasDetergent ? 'WETTING' : contactAngle > 90 ? 'BEADING' : 'SPREADING'}
            </text>
            <text x={374} y={58} fill={colors.textMuted} fontSize={11} textAnchor="end">
              {surfaceChemistry === 'superhydrophobic' ? 'Super' : surfaceChemistry === 'hydrophobic' ? 'Hydrophobic' : 'Hydrophilic'}
            </text>
          </g>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating
                  ? `linear-gradient(135deg, ${colors.error}, #dc2626)`
                  : `linear-gradient(135deg, ${colors.success}, #059669)`,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {isAnimating ? 'Stop Rolling' : 'Roll Droplet'}
            </button>
            <button
              onClick={() => {
                setSurfaceRoughness(0.8);
                setSurfaceChemistry('superhydrophobic');
                setHasDetergent(false);
                setDropletPosition({ x: 200, y: 120 });
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: '600' }}>
          Surface Roughness (nano-texture density): <span style={{ color: colors.accent, fontWeight: 'bold' }}>{surfaceRoughness.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={surfaceRoughness}
          onChange={(e) => setSurfaceRoughness(parseFloat(e.target.value))}
          style={{
            width: '100%',
            height: '20px',
            touchAction: 'pan-y',
            WebkitAppearance: 'none',
            accentColor: '#3b82f6'
          }}
        />
        <div style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
          Higher roughness amplifies the Cassie-Baxter effect - more air pockets trapped
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: '600' }}>
          Surface Chemistry (determines base hydrophobicity)
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['hydrophilic', 'hydrophobic', 'superhydrophobic'] as const).map((chem) => (
            <button
              key={chem}
              onClick={() => setSurfaceChemistry(chem)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: surfaceChemistry === chem ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                background: surfaceChemistry === chem
                  ? `linear-gradient(135deg, rgba(6,182,212,0.3), rgba(6,182,212,0.15))`
                  : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: surfaceChemistry === chem ? 'bold' : 'normal',
              }}
            >
              {chem.charAt(0).toUpperCase() + chem.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        background: 'rgba(6, 182, 212, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: '600' }}>
          Contact Angle: {contactAngle.toFixed(0)}° — {contactAngle > 150 ? 'Superhydrophobic (Cassie-Baxter state)' : contactAngle > 90 ? 'Hydrophobic (partial wetting)' : 'Hydrophilic (full wetting)'}
        </div>
        <div style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
          Higher roughness + low surface energy chemistry = higher contact angle
        </div>
      </div>
    </div>
  );

  // Render progress bar
  const renderProgressBar = () => (
    <div
      role="progressbar"
      aria-valuenow={currentPhaseIndex + 1}
      aria-valuemin={1}
      aria-valuemax={PHASE_ORDER.length}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: 'rgba(255,255,255,0.1)',
        zIndex: 1001,
      }}
    >
      <div style={{
        height: '100%',
        width: `${((currentPhaseIndex + 1) / PHASE_ORDER.length) * 100}%`,
        background: colors.accent,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Render navigation bar with dots
  const renderNavBar = () => {
    const getPhaseLabel = (p: string): string => {
      if (p === 'hook') return 'explore phase';
      if (p === 'predict') return 'experiment phase';
      if (p === 'play') return 'experiment phase 2';
      if (p === 'review') return 'experiment review phase';
      if (p === 'twist_predict') return 'quiz phase predict';
      if (p === 'twist_play') return 'quiz phase play';
      if (p === 'twist_review') return 'quiz phase review';
      if (p === 'transfer') return 'apply phase';
      if (p === 'test') return 'transfer phase test';
      if (p === 'mastery') return 'transfer phase mastery';
      return 'explore phase';
    };

    return (
      <nav
        aria-label="Game navigation"
        style={{
          position: 'fixed',
          top: '4px',
          left: 0,
          right: 0,
          padding: '12px 24px',
          background: colors.bgDark,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          zIndex: 1000,
        }}
      >
        {PHASE_ORDER.map((p, index) => (
          <button
            key={p}
            onClick={() => goToPhase(index)}
            aria-label={getPhaseLabel(p)}
            aria-current={index === currentPhaseIndex ? 'step' : undefined}
            style={{
              width: '12px',
              height: '12px',
              minHeight: '12px',
              borderRadius: '50%',
              border: 'none',
              background: index === currentPhaseIndex
                ? colors.accent
                : index < currentPhaseIndex
                  ? colors.success
                  : 'rgba(148,163,184,0.7)',
              cursor: 'pointer',
              padding: 0,
              transition: 'all 0.2s ease',
            }}
          />
        ))}
      </nav>
    );
  };

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <button
        onClick={goToPrevPhase}
        disabled={currentPhaseIndex === 0}
        aria-label="Back"
        style={{
          padding: '12px 24px',
          minHeight: '44px',
          borderRadius: '8px',
          border: `1px solid ${colors.textMuted}`,
          background: 'transparent',
          color: currentPhaseIndex === 0 ? 'rgba(255,255,255,0.3)' : colors.textPrimary,
          fontWeight: 'bold',
          cursor: currentPhaseIndex === 0 ? 'not-allowed' : 'pointer',
          fontSize: '16px',
        }}
      >
        Back
      </button>
      <button
        onClick={goToNextPhase}
        disabled={disabled && !canProceed}
        aria-label="Next"
        style={{
          padding: '12px 32px',
          minHeight: '44px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed
            ? `linear-gradient(135deg, ${colors.accent}, #0891b2)`
            : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // HOOK PHASE
  if (internalPhase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px', fontWeight: '800' }}>
              The Lotus Secret
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px', fontWeight: '400' }}>
              Discover how water can become perfectly spherical and roll like mercury
            </p>
          </div>

          {renderVisualization(true, true)}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6, fontWeight: '500' }}>
                Drop water on a lotus leaf and watch it ball up into perfect spheres,
                rolling away at the slightest tilt — carrying dirt with it!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px', fontWeight: '400' }}>
                This is the superhydrophobic effect — when surfaces become
                "water-fearing" to an extreme degree. Explore how surface texture
                and chemistry work together to create this remarkable phenomenon.
              </p>
            </div>

            <div style={{
              background: 'rgba(6, 182, 212, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: '500' }}>
                Click "Roll Droplet" to see how easily water moves on a superhydrophobic surface,
                then explore the controls to understand how contact angle determines water behavior!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction')}
      </div>
    );
  }

  // PREDICT PHASE
  if (internalPhase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: '700' }}>What You're Observing:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, fontWeight: '400' }}>
              A water droplet sitting on a textured surface. The surface has tiny
              micro-pillars coated with a waxy, low-energy material — similar to
              a lotus leaf. The angle where water meets surface is the "contact angle."
              Observe the droplet shape carefully before making your prediction.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: '700' }}>
              When you place a water droplet on this lotus-like surface, what happens?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px',
                    minHeight: '44px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id
                      ? `linear-gradient(135deg, rgba(6,182,212,0.3), rgba(6,182,212,0.15))`
                      : 'rgba(30,41,59,0.5)',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: prediction === p.id ? '600' : '400',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (internalPhase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: '700' }}>Explore Surface Wettability</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: '400' }}>
              Adjust roughness and chemistry to see how contact angle changes.
              Watch how each parameter affects the droplet shape and behavior.
            </p>
          </div>

          {renderVisualization(true, true)}
          {renderControls()}

          <div style={{
            background: 'rgba(6, 182, 212, 0.15)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: '700' }}>Cause and Effect: How Sliders Change Behavior</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, margin: 0, paddingLeft: '20px' }}>
              <li><strong style={{ color: colors.textPrimary }}>Roughness increases →</strong> More air pockets trapped → higher contact angle → water rolls more easily</li>
              <li><strong style={{ color: colors.textPrimary }}>Hydrophilic chemistry →</strong> Lower base angle → roughness makes spreading worse → water wets surface</li>
              <li><strong style={{ color: colors.textPrimary }}>Superhydrophobic chemistry →</strong> High base angle → roughness amplifies repulsion → Cassie-Baxter state</li>
            </ul>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '12px', fontWeight: '700' }}>Key Physics Terms:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ background: 'rgba(59,130,246,0.1)', padding: '10px', borderRadius: '8px', borderLeft: `3px solid ${colors.water}` }}>
                <strong style={{ color: colors.textPrimary, fontSize: '13px' }}>Contact Angle (θ):</strong>
                <span style={{ color: colors.textSecondary, fontSize: '13px' }}> The angle between a water droplet and the surface at the contact line. &gt;150° = superhydrophobic.</span>
              </div>
              <div style={{ background: 'rgba(6,182,212,0.1)', padding: '10px', borderRadius: '8px', borderLeft: `3px solid ${colors.accent}` }}>
                <strong style={{ color: colors.textPrimary, fontSize: '13px' }}>Cassie-Baxter State:</strong>
                <span style={{ color: colors.textSecondary, fontSize: '13px' }}> Water sits on trapped air pockets — the droplet "floats" on a layer of air between the surface pillars.</span>
              </div>
              <div style={{ background: 'rgba(16,185,129,0.1)', padding: '10px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                <strong style={{ color: colors.textPrimary, fontSize: '13px' }}>Surface Energy:</strong>
                <span style={{ color: colors.textSecondary, fontSize: '13px' }}> Waxy or fluorinated chemistry = low surface energy = water prefers not to spread.</span>
              </div>
            </div>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px', fontWeight: '700' }}>Why This Matters in the Real World:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
              Superhydrophobic surfaces are revolutionizing engineering: self-cleaning solar panels
              lose 70% less cleaning revenue, aircraft wings with these coatings save $3 billion
              in annual de-icing costs, and water-repellent clothing lasts 100+ wash cycles.
              Every time you adjust roughness, you're simulating the nano-engineering that makes
              these products possible.
            </p>
          </div>

          {/* Comparison display: before vs after */}
          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '12px', fontWeight: '700' }}>Surface Comparison:</h4>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', flexWrap: 'wrap', justifyContent: 'space-around' }}>
              <div style={{ flex: '1 1 140px', minWidth: '140px', textAlign: 'center' }}>
                <div style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Hydrophilic</div>
                <div style={{ color: colors.error, fontSize: '24px', fontWeight: 'bold' }}>30°</div>
                <div style={{ color: colors.textSecondary, fontSize: '12px' }}>Water spreads</div>
              </div>
              <div style={{ flex: '1 1 140px', minWidth: '140px', textAlign: 'center' }}>
                <div style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Hydrophobic</div>
                <div style={{ color: colors.warning, fontSize: '24px', fontWeight: 'bold' }}>110°</div>
                <div style={{ color: colors.textSecondary, fontSize: '12px' }}>Water beads</div>
              </div>
              <div style={{ flex: '1 1 140px', minWidth: '140px', textAlign: 'center' }}>
                <div style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Superhydrophobic</div>
                <div style={{ color: colors.success, fontSize: '24px', fontWeight: 'bold' }}>160°</div>
                <div style={{ color: colors.textSecondary, fontSize: '12px' }}>Water rolls</div>
              </div>
            </div>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: '700' }}>Observation Guide — Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Set to hydrophilic — water spreads flat (low angle)</li>
              <li>Set to hydrophobic — water beads up (angle near 100°)</li>
              <li>Set to superhydrophobic with high roughness — angle exceeds 150°!</li>
              <li>Notice how roughness amplifies the existing chemistry</li>
              <li>Compare droplet shapes: flat disk vs spherical ball</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (internalPhase === 'review') {
    const wasCorrect = prediction === 'ball';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontWeight: '700' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              {wasCorrect
                ? 'You predicted correctly! Water forms near-perfect spheres that roll easily — the superhydrophobic effect!'
                : `You predicted "${predictions.find(p => p.id === prediction)?.label || 'unknown'}." Actually, water forms near-perfect spheres that roll easily!`}
            </p>
          </div>

          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: '700' }}>The Physics of Superhydrophobicity</h3>

            {/* Young's equation formula */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.15)',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '16px',
              borderLeft: `3px solid ${colors.water}`,
              textAlign: 'center',
            }}>
              <div style={{ color: colors.accent, fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>Young's Equation (Mathematical Formula)</div>
              <div style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                cos θ = (γ<sub>SV</sub> − γ<sub>SL</sub>) / γ<sub>LV</sub>
              </div>
              <div style={{ color: colors.textSecondary, fontSize: '12px', marginTop: '8px' }}>
                θ = contact angle | γSV = solid-vapor | γSL = solid-liquid | γLV = liquid-vapor surface tension
              </div>
            </div>

            {/* Cassie-Baxter formula */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              borderLeft: `3px solid ${colors.success}`,
              textAlign: 'center',
            }}>
              <div style={{ color: colors.success, fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px' }}>Cassie-Baxter Equation</div>
              <div style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                cos θ<sub>CB</sub> = f·cos θ<sub>Y</sub> + f − 1
              </div>
              <div style={{ color: colors.textSecondary, fontSize: '12px', marginTop: '6px' }}>
                f = fraction of solid contact | θY = Young contact angle | θCB = Cassie-Baxter angle
              </div>
            </div>

            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: '700' }}>Your prediction matters:</strong> Whether you thought water would spread or ball up depends on your mental model of surface interactions. Young's equation shows that three surface tensions determine wetting — the solid-vapor, solid-liquid, and liquid-vapor interfaces.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: '700' }}>Cassie-Baxter State:</strong> Surface texture traps air pockets. Water sits on top of these air cushions, only touching the peaks of the pillars — dramatically reducing contact area and adhesion.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary, fontWeight: '700' }}>Contact angle greater than 150°:</strong> When both chemistry and roughness work together, contact angles can exceed 150°, and water droplets become nearly spherical with rolling angles below 5°.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (internalPhase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px', fontWeight: '700' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary, fontWeight: '400' }}>
              What if we add a tiny drop of detergent to the water?
            </p>
          </div>

          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: '700' }}>New Variable: Surfactants</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, fontWeight: '400' }}>
              Detergent (soap) is a surfactant — it reduces water's surface tension by 30-50%.
              This is different from what we studied before. Normally surfactants help water spread
              and clean things. But what happens when we add it to water on a superhydrophobic surface?
              This changes the γLV term in Young's equation. Watch the contact angle visualization carefully.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: '700' }}>
              With detergent added to the water, what happens to the beading?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '16px',
                    minHeight: '44px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id
                      ? `linear-gradient(135deg, rgba(245,158,11,0.3), rgba(245,158,11,0.15))`
                      : 'rgba(30,41,59,0.5)',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: twistPrediction === p.id ? '600' : '400',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (internalPhase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px', fontWeight: '700' }}>Test the Detergent Effect</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: '400' }}>
              Toggle detergent on and off to see the dramatic change in contact angle
            </p>
          </div>

          {renderVisualization(true, true)}

          <div style={{ padding: '16px', display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => setHasDetergent(!hasDetergent)}
              style={{
                padding: '16px 32px',
                borderRadius: '8px',
                border: 'none',
                background: hasDetergent
                  ? `linear-gradient(135deg, ${colors.error}, #dc2626)`
                  : `linear-gradient(135deg, ${colors.warning}, #d97706)`,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              {hasDetergent ? 'Remove Detergent' : 'Add Detergent'}
            </button>
          </div>

          {renderControls()}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px', fontWeight: '700' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              {hasDetergent
                ? 'The contact angle dropped dramatically — from 160° to below 40°! Water now wets the surface texture instead of sitting on air pockets. The Cassie-Baxter state collapsed.'
                : 'Without detergent, water maintains high contact angle on the superhydrophobic surface. The air pockets remain stable.'}
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (internalPhase === 'twist_review') {
    const wasCorrect = twistPrediction === 'collapse';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontWeight: '700' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              The beading collapses! Detergent destroys the superhydrophobic effect by lowering surface tension.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px', fontWeight: '700' }}>Cassie to Wenzel Transition</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: '700' }}>Surface Tension Matters:</strong> Detergent
                lowers water's surface tension (γLV in Young's equation) by 30-50%.
                This changes the balance, favoring wetting of the texture gaps.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: '700' }}>Air Pockets Collapse:</strong> With lower
                surface tension, water can now penetrate into the texture gaps. The Cassie-Baxter
                state (sitting on air) transitions to the Wenzel state (filling the texture).
              </p>
              <p>
                <strong style={{ color: colors.textPrimary, fontWeight: '700' }}>Irreversible Change:</strong> Once the air
                pockets are displaced, the surface loses its superhydrophobic properties until
                it dries out completely. This is why soap helps water clean surfaces!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (internalPhase === 'transfer') {
    const app = realWorldApps[currentTransferApp];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center', fontWeight: '700' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '8px', fontWeight: '400' }}>
              Superhydrophobic surfaces appear in nature and industry
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
              Application {currentTransferApp + 1} of {realWorldApps.length}
            </p>

            {/* Navigation tabs for multiple applications */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
              {realWorldApps.map((a, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentTransferApp(i)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: currentTransferApp === i ? `2px solid ${a.color}` : '1px solid rgba(255,255,255,0.2)',
                    background: currentTransferApp === i
                      ? `linear-gradient(135deg, ${a.color}33, ${a.color}18)`
                      : 'transparent',
                    color: currentTransferApp === i ? colors.textPrimary : colors.textMuted,
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: currentTransferApp === i ? '700' : '400',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {a.icon} {a.title}
                </button>
              ))}
            </div>
          </div>

          {/* Current application detail card */}
          <div style={{
            background: colors.bgCard,
            margin: '0 16px 16px 16px',
            padding: '20px',
            borderRadius: '12px',
            border: `2px solid ${app.color}40`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '36px' }}>{app.icon}</span>
              <div>
                <h3 style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: '700', margin: 0 }}>{app.title}</h3>
                <p style={{ color: app.color, fontSize: '13px', margin: 0, fontWeight: '500' }}>{app.tagline}</p>
              </div>
            </div>

            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, marginBottom: '16px' }}>
              {app.description}
            </p>

            {/* Statistics */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{
                  flex: '1 1 100px',
                  background: `${app.color}18`,
                  padding: '12px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: `1px solid ${app.color}30`,
                }}>
                  <div style={{ fontSize: '20px' }}>{stat.icon}</div>
                  <div style={{ color: app.color, fontSize: '20px', fontWeight: 'bold' }}>{stat.value}</div>
                  <div style={{ color: colors.textSecondary, fontSize: '11px' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: `${app.color}18`, padding: '12px', borderRadius: '8px', marginBottom: '12px', borderLeft: `3px solid ${app.color}` }}>
              <p style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: '600', margin: '0 0 6px 0' }}>Connection to Physics:</p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0, lineHeight: 1.5 }}>{app.connection}</p>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <p style={{ color: colors.textMuted, fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Industry Examples:</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {app.companies.map((company, i) => (
                  <span key={i} style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    color: colors.textSecondary,
                    fontSize: '11px',
                  }}>
                    {company}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ background: 'rgba(16,185,129,0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
              <p style={{ color: colors.success, fontSize: '12px', fontWeight: '600', margin: '0 0 4px 0' }}>Future Impact:</p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0, lineHeight: 1.5 }}>{app.futureImpact}</p>
            </div>
          </div>

          {/* Navigation between apps */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px 16px 16px' }}>
            <button
              onClick={() => setCurrentTransferApp(Math.max(0, currentTransferApp - 1))}
              disabled={currentTransferApp === 0}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: `1px solid ${colors.textMuted}`,
                background: 'transparent',
                color: currentTransferApp === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTransferApp === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
              }}
            >
              Previous Application
            </button>
            {currentTransferApp < realWorldApps.length - 1 ? (
              <button
                onClick={() => setCurrentTransferApp(currentTransferApp + 1)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${colors.accent}, #0891b2)`,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                Next Application
              </button>
            ) : (
              <button
                onClick={goToNextPhase}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${colors.success}, #059669)`,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                Take the Test
              </button>
            )}
          </div>
        </div>
        {renderBottomBar(false, true, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (internalPhase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderProgressBar()}
          {renderNavBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
              border: `2px solid ${testScore >= 8 ? colors.success : colors.error}`,
            }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px', fontWeight: '800' }}>
                {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '32px', fontWeight: 'bold' }}>
                Score: {testScore} / 10
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px', fontWeight: '400' }}>
                {testScore >= 8 ? 'You\'ve mastered superhydrophobic surfaces!' : 'Review the material and try again.'}
              </p>
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                      {opt.correct ? '✓ Correct: ' : userAnswer === oIndex ? '✗ Your answer: ' : ''} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary, fontWeight: '700' }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary, fontWeight: '600', background: 'rgba(6,182,212,0.2)', padding: '4px 12px', borderRadius: '12px' }}>
                Question {currentTestQuestion + 1} of {testQuestions.length}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5, fontWeight: '500' }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button
                  key={oIndex}
                  onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: testAnswers[currentTestQuestion] === oIndex
                      ? `linear-gradient(135deg, rgba(6,182,212,0.3), rgba(6,182,212,0.15))`
                      : 'rgba(30,41,59,0.5)',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: testAnswers[currentTestQuestion] === oIndex ? '600' : '400',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.textMuted}`,
                background: 'transparent',
                color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                fontWeight: '600',
              }}
            >
              Previous
            </button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${colors.accent}, #0891b2)`,
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Next Question
              </button>
            ) : (
              <button
                onClick={submitTest}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null)
                    ? colors.textMuted
                    : `linear-gradient(135deg, ${colors.success}, #059669)`,
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (internalPhase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px', fontWeight: '800', fontSize: '32px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '8px', fontSize: '18px', fontWeight: '400' }}>
              You've mastered superhydrophobic surfaces and the lotus effect
            </p>
            <div style={{
              display: 'inline-block',
              background: `linear-gradient(135deg, rgba(16,185,129,0.3), rgba(16,185,129,0.15))`,
              border: `2px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '12px 24px',
              marginBottom: '24px',
            }}>
              <span style={{ color: colors.success, fontWeight: '700', fontSize: '16px' }}>🎓 Game Complete! Congratulations!</span>
            </div>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: '700' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0, fontSize: '14px' }}>
              <li><strong style={{ color: colors.textPrimary }}>Contact angle</strong> and Young's equation (cos θ = γSV − γSL / γLV)</li>
              <li><strong style={{ color: colors.textPrimary }}>Cassie-Baxter state</strong> (air-trapping texture) vs Wenzel state</li>
              <li><strong style={{ color: colors.textPrimary }}>Surface energy and chemistry</strong> effects on wettability</li>
              <li><strong style={{ color: colors.textPrimary }}>How surfactants collapse</strong> superhydrophobicity</li>
              <li><strong style={{ color: colors.textPrimary }}>Self-cleaning lotus effect</strong> with 160°+ contact angles</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(6, 182, 212, 0.15)', margin: '16px', padding: '20px', borderRadius: '12px', border: '1px solid rgba(6,182,212,0.3)' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: '700' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Researchers are developing "omniphobic" surfaces that repel not just water
              but oils and other liquids too. These use re-entrant textures — overhanging
              structures that trap air even under oil (surface tension as low as 20 mN/m).
              Applications include anti-fingerprint screens, non-stick cookware that never needs
              washing, and anti-fouling boat hulls that could save $50 billion in annual fuel costs.
              The global superhydrophobic coatings market is projected to reach $5.8 billion by 2030.
            </p>
          </div>
          {renderVisualization(true, true)}
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <button
              onClick={() => goToPhase(0)}
              style={{
                padding: '16px 32px',
                borderRadius: '12px',
                border: 'none',
                background: `linear-gradient(135deg, ${colors.accent}, #0891b2)`,
                color: 'white',
                fontWeight: 'bold',
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              Play Again
            </button>
          </div>
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default SuperhydrophobicRenderer;
