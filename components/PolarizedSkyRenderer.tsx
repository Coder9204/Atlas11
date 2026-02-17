'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Polarized Sky - Complete 10-Phase Game
// How Vikings and bees navigate using sky polarization patterns
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

interface PolarizedSkyRendererProps {
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
    scenario: "You're teaching a friend about optics and they ask why the sky appears blue and why sunglasses work better in certain directions.",
    question: "What physical process causes skylight to become polarized?",
    options: [
      { id: 'a', label: "Reflection of sunlight off water vapor droplets in the atmosphere" },
      { id: 'b', label: "Rayleigh scattering by nitrogen and oxygen molecules that preferentially scatters light perpendicular to the scattering plane", correct: true },
      { id: 'c', label: "Absorption and re-emission by ozone molecules in the stratosphere" },
      { id: 'd', label: "Refraction through ice crystals suspended in cirrus clouds" }
    ],
    explanation: "Rayleigh scattering occurs when light interacts with particles much smaller than its wavelength, like N2 and O2 molecules. The electric field of scattered light oscillates perpendicular to the scattering plane, creating a systematic polarization pattern across the entire sky."
  },
  {
    scenario: "A photographer notices that when wearing polarized sunglasses and looking at different parts of the clear blue sky, some regions appear much darker than others when tilting their head.",
    question: "Why do polarized sunglasses reduce glare more effectively when looking at certain parts of the sky?",
    options: [
      { id: 'a', label: "The sunglasses block UV radiation which varies across the sky" },
      { id: 'b', label: "Skylight at 90 degrees from the sun is highly polarized, so aligned polarized lenses can block most of it", correct: true },
      { id: 'c', label: "The lenses have a gradient tint that matches sky brightness patterns" },
      { id: 'd', label: "Human eyes are more sensitive to polarized light in peripheral vision" }
    ],
    explanation: "Skylight is most strongly polarized at 90 degrees from the sun, where it can reach 75-80% polarization. When polarized sunglasses are oriented perpendicular to this polarization direction, they block most of the polarized light, dramatically darkening that region of the sky."
  },
  {
    scenario: "An engineer is designing an outdoor optical sensor and needs to account for skylight polarization. The sun is at azimuth 180 degrees (due south) and 45 degrees elevation.",
    question: "At what position in the sky would the sensor detect maximum polarization?",
    options: [
      { id: 'a', label: "Looking directly toward the sun at 180 degrees azimuth" },
      { id: 'b', label: "Looking at the antisolar point, 180 degrees opposite the sun" },
      { id: 'c', label: "Along a band 90 degrees from the sun - such as due east, due west, or at the zenith", correct: true },
      { id: 'd', label: "Near the horizon in all directions equally" }
    ],
    explanation: "Maximum polarization occurs along a great circle 90 degrees from the sun. With the sun due south at 45 degrees elevation, maximum polarization would be found due east, due west, and along the entire arc 90 degrees away from the sun's position."
  },
  {
    scenario: "Archaeologists discovered calcite crystals (Iceland spar) in Viking shipwrecks. Historical records suggest Vikings sailed across the North Atlantic without magnetic compasses, even on overcast days.",
    question: "How could Vikings have used calcite sunstones to navigate when the sun was hidden by clouds?",
    options: [
      { id: 'a', label: "Calcite glows when exposed to the Earth's magnetic field, pointing north" },
      { id: 'b', label: "Calcite birefringence creates double images that merge when aligned with sky polarization, revealing the sun's position", correct: true },
      { id: 'c', label: "The crystals reflect starlight that penetrates clouds at night" },
      { id: 'd', label: "Calcite changes color based on water temperature, indicating latitude" }
    ],
    explanation: "Calcite exhibits birefringence - it splits light into two polarized rays. When held up to an overcast sky and rotated, the crystal shows two images of equal brightness only when its optical axis aligns with the polarization direction of skylight, revealing the sun's hidden position."
  },
  {
    scenario: "A biologist observing honeybees notices they can navigate accurately back to the hive even when the sun is obscured by a tree line, but struggle on heavily overcast or hazy days.",
    question: "What specialized adaptation allows bees to use sky polarization for navigation?",
    options: [
      { id: 'a', label: "Bees have magnetic particles in their abdomens that sense Earth's field" },
      { id: 'b', label: "Bees memorize landmark patterns and only use polarization as backup" },
      { id: 'c', label: "Specialized photoreceptors in their compound eyes detect the e-vector orientation of polarized light", correct: true },
      { id: 'd', label: "Bees communicate sun position through waggle dances and don't need to see the sky" }
    ],
    explanation: "Honeybees possess specialized UV-sensitive photoreceptors in the dorsal rim area of their compound eyes that can detect the electric field oscillation direction (e-vector) of polarized light. They use this as a celestial compass even when only a small patch of blue sky is visible."
  },
  {
    scenario: "A landscape photographer is shooting a mountain scene at midday with the sun almost directly overhead. They attach a circular polarizing filter to their lens.",
    question: "In which direction will the polarizing filter have the strongest effect on sky darkness?",
    options: [
      { id: 'a', label: "Looking toward the zenith directly above" },
      { id: 'b', label: "Looking toward the horizon in all directions equally" },
      { id: 'c', label: "Looking horizontally in any direction, since all horizontal views are roughly 90 degrees from an overhead sun", correct: true },
      { id: 'd', label: "Looking at the sun through the filter to reduce its intensity" }
    ],
    explanation: "With the sun nearly overhead, the 90-degree maximum polarization zone forms a ring around the horizon. Looking horizontally in any direction puts you at approximately 90 degrees from the sun, where polarization is strongest and the filter has maximum effect."
  },
  {
    scenario: "An atmospheric physicist measures sky polarization and finds the degree of polarization is only 40% at 90 degrees from the sun, much lower than the theoretical maximum of about 94%.",
    question: "What is the primary reason real-world sky polarization never reaches the theoretical maximum?",
    options: [
      { id: 'a', label: "The sun emits partially polarized light that interferes with atmospheric polarization" },
      { id: 'b', label: "Multiple scattering events and ground reflections mix polarization states, reducing the net polarization", correct: true },
      { id: 'c', label: "Quantum effects prevent light from being fully polarized at visible wavelengths" },
      { id: 'd', label: "Earth's magnetic field rotates the polarization direction unpredictably" }
    ],
    explanation: "In the real atmosphere, light undergoes multiple scattering events before reaching an observer. Each additional scattering randomizes polarization direction. Ground reflections and aerosols (Mie scattering) also contribute unpolarized light, reducing the net polarization."
  },
  {
    scenario: "A researcher notices that the sky polarization pattern looks different at sunset compared to midday. With the sun on the horizon, the band of maximum polarization now passes through the zenith.",
    question: "Why does the geometry of sky polarization change so dramatically between midday and sunset?",
    options: [
      { id: 'a', label: "The atmosphere is thicker at sunset, changing scattering properties" },
      { id: 'b', label: "The 90-degree maximum polarization zone always forms a great circle around the sun's position, which changes as the sun moves", correct: true },
      { id: 'c', label: "Sunset light is redder and red wavelengths have different polarization than blue" },
      { id: 'd', label: "Humidity increases in the evening, altering the polarization pattern" }
    ],
    explanation: "The zone of maximum polarization always lies along a great circle 90 degrees from the sun. At midday with sun high, this zone is near the horizon. At sunset with sun on the horizon, the 90-degree zone passes through the zenith. This predictable relationship enables navigation."
  },
  {
    scenario: "Engineers are developing an autonomous drone for polar exploration where GPS signals are unreliable and magnetic compasses are inaccurate near the poles.",
    question: "What key advantage does a polarimetric navigation system offer over GPS or magnetic compasses for polar operations?",
    options: [
      { id: 'a', label: "Polarization sensors are smaller and use less power than GPS receivers" },
      { id: 'b', label: "Sky polarization provides a heading reference independent of magnetic anomalies and doesn't require satellite signals", correct: true },
      { id: 'c', label: "Polarization works at night using starlight polarization patterns" },
      { id: 'd', label: "Ice crystals in polar air enhance polarization, making it more accurate" }
    ],
    explanation: "Near Earth's magnetic poles, magnetic compasses become unreliable. GPS can have coverage gaps and is vulnerable to jamming. Sky polarization provides a stable heading reference as long as any blue sky is visible, derived purely from the sun's position - ideal for polar operations."
  },
  {
    scenario: "A climate scientist uses a satellite-mounted polarimeter to study clouds from above. They notice that liquid water clouds and ice crystal clouds produce distinctly different polarization signatures.",
    question: "How does polarimetry help distinguish between liquid water clouds and ice crystal clouds?",
    options: [
      { id: 'a', label: "Ice clouds polarize light clockwise while water clouds polarize counterclockwise" },
      { id: 'b', label: "Spherical water droplets and hexagonal ice crystals scatter light at different angles with different polarization characteristics", correct: true },
      { id: 'c', label: "Water absorbs polarized light while ice reflects it unchanged" },
      { id: 'd', label: "Temperature differences cause different polarization in thermal infrared emissions" }
    ],
    explanation: "Liquid cloud droplets are nearly spherical and exhibit Mie scattering with characteristic polarization features. Ice crystals have hexagonal shapes that produce different angular scattering patterns. Polarimeters measure these differences to reveal particle shape and phase (liquid vs ice)."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🐝',
    title: 'Bee Navigation',
    short: 'Insects see polarized sky patterns invisible to us',
    tagline: "Nature's compass in the sky",
    description: 'Honeybees and many insects can detect sky polarization patterns with specialized photoreceptors. They use this as a compass for navigation, even when the sun is behind clouds.',
    connection: 'The sky polarization pattern forms concentric circles around the sun due to Rayleigh scattering. Bees detect this pattern to determine the sun\'s position for accurate hive navigation.',
    howItWorks: 'Bee eyes have polarization-sensitive photoreceptors arranged in specific patterns. The brain processes the e-vector orientation to compute the solar meridian direction.',
    stats: [
      { value: '90°', label: 'max polarization angle', icon: '📐' },
      { value: '70%', label: 'max sky polarization', icon: '☀️' },
      { value: '20000+', label: 'bee species use this', icon: '🐝' },
      { value: '5km', label: 'navigation range', icon: '📏' },
      { value: '400nm', label: 'UV detection wavelength', icon: '🔬' }
    ],
    examples: ['Honeybee hive navigation', 'Desert ant orientation', 'Dung beetle rolling', 'Monarch butterfly migration'],
    companies: ['Research Institutions', 'Conservation Groups', 'Agricultural Services', 'Biomimetics Labs'],
    futureImpact: 'Biomimetic polarization sensors inspired by insect eyes could enable GPS-free navigation systems.',
    color: '#F59E0B'
  },
  {
    icon: '⚔️',
    title: 'Viking Sunstones',
    short: 'Ancient navigators used crystals to find the sun',
    tagline: 'Crossing oceans with physics',
    description: 'Vikings may have used calcite crystals (Iceland spar) to locate the sun through overcast skies. These "sunstones" show different appearances when viewing polarized light from different directions.',
    connection: 'Calcite crystals are birefringent - they split light into two polarizations. Rotating the crystal while viewing polarized skylight reveals the solar direction.',
    howItWorks: 'The navigator views the sky through the crystal and rotates it. The two images from birefringence become equal brightness when pointing at 90 degrees from the sun.',
    stats: [
      { value: '5 deg', label: 'navigation accuracy', icon: '🧭' },
      { value: '1000+', label: 'years ago', icon: '📅' },
      { value: '3000 km', label: 'Atlantic crossings', icon: '🌊' }
    ],
    examples: ['North Atlantic voyages', 'Iceland to Greenland routes', 'Exploration of Vinland', 'Trading expeditions'],
    companies: ['Maritime Museums', 'Historical Research', 'Viking Heritage Sites', 'Crystal Suppliers'],
    futureImpact: 'Understanding historical navigation techniques informs modern backup systems for GPS failures.',
    color: '#6366F1'
  },
  {
    icon: '📷',
    title: 'Photography Filters',
    short: 'Darken blue skies by blocking polarized light',
    tagline: 'Making skies dramatic since 1938',
    description: 'Photographers use polarizing filters to darken blue skies, reduce reflections, and increase color saturation. The effect varies across the sky based on the natural polarization pattern.',
    connection: 'Since skylight is polarized perpendicular to the sun-sky-observer plane, rotating a polarizer blocks different amounts of sky light at different angles from the sun.',
    howItWorks: 'The filter is rotated until the sky darkens optimally. Maximum effect occurs at 90 degrees from the sun. Near the sun or opposite it, polarization is low so the filter has little effect.',
    stats: [
      { value: '90 deg', label: 'optimal sun angle', icon: '☀️' },
      { value: '3 stops', label: 'sky darkening', icon: '📊' },
      { value: '$500M', label: 'filter market', icon: '📈' }
    ],
    examples: ['Landscape photography', 'Architectural shoots', 'Car photography', 'Nature documentation'],
    companies: ['B+W', 'Hoya', 'Lee Filters', 'NiSi'],
    futureImpact: 'Digital cameras may incorporate computational polarimetry for automatic glare and reflection removal.',
    color: '#EC4899'
  },
  {
    icon: '🛩️',
    title: 'Polarimetric Navigation',
    short: 'Aircraft use sky polarization as GPS backup',
    tagline: "When satellites aren't enough",
    description: 'Modern aircraft and drones can use polarized skylight sensors as navigation backup when GPS is unavailable or jammed. The sky polarization pattern provides absolute heading reference.',
    connection: 'Military and civilian applications need GPS-independent navigation. The predictable polarization pattern based on sun position offers a physics-based backup.',
    howItWorks: 'Multiple polarization sensors measure the e-vector pattern. Algorithms calculate the solar meridian from the pattern, providing heading without magnetic or satellite reference.',
    stats: [
      { value: '1 deg', label: 'heading accuracy', icon: '🎯' },
      { value: '24/7', label: 'availability', icon: '⏰' },
      { value: '$10B', label: 'nav systems market', icon: '📈' }
    ],
    examples: ['Military aircraft backup', 'Autonomous drones', 'Submarine periscopes', 'Arctic exploration'],
    companies: ['Honeywell', 'Northrop Grumman', 'BAE Systems', 'Collins Aerospace'],
    futureImpact: 'Chip-scale polarimetric sensors will make this navigation method available for any outdoor autonomous system.',
    color: '#10B981'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const PolarizedSkyRenderer: React.FC<PolarizedSkyRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [sunAzimuth, setSunAzimuth] = useState(45);
  const [sunElevation, setSunElevation] = useState(45);
  const [polarizerAngle, setPolarizerAngle] = useState(0);
  const [showVectors, setShowVectors] = useState(true);
  const [hazeLevel, setHazeLevel] = useState(0);

  // Twist phase - haze comparison
  const [twistHazeLevel, setTwistHazeLevel] = useState(0);

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

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#6366F1', // Indigo for sky theme
    accentGlow: 'rgba(99, 102, 241, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
    sky: '#3B82F6',
    sun: '#FCD34D',
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
    twist_play: 'Compare',
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
        gameType: 'polarized-sky',
        gameTitle: 'Polarized Sky',
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

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Physics calculations
  const calculatePolarization = useCallback((angleFromSun: number, haze: number = hazeLevel): number => {
    const radians = (angleFromSun * Math.PI) / 180;
    const maxPolarization = 0.75 * (1 - haze / 100);
    return maxPolarization * Math.pow(Math.sin(radians), 2);
  }, [hazeLevel]);

  const getPolarizationDirection = useCallback((x: number, y: number, sunX: number, sunY: number): number => {
    const dx = x - sunX;
    const dy = y - sunY;
    return Math.atan2(dy, dx) + Math.PI / 2;
  }, []);

  // Sky Dome Visualization Component
  const SkyDomeVisualization = ({ currentHaze = hazeLevel, showAxes = false }: { currentHaze?: number; showAxes?: boolean }) => {
    const width = isMobile ? 320 : 480;
    const height = isMobile ? 280 : 360;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.38;

    // Sun position in sky dome coordinates
    const sunRadians = (sunAzimuth * Math.PI) / 180;
    const sunDist = radius * (1 - sunElevation / 90);
    const sunX = centerX + sunDist * Math.cos(sunRadians);
    const sunY = centerY - sunDist * Math.sin(sunRadians);

    // Generate polarization vectors
    const vectors: { x: number; y: number; angle: number; strength: number }[] = [];
    const gridSize = isMobile ? 5 : 7;

    for (let i = -gridSize; i <= gridSize; i++) {
      for (let j = -gridSize; j <= gridSize; j++) {
        const x = centerX + (i / gridSize) * radius;
        const y = centerY + (j / gridSize) * radius;
        const distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

        if (distFromCenter <= radius * 0.9) {
          const distFromSun = Math.sqrt((x - sunX) ** 2 + (y - sunY) ** 2);
          const angleFromSun = Math.atan2(distFromSun, radius) * (180 / Math.PI);
          const strength = calculatePolarization(Math.min(90, angleFromSun * 1.5), currentHaze);
          const direction = getPolarizationDirection(x, y, sunX, sunY);

          vectors.push({ x, y, angle: direction, strength });
        }
      }
    }

    const polarizerRad = (polarizerAngle * Math.PI) / 180;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '100%' }}>
        <title>Sky Polarization Simulation Visualization</title>
        <defs>
          <radialGradient id="skyGrad" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#1e40af" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#93c5fd" />
          </radialGradient>
          <radialGradient id="sunGrad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#fcd34d" />
            <stop offset="100%" stopColor="#f59e0b" />
          </radialGradient>
          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title - placed above the axis area */}
        <text x={width/2} y="13" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="600">
          Sky Polarization Intensity Map
        </text>

        {/* Sky dome background */}
        <circle cx={centerX} cy={centerY} r={radius} fill="url(#skyGrad)" opacity={1 - currentHaze / 150} />

        {/* Haze overlay */}
        {currentHaze > 0 && (
          <circle cx={centerX} cy={centerY} r={radius} fill="#94a3b8" opacity={currentHaze / 120} />
        )}

        {/* 90-degree polarization band */}
        <circle
          cx={sunX}
          cy={sunY}
          r={radius * 0.65}
          fill="none"
          stroke={colors.sky}
          strokeWidth="6"
          strokeDasharray="8,4"
          opacity={0.6 - currentHaze / 200}
        />

        {/* Polarization vectors */}
        {showVectors && vectors.map((v, i) => {
          const length = 12 * v.strength;
          const baseOpacity = 0.3 + v.strength * 0.7;
          const angleDiff = v.angle - polarizerRad;
          const transmission = Math.pow(Math.cos(angleDiff), 2);
          const finalOpacity = baseOpacity * transmission * (1 - currentHaze / 150);

          return (
            <line
              key={i}
              x1={v.x - length * Math.cos(v.angle)}
              y1={v.y - length * Math.sin(v.angle)}
              x2={v.x + length * Math.cos(v.angle)}
              y2={v.y + length * Math.sin(v.angle)}
              stroke={`rgba(96, 165, 250, ${finalOpacity})`}
              strokeWidth={2 + v.strength}
              strokeLinecap="round"
            />
          );
        })}

        {/* Sun */}
        <circle cx={sunX} cy={sunY} r={18} fill="url(#sunGrad)" filter="url(#glowFilter)" />
        <circle cx={sunX - 4} cy={sunY - 4} r={6} fill="#ffffff" opacity="0.8" />
        <text x={sunX} y={sunY + 32} textAnchor="middle" fill={colors.sun} fontSize="11" fontWeight="600">
          SUN
        </text>

        {/* Horizon ring */}
        <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke={colors.textMuted} strokeWidth="2" />

        {/* Cardinal directions - placed inside the circle to avoid overlap */}
        {['N', 'E', 'S', 'W'].map((dir, i) => {
          const angle = (i * Math.PI) / 2 - Math.PI / 2;
          const dist = radius * 0.75;
          const x = centerX + dist * Math.cos(angle);
          const y = centerY + dist * Math.sin(angle);
          return (
            <text
              key={dir}
              x={x}
              y={y}
              fill={dir === 'N' ? colors.warning : 'rgba(255,255,255,0.5)'}
              fontSize="12"
              fontWeight={dir === 'N' ? '700' : '500'}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {dir}
            </text>
          );
        })}

        {/* Axis labels - Scattering Angle reference */}
        <text x={centerX} y={height - 5} textAnchor="middle" fill={colors.textMuted} fontSize="11" fontWeight="500">
          Scattering Angle (Azimuth)
        </text>
        <text x="14" y={centerY} textAnchor="middle" fill={colors.textMuted} fontSize="11" fontWeight="500" transform={`rotate(-90 14 ${centerY})`}>
          Elevation Angle
        </text>

        {/* Stats panel - top right area, y offset to avoid conflict */}
        <g transform={`translate(${width - 98}, 28)`}>
          <rect x="0" y="0" width="88" height="82" rx="8" fill={colors.bgSecondary} stroke={colors.border} />
          <text x="44" y="14" textAnchor="middle" fill={colors.textMuted} fontSize="11">Max Polarization</text>
          <text x="44" y="34" textAnchor="middle" fill={colors.accent} fontSize="16" fontWeight="700">
            {Math.round(75 * (1 - currentHaze / 100))}%
          </text>
          <text x="44" y="54" textAnchor="middle" fill={colors.textMuted} fontSize="11">at 90 from sun</text>
          <text x="44" y="70" textAnchor="middle" fill={currentHaze < 30 ? colors.success : currentHaze < 60 ? colors.warning : colors.error} fontSize="11">
            {currentHaze < 30 ? 'Clear' : currentHaze < 60 ? 'Hazy' : 'Polluted'}
          </text>
        </g>

        {/* Polarizer indicator - top left, y=90+ to avoid conflict with stats */}
        <g transform={`translate(8, 28)`}>
          <rect x="0" y="85" width="72" height="62" rx="8" fill={colors.bgSecondary} stroke={colors.border} />
          <text x="36" y="100" textAnchor="middle" fill={colors.textMuted} fontSize="11">Polarizer</text>
          <line
            x1={36 - 20 * Math.cos(polarizerRad)}
            y1={122 - 20 * Math.sin(polarizerRad)}
            x2={36 + 20 * Math.cos(polarizerRad)}
            y2={122 + 20 * Math.sin(polarizerRad)}
            stroke={colors.warning}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <text x="36" y="140" textAnchor="middle" fill={colors.warning} fontSize="11" fontWeight="600">
            {polarizerAngle}°
          </text>
        </g>
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

  // Bottom navigation bar
  const renderBottomNav = (onNext?: () => void, nextLabel = 'Next →', nextDisabled = false) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: colors.bgSecondary,
      borderTop: `1px solid ${colors.border}`,
      padding: '12px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 200,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
    }}>
      <button
        onClick={goBack}
        disabled={phaseOrder.indexOf(phase) === 0}
        style={{
          padding: '12px 20px',
          borderRadius: '10px',
          border: `1px solid ${colors.border}`,
          background: 'transparent',
          color: phaseOrder.indexOf(phase) === 0 ? colors.border : colors.textSecondary,
          cursor: phaseOrder.indexOf(phase) === 0 ? 'not-allowed' : 'pointer',
          fontSize: '15px',
          fontWeight: 500,
          minHeight: '44px',
        }}
      >
        ← Back
      </button>
      {onNext && (
        <button
          onClick={onNext}
          disabled={nextDisabled}
          style={{
            padding: '12px 24px',
            borderRadius: '10px',
            border: 'none',
            background: nextDisabled ? colors.border : `linear-gradient(135deg, ${colors.accent}, #4F46E5)`,
            color: 'white',
            cursor: nextDisabled ? 'not-allowed' : 'pointer',
            fontSize: '15px',
            fontWeight: 600,
            minHeight: '44px',
          }}
        >
          {nextLabel}
        </button>
      )}
    </div>
  );

  // Slider CSS
  const sliderStyle: React.CSSProperties = {
    width: '100%',
    cursor: 'pointer',
    WebkitAppearance: 'none',
    appearance: 'none',
    height: '20px',
    borderRadius: '10px',
    background: colors.border,
    outline: 'none',
    touchAction: 'pan-y',
    accentColor: '#3b82f6',
  };

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #4F46E5)`,
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
    const hookContent = (
      <>
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🌤🐝
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Polarized Sky
        </h1>

        <p style={{
          ...typo.body,
          color: 'rgba(148,163,184,0.7)',
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Vikings crossed the Atlantic without compasses. Bees find their way home through forests. The secret? A <span style={{ color: colors.accent }}>hidden pattern</span> in the sky that humans can&apos;t see."
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
            "Put on polarized sunglasses and slowly rotate your head while looking at different parts of a clear blue sky. You&apos;ll notice something strange - some parts of the sky change brightness!"
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Atmospheric Optics Phenomenon
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Discover Sky Polarization
        </button>

        {renderNavDots()}
      </>
    );

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
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
            {hookContent}
          </div>
        </div>
        {renderBottomNav(() => { playSound('click'); nextPhase(); }, 'Start Exploring →')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Directly toward the sun - brightest means most polarized' },
      { id: 'b', text: 'At 90 degrees from the sun - perpendicular scattering creates maximum polarization', correct: true },
      { id: 'c', text: 'Directly opposite the sun (antisolar point)' },
    ];

    const predictContent = (
      <>
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
              🤔 Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Where in the sky would you expect scattered light to be MOST polarized?
          </h2>

          {/* Simple diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            {/* Static SVG graphic showing polarization concept */}
            <svg width="400" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: '100%', marginBottom: '16px' }}>
              {/* Sky circle */}
              <circle cx="200" cy="100" r="80" fill="#3b82f6" opacity="0.2" stroke="#3b82f6" strokeWidth="2" />

              {/* Sun */}
              <circle cx="120" cy="100" r="20" fill="#fcd34d" />
              <text x="120" y="135" textAnchor="middle" fill={colors.textPrimary} fontSize="11">Sun</text>

              {/* Scattering molecule */}
              <circle cx="200" cy="100" r="8" fill="#60a5fa" />
              <text x="200" y="82" textAnchor="middle" fill={colors.textPrimary} fontSize="11">Air Molecule</text>

              {/* Observer */}
              <circle cx="280" cy="100" r="15" fill={colors.accent} opacity="0.3" stroke={colors.accent} strokeWidth="2" />
              <text x="280" y="100" textAnchor="middle" fill={colors.textPrimary} fontSize="18">👁️</text>
              <text x="280" y="138" textAnchor="middle" fill={colors.textPrimary} fontSize="11">Observer</text>

              {/* Light ray from sun */}
              <line x1="140" y1="100" x2="190" y2="100" stroke="#fcd34d" strokeWidth="3" markerEnd="url(#arrowYellow)" />

              {/* Scattered light */}
              <line x1="208" y1="100" x2="265" y2="100" stroke="#60a5fa" strokeWidth="3" markerEnd="url(#arrowBlue)" />

              {/* Polarization annotation */}
              <text x="235" y="88" textAnchor="middle" fill={colors.success} fontSize="12" fontWeight="600">Polarized?</text>

              <defs>
                <marker id="arrowYellow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L9,3 z" fill="#fcd34d" />
                </marker>
                <marker id="arrowBlue" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L9,3 z" fill="#60a5fa" />
                </marker>
              </defs>
            </svg>
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
      </>
    );

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{
            minHeight: '100vh',
            background: colors.bgPrimary,
            padding: '24px',
          }}>
            {predictContent}
          </div>
        </div>
        {renderBottomNav(() => { playSound('success'); nextPhase(); }, prediction ? 'Test My Prediction' : 'Continue →')}
      </div>
    );
  }

  // PLAY PHASE - Interactive Sky Polarization Simulator
  if (phase === 'play') {
    // Calculate max polarization at 90 degrees
    const maxPolarizationPercent = Math.round(75 * (1 - hazeLevel / 100));
    const currentAngleFromSun = 90; //示意值
    const polarizationAtAngle = calculatePolarization(currentAngleFromSun, hazeLevel);

    const playContent = (
      <>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Sky Polarization Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
            Move the sun and rotate the polarizer to explore the pattern.
          </p>
          <p style={{ ...typo.small, color: 'rgba(148,163,184,0.7)', textAlign: 'center', marginBottom: '24px' }}>
            This matters: bees navigate using this pattern, and Vikings crossed the Atlantic with it.
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <SkyDomeVisualization showAxes={true} />
            </div>

            {/* Formula display near the graphic */}
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              border: `1px solid ${colors.accent}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>
                    Polarization Formula:
                  </div>
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: isMobile ? '13px' : '15px',
                    color: colors.accent,
                    fontWeight: 600,
                  }}>
                    P = P_max × sin²(θ)
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>
                    Real-time Calculation:
                  </div>
                  <div style={{ ...typo.body, color: colors.success, fontWeight: 700 }}>
                    P_max = {maxPolarizationPercent}% at 90°
                  </div>
                </div>
              </div>
            </div>

            {/* Observation guidance */}
            <div style={{
              background: `${colors.warning}11`,
              border: `1px solid ${colors.warning}33`,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
            }}>
              <div style={{ ...typo.small, color: colors.warning, fontWeight: 600, marginBottom: '6px' }}>
                What to Watch For:
              </div>
              <div style={{ ...typo.small, color: colors.textSecondary, lineHeight: '1.6' }}>
                Notice how the dashed circle (90° from sun) shows the zone of maximum polarization. Watch the polarization vectors become longest and brightest in this zone. Rotate the polarizer and observe which vectors stay visible - this simulates looking through polarized sunglasses!
              </div>
            </div>

            {/* Real-time calculated values displayed alongside graphic */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: '10px',
              marginBottom: '16px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '6px',
                padding: '10px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.small, color: colors.textMuted }}>Sun Azimuth</div>
                <div style={{ ...typo.h3, color: colors.accent }}>{sunAzimuth}°</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '6px',
                padding: '10px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.small, color: colors.textMuted }}>Sun Elevation</div>
                <div style={{ ...typo.h3, color: colors.accent }}>{sunElevation}°</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '6px',
                padding: '10px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.small, color: colors.textMuted }}>Max Polarization</div>
                <div style={{ ...typo.h3, color: colors.success }}>{maxPolarizationPercent}%</div>
              </div>
            </div>

            {/* Slider styles */}
            <style>{`input[type="range"].sky-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #3b82f6; cursor: pointer; } input[type="range"].sky-slider::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: #3b82f6; cursor: pointer; border: none; }`}</style>

            {/* Sun Azimuth slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textPrimary }}>Sun Azimuth</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{sunAzimuth}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={sunAzimuth}
                onChange={(e) => setSunAzimuth(parseInt(e.target.value))}
                className="sky-slider"
                style={sliderStyle}
              />
            </div>

            {/* Sun Elevation slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textPrimary }}>Sun Elevation</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{sunElevation}°</span>
              </div>
              <input
                type="range"
                min="5"
                max="90"
                value={sunElevation}
                onChange={(e) => setSunElevation(parseInt(e.target.value))}
                className="sky-slider"
                style={sliderStyle}
              />
            </div>

            {/* Polarizer Angle slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textPrimary }}>Polarizer Angle</span>
                <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{polarizerAngle}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="180"
                value={polarizerAngle}
                onChange={(e) => setPolarizerAngle(parseInt(e.target.value))}
                className="sky-slider"
                style={sliderStyle}
              />
            </div>

            {/* Toggle vectors button */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <button
                onClick={() => setShowVectors(!showVectors)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: showVectors ? colors.accent : colors.bgSecondary,
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                {showVectors ? 'Hide' : 'Show'} Polarization Vectors
              </button>
            </div>

            {/* Key observations */}
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '12px',
              padding: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                Key Observations:
              </h4>
              <ul style={{ ...typo.small, color: colors.textSecondary, margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                <li>The dashed circle shows the 90-degree zone from the sun (maximum polarization)</li>
                <li>Vectors are longest and brightest in this zone</li>
                <li>Rotating the polarizer changes which vectors appear bright</li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
          </button>
        </div>

        {renderNavDots()}
      </>
    );

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{
            minHeight: '100vh',
            background: colors.bgPrimary,
            padding: '24px',
          }}>
            {playContent}
          </div>
        </div>
        {renderBottomNav(() => { playSound('success'); nextPhase(); }, 'Understand the Physics')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const reviewContent = (
      <>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Physics of Sky Polarization
          </h2>

          <div style={{
            background: `${colors.success}22`,
            border: `1px solid ${colors.success}44`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <p style={{ ...typo.small, color: colors.success, margin: 0, fontWeight: 600 }}>
              ✓ As you observed in the experiment: maximum polarization occurs at 90° from the sun, exactly as your prediction suggested!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textPrimary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Rayleigh Scattering</strong>
              </p>
              <p style={{ marginBottom: '16px', color: colors.textSecondary }}>
                When sunlight hits air molecules (N2, O2), it gets scattered. The scattered light oscillates perpendicular to the <span style={{ color: colors.accent }}>scattering plane</span> (the plane containing the sun, molecule, and observer).
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>The 90-Degree Rule</strong>
              </p>
              <p style={{ color: colors.textSecondary }}>
                At 90 degrees from the sun, you&apos;re viewing the scattering plane edge-on, so you see only the perpendicular component. Polarization reaches <span style={{ color: colors.success }}>75-80%</span> on clear days.
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
              Key Formula
            </h3>
            <div style={{
              background: colors.bgPrimary,
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center',
              fontFamily: 'monospace',
              fontSize: '18px',
              color: colors.textPrimary,
            }}>
              P = P_max * sin^2(theta)
            </div>
            <p style={{ ...typo.small, color: colors.textSecondary, marginTop: '12px' }}>
              Where theta is the angle from the sun, and P_max depends on atmospheric clarity (typically 75-80% for clear skies).
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.sky, marginBottom: '12px' }}>
              Navigation Applications
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Because the polarization pattern is fixed relative to the sun&apos;s position, it acts as a celestial compass. Vikings used calcite crystals to detect this pattern. Bees have specialized eye structures that see it directly!
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Discover the Twist
          </button>
        </div>

        {renderNavDots()}
      </>
    );

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{
            minHeight: '100vh',
            background: colors.bgPrimary,
            padding: '24px',
          }}>
            {reviewContent}
          </div>
        </div>
        {renderBottomNav(() => { playSound('success'); nextPhase(); }, 'Discover the Twist')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Haze increases polarization by filtering out unpolarized light' },
      { id: 'b', text: 'Haze decreases polarization - large particles scatter unpolarized light (Mie scattering)', correct: true },
      { id: 'c', text: 'Haze has no effect on polarization' },
    ];

    const twistPredictContent = (
      <>
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
              🔄 New Variable: Atmospheric Clarity
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            On a clear mountain day vs a hazy city day, how does the sky polarization change?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              Rayleigh scattering works with tiny air molecules. But haze contains larger particles like dust, pollution, and water droplets...
            </p>

            {/* Static SVG showing particle size comparison */}
            <svg width="400" height="150" viewBox="0 0 400 150" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: '100%', marginBottom: '12px' }}>
              {/* Clear sky - small particles */}
              <g transform="translate(100, 75)">
                <circle cx="0" cy="0" r="40" fill={colors.success} opacity="0.1" stroke={colors.success} strokeWidth="2" />
                <circle cx="-10" cy="-5" r="3" fill={colors.sky} />
                <circle cx="5" cy="8" r="3" fill={colors.sky} />
                <circle cx="8" cy="-8" r="3" fill={colors.sky} />
                <text x="0" y="62" textAnchor="middle" fill={colors.success} fontSize="12" fontWeight="600">Clear (Small)</text>
                <text x="0" y="78" textAnchor="middle" fill={colors.textMuted} fontSize="11">High Polarization</text>
              </g>

              {/* Hazy sky - large particles */}
              <g transform="translate(300, 75)">
                <circle cx="0" cy="0" r="40" fill={colors.error} opacity="0.1" stroke={colors.error} strokeWidth="2" />
                <circle cx="-8" cy="-3" r="8" fill="#94a3b8" />
                <circle cx="10" cy="5" r="10" fill="#94a3b8" />
                <text x="0" y="62" textAnchor="middle" fill={colors.error} fontSize="12" fontWeight="600">Hazy (Large)</text>
                <text x="0" y="78" textAnchor="middle" fill={colors.textMuted} fontSize="11">Low Polarization</text>
              </g>
            </svg>
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
              See the Haze Effect
            </button>
          )}
        </div>

        {renderNavDots()}
      </>
    );

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{
            minHeight: '100vh',
            background: colors.bgPrimary,
            padding: '24px',
          }}>
            {twistPredictContent}
          </div>
        </div>
        {renderBottomNav(twistPrediction ? () => { playSound('success'); nextPhase(); } : undefined, 'See the Haze Effect', !twistPrediction)}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const maxClearPol = 75;
    const currentMaxPol = Math.round(75 * (1 - twistHazeLevel / 100));

    const twistPlayContent = (
      <>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Clear vs Hazy Sky Comparison
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Adjust haze level to see how it destroys the polarization pattern
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <SkyDomeVisualization currentHaze={twistHazeLevel} />
            </div>

            {/* Haze slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Haze / Pollution Level</span>
                <span style={{ ...typo.small, color: twistHazeLevel < 30 ? colors.success : twistHazeLevel < 60 ? colors.warning : colors.error, fontWeight: 600 }}>
                  {twistHazeLevel}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={twistHazeLevel}
                onChange={(e) => setTwistHazeLevel(parseInt(e.target.value))}
                className="sky-slider"
                style={sliderStyle}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.success }}>Clear Mountain</span>
                <span style={{ ...typo.small, color: colors.error }}>Polluted City</span>
              </div>
            </div>

            {/* Comparison stats - Before/After Display */}
            <div style={{
              background: `${colors.sky}11`,
              border: `1px solid ${colors.sky}33`,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '12px',
            }}>
              <div style={{ ...typo.small, color: colors.sky, fontWeight: 600, marginBottom: '8px', textAlign: 'center' }}>
                Before/After Comparison
              </div>
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
                  border: `1px solid ${colors.success}33`,
                }}>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>BEFORE (Clear)</div>
                  <div style={{ ...typo.h3, color: colors.success }}>{maxClearPol}%</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Max Polarization</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                  border: `1px solid ${twistHazeLevel < 30 ? colors.success : twistHazeLevel < 60 ? colors.warning : colors.error}33`,
                }}>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>AFTER (Hazy)</div>
                  <div style={{ ...typo.h3, color: twistHazeLevel < 30 ? colors.success : twistHazeLevel < 60 ? colors.warning : colors.error }}>
                    {currentMaxPol}%
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Max Polarization</div>
                </div>
              </div>
            </div>
          </div>

          {twistHazeLevel > 50 && (
            <div style={{
              background: `${colors.error}22`,
              border: `1px solid ${colors.error}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.error, margin: 0 }}>
                High haze destroys the polarization pattern! Bees struggle to navigate on polluted days.
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand Why
          </button>
        </div>

        {renderNavDots()}
      </>
    );

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{
            minHeight: '100vh',
            background: colors.bgPrimary,
            padding: '24px',
          }}>
            {twistPlayContent}
          </div>
        </div>
        {renderBottomNav(() => { playSound('success'); nextPhase(); }, 'Understand Why')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const twistReviewContent = (
      <>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Two Types of Scattering
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.sky}44`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>💨</span>
                <h3 style={{ ...typo.h3, color: colors.sky, margin: 0 }}>Rayleigh Scattering</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>Small particles</strong> (N2, O2 molecules) much smaller than light wavelength. Produces <span style={{ color: colors.success }}>strongly polarized</span> scattered light. Creates blue sky and the polarization pattern.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🌫️</span>
                <h3 style={{ ...typo.h3, color: colors.warning, margin: 0 }}>Mie Scattering</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>Large particles</strong> (dust, pollution, water droplets) comparable to light wavelength. Produces <span style={{ color: colors.error }}>unpolarized</span> white light. Dilutes the polarization pattern and creates haze.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔬</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Practical Implications</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                This is why polarization-based navigation works best on clear days. It&apos;s also why atmospheric scientists use polarimetry to monitor air quality and aerosol content!
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
      </>
    );

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{
            minHeight: '100vh',
            background: colors.bgPrimary,
            padding: '24px',
          }}>
            {twistReviewContent}
          </div>
        </div>
        {renderBottomNav(() => { playSound('success'); nextPhase(); }, 'See Real-World Applications')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const completedCount = completedApps.filter(Boolean).length;
    const allAppsCompleted = completedApps.every(c => c);

    const handleGotIt = () => {
      playSound('success');
      const newCompleted = [...completedApps];
      newCompleted[selectedApp] = true;
      setCompletedApps(newCompleted);
      if (selectedApp < realWorldApps.length - 1) {
        setSelectedApp(selectedApp + 1);
      }
    };

    const transferContent = (
      <>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ ...typo.small, color: 'rgba(148,163,184,0.7)', textAlign: 'center', marginBottom: '20px' }}>
            App {selectedApp + 1} of {realWorldApps.length} — {completedCount} completed
          </p>

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
                }}
                style={{
                  background: selectedApp === i ? `${a.color}22` : colors.bgCard,
                  border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  position: 'relative',
                  transition: 'all 0.2s ease',
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
                  {a.title.split(' ')[0]}
                </div>
              </button>
            ))}
          </div>

          {/* Selected app details */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '16px',
            borderLeft: `4px solid ${app.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '48px' }}>{app.icon}</span>
              <div>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
              </div>
            </div>

            <p style={{ ...typo.body, color: colors.textPrimary, marginBottom: '12px' }}>
              {app.description}
            </p>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '12px',
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                How Polarization Connects:
              </h4>
              <p style={{ ...typo.small, color: colors.textPrimary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '12px',
            }}>
              <h4 style={{ ...typo.small, color: colors.sky, marginBottom: '8px', fontWeight: 600 }}>
                How It Works:
              </h4>
              <p style={{ ...typo.small, color: colors.textPrimary, margin: 0 }}>
                {app.howItWorks}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '12px',
            }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{
                  background: colors.bgPrimary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                  <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                  <div style={{ ...typo.small, color: 'rgba(148,163,184,0.7)' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{
              background: `${app.color}11`,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '12px',
            }}>
              <p style={{ ...typo.small, color: colors.textPrimary, margin: 0, fontWeight: 600 }}>
                Future Impact: {app.futureImpact}
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {app.companies.map((c, i) => (
                <span key={i} style={{
                  background: colors.bgSecondary,
                  borderRadius: '6px',
                  padding: '4px 10px',
                  ...typo.small,
                  color: 'rgba(148,163,184,0.7)',
                }}>
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Got It button */}
          <button
            onClick={handleGotIt}
            style={{
              ...primaryButtonStyle,
              width: '100%',
              marginBottom: '12px',
              background: completedApps[selectedApp]
                ? `linear-gradient(135deg, ${colors.success}, #059669)`
                : `linear-gradient(135deg, ${colors.accent}, #4F46E5)`,
            }}
          >
            {completedApps[selectedApp] ? '✓ Got It — Next App →' : 'Got It →'}
          </button>

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
      </>
    );

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{
            minHeight: '100vh',
            background: colors.bgPrimary,
            padding: '24px',
          }}>
            {transferContent}
          </div>
        </div>
        {renderBottomNav(allAppsCompleted ? () => { playSound('success'); nextPhase(); } : undefined, 'Take the Knowledge Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      const testResultsContent = (
        <>
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
            <p style={{ ...typo.body, color: colors.textPrimary, marginBottom: '24px' }}>
              {passed
                ? 'You understand sky polarization and its applications!'
                : 'Review the concepts and try again.'}
            </p>

            {/* Answer review */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'left',
              maxHeight: '300px',
              overflowY: 'auto',
            }}>
              <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '12px', fontWeight: 600 }}>
                Answer Review:
              </h4>
              {testQuestions.map((q, i) => {
                const correctId = q.options.find(o => o.correct)?.id;
                const userAnswer = testAnswers[i];
                const isCorrect = userAnswer === correctId;
                return (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    marginBottom: '8px',
                    padding: '8px',
                    borderRadius: '6px',
                    background: isCorrect ? `${colors.success}11` : `${colors.error}11`,
                  }}>
                    <span style={{ color: isCorrect ? colors.success : colors.error, fontWeight: 700, minWidth: '16px' }}>
                      {isCorrect ? '✓' : '✗'}
                    </span>
                    <span style={{ ...typo.small, color: colors.textPrimary }}>
                      Q{i + 1}: {q.question.slice(0, 60)}...
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => goToPhase('hook')}
                style={{
                  padding: '14px 28px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                }}
              >
                Play Again
              </button>
              {passed && (
                <button
                  onClick={() => { playSound('complete'); nextPhase(); }}
                  style={primaryButtonStyle}
                >
                  Complete Lesson
                </button>
              )}
            </div>
          </div>
          {renderNavDots()}
        </>
      );

      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
            <div style={{
              minHeight: '100vh',
              background: colors.bgPrimary,
              padding: '24px',
            }}>
              {testResultsContent}
            </div>
          </div>
          {renderBottomNav(passed ? () => { playSound('complete'); nextPhase(); } : undefined, 'Complete Lesson')}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    const testQuestionContent = (
      <>
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
      </>
    );

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{
            minHeight: '100vh',
            background: colors.bgPrimary,
            padding: '24px',
          }}>
            {testQuestionContent}
          </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    const masteryContent = (
      <>
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
          Sky Polarization Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand the hidden polarization pattern that Vikings and bees use for navigation.
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
              'Rayleigh scattering creates a polarization pattern across the sky',
              'Maximum polarization occurs at 90 degrees from the sun',
              'Vikings used calcite sunstones to detect sky polarization',
              'Bees have specialized eye structures to see the pattern',
              'Haze and pollution reduce polarization (Mie scattering)',
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
      </>
    );

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
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
            {masteryContent}
          </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  return null;
};

export default PolarizedSkyRenderer;
