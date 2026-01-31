'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// BEATS - Premium Apple/Airbnb Design System
// ============================================================================

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'parameter_changed'
  | 'twist_prediction_made'
  | 'app_explored'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved';

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

// Phase type for the game
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Observer Effect',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

interface BeatsRendererProps {
  width?: number;
  height?: number;
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// ============================================================================
// PREMIUM DESIGN TOKENS - Apple/Airbnb Quality
// ============================================================================
const design = {
  colors: {
    bgDeep: '#021210',
    bgPrimary: '#041a16',
    bgSecondary: '#0a2420',
    bgTertiary: '#0f302a',
    bgCard: '#0c2822',
    bgElevated: '#123830',
    bgHover: '#1a4840',
    textPrimary: '#f0fdfa',
    textSecondary: '#99f6e4',
    textMuted: '#5eead4',
    textDisabled: '#2dd4bf',
    accentPrimary: '#14b8a6',
    accentSecondary: '#2dd4bf',
    accentMuted: '#134e4a',
    accentGlow: 'rgba(20, 184, 166, 0.25)',
    cyan: '#06b6d4',
    cyanMuted: 'rgba(6, 182, 212, 0.2)',
    success: '#10b981',
    successMuted: 'rgba(16, 185, 129, 0.15)',
    error: '#ef4444',
    errorMuted: 'rgba(239, 68, 68, 0.15)',
    warning: '#f59e0b',
    border: '#1e4d44',
    borderLight: '#2a6058',
    borderFocus: '#14b8a6',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 },
  font: {
    sans: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
    mono: '"SF Mono", "Fira Code", monospace'
  },
  shadow: {
    sm: '0 2px 8px rgba(0,0,0,0.3)',
    md: '0 8px 24px rgba(0,0,0,0.4)',
    lg: '0 16px 48px rgba(0,0,0,0.5)',
    glow: (color: string) => `0 0 32px ${color}40`
  }
};


// ============================================================================
// MAIN COMPONENT
// ============================================================================
const BeatsRenderer: React.FC<BeatsRendererProps> = ({ onGameEvent, gamePhase }) => {
  // Navigation debouncing
  const navigationLockRef = useRef(false);

  // Phase state - use gamePhase from props if valid, otherwise default to 'hook'
  const [phase, setPhase] = useState<Phase>(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  });

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      console.log('[Beats] Syncing phase from prop:', gamePhase);
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  const [isMobile, setIsMobile] = useState(false);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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

