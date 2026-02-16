'use client';

import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// FORCED OSCILLATIONS & RESONANCE
// Physics: m(d²x/dt²) + c(dx/dt) + kx = F₀cos(ωt)
// Natural frequency: ω₀ = √(k/m)
// Resonance: maximum amplitude when ω ≈ ω₀
// Amplitude: A = F₀ / √[(k - mω²)² + (cω)²]
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const PHASES: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const PHASE_LABELS: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Explore Twist',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

const C = {
  primary: '#ef4444',
  primaryLight: '#f87171',
  primaryDark: '#dc2626',
  accent: '#f59e0b',
  accentLight: '#fbbf24',
  secondary: '#8b5cf6',
  secondaryLight: '#a78bfa',
  success: '#22c55e',
  successLight: '#4ade80',
  danger: '#ef4444',
  bgPrimary: '#030712',
  bgSecondary: '#0f172a',
  bgTertiary: '#1e293b',
  border: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: 'rgba(148,163,184,0.7)',
  textInverse: '#0f172a',
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '20px',
  touchAction: 'pan-y',
  WebkitAppearance: 'none',
  accentColor: '#3b82f6',
};

interface TestQuestion {
  scenario: string;
  question: string;
  options: { text: string; correct: boolean }[];
  explanation: string;
}

interface TransferApp {
  icon: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  howItWorks: string;
  stats: { value: string; label: string }[];
  examples: string[];
  companies: string[];
  futureImpact: string;
  color: string;
}

interface Props {
  onGameEvent?: (event: { eventType: string; gameType: string; gameTitle: string; details: Record<string, unknown>; timestamp: number }) => void;
  gamePhase?: string;
}

// ============================================================================
// DATA
// ============================================================================

const transferApps: TransferApp[] = [
  {
    icon: '🌉', title: 'Bridge Resonance Disasters', short: 'Bridges',
    tagline: 'When rhythm becomes destruction',
    description: 'The Tacoma Narrows Bridge collapse in 1940 and the Millennium Bridge wobble in 2000 demonstrate resonance catastrophe. When external forces match a structure\'s natural frequency, oscillations grow until failure occurs. Engineers must carefully analyze all possible periodic force sources.',
    connection: 'Just as you saw amplitude peak when driving frequency matched natural frequency, wind vortices or synchronized footsteps can drive bridges at their resonant frequency, causing dangerous amplification of oscillations.',
    howItWorks: 'Structures have natural frequencies determined by mass and stiffness. When periodic forces (wind, footsteps) match these frequencies, energy accumulates with each cycle. Without sufficient damping, amplitude grows until structural limits are exceeded and catastrophic failure results.',
    stats: [{ value: '0.2 Hz', label: 'Typical bridge sway frequency' }, { value: '$28M', label: 'Millennium Bridge retrofit cost' }, { value: '40 mph', label: 'Tacoma Narrows failure wind speed' }],
    examples: ['Tacoma Narrows collapse (1940)', 'Millennium Bridge wobble (2000)', 'Broughton Suspension Bridge (1831)', 'Wind-induced building sway'],
    companies: ['Arup', 'AECOM', 'Thornton Tomasetti', 'Mott MacDonald'],
    futureImpact: 'Smart damping systems with real-time frequency monitoring will automatically adjust to prevent resonance in next-generation structures.',
    color: C.primary
  },
  {
    icon: '📻', title: 'Radio Tuning & Filters', short: 'Radio Tuning',
    tagline: 'Resonance picks your favorite station',
    description: 'Radio receivers use resonant LC circuits to select specific stations. The circuit responds strongly only to signals matching its resonant frequency, amplifying the desired station while rejecting all others. This frequency-selective amplification is the foundation of all wireless communication.',
    connection: 'The frequency-selective amplification you explored is exactly how radios work: the LC circuit\'s resonant frequency is tuned to match the station, maximizing response at that frequency while filtering out everything else.',
    howItWorks: 'An LC (inductor-capacitor) circuit has a resonant frequency f = 1/(2π√LC). By adjusting C (variable capacitor), you tune the resonance to match the broadcast frequency. The circuit amplifies this frequency while attenuating others by a factor determined by the Q value.',
    stats: [{ value: '540-1600 kHz', label: 'AM radio band range' }, { value: '88-108 MHz', label: 'FM radio band range' }, { value: '10,000+', label: 'Radio stations in USA alone' }],
    examples: ['AM/FM radio tuning', 'TV channel selection', 'Cell phone band filters', 'Guitar amplifier tone circuits'],
    companies: ['Qualcomm', 'Skyworks', 'Qorvo', 'Broadcom'],
    futureImpact: 'Software-defined radio will use digital resonance, enabling devices to receive any frequency band with programmable filters.',
    color: '#3b82f6'
  },
  {
    icon: '🎸', title: 'Musical Instrument Acoustics', short: 'Instruments',
    tagline: 'Resonant bodies amplify string vibrations',
    description: 'String instruments use resonant bodies (sound boxes) to amplify vibrations. The body resonates at specific frequencies, amplifying some harmonics more than others, giving each instrument its unique timbre and characteristic sound quality that distinguishes a Stradivarius from a factory violin.',
    connection: 'The driving frequency (vibrating string) forces the instrument body to oscillate. When string harmonics match body resonances, those frequencies are strongly amplified, creating the rich warm tone musicians seek.',
    howItWorks: 'The string vibrates at multiple harmonics simultaneously. The sound box has its own resonant modes determined by its shape and material. Where these overlap, sound is amplified. Master luthiers carefully shape bodies to produce desired resonances and tonal qualities.',
    stats: [{ value: '440 Hz', label: 'Concert A pitch standard' }, { value: '~20', label: 'Resonant modes in violin body' }, { value: '$16M', label: 'Most expensive violin ever sold' }],
    examples: ['Acoustic guitar bodies', 'Violin f-holes', 'Piano soundboards', 'Drum shell resonance'],
    companies: ['Fender', 'Gibson', 'Steinway', 'Stradivarius (historical)'],
    futureImpact: 'Computational design and 3D printing will enable optimized resonance patterns, creating instruments with unprecedented tonal control.',
    color: '#8b5cf6'
  },
  {
    icon: '🏢', title: 'Earthquake Engineering', short: 'Earthquakes',
    tagline: 'Survival depends on frequency mismatch',
    description: 'Earthquakes produce ground motion at various frequencies. Buildings also have natural frequencies. When these match, resonance causes catastrophic amplification. Engineers design buildings to avoid resonance with likely seismic frequencies using base isolation and tuned mass dampers.',
    connection: 'Just as you observed maximum amplitude when driving frequency matched natural frequency, buildings experience maximum stress when earthquake frequencies match their natural sway frequency, which can lead to collapse.',
    howItWorks: 'Tall buildings sway at low frequencies (0.1-1 Hz), matching some earthquake motions. Base isolation systems, tuned mass dampers, and structural bracing detune the building or add damping to limit resonant amplification during seismic events.',
    stats: [{ value: '0.5-2 Hz', label: 'Dangerous earthquake frequency range' }, { value: '730 tons', label: 'Taipei 101 damper mass' }, { value: '$300B', label: 'Annual global earthquake losses' }],
    examples: ['Taipei 101 tuned mass damper', 'Japan base isolation systems', 'Mexico City 1985 resonance disaster', 'Cross-bracing systems'],
    companies: ['Skidmore Owings Merrill', 'Arup Engineering', 'Shimizu Corporation', 'Taylor Devices'],
    futureImpact: 'Active control systems will dynamically adjust building properties during earthquakes, actively avoiding resonance in real-time with AI-driven response.',
    color: '#22c55e'
  }
];

