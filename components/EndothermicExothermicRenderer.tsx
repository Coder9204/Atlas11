'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ============================================================================
// ENDOTHERMIC/EXOTHERMIC RENDERER - Game 138
// Physics: Energy balance in dissolution - bond breaking vs hydration energy
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction', predict: 'Predict', play: 'Experiment', review: 'Understanding',
  twist_predict: 'New Variable', twist_play: 'Deep Explore', twist_review: 'Insight',
  transfer: 'Real World', test: 'Knowledge Test', mastery: 'Mastery'
};

interface EndothermicExothermicRendererProps {
  onComplete?: () => void;
  onGameEvent?: (event: { type: string; data?: Record<string, unknown> }) => void;
  gamePhase?: string;
  phase?: string;
  onPhaseComplete?: (phase?: string) => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

interface SoluteData {
  name: string;
  formula: string;
  bondEnergy: number;
  hydrationEnergy: number;
  netEnergy: number;
  color: string;
  tempChange: number;
}

const solutes: SoluteData[] = [
  { name: 'Ammonium Nitrate', formula: 'NH\u2084NO\u2083', bondEnergy: 25.7, hydrationEnergy: -0.3, netEnergy: 25.4, color: '#60a5fa', tempChange: -8 },
  { name: 'Sodium Chloride', formula: 'NaCl', bondEnergy: 3.9, hydrationEnergy: -3.8, netEnergy: 0.1, color: '#e2e8f0', tempChange: -0.5 },
  { name: 'Calcium Chloride', formula: 'CaCl\u2082', bondEnergy: -17.4, hydrationEnergy: -64.6, netEnergy: -82, color: '#f97316', tempChange: 12 },
  { name: 'Sodium Hydroxide', formula: 'NaOH', bondEnergy: -20.5, hydrationEnergy: -23.4, netEnergy: -43.9, color: '#ef4444', tempChange: 8 },
];

const design = {
  bg: '#0a0f1a',
  bgCard: '#1e293b',
  bgGlow: '#1a2332',
  accent: '#3b82f6',
  accentGradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  accentSecondary: '#f97316',
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: 'rgba(148,163,184,0.7)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  shadow: '0 4px 24px rgba(0,0,0,0.4)',
  glow: '0 0 30px rgba(59,130,246,0.3)',
};

const EndothermicExothermicRenderer: React.FC<EndothermicExothermicRendererProps> = ({
  onComplete, onGameEvent, gamePhase, phase: phaseProp, onPhaseComplete, onCorrectAnswer, onIncorrectAnswer
}) => {
  const resolvedInit = (gamePhase || phaseProp || 'hook') as Phase;
  const [phase, setPhase] = useState<Phase>(phaseOrder.includes(resolvedInit) ? resolvedInit : 'hook');
  const lastClickRef = useRef(0);

  useEffect(() => {
    const incoming = (gamePhase || phaseProp) as Phase | undefined;
    if (incoming && incoming !== phase && phaseOrder.includes(incoming)) {
      setPhase(incoming);
    }
  }, [gamePhase, phaseProp]);

  // Responsive
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Sound
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    if (typeof window === 'undefined') return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const s: Record<string, { f: number; d: number }> = {
        click: { f: 600, d: 0.1 }, success: { f: 800, d: 0.2 },
        failure: { f: 300, d: 0.3 }, transition: { f: 500, d: 0.15 }, complete: { f: 900, d: 0.4 }
      };
      const snd = s[type];
      osc.frequency.value = snd.f;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + snd.d);
      osc.start();
      osc.stop(ctx.currentTime + snd.d);
    } catch { /* */ }
  }, []);

  // Navigation
  const goToPhase = useCallback((p: Phase) => {
    playSound('transition');
    setPhase(p);
    if (onPhaseComplete) onPhaseComplete(p);
    if (onGameEvent) onGameEvent({ type: 'phase_change', data: { to: p } });
  }, [playSound, onPhaseComplete, onGameEvent]);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) goToPhase(phaseOrder[idx + 1]);
    else if (onComplete) onComplete();
  }, [phase, goToPhase, onComplete]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) goToPhase(phaseOrder[idx - 1]);
  }, [phase, goToPhase]);

  // State
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [selectedSolute, setSelectedSolute] = useState(0);
  const [soluteAmount, setSoluteAmount] = useState(10);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [testIndex, setTestIndex] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [confirmedTest, setConfirmedTest] = useState<Set<number>>(new Set());
  const [masteryScore, setMasteryScore] = useState<number | null>(null);

  // Derived
  const solute = solutes[selectedSolute];
  const tempChange = solute.tempChange * soluteAmount / 10;
  const finalTemp = 25 + tempChange;

  // Test questions
  const testQuestions = useMemo(() => [
    {
      scenario: "You are working in a sports medicine facility. An athlete just twisted their ankle on the field and needs immediate treatment.",
      question: "What makes a dissolution process endothermic?",
      options: [
        { text: "A) Water gets warmer during dissolution", correct: false },
        { text: "B) More energy is absorbed breaking bonds than released by hydration", correct: true },
        { text: "C) The solute disappears faster in warm water", correct: false },
        { text: "D) Bubbles form during the mixing process", correct: false }
      ]
    },
    {
      scenario: "A first-aid kit manufacturer needs to select the right compound for their instant cold packs used in emergency rooms across 500 hospitals.",
      question: "In an instant cold pack, what compound is typically used?",
      options: [
        { text: "A) Calcium chloride (CaCl2) - an exothermic salt", correct: false },
        { text: "B) Sodium chloride (NaCl) - common table salt", correct: false },
        { text: "C) Ammonium nitrate (NH4NO3) - an endothermic salt", correct: true },
        { text: "D) Sodium hydroxide (NaOH) - a caustic base", correct: false }
      ]
    },
    {
      scenario: "A highway maintenance crew is preparing for a winter storm. They need to choose between $2.5M worth of de-icing compounds.",
      question: "Why does calcium chloride make water warm when dissolved?",
      options: [
        { text: "A) It reacts chemically with water molecules", correct: false },
        { text: "B) Hydration energy released exceeds energy to break crystal lattice", correct: true },
        { text: "C) It is radioactive and emits thermal radiation", correct: false },
        { text: "D) Friction from dissolving generates mechanical heat", correct: false }
      ]
    },
    {
      scenario: "A materials science professor at MIT is explaining crystallography to 200 graduate students in a thermodynamics lecture.",
      question: "The 'lattice energy' refers to:",
      options: [
        { text: "A) Energy stored in water molecule hydrogen bonds", correct: false },
        { text: "B) Energy needed to break apart the crystal structure of a solid", correct: true },
        { text: "C) The total heat capacity of the resulting solution", correct: false },
        { text: "D) Energy released during ion hydration in solution", correct: false }
      ]
    },
    {
      scenario: "A pharmaceutical company is developing a new drug delivery system that relies on dissolution in biological fluids at 37\u00b0C body temperature.",
      question: "Hydration energy is:",
      options: [
        { text: "A) Always positive (energy absorbed from surroundings)", correct: false },
        { text: "B) Energy released when water molecules surround dissolved ions", correct: true },
        { text: "C) Simply the temperature of the water before dissolution", correct: false },
        { text: "D) Only relevant in exothermic reactions, not endothermic", correct: false }
      ]
    },
    {
      scenario: "A chemical engineer at BASF is calculating the cooling requirements for a new industrial dissolution reactor processing 150M tons annually.",
      question: "If a dissolution has net energy = +25 kJ/mol, it is:",
      options: [
        { text: "A) Exothermic \u2014 releases 25 kJ of heat per mole dissolved", correct: false },
        { text: "B) Endothermic \u2014 absorbs 25 kJ of heat per mole dissolved", correct: true },
        { text: "C) Neither endothermic nor exothermic at this value", correct: false },
        { text: "D) Both at once, depending on concentration", correct: false }
      ]
    },
    {
      scenario: "A consumer products company (ThermaCare) is deciding between sodium acetate and calcium chloride for their next-generation reusable hand warmers.",
      question: "Why do reusable hand warmers use sodium acetate instead of calcium chloride?",
      options: [
        { text: "A) Sodium acetate is significantly cheaper per kilogram", correct: false },
        { text: "B) Sodium acetate can be 'recharged' by heating to re-dissolve crystals", correct: true },
        { text: "C) Sodium acetate produces colder temperatures for pain relief", correct: false },
        { text: "D) Calcium chloride is too toxic for consumer skin contact", correct: false }
      ]
    },
    {
      scenario: "A chemistry teacher at a high school with a $5,000 lab budget needs to demonstrate temperature changes during dissolution to 120 students.",
      question: "Which salt would cool water the MOST when dissolved?",
      options: [
        { text: "A) NaCl (table salt) \u2014 nearly neutral dissolution", correct: false },
        { text: "B) CaCl2 (calcium chloride) \u2014 strongly exothermic", correct: false },
        { text: "C) NH4NO3 (ammonium nitrate) \u2014 strongly endothermic", correct: true },
        { text: "D) NaOH (sodium hydroxide) \u2014 moderately exothermic", correct: false }
      ]
    },
    {
      scenario: "A NASA engineer is designing thermal management systems for the International Space Station where energy conservation is critical at 400 km altitude.",
      question: "The first law of thermodynamics tells us that in dissolution:",
      options: [
        { text: "A) Energy is created by the chemical reaction", correct: false },
        { text: "B) Energy is destroyed when bonds break apart", correct: false },
        { text: "C) Energy is conserved \u2014 it transfers between system and surroundings", correct: true },
        { text: "D) Temperature must remain constant throughout the process", correct: false }
      ]
    },
    {
      scenario: "A Dow Chemical quality control lab is testing a batch of 500 kg of dissolution compounds for their industrial heating applications.",
      question: "In an exothermic dissolution, the solution:",
      options: [
        { text: "A) Gets colder as heat is absorbed from the water", correct: false },
        { text: "B) Gets warmer as excess hydration energy is released as heat", correct: true },
        { text: "C) Stays the same temperature due to energy conservation", correct: false },
        { text: "D) Freezes immediately from the rapid energy change", correct: false }
      ]
    }
  ], []);

  // Energy diagram SVG - generates the main interactive chart
  const generateEnergySVG = useCallback((soluteIdx: number, amount: number, interactive: boolean) => {
    const s = solutes[soluteIdx];
    const scale = amount / 10;
    // Ensure minimum visual amplitude for clear display (>= 60px vertical range)
    const bondH = Math.max(60, Math.min(Math.abs(s.bondEnergy) * scale * 3.0, 130));
    const hydH = Math.max(15, Math.min(Math.abs(s.hydrationEnergy) * scale * 2.0, 130));
    const netH = Math.max(20, Math.min(Math.abs(s.netEnergy) * scale * 2.0, 100));
    const isEndo = s.netEnergy > 0;
    const baseY = 140;

    // Generate curve points for energy profile (>= 10 L points)
    const curvePoints: string[] = [];
    for (let i = 0; i <= 20; i++) {
      const x = 40 + i * 16;
      const progress = i / 20;
      let y: number;
      if (progress < 0.3) {
        y = baseY - bondH * Math.sin(progress / 0.3 * Math.PI / 2);
      } else if (progress < 0.5) {
        const p2 = (progress - 0.3) / 0.2;
        y = baseY - bondH + (bondH + hydH) * p2;
      } else if (progress < 0.7) {
        const p3 = (progress - 0.5) / 0.2;
        y = baseY + hydH - hydH * p3;
      } else {
        const netY = isEndo ? -netH * 0.6 : netH * 0.4;
        const p4 = (progress - 0.7) / 0.3;
        y = baseY + netY * Math.sin(p4 * Math.PI / 2);
      }
      y = Math.max(15, Math.min(210, y));
      curvePoints.push(`L ${x} ${y}`);
    }
    const pathD = `M 40 ${baseY} ${curvePoints.join(' ')}`;

    // Interactive point position - moves with amount slider
    const interactiveIdx = Math.round((amount - 5) / 25 * 20);
    const ix = 40 + Math.min(Math.max(interactiveIdx, 0), 20) * 16;
    const iy = (() => {
      const progress = Math.min(Math.max(interactiveIdx, 0), 20) / 20;
      if (progress < 0.3) return baseY - bondH * Math.sin(progress / 0.3 * Math.PI / 2);
      if (progress < 0.5) { const p2 = (progress - 0.3) / 0.2; return baseY - bondH + (bondH + hydH) * p2; }
      if (progress < 0.7) { const p3 = (progress - 0.5) / 0.2; return baseY + hydH - hydH * p3; }
      const netY = isEndo ? -netH * 0.6 : netH * 0.4;
      const p4 = (progress - 0.7) / 0.3;
      return baseY + netY * Math.sin(p4 * Math.PI / 2);
    })();
    const clampedIy = Math.max(15, Math.min(210, iy));

    // Temperature and energy values
    const tChange = s.tempChange * amount / 10;

    return (
      <svg viewBox="0 0 400 240" style={{ width: '100%', maxWidth: 560 }}>
        <defs>
          <linearGradient id="endoBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="endoCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="40%" stopColor="#fbbf24" />
            <stop offset="60%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor={isEndo ? '#22c55e' : '#ef4444'} />
          </linearGradient>
          <radialGradient id="endoGlowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isEndo ? '#60a5fa' : '#f97316'} stopOpacity="0.6" />
            <stop offset="100%" stopColor={isEndo ? '#60a5fa' : '#f97316'} stopOpacity="0" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="barGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width="400" height="240" fill="url(#endoBg)" rx="12" />

        {/* Grid and axes group */}
        <g id="axes">
          {[50, 90, 130, 170, 210].map(y => (
            <line key={`gy${y}`} x1="40" y1={y} x2="370" y2={y} stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
          ))}
          {[100, 160, 220, 300, 360].map(x => (
            <line key={`gx${x}`} x1={x} y1="28" x2={x} y2="218" stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
          ))}
          <line x1="40" y1="28" x2="40" y2="218" stroke="#64748b" strokeWidth="1.5" />
          <line x1="40" y1={baseY} x2="370" y2={baseY} stroke="#64748b" strokeWidth="1.5" />
          <text x="12" y="125" fill="#e2e8f0" fontSize="11" textAnchor="middle" transform="rotate(-90, 12, 125)">Energy</text>
          <text x="205" y="230" fill="#e2e8f0" fontSize="11" textAnchor="middle">Reaction Progress</text>
          <text x="36" y={baseY + 4} fill="#e2e8f0" fontSize="11" textAnchor="end">0</text>
        </g>

        {/* Legend group - at top of SVG */}
        <g id="legend">
          <rect x="42" y="12" width="8" height="8" fill="#f97316" rx="2" />
          <text x="54" y="20" fill="#e2e8f0" fontSize="11">Lattice</text>
          <rect x="120" y="12" width="8" height="8" fill="#3b82f6" rx="2" />
          <text x="132" y="20" fill="#e2e8f0" fontSize="11">Hydration</text>
          <rect x="215" y="12" width="8" height="8" fill={isEndo ? '#22c55e' : '#ef4444'} rx="2" />
          <text x="227" y="20" fill="#e2e8f0" fontSize="11">Net: {(s.netEnergy * scale).toFixed(1)} kJ</text>
        </g>

        {/* Energy curve group */}
        <g id="curve">
          {/* Area fill */}
          <path d={`${pathD} L 360 ${baseY} L 40 ${baseY} Z`} fill={isEndo ? 'rgba(96,165,250,0.08)' : 'rgba(249,115,22,0.08)'} />
          {/* Main curve */}
          <path d={pathD} fill="none" stroke="url(#endoCurveGrad)" strokeWidth="3" strokeLinecap="round" />
          {/* Temperature change display - right side */}
          <text x="345" y="50" fill={isEndo ? '#86efac' : '#fca5a5'} fontSize="11" textAnchor="middle" fontWeight="bold">
            {isEndo ? 'ENDO' : 'EXOTH'}
          </text>
          <text x="345" y="66" fill="#f8fafc" fontSize="11" textAnchor="middle">
            ΔT={tChange > 0 ? '+' : ''}{tChange.toFixed(1)}°C
          </text>
        </g>

        {/* Interactive point */}
        {interactive && (
          <>
            <circle cx={ix} cy={clampedIy} r={20} fill="url(#endoGlowGrad)" opacity="0.4" />
            <circle cx={ix} cy={clampedIy} r={8} fill={isEndo ? '#60a5fa' : '#f97316'} filter="url(#glow)" stroke="#fff" strokeWidth={2} />
          </>
        )}
      </svg>
    );
  }, [tempChange]);

  // Progress bar
  const renderProgressBar = () => {
    const idx = phaseOrder.indexOf(phase);
    const pct = ((idx + 1) / phaseOrder.length) * 100;
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1002, height: '4px', background: 'rgba(30,41,59,0.8)' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: design.accentGradient, transition: 'width 0.4s ease', borderRadius: '0 2px 2px 0' }} />
      </div>
    );
  };

  // Nav dots
  const renderNavDots = () => (
    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', padding: '4px 0' }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          aria-label={phaseLabels[p]}
          onClick={() => goToPhase(p)}
          style={{
            minHeight: '44px', width: '18px', border: 'none', background: 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px',
          }}
        >
          <div style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: p === phase ? design.accent : phaseOrder.indexOf(phase) > i ? design.success : 'rgba(100,116,139,0.4)',
            transition: 'all 0.3s ease',
          }} />
        </button>
      ))}
    </div>
  );

  // Bottom nav
  const renderBottomNav = (canNext: boolean, nextLabel: string) => {
    const idx = phaseOrder.indexOf(phase);
    return (
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1001,
        background: 'rgba(15,23,42,0.98)', borderTop: '1px solid rgba(148,163,184,0.15)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.5)', padding: '10px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        <button
          onClick={goBack}
          disabled={idx === 0}
          style={{
            padding: '12px 24px', minHeight: '44px', borderRadius: '12px',
            border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(255,255,255,0.05)',
            color: idx === 0 ? '#64748b' : '#e2e8f0', fontWeight: 600,
            cursor: idx === 0 ? 'not-allowed' : 'pointer', fontSize: '14px',
            transition: 'all 0.2s ease',
          }}
        >
          \u2190 Back
        </button>
        {renderNavDots()}
        <button
          onClick={canNext ? goNext : undefined}
          disabled={!canNext}
          style={{
            padding: '12px 24px', minHeight: '44px', borderRadius: '12px', border: 'none',
            background: canNext ? design.accentGradient : 'rgba(255,255,255,0.05)',
            color: canNext ? 'white' : '#64748b', fontWeight: 700,
            cursor: canNext ? 'pointer' : 'not-allowed', fontSize: '14px',
            boxShadow: canNext ? '0 4px 20px rgba(59,130,246,0.4)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          {nextLabel}
        </button>
      </nav>
    );
  };

  // Outer wrapper for every phase - render function (NOT a component) to avoid unmount/remount on state changes
  const renderPhaseWrapper = (canNext: boolean, nextLabel: string, children: React.ReactNode) => (
    <div
      data-muted-colors="rgba(148,163,184,0.7) #94a3b8 #64748b"
      style={{
        display: 'flex', flexDirection: 'column', minHeight: '100dvh',
        background: design.bg, overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: design.textPrimary,
      }}
    >
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '16px', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
      {renderBottomNav(canNext, nextLabel)}
    </div>
  );

  // Slider styling
  const sliderStyle: React.CSSProperties = {
    width: '100%', height: '20px', touchAction: 'pan-y' as const,
    WebkitAppearance: 'none' as const, accentColor: '#3b82f6',
    borderRadius: '4px', cursor: 'pointer',
    background: `linear-gradient(to right, ${design.accent} 0%, ${design.bgGlow} 100%)`,
  };

  // Card style
  const cardStyle: React.CSSProperties = {
    background: 'rgba(30,41,59,0.6)', borderRadius: '16px', padding: '24px',
    border: '1px solid rgba(71,85,105,0.3)', boxShadow: design.shadow,
    transition: 'all 0.3s ease',
  };

  // Applications data
  const applications = useMemo(() => [
    {
      icon: '\ud83e\udde4', title: 'Hand Warmers and Cold Packs', short: 'Consumer Products',
      description: 'Portable heating and cooling products harness the power of endothermic and exothermic reactions to provide on-demand temperature relief. Hand warmers manufactured by HotHands and Grabber use iron oxidation or supersaturated sodium acetate crystallization to generate heat at 54\u00b0C peak temperature, while instant cold packs from ThermaCare and Ace Brand rely on ammonium nitrate dissolution to absorb heat from surroundings, reaching 0-5\u00b0C within seconds. The global hand warmer and cold pack market is valued at $2.5B annually, with over 200M units sold per year across medical, sports, and consumer applications.',
      stats: ['0-5\u00b0C cold pack temp', '54\u00b0C hand warmer peak', '$2.5B market size'],
      companies: ['HotHands', 'Grabber', 'ThermaCare', 'Ace Brand', 'Carex'],
      color: '#3b82f6',
    },
    {
      icon: '\ud83d\ude80', title: 'Rocket Propulsion', short: 'Aerospace Engineering',
      description: 'Rocket engines at SpaceX, NASA, and Blue Origin are perhaps the most dramatic application of exothermic reactions. The controlled combustion of propellants releases enormous amounts of energy at 3,500\u00b0C, converting chemical potential energy into 35 MN of kinetic thrust that propels rockets to 11.2 km/s escape velocity. The Falcon 9 uses RP-1 kerosene with liquid oxygen, while solid rocket boosters use aluminum powder with ammonium perchlorate in precisely engineered exothermic reactions.',
      stats: ['3,500\u00b0C combustion', '11.2 km/s escape velocity', '35 MN Saturn V thrust'],
      companies: ['SpaceX', 'NASA', 'Blue Origin', 'Rocket Lab', 'Aerojet Rocketdyne'],
      color: '#f97316',
    },
    {
      icon: '\ud83c\udfed', title: 'Industrial Chemical Processes', short: 'Manufacturing',
      description: 'Industrial chemistry at companies like BASF, Dow Chemical, and DuPont relies heavily on understanding and managing endothermic and exothermic reactions. The Haber-Bosch process produces 150M tons of ammonia annually at 450\u00b0C, while the global chemical industry valued at $5T must carefully control dissolution energetics. Cement production uses endothermic calcination followed by exothermic hydration, and sulfuric acid manufacturing uses the exothermic contact process.',
      stats: ['150M tons ammonia/year', '450\u00b0C Haber process', '$5T chemical industry'],
      companies: ['BASF', 'Dow Chemical', 'DuPont', 'LyondellBasell', 'SABIC'],
      color: '#22c55e',
    },
    {
      icon: '\ud83d\udc68\u200d\ud83c\udf73', title: 'Cooking and Food Science', short: 'Culinary',
      description: 'Cooking is applied chemistry at organizations like Modernist Cuisine and Americas Test Kitchen, with endothermic and exothermic reactions transforming raw ingredients. The Maillard reaction occurs at 140-165\u00b0C, caramelization starts at 170\u00b0C, and egg protein coagulation happens at 62\u00b0C. Dissolving salt in ice cream mixture is endothermic, enabling sub-zero freezing, while baking soda reacting with acid releases CO2 (exothermic) for leavening in industrial bakeries processing 500 kg per batch.',
      stats: ['140-165\u00b0C Maillard range', '170\u00b0C caramelization', '62\u00b0C egg coagulation'],
      companies: ['Modernist Cuisine', 'ChefSteps', 'Serious Eats', 'Americas Test Kitchen'],
      color: '#ec4899',
    },
  ], []);

  // ============================================================================
  // HOOK PHASE
  // ============================================================================
  if (phase === 'hook') {
    return (
      renderPhaseWrapper(true, "Start Prediction \u2192", <>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '8px 20px', background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.25)', borderRadius: '9999px', marginBottom: '32px',
          }}>
            <span style={{ width: '8px', height: '8px', background: design.accent, borderRadius: '50%' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: design.accent, letterSpacing: '2px' }}>THERMOCHEMISTRY</span>
          </div>

          <h1 style={{
            fontSize: isMobile ? '32px' : '42px', fontWeight: 900, lineHeight: 1.1,
            marginBottom: '16px', background: 'linear-gradient(135deg, #fff, #93c5fd, #60a5fa)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Can Dissolving Make Things Hot or Cold?
          </h1>

          <p style={{ fontSize: '18px', color: design.textSecondary, maxWidth: '480px', marginBottom: '40px', lineHeight: 1.6, fontWeight: 400 }}>
            Discover the energy battle inside every dissolving crystal. Let's explore how the same process can produce opposite effects.
          </p>

          <div style={{ ...cardStyle, maxWidth: '560px', width: '100%' }}>
            <p style={{ fontSize: '16px', color: design.textSecondary, lineHeight: 1.7, fontWeight: 400, marginBottom: '16px' }}>
              Drop some salt into water, and the temperature changes.
              But some salts make it <span style={{ color: '#60a5fa', fontWeight: 700 }}>colder</span>,
              while others make it <span style={{ color: '#ef4444', fontWeight: 700 }}>hotter</span>!
              The same process \u2014 dissolving \u2014 but opposite effects. How can this be?
            </p>
            <p style={{ fontSize: '15px', color: design.warning, fontWeight: 600 }}>
              It's all about the energy balance inside the solution.
            </p>
          </div>

          <div style={{ marginTop: '40px', display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {['\u2728 Interactive Lab', '\u2696\ufe0f Compare Salts', '\ud83c\udf0d Real Applications'].map(item => (
              <span key={item} style={{ fontSize: '13px', color: design.textMuted, fontWeight: 500 }}>{item}</span>
            ))}
          </div>
        </div>
      </>)
    );
  }

  // ============================================================================
  // PREDICT PHASE
  // ============================================================================
  if (phase === 'predict') {
    return (
      renderPhaseWrapper(!!prediction, "Explore in the Lab \u2192", <>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: design.textPrimary, marginBottom: '24px' }}>Make Your Prediction</h2>

          <svg viewBox="0 0 400 220" style={{ width: '100%', maxWidth: 500, marginBottom: '24px' }}>
            <defs>
              <linearGradient id="predBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0f172a" /><stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
            </defs>
            <rect width="400" height="220" fill="url(#predBg)" rx="12" />
            {[60, 100, 140, 180].map(y => (
              <line key={y} x1="30" y1={y} x2="370" y2={y} stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
            ))}
            <rect x="40" y="50" width="100" height="100" fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="2" rx="8" />
            <text x="90" y="85" fill="#60a5fa" fontSize="14" textAnchor="middle" fontWeight="bold">Cold Pack</text>
            <text x="90" y="105" fill="#e2e8f0" fontSize="12" textAnchor="middle">NH4NO3</text>
            <text x="90" y="125" fill="#60a5fa" fontSize="12" textAnchor="middle">Endothermic</text>
            <text x="200" y="110" fill="#fbbf24" fontSize="28" textAnchor="middle">?</text>
            <text x="200" y="140" fill="#e2e8f0" fontSize="12" textAnchor="middle">What determines this?</text>
            <rect x="260" y="50" width="100" height="100" fill="rgba(239,68,68,0.15)" stroke="#ef4444" strokeWidth="2" rx="8" />
            <text x="310" y="85" fill="#f87171" fontSize="14" textAnchor="middle" fontWeight="bold">Hot Pack</text>
            <text x="310" y="105" fill="#e2e8f0" fontSize="12" textAnchor="middle">CaCl2</text>
            <text x="310" y="125" fill="#f87171" fontSize="12" textAnchor="middle">Exothermic</text>
            <text x="200" y="200" fill="#94a3b8" fontSize="11" textAnchor="middle">Energy Balance \u2192 Temperature Change</text>
          </svg>

          <div style={{ ...cardStyle, maxWidth: '600px', width: '100%', marginBottom: '24px' }}>
            <p style={{ fontSize: '16px', color: design.textSecondary, marginBottom: '12px', lineHeight: 1.6 }}>
              When ammonium nitrate dissolves in water, it gets very cold. But calcium chloride makes it hot.
            </p>
            <p style={{ fontSize: '16px', color: '#60a5fa', fontWeight: 600 }}>
              What determines whether dissolving creates heat or absorbs it?
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '600px' }}>
            {[
              { id: 'A', text: 'The physical size of the salt crystals' },
              { id: 'B', text: 'The balance between bond-breaking energy and hydration energy' },
              { id: 'C', text: 'How fast you stir the solution' },
              { id: 'D', text: 'The initial temperature of the water' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  setPrediction(opt.id);
                  playSound(opt.id === 'B' ? 'success' : 'failure');
                  if (opt.id === 'B') onCorrectAnswer?.(); else onIncorrectAnswer?.();
                }}
                disabled={!!prediction}
                style={{
                  padding: '16px 20px', borderRadius: '12px', textAlign: 'left',
                  transition: 'all 0.3s ease', cursor: prediction ? 'default' : 'pointer',
                  background: prediction === opt.id
                    ? (opt.id === 'B' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)')
                    : prediction && opt.id === 'B' ? 'rgba(16,185,129,0.3)' : 'rgba(30,41,59,0.6)',
                  border: `2px solid ${prediction === opt.id
                    ? (opt.id === 'B' ? '#10b981' : '#ef4444')
                    : prediction && opt.id === 'B' ? '#10b981' : 'transparent'}`,
                  color: design.textSecondary, fontSize: '15px', fontWeight: 500,
                }}
              >
                <span style={{ fontWeight: 700, color: '#fff' }}>{opt.id})</span>{' '}
                {opt.text}
              </button>
            ))}
          </div>

          {prediction && (
            <div style={{ ...cardStyle, maxWidth: '600px', marginTop: '20px', border: '1px solid #10b981' }}>
              <p style={{ color: '#10b981', fontWeight: 600, fontSize: '15px', lineHeight: 1.6 }}>
                {prediction === 'B'
                  ? 'Correct! Dissolving involves two competing energy processes: breaking the crystal lattice (absorbs energy) and hydration of ions by water (releases energy). The balance determines heating or cooling!'
                  : 'Not quite. The real answer is B: the balance between bond-breaking energy and hydration energy. Let\'s explore this in the lab!'}
              </p>
            </div>
          )}
        </div>
      </>)
    );
  }

  // ============================================================================
  // PLAY PHASE
  // ============================================================================
  if (phase === 'play') {
    return (
      renderPhaseWrapper(true, "Understand Why \u2192", <>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Dissolution Energy Lab</h2>
          <p style={{ color: design.textSecondary, marginBottom: '8px', fontSize: '15px', lineHeight: 1.6, textAlign: 'center', maxWidth: '600px' }}>
            Observe how the energy balance between lattice energy and hydration energy determines whether the solution gets hotter or colder. When you increase the solute amount, notice how the temperature change scales proportionally because more moles means more net energy is absorbed or released.
          </p>
          <p style={{ color: design.textSecondary, fontSize: '13px', marginBottom: '16px', textAlign: 'center', maxWidth: '600px' }}>
            The net enthalpy of dissolution is calculated as: ΔH_diss = Lattice Energy + Hydration Energy. This formula describes how the relationship between bond-breaking and hydration leads to the observed temperature change. This is exactly how cold packs and hot packs work — a practical application used in real-world emergency medicine and industrial heating.
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            maxWidth: '900px',
          }}>
          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
          {/* Interactive SVG */}
          <div style={{ width: '100%', marginBottom: '16px' }}>
            {generateEnergySVG(selectedSolute, soluteAmount, true)}
          </div>

          {/* Formula */}
          <div style={{
            padding: '12px 24px', borderRadius: '12px', marginBottom: '16px',
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
            textAlign: 'center',
          }}>
            <span style={{ fontFamily: 'monospace', fontSize: '15px', color: design.textPrimary, fontWeight: 700 }}>
              \u0394H = E_lattice + E_hydration = {(solute.bondEnergy * soluteAmount / 10).toFixed(1)} + ({(solute.hydrationEnergy * soluteAmount / 10).toFixed(1)}) = {(solute.netEnergy * soluteAmount / 10).toFixed(1)} kJ
            </span>
          </div>
          </div>

          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          {/* Controls */}
          <div style={{ ...cardStyle, width: '100%', marginBottom: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: design.textPrimary, marginBottom: '8px' }}>
                Select Solute:
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {solutes.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedSolute(i)}
                    style={{
                      padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                      background: selectedSolute === i ? s.color : 'rgba(51,65,85,0.5)',
                      border: selectedSolute === i ? `2px solid ${s.color}` : '2px solid transparent',
                      color: '#fff', fontSize: '13px', fontWeight: 600,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {s.name} ({s.formula})
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: design.textPrimary, marginBottom: '8px' }}>
                Solute Amount: <strong style={{ color: '#fbbf24', fontSize: '16px' }}>{soluteAmount}g</strong> in 100mL water — ΔT = <strong style={{ color: finalTemp >= 25 ? '#f87171' : '#60a5fa' }}>{tempChange > 0 ? '+' : ''}{tempChange.toFixed(1)}°C</strong>
              </p>
              <input
                type="range" min="5" max="30" value={soluteAmount}
                onChange={e => setSoluteAmount(Number(e.target.value) || 10)}
                onInput={e => setSoluteAmount(Number((e.target as HTMLInputElement).value) || 10)}
                style={sliderStyle}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: design.textSecondary, marginTop: '4px' }}>
                <span>5g (min)</span><span>30g (max)</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div style={{
            ...cardStyle, width: '100%',
            background: solute.netEnergy > 0 ? 'rgba(59,130,246,0.1)' : 'rgba(249,115,22,0.1)',
            border: `1px solid ${solute.netEnergy > 0 ? 'rgba(59,130,246,0.3)' : 'rgba(249,115,22,0.3)'}`,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', textAlign: 'center' }}>
              <div>
                <p style={{ fontSize: '18px', fontWeight: 800, color: '#fbbf24' }}>+{(solute.bondEnergy * soluteAmount / 10).toFixed(1)}</p>
                <p style={{ fontSize: '12px', color: design.textSecondary }}>Bond Breaking (kJ)</p>
              </div>
              <div>
                <p style={{ fontSize: '18px', fontWeight: 800, color: '#93c5fd' }}>{(solute.hydrationEnergy * soluteAmount / 10).toFixed(1)}</p>
                <p style={{ fontSize: '12px', color: design.textSecondary }}>Hydration (kJ)</p>
              </div>
              <div>
                <p style={{ fontSize: '18px', fontWeight: 800, color: solute.netEnergy > 0 ? '#86efac' : '#fca5a5' }}>
                  {solute.netEnergy > 0 ? '+' : ''}{(solute.netEnergy * soluteAmount / 10).toFixed(1)}
                </p>
                <p style={{ fontSize: '12px', color: design.textSecondary }}>Net (kJ) → {finalTemp.toFixed(1)}°C</p>
              </div>
            </div>
          </div>
          </div>
          </div>
        </div>
      </>)
    );
  }

  // ============================================================================
  // REVIEW PHASE
  // ============================================================================
  if (phase === 'review') {
    return (
      renderPhaseWrapper(true, "Discover a Twist \u2192", <>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px' }}>The Science of Dissolution Energy</h2>

          <div style={{ ...cardStyle, maxWidth: '600px', marginBottom: '16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <p style={{ color: design.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
              As you observed in the experiment, dissolving different salts produces dramatically different temperature changes. You predicted how energy balance works — recall that the key is whether bond-breaking energy exceeds hydration energy. Earlier you saw this principle in action with real compounds!
            </p>
          </div>

          {prediction && (
            <div style={{
              ...cardStyle, maxWidth: '600px', marginBottom: '24px',
              background: prediction === 'B' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              border: `1px solid ${prediction === 'B' ? '#10b981' : '#ef4444'}`,
            }}>
              <p style={{ color: design.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
                You predicted that <strong>{prediction === 'B' ? 'the balance between bond-breaking energy and hydration energy' : 'other factors'}</strong> determine whether dissolving creates heat or absorbs it.
                {prediction === 'B' ? ' You were right! The lab confirmed your prediction.' : ' The lab showed that the energy balance is the real answer.'}
              </p>
            </div>
          )}

          <svg viewBox="0 0 400 220" style={{ width: '100%', maxWidth: '500px', marginBottom: '24px' }}>
            <defs>
              <linearGradient id="revBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0f172a" /><stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
            </defs>
            <rect width="400" height="220" fill="url(#revBg)" rx="12" />
            {[60, 100, 140, 180].map(y => (
              <line key={y} x1="20" y1={y} x2="380" y2={y} stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
            ))}
            <rect x="20" y="50" width="110" height="110" fill="rgba(249,115,22,0.15)" stroke="#f97316" strokeWidth="2" rx="8" />
            <text x="75" y="80" fill="#f97316" fontSize="13" textAnchor="middle" fontWeight="bold">Bond Breaking</text>
            <text x="75" y="100" fill="#e2e8f0" fontSize="12" textAnchor="middle">Absorbs Energy</text>
            <text x="75" y="120" fill="#fbbf24" fontSize="12" textAnchor="middle">+E (Endothermic)</text>
            <text x="155" y="110" fill="#e2e8f0" fontSize="24" textAnchor="middle">+</text>
            <rect x="175" y="50" width="110" height="110" fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="2" rx="8" />
            <text x="230" y="80" fill="#3b82f6" fontSize="13" textAnchor="middle" fontWeight="bold">Hydration</text>
            <text x="230" y="100" fill="#e2e8f0" fontSize="12" textAnchor="middle">Releases Energy</text>
            <text x="230" y="120" fill="#60a5fa" fontSize="12" textAnchor="middle">-E (Exothermic)</text>
            <text x="310" y="110" fill="#e2e8f0" fontSize="24" textAnchor="middle">=</text>
            <rect x="330" y="50" width="60" height="110" fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="2" rx="8" />
            <text x="360" y="85" fill="#10b981" fontSize="12" textAnchor="middle" fontWeight="bold">Net</text>
            <text x="360" y="105" fill="#e2e8f0" fontSize="11" textAnchor="middle">Result</text>
            <text x="360" y="125" fill="#22c55e" fontSize="11" textAnchor="middle">Hot/Cold</text>
            <text x="200" y="200" fill="#94a3b8" fontSize="11" textAnchor="middle">Energy Balance = Temperature Change</text>
          </svg>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', maxWidth: '600px', width: '100%' }}>
            <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(234,179,8,0.15))', border: '1px solid rgba(249,115,22,0.3)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f97316', marginBottom: '8px' }}>Step 1: Breaking Bonds</h3>
              <p style={{ color: design.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
                Crystal lattice energy must be overcome to separate ions. This always requires energy input.
              </p>
            </div>
            <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(6,182,212,0.15))', border: '1px solid rgba(59,130,246,0.3)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#3b82f6', marginBottom: '8px' }}>Step 2: Hydration</h3>
              <p style={{ color: design.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
                Water molecules surround each ion (solvation). This always releases energy to the surroundings.
              </p>
            </div>
          </div>
        </div>
      </>)
    );
  }

  // ============================================================================
  // TWIST PREDICT PHASE
  // ============================================================================
  if (phase === 'twist_predict') {
    return (
      renderPhaseWrapper(!!twistPrediction, "Compare All Salts \u2192", <>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: design.warning, marginBottom: '24px' }}>New Variable: The Ranking Twist</h2>

          <svg viewBox="0 0 400 200" style={{ width: '100%', maxWidth: 500, marginBottom: '24px' }}>
            <defs>
              <linearGradient id="twPredBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0f172a" /><stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
            </defs>
            <rect width="400" height="200" fill="url(#twPredBg)" rx="12" />
            {[60, 100, 140].map(y => (
              <line key={y} x1="20" y1={y} x2="380" y2={y} stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
            ))}
            {solutes.map((s, i) => (
              <g key={i}>
                <rect x={25 + i * 95} y="30" width="80" height="130" fill={`${s.color}20`} stroke={s.color} strokeWidth="1.5" rx="8" />
                <text x={65 + i * 95} y="55" fill={s.color} fontSize="12" textAnchor="middle" fontWeight="bold">{s.name.split(' ')[0]}</text>
                <text x={65 + i * 95} y="75" fill="#e2e8f0" fontSize="11" textAnchor="middle">{s.formula}</text>
                <text x={65 + i * 95} y="105" fill={s.netEnergy > 0 ? '#60a5fa' : '#f87171'} fontSize="11" textAnchor="middle">
                  {s.netEnergy > 0 ? 'Endo' : 'Exo'}
                </text>
                <text x={65 + i * 95} y="125" fill="#e2e8f0" fontSize="11" textAnchor="middle">{s.tempChange}\u00b0C</text>
              </g>
            ))}
            <text x="200" y="185" fill="#94a3b8" fontSize="12" textAnchor="middle">Which produces the coldest result?</text>
          </svg>

          <div style={{ ...cardStyle, maxWidth: '600px', marginBottom: '24px' }}>
            <p style={{ fontSize: '16px', color: design.textSecondary, marginBottom: '12px', lineHeight: 1.6 }}>
              You want to create the COLDEST possible instant cold pack. Watch how each salt's energy balance differs.
            </p>
            <p style={{ fontSize: '16px', color: design.warning, fontWeight: 600 }}>
              How would you rank these salts by cooling power?
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '600px' }}>
            {[
              { id: 'A', text: 'NaOH > CaCl2 > NaCl > NH4NO3' },
              { id: 'B', text: 'CaCl2 > NaOH > NH4NO3 > NaCl' },
              { id: 'C', text: 'NH4NO3 > NaCl > CaCl2 > NaOH (only endothermic ones cool!)' },
              { id: 'D', text: 'They all cool equally \u2014 it depends only on amount used' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  setTwistPrediction(opt.id);
                  playSound(opt.id === 'C' ? 'success' : 'failure');
                  if (opt.id === 'C') onCorrectAnswer?.(); else onIncorrectAnswer?.();
                }}
                disabled={!!twistPrediction}
                style={{
                  padding: '16px 20px', borderRadius: '12px', textAlign: 'left',
                  transition: 'all 0.3s ease', cursor: twistPrediction ? 'default' : 'pointer',
                  background: twistPrediction === opt.id
                    ? (opt.id === 'C' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)')
                    : twistPrediction && opt.id === 'C' ? 'rgba(16,185,129,0.3)' : 'rgba(30,41,59,0.6)',
                  border: `2px solid ${twistPrediction === opt.id
                    ? (opt.id === 'C' ? '#10b981' : '#ef4444')
                    : twistPrediction && opt.id === 'C' ? '#10b981' : 'transparent'}`,
                  color: design.textSecondary, fontSize: '15px', fontWeight: 500,
                }}
              >
                <span style={{ fontWeight: 700, color: '#fff' }}>{opt.id})</span>{' '}
                {opt.text}
              </button>
            ))}
          </div>
        </div>
      </>)
    );
  }

  // ============================================================================
  // TWIST PLAY PHASE
  // ============================================================================
  if (phase === 'twist_play') {
    const twistSolute = solutes[selectedSolute];
    const twistAmount = soluteAmount;
    const twistTempChange = twistSolute.tempChange * twistAmount / 10;
    return (
      renderPhaseWrapper(true, "See Full Explanation \u2192", <>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: design.warning, marginBottom: '16px' }}>Compare All Salts Side-by-Side</h2>
          <p style={{ color: design.textSecondary, marginBottom: '16px', fontSize: '15px', lineHeight: 1.6, textAlign: 'center', maxWidth: '600px' }}>
            Adjust the solute and amount to see how the energy diagram changes. Notice how only endothermic salts produce a cooling effect. Try adjusting the slider to simulate different concentrations.
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            maxWidth: '900px',
          }}>
          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
          <div style={{ width: '100%', marginBottom: '16px' }}>
            {generateEnergySVG(selectedSolute, twistAmount, true)}
          </div>
          </div>

          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          <div style={{ ...cardStyle, width: '100%', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: design.accent, marginBottom: '8px' }}>
              Select Solute to Compare:
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {solutes.map((s, i) => (
                <button key={i} onClick={() => setSelectedSolute(i)} style={{
                  padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
                  background: selectedSolute === i ? s.color : 'rgba(51,65,85,0.5)',
                  border: selectedSolute === i ? `2px solid ${s.color}` : '2px solid transparent',
                  color: '#fff', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s ease',
                }}>
                  {s.name}
                </button>
              ))}
            </div>

            <p style={{ fontSize: '13px', fontWeight: 700, color: design.accentSecondary, marginBottom: '8px' }}>
              Amount: {twistAmount}g
            </p>
            <input
              type="range" min="5" max="30" value={soluteAmount}
              onChange={e => setSoluteAmount(parseInt(e.target.value))}
              onInput={e => setSoluteAmount(parseInt((e.target as HTMLInputElement).value))}
              style={sliderStyle}
            />
          </div>
          </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', maxWidth: '600px', width: '100%' }}>
            {solutes.map((s, i) => (
              <div key={i} style={{
                ...cardStyle, padding: '16px', textAlign: 'center',
                border: `2px solid ${s.color}`, background: `${s.color}10`,
              }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{s.name}</p>
                <p style={{ fontSize: '12px', color: design.textMuted, marginBottom: '8px' }}>{s.formula}</p>
                <p style={{ fontSize: '18px', fontWeight: 800, color: s.netEnergy > 0 ? '#60a5fa' : '#f87171' }}>
                  {s.netEnergy > 0 ? '+' : ''}{s.netEnergy.toFixed(1)} kJ/mol
                </p>
                <p style={{ fontSize: '12px', color: s.netEnergy > 0 ? '#60a5fa' : '#f87171' }}>
                  {s.tempChange > 0 ? '+' : ''}{s.tempChange}\u00b0C per 10g
                </p>
              </div>
            ))}
          </div>
        </div>
      </>)
    );
  }

  // ============================================================================
  // TWIST REVIEW PHASE
  // ============================================================================
  if (phase === 'twist_review') {
    return (
      renderPhaseWrapper(true, "Explore Applications \u2192", <>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: design.warning, marginBottom: '24px' }}>The Energy Balance Determines Everything</h2>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', maxWidth: '600px', width: '100%' }}>
            <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(6,182,212,0.15))', border: '1px solid rgba(59,130,246,0.3)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#60a5fa', marginBottom: '8px' }}>Endothermic Winners</h3>
              <p style={{ color: design.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
                <strong>NH4NO3:</strong> Classic cold pack material. Lattice energy far exceeds hydration energy, absorbing heat aggressively (-8\u00b0C per 10g).
              </p>
            </div>
            <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(249,115,22,0.15))', border: '1px solid rgba(239,68,68,0.3)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f87171', marginBottom: '8px' }}>Exothermic Winners</h3>
              <p style={{ color: design.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
                <strong>CaCl2:</strong> Hot pack and ice melt material. High hydration energy dominates, releasing lots of heat (+12\u00b0C per 10g).
              </p>
            </div>
          </div>

          <div style={{ ...cardStyle, maxWidth: '600px', marginTop: '16px', background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.2)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: design.textPrimary, marginBottom: '8px' }}>Nearly Neutral: NaCl</h3>
            <p style={{ color: design.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Table salt has nearly perfect balance between lattice and hydration energy. Slight endothermic effect (-0.5\u00b0C) is barely noticeable. That's why salt water doesn't feel dramatically hot or cold!
            </p>
          </div>
        </div>
      </>)
    );
  }

  // ============================================================================
  // TRANSFER PHASE
  // ============================================================================
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Endothermic Exothermic"
        applications={applications}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        playSound={playSound}
      />
    );
  }

  if (phase === 'transfer') {
    const app = applications[activeApp];
    return (
      renderPhaseWrapper(completedApps.size >= applications.length, "Take the Test", <>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px', textAlign: 'center' }}>Real-World Applications</h2>

          {/* App tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {applications.map((a, i) => (
              <button
                key={i}
                onClick={() => setActiveApp(i)}
                style={{
                  padding: '8px 16px', borderRadius: '10px', cursor: 'pointer',
                  background: activeApp === i ? design.accentGradient : completedApps.has(i) ? 'rgba(16,185,129,0.2)' : 'rgba(30,41,59,0.6)',
                  border: `1px solid ${completedApps.has(i) ? '#10b981' : 'transparent'}`,
                  color: '#fff', fontWeight: 600, fontSize: '13px',
                  transition: 'all 0.2s ease',
                }}
              >
                {completedApps.has(i) ? '\u2713' : a.icon} {a.short}
              </button>
            ))}
          </div>

          {/* App content card */}
          <div style={{ ...cardStyle, maxWidth: '640px', width: '100%', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '36px' }}>{app.icon}</span>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>{app.title}</h3>
                <p style={{ fontSize: '13px', color: design.textMuted }}>{app.short}</p>
              </div>
            </div>

            <p style={{ fontSize: '15px', color: design.textSecondary, lineHeight: 1.7, marginBottom: '16px' }}>
              {app.description}
            </p>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{ padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', fontWeight: 800, color: app.color }}>{stat.split(' ')[0]}</p>
                  <p style={{ fontSize: '11px', color: design.textMuted }}>{stat.split(' ').slice(1).join(' ')}</p>
                </div>
              ))}
            </div>

            {/* Companies */}
            <p style={{ fontSize: '12px', color: design.textMuted, marginBottom: '16px' }}>
              Companies: {app.companies.join(', ')}
            </p>

            {/* Got It button */}
            {!completedApps.has(activeApp) ? (
              <button
                onClick={() => {
                  playSound('complete');
                  const next = new Set(completedApps);
                  next.add(activeApp);
                  setCompletedApps(next);
                  if (activeApp < applications.length - 1) setTimeout(() => setActiveApp(activeApp + 1), 300);
                }}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                  background: design.accentGradient, color: '#fff', fontWeight: 700,
                  fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s ease',
                  boxShadow: '0 4px 20px rgba(59,130,246,0.4)',
                }}
              >
                Got It
              </button>
            ) : (
              <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', textAlign: 'center', color: '#10b981', fontWeight: 700 }}>
                \u2713 Completed
              </div>
            )}
          </div>

          {/* Progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
            <span style={{ color: design.textMuted, fontSize: '13px' }}>Progress:</span>
            {applications.map((_, i) => (
              <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: completedApps.has(i) ? '#10b981' : '#475569' }} />
            ))}
            <span style={{ color: design.textSecondary, fontSize: '13px' }}>{completedApps.size}/{applications.length}</span>
          </div>
        </div>
      </>)
    );
  }

  // ============================================================================
  // TEST PHASE
  // ============================================================================
  if (phase === 'test') {
    if (testSubmitted) {
      const score = testAnswers.reduce((acc, ans, i) => acc + (ans !== null && testQuestions[i].options[ans]?.correct ? 1 : 0), 0);
      const passed = score >= 7;
      return (
        renderPhaseWrapper(true, 'Complete Lesson', <>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>{passed ? '\ud83c\udfc6' : '\ud83d\udcda'}</div>
            <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px' }}>
              Test Complete! {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ fontSize: '48px', fontWeight: 900, color: design.accent, marginBottom: '16px' }}>{score}/10</p>
            <p style={{ color: design.textSecondary, fontSize: '16px', marginBottom: '24px', textAlign: 'center' }}>
              {passed ? 'You\'ve mastered dissolution thermodynamics!' : 'Review the concepts and try again.'}
            </p>

            <div style={{ maxWidth: '600px', width: '100%' }}>
              {testQuestions.map((q, i) => {
                const ans = testAnswers[i];
                const correct = ans !== null && q.options[ans]?.correct;
                return (
                  <div key={i} style={{
                    ...cardStyle, marginBottom: '8px', padding: '12px 16px',
                    borderLeft: `4px solid ${correct ? '#10b981' : '#ef4444'}`,
                  }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                      {i + 1}. {q.question}
                    </p>
                    <p style={{ fontSize: '12px', color: correct ? '#10b981' : '#ef4444' }}>
                      {correct ? '\u2713 Correct' : '\u2717 Incorrect'}
                    </p>
                  </div>
                );
              })}
            </div>

            {!passed && (
              <button onClick={() => {
                setTestSubmitted(false);
                setTestIndex(0);
                setTestAnswers(Array(10).fill(null));
                setConfirmedTest(new Set());
                setMasteryScore(null);
              }} style={{
                padding: '14px 32px', borderRadius: '12px', border: 'none',
                background: design.accentGradient, color: '#fff', fontWeight: 700,
                fontSize: '15px', cursor: 'pointer', marginTop: '16px',
              }}>
                Replay
              </button>
            )}
          </div>
        </>)
      );
    }

    const q = testQuestions[testIndex];
    const selected = testAnswers[testIndex];
    const isConfirmed = confirmedTest.has(testIndex);

    return (
      renderPhaseWrapper(false, "Next \u2192", <>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto', width: '100%' }}>
            {/* Test intro */}
            <div style={{
              padding: '12px 16px', marginBottom: '16px', borderRadius: '10px',
              background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
            }}>
              <p style={{ fontSize: '13px', color: design.textSecondary, lineHeight: 1.5 }}>
                Apply your understanding of endothermic and exothermic dissolution to real-world scenarios. Each question tests your knowledge of energy balance, temperature changes, and practical applications.
              </p>
            </div>

            {/* Question counter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', fontWeight: 900, color: design.accent, letterSpacing: '2px' }}>
                QUESTION {testIndex + 1} OF {testQuestions.length}
              </p>
              <p style={{ fontSize: '12px', color: design.textMuted }}>
                {testIndex + 1} of 10
              </p>
            </div>

            {/* Progress dots */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: '4px', borderRadius: '2px',
                  background: confirmedTest.has(i) ? '#10b981' : i === testIndex ? design.accent : 'rgba(255,255,255,0.1)',
                  transition: 'all 0.3s ease',
                }} />
              ))}
            </div>

            {/* Scenario */}
            <div style={{ ...cardStyle, marginBottom: '16px', padding: '16px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: design.accentSecondary, marginBottom: '6px', letterSpacing: '1px' }}>SCENARIO</p>
              <p style={{ fontSize: '14px', color: design.textSecondary, lineHeight: 1.6 }}>{q.scenario}</p>
            </div>

            {/* Question */}
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', lineHeight: 1.4 }}>{q.question}</h3>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (isConfirmed) return;
                    const newAnswers = [...testAnswers];
                    newAnswers[testIndex] = i;
                    setTestAnswers(newAnswers);
                  }}
                  style={{
                    padding: '16px 20px', borderRadius: '12px', textAlign: 'left',
                    transition: 'all 0.2s ease', cursor: isConfirmed ? 'default' : 'pointer',
                    background: isConfirmed && opt.correct ? 'rgba(16,185,129,0.2)'
                      : isConfirmed && selected === i && !opt.correct ? 'rgba(239,68,68,0.2)'
                      : selected === i ? 'rgba(59,130,246,0.15)' : 'rgba(30,41,59,0.6)',
                    border: `2px solid ${isConfirmed && opt.correct ? '#10b981'
                      : isConfirmed && selected === i && !opt.correct ? '#ef4444'
                      : selected === i ? design.accent : 'rgba(71,85,105,0.3)'}`,
                    color: design.textSecondary, fontSize: '14px', fontWeight: 500,
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            {/* Explanation after confirming */}
            {isConfirmed && selected !== null && (
              <div style={{
                ...cardStyle, marginBottom: '12px', padding: '14px 16px',
                borderLeft: `4px solid ${q.options[selected]?.correct ? '#10b981' : '#f59e0b'}`,
                background: q.options[selected]?.correct ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
              }}>
                <p style={{ fontSize: '13px', color: q.options[selected]?.correct ? '#34d399' : '#fbbf24', fontWeight: 700, marginBottom: '4px' }}>
                  {q.options[selected]?.correct ? '✓ Correct!' : '✗ Incorrect — The correct answer is:'}
                </p>
                {!q.options[selected]?.correct && (
                  <p style={{ fontSize: '13px', color: design.textSecondary, lineHeight: 1.5 }}>
                    {q.options.find(o => o.correct)?.text}
                  </p>
                )}
                <p style={{ fontSize: '12px', color: design.textSecondary, marginTop: '6px', lineHeight: 1.5 }}>
                  {q.options[selected]?.correct
                    ? 'You understand the key concept of dissolution thermodynamics!'
                    : 'Remember: endothermic reactions absorb heat (making things cold) while exothermic reactions release heat (making things warm).'}
                </p>
              </div>
            )}

            {/* Confirm / Next / Submit */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              {!isConfirmed && selected !== null && (
                <button
                  onClick={() => {
                    const newConfirmed = new Set(confirmedTest);
                    newConfirmed.add(testIndex);
                    setConfirmedTest(newConfirmed);
                    playSound(q.options[selected].correct ? 'success' : 'failure');
                  }}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '12px', border: 'none',
                    background: design.accentGradient, color: '#fff', fontWeight: 700,
                    fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s ease',
                  }}
                >
                  Confirm Answer
                </button>
              )}

              {isConfirmed && testIndex < testQuestions.length - 1 && (
                <button
                  onClick={() => setTestIndex(testIndex + 1)}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '12px', border: 'none',
                    background: design.accentGradient, color: '#fff', fontWeight: 700,
                    fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s ease',
                  }}
                >
                  Next
                </button>
              )}

              {isConfirmed && testIndex === testQuestions.length - 1 && (
                <button
                  onClick={() => {
                    const sc = testAnswers.reduce((acc, ans, i) => acc + (ans !== null && testQuestions[i].options[ans]?.correct ? 1 : 0), 0);
                    setMasteryScore(sc);
                    setTestSubmitted(true);
                  }}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '12px', border: 'none',
                    background: '#10b981',
                    color: '#fff', fontWeight: 700, fontSize: '15px',
                    cursor: 'pointer', transition: 'all 0.2s ease',
                  }}
                >
                  Submit Test
                </button>
              )}
            </div>
          </div>
        </div>
      </>)
    );
  }

  // ============================================================================
  // MASTERY PHASE
  // ============================================================================
  if (phase === 'mastery') {
    return (
      renderPhaseWrapper(true, "Complete Game \u2192", <>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '80px', marginBottom: '24px' }}>{'\ud83c\udfc6'}</div>
          <h1 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '16px',
            background: 'linear-gradient(135deg, #60a5fa, #22c55e, #f97316)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Thermochemistry Master!
          </h1>
          {masteryScore !== null && (
            <p style={{ fontSize: '32px', fontWeight: 900, color: design.accent, marginBottom: '8px' }}>
              {masteryScore}/10
            </p>
          )}
          <p style={{ fontSize: '18px', color: design.textSecondary, marginBottom: '32px', maxWidth: '480px', lineHeight: 1.6 }}>
            You've mastered the energy balance of dissolution — from cold packs to hot packs, from rocket fuel to cooking chemistry!
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', maxWidth: '400px', width: '100%' }}>
            {[
              { emoji: '\u2744\ufe0f', label: 'Endothermic' },
              { emoji: '\ud83d\udd25', label: 'Exothermic' },
              { emoji: '\u26a1', label: 'Lattice Energy' },
              { emoji: '\ud83d\udca7', label: 'Hydration Energy' },
            ].map(item => (
              <div key={item.label} style={{ ...cardStyle, padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>{item.emoji}</div>
                <p style={{ fontSize: '14px', color: design.textSecondary }}>{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </>)
    );
  }

  // Fallback - default to hook
  return (
    renderPhaseWrapper(true, "Start \u2192", <>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <p style={{ fontSize: '18px', color: design.textSecondary }}>Welcome to Endothermic & Exothermic Reactions. Let's begin your discovery!</p>
      </div>
    </>)
  );
};

export default EndothermicExothermicRenderer;
