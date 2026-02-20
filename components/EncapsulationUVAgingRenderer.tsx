import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface EncapsulationUVAgingRendererProps {
  phase?: Phase;
  gamePhase?: string;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: 'rgba(148,163,184,0.7)',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  solar: '#3b82f6',
  uv: '#8b5cf6',
  yellowed: '#d97706',
  fresh: '#60a5fa',
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '20px',
  touchAction: 'pan-y' as const,
  WebkitAppearance: 'none' as const,
  accentColor: '#3b82f6',
};

const EncapsulationUVAgingRenderer: React.FC<EncapsulationUVAgingRendererProps> = ({
  phase: initialPhase,
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const typo = {
    title: isMobile ? '28px' : '36px',
    heading: isMobile ? '20px' : '24px',
    bodyLarge: isMobile ? '16px' : '18px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '11px' : '12px',
    pagePadding: isMobile ? '16px' : '24px',
    cardPadding: isMobile ? '12px' : '16px',
    sectionGap: isMobile ? '16px' : '20px',
    elementGap: isMobile ? '8px' : '12px',
  };

  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Explore Materials',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  const getInitialPhase = (): Phase => {
    const p = (gamePhase || initialPhase) as Phase;
    if (p && phaseOrder.includes(p)) return p;
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  useEffect(() => {
    const p = (gamePhase || initialPhase) as Phase;
    if (p && phaseOrder.includes(p) && p !== phase) {
      setPhase(p);
    }
  }, [gamePhase, initialPhase]);

  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;
    lastClickRef.current = now;
    isNavigating.current = true;
    setPhase(p);
    setTimeout(() => { isNavigating.current = false; }, 400);
  }, []);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) goToPhase(phaseOrder[idx + 1]);
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) goToPhase(phaseOrder[idx - 1]);
  }, [phase, goToPhase]);

  // Simulation state
  const [uvExposureYears, setUvExposureYears] = useState(0);
  const [materialType, setMaterialType] = useState<'eva' | 'poe' | 'silicone'>('eva');
  const [isAnimating, setIsAnimating] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<'glass_glass' | 'glass_backsheet'>('glass_backsheet');

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [testConfirmed, setTestConfirmed] = useState<boolean[]>(new Array(10).fill(false));

  const calculateDegradation = useCallback(() => {
    const degradationRates: Record<string, number> = { eva: 0.015, poe: 0.008, silicone: 0.003 };
    const rate = degradationRates[materialType];
    const yellowingIndex = 100 * (1 - Math.exp(-rate * uvExposureYears * 1.5));
    const baseTransmittance = materialType === 'silicone' ? 93 : materialType === 'poe' ? 92 : 91;
    const transmittance = baseTransmittance - (yellowingIndex * 0.15);
    const powerLoss = ((baseTransmittance - transmittance) / baseTransmittance) * 100;
    const chainScission = 100 * (1 - Math.exp(-rate * uvExposureYears * 2));
    return {
      yellowingIndex: Math.min(yellowingIndex, 100),
      transmittance: Math.max(transmittance, 70),
      powerLoss: Math.min(powerLoss, 25),
      chainScission: Math.min(chainScission, 100),
      degradationRate: rate * 100,
    };
  }, [uvExposureYears, materialType]);

  const calculateDurabilityComparison = useCallback(() => {
    const factor = comparisonMode === 'glass_glass' ? 0.6 : 1.0;
    const effectiveAge = uvExposureYears * factor;
    const degradation = 100 * (1 - Math.exp(-0.012 * effectiveAge));
    const expectedLifespan = comparisonMode === 'glass_glass' ? 35 : 25;
    return {
      effectiveAge,
      degradation: Math.min(degradation, 50),
      expectedLifespan,
      moistureIngress: comparisonMode === 'glass_glass' ? 'Very Low' : 'Moderate',
    };
  }, [uvExposureYears, comparisonMode]);

  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setUvExposureYears(prev => {
        const newVal = prev + 0.5;
        if (newVal >= 30) { setIsAnimating(false); return 30; }
        return newVal;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'linear', label: 'Yellowing increases linearly with time - 10 years = 2x the yellowing of 5 years' },
    { id: 'exponential', label: 'Yellowing accelerates over time - later years show more damage' },
    { id: 'saturating', label: 'Yellowing slows down over time - initial damage is fastest' },
    { id: 'threshold', label: 'No yellowing until a critical UV dose is reached, then sudden failure' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Both module types degrade at the same rate - only the encapsulant matters' },
    { id: 'glass_better', label: 'Glass/glass lasts longer because glass blocks more UV and moisture' },
    { id: 'backsheet_better', label: 'Glass/backsheet lasts longer because it runs cooler' },
    { id: 'depends', label: 'It depends entirely on the encapsulant material used' },
  ];

  const transferApplications = [
    {
      title: 'Desert Solar Farms',
      description: 'Solar installations in deserts face extreme UV exposure of 2000 kWh/m2/year, temperatures over 50°C, and sand abrasion. Real-world application of encapsulant science in harsh environments.',
      detail: 'Desert conditions accelerate UV degradation due to higher irradiance (~2000 kWh/m2/year vs ~1000 in temperate zones). POE and silicone have lower UV sensitivity and better thermal stability, reducing yellowing and maintaining higher transmittance over the 25-30 year lifespan. Companies like First Solar and LONGi Green Energy invest heavily in desert-rated encapsulant formulations.',
    },
    {
      title: 'Building-Integrated PV (BIPV)',
      description: 'Solar panels integrated into building facades and windows must maintain aesthetics for 30+ years while generating 150 W per m2 of power.',
      detail: 'BIPV modules are architectural features where yellowing is immediately visible and unacceptable. These applications often use silicone encapsulants despite higher cost, or glass/glass construction with UV-stabilized EVA to maintain clarity for 30+ years. Companies like SunPower and Tesla Solar develop specialty BIPV encapsulant systems.',
    },
    {
      title: 'Floating Solar (Floatovoltaics)',
      description: 'Solar panels on water bodies face 95% humidity, reflected UV adding 10% extra dose, and salt spray in coastal installations worldwide.',
      detail: 'Water reflects 5-10% of incident sunlight back up at the panels, increasing rear-side UV exposure. Combined with high humidity accelerating hydrolysis of EVA, floating solar often requires glass/glass modules with POE encapsulants for durability. JA Solar and Trina Solar lead in floating solar encapsulant technology.',
    },
    {
      title: 'Warranty and Degradation Guarantees',
      description: 'Solar manufacturers provide 25-year warranties guaranteeing minimum power output based on degradation science.',
      detail: 'Manufacturers use accelerated UV aging tests (IEC 61215) to predict 25-year yellowing. A module warranted for 80% power at 25 years must account for ~3-5% loss from encapsulant yellowing alone, requiring materials with less than 0.5%/year transmittance loss. Canadian Solar and Hanwha Q Cells use these models for warranty calculations.',
    },
  ];

  const testQuestions = [
    { question: 'What causes the yellowing of solar panel encapsulants over time?', options: [
      { text: 'Dust accumulation between the glass layers', correct: false },
      { text: 'UV radiation breaking polymer chains (photodegradation)', correct: true },
      { text: 'Chemical reaction with rainwater', correct: false },
      { text: 'Natural color change in silicon cells', correct: false },
    ]},
    { question: 'Which encapsulant material typically shows the most UV resistance?', options: [
      { text: 'Standard EVA (ethylene-vinyl acetate)', correct: false },
      { text: 'POE (polyolefin elastomer)', correct: false },
      { text: 'Silicone', correct: true },
      { text: 'PVB (polyvinyl butyral)', correct: false },
    ]},
    { question: 'How does encapsulant yellowing affect solar panel output?', options: [
      { text: 'It increases electrical resistance in the cells', correct: false },
      { text: 'It reduces light transmission to the cells, lowering current', correct: true },
      { text: 'It causes short circuits between cells', correct: false },
      { text: 'It has no effect on electrical output', correct: false },
    ]},
    { question: 'Why do glass/glass modules typically show less encapsulant degradation?', options: [
      { text: 'The glass absorbs heat that would damage the encapsulant', correct: false },
      { text: 'Glass provides a better moisture barrier, reducing hydrolysis', correct: true },
      { text: 'Glass reflects UV away from the encapsulant', correct: false },
      { text: 'Glass/glass modules are always made with better encapsulants', correct: false },
    ]},
    { question: 'What is chain scission in polymer degradation?', options: [
      { text: 'The linking of polymer chains to form a network', correct: false },
      { text: 'The breaking of polymer chains into shorter fragments', correct: true },
      { text: 'The crystallization of polymer molecules', correct: false },
      { text: 'The absorption of water by polymer chains', correct: false },
    ]},
    { question: 'Typical EVA encapsulant starts with about 91% transmittance. After 25 years of UV exposure, a well-designed module might drop to:', options: [
      { text: '50-60% transmittance (major loss)', correct: false },
      { text: '70-75% transmittance (significant loss)', correct: false },
      { text: '85-88% transmittance (moderate loss)', correct: true },
      { text: '90-91% transmittance (negligible loss)', correct: false },
    ]},
    { question: 'The yellowing index of an encapsulant typically follows which pattern over time?', options: [
      { text: 'Linear increase throughout the lifetime', correct: false },
      { text: 'Rapid initial yellowing that slows down (saturating exponential)', correct: true },
      { text: 'No change for 20 years, then sudden yellowing', correct: false },
      { text: 'Yellowing decreases after initial increase', correct: false },
    ]},
    { question: 'What role do UV stabilizers play in encapsulant formulations?', options: [
      { text: 'They absorb UV and convert it to heat, protecting the polymer', correct: true },
      { text: 'They make the encapsulant harder and more rigid', correct: false },
      { text: 'They increase the initial transparency of the encapsulant', correct: false },
      { text: 'They prevent the encapsulant from melting in hot weather', correct: false },
    ]},
    { question: 'In accelerated aging tests, how is 25 years of outdoor UV exposure typically simulated?', options: [
      { text: 'Exposure to high temperature for 25 days', correct: false },
      { text: 'Intense UV lamps for 1000+ hours at elevated temperature', correct: true },
      { text: 'Soaking in salt water for several months', correct: false },
      { text: 'Repeated freeze-thaw cycles over 6 months', correct: false },
    ]},
    { question: 'Why is the combination of UV exposure and moisture particularly damaging to EVA?', options: [
      { text: 'Water conducts electricity through the damaged encapsulant', correct: false },
      { text: 'UV creates radicals, and moisture enables hydrolysis of acetate groups, forming acetic acid', correct: true },
      { text: 'Moisture blocks UV from being absorbed evenly', correct: false },
      { text: 'Water makes the EVA expand and crack', correct: false },
    ]},
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    if (testConfirmed[questionIndex]) return;
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  };

  const confirmAnswer = () => {
    if (testAnswers[currentTestQuestion] === null) return;
    const newConfirmed = [...testConfirmed];
    newConfirmed[currentTestQuestion] = true;
    setTestConfirmed(newConfirmed);
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) score++;
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  const handleSliderChange = (val: number) => {
    setUvExposureYears(val);
  };

  // ── Visualization ──

  const renderVisualization = (interactive: boolean, showComparison: boolean = false) => {
    const width = 500;
    const height = 400;
    const output = calculateDegradation();
    const durability = calculateDurabilityComparison();
    const yellowFactor = output.yellowingIndex / 100;
    const protectionLevel = 100 - output.yellowingIndex;

    // Chart area for the power loss curve
    const chartLeft = 280;
    const chartTop = 252;
    const plotLeft = 20;
    const plotTop = 20;
    const plotRight = 185;
    const plotBottom = 95;
    const plotW = plotRight - plotLeft;
    const plotH = plotBottom - plotTop;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: typo.elementGap }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '550px' }}
        >
          <defs>
            <linearGradient id="encapLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="30%" stopColor="#0f172a" />
              <stop offset="70%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <radialGradient id="encapSunGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#d97706" stopOpacity="0.6" />
              <stop offset="80%" stopColor="#b45309" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#92400e" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="encapUvRay" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#5b21b6" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="encapGlassLayer" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#7dd3fc" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="encapDynamicEncap" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={`rgb(${96 + yellowFactor * 159}, ${165 - yellowFactor * 80}, ${250 - yellowFactor * 200})`} />
              <stop offset="50%" stopColor={`rgb(${70 + yellowFactor * 170}, ${140 - yellowFactor * 70}, ${220 - yellowFactor * 170})`} />
              <stop offset="100%" stopColor={`rgb(${96 + yellowFactor * 159}, ${165 - yellowFactor * 80}, ${250 - yellowFactor * 200})`} />
            </linearGradient>
            <linearGradient id="encapSolarCell" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>
            <linearGradient id="encapCellSubstrate" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="50%" stopColor="#0f2942" />
              <stop offset="100%" stopColor="#1e3a5f" />
            </linearGradient>
            <linearGradient id="encapBacksheet" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="50%" stopColor="#374151" />
              <stop offset="100%" stopColor="#4b5563" />
            </linearGradient>
            <linearGradient id="encapProtectionMeter" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
            <linearGradient id="encapYellowBar" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="encapTransBar" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id="encapPowerLossBar" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <linearGradient id="encapPowerCurve" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <filter id="encapUvGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="encapSunFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="encapCellGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="encapMeterGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width={width} height={height} fill="url(#encapLabBg)" />
          <pattern id="encapGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.3" />
          </pattern>
          <rect width={width} height={height} fill="url(#encapGrid)" opacity="0.5" />

          {/* Sun with glow */}
          <g filter="url(#encapSunFilter)">
            <circle cx={250} cy={32} r={28} fill="url(#encapSunGlow)" />
          </g>
          {/* Label: UV Source */}
          <text x={250} y={18} textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="bold">UV Source</text>

          {/* UV rays */}
          {[...Array(12)].map((_, i) => {
            const baseX = 55 + i * 33;
            const waveOffset = Math.sin(i * 0.5) * 8;
            return (
              <g key={`uvray${i}`} filter="url(#encapUvGlow)">
                <line x1={baseX} y1={55} x2={baseX + waveOffset} y2={95} stroke="url(#encapUvRay)" strokeWidth={2.5} strokeLinecap="round" strokeDasharray="6,3" opacity={0.8} />
                <circle cx={baseX + waveOffset * 0.5} cy={75} r={2} fill="#a855f7" opacity={0.6} />
              </g>
            );
          })}

          {/* Main solar panel */}
          <g transform="translate(100, 100)">
            <rect x={4} y={4} width={300} height={138} fill="rgba(0,0,0,0.3)" rx={4} />
            {/* Glass layer */}
            <rect x={0} y={0} width={300} height={18} fill="url(#encapGlassLayer)" stroke="#64748b" strokeWidth={1} rx={3} />
            <rect x={5} y={2} width={290} height={4} fill="rgba(255,255,255,0.2)" rx={2} />
            {/* Encapsulant layer */}
            <rect x={0} y={20} width={300} height={32} fill="url(#encapDynamicEncap)" rx={2} />
            <rect x={0} y={20} width={300} height={1} fill="rgba(255,255,255,0.15)" />
            {/* Solar cells */}
            <rect x={8} y={55} width={284} height={42} fill="url(#encapCellSubstrate)" rx={3} />
            {[...Array(6)].map((_, i) => (
              <g key={`cell${i}`} filter="url(#encapCellGlow)">
                <rect x={14 + i * 46} y={58} width={42} height={36} fill="url(#encapSolarCell)" stroke="#1e40af" strokeWidth={1} rx={2} />
                <line x1={14 + i * 46 + 14} y1={58} x2={14 + i * 46 + 14} y2={94} stroke="#94a3b8" strokeWidth={1} opacity={0.6} />
                <line x1={14 + i * 46 + 28} y1={58} x2={14 + i * 46 + 28} y2={94} stroke="#94a3b8" strokeWidth={1} opacity={0.6} />
              </g>
            ))}
            {/* Back encapsulant */}
            <rect x={0} y={100} width={300} height={22} fill="url(#encapDynamicEncap)" rx={2} />
            {/* Backsheet or rear glass */}
            {showComparison && comparisonMode === 'glass_glass' ? (
              <rect x={0} y={124} width={300} height={14} fill="url(#encapGlassLayer)" stroke="#64748b" strokeWidth={1} rx={3} />
            ) : (
              <rect x={0} y={124} width={300} height={14} fill="url(#encapBacksheet)" stroke="#4b5563" strokeWidth={1} rx={3} />
            )}
          </g>

          {/* Panel layer labels */}
          <text x={92} y={94} textAnchor="end" fill="#e2e8f0" fontSize="11">Glass</text>
          <text x={92} y={135} textAnchor="end" fill="#e2e8f0" fontSize="11">Encapsulant</text>
          <text x={92} y={180} textAnchor="end" fill="#e2e8f0" fontSize="11">Solar Cells</text>
          <text x={92} y={225} textAnchor="end" fill="#e2e8f0" fontSize="11">{showComparison && comparisonMode === 'glass_glass' ? 'Rear Glass' : 'Backsheet'}</text>

          {/* Protection Meter */}
          <g transform="translate(25, 115)">
            <rect x={-5} y={-5} width={55} height={110} fill="rgba(0,0,0,0.4)" rx={6} />
            <rect x={5} y={5} width={35} height={90} fill="rgba(0,0,0,0.5)" rx={4} stroke="#475569" strokeWidth={1} />
            <rect x={10} y={10 + (80 - protectionLevel * 0.8)} width={25} height={protectionLevel * 0.8} fill="url(#encapProtectionMeter)" rx={2} filter="url(#encapMeterGlow)" />
            {[0, 25, 50, 75, 100].map((tick) => (
              <g key={`tick${tick}`}>
                <line x1={38} y1={90 - tick * 0.8} x2={42} y2={90 - tick * 0.8} stroke="#64748b" strokeWidth={1} />
              </g>
            ))}
            <text x={22} y={107} textAnchor="middle" fill="#e2e8f0" fontSize="11">Protection</text>
          </g>

          {/* Degradation metric bars */}
          <g transform="translate(20, 260)">
            <text x={0} y={4} fill="#fbbf24" fontSize="11">Yellowing: {output.yellowingIndex.toFixed(1)}%</text>
            <rect x={0} y={8} width={140} height={18} fill="rgba(0,0,0,0.3)" rx={4} />
            <rect x={2} y={10} width={Math.min(output.yellowingIndex * 1.36, 136)} height={14} fill="url(#encapYellowBar)" rx={3} />

            <text x={0} y={35} fill="#38bdf8" fontSize="11">Transmittance: {output.transmittance.toFixed(1)}%</text>
            <rect x={0} y={39} width={140} height={18} fill="rgba(0,0,0,0.3)" rx={4} />
            <rect x={2} y={41} width={(output.transmittance / 100) * 136} height={14} fill="url(#encapTransBar)" rx={3} />

            <text x={0} y={66} fill="#f87171" fontSize="11">Power Loss: {output.powerLoss.toFixed(1)}%</text>
            <rect x={0} y={70} width={140} height={18} fill="rgba(0,0,0,0.3)" rx={4} />
            <rect x={2} y={72} width={Math.min(output.powerLoss * 5.44, 136)} height={14} fill="url(#encapPowerLossBar)" rx={3} />
          </g>

          {/* Power loss curve chart */}
          <g transform={`translate(${chartLeft}, ${chartTop})`}>
            <rect x={-5} y={-5} width={210} height={130} fill="rgba(0,0,0,0.4)" rx={6} />
            <text x={100} y={-18} textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="bold">Power Loss Over Time</text>

            {/* Grid lines */}
            {[0, 25, 50, 75].map((y) => (
              <line key={`grid${y}`} x1={plotLeft} y1={plotTop + y * (plotH / 75)} x2={plotRight} y2={plotTop + y * (plotH / 75)} stroke="#334155" strokeWidth={0.5} strokeDasharray="4 4" opacity={0.3} />
            ))}

            {/* Axes */}
            <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke="#64748b" strokeWidth={1.5} />
            <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke="#64748b" strokeWidth={1.5} />

            {/* Axis labels */}
            <text x={100} y={plotBottom + 15} textAnchor="middle" fill="#e2e8f0" fontSize="11">Time (years)</text>
            <text x={-10} y={20} textAnchor="middle" fill="#e2e8f0" fontSize="11" transform="rotate(-90, -10, 20)">Power Loss %</text>

            {/* Power curve - 30 data points */}
            <path
              d={`M ${plotLeft} ${plotTop + 2} ${[...Array(30)].map((_, i) => {
                const year = i;
                const loss = 100 * (1 - Math.exp(-0.015 * year * 1.5)) * 0.15;
                const x = plotLeft + (i / 30) * plotW;
                const y = plotTop + 2 + loss * (plotH / 25) * 5;
                return `L ${x.toFixed(1)} ${y.toFixed(1)}`;
              }).join(' ')}`}
              fill="none"
              stroke="url(#encapPowerCurve)"
              strokeWidth={2.5}
              strokeLinecap="round"
            />

            {/* Interactive marker point */}
            <circle
              cx={plotLeft + (uvExposureYears / 30) * plotW}
              cy={plotTop + 2 + output.powerLoss * (plotH / 25) * 5}
              r={8}
              fill={colors.accent}
              filter="url(#glow)"
              stroke="#fff"
              strokeWidth={2}
            />
          </g>

          {/* Comparison info */}
          {showComparison && (
            <g transform="translate(410, 100)">
              <rect x={0} y={0} width={80} height={40} fill="rgba(0,0,0,0.5)" rx={6} stroke="#475569" strokeWidth={1} />
              <text x={40} y={18} textAnchor="middle" fill="#e2e8f0" fontSize="11">{comparisonMode === 'glass_glass' ? 'G/G' : 'G/BS'}</text>
              <text x={40} y={34} textAnchor="middle" fill={comparisonMode === 'glass_glass' ? colors.success : colors.warning} fontSize="11">{durability.expectedLifespan}yr</text>
            </g>
          )}
        </svg>

        {/* Legend panel */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '4px 16px', maxWidth: '550px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#fbbf24' }} />
            <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Yellowing</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#38bdf8' }} />
            <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Transmittance</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f87171' }} />
            <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Power Loss</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#a855f7' }} />
            <span style={{ fontSize: typo.small, color: colors.textSecondary }}>UV Rays</span>
          </div>
        </div>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '12px 24px', borderRadius: '8px', border: 'none',
                background: isAnimating ? colors.error : colors.success,
                color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: typo.body,
                transition: 'all 0.3s ease', WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isAnimating ? 'Pause Aging' : 'Simulate Aging'}
            </button>
            <button
              onClick={() => { setUvExposureYears(0); setIsAnimating(false); }}
              style={{
                padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.accent}`,
                background: 'transparent', color: colors.accent, fontWeight: 'bold',
                cursor: 'pointer', fontSize: typo.body, transition: 'all 0.3s ease',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = (showComparison: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: typo.body }}>
          UV Exposure: {uvExposureYears.toFixed(1)} years
        </label>
        <input
          type="range" min="0" max="30" step="0.5" value={uvExposureYears}
          onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
          onInput={(e) => handleSliderChange(parseFloat((e.target as HTMLInputElement).value))}
          style={sliderStyle}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: typo.body }}>
          Encapsulant Material:
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['eva', 'poe', 'silicone'] as const).map((mat) => (
            <button key={mat} onClick={() => setMaterialType(mat)} style={{
              padding: '10px 20px', borderRadius: '8px',
              border: materialType === mat ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
              background: materialType === mat ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
              color: colors.textPrimary, cursor: 'pointer', fontSize: '14px',
              transition: 'all 0.3s ease', WebkitTapHighlightColor: 'transparent',
            }}>
              {mat.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {showComparison && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: typo.body }}>
            Module Construction:
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['glass_backsheet', 'glass_glass'] as const).map((mode) => (
              <button key={mode} onClick={() => setComparisonMode(mode)} style={{
                padding: '10px 20px', borderRadius: '8px',
                border: comparisonMode === mode ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                background: comparisonMode === mode ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: colors.textPrimary, cursor: 'pointer', fontSize: '14px',
                transition: 'all 0.3s ease', WebkitTapHighlightColor: 'transparent',
              }}>
                {mode === 'glass_backsheet' ? 'Glass/Backsheet' : 'Glass/Glass'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: 'rgba(139, 92, 246, 0.2)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.uv}` }}>
        <div style={{ color: colors.textSecondary, fontSize: typo.body }}>
          Material: {materialType.toUpperCase()} | Degradation Rate: {(calculateDegradation().degradationRate).toFixed(2)}%/year
        </div>
        <div style={{ color: colors.textSecondary, fontSize: typo.small, marginTop: '4px' }}>
          Yellowing = 100 × (1 - e^(-k × t)) where k depends on material UV stability
        </div>
      </div>
    </div>
  );

  // ── Navigation ──

  const renderNavDots = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              aria-label={phaseLabels[p]}
              onClick={() => goToPhase(p)}
              style={{
                height: '8px',
                width: i === currentIdx ? '24px' : '8px',
                borderRadius: '5px',
                backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                border: 'none',
                padding: 0,
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textSecondary }}>
          {currentIdx + 1} / {phaseOrder.length}
        </span>
      </div>
    );
  };

  const renderProgressBar = () => (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)',
      backgroundColor: colors.bgCard, gap: '16px', zIndex: 1000,
    }}>
      {renderNavDots()}
      <div style={{
        padding: '4px 12px', borderRadius: '12px',
        background: `${colors.accent}20`, color: colors.accent,
        fontSize: '11px', fontWeight: 700,
      }}>
        {phaseLabels[phase]}
      </div>
    </div>
  );

  const renderBottomBar = (canProceed: boolean, nextLabel: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = currentIdx > 0;
    const isTestActive = phase === 'test' && !testSubmitted;

    return (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '16px 24px', background: colors.bgDark,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 1000, gap: '12px',
      }}>
        <button onClick={goBack} style={{
          padding: '12px 24px', borderRadius: '8px', border: `1px solid rgba(226,232,240,0.3)`,
          background: 'transparent', color: canBack ? colors.textSecondary : colors.textSecondary,
          fontWeight: 'bold', cursor: canBack ? 'pointer' : 'not-allowed',
          opacity: canBack ? 1 : 0.3, fontSize: '14px', minHeight: '44px',
          transition: 'all 0.3s ease', WebkitTapHighlightColor: 'transparent',
        }}>
          ← Back
        </button>
        <span style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>
        <button
          onClick={() => {
            if (!canProceed || isTestActive) return;
            if (onNext) onNext();
            else goNext();
          }}
          style={{
            padding: '12px 32px', borderRadius: '8px', border: 'none',
            background: (canProceed && !isTestActive) ? `linear-gradient(135deg, ${colors.accent}, #d97706)` : 'rgba(255,255,255,0.1)',
            color: (canProceed && !isTestActive) ? 'white' : colors.textSecondary,
            fontWeight: 'bold', cursor: (canProceed && !isTestActive) ? 'pointer' : 'not-allowed',
            opacity: (canProceed && !isTestActive) ? 1 : 0.4,
            fontSize: '16px', minHeight: '44px',
            transition: 'all 0.3s ease', WebkitTapHighlightColor: 'transparent',
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  // ── Phase shell ──
  const outerStyle: React.CSSProperties = {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    overflow: 'hidden', background: colors.bgPrimary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif',
  };
  const scrollStyle: React.CSSProperties = {
    flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px',
  };

  // ── HOOK ──
  if (phase === 'hook') {
    return (
      <div style={outerStyle}>
        {renderProgressBar()}
        <div style={scrollStyle}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px', fontWeight: 800, lineHeight: 1.5 }}>
              Discover Why Old Panels Yellow
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px', fontWeight: 400, lineHeight: 1.6 }}>
              How UV radiation slowly destroys solar panel encapsulants
            </p>
          </div>
          {renderVisualization(true)}
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6, fontWeight: 400 }}>
                Solar panels are built to last 25+ years in harsh sunlight. But look closely at
                old panels - they often have a yellow or brown tint. This isn't dirt - it's
                chemical damage happening at the molecular level!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px', lineHeight: 1.5 }}>
                The transparent encapsulant protecting the cells slowly breaks down under UV exposure.
                Let's explore how this happens and what engineers do about it.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Start Prediction →')}
      </div>
    );
  }

  // ── PREDICT ──
  if (phase === 'predict') {
    return (
      <div style={outerStyle}>
        {renderProgressBar()}
        <div style={scrollStyle}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>Make Your Prediction</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Think about how UV degradation works over time
            </p>
          </div>
          {renderVisualization(false)}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>What You're Observing:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A solar panel cross-section showing the encapsulant layer that protects the cells.
              UV radiation from sunlight continuously bombards this polymer layer, breaking chemical bonds.
            </p>
          </div>
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 700 }}>
              How does yellowing change over a panel's 25-year lifetime?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p, idx) => (
                <button key={p.id} onClick={() => setPrediction(p.id)} style={{
                  padding: '16px', borderRadius: '8px',
                  border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                  background: prediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px',
                  minHeight: '44px', transition: 'all 0.3s ease', WebkitTapHighlightColor: 'transparent',
                }}>
                  {String.fromCharCode(65 + idx)}. {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(!!prediction, 'Test My Prediction →')}
      </div>
    );
  }

  // ── PLAY ──
  if (phase === 'play') {
    return (
      <div style={outerStyle}>
        {renderProgressBar()}
        <div style={scrollStyle}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>Explore UV Aging</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Adjust UV exposure years and observe how yellowing, transmittance, and power loss change.
              When you increase exposure, more polymer chains break, causing higher yellowing.
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
          <div style={{ background: 'rgba(59, 130, 246, 0.15)', margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `3px solid ${colors.solar}` }}>
            <h4 style={{ color: colors.solar, marginBottom: '8px', fontWeight: 700 }}>Observation Guide:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Try adjusting the slider to see what happens. Compare how different materials degrade vs the baseline fresh state.
              Notice how yellowing is the measure of how much the polymer
              has degraded. Transmittance is defined as the ratio of light passing through, and as yellowing increases,
              less light reaches the cells. This is why material choice matters for real-world solar installations.
            </p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: 700 }}>Experiments to Try:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Run all three materials to 25 years - which yellows least?</li>
              <li>Note the relationship between yellowing and power loss</li>
              <li>Find the year when power loss exceeds 5% for each material</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.15)', margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `3px solid ${colors.accent}` }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: 700 }}>Formula:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Yellowing = 100 × (1 - e^(-k × t)) where k is the material degradation rate and t is time in years.
              Power Loss = (Yellowing × 0.15 / Transmittance₀) × 100. This is important because
              solar panel manufacturers use these same UV degradation models to calculate warranty terms.
            </p>
          </div>
        </div>
        {renderBottomBar(true, 'Continue to Review →')}
      </div>
    );
  }

  // ── REVIEW ──
  if (phase === 'review') {
    const wasCorrect = prediction === 'saturating';
    return (
      <div style={outerStyle}>
        {renderProgressBar()}
        <div style={scrollStyle}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px', padding: '20px', borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontWeight: 700 }}>
              {wasCorrect ? '✓ Correct!' : '✗ Not Quite!'}
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '8px', lineHeight: 1.5 }}>
              Your prediction: {predictions.find(p => p.id === prediction)?.label || 'No prediction made'}
            </p>
            <p style={{ color: colors.textPrimary, lineHeight: 1.6 }}>
              As you observed in the experiment, yellowing follows a saturating exponential pattern - the most vulnerable polymer bonds break first, then the rate slows as remaining bonds become harder to reach.
            </p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>The Science Behind UV Degradation</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Chain Scission:</strong> UV photons have enough energy (3-4 eV) to break C-C and C-O bonds. This demonstrates why higher UV dose leads to more damage.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Chromophore Formation:</strong> Broken bonds create conjugated structures that absorb blue light, therefore making the material appear yellow/brown.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Key Formula:</strong> Yellowing Index = 100 × (1 - e<sup>-k×t</sup>) where k depends on material. Because each material has a different bond structure, the degradation rate k varies: Silicone (k=0.003) has Si-O backbone, POE (k=0.008) is intermediate, EVA (k=0.015) degrades fastest.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Power Loss Equation:</strong> P<sub>loss</sub> = (T₀ - T) / T₀ × 100, where T₀ is initial transmittance and T is current.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Next: A Twist! →')}
      </div>
    );
  }

  // ── TWIST PREDICT ──
  if (phase === 'twist_predict') {
    return (
      <div style={outerStyle}>
        {renderProgressBar()}
        <div style={scrollStyle}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px', fontWeight: 700 }}>New Variable: Module Construction</h2>
            <p style={{ color: colors.textSecondary, lineHeight: 1.5 }}>
              Watch what happens when we change from glass/backsheet to glass/glass construction
            </p>
          </div>
          {renderVisualization(false, true)}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Traditional panels use a polymer backsheet behind the cells, while glass/glass modules use a second glass sheet. Both use the same encapsulant. How does this affect long-term durability?
            </p>
          </div>
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 700 }}>
              Which module type will show less encapsulant degradation over 25 years?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p, idx) => (
                <button key={p.id} onClick={() => setTwistPrediction(p.id)} style={{
                  padding: '16px', borderRadius: '8px',
                  border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                  background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px',
                  minHeight: '44px', transition: 'all 0.3s ease', WebkitTapHighlightColor: 'transparent',
                }}>
                  {String.fromCharCode(65 + idx)}. {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(!!twistPrediction, 'Test My Prediction →')}
      </div>
    );
  }

  // ── TWIST PLAY ──
  if (phase === 'twist_play') {
    return (
      <div style={outerStyle}>
        {renderProgressBar()}
        <div style={scrollStyle}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px', fontWeight: 700 }}>Compare Module Types</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Toggle between glass/glass and glass/backsheet construction to observe degradation differences
            </p>
          </div>
          {renderVisualization(true, true)}
          {renderControls(true)}
          <div style={{ background: 'rgba(59, 130, 246, 0.15)', margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `3px solid ${colors.solar}` }}>
            <h4 style={{ color: colors.solar, marginBottom: '8px', fontWeight: 700 }}>Observation Guide:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Use the slider to compare how different module constructions affect degradation over time.
              Toggle between glass/glass and glass/backsheet to see the moisture barrier effect.
            </p>
          </div>
        </div>
        {renderBottomBar(true, 'See the Explanation →')}
      </div>
    );
  }

  // ── TWIST REVIEW ──
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'glass_better';
    return (
      <div style={outerStyle}>
        {renderProgressBar()}
        <div style={scrollStyle}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px', padding: '20px', borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontWeight: 700 }}>
              {wasCorrect ? '✓ Correct!' : '✗ Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary, lineHeight: 1.6 }}>
              Glass/glass modules typically last 30-35 years vs 25 years for glass/backsheet,
              primarily due to superior moisture barrier properties!
            </p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px', fontWeight: 700 }}>Moisture + UV: A Destructive Combination</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Water Vapor Transmission:</strong> Polymer backsheets allow moisture to slowly penetrate (~1-5 g/m2/day). Glass is essentially impermeable.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Hydrolysis:</strong> Water attacks the acetate groups in EVA, producing acetic acid which accelerates chain scission.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Bifacial Bonus:</strong> Glass/glass modules can harvest light from both sides, adding 5-20% more energy while lasting longer!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Apply This Knowledge →')}
      </div>
    );
  }

  // ── TRANSFER ──
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Encapsulation U V Aging"
        applications={transferApplications}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
      />
    );
  }

  if (phase === 'transfer') {
    return (
      <div style={outerStyle}>
        {renderProgressBar()}
        <div style={scrollStyle}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center', fontWeight: 700 }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '8px', lineHeight: 1.5 }}>
              Encapsulant selection impacts solar project economics worldwide. These real-world examples show how the UV degradation science you learned applies in industry.
            </p>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px', fontSize: '14px' }}>
              Progress: {transferCompleted.size} of {transferApplications.length} applications explored
            </p>
          </div>

          {transferApplications.map((app, index) => (
            <div key={index} style={{
              background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px',
              border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700 }}>{app.title}</h3>
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>✓ Complete</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px', lineHeight: 1.5 }}>{app.description}</p>
              {transferCompleted.has(index) && (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '8px' }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px', lineHeight: 1.5 }}>{app.detail}</p>
                </div>
              )}
              <button
                onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                style={{
                  padding: '10px 20px', borderRadius: '6px', border: 'none',
                  background: transferCompleted.has(index) ? colors.success : `linear-gradient(135deg, ${colors.accent}, #d97706)`,
                  color: 'white', cursor: 'pointer', fontSize: '14px',
                  minHeight: '44px', transition: 'all 0.3s ease', fontWeight: 600,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {transferCompleted.has(index) ? 'Got It ✓' : 'Got It'}
              </button>
            </div>
          ))}
        </div>
        {renderBottomBar(transferCompleted.size >= 4, 'Take the Test →')}
      </div>
    );
  }

  // ── TEST ──
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={outerStyle}>
          {renderProgressBar()}
          <div style={scrollStyle}>
            <div style={{
              background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px', padding: '24px', borderRadius: '12px', textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px', fontWeight: 700 }}>
                {testScore >= 8 ? 'Test Complete! Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>You scored {testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You understand UV aging in solar panels!' : 'Review the material and try again.'}
              </p>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto', margin: '0 16px' }}>
              {testQuestions.map((q, qIndex) => {
                const userAnswer = testAnswers[qIndex];
                const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
                return (
                  <div key={qIndex} style={{ background: colors.bgCard, margin: '8px 0', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                    <p style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 'bold' }}>Question {qIndex + 1}. {q.question}</p>
                    {q.options.map((opt, oIndex) => (
                      <div key={oIndex} style={{
                        padding: '6px 12px', marginBottom: '4px', borderRadius: '6px',
                        background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                        color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary,
                      }}>
                        {opt.correct ? '✓ Correct: ' : userAnswer === oIndex ? '✗ Your answer: ' : ''}{opt.text}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
          {renderBottomBar(testScore >= 8, testScore >= 8 ? 'Complete Lesson →' : 'Review & Retry', testScore >= 8 ? goNext : () => {
            setTestSubmitted(false);
            setCurrentTestQuestion(0);
            setTestConfirmed(new Array(10).fill(false));
          })}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    const isCurrentConfirmed = testConfirmed[currentTestQuestion];
    const currentAnswer = testAnswers[currentTestQuestion];
    const isCurrentCorrect = currentAnswer !== null && currentQ.options[currentAnswer].correct;

    return (
      <div style={outerStyle}>
        {renderProgressBar()}
        <div style={scrollStyle}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary, fontWeight: 700 }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary, fontWeight: 600 }}>Question {currentTestQuestion + 1} of 10</span>
            </div>
            <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '16px', lineHeight: 1.5 }}>
              Apply your understanding of UV degradation, encapsulant chemistry, and solar panel durability to answer the following scenario-based questions about real-world photovoltaic module aging.
            </p>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: '4px', borderRadius: '2px',
                  background: testConfirmed[i] ? colors.accent : i === currentTestQuestion ? colors.textSecondary : 'rgba(255,255,255,0.1)',
                  cursor: 'pointer', transition: 'all 0.3s ease',
                }} onClick={() => setCurrentTestQuestion(i)} />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => {
                let bg = 'transparent';
                let borderColor = 'rgba(255,255,255,0.2)';
                let textColor = colors.textPrimary;
                if (isCurrentConfirmed) {
                  if (opt.correct) { bg = 'rgba(16, 185, 129, 0.2)'; borderColor = colors.success; textColor = colors.success; }
                  else if (currentAnswer === oIndex) { bg = 'rgba(239, 68, 68, 0.2)'; borderColor = colors.error; textColor = colors.error; }
                } else if (currentAnswer === oIndex) {
                  bg = 'rgba(245, 158, 11, 0.2)'; borderColor = colors.accent;
                }
                return (
                  <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{
                    padding: '16px', borderRadius: '8px', border: `2px solid ${borderColor}`,
                    background: bg, color: textColor, cursor: isCurrentConfirmed ? 'default' : 'pointer',
                    textAlign: 'left', fontSize: '14px', WebkitTapHighlightColor: 'transparent',
                    transition: 'all 0.3s ease',
                  }}>
                    {String.fromCharCode(65 + oIndex)}) {opt.text}
                  </button>
                );
              })}
            </div>

            {/* Confirm / Explanation */}
            {!isCurrentConfirmed && currentAnswer !== null && (
              <button onClick={confirmAnswer} style={{
                marginTop: '16px', padding: '14px 28px', borderRadius: '8px', border: 'none',
                background: `linear-gradient(135deg, ${colors.accent}, #d97706)`,
                color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px',
                width: '100%', transition: 'all 0.3s ease',
              }}>
                Confirm Answer
              </button>
            )}

            {isCurrentConfirmed && (
              <div style={{
                marginTop: '12px', padding: '12px', borderRadius: '8px',
                background: isCurrentCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                borderLeft: `3px solid ${isCurrentCorrect ? colors.success : colors.error}`,
              }}>
                <p style={{ color: isCurrentCorrect ? colors.success : colors.error, fontWeight: 'bold', marginBottom: '4px' }}>
                  {isCurrentCorrect ? '✓ Correct!' : '✗ Incorrect'}
                </p>
                <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
                  The correct answer is: {currentQ.options.find(o => o.correct)?.text}.
                  {!isCurrentCorrect && ' Remember that UV degradation involves photon energy breaking polymer bonds, and material choice is the key factor in long-term durability.'}
                </p>
              </div>
            )}
          </div>

          {/* Quiz navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px', borderRadius: '8px', border: `1px solid rgba(226,232,240,0.3)`,
                background: 'transparent', color: currentTestQuestion === 0 ? colors.textSecondary : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease', WebkitTapHighlightColor: 'transparent',
              }}
            >
              Previous
            </button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{
                padding: '12px 24px', borderRadius: '8px', border: 'none',
                background: `linear-gradient(135deg, ${colors.accent}, #d97706)`,
                color: 'white', cursor: 'pointer', fontWeight: 'bold',
                transition: 'all 0.3s ease', WebkitTapHighlightColor: 'transparent',
              }}>
                Next Question
              </button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{
                padding: '12px 24px', borderRadius: '8px', border: 'none',
                background: testAnswers.includes(null) ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg, ${colors.success}, #059669)`,
                color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                fontWeight: 'bold', transition: 'all 0.3s ease', WebkitTapHighlightColor: 'transparent',
              }}>
                Submit Test
              </button>
            )}
          </div>
        </div>
        {renderBottomBar(false, 'Next →')}
      </div>
    );
  }

  // ── MASTERY ──
  if (phase === 'mastery') {
    return (
      <div style={outerStyle}>
        {renderProgressBar()}
        <div style={scrollStyle}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px', fontWeight: 800 }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px', lineHeight: 1.5 }}>
              Congratulations! You have completed the UV aging and encapsulant degradation lesson successfully.
            </p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0, fontSize: '14px' }}>
              <li>UV photons break polymer chains (photodegradation)</li>
              <li>Yellowing follows saturating exponential kinetics</li>
              <li>Transmittance loss directly reduces power output</li>
              <li>Material choice: Silicone {'>'} POE {'>'} EVA for UV stability</li>
              <li>Glass/glass construction blocks moisture, extending life</li>
              <li>Combined UV + moisture damage through hydrolysis</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.uv, marginBottom: '12px', fontWeight: 700 }}>Industry Impact:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              The global solar industry invests billions in encapsulant R&D. Moving from standard EVA
              to advanced materials like POE or silicone can add 5-10 years to module lifetime,
              dramatically improving project economics. Your understanding of degradation physics
              enables better material selection and lifetime predictions!
            </p>
          </div>
        </div>
        {renderBottomBar(true, 'Complete Lesson →')}
      </div>
    );
  }

  return null;
};

export default EncapsulationUVAgingRenderer;
