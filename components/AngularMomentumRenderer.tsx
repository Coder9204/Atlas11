'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
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

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Observer Effect',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

interface Props {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

const AngularMomentumRenderer: React.FC<Props> = ({ onGameEvent, gamePhase, onPhaseComplete }) => {
  const [phase, setPhase] = useState<Phase>((gamePhase as Phase) ?? 'hook');
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // PREMIUM DESIGN SYSTEM
  // ─────────────────────────────────────────────────────────────────────────
  const colors = {
    primary: '#8b5cf6',       // violet-500
    primaryDark: '#7c3aed',   // violet-600
    accent: '#ec4899',        // pink-500
    secondary: '#a855f7',     // purple-500
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
    elementGap: isMobile ? '8px' : '12px'
  };

  // Simulation state
  const [angle, setAngle] = useState(0);
  const [armExtension, setArmExtension] = useState(0.8);
  const [hasWeights, setHasWeights] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [experimentCount, setExperimentCount] = useState(0);
  const [initialOmega] = useState(2);

  const lastClickRef = useRef(0);
  const animationRef = useRef<number>();

  // Physics calculations
  const bodyInertia = 2.5;
  const weightMass = hasWeights ? 2 : 0.2;
  const armRadius = 0.3 + armExtension * 0.5;
  const momentOfInertia = bodyInertia + 2 * weightMass * armRadius * armRadius;
  const initialMomentOfInertia = bodyInertia + 2 * weightMass * 0.8 * 0.8;
  const angularMomentum = initialMomentOfInertia * initialOmega;
  const calculatedOmega = angularMomentum / momentOfInertia;

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (gamePhase !== undefined && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // Animation
  useEffect(() => {
    if (isSpinning && (phase === 'play' || phase === 'twist_play')) {
      const animate = () => {
        setAngle(prev => (prev + calculatedOmega * 0.04) % (2 * Math.PI));
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
      return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
    }
  }, [isSpinning, calculatedOmega, phase]);

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
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
  }, [playSound, onPhaseComplete, onGameEvent]);

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
    playSound(prediction === 'B' ? 'success' : 'failure');
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

  const testQuestions = [
    {
      question: "When a figure skater pulls their arms in during a spin:",
      options: [
        { text: "They slow down", correct: false },
        { text: "They stay the same speed", correct: false },
        { text: "They speed up", correct: true },
        { text: "They stop spinning", correct: false }
      ]
    },
    {
      question: "What quantity is conserved when a skater pulls arms in?",
      options: [
        { text: "Angular velocity", correct: false },
        { text: "Moment of inertia", correct: false },
        { text: "Angular momentum", correct: true },
        { text: "Kinetic energy", correct: false }
      ]
    },
    {
      question: "If moment of inertia decreases by half, angular velocity:",
      options: [
        { text: "Halves", correct: false },
        { text: "Stays same", correct: false },
        { text: "Doubles", correct: true },
        { text: "Quadruples", correct: false }
      ]
    },
    {
      question: "Moment of inertia depends on:",
      options: [
        { text: "Mass only", correct: false },
        { text: "Radius only", correct: false },
        { text: "Both mass and radius squared", correct: true },
        { text: "Neither", correct: false }
      ]
    },
    {
      question: "Why do divers tuck into a ball during somersaults?",
      options: [
        { text: "Reduce air resistance", correct: false },
        { text: "Decrease moment of inertia to spin faster", correct: true },
        { text: "Look more aerodynamic", correct: false },
        { text: "Feel safer", correct: false }
      ]
    },
    {
      question: "A neutron star spins incredibly fast because:",
      options: [
        { text: "Nuclear reactions", correct: false },
        { text: "Angular momentum conserved as it collapsed", correct: true },
        { text: "Magnetic fields", correct: false },
        { text: "Dark matter", correct: false }
      ]
    },
    {
      question: "Why do helicopters need tail rotors?",
      options: [
        { text: "For steering", correct: false },
        { text: "To counter main rotor's angular momentum", correct: true },
        { text: "Extra lift", correct: false },
        { text: "Cooling", correct: false }
      ]
    },
    {
      question: "When you extend arms on a spinning chair:",
      options: [
        { text: "You speed up", correct: false },
        { text: "Nothing happens", correct: false },
        { text: "You slow down", correct: true },
        { text: "You fly off", correct: false }
      ]
    },
    {
      question: "L = Iω represents:",
      options: [
        { text: "Linear momentum", correct: false },
        { text: "Angular momentum", correct: true },
        { text: "Torque", correct: false },
        { text: "Energy", correct: false }
      ]
    },
    {
      question: "Gyroscopes resist tilting because:",
      options: [
        { text: "They're heavy", correct: false },
        { text: "Angular momentum is conserved", correct: true },
        { text: "Friction", correct: false },
        { text: "Magnetic forces", correct: false }
      ]
    }
  ];

  const calculateScore = (): number => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  };

