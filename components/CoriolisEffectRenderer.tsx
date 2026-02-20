'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// GOLD STANDARD: CORIOLIS EFFECT RENDERER
// Physics: F_Coriolis = -2m(ω × v) - Apparent deflection in rotating frames
// Northern Hemisphere: deflects RIGHT, Southern Hemisphere: deflects LEFT
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'hemisphere_changed'
  | 'ball_launched'
  | 'twist_prediction_made'
  | 'app_explored'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved';

interface TestQuestion {
  scenario: string;
  question: string;
  options: { text: string; correct: boolean }[];
  explanation: string;
}

interface TransferApp {
  icon: React.ReactNode;
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  howItWorks: string;
  stats: { value: string; label: string }[];
  examples: string[];
  companies: string[];
  futureImpact: string;
  color: string;
}

interface Props {
  onGameEvent?: (event: { type: GameEventType; data?: Record<string, unknown> }) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

const phaseNames: Record<Phase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Explore',
  review: 'Review',
  twist_predict: 'Twist Predict',
  twist_play: 'Twist Demo',
  twist_review: 'Twist Review',
  transfer: 'Transfer',
  test: 'Test',
  mastery: 'Mastery'
};

const realWorldApps = [
  {
    icon: '🌀',
    title: 'Hurricane & Cyclone Formation',
    short: 'Storm rotation patterns',
    tagline: 'Why hurricanes spin counterclockwise',
    description: 'The Coriolis effect causes large-scale weather systems to rotate. In the Northern Hemisphere, low-pressure systems (hurricanes) spin counterclockwise; in the Southern Hemisphere, clockwise.',
    connection: 'Air rushing toward a low-pressure center is deflected right (Northern) or left (Southern) by the Coriolis effect, creating rotation. The effect is too weak to influence small systems like tornadoes.',
    howItWorks: 'Warm ocean air rises, creating low pressure. Surrounding air rushes in but is deflected by Coriolis, creating rotation. Heat from condensation powers the storm, and Coriolis maintains the spin.',
    stats: [
      { value: '500 km', label: 'Hurricane diameter', icon: '🌀' },
      { value: '250 km/h', label: 'Max wind speeds', icon: '💨' },
      { value: '5°', label: 'Min latitude for formation', icon: '🌍' }
    ],
    examples: ['Atlantic hurricanes', 'Pacific typhoons', 'Indian Ocean cyclones', 'Australian willy-willies'],
    companies: ['NOAA', 'NHC', 'JTWC', 'Met Office'],
    futureImpact: 'Climate change may intensify hurricanes as warmer oceans provide more energy, while Coriolis continues to determine their rotation direction.',
    color: '#EF4444'
  },
  {
    icon: '✈️',
    title: 'Long-Range Navigation',
    short: 'Flight path planning',
    tagline: 'Accounting for Earth\'s rotation',
    description: 'Long-haul flights must account for the Coriolis effect. A plane flying from New York to London experiences an apparent deflection due to Earth rotating beneath it during the journey.',
    connection: 'Aircraft navigation systems continuously compensate for Coriolis deflection. Without correction, a flight across the Atlantic would miss its destination by hundreds of kilometers.',
    howItWorks: 'Inertial navigation systems use gyroscopes to maintain reference frames. GPS corrections account for Earth rotation. Flight computers adjust heading to compensate for Coriolis drift.',
    stats: [
      { value: '100+ km', label: 'Uncorrected drift', icon: '📍' },
      { value: '0.1°/hr', label: 'Gyro drift rate', icon: '🎯' },
      { value: '1 m', label: 'GPS accuracy', icon: '📡' }
    ],
    examples: ['Transatlantic flights', 'Transpacific routes', 'Polar navigation', 'Ballistic missiles'],
    companies: ['Boeing', 'Airbus', 'Honeywell', 'Northrop Grumman'],
    futureImpact: 'Quantum navigation systems using atom interferometry may provide Coriolis compensation without GPS, enabling navigation even when satellites are unavailable.',
    color: '#3B82F6'
  },
  {
    icon: '🎯',
    title: 'Long-Range Ballistics',
    short: 'Sniper and artillery corrections',
    tagline: 'Why bullets curve over distance',
    description: 'Military snipers and artillery must account for Coriolis when shooting over long distances. A bullet fired north in the Northern Hemisphere curves slightly east during flight.',
    connection: 'The Coriolis effect deflects moving objects perpendicular to their motion and the rotation axis. For a 1km shot, the deflection is about 10cm - enough to miss a target.',
    howItWorks: 'Ballistic computers calculate Coriolis deflection based on latitude, direction of fire, and projectile flight time. Shooters adjust aim point or use "spin drift" corrections.',
    stats: [
      { value: '10 cm', label: 'Drift at 1 km', icon: '🎯' },
      { value: '1.5 m', label: 'Drift at 2.5 km', icon: '📏' },
      { value: '0.00007°/s', label: 'Earth rotation rate', icon: '🌍' }
    ],
    examples: ['Military sniping', 'Artillery fire', 'Naval gunnery', 'Competitive shooting'],
    companies: ['Leupold', 'Nightforce', 'Kestrel', 'Applied Ballistics'],
    futureImpact: 'Smart rifle scopes with integrated sensors automatically calculate Coriolis corrections, enabling accurate first-round hits at extreme ranges.',
    color: '#8B5CF6'
  },
  {
    icon: '🌊',
    title: 'Ocean Currents',
    short: 'Gyres and circulation',
    tagline: 'How Earth\'s spin moves the oceans',
    description: 'The Coriolis effect shapes global ocean circulation, creating the great gyres that transport heat and nutrients around the planet. Wind-driven currents are deflected into circular patterns.',
    connection: 'Wind pushes surface water, which is deflected by Coriolis (Ekman transport). The result is net water movement 90° from wind direction, creating clockwise gyres in the Northern Hemisphere.',
    howItWorks: 'Trade winds push water westward near the equator. Coriolis deflects this flow poleward along western boundaries (Gulf Stream). The gyre completes as water returns via eastern boundary currents.',
    stats: [
      { value: '30 Sv', label: 'Gulf Stream flow', icon: '🌊' },
      { value: '100x', label: 'vs Amazon River', icon: '📊' },
      { value: '2 m/s', label: 'Current speed', icon: '💨' }
    ],
    examples: ['Gulf Stream', 'Kuroshio Current', 'North Pacific Gyre', 'Great Pacific Garbage Patch'],
    companies: ['NOAA', 'Woods Hole', 'Scripps', 'MBARI'],
    futureImpact: 'Climate change may weaken ocean circulation as temperature gradients decrease, potentially disrupting the heat transport that moderates European climate.',
    color: '#06B6D4'
  }
];

