'use client';

import React, { useState, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  'hook': 'Hook', 'predict': 'Predict', 'play': 'Lab', 'review': 'Review', 'twist_predict': 'Twist Predict',
  'twist_play': 'Twist Lab', 'twist_review': 'Twist Review', 'transfer': 'Transfer', 'test': 'Test', 'mastery': 'Mastery'
};

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'parameter_changed'
  | 'twist_prediction_made'
  | 'app_explored'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved';

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

interface Props {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const GasLawsRenderer: React.FC<Props> = ({ onGameEvent, gamePhase, onPhaseComplete }) => {
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

  // Boyle's Law simulation
  const [volume, setVolume] = useState(100);
  const [pressure, setPressure] = useState(1);

  // Twist: Charles's Law
  const [twistTemp, setTwistTemp] = useState(300);
  const [twistVolume, setTwistVolume] = useState(100);

  // Molecule positions
  const [molecules, setMolecules] = useState<Array<{x: number, y: number, vx: number, vy: number}>>([]);

  // Mobile detection
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

  // Phase sync
  useEffect(() => {
    if (gamePhase !== undefined && gamePhase !== phase && phaseOrder.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // Initialize molecules
  useEffect(() => {
    const mols = Array.from({ length: 30 }, () => ({
      x: Math.random() * 180 + 10,
      y: Math.random() * 150 + 10,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4
    }));
    setMolecules(mols);
  }, []);

  // Boyle's Law: PV = constant (at constant T)
  useEffect(() => {
    if (phase === 'play') {
      setPressure(100 / volume);
    }
  }, [volume, phase]);

  // Charles's Law: V/T = constant (at constant P)
  useEffect(() => {
    if (phase === 'twist_play') {
      setTwistVolume((twistTemp / 300) * 100);
    }
  }, [twistTemp, phase]);

  // Molecule animation
  useEffect(() => {
    const interval = setInterval(() => {
      setMolecules(prev => {
        const containerHeight = phase === 'play' ? (volume / 100) * 150 : (twistVolume / 100) * 150;
        const speed = phase === 'twist_play' ? Math.sqrt(twistTemp / 300) : 1;

        return prev.map(mol => {
          let newX = mol.x + mol.vx * speed;
          let newY = mol.y + mol.vy * speed;
          let newVx = mol.vx;
          let newVy = mol.vy;

          if (newX < 10 || newX > 190) {
            newVx = -newVx;
            newX = Math.max(10, Math.min(190, newX));
          }
          if (newY < 10 || newY > 10 + containerHeight) {
            newVy = -newVy;
            newY = Math.max(10, Math.min(10 + containerHeight, newY));
          }

          newVx += (Math.random() - 0.5) * 0.5 * speed;
          newVy += (Math.random() - 0.5) * 0.5 * speed;

          return { x: newX, y: newY, vx: newVx, vy: newVy };
        });
      });
    }, 30);
    return () => clearInterval(interval);
  }, [phase, volume, twistVolume, twistTemp]);

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

  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    if (newPhase === 'play') {
      setVolume(100);
      setPressure(1);
    }
    if (newPhase === 'twist_play') {
      setTwistTemp(300);
      setTwistVolume(100);
    }
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
  }, [playSound, onPhaseComplete, onGameEvent]);

  const handlePrediction = useCallback((prediction: string) => {
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'C' ? 'success' : 'failure');
    onGameEvent?.({ type: 'prediction_made', data: { prediction, correct: prediction === 'C' } });
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'B' ? 'success' : 'failure');
    onGameEvent?.({ type: 'twist_prediction_made', data: { prediction, correct: prediction === 'B' } });
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
    playSound('click');
  }, [playSound]);

  const handleAppComplete = useCallback((appIndex: number) => {
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    onGameEvent?.({ type: 'app_explored', data: { appIndex } });
  }, [playSound, onGameEvent]);

  // Test questions
  const testQuestions = [
    { question: "If you halve the volume of a gas at constant temperature, the pressure:", options: [{ text: "Halves", correct: false }, { text: "Doubles", correct: true }, { text: "Stays the same", correct: false }, { text: "Quadruples", correct: false }] },
    { question: "Boyle's Law states that at constant temperature:", options: [{ text: "P and V are directly proportional", correct: false }, { text: "P and V are inversely proportional", correct: true }, { text: "P and T are directly proportional", correct: false }, { text: "V and T are inversely proportional", correct: false }] },
    { question: "If a gas is heated at constant pressure, its volume will:", options: [{ text: "Decrease", correct: false }, { text: "Increase", correct: true }, { text: "Stay the same", correct: false }, { text: "Become zero", correct: false }] },
    { question: "Charles's Law relates:", options: [{ text: "Pressure and volume", correct: false }, { text: "Volume and temperature", correct: true }, { text: "Pressure and temperature", correct: false }, { text: "All three variables", correct: false }] },
    { question: "The Ideal Gas Law is expressed as:", options: [{ text: "PV = nRT", correct: true }, { text: "P/V = nRT", correct: false }, { text: "P + V = nRT", correct: false }, { text: "PV = n/RT", correct: false }] },
    { question: "At absolute zero (0 K), an ideal gas would have:", options: [{ text: "Maximum pressure", correct: false }, { text: "Zero volume", correct: true }, { text: "Maximum volume", correct: false }, { text: "Infinite pressure", correct: false }] },
    { question: "If you double both pressure and temperature of a gas, the volume:", options: [{ text: "Doubles", correct: false }, { text: "Halves", correct: false }, { text: "Stays the same", correct: true }, { text: "Quadruples", correct: false }] },
    { question: "A weather balloon expands as it rises because:", options: [{ text: "Temperature increases", correct: false }, { text: "Atmospheric pressure decreases", correct: true }, { text: "More gas enters", correct: false }, { text: "Gravity weakens", correct: false }] },
    { question: "The gas constant R has units of:", options: [{ text: "J/(mol*K)", correct: false }, { text: "Pa*m^3", correct: false }, { text: "atm*L", correct: false }, { text: "All of these (equivalent)", correct: true }] },
    { question: "Real gases deviate from ideal behavior at:", options: [{ text: "Low pressure and high temperature", correct: false }, { text: "High pressure and low temperature", correct: true }, { text: "All conditions equally", correct: false }, { text: "Only at room temperature", correct: false }] }
  ];

