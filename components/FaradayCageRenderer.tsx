'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ===============================================================================
// TYPES & INTERFACES
// ===============================================================================
interface FaradayCageRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// ===============================================================================
// CONSTANTS
// ===============================================================================
const TEST_QUESTIONS = [
  {
    question: 'Why does a Faraday cage block electromagnetic waves?',
    options: [
      { text: 'It absorbs all the energy as heat', correct: false },
      { text: 'Free electrons move to cancel the field inside', correct: true },
      { text: 'The metal reflects all radiation like a mirror', correct: false },
      { text: 'It converts EM waves to sound', correct: false }
    ]
  },
  {
    question: 'Your phone loses signal in an elevator because:',
    options: [
      { text: 'Elevators are too high up', correct: false },
      { text: 'The metal walls act as a Faraday cage', correct: true },
      { text: 'The motor creates interference', correct: false },
      { text: 'Buildings block GPS', correct: false }
    ]
  },
  {
    question: 'Why does mesh work for shielding even though it has holes?',
    options: [
      { text: 'The holes let heat escape', correct: false },
      { text: 'Mesh is cheaper than solid metal', correct: false },
      { text: 'Holes smaller than the wavelength still block waves', correct: true },
      { text: 'The holes are filled with invisible glass', correct: false }
    ]
  },
  {
    question: 'Microwave ovens have a mesh window. What would happen if the holes were larger?',
    options: [
      { text: 'Food would cook faster', correct: false },
      { text: 'Microwaves could leak out and be dangerous', correct: true },
      { text: 'The oven would be more efficient', correct: false },
      { text: 'You couldn\'t see the food', correct: false }
    ]
  },
  {
    question: 'When charges redistribute on a Faraday cage, where do they accumulate?',
    options: [
      { text: 'Uniformly throughout the metal', correct: false },
      { text: 'Only at the corners', correct: false },
      { text: 'On the outer surface of the conductor', correct: true },
      { text: 'In the center of the metal', correct: false }
    ]
  },
  {
    question: 'Why is a car relatively safe during a lightning strike?',
    options: [
      { text: 'The rubber tires insulate you from the ground', correct: false },
      { text: 'The metal body acts as a Faraday cage, directing current around you', correct: true },
      { text: 'Lightning cannot strike moving objects', correct: false },
      { text: 'The car\'s battery absorbs the electricity', correct: false }
    ]
  },
  {
    question: 'A solid metal box vs a metal mesh cage - which provides better shielding?',
    options: [
      { text: 'Solid metal, because it has no gaps', correct: true },
      { text: 'Mesh, because it allows air to circulate', correct: false },
      { text: 'They are exactly equal in effectiveness', correct: false },
      { text: 'Mesh, because it has more surface area', correct: false }
    ]
  },
  {
    question: 'Why might your cell phone still work inside some buildings with metal frames?',
    options: [
      { text: 'Cell signals are too powerful to block', correct: false },
      { text: 'Windows and gaps act as openings larger than the wavelength', correct: true },
      { text: 'Metal frames amplify signals', correct: false },
      { text: 'Modern phones can penetrate any shielding', correct: false }
    ]
  },
  {
    question: 'What happens to the electric field inside a perfect Faraday cage?',
    options: [
      { text: 'It doubles in strength', correct: false },
      { text: 'It oscillates rapidly', correct: false },
      { text: 'It becomes zero', correct: true },
      { text: 'It reverses direction', correct: false }
    ]
  },
  {
    question: 'RFID-blocking wallets use the Faraday cage principle. What are they protecting against?',
    options: [
      { text: 'Heat damage to cards', correct: false },
      { text: 'Unauthorized wireless scanning of card data', correct: true },
      { text: 'Magnetic stripe erasure', correct: false },
      { text: 'Physical bending of cards', correct: false }
    ]
  }
];

const TRANSFER_APPS = [
  {
    title: 'Microwave Ovens',
    description: 'The mesh door keeps 2.45GHz microwaves inside while letting you see your food. Holes are ~1mm, wavelength is 12cm!',
    icon: '🍿'
  },
  {
    title: 'MRI Rooms',
    description: 'Entire rooms are shielded to keep RF signals from interfering with sensitive imaging. Also protects the outside world.',
    icon: '🏥'
  },
  {
    title: 'EMP Protection',
    description: 'Critical electronics in military and infrastructure use Faraday enclosures to survive electromagnetic pulses.',
    icon: '⚡'
  },
  {
    title: 'RFID Blocking Wallets',
    description: 'Metal-lined wallets block the radio signals used to scan contactless cards, preventing wireless theft.',
    icon: '💳'
  }
];

