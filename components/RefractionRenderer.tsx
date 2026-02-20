'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// -----------------------------------------------------------------------------
// Refraction (Broken Straw) - Complete 10-Phase Game
// How light bends when passing between materials
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

interface RefractionRendererProps {
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
    scenario: "You're at a swimming pool and notice that the water appears much shallower than it actually is. A friend jumps in expecting 1.5m of water but it's actually 2m deep.",
    question: "What causes the pool to look shallower than it is?",
    options: [
      { id: 'a', label: "Water compresses the light waves making things look smaller" },
      { id: 'b', label: "Light bends when leaving water, making the bottom appear raised", correct: true },
      { id: 'c', label: "Your eyes adjust incorrectly underwater" },
      { id: 'd', label: "Chlorine in the water distorts the image" }
    ],
    explanation: "When light travels from water to air, it bends away from the normal (perpendicular). Your brain assumes light travels in straight lines, so it perceives the bottom at a shallower depth than reality."
  },
  {
    scenario: "An indigenous spearfisher aims at a fish in clear water. Instead of aiming directly at where they see the fish, they aim at a point below and slightly behind the apparent position.",
    question: "Why must the spearfisher aim below the apparent fish position?",
    options: [
      { id: 'a', label: "Fish swim faster than they appear to" },
      { id: 'b', label: "The actual fish is deeper than where it appears due to refraction", correct: true },
      { id: 'c', label: "Water resistance slows the spear" },
      { id: 'd', label: "Fish can see the spear coming and dodge" }
    ],
    explanation: "Light from the fish bends at the water surface, making the fish appear higher and closer than it actually is. Experienced fishers learn to compensate by aiming lower."
  },
  {
    scenario: "A straw in a glass of water appears bent or broken at the water surface. You move your head from side to side while watching.",
    question: "What happens to the apparent bend as you change your viewing angle?",
    options: [
      { id: 'a', label: "The bend stays exactly the same regardless of viewing angle" },
      { id: 'b', label: "The apparent displacement changes because light takes different paths to your eye", correct: true },
      { id: 'c', label: "The bend reverses direction" },
      { id: 'd', label: "The straw appears straight when viewed from certain angles" }
    ],
    explanation: "The apparent position of the underwater portion depends on your viewing angle. Different angles mean different ray paths through the refracting surface, changing how much the straw appears displaced."
  },
  {
    scenario: "An optometrist is fitting a patient with new glasses. The patient needs stronger lenses than their current pair.",
    question: "What property of the new lenses needs to be different to bend light more?",
    options: [
      { id: 'a', label: "The lenses need to be more curved and/or made of higher refractive index material", correct: true },
      { id: 'b', label: "The lenses need to be flatter and thinner" },
      { id: 'c', label: "The lenses just need to be larger in diameter" },
      { id: 'd', label: "The lenses need a darker tint" }
    ],
    explanation: "Lens power depends on curvature and material. Higher refractive index materials bend light more per unit curvature. Steeper curves also increase bending. Both factors contribute to stronger prescriptions."
  },
  {
    scenario: "A jeweler is examining two clear gemstones. One is diamond (n=2.42) and one is cubic zirconia (n=2.15). Both are cut identically.",
    question: "Which stone will have more 'fire' (rainbow sparkle) and why?",
    options: [
      { id: 'a', label: "Cubic zirconia, because it's softer and reflects more" },
      { id: 'b', label: "Diamond, because higher refractive index means more bending and dispersion", correct: true },
      { id: 'c', label: "They will look identical since cuts are the same" },
      { id: 'd', label: "Neither shows fire - that only comes from colored gems" }
    ],
    explanation: "Diamond's higher refractive index causes light to bend more and separates colors (dispersion) more dramatically. Combined with its lower critical angle for total internal reflection, this creates more brilliance and fire."
  },
  {
    scenario: "A fiber optic cable carries internet data across the ocean. The glass fiber core has a higher refractive index than the surrounding cladding.",
    question: "How does this refractive index difference enable data transmission?",
    options: [
      { id: 'a', label: "Light travels faster in the core, speeding up transmission" },
      { id: 'b', label: "Light hitting the boundary at shallow angles reflects totally, staying trapped in the core", correct: true },
      { id: 'c', label: "The cladding absorbs stray light that would cause interference" },
      { id: 'd', label: "The difference creates an electric field that guides the light" }
    ],
    explanation: "When light in a higher-index material hits a boundary with lower-index material at a shallow angle (beyond the critical angle), it reflects completely - this is total internal reflection. Light bounces along the fiber core without escaping."
  },
  {
    scenario: "You're driving on a hot summer day and see what looks like water on the road ahead. As you approach, the 'water' disappears.",
    question: "What causes this mirage effect?",
    options: [
      { id: 'a', label: "Heat evaporates water from the road surface" },
      { id: 'b', label: "Hot air near the road has lower refractive index, bending light upward", correct: true },
      { id: 'c', label: "Your eyes get tired and create illusions" },
      { id: 'd', label: "Sunlight reflects directly off the road surface" }
    ],
    explanation: "Hot air is less dense and has a lower refractive index. Light from the sky gradually bends as it passes through the temperature gradient, curving upward toward your eyes. You see sky reflected where the road should be - looking like water."
  },
  {
    scenario: "A scientist adds sugar to water in a beaker. As the concentration increases, a laser beam passing through bends more and more.",
    question: "What is happening to the water's optical properties?",
    options: [
      { id: 'a', label: "Sugar makes the water denser, which decreases its refractive index" },
      { id: 'b', label: "Dissolved sugar increases the refractive index, causing more bending", correct: true },
      { id: 'c', label: "Sugar crystals scatter the light in different directions" },
      { id: 'd', label: "The sugar creates a chemical reaction that changes light color" }
    ],
    explanation: "Dissolved substances increase the refractive index of liquids. Sugar water (n~1.4-1.5 depending on concentration) bends light more than pure water (n=1.33). This principle is used in refractometers to measure sugar content in foods and beverages."
  },
  {
    scenario: "A underwater photographer notices that objects appear larger and closer when viewed through their diving mask.",
    question: "What causes this magnification effect underwater?",
    options: [
      { id: 'a', label: "The mask lens acts as a magnifying glass" },
      { id: 'b', label: "Light bending at the water-air-mask interface creates apparent magnification", correct: true },
      { id: 'c', label: "Water pressure compresses the photographer's eyes" },
      { id: 'd', label: "Reduced light underwater makes pupils dilate, increasing perceived size" }
    ],
    explanation: "Light bends when passing from water through the mask's air space to your eyes. This refraction makes objects appear about 33% larger and 25% closer than they actually are - a standard compensation underwater photographers must learn."
  },
  {
    scenario: "An engineer is designing an anti-reflective coating for camera lenses. They need to minimize light loss at the air-glass boundary.",
    question: "How does the coating reduce reflection by using refraction principles?",
    options: [
      { id: 'a', label: "The coating absorbs incoming light before it can reflect" },
      { id: 'b', label: "The coating has intermediate refractive index, creating destructive interference of reflected waves", correct: true },
      { id: 'c', label: "The coating is perfectly smooth to prevent scattering" },
      { id: 'd', label: "The coating polarizes light to block reflections" }
    ],
    explanation: "Anti-reflective coatings use thin layers with intermediate refractive indices. Light reflects from both the top and bottom of the coating. When the coating thickness equals 1/4 wavelength, these reflections destructively interfere, canceling each other."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '👓',
    title: 'Prescription Eyeglasses',
    short: 'Lens curvature refracts light to correct nearsightedness, farsightedness, and astigmatism',
    tagline: 'Bending light to perfect vision',
    description: 'Over 4 billion people worldwide need vision correction. Eyeglass lenses use precisely calculated curvatures to refract light, compensating for eyes that focus incorrectly. Myopia (nearsightedness) requires diverging lenses, while hyperopia (farsightedness) needs converging lenses.',
    connection: 'This game teaches how different materials bend light at different angles - the exact physics optometrists use when prescribing lenses with specific curvatures and materials.',
    howItWorks: 'Light entering a curved lens refracts at each surface according to Snell\'s law. The lens power in diopters equals 1/focal length in meters. Steeper curves and higher refractive index materials bend light more.',
    stats: [
      { value: '50%', label: 'Of adults need correction', icon: '👁️' },
      { value: '1.74', label: 'High-index lens n value', icon: '🔬' },
      { value: '$150B', label: 'Global eyewear market', icon: '💰' }
    ],
    examples: ['Single vision lenses', 'Bifocals', 'Progressive lenses', 'Photochromic lenses'],
    companies: ['EssilorLuxottica', 'Zeiss', 'Hoya', 'Rodenstock'],
    futureImpact: 'Smart glasses with adjustable focus using liquid crystal lenses may eventually replace traditional prescriptions.',
    color: '#3B82F6'
  },
  {
    icon: '📷',
    title: 'Camera Lens Design',
    short: 'Multi-element lenses use refraction to focus images sharply across the entire frame',
    tagline: 'Engineering the perfect image',
    description: 'Camera lenses contain 10-20 precisely shaped glass elements, each designed to refract light in ways that correct for aberrations. Chromatic aberration (color fringing) occurs because different wavelengths refract differently.',
    connection: 'The wavelength-dependent refraction explored in this game explains chromatic aberration - the challenge every camera lens designer must overcome.',
    howItWorks: 'Each lens element has specific curvature and refractive index. Rays from scene points must all converge to the same image point regardless of where they enter the lens. Special low-dispersion glass and aspherical elements correct aberrations.',
    stats: [
      { value: '10-20', label: 'Elements in quality lenses', icon: '🔍' },
      { value: 'f/1.2', label: 'Fast lens apertures', icon: '📸' },
      { value: '$100B', label: 'Camera market size', icon: '💵' }
    ],
    examples: ['Smartphone lenses', 'DSLR zooms', 'Cinema primes', 'Microscope objectives'],
    companies: ['Canon', 'Sony', 'Nikon', 'Zeiss'],
    futureImpact: 'Computational photography combined with simpler optics may reduce lens complexity while maintaining image quality.',
    color: '#8B5CF6'
  },
  {
    icon: '💎',
    title: 'Gemstone Cutting',
    short: 'Diamond facets maximize brilliance by exploiting total internal reflection',
    tagline: 'The science of sparkle',
    description: 'A diamond\'s sparkle comes from its high refractive index (n=2.42) and precisely angled facets. Light entering the diamond refracts, then reflects internally off the back facets (total internal reflection), and exits through the top with dramatic dispersion.',
    connection: 'This game demonstrates critical angles and total internal reflection - the physics that makes diamonds and other gems sparkle brilliantly.',
    howItWorks: 'Diamond\'s critical angle is only 24.4 degrees due to high refractive index. Facets are angled so light entering the top reflects off back facets rather than passing through. The stone acts as a light trap.',
    stats: [
      { value: '2.42', label: 'Diamond refractive index', icon: '💎' },
      { value: '24.4°', label: 'Critical angle', icon: '📐' },
      { value: '$80B', label: 'Diamond jewelry market', icon: '💍' }
    ],
    examples: ['Round brilliant cut', 'Princess cut', 'Emerald cut', 'Cushion cut'],
    companies: ['De Beers', 'Tiffany & Co.', 'Cartier', 'Harry Winston'],
    futureImpact: 'AI-optimized cutting patterns and lab-grown diamonds are changing how the industry maximizes optical performance.',
    color: '#EC4899'
  },
  {
    icon: '🌊',
    title: 'Fiber Optic Communications',
    short: 'Total internal reflection guides light signals thousands of kilometers through glass fibers',
    tagline: 'The internet travels at light speed',
    description: 'The global internet runs on fiber optics - thin glass strands that trap light through total internal reflection. Data encoded as light pulses travels thousands of kilometers with minimal loss, enabling modern digital infrastructure.',
    connection: 'Total internal reflection, demonstrated when light bends at material boundaries in this game, is exactly how fiber optics guide light around the world.',
    howItWorks: 'Optical fiber has a high-index core surrounded by lower-index cladding. Light entering at shallow angles exceeds the critical angle and reflects internally rather than escaping. Pulses bounce along the fiber.',
    stats: [
      { value: '100+ Tbps', label: 'Capacity per fiber pair', icon: '📡' },
      { value: '0.2 dB/km', label: 'Signal loss rate', icon: '📉' },
      { value: '500M km', label: 'Fiber deployed globally', icon: '🌍' }
    ],
    examples: ['Submarine cables', 'Metro networks', 'Data center interconnects', 'FTTH broadband'],
    companies: ['Corning', 'Prysmian', 'Fujikura', 'OFS'],
    futureImpact: 'Hollow-core fibers guiding light through air could reduce latency to near the ultimate speed-of-light limit.',
    color: '#10B981'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const RefractionRenderer: React.FC<RefractionRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Simulation state
  const [viewingAngle, setViewingAngle] = useState(30);
  const [refractiveIndex, setRefractiveIndex] = useState(1.33);
  const [waterLevel, setWaterLevel] = useState(60);
  const [showRayPaths, setShowRayPaths] = useState(false);

  // Twist phase - different materials
  const [material, setMaterial] = useState<'water' | 'sugar' | 'glass' | 'diamond'>('water');

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [confirmedQuestions, setConfirmedQuestions] = useState<Set<number>>(new Set());

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

  // Get refractive index for material
  const getMaterialIndex = (mat: string) => {
    const indices: Record<string, number> = {
      water: 1.33,
      sugar: 1.45,
      glass: 1.52,
      diamond: 2.42
    };
    return indices[mat] || 1.33;
  };

  // Calculate apparent shift based on refraction
  const calculateApparentShift = useCallback(() => {
    const angleRad = (viewingAngle * Math.PI) / 180;
    const n = refractiveIndex;
    const shift = Math.tan(angleRad) * (1 - 1/n) * waterLevel * 0.5;
    return Math.min(Math.max(shift, -40), 40);
  }, [viewingAngle, refractiveIndex, waterLevel]);

  const apparentShift = calculateApparentShift();

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#3B82F6',
    accentGlow: 'rgba(59, 130, 246, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#E5E7EB',
    textMuted: '#D1D5DB',
    border: '#2a2a3a',
    water: '#60a5fa',
    straw: '#fbbf24',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
    caption: { fontSize: '12px', fontWeight: 400, lineHeight: 1.4, color: 'rgba(255, 255, 255, 0.6)' },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Materials',
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
        gameType: 'refraction',
        gameTitle: 'Refraction (Broken Straw)',
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

  // Straw in Water Visualization SVG Component
  const RefractionVisualization = ({ showControls = false }: { showControls?: boolean }) => {
    const width = isMobile ? 320 : 400;
    const height = isMobile ? 280 : 320;
    const glassWidth = 100;
    const glassHeight = 180;
    const waterHeight = (waterLevel / 100) * glassHeight * 0.85;
    const glassLeft = (width - glassWidth) / 2;
    const glassTop = 50;
    const waterSurfaceY = glassTop + glassHeight - waterHeight;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="strawGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <g>
          <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
            Light Bending at Water Surface
          </text>
        </g>

        {/* Background grid */}
        <g opacity="0.3">
          {Array.from({ length: 10 }).map((_, i) => (
            <React.Fragment key={i}>
              <line x1={i * (width/10)} y1="35" x2={i * (width/10)} y2={height - 20} stroke={colors.border} strokeWidth="1" />
              <line x1="0" y1={35 + i * ((height - 55) / 10)} x2={width} y2={35 + i * ((height - 55) / 10)} stroke={colors.border} strokeWidth="1" />
            </React.Fragment>
          ))}
        </g>

        {/* Glass container */}
        <rect
          x={glassLeft}
          y={glassTop}
          width={glassWidth}
          height={glassHeight}
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="2"
          rx="4"
        />

        {/* Water */}
        <rect
          x={glassLeft + 2}
          y={waterSurfaceY}
          width={glassWidth - 4}
          height={waterHeight - 2}
          fill="url(#waterGradient)"
          rx="2"
        />

        {/* Water surface highlight */}
        <line
          x1={glassLeft + 2}
          y1={waterSurfaceY}
          x2={glassLeft + glassWidth - 2}
          y2={waterSurfaceY}
          stroke={colors.water}
          strokeWidth="2"
          filter="url(#glowFilter)"
        />

        {/* Straw above water (actual) */}
        <line
          x1={width/2}
          y1={glassTop - 10}
          x2={width/2}
          y2={waterSurfaceY}
          stroke="url(#strawGradient)"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Straw underwater - ghost (actual position) */}
        <line
          x1={width/2}
          y1={waterSurfaceY}
          x2={width/2}
          y2={glassTop + glassHeight - 10}
          stroke={colors.straw}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="4,4"
          opacity="0.25"
        />

        {/* Straw underwater - apparent position */}
        <line
          x1={width/2}
          y1={waterSurfaceY}
          x2={width/2 + apparentShift}
          y2={glassTop + glassHeight - 10}
          stroke="url(#strawGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          filter="url(#glowFilter)"
        />

        {/* Ray paths if enabled */}
        {showRayPaths && (
          <>
            {/* Normal line */}
            <line
              x1={width/2}
              y1={waterSurfaceY - 40}
              x2={width/2}
              y2={waterSurfaceY + 40}
              stroke="rgba(148, 163, 184, 0.5)"
              strokeWidth="1"
              strokeDasharray="4,4"
            />

            {/* Light ray in water */}
            <line
              x1={width/2 + apparentShift * 0.8}
              y1={glassTop + glassHeight - 40}
              x2={width/2}
              y2={waterSurfaceY}
              stroke={colors.error}
              strokeWidth="2"
              strokeDasharray="6,4"
              filter="url(#glowFilter)"
            />

            {/* Light ray in air to eye */}
            <line
              x1={width/2}
              y1={waterSurfaceY}
              x2={width/2 + 50 + viewingAngle * 0.5}
              y2={glassTop - 30}
              stroke={colors.error}
              strokeWidth="2"
              strokeDasharray="6,4"
              filter="url(#glowFilter)"
            />

            {/* Perceived straight path */}
            <line
              x1={width/2 + apparentShift * 0.8}
              y1={glassTop + glassHeight - 40}
              x2={width/2 + 50 + viewingAngle * 0.5}
              y2={glassTop - 30}
              stroke={colors.success}
              strokeWidth="2"
              opacity="0.5"
            />

            {/* Bending point indicator */}
            <circle
              cx={width/2}
              cy={waterSurfaceY}
              r="6"
              fill={colors.accent}
              filter="url(#glowFilter)"
            />
          </>
        )}

        {/* Eye indicator */}
        <g transform={`translate(${width/2 + 50 + viewingAngle * 0.5}, ${glassTop - 35})`}>
          <ellipse cx="0" cy="8" rx="10" ry="6" fill="white" stroke={colors.textPrimary} strokeWidth="2" />
          <circle cx="0" cy="8" r="3" fill={colors.accent} />
          <circle cx="1" cy="7" r="1" fill="white" />
        </g>

        {/* Labels */}
        <text x={width - 40} y={glassTop - 10} fill={colors.textMuted} fontSize="11" textAnchor="middle">AIR</text>
        <text x={width - 40} y={waterSurfaceY + 30} fill={colors.water} fontSize="11" textAnchor="middle">
          {material.toUpperCase()}
        </text>
        <text x={width - 40} y={waterSurfaceY + 44} fill={colors.textMuted} fontSize="11" textAnchor="middle">
          n={refractiveIndex.toFixed(2)}
        </text>

        {/* Axis labels */}
        <text x={width/2} y={height - 18} textAnchor="middle" fill={colors.textMuted} fontSize="11">Distance</text>
        <text x={12} y={height/2} textAnchor="middle" fill={colors.textMuted} fontSize="11" transform={`rotate(-90, 12, ${height/2})`}>Angle</text>

        {/* Shift indicator */}
        <text x={width/2} y={height - 5} textAnchor="middle" fill={colors.textSecondary} fontSize="11">
          Apparent shift: {apparentShift > 0 ? '+' : ''}{apparentShift.toFixed(1)}px
        </text>

        {/* Legend */}
        {showRayPaths && (
          <g transform={`translate(15, ${height - 45})`}>
            <rect x="0" y="0" width="80" height="35" rx="4" fill="rgba(30, 41, 59, 0.9)" />
            <line x1="8" y1="12" x2="25" y2="12" stroke={colors.error} strokeWidth="2" strokeDasharray="4,2" />
            <text x="30" y="15" fill={colors.textMuted} fontSize="11">Actual ray</text>
            <line x1="8" y1="26" x2="25" y2="26" stroke={colors.success} strokeWidth="2" />
            <text x="30" y="29" fill={colors.textMuted} fontSize="11">Perceived</text>
          </g>
        )}
      </svg>
    );
  };

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      height: '4px',
      background: colors.bgSecondary,
      flexShrink: 0,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Track highest phase reached for nav dot access control
  const [highestPhaseIndex, setHighestPhaseIndex] = useState(() => phaseOrder.indexOf(getInitialPhase()));

  useEffect(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    setHighestPhaseIndex(prev => Math.max(prev, currentIndex));
  }, [phase]);

  // Navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px 0',
    }}>
      {phaseOrder.map((p, i) => {
        const canClick = i <= highestPhaseIndex;
        return (
          <button
            key={p}
            onClick={() => { if (canClick) goToPhase(p); }}
            style={{
              width: phase === p ? '20px' : '10px',
              height: '10px',
              borderRadius: '5px',
              border: 'none',
              background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
              cursor: canClick ? 'pointer' : 'default',
              opacity: canClick ? 1 : 0.4,
              transition: 'all 0.3s ease',
            }}
            aria-label={phaseLabels[p]}
          />
        );
      })}
    </div>
  );

  // Bottom navigation bar
  const renderBottomBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === phaseOrder.length - 1;

    // During test phase, disable Next unless quiz is submitted
    const isTestPhaseIncomplete = phase === 'test' && !testSubmitted;
    const nextDisabled = isLast || isTestPhaseIncomplete;

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        borderTop: `1px solid ${colors.border}`,
        background: colors.bgCard,
        flexShrink: 0,
      }}>
        <button
          onClick={() => { if (!isFirst) goToPhase(phaseOrder[currentIndex - 1]); }}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '14px',
            background: colors.bgSecondary,
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            cursor: isFirst ? 'not-allowed' : 'pointer',
            opacity: isFirst ? 0.3 : 1,
            minHeight: '44px',
          }}
        >{'\u2190'} Back</button>
        <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>
        <button
          onClick={() => { if (!nextDisabled) nextPhase(); }}
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '14px',
            background: nextDisabled ? colors.bgSecondary : `linear-gradient(135deg, ${colors.accent} 0%, #2563EB 100%)`,
            color: nextDisabled ? colors.textMuted : colors.textPrimary,
            border: 'none',
            cursor: nextDisabled ? 'not-allowed' : 'pointer',
            opacity: nextDisabled ? 0.4 : 1,
            minHeight: '44px',
          }}
        >Next {'\u2192'}</button>
      </div>
    );
  };

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #2563EB)`,
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
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
      }}>
        {renderProgressBar()}
        {renderNavDots()}
        <div style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
            minHeight: '100%',
          }}>
            <div style={{
              fontSize: '64px',
              marginBottom: '24px',
              animation: 'pulse 2s infinite',
            }}>
              🥤💡
            </div>
            <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

            <p style={{ ...typo.caption, marginBottom: '8px' }}>Physics of Light</p>
            <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
              The Broken Straw Illusion
            </h1>

            <p style={{
              ...typo.body,
              color: colors.textSecondary,
              maxWidth: '600px',
              marginBottom: '32px',
            }}>
              "Put a straw in water and it appears to <span style={{ color: colors.accent }}>bend or break</span> at the surface. Is this magic? An optical illusion? Or is something real happening to the light?"
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '32px',
              maxWidth: '500px',
              border: `1px solid ${colors.border}`,
            }}>
              <RefractionVisualization />
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '16px' }}>
                Notice how the straw appears "broken" at the water line - the underwater part seems shifted from where it should be.
              </p>
            </div>

            <button
              onClick={() => { playSound('click'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Start Exploring
            </button>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Moving the cup causes more change to the apparent break' },
      { id: 'b', text: 'Moving your head (viewing angle) causes more change', correct: true },
      { id: 'c', text: 'Both cause equal changes - the break stays proportional' },
      { id: 'd', text: 'Neither affects the break - it stays constant' },
    ];

    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        {renderNavDots()}
        <div style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
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
              Which action will change the apparent "break" in the straw MORE?
            </h2>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <RefractionVisualization />
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '32px' }}>🔄</div>
                  <p style={{ ...typo.small, color: colors.textMuted }}>Move the cup</p>
                </div>
                <div style={{ fontSize: '24px', color: colors.textMuted, alignSelf: 'center' }}>vs</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '32px' }}>👀</div>
                  <p style={{ ...typo.small, color: colors.textMuted }}>Move your head</p>
                </div>
              </div>
            </div>

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
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        {renderNavDots()}
        <div style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Explore Refraction
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              This visualization demonstrates how light bends at the water surface. Adjust the controls to see how viewing angle and material affect the apparent break. Understanding refraction is important in real-world applications like eyeglasses, cameras, and fiber optics.
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              {/* Side-by-side layout */}
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '12px' : '20px',
                width: '100%',
                alignItems: isMobile ? 'center' : 'flex-start',
              }}>
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                    <RefractionVisualization showControls />
                  </div>
                </div>
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Viewing angle slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Viewing Angle</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{viewingAngle}°</span>
                    </div>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      value={viewingAngle}
                      onChange={(e) => setViewingAngle(parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        height: '20px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        accentColor: colors.accent,
                        touchAction: 'pan-y',
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>Left (-45°)</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>Straight (0°)</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>Right (+45°)</span>
                    </div>
                  </div>

                  {/* Refractive index slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Refractive Index</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {refractiveIndex.toFixed(2)} ({refractiveIndex < 1.4 ? 'Water' : refractiveIndex < 1.5 ? 'Sugar Water' : 'Glass'})
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="1.6"
                      step="0.01"
                      value={refractiveIndex}
                      onChange={(e) => setRefractiveIndex(parseFloat(e.target.value))}
                      style={{
                        width: '100%',
                        height: '20px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        accentColor: colors.accent,
                        touchAction: 'pan-y',
                      }}
                    />
                  </div>

                  {/* Water level slider */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Water Level</span>
                      <span style={{ ...typo.small, color: colors.water, fontWeight: 600 }}>{waterLevel}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="90"
                      value={waterLevel}
                      onChange={(e) => setWaterLevel(parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        height: '20px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        accentColor: colors.water,
                        touchAction: 'pan-y',
                      }}
                    />
                  </div>

                  {/* Toggle ray paths */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                    <button
                      onClick={() => { playSound('click'); setShowRayPaths(!showRayPaths); }}
                      style={{
                        padding: '12px 24px',
                        borderRadius: '8px',
                        border: 'none',
                        background: showRayPaths ? colors.accent : colors.bgSecondary,
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {showRayPaths ? 'Hide Ray Paths' : 'Show Ray Paths'}
                    </button>
                  </div>

                  {/* Stats display */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '16px',
                  }}>
                    <div style={{
                      background: colors.bgSecondary,
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center',
                    }}>
                      <div style={{ ...typo.h3, color: colors.accent }}>{viewingAngle}°</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Viewing Angle</div>
                    </div>
                    <div style={{
                      background: colors.bgSecondary,
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center',
                    }}>
                      <div style={{ ...typo.h3, color: colors.success }}>{refractiveIndex.toFixed(2)}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Refractive Index</div>
                    </div>
                    <div style={{
                      background: colors.bgSecondary,
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center',
                    }}>
                      <div style={{ ...typo.h3, color: colors.warning }}>{apparentShift.toFixed(1)}px</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Apparent Shift</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {Math.abs(viewingAngle) > 30 && (
              <div style={{
                background: `${colors.warning}22`,
                border: `1px solid ${colors.warning}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
                  Notice how extreme viewing angles create the biggest apparent shift!
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
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        {renderNavDots()}
        <div style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
            <div style={{
              background: prediction === 'b' ? `${colors.success}22` : `${colors.error}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${prediction === 'b' ? colors.success : colors.error}44`,
            }}>
              <p style={{ ...typo.body, color: prediction === 'b' ? colors.success : colors.error, margin: 0 }}>
                {prediction === 'b' ? '✓ Your prediction was correct! ' : '✗ Your prediction was close, but... '}
                As you observed in the experiment, moving your viewing angle changes the apparent break more because it changes the path light takes through the refracting surface.
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              The Physics of Refraction
            </h2>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Snell's Law: n₁ sin(θ₁) = n₂ sin(θ₂)</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  When light passes from one material to another with a different <span style={{ color: colors.accent }}>refractive index</span>, it changes direction. The refractive index tells us how much slower light travels in that material compared to vacuum.
                </p>
                <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: 2 }}>
                  <li>Air: n ≈ 1.00 (light travels near maximum speed)</li>
                  <li>Water: n ≈ 1.33 (light travels 25% slower)</li>
                  <li>Glass: n ≈ 1.50 (light travels 33% slower)</li>
                  <li>Diamond: n ≈ 2.42 (light travels 59% slower)</li>
                </ul>
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
                Why Your Brain Gets Fooled
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Your brain assumes light always travels in straight lines. When light bends at the water surface, your brain traces the ray straight back - putting the underwater straw in the wrong position. The bigger the angle, the more bending, the bigger the illusion!
              </p>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Explore Different Materials
            </button>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Sugar water bends light LESS than plain water' },
      { id: 'b', text: 'Sugar water bends light MORE than plain water (bigger apparent break)', correct: true },
      { id: 'c', text: 'Sugar water has no different effect on light bending' },
      { id: 'd', text: 'Sugar water adds rainbow colors to the bending' },
    ];

    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        {renderNavDots()}
        <div style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
            <div style={{
              background: `${colors.warning}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                New Variable: Material Properties
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              What happens if we dissolve sugar in the water?
            </h2>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
                Sugar increases the density of water. How will this affect the "broken straw" effect?
              </p>
              {/* SVG comparison diagram */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <svg width={isMobile ? 320 : 400} height={180} viewBox="0 0 400 180" style={{ background: colors.bgCard, borderRadius: '12px' }}>
                <defs>
                  <linearGradient id="twistWaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.6" />
                  </linearGradient>
                  <linearGradient id="twistSugarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#d97706" stopOpacity="0.6" />
                  </linearGradient>
                  <filter id="twistGlow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <g>
                  <text x="200" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">Material Comparison</text>
                </g>
                {/* Plain water side */}
                <g transform="translate(40, 35)">
                  <rect x="0" y="0" width="130" height="130" rx="8" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                  <rect x="2" y="50" width="126" height="78" rx="4" fill="url(#twistWaterGrad)" />
                  <line x1="65" y1="10" x2="65" y2="50" stroke="#fbbf24" strokeWidth="6" strokeLinecap="round" />
                  <line x1="65" y1="50" x2="65" y2="110" stroke="#fbbf24" strokeWidth="6" strokeLinecap="round" opacity="0.4" strokeDasharray="4,4" />
                  <circle cx="65" cy="50" r="4" fill={colors.water} filter="url(#twistGlow)" />
                  <text x="65" y="145" textAnchor="middle" fill={colors.textMuted} fontSize="11">Plain Water</text>
                  <text x="65" y="158" textAnchor="middle" fill={colors.water} fontSize="11" fontWeight="600">n = 1.33</text>
                </g>
                {/* Arrow */}
                <g transform="translate(185, 85)">
                  <line x1="0" y1="0" x2="25" y2="0" stroke={colors.textMuted} strokeWidth="2" />
                  <line x1="25" y1="0" x2="20" y2="-5" stroke={colors.textMuted} strokeWidth="2" />
                  <line x1="25" y1="0" x2="20" y2="5" stroke={colors.textMuted} strokeWidth="2" />
                </g>
                {/* Sugar water side */}
                <g transform="translate(230, 35)">
                  <rect x="0" y="0" width="130" height="130" rx="8" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                  <rect x="2" y="50" width="126" height="78" rx="4" fill="url(#twistSugarGrad)" />
                  <line x1="65" y1="10" x2="65" y2="50" stroke="#fbbf24" strokeWidth="6" strokeLinecap="round" />
                  <line x1="65" y1="50" x2="80" y2="110" stroke="#fbbf24" strokeWidth="6" strokeLinecap="round" opacity="0.4" strokeDasharray="4,4" />
                  <line x1="65" y1="50" x2="75" y2="110" stroke="#fbbf24" strokeWidth="6" strokeLinecap="round" filter="url(#twistGlow)" />
                  <circle cx="65" cy="50" r="4" fill={colors.warning} filter="url(#twistGlow)" />
                  <text x="65" y="145" textAnchor="middle" fill={colors.textMuted} fontSize="11">Sugar Water</text>
                  <text x="65" y="158" textAnchor="middle" fill={colors.warning} fontSize="11" fontWeight="600">n = ???</text>
                </g>
              </svg>
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
                Compare Materials
              </button>
            )}
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const materials = [
      { id: 'water', name: 'Water', n: 1.33, color: colors.water },
      { id: 'sugar', name: 'Sugar Water', n: 1.45, color: colors.warning },
      { id: 'glass', name: 'Glass', n: 1.52, color: '#a78bfa' },
      { id: 'diamond', name: 'Diamond', n: 2.42, color: '#f472b6' },
    ];

    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        {renderNavDots()}
        <div style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Compare Different Materials
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Select different materials to see how refractive index affects the apparent break
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              {/* Side-by-side layout */}
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '12px' : '20px',
                width: '100%',
                alignItems: isMobile ? 'center' : 'flex-start',
              }}>
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                    <RefractionVisualization showControls />
                  </div>
                </div>
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Material selector */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                    marginBottom: '24px',
                  }}>
                    {materials.map((mat) => (
                      <button
                        key={mat.id}
                        onClick={() => {
                          playSound('click');
                          setMaterial(mat.id as typeof material);
                          setRefractiveIndex(mat.n);
                        }}
                        style={{
                          padding: '16px 8px',
                          borderRadius: '12px',
                          border: `2px solid ${material === mat.id ? mat.color : colors.border}`,
                          background: material === mat.id ? `${mat.color}22` : colors.bgSecondary,
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>{mat.name}</div>
                        <div style={{ ...typo.small, color: mat.color, fontWeight: 700 }}>n = {mat.n}</div>
                      </button>
                    ))}
                  </div>

                  {/* Viewing angle slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Viewing Angle</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{viewingAngle}°</span>
                    </div>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      value={viewingAngle}
                      onChange={(e) => setViewingAngle(parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        height: '20px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        accentColor: colors.accent,
                        touchAction: 'pan-y',
                      }}
                    />
                  </div>

                  {/* Comparison stats */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                  }}>
                    <div style={{
                      background: colors.bgSecondary,
                      borderRadius: '8px',
                      padding: '12px',
                      textAlign: 'center',
                    }}>
                      <div style={{ ...typo.h3, color: colors.water }}>
                        {(Math.tan(viewingAngle * Math.PI / 180) * (1 - 1/1.33) * waterLevel * 0.5).toFixed(1)}px
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Water Shift</div>
                    </div>
                    <div style={{
                      background: colors.bgSecondary,
                      borderRadius: '8px',
                      padding: '12px',
                      textAlign: 'center',
                    }}>
                      <div style={{ ...typo.h3, color: materials.find(m => m.id === material)?.color }}>
                        {apparentShift.toFixed(1)}px
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>{materials.find(m => m.id === material)?.name} Shift</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {refractiveIndex > 1.4 && (
              <div style={{
                background: `${colors.success}22`,
                border: `1px solid ${colors.success}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                  Higher refractive index = More bending = Bigger apparent shift!
                </p>
              </div>
            )}

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand the Pattern
            </button>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        {renderNavDots()}
        <div style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
            <div style={{
              background: twistPrediction === 'b' ? `${colors.success}22` : `${colors.error}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${twistPrediction === 'b' ? colors.success : colors.error}44`,
            }}>
              <p style={{ ...typo.body, color: twistPrediction === 'b' ? colors.success : colors.error, margin: 0 }}>
                {twistPrediction === 'b' ? '✓ Correct! ' : '✗ Actually, '}
                Sugar water has a higher refractive index, causing MORE light bending and a bigger apparent break!
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              The Refractive Index Pattern
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🔢</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>What Refractive Index Means</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  n = speed of light in vacuum / speed of light in material. Higher n means light travels slower in that material. When light slows down entering a denser medium, it bends toward the normal (perpendicular line).
                </p>
              </div>

              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>📊</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Common Refractive Indices</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '12px' }}>
                  {[
                    { name: 'Air', n: '1.00', note: 'Reference' },
                    { name: 'Water', n: '1.33', note: '25% slower' },
                    { name: 'Sugar Water', n: '1.40-1.50', note: 'Varies with concentration' },
                    { name: 'Glass', n: '1.50-1.90', note: 'Varies by type' },
                    { name: 'Cubic Zirconia', n: '2.15', note: 'Fake diamond' },
                    { name: 'Diamond', n: '2.42', note: 'Maximum sparkle' },
                  ].map((item, i) => (
                    <div key={i} style={{ background: colors.bgSecondary, padding: '8px 12px', borderRadius: '8px' }}>
                      <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>{item.name}: {item.n}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>{item.note}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{
                background: `${colors.success}11`,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.success}33`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>💡</span>
                  <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Total Internal Reflection</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  When light goes from high-n to low-n material at a steep enough angle (beyond the "critical angle"), it reflects completely instead of refracting. This is how fiber optics trap light inside glass fibers and how diamonds trap light for maximum sparkle!
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
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Refraction"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        {renderNavDots()}
        <div style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
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
                  How Refraction Connects:
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  {app.connection}
                </p>
              </div>

              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <h4 style={{ ...typo.small, color: colors.warning, marginBottom: '8px', fontWeight: 600 }}>
                  How It Works:
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  {app.howItWorks}
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '16px',
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

              <div style={{
                background: `${app.color}10`,
                borderRadius: '8px',
                padding: '16px',
                borderLeft: `3px solid ${app.color}`,
              }}>
                <h4 style={{ ...typo.small, color: app.color, marginBottom: '8px', fontWeight: 600 }}>
                  Future Impact:
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  {app.futureImpact}
                </p>
              </div>

              {/* Got It button for current app */}
              {!completedApps[selectedApp] && (
                <button
                  onClick={() => {
                    playSound('click');
                    const newCompleted = [...completedApps];
                    newCompleted[selectedApp] = true;
                    setCompletedApps(newCompleted);
                    // Auto-advance to next uncompleted app
                    const nextUncompleted = newCompleted.findIndex((c, i) => !c && i > selectedApp);
                    if (nextUncompleted !== -1) {
                      setSelectedApp(nextUncompleted);
                    } else {
                      const firstUncompleted = newCompleted.findIndex(c => !c);
                      if (firstUncompleted !== -1) {
                        setSelectedApp(firstUncompleted);
                      }
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '16px',
                    marginTop: '16px',
                    borderRadius: '12px',
                    border: 'none',
                    background: `linear-gradient(135deg, ${app.color} 0%, ${colors.accent} 100%)`,
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    minHeight: '52px',
                  }}
                >
                  Got It! Next App →
                </button>
              )}

              {completedApps[selectedApp] && (
                <div style={{
                  width: '100%',
                  padding: '16px',
                  marginTop: '16px',
                  borderRadius: '12px',
                  background: colors.bgSecondary,
                  color: colors.success,
                  fontSize: '16px',
                  fontWeight: 600,
                  textAlign: 'center',
                }}>
                  ✓ Completed
                </div>
              )}

              {/* Progress indicator */}
              <p style={{ textAlign: 'center', color: colors.textPrimary, fontSize: '14px', marginTop: '16px' }}>
                Application {selectedApp + 1} of {realWorldApps.length} — {completedApps.filter(c => c).length} of {realWorldApps.length} completed
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
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          background: colors.bgPrimary,
        }}>
          {renderProgressBar()}
          {renderNavDots()}
          <div style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px', textAlign: 'center' }}>
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
                  ? 'You understand refraction and light bending!'
                  : 'Review the concepts and try again.'}
              </p>

              {/* Answer Review */}
              <div style={{ textAlign: 'left', marginBottom: '32px' }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
                  Answer Review
                </h3>
                {testQuestions.map((q, i) => {
                  const correctId = q.options.find(o => o.correct)?.id;
                  const userAnswer = testAnswers[i];
                  const isCorrect = userAnswer === correctId;
                  const userLabel = q.options.find(o => o.id === userAnswer)?.label;
                  const correctLabel = q.options.find(o => o.correct)?.label;
                  return (
                    <div key={i} style={{
                      background: colors.bgCard,
                      borderRadius: '10px',
                      padding: '14px 16px',
                      marginBottom: '10px',
                      borderLeft: `3px solid ${isCorrect ? colors.success : colors.error}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                          color: isCorrect ? colors.success : colors.error,
                          fontWeight: 700,
                          fontSize: '16px',
                        }}>
                          {isCorrect ? '\u2713' : '\u2717'}
                        </span>
                        <span style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>
                          Q{i + 1}: {q.question}
                        </span>
                      </div>
                      <p style={{ ...typo.small, color: isCorrect ? colors.success : colors.error, margin: '4px 0 0 24px' }}>
                        Your answer: {userLabel}
                      </p>
                      {!isCorrect && (
                        <>
                          <p style={{ ...typo.small, color: colors.success, margin: '4px 0 0 24px' }}>
                            Correct answer: {correctLabel}
                          </p>
                          <p style={{ ...typo.small, color: colors.textMuted, margin: '4px 0 0 24px', fontStyle: 'italic' }}>
                            {q.explanation}
                          </p>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {passed ? (
                <button
                  onClick={() => { playSound('complete'); nextPhase(); }}
                  style={primaryButtonStyle}
                >
                  Continue to Mastery
                </button>
              ) : (
                <button
                  onClick={() => {
                    setTestSubmitted(false);
                    setTestAnswers(Array(10).fill(null));
                    setCurrentQuestion(0);
                    setTestScore(0);
                    setConfirmedQuestions(new Set());
                    goToPhase('hook');
                  }}
                  style={primaryButtonStyle}
                >
                  Review and Try Again
                </button>
              )}
            </div>
          </div>
          {renderBottomBar()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];
    const isConfirmed = confirmedQuestions.has(currentQuestion);
    const selectedAnswer = testAnswers[currentQuestion];
    const correctId = question.options.find(o => o.correct)?.id;
    const isSelectedCorrect = selectedAnswer === correctId;

    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        {renderNavDots()}
        <div style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
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
                      : confirmedQuestions.has(i)
                        ? (testAnswers[i] === testQuestions[i].options.find(o => o.correct)?.id ? colors.success : colors.error)
                        : testAnswers[i]
                          ? colors.warning
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {question.options.map(opt => {
                const isSelected = selectedAnswer === opt.id;
                const isCorrectOption = !!opt.correct;

                let borderColor = colors.border;
                let bgColor = colors.bgCard;

                if (isConfirmed) {
                  if (isCorrectOption) {
                    borderColor = colors.success;
                    bgColor = `${colors.success}22`;
                  } else if (isSelected && !isCorrectOption) {
                    borderColor = colors.error;
                    bgColor = `${colors.error}22`;
                  }
                } else if (isSelected) {
                  borderColor = colors.accent;
                  bgColor = `${colors.accent}22`;
                }

                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (isConfirmed) return;
                      playSound('click');
                      const newAnswers = [...testAnswers];
                      newAnswers[currentQuestion] = opt.id;
                      setTestAnswers(newAnswers);
                    }}
                    style={{
                      background: bgColor,
                      border: `2px solid ${borderColor}`,
                      borderRadius: '10px',
                      padding: '14px 16px',
                      textAlign: 'left',
                      cursor: isConfirmed ? 'default' : 'pointer',
                      opacity: isConfirmed && !isSelected && !isCorrectOption ? 0.5 : 1,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span style={{
                      display: 'inline-block',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: isConfirmed && isCorrectOption
                        ? colors.success
                        : isConfirmed && isSelected && !isCorrectOption
                          ? colors.error
                          : isSelected
                            ? colors.accent
                            : colors.bgSecondary,
                      color: (isSelected || (isConfirmed && isCorrectOption)) ? 'white' : colors.textSecondary,
                      textAlign: 'center',
                      lineHeight: '24px',
                      marginRight: '10px',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}>
                      {isConfirmed && isCorrectOption ? '\u2713' : isConfirmed && isSelected && !isCorrectOption ? '\u2717' : opt.id.toUpperCase()}
                    </span>
                    <span style={{ color: colors.textPrimary, ...typo.small }}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Feedback after confirmation */}
            {isConfirmed && (
              <div style={{
                background: isSelectedCorrect ? `${colors.success}18` : `${colors.error}18`,
                border: `1px solid ${isSelectedCorrect ? colors.success : colors.error}44`,
                borderRadius: '10px',
                padding: '14px 16px',
                marginBottom: '16px',
              }}>
                <p style={{
                  ...typo.body,
                  color: isSelectedCorrect ? colors.success : colors.error,
                  fontWeight: 700,
                  margin: '0 0 8px 0',
                }}>
                  {isSelectedCorrect ? '\u2713 Correct!' : '\u2717 Incorrect'}
                </p>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  {question.explanation}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {currentQuestion > 0 && isConfirmed && (
                <button
                  onClick={() => { setCurrentQuestion(currentQuestion - 1); }}
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

              {/* Check Answer button: shown when answer selected but not yet confirmed */}
              {selectedAnswer && !isConfirmed && (
                <button
                  onClick={() => {
                    setConfirmedQuestions(prev => new Set(prev).add(currentQuestion));
                    playSound(selectedAnswer === correctId ? 'success' : 'failure');
                  }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: `linear-gradient(135deg, ${colors.accent}, #2563EB)`,
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 600,
                    boxShadow: `0 4px 20px ${colors.accentGlow}`,
                  }}
                >
                  Check Answer
                </button>
              )}

              {/* Next Question button: shown only after confirming */}
              {isConfirmed && currentQuestion < 9 && (
                <button
                  onClick={() => {
                    setCurrentQuestion(currentQuestion + 1);
                  }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: colors.accent,
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Next Question
                </button>
              )}

              {/* Submit Test button: shown on last question after confirming */}
              {isConfirmed && currentQuestion === 9 && (
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
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
      }}>
        {renderProgressBar()}
        {renderNavDots()}
        <div style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
            minHeight: '100%',
          }}>
            <div style={{
              fontSize: '100px',
              marginBottom: '24px',
              animation: 'bounce 1s infinite',
            }}>
              🏆
            </div>
            <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

            <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
              Refraction Master!
            </h1>

            <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
              You now understand how light bends at boundaries between materials and why our brain gets fooled by this phenomenon.
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '32px',
              maxWidth: '400px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
                You Mastered:
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                {[
                  'Light changes speed in different materials',
                  'Speed change causes bending (Snell\'s Law)',
                  'Refractive index quantifies how much light slows',
                  'Your brain assumes straight-line paths (causing illusions)',
                  'Higher refractive index = more bending',
                  'Total internal reflection traps light',
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
              <button
                onClick={() => { window.location.href = '/'; }}
                style={primaryButtonStyle}
              >
                Complete Lesson
              </button>
            </div>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  return null;
};

export default RefractionRenderer;
