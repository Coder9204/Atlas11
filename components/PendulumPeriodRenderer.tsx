'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// ============================================================================
// PENDULUM PERIOD - Premium Design (Inline Styles Only)
// 10-Phase Learning Structure
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Review',
  twist_predict: 'Twist Predict',
  twist_play: 'Twist Experiment',
  twist_review: 'Twist Review',
  transfer: 'Transfer',
  test: 'Test',
  mastery: 'Mastery'
};

interface GameEvent {
  type: string;
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface PendulumPeriodRendererProps {
  width?: number;
  height?: number;
  onBack?: () => void;
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

// Real-world applications data
const realWorldApps = [
  {
    icon: '🕰️',
    title: 'Grandfather Clocks',
    tagline: 'Precision Timekeeping for Centuries',
    description: "Grandfather clocks use the pendulum's consistent period to keep accurate time. The period depends only on pendulum length, so adjusting the bob height fine-tunes the clock. For centuries, pendulum clocks were the most accurate timekeeping devices available, enabling advances in navigation, astronomy, and scientific measurement that shaped modern civilization.",
    connection: "Since mass doesn't affect period, clockmakers can use decorative brass bobs or simple lead weights and both keep identical time if the length is the same. This is directly demonstrated in our experiment.",
    howItWorks: "An escapement mechanism gives the pendulum small pushes to overcome air resistance. Each swing advances the gear train by one tooth, moving the hands at a precise rate determined by the pendulum length.",
    stats: [
      { value: '1 s', label: 'standard period', icon: '⏱️' },
      { value: '99 m', label: 'seconds pendulum', icon: '📏' },
      { value: '2 kg', label: 'typical bob mass', icon: '🎯' }
    ],
    examples: ['Westminster chime clocks', 'Regulator clocks in observatories', 'Antique longcase clocks', 'Metronomes for musicians'],
    companies: ['Howard Miller', 'Hermle', 'Kieninger', 'Seth Thomas'],
    color: '#10b981'
  },
  {
    icon: '📈',
    title: 'Seismographs',
    tagline: 'Detecting Earthquakes Worldwide',
    description: "Early seismographs used pendulums to detect earthquakes. The pendulum's inertia keeps it stationary while the ground moves, allowing measurement of seismic waves. Modern seismograph networks can detect earthquakes anywhere on Earth within minutes, providing critical early warning data for tsunami alerts and emergency response coordination.",
    connection: "The pendulum period determines which earthquake frequencies are detected. Longer pendulums with longer periods detect slower, more distant quakes across greater distances.",
    howItWorks: "When the ground shakes, the pendulum stays relatively still due to inertia while the frame moves. A pen attached to the bob traces the relative motion on a rotating drum, creating a seismogram.",
    stats: [
      { value: '15 s', label: 'teleseismic period', icon: '📜' },
      { value: '100 kg', label: 'sensor mass', icon: '⏱️' },
      { value: '9 m', label: 'detection depth', icon: '🔬' }
    ],
    examples: ['Wiechert inverted pendulum', 'Wood-Anderson torsion seismometer', 'Galitzin seismograph', 'Modern broadband sensors'],
    companies: ['USGS', 'Guralp', 'Streckeisen', 'Nanometrics'],
    color: '#ef4444'
  },
  {
    icon: '🌍',
    title: 'Foucault Pendulum',
    tagline: 'Proving Earth Rotates',
    description: "Foucault pendulums demonstrate Earth's rotation. The swing plane appears to rotate because Earth turns underneath while the pendulum maintains its original plane of oscillation. This elegant experiment, first performed publicly in 1851 at the Paris Pantheon, provided the first direct visual proof that the Earth rotates on its axis.",
    connection: "The predictable period independent of mass allows precise tracking of the apparent rotation rate, which varies with latitude. At the poles it completes a full rotation daily.",
    howItWorks: "A heavy bob on a long wire swings for hours. At the poles, the plane rotates 360 degrees per day. At other latitudes, the rotation rate equals 360 degrees times the sine of latitude per day.",
    stats: [
      { value: '67 m', label: 'longest pendulum', icon: '📐' },
      { value: '28 kg', label: 'typical bob mass', icon: '⚖️' },
      { value: '360 W', label: 'drive power', icon: '🔄' }
    ],
    examples: ['Paris Pantheon original 1851', 'United Nations HQ', 'California Academy of Sciences', 'Griffith Observatory'],
    companies: ['Science Museums Worldwide', 'Universities', 'Public Institutions', 'Research Facilities'],
    color: '#8b5cf6'
  },
  {
    icon: '🎵',
    title: 'Metronomes',
    tagline: 'Perfect Musical Timing',
    description: "Metronomes use an inverted pendulum with an adjustable weight to set tempo. Musicians rely on the consistent beat to practice rhythm and maintain tempo during performances. From classical orchestras to modern recording studios, the principle of pendulum period has shaped how music is created and performed worldwide.",
    connection: "Moving the weight up or down changes the effective length, changing the period. The mass of the weight doesn't matter because only its position affects the tempo.",
    howItWorks: "An inverted pendulum with a counterweight below the pivot swings back and forth. A spring mechanism gives pulses to maintain oscillation and produces the characteristic click sound.",
    stats: [
      { value: '208 V', label: 'max BPM range', icon: '🎵' },
      { value: '3 kg', label: 'device weight', icon: '📜' },
      { value: '5 W', label: 'power consumption', icon: '🎯' }
    ],
    examples: ['Wittner Taktell', 'Seth Thomas metronomes', 'Digital metronomes', 'Smartphone apps'],
    companies: ['Wittner', 'Seiko', 'Korg', 'Boss'],
    color: '#ec4899'
  }
];

// Test questions - AVOID words: "continue", "submit", "finish", "see results", "next question" in answer text
const testQuestions = [
  {
    scenario: "You're timing a grandfather clock pendulum. The brass bob feels heavy in your hand.",
    question: "If you replaced the brass bob with an aluminum one of the same size (but lighter), what would happen to the period?",
    options: [
      { id: 'a', text: "Period would increase because lighter things always swing much slower", correct: false },
      { id: 'b', text: "Period would decrease because lighter things accelerate more easily", correct: false },
      { id: 'c', text: "Period would stay the same because mass cancels out in the equation", correct: true },
      { id: 'd', text: "Period would become erratic due to the material change affecting motion", correct: false }
    ],
    explanation: "In the pendulum equation T = 2pi*sqrt(L/g), mass doesn't appear! The bob's mass appears in both gravitational force (mg) and inertia (ma), canceling completely. Only length and gravity determine period."
  },
  {
    scenario: "A student sets up two identical pendulums but uses a 1 kg bob on one and a 5 kg bob on the other.",
    question: "They start both at the same angle and release simultaneously. Which reaches the bottom first?",
    options: [
      { id: 'a', text: "The 5 kg bob reaches the bottom first because heavier objects fall faster", correct: false },
      { id: 'b', text: "The 1 kg bob reaches bottom first because lighter objects accelerate faster", correct: false },
      { id: 'c', text: "They arrive at the bottom at exactly the same time regardless of mass", correct: true },
      { id: 'd', text: "It depends entirely on the release technique used by the student", correct: false }
    ],
    explanation: "Both arrive simultaneously! In a pendulum, the restoring force is proportional to mass (F = mg*sin(theta)), but so is inertia (ma). They cancel, so all masses swing identically."
  },
  {
    scenario: "You need to design a pendulum clock with a 2-second period (1 second each way).",
    question: "What length should the pendulum be? (Use g = 10 m/s squared and pi squared is approximately 10)",
    options: [
      { id: 'a', text: "About 25 cm because shorter pendulums are more practical for clocks", correct: false },
      { id: 'b', text: "About 50 cm because that is half the period in centimeters", correct: false },
      { id: 'c', text: "About 100 cm (1 meter) as derived from the period equation", correct: true },
      { id: 'd', text: "About 200 cm (2 meters) because period equals length in some units", correct: false }
    ],
    explanation: "Using T = 2pi*sqrt(L/g): 2 = 2pi*sqrt(L/10). Solving: sqrt(L/10) = 1/pi, so L/10 = 1/pi squared which is approximately 0.1, giving L approximately 1 meter."
  },
  {
    scenario: "A Foucault pendulum at a science museum swings with a period of 16 seconds.",
    question: "Scientists want to double the period to 32 seconds. How should they change the length?",
    options: [
      { id: 'a', text: "Double the length to make it 2 times longer than the original", correct: false },
      { id: 'b', text: "Quadruple the length to make it 4 times longer than the original", correct: true },
      { id: 'c', text: "Increase length by the square root of 2 which is about 1.41 times longer", correct: false },
      { id: 'd', text: "The period cannot be changed by adjusting the pendulum length", correct: false }
    ],
    explanation: "Since T is proportional to sqrt(L), doubling the period requires quadrupling the length. If T2 = 2*T1, then sqrt(L2/g) = 2*sqrt(L1/g), so L2 = 4*L1."
  },
  {
    scenario: "On the Moon, gravity is about 1/6 of Earth's gravity.",
    question: "A 1-meter pendulum has a 2-second period on Earth. What is its period on the Moon?",
    options: [
      { id: 'a', text: "About 2 seconds which is the same period as on Earth", correct: false },
      { id: 'b', text: "About 5 seconds because sqrt(6) is approximately 2.45 times longer", correct: true },
      { id: 'c', text: "About 12 seconds because it would be 6 times longer on the Moon", correct: false },
      { id: 'd', text: "About 0.8 seconds because there is less atmospheric resistance", correct: false }
    ],
    explanation: "Since T = 2pi*sqrt(L/g) and Moon's g is 1/6 of Earth's, T_moon = sqrt(6) * T_earth = approximately 2.45 * 2s = approximately 5 seconds."
  },
  {
    scenario: "A child on a playground swing is pushed to a small angle and released.",
    question: "If the child's parent (who weighs 3 times more) sits on the same swing at the same angle, how does their period compare?",
    options: [
      { id: 'a', text: "Parent swings 3 times slower due to their much greater body weight", correct: false },
      { id: 'b', text: "Parent swings about 1.7 times slower due to the square root relationship", correct: false },
      { id: 'c', text: "Both have exactly the same period because mass does not affect it", correct: true },
      { id: 'd', text: "Parent swings faster because adults push off harder from the ground", correct: false }
    ],
    explanation: "The period is identical! A playground swing acts as a pendulum, and since mass cancels out (T = 2pi*sqrt(L/g)), the parent and child swing at the same rate."
  },
  {
    scenario: "You are exploring a cave and find an ancient pendulum. You measure its length as 2.5 meters.",
    question: "You time 10 complete swings and count about 32 seconds. What can you conclude about the local gravity?",
    options: [
      { id: 'a', text: "Gravity is normal at about 10 m/s squared based on the calculation", correct: true },
      { id: 'b', text: "Gravity is weaker than normal suggesting an underground void nearby", correct: false },
      { id: 'c', text: "Gravity is stronger than normal suggesting dense mineral deposits", correct: false },
      { id: 'd', text: "You cannot determine local gravity from this pendulum information", correct: false }
    ],
    explanation: "Period = 3.2 seconds. Using T = 2pi*sqrt(L/g): 3.2 = 2pi*sqrt(2.5/g). Solving: g = 4*pi^2*2.5/3.2^2 = approximately 10 m/s squared. This matches normal Earth gravity."
  },
  {
    scenario: "An engineer is designing a tuned mass damper for a skyscraper. The building sways with a 10-second period.",
    question: "What pendulum length is needed for the damper to match this frequency?",
    options: [
      { id: 'a', text: "About 2.5 meters which is practical for most building floors", correct: false },
      { id: 'b', text: "About 10 meters which matches the period number directly", correct: false },
      { id: 'c', text: "About 25 meters which requires significant vertical space in the building", correct: true },
      { id: 'd', text: "About 100 meters which would be impossible to fit in any building", correct: false }
    ],
    explanation: "Using T = 2pi*sqrt(L/g) with T = 10s: L = g*T^2/(4*pi^2) = 10*100/40 = 25 meters. This is why building dampers need significant vertical space!"
  },
  {
    scenario: "A physics student claims that swinging higher (larger amplitude) will make the period longer.",
    question: "Is the student correct for a simple pendulum with small to moderate angles?",
    options: [
      { id: 'a', text: "Yes because amplitude strongly and linearly affects the oscillation period", correct: false },
      { id: 'b', text: "No because period is completely independent of amplitude at all angles", correct: false },
      { id: 'c', text: "Partially correct because period is nearly constant for small angles but increases at large angles", correct: true },
      { id: 'd', text: "The opposite is true because larger amplitude means a shorter period overall", correct: false }
    ],
    explanation: "For small angles (less than 15 degrees), the period is essentially constant. However, the sin(theta) approximately equals theta approximation breaks down at large angles, causing slightly longer periods."
  },
  {
    scenario: "Two pendulums have the same length, but one swings in oil and one swings in air.",
    question: "Ignoring damping (energy loss), how do their natural periods compare?",
    options: [
      { id: 'a', text: "Oil pendulum is much slower due to the high viscosity of the fluid", correct: false },
      { id: 'b', text: "Oil pendulum is faster because oil provides additional buoyancy force", correct: false },
      { id: 'c', text: "Periods are nearly identical because the formula does not include medium density", correct: true },
      { id: 'd', text: "Cannot be determined without knowing the exact density of the oil used", correct: false }
    ],
    explanation: "The natural period depends only on length and gravity, not on the surrounding medium. The oil causes faster damping (energy loss), but each swing still takes the same time."
  }
];

const PendulumPeriodRenderer: React.FC<PendulumPeriodRendererProps> = ({
  width = 800,
  height = 600,
  onBack,
  onGameEvent,
  gamePhase,
  onPhaseComplete
}) => {
  const [phase, setPhase] = useState<Phase>('hook');

  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      const sounds = { click: { freq: 600, duration: 0.1, type: 'sine' as OscillatorType }, success: { freq: 800, duration: 0.2, type: 'sine' as OscillatorType }, failure: { freq: 300, duration: 0.3, type: 'sine' as OscillatorType }, transition: { freq: 500, duration: 0.15, type: 'sine' as OscillatorType }, complete: { freq: 900, duration: 0.4, type: 'sine' as OscillatorType } };
      const sound = sounds[type];
      oscillator.frequency.value = sound.freq;
      oscillator.type = sound.type;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + sound.duration);
    } catch { /* Audio not supported */ }
  }, []);

  const emitEvent = useCallback((type: string, details: Record<string, unknown> = {}) => {
    if (onGameEvent) {
      onGameEvent({ type, gameType: 'pendulum_period', gameTitle: 'Pendulum Period', details: { phase, ...details }, timestamp: Date.now() });
    }
  }, [onGameEvent, phase]);

  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    emitEvent('phase_change', { from: phase, to: newPhase });
    if (onPhaseComplete) onPhaseComplete(newPhase);
  }, [playSound, emitEvent, phase, onPhaseComplete]);

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(new Array(testQuestions.length).fill(null));
  const [confirmedQuestions, setConfirmedQuestions] = useState<Set<number>>(new Set());
  const [testScore, setTestScore] = useState(0);
  const [testSubmitted, setTestSubmitted] = useState(false);

  // Pendulum simulation state
  const [pendulumLength, setPendulumLength] = useState(150);
  const [bobMass, setBobMass] = useState(1);
  const [angle, setAngle] = useState(0);
  const [angVel, setAngVel] = useState(0);
  const [isSwinging, setIsSwinging] = useState(false);
  const [simTime, setSimTime] = useState(0);
  const [gravity, setGravity] = useState(9.8);

  const animationRef = useRef<number | null>(null);

  const colors = {
    primary: '#10b981',
    primaryLight: '#34d399',
    primaryDark: '#059669',
    accent: '#f59e0b',
    accentLight: '#fbbf24',
    success: '#22c55e',
    successLight: '#4ade80',
    warning: '#f59e0b',
    danger: '#ef4444',
    bgDark: '#0a0a0f',
    bgCard: '#12121a',
    bgCardLight: '#1a1a24',
    bgElevated: '#22222e',
    border: '#2a2a36',
    borderLight: '#3a3a48',
    textPrimary: '#fafafa',
    textSecondary: 'rgba(161,161,170,0.85)',
    textMuted: 'rgba(113,113,122,0.7)',
  };

  const currentPhaseIndex = phaseOrder.indexOf(phase);
  const canGoBack = currentPhaseIndex > 0;
  const canGoNext = currentPhaseIndex < phaseOrder.length - 1 && phase !== 'test';

  // Pendulum physics simulation
  useEffect(() => {
    if (!isSwinging) { if (animationRef.current) cancelAnimationFrame(animationRef.current); return; }
    let lastTime = performance.now();
    let a = Math.PI / 6; // Start at 30 degrees
    let av = 0;
    let st = 0;
    const L = pendulumLength / 100; // Convert to meters
    const animate = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      st += dt;
      const acc = -(gravity / L) * Math.sin(a);
      av += acc * dt;
      av *= 0.9995; // Tiny damping
      a += av * dt;
      setAngle(a);
      setAngVel(av);
      setSimTime(st);
      if (st > 30) { setIsSwinging(false); return; }
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isSwinging, pendulumLength, gravity]);

  const startSwing = useCallback(() => { setAngle(Math.PI / 6); setAngVel(0); setSimTime(0); setIsSwinging(true); }, []);
  const stopSwing = useCallback(() => { setIsSwinging(false); setAngle(0); setAngVel(0); setSimTime(0); }, []);

  useEffect(() => { return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); }; }, []);
  useEffect(() => { if (phase === 'mastery') { emitEvent('mastery_achieved', { score: testScore, total: testQuestions.length }); } }, [phase, testScore, emitEvent]);

  const cardStyle: React.CSSProperties = { background: colors.bgCard, borderRadius: '16px', padding: '24px', border: `1px solid ${colors.border}`, boxShadow: '0 4px 16px rgba(0,0,0,0.3)' };
  const primaryBtnStyle: React.CSSProperties = { padding: '14px 32px', borderRadius: '12px', border: 'none', background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`, color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '16px', transition: 'all 0.3s ease', zIndex: 10, position: 'relative' as const, boxShadow: '0 4px 12px rgba(16,185,129,0.3)' };

  const renderProgressBar = () => {
    const progress = ((currentPhaseIndex + 1) / phaseOrder.length) * 100;
    return (<div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '3px', background: colors.bgCardLight, zIndex: 100 }}><div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`, borderRadius: '0 2px 2px 0', transition: 'width 0.5s ease' }} /></div>);
  };

  const renderNavDots = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {phaseOrder.map((p, i) => (
        <button key={p} onClick={() => goToPhase(p)} title={phaseLabels[p]} aria-label={phaseLabels[p]} style={{ height: '8px', width: phase === p ? '24px' : '8px', borderRadius: '9999px', border: 'none', cursor: 'pointer', background: phase === p ? colors.primary : currentPhaseIndex > i ? colors.success : colors.bgCardLight, boxShadow: phase === p ? `0 0 12px ${colors.primary}40` : 'none', transition: 'all 0.3s ease', zIndex: 10, position: 'relative' as const }} />
      ))}
    </div>
  );

  const renderBottomBar = () => (
    <div style={{ padding: '16px 24px', background: colors.bgCard, borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <button onClick={() => canGoBack && goToPhase(phaseOrder[currentPhaseIndex - 1])} disabled={!canGoBack} style={{ padding: '10px 24px', borderRadius: '10px', border: `1px solid ${colors.border}`, background: 'transparent', color: canGoBack ? colors.textPrimary : colors.textMuted, cursor: canGoBack ? 'pointer' : 'default', fontWeight: 600, fontSize: '14px', transition: 'all 0.2s ease', opacity: canGoBack ? 1 : 0.4 }}>Back</button>
      {renderNavDots()}
      <button onClick={() => canGoNext && goToPhase(phaseOrder[currentPhaseIndex + 1])} disabled={!canGoNext || phase === 'test'} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: canGoNext && phase !== 'test' ? `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})` : colors.bgCardLight, color: canGoNext && phase !== 'test' ? 'white' : colors.textMuted, cursor: canGoNext && phase !== 'test' ? 'pointer' : 'default', fontWeight: 600, fontSize: '14px', transition: 'all 0.2s ease', opacity: canGoNext && phase !== 'test' ? 1 : 0.4 }}>Next</button>
    </div>
  );

  // Pendulum SVG visualization
  const renderPendulum = (showControls: boolean = true) => {
    const svgW = 380;
    const svgH = 280;
    const pivotX = svgW / 2;
    const pivotY = 40;
    const displayLen = Math.min(pendulumLength, 200);
    const bobX = pivotX + displayLen * Math.sin(angle);
    const bobY = pivotY + displayLen * Math.cos(angle);
    const bobRadius = 10 + bobMass * 3;
    const massColor = bobMass <= 1 ? colors.primary : bobMass <= 3 ? colors.accent : colors.danger;
    const period = (2 * Math.PI * Math.sqrt(pendulumLength / 100 / gravity)).toFixed(2);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', maxWidth: `${svgW}px`, height: 'auto', borderRadius: '16px', border: `1px solid ${colors.border}` }}>
          <defs>
            <linearGradient id="pendBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a1a24" />
              <stop offset="50%" stopColor="#121218" />
              <stop offset="100%" stopColor="#0a0a0f" />
            </linearGradient>
            <linearGradient id="pendStringGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#71717a" />
              <stop offset="100%" stopColor="#4a4a58" />
            </linearGradient>
            <radialGradient id="pendBobGrad" cx="30%" cy="25%">
              <stop offset="0%" stopColor={massColor} stopOpacity="1" />
              <stop offset="50%" stopColor={massColor} stopOpacity="0.8" />
              <stop offset="100%" stopColor={massColor} stopOpacity="0.5" />
            </radialGradient>
            <radialGradient id="pendLenGlow" cx="50%" cy="50%">
              <stop offset="0%" stopColor={colors.primary} stopOpacity={0.2 + pendulumLength / 500} />
              <stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
            </radialGradient>
            <filter id="pendGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="pendShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width={svgW} height={svgH} fill="url(#pendBgGrad)" />

          {/* Grid */}
          <g opacity="0.06">
            {[1,2,3,4,5].map(i => <line key={`h${i}`} x1="0" y1={i * svgH / 6} x2={svgW} y2={i * svgH / 6} stroke="#fff" strokeWidth="0.5" />)}
            {[1,2,3,4,5,6,7].map(i => <line key={`v${i}`} x1={i * svgW / 8} y1="0" x2={i * svgW / 8} y2={svgH} stroke="#fff" strokeWidth="0.5" />)}
          </g>

          {/* Length indicator - changes with slider */}
          <g opacity={0.3 + pendulumLength / 400}>
            <circle cx={svgW - 30} cy={30} r={8 + pendulumLength / 30} fill="url(#pendLenGlow)" />
            <circle cx={svgW - 30} cy={30} r={3} fill={colors.primary} />
            <path d={`M ${svgW - 42} 30 Q ${svgW - 36} ${30 - pendulumLength / 30} ${svgW - 30} 30`} fill="none" stroke={colors.primary} strokeWidth="1.5" />
          </g>

          {/* Pivot support */}
          <g>
            <rect x={pivotX - 30} y={pivotY - 8} width="60" height="10" rx="3" fill="#3a3a48" />
            <path d={`M ${pivotX - 30} ${pivotY - 8} L ${pivotX - 40} ${pivotY - 18} L ${pivotX + 40} ${pivotY - 18} L ${pivotX + 30} ${pivotY - 8}`} fill="#2a2a36" />
          </g>

          {/* Equilibrium line */}
          <line x1={pivotX} y1={pivotY} x2={pivotX} y2={pivotY + displayLen + 30} stroke="#71717a" strokeWidth="1" strokeDasharray="6,4" opacity="0.3" />

          {/* String */}
          <g>
            <line x1={pivotX} y1={pivotY} x2={bobX} y2={bobY} stroke="url(#pendStringGrad)" strokeWidth="2.5" filter="url(#pendShadow)" />
          </g>

          {/* Bob */}
          <g>
            <circle cx={bobX} cy={bobY} r={bobRadius + 4} fill={massColor} opacity="0.15" filter="url(#pendGlow)" />
            <circle cx={bobX} cy={bobY} r={bobRadius} fill="url(#pendBobGrad)" />
            <ellipse cx={bobX - bobRadius * 0.2} cy={bobY - bobRadius * 0.2} rx={bobRadius * 0.3} ry={bobRadius * 0.25} fill="white" opacity="0.2" />
          </g>

          {/* Pivot dot */}
          <circle cx={pivotX} cy={pivotY} r={4} fill="#5a5a68" />

          {/* Labels */}
          <g>
            <text x={pivotX} y={svgH - 10} fill="#71717a" fontSize="9" textAnchor="middle">Equilibrium</text>
            <text x={svgW - 30} y={svgH - 10} fill={colors.primary} fontSize="8" textAnchor="middle">T={period}s</text>
            <text x={30} y={svgH - 10} fill={massColor} fontSize="8" textAnchor="start">m={bobMass}kg</text>
          </g>
        </svg>

        {showControls && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '380px', padding: '16px', background: colors.bgCard, borderRadius: '12px', border: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: colors.textSecondary, minWidth: '80px', fontWeight: 500 }}>Length (cm):</span>
              <input type="range" min="30" max="250" step="5" value={pendulumLength} onChange={(e) => { setPendulumLength(Number(e.target.value)); stopSwing(); }} style={{ flex: 1, accentColor: colors.primary }} />
              <span style={{ fontSize: '13px', color: colors.textPrimary, minWidth: '50px', fontWeight: 600 }}>{pendulumLength} cm</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: colors.textSecondary, minWidth: '80px', fontWeight: 500 }}>Mass (kg):</span>
              <input type="range" min="0.5" max="5" step="0.5" value={bobMass} onChange={(e) => { setBobMass(Number(e.target.value)); stopSwing(); }} style={{ flex: 1, accentColor: colors.accent }} />
              <span style={{ fontSize: '13px', color: colors.textPrimary, minWidth: '50px', fontWeight: 600 }}>{bobMass} kg</span>
            </div>
            <button onClick={() => isSwinging ? stopSwing() : startSwing()} style={{ ...primaryBtnStyle, padding: '12px 16px', fontSize: '14px', background: isSwinging ? `linear-gradient(135deg, ${colors.danger}, #dc2626)` : `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})` }}>
              {isSwinging ? 'Stop' : 'Release Pendulum'}
            </button>
            <div style={{ padding: '12px', background: colors.bgCardLight, borderRadius: '8px', border: `1px solid ${colors.border}`, textAlign: 'center' }}>
              <span style={{ fontSize: '13px', color: colors.textSecondary }}>Period T = 2pi*sqrt(L/g) = <strong style={{ color: colors.primary }}>{period} s</strong> (independent of mass!)</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderHook = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: `${colors.primary}15`, border: `1px solid ${colors.primary}30`, borderRadius: '9999px', marginBottom: '32px' }}>
        <span style={{ width: '8px', height: '8px', background: colors.primary, borderRadius: '9999px' }} />
        <span style={{ fontSize: '13px', fontWeight: 600, color: colors.primary, letterSpacing: '0.05em' }}>PHYSICS EXPLORATION</span>
      </div>
      <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#ffffff', marginBottom: '16px', lineHeight: 1.1 }}>Pendulum Period</h1>
      <p style={{ fontSize: '18px', color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px', lineHeight: 1.7 }}>Discover what controls the rhythm of a swinging pendulum</p>
      <div style={{ ...cardStyle, maxWidth: '520px', width: '100%', marginBottom: '32px', position: 'relative' as const }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🕰️</div>
        <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.9)', fontWeight: 500, lineHeight: 1.7, marginBottom: '12px' }}>A heavy brass pendulum and a light aluminum pendulum of the same length are released from the same angle.</p>
        <p style={{ fontSize: '16px', color: colors.textSecondary, lineHeight: 1.7, marginBottom: '12px' }}>Which one swings faster? Does weight determine rhythm?</p>
        <p style={{ fontSize: '16px', color: colors.primary, fontWeight: 600 }}>The answer has kept time for centuries!</p>
      </div>
      <button onClick={() => goToPhase('predict')} style={primaryBtnStyle}>Explore Pendulums</button>
      <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '32px', fontSize: '14px', color: colors.textMuted }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: colors.primary }}>✦</span>Interactive Lab</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: colors.primary }}>✦</span>Real-World Examples</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: colors.primary }}>✦</span>Knowledge Test</div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '32px 24px', alignItems: 'center' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>Your Prediction</h2>
      <p style={{ fontSize: '16px', color: colors.textSecondary, marginBottom: '24px', textAlign: 'center' }}>Two pendulums of equal length but different masses...</p>
      <div style={{ marginBottom: '24px' }}>
        <svg width="360" height="200" viewBox="0 0 360 200">
          <defs>
            <linearGradient id="predPendBg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a1a24" /><stop offset="100%" stopColor="#0a0a0f" /></linearGradient>
            <radialGradient id="predHeavy" cx="30%" cy="25%"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#d97706" /></radialGradient>
            <radialGradient id="predLight" cx="30%" cy="25%"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#059669" /></radialGradient>
            <filter id="predPendGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          <rect width="360" height="200" fill="url(#predPendBg)" rx="12" />
          <g opacity="0.06">{[0,1,2,3,4].map(i => <line key={`h${i}`} x1="0" y1={i*50} x2="360" y2={i*50} stroke="#fff" strokeWidth="0.5" />)}{[0,1,2,3,4,5,6].map(i => <line key={`v${i}`} x1={i*60} y1="0" x2={i*60} y2="200" stroke="#fff" strokeWidth="0.5" />)}</g>
          {/* Support beam */}
          <g><rect x="60" y="20" width="240" height="8" rx="3" fill="#3a3a48" /><path d="M 80 20 L 70 10 L 290 10 L 280 20" fill="#2a2a36" /></g>
          {/* Heavy pendulum */}
          <g><line x1="120" y1="28" x2="120" y2="130" stroke="#71717a" strokeWidth="2" /><circle cx="120" cy="140" r="20" fill="url(#predHeavy)" filter="url(#predPendGlow)" /><text x="120" y="175" fill={colors.accent} fontSize="10" textAnchor="middle" fontWeight="600">Heavy (5 kg)</text></g>
          {/* Light pendulum */}
          <g><line x1="240" y1="28" x2="240" y2="130" stroke="#71717a" strokeWidth="2" /><circle cx="240" cy="135" r="12" fill="url(#predLight)" filter="url(#predPendGlow)" /><text x="240" y="175" fill={colors.primary} fontSize="10" textAnchor="middle" fontWeight="600">Light (1 kg)</text></g>
          {/* Question marks */}
          <g opacity="0.6"><text x="180" y="80" fill={colors.primary} fontSize="28" fontWeight="700" textAnchor="middle">?</text><text x="50" y="100" fill={colors.accent} fontSize="18" fontWeight="700">?</text><text x="310" y="90" fill={colors.warning} fontSize="16" fontWeight="700">?</text></g>
        </svg>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '520px', width: '100%' }}>
        {[
          { id: 'heavy_faster', label: 'Heavy bob swings faster (gravity pulls harder)', icon: '🏋️' },
          { id: 'light_faster', label: 'Light bob swings faster (less inertia to overcome)', icon: '🪶' },
          { id: 'same', label: 'They swing at exactly the same rate', icon: '⏱️' },
          { id: 'depends', label: 'It depends on the angle of release', icon: '📐' }
        ].map(option => (
          <button key={option.id} onClick={() => setPrediction(option.id)} style={{ padding: '18px', fontSize: '15px', fontWeight: prediction === option.id ? 700 : 500, color: prediction === option.id ? '#0a0a0f' : colors.textPrimary, background: prediction === option.id ? `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})` : colors.bgCard, border: `2px solid ${prediction === option.id ? colors.primary : colors.border}`, borderRadius: '12px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s ease', boxShadow: prediction === option.id ? '0 4px 12px rgba(16,185,129,0.3)' : 'none', zIndex: 10, position: 'relative' as const }}>
            <span style={{ fontSize: '28px' }}>{option.icon}</span>{option.label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: '24px', padding: '16px', background: colors.bgCard, borderRadius: '12px', border: `1px solid ${colors.border}`, maxWidth: '520px', width: '100%' }}>
        <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}><strong style={{ color: colors.textPrimary }}>Think about it:</strong> Heavier objects experience more gravitational force, but they also have more inertia. How do these two effects balance out?</p>
      </div>
    </div>
  );

  const renderPlay = () => (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <span style={{ fontSize: '28px' }}>🔬</span>
        <div><h2 style={{ fontSize: '24px', fontWeight: 800, color: colors.textPrimary, margin: 0 }}>Experiment</h2><p style={{ fontSize: '15px', color: colors.textSecondary, margin: 0 }}>Change the mass and length, then observe the period</p></div>
      </div>
      <div style={{ padding: '12px', background: colors.bgCardLight, borderRadius: '12px', border: `1px solid ${colors.border}`, marginBottom: '16px' }}>
        <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>When you increase the length, the period increases because the pendulum has farther to travel. This is why clocks use precise pendulum lengths. When you change the mass, observe what happens to the period - this practical experiment helps engineers design timekeeping devices.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>{renderPendulum(true)}</div>
    </div>
  );

  const renderReview = () => {
    const wasCorrect = prediction === 'same';
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ padding: '32px', background: wasCorrect ? `linear-gradient(135deg, ${colors.success}15, ${colors.success}05)` : `linear-gradient(135deg, ${colors.accent}15, ${colors.accent}05)`, borderRadius: '16px', border: `1px solid ${wasCorrect ? colors.success : colors.accent}40`, marginBottom: '24px', textAlign: 'center' }}>
          <span style={{ fontSize: '56px' }}>{wasCorrect ? '🎉' : '💡'}</span>
          <h3 style={{ fontSize: '22px', color: wasCorrect ? colors.success : colors.accent, marginTop: '12px', fontWeight: 700 }}>{wasCorrect ? 'Correct! Your prediction was right!' : 'Surprising result!'}</h3>
          <p style={{ fontSize: '14px', color: colors.textSecondary, marginTop: '8px' }}>As you observed in the experiment, mass does not affect the period!</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}><span style={{ fontSize: '28px' }}>📚</span><h2 style={{ fontSize: '24px', fontWeight: 800, color: colors.textPrimary, margin: 0 }}>The Physics of Pendulum Period</h2></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <div style={{ ...cardStyle, padding: '20px' }}><h4 style={{ fontSize: '15px', color: colors.primary, marginBottom: '12px', fontWeight: 700 }}>Why Mass Cancels</h4><p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>The gravitational force on the bob is F = mg*sin(theta), proportional to mass. But Newton's second law says F = ma, where a is acceleration. Since mg*sin(theta) = ma, the mass cancels completely. Acceleration depends only on angle and gravity. This is the same reason all objects fall at the same rate in a vacuum regardless of their mass.</p></div>
          <div style={{ ...cardStyle, padding: '20px' }}><h4 style={{ fontSize: '15px', color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>The Period Formula</h4><p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>For small angles, the period is T = 2*pi*sqrt(L/g), where L is the pendulum length and g is gravitational acceleration. Notice that mass appears nowhere in this equation. The period depends only on two things: the length of the pendulum and the strength of gravity. Doubling the length increases the period by a factor of sqrt(2).</p></div>
        </div>
        <div style={{ padding: '24px', background: colors.bgCardLight, borderRadius: '16px', border: `1px solid ${colors.primary}30`, marginBottom: '24px' }}>
          <h4 style={{ fontSize: '16px', color: colors.textPrimary, marginBottom: '12px', textAlign: 'center', fontWeight: 700 }}>The Simple Pendulum Equation</h4>
          <div style={{ fontSize: '24px', color: colors.primary, fontWeight: 700, textAlign: 'center', padding: '16px', background: colors.bgDark, borderRadius: '8px', fontFamily: 'monospace' }}>T = 2*pi*sqrt(L/g)</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', color: colors.textSecondary }}><strong style={{ color: colors.primary }}>T</strong> = period</span>
            <span style={{ fontSize: '14px', color: colors.textSecondary }}><strong style={{ color: colors.primary }}>L</strong> = length</span>
            <span style={{ fontSize: '14px', color: colors.textSecondary }}><strong style={{ color: colors.primary }}>g</strong> = gravity</span>
          </div>
        </div>
        <div style={{ padding: '20px', background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}10)`, borderRadius: '16px', border: `1px solid ${colors.primary}40` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}><span style={{ fontSize: '24px' }}>💡</span><p style={{ fontSize: '15px', color: colors.textPrimary, margin: 0, lineHeight: 1.7 }}>The independence of period from mass is one of the most elegant results in physics. It directly follows from the equivalence of gravitational and inertial mass, a principle that later became a cornerstone of Einstein's General Relativity.</p></div>
        </div>
      </div>
    );
  };

  const renderTwistPredict = () => (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '32px 24px', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}><span style={{ fontSize: '28px' }}>🌀</span><h2 style={{ fontSize: '24px', fontWeight: 800, color: colors.textPrimary, margin: 0 }}>The Twist</h2></div>
      <p style={{ fontSize: '16px', color: colors.textSecondary, marginBottom: '24px', textAlign: 'center' }}>What happens to the period on different planets?</p>
      <div style={{ marginBottom: '24px' }}>
        <svg width="360" height="180" viewBox="0 0 360 180">
          <defs>
            <linearGradient id="twistPendBg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a1a24" /><stop offset="100%" stopColor="#0a0a0f" /></linearGradient>
            <radialGradient id="twistEarth" cx="50%" cy="50%"><stop offset="0%" stopColor="#22c55e" /><stop offset="100%" stopColor="#15803d" /></radialGradient>
            <radialGradient id="twistMoon" cx="50%" cy="50%"><stop offset="0%" stopColor="#94a3b8" /><stop offset="100%" stopColor="#64748b" /></radialGradient>
            <filter id="twistPendGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          <rect width="360" height="180" fill="url(#twistPendBg)" rx="12" />
          {/* Earth side */}
          <g><circle cx="90" cy="140" r="30" fill="url(#twistEarth)" filter="url(#twistPendGlow)" /><text x="90" y="148" fill="white" fontSize="10" textAnchor="middle" fontWeight="600">Earth</text><line x1="90" y1="30" x2="90" y2="90" stroke="#71717a" strokeWidth="2" /><circle cx="90" cy="95" r="10" fill={colors.primary} /></g>
          {/* Moon side */}
          <g><circle cx="270" cy="140" r="20" fill="url(#twistMoon)" filter="url(#twistPendGlow)" /><text x="270" y="145" fill="white" fontSize="9" textAnchor="middle" fontWeight="600">Moon</text><line x1="270" y1="30" x2="270" y2="90" stroke="#71717a" strokeWidth="2" /><circle cx="270" cy="95" r="10" fill={colors.accent} /></g>
          {/* Question */}
          <g><text x="180" y="60" fill={colors.primary} fontSize="24" fontWeight="700" textAnchor="middle">?</text><text x="180" y="110" fill={colors.warning} fontSize="14" fontWeight="600" textAnchor="middle">Same pendulum</text><text x="180" y="130" fill={colors.warning} fontSize="14" fontWeight="600" textAnchor="middle">Different gravity</text></g>
        </svg>
      </div>
      <div style={{ padding: '16px', background: colors.bgCardLight, borderRadius: '12px', border: `1px solid ${colors.border}`, marginBottom: '24px', maxWidth: '520px', width: '100%' }}>
        <p style={{ fontSize: '15px', color: colors.textSecondary, margin: 0, lineHeight: 1.7 }}>The same pendulum is taken to the Moon where gravity is 1/6 of Earth's. <strong style={{ color: colors.textPrimary }}>How does the period change?</strong></p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '520px', width: '100%' }}>
        {[
          { id: 'same', label: 'Period stays the same (gravity does not matter)', icon: '⏱️' },
          { id: 'slower', label: 'Period increases (pendulum swings slower on Moon)', icon: '🌙' },
          { id: 'faster', label: 'Period decreases (pendulum swings faster on Moon)', icon: '⚡' },
          { id: 'stops', label: 'Pendulum would not swing at all on the Moon', icon: '🚫' }
        ].map(option => (
          <button key={option.id} onClick={() => setTwistPrediction(option.id)} style={{ padding: '18px', fontSize: '15px', fontWeight: twistPrediction === option.id ? 700 : 500, color: twistPrediction === option.id ? '#0a0a0f' : colors.textPrimary, background: twistPrediction === option.id ? `linear-gradient(135deg, ${colors.accent}, ${colors.accentLight})` : colors.bgCard, border: `2px solid ${twistPrediction === option.id ? colors.accent : colors.border}`, borderRadius: '12px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s ease', boxShadow: twistPrediction === option.id ? '0 4px 12px rgba(245,158,11,0.3)' : 'none', zIndex: 10, position: 'relative' as const }}>
            <span style={{ fontSize: '28px' }}>{option.icon}</span>{option.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}><span style={{ fontSize: '28px' }}>🔬</span><div><h2 style={{ fontSize: '24px', fontWeight: 800, color: colors.textPrimary, margin: 0 }}>Gravity Experiment</h2><p style={{ fontSize: '15px', color: colors.textSecondary, margin: 0 }}>Change gravity and observe the period change</p></div></div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', justifyContent: 'center' }}>
        {[{ id: 9.8, label: 'Earth (9.8)' }, { id: 3.7, label: 'Mars (3.7)' }, { id: 1.6, label: 'Moon (1.6)' }].map(m => (
          <button key={m.id} onClick={() => { setGravity(m.id); stopSwing(); }} style={{ padding: '12px 24px', fontSize: '14px', fontWeight: gravity === m.id ? 700 : 500, color: gravity === m.id ? '#0a0a0f' : colors.textPrimary, background: gravity === m.id ? `linear-gradient(135deg, ${colors.accent}, ${colors.accentLight})` : colors.bgCard, border: `2px solid ${gravity === m.id ? colors.accent : colors.border}`, borderRadius: '12px', cursor: 'pointer', zIndex: 10, position: 'relative' as const }}>
            {m.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>{renderPendulum(true)}</div>
    </div>
  );

  const renderTwistReview = () => {
    const wasCorrect = twistPrediction === 'slower';
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ padding: '32px', background: wasCorrect ? `linear-gradient(135deg, ${colors.success}15, ${colors.success}05)` : `linear-gradient(135deg, ${colors.accent}15, ${colors.accent}05)`, borderRadius: '16px', border: `1px solid ${wasCorrect ? colors.success : colors.accent}40`, marginBottom: '24px', textAlign: 'center' }}>
          <span style={{ fontSize: '56px' }}>{wasCorrect ? '🎯' : '💡'}</span>
          <h3 style={{ fontSize: '22px', color: wasCorrect ? colors.success : colors.accent, marginTop: '12px', fontWeight: 700 }}>{wasCorrect ? 'Correct! Lower gravity means a longer period!' : 'Lower gravity means a longer period!'}</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}><span style={{ fontSize: '28px' }}>📊</span><h2 style={{ fontSize: '24px', fontWeight: 800, color: colors.textPrimary, margin: 0 }}>Pendulum Period Across Worlds</h2></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { name: 'Earth', g: '9.8', period: '2.0s', icon: '🌍', color: colors.success },
            { name: 'Mars', g: '3.7', period: '3.3s', icon: '🔴', color: colors.danger },
            { name: 'Moon', g: '1.6', period: '5.0s', icon: '🌙', color: colors.textMuted }
          ].map((item, idx) => (
            <div key={idx} style={{ ...cardStyle, padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{item.icon}</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: item.color }}>{item.name}</div>
              <div style={{ fontSize: '13px', color: colors.textSecondary, margin: '4px 0' }}>g = {item.g} m/s squared</div>
              <div style={{ fontSize: '12px', color: colors.textMuted }}>T = {item.period} (1m pendulum)</div>
            </div>
          ))}
        </div>
        <div style={{ ...cardStyle, marginBottom: '16px' }}><h4 style={{ fontSize: '15px', color: colors.textPrimary, marginBottom: '12px', fontWeight: 700 }}>Why Does Gravity Affect Period?</h4><p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>Since T = 2*pi*sqrt(L/g), lower gravity means a larger value under the square root, producing a longer period. On the Moon (g = 1.6 m/s squared), the restoring force is much weaker, so the pendulum takes longer to complete each swing. This principle can be used to measure local gravity by timing a pendulum of known length, a technique that was historically important for geological surveys, mineral prospecting, and geodetic measurements.</p></div>
        <div style={{ padding: '20px', background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}10)`, borderRadius: '16px', border: `1px solid ${colors.primary}40` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}><span style={{ fontSize: '24px' }}>💡</span><p style={{ fontSize: '15px', color: colors.textPrimary, margin: 0, lineHeight: 1.7 }}>The pendulum equation beautifully shows which factors matter: length and gravity yes, mass no. This asymmetry reveals a deep truth about physics: gravitational mass and inertial mass are equivalent, a fact that Einstein later used as the foundation of General Relativity.</p></div>
        </div>
      </div>
    );
  };

  const renderTransfer = () => {
    const app = realWorldApps[activeApp];
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}><span style={{ fontSize: '28px' }}>🌍</span><h2 style={{ fontSize: '24px', fontWeight: 800, color: colors.textPrimary, margin: 0 }}>Real-World Applications</h2></div>
        <p style={{ fontSize: '15px', color: colors.textSecondary, margin: '0 0 8px', lineHeight: 1.6 }}>Pendulum period in engineering and science</p>
        <p style={{ fontSize: '13px', color: colors.textMuted, margin: '0 0 16px' }}>Application {activeApp + 1} of {realWorldApps.length}</p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '8px' }}>
          {realWorldApps.map((a, idx) => { const isCompleted = completedApps.has(idx); const isCurrent = idx === activeApp; return (
            <button key={idx} onClick={() => setActiveApp(idx)} style={{ padding: '12px 16px', fontSize: '14px', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#0a0a0f' : isCompleted ? colors.success : colors.textSecondary, background: isCurrent ? `linear-gradient(135deg, ${a.color}, ${a.color}dd)` : isCompleted ? `${colors.success}15` : colors.bgCard, border: `1px solid ${isCurrent ? a.color : isCompleted ? colors.success : colors.border}`, borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s ease', zIndex: 10, position: 'relative' as const }}>{isCompleted ? '✓ ' : ''}{a.icon} {a.title}</button>
          ); })}
        </div>
        <div style={{ ...cardStyle, overflow: 'hidden', padding: 0 }}>
          <div style={{ padding: '24px', background: `linear-gradient(135deg, ${app.color}20, transparent)`, borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}><span style={{ fontSize: '48px' }}>{app.icon}</span><div><h3 style={{ fontSize: '22px', color: colors.textPrimary, margin: 0, fontWeight: 800 }}>{app.title}</h3><p style={{ fontSize: '14px', color: app.color, margin: '4px 0 0', fontWeight: 600 }}>{app.tagline}</p></div></div>
            <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>{app.description}</p>
          </div>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${colors.border}` }}><h4 style={{ fontSize: '14px', color: app.color, marginBottom: '8px', fontWeight: 700 }}>Connection to Pendulum Period</h4><p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>{app.connection}</p></div>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${colors.border}` }}><h4 style={{ fontSize: '14px', color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>How It Works</h4><p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>{app.howItWorks}</p></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: colors.border }}>
            {app.stats.map((stat, idx) => (<div key={idx} style={{ padding: '16px', background: colors.bgCardLight, textAlign: 'center' }}><div style={{ fontSize: '24px', marginBottom: '4px' }}>{stat.icon}</div><div style={{ fontSize: '20px', fontWeight: 800, color: app.color }}>{stat.value}</div><div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 500 }}>{stat.label}</div></div>))}
          </div>
          <div style={{ padding: '16px 24px', borderTop: `1px solid ${colors.border}` }}><h4 style={{ fontSize: '14px', color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>Examples</h4><div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>{app.examples.map((ex, idx) => (<span key={idx} style={{ padding: '6px 12px', fontSize: '13px', color: colors.textSecondary, background: colors.bgDark, borderRadius: '9999px', border: `1px solid ${colors.border}` }}>{ex}</span>))}</div></div>
          <div style={{ padding: '12px 24px', background: colors.bgCardLight, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}><span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 500 }}>Key players:</span>{app.companies.map((company, idx) => (<span key={idx} style={{ padding: '4px 12px', fontSize: '12px', color: colors.textSecondary, background: colors.bgCard, borderRadius: '8px', border: `1px solid ${colors.border}` }}>{company}</span>))}</div>
          <div style={{ padding: '16px', borderTop: `1px solid ${colors.border}` }}>
            {!completedApps.has(activeApp) ? (
              <button onClick={() => { const n = new Set(completedApps); n.add(activeApp); setCompletedApps(n); if (activeApp < realWorldApps.length - 1) setTimeout(() => setActiveApp(activeApp + 1), 300); }} style={{ width: '100%', padding: '16px', fontSize: '15px', fontWeight: 600, color: '#0a0a0f', background: colors.success, border: 'none', borderRadius: '12px', cursor: 'pointer', zIndex: 10, position: 'relative' as const }}>Got It</button>
            ) : (<div style={{ padding: '16px', background: `${colors.success}15`, borderRadius: '12px', border: `1px solid ${colors.success}40`, textAlign: 'center' }}><span style={{ fontSize: '15px', color: colors.success, fontWeight: 600 }}>Completed</span></div>)}
          </div>
        </div>
      </div>
    );
  };

  const renderTest = () => {
    const question = testQuestions[currentQuestion];
    const currentAnswer = testAnswers[currentQuestion];
    const isConfirmed = confirmedQuestions.has(currentQuestion);
    if (testSubmitted) {
      const percentage = Math.round((testScore / testQuestions.length) * 100);
      return (
        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: colors.textPrimary, marginBottom: '24px' }}>Quiz Results</h2>
          <div style={{ padding: '32px', background: percentage >= 70 ? `linear-gradient(135deg, ${colors.success}15, ${colors.success}05)` : `linear-gradient(135deg, ${colors.warning}15, ${colors.warning}05)`, borderRadius: '16px', border: `1px solid ${percentage >= 70 ? colors.success : colors.warning}40`, marginBottom: '24px' }}>
            <div style={{ fontSize: '56px', fontWeight: 800, color: percentage >= 70 ? colors.success : colors.warning }}>{percentage}%</div>
            <p style={{ fontSize: '18px', color: colors.textPrimary, margin: '8px 0 0', fontWeight: 600 }}>{testScore} out of {testQuestions.length} correct</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={() => goToPhase('mastery')} style={{ ...primaryBtnStyle }}>Next: Complete Lesson</button>
            <button onClick={() => goToPhase('review')} style={{ ...primaryBtnStyle, background: colors.bgCardLight, color: colors.textPrimary }}>Back to Review</button>
          </div>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: colors.textPrimary, marginBottom: '8px' }}>Knowledge Check - Pendulum Period</h2>
        <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '8px' }}>Question {currentQuestion + 1} of {testQuestions.length}</p>
        <p style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '24px', maxWidth: '520px', textAlign: 'center', lineHeight: 1.6 }}>Apply your understanding of the pendulum period formula, the independence from mass, and the dependence on length and gravity to answer each scenario-based question below.</p>
        <div style={{ padding: '16px', background: colors.bgCardLight, borderRadius: '12px', marginBottom: '12px', borderLeft: `4px solid ${colors.accent}`, maxWidth: '520px', width: '100%' }}>
          <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0, fontStyle: 'italic', lineHeight: 1.6 }}>{question.scenario}</p>
        </div>
        <div style={{ ...cardStyle, maxWidth: '520px', width: '100%', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', color: '#ffffff', fontWeight: 600, marginBottom: '16px', lineHeight: 1.5 }}>{question.question}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {question.options.map((option) => {
              const isSelected = currentAnswer === option.id;
              const isCorrectOpt = option.correct;
              let bg = `${colors.bgCardLight}80`;
              let borderColor = colors.borderLight;
              let textColor = '#ffffff';
              if (isConfirmed) { if (isCorrectOpt) { bg = `${colors.success}20`; borderColor = colors.success; textColor = colors.success; } else if (isSelected) { bg = `${colors.danger}20`; borderColor = colors.danger; textColor = colors.danger; } } else if (isSelected) { bg = `${colors.primary}20`; borderColor = colors.primary; }
              return (<button key={option.id} onClick={() => { if (isConfirmed) return; const n = [...testAnswers]; n[currentQuestion] = option.id; setTestAnswers(n); }} style={{ padding: '14px 16px', borderRadius: '12px', border: `2px solid ${borderColor}`, background: bg, textAlign: 'left', cursor: isConfirmed ? 'default' : 'pointer', transition: 'all 0.3s ease', zIndex: 10, position: 'relative' as const }}><span style={{ fontSize: '14px', color: textColor, lineHeight: 1.5 }}>{option.text}</span></button>);
            })}
          </div>
        </div>
        {isConfirmed && (<div style={{ padding: '16px', borderRadius: '12px', maxWidth: '520px', width: '100%', marginBottom: '16px', background: currentAnswer === question.options.find(o => o.correct)?.id ? `${colors.success}10` : `${colors.danger}10`, border: `1px solid ${currentAnswer === question.options.find(o => o.correct)?.id ? `${colors.success}30` : `${colors.danger}30`}` }}><p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px', color: currentAnswer === question.options.find(o => o.correct)?.id ? colors.success : colors.danger }}>{currentAnswer === question.options.find(o => o.correct)?.id ? 'Correct!' : 'Not quite'}</p><p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.6, margin: 0 }}>{question.explanation}</p></div>)}
        <div style={{ display: 'flex', gap: '12px', maxWidth: '520px', width: '100%' }}>
          {currentAnswer && !isConfirmed && (<button onClick={() => { setConfirmedQuestions(prev => new Set(prev).add(currentQuestion)); const sel = question.options.find(o => o.id === currentAnswer); if (sel?.correct) { setTestScore(s => s + 1); playSound('success'); } else { playSound('failure'); } }} style={{ ...primaryBtnStyle, flex: 1 }}>Check Answer</button>)}
          {isConfirmed && currentQuestion < 9 && (<button onClick={() => setCurrentQuestion(currentQuestion + 1)} style={{ ...primaryBtnStyle, flex: 1 }}>Next Question</button>)}
          {isConfirmed && currentQuestion === 9 && (<button onClick={() => setTestSubmitted(true)} style={{ ...primaryBtnStyle, flex: 1, background: `linear-gradient(135deg, ${colors.success}, #059669)` }}>Submit Test</button>)}
        </div>
      </div>
    );
  };

  const renderMastery = () => {
    const percentage = Math.round((testScore / testQuestions.length) * 100);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '48px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <style>{`@keyframes confetti { 0% { transform: translateY(0) rotate(0); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }`}</style>
        {Array.from({ length: 50 }).map((_, i) => (<div key={i} style={{ position: 'absolute', left: `${Math.random() * 100}%`, top: '-20px', width: '10px', height: '10px', background: [colors.primary, colors.accent, colors.success, colors.warning][i % 4], borderRadius: '2px', animation: `confetti 3s ease-out ${Math.random() * 2}s infinite` }} />))}
        <div style={{ width: '120px', height: '120px', borderRadius: '9999px', background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px', boxShadow: `0 8px 32px ${colors.primary}40` }}><span style={{ fontSize: '56px' }}>🏆</span></div>
        <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>Congratulations!</h1>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: colors.primary, marginBottom: '16px' }}>Pendulum Master</h2>
        <p style={{ fontSize: '18px', color: colors.textSecondary, marginBottom: '32px', lineHeight: 1.6 }}>Final Score: <span style={{ color: colors.success, fontWeight: 700 }}>{testScore}/{testQuestions.length}</span> ({percentage}%)</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', maxWidth: '480px', width: '100%', marginBottom: '32px' }}>
          {[{ icon: '🕰️', label: 'T = 2pi*sqrt(L/g)', sub: 'The period formula' }, { icon: '⚖️', label: 'Mass Independent', sub: 'Period ignores mass' }, { icon: '📊', label: `${testScore}/10`, sub: 'Quiz score' }].map((item, i) => (<div key={i} style={{ ...cardStyle, padding: '16px', textAlign: 'center' }}><div style={{ fontSize: '28px', marginBottom: '8px' }}>{item.icon}</div><div style={{ fontSize: '14px', fontWeight: 700, color: colors.primary }}>{item.label}</div><div style={{ fontSize: '12px', color: colors.textMuted }}>{item.sub}</div></div>))}
        </div>
        <p style={{ fontSize: '14px', color: colors.textMuted, marginBottom: '24px', maxWidth: '420px', lineHeight: 1.6 }}>You now understand pendulum period! From grandfather clocks to earthquake detection, this elegant physics governs precise timekeeping across civilization.</p>
        <button onClick={() => { setPhase('hook'); setPrediction(null); setTwistPrediction(null); setActiveApp(0); setCompletedApps(new Set()); setCurrentQuestion(0); setTestAnswers(new Array(testQuestions.length).fill(null)); setConfirmedQuestions(new Set()); setTestScore(0); setTestSubmitted(false); }} style={primaryBtnStyle}>Complete Lesson</button>
      </div>
    );
  };

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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgDark, color: '#ffffff' }}>
      {renderProgressBar()}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: `${colors.bgCard}cc`, borderBottom: `1px solid ${colors.border}50` }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.025em' }}>Pendulum Period</span>
        <span style={{ fontSize: '14px', fontWeight: 500, color: colors.primary }}>{phaseLabels[phase]}</span>
      </div>
      <div style={{ flex: 1, maxWidth: '800px', margin: '0 auto', width: '100%', overflowY: 'auto' }}>{renderPhase()}</div>
      {renderBottomBar()}
    </div>
  );
};

export default PendulumPeriodRenderer;