const testQuestions: TestQuestion[] = [
  { scenario: 'A child on a swing is being pushed by their parent at regular intervals.', question: 'For the swing to go highest, when should the parent push?', options: [{ text: 'At random times for variety', correct: false }, { text: 'As fast as possible', correct: false }, { text: 'At the swing\'s natural frequency (once per swing cycle)', correct: true }, { text: 'Very slowly, once every few swings', correct: false }], explanation: 'Maximum energy transfer (resonance) occurs when the driving frequency matches the natural frequency. Pushing once per complete swing cycle builds up amplitude efficiently.' },
  { scenario: 'An opera singer shatters a wine glass by singing at a specific pitch.', question: 'Why does only that particular pitch break the glass?', options: [{ text: 'It\'s the loudest note the singer can produce', correct: false }, { text: 'It matches the glass\'s natural resonant frequency', correct: true }, { text: 'High pitches always break glass', correct: false }, { text: 'The singer applies more force at that note', correct: false }], explanation: 'Glass has a natural frequency. When sound at that exact frequency hits the glass, resonance causes oscillations to build up until the stress exceeds the glass\'s breaking point.' },
  { scenario: 'The Tacoma Narrows Bridge famously collapsed in 1940 during moderate winds.', question: 'What caused the bridge to oscillate so violently?', options: [{ text: 'The wind was too strong', correct: false }, { text: 'The bridge was too heavy', correct: false }, { text: 'Wind vortices matched the bridge\'s natural frequency (resonance)', correct: true }, { text: 'An earthquake occurred simultaneously', correct: false }], explanation: 'Wind vortex shedding created a periodic force that matched the bridge\'s torsional natural frequency. This resonance caused oscillations to grow until structural failure.' },
  { scenario: 'You\'re tuning a radio to find your favorite station at 101.5 MHz.', question: 'What physical principle allows the radio to select just that frequency?', options: [{ text: 'Magnetic filtering', correct: false }, { text: 'Electrical resonance in an LC circuit tuned to 101.5 MHz', correct: true }, { text: 'Digital signal processing', correct: false }, { text: 'Sound wave interference', correct: false }], explanation: 'The radio\'s tuning circuit (LC circuit) has an adjustable natural frequency. When tuned to 101.5 MHz, only that frequency causes resonance and gets amplified while others are suppressed.' },
  { scenario: 'A car\'s engine is running at certain RPMs and the steering wheel vibrates annoyingly.', question: 'Why does this vibration only occur at specific engine speeds?', options: [{ text: 'The engine is misfiring at those speeds', correct: false }, { text: 'The tires are unbalanced', correct: false }, { text: 'Engine vibration frequency matches a structural resonance', correct: true }, { text: 'The fuel mixture is wrong', correct: false }], explanation: 'Car components have natural frequencies. When engine RPM creates vibrations matching these frequencies, resonance amplifies the oscillations. Changing RPM moves away from resonance.' },
  { scenario: 'An MRI machine uses precise radio waves to image the body.', question: 'MRI works by exploiting resonance of:', options: [{ text: 'Body tissue vibrations', correct: false }, { text: 'Sound waves in the machine', correct: false }, { text: 'Hydrogen nuclei (protons) in a magnetic field', correct: true }, { text: 'X-ray frequencies', correct: false }], explanation: 'MRI uses Nuclear Magnetic Resonance. Hydrogen nuclei precess at specific frequencies in magnetic fields. RF pulses at these resonant frequencies cause energy absorption that\'s detected to create images.' },
  { scenario: 'Musicians playing together notice that certain notes make the room "ring".', question: 'These "room modes" occur because:', options: [{ text: 'The musicians are playing too loudly', correct: false }, { text: 'Sound waves resonate with the room\'s dimensions', correct: true }, { text: 'The instruments are out of tune', correct: false }, { text: 'Echo from the walls', correct: false }], explanation: 'Rooms have natural acoustic frequencies based on their dimensions. When musical notes match these frequencies, standing waves form, causing certain frequencies to be amplified (room resonance).' },
  { scenario: 'In the amplitude response curve for a forced oscillator, you increase damping.', question: 'What happens to the resonance peak?', options: [{ text: 'It gets taller and narrower', correct: false }, { text: 'It gets shorter and wider', correct: true }, { text: 'It shifts to a higher frequency', correct: false }, { text: 'It disappears completely', correct: false }], explanation: 'Higher damping reduces the maximum amplitude at resonance and broadens the peak. With very high damping, the system barely resonates at all. Low damping gives sharp, tall resonance peaks.' },
  { scenario: 'A washing machine "walks" across the floor during the spin cycle but not at other times.', question: 'This happens because:', options: [{ text: 'The load is unbalanced at all speeds', correct: false }, { text: 'The spin speed passes through the machine\'s resonant frequency', correct: true }, { text: 'The floor is uneven', correct: false }, { text: 'The machine is too light', correct: false }], explanation: 'During spin-up, the rotation frequency passes through resonant frequencies of the machine on its mounts. At these specific speeds, vibrations are amplified. Manufacturers try to accelerate quickly through these ranges.' },
  { scenario: 'Soldiers crossing a bridge are told to break step rather than march in unison.', question: 'This order prevents:', options: [{ text: 'Soldiers from getting tired', correct: false }, { text: 'Resonance from synchronized footsteps collapsing the bridge', correct: true }, { text: 'The bridge from getting dirty', correct: false }, { text: 'Noise complaints from nearby residents', correct: false }], explanation: 'Synchronized marching creates a periodic force. If this frequency matches the bridge\'s natural frequency, resonance can build oscillations to dangerous levels. Breaking step removes the periodic driving force.' }
];

// ============================================================================
// PHYSICS HELPERS
// ============================================================================

function calcAmplitude(omega: number, omega0: number, zeta: number): number {
  const d1 = (omega0 * omega0 - omega * omega) ** 2;
  const d2 = (2 * zeta * omega0 * omega) ** 2;
  return 1 / Math.sqrt(d1 + d2);
}

function freqLabel(ratio: number): string {
  if (ratio < 0.85) return 'Below Resonance';
  if (ratio > 1.15) return 'Above Resonance';
  return 'At Resonance!';
}