  const applications = [
    { title: "Figure Skating", icon: "⛸️", description: "Skaters pull arms in to spin faster. Starting with arms out, they can increase speed 3-4x.", details: "Olympic skaters reach 300+ RPM. World record is 342 RPM by Natalia Kanounnikova." },
    { title: "Platform Diving", icon: "🏊", description: "Divers tuck tightly to complete multiple somersaults in just 2 seconds from a 10m platform.", details: "Tuck position reduces I by up to 4x compared to pike or layout position." },
    { title: "Gyroscopes", icon: "🔄", description: "Spinning gyroscopes maintain orientation due to angular momentum conservation.", details: "Hubble Space Telescope uses gyroscopes for precise pointing. Your phone has MEMS gyroscopes." },
    { title: "Neutron Stars", icon: "⭐", description: "When massive stars collapse, angular momentum is compressed into tiny volume.", details: "Fastest pulsar spins 716 times per second. Surface moves at 24% speed of light!" }
  ];

  const renderSpinningFigure = () => {
    const personRotation = angle * 180 / Math.PI;
    const armLength = 20 + armExtension * 50;
    const weightSize = hasWeights ? 14 : 5;
    const speedRatio = calculatedOmega / initialOmega;

    return (
      <div className="bg-gradient-to-b from-purple-900/30 to-slate-900/50 rounded-2xl p-6 border border-slate-700/50">
        <svg viewBox="0 0 360 300" className="w-full max-w-[360px] mx-auto block">
          <defs>
            {/* Premium background gradient */}
            <linearGradient id="angMomLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a0f1a" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Platform/stage gradient with 3D depth */}
            <radialGradient id="angMomPlatform" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="40%" stopColor="#1e293b" />
              <stop offset="70%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>

            {/* Platform rim highlight */}
            <linearGradient id="angMomPlatformRim" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Pole/stand metallic gradient */}
            <linearGradient id="angMomPole" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="25%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="75%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Body gradient with 3D shading */}
            <radialGradient id="angMomBody" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="30%" stopColor="#475569" />
              <stop offset="70%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </radialGradient>

            {/* Head gradient with premium 3D effect */}
            <radialGradient id="angMomHead" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="30%" stopColor="#64748b" />
              <stop offset="60%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </radialGradient>

            {/* Arm gradient */}
            <linearGradient id="angMomArm" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="30%" stopColor="#64748b" />
              <stop offset="70%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Weight gradient - pink/magenta with 3D sphere effect */}
            <radialGradient id="angMomWeight" cx="30%" cy="25%" r="65%">
              <stop offset="0%" stopColor="#f9a8d4" />
              <stop offset="20%" stopColor="#f472b6" />
              <stop offset="50%" stopColor="#ec4899" />
              <stop offset="80%" stopColor="#db2777" />
              <stop offset="100%" stopColor="#9d174d" />
            </radialGradient>

            {/* Weight without weights - subtle gray */}
            <radialGradient id="angMomWeightNone" cx="30%" cy="25%" r="65%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#334155" />
            </radialGradient>

            {/* Spin glow effect - purple aura */}
            <radialGradient id="angMomSpinGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.6" />
              <stop offset="30%" stopColor="#8b5cf6" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#6d28d9" stopOpacity="0" />
            </radialGradient>

            {/* Motion blur / rotation trail */}
            <linearGradient id="angMomMotionTrail" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </linearGradient>

            {/* Angular momentum vector arrow gradient */}
            <linearGradient id="angMomVectorArrow" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="30%" stopColor="#8b5cf6" />
              <stop offset="60%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="angMomGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="angMomWeightGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="angMomSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" />
            </filter>

            {/* Shadow filter for depth */}
            <filter id="angMomShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Premium background */}
          <rect width="360" height="300" fill="url(#angMomLabBg)" />

          {/* Subtle grid pattern for lab feel */}
          <pattern id="angMomGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.4" />
          </pattern>
          <rect width="360" height="300" fill="url(#angMomGrid)" />

          {/* Floor/ground ellipse with depth */}
          <ellipse cx="180" cy="275" rx="150" ry="22" fill="url(#angMomPlatform)" />
          <ellipse cx="180" cy="275" rx="150" ry="22" fill="none" stroke="url(#angMomPlatformRim)" strokeWidth="1.5" />
          <ellipse cx="180" cy="275" rx="145" ry="18" fill="none" stroke="#475569" strokeWidth="0.5" strokeOpacity="0.3" />

          {/* Spin glow when spinning */}
          {isSpinning && (
            <ellipse
              cx="180" cy="160"
              rx={75 + armLength}
              ry={28 + armLength/3}
              fill="url(#angMomSpinGlow)"
              filter="url(#angMomSoftGlow)"
            >
              <animate attributeName="opacity" values="0.4;0.7;0.4" dur="0.5s" repeatCount="indefinite" />
            </ellipse>
          )}

          {/* Base/stand ellipse */}
          <ellipse cx="180" cy="252" rx="32" ry="12" fill="url(#angMomPlatform)" stroke="#475569" strokeWidth="1" />
          <ellipse cx="180" cy="250" rx="30" ry="10" fill="url(#angMomPlatform)" />
          <ellipse cx="180" cy="248" rx="26" ry="8" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />

          {/* Pole/stand with metallic gradient */}
          <rect x="172" y="192" width="16" height="58" fill="url(#angMomPole)" rx="3" />
          <rect x="174" y="194" width="2" height="54" fill="#94a3b8" fillOpacity="0.3" rx="1" />

          {/* Angular momentum vector (L) pointing up when spinning */}
          {isSpinning && (
            <g filter="url(#angMomGlow)">
              {/* Vector line */}
              <line
                x1="180" y1="90"
                x2="180" y2="20"
                stroke="url(#angMomVectorArrow)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Arrowhead */}
              <polygon
                points="180,8 172,24 180,18 188,24"
                fill="url(#angMomVectorArrow)"
              />
              {/* Pulsing glow */}
              <circle cx="180" cy="14" r="6" fill="#c084fc" fillOpacity="0.5">
                <animate attributeName="r" values="4;8;4" dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0.6;0.3" dur="1s" repeatCount="indefinite" />
              </circle>
            </g>
          )}

          {/* Rotating figure group */}
          <g transform={`translate(180, 155) rotate(${personRotation})`} filter="url(#angMomShadow)">
            {/* Motion trails when spinning fast */}
            {isSpinning && speedRatio > 1.3 && (
              <>
                <ellipse cx="0" cy="2" rx={armLength + 30} ry="8" fill="url(#angMomMotionTrail)" opacity="0.3">
                  <animate attributeName="opacity" values="0.1;0.3;0.1" dur="0.3s" repeatCount="indefinite" />
                </ellipse>
              </>
            )}

            {/* Body - torso with 3D gradient */}
            <ellipse cx="0" cy="20" rx="26" ry="38" fill="url(#angMomBody)" />
            <ellipse cx="-8" cy="10" rx="8" ry="18" fill="#64748b" fillOpacity="0.3" />

            {/* Head with premium 3D effect */}
            <circle cx="0" cy="-28" r="22" fill="url(#angMomHead)" />
            {/* Head highlight */}
            <ellipse cx="-6" cy="-34" rx="8" ry="6" fill="#cbd5e1" fillOpacity="0.25" />

            {/* Eyes */}
            <circle cx="-7" cy="-32" r="4" fill="#0f172a" />
            <circle cx="7" cy="-32" r="4" fill="#0f172a" />
            {/* Eye highlights */}
            <circle cx="-8" cy="-33" r="1.5" fill="#94a3b8" />
            <circle cx="6" cy="-33" r="1.5" fill="#94a3b8" />

            {/* Left arm with gradient */}
            <line
              x1="-22" y1="2"
              x2={-22 - armLength} y2="2"
              stroke="url(#angMomArm)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Arm highlight line */}
            <line
              x1="-22" y1="0"
              x2={-22 - armLength} y2="0"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeOpacity="0.4"
            />

            {/* Left weight with 3D sphere effect */}
            <g filter={hasWeights ? "url(#angMomWeightGlow)" : undefined}>
              <circle
                cx={-22 - armLength} cy="2"
                r={weightSize}
                fill={hasWeights ? "url(#angMomWeight)" : "url(#angMomWeightNone)"}
              />
              {/* Weight highlight */}
              <ellipse
                cx={-22 - armLength - weightSize * 0.25}
                cy={2 - weightSize * 0.3}
                rx={weightSize * 0.3}
                ry={weightSize * 0.2}
                fill="white"
                fillOpacity={hasWeights ? "0.4" : "0.2"}
              />
            </g>

            {/* Right arm with gradient */}
            <line
              x1="22" y1="2"
              x2={22 + armLength} y2="2"
              stroke="url(#angMomArm)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Arm highlight line */}
            <line
              x1="22" y1="0"
              x2={22 + armLength} y2="0"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeOpacity="0.4"
            />

            {/* Right weight with 3D sphere effect */}
            <g filter={hasWeights ? "url(#angMomWeightGlow)" : undefined}>
              <circle
                cx={22 + armLength} cy="2"
                r={weightSize}
                fill={hasWeights ? "url(#angMomWeight)" : "url(#angMomWeightNone)"}
              />
              {/* Weight highlight */}
              <ellipse
                cx={22 + armLength - weightSize * 0.25}
                cy={2 - weightSize * 0.3}
                rx={weightSize * 0.3}
                ry={weightSize * 0.2}
                fill="white"
                fillOpacity={hasWeights ? "0.4" : "0.2"}
              />
            </g>
          </g>
        </svg>

        {/* Stats display with React divs - using typo system */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-700/30">
            <div style={{ fontSize: typo.label, color: colors.textMuted, marginBottom: '4px', fontWeight: 600, letterSpacing: '0.05em' }}>SPIN SPEED</div>
            <div style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.textPrimary }}>{calculatedOmega.toFixed(1)} rad/s</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-700/30">
            <div style={{ fontSize: typo.label, color: colors.textMuted, marginBottom: '4px', fontWeight: 600, letterSpacing: '0.05em' }}>MOMENT I</div>
            <div style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.warning }}>{momentOfInertia.toFixed(2)} kg·m²</div>
          </div>
          <div
            className="rounded-lg p-3 text-center"
            style={{
              backgroundColor: speedRatio > 1.2 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(51, 65, 85, 0.5)',
              border: speedRatio > 1.2 ? `1px solid rgba(16, 185, 129, 0.4)` : '1px solid rgba(51, 65, 85, 0.3)'
            }}
          >
            <div style={{ fontSize: typo.label, color: colors.textMuted, marginBottom: '4px', fontWeight: 600, letterSpacing: '0.05em' }}>SPEED GAIN</div>
            <div style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: speedRatio > 1.2 ? colors.success : colors.textPrimary }}>{speedRatio.toFixed(1)}×</div>
          </div>
        </div>

        {/* Angular momentum conservation display */}
        <div
          className="mt-4 p-4 rounded-xl text-center"
          style={{
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            border: `1px solid rgba(139, 92, 246, 0.3)`
          }}
        >
          <span style={{ fontSize: typo.label, color: colors.primary, fontWeight: 600, letterSpacing: '0.05em' }}>ANGULAR MOMENTUM (CONSERVED)</span>
          <div style={{ fontSize: typo.heading, fontWeight: 700, color: colors.primary, marginTop: '4px' }}>L = {angularMomentum.toFixed(2)} kg·m²/s ✓</div>
        </div>
      </div>
    );
  };

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-purple-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-purple-100 to-pink-200 bg-clip-text text-transparent">
        The Spinning Secret
      </h1>
      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover why figure skaters spin faster when they pull their arms in
      </p>
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 rounded-3xl" />
        <div className="relative">
          <div className="text-6xl mb-6">⛸️</div>
          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              A skater starts spinning slowly with arms outstretched.
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              They pull their arms in close to their body and suddenly spin much faster!
            </p>
            <div className="pt-2">
              <p className="text-base text-purple-400 font-semibold">
                How do they speed up without pushing off anything?
              </p>
            </div>
          </div>
        </div>
      </div>
      <button
        onMouseDown={() => goToPhase('predict')}
        onTouchEnd={(e) => { e.preventDefault(); goToPhase('predict'); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-purple-500 to-pink-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98]"
        style={{ minHeight: '48px' }}
      >
        <span className="relative z-10 flex items-center gap-3">
          Discover the Physics
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2"><span className="text-purple-400">✦</span>Interactive Lab</div>
        <div className="flex items-center gap-2"><span className="text-purple-400">✦</span>Real-World Examples</div>
        <div className="flex items-center gap-2"><span className="text-purple-400">✦</span>Knowledge Test</div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          WHY does pulling arms in make a skater spin faster?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Arms push air outward, reaction pushes skater faster' },
          { id: 'B', text: 'Angular momentum conserved—smaller radius needs faster speed' },
          { id: 'C', text: 'Muscles add energy when pulling arms in' },
          { id: 'D', text: 'Gravity affects you less with arms closer to body' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={() => handlePrediction(option.id)}
            onTouchEnd={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={showPredictionFeedback}
            style={{ minHeight: '48px' }}
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
            ✓ Correct! Angular momentum L = Iω is conserved. When I decreases, ω must increase!
          </p>
          <button
            onMouseDown={() => goToPhase('play')}
            onTouchEnd={(e) => { e.preventDefault(); goToPhase('play'); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
            style={{ minHeight: '48px' }}
          >
            Try the Experiment →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Spinning Chair Lab</h2>
      {renderSpinningFigure()}
      <div className="w-full max-w-md mt-6 space-y-4">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Arm Position: {armExtension < 0.3 ? 'Tucked' : armExtension > 0.7 ? 'Extended' : 'Mid'}</label>
          <input type="range" min="0" max="1" step="0.1" value={armExtension} onChange={(e) => setArmExtension(parseFloat(e.target.value))} className="w-full accent-purple-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setHasWeights(true)}
            className={`p-4 rounded-xl font-medium transition-all ${hasWeights ? 'bg-pink-500/30 border-2 border-pink-500' : 'bg-slate-700/50 border-2 border-transparent'} text-white`}
          >
            🏋️ With Weights
          </button>
          <button
            onClick={() => setHasWeights(false)}
            className={`p-4 rounded-xl font-medium transition-all ${!hasWeights ? 'bg-purple-500/30 border-2 border-purple-500' : 'bg-slate-700/50 border-2 border-transparent'} text-white`}
          >
            🙌 Arms Only
          </button>
        </div>
        <button
          onClick={() => { setIsSpinning(!isSpinning); setExperimentCount(c => c + 1); }}
          className={`w-full py-4 rounded-xl font-semibold text-white ${isSpinning ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
        >
          {isSpinning ? '⏹ Stop Spinning' : '▶ Start Spinning'}
        </button>
      </div>
      <button
        onMouseDown={() => goToPhase('review')}
        onTouchEnd={(e) => { e.preventDefault(); goToPhase('review'); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
        style={{ minHeight: '48px' }}
      >
        Review the Physics →
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Conservation of Angular Momentum</h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-purple-400 mb-3">🔄 Angular Momentum (L)</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• L = I × ω (moment of inertia × angular velocity)</li>
            <li>• CONSERVED when no external torque acts</li>
            <li>• Like a "spinning memory" that must be preserved</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-amber-400 mb-3">⚖️ Moment of Inertia (I)</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• I = Σmr² (mass × distance² from axis)</li>
            <li>• Farther mass = larger I</li>
            <li>• Extended arms = large I, tucked = small I</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">🎯 The Conservation Law</h3>
          <p className="text-slate-300 text-sm">
            <strong>L = Iω = constant</strong> — When you pull arms in, I decreases. Since L must stay constant, ω must INCREASE!<br/>
            If I drops by half, ω doubles. That's how skaters spin 3-4× faster!
          </p>
        </div>
      </div>
      <button onClick={() => goToPhase('twist_predict')} className="mt-8 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
        Try a Challenge →
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">🌟 The Twist Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          You've seen heavy weights make a big difference. What if you spin with NO weights (just your arms)?
        </p>
        <p className="text-lg text-purple-400 font-medium">
          Will the speed increase be bigger, smaller, or the same?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Same speed increase (arms have mass too)' },
          { id: 'B', text: 'SMALLER speed increase (less mass being moved)' },
          { id: 'C', text: 'LARGER speed increase (weights were slowing you)' },
          { id: 'D', text: 'No change at all (weights don\'t matter)' }
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
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>
      {showTwistFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            ✓ Correct! Less mass means smaller change in I, so smaller change in ω!
          </p>
          <button onClick={() => goToPhase('twist_play')} className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
            Compare Both →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Compare With/Without Weights</h2>
      <div className="grid grid-cols-2 gap-3 w-full max-w-md mb-4">
        <button
          onClick={() => setHasWeights(true)}
          className={`p-4 rounded-xl font-medium transition-all ${hasWeights ? 'bg-pink-500/30 border-2 border-pink-500' : 'bg-slate-700/50 border-2 border-transparent'} text-white`}
        >
          🏋️ Heavy Weights
        </button>
        <button
          onClick={() => setHasWeights(false)}
          className={`p-4 rounded-xl font-medium transition-all ${!hasWeights ? 'bg-purple-500/30 border-2 border-purple-500' : 'bg-slate-700/50 border-2 border-transparent'} text-white`}
        >
          🙌 Arms Only
        </button>
      </div>
      {renderSpinningFigure()}
      <div className="bg-slate-700/50 rounded-xl p-4 w-full max-w-md mt-4">
        <label className="text-slate-300 text-sm block mb-2">Arm Position</label>
        <input type="range" min="0" max="1" step="0.1" value={armExtension} onChange={(e) => setArmExtension(parseFloat(e.target.value))} className="w-full accent-amber-500" />
      </div>
      <button
        onClick={() => setIsSpinning(!isSpinning)}
        className={`w-full max-w-md mt-4 py-4 rounded-xl font-semibold text-white ${isSpinning ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
      >
        {isSpinning ? '⏹ Stop' : '▶ Spin'}
      </button>
      <button onClick={() => goToPhase('twist_review')} className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
        See Why →
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">🌟 Mass Distribution is Key!</h2>
      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-slate-300 mb-4">Since <strong className="text-purple-400">I = Σmr²</strong>, the mass (m) multiplies the effect of changing position (r):</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/50 p-4 rounded-xl text-center">
            <div className="text-3xl mb-2">🏋️</div>
            <div className="text-pink-400 font-bold">Heavy weights</div>
            <div className="text-slate-400 text-sm">Large ΔI → Large Δω</div>
            <div className="text-emerald-400 mt-2">Spin 3× faster!</div>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-xl text-center">
            <div className="text-3xl mb-2">🙌</div>
            <div className="text-purple-400 font-bold">Arms only</div>
            <div className="text-slate-400 text-sm">Small ΔI → Small Δω</div>
            <div className="text-amber-400 mt-2">Spin 1.2× faster</div>
          </div>
        </div>
      </div>
      <button onClick={() => goToPhase('transfer')} className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl">
        Real-World Applications →
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>
      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {applications.map((app, index) => (
          <button
            key={index}
            onClick={() => setActiveAppTab(index)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppTab === index ? 'bg-purple-600 text-white'
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
          <span className="text-3xl">{applications[activeAppTab].icon}</span>
          <h3 className="text-xl font-bold text-white">{applications[activeAppTab].title}</h3>
        </div>
        <p className="text-lg text-slate-300 mb-3">{applications[activeAppTab].description}</p>
        <p className="text-sm text-slate-400">{applications[activeAppTab].details}</p>
        {!completedApps.has(activeAppTab) && (
          <button onClick={() => handleAppComplete(activeAppTab)} className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium">
            ✓ Mark as Understood
          </button>
        )}
      </div>
      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">{applications.map((_, i) => (<div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`} />))}</div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>
      {completedApps.size >= 4 && (
        <button onClick={() => goToPhase('test')} className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl">
          Take the Knowledge Test →
        </button>
      )}
    </div>
  );

  const renderTest = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Knowledge Assessment</h2>
      {!showTestResults ? (
        <div className="space-y-6 max-w-2xl w-full">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-white font-medium mb-3">{qIndex + 1}. {q.question}</p>
              <div className="grid gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onClick={() => handleTestAnswer(qIndex, oIndex)}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${testAnswers[qIndex] === oIndex ? 'bg-purple-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={() => setShowTestResults(true)}
            disabled={testAnswers.includes(-1)}
            className={`w-full py-4 rounded-xl font-semibold text-lg ${testAnswers.includes(-1) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'}`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center">
          <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🎉' : '📚'}</div>
          <h3 className="text-2xl font-bold text-white mb-2">Score: {calculateScore()}/10</h3>
          <p className="text-slate-300 mb-6">{calculateScore() >= 7 ? 'Excellent! You\'ve mastered angular momentum!' : 'Keep studying! Review and try again.'}</p>
          {calculateScore() >= 7 ? (
            <button onClick={() => goToPhase('mastery')} className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl">
              Claim Your Mastery Badge →
            </button>
          ) : (
            <button onClick={() => { setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase('review'); }} className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl">
              Review & Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-purple-900/50 via-pink-900/50 to-amber-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">⛸️</div>
        <h1 className="text-3xl font-bold text-white mb-4">Angular Momentum Master!</h1>
        <p className="text-xl text-slate-300 mb-6">You've mastered the conservation of angular momentum!</p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🔄</div><p className="text-sm text-slate-300">L = Iω</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">⚖️</div><p className="text-sm text-slate-300">I = Σmr²</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">⛸️</div><p className="text-sm text-slate-300">Figure Skating</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">⭐</div><p className="text-sm text-slate-300">Neutron Stars</p></div>
        </div>
        <button onClick={() => goToPhase('hook')} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl">↺ Explore Again</button>
      </div>
    </div>
  );

  const renderPhase = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Angular Momentum</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-purple-400 w-6 shadow-lg shadow-purple-400/30'
                    : phaseOrder.indexOf(phase) > phaseOrder.indexOf(p)
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-purple-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default AngularMomentumRenderer;
