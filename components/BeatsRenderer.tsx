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

  // Test questions with longer answer options
  const questions = [
    { question: "Two tuning forks produce frequencies of 256 Hz and 260 Hz. What is the beat frequency?", options: [{ text: "The beat frequency is 2 Hz (half the difference)", correct: false }, { text: "The beat frequency is 4 Hz (the absolute difference)", correct: true }, { text: "The beat frequency is 258 Hz (the average)", correct: false }, { text: "The beat frequency is 516 Hz (the sum)", correct: false }], explanation: "Beat frequency = |f₂ - f₁| = |260 - 256| = 4 Hz. You'll hear 4 pulsations per second." },
    { question: "What causes the 'wah-wah' sound in beats?", options: [{ text: "Echo effect from room reflections", correct: false }, { text: "Constructive and destructive interference cycling", correct: true }, { text: "Speaker distortion and harmonics", correct: false }, { text: "Room acoustics and resonance", correct: false }], explanation: "Beats occur when two slightly different frequencies alternately reinforce (constructive) and cancel (destructive) each other." },
    { question: "If you hear 3 beats per second, what's the frequency difference between the two sources?", options: [{ text: "The difference is 1.5 Hz (half the beats)", correct: false }, { text: "The difference is exactly 3 Hz", correct: true }, { text: "The difference is 6 Hz (double the beats)", correct: false }, { text: "The difference is 9 Hz (triple the beats)", correct: false }], explanation: "Beat frequency equals the frequency difference. 3 beats/second means exactly 3 Hz difference." },
    { question: "A piano tuner hears 5 beats/second. After tightening a string, beats slow to 2/second. What happened?", options: [{ text: "The string frequency moved farther from the target", correct: false }, { text: "The string frequency got closer to the target", correct: true }, { text: "The string frequency stayed exactly the same", correct: false }, { text: "It's impossible to determine from this information", correct: false }], explanation: "Slower beats mean smaller frequency difference - the tuner is getting closer to the reference frequency." },
    { question: "What is the perceived pitch when two tones produce beats?", options: [{ text: "You hear only the higher frequency tone", correct: false }, { text: "You hear only the lower frequency tone", correct: false }, { text: "You hear the average of both frequencies", correct: true }, { text: "You hear the beat frequency as the pitch", correct: false }], explanation: "The perceived pitch is the average: f_perceived = (f₁ + f₂)/2. The beat is just the amplitude modulation." },
    { question: "Two violin strings are 440 Hz and 443 Hz. The beat frequency will be:", options: [{ text: "The beat frequency is 3 Hz (3 pulses per second)", correct: true }, { text: "The beat frequency is 441.5 Hz (the average)", correct: false }, { text: "The beat frequency is 883 Hz (the sum)", correct: false }, { text: "The beat frequency is 0 Hz (no beats)", correct: false }], explanation: "Beat frequency = |443 - 440| = 3 Hz. The strings will create 3 pulsations every second." },
    { question: "Why are beats useful for tuning instruments?", options: [{ text: "They amplify the sound making it louder", correct: false }, { text: "Zero beats indicates frequencies match exactly", correct: true }, { text: "They create pleasing harmonic sounds", correct: false }, { text: "They add resonance to the instrument", correct: false }], explanation: "When beats disappear (beat frequency = 0), the two frequencies are identical - perfect tuning!" },
    { question: "As two frequencies get closer together, what happens to beats?", options: [{ text: "The beats become faster and more frequent", correct: false }, { text: "The beats become slower and less frequent", correct: true }, { text: "The beat rate stays exactly the same", correct: false }, { text: "The beats disappear in a random pattern", correct: false }], explanation: "Beat frequency = |f₂ - f₁|. Smaller difference = slower beats. When equal, beats stop." },
    { question: "Can you hear beats with frequencies 200 Hz and 400 Hz?", options: [{ text: "Yes, you hear 200 Hz beat pulsations", correct: false }, { text: "Yes, you hear 600 Hz beat pulsations", correct: false }, { text: "No, the frequency difference is too large to perceive as beats", correct: true }, { text: "Yes, you hear 300 Hz beat pulsations", correct: false }], explanation: "Beats are only audible when the frequency difference is small (typically < 20 Hz). 200 Hz difference is perceived as two separate tones." },
    { question: "What is the mathematical formula for beat frequency?", options: [{ text: "Beat frequency equals f₁ + f₂ (sum)", correct: false }, { text: "Beat frequency equals f₁ × f₂ (product)", correct: false }, { text: "Beat frequency equals |f₁ - f₂| (absolute difference)", correct: true }, { text: "Beat frequency equals (f₁ + f₂)/2 (average)", correct: false }], explanation: "Beat frequency = |f₁ - f₂|, the absolute difference between the two frequencies." }
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
      stat: 'Precision: 0.5 Hz accuracy at 440 Hz standard pitch',
      stats: 'Used by 50 million musicians worldwide, detects 5 ms timing differences, over 200 billion tuning events yearly',
      color: design.colors.accentPrimary
    },
    {
      id: 'radar',
      title: 'Doppler Radar',
      subtitle: 'Speed Detection & Weather',
      description: 'Police radar guns and weather radar both rely on beat frequencies. When a radio wave bounces off a moving object, its frequency shifts slightly (Doppler effect). The radar compares transmitted and received frequencies - the beat frequency reveals the target\'s speed.',
      howItWorks: 'A radar gun transmits at 24.15 GHz. A car approaching at 60 mph shifts this by about 2,144 Hz. The gun measures this tiny beat frequency and converts it to speed. Faster car = higher beat frequency.',
      examples: ['Police speed guns', 'Baseball pitch speed', 'Weather radar (rain movement)', 'Air traffic control'],
      stat: 'Speed detection up to 200 mph with 1 mph accuracy',
      stats: 'Operates at 24 GHz, detects speeds from 5 km to 400 km range, precision within 1 km accuracy',
      color: design.colors.cyan
    },
    {
      id: 'music',
      title: 'Music Production',
      subtitle: 'Synthesizers & Sound Design',
      description: 'Electronic musicians intentionally create beat frequencies for artistic effect. By slightly detuning two oscillators (e.g., 440 Hz and 441 Hz), they create a 1 Hz pulsation that adds warmth and movement to sounds. This "detune" effect is fundamental to analog synthesizer sounds.',
      howItWorks: 'Classic synth patches use 2-7 Hz detuning for "fat" bass sounds. Faster detuning (10-20 Hz) creates aggressive timbres. The "supersaw" sound in EDM uses 7 detuned oscillators creating complex beat patterns.',
      examples: ['Analog synth warmth', 'Dubstep wobble bass', 'Tremolo guitar effects', 'Binaural beats meditation'],
      stat: 'Typical detune range: 1-7 Hz for warmth effects',
      stats: 'Produces sounds at 20 MHz sample rate, 10 billion songs use this technique, consumes only 5 W of power',
      color: design.colors.success
    },
    {
      id: 'medical',
      title: 'Medical Ultrasound',
      subtitle: 'Blood Flow & Heart Monitoring',
      description: 'Doppler ultrasound measures blood flow velocity using beat frequencies. The device sends ultrasound into blood vessels. Red blood cells reflect the sound, but because they\'re moving, the reflected frequency is shifted. The beat frequency between transmitted and received waves reveals blood speed.',
      howItWorks: 'Ultrasound at 5 MHz hits blood cells moving at 50 cm/s. The reflected wave is shifted by about 3,200 Hz. This beat frequency is converted to an audible "whoosh" sound and displayed as a velocity graph. Doctors can detect blockages, valve problems, and fetal heartbeats.',
      examples: ['Fetal heart monitoring', 'Detecting blood clots', 'Heart valve assessment', 'Vascular surgery planning'],
      stat: 'Detects blood flow velocities from 1 cm/s to 200 cm/s',
      stats: 'Operates at 5 MHz frequency, detects flow to 2 m depth, over 100 million scans performed yearly',
      color: design.colors.warning
    }
  ];

  // Common styles
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: '600px',
    background: `linear-gradient(145deg, ${design.colors.bgDeep} 0%, ${design.colors.bgPrimary} 50%, ${design.colors.bgSecondary} 100%)`,
    fontFamily: design.font.sans,
    color: design.colors.textPrimary,
    overflow: 'hidden'
  };

  // Progress bar with navigation dots
  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const progressPercent = ((currentIndex + 1) / phaseOrder.length) * 100;
    return (
      <div style={{
        padding: '16px 24px',
        background: design.colors.bgCard,
        borderBottom: `1px solid ${design.colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative'
      }}>
        {/* Progress bar indicator */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: `${progressPercent}%`,
          height: '3px',
          background: design.colors.accentPrimary,
          transition: 'width 0.3s ease'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: design.colors.accentPrimary }}>
            Beats
          </span>
          {/* Navigation dots - clickable */}
          <div style={{ display: 'flex', gap: '6px' }} role="navigation" aria-label="Phase navigation">
            {phaseOrder.map((p, idx) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                title={phaseLabels[p]}
                aria-label={phaseLabels[p]}
                style={{
                  width: p === phase ? '24px' : '12px',
                  height: '12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: idx < currentIndex ? design.colors.success : p === phase ? design.colors.accentPrimary : design.colors.bgElevated,
                  transition: 'all 0.3s ease',
                  padding: 0
                }}
              />
            ))}
          </div>
        </div>
        {/* Back and navigation buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={goBack}
            disabled={currentIndex === 0}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: design.radius.sm,
              border: `1px solid ${design.colors.border}`,
              background: 'transparent',
              color: currentIndex === 0 ? design.colors.textMuted : design.colors.textSecondary,
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              opacity: currentIndex === 0 ? 0.5 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            Back
          </button>
          <span style={{ fontSize: '12px', color: design.colors.textMuted }}>
            {currentIndex + 1} / {phaseOrder.length}
          </span>
        </div>
      </div>
    );
  };

  // Beats visualization - Premium quality SVG graphics
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

    // Beat envelope (upper)
    const generateEnvelopeUpper = () => {
      const points: string[] = [];
      for (let x = 0; x <= width; x += 4) {
        const t = x * timeScale + time;
        const envelope = Math.abs(Math.cos(Math.PI * beatFrequency * t * 0.005));
        const y = 170 - (amp1 + amp2) * envelope / 2;
        points.push(`${x},${y}`);
      }
      return `M ${points.join(' L ')}`;
    };

    // Beat envelope (lower)
    const generateEnvelopeLower = () => {
      const points: string[] = [];
      for (let x = 0; x <= width; x += 4) {
        const t = x * timeScale + time;
        const envelope = Math.abs(Math.cos(Math.PI * beatFrequency * t * 0.005));
        const y = 170 + (amp1 + amp2) * envelope / 2;
        points.push(`${x},${y}`);
      }
      return `M ${points.join(' L ')}`;
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', maxHeight: '320px' }}>
        {/* Frequency labels outside SVG using typo system */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: `0 ${typo.pagePadding}`,
          marginBottom: typo.elementGap
        }}>
          <div style={{ display: 'flex', gap: typo.sectionGap }}>
            <span style={{
              fontSize: typo.small,
              fontWeight: 600,
              color: design.colors.accentPrimary,
              fontFamily: design.font.mono
            }}>
              f1 = {freq1} Hz
            </span>
            <span style={{
              fontSize: typo.small,
              fontWeight: 600,
              color: design.colors.cyan,
              fontFamily: design.font.mono
            }}>
              f2 = {freq2} Hz
            </span>
          </div>
          <div style={{
            padding: '8px 16px',
            borderRadius: design.radius.md,
            background: design.colors.bgCard,
            border: `1px solid ${design.colors.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: typo.label, color: design.colors.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Beat</span>
            <span style={{ fontSize: typo.heading, fontWeight: 800, color: design.colors.warning, fontFamily: design.font.mono }}>{beatFrequency} Hz</span>
          </div>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', flex: 1 }}>
          <defs>
            {/* Premium Wave 1 gradient - Teal/Cyan with 4 stops */}
            <linearGradient id="beatsWave1Grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#5eead4" stopOpacity="0.6" />
              <stop offset="30%" stopColor={design.colors.accentPrimary} stopOpacity="0.9" />
              <stop offset="70%" stopColor={design.colors.accentSecondary} stopOpacity="1" />
              <stop offset="100%" stopColor="#5eead4" stopOpacity="0.6" />
            </linearGradient>

            {/* Premium Wave 2 gradient - Cyan/Blue with 4 stops */}
            <linearGradient id="beatsWave2Grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.6" />
              <stop offset="30%" stopColor={design.colors.cyan} stopOpacity="0.9" />
              <stop offset="70%" stopColor="#0ea5e9" stopOpacity="1" />
              <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.6" />
            </linearGradient>

            {/* Premium Combined wave gradient - Emerald with 4 stops */}
            <linearGradient id="beatsCombinedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.7" />
              <stop offset="30%" stopColor={design.colors.success} stopOpacity="0.95" />
              <stop offset="70%" stopColor="#059669" stopOpacity="1" />
              <stop offset="100%" stopColor="#6ee7b7" stopOpacity="0.7" />
            </linearGradient>

            {/* Envelope gradient - Warning/Amber */}
            <linearGradient id="beatsEnvelopeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.3" />
              <stop offset="50%" stopColor={design.colors.warning} stopOpacity="0.6" />
              <stop offset="100%" stopColor="#fcd34d" stopOpacity="0.3" />
            </linearGradient>

            {/* Background gradient for premium depth */}
            <linearGradient id="beatsBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={design.colors.bgDeep} />
              <stop offset="50%" stopColor="#031a17" />
              <stop offset="100%" stopColor={design.colors.bgDeep} />
            </linearGradient>

            {/* Wave glow filter with blur and merge */}
            <filter id="beatsWaveGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Intense glow for combined wave */}
            <filter id="beatsCombinedGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Subtle glow for envelope */}
            <filter id="beatsEnvelopeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Grid pattern */}
            <pattern id="beatsGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke={design.colors.border} strokeWidth="0.3" strokeOpacity="0.2" />
            </pattern>
          </defs>

          {/* Premium background with gradient */}
          <rect x="0" y="0" width={width} height={height} fill="url(#beatsBgGrad)" rx="12" />
          <rect x="0" y="0" width={width} height={height} fill="url(#beatsGrid)" rx="12" />

          {/* Wave 1 section */}
          <g>
            {/* Center line */}
            <line x1="0" y1="40" x2={width} y2="40" stroke={design.colors.border} strokeWidth="0.5" opacity="0.4" />
            {/* Wave with glow */}
            <path
              d={generateWavePath(freq1, amp1 * 0.5, 40)}
              fill="none"
              stroke="url(#beatsWave1Grad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#beatsWaveGlow)"
            />
          </g>

          {/* Wave 2 section */}
          <g>
            {/* Center line */}
            <line x1="0" y1="90" x2={width} y2="90" stroke={design.colors.border} strokeWidth="0.5" opacity="0.4" />
            {/* Wave with glow */}
            <path
              d={generateWavePath(freq2, amp2 * 0.5, 90)}
              fill="none"
              stroke="url(#beatsWave2Grad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#beatsWaveGlow)"
            />
          </g>

          {/* Separator line */}
          <line x1="20" y1="125" x2={width - 20} y2="125" stroke={design.colors.border} strokeWidth="1" opacity="0.3" />
          <text x={width / 2} y="128" textAnchor="middle" fill={design.colors.textMuted} fontSize="8" fontWeight="600" opacity="0.6">SUPERPOSITION</text>

          {/* Combined wave section with envelope */}
          <g>
            {/* Center line */}
            <line x1="0" y1="170" x2={width} y2="170" stroke={design.colors.border} strokeWidth="0.5" opacity="0.4" />

            {/* Beat envelope - upper and lower bounds with glow */}
            <path
              d={generateEnvelopeUpper()}
              fill="none"
              stroke="url(#beatsEnvelopeGrad)"
              strokeWidth="1.5"
              strokeDasharray="8,4"
              strokeLinecap="round"
              filter="url(#beatsEnvelopeGlow)"
            />
            <path
              d={generateEnvelopeLower()}
              fill="none"
              stroke="url(#beatsEnvelopeGrad)"
              strokeWidth="1.5"
              strokeDasharray="8,4"
              strokeLinecap="round"
              filter="url(#beatsEnvelopeGlow)"
            />

            {/* Combined wave with intense glow */}
            <path
              d={generateBeatPath()}
              fill="none"
              stroke="url(#beatsCombinedGrad)"
              strokeWidth="3"
              strokeLinecap="round"
              filter="url(#beatsCombinedGlow)"
            />
          </g>

          {/* Wave labels inside SVG - minimal */}
          <text x="8" y="44" fill={design.colors.accentPrimary} fontSize="9" fontWeight="600" opacity="0.8">Wave 1</text>
          <text x="8" y="94" fill={design.colors.cyan} fontSize="9" fontWeight="600" opacity="0.8">Wave 2</text>
          <text x="8" y="174" fill={design.colors.success} fontSize="9" fontWeight="600" opacity="0.8">Combined</text>
        </svg>
      </div>
    );
  };

  // Application tab SVG graphics - Premium quality
  const renderApplicationGraphic = () => {
    const app = applications[activeApp];

    if (app.id === 'tuning') {
      return (
        <svg viewBox="0 0 300 200" style={{ width: '100%', height: '160px' }}>
          <defs>
            {/* Premium background gradient */}
            <linearGradient id="beatsTuningBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={design.colors.bgDeep} />
              <stop offset="50%" stopColor="#031a17" />
              <stop offset="100%" stopColor={design.colors.bgDeep} />
            </linearGradient>

            {/* Tuning fork 1 gradient - Teal */}
            <linearGradient id="beatsFork1Grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5eead4" />
              <stop offset="40%" stopColor={design.colors.accentPrimary} />
              <stop offset="100%" stopColor="#0d9488" />
            </linearGradient>

            {/* Tuning fork 2 gradient - Cyan */}
            <linearGradient id="beatsFork2Grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="40%" stopColor={design.colors.cyan} />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>

            {/* Sound wave glow */}
            <filter id="beatsSoundGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Interference glow */}
            <radialGradient id="beatsInterferenceGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={design.colors.success} stopOpacity="0.6" />
              <stop offset="50%" stopColor={design.colors.success} stopOpacity="0.2" />
              <stop offset="100%" stopColor={design.colors.success} stopOpacity="0" />
            </radialGradient>

            {/* Metal handle gradient */}
            <linearGradient id="beatsMetalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="30%" stopColor="#4b5563" />
              <stop offset="70%" stopColor="#374151" />
              <stop offset="100%" stopColor="#4b5563" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="300" height="200" fill="url(#beatsTuningBg)" rx="12" />

          {/* Interference zone glow */}
          <ellipse cx="150" cy="60" rx="40" ry="35" fill="url(#beatsInterferenceGlow)" />

          {/* Tuning fork 1 */}
          <g transform="translate(80, 50)">
            <rect x="-5" y="0" width="10" height="80" rx="3" fill="url(#beatsMetalGrad)" />
            <rect x="-15" y="-40" width="10" height="50" rx="2" fill="url(#beatsFork1Grad)" filter="url(#beatsSoundGlow)">
              <animate attributeName="x" values="-15;-13;-15;-17;-15" dur="0.5s" repeatCount="indefinite" />
            </rect>
            <rect x="5" y="-40" width="10" height="50" rx="2" fill="url(#beatsFork1Grad)" filter="url(#beatsSoundGlow)">
              <animate attributeName="x" values="5;7;5;3;5" dur="0.5s" repeatCount="indefinite" />
            </rect>
          </g>

          {/* Tuning fork 2 */}
          <g transform="translate(220, 50)">
            <rect x="-5" y="0" width="10" height="80" rx="3" fill="url(#beatsMetalGrad)" />
            <rect x="-15" y="-40" width="10" height="50" rx="2" fill="url(#beatsFork2Grad)" filter="url(#beatsSoundGlow)">
              <animate attributeName="x" values="-15;-14;-15;-16;-15" dur="0.48s" repeatCount="indefinite" />
            </rect>
            <rect x="5" y="-40" width="10" height="50" rx="2" fill="url(#beatsFork2Grad)" filter="url(#beatsSoundGlow)">
              <animate attributeName="x" values="5;6;5;4;5" dur="0.48s" repeatCount="indefinite" />
            </rect>
          </g>

          {/* Sound waves meeting with glow */}
          <g transform="translate(150, 60)">
            {[0, 1, 2].map((i) => (
              <circle key={i} cx="0" cy="0" r={20 + i * 15} fill="none" stroke={design.colors.success} strokeWidth="2" filter="url(#beatsSoundGlow)" opacity={0.6 - i * 0.15}>
                <animate attributeName="r" values={`${20 + i * 15};${30 + i * 15};${20 + i * 15}`} dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" values={`${0.6 - i * 0.15};${0.3 - i * 0.1};${0.6 - i * 0.15}`} dur="1s" repeatCount="indefinite" />
              </circle>
            ))}
          </g>

          {/* Frequency labels */}
          <text x="80" y="150" textAnchor="middle" fill={design.colors.accentPrimary} fontSize="11" fontWeight="600">440 Hz</text>
          <text x="220" y="150" textAnchor="middle" fill={design.colors.cyan} fontSize="11" fontWeight="600">444 Hz</text>

          {/* Beat frequency display */}
          <rect x="100" y="165" width="100" height="28" rx="6" fill={design.colors.bgCard} stroke={design.colors.border} strokeWidth="1" />
          <text x="150" y="177" textAnchor="middle" fill={design.colors.textMuted} fontSize="8" fontWeight="600">BEAT FREQUENCY</text>
          <text x="150" y="189" textAnchor="middle" fill={design.colors.warning} fontSize="11" fontWeight="700">4 Hz</text>
        </svg>
      );
    }

    if (app.id === 'radar') {
      return (
        <svg viewBox="0 0 300 200" style={{ width: '100%', height: '160px' }}>
          <defs>
            {/* Premium background */}
            <linearGradient id="beatsRadarBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={design.colors.bgDeep} />
              <stop offset="50%" stopColor="#0a1628" />
              <stop offset="100%" stopColor={design.colors.bgDeep} />
            </linearGradient>

            {/* Transmitted wave gradient */}
            <linearGradient id="beatsTransmitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={design.colors.accentPrimary} stopOpacity="0.9" />
              <stop offset="50%" stopColor={design.colors.accentSecondary} stopOpacity="1" />
              <stop offset="100%" stopColor={design.colors.accentPrimary} stopOpacity="0.4" />
            </linearGradient>

            {/* Reflected wave gradient */}
            <linearGradient id="beatsReflectGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={design.colors.cyan} stopOpacity="0.4" />
              <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.8" />
              <stop offset="100%" stopColor={design.colors.cyan} stopOpacity="0.9" />
            </linearGradient>

            {/* Car gradient */}
            <linearGradient id="beatsCarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="50%" stopColor={design.colors.warning} />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            {/* Wave glow filter */}
            <filter id="beatsRadarGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Radar gun metal */}
            <linearGradient id="beatsGunMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="50%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="300" height="200" fill="url(#beatsRadarBg)" rx="12" />

          {/* Radar gun */}
          <g transform="translate(40, 75)">
            <rect x="0" y="0" width="55" height="35" rx="6" fill="url(#beatsGunMetal)" stroke={design.colors.border} strokeWidth="1" />
            <rect x="50" y="8" width="25" height="19" rx="3" fill={design.colors.cyan} filter="url(#beatsRadarGlow)" />
            <circle cx="62" cy="17" r="5" fill={design.colors.accentPrimary}>
              <animate attributeName="opacity" values="1;0.4;1" dur="0.3s" repeatCount="indefinite" />
              <animate attributeName="r" values="5;6;5" dur="0.3s" repeatCount="indefinite" />
            </circle>
            {/* Display */}
            <rect x="8" y="8" width="35" height="18" rx="2" fill={design.colors.bgDeep} />
            <text x="25" y="20" textAnchor="middle" fill={design.colors.success} fontSize="8" fontFamily={design.font.mono}>72 mph</text>
          </g>

          {/* Transmitted waves */}
          {[0, 1, 2, 3].map((i) => (
            <path
              key={i}
              d={`M 75 93 Q ${105 + i * 28} ${82 + 6 * Math.sin(time * 10 + i)} ${135 + i * 28} 93`}
              fill="none"
              stroke="url(#beatsTransmitGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#beatsRadarGlow)"
              opacity={0.9 - i * 0.15}
            />
          ))}

          {/* Car */}
          <g transform="translate(210, 70)">
            <rect x="0" y="12" width="55" height="28" rx="5" fill="url(#beatsCarGrad)" />
            <rect x="5" y="5" width="45" height="18" rx="4" fill="#fef3c7" />
            {/* Windows */}
            <rect x="10" y="8" width="15" height="12" rx="2" fill="#0ea5e9" opacity="0.4" />
            <rect x="28" y="8" width="18" height="12" rx="2" fill="#0ea5e9" opacity="0.4" />
            {/* Wheels */}
            <circle cx="15" cy="40" r="9" fill="#1f2937" />
            <circle cx="15" cy="40" r="5" fill="#4b5563" />
            <circle cx="40" cy="40" r="9" fill="#1f2937" />
            <circle cx="40" cy="40" r="5" fill="#4b5563" />
            {/* Motion lines */}
            <line x1="58" y1="22" x2="75" y2="22" stroke={design.colors.textMuted} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            <line x1="58" y1="30" x2="68" y2="30" stroke={design.colors.textMuted} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
          </g>

          {/* Reflected waves (shifted frequency) */}
          {[0, 1, 2].map((i) => (
            <path
              key={`r${i}`}
              d={`M 200 93 Q ${172 - i * 28} ${104 + 6 * Math.sin(time * 10 + i)} ${145 - i * 28} 93`}
              fill="none"
              stroke="url(#beatsReflectGrad)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="6,4"
              filter="url(#beatsRadarGlow)"
              opacity={0.7 - i * 0.15}
            />
          ))}

          {/* Info panel */}
          <rect x="85" y="145" width="130" height="48" rx="8" fill={design.colors.bgCard} stroke={design.colors.border} strokeWidth="1" />
          <text x="150" y="160" textAnchor="middle" fill={design.colors.textMuted} fontSize="8" fontWeight="600">DOPPLER BEAT</text>
          <text x="150" y="177" textAnchor="middle" fill={design.colors.warning} fontSize="14" fontWeight="700">72 mph</text>
          <text x="150" y="189" textAnchor="middle" fill={design.colors.textMuted} fontSize="7">v = c * f_beat / 2f0</text>
        </svg>
      );
    }

    if (app.id === 'music') {
      return (
        <svg viewBox="0 0 300 200" style={{ width: '100%', height: '160px' }}>
          <defs>
            {/* Premium background */}
            <linearGradient id="beatsMusicBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={design.colors.bgDeep} />
              <stop offset="50%" stopColor="#0a1a14" />
              <stop offset="100%" stopColor={design.colors.bgDeep} />
            </linearGradient>

            {/* Synth body gradient */}
            <linearGradient id="beatsSynthGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="30%" stopColor="#1f2937" />
              <stop offset="70%" stopColor="#111827" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Sound wave pulse */}
            <radialGradient id="beatsPulseGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={design.colors.success} stopOpacity="0.8" />
              <stop offset="40%" stopColor={design.colors.success} stopOpacity="0.3" />
              <stop offset="100%" stopColor={design.colors.success} stopOpacity="0" />
            </radialGradient>

            {/* Glow filter */}
            <filter id="beatsMusicGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* LED glow */}
            <filter id="beatsLedGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect x="0" y="0" width="300" height="200" fill="url(#beatsMusicBg)" rx="12" />

          {/* Sound wave pulses */}
          {[0, 1, 2, 3].map((i) => {
            const modulation = Math.sin(time * 3) * 0.5 + 0.5;
            return (
              <circle
                key={i}
                cx="150"
                cy="35"
                r={8 + i * 14}
                fill="none"
                stroke={design.colors.success}
                strokeWidth="2"
                filter="url(#beatsMusicGlow)"
                opacity={(0.7 - i * 0.15) * modulation}
              />
            );
          })}

          {/* Synthesizer */}
          <rect x="45" y="58" width="210" height="90" rx="10" fill="url(#beatsSynthGrad)" stroke={design.colors.border} strokeWidth="2" />

          {/* Top panel */}
          <rect x="55" y="65" width="190" height="35" rx="4" fill={design.colors.bgDeep} />

          {/* Oscillator displays */}
          <g transform="translate(65, 72)">
            <rect x="0" y="0" width="75" height="22" rx="3" fill="#0a0f14" stroke={design.colors.accentPrimary} strokeWidth="1" strokeOpacity="0.5" />
            <text x="37" y="9" textAnchor="middle" fill={design.colors.textMuted} fontSize="6" fontWeight="600">OSC 1</text>
            <text x="37" y="18" textAnchor="middle" fill={design.colors.accentPrimary} fontSize="10" fontWeight="700" filter="url(#beatsLedGlow)">440 Hz</text>
          </g>
          <g transform="translate(160, 72)">
            <rect x="0" y="0" width="75" height="22" rx="3" fill="#0a0f14" stroke={design.colors.cyan} strokeWidth="1" strokeOpacity="0.5" />
            <text x="37" y="9" textAnchor="middle" fill={design.colors.textMuted} fontSize="6" fontWeight="600">OSC 2</text>
            <text x="37" y="18" textAnchor="middle" fill={design.colors.cyan} fontSize="10" fontWeight="700" filter="url(#beatsLedGlow)">443 Hz</text>
          </g>

          {/* LED indicators */}
          <circle cx="250" y="80" r="3" fill={design.colors.success} filter="url(#beatsLedGlow)">
            <animate attributeName="opacity" values="1;0.5;1" dur="0.5s" repeatCount="indefinite" />
          </circle>

          {/* Keys */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <g key={i}>
              <rect
                x={58 + i * 19}
                y="105"
                width="15"
                height="38"
                rx="2"
                fill={i % 2 === 0 ? '#fafaf9' : '#1f2937'}
                stroke={design.colors.border}
                strokeWidth="0.5"
              />
              {/* Key pressed effect */}
              {i === 4 && (
                <rect
                  x={58 + i * 19}
                  y="107"
                  width="15"
                  height="36"
                  rx="2"
                  fill={design.colors.accentPrimary}
                  opacity="0.3"
                />
              )}
            </g>
          ))}

          {/* Beat indicator */}
          <rect x="100" y="160" width="100" height="32" rx="8" fill={design.colors.bgCard} stroke={design.colors.border} strokeWidth="1" />
          <text x="150" y="173" textAnchor="middle" fill={design.colors.textMuted} fontSize="7" fontWeight="600">DETUNE BEAT</text>
          <text x="150" y="186" textAnchor="middle" fill={design.colors.success} fontSize="12" fontWeight="700">3 Hz pulse</text>
        </svg>
      );
    }

    if (app.id === 'medical') {
      return (
        <svg viewBox="0 0 300 200" style={{ width: '100%', height: '160px' }}>
          <defs>
            {/* Premium background */}
            <linearGradient id="beatsMedicalBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={design.colors.bgDeep} />
              <stop offset="50%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor={design.colors.bgDeep} />
            </linearGradient>

            {/* Ultrasound wave gradient */}
            <linearGradient id="beatsUltrasoundGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={design.colors.warning} stopOpacity="0.9" />
              <stop offset="50%" stopColor="#fcd34d" stopOpacity="1" />
              <stop offset="100%" stopColor={design.colors.warning} stopOpacity="0.4" />
            </linearGradient>

            {/* Reflected wave gradient */}
            <linearGradient id="beatsEchoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={design.colors.accentPrimary} stopOpacity="0.4" />
              <stop offset="50%" stopColor={design.colors.accentSecondary} stopOpacity="0.8" />
              <stop offset="100%" stopColor={design.colors.accentPrimary} stopOpacity="0.9" />
            </linearGradient>

            {/* Blood vessel gradient */}
            <linearGradient id="beatsVesselGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>

            {/* Blood cell gradient */}
            <radialGradient id="beatsCellGrad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#991b1b" />
            </radialGradient>

            {/* Probe gradient */}
            <linearGradient id="beatsProbeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="50%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>

            {/* Glow filter */}
            <filter id="beatsMedGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect x="0" y="0" width="300" height="200" fill="url(#beatsMedicalBg)" rx="12" />

          {/* Ultrasound probe */}
          <g transform="translate(45, 60)">
            <rect x="0" y="0" width="35" height="70" rx="6" fill="url(#beatsProbeGrad)" stroke={design.colors.border} strokeWidth="1" />
            {/* Emitter surface */}
            <rect x="5" y="62" width="25" height="8" rx="2" fill={design.colors.warning} filter="url(#beatsMedGlow)">
              <animate attributeName="opacity" values="0.8;1;0.8" dur="0.3s" repeatCount="indefinite" />
            </rect>
            {/* Display */}
            <rect x="5" y="8" width="25" height="18" rx="2" fill={design.colors.bgDeep} />
            <text x="17" y="20" textAnchor="middle" fill={design.colors.success} fontSize="6" fontFamily={design.font.mono}>5MHz</text>
            {/* LED */}
            <circle cx="17" cy="32" r="3" fill={design.colors.success} filter="url(#beatsMedGlow)">
              <animate attributeName="opacity" values="1;0.4;1" dur="0.5s" repeatCount="indefinite" />
            </circle>
          </g>

          {/* Sound waves going in */}
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={`M 80 100 Q ${102 + i * 22} ${88 + 6 * Math.sin(time * 8 + i)} ${125 + i * 22} 100`}
              fill="none"
              stroke="url(#beatsUltrasoundGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#beatsMedGlow)"
              opacity={0.9 - i * 0.2}
            />
          ))}

          {/* Blood vessel */}
          <g transform="translate(168, 55)">
            {/* Outer wall */}
            <ellipse cx="45" cy="45" rx="55" ry="40" fill="none" stroke="url(#beatsVesselGrad)" strokeWidth="4" />
            {/* Inner space */}
            <ellipse cx="45" cy="45" rx="40" ry="30" fill={design.colors.bgDeep} />

            {/* Blood cells moving */}
            {[0, 1, 2, 3, 4].map((i) => {
              const pos = (time * 25 + i * 18) % 80;
              return (
                <ellipse
                  key={i}
                  cx={10 + pos}
                  cy={45 + 12 * Math.sin(pos * 0.08)}
                  rx="5"
                  ry="4"
                  fill="url(#beatsCellGrad)"
                />
              );
            })}
          </g>

          {/* Reflected waves */}
          {[0, 1, 2].map((i) => (
            <path
              key={`r${i}`}
              d={`M 168 100 Q ${146 - i * 22} ${112 + 6 * Math.sin(time * 8 + i)} ${124 - i * 22} 100`}
              fill="none"
              stroke="url(#beatsEchoGrad)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="6,4"
              filter="url(#beatsMedGlow)"
              opacity={0.7 - i * 0.2}
            />
          ))}

          {/* Info panel */}
          <rect x="80" y="145" width="140" height="48" rx="8" fill={design.colors.bgCard} stroke={design.colors.border} strokeWidth="1" />
          <text x="150" y="160" textAnchor="middle" fill={design.colors.textMuted} fontSize="7" fontWeight="600">DOPPLER ULTRASOUND</text>
          <text x="150" y="177" textAnchor="middle" fill={design.colors.error} fontSize="14" fontWeight="700">0.8 m/s</text>
          <text x="150" y="189" textAnchor="middle" fill={design.colors.textMuted} fontSize="7">Blood flow velocity</text>
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

  // ============================================================================
  // TEST QUESTIONS - Scenario-based multiple choice for deep understanding
  // ============================================================================
  const testQuestions = [
    // Q1: Core Concept - Easy
    {
      scenario: "You're tuning a guitar and play two strings together. One is at 440 Hz (A4) and the other is slightly out of tune at 444 Hz.",
      question: "What will you hear?",
      options: [
        { id: 'a', label: "A single pure tone at 442 Hz" },
        { id: 'b', label: "A tone that pulses louder and softer 4 times per second", correct: true },
        { id: 'c', label: "Two completely separate tones" },
        { id: 'd', label: "White noise" },
      ],
      explanation: "The beat frequency equals the difference between the two frequencies: 444 - 440 = 4 Hz. This creates a pulsating sound that gets louder and softer 4 times per second, which musicians use to tune instruments."
    },
    // Q2: Understanding beat frequency formula - Medium
    {
      scenario: "A physics student plays two tuning forks simultaneously. One is labeled 512 Hz and the other 520 Hz. She counts the pulsations she hears.",
      question: "How many beats per second will she count?",
      options: [
        { id: 'a', label: "516 beats per second" },
        { id: 'b', label: "1032 beats per second" },
        { id: 'c', label: "8 beats per second", correct: true },
        { id: 'd', label: "4 beats per second" },
      ],
      explanation: "Beat frequency is calculated as |f₁ - f₂| = |520 - 512| = 8 Hz. The student will hear 8 distinct pulsations (loudness variations) every second, not a tone at 516 Hz (which is the average perceived pitch)."
    },
    // Q3: Practical application - piano tuning - Medium
    {
      scenario: "A piano tuner strikes a 440 Hz tuning fork and a piano key simultaneously. She hears 6 beats per second. After tightening the piano string slightly, she now hears 2 beats per second.",
      question: "What should she do next to achieve perfect tuning?",
      options: [
        { id: 'a', label: "Loosen the string significantly" },
        { id: 'b', label: "Continue tightening the string slightly", correct: true },
        { id: 'c', label: "The string is now perfectly tuned" },
        { id: 'd', label: "Replace the tuning fork" },
      ],
      explanation: "The beats slowed from 6 to 2 per second, meaning the frequency difference decreased. She's moving in the right direction! She should continue tightening (same direction) until beats disappear completely (0 Hz difference = perfect tune)."
    },
    // Q4: Aircraft engine synchronization - Medium-Hard
    {
      scenario: "A pilot notices an annoying pulsating drone in the cockpit of a twin-engine aircraft. The left engine runs at 2400 RPM and the right at 2406 RPM.",
      question: "What is causing the pulsating sound and how many pulses occur per second?",
      options: [
        { id: 'a', label: "Engine vibration causing 2403 pulses per second" },
        { id: 'b', label: "Beat frequency between engine sounds causing 0.1 pulses per second", correct: true },
        { id: 'c', label: "Propeller interference causing 6 pulses per second" },
        { id: 'd', label: "Cabin pressure changes causing 40 pulses per second" },
      ],
      explanation: "The engines produce sound at 2400/60 = 40 Hz and 2406/60 = 40.1 Hz. Beat frequency = |40.1 - 40| = 0.1 Hz, meaning one pulsation every 10 seconds. Pilots sync engines to eliminate this annoying beat."
    },
    // Q5: Medical ultrasound applications - Hard
    {
      scenario: "A Doppler ultrasound device transmits at 5 MHz into a blood vessel. The reflected signal from moving blood cells returns at 5.003 MHz.",
      question: "What information does the 3 kHz beat frequency provide to the doctor?",
      options: [
        { id: 'a', label: "The exact location of the blood vessel" },
        { id: 'b', label: "The velocity of blood flow in the vessel", correct: true },
        { id: 'c', label: "The diameter of blood cells" },
        { id: 'd', label: "The oxygen content of the blood" },
      ],
      explanation: "The beat frequency (3 kHz = 5.003 MHz - 5 MHz) results from the Doppler shift caused by moving blood cells. Using the Doppler equation, doctors can calculate blood flow velocity from this beat frequency, detecting blockages or abnormal flow patterns."
    },
    // Q6: Doppler radar using beats - Hard
    {
      scenario: "A police radar gun transmits at 24.150 GHz. When pointed at an approaching car, the returned signal shows a beat frequency of 3,220 Hz.",
      question: "What physical principle allows the radar to determine the car's speed from this beat frequency?",
      options: [
        { id: 'a', label: "The car absorbs specific frequencies based on its speed" },
        { id: 'b', label: "The Doppler effect shifts the reflected frequency, and the beat frequency is proportional to speed", correct: true },
        { id: 'c', label: "The radar measures the time delay of the signal" },
        { id: 'd', label: "The beat frequency equals the car's speed in Hz" },
      ],
      explanation: "The Doppler effect shifts the reflected wave's frequency proportionally to the car's velocity. The beat frequency between transmitted and received signals is directly proportional to speed: v = (c × f_beat)/(2 × f_transmitted). This allows precise speed measurement."
    },
    // Q7: Interference patterns relationship - Medium
    {
      scenario: "Two speakers play tones of 500 Hz and 502 Hz. A student walks between them and notices the sound getting louder and softer as she moves.",
      question: "What is the relationship between what she hears while stationary versus while walking?",
      options: [
        { id: 'a', label: "Walking reveals spatial interference patterns, while standing reveals temporal beats - both from the same wave superposition", correct: true },
        { id: 'b', label: "Walking creates new frequencies that weren't there before" },
        { id: 'c', label: "The two effects are completely unrelated phenomena" },
        { id: 'd', label: "Walking averages out the beats so she hears constant loudness" },
      ],
      explanation: "Both effects stem from wave superposition. Temporal beats (2 Hz pulsation when stationary) come from the time-varying phase difference. Spatial variation (loudness changes while walking) comes from position-dependent constructive and destructive interference patterns."
    },
    // Q8: Why beats disappear at large frequency differences - Medium
    {
      scenario: "A musician plays two notes: one at 262 Hz (middle C) and one at 330 Hz (E above middle C). She expects to hear beats but instead hears two distinct pitches.",
      question: "Why doesn't she perceive beats between these two frequencies?",
      options: [
        { id: 'a', label: "The frequencies are too close together" },
        { id: 'b', label: "Beats only occur with identical frequencies" },
        { id: 'c', label: "The 68 Hz beat frequency is too fast to perceive as pulsation; the ear hears it as a separate tone or roughness", correct: true },
        { id: 'd', label: "Musical notes cannot produce beats" },
      ],
      explanation: "Beat frequency = |330 - 262| = 68 Hz. The human ear can only perceive beats as distinct pulsations up to about 15-20 Hz. Above that, the rapid fluctuations are perceived as roughness, then as a separate tone. This is why beats are useful only for small frequency differences."
    },
    // Q9: Real-world troubleshooting scenario - Hard
    {
      scenario: "A sound engineer notices a 5 Hz wobble in a synthesizer patch using two oscillators. She wants to create a richer, slower 1 Hz pulsation for an ambient pad sound.",
      question: "How should she adjust the oscillator frequencies?",
      options: [
        { id: 'a', label: "Increase both frequencies by the same amount" },
        { id: 'b', label: "Decrease the frequency difference between oscillators from 5 Hz to 1 Hz", correct: true },
        { id: 'c', label: "Add a third oscillator at a frequency between the other two" },
        { id: 'd', label: "Increase the frequency difference to 10 Hz" },
      ],
      explanation: "Beat frequency equals the frequency difference between the two oscillators. To slow the pulsation from 5 Hz to 1 Hz, she needs to reduce the frequency difference. For example, if oscillators are at 440 Hz and 445 Hz (5 Hz beats), changing to 440 Hz and 441 Hz gives 1 Hz beats."
    },
    // Q10: Advanced synthesis application - Hard
    {
      scenario: "An audio researcher is studying binaural beats for meditation apps. She sends 400 Hz to the left ear and 410 Hz to the right ear through headphones.",
      question: "How does the perception of binaural beats differ from regular acoustic beats?",
      options: [
        { id: 'a', label: "Binaural beats are louder than acoustic beats" },
        { id: 'b', label: "Binaural beats are created by neural processing in the brain rather than physical wave interference in the air", correct: true },
        { id: 'c', label: "Binaural beats only work with frequencies above 1000 Hz" },
        { id: 'd', label: "There is no difference; both are identical acoustic phenomena" },
      ],
      explanation: "Regular beats occur when two waves physically interfere in the air (superposition). Binaural beats occur when each ear receives a different frequency and the brain 'creates' the beat perception through neural processing. The 10 Hz binaural beat exists only in the listener's perception, not in the physical sound waves."
    }
  ];

  // Real-world applications with comprehensive details
  const realWorldApps = [
    {
      icon: '🎹',
      title: 'Musical Instrument Tuning',
      short: 'Perfect Pitch',
      tagline: 'Zero beats means perfect harmony',
      description: 'Professional piano tuners and musicians have relied on beat frequencies for centuries to achieve precise tuning. By comparing a reference tone with the instrument string, tuners listen for the characteristic pulsating sound and adjust until it disappears completely.',
      connection: 'When two nearly identical frequencies sound together, they create audible beats. The beat frequency equals the difference between the two tones. Zero beats indicates the frequencies match exactly - perfect tuning achieved.',
      howItWorks: 'A tuning fork or electronic reference produces a standard pitch (e.g., A4 = 440 Hz). When played alongside an instrument string, any frequency mismatch creates beats. Fast beats (5-10 Hz) indicate significant detuning. As the tuner adjusts string tension, beats slow down. When beats disappear entirely, the frequencies are identical within human perception limits (typically ±0.5 Hz accuracy).',
      stats: [
        { value: '0.5 Hz', label: 'Tuning Precision', icon: '🎯' },
        { value: '440 Hz', label: 'Concert Pitch A4', icon: '🎵' },
        { value: '200+', label: 'Years of Practice', icon: '📜' }
      ],
      examples: [
        'Concert grand piano tuning and maintenance',
        'Guitar intonation and string calibration',
        'Orchestra warm-up and section tuning',
        'Choir pitch matching and vocal harmony'
      ],
      companies: ['Steinway & Sons', 'Yamaha', 'Gibson', 'Fender', 'Roland'],
      futureImpact: 'AI-assisted tuning apps are making professional-quality tuning accessible to amateur musicians, while master tuners continue to use beats for the nuanced art of stretch tuning in pianos.',
      color: '#14b8a6'
    },
    {
      icon: '✈️',
      title: 'Aircraft Engine Synchronization',
      short: 'Propeller Sync',
      tagline: 'Eliminating cabin drone through frequency matching',
      description: 'Multi-engine aircraft use beat frequency principles to synchronize propeller speeds, reducing cabin noise and vibration. Pilots and automatic systems listen for or detect beats between engines and adjust RPM until the pulsating sound disappears.',
      connection: 'When propellers rotate at slightly different speeds, the sound waves they produce interfere, creating an annoying low-frequency throbbing in the cabin. This beat frequency equals the RPM difference between engines.',
      howItWorks: 'Each propeller generates a fundamental frequency based on its rotation speed and blade count. A 3-blade prop at 2400 RPM produces 120 Hz (2400/60 × 3). If another engine runs at 2406 RPM (120.3 Hz), passengers hear a 0.3 Hz beat - a slow throbbing every 3 seconds. Synchrophaser systems automatically detect phase differences and adjust fuel flow to match engine speeds precisely.',
      stats: [
        { value: '0.1 Hz', label: 'Sync Precision', icon: '⚙️' },
        { value: '15 dB', label: 'Noise Reduction', icon: '🔇' },
        { value: '95%', label: 'Twin Aircraft Use', icon: '✈️' }
      ],
      examples: [
        'Twin-engine propeller aircraft synchronization',
        'Turboprop regional airliner comfort systems',
        'Helicopter rotor blade tracking',
        'Multi-engine drone motor matching'
      ],
      companies: ['Beechcraft', 'Cessna', 'Piper', 'De Havilland', 'ATR'],
      futureImpact: 'Electric aircraft with multiple motors will use digital beat detection for precise synchronization, enabling quieter urban air mobility vehicles and passenger drones.',
      color: '#06b6d4'
    },
    {
      icon: '🏥',
      title: 'Medical Ultrasound Doppler',
      short: 'Blood Flow Imaging',
      tagline: 'Hearing the heartbeat through frequency shifts',
      description: 'Doppler ultrasound measures blood flow velocity by detecting beat frequencies between transmitted and reflected ultrasound waves. The frequency shift caused by moving blood cells creates a beat that reveals flow speed and direction.',
      connection: 'When ultrasound reflects off moving blood cells, the Doppler effect shifts its frequency. Mixing the original transmitted frequency with the shifted received frequency produces a beat in the audible range, directly proportional to blood velocity.',
      howItWorks: 'A transducer emits ultrasound at 2-10 MHz into blood vessels. Red blood cells reflect these waves, but their motion causes a frequency shift (Doppler effect). The device mixes the transmitted and received frequencies, producing a beat frequency typically between 200 Hz and 15 kHz. This beat is converted to the characteristic "whoosh" sound and displayed as a velocity spectrogram. Flow toward the transducer produces positive shifts; flow away produces negative shifts.',
      stats: [
        { value: '1 mm/s', label: 'Flow Sensitivity', icon: '🩸' },
        { value: '10 MHz', label: 'Ultrasound Frequency', icon: '📡' },
        { value: '50M+', label: 'Annual Scans', icon: '🏥' }
      ],
      examples: [
        'Fetal heart rate monitoring during pregnancy',
        'Deep vein thrombosis detection in legs',
        'Carotid artery stenosis assessment',
        'Cardiac valve blood flow analysis'
      ],
      companies: ['GE Healthcare', 'Philips', 'Siemens Healthineers', 'Canon Medical', 'Fujifilm'],
      futureImpact: 'Wearable Doppler devices will enable continuous blood flow monitoring for early detection of cardiovascular issues, while AI analysis will automate interpretation of complex flow patterns.',
      color: '#f59e0b'
    },
    {
      icon: '📻',
      title: 'Radio Frequency Mixing',
      short: 'Superheterodyne Receivers',
      tagline: 'Converting invisible waves to audible signals',
      description: 'Superheterodyne radio receivers use beat frequencies to convert high-frequency radio waves into manageable intermediate frequencies. This fundamental principle enables everything from AM/FM radios to cell phones and radar systems.',
      connection: 'Mixing two RF signals produces sum and difference frequencies - the difference frequency is a beat. By choosing a local oscillator frequency appropriately, any incoming radio signal can be converted to a fixed intermediate frequency for easier processing.',
      howItWorks: 'An incoming radio signal (e.g., 100 MHz FM station) is mixed with a local oscillator signal (e.g., 110.7 MHz). The mixer produces the difference frequency: 10.7 MHz - the standard FM intermediate frequency (IF). This IF signal is easier to filter and amplify than the original RF. The same IF stage works for any station by simply adjusting the local oscillator. For AM radio, the IF is typically 455 kHz. This "superheterodyne" architecture, invented in 1918, remains the foundation of virtually all radio receivers.',
      stats: [
        { value: '10.7 MHz', label: 'FM IF Standard', icon: '📻' },
        { value: '455 kHz', label: 'AM IF Standard', icon: '🔊' },
        { value: '99%', label: 'Receivers Using This', icon: '📶' }
      ],
      examples: [
        'AM/FM broadcast radio receivers',
        'Cellular phone RF front-ends',
        'Software-defined radio systems',
        'Satellite communication downconverters'
      ],
      companies: ['Qualcomm', 'Broadcom', 'Texas Instruments', 'Analog Devices', 'NXP'],
      futureImpact: 'Next-generation 6G communications will use advanced frequency mixing techniques with terahertz carriers, while quantum receivers may eventually replace traditional superheterodyne architectures.',
      color: '#10b981'
    }
  ];

  // ==================== PHASE RENDERS ====================

  // HOOK - Premium welcome screen
  if (phase === 'hook') {
    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: design.spacing.xl,
          textAlign: 'center',
          position: 'relative',
          overflowY: 'auto'
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
              <defs>
                {/* Premium wave gradient */}
                <linearGradient id="beatsIconWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#5eead4" stopOpacity="0.6" />
                  <stop offset="30%" stopColor={design.colors.accentPrimary} stopOpacity="0.9" />
                  <stop offset="70%" stopColor={design.colors.accentSecondary} stopOpacity="1" />
                  <stop offset="100%" stopColor="#5eead4" stopOpacity="0.6" />
                </linearGradient>
                {/* Icon glow filter */}
                <filter id="beatsIconGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* Sound wave visualization - premium */}
              {[0, 1, 2].map((i) => {
                const opacity = 0.85 - i * 0.2 + 0.15 * Math.sin(time * 4 + i);
                return (
                  <path
                    key={i}
                    d={`M 8 30 Q 18 ${18 - i * 4} 30 30 Q 42 ${42 + i * 4} 52 30`}
                    fill="none"
                    stroke="url(#beatsIconWaveGrad)"
                    strokeWidth={3.5 - i * 0.3}
                    strokeLinecap="round"
                    filter="url(#beatsIconGlow)"
                    opacity={opacity}
                  />
                );
              })}
            </svg>
          </div>

          <h1 style={{
            fontSize: '42px',
            fontWeight: 800,
            color: '#ffffff',
            marginBottom: design.spacing.md,
            letterSpacing: '-0.02em'
          }}>
            Beats
          </h1>

          <p style={{
            fontSize: '18px',
            color: 'rgba(153, 246, 228, 0.7)',
            marginBottom: design.spacing.sm,
            maxWidth: '500px',
            lineHeight: 1.6,
            fontWeight: 400
          }}>
            Why does sound <span style={{ color: design.colors.accentPrimary, fontWeight: 600 }}>pulse and wobble</span> when two similar frequencies combine?
          </p>

          <p style={{
            fontSize: '15px',
            color: '#6B7280',
            marginBottom: design.spacing.xl,
            maxWidth: '400px',
            fontWeight: 400
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
                border: `1px solid ${design.colors.border}`,
                transition: 'all 0.2s ease'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '6px' }}>{item.icon}</div>
                <div style={{ fontSize: '11px', fontWeight: 500, color: design.colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
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
              transition: 'all 0.2s ease'
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

  // Static visualization for predict phase - shows two separate waves
  const renderStaticPredictVisualization = () => {
    const width = 450;
    const height = 180;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxHeight: '180px' }}>
        <defs>
          <linearGradient id="predictWave1Grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5eead4" stopOpacity="0.6" />
            <stop offset="50%" stopColor={design.colors.accentPrimary} stopOpacity="1" />
            <stop offset="100%" stopColor="#5eead4" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="predictWave2Grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.6" />
            <stop offset="50%" stopColor={design.colors.cyan} stopOpacity="1" />
            <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="predictBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={design.colors.bgDeep} />
            <stop offset="50%" stopColor="#031a17" />
            <stop offset="100%" stopColor={design.colors.bgDeep} />
          </linearGradient>
          <filter id="predictGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={width} height={height} fill="url(#predictBgGrad)" rx="12" />

        {/* Wave 1 - 440 Hz representation */}
        <g>
          <line x1="0" y1="55" x2={width} y2="55" stroke={design.colors.border} strokeWidth="0.5" opacity="0.4" />
          <path
            d={`M 0 55 ${Array.from({ length: 23 }, (_, i) => {
              const x = i * 20;
              const y = 55 + 25 * Math.sin(i * 0.9);
              return `L ${x} ${y}`;
            }).join(' ')}`}
            fill="none"
            stroke="url(#predictWave1Grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#predictGlow)"
          />
          <text x="10" y="25" fill={design.colors.accentPrimary} fontSize="12" fontWeight="600">440 Hz</text>
        </g>

        {/* Wave 2 - 444 Hz representation */}
        <g>
          <line x1="0" y1="125" x2={width} y2="125" stroke={design.colors.border} strokeWidth="0.5" opacity="0.4" />
          <path
            d={`M 0 125 ${Array.from({ length: 23 }, (_, i) => {
              const x = i * 20;
              const y = 125 + 25 * Math.sin(i * 0.95);
              return `L ${x} ${y}`;
            }).join(' ')}`}
            fill="none"
            stroke="url(#predictWave2Grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#predictGlow)"
          />
          <text x="10" y="95" fill={design.colors.cyan} fontSize="12" fontWeight="600">444 Hz</text>
        </g>

        {/* Question mark in center */}
        <text x={width / 2} y={height / 2 + 5} textAnchor="middle" fill="#ffffff" fontSize="28" fontWeight="700" opacity="0.3">?</text>
      </svg>
    );
  };

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
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', marginBottom: design.spacing.sm }}>
                What happens when you play 440 Hz and 444 Hz together?
              </h2>
              <p style={{ fontSize: '15px', color: design.colors.textSecondary }}>
                Imagine two tuning forks with slightly different pitches ringing simultaneously.
              </p>
            </div>

            {/* Static visualization showing the two waves */}
            <div style={{
              marginBottom: design.spacing.lg,
              borderRadius: design.radius.lg,
              overflow: 'hidden',
              border: `1px solid ${design.colors.border}`
            }}>
              {renderStaticPredictVisualization()}
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
                    color: '#ffffff',
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
          {/* Educational header */}
          <div style={{
            padding: `${design.spacing.md}px ${design.spacing.lg}px`,
            background: design.colors.bgCard,
            borderBottom: `1px solid ${design.colors.border}`
          }}>
            <p style={{ fontSize: '14px', color: '#ffffff', margin: 0 }}>
              This visualization displays two sound waves combining through superposition. When you increase or decrease the frequency difference,
              the beat pattern changes - this demonstrates wave interference used in tuning pianos and musical instruments.
            </p>
          </div>

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
            {/* Connect to prediction */}
            <div style={{
              padding: design.spacing.md,
              background: design.colors.bgCard,
              borderRadius: design.radius.lg,
              border: `1px solid ${design.colors.border}`,
              marginBottom: design.spacing.lg
            }}>
              <p style={{ fontSize: '14px', color: '#ffffff', margin: 0 }}>
                <strong style={{ color: design.colors.success }}>Your prediction was tested!</strong> As you learned through experimentation,
                the correct answer is that two similar frequencies create a pulsating "wah-wah" sound.
                This phenomenon is called beats and results from wave interference. Now let's explore the physics behind what you observed.
              </p>
            </div>

            <div style={{ marginBottom: design.spacing.lg }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.success, marginBottom: design.spacing.sm, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Understanding
              </p>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff' }}>
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

  // Static visualization for twist_predict phase - shows frequencies approaching
  const renderTwistPredictVisualization = () => {
    const width = 450;
    const height = 140;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxHeight: '140px' }}>
        <defs>
          <linearGradient id="twistWave1Grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5eead4" stopOpacity="0.6" />
            <stop offset="50%" stopColor={design.colors.accentPrimary} stopOpacity="1" />
            <stop offset="100%" stopColor="#5eead4" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="twistWave2Grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.6" />
            <stop offset="50%" stopColor={design.colors.cyan} stopOpacity="1" />
            <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="twistBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={design.colors.bgDeep} />
            <stop offset="50%" stopColor="#031a17" />
            <stop offset="100%" stopColor={design.colors.bgDeep} />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={width} height={height} fill="url(#twistBgGrad)" rx="12" />

        {/* Two nearly identical waves */}
        <path
          d={`M 0 50 ${Array.from({ length: 23 }, (_, i) => `L ${i * 20} ${50 + 20 * Math.sin(i * 0.8)}`).join(' ')}`}
          fill="none" stroke="url(#twistWave1Grad)" strokeWidth="2.5" strokeLinecap="round"
        />
        <path
          d={`M 0 90 ${Array.from({ length: 23 }, (_, i) => `L ${i * 20} ${90 + 20 * Math.sin(i * 0.82)}`).join(' ')}`}
          fill="none" stroke="url(#twistWave2Grad)" strokeWidth="2.5" strokeLinecap="round"
        />

        {/* Arrow indicating frequencies approaching */}
        <text x={width / 2} y="20" textAnchor="middle" fill={design.colors.warning} fontSize="12" fontWeight="600">
          Frequencies getting closer...
        </text>
        <text x="10" y="35" fill={design.colors.accentPrimary} fontSize="11" fontWeight="600">440 Hz</text>
        <text x="10" y="75" fill={design.colors.cyan} fontSize="11" fontWeight="600">442 Hz</text>
      </svg>
    );
  };

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
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', marginBottom: design.spacing.sm }}>
                What happens when two frequencies get closer together?
              </h2>
              <p style={{ fontSize: '15px', color: design.colors.textSecondary }}>
                Think about tuning an instrument - as you approach perfect tune, what changes?
              </p>
            </div>

            {/* Static visualization for twist predict */}
            <div style={{
              marginBottom: design.spacing.lg,
              borderRadius: design.radius.lg,
              overflow: 'hidden',
              border: `1px solid ${design.colors.border}`
            }}>
              {renderTwistPredictVisualization()}
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
                    color: '#ffffff',
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

              {/* Key Statistics */}
              <div style={{
                padding: design.spacing.lg,
                borderRadius: design.radius.lg,
                background: `${app.color}15`,
                border: `1px solid ${app.color}30`,
                marginBottom: design.spacing.lg
              }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: app.color, marginBottom: design.spacing.sm, textTransform: 'uppercase' }}>
                  Key Statistics
                </p>
                <p style={{ fontSize: '16px', color: '#ffffff', fontWeight: 600 }}>
                  {(app as { stats?: string }).stats || app.stat}
                </p>
              </div>

              {/* Formula */}
              <div style={{
                padding: design.spacing.lg,
                borderRadius: design.radius.lg,
                background: design.colors.bgCard,
                border: `1px solid ${design.colors.border}`,
                marginBottom: design.spacing.xl
              }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: design.colors.textMuted, marginBottom: design.spacing.sm, textTransform: 'uppercase' }}>
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
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: design.spacing.xl, textAlign: 'center', overflowY: 'auto' }}>
            <div style={{ fontSize: '72px', marginBottom: design.spacing.lg }}>
              {score >= 8 ? '🏆' : score >= 6 ? '⭐' : '📚'}
            </div>
            <h2 style={{ fontSize: '36px', fontWeight: 900, color: '#ffffff', marginBottom: design.spacing.md }}>
              {score}/10 Correct
            </h2>
            <p style={{ fontSize: '16px', color: design.colors.textSecondary, marginBottom: design.spacing.xl, maxWidth: '400px' }}>
              {score >= 8 ? "Excellent! You've truly mastered the physics of beats and wave interference!" :
               score >= 6 ? "Good job! Review the concepts you missed about beat frequency and wave superposition." :
               "Keep practicing! Review the material about wave interference and try again."}
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
            {/* Scenario context */}
            <div style={{
              padding: design.spacing.md,
              background: design.colors.bgCard,
              borderRadius: design.radius.lg,
              border: `1px solid ${design.colors.border}`,
              marginBottom: design.spacing.lg
            }}>
              <p style={{ fontSize: '13px', color: design.colors.textSecondary, margin: 0 }}>
                Scenario: A physics student is studying beat frequencies in the laboratory. Two sound sources produce slightly different frequencies, creating an audible pulsating effect. Apply your knowledge of wave superposition and interference to answer the following questions about beat frequency phenomena.
              </p>
            </div>

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
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: design.spacing.lg, lineHeight: 1.5 }}>
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
