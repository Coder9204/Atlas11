'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// HYDROSTATIC PRESSURE - Premium Design (10-Phase Structure)
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface GameEvent {
  type: string;
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface HydrostaticPressureRendererProps {
  gamePhase?: string;
  onGameEvent?: (event: GameEvent) => void;
}

// Premium Color System
const colors = {
  bgDeep: '#030712',
  bgSurface: '#0f172a',
  bgElevated: '#1e293b',
  bgHover: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textTertiary: '#94a3b8',
  textMuted: '#64748b',
  primary: '#06b6d4',
  primaryHover: '#0891b2',
  secondary: '#3b82f6',
  accent: '#8b5cf6',
  success: '#22c55e',
  successBg: 'rgba(34, 197, 94, 0.15)',
  warning: '#f59e0b',
  warningBg: 'rgba(245, 158, 11, 0.15)',
  error: '#ef4444',
  errorBg: 'rgba(239, 68, 68, 0.15)',
};

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

// Constants
const GRAVITY = 9.81;
const ATM_PRESSURE = 101325;

// Test questions
const testQuestions = [
  {
    q: "At 10 meters depth in fresh water, what is the approximate total pressure?",
    opts: [
      { text: "1 atmosphere", correct: false },
      { text: "2 atmospheres", correct: true },
      { text: "10 atmospheres", correct: false },
      { text: "0.5 atmospheres", correct: false }
    ],
    exp: "At 10m depth, hydrostatic pressure adds about 1 atm to the surface pressure. Total = 1 atm (surface) + 1 atm (water) = 2 atm."
  },
  {
    q: "In the equation P = ρgh, what does ρ (rho) represent?",
    opts: [
      { text: "Gravity", correct: false },
      { text: "Depth", correct: false },
      { text: "Fluid density", correct: true },
      { text: "Pressure", correct: false }
    ],
    exp: "ρ (rho) is the density of the fluid in kg/m³. Water is about 1000 kg/m³, seawater about 1025 kg/m³."
  },
  {
    q: "Why does pressure increase with depth in a fluid?",
    opts: [
      { text: "Temperature increases with depth", correct: false },
      { text: "The weight of fluid above pushes down", correct: true },
      { text: "Gravity gets stronger at depth", correct: false },
      { text: "The fluid compresses at depth", correct: false }
    ],
    exp: "Hydrostatic pressure comes from the weight of the fluid column above. More depth = more weight = more pressure."
  },
  {
    q: "Three containers of different shapes are filled to the same height. Which has the highest pressure at the bottom?",
    opts: [
      { text: "The widest container", correct: false },
      { text: "The narrowest container", correct: false },
      { text: "All have equal pressure", correct: true },
      { text: "Cannot determine without knowing volumes", correct: false }
    ],
    exp: "This is the Hydrostatic Paradox! Pressure depends only on depth (P = ρgh), not on container shape or volume."
  },
  {
    q: "A diver at 30m experiences how many atmospheres of total pressure?",
    opts: [
      { text: "3 atm", correct: false },
      { text: "4 atm", correct: true },
      { text: "30 atm", correct: false },
      { text: "2 atm", correct: false }
    ],
    exp: "At 30m: 1 atm surface pressure + 3 atm from water (10m ≈ 1 atm) = 4 atmospheres total."
  },
  {
    q: "Why must divers ascend slowly from deep dives?",
    opts: [
      { text: "To avoid getting tired", correct: false },
      { text: "To let dissolved gases release safely", correct: true },
      { text: "To save air in the tank", correct: false },
      { text: "To adjust to temperature changes", correct: false }
    ],
    exp: "At depth, nitrogen dissolves into blood due to pressure. Rapid ascent causes gas bubbles to form (decompression sickness or 'the bends')."
  },
  {
    q: "Why are dams thicker at the bottom than at the top?",
    opts: [
      { text: "To look more impressive", correct: false },
      { text: "Because pressure increases with depth", correct: true },
      { text: "To hold more concrete", correct: false },
      { text: "For aesthetic reasons", correct: false }
    ],
    exp: "Water pressure increases linearly with depth (P = ρgh). The bottom faces the highest pressure and needs the most structural strength."
  },
  {
    q: "How does a water tower provide pressure to homes?",
    opts: [
      { text: "Electric pumps in the tower", correct: false },
      { text: "Gravity creates hydrostatic pressure from height", correct: true },
      { text: "Compressed air in the tank", correct: false },
      { text: "The tower spins to create pressure", correct: false }
    ],
    exp: "Water towers use gravity: the height of water creates pressure P = ρgh. A 30m tower provides about 3 atm of pressure."
  },
  {
    q: "In Pascal's barrel experiment, why did a small amount of water burst the barrel?",
    opts: [
      { text: "The water was very hot", correct: false },
      { text: "The tall tube created high pressure despite small volume", correct: true },
      { text: "The barrel was made of weak material", correct: false },
      { text: "Air pressure pushed on the barrel", correct: false }
    ],
    exp: "A 10m tall tube creates ~1 atm of additional pressure regardless of its width. Height, not volume, determines pressure."
  },
  {
    q: "If you replaced water with mercury (13.6× denser), how would the pressure at 1m depth compare?",
    opts: [
      { text: "Same pressure", correct: false },
      { text: "13.6 times higher", correct: true },
      { text: "13.6 times lower", correct: false },
      { text: "Slightly higher", correct: false }
    ],
    exp: "P = ρgh. Since mercury's density is 13.6× water's density, the pressure at the same depth is 13.6× higher."
  }
];

// Transfer applications
const transferApps = [
  {
    title: "Dam Engineering",
    subtitle: "Holding Back Millions of Tons",
    icon: "🏗️",
    desc: "Modern dams must resist enormous hydrostatic forces. Engineers design walls that are thicker at the bottom where pressure is highest, following P = ρgh precisely.",
    connection: "The hydrostatic equation determines exactly how thick each section of the dam must be to withstand the water pressure at that depth.",
    stats: [
      { val: "1.8 MPa", label: "Pressure at 180m" },
      { val: "200m", label: "Hoover Dam thickness" },
      { val: "6.6M tons", label: "Three Gorges concrete" }
    ],
    color: colors.primary
  },
  {
    title: "Scuba Diving",
    subtitle: "Surviving the Depths",
    icon: "🤿",
    desc: "Divers experience firsthand how pressure increases with depth. Every 10m adds about 1 atm. Understanding this keeps divers safe from decompression sickness.",
    connection: "Divers breathe air at ambient pressure. The deeper they go, the more nitrogen dissolves in their blood due to increased pressure.",
    stats: [
      { val: "40m", label: "Recreational limit" },
      { val: "4 atm", label: "Pressure at 30m" },
      { val: "1,100 atm", label: "Mariana Trench" }
    ],
    color: colors.secondary
  },
  {
    title: "Blood Pressure",
    subtitle: "Hydrostatics in Your Body",
    icon: "💓",
    desc: "Blood is a fluid, so it follows hydrostatic principles. Standing up causes blood to pool in your legs due to the pressure difference between head and feet.",
    connection: "A 1.7m tall person has about 130 mmHg pressure difference between head and feet when standing, purely from hydrostatics.",
    stats: [
      { val: "~130 mmHg", label: "Head-foot difference" },
      { val: "1060 kg/m³", label: "Blood density" },
      { val: "100+ adj/min", label: "Body compensates" }
    ],
    color: colors.accent
  },
  {
    title: "Hydraulic Systems",
    subtitle: "Pascal's Principle at Work",
    icon: "🚗",
    desc: "Car brakes, excavators, and lifts all use hydraulic fluid to transmit force. Pascal's principle ensures pressure transmits equally throughout the fluid.",
    connection: "By using different piston sizes, small forces can lift heavy loads. The pressure (P = F/A) is the same, but force scales with area.",
    stats: [
      { val: "50:1", label: "Force multiplication" },
      { val: "700 bar", label: "Industrial pressure" },
      { val: "100+ tons", label: "Press capacity" }
    ],
    color: colors.warning
  }
];

const HydrostaticPressureRenderer: React.FC<HydrostaticPressureRendererProps> = ({ onGameEvent }) => {
  // State
  const [phase, setPhase] = useState<Phase>('hook');
  const [isMobile, setIsMobile] = useState(false);

  // Prediction states
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Simulation states
  const [depth, setDepth] = useState(10);
  const [fluidDensity, setFluidDensity] = useState(1000);
  const [showPressureArrows, setShowPressureArrows] = useState(true);
  const [animationOffset, setAnimationOffset] = useState(0);

  // Twist simulation
  const [selectedContainer, setSelectedContainer] = useState<number | null>(null);
  const [experimentCount, setExperimentCount] = useState(0);

  // Transfer states
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Test states
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [testScore, setTestScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  // Animation ref
  const animationRef = useRef<number>();

  // Calculations
  const hydrostaticPressure = fluidDensity * GRAVITY * depth;
  const totalPressure = ATM_PRESSURE + hydrostaticPressure;
  const pressureInAtm = totalPressure / ATM_PRESSURE;

  // Responsive check
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
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

  // Animation loop
  useEffect(() => {
    const animate = () => {
      setAnimationOffset(prev => (prev + 1) % 60);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  // Reset test on entry
  useEffect(() => {
    if (phase === 'test') {
      setCurrentQuestion(0);
      setTestAnswers(Array(10).fill(null));
      setTestScore(0);
      setShowExplanation(false);
    }
  }, [phase]);

  // Event emitter
  const emit = useCallback((type: string, details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      type,
      gameType: 'hydrostatic_pressure',
      gameTitle: 'Hydrostatic Pressure',
      details: { phase, ...details },
      timestamp: Date.now()
    });
  }, [onGameEvent, phase]);

  // Sound
  const playSound = useCallback((type: 'click' | 'success' | 'error' | 'bubble') => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'bubble') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else {
        const freq = type === 'success' ? 800 : type === 'error' ? 300 : 500;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch {}
  }, []);

  // Navigation
  const goToPhase = useCallback((p: Phase) => {
    playSound('click');
    setPhase(p);
    emit('phase_changed', { to: p });
  }, [playSound, emit]);

  // Test answer handler
  const handleAnswer = useCallback((idx: number) => {
    if (testAnswers[currentQuestion] !== null) return;
    const newAnswers = [...testAnswers];
    newAnswers[currentQuestion] = idx;
    setTestAnswers(newAnswers);
    setShowExplanation(true);
    if (testQuestions[currentQuestion].opts[idx]?.correct) {
      setTestScore(s => s + 1);
      playSound('success');
    } else {
      playSound('error');
    }
  }, [currentQuestion, testAnswers, playSound]);

  // Return to dashboard
  const handleReturnToDashboard = useCallback(() => {
    emit('button_clicked', { action: 'return_to_dashboard' });
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }, [emit]);

  // ============================================================================
  // VISUALIZATION
  // ============================================================================
  const renderPressureTank = () => {
    const width = isMobile ? 320 : 400;
    const height = isMobile ? 280 : 320;
    const tankTop = 50;
    const tankHeight = 180;
    const tankLeft = 60;
    const tankWidth = 140;
    const depthRatio = depth / 50;
    const objectY = tankTop + depthRatio * tankHeight;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <svg width={width} height={height - 40} style={{ display: 'block' }}>
          <defs>
            {/* Premium water gradient with depth effect - 6 color stops */}
            <linearGradient id="hydroWaterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.4" />
              <stop offset="15%" stopColor="#38bdf8" stopOpacity="0.55" />
              <stop offset="35%" stopColor="#0ea5e9" stopOpacity="0.7" />
              <stop offset="55%" stopColor="#0284c7" stopOpacity="0.8" />
              <stop offset="80%" stopColor="#0369a1" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#075985" stopOpacity="0.95" />
            </linearGradient>

            {/* Glass container effect gradient */}
            <linearGradient id="hydroGlassLeft" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.6" />
              <stop offset="30%" stopColor="#64748b" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#475569" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="hydroGlassRight" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.5" />
              <stop offset="30%" stopColor="#64748b" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#475569" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="hydroGlassBottom" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#64748b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#475569" stopOpacity="0.1" />
            </linearGradient>

            {/* Pressure arrow gradient - green intensity */}
            <linearGradient id="hydroPressureArrow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
              <stop offset="40%" stopColor="#22c55e" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#4ade80" stopOpacity="1" />
              <stop offset="100%" stopColor="#86efac" stopOpacity="1" />
            </linearGradient>

            {/* Diver/object glow gradient */}
            <radialGradient id="hydroDiverGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.7" />
            </radialGradient>

            {/* Pressure readout panel gradient */}
            <linearGradient id="hydroPanelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Bubble gradient */}
            <radialGradient id="hydroBubbleGradient" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#e0f2fe" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.2" />
            </radialGradient>

            {/* Surface shimmer gradient */}
            <linearGradient id="hydroSurfaceShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.2" />
              <stop offset="25%" stopColor="#bae6fd" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#e0f2fe" stopOpacity="1" />
              <stop offset="75%" stopColor="#bae6fd" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.2" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="hydroDiverGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="hydroArrowGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="hydroBubbleGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="hydroPanelGlowFilter" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Arrow marker with gradient */}
            <marker id="hydroPressureArrowMarker" markerWidth="8" markerHeight="8" refX="0" refY="4" orient="auto">
              <path d="M0,0 L0,8 L8,4 z" fill="url(#hydroPressureArrow)" />
            </marker>
          </defs>

          {/* Background */}
          <rect x="0" y="0" width={width} height={height - 40} fill="#0f172a" rx="12" />

          {/* Tank water fill */}
          <rect x={tankLeft} y={tankTop} width={tankWidth} height={tankHeight}
                fill="url(#hydroWaterGradient)" rx="6" />

          {/* Glass container walls */}
          <rect x={tankLeft - 3} y={tankTop - 2} width="6" height={tankHeight + 6}
                fill="url(#hydroGlassLeft)" rx="2" />
          <rect x={tankLeft + tankWidth - 3} y={tankTop - 2} width="6" height={tankHeight + 6}
                fill="url(#hydroGlassRight)" rx="2" />
          <rect x={tankLeft - 3} y={tankTop + tankHeight - 2} width={tankWidth + 6} height="6"
                fill="url(#hydroGlassBottom)" rx="2" />

          {/* Container outline */}
          <rect x={tankLeft} y={tankTop} width={tankWidth} height={tankHeight}
                fill="none" stroke="#64748b" strokeWidth="2" rx="6" strokeOpacity="0.5" />

          {/* Surface shimmer line */}
          <line x1={tankLeft + 4} y1={tankTop + 4} x2={tankLeft + tankWidth - 4} y2={tankTop + 4}
                stroke="url(#hydroSurfaceShimmer)" strokeWidth="3" strokeLinecap="round" />

          {/* Depth markers with enhanced styling */}
          {[0, 10, 20, 30, 40, 50].map((d) => {
            const y = tankTop + (d / 50) * tankHeight;
            const isCurrentDepth = Math.abs(d - depth) < 5;
            return (
              <g key={d}>
                <line x1={tankLeft - 8} y1={y} x2={tankLeft - 2} y2={y}
                      stroke={isCurrentDepth ? colors.primary : '#64748b'}
                      strokeWidth={isCurrentDepth ? 2 : 1}
                      strokeOpacity={isCurrentDepth ? 1 : 0.6} />
                <text x={tankLeft - 12} y={y + 4} textAnchor="end"
                      fill={isCurrentDepth ? colors.primary : '#64748b'}
                      fontSize="9" fontWeight={isCurrentDepth ? 'bold' : 'normal'}>
                  {d}m
                </text>
              </g>
            );
          })}

          {/* Diver/Object with glow */}
          <g transform={`translate(${tankLeft + tankWidth/2}, ${Math.min(objectY, tankTop + tankHeight - 20)})`}
             filter="url(#hydroDiverGlowFilter)">
            <circle r="18" fill="url(#hydroDiverGlow)" />
            <circle r="18" fill="none" stroke="#fbbf24" strokeWidth="2" strokeOpacity="0.8" />
            <text y="5" textAnchor="middle" fill="#1e293b" fontSize="11" fontWeight="bold">{depth}m</text>
          </g>

          {/* Pressure arrows with glow - size increases with depth */}
          {showPressureArrows && (
            <g transform={`translate(${tankLeft + tankWidth/2}, ${Math.min(objectY, tankTop + tankHeight - 20)})`}>
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
                const baseLength = 18 + (depth / 50) * 30;
                const rad = (angle * Math.PI) / 180;
                const startRadius = 24;
                const x1 = Math.cos(rad) * startRadius;
                const y1 = Math.sin(rad) * startRadius;
                const x2 = Math.cos(rad) * (startRadius + baseLength);
                const y2 = Math.sin(rad) * (startRadius + baseLength);
                return (
                  <line key={i} x1={x2} y1={y2} x2={x1} y2={y1}
                        stroke="url(#hydroPressureArrow)" strokeWidth={2 + depth / 25}
                        markerEnd="url(#hydroPressureArrowMarker)"
                        filter="url(#hydroArrowGlowFilter)"
                        opacity={0.7 + (depth / 100)} />
                );
              })}
            </g>
          )}

          {/* Animated bubbles with glow */}
          {[1, 2, 3, 4, 5].map(i => {
            const bubbleY = tankTop + tankHeight - ((animationOffset * 2 + i * 30) % tankHeight);
            const bubbleX = tankLeft + 15 + i * 25;
            const bubbleSize = 2 + (i % 3);
            return (
              <circle key={i} cx={bubbleX} cy={bubbleY} r={bubbleSize}
                      fill="url(#hydroBubbleGradient)"
                      filter="url(#hydroBubbleGlowFilter)"
                      opacity={0.4 + (bubbleY - tankTop) / tankHeight * 0.4} />
            );
          })}

          {/* Pressure readout panel with glow */}
          <g filter="url(#hydroPanelGlowFilter)">
            <rect x={width - 120} y="35" width="110" height="130" fill="url(#hydroPanelGradient)" rx="10"
                  stroke="#374151" strokeWidth="1" strokeOpacity="0.5" />
          </g>
          <text x={width - 65} y="55" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold"
                letterSpacing="0.05em">PRESSURE</text>

          <text x={width - 65} y="82" textAnchor="middle" fill={colors.success} fontSize="18" fontWeight="bold">
            {(hydrostaticPressure / 1000).toFixed(1)}
          </text>
          <text x={width - 65} y="98" textAnchor="middle" fill="#64748b" fontSize="9">kPa (hydrostatic)</text>

          <line x1={width - 110} y1="108" x2={width - 20} y2="108" stroke="#374151" strokeWidth="1" strokeOpacity="0.5" />

          <text x={width - 65} y="130" textAnchor="middle" fill={colors.secondary} fontSize="18" fontWeight="bold">
            {pressureInAtm.toFixed(2)}
          </text>
          <text x={width - 65} y="146" textAnchor="middle" fill="#64748b" fontSize="9">atm (total)</text>
        </svg>

        {/* Formula moved outside SVG using typo system */}
        <div style={{
          padding: '10px 16px',
          background: `linear-gradient(135deg, ${colors.bgSurface} 0%, ${colors.bgElevated} 100%)`,
          borderRadius: '10px',
          border: `1px solid ${colors.bgHover}`,
          textAlign: 'center'
        }}>
          <span style={{ fontSize: typo.body, color: colors.warning, fontWeight: 700, fontFamily: 'monospace' }}>
            P = rgh = {fluidDensity} x 9.81 x {depth} = {(hydrostaticPressure / 1000).toFixed(1)} kPa
          </span>
        </div>
      </div>
    );
  };

  // Container comparison visualization
  const renderContainerComparison = () => {
    const width = isMobile ? 320 : 400;
    const height = 200;
    const waterHeight = 80;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <svg width={width} height={height - 30} style={{ display: 'block' }}>
          <defs>
            {/* Container water gradients with depth effect */}
            <linearGradient id="hydroContainerWater" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.4" />
              <stop offset="30%" stopColor="#3b82f6" stopOpacity="0.6" />
              <stop offset="60%" stopColor="#2563eb" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.9" />
            </linearGradient>

            {/* Glass container gradient */}
            <linearGradient id="hydroContainerGlass" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#64748b" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.5" />
            </linearGradient>

            {/* Pressure sensor glow */}
            <radialGradient id="hydroSensorGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="1" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>

            {/* Height indicator gradient */}
            <linearGradient id="hydroHeightIndicator" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="1" />
            </linearGradient>

            {/* Surface shimmer */}
            <linearGradient id="hydroContainerSurface" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#dbeafe" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.3" />
            </linearGradient>

            {/* Glow filter for containers */}
            <filter id="hydroContainerGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Sensor glow filter */}
            <filter id="hydroSensorGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Arrow markers */}
            <marker id="hydroHeightArrowUp" markerWidth="6" markerHeight="6" refX="3" refY="6" orient="auto">
              <path d="M0,6 L3,0 L6,6 z" fill="#fbbf24" />
            </marker>
            <marker id="hydroHeightArrowDown" markerWidth="6" markerHeight="6" refX="3" refY="0" orient="auto">
              <path d="M0,0 L3,6 L6,0 z" fill="#fbbf24" />
            </marker>
          </defs>

          <rect width={width} height={height - 30} fill="#0f172a" rx="12" />

          {/* Wide container */}
          <g transform={`translate(${width * 0.17}, 25)`}>
            <rect x="-42" y={100 - waterHeight - 2} width="84" height={waterHeight + 4}
                  fill="url(#hydroContainerGlass)" rx="6" strokeOpacity="0" />
            <rect x="-40" y={100 - waterHeight} width="80" height={waterHeight}
                  fill="url(#hydroContainerWater)" rx="4" />
            <line x1="-36" y1={100 - waterHeight + 3} x2="36" y2={100 - waterHeight + 3}
                  stroke="url(#hydroContainerSurface)" strokeWidth="2" strokeLinecap="round" />
            <rect x="-40" y={100 - waterHeight} width="80" height={waterHeight}
                  fill="none" stroke="#64748b" strokeWidth="2" rx="4" strokeOpacity="0.6" />
            {selectedContainer === 0 && (
              <g filter="url(#hydroSensorGlowFilter)">
                <circle cx="0" cy={100 - 12} r="8" fill="url(#hydroSensorGlow)" />
                <circle cx="0" cy={100 - 12} r="4" fill="#fbbf24" />
              </g>
            )}
          </g>

          {/* Medium container */}
          <g transform={`translate(${width * 0.5}, 25)`}>
            <rect x="-22" y={100 - waterHeight - 2} width="44" height={waterHeight + 4}
                  fill="url(#hydroContainerGlass)" rx="4" strokeOpacity="0" />
            <rect x="-20" y={100 - waterHeight} width="40" height={waterHeight}
                  fill="url(#hydroContainerWater)" rx="3" />
            <line x1="-16" y1={100 - waterHeight + 3} x2="16" y2={100 - waterHeight + 3}
                  stroke="url(#hydroContainerSurface)" strokeWidth="2" strokeLinecap="round" />
            <rect x="-20" y={100 - waterHeight} width="40" height={waterHeight}
                  fill="none" stroke="#64748b" strokeWidth="2" rx="3" strokeOpacity="0.6" />
            {selectedContainer === 1 && (
              <g filter="url(#hydroSensorGlowFilter)">
                <circle cx="0" cy={100 - 12} r="8" fill="url(#hydroSensorGlow)" />
                <circle cx="0" cy={100 - 12} r="4" fill="#fbbf24" />
              </g>
            )}
          </g>

          {/* Narrow container */}
          <g transform={`translate(${width * 0.83}, 25)`}>
            <rect x="-7" y={100 - waterHeight - 2} width="14" height={waterHeight + 4}
                  fill="url(#hydroContainerGlass)" rx="3" strokeOpacity="0" />
            <rect x="-5" y={100 - waterHeight} width="10" height={waterHeight}
                  fill="url(#hydroContainerWater)" rx="2" />
            <line x1="-3" y1={100 - waterHeight + 2} x2="3" y2={100 - waterHeight + 2}
                  stroke="url(#hydroContainerSurface)" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="-5" y={100 - waterHeight} width="10" height={waterHeight}
                  fill="none" stroke="#64748b" strokeWidth="2" rx="2" strokeOpacity="0.6" />
            {selectedContainer === 2 && (
              <g filter="url(#hydroSensorGlowFilter)">
                <circle cx="0" cy={100 - 12} r="8" fill="url(#hydroSensorGlow)" />
                <circle cx="0" cy={100 - 12} r="4" fill="#fbbf24" />
              </g>
            )}
          </g>

          {/* Height indicator with arrows */}
          <g>
            <line x1={width - 28} y1={25 + 100 - waterHeight + 8} x2={width - 28} y2={25 + 100 - 8}
                  stroke="url(#hydroHeightIndicator)" strokeWidth="2"
                  markerStart="url(#hydroHeightArrowUp)" markerEnd="url(#hydroHeightArrowDown)" />
            <text x={width - 18} y={25 + 100 - waterHeight/2 + 4} fill="#fbbf24" fontSize="8" fontWeight="bold"
                  writingMode="vertical-rl" textAnchor="middle">SAME h</text>
          </g>
        </svg>

        {/* Labels moved outside SVG using typo system */}
        <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', padding: '0 20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: typo.small, color: colors.textSecondary, fontWeight: 600 }}>Wide</div>
            <div style={{ fontSize: typo.label, color: colors.textMuted }}>1000 L</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: typo.small, color: colors.textSecondary, fontWeight: 600 }}>Medium</div>
            <div style={{ fontSize: typo.label, color: colors.textMuted }}>100 L</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: typo.small, color: colors.textSecondary, fontWeight: 600 }}>Narrow</div>
            <div style={{ fontSize: typo.label, color: colors.textMuted }}>1 L</div>
          </div>
        </div>

        {/* Result text moved outside SVG */}
        <div style={{
          padding: '8px 16px',
          background: colors.successBg,
          border: `1px solid ${colors.success}40`,
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: typo.body, color: colors.success, fontWeight: 700 }}>
            All have EQUAL pressure at the bottom!
          </span>
        </div>
      </div>
    );
  };

  // ============================================================================
  // PHASE RENDERERS
  // ============================================================================

  // Hook Phase
  const renderHook = () => (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '24px 16px' : '48px 24px', textAlign: 'center' }}>
      {/* Category pill */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: `${colors.primary}20`, border: `1px solid ${colors.primary}40`, borderRadius: '100px', marginBottom: '24px' }}>
        <div style={{ width: '6px', height: '6px', background: colors.primary, borderRadius: '50%' }} />
        <span style={{ fontSize: '11px', fontWeight: 600, color: colors.primary, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Fluid Mechanics</span>
      </div>

      {/* Title */}
      <h1 style={{ fontSize: isMobile ? '32px' : '48px', fontWeight: 700, lineHeight: 1.1, marginBottom: '16px', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 50%, ${colors.accent} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
        Hydrostatic<br />Pressure
      </h1>

      <p style={{ fontSize: isMobile ? '16px' : '18px', color: colors.textSecondary, maxWidth: '420px', lineHeight: 1.6, marginBottom: '32px' }}>
        Why do your ears hurt when you dive deep?<br />Why are submarines built so strong?
      </p>

      {/* Visual */}
      <div style={{ width: '100%', maxWidth: '420px', background: `linear-gradient(135deg, ${colors.bgSurface} 0%, ${colors.bgDeep} 100%)`, borderRadius: '20px', padding: '20px', border: `1px solid ${colors.bgHover}`, marginBottom: '32px' }}>
        <svg width={isMobile ? 280 : 340} height={160} style={{ display: 'block', margin: '0 auto' }}>
          <defs>
            {/* Premium water gradient for hook */}
            <linearGradient id="hydroHookWater" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.35" />
              <stop offset="20%" stopColor="#38bdf8" stopOpacity="0.5" />
              <stop offset="45%" stopColor="#0ea5e9" stopOpacity="0.65" />
              <stop offset="70%" stopColor="#0284c7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#075985" stopOpacity="0.95" />
            </linearGradient>

            {/* Diver glow gradient */}
            <radialGradient id="hydroHookDiverGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.5" />
            </radialGradient>

            {/* Pool glass effect */}
            <linearGradient id="hydroHookGlass" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.4" />
              <stop offset="10%" stopColor="#64748b" stopOpacity="0.1" />
              <stop offset="90%" stopColor="#64748b" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.4" />
            </linearGradient>

            {/* Surface shimmer */}
            <linearGradient id="hydroHookSurface" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.2" />
              <stop offset="30%" stopColor="#e0f2fe" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#e0f2fe" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.2" />
            </linearGradient>

            {/* Pressure indicator gradient */}
            <linearGradient id="hydroHookPressureGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.9" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="hydroHookDiverFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect width={isMobile ? 280 : 340} height="160" fill="#0f172a" rx="12" />

          {/* Pool cross-section with glass effect */}
          <rect x="38" y="18" width={isMobile ? 204 : 264} height="124" fill="url(#hydroHookGlass)" rx="6" />
          <rect x="40" y="20" width={isMobile ? 200 : 260} height="120" fill="url(#hydroHookWater)" rx="4" />

          {/* Surface shimmer */}
          <line x1="44" y1="24" x2={isMobile ? 236 : 296} y2="24"
                stroke="url(#hydroHookSurface)" strokeWidth="3" strokeLinecap="round" />

          {/* Pressure gradient bar on right */}
          <rect x={isMobile ? 248 : 308} y="22" width="8" height="116"
                fill="url(#hydroHookPressureGradient)" rx="4" />

          {/* Surface diver with glow */}
          <g filter="url(#hydroHookDiverFilter)">
            <circle cx="70" cy="38" r="14" fill="url(#hydroHookDiverGlow)" />
            <circle cx="70" cy="38" r="14" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeOpacity="0.6" />
          </g>

          {/* Deep diver with glow */}
          <g filter="url(#hydroHookDiverFilter)">
            <circle cx={isMobile ? 200 : 240} cy="118" r="14" fill="url(#hydroHookDiverGlow)" />
            <circle cx={isMobile ? 200 : 240} r="14" cy="118" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeOpacity="0.6" />
          </g>

          {/* Depth markers */}
          <line x1="36" y1="20" x2="36" y2="140" stroke="#64748b" strokeWidth="1" strokeOpacity="0.5" />
          <text x="32" y="28" textAnchor="end" fill="#64748b" fontSize="8">0m</text>
          <text x="32" y="142" textAnchor="end" fill="#64748b" fontSize="8">10m</text>
        </svg>

        {/* Labels moved outside SVG */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 30px 0', marginBottom: '8px' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: typo.small, color: colors.primary, fontWeight: 600 }}>1 atm</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: typo.small, color: colors.error, fontWeight: 700 }}>2x pressure!</span>
          </div>
        </div>

        <p style={{ color: colors.primary, fontSize: '16px', fontWeight: 600, marginTop: '8px', textAlign: 'center' }}>
          At just 10 meters, pressure DOUBLES!
        </p>
      </div>

      {/* Quote */}
      <div style={{ maxWidth: '380px', padding: '16px 20px', background: colors.bgSurface, borderRadius: '12px', borderLeft: `3px solid ${colors.primary}`, marginBottom: '32px' }}>
        <p style={{ fontSize: '14px', color: colors.textTertiary, fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
          "Every 10 meters of water adds about 1 atmosphere of pressure."
        </p>
        <p style={{ fontSize: '12px', color: colors.textMuted, marginTop: '8px', marginBottom: 0 }}>— Diving Physics</p>
      </div>

      {/* CTA */}
      <button
        onClick={() => goToPhase('predict')}
        style={{ zIndex: 10, padding: '16px 40px', fontSize: '16px', fontWeight: 600, color: '#fff', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`, border: 'none', borderRadius: '14px', cursor: 'pointer', boxShadow: `0 8px 32px ${colors.primary}40`, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
      >
        Discover Why →
      </button>

      <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
        {[{ icon: '⏱', text: '5 min' }, { icon: '🧪', text: 'Lab' }, { icon: '📝', text: 'Quiz' }].map((f, i) => (
          <span key={i} style={{ fontSize: '12px', color: colors.textMuted }}>{f.icon} {f.text}</span>
        ))}
      </div>
    </div>
  );

  // Predict Phase
  const renderPredict = () => {
    const options = [
      { id: 'cold', label: 'Water gets colder and denser', desc: 'Temperature changes with depth', icon: '❄️' },
      { id: 'weight', label: 'Weight of water above pushes down', desc: 'More water = more weight', icon: '⬇️' },
      { id: 'gravity', label: 'Gravity is stronger at depth', desc: 'Gravity pulls harder below', icon: '🌍' }
    ];

    return (
      <div style={{ padding: isMobile ? '24px 16px' : '32px 24px', maxWidth: '560px', margin: '0 auto' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: colors.primary, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>Step 2 • Make Your Prediction</p>
        <h2 style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 700, color: colors.textPrimary, marginBottom: '8px', lineHeight: 1.2 }}>Why Does Pressure Increase With Depth?</h2>
        <p style={{ fontSize: '15px', color: colors.textSecondary, marginBottom: '28px', lineHeight: 1.5 }}>What causes the crushing pressure deep underwater?</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => { if (prediction !== opt.id) { playSound('click'); setPrediction(opt.id); emit('prediction_made', { prediction: opt.id }); } }}
              style={{ zIndex: 10, display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', textAlign: 'left', background: prediction === opt.id ? colors.successBg : colors.bgSurface, border: `2px solid ${prediction === opt.id ? colors.success : 'transparent'}`, borderRadius: '14px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
            >
              <span style={{ fontSize: '28px' }}>{opt.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ color: colors.textPrimary, fontWeight: 600, fontSize: '15px', margin: 0 }}>{opt.label}</p>
                <p style={{ color: colors.textTertiary, fontSize: '13px', margin: '4px 0 0' }}>{opt.desc}</p>
              </div>
              {prediction === opt.id && <span style={{ color: colors.success, fontSize: '20px' }}>✓</span>}
            </button>
          ))}
        </div>

        {prediction && (
          <button
            onClick={() => goToPhase('play')}
            style={{ zIndex: 10, width: '100%', padding: '16px', fontSize: '16px', fontWeight: 600, color: '#fff', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`, border: 'none', borderRadius: '14px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
          >
            Explore the Depths →
          </button>
        )}
      </div>
    );
  };

  // Play Phase
  const renderPlay = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: isMobile ? '16px 20px' : '20px 32px', borderBottom: `1px solid ${colors.bgHover}`, flexShrink: 0, background: colors.bgSurface }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: colors.primary, letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 8px' }}>Step 3 • Interactive Lab</p>
        <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary, margin: '0 0 4px' }}>PRESSURE vs DEPTH</h1>
        <p style={{ fontSize: isMobile ? '14px' : '16px', color: colors.textSecondary, margin: 0 }}>
          Adjust the depth slider and watch pressure change in real-time
        </p>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
        {/* Visualization */}
        <div style={{ padding: isMobile ? '20px' : '28px', background: colors.bgDeep }}>
          <div style={{ maxWidth: '500px', margin: '0 auto', background: colors.bgSurface, borderRadius: '16px', padding: '16px', border: `1px solid ${colors.bgHover}` }}>
            {renderPressureTank()}
          </div>
        </div>

        {/* Controls */}
        <div style={{ padding: isMobile ? '20px' : '28px', background: colors.bgSurface, borderTop: `1px solid ${colors.bgHover}`, borderBottom: `1px solid ${colors.bgHover}` }}>
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            {/* Depth slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: colors.textSecondary }}>Depth</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: colors.primary }}>{depth} meters</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={depth}
                onChange={(e) => { setDepth(Number(e.target.value)); playSound('bubble'); }}
                style={{ width: '100%', height: '8px', borderRadius: '4px', background: colors.bgElevated, cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ fontSize: '11px', color: colors.textMuted }}>Surface</span>
                <span style={{ fontSize: '11px', color: colors.textMuted }}>50m</span>
              </div>
            </div>

            {/* Fluid selector */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>Fluid Type</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { value: 1000, label: 'Fresh Water' },
                  { value: 1025, label: 'Salt Water' },
                  { value: 13600, label: 'Mercury' }
                ].map(fluid => (
                  <button
                    key={fluid.value}
                    onClick={() => { setFluidDensity(fluid.value); playSound('click'); }}
                    style={{ zIndex: 10, padding: '10px 16px', fontSize: '13px', fontWeight: 600, background: fluidDensity === fluid.value ? colors.primary : colors.bgElevated, color: fluidDensity === fluid.value ? '#fff' : colors.textSecondary, border: 'none', borderRadius: '8px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  >
                    {fluid.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle pressure arrows */}
            <button
              onClick={() => setShowPressureArrows(!showPressureArrows)}
              style={{ zIndex: 10, width: '100%', padding: '12px', fontSize: '14px', fontWeight: 600, background: showPressureArrows ? colors.success : colors.bgElevated, color: showPressureArrows ? '#fff' : colors.textSecondary, border: 'none', borderRadius: '8px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              {showPressureArrows ? '● Pressure Arrows ON' : '○ Pressure Arrows OFF'}
            </button>
          </div>
        </div>

        {/* Key observation */}
        <div style={{ padding: isMobile ? '20px' : '28px', background: colors.bgDeep }}>
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <div style={{ background: colors.successBg, border: `1px solid ${colors.success}40`, borderRadius: '12px', padding: '16px' }}>
              <p style={{ color: colors.textSecondary, fontSize: '15px', margin: 0, lineHeight: 1.6 }}>
                <strong style={{ color: colors.success }}>Key Insight:</strong> Pressure acts <strong>equally in all directions</strong> at any depth. Notice how the arrows point inward from all sides!
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: isMobile ? '14px 20px' : '18px 32px', borderTop: `1px solid ${colors.bgHover}`, flexShrink: 0, background: colors.bgSurface }}>
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
          <button
            onClick={() => goToPhase('review')}
            style={{ zIndex: 10, width: '100%', padding: '16px', fontSize: '16px', fontWeight: 600, color: '#fff', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`, border: 'none', borderRadius: '14px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
          >
            Learn the Equation →
          </button>
        </div>
      </div>
    </div>
  );

  // Review Phase
  const renderReview = () => (
    <div style={{ padding: isMobile ? '24px 16px' : '32px 24px', maxWidth: '560px', margin: '0 auto' }}>
      <p style={{ fontSize: '11px', fontWeight: 600, color: colors.primary, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>Step 4 • The Science</p>
      <h2 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 700, color: colors.textPrimary, marginBottom: '20px' }}>The Hydrostatic Equation</h2>

      {/* Equation card */}
      <div style={{ background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.secondary}20 100%)`, borderRadius: '16px', padding: '24px', marginBottom: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: '36px', fontWeight: 700, color: colors.primary, fontFamily: 'monospace', margin: '0 0 8px' }}>P = ρgh</p>
        <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0 }}>Hydrostatic Pressure Equation</p>
      </div>

      {/* Variable explanations */}
      <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
        {[
          { symbol: 'P', name: 'Pressure', unit: 'Pascals (Pa)', color: colors.primary },
          { symbol: 'ρ', name: 'Fluid Density', unit: 'kg/m³', color: colors.warning },
          { symbol: 'g', name: 'Gravity', unit: '9.81 m/s²', color: colors.success },
          { symbol: 'h', name: 'Depth', unit: 'meters (m)', color: colors.accent }
        ].map(v => (
          <div key={v.symbol} style={{ display: 'flex', alignItems: 'center', gap: '16px', background: colors.bgSurface, borderRadius: '12px', padding: '14px 18px' }}>
            <span style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'monospace', color: v.color, width: '36px', textAlign: 'center' }}>{v.symbol}</span>
            <div>
              <p style={{ color: colors.textPrimary, fontWeight: 600, fontSize: '15px', margin: 0 }}>{v.name}</p>
              <p style={{ color: colors.textMuted, fontSize: '13px', margin: '2px 0 0' }}>{v.unit}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Total pressure note */}
      <div style={{ background: colors.warningBg, border: `1px solid ${colors.warning}40`, borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
        <p style={{ color: colors.warning, fontWeight: 700, margin: '0 0 8px' }}>Don't Forget Atmospheric Pressure!</p>
        <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
          <strong>P<sub>total</sub> = P<sub>atm</sub> + ρgh</strong><br />
          At the surface, you already have 1 atm (101,325 Pa) pressing on you!
        </p>
      </div>

      {/* Quick reference */}
      <div style={{ background: colors.bgSurface, borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
        <p style={{ color: colors.textTertiary, fontWeight: 600, margin: '0 0 12px' }}>Quick Reference (Water)</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {[
            { depth: '0m', atm: '1 atm' },
            { depth: '10m', atm: '2 atm' },
            { depth: '30m', atm: '4 atm' },
            { depth: '100m', atm: '11 atm' }
          ].map(r => (
            <div key={r.depth} style={{ textAlign: 'center', padding: '10px', background: colors.bgElevated, borderRadius: '8px' }}>
              <p style={{ color: colors.primary, fontWeight: 700, fontSize: '14px', margin: 0 }}>{r.depth}</p>
              <p style={{ color: colors.textMuted, fontSize: '11px', margin: '4px 0 0' }}>{r.atm}</p>
            </div>
          ))}
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: '14px', color: colors.textMuted, marginBottom: '24px' }}>
        Your prediction: {prediction === 'weight' ? '✅ Correct!' : '🤔 Now you understand!'}
      </p>

      <button
        onClick={() => goToPhase('twist_predict')}
        style={{ zIndex: 10, width: '100%', padding: '16px', fontSize: '16px', fontWeight: 600, color: '#fff', background: `linear-gradient(135deg, ${colors.warning} 0%, #ea580c 100%)`, border: 'none', borderRadius: '14px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
      >
        A Surprising Paradox →
      </button>
    </div>
  );

  // Twist Predict Phase
  const renderTwistPredict = () => {
    const options = [
      { id: 'wide', label: 'Wide container (most water)', desc: 'More volume = more pressure?' },
      { id: 'narrow', label: 'Narrow container (least water)', desc: 'Concentrated column?' },
      { id: 'equal', label: 'All equal pressure', desc: 'Only depth matters?' }
    ];

    return (
      <div style={{ padding: isMobile ? '24px 16px' : '32px 24px', maxWidth: '560px', margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', background: colors.warningBg, borderRadius: '6px', marginBottom: '16px' }}>
          <span style={{ fontSize: '14px' }}>🌀</span>
          <span style={{ fontSize: '11px', color: colors.warning, fontWeight: 600 }}>TWIST: The Paradox!</span>
        </div>

        <h2 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 700, color: colors.warning, marginBottom: '8px' }}>Different Shapes, Same Height</h2>
        <p style={{ fontSize: '15px', color: colors.textSecondary, marginBottom: '24px' }}>Three containers with vastly different volumes, but filled to the same height. Which has more pressure at the bottom?</p>

        {/* Visual */}
        <div style={{ background: colors.bgSurface, borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
          {renderContainerComparison()}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => { if (twistPrediction !== opt.id) { playSound('click'); setTwistPrediction(opt.id); } }}
              style={{ zIndex: 10, padding: '16px 20px', textAlign: 'left', background: twistPrediction === opt.id ? colors.warningBg : colors.bgSurface, border: `2px solid ${twistPrediction === opt.id ? colors.warning : 'transparent'}`, borderRadius: '14px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
            >
              <p style={{ color: colors.textPrimary, fontWeight: 600, fontSize: '15px', margin: 0 }}>{opt.label}</p>
              <p style={{ color: colors.textTertiary, fontSize: '13px', margin: '4px 0 0' }}>{opt.desc}</p>
            </button>
          ))}
        </div>

        {twistPrediction && (
          <button
            onClick={() => goToPhase('twist_play')}
            style={{ zIndex: 10, width: '100%', padding: '16px', fontSize: '16px', fontWeight: 600, color: '#fff', background: `linear-gradient(135deg, ${colors.warning} 0%, #ea580c 100%)`, border: 'none', borderRadius: '14px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
          >
            Test Your Prediction →
          </button>
        )}
      </div>
    );
  };

  // Twist Play Phase
  const renderTwistPlay = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: isMobile ? '16px 20px' : '20px 32px', borderBottom: `1px solid ${colors.bgHover}`, flexShrink: 0, background: colors.bgSurface }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', background: colors.warningBg, borderRadius: '6px', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px' }}>🌀</span>
          <span style={{ fontSize: '11px', color: colors.warning, fontWeight: 600 }}>TWIST EXPERIMENT</span>
        </div>
        <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary, margin: '0 0 4px' }}>CONTAINER COMPARISON</h1>
        <p style={{ fontSize: isMobile ? '14px' : '16px', color: colors.textSecondary, margin: 0 }}>
          Click each container to measure pressure at the bottom
        </p>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
        <div style={{ padding: isMobile ? '20px' : '28px', background: colors.bgDeep }}>
          <div style={{ maxWidth: '500px', margin: '0 auto', background: colors.bgSurface, borderRadius: '16px', padding: '16px', border: `1px solid ${colors.bgHover}` }}>
            {renderContainerComparison()}
          </div>
        </div>

        <div style={{ padding: isMobile ? '20px' : '28px', background: colors.bgSurface, borderTop: `1px solid ${colors.bgHover}`, borderBottom: `1px solid ${colors.bgHover}` }}>
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: colors.textSecondary, marginBottom: '16px' }}>Select a container to measure:</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {['Wide (1000L)', 'Medium (100L)', 'Narrow (1L)'].map((label, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedContainer(i);
                    setExperimentCount(c => c + 1);
                    playSound('success');
                  }}
                  style={{ zIndex: 10, padding: '14px 24px', fontSize: '14px', fontWeight: 600, background: selectedContainer === i ? colors.primary : colors.bgElevated, color: selectedContainer === i ? '#fff' : colors.textSecondary, border: 'none', borderRadius: '10px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                >
                  {label}
                </button>
              ))}
            </div>

            {selectedContainer !== null && (
              <div style={{ marginTop: '20px', padding: '16px', background: colors.successBg, border: `1px solid ${colors.success}40`, borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ color: colors.success, fontWeight: 700, fontSize: '18px', margin: '0 0 8px' }}>
                  Pressure: {(1000 * 9.81 * 0.8 / 1000).toFixed(1)} kPa
                </p>
                <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
                  Same as the other containers!
                </p>
              </div>
            )}

            <p style={{ textAlign: 'center', fontSize: '13px', color: colors.textMuted, margin: '16px 0 0' }}>
              Measurements: {experimentCount} (try all 3)
            </p>
          </div>
        </div>

        <div style={{ padding: isMobile ? '20px' : '28px', background: colors.bgDeep }}>
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <div style={{ background: colors.warningBg, border: `1px solid ${colors.warning}40`, borderRadius: '12px', padding: '16px' }}>
              <p style={{ color: colors.warning, fontWeight: 700, margin: '0 0 8px' }}>The Hydrostatic Paradox!</p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
                Despite huge differences in volume, all containers have <strong>identical pressure</strong> at the bottom because they have the same <strong>height</strong>!
              </p>
            </div>
          </div>
        </div>
      </div>

      {experimentCount >= 3 && (
        <div style={{ padding: isMobile ? '14px 20px' : '18px 32px', borderTop: `1px solid ${colors.bgHover}`, flexShrink: 0, background: colors.bgSurface }}>
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <button
              onClick={() => goToPhase('twist_review')}
              style={{ zIndex: 10, width: '100%', padding: '16px', fontSize: '16px', fontWeight: 600, color: '#fff', background: `linear-gradient(135deg, ${colors.warning} 0%, #ea580c 100%)`, border: 'none', borderRadius: '14px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
            >
              Understand the Paradox →
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Twist Review Phase
  const renderTwistReview = () => (
    <div style={{ padding: isMobile ? '24px 16px' : '32px 24px', maxWidth: '560px', margin: '0 auto' }}>
      <p style={{ fontSize: '11px', fontWeight: 600, color: colors.warning, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>Step 7 • Deep Understanding</p>
      <h2 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 700, color: colors.warning, marginBottom: '20px' }}>Why Shape Doesn't Matter</h2>

      {/* Key insight */}
      <div style={{ background: colors.warningBg, borderRadius: '16px', padding: '24px', marginBottom: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: '20px', fontWeight: 700, color: colors.warning, margin: '0 0 12px' }}>P = ρgh</p>
        <p style={{ color: colors.textSecondary, fontSize: '15px', margin: 0, lineHeight: 1.6 }}>
          Notice: <strong>Volume doesn't appear!</strong><br />
          Pressure depends ONLY on density, gravity, and <strong>height</strong>.
        </p>
      </div>

      {/* Pascal's barrel */}
      <div style={{ background: colors.bgSurface, borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ color: colors.accent, fontWeight: 700, fontSize: '16px', margin: '0 0 12px' }}>Pascal's Famous Barrel (1646)</h3>
        <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
          Blaise Pascal attached a thin 10-meter tube to a sealed barrel. By adding just a few cups of water to the tube, he created enough pressure to <strong style={{ color: colors.error }}>burst the barrel!</strong>
        </p>
        <p style={{ color: colors.textMuted, fontSize: '13px', margin: '12px 0 0' }}>
          The tiny volume of water created ~1 atm of extra pressure because of the height.
        </p>
      </div>

      {/* Why it works */}
      <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: colors.successBg, border: `1px solid ${colors.success}40`, borderRadius: '12px', padding: '16px' }}>
          <p style={{ color: colors.success, fontWeight: 700, margin: '0 0 4px' }}>✓ What Matters</p>
          <p style={{ color: colors.textTertiary, fontSize: '13px', margin: 0 }}>The vertical height of the fluid column above the measurement point</p>
        </div>
        <div style={{ background: colors.errorBg, border: `1px solid ${colors.error}40`, borderRadius: '12px', padding: '16px' }}>
          <p style={{ color: colors.error, fontWeight: 700, margin: '0 0 4px' }}>✗ What Doesn't Matter</p>
          <p style={{ color: colors.textTertiary, fontSize: '13px', margin: 0 }}>Container shape, total volume, or cross-sectional area</p>
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: '14px', color: colors.textMuted, marginBottom: '24px' }}>
        Your prediction: {twistPrediction === 'equal' ? '✅ You got it!' : '🤯 Mind-blowing, right?'}
      </p>

      <button
        onClick={() => goToPhase('transfer')}
        style={{ zIndex: 10, width: '100%', padding: '16px', fontSize: '16px', fontWeight: 600, color: '#fff', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, border: 'none', borderRadius: '14px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
      >
        See Real-World Applications →
      </button>
    </div>
  );

  // Transfer Phase
  const renderTransfer = () => {
    const app = transferApps[activeApp];
    const allDone = completedApps.every(Boolean);
    const isLast = activeApp === transferApps.length - 1;

    const handleContinue = () => {
      const newCompleted = [...completedApps];
      newCompleted[activeApp] = true;
      setCompletedApps(newCompleted);
      playSound('success');
      emit('app_completed', { appNumber: activeApp + 1, appTitle: app.title });
      if (!isLast) {
        setActiveApp(activeApp + 1);
      }
    };

    return (
      <div style={{ padding: isMobile ? '24px 16px' : '32px 24px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: colors.primary, letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 4px' }}>Step 8 • Real World</p>
            <h2 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Applications</h2>
          </div>
          <span style={{ fontSize: '13px', color: colors.textMuted, background: colors.bgElevated, padding: '6px 12px', borderRadius: '20px' }}>
            {completedApps.filter(Boolean).length}/4 done
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
          {transferApps.map((a, i) => {
            const isCompleted = completedApps[i];
            const isCurrent = activeApp === i;
            const isLocked = i > 0 && !completedApps[i - 1] && !completedApps[i];

            return (
              <button
                key={i}
                onClick={() => { if (!isLocked) setActiveApp(i); }}
                disabled={isLocked}
                style={{ zIndex: 10, display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', background: isCurrent ? colors.primary : isCompleted ? colors.successBg : colors.bgSurface, color: isCurrent ? '#fff' : isCompleted ? colors.success : isLocked ? colors.textMuted : colors.textSecondary, border: `1px solid ${isCurrent ? colors.primary : isCompleted ? colors.success + '40' : colors.bgHover}`, borderRadius: '10px', cursor: isLocked ? 'not-allowed' : 'pointer', opacity: isLocked ? 0.5 : 1, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
              >
                {isCompleted ? '✓' : isLocked ? '🔒' : a.icon}
              </button>
            );
          })}
        </div>

        {/* App Content */}
        <div style={{ background: colors.bgSurface, borderRadius: '20px', padding: '24px', border: `1px solid ${colors.bgHover}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: `${app.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
              {app.icon}
            </div>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: app.color, margin: 0 }}>{app.title}</h3>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: '2px 0 0' }}>{app.subtitle}</p>
            </div>
          </div>

          <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: 1.6, marginBottom: '20px' }}>{app.desc}</p>

          <div style={{ background: `${app.color}15`, borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
            <p style={{ color: app.color, fontSize: '14px', margin: 0 }}><strong>Physics Connection:</strong> {app.connection}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
            {app.stats.map((s, i) => (
              <div key={i} style={{ background: colors.bgDeep, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <p style={{ color: colors.textPrimary, fontWeight: 700, fontSize: '16px', margin: '0 0 4px' }}>{s.val}</p>
                <p style={{ color: colors.textMuted, fontSize: '11px', margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {!completedApps[activeApp] && (
            <button
              onClick={isLast && completedApps.slice(0, -1).every(Boolean) ? () => { handleContinue(); goToPhase('test'); } : handleContinue}
              style={{ zIndex: 10, width: '100%', padding: '16px', fontSize: '16px', fontWeight: 600, color: '#fff', background: `linear-gradient(135deg, ${app.color} 0%, ${app.color}cc 100%)`, border: 'none', borderRadius: '12px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
            >
              {isLast ? 'Complete & Take Test →' : `Continue →`}
            </button>
          )}

          {completedApps[activeApp] && !allDone && (
            <p style={{ textAlign: 'center', color: colors.success, fontSize: '14px', margin: 0 }}>✓ Completed! Select another tab above.</p>
          )}
        </div>

        {allDone && (
          <button
            onClick={() => goToPhase('test')}
            style={{ zIndex: 10, width: '100%', marginTop: '24px', padding: '16px', fontSize: '16px', fontWeight: 600, color: '#fff', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, border: 'none', borderRadius: '14px', cursor: 'pointer', boxShadow: `0 8px 32px ${colors.primary}40`, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
          >
            Take the Knowledge Test →
          </button>
        )}
      </div>
    );
  };

  // Test Phase
  const renderTest = () => {
    const q = testQuestions[currentQuestion];
    const answered = testAnswers[currentQuestion] !== null;
    const allAnswered = testAnswers.every(a => a !== null);

    return (
      <div style={{ padding: isMobile ? '24px 16px' : '32px 24px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', color: colors.textMuted, background: colors.bgElevated, padding: '6px 12px', borderRadius: '20px' }}>
            Question {currentQuestion + 1} of 10
          </span>
          <span style={{ fontSize: '13px', color: colors.success, background: colors.successBg, padding: '6px 12px', borderRadius: '20px', fontWeight: 600 }}>
            Score: {testScore}/{testAnswers.filter(a => a !== null).length}
          </span>
        </div>

        <div style={{ height: '6px', background: colors.bgElevated, borderRadius: '3px', marginBottom: '24px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: colors.primary, borderRadius: '3px', width: `${((currentQuestion + 1) / 10) * 100}%`, transition: 'width 0.3s' }} />
        </div>

        <div style={{ background: colors.bgSurface, borderRadius: '20px', padding: '24px', border: `1px solid ${colors.bgHover}` }}>
          <h3 style={{ color: colors.textPrimary, fontSize: '17px', fontWeight: 600, marginBottom: '20px', lineHeight: 1.5 }}>{q.q}</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {q.opts.map((opt, i) => {
              let bg = colors.bgElevated;
              let border = 'transparent';
              if (answered) {
                if (opt.correct) { bg = colors.successBg; border = colors.success; }
                else if (i === testAnswers[currentQuestion]) { bg = colors.errorBg; border = colors.error; }
              }
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={answered}
                  style={{ zIndex: 10, padding: '14px 18px', textAlign: 'left', fontSize: '15px', background: bg, color: colors.textPrimary, border: `2px solid ${border}`, borderRadius: '12px', cursor: answered ? 'default' : 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
                >
                  <span style={{ fontWeight: 600, marginRight: '10px', color: colors.textMuted }}>{String.fromCharCode(65 + i)}.</span>
                  {opt.text}
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <div style={{ marginTop: '20px', padding: '16px', background: colors.successBg, border: `1px solid ${colors.success}40`, borderRadius: '12px' }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>💡 {q.exp}</p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
          <button
            onClick={() => { if (currentQuestion > 0) { setCurrentQuestion(currentQuestion - 1); setShowExplanation(testAnswers[currentQuestion - 1] !== null); } }}
            disabled={currentQuestion === 0}
            style={{ zIndex: 10, padding: '12px 24px', fontSize: '14px', fontWeight: 600, background: colors.bgElevated, color: currentQuestion === 0 ? colors.textMuted : colors.textSecondary, border: 'none', borderRadius: '10px', cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer', opacity: currentQuestion === 0 ? 0.5 : 1, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            ← Back
          </button>

          {currentQuestion < 9 ? (
            <button
              onClick={() => { setCurrentQuestion(currentQuestion + 1); setShowExplanation(testAnswers[currentQuestion + 1] !== null); }}
              style={{ zIndex: 10, padding: '12px 24px', fontSize: '14px', fontWeight: 600, background: colors.bgElevated, color: colors.textSecondary, border: 'none', borderRadius: '10px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              Next →
            </button>
          ) : allAnswered ? (
            <button
              onClick={() => { emit('game_completed', { score: testScore, total: 10, passed: testScore >= 7 }); goToPhase('mastery'); }}
              style={{ zIndex: 10, padding: '12px 24px', fontSize: '14px', fontWeight: 600, background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              Complete →
            </button>
          ) : (
            <span style={{ fontSize: '13px', color: colors.textMuted, alignSelf: 'center' }}>Answer all to continue</span>
          )}
        </div>
      </div>
    );
  };

  // Mastery Phase
  const renderMastery = () => {
    const pct = Math.round((testScore / 10) * 100);
    const passed = testScore >= 7;

    const concepts = [
      { icon: '📐', title: 'P = ρgh equation' },
      { icon: '⬇️', title: 'Pressure increases with depth' },
      { icon: '🌀', title: 'Hydrostatic Paradox' },
      { icon: '↔️', title: 'Pressure acts equally in all directions' },
      { icon: '🔄', title: 'Pascal\'s Principle' }
    ];

    return (
      <div style={{ padding: isMobile ? '24px 16px' : '48px 24px', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '80px', marginBottom: '16px' }}>{passed ? '🌊' : '📚'}</div>
        <h1 style={{ fontSize: isMobile ? '28px' : '36px', fontWeight: 700, color: colors.textPrimary, marginBottom: '8px' }}>
          {passed ? 'Pressure Master!' : 'Keep Diving!'}
        </h1>

        <div style={{ fontSize: '48px', fontWeight: 700, color: passed ? colors.success : colors.warning, marginBottom: '8px' }}>{pct}%</div>
        <p style={{ color: colors.textSecondary, marginBottom: '32px' }}>{testScore}/10 correct</p>

        <div style={{ background: colors.bgSurface, borderRadius: '20px', padding: '24px', marginBottom: '32px', textAlign: 'left' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: colors.primary, marginBottom: '16px', textAlign: 'center' }}>
            {passed ? 'Concepts Mastered' : 'Key Concepts'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {concepts.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>{c.icon}</span>
                <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
                  {passed && <span style={{ color: colors.success, marginRight: '6px' }}>✓</span>}
                  {c.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {passed ? (
            <>
              <button
                onClick={handleReturnToDashboard}
                style={{ zIndex: 10, padding: '16px', fontSize: '16px', fontWeight: 600, color: '#fff', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, border: 'none', borderRadius: '14px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
              >
                🏠 Return to Dashboard
              </button>
              <button
                onClick={() => goToPhase('hook')}
                style={{ zIndex: 10, padding: '16px', fontSize: '14px', fontWeight: 600, color: colors.textSecondary, background: 'transparent', border: `1px solid ${colors.bgHover}`, borderRadius: '14px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              >
                🔬 Review Lesson
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => goToPhase('test')}
                style={{ zIndex: 10, padding: '16px', fontSize: '16px', fontWeight: 600, color: '#fff', background: `linear-gradient(135deg, ${colors.warning} 0%, #ea580c 100%)`, border: 'none', borderRadius: '14px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
              >
                ↺ Retake Test
              </button>
              <button
                onClick={() => goToPhase('hook')}
                style={{ zIndex: 10, padding: '16px', fontSize: '14px', fontWeight: 600, color: colors.textSecondary, background: 'transparent', border: `1px solid ${colors.bgHover}`, borderRadius: '14px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              >
                🔬 Review Lesson
              </button>
              <button
                onClick={handleReturnToDashboard}
                style={{ zIndex: 10, padding: '12px', fontSize: '13px', color: colors.textMuted, background: 'transparent', border: 'none', textDecoration: 'underline', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              >
                Return to Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  // Phase router
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

  const currentIdx = phaseOrder.indexOf(phase);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: colors.bgDeep, color: colors.textPrimary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Background effects */}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 30% 20%, ${colors.primary}08 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, ${colors.secondary}05 0%, transparent 50%)`, pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: `${colors.bgSurface}e6`, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${colors.bgHover}`, position: 'relative', zIndex: 50 }}>
        <span style={{ fontSize: '15px', fontWeight: 600, color: colors.textPrimary }}>Hydrostatic Pressure</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => { if (i <= currentIdx) goToPhase(p); }}
              style={{ zIndex: 10, width: phase === p ? '24px' : '8px', height: '8px', borderRadius: '4px', border: 'none', background: phase === p ? colors.primary : i < currentIdx ? colors.success : colors.bgElevated, cursor: i <= currentIdx ? 'pointer' : 'default', transition: 'all 0.2s', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              title={p}
            />
          ))}
        </div>

        <span style={{ fontSize: '13px', fontWeight: 500, color: colors.primary }}>{currentIdx + 1}/10</span>
      </div>

      {/* Content */}
      <div style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
        {renderPhase()}
      </div>
    </div>
  );
};

export default HydrostaticPressureRenderer;
