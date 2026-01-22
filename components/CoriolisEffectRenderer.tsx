'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// GOLD STANDARD: CORIOLIS EFFECT RENDERER
// Physics: F_Coriolis = -2m(ω × v) - Apparent deflection in rotating frames
// Northern Hemisphere: deflects RIGHT, Southern Hemisphere: deflects LEFT
// ============================================================================

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
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

// Physics constants
const EARTH_ANGULAR_VELOCITY = 7.29e-5; // rad/s

const CoriolisEffectRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
  const [phase, setPhase] = useState(0);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [hemisphere, setHemisphere] = useState<'north' | 'south'>('north');
  const [animPhase, setAnimPhase] = useState(0);
  const [ballLaunched, setBallLaunched] = useState(false);

  const navigationLockRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const phaseNames = [
    'Hook', 'Predict', 'Explore', 'Review',
    'Twist Predict', 'Twist Demo', 'Twist Review',
    'Transfer', 'Test', 'Mastery'
  ];

  // Responsive check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync with external phase control
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

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

  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    if (newPhase < 0 || newPhase > 9) return;
    navigationLockRef.current = true;
    playSound('transition');

    if (onPhaseComplete && newPhase > phase) {
      onPhaseComplete(phase);
    }

    setPhase(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseName: phaseNames[newPhase] } });

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [phase, playSound, onPhaseComplete, onGameEvent, phaseNames]);

  const handlePrediction = useCallback((prediction: string) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'curves' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'prediction_made', data: { prediction, correct: prediction === 'curves' } });

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'no_weak' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'twist_prediction_made', data: { prediction, correct: prediction === 'no_weak' } });

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = answerIndex;
    setTestAnswers(newAnswers);

    const isCorrect = testQuestions[questionIndex].options[answerIndex].correct;
    playSound(isCorrect ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'test_answered', data: { questionIndex, answerIndex, isCorrect } });

    setTimeout(() => { navigationLockRef.current = false; }, 400);
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
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    onGameEvent?.({ type: 'app_explored', data: { appIndex, appTitle: transferApps[appIndex].title } });

    setTimeout(() => { navigationLockRef.current = false; }, 400);
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
        { value: "500km", label: "Typical diameter" },
        { value: "250km/h", label: "Max wind speed" },
        { value: "10-20", label: "Named storms/year" },
        { value: "5°-20°", label: "Formation latitude" }
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
          <text x="50" y="95" textAnchor="middle" fontSize="8" fill="#94a3b8">Global Wind Belts</text>
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
          <text x="50" y="95" textAnchor="middle" fontSize="8" fill="#94a3b8">Ocean Gyres</text>
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
          <text x="50" y="95" textAnchor="middle" fontSize="8" fill="#94a3b8">Ballistic Deflection</text>
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

  const renderPhaseContent = () => {
    switch (phase) {
      case 0: // Hook
        return (
          <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
            {/* Premium badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500/10 border border-sky-500/20 rounded-full mb-8">
              <span className="w-2 h-2 bg-sky-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-sky-400 tracking-wide">ATMOSPHERIC PHYSICS</span>
            </div>

            {/* Main title with gradient */}
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-sky-100 to-cyan-200 bg-clip-text text-transparent">
              The Hurricane Spin Mystery
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-xl mb-8 leading-relaxed">
              Why do storms spin differently in each hemisphere?
            </p>

            {/* Premium card */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl p-6 max-w-2xl border border-slate-700/50 shadow-2xl shadow-sky-500/5 mb-8">
              <div className="relative w-full max-w-md h-64 rounded-xl overflow-hidden mx-auto">
              <svg viewBox="0 0 400 300" className="w-full h-full">
                {/* Dark background */}
                <rect width="400" height="300" fill="#0f172a" />

                {/* Earth from space */}
                <circle cx="200" cy="150" r="100" fill="#0369a1" />
                <ellipse cx="200" cy="150" rx="100" ry="30" fill="#22c55e" opacity="0.3" />

                {/* Hurricane in Northern Hemisphere */}
                <g transform="translate(160, 100)">
                  <g>
                    {[0, 1, 2].map(i => (
                      <path
                        key={i}
                        d={`M 0 0 Q ${10 + i * 8} ${-6 - i * 3}, ${20 + i * 5} ${-12 - i * 2}`}
                        stroke="#f8fafc"
                        strokeWidth={3 - i * 0.5}
                        fill="none"
                        transform={`rotate(${i * 90})`}
                      >
                        <animateTransform attributeName="transform" type="rotate" from={`${i * 90}`} to={`${i * 90 - 360}`} dur="3s" repeatCount="indefinite" additive="sum" />
                      </path>
                    ))}
                    <circle cx="0" cy="0" r="5" fill="#0f172a" />
                  </g>
                  <text x="0" y="35" textAnchor="middle" fontSize="10" fill="#38bdf8">CCW</text>
                </g>

                {/* Hurricane in Southern Hemisphere */}
                <g transform="translate(240, 200)">
                  <g>
                    {[0, 1, 2].map(i => (
                      <path
                        key={i}
                        d={`M 0 0 Q ${10 + i * 8} ${-6 - i * 3}, ${20 + i * 5} ${-12 - i * 2}`}
                        stroke="#f8fafc"
                        strokeWidth={3 - i * 0.5}
                        fill="none"
                        transform={`rotate(${i * 90})`}
                      >
                        <animateTransform attributeName="transform" type="rotate" from={`${i * 90}`} to={`${i * 90 + 360}`} dur="3s" repeatCount="indefinite" additive="sum" />
                      </path>
                    ))}
                    <circle cx="0" cy="0" r="5" fill="#0f172a" />
                  </g>
                  <text x="0" y="35" textAnchor="middle" fontSize="10" fill="#f97316">CW</text>
                </g>

                {/* Labels */}
                <text x="120" y="80" fontSize="12" fill="#94a3b8">Northern</text>
                <text x="260" y="240" fontSize="12" fill="#94a3b8">Southern</text>

                {/* Question */}
                <text x="200" y="30" textAnchor="middle" fontSize="14" fill="#fbbf24" fontWeight="bold">
                  Why do they spin opposite ways?
                </text>
              </svg>
              </div>
              <p className="text-lg text-slate-300 mt-4 mb-2">
                Hurricanes in the Northern Hemisphere <span className="text-sky-400 font-bold">always spin counterclockwise</span>.
              </p>
              <p className="text-base text-slate-400">
                In the Southern Hemisphere? <span className="text-orange-400 font-bold">Always clockwise</span>.
              </p>
            </div>

            {/* Premium CTA button */}
            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
              className="group relative px-8 py-4 bg-gradient-to-r from-sky-600 to-cyan-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="relative z-10 flex items-center gap-2">
                Discover the Coriolis Effect
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>
            <p className="mt-6 text-sm text-slate-500">Explore Earth's rotation and atmospheric dynamics</p>
          </div>
        );

      case 1: // Predict
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-sky-400 mb-6">Make Your Prediction</h2>
            <p className="text-lg text-slate-200 mb-6 text-center max-w-lg">
              Imagine you&apos;re on a spinning merry-go-round. You throw a ball <span className="text-cyan-400 font-bold">straight</span> to a friend standing across from you. What happens to the ball&apos;s path?
            </p>
            <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
              {[
                { id: 'straight', text: 'It goes in a straight line to your friend' },
                { id: 'curves', text: 'It curves away from its intended path' },
                { id: 'faster', text: 'It speeds up as it travels' },
                { id: 'stops', text: 'It stops mid-air due to rotation' }
              ].map(option => (
                <button
                  key={option.id}
                  onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
                  disabled={showPredictionFeedback}
                  className={`p-4 rounded-xl text-left transition-all ${
                    showPredictionFeedback && option.id === 'curves'
                      ? 'bg-green-600 text-white ring-2 ring-green-400'
                      : showPredictionFeedback && selectedPrediction === option.id
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  {option.text}
                </button>
              ))}
            </div>
            {showPredictionFeedback && (
              <div className="bg-slate-800 p-5 rounded-xl mb-4 max-w-md">
                <p className={`font-bold text-lg mb-2 ${selectedPrediction === 'curves' ? 'text-green-400' : 'text-sky-400'}`}>
                  {selectedPrediction === 'curves' ? '✓ Excellent prediction!' : 'Think about the rotating platform!'}
                </p>
                <p className="text-slate-300 mb-3">
                  The ball curves away from its intended path! From your rotating perspective, it appears to deflect - this is the <span className="text-sky-400 font-bold">Coriolis effect</span>.
                </p>
                <button
                  onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
                  className="mt-2 px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition-colors"
                >
                  See It In Action
                </button>
              </div>
            )}
          </div>
        );

      case 2: // Play/Explore
        const earthRotation = animPhase * 0.5;
        const deflectionDir = hemisphere === 'north' ? 1 : -1;
        const ballProgress = ballLaunched ? Math.min((animPhase % 100) / 100, 1) : 0;
        const ballIntendedAngle = 180;
        const ballActualAngle = ballIntendedAngle + deflectionDir * ballProgress * 40;
        const ballRadius = 60 - ballProgress * 30;

        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-sky-400 mb-4">The Merry-Go-Round Experiment</h2>

            <div className="relative w-full max-w-lg h-72 bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-xl mb-4 overflow-hidden">
              <svg viewBox="0 0 400 280" className="w-full h-full">
                <rect width="400" height="280" fill="#0f172a" />

                {/* Merry-go-round (viewed from above) */}
                <g transform={`translate(200, 140) rotate(${earthRotation})`}>
                  {/* Platform */}
                  <circle cx="0" cy="0" r="80" fill="#1e293b" stroke="#334155" strokeWidth="3" />

                  {/* Rotation direction indicator */}
                  <path
                    d="M -60 -50 A 78 78 0 0 1 60 -50"
                    stroke={hemisphere === 'north' ? '#22c55e' : '#ef4444'}
                    strokeWidth="3"
                    fill="none"
                  />
                  <polygon
                    points={hemisphere === 'north' ? "60,-50 50,-45 50,-55" : "-60,-50 -50,-45 -50,-55"}
                    fill={hemisphere === 'north' ? '#22c55e' : '#ef4444'}
                  />

                  {/* Radial lines */}
                  {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
                    <line
                      key={angle}
                      x1="0"
                      y1="0"
                      x2={Math.cos(angle * Math.PI / 180) * 75}
                      y2={Math.sin(angle * Math.PI / 180) * 75}
                      stroke="#334155"
                      strokeWidth="1"
                    />
                  ))}

                  {/* Center pole */}
                  <circle cx="0" cy="0" r="10" fill="#475569" stroke="#64748b" strokeWidth="2" />

                  {/* Thrower (you) */}
                  <circle cx="0" cy="-60" r="14" fill="#3b82f6" stroke="#60a5fa" strokeWidth="2" />
                  <text x="0" y="-56" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">You</text>

                  {/* Target friend */}
                  <circle cx="0" cy="60" r="14" fill="#22c55e" stroke="#4ade80" strokeWidth="2" />
                  <text x="0" y="64" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">Friend</text>

                  {/* Intended path (dashed) */}
                  <line x1="0" y1="-44" x2="0" y2="44" stroke="#64748b" strokeWidth="2" strokeDasharray="5" />

                  {/* Ball (if launched) */}
                  {ballLaunched && ballProgress < 1 && (
                    <circle
                      cx={Math.sin(ballActualAngle * Math.PI / 180) * ballRadius}
                      cy={-Math.cos(ballActualAngle * Math.PI / 180) * ballRadius + 10}
                      r="10"
                      fill="#fbbf24"
                      stroke="#f59e0b"
                      strokeWidth="2"
                    />
                  )}

                  {/* Actual path (if ball launched) */}
                  {ballLaunched && (
                    <path
                      d={`M 0 -44 Q ${deflectionDir * 40} 0, ${deflectionDir * 30} 44`}
                      stroke="#fbbf24"
                      strokeWidth="2"
                      fill="none"
                    />
                  )}
                </g>

                {/* Labels */}
                <text x="200" y="25" textAnchor="middle" fontSize="14" fill="white" fontWeight="bold">
                  {hemisphere === 'north' ? 'Northern Hemisphere (looking down)' : 'Southern Hemisphere (looking up)'}
                </text>

                {/* Hemisphere info box */}
                <g transform="translate(20, 40)">
                  <rect width="100" height="65" fill="#1e293b" rx="6" />
                  <text x="50" y="18" textAnchor="middle" fontSize="11" fill="#94a3b8" fontWeight="bold">Rotation</text>
                  <text x="50" y="38" textAnchor="middle" fontSize="14" fill={hemisphere === 'north' ? '#22c55e' : '#ef4444'} fontWeight="bold">
                    {hemisphere === 'north' ? 'CCW ↺' : 'CW ↻'}
                  </text>
                  <text x="50" y="55" textAnchor="middle" fontSize="10" fill="#64748b">
                    Deflects {hemisphere === 'north' ? 'RIGHT' : 'LEFT'}
                  </text>
                </g>

                {/* Result */}
                {ballLaunched && ballProgress >= 0.9 && (
                  <g transform="translate(280, 40)">
                    <rect width="100" height="50" fill="#1e293b" rx="6" />
                    <text x="50" y="20" textAnchor="middle" fontSize="12" fill="#fbbf24" fontWeight="bold">Ball missed!</text>
                    <text x="50" y="40" textAnchor="middle" fontSize="11" fill="#94a3b8">
                      Curved {hemisphere === 'north' ? 'right' : 'left'}
                    </text>
                  </g>
                )}
              </svg>
            </div>

            {/* Controls */}
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4 w-full max-w-lg mb-4`}>
              <div className="bg-slate-800 p-4 rounded-xl">
                <label className="text-slate-300 text-sm block mb-2">Hemisphere</label>
                <div className="flex gap-2">
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setHemisphere('north');
                      setBallLaunched(false);
                      onGameEvent?.({ type: 'hemisphere_changed', data: { hemisphere: 'north' } });
                    }}
                    className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                      hemisphere === 'north' ? 'bg-sky-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    North
                  </button>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setHemisphere('south');
                      setBallLaunched(false);
                      onGameEvent?.({ type: 'hemisphere_changed', data: { hemisphere: 'south' } });
                    }}
                    className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                      hemisphere === 'south' ? 'bg-sky-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    South
                  </button>
                </div>
              </div>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setBallLaunched(true);
                  playSound('whoosh');
                  onGameEvent?.({ type: 'ball_launched', data: { hemisphere } });
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold py-4 transition-all"
              >
                🎾 Throw Ball!
              </button>
            </div>

            <div className="bg-slate-700/30 rounded-xl p-4 mb-4 max-w-lg">
              <p className="text-slate-300 text-center">
                {ballLaunched
                  ? `The ball curves ${hemisphere === 'north' ? 'right' : 'left'} and misses your friend! This is the Coriolis effect - an apparent deflection due to observing from a rotating frame.`
                  : 'Press "Throw Ball!" to see how the Coriolis effect deflects moving objects on a rotating platform.'}
              </p>
            </div>

            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
              className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition-colors"
            >
              Understand the Physics
            </button>
          </div>
        );

      case 3: // Review
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-sky-400 mb-6">The Science Revealed</h2>

            {selectedPrediction === 'curves' ? (
              <div className="bg-green-500/20 border border-green-500 rounded-xl p-4 mb-6 max-w-lg">
                <p className="text-green-400 font-semibold">✓ Your prediction was correct! The ball curves.</p>
              </div>
            ) : (
              <div className="bg-amber-500/20 border border-amber-500 rounded-xl p-4 mb-6 max-w-lg">
                <p className="text-amber-400">The answer: It curves away from its intended path!</p>
              </div>
            )}

            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4 max-w-2xl mb-6`}>
              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-sky-400 mb-3">🌍 Earth Is a Merry-Go-Round</h3>
                <p className="text-slate-300 text-sm">
                  Earth rotates on its axis once per day. From space (inertial frame), objects move in straight lines. But from our rotating perspective, they appear to <span className="text-cyan-400 font-bold">curve</span>.
                </p>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-cyan-400 mb-3">⚡ The Coriolis Force</h3>
                <div className="bg-slate-900 p-3 rounded-lg text-center mb-2">
                  <span className="text-sky-400 font-mono text-lg">F = -2m(ω × v)</span>
                </div>
                <p className="text-slate-300 text-sm">
                  A &quot;fictitious force&quot; - not a real push, but an apparent deflection from observing in a rotating reference frame.
                </p>
              </div>

              <div className={`bg-gradient-to-r from-sky-900/50 to-cyan-900/50 p-5 rounded-xl ${isMobile ? '' : 'col-span-2'}`}>
                <h3 className="text-lg font-bold text-sky-400 mb-4">🧭 Direction Rules</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 p-4 rounded-lg text-center">
                    <div className="text-2xl mb-2">🌎</div>
                    <div className="text-green-400 font-bold">Northern Hemisphere</div>
                    <div className="text-slate-300 text-sm">Objects deflect <span className="text-green-400">RIGHT</span></div>
                    <div className="text-slate-400 text-xs mt-1">Hurricanes spin CCW ↺</div>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-lg text-center">
                    <div className="text-2xl mb-2">🌍</div>
                    <div className="text-red-400 font-bold">Southern Hemisphere</div>
                    <div className="text-slate-300 text-sm">Objects deflect <span className="text-red-400">LEFT</span></div>
                    <div className="text-slate-400 text-xs mt-1">Hurricanes spin CW ↻</div>
                  </div>
                </div>
                <p className="text-slate-400 text-sm mt-3 text-center">
                  At the equator (0° latitude), there&apos;s no Coriolis deflection because sin(0°) = 0
                </p>
              </div>
            </div>

            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all"
            >
              Explore a Twist
            </button>
          </div>
        );

      case 4: // Twist Predict
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-6">🔄 The Twist: Toilet Drains</h2>
            <div className="bg-slate-800 p-5 rounded-xl mb-6 max-w-lg">
              <p className="text-slate-200 text-center mb-4">
                Popular myth says toilets and sinks drain in <span className="text-purple-400 font-bold">opposite directions</span> in each hemisphere due to the Coriolis effect.
              </p>
              <p className="text-xl text-purple-300 text-center font-bold">
                Is this actually true?
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
              {[
                { id: 'yes_ccw', text: 'Yes - counterclockwise in Northern, clockwise in Southern' },
                { id: 'yes_cw', text: 'Yes - clockwise in Northern, counterclockwise in Southern' },
                { id: 'no_weak', text: 'No - the Coriolis effect is too weak at such small scales' },
                { id: 'no_equator', text: 'No - it only works right at the equator' }
              ].map(option => (
                <button
                  key={option.id}
                  onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
                  disabled={showTwistFeedback}
                  className={`p-4 rounded-xl text-left transition-all ${
                    showTwistFeedback && option.id === 'no_weak'
                      ? 'bg-green-600 text-white ring-2 ring-green-400'
                      : showTwistFeedback && twistPrediction === option.id
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  {option.text}
                </button>
              ))}
            </div>
            {showTwistFeedback && (
              <div className="bg-slate-800 p-5 rounded-xl max-w-md">
                <p className={`font-bold text-lg mb-2 ${twistPrediction === 'no_weak' ? 'text-green-400' : 'text-purple-400'}`}>
                  {twistPrediction === 'no_weak' ? '✓ Exactly right!' : 'Myth busted!'}
                </p>
                <p className="text-slate-300">
                  The Coriolis effect is <span className="text-red-400 font-bold">far too weak</span> at sink/toilet scales!
                  It only matters for large-scale phenomena (100+ km).
                </p>
                <button
                  onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
                  className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
                >
                  See Why
                </button>
              </div>
            )}
          </div>
        );

      case 5: // Twist Play/Demo
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-4">The Scale Problem</h2>

            <div className="relative w-full max-w-lg h-72 bg-gradient-to-b from-purple-900/30 to-slate-900/50 rounded-xl mb-4 overflow-hidden">
              <svg viewBox="0 0 400 280" className="w-full h-full">
                <rect width="400" height="280" fill="#0f172a" />

                <text x="200" y="25" textAnchor="middle" fontSize="14" fill="white" fontWeight="bold">
                  Coriolis Force vs. Scale
                </text>

                {/* Hurricane (large scale) */}
                <g transform="translate(100, 130)">
                  <text x="0" y="-75" textAnchor="middle" fontSize="12" fill="#38bdf8" fontWeight="bold">Hurricane</text>
                  <text x="0" y="-60" textAnchor="middle" fontSize="10" fill="#64748b">(~500 km)</text>

                  <g>
                    {[0, 1, 2].map(i => (
                      <path
                        key={i}
                        d={`M 0 0 Q ${15 + i * 10} ${-10 - i * 5}, ${30 + i * 8} ${-20 - i * 4}`}
                        stroke="#38bdf8"
                        strokeWidth={3 - i * 0.5}
                        fill="none"
                        transform={`rotate(${i * 90})`}
                      >
                        <animateTransform attributeName="transform" type="rotate" from={`${i * 90}`} to={`${i * 90 - 360}`} dur="3s" repeatCount="indefinite" additive="sum" />
                      </path>
                    ))}
                  </g>
                  <circle cx="0" cy="0" r="10" fill="#0f172a" stroke="#64748b" strokeWidth="2" />

                  <text x="0" y="65" textAnchor="middle" fontSize="12" fill="#22c55e" fontWeight="bold">✓ STRONG</text>
                  <text x="0" y="80" textAnchor="middle" fontSize="10" fill="#64748b">Hours to form</text>
                </g>

                {/* Sink (small scale) */}
                <g transform="translate(300, 130)">
                  <text x="0" y="-75" textAnchor="middle" fontSize="12" fill="#94a3b8" fontWeight="bold">Sink Drain</text>
                  <text x="0" y="-60" textAnchor="middle" fontSize="10" fill="#64748b">(~30 cm)</text>

                  <ellipse cx="0" cy="0" rx="40" ry="25" fill="#334155" stroke="#475569" strokeWidth="2" />
                  <circle cx="0" cy="8" r="10" fill="#1e293b" />

                  <g>
                    <path d="M 0 5 Q 10 0, 6 12 Q 0 18, -6 12 Q -10 0, 0 5" stroke="#60a5fa" strokeWidth="2" fill="none" opacity="0.6">
                      <animateTransform attributeName="transform" type="rotate" values="0;360;720;360;0" dur="4s" repeatCount="indefinite" />
                    </path>
                  </g>

                  <text x="0" y="65" textAnchor="middle" fontSize="12" fill="#ef4444" fontWeight="bold">✗ NEGLIGIBLE</text>
                  <text x="0" y="80" textAnchor="middle" fontSize="10" fill="#64748b">Seconds to drain</text>
                </g>

                {/* Comparison */}
                <g transform="translate(145, 180)">
                  <rect width="110" height="60" fill="#1e293b" rx="6" />
                  <text x="55" y="18" textAnchor="middle" fontSize="11" fill="#94a3b8" fontWeight="bold">What Dominates?</text>
                  <text x="55" y="36" textAnchor="middle" fontSize="9" fill="#64748b">Sink: Basin shape, water motion</text>
                  <text x="55" y="52" textAnchor="middle" fontSize="9" fill="#38bdf8">Hurricane: Coriolis!</text>
                </g>
              </svg>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4 max-w-lg">
              <h4 className="text-amber-400 font-semibold mb-2">🧮 The Math</h4>
              <p className="text-slate-300 text-sm">
                Coriolis acceleration ≈ 2ωv sin(φ)<br />
                For a sink: ~10<sup>-5</sup> m/s² (barely measurable!)<br />
                <span className="text-amber-400">That&apos;s 10 million times weaker than other effects!</span>
              </p>
            </div>

            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
            >
              Learn the Truth
            </button>
          </div>
        );

      case 6: // Twist Review
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-6">Myth Busted!</h2>

            {twistPrediction === 'no_weak' ? (
              <div className="bg-green-500/20 border border-green-500 rounded-xl p-4 mb-6 max-w-lg">
                <p className="text-green-400 font-semibold">✓ You saw through the myth!</p>
              </div>
            ) : (
              <div className="bg-amber-500/20 border border-amber-500 rounded-xl p-4 mb-6 max-w-lg">
                <p className="text-amber-400">The Coriolis effect is FAR too weak at sink scales!</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 max-w-lg mb-6">
              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-red-400 mb-2">❌ The Myth</h3>
                <p className="text-slate-300 text-sm">
                  &quot;Water drains counterclockwise in the Northern Hemisphere and clockwise in the Southern.&quot;
                  This is one of the most persistent physics myths!
                </p>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-green-400 mb-2">✓ The Truth</h3>
                <p className="text-slate-300 text-sm">
                  At sink/toilet scale, Coriolis is about <span className="text-green-400 font-bold">10 million times weaker</span> than other factors like basin shape, residual water motion, and drain design.
                </p>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-sky-400 mb-2">📏 Scale Matters!</h3>
                <p className="text-slate-300 text-sm">
                  Coriolis only dominates for <span className="text-sky-400 font-bold">large-scale (100+ km), long-duration</span> phenomena: hurricanes, ocean currents, global wind patterns - not your bathroom!
                </p>
              </div>
            </div>

            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white font-bold rounded-xl transition-all"
            >
              See Real Applications
            </button>
          </div>
        );

      case 7: // Transfer
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-green-400 mb-6">Real-World Applications</h2>

            <div className="flex gap-2 mb-4 flex-wrap justify-center">
              {transferApps.map((app, index) => (
                <button
                  key={index}
                  onMouseDown={(e) => { e.preventDefault(); setActiveAppTab(index); }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeAppTab === index
                      ? `bg-gradient-to-r ${app.color} text-white`
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {completedApps.has(index) && '✓ '}{app.short}
                </button>
              ))}
            </div>

            <div className={`bg-gradient-to-r ${transferApps[activeAppTab].color} p-1 rounded-xl w-full max-w-2xl`}>
              <div className="bg-slate-900 p-6 rounded-lg">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-20 h-20 flex-shrink-0">
                    {transferApps[activeAppTab].icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{transferApps[activeAppTab].title}</h3>
                    <p className="text-slate-400 text-sm italic">{transferApps[activeAppTab].tagline}</p>
                  </div>
                </div>

                <p className="text-slate-300 mb-4">{transferApps[activeAppTab].description}</p>

                <div className="bg-slate-800/50 p-4 rounded-lg mb-4">
                  <h4 className="text-sky-400 font-bold mb-2">Physics Connection</h4>
                  <p className="text-slate-300 text-sm">{transferApps[activeAppTab].connection}</p>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-lg mb-4">
                  <h4 className="text-cyan-400 font-bold mb-2">How It Works</h4>
                  <p className="text-slate-300 text-sm">{transferApps[activeAppTab].howItWorks}</p>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4">
                  {transferApps[activeAppTab].stats.map((stat, i) => (
                    <div key={i} className="bg-slate-800 p-2 rounded-lg text-center">
                      <div className="text-white font-bold text-lg">{stat.value}</div>
                      <div className="text-slate-400 text-xs">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <div className="mb-4">
                  <h4 className="text-green-400 font-bold mb-2 text-sm">Applications</h4>
                  <div className="flex flex-wrap gap-2">
                    {transferApps[activeAppTab].examples.map((ex, i) => (
                      <span key={i} className="bg-slate-800 px-2 py-1 rounded text-xs text-slate-300">{ex}</span>
                    ))}
                  </div>
                </div>

                {!completedApps.has(activeAppTab) && (
                  <button
                    onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors"
                  >
                    Mark as Understood ✓
                  </button>
                )}
              </div>
            </div>

            <p className="text-slate-400 mt-4">
              Completed: {completedApps.size} / {transferApps.length}
            </p>

            {completedApps.size >= 3 && (
              <button
                onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }}
                className="mt-4 px-8 py-3 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white font-bold rounded-xl transition-all"
              >
                Take the Knowledge Test
              </button>
            )}
          </div>
        );

      case 8: // Test
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-sky-400 mb-6">Knowledge Test</h2>

            <div className="w-full max-w-2xl space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {testQuestions.map((q, qIndex) => (
                <div key={qIndex} className="bg-slate-800 p-4 rounded-xl">
                  <p className="text-slate-400 text-sm mb-2 italic">{q.scenario}</p>
                  <p className="text-slate-200 mb-3 font-medium">{qIndex + 1}. {q.question}</p>
                  <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                    {q.options.map((option, oIndex) => (
                      <button
                        key={oIndex}
                        onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(qIndex, oIndex); }}
                        disabled={showTestResults}
                        className={`p-3 rounded-lg text-sm text-left transition-all ${
                          showTestResults && option.correct
                            ? 'bg-green-600 text-white'
                            : showTestResults && testAnswers[qIndex] === oIndex && !option.correct
                            ? 'bg-red-600 text-white'
                            : testAnswers[qIndex] === oIndex
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                        }`}
                      >
                        {option.text}
                      </button>
                    ))}
                  </div>
                  {showTestResults && (
                    <div className="mt-3 p-3 bg-slate-700/50 rounded-lg">
                      <p className="text-slate-300 text-sm">{q.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!showTestResults && testAnswers.every(a => a !== -1) && (
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowTestResults(true);
                  playSound('complete');
                  onGameEvent?.({ type: 'test_completed', data: { score: calculateTestScore() } });
                }}
                className="mt-6 px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors"
              >
                Submit Answers
              </button>
            )}

            {showTestResults && (
              <div className="mt-6 text-center">
                <p className="text-3xl font-bold text-sky-400 mb-2">
                  Score: {calculateTestScore()} / 10
                </p>
                <p className={`text-lg ${calculateTestScore() >= 7 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {calculateTestScore() >= 9 ? 'Outstanding! You\'ve mastered the Coriolis effect!' :
                   calculateTestScore() >= 7 ? 'Great job! You understand the key concepts!' :
                   'Keep learning! Try reviewing the material again.'}
                </p>
                {calculateTestScore() >= 7 && (
                  <button
                    onMouseDown={(e) => { e.preventDefault(); goToPhase(9); }}
                    className="mt-4 px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold rounded-xl transition-all"
                  >
                    Claim Your Mastery Badge!
                  </button>
                )}
              </div>
            )}
          </div>
        );

      case 9: // Mastery
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
                  <span><span className="text-sky-400 font-mono">F = 2m(ω × v)</span> - the Coriolis force</span>
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
                onMouseDown={(e) => { e.preventDefault(); goToPhase(0); }}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
              >
                Start Over
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
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

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-600/3 rounded-full blur-3xl" />

      {/* Premium progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-medium text-sky-400">Coriolis Effect</span>
          <div className="flex gap-1.5">
            {phaseNames.map((name, i) => (
              <button
                key={i}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(i); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === i
                    ? 'bg-gradient-to-r from-sky-400 to-cyan-400 w-6 shadow-lg shadow-sky-500/50'
                    : phase > i
                    ? 'bg-emerald-500 w-2'
                    : 'bg-slate-600 w-2 hover:bg-slate-500'
                }`}
                title={name}
              />
            ))}
          </div>
          <span className="text-sm text-slate-400 font-medium">{phaseNames[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 pt-16 pb-8">
        {renderPhaseContent()}
      </div>
    </div>
  );
};

export default CoriolisEffectRenderer;
