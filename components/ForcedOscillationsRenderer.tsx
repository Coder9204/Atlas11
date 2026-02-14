'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// FORCED OSCILLATIONS & RESONANCE - GOLD STANDARD IMPLEMENTATION
// Physics: m(d²x/dt²) + c(dx/dt) + kx = F₀cos(ωt)
// Natural frequency: ω₀ = √(k/m)
// Resonance: maximum amplitude when ω ≈ ω₀
// Amplitude: A = F₀ / √[(k - mω²)² + (cω)²]
// 10-Phase Learning Structure with Premium Design
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

// Premium Design System
const colors = {
  primary: '#ef4444',       // Red
  primaryLight: '#f87171',
  primaryDark: '#dc2626',
  accent: '#f59e0b',        // Amber
  accentLight: '#fbbf24',
  secondary: '#8b5cf6',     // Purple
  secondaryLight: '#a78bfa',
  success: '#22c55e',
  successLight: '#4ade80',
  warning: '#f59e0b',
  danger: '#ef4444',
  bgPrimary: '#030712',     // Deepest background
  bgSecondary: '#0f172a',   // Cards and elevated surfaces
  bgTertiary: '#1e293b',    // Hover states, inputs
  bgElevated: '#334155',    // Highly elevated elements
  border: '#334155',
  borderLight: '#475569',
  borderFocus: '#ef4444',
  textPrimary: '#f8fafc',   // Headings
  textSecondary: '#e2e8f0', // Body text - brightened for contrast
  textTertiary: '#64748b',  // Captions, hints
  textInverse: '#0f172a',   // Text on light backgrounds
};

const space = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

const radius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  full: '9999px',
};

const shadows = {
  sm: '0 1px 2px rgba(0,0,0,0.3)',
  md: '0 4px 12px rgba(0,0,0,0.4)',
  lg: '0 8px 24px rgba(0,0,0,0.5)',
  glow: (color: string) => `0 0 40px ${color}40`,
};

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

interface GameEvent {
  type: string;
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

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
  stats: { value: string; label: string; icon: string }[];
  examples: string[];
  companies: string[];
  futureImpact: string;
  color: string;
}

