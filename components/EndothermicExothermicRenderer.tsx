'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// ENDOTHERMIC/EXOTHERMIC RENDERER - Game 138
// Physics: Energy balance in dissolution - bond breaking vs hydration energy
// Hot/cold packs logic: Net heat flow determined by energy balance
// ============================================================================

interface EndothermicExothermicRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// Solute data with energy values
interface SoluteData {
  name: string;
  formula: string;
  bondEnergy: number; // Energy to break lattice (positive, absorbed)
  hydrationEnergy: number; // Energy released by hydration (negative, released)
  netEnergy: number; // Net energy change (positive = endothermic, negative = exothermic)
  color: string;
  tempChange: number; // Temperature change per 10g in 100mL water
}

const solutes: SoluteData[] = [
  { name: 'Ammonium Nitrate', formula: 'NH4NO3', bondEnergy: 25.7, hydrationEnergy: -0.3, netEnergy: 25.4, color: '#60a5fa', tempChange: -8 },
  { name: 'Sodium Chloride', formula: 'NaCl', bondEnergy: 3.9, hydrationEnergy: -3.8, netEnergy: 0.1, color: '#e2e8f0', tempChange: -0.5 },
  { name: 'Calcium Chloride', formula: 'CaCl2', bondEnergy: -17.4, hydrationEnergy: -64.6, netEnergy: -82, color: '#f97316', tempChange: 12 },
  { name: 'Sodium Hydroxide', formula: 'NaOH', bondEnergy: -20.5, hydrationEnergy: -23.4, netEnergy: -43.9, color: '#ef4444', tempChange: 8 },
];

