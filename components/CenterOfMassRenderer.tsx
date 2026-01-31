'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CenterOfMassVisualization } from './CenterOfMassVisualization';

// ============================================================================
// CENTER OF MASS - Premium Design (Apple/Airbnb Quality)
// Now using clarity-first visualization approach
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface GameEvent {
  type: string;
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface CenterOfMassRendererProps {
  onGameEvent?: (event: GameEvent) => void;
}

// Premium Color System (proper contrast ratios)
const colors = {
  // Backgrounds
  bgDeep: '#030712',
  bgSurface: '#0f172a',
  bgElevated: '#1e293b',
  bgHover: '#334155',

  // Text (high contrast on dark backgrounds)
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textTertiary: '#94a3b8',
  textMuted: '#64748b',

  // Brand
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  secondary: '#10b981',
  accent: '#8b5cf6',

  // Semantic
  success: '#22c55e',
  successBg: 'rgba(34, 197, 94, 0.15)',
  warning: '#f59e0b',
  warningBg: 'rgba(245, 158, 11, 0.15)',
  error: '#ef4444',
  errorBg: 'rgba(239, 68, 68, 0.15)',
};

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const CenterOfMassRenderer: React.FC<CenterOfMassRendererProps> = ({ onGameEvent }) => {
  // State
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [clayPosition, setClayPosition] = useState<number>(0);
  const [hasClayAdded, setHasClayAdded] = useState(false);
  const [isBalanced, setIsBalanced] = useState(true);
  const [tiltAngle, setTiltAngle] = useState(0);
  const [showCOM, setShowCOM] = useState(true);
  const [experimentCount, setExperimentCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Transfer state
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [testScore, setTestScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  // Animation
  const timeRef = useRef(0);
  const animationRef = useRef<number>();

  // Responsive
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Typography system
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
      timeRef.current += 0.016;
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
      gameType: 'center_of_mass',
      gameTitle: 'Center of Mass',
      details: { phase, ...details },
      timestamp: Date.now()
    });
  }, [onGameEvent, phase]);

  // Sound
  const playSound = useCallback((type: 'click' | 'success' | 'error') => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const freq = type === 'success' ? 800 : type === 'error' ? 300 : 500;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }, []);

  // Navigation
  const goToPhase = useCallback((p: Phase) => {
    playSound('click');
    setPhase(p);
    emit('phase_changed', { to: p });
  }, [playSound, emit]);

  // Physics
  const calculateBalance = useCallback((clay: number) => {
    const baseCOM = -0.3;
    const finalCOM = baseCOM + clay * 0.5;
    return { comY: finalCOM, stable: finalCOM < 0.1 };
  }, []);

  const addClay = useCallback((pos: number) => {
    if (isAnimating || hasClayAdded) return;
    setHasClayAdded(true);
    setClayPosition(pos);
    const { stable } = calculateBalance(pos);
    setIsBalanced(stable);

    if (!stable) {
      setIsAnimating(true);
      let angle = 0;
      const animate = () => {
        angle += pos > 0 ? 2 : -2;
        setTiltAngle(angle);
        if (Math.abs(angle) < 45) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          setExperimentCount(c => c + 1);
          playSound('error');
        }
      };
      requestAnimationFrame(animate);
    } else {
      setExperimentCount(c => c + 1);
      playSound('success');
    }
  }, [calculateBalance, hasClayAdded, isAnimating, playSound]);

  const resetExperiment = useCallback(() => {
    setHasClayAdded(false);
    setClayPosition(0);
    setIsBalanced(true);
    setTiltAngle(0);
    setIsAnimating(false);
  }, []);

  // Test questions
  const questions = [
    { q: "Why does the fork-toothpick system balance on the glass rim?", opts: [
      { text: "The fork is very light", correct: false },
      { text: "Center of mass is below the pivot point", correct: true },
      { text: "Friction holds it in place", correct: false },
      { text: "The glass surface is sticky", correct: false }
    ], exp: "The system balances because its center of mass lies below the pivot point, creating stable equilibrium." },
    { q: "What happens if you move the center of mass above the pivot?", opts: [
      { text: "More stable", correct: false },
      { text: "Unstable - falls", correct: true },
      { text: "No change", correct: false },
      { text: "Floats", correct: false }
    ], exp: "When COM is above the pivot, any disturbance causes gravity to tip it further. It falls." },
    { q: "Adding clay to the fork end (lower side) would:", opts: [
      { text: "Make it more stable", correct: true },
      { text: "Make it less stable", correct: false },
      { text: "Have no effect", correct: false },
      { text: "Make it lighter", correct: false }
    ], exp: "Adding weight to the fork end shifts the COM lower, making the system more stable." },
    { q: "A tightrope walker holds a long pole because:", opts: [
      { text: "For exercise", correct: false },
      { text: "To lower their overall center of mass", correct: true },
      { text: "To wave at the crowd", correct: false },
      { text: "No purpose", correct: false }
    ], exp: "The heavy pole bends downward, lowering the walker's COM below the rope." },
    { q: "Where is the center of mass of a donut shape?", opts: [
      { text: "In the dough", correct: false },
      { text: "In the empty hole at center", correct: true },
      { text: "Nowhere specific", correct: false },
      { text: "At the outer edge", correct: false }
    ], exp: "A donut's center of mass is in the hole—the geometric center—even with no material there!" },
    { q: "To balance a ruler on your finger, place it:", opts: [
      { text: "At one end", correct: false },
      { text: "At its center of mass", correct: true },
      { text: "Anywhere", correct: false },
      { text: "At both ends", correct: false }
    ], exp: "You must place your finger under the center of mass." },
    { q: "Why do racing cars have low centers of mass?", opts: [
      { text: "To go faster straight", correct: false },
      { text: "To be more stable in turns", correct: true },
      { text: "For aerodynamics only", correct: false },
      { text: "To use less fuel", correct: false }
    ], exp: "A low COM means the car is less likely to tip during sharp turns." },
    { q: "A bird perches on a branch by:", opts: [
      { text: "Gripping with claws only", correct: false },
      { text: "Keeping its COM over the branch", correct: true },
      { text: "Birds can't balance well", correct: false },
      { text: "The branch helps", correct: false }
    ], exp: "Birds constantly adjust to keep their COM directly over the branch." },
    { q: "Leaning too far forward makes you fall because:", opts: [
      { text: "Weak legs", correct: false },
      { text: "COM moves outside base of support", correct: true },
      { text: "Gravity increases", correct: false },
      { text: "Wind pushes you", correct: false }
    ], exp: "When COM moves outside your feet, gravity creates unbalanced torque." },
    { q: "A Weeble toy always rights itself because:", opts: [
      { text: "Magnets", correct: false },
      { text: "Its center of mass is very low", correct: true },
      { text: "Filled with water", correct: false },
      { text: "Perfectly round", correct: false }
    ], exp: "Weebles have a heavy bottom keeping the COM very low." }
  ];

  // Applications
  const apps = [
    {
      title: "Tightrope Walking",
      subtitle: "Defying Gravity with Physics",
      desc: "Professional tightrope walkers use long, heavy poles that curve downward. This lowers their overall center of mass below the rope itself, creating remarkable stability.",
      connection: "The pole acts like the fork in our experiment—shifting the COM below the support point.",
      stats: [{ val: "10-12m", label: "Pole length" }, { val: "10-15kg", label: "Pole weight" }, { val: "45°", label: "Max tilt" }],
      examples: "Nik Wallenda, Philippe Petit, Circus performers",
      color: colors.secondary
    },
    {
      title: "Ship Stability",
      subtitle: "Engineering Safe Vessels",
      desc: "Ships carry heavy ballast at the bottom to keep the center of mass low. This prevents capsizing even in rough seas. Naval architects carefully calculate the 'metacentric height'.",
      connection: "Like keeping weight on the fork side, ballast keeps the ship's COM low.",
      stats: [{ val: "0.5-2m", label: "Metacentric height" }, { val: "1000+ tons", label: "Ballast" }, { val: "30°", label: "Max heel" }],
      examples: "Cargo ships, Aircraft carriers, Sailboats",
      color: colors.primary
    },
    {
      title: "Wine Glass Balance",
      subtitle: "Everyday Physics",
      desc: "A wine glass with liquid is more stable than empty. The liquid lowers the center of mass closer to the wide base, making it harder to tip over.",
      connection: "The liquid acts like clay on the fork side—lowering the COM.",
      stats: [{ val: "~2cm", label: "COM drop" }, { val: "40%", label: "More stable" }, { val: "200g", label: "Base weight" }],
      examples: "Wine glasses, Beer steins, Laboratory beakers",
      color: colors.accent
    },
    {
      title: "Human Balance",
      subtitle: "Your Built-in Balancing Act",
      desc: "We constantly adjust our body position to keep our center of mass over our feet. This happens automatically through our vestibular system.",
      connection: "Just like the fork system, we must keep COM over our support point.",
      stats: [{ val: "55%", label: "COM height" }, { val: "100+", label: "Adjustments/min" }, { val: "3cm", label: "Normal sway" }],
      examples: "Standing, Walking, Martial arts, Yoga poses",
      color: colors.warning
    }
  ];

  const handleAnswer = useCallback((idx: number) => {
    if (testAnswers[currentQuestion] !== null) return;
    const newAnswers = [...testAnswers];
    newAnswers[currentQuestion] = idx;
    setTestAnswers(newAnswers);
    setShowExplanation(true);
    if (questions[currentQuestion].opts[idx]?.correct) {
      setTestScore(s => s + 1);
      playSound('success');
    } else {
      playSound('error');
    }
  }, [currentQuestion, testAnswers, questions, playSound]);

  const handleReturnToDashboard = useCallback(() => {
    emit('button_clicked', { action: 'return_to_dashboard' });
    playSound('complete');
    // Actually navigate to dashboard
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }, [emit, playSound]);

  // ============================================================================
  // VISUALIZATION - Using clarity-first approach with external labels
  // ============================================================================

  // Legend component using typo system - labels outside SVG
  const renderVisualizationLegend = () => (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: typo.elementGap,
      justifyContent: 'center',
      alignItems: 'center',
      padding: typo.cardPadding,
      background: colors.bgSurface,
      borderRadius: '12px',
      border: `1px solid ${colors.bgHover}`,
      marginBottom: typo.elementGap,
    }}>
      <span style={{ fontSize: typo.small, color: colors.textMuted }}>
        <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', marginRight: '6px', verticalAlign: 'middle' }}/>
        <strong style={{ color: '#4ade80' }}>Pivot</strong> (balance point)
      </span>
      {showCOM && (
        <span style={{ fontSize: typo.small, color: colors.textMuted }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', marginRight: '6px', verticalAlign: 'middle' }}/>
          <strong style={{ color: '#f87171' }}>COM</strong> (center of mass)
        </span>
      )}
      <span style={{ fontSize: typo.small, color: colors.textMuted }}>
        <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '4px', background: '#f59e0b', marginRight: '6px', verticalAlign: 'middle' }}/>
        <strong style={{ color: '#fcd34d' }}>Heavy</strong> (fork side)
      </span>
      {hasClayAdded && (
        <span style={{ fontSize: typo.small, color: colors.textMuted }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#a855f7', marginRight: '6px', verticalAlign: 'middle' }}/>
          <strong style={{ color: '#c084fc' }}>Added</strong> (clay)
        </span>
      )}
    </div>
  );

  // Status indicator using typo system - outside SVG
  const renderVisualizationStatus = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: typo.elementGap,
      padding: typo.cardPadding,
      background: isBalanced ? colors.successBg : colors.errorBg,
      border: `1px solid ${isBalanced ? colors.success : colors.error}30`,
      borderRadius: '12px',
      marginTop: typo.elementGap,
    }}>
      <span style={{
        fontSize: typo.bodyLarge,
        fontWeight: 700,
        color: isBalanced ? colors.success : colors.error,
      }}>
        {isBalanced ? 'BALANCED' : 'FALLING'}
      </span>
      <span style={{ fontSize: typo.small, color: colors.textSecondary }}>
        {comY < 0 ? 'COM below pivot = stable' : 'COM above pivot = unstable'}
      </span>
    </div>
  );

  const renderVisualization = (size: 'large' | 'medium' = 'large', showLabels: boolean = false) => {
    const { comY } = calculateBalance(clayPosition);

    return (
      <div>
        {showLabels && renderVisualizationLegend()}
        <CenterOfMassVisualization
          comY={comY}
          isBalanced={isBalanced}
          tiltAngle={tiltAngle}
          showCOM={showCOM}
          hasWeight={hasClayAdded}
          weightPosition={clayPosition}
          timeRef={timeRef.current}
          size={size}
        />
        {showLabels && renderVisualizationStatus()}
      </div>
    );
  };

  // Helper to get comY for status display
  const comY = calculateBalance(clayPosition).comY;

  // ============================================================================
  // PHASE RENDERERS
  // ============================================================================

  // Premium Hook Page
  const renderHook = () => (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '24px 16px' : '48px 24px', textAlign: 'center' }}>
      {/* Category pill */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: colors.successBg, border: `1px solid ${colors.success}30`, borderRadius: '100px', marginBottom: '24px' }}>
        <div style={{ width: '6px', height: '6px', background: colors.success, borderRadius: '50%' }}/>
        <span style={{ fontSize: '11px', fontWeight: 600, color: colors.success, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Classical Mechanics</span>
      </div>

      {/* Hero title */}
      <h1 style={{ fontSize: isMobile ? '32px' : '48px', fontWeight: 700, lineHeight: 1.1, marginBottom: '16px', background: `linear-gradient(135deg, ${colors.textPrimary} 0%, ${colors.secondary} 50%, ${colors.primary} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
        The Impossible<br/>Balance
      </h1>

      {/* Subtitle */}
      <p style={{ fontSize: isMobile ? '16px' : '18px', color: colors.textSecondary, maxWidth: '420px', lineHeight: 1.6, marginBottom: '32px' }}>
        A fork hangs off a glass and doesn't fall.<br/>How is this even possible?
      </p>

      {/* Visualization */}
      <div style={{ width: '100%', maxWidth: '420px', background: `linear-gradient(135deg, ${colors.bgSurface} 0%, ${colors.bgDeep} 100%)`, borderRadius: '20px', padding: '20px', border: `1px solid ${colors.bgHover}`, marginBottom: '32px' }}>
        {renderVisualization('large')}
      </div>

      {/* Quote */}
      <div style={{ maxWidth: '380px', padding: '16px 20px', background: colors.bgSurface, borderRadius: '12px', borderLeft: `3px solid ${colors.secondary}`, marginBottom: '32px' }}>
        <p style={{ fontSize: '14px', color: colors.textTertiary, fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
          "The center of mass is the key to understanding balance and stability."
        </p>
        <p style={{ fontSize: '12px', color: colors.textMuted, marginTop: '8px', marginBottom: 0 }}>— Classical Mechanics</p>
      </div>

      {/* CTA Button */}
      <button
        onClick={() => goToPhase('predict')}
        style={{
          padding: '16px 40px',
          fontSize: '16px',
          fontWeight: 600,
          color: '#fff',
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
          border: 'none',
          borderRadius: '14px',
          cursor: 'pointer',
          boxShadow: `0 8px 32px ${colors.primary}40`,
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          userSelect: 'none',
        }}
      >
        Begin Experiment →
      </button>

      {/* Features */}
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
      { id: 'light', label: 'The toothpick is very light', desc: 'Light objects balance easier', icon: '🪶' },
      { id: 'com', label: 'Center of mass is below pivot', desc: 'Gravity creates stability', icon: '⬇️' },
      { id: 'friction', label: 'Friction holds it in place', desc: 'The surfaces grip together', icon: '🤝' }
    ];

    return (
      <div style={{ padding: isMobile ? '24px 16px' : '32px 24px', maxWidth: '560px', margin: '0 auto' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: colors.primary, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>Step 2 • Make Your Prediction</p>
        <h2 style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 700, color: colors.textPrimary, marginBottom: '8px', lineHeight: 1.2 }}>Why Doesn't It Fall?</h2>
        <p style={{ fontSize: '15px', color: colors.textSecondary, marginBottom: '28px', lineHeight: 1.5 }}>Most of the fork hangs off the edge. What keeps it balanced?</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => { if (prediction !== opt.id) { playSound('click'); setPrediction(opt.id); emit('prediction_made', { prediction: opt.id }); } }}
              style={{
                display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', textAlign: 'left',
                background: prediction === opt.id ? colors.successBg : colors.bgSurface,
                border: `2px solid ${prediction === opt.id ? colors.success : 'transparent'}`,
                borderRadius: '14px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none',
              }}
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
            style={{ width: '100%', padding: '16px', fontSize: '16px', fontWeight: 600, color: '#fff', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, border: 'none', borderRadius: '14px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
          >
            See It In Action →
          </button>
        )}
      </div>
    );
  };

  // Play Phase
  const renderPlay = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* HEADER - Large, clear title */}
      <div style={{
        padding: isMobile ? '16px 20px' : '20px 32px',
        borderBottom: `1px solid ${colors.bgHover}`,
        flexShrink: 0,
        background: colors.bgSurface
      }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: colors.primary, letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 8px' }}>Step 3 • Observe</p>
        <h1 style={{
          fontSize: isMobile ? '22px' : '28px',
          fontWeight: 700,
          color: colors.textPrimary,
          margin: '0 0 4px'
        }}>THE BALANCING FORK TRICK</h1>
        <p style={{ fontSize: isMobile ? '14px' : '16px', color: colors.textSecondary, margin: 0 }}>
          A fork hangs off a glass rim without falling — look at the <span style={{ color: colors.error, fontWeight: 600 }}>red dot (COM)</span> to see why!
        </p>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
        {/* GRAPHIC SECTION */}
        <div style={{ padding: isMobile ? '20px' : '28px', background: colors.bgDeep }}>
          {/* Quick legend - what user is looking at */}
          <div style={{
            maxWidth: '560px',
            margin: '0 auto 16px',
            padding: '12px 16px',
            background: colors.bgSurface,
            borderRadius: '12px',
            border: `1px solid ${colors.bgHover}`,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '13px', color: colors.textMuted }}>
              🟢 <strong style={{ color: '#4ade80' }}>Green</strong> = Pivot
            </span>
            <span style={{ fontSize: '13px', color: colors.textMuted }}>
              🔴 <strong style={{ color: '#ef4444' }}>Red</strong> = Center of Mass
            </span>
            <span style={{ fontSize: '13px', color: colors.textMuted }}>
              🟡 <strong style={{ color: '#fcd34d' }}>Gold</strong> = Heavy fork
            </span>
          </div>

          <div style={{
            maxWidth: '560px',
            margin: '0 auto',
            background: colors.bgSurface,
            borderRadius: '16px',
            padding: '16px',
            border: `1px solid ${colors.bgHover}`
          }}>
            {renderVisualization('large')}
          </div>
        </div>

        {/* CONTROLS SECTION */}
        <div style={{
          padding: isMobile ? '20px' : '28px',
          background: colors.bgSurface,
          borderTop: `1px solid ${colors.bgHover}`,
          borderBottom: `1px solid ${colors.bgHover}`
        }}>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: `1px solid ${colors.bgHover}`
            }}>
              <span style={{ fontSize: '20px' }}>⚙️</span>
              <div>
                <h2 style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 700, color: colors.textPrimary, margin: 0 }}>CONTROLS</h2>
                <p style={{ fontSize: '12px', color: colors.textMuted, margin: '2px 0 0' }}>Toggle to show or hide the center of mass</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: colors.textSecondary }}>Show Center of Mass (COM):</span>
              <button
                onClick={() => setShowCOM(!showCOM)}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  background: showCOM ? colors.error : colors.bgElevated,
                  color: showCOM ? '#fff' : colors.textTertiary,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  minHeight: '44px'
                }}
              >
                {showCOM ? '● ON' : '○ OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* WHY SECTION */}
        <div style={{ padding: isMobile ? '20px' : '28px', background: colors.bgDeep }}>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '20px' }}>📖</span>
              <h2 style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 700, color: colors.textPrimary, margin: 0 }}>KEY OBSERVATION</h2>
            </div>
            <div style={{ background: colors.successBg, border: `1px solid ${colors.success}30`, borderRadius: '12px', padding: '16px' }}>
              <p style={{ color: colors.textSecondary, fontSize: '15px', margin: 0, lineHeight: 1.6 }}>
                <strong style={{ color: colors.success }}>Notice:</strong> The <span style={{ color: colors.error, fontWeight: 700 }}>center of mass</span> (red dot) is <strong>below</strong> the pivot point — that's why it balances!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{
        padding: isMobile ? '14px 20px' : '18px 32px',
        borderTop: `1px solid ${colors.bgHover}`,
        flexShrink: 0,
        background: colors.bgSurface
      }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <button
            onClick={() => goToPhase('review')}
            style={{ width: '100%', padding: '16px', fontSize: '16px', fontWeight: 600, color: '#fff', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, border: 'none', borderRadius: '14px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
          >
            I Understand →
          </button>
        </div>
      </div>
    </div>
  );

  // Review Phase
  const renderReview = () => (
    <div style={{ padding: isMobile ? '24px 16px' : '32px 24px', maxWidth: '560px', margin: '0 auto' }}>
      <p style={{ fontSize: '11px', fontWeight: 600, color: colors.primary, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>Step 4 • Understanding</p>
      <h2 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 700, color: colors.textPrimary, marginBottom: '20px' }}>The Secret: Center of Mass</h2>

      <div style={{ background: `linear-gradient(135deg, ${colors.successBg} 0%, rgba(59, 130, 246, 0.1) 100%)`, borderRadius: '16px', padding: '24px', marginBottom: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: '20px', fontWeight: 700, color: colors.success, margin: '0 0 8px' }}>COM below pivot = Stable</p>
        <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0, lineHeight: 1.5 }}>When the center of mass is below the support point, gravity creates a restoring torque that pulls it back to balance.</p>
      </div>

      <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: colors.successBg, border: `1px solid ${colors.success}30`, borderRadius: '12px', padding: '16px' }}>
          <p style={{ color: colors.success, fontWeight: 700, margin: '0 0 4px' }}>✓ Stable (COM below)</p>
          <p style={{ color: colors.textTertiary, fontSize: '13px', margin: 0 }}>Tilt it, and gravity pulls it back. Like a pendulum!</p>
        </div>
        <div style={{ background: colors.errorBg, border: `1px solid ${colors.error}30`, borderRadius: '12px', padding: '16px' }}>
          <p style={{ color: colors.error, fontWeight: 700, margin: '0 0 4px' }}>✗ Unstable (COM above)</p>
          <p style={{ color: colors.textTertiary, fontSize: '13px', margin: 0 }}>Tilt it, and gravity tips it further. Falls over!</p>
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: '14px', color: colors.textMuted, marginBottom: '24px' }}>
        Your prediction: {prediction === 'com' ? '✅ Correct!' : '🤔 Now you understand!'}
      </p>

      <button
        onClick={() => goToPhase('twist_predict')}
        style={{ width: '100%', padding: '16px', fontSize: '16px', fontWeight: 600, color: '#fff', background: `linear-gradient(135deg, ${colors.warning} 0%, #ea580c 100%)`, border: 'none', borderRadius: '14px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
      >
        Can We Break It? →
      </button>
    </div>
  );

  // Twist Predict
  const renderTwistPredict = () => {
    const options = [
      { id: 'fork', label: 'Near the forks (left)', desc: 'More stable – COM goes lower' },
      { id: 'middle', label: 'In the middle', desc: 'No change – balanced' },
      { id: 'other', label: 'Away from forks (right)', desc: 'Less stable – might fall!' }
    ];

    return (
      <div style={{ padding: isMobile ? '24px 16px' : '32px 24px', maxWidth: '560px', margin: '0 auto' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: colors.warning, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>Step 5 • Plot Twist</p>
        <h2 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 700, color: colors.warning, marginBottom: '8px' }}>Add Clay! Where Should It Go?</h2>
        <p style={{ fontSize: '15px', color: colors.textSecondary, marginBottom: '24px' }}>What if we stick a ball of clay on the toothpick?</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => { if (twistPrediction !== opt.id) { playSound('click'); setTwistPrediction(opt.id); } }}
              style={{
                padding: '16px 20px', textAlign: 'left',
                background: twistPrediction === opt.id ? colors.warningBg : colors.bgSurface,
                border: `2px solid ${twistPrediction === opt.id ? colors.warning : 'transparent'}`,
                borderRadius: '14px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none',
              }}
            >
              <p style={{ color: colors.textPrimary, fontWeight: 600, fontSize: '15px', margin: 0 }}>{opt.label}</p>
              <p style={{ color: colors.textTertiary, fontSize: '13px', margin: '4px 0 0' }}>{opt.desc}</p>
            </button>
          ))}
        </div>

        {twistPrediction && (
          <button
            onClick={() => goToPhase('twist_play')}
            style={{ width: '100%', padding: '16px', fontSize: '16px', fontWeight: 600, color: '#fff', background: `linear-gradient(135deg, ${colors.warning} 0%, #ea580c 100%)`, border: 'none', borderRadius: '14px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
          >
            Experiment →
          </button>
        )}
      </div>
    );
  };

  // Twist Play
  const renderTwistPlay = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* HEADER - Large, clear title */}
      <div style={{
        padding: isMobile ? '16px 20px' : '20px 32px',
        borderBottom: `1px solid ${colors.bgHover}`,
        flexShrink: 0,
        background: colors.bgSurface
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 12px',
          background: colors.warningBg,
          borderRadius: '6px',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '14px' }}>🌀</span>
          <span style={{ fontSize: '11px', color: colors.warning, fontWeight: 600 }}>TWIST: New Variable!</span>
        </div>
        <h1 style={{
          fontSize: isMobile ? '22px' : '28px',
          fontWeight: 700,
          color: colors.textPrimary,
          margin: '0 0 4px'
        }}>CLAY EXPERIMENT</h1>
        <p style={{ fontSize: isMobile ? '14px' : '16px', color: colors.textSecondary, margin: 0 }}>
          Add clay to move the <span style={{ color: colors.error, fontWeight: 600 }}>Center of Mass</span> — can you make it fall?
        </p>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
        {/* GRAPHIC SECTION */}
        <div style={{ padding: isMobile ? '20px' : '28px', background: colors.bgDeep }}>
          {/* Quick legend */}
          <div style={{
            maxWidth: '560px',
            margin: '0 auto 16px',
            padding: '12px 16px',
            background: colors.bgSurface,
            borderRadius: '12px',
            border: `1px solid ${colors.bgHover}`,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '13px', color: colors.textMuted }}>
              🟢 <strong style={{ color: '#4ade80' }}>Green</strong> = Pivot
            </span>
            <span style={{ fontSize: '13px', color: colors.textMuted }}>
              🔴 <strong style={{ color: '#ef4444' }}>Red</strong> = Center of Mass
            </span>
            <span style={{ fontSize: '13px', color: colors.textMuted }}>
              🟣 <strong style={{ color: '#c084fc' }}>Purple</strong> = Added clay
            </span>
          </div>

          <div style={{
            maxWidth: '560px',
            margin: '0 auto',
            background: colors.bgSurface,
            borderRadius: '16px',
            padding: '16px',
            border: `1px solid ${colors.bgHover}`
          }}>
            {renderVisualization('large')}
          </div>
        </div>

        {/* CONTROLS SECTION */}
        <div style={{
          padding: isMobile ? '20px' : '28px',
          background: colors.bgSurface,
          borderTop: `1px solid ${colors.bgHover}`,
          borderBottom: `1px solid ${colors.bgHover}`
        }}>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: `1px solid ${colors.bgHover}`
            }}>
              <span style={{ fontSize: '20px' }}>⚙️</span>
              <div>
                <h2 style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 700, color: colors.textPrimary, margin: 0 }}>CONTROLS</h2>
                <p style={{ fontSize: '12px', color: colors.textMuted, margin: '2px 0 0' }}>Click where to add clay on the toothpick</p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '16px'
            }}>
              {[{ pos: -0.8, label: '← Fork side' }, { pos: 0, label: 'Middle' }, { pos: 0.8, label: 'Other side →' }].map(opt => (
                <button
                  key={opt.pos}
                  onClick={() => addClay(opt.pos)}
                  disabled={isAnimating || hasClayAdded}
                  style={{
                    padding: '14px 24px',
                    fontSize: '14px',
                    fontWeight: 600,
                    background: (isAnimating || hasClayAdded) ? colors.bgElevated : colors.warning,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: (isAnimating || hasClayAdded) ? 'not-allowed' : 'pointer',
                    opacity: (isAnimating || hasClayAdded) ? 0.5 : 1,
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                    userSelect: 'none',
                    minHeight: '48px'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {hasClayAdded && (
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={resetExperiment}
                  style={{
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: 600,
                    background: colors.bgElevated,
                    color: colors.textSecondary,
                    border: `1px solid ${colors.bgHover}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                    minHeight: '44px'
                  }}
                >
                  ↺ Reset & Try Again
                </button>
              </div>
            )}

            <p style={{ textAlign: 'center', fontSize: '13px', color: colors.textMuted, margin: '16px 0 0' }}>
              Experiments completed: <strong>{experimentCount}</strong> (try at least 2)
            </p>
          </div>
        </div>

        {/* WHY SECTION */}
        <div style={{ padding: isMobile ? '20px' : '28px', background: colors.bgDeep }}>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '20px' }}>📖</span>
              <h2 style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 700, color: colors.textPrimary, margin: 0 }}>WHAT'S HAPPENING</h2>
            </div>
            <div style={{ background: colors.warningBg, border: `1px solid ${colors.warning}30`, borderRadius: '12px', padding: '16px' }}>
              <p style={{ color: colors.textSecondary, fontSize: '15px', margin: 0, lineHeight: 1.6 }}>
                Adding clay <strong>shifts the center of mass</strong>. If COM stays below pivot = stable. If COM rises above pivot = falls!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      {experimentCount >= 2 && (
        <div style={{
          padding: isMobile ? '14px 20px' : '18px 32px',
          borderTop: `1px solid ${colors.bgHover}`,
          flexShrink: 0,
          background: colors.bgSurface
        }}>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            <button
              onClick={() => goToPhase('twist_review')}
              style={{ width: '100%', padding: '16px', fontSize: '16px', fontWeight: 600, color: '#fff', background: `linear-gradient(135deg, ${colors.warning} 0%, #ea580c 100%)`, border: 'none', borderRadius: '14px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
            >
              I See the Pattern →
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Twist Review
  const renderTwistReview = () => (
    <div style={{ padding: isMobile ? '24px 16px' : '32px 24px', maxWidth: '560px', margin: '0 auto' }}>
      <p style={{ fontSize: '11px', fontWeight: 600, color: colors.warning, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>Step 7 • Deep Insight</p>
      <h2 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 700, color: colors.warning, marginBottom: '20px' }}>Shifting the Center of Mass</h2>

      <div style={{ background: colors.warningBg, borderRadius: '16px', padding: '24px', marginBottom: '24px', textAlign: 'center' }}>
        <p style={{ color: colors.textSecondary, margin: '0 0 12px', fontSize: '15px' }}>
          Adding weight <span style={{ color: colors.success, fontWeight: 700 }}>on the fork side</span> lowers the COM → <strong>more stable</strong>
        </p>
        <p style={{ color: colors.textSecondary, margin: 0, fontSize: '15px' }}>
          Adding weight <span style={{ color: colors.error, fontWeight: 700 }}>on the other side</span> raises the COM → <strong>falls!</strong>
        </p>
      </div>

      <div style={{ background: colors.successBg, border: `1px solid ${colors.success}30`, borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
        <p style={{ color: colors.success, fontWeight: 700, margin: 0, fontSize: '15px' }}>
          The Rule: Keep your center of mass over (or below) your support point!
        </p>
      </div>

      <button
        onClick={() => goToPhase('transfer')}
        style={{ width: '100%', padding: '16px', fontSize: '16px', fontWeight: 600, color: '#fff', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, border: 'none', borderRadius: '14px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
      >
        See Real-World Examples →
      </button>
    </div>
  );

  // Transfer Phase with Tabs
  const renderTransfer = () => {
    const app = apps[activeApp];
    const allDone = completedApps.every(Boolean);
    const isLast = activeApp === apps.length - 1;

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
          {apps.map((a, i) => {
            const isCompleted = completedApps[i];
            const isCurrent = activeApp === i;
            const isLocked = i > 0 && !completedApps[i - 1] && !completedApps[i];

            return (
              <button
                key={i}
                onClick={() => { if (!isLocked) setActiveApp(i); }}
                disabled={isLocked}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '10px 16px', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap',
                  background: isCurrent ? colors.primary : isCompleted ? colors.successBg : colors.bgSurface,
                  color: isCurrent ? '#fff' : isCompleted ? colors.success : isLocked ? colors.textMuted : colors.textSecondary,
                  border: `1px solid ${isCurrent ? colors.primary : isCompleted ? colors.success + '30' : colors.bgHover}`,
                  borderRadius: '10px', cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked ? 0.5 : 1,
                  touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none',
                }}
              >
                {isCompleted ? '✓' : isLocked ? '🔒' : isCurrent ? '●' : (i + 1)}
                <span>{a.title.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* App Content */}
        <div style={{ background: colors.bgSurface, borderRadius: '20px', padding: '24px', border: `1px solid ${colors.bgHover}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: `${app.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
              {activeApp === 0 ? '🎪' : activeApp === 1 ? '🚢' : activeApp === 2 ? '🍷' : '🧍'}
            </div>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: app.color, margin: 0 }}>{app.title}</h3>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: '2px 0 0' }}>{app.subtitle}</p>
            </div>
          </div>

          <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: 1.6, marginBottom: '20px' }}>{app.desc}</p>

          <div style={{ background: `${app.color}15`, borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
            <p style={{ color: app.color, fontSize: '14px', margin: 0 }}><strong>Connection:</strong> {app.connection}</p>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {app.stats.map((s, i) => (
              <div key={i} style={{ background: colors.bgDeep, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <p style={{ color: colors.textPrimary, fontWeight: 700, fontSize: '16px', margin: '0 0 4px' }}>{s.val}</p>
                <p style={{ color: colors.textMuted, fontSize: '11px', margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>

          <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '24px' }}><strong>Examples:</strong> {app.examples}</p>

          {/* Continue / Complete button */}
          {!completedApps[activeApp] && (
            <button
              onClick={isLast && completedApps.slice(0, -1).every(Boolean) ? () => { handleContinue(); goToPhase('test'); } : handleContinue}
              style={{
                width: '100%', padding: '16px', fontSize: '16px', fontWeight: 600, color: '#fff',
                background: `linear-gradient(135deg, ${app.color} 0%, ${app.color}cc 100%)`,
                border: 'none', borderRadius: '12px', cursor: 'pointer',
                touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none',
              }}
            >
              {isLast ? 'Complete & Take Test →' : `Continue to ${apps[activeApp + 1].title} →`}
            </button>
          )}

          {completedApps[activeApp] && !allDone && (
            <p style={{ textAlign: 'center', color: colors.success, fontSize: '14px', margin: 0 }}>✓ Completed! Select another tab above.</p>
          )}
        </div>

        {/* Take Test button - only when all done */}
        {allDone && (
          <button
            onClick={() => goToPhase('test')}
            style={{ width: '100%', marginTop: '24px', padding: '16px', fontSize: '16px', fontWeight: 600, color: '#fff', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, border: 'none', borderRadius: '14px', cursor: 'pointer', boxShadow: `0 8px 32px ${colors.primary}40`, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
          >
            Take the Knowledge Test →
          </button>
        )}
      </div>
    );
  };

  // Test Phase
  const renderTest = () => {
    const q = questions[currentQuestion];
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

        {/* Progress */}
        <div style={{ height: '6px', background: colors.bgElevated, borderRadius: '3px', marginBottom: '24px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: colors.primary, borderRadius: '3px', width: `${((currentQuestion + 1) / 10) * 100}%`, transition: 'width 0.3s' }}/>
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
                  style={{
                    padding: '14px 18px', textAlign: 'left', fontSize: '15px',
                    background: bg, color: colors.textPrimary,
                    border: `2px solid ${border}`, borderRadius: '12px',
                    cursor: answered ? 'default' : 'pointer',
                    touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none',
                  }}
                >
                  <span style={{ fontWeight: 600, marginRight: '10px', color: colors.textMuted }}>{String.fromCharCode(65 + i)}.</span>
                  {opt.text}
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <div style={{ marginTop: '20px', padding: '16px', background: colors.successBg, border: `1px solid ${colors.success}30`, borderRadius: '12px' }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>💡 {q.exp}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
          <button
            onClick={() => { if (currentQuestion > 0) { setCurrentQuestion(currentQuestion - 1); setShowExplanation(testAnswers[currentQuestion - 1] !== null); } }}
            disabled={currentQuestion === 0}
            style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 600, background: colors.bgElevated, color: currentQuestion === 0 ? colors.textMuted : colors.textSecondary, border: 'none', borderRadius: '10px', cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer', opacity: currentQuestion === 0 ? 0.5 : 1, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            ← Back
          </button>

          {currentQuestion < 9 ? (
            <button
              onClick={() => { setCurrentQuestion(currentQuestion + 1); setShowExplanation(testAnswers[currentQuestion + 1] !== null); }}
              style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 600, background: colors.bgElevated, color: colors.textSecondary, border: 'none', borderRadius: '10px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              Next →
            </button>
          ) : allAnswered ? (
            <button
              onClick={() => { emit('game_completed', { score: testScore, total: 10, passed: testScore >= 7 }); goToPhase('mastery'); }}
              style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 600, background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
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
      { icon: '⬇️', title: 'COM Below Pivot = Stable' },
      { icon: '⬆️', title: 'COM Above Pivot = Unstable' },
      { icon: '⚖️', title: 'Adding Weight Shifts COM' },
      { icon: '🎯', title: 'Base of Support Matters' },
      { icon: '🔄', title: 'Gravity Provides Restoring Force' }
    ];

    return (
      <div style={{ padding: isMobile ? '24px 16px' : '48px 24px', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '80px', marginBottom: '16px' }}>{passed ? '🏆' : '📚'}</div>
        <h1 style={{ fontSize: isMobile ? '28px' : '36px', fontWeight: 700, color: colors.textPrimary, marginBottom: '8px' }}>
          {passed ? 'Balance Master!' : 'Keep Practicing!'}
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
                style={{ padding: '16px', fontSize: '16px', fontWeight: 600, color: '#fff', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, border: 'none', borderRadius: '14px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
              >
                🏠 Return to Dashboard
              </button>
              <button
                onClick={() => goToPhase('hook')}
                style={{ padding: '16px', fontSize: '14px', fontWeight: 600, color: colors.textSecondary, background: 'transparent', border: `1px solid ${colors.bgHover}`, borderRadius: '14px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              >
                🔬 Review Lesson
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => goToPhase('test')}
                style={{ padding: '16px', fontSize: '16px', fontWeight: 600, color: '#fff', background: `linear-gradient(135deg, ${colors.warning} 0%, #ea580c 100%)`, border: 'none', borderRadius: '14px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
              >
                ↺ Retake Test
              </button>
              <button
                onClick={() => goToPhase('hook')}
                style={{ padding: '16px', fontSize: '14px', fontWeight: 600, color: colors.textSecondary, background: 'transparent', border: `1px solid ${colors.bgHover}`, borderRadius: '14px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              >
                🔬 Review Lesson
              </button>
              <button
                onClick={handleReturnToDashboard}
                style={{ padding: '12px', fontSize: '13px', color: colors.textMuted, background: 'transparent', border: 'none', textDecoration: 'underline', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
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
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 30% 20%, ${colors.primary}08 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, ${colors.accent}05 0%, transparent 50%)`, pointerEvents: 'none' }}/>

      {/* Header */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: `${colors.bgSurface}e6`, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${colors.bgHover}`, position: 'relative', zIndex: 50 }}>
        <span style={{ fontSize: '15px', fontWeight: 600, color: colors.textPrimary }}>Center of Mass</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => { if (i <= currentIdx) goToPhase(p); }}
              style={{
                width: phase === p ? '24px' : '8px', height: '8px', borderRadius: '4px', border: 'none',
                background: phase === p ? colors.primary : i < currentIdx ? colors.secondary : colors.bgElevated,
                cursor: i <= currentIdx ? 'pointer' : 'default',
                transition: 'all 0.2s', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
              }}
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

export default CenterOfMassRenderer;
