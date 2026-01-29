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
  { name: 'Sodium Chloride', formula: 'NaCl', bondEnergy: 3.9, hydrationEnergy: -3.8, netEnergy: 0.1, color: '#94a3b8', tempChange: -0.5 },
  { name: 'Calcium Chloride', formula: 'CaCl2', bondEnergy: -17.4, hydrationEnergy: -64.6, netEnergy: -82, color: '#f97316', tempChange: 12 },
  { name: 'Sodium Hydroxide', formula: 'NaOH', bondEnergy: -20.5, hydrationEnergy: -23.4, netEnergy: -43.9, color: '#ef4444', tempChange: 8 },
];

const EndothermicExothermicRenderer: React.FC<EndothermicExothermicRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer
}) => {
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

  // Render energy bar chart
  const renderEnergyChart = (soluteIndex: number, showLabels: boolean = true) => {
    const solute = solutes[soluteIndex];
    const maxEnergy = 100;
    const bondHeight = Math.abs(solute.bondEnergy) / maxEnergy * 150;
    const hydrationHeight = Math.abs(solute.hydrationEnergy) / maxEnergy * 150;
    const netHeight = Math.abs(solute.netEnergy) / maxEnergy * 150;

    return (
      <svg viewBox="0 0 300 200" style={{ width: '100%', maxWidth: '300px' }}>
        {/* Background */}
        <rect width="300" height="200" fill="#1e293b" rx="8" />

        {/* Zero line */}
        <line x1="40" y1="100" x2="280" y2="100" stroke="#475569" strokeWidth="2" strokeDasharray="4" />
        <text x="30" y="104" fontSize="10" fill="#94a3b8" textAnchor="end">0</text>

        {/* Bond Energy (always positive - absorbs) */}
        <rect
          x="60"
          y={100 - bondHeight}
          width="50"
          height={bondHeight}
          fill="#f97316"
          rx="4"
        />
        {showLabels && (
          <>
            <text x="85" y={90 - bondHeight} fontSize="9" fill="#f97316" textAnchor="middle">
              +{solute.bondEnergy.toFixed(1)}
            </text>
            <text x="85" y="185" fontSize="9" fill="#94a3b8" textAnchor="middle">Bond</text>
            <text x="85" y="195" fontSize="8" fill="#94a3b8" textAnchor="middle">Breaking</text>
          </>
        )}

        {/* Hydration Energy (always negative - releases) */}
        <rect
          x="125"
          y={100}
          width="50"
          height={hydrationHeight}
          fill="#3b82f6"
          rx="4"
        />
        {showLabels && (
          <>
            <text x="150" y={110 + hydrationHeight} fontSize="9" fill="#3b82f6" textAnchor="middle">
              {solute.hydrationEnergy.toFixed(1)}
            </text>
            <text x="150" y="185" fontSize="9" fill="#94a3b8" textAnchor="middle">Hydration</text>
            <text x="150" y="195" fontSize="8" fill="#94a3b8" textAnchor="middle">Energy</text>
          </>
        )}

        {/* Net Energy */}
        <rect
          x="190"
          y={solute.netEnergy > 0 ? 100 - netHeight : 100}
          width="50"
          height={netHeight}
          fill={solute.netEnergy > 0 ? '#22c55e' : '#ef4444'}
          rx="4"
        />
        {showLabels && (
          <>
            <text
              x="215"
              y={solute.netEnergy > 0 ? 90 - netHeight : 110 + netHeight}
              fontSize="9"
              fill={solute.netEnergy > 0 ? '#22c55e' : '#ef4444'}
              textAnchor="middle"
            >
              {solute.netEnergy > 0 ? '+' : ''}{solute.netEnergy.toFixed(1)}
            </text>
            <text x="215" y="185" fontSize="9" fill="#94a3b8" textAnchor="middle">Net</text>
            <text x="215" y="195" fontSize="8" fill="#94a3b8" textAnchor="middle">kJ/mol</text>
          </>
        )}

        {/* Labels */}
        <text x="150" y="20" fontSize="11" fill="#e2e8f0" textAnchor="middle" fontWeight="bold">
          {solute.name}
        </text>
        <text x="150" y="35" fontSize="10" fill="#94a3b8" textAnchor="middle">
          {solute.netEnergy > 0 ? 'ENDOTHERMIC (Cools)' : 'EXOTHERMIC (Heats)'}
        </text>

        {/* Axis labels */}
        <text x="30" y="60" fontSize="8" fill="#94a3b8" textAnchor="end">Absorbs</text>
        <text x="30" y="150" fontSize="8" fill="#94a3b8" textAnchor="end">Releases</text>
      </svg>
    );
  };

  // Render beaker visualization
  const renderBeakerVisualization = () => {
    const solute = solutes[selectedSolute];

    return (
      <svg viewBox="0 0 300 250" style={{ width: '100%', maxWidth: '300px' }}>
        {/* Background */}
        <rect width="300" height="250" fill="#0f172a" rx="8" />

        {/* Beaker */}
        <path
          d="M 80 60 L 80 180 Q 80 200 100 200 L 200 200 Q 220 200 220 180 L 220 60"
          fill="none"
          stroke="#64748b"
          strokeWidth="4"
        />

        {/* Water */}
        <rect
          x="84"
          y="80"
          width="132"
          height="116"
          fill={getTempColor(waterTemp)}
          opacity="0.6"
          rx="2"
        />

        {/* Dissolved color change */}
        {mixProgress > 0 && (
          <rect
            x="84"
            y={196 - mixProgress * 1.16}
            width="132"
            height={mixProgress * 1.16}
            fill={solute.color}
            opacity={0.4}
            rx="2"
          />
        )}

        {/* Particles */}
        {particles.map(p => (
          <circle
            key={p.id}
            cx={p.x}
            cy={p.y + (p.dissolving ? animationFrame % 30 : 0)}
            r={p.dissolving ? 3 : 5}
            fill={solute.color}
            opacity={p.dissolving ? 0.5 : 1}
          />
        ))}

        {/* Temperature indicator */}
        <g transform="translate(250, 80)">
          <rect x="-15" y="0" width="30" height="100" fill="#1f2937" stroke="#374151" rx="4" />
          <rect
            x="-10"
            y={100 - (waterTemp / 50) * 90}
            width="20"
            height={(waterTemp / 50) * 90}
            fill={getTempColor(waterTemp)}
            rx="2"
          />
          <text x="0" y="-10" textAnchor="middle" fontSize="14" fill="#e2e8f0" fontWeight="bold">
            {waterTemp.toFixed(1)}C
          </text>
        </g>

        {/* Heat flow arrows */}
        {isMixing && (
          <g>
            {solute.netEnergy > 0 ? (
              // Endothermic - arrows pointing IN (absorbing heat)
              <>
                <path d={`M 60 ${140 + Math.sin(animationFrame / 10) * 5} L 80 140`} stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrowBlue)" />
                <path d={`M 240 ${140 + Math.sin(animationFrame / 10 + 1) * 5} L 220 140`} stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrowBlue)" />
              </>
            ) : (
              // Exothermic - arrows pointing OUT (releasing heat)
              <>
                <path d={`M 80 140 L 60 ${140 + Math.sin(animationFrame / 10) * 5}`} stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowRed)" />
                <path d={`M 220 140 L 240 ${140 + Math.sin(animationFrame / 10 + 1) * 5}`} stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowRed)" />
              </>
            )}
          </g>
        )}

        {/* Arrow markers */}
        <defs>
          <marker id="arrowBlue" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 Z" fill="#3b82f6" />
          </marker>
          <marker id="arrowRed" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 Z" fill="#ef4444" />
          </marker>
        </defs>

        {/* Progress bar */}
        <rect x="84" y="210" width="132" height="8" fill="#1f2937" rx="4" />
        <rect x="84" y="210" width={mixProgress * 1.32} height="8" fill="#22c55e" rx="4" />

        {/* Status text */}
        <text x="150" y="235" textAnchor="middle" fontSize="11" fill="#94a3b8">
          {isMixing ? `Dissolving: ${mixProgress.toFixed(0)}%` : mixProgress >= 100 ? 'Complete!' : 'Ready to mix'}
        </text>
      </svg>
    );
  };

  // Fixed footer navigation
  const renderFooter = (canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      minHeight: '72px',
      background: 'rgba(30, 41, 59, 0.98)',
      borderTop: '1px solid rgba(148, 163, 184, 0.2)',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
      padding: '16px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ color: '#94a3b8', fontSize: '14px' }}>
        Endothermic & Exothermic
      </div>
      <button
        onClick={onPhaseComplete}
        disabled={!canProceed}
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? 'linear-gradient(to right, #3b82f6, #2563eb)' : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : '#64748b',
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px'
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // Render hook phase
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
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

          <p style={{ fontSize: '18px', color: '#94a3b8', maxWidth: '500px', marginBottom: '40px' }}>
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
              <p style={{ fontSize: '16px', color: '#94a3b8', lineHeight: '1.6' }}>
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
        {renderFooter(true, 'Make a Prediction →')}
      </div>
    );
  }

  // Render predict phase
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '24px' }}>Make Your Prediction</h2>
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
                onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
                disabled={showPredictionFeedback}
                style={{
                  padding: '16px',
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
        {renderFooter(showPredictionFeedback, 'Explore in the Lab →')}
      </div>
    );
  }

  // Render play phase
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>Dissolution Energy Lab</h2>
          <p style={{ color: '#94a3b8', marginBottom: '16px' }}>Select a solute and watch the energy balance determine temperature change!</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px', maxWidth: '640px', width: '100%' }}>
            {/* Solute selector */}
            <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px' }}>
              <label style={{ color: '#94a3b8', fontSize: '14px', display: 'block', marginBottom: '8px' }}>Select Solute:</label>
              <div style={{ display: 'grid', gap: '8px' }}>
                {solutes.map((s, i) => (
                  <button
                    key={i}
                    onMouseDown={(e) => { e.preventDefault(); setSelectedSolute(i); resetExperiment(); }}
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
              <label style={{ color: '#94a3b8', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
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
                  onMouseDown={(e) => { e.preventDefault(); startMixing(); }}
                  disabled={isMixing || mixProgress >= 100}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    border: 'none',
                    cursor: isMixing || mixProgress >= 100 ? 'not-allowed' : 'pointer',
                    background: isMixing || mixProgress >= 100 ? '#475569' : 'linear-gradient(to right, #3b82f6, #2563eb)',
                    color: isMixing || mixProgress >= 100 ? '#94a3b8' : 'white'
                  }}
                >
                  {isMixing ? 'Mixing...' : mixProgress >= 100 ? 'Done!' : 'Add & Mix'}
                </button>
                <button
                  onMouseDown={(e) => { e.preventDefault(); resetExperiment(); }}
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
              <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '8px' }}>
                Temperature changed by: <strong style={{ color: waterTemp < 25 ? '#3b82f6' : '#ef4444' }}>{(waterTemp - 25).toFixed(1)}C</strong>
              </p>
            </div>
          )}
        </div>
        {renderFooter(true, 'Learn the Science →')}
      </div>
    );
  }

  // Render review phase
  if (phase === 'review') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '24px' }}>The Science of Dissolution Energy</h2>

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
                  <p style={{ color: '#94a3b8' }}>Net energy absorbed = ENDOTHERMIC</p>
                  <p style={{ color: '#3b82f6' }}>Solution gets COLDER</p>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                  <p style={{ color: '#f87171', fontWeight: '600' }}>If Hydration Energy {'>'} Lattice Energy:</p>
                  <p style={{ color: '#94a3b8' }}>Net energy released = EXOTHERMIC</p>
                  <p style={{ color: '#ef4444' }}>Solution gets HOTTER</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {renderFooter(true, 'Discover a Twist →')}
      </div>
    );
  }

  // Render twist predict phase
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
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
                onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
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
        {renderFooter(showTwistFeedback, 'Compare All Salts →')}
      </div>
    );
  }

  // Render twist play phase
  if (phase === 'twist_play') {
    const sortedSolutes = [...solutes].sort((a, b) => b.netEnergy - a.netEnergy);

    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '16px' }}>Compare the "Heat Effect" of Different Salts</h2>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>See how each salt compares in their energy balance!</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', maxWidth: '900px', width: '100%', marginBottom: '24px' }}>
            {sortedSolutes.map((s, i) => (
              <div key={i} style={{
                background: 'rgba(30, 41, 59, 0.5)',
                borderRadius: '16px',
                padding: '16px',
                border: `2px solid ${s.color}`,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>#{i + 1} {s.netEnergy > 0 ? 'COOLING' : 'HEATING'}</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>{s.name}</div>
                <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>{s.formula}</div>

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
        {renderFooter(true, 'See Full Explanation →')}
      </div>
    );
  }

  // Render twist review phase
  if (phase === 'twist_review') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '24px' }}>The Energy Balance Determines Everything</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', maxWidth: '900px' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(6, 182, 212, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#60a5fa', marginBottom: '12px' }}>❄️ Endothermic Winners</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '12px' }}>
                <strong>NH4NO3 (Ammonium Nitrate):</strong> The classic cold pack material. Its lattice energy far exceeds hydration energy, absorbing heat aggressively.
              </p>
              <p style={{ color: '#94a3b8', fontSize: '13px' }}>
                Also: Potassium chloride (KCl), ammonium chloride (NH4Cl)
              </p>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(249, 115, 22, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#f87171', marginBottom: '12px' }}>🔥 Exothermic Winners</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '12px' }}>
                <strong>CaCl2 (Calcium Chloride):</strong> Hot pack material and ice melt. Its high hydration energy dominates, releasing lots of heat.
              </p>
              <p style={{ color: '#94a3b8', fontSize: '13px' }}>
                Also: Sodium hydroxide (NaOH), magnesium chloride (MgCl2)
              </p>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.2), rgba(100, 116, 139, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(148, 163, 184, 0.3)', gridColumn: 'span 2' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '12px' }}>⚖️ Nearly Neutral</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
                <strong>NaCl (Table Salt):</strong> Almost perfect balance between lattice and hydration energy. Slight endothermic effect (-0.5C per 10g) is barely noticeable. This is why salt water doesn't feel hot or cold!
              </p>
            </div>
          </div>
        </div>
        {renderFooter(true, 'Explore Applications →')}
      </div>
    );
  }

  // Render transfer phase
  if (phase === 'transfer') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '24px' }}>Real-World Applications</h2>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {applications.map((app, index) => (
              <button
                key={index}
                onMouseDown={(e) => { e.preventDefault(); setActiveAppTab(index); }}
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
            <p style={{ fontSize: '14px', color: '#94a3b8' }}>{applications[activeAppTab].details}</p>

            {!completedApps.has(activeAppTab) && (
              <button
                onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }}
                style={{
                  marginTop: '16px',
                  padding: '8px 16px',
                  background: '#10b981',
                  color: 'white',
                  borderRadius: '8px',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Mark as Understood
              </button>
            )}
          </div>

          <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#94a3b8' }}>Progress:</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {applications.map((_, i) => (
                <div key={i} style={{ width: '12px', height: '12px', borderRadius: '50%', background: completedApps.has(i) ? '#10b981' : '#475569' }} />
              ))}
            </div>
            <span style={{ color: '#94a3b8' }}>{completedApps.size}/4</span>
          </div>
        </div>
        {renderFooter(completedApps.size >= 4, 'Take the Test →')}
      </div>
    );
  }

  // Render test phase
  if (phase === 'test') {
    const score = calculateScore();

    if (showTestResults) {
      return (
        <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
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
                      color: opt.correct ? '#10b981' : userAnswer === oIndex ? '#ef4444' : '#94a3b8'
                    }}>
                      {opt.correct ? '✓' : userAnswer === oIndex ? '✗' : '○'} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderFooter(score >= 8, score >= 8 ? 'Complete Mastery →' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', width: '100%', maxWidth: '640px' }}>
            <h2 style={{ color: 'white', fontSize: '20px' }}>Knowledge Test</h2>
            <span style={{ color: '#94a3b8' }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
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
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
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
        {renderFooter(true, 'Complete Game →')}
      </div>
    );
  }

  return null;
};

export default EndothermicExothermicRenderer;