  const calculateScore = () => testAnswers.reduce((score, answer, index) => score + (testQuestions[index].options[answer]?.correct ? 1 : 0), 0);

  // Piston visualization for Boyle's Law - Premium SVG Graphics
  const renderPistonViz = () => {
    const containerHeight = (volume / 100) * 150;
    // Calculate pressure color - higher pressure = more red/orange
    const pressureIntensity = Math.min(1, (pressure - 0.5) / 3.5);
    const pressureHue = 270 - pressureIntensity * 30; // violet to purple-red

    return (
      <>
        <svg viewBox="0 0 250 200" className="w-full h-full">
          <defs>
            {/* Premium cylinder container gradient - metallic appearance */}
            <linearGradient id="gasContainerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="15%" stopColor="#1e293b" />
              <stop offset="40%" stopColor="#334155" />
              <stop offset="60%" stopColor="#334155" />
              <stop offset="85%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Piston 3D metallic gradient */}
            <linearGradient id="gasPistonGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="15%" stopColor="#cbd5e1" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="85%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Piston handle metallic gradient */}
            <linearGradient id="gasPistonHandleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="30%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="70%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* Gas particle gradient with glow */}
            <radialGradient id="gasParticleGrad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#c4b5fd" />
              <stop offset="40%" stopColor="#a78bfa" />
              <stop offset="70%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#7c3aed" />
            </radialGradient>

            {/* High pressure particle gradient (warmer) */}
            <radialGradient id="gasParticleHighPressure" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </radialGradient>

            {/* Cylinder inner wall reflection */}
            <linearGradient id="gasCylinderInner" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#0f172a" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#1e293b" stopOpacity="0.8" />
            </linearGradient>

            {/* Pressure zone gradient - dynamic based on pressure */}
            <linearGradient id="gasPressureZone" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.1 + pressureIntensity * 0.2} />
              <stop offset="50%" stopColor="#7c3aed" stopOpacity={0.05 + pressureIntensity * 0.15} />
              <stop offset="100%" stopColor="#6d28d9" stopOpacity="0" />
            </linearGradient>

            {/* Particle glow filter */}
            <filter id="gasParticleGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Piston shadow filter */}
            <filter id="gasPistonShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="shadow" />
              <feOffset dx="0" dy="4" in="shadow" result="offsetShadow" />
              <feMerge>
                <feMergeNode in="offsetShadow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Ambient pressure glow */}
            <filter id="gasPressureGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Metallic highlight filter */}
            <filter id="gasMetallicSheen">
              <feGaussianBlur stdDeviation="0.5" />
            </filter>
          </defs>

          {/* Background */}
          <rect width="250" height="200" fill="#020617" rx="8" />

          {/* Subtle grid pattern */}
          <pattern id="gasLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
          </pattern>
          <rect width="250" height="200" fill="url(#gasLabGrid)" rx="8" />

          {/* Cylinder outer shell */}
          <rect x="25" y="10" width="200" height="180" rx="6" fill="url(#gasContainerGrad)" stroke="#475569" strokeWidth="2" />

          {/* Cylinder inner wall */}
          <rect x="30" y="15" width="190" height="170" rx="4" fill="url(#gasCylinderInner)" />

          {/* Pressure zone visualization */}
          <rect
            x="30"
            y={20 + (150 - containerHeight)}
            width="190"
            height={containerHeight + 10}
            fill="url(#gasPressureZone)"
            rx="3"
          />

          {/* Gas molecules with glow */}
          {molecules.map((mol, i) => {
            const adjustedY = mol.y - (150 - containerHeight) + 25;
            if (adjustedY > 35 + (150 - containerHeight) && adjustedY < 180) {
              return (
                <g key={i} filter="url(#gasParticleGlow)">
                  <circle
                    cx={mol.x + 25}
                    cy={adjustedY}
                    r="6"
                    fill={pressure > 2 ? "url(#gasParticleHighPressure)" : "url(#gasParticleGrad)"}
                    opacity={0.9}
                  />
                  {/* Specular highlight */}
                  <circle
                    cx={mol.x + 23}
                    cy={adjustedY - 2}
                    r="2"
                    fill="white"
                    opacity="0.4"
                  />
                </g>
              );
            }
            return null;
          })}

          {/* Piston with 3D effect */}
          <g filter="url(#gasPistonShadow)">
            {/* Piston handle */}
            <rect
              x="110"
              y={0}
              width="30"
              height={20 + (150 - containerHeight)}
              fill="url(#gasPistonHandleGrad)"
              rx="2"
            />
            {/* Handle grip lines */}
            {[0, 8, 16].map((offset, i) => (
              <rect
                key={i}
                x="112"
                y={4 + offset}
                width="26"
                height="2"
                fill="#334155"
                opacity="0.5"
                rx="1"
              />
            ))}

            {/* Piston head */}
            <rect
              x="30"
              y={15 + (150 - containerHeight)}
              width="190"
              height="20"
              rx="3"
              fill="url(#gasPistonGrad)"
              stroke="#64748b"
              strokeWidth="1"
            />
            {/* Piston bevel highlight */}
            <rect
              x="32"
              y={16 + (150 - containerHeight)}
              width="186"
              height="3"
              fill="white"
              opacity="0.2"
              rx="1"
            />
          </g>

          {/* Cylinder rim highlights */}
          <rect x="25" y="10" width="200" height="3" fill="white" opacity="0.1" rx="6" />
          <rect x="25" y="187" width="200" height="3" fill="black" opacity="0.3" rx="6" />
        </svg>

        {/* Labels outside SVG using typo system */}
        <div className="flex justify-center gap-6 mt-3">
          <div className="text-center">
            <div
              className="font-bold"
              style={{
                fontSize: typo.bodyLarge,
                color: pressure > 2 ? '#f59e0b' : '#8b5cf6'
              }}
            >
              P = {pressure.toFixed(2)} atm
            </div>
          </div>
          <div className="text-center">
            <div
              className="font-medium"
              style={{ fontSize: typo.body, color: '#64748b' }}
            >
              V = {volume}%
            </div>
          </div>
        </div>
      </>
    );
  };

  // Temperature effect visualization for Charles's Law - Premium SVG Graphics
  const renderTempViz = () => {
    const containerHeight = (twistVolume / 100) * 150;
    // Temperature color interpolation
    const tempNormalized = (twistTemp - 200) / 300; // 0 at 200K, 1 at 500K
    const isHot = twistTemp > 350;
    const isCold = twistTemp < 250;

    return (
      <>
        <svg viewBox="0 0 250 200" className="w-full h-full">
          <defs>
            {/* Premium balloon gradient - changes with temperature */}
            <radialGradient id="gasBalloonGrad" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor={isHot ? '#fef3c7' : isCold ? '#cffafe' : '#ddd6fe'} stopOpacity="0.4" />
              <stop offset="30%" stopColor={isHot ? '#fcd34d' : isCold ? '#67e8f9' : '#a78bfa'} stopOpacity="0.3" />
              <stop offset="60%" stopColor={isHot ? '#f59e0b' : isCold ? '#22d3ee' : '#8b5cf6'} stopOpacity="0.2" />
              <stop offset="100%" stopColor={isHot ? '#d97706' : isCold ? '#06b6d4' : '#7c3aed'} stopOpacity="0.15" />
            </radialGradient>

            {/* Balloon surface gradient */}
            <linearGradient id="gasBalloonSurface" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isHot ? '#fbbf24' : isCold ? '#22d3ee' : '#a78bfa'} stopOpacity="0.6" />
              <stop offset="50%" stopColor={isHot ? '#f59e0b' : isCold ? '#06b6d4' : '#8b5cf6'} stopOpacity="0.4" />
              <stop offset="100%" stopColor={isHot ? '#d97706' : isCold ? '#0891b2' : '#7c3aed'} stopOpacity="0.6" />
            </linearGradient>

            {/* Hot particle gradient */}
            <radialGradient id="gasTempParticleHot" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#fcd34d" />
              <stop offset="70%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </radialGradient>

            {/* Cold particle gradient */}
            <radialGradient id="gasTempParticleCold" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#a5f3fc" />
              <stop offset="40%" stopColor="#67e8f9" />
              <stop offset="70%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#06b6d4" />
            </radialGradient>

            {/* Neutral particle gradient */}
            <radialGradient id="gasTempParticleNeutral" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ddd6fe" />
              <stop offset="40%" stopColor="#c4b5fd" />
              <stop offset="70%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </radialGradient>

            {/* Heat source gradient */}
            <linearGradient id="gasHeatSource" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={tempNormalized * 0.8} />
              <stop offset="30%" stopColor="#f97316" stopOpacity={tempNormalized * 0.6} />
              <stop offset="70%" stopColor="#fbbf24" stopOpacity={tempNormalized * 0.4} />
              <stop offset="100%" stopColor="#fef3c7" stopOpacity={tempNormalized * 0.2} />
            </linearGradient>

            {/* Balloon reflection/shine */}
            <linearGradient id="gasBalloonShine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="white" stopOpacity="0.3" />
              <stop offset="50%" stopColor="white" stopOpacity="0" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>

            {/* Temperature particle glow */}
            <filter id="gasTempParticleGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation={isHot ? 3 : 2} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Balloon outer glow */}
            <filter id="gasBalloonGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Heat shimmer effect */}
            <filter id="gasHeatShimmer">
              <feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="2" result="turbulence" />
              <feDisplacementMap in2="turbulence" in="SourceGraphic" scale={isHot ? 2 : 0} xChannelSelector="R" yChannelSelector="G" />
            </filter>

            {/* Ambient temperature glow */}
            <filter id="gasAmbientTempGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="10" />
            </filter>
          </defs>

          {/* Background */}
          <rect width="250" height="200" fill="#020617" rx="8" />

          {/* Subtle grid pattern */}
          <pattern id="gasTempGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
          </pattern>
          <rect width="250" height="200" fill="url(#gasTempGrid)" rx="8" />

          {/* Heat source indicator at bottom */}
          <rect
            x="50"
            y="175"
            width="150"
            height="15"
            rx="3"
            fill="url(#gasHeatSource)"
          />
          {/* Heat element coils */}
          {[0, 1, 2, 3, 4].map((i) => (
            <rect
              key={i}
              x={60 + i * 30}
              y="178"
              width="20"
              height="8"
              rx="2"
              fill={isHot ? '#dc2626' : '#374151'}
              opacity={isHot ? 0.8 : 0.3}
            />
          ))}

          {/* Balloon with glow effect */}
          <g filter="url(#gasBalloonGlow)">
            {/* Balloon main body */}
            <ellipse
              cx="125"
              cy={95 - (containerHeight - 100) / 4}
              rx={70 + (twistVolume - 100) * 0.35}
              ry={containerHeight / 2 + 20}
              fill="url(#gasBalloonGrad)"
              stroke="url(#gasBalloonSurface)"
              strokeWidth="3"
            />
            {/* Balloon shine/reflection */}
            <ellipse
              cx={100 - (twistVolume - 100) * 0.1}
              cy={70 - (containerHeight - 100) / 4}
              rx={20 + (twistVolume - 100) * 0.1}
              ry={30 + (twistVolume - 100) * 0.1}
              fill="url(#gasBalloonShine)"
            />
          </g>

          {/* Balloon tie/knot */}
          <path
            d={`M120,${95 - (containerHeight - 100) / 4 + containerHeight / 2 + 20} L125,${105 - (containerHeight - 100) / 4 + containerHeight / 2 + 20} L130,${95 - (containerHeight - 100) / 4 + containerHeight / 2 + 20}`}
            fill="none"
            stroke={isHot ? '#f59e0b' : isCold ? '#06b6d4' : '#8b5cf6'}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Balloon string */}
          <line
            x1="125"
            y1={105 - (containerHeight - 100) / 4 + containerHeight / 2 + 20}
            x2="125"
            y2="175"
            stroke="#64748b"
            strokeWidth="2"
            strokeDasharray="4 2"
          />

          {/* Molecules inside balloon with glow */}
          {molecules.map((mol, i) => {
            const balloonRx = 70 + (twistVolume - 100) * 0.35;
            const balloonRy = containerHeight / 2 + 20;
            const balloonCy = 95 - (containerHeight - 100) / 4;

            // Calculate position within balloon bounds
            const normalizedX = (mol.x - 100) / 100;
            const normalizedY = (mol.y - 80) / 80;

            const cx = 125 + normalizedX * (balloonRx * 0.7);
            const cy = balloonCy + normalizedY * (balloonRy * 0.7);

            // Check if particle is within balloon ellipse
            const dx = (cx - 125) / balloonRx;
            const dy = (cy - balloonCy) / balloonRy;
            if (dx * dx + dy * dy > 0.85) return null;

            const particleGradient = isHot
              ? "url(#gasTempParticleHot)"
              : isCold
              ? "url(#gasTempParticleCold)"
              : "url(#gasTempParticleNeutral)";

            return (
              <g key={i} filter="url(#gasTempParticleGlow)">
                <circle
                  cx={cx}
                  cy={cy}
                  r={4 + tempNormalized}
                  fill={particleGradient}
                  opacity={0.9}
                />
                {/* Specular highlight */}
                <circle
                  cx={cx - 1.5}
                  cy={cy - 1.5}
                  r={1.5}
                  fill="white"
                  opacity="0.4"
                />
              </g>
            );
          })}

          {/* Pressure constant indicator - small gauge */}
          <g transform="translate(20, 20)">
            <rect x="0" y="0" width="50" height="24" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1" />
            <text x="25" y="10" textAnchor="middle" fontSize="8" fill="#64748b">PRESSURE</text>
            <text x="25" y="20" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#10b981">1 atm</text>
          </g>
        </svg>

        {/* Labels outside SVG using typo system */}
        <div className="flex justify-center gap-6 mt-3">
          <div className="text-center">
            <div
              className="font-bold"
              style={{
                fontSize: typo.bodyLarge,
                color: isHot ? '#f59e0b' : isCold ? '#06b6d4' : '#f8fafc'
              }}
            >
              T = {twistTemp} K ({Math.round(twistTemp - 273)}°C)
            </div>
          </div>
          <div className="text-center">
            <div
              className="font-medium"
              style={{ fontSize: typo.body, color: '#64748b' }}
            >
              V = {twistVolume.toFixed(0)}%
            </div>
          </div>
        </div>
      </>
    );
  };

  // Applications data
  const applications = [
    {
      title: "Scuba Diving",
      icon: "diving",
      description: "At depth, divers breathe compressed air. As they ascend, air in lungs expands (Boyle's Law). Never hold breath while ascending!",
      details: "P1V1 = P2V2. At 30m, pressure is 4 atm. A 1L breath at depth becomes 4L at surface. Safety stops allow gas equilibration.",
      stats: [
        { value: '4x', label: 'Volume change 30m to 0m' },
        { value: '1 atm', label: 'Per 10m depth' },
        { value: '18m/min', label: 'Safe ascent rate' }
      ]
    },
    {
      title: "Hot Air Balloons",
      icon: "balloon",
      description: "Heating air makes it expand and become less dense. The balloon traps lighter air, creating buoyancy (Charles's Law).",
      details: "V1/T1 = V2/T2. Heating air from 300K to 400K increases volume by 33%. Same mass in larger volume = lower density = floats.",
      stats: [
        { value: '100C', label: 'Typical temperature difference' },
        { value: '30%', label: 'Density reduction' },
        { value: '300kg', label: 'Typical payload' }
      ]
    },
    {
      title: "Car Engines",
      icon: "engine",
      description: "Compress fuel-air mixture, ignite it, and rapid heating causes explosive expansion pushing pistons.",
      details: "Compression ratio (typically 10:1) determines efficiency. Higher compression = higher peak pressure = more work extracted.",
      stats: [
        { value: '10:1', label: 'Compression ratio' },
        { value: '2500C', label: 'Combustion temp' },
        { value: '10%', label: 'Tire P increase when hot' }
      ]
    },
    {
      title: "Weather Systems",
      icon: "weather",
      description: "Rising air expands and cools (adiabatic cooling), causing cloud formation and driving weather patterns.",
      details: "Lower pressure at altitude means rising air expands. Expansion cools the air. Cool air holds less water = clouds and rain.",
      stats: [
        { value: '10C/km', label: 'Dry adiabatic rate' },
        { value: '50%', label: 'P at 5.5km altitude' },
        { value: '1013', label: 'Sea level P (hPa)' }
      ]
    }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER PHASES
  // ═══════════════════════════════════════════════════════════════════════════

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-violet-400 tracking-wide">CHEMISTRY EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-violet-100 to-cyan-200 bg-clip-text text-transparent">
        Gas Laws: PVT Relationships
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Why do balloons <span className="text-white font-semibold">expand</span> when heated and <span className="text-white font-semibold">pop</span> when squeezed?
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5 rounded-3xl" />

        <div className="relative">
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { icon: '📊', text: 'Pressure' },
              { icon: '📦', text: 'Volume' },
              { icon: '🌡️', text: 'Temperature' }
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="text-3xl mb-2">{item.icon}</div>
                <div className="text-sm font-semibold text-slate-300">{item.text}</div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              How are pressure, volume, and temperature connected?
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              Squeeze a sealed syringe and watch what happens to the pressure inside.
            </p>
            <div className="pt-2">
              <p className="text-base text-violet-400 font-semibold">
                Can you predict the relationship?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onClick={() => goToPhase('predict')}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-violet-500 to-cyan-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/25 hover:scale-[1.02] active:scale-[0.98]"
        style={{ zIndex: 10 }}
      >
        <span className="relative z-10 flex items-center gap-3">
          Explore Gas Behavior
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-violet-400">✦</span>
          Boyle's Law
        </div>
        <div className="flex items-center gap-2">
          <span className="text-violet-400">✦</span>
          Charles's Law
        </div>
        <div className="flex items-center gap-2">
          <span className="text-violet-400">✦</span>
          Ideal Gas Law
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6 border border-slate-700/50">
        <p className="text-lg text-slate-300 mb-4">
          You seal a syringe containing 20 mL of air at 1 atm pressure. You push the plunger to compress the air to 10 mL (half the volume).
        </p>
        <p className="text-violet-400 font-semibold">What happens to the pressure inside?</p>

        {/* Simple syringe diagram */}
        <div className="mt-6 flex justify-center items-center gap-8">
          <div className="text-center">
            <div className="w-32 h-16 bg-slate-700 rounded-lg flex items-center justify-center border-2 border-slate-600">
              <span className="text-slate-300">20 mL</span>
            </div>
            <p className="text-sm text-slate-400 mt-2">Before</p>
          </div>
          <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center border-2 border-violet-500">
              <span className="text-slate-300">10 mL</span>
            </div>
            <p className="text-sm text-slate-400 mt-2">After</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Pressure decreases to 0.5 atm' },
          { id: 'B', text: 'Pressure stays at 1 atm' },
          { id: 'C', text: 'Pressure increases to 2 atm' },
          { id: 'D', text: 'Pressure increases to 4 atm' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'C' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'C' ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
            style={{ zIndex: 10 }}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl border border-slate-700/50">
          <p className="text-emerald-400 font-semibold">
            Correct! This is <span className="text-violet-400">Boyle's Law</span>: P1V1 = P2V2. Half the volume means double the pressure!
          </p>
          <button
            onClick={() => goToPhase('play')}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all"
            style={{ zIndex: 10 }}
          >
            Explore the Physics
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Boyle's Law Lab</h2>
      <p className="text-slate-400 mb-6">Adjust the volume and watch how pressure changes</p>

      <div className="bg-slate-800/50 rounded-2xl p-6 mb-6 border border-slate-700/50 max-w-md w-full">
        <div className="h-64">
          {renderPistonViz()}
        </div>
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Volume slider */}
        <div className="bg-slate-700/50 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-slate-300 text-sm font-medium">Volume</label>
            <span className="text-violet-400 font-bold">{volume}%</span>
          </div>
          <input
            type="range"
            min="25"
            max="200"
            value={volume}
            onChange={(e) => setVolume(parseInt(e.target.value))}
            className="w-full accent-violet-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Compressed</span>
            <span>Expanded</span>
          </div>
        </div>

        {/* PV display */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-700/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-violet-400">{pressure.toFixed(2)}</div>
            <div className="text-sm text-slate-400">Pressure (atm)</div>
          </div>
          <div className="bg-slate-700/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400">{volume}</div>
            <div className="text-sm text-slate-400">Volume (%)</div>
          </div>
        </div>

        {/* PV product (constant) */}
        <div className="bg-emerald-900/30 rounded-xl p-4 text-center border border-emerald-500/30">
          <div className="text-3xl font-bold text-emerald-400">{(pressure * volume).toFixed(0)}</div>
          <div className="text-sm text-emerald-300">P x V = Constant!</div>
        </div>

        {/* Formula */}
        <div className="bg-violet-900/30 rounded-xl p-4 text-center border border-violet-500/30">
          <div className="text-xl font-bold text-violet-300 mb-2">P1V1 = P2V2</div>
          <div className="text-sm text-slate-400">Boyle's Law (at constant T)</div>
        </div>
      </div>

      <button
        onClick={() => goToPhase('review')}
        className="mt-8 px-8 py-4 bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all"
        style={{ zIndex: 10 }}
      >
        Understand the Physics
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-2">Boyle's Law Explained</h2>
      <p className="text-slate-400 mb-6">Same molecules, different space</p>

      {/* Main formula card */}
      <div className="bg-gradient-to-br from-violet-900/40 to-slate-800/40 rounded-2xl p-6 mb-6 w-full border border-violet-500/30 text-center">
        <div className="text-4xl font-bold text-violet-300 mb-4">P1V1 = P2V2</div>
        <p className="text-slate-300">At constant temperature, pressure and volume are inversely proportional</p>
      </div>

      {/* Explanation cards */}
      <div className="grid md:grid-cols-2 gap-4 w-full mb-6">
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
          <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center mb-3">
            <span className="text-2xl">🔬</span>
          </div>
          <h3 className="font-bold text-violet-400 mb-2">Molecular Explanation</h3>
          <p className="text-sm text-slate-400">Gas pressure comes from molecules hitting container walls. Smaller volume = same molecules hit walls more often = higher pressure.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-3">
            <span className="text-2xl">📊</span>
          </div>
          <h3 className="font-bold text-cyan-400 mb-2">Inverse Relationship</h3>
          <p className="text-sm text-slate-400">P and V are inversely proportional. When one doubles, the other halves. Their product stays constant.</p>
        </div>
      </div>

      {/* Key takeaways */}
      <div className="w-full space-y-3 mb-6">
        <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wide">Key Takeaways</h3>
        {[
          { icon: '🏊', title: 'Scuba Diving', desc: 'Air in lungs expands as divers ascend. Never hold breath while ascending!' },
          { icon: '🎈', title: 'Weather Balloons', desc: 'Balloons expand as they rise because atmospheric pressure decreases.' },
          { icon: '💉', title: 'Syringes', desc: 'Pulling the plunger expands volume, lowering pressure and drawing liquid in.' }
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-4 bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
            <span className="text-2xl">{item.icon}</span>
            <div>
              <h4 className="font-semibold text-white">{item.title}</h4>
              <p className="text-sm text-slate-400">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => goToPhase('twist_predict')}
        className="px-8 py-4 bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all"
        style={{ zIndex: 10 }}
      >
        Explore Temperature Effects
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Temperature Effects</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6 border border-slate-700/50">
        <p className="text-lg text-slate-300 mb-4">
          A balloon at room temperature (300 K) is heated to 450 K while the external pressure stays constant at 1 atm.
        </p>
        <p className="text-amber-400 font-semibold">What happens to the balloon's volume?</p>

        {/* Balloon diagram */}
        <div className="mt-6 flex justify-center items-center gap-8">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-cyan-500/20 border-2 border-cyan-500 flex items-center justify-center">
              <span className="text-cyan-400 font-bold">300K</span>
            </div>
            <p className="text-sm text-slate-400 mt-2">Cool</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
          <div className="text-center">
            <div className="w-28 h-28 rounded-full bg-amber-500/20 border-2 border-amber-500 border-dashed flex items-center justify-center">
              <span className="text-amber-400 font-bold text-xl">?</span>
            </div>
            <p className="text-sm text-slate-400 mt-2">Hot (450K)</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Balloon shrinks' },
          { id: 'B', text: 'Balloon expands (1.5x volume)' },
          { id: 'C', text: 'Volume stays the same' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
            style={{ zIndex: 10 }}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl border border-slate-700/50">
          <p className="text-emerald-400 font-semibold">
            Correct! This is <span className="text-amber-400">Charles's Law</span>: V1/T1 = V2/T2. 450K/300K = 1.5, so volume increases by 50%!
          </p>
          <button
            onClick={() => goToPhase('twist_play')}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all"
            style={{ zIndex: 10 }}
          >
            Explore Temperature Effects
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Charles's Law Lab</h2>
      <p className="text-slate-400 mb-6">Adjust the temperature and watch the balloon expand or contract</p>

      <div className="bg-slate-800/50 rounded-2xl p-6 mb-6 border border-slate-700/50 max-w-md w-full">
        <div className="h-64">
          {renderTempViz()}
        </div>
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Temperature slider */}
        <div className="bg-slate-700/50 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-slate-300 text-sm font-medium">Temperature</label>
            <span className="text-amber-400 font-bold">{twistTemp} K</span>
          </div>
          <input
            type="range"
            min="200"
            max="500"
            value={twistTemp}
            onChange={(e) => setTwistTemp(parseInt(e.target.value))}
            className="w-full accent-amber-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Cold (200 K)</span>
            <span>Hot (500 K)</span>
          </div>
        </div>

        {/* T and V display */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-700/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{twistTemp}</div>
            <div className="text-sm text-slate-400">Temperature (K)</div>
          </div>
          <div className="bg-slate-700/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400">{twistVolume.toFixed(0)}</div>
            <div className="text-sm text-slate-400">Volume (%)</div>
          </div>
        </div>

        {/* V/T ratio (constant) */}
        <div className="bg-emerald-900/30 rounded-xl p-4 text-center border border-emerald-500/30">
          <div className="text-3xl font-bold text-emerald-400">{(twistVolume / twistTemp).toFixed(3)}</div>
          <div className="text-sm text-emerald-300">V / T = Constant!</div>
        </div>

        {/* Formula */}
        <div className="bg-amber-900/30 rounded-xl p-4 text-center border border-amber-500/30">
          <div className="text-xl font-bold text-amber-300 mb-2">V1/T1 = V2/T2</div>
          <div className="text-sm text-slate-400">Charles's Law (at constant P)</div>
        </div>
      </div>

      <button
        onClick={() => goToPhase('twist_review')}
        className="mt-8 px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all"
        style={{ zIndex: 10 }}
      >
        Deep Understanding
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-2">The Ideal Gas Law</h2>
      <p className="text-slate-400 mb-6">Combining all three variables</p>

      {/* Main formula card */}
      <div className="bg-gradient-to-br from-violet-900/40 to-amber-900/40 rounded-2xl p-6 mb-6 w-full border border-violet-500/30 text-center">
        <div className="text-5xl font-bold bg-gradient-to-r from-violet-300 to-amber-300 bg-clip-text text-transparent mb-4">PV = nRT</div>
        <p className="text-slate-300">Pressure x Volume = moles x gas constant x Temperature</p>
      </div>

      {/* Three gas laws */}
      <div className="w-full space-y-3 mb-6">
        <div className="flex items-center gap-4 bg-violet-900/30 rounded-xl p-4 border border-violet-500/30">
          <div className="w-12 h-12 rounded-xl bg-violet-500/30 flex items-center justify-center font-bold text-violet-300">PV</div>
          <div>
            <h4 className="font-semibold text-violet-300">Boyle's Law</h4>
            <p className="text-sm text-slate-400">P1V1 = P2V2 (constant T)</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-amber-900/30 rounded-xl p-4 border border-amber-500/30">
          <div className="w-12 h-12 rounded-xl bg-amber-500/30 flex items-center justify-center font-bold text-amber-300">V/T</div>
          <div>
            <h4 className="font-semibold text-amber-300">Charles's Law</h4>
            <p className="text-sm text-slate-400">V1/T1 = V2/T2 (constant P)</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-cyan-900/30 rounded-xl p-4 border border-cyan-500/30">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/30 flex items-center justify-center font-bold text-cyan-300">P/T</div>
          <div>
            <h4 className="font-semibold text-cyan-300">Gay-Lussac's Law</h4>
            <p className="text-sm text-slate-400">P1/T1 = P2/T2 (constant V)</p>
          </div>
        </div>
      </div>

      {/* Key insight */}
      <div className="bg-emerald-900/30 rounded-xl p-5 border border-emerald-500/30 w-full mb-6">
        <h3 className="font-bold text-emerald-400 mb-2">The Big Picture</h3>
        <p className="text-sm text-slate-300">PV = nRT connects macroscopic measurements (P, V, T) to the microscopic world of molecules. This single equation explains balloons, scuba diving, engines, weather, and countless other phenomena!</p>
      </div>

      <button
        onClick={() => goToPhase('transfer')}
        className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
        style={{ zIndex: 10 }}
      >
        Real World Applications
      </button>
    </div>
  );

  const renderTransfer = () => {
    const handleNextApplication = () => {
      if (activeAppTab < applications.length - 1) {
        if (!completedApps.has(activeAppTab)) {
          handleAppComplete(activeAppTab);
        }
        setActiveAppTab(activeAppTab + 1);
      } else {
        if (!completedApps.has(activeAppTab)) {
          handleAppComplete(activeAppTab);
        }
      }
    };

    return (
      <div className="flex flex-col p-6 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-2">Real-World Applications</h2>
        <p className="text-slate-400 mb-6">Gas laws in action everywhere</p>

        {/* App tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {applications.map((app, i) => (
            <button
              key={i}
              onClick={() => setActiveAppTab(i)}
              className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
                activeAppTab === i
                  ? 'bg-gradient-to-r from-violet-600 to-cyan-600 text-white'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
              } ${completedApps.has(i) ? 'ring-2 ring-emerald-500' : ''}`}
              style={{ zIndex: 10 }}
            >
              {completedApps.has(i) && <span className="mr-1">✓</span>}
              {app.title}
            </button>
          ))}
        </div>

        {/* Current app content */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 mb-6">
          <h3 className="text-xl font-bold text-white mb-3">{applications[activeAppTab].title}</h3>
          <p className="text-slate-300 mb-4">{applications[activeAppTab].description}</p>
          <p className="text-sm text-slate-400 mb-4">{applications[activeAppTab].details}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {applications[activeAppTab].stats.map((stat, i) => (
              <div key={i} className="bg-slate-700/50 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-violet-400">{stat.value}</div>
                <div className="text-xs text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Next Application button */}
          <button
            onClick={handleNextApplication}
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all"
            style={{ zIndex: 10 }}
          >
            {activeAppTab < applications.length - 1 ? 'Next Application →' : 'Complete Applications'}
          </button>
        </div>

        {/* Progress */}
        <div className="text-center mb-6">
          <p className="text-slate-400">{completedApps.size} of {applications.length} applications explored</p>
          <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
            <div
              className="bg-gradient-to-r from-violet-500 to-cyan-500 h-2 rounded-full transition-all"
              style={{ width: `${(completedApps.size / applications.length) * 100}%` }}
            />
          </div>
        </div>

        {completedApps.size >= applications.length && (
          <button
            onClick={() => goToPhase('test')}
            className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all mx-auto"
            style={{ zIndex: 10 }}
          >
            Take the Test
          </button>
        )}
      </div>
    );
  };

  const renderTest = () => {
    if (showTestResults) {
      const score = calculateScore();
      const percentage = (score / testQuestions.length) * 100;

      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
            percentage >= 70 ? 'bg-emerald-500/20' : 'bg-amber-500/20'
          }`}>
            <span className="text-5xl">{percentage >= 70 ? '🎉' : '📚'}</span>
          </div>

          <h2 className="text-3xl font-bold text-white mb-2">
            {percentage >= 90 ? 'Outstanding!' : percentage >= 70 ? 'Great Job!' : 'Keep Learning!'}
          </h2>

          <div className={`text-6xl font-bold mb-4 ${percentage >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {score}/{testQuestions.length}
          </div>

          <p className="text-slate-400 mb-8">You scored {percentage}%</p>

          <button
            onClick={() => {
              if (percentage >= 70) {
                goToPhase('mastery');
              } else {
                setShowTestResults(false);
                setTestAnswers(Array(10).fill(-1));
              }
            }}
            className="px-8 py-4 bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all"
            style={{ zIndex: 10 }}
          >
            {percentage >= 70 ? 'Complete Lesson' : 'Review & Retry'}
          </button>
        </div>
      );
    }

    const currentQuestion = testQuestions.findIndex((_, i) => testAnswers[i] === -1);
    const questionIndex = currentQuestion === -1 ? testQuestions.length - 1 : currentQuestion;
    const question = testQuestions[questionIndex];

    return (
      <div className="flex flex-col items-center p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between w-full mb-6">
          <h2 className="text-xl font-bold text-white">Question {questionIndex + 1} of {testQuestions.length}</h2>
          <div className="flex gap-1">
            {testQuestions.map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  testAnswers[i] !== -1 ? 'bg-emerald-500' : i === questionIndex ? 'bg-violet-500' : 'bg-slate-600'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-6 mb-6 w-full border border-slate-700/50">
          <p className="text-lg text-white font-medium">{question.question}</p>
        </div>

        <div className="grid gap-3 w-full mb-6">
          {question.options.map((option, i) => (
            <button
              key={i}
              onClick={() => handleTestAnswer(questionIndex, i)}
              className={`p-4 rounded-xl text-left transition-all duration-300 ${
                testAnswers[questionIndex] === i
                  ? 'bg-violet-600/40 border-2 border-violet-400'
                  : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
              }`}
              style={{ zIndex: 10 }}
            >
              <span className="font-bold text-white mr-2">{String.fromCharCode(65 + i)}.</span>
              <span className="text-slate-200">{option.text}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-4">
          {questionIndex > 0 && (
            <button
              onClick={() => {
                setTestAnswers(prev => {
                  const newAnswers = [...prev];
                  newAnswers[questionIndex] = -1;
                  return newAnswers;
                });
              }}
              className="px-6 py-3 bg-slate-700 text-white font-semibold rounded-xl hover:bg-slate-600 transition-all"
              style={{ zIndex: 10 }}
            >
              Previous
            </button>
          )}

          {testAnswers[questionIndex] !== -1 && (
            questionIndex < testQuestions.length - 1 ? (
              <button
                onClick={() => {}}
                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all"
                style={{ zIndex: 10 }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => {
                  if (testAnswers.every(a => a !== -1)) {
                    setShowTestResults(true);
                    onGameEvent?.({ type: 'test_completed', data: { score: calculateScore() } });
                  }
                }}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
                style={{ zIndex: 10 }}
              >
                Submit Test
              </button>
            )
          )}
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] p-6 text-center relative overflow-hidden">
      {/* Confetti effect */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-3 h-3 rounded-full animate-bounce"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            backgroundColor: ['#8b5cf6', '#06b6d4', '#f59e0b', '#10b981'][i % 4],
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 2}s`
          }}
        />
      ))}

      <div className="relative z-10">
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center mb-8 mx-auto shadow-2xl shadow-violet-500/30">
          <span className="text-6xl">🏆</span>
        </div>

        <h1 className="text-4xl font-bold text-white mb-4">Mastery Achieved!</h1>
        <p className="text-xl text-slate-400 mb-8">You've mastered the Gas Laws!</p>

        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
          {[
            { icon: '📊', label: "Boyle's Law", value: 'Mastered' },
            { icon: '🌡️', label: "Charles's Law", value: 'Mastered' },
            { icon: '🎈', label: 'Ideal Gas', value: 'Mastered' }
          ].map((item, i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="text-3xl mb-2">{item.icon}</div>
              <div className="text-xs text-slate-400">{item.label}</div>
              <div className="text-sm font-bold text-violet-400">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="bg-emerald-900/30 rounded-xl p-4 border border-emerald-500/30 mb-8 max-w-md mx-auto">
          <div className="text-3xl font-bold text-emerald-400 mb-1">{calculateScore()}/10</div>
          <div className="text-sm text-emerald-300">Test Score</div>
        </div>

        <button
          onClick={() => {
            playSound('complete');
            onGameEvent?.({ type: 'mastery_achieved', data: { score: calculateScore() } });
          }}
          className="px-10 py-5 bg-gradient-to-r from-violet-500 to-cyan-600 text-white text-lg font-semibold rounded-2xl hover:shadow-lg hover:shadow-violet-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
          style={{ zIndex: 10 }}
        >
          Complete Lesson 🎓
        </button>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />

      {/* Ambient glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />

      {/* Fixed header with phase dots */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎈</span>
            <span className="font-semibold text-white">Gas Laws</span>
          </div>

          {/* Phase dots */}
          <div className="flex items-center gap-2">
            {phaseOrder.map((p, index) => {
              const currentIndex = phaseOrder.indexOf(phase);
              return (
                <button
                  key={p}
                  onClick={() => { if (index < currentIndex) goToPhase(p); }}
                  className={`transition-all duration-300 rounded-full ${
                    p === phase
                      ? 'h-2 w-6 bg-violet-500'
                      : index < currentIndex
                        ? 'h-2 w-2 bg-emerald-500 cursor-pointer hover:bg-emerald-400'
                        : 'h-2 w-2 bg-slate-600'
                  }`}
                  style={{ zIndex: 10 }}
                />
              );
            })}
          </div>

          <div className="text-sm text-slate-400">
            {phaseOrder.indexOf(phase) + 1} / {phaseOrder.length}
          </div>
        </div>
      </div>

      {/* Content area with padding for fixed header */}
      <div className="relative z-10 pt-20 pb-8">
        {phase === 'hook' && renderHook()}
        {phase === 'predict' && renderPredict()}
        {phase === 'play' && renderPlay()}
        {phase === 'review' && renderReview()}
        {phase === 'twist_predict' && renderTwistPredict()}
        {phase === 'twist_play' && renderTwistPlay()}
        {phase === 'twist_review' && renderTwistReview()}
        {phase === 'transfer' && renderTransfer()}
        {phase === 'test' && renderTest()}
        {phase === 'mastery' && renderMastery()}
      </div>
    </div>
  );
};

export default GasLawsRenderer;
