import React, { useState, useEffect, useCallback, useRef } from 'react';

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface EncapsulationUVAgingRendererProps {
  phase?: Phase; // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  solar: '#3b82f6',
  uv: '#8b5cf6',
  yellowed: '#d97706',
  fresh: '#60a5fa',
};

const EncapsulationUVAgingRenderer: React.FC<EncapsulationUVAgingRendererProps> = ({
  phase: initialPhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
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

  // Phase management - internal state
  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Module Types',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const getInitialPhase = (): Phase => {
    if (initialPhase && phaseOrder.includes(initialPhase)) {
      return initialPhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  // Sync phase with prop changes (for resume functionality)
  useEffect(() => {
    if (initialPhase && phaseOrder.includes(initialPhase) && initialPhase !== phase) {
      setPhase(initialPhase);
    }
  }, [initialPhase]);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;
    setPhase(p);

    setTimeout(() => { isNavigating.current = false; }, 400);
  }, []);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) {
      goToPhase(phaseOrder[idx + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) {
      goToPhase(phaseOrder[idx - 1]);
    }
  }, [phase, goToPhase]);

  // Simulation state
  const [uvExposureYears, setUvExposureYears] = useState(0);
  const [materialType, setMaterialType] = useState<'eva' | 'poe' | 'silicone'>('eva');
  const [isAnimating, setIsAnimating] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<'glass_glass' | 'glass_backsheet'>('glass_backsheet');

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Physics calculations - UV degradation model
  const calculateDegradation = useCallback(() => {
    // Different materials have different UV stability
    const degradationRates: Record<string, number> = {
      eva: 0.015,      // EVA degrades ~1.5% per year
      poe: 0.008,      // POE is more stable
      silicone: 0.003, // Silicone is most stable
    };

    const rate = degradationRates[materialType];

    // Yellowing index increases exponentially with UV dose
    const yellowingIndex = 100 * (1 - Math.exp(-rate * uvExposureYears * 1.5));

    // Transmittance decreases with yellowing (fresh EVA ~91%, aged can drop to ~80%)
    const baseTransmittance = materialType === 'silicone' ? 93 : materialType === 'poe' ? 92 : 91;
    const transmittance = baseTransmittance - (yellowingIndex * 0.15);

    // Power loss due to reduced transmittance
    const powerLoss = ((baseTransmittance - transmittance) / baseTransmittance) * 100;

    // Chain scission rate (molecular breakdown)
    const chainScission = 100 * (1 - Math.exp(-rate * uvExposureYears * 2));

    return {
      yellowingIndex: Math.min(yellowingIndex, 100),
      transmittance: Math.max(transmittance, 70),
      powerLoss: Math.min(powerLoss, 25),
      chainScission: Math.min(chainScission, 100),
      degradationRate: rate * 100,
    };
  }, [uvExposureYears, materialType]);

  // Glass/glass vs glass/backsheet comparison
  const calculateDurabilityComparison = useCallback(() => {
    const baseYears = uvExposureYears;

    // Glass/glass modules last longer due to better moisture barrier
    const glassGlassFactor = 0.6;  // 40% less degradation
    const glassBacksheetFactor = 1.0;

    const factor = comparisonMode === 'glass_glass' ? glassGlassFactor : glassBacksheetFactor;

    const effectiveAge = baseYears * factor;
    const degradation = 100 * (1 - Math.exp(-0.012 * effectiveAge));
    const expectedLifespan = comparisonMode === 'glass_glass' ? 35 : 25;

    return {
      effectiveAge,
      degradation: Math.min(degradation, 50),
      expectedLifespan,
      moistureIngress: comparisonMode === 'glass_glass' ? 'Very Low' : 'Moderate',
    };
  }, [uvExposureYears, comparisonMode]);

  // Animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setUvExposureYears(prev => {
        const newVal = prev + 0.5;
        if (newVal >= 30) {
          setIsAnimating(false);
          return 30;
        }
        return newVal;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'linear', label: 'Yellowing increases linearly with time - 10 years = 2x the yellowing of 5 years' },
    { id: 'exponential', label: 'Yellowing accelerates over time - later years show more damage' },
    { id: 'saturating', label: 'Yellowing slows down over time - initial damage is fastest' },
    { id: 'threshold', label: 'No yellowing until a critical UV dose is reached, then sudden failure' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Both module types degrade at the same rate - only the encapsulant matters' },
    { id: 'glass_better', label: 'Glass/glass lasts longer because glass blocks more UV and moisture' },
    { id: 'backsheet_better', label: 'Glass/backsheet lasts longer because it runs cooler' },
    { id: 'depends', label: 'It depends entirely on the encapsulant material used' },
  ];

  const transferApplications = [
    {
      title: 'Desert Solar Farms',
      description: 'Solar installations in deserts face extreme UV exposure, high temperatures, and sand abrasion.',
      question: 'Why do desert solar farms often choose POE or silicone encapsulants over standard EVA?',
      answer: 'Desert conditions accelerate UV degradation due to higher irradiance (~2000 kWh/m2/year vs ~1000 in temperate zones). POE and silicone have lower UV sensitivity and better thermal stability, reducing yellowing and maintaining higher transmittance over the 25-30 year lifespan.',
    },
    {
      title: 'Building-Integrated PV (BIPV)',
      description: 'Solar panels integrated into building facades and windows must maintain aesthetics for decades.',
      question: 'Why is visual appearance especially critical for BIPV encapsulant selection?',
      answer: 'BIPV modules are architectural features where yellowing is immediately visible and unacceptable. These applications often use silicone encapsulants despite higher cost, or glass/glass construction with UV-stabilized EVA to maintain clarity for 30+ years.',
    },
    {
      title: 'Floating Solar (Floatovoltaics)',
      description: 'Solar panels on water bodies face high humidity, reflected UV, and salt spray in coastal installations.',
      question: 'What additional stress does water reflection create for floating solar encapsulants?',
      answer: 'Water reflects 5-10% of incident sunlight back up at the panels, increasing rear-side UV exposure. Combined with high humidity accelerating hydrolysis of EVA, floating solar often requires glass/glass modules with POE encapsulants for durability.',
    },
    {
      title: 'Warranty and Degradation Guarantees',
      description: 'Solar manufacturers provide 25-year warranties guaranteeing minimum power output.',
      question: 'How do encapsulant yellowing models inform warranty calculations?',
      answer: 'Manufacturers use accelerated UV aging tests (IEC 61215) to predict 25-year yellowing. A module warranted for 80% power at 25 years must account for ~3-5% loss from encapsulant yellowing alone, requiring materials with <0.5%/year transmittance loss.',
    },
  ];

  const testQuestions = [
    {
      question: 'What causes the yellowing of solar panel encapsulants over time?',
      options: [
        { text: 'Dust accumulation between the glass layers', correct: false },
        { text: 'UV radiation breaking polymer chains (photodegradation)', correct: true },
        { text: 'Chemical reaction with rainwater', correct: false },
        { text: 'Natural color change in silicon cells', correct: false },
      ],
    },
    {
      question: 'Which encapsulant material typically shows the most UV resistance?',
      options: [
        { text: 'Standard EVA (ethylene-vinyl acetate)', correct: false },
        { text: 'POE (polyolefin elastomer)', correct: false },
        { text: 'Silicone', correct: true },
        { text: 'PVB (polyvinyl butyral)', correct: false },
      ],
    },
    {
      question: 'How does encapsulant yellowing affect solar panel output?',
      options: [
        { text: 'It increases electrical resistance in the cells', correct: false },
        { text: 'It reduces light transmission to the cells, lowering current', correct: true },
        { text: 'It causes short circuits between cells', correct: false },
        { text: 'It has no effect on electrical output', correct: false },
      ],
    },
    {
      question: 'Why do glass/glass modules typically show less encapsulant degradation?',
      options: [
        { text: 'The glass absorbs heat that would damage the encapsulant', correct: false },
        { text: 'Glass provides a better moisture barrier, reducing hydrolysis', correct: true },
        { text: 'Glass reflects UV away from the encapsulant', correct: false },
        { text: 'Glass/glass modules are always made with better encapsulants', correct: false },
      ],
    },
    {
      question: 'What is chain scission in polymer degradation?',
      options: [
        { text: 'The linking of polymer chains to form a network', correct: false },
        { text: 'The breaking of polymer chains into shorter fragments', correct: true },
        { text: 'The crystallization of polymer molecules', correct: false },
        { text: 'The absorption of water by polymer chains', correct: false },
      ],
    },
    {
      question: 'Typical EVA encapsulant starts with about 91% transmittance. After 25 years of UV exposure, a well-designed module might drop to:',
      options: [
        { text: '50-60% transmittance (major loss)', correct: false },
        { text: '70-75% transmittance (significant loss)', correct: false },
        { text: '85-88% transmittance (moderate loss)', correct: true },
        { text: '90-91% transmittance (negligible loss)', correct: false },
      ],
    },
    {
      question: 'The yellowing index of an encapsulant typically follows which pattern over time?',
      options: [
        { text: 'Linear increase throughout the lifetime', correct: false },
        { text: 'Rapid initial yellowing that slows down (saturating exponential)', correct: true },
        { text: 'No change for 20 years, then sudden yellowing', correct: false },
        { text: 'Yellowing decreases after initial increase', correct: false },
      ],
    },
    {
      question: 'What role do UV stabilizers play in encapsulant formulations?',
      options: [
        { text: 'They absorb UV and convert it to heat, protecting the polymer', correct: true },
        { text: 'They make the encapsulant harder and more rigid', correct: false },
        { text: 'They increase the initial transparency of the encapsulant', correct: false },
        { text: 'They prevent the encapsulant from melting in hot weather', correct: false },
      ],
    },
    {
      question: 'In accelerated aging tests, how is 25 years of outdoor UV exposure typically simulated?',
      options: [
        { text: 'Exposure to high temperature for 25 days', correct: false },
        { text: 'Intense UV lamps for 1000+ hours at elevated temperature', correct: true },
        { text: 'Soaking in salt water for several months', correct: false },
        { text: 'Repeated freeze-thaw cycles over 6 months', correct: false },
      ],
    },
    {
      question: 'Why is the combination of UV exposure and moisture particularly damaging to EVA?',
      options: [
        { text: 'Water conducts electricity through the damaged encapsulant', correct: false },
        { text: 'UV creates radicals, and moisture enables hydrolysis of acetate groups, forming acetic acid', correct: true },
        { text: 'Moisture blocks UV from being absorbed evenly', correct: false },
        { text: 'Water makes the EVA expand and crack', correct: false },
      ],
    },
  ];

  const realWorldApps = [
    {
      icon: 'Sun',
      title: 'Solar Panel Longevity',
      short: 'Photovoltaics',
      tagline: 'Protecting cells for 25+ year warranties',
      description: 'Solar panel encapsulants must withstand decades of intense UV radiation while maintaining optical clarity. The choice of encapsulant material directly determines whether a panel meets its 25-30 year performance warranty, affecting billions of dollars in solar investments worldwide.',
      connection: 'This simulation demonstrates exactly how UV photons break polymer chains in encapsulants, causing yellowing that reduces light transmission to solar cells. Understanding degradation kinetics helps engineers select materials that minimize power loss over the panel lifetime.',
      howItWorks: 'UV photons with energies of 3-4 eV break carbon-carbon and carbon-oxygen bonds in polymer encapsulants. This chain scission creates chromophores (light-absorbing structures) that cause yellowing. The yellowed material absorbs blue light that would otherwise generate electricity, directly reducing power output by 0.3-0.5% per year.',
      stats: [
        { value: '25-30', label: 'Year warranties standard for solar panels' },
        { value: '3-8%', label: 'Power loss from encapsulant yellowing over lifetime' },
        { value: '$2B+', label: 'Annual global encapsulant market value' },
      ],
      examples: [
        'Utility-scale solar farms selecting POE over EVA for desert installations',
        'Rooftop panels in tropical climates using UV-stabilized formulations',
        'Bifacial modules requiring clear encapsulants on both sides',
        'Building-integrated PV where aesthetics demand minimal yellowing',
      ],
      companies: ['First Solar', 'LONGi Green Energy', 'JA Solar', 'Trina Solar', 'Canadian Solar'],
      futureImpact: 'Next-generation encapsulants using silicone and advanced polyolefins promise 40+ year lifetimes. Combined with bifacial glass-glass construction, these materials will enable solar panels that outlast the buildings they power, fundamentally changing solar project economics.',
      color: '#f59e0b',
    },
    {
      icon: 'Car',
      title: 'Automotive Coatings',
      short: 'Vehicle Durability',
      tagline: 'Keeping cars looking new for decades',
      description: 'Automotive clear coats and paints must resist UV degradation to maintain appearance and protect underlying metal from corrosion. The same photodegradation chemistry that yellows solar encapsulants causes automotive finishes to fade, chalk, and crack.',
      connection: 'The UV degradation model in this simulation applies directly to automotive coatings. Just as encapsulants yellow through chain scission, car paint binders break down under UV exposure. The saturating exponential degradation pattern explains why cars fade quickly at first, then more slowly.',
      howItWorks: 'Automotive clear coats use acrylic or polyurethane polymers with UV absorbers (like benzotriazoles) and hindered amine light stabilizers (HALS). UV photons are absorbed by stabilizers instead of damaging the polymer. When stabilizers are depleted, the coating rapidly degrades, causing gloss loss, chalking, and eventual cracking.',
      stats: [
        { value: '10-15', label: 'Years of UV protection from modern clear coats' },
        { value: '50%+', label: 'Gloss reduction in unprotected paint after 5 years' },
        { value: '$8B', label: 'Global automotive coatings market annually' },
      ],
      examples: [
        'Premium vehicles with ceramic-reinforced clear coats for extended protection',
        'Fleet vehicles in sunny climates requiring frequent recoating',
        'Classic car restoration using UV-stable basecoat/clearcoat systems',
        'Electric vehicle batteries with UV-resistant thermal management coatings',
      ],
      companies: ['PPG Industries', 'BASF Coatings', 'Axalta', 'Nippon Paint', 'AkzoNobel'],
      futureImpact: 'Self-healing clear coats using microencapsulated UV stabilizers will automatically replenish protection as it depletes. Combined with hydrophobic nanocoatings, future automotive finishes may maintain showroom appearance for the entire vehicle lifetime.',
      color: '#3b82f6',
    },
    {
      icon: 'Smartphone',
      title: 'Outdoor Electronics',
      short: 'Weatherproofing',
      tagline: 'Protecting devices from environmental extremes',
      description: 'Electronic devices deployed outdoors face continuous UV exposure that degrades housings, seals, and optical components. From security cameras to weather stations, UV-resistant encapsulation is critical for reliable long-term operation.',
      connection: 'This simulation shows how polymer degradation follows predictable kinetics based on material properties and UV dose. Outdoor electronics designers use these same models to select housings and conformal coatings that will protect sensitive components for the required service life.',
      howItWorks: 'UV radiation degrades polymer housings causing embrittlement and cracking that allows moisture ingress. Optical windows yellow and reduce sensor sensitivity. Conformal coatings on circuit boards break down, exposing copper traces to corrosion. Multi-layer protection strategies combine UV-stable outer shells with moisture barriers.',
      stats: [
        { value: '5-20', label: 'Year outdoor service life requirements' },
        { value: '40-60%', label: 'Device failures linked to environmental exposure' },
        { value: '$15B', label: 'Outdoor electronics enclosure market' },
      ],
      examples: [
        'Traffic cameras with polycarbonate housings requiring UV stabilization',
        'Agricultural sensors using silicone potting for decades of field operation',
        'Telecommunications equipment with UV-resistant fiber optic connectors',
        'Solar-powered IoT devices combining PV and electronics protection',
      ],
      companies: ['Axis Communications', 'Honeywell', 'Bosch Security', 'Texas Instruments', 'Analog Devices'],
      futureImpact: 'Transparent conducting oxides and graphene-based encapsulants will provide electromagnetic shielding while blocking UV. Self-powered outdoor sensors with integrated energy harvesting will require encapsulation systems lasting 30+ years without maintenance.',
      color: '#10b981',
    },
    {
      icon: 'Rocket',
      title: 'Aerospace Materials',
      short: 'Spacecraft Protection',
      tagline: 'Surviving the harshest UV environment',
      description: 'Spacecraft experience UV intensities 30-40% higher than Earth surface, with no atmospheric filtering of damaging short-wavelength UV-C. Thermal control coatings, solar array encapsulants, and optical surfaces must withstand decades of unfiltered solar radiation.',
      connection: 'The degradation physics in this simulation scale directly to space conditions. Higher UV flux accelerates the same chain scission reactions, but without oxygen the degradation chemistry differs. Space qualification uses accelerated testing based on these fundamental kinetic models.',
      howItWorks: 'In low Earth orbit, spacecraft receive ~1366 W/m2 of unfiltered solar radiation including UV-C below 280nm. This high-energy UV causes rapid polymer degradation through direct photolysis. Atomic oxygen (abundant in LEO) simultaneously erodes exposed polymers. Protection requires specialized materials like polyimides, fluoropolymers, and inorganic coatings.',
      stats: [
        { value: '15-30', label: 'Year design life for geostationary satellites' },
        { value: '1000x', label: 'More intense UV-C exposure than Earth surface' },
        { value: '$400B', label: 'Global space economy dependent on material durability' },
      ],
      examples: [
        'International Space Station solar arrays using specialized cover glasses',
        'Satellite thermal blankets with UV-reflective outer layers',
        'James Webb Space Telescope sunshield using Kapton polyimide',
        'Mars rovers with UV-resistant coatings for multi-year surface operations',
      ],
      companies: ['NASA', 'SpaceX', 'Northrop Grumman', 'Boeing', 'Lockheed Martin'],
      futureImpact: 'Lunar and Martian bases will require UV protection for habitats, equipment, and spacesuits. Advanced ceramic-polymer composites and self-healing materials will enable permanent human presence beyond Earth, where replacing degraded components is not an option.',
      color: '#8b5cf6',
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

  const renderVisualization = (interactive: boolean, showComparison: boolean = false) => {
    const width = 500;
    const height = 400;
    const output = calculateDegradation();
    const durability = calculateDurabilityComparison();

    // Color interpolation for yellowing
    const yellowFactor = output.yellowingIndex / 100;

    // Protection level for meter (inverse of degradation)
    const protectionLevel = 100 - output.yellowingIndex;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: typo.elementGap }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '550px' }}
        >
          <defs>
            {/* Premium lab background gradient */}
            <linearGradient id="encapLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="30%" stopColor="#0f172a" />
              <stop offset="70%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Sun/UV source radial gradient */}
            <radialGradient id="encapSunGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#d97706" stopOpacity="0.6" />
              <stop offset="80%" stopColor="#b45309" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#92400e" stopOpacity="0" />
            </radialGradient>

            {/* UV ray gradient - purple to violet with fade */}
            <linearGradient id="encapUvRay" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.9" />
              <stop offset="25%" stopColor="#8b5cf6" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.5" />
              <stop offset="75%" stopColor="#6d28d9" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#5b21b6" stopOpacity="0.1" />
            </linearGradient>

            {/* Glass layer gradient - realistic refraction effect */}
            <linearGradient id="encapGlassLayer" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.5" />
              <stop offset="20%" stopColor="#bae6fd" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#7dd3fc" stopOpacity="0.3" />
              <stop offset="80%" stopColor="#bae6fd" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.5" />
            </linearGradient>

            {/* Fresh encapsulant gradient - clear blue */}
            <linearGradient id="encapFreshEncap" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
              <stop offset="25%" stopColor="#3b82f6" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#2563eb" stopOpacity="0.8" />
              <stop offset="75%" stopColor="#3b82f6" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.9" />
            </linearGradient>

            {/* Yellowed encapsulant gradient - amber/brown */}
            <linearGradient id="encapYellowedEncap" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
              <stop offset="25%" stopColor="#f59e0b" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#d97706" stopOpacity="0.8" />
              <stop offset="75%" stopColor="#f59e0b" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.9" />
            </linearGradient>

            {/* Dynamic encapsulant gradient based on yellowing */}
            <linearGradient id="encapDynamicEncap" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={`rgb(${96 + yellowFactor * 159}, ${165 - yellowFactor * 80}, ${250 - yellowFactor * 200})`} />
              <stop offset="25%" stopColor={`rgb(${80 + yellowFactor * 165}, ${150 - yellowFactor * 75}, ${235 - yellowFactor * 185})`} />
              <stop offset="50%" stopColor={`rgb(${70 + yellowFactor * 170}, ${140 - yellowFactor * 70}, ${220 - yellowFactor * 170})`} />
              <stop offset="75%" stopColor={`rgb(${80 + yellowFactor * 165}, ${150 - yellowFactor * 75}, ${235 - yellowFactor * 185})`} />
              <stop offset="100%" stopColor={`rgb(${96 + yellowFactor * 159}, ${165 - yellowFactor * 80}, ${250 - yellowFactor * 200})`} />
            </linearGradient>

            {/* Solar cell gradient - silicon blue */}
            <linearGradient id="encapSolarCell" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="30%" stopColor="#2563eb" />
              <stop offset="70%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>

            {/* Cell substrate gradient */}
            <linearGradient id="encapCellSubstrate" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="50%" stopColor="#0f2942" />
              <stop offset="100%" stopColor="#1e3a5f" />
            </linearGradient>

            {/* Backsheet gradient - polymer gray */}
            <linearGradient id="encapBacksheet" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="30%" stopColor="#374151" />
              <stop offset="70%" stopColor="#374151" />
              <stop offset="100%" stopColor="#4b5563" />
            </linearGradient>

            {/* Protection meter gradient */}
            <linearGradient id="encapProtectionMeter" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="25%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="75%" stopColor="#84cc16" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>

            {/* Yellowing bar gradient */}
            <linearGradient id="encapYellowBar" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            {/* Transmittance bar gradient */}
            <linearGradient id="encapTransBar" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>

            {/* Power loss bar gradient */}
            <linearGradient id="encapPowerLossBar" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            {/* Power curve gradient */}
            <linearGradient id="encapPowerCurve" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* UV glow filter */}
            <filter id="encapUvGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Sun glow filter */}
            <filter id="encapSunFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Cell glow filter */}
            <filter id="encapCellGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Degradation particle effect filter */}
            <filter id="encapDegradation" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency={0.05 + yellowFactor * 0.1} numOctaves="3" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale={yellowFactor * 3} xChannelSelector="R" yChannelSelector="G" />
            </filter>

            {/* Meter glow filter */}
            <filter id="encapMeterGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width={width} height={height} fill="url(#encapLabBg)" />

          {/* Subtle grid pattern */}
          <pattern id="encapGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.3" />
          </pattern>
          <rect width={width} height={height} fill="url(#encapGrid)" opacity="0.5" />

          {/* Sun with glow */}
          <g filter="url(#encapSunFilter)">
            <circle cx={250} cy={32} r={28} fill="url(#encapSunGlow)" />
          </g>

          {/* UV rays with premium styling */}
          {[...Array(16)].map((_, i) => {
            const baseX = 35 + i * 28;
            const waveOffset = Math.sin(i * 0.5) * 8;
            return (
              <g key={`uvray${i}`} filter="url(#encapUvGlow)">
                <line
                  x1={baseX}
                  y1={55}
                  x2={baseX + waveOffset}
                  y2={95}
                  stroke="url(#encapUvRay)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeDasharray="6,3"
                  opacity={0.7 + Math.random() * 0.3}
                />
                {/* UV photon particles */}
                <circle
                  cx={baseX + waveOffset * 0.5}
                  cy={75 + Math.random() * 15}
                  r={2}
                  fill="#a855f7"
                  opacity={0.6}
                />
              </g>
            );
          })}

          {/* Main solar panel - enhanced with premium gradients */}
          <g transform="translate(100, 100)">
            {/* Panel shadow */}
            <rect x={4} y={4} width={300} height={138} fill="rgba(0,0,0,0.3)" rx={4} />

            {/* Glass layer with realistic effect */}
            <rect x={0} y={0} width={300} height={18} fill="url(#encapGlassLayer)" stroke="#64748b" strokeWidth={1} rx={3} />
            {/* Glass reflection highlight */}
            <rect x={5} y={2} width={290} height={4} fill="rgba(255,255,255,0.2)" rx={2} />

            {/* Encapsulant layer with dynamic gradient and degradation effect */}
            <g filter={yellowFactor > 0.3 ? 'url(#encapDegradation)' : undefined}>
              <rect x={0} y={20} width={300} height={32} fill="url(#encapDynamicEncap)" rx={2} />
            </g>
            {/* Encapsulant edge highlight */}
            <rect x={0} y={20} width={300} height={1} fill="rgba(255,255,255,0.15)" />

            {/* Solar cells with premium styling */}
            <rect x={8} y={55} width={284} height={42} fill="url(#encapCellSubstrate)" rx={3} />
            {[...Array(6)].map((_, i) => (
              <g key={`cell${i}`} filter="url(#encapCellGlow)">
                <rect
                  x={14 + i * 46}
                  y={58}
                  width={42}
                  height={36}
                  fill="url(#encapSolarCell)"
                  stroke="#1e40af"
                  strokeWidth={1}
                  rx={2}
                />
                {/* Cell bus bars */}
                <line x1={14 + i * 46 + 14} y1={58} x2={14 + i * 46 + 14} y2={94} stroke="#94a3b8" strokeWidth={1} opacity={0.6} />
                <line x1={14 + i * 46 + 28} y1={58} x2={14 + i * 46 + 28} y2={94} stroke="#94a3b8" strokeWidth={1} opacity={0.6} />
              </g>
            ))}

            {/* Back encapsulant with same dynamic gradient */}
            <rect x={0} y={100} width={300} height={22} fill="url(#encapDynamicEncap)" rx={2} />

            {/* Backsheet or rear glass */}
            {showComparison && comparisonMode === 'glass_glass' ? (
              <rect x={0} y={124} width={300} height={14} fill="url(#encapGlassLayer)" stroke="#64748b" strokeWidth={1} rx={3} />
            ) : (
              <rect x={0} y={124} width={300} height={14} fill="url(#encapBacksheet)" stroke="#4b5563" strokeWidth={1} rx={3} />
            )}
          </g>

          {/* Protection Meter - circular gauge */}
          <g transform="translate(25, 115)">
            <rect x={-5} y={-5} width={55} height={110} fill="rgba(0,0,0,0.4)" rx={6} />

            {/* Meter background */}
            <rect x={5} y={5} width={35} height={90} fill="rgba(0,0,0,0.5)" rx={4} stroke="#475569" strokeWidth={1} />

            {/* Protection level bar */}
            <rect
              x={10}
              y={10 + (80 - protectionLevel * 0.8)}
              width={25}
              height={protectionLevel * 0.8}
              fill="url(#encapProtectionMeter)"
              rx={2}
              filter="url(#encapMeterGlow)"
            />

            {/* Meter tick marks */}
            {[0, 25, 50, 75, 100].map((tick) => (
              <g key={`tick${tick}`}>
                <line x1={38} y1={90 - tick * 0.8} x2={42} y2={90 - tick * 0.8} stroke="#64748b" strokeWidth={1} />
              </g>
            ))}
          </g>

          {/* Degradation metrics - moved below panel */}
          <g transform="translate(20, 260)">
            {/* Yellowing index bar */}
            <rect x={0} y={8} width={140} height={18} fill="rgba(0,0,0,0.3)" rx={4} />
            <rect x={2} y={10} width={Math.min(output.yellowingIndex * 1.36, 136)} height={14} fill="url(#encapYellowBar)" rx={3} />

            {/* Transmittance bar */}
            <rect x={0} y={33} width={140} height={18} fill="rgba(0,0,0,0.3)" rx={4} />
            <rect x={2} y={35} width={(output.transmittance / 100) * 136} height={14} fill="url(#encapTransBar)" rx={3} />

            {/* Power loss bar */}
            <rect x={0} y={58} width={140} height={18} fill="rgba(0,0,0,0.3)" rx={4} />
            <rect x={2} y={60} width={Math.min(output.powerLoss * 5.44, 136)} height={14} fill="url(#encapPowerLossBar)" rx={3} />
          </g>

          {/* Power loss curve with gradient stroke */}
          <g transform="translate(280, 252)">
            <rect x={-5} y={-5} width={210} height={120} fill="rgba(0,0,0,0.4)" rx={6} />

            {/* Grid lines */}
            {[0, 25, 50, 75].map((y) => (
              <line key={`grid${y}`} x1={20} y1={20 + y * 0.8} x2={185} y2={20 + y * 0.8} stroke="#334155" strokeWidth={0.5} strokeDasharray="3,3" />
            ))}

            {/* Axes */}
            <line x1={20} y1={95} x2={185} y2={95} stroke="#64748b" strokeWidth={1.5} />
            <line x1={20} y1={20} x2={20} y2={95} stroke="#64748b" strokeWidth={1.5} />

            {/* Power curve */}
            <path
              d={`M 20,25 ${[...Array(30)].map((_, i) => {
                const year = i;
                const loss = 100 * (1 - Math.exp(-0.015 * year * 1.5)) * 0.15;
                const x = 20 + (i / 30) * 165;
                const y = 25 + loss * 4;
                return `L ${x},${y}`;
              }).join(' ')}`}
              fill="none"
              stroke="url(#encapPowerCurve)"
              strokeWidth={2.5}
              strokeLinecap="round"
            />

            {/* Current position marker with glow */}
            <g filter="url(#encapMeterGlow)">
              <circle
                cx={20 + (uvExposureYears / 30) * 165}
                cy={25 + output.powerLoss * 4}
                r={6}
                fill={colors.accent}
              />
              <circle
                cx={20 + (uvExposureYears / 30) * 165}
                cy={25 + output.powerLoss * 4}
                r={3}
                fill="#fff"
              />
            </g>
          </g>

          {/* Comparison info box if enabled */}
          {showComparison && (
            <g transform="translate(280, 100)">
              <rect x={0} y={0} width={200} height={85} fill="rgba(0,0,0,0.5)" rx={8} stroke="#475569" strokeWidth={1} />
              {/* Indicator stripe */}
              <rect x={0} y={0} width={4} height={85} fill={comparisonMode === 'glass_glass' ? colors.success : colors.warning} rx={2} />
            </g>
          )}
        </svg>

        {/* Labels moved outside SVG using typo system */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto 1fr',
          gap: typo.elementGap,
          width: '100%',
          maxWidth: '550px',
          padding: `0 ${typo.pagePadding}`,
        }}>
          {/* Left column - metrics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Yellowing:</span>
            <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Transmit.:</span>
            <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Power Loss:</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: typo.small, color: colors.yellowed, fontWeight: 'bold' }}>{output.yellowingIndex.toFixed(1)}%</span>
            <span style={{ fontSize: typo.small, color: colors.fresh, fontWeight: 'bold' }}>{output.transmittance.toFixed(1)}%</span>
            <span style={{ fontSize: typo.small, color: colors.error, fontWeight: 'bold' }}>{output.powerLoss.toFixed(1)}%</span>
          </div>

          {/* Right column - material info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Material:</span>
            <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Exposure:</span>
            <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Protection:</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: typo.small, color: colors.accent, fontWeight: 'bold' }}>{materialType.toUpperCase()}</span>
            <span style={{ fontSize: typo.small, color: colors.uv, fontWeight: 'bold' }}>{uvExposureYears.toFixed(1)} years</span>
            <span style={{ fontSize: typo.small, color: protectionLevel > 70 ? colors.success : protectionLevel > 40 ? colors.warning : colors.error, fontWeight: 'bold' }}>
              {protectionLevel.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Comparison mode info */}
        {showComparison && (
          <div style={{
            display: 'flex',
            gap: typo.elementGap,
            padding: typo.cardPadding,
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '8px',
            borderLeft: `3px solid ${comparisonMode === 'glass_glass' ? colors.success : colors.warning}`,
            maxWidth: '550px',
            width: '100%',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: typo.body, color: colors.textPrimary, fontWeight: 'bold' }}>
                {comparisonMode === 'glass_glass' ? 'Glass/Glass Module' : 'Glass/Backsheet Module'}
              </div>
              <div style={{ fontSize: typo.small, color: colors.textSecondary, marginTop: '4px' }}>
                Expected Life: {durability.expectedLifespan} years | Moisture: {durability.moistureIngress} | Degrad.: {durability.degradation.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => { setIsAnimating(!isAnimating); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating ? colors.error : colors.success,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.body,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isAnimating ? 'Pause Aging' : 'Simulate Aging'}
            </button>
            <button
              onClick={() => { setUvExposureYears(0); setIsAnimating(false); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.body,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = (showComparison: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          UV Exposure: {uvExposureYears.toFixed(1)} years
        </label>
        <input
          type="range"
          min="0"
          max="30"
          step="0.5"
          value={uvExposureYears}
          onChange={(e) => setUvExposureYears(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Encapsulant Material:
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['eva', 'poe', 'silicone'] as const).map((mat) => (
            <button
              key={mat}
              onClick={() => setMaterialType(mat)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: materialType === mat ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                background: materialType === mat ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '13px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {mat.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {showComparison && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Module Construction:
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setComparisonMode('glass_backsheet')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: comparisonMode === 'glass_backsheet' ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                background: comparisonMode === 'glass_backsheet' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '13px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Glass/Backsheet
            </button>
            <button
              onClick={() => setComparisonMode('glass_glass')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: comparisonMode === 'glass_glass' ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                background: comparisonMode === 'glass_glass' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '13px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Glass/Glass
            </button>
          </div>
        </div>
      )}

      <div style={{
        background: 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.uv}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Material: {materialType.toUpperCase()} | Degradation Rate: {(calculateDegradation().degradationRate).toFixed(2)}%/year
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Yellowing = 100 x (1 - e^(-k x t)) where k depends on material UV stability
        </div>
      </div>
    </div>
  );

  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: colors.bgCard,
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {phaseOrder.map((p, i) => (
              <div
                key={p}
                onClick={() => i < currentIdx && goToPhase(p)}
                style={{
                  height: '8px',
                  width: i === currentIdx ? '24px' : '8px',
                  borderRadius: '5px',
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
                  cursor: i < currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s',
                }}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textMuted }}>
            {currentIdx + 1} / {phaseOrder.length}
          </span>
        </div>
        <div style={{
          padding: '4px 12px',
          borderRadius: '12px',
          background: `${colors.accent}20`,
          color: colors.accent,
          fontSize: '11px',
          fontWeight: 700
        }}>
          {phaseLabels[phase]}
        </div>
      </div>
    );
  };

  const renderBottomBar = (canProceed: boolean, nextLabel: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = currentIdx > 0;

    const handleNext = () => {
      if (!canProceed) return;
      if (onNext) {
        onNext();
      } else {
        goNext();
      }
    };

    return (
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
        gap: '12px'
      }}>
        <button
          onClick={goBack}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: `1px solid ${colors.textMuted}`,
            background: 'transparent',
            color: canBack ? colors.textSecondary : colors.textMuted,
            fontWeight: 'bold',
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            fontSize: '14px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Back
        </button>
        <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>
        <button
          onClick={handleNext}
          style={{
            padding: '12px 32px',
            borderRadius: '8px',
            border: 'none',
            background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
            color: canProceed ? 'white' : colors.textMuted,
            fontWeight: 'bold',
            cursor: canProceed ? 'pointer' : 'not-allowed',
            fontSize: '16px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Why Do Old Panels Yellow?
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              The invisible damage of UV radiation
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Solar panels are built to last 25+ years in harsh sunlight. But look closely at
                old panels - they often have a yellow or brown tint. This isn't dirt - it's
                chemical damage happening at the molecular level!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                The transparent encapsulant protecting the cells slowly breaks down under UV exposure.
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.uv}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try different encapsulant materials and watch how they age differently over time!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Make a Prediction')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Observing:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A solar panel cross-section showing the encapsulant layer that protects the cells.
              UV radiation from sunlight continuously bombards this polymer layer, breaking chemical bonds.
              The display tracks yellowing, transmittance, and power loss over simulated years.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does yellowing change over a panel's 25-year lifetime?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(!!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore UV Aging</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Compare different encapsulant materials over time
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Experiments to Try:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Run all three materials to 25 years - which yellows least?</li>
              <li>Note the relationship between yellowing and power loss</li>
              <li>Observe how transmittance drops as yellowing increases</li>
              <li>Find the year when power loss exceeds 5%</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'saturating';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Yellowing follows a saturating exponential pattern - the most vulnerable polymer bonds break first,
              then the rate slows as remaining bonds become harder to reach.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Science of UV Degradation</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Chain Scission:</strong> UV photons have enough energy
                (3-4 eV) to break C-C and C-O bonds in polymers. This fragments long polymer chains into shorter pieces.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Chromophore Formation:</strong> Broken bonds create
                conjugated structures that absorb blue light, making the material appear yellow/brown.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Transmittance Loss:</strong> Yellowing reduces the light
                reaching cells. A 5% transmittance drop means 5% less power output!
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Material Choice:</strong> Silicone resists UV best
                (Si-O backbone), POE is intermediate, and EVA degrades fastest (acetate groups hydrolyze).
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What about the module construction - glass/glass vs glass/backsheet?
            </p>
          </div>

          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Traditional panels use a polymer backsheet behind the cells, while glass/glass modules
              use a second glass sheet. Both use the same encapsulant. How does this affect
              long-term durability and encapsulant degradation?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Which module type will show less encapsulant degradation over 25 years?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(!!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Compare Module Types</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Toggle between glass/glass and glass/backsheet construction
            </p>
          </div>

          {renderVisualization(true, true)}
          {renderControls(true)}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Glass/glass modules show significantly less degradation because the rear glass
              provides a better moisture barrier. Moisture accelerates UV-induced degradation!
            </p>
          </div>
        </div>
        {renderBottomBar(true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'glass_better';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Glass/glass modules typically last 30-35 years vs 25 years for glass/backsheet,
              primarily due to superior moisture barrier properties!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Moisture + UV: A Destructive Combination</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Water Vapor Transmission:</strong> Polymer backsheets
                allow moisture to slowly penetrate (~1-5 g/m2/day). Glass is essentially impermeable.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Hydrolysis:</strong> Water attacks the acetate groups
                in EVA, producing acetic acid. This accelerates chain scission and creates corrosive conditions.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Bifacial Bonus:</strong> Glass/glass modules can also
                harvest light from both sides, adding 5-20% more energy while lasting longer!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Encapsulant selection impacts solar project economics worldwide
            </p>
          </div>

          {transferApplications.map((app, index) => (
            <div
              key={index}
              style={{
                background: colors.bgCard,
                margin: '16px',
                padding: '16px',
                borderRadius: '12px',
                border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Complete</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.uv, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: `1px solid ${colors.accent}`,
                    background: 'transparent',
                    color: colors.accent,
                    cursor: 'pointer',
                    fontSize: '13px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Reveal Answer
                </button>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar(transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You understand UV aging in solar panels!' : 'Review the material and try again.'}
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
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''}{opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry', testScore >= 8 ? goNext : () => { setTestSubmitted(false); setCurrentTestQuestion(0); })}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentTestQuestion(i)}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
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
                    background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    WebkitTapHighlightColor: 'transparent',
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
                WebkitTapHighlightColor: 'transparent',
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
                  background: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={submitTest}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null) ? colors.textMuted : colors.success,
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  WebkitTapHighlightColor: 'transparent',
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
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You understand UV aging and encapsulant degradation</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>UV photons break polymer chains (photodegradation)</li>
              <li>Yellowing follows saturating exponential kinetics</li>
              <li>Transmittance loss directly reduces power output</li>
              <li>Material choice: Silicone {">"} POE {">"} EVA for UV stability</li>
              <li>Glass/glass construction blocks moisture, extending life</li>
              <li>Combined UV + moisture damage through hydrolysis</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.uv, marginBottom: '12px' }}>Industry Impact:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              The global solar industry invests billions in encapsulant R&D. Moving from standard EVA
              to advanced materials like POE or silicone can add 5-10 years to module lifetime,
              dramatically improving project economics. Your understanding of degradation physics
              enables better material selection and lifetime predictions!
            </p>
          </div>
          {renderVisualization(true, true)}
        </div>
        {renderBottomBar(true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default EncapsulationUVAgingRenderer;
