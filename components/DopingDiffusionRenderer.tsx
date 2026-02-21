import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// Phase type for internal state management
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface DopingDiffusionRendererProps {
  gamePhase?: Phase; // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
  onGameEvent?: (event: any) => void;
}

// Phase order and labels for navigation
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
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

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#cbd5e1', // Brightness >= 180 for contrast
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  solar: '#3b82f6',
  nType: '#60a5fa',
  pType: '#f472b6',
  dopant: '#fbbf24',
};

const DopingDiffusionRenderer: React.FC<DopingDiffusionRendererProps> = ({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
  onGameEvent,
}) => {
  // Responsive detection
  const { isMobile } = useViewport();
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

  // Internal phase state management
  const getInitialPhase = (): Phase => {
    if (gamePhase && phaseOrder.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase]);

  // Navigation refs
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Simulation state
  const [temperature, setTemperature] = useState(800); // Celsius
  const [diffusionTime, setDiffusionTime] = useState(30); // minutes
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);
  const [junctionType, setJunctionType] = useState<'shallow' | 'deep'>('shallow');

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Physics calculations
  const calculateDiffusion = useCallback(() => {
    // Diffusion coefficient D = D0 * exp(-Ea/kT)
    // For phosphorus in silicon: D0 ~ 3.85 cm²/s, Ea ~ 3.66 eV
    const kB = 8.617e-5; // eV/K
    const TKelvin = temperature + 273;
    const D0 = 3.85; // cm²/s
    const Ea = 3.66; // eV
    const D = D0 * Math.exp(-Ea / (kB * TKelvin));

    // Diffusion length: L = 2*sqrt(D*t)
    const tSeconds = diffusionTime * 60;
    const diffusionLength = 2 * Math.sqrt(D * tSeconds) * 1e4; // Convert to micrometers

    // Junction depth (where dopant concentration equals background)
    const junctionDepth = Math.min(5, diffusionLength * 0.7); // Simplified model

    // Sheet resistance (approximate)
    const sheetResistance = Math.max(10, 1000 / (junctionDepth * Math.sqrt(temperature / 900)));

    // Generate concentration profile
    const profile: {x: number; concentration: number}[] = [];
    for (let x = 0; x <= 5; x += 0.1) {
      // Gaussian or erfc profile
      const conc = Math.exp(-Math.pow(x / diffusionLength, 2) * 2);
      profile.push({ x, concentration: conc });
    }

    return {
      D: D,
      diffusionLength: diffusionLength,
      junctionDepth: junctionDepth,
      sheetResistance: sheetResistance,
      profile: profile,
    };
  }, [temperature, diffusionTime]);

  // Animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(prev => {
        const newTime = prev + 1;
        if (newTime >= diffusionTime) {
          setIsAnimating(false);
          return diffusionTime;
        }
        return newTime;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isAnimating, diffusionTime]);

  const predictions = [
    { id: 'paint', label: 'Doping works like paint - atoms stick to the surface only' },
    { id: 'instant', label: 'Dopant atoms instantly distribute evenly throughout the silicon' },
    { id: 'diffusion', label: 'Dopants gradually diffuse inward over time, with temperature controlling speed' },
    { id: 'electric', label: 'Dopants are pulled in by electric fields from the crystal' },
  ];

  const twistPredictions = [
    { id: 'shallow_better', label: 'Shallow junctions are always better - they collect more blue light' },
    { id: 'deep_better', label: 'Deep junctions are always better - they collect more current' },
    { id: 'tradeoff', label: 'There\'s a tradeoff: shallow for blue response, deep for lower resistance' },
    { id: 'same', label: 'Junction depth doesn\'t affect cell performance' },
  ];

  const transferApplications = [
    {
      title: 'Solar Cell Emitters',
      description: 'The n+ emitter layer is formed by phosphorus diffusion at 850-900C. Controlling depth is critical for efficiency.',
      question: 'Why is precise emitter depth control important?',
      answer: 'Too shallow: poor blue light response (carriers recombine before reaching junction). Too deep: high sheet resistance and more Auger recombination. Optimal depth balances collection efficiency with electrical performance.',
    },
    {
      title: 'Computer Chip Manufacturing',
      description: 'Modern CPUs have billions of transistors with precisely doped source/drain regions only ~10nm deep.',
      question: 'How do chipmakers create such shallow junctions?',
      answer: 'They use rapid thermal processing (RTP) with very short, high-temperature spikes (~1000C for seconds) to precisely control diffusion. Ion implantation followed by a short anneal allows nanometer-scale depth control.',
    },
    {
      title: 'Gel Diffusion Analogy',
      description: 'Food coloring dropped on gelatin spreads outward over time, faster in warmer gelatin.',
      question: 'How does the gel experiment relate to semiconductor doping?',
      answer: 'Both follow Fick\'s laws of diffusion: concentration gradient drives movement, higher temperature provides more thermal energy for atom jumps. The dye profile in gel mimics the dopant profile in silicon.',
    },
    {
      title: 'Selective Emitter Design',
      description: 'Advanced solar cells use heavy doping under contacts but light doping elsewhere for better performance.',
      question: 'Why use different doping levels in different regions?',
      answer: 'Heavy doping under metal contacts reduces contact resistance. Light doping between fingers reduces Auger recombination and improves blue response. This requires two separate diffusion steps or laser doping.',
    },
  ];

  const testQuestions = [
    {
      question: 'What does "doping" mean in semiconductor manufacturing?',
      options: [
        { text: 'Adding paint to color the wafer', correct: false },
        { text: 'Introducing impurity atoms to control electrical properties', correct: true },
        { text: 'Cleaning the silicon surface', correct: false },
        { text: 'Making the wafer thicker', correct: false },
      ],
      explanation: 'Doping deliberately introduces impurity atoms (like phosphorus or boron) into pure silicon to control whether it conducts via electrons (n-type) or holes (p-type).',
    },
    {
      question: 'How does temperature affect diffusion rate?',
      options: [
        { text: 'Higher temperature slows diffusion', correct: false },
        { text: 'Temperature has no effect on diffusion', correct: false },
        { text: 'Higher temperature dramatically increases diffusion rate (exponential)', correct: true },
        { text: 'Only pressure affects diffusion rate', correct: false },
      ],
      explanation: 'Diffusion follows the Arrhenius equation, so even a small temperature increase causes an exponential jump in atomic mobility and diffusion rate.',
    },
    {
      question: 'The diffusion coefficient D follows which relationship with temperature?',
      options: [
        { text: 'D increases linearly with T', correct: false },
        { text: 'D = D0 * exp(-Ea/kT) (Arrhenius equation)', correct: true },
        { text: 'D decreases with T', correct: false },
        { text: 'D is constant regardless of T', correct: false },
      ],
      explanation: 'The Arrhenius equation D = D0 * exp(-Ea/kT) describes how atomic diffusivity depends exponentially on temperature, with Ea being the activation energy barrier.',
    },
    {
      question: 'What determines the junction depth in a solar cell?',
      options: [
        { text: 'Only the wafer thickness', correct: false },
        { text: 'The temperature and time of the diffusion process', correct: true },
        { text: 'The color of the light used', correct: false },
        { text: 'The size of the cell', correct: false },
      ],
      explanation: 'Junction depth scales as roughly sqrt(D*t), so both the diffusion temperature (which sets D) and the process time directly control how deep dopants penetrate.',
    },
    {
      question: 'Why can\'t you simply use room temperature for longer times to achieve the same diffusion?',
      options: [
        { text: 'Room temperature is too comfortable', correct: false },
        { text: 'The exponential temperature dependence makes room-temperature diffusion negligible', correct: true },
        { text: 'Silicon melts at room temperature', correct: false },
        { text: 'You actually can - it just takes longer', correct: false },
      ],
      explanation: 'At room temperature the diffusion coefficient is so astronomically small (due to the exponential dependence) that meaningful diffusion would take geological timescales.',
    },
    {
      question: 'The dopant concentration profile typically follows what shape?',
      options: [
        { text: 'Constant throughout the depth', correct: false },
        { text: 'Decreasing exponentially or error function from surface', correct: true },
        { text: 'Increasing with depth', correct: false },
        { text: 'Random variation', correct: false },
      ],
      explanation: 'Fick\'s laws of diffusion produce a complementary error function (erfc) or Gaussian profile, both of which decrease monotonically from the high-concentration surface.',
    },
    {
      question: 'What is "sheet resistance" in a doped layer?',
      options: [
        { text: 'The resistance of a square of the layer, measured in ohms/square', correct: true },
        { text: 'The resistance to folding the wafer', correct: false },
        { text: 'The optical reflectivity', correct: false },
        { text: 'The resistance to chemical etching', correct: false },
      ],
      explanation: 'Sheet resistance (ohms/square) characterizes a thin conducting layer independent of its lateral dimensions, making it the standard metric for doped semiconductor films.',
    },
    {
      question: 'For phosphorus in silicon, what happens if you diffuse at 900C instead of 800C?',
      options: [
        { text: 'Diffusion is slightly faster', correct: false },
        { text: 'Diffusion is much faster (potentially 10x or more)', correct: true },
        { text: 'Diffusion rate stays the same', correct: false },
        { text: 'Diffusion stops completely', correct: false },
      ],
      explanation: 'Because of the exponential Arrhenius dependence, a 100C increase can boost the diffusion coefficient by 10x or more, dramatically increasing junction depth.',
    },
    {
      question: 'Why do shallow junctions improve blue light response?',
      options: [
        { text: 'Blue light is absorbed near the surface where shallow junctions collect better', correct: true },
        { text: 'Shallow junctions are bluer in color', correct: false },
        { text: 'Blue photons have more energy', correct: false },
        { text: 'Shallow junctions filter out red light', correct: false },
      ],
      explanation: 'Blue photons are absorbed within the first ~0.5 um of silicon. A shallow junction places the collecting field close to that absorption zone, capturing more blue-generated carriers.',
    },
    {
      question: 'What is a key tradeoff when choosing junction depth?',
      options: [
        { text: 'Shallow: better blue response but higher sheet resistance', correct: true },
        { text: 'There is no tradeoff - deeper is always better', correct: false },
        { text: 'Junction depth only affects appearance', correct: false },
        { text: 'Shallow junctions are cheaper to manufacture', correct: false },
      ],
      explanation: 'Shallow junctions improve short-wavelength collection but have fewer dopant atoms, increasing sheet resistance and contact resistance -- a classic solar cell design tradeoff.',
    },
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    onGameEvent?.({ type: 'game_completed', details: { score: score, total: testQuestions.length } });
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  const renderVisualization = (interactive: boolean, showComparison: boolean = false) => {
    const width = 440;
    const height = 420;
    const output = calculateDiffusion();

    // Calculate current diffusion profile based on animation
    const currentTime = isAnimating ? animationTime : diffusionTime;
    const timeRatio = Math.sqrt(currentTime / diffusionTime);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: typo.elementGap }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '520px' }}
         role="img" aria-label="Doping Diffusion visualization">
          <defs>
            {/* Premium lab background gradient */}
            <linearGradient id="dopeLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="30%" stopColor="#0a1628" />
              <stop offset="70%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Silicon substrate gradient - crystalline appearance */}
            <linearGradient id="dopeSiliconSubstrate" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="15%" stopColor="#3b4a5c" />
              <stop offset="40%" stopColor="#334155" />
              <stop offset="65%" stopColor="#293548" />
              <stop offset="85%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Silicon crystal pattern overlay */}
            <pattern id="dopeCrystalPattern" width="8" height="8" patternUnits="userSpaceOnUse">
              <rect width="8" height="8" fill="none" />
              <circle cx="4" cy="4" r="0.8" fill="#64748b" opacity="0.3" />
              <line x1="0" y1="4" x2="8" y2="4" stroke="#475569" strokeWidth="0.3" opacity="0.2" />
              <line x1="4" y1="0" x2="4" y2="8" stroke="#475569" strokeWidth="0.3" opacity="0.2" />
            </pattern>

            {/* N-type doped region gradient (phosphorus - blue tint) */}
            <linearGradient id="dopeNTypeRegion" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
              <stop offset="20%" stopColor="#3b82f6" stopOpacity="0.75" />
              <stop offset="50%" stopColor="#2563eb" stopOpacity="0.5" />
              <stop offset="80%" stopColor="#1d4ed8" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#1e40af" stopOpacity="0" />
            </linearGradient>

            {/* P-type region gradient (boron - pink tint) */}
            <linearGradient id="dopePTypeRegion" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#f472b6" stopOpacity="0.6" />
              <stop offset="30%" stopColor="#ec4899" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#db2777" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#be185d" stopOpacity="0" />
            </linearGradient>

            {/* Dopant source layer gradient */}
            <linearGradient id="dopeDopantSource" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="30%" stopColor="#fbbf24" />
              <stop offset="70%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            {/* Dopant atom glow */}
            <radialGradient id="dopeDopantAtomGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fde68a" stopOpacity="1" />
              <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>

            {/* Temperature thermometer gradient */}
            <linearGradient id="dopeThermometerFill" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="20%" stopColor="#7f1d1d" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="75%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>

            {/* Thermometer bulb glow */}
            <radialGradient id="dopeThermoBulbGlow" cx="50%" cy="70%" r="50%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="60%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#991b1b" />
            </radialGradient>

            {/* Junction line glow */}
            <linearGradient id="dopeJunctionGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0" />
              <stop offset="20%" stopColor="#f87171" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#fca5a5" stopOpacity="1" />
              <stop offset="80%" stopColor="#f87171" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </linearGradient>

            {/* Output panel gradient */}
            <linearGradient id="dopeOutputPanel" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Graph background gradient */}
            <linearGradient id="dopeGraphBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0.95" />
            </linearGradient>

            {/* Profile curve gradient */}
            <linearGradient id="dopeProfileCurve" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            {/* Diffusion front glow effect */}
            <filter id="dopeDiffusionGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Dopant atom glow filter */}
            <filter id="dopeAtomGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Junction line glow filter */}
            <filter id="dopeJunctionFilter" x="-20%" y="-100%" width="140%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Panel inner glow */}
            <filter id="dopePanelGlow">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Heat shimmer effect */}
            <filter id="dopeHeatShimmer" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" />
            </filter>

            {/* Subtle grid pattern for lab background */}
            <pattern id="dopeLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* Premium lab background */}
          <rect width={width} height={height} fill="url(#dopeLabBg)" />
          <rect width={width} height={height} fill="url(#dopeLabGrid)" />

          {/* Temperature indicator (thermometer) */}
          <g transform="translate(20, 30)">
            {/* Thermometer tube */}
            <rect x="0" y="0" width="30" height="150" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
            <rect x="3" y="3" width="24" height="144" rx="4" fill="#1e293b" />

            {/* Temperature scale marks */}
            {[0, 25, 50, 75, 100].map((pct, i) => (
              <g key={i}>
                <line x1="28" y1={147 - pct * 1.4} x2="33" y2={147 - pct * 1.4} stroke="#475569" strokeWidth="1" />
              </g>
            ))}

            {/* Mercury/temperature fill */}
            <rect
              x="8"
              y={147 - 140 * ((temperature - 700) / 500)}
              width="14"
              height={140 * ((temperature - 700) / 500)}
              rx="3"
              fill="url(#dopeThermometerFill)"
            />

            {/* Thermometer bulb at bottom */}
            <circle cx="15" cy="158" r="12" fill="url(#dopeThermoBulbGlow)" />
            <circle cx="15" cy="158" r="8" fill="#ef4444" />
          </g>

          {/* Silicon wafer cross-section with crystal pattern */}
          <g transform="translate(70, 55)">
            {/* Wafer outline with shadow */}
            <rect x="2" y="2" width="260" height="170" rx="6" fill="#000" opacity="0.3" />

            {/* Main silicon substrate */}
            <rect x="0" y="0" width="260" height="170" rx="6" fill="url(#dopeSiliconSubstrate)" />

            {/* Crystal lattice pattern overlay */}
            <rect x="0" y="0" width="260" height="170" rx="6" fill="url(#dopeCrystalPattern)" />

            {/* P-type bulk indicator (subtle pink at bottom) */}
            <rect x="0" y="120" width="260" height="50" rx="0 0 6 6" fill="url(#dopePTypeRegion)" />

            {/* N-type doped region (dopant concentration gradient) */}
            {output.profile.map((point, i) => {
              if (i === 0) return null;
              const prevPoint = output.profile[i - 1];
              const y1 = (prevPoint.x / 5) * 170;
              const y2 = (point.x / 5) * 170;
              const alpha = Math.min(1, prevPoint.concentration * timeRatio);
              return (
                <rect
                  key={i}
                  x="0"
                  y={y1}
                  width="260"
                  height={Math.max(1, y2 - y1)}
                  fill={colors.nType}
                  opacity={alpha * 0.6}
                  rx={i === 1 ? "6 6 0 0" : "0"}
                />
              );
            })}

            {/* Diffusion front visualization */}
            <line
              x1="0"
              y1={(output.junctionDepth / 5) * 170 * timeRatio}
              x2="260"
              y2={(output.junctionDepth / 5) * 170 * timeRatio}
              stroke="url(#dopeJunctionGlow)"
              strokeWidth="3"
              filter="url(#dopeJunctionFilter)"
              strokeDasharray="8,4"
            />

            {/* Junction depth indicator arrow */}
            <g transform={`translate(265, ${(output.junctionDepth / 5) * 170 * timeRatio})`}>
              <polygon points="0,0 8,-4 8,4" fill={colors.error} />
            </g>
          </g>

          {/* Dopant source layer on top */}
          <g transform="translate(70, 40)">
            <rect x="0" y="0" width="260" height="15" rx="4" fill="url(#dopeDopantSource)" />
            {/* Gas flow indicators */}
            {[40, 90, 140, 190, 230].map((x, i) => (
              <circle key={i} cx={x} cy="7" r="2" fill="#fef3c7" opacity="0.8" />
            ))}
          </g>

          {/* Diffusing atoms animation */}
          {isAnimating && atomPositions.map((pos, i) => {
            const maxDepth = output.junctionDepth * 170 / 5 * timeRatio;
            const animY = 55 + (((animationTime * 3 + pos.delay * 100) % maxDepth));
            if (animY > 55 + maxDepth) return null;
            return (
              <circle
                key={i}
                cx={70 + pos.x}
                cy={animY}
                r="4"
                fill="url(#dopeDopantAtomGlow)"
                filter="url(#dopeAtomGlow)"
              />
            );
          })}

          {/* Concentration profile graph */}
          <g transform="translate(70, 235)">
            {/* Graph background */}
            <rect x="0" y="0" width="260" height="140" rx="6" fill="url(#dopeGraphBg)" stroke="#334155" strokeWidth="1" />

            {/* Grid lines */}
            {[25, 50, 75, 100].map((y) => (
              <line key={y} x1="40" y1={y + 5} x2="245" y2={y + 5} stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" opacity={0.3} />
            ))}
            {[90, 140, 190].map((x) => (
              <line key={x} x1={x} y1="15" x2={x} y2="125" stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" opacity={0.3} />
            ))}

            {/* Axes */}
            <line x1="40" y1="125" x2="245" y2="125" stroke="#64748b" strokeWidth="1.5" />
            <line x1="40" y1="15" x2="40" y2="125" stroke="#64748b" strokeWidth="1.5" />

            {/* Axis arrows */}
            <polygon points="245,125 240,122 240,128" fill="#64748b" />
            <polygon points="40,15 37,20 43,20" fill="#64748b" />

            {/* X axis label - Distance/Depth */}
            <text x="145" y="138" textAnchor="middle" fill={colors.textMuted} fontSize="11">Distance (um)</text>

            {/* Y axis label - Concentration */}
            <text x="14" y="70" textAnchor="middle" fill={colors.textMuted} fontSize="11" transform="rotate(-90, 14, 70)">Concentration</text>

            {/* Profile curve with gradient */}
            <path
              d={`M 40 ${125 - 105 * output.profile[0].concentration * timeRatio} ` +
                output.profile.map((p) => {
                  const x = 40 + (p.x / 5) * 205;
                  const y = 125 - 105 * p.concentration * timeRatio;
                  return `L ${x} ${y}`;
                }).join(' ')}
              fill="none"
              stroke="url(#dopeProfileCurve)"
              strokeWidth="3"
              strokeLinecap="round"
              filter="url(#dopeDiffusionGlow)"
            />

            {/* Junction depth marker on graph */}
            <line
              x1={40 + (output.junctionDepth / 5) * 205 * timeRatio}
              y1="15"
              x2={40 + (output.junctionDepth / 5) * 205 * timeRatio}
              y2="125"
              stroke={colors.error}
              strokeWidth="2"
              strokeDasharray="4,3"
              filter="url(#dopeJunctionFilter)"
            />

            {/* Junction depth label on graph */}
            <circle
              cx={40 + (output.junctionDepth / 5) * 205 * timeRatio}
              cy={125 - 105 * 0.1 * timeRatio}
              r="4"
              fill={colors.error}
            />
          </g>

          {/* Output panel */}
          <rect x="350" y="55" width="75" height="170" rx="8" fill="url(#dopeOutputPanel)" stroke="#334155" strokeWidth="1.5" filter="url(#dopePanelGlow)" />

          {/* Depth section */}
          <rect x="355" y="63" width="65" height="70" rx="4" fill="rgba(96,165,250,0.1)" />
          <text x="387" y="83" fill={colors.textMuted} fontSize="11" textAnchor="middle" fontWeight="600">DEPTH</text>
          <text x="387" y="110" fill={colors.nType} fontSize="22" textAnchor="middle" fontWeight="bold">
            {(output.junctionDepth * timeRatio).toFixed(2)}
          </text>
          <text x="387" y="125" fill={colors.textMuted} fontSize="11" textAnchor="middle">um</text>

          {/* Sheet resistance section */}
          <rect x="355" y="143" width="65" height="70" rx="4" fill="rgba(16,185,129,0.1)" />
          <text x="387" y="163" fill={colors.textMuted} fontSize="11" textAnchor="middle" fontWeight="600">Rsheet</text>
          <text x="387" y="190" fill={colors.success} fontSize="20" textAnchor="middle" fontWeight="bold">
            {output.sheetResistance.toFixed(0)}
          </text>
          <text x="387" y="205" fill={colors.textMuted} fontSize="11" textAnchor="middle">ohm/sq</text>

          {/* P/N Junction indicator legend */}
          <rect x="350" y="250" width="75" height="115" rx="8" fill="url(#dopeOutputPanel)" stroke="#334155" strokeWidth="1" />

          {/* N-type indicator */}
          <rect x="360" y="262" width="12" height="12" rx="2" fill={colors.nType} />
          <text x="378" y="272" fill={colors.textSecondary} fontSize="11">N-type</text>

          {/* P-type indicator */}
          <rect x="360" y="286" width="12" height="12" rx="2" fill={colors.pType} />
          <text x="378" y="296" fill={colors.textSecondary} fontSize="11">P-type</text>

          {/* Junction indicator */}
          <line x1="360" y1="314" x2="372" y2="314" stroke={colors.error} strokeWidth="2" strokeDasharray="3,2" />
          <text x="378" y="318" fill={colors.textSecondary} fontSize="11">Junction</text>

          {/* Dopant indicator */}
          <circle cx="366" cy="338" r="5" fill="url(#dopeDopantAtomGlow)" />
          <text x="378" y="342" fill={colors.textSecondary} fontSize="11">Dopant</text>
        </svg>

        {/* Labels moved outside SVG */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '520px',
          padding: `0 ${typo.pagePadding}`,
          marginTop: '-8px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: typo.label, color: colors.textMuted, display: 'block' }}>Temperature</span>
            <span style={{ fontSize: typo.body, color: colors.accent, fontWeight: 'bold' }}>{temperature}C</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: typo.label, color: colors.textMuted, display: 'block' }}>Dopant Source</span>
            <span style={{ fontSize: typo.small, color: colors.dopant }}>POCl3 / PH3</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: typo.label, color: colors.textMuted, display: 'block' }}>Concentration</span>
            <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Profile [P]</span>
          </div>
        </div>

        {interactive && (
          <div style={{ display: 'flex', gap: typo.elementGap, flexWrap: 'wrap', justifyContent: 'center', padding: typo.cardPadding }}>
            <button
              onClick={() => { setIsAnimating(true); setAnimationTime(0); }}
              disabled={isAnimating}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating ? colors.textMuted : `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`,
                color: 'white',
                fontWeight: 'bold',
                cursor: isAnimating ? 'not-allowed' : 'pointer',
                fontSize: typo.body,
                boxShadow: isAnimating ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.3)',
                WebkitTapHighlightColor: 'transparent',
                transition: 'all 0.2s ease',
              }}
            >
              {isAnimating ? 'Diffusing...' : 'Start Diffusion'}
            </button>
            <button
              onClick={() => { setIsAnimating(false); setAnimationTime(0); setTemperature(800); setDiffusionTime(30); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'rgba(245, 158, 11, 0.1)',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.body,
                WebkitTapHighlightColor: 'transparent',
                transition: 'all 0.2s ease',
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  // Real-world applications for the Transfer phase
  const realWorldApps = [
    {
      icon: '🔬',
      title: 'Transistor Manufacturing',
      short: 'Microprocessors',
      tagline: 'Billions of precisely doped junctions in every chip',
      description: 'Modern CPUs contain billions of transistors, each requiring precisely controlled source/drain doping. Diffusion and ion implantation create junctions as shallow as 5-10 nanometers with atomic-level precision. The exponential temperature sensitivity means even 1°C variation can shift electrical properties.',
      connection: 'The same diffusion physics you explored governs how every transistor in your computer, phone, and car is manufactured. Temperature control during doping directly determines if your chip runs at 3 GHz or fails completely.',
      howItWorks: 'Silicon wafers are patterned with photoresist masks, then exposed to dopant gases (phosphorus for n-type, boron for p-type) in diffusion furnaces. Rapid thermal processing (RTP) uses precisely timed temperature spikes of 1000-1100°C lasting only seconds to achieve nanometer-scale junction control. Ion implantation accelerates dopant atoms to embed them at exact depths.',
      stats: [
        { value: '5nm', label: 'Junction Depth', detail: 'Modern transistor junctions are just ~20 atoms deep' },
        { value: '100B+', label: 'Transistors/Chip', detail: 'Apple M2 Ultra has 134 billion transistors' },
        { value: '±0.5°C', label: 'Temp Precision', detail: 'Furnace temperature must be controlled within half a degree' },
      ],
      examples: [
        'Intel and TSMC 3nm process nodes use advanced doping for billions of FinFET transistors',
        'DRAM memory chips require precise doping for capacitor access transistors',
        'Flash memory uses doping to create floating gate charge storage structures',
        'Power management ICs in phones use doped regions for voltage regulation',
      ],
      companies: ['Intel', 'TSMC', 'Samsung', 'GlobalFoundries', 'SK Hynix'],
      futureImpact: 'As transistors shrink below 2nm, atomic-level doping precision becomes critical. New techniques like atomic layer doping (ALD) and plasma doping are replacing traditional diffusion for the most advanced nodes, pushing Moore\'s Law forward.',
      color: '#3b82f6',
    },
    {
      icon: '☀️',
      title: 'Solar Cell Efficiency',
      short: 'Photovoltaics',
      tagline: 'Optimal junctions capture more sunlight',
      description: 'Solar cell efficiency depends critically on emitter junction design. The n+ emitter layer is created by phosphorus diffusion at 850-900°C. Shallow emitters (0.3 μm) maximize blue light response, while selective emitters use variable depth for optimal performance across the cell.',
      connection: 'The temperature-time tradeoffs you experimented with directly determine solar cell efficiency. A 10°C change in diffusion temperature can shift cell efficiency by 0.5% absolute—worth millions of dollars in a gigawatt-scale factory.',
      howItWorks: 'P-type silicon wafers enter a quartz tube furnace where POCl₃ gas deposits phosphorus on the surface. At 850-900°C, phosphorus atoms diffuse into the silicon following Fick\'s laws. Sheet resistance is measured with four-point probes to verify junction quality. Advanced cells use laser doping for selective emitter patterns.',
      stats: [
        { value: '26.8%', label: 'Record Efficiency', detail: 'HIT solar cells with optimized emitter doping' },
        { value: '850°C', label: 'Typical Temp', detail: 'Standard emitter diffusion temperature' },
        { value: '60 Ω/sq', label: 'Sheet Resistance', detail: 'Target emitter sheet resistance for PERC cells' },
      ],
      examples: [
        'PERC cells use rear-side aluminum doping for back surface field passivation',
        'TOPCon technology uses ultra-thin tunnel oxide with polysilicon doping',
        'Heterojunction (HJT) cells combine crystalline and amorphous doped layers',
        'IBC cells have all doping on the rear for maximum front surface light capture',
      ],
      companies: ['LONGi', 'JinkoSolar', 'Canadian Solar', 'First Solar', 'SunPower'],
      futureImpact: 'Next-generation tandem solar cells stack perovskite on silicon, requiring precise doping of the silicon bottom cell to match current with the top cell. Passivating contact technologies demand atomic-scale doping control at interfaces.',
      color: '#f59e0b',
    },
    {
      icon: '💡',
      title: 'LED Production',
      short: 'Solid-State Lighting',
      tagline: 'Doped semiconductors that emit light',
      description: 'LEDs work by recombining electrons and holes at a doped p-n junction. The dopant concentrations and junction abruptness determine emission efficiency and wavelength. Gallium nitride (GaN) LEDs use magnesium (p-type) and silicon (n-type) doping achieved through metalorganic vapor phase epitaxy.',
      connection: 'The diffusion principles you learned apply to LED manufacturing, though with different semiconductors. Controlling dopant profiles in GaN is even more challenging than in silicon due to the material\'s properties, making precise temperature control essential.',
      howItWorks: 'GaN LED epitaxy grows doped layers at 1000-1100°C using metalorganic precursors. Trimethylgallium and ammonia form GaN, while silane adds n-type silicon doping and bis(cyclopentadienyl)magnesium provides p-type magnesium. Layer-by-layer growth with precise dopant flow creates the quantum well active region.',
      stats: [
        { value: '200 lm/W', label: 'Efficacy', detail: 'Best white LEDs exceed 200 lumens per watt' },
        { value: '10¹⁸/cm³', label: 'Doping Level', detail: 'Typical carrier concentration in LED layers' },
        { value: '50,000 hrs', label: 'Lifetime', detail: 'LED lifespan enabled by stable doped junctions' },
      ],
      examples: [
        'White LEDs in smartphones use blue GaN LEDs with phosphor conversion',
        'Automotive headlights use high-power doped GaN LED arrays',
        'Display backlights use precisely doped mini-LED and micro-LED arrays',
        'UV-C LEDs for disinfection require aluminum gallium nitride with controlled doping',
      ],
      companies: ['Nichia', 'Lumileds', 'Osram', 'Cree', 'Seoul Semiconductor'],
      futureImpact: 'Micro-LED displays for AR/VR require millions of individually doped LED pixels smaller than 10 μm. Deep UV LEDs for water purification need better p-type doping of aluminum-rich AlGaN. Laser diodes for LiDAR demand ultra-precise junction control.',
      color: '#10b981',
    },
    {
      icon: '⚡',
      title: 'Power Electronics',
      short: 'High-Voltage Devices',
      tagline: 'Handling kilowatts with doped semiconductors',
      description: 'Power devices like IGBTs and MOSFETs handle hundreds of amps and thousands of volts. Deep diffusion creates thick drift regions that block high voltages, while surface doping forms the control structures. Silicon carbide (SiC) devices use ion implantation and high-temperature activation anneals.',
      connection: 'The deep junctions you explored at high temperatures are exactly what power electronics need. A 1200V IGBT might have drift region doping extending 100+ micrometers—achieved through long, high-temperature diffusion cycles.',
      howItWorks: 'Power device fabrication uses multiple diffusion steps. N-drift regions are formed by epitaxial growth with controlled doping. P-body regions are created by boron diffusion or implantation. N+ source regions use heavy phosphorus doping. SiC devices require 1600-1800°C activation anneals to activate implanted dopants.',
      stats: [
        { value: '6.5kV', label: 'Blocking Voltage', detail: 'High-voltage IGBTs for grid applications' },
        { value: '99.5%', label: 'Efficiency', detail: 'SiC inverter efficiency in EVs' },
        { value: '175°C', label: 'Operating Temp', detail: 'Junction temperature in automotive power modules' },
      ],
      examples: [
        'Tesla Model S uses SiC MOSFETs in the main inverter for 5% range improvement',
        'High-speed rail uses IGBT modules with 3300V blocking capability',
        'Grid-scale solar inverters use 1700V SiC devices for 99%+ efficiency',
        'EV fast chargers use 1200V SiC MOSFETs for compact, efficient power conversion',
      ],
      companies: ['Infineon', 'ON Semiconductor', 'STMicroelectronics', 'Wolfspeed', 'ROHM'],
      futureImpact: 'Wide-bandgap semiconductors (SiC, GaN) are revolutionizing power electronics. These materials require much higher temperatures for dopant activation—SiC needs 1700°C anneals versus 1000°C for silicon. Gallium oxide promises even better performance with novel doping challenges.',
      color: '#8b5cf6',
    },
  ];

  const renderControls = (showTwist: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {showTwist && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Junction Type
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['shallow', 'deep'] as const).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setJunctionType(type);
                  if (type === 'shallow') {
                    setTemperature(850);
                    setDiffusionTime(15);
                  } else {
                    setTemperature(950);
                    setDiffusionTime(60);
                  }
                }}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: junctionType === type ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                  background: junctionType === type ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  fontSize: '13px',
                  textTransform: 'capitalize',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {type} Junction
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Temperature: {temperature}C
        </label>
        <input
          type="range"
          min="700"
          max="1100"
          step="10"
          value={temperature}
          onChange={(e) => setTemperature(parseInt(e.target.value))}
          style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Diffusion Time: {diffusionTime} minutes
        </label>
        <input
          type="range"
          min="5"
          max="120"
          step="5"
          value={diffusionTime}
          onChange={(e) => setDiffusionTime(parseInt(e.target.value))}
          style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
        />
      </div>

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Diffusion Depth ~ sqrt(D * t) where D ~ exp(-Ea/kT)
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Temperature has exponential effect; time has square-root effect
        </div>
      </div>
    </div>
  );

  // Navigation function
  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;

    setPhase(p);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    setTimeout(() => { isNavigating.current = false; }, 400);
  }, []);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) {
      goToPhase(phaseOrder[idx + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) {
      goToPhase(phaseOrder[idx - 1]);
    }
  }, [phase, goToPhase]);

  const currentIdx = phaseOrder.indexOf(phase);

  // Generate stable random positions for diffusing atoms - moved outside render function to follow hooks rules
  const atomPositions = React.useMemo(() => {
    const positions: Array<{x: number; y: number; delay: number}> = [];
    for (let i = 0; i < 20; i++) {
      positions.push({
        x: 100 + (i * 37 % 200),
        y: 0,
        delay: (i * 0.15) % 1,
      });
    }
    return positions;
  }, []);

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: colors.bgDark,
      borderBottom: `1px solid rgba(255,255,255,0.1)`,
      zIndex: 1001,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: 'none',
            background: currentIdx > 0 ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: currentIdx > 0 ? colors.textPrimary : colors.textMuted,
            cursor: currentIdx > 0 ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            minHeight: '44px',
          }}
        >
          Back
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {phaseOrder.map((p, i) => (
          <div
            key={p}
            role="button"
            aria-label={`${phaseLabels[p]} - Step ${i + 1} of ${phaseOrder.length}`}
            onClick={() => i <= currentIdx && goToPhase(p)}
            style={{
              width: i === currentIdx ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              background: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
              cursor: i <= currentIdx ? 'pointer' : 'default',
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: colors.textMuted, fontSize: '12px' }}>
          {currentIdx + 1}/{phaseOrder.length}
        </span>
        <span style={{
          padding: '4px 8px',
          borderRadius: '4px',
          background: 'rgba(245, 158, 11, 0.2)',
          color: colors.accent,
          fontSize: '11px',
          fontWeight: 'bold',
        }}>
          {phaseLabels[phase]}
        </span>
      </div>
    </div>
  );

  const renderBottomBar = (canGoBack: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: `1px solid rgba(255,255,255,0.1)`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 1001,
    }}>
      <button
        onClick={goBack}
        disabled={currentIdx === 0}
        style={{
          padding: '12px 24px',
          borderRadius: '8px',
          border: `1px solid ${colors.textMuted}`,
          background: 'transparent',
          color: currentIdx > 0 ? colors.textSecondary : colors.textMuted,
          fontWeight: 'bold',
          cursor: currentIdx > 0 ? 'pointer' : 'not-allowed',
          fontSize: '14px',
          opacity: currentIdx > 0 ? 1 : 0.5,
          minHeight: '44px',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Back
      </button>
      <span style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 400 }}>
        {phaseLabels[phase]}
      </span>
      <button
        onClick={goNext}
        disabled={!canProceed}
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
          minHeight: '44px',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px', fontWeight: 700 }}>
              Doping & Diffusion
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px', fontWeight: 400 }}>
              Does doping mean "painting electrons on"?
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6, fontWeight: 400 }}>
                To create a p-n junction in a solar cell, we need to add phosphorus atoms
                into the silicon. But phosphorus gas doesn't simply "stick" to the surface -
                it actually diffuses into the silicon like dye spreading in water!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px', fontWeight: 400 }}>
                Temperature is the key that controls how deep and how fast!
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 400 }}>
                Think of it like food coloring in warm vs cold gelatin!
              </p>
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <p style={{ color: colors.textMuted, fontSize: '14px', fontWeight: 400 }}>
              Step {currentIdx + 1} of {phaseOrder.length}: Make your prediction
            </p>
          </div>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>The Process:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, fontWeight: 400 }}>
              A silicon wafer is placed in a furnace with phosphorus-containing gas (POCl3).
              At high temperature, phosphorus atoms enter the silicon. How do they get distributed?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 700 }}>
              How do dopant atoms enter the silicon?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    minHeight: '44px',
                    fontWeight: 400,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>Diffusion Furnace Simulator</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>
              Control temperature and time to create your junction
            </p>
          </div>

          <div style={{
            background: 'rgba(59, 130, 246, 0.15)',
            margin: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.solar}`,
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>
              Observe how temperature and time affect the diffusion depth. Try adjusting the sliders to see the changes.
            </p>
          </div>

          {/* Side-by-side layout: SVG left, controls right */}


          <div style={{


            display: 'flex',


            flexDirection: isMobile ? 'column' : 'row',


            gap: isMobile ? '12px' : '20px',


            width: '100%',


            alignItems: isMobile ? 'center' : 'flex-start',


          }}>


            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


              {renderVisualization(true)}


            </div>


            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


              {renderControls()}


            </div>


          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: 700 }}>Experiments to Try:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0, fontWeight: 400 }}>
              <li>Increase temperature and watch diffusion accelerate dramatically</li>
              <li>Notice: doubling time only increases depth by sqrt(2) ~ 1.4x</li>
              <li>But increasing temperature by 100C can double or triple depth!</li>
              <li>Watch the concentration profile flatten as depth increases</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(96, 165, 250, 0.15)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.nType}`,
          }}>
            <h4 style={{ color: colors.nType, marginBottom: '8px', fontWeight: 700 }}>Key Physics Terms:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0, fontWeight: 400 }}>
              <li><strong style={{ color: colors.textPrimary }}>Diffusion Coefficient (D):</strong> Rate at which atoms spread through material - follows Arrhenius equation D = D0 * exp(-Ea/kT)</li>
              <li><strong style={{ color: colors.textPrimary }}>Junction Depth:</strong> How deep the dopants penetrate into silicon - scales as sqrt(D*t)</li>
              <li><strong style={{ color: colors.textPrimary }}>Sheet Resistance:</strong> Electrical resistance of a thin doped layer - measured in ohms per square</li>
              <li><strong style={{ color: colors.textPrimary }}>Concentration Profile:</strong> Distribution of dopant atoms vs depth - typically Gaussian or error function shape</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(245, 158, 11, 0.15)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: 700 }}>Why This Matters:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, fontWeight: 400 }}>
              Diffusion is the foundation of all semiconductor manufacturing. Every solar cell, computer chip, LED, and power transistor relies on precisely controlled doping profiles. A 10C temperature variation in a diffusion furnace can shift device performance by 5-10%. This is why semiconductor fabs maintain temperature control within 0.5C and why understanding diffusion physics is essential for engineers designing the next generation of solar cells and microchips.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'diffusion';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontWeight: 700 }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary, fontWeight: 400 }}>
              {wasCorrect
                ? 'As you predicted, dopant atoms diffuse into silicon gradually - temperature controls the rate exponentially, while time affects depth as a square root!'
                : 'You predicted something different, but as you observed in the simulation, dopant atoms actually diffuse into silicon gradually - temperature controls the rate exponentially, while time affects depth as a square root!'}
            </p>
          </div>

          <svg width="100%" height="120" viewBox="0 0 400 120" style={{ margin: '16px auto', display: 'block' }} preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="reviewDiffGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={colors.accent} />
                <stop offset="100%" stopColor={colors.success} />
              </linearGradient>
            </defs>
            <rect x="20" y="20" width="360" height="80" rx="8" fill="rgba(30, 41, 59, 0.9)" stroke={colors.accent} strokeWidth="1" />
            <text x="200" y="45" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="bold">Diffusion Equation</text>
            <text x="200" y="75" textAnchor="middle" fill={colors.accent} fontSize="18" fontFamily="monospace">D = D0 * exp(-Ea/kT)</text>
            <text x="200" y="95" textAnchor="middle" fill={colors.textMuted} fontSize="11">Temperature has exponential effect on diffusion rate</text>
          </svg>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>The Physics of Diffusion</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, fontWeight: 400 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Thermal Energy:</strong> At high
                temperatures, silicon atoms vibrate more intensely, creating "jumps" between
                lattice sites. Dopant atoms hop from site to site through this thermal motion.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Arrhenius Equation:</strong> The
                diffusion coefficient follows D = D0 * exp(-Ea/kT). The exponential means small
                temperature changes have huge effects on diffusion rate.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Diffusion Length:</strong> Atoms
                spread as sqrt(D*t), meaning time has diminishing returns. To double depth, you
                need 4x the time - or just increase temperature slightly.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Concentration Profile:</strong> The
                profile follows an error function or Gaussian shape - highest at surface,
                decreasing exponentially with depth.
              </p>
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px', fontWeight: 700 }}>The Twist</h2>
            <p style={{ color: colors.textSecondary, fontWeight: 400 }}>
              Shallow junction vs. deep junction - which is better for solar cells?
            </p>
            <p style={{ color: colors.textMuted, fontSize: '14px', marginTop: '8px', fontWeight: 400 }}>
              Step {currentIdx + 1} of {phaseOrder.length}: Make your prediction
            </p>
          </div>

          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>The Dilemma:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, fontWeight: 400 }}>
              Engineers can choose to make shallow junctions (0.3 um) or deep junctions (2+ um).
              Shallow junctions have high sheet resistance but better blue response. Deep junctions
              have low resistance but poorer blue response. Which is better?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 700 }}>
              What's the optimal junction depth strategy?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    minHeight: '44px',
                    fontWeight: 400,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px', fontWeight: 700 }}>Junction Depth Comparison</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>
              Compare shallow vs deep junction characteristics
            </p>
          </div>

          <div style={{
            background: 'rgba(59, 130, 246, 0.15)',
            margin: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.solar}`,
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>
              Observe the tradeoffs by toggling between shallow and deep junction types. Notice how sheet resistance and depth change.
            </p>
          </div>

          {renderVisualization(true, true)}
          {renderControls(true)}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px', fontWeight: 700 }}>Key Tradeoff:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>
              <strong style={{ fontWeight: 700 }}>Shallow (0.3-0.5 um):</strong> Better blue response (blue light absorbed at surface),
              but higher sheet resistance increases series resistance losses.<br/><br/>
              <strong style={{ fontWeight: 700 }}>Deep (1-2 um):</strong> Lower sheet resistance, but carriers generated by blue light
              recombine before reaching the junction. Also more Auger recombination in heavily doped region.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'tradeoff';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontWeight: 700 }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary, fontWeight: 400 }}>
              There's a real engineering tradeoff! Modern cells use "selective emitters" with
              different depths in different regions to get the best of both worlds.
            </p>
          </div>

          <svg width="100%" height="120" viewBox="0 0 400 120" style={{ margin: '16px auto', display: 'block' }} preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="twistRevGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={colors.warning} />
                <stop offset="100%" stopColor={colors.success} />
              </linearGradient>
            </defs>
            <rect x="20" y="20" width="360" height="80" rx="8" fill="rgba(30, 41, 59, 0.9)" stroke={colors.warning} strokeWidth="1" />
            <text x="200" y="45" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="bold">Selective Emitter Strategy</text>
            <text x="200" y="70" textAnchor="middle" fill={colors.warning} fontSize="12">Under contacts: Deep | Between fingers: Shallow</text>
            <text x="200" y="90" textAnchor="middle" fill={colors.textMuted} fontSize="11">Best of both worlds for maximum efficiency</text>
          </svg>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px', fontWeight: 700 }}>The Solution: Selective Emitters</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, fontWeight: 400 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Under Metal Contacts:</strong> Deep,
                heavily doped regions (~120 ohm/sq) for low contact resistance.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Between Fingers:</strong> Shallow,
                lightly doped regions (~300 ohm/sq) for good blue response and less Auger recombination.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Implementation:</strong> Can be achieved
                through double diffusion, laser doping, or ion implantation with patterned masking.
                Adds 0.3-0.5% absolute efficiency improvement.
              </p>
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
      <TransferPhaseView
        conceptName="Doping Diffusion"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
      />
    );
  }

  if (phase === 'transfer') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center', fontWeight: 700 }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px', fontWeight: 400 }}>
              Diffusion is fundamental to all semiconductor devices
            </p>
            <p style={{ color: colors.textMuted, fontSize: '14px', textAlign: 'center', marginBottom: '16px', fontWeight: 400 }}>
              App {transferCompleted.size + 1} of {realWorldApps.length}
            </p>
          </div>

          {realWorldApps.map((app, index) => (
            <div
              key={index}
              style={{
                background: colors.bgCard,
                margin: '16px',
                padding: '16px',
                borderRadius: '12px',
                border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700 }}>
                  <span style={{ marginRight: '8px' }}>{app.icon}</span>{app.title}
                </h3>
                {transferCompleted.has(index) && <span style={{ color: colors.success, fontWeight: 700 }}>Complete</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px', fontWeight: 400 }}>{app.description}</p>

              {/* Stats grid with numeric values */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                {app.stats.map((stat, sIndex) => (
                  <div key={sIndex} style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ color: app.color, fontSize: '16px', fontWeight: 700 }}>{stat.value}</div>
                    <div style={{ color: colors.textMuted, fontSize: '10px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.connection}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: `1px solid ${colors.accent}`,
                      background: 'transparent',
                      color: colors.accent,
                      cursor: 'pointer',
                      fontSize: '13px',
                      minHeight: '44px',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    Learn More
                  </button>
                  <button
                    onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: `1px solid ${colors.success}`,
                      background: 'rgba(16, 185, 129, 0.1)',
                      color: colors.success,
                      cursor: 'pointer',
                      fontSize: '13px',
                      minHeight: '44px',
                      fontWeight: 700,
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    Got It
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '12px' }}>
                    <p style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 400 }}>{app.howItWorks}</p>
                  </div>
                  <button
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: `1px solid ${colors.success}`,
                      background: 'rgba(16, 185, 129, 0.1)',
                      color: colors.success,
                      cursor: 'pointer',
                      fontSize: '13px',
                      minHeight: '44px',
                      fontWeight: 700,
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    Got It
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You\'ve mastered doping and diffusion!' : 'Review the material and try again.'}
              </p>
            </div>
            <div style={{ padding: '16px' }}>
              <h3 style={{ color: '#f8fafc', fontSize: '18px', marginBottom: '16px' }}>Answer Key:</h3>
              {testQuestions.map((q, idx) => {
                const userAnswer = testAnswers[idx];
                const correctOption = q.options.find(o => o.correct);
                const correctIdx = q.options.indexOf(correctOption!);
                const isCorrect = userAnswer === correctIdx;
                return (
                  <div key={idx} style={{ background: 'rgba(30, 41, 59, 0.9)', margin: '12px 0', padding: '16px', borderRadius: '10px', borderLeft: `4px solid ${isCorrect ? '#10b981' : '#ef4444'}` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ color: isCorrect ? '#10b981' : '#ef4444', fontSize: '18px', flexShrink: 0 }}>{isCorrect ? '\u2713' : '\u2717'}</span>
                      <span style={{ color: '#f8fafc', fontSize: '14px', fontWeight: 600 }}>Q{idx + 1}. {q.question}</span>
                    </div>
                    {!isCorrect && userAnswer !== null && (
                      <div style={{ marginLeft: '26px', marginBottom: '6px' }}>
                        <span style={{ color: '#ef4444', fontSize: '13px' }}>Your answer: </span>
                        <span style={{ color: '#64748b', fontSize: '13px' }}>{q.options[userAnswer]?.text}</span>
                      </div>
                    )}
                    <div style={{ marginLeft: '26px', marginBottom: '8px' }}>
                      <span style={{ color: '#10b981', fontSize: '13px' }}>Correct answer: </span>
                      <span style={{ color: '#94a3b8', fontSize: '13px' }}>{correctOption?.text}</span>
                    </div>
                    <div style={{ marginLeft: '26px', background: 'rgba(245, 158, 11, 0.1)', padding: '8px 12px', borderRadius: '8px' }}>
                      <span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 600 }}>Why? </span>
                      <span style={{ color: '#94a3b8', fontSize: '12px', lineHeight: '1.5' }}>{q.explanation}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];

    // Scenario context for each question to provide richer educational content
    const questionScenarios = [
      'In semiconductor manufacturing, engineers must control electrical properties precisely. Understanding this fundamental concept is essential for creating solar cells, LEDs, and computer chips.',
      'A solar cell factory operates diffusion furnaces 24/7. The temperature inside must be precisely controlled to achieve consistent junction depths across millions of wafers.',
      'Scientists studying semiconductor physics discovered that atomic movement follows predictable mathematical patterns. This relationship governs all diffusion processes in chip manufacturing.',
      'When designing a solar cell, engineers must decide how deep to make the p-n junction. This critical decision affects both electrical performance and light absorption efficiency.',
      'A thought experiment: Could you manufacture semiconductors at room temperature if you waited long enough? The physics of diffusion reveals why semiconductor fabs require high temperatures.',
      'Measuring the distribution of dopant atoms in silicon requires sophisticated techniques. Understanding the expected profile shape helps engineers verify their manufacturing process.',
      'Electrical characterization of doped layers is essential for quality control. Engineers use specialized probes to measure the resistance of thin semiconductor films.',
      'A semiconductor fab is upgrading their diffusion furnaces from 800C to 900C capability. How will this affect their manufacturing process and junction characteristics?',
      'Solar cell efficiency depends on matching the junction depth to the absorption depth of different wavelengths of light. Blue light behaves differently than red light in silicon.',
      'Engineers designing high-efficiency solar cells must balance multiple competing requirements. Understanding these tradeoffs is key to optimizing cell performance.',
    ];

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary, fontWeight: 700 }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary, fontWeight: 400 }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
            </div>
            <p style={{ color: colors.accent, fontSize: '16px', marginBottom: '16px', fontWeight: 700 }}>
              Question {currentTestQuestion + 1} of {testQuestions.length}
            </p>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
              ))}
            </div>
            {/* Scenario context for richer educational content */}
            <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', borderLeft: `3px solid ${colors.solar}` }}>
              <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.5, fontWeight: 400, margin: 0 }}>
                {questionScenarios[currentTestQuestion]}
              </p>
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5, fontWeight: 400 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button
                  key={oIndex}
                  onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    minHeight: '44px',
                    fontWeight: 400,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.textMuted}`,
                background: 'transparent',
                color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                minHeight: '44px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Previous
            </button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                  minHeight: '44px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={submitTest}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null) ? colors.textMuted : colors.success,
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  minHeight: '44px',
                  WebkitTapHighlightColor: 'transparent',
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

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered doping and diffusion!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Diffusion as thermal atomic motion</li>
              <li>Arrhenius temperature dependence (exponential)</li>
              <li>Square-root time dependence of diffusion depth</li>
              <li>Concentration profiles and junction formation</li>
              <li>Shallow vs deep junction tradeoffs</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Modern solar cell manufacturing uses a combination of tube furnace diffusion,
              ion implantation, and laser doping to create precisely controlled junction profiles.
              Selective emitter designs with 2-3 different doping levels are standard in
              high-efficiency cells, achieving the optimal balance of collection efficiency
              and electrical resistance!
            </p>
          </div>
          {renderVisualization(true, true)}
        </div>
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))', borderTop: '1px solid rgba(148, 163, 184, 0.2)', zIndex: 1000 }}>
          <button onClick={() => { onGameEvent?.({ type: 'mastery_achieved', details: { score: testQuestions.filter((q, i) => testAnswers[i] !== null && q.options[testAnswers[i]!].correct).length, total: testQuestions.length } }); window.location.href = '/games'; }}
            style={{ width: '100%', minHeight: '52px', padding: '14px 24px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '12px', color: '#f8fafc', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
            Complete Game
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default DopingDiffusionRenderer;