  // Game state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [freq1, setFreq1] = useState(440);
  const [freq2, setFreq2] = useState(444);
  const [hasExperimented, setHasExperimented] = useState(false);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [testIndex, setTestIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [showResult, setShowResult] = useState(false);

  const animationRef = useRef<number>();

  // Animation loop
  useEffect(() => {
    let lastTime = performance.now();
    const animate = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      setTime(t => t + delta);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  // Web Audio API sound
  const playSound = useCallback((soundType: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    const soundConfig = {
      click: { frequency: 400, type: 'sine' as OscillatorType, duration: 0.1 },
      success: { frequency: 600, type: 'sine' as OscillatorType, duration: 0.15 },
      failure: { frequency: 200, type: 'square' as OscillatorType, duration: 0.2 },
      transition: { frequency: 480, type: 'sine' as OscillatorType, duration: 0.15 },
      complete: { frequency: 800, type: 'sine' as OscillatorType, duration: 0.3 }
    };
    const { frequency, type, duration } = soundConfig[soundType];
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch (e) { /* Audio not supported */ }
  }, []);

  // Emit game events
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    onGameEvent?.({ type, data });
  }, [onGameEvent]);

  // Navigation - simplified without debouncing
  const goToPhase = useCallback((newPhase: Phase) => {
    console.log('[Beats] goToPhase called with:', newPhase);
    if (!phaseOrder.includes(newPhase)) {
      console.log('[Beats] Invalid phase:', newPhase);
      return;
    }
    console.log('[Beats] Setting phase to:', newPhase);
    setPhase(newPhase);
    playSound('transition');
    emitEvent('phase_change', { from: phase, to: newPhase, phaseLabel: phaseLabels[newPhase] });
  }, [phase, playSound, emitEvent]);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) goToPhase(phaseOrder[currentIndex + 1]);
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) goToPhase(phaseOrder[currentIndex - 1]);
  }, [phase, goToPhase]);

  // Render button helper function - simplified without navigation lock
  const renderButton = (
    label: string,
    onClickHandler: () => void,
    variant: 'primary' | 'secondary' | 'ghost' | 'success' = 'primary',
    disabled = false,
    size: 'sm' | 'md' | 'lg' = 'md'
  ) => {
    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: { padding: '10px 18px', fontSize: '13px' },
      md: { padding: '14px 28px', fontSize: '15px' },
      lg: { padding: '18px 36px', fontSize: '17px' }
    };

    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        background: `linear-gradient(135deg, ${design.colors.accentPrimary} 0%, ${design.colors.accentSecondary} 100%)`,
        color: '#000',
        boxShadow: `0 4px 20px ${design.colors.accentGlow}`,
      },
      secondary: {
        background: design.colors.bgElevated,
        color: design.colors.textPrimary,
        border: `1px solid ${design.colors.border}`,
      },
      ghost: {
        background: 'transparent',
        color: design.colors.textSecondary,
        border: `1px solid ${design.colors.border}`,
      },
      success: {
        background: `linear-gradient(135deg, ${design.colors.success} 0%, #059669 100%)`,
        color: '#fff',
        boxShadow: `0 4px 20px rgba(16, 185, 129, 0.3)`,
      }
    };

    return (
      <button
        onClick={() => {
          console.log('[Beats] Button clicked:', label, 'disabled:', disabled);
          if (disabled) return;
          onClickHandler();
        }}
        disabled={disabled}
        style={{
          fontFamily: design.font.sans,
          fontWeight: 600,
          borderRadius: design.radius.lg,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: design.spacing.sm,
          opacity: disabled ? 0.5 : 1,
          border: 'none',
          outline: 'none',
          WebkitTapHighlightColor: 'transparent',
          ...sizeStyles[size],
          ...variantStyles[variant]
        }}
      >
        {label}
      </button>
    );
  };

  // Beats physics
  const beatFrequency = Math.abs(freq2 - freq1);
  const avgFrequency = (freq1 + freq2) / 2;

  // Track experimentation
  useEffect(() => {
    if ((phase === 'play' || phase === 'twist_play') && !hasExperimented && beatFrequency > 0) {
      setTimeout(() => setHasExperimented(true), 2000);
    }
  }, [phase, hasExperimented, beatFrequency]);

  // Test questions
  const questions = [
    { question: "Two tuning forks produce frequencies of 256 Hz and 260 Hz. What is the beat frequency?", options: [{ text: "2 Hz", correct: false }, { text: "4 Hz", correct: true }, { text: "258 Hz", correct: false }, { text: "516 Hz", correct: false }], explanation: "Beat frequency = |f₂ - f₁| = |260 - 256| = 4 Hz. You'll hear 4 pulsations per second." },
    { question: "What causes the 'wah-wah' sound in beats?", options: [{ text: "Echo effect", correct: false }, { text: "Constructive and destructive interference cycling", correct: true }, { text: "Speaker distortion", correct: false }, { text: "Room acoustics", correct: false }], explanation: "Beats occur when two slightly different frequencies alternately reinforce (constructive) and cancel (destructive) each other." },
    { question: "If you hear 3 beats per second, what's the frequency difference between the two sources?", options: [{ text: "1.5 Hz", correct: false }, { text: "3 Hz", correct: true }, { text: "6 Hz", correct: false }, { text: "9 Hz", correct: false }], explanation: "Beat frequency equals the frequency difference. 3 beats/second means exactly 3 Hz difference." },
    { question: "A piano tuner hears 5 beats/second. After tightening a string, beats slow to 2/second. What happened?", options: [{ text: "String got farther from target", correct: false }, { text: "String got closer to target", correct: true }, { text: "String stayed the same", correct: false }, { text: "Impossible to tell", correct: false }], explanation: "Slower beats mean smaller frequency difference - the tuner is getting closer to the reference frequency." },
    { question: "What is the perceived pitch when two tones produce beats?", options: [{ text: "The higher frequency", correct: false }, { text: "The lower frequency", correct: false }, { text: "The average of both frequencies", correct: true }, { text: "The beat frequency itself", correct: false }], explanation: "The perceived pitch is the average: f_perceived = (f₁ + f₂)/2. The beat is just the amplitude modulation." },
    { question: "Two violin strings are 440 Hz and 443 Hz. The beat frequency will be:", options: [{ text: "3 Hz", correct: true }, { text: "441.5 Hz", correct: false }, { text: "883 Hz", correct: false }, { text: "0 Hz", correct: false }], explanation: "Beat frequency = |443 - 440| = 3 Hz. The strings will create 3 pulsations every second." },
    { question: "Why are beats useful for tuning instruments?", options: [{ text: "They make the sound louder", correct: false }, { text: "Zero beats means frequencies match exactly", correct: true }, { text: "They create harmony", correct: false }, { text: "They add resonance", correct: false }], explanation: "When beats disappear (beat frequency = 0), the two frequencies are identical - perfect tuning!" },
    { question: "As two frequencies get closer together, what happens to beats?", options: [{ text: "Get faster", correct: false }, { text: "Get slower", correct: true }, { text: "Stay the same", correct: false }, { text: "Disappear randomly", correct: false }], explanation: "Beat frequency = |f₂ - f₁|. Smaller difference = slower beats. When equal, beats stop." },
    { question: "Can you hear beats with frequencies 200 Hz and 400 Hz?", options: [{ text: "Yes, 200 Hz beats", correct: false }, { text: "Yes, 600 Hz beats", correct: false }, { text: "No, difference is too large", correct: true }, { text: "Yes, 300 Hz beats", correct: false }], explanation: "Beats are only audible when the frequency difference is small (typically < 20 Hz). 200 Hz difference is perceived as two separate tones." },
    { question: "What is the mathematical formula for beat frequency?", options: [{ text: "f₁ + f₂", correct: false }, { text: "f₁ × f₂", correct: false }, { text: "|f₁ - f₂|", correct: true }, { text: "(f₁ + f₂)/2", correct: false }], explanation: "Beat frequency = |f₁ - f₂|, the absolute difference between the two frequencies." }
  ];

  // Real-world applications with detailed information
  const applications = [
    {
      id: 'tuning',
      title: 'Instrument Tuning',
      subtitle: 'Piano & String Instruments',
      description: 'Professional piano tuners have used beats for over 200 years to achieve perfect pitch. By striking a tuning fork (440 Hz) and a piano string simultaneously, they listen for beats. When the pulsating sound disappears completely, the frequencies match exactly.',
      howItWorks: 'The tuner adjusts string tension while listening. Fast beats (5-10 Hz) mean the string is far off. As beats slow down (2-3 Hz), they\'re getting closer. Zero beats = perfect tune. This method can detect differences as small as 0.5 Hz!',
      examples: ['Concert piano tuning', 'Guitar intonation', 'Orchestra warm-up', 'Choir pitch matching'],
      stat: 'f_beat = |f₁ - f₂|',
      color: design.colors.accentPrimary
    },
    {
      id: 'radar',
      title: 'Doppler Radar',
      subtitle: 'Speed Detection & Weather',
      description: 'Police radar guns and weather radar both rely on beat frequencies. When a radio wave bounces off a moving object, its frequency shifts slightly (Doppler effect). The radar compares transmitted and received frequencies - the beat frequency reveals the target\'s speed.',
      howItWorks: 'A radar gun transmits at 24.15 GHz. A car approaching at 60 mph shifts this by about 2,144 Hz. The gun measures this tiny beat frequency and converts it to speed. Faster car = higher beat frequency.',
      examples: ['Police speed guns', 'Baseball pitch speed', 'Weather radar (rain movement)', 'Air traffic control'],
      stat: 'v = c × f_beat / 2f₀',
      color: design.colors.cyan
    },
    {
      id: 'music',
      title: 'Music Production',
      subtitle: 'Synthesizers & Sound Design',
      description: 'Electronic musicians intentionally create beat frequencies for artistic effect. By slightly detuning two oscillators (e.g., 440 Hz and 441 Hz), they create a 1 Hz pulsation that adds warmth and movement to sounds. This "detune" effect is fundamental to analog synthesizer sounds.',
      howItWorks: 'Classic synth patches use 2-7 Hz detuning for "fat" bass sounds. Faster detuning (10-20 Hz) creates aggressive timbres. The "supersaw" sound in EDM uses 7 detuned oscillators creating complex beat patterns.',
      examples: ['Analog synth warmth', 'Dubstep wobble bass', 'Tremolo guitar effects', 'Binaural beats meditation'],
      stat: 'Detune = 1-7 Hz typical',
      color: design.colors.success
    },
    {
      id: 'medical',
      title: 'Medical Ultrasound',
      subtitle: 'Blood Flow & Heart Monitoring',
      description: 'Doppler ultrasound measures blood flow velocity using beat frequencies. The device sends ultrasound into blood vessels. Red blood cells reflect the sound, but because they\'re moving, the reflected frequency is shifted. The beat frequency between transmitted and received waves reveals blood speed.',
      howItWorks: 'Ultrasound at 5 MHz hits blood cells moving at 50 cm/s. The reflected wave is shifted by about 3,200 Hz. This beat frequency is converted to an audible "whoosh" sound and displayed as a velocity graph. Doctors can detect blockages, valve problems, and fetal heartbeats.',
      examples: ['Fetal heart monitoring', 'Detecting blood clots', 'Heart valve assessment', 'Vascular surgery planning'],
      stat: 'v_blood = (f_beat × c) / 2f₀',
      color: design.colors.warning
    }
  ];

  // Common styles
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: `linear-gradient(145deg, ${design.colors.bgDeep} 0%, ${design.colors.bgPrimary} 50%, ${design.colors.bgSecondary} 100%)`,
    fontFamily: design.font.sans,
    color: design.colors.textPrimary,
    overflow: 'hidden'
  };

  // Progress bar
  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{
        padding: '16px 24px',
        background: design.colors.bgCard,
        borderBottom: `1px solid ${design.colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: design.colors.accentPrimary }}>
            Beats
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {phaseOrder.map((p, idx) => (
              <div
                key={p}
                style={{
                  width: p === phase ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: idx < currentIndex ? design.colors.success : p === phase ? design.colors.accentPrimary : design.colors.bgElevated,
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>
        </div>
        <span style={{ fontSize: '12px', color: design.colors.textMuted }}>
          {currentIndex + 1} / {phaseOrder.length}
        </span>
      </div>
    );
  };

  // Beats visualization
  const renderBeatsVisualization = () => {
    const width = 450;
    const height = 220;
    const amp1 = 40;
    const amp2 = 40;
    const timeScale = 0.01;

    // Generate wave paths
    const generateWavePath = (freq: number, amplitude: number, yOffset: number) => {
      const points: string[] = [];
      for (let x = 0; x <= width; x += 2) {
        const t = x * timeScale + time;
        const y = yOffset + amplitude * Math.sin(2 * Math.PI * freq * t * 0.005);
        points.push(`${x},${y}`);
      }
      return `M ${points.join(' L ')}`;
    };

    // Generate combined wave (beat pattern)
    const generateBeatPath = () => {
      const points: string[] = [];
      for (let x = 0; x <= width; x += 2) {
        const t = x * timeScale + time;
        const y1 = amp1 * Math.sin(2 * Math.PI * freq1 * t * 0.005);
        const y2 = amp2 * Math.sin(2 * Math.PI * freq2 * t * 0.005);
        const y = 170 + (y1 + y2) / 2;
        points.push(`${x},${y}`);
      }
      return `M ${points.join(' L ')}`;
    };

    // Beat envelope
    const generateEnvelope = () => {
      const points: string[] = [];
      for (let x = 0; x <= width; x += 4) {
        const t = x * timeScale + time;
        const envelope = Math.abs(Math.cos(Math.PI * beatFrequency * t * 0.005));
        const y = 170 - (amp1 + amp2) * envelope / 2;
        points.push(`${x},${y}`);
      }
      return `M ${points.join(' L ')}`;
    };

    return (
      <svg viewBox={`0 0 ${width + 50} ${height + 30}`} style={{ width: '100%', height: '100%', maxHeight: '260px' }}>
        <defs>
          <linearGradient id="beatsGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={design.colors.accentPrimary} stopOpacity="0.8" />
            <stop offset="100%" stopColor={design.colors.accentSecondary} />
          </linearGradient>
          <linearGradient id="beatsGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={design.colors.cyan} stopOpacity="0.8" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <linearGradient id="beatsCombined" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={design.colors.success} />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <filter id="beatsGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <rect x="0" y="0" width={width + 50} height={height + 30} fill={design.colors.bgDeep} rx="12" />

        {/* Labels */}
        <text x="25" y="45" fill={design.colors.accentPrimary} fontSize="11" fontWeight="600">f₁ = {freq1} Hz</text>
        <text x="25" y="95" fill={design.colors.cyan} fontSize="11" fontWeight="600">f₂ = {freq2} Hz</text>
        <text x="25" y="175" fill={design.colors.success} fontSize="11" fontWeight="600">Combined</text>

        {/* Wave 1 */}
        <g transform="translate(25, 0)">
          <line x1="0" y1="50" x2={width} y2="50" stroke={design.colors.border} strokeDasharray="4,4" opacity="0.3" />
          <path d={generateWavePath(freq1, amp1 * 0.6, 50)} fill="none" stroke="url(#beatsGrad1)" strokeWidth="2.5" filter="url(#beatsGlow)" />
        </g>

        {/* Wave 2 */}
        <g transform="translate(25, 0)">
          <line x1="0" y1="100" x2={width} y2="100" stroke={design.colors.border} strokeDasharray="4,4" opacity="0.3" />
          <path d={generateWavePath(freq2, amp2 * 0.6, 100)} fill="none" stroke="url(#beatsGrad2)" strokeWidth="2.5" filter="url(#beatsGlow)" />
        </g>

        {/* Combined wave with envelope */}
        <g transform="translate(25, 0)">
          <line x1="0" y1="170" x2={width} y2="170" stroke={design.colors.border} strokeDasharray="4,4" opacity="0.3" />
          <path d={generateEnvelope()} fill="none" stroke={design.colors.warning} strokeWidth="1.5" strokeDasharray="6,3" opacity="0.6" />
          <path d={generateBeatPath()} fill="none" stroke="url(#beatsCombined)" strokeWidth="3" filter="url(#beatsGlow)" />
        </g>

        {/* Beat frequency indicator */}
        <g transform={`translate(${width - 80}, 15)`}>
          <rect x="0" y="0" width="100" height="50" rx="8" fill={design.colors.bgCard} stroke={design.colors.border} />
          <text x="50" y="18" textAnchor="middle" fill={design.colors.textMuted} fontSize="9" fontWeight="600">BEAT FREQ</text>
          <text x="50" y="38" textAnchor="middle" fill={design.colors.warning} fontSize="18" fontWeight="800">{beatFrequency} Hz</text>
        </g>
      </svg>
    );
  };

  // Application tab SVG graphics
  const renderApplicationGraphic = () => {
    const app = applications[activeApp];

    if (app.id === 'tuning') {
      return (
        <svg viewBox="0 0 300 200" style={{ width: '100%', height: '160px' }}>
          <rect x="0" y="0" width="300" height="200" fill={design.colors.bgDeep} rx="12" />

          {/* Tuning fork 1 */}
          <g transform="translate(80, 50)">
            <rect x="-5" y="0" width="10" height="80" rx="3" fill={design.colors.bgElevated} />
            <rect x="-15" y="-40" width="10" height="50" rx="2" fill={design.colors.accentPrimary}>
              <animate attributeName="x" values="-15;-13;-15;-17;-15" dur="0.5s" repeatCount="indefinite" />
            </rect>
            <rect x="5" y="-40" width="10" height="50" rx="2" fill={design.colors.accentPrimary}>
              <animate attributeName="x" values="5;7;5;3;5" dur="0.5s" repeatCount="indefinite" />
            </rect>
            <text x="0" y="100" textAnchor="middle" fill={design.colors.textSecondary} fontSize="12">440 Hz</text>
          </g>

          {/* Tuning fork 2 */}
          <g transform="translate(220, 50)">
            <rect x="-5" y="0" width="10" height="80" rx="3" fill={design.colors.bgElevated} />
            <rect x="-15" y="-40" width="10" height="50" rx="2" fill={design.colors.cyan}>
              <animate attributeName="x" values="-15;-14;-15;-16;-15" dur="0.48s" repeatCount="indefinite" />
            </rect>
            <rect x="5" y="-40" width="10" height="50" rx="2" fill={design.colors.cyan}>
              <animate attributeName="x" values="5;6;5;4;5" dur="0.48s" repeatCount="indefinite" />
            </rect>
            <text x="0" y="100" textAnchor="middle" fill={design.colors.textSecondary} fontSize="12">444 Hz</text>
          </g>

          {/* Sound waves meeting */}
          <g transform="translate(150, 60)">
            {[0, 1, 2].map((i) => (
              <circle key={i} cx="0" cy="0" r={20 + i * 15} fill="none" stroke={design.colors.success} strokeWidth="2" opacity={0.5 - i * 0.15}>
                <animate attributeName="r" values={`${20 + i * 15};${30 + i * 15};${20 + i * 15}`} dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" values={`${0.5 - i * 0.15};${0.3 - i * 0.1};${0.5 - i * 0.15}`} dur="1s" repeatCount="indefinite" />
              </circle>
            ))}
          </g>

          <text x="150" y="185" textAnchor="middle" fill={design.colors.textSecondary} fontSize="11">
            Beat freq = |444 - 440| = 4 Hz
          </text>
        </svg>
      );
    }

    if (app.id === 'radar') {
      return (
        <svg viewBox="0 0 300 200" style={{ width: '100%', height: '160px' }}>
          <rect x="0" y="0" width="300" height="200" fill={design.colors.bgDeep} rx="12" />

          {/* Radar gun */}
          <g transform="translate(40, 80)">
            <rect x="0" y="0" width="50" height="30" rx="4" fill={design.colors.bgElevated} stroke={design.colors.border} />
            <rect x="50" y="8" width="20" height="14" rx="2" fill={design.colors.cyan} />
            <circle cx="60" cy="15" r="4" fill={design.colors.accentPrimary}>
              <animate attributeName="opacity" values="1;0.5;1" dur="0.3s" repeatCount="indefinite" />
            </circle>
          </g>

          {/* Transmitted waves */}
          {[0, 1, 2, 3].map((i) => (
            <path
              key={i}
              d={`M 70 95 Q ${100 + i * 25} ${85 + 5 * Math.sin(time * 10 + i)} ${130 + i * 25} 95`}
              fill="none"
              stroke={design.colors.accentPrimary}
              strokeWidth="2"
              opacity={0.8 - i * 0.15}
            />
          ))}

          {/* Car */}
          <g transform="translate(210, 75)">
            <rect x="0" y="10" width="50" height="25" rx="4" fill={design.colors.warning} />
            <rect x="5" y="5" width="40" height="15" rx="3" fill="#fcd34d" />
            <circle cx="12" cy="35" r="8" fill={design.colors.bgDeep} />
            <circle cx="38" cy="35" r="8" fill={design.colors.bgDeep} />
            {/* Motion lines */}
            <line x1="55" y1="20" x2="70" y2="20" stroke={design.colors.textMuted} strokeWidth="2" />
            <line x1="55" y1="28" x2="65" y2="28" stroke={design.colors.textMuted} strokeWidth="2" />
          </g>

          {/* Reflected waves (shifted frequency) */}
          {[0, 1, 2].map((i) => (
            <path
              key={`r${i}`}
              d={`M 200 95 Q ${175 - i * 25} ${105 + 5 * Math.sin(time * 10 + i)} ${150 - i * 25} 95`}
              fill="none"
              stroke={design.colors.cyan}
              strokeWidth="2"
              opacity={0.6 - i * 0.15}
              strokeDasharray="4,4"
            />
          ))}

          <text x="150" y="155" textAnchor="middle" fill={design.colors.textSecondary} fontSize="11">
            Doppler shift creates beat frequency
          </text>
          <text x="150" y="175" textAnchor="middle" fill={design.colors.warning} fontSize="13" fontWeight="600">
            Speed = 72 mph
          </text>
        </svg>
      );
    }

    if (app.id === 'music') {
      return (
        <svg viewBox="0 0 300 200" style={{ width: '100%', height: '160px' }}>
          <rect x="0" y="0" width="300" height="200" fill={design.colors.bgDeep} rx="12" />

          {/* Synthesizer */}
          <rect x="50" y="60" width="200" height="80" rx="8" fill={design.colors.bgElevated} stroke={design.colors.border} strokeWidth="2" />

          {/* Keys */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <rect
              key={i}
              x={60 + i * 18}
              y="100"
              width="14"
              height="35"
              rx="2"
              fill={i % 2 === 0 ? '#f5f5f4' : design.colors.bgDeep}
              stroke={design.colors.border}
            />
          ))}

          {/* Oscillator displays */}
          <g transform="translate(70, 70)">
            <rect x="0" y="0" width="70" height="25" rx="4" fill={design.colors.bgDeep} />
            <text x="35" y="10" textAnchor="middle" fill={design.colors.textMuted} fontSize="7">OSC 1</text>
            <text x="35" y="20" textAnchor="middle" fill={design.colors.accentPrimary} fontSize="10" fontWeight="700">440 Hz</text>
          </g>
          <g transform="translate(160, 70)">
            <rect x="0" y="0" width="70" height="25" rx="4" fill={design.colors.bgDeep} />
            <text x="35" y="10" textAnchor="middle" fill={design.colors.textMuted} fontSize="7">OSC 2</text>
            <text x="35" y="20" textAnchor="middle" fill={design.colors.cyan} fontSize="10" fontWeight="700">443 Hz</text>
          </g>

          {/* Sound waves */}
          {[0, 1, 2, 3].map((i) => {
            const modulation = Math.sin(time * 3) * 0.5 + 0.5;
            return (
              <circle
                key={i}
                cx="150"
                cy="40"
                r={10 + i * 12}
                fill="none"
                stroke={design.colors.success}
                strokeWidth="2"
                opacity={(0.6 - i * 0.15) * modulation}
              />
            );
          })}

          <text x="150" y="185" textAnchor="middle" fill={design.colors.textSecondary} fontSize="11">
            Detuned oscillators create pulsating sound
          </text>
        </svg>
      );
    }

    if (app.id === 'medical') {
      return (
        <svg viewBox="0 0 300 200" style={{ width: '100%', height: '160px' }}>
          <rect x="0" y="0" width="300" height="200" fill={design.colors.bgDeep} rx="12" />

          {/* Ultrasound probe */}
          <g transform="translate(50, 70)">
            <rect x="0" y="0" width="30" height="60" rx="4" fill={design.colors.bgElevated} stroke={design.colors.border} />
            <rect x="5" y="55" width="20" height="10" rx="2" fill={design.colors.warning} />
          </g>

          {/* Sound waves going in */}
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={`M 80 100 Q ${100 + i * 20} ${90 + 5 * Math.sin(time * 8 + i)} ${120 + i * 20} 100`}
              fill="none"
              stroke={design.colors.warning}
              strokeWidth="2"
              opacity={0.8 - i * 0.2}
            />
          ))}

          {/* Blood vessel */}
          <g transform="translate(170, 60)">
            <ellipse cx="40" cy="40" rx="50" ry="35" fill="none" stroke="#ef4444" strokeWidth="3" />
            <ellipse cx="40" cy="40" rx="35" ry="25" fill={design.colors.bgDeep} />

            {/* Blood cells moving */}
            {[0, 1, 2, 3].map((i) => (
              <circle
                key={i}
                cx={25 + ((time * 30 + i * 20) % 70)}
                cy={40 + 10 * Math.sin((time * 30 + i * 20) % 70 * 0.1)}
                r="4"
                fill="#ef4444"
              />
            ))}
          </g>

          {/* Reflected waves */}
          {[0, 1].map((i) => (
            <path
              key={`r${i}`}
              d={`M 170 100 Q ${150 - i * 20} ${110 + 5 * Math.sin(time * 8 + i)} ${130 - i * 20} 100`}
              fill="none"
              stroke={design.colors.accentPrimary}
              strokeWidth="2"
              opacity={0.6 - i * 0.2}
              strokeDasharray="4,4"
            />
          ))}

          <text x="150" y="155" textAnchor="middle" fill={design.colors.textSecondary} fontSize="11">
            Moving blood cells shift frequency
          </text>
          <text x="150" y="175" textAnchor="middle" fill={design.colors.error} fontSize="13" fontWeight="600">
            Blood flow: 0.8 m/s
          </text>
        </svg>
      );
    }

    return null;
  };

  // Calculate score
  const calculateScore = (): number => {
    return answers.reduce((score, answer, index) => {
      return score + (questions[index].options[answer as number]?.correct ? 1 : 0);
    }, 0);
  };
  const score = calculateScore();

  // Debug: Log current phase on every render
  console.log('[Beats] Rendering phase:', phase);

  // ==================== PHASE RENDERS ====================

  // HOOK - Premium welcome screen
  if (phase === 'hook') {
    return (
      <div style={containerStyle}>
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: design.spacing.xl,
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Floating background elements */}
          <div style={{
            position: 'absolute',
            top: '10%',
            left: '10%',
            width: '300px',
            height: '300px',
            background: `radial-gradient(circle, ${design.colors.accentGlow} 0%, transparent 70%)`,
            borderRadius: '50%',
            animation: 'float 6s ease-in-out infinite',
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '10%',
            right: '10%',
            width: '200px',
            height: '200px',
            background: `radial-gradient(circle, ${design.colors.cyanMuted} 0%, transparent 70%)`,
            borderRadius: '50%',
            animation: 'float 8s ease-in-out infinite reverse',
            pointerEvents: 'none'
          }} />

          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0) scale(1); }
              50% { transform: translateY(-20px) scale(1.05); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}</style>

          {/* Icon */}
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '32px',
            background: `linear-gradient(135deg, ${design.colors.accentMuted} 0%, ${design.colors.bgElevated} 100%)`,
            border: `2px solid ${design.colors.accentPrimary}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: design.spacing.lg,
            boxShadow: design.shadow.glow(design.colors.accentPrimary)
          }}>
            <svg viewBox="0 0 60 60" style={{ width: '60%', height: '60%' }}>
              {/* Sound wave visualization */}
              {[0, 1, 2].map((i) => {
                const opacity = 0.8 - i * 0.2 + 0.2 * Math.sin(time * 4 + i);
                return (
                  <path
                    key={i}
                    d={`M 10 30 Q 20 ${20 - i * 3} 30 30 Q 40 ${40 + i * 3} 50 30`}
                    fill="none"
                    stroke={design.colors.accentPrimary}
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity={opacity}
                  />
                );
              })}
            </svg>
          </div>

          <h1 style={{
            fontSize: '42px',
            fontWeight: 800,
            color: design.colors.textPrimary,
            marginBottom: design.spacing.md,
            letterSpacing: '-0.02em'
          }}>
            Beats
          </h1>

          <p style={{
            fontSize: '18px',
            color: design.colors.textSecondary,
            marginBottom: design.spacing.sm,
            maxWidth: '500px',
            lineHeight: 1.6
          }}>
            Why does sound <span style={{ color: design.colors.accentPrimary, fontWeight: 600 }}>pulse and wobble</span> when two similar frequencies combine?
          </p>

          <p style={{
            fontSize: '15px',
            color: design.colors.textMuted,
            marginBottom: design.spacing.xl,
            maxWidth: '400px'
          }}>
            Discover the physics of wave interference and tuning
          </p>

          {/* Feature cards */}
          <div style={{ display: 'flex', gap: design.spacing.md, marginBottom: design.spacing.xl }}>
            {[
              { icon: '🎵', label: 'Interference' },
              { icon: '🎸', label: 'Tuning' },
              { icon: '📡', label: 'Radar' }
            ].map((item, i) => (
              <div key={i} style={{
                padding: '16px 24px',
                borderRadius: design.radius.lg,
                background: design.colors.bgCard,
                border: `1px solid ${design.colors.border}`
              }}>
                <div style={{ fontSize: '24px', marginBottom: '6px' }}>{item.icon}</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: design.colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              console.log('[Beats] Start Learning clicked!');
              goToPhase('predict');
            }}
            style={{
              padding: '18px 36px',
              fontSize: '17px',
              fontFamily: design.font.sans,
              fontWeight: 600,
              borderRadius: design.radius.lg,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              outline: 'none',
              background: `linear-gradient(135deg, ${design.colors.accentPrimary} 0%, ${design.colors.accentSecondary} 100%)`,
              color: '#000',
              boxShadow: `0 4px 20px ${design.colors.accentGlow}`,
              WebkitTapHighlightColor: 'transparent',
              position: 'relative',
              zIndex: 10,
            }}
          >
            Start Learning
          </button>

          <p style={{ fontSize: '12px', color: design.colors.textMuted, marginTop: design.spacing.lg }}>
            ~5 minutes · Interactive simulation
          </p>
        </div>
      </div>
    );
  }

  // PREDICT
  if (phase === 'predict') {
    const options = [
      { id: 'louder', text: 'Just sounds louder - amplitudes add' },
      { id: 'beats', text: 'Creates pulsating "wah-wah" sound' },
      { id: 'cancel', text: 'Completely cancels out - silence' },
      { id: 'average', text: 'Produces a single averaged frequency' }
    ];

    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: design.spacing.xl, overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ marginBottom: design.spacing.lg }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.accentPrimary, marginBottom: design.spacing.sm, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Predict
              </p>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: design.colors.textPrimary, marginBottom: design.spacing.sm }}>
                What happens when you play 440 Hz and 444 Hz together?
              </h2>
              <p style={{ fontSize: '15px', color: design.colors.textSecondary }}>
                Imagine two tuning forks with slightly different pitches ringing simultaneously.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md }}>
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    console.log('[Beats] Prediction selected:', opt.id);
                    setPrediction(opt.id);
                    emitEvent('prediction_made', { value: opt.id });
                  }}
                  style={{
                    padding: '18px 24px',
                    borderRadius: design.radius.lg,
                    border: `2px solid ${prediction === opt.id ? design.colors.accentPrimary : design.colors.border}`,
                    background: prediction === opt.id ? design.colors.accentMuted : design.colors.bgCard,
                    color: design.colors.textPrimary,
                    fontSize: '15px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            <div style={{ marginTop: design.spacing.xl, display: 'flex', justifyContent: 'flex-end' }}>
              {renderButton('Test Your Prediction', () => goToPhase('play'), 'primary', !prediction)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PLAY - Interactive experiment
  if (phase === 'play') {
    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Visualization */}
          <div style={{ flex: 1, padding: design.spacing.lg, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '280px' }}>
            {renderBeatsVisualization()}
          </div>

          {/* Controls */}
          <div style={{
            padding: design.spacing.lg,
            background: design.colors.bgCard,
            borderTop: `1px solid ${design.colors.border}`
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              {/* Freq 1 slider */}
              <div style={{ marginBottom: design.spacing.md }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: design.spacing.xs }}>
                  <label style={{ fontSize: '13px', color: design.colors.textSecondary, fontWeight: 600 }}>Frequency 1</label>
                  <span style={{ fontSize: '13px', color: design.colors.accentPrimary, fontWeight: 700 }}>{freq1} Hz</span>
                </div>
                <input
                  type="range" min="400" max="480" value={freq1}
                  onChange={(e) => setFreq1(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: design.colors.accentPrimary }}
                />
              </div>

              {/* Freq 2 slider */}
              <div style={{ marginBottom: design.spacing.lg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: design.spacing.xs }}>
                  <label style={{ fontSize: '13px', color: design.colors.textSecondary, fontWeight: 600 }}>Frequency 2</label>
                  <span style={{ fontSize: '13px', color: design.colors.cyan, fontWeight: 700 }}>{freq2} Hz</span>
                </div>
                <input
                  type="range" min="400" max="480" value={freq2}
                  onChange={(e) => setFreq2(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: design.colors.cyan }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{
                  padding: '12px 20px',
                  borderRadius: design.radius.md,
                  background: design.colors.bgElevated,
                  border: `1px solid ${design.colors.border}`
                }}>
                  <span style={{ fontSize: '12px', color: design.colors.textMuted }}>Beat Frequency: </span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: design.colors.warning }}>{beatFrequency} Hz</span>
                  <span style={{ fontSize: '12px', color: design.colors.textMuted, marginLeft: '8px' }}>
                    ({beatFrequency} pulses/sec)
                  </span>
                </div>
                {renderButton(hasExperimented ? 'Continue' : 'Experiment more...', () => goToPhase('review'), 'primary', !hasExperimented)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // REVIEW
  if (phase === 'review') {
    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: design.spacing.xl, overflowY: 'auto' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ marginBottom: design.spacing.lg }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.success, marginBottom: design.spacing.sm, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Understanding
              </p>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: design.colors.textPrimary }}>
                The Physics of Beats
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: design.spacing.md, marginBottom: design.spacing.xl }}>
              {[
                { icon: '➕', title: 'Superposition', desc: 'Two waves combine by adding their displacements' },
                { icon: '🔄', title: 'Interference Cycle', desc: 'Alternating constructive and destructive interference' },
                { icon: '📊', title: 'Envelope', desc: 'Amplitude oscillates at the beat frequency' },
                { icon: '🎵', title: 'Perceived Pitch', desc: 'We hear the average frequency with pulsing volume' }
              ].map((item, i) => (
                <div key={i} style={{
                  padding: design.spacing.lg,
                  borderRadius: design.radius.lg,
                  background: design.colors.bgCard,
                  border: `1px solid ${design.colors.border}`
                }}>
                  <div style={{ fontSize: '24px', marginBottom: design.spacing.sm }}>{item.icon}</div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: design.colors.textPrimary, marginBottom: design.spacing.xs }}>{item.title}</h4>
                  <p style={{ fontSize: '13px', color: design.colors.textSecondary, lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Formula box */}
            <div style={{
              padding: design.spacing.xl,
              borderRadius: design.radius.lg,
              background: `linear-gradient(135deg, ${design.colors.accentMuted} 0%, ${design.colors.bgElevated} 100%)`,
              border: `1px solid ${design.colors.accentPrimary}30`,
              textAlign: 'center',
              marginBottom: design.spacing.xl
            }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: design.colors.accentPrimary, marginBottom: design.spacing.md, textTransform: 'uppercase', letterSpacing: '1px' }}>Beat Frequency Formula</p>
              <p style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
                f<sub>beat</sub> = |f₁ - f₂|
              </p>
              <p style={{ fontSize: '13px', color: design.colors.textSecondary }}>
                The beat frequency equals the absolute difference between the two frequencies
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              {renderButton('Continue', () => goToPhase('twist_predict'))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TWIST PREDICT
  if (phase === 'twist_predict') {
    const options = [
      { id: 'faster', text: 'Beats get faster (higher beat frequency)' },
      { id: 'slower', text: 'Beats get slower (lower beat frequency)' },
      { id: 'same', text: 'Beat rate stays exactly the same' },
      { id: 'disappear', text: 'Beats disappear completely' }
    ];

    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: design.spacing.xl, overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ marginBottom: design.spacing.lg }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.cyan, marginBottom: design.spacing.sm, textTransform: 'uppercase', letterSpacing: '1px' }}>
                New Variable
              </p>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: design.colors.textPrimary, marginBottom: design.spacing.sm }}>
                What happens when two frequencies get closer together?
              </h2>
              <p style={{ fontSize: '15px', color: design.colors.textSecondary }}>
                Think about tuning an instrument - as you approach perfect tune, what changes?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md }}>
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    console.log('[Beats] Twist prediction selected:', opt.id);
                    setTwistPrediction(opt.id);
                    emitEvent('twist_prediction_made', { value: opt.id });
                  }}
                  style={{
                    padding: '18px 24px',
                    borderRadius: design.radius.lg,
                    border: `2px solid ${twistPrediction === opt.id ? design.colors.cyan : design.colors.border}`,
                    background: twistPrediction === opt.id ? design.colors.cyanMuted : design.colors.bgCard,
                    color: design.colors.textPrimary,
                    fontSize: '15px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            <div style={{ marginTop: design.spacing.xl, display: 'flex', justifyContent: 'flex-end' }}>
              {renderButton('Test It', () => goToPhase('twist_play'), 'primary', !twistPrediction)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TWIST PLAY - Continue with same visualization but focus on matching frequencies
  if (phase === 'twist_play') {
    const isMatched = beatFrequency === 0;

    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Visualization */}
          <div style={{ flex: 1, padding: design.spacing.lg, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '280px' }}>
            {renderBeatsVisualization()}
          </div>

          {/* Controls */}
          <div style={{
            padding: design.spacing.lg,
            background: design.colors.bgCard,
            borderTop: `1px solid ${design.colors.border}`
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              {/* Freq 2 slider (tuning to match freq1) */}
              <div style={{ marginBottom: design.spacing.lg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: design.spacing.xs }}>
                  <label style={{ fontSize: '13px', color: design.colors.textSecondary, fontWeight: 600 }}>
                    Tune Frequency 2 to match {freq1} Hz
                  </label>
                  <span style={{ fontSize: '13px', color: isMatched ? design.colors.success : design.colors.cyan, fontWeight: 700 }}>
                    {freq2} Hz {isMatched ? '✓ Perfect!' : ''}
                  </span>
                </div>
                <input
                  type="range" min={freq1 - 20} max={freq1 + 20} value={freq2}
                  onChange={(e) => setFreq2(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: isMatched ? design.colors.success : design.colors.cyan }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{
                  padding: '12px 20px',
                  borderRadius: design.radius.md,
                  background: isMatched ? design.colors.successMuted : design.colors.bgElevated,
                  border: `1px solid ${isMatched ? design.colors.success : design.colors.border}`
                }}>
                  <span style={{ fontSize: '14px', color: isMatched ? design.colors.success : design.colors.textSecondary, fontWeight: 600 }}>
                    {isMatched ? '🎉 No beats - perfectly tuned!' : `${beatFrequency} beats/second`}
                  </span>
                </div>
                {renderButton('Continue', () => goToPhase('twist_review'))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TWIST REVIEW
  if (phase === 'twist_review') {
    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: design.spacing.xl, overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ marginBottom: design.spacing.lg }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.success, marginBottom: design.spacing.sm, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Deep Insight
              </p>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: design.colors.textPrimary }}>
                Zero Beats = Perfect Tuning!
              </h2>
            </div>

            <div style={{
              padding: design.spacing.xl,
              borderRadius: design.radius.lg,
              background: design.colors.bgCard,
              border: `1px solid ${design.colors.border}`,
              marginBottom: design.spacing.xl
            }}>
              <p style={{ fontSize: '15px', color: design.colors.textSecondary, lineHeight: 1.7, marginBottom: design.spacing.lg }}>
                This is exactly how musicians tune instruments:
              </p>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li style={{ color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
                  <strong style={{ color: design.colors.accentPrimary }}>Fast beats</strong> — Frequencies are far apart
                </li>
                <li style={{ color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
                  <strong style={{ color: design.colors.cyan }}>Slow beats</strong> — Getting closer to target
                </li>
                <li style={{ color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
                  <strong style={{ color: design.colors.success }}>No beats</strong> — Perfect tune! Frequencies match exactly
                </li>
                <li style={{ color: design.colors.textPrimary }}>
                  <strong style={{ color: design.colors.warning }}>More sensitive</strong> — Can detect 0.1 Hz differences!
                </li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              {renderButton('See Real Applications', () => goToPhase('transfer'))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TRANSFER - Tabbed applications with sequential navigation
  if (phase === 'transfer') {
    const app = applications[activeApp];
    const allAppsCompleted = completedApps.size >= applications.length;

    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tab bar */}
          <div style={{
            display: 'flex',
            gap: design.spacing.sm,
            padding: `${design.spacing.md}px ${design.spacing.lg}px`,
            background: design.colors.bgCard,
            borderBottom: `1px solid ${design.colors.border}`,
            overflowX: 'auto'
          }}>
            {applications.map((a, idx) => (
              <button
                key={a.id}
                onClick={() => {
                  console.log('[Beats] App tab clicked:', idx);
                  setActiveApp(idx);
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: design.radius.md,
                  border: 'none',
                  background: activeApp === idx ? design.colors.bgElevated : 'transparent',
                  color: activeApp === idx ? design.colors.textPrimary : design.colors.textMuted,
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                {completedApps.has(idx) && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: design.colors.success,
                    color: '#fff',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>✓</span>
                )}
                {a.title}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, padding: design.spacing.xl, overflowY: 'auto' }}>
            <div style={{ maxWidth: '700px', margin: '0 auto' }}>
              {/* Graphic */}
              <div style={{
                marginBottom: design.spacing.lg,
                borderRadius: design.radius.lg,
                overflow: 'hidden',
                border: `1px solid ${design.colors.border}`
              }}>
                {renderApplicationGraphic()}
              </div>

              {/* Info */}
              <div style={{ marginBottom: design.spacing.lg }}>
                <h3 style={{ fontSize: '24px', fontWeight: 800, color: design.colors.textPrimary, marginBottom: design.spacing.xs }}>
                  {app.title}
                </h3>
                <p style={{ fontSize: '14px', color: app.color, fontWeight: 600, marginBottom: design.spacing.md }}>
                  {app.subtitle}
                </p>
                <p style={{ fontSize: '15px', color: design.colors.textSecondary, lineHeight: 1.7, marginBottom: design.spacing.md }}>
                  {app.description}
                </p>
              </div>

              {/* How it works */}
              <div style={{
                padding: design.spacing.lg,
                borderRadius: design.radius.lg,
                background: design.colors.bgCard,
                border: `1px solid ${design.colors.border}`,
                marginBottom: design.spacing.lg
              }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.accentPrimary, marginBottom: design.spacing.sm, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  How It Works
                </p>
                <p style={{ fontSize: '14px', color: design.colors.textSecondary, lineHeight: 1.7 }}>
                  {app.howItWorks}
                </p>
              </div>

              {/* Examples */}
              <div style={{
                padding: design.spacing.lg,
                borderRadius: design.radius.lg,
                background: design.colors.bgCard,
                border: `1px solid ${design.colors.border}`,
                marginBottom: design.spacing.lg
              }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.cyan, marginBottom: design.spacing.sm, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Real Examples
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: design.spacing.sm }}>
                  {app.examples.map((example: string, i: number) => (
                    <span key={i} style={{
                      padding: '6px 12px',
                      borderRadius: design.radius.full,
                      background: design.colors.bgElevated,
                      color: design.colors.textPrimary,
                      fontSize: '12px',
                      fontWeight: 500
                    }}>
                      {example}
                    </span>
                  ))}
                </div>
              </div>

              {/* Formula */}
              <div style={{
                padding: design.spacing.lg,
                borderRadius: design.radius.lg,
                background: `${app.color}15`,
                border: `1px solid ${app.color}30`,
                marginBottom: design.spacing.xl
              }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: app.color, marginBottom: design.spacing.sm, textTransform: 'uppercase' }}>
                  Key Formula
                </p>
                <p style={{ fontSize: '20px', fontFamily: 'Georgia, serif', color: design.colors.textPrimary }}>
                  {app.stat}
                </p>
              </div>

              {/* Navigation buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: design.spacing.md }}>
                {/* Progress indicator */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: design.spacing.sm,
                  color: design.colors.textMuted,
                  fontSize: '13px'
                }}>
                  <span>Application {activeApp + 1} of {applications.length}</span>
                  {completedApps.has(activeApp) && (
                    <span style={{ color: design.colors.success }}>✓</span>
                  )}
                </div>

                {/* Next/Quiz button */}
                {activeApp < applications.length - 1 ? (
                  <button
                    onClick={() => {
                      console.log('[Beats] Next application clicked');
                      // Mark current as completed and go to next
                      const newCompleted = new Set(completedApps);
                      newCompleted.add(activeApp);
                      setCompletedApps(newCompleted);
                      emitEvent('app_explored', { app: app.id });
                      setActiveApp(activeApp + 1);
                    }}
                    style={{
                      padding: '14px 28px',
                      borderRadius: design.radius.lg,
                      background: `linear-gradient(135deg, ${design.colors.accentPrimary} 0%, ${design.colors.accentSecondary} 100%)`,
                      border: 'none',
                      color: '#000',
                      fontSize: '15px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: `0 4px 20px ${design.colors.accentGlow}`,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Next Application →
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      console.log('[Beats] Take Quiz clicked');
                      // Mark last app as completed and go to quiz
                      const newCompleted = new Set(completedApps);
                      newCompleted.add(activeApp);
                      setCompletedApps(newCompleted);
                      emitEvent('app_explored', { app: app.id });
                      goToPhase('test');
                    }}
                    style={{
                      padding: '14px 28px',
                      borderRadius: design.radius.lg,
                      background: `linear-gradient(135deg, ${design.colors.success} 0%, #059669 100%)`,
                      border: 'none',
                      color: '#fff',
                      fontSize: '15px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: `0 4px 20px rgba(16, 185, 129, 0.3)`,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Take Quiz →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TEST
  if (phase === 'test') {
    const q = questions[testIndex];
    const answered = answers[testIndex] !== null;

    if (showResult) {
      return (
        <div style={containerStyle}>
          {renderProgressBar()}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: design.spacing.xl, textAlign: 'center' }}>
            <div style={{ fontSize: '72px', marginBottom: design.spacing.lg }}>
              {score >= 8 ? '🏆' : score >= 6 ? '⭐' : '📚'}
            </div>
            <h2 style={{ fontSize: '36px', fontWeight: 900, color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
              {score}/10 Correct
            </h2>
            <p style={{ fontSize: '16px', color: design.colors.textSecondary, marginBottom: design.spacing.xl, maxWidth: '400px' }}>
              {score >= 8 ? "Excellent! You've truly mastered beats!" :
               score >= 6 ? "Good job! Review the concepts you missed." :
               "Keep practicing! Review the material and try again."}
            </p>
            {renderButton('Complete Lesson', () => goToPhase('mastery'), 'success', false, 'lg')}
          </div>
        </div>
      );
    }

    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: design.spacing.xl, overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            {/* Progress */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: design.spacing.lg }}>
              <span style={{ fontSize: '14px', color: design.colors.textMuted, fontWeight: 600 }}>
                Question {testIndex + 1} of 10
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {answers.slice(0, 10).map((a, i) => (
                  <div key={i} style={{
                    width: '10px', height: '10px', borderRadius: '50%',
                    background: a !== null ? (questions[i].options[a as number]?.correct ? design.colors.success : design.colors.error) :
                               i === testIndex ? design.colors.accentPrimary : design.colors.bgElevated
                  }} />
                ))}
              </div>
            </div>

            {/* Question */}
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: design.colors.textPrimary, marginBottom: design.spacing.lg, lineHeight: 1.5 }}>
              {q.question}
            </h3>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md }}>
              {q.options.map((opt, i) => {
                const isSelected = answers[testIndex] === i;
                const isCorrect = opt.correct;
                const showFeedback = answered;

                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (answered) return;
                      console.log('[Beats] Test answer selected:', i, opt.correct ? '(correct)' : '(wrong)');
                      const newAnswers = [...answers];
                      newAnswers[testIndex] = i;
                      setAnswers(newAnswers);
                      emitEvent('test_answered', { questionIndex: testIndex, correct: opt.correct });
                    }}
                    disabled={answered}
                    style={{
                      padding: '18px 24px',
                      borderRadius: design.radius.lg,
                      border: `2px solid ${showFeedback ? (isCorrect ? design.colors.success : isSelected ? design.colors.error : design.colors.border) : isSelected ? design.colors.accentPrimary : design.colors.border}`,
                      background: showFeedback ? (isCorrect ? design.colors.successMuted : isSelected ? design.colors.errorMuted : design.colors.bgCard) : isSelected ? design.colors.accentMuted : design.colors.bgCard,
                      color: design.colors.textPrimary,
                      fontSize: '15px',
                      fontWeight: 500,
                      cursor: answered ? 'default' : 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {answered && (
              <div style={{
                marginTop: design.spacing.lg,
                padding: design.spacing.lg,
                borderRadius: design.radius.lg,
                background: q.options[answers[testIndex] as number]?.correct ? design.colors.successMuted : design.colors.errorMuted,
                border: `1px solid ${q.options[answers[testIndex] as number]?.correct ? design.colors.success : design.colors.error}30`
              }}>
                <p style={{ fontSize: '14px', color: design.colors.textPrimary, lineHeight: 1.6 }}>
                  <strong style={{ color: q.options[answers[testIndex] as number]?.correct ? design.colors.success : design.colors.error }}>
                    {q.options[answers[testIndex] as number]?.correct ? '✓ Correct!' : '✗ Not quite.'}
                  </strong>{' '}
                  {q.explanation}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div style={{
          padding: design.spacing.lg,
          background: design.colors.bgCard,
          borderTop: `1px solid ${design.colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          gap: design.spacing.md
        }}>
          {renderButton('← Previous', () => testIndex > 0 && setTestIndex(testIndex - 1), 'ghost', testIndex === 0)}
          {testIndex < 9 ? (
            renderButton('Next Question →', () => answered && setTestIndex(testIndex + 1), 'primary', !answered)
          ) : (
            renderButton('See Results →', () => answered && setShowResult(true), 'success', !answered)
          )}
        </div>
      </div>
    );
  }

  // MASTERY
  if (phase === 'mastery') {
    return (
      <div style={{
        ...containerStyle,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Confetti */}
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: '10px',
              height: '10px',
              background: [design.colors.accentPrimary, design.colors.cyan, design.colors.success, design.colors.warning][i % 4],
              borderRadius: '2px',
              animation: `confettiFall 3s ease-out ${Math.random() * 2}s infinite`,
              opacity: 0.8
            }}
          />
        ))}
        <style>{`
          @keyframes confettiFall {
            0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
        `}</style>

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: design.spacing.xl,
          textAlign: 'center',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${design.colors.success}, ${design.colors.accentPrimary})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: design.spacing.lg,
            boxShadow: `0 0 60px ${design.colors.accentPrimary}50`
          }}>
            <span style={{ fontSize: '56px' }}>🎓</span>
          </div>

          <h1 style={{ fontSize: '36px', fontWeight: 900, color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
            Congratulations!
          </h1>
          <p style={{ fontSize: '17px', color: design.colors.textSecondary, marginBottom: design.spacing.lg, maxWidth: '450px', lineHeight: 1.6 }}>
            You've mastered Beats! You now understand how wave interference creates the pulsating sounds used in tuning and technology.
          </p>

          {/* Score */}
          <div style={{
            padding: '16px 32px',
            borderRadius: design.radius.lg,
            background: design.colors.bgCard,
            border: `1px solid ${design.colors.border}`,
            marginBottom: design.spacing.xl
          }}>
            <p style={{ fontSize: '14px', color: design.colors.textMuted, marginBottom: '4px' }}>Quiz Score</p>
            <p style={{ fontSize: '32px', fontWeight: 900, color: score >= 8 ? design.colors.success : design.colors.accentPrimary }}>{score}/10</p>
          </div>

          {/* Topics learned */}
          <div style={{
            padding: design.spacing.lg,
            borderRadius: design.radius.lg,
            background: design.colors.successMuted,
            border: `1px solid ${design.colors.success}30`,
            marginBottom: design.spacing.xl,
            maxWidth: '400px'
          }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: design.colors.success, marginBottom: design.spacing.md, textTransform: 'uppercase' }}>
              What You Learned
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: design.spacing.sm, justifyContent: 'center' }}>
              {['Beat Frequency', 'Interference', 'Tuning', 'Superposition', 'Doppler Radar', 'Applications'].map((topic, i) => (
                <span key={i} style={{
                  padding: '6px 12px',
                  borderRadius: design.radius.full,
                  background: design.colors.bgCard,
                  color: design.colors.textPrimary,
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  {topic}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: design.spacing.md }}>
            {renderButton('Replay Lesson', () => {
              setPhase('hook');
              setTestIndex(0);
              setAnswers(Array(10).fill(null));
              setShowResult(false);
              setHasExperimented(false);
              setFreq1(440);
              setFreq2(444);
              setCompletedApps(new Set());
            }, 'ghost')}
            {renderButton('Free Exploration', () => goToPhase('play'))}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default BeatsRenderer;