// ===============================================================================
// MAIN COMPONENT
// ===============================================================================
const FaradayCageRenderer: React.FC<FaradayCageRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer
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

  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(TEST_QUESTIONS.length).fill(null));
  const [showTestResults, setShowTestResults] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Simulation state - Play phase
  const [cageEnabled, setCageEnabled] = useState(false);
  const [fieldStrength, setFieldStrength] = useState(70);
  const [meshDensity, setMeshDensity] = useState(50);
  const [waveFrequency, setWaveFrequency] = useState(50);
  const [signalStrength, setSignalStrength] = useState(100);
  const [hasExperimented, setHasExperimented] = useState(false);

  // Twist play state
  const [cageShape, setCageShape] = useState<'box' | 'sphere' | 'cylinder'>('box');
  const [gapSize, setGapSize] = useState<'none' | 'small' | 'large'>('none');
  const [twistWavelength, setTwistWavelength] = useState(60);
  const [twistMeshSize, setTwistMeshSize] = useState(10);
  const [hasTestedTwist, setHasTestedTwist] = useState(false);

  const lastClickRef = useRef(0);
  const animationRef = useRef<number>();
  const timeRef = useRef(0);

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

  // Animation effect
  useEffect(() => {
    const animate = () => {
      timeRef.current += 0.05;
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  // Update signal based on cage and parameters
  useEffect(() => {
    if (cageEnabled) {
      const meshEffectiveness = meshDensity / 100;
      const blockingFactor = meshEffectiveness * 0.95;
      setSignalStrength(Math.round((1 - blockingFactor) * fieldStrength));
    } else {
      setSignalStrength(fieldStrength);
    }
  }, [cageEnabled, fieldStrength, meshDensity]);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setCageEnabled(false);
      setFieldStrength(70);
      setMeshDensity(50);
      setWaveFrequency(50);
      setHasExperimented(false);
    }
    if (phase === 'twist_play') {
      setCageShape('box');
      setGapSize('none');
      setTwistWavelength(60);
      setTwistMeshSize(10);
      setHasTestedTwist(false);
    }
  }, [phase]);

  const getShieldingEffectiveness = useCallback((meshSizeMm: number, wavelengthMm: number, gap: 'none' | 'small' | 'large'): number => {
    if (gap === 'large') return Math.max(10, 100 - (meshSizeMm / wavelengthMm) * 100);
    if (gap === 'small') return Math.max(40, 100 - (meshSizeMm / wavelengthMm) * 60);
    if (meshSizeMm < wavelengthMm * 0.1) return 99;
    if (meshSizeMm < wavelengthMm * 0.5) return 85;
    if (meshSizeMm < wavelengthMm) return 60;
    return Math.max(10, 100 - (meshSizeMm / wavelengthMm) * 80);
  }, []);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'B' ? 'success' : 'failure');
  }, [playSound]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'C' ? 'success' : 'failure');
  }, [playSound]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
  }, []);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
  }, [playSound]);

  const submitTest = () => {
    let score = 0;
    TEST_QUESTIONS.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setShowTestResults(true);
    if (score >= 7 && onCorrectAnswer) onCorrectAnswer();
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

  // Interactive Faraday Cage visualization with field lines
  const renderInteractiveFaradayCage = () => {
    const numFieldLines = Math.floor(fieldStrength / 10);
    const meshSpacing = Math.max(8, 40 - meshDensity * 0.32);
    const waveSpeed = waveFrequency / 25;
    const chargeOscillation = Math.sin(timeRef.current * 3);

    return (
      <>
        <svg viewBox="0 0 500 320" className="w-full h-64">
          <defs>
            {/* Premium metallic cage frame gradient */}
            <linearGradient id="faraCageFrame" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="25%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#d97706" />
              <stop offset="75%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>

            {/* Brushed metal mesh gradient */}
            <linearGradient id="faraMeshMetal" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6" />
              <stop offset="20%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.6" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="80%" stopColor="#fbbf24" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.8" />
            </linearGradient>

            {/* Electric field wave gradient */}
            <linearGradient id="faraFieldWave" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
              <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#fcd34d" stopOpacity="1" />
              <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.3" />
            </linearGradient>

            {/* Blocked field gradient (red) */}
            <linearGradient id="faraBlockedField" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#f87171" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
            </linearGradient>

            {/* Electron glow (blue) */}
            <radialGradient id="faraElectronGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="1" />
              <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#2563eb" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
            </radialGradient>

            {/* Positive charge glow (red) */}
            <radialGradient id="faraPositiveGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f87171" stopOpacity="1" />
              <stop offset="40%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#dc2626" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
            </radialGradient>

            {/* Protected interior glow */}
            <radialGradient id="faraShieldedGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#22c55e" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
            </radialGradient>

            {/* EM source glow */}
            <radialGradient id="faraSourceGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fca5a5" stopOpacity="1" />
              <stop offset="30%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#dc2626" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
            </radialGradient>

            {/* Background gradient */}
            <linearGradient id="faraBackground" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#020617" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Info panel gradient */}
            <linearGradient id="faraInfoPanel" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Electric field glow filter */}
            <filter id="faraFieldGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Charge particle glow filter */}
            <filter id="faraChargeGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft inner glow for shielded area */}
            <filter id="faraInnerGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Source pulse glow */}
            <filter id="faraSourcePulse" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <marker id="faraArrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="url(#faraFieldWave)" />
            </marker>
          </defs>

          {/* Premium background */}
          <rect width="500" height="320" fill="url(#faraBackground)" />

          {/* Subtle grid pattern */}
          <pattern id="faraGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
          </pattern>
          <rect width="500" height="320" fill="url(#faraGrid)" />

          {/* External field source indicator */}
          <g transform="translate(30, 160)">
            {/* Source housing with metallic look */}
            <rect x="-18" y="-55" width="36" height="110" rx="6" fill="url(#faraInfoPanel)" stroke="#475569" strokeWidth="2" />
            <rect x="-14" y="-51" width="28" height="102" rx="4" fill="#1f2937" />

            {/* Glowing emission point */}
            <circle cx="0" cy="0" r="20" fill="url(#faraSourceGlow)" filter="url(#faraSourcePulse)" opacity={0.5 + fieldStrength / 200}>
              <animate attributeName="r" values="15;22;15" dur={`${2 / waveSpeed}s`} repeatCount="indefinite" />
            </circle>
            <circle cx="0" cy="0" r="8" fill="#ef4444">
              <animate attributeName="opacity" values="0.7;1;0.7" dur={`${1 / waveSpeed}s`} repeatCount="indefinite" />
            </circle>
          </g>

          {/* Electric field lines (external) with premium glow */}
          {[...Array(numFieldLines)].map((_, i) => {
            const yOffset = (i - numFieldLines / 2) * 15;
            const baseY = 160 + yOffset;
            const blocked = cageEnabled;
            const waveOffset = Math.sin(timeRef.current * waveSpeed * 2 + i * 0.5) * 8;

            return (
              <g key={`field-${i}`}>
                {/* Glow layer for field line */}
                <path
                  d={`M 60 ${baseY} Q 100 ${baseY + waveOffset} 140 ${baseY} Q 180 ${baseY - waveOffset} ${blocked ? 220 : 400} ${baseY}`}
                  fill="none"
                  stroke={blocked ? '#ef4444' : '#fbbf24'}
                  strokeWidth="6"
                  strokeDasharray={blocked ? '5,5' : 'none'}
                  opacity={blocked ? 0.1 : 0.2}
                  filter="url(#faraFieldGlow)"
                />
                {/* Main field line */}
                <path
                  d={`M 60 ${baseY} Q 100 ${baseY + waveOffset} 140 ${baseY} Q 180 ${baseY - waveOffset} ${blocked ? 220 : 400} ${baseY}`}
                  fill="none"
                  stroke={blocked ? 'url(#faraBlockedField)' : 'url(#faraFieldWave)'}
                  strokeWidth="2.5"
                  strokeDasharray={blocked ? '5,5' : 'none'}
                  opacity={blocked ? 0.5 : 0.9}
                  markerEnd={blocked ? '' : 'url(#faraArrowhead)'}
                />
                {/* Blocked indicator with glow */}
                {blocked && (
                  <g>
                    <circle cx="220" cy={baseY} r="8" fill="url(#faraPositiveGlow)" opacity="0.3" />
                    <circle cx="220" cy={baseY} r="4" fill="#ef4444" opacity="0.8">
                      <animate attributeName="opacity" values="0.4;0.9;0.4" dur="0.5s" repeatCount="indefinite" />
                    </circle>
                  </g>
                )}
              </g>
            );
          })}

          {/* Faraday cage structure with premium metallic look */}
          {cageEnabled && (
            <g>
              {/* Protected interior glow */}
              <ellipse cx="300" cy="160" rx="70" ry="70" fill="url(#faraShieldedGlow)" filter="url(#faraInnerGlow)" />

              {/* Cage frame with metallic gradient */}
              <rect x="220" y="80" width="160" height="160" rx="8" fill="none" stroke="url(#faraCageFrame)" strokeWidth="8" />
              <rect x="224" y="84" width="152" height="152" rx="6" fill="none" stroke="#fcd34d" strokeWidth="1" strokeOpacity="0.3" />

              {/* Premium mesh lines - vertical with metallic sheen */}
              {[...Array(Math.ceil(160 / meshSpacing))].map((_, i) => (
                <line
                  key={`v${i}`}
                  x1={228 + i * meshSpacing}
                  y1="80"
                  x2={228 + i * meshSpacing}
                  y2="240"
                  stroke="url(#faraMeshMetal)"
                  strokeWidth="2"
                />
              ))}

              {/* Premium mesh lines - horizontal with metallic sheen */}
              {[...Array(Math.ceil(160 / meshSpacing))].map((_, i) => (
                <line
                  key={`h${i}`}
                  x1="220"
                  y1={88 + i * meshSpacing}
                  x2="380"
                  y2={88 + i * meshSpacing}
                  stroke="url(#faraMeshMetal)"
                  strokeWidth="2"
                />
              ))}

              {/* Charge redistribution visualization - electrons with premium glow */}
              {[...Array(6)].map((_, i) => {
                const baseX = 223;
                const baseY = 100 + i * 25;
                const offset = chargeOscillation * 4;
                return (
                  <g key={`charge-left-${i}`}>
                    <circle
                      cx={baseX + offset}
                      cy={baseY}
                      r="10"
                      fill="url(#faraElectronGlow)"
                      filter="url(#faraChargeGlow)"
                    />
                    <circle
                      cx={baseX + offset}
                      cy={baseY}
                      r="5"
                      fill="#3b82f6"
                    />
                  </g>
                );
              })}
              {[...Array(6)].map((_, i) => {
                const baseX = 377;
                const baseY = 100 + i * 25;
                const offset = -chargeOscillation * 4;
                return (
                  <g key={`charge-right-${i}`}>
                    <circle
                      cx={baseX + offset}
                      cy={baseY}
                      r="10"
                      fill="url(#faraPositiveGlow)"
                      filter="url(#faraChargeGlow)"
                    />
                    <circle
                      cx={baseX + offset}
                      cy={baseY}
                      r="5"
                      fill="#ef4444"
                    />
                  </g>
                );
              })}

              {/* Zero field indicator inside with premium styling */}
              <g transform="translate(300, 160)">
                <circle cx="0" cy="0" r="35" fill="url(#faraShieldedGlow)" />
                <circle cx="0" cy="0" r="30" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="4,2" strokeOpacity="0.8" />
              </g>
            </g>
          )}

          {/* Phone inside cage area with premium styling */}
          <g transform="translate(280, 130)">
            <rect x="0" y="0" width="40" height="65" rx="6" fill="url(#faraInfoPanel)" stroke="#6b7280" strokeWidth="2" />
            <rect x="5" y="8" width="30" height="40" fill="#0f172a" rx="2" />
            {/* Signal bars */}
            <g transform="translate(10, 15)">
              {[...Array(4)].map((_, i) => {
                const barHeight = 5 + i * 4;
                const barStrength = (i + 1) * 25;
                const visible = signalStrength >= barStrength;
                return (
                  <rect
                    key={i}
                    x={i * 6}
                    y={20 - barHeight}
                    width="4"
                    height={barHeight}
                    fill={visible ? '#22c55e' : '#4b5563'}
                    rx="1"
                    opacity={visible ? 1 : 0.4}
                  />
                );
              })}
            </g>
          </g>

          {/* Premium info panels */}
          <g>
            {/* Field strength outside */}
            <rect x="10" y="260" width="120" height="50" rx="10" fill="url(#faraInfoPanel)" stroke="#374151" strokeWidth="1" />
            <rect x="12" y="262" width="116" height="46" rx="8" fill="none" stroke="#475569" strokeWidth="0.5" strokeOpacity="0.5" />
          </g>

          <g>
            {/* Field strength inside */}
            <rect x="370" y="260" width="120" height="50" rx="10" fill="url(#faraInfoPanel)" stroke="#374151" strokeWidth="1" />
            <rect x="372" y="262" width="116" height="46" rx="8" fill="none" stroke="#475569" strokeWidth="0.5" strokeOpacity="0.5" />
          </g>

          {/* Shielding effectiveness panel */}
          {cageEnabled && (
            <g>
              <rect x="190" y="260" width="120" height="50" rx="10" fill="#052e16" stroke="#22c55e" strokeWidth="1" />
              <rect x="192" y="262" width="116" height="46" rx="8" fill="none" stroke="#4ade80" strokeWidth="0.5" strokeOpacity="0.3" />
            </g>
          )}
        </svg>

        {/* Text labels outside SVG using typo system */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', marginTop: '-60px', position: 'relative', zIndex: 10 }}>
          <div style={{ textAlign: 'center', width: '120px' }}>
            <p style={{ fontSize: typo.small, color: '#94a3b8', margin: 0 }}>External Field</p>
            <p style={{ fontSize: typo.bodyLarge, color: '#f59e0b', fontWeight: 'bold', margin: 0 }}>{fieldStrength}%</p>
          </div>
          {cageEnabled && (
            <div style={{ textAlign: 'center', width: '120px' }}>
              <p style={{ fontSize: typo.small, color: '#4ade80', margin: 0 }}>Shielding</p>
              <p style={{ fontSize: typo.bodyLarge, color: '#86efac', fontWeight: 'bold', margin: 0 }}>
                {Math.round((1 - signalStrength / fieldStrength) * 100)}%
              </p>
            </div>
          )}
          <div style={{ textAlign: 'center', width: '120px' }}>
            <p style={{ fontSize: typo.small, color: '#94a3b8', margin: 0 }}>Inside Field</p>
            <p style={{ fontSize: typo.bodyLarge, color: cageEnabled ? '#4ade80' : '#f59e0b', fontWeight: 'bold', margin: 0 }}>
              {cageEnabled ? `${signalStrength}%` : `${fieldStrength}%`}
            </p>
          </div>
        </div>

        {/* Phone signal status label */}
        <div style={{
          position: 'absolute',
          top: '195px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center'
        }}>
          <p style={{
            fontSize: typo.small,
            color: signalStrength > 30 ? '#4ade80' : '#ef4444',
            fontWeight: 'bold',
            margin: 0
          }}>
            {signalStrength > 30 ? 'SIGNAL OK' : 'NO SIGNAL'}
          </p>
        </div>

        {/* E = 0 indicator when shielded */}
        {cageEnabled && (
          <div style={{
            position: 'absolute',
            top: '145px',
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: typo.body, color: '#4ade80', fontWeight: 'bold', margin: 0 }}>E = 0</p>
            <p style={{ fontSize: typo.label, color: '#86efac', margin: 0 }}>SHIELDED</p>
          </div>
        )}
      </>
    );
  };

  // Twist play visualization - different cage shapes with gaps
  const renderTwistVisualization = () => {
    const effectiveness = getShieldingEffectiveness(twistMeshSize, twistWavelength, gapSize);
    const penetrates = effectiveness < 50;
    const waveY = Math.sin(timeRef.current * 2) * 10;

    const renderCageShape = () => {
      switch (cageShape) {
        case 'sphere':
          return (
            <g>
              {/* Sphere with metallic gradient */}
              <ellipse cx="280" cy="160" rx="80" ry="80" fill="none" stroke="url(#faraTwistCageFrame)" strokeWidth="5" />
              {/* Interior glow */}
              <ellipse cx="280" cy="160" rx="70" ry="70" fill="url(#faraTwistInterior)" />
              {/* Mesh pattern for sphere */}
              {[...Array(8)].map((_, i) => (
                <ellipse
                  key={`h${i}`}
                  cx="280"
                  cy="160"
                  rx={80 - i * 2}
                  ry={Math.max(5, 80 - i * 20)}
                  fill="none"
                  stroke="url(#faraTwistMesh)"
                  strokeWidth="1.5"
                />
              ))}
              {[...Array(12)].map((_, i) => {
                const angle = (i / 12) * Math.PI;
                return (
                  <line
                    key={`v${i}`}
                    x1={280 + Math.cos(angle) * 80}
                    y1={80}
                    x2={280 + Math.cos(angle) * 80}
                    y2={240}
                    stroke="url(#faraTwistMesh)"
                    strokeWidth="1.5"
                  />
                );
              })}
              {/* Gap visualization with glow */}
              {gapSize !== 'none' && (
                <g>
                  <rect
                    x="260"
                    y={gapSize === 'large' ? 120 : 140}
                    width="40"
                    height={gapSize === 'large' ? 80 : 40}
                    fill="url(#faraTwistBackground)"
                    stroke="url(#faraTwistGapGlow)"
                    strokeWidth="3"
                    strokeDasharray="4,2"
                    filter="url(#faraTwistGapFilter)"
                  />
                </g>
              )}
            </g>
          );
        case 'cylinder':
          return (
            <g>
              {/* Interior glow */}
              <ellipse cx="280" cy="160" rx="60" ry="65" fill="url(#faraTwistInterior)" />
              {/* Cylinder with metallic look */}
              <ellipse cx="280" cy="90" rx="70" ry="20" fill="none" stroke="url(#faraTwistCageFrame)" strokeWidth="4" />
              <ellipse cx="280" cy="230" rx="70" ry="20" fill="none" stroke="url(#faraTwistCageFrame)" strokeWidth="4" />
              <line x1="210" y1="90" x2="210" y2="230" stroke="url(#faraTwistCageFrame)" strokeWidth="4" />
              <line x1="350" y1="90" x2="350" y2="230" stroke="url(#faraTwistCageFrame)" strokeWidth="4" />
              {/* Mesh lines */}
              {[...Array(6)].map((_, i) => (
                <ellipse
                  key={`ring${i}`}
                  cx="280"
                  cy={110 + i * 22}
                  rx="70"
                  ry="8"
                  fill="none"
                  stroke="url(#faraTwistMesh)"
                  strokeWidth="1.5"
                />
              ))}
              {[...Array(8)].map((_, i) => {
                const angle = (i / 8) * Math.PI * 2;
                const x = 280 + Math.cos(angle) * 70;
                return (
                  <line
                    key={`vert${i}`}
                    x1={x}
                    y1="90"
                    x2={x}
                    y2="230"
                    stroke="url(#faraTwistMesh)"
                    strokeWidth="1.5"
                  />
                );
              })}
              {/* Gap */}
              {gapSize !== 'none' && (
                <rect
                  x="260"
                  y={gapSize === 'large' ? 130 : 150}
                  width="40"
                  height={gapSize === 'large' ? 60 : 30}
                  fill="url(#faraTwistBackground)"
                  stroke="url(#faraTwistGapGlow)"
                  strokeWidth="3"
                  strokeDasharray="4,2"
                  filter="url(#faraTwistGapFilter)"
                />
              )}
            </g>
          );
        default: // box
          return (
            <g>
              {/* Interior glow */}
              <rect x="230" y="100" width="100" height="120" rx="4" fill="url(#faraTwistInterior)" />
              {/* Box frame with metallic gradient */}
              <rect x="220" y="90" width="120" height="140" rx="6" fill="none" stroke="url(#faraTwistCageFrame)" strokeWidth="5" />
              <rect x="224" y="94" width="112" height="132" rx="4" fill="none" stroke="#fcd34d" strokeWidth="0.5" strokeOpacity="0.3" />
              {/* Mesh */}
              {[...Array(Math.ceil(120 / (twistMeshSize + 5)))].map((_, i) => (
                <line
                  key={`v${i}`}
                  x1={228 + i * (twistMeshSize + 5)}
                  y1="90"
                  x2={228 + i * (twistMeshSize + 5)}
                  y2="230"
                  stroke="url(#faraTwistMesh)"
                  strokeWidth="1.5"
                />
              ))}
              {[...Array(Math.ceil(140 / (twistMeshSize + 5)))].map((_, i) => (
                <line
                  key={`h${i}`}
                  x1="220"
                  y1={98 + i * (twistMeshSize + 5)}
                  x2="340"
                  y2={98 + i * (twistMeshSize + 5)}
                  stroke="url(#faraTwistMesh)"
                  strokeWidth="1.5"
                />
              ))}
              {/* Gap with glow */}
              {gapSize !== 'none' && (
                <rect
                  x="265"
                  y={gapSize === 'large' ? 130 : 150}
                  width="30"
                  height={gapSize === 'large' ? 60 : 30}
                  fill="url(#faraTwistBackground)"
                  stroke="url(#faraTwistGapGlow)"
                  strokeWidth="3"
                  strokeDasharray="4,2"
                  filter="url(#faraTwistGapFilter)"
                />
              )}
            </g>
          );
      }
    };

    return (
      <>
        <svg viewBox="0 0 500 320" className="w-full h-64">
          <defs>
            {/* Premium background gradient */}
            <linearGradient id="faraTwistBackground" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#020617" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Metallic cage frame gradient */}
            <linearGradient id="faraTwistCageFrame" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="25%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#d97706" />
              <stop offset="75%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>

            {/* Brushed metal mesh gradient */}
            <linearGradient id="faraTwistMesh" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
              <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#fcd34d" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.5" />
            </linearGradient>

            {/* Wave gradient (blue) */}
            <linearGradient id="faraTwistWave" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
              <stop offset="30%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#93c5fd" stopOpacity="1" />
              <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.3" />
            </linearGradient>

            {/* Leak wave gradient (red) */}
            <linearGradient id="faraTwistLeak" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#f87171" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.3" />
            </linearGradient>

            {/* Gap glow gradient */}
            <linearGradient id="faraTwistGapGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#f87171" stopOpacity="1" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.5" />
            </linearGradient>

            {/* Protected interior glow */}
            <radialGradient id="faraTwistInterior" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={penetrates ? '#ef4444' : '#4ade80'} stopOpacity="0.15" />
              <stop offset="70%" stopColor={penetrates ? '#dc2626' : '#22c55e'} stopOpacity="0.05" />
              <stop offset="100%" stopColor={penetrates ? '#b91c1c' : '#16a34a'} stopOpacity="0" />
            </radialGradient>

            {/* Safe indicator glow */}
            <radialGradient id="faraTwistSafeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#22c55e" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
            </radialGradient>

            {/* Info panel gradient */}
            <linearGradient id="faraTwistInfoPanel" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Wave glow filter */}
            <filter id="faraTwistWaveGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Gap warning filter */}
            <filter id="faraTwistGapFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Inner glow for safe area */}
            <filter id="faraTwistInnerGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Premium background */}
          <rect width="500" height="320" fill="url(#faraTwistBackground)" />

          {/* Subtle grid pattern */}
          <pattern id="faraTwistGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
          </pattern>
          <rect width="500" height="320" fill="url(#faraTwistGrid)" />

          {/* Incoming waves with premium glow */}
          {[...Array(4)].map((_, i) => {
            const x = 40 + i * 40;
            const waveHeight = twistWavelength * 0.8;
            return (
              <g key={i}>
                {/* Glow layer */}
                <path
                  d={`M ${x} ${160 - waveHeight / 2 + waveY}
                      C ${x + 20} ${160 - waveHeight / 2 + waveY},
                        ${x + 20} ${160 + waveHeight / 2 + waveY},
                        ${x + 40} ${160 + waveHeight / 2 + waveY}
                      C ${x + 60} ${160 + waveHeight / 2 + waveY},
                        ${x + 60} ${160 - waveHeight / 2 + waveY},
                        ${x + 80} ${160 - waveHeight / 2 + waveY}`}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="8"
                  opacity={0.15 - i * 0.03}
                  filter="url(#faraTwistWaveGlow)"
                />
                {/* Main wave */}
                <path
                  d={`M ${x} ${160 - waveHeight / 2 + waveY}
                      C ${x + 20} ${160 - waveHeight / 2 + waveY},
                        ${x + 20} ${160 + waveHeight / 2 + waveY},
                        ${x + 40} ${160 + waveHeight / 2 + waveY}
                      C ${x + 60} ${160 + waveHeight / 2 + waveY},
                        ${x + 60} ${160 - waveHeight / 2 + waveY},
                        ${x + 80} ${160 - waveHeight / 2 + waveY}`}
                  fill="none"
                  stroke="url(#faraTwistWave)"
                  strokeWidth="3"
                  opacity={1 - i * 0.15}
                />
              </g>
            );
          })}

          {/* Cage shape */}
          {renderCageShape()}

          {/* Penetrating waves with glow (if effectiveness is low) */}
          {penetrates && (
            <g>
              {/* Glow layer */}
              <path
                d={`M 360 ${155 + waveY} Q 400 ${155 + waveY} 440 ${165 + waveY}`}
                fill="none"
                stroke="#ef4444"
                strokeWidth="8"
                opacity="0.3"
                filter="url(#faraTwistWaveGlow)"
              />
              {/* Main leak wave */}
              <path
                d={`M 360 ${155 + waveY} Q 400 ${155 + waveY} 440 ${165 + waveY}`}
                fill="none"
                stroke="url(#faraTwistLeak)"
                strokeWidth="3"
                opacity="0.9"
              >
                <animate attributeName="opacity" values="0.6;1;0.6" dur="0.5s" repeatCount="indefinite" />
              </path>
            </g>
          )}

          {/* Shielded indicator with glow */}
          {!penetrates && (
            <g transform="translate(280, 160)">
              <circle cx="0" cy="0" r="30" fill="url(#faraTwistSafeGlow)" filter="url(#faraTwistInnerGlow)" />
              <circle cx="0" cy="0" r="25" fill="none" stroke="#22c55e" strokeWidth="2" strokeOpacity="0.6" />
            </g>
          )}

          {/* Premium effectiveness panel */}
          <g>
            <rect x="350" y="70" width="140" height="70" rx="10" fill="url(#faraTwistInfoPanel)" stroke="#374151" strokeWidth="1" />
            <rect x="352" y="72" width="136" height="66" rx="8" fill="none" stroke="#475569" strokeWidth="0.5" strokeOpacity="0.3" />
          </g>

          {/* Premium rule indicator */}
          <g>
            <rect x="10" y="70" width="140" height="50" rx="10" fill={twistMeshSize < twistWavelength ? '#052e16' : '#450a0a'} stroke={twistMeshSize < twistWavelength ? '#22c55e' : '#ef4444'} strokeWidth="1" />
            <rect x="12" y="72" width="136" height="46" rx="8" fill="none" stroke={twistMeshSize < twistWavelength ? '#4ade80' : '#f87171'} strokeWidth="0.5" strokeOpacity="0.3" />
          </g>
        </svg>

        {/* Text labels outside SVG using typo system */}
        <div style={{ marginTop: '-80px', position: 'relative', zIndex: 10, padding: '0 16px' }}>
          {/* Rule indicator text */}
          <div style={{
            position: 'absolute',
            top: '-180px',
            left: '16px',
            width: '140px',
            textAlign: 'center'
          }}>
            <p style={{
              fontSize: typo.small,
              color: twistMeshSize < twistWavelength ? '#4ade80' : '#f87171',
              margin: 0
            }}>
              mesh {twistMeshSize < twistWavelength ? '<' : '>'} wavelength
            </p>
            <p style={{
              fontSize: typo.body,
              color: twistMeshSize < twistWavelength ? '#86efac' : '#fca5a5',
              fontWeight: 'bold',
              margin: 0
            }}>
              {twistMeshSize < twistWavelength ? 'BLOCKS' : 'LEAKS'}
            </p>
          </div>

          {/* Effectiveness panel text */}
          <div style={{
            position: 'absolute',
            top: '-180px',
            right: '16px',
            width: '140px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: typo.small, color: '#94a3b8', margin: 0 }}>Shielding Effectiveness</p>
            <p style={{
              fontSize: typo.heading,
              color: effectiveness > 80 ? '#4ade80' : effectiveness > 40 ? '#fbbf24' : '#f87171',
              fontWeight: 'bold',
              margin: 0
            }}>
              {effectiveness}%
            </p>
          </div>

          {/* Safe/Leak indicator */}
          {!penetrates ? (
            <div style={{
              position: 'absolute',
              top: '-110px',
              left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: typo.bodyLarge, color: '#4ade80', fontWeight: 'bold', margin: 0 }}>SAFE</p>
            </div>
          ) : (
            <div style={{
              position: 'absolute',
              top: '-115px',
              right: '40px',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: typo.body, color: '#f87171', fontWeight: 'bold', margin: 0 }}>LEAK!</p>
            </div>
          )}

          {/* Wavelength indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: `${twistWavelength}px`,
                height: '2px',
                background: '#3b82f6',
                marginBottom: '4px',
                position: 'relative'
              }}>
                <div style={{ position: 'absolute', left: 0, top: '-4px', width: '2px', height: '10px', background: '#3b82f6' }} />
                <div style={{ position: 'absolute', right: 0, top: '-4px', width: '2px', height: '10px', background: '#3b82f6' }} />
              </div>
              <p style={{ fontSize: typo.small, color: '#60a5fa', margin: 0 }}>wavelength = {twistWavelength}mm</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: `${twistMeshSize}px`,
                height: `${twistMeshSize}px`,
                border: '2px solid #f59e0b',
                marginBottom: '4px'
              }} />
              <p style={{ fontSize: typo.small, color: '#fbbf24', margin: 0 }}>mesh = {twistMeshSize}mm</p>
            </div>
          </div>
        </div>
      </>
    );
  };

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
  };

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: `1px solid rgba(255,255,255,0.1)`,
      display: 'flex',
      justifyContent: 'flex-end',
      zIndex: 1000,
    }}>
      <button
        onClick={onPhaseComplete}
        disabled={disabled && !canProceed}
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
          zIndex: 10,
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-8">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-amber-400 tracking-wide">PHYSICS EXPLORATION</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-amber-100 to-yellow-200 bg-clip-text text-transparent">
              The Invisible Shield
            </h1>
            <p className="text-lg text-slate-400 max-w-md mb-10">
              Why does your phone lose signal in elevators?
            </p>
            <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-yellow-500/5 rounded-3xl" />
              <div className="relative">
                <div className="text-6xl mb-6">📱🛡️</div>
                <div className="mt-4 space-y-4">
                  <p className="text-xl text-white/90 font-medium leading-relaxed">
                    Step into a metal elevator, and your phone signal vanishes.
                  </p>
                  <p className="text-lg text-slate-400 leading-relaxed">
                    Step out, and it returns. The metal box acts like a magical shield against radio waves!
                  </p>
                  <div className="pt-2">
                    <p className="text-base text-amber-400 font-semibold">
                      This is called a &quot;Faraday cage&quot;!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
            <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
              <p className="text-lg text-slate-300 mb-4">
                Why does a metal enclosure block electromagnetic waves?
              </p>
            </div>
            <div className="grid gap-3 w-full max-w-xl">
              {[
                { id: 'A', text: 'Metal absorbs all the wave energy as heat' },
                { id: 'B', text: 'Free electrons in metal move to cancel the field inside' },
                { id: 'C', text: 'Metal is simply too dense for waves to pass through' },
                { id: 'D', text: 'The waves bounce back like light off a mirror' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => handlePrediction(option.id)}
                  disabled={showPredictionFeedback}
                  style={{ zIndex: 10 }}
                  className={`p-4 rounded-xl text-left transition-all duration-300 ${
                    showPredictionFeedback && selectedPrediction === option.id
                      ? option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                      : showPredictionFeedback && option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400'
                      : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
                  }`}
                >
                  <span className="font-bold text-white">{option.id}.</span>
                  <span className="text-slate-200 ml-2">{option.text}</span>
                </button>
              ))}
            </div>
            {showPredictionFeedback && (
              <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
                <p className="text-emerald-400 font-semibold">
                  Correct! Free electrons redistribute to cancel the incoming electromagnetic field!
                </p>
              </div>
            )}
          </div>
        </div>
        {renderBottomBar(true, !!selectedPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE - Enhanced with interactive controls
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center p-4">
            <h2 className="text-2xl font-bold text-white mb-4">Faraday Cage Simulator</h2>

            {/* Visualization */}
            <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-2xl">
              {renderInteractiveFaradayCage()}
            </div>

            {/* Control Panel */}
            <div className="bg-slate-800/50 rounded-2xl p-6 w-full max-w-2xl">
              <h3 className="text-lg font-bold text-amber-400 mb-4">Control Panel</h3>

              {/* Cage Toggle */}
              <div className="mb-6">
                <button
                  onClick={() => { setCageEnabled(!cageEnabled); setHasExperimented(true); playSound('click'); }}
                  style={{ zIndex: 10 }}
                  className={`w-full px-6 py-4 rounded-xl font-bold text-lg transition-all ${
                    cageEnabled
                      ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                      : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                  }`}
                >
                  {cageEnabled ? '🛡️ Cage ENABLED' : '📡 Cage DISABLED'}
                </button>
              </div>

              {/* Sliders */}
              <div className="space-y-6">
                {/* External Field Strength */}
                <div>
                  <label className="block text-sm font-bold text-amber-400 mb-2 uppercase tracking-wide">
                    External Field Strength
                  </label>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={fieldStrength}
                    onChange={(e) => { setFieldStrength(parseInt(e.target.value)); setHasExperimented(true); }}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Weak</span>
                    <span className="text-amber-400 font-bold">{fieldStrength}%</span>
                    <span>Strong</span>
                  </div>
                </div>

                {/* Mesh Density */}
                <div>
                  <label className="block text-sm font-bold text-blue-400 mb-2 uppercase tracking-wide">
                    Cage Mesh Density
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={meshDensity}
                    onChange={(e) => { setMeshDensity(parseInt(e.target.value)); setHasExperimented(true); }}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Sparse</span>
                    <span className="text-blue-400 font-bold">{meshDensity}%</span>
                    <span>Dense</span>
                  </div>
                </div>

                {/* Wave Frequency */}
                <div>
                  <label className="block text-sm font-bold text-purple-400 mb-2 uppercase tracking-wide">
                    EM Wave Frequency
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={waveFrequency}
                    onChange={(e) => { setWaveFrequency(parseInt(e.target.value)); setHasExperimented(true); }}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Low (Radio)</span>
                    <span className="text-purple-400 font-bold">{waveFrequency} MHz</span>
                    <span>High (Microwave)</span>
                  </div>
                </div>
              </div>

              {/* Results Panel */}
              <div className={`mt-6 p-4 rounded-xl border ${cageEnabled ? 'bg-green-900/20 border-green-600' : 'bg-slate-700/50 border-slate-600'}`}>
                <p className="text-slate-300 text-center">
                  {cageEnabled ? (
                    <>
                      <span className="text-green-400 font-bold">Shielded! </span>
                      Free electrons on the cage surface redistribute to create an opposing field,
                      canceling the external field inside. Signal reduced to {signalStrength}%.
                    </>
                  ) : (
                    <>
                      <span className="text-amber-400 font-bold">No Protection. </span>
                      EM waves pass freely through. The phone receives full signal strength.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(false, hasExperimented, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-white mb-6">The Shielding Principle</h2>
            <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl space-y-4">
              <div className="p-4 bg-amber-900/30 rounded-lg border border-amber-600">
                <h3 className="text-amber-400 font-bold mb-2">How It Works</h3>
                <p className="text-slate-300">
                  When an EM wave hits a conductor, it pushes free electrons around.
                  These electrons <span className="text-cyan-400 font-bold">redistribute instantly</span> to
                  create an opposing field that cancels the original wave inside!
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <h4 className="text-blue-400 font-bold mb-2">External Wave</h4>
                  <ul className="text-slate-300 text-sm space-y-1">
                    <li>Oscillating E and B fields</li>
                    <li>Pushes electrons in metal</li>
                    <li>Creates surface currents</li>
                  </ul>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <h4 className="text-green-400 font-bold mb-2">Inside</h4>
                  <ul className="text-slate-300 text-sm space-y-1">
                    <li>Surface currents make opposing field</li>
                    <li>Fields cancel out perfectly</li>
                    <li>Net field = zero!</li>
                  </ul>
                </div>
              </div>
              <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-600">
                <p className="text-purple-300">
                  <strong>Key Insight:</strong> The cage doesn&apos;t need to be solid!
                  As long as holes are smaller than the wavelength, it still works.
                </p>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
            <h2 className="text-2xl font-bold text-amber-400 mb-6">The Mesh Question</h2>
            <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
              <p className="text-lg text-slate-300 mb-4">
                A Faraday cage with large holes is exposed to waves with a wavelength
                SHORTER than the hole size. What happens?
              </p>
            </div>
            <div className="grid gap-3 w-full max-w-xl">
              {[
                { id: 'A', text: 'Still blocks everything - holes don\'t matter' },
                { id: 'B', text: 'Blocks half the wave' },
                { id: 'C', text: 'Waves leak through - holes are too big!' },
                { id: 'D', text: 'Converts the wave to a different frequency' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => handleTwistPrediction(option.id)}
                  disabled={showTwistFeedback}
                  style={{ zIndex: 10 }}
                  className={`p-4 rounded-xl text-left transition-all duration-300 ${
                    showTwistFeedback && twistPrediction === option.id
                      ? option.id === 'C' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                      : showTwistFeedback && option.id === 'C' ? 'bg-emerald-600/40 border-2 border-emerald-400'
                      : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
                  }`}
                >
                  <span className="font-bold text-white">{option.id}.</span>
                  <span className="text-slate-200 ml-2">{option.text}</span>
                </button>
              ))}
            </div>
            {showTwistFeedback && (
              <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
                <p className="text-emerald-400 font-semibold">
                  Correct! When holes are larger than the wavelength, waves can leak through!
                </p>
              </div>
            )}
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE - Enhanced with shape selector and gap controls
  if (phase === 'twist_play') {
    const effectiveness = getShieldingEffectiveness(twistMeshSize, twistWavelength, gapSize);

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center p-4">
            <h2 className="text-2xl font-bold text-amber-400 mb-4">Mesh Size vs Wavelength</h2>

            {/* Visualization */}
            <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-2xl">
              {renderTwistVisualization()}
            </div>

            {/* Control Panel */}
            <div className="bg-slate-800/50 rounded-2xl p-6 w-full max-w-2xl">

              {/* Cage Shape Selector */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-amber-400 mb-3 uppercase tracking-wide">
                  Cage Shape
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'box' as const, label: 'Cube', icon: '🔲' },
                    { id: 'sphere' as const, label: 'Sphere', icon: '🔵' },
                    { id: 'cylinder' as const, label: 'Cylinder', icon: '🛢️' }
                  ].map(shape => (
                    <button
                      key={shape.id}
                      onClick={() => { setCageShape(shape.id); setHasTestedTwist(true); playSound('click'); }}
                      style={{ zIndex: 10 }}
                      className={`p-3 rounded-xl font-bold transition-all ${
                        cageShape === shape.id
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <div className="text-2xl mb-1">{shape.icon}</div>
                      <div className="text-sm">{shape.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Gap/Hole Size Selector */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-red-400 mb-3 uppercase tracking-wide">
                  Gap in Shielding
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'none' as const, label: 'No Gap', desc: 'Perfect seal' },
                    { id: 'small' as const, label: 'Small Gap', desc: '< wavelength' },
                    { id: 'large' as const, label: 'Large Gap', desc: '> wavelength' }
                  ].map(gap => (
                    <button
                      key={gap.id}
                      onClick={() => { setGapSize(gap.id); setHasTestedTwist(true); playSound('click'); }}
                      style={{ zIndex: 10 }}
                      className={`p-3 rounded-xl font-bold transition-all ${
                        gapSize === gap.id
                          ? gap.id === 'none' ? 'bg-green-600 text-white' : gap.id === 'small' ? 'bg-yellow-600 text-white' : 'bg-red-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <div className="text-sm font-bold">{gap.label}</div>
                      <div className="text-xs opacity-70">{gap.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-6">
                {/* Wavelength Slider */}
                <div>
                  <label className="block text-sm font-bold text-blue-400 mb-2 uppercase tracking-wide">
                    EM Wavelength
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={twistWavelength}
                    onChange={(e) => { setTwistWavelength(parseInt(e.target.value)); setHasTestedTwist(true); }}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>10mm (Short)</span>
                    <span className="text-blue-400 font-bold">{twistWavelength}mm</span>
                    <span>100mm (Long)</span>
                  </div>
                </div>

                {/* Mesh Size Slider */}
                <div>
                  <label className="block text-sm font-bold text-amber-400 mb-2 uppercase tracking-wide">
                    Mesh Hole Size
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="80"
                    value={twistMeshSize}
                    onChange={(e) => { setTwistMeshSize(parseInt(e.target.value)); setHasTestedTwist(true); }}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>5mm (Fine)</span>
                    <span className="text-amber-400 font-bold">{twistMeshSize}mm</span>
                    <span>80mm (Coarse)</span>
                  </div>
                </div>
              </div>

              {/* Results Panel */}
              <div className={`mt-6 p-4 rounded-xl border ${
                effectiveness > 80 ? 'bg-green-900/20 border-green-600' :
                effectiveness > 40 ? 'bg-yellow-900/20 border-yellow-600' :
                'bg-red-900/20 border-red-600'
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300 font-medium">Shielding Effectiveness:</span>
                  <span className={`text-2xl font-bold ${
                    effectiveness > 80 ? 'text-green-400' :
                    effectiveness > 40 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>{effectiveness}%</span>
                </div>
                <p className="text-slate-400 text-sm">
                  {twistMeshSize < twistWavelength ? (
                    <>Mesh holes ({twistMeshSize}mm) are <span className="text-green-400 font-bold">smaller</span> than wavelength ({twistWavelength}mm). Waves are blocked!</>
                  ) : (
                    <>Mesh holes ({twistMeshSize}mm) are <span className="text-red-400 font-bold">larger</span> than wavelength ({twistWavelength}mm). Waves leak through!</>
                  )}
                  {gapSize !== 'none' && (
                    <span className="text-red-400"> The {gapSize} gap further reduces shielding.</span>
                  )}
                </p>
              </div>

              {/* Key Rule */}
              <div className="mt-4 p-4 bg-purple-900/30 rounded-xl border border-purple-600">
                <p className="text-purple-300 text-center">
                  <span className="font-bold">Golden Rule:</span> Mesh opening must be much smaller than the wavelength for effective shielding!
                </p>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(false, hasTestedTwist, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-amber-400 mb-6">The Wavelength Rule</h2>
            <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl space-y-4">
              <div className="p-4 bg-green-900/30 rounded-lg border border-green-600">
                <h3 className="text-green-400 font-bold mb-2">The Key Principle</h3>
                <p className="text-slate-300">
                  Electromagnetic waves can only &quot;see&quot; obstacles comparable to their wavelength.
                  If a hole is <span className="text-yellow-400 font-bold">much smaller than the wavelength</span>,
                  the wave diffracts around it and can&apos;t pass through!
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <h4 className="text-cyan-400 font-bold mb-2">Microwave Oven Door</h4>
                  <ul className="text-slate-300 text-sm space-y-1">
                    <li>Microwaves: wavelength = 12cm</li>
                    <li>Mesh holes: ~1-2mm</li>
                    <li>Holes are 60-100x smaller</li>
                    <li>Result: Safe! Waves blocked</li>
                  </ul>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <h4 className="text-purple-400 font-bold mb-2">WiFi Through Walls</h4>
                  <ul className="text-slate-300 text-sm space-y-1">
                    <li>WiFi: wavelength = 12cm</li>
                    <li>Wall studs: ~40cm apart</li>
                    <li>Gaps are 3x larger</li>
                    <li>Result: WiFi passes through!</li>
                  </ul>
                </div>
              </div>
              <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
                <p className="text-yellow-300 text-sm">
                  <strong>Real Example:</strong> Your car is a Faraday cage for radio waves (metal body),
                  but you can still make phone calls because cell signals can enter through the windows!
                </p>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>
            <div className="flex gap-2 mb-6 flex-wrap justify-center">
              {TRANSFER_APPS.map((app, index) => (
                <button
                  key={index}
                  onClick={() => setActiveAppTab(index)}
                  style={{ zIndex: 10 }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeAppTab === index ? 'bg-amber-600 text-white'
                    : completedApps.has(index) ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {app.icon} {app.title.split(' ')[0]}
                </button>
              ))}
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{TRANSFER_APPS[activeAppTab].icon}</span>
                <h3 className="text-xl font-bold text-white">{TRANSFER_APPS[activeAppTab].title}</h3>
              </div>
              <p className="text-lg text-slate-300 mt-4">{TRANSFER_APPS[activeAppTab].description}</p>
              {!completedApps.has(activeAppTab) && (
                <button
                  onClick={() => handleAppComplete(activeAppTab)}
                  style={{ zIndex: 10 }}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium"
                >
                  Mark as Understood
                </button>
              )}
            </div>
            <div className="mt-6 flex items-center gap-2">
              <span className="text-slate-400">Progress:</span>
              <div className="flex gap-1">{TRANSFER_APPS.map((_, i) => (<div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`} />))}</div>
              <span className="text-slate-400">{completedApps.size}/4</span>
            </div>
          </div>
        </div>
        {renderBottomBar(completedApps.size < 4, completedApps.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (showTestResults) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mx-auto mt-8 text-center">
              <div className="text-6xl mb-4">{testScore >= 3 ? '🎉' : '📚'}</div>
              <h3 className="text-2xl font-bold text-white mb-2">Score: {testScore}/{TEST_QUESTIONS.length}</h3>
              <p className="text-slate-300 mb-6">{testScore >= 7 ? 'Excellent! You understand Faraday cages!' : 'Keep studying! Review and try again.'}</p>
            </div>
            {TEST_QUESTIONS.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4 max-w-2xl mx-auto mt-4" style={{ borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p className="text-white font-medium mb-3">{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className={`p-2 rounded mb-1 ${opt.correct ? 'bg-emerald-900/30 text-emerald-400' : userAnswer === oIndex ? 'bg-red-900/30 text-red-400' : 'text-slate-400'}`}>
                      {opt.correct ? '✓' : userAnswer === oIndex ? '✗' : '○'} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 7, testScore >= 7 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Knowledge Assessment</h2>
            <div className="space-y-6 max-w-2xl w-full">
              {TEST_QUESTIONS.map((q, qIndex) => (
                <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-white font-medium mb-3">{qIndex + 1}. {q.question}</p>
                  <div className="grid gap-2">
                    {q.options.map((option, oIndex) => (
                      <button
                        key={oIndex}
                        onClick={() => handleTestAnswer(qIndex, oIndex)}
                        style={{ zIndex: 10 }}
                        className={`p-3 rounded-lg text-left text-sm transition-all ${testAnswers[qIndex] === oIndex ? 'bg-amber-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}
                      >
                        {option.text}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={submitTest}
                disabled={testAnswers.includes(null)}
                style={{ zIndex: 10 }}
                className={`w-full py-4 rounded-xl font-semibold text-lg ${testAnswers.includes(null) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white'}`}
              >
                Submit Answers
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
            <div className="bg-gradient-to-br from-amber-900/50 via-yellow-900/50 to-orange-900/50 rounded-3xl p-8 max-w-2xl">
              <div className="text-8xl mb-6">🛡️</div>
              <h1 className="text-3xl font-bold text-white mb-4">Faraday Cage Master!</h1>
              <p className="text-xl text-slate-300 mb-6">You&apos;ve mastered electromagnetic shielding!</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">⚡</div><p className="text-sm text-slate-300">Electron Redistribution</p></div>
                <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🔲</div><p className="text-sm text-slate-300">Mesh vs Wavelength</p></div>
                <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🍿</div><p className="text-sm text-slate-300">Microwave Ovens</p></div>
                <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">📱</div><p className="text-sm text-slate-300">Signal Blocking</p></div>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default FaradayCageRenderer;
