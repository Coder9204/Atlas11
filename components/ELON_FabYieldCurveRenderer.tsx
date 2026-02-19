'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// ELON FAB YIELD CURVE - Complete 10-Phase Game (#18 of 36 ELON Games)
// Semiconductor yield — defect density determines good dies, key economic driver
// -----------------------------------------------------------------------------

export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
    'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
    'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
    'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected';
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface ELON_FabYieldCurveRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound utility
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
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
      complete: { freq: 900, duration: 0.4, type: 'sine' }
    };
    const sound = sounds[type];
    oscillator.frequency.value = sound.freq;
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch { /* Audio not available */ }
};

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// -----------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: "A fab produces chips on 300mm wafers. Each die is 100mm² and the defect density is 0.1 defects/cm².",
    question: "Using the Poisson yield model Y = e^(-D×A), what is the expected yield?",
    options: [
      { id: 'a', label: "About 90% — e^(-0.1×1) ≈ 0.905", correct: true },
      { id: 'b', label: "About 99% — defects are negligible" },
      { id: 'c', label: "About 50% — half the dies are good" },
      { id: 'd', label: "About 10% — most dies are defective" }
    ],
    explanation: "Y = e^(-D×A) = e^(-0.1×1) = e^(-0.1) ≈ 0.905 or about 90%. Each 100mm² die has area A = 1 cm², and at 0.1 defects/cm², the yield is high."
  },
  {
    scenario: "A 300mm wafer costs $10,000 to process. It yields 500 dies at 80% yield.",
    question: "What is the cost per good die?",
    options: [
      { id: 'a', label: "$25 per good die", correct: true },
      { id: 'b', label: "$20 per good die" },
      { id: 'c', label: "$12.50 per good die" },
      { id: 'd', label: "$50 per good die" }
    ],
    explanation: "Good dies = 500 × 0.80 = 400. Cost per good die = $10,000 / 400 = $25. The 20% yield loss increases the effective cost from $20 (if perfect yield) to $25."
  },
  {
    scenario: "A wafer has 600 potential die sites. After testing, 420 are functional.",
    question: "What is the die yield?",
    options: [
      { id: 'a', label: "70%", correct: true },
      { id: 'b', label: "42%" },
      { id: 'c', label: "60%" },
      { id: 'd', label: "80%" }
    ],
    explanation: "Die yield = good dies / total dies = 420 / 600 = 0.70 = 70%. This is a direct measurement of the functional percentage."
  },
  {
    scenario: "Dies at the edge of a circular wafer are partially cut off. A 300mm wafer with 10mm × 10mm dies has about 700 full die sites.",
    question: "Why do edge dies reduce effective yield?",
    options: [
      { id: 'a', label: "Partial dies at the circular edge are wasted — they cannot form complete chips", correct: true },
      { id: 'b', label: "Edge dies run hotter" },
      { id: 'c', label: "The silicon is thinner at edges" },
      { id: 'd', label: "Photolithography doesn't reach the edges" }
    ],
    explanation: "A circular wafer with rectangular dies inevitably wastes silicon at the perimeter. Larger dies waste proportionally more edge area, reducing the number of complete die sites."
  },
  {
    scenario: "A new 3nm process starts with 0.5 defects/cm² and improves to 0.05 defects/cm² over 18 months.",
    question: "This improvement is called:",
    options: [
      { id: 'a', label: "Yield learning curve — systematic defect reduction through process optimization", correct: true },
      { id: 'b', label: "Moore's Law" },
      { id: 'c', label: "Dennard Scaling" },
      { id: 'd', label: "Die shrink" }
    ],
    explanation: "The yield learning curve describes how defect density decreases over time as the fab identifies and eliminates defect sources. This 10× improvement is typical for a new process node."
  },
  {
    scenario: "NVIDIA's H100 GPU has a die area of 814mm² (8.14 cm²) manufactured on TSMC's 4nm process.",
    question: "At a mature defect density of 0.1/cm², what yield does the Poisson model predict?",
    options: [
      { id: 'a', label: "About 44% — Y = e^(-0.1×8.14) ≈ 0.443", correct: true },
      { id: 'b', label: "About 90% — mature process means high yield" },
      { id: 'c', label: "About 75% — moderate for a large die" },
      { id: 'd', label: "About 20% — impossibly large die" }
    ],
    explanation: "Y = e^(-0.1×8.14) = e^(-0.814) ≈ 0.443. Even at mature defect densities, the massive 814mm² die area means less than half the dies are good — making each H100 extremely expensive."
  },
  {
    scenario: "AMD uses a chiplet design: small 5nm compute dies (~70mm²) connected to a larger 6nm I/O die.",
    question: "Why does this approach dramatically improve effective yield?",
    options: [
      { id: 'a', label: "Small dies have exponentially higher yield — Y = e^(-D×A) favors small A", correct: true },
      { id: 'b', label: "Chiplets use less silicon" },
      { id: 'c', label: "6nm is cheaper than 5nm" },
      { id: 'd', label: "Chiplets don't need testing" }
    ],
    explanation: "At D=0.1/cm², a 70mm² die yields ~93% vs ~44% for an equivalent 814mm² monolithic die. Multiple small chiplets with high yield beats one giant die with low yield."
  },
  {
    scenario: "A fab runs 50,000 wafers per month at $8,000 per wafer. Improving yield from 70% to 80% on 400 dies/wafer.",
    question: "How much additional revenue does the 10% yield improvement generate monthly?",
    options: [
      { id: 'a', label: "$200 million more good dies per month at $100/die", correct: true },
      { id: 'b', label: "$50 million" },
      { id: 'c', label: "$10 million" },
      { id: 'd', label: "$500 million" }
    ],
    explanation: "Additional good dies = 50,000 wafers × 400 dies × (0.80 - 0.70) = 2,000,000 extra good dies/month. At $100/die, that is $200M/month in additional revenue."
  },
  {
    scenario: "The Murphy yield model Y = ((1-e^(-D×A))/(D×A))² is sometimes used instead of Poisson Y = e^(-D×A).",
    question: "Why do fabs use different yield models?",
    options: [
      { id: 'a', label: "Defect clustering — real defects are not perfectly random, so different models fit different processes", correct: true },
      { id: 'b', label: "Murphy's model is always more accurate" },
      { id: 'c', label: "Poisson is only for small dies" },
      { id: 'd', label: "They give the same results" }
    ],
    explanation: "Real defects tend to cluster (from particles, scratches, etc.). Poisson assumes uniform random defects. Murphy and negative binomial models account for clustering, often giving more realistic predictions."
  },
  {
    scenario: "A process technology ramp shows: Month 1: D=1.0/cm², Month 6: D=0.3/cm², Month 12: D=0.1/cm², Month 24: D=0.05/cm².",
    question: "What pattern does defect density reduction follow?",
    options: [
      { id: 'a', label: "Roughly exponential decay — rapid initial improvement that slows over time", correct: true },
      { id: 'b', label: "Linear decrease" },
      { id: 'c', label: "Constant rate of improvement" },
      { id: 'd', label: "Step function — sudden jumps" }
    ],
    explanation: "Defect density follows approximate exponential decay. Easy defect sources are found first (particles, obvious process issues), then diminishing returns as remaining defects become harder to identify and eliminate."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🖥️',
    title: 'NVIDIA H100 GPU',
    short: 'Massive monolithic die pushing yield limits',
    tagline: 'The billion-dollar yield challenge',
    description: 'The NVIDIA H100 GPU has an 814mm² die — one of the largest chips ever made. At TSMC 4nm, even mature defect densities mean less than half the dies on each wafer work. NVIDIA must price each chip to cover the enormous waste, contributing to the $25,000+ price per GPU.',
    connection: 'Y = e^(-D×A) with A = 8.14 cm² means yield ≈ 44% even at D = 0.1/cm². Each good H100 must pay for 1.3 bad ones.',
    howItWorks: 'TSMC processes wafers at extreme precision, tests every die, and only packages the functional ones.',
    stats: [
      { value: '814mm²', label: 'Die area', icon: '📐' },
      { value: '~40%', label: 'Estimated yield', icon: '📊' },
      { value: '~$2000', label: 'Cost per die', icon: '💰' }
    ],
    examples: ['H100 SXM', 'H100 PCIe', 'GH200 Grace Hopper', 'H200'],
    companies: ['NVIDIA', 'TSMC', 'SK Hynix', 'Micron'],
    futureImpact: 'Next-gen B100 uses chiplets to avoid the yield penalty of ever-larger monolithic dies.',
    color: '#76B900'
  },
  {
    icon: '🍎',
    title: 'Apple M2 Ultra Die-Stitch',
    short: 'Two dies fused to avoid yield penalty',
    tagline: 'UltraFusion — the yield workaround',
    description: 'Apple\'s M2 Ultra is two M2 Max dies connected via UltraFusion, a 2.5TB/s die-to-die interconnect. Instead of making one massive die with terrible yield, Apple manufactures two smaller dies with high yield and fuses them together.',
    connection: 'Two 400mm² dies at ~67% yield each gives ~45% combined yield — but a single 800mm² die would yield only ~45% total, and a defect kills the entire chip instead of just one half.',
    howItWorks: 'UltraFusion uses a silicon interposer with 10,000+ connections between the two dies.',
    stats: [
      { value: '2 dies', label: 'Stitched together', icon: '🔗' },
      { value: 'UltraFusion', label: 'Interconnect tech', icon: '⚡' },
      { value: 'avoids', label: 'Yield penalty', icon: '✅' }
    ],
    examples: ['M1 Ultra', 'M2 Ultra', 'M3 Ultra', 'Mac Studio'],
    companies: ['Apple', 'TSMC', 'ASE', 'Amkor'],
    futureImpact: 'Die stitching will become standard for high-performance chips, decoupling performance from yield.',
    color: '#6B7280'
  },
  {
    icon: '🔴',
    title: 'AMD Chiplet Approach',
    short: 'Small dies, high yield, modular scaling',
    tagline: 'Chiplets changed the economics of chips',
    description: 'AMD\'s EPYC and Ryzen processors use multiple small 5nm compute chiplets connected to a 6nm I/O die. Each compute chiplet is only ~70mm² with >90% yield. This lets AMD build 64-core server CPUs that would be impossible as monolithic dies.',
    connection: 'A 70mm² chiplet at D=0.1/cm² yields ~93%. Eight chiplets = ~56% that all 8 work. A monolithic equivalent at 560mm² would yield only ~57% — but chiplets let you bin and replace defective ones.',
    howItWorks: 'Infinity Fabric connects chiplets at high bandwidth. Defective chiplets are discarded individually.',
    stats: [
      { value: '5nm', label: 'Compute dies', icon: '🔬' },
      { value: '6nm', label: 'I/O die', icon: '📡' },
      { value: 'high yield', label: 'Small die advantage', icon: '📈' }
    ],
    examples: ['EPYC Genoa', 'Ryzen 7000', 'MI300X', 'Threadripper'],
    companies: ['AMD', 'TSMC', 'GlobalFoundries', 'ASE'],
    futureImpact: 'Universal Chiplet Interconnect Express (UCIe) will standardize chiplet interfaces across the industry.',
    color: '#EF4444'
  },
  {
    icon: '🚗',
    title: 'Tesla FSD Chip',
    short: 'Mature node for high yield and reliability',
    tagline: 'When yield means safety',
    description: 'Tesla\'s Full Self-Driving chip uses Samsung\'s 14nm process — a very mature node with extremely low defect density. The 260mm² die achieves high yield, keeping costs down for a chip that goes into every Tesla vehicle. Automotive chips demand both high yield and extreme reliability.',
    connection: 'At Samsung 14nm with D ≈ 0.03/cm², Y = e^(-0.03×2.6) ≈ 92%. Mature process + moderate die size = excellent economics.',
    howItWorks: 'Samsung 14nm has years of defect learning, making it ideal for high-volume automotive production.',
    stats: [
      { value: '260mm²', label: 'Die area', icon: '📐' },
      { value: 'Samsung 14nm', label: 'Mature process', icon: '🏭' },
      { value: 'high yield', label: 'Cost effective', icon: '💰' }
    ],
    examples: ['HW3 FSD Computer', 'HW4 FSD Computer', 'Dojo D1', 'Tesla Bot chip'],
    companies: ['Tesla', 'Samsung Foundry', 'Broadcom', 'NVIDIA (competitor)'],
    futureImpact: 'Tesla\'s next-gen FSD chip may move to a more advanced node, trading yield for performance.',
    color: '#3B82F6'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_FabYieldCurveRenderer: React.FC<ELON_FabYieldCurveRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [defectDensity, setDefectDensity] = useState(0.1);
  const [dieWidth, setDieWidth] = useState(20);
  const [dieHeight, setDieHeight] = useState(20);
  const [waferCost] = useState(10000);
  const [defectSeed, setDefectSeed] = useState(42);

  // Twist phase — doubled die size scenario
  const [twistDieWidth, setTwistDieWidth] = useState(20);
  const [twistDieHeight, setTwistDieHeight] = useState(20);
  const [twistDefectDensity, setTwistDefectDensity] = useState(0.1);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Navigation ref
  const isNavigating = useRef(false);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Poisson yield model: Y = e^(-D * A)
  const calculateYield = (D: number, areaSquareMm: number): number => {
    const areaCm2 = areaSquareMm / 100;
    return Math.exp(-D * areaCm2);
  };

  // Dies per wafer (300mm wafer) approximation
  const calculateDiesPerWafer = (dW: number, dH: number): number => {
    const waferRadius = 150;
    let count = 0;
    for (let x = -waferRadius; x + dW <= waferRadius; x += dW) {
      for (let y = -waferRadius; y + dH <= waferRadius; y += dH) {
        const corners = [
          [x, y], [x + dW, y], [x, y + dH], [x + dW, y + dH]
        ];
        const allInside = corners.every(([cx, cy]) => Math.sqrt(cx * cx + cy * cy) <= waferRadius - 2);
        if (allInside) count++;
      }
    }
    return count;
  };

  // Seeded random for consistent defect placement
  const seededRandom = (seed: number): (() => number) => {
    let s = seed;
    return () => {
      s = (s * 16807 + 0) % 2147483647;
      return s / 2147483647;
    };
  };

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#8B5CF6',
    accentGlow: 'rgba(139, 92, 246, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#2a2a3a',
    goodDie: '#10B981',
    badDie: '#EF4444',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Exploration',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'fab-yield-curve',
        gameTitle: 'Fab Yield Curve',
        details: { phase: p },
        timestamp: Date.now()
      });
    }
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Current calculations
  const dieAreaMm2 = dieWidth * dieHeight;
  const dieAreaCm2 = dieAreaMm2 / 100;
  const yieldPercent = calculateYield(defectDensity, dieAreaMm2) * 100;
  const diesPerWafer = calculateDiesPerWafer(dieWidth, dieHeight);
  const goodDies = Math.round(diesPerWafer * (yieldPercent / 100));
  const costPerGoodDie = goodDies > 0 ? waferCost / goodDies : Infinity;

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 1000,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.error})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px 0',
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          data-navigation-dot="true"
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.error})`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
    minHeight: '44px',
  };

  // Fixed navigation bar component
  const NavigationBar = ({ children }: { children: React.ReactNode }) => (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: colors.bgSecondary,
      borderTop: `1px solid ${colors.border}`,
      padding: '12px 24px',
      zIndex: 1000,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
    }}>
      {children}
    </nav>
  );

  // Slider style helper
  const sliderStyle = (color: string, value: number, min: number, max: number): React.CSSProperties => ({
    width: '100%',
    height: '20px',
    borderRadius: '4px',
    background: `linear-gradient(to right, ${color} ${((value - min) / (max - min)) * 100}%, ${colors.border} ${((value - min) / (max - min)) * 100}%)`,
    cursor: 'pointer',
    touchAction: 'pan-y' as const,
    WebkitAppearance: 'none' as const,
    accentColor: color,
  });

  // -------------------------------------------------------------------------
  // WAFER SVG VISUALIZATION
  // -------------------------------------------------------------------------
  const WaferVisualization = ({ dd, dW, dH, showLabels = true }: { dd: number; dW: number; dH: number; showLabels?: boolean }) => {
    const width = isMobile ? 340 : 520;
    const height = 400;
    const waferSvgRadius = isMobile ? 130 : 180;
    const cx = width / 2;
    const cy = 200;

    // Scale die sizes for SVG
    const scaleFactor = waferSvgRadius / 150;
    const dieSvgW = dW * scaleFactor;
    const dieSvgH = dH * scaleFactor;

    // Calculate yield
    const areaForYield = dW * dH;
    const yld = calculateYield(dd, areaForYield);

    // Generate dies on wafer
    const dies: { x: number; y: number; good: boolean }[] = [];
    const rng = seededRandom(defectSeed);

    for (let gx = cx - waferSvgRadius; gx + dieSvgW <= cx + waferSvgRadius; gx += dieSvgW + 1) {
      for (let gy = cy - waferSvgRadius; gy + dieSvgH <= cy + waferSvgRadius; gy += dieSvgH + 1) {
        const corners = [
          [gx, gy], [gx + dieSvgW, gy],
          [gx, gy + dieSvgH], [gx + dieSvgW, gy + dieSvgH]
        ];
        const allInside = corners.every(([px, py]) => {
          const dx = px - cx;
          const dy = py - cy;
          return Math.sqrt(dx * dx + dy * dy) <= waferSvgRadius - 3;
        });
        if (allInside) {
          const isGood = rng() < yld;
          dies.push({ x: gx, y: gy, good: isGood });
        }
      }
    }

    const totalDies = dies.length;
    const goodCount = dies.filter(d => d.good).length;
    const yieldDisplay = totalDies > 0 ? ((goodCount / totalDies) * 100).toFixed(1) : '0.0';
    const costPerGood = goodCount > 0 ? (waferCost / goodCount).toFixed(0) : '∞';

    // Generate defect dots
    const defects: { x: number; y: number }[] = [];
    const waferAreaCm2 = Math.PI * (15 * 15);
    const numDefects = Math.round(dd * waferAreaCm2);
    const defRng = seededRandom(defectSeed + 1000);
    for (let i = 0; i < Math.min(numDefects, 300); i++) {
      const angle = defRng() * Math.PI * 2;
      const r = Math.sqrt(defRng()) * waferSvgRadius;
      defects.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <radialGradient id="waferGrad" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="60%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
          <linearGradient id="goodDieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="badDieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
          <linearGradient id="yieldCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <filter id="waferGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="dieGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="defectGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="waferClip">
            <circle cx={cx} cy={cy} r={waferSvgRadius} />
          </clipPath>
        </defs>

        {/* Grid reference lines */}
        <line x1="30" y1={cy} x2={width - 30} y2={cy} stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1={cx} y1="30" x2={cx} y2={height - 30} stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1={cx - waferSvgRadius} y1={cy - waferSvgRadius} x2={cx + waferSvgRadius} y2={cy + waferSvgRadius} stroke="rgba(255,255,255,0.03)" strokeDasharray="4,4" />
        <line x1={cx + waferSvgRadius} y1={cy - waferSvgRadius} x2={cx - waferSvgRadius} y2={cy + waferSvgRadius} stroke="rgba(255,255,255,0.03)" strokeDasharray="4,4" />

        {/* Title */}
        {showLabels && (
          <text x={cx} y={22} fill={colors.textPrimary} fontSize="14" fontWeight="700" textAnchor="middle">
            300mm Wafer — Defect Density: {dd.toFixed(2)}/cm²
          </text>
        )}

        {/* Wafer circle */}
        <circle cx={cx} cy={cy} r={waferSvgRadius + 2} fill="none" stroke="rgba(139,92,246,0.3)" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={waferSvgRadius} fill="url(#waferGrad)" />

        {/* Wafer notch */}
        <path d={`M ${cx - 8} ${cy + waferSvgRadius} L ${cx} ${cy + waferSvgRadius - 6} L ${cx + 8} ${cy + waferSvgRadius}`} fill={colors.bgPrimary} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

        {/* Dies - clipped to wafer */}
        <g clipPath="url(#waferClip)">
          {dies.map((die, i) => (
            <rect
              key={i}
              x={die.x + 0.5}
              y={die.y + 0.5}
              width={Math.max(dieSvgW - 1, 2)}
              height={Math.max(dieSvgH - 1, 2)}
              rx="1"
              fill={die.good ? 'url(#goodDieGrad)' : 'url(#badDieGrad)'}
              opacity={die.good ? 0.85 : 0.7}
              stroke={die.good ? '#34D399' : '#F87171'}
              strokeWidth="0.3"
            />
          ))}
        </g>

        {/* Defect dots overlay */}
        <g clipPath="url(#waferClip)">
          {defects.slice(0, 100).map((def, i) => (
            <circle
              key={`d-${i}`}
              cx={def.x}
              cy={def.y}
              r={2}
              fill="#FF0000"
              opacity="0.6"
              filter="url(#defectGlow)"
            />
          ))}
        </g>

        {/* Wafer edge ring */}
        <circle cx={cx} cy={cy} r={waferSvgRadius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />

        {/* Yield curve mini-chart at bottom */}
        <g>
          <path
            d={`M 40 ${height - 25} L 80 ${height - 40} L 120 ${height - 65} L 160 ${height - 95} L 200 ${height - 120} L 240 ${height - 140} L 280 ${height - 152} L 320 ${height - 158} L 360 ${height - 162} L 400 ${height - 164} L 440 ${height - 165} L ${width - 40} ${height - 166}`}
            stroke="url(#yieldCurveGrad)"
            fill="none"
            strokeWidth="2"
            opacity="0.5"
          />
          {/* Current position dot on curve */}
          <circle
            cx={40 + ((1 - dd) / 1.0) * (width - 80)}
            cy={height - 25 - (yld * 250)}
            r="6"
            fill={colors.accent}
            stroke="white"
            strokeWidth="2"
            filter="url(#dieGlow)"
          />
        </g>

        {/* Stats overlay */}
        {showLabels && (
          <g>
            <rect x={20} y={height - 100} width="120" height="62" rx="8" fill="rgba(0,0,0,0.7)" stroke="rgba(139,92,246,0.3)" strokeWidth="1" />
            <text x={80} y={height - 82} fill={colors.goodDie} fontSize="12" fontWeight="700" textAnchor="middle">
              Yield: {yieldDisplay}%
            </text>
            <text x={80} y={height - 66} fill={colors.textMuted} fontSize="11" textAnchor="middle">
              {goodCount}/{totalDies} good dies
            </text>
            <text x={80} y={height - 50} fill={colors.warning} fontSize="11" textAnchor="middle">
              ${costPerGood}/good die
            </text>

            <rect x={width - 140} y={height - 100} width="120" height="62" rx="8" fill="rgba(0,0,0,0.7)" stroke="rgba(139,92,246,0.3)" strokeWidth="1" />
            <text x={width - 80} y={height - 82} fill={colors.accent} fontSize="12" fontWeight="700" textAnchor="middle">
              Die: {dW}×{dH}mm
            </text>
            <text x={width - 80} y={height - 66} fill={colors.textMuted} fontSize="11" textAnchor="middle">
              Area: {(dW * dH).toFixed(0)}mm²
            </text>
            <text x={width - 80} y={height - 50} fill={colors.textMuted} fontSize="11" textAnchor="middle">
              Y = e^(-{dd.toFixed(2)}×{(dW * dH / 100).toFixed(2)})
            </text>
          </g>
        )}

        {/* Legend */}
        <g>
          <rect x={cx - 100} y={height - 18} width="10" height="10" rx="2" fill="url(#goodDieGrad)" />
          <text x={cx - 86} y={height - 9} fill="#94a3b8" fontSize="11">Good Die</text>
          <rect x={cx - 20} y={height - 18} width="10" height="10" rx="2" fill="url(#badDieGrad)" />
          <text x={cx - 6} y={height - 9} fill="#94a3b8" fontSize="11">Bad Die</text>
          <circle cx={cx + 65} cy={height - 13} r="3" fill="#FF0000" opacity="0.6" />
          <text x={cx + 73} y={height - 9} fill="#94a3b8" fontSize="11">Defect</text>
        </g>

        {/* Formula box */}
        <rect x={cx - 110} y={height - 35} width="220" height="16" rx="4" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.3)" />
        <text x={cx} y={height - 24} fill={colors.accent} fontSize="11" fontWeight="600" textAnchor="middle">
          Y = e^(-D×A) = e^(-{(dd * dW * dH / 100).toFixed(3)}) = {(yld * 100).toFixed(1)}%
        </text>
      </svg>
    );
  };

  // -------------------------------------------------------------------------
  // TWIST VISUALIZATION — Side by side comparison
  // -------------------------------------------------------------------------
  const TwistVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 340;
    const smallW = twistDieWidth;
    const smallH = twistDieHeight;
    const bigW = twistDieWidth * 2;
    const bigH = twistDieHeight * 2;
    const dd = twistDefectDensity;

    const smallYield = calculateYield(dd, smallW * smallH) * 100;
    const bigYield = calculateYield(dd, bigW * bigH) * 100;
    const smallDies = calculateDiesPerWafer(smallW, smallH);
    const bigDies = calculateDiesPerWafer(bigW, bigH);
    const smallGood = Math.round(smallDies * smallYield / 100);
    const bigGood = Math.round(bigDies * bigYield / 100);

    const barMaxH = 180;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="smallBarGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
          <linearGradient id="bigBarGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#F87171" />
          </linearGradient>
          <filter id="twistGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid */}
        <line x1="30" y1="60" x2={width - 30} y2="60" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1="30" y1="140" x2={width - 30} y2="140" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1="30" y1="220" x2={width - 30} y2="220" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1={width / 2} y1="40" x2={width / 2} y2="280" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />

        {/* Title */}
        <text x={width / 2} y={25} fill={colors.textPrimary} fontSize="14" fontWeight="700" textAnchor="middle">
          Die Size Doubling — Yield Impact at D={dd.toFixed(2)}/cm²
        </text>

        {/* Small die bar */}
        <g>
          <text x={width / 4} y={50} fill={colors.goodDie} fontSize="12" fontWeight="600" textAnchor="middle">
            Standard: {smallW}×{smallH}mm
          </text>
          <rect
            x={width / 4 - 35}
            y={260 - (smallYield / 100) * barMaxH}
            width="70"
            height={(smallYield / 100) * barMaxH}
            rx="4"
            fill="url(#smallBarGrad)"
            filter="url(#twistGlow)"
          />
          <text x={width / 4} y={255 - (smallYield / 100) * barMaxH} fill={colors.goodDie} fontSize="13" fontWeight="700" textAnchor="middle">
            {smallYield.toFixed(1)}%
          </text>
          <text x={width / 4} y={278} fill={colors.textMuted} fontSize="11" textAnchor="middle">
            {smallGood} good / {smallDies} total
          </text>
          {/* Die size box */}
          <rect x={width / 4 - 15} y={290} width="30" height="30" rx="2" fill="url(#goodDieGrad)" opacity="0.5" stroke={colors.goodDie} />
          <text x={width / 4} y={310} fill="white" fontSize="11" fontWeight="600" textAnchor="middle">
            {(smallW * smallH).toFixed(0)}
          </text>
        </g>

        {/* Big die bar */}
        <g>
          <text x={3 * width / 4} y={50} fill={colors.badDie} fontSize="12" fontWeight="600" textAnchor="middle">
            Doubled: {bigW}×{bigH}mm
          </text>
          <rect
            x={3 * width / 4 - 35}
            y={260 - (bigYield / 100) * barMaxH}
            width="70"
            height={(bigYield / 100) * barMaxH}
            rx="4"
            fill="url(#bigBarGrad)"
            filter="url(#twistGlow)"
          />
          <text x={3 * width / 4} y={255 - (bigYield / 100) * barMaxH} fill={colors.badDie} fontSize="13" fontWeight="700" textAnchor="middle">
            {bigYield.toFixed(1)}%
          </text>
          <text x={3 * width / 4} y={278} fill={colors.textMuted} fontSize="11" textAnchor="middle">
            {bigGood} good / {bigDies} total
          </text>
          {/* Die size box */}
          <rect x={3 * width / 4 - 25} y={285} width="50" height="40" rx="2" fill="url(#badDieGrad)" opacity="0.5" stroke={colors.badDie} />
          <text x={3 * width / 4} y={310} fill="white" fontSize="11" fontWeight="600" textAnchor="middle">
            {(bigW * bigH).toFixed(0)}
          </text>
        </g>

        {/* Comparison arrow */}
        <path
          d={`M ${width / 4 + 50} ${200} L ${3 * width / 4 - 50} ${200}`}
          stroke={colors.warning}
          strokeWidth="2"
          markerEnd="url(#arrowEnd)"
          opacity="0.6"
        />
        <defs>
          <marker id="arrowEnd" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={colors.warning} />
          </marker>
        </defs>
        <text x={width / 2} y={195} fill={colors.warning} fontSize="11" fontWeight="600" textAnchor="middle">
          4× area → yield drops
        </text>

        {/* Yield curve path */}
        <path
          d={`M 40 ${height - 18} Q ${width / 4} ${height - 15 - smallYield * 1.5} ${width / 2} ${height - 15 - (smallYield + bigYield) * 0.75} Q ${3 * width / 4} ${height - 15 - bigYield * 1.5} ${width - 40} ${height - 18}`}
          stroke={colors.accent}
          fill="none"
          strokeWidth="1.5"
          opacity="0.3"
        />

        {/* Interactive dots on yield curve */}
        <circle cx={width / 4} cy={height - 15 - smallYield * 1.5} r="6" fill={colors.goodDie} stroke="white" strokeWidth="1.5" filter="url(#twistGlow)" />
        <circle cx={3 * width / 4} cy={height - 15 - bigYield * 1.5} r="6" fill={colors.badDie} stroke="white" strokeWidth="1.5" filter="url(#twistGlow)" />
      </svg>
    );
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'pulse 2s infinite',
          }}>
            💎🔬
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Fab Yield Curve
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            &quot;Every random particle on a silicon wafer is a <span style={{ color: colors.error }}>death sentence for a chip</span>. Defect density determines whether a billion-dollar fab prints money or burns it.&quot;
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '32px',
            maxWidth: '500px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
              &quot;A single speck of dust can destroy a chip worth thousands of dollars. The Poisson yield equation Y = e^(-D x A) governs the economics of the entire semiconductor industry — it&apos;s why NVIDIA GPUs cost what they do.&quot;
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Semiconductor Manufacturing Fundamentals
            </p>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <button
              disabled
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'not-allowed',
                opacity: 0.3,
                minHeight: '44px',
              }}
            >
              Back
            </button>
            <button
              onClick={() => { playSound('click'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Start Exploring
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'About 90% — most dies are good at low defect density' },
      { id: 'b', text: 'About 55% — Y = e^(-0.1 x 8.14) ≈ 44%, so roughly half' },
      { id: 'c', text: 'About 95% — modern fabs have nearly perfect yields' },
      { id: 'd', text: 'About 10% — such a huge die mostly fails' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                Make Your Prediction
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              An AI chip with 814mm² die area at 0.1 defects/cm² — what&apos;s the yield?
            </h2>

            {/* Static SVG showing the prediction concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <radialGradient id="predictWaferGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#334155" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </radialGradient>
                  <linearGradient id="predictDieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#6D28D9" />
                  </linearGradient>
                  <filter id="predictGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <text x="200" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">AI Accelerator: 814mm² on 300mm Wafer</text>
                <circle cx="140" cy="115" r="75" fill="url(#predictWaferGrad)" stroke="rgba(139,92,246,0.4)" strokeWidth="1" />
                <rect x="105" y="85" width="50" height="45" rx="3" fill="url(#predictDieGrad)" opacity="0.8" filter="url(#predictGlow)" />
                <text x="130" y="112" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">814mm²</text>
                <circle cx="115" cy="100" r="2" fill="#FF0000" opacity="0.8" />
                <circle cx="142" cy="125" r="2" fill="#FF0000" opacity="0.8" />
                <circle cx="128" cy="90" r="2" fill="#FF0000" opacity="0.8" />
                <text x="300" y="70" textAnchor="middle" fill={colors.accent} fontSize="12" fontWeight="600">Y = e^(-D × A)</text>
                <text x="300" y="90" textAnchor="middle" fill={colors.textMuted} fontSize="11">D = 0.1 defects/cm²</text>
                <text x="300" y="110" textAnchor="middle" fill={colors.textMuted} fontSize="11">A = 8.14 cm²</text>
                <text x="300" y="140" textAnchor="middle" fill={colors.warning} fontSize="14" fontWeight="700">Y = ???</text>
                <text x="200" y="190" textAnchor="middle" fill="#94a3b8" fontSize="11">How many of these giant dies survive?</text>
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { playSound('click'); setPrediction(opt.id); }}
                  style={{
                    background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                    borderRadius: '12px',
                    padding: '16px 20px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    minHeight: '44px',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                    color: prediction === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center',
                    lineHeight: '28px',
                    marginRight: '12px',
                    fontWeight: 700,
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.body }}>
                    {opt.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('hook')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            {prediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                Test My Prediction
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PLAY PHASE - Interactive Wafer Yield Visualizer
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Wafer Yield Visualizer
            </h2>

            {/* Why this matters */}
            <div style={{
              background: `${colors.success}11`,
              border: `1px solid ${colors.success}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.success }}>Why This Matters:</strong> Semiconductor yield directly determines chip cost. A 10% yield improvement on a single wafer lot can mean millions of dollars in additional revenue. Every major chipmaker obsesses over defect density.
              </p>
            </div>

            {/* Key terms */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.textPrimary }}>Defect Density (D)</strong> is the number of killer defects per unit area (defects/cm²) on the wafer surface.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>Poisson Yield Model</strong> gives Y = e^(-D x A), where A is die area in cm². This assumes defects are randomly distributed.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.error }}>Cost Per Good Die</strong> equals the total wafer processing cost divided by the number of functional dies — the key economic metric.
              </p>
            </div>

            {/* Visualization explanation */}
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              Try adjusting the defect density slider and observe how yield changes exponentially. Watch the green (good) and red (defective) dies on the 300mm wafer as you experiment with different settings. Notice how increasing die size makes larger chips dramatically more expensive.
            </p>

            {/* Main visualization — side-by-side on desktop */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '20px',
            }}>
              {/* Left: SVG visualization */}
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <WaferVisualization dd={defectDensity} dW={dieWidth} dH={dieHeight} />
                  </div>
                </div>
              </div>

              {/* Right: Controls panel */}
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  {/* Defect Density slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Defect Density</span>
                      <span style={{ ...typo.small, color: defectDensity > 0.3 ? colors.error : colors.success, fontWeight: 600 }}>
                        {defectDensity.toFixed(2)} defects/cm²
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={defectDensity * 100}
                      onChange={(e) => { setDefectDensity(parseInt(e.target.value) / 100); setDefectSeed(Math.floor(Math.random() * 10000)); }}
                      onInput={(e) => { setDefectDensity(parseInt((e.target as HTMLInputElement).value) / 100); }}
                      aria-label="Defect Density"
                      style={sliderStyle(colors.accent, defectDensity * 100, 1, 100)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.success }}>0.01/cm² (mature)</span>
                      <span style={{ ...typo.small, color: colors.error }}>1.0/cm² (new process)</span>
                    </div>
                  </div>

                  {/* Die Size sliders */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ ...typo.small, color: colors.textSecondary }}>Die Width</span>
                        <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{dieWidth}mm</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="40"
                        value={dieWidth}
                        onChange={(e) => setDieWidth(parseInt(e.target.value))}
                        onInput={(e) => setDieWidth(parseInt((e.target as HTMLInputElement).value))}
                        aria-label="Die width"
                        style={sliderStyle(colors.accent, dieWidth, 5, 40)}
                      />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ ...typo.small, color: colors.textSecondary }}>Die Height</span>
                        <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{dieHeight}mm</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="40"
                        value={dieHeight}
                        onChange={(e) => setDieHeight(parseInt(e.target.value))}
                        onInput={(e) => setDieHeight(parseInt((e.target as HTMLInputElement).value))}
                        aria-label="Die height"
                        style={sliderStyle(colors.accent, dieHeight, 5, 40)}
                      />
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(1, 1fr)',
                    gap: '12px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: yieldPercent > 70 ? colors.success : yieldPercent > 40 ? colors.warning : colors.error }}>{yieldPercent.toFixed(1)}%</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Yield</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.accent }}>{goodDies}/{diesPerWafer}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Good/Total Dies</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.warning }}>
                        ${costPerGoodDie < 100000 ? costPerGoodDie.toFixed(0) : '∞'}
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Cost/Good Die</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('predict')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand the Physics
            </button>
          </div>
        </NavigationBar>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '12px', textAlign: 'center' }}>
              The Physics of Semiconductor Yield
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              {prediction === 'b'
                ? 'Correct! Your prediction was right — Y = e^(-0.1 x 8.14) ≈ 44%. Less than half the 814mm² dies survive even at mature defect densities.'
                : 'As you observed in the experiment, the answer is about 44%. This result demonstrates the key insight: because die area appears in the exponent, Y = e^(-0.1 x 8.14) ≈ 0.443 — less than half the dies survive. Die area has an exponential effect on yield.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Y = e^(-D × A)</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  The Poisson yield model captures the probability that a die has <span style={{ color: colors.success }}>zero defects</span>. <span style={{ color: colors.accent }}>D</span> is defect density (defects/cm²) and <span style={{ color: colors.error }}>A</span> is die area (cm²). The exponential means that doubling area more than halves yield.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  Y = e^(-0.1 × 8.14) = e^(-0.814) ≈ <strong>44.3%</strong>
                </p>
              </div>
            </div>

            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                Why Defects Kill Dies
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Random particles, crystal defects, and process variations create &quot;killer defects&quot; — any single defect that lands on a critical circuit element destroys the entire die. This demonstrates the key insight: because the Poisson model treats defects as randomly scattered events, the formula shows that even one extra defect per unit area has an exponential impact on yield.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Die Area vs Yield — The Exponential Trap
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { area: '50mm²', yield: '95.1%', cost: 'Low' },
                  { area: '100mm²', yield: '90.5%', cost: 'Moderate' },
                  { area: '200mm²', yield: '81.9%', cost: 'Higher' },
                  { area: '400mm²', yield: '67.0%', cost: 'High' },
                  { area: '600mm²', yield: '54.9%', cost: 'Very High' },
                  { area: '814mm²', yield: '44.3%', cost: 'Extreme' },
                ].map((item, i) => (
                  <div key={i} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>{item.area}</div>
                    <div style={{ ...typo.h3, color: colors.accent }}>{item.yield}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>{item.cost}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('play')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Discover the Twist
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Halves the yield — double area means double defect chance' },
      { id: 'b', text: 'Yield drops from ~67% to ~45% — more than halving good dies per wafer' },
      { id: 'c', text: 'No significant effect — modern fabs handle any die size' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.warning}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                New Variable: Die Size Doubling
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              Doubling die size from 400mm² to 800mm² at the same defect density...
            </h2>

            {/* Static SVG showing the doubling concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="140" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="twistSmallGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="twistBigGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="100%" stopColor="#DC2626" />
                  </linearGradient>
                </defs>
                <text x="120" y="20" textAnchor="middle" fill={colors.goodDie} fontSize="12" fontWeight="600">Consumer Chip</text>
                <rect x="85" y="30" width="70" height="70" rx="4" fill="url(#twistSmallGrad)" opacity="0.8" />
                <text x="120" y="70" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">400mm²</text>
                <text x="120" y="120" textAnchor="middle" fill={colors.textMuted} fontSize="11">Yield: ~67%</text>
                <text x="200" y="70" textAnchor="middle" fill={colors.warning} fontSize="20" fontWeight="700">→</text>
                <text x="300" y="20" textAnchor="middle" fill={colors.badDie} fontSize="12" fontWeight="600">AI Accelerator</text>
                <rect x="240" y="25" width="120" height="80" rx="4" fill="url(#twistBigGrad)" opacity="0.8" />
                <text x="300" y="70" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">800mm²</text>
                <text x="300" y="120" textAnchor="middle" fill={colors.textMuted} fontSize="11">Yield: ???</text>
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                  style={{
                    background: twistPrediction === opt.id ? `${colors.warning}22` : colors.bgCard,
                    border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                    borderRadius: '12px',
                    padding: '16px 20px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
                    color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center',
                    lineHeight: '28px',
                    marginRight: '12px',
                    fontWeight: 700,
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.body }}>
                    {opt.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('review')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            {twistPrediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                See Die Size Impact
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - Die Size Comparison
  if (phase === 'twist_play') {
    const smallArea = twistDieWidth * twistDieHeight;
    const bigArea = twistDieWidth * 2 * twistDieHeight * 2;
    const smallYield = calculateYield(twistDefectDensity, smallArea) * 100;
    const bigYield = calculateYield(twistDefectDensity, bigArea) * 100;
    const smallDiesCount = calculateDiesPerWafer(twistDieWidth, twistDieHeight);
    const bigDiesCount = calculateDiesPerWafer(twistDieWidth * 2, twistDieHeight * 2);
    const smallGoodCount = Math.round(smallDiesCount * smallYield / 100);
    const bigGoodCount = Math.round(bigDiesCount * bigYield / 100);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Die Size Doubling — The Yield Cliff
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Compare standard die vs doubled die at the same defect density
            </p>

            {/* Main visualization — side-by-side on desktop */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '20px',
            }}>
              {/* Left: SVG visualization */}
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  {/* SVG Visualization */}
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <TwistVisualization />
                  </div>

                  {/* Educational panel */}
                  <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '16px', marginTop: '16px' }}>
                    <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}><strong style={{ color: colors.accent }}>What you're seeing:</strong> The bar chart compares yield between a standard die and a doubled die at the same defect density, showing how the exponential penalty of Y = e^(-D x A) devastates larger dies.</p>
                    <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}><strong style={{ color: colors.success }}>Cause and Effect:</strong> When you increase die dimensions or defect density, watch how the doubled die's yield drops much faster than the standard die — this is the exponential area penalty that drives the chiplet revolution.</p>
                  </div>
                </div>
              </div>

              {/* Right: Controls panel */}
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  {/* Defect density slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Defect Density</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{twistDefectDensity.toFixed(2)} defects/cm²</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={twistDefectDensity * 100}
                      onChange={(e) => setTwistDefectDensity(parseInt(e.target.value) / 100)}
                      onInput={(e) => setTwistDefectDensity(parseInt((e.target as HTMLInputElement).value) / 100)}
                      aria-label="Twist defect density"
                      style={sliderStyle(colors.accent, twistDefectDensity * 100, 1, 100)}
                    />
                  </div>

                  {/* Die size sliders */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ ...typo.small, color: colors.textSecondary }}>Base Die Width</span>
                        <span style={{ ...typo.small, color: colors.goodDie, fontWeight: 600 }}>{twistDieWidth}mm</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="30"
                        value={twistDieWidth}
                        onChange={(e) => setTwistDieWidth(parseInt(e.target.value))}
                        onInput={(e) => setTwistDieWidth(parseInt((e.target as HTMLInputElement).value))}
                        aria-label="Base die width"
                        style={sliderStyle(colors.goodDie, twistDieWidth, 5, 30)}
                      />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ ...typo.small, color: colors.textSecondary }}>Base Die Height</span>
                        <span style={{ ...typo.small, color: colors.goodDie, fontWeight: 600 }}>{twistDieHeight}mm</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="30"
                        value={twistDieHeight}
                        onChange={(e) => setTwistDieHeight(parseInt(e.target.value))}
                        onInput={(e) => setTwistDieHeight(parseInt((e.target as HTMLInputElement).value))}
                        aria-label="Base die height"
                        style={sliderStyle(colors.goodDie, twistDieHeight, 5, 30)}
                      />
                    </div>
                  </div>

                  {/* Comparison results */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(1, 1fr)',
                    gap: '12px',
                    marginBottom: '20px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center', borderLeft: `3px solid ${colors.goodDie}` }}>
                      <div style={{ ...typo.small, color: colors.goodDie, fontWeight: 600, marginBottom: '4px' }}>Standard ({smallArea}mm²)</div>
                      <div style={{ ...typo.h3, color: colors.textPrimary }}>{smallYield.toFixed(1)}% yield</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>{smallGoodCount} good dies</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center', borderLeft: `3px solid ${colors.badDie}` }}>
                      <div style={{ ...typo.small, color: colors.badDie, fontWeight: 600, marginBottom: '4px' }}>Doubled ({bigArea}mm²)</div>
                      <div style={{ ...typo.h3, color: colors.textPrimary }}>{bigYield.toFixed(1)}% yield</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>{bigGoodCount} good dies</div>
                    </div>
                  </div>

                  {/* Impact warning */}
                  <div style={{
                    background: `${colors.warning}22`,
                    border: `1px solid ${colors.warning}`,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                      Doubling die dimensions (4x area) impact:
                    </p>
                    <div style={{
                      ...typo.h2,
                      color: colors.warning
                    }}>
                      {smallGoodCount > 0 ? ((bigGoodCount / smallGoodCount) * 100).toFixed(0) : 0}% of original good dies
                    </div>
                    <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                      Yield drops from {smallYield.toFixed(1)}% to {bigYield.toFixed(1)}% — plus fewer die sites per wafer
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_predict')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand the Economics
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              The Economics of Die Size
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Exponential Penalty</h3>
                <p style={{ ...typo.body, color: colors.accent, fontFamily: 'monospace', marginBottom: '12px' }}>Y = e^(-D × A)</p>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Because area is in the exponent, doubling die size does not halve yield — it squares the exponent. At D=0.1/cm²: 400mm² yields 67%, but 800mm² yields only 45%. The penalty is worse than linear because each additional square millimeter has the same probability of containing a killer defect.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Chiplet Revolution</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  AMD, Apple, and Intel now build large chips from multiple small &quot;chiplets&quot; connected via high-speed interconnects. Each small chiplet has high yield, avoiding the exponential penalty of monolithic designs. This is why AMD can compete with much larger budgets — better yield economics.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Big Picture</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  The Poisson yield equation explains why AI chips cost thousands of dollars, why chiplets are the future, and why &quot;yield ramp&quot; is the most important metric for any new semiconductor process. Every fab in the world is in a constant war against defect density.
                </p>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_play')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              See Real-World Applications
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              Explore each application to continue
            </p>
            <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '24px', fontWeight: 600 }}>
              Application {completedApps.filter(c => c).length + 1} of {realWorldApps.length}
            </p>

            {/* All apps always visible */}
            {realWorldApps.map((app, idx) => (
              <div key={idx} style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '16px',
                borderLeft: `4px solid ${app.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '40px' }}>{app.icon}</span>
                  <div>
                    <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                    <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
                  </div>
                </div>

                <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
                  {app.description}
                </p>

                <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                  <p style={{ ...typo.small, color: colors.accent, marginBottom: '4px', fontWeight: 600 }}>Physics Connection:</p>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.connection}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  {app.stats.map((stat, i) => (
                    <div key={i} style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                  Used by: {app.companies.join(', ')}
                </p>

                {!completedApps[idx] && (
                  <button
                    onClick={() => {
                      playSound('click');
                      const newCompleted = [...completedApps];
                      newCompleted[idx] = true;
                      setCompletedApps(newCompleted);
                      setSelectedApp(idx);
                      const nextUncompleted = newCompleted.findIndex(c => !c);
                      if (nextUncompleted === -1) {
                        setTimeout(() => goToPhase('test'), 400);
                      } else {
                        setSelectedApp(nextUncompleted);
                      }
                    }}
                    style={{
                      background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      marginTop: '12px',
                      minHeight: '44px',
                    }}
                  >
                    Got It!
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_review')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                Take the Knowledge Test
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100vh',
          background: colors.bgPrimary,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {renderProgressBar()}

          <div style={{
            flex: '1 1 0%',
            overflowY: 'auto',
            paddingTop: '44px',
            paddingBottom: '80px',
            paddingLeft: '16px',
            paddingRight: '16px',
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '24px' }}>
                {passed ? '🏆' : '📚'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                {passed ? 'You understand semiconductor yield and its billion-dollar economics!' : 'Review the concepts and try again.'}
              </p>
            </div>
          </div>

          <NavigationBar>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              {passed ? (
                <button
                  onClick={() => { playSound('complete'); nextPhase(); }}
                  style={{ ...primaryButtonStyle, minHeight: '44px' }}
                >
                  Complete Lesson
                </button>
              ) : (
                <button
                  onClick={() => {
                    setTestSubmitted(false);
                    setTestAnswers(Array(10).fill(null));
                    setCurrentQuestion(0);
                    setTestScore(0);
                    goToPhase('hook');
                  }}
                  style={{ ...primaryButtonStyle, minHeight: '44px' }}
                >
                  Review & Try Again
                </button>
              )}
            </div>
            {renderNavDots()}
          </NavigationBar>
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Knowledge Test: Fab Yield Curve
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Apply your understanding of Poisson yield, wafer cost economics, dies per wafer, edge loss, defect learning curves, and yield ramp to real semiconductor manufacturing scenarios. Consider the formula Y = e^(-D x A) and how defect density interacts with die area.
            </p>
            {/* Progress */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <span style={{ ...typo.h3, color: colors.accent }}>
                Q{currentQuestion + 1} of 10
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {testQuestions.map((_, i) => (
                  <div key={i} style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: i === currentQuestion ? colors.accent : testAnswers[i] ? colors.success : colors.border,
                  }} />
                ))}
              </div>
            </div>

            {/* Scenario */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {question.scenario}
              </p>
            </div>

            {/* Question */}
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
              {question.question}
            </h3>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {question.options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    playSound('click');
                    const newAnswers = [...testAnswers];
                    newAnswers[currentQuestion] = opt.id;
                    setTestAnswers(newAnswers);
                  }}
                  style={{
                    background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                    borderRadius: '10px',
                    padding: '14px 16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                    color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center',
                    lineHeight: '24px',
                    marginRight: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.small }}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                ← Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white',
                  cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  minHeight: '44px',
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => {
                  const score = testAnswers.reduce((acc, ans, i) => {
                    const correct = testQuestions[i].options.find(o => o.correct)?.id;
                    return acc + (ans === correct ? 1 : 0);
                  }, 0);
                  setTestScore(score);
                  setTestSubmitted(true);
                  playSound(score >= 7 ? 'complete' : 'failure');
                }}
                disabled={testAnswers.some(a => a === null)}
                style={{
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: 'white',
                  cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  minHeight: '44px',
                }}
              >
                Submit Test
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '100px', marginBottom: '24px', animation: 'bounce 1s infinite' }}>
            🏆
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Fab Yield Curve Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand why defect density governs billion-dollar chip economics, why chiplets are the future, and how the Poisson yield model shapes semiconductor manufacturing.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '32px',
            maxWidth: '400px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              You Learned:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {[
                'Poisson yield: Y = e^(-D × A)',
                'Die area has exponential impact on yield',
                'Cost per good die = wafer cost / good dies',
                'Chiplets avoid the large-die yield penalty',
                'Defect learning curve drives yield ramp',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: colors.success }}>✓</span>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={() => goToPhase('hook')}
              style={{
                padding: '14px 28px',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                background: 'transparent',
                color: colors.textSecondary,
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              Play Again
            </button>
            <a
              href="/"
              style={{
                ...primaryButtonStyle,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Return to Dashboard
            </a>
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default ELON_FabYieldCurveRenderer;
