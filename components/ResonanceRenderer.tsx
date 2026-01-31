'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// RESONANCE - Premium Apple/Airbnb Design System
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  'hook': 'Hook',
  'predict': 'Predict',
  'play': 'Lab',
  'review': 'Review',
  'twist_predict': 'Twist Predict',
  'twist_play': 'Twist Lab',
  'twist_review': 'Twist Review',
  'transfer': 'Transfer',
  'test': 'Test',
  'mastery': 'Mastery'
};

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

interface ResonanceRendererProps {
  width?: number;
  height?: number;
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

// ============================================================================
// PREMIUM DESIGN TOKENS - Apple/Airbnb Quality
// ============================================================================
const design = {
  colors: {
    bgDeep: '#0a0510',
    bgPrimary: '#0f0818',
    bgSecondary: '#160d20',
    bgTertiary: '#1d1228',
    bgCard: '#1a0f24',
    bgElevated: '#241630',
    bgHover: '#2c1c3a',
    textPrimary: '#faf5ff',
    textSecondary: '#c4b5d8',
    textMuted: '#7e6898',
    textDisabled: '#4a3c60',
    accentPrimary: '#ec4899',
    accentSecondary: '#f472b6',
    accentMuted: '#831843',
    accentGlow: 'rgba(236, 72, 153, 0.25)',
    violet: '#a855f7',
    violetMuted: 'rgba(168, 85, 247, 0.2)',
    success: '#10b981',
    successMuted: 'rgba(16, 185, 129, 0.15)',
    error: '#ef4444',
    errorMuted: 'rgba(239, 68, 68, 0.15)',
    warning: '#f59e0b',
    border: '#2e1f40',
    borderLight: '#3d2950',
    borderFocus: '#ec4899',
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
const ResonanceRenderer: React.FC<ResonanceRendererProps> = ({ onGameEvent, gamePhase, onPhaseComplete }) => {
  // Phase state
  const [phase, setPhase] = useState<Phase>(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  });

  // Sync phase with external prop
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Game state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [drivingFrequency, setDrivingFrequency] = useState(100);
  const [addedMass, setAddedMass] = useState(0);
  const [foundResonance, setFoundResonance] = useState(false);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [testIndex, setTestIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [showResult, setShowResult] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const animationRef = useRef<number>();

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

  // Animation loop
  useEffect(() => {
    let lastTime = performance.now();
    const animate = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      setTime(t => t + delta * 2);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  // Type-based sound feedback
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const soundConfig = {
        click: { frequency: 440, duration: 0.1, oscType: 'sine' as OscillatorType },
        success: { frequency: 600, duration: 0.15, oscType: 'sine' as OscillatorType },
        failure: { frequency: 200, duration: 0.2, oscType: 'sawtooth' as OscillatorType },
        transition: { frequency: 520, duration: 0.15, oscType: 'sine' as OscillatorType },
        complete: { frequency: 800, duration: 0.3, oscType: 'sine' as OscillatorType },
      };

      const config = soundConfig[type];
      oscillator.frequency.value = config.frequency;
      oscillator.type = config.oscType;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + config.duration);
    } catch (e) { /* Audio not supported */ }
  }, []);

  // Emit game events
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    onGameEvent?.({ type, data });
  }, [onGameEvent]);

  // Navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    if (!phaseOrder.includes(newPhase)) return;
    setPhase(newPhase);
    playSound('transition');
    emitEvent('phase_change', { from: phase, to: newPhase, phaseLabel: phaseLabels[newPhase] });
    onPhaseComplete?.(newPhase);
  }, [phase, playSound, emitEvent, onPhaseComplete]);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) goToPhase(phaseOrder[currentIndex + 1]);
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) goToPhase(phaseOrder[currentIndex - 1]);
  }, [phase, goToPhase]);

  // Render button helper function
  const renderButton = (
    label: string,
    onClick: () => void,
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
        color: '#fff',
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
          if (disabled) return;
          onClick();
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
          zIndex: 10,
          ...sizeStyles[size],
          ...variantStyles[variant]
        }}
      >
        {label}
      </button>
    );
  };

  // Resonance physics
  const baseResonantFreq = 240;
  const resonantFreq = Math.round(baseResonantFreq - addedMass * 2);
  const frequencyDiff = Math.abs(drivingFrequency - resonantFreq);
  const isAtResonance = frequencyDiff < 15;
  const responseAmplitude = isAtResonance ? 100 : Math.max(5, 100 - frequencyDiff * 1.2);

  // Track resonance discovery
  useEffect(() => {
    if ((phase === 'play' || phase === 'twist_play') && isAtResonance && !foundResonance) {
      setFoundResonance(true);
      emitEvent('simulation_started', { frequency: drivingFrequency, resonanceFound: true });
    }
  }, [isAtResonance, phase, foundResonance, drivingFrequency, emitEvent]);

  // Test questions - 10 scenario-based multiple choice questions on resonance
  const testQuestions = [
    // 1. Core concept - what is resonance (Easy)
    {
      scenario: "A physics student notices that when she hums at a certain pitch in the shower, the sound becomes much louder. The bathroom tiles seem to amplify only that specific note.",
      question: "What phenomenon is the student experiencing, and why does it only happen at one specific frequency?",
      options: [
        { id: 'a', label: "Echo - sound waves bouncing off the tiles multiple times" },
        { id: 'b', label: "Resonance - the hum matches the natural frequency of the air cavity, causing maximum amplitude buildup", correct: true },
        { id: 'c', label: "Refraction - sound waves bending around the shower curtain" },
        { id: 'd', label: "Diffraction - sound spreading out evenly in all directions" }
      ],
      explanation: "Resonance occurs when a driving frequency matches a system's natural frequency, causing energy to accumulate and amplitude to maximize. The shower acts as an acoustic resonator with specific natural frequencies. When the student's hum matches one of these frequencies, standing waves form and the sound is dramatically amplified."
    },
    // 2. Pushing a swing (Easy-Medium)
    {
      scenario: "A parent is pushing their child on a playground swing. The child swings back and forth once every 2 seconds. The parent wants to make the child swing as high as possible.",
      question: "When should the parent push to achieve maximum swing height most efficiently?",
      options: [
        { id: 'a', label: "Push rapidly every half second to add more energy faster" },
        { id: 'b', label: "Push once every 2 seconds, timed with the swing's natural motion", correct: true },
        { id: 'c', label: "Push randomly whenever convenient" },
        { id: 'd', label: "Push once every 4 seconds to let energy build up between pushes" }
      ],
      explanation: "Maximum energy transfer occurs when the driving frequency matches the natural frequency (resonance). The swing's natural period is 2 seconds, so pushing every 2 seconds - specifically at the bottom of each swing when moving away - transfers energy most efficiently. Pushing at other frequencies causes the pushes to sometimes work against the motion, wasting energy."
    },
    // 3. Breaking glass with sound (Medium)
    {
      scenario: "An opera singer demonstrates shattering a wine glass using only her voice. She first taps the glass to hear its ring, then begins singing, gradually increasing volume while holding a specific note.",
      question: "Why must the singer match the exact pitch of the glass's ring, and why does the glass shatter?",
      options: [
        { id: 'a', label: "The high pitch creates air pressure that crushes the glass" },
        { id: 'b', label: "Sound waves at the glass's natural frequency cause resonance, building vibration amplitude until the glass exceeds its elastic limit and shatters", correct: true },
        { id: 'c', label: "Any loud enough sound would shatter the glass regardless of pitch" },
        { id: 'd', label: "The singer's breath creates enough force to break the glass" }
      ],
      explanation: "The tapped glass rings at its natural frequency. When the singer matches this frequency exactly, resonance occurs - each sound wave adds energy to the glass's vibration. With sustained input, amplitude grows until the glass flexes beyond its structural limit and shatters. This only works at the resonant frequency; other pitches don't accumulate energy efficiently."
    },
    // 4. Tacoma Narrows Bridge collapse (Medium)
    {
      scenario: "On November 7, 1940, the Tacoma Narrows Bridge in Washington state began oscillating violently in 40 mph winds - a wind speed the bridge was designed to withstand. Within hours, the bridge twisted apart and collapsed into the river below.",
      question: "What caused a bridge designed for much stronger winds to fail in relatively moderate conditions?",
      options: [
        { id: 'a', label: "The wind force directly overpowered the bridge structure" },
        { id: 'b', label: "The wind created vortices that excited the bridge at its natural frequency, causing resonant oscillations that grew until structural failure", correct: true },
        { id: 'c', label: "An earthquake coincidentally occurred at the same time" },
        { id: 'd', label: "Poor construction materials made the bridge too weak" }
      ],
      explanation: "The wind didn't push the bridge directly to failure. Instead, vortex shedding (wind creating alternating low-pressure zones) happened to match the bridge's torsional natural frequency. This caused resonance - each wind cycle added energy, making oscillations grow larger despite the wind being weaker than design limits. The bridge was redesigned with aerodynamic fairings and damping to prevent similar resonance."
    },
    // 5. Musical instrument resonance (Medium-Hard)
    {
      scenario: "A guitar string vibrates at 330 Hz when plucked. However, when the same string is plucked on an acoustic guitar versus a solid-body electric guitar (unplugged), the acoustic guitar sounds much louder and fuller.",
      question: "What role does the acoustic guitar's hollow body play in producing this louder, richer sound?",
      options: [
        { id: 'a', label: "The hollow body traps air that pushes the sound out more forcefully" },
        { id: 'b', label: "The body acts as a resonating chamber, amplifying the string's vibrations and enhancing harmonics through acoustic resonance", correct: true },
        { id: 'c', label: "The wood absorbs unwanted frequencies, making the desired notes clearer" },
        { id: 'd', label: "The hole allows internal echoes that make the sound seem louder" }
      ],
      explanation: "The guitar body is a carefully designed resonator. When the string vibrates, it transfers energy to the bridge and soundboard. The air cavity resonates at multiple frequencies, amplifying the string's fundamental and harmonics. The body's shape and size determine which frequencies are enhanced, giving each guitar its characteristic tone. Electric guitars rely on electromagnetic pickups instead, so they need amplifiers."
    },
    // 6. Mechanical resonance avoidance (Hard)
    {
      scenario: "A washing machine manufacturer discovers that at 800 RPM spin speed, their new model vibrates so violently it walks across the floor. The chief engineer suggests simply changing the spin speed rather than redesigning the entire drum assembly.",
      question: "Why would changing the operating speed solve the vibration problem, and what physical principle does this exploit?",
      options: [
        { id: 'a', label: "Faster speeds would spin the water out before it can cause vibrations" },
        { id: 'b', label: "800 RPM matches the drum assembly's natural frequency; operating at a different speed avoids resonance and the associated violent vibrations", correct: true },
        { id: 'c', label: "Slower speeds use less energy, reducing vibration force" },
        { id: 'd', label: "The motor performs better at speeds other than 800 RPM" }
      ],
      explanation: "The drum assembly has a natural frequency that, when expressed in RPM, equals approximately 800. At this speed, the driving frequency from rotation matches the natural frequency, causing resonance and extreme vibrations. By operating above or below this critical speed, the system avoids resonance. Many machines use variable-speed motors that quickly pass through resonant frequencies during startup to minimize time spent in dangerous resonance conditions."
    },
    // 7. NMR/MRI resonance (Hard)
    {
      scenario: "A patient lies in an MRI machine, surrounded by a powerful 3-Tesla magnet. Radio waves pulse through their body, and somehow this produces detailed images of internal organs without any surgery or radiation exposure.",
      question: "What is the role of resonance in MRI imaging, and why must the radio frequency be precisely tuned?",
      options: [
        { id: 'a', label: "Radio waves bounce off organs like radar to create images" },
        { id: 'b', label: "Hydrogen nuclei in the body resonate at a specific frequency determined by the magnetic field; absorbed and re-emitted energy reveals tissue composition", correct: true },
        { id: 'c', label: "The magnetic field directly photographs the inside of the body" },
        { id: 'd', label: "Radio waves heat tissues differently based on density" }
      ],
      explanation: "MRI exploits Nuclear Magnetic Resonance. In the strong magnetic field, hydrogen nuclei (protons) precess at a frequency proportional to field strength (about 128 MHz at 3T). When radio waves match this Larmor frequency, nuclei absorb energy and flip their spin. As they relax back, they emit detectable signals. Different tissues have different hydrogen concentrations and relaxation times, creating contrast in the final image."
    },
    // 8. Acoustic resonance in pipes (Hard)
    {
      scenario: "An organ pipe open at both ends produces a fundamental tone of 256 Hz (middle C). When a musician closes one end of the same pipe, the fundamental frequency changes, and the pipe produces different harmonics.",
      question: "How does closing one end affect the pipe's resonant frequencies?",
      options: [
        { id: 'a', label: "The fundamental frequency doubles because sound reflects more efficiently" },
        { id: 'b', label: "The fundamental frequency halves (drops an octave) and only odd harmonics are produced", correct: true },
        { id: 'c', label: "The frequency stays the same but the sound becomes quieter" },
        { id: 'd', label: "The pipe can no longer resonate and produces no tone" }
      ],
      explanation: "Open pipes support standing waves with antinodes at both ends, allowing a wavelength of 2L for the fundamental. Closed pipes require a node at the closed end and antinode at the open end, fitting only 1/4 wavelength for the fundamental - half the frequency. Furthermore, closed pipes can only support odd harmonics (1st, 3rd, 5th...) because even harmonics would require an antinode at the closed end, which is physically impossible."
    },
    // 9. Electrical resonance in circuits (Hard)
    {
      scenario: "A radio receiver uses a tuning circuit with an inductor and capacitor (LC circuit). By adjusting the capacitor, the listener can select different radio stations from the many signals simultaneously present in the air.",
      question: "How does adjusting the capacitor allow selection of a specific radio frequency?",
      options: [
        { id: 'a', label: "The capacitor filters out unwanted frequencies by absorbing them" },
        { id: 'b', label: "The LC circuit resonates at f = 1/(2pi*sqrt(LC)); adjusting C changes the resonant frequency to match the desired station, amplifying it while rejecting others", correct: true },
        { id: 'c', label: "Larger capacitors physically block longer radio waves" },
        { id: 'd', label: "The capacitor stores the radio signal for later playback" }
      ],
      explanation: "LC circuits exhibit electrical resonance where energy oscillates between the capacitor's electric field and inductor's magnetic field. At the resonant frequency f = 1/(2pi*sqrt(LC)), the circuit's impedance is minimum (for series) or maximum (for parallel), causing strong current response. By varying C, the resonant frequency shifts. Only signals at the resonant frequency produce significant response, effectively selecting one station from many."
    },
    // 10. Damping and Q factor (Hard)
    {
      scenario: "An engineer compares two tuning forks: Fork A rings for 30 seconds after being struck, while Fork B's sound dies out in just 3 seconds. Both produce the same frequency note, but Fork B is made of a softer alloy.",
      question: "What does the difference in ring duration tell us about each fork's Q factor (quality factor), and why does this matter for resonance applications?",
      options: [
        { id: 'a', label: "Fork A has lower Q factor because it stores sound longer" },
        { id: 'b', label: "Fork A has higher Q factor, meaning sharper resonance and less energy loss per cycle; high-Q systems are better for frequency-selective applications", correct: true },
        { id: 'c', label: "Q factor only applies to electrical circuits, not mechanical systems" },
        { id: 'd', label: "Both forks have the same Q factor since they produce the same frequency" }
      ],
      explanation: "Q factor (quality factor) measures how underdamped an oscillator is - equivalently, how many oscillations occur before energy drops to 1/e of initial value. Fork A's longer ring time means less energy loss per cycle, indicating higher Q. High-Q resonators have very sharp resonance peaks, responding strongly only to frequencies very close to resonance. This is valuable for precise frequency selection (radio tuners, clocks) but makes them more susceptible to unwanted resonance."
    }
  ];

  // Real-world applications with SVG graphics
  const applications = [
    {
      id: 'mri',
      title: 'Medical MRI',
      subtitle: 'Nuclear Magnetic Resonance',
      description: 'MRI scanners use nuclear magnetic resonance to image organs without radiation. Hydrogen nuclei in your body resonate at specific radio frequencies in strong magnetic fields.',
      stat: 'f = γB₀/2π',
      color: design.colors.accentPrimary
    },
    {
      id: 'glass',
      title: 'Glass Shattering',
      subtitle: 'Acoustic Resonance',
      description: 'Opera singers can shatter wine glasses by singing at the glass\'s natural frequency. Energy accumulates with each cycle until the glass fails catastrophically.',
      stat: 'A(t) ≈ A₀e^(γt)',
      color: design.colors.violet
    },
    {
      id: 'bridge',
      title: 'Bridge Engineering',
      subtitle: 'Avoiding Catastrophic Resonance',
      description: 'The 1940 Tacoma Narrows Bridge collapsed from wind-induced resonance. Modern bridges use tuned mass dampers and aerodynamic shapes to prevent disasters.',
      stat: 'f = (1/2π)√(k/m)',
      color: design.colors.success
    },
    {
      id: 'music',
      title: 'Musical Instruments',
      subtitle: 'Acoustic Amplification',
      description: 'Every instrument relies on resonance to amplify sound. Guitar bodies, violin chambers, and piano soundboards resonate at multiple frequencies for rich tones.',
      stat: 'fₙ = n × f₁',
      color: design.colors.warning
    }
  ];

  // Common styles
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#0a0f1a',
    fontFamily: design.font.sans,
    color: design.colors.textPrimary,
    overflow: 'hidden',
    position: 'relative'
  };

  // Progress bar (Premium Design)
  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Resonance</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p, idx) => (
              <button
                key={p}
                onClick={(e) => { e.preventDefault(); goToPhase(p); }}
                style={{ zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-violet-400 w-6 shadow-lg shadow-violet-400/30'
                    : currentIndex > idx
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-violet-400">{currentIndex + 1} / {phaseOrder.length}</span>
        </div>
      </div>
    );
  };

  // Resonance visualization
  const renderResonanceVisualization = () => {
    const springY = 80;
    const massY = springY + 80 + (responseAmplitude / 2) * Math.sin(time * (drivingFrequency / 50));
    const massSize = 30 + addedMass * 0.3;
    const motionBlurAmount = isAtResonance ? 4 + responseAmplitude * 0.03 : 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
        <svg viewBox="0 0 500 280" style={{ width: '100%', height: '100%', maxHeight: '280px' }}>
          <defs>
            {/* Premium spring gradient - 5 stops */}
            <linearGradient id="resSpringGradPremium" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="25%" stopColor={design.colors.violet} />
              <stop offset="50%" stopColor="#d946ef" />
              <stop offset="75%" stopColor={design.colors.accentPrimary} />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>

            {/* Premium mass 3D radial gradient - 6 stops */}
            <radialGradient id="resMassGrad3D" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fdf4ff" />
              <stop offset="15%" stopColor="#f5d0fe" />
              <stop offset="35%" stopColor={design.colors.accentSecondary} />
              <stop offset="60%" stopColor={design.colors.accentPrimary} />
              <stop offset="85%" stopColor="#9d174d" />
              <stop offset="100%" stopColor={design.colors.accentMuted} />
            </radialGradient>

            {/* Anchor metallic gradient */}
            <linearGradient id="resAnchorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4a5568" />
              <stop offset="30%" stopColor="#2d3748" />
              <stop offset="50%" stopColor="#4a5568" />
              <stop offset="70%" stopColor="#1a202c" />
              <stop offset="100%" stopColor="#171923" />
            </linearGradient>

            {/* Premium glow filter with merge */}
            <filter id="resGlowPremium" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur2" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="20" result="blur3" />
              <feMerge>
                <feMergeNode in="blur3" />
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Motion blur filter for resonance */}
            <filter id="resMotionBlur" x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation={`0 ${motionBlurAmount}`} />
            </filter>

            {/* Amplitude bar glow */}
            <filter id="resAmplitudeGlow" x="-100%" y="-20%" width="300%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Driving force arrow gradient */}
            <linearGradient id="resDrivingArrowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="50%" stopColor={design.colors.violet} />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>

            {/* Amplitude bar gradient */}
            <linearGradient id="resAmplitudeGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor={isAtResonance ? '#059669' : design.colors.accentMuted} />
              <stop offset="30%" stopColor={isAtResonance ? '#10b981' : design.colors.accentPrimary} />
              <stop offset="70%" stopColor={isAtResonance ? '#34d399' : design.colors.accentSecondary} />
              <stop offset="100%" stopColor={isAtResonance ? '#6ee7b7' : '#f9a8d4'} />
            </linearGradient>

            {/* Frequency marker gradient */}
            <linearGradient id="resFreqMarkerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor={design.colors.violet} stopOpacity="0.6" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="500" height="280" fill={design.colors.bgDeep} rx="12" />

          {/* Premium grid background with gradient */}
          <g opacity="0.08">
            {[...Array(7)].map((_, i) => (
              <line
                key={`h${i}`}
                x1="50"
                y1={40 + i * 35}
                x2="450"
                y2={40 + i * 35}
                stroke="url(#resFreqMarkerGrad)"
                strokeWidth="1"
              />
            ))}
            {[...Array(9)].map((_, i) => (
              <line
                key={`v${i}`}
                x1={50 + i * 50}
                y1="40"
                x2={50 + i * 50}
                y2="250"
                stroke={design.colors.textMuted}
                strokeWidth="0.5"
                strokeDasharray="2,4"
              />
            ))}
          </g>

          {/* Fixed anchor - 3D metallic look */}
          <rect x="115" y="30" width="70" height="20" rx="4" fill="url(#resAnchorGrad)" stroke={design.colors.border} strokeWidth="1" />
          <rect x="117" y="32" width="66" height="4" rx="2" fill="#4a5568" opacity="0.5" />
          <rect x="125" y="15" width="50" height="20" rx="4" fill={design.colors.bgTertiary} stroke={design.colors.border} />
          <rect x="127" y="17" width="46" height="6" rx="2" fill="#2d3748" opacity="0.3" />

          {/* Spring with premium gradient */}
          <path
            d={`M 150 50 ${[...Array(8)].map((_, i) => {
              const y = 50 + (i + 0.5) * ((massY - 50) / 8);
              const x = 150 + (i % 2 === 0 ? 20 : -20);
              return `L ${x} ${y}`;
            }).join(' ')} L 150 ${massY - massSize/2}`}
            fill="none"
            stroke="url(#resSpringGradPremium)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={isAtResonance ? "url(#resMotionBlur)" : undefined}
          />

          {/* Spring highlight */}
          <path
            d={`M 150 50 ${[...Array(8)].map((_, i) => {
              const y = 50 + (i + 0.5) * ((massY - 50) / 8);
              const x = 150 + (i % 2 === 0 ? 18 : -18);
              return `L ${x} ${y}`;
            }).join(' ')} L 150 ${massY - massSize/2}`}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Mass with 3D gradient and premium glow */}
          <g filter={isAtResonance ? "url(#resMotionBlur)" : undefined}>
            {/* Outer glow ring at resonance */}
            {isAtResonance && (
              <circle
                cx="150"
                cy={massY}
                r={massSize + 12}
                fill="none"
                stroke={design.colors.accentSecondary}
                strokeWidth="2"
                opacity={0.3 + 0.2 * Math.sin(time * 8)}
                filter="url(#resGlowPremium)"
              />
            )}

            {/* Mass shadow */}
            <ellipse
              cx="155"
              cy={massY + massSize + 5}
              rx={massSize * 0.8}
              ry={8}
              fill="rgba(0,0,0,0.3)"
              filter="url(#resGlowPremium)"
            />

            {/* Main mass */}
            <circle
              cx="150"
              cy={massY}
              r={massSize}
              fill="url(#resMassGrad3D)"
              filter={isAtResonance ? "url(#resGlowPremium)" : undefined}
              stroke={isAtResonance ? design.colors.accentSecondary : 'rgba(255,255,255,0.1)'}
              strokeWidth={isAtResonance ? 3 : 1}
            />

            {/* Mass highlight */}
            <ellipse
              cx={150 - massSize * 0.3}
              cy={massY - massSize * 0.3}
              rx={massSize * 0.3}
              ry={massSize * 0.2}
              fill="rgba(255,255,255,0.3)"
            />
          </g>

          {/* Driving force indicator - enhanced */}
          <g transform="translate(300, 80)">
            <rect x="0" y="0" width="140" height="140" rx="12" fill={design.colors.bgCard} stroke={design.colors.border} />
            <rect x="2" y="2" width="136" height="20" rx="10" fill="rgba(255,255,255,0.02)" />

            {/* Oscillating arrow with glow */}
            <g transform="translate(70, 85)">
              <circle cx="0" cy="0" r="40" fill="none" stroke={design.colors.border} strokeDasharray="4,4" />

              {/* Frequency markers */}
              {[0, 90, 180, 270].map((angle) => (
                <circle
                  key={angle}
                  cx={40 * Math.cos(angle * Math.PI / 180)}
                  cy={40 * Math.sin(angle * Math.PI / 180)}
                  r="3"
                  fill={design.colors.bgElevated}
                  stroke={design.colors.border}
                />
              ))}

              {/* Arrow with glow */}
              <line
                x1="0" y1="0"
                x2={35 * Math.cos(time * (drivingFrequency / 50))}
                y2={35 * Math.sin(time * (drivingFrequency / 50))}
                stroke="url(#resDrivingArrowGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                filter="url(#resGlowPremium)"
              />

              {/* Arrow tip */}
              <circle
                cx={35 * Math.cos(time * (drivingFrequency / 50))}
                cy={35 * Math.sin(time * (drivingFrequency / 50))}
                r="6"
                fill={design.colors.violet}
                filter="url(#resGlowPremium)"
              />

              <circle cx="0" cy="0" r="6" fill={design.colors.violet} />
              <circle cx="0" cy="0" r="3" fill="#c084fc" />
            </g>
          </g>

          {/* Response amplitude bar - premium with glow */}
          <g transform="translate(50, 140)">
            {/* Bar background */}
            <rect x="0" y="0" width="30" height="100" rx="6" fill={design.colors.bgElevated} stroke={design.colors.border} />

            {/* Amplitude envelope glow */}
            {isAtResonance && (
              <rect
                x="-4" y={100 - responseAmplitude - 4}
                width="38" height={responseAmplitude + 8}
                rx="8"
                fill="none"
                stroke={design.colors.success}
                strokeWidth="2"
                opacity={0.4 + 0.3 * Math.sin(time * 6)}
                filter="url(#resAmplitudeGlow)"
              />
            )}

            {/* Amplitude fill with gradient */}
            <rect
              x="2" y={102 - responseAmplitude}
              width="26" height={responseAmplitude - 4}
              rx="4"
              fill="url(#resAmplitudeGrad)"
              filter={isAtResonance ? "url(#resAmplitudeGlow)" : undefined}
              style={{ transition: 'all 0.1s ease' }}
            />

            {/* Frequency markers on bar */}
            {[25, 50, 75].map((level) => (
              <line
                key={level}
                x1="32" y1={100 - level} x2="38" y2={100 - level}
                stroke={design.colors.textMuted}
                strokeWidth="1"
                opacity="0.5"
              />
            ))}
          </g>

          {/* Info panel - enhanced */}
          <g transform="translate(300, 230)">
            <rect x="0" y="0" width="140" height="40" rx="8" fill={design.colors.bgCard} stroke={design.colors.border} />
            {isAtResonance && (
              <rect x="0" y="0" width="140" height="40" rx="8" fill="none" stroke={design.colors.success} strokeWidth="2" opacity="0.5" filter="url(#resGlowPremium)" />
            )}
          </g>
        </svg>

        {/* Text labels outside SVG using typo system */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '500px',
          padding: '0 12px'
        }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: typo.label, color: design.colors.textMuted, fontWeight: 600, marginBottom: '2px' }}>
              AMPLITUDE
            </div>
            {isAtResonance && (
              <div style={{ fontSize: typo.small, color: design.colors.success, fontWeight: 700 }}>
                MAX!
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: typo.label, color: design.colors.textMuted, fontWeight: 600, marginBottom: '2px' }}>
              MASS
            </div>
            <div style={{ fontSize: typo.body, color: design.colors.textPrimary, fontWeight: 700 }}>
              {Math.round(100 + addedMass)}g
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: typo.label, color: design.colors.textMuted, fontWeight: 600, marginBottom: '2px' }}>
              DRIVING FORCE
            </div>
            <div style={{ fontSize: typo.body, color: design.colors.accentPrimary, fontWeight: 800 }}>
              {drivingFrequency} Hz
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: typo.label, color: design.colors.textMuted, fontWeight: 600, marginBottom: '2px' }}>
              NATURAL FREQ
            </div>
            <div style={{
              fontSize: typo.body,
              color: isAtResonance ? design.colors.success : design.colors.textSecondary,
              fontWeight: 700
            }}>
              {resonantFreq} Hz {isAtResonance ? ' RESONANCE!' : ''}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Application tab SVG graphics
  const renderApplicationGraphic = () => {
    const app = applications[activeApp];

    if (app.id === 'mri') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <svg viewBox="0 0 300 180" style={{ width: '100%', height: '140px' }}>
            <defs>
              {/* Premium MRI machine gradient - 5 stops */}
              <linearGradient id="resMriMachineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#374151" />
                <stop offset="25%" stopColor="#1f2937" />
                <stop offset="50%" stopColor="#374151" />
                <stop offset="75%" stopColor="#1f2937" />
                <stop offset="100%" stopColor="#111827" />
              </linearGradient>

              {/* Magnetic field gradient */}
              <linearGradient id="resMriFieldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="20%" stopColor={design.colors.violet} stopOpacity="0.3" />
                <stop offset="50%" stopColor={design.colors.violet} stopOpacity="0.8" />
                <stop offset="80%" stopColor={design.colors.violet} stopOpacity="0.3" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>

              {/* Patient body gradient */}
              <radialGradient id="resMriPatientGrad" cx="40%" cy="40%">
                <stop offset="0%" stopColor="#fef3c7" />
                <stop offset="40%" stopColor="#fde68a" />
                <stop offset="70%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#92400e" />
              </radialGradient>

              {/* Nuclei glow gradient */}
              <radialGradient id="resMriNucleiGrad">
                <stop offset="0%" stopColor="#fff" />
                <stop offset="40%" stopColor={design.colors.accentSecondary} />
                <stop offset="100%" stopColor={design.colors.accentPrimary} />
              </radialGradient>

              {/* Premium glow filter */}
              <filter id="resMriGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur2" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur3" />
                <feMerge>
                  <feMergeNode in="blur3" />
                  <feMergeNode in="blur2" />
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Inner machine glow */}
              <filter id="resMriInnerGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <rect x="0" y="0" width="300" height="180" fill={design.colors.bgDeep} rx="12" />

            {/* MRI machine outer ring - 3D metallic */}
            <ellipse cx="150" cy="90" rx="110" ry="75" fill="url(#resMriMachineGrad)" stroke="#4b5563" strokeWidth="2" />
            <ellipse cx="150" cy="90" rx="105" ry="70" fill="none" stroke="#6b7280" strokeWidth="1" opacity="0.3" />

            {/* Inner bore with glow */}
            <ellipse cx="150" cy="90" rx="65" ry="45" fill={design.colors.bgDeep} stroke="#1e293b" strokeWidth="3" />
            <ellipse cx="150" cy="90" rx="60" ry="40" fill="none" stroke={design.colors.violet} strokeWidth="1" opacity="0.3" filter="url(#resMriInnerGlow)" />

            {/* Magnetic field lines - animated */}
            {[0, 1, 2, 3, 4].map((i) => (
              <path
                key={i}
                d={`M 40 ${75 + i * 8} Q 150 ${65 + i * 8 + 8 * Math.sin(time * 2 + i * 0.5)} 260 ${75 + i * 8}`}
                fill="none"
                stroke="url(#resMriFieldGrad)"
                strokeWidth="2"
                opacity={0.4 + i * 0.12}
              />
            ))}

            {/* Patient silhouette - 3D */}
            <ellipse cx="150" cy="90" rx="28" ry="38" fill="url(#resMriPatientGrad)" opacity="0.9" />
            <ellipse cx="143" cy="82" rx="8" ry="5" fill="rgba(255,255,255,0.2)" />

            {/* Resonating hydrogen nuclei with premium glow */}
            {[...Array(12)].map((_, i) => {
              const angle = (i / 12) * Math.PI * 2 + time * 3;
              const r = 18 + 4 * Math.sin(time * 2 + i);
              return (
                <circle
                  key={i}
                  cx={150 + r * Math.cos(angle)}
                  cy={90 + r * 0.7 * Math.sin(angle)}
                  r={3 + Math.sin(time * 4 + i) * 1}
                  fill="url(#resMriNucleiGrad)"
                  filter="url(#resMriGlow)"
                  opacity={0.7 + 0.3 * Math.sin(time * 4 + i)}
                />
              );
            })}

            {/* Central resonance pulse */}
            <circle
              cx="150"
              cy="90"
              r={12 + 8 * Math.sin(time * 4)}
              fill="none"
              stroke={design.colors.accentPrimary}
              strokeWidth="2"
              opacity={0.5 + 0.3 * Math.sin(time * 4)}
              filter="url(#resMriGlow)"
            />
          </svg>

          {/* Caption outside SVG */}
          <p style={{ fontSize: typo.small, color: design.colors.textSecondary, textAlign: 'center', margin: 0 }}>
            Hydrogen nuclei resonate at specific frequencies
          </p>
        </div>
      );
    }

    if (app.id === 'glass') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <svg viewBox="0 0 300 180" style={{ width: '100%', height: '140px' }}>
            <defs>
              {/* Premium glass gradient - 6 stops for crystal effect */}
              <linearGradient id="resGlassGradPremium" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f0f9ff" stopOpacity="0.95" />
                <stop offset="20%" stopColor="#e0e7ff" stopOpacity="0.85" />
                <stop offset="40%" stopColor="#c7d2fe" stopOpacity="0.7" />
                <stop offset="60%" stopColor="#a5b4fc" stopOpacity="0.6" />
                <stop offset="80%" stopColor="#818cf8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.3" />
              </linearGradient>

              {/* Glass stem gradient */}
              <linearGradient id="resGlassStemGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#c7d2fe" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0.6" />
              </linearGradient>

              {/* Sound wave gradient */}
              <linearGradient id="resGlassSoundGrad" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor={design.colors.accentPrimary} />
                <stop offset="50%" stopColor={design.colors.accentSecondary} />
                <stop offset="100%" stopColor="#f9a8d4" />
              </linearGradient>

              {/* Vibration glow */}
              <filter id="resGlassVibrationGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur2" />
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Sound wave glow */}
              <filter id="resGlassSoundGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur2" />
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Glass highlight */}
              <linearGradient id="resGlassHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fff" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
            </defs>

            <rect x="0" y="0" width="300" height="180" fill={design.colors.bgDeep} rx="12" />

            {/* Wine glass bowl with premium gradient */}
            <path
              d={`M 125 45 Q 112 75 118 105 Q 125 125 145 130 Q 165 125 172 105 Q 178 75 165 45 Z`}
              fill="url(#resGlassGradPremium)"
              stroke="#a5b4fc"
              strokeWidth="1.5"
            />

            {/* Glass highlight reflection */}
            <path
              d={`M 130 50 Q 125 70 128 90`}
              fill="none"
              stroke="url(#resGlassHighlight)"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Wine inside glass */}
            <path
              d={`M 128 70 Q 122 85 127 100 Q 133 110 145 112 Q 157 110 163 100 Q 168 85 162 70 Z`}
              fill="rgba(127, 29, 29, 0.6)"
              stroke="none"
            />

            {/* Glass stem with gradient */}
            <rect x="142" y="130" width="6" height="25" rx="1" fill="url(#resGlassStemGrad)" />

            {/* Glass base */}
            <ellipse cx="145" cy="158" rx="22" ry="4" fill="url(#resGlassStemGrad)" />
            <ellipse cx="145" cy="157" rx="18" ry="2" fill="rgba(255,255,255,0.1)" />

            {/* Vibration waves on glass - premium animated */}
            {[0, 1, 2].map((i) => {
              const vibrationIntensity = 8 + i * 3;
              return (
                <path
                  key={i}
                  d={`M ${125 - i * 12} ${80 + vibrationIntensity * Math.sin(time * 6)}
                      Q ${145} ${80 - vibrationIntensity * Math.sin(time * 6)}
                      ${165 + i * 12} ${80 + vibrationIntensity * Math.sin(time * 6)}`}
                  fill="none"
                  stroke={design.colors.violet}
                  strokeWidth={2.5 - i * 0.5}
                  opacity={0.9 - i * 0.25}
                  filter="url(#resGlassVibrationGlow)"
                />
              );
            })}

            {/* Stress fracture lines (subtle) */}
            <g opacity={0.3 + 0.2 * Math.sin(time * 6)}>
              <line x1="135" y1="65" x2="140" y2="85" stroke="#ef4444" strokeWidth="0.5" />
              <line x1="155" y1="70" x2="150" y2="90" stroke="#ef4444" strokeWidth="0.5" />
              <line x1="140" y1="95" x2="150" y2="100" stroke="#ef4444" strokeWidth="0.5" />
            </g>

            {/* Sound waves from singer - premium with glow */}
            <g transform="translate(235, 90)">
              {[0, 1, 2, 3, 4].map((i) => (
                <path
                  key={i}
                  d={`M 0 0
                      Q ${-12 - i * 8} ${-18 - i * 3} ${-28 - i * 14} 0
                      Q ${-12 - i * 8} ${18 + i * 3} 0 0`}
                  fill="none"
                  stroke="url(#resGlassSoundGrad)"
                  strokeWidth={2.5 - i * 0.3}
                  opacity={0.9 - i * 0.18}
                  filter="url(#resGlassSoundGlow)"
                >
                  <animate
                    attributeName="opacity"
                    values={`${0.9 - i * 0.18};${0.4 - i * 0.08};${0.9 - i * 0.18}`}
                    dur="0.4s"
                    repeatCount="indefinite"
                  />
                </path>
              ))}

              {/* Singer icon with glow */}
              <circle cx="20" cy="0" r="16" fill={design.colors.accentMuted} stroke={design.colors.accentPrimary} strokeWidth="2" />
              <circle cx="20" cy="0" r="20" fill="none" stroke={design.colors.accentPrimary} strokeWidth="1" opacity="0.3" filter="url(#resGlassSoundGlow)" />
            </g>
          </svg>

          {/* Caption outside SVG */}
          <p style={{ fontSize: typo.small, color: design.colors.textSecondary, textAlign: 'center', margin: 0 }}>
            Sound at natural frequency shatters glass
          </p>
        </div>
      );
    }

    if (app.id === 'bridge') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <svg viewBox="0 0 300 180" style={{ width: '100%', height: '140px' }}>
            <defs>
              {/* Tower gradient - 3D steel look */}
              <linearGradient id="resBridgeTowerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#374151" />
                <stop offset="25%" stopColor="#4b5563" />
                <stop offset="50%" stopColor="#6b7280" />
                <stop offset="75%" stopColor="#4b5563" />
                <stop offset="100%" stopColor="#374151" />
              </linearGradient>

              {/* Bridge deck gradient */}
              <linearGradient id="resBridgeDeckGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#059669" />
                <stop offset="30%" stopColor="#10b981" />
                <stop offset="70%" stopColor="#059669" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>

              {/* Cable gradient */}
              <linearGradient id="resBridgeCableGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#9ca3af" />
                <stop offset="50%" stopColor="#d1d5db" />
                <stop offset="100%" stopColor="#9ca3af" />
              </linearGradient>

              {/* Wind gradient */}
              <linearGradient id="resBridgeWindGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="30%" stopColor={design.colors.violet} stopOpacity="0.5" />
                <stop offset="100%" stopColor={design.colors.violet} />
              </linearGradient>

              {/* Damper gradient */}
              <radialGradient id="resBridgeDamperGrad" cx="30%" cy="30%">
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </radialGradient>

              {/* Motion blur for deck */}
              <filter id="resBridgeMotionBlur" x="-20%" y="-50%" width="140%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="0 3" />
              </filter>

              {/* Glow filter */}
              <filter id="resBridgeGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur2" />
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Water reflection gradient */}
              <linearGradient id="resBridgeWaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0c4a6e" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#0369a1" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            <rect x="0" y="0" width="300" height="180" fill={design.colors.bgDeep} rx="12" />

            {/* Water/ground */}
            <rect x="0" y="145" width="300" height="35" rx="0 0 12 12" fill="url(#resBridgeWaterGrad)" />

            {/* Bridge towers - 3D metallic */}
            <g>
              {/* Left tower */}
              <rect x="55" y="50" width="25" height="100" rx="2" fill="url(#resBridgeTowerGrad)" stroke="#4b5563" />
              <rect x="57" y="52" width="5" height="96" fill="rgba(255,255,255,0.1)" />
              <rect x="55" y="45" width="25" height="8" rx="2" fill="#6b7280" />

              {/* Right tower */}
              <rect x="220" y="50" width="25" height="100" rx="2" fill="url(#resBridgeTowerGrad)" stroke="#4b5563" />
              <rect x="222" y="52" width="5" height="96" fill="rgba(255,255,255,0.1)" />
              <rect x="220" y="45" width="25" height="8" rx="2" fill="#6b7280" />
            </g>

            {/* Main cables */}
            <path
              d={`M 67 50 Q 150 20 233 50`}
              fill="none"
              stroke="url(#resBridgeCableGrad)"
              strokeWidth="4"
            />

            {/* Suspension cables - animated */}
            {[0, 1, 2, 3, 4, 5, 6].map((i) => {
              const deckY = 100 + 12 * Math.sin(time * 2 + i * 0.4);
              const cableTopY = 50 - 30 * Math.sin((i / 6) * Math.PI);
              return (
                <line
                  key={i}
                  x1={75 + i * 22}
                  y1={cableTopY + 25}
                  x2={75 + i * 22}
                  y2={deckY}
                  stroke="url(#resBridgeCableGrad)"
                  strokeWidth="1.5"
                />
              );
            })}

            {/* Bridge deck (oscillating with motion blur) */}
            <path
              d={`M 25 ${100 + 12 * Math.sin(time * 2)}
                  Q 150 ${100 - 12 * Math.sin(time * 2)} 275 ${100 + 12 * Math.sin(time * 2)}`}
              fill="none"
              stroke="url(#resBridgeDeckGrad)"
              strokeWidth="8"
              strokeLinecap="round"
              filter="url(#resBridgeMotionBlur)"
            />

            {/* Deck highlight */}
            <path
              d={`M 25 ${98 + 12 * Math.sin(time * 2)}
                  Q 150 ${98 - 12 * Math.sin(time * 2)} 275 ${98 + 12 * Math.sin(time * 2)}`}
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Wind arrows - premium animated */}
            <g transform="translate(10, 70)">
              {[0, 1, 2, 3].map((i) => {
                const windOffset = (time * 50 + i * 20) % 80;
                return (
                  <g key={i} transform={`translate(${windOffset - 20}, ${i * 18})`} opacity={0.6 + 0.3 * Math.sin(time * 3 + i)}>
                    <line x1="0" y1="0" x2="35" y2="0" stroke="url(#resBridgeWindGrad)" strokeWidth="2.5" strokeLinecap="round" />
                    <polygon points="35,0 25,-4 25,4" fill={design.colors.violet} />
                  </g>
                );
              })}
            </g>

            {/* Tuned mass damper - 3D with glow */}
            <g transform={`translate(${145 + 6 * Math.sin(time * 2 + Math.PI)}, 115)`}>
              <rect x="-2" y="-2" width="24" height="24" rx="4" fill="none" stroke={design.colors.warning} strokeWidth="1" opacity="0.4" filter="url(#resBridgeGlow)" />
              <rect x="0" y="0" width="20" height="20" rx="4" fill="url(#resBridgeDamperGrad)" stroke="#92400e" strokeWidth="1" />
              <rect x="3" y="3" width="6" height="6" rx="1" fill="rgba(255,255,255,0.3)" />
            </g>

            {/* Frequency markers - showing resonance danger zone */}
            {[0, 1, 2].map((i) => (
              <circle
                key={i}
                cx="150"
                cy="100"
                r={30 + i * 15 + (time * 10) % 45}
                fill="none"
                stroke={design.colors.error}
                strokeWidth="1"
                opacity={0.3 - ((time * 10) % 45) / 150 - i * 0.08}
                strokeDasharray="4,4"
              />
            ))}
          </svg>

          {/* Caption outside SVG */}
          <p style={{ fontSize: typo.small, color: design.colors.textSecondary, textAlign: 'center', margin: 0 }}>
            Wind resonance can destroy bridges
          </p>
        </div>
      );
    }

    if (app.id === 'music') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <svg viewBox="0 0 300 180" style={{ width: '100%', height: '140px' }}>
            <defs>
              {/* Premium guitar body gradient - 6 stops for wood grain */}
              <linearGradient id="resMusicBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#d97706" />
                <stop offset="20%" stopColor="#b45309" />
                <stop offset="40%" stopColor="#92400e" />
                <stop offset="60%" stopColor="#78350f" />
                <stop offset="80%" stopColor="#92400e" />
                <stop offset="100%" stopColor="#78350f" />
              </linearGradient>

              {/* Body highlight gradient */}
              <radialGradient id="resMusicBodyHighlight" cx="30%" cy="30%" r="50%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
              </radialGradient>

              {/* Neck gradient */}
              <linearGradient id="resMusicNeckGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#57534e" />
                <stop offset="30%" stopColor="#44403c" />
                <stop offset="70%" stopColor="#292524" />
                <stop offset="100%" stopColor="#1c1917" />
              </linearGradient>

              {/* Sound hole gradient */}
              <radialGradient id="resMusicHoleGrad">
                <stop offset="0%" stopColor="#0c0a09" />
                <stop offset="70%" stopColor="#1c1917" />
                <stop offset="100%" stopColor="#292524" />
              </radialGradient>

              {/* String gradient - gold/bronze */}
              <linearGradient id="resMusicStringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#d4a017" />
                <stop offset="25%" stopColor="#fcd34d" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="75%" stopColor="#fcd34d" />
                <stop offset="100%" stopColor="#d4a017" />
              </linearGradient>

              {/* Sound wave gradient */}
              <radialGradient id="resMusicWaveGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={design.colors.warning} stopOpacity="0.6" />
                <stop offset="100%" stopColor={design.colors.warning} stopOpacity="0" />
              </radialGradient>

              {/* String vibration glow */}
              <filter id="resMusicStringGlow" x="-20%" y="-100%" width="140%" height="300%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur2" />
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Sound wave glow */}
              <filter id="resMusicSoundGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur2" />
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect x="0" y="0" width="300" height="180" fill={design.colors.bgDeep} rx="12" />

            {/* Guitar body - 3D with highlight */}
            <ellipse cx="200" cy="100" rx="72" ry="62" fill="url(#resMusicBodyGrad)" stroke="#92400e" strokeWidth="2" />
            <ellipse cx="200" cy="100" rx="70" ry="60" fill="url(#resMusicBodyHighlight)" />

            {/* Body edge highlight */}
            <ellipse cx="200" cy="100" rx="68" ry="58" fill="none" stroke="rgba(251,191,36,0.1)" strokeWidth="2" />

            {/* Sound hole with decorative ring */}
            <ellipse cx="200" cy="100" rx="26" ry="24" fill="url(#resMusicHoleGrad)" />
            <ellipse cx="200" cy="100" rx="30" ry="28" fill="none" stroke="#d4a017" strokeWidth="2" opacity="0.6" />
            <ellipse cx="200" cy="100" rx="34" ry="32" fill="none" stroke="#fcd34d" strokeWidth="1" opacity="0.3" />

            {/* Neck - 3D with frets */}
            <rect x="35" y="88" width="135" height="24" rx="2" fill="url(#resMusicNeckGrad)" />
            <rect x="35" y="88" width="135" height="3" fill="rgba(255,255,255,0.05)" />

            {/* Frets with metallic look */}
            {[55, 80, 102, 120, 135, 148].map((x, i) => (
              <g key={i}>
                <line x1={x} y1="89" x2={x} y2="111" stroke="#d6d3d1" strokeWidth="2.5" />
                <line x1={x + 1} y1="89" x2={x + 1} y2="111" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
              </g>
            ))}

            {/* Fret markers */}
            {[80, 120].map((x, i) => (
              <circle key={i} cx={x} cy="100" r="3" fill="#fafaf9" opacity="0.8" />
            ))}

            {/* Strings with premium vibration animation */}
            {[91, 95, 99, 103, 107, 111].map((y, i) => {
              const amplitude = i === 2 || i === 3 ? 5 : 3;
              const thickness = i === 0 ? 0.8 : i === 5 ? 2 : 1 + i * 0.2;
              return (
                <path
                  key={i}
                  d={`M 35 ${y}
                      Q 80 ${y + amplitude * Math.sin(time * 5 + i * 0.8)}
                      135 ${y}
                      Q 190 ${y - amplitude * Math.sin(time * 5 + i * 0.8)}
                      270 ${y}`}
                  fill="none"
                  stroke="url(#resMusicStringGrad)"
                  strokeWidth={thickness}
                  opacity={0.6 + (i === 2 || i === 3 ? 0.4 : 0.2)}
                  filter={i === 2 || i === 3 ? "url(#resMusicStringGlow)" : undefined}
                />
              );
            })}

            {/* Sound waves emanating from body - premium with glow */}
            {[0, 1, 2, 3].map((i) => {
              const baseRadius = 35;
              const maxExpand = 50;
              const expandProgress = ((time * 15 + i * 12) % maxExpand);
              return (
                <circle
                  key={i}
                  cx="200"
                  cy="100"
                  r={baseRadius + expandProgress}
                  fill="none"
                  stroke={design.colors.warning}
                  strokeWidth={2 - expandProgress / 30}
                  opacity={0.6 - expandProgress / maxExpand * 0.6}
                  filter="url(#resMusicSoundGlow)"
                />
              );
            })}

            {/* Bridge */}
            <rect x="225" y="95" width="35" height="10" rx="2" fill="#292524" stroke="#44403c" />

            {/* Headstock hint */}
            <rect x="20" y="92" width="18" height="16" rx="3" fill="#292524" stroke="#44403c" />
            {[94, 98, 102, 106].map((y, i) => (
              <circle key={i} cx="28" cy={y} r="2" fill="#d4a017" />
            ))}
          </svg>

          {/* Caption outside SVG */}
          <p style={{ fontSize: typo.small, color: design.colors.textSecondary, textAlign: 'center', margin: 0 }}>
            Guitar body resonates to amplify sound
          </p>
        </div>
      );
    }

    return null;
  };

  // Calculate score
  const calculateScore = (): number => {
    return answers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer as number]?.correct ? 1 : 0);
    }, 0);
  };
  const score = calculateScore();

  // ==================== PHASE RENDERS ====================

  // HOOK - Premium welcome screen
  if (phase === 'hook') {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        {/* Premium background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/3 rounded-full blur-3xl" />

        {renderProgressBar()}

        <div className="relative pt-16 pb-12">
          <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
            {/* Premium badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full mb-8">
              <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-violet-400 tracking-wide">PHYSICS EXPLORATION</span>
            </div>

            {/* Main title with gradient */}
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-violet-100 to-purple-200 bg-clip-text text-transparent">
              Resonance
            </h1>

            <p className="text-lg text-slate-400 max-w-md mb-10">
              Discover why matching frequencies creates powerful effects
            </p>

            {/* Premium card with graphic */}
            <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-purple-500/5 rounded-3xl" />

              <div className="relative">
                <p className="text-xl text-white/90 font-medium leading-relaxed mb-6">
                  Ever pushed someone on a swing? <span className="text-violet-400 font-semibold">Timing is everything!</span>
                </p>

                {/* Feature cards */}
                <div className="flex gap-4 justify-center mb-4">
                  {[
                    { icon: '🔊', label: 'Frequency' },
                    { icon: '📈', label: 'Amplitude' },
                    { icon: '⚡', label: 'Energy' }
                  ].map((item, i) => (
                    <div key={i} className="px-4 py-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                      <div className="text-2xl mb-1">{item.icon}</div>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Premium CTA button */}
            <button
              onClick={(e) => { e.preventDefault(); goToPhase('predict'); }}
              style={{ zIndex: 10 }}
              className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/25 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="relative z-10 flex items-center gap-3">
                Start Learning
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>

            {/* Feature hints */}
            <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <span className="text-violet-400">✦</span>
                Interactive Lab
              </div>
              <div className="flex items-center gap-2">
                <span className="text-purple-400">✦</span>
                10 Phases
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PREDICT
  if (phase === 'predict') {
    const options = [
      { id: 'nothing', text: 'Nothing special happens at any particular frequency' },
      { id: 'resonance', text: 'At one specific frequency, amplitude becomes maximum' },
      { id: 'random', text: 'The response is unpredictable and random' },
      { id: 'always_max', text: 'Amplitude is always maximum regardless of frequency' }
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
                What happens when driving frequency matches natural frequency?
              </h2>
              <p style={{ fontSize: '15px', color: design.colors.textSecondary }}>
                Imagine shaking a spring-mass system at different speeds. What do you predict?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md }}>
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
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
                    transition: 'all 0.2s ease',
                    zIndex: 10
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
          <div style={{ flex: 1, padding: design.spacing.lg, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
            {renderResonanceVisualization()}
          </div>

          {/* Controls */}
          <div style={{
            padding: design.spacing.lg,
            background: design.colors.bgCard,
            borderTop: `1px solid ${design.colors.border}`
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              {/* Frequency slider */}
              <div style={{ marginBottom: design.spacing.lg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: design.spacing.sm }}>
                  <label style={{ fontSize: '13px', color: design.colors.textSecondary, fontWeight: 600 }}>Driving Frequency</label>
                  <span style={{ fontSize: '13px', color: isAtResonance ? design.colors.success : design.colors.accentPrimary, fontWeight: 700 }}>
                    {drivingFrequency} Hz {isAtResonance ? '✓ RESONANCE!' : ''}
                  </span>
                </div>
                <input
                  type="range" min="50" max="400" value={drivingFrequency}
                  onChange={(e) => setDrivingFrequency(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: design.colors.accentPrimary }}
                />
              </div>

              {/* Status and continue */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{
                  padding: '12px 20px',
                  borderRadius: design.radius.md,
                  background: isAtResonance ? design.colors.successMuted : design.colors.bgElevated,
                  border: `1px solid ${isAtResonance ? design.colors.success : design.colors.border}`
                }}>
                  <span style={{ fontSize: '14px', color: isAtResonance ? design.colors.success : design.colors.textSecondary, fontWeight: 600 }}>
                    {isAtResonance ? '🎉 You found resonance!' : `Target: ${resonantFreq} Hz`}
                  </span>
                </div>
                {renderButton(foundResonance ? 'Continue' : 'Find Resonance First', () => goToPhase('review'), 'primary', !foundResonance)}
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
                The Physics of Resonance
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: design.spacing.md, marginBottom: design.spacing.xl }}>
              {[
                { icon: '🎯', title: 'Frequency Matching', desc: 'Maximum response when driving matches natural frequency' },
                { icon: '📈', title: 'Energy Accumulation', desc: 'Each cycle adds energy constructively' },
                { icon: '⚡', title: 'Amplitude Growth', desc: 'Response grows until limited by damping' },
                { icon: '🔄', title: 'Phase Relationship', desc: 'Velocity in phase with driving force at resonance' }
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
              <p style={{ fontSize: '11px', fontWeight: 700, color: design.colors.accentPrimary, marginBottom: design.spacing.md, textTransform: 'uppercase', letterSpacing: '1px' }}>Natural Frequency Formula</p>
              <p style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
                f = (1/2π)√(k/m)
              </p>
              <p style={{ fontSize: '13px', color: design.colors.textSecondary }}>
                k = stiffness, m = mass. Higher stiffness → higher frequency. More mass → lower frequency.
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
      { id: 'increase', text: 'Resonant frequency increases' },
      { id: 'decrease', text: 'Resonant frequency decreases' },
      { id: 'same', text: 'Resonant frequency stays the same' },
      { id: 'disappear', text: 'Resonance disappears entirely' }
    ];

    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: design.spacing.xl, overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ marginBottom: design.spacing.lg }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.violet, marginBottom: design.spacing.sm, textTransform: 'uppercase', letterSpacing: '1px' }}>
                New Variable
              </p>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: design.colors.textPrimary, marginBottom: design.spacing.sm }}>
                What happens when you add mass to the oscillator?
              </h2>
              <p style={{ fontSize: '15px', color: design.colors.textSecondary }}>
                Think about heavy vs. light pendulums. How does mass affect natural frequency?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md }}>
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setTwistPrediction(opt.id);
                    emitEvent('twist_prediction_made', { value: opt.id });
                  }}
                  style={{
                    padding: '18px 24px',
                    borderRadius: design.radius.lg,
                    border: `2px solid ${twistPrediction === opt.id ? design.colors.violet : design.colors.border}`,
                    background: twistPrediction === opt.id ? design.colors.violetMuted : design.colors.bgCard,
                    color: design.colors.textPrimary,
                    fontSize: '15px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    zIndex: 10
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

  // TWIST PLAY
  if (phase === 'twist_play') {
    return (
      <div style={containerStyle}>
        {renderProgressBar()}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Visualization */}
          <div style={{ flex: 1, padding: design.spacing.lg, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
            {renderResonanceVisualization()}
          </div>

          {/* Controls */}
          <div style={{
            padding: design.spacing.lg,
            background: design.colors.bgCard,
            borderTop: `1px solid ${design.colors.border}`
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              {/* Mass slider */}
              <div style={{ marginBottom: design.spacing.lg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: design.spacing.sm }}>
                  <label style={{ fontSize: '13px', color: design.colors.textSecondary, fontWeight: 600 }}>Added Mass</label>
                  <span style={{ fontSize: '13px', color: design.colors.violet, fontWeight: 700 }}>+{addedMass}g</span>
                </div>
                <input
                  type="range" min="0" max="60" value={addedMass}
                  onChange={(e) => setAddedMass(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: design.colors.violet }}
                />
              </div>

              {/* Frequency slider */}
              <div style={{ marginBottom: design.spacing.lg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: design.spacing.sm }}>
                  <label style={{ fontSize: '13px', color: design.colors.textSecondary, fontWeight: 600 }}>Driving Frequency</label>
                  <span style={{ fontSize: '13px', color: isAtResonance ? design.colors.success : design.colors.accentPrimary, fontWeight: 700 }}>
                    {drivingFrequency} Hz
                  </span>
                </div>
                <input
                  type="range" min="50" max="400" value={drivingFrequency}
                  onChange={(e) => setDrivingFrequency(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: design.colors.accentPrimary }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{
                  padding: '12px 20px',
                  borderRadius: design.radius.md,
                  background: design.colors.bgElevated
                }}>
                  <span style={{ fontSize: '12px', color: design.colors.textMuted }}>Natural Freq: </span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: design.colors.accentPrimary }}>{resonantFreq} Hz</span>
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
                Mass Controls Frequency!
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
                You discovered a fundamental relationship:
              </p>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li style={{ color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
                  <strong style={{ color: design.colors.accentPrimary }}>More mass = Lower frequency</strong> — Heavy pendulums swing slowly
                </li>
                <li style={{ color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
                  <strong style={{ color: design.colors.violet }}>Less mass = Higher frequency</strong> — Light objects vibrate faster
                </li>
                <li style={{ color: design.colors.textPrimary, marginBottom: design.spacing.md }}>
                  <strong style={{ color: design.colors.success }}>Bass speakers are bigger</strong> — Need more mass for low frequencies
                </li>
                <li style={{ color: design.colors.textPrimary }}>
                  <strong style={{ color: design.colors.warning }}>Engineers tune structures</strong> — Adjust mass to avoid dangerous resonances
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
                  position: 'relative',
                  zIndex: 10
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
                <p style={{ fontSize: '15px', color: design.colors.textSecondary, lineHeight: 1.7 }}>
                  {app.description}
                </p>
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

              {/* Mark as Read / Navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: design.spacing.md }}>
                {!completedApps.has(activeApp) ? (
                  <button
                    onClick={() => {
                      const newCompleted = new Set(completedApps);
                      newCompleted.add(activeApp);
                      setCompletedApps(newCompleted);
                      emitEvent('app_explored', { app: app.id });
                    }}
                    style={{
                      padding: '14px 24px',
                      borderRadius: design.radius.lg,
                      background: design.colors.successMuted,
                      border: `1px solid ${design.colors.success}40`,
                      color: design.colors.success,
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      zIndex: 10
                    }}
                  >
                    ✓ Mark "{app.title}" as Read
                  </button>
                ) : (
                  <div style={{
                    padding: '14px 24px',
                    borderRadius: design.radius.lg,
                    background: design.colors.successMuted,
                    border: `1px solid ${design.colors.success}30`,
                    color: design.colors.success,
                    fontSize: '14px',
                    fontWeight: 600
                  }}>
                    ✓ Completed
                  </div>
                )}

                {/* Next Application button - advances through applications */}
                {activeApp < applications.length - 1 ? (
                  <button
                    onClick={() => {
                      setActiveApp(activeApp + 1);
                    }}
                    style={{
                      padding: '14px 24px',
                      borderRadius: design.radius.lg,
                      background: `linear-gradient(135deg, ${design.colors.accentPrimary} 0%, ${design.colors.accentSecondary} 100%)`,
                      border: 'none',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: `0 4px 20px ${design.colors.accentGlow}`,
                      zIndex: 10
                    }}
                  >
                    Next Application →
                  </button>
                ) : allAppsCompleted ? (
                  renderButton('Take Quiz', () => goToPhase('test'), 'success')
                ) : (
                  <div style={{
                    padding: '14px 24px',
                    borderRadius: design.radius.lg,
                    background: design.colors.bgElevated,
                    border: `1px solid ${design.colors.border}`,
                    color: design.colors.textMuted,
                    fontSize: '13px'
                  }}>
                    Read all {applications.length} applications to unlock quiz ({completedApps.size}/{applications.length})
                  </div>
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
    const q = testQuestions[testIndex];
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
              {score >= 8 ? "Excellent! You've truly mastered resonance!" :
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
                    background: a !== null ? (testQuestions[i].options[a as number]?.correct ? design.colors.success : design.colors.error) :
                               i === testIndex ? design.colors.accentPrimary : design.colors.bgElevated
                  }} />
                ))}
              </div>
            </div>

            {/* Scenario */}
            {q.scenario && (
              <div style={{
                padding: design.spacing.md,
                marginBottom: design.spacing.md,
                borderRadius: design.radius.md,
                background: design.colors.bgElevated,
                border: `1px solid ${design.colors.border}`,
              }}>
                <p style={{ fontSize: '14px', color: design.colors.textSecondary, lineHeight: 1.6, margin: 0 }}>
                  {q.scenario}
                </p>
              </div>
            )}

            {/* Question */}
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: design.colors.textPrimary, marginBottom: design.spacing.lg, lineHeight: 1.5 }}>
              {q.question}
            </h3>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md }}>
              {q.options.map((option, i) => {
                const isSelected = answers[testIndex] === i;
                const isCorrect = option.correct;
                const showFeedback = answered;

                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (answered) return;
                      const newAnswers = [...answers];
                      newAnswers[testIndex] = i;
                      setAnswers(newAnswers);
                      emitEvent('test_answered', { questionIndex: testIndex, correct: option.correct });
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
                      transition: 'all 0.2s ease',
                      zIndex: 10
                    }}
                  >
                    {option.label}
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
              background: [design.colors.accentPrimary, design.colors.violet, design.colors.success, design.colors.warning][i % 4],
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
            You've mastered Resonance! You now understand one of physics' most powerful phenomena.
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
              {['Resonance', 'Natural Frequency', 'Damping', 'Mass Effect', 'Energy Transfer', 'Applications'].map((topic, i) => (
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
              setFoundResonance(false);
              setAddedMass(0);
              setDrivingFrequency(100);
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

export default ResonanceRenderer;