const EndothermicExothermicRenderer: React.FC<EndothermicExothermicRendererProps> = ({
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
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);

  // Game-specific state
  const [selectedSolute, setSelectedSolute] = useState(0);
  const [soluteAmount, setSoluteAmount] = useState(10);
  const [waterTemp, setWaterTemp] = useState(25);
  const [isMixing, setIsMixing] = useState(false);
  const [mixProgress, setMixProgress] = useState(0);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [particles, setParticles] = useState<{ x: number; y: number; dissolving: boolean; id: number }[]>([]);
  const particleIdRef = useRef(0);

  const lastClickRef = useRef(0);

  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete' | 'bubble') => {
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
        complete: { freq: 900, duration: 0.4, type: 'sine' },
        bubble: { freq: 400, duration: 0.08, type: 'sine' }
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

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame((f) => (f + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Mixing simulation
  useEffect(() => {
    if (!isMixing) return;

    const interval = setInterval(() => {
      setMixProgress(prev => {
        if (prev >= 100) {
          setIsMixing(false);
          return 100;
        }
        return prev + 2;
      });

      // Update temperature based on solute
      const solute = solutes[selectedSolute];
      const targetTemp = 25 + (solute.tempChange * soluteAmount / 10);
      setWaterTemp(prev => {
        const diff = targetTemp - prev;
        return prev + diff * 0.05;
      });

      // Random particle dissolution
      setParticles(prev =>
        prev.map(p => ({
          ...p,
          dissolving: p.dissolving || Math.random() < 0.1
        })).filter(p => !p.dissolving || Math.random() > 0.05)
      );

      if (Math.random() < 0.3) {
        playSound('bubble');
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isMixing, selectedSolute, soluteAmount, playSound]);

  const startMixing = useCallback(() => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;

    // Create particles
    const newParticles: { x: number; y: number; dissolving: boolean; id: number }[] = [];
    for (let i = 0; i < Math.min(soluteAmount, 30); i++) {
      newParticles.push({
        x: 150 + Math.random() * 100,
        y: 80 + Math.random() * 60,
        dissolving: false,
        id: particleIdRef.current++
      });
    }
    setParticles(newParticles);
    setMixProgress(0);
    setWaterTemp(25);
    setIsMixing(true);
    playSound('click');
  }, [soluteAmount, playSound]);

  const resetExperiment = useCallback(() => {
    setIsMixing(false);
    setMixProgress(0);
    setWaterTemp(25);
    setParticles([]);
    playSound('click');
  }, [playSound]);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    if (prediction === 'B') {
      playSound('success');
      onCorrectAnswer?.();
    } else {
      playSound('failure');
      onIncorrectAnswer?.();
    }
  }, [playSound, onCorrectAnswer, onIncorrectAnswer]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    if (prediction === 'C') {
      playSound('success');
      onCorrectAnswer?.();
    } else {
      playSound('failure');
      onIncorrectAnswer?.();
    }
  }, [playSound, onCorrectAnswer, onIncorrectAnswer]);

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

  // Get temperature color
  const getTempColor = (temp: number): string => {
    if (temp < 15) return '#3b82f6';
    if (temp < 20) return '#06b6d4';
    if (temp < 25) return '#22c55e';
    if (temp < 30) return '#eab308';
    if (temp < 35) return '#f97316';
    return '#ef4444';
  };

  const testQuestions = [
    { question: "What makes a dissolution process endothermic?", options: [
      { text: "Water gets warmer", correct: false },
      { text: "More energy is absorbed breaking bonds than released by hydration", correct: true },
      { text: "The solute disappears faster", correct: false },
      { text: "Bubbles form", correct: false }
    ]},
    { question: "In an instant cold pack, what compound is typically used?", options: [
      { text: "Calcium chloride", correct: false },
      { text: "Sodium chloride", correct: false },
      { text: "Ammonium nitrate", correct: true },
      { text: "Sodium hydroxide", correct: false }
    ]},
    { question: "Why does calcium chloride make water warm when dissolved?", options: [
      { text: "It reacts with water", correct: false },
      { text: "Hydration energy released exceeds energy to break crystal lattice", correct: true },
      { text: "It's radioactive", correct: false },
      { text: "Friction from dissolving", correct: false }
    ]},
    { question: "The 'lattice energy' refers to:", options: [
      { text: "Energy stored in water molecules", correct: false },
      { text: "Energy needed to break apart the crystal structure", correct: true },
      { text: "Heat capacity of solution", correct: false },
      { text: "Energy of hydration", correct: false }
    ]},
    { question: "Hydration energy is:", options: [
      { text: "Always positive (absorbed)", correct: false },
      { text: "Energy released when water molecules surround ions", correct: true },
      { text: "The temperature of water", correct: false },
      { text: "Only in exothermic reactions", correct: false }
    ]},
    { question: "If a dissolution has net energy = +25 kJ/mol, it is:", options: [
      { text: "Exothermic - releases heat", correct: false },
      { text: "Endothermic - absorbs heat", correct: true },
      { text: "Neither", correct: false },
      { text: "Both at once", correct: false }
    ]},
    { question: "Why do reusable hand warmers use sodium acetate instead of calcium chloride?", options: [
      { text: "Cheaper", correct: false },
      { text: "Sodium acetate can be 'recharged' by heating", correct: true },
      { text: "It's colder", correct: false },
      { text: "Calcium chloride is toxic", correct: false }
    ]},
    { question: "Which salt would cool water the MOST when dissolved?", options: [
      { text: "NaCl (table salt)", correct: false },
      { text: "CaCl2 (calcium chloride)", correct: false },
      { text: "NH4NO3 (ammonium nitrate)", correct: true },
      { text: "NaOH (sodium hydroxide)", correct: false }
    ]},
    { question: "The first law of thermodynamics tells us that in dissolution:", options: [
      { text: "Energy is created", correct: false },
      { text: "Energy is destroyed", correct: false },
      { text: "Energy is conserved - it comes from/goes to the surroundings", correct: true },
      { text: "Temperature is constant", correct: false }
    ]},
    { question: "In an exothermic dissolution, the solution:", options: [
      { text: "Gets colder", correct: false },
      { text: "Gets warmer", correct: true },
      { text: "Stays the same temperature", correct: false },
      { text: "Freezes immediately", correct: false }
    ]}
  ];

  const calculateScore = () => testAnswers.reduce((score, answer, index) => {
    if (answer !== null && testQuestions[index].options[answer].correct) {
      return score + 1;
    }
    return score;
  }, 0);

  const applications = [
    {
      title: "Instant Cold Packs",
      icon: "🧊",
      description: "Emergency cold packs contain ammonium nitrate and water in separate compartments. Squeezing breaks the barrier, dissolving the salt endothermically.",
      details: "Used for sports injuries, they can reach 0-5C within seconds. The endothermic dissolution absorbs heat from the surroundings."
    },
    {
      title: "Hot Packs & Hand Warmers",
      icon: "🔥",
      description: "Calcium chloride or magnesium sulfate dissolution releases heat exothermically. Some use supersaturated sodium acetate crystallization.",
      details: "Chemical hand warmers use iron oxidation, but dissolution-based ones are faster-acting and reusable if using crystallization."
    },
    {
      title: "Industrial Processes",
      icon: "🏭",
      description: "Many industrial processes rely on controlled heat from dissolution. Concrete curing uses exothermic hydration reactions.",
      details: "Large-scale chemical manufacturing must account for dissolution energetics to prevent runaway heating or unwanted cooling."
    },
    {
      title: "Chemistry Education",
      icon: "🧪",
      description: "Dissolution experiments demonstrate thermodynamics principles. Students see abstract energy concepts through temperature changes.",
      details: "Comparing different salts teaches energy balance, enthalpy, and the difference between temperature and heat."
    }
  ];

  // Render energy bar chart with premium SVG graphics
  const renderEnergyChart = (soluteIndex: number, showLabels: boolean = true) => {
    const solute = solutes[soluteIndex];
    const maxEnergy = 100;
    const bondHeight = Math.abs(solute.bondEnergy) / maxEnergy * 150;
    const hydrationHeight = Math.abs(solute.hydrationEnergy) / maxEnergy * 150;
    const netHeight = Math.abs(solute.netEnergy) / maxEnergy * 150;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <svg viewBox="0 0 300 180" style={{ width: '100%', maxWidth: '300px' }}>
          <defs>
            {/* Premium background gradient */}
            <linearGradient id="endoChartBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="30%" stopColor="#1e293b" />
              <stop offset="70%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Bond energy gradient - warm orange tones */}
            <linearGradient id="endoBondGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="25%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#ea580c" />
              <stop offset="75%" stopColor="#c2410c" />
              <stop offset="100%" stopColor="#9a3412" />
            </linearGradient>

            {/* Hydration energy gradient - cool blue tones */}
            <linearGradient id="endoHydrationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="25%" stopColor="#0369a1" />
              <stop offset="50%" stopColor="#1d4ed8" />
              <stop offset="75%" stopColor="#1e40af" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>

            {/* Net energy gradient - endothermic (green/cyan for cooling) */}
            <linearGradient id="endoNetEndoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="25%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#059669" />
              <stop offset="75%" stopColor="#047857" />
              <stop offset="100%" stopColor="#065f46" />
            </linearGradient>

            {/* Net energy gradient - exothermic (red/orange for heating) */}
            <linearGradient id="endoNetExoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="25%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="75%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>

            {/* Glow filter for bars */}
            <filter id="endoBarGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Zero line glow */}
            <filter id="endoZeroGlow" x="-20%" y="-100%" width="140%" height="300%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Grid pattern for background */}
            <pattern id="endoGridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.5" />
            </pattern>
          </defs>

          {/* Background with gradient */}
          <rect width="300" height="180" fill="url(#endoChartBg)" rx="8" />

          {/* Grid overlay */}
          <rect x="40" y="20" width="240" height="140" fill="url(#endoGridPattern)" opacity="0.3" />

          {/* Zero line with glow */}
          <line x1="40" y1="90" x2="280" y2="90" stroke="#64748b" strokeWidth="2" strokeDasharray="6,4" filter="url(#endoZeroGlow)" />

          {/* Bond Energy bar with gradient and glow */}
          <rect
            x="60"
            y={90 - bondHeight * 0.9}
            width="50"
            height={bondHeight * 0.9}
            fill="url(#endoBondGradient)"
            rx="6"
            filter="url(#endoBarGlow)"
          />
          {/* Bond bar highlight */}
          <rect
            x="62"
            y={92 - bondHeight * 0.9}
            width="8"
            height={bondHeight * 0.9 - 4}
            fill="rgba(255,255,255,0.15)"
            rx="3"
          />

          {/* Hydration Energy bar with gradient and glow */}
          <rect
            x="125"
            y={90}
            width="50"
            height={hydrationHeight * 0.9}
            fill="url(#endoHydrationGradient)"
            rx="6"
            filter="url(#endoBarGlow)"
          />
          {/* Hydration bar highlight */}
          <rect
            x="127"
            y={92}
            width="8"
            height={hydrationHeight * 0.9 - 4}
            fill="rgba(255,255,255,0.15)"
            rx="3"
          />

          {/* Net Energy bar with dynamic gradient and glow */}
          <rect
            x="190"
            y={solute.netEnergy > 0 ? 90 - netHeight * 0.9 : 90}
            width="50"
            height={netHeight * 0.9}
            fill={solute.netEnergy > 0 ? 'url(#endoNetEndoGradient)' : 'url(#endoNetExoGradient)'}
            rx="6"
            filter="url(#endoBarGlow)"
          />
          {/* Net bar highlight */}
          <rect
            x="192"
            y={solute.netEnergy > 0 ? 92 - netHeight * 0.9 : 92}
            width="8"
            height={netHeight * 0.9 - 4}
            fill="rgba(255,255,255,0.15)"
            rx="3"
          />

          {/* Energy flow arrows */}
          <path
            d={`M 85 ${90 - bondHeight * 0.9 - 12} L 85 ${90 - bondHeight * 0.9 - 2}`}
            stroke="#fbbf24"
            strokeWidth="2"
            markerEnd="url(#endoArrowUp)"
          />
          <path
            d={`M 150 ${90 + hydrationHeight * 0.9 + 2} L 150 ${90 + hydrationHeight * 0.9 + 12}`}
            stroke="#3b82f6"
            strokeWidth="2"
            markerEnd="url(#endoArrowDown)"
          />

          {/* Arrow markers */}
          <defs>
            <marker id="endoArrowUp" markerWidth="6" markerHeight="6" refX="3" refY="6" orient="auto">
              <path d="M 0 6 L 3 0 L 6 6" fill="none" stroke="#fbbf24" strokeWidth="1.5" />
            </marker>
            <marker id="endoArrowDown" markerWidth="6" markerHeight="6" refX="3" refY="0" orient="auto">
              <path d="M 0 0 L 3 6 L 6 0" fill="none" stroke="#3b82f6" strokeWidth="1.5" />
            </marker>
          </defs>
        </svg>

        {/* Labels outside SVG using typo system */}
        {showLabels && (
          <div style={{ width: '100%', maxWidth: '300px', marginTop: '8px' }}>
            {/* Title and type */}
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: typo.body, fontWeight: 'bold', color: '#e2e8f0' }}>
                {solute.name}
              </div>
              <div style={{
                fontSize: typo.small,
                color: solute.netEnergy > 0 ? '#60a5fa' : '#f87171',
                fontWeight: '600'
              }}>
                {solute.netEnergy > 0 ? 'ENDOTHERMIC (Cools)' : 'EXOTHERMIC (Heats)'}
              </div>
            </div>

            {/* Bar labels */}
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: typo.small, color: '#f97316', fontWeight: '600' }}>
                  +{solute.bondEnergy.toFixed(1)}
                </div>
                <div style={{ fontSize: typo.label, color: '#e2e8f0' }}>Bond Breaking</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: typo.small, color: '#3b82f6', fontWeight: '600' }}>
                  {solute.hydrationEnergy.toFixed(1)}
                </div>
                <div style={{ fontSize: typo.label, color: '#e2e8f0' }}>Hydration</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: typo.small,
                  color: solute.netEnergy > 0 ? '#22c55e' : '#ef4444',
                  fontWeight: '600'
                }}>
                  {solute.netEnergy > 0 ? '+' : ''}{solute.netEnergy.toFixed(1)}
                </div>
                <div style={{ fontSize: typo.label, color: '#e2e8f0' }}>Net kJ/mol</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render beaker visualization with premium SVG graphics
  const renderBeakerVisualization = () => {
    const solute = solutes[selectedSolute];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <svg viewBox="0 0 300 220" style={{ width: '100%', maxWidth: '300px' }}>
          <defs>
            {/* Premium lab background gradient */}
            <linearGradient id="endoLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="30%" stopColor="#0a0f1a" />
              <stop offset="70%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Glass beaker gradient with depth */}
            <linearGradient id="endoBeakerGlass" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.8" />
              <stop offset="15%" stopColor="#64748b" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#475569" stopOpacity="0.4" />
              <stop offset="85%" stopColor="#64748b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.8" />
            </linearGradient>

            {/* Cold water gradient (blue tones) */}
            <linearGradient id="endoWaterCold" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.5" />
              <stop offset="25%" stopColor="#3b82f6" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#2563eb" stopOpacity="0.65" />
              <stop offset="75%" stopColor="#1d4ed8" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#1e40af" stopOpacity="0.75" />
            </linearGradient>

            {/* Warm water gradient (orange/red tones) */}
            <linearGradient id="endoWaterHot" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
              <stop offset="25%" stopColor="#f97316" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#ea580c" stopOpacity="0.65" />
              <stop offset="75%" stopColor="#dc2626" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.75" />
            </linearGradient>

            {/* Neutral water gradient */}
            <linearGradient id="endoWaterNeutral" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
              <stop offset="25%" stopColor="#06b6d4" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#0891b2" stopOpacity="0.55" />
              <stop offset="75%" stopColor="#0e7490" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#155e75" stopOpacity="0.65" />
            </linearGradient>

            {/* Temperature thermometer gradient - cold */}
            <linearGradient id="endoThermoCold" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="25%" stopColor="#2563eb" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="75%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#93c5fd" />
            </linearGradient>

            {/* Temperature thermometer gradient - hot */}
            <linearGradient id="endoThermoHot" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#991b1b" />
              <stop offset="25%" stopColor="#dc2626" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="75%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>

            {/* Heat flow glow filter */}
            <filter id="endoHeatGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Particle glow filter */}
            <filter id="endoParticleGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Water surface shimmer */}
            <filter id="endoWaterShimmer" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" />
            </filter>

            {/* Progress bar gradient */}
            <linearGradient id="endoProgressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="25%" stopColor="#16a34a" />
              <stop offset="50%" stopColor="#15803d" />
              <stop offset="75%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>

            {/* Solute particle gradients */}
            <radialGradient id="endoSoluteParticle" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="30%" stopColor={solute.color} stopOpacity="0.8" />
              <stop offset="70%" stopColor={solute.color} stopOpacity="0.9" />
              <stop offset="100%" stopColor={solute.color} stopOpacity="1" />
            </radialGradient>

            {/* Heat arrow gradients */}
            <linearGradient id="endoHeatArrowIn" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
              <stop offset="30%" stopColor="#60a5fa" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#93c5fd" stopOpacity="1" />
              <stop offset="70%" stopColor="#60a5fa" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="endoHeatArrowOut" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0" />
              <stop offset="30%" stopColor="#f87171" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#fca5a5" stopOpacity="1" />
              <stop offset="70%" stopColor="#f87171" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </linearGradient>

            {/* Arrow markers with glow */}
            <marker id="endoArrowBlue" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
              <path d="M 0 0 L 8 4 L 0 8 Z" fill="#60a5fa" />
            </marker>
            <marker id="endoArrowRed" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
              <path d="M 0 0 L 8 4 L 0 8 Z" fill="#f87171" />
            </marker>
          </defs>

          {/* Premium lab background */}
          <rect width="300" height="220" fill="url(#endoLabBg)" rx="8" />

          {/* Subtle grid pattern */}
          <pattern id="endoLabGrid" width="15" height="15" patternUnits="userSpaceOnUse">
            <path d="M 15 0 L 0 0 0 15" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.3" />
          </pattern>
          <rect width="300" height="220" fill="url(#endoLabGrid)" rx="8" />

          {/* Beaker with glass effect */}
          <path
            d="M 80 50 L 80 165 Q 80 185 100 185 L 200 185 Q 220 185 220 165 L 220 50"
            fill="none"
            stroke="url(#endoBeakerGlass)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Beaker inner highlight */}
          <path
            d="M 85 55 L 85 162 Q 85 180 102 180"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="2"
          />

          {/* Water with temperature-based gradient */}
          <rect
            x="84"
            y="70"
            width="132"
            height="112"
            fill={waterTemp < 20 ? 'url(#endoWaterCold)' : waterTemp > 30 ? 'url(#endoWaterHot)' : 'url(#endoWaterNeutral)'}
            rx="2"
          />

          {/* Water surface highlight */}
          <ellipse
            cx="150"
            cy="72"
            rx="60"
            ry="4"
            fill="rgba(255,255,255,0.15)"
          />

          {/* Dissolved solute spreading effect */}
          {mixProgress > 0 && (
            <>
              <rect
                x="84"
                y={182 - mixProgress * 1.1}
                width="132"
                height={mixProgress * 1.1}
                fill={solute.color}
                opacity={0.35}
                rx="2"
              />
              {/* Swirl effect during mixing */}
              {isMixing && (
                <ellipse
                  cx={150 + Math.sin(animationFrame / 8) * 20}
                  cy={140 + Math.cos(animationFrame / 6) * 15}
                  rx="25"
                  ry="15"
                  fill={solute.color}
                  opacity={0.2}
                  transform={`rotate(${animationFrame * 3} 150 140)`}
                />
              )}
            </>
          )}

          {/* Particles with glow */}
          {particles.map(p => (
            <g key={p.id}>
              <circle
                cx={p.x}
                cy={p.y + (p.dissolving ? animationFrame % 30 : 0)}
                r={p.dissolving ? 4 : 6}
                fill="url(#endoSoluteParticle)"
                opacity={p.dissolving ? 0.4 : 0.9}
                filter="url(#endoParticleGlow)"
              />
            </g>
          ))}

          {/* Premium temperature indicator */}
          <g transform="translate(255, 60)">
            {/* Thermometer body */}
            <rect x="-12" y="0" width="24" height="110" fill="#1e293b" stroke="#475569" strokeWidth="2" rx="6" />
            {/* Scale marks */}
            {[0, 25, 50].map((temp, i) => (
              <g key={temp}>
                <line x1="-8" y1={100 - i * 40} x2="8" y2={100 - i * 40} stroke="#64748b" strokeWidth="1" />
              </g>
            ))}
            {/* Mercury column with temperature gradient */}
            <rect
              x="-6"
              y={100 - (waterTemp / 50) * 90}
              width="12"
              height={(waterTemp / 50) * 90}
              fill={waterTemp < 25 ? 'url(#endoThermoCold)' : 'url(#endoThermoHot)'}
              rx="3"
            />
            {/* Thermometer bulb */}
            <circle cx="0" cy="105" r="10" fill={waterTemp < 25 ? '#3b82f6' : '#ef4444'} />
          </g>

          {/* Heat flow arrows with glow */}
          {isMixing && (
            <g filter="url(#endoHeatGlow)">
              {solute.netEnergy > 0 ? (
                // Endothermic - arrows pointing IN (absorbing heat)
                <>
                  <path
                    d={`M 50 ${130 + Math.sin(animationFrame / 10) * 8} L 78 130`}
                    stroke="url(#endoHeatArrowIn)"
                    strokeWidth="4"
                    markerEnd="url(#endoArrowBlue)"
                  />
                  <path
                    d={`M 250 ${130 + Math.sin(animationFrame / 10 + 2) * 8} L 222 130`}
                    stroke="url(#endoHeatArrowIn)"
                    strokeWidth="4"
                    markerEnd="url(#endoArrowBlue)"
                  />
                  {/* Secondary arrows */}
                  <path
                    d={`M 55 ${155 + Math.sin(animationFrame / 10 + 1) * 6} L 78 152`}
                    stroke="url(#endoHeatArrowIn)"
                    strokeWidth="3"
                    markerEnd="url(#endoArrowBlue)"
                    opacity="0.6"
                  />
                  <path
                    d={`M 245 ${155 + Math.sin(animationFrame / 10 + 3) * 6} L 222 152`}
                    stroke="url(#endoHeatArrowIn)"
                    strokeWidth="3"
                    markerEnd="url(#endoArrowBlue)"
                    opacity="0.6"
                  />
                </>
              ) : (
                // Exothermic - arrows pointing OUT (releasing heat)
                <>
                  <path
                    d={`M 78 130 L 50 ${130 + Math.sin(animationFrame / 10) * 8}`}
                    stroke="url(#endoHeatArrowOut)"
                    strokeWidth="4"
                    markerEnd="url(#endoArrowRed)"
                  />
                  <path
                    d={`M 222 130 L 250 ${130 + Math.sin(animationFrame / 10 + 2) * 8}`}
                    stroke="url(#endoHeatArrowOut)"
                    strokeWidth="4"
                    markerEnd="url(#endoArrowRed)"
                  />
                  {/* Secondary arrows */}
                  <path
                    d={`M 78 152 L 55 ${155 + Math.sin(animationFrame / 10 + 1) * 6}`}
                    stroke="url(#endoHeatArrowOut)"
                    strokeWidth="3"
                    markerEnd="url(#endoArrowRed)"
                    opacity="0.6"
                  />
                  <path
                    d={`M 222 152 L 245 ${155 + Math.sin(animationFrame / 10 + 3) * 6}`}
                    stroke="url(#endoHeatArrowOut)"
                    strokeWidth="3"
                    markerEnd="url(#endoArrowRed)"
                    opacity="0.6"
                  />
                </>
              )}
            </g>
          )}

          {/* Progress bar with gradient */}
          <rect x="84" y="195" width="132" height="10" fill="#1e293b" stroke="#334155" rx="5" />
          <rect x="85" y="196" width={Math.max(0, mixProgress * 1.30)} height="8" fill="url(#endoProgressGradient)" rx="4" />
        </svg>

        {/* Labels outside SVG using typo system */}
        <div style={{ width: '100%', maxWidth: '300px', marginTop: '8px' }}>
          {/* Temperature display */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <div style={{
              fontSize: typo.bodyLarge,
              fontWeight: 'bold',
              color: waterTemp < 25 ? '#60a5fa' : waterTemp > 25 ? '#f87171' : '#e2e8f0'
            }}>
              {waterTemp.toFixed(1)}°C
            </div>
            <div style={{ fontSize: typo.small, color: '#e2e8f0' }}>
              {isMixing ? `Dissolving: ${mixProgress.toFixed(0)}%` : mixProgress >= 100 ? 'Complete!' : 'Ready to mix'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Phase order for navigation
  const phaseOrder = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const currentPhaseIndex = phaseOrder.indexOf(phase);

  // Fixed BOTTOM navigation bar with Back and Next buttons
  const renderNavBar = (canProceed: boolean, buttonText: string) => (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1001,
      minHeight: '60px',
      background: 'rgba(30, 41, 59, 0.98)',
      borderTop: '1px solid rgba(148, 163, 184, 0.2)',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
      padding: '10px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <button
        onClick={() => {
          if (currentPhaseIndex > 0) {
            onPhaseComplete?.();
          }
        }}
        disabled={currentPhaseIndex === 0}
        aria-label="Back"
        style={{
          padding: '12px 24px',
          minHeight: '44px',
          borderRadius: '8px',
          border: '1px solid rgba(148, 163, 184, 0.3)',
          background: currentPhaseIndex === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
          color: currentPhaseIndex === 0 ? '#64748b' : '#e2e8f0',
          fontWeight: '600',
          cursor: currentPhaseIndex === 0 ? 'not-allowed' : 'pointer',
          fontSize: '14px'
        }}
      >
        Back
      </button>
      <div style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '500' }}>
        Endothermic & Exothermic
      </div>
      <button
        onClick={onPhaseComplete}
        disabled={!canProceed}
        aria-label="Next"
        style={{
          padding: '12px 24px',
          minHeight: '44px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? 'linear-gradient(to right, #3b82f6, #2563eb)' : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : '#64748b',
          fontWeight: '600',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '14px'
        }}
      >
        {buttonText}
      </button>
    </nav>
  );

  // ============================================================================
  // REAL-WORLD APPLICATIONS DATA
  // ============================================================================

  const realWorldApps = [
    {
      icon: '🧤',
      title: 'Hand Warmers and Cold Packs',
      short: 'Consumer Products',
      tagline: 'Instant Temperature Control in Your Pocket',
      description: 'Portable heating and cooling products harness the power of endothermic and exothermic reactions to provide on-demand temperature relief. Hand warmers use iron oxidation or supersaturated sodium acetate crystallization to generate heat, while instant cold packs rely on ammonium nitrate dissolution to absorb heat from surroundings.',
      connection: 'The dissolution processes you explored directly power these products. Cold packs use ammonium nitrate (endothermic dissolution) to cool injuries, while some hand warmers use calcium chloride or sodium acetate (exothermic) to warm hands in cold weather.',
      howItWorks: 'Cold packs contain water and ammonium nitrate in separate compartments. Squeezing breaks the barrier, initiating endothermic dissolution that absorbs heat. Reusable hand warmers use supersaturated sodium acetate that releases heat when crystallization is triggered by a metal disc.',
      stats: [
        { value: '0-5°C', label: 'Cold pack temperature', icon: '❄️' },
        { value: '54°C', label: 'Hand warmer peak temp', icon: '🔥' },
        { value: '$2.5B', label: 'Global market size', icon: '📊' }
      ],
      examples: [
        'Instant cold packs for sports injuries use ammonium nitrate dissolution',
        'Air-activated hand warmers use iron oxidation (slow exothermic reaction)',
        'Reusable sodium acetate warmers can be recharged by boiling',
        'Therapeutic hot/cold gel packs for medical treatment'
      ],
      companies: ['HotHands', 'Grabber', 'ThermaCare', 'Ace Brand', 'Carex'],
      futureImpact: 'Advances in phase-change materials are creating longer-lasting, more environmentally friendly heating and cooling products with precise temperature control.',
      color: '#3b82f6'
    },
    {
      icon: '🚀',
      title: 'Rocket Propulsion',
      short: 'Aerospace',
      tagline: 'Harnessing Explosive Exothermic Reactions for Space Travel',
      description: 'Rocket engines are perhaps the most dramatic application of exothermic reactions. The controlled combustion of propellants releases enormous amounts of energy, converting chemical potential energy into kinetic energy that propels rockets into orbit and beyond.',
      connection: 'The energy balance principles you learned apply at massive scale in rockets. The net energy released (always highly exothermic) determines thrust. Engineers carefully select propellant combinations to maximize energy release while controlling reaction rates.',
      howItWorks: 'Fuel and oxidizer combine in the combustion chamber, triggering highly exothermic reactions. The extreme heat (3,000-4,000°C) causes rapid gas expansion, which is directed through the nozzle to produce thrust via Newton\'s third law.',
      stats: [
        { value: '3,500°C', label: 'Combustion temperature', icon: '🔥' },
        { value: '11.2 km/s', label: 'Earth escape velocity', icon: '⚡' },
        { value: '35 MN', label: 'Saturn V thrust', icon: '💪' }
      ],
      examples: [
        'SpaceX Falcon 9 uses RP-1 kerosene with liquid oxygen',
        'Space Shuttle main engines burned hydrogen and oxygen',
        'Solid rocket boosters use aluminum powder with ammonium perchlorate',
        'Hypergolic propellants ignite on contact for reliable ignition'
      ],
      companies: ['SpaceX', 'NASA', 'Blue Origin', 'Rocket Lab', 'Aerojet Rocketdyne'],
      futureImpact: 'New propellant combinations and advanced cooling techniques are enabling more efficient, reusable rockets that could make space travel routine and affordable.',
      color: '#f97316'
    },
    {
      icon: '🏭',
      title: 'Industrial Chemical Processes',
      short: 'Manufacturing',
      tagline: 'Controlling Heat in Large-Scale Production',
      description: 'Industrial chemistry relies heavily on understanding and managing endothermic and exothermic reactions. From ammonia synthesis to polymer production, controlling reaction temperatures is critical for safety, efficiency, and product quality.',
      connection: 'The dissolution energy balance you observed scales up to industrial processes. Engineers must account for heat released or absorbed to prevent runaway reactions, optimize energy use, and maintain consistent product quality.',
      howItWorks: 'Industrial reactors use heat exchangers, cooling systems, and precise temperature controls to manage reaction energetics. Exothermic reactions often require cooling to prevent overheating, while endothermic processes need external heat input.',
      stats: [
        { value: '150M tons', label: 'Annual ammonia production', icon: '🧪' },
        { value: '450°C', label: 'Haber process temperature', icon: '🌡️' },
        { value: '$5T', label: 'Global chemical industry', icon: '💰' }
      ],
      examples: [
        'Haber-Bosch process for ammonia is exothermic but requires high temperature catalyst activation',
        'Cement production uses endothermic calcination followed by exothermic hydration',
        'Sulfuric acid manufacturing through exothermic contact process',
        'Endothermic steam reforming for hydrogen production'
      ],
      companies: ['BASF', 'Dow Chemical', 'DuPont', 'LyondellBasell', 'SABIC'],
      futureImpact: 'Green chemistry initiatives are developing new reaction pathways that operate at lower temperatures, using renewable energy and producing less waste while maintaining industrial efficiency.',
      color: '#22c55e'
    },
    {
      icon: '👨‍🍳',
      title: 'Cooking and Food Science',
      short: 'Culinary',
      tagline: 'The Chemistry Behind Every Delicious Meal',
      description: 'Cooking is applied chemistry, with endothermic and exothermic reactions transforming raw ingredients into delicious meals. From caramelization to the Maillard reaction, understanding heat transfer and energy changes is essential to culinary mastery.',
      connection: 'The temperature changes from dissolution reactions mirror what happens in cooking. Dissolving sugar (slightly endothermic) cools a solution, while the Maillard reaction (exothermic) releases heat that browns food and creates complex flavors.',
      howItWorks: 'Heat energy drives endothermic reactions like protein denaturation and starch gelatinization, while exothermic reactions like caramelization and oxidation release energy. Chefs control these reactions through temperature, timing, and technique.',
      stats: [
        { value: '140-165°C', label: 'Maillard reaction range', icon: '🍳' },
        { value: '170°C', label: 'Caramelization start', icon: '🍬' },
        { value: '62°C', label: 'Egg protein coagulation', icon: '🥚' }
      ],
      examples: [
        'Maillard reaction creates the brown crust on seared steaks (exothermic)',
        'Dissolving salt in ice cream mixture is endothermic, enabling sub-zero freezing',
        'Caramelization breaks down sugars through endothermic then exothermic steps',
        'Baking soda reacting with acid releases CO2 (exothermic) for leavening'
      ],
      companies: ['Modernist Cuisine', 'ChefSteps', 'Serious Eats', 'Americas Test Kitchen'],
      futureImpact: 'Molecular gastronomy and precision cooking technologies are giving chefs unprecedented control over chemical reactions, enabling new textures, flavors, and culinary experiences.',
      color: '#ec4899'
    }
  ];

  // Render hook phase
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px', overflowY: 'auto' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '600px',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '9999px',
            marginBottom: '32px'
          }}>
            <span style={{ width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#3b82f6', letterSpacing: '0.05em' }}>THERMOCHEMISTRY</span>
          </div>

          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginBottom: '16px',
            background: 'linear-gradient(to right, #ffffff, #93c5fd, #60a5fa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Can Mixing Make a Liquid Colder or Hotter?
          </h1>

          <p style={{ fontSize: '18px', color: '#e2e8f0', maxWidth: '500px', marginBottom: '40px' }}>
            Discover the energy battle inside every dissolving crystal
          </p>

          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.8))',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '560px',
            width: '100%',
            border: '1px solid rgba(71, 85, 105, 0.5)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ fontSize: '60px', marginBottom: '24px' }}>
              🧊 + 💧 = ❄️ &nbsp;&nbsp; vs &nbsp;&nbsp; 🔥 + 💧 = 🌡️
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '20px', color: 'rgba(255,255,255,0.9)', fontWeight: '500', lineHeight: '1.6' }}>
                Drop some salt into water, and the temperature changes.
                But some salts make it <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>colder</span>,
                while others make it <span style={{ color: '#ef4444', fontWeight: 'bold' }}>hotter</span>!
              </p>
              <p style={{ fontSize: '16px', color: '#e2e8f0', lineHeight: '1.6' }}>
                The same process - dissolving - but opposite effects. How can this be?
              </p>
              <p style={{ fontSize: '16px', color: '#f59e0b', fontWeight: '600' }}>
                It's all about the energy balance inside the solution.
              </p>
            </div>
          </div>

          <div style={{ marginTop: '48px', display: 'flex', alignItems: 'center', gap: '32px', fontSize: '14px', color: '#64748b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#3b82f6' }}>✦</span>
              Interactive Lab
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#3b82f6' }}>✦</span>
              Compare Salts
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#3b82f6' }}>✦</span>
              Real Applications
            </div>
          </div>
        </div>
        {renderNavBar(true, 'Make a Prediction →')}
      </div>
    );
  }

  // Render predict phase
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingTop: '80px', paddingBottom: '100px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '24px' }}>Make Your Prediction</h2>

          {/* Static SVG diagram for predict phase */}
          <div style={{ marginBottom: '24px' }}>
            <svg viewBox="0 0 300 150" style={{ width: '100%', maxWidth: '300px' }}>
              <defs>
                <linearGradient id="predictBg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>
              </defs>
              <rect width="300" height="150" fill="url(#predictBg)" rx="8" />
              {/* Cold beaker */}
              <rect x="30" y="40" width="60" height="70" fill="rgba(59, 130, 246, 0.3)" stroke="#3b82f6" strokeWidth="2" rx="4" />
              <text x="60" y="85" fill="#60a5fa" fontSize="10" textAnchor="middle">Cold</text>
              <text x="60" y="100" fill="#e2e8f0" fontSize="8" textAnchor="middle">NH4NO3</text>
              <text x="60" y="30" fill="#60a5fa" fontSize="8" textAnchor="middle">Endothermic</text>
              {/* Hot beaker */}
              <rect x="210" y="40" width="60" height="70" fill="rgba(239, 68, 68, 0.3)" stroke="#ef4444" strokeWidth="2" rx="4" />
              <text x="240" y="85" fill="#f87171" fontSize="10" textAnchor="middle">Hot</text>
              <text x="240" y="100" fill="#e2e8f0" fontSize="8" textAnchor="middle">CaCl2</text>
              <text x="240" y="30" fill="#f87171" fontSize="8" textAnchor="middle">Exothermic</text>
              {/* Question mark */}
              <text x="150" y="85" fill="#fbbf24" fontSize="32" textAnchor="middle">?</text>
              <text x="150" y="120" fill="#e2e8f0" fontSize="9" textAnchor="middle">What determines this?</text>
            </svg>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '640px', marginBottom: '24px' }}>
            <p style={{ fontSize: '18px', color: '#cbd5e1', marginBottom: '16px' }}>
              When ammonium nitrate (NH4NO3) dissolves in water, the water gets very cold.
              But when calcium chloride (CaCl2) dissolves, the water gets hot.
            </p>
            <p style={{ fontSize: '18px', color: '#60a5fa', fontWeight: '500' }}>
              What determines whether dissolving creates heat or absorbs it?
            </p>
          </div>
          <div style={{ display: 'grid', gap: '12px', width: '100%', maxWidth: '560px' }}>
            {[
              { id: 'A', text: 'The size of the salt crystals' },
              { id: 'B', text: 'The balance between bond-breaking energy and hydration energy' },
              { id: 'C', text: 'How fast you stir the solution' },
              { id: 'D', text: 'The initial temperature of the water' }
            ].map(option => (
              <button
                key={option.id}
                onPointerDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
                disabled={showPredictionFeedback}
                style={{
                  padding: '16px',
                  minHeight: '44px',
                  borderRadius: '12px',
                  textAlign: 'left',
                  transition: 'all 0.3s',
                  background: showPredictionFeedback && selectedPrediction === option.id
                    ? option.id === 'B' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
                    : showPredictionFeedback && option.id === 'B' ? 'rgba(16, 185, 129, 0.4)'
                    : 'rgba(51, 65, 85, 0.5)',
                  border: showPredictionFeedback && selectedPrediction === option.id
                    ? option.id === 'B' ? '2px solid #10b981' : '2px solid #ef4444'
                    : showPredictionFeedback && option.id === 'B' ? '2px solid #10b981'
                    : '2px solid transparent',
                  cursor: showPredictionFeedback ? 'default' : 'pointer',
                  color: '#e2e8f0'
                }}
              >
                <span style={{ fontWeight: 'bold', color: 'white' }}>{option.id}.</span>
                <span style={{ marginLeft: '8px' }}>{option.text}</span>
              </button>
            ))}
          </div>
          {showPredictionFeedback && (
            <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '12px', maxWidth: '560px' }}>
              <p style={{ color: '#10b981', fontWeight: '600' }}>
                Correct! Dissolving involves two competing processes: breaking the crystal lattice (absorbs energy) and water molecules surrounding the ions (releases energy). The winner determines if it's hot or cold!
              </p>
            </div>
          )}
        </div>
        {renderNavBar(showPredictionFeedback, 'Explore in the Lab →')}
      </div>
    );
  }

  // Render play phase
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingTop: '80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>Dissolution Energy Lab</h2>
          <p style={{ color: '#e2e8f0', marginBottom: '8px' }}>Select a solute and watch the energy balance determine temperature change!</p>
          <p style={{ color: '#60a5fa', fontSize: '14px', marginBottom: '16px' }}>This is how cold packs and hot packs work - the same chemistry powers real-world heating and cooling products!</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px', maxWidth: '640px', width: '100%' }}>
            {/* Solute selector */}
            <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px' }}>
              <label style={{ color: '#e2e8f0', fontSize: '14px', display: 'block', marginBottom: '8px' }}>Select Solute:</label>
              <div style={{ display: 'grid', gap: '8px' }}>
                {solutes.map((s, i) => (
                  <button
                    key={i}
                    onPointerDown={(e) => { e.preventDefault(); setSelectedSolute(i); resetExperiment(); }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: selectedSolute === i ? s.color : 'rgba(51, 65, 85, 0.5)',
                      border: selectedSolute === i ? `2px solid ${s.color}` : '2px solid transparent',
                      color: 'white',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    <span style={{ fontWeight: '600' }}>{s.name}</span>
                    <span style={{ marginLeft: '8px', opacity: 0.7 }}>({s.formula})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount slider */}
            <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px' }}>
              <label style={{ color: '#e2e8f0', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                Amount: {soluteAmount}g in 100mL water
              </label>
              <input
                type="range"
                min="5"
                max="30"
                value={soluteAmount}
                onChange={(e) => setSoluteAmount(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: solutes[selectedSolute].color }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                <span>5g</span>
                <span>30g</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' }}>
            {/* Beaker visualization */}
            <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px' }}>
              {renderBeakerVisualization()}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  onPointerDown={(e) => { e.preventDefault(); startMixing(); }}
                  disabled={isMixing || mixProgress >= 100}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    border: 'none',
                    cursor: isMixing || mixProgress >= 100 ? 'not-allowed' : 'pointer',
                    background: isMixing || mixProgress >= 100 ? '#475569' : 'linear-gradient(to right, #3b82f6, #2563eb)',
                    color: isMixing || mixProgress >= 100 ? '#e2e8f0' : 'white'
                  }}
                >
                  {isMixing ? 'Mixing...' : mixProgress >= 100 ? 'Done!' : 'Add & Mix'}
                </button>
                <button
                  onPointerDown={(e) => { e.preventDefault(); resetExperiment(); }}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    border: 'none',
                    cursor: 'pointer',
                    background: '#374151',
                    color: 'white'
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Energy chart */}
            <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px' }}>
              {renderEnergyChart(selectedSolute)}
            </div>
          </div>

          {/* Results panel */}
          {mixProgress >= 100 && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              borderRadius: '12px',
              background: solutes[selectedSolute].netEnergy > 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              border: `2px solid ${solutes[selectedSolute].netEnergy > 0 ? '#3b82f6' : '#ef4444'}`,
              maxWidth: '640px',
              width: '100%'
            }}>
              <h3 style={{ color: solutes[selectedSolute].netEnergy > 0 ? '#60a5fa' : '#f87171', fontWeight: 'bold', marginBottom: '8px' }}>
                {solutes[selectedSolute].netEnergy > 0 ? 'ENDOTHERMIC REACTION' : 'EXOTHERMIC REACTION'}
              </h3>
              <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
                {solutes[selectedSolute].netEnergy > 0
                  ? `Breaking the crystal bonds required more energy than hydration released. Net: +${solutes[selectedSolute].netEnergy.toFixed(1)} kJ/mol absorbed from water.`
                  : `Hydration released more energy than breaking bonds required. Net: ${solutes[selectedSolute].netEnergy.toFixed(1)} kJ/mol released to water.`
                }
              </p>
              <p style={{ color: '#e2e8f0', fontSize: '13px', marginTop: '8px' }}>
                Temperature changed by: <strong style={{ color: waterTemp < 25 ? '#3b82f6' : '#ef4444' }}>{(waterTemp - 25).toFixed(1)}C</strong>
              </p>
            </div>
          )}
        </div>
        {renderNavBar(true, 'Learn the Science →')}
      </div>
    );
  }

  // Render review phase
  if (phase === 'review') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingTop: '80px', paddingBottom: '100px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>The Science of Dissolution Energy</h2>

          {/* Reference user's prediction */}
          {selectedPrediction && (
            <div style={{
              background: selectedPrediction === 'B' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              maxWidth: '640px',
              border: `1px solid ${selectedPrediction === 'B' ? '#10b981' : '#ef4444'}`
            }}>
              <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
                You predicted that <strong>{selectedPrediction === 'B' ? 'the balance between bond-breaking energy and hydration energy' : 'other factors'}</strong> determine whether dissolving creates heat or absorbs it.
                {selectedPrediction === 'B' ? ' You were right!' : ' Let\'s see why the energy balance is the real answer.'}
              </p>
            </div>
          )}

          {/* SVG diagram for review */}
          <div style={{ marginBottom: '24px' }}>
            <svg viewBox="0 0 400 200" style={{ width: '100%', maxWidth: '400px' }}>
              <defs>
                <linearGradient id="reviewBg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>
              </defs>
              <rect width="400" height="200" fill="url(#reviewBg)" rx="8" />
              {/* Bond breaking (left) */}
              <rect x="30" y="50" width="100" height="100" fill="rgba(249, 115, 22, 0.2)" stroke="#f97316" strokeWidth="2" rx="8" />
              <text x="80" y="80" fill="#f97316" fontSize="11" textAnchor="middle" fontWeight="bold">Bond Breaking</text>
              <text x="80" y="100" fill="#e2e8f0" fontSize="10" textAnchor="middle">Absorbs Energy</text>
              <text x="80" y="120" fill="#fbbf24" fontSize="12" textAnchor="middle">+E (Endo)</text>
              {/* Plus sign */}
              <text x="155" y="105" fill="#e2e8f0" fontSize="24" textAnchor="middle">+</text>
              {/* Hydration (middle) */}
              <rect x="180" y="50" width="100" height="100" fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="2" rx="8" />
              <text x="230" y="80" fill="#3b82f6" fontSize="11" textAnchor="middle" fontWeight="bold">Hydration</text>
              <text x="230" y="100" fill="#e2e8f0" fontSize="10" textAnchor="middle">Releases Energy</text>
              <text x="230" y="120" fill="#60a5fa" fontSize="12" textAnchor="middle">-E (Exo)</text>
              {/* Equals sign */}
              <text x="305" y="105" fill="#e2e8f0" fontSize="24" textAnchor="middle">=</text>
              {/* Net result (right) */}
              <rect x="330" y="50" width="55" height="100" fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" strokeWidth="2" rx="8" />
              <text x="357" y="85" fill="#10b981" fontSize="10" textAnchor="middle" fontWeight="bold">Net</text>
              <text x="357" y="105" fill="#e2e8f0" fontSize="9" textAnchor="middle">Result</text>
              <text x="357" y="125" fill="#22c55e" fontSize="10" textAnchor="middle">Hot/Cold</text>
              {/* Legend */}
              <text x="200" y="175" fill="#e2e8f0" fontSize="10" textAnchor="middle">Energy Balance = Temperature Change</text>
            </svg>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', maxWidth: '900px' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 179, 8, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f97316', marginBottom: '12px' }}>Step 1: Breaking Bonds</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '8px' }}>
                Crystal lattice energy must be overcome to separate ions. This ALWAYS requires energy input (endothermic step).
              </p>
              <div style={{ fontFamily: 'monospace', textAlign: 'center', fontSize: '16px', color: '#f97316', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                NaCl(s) → Na+ + Cl- &nbsp; [+E]
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(6, 182, 212, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '12px' }}>Step 2: Hydration</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '8px' }}>
                Water molecules surround each ion (solvation). This ALWAYS releases energy (exothermic step).
              </p>
              <div style={{ fontFamily: 'monospace', textAlign: 'center', fontSize: '16px', color: '#3b82f6', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                Ions + H2O → Hydrated Ions &nbsp; [-E]
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(20, 184, 166, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(16, 185, 129, 0.3)', gridColumn: 'span 2' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981', marginBottom: '12px' }}>The Energy Balance</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                  <p style={{ color: '#60a5fa', fontWeight: '600' }}>If Lattice Energy {'>'} Hydration Energy:</p>
                  <p style={{ color: '#e2e8f0' }}>Net energy absorbed = ENDOTHERMIC</p>
                  <p style={{ color: '#3b82f6' }}>Solution gets COLDER</p>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                  <p style={{ color: '#f87171', fontWeight: '600' }}>If Hydration Energy {'>'} Lattice Energy:</p>
                  <p style={{ color: '#e2e8f0' }}>Net energy released = EXOTHERMIC</p>
                  <p style={{ color: '#ef4444' }}>Solution gets HOTTER</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {renderNavBar(true, 'Discover a Twist →')}
      </div>
    );
  }

  // Render twist predict phase
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingTop: '80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '24px' }}>The Ranking Twist</h2>
          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '640px', marginBottom: '24px' }}>
            <p style={{ fontSize: '18px', color: '#cbd5e1', marginBottom: '16px' }}>
              You have four different salts. You want to create the COLDEST possible instant cold pack.
            </p>
            <p style={{ fontSize: '18px', color: '#f59e0b', fontWeight: '500' }}>
              How would you rank these salts by cooling power (most cooling first)?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '16px' }}>
              {solutes.map((s, i) => (
                <div key={i} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', color: '#e2e8f0', fontSize: '14px' }}>
                  {s.name} ({s.formula})
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gap: '12px', width: '100%', maxWidth: '560px' }}>
            {[
              { id: 'A', text: 'NaOH > CaCl2 > NaCl > NH4NO3' },
              { id: 'B', text: 'CaCl2 > NaOH > NH4NO3 > NaCl' },
              { id: 'C', text: 'NH4NO3 > NaCl > CaCl2 > NaOH (only endo ones cool!)' },
              { id: 'D', text: 'They all cool equally - it depends on amount used' }
            ].map(option => (
              <button
                key={option.id}
                onPointerDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
                disabled={showTwistFeedback}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  textAlign: 'left',
                  transition: 'all 0.3s',
                  background: showTwistFeedback && twistPrediction === option.id
                    ? option.id === 'C' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
                    : showTwistFeedback && option.id === 'C' ? 'rgba(16, 185, 129, 0.4)'
                    : 'rgba(51, 65, 85, 0.5)',
                  border: showTwistFeedback && twistPrediction === option.id
                    ? option.id === 'C' ? '2px solid #10b981' : '2px solid #ef4444'
                    : showTwistFeedback && option.id === 'C' ? '2px solid #10b981'
                    : '2px solid transparent',
                  cursor: showTwistFeedback ? 'default' : 'pointer',
                  color: '#e2e8f0'
                }}
              >
                <span style={{ fontWeight: 'bold', color: 'white' }}>{option.id}.</span>
                <span style={{ marginLeft: '8px' }}>{option.text}</span>
              </button>
            ))}
          </div>
          {showTwistFeedback && (
            <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '12px', maxWidth: '560px' }}>
              <p style={{ color: '#10b981', fontWeight: '600' }}>
                Correct! Only endothermic dissolutions cool water. NH4NO3 is the champion cold-maker, used in real cold packs. CaCl2 and NaOH are exothermic - they HEAT water!
              </p>
            </div>
          )}
        </div>
        {renderNavBar(showTwistFeedback, 'Compare All Salts →')}
      </div>
    );
  }

  // Render twist play phase
  if (phase === 'twist_play') {
    const sortedSolutes = [...solutes].sort((a, b) => b.netEnergy - a.netEnergy);

    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingTop: '80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '16px' }}>Compare the "Heat Effect" of Different Salts</h2>
          <p style={{ color: '#e2e8f0', marginBottom: '24px' }}>See how each salt compares in their energy balance!</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', maxWidth: '900px', width: '100%', marginBottom: '24px' }}>
            {sortedSolutes.map((s, i) => (
              <div key={i} style={{
                background: 'rgba(30, 41, 59, 0.5)',
                borderRadius: '16px',
                padding: '16px',
                border: `2px solid ${s.color}`,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '12px', color: '#e2e8f0', marginBottom: '4px' }}>#{i + 1} {s.netEnergy > 0 ? 'COOLING' : 'HEATING'}</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>{s.name}</div>
                <div style={{ fontSize: '13px', color: '#e2e8f0', marginBottom: '12px' }}>{s.formula}</div>

                <div style={{
                  padding: '8px',
                  borderRadius: '8px',
                  background: s.netEnergy > 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  marginBottom: '8px'
                }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: s.netEnergy > 0 ? '#60a5fa' : '#f87171' }}>
                    {s.netEnergy > 0 ? '+' : ''}{s.netEnergy.toFixed(1)} kJ/mol
                  </div>
                </div>

                <div style={{ fontSize: '13px', color: s.netEnergy > 0 ? '#60a5fa' : '#f87171' }}>
                  Water temp: {s.tempChange > 0 ? '+' : ''}{s.tempChange}C
                </div>
              </div>
            ))}
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(20, 184, 166, 0.2))',
            borderRadius: '16px',
            padding: '20px',
            maxWidth: '700px',
            width: '100%',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            <h3 style={{ color: '#10b981', fontWeight: 'bold', marginBottom: '12px' }}>Key Insight</h3>
            <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
              Only <strong>endothermic</strong> salts (positive net energy) can cool water. Ammonium nitrate is the winner for cold packs because it absorbs the most energy per mole!
              Meanwhile, CaCl2 is used in hot packs and ice melt because it releases heat.
            </p>
          </div>
        </div>
        {renderNavBar(true, 'See Full Explanation →')}
      </div>
    );
  }

  // Render twist review phase
  if (phase === 'twist_review') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingTop: '80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '24px' }}>The Energy Balance Determines Everything</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', maxWidth: '900px' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(6, 182, 212, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#60a5fa', marginBottom: '12px' }}>❄️ Endothermic Winners</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '12px' }}>
                <strong>NH4NO3 (Ammonium Nitrate):</strong> The classic cold pack material. Its lattice energy far exceeds hydration energy, absorbing heat aggressively.
              </p>
              <p style={{ color: '#e2e8f0', fontSize: '13px' }}>
                Also: Potassium chloride (KCl), ammonium chloride (NH4Cl)
              </p>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(249, 115, 22, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#f87171', marginBottom: '12px' }}>🔥 Exothermic Winners</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '12px' }}>
                <strong>CaCl2 (Calcium Chloride):</strong> Hot pack material and ice melt. Its high hydration energy dominates, releasing lots of heat.
              </p>
              <p style={{ color: '#e2e8f0', fontSize: '13px' }}>
                Also: Sodium hydroxide (NaOH), magnesium chloride (MgCl2)
              </p>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.2), rgba(100, 116, 139, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(148, 163, 184, 0.3)', gridColumn: 'span 2' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '12px' }}>⚖️ Nearly Neutral</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
                <strong>NaCl (Table Salt):</strong> Almost perfect balance between lattice and hydration energy. Slight endothermic effect (-0.5C per 10g) is barely noticeable. This is why salt water doesn't feel hot or cold!
              </p>
            </div>
          </div>
        </div>
        {renderNavBar(true, 'Explore Applications →')}
      </div>
    );
  }

  // Render transfer phase
  if (phase === 'transfer') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingTop: '80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '24px' }}>Real-World Applications</h2>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {applications.map((app, index) => (
              <button
                key={index}
                onPointerDown={(e) => { e.preventDefault(); setActiveAppTab(index); }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: '500',
                  transition: 'all 0.3s',
                  background: activeAppTab === index ? '#3b82f6' : completedApps.has(index) ? 'rgba(16, 185, 129, 0.3)' : '#374151',
                  border: completedApps.has(index) ? '1px solid #10b981' : '1px solid transparent',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                {app.icon} {app.title.split(' ')[0]}
              </button>
            ))}
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '640px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '36px' }}>{applications[activeAppTab].icon}</span>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>{applications[activeAppTab].title}</h3>
            </div>
            <p style={{ fontSize: '16px', color: '#cbd5e1', marginBottom: '12px' }}>{applications[activeAppTab].description}</p>
            <p style={{ fontSize: '14px', color: '#e2e8f0' }}>{applications[activeAppTab].details}</p>

            {!completedApps.has(activeAppTab) && (
              <button
                onPointerDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }}
                style={{
                  marginTop: '16px',
                  padding: '12px 24px',
                  minHeight: '44px',
                  background: '#10b981',
                  color: 'white',
                  borderRadius: '8px',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Got It
              </button>
            )}
          </div>

          <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#e2e8f0' }}>Progress:</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {applications.map((_, i) => (
                <div key={i} style={{ width: '12px', height: '12px', borderRadius: '50%', background: completedApps.has(i) ? '#10b981' : '#475569' }} />
              ))}
            </div>
            <span style={{ color: '#e2e8f0' }}>{completedApps.size}/4</span>
          </div>
        </div>
        {renderNavBar(completedApps.size >= 4, 'Take the Test →')}
      </div>
    );
  }

  // Render test phase
  if (phase === 'test') {
    const score = calculateScore();

    if (showTestResults) {
      return (
        <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingTop: '80px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
            <div style={{
              background: score >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '640px',
              width: '100%',
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>{score >= 8 ? '🎉' : '📚'}</div>
              <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>Score: {score}/10</h3>
              <p style={{ color: '#cbd5e1' }}>
                {score >= 8 ? 'Excellent! You\'ve mastered dissolution thermodynamics!' : 'Keep studying! Review and try again.'}
              </p>
            </div>

            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{
                  background: 'rgba(30, 41, 59, 0.5)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '12px',
                  maxWidth: '640px',
                  width: '100%',
                  borderLeft: `4px solid ${isCorrect ? '#10b981' : '#ef4444'}`
                }}>
                  <p style={{ color: 'white', fontWeight: '500', marginBottom: '12px' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{
                      padding: '8px 12px',
                      marginBottom: '4px',
                      borderRadius: '6px',
                      background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                      color: opt.correct ? '#10b981' : userAnswer === oIndex ? '#ef4444' : '#e2e8f0'
                    }}>
                      {opt.correct ? '✓' : userAnswer === oIndex ? '✗' : '○'} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderNavBar(score >= 8, score >= 8 ? 'Complete Mastery →' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingTop: '80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', width: '100%', maxWidth: '640px' }}>
            <h2 style={{ color: 'white', fontSize: '20px' }}>Knowledge Test</h2>
            <span style={{ color: '#e2e8f0' }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
          </div>

          <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', width: '100%', maxWidth: '640px' }}>
            {testQuestions.map((_, i) => (
              <div
                key={i}
                onClick={() => setCurrentTestQuestion(i)}
                style={{
                  flex: 1,
                  height: '4px',
                  borderRadius: '2px',
                  background: testAnswers[i] !== null ? '#3b82f6' : i === currentTestQuestion ? '#64748b' : 'rgba(255,255,255,0.1)',
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '20px', marginBottom: '16px', maxWidth: '640px', width: '100%' }}>
            <p style={{ color: 'white', fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '640px' }}>
            {currentQ.options.map((opt, oIndex) => (
              <button
                key={oIndex}
                onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  border: testAnswers[currentTestQuestion] === oIndex ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.2)',
                  background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px'
                }}
              >
                {opt.text}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', width: '100%', maxWidth: '640px', marginTop: '16px' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid #64748b',
                background: 'transparent',
                color: currentTestQuestion === 0 ? '#64748b' : 'white',
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              ← Previous
            </button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#3b82f6',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={() => setShowTestResults(true)}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null) ? '#64748b' : '#10b981',
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer'
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

  // Render mastery phase
  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingTop: '80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px', textAlign: 'center' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(16, 185, 129, 0.2), rgba(239, 68, 68, 0.2))',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '640px'
          }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>🏆</div>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>Thermochemistry Master!</h1>
            <p style={{ fontSize: '18px', color: '#cbd5e1', marginBottom: '24px' }}>
              You've mastered the energy balance of dissolution - from cold packs to hot packs!
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🧊</div>
                <p style={{ fontSize: '14px', color: '#cbd5e1' }}>Endothermic</p>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔥</div>
                <p style={{ fontSize: '14px', color: '#cbd5e1' }}>Exothermic</p>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚡</div>
                <p style={{ fontSize: '14px', color: '#cbd5e1' }}>Lattice Energy</p>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>💧</div>
                <p style={{ fontSize: '14px', color: '#cbd5e1' }}>Hydration Energy</p>
              </div>
            </div>
          </div>
        </div>
        {renderNavBar(true, 'Complete Game →')}
      </div>
    );
  }

  return null;
};

export default EndothermicExothermicRenderer;