function freqColor(ratio: number): string {
  if (ratio < 0.85) return C.accent;
  if (ratio > 1.15) return C.secondary;
  return C.primary;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ForcedOscillationsRenderer: React.FC<Props> = ({ onGameEvent, gamePhase }) => {
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [currentQ, setCurrentQ] = useState(0);
  const [confirmed, setConfirmed] = useState<boolean[]>(new Array(10).fill(false));
  const [showResults, setShowResults] = useState(false);

  // Play phase
  const [drivingFreq, setDrivingFreq] = useState(0.5);
  // Twist play phase
  const [twistDamping, setTwistDamping] = useState(0.1);

  const omega0 = 1.0;
  const baseDamping = 0.1;
  const amplitude = calcAmplitude(drivingFreq, omega0, baseDamping);
  const twistAmplitude = calcAmplitude(1.0, omega0, twistDamping);

  useEffect(() => {
    if (gamePhase && PHASES.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  const emitEvent = useCallback((eventType: string, details: Record<string, unknown> = {}) => {
    if (onGameEvent) {
      onGameEvent({ eventType, gameType: 'forced_oscillations', gameTitle: 'Forced Oscillations & Resonance', details: { phase, ...details }, timestamp: Date.now() });
    }
  }, [onGameEvent, phase]);

  const goTo = useCallback((p: Phase) => {
    setPhase(p);
    emitEvent('phase_change', { to: p });
  }, [emitEvent]);

  const curIdx = PHASES.indexOf(phase);

  // ============================================================================
  // RENDER HELPERS (no inner components)
  // ============================================================================

  const renderProgressBar = () => (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, display: 'flex', alignItems: 'center', gap: '4px', padding: '12px 20px', background: C.bgSecondary, borderBottom: `1px solid ${C.border}` }}>
      {PHASES.map((p, i) => (
        <button key={p} aria-label={PHASE_LABELS[p]} style={{ flex: 1, height: '8px', borderRadius: '9999px', background: i <= curIdx ? `linear-gradient(90deg, ${C.primary}, ${C.primaryLight})` : C.bgTertiary, transition: 'all 0.4s ease', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => i <= curIdx && setPhase(p)} />
      ))}
      <span style={{ marginLeft: '12px', fontSize: '13px', color: C.textSecondary, fontWeight: 600, minWidth: '40px' }}>{curIdx + 1}/{PHASES.length}</span>
    </div>
  );

  const renderBottomBar = (onNext: () => void, label: string = 'Next →', disabled: boolean = false) => (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, padding: '16px 24px', background: C.bgSecondary, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <button onClick={() => curIdx > 0 && setPhase(PHASES[curIdx - 1])} style={{ padding: '12px 24px', minHeight: '44px', fontSize: '15px', fontWeight: 600, color: curIdx > 0 ? C.textSecondary : C.textMuted, background: C.bgTertiary, border: `1px solid ${C.border}`, borderRadius: '12px', cursor: curIdx > 0 ? 'pointer' : 'not-allowed', opacity: curIdx > 0 ? 1 : 0.3, transition: 'all 0.3s ease' }}>← Back</button>
      <button onClick={() => !disabled && onNext()} disabled={disabled} style={{ padding: '12px 32px', minHeight: '44px', fontSize: '15px', fontWeight: 700, color: disabled ? C.textMuted : C.textInverse, background: disabled ? C.bgTertiary : `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, border: 'none', borderRadius: '12px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, transition: 'all 0.3s ease', boxShadow: disabled ? 'none' : '0 4px 12px rgba(0,0,0,0.4)' }}>{label}</button>
    </div>
  );

  const phaseWrap = (children: React.ReactNode, bottomBar: React.ReactNode) => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.bgPrimary }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px', padding: '48px 20px 100px 20px' }}>
        {children}
      </div>
      {bottomBar}
    </div>
  );

  // ============================================================================
  // PLAY PHASE SVG - Amplitude Response Curve
  // ============================================================================
  const renderPlaySVG = () => {
    const plotLeft = 60, plotTop = 30, plotW = 380, plotH = 260;
    const plotRight = plotLeft + plotW;
    const plotBottom = plotTop + plotH;

    // Generate resonance curve points
    const curvePoints: string[] = [];
    const numPts = 90;
    for (let i = 0; i <= numPts; i++) {
      const omega = 0.05 + (i / numPts) * 2.45;
      const a = calcAmplitude(omega, omega0, baseDamping);
      const normA = Math.min(a / 10, 1);
      const x = plotLeft + (omega / 2.5) * plotW;
      const y = plotBottom - normA * plotH;
      curvePoints.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }

    // Current interactive point
    const curA = calcAmplitude(drivingFreq, omega0, baseDamping);
    const normCurA = Math.min(curA / 10, 1);
    const ptX = plotLeft + (drivingFreq / 2.5) * plotW;
    const ptY = plotBottom - normCurA * plotH;

    // Resonance line
    const resX = plotLeft + (1.0 / 2.5) * plotW;

    return (
      <svg width="100%" viewBox="0 0 500 340" style={{ borderRadius: '12px' }}>
        <defs>
          <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.primary} stopOpacity="0.3" />
            <stop offset="100%" stopColor={C.primary} stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="plotBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.bgSecondary} />
            <stop offset="100%" stopColor={C.bgPrimary} />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="pointGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={C.accent} stopOpacity="0.6" />
            <stop offset="100%" stopColor={C.accent} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background */}
        <rect width="500" height="340" fill="url(#plotBg)" rx="12" />

        {/* Plot area */}
        <rect x={plotLeft} y={plotTop} width={plotW} height={plotH} fill={C.bgPrimary} stroke={C.border} strokeWidth="1" rx="4" />

        {/* Grid lines */}
        {[0.2, 0.4, 0.6, 0.8].map((f, i) => (
          <line key={`hg${i}`} x1={plotLeft} y1={plotBottom - f * plotH} x2={plotRight} y2={plotBottom - f * plotH} stroke={C.border} strokeDasharray="4 4" opacity="0.3" />
        ))}
        {[0.5, 1.0, 1.5, 2.0].map((v, i) => (
          <line key={`vg${i}`} x1={plotLeft + (v / 2.5) * plotW} y1={plotTop} x2={plotLeft + (v / 2.5) * plotW} y2={plotBottom} stroke={C.border} strokeDasharray="4 4" opacity="0.3" />
        ))}

        {/* Resonance vertical line */}
        <line x1={resX} y1={plotTop} x2={resX} y2={plotBottom} stroke={C.primary} strokeWidth="1.5" strokeDasharray="6 3" opacity="0.5" />
        <text x={resX} y={plotTop - 8} textAnchor="middle" fill={C.primary} fontSize="11" fontWeight="bold">ω = ω₀</text>

        {/* Filled area under curve */}
        <path d={`${curvePoints.join(' ')} L ${plotRight.toFixed(1)} ${plotBottom} L ${plotLeft} ${plotBottom} Z`} fill="url(#curveFill)" />

        {/* Main resonance curve */}
        <path d={curvePoints.join(' ')} fill="none" stroke={C.primary} strokeWidth="2.5" />

        {/* Current position indicator line */}
        <line x1={ptX} y1={plotTop} x2={ptX} y2={plotBottom} stroke={C.accent} strokeWidth="1.5" strokeDasharray="4 2" opacity="0.7" />

        {/* Reference baseline point (at resonance with base damping) */}
        <circle cx={resX} cy={plotBottom - (Math.min(calcAmplitude(1.0, omega0, baseDamping) / 10, 1) * plotH)} r={5} fill={C.textMuted} opacity="0.6" stroke={C.textSecondary} strokeWidth={1} />

        {/* Interactive point with glow */}
        <circle cx={ptX} cy={ptY} r="16" fill="url(#pointGlow)" />
        <circle cx={ptX} cy={ptY} r={8} fill={C.accent} filter="url(#glow)" stroke="#fff" strokeWidth={2} />

        {/* Axes */}
        <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke={C.textSecondary} strokeWidth="1.5" />
        <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke={C.textSecondary} strokeWidth="1.5" />

        {/* Tick labels */}
        {[0.5, 1.0, 1.5, 2.0].map((v, i) => (
          <text key={`tl${i}`} x={plotLeft + (v / 2.5) * plotW} y={plotBottom + 14} textAnchor="middle" fill={C.textMuted} fontSize="11">{v.toFixed(1)}</text>
        ))}

        {/* Axis labels */}
        <text x={plotLeft + plotW / 2} y={plotBottom + 35} textAnchor="middle" fill={C.textSecondary} fontSize="13" fontWeight="600">Driving Frequency (ω/ω₀)</text>
        <text x={plotLeft - 14} y={plotTop + plotH / 2} textAnchor="middle" fill={C.textSecondary} fontSize="13" fontWeight="600" transform={`rotate(-90, ${plotLeft - 14}, ${plotTop + plotH / 2})`}>Amplitude</text>

        {/* Value display */}
        <g transform={`translate(${plotRight - 130}, ${plotTop + 10})`}>
          <rect width="125" height="50" rx="8" fill={C.bgSecondary} stroke={C.border} />
          <text x="10" y="20" fill={C.textSecondary} fontSize="11">Amplitude</text>
          <text x="10" y="40" fill={C.accent} fontSize="16" fontWeight="bold">{amplitude.toFixed(2)}×</text>
        </g>

        {/* Status label */}
        <text x={plotLeft + plotW / 2} y={plotTop + 20} textAnchor="middle" fill={freqColor(drivingFreq)} fontSize="14" fontWeight="bold">{freqLabel(drivingFreq)}</text>
      </svg>
    );
  };

  // ============================================================================
  // PREDICT PHASE SVG - Static swing diagram
  // ============================================================================
  const renderPredictSVG = () => (
    <svg width="100%" viewBox="0 0 500 340" style={{ borderRadius: '12px' }}>
      <defs>
        <linearGradient id="swingGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.accent} />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <radialGradient id="skyGrad" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="100%" stopColor={C.bgPrimary} />
        </radialGradient>
        <filter id="glowP" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="500" height="340" fill="url(#skyGrad)" rx="12" />
      {/* Grid lines for visual interest */}
      {[100, 200, 300].map(y => <line key={y} x1="40" y1={y} x2="460" y2={y} stroke={C.border} strokeDasharray="4 4" opacity="0.3" />)}
      {/* Ground */}
      <rect x="0" y="280" width="500" height="60" fill={C.bgTertiary} rx="4" />
      {/* Swing frame */}
      <line x1="150" y1="60" x2="250" y2="200" stroke={C.textSecondary} strokeWidth="4" />
      <line x1="350" y1="60" x2="250" y2="200" stroke={C.textSecondary} strokeWidth="4" />
      <line x1="150" y1="60" x2="350" y2="60" stroke={C.textSecondary} strokeWidth="6" />
      {/* Swing ropes */}
      <line x1="220" y1="60" x2="220" y2="220" stroke={C.textMuted} strokeWidth="2" />
      <line x1="280" y1="60" x2="280" y2="220" stroke={C.textMuted} strokeWidth="2" />
      {/* Swing seat */}
      <rect x="210" y="218" width="80" height="12" rx="4" fill="url(#swingGrad)" />
      {/* Child figure */}
      <circle cx="250" cy="195" r="14" fill="#fcd9b6" />
      <ellipse cx="250" cy="218" rx="10" ry="14" fill={C.primary} />
      {/* Push arrows */}
      <g filter="url(#glowP)">
        <path d="M 90 190 L 130 190" stroke={C.success} strokeWidth="3" fill="none" />
        <polygon points="130,185 130,195 140,190" fill={C.success} />
      </g>
      <text x="70" y="220" fill={C.textSecondary} fontSize="12" fontWeight="600">Push?</text>
      {/* Question marks */}
      <text x="380" y="150" fill={C.accent} fontSize="28" fontWeight="bold">?</text>
      <text x="400" y="190" fill={C.accent} fontSize="20">?</text>
      {/* Labels */}
      <text x="250" y="40" textAnchor="middle" fill={C.textPrimary} fontSize="14" fontWeight="bold">Swing on a Playground</text>
      <text x="250" y="310" textAnchor="middle" fill={C.textSecondary} fontSize="12">Which pushing rhythm makes the swing go highest?</text>
    </svg>
  );

  // ============================================================================
  // TWIST PREDICT SVG
  // ============================================================================
  const renderTwistPredictSVG = () => (
    <svg width="100%" viewBox="0 0 500 340" style={{ borderRadius: '12px' }}>
      <defs>
        <linearGradient id="bridgeGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <filter id="glowT" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="500" height="340" fill={C.bgPrimary} rx="12" />
      {/* Grid lines */}
      {[80, 160, 240].map(y => <line key={y} x1="20" y1={y} x2="480" y2={y} stroke={C.border} strokeDasharray="4 4" opacity="0.3" />)}
      {/* Water */}
      <rect x="0" y="260" width="500" height="80" fill="#0c4a6e" rx="0" />
      {/* Bridge */}
      <rect x="60" y="200" width="380" height="20" rx="6" fill="url(#bridgeGrad)" />
      {/* Towers */}
      <rect x="100" y="120" width="20" height="100" fill="#64748b" />
      <rect x="380" y="120" width="20" height="100" fill="#64748b" />
      {/* Cables */}
      <path d="M 110 120 Q 250 170, 390 120" fill="none" stroke={C.textMuted} strokeWidth="2" />
      {/* Wind arrows */}
      {[0, 1, 2, 3].map(i => (
        <g key={i}>
          <line x1="20" y1={140 + i * 25} x2="50" y2={140 + i * 25} stroke={C.accent} strokeWidth="2" />
          <polygon points={`50,${137 + i * 25} 50,${143 + i * 25} 58,${140 + i * 25}`} fill={C.accent} />
        </g>
      ))}
      {/* Oscillation arrows */}
      <g filter="url(#glowT)">
        <path d="M 250 195 L 250 175" stroke={C.primary} strokeWidth="2.5" />
        <polygon points="245,175 255,175 250,168" fill={C.primary} />
        <path d="M 250 225 L 250 245" stroke={C.primary} strokeWidth="2.5" />
        <polygon points="245,245 255,245 250,252" fill={C.primary} />
      </g>
      {/* Labels */}
      <text x="250" y="30" textAnchor="middle" fill={C.textPrimary} fontSize="14" fontWeight="bold">Tacoma Narrows Bridge, 1940</text>
      <text x="30" y="132" fill={C.accent} fontSize="12" fontWeight="600">Wind</text>
      <text x="250" y="310" textAnchor="middle" fill={C.textSecondary} fontSize="12">How did steady wind cause oscillating destruction?</text>
      <text x="280" y="185" fill={C.primary} fontSize="11" fontWeight="600">Oscillation?</text>
    </svg>
  );

  // ============================================================================
  // REVIEW PHASE SVG - Resonance concept diagram
  // ============================================================================
  const renderReviewSVG = () => (
    <svg width="100%" viewBox="0 0 500 280" style={{ borderRadius: '12px' }}>
      <defs>
        <linearGradient id="reviewBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.bgSecondary} />
          <stop offset="100%" stopColor={C.bgPrimary} />
        </linearGradient>
      </defs>
      <rect width="500" height="280" fill="url(#reviewBg)" rx="12" />
      {/* Three scenarios showing below, at, and above resonance */}
      {[
        { x: 80, label: 'ω < ω₀', desc: 'Low Amplitude', color: C.accent, height: 40 },
        { x: 250, label: 'ω = ω₀', desc: 'RESONANCE!', color: C.primary, height: 120 },
        { x: 420, label: 'ω > ω₀', desc: 'Low Amplitude', color: C.secondary, height: 35 }
      ].map((item, idx) => (
        <g key={idx}>
          {/* Base */}
          <rect x={item.x - 30} y="220" width="60" height="8" fill={C.bgTertiary} rx="2" />
          {/* Spring/oscillator */}
          <rect x={item.x - 12} y={220 - item.height} width="24" height={item.height} fill={item.color} opacity="0.3" rx="4" />
          {/* Mass */}
          <rect x={item.x - 20} y={220 - item.height - 30} width="40" height="30" fill={item.color} rx="6" />
          {/* Arrow indicating amplitude */}
          <line x1={item.x + 35} y1="220" x2={item.x + 35} y2={220 - item.height - 15} stroke={item.color} strokeWidth="2" strokeDasharray="3 2" />
          <text x={item.x + 45} y={220 - item.height / 2} fill={item.color} fontSize="11" fontWeight="600">A</text>
          {/* Labels */}
          <text x={item.x} y="250" textAnchor="middle" fill={C.textPrimary} fontSize="13" fontWeight="bold">{item.label}</text>
          <text x={item.x} y="268" textAnchor="middle" fill={item.color} fontSize="11" fontWeight="600">{item.desc}</text>
        </g>
      ))}
      {/* Title */}
      <text x="250" y="25" textAnchor="middle" fill={C.textPrimary} fontSize="14" fontWeight="bold">Amplitude Response to Driving Frequency</text>
    </svg>
  );

  // ============================================================================
  // TWIST REVIEW SVG - Damping comparison diagram
  // ============================================================================
  const renderTwistReviewSVG = () => (
    <svg width="100%" viewBox="0 0 500 280" style={{ borderRadius: '12px' }}>
      <defs>
        <linearGradient id="twistReviewBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.bgSecondary} />
          <stop offset="100%" stopColor={C.bgPrimary} />
        </linearGradient>
      </defs>
      <rect width="500" height="280" fill="url(#twistReviewBg)" rx="12" />
      {/* Two damping scenarios */}
      {[
        { x: 140, label: 'Low Damping', desc: 'Sharp Peak (Dangerous!)', color: C.danger, curve: [0, 20, 50, 100, 50, 20, 0] },
        { x: 360, label: 'High Damping', desc: 'Broad Peak (Safe)', color: C.success, curve: [10, 25, 35, 40, 35, 25, 10] }
      ].map((item, idx) => {
        const baseY = 210;
        const points = item.curve.map((h, i) => `${item.x - 60 + i * 20},${baseY - h}`).join(' ');
        return (
          <g key={idx}>
            {/* Resonance curve */}
            <polyline points={points} fill="none" stroke={item.color} strokeWidth="2.5" />
            {/* Fill under curve */}
            <polygon points={`${points} ${item.x + 60},${baseY} ${item.x - 60},${baseY}`} fill={item.color} opacity="0.15" />
            {/* Peak marker */}
            <circle cx={item.x} cy={baseY - item.curve[3]} r={6} fill={item.color} stroke="#fff" strokeWidth={2} />
            {/* Base line */}
            <line x1={item.x - 65} y1={baseY} x2={item.x + 65} y2={baseY} stroke={C.border} strokeWidth="2" />
            {/* Labels */}
            <text x={item.x} y="245" textAnchor="middle" fill={C.textPrimary} fontSize="13" fontWeight="bold">{item.label}</text>
            <text x={item.x} y="263" textAnchor="middle" fill={item.color} fontSize="11" fontWeight="600">{item.desc}</text>
          </g>
        );
      })}
      {/* Title */}
      <text x="250" y="25" textAnchor="middle" fill={C.textPrimary} fontSize="14" fontWeight="bold">Effect of Damping on Resonance Peak</text>
    </svg>
  );

  // ============================================================================
  // TWIST PLAY SVG - Damping effect
  // ============================================================================
  const renderTwistPlaySVG = () => {
    const plotLeft = 60, plotTop = 30, plotW = 380, plotH = 260;
    const plotRight = plotLeft + plotW;
    const plotBottom = plotTop + plotH;

    // Generate curves for current damping and reference
    const makeCurve = (zeta: number, color: string, label: string) => {
      const pts: string[] = [];
      for (let i = 0; i <= 90; i++) {
        const omega = 0.05 + (i / 90) * 2.45;
        const a = calcAmplitude(omega, omega0, zeta);
        const normA = Math.min(a / 10, 1);
        const x = plotLeft + (omega / 2.5) * plotW;
        const y = plotBottom - normA * plotH;
        pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
      }
      return { path: pts.join(' '), color, label };
    };

    const currentCurve = makeCurve(twistDamping, C.primary, `ζ = ${twistDamping.toFixed(2)}`);
    const refCurve = makeCurve(0.1, C.textMuted, 'Reference ζ = 0.10');

    // Interactive point at resonance for current damping
    const peakA = calcAmplitude(1.0, omega0, twistDamping);
    const normPeak = Math.min(peakA / 10, 1);
    const ptX = plotLeft + (1.0 / 2.5) * plotW;
    const ptY = plotBottom - normPeak * plotH;

    return (
      <svg width="100%" viewBox="0 0 500 340" style={{ borderRadius: '12px' }}>
        <defs>
          <linearGradient id="twistBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.bgSecondary} />
            <stop offset="100%" stopColor={C.bgPrimary} />
          </linearGradient>
          <filter id="glow2" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect width="500" height="340" fill="url(#twistBg)" rx="12" />
        <rect x={plotLeft} y={plotTop} width={plotW} height={plotH} fill={C.bgPrimary} stroke={C.border} strokeWidth="1" rx="4" />

        {/* Grid lines */}
        {[0.2, 0.4, 0.6, 0.8].map((f, i) => (
          <line key={`hg2${i}`} x1={plotLeft} y1={plotBottom - f * plotH} x2={plotRight} y2={plotBottom - f * plotH} stroke={C.border} strokeDasharray="4 4" opacity="0.3" />
        ))}
        {[0.5, 1.0, 1.5, 2.0].map((v, i) => (
          <line key={`vg2${i}`} x1={plotLeft + (v / 2.5) * plotW} y1={plotTop} x2={plotLeft + (v / 2.5) * plotW} y2={plotBottom} stroke={C.border} strokeDasharray="4 4" opacity="0.3" />
        ))}

        {/* Reference curve */}
        <path d={refCurve.path} fill="none" stroke={refCurve.color} strokeWidth="1.5" strokeDasharray="6 3" />
        {/* Current damping curve */}
        <path d={currentCurve.path} fill="none" stroke={currentCurve.color} strokeWidth="2.5" />

        {/* Interactive peak point */}
        <circle cx={ptX} cy={ptY} r={8} fill={C.primary} filter="url(#glow2)" stroke="#fff" strokeWidth={2} />

        {/* Axes */}
        <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke={C.textSecondary} strokeWidth="1.5" />
        <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke={C.textSecondary} strokeWidth="1.5" />

        {/* Axis labels */}
        <text x={plotLeft + plotW / 2} y={plotBottom + 28} textAnchor="middle" fill={C.textSecondary} fontSize="13" fontWeight="600">Frequency (ω/ω₀)</text>
        <text x={plotLeft - 14} y={plotTop + plotH / 2} textAnchor="middle" fill={C.textSecondary} fontSize="13" fontWeight="600" transform={`rotate(-90, ${plotLeft - 14}, ${plotTop + plotH / 2})`}>Amplitude</text>

        {/* Legend */}
        <g transform={`translate(${plotRight - 160}, ${plotTop + 10})`}>
          <rect width="155" height="50" rx="6" fill={C.bgSecondary} stroke={C.border} opacity="0.9" />
          <line x1="8" y1="18" x2="28" y2="18" stroke={C.primary} strokeWidth="2.5" />
          <text x="32" y="22" fill={C.textSecondary} fontSize="11">{currentCurve.label}</text>
          <line x1="8" y1="38" x2="28" y2="38" stroke={C.textMuted} strokeWidth="1.5" strokeDasharray="6 3" />
          <text x="32" y="42" fill={C.textMuted} fontSize="11">{refCurve.label}</text>
        </g>

        {/* Title */}
        <text x={plotLeft + plotW / 2} y={plotTop + 20} textAnchor="middle" fill={C.textPrimary} fontSize="13" fontWeight="bold">Effect of Damping on Resonance</text>
      </svg>
    );
  };

  // ============================================================================
  // PHASE RENDERERS
  // ============================================================================

  const renderHook = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.bgPrimary }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 24px 100px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: `${C.primary}15`, border: `1px solid ${C.primary}30`, borderRadius: '9999px', marginBottom: '24px' }}>
          <span style={{ width: '8px', height: '8px', background: C.primary, borderRadius: '50%' }} />
          <span style={{ fontSize: '14px', fontWeight: 600, color: C.primary }}>WAVE PHYSICS</span>
        </div>

        <h1 style={{ fontSize: '40px', fontWeight: 800, color: '#fff', marginBottom: '16px', letterSpacing: '-1px' }}>
          How Do Opera Singers Break Glass?
        </h1>

        <p style={{ fontSize: '18px', color: C.textSecondary, fontWeight: 400, maxWidth: '500px', marginBottom: '32px', lineHeight: 1.6 }}>
          Discover the power of resonance — when frequency matching creates extraordinary amplification
        </p>

        <div style={{ background: `linear-gradient(135deg, ${C.bgSecondary}, ${C.bgTertiary})`, borderRadius: '20px', padding: '24px', maxWidth: '600px', width: '100%', border: `1px solid ${C.border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
          <p style={{ fontSize: '16px', color: C.textPrimary, lineHeight: 1.7, marginBottom: '12px', fontWeight: 400 }}>
            A trained opera singer can shatter a wine glass using only their voice! What makes one specific pitch so destructive?
          </p>
          <p style={{ fontSize: '14px', color: C.textSecondary, lineHeight: 1.6, fontWeight: 400 }}>
            The answer lies in <strong style={{ color: C.primary }}>resonance</strong> — a phenomenon that shapes everything from bridges to radios to musical instruments.
          </p>
        </div>

        <button onClick={() => goTo('predict')} style={{ marginTop: '32px', padding: '14px 48px', minHeight: '44px', fontSize: '16px', fontWeight: 700, color: C.textInverse, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, border: 'none', borderRadius: '16px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', transition: 'all 0.3s ease' }}>
          Discover Resonance →
        </button>

        <div style={{ display: 'flex', gap: '24px', marginTop: '24px', color: C.textMuted, fontSize: '14px', fontWeight: 400 }}>
          <span>Interactive Lab</span>
          <span>Real-World Examples</span>
          <span>Knowledge Test</span>
        </div>
      </div>
      {renderBottomBar(() => goTo('predict'), 'Next →')}
    </div>
  );

  const renderPredict = () => phaseWrap(
    <>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: C.textPrimary, marginBottom: '8px' }}>Your Prediction</h2>
        <p style={{ fontSize: '15px', color: C.textSecondary, lineHeight: 1.6 }}>Look at the swing setup below. What pushing rhythm will produce the highest swing?</p>
      </div>

      <div style={{ background: C.bgSecondary, borderRadius: '16px', padding: '16px', marginBottom: '20px', border: `1px solid ${C.border}` }}>
        {renderPredictSVG()}
      </div>

      <div style={{ padding: '16px', background: C.bgTertiary, borderRadius: '12px', border: `1px solid ${C.border}`, marginBottom: '24px' }}>
        <p style={{ fontSize: '15px', color: C.textSecondary, margin: 0, lineHeight: 1.7 }}>
          You push a child on a swing. You can push at any rhythm — fast, slow, or matching the swing&apos;s natural back-and-forth motion.
          <br /><br />
          <strong style={{ color: C.accent }}>Which pushing rhythm makes the swing go highest?</strong>
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '560px', margin: '0 auto' }}>
        {[
          { id: 'A', label: 'Push as fast as possible for maximum energy input' },
          { id: 'B', label: 'Push very slowly for gentle, controlled motion' },
          { id: 'C', label: 'Match your pushes to the swing\'s natural frequency' },
          { id: 'D', label: 'Push at random times to keep the child guessing' }
        ].map(opt => (
          <button key={opt.id} onClick={() => setPrediction(opt.id)} style={{ padding: '16px', minHeight: '44px', fontSize: '15px', fontWeight: prediction === opt.id ? 700 : 500, color: prediction === opt.id ? C.textInverse : C.textPrimary, background: prediction === opt.id ? (opt.id === 'C' ? `linear-gradient(135deg, ${C.success}, ${C.successLight})` : `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`) : C.bgSecondary, border: `2px solid ${prediction === opt.id ? (opt.id === 'C' ? C.success : C.primary) : C.border}`, borderRadius: '12px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease' }}>
            <strong>{opt.id})</strong> {opt.label}
          </button>
        ))}
      </div>

      {prediction && (
        <div style={{ marginTop: '20px', padding: '16px', background: prediction === 'C' ? `${C.success}15` : `${C.accent}15`, borderRadius: '12px', border: `1px solid ${prediction === 'C' ? C.success : C.accent}40` }}>
          <p style={{ fontSize: '15px', color: prediction === 'C' ? C.success : C.accent, margin: 0, fontWeight: 600 }}>
            {prediction === 'C' ? 'Correct! This is RESONANCE — maximum response when driving frequency matches natural frequency!' : 'The answer is C — matching the natural frequency creates RESONANCE for maximum amplitude.'}
          </p>
        </div>
      )}
    </>,
    renderBottomBar(() => goTo('play'), 'Test It! →', !prediction)
  );

  const renderPlay = () => phaseWrap(
    <>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: C.textPrimary, marginBottom: '8px' }}>Forced Oscillation Lab</h2>
        <p style={{ fontSize: '15px', color: C.textSecondary, lineHeight: 1.6 }}>
          This is important because resonance affects bridges, radios, and instruments! Adjust the driving frequency and observe how the amplitude responds. Watch how the amplitude peaks dramatically when the driving frequency matches the natural frequency.
        </p>
      </div>

      <div style={{ background: C.bgSecondary, borderRadius: '16px', padding: '16px', border: `1px solid ${C.border}`, marginBottom: '16px' }}>
        {renderPlaySVG()}

        <div style={{ marginTop: '16px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', color: C.textSecondary, marginBottom: '8px' }}>
            <span>Driving Frequency (ω/ω₀):</span>
            <span style={{ color: freqColor(drivingFreq), fontWeight: 700 }}>{drivingFreq.toFixed(2)} Hz — {freqLabel(drivingFreq)}</span>
          </label>
          <input type="range" min="0.1" max="2.5" step="0.05" value={drivingFreq}
            onChange={(e) => setDrivingFreq(parseFloat(e.target.value))}
            onInput={(e) => setDrivingFreq(parseFloat((e.target as HTMLInputElement).value))}
            style={sliderStyle} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: C.textMuted, marginTop: '4px' }}>
            <span>Low ω</span>
            <span>ω = ω₀ (Resonance)</span>
            <span>High ω</span>
          </div>
        </div>
      </div>

      {/* Formula */}
      <div style={{ padding: '16px', background: C.bgTertiary, borderRadius: '12px', border: `1px solid ${C.border}`, marginBottom: '16px' }}>
        <h3 style={{ fontSize: '15px', color: C.primary, marginBottom: '10px', fontWeight: 700 }}>Resonance Formula</h3>
        <div style={{ padding: '12px', background: C.bgPrimary, borderRadius: '8px', fontFamily: 'monospace', fontSize: '14px', color: C.textPrimary, textAlign: 'center', marginBottom: '12px' }}>
          A = F₀ / √[(k − mω²)² + (cω)²]   ×   1/ω₀
        </div>
        <p style={{ fontSize: '14px', color: C.textSecondary, margin: 0, lineHeight: 1.7 }}>
          When you <strong style={{ color: C.textPrimary }}>increase</strong> the driving frequency toward ω₀, amplitude rises. At resonance (ω = ω₀), amplitude peaks because energy transfer is maximized. This is why matching frequencies causes such powerful effects in real-world applications.
        </p>
      </div>

      {/* Before-after comparison */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', marginBottom: '16px' }}>
        <div style={{ flex: 1, padding: '16px', background: C.bgTertiary, borderRadius: '12px', border: `1px solid ${C.border}` }}>
          <h4 style={{ fontSize: '14px', color: C.textMuted, marginBottom: '8px', fontWeight: 700 }}>Initial State (ω = 0.5)</h4>
          <div style={{ fontSize: '24px', fontWeight: 800, color: C.accent }}>{calcAmplitude(0.5, omega0, baseDamping).toFixed(2)}×</div>
          <p style={{ fontSize: '12px', color: C.textSecondary, margin: '4px 0 0' }}>Below resonance</p>
        </div>
        <div style={{ flex: 1, padding: '16px', background: `${C.primary}15`, borderRadius: '12px', border: `1px solid ${C.primary}40` }}>
          <h4 style={{ fontSize: '14px', color: C.primary, marginBottom: '8px', fontWeight: 700 }}>Current State (ω = {drivingFreq.toFixed(2)})</h4>
          <div style={{ fontSize: '24px', fontWeight: 800, color: C.primary }}>{amplitude.toFixed(2)}×</div>
          <p style={{ fontSize: '12px', color: C.textSecondary, margin: '4px 0 0' }}>{freqLabel(drivingFreq)}</p>
        </div>
      </div>

      {/* Physics explanation cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[
          { cond: 'ω < ω₀', desc: 'Below resonance: Mass follows driving force. Low amplitude.', active: drivingFreq < 0.85, color: C.accent },
          { cond: 'ω ≈ ω₀', desc: 'At resonance: Maximum energy transfer! Amplitude peaks dramatically.', active: Math.abs(drivingFreq - 1.0) < 0.15, color: C.primary },
          { cond: 'ω > ω₀', desc: 'Above resonance: Mass opposes driving force. Amplitude drops.', active: drivingFreq > 1.15, color: C.secondary }
        ].map((item, idx) => (
          <div key={idx} style={{ padding: '12px', background: item.active ? `${item.color}20` : C.bgTertiary, borderRadius: '8px', border: `1px solid ${item.active ? item.color : 'transparent'}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ padding: '4px 8px', background: item.color, color: C.textInverse, borderRadius: '6px', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>{item.cond}</span>
            <p style={{ fontSize: '14px', color: C.textSecondary, margin: 0 }}>{item.desc}</p>
          </div>
        ))}
      </div>
    </>,
    renderBottomBar(() => goTo('review'), 'See Analysis →')
  );

  const renderReview = () => phaseWrap(
    <>
      <h2 style={{ fontSize: '22px', fontWeight: 800, color: C.textPrimary, marginBottom: '16px' }}>Understanding Forced Oscillations</h2>
      <p style={{ fontSize: '15px', color: C.textSecondary, lineHeight: 1.7, marginBottom: '20px' }}>
        As you observed in the experiment, the amplitude peaked dramatically when the driving frequency matched the natural frequency. This confirms your prediction — resonance occurs because energy transfer is maximized when forces are applied in sync with the system&apos;s natural motion.
      </p>

      <div style={{ background: C.bgSecondary, borderRadius: '16px', padding: '16px', marginBottom: '20px', border: `1px solid ${C.border}` }}>
        {renderReviewSVG()}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div style={{ padding: '16px', background: `${C.primary}12`, borderRadius: '12px', border: `1px solid ${C.primary}30` }}>
          <h4 style={{ fontSize: '15px', color: C.primary, marginBottom: '10px', fontWeight: 700 }}>The Equation of Motion</h4>
          <div style={{ padding: '10px', background: C.bgPrimary, borderRadius: '8px', fontFamily: 'monospace', fontSize: '13px', color: C.textPrimary, textAlign: 'center', marginBottom: '10px' }}>
            m × d²x/dt² + c × dx/dt + k × x = F₀ × cos(ωt)
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', color: C.textSecondary, fontSize: '13px', lineHeight: 1.8 }}>
            <li>Left side: The oscillator (mass × acceleration + damping + spring)</li>
            <li>Right side: External driving force at frequency ω</li>
            <li>Natural frequency: <strong style={{ color: C.textPrimary }}>ω₀ = √(k/m)</strong></li>
          </ul>
        </div>
        <div style={{ padding: '16px', background: `${C.secondary}12`, borderRadius: '12px', border: `1px solid ${C.secondary}30` }}>
          <h4 style={{ fontSize: '15px', color: C.secondary, marginBottom: '10px', fontWeight: 700 }}>Amplitude Response</h4>
          <div style={{ padding: '10px', background: C.bgPrimary, borderRadius: '8px', fontFamily: 'monospace', fontSize: '13px', color: C.textPrimary, textAlign: 'center', marginBottom: '10px' }}>
            A = F₀ / √[(k − m × ω²)² + (c × ω)²]
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', color: C.textSecondary, fontSize: '13px', lineHeight: 1.8 }}>
            <li>Peak amplitude when ω ≈ ω₀</li>
            <li>Higher damping reduces peak and broadens it</li>
            <li>At resonance: A_max ≈ F₀ / (c × ω₀)</li>
          </ul>
        </div>
      </div>

      <div style={{ padding: '16px', background: C.bgSecondary, borderRadius: '12px', border: `1px solid ${C.border}`, marginBottom: '16px' }}>
        <h4 style={{ fontSize: '15px', color: C.success, marginBottom: '10px', fontWeight: 700 }}>Why Resonance is Powerful</h4>
        <p style={{ fontSize: '14px', color: C.textSecondary, lineHeight: 1.7, margin: 0 }}>
          <strong style={{ color: C.textPrimary }}>Energy accumulation:</strong> At resonance, each driving cycle adds energy at exactly the right moment. The Quality Factor Q measures how sharp the resonance is — high Q means narrow, tall peaks. This demonstrates why a singer must hit exactly the right note — glass has high Q, so only one precise frequency causes resonance!
        </p>
      </div>

      <div style={{ padding: '16px', background: `linear-gradient(135deg, ${C.primary}15, ${C.accent}10)`, borderRadius: '12px', border: `1px solid ${C.primary}40` }}>
        <p style={{ fontSize: '14px', color: C.textPrimary, margin: 0, lineHeight: 1.7 }}>
          <strong>Key Takeaway:</strong> Resonance occurs when driving frequency matches natural frequency, causing maximum amplitude. The sharpness of resonance is determined by damping — less damping means sharper, more dangerous resonance peaks.
        </p>
      </div>
    </>,
    renderBottomBar(() => goTo('twist_predict'), 'Discover the Twist →')
  );

  const renderTwistPredict = () => phaseWrap(
    <>
      <h2 style={{ fontSize: '22px', fontWeight: 800, color: C.textPrimary, marginBottom: '8px' }}>The Twist: New Variable</h2>
      <p style={{ fontSize: '15px', color: C.textSecondary, lineHeight: 1.6, marginBottom: '16px' }}>
        Now watch what happens when we change a different variable. The Tacoma Narrows Bridge collapsed spectacularly in 1940, twisting and oscillating in moderate winds — not even a storm!
      </p>

      <div style={{ background: C.bgSecondary, borderRadius: '16px', padding: '16px', marginBottom: '20px', border: `1px solid ${C.border}` }}>
        {renderTwistPredictSVG()}
      </div>

      <div style={{ padding: '16px', background: C.bgTertiary, borderRadius: '12px', border: `1px solid ${C.border}`, marginBottom: '24px' }}>
        <p style={{ fontSize: '15px', color: C.textSecondary, margin: 0, lineHeight: 1.7 }}>
          The wind was steady, not gusting. <strong style={{ color: C.accent }}>How did steady wind cause oscillations?</strong>
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '560px', margin: '0 auto' }}>
        {[
          { id: 'A', label: 'The wind was simply too strong for the bridge design' },
          { id: 'B', label: 'Vortex shedding created periodic forces at the bridge\'s resonant frequency' },
          { id: 'C', label: 'An earthquake happened at the same time as the wind' },
          { id: 'D', label: 'Heavy truck traffic caused the vibrations in the bridge' }
        ].map(opt => (
          <button key={opt.id} onClick={() => setTwistPrediction(opt.id)} style={{ padding: '16px', fontSize: '15px', fontWeight: twistPrediction === opt.id ? 700 : 500, color: twistPrediction === opt.id ? C.textInverse : C.textPrimary, background: twistPrediction === opt.id ? (opt.id === 'B' ? `linear-gradient(135deg, ${C.success}, ${C.successLight})` : `linear-gradient(135deg, ${C.secondary}, ${C.secondaryLight})`) : C.bgSecondary, border: `2px solid ${twistPrediction === opt.id ? (opt.id === 'B' ? C.success : C.secondary) : C.border}`, borderRadius: '12px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease' }}>
            <strong>{opt.id})</strong> {opt.label}
          </button>
        ))}
      </div>

      {twistPrediction && (
        <div style={{ marginTop: '20px', padding: '16px', background: twistPrediction === 'B' ? `${C.success}15` : `${C.accent}15`, borderRadius: '12px', border: `1px solid ${twistPrediction === 'B' ? C.success : C.accent}40` }}>
          <p style={{ fontSize: '15px', color: twistPrediction === 'B' ? C.success : C.accent, margin: 0, fontWeight: 600 }}>
            {twistPrediction === 'B' ? 'Correct! Vortex shedding turned steady wind into a periodic driving force!' : 'The answer is B — vortex shedding created periodic forces matching the bridge\'s natural frequency.'}
          </p>
        </div>
      )}
    </>,
    renderBottomBar(() => goTo('twist_play'), 'Explore Damping →', !twistPrediction)
  );

  const renderTwistPlay = () => phaseWrap(
    <>
      <h2 style={{ fontSize: '22px', fontWeight: 800, color: C.textPrimary, marginBottom: '8px' }}>Explore: Damping Controls Resonance</h2>
      <p style={{ fontSize: '15px', color: C.textSecondary, lineHeight: 1.6, marginBottom: '16px' }}>
        Now explore how damping affects the resonance peak. When you increase damping, observe how the peak height decreases and the curve broadens. This is why engineers add dampers to structures — it prevents catastrophic resonance amplification.
      </p>

      <div style={{ background: C.bgSecondary, borderRadius: '16px', padding: '16px', border: `1px solid ${C.border}`, marginBottom: '16px' }}>
        {renderTwistPlaySVG()}

        <div style={{ marginTop: '16px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', color: C.textSecondary, marginBottom: '8px' }}>
            <span>Damping Ratio (ζ):</span>
            <span style={{ color: C.secondary, fontWeight: 700 }}>{twistDamping.toFixed(2)} — Peak: {twistAmplitude.toFixed(1)}×</span>
          </label>
          <input type="range" min="0.02" max="0.8" step="0.02" value={twistDamping}
            onChange={(e) => setTwistDamping(parseFloat(e.target.value))}
            onInput={(e) => setTwistDamping(parseFloat((e.target as HTMLInputElement).value))}
            style={sliderStyle} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: C.textMuted, marginTop: '4px' }}>
            <span>Low damping (sharp peak)</span>
            <span>High damping (flat response)</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', background: C.bgTertiary, borderRadius: '12px', border: `1px solid ${C.border}` }}>
        <h3 style={{ fontSize: '15px', color: C.secondary, marginBottom: '10px', fontWeight: 700 }}>The Strouhal Number: f = St × V / D</h3>
        <p style={{ fontSize: '14px', color: C.textSecondary, lineHeight: 1.7, margin: 0 }}>
          At Tacoma Narrows, 40 mph wind created vortices at ~0.2 Hz — matching the bridge&apos;s torsional natural frequency exactly! With low damping, the oscillations grew without bound. Modern bridges use dampers with ζ &gt; 0.05 to prevent this.
        </p>
      </div>
    </>,
    renderBottomBar(() => goTo('twist_review'), 'Review Discovery →')
  );

  const renderTwistReview = () => phaseWrap(
    <>
      <h2 style={{ fontSize: '22px', fontWeight: 800, color: C.textPrimary, marginBottom: '16px' }}>Key Discovery: Hidden Periodic Forces</h2>

      <div style={{ background: C.bgSecondary, borderRadius: '16px', padding: '16px', marginBottom: '20px', border: `1px solid ${C.border}` }}>
        {renderTwistReviewSVG()}
      </div>

      <div style={{ padding: '20px', background: `${C.secondary}15`, borderRadius: '16px', border: `1px solid ${C.secondary}40`, marginBottom: '20px' }}>
        <h3 style={{ fontSize: '20px', color: C.secondary, marginBottom: '16px', fontWeight: 700 }}>Even Steady Forces Can Cause Resonance!</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ padding: '16px', background: C.bgSecondary, borderRadius: '12px' }}>
            <h4 style={{ fontSize: '14px', color: C.primary, marginBottom: '10px', fontWeight: 700 }}>Hidden Periodic Forces:</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: C.textSecondary, fontSize: '13px', lineHeight: 1.8 }}>
              <li>Vortex shedding from wind</li>
              <li>Rotating machinery imbalance</li>
              <li>Synchronized walking</li>
              <li>Electrical grid frequency (50/60 Hz)</li>
            </ul>
          </div>
          <div style={{ padding: '16px', background: C.bgSecondary, borderRadius: '12px' }}>
            <h4 style={{ fontSize: '14px', color: C.success, marginBottom: '10px', fontWeight: 700 }}>Prevention Methods:</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: C.textSecondary, fontSize: '13px', lineHeight: 1.8 }}>
              <li>Add damping to reduce peak</li>
              <li>Detune natural frequency</li>
              <li>Break up vortex patterns</li>
              <li>Active vibration control</li>
            </ul>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', background: C.bgSecondary, borderRadius: '12px', border: `1px solid ${C.border}`, marginBottom: '16px' }}>
        <h4 style={{ fontSize: '14px', color: C.accent, marginBottom: '10px', fontWeight: 700 }}>The Q Factor (Quality Factor):</h4>
        <div style={{ padding: '10px', background: C.bgTertiary, borderRadius: '8px', fontFamily: 'monospace', textAlign: 'center', marginBottom: '10px' }}>
          <span style={{ color: C.textPrimary, fontSize: '14px' }}>Q = ω₀ / (damping bandwidth)</span>
        </div>
        <ul style={{ margin: 0, paddingLeft: '20px', color: C.textSecondary, fontSize: '13px', lineHeight: 1.8 }}>
          <li><strong style={{ color: C.textPrimary }}>High Q (1000+):</strong> Very sharp peak, dangerous for bridges/glass</li>
          <li><strong style={{ color: C.textPrimary }}>Low Q (10-100):</strong> Broad peak, safer but less selective</li>
        </ul>
      </div>

      <div style={{ padding: '16px', background: `linear-gradient(135deg, ${C.primary}15, ${C.accent}10)`, borderRadius: '12px', border: `1px solid ${C.primary}40` }}>
        <p style={{ fontSize: '14px', color: C.textPrimary, margin: 0, lineHeight: 1.7 }}>
          <strong>Key Takeaway:</strong> Engineers must always ask: &quot;What periodic forces might my system encounter?&quot; Even steady flows can create oscillating forces through vortex shedding or other mechanisms.
        </p>
      </div>
    </>,
    renderBottomBar(() => goTo('transfer'), 'See Real Applications →')
  );

  const renderTransfer = () => {
    const app = transferApps[activeApp];
    const allDone = completedApps.size >= transferApps.length;

    return phaseWrap(
      <>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: C.textPrimary, marginBottom: '8px' }}>Real-World Applications</h2>
        <p style={{ fontSize: '15px', color: C.textSecondary, lineHeight: 1.6, marginBottom: '16px' }}>
          Resonance engineering in everyday life. {completedApps.size} of {transferApps.length} completed.
        </p>

        {/* Tab buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
          {transferApps.map((a, idx) => (
            <button key={idx} onClick={() => setActiveApp(idx)} style={{ padding: '10px 16px', fontSize: '14px', fontWeight: idx === activeApp ? 700 : 500, color: idx === activeApp ? C.textInverse : completedApps.has(idx) ? C.success : C.textSecondary, background: idx === activeApp ? `linear-gradient(135deg, ${a.color}, ${a.color}dd)` : completedApps.has(idx) ? `${C.success}15` : C.bgSecondary, border: `1px solid ${idx === activeApp ? a.color : completedApps.has(idx) ? C.success : C.border}`, borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s ease' }}>
              {completedApps.has(idx) ? '✓ ' : ''}{a.icon} {a.short}
            </button>
          ))}
        </div>

        {/* App card */}
        <div style={{ background: C.bgSecondary, borderRadius: '16px', border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ padding: '20px', background: `${app.color}15`, borderBottom: `1px solid ${C.border}` }}>
            <h3 style={{ fontSize: '22px', color: C.textPrimary, margin: 0, fontWeight: 800 }}>{app.icon} {app.title}</h3>
            <p style={{ fontSize: '15px', color: app.color, margin: '4px 0 12px', fontWeight: 600 }}>{app.tagline}</p>
            <p style={{ fontSize: '14px', color: C.textSecondary, lineHeight: 1.7, margin: 0 }}>{app.description}</p>
          </div>

          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
            <h4 style={{ fontSize: '14px', color: app.color, marginBottom: '8px', fontWeight: 700 }}>Connection to Resonance</h4>
            <p style={{ fontSize: '14px', color: C.textSecondary, lineHeight: 1.7, margin: 0 }}>{app.connection}</p>
          </div>

          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
            <h4 style={{ fontSize: '14px', color: C.textPrimary, marginBottom: '8px', fontWeight: 700 }}>How It Works</h4>
            <p style={{ fontSize: '14px', color: C.textSecondary, lineHeight: 1.7, margin: 0 }}>{app.howItWorks}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: C.border }}>
            {app.stats.map((stat, idx) => (
              <div key={idx} style={{ padding: '16px', background: C.bgTertiary, textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: app.color }}>{stat.value}</div>
                <div style={{ fontSize: '12px', color: C.textMuted }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: '16px 20px', borderTop: `1px solid ${C.border}` }}>
            <h4 style={{ fontSize: '14px', color: C.textPrimary, marginBottom: '8px', fontWeight: 700 }}>Examples &amp; Companies</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {app.examples.map((ex, i) => <span key={i} style={{ padding: '4px 10px', fontSize: '12px', color: C.textSecondary, background: C.bgPrimary, borderRadius: '9999px', border: `1px solid ${C.border}` }}>{ex}</span>)}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {app.companies.map((co, i) => <span key={i} style={{ padding: '4px 10px', fontSize: '12px', color: C.textSecondary, background: C.bgSecondary, borderRadius: '6px', border: `1px solid ${C.border}` }}>{co}</span>)}
            </div>
          </div>

          <div style={{ padding: '16px 20px', borderTop: `1px solid ${C.border}` }}>
            <h4 style={{ fontSize: '14px', color: C.secondary, marginBottom: '8px', fontWeight: 700 }}>Future Impact</h4>
            <p style={{ fontSize: '14px', color: C.textSecondary, lineHeight: 1.7, margin: 0 }}>{app.futureImpact}</p>
          </div>

          <div style={{ padding: '16px', borderTop: `1px solid ${C.border}` }}>
            {!completedApps.has(activeApp) ? (
              <button onClick={() => {
                const n = new Set(completedApps);
                n.add(activeApp);
                setCompletedApps(n);
                if (activeApp < transferApps.length - 1) setTimeout(() => setActiveApp(activeApp + 1), 200);
              }} style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 600, color: C.textInverse, background: `linear-gradient(135deg, ${C.success}, ${C.successLight})`, border: 'none', borderRadius: '12px', cursor: 'pointer' }}>
                Got It
              </button>
            ) : (
              <div style={{ padding: '14px', background: `${C.success}15`, borderRadius: '12px', textAlign: 'center' }}>
                <span style={{ fontSize: '15px', color: C.success, fontWeight: 600 }}>Completed</span>
              </div>
            )}
          </div>
        </div>

        {allDone && (
          <button onClick={() => goTo('test')} style={{ width: '100%', padding: '16px', fontSize: '16px', fontWeight: 700, color: C.textInverse, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, border: 'none', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
            Take the Test →
          </button>
        )}
      </>,
      renderBottomBar(() => goTo('test'), 'Take the Test →', !allDone)
    );
  };

  const renderTest = () => {
    if (showResults) {
      const score = testAnswers.reduce((acc, ans, idx) => acc + (ans !== null && testQuestions[idx].options[ans]?.correct ? 1 : 0), 0);
      return phaseWrap(
        <>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: C.textPrimary, marginBottom: '20px' }}>Test Complete!</h2>
          <div style={{ padding: '24px', background: score >= 7 ? `${C.success}15` : `${C.accent}15`, borderRadius: '16px', border: `1px solid ${score >= 7 ? C.success : C.accent}40`, textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '48px', fontWeight: 800, color: score >= 7 ? C.success : C.accent }}>{score}/10</div>
            <p style={{ fontSize: '16px', color: C.textPrimary, margin: '8px 0 0', fontWeight: 600 }}>You scored {score} out of 10 correct</p>
          </div>

          <div style={{ marginBottom: '16px', padding: '16px', background: C.bgSecondary, borderRadius: '12px', border: `1px solid ${C.border}` }}>
            <h3 style={{ fontSize: '16px', color: C.textPrimary, marginBottom: '12px', fontWeight: 700 }}>Answer Review</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              {testQuestions.map((q, idx) => {
                const isCorrect = testAnswers[idx] !== null && q.options[testAnswers[idx] as number]?.correct;
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: isCorrect ? `${C.success}15` : `${C.danger}15`, borderRadius: '8px', border: `1px solid ${isCorrect ? C.success : C.danger}40` }}>
                    <span style={{ fontSize: '16px', color: isCorrect ? C.success : C.danger, fontWeight: 700 }}>{isCorrect ? '✓' : '✗'}</span>
                    <span style={{ fontSize: '13px', color: C.textPrimary, fontWeight: 600 }}>Q{idx + 1}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
            {testQuestions.map((q, idx) => {
              const isCorrect = testAnswers[idx] !== null && q.options[testAnswers[idx] as number]?.correct;
              return (
                <div key={idx} style={{ padding: '14px', background: C.bgSecondary, borderRadius: '12px', border: `1px solid ${isCorrect ? C.success : C.danger}40` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '18px', color: isCorrect ? C.success : C.danger, fontWeight: 700 }}>{isCorrect ? '✓' : '✗'}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '14px', color: C.textPrimary, margin: 0, fontWeight: 600 }}>Question {idx + 1}: {q.question}</p>
                      {!isCorrect && <p style={{ fontSize: '13px', color: C.danger, margin: '4px 0 0' }}>Your answer: {q.options[testAnswers[idx] as number]?.text}</p>}
                      <p style={{ fontSize: '13px', color: C.success, margin: '2px 0 0', fontWeight: 500 }}>Correct: {q.options.find(o => o.correct)?.text}</p>
                    </div>
                  </div>
                  <div style={{ padding: '10px', background: C.bgTertiary, borderRadius: '8px', fontSize: '13px', color: C.textSecondary, lineHeight: 1.6 }}>{q.explanation}</div>
                </div>
              );
            })}
          </div>
        </>,
        renderBottomBar(() => goTo('mastery'), 'Complete Lesson →')
      );
    }

    const q = testQuestions[currentQ];
    const isAnswered = testAnswers[currentQ] !== null;
    const isConfirmed = confirmed[currentQ];

    return phaseWrap(
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '22px', color: C.textPrimary, margin: 0, fontWeight: 800 }}>Knowledge Test</h2>
          <span style={{ padding: '6px 14px', fontSize: '14px', fontWeight: 600, color: C.textSecondary, background: C.bgSecondary, borderRadius: '9999px' }}>
            Question {currentQ + 1} of 10
          </span>
        </div>

        {/* Scenario */}
        <div style={{ padding: '14px', background: C.bgTertiary, borderRadius: '12px', marginBottom: '12px', borderLeft: `4px solid ${C.accent}` }}>
          <p style={{ fontSize: '14px', color: C.textSecondary, margin: 0, fontStyle: 'italic', lineHeight: 1.6 }}>{q.scenario}</p>
        </div>

        {/* Question */}
        <div style={{ padding: '14px', background: C.bgSecondary, borderRadius: '12px', border: `1px solid ${C.border}`, marginBottom: '12px' }}>
          <p style={{ fontSize: '16px', color: C.textPrimary, margin: 0, fontWeight: 600, lineHeight: 1.5 }}>{q.question}</p>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {q.options.map((opt, idx) => {
            const isSel = testAnswers[currentQ] === idx;
            const showCorrect = isConfirmed && opt.correct;
            const showWrong = isConfirmed && isSel && !opt.correct;
            return (
              <button key={idx} onClick={() => {
                if (!isConfirmed) {
                  const na = [...testAnswers];
                  na[currentQ] = idx;
                  setTestAnswers(na);
                }
              }} style={{ padding: '12px 16px', fontSize: '14px', fontWeight: isSel ? 600 : 400, color: showCorrect ? C.textInverse : showWrong ? C.textInverse : isSel ? C.textInverse : C.textPrimary, background: showCorrect ? `linear-gradient(135deg, ${C.success}, ${C.successLight})` : showWrong ? `linear-gradient(135deg, ${C.danger}, ${C.primaryLight})` : isSel ? `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})` : C.bgSecondary, border: `2px solid ${showCorrect ? C.success : showWrong ? C.danger : isSel ? C.primary : C.border}`, borderRadius: '12px', cursor: isConfirmed ? 'default' : 'pointer', textAlign: 'left', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '9999px', background: isSel ? C.bgPrimary : C.bgTertiary, color: isSel ? C.primary : C.textMuted, fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span style={{ lineHeight: 1.4 }}>{opt.text}</span>
              </button>
            );
          })}
        </div>

        {/* Confirm / explanation */}
        {isAnswered && !isConfirmed && (
          <button onClick={() => {
            const nc = [...confirmed];
            nc[currentQ] = true;
            setConfirmed(nc);
          }} style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700, color: C.textInverse, background: `linear-gradient(135deg, ${C.accent}, ${C.accentLight})`, border: 'none', borderRadius: '12px', cursor: 'pointer', marginBottom: '12px' }}>
            Confirm Answer
          </button>
        )}

        {isConfirmed && (
          <div style={{ padding: '14px', background: C.bgTertiary, borderRadius: '12px', marginBottom: '12px', border: `1px solid ${C.border}` }}>
            <p style={{ fontSize: '14px', color: C.textSecondary, margin: 0, lineHeight: 1.6 }}>
              <strong style={{ color: q.options[testAnswers[currentQ] as number]?.correct ? C.success : C.danger }}>
                {q.options[testAnswers[currentQ] as number]?.correct ? 'Correct!' : 'Incorrect.'}
              </strong>{' '}
              {q.explanation}
            </p>
          </div>
        )}

        {/* Navigation */}
        {isConfirmed && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            {currentQ < 9 ? (
              <button onClick={() => setCurrentQ(currentQ + 1)} style={{ padding: '12px 24px', fontSize: '15px', fontWeight: 600, color: C.textInverse, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, border: 'none', borderRadius: '12px', cursor: 'pointer' }}>
                Next Question →
              </button>
            ) : (
              <button onClick={() => setShowResults(true)} style={{ padding: '12px 24px', fontSize: '15px', fontWeight: 700, color: C.textInverse, background: `linear-gradient(135deg, ${C.success}, ${C.successLight})`, border: 'none', borderRadius: '12px', cursor: 'pointer' }}>
                Submit Test
              </button>
            )}
          </div>
        )}
      </>,
      renderBottomBar(() => {}, 'Next →', true)
    );
  };

  const renderMastery = () => {
    const score = testAnswers.reduce((acc, ans, idx) => acc + (ans !== null && testQuestions[idx].options[ans]?.correct ? 1 : 0), 0);
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `radial-gradient(ellipse at top, ${C.bgSecondary} 0%, ${C.bgPrimary} 70%)` }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 24px 100px' }}>
          <div style={{ width: '120px', height: '120px', margin: '0 auto 32px', borderRadius: '9999px', background: `linear-gradient(135deg, ${C.primary}20, ${C.accent}20)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 40px ${C.primary}40`, border: `2px solid ${C.primary}30` }}>
            <span style={{ fontSize: '60px' }}>🏆</span>
          </div>

          <h1 style={{ fontSize: '36px', fontWeight: 800, color: C.textPrimary, marginBottom: '16px' }}>Resonance Master!</h1>
          <p style={{ fontSize: '18px', color: C.textSecondary, maxWidth: '520px', lineHeight: 1.7, marginBottom: '24px' }}>
            Congratulations! You&apos;ve mastered forced oscillations and resonance. You now understand how frequency matching creates powerful amplification — from bridges to radios!
          </p>

          <div style={{ padding: '20px', background: C.bgSecondary, borderRadius: '16px', border: `1px solid ${C.border}`, marginBottom: '24px' }}>
            <div style={{ fontSize: '36px', fontWeight: 800, color: C.success }}>{score}/10</div>
            <div style={{ fontSize: '14px', color: C.textSecondary }}>Quiz Score</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', width: '100%', maxWidth: '640px', marginBottom: '24px' }}>
            {[
              { icon: '🌉', label: 'Bridge Engineering', color: C.primary },
              { icon: '📻', label: 'Radio Tuning', color: '#3b82f6' },
              { icon: '🎸', label: 'Musical Acoustics', color: C.secondary },
              { icon: '🏢', label: 'Earthquake Design', color: C.success }
            ].map((item, idx) => (
              <div key={idx} style={{ padding: '12px', background: C.bgSecondary, borderRadius: '12px', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: '28px', marginBottom: '6px' }}>{item.icon}</div>
                <div style={{ fontSize: '12px', color: item.color, fontWeight: 600 }}>{item.label}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: '16px', background: `linear-gradient(135deg, ${C.primary}15, ${C.accent}10)`, borderRadius: '12px', border: `1px solid ${C.primary}40`, maxWidth: '520px' }}>
            <p style={{ fontSize: '14px', color: C.textPrimary, margin: 0, lineHeight: 1.7 }}>
              <strong>Key Takeaway:</strong> Resonance occurs when driving frequency matches natural frequency, causing maximum amplitude. This principle shapes engineering from skyscrapers to smartphones!
            </p>
          </div>

          <button onClick={() => {
            setPrediction(null); setTwistPrediction(null); setCompletedApps(new Set());
            setTestAnswers(new Array(10).fill(null)); setShowResults(false);
            setCurrentQ(0); setConfirmed(new Array(10).fill(false));
            goTo('hook');
          }} style={{ marginTop: '24px', padding: '12px 24px', fontSize: '15px', fontWeight: 600, color: C.textPrimary, background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '12px', cursor: 'pointer' }}>
            Replay Lesson
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.bgPrimary, color: C.textPrimary, fontFamily: '-apple