'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface ViscoelasticityRendererProps {
  phase?: Phase;
  gamePhase?: string;
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
  onGameEvent?: (event: Record<string, unknown>) => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: 'rgba(148,163,184,0.7)',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#8b5cf6',
  accentGlow: 'rgba(139, 92, 246, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  elastic: '#3b82f6',
  viscous: '#ef4444',
  border: '#334155',
};

const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'Explore Twist',
  twist_play: 'Twist Experiment',
  twist_review: 'Deep Insight',
  transfer: 'Apply & Transfer',
  test: 'Quiz & Test',
  mastery: 'Mastery',
};

const playSound = (type: string) => {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const freqs: Record<string, number> = { click: 600, success: 800, failure: 300, transition: 500 };
    osc.frequency.value = freqs[type] || 500;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch { /* ignore */ }
};

const realWorldApps = [
  {
    icon: '👟',
    title: 'Athletic Shoe Technology',
    short: 'Cushioning that adapts to your stride',
    tagline: 'Energy return meets protection',
    description: 'Running shoe midsoles use viscoelastic foams (EVA and TPU) that absorb impact energy on landing — the viscous response — but return energy during push-off — the elastic response. Nike ZoomX foam achieves 85% energy return. The Deborah number changes with footstrike speed: fast heel strike (De > 1) triggers solid-like behavior for protection; slower push-off (De < 1) allows elastic energy return for efficiency.',
    connection: 'Fast impacts from heel strike trigger solid-like behavior for protection. Slower push-off allows elastic energy return for efficiency.',
    howItWorks: 'EVA and TPU foams have tuned relaxation times. Fast compression (impact ~10ms) causes high stress (cushioning). Energy stored elastically releases during toe-off, improving running economy by up to 4%.',
    stats: [
      { value: '85%', label: 'Energy return (top foams)', icon: '⚡' },
      { value: '10ms', label: 'Impact duration', icon: '⏱️' },
      { value: '40mm', label: 'Max stack height allowed', icon: '📏' },
    ],
    examples: ['Nike ZoomX', 'Adidas Boost', 'ASICS Gel', 'Hoka Profly'],
    companies: ['Nike', 'Adidas', 'ASICS', 'Brooks'],
    futureImpact: 'Smart foams with adjustable stiffness will adapt to running speed and terrain in real time.',
    color: '#3B82F6',
  },
  {
    icon: '🚗',
    title: 'Automotive Suspension',
    short: 'Balancing comfort and control',
    tagline: 'The ride quality equation',
    description: 'Car suspension uses viscoelastic bushings and hydraulic dampers that feel stiff during quick cornering maneuvers (De > 1, solid-like) but soft over gradual road undulations (De < 1, fluid-like). Continental and Bilstein adaptive dampers control this transition in real time, reducing NVH (noise, vibration, harshness) by up to 40%. The body resonance frequency is ~10 Hz and wheel hop is ~2 Hz.',
    connection: 'High Deborah number during cornering provides precise control. Low Deborah number over slow undulations delivers smooth ride quality.',
    howItWorks: 'Rubber bushings isolate vibration. Hydraulic dampers control oscillation. Frequency-dependent stiffness filters high-frequency harshness while maintaining body control at low frequencies.',
    stats: [
      { value: '10Hz', label: 'Body resonance frequency', icon: '📊' },
      { value: '2Hz', label: 'Wheel hop frequency', icon: '🔄' },
      { value: '40%', label: 'NVH reduction achieved', icon: '📉' },
    ],
    examples: ['Luxury sedan suspension', 'Adaptive dampers', 'Engine mounts', 'Subframe bushings'],
    companies: ['Bilstein', 'KYB', 'ZF', 'Continental'],
    futureImpact: 'Magnetorheological dampers with real-time electromagnetic control will eliminate the comfort/handling tradeoff entirely.',
    color: '#10B981',
  },
  {
    icon: '🏭',
    title: 'Polymer Processing & Manufacturing',
    short: 'Shaping materials through controlled flow',
    tagline: 'Timing the solid-to-liquid transition',
    description: 'Manufacturing plastics requires understanding viscoelastic flow. Injection molding, extrusion, and blow molding all depend on managing the solid-to-liquid transition through temperature and strain rate control. BASF and DuPont process polymers at 200–300°C with fill times of 0.1–10 seconds. The Deborah number must stay in the moldable regime (De ~ 0.1–1) to achieve defect-free parts with injection pressures exceeding 1,000 psi.',
    connection: 'The Deborah number determines whether polymer acts moldable (low De) or resists flow (high De). Process parameters control this transition.',
    howItWorks: 'Heating reduces relaxation time, making polymers flow. Rapid cooling freezes the shape. Strain rate during mold filling must stay in the regime where De allows smooth flow without elastic instabilities or weld-line defects.',
    stats: [
      { value: '200–300°C', label: 'Polymer processing temp', icon: '🌡️' },
      { value: '0.1–10s', label: 'Mold fill time range', icon: '⏱️' },
      { value: '>1000 psi', label: 'Injection pressure', icon: '📈' },
    ],
    examples: ['Injection molding', 'Blow molding', 'Extrusion', '3D printing with FDM'],
    companies: ['BASF', 'DuPont', 'Arburg', 'Engel'],
    futureImpact: 'AI-controlled processing will optimize cycle times while eliminating defects through real-time De monitoring.',
    color: '#8B5CF6',
  },
  {
    icon: '🧬',
    title: 'Biological Tissues & Biomechanics',
    short: "Nature's built-in viscoelastic protection",
    tagline: 'Your body already knows this physics',
    description: 'Tendons, muscles, cartilage, and organs are all viscoelastic materials optimized by evolution. Achilles tendon can store ~35% of energy during running — functioning as an elastic spring at fast gait frequencies (De > 1). Yet under slow sustained load (De < 1), it creeps and relaxes, preventing overload injury. Knee cartilage at 2–5 mm thick supports loads of 4–8× body weight by distributing stress through viscoelastic flow over milliseconds to seconds.',
    connection: 'Tendons absorb sudden loads (solid-like at high De) preventing tears, while allowing slow stretching during movement. This dual behavior is why slow stretching is safe but sudden jerks cause injury.',
    howItWorks: 'Collagen fibers provide elastic stiffness. Proteoglycan fluid provides viscous damping. Together they give a relaxation time of ~1–100 seconds, perfectly matched to physiological loading rates.',
    stats: [
      { value: '35%', label: 'Energy stored by Achilles tendon', icon: '⚡' },
      { value: '4–8×', label: 'Body weight on knee cartilage', icon: '⚖️' },
      { value: '1–100s', label: 'Tissue relaxation time range', icon: '⏱️' },
    ],
    examples: ['Achilles tendon spring', 'Knee cartilage damping', 'Arterial wall compliance', 'Brain tissue mechanics'],
    companies: ['Stryker', 'Zimmer Biomet', 'Össur', 'DJO Global'],
    futureImpact: 'Viscoelastic hydrogel implants that mimic tissue mechanics will replace damaged cartilage and tendons with no rejection risk.',
    color: '#F59E0B',
  },
];