interface Props {
  width?: number;
  height?: number;
  onBack?: () => void;
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// REAL-WORLD APPLICATIONS DATA
// ═══════════════════════════════════════════════════════════════════════════

const realWorldApps: TransferApp[] = [
  {
    icon: '🌉',
    title: 'Bridge Resonance Disasters',
    short: 'Bridges',
    tagline: 'When rhythm becomes destruction',
    description: 'The Tacoma Narrows Bridge collapse in 1940 and the Millennium Bridge wobble in 2000 demonstrate resonance catastrophe. When external forces match a structure\'s natural frequency, oscillations grow until failure.',
    connection: 'Just as you saw amplitude peak when driving frequency matched natural frequency, wind vortices or synchronized footsteps can drive bridges at their resonant frequency, causing dangerous amplification.',
    howItWorks: 'Structures have natural frequencies determined by mass and stiffness. When periodic forces (wind, footsteps) match these frequencies, energy accumulates with each cycle. Without damping, amplitude grows until structural limits are exceeded.',
    stats: [
      { value: '0.2 Hz', label: 'Typical bridge sway frequency', icon: '🌊' },
      { value: '$28M', label: 'Millennium Bridge retrofit cost', icon: '💰' },
      { value: '40 mph', label: 'Tacoma Narrows failure wind speed', icon: '💨' }
    ],
    examples: ['Tacoma Narrows collapse (1940)', 'Millennium Bridge wobble (2000)', 'Broughton Suspension Bridge (1831)', 'Wind-induced building sway'],
    companies: ['Arup', 'AECOM', 'Thornton Tomasetti', 'Mott MacDonald'],
    futureImpact: 'Smart damping systems with real-time frequency monitoring will automatically adjust to prevent resonance in next-generation structures.',
    color: colors.primary
  },
  {
    icon: '📻',
    title: 'Radio Tuning & Filters',
    short: 'Radio Tuning',
    tagline: 'Resonance picks your favorite station',
    description: 'Radio receivers use resonant LC circuits to select specific stations. The circuit responds strongly only to signals matching its resonant frequency, amplifying the desired station while rejecting all others.',
    connection: 'The frequency-selective amplification you explored is exactly how radios work: the LC circuit\'s resonant frequency is tuned to match the station, maximizing response at that frequency.',
    howItWorks: 'An LC (inductor-capacitor) circuit has a resonant frequency f = 1/(2pi*sqrt(LC)). By adjusting C (variable capacitor), you tune the resonance to match the broadcast frequency. The circuit amplifies this frequency while attenuating others.',
    stats: [
      { value: '540-1600 kHz', label: 'AM radio band', icon: '📻' },
      { value: '88-108 MHz', label: 'FM radio band', icon: '🎵' },
      { value: '10,000+', label: 'Radio stations in USA', icon: '📡' }
    ],
    examples: ['AM/FM radio tuning', 'TV channel selection', 'Cell phone band filters', 'Guitar amplifier tone circuits'],
    companies: ['Qualcomm', 'Skyworks', 'Qorvo', 'Broadcom'],
    futureImpact: 'Software-defined radio will use digital resonance, enabling devices to receive any frequency band with programmable filters.',
    color: '#3b82f6'
  },
  {
    icon: '🎸',
    title: 'Musical Instrument Acoustics',
    short: 'Instruments',
    tagline: 'Resonant bodies amplify string vibrations',
    description: 'String instruments use resonant bodies (sound boxes) to amplify vibrations. The body resonates at specific frequencies, amplifying some harmonics more than others, giving each instrument its unique timbre.',
    connection: 'The driving frequency (vibrating string) forces the instrument body to oscillate. When string harmonics match body resonances, those frequencies are strongly amplified.',
    howItWorks: 'The string vibrates at multiple harmonics. The sound box has its own resonant modes. Where these overlap, sound is amplified. Luthiers carefully shape bodies to produce desired resonances and tonal qualities.',
    stats: [
      { value: '440 Hz', label: 'Concert A pitch', icon: '🎵' },
      { value: '~20', label: 'Resonant modes in violin body', icon: '🎻' },
      { value: '$16M', label: 'Most expensive violin sold', icon: '💰' }
    ],
    examples: ['Acoustic guitar bodies', 'Violin f-holes', 'Piano soundboards', 'Drum shell resonance'],
    companies: ['Fender', 'Gibson', 'Steinway', 'Stradivarius (historical)'],
    futureImpact: 'Computational design and 3D printing will enable optimized resonance patterns, creating instruments with unprecedented tonal control.',
    color: '#8b5cf6'
  },
  {
    icon: '🏢',
    title: 'Earthquake Engineering',
    short: 'Earthquakes',
    tagline: 'Survival depends on frequency mismatch',
    description: 'Earthquakes produce ground motion at various frequencies. Buildings also have natural frequencies. When these match, resonance causes catastrophic amplification. Engineers design buildings to avoid resonance with likely seismic frequencies.',
    connection: 'Just as you observed maximum amplitude when driving frequency matched natural frequency, buildings experience maximum stress when earthquake frequencies match their natural sway frequency.',
    howItWorks: 'Tall buildings sway at low frequencies (0.1-1 Hz), matching some earthquake motions. Base isolation systems, tuned mass dampers, and structural bracing detune the building or add damping to limit resonant amplification.',
    stats: [
      { value: '0.5-2 Hz', label: 'Dangerous earthquake frequencies', icon: '🌍' },
      { value: '730 tons', label: 'Taipei 101 damper mass', icon: '⚖️' },
      { value: '$300B', label: 'Annual global earthquake losses', icon: '💰' }
    ],
    examples: ['Taipei 101 tuned mass damper', 'Japan base isolation systems', 'Mexico City 1985 resonance disaster', 'Cross-bracing systems'],
    companies: ['Skidmore, Owings & Merrill', 'Arup', 'Shimizu Corporation', 'Taylor Devices'],
    futureImpact: 'Active control systems will dynamically adjust building properties during earthquakes, actively avoiding resonance in real-time.',
    color: '#22c55e'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// TEST QUESTIONS (10 questions)
// ═══════════════════════════════════════════════════════════════════════════

const testQuestions: TestQuestion[] = [
  {
    scenario: 'A child on a swing is being pushed by their parent at regular intervals.',
    question: 'For the swing to go highest, when should the parent push?',
    options: [
      { text: 'At random times for variety', correct: false },
      { text: 'As fast as possible', correct: false },
      { text: 'At the swing\'s natural frequency (once per swing cycle)', correct: true },
      { text: 'Very slowly, once every few swings', correct: false }
    ],
    explanation: 'Maximum energy transfer (resonance) occurs when the driving frequency matches the natural frequency. Pushing once per complete swing cycle builds up amplitude efficiently.'
  },
  {
    scenario: 'An opera singer shatters a wine glass by singing at a specific pitch.',
    question: 'Why does only that particular pitch break the glass?',
    options: [
      { text: 'It\'s the loudest note the singer can produce', correct: false },
      { text: 'It matches the glass\'s natural resonant frequency', correct: true },
      { text: 'High pitches always break glass', correct: false },
      { text: 'The singer applies more force at that note', correct: false }
    ],
    explanation: 'Glass has a natural frequency. When sound at that exact frequency hits the glass, resonance causes oscillations to build up until the stress exceeds the glass\'s breaking point.'
  },
  {
    scenario: 'The Tacoma Narrows Bridge famously collapsed in 1940 during moderate winds.',
    question: 'What caused the bridge to oscillate so violently?',
    options: [
      { text: 'The wind was too strong', correct: false },
      { text: 'The bridge was too heavy', correct: false },
      { text: 'Wind vortices matched the bridge\'s natural frequency (resonance)', correct: true },
      { text: 'An earthquake occurred simultaneously', correct: false }
    ],
    explanation: 'Wind vortex shedding created a periodic force that matched the bridge\'s torsional natural frequency. This resonance caused oscillations to grow until structural failure.'
  },
  {
    scenario: 'You\'re tuning a radio to find your favorite station at 101.5 MHz.',
    question: 'What physical principle allows the radio to select just that frequency?',
    options: [
      { text: 'Magnetic filtering', correct: false },
      { text: 'Electrical resonance in an LC circuit tuned to 101.5 MHz', correct: true },
      { text: 'Digital signal processing', correct: false },
      { text: 'Sound wave interference', correct: false }
    ],
    explanation: 'The radio\'s tuning circuit (LC circuit) has an adjustable natural frequency. When tuned to 101.5 MHz, only that frequency causes resonance and gets amplified while others are suppressed.'
  },
  {
    scenario: 'A car\'s engine is running at certain RPMs and the steering wheel vibrates annoyingly.',
    question: 'Why does this vibration only occur at specific engine speeds?',
    options: [
      { text: 'The engine is misfiring at those speeds', correct: false },
      { text: 'The tires are unbalanced', correct: false },
      { text: 'Engine vibration frequency matches a structural resonance', correct: true },
      { text: 'The fuel mixture is wrong', correct: false }
    ],
    explanation: 'Car components have natural frequencies. When engine RPM creates vibrations matching these frequencies, resonance amplifies the oscillations. Changing RPM moves away from resonance.'
  },
  {
    scenario: 'An MRI machine uses precise radio waves to image the body.',
    question: 'MRI works by exploiting resonance of:',
    options: [
      { text: 'Body tissue vibrations', correct: false },
      { text: 'Sound waves in the machine', correct: false },
      { text: 'Hydrogen nuclei (protons) in a magnetic field', correct: true },
      { text: 'X-ray frequencies', correct: false }
    ],
    explanation: 'MRI uses Nuclear Magnetic Resonance. Hydrogen nuclei precess at specific frequencies in magnetic fields. RF pulses at these resonant frequencies cause energy absorption that\'s detected to create images.'
  },
  {
    scenario: 'Musicians playing together notice that certain notes make the room "ring".',
    question: 'These "room modes" occur because:',
    options: [
      { text: 'The musicians are playing too loudly', correct: false },
      { text: 'Sound waves resonate with the room\'s dimensions', correct: true },
      { text: 'The instruments are out of tune', correct: false },
      { text: 'Echo from the walls', correct: false }
    ],
    explanation: 'Rooms have natural acoustic frequencies based on their dimensions. When musical notes match these frequencies, standing waves form, causing certain frequencies to be amplified (room resonance).'
  },
  {
    scenario: 'In the amplitude response curve for a forced oscillator, you increase damping.',
    question: 'What happens to the resonance peak?',
    options: [
      { text: 'It gets taller and narrower', correct: false },
      { text: 'It gets shorter and wider', correct: true },
      { text: 'It shifts to a higher frequency', correct: false },
      { text: 'It disappears completely', correct: false }
    ],
    explanation: 'Higher damping reduces the maximum amplitude at resonance and broadens the peak. With very high damping, the system barely resonates at all. Low damping gives sharp, tall resonance peaks.'
  },
  {
    scenario: 'A washing machine "walks" across the floor during the spin cycle but not at other times.',
    question: 'This happens because:',
    options: [
      { text: 'The load is unbalanced at all speeds', correct: false },
      { text: 'The spin speed passes through the machine\'s resonant frequency', correct: true },
      { text: 'The floor is uneven', correct: false },
      { text: 'The machine is too light', correct: false }
    ],
    explanation: 'During spin-up, the rotation frequency passes through resonant frequencies of the machine on its mounts. At these specific speeds, vibrations are amplified. Manufacturers try to accelerate quickly through these ranges.'
  },
  {
    scenario: 'Soldiers crossing a bridge are told to break step rather than march in unison.',
    question: 'This order prevents:',
    options: [
      { text: 'Soldiers from getting tired', correct: false },
      { text: 'Resonance from synchronized footsteps collapsing the bridge', correct: true },
      { text: 'The bridge from getting dirty', correct: false },
      { text: 'Noise complaints from nearby residents', correct: false }
    ],
    explanation: 'Synchronized marching creates a periodic force. If this frequency matches the bridge\'s natural frequency, resonance can build oscillations to dangerous levels. Breaking step removes the periodic driving force.'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const ForcedOscillationsRenderer: React.FC<Props> = ({
  width = 800,
  height = 600,
  onBack,
  onGameEvent,
  gamePhase,
  onPhaseComplete
}) => {
  const [phase, setPhase] = useState<Phase>('hook');
  const [isMobile, setIsMobile] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(testQuestions.length).fill(null));
  const [showTestResults, setShowTestResults] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Physics simulation states
  const [drivingFrequency, setDrivingFrequency] = useState(0.5);
  const [damping] = useState(0.1);
  const [displacement, setDisplacement] = useState(0);
  const [time, setTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [isAtResonance, setIsAtResonance] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);

  // Sync with external phase control
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // Responsive check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Responsive typography system
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

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Sound effects
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete' | 'resonance') => {
    if (typeof window === 'undefined' || !audioContextRef.current) return;
    try {
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      const soundConfigs: Record<string, { freq: number; duration: number; type: OscillatorType; freqEnd?: number }> = {
        click: { freq: 600, duration: 0.1, type: 'sine' },
        success: { freq: 523, duration: 0.3, type: 'sine', freqEnd: 784 },
        failure: { freq: 300, duration: 0.3, type: 'sine', freqEnd: 200 },
        transition: { freq: 500, duration: 0.15, type: 'sine', freqEnd: 700 },
        complete: { freq: 440, duration: 0.5, type: 'sine', freqEnd: 880 },
        resonance: { freq: 440, duration: 0.4, type: 'sine', freqEnd: 880 }
      };

      const config = soundConfigs[type];
      oscillator.frequency.setValueAtTime(config.freq, ctx.currentTime);
      if (config.freqEnd) {
        oscillator.frequency.exponentialRampToValueAtTime(config.freqEnd, ctx.currentTime + config.duration);
      }
      oscillator.type = config.type;
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + config.duration);
      oscillator.start();
      oscillator.stop(ctx.currentTime + config.duration);
    } catch {
      // Audio not supported
    }
  }, []);

  // Emit events
  const emitEvent = useCallback((type: string, details: Record<string, unknown> = {}) => {
    if (onGameEvent) {
      onGameEvent({
        type,
        gameType: 'forced_oscillations',
        gameTitle: 'Forced Oscillations & Resonance',
        details: { phase, ...details },
        timestamp: Date.now()
      });
    }
  }, [onGameEvent, phase]);

  // Phase navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    emitEvent('phase_change', { from: phase, to: newPhase });
    if (onPhaseComplete) onPhaseComplete(newPhase);
  }, [playSound, emitEvent, phase, onPhaseComplete]);

  // Calculate steady-state amplitude for forced oscillation
  const calculateAmplitude = useCallback((omega: number, omega0: number, zeta: number) => {
    const numerator = 1;
    const denom1 = Math.pow(omega0 * omega0 - omega * omega, 2);
    const denom2 = Math.pow(2 * zeta * omega0 * omega, 2);
    return numerator / Math.sqrt(denom1 + denom2);
  }, []);

  // Animation loop for forced oscillation
  useEffect(() => {
    if (!isAnimating) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const animate = () => {
      setTime(prev => {
        const newTime = prev + 0.05;
        const omega = drivingFrequency;
        const omega0 = 1.0;
        const A = calculateAmplitude(omega, omega0, damping);
        setAmplitude(A);

        const atResonance = Math.abs(drivingFrequency - 1.0) < 0.15;
        if (atResonance && !isAtResonance) {
          setIsAtResonance(true);
          playSound('resonance');
        } else if (!atResonance && isAtResonance) {
          setIsAtResonance(false);
        }

        const newDisp = A * Math.cos(omega * newTime * 5) * 80;
        setDisplacement(newDisp);

        return newTime;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, drivingFrequency, damping, calculateAmplitude, playSound, isAtResonance]);

  const startSimulation = useCallback(() => {
    setTime(0);
    setDisplacement(0);
    setIsAnimating(true);
    emitEvent('simulation_started', { drivingFrequency });
  }, [drivingFrequency, emitEvent]);

  const stopSimulation = useCallback(() => {
    setIsAnimating(false);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER RENDER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // Phase labels for accessibility
  const phaseLabels: Record<Phase, string> = {
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

  // Progress bar (fixed nav)
  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <nav
        aria-label="Phase progress"
        style={{
          position: 'fixed' as const,
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: space.xs,
          padding: `${space.md} ${space.lg}`,
          background: colors.bgSecondary,
          borderBottom: `1px solid ${colors.border}`
        }}>
        {phaseOrder.map((p, idx) => (
          <button
            key={p}
            aria-label={phaseLabels[p]}
            title={phaseLabels[p]}
            style={{
              flex: 1,
              height: '8px',
              borderRadius: radius.full,
              background: idx <= currentIndex
                ? `linear-gradient(90deg, ${colors.primary}, ${colors.primaryLight})`
                : colors.bgTertiary,
              transition: 'all 0.4s ease',
              boxShadow: idx <= currentIndex ? shadows.glow(colors.primary) : 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              minHeight: '44px'
            }}
            onClick={() => idx <= currentIndex && setPhase(p)}
          />
        ))}
        <span style={{
          marginLeft: space.md,
          fontSize: '13px',
          color: colors.textSecondary,
          fontWeight: 600,
          minWidth: '48px'
        }}>
          {currentIndex + 1}/{phaseOrder.length}
        </span>
      </nav>
    );
  };

  // Navigation dots for test questions
  const renderNavDots = () => {
    return (
      <div style={{
        display: 'flex',
        gap: space.sm,
        marginBottom: space.lg,
        justifyContent: 'center'
      }}>
        {testQuestions.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentQuestionIndex(idx)}
            style={{
              width: '12px',
              height: '12px',
              borderRadius: radius.full,
              border: 'none',
              cursor: 'pointer',
              background: idx === currentQuestionIndex
                ? colors.primary
                : testAnswers[idx] !== null
                  ? colors.success
                  : colors.bgTertiary,
              transition: 'all 0.2s ease',
              boxShadow: idx === currentQuestionIndex ? shadows.glow(colors.primary) : 'none',
              zIndex: 10,
              position: 'relative'
            }}
          />
        ))}
      </div>
    );
  };

  // Bottom navigation bar (fixed)
  const renderBottomBar = (onNext: () => void, nextLabel: string = 'Continue', disabled: boolean = false) => {
    const currentIndex = phaseOrder.indexOf(phase);
    const canGoBack = currentIndex > 0;

    const goBack = () => {
      if (canGoBack) {
        setPhase(phaseOrder[currentIndex - 1]);
      }
    };

    return (
      <div style={{
        position: 'fixed' as const,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        padding: `${space.lg} ${space.xl}`,
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <button
          onClick={goBack}
          disabled={!canGoBack}
          style={{
            padding: `${space.md} ${space.xl}`,
            minHeight: '44px',
            fontSize: '15px',
            fontWeight: 600,
            color: canGoBack ? colors.textSecondary : colors.textTertiary,
            background: colors.bgTertiary,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            opacity: canGoBack ? 1 : 0.3,
            transition: 'all 0.3s ease'
          }}
        >
          ← Back
        </button>
        <button
          onClick={() => !disabled && onNext()}
          disabled={disabled}
          style={{
            padding: `${space.md} ${space.xl}`,
            minHeight: '44px',
            fontSize: '15px',
            fontWeight: 700,
            color: disabled ? colors.textTertiary : colors.textInverse,
            background: disabled
              ? colors.bgTertiary
              : `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
            border: 'none',
            borderRadius: radius.md,
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            opacity: disabled ? 0.4 : 1,
            boxShadow: disabled ? 'none' : shadows.md,
            letterSpacing: '0.3px'
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  // Section header
  const renderSectionHeader = (icon: string, title: string, subtitle?: string) => {
    return (
      <div style={{ marginBottom: space.lg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: space.md, marginBottom: space.sm }}>
          <span style={{ fontSize: '28px' }}>{icon}</span>
          <h2 style={{
            fontSize: typo.heading,
            fontWeight: 800,
            color: colors.textPrimary,
            margin: 0,
            letterSpacing: '-0.5px'
          }}>
            {title}
          </h2>
        </div>
        {subtitle && (
          <p style={{
            fontSize: '15px',
            color: colors.textSecondary,
            margin: 0,
            lineHeight: 1.6
          }}>
            {subtitle}
          </p>
        )}
      </div>
    );
  };

  // Key takeaway box
  const renderKeyTakeaway = (text: string) => {
    return (
      <div style={{
        padding: `${space.lg} ${space.lg}`,
        background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}10)`,
        borderRadius: radius.lg,
        border: `1px solid ${colors.primary}40`,
        marginTop: space.lg
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: space.md }}>
          <span style={{ fontSize: '24px' }}>💡</span>
          <div>
            <div style={{
              fontSize: '12px',
              fontWeight: 700,
              color: colors.primary,
              marginBottom: space.xs,
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Key Takeaway
            </div>
            <p style={{
              fontSize: '15px',
              color: colors.textPrimary,
              margin: 0,
              lineHeight: 1.7
            }}>
              {text}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Get frequency label
  const getFrequencyLabel = (ratio: number): string => {
    if (ratio < 0.85) return 'Below Resonance';
    if (ratio > 1.15) return 'Above Resonance';
    return 'At Resonance!';
  };

  // Get frequency color
  const getFrequencyColor = (ratio: number): string => {
    if (ratio < 0.85) return colors.accent;
    if (ratio > 1.15) return colors.secondary;
    return colors.primary;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE RENDER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // Hook Phase
  const renderHook = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '600px',
      padding: isMobile ? space.lg : space.xxl,
      textAlign: 'center'
    }}>
      {/* Premium badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: space.sm,
        padding: `${space.sm} ${space.md}`,
        background: `${colors.primary}15`,
        border: `1px solid ${colors.primary}30`,
        borderRadius: radius.full,
        marginBottom: space.xl
      }}>
        <span style={{ width: '8px', height: '8px', background: colors.primary, borderRadius: '50%' }} />
        <span style={{ fontSize: '14px', fontWeight: 600, color: colors.primary, letterSpacing: '0.5px' }}>WAVE PHYSICS</span>
      </div>

      {/* Main title */}
      <h1 style={{
        fontSize: isMobile ? '32px' : '44px',
        fontWeight: 800,
        background: `linear-gradient(135deg, ${colors.textPrimary}, ${colors.primaryLight}, ${colors.accent})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        marginBottom: space.md,
        letterSpacing: '-1px'
      }}>
        Why Do Opera Singers Break Glass?
      </h1>

      <p style={{
        fontSize: typo.bodyLarge,
        color: colors.textSecondary,
        maxWidth: '500px',
        marginBottom: space.xl
      }}>
        Discover the power of resonance and natural frequencies
      </p>

      {/* Premium card */}
      <div style={{
        background: `linear-gradient(135deg, ${colors.bgSecondary}, ${colors.bgTertiary})`,
        borderRadius: radius.xl,
        padding: isMobile ? space.lg : space.xl,
        maxWidth: '600px',
        width: '100%',
        border: `1px solid ${colors.border}`,
        boxShadow: shadows.lg
      }}>
        <svg width="100%" height={isMobile ? '180' : '220'} viewBox="0 0 400 220" role="img" aria-label="Opera singer breaking wine glass illustration">
          <defs>
            <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.6"/>
              <stop offset="50%" stopColor="#93c5fd" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.6"/>
            </linearGradient>
          </defs>

          {/* Wine glass */}
          <path
            d="M200 60 Q140 60, 140 100 Q140 140, 180 140 L180 180 L150 180 L210 180 L210 140 Q260 140, 260 100 Q260 60, 200 60"
            fill="url(#glassGrad)"
            stroke="#60a5fa"
            strokeWidth="2"
          />

          {/* Sound waves */}
          {[0, 1, 2].map(i => (
            <path
              key={i}
              d={`M${60 + i * 20} 100 Q${60 + i * 20} 80, ${75 + i * 20} 80 Q${60 + i * 20} 120, ${75 + i * 20} 120`}
              fill="none"
              stroke={colors.accent}
              strokeWidth="2"
              opacity={0.7 - i * 0.2}
            />
          ))}

          {/* Singer */}
          <circle cx="30" cy="90" r="15" fill="#fcd9b6"/>
          <ellipse cx="30" cy="130" rx="12" ry="25" fill={colors.primary}/>
          <ellipse cx="30" cy="100" rx="4" ry="3" fill={colors.bgPrimary}/>

          {/* Vibration lines */}
          <path d="M160 90 L155 85" stroke={colors.primary} strokeWidth="2"/>
          <path d="M240 90 L245 85" stroke={colors.primary} strokeWidth="2"/>
        </svg>

        <p style={{
          fontSize: typo.bodyLarge,
          color: colors.textPrimary,
          marginTop: space.lg,
          marginBottom: space.sm
        }}>
          A trained opera singer can shatter a wine glass using only their voice!
        </p>
        <p style={{
          fontSize: typo.body,
          color: colors.primary,
          fontWeight: 600
        }}>
          What makes one specific pitch so destructive?
        </p>
      </div>

      {/* CTA Button */}
      <button
        onClick={() => goToPhase('predict')}
        style={{
          marginTop: space.xl,
          padding: `${space.md} ${space.xxl}`,
          minHeight: '44px',
          fontSize: '16px',
          fontWeight: 700,
          color: colors.textInverse,
          background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
          border: 'none',
          borderRadius: radius.lg,
          cursor: 'pointer',
          boxShadow: shadows.md,
          transition: 'all 0.3s ease'
        }}
      >
        Discover Resonance →
      </button>

      {/* Feature hints */}
      <div style={{
        display: 'flex',
        gap: space.xl,
        marginTop: space.xl,
        color: colors.textTertiary,
        fontSize: typo.small
      }}>
        <span>✦ Interactive Lab</span>
        <span>✦ Real-World Examples</span>
        <span>✦ Knowledge Test</span>
      </div>
    </div>
  );

  // Predict Phase
  const renderPredict = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      background: colors.bgPrimary,
      overflow: 'hidden'
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, padding: isMobile ? space.lg : space.xl, overflowY: 'auto', marginTop: '60px', marginBottom: '80px' }}>
        {renderSectionHeader('🤔', 'Your Prediction', 'Step 1 of 2: Make your prediction')}

        {/* Static SVG for prediction phase */}
        <div style={{
          background: colors.bgSecondary,
          borderRadius: radius.lg,
          padding: space.lg,
          marginBottom: space.lg,
          border: `1px solid ${colors.border}`
        }}>
          <svg width="100%" height="180" viewBox="0 0 400 180" role="img" aria-label="Swing illustration for prediction">
            <defs>
              <linearGradient id="swingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={colors.accent}/>
                <stop offset="100%" stopColor="#b45309"/>
              </linearGradient>
            </defs>
            {/* Background */}
            <rect width="400" height="180" fill={colors.bgPrimary}/>
            {/* Swing frame */}
            <line x1="100" y1="20" x2="200" y2="120" stroke={colors.bgTertiary} strokeWidth="4"/>
            <line x1="300" y1="20" x2="200" y2="120" stroke={colors.bgTertiary} strokeWidth="4"/>
            <line x1="100" y1="20" x2="300" y2="20" stroke={colors.bgTertiary} strokeWidth="6"/>
            {/* Swing seat */}
            <rect x="175" y="115" width="50" height="10" rx="3" fill="url(#swingGrad)"/>
            {/* Child figure */}
            <circle cx="200" cy="95" r="12" fill="#fcd9b6"/>
            <ellipse cx="200" cy="115" rx="8" ry="12" fill={colors.primary}/>
            {/* Push arrows */}
            <path d="M80 100 L60 100 M80 100 L70 95 M80 100 L70 105" stroke={colors.success} strokeWidth="3" fill="none"/>
            <text x="55" y="130" fill={colors.textSecondary} fontSize="11">Push?</text>
            {/* Question marks */}
            <text x="320" y="80" fill={colors.accent} fontSize="24" fontWeight="bold">?</text>
            <text x="340" y="110" fill={colors.accent} fontSize="18">?</text>
          </svg>
        </div>

        <div style={{
          padding: space.lg,
          background: colors.bgTertiary,
          borderRadius: radius.md,
          border: `1px solid ${colors.border}`,
          marginBottom: space.xl
        }}>
          <p style={{ fontSize: '15px', color: colors.textSecondary, margin: 0, lineHeight: 1.7 }}>
            You push a child on a swing. You can push at any rhythm you choose - fast, slow, or matching the swing&apos;s natural back-and-forth motion.
            <br/><br/>
            <strong style={{ color: colors.accent }}>Which pushing rhythm makes the swing go highest?</strong>
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: space.md,
          maxWidth: '560px',
          margin: '0 auto'
        }}>
          {[
            { id: 'A', label: 'Push as fast as possible for maximum energy input', icon: '⚡' },
            { id: 'B', label: 'Push very slowly for gentle, controlled motion', icon: '🐢' },
            { id: 'C', label: 'Match your pushes to the swing\'s natural frequency', icon: '🎯' },
            { id: 'D', label: 'Push at random times to keep the child guessing', icon: '🎲' }
          ].map(option => (
            <button
              key={option.id}
              onClick={() => {
                setPrediction(option.id);
                playSound(option.id === 'C' ? 'success' : 'click');
              }}
              style={{
                padding: `${space.lg} ${space.lg}`,
                minHeight: '44px',
                fontSize: '15px',
                fontWeight: prediction === option.id ? 700 : 500,
                color: prediction === option.id ? colors.textInverse : colors.textPrimary,
                background: prediction === option.id
                  ? option.id === 'C'
                    ? `linear-gradient(135deg, ${colors.success}, ${colors.successLight})`
                    : `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`
                  : colors.bgSecondary,
                border: `2px solid ${prediction === option.id ? (option.id === 'C' ? colors.success : colors.primary) : colors.border}`,
                borderRadius: radius.md,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: space.md,
                transition: 'all 0.2s ease',
                boxShadow: prediction === option.id ? shadows.md : 'none',
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: '28px' }}>{option.icon}</span>
              <span><strong>{option.id}.</strong> {option.label}</span>
            </button>
          ))}
        </div>

        {prediction && (
          <div style={{
            marginTop: space.xl,
            padding: space.lg,
            background: prediction === 'C' ? `${colors.success}15` : `${colors.accent}15`,
            borderRadius: radius.md,
            border: `1px solid ${prediction === 'C' ? colors.success : colors.accent}40`
          }}>
            <p style={{ fontSize: '15px', color: prediction === 'C' ? colors.success : colors.accent, margin: 0, fontWeight: 600 }}>
              {prediction === 'C'
                ? 'Correct! This is RESONANCE - maximum response when driving frequency matches natural frequency!'
                : 'Not quite! The answer is C - matching the natural frequency creates RESONANCE for maximum amplitude.'}
            </p>
          </div>
        )}
      </div>
      {renderBottomBar(() => goToPhase('play'), 'Test It!', !prediction)}
    </div>
  );

  // Play Phase - Simulation
  const renderPlay = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      background: colors.bgPrimary,
      overflow: 'hidden'
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, padding: isMobile ? space.md : space.lg, overflowY: 'auto', marginTop: '60px', marginBottom: '80px' }}>
        {renderSectionHeader('🔬', 'Forced Oscillation Lab', 'This is important because resonance affects bridges, radios, and instruments!')}

        <div style={{
          background: colors.bgSecondary,
          borderRadius: radius.lg,
          padding: space.lg,
          border: `1px solid ${colors.border}`,
          marginBottom: space.lg
        }}>
          {/* Simulation visualization */}
          <svg width="100%" height="280" viewBox="0 0 500 280" style={{ borderRadius: radius.md }} role="img" aria-label="Forced oscillation simulation showing spring-mass system">
            <defs>
              <linearGradient id="springGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={colors.accent}/>
                <stop offset="50%" stopColor={colors.accentLight}/>
                <stop offset="100%" stopColor={colors.accent}/>
              </linearGradient>
              <linearGradient id="massGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={isAtResonance ? colors.primaryLight : '#60a5fa'}/>
                <stop offset="100%" stopColor={isAtResonance ? colors.primaryDark : '#2563eb'}/>
              </linearGradient>
              <filter id="massGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Background */}
            <rect width="500" height="280" fill={colors.bgPrimary}/>

            {/* Ceiling */}
            <rect x="0" y="0" width="500" height="30" fill={colors.bgTertiary}/>
            <rect x="0" y="28" width="500" height="2" fill={colors.border}/>

            {/* Motor */}
            <circle cx="250" cy="18" r="12" fill={colors.primary}/>
            <circle cx="250" cy="18" r="8" fill={colors.bgPrimary}/>
            <line
              x1="250"
              y1="18"
              x2={250 + Math.cos(time * drivingFrequency * 5) * 8}
              y2={18 + Math.sin(time * drivingFrequency * 5) * 8}
              stroke={colors.accent}
              strokeWidth="3"
            />

            {/* Spring */}
            <path
              d={`M250 30 ${Array.from({length: 10}, (_, i) =>
                `Q ${220 + (i % 2) * 60} ${38 + i * (80 + displacement * 0.4) / 10}, 250 ${44 + (i + 1) * (80 + displacement * 0.4) / 10}`
              ).join(' ')}`}
              stroke="url(#springGrad)"
              strokeWidth="4"
              fill="none"
            />

            {/* Mass */}
            <g filter={isAtResonance ? "url(#massGlow)" : undefined}>
              <rect
                x="210"
                y={120 + displacement * 0.5}
                width="80"
                height="50"
                rx="8"
                fill="url(#massGrad)"
              />
              <rect
                x="215"
                y={125 + displacement * 0.5}
                width="70"
                height="15"
                rx="4"
                fill="white"
                opacity="0.15"
              />
            </g>

            {/* Resonance indicator */}
            {isAtResonance && (
              <g>
                <circle cx="450" cy="50" r="15" fill={colors.primary} opacity="0.3">
                  <animate attributeName="r" values="12;18;12" dur="0.5s" repeatCount="indefinite"/>
                </circle>
                <text x="450" y="55" textAnchor="middle" fill={colors.primary} fontSize="12" fontWeight="bold">!</text>
              </g>
            )}

            {/* Amplitude response graph */}
            <g transform="translate(20, 50)">
              <rect x="0" y="0" width="120" height="140" fill={colors.bgSecondary} rx="6" stroke={colors.border}/>

              {/* Grid */}
              {[0, 1, 2, 3, 4].map(i => (
                <line key={`h${i}`} x1="10" y1={20 + i * 25} x2="110" y2={20 + i * 25} stroke={colors.border} strokeWidth="0.5"/>
              ))}

              {/* Resonance curve */}
              <path
                d={`M15 120 ${Array.from({length: 90}, (_, i) => {
                  const omega = (i / 90) * 2;
                  const A = 1 / Math.sqrt(Math.pow(1 - omega * omega, 2) + Math.pow(2 * 0.1 * omega, 2));
                  const y = 120 - Math.min(A * 18, 100);
                  return `L${15 + i} ${y}`;
                }).join(' ')}`}
                stroke={colors.primary}
                strokeWidth="2"
                fill="none"
              />

              {/* Current position indicator */}
              <line
                x1={15 + drivingFrequency * 45}
                y1="15"
                x2={15 + drivingFrequency * 45}
                y2="125"
                stroke={colors.accent}
                strokeWidth="2"
                strokeDasharray="4 2"
              />
              <circle
                cx={15 + drivingFrequency * 45}
                cy={120 - Math.min(amplitude * 18, 100)}
                r="5"
                fill={colors.accent}
              />
            </g>

            {/* Equilibrium line */}
            <line x1="150" y1="145" x2="350" y2="145" stroke={colors.border} strokeWidth="1" strokeDasharray="8 4"/>
          </svg>

          {/* Labels */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: `${space.sm} ${space.md}`,
            marginTop: space.sm
          }}>
            <span style={{ fontSize: typo.small, color: colors.textTertiary }}>Amplitude Response</span>
            <span style={{
              fontSize: typo.body,
              color: isAtResonance ? colors.primary : colors.textPrimary,
              fontWeight: 700
            }}>
              {isAtResonance ? 'RESONANCE!' : 'Forced Oscillation'}
            </span>
            <span style={{ fontSize: typo.small, color: colors.textTertiary }}>
              Amplitude: <strong style={{ color: colors.textPrimary }}>{amplitude.toFixed(1)}x</strong>
            </span>
          </div>

          {/* Controls */}
          <div style={{ marginTop: space.lg }}>
            <div style={{ marginBottom: space.md }}>
              <label style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: typo.small,
                color: colors.textSecondary,
                marginBottom: space.sm
              }}>
                <span>Driving Frequency (w/w0):</span>
                <span style={{ color: getFrequencyColor(drivingFrequency), fontWeight: 700 }}>
                  {drivingFrequency.toFixed(2)} - {getFrequencyLabel(drivingFrequency)}
                </span>
              </label>
              <input
                type="range"
                min="0.2"
                max="2.0"
                step="0.05"
                value={drivingFrequency}
                onChange={(e) => setDrivingFrequency(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: colors.primary }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: typo.label,
                color: colors.textTertiary,
                marginTop: space.xs
              }}>
                <span>Low w</span>
                <span>w = w0 (Resonance)</span>
                <span>High w</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: space.md }}>
              <button
                onClick={() => isAnimating ? stopSimulation() : startSimulation()}
                style={{
                  flex: 1,
                  padding: space.md,
                  minHeight: '44px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: colors.textPrimary,
                  background: isAnimating
                    ? `linear-gradient(135deg, ${colors.danger}, #dc2626)`
                    : `linear-gradient(135deg, ${colors.success}, ${colors.successLight})`,
                  border: 'none',
                  borderRadius: radius.md,
                  cursor: 'pointer'
                }}
              >
                {isAnimating ? 'Stop' : 'Start Driving'}
              </button>
              <div style={{
                flex: 1,
                padding: space.md,
                background: colors.bgTertiary,
                borderRadius: radius.md,
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: isAtResonance ? colors.primary : colors.textPrimary
                }}>
                  {amplitude.toFixed(1)}x
                </div>
                <div style={{ fontSize: typo.label, color: colors.textTertiary }}>Amplitude</div>
              </div>
            </div>
          </div>
        </div>

        {/* Physics explanation */}
        <div style={{
          background: colors.bgSecondary,
          borderRadius: radius.md,
          padding: space.lg,
          border: `1px solid ${colors.border}`
        }}>
          <h3 style={{ fontSize: typo.body, color: colors.primary, marginBottom: space.md, fontWeight: 700 }}>
            Resonance Physics:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm }}>
            {[
              { condition: 'w < w0', label: 'Below resonance:', desc: 'Mass follows driving force in phase. Low amplitude.', active: drivingFrequency < 0.85, color: colors.accent },
              { condition: 'w ~ w0', label: 'At resonance:', desc: 'Maximum energy transfer! Amplitude peaks dramatically.', active: Math.abs(drivingFrequency - 1.0) < 0.15, color: colors.primary },
              { condition: 'w > w0', label: 'Above resonance:', desc: 'Mass moves opposite to driving force. Amplitude drops.', active: drivingFrequency > 1.15, color: colors.secondary }
            ].map((item, idx) => (
              <div key={idx} style={{
                padding: space.md,
                background: item.active ? `${item.color}20` : colors.bgTertiary,
                borderRadius: radius.sm,
                border: `1px solid ${item.active ? item.color : 'transparent'}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: space.md
              }}>
                <span style={{
                  padding: `${space.xs} ${space.sm}`,
                  background: item.color,
                  color: colors.textInverse,
                  borderRadius: radius.sm,
                  fontSize: typo.label,
                  fontWeight: 700,
                  whiteSpace: 'nowrap'
                }}>
                  {item.condition}
                </span>
                <p style={{ fontSize: typo.small, color: colors.textSecondary, margin: 0 }}>
                  <strong style={{ color: colors.textPrimary }}>{item.label}</strong> {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      {renderBottomBar(() => goToPhase('review'), 'See Analysis')}
    </div>
  );

  // Review Phase
  const renderReview = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      background: colors.bgPrimary
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, padding: isMobile ? space.lg : space.xl, overflowY: 'auto' }}>
        {renderSectionHeader('📚', 'Understanding Forced Oscillations', 'The physics behind resonance')}

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: space.md,
          marginBottom: space.xl
        }}>
          <div style={{
            padding: space.lg,
            background: `linear-gradient(135deg, ${colors.primary}15, ${colors.primary}05)`,
            borderRadius: radius.md,
            border: `1px solid ${colors.primary}30`
          }}>
            <h4 style={{ fontSize: '15px', color: colors.primary, marginBottom: space.md, fontWeight: 700 }}>
              The Equation of Motion
            </h4>
            <div style={{
              padding: space.md,
              background: colors.bgPrimary,
              borderRadius: radius.sm,
              fontFamily: 'monospace',
              fontSize: typo.small,
              color: colors.textPrimary,
              textAlign: 'center',
              marginBottom: space.md
            }}>
              m(d2x/dt2) + c(dx/dt) + kx = F0*cos(wt)
            </div>
            <ul style={{ margin: 0, paddingLeft: space.lg, color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.8 }}>
              <li>Left side: The oscillator (mass, damping, spring)</li>
              <li>Right side: External driving force at frequency w</li>
              <li>Natural frequency: <strong style={{ color: colors.textPrimary }}>w0 = sqrt(k/m)</strong></li>
            </ul>
          </div>

          <div style={{
            padding: space.lg,
            background: `linear-gradient(135deg, ${colors.secondary}15, ${colors.secondary}05)`,
            borderRadius: radius.md,
            border: `1px solid ${colors.secondary}30`
          }}>
            <h4 style={{ fontSize: '15px', color: colors.secondary, marginBottom: space.md, fontWeight: 700 }}>
              Amplitude Response
            </h4>
            <div style={{
              padding: space.md,
              background: colors.bgPrimary,
              borderRadius: radius.sm,
              fontFamily: 'monospace',
              fontSize: typo.small,
              color: colors.textPrimary,
              textAlign: 'center',
              marginBottom: space.md
            }}>
              A = F0 / sqrt[(k-mw2)2 + (cw)2]
            </div>
            <ul style={{ margin: 0, paddingLeft: space.lg, color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.8 }}>
              <li>Peak amplitude when w ~ w0</li>
              <li>Higher damping reduces peak and broadens it</li>
              <li>At resonance: Amax ~ F0/(c*w0)</li>
            </ul>
          </div>
        </div>

        <div style={{
          padding: space.lg,
          background: colors.bgSecondary,
          borderRadius: radius.md,
          border: `1px solid ${colors.border}`
        }}>
          <h4 style={{ fontSize: '15px', color: colors.success, marginBottom: space.md, fontWeight: 700 }}>
            Why Resonance is Powerful
          </h4>
          <p style={{ fontSize: typo.body, color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
            <strong style={{ color: colors.textPrimary }}>Energy accumulation:</strong> At resonance, each driving cycle adds energy at exactly the right moment (in phase with velocity). The Quality Factor Q measures how sharp the resonance is - high Q means narrow, tall peaks. This is why a singer must hit exactly the right note - glass has high Q, so only one precise frequency causes resonance!
          </p>
        </div>

        {renderKeyTakeaway('Resonance occurs when driving frequency matches natural frequency, causing maximum amplitude. The sharpness of resonance is determined by damping - less damping means sharper, more dangerous resonance peaks.')}
      </div>
      {renderBottomBar(() => goToPhase('twist_predict'), 'Discover the Twist')}
    </div>
  );

  // Twist Predict Phase
  const renderTwistPredict = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      background: colors.bgPrimary
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, padding: isMobile ? space.lg : space.xl, overflowY: 'auto' }}>
        {renderSectionHeader('🌀', 'The Twist Challenge', 'A surprising source of periodic force')}

        <div style={{
          padding: space.lg,
          background: colors.bgTertiary,
          borderRadius: radius.md,
          border: `1px solid ${colors.border}`,
          marginBottom: space.xl
        }}>
          <p style={{ fontSize: '15px', color: colors.textSecondary, margin: 0, lineHeight: 1.7 }}>
            The Tacoma Narrows Bridge collapsed spectacularly in 1940, twisting and oscillating in moderate winds (about 40 mph) - not even a storm!
            <br/><br/>
            <strong style={{ color: colors.accent }}>The wind was steady, not gusting. How did steady wind cause oscillations?</strong>
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: space.md,
          maxWidth: '560px',
          margin: '0 auto'
        }}>
          {[
            { id: 'A', label: 'The wind was simply too strong for the bridge design', icon: '💨' },
            { id: 'B', label: 'Vortex shedding created periodic forces at the bridge\'s resonant frequency', icon: '🌀' },
            { id: 'C', label: 'An earthquake happened at the same time', icon: '🌍' },
            { id: 'D', label: 'Truck traffic caused the vibrations', icon: '🚛' }
          ].map(option => (
            <button
              key={option.id}
              onClick={() => {
                setTwistPrediction(option.id);
                playSound(option.id === 'B' ? 'success' : 'click');
              }}
              style={{
                padding: `${space.lg} ${space.lg}`,
                fontSize: '15px',
                fontWeight: twistPrediction === option.id ? 700 : 500,
                color: twistPrediction === option.id ? colors.textInverse : colors.textPrimary,
                background: twistPrediction === option.id
                  ? option.id === 'B'
                    ? `linear-gradient(135deg, ${colors.success}, ${colors.successLight})`
                    : `linear-gradient(135deg, ${colors.secondary}, ${colors.secondaryLight})`
                  : colors.bgSecondary,
                border: `2px solid ${twistPrediction === option.id ? (option.id === 'B' ? colors.success : colors.secondary) : colors.border}`,
                borderRadius: radius.md,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: space.md,
                transition: 'all 0.2s ease',
                zIndex: 10,
                position: 'relative'
              }}
            >
              <span style={{ fontSize: '28px' }}>{option.icon}</span>
              <span><strong>{option.id}.</strong> {option.label}</span>
            </button>
          ))}
        </div>

        {twistPrediction && (
          <div style={{
            marginTop: space.xl,
            padding: space.lg,
            background: twistPrediction === 'B' ? `${colors.success}15` : `${colors.accent}15`,
            borderRadius: radius.md,
            border: `1px solid ${twistPrediction === 'B' ? colors.success : colors.accent}40`
          }}>
            <p style={{ fontSize: '15px', color: twistPrediction === 'B' ? colors.success : colors.accent, margin: 0, fontWeight: 600 }}>
              {twistPrediction === 'B'
                ? 'Correct! Vortex shedding turned steady wind into a periodic driving force!'
                : 'The answer is B - vortex shedding created periodic forces that matched the bridge\'s natural frequency.'}
            </p>
          </div>
        )}
      </div>
      {renderBottomBar(() => goToPhase('twist_play'), 'See How It Happens', !twistPrediction)}
    </div>
  );

  // Twist Play Phase
  const renderTwistPlay = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      background: colors.bgPrimary
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, padding: isMobile ? space.md : space.lg, overflowY: 'auto' }}>
        {renderSectionHeader('🔬', 'Vortex-Induced Vibration', 'How steady flow creates periodic forces')}

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: space.lg,
          marginBottom: space.lg
        }}>
          <div style={{
            background: colors.bgSecondary,
            borderRadius: radius.md,
            padding: space.lg,
            border: `1px solid ${colors.border}`
          }}>
            <h3 style={{ fontSize: typo.body, color: colors.accent, marginBottom: space.md, fontWeight: 700, textAlign: 'center' }}>
              Vortex Shedding
            </h3>
            <svg width="100%" height="120" viewBox="0 0 200 120">
              {/* Wind arrows */}
              {[0, 1, 2].map(i => (
                <g key={i}>
                  <line x1="10" y1={40 + i * 20} x2="30" y2={40 + i * 20} stroke={colors.accent} strokeWidth="2"/>
                  <polygon points="30,37 30,43 38,40" fill={colors.accent} transform={`translate(0, ${i * 20})`}/>
                </g>
              ))}

              {/* Bridge section */}
              <rect x="50" y="30" width="20" height="60" rx="10" fill={colors.bgTertiary}/>

              {/* Vortices */}
              <ellipse cx="95" cy="45" rx="15" ry="12" fill="none" stroke={colors.primary} strokeWidth="2" strokeDasharray="4"/>
              <ellipse cx="95" cy="75" rx="15" ry="12" fill="none" stroke={colors.accent} strokeWidth="2" strokeDasharray="4"/>
              <ellipse cx="140" cy="50" rx="12" ry="10" fill="none" stroke={colors.accent} strokeWidth="2" strokeDasharray="4"/>
              <ellipse cx="140" cy="70" rx="12" ry="10" fill="none" stroke={colors.primary} strokeWidth="2" strokeDasharray="4"/>

              <text x="100" y="110" textAnchor="middle" fill={colors.textTertiary} fontSize="10">
                Alternating pressure = periodic force
              </text>
            </svg>
          </div>

          <div style={{
            background: colors.bgSecondary,
            borderRadius: radius.md,
            padding: space.lg,
            border: `1px solid ${colors.border}`
          }}>
            <h3 style={{ fontSize: typo.body, color: colors.primary, marginBottom: space.md, fontWeight: 700, textAlign: 'center' }}>
              Resonance Buildup
            </h3>
            <svg width="100%" height="120" viewBox="0 0 200 120">
              {/* Growing oscillation */}
              <path
                d="M20 60 Q40 30, 60 60 Q80 90, 100 60 Q120 20, 140 60 Q160 100, 180 60"
                fill="none"
                stroke={colors.primary}
                strokeWidth="2"
              />

              {/* Amplitude envelope */}
              <path d="M20 60 Q100 10, 180 30" fill="none" stroke={colors.accent} strokeWidth="1" strokeDasharray="4"/>
              <path d="M20 60 Q100 110, 180 90" fill="none" stroke={colors.accent} strokeWidth="1" strokeDasharray="4"/>

              <text x="100" y="20" textAnchor="middle" fill={colors.accent} fontSize="10">Amplitude grows!</text>
              <text x="100" y="110" textAnchor="middle" fill={colors.textTertiary} fontSize="10">Time</text>
            </svg>
          </div>
        </div>

        <div style={{
          background: `linear-gradient(135deg, ${colors.secondary}15, ${colors.secondary}05)`,
          borderRadius: radius.md,
          padding: space.lg,
          border: `1px solid ${colors.secondary}30`
        }}>
          <h3 style={{ fontSize: typo.body, color: colors.secondary, marginBottom: space.md, fontWeight: 700 }}>
            The Strouhal Number:
          </h3>
          <div style={{
            padding: space.md,
            background: colors.bgPrimary,
            borderRadius: radius.sm,
            fontFamily: 'monospace',
            fontSize: typo.body,
            color: colors.textPrimary,
            textAlign: 'center',
            marginBottom: space.md
          }}>
            f = St * V / D
          </div>
          <ul style={{ margin: 0, paddingLeft: space.lg, color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.8 }}>
            <li><strong style={{ color: colors.textPrimary }}>f</strong> = vortex shedding frequency</li>
            <li><strong style={{ color: colors.textPrimary }}>St ~ 0.2</strong> for cylinders (Strouhal number)</li>
            <li><strong style={{ color: colors.textPrimary }}>V</strong> = wind velocity</li>
            <li><strong style={{ color: colors.textPrimary }}>D</strong> = characteristic dimension</li>
          </ul>
          <p style={{ fontSize: typo.small, color: colors.primary, marginTop: space.md, marginBottom: 0, fontWeight: 600 }}>
            At Tacoma Narrows, 40 mph wind created vortices at ~0.2 Hz - matching the bridge&apos;s torsional natural frequency exactly!
          </p>
        </div>
      </div>
      {renderBottomBar(() => goToPhase('twist_review'), 'Review Discovery')}
    </div>
  );

  // Twist Review Phase
  const renderTwistReview = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      background: colors.bgPrimary
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, padding: isMobile ? space.lg : space.xl, overflowY: 'auto' }}>
        {renderSectionHeader('💡', 'Key Discovery', 'Resonance can be hidden!')}

        <div style={{
          padding: space.xl,
          background: `linear-gradient(135deg, ${colors.secondary}15, ${colors.secondary}05)`,
          borderRadius: radius.lg,
          border: `1px solid ${colors.secondary}40`,
          marginBottom: space.xl
        }}>
          <h3 style={{ fontSize: typo.heading, color: colors.secondary, marginBottom: space.lg, fontWeight: 700 }}>
            Even Steady Forces Can Cause Resonance!
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: space.md
          }}>
            <div style={{
              padding: space.lg,
              background: colors.bgSecondary,
              borderRadius: radius.md
            }}>
              <h4 style={{ fontSize: typo.body, color: colors.primary, marginBottom: space.md, fontWeight: 700 }}>
                Hidden Periodic Forces:
              </h4>
              <ul style={{ margin: 0, paddingLeft: space.lg, color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.8 }}>
                <li>Vortex shedding from wind</li>
                <li>Rotating machinery imbalance</li>
                <li>Synchronized walking/marching</li>
                <li>Electrical grid frequency (50/60 Hz)</li>
              </ul>
            </div>

            <div style={{
              padding: space.lg,
              background: colors.bgSecondary,
              borderRadius: radius.md
            }}>
              <h4 style={{ fontSize: typo.body, color: colors.success, marginBottom: space.md, fontWeight: 700 }}>
                Prevention Methods:
              </h4>
              <ul style={{ margin: 0, paddingLeft: space.lg, color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.8 }}>
                <li>Add damping to reduce peak</li>
                <li>Detune natural frequency</li>
                <li>Break up vortex patterns</li>
                <li>Active vibration control</li>
              </ul>
            </div>
          </div>
        </div>

        <div style={{
          padding: space.lg,
          background: colors.bgSecondary,
          borderRadius: radius.md,
          border: `1px solid ${colors.border}`
        }}>
          <h4 style={{ fontSize: typo.body, color: colors.accent, marginBottom: space.md, fontWeight: 700 }}>
            The Q Factor (Quality Factor):
          </h4>
          <p style={{ fontSize: typo.small, color: colors.textSecondary, marginBottom: space.md }}>
            Q measures how &quot;sharp&quot; the resonance peak is:
          </p>
          <div style={{
            padding: space.md,
            background: colors.bgTertiary,
            borderRadius: radius.sm,
            fontFamily: 'monospace',
            textAlign: 'center',
            marginBottom: space.md
          }}>
            <span style={{ color: colors.textPrimary }}>Q = w0 / (damping bandwidth)</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: space.lg, color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.8 }}>
            <li><strong style={{ color: colors.textPrimary }}>High Q (1000+):</strong> Very sharp peak, dangerous for bridges/glass</li>
            <li><strong style={{ color: colors.textPrimary }}>Low Q (10-100):</strong> Broad peak, safer but less selective</li>
          </ul>
        </div>

        {renderKeyTakeaway('Engineers must always ask: "What periodic forces might my system encounter?" Even steady flows can create oscillating forces through vortex shedding or other mechanisms.')}
      </div>
      {renderBottomBar(() => goToPhase('transfer'), 'See Real Applications')}
    </div>
  );

  // Transfer Phase - Real-World Applications
  const renderTransfer = () => {
    const app = realWorldApps[activeApp];
    const canTakeQuiz = completedApps.size >= realWorldApps.length;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: colors.bgPrimary
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: isMobile ? space.md : space.lg, overflowY: 'auto' }}>
          {renderSectionHeader('🌍', 'Real-World Applications', 'Resonance engineering in everyday life')}

          {/* Progress indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: space.sm,
            marginBottom: space.md
          }}>
            <span style={{ fontSize: '13px', color: colors.textSecondary }}>
              {completedApps.size} of {realWorldApps.length} completed
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {realWorldApps.map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: completedApps.has(idx) ? colors.success : idx === activeApp ? colors.primary : colors.bgTertiary,
                    transition: 'background 0.3s ease'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Tab navigation */}
          <div style={{
            display: 'flex',
            gap: space.sm,
            marginBottom: space.lg,
            overflowX: 'auto',
            paddingBottom: space.sm
          }}>
            {realWorldApps.map((a, idx) => {
              const isCompleted = completedApps.has(idx);
              const isCurrent = idx === activeApp;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveApp(idx)}
                  style={{
                    padding: `${space.md} ${space.lg}`,
                    fontSize: '14px',
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? colors.textInverse : isCompleted ? colors.success : colors.textSecondary,
                    background: isCurrent
                      ? `linear-gradient(135deg, ${a.color}, ${a.color}dd)`
                      : isCompleted ? `${colors.success}15` : colors.bgSecondary,
                    border: `1px solid ${isCurrent ? a.color : isCompleted ? colors.success : colors.border}`,
                    borderRadius: radius.sm,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  {isCompleted ? '✓ ' : ''}{a.icon} {a.short}
                </button>
              );
            })}
          </div>

          {/* Application content card */}
          <div style={{
            background: colors.bgSecondary,
            borderRadius: radius.lg,
            border: `1px solid ${colors.border}`,
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: space.xl,
              background: `linear-gradient(135deg, ${app.color}20, transparent)`,
              borderBottom: `1px solid ${colors.border}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: space.lg, marginBottom: space.md }}>
                <span style={{ fontSize: '56px' }}>{app.icon}</span>
                <div>
                  <h3 style={{ fontSize: '24px', color: colors.textPrimary, margin: 0, fontWeight: 800 }}>
                    {app.title}
                  </h3>
                  <p style={{ fontSize: '16px', color: app.color, margin: `${space.xs} 0 0`, fontWeight: 600 }}>
                    {app.tagline}
                  </p>
                </div>
              </div>
              <p style={{ fontSize: '15px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
                {app.description}
              </p>
            </div>

            {/* Connection */}
            <div style={{ padding: `${space.lg} ${space.xl}`, borderBottom: `1px solid ${colors.border}` }}>
              <h4 style={{ fontSize: '14px', color: app.color, marginBottom: space.sm, fontWeight: 700 }}>
                Connection to Resonance
              </h4>
              <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            {/* How it works */}
            <div style={{ padding: `${space.lg} ${space.xl}`, borderBottom: `1px solid ${colors.border}` }}>
              <h4 style={{ fontSize: '14px', color: colors.textPrimary, marginBottom: space.sm, fontWeight: 700 }}>
                How It Works
              </h4>
              <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
                {app.howItWorks}
              </p>
            </div>

            {/* Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1px',
              background: colors.border
            }}>
              {app.stats.map((stat, idx) => (
                <div key={idx} style={{
                  padding: space.lg,
                  background: colors.bgTertiary,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '28px', marginBottom: space.xs }}>{stat.icon}</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: app.color }}>{stat.value}</div>
                  <div style={{ fontSize: '12px', color: colors.textTertiary, fontWeight: 500 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Examples */}
            <div style={{ padding: `${space.lg} ${space.xl}`, borderTop: `1px solid ${colors.border}` }}>
              <h4 style={{ fontSize: '14px', color: colors.textPrimary, marginBottom: space.md, fontWeight: 700 }}>
                Examples
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: space.sm }}>
                {app.examples.map((ex, idx) => (
                  <span key={idx} style={{
                    padding: `${space.sm} ${space.md}`,
                    fontSize: '13px',
                    color: colors.textSecondary,
                    background: colors.bgPrimary,
                    borderRadius: radius.full,
                    border: `1px solid ${colors.border}`
                  }}>
                    {ex}
                  </span>
                ))}
              </div>
            </div>

            {/* Companies */}
            <div style={{
              padding: `${space.md} ${space.xl}`,
              background: colors.bgTertiary,
              display: 'flex',
              alignItems: 'center',
              gap: space.sm,
              flexWrap: 'wrap'
            }}>
              <span style={{ fontSize: '12px', color: colors.textTertiary, fontWeight: 500 }}>Key players:</span>
              {app.companies.map((company, idx) => (
                <span key={idx} style={{
                  padding: `${space.xs} ${space.md}`,
                  fontSize: '12px',
                  color: colors.textSecondary,
                  background: colors.bgSecondary,
                  borderRadius: radius.sm,
                  border: `1px solid ${colors.border}`
                }}>
                  {company}
                </span>
              ))}
            </div>

            {/* Future Impact */}
            <div style={{ padding: `${space.lg} ${space.xl}`, borderTop: `1px solid ${colors.border}` }}>
              <h4 style={{ fontSize: '14px', color: colors.secondary, marginBottom: space.sm, fontWeight: 700 }}>
                Future Impact
              </h4>
              <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
                {app.futureImpact}
              </p>
            </div>

            {/* Mark as Read Button */}
            <div style={{ padding: space.lg, borderTop: `1px solid ${colors.border}` }}>
              {!completedApps.has(activeApp) ? (
                <button
                  onClick={() => {
                    const newCompleted = new Set(completedApps);
                    newCompleted.add(activeApp);
                    setCompletedApps(newCompleted);
                    playSound('success');
                    if (activeApp < realWorldApps.length - 1) {
                      setTimeout(() => setActiveApp(activeApp + 1), 300);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: space.lg,
                    fontSize: '15px',
                    fontWeight: 600,
                    color: colors.textInverse,
                    background: colors.success,
                    border: 'none',
                    borderRadius: radius.md,
                    cursor: 'pointer',
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  Mark &quot;{app.title}&quot; as Read
                </button>
              ) : (
                <div style={{
                  padding: space.lg,
                  background: `${colors.success}15`,
                  borderRadius: radius.md,
                  border: `1px solid ${colors.success}40`,
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '15px', color: colors.success, fontWeight: 600 }}>
                    Completed
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          padding: `${space.lg} ${space.xl}`,
          background: colors.bgSecondary,
          borderTop: `1px solid ${colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={() => goToPhase('twist_review')}
            style={{
              padding: `${space.md} ${space.xl}`,
              fontSize: '14px',
              color: colors.textSecondary,
              background: 'transparent',
              border: 'none',
              borderRadius: radius.md,
              cursor: 'pointer',
              zIndex: 10,
              position: 'relative'
            }}
          >
            Back
          </button>
          {canTakeQuiz ? (
            <button
              onClick={() => goToPhase('test')}
              style={{
                padding: `${space.md} ${space.xxl}`,
                fontSize: '15px',
                fontWeight: 600,
                color: colors.textInverse,
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                border: 'none',
                borderRadius: radius.md,
                cursor: 'pointer',
                boxShadow: shadows.sm,
                zIndex: 10,
                position: 'relative'
              }}
            >
              Take the Quiz
            </button>
          ) : (
            <div style={{
              padding: `${space.md} ${space.xl}`,
              fontSize: '14px',
              color: colors.textTertiary,
              background: colors.bgTertiary,
              borderRadius: radius.md
            }}>
              Complete all applications to unlock quiz
            </div>
          )}
        </div>
      </div>
    );
  };

  // Test Phase
  const renderTest = () => {
    const currentQ = testQuestions[currentQuestionIndex];
    const answeredCount = testAnswers.filter(a => a !== null).length;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: colors.bgPrimary
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: isMobile ? space.md : space.lg, overflowY: 'auto' }}>
          {!showTestResults ? (
            <>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: space.lg
              }}>
                <h2 style={{ fontSize: '22px', color: colors.textPrimary, margin: 0, fontWeight: 800 }}>
                  Knowledge Check
                </h2>
                <span style={{
                  padding: `${space.sm} ${space.md}`,
                  fontSize: '14px',
                  fontWeight: 600,
                  color: colors.textSecondary,
                  background: colors.bgSecondary,
                  borderRadius: radius.full
                }}>
                  {currentQuestionIndex + 1} / {testQuestions.length}
                </span>
              </div>

              {renderNavDots()}

              {/* Scenario */}
              <div style={{
                padding: space.lg,
                background: colors.bgTertiary,
                borderRadius: radius.md,
                marginBottom: space.md,
                borderLeft: `4px solid ${colors.accent}`
              }}>
                <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0, fontStyle: 'italic', lineHeight: 1.6 }}>
                  {currentQ.scenario}
                </p>
              </div>

              {/* Question */}
              <div style={{
                padding: space.lg,
                background: colors.bgSecondary,
                borderRadius: radius.md,
                border: `1px solid ${colors.border}`,
                marginBottom: space.md
              }}>
                <p style={{ fontSize: '16px', color: colors.textPrimary, margin: 0, fontWeight: 600, lineHeight: 1.5 }}>
                  {currentQ.question}
                </p>
              </div>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm }}>
                {currentQ.options.map((option, idx) => {
                  const isSelected = testAnswers[currentQuestionIndex] === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        const newAnswers = [...testAnswers];
                        newAnswers[currentQuestionIndex] = idx;
                        setTestAnswers(newAnswers);
                        playSound('click');
                      }}
                      style={{
                        padding: `${space.md} ${space.lg}`,
                        fontSize: '14px',
                        fontWeight: isSelected ? 600 : 400,
                        color: isSelected ? colors.textInverse : colors.textPrimary,
                        background: isSelected
                          ? `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`
                          : colors.bgSecondary,
                        border: `2px solid ${isSelected ? colors.primary : colors.border}`,
                        borderRadius: radius.md,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: space.md,
                        zIndex: 10,
                        position: 'relative'
                      }}
                    >
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        borderRadius: radius.full,
                        background: isSelected ? colors.bgPrimary : colors.bgTertiary,
                        color: isSelected ? colors.primary : colors.textTertiary,
                        fontSize: '13px',
                        fontWeight: 700,
                        flexShrink: 0
                      }}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span style={{ lineHeight: 1.4 }}>{option.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: space.xl,
                gap: space.md
              }}>
                <button
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  style={{
                    padding: `${space.md} ${space.lg}`,
                    fontSize: '14px',
                    fontWeight: 600,
                    color: currentQuestionIndex === 0 ? colors.textTertiary : colors.textPrimary,
                    background: colors.bgSecondary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.sm,
                    cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
                    opacity: currentQuestionIndex === 0 ? 0.5 : 1,
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  Previous
                </button>

                {currentQuestionIndex < testQuestions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                    style={{
                      padding: `${space.md} ${space.lg}`,
                      fontSize: '14px',
                      fontWeight: 600,
                      color: colors.textPrimary,
                      background: colors.bgSecondary,
                      border: `1px solid ${colors.border}`,
                      borderRadius: radius.sm,
                      cursor: 'pointer',
                      zIndex: 10,
                      position: 'relative'
                    }}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowTestResults(true);
                      playSound('complete');
                      emitEvent('test_completed', { score: testAnswers.reduce((acc, ans, idx) =>
                        acc + (testQuestions[idx].options[ans as number]?.correct ? 1 : 0), 0)
                      });
                    }}
                    disabled={answeredCount < testQuestions.length}
                    style={{
                      padding: `${space.md} ${space.xl}`,
                      fontSize: '14px',
                      fontWeight: 700,
                      color: answeredCount < testQuestions.length ? colors.textTertiary : colors.textInverse,
                      background: answeredCount < testQuestions.length
                        ? colors.bgTertiary
                        : `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                      border: 'none',
                      borderRadius: radius.sm,
                      cursor: answeredCount < testQuestions.length ? 'not-allowed' : 'pointer',
                      boxShadow: answeredCount >= testQuestions.length ? shadows.sm : 'none',
                      zIndex: 10,
                      position: 'relative'
                    }}
                  >
                    Submit ({answeredCount}/{testQuestions.length})
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Test Results */}
              {renderSectionHeader('📊', 'Quiz Results', 'Review your answers and learn from any mistakes')}

              {(() => {
                const score = testAnswers.reduce((acc, answer, idx) =>
                  acc + (testQuestions[idx].options[answer as number]?.correct ? 1 : 0), 0);
                const percentage = Math.round((score / testQuestions.length) * 100);

                return (
                  <>
                    <div style={{
                      padding: space.xl,
                      background: percentage >= 70
                        ? `linear-gradient(135deg, ${colors.success}15, ${colors.success}05)`
                        : `linear-gradient(135deg, ${colors.warning}15, ${colors.warning}05)`,
                      borderRadius: radius.lg,
                      border: `1px solid ${percentage >= 70 ? colors.success : colors.warning}40`,
                      textAlign: 'center',
                      marginBottom: space.xl
                    }}>
                      <div style={{ fontSize: '56px', fontWeight: 800, color: percentage >= 70 ? colors.success : colors.warning }}>
                        {percentage}%
                      </div>
                      <p style={{ fontSize: '18px', color: colors.textPrimary, margin: `${space.sm} 0 0`, fontWeight: 600 }}>
                        {score} out of {testQuestions.length} correct
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: space.md }}>
                      {testQuestions.map((q, idx) => {
                        const isCorrect = q.options[testAnswers[idx] as number]?.correct;
                        return (
                          <div key={idx} style={{
                            padding: space.lg,
                            background: colors.bgSecondary,
                            borderRadius: radius.md,
                            border: `1px solid ${isCorrect ? colors.success : colors.danger}40`
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: space.md,
                              marginBottom: space.md
                            }}>
                              <span style={{
                                fontSize: '20px',
                                color: isCorrect ? colors.success : colors.danger,
                                fontWeight: 700
                              }}>
                                {isCorrect ? '✓' : '✗'}
                              </span>
                              <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '14px', color: colors.textPrimary, margin: 0, fontWeight: 600, lineHeight: 1.4 }}>
                                  Q{idx + 1}: {q.question}
                                </p>
                                {!isCorrect && (
                                  <p style={{ fontSize: '13px', color: colors.danger, margin: `${space.sm} 0 0` }}>
                                    Your answer: {q.options[testAnswers[idx] as number]?.text}
                                  </p>
                                )}
                                <p style={{ fontSize: '13px', color: colors.success, margin: `${space.xs} 0 0`, fontWeight: 500 }}>
                                  Correct: {q.options.find(o => o.correct)?.text}
                                </p>
                              </div>
                            </div>
                            <div style={{
                              padding: space.md,
                              background: colors.bgTertiary,
                              borderRadius: radius.sm,
                              fontSize: '13px',
                              color: colors.textSecondary,
                              lineHeight: 1.6
                            }}>
                              {q.explanation}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </>
          )}
        </div>
        {showTestResults && renderBottomBar(() => goToPhase('mastery'), 'Complete Module')}
      </div>
    );
  };

  // Mastery Phase
  const renderMastery = () => {
    const score = testAnswers.reduce((acc, answer, idx) =>
      acc + (testQuestions[idx].options[answer as number]?.correct ? 1 : 0), 0);

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: `radial-gradient(ellipse at top, ${colors.bgSecondary} 0%, ${colors.bgPrimary} 70%)`
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          padding: isMobile ? space.lg : space.xl,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          {/* Trophy icon */}
          <div style={{
            width: '120px',
            height: '120px',
            margin: '0 auto 32px',
            borderRadius: radius.full,
            background: `linear-gradient(135deg, ${colors.primary}20, ${colors.accent}20)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: shadows.glow(colors.primary),
            border: `2px solid ${colors.primary}30`
          }}>
            <span style={{ fontSize: '60px' }}>🏆</span>
          </div>

          <h1 style={{
            fontSize: isMobile ? '32px' : '40px',
            fontWeight: 800,
            color: colors.textPrimary,
            marginBottom: space.md,
            letterSpacing: '-1px'
          }}>
            Resonance Master!
          </h1>
          <p style={{
            fontSize: '18px',
            color: colors.textSecondary,
            maxWidth: '520px',
            lineHeight: 1.7,
            marginBottom: space.xl
          }}>
            You&apos;ve mastered forced oscillations and resonance! You now understand how frequency matching creates powerful amplification - from bridges to radios!
          </p>

          {/* Score */}
          <div style={{
            padding: space.lg,
            background: colors.bgSecondary,
            borderRadius: radius.lg,
            border: `1px solid ${colors.border}`,
            marginBottom: space.xl
          }}>
            <div style={{ fontSize: '36px', fontWeight: 800, color: colors.success }}>{score}/10</div>
            <div style={{ fontSize: typo.small, color: colors.textSecondary }}>Quiz Score</div>
          </div>

          {/* Achievement cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
            gap: space.md,
            width: '100%',
            maxWidth: '640px',
            marginBottom: space.xl
          }}>
            {[
              { icon: '🌉', label: 'Bridge Engineering', color: colors.primary },
              { icon: '📻', label: 'Radio Tuning', color: '#3b82f6' },
              { icon: '🎸', label: 'Musical Acoustics', color: colors.secondary },
              { icon: '🏢', label: 'Earthquake Design', color: colors.success }
            ].map((item, idx) => (
              <div key={idx} style={{
                padding: space.md,
                background: colors.bgSecondary,
                borderRadius: radius.md,
                border: `1px solid ${colors.border}`
              }}>
                <div style={{ fontSize: '32px', marginBottom: space.sm }}>{item.icon}</div>
                <div style={{ fontSize: '12px', color: item.color, fontWeight: 600 }}>{item.label}</div>
              </div>
            ))}
          </div>

          {renderKeyTakeaway('Resonance occurs when driving frequency matches natural frequency, causing maximum amplitude. This principle shapes engineering from skyscrapers to smartphones!')}

          {/* Restart button */}
          <button
            onClick={() => {
              setPrediction(null);
              setTwistPrediction(null);
              setCompletedApps(new Set());
              setTestAnswers(new Array(testQuestions.length).fill(null));
              setShowTestResults(false);
              setCurrentQuestionIndex(0);
              goToPhase('hook');
            }}
            style={{
              marginTop: space.xl,
              padding: `${space.md} ${space.xl}`,
              fontSize: '15px',
              fontWeight: 600,
              color: colors.textPrimary,
              background: colors.bgSecondary,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.md,
              cursor: 'pointer',
              zIndex: 10,
              position: 'relative'
            }}
          >
            Explore Again
          </button>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════

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
    <div style={{
      minHeight: '100vh',
      background: colors.bgPrimary,
      color: colors.textPrimary,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {renderPhase()}
    </div>
  );
};

export default ForcedOscillationsRenderer;