const CoriolisEffectRenderer: React.FC<Props> = ({ onGameEvent, gamePhase, onPhaseComplete }) => {
  const [phase, setPhase] = useState<Phase>('hook');
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [confirmedQuestion, setConfirmedQuestion] = useState<number | null>(null);
  const [testSubmitted, setTestSubmitted] = useState(false);

  // Simulation state
  const [hemisphere, setHemisphere] = useState<'north' | 'south'>('north');
  const [animPhase, setAnimPhase] = useState(0);
  const [ballLaunched, setBallLaunched] = useState(false);
  const [rotationSpeed, setRotationSpeed] = useState(50); // 0-100 scale

  const audioContextRef = useRef<AudioContext | null>(null);

  // Responsive check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Premium Design System
  const colors = {
    primary: '#3b82f6',       // blue-500 (earth/atmosphere)
    primaryDark: '#2563eb',   // blue-600
    accent: '#10b981',        // emerald-500
    secondary: '#8b5cf6',     // violet-500
    success: '#10b981',       // emerald-500
    danger: '#ef4444',        // red-500
    warning: '#f59e0b',       // amber-500
    bgDark: '#020617',        // slate-950
    bgCard: '#0f172a',        // slate-900
    bgCardLight: '#1e293b',   // slate-800
    textPrimary: '#f8fafc',   // slate-50
    textSecondary: '#94a3b8', // slate-400
    textMuted: '#64748b',     // slate-500
    border: '#334155',        // slate-700
    borderLight: '#475569',   // slate-600
    // Theme-specific
    earth: '#22c55e',         // green-500
    ocean: '#0ea5e9',         // sky-500
    arrow: '#f97316',         // orange-500
  };

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

  // Sync with external phase control
  useEffect(() => {
    if (gamePhase !== undefined && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Web Audio API sound system
  const playSound = useCallback((soundType: 'transition' | 'correct' | 'incorrect' | 'complete' | 'click' | 'whoosh') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      switch (soundType) {
        case 'transition':
          oscillator.frequency.setValueAtTime(440, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.15);
          break;
        case 'correct':
          oscillator.frequency.setValueAtTime(523, ctx.currentTime);
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
        case 'incorrect':
          oscillator.frequency.setValueAtTime(200, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.25);
          break;
        case 'complete':
          oscillator.type = 'triangle';
          oscillator.frequency.setValueAtTime(392, ctx.currentTime);
          oscillator.frequency.setValueAtTime(523, ctx.currentTime + 0.15);
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.3);
          oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.45);
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.6);
          break;
        case 'click':
          oscillator.frequency.setValueAtTime(600, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.1);
          break;
        case 'whoosh':
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(150, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15);
          oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
          gainNode.gain.setValueAtTime(0.06, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.35);
          break;
      }
    } catch {
      // Audio not available
    }
  }, []);

  const goToPhase = useCallback((newPhase: Phase) => {
    if (!phaseOrder.includes(newPhase)) return;
    playSound('transition');

    const currentIndex = phaseOrder.indexOf(phase);
    const newIndex = phaseOrder.indexOf(newPhase);

    if (onPhaseComplete && newIndex > currentIndex) {
      onPhaseComplete(phase);
    }

    setPhase(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseName: phaseNames[newPhase] } });
  }, [phase, playSound, onPhaseComplete, onGameEvent]);

  const handlePrediction = useCallback((prediction: string) => {
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'curves' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'prediction_made', data: { prediction, correct: prediction === 'curves' } });
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'no_weak' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'twist_prediction_made', data: { prediction, correct: prediction === 'no_weak' } });
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = answerIndex;
    setTestAnswers(newAnswers);

    const isCorrect = testQuestions[questionIndex].options[answerIndex].correct;
    playSound(isCorrect ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'test_answered', data: { questionIndex, answerIndex, isCorrect } });
  }, [testAnswers, playSound, onGameEvent]);

  const calculateTestScore = useCallback(() => {
    return testAnswers.reduce((score, answer, index) => {
      if (answer !== -1 && testQuestions[index].options[answer].correct) {
        return score + 1;
      }
      return score;
    }, 0);
  }, [testAnswers]);

  const handleAppComplete = useCallback((appIndex: number) => {
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    onGameEvent?.({ type: 'app_explored', data: { appIndex, appTitle: transferApps[appIndex].title } });
  }, [playSound, onGameEvent]);

  // 10 scenario-based test questions with explanations
  const testQuestions: TestQuestion[] = [
    {
      scenario: "A meteorology student is studying why storms rotate and notices that hurricanes in different hemispheres spin in opposite directions.",
      question: "What is the Coriolis effect?",
      options: [
        { text: "A real force that pushes objects sideways", correct: false },
        { text: "An apparent deflection of moving objects in a rotating reference frame", correct: true },
        { text: "A type of wind created by mountains", correct: false },
        { text: "The gravitational force that causes ocean tides", correct: false }
      ],
      explanation: "The Coriolis effect is not a real force but an apparent deflection. It arises because we observe motion from Earth's rotating reference frame. From space (an inertial frame), objects move in straight lines, but from Earth, they appear to curve."
    },
    {
      scenario: "A pilot is flying a plane from the North Pole toward the equator and notices the aircraft drifting off course despite flying straight.",
      question: "In which direction are objects deflected in the Northern Hemisphere due to the Coriolis effect?",
      options: [
        { text: "To the left of their motion", correct: false },
        { text: "Straight up away from Earth's surface", correct: false },
        { text: "To the right of their motion", correct: true },
        { text: "Downward toward the equator", correct: false }
      ],
      explanation: "In the Northern Hemisphere, the Coriolis effect deflects moving objects to the RIGHT of their direction of travel. This is why hurricanes rotate counterclockwise (air rushing inward gets deflected right, creating rotation)."
    },
    {
      scenario: "A weather forecaster is explaining to viewers why Hurricane Maria is spinning counterclockwise as it approaches Florida.",
      question: "Why do hurricanes spin counterclockwise in the Northern Hemisphere?",
      options: [
        { text: "Hot air rises rapidly and creates a spinning vacuum", correct: false },
        { text: "The Moon's gravity pulls the storm in that direction", correct: false },
        { text: "Air rushing toward the low-pressure center is deflected right, creating rotation", correct: true },
        { text: "It's random - hurricanes spin both ways equally often", correct: false }
      ],
      explanation: "Air rushes toward a hurricane's low-pressure center from all directions. In the Northern Hemisphere, Coriolis deflects this air to the right. This rightward deflection of inward-flowing air creates counterclockwise rotation around the center."
    },
    {
      scenario: "A geophysicist is calculating Coriolis effects for different locations and needs to know where the effect is strongest.",
      question: "At which latitude is the Coriolis effect strongest?",
      options: [
        { text: "At the equator (0°)", correct: false },
        { text: "At the poles (90°)", correct: true },
        { text: "At the tropics (23.5°)", correct: false },
        { text: "It's the same strength everywhere on Earth", correct: false }
      ],
      explanation: "Coriolis force depends on sin(latitude). At the equator (0°), sin(0°) = 0, so there's no Coriolis effect. At the poles (90°), sin(90°) = 1, making it maximum. This is why tropical storms only form away from the equator."
    },
    {
      scenario: "A tourist visiting Australia asks their guide if the toilet really drains in the opposite direction compared to their home in the United States.",
      question: "Does the Coriolis effect determine which way your toilet or sink drains?",
      options: [
        { text: "Yes, always counterclockwise in the Northern Hemisphere", correct: false },
        { text: "Yes, always clockwise in the Northern Hemisphere", correct: false },
        { text: "No - the effect is far too weak at such small scales", correct: true },
        { text: "Only in coastal areas near the ocean", correct: false }
      ],
      explanation: "This is a popular myth! At sink/toilet scales (~30 cm), the Coriolis force is about 10 million times weaker than other factors like basin shape, residual water motion, and drain design. Coriolis only matters for large-scale (100+ km), long-duration phenomena."
    },
    {
      scenario: "A physics professor is explaining reference frames to students and introduces the concept of forces that appear only in non-inertial frames.",
      question: "What is a 'fictitious force' (also called pseudo-force or inertial force)?",
      options: [
        { text: "A force that doesn't exist and is purely imaginary", correct: false },
        { text: "An apparent force arising from observing motion in a non-inertial frame", correct: true },
        { text: "A force that only acts on fictional objects in thought experiments", correct: false },
        { text: "Any force weaker than gravity that can be ignored", correct: false }
      ],
      explanation: "Fictitious forces appear when we analyze motion from a non-inertial (accelerating or rotating) reference frame. They're 'fictitious' because they disappear when viewed from an inertial frame. The Coriolis force and centrifugal force are both fictitious forces."
    },
    {
      scenario: "A climate scientist is modeling global atmospheric circulation and needs to understand how Coriolis affects large-scale wind patterns.",
      question: "How does the Coriolis effect influence global wind patterns?",
      options: [
        { text: "It has no measurable effect on winds", correct: false },
        { text: "It causes all winds worldwide to blow eastward", correct: false },
        { text: "It deflects winds, creating distinct belts like trade winds and westerlies", correct: true },
        { text: "It only affects winds directly over oceans, not land", correct: false }
      ],
      explanation: "Coriolis creates Earth's major wind belts: Trade winds blow from east to west near the equator (deflected right in NH, left in SH). Westerlies blow from west to east at mid-latitudes. Polar easterlies blow from east to west near the poles."
    },
    {
      scenario: "A military ballistics expert is training artillery crews and explains why they must account for Earth's rotation when aiming at distant targets.",
      question: "Why must long-range artillery account for the Coriolis effect?",
      options: [
        { text: "It doesn't need to - artillery shells travel too fast for Coriolis to matter", correct: false },
        { text: "Shells travel far and long enough for deflection to be significant", correct: true },
        { text: "The cannons themselves rotate during firing", correct: false },
        { text: "The targets are always moving due to Earth's rotation", correct: false }
      ],
      explanation: "Artillery shells can travel 20+ km and be in flight for 30+ seconds. Over these distances and times, Coriolis deflection becomes significant - several meters at 20 km range. Modern fire control computers automatically correct for this."
    },
    {
      scenario: "An engineering student is deriving the Coriolis force equation and wants to understand how velocity affects the magnitude of deflection.",
      question: "What happens to the Coriolis force as an object moves faster?",
      options: [
        { text: "It decreases because faster objects have more momentum to resist deflection", correct: false },
        { text: "It stays the same regardless of velocity", correct: false },
        { text: "It increases proportionally to velocity (F = 2mωv)", correct: true },
        { text: "It reverses direction at high velocities", correct: false }
      ],
      explanation: "The Coriolis force F = 2m(ω × v) is directly proportional to velocity. Faster-moving objects experience greater deflection force. This is why it's significant for fast-moving air masses and projectiles but negligible for slowly draining water."
    },
    {
      scenario: "A science teacher is preparing a lesson on the Coriolis effect and wants to give students examples of where it's significant versus negligible.",
      question: "Which of these is NOT significantly affected by the Coriolis effect?",
      options: [
        { text: "Ocean currents that span thousands of kilometers", correct: false },
        { text: "Hurricane rotation and storm track deflection", correct: false },
        { text: "Water draining from a bathtub or sink", correct: true },
        { text: "Global atmospheric wind patterns", correct: false }
      ],
      explanation: "Bathtubs and sinks are far too small for Coriolis to matter. The effect only becomes significant for phenomena spanning hundreds of kilometers or lasting many hours. Basin shape, residual water motion, and drain design dominate at small scales."
    }
  ];

  // 4 comprehensive transfer applications
  const transferApps: TransferApp[] = [
    {
      icon: (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <radialGradient id="hurricaneGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="40%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#f8fafc" />
            </radialGradient>
          </defs>
          {/* Hurricane spiral */}
          <g transform="translate(50, 50)">
            {[0, 1, 2, 3].map(i => (
              <path
                key={i}
                d={`M 0 0 Q ${12 + i * 8} ${-8 - i * 4}, ${24 + i * 6} ${-16 - i * 3}`}
                stroke="#f8fafc"
                strokeWidth={3 - i * 0.5}
                fill="none"
                opacity={0.9 - i * 0.15}
                transform={`rotate(${i * 90})`}
              >
                <animateTransform attributeName="transform" type="rotate" from={`${i * 90}`} to={`${i * 90 - 360}`} dur="4s" repeatCount="indefinite" additive="sum" />
              </path>
            ))}
            {/* Eye */}
            <circle cx="0" cy="0" r="8" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
          </g>
          {/* Air flow arrows */}
          <path d="M85 50 L70 50" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrow)" opacity="0.8">
            <animate attributeName="d" values="M85 50 L70 50;M80 55 L68 52;M85 50 L70 50" dur="1s" repeatCount="indefinite" />
          </path>
        </svg>
      ),
      title: "Hurricane Formation & Rotation",
      short: "Hurricanes",
      tagline: "Nature's Most Powerful Storms, Shaped by Rotation",
      description: "Hurricanes are massive rotating storm systems that draw their energy from warm ocean water. The Coriolis effect is essential for their formation - without it, air would simply rush straight into the low-pressure center without rotating.",
      connection: "Air rushing toward a hurricane's low-pressure center is deflected by Coriolis (right in NH, left in SH). This deflection prevents air from filling the low directly, instead causing it to spiral around the center - creating the characteristic counterclockwise rotation in the Northern Hemisphere.",
      howItWorks: "Warm ocean water evaporates, creating a low-pressure zone. Air rushes inward from all directions. Coriolis deflects this air to the right (NH), creating counterclockwise rotation. As air spirals inward and rises, more warm air is drawn in, intensifying the storm. The rotation creates the eye wall where the strongest winds occur.",
      stats: [
        { value: "500 km", label: "Typical diameter" },
        { value: "250 km/h", label: "Max wind speed" },
        { value: "15 m tall", label: "Storm surge height" },
        { value: "900 MB", label: "Min pressure" }
      ],
      examples: [
        "Hurricane prediction and tracking models",
        "Understanding storm surge and damage patterns",
        "Climate change effects on storm intensity",
        "Evacuation planning for coastal communities"
      ],
      companies: ["NOAA", "National Hurricane Center", "ECMWF", "Weather Channel", "AccuWeather"],
      futureImpact: "As oceans warm due to climate change, hurricanes may intensify. Understanding Coriolis-driven dynamics is crucial for improving forecast models and helping communities prepare for these increasingly powerful storms.",
      color: "from-sky-600 to-cyan-600"
    },
    {
      icon: (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <linearGradient id="earthGradVert" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
          {/* Earth cross-section */}
          <rect x="10" y="15" width="80" height="70" fill="url(#earthGradVert)" rx="4" />
          {/* Wind arrows */}
          <g>
            {/* Trade winds */}
            <path d="M70 50 L40 55" stroke="#f472b6" strokeWidth="2">
              <animate attributeName="stroke-dashoffset" from="0" to="-30" dur="1s" repeatCount="indefinite" />
            </path>
            {/* Westerlies */}
            <path d="M30 30 L60 30" stroke="#fbbf24" strokeWidth="2">
              <animate attributeName="stroke-dashoffset" from="0" to="30" dur="1s" repeatCount="indefinite" />
            </path>
            {/* Polar easterlies */}
            <path d="M65 20 L40 20" stroke="#60a5fa" strokeWidth="2">
              <animate attributeName="stroke-dashoffset" from="0" to="-30" dur="1s" repeatCount="indefinite" />
            </path>
          </g>
          {/* Labels */}
          <text x="50" y="95" textAnchor="middle" fontSize="11" fill="#94a3b8">Global Wind Belts</text>
        </svg>
      ),
      title: "Global Wind Patterns & Atmospheric Circulation",
      short: "Wind Patterns",
      tagline: "Earth's Air Conditioning System",
      description: "The Coriolis effect shapes Earth's major wind belts, creating the trade winds, westerlies, and polar easterlies that have guided sailors for centuries and drive global weather patterns. These winds redistribute heat from the equator to the poles.",
      connection: "As air rises at the equator (heated region) and flows toward the poles, Coriolis deflects it. In the Northern Hemisphere, northward-moving air deflects right (east), creating westerly winds. Similarly, Coriolis creates the easterly trade winds near the equator.",
      howItWorks: "Solar heating is strongest at the equator, causing air to rise. This air flows toward the poles at high altitude. Coriolis deflects it, creating distinct cells: Hadley cells (0-30°), Ferrel cells (30-60°), and Polar cells (60-90°). Surface winds in each cell are shaped by Coriolis deflection.",
      stats: [
        { value: "3", label: "Major circulation cells" },
        { value: "30°", label: "Horse latitude belt" },
        { value: "15-25", label: "Trade wind speed (km/h)" },
        { value: "40-50°", label: "Roaring Forties" }
      ],
      examples: [
        "Sailing routes across oceans (trade wind routes)",
        "Aviation flight planning for fuel efficiency",
        "Understanding desert formation (Hadley cell descent)",
        "Predicting monsoon patterns"
      ],
      companies: ["NOAA", "Met Office", "Japan Meteorological Agency", "Bureau of Meteorology", "Météo-France"],
      futureImpact: "Climate change may shift wind patterns, affecting agriculture, water resources, and extreme weather. Understanding Coriolis-driven circulation is essential for climate modeling and adaptation planning.",
      color: "from-amber-600 to-orange-600"
    },
    {
      icon: (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <linearGradient id="oceanBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0c4a6e" />
              <stop offset="100%" stopColor="#164e63" />
            </linearGradient>
          </defs>
          {/* Ocean */}
          <rect x="10" y="15" width="80" height="70" fill="url(#oceanBg)" rx="4" />
          {/* Northern Hemisphere Gyre (clockwise) */}
          <g transform="translate(50, 35)">
            <ellipse cx="0" cy="0" rx="25" ry="12" fill="none" stroke="#f97316" strokeWidth="2">
              <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="4s" repeatCount="indefinite" />
            </ellipse>
          </g>
          {/* Southern Hemisphere Gyre (counterclockwise) */}
          <g transform="translate(50, 65)">
            <ellipse cx="0" cy="0" rx="25" ry="12" fill="none" stroke="#06b6d4" strokeWidth="2">
              <animateTransform attributeName="transform" type="rotate" from="0" to="-360" dur="4s" repeatCount="indefinite" />
            </ellipse>
          </g>
          {/* Equator line */}
          <line x1="10" y1="50" x2="90" y2="50" stroke="#1e293b" strokeWidth="1" strokeDasharray="3" />
          <text x="50" y="95" textAnchor="middle" fontSize="11" fill="#94a3b8">Ocean Gyres</text>
        </svg>
      ),
      title: "Ocean Currents & Gyre Systems",
      short: "Ocean Currents",
      tagline: "The Ocean's Great Conveyor Belts",
      description: "Large-scale ocean currents form circular patterns called gyres, driven by wind and deflected by Coriolis. These currents transport heat around the globe, influence climate, and create distinct marine ecosystems.",
      connection: "Wind blowing over the ocean surface creates currents. Coriolis deflects these currents to the right in the Northern Hemisphere, creating clockwise gyres, and to the left in the Southern Hemisphere, creating counterclockwise gyres.",
      howItWorks: "Wind stress on the ocean surface sets water in motion. Coriolis deflects this moving water (Ekman transport), causing it to spiral. Coastal boundaries channel the flow, and the combination creates large rotating gyres. The Gulf Stream and Kuroshio are western boundary currents of these gyres.",
      stats: [
        { value: "5", label: "Major ocean gyres" },
        { value: "9km/h", label: "Gulf Stream speed" },
        { value: "1000km", label: "Gyre diameter" },
        { value: "100M", label: "Cubic meters/sec (Gulf Stream)" }
      ],
      examples: [
        "Shipping route optimization across oceans",
        "Fish migration and marine ecosystem distribution",
        "Ocean garbage patch formation (gyre centers)",
        "European climate moderation (Gulf Stream)"
      ],
      companies: ["NOAA", "Woods Hole Oceanographic", "Scripps Institution", "Ocean Conservancy", "Maersk"],
      futureImpact: "Climate change may alter ocean circulation patterns, potentially disrupting the Gulf Stream and affecting European climate. Understanding gyre dynamics is crucial for predicting these changes and their impacts.",
      color: "from-blue-600 to-teal-600"
    },
    {
      icon: (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Ground */}
          <rect x="0" y="70" width="100" height="30" fill="#166534" />
          {/* Gun */}
          <g transform="translate(10, 55)">
            <rect x="0" y="0" width="20" height="8" fill="#64748b" rx="1" />
            <rect x="18" y="2" width="10" height="4" fill="#475569" />
          </g>
          {/* Intended path (dashed) */}
          <path d="M 30 58 Q 55 30, 80 58" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4" fill="none" />
          {/* Actual path with deflection */}
          <path d="M 30 58 Q 58 28, 88 58" stroke="#ef4444" strokeWidth="2" fill="none" />
          {/* Target */}
          <g transform="translate(75, 50)">
            <rect x="0" y="0" width="3" height="20" fill="#78350f" />
            <circle cx="1.5" cy="-8" r="8" fill="none" stroke="#ef4444" strokeWidth="1" />
            <circle cx="1.5" cy="-8" r="4" fill="#ef4444" />
          </g>
          {/* Projectile */}
          <circle cx="60" cy="40" r="4" fill="#fbbf24">
            <animate attributeName="cx" values="30;88;30" dur="2s" repeatCount="indefinite" />
            <animate attributeName="cy" values="58;45;58" dur="2s" repeatCount="indefinite" />
          </circle>
          <text x="50" y="95" textAnchor="middle" fontSize="11" fill="#94a3b8">Ballistic Deflection</text>
        </svg>
      ),
      title: "Long-Range Ballistics & Sniper Corrections",
      short: "Ballistics",
      tagline: "When Earth's Rotation Affects Your Aim",
      description: "At long ranges, the Coriolis effect causes measurable deflection of projectiles. Military snipers and artillery crews must account for this when engaging targets at extreme distances.",
      connection: "A bullet or shell traveling through the air is subject to Coriolis deflection just like any other moving object. Over distances of hundreds of meters to tens of kilometers, this deflection becomes significant enough to cause a miss.",
      howItWorks: "As a projectile travels, Earth rotates beneath it. From the shooter's perspective (rotating with Earth), the bullet appears to curve. In the Northern Hemisphere, shots deflect right; in the Southern, left. The deflection depends on range, flight time, latitude, and direction of fire.",
      stats: [
        { value: "7cm", label: "Deflection at 1km" },
        { value: "30m", label: "Deflection at 20km" },
        { value: "45°", label: "Max deflection latitude" },
        { value: "E/W", label: "Fire direction matters" }
      ],
      examples: [
        "Military sniper training and scope adjustments",
        "Artillery fire control computer calculations",
        "Intercontinental ballistic missile targeting",
        "Spacecraft trajectory corrections"
      ],
      companies: ["Lockheed Martin", "Raytheon", "BAE Systems", "Northrop Grumman", "General Dynamics"],
      futureImpact: "Modern fire control systems automatically correct for Coriolis, but understanding the physics remains essential for training and backup calculations. Hypersonic weapons traveling even faster require even more precise corrections.",
      color: "from-red-600 to-orange-600"
    }
  ];

  // Premium SVG definitions for all phases
  const renderSvgDefs = () => (
    <defs>
      {/* === GRADIENTS === */}

      {/* Earth sphere gradient - deep ocean blues with atmosphere */}
      <radialGradient id="coriEarthSphere" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#0ea5e9" />
        <stop offset="25%" stopColor="#0284c7" />
        <stop offset="50%" stopColor="#0369a1" />
        <stop offset="75%" stopColor="#075985" />
        <stop offset="100%" stopColor="#0c4a6e" />
      </radialGradient>

      {/* Earth continents gradient */}
      <linearGradient id="coriContinents" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.5" />
        <stop offset="50%" stopColor="#16a34a" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#15803d" stopOpacity="0.3" />
      </linearGradient>

      {/* Atmosphere glow gradient */}
      <radialGradient id="coriAtmosphere" cx="50%" cy="50%" r="50%">
        <stop offset="85%" stopColor="#0ea5e9" stopOpacity="0" />
        <stop offset="95%" stopColor="#38bdf8" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.1" />
      </radialGradient>

      {/* Merry-go-round platform gradient */}
      <radialGradient id="coriPlatform" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#334155" />
        <stop offset="40%" stopColor="#1e293b" />
        <stop offset="80%" stopColor="#0f172a" />
        <stop offset="100%" stopColor="#020617" />
      </radialGradient>

      {/* Center pole metallic gradient */}
      <radialGradient id="coriCenterPole" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="30%" stopColor="#64748b" />
        <stop offset="70%" stopColor="#475569" />
        <stop offset="100%" stopColor="#334155" />
      </radialGradient>

      {/* Northern rotation arrow gradient (green) */}
      <linearGradient id="coriArrowNorth" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
        <stop offset="30%" stopColor="#4ade80" />
        <stop offset="70%" stopColor="#22c55e" />
        <stop offset="100%" stopColor="#16a34a" stopOpacity="0.3" />
      </linearGradient>

      {/* Southern rotation arrow gradient (red) */}
      <linearGradient id="coriArrowSouth" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
        <stop offset="30%" stopColor="#f87171" />
        <stop offset="70%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#dc2626" stopOpacity="0.3" />
      </linearGradient>

      {/* Ball/projectile gradient */}
      <radialGradient id="coriBall" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="40%" stopColor="#fbbf24" />
        <stop offset="70%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#d97706" />
      </radialGradient>

      {/* Trajectory path gradient */}
      <linearGradient id="coriTrajectory" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.2" />
        <stop offset="25%" stopColor="#fbbf24" stopOpacity="0.6" />
        <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.9" />
        <stop offset="75%" stopColor="#f59e0b" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#d97706" stopOpacity="0.2" />
      </linearGradient>

      {/* Person (you) gradient - blue */}
      <radialGradient id="coriPersonYou" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#2563eb" />
      </radialGradient>

      {/* Person (friend) gradient - green */}
      <radialGradient id="coriPersonFriend" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#4ade80" />
        <stop offset="50%" stopColor="#22c55e" />
        <stop offset="100%" stopColor="#16a34a" />
      </radialGradient>

      {/* Hurricane spiral gradient - cyan/white */}
      <linearGradient id="coriHurricaneNorth" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f8fafc" />
        <stop offset="30%" stopColor="#e0f2fe" />
        <stop offset="60%" stopColor="#7dd3fc" />
        <stop offset="100%" stopColor="#38bdf8" />
      </linearGradient>

      {/* Hurricane spiral gradient - orange/white for south */}
      <linearGradient id="coriHurricaneSouth" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f8fafc" />
        <stop offset="30%" stopColor="#fed7aa" />
        <stop offset="60%" stopColor="#fdba74" />
        <stop offset="100%" stopColor="#f97316" />
      </linearGradient>

      {/* Sink basin gradient */}
      <radialGradient id="coriSinkBasin" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#475569" />
        <stop offset="50%" stopColor="#334155" />
        <stop offset="100%" stopColor="#1e293b" />
      </radialGradient>

      {/* Water swirl gradient */}
      <linearGradient id="coriWaterSwirl" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.8" />
        <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#2563eb" stopOpacity="0.2" />
      </linearGradient>

      {/* Info panel gradient */}
      <linearGradient id="coriInfoPanel" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#1e293b" />
        <stop offset="50%" stopColor="#0f172a" />
        <stop offset="100%" stopColor="#020617" />
      </linearGradient>

      {/* Coriolis force vector gradient */}
      <linearGradient id="coriForceVector" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#c084fc" stopOpacity="0.3" />
        <stop offset="30%" stopColor="#a855f7" />
        <stop offset="70%" stopColor="#9333ea" />
        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.3" />
      </linearGradient>

      {/* === FILTERS === */}

      {/* Ball glow filter */}
      <filter id="coriBallGlow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Rotation arrow glow */}
      <filter id="coriArrowGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Hurricane glow filter */}
      <filter id="coriHurricaneGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Earth atmosphere glow */}
      <filter id="coriAtmosphereGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="8" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Person glow filter */}
      <filter id="coriPersonGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Trajectory glow */}
      <filter id="coriTrajectoryGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Force vector glow */}
      <filter id="coriForceGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Background vignette */}
      <radialGradient id="coriVignette" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stopColor="#0f172a" />
        <stop offset="70%" stopColor="#0f172a" />
        <stop offset="100%" stopColor="#020617" />
      </radialGradient>
    </defs>
  );

  const renderPhaseContent = () => {
    switch (phase) {
      case 'hook':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '600px', padding: '48px 24px', textAlign: 'center' }}>
            {/* Premium badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '9999px', marginBottom: '32px' }}>
              <span style={{ width: '8px', height: '8px', background: '#38bdf8', borderRadius: '50%' }} />
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#38bdf8', letterSpacing: '0.05em' }}>ATMOSPHERIC PHYSICS</span>
            </div>

            {/* Main title */}
            <h1 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '16px', color: 'white', lineHeight: '1.2' }}>
              The Hurricane Spin Mystery
            </h1>
            <p style={{ fontSize: '18px', color: '#94a3b8', maxWidth: '560px', marginBottom: '32px', lineHeight: '1.6', fontWeight: 400 }}>
              Why do storms spin differently in each hemisphere?
            </p>

            {/* Premium card */}
            <div style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.8))', borderRadius: '24px', padding: '24px', maxWidth: '640px', border: '1px solid rgba(51,65,85,0.5)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', marginBottom: '32px' }}>
              <div className="relative w-full max-w-md h-64 rounded-xl overflow-hidden mx-auto">
              <svg viewBox="0 0 400 300" className="w-full h-full">
                {renderSvgDefs()}

                {/* Premium dark background with vignette */}
                <rect width="400" height="300" fill="url(#coriVignette)" />

                {/* Earth from space with premium gradient */}
                <g filter="url(#coriAtmosphereGlow)">
                  <circle cx="200" cy="150" r="105" fill="url(#coriAtmosphere)" />
                </g>
                <circle cx="200" cy="150" r="100" fill="url(#coriEarthSphere)" />
                <ellipse cx="200" cy="150" rx="100" ry="30" fill="url(#coriContinents)" />

                {/* Hurricane in Northern Hemisphere with glow */}
                <g transform="translate(160, 100)" filter="url(#coriHurricaneGlow)">
                  <g>
                    {[0, 1, 2].map(i => (
                      <path
                        key={i}
                        d={`M 0 0 Q ${10 + i * 8} ${-6 - i * 3}, ${20 + i * 5} ${-12 - i * 2}`}
                        stroke="url(#coriHurricaneNorth)"
                        strokeWidth={3 - i * 0.5}
                        fill="none"
                        transform={`rotate(${i * 90})`}
                      >
                        <animateTransform attributeName="transform" type="rotate" from={`${i * 90}`} to={`${i * 90 - 360}`} dur="3s" repeatCount="indefinite" additive="sum" />
                      </path>
                    ))}
                    <circle cx="0" cy="0" r="5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
                  </g>
                </g>

                {/* Hurricane in Southern Hemisphere with glow */}
                <g transform="translate(240, 200)" filter="url(#coriHurricaneGlow)">
                  <g>
                    {[0, 1, 2].map(i => (
                      <path
                        key={i}
                        d={`M 0 0 Q ${10 + i * 8} ${-6 - i * 3}, ${20 + i * 5} ${-12 - i * 2}`}
                        stroke="url(#coriHurricaneSouth)"
                        strokeWidth={3 - i * 0.5}
                        fill="none"
                        transform={`rotate(${i * 90})`}
                      >
                        <animateTransform attributeName="transform" type="rotate" from={`${i * 90}`} to={`${i * 90 + 360}`} dur="3s" repeatCount="indefinite" additive="sum" />
                      </path>
                    ))}
                    <circle cx="0" cy="0" r="5" fill="#0f172a" stroke="#f97316" strokeWidth="1" />
                  </g>
                </g>
              </svg>
              </div>
              {/* Labels moved outside SVG using typo system */}
              <div className="flex justify-between px-8 mt-2 mb-2">
                <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Northern: <span className="text-sky-400 font-semibold">CCW</span></span>
                <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Southern: <span className="text-orange-400 font-semibold">CW</span></span>
              </div>
              <p style={{ fontSize: typo.body, color: colors.warning, fontWeight: 600, textAlign: 'center', marginBottom: '8px' }}>
                Why do they spin opposite ways?
              </p>
              <p className="text-lg text-slate-300 mt-2 mb-2">
                Hurricanes in the Northern Hemisphere <span className="text-sky-400 font-bold">always spin counterclockwise</span>.
              </p>
              <p className="text-base text-slate-400">
                In the Southern Hemisphere? <span className="text-orange-400 font-bold">Always clockwise</span>.
              </p>
            </div>

            {/* Premium CTA button */}
            <button
              onClick={() => goToPhase('predict')}
              style={{ padding: '16px 32px', background: 'linear-gradient(135deg, #0284c7, #06b6d4)', color: 'white', fontSize: '18px', fontWeight: 600, borderRadius: '16px', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 10px 25px rgba(2,132,199,0.25)' }}
            >
              Discover the Coriolis Effect
            </button>
            <p style={{ marginTop: '24px', fontSize: '14px', color: 'rgba(148,163,184,1)' }}>Explore Earth&apos;s rotation and atmospheric dynamics</p>
          </div>
        );

      case 'predict':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', padding: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#38bdf8', marginBottom: '24px' }}>Make Your Prediction</h2>
            <svg viewBox="0 0 400 200" width="400" style={{ maxWidth: '100%', marginBottom: '20px' }}>
              <defs>
                <filter id="predictGlow"><feGaussianBlur stdDeviation="2" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                <linearGradient id="predictGrad1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient>
              </defs>
              <rect width="400" height="200" fill="#0f172a" rx="8" />
              <g transform="translate(200,100)">
                <circle cx="0" cy="0" r="70" fill="none" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
                <circle cx="0" cy="0" r="8" fill="#475569" />
                <g filter="url(#predictGlow)"><circle cx="0" cy="-55" r="12" fill="#3b82f6" /></g>
                <g filter="url(#predictGlow)"><circle cx="0" cy="55" r="12" fill="#22c55e" /></g>
                <line x1="0" y1="-40" x2="0" y2="40" stroke="#64748b" strokeWidth="1.5" strokeDasharray="6 4" />
                <path d="M 0 -40 Q 30 0, 20 40" stroke="#f59e0b" strokeWidth="2.5" fill="none" />
                <text x="-30" y="-55" fill="#94a3b8" fontSize="11" textAnchor="end">You</text>
                <text x="-30" y="60" fill="#94a3b8" fontSize="11" textAnchor="end">Friend</text>
              </g>
              <text x="200" y="190" textAnchor="middle" fill="#64748b" fontSize="11">Spinning Merry-Go-Round (top view)</text>
            </svg>
            <p style={{ fontSize: '18px', color: '#e2e8f0', marginBottom: '24px', textAlign: 'center', maxWidth: '520px', lineHeight: '1.6' }}>
              Imagine you&apos;re on a spinning merry-go-round. You throw a ball <span style={{ color: '#22d3ee', fontWeight: 700 }}>straight</span> to a friend standing across from you. What happens to the ball&apos;s path?
            </p>
            <div style={{ display: 'grid', gap: '12px', width: '100%', maxWidth: '450px', marginBottom: '24px' }}>
              {[
                { id: 'straight', text: 'It goes in a straight line to your friend' },
                { id: 'curves', text: 'It curves away from its intended path' },
                { id: 'faster', text: 'It speeds up as it travels' },
                { id: 'stops', text: 'It stops mid-air due to rotation' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => handlePrediction(option.id)}
                  disabled={showPredictionFeedback}
                  style={{ padding: '16px', borderRadius: '12px', textAlign: 'left', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', background: showPredictionFeedback && option.id === 'curves' ? '#16a34a' : showPredictionFeedback && selectedPrediction === option.id ? '#dc2626' : '#334155', color: 'white', fontSize: '15px', lineHeight: '1.5' }}
                >
                  {option.text}
                </button>
              ))}
            </div>
            {showPredictionFeedback && (
              <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '16px', maxWidth: '450px', border: '1px solid #334155' }}>
                <p style={{ fontWeight: 700, fontSize: '18px', marginBottom: '8px', color: selectedPrediction === 'curves' ? '#4ade80' : '#38bdf8' }}>
                  {selectedPrediction === 'curves' ? 'Excellent prediction!' : 'Think about the rotating platform!'}
                </p>
                <p style={{ color: '#cbd5e1', marginBottom: '12px', lineHeight: '1.5' }}>
                  The ball curves away from its intended path! From your rotating perspective, it appears to deflect - this is the <span style={{ color: '#38bdf8', fontWeight: 700 }}>Coriolis effect</span>.
                </p>
                <button
                  onClick={() => goToPhase('play')}
                  style={{ marginTop: '8px', padding: '8px 24px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', fontWeight: 700, borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease' }}
                >
                  See It In Action
                </button>
              </div>
            )}
          </div>
        );

      case 'play':
        const earthRotation = animPhase * (rotationSpeed / 100);
        const deflectionDir = hemisphere === 'north' ? 1 : -1;
        const ballProgress = ballLaunched ? Math.min((animPhase % 100) / 100, 1) : 0;
        const ballIntendedAngle = 180;
        const ballActualAngle = ballIntendedAngle + deflectionDir * ballProgress * 40;
        const ballRadius = 60 - ballProgress * 30;

        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            {/* Title moved outside SVG */}
            <h2 className="text-2xl font-bold text-sky-400 mb-2">The Merry-Go-Round Experiment</h2>
            <p style={{ fontSize: typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
              {hemisphere === 'north' ? 'Northern Hemisphere (looking down)' : 'Southern Hemisphere (looking up)'}
            </p>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
            <div className="relative w-full max-w-lg h-72 bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-xl mb-4 overflow-hidden">
              <svg viewBox="0 0 400 280" className="w-full h-full">
                {renderSvgDefs()}

                {/* Premium dark background with vignette */}
                <rect width="400" height="280" fill="url(#coriVignette)" />

                {/* Merry-go-round (viewed from above) */}
                <g transform={`translate(200, 140) rotate(${earthRotation})`}>
                  {/* Platform with premium gradient */}
                  <circle cx="0" cy="0" r="82" fill="#0f172a" />
                  <circle cx="0" cy="0" r="80" fill="url(#coriPlatform)" stroke="#475569" strokeWidth="2" />

                  {/* Platform ring details */}
                  <circle cx="0" cy="0" r="75" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
                  <circle cx="0" cy="0" r="55" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="2 6" />
                  <circle cx="0" cy="0" r="35" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="2 6" />

                  {/* Rotation direction indicator with glow */}
                  <g filter="url(#coriArrowGlow)">
                    <path
                      d="M -60 -50 A 78 78 0 0 1 60 -50"
                      stroke={hemisphere === 'north' ? 'url(#coriArrowNorth)' : 'url(#coriArrowSouth)'}
                      strokeWidth="4"
                      fill="none"
                      strokeLinecap="round"
                    />
                    <polygon
                      points={hemisphere === 'north' ? "60,-50 48,-42 48,-58" : "-60,-50 -48,-42 -48,-58"}
                      fill={hemisphere === 'north' ? '#4ade80' : '#f87171'}
                    />
                  </g>

                  {/* Radial lines with gradient opacity */}
                  {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
                    <line
                      key={angle}
                      x1="0"
                      y1="0"
                      x2={Math.cos(angle * Math.PI / 180) * 75}
                      y2={Math.sin(angle * Math.PI / 180) * 75}
                      stroke="#475569"
                      strokeWidth="1"
                      opacity="0.5"
                    />
                  ))}

                  {/* Center pole with metallic gradient */}
                  <circle cx="0" cy="0" r="12" fill="url(#coriCenterPole)" stroke="#64748b" strokeWidth="1" />
                  <circle cx="0" cy="0" r="4" fill="#94a3b8" />

                  {/* Thrower (you) with glow */}
                  <g filter="url(#coriPersonGlow)">
                    <circle cx="0" cy="-60" r="14" fill="url(#coriPersonYou)" />
                  </g>

                  {/* Target friend with glow */}
                  <g filter="url(#coriPersonGlow)">
                    <circle cx="0" cy="60" r="14" fill="url(#coriPersonFriend)" />
                  </g>

                  {/* Intended path (dashed) */}
                  <line x1="0" y1="-44" x2="0" y2="44" stroke="#64748b" strokeWidth="2" strokeDasharray="6 4" opacity="0.6" />

                  {/* Actual curved trajectory path (if ball launched) with glow */}
                  {ballLaunched && (
                    <g filter="url(#coriTrajectoryGlow)">
                      <path
                        d={`M 0 -44 Q ${deflectionDir * 40} 0, ${deflectionDir * 30} 44`}
                        stroke="url(#coriTrajectory)"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                      />
                    </g>
                  )}

                  {/* Coriolis force vector visualization (perpendicular to velocity) */}
                  {ballLaunched && ballProgress > 0.1 && ballProgress < 0.9 && (
                    <g filter="url(#coriForceGlow)">
                      <line
                        x1={Math.sin(ballActualAngle * Math.PI / 180) * ballRadius}
                        y1={-Math.cos(ballActualAngle * Math.PI / 180) * ballRadius + 10}
                        x2={Math.sin(ballActualAngle * Math.PI / 180) * ballRadius + deflectionDir * 25}
                        y2={-Math.cos(ballActualAngle * Math.PI / 180) * ballRadius + 10}
                        stroke="url(#coriForceVector)"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      <polygon
                        points={`${Math.sin(ballActualAngle * Math.PI / 180) * ballRadius + deflectionDir * 25},${-Math.cos(ballActualAngle * Math.PI / 180) * ballRadius + 10} ${Math.sin(ballActualAngle * Math.PI / 180) * ballRadius + deflectionDir * 18},${-Math.cos(ballActualAngle * Math.PI / 180) * ballRadius + 5} ${Math.sin(ballActualAngle * Math.PI / 180) * ballRadius + deflectionDir * 18},${-Math.cos(ballActualAngle * Math.PI / 180) * ballRadius + 15}`}
                        fill="#a855f7"
                      />
                    </g>
                  )}

                  {/* Ball (if launched) with premium gradient and glow */}
                  {ballLaunched && ballProgress < 1 && (
                    <g filter="url(#coriBallGlow)">
                      <circle
                        cx={Math.sin(ballActualAngle * Math.PI / 180) * ballRadius}
                        cy={-Math.cos(ballActualAngle * Math.PI / 180) * ballRadius + 10}
                        r="10"
                        fill="url(#coriBall)"
                      />
                      {/* Ball highlight */}
                      <circle
                        cx={Math.sin(ballActualAngle * Math.PI / 180) * ballRadius - 3}
                        cy={-Math.cos(ballActualAngle * Math.PI / 180) * ballRadius + 7}
                        r="3"
                        fill="#fef3c7"
                        opacity="0.6"
                      />
                    </g>
                  )}
                </g>

                {/* Info panels with absolute positioning */}
                <rect x="15" y="15" width="85" height="60" fill="url(#coriInfoPanel)" rx="8" stroke="#334155" strokeWidth="1" />
                <text x="57" y="33" textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="600">ROTATION</text>
                <text x="57" y="53" textAnchor="middle" fontSize="16" fill={hemisphere === 'north' ? '#4ade80' : '#f87171'} fontWeight="bold">
                  {hemisphere === 'north' ? 'CCW' : 'CW'}
                </text>
                <text x="57" y="70" textAnchor="middle" fontSize="11" fill="#64748b">
                  Deflects {hemisphere === 'north' ? 'RIGHT' : 'LEFT'}
                </text>

                {/* Speed indicator panel */}
                <rect x="300" y="155" width="85" height="50" fill="url(#coriInfoPanel)" rx="8" stroke="#334155" strokeWidth="1" />
                <text x="342" y="173" textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="600">SPEED</text>
                <text x="342" y="193" textAnchor="middle" fontSize="16" fill="#0ea5e9" fontWeight="bold">
                  {rotationSpeed}%
                </text>

                {/* Result panel */}
                {ballLaunched && ballProgress >= 0.9 && (
                  <>
                    <rect x="300" y="210" width="85" height="50" fill="url(#coriInfoPanel)" rx="8" stroke="#fbbf24" strokeWidth="1" opacity="0.8" />
                    <text x="342" y="232" textAnchor="middle" fontSize="11" fill="#fbbf24" fontWeight="bold">Ball missed!</text>
                    <text x="342" y="248" textAnchor="middle" fontSize="11" fill="#94a3b8">
                      Curved {hemisphere === 'north' ? 'right' : 'left'}
                    </text>
                  </>
                )}

                {/* Legend for force vector */}
                {ballLaunched && ballProgress > 0.1 && ballProgress < 0.9 && (
                  <>
                    <rect x="300" y="210" width="85" height="35" fill="url(#coriInfoPanel)" rx="6" stroke="#a855f7" strokeWidth="1" opacity="0.7" />
                    <line x1="310" y1="227" x2="330" y2="227" stroke="#a855f7" strokeWidth="2" />
                    <text x="340" y="231" fontSize="11" fill="#c084fc">Coriolis</text>
                    <text x="340" y="243" fontSize="11" fill="#94a3b8">Force</text>
                  </>
                )}
              </svg>

              {/* Person labels outside SVG */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ width: '200px', height: '200px' }}>
                <span
                  className="absolute text-white text-xs font-bold"
                  style={{
                    top: '15%',
                    left: '50%',
                    transform: `translateX(-50%) rotate(${-earthRotation}deg)`,
                    textShadow: '0 0 4px rgba(0,0,0,0.8)'
                  }}
                >
                  You
                </span>
                <span
                  className="absolute text-white text-xs font-bold"
                  style={{
                    bottom: '15%',
                    left: '50%',
                    transform: `translateX(-50%) rotate(${-earthRotation}deg)`,
                    textShadow: '0 0 4px rgba(0,0,0,0.8)'
                  }}
                >
                  Friend
                </span>
              </div>
            </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            {/* Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', width: '100%', maxWidth: '640px', marginBottom: '16px' }}>
              <div style={{ background: '#1e293b', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
                <label style={{ color: '#cbd5e1', fontSize: '14px', display: 'block', marginBottom: '8px' }}>Hemisphere</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setHemisphere('north');
                      setBallLaunched(false);
                      onGameEvent?.({ type: 'hemisphere_changed', data: { hemisphere: 'north' } });
                    }}
                    style={{ flex: 1, padding: '8px', borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', background: hemisphere === 'north' ? '#0ea5e9' : '#334155', color: 'white' }}
                  >
                    Toggle North
                  </button>
                  <button
                    onClick={() => {
                      setHemisphere('south');
                      setBallLaunched(false);
                      onGameEvent?.({ type: 'hemisphere_changed', data: { hemisphere: 'south' } });
                    }}
                    style={{ flex: 1, padding: '8px', borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', background: hemisphere === 'south' ? '#0ea5e9' : '#334155', color: 'white' }}
                  >
                    Toggle South
                  </button>
                </div>
              </div>
              <div style={{ background: '#1e293b', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
                <label style={{ color: '#cbd5e1', fontSize: '14px', display: 'block', marginBottom: '8px' }}>Rotation Speed: {rotationSpeed}%</label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={rotationSpeed}
                  onChange={(e) => setRotationSpeed(Number(e.target.value))}
                  style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  <span>Slow (10)</span>
                  <span>Fast (100)</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setBallLaunched(true);
                  playSound('whoosh');
                  onGameEvent?.({ type: 'ball_launched', data: { hemisphere } });
                }}
                style={{ background: '#f59e0b', color: 'white', borderRadius: '12px', fontWeight: 700, padding: '16px', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', fontSize: '16px' }}
              >
                Fire Ball!
              </button>
            </div>

            {/* Educational explanation panel */}
            <div className="bg-slate-800/60 rounded-xl p-4 mb-4 max-w-lg border border-slate-700">
              <p className="text-slate-200 text-sm mb-2">
                <strong className="text-sky-400">The Coriolis Force</strong> is defined as F = -2m(omega x v), where omega is the angular velocity of the rotating frame. This shows how moving objects are deflected in rotating reference frames.
              </p>
              <p className="text-slate-300 text-sm mb-2">
                <strong>When you increase</strong> the rotation speed, the deflection becomes more pronounced because the Coriolis force is proportional to rotation rate. Higher rotation leads to greater apparent deflection.
              </p>
              <p className="text-slate-400 text-sm">
                This effect is important in meteorology, ocean currents, and long-range ballistics where Earth&apos;s rotation affects trajectories over large distances.
              </p>
            </div>

            <div className="bg-slate-700/30 rounded-xl p-4 mb-4 max-w-lg">
              <p className="text-slate-300 text-center">
                {ballLaunched
                  ? `The ball curves ${hemisphere === 'north' ? 'right' : 'left'} and misses your friend! This is the Coriolis effect - an apparent deflection due to observing from a rotating frame.`
                  : 'Press "Fire Ball!" to see how the Coriolis effect deflects moving objects on a rotating platform.'}
              </p>
            </div>
              </div>
            </div>

            <button
              onClick={() => goToPhase('review')}
              style={{ zIndex: 10 }}
              className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition-colors"
            >
              Understand the Physics
            </button>
          </div>
        );

      case 'review':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-sky-400 mb-6">The Science Revealed</h2>

            {selectedPrediction === 'curves' ? (
              <div className="bg-green-500/20 border border-green-500 rounded-xl p-4 mb-6 max-w-lg">
                <p className="text-green-400 font-semibold">As you predicted, the ball curves! You observed the Coriolis deflection in action.</p>
              </div>
            ) : (
              <div className="bg-amber-500/20 border border-amber-500 rounded-xl p-4 mb-6 max-w-lg">
                <p className="text-amber-400">You saw the ball curve away from its intended path! This demonstrates what you observed - the Coriolis effect.</p>
              </div>
            )}

            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4 max-w-2xl mb-6`}>
              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-sky-400 mb-3">Earth Is a Merry-Go-Round</h3>
                <p className="text-slate-300 text-sm">
                  Earth rotates on its axis once per day. From space (inertial frame), objects move in straight lines. But from our rotating perspective, they appear to <span className="text-cyan-400 font-bold">curve</span>.
                </p>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-cyan-400 mb-3">The Coriolis Force</h3>
                <div className="bg-slate-900 p-3 rounded-lg text-center mb-2">
                  <span className="text-sky-400 font-mono text-lg">F = -2m(omega x v)</span>
                </div>
                <p className="text-slate-300 text-sm">
                  A &quot;fictitious force&quot; - not a real push, but an apparent deflection from observing in a rotating reference frame.
                </p>
              </div>

              <div className={`bg-gradient-to-r from-sky-900/50 to-cyan-900/50 p-5 rounded-xl ${isMobile ? '' : 'col-span-2'}`}>
                <h3 className="text-lg font-bold text-sky-400 mb-4">Direction Rules</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 p-4 rounded-lg text-center">
                    <div className="text-2xl mb-2">Northern</div>
                    <div className="text-green-400 font-bold">Northern Hemisphere</div>
                    <div className="text-slate-300 text-sm">Objects deflect <span className="text-green-400">RIGHT</span></div>
                    <div className="text-slate-400 text-xs mt-1">Hurricanes spin CCW</div>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-lg text-center">
                    <div className="text-2xl mb-2">Southern</div>
                    <div className="text-red-400 font-bold">Southern Hemisphere</div>
                    <div className="text-slate-300 text-sm">Objects deflect <span className="text-red-400">LEFT</span></div>
                    <div className="text-slate-400 text-xs mt-1">Hurricanes spin CW</div>
                  </div>
                </div>
                <p className="text-slate-400 text-sm mt-3 text-center">
                  At the equator (0 degrees latitude), there&apos;s no Coriolis deflection because sin(0) = 0
                </p>
              </div>
            </div>

            <button
              onClick={() => goToPhase('twist_predict')}
              style={{ zIndex: 10 }}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all"
            >
              Explore a Twist
            </button>
          </div>
        );

      case 'twist_predict':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', padding: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#a855f7', marginBottom: '24px' }}>The Twist: Toilet Drains</h2>
            <svg viewBox="0 0 400 200" width="400" style={{ maxWidth: '100%', marginBottom: '20px' }}>
              <defs>
                <filter id="twistGlow"><feGaussianBlur stdDeviation="2" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                <radialGradient id="twistSinkGrad" cx="50%" cy="40%" r="60%"><stop offset="0%" stopColor="#475569" /><stop offset="100%" stopColor="#1e293b" /></radialGradient>
              </defs>
              <rect width="400" height="200" fill="#0f172a" rx="8" />
              <g transform="translate(200,90)">
                <ellipse cx="0" cy="0" rx="60" ry="35" fill="url(#twistSinkGrad)" stroke="#64748b" strokeWidth="1" />
                <circle cx="0" cy="5" r="15" fill="#020617" stroke="#334155" strokeWidth="1" />
                <g filter="url(#twistGlow)" transform="scale(0.25)">
                  <path d="M 0 8 Q 60 -20, 40 72 Q 0 112, -40 72 Q -60 -20, 0 8" stroke="#60a5fa" strokeWidth="8" fill="none" />
                </g>
                <text x="0" y="-50" textAnchor="middle" fill="#a855f7" fontSize="12" fontWeight="600">Does Coriolis affect this?</text>
              </g>
              <text x="200" y="185" textAnchor="middle" fill="#64748b" fontSize="11">Sink drain - small scale phenomenon</text>
            </svg>
            <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '24px', maxWidth: '520px', border: '1px solid #334155' }}>
              <p style={{ color: '#e2e8f0', textAlign: 'center', marginBottom: '16px', lineHeight: '1.5' }}>
                Popular myth says toilets and sinks drain in <span style={{ color: '#a855f7', fontWeight: 700 }}>opposite directions</span> in each hemisphere due to the Coriolis effect.
              </p>
              <p style={{ fontSize: '20px', color: '#c4b5fd', textAlign: 'center', fontWeight: 700 }}>
                What do you predict? Is this actually true?
              </p>
            </div>
            <div style={{ display: 'grid', gap: '12px', width: '100%', maxWidth: '450px', marginBottom: '24px' }}>
              {[
                { id: 'yes_ccw', text: 'Yes - counterclockwise in Northern, clockwise in Southern' },
                { id: 'yes_cw', text: 'Yes - clockwise in Northern, counterclockwise in Southern' },
                { id: 'no_weak', text: 'No - the Coriolis effect is too weak at such small scales' },
                { id: 'no_equator', text: 'No - it only works right at the equator' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => handleTwistPrediction(option.id)}
                  disabled={showTwistFeedback}
                  style={{ padding: '16px', borderRadius: '12px', textAlign: 'left', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', background: showTwistFeedback && option.id === 'no_weak' ? '#16a34a' : showTwistFeedback && twistPrediction === option.id ? '#dc2626' : '#334155', color: 'white', fontSize: '15px', lineHeight: '1.5' }}
                >
                  {option.text}
                </button>
              ))}
            </div>
            {showTwistFeedback && (
              <div className="bg-slate-800 p-5 rounded-xl max-w-md">
                <p className={`font-bold text-lg mb-2 ${twistPrediction === 'no_weak' ? 'text-green-400' : 'text-purple-400'}`}>
                  {twistPrediction === 'no_weak' ? 'Exactly right!' : 'Myth busted!'}
                </p>
                <p className="text-slate-300">
                  The Coriolis effect is <span className="text-red-400 font-bold">far too weak</span> at sink/toilet scales!
                  It only matters for large-scale phenomena (100+ km).
                </p>
                <button
                  onClick={() => goToPhase('twist_play')}
                  style={{ zIndex: 10 }}
                  className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
                >
                  See Why
                </button>
              </div>
            )}
          </div>
        );

      case 'twist_play':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-2">The Scale Problem</h2>
            <p style={{ fontSize: typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
              Coriolis Force vs. Scale
            </p>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
            <div className="relative w-full max-w-lg h-72 bg-gradient-to-b from-purple-900/30 to-slate-900/50 rounded-xl mb-4 overflow-hidden">
              <svg viewBox="0 0 400 280" className="w-full h-full">
                {renderSvgDefs()}

                {/* Premium dark background */}
                <rect width="400" height="280" fill="url(#coriVignette)" />

                {/* Hurricane (large scale) with premium effects */}
                <g transform="translate(100, 120)">
                  {/* Hurricane glow background */}
                  <circle cx="0" cy="0" r="55" fill="#0ea5e9" opacity="0.1" />

                  {/* Hurricane spiral with gradient and glow */}
                  <g filter="url(#coriHurricaneGlow)">
                    {[0, 1, 2, 3].map(i => (
                      <path
                        key={i}
                        d={`M 0 0 Q ${15 + i * 10} ${-10 - i * 5}, ${30 + i * 8} ${-20 - i * 4}`}
                        stroke="url(#coriHurricaneNorth)"
                        strokeWidth={3.5 - i * 0.5}
                        fill="none"
                        transform={`rotate(${i * 90})`}
                        strokeLinecap="round"
                      >
                        <animateTransform attributeName="transform" type="rotate" from={`${i * 90}`} to={`${i * 90 - 360}`} dur="3s" repeatCount="indefinite" additive="sum" />
                      </path>
                    ))}
                  </g>
                  {/* Hurricane eye */}
                  <circle cx="0" cy="0" r="12" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                  <circle cx="0" cy="0" r="4" fill="#0c4a6e" />
                </g>

                {/* Sink (small scale) with premium effects */}
                <g transform="translate(300, 120)">
                  {/* Sink basin with gradient */}
                  <ellipse cx="0" cy="0" rx="45" ry="28" fill="url(#coriSinkBasin)" stroke="#64748b" strokeWidth="1" />
                  <ellipse cx="0" cy="-5" rx="38" ry="22" fill="none" stroke="#475569" strokeWidth="1" opacity="0.5" />

                  {/* Drain hole */}
                  <circle cx="0" cy="5" r="12" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                  <circle cx="0" cy="5" r="6" fill="#020617" />

                  {/* Water swirl with gradient - scaled up coords, scaled down transform */}
                  <g transform="scale(0.2)">
                    <path d="M 0 10 Q 60 -15, 40 70 Q 0 110, -40 70 Q -60 -15, 0 10" stroke="url(#coriWaterSwirl)" strokeWidth="12.5" fill="none" strokeLinecap="round">
                      <animateTransform attributeName="transform" type="rotate" values="0;360;720;360;0" dur="4s" repeatCount="indefinite" />
                    </path>
                    <path d="M 0 10 Q 50 -15, 35 65 Q 0 105, -35 65 Q -50 -15, 0 10" stroke="#3b82f6" strokeWidth="7.5" fill="none" opacity="0.5">
                      <animateTransform attributeName="transform" type="rotate" values="0;-360;-720;-360;0" dur="3s" repeatCount="indefinite" />
                    </path>
                  </g>
                </g>

                {/* Title labels with absolute coordinates */}
                <text x="100" y="30" textAnchor="middle" fontSize="14" fill="#38bdf8" fontWeight="600">Hurricane</text>
                <text x="100" y="48" textAnchor="middle" fontSize="11" fill="#64748b">(~500 km)</text>
                <text x="300" y="30" textAnchor="middle" fontSize="14" fill="#94a3b8" fontWeight="600">Sink Drain</text>
                <text x="300" y="48" textAnchor="middle" fontSize="11" fill="#64748b">(~30 cm)</text>

                {/* Comparison panel with absolute coordinates */}
                <rect x="145" y="200" width="110" height="55" fill="url(#coriInfoPanel)" rx="8" stroke="#475569" strokeWidth="1" />
                <text x="200" y="218" textAnchor="middle" fontSize="11" fill="#94a3b8" fontWeight="bold">What Dominates?</text>
                <text x="200" y="234" textAnchor="middle" fontSize="11" fill="#64748b">Sink: Basin shape</text>
                <text x="200" y="250" textAnchor="middle" fontSize="11" fill="#38bdf8" fontWeight="600">Hurricane: Coriolis!</text>

                {/* Scale labels at bottom */}
                <text x="100" y="265" textAnchor="middle" fontSize="11" fill="#10b981" fontWeight="700">STRONG</text>
                <text x="300" y="265" textAnchor="middle" fontSize="11" fill="#ef4444" fontWeight="700">NEGLIGIBLE</text>

                {/* VS divider */}
                <circle cx="200" cy="120" r="18" fill="url(#coriInfoPanel)" stroke="#a855f7" strokeWidth="2" />
                <text x="200" y="125" textAnchor="middle" fontSize="12" fill="#c084fc" fontWeight="bold">VS</text>
              </svg>

              {/* Labels outside SVG */}
              <div className="absolute top-4 left-6 text-center">
                <span style={{ fontSize: typo.small, color: '#38bdf8', fontWeight: 600 }}>Hurricane</span>
                <br />
                <span style={{ fontSize: typo.label, color: colors.textMuted }}>(~500 km)</span>
              </div>
              <div className="absolute top-4 right-6 text-center">
                <span style={{ fontSize: typo.small, color: colors.textSecondary, fontWeight: 600 }}>Sink Drain</span>
                <br />
                <span style={{ fontSize: typo.label, color: colors.textMuted }}>(~30 cm)</span>
              </div>
              <div className="absolute bottom-6 left-12">
                <span style={{ fontSize: typo.small, color: colors.success, fontWeight: 700 }}>STRONG</span>
                <br />
                <span style={{ fontSize: typo.label, color: colors.textMuted }}>Hours to form</span>
              </div>
              <div className="absolute bottom-6 right-12">
                <span style={{ fontSize: typo.small, color: colors.danger, fontWeight: 700 }}>NEGLIGIBLE</span>
                <br />
                <span style={{ fontSize: typo.label, color: colors.textMuted }}>Seconds to drain</span>
              </div>
            </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4 max-w-lg">
              <h4 className="text-amber-400 font-semibold mb-2">The Math</h4>
              <p className="text-slate-300 text-sm">
                Coriolis acceleration is approximately 2 omega v sin(phi)<br />
                For a sink: ~10^-5 m/s squared (barely measurable!)<br />
                <span className="text-amber-400">That&apos;s 10 million times weaker than other effects!</span>
              </p>
            </div>
              </div>
            </div>

            <button
              onClick={() => goToPhase('twist_review')}
              style={{ zIndex: 10 }}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
            >
              Learn the Truth
            </button>
          </div>
        );

      case 'twist_review':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-6">Myth Busted!</h2>

            {twistPrediction === 'no_weak' ? (
              <div className="bg-green-500/20 border border-green-500 rounded-xl p-4 mb-6 max-w-lg">
                <p className="text-green-400 font-semibold">You saw through the myth!</p>
              </div>
            ) : (
              <div className="bg-amber-500/20 border border-amber-500 rounded-xl p-4 mb-6 max-w-lg">
                <p className="text-amber-400">The Coriolis effect is FAR too weak at sink scales!</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 max-w-lg mb-6">
              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-red-400 mb-2">The Myth</h3>
                <p className="text-slate-300 text-sm">
                  &quot;Water drains counterclockwise in the Northern Hemisphere and clockwise in the Southern.&quot;
                  This is one of the most persistent physics myths!
                </p>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-green-400 mb-2">The Truth</h3>
                <p className="text-slate-300 text-sm">
                  At sink/toilet scale, Coriolis is about <span className="text-green-400 font-bold">10 million times weaker</span> than other factors like basin shape, residual water motion, and drain design.
                </p>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-sky-400 mb-2">Scale Matters!</h3>
                <p className="text-slate-300 text-sm">
                  Coriolis only dominates for <span className="text-sky-400 font-bold">large-scale (100+ km), long-duration</span> phenomena: hurricanes, ocean currents, global wind patterns - not your bathroom!
                </p>
              </div>
            </div>

            <button
              onClick={() => goToPhase('transfer')}
              style={{ zIndex: 10 }}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white font-bold rounded-xl transition-all"
            >
              See Real Applications
            </button>
          </div>
        );

      case 'transfer':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', padding: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#4ade80', marginBottom: '24px' }}>Real-World Applications</h2>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {transferApps.map((app, index) => (
                <button
                  key={index}
                  onClick={() => setActiveAppTab(index)}
                  style={{ padding: '8px 16px', borderRadius: '8px', fontWeight: 500, border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', background: activeAppTab === index ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : '#334155', color: activeAppTab === index ? 'white' : '#cbd5e1' }}
                >
                  {completedApps.has(index) && 'Done '}{app.short}
                </button>
              ))}
            </div>

            <div style={{ border: '1px solid #3b82f6', borderRadius: '12px', width: '100%', maxWidth: '640px' }}>
              <div style={{ background: '#0f172a', padding: '24px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ width: '80px', height: '80px', flexShrink: 0 }}>
                    {transferApps[activeAppTab].icon}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>{transferApps[activeAppTab].title}</h3>
                    <p style={{ color: '#94a3b8', fontSize: '14px', fontStyle: 'italic' }}>{transferApps[activeAppTab].tagline}</p>
                  </div>
                </div>

                <p style={{ color: '#cbd5e1', marginBottom: '16px', lineHeight: '1.6' }}>{transferApps[activeAppTab].description}</p>

                <div style={{ background: 'rgba(30,41,59,0.5)', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #334155' }}>
                  <h4 style={{ color: '#38bdf8', fontWeight: 700, marginBottom: '8px' }}>Physics Connection</h4>
                  <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: '1.5' }}>{transferApps[activeAppTab].connection}</p>
                </div>

                <div style={{ background: 'rgba(30,41,59,0.5)', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #334155' }}>
                  <h4 style={{ color: '#06b6d4', fontWeight: 700, marginBottom: '8px' }}>How It Works</h4>
                  <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: '1.5' }}>{transferApps[activeAppTab].howItWorks}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                  {transferApps[activeAppTab].stats.map((stat, i) => (
                    <div key={i} style={{ background: '#1e293b', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ color: 'white', fontWeight: 700, fontSize: '18px' }}>{stat.value}</div>
                      <div style={{ color: '#94a3b8', fontSize: '11px' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ color: '#4ade80', fontWeight: 700, marginBottom: '8px', fontSize: '14px' }}>Applications</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {transferApps[activeAppTab].examples.map((ex, i) => (
                      <span key={i} style={{ background: '#1e293b', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: '#cbd5e1' }}>{ex}</span>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ color: '#f59e0b', fontWeight: 700, marginBottom: '8px', fontSize: '14px' }}>Industry Leaders</h4>
                  <p style={{ color: '#94a3b8', fontSize: '13px' }}>{transferApps[activeAppTab].companies.join(', ')}</p>
                </div>

                <div style={{ background: 'rgba(30,41,59,0.5)', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #334155' }}>
                  <h4 style={{ color: '#a855f7', fontWeight: 700, marginBottom: '8px' }}>Future Impact</h4>
                  <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: '1.5' }}>{transferApps[activeAppTab].futureImpact}</p>
                </div>

                {!completedApps.has(activeAppTab) && (
                  <button
                    onClick={() => handleAppComplete(activeAppTab)}
                    style={{ width: '100%', padding: '12px', background: '#16a34a', color: 'white', fontWeight: 700, borderRadius: '8px', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease' }}
                  >
                    Mark as Understood
                  </button>
                )}
              </div>
            </div>

            <p style={{ color: '#94a3b8', marginTop: '16px' }}>
              Completed: {completedApps.size} / {transferApps.length}
            </p>
          </div>
        );

      case 'test': {
        const q = testQuestions[currentQuestion];
        const isConfirmed = confirmedQuestion === currentQuestion;
        const selectedAnswer = testAnswers[currentQuestion];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', padding: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>Knowledge Test</h2>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '24px' }}>Question {currentQuestion + 1} of 10</p>

            {!testSubmitted ? (
              <div style={{ width: '100%', maxWidth: '640px' }}>
                <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #334155' }}>
                  <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px', fontStyle: 'italic', lineHeight: '1.5' }}>{q.scenario}</p>
                  <p style={{ color: '#e2e8f0', marginBottom: '16px', fontWeight: 500, fontSize: '16px', lineHeight: '1.5' }}>{q.question}</p>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {q.options.map((option, oIndex) => (
                      <button
                        key={oIndex}
                        onClick={() => !isConfirmed && handleTestAnswer(currentQuestion, oIndex)}
                        style={{ padding: '12px 16px', borderRadius: '8px', fontSize: '14px', textAlign: 'left', border: 'none', cursor: isConfirmed ? 'default' : 'pointer', transition: 'all 0.3s ease', lineHeight: '1.5', background: isConfirmed && option.correct ? '#16a34a' : isConfirmed && selectedAnswer === oIndex && !option.correct ? '#dc2626' : selectedAnswer === oIndex ? '#2563eb' : '#334155', color: 'white' }}
                      >
                        {String.fromCharCode(65 + oIndex)}) {option.text}
                      </button>
                    ))}
                  </div>
                  {isConfirmed && (
                    <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(51,65,85,0.5)', borderRadius: '8px' }}>
                      <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: '1.5' }}>{q.explanation}</p>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {!isConfirmed ? (
                    <button
                      onClick={() => { if (selectedAnswer !== -1) setConfirmedQuestion(currentQuestion); }}
                      disabled={selectedAnswer === -1}
                      style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: selectedAnswer !== -1 ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.1)', color: 'white', cursor: selectedAnswer !== -1 ? 'pointer' : 'not-allowed', fontWeight: 600, transition: 'all 0.3s ease' }}
                    >
                      Check Answer
                    </button>
                  ) : currentQuestion < 9 ? (
                    <button
                      onClick={() => { setConfirmedQuestion(null); setCurrentQuestion(currentQuestion + 1); }}
                      style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', cursor: 'pointer', fontWeight: 600, transition: 'all 0.3s ease' }}
                    >
                      Next Question
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setTestSubmitted(true);
                        setShowTestResults(true);
                        playSound('complete');
                        onGameEvent?.({ type: 'test_completed', data: { score: calculateTestScore() } });
                      }}
                      style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', cursor: 'pointer', fontWeight: 600, transition: 'all 0.3s ease' }}
                    >
                      Submit Test
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '32px', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
                  Score: {calculateTestScore()} / 10
                </p>
                <p style={{ fontSize: '18px', color: calculateTestScore() >= 7 ? '#4ade80' : '#fbbf24' }}>
                  {calculateTestScore() >= 9 ? 'Outstanding! You\'ve mastered the Coriolis effect!' :
                   calculateTestScore() >= 7 ? 'Great job! You understand the key concepts!' :
                   'Keep learning! Try reviewing the material again.'}
                </p>
              </div>
            )}
          </div>
        );
      }

      case 'mastery':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
            <div className="text-8xl mb-6">🏆</div>
            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-400 to-teal-400 mb-4">
              Coriolis Effect Master!
            </h2>
            <div className="bg-gradient-to-r from-sky-600/20 to-cyan-600/20 border-2 border-sky-500/50 p-8 rounded-2xl max-w-md mb-6">
              <p className="text-slate-200 mb-6 text-lg">
                You now understand why hurricanes spin and toilets don&apos;t care!
              </p>
              <div className="text-left text-slate-300 space-y-3">
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">✓</span>
                  <span>Coriolis is an apparent deflection in rotating frames</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">✓</span>
                  <span>Right deflection in NH, left in SH</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">✓</span>
                  <span><span className="text-sky-400 font-mono">F = 2m(omega x v)</span> - the Coriolis force</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">✓</span>
                  <span>Only significant at large scales (100+ km)</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">✓</span>
                  <span>Toilet drain myth: BUSTED!</span>
                </p>
              </div>
            </div>
            <p className="text-sky-400 font-medium text-lg">
              Next time you see a hurricane on the news, you&apos;ll know why it spins!
            </p>
            <div className="mt-6 flex gap-4">
              <button
                onClick={() => goToPhase('hook')}
                style={{ zIndex: 10 }}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
              >
                Start Over
              </button>
              <button
                onClick={() => goToPhase('play')}
                style={{ zIndex: 10 }}
                className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-xl transition-colors"
              >
                Explore More
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const currentIndex = phaseOrder.indexOf(phase);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === phaseOrder.length - 1;
  const isTestPhase = phase === 'test';
  const quizComplete = isTestPhase && testSubmitted;
  const canGoNext = !isLast && (!isTestPhase || quizComplete);

  const renderBottomBar = () => (
    <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)' }}>
      <button onClick={() => !isFirst && goToPhase(phaseOrder[currentIndex - 1])} style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: isFirst ? 'rgba(255,255,255,0.3)' : 'white', cursor: isFirst ? 'not-allowed' : 'pointer', opacity: isFirst ? 0.4 : 1, transition: 'all 0.3s ease', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif' }}>
        ← Back
      </button>
      <div style={{ display: 'flex', gap: '6px' }}>
        {phaseOrder.map((p, i) => (
          <div key={p} onClick={() => i <= currentIndex && goToPhase(p)} title={phaseNames[p]} style={{ width: p === phase ? '20px' : '10px', height: '10px', borderRadius: '5px', background: p === phase ? '#3b82f6' : i < currentIndex ? '#10b981' : 'rgba(255,255,255,0.2)', cursor: i <= currentIndex ? 'pointer' : 'default', transition: 'all 0.3s ease' }} />
        ))}
      </div>
      <button onClick={() => canGoNext && goToPhase(phaseOrder[currentIndex + 1])} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: canGoNext ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.1)', color: 'white', cursor: canGoNext ? 'pointer' : 'not-allowed', opacity: canGoNext ? 1 : 0.4, transition: 'all 0.3s ease', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif' }}>
        Next →
      </button>
    </div>
  );

  return (
    <div style={{ height: '100vh', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0f172a, #0a1628, #0f172a)', color: 'white', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif' }}>
      {/* Top bar */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#3b82f6' }}>Coriolis Effect</span>
        <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>{phaseNames[phase]} ({currentIndex + 1}/{phaseOrder.length})</span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {renderPhaseContent()}
      </div>

      {/* Bottom bar */}
      {renderBottomBar()}
    </div>
  );
};

export default CoriolisEffectRenderer;