const testQuestions = [
  {
    scenario: 'You throw a ball of silly putty at a wall at high speed. The impact lasts about 5 milliseconds.',
    question: 'The putty bounces back. What does this tell you about the Deborah number during impact?',
    options: [
      { text: 'De >> 1: relaxation time >> observation time → solid-like elastic response', correct: true },
      { text: 'De << 1: relaxation time << observation time → fluid-like viscous response', correct: false },
      { text: 'De = 0: the material has no relaxation time', correct: false },
      { text: 'De is irrelevant; putty always bounces', correct: false },
    ],
  },
  {
    scenario: 'The same ball of silly putty is left on a flat table at room temperature. After 10 minutes, it has spread into a flat disk.',
    question: 'This flowing behavior corresponds to:',
    options: [
      { text: 'De >> 1 — the material acts elastic because the observation time is short', correct: false },
      { text: 'De << 1 — the relaxation time is much shorter than the observation time (minutes)', correct: true },
      { text: 'De = 1 — transitional behavior exactly balanced', correct: false },
      { text: 'High temperature melted the putty completely', correct: false },
    ],
  },
  {
    scenario: 'An engineer is designing running shoe foam. She needs the foam to absorb impact during heel strike (~10ms) but return energy during push-off (~100ms).',
    question: 'What relaxation time should she target for the foam?',
    options: [
      { text: 'About 10–50ms, so De > 1 during impact and De ~ 1 during push-off', correct: true },
      { text: 'About 1 second, so De << 1 always → pure viscous', correct: false },
      { text: 'About 0.001ms, so De >> 1 always → pure elastic', correct: false },
      { text: 'Relaxation time does not affect shoe performance', correct: false },
    ],
  },
  {
    scenario: 'A polymer is processed by injection molding. The engineer slows the injection speed down too much. The polymer starts to hesitate at the mold entrance.',
    question: 'Which rheological effect is most likely causing this problem?',
    options: [
      { text: 'The slow rate increases De, so the polymer acts solid-like and resists flow', correct: false },
      { text: 'The slow rate decreases De, but the polymer cools and solidifies before filling', correct: true },
      { text: 'The polymer\'s Deborah number is not affected by injection speed', correct: false },
      { text: 'Higher viscosity at slow rates makes the fluid too thin to fill the mold', correct: false },
    ],
  },
  {
    scenario: 'You cool a piece of silly putty in a freezer to -10°C. Now you try to stretch it quickly.',
    question: 'What happens and why?',
    options: [
      { text: 'It stretches more easily — cold reduces viscosity', correct: false },
      { text: 'It shatters — cold extends relaxation time so De is very high, giving brittle elastic behavior', correct: true },
      { text: 'It flows faster — cold increases thermal energy', correct: false },
      { text: 'It behaves identically — temperature has no effect on viscoelasticity', correct: false },
    ],
  },
  {
    scenario: 'The Maxwell model represents a viscoelastic material. Under a sudden constant strain, you observe that the stress decreases over time.',
    question: 'This "stress relaxation" occurs because:',
    options: [
      { text: 'The spring stores energy that slowly leaks into the dashpot, reducing elastic stress', correct: true },
      { text: 'The dashpot generates additional stress that opposes the spring', correct: false },
      { text: 'The material gains mass from the environment over time', correct: false },
      { text: 'The spring constant increases as deformation continues', correct: false },
    ],
  },
  {
    scenario: 'A biomedical engineer is designing a hydrogel cartilage replacement. Normal knee cartilage has a relaxation time of about 10 seconds and handles loads up to 8× body weight.',
    question: 'The hydrogel should be designed with:',
    options: [
      { text: 'Very short relaxation time (0.001s) for purely elastic behavior', correct: false },
      { text: 'Very long relaxation time (1000s) for purely viscous behavior', correct: false },
      { text: 'Relaxation time ~10s to match cartilage for both elastic energy storage and viscous dissipation', correct: true },
      { text: 'Relaxation time matched to temperature, not to loading rate', correct: false },
    ],
  },
  {
    scenario: 'A car suspension engineer notices that passengers feel both sharp jolts over potholes AND a bouncy, oscillating ride on highway expansion joints.',
    question: 'Which viscoelastic property would best fix BOTH problems simultaneously?',
    options: [
      { text: 'Pure elastic spring — stores energy from both fast and slow inputs equally', correct: false },
      { text: 'Pure dashpot damper — absorbs all energy regardless of frequency', correct: false },
      { text: 'Viscoelastic damper with tuned relaxation time — high De (stiff) for fast jolts, low De (compliant) for slow oscillations', correct: true },
      { text: 'Increasing the car mass — more inertia reduces felt acceleration', correct: false },
    ],
  },
  {
    scenario: 'The Deborah number is named after a biblical prophetess who said "the mountains flowed before the Lord."',
    question: 'The point of this metaphor in materials science is:',
    options: [
      { text: 'Mountains are made of liquid rock at their core', correct: false },
      { text: 'Given a long enough observation time, even "solid" mountains flow — De depends on timescale', correct: true },
      { text: 'Biblical materials behave differently from modern materials', correct: false },
      { text: 'The Deborah number only applies to geological materials', correct: false },
    ],
  },
  {
    scenario: 'A quality control test measures how long it takes for a polymer component to recover its original shape after being compressed by 50% and then released.',
    question: 'This "creep recovery" test primarily measures:',
    options: [
      { text: 'The elastic modulus only — how stiff the material is', correct: false },
      { text: 'The viscosity only — how fast it flows under load', correct: false },
      { text: 'Both the elastic energy storage and viscous energy dissipation — the full viscoelastic character', correct: true },
      { text: 'The glass transition temperature of the polymer', correct: false },
    ],
  },
];

const ViscoelasticityRenderer: React.FC<ViscoelasticityRendererProps> = ({
  phase: propPhase,
  gamePhase: propGamePhase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
  onGameEvent,
}) => {
  const initialPhase = (): Phase => {
    const p = propPhase || propGamePhase;
    return (validPhases.includes(p as Phase) ? p : 'hook') as Phase;
  };

  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [strainRate, setStrainRate] = useState(50);
  const [temperature, setTemperature] = useState(30);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferIndex, setTransferIndex] = useState(0);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQ, setCurrentTestQ] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const isNavigating = useRef(false);

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    if (onGameEvent) onGameEvent({ eventType: 'phase_changed', details: { phase: p }, timestamp: Date.now() });
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent]);

  const nextPhase = useCallback(() => {
    const idx = validPhases.indexOf(phase);
    if (idx < validPhases.length - 1) {
      goToPhase(validPhases[idx + 1]);
    }
    if (onPhaseComplete) onPhaseComplete();
  }, [phase, goToPhase, onPhaseComplete]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const phaseIndex = validPhases.indexOf(phase);

  // Physics calculations
  const relaxationTime = () => {
    const baseRelax = 2.0;
    const tempFactor = Math.exp(-temperature / 30);
    return baseRelax * tempFactor;
  };

  const deborahNumber = () => {
    const observationTime = 10 / (strainRate + 1);
    return relaxationTime() / observationTime;
  };

  const De = deborahNumber();

  // Slider style
  const sliderStyle = (value: number, min: number, max: number): React.CSSProperties => ({
    width: '100%',
    height: '20px',
    borderRadius: '4px',
    cursor: 'pointer',
    touchAction: 'pan-y' as const,
    WebkitAppearance: 'none' as const,
    accentColor: '#3b82f6',
  });

  // Nav dots
  const renderNavDots = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px 0' }}>
      {validPhases.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          data-navigation-dot="true"
          aria-label={phaseLabels[p]}
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: phaseIndex >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            padding: 0,
          }}
        />
      ))}
    </div>
  );

  // Progress bar
  const renderProgressBar = () => (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '4px', background: 'rgba(255,255,255,0.1)', zIndex: 1002 }}>
      <div style={{
        height: '100%',
        width: `${((phaseIndex + 1) / validPhases.length) * 100}%`,
        background: colors.accent,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Nav bar
  const renderNavBar = (canProceed: boolean, buttonText = 'Next') => (
    <nav
      aria-label="Game navigation"
      style={{
        position: 'fixed',
        top: 4,
        left: 0,
        right: 0,
        padding: '10px 24px',
        background: colors.bgDark,
        borderBottom: `1px solid rgba(255,255,255,0.1)`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1001,
      }}
    >
      <button
        onClick={() => { if (phaseIndex > 0) goToPhase(validPhases[phaseIndex - 1]); }}
        disabled={phaseIndex === 0}
        aria-label="Back"
        style={{
          padding: '10px 22px',
          minHeight: '44px',
          borderRadius: '8px',
          border: `1px solid ${colors.textMuted}`,
          background: 'transparent',
          color: phaseIndex > 0 ? colors.textPrimary : colors.textMuted,
          fontWeight: 'bold',
          cursor: phaseIndex > 0 ? 'pointer' : 'not-allowed',
          fontSize: '14px',
          opacity: phaseIndex > 0 ? 1 : 0.4,
        }}
      >
        Back
      </button>
      <span style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 600 }}>
        {phaseIndex + 1}/{validPhases.length}
      </span>
      <button
        onClick={nextPhase}
        disabled={!canProceed}
        aria-label="Next"
        style={{
          padding: '10px 22px',
          minHeight: '44px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)' : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '14px',
        }}
      >
        {buttonText}
      </button>
    </nav>
  );

  // Bottom bar
  const renderBottomBar = (showBack: boolean, canProceed: boolean, buttonText: string) => (
    <nav
      aria-label="Game navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '12px 24px',
        background: colors.bgDark,
        borderTop: `1px solid rgba(255,255,255,0.1)`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1001,
      }}
    >
      {showBack ? (
        <button
          onClick={() => { if (phaseIndex > 0) goToPhase(validPhases[phaseIndex - 1]); }}
          aria-label="Back"
          style={{
            padding: '10px 22px', minHeight: '44px', borderRadius: '8px',
            border: `1px solid ${colors.textMuted}`, background: 'transparent',
            color: colors.textPrimary, fontWeight: 'bold', cursor: 'pointer', fontSize: '14px',
          }}
        >Back</button>
      ) : <div />}
      <button
        onClick={nextPhase}
        disabled={!canProceed}
        aria-label="Next"
        style={{
          padding: '10px 22px', minHeight: '44px', borderRadius: '8px',
          border: 'none',
          background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold', cursor: canProceed ? 'pointer' : 'not-allowed', fontSize: '14px',
        }}
      >
        {buttonText}
      </button>
    </nav>
  );

  // ======= SVG VISUALIZATION =======
  const renderVisualization = () => {
    const W = 700;
    const H = 400;
    // Normalize De for visualization
    const deNorm = Math.min(De / 5, 1); // 0=fluid, 1=solid
    const blobColor = deNorm > 0.5 ? '#6366f1' : '#f97316';
    const blobRx = 80 + (deNorm > 0.5 ? 20 : -20) + (strainRate - 50) * 0.4;
    const blobRy = 50 - (deNorm > 0.5 ? 5 : -5) - Math.abs(strainRate - 50) * 0.2;

    // Stress-strain curve: use large vertical range
    // Y-axis: 280 (bottom) to 60 (top), X-axis: 60 to 620
    const graphLeft = 60, graphRight = 620, graphTop = 60, graphBottom = 280;
    const graphW = graphRight - graphLeft;
    const graphH = graphBottom - graphTop;

    // Draw stress-strain curve with good vertical utilization
    // For viscoelastic material: slope depends on De
    const slope = 0.3 + deNorm * 0.7; // 0.3 (viscous) to 1.0 (elastic)
    const curvePoints: string[] = [];
    for (let i = 0; i <= 20; i++) {
      const strain = i / 20; // 0 to 1
      // Viscoelastic stress: nonlinear combination
      const stress = slope * strain + (1 - slope) * strain * strain * 0.5 + Math.sin(strain * Math.PI * 2) * 0.05 * (1 - deNorm);
      const clampedStress = Math.max(0, Math.min(1, stress));
      const x = graphLeft + strain * graphW;
      const y = graphBottom - clampedStress * graphH;
      curvePoints.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }

    // Reference: pure elastic (linear, max utilization)
    const elasticPoints = [
      `M ${graphLeft} ${graphBottom}`,
      `L ${graphRight} ${graphTop}`
    ].join(' ');
    // Reference: pure viscous (lower slope)
    const viscousEndY = graphBottom - 0.3 * graphH;
    const viscousPoints = [
      `M ${graphLeft} ${graphBottom}`,
      `L ${graphRight} ${viscousEndY.toFixed(1)}`
    ].join(' ');

    // Grid lines
    const gridHLines = [0.25, 0.5, 0.75, 1.0].map(f => ({
      y: graphBottom - f * graphH,
      label: (f * 100).toFixed(0),
    }));
    const gridVLines = [0.25, 0.5, 0.75, 1.0].map(f => ({
      x: graphLeft + f * graphW,
      label: (f * 100).toFixed(0),
    }));

    // Interactive point on curve (moves with sliders)
    const interactStrain = 0.6;
    const interactStress = slope * interactStrain + (1 - slope) * interactStrain * interactStrain * 0.5;
    const interactX = graphLeft + interactStrain * graphW;
    const interactY = graphBottom - Math.min(1, interactStress) * graphH;

    // Reference/baseline: elastic point at same strain
    const baselineY = graphBottom - interactStrain * graphH;

    return (
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ maxWidth: '720px', display: 'block' }}
      >
        <defs>
          <linearGradient id="viscBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="viscCurve" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={blobColor} />
            <stop offset="100%" stopColor={deNorm > 0.5 ? '#a855f7' : '#fb923c'} />
          </linearGradient>
          <filter id="viscGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width={W} height={H} fill="url(#viscBg)" />

        {/* Graph background */}
        <rect x={graphLeft} y={graphTop} width={graphW} height={graphH} fill="rgba(0,0,0,0.3)" rx="4" />

        {/* Grid lines */}
        {gridHLines.map((g, i) => (
          <g key={`h${i}`}>
            <line x1={graphLeft} y1={g.y} x2={graphRight} y2={g.y}
              stroke="rgba(148,163,184,0.3)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
            <text x={graphLeft - 8} y={g.y + 4} fill="rgba(148,163,184,0.7)" fontSize="11"
              textAnchor="end">{g.label}</text>
          </g>
        ))}
        {gridVLines.map((g, i) => (
          <g key={`v${i}`}>
            <line x1={g.x} y1={graphTop} x2={g.x} y2={graphBottom}
              stroke="rgba(148,163,184,0.3)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
            <text x={g.x} y={graphBottom + 16} fill="rgba(148,163,184,0.7)" fontSize="11"
              textAnchor="middle">{g.label}</text>
          </g>
        ))}

        {/* Axes */}
        <line x1={graphLeft} y1={graphBottom} x2={graphRight} y2={graphBottom} stroke="#94a3b8" strokeWidth="2" />
        <line x1={graphLeft} y1={graphTop} x2={graphLeft} y2={graphBottom} stroke="#94a3b8" strokeWidth="2" />

        {/* Axis labels */}
        <text x={graphLeft + graphW / 2} y={H - 8} fill="#94a3b8" fontSize="13" textAnchor="middle" fontWeight="bold">
          STRAIN RATE (%)
        </text>
        <text x={8} y={graphTop + graphH / 2} fill="#94a3b8" fontSize="13" textAnchor="middle" fontWeight="bold"
          transform={`rotate(-90, 8, ${graphTop + graphH / 2})`}>
          STRESS
        </text>

        {/* Graph title */}
        <text x={graphLeft + graphW / 2} y={graphTop - 10} fill="#e2e8f0" fontSize="13" textAnchor="middle" fontWeight="bold">
          STRESS-STRAIN CURVE
        </text>

        {/* Reference: pure elastic */}
        <path d={elasticPoints} stroke="#6366f1" strokeWidth="2" fill="none" strokeDasharray="8 4" opacity="0.5" />

        {/* Reference: pure viscous */}
        <path d={viscousPoints} stroke="#f97316" strokeWidth="2" fill="none" strokeDasharray="8 4" opacity="0.5" />

        {/* Actual viscoelastic curve */}
        <path d={curvePoints.join(' ')} stroke="url(#viscCurve)" strokeWidth="3" fill="none" filter="url(#viscGlow)" />

        {/* Reference baseline marker (elastic at same strain) */}
        <circle cx={interactX} cy={baselineY} r="6" fill="#6366f1" opacity="0.6" />

        {/* Interactive point */}
        <circle cx={interactX} cy={interactY} r="10" fill={blobColor} stroke="white" strokeWidth="2"
          filter="url(#viscGlow)" />

        {/* Legend — spaced to avoid overlaps */}
        <rect x={graphLeft + 10} y={graphTop + 5} width="145" height="60" rx="4"
          fill="rgba(15,23,42,0.85)" stroke="#334155" strokeWidth="1" />
        <line x1={graphLeft + 20} y1={graphTop + 20} x2={graphLeft + 40} y2={graphTop + 20}
          stroke={blobColor} strokeWidth="3" />
        <text x={graphLeft + 48} y={graphTop + 24} fill="#e2e8f0" fontSize="11">Viscoelastic</text>

        <line x1={graphLeft + 20} y1={graphTop + 37} x2={graphLeft + 40} y2={graphTop + 37}
          stroke="#6366f1" strokeWidth="2" strokeDasharray="4 2" />
        <text x={graphLeft + 48} y={graphTop + 41} fill="rgba(148,163,184,0.7)" fontSize="11">Pure Elastic</text>

        <line x1={graphLeft + 20} y1={graphTop + 54} x2={graphLeft + 40} y2={graphTop + 54}
          stroke="#f97316" strokeWidth="2" strokeDasharray="4 2" />
        <text x={graphLeft + 48} y={graphTop + 58} fill="rgba(148,163,184,0.7)" fontSize="11">Pure Viscous</text>

        {/* De value panel — bottom right, separate from legend */}
        <rect x={graphRight - 160} y={graphTop + 5} width="155" height="50" rx="6"
          fill="rgba(15,23,42,0.85)" stroke="#334155" strokeWidth="1" />
        <text x={graphRight - 83} y={graphTop + 22} fill="rgba(148,163,184,0.7)" fontSize="12"
          textAnchor="middle" fontWeight="bold">DEBORAH NUMBER</text>
        <text x={graphRight - 83} y={graphTop + 45} fill={De > 1 ? '#818cf8' : '#fb923c'}
          fontSize="17" textAnchor="middle" fontWeight="bold">
          De = {De.toFixed(2)}
        </text>

        {/* Behavior label — centered below graph */}
        <rect x={graphLeft + graphW / 2 - 90} y={graphBottom + 25} width="180" height="32" rx="14"
          fill={De > 1.5 ? 'rgba(99,102,241,0.3)' : De < 0.5 ? 'rgba(249,115,22,0.3)' : 'rgba(234,179,8,0.2)'}
          stroke={De > 1.5 ? '#6366f1' : De < 0.5 ? '#f97316' : '#eab308'} strokeWidth="1.5" />
        <text x={graphLeft + graphW / 2} y={graphBottom + 46} fill={De > 1.5 ? '#a5b4fc' : De < 0.5 ? '#fed7aa' : '#fef08a'}
          fontSize="13" textAnchor="middle" fontWeight="bold">
          {De > 1.5 ? 'SOLID-LIKE (Elastic)' : De < 0.5 ? 'FLUID-LIKE (Viscous)' : 'TRANSITIONAL'}
        </text>

        {/* Material blob — right side */}
        <g transform={`translate(${W - 130}, 190)`}>
          <text x="0" y="-20" fill="rgba(148,163,184,0.7)" fontSize="12" textAnchor="middle">MATERIAL</text>
          <ellipse cx="0" cy="0" rx={Math.max(30, Math.min(80, 50 + (De - 1) * 15))} ry={Math.max(20, Math.min(55, 35 - (De - 1) * 5))}
            fill={blobColor} opacity="0.8" filter="url(#viscGlow)" />
          {/* Polymer chains */}
          {[-10, 0, 10].map((dy, k) => (
            <path key={k} d={`M -35 ${dy} Q 0 ${dy + (De > 1 ? 4 : 12)} 35 ${dy}`}
              stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none" />
          ))}
        </g>

        {/* Temperature bar — top right */}
        <g transform={`translate(${W - 40}, ${graphTop})`}>
          <text x="0" y="-5" fill="rgba(148,163,184,0.7)" fontSize="11" textAnchor="middle">TEMP</text>
          <rect x="-8" y="0" width="16" height="100" rx="8" fill="#1e293b" />
          <rect x="-8" y={100 - temperature} width="16" height={temperature} rx="8" fill="#ef4444" opacity="0.8" />
          <text x="0" y="118" fill="rgba(148,163,184,0.7)" fontSize="11" textAnchor="middle">{temperature}%</text>
        </g>
      </svg>
    );
  };

  // ======= CONTROLS =======
  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '6px', fontWeight: 600 }}>
          Strain Rate: <strong style={{ color: colors.textPrimary }}>
            {strainRate < 30 ? 'SLOW — polymer chains flow' : strainRate > 70 ? 'FAST — chains stretch elastically' : 'MEDIUM'} ({strainRate}%)
          </strong>
        </label>
        <input
          type="range" min="5" max="100" step="5" value={strainRate}
          onChange={e => setStrainRate(parseInt(e.target.value))}
          style={sliderStyle(strainRate, 5, 100)}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
          <span>Slow (5 — flows)</span>
          <span>Fast (100 — bounces)</span>
        </div>
      </div>
    </div>
  );

  const renderTwistControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '6px', fontWeight: 600 }}>
          Strain Rate: <strong style={{ color: colors.textPrimary }}>{strainRate}%</strong>
        </label>
        <input
          type="range" min="5" max="100" step="5" value={strainRate}
          onChange={e => setStrainRate(parseInt(e.target.value))}
          style={sliderStyle(strainRate, 5, 100)}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
          <span>Slow</span><span>Fast</span>
        </div>
      </div>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '6px', fontWeight: 600 }}>
          Temperature: <strong style={{ color: colors.textPrimary }}>
            {temperature < 30 ? 'COLD — longer relaxation time' : temperature > 70 ? 'WARM — shorter relaxation time' : 'ROOM TEMP'} ({temperature}%)
          </strong>
        </label>
        <input
          type="range" min="0" max="100" step="5" value={temperature}
          onChange={e => setTemperature(parseInt(e.target.value))}
          style={sliderStyle(temperature, 0, 100)}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
          <span>Cold 0°C (brittle)</span>
          <span>Hot 100°C (flows)</span>
        </div>
      </div>
      <div style={{ background: 'rgba(139,92,246,0.2)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.accent}` }}>
        <div style={{ color: colors.textSecondary, fontSize: '13px' }}>
          De = {De.toFixed(2)} | Relaxation time: {relaxationTime().toFixed(2)}s
        </div>
        <div style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
          De &gt; 1: Solid-like (elastic) | De &lt; 1: Fluid-like (viscous)
        </div>
      </div>
    </div>
  );

  // ======= PHASES =======

  // HOOK
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, paddingTop: '48px', paddingBottom: '100px', overflowY: 'auto' }}>
        {renderProgressBar()}
        {renderNavBar(true)}
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px' }}>
          {renderNavDots()}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <p style={{ color: colors.textMuted, fontSize: '13px', fontWeight: 400, marginBottom: '4px', letterSpacing: '2px', textTransform: 'uppercase' }}>
              Discover How Materials Work
            </p>
            <h1 style={{ color: colors.accent, fontSize: '32px', fontWeight: 800, marginBottom: '8px', background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Silly Putty Science
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px' }}>
              Can one material act like a solid AND a liquid?
            </p>
          </div>
          {renderVisualization()}
          <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginTop: '16px' }}>
            <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.7, marginBottom: '12px' }}>
              🪀 <strong>Throw</strong> silly putty at the wall — it <strong>bounces</strong> like a rubber ball.
              Leave it on a table for 10 minutes — it slowly <strong>flows</strong> into a puddle.
              Same material. Completely opposite behaviors. How?
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              ⚗️ This is <strong>viscoelasticity</strong>: the material "remembers" it is both solid and liquid.
              Adjust the strain rate slider above to see how fast deformation shifts the behavior from fluid-like to solid-like.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // PREDICT
  if (phase === 'predict') {
    const predictions = [
      { id: 'always_solid', label: '🪨 It always acts like a solid — bounces and holds shape, regardless of speed' },
      { id: 'always_liquid', label: '💧 It always acts like a liquid — flows and drips at any speed' },
      { id: 'rate_depends', label: '⚡ Fast deformation → solid-like (bounces); Slow deformation → liquid-like (flows)' },
      { id: 'random', label: '🎲 It behaves randomly — you cannot predict which behavior you will see' },
    ];
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, paddingTop: '48px', paddingBottom: '100px', overflowY: 'auto' }}>
        {renderProgressBar()}
        <div aria-label="prediction observation" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
          Observe what happens to viscoelastic materials. What do you predict will happen?
        </div>
        {renderNavBar(!!prediction)}
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px' }}>
          {renderNavDots()}
          {renderVisualization()}
          <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', margin: '16px 0' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>What to Observe:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              A blob of viscoelastic polymer being deformed. The curve shows stress vs strain.
              Observe how the wavy lines (polymer chains) respond. Use the slider to change the deformation rate.
              What happens to the behavior?
            </p>
          </div>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 700 }}>
            What determines whether silly putty bounces or flows?
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {predictions.map(p => (
              <button key={p.id} onClick={() => setPrediction(p.id)} style={{
                padding: '14px 16px', minHeight: '44px', borderRadius: '8px',
                border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                background: prediction === p.id ? 'rgba(139,92,246,0.2)' : 'transparent',
                color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px',
              }}>{p.label}</button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // PLAY
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}
        {renderNavBar(true)}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '56px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px' }}>
          {renderNavDots()}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
              Explore Viscoelasticity
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust strain rate to shift between solid-like and liquid-like behavior
            </p>
          </div>
          <div style={{ background: 'rgba(139,92,246,0.15)', padding: '12px 16px', borderRadius: '8px', borderLeft: `3px solid ${colors.accent}`, marginBottom: '16px' }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
              <strong style={{ color: colors.textPrimary }}>Why this matters:</strong> Understanding viscoelasticity
              drives a $50B+ industry — from Nike shoe foam (85% energy return) to car suspension (40% NVH reduction),
              to medical implants, to polymer manufacturing. Every rubber, foam, gel, and biopolymer you encounter
              obeys these principles. Engineers who understand the Deborah number can design materials that are
              simultaneously protective at high rates and compliant at low rates.
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

              {renderVisualization()}

            </div>

            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>

              {renderControls()}

            </div>

          </div>
          <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', marginTop: '16px' }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: 700 }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.9, paddingLeft: '20px', margin: 0 }}>
              <li>⬆️ Push strain rate to 100% — De rises above 1 → solid-like response</li>
              <li>⬇️ Pull strain rate to 5% — De drops below 1 → fluid-like viscous flow</li>
              <li>📈 Watch the stress-strain curve change slope and shape</li>
              <li>🔵 See the interactive dot move relative to the elastic reference baseline</li>
            </ul>
          </div>
        </div>
        </div>
      </div>
    );
  }

  // REVIEW
  if (phase === 'review') {
    const wasCorrect = prediction === 'rate_depends';
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, paddingTop: '48px', paddingBottom: '100px', overflowY: 'auto' }}>
        {renderProgressBar()}
        {renderNavBar(true)}
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px' }}>
          {renderNavDots()}
          <div style={{
            background: wasCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
            padding: '20px', borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`, marginBottom: '16px',
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? '✅ Correct!' : '❌ Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary, fontSize: '15px' }}>
              <strong>Deformation rate</strong> determines behavior: fast = solid-like (elastic), slow = fluid-like (viscous).
              This is because the <em>Deborah number</em> De = relaxation time / observation time changes when the rate changes.
            </p>
          </div>
          {renderVisualization()}
          <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginTop: '16px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>Why Viscoelasticity Behaves This Way</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8 }}>
              <p style={{ marginBottom: '10px' }}>
                🔢 <strong style={{ color: colors.textPrimary }}>Deborah Number:</strong> De = relaxation time / observation time.
                Named after the biblical prophetess who said "the mountains flowed before the Lord" —
                given enough time (long observation), even mountains flow!
              </p>
              <p style={{ marginBottom: '10px' }}>
                ⚡ <strong style={{ color: colors.textPrimary }}>High De (fast deformation):</strong> Polymer chains
                cannot rearrange. Energy stores elastically → the material bounces back.
              </p>
              <p style={{ marginBottom: '10px' }}>
                💧 <strong style={{ color: colors.textPrimary }}>Low De (slow deformation):</strong> Chains have time
                to slide past each other. Energy dissipates as heat → the material flows.
              </p>
              <p>
                🔧 <strong style={{ color: colors.textPrimary }}>Maxwell Model:</strong> Spring (elastic E) + dashpot
                (viscous η) in series. Spring stores energy instantly; dashpot dissipates it over time τ = η/E.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TWIST PREDICT
  if (phase === 'twist_predict') {
    const twistPredictions = [
      { id: 'no_change', label: '🤷 Temperature has no effect on viscoelastic behavior' },
      { id: 'cold_flows', label: '🌊 Cold makes it flow more; warm makes it stiffer' },
      { id: 'cold_brittle', label: '❄️ Cold makes it more solid/brittle; warm makes it flow more easily' },
      { id: 'melts', label: '🔥 It melts completely when warm and stays solid when cold' },
    ];
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, paddingTop: '48px', paddingBottom: '100px', overflowY: 'auto' }}>
        {renderProgressBar()}
        {renderNavBar(!!twistPrediction)}
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px' }}>
          {renderNavDots()}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: colors.warning, fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>🌡️ The Twist</h2>
            <p style={{ color: colors.textSecondary }}>What if we change the temperature?</p>
          </div>
          {renderVisualization()}
          <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', margin: '16px 0' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Two identical pieces of silly putty. One is cooled to <strong>−10°C</strong> in the freezer.
              The other is warmed to <strong>40°C</strong> in your hand. Now you stretch both at the <em>exact same strain rate</em>.
              What do you predict will happen to each one?
            </p>
          </div>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 700 }}>
            How does temperature change the material's behavior?
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {twistPredictions.map(p => (
              <button key={p.id} onClick={() => setTwistPrediction(p.id)} style={{
                padding: '14px 16px', minHeight: '44px', borderRadius: '8px',
                border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                background: twistPrediction === p.id ? 'rgba(245,158,11,0.2)' : 'transparent',
                color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px',
              }}>{p.label}</button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // TWIST PLAY
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, paddingTop: '48px', paddingBottom: '100px', overflowY: 'auto' }}>
        {renderProgressBar()}
        {renderNavBar(true)}
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px' }}>
          {renderNavDots()}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: colors.warning, fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
              🌡️ Test Temperature Effects
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust both strain rate AND temperature — observe how De changes
            </p>
          </div>
          <div style={{ background: 'rgba(245,158,11,0.15)', padding: '12px 16px', borderRadius: '8px', borderLeft: `3px solid ${colors.warning}`, marginBottom: '16px' }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
              <strong style={{ color: colors.textPrimary }}>Key insight:</strong> Adjust the temperature slider
              independently and watch the De value change — even at the same strain rate. Cold → longer relaxation
              time → higher De → more solid-like behavior. Warm → shorter relaxation time → lower De → more fluid.
            </p>
          </div>
          {renderVisualization()}
          {renderTwistControls()}
        </div>
      </div>
    );
  }

  // TWIST REVIEW
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'cold_brittle';
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, paddingTop: '48px', paddingBottom: '100px', overflowY: 'auto' }}>
        {renderProgressBar()}
        {renderNavBar(true)}
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px' }}>
          {renderNavDots()}
          <div style={{
            background: wasCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
            padding: '20px', borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`, marginBottom: '16px',
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? '✅ Correct!' : '❌ Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary, fontSize: '15px' }}>
              Cold ❄️ extends relaxation time → higher De → <strong>stiffer and more brittle</strong>.
              Warm 🔥 shrinks relaxation time → lower De → <strong>flows more easily</strong>.
            </p>
          </div>
          <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px', fontWeight: 700 }}>Temperature–Relaxation Connection</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8 }}>
              <p style={{ marginBottom: '10px' }}>
                ❄️ <strong style={{ color: colors.textPrimary }}>Cold Materials:</strong> Polymer chains move sluggishly.
                Relaxation time τ increases exponentially (Arrhenius: τ ∝ exp(Ea/RT)).
                Even moderate strain rates give high De → glassy, brittle behavior. Cold silly putty shatters.
              </p>
              <p style={{ marginBottom: '10px' }}>
                🔥 <strong style={{ color: colors.textPrimary }}>Warm Materials:</strong> Chains have thermal energy to
                slide past each other quickly. τ decreases → De falls → smooth viscous flow at same strain rate.
              </p>
              <p>
                🌡️ <strong style={{ color: colors.textPrimary }}>Glass Transition (Tg):</strong> Below Tg, many polymers
                freeze into a glassy state — nearly pure elastic and brittle. This is why rubber bands snap when frozen.
                Tg for common polymers ranges from −100°C (silicone) to +100°C (polycarbonate).
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TRANSFER
  if (phase === 'transfer') {
    const currentApp = realWorldApps[transferIndex];
    const isCompleted = transferCompleted.has(transferIndex);
    const allCompleted = transferCompleted.size >= realWorldApps.length;

    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, paddingTop: '48px', paddingBottom: '100px', overflowY: 'auto' }}>
        {renderProgressBar()}
        {renderNavBar(allCompleted)}
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px' }}>
          {renderNavDots()}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Viscoelasticity is a $50B+ engineering challenge — Application {transferIndex + 1} of {realWorldApps.length}
            </p>
          </div>

          {/* Progress dots for transfer */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
            {realWorldApps.map((_, i) => (
              <button key={i} onClick={() => setTransferIndex(i)} aria-label={`Application ${i + 1}`} style={{
                width: '12px', height: '12px', borderRadius: '50%', border: 'none',
                background: transferCompleted.has(i) ? colors.success : i === transferIndex ? colors.accent : 'rgba(255,255,255,0.2)',
                cursor: 'pointer',
              }} />
            ))}
          </div>

          <div style={{
            background: colors.bgCard, padding: '20px', borderRadius: '12px',
            border: isCompleted ? `2px solid ${colors.success}` : `1px solid rgba(255,255,255,0.1)`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '32px' }}>{currentApp.icon}</span>
              <div>
                <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700 }}>{currentApp.title}</h3>
                <p style={{ color: currentApp.color, fontSize: '13px', fontWeight: 600 }}>{currentApp.tagline}</p>
              </div>
              {isCompleted && <span style={{ marginLeft: 'auto', color: colors.success, fontWeight: 'bold' }}>✅ Done</span>}
            </div>

            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, marginBottom: '16px' }}>
              {currentApp.description}
            </p>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {currentApp.stats.map((s, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '8px', textAlign: 'center', flex: 1 }}>
                  <div style={{ color: currentApp.color, fontSize: '18px', fontWeight: 800 }}>{s.icon} {s.value}</div>
                  <div style={{ color: colors.textMuted, fontSize: '11px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Companies */}
            <div style={{ marginBottom: '16px' }}>
              <span style={{ color: colors.textMuted, fontSize: '12px' }}>Companies: </span>
              {currentApp.companies.map((c, i) => (
                <span key={i} style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: 600, marginRight: '8px' }}>{c}</span>
              ))}
            </div>

            <div style={{ background: 'rgba(139,92,246,0.1)', padding: '14px', borderRadius: '8px', marginBottom: '16px' }}>
              <p style={{ color: colors.accent, fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>{currentApp.connection}</p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>{currentApp.howItWorks}</p>
            </div>

            {!isCompleted ? (
              <button onClick={() => setTransferCompleted(new Set([...transferCompleted, transferIndex]))} style={{
                padding: '12px 24px', minHeight: '44px', borderRadius: '8px',
                border: `1px solid ${colors.accent}`, background: 'transparent',
                color: colors.accent, cursor: 'pointer', fontSize: '14px', fontWeight: 700,
              }}>Got It — Mark Complete</button>
            ) : (
              <>
                <div style={{ background: 'rgba(16,185,129,0.1)', padding: '14px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '12px' }}>
                  <p style={{ color: colors.textPrimary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                    🚀 <strong>Future:</strong> {currentApp.futureImpact}
                  </p>
                </div>
                {transferIndex < realWorldApps.length - 1 ? (
                  <button onClick={() => setTransferIndex(transferIndex + 1)} style={{
                    padding: '12px 24px', minHeight: '44px', borderRadius: '8px',
                    border: 'none', background: colors.accent, color: 'white',
                    cursor: 'pointer', fontSize: '14px', fontWeight: 700,
                  }}>Next Application →</button>
                ) : (
                  <button onClick={nextPhase} style={{
                    padding: '12px 24px', minHeight: '44px', borderRadius: '8px',
                    border: 'none', background: colors.success, color: 'white',
                    cursor: 'pointer', fontSize: '14px', fontWeight: 700,
                  }}>Take the Test →</button>
                )}
              </>
            )}
          </div>

          <p style={{ color: colors.textMuted, fontSize: '13px', textAlign: 'center', marginTop: '12px' }}>
            {transferCompleted.size} of {realWorldApps.length} applications completed
          </p>
        </div>
      </div>
    );
  }

  // TEST
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100vh', background: colors.bgPrimary, paddingTop: '48px', paddingBottom: '100px', overflowY: 'auto' }}>
          {renderProgressBar()}
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery →' : 'Review & Retry')}
          <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px' }}>
            {renderNavDots()}
            <div style={{
              background: testScore >= 8 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
              padding: '24px', borderRadius: '12px', textAlign: 'center', marginBottom: '16px',
            }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px', fontSize: '24px' }}>
                {testScore >= 8 ? '🎉 Excellent Work!' : '📚 Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '28px', fontWeight: 800 }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px', fontSize: '15px' }}>
                {testScore >= 8 ? "You've mastered viscoelastic material behavior!" : 'Review the material and try again.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
              <button onClick={() => { setTestAnswers(new Array(10).fill(null)); setTestSubmitted(false); setCurrentTestQ(0); setTestScore(0); }} style={{
                padding: '12px 24px', minHeight: '44px', borderRadius: '8px',
                border: `1px solid ${colors.accent}`, background: 'transparent',
                color: colors.accent, cursor: 'pointer', fontSize: '14px', fontWeight: 700,
              }}>🔄 Retry Quiz</button>
              <button onClick={() => goToPhase('hook')} style={{
                padding: '12px 24px', minHeight: '44px', borderRadius: '8px',
                border: `1px solid ${colors.textMuted}`, background: 'transparent',
                color: colors.textSecondary, cursor: 'pointer', fontSize: '14px', fontWeight: 700,
              }}>🏠 Back to Start</button>
            </div>
            {testQuestions.map((q, qi) => {
              const ua = testAnswers[qi];
              const isCorrect = ua !== null && q.options[ua].correct;
              return (
                <div key={qi} style={{
                  background: colors.bgCard, margin: '0 0 12px 0', padding: '16px', borderRadius: '12px',
                  borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
                }}>
                  <p style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '4px' }}>
                    🧪 {q.scenario}
                  </p>
                  <p style={{ color: colors.textPrimary, fontWeight: 700, marginBottom: '10px', fontSize: '14px' }}>
                    {qi + 1}. {q.question}
                  </p>
                  {q.options.map((opt, oi) => (
                    <div key={oi} style={{
                      padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', fontSize: '13px',
                      background: opt.correct ? 'rgba(16,185,129,0.2)' : ua === oi ? 'rgba(239,68,68,0.2)' : 'transparent',
                      color: opt.correct ? colors.success : ua === oi ? colors.error : colors.textMuted,
                    }}>
                      {opt.correct ? '✅ Correct: ' : ua === oi ? '❌ Your answer: ' : ''}{opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQ];
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, paddingTop: '48px', paddingBottom: '100px', overflowY: 'auto' }}>
        {renderProgressBar()}
        {renderNavBar(false, 'Submit')}
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px' }}>
          {renderNavDots()}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ color: colors.textPrimary, fontWeight: 700 }}>Knowledge Test</h2>
            <span style={{ color: colors.textSecondary, fontWeight: 700 }}>
              Question {currentTestQ + 1} of {testQuestions.length}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
            {testQuestions.map((_, i) => (
              <div key={i} onClick={() => setCurrentTestQ(i)} style={{
                flex: 1, height: '4px', borderRadius: '2px', cursor: 'pointer',
                background: testAnswers[i] !== null ? colors.accent : i === currentTestQ ? colors.textMuted : 'rgba(255,255,255,0.1)',
              }} />
            ))}
          </div>

          {/* Scenario context */}
          <div style={{ background: 'rgba(139,92,246,0.1)', padding: '14px', borderRadius: '8px', marginBottom: '12px', borderLeft: `3px solid ${colors.accent}` }}>
            <p style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>📋 SCENARIO</p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{currentQ.scenario}</p>
          </div>

          <div style={{ background: colors.bgCard, padding: '18px', borderRadius: '12px', marginBottom: '14px' }}>
            <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5, fontWeight: 600 }}>{currentQ.question}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentQ.options.map((opt, oi) => (
              <button key={oi} onClick={() => {
                const a = [...testAnswers]; a[currentTestQ] = oi; setTestAnswers(a);
              }} style={{
                padding: '14px 16px', minHeight: '44px', borderRadius: '8px',
                border: testAnswers[currentTestQ] === oi ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                background: testAnswers[currentTestQ] === oi ? 'rgba(139,92,246,0.2)' : 'transparent',
                color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px',
              }}>{opt.text}</button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
            <button onClick={() => setCurrentTestQ(Math.max(0, currentTestQ - 1))} disabled={currentTestQ === 0} style={{
              padding: '12px 24px', minHeight: '44px', borderRadius: '8px',
              border: `1px solid ${colors.textMuted}`, background: 'transparent',
              color: currentTestQ === 0 ? colors.textMuted : colors.textPrimary,
              cursor: currentTestQ === 0 ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 600,
            }}>← Previous</button>
            {currentTestQ < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQ(currentTestQ + 1)} style={{
                padding: '12px 24px', minHeight: '44px', borderRadius: '8px',
                border: 'none', background: colors.accent, color: 'white',
                cursor: 'pointer', fontSize: '14px', fontWeight: 600,
              }}>Next Question →</button>
            ) : (
              <button onClick={() => {
                let score = 0;
                testQuestions.forEach((q, i) => { if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) score++; });
                setTestScore(score);
                setTestSubmitted(true);
                if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
                else if (score < 8 && onIncorrectAnswer) onIncorrectAnswer();
              }} disabled={testAnswers.includes(null)} style={{
                padding: '12px 24px', minHeight: '44px', borderRadius: '8px',
                border: 'none',
                background: testAnswers.includes(null) ? 'rgba(255,255,255,0.1)' : colors.success,
                color: testAnswers.includes(null) ? colors.textMuted : 'white',
                cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 600,
              }}>Submit Test ✓</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MASTERY
  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, paddingTop: '48px', paddingBottom: '100px', overflowY: 'auto' }}>
        {renderProgressBar()}
        {renderBottomBar(false, true, 'Complete Game 🎉')}
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px' }}>
          {renderNavDots()}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '64px', marginBottom: '12px' }}>🏆</div>
            <h1 style={{ color: colors.success, fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
              🎉 Mastery Achieved! 🎉
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '16px' }}>
              You've mastered viscoelasticity and time-dependent material behavior!
            </p>
          </div>
          {renderVisualization()}
          <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginTop: '16px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>⭐ Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 2.0, paddingLeft: '20px', margin: 0, fontSize: '15px' }}>
              <li>🔢 <strong>Deborah Number:</strong> De = relaxation time / observation time</li>
              <li>⚡ <strong>High De (fast):</strong> solid-like elastic response → bounces</li>
              <li>💧 <strong>Low De (slow):</strong> liquid-like viscous flow → drips</li>
              <li>🌡️ <strong>Temperature:</strong> lowers relaxation time → shifts from solid to fluid</li>
              <li>🔧 <strong>Maxwell Model:</strong> spring (E) + dashpot (η) in series → stress relaxation</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139,92,246,0.2)', padding: '20px', borderRadius: '12px', marginTop: '16px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>🚀 Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              Real materials often require the <strong>Kelvin-Voigt model</strong> (parallel spring-dashpot for creep)
              or the <strong>Standard Linear Solid</strong> (both Maxwell and KV combined) for full accuracy.
              <strong>Rheology</strong>, the science of flow, uses these models to predict paint dripping,
              blood flow, earthquake wave attenuation, and 3D printing quality. The
              <strong>Time-Temperature Superposition principle</strong> lets engineers predict 100 years of creep
              behavior from just a few hours of accelerated testing — saving enormous amounts of time and money.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
            <button onClick={() => goToPhase('hook')} style={{
              padding: '14px 28px', minHeight: '44px', borderRadius: '8px',
              border: `1px solid ${colors.accent}`, background: 'transparent',
              color: colors.accent, cursor: 'pointer', fontSize: '14px', fontWeight: 700,
            }}>🔄 Play Again</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ViscoelasticityRenderer;
