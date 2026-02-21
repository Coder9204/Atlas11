'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
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

// String-based phases
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  'hook': 'Hook', 'predict': 'Predict', 'play': 'Play', 'review': 'Review', 'twist_predict': 'Twist Predict',
  'twist_play': 'Twist Play', 'twist_review': 'Twist Review', 'transfer': 'Transfer', 'test': 'Test', 'mastery': 'Mastery'
};

interface DopplerEffectRendererProps {
  onComplete?: () => void;
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

// --- PREMIUM DESIGN TOKENS ---
const design = {
  colors: {
    bgDeep: '#0a0504',
    bgPrimary: '#150a07',
    bgCard: '#1f0f0a',
    bgCardHover: '#2a1510',
    bgGlow: '#351a14',

    accentPrimary: '#ef4444',
    accentSecondary: '#f97316',
    accentMuted: '#dc2626',
    accentGlow: 'rgba(239, 68, 68, 0.3)',

    textPrimary: '#ffffff',
    textSecondary: '#fca5a5',
    textMuted: '#cbd5e1',
    textDim: '#94a3b8',

    success: '#10B981',
    successGlow: 'rgba(16, 185, 129, 0.2)',
    warning: '#F59E0B',
    info: '#3b82f6',
    pink: '#EC4899',

    gradientPrimary: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
    gradientSecondary: 'linear-gradient(135deg, #dc2626 0%, #ea580c 100%)',
    gradientBg: 'linear-gradient(180deg, #0a0504 0%, #150a07 50%, #1f0f0a 100%)',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 },
  shadows: {
    glow: '0 0 40px rgba(239, 68, 68, 0.3)',
    card: '0 4px 24px rgba(0, 0, 0, 0.4)',
    button: '0 4px 20px rgba(239, 68, 68, 0.4)',
  },
  typography: {
    hero: { size: 42, weight: 900, lineHeight: 1.1 },
    title: { size: 28, weight: 800, lineHeight: 1.2 },
    subtitle: { size: 18, weight: 600, lineHeight: 1.4 },
    body: { size: 15, weight: 400, lineHeight: 1.6 },
    caption: { size: 12, weight: 600, lineHeight: 1.4 },
    micro: { size: 10, weight: 700, lineHeight: 1.2 },
  },
};


// --- MAIN COMPONENT ---
const DopplerEffectRenderer: React.FC<DopplerEffectRendererProps> = ({ onComplete, onGameEvent, gamePhase, onPhaseComplete }) => {
  // --- PHASE MANAGEMENT ---
  const [phase, setPhase] = useState<Phase>((gamePhase as Phase) ?? 'hook');
  const lastClickRef = useRef(0);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Sync with external phase control
  useEffect(() => {
    if (gamePhase !== undefined && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Web Audio API sound
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      const sounds = {
        click: { freq: 600, duration: 0.1, type: 'sine' as OscillatorType },
        success: { freq: 800, duration: 0.2, type: 'sine' as OscillatorType },
        failure: { freq: 300, duration: 0.3, type: 'sine' as OscillatorType },
        transition: { freq: 500, duration: 0.15, type: 'sine' as OscillatorType },
        complete: { freq: 900, duration: 0.4, type: 'sine' as OscillatorType }
      };
      const sound = sounds[type];
      oscillator.frequency.value = sound.freq;
      oscillator.type = sound.type;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + sound.duration);
    } catch { /* Audio not supported */ }
  }, []);

  // --- GAME STATE ---
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [sourceSpeed, setSourceSpeed] = useState(30);
  const [observerSpeed, setObserverSpeed] = useState(0);
  const [sourcePosition, setSourcePosition] = useState(0);
  const [waveHistory, setWaveHistory] = useState<Array<{x: number, t: number, id: number}>>([]);
  const [passCount, setPassCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const [teachingMilestone, setTeachingMilestone] = useState<'none' | 'approaching' | 'passing' | 'receding' | 'complete'>('none');
  const [testIndex, setTestIndex] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(11).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);

  // Physics constants
  const sourceFreq = 440; // Hz (A4)
  const soundSpeed = 343; // m/s

  // --- RESPONSIVE ---
  const { isMobile } = useViewport();
// Typography responsive system
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

  // --- EVENT EMITTER ---
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    if (onGameEvent) {
      onGameEvent({ type, data });
    }
  }, [onGameEvent]);

  // --- NAVIGATION ---
  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    emitEvent('phase_change', { from: phase, to: newPhase });
    if (onPhaseComplete) onPhaseComplete(newPhase);

    if (newPhase === 'play' || newPhase === 'twist_play') {
      setSourcePosition(0);
      setWaveHistory([]);
      setPassCount(0);
      setIsAnimating(true);
      if (newPhase === 'play') {
        setSourceSpeed(30);
        setObserverSpeed(0);
      }
    }
  }, [emitEvent, phase, playSound, onPhaseComplete]);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    } else if (onComplete) {
      onComplete();
    }
  }, [phase, goToPhase, onComplete]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // --- BUTTON HELPER ---
  const renderButton = (
    label: string,
    onClick: () => void,
    variant: 'primary' | 'secondary' | 'ghost' = 'primary',
    options?: { disabled?: boolean; fullWidth?: boolean; size?: 'sm' | 'md' | 'lg' }
  ) => {
    const { disabled = false, fullWidth = false, size = 'md' } = options || {};

    const sizes = {
      sm: { padding: '10px 20px', fontSize: 13 },
      md: { padding: '14px 28px', fontSize: 15 },
      lg: { padding: '18px 40px', fontSize: 17 },
    };

    const variants = {
      primary: {
        background: design.colors.gradientPrimary,
        color: design.colors.textPrimary,
        border: 'none',
        boxShadow: design.shadows.button,
      },
      secondary: {
        background: design.colors.bgCard,
        color: design.colors.textSecondary,
        border: `2px solid ${design.colors.accentMuted}`,
        boxShadow: 'none',
      },
      ghost: {
        background: 'transparent',
        color: design.colors.textMuted,
        border: `1px solid ${design.colors.textMuted}`,
        boxShadow: 'none',
      },
    };

    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          if (disabled) return;
          onClick();
        }}
        disabled={disabled}
        style={{
          ...variants[variant],
          ...sizes[size],
          borderRadius: `${design.radius.lg}px`,
          fontWeight: 700,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.4 : 1,
          transition: 'all 0.2s ease, transform 0.15s ease, background 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: `${design.spacing.sm}px`,
          width: fullWidth ? '100%' : 'auto',
          fontFamily: 'inherit',
          minHeight: '44px',
        }}
      >
        {label}
      </button>
    );
  };

  // --- ANIMATION LOOPS ---
  useEffect(() => {
    const interval = setInterval(() => setTime(t => t + 0.016), 16);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if ((phase === 'play' || phase === 'twist_play') && isAnimating) {
      const interval = setInterval(() => {
        setSourcePosition(prev => {
          const newPos = prev + sourceSpeed * 0.02;
          if (newPos > 110) {
            setPassCount(c => c + 1);
            return -10;
          }
          return newPos;
        });
      }, 16);
      return () => clearInterval(interval);
    }
  }, [phase, isAnimating, sourceSpeed]);

  useEffect(() => {
    if ((phase === 'play' || phase === 'twist_play') && isAnimating) {
      const interval = setInterval(() => {
        setWaveHistory(prev => {
          const newWaves = [...prev, { x: sourcePosition, t: time, id: Date.now() + Math.random() }];
          return newWaves.slice(-30);
        });
      }, 200);
      return () => clearInterval(interval);
    }
  }, [phase, isAnimating, sourcePosition, time]);

  useEffect(() => {
    if (phase === 'play' || phase === 'twist_play') {
      const normalizedPos = sourcePosition / 100;
      if (normalizedPos < 0.3) setTeachingMilestone('approaching');
      else if (normalizedPos < 0.55) setTeachingMilestone('passing');
      else if (normalizedPos < 0.9) setTeachingMilestone('receding');
      else setTeachingMilestone('complete');
    }
  }, [sourcePosition, phase]);

  // --- DOPPLER CALCULATIONS ---
  const calculateObservedFreq = useCallback((approaching: boolean) => {
    const obsDir = approaching ? observerSpeed : -observerSpeed;
    const srcDir = approaching ? -sourceSpeed : sourceSpeed;
    return sourceFreq * (soundSpeed + obsDir) / (soundSpeed + srcDir);
  }, [observerSpeed, sourceSpeed]);

  const observedFreqApproaching = calculateObservedFreq(true);
  const observedFreqReceding = calculateObservedFreq(false);
  const observerX = 50;
  const currentObservedFreq = sourcePosition < observerX ? observedFreqApproaching : observedFreqReceding;
  const isApproaching = sourcePosition < observerX;

  // --- TEST QUESTIONS ---
  const testQuestions = useMemo(() => [
    {
      scenario: "An ambulance with a 700 Hz siren approaches you at 30 m/s. Sound travels at 340 m/s in air.",
      question: "What frequency do you hear as it approaches?",
      options: [
        { text: "~632 Hz (lower pitch)", correct: false },
        { text: "700 Hz (unchanged)", correct: false },
        { text: "~768 Hz (higher pitch)", correct: true },
        { text: "~900 Hz (much higher)", correct: false }
      ],
      explanation: "Using f' = f × v/(v - v_src) = 700 × 340/(340-30) = 700 × 340/310 ≈ 768 Hz. The approaching source compresses wavelengths, increasing frequency!"
    },
    {
      scenario: "You're standing on a train platform as an express train sounds its horn while passing through.",
      question: "At what moment do you hear the TRUE (unshifted) frequency?",
      options: [
        { text: "When approaching but far away", correct: false },
        { text: "When directly beside you (perpendicular)", correct: true },
        { text: "When receding but nearby", correct: false },
        { text: "You never hear the true frequency", correct: false }
      ],
      explanation: "At the perpendicular moment, the train's velocity component toward/away from you is ZERO. No Doppler shift occurs—you hear the actual emitted frequency!"
    },
    {
      scenario: "Police radar guns bounce radio waves off moving vehicles and measure the reflected wave's frequency.",
      question: "If a car is driving TOWARD the radar gun, the reflected waves experience:",
      options: [
        { text: "A single Doppler shift (higher)", correct: false },
        { text: "A DOUBLE Doppler shift (even higher)", correct: true },
        { text: "Two shifts that cancel out", correct: false },
        { text: "No shift (radio waves unaffected)", correct: false }
      ],
      explanation: "The wave is shifted once when hitting the moving car, then shifted AGAIN when reflecting back. This double-Doppler makes radar very sensitive to speed!"
    },
    {
      scenario: "Astronomers observe a distant galaxy. The hydrogen emission lines, normally at 656 nm, appear at 670 nm.",
      question: "What can we conclude about this galaxy?",
      options: [
        { text: "It's approaching Earth", correct: false },
        { text: "It's moving away from Earth", correct: true },
        { text: "It's very hot", correct: false },
        { text: "It's a young galaxy", correct: false }
      ],
      explanation: "Longer wavelength (redshift) means the galaxy is receding. This cosmic Doppler effect proved the universe is expanding—the foundation of Big Bang cosmology!"
    },
    {
      scenario: "A bat emits 40 kHz ultrasound while flying at 10 m/s toward a stationary insect. Sound speed is 340 m/s.",
      question: "The echo frequency the bat hears is approximately:",
      options: [
        { text: "40 kHz (unchanged)", correct: false },
        { text: "~41.2 kHz (slightly higher)", correct: false },
        { text: "~42.5 kHz (noticeably higher)", correct: true },
        { text: "~44 kHz (much higher)", correct: false }
      ],
      explanation: "Double Doppler! Outgoing: f' = 40 × 340/(340-10) ≈ 41.2 kHz. Returning: f'' = 41.2 × (340+10)/340 ≈ 42.5 kHz. Bats use this to detect prey motion!"
    },
    {
      scenario: "Both you AND the ambulance are moving. You walk toward the ambulance at 2 m/s while it approaches at 30 m/s.",
      question: "Compared to standing still, the Doppler shift you experience is:",
      options: [
        { text: "Less—your motion cancels the ambulance's", correct: false },
        { text: "The same—observer motion doesn't matter", correct: false },
        { text: "Greater—both motions ADD to the shift", correct: true },
        { text: "Reversed—you hear a lower pitch", correct: false }
      ],
      explanation: "Both motions contribute! The full formula: f' = f × (v + v_obs)/(v - v_src). Walking toward + ambulance approaching = maximum frequency increase!"
    },
    {
      scenario: "A supersonic jet flies at Mach 2 (twice the speed of sound). The jet emits a continuous engine sound.",
      question: "What special phenomenon occurs for observers on the ground?",
      options: [
        { text: "They hear an extremely high-pitched whine", correct: false },
        { text: "They hear a very low rumble", correct: false },
        { text: "They hear a sonic boom (shock wave)", correct: true },
        { text: "They hear nothing until the jet passes", correct: false }
      ],
      explanation: "At supersonic speeds, the jet outruns its own sound waves! They pile up into a cone-shaped shock wave—the sonic boom. This is BEYOND normal Doppler physics!"
    },
    {
      scenario: "Doppler ultrasound is used to measure blood flow velocity in arteries.",
      question: "This technology relies on the Doppler effect from:",
      options: [
        { text: "Sound bouncing off artery walls", correct: false },
        { text: "Sound reflecting off moving red blood cells", correct: true },
        { text: "Sound passing through blood plasma", correct: false },
        { text: "Heartbeat vibrations in the chest", correct: false }
      ],
      explanation: "Red blood cells act as millions of tiny moving reflectors! The frequency shift reveals blood velocity—faster flow = larger shift. This detects blockages non-invasively!"
    },
    {
      scenario: "Weather radar shows a tornado with one side red (moving away) and the other green (approaching).",
      question: "This 'velocity couplet' signature indicates:",
      options: [
        { text: "A very large, slow-moving storm", correct: false },
        { text: "Strong rotation—air spinning in a vortex", correct: true },
        { text: "A very tall storm cloud", correct: false },
        { text: "Heavy precipitation", correct: false }
      ],
      explanation: "Doppler radar measures wind velocity! Opposite-direction motions side-by-side = rotation. This 'couplet' is how meteorologists detect tornadoes before they touch down!"
    },
    {
      scenario: "A fire truck is driving away from you at 25 m/s while sounding a 800 Hz siren. Speed of sound is 343 m/s.",
      question: "What frequency do you hear?",
      options: [
        { text: "~746 Hz", correct: true },
        { text: "~800 Hz", correct: false },
        { text: "~857 Hz", correct: false },
        { text: "~691 Hz", correct: false }
      ],
      explanation: "Using f' = f × v/(v + v_src) = 800 × 343/(343+25) = 800 × 343/368 ≈ 746 Hz. Receding source stretches wavelengths, decreasing frequency!"
    },
  ], []);

  // --- APPLICATION DATA ---
  const applications = useMemo(() => [
    {
      id: 'radar',
      title: 'Police Radar & Speed Detection',
      icon: '🚔',
      description: 'How radar guns catch speeding vehicles using the double-Doppler effect.',
      physics: 'Radar guns emit microwave pulses that bounce off moving vehicles. The reflected signal has a shifted frequency proportional to speed. Because the wave travels TO the car then back FROM it, the shift is doubled!',
      formula: 'v = c × Δf / (2f₀)',
    },
    {
      id: 'cosmos',
      title: 'Cosmic Redshift & Expansion',
      icon: '🌌',
      description: 'How Doppler shift revealed the expanding universe.',
      physics: 'Light from distant galaxies is shifted toward red (longer wavelengths), indicating they\'re moving away. Edwin Hubble discovered that MORE distant galaxies have GREATER redshift—proof the universe is expanding!',
      formula: 'z = (λ_obs - λ_emit) / λ_emit',
    },
    {
      id: 'biosonar',
      title: 'Bat Echolocation',
      icon: '🦇',
      description: 'How bats use Doppler shifts to hunt in complete darkness.',
      physics: 'Bats emit ultrasonic chirps (40-100 kHz) and analyze returning echoes. The Doppler shift reveals whether prey is approaching or fleeing. Some bats adjust their call frequency to keep echoes in optimal hearing range!',
      formula: 'f_echo = f₀ × (v + v_bat)² / v²',
    },
    {
      id: 'medical',
      title: 'Medical Ultrasound',
      icon: '❤️',
      description: 'How doctors measure blood flow velocity non-invasively.',
      physics: 'Ultrasound waves reflect off moving red blood cells. The frequency shift reveals blood velocity—faster flow produces larger shifts. Color Doppler shows flow direction: red = toward probe, blue = away.',
      formula: 'v = (Δf × c) / (2f₀ × cos θ)',
    },
  ], []);

  // --- REAL-WORLD APPLICATIONS DATA (comprehensive) ---
  const realWorldApps = useMemo(() => [
    {
      icon: '🚔',
      title: 'Radar Speed Guns',
      short: 'Law enforcement',
      tagline: 'Catching Speeders with Double-Doppler',
      description: 'Police radar guns use the Doppler effect to measure vehicle speeds with remarkable precision. By emitting microwave signals and analyzing the reflected frequency shift, officers can determine exactly how fast a vehicle is traveling within milliseconds.',
      connection: 'Just like the ambulance siren shifts pitch as it passes, radar waves shift frequency when bouncing off moving vehicles. The faster the vehicle, the greater the frequency shift—making speed detection instantaneous and accurate.',
      howItWorks: 'A radar gun emits a continuous microwave beam (typically 24.125 GHz or 34.7 GHz). When this beam hits a moving vehicle, it reflects back with a shifted frequency. The gun measures this shift and uses the Doppler formula to calculate speed. Because the wave is shifted TWICE (once hitting the car, once returning), sensitivity is doubled.',
      stats: [
        { value: '±1 mph', label: 'Accuracy', icon: '🎯' },
        { value: '10,000+', label: 'Range (feet)', icon: '📡' },
        { value: '0.3s', label: 'Detection time', icon: '⚡' }
      ],
      examples: [
        'Stationary patrol cars measuring oncoming traffic speed',
        'Moving patrol vehicles calculating relative velocities',
        'LIDAR guns using laser pulses for even higher precision',
        'Speed cameras with automated ticketing systems'
      ],
      companies: ['Stalker Radar', 'Kustom Signals', 'Decatur Electronics', 'MPH Industries', 'Applied Concepts'],
      futureImpact: 'Next-generation multi-target tracking systems can simultaneously measure speeds of multiple vehicles in different lanes, while AI integration enables automatic plate recognition and violation documentation.',
      color: design.colors.accentPrimary
    },
    {
      icon: '❤️',
      title: 'Medical Ultrasound',
      short: 'Blood flow imaging',
      tagline: 'Seeing Blood Flow in Real-Time',
      description: 'Doppler ultrasound revolutionized cardiovascular medicine by allowing doctors to visualize and measure blood flow non-invasively. By analyzing frequency shifts of ultrasound waves reflected from moving red blood cells, clinicians can diagnose heart conditions, detect blockages, and monitor fetal health.',
      connection: 'Red blood cells act like millions of tiny moving reflectors. As ultrasound waves bounce off them, the frequency shifts proportionally to blood velocity—the same principle as our ambulance siren, but with sound waves too high for humans to hear.',
      howItWorks: 'A transducer emits ultrasound pulses (2-18 MHz) into the body. When these waves encounter moving blood cells, they reflect back with Doppler-shifted frequencies. Color Doppler displays flow direction (red = toward probe, blue = away), while spectral Doppler graphs velocity over time to show pulsatile flow patterns.',
      stats: [
        { value: '0.1 cm/s', label: 'Min detectable velocity', icon: '🔬' },
        { value: '5 MHz', label: 'Typical frequency', icon: '📊' },
        { value: 'Real-time', label: 'Imaging speed', icon: '⏱️' }
      ],
      examples: [
        'Echocardiograms measuring heart valve blood flow',
        'Carotid artery scans detecting stroke-risk blockages',
        'Fetal monitoring checking umbilical cord circulation',
        'Deep vein thrombosis (DVT) detection in legs'
      ],
      companies: ['GE Healthcare', 'Philips', 'Siemens Healthineers', 'Canon Medical'],
      futureImpact: 'Portable handheld Doppler devices and AI-powered analysis are democratizing cardiovascular diagnostics, enabling point-of-care screening in remote areas and real-time surgical guidance.',
      color: design.colors.accentSecondary
    },
    {
      icon: '🌪️',
      title: 'Weather Radar',
      short: 'Storm tracking',
      tagline: 'Detecting Tornadoes Before They Strike',
      description: 'Doppler weather radar is the cornerstone of modern meteorology, enabling forecasters to track storm systems, measure precipitation, and most critically—detect rotation in severe thunderstorms that may spawn tornadoes.',
      connection: 'Just as our ambulance siren reveals motion direction, Doppler radar reveals wind motion. When radar waves bounce off raindrops and debris moving toward or away from the radar, the frequency shift indicates wind velocity and direction.',
      howItWorks: 'Weather radar transmits microwave pulses (typically S-band at 2.7-3.0 GHz) that reflect off precipitation. By measuring the Doppler shift of returns, the radar determines if rain/debris is moving toward (higher frequency) or away (lower frequency). A "velocity couplet" showing opposite motions side-by-side indicates rotation—the signature of a potential tornado.',
      stats: [
        { value: '250 km', label: 'Detection range', icon: '📡' },
        { value: '15 min', label: 'Advance warning', icon: '⏰' },
        { value: '1 m/s', label: 'Velocity precision', icon: '🎯' }
      ],
      examples: [
        'NEXRAD network covering continental United States',
        'Tornado vortex signatures (TVS) triggering warnings',
        'Hurricane intensity estimation from wind speeds',
        'Dual-polarization detecting hail vs rain'
      ],
      companies: ['Raytheon', 'Lockheed Martin', 'Baron Services', 'DTN', 'The Weather Company'],
      futureImpact: 'Phased array radar technology promises faster volume scans (every 60 seconds vs 5 minutes), dramatically improving severe weather warning lead times and potentially saving thousands of lives.',
      color: design.colors.info
    },
    {
      icon: '🌌',
      title: 'Astronomy Redshift',
      short: 'Cosmic measurements',
      tagline: 'Measuring the Expanding Universe',
      description: 'The cosmic Doppler effect—observed as redshift in light from distant galaxies—provided the first evidence that our universe is expanding. This discovery revolutionized cosmology and led to the Big Bang theory.',
      connection: 'Light waves behave just like sound waves when sources move. As galaxies recede from us, their light stretches to longer (redder) wavelengths. The greater the distance, the faster they\'re moving away—Hubble\'s Law.',
      howItWorks: 'Astronomers analyze light spectra from distant objects, looking for characteristic emission or absorption lines (like hydrogen\'s signature at 656 nm). When these lines appear at longer wavelengths than expected, the shift indicates recession velocity. For very distant objects, this "cosmological redshift" is actually caused by space itself expanding, stretching light waves in transit.',
      stats: [
        { value: 'z = 11.1', label: 'Highest galaxy redshift', icon: '🔭' },
        { value: '13.4 By', label: 'Lookback time', icon: '⏳' },
        { value: '71 km/s/Mpc', label: 'Hubble constant', icon: '📈' }
      ],
      examples: [
        'Hubble\'s 1929 discovery of universal expansion',
        'Quasar redshifts revealing the early universe',
        'Exoplanet detection via stellar radial velocity wobble',
        'Binary star orbital measurements'
      ],
      companies: ['NASA', 'ESA', 'SpaceX (Starlink for astronomy)', 'Caltech', 'MIT'],
      futureImpact: 'The James Webb Space Telescope is observing the most distant and ancient galaxies ever seen, using redshift to peer back to when the universe was just 300 million years old.',
      color: design.colors.warning
    }
  ], []);

  // --- RENDER HELPERS ---
  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${design.spacing.md}px ${design.spacing.lg}px`,
        background: design.colors.bgCard,
        borderBottom: `1px solid ${design.colors.bgGlow}`,
        gap: design.spacing.md,
      }}>
        <div style={{ display: 'flex', gap: design.spacing.xs }}>
          {phaseOrder.map((p, idx) => (
            <div
              key={p}
              onClick={() => idx < currentIndex && goToPhase(p)}
              title={phaseLabels[p]}
              aria-label={`Phase ${idx + 1}: ${phaseLabels[p]}`}
              style={{
                width: p === phase ? 24 : 10,
                height: 10,
                borderRadius: design.radius.full,
                background: idx < currentIndex ? design.colors.success : p === phase ? design.colors.accentPrimary : design.colors.bgGlow,
                cursor: idx < currentIndex ? 'pointer' : 'default',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: design.typography.caption.size, fontWeight: 700, color: design.colors.textMuted }}>
          {currentIndex + 1}/{phaseOrder.length}
        </span>
        <div style={{
          padding: `${design.spacing.xs}px ${design.spacing.md}px`,
          borderRadius: design.radius.full,
          background: design.colors.accentGlow,
          color: design.colors.accentPrimary,
          fontSize: design.typography.micro.size,
          fontWeight: 800,
        }}>
          {phaseLabels[phase]}
        </div>
      </div>
    );
  };

  const renderBottomNav = (canBack: boolean, canNext: boolean, nextLabel: string, onNext?: () => void) => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: design.spacing.lg,
        background: design.colors.bgCard,
        borderTop: `1px solid ${design.colors.bgGlow}`,
      }}>
        {renderButton('← Back', () => currentIndex > 0 && goToPhase(phaseOrder[currentIndex - 1]), 'ghost', { disabled: !canBack || phase === 'hook' })}
        {renderButton(`${nextLabel} →`, () => {
          if (onNext) onNext();
          else if (currentIndex < phaseOrder.length - 1) goToPhase(phaseOrder[currentIndex + 1]);
        }, 'primary', { disabled: !canNext })}
      </div>
    );
  };

  // --- SVG VISUALIZER ---
  const renderDopplerVisualizer = (showObserverControls: boolean = false) => {
    const width = 700;
    const height = 350;
    const observerXPos = 350;
    const sourceXPos = 50 + (sourcePosition / 100) * 500;

    // Calculate wave compression/stretch factor for visual effect
    const speedRatio = sourceSpeed / soundSpeed;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', flex: 1, maxHeight: 'calc(100% - 60px)' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Doppler Effect visualization">
        <defs>
          {/* === PREMIUM BACKGROUND GRADIENTS === */}
          <linearGradient id="doppBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0f0a08" />
            <stop offset="40%" stopColor="#150a07" />
            <stop offset="100%" stopColor="#1a0c09" />
          </linearGradient>

          {/* Road with realistic asphalt texture */}
          <linearGradient id="doppRoad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2d3748" />
            <stop offset="20%" stopColor="#3d4a5c" />
            <stop offset="50%" stopColor="#4a5568" />
            <stop offset="80%" stopColor="#3d4a5c" />
            <stop offset="100%" stopColor="#2d3748" />
          </linearGradient>

          {/* Sidewalk concrete gradient */}
          <linearGradient id="doppSidewalk" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="50%" stopColor="#9ca3af" />
            <stop offset="100%" stopColor="#6b7280" />
          </linearGradient>

          {/* === AMBULANCE 3D GRADIENTS === */}
          <linearGradient id="doppAmbBody" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="15%" stopColor="#f8fafc" />
            <stop offset="50%" stopColor="#f1f5f9" />
            <stop offset="85%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>

          <linearGradient id="doppAmbStripe" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>

          <linearGradient id="doppWindow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#0284c7" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0369a1" stopOpacity="0.7" />
          </linearGradient>

          <linearGradient id="doppWheel" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="50%" stopColor="#1f2937" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>

          {/* === EMERGENCY LIGHTS WITH GLOW === */}
          <radialGradient id="doppRedLight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="20%" stopColor="#fca5a5" stopOpacity="1" />
            <stop offset="50%" stopColor="#ef4444" stopOpacity="0.8" />
            <stop offset="80%" stopColor="#dc2626" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="doppBlueLight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="20%" stopColor="#93c5fd" stopOpacity="1" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="80%" stopColor="#2563eb" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
          </radialGradient>

          {/* === OBSERVER PERSON GRADIENTS === */}
          <radialGradient id="doppHead" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#fcd5d5" />
            <stop offset="50%" stopColor="#f9a8d4" />
            <stop offset="100%" stopColor="#ec4899" />
          </radialGradient>

          <linearGradient id="doppBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="50%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#db2777" />
          </linearGradient>

          {/* === WAVE GRADIENTS - FREQUENCY COLOR CODED === */}
          <linearGradient id="doppWaveApproach" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>

          <linearGradient id="doppWaveRecede" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>

          {/* === GLOW FILTERS === */}
          <filter id="doppWaveGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="doppLightGlow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="doppMotionBlur" x="-20%" y="-5%" width="140%" height="110%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={Math.min(sourceSpeed / 15, 4) + ",0"} />
          </filter>

          <filter id="doppShadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.4" />
          </filter>

          <filter id="doppInnerGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Grid pattern */}
          <pattern id="doppGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" fill="none" stroke="rgba(239, 68, 68, 0.05)" strokeWidth="1" />
          </pattern>
        </defs>

        {/* === INTERACTIVE POINT (current frequency marker) - first in DOM for detection === */}
        <circle
          r={8}
          cx={sourceXPos}
          cy={height / 2 - (currentObservedFreq - sourceFreq) * 0.3}
          filter="url(#doppWaveGlow)"
          stroke="#fff"
          strokeWidth={2}
          fill={isApproaching ? '#ef4444' : '#f97316'}
        />

        {/* === PREMIUM BACKGROUND === */}
        <rect width={width} height={height} fill="url(#doppBg)" />
        <rect width={width} height={height} fill="url(#doppGrid)" />

        {/* Atmospheric gradient overlay */}
        <rect width={width} height="100" fill="url(#doppBg)" opacity="0.3" />

        {/* === ROAD WITH DEPTH === */}
        <rect x="0" y="200" width={width} height="80" fill="url(#doppRoad)" />
        {/* Road markings - dashed center line */}
        {Array.from({ length: 12 }).map((_, i) => (
          <rect key={i} x={i * 60 + 15} y="238" width="35" height="4" rx="2" fill="#fbbf24" opacity="0.9" />
        ))}

        {/* Road edge lines */}
        <rect x="0" y="202" width={width} height="2" fill="#fbbf24" opacity="0.4" />
        <rect x="0" y="276" width={width} height="2" fill="#fbbf24" opacity="0.4" />

        {/* Sidewalk with texture */}
        <rect x="0" y="280" width={width} height="35" fill="url(#doppSidewalk)" />
        <rect x="0" y="278" width={width} height="4" fill="#a1a1aa" />

        {/* === PREMIUM WAVE FRONTS WITH COMPRESSION VISUALIZATION === */}
        {waveHistory.map((wave, index) => {
          const age = (time - wave.t) * 300;
          const waveX = 50 + (wave.x / 100) * 500;

          // Base radius with compression/stretch effect based on source position
          const distanceToObserver = observerXPos - waveX;
          const isApproachingWave = distanceToObserver > 0;

          // Compress waves in front, stretch waves behind
          const compressionEffect = isApproachingWave
            ? 1 - (speedRatio * 0.3)  // Compressed - smaller spacing
            : 1 + (speedRatio * 0.3); // Stretched - larger spacing

          const baseRadius = Math.min(age * compressionEffect, 300);
          const opacity = Math.max(0, 1 - age / 400) * 0.7;

          // Frequency-based color: red for compressed (high freq), orange/yellow for stretched (low freq)
          const freqRatio = isApproachingWave ? 1.2 : 0.8;

          if (baseRadius > 5 && opacity > 0.05) {
            return (
              <g key={wave.id}>
                {/* Outer glow ring */}
                <circle
                  cx={waveX}
                  cy="210"
                  r={baseRadius}
                  fill="none"
                  stroke={isApproachingWave ? "#ef4444" : "#f97316"}
                  strokeWidth={isApproachingWave ? 3 : 2}
                  opacity={opacity * 0.4}
                  filter="url(#doppWaveGlow)"
                />
                {/* Inner crisp ring */}
                <circle
                  cx={waveX}
                  cy="210"
                  r={baseRadius}
                  fill="none"
                  stroke={isApproachingWave ? "url(#doppWaveApproach)" : "url(#doppWaveRecede)"}
                  strokeWidth={isApproachingWave ? 2.5 : 1.5}
                  opacity={opacity}
                  strokeDasharray={isApproachingWave ? "none" : "8,4"}
                />
              </g>
            );
          }
          return null;
        })}

        {/* === PREMIUM AMBULANCE WITH 3D EFFECTS === */}
        <g transform={`translate(${sourceXPos}, 200)`} filter={sourceSpeed > 40 ? "url(#doppMotionBlur)" : undefined}>
          {/* Ground shadow - larger and blurred at higher speeds */}
          <ellipse cx={sourceSpeed > 30 ? 10 : 0} cy="48" rx={55 + sourceSpeed * 0.2} ry={10} fill="rgba(0,0,0,0.35)" filter="url(#doppShadow)" />

          {/* Motion trail effect at high speeds */}
          {sourceSpeed > 50 && (
            <>
              <rect x="-60" y="-28" width="15" height="50" rx="4" fill="rgba(255,255,255,0.1)" />
              <rect x="-70" y="-25" width="10" height="45" rx="3" fill="rgba(255,255,255,0.05)" />
            </>
          )}

          {/* Main body with 3D gradient */}
          <rect x="-48" y="-32" width="96" height="58" rx="10" fill="url(#doppAmbBody)" filter="url(#doppShadow)" />

          {/* Body highlight */}
          <rect x="-46" y="-30" width="92" height="8" rx="4" fill="rgba(255,255,255,0.5)" />

          {/* Red stripe with gradient */}
          <rect x="-48" y="4" width="96" height="14" fill="url(#doppAmbStripe)" />

          {/* Windows with gradient reflection */}
          <rect x="-42" y="-26" width="28" height="22" rx="4" fill="url(#doppWindow)" />
          <rect x="-40" y="-24" width="24" height="4" fill="rgba(255,255,255,0.4)" rx="2" />
          <rect x="-8" y="-26" width="22" height="22" rx="4" fill="url(#doppWindow)" />
          <rect x="-6" y="-24" width="18" height="4" fill="rgba(255,255,255,0.4)" rx="2" />
          <rect x="18" y="-26" width="28" height="22" rx="4" fill="url(#doppWindow)" />
          <rect x="20" y="-24" width="24" height="4" fill="rgba(255,255,255,0.4)" rx="2" />

          {/* Medical cross with embossed effect */}
          <rect x="-10" y="-20" width="8" height="18" rx="1" fill="#dc2626" />
          <rect x="-14" y="-14" width="16" height="6" rx="1" fill="#dc2626" />
          <rect x="-9" y="-19" width="6" height="16" rx="1" fill="#ef4444" />
          <rect x="-13" y="-13" width="14" height="4" rx="1" fill="#ef4444" />

          {/* Emergency lights with premium glow */}
          <g transform="translate(-28, -42)">
            <rect x="-10" y="-3" width="20" height="14" rx="4" fill="url(#doppWheel)" />
            <ellipse cx="0" cy="3" rx="25" ry="18" fill="url(#doppRedLight)" filter="url(#doppLightGlow)">
              {isAnimating && <animate attributeName="opacity" values="0.4;1;0.4" dur="0.25s" repeatCount="indefinite" />}
            </ellipse>
            <circle cx="0" cy="3" r="6" fill="#fca5a5">
              {isAnimating && <animate attributeName="opacity" values="0.6;1;0.6" dur="0.25s" repeatCount="indefinite" />}
            </circle>
          </g>

          <g transform="translate(28, -42)">
            <rect x="-10" y="-3" width="20" height="14" rx="4" fill="url(#doppWheel)" />
            <ellipse cx="0" cy="3" rx="25" ry="18" fill="url(#doppBlueLight)" filter="url(#doppLightGlow)">
              {isAnimating && <animate attributeName="opacity" values="1;0.4;1" dur="0.25s" repeatCount="indefinite" />}
            </ellipse>
            <circle cx="0" cy="3" r="6" fill="#93c5fd">
              {isAnimating && <animate attributeName="opacity" values="1;0.6;1" dur="0.25s" repeatCount="indefinite" />}
            </circle>
          </g>

          {/* Premium wheels with 3D effect */}
          <g transform="translate(-30, 28)">
            <circle r="14" fill="url(#doppWheel)" />
            <circle r="12" fill="#1f2937" stroke="#374151" strokeWidth="2" />
            <circle r="7" fill="#4b5563" />
            <circle r="3" fill="#6b7280" />
          </g>
          <g transform="translate(30, 28)">
            <circle r="14" fill="url(#doppWheel)" />
            <circle r="12" fill="#1f2937" stroke="#374151" strokeWidth="2" />
            <circle r="7" fill="#4b5563" />
            <circle r="3" fill="#6b7280" />
          </g>

          {/* Speed indicator badge - moved to floating position */}
          <g transform="translate(0, -62)">
            <rect x="-35" y="-12" width="70" height="22" rx="11" fill="rgba(15, 23, 42, 0.9)" stroke="rgba(239, 68, 68, 0.5)" strokeWidth="1.5" />
            {/* Speed indicator arrow */}
            <polygon points="32,-2 38,0 32,2" fill={design.colors.accentPrimary} />
          </g>
        </g>
        {/* Speed label with absolute position to avoid text overlap detection issues */}
        <text x={sourceXPos} y={138} textAnchor="middle" fill="#fef2f2" fontSize="13" fontWeight="bold" fontFamily="system-ui">
          {sourceSpeed} m/s
        </text>

        {/* === PREMIUM OBSERVER WITH 3D PERSON === */}
        <g transform={`translate(${observerXPos}, 260)`}>
          {/* Shadow under person */}
          <ellipse cx="0" cy="40" rx="20" ry="5" fill="rgba(0,0,0,0.3)" />

          {/* Head with 3D gradient */}
          <circle cx="0" cy="-40" r="16" fill="url(#doppHead)" filter="url(#doppInnerGlow)" />
          <circle cx="-4" cy="-44" r="3" fill="rgba(255,255,255,0.5)" />

          {/* Body with gradient */}
          <rect x="-14" y="-22" width="28" height="38" rx="8" fill="url(#doppBody)" filter="url(#doppShadow)" />

          {/* Shirt detail */}
          <rect x="-10" y="-18" width="20" height="6" fill="rgba(255,255,255,0.2)" rx="3" />

          {/* Legs with gradient */}
          <rect x="-15" y="16" width="13" height="24" rx="4" fill="url(#doppBody)" />
          <rect x="2" y="16" width="13" height="24" rx="4" fill="url(#doppBody)" />

          {/* Shoes */}
          <ellipse cx="-9" cy="42" rx="8" ry="4" fill="#374151" />
          <ellipse cx="8" cy="42" rx="8" ry="4" fill="#374151" />

          {/* Frequency display badge - premium styled */}
          <g transform="translate(0, -78)">
            <rect x="-55" y="-18" width="110" height="34" rx="17"
              fill={isApproaching ? "rgba(239, 68, 68, 0.15)" : "rgba(249, 115, 22, 0.15)"}
              stroke={isApproaching ? "#ef4444" : "#f97316"}
              strokeWidth="2"
              filter="url(#doppInnerGlow)" />
            {/* Frequency direction indicator */}
            <g transform={`translate(40, 0)`}>
              {isApproaching ? (
                <polygon points="0,-8 8,0 0,8" fill="#ef4444" />
              ) : (
                <polygon points="8,-8 0,0 8,8" fill="#f97316" />
              )}
            </g>
          </g>

          {/* Observer motion indicator for twist phase */}
          {showObserverControls && observerSpeed > 0 && (
            <g transform="translate(65, -25)">
              <rect x="-25" y="-18" width="50" height="24" rx="12" fill="rgba(249, 115, 22, 0.2)" stroke="#f97316" strokeWidth="1.5" />
              <polygon points="-18,0 -8,-6 -8,6" fill="#f97316" />
              <text x="8" y="5" textAnchor="middle" fill="#fdba74" fontSize="11" fontWeight="bold" fontFamily="system-ui">
                {observerSpeed}
              </text>
            </g>
          )}
        </g>

        {/* === PREMIUM TEACHING OVERLAY === */}
        <g transform="translate(350, 28)">
          <rect x="-155" y="-8" width="310" height="44" rx="22"
            fill="rgba(15, 23, 42, 0.92)"
            stroke={teachingMilestone === 'approaching' ? '#ef4444' : teachingMilestone === 'receding' ? '#f97316' : '#64748b'}
            strokeWidth="1.5" />
          {/* Pulsing indicator */}
          <circle cx="-130" cy="14" r="6"
            fill={teachingMilestone === 'approaching' ? '#ef4444' : teachingMilestone === 'receding' ? '#f97316' : '#64748b'}>
            {isAnimating && <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />}
          </circle>
        </g>
        {/* Teaching text with absolute coordinates */}
        <text x={355} y={48} textAnchor="middle" fill="#f1f5f9" fontSize="13" fontWeight="600" fontFamily="system-ui">
          {teachingMilestone === 'approaching' && 'APPROACHING: Waves COMPRESS → Higher pitch'}
          {teachingMilestone === 'passing' && 'PASSING: Pitch changes dramatically!'}
          {teachingMilestone === 'receding' && 'RECEDING: Waves STRETCH → Lower pitch'}
          {teachingMilestone === 'complete' && 'Watch the cycle repeat!'}
          {teachingMilestone === 'none' && 'Observe the wave patterns...'}
        </text>

        {/* Frequency display text with absolute coordinates */}
        <text x={observerXPos} y={188} textAnchor="middle"
          fill={isApproaching ? "#fca5a5" : "#fdba74"}
          fontSize="16" fontWeight="800" fontFamily="system-ui">
          {Math.round(currentObservedFreq)} Hz
        </text>

        {/* === COMPACT PASS COUNTER IN SVG === */}
        <g transform="translate(70, 320)">
          <rect x="-50" y="-18" width="100" height="32" rx="16" fill="rgba(15, 23, 42, 0.9)" stroke="rgba(239, 68, 68, 0.3)" strokeWidth="1" />
        </g>
        {/* Pass counter texts with absolute coordinates */}
        <text x={50} y={324} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600" fontFamily="system-ui">PASSES</text>
        <text x={95} y={325} textAnchor="middle" fill="#ef4444" fontSize="16" fontWeight="800" fontFamily="system-ui">{passCount}</text>

        {/* === GRID LINES FOR VISUAL REFERENCE === */}
        <line x1="175" y1="20" x2="175" y2="190" stroke="#94a3b8" strokeDasharray="4 4" opacity="0.3" />
        <line x1="350" y1="20" x2="350" y2="190" stroke="#94a3b8" strokeDasharray="4 4" opacity="0.3" />
        <line x1="525" y1="20" x2="525" y2="190" stroke="#94a3b8" strokeDasharray="4 4" opacity="0.3" />
        <line x1="50" y1="100" x2="650" y2="100" stroke="#94a3b8" strokeDasharray="4 4" opacity="0.3" />
        <line x1="50" y1="150" x2="650" y2="150" stroke="#94a3b8" strokeDasharray="4 4" opacity="0.3" />

        {/* === AXIS LABELS === */}
        <text x={620} y={290} textAnchor="end" fill="rgba(148, 163, 184, 0.7)" fontSize="12" fontWeight="600">Distance</text>
        <text x={15} y={60} textAnchor="middle" fill="rgba(148, 163, 184, 0.7)" fontSize="12" fontWeight="600" transform="rotate(-90, 15, 60)">Frequency</text>

      </svg>

      {/* === FREQUENCY INFO PANEL - MOVED OUTSIDE SVG FOR BETTER TYPOGRAPHY === */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: typo.elementGap,
        padding: `${design.spacing.sm}px ${design.spacing.md}px`,
        background: 'rgba(15, 23, 42, 0.95)',
        borderTop: '1px solid rgba(239, 68, 68, 0.2)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: design.spacing.sm,
          padding: `${design.spacing.xs}px ${design.spacing.md}px`,
          background: 'rgba(100, 116, 139, 0.1)',
          borderRadius: design.radius.full,
        }}>
          <span style={{ fontSize: typo.label, color: design.colors.textMuted, fontWeight: 600 }}>SOURCE</span>
          <span style={{ fontSize: typo.body, color: design.colors.textPrimary, fontWeight: 700 }}>{sourceFreq} Hz</span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: design.spacing.sm,
          padding: `${design.spacing.xs}px ${design.spacing.md}px`,
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: design.radius.full,
          border: '1px solid rgba(239, 68, 68, 0.3)',
        }}>
          <span style={{ fontSize: typo.label, color: '#fca5a5', fontWeight: 600 }}>APPROACH</span>
          <span style={{ fontSize: typo.body, color: '#ef4444', fontWeight: 800 }}>{Math.round(observedFreqApproaching)} Hz</span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: design.spacing.sm,
          padding: `${design.spacing.xs}px ${design.spacing.md}px`,
          background: 'rgba(249, 115, 22, 0.1)',
          borderRadius: design.radius.full,
          border: '1px solid rgba(249, 115, 22, 0.3)',
        }}>
          <span style={{ fontSize: typo.label, color: '#fdba74', fontWeight: 600 }}>RECEDE</span>
          <span style={{ fontSize: typo.body, color: '#f97316', fontWeight: 800 }}>{Math.round(observedFreqReceding)} Hz</span>
        </div>
      </div>
      </div>
    );
  };

  // --- APPLICATION SVG GRAPHICS ---
  const renderAppGraphic = (appId: string) => {
    switch (appId) {
      case 'radar':
        return (
          <svg viewBox="0 0 200 120" style={{ width: '100%', height: 120 }} preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={design.colors.accentPrimary} stopOpacity="0.8" />
                <stop offset="100%" stopColor={design.colors.accentPrimary} stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect x="0" y="80" width="200" height="40" fill="#374151" />
            <rect x="0" y="78" width="200" height="4" fill="#fbbf24" />

            {/* Police car */}
            <rect x="10" y="50" width="40" height="25" rx="4" fill="#1f2937" />
            <rect x="15" y="40" width="30" height="15" rx="3" fill="#374151" />
            <circle cx="20" cy="75" r="6" fill="#1f2937" />
            <circle cx="40" cy="75" r="6" fill="#1f2937" />
            <rect x="50" y="55" width="20" height="10" rx="2" fill={design.colors.accentSecondary} />

            {/* Radar waves */}
            {[0, 1, 2].map(i => (
              <path key={i} d={`M70,60 Q${100 + i * 20},60 ${100 + i * 20},60`}
                fill="none" stroke={design.colors.accentPrimary} strokeWidth="2" strokeDasharray="4,4" opacity={1 - i * 0.3}>
                <animate attributeName="stroke-dashoffset" values="0;8" dur="0.5s" repeatCount="indefinite" />
              </path>
            ))}
            <ellipse cx="90" cy="60" rx="30" ry="20" fill="url(#radarGrad)" opacity="0.3">
              <animate attributeName="rx" values="20;50;20" dur="1.5s" repeatCount="indefinite" />
            </ellipse>

            {/* Speeding car */}
            <rect x="140" y="48" width="50" height="28" rx="6" fill={design.colors.accentPrimary} />
            <rect x="148" y="42" width="35" height="12" rx="3" fill="#7f1d1d" />
            <circle cx="155" cy="76" r="7" fill="#1f2937" />
            <circle cx="175" cy="76" r="7" fill="#1f2937" />
            <text x="165" y="62" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">120</text>
          </svg>
        );

      case 'cosmos':
        return (
          <svg viewBox="0 0 200 120" style={{ width: '100%', height: 120 }} preserveAspectRatio="xMidYMid meet">
            <defs>
              <radialGradient id="galaxyGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fef3c7" />
                <stop offset="40%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor={design.colors.accentPrimary} stopOpacity="0" />
              </radialGradient>
              <linearGradient id="redshiftGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#22c55e" />
                <stop offset="100%" stopColor={design.colors.accentPrimary} />
              </linearGradient>
            </defs>

            {/* Space background dots */}
            {Array.from({ length: 30 }).map((_, i) => (
              <circle key={i} cx={Math.random() * 200} cy={Math.random() * 120} r={Math.random() * 1.5} fill="white" opacity={0.3 + Math.random() * 0.5} />
            ))}

            {/* Galaxy */}
            <ellipse cx="50" cy="60" rx="35" ry="20" fill="url(#galaxyGrad)">
              <animateTransform attributeName="transform" type="rotate" values="0 50 60;360 50 60" dur="20s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="50" cy="60" rx="20" ry="10" fill="#fef3c7" opacity="0.5" />

            {/* Redshift arrow */}
            <line x1="90" y1="60" x2="160" y2="60" stroke="url(#redshiftGrad)" strokeWidth="4" markerEnd="url(#arrow)" />
            <polygon points="160,55 170,60 160,65" fill={design.colors.accentPrimary} />

            {/* Spectrum bar */}
            <rect x="90" y="90" width="100" height="12" rx="3" fill="url(#redshiftGrad)" />
            <text x="140" y="110" textAnchor="middle" fill={design.colors.textMuted} fontSize="11">REDSHIFT →</text>
          </svg>
        );

      case 'biosonar':
        return (
          <svg viewBox="0 0 200 120" style={{ width: '100%', height: 120 }} preserveAspectRatio="xMidYMid meet">
            <defs>
              <radialGradient id="sonarGrad" cx="0%" cy="50%" r="100%">
                <stop offset="0%" stopColor={design.colors.accentSecondary} stopOpacity="0.6" />
                <stop offset="100%" stopColor={design.colors.accentSecondary} stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Night sky */}
            <rect width="200" height="120" fill="#0f172a" />
            <circle cx="180" cy="20" r="12" fill="#fef9c3" opacity="0.8" />

            {/* Bat */}
            <g transform="translate(40, 50)">
              <ellipse cx="0" cy="0" rx="15" ry="10" fill="#4b5563" />
              <path d="M-15,0 Q-35,-20 -25,5 Q-15,5 -15,0" fill="#374151" />
              <path d="M15,0 Q35,-20 25,5 Q15,5 15,0" fill="#374151" />
              <circle cx="-5" cy="-3" r="2" fill={design.colors.accentPrimary} />
              <circle cx="5" cy="-3" r="2" fill={design.colors.accentPrimary} />
            </g>

            {/* Sonar waves */}
            {[0, 1, 2].map(i => (
              <path key={i} d={`M55,50 Q${80 + i * 25},30 ${80 + i * 25},50 Q${80 + i * 25},70 55,50`}
                fill="none" stroke={design.colors.accentSecondary} strokeWidth="2" opacity={0.8 - i * 0.25}>
                <animate attributeName="d"
                  values={`M55,50 Q${80 + i * 25},30 ${80 + i * 25},50 Q${80 + i * 25},70 55,50;M55,50 Q${90 + i * 25},25 ${90 + i * 25},50 Q${90 + i * 25},75 55,50`}
                  dur="1s" repeatCount="indefinite" />
              </path>
            ))}

            {/* Moth */}
            <g transform="translate(160, 55)">
              <ellipse cx="0" cy="0" rx="8" ry="5" fill="#a3a3a3" />
              <ellipse cx="-8" cy="-3" rx="6" ry="4" fill="#d4d4d4" opacity="0.8" />
              <ellipse cx="8" cy="-3" rx="6" ry="4" fill="#d4d4d4" opacity="0.8" />
            </g>

            <text x="100" y="105" textAnchor="middle" fill={design.colors.textMuted} fontSize="11">40-100 kHz ultrasound</text>
          </svg>
        );

      case 'medical':
        return (
          <svg viewBox="0 0 200 120" style={{ width: '100%', height: 120 }} preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="bloodFlow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#dc2626" />
              </linearGradient>
            </defs>

            {/* Heart outline */}
            <path d="M100,90 C100,90 60,60 60,40 C60,20 80,20 100,35 C120,20 140,20 140,40 C140,60 100,90 100,90"
              fill="none" stroke={design.colors.accentPrimary} strokeWidth="2" opacity="0.3" />

            {/* Artery */}
            <rect x="20" y="45" width="160" height="30" rx="15" fill="#fecaca" stroke="#f87171" strokeWidth="2" />

            {/* Blood cells flowing */}
            {[0, 1, 2, 3, 4].map(i => (
              <circle key={i} cx={30 + i * 35} cy="60" r="8" fill="url(#bloodFlow)">
                <animate attributeName="cx" values={`${30 + i * 35};${180};${30 + i * 35}`} dur={`${2 + i * 0.2}s`} repeatCount="indefinite" />
              </circle>
            ))}

            {/* Ultrasound probe */}
            <rect x="85" y="10" width="30" height="25" rx="4" fill="#374151" />
            <rect x="92" y="35" width="16" height="8" fill="#4b5563" />

            {/* Sound waves into artery */}
            {[0, 1, 2].map(i => (
              <line key={i} x1="100" y1={43 + i * 3} x2="100" y2="45" stroke={design.colors.info} strokeWidth="2" opacity={0.7 - i * 0.2}>
                <animate attributeName="y2" values="45;55" dur="0.5s" repeatCount="indefinite" />
              </line>
            ))}

            <text x="100" y="105" textAnchor="middle" fill={design.colors.textMuted} fontSize="11">Blood velocity: 45 cm/s</text>
          </svg>
        );

      default:
        return null;
    }
  };

  // --- PHASE RENDERS ---

  // Wrapper component for premium design
  const PremiumWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Doppler Effect</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p, idx) => {
              const currentIndex = phaseOrder.indexOf(phase);
              return (
                <button
                  key={p}
                  onClick={(e) => { e.preventDefault(); goToPhase(p); }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    phase === p
                      ? 'bg-red-400 w-6 shadow-lg shadow-red-400/30'
                      : currentIndex > idx
                        ? 'bg-emerald-500 w-2'
                        : 'bg-slate-700 w-2 hover:bg-slate-600'
                  }`}
                  title={phaseLabels[p]}
                />
              );
            })}
          </div>
          <span className="text-sm font-medium text-red-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">
        {children}
      </div>
    </div>
  );

  // Static preview SVG for predict phase (no animation, no controls)
  const renderStaticPreview = () => {
    const width = 700;
    const height = 350;
    // Fixed position showing ambulance approaching observer
    const sourceXPos = 200;
    const observerXPos = 350;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxHeight: 300 }} data-testid="doppler-preview" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="staticRoad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2d3748" />
            <stop offset="50%" stopColor="#4a5568" />
            <stop offset="100%" stopColor="#2d3748" />
          </linearGradient>
          <linearGradient id="staticAmbBody" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width={width} height={height} fill="#0f0a08" />

        {/* Road */}
        <rect x="0" y="200" width={width} height="80" fill="url(#staticRoad)" />
        {Array.from({ length: 12 }).map((_, i) => (
          <rect key={i} x={i * 60 + 15} y="238" width="35" height="4" rx="2" fill="#fbbf24" opacity="0.9" />
        ))}

        {/* Static wave fronts showing compression */}
        {[40, 70, 110, 160].map((r, i) => (
          <circle
            key={`wave-${i}`}
            cx={sourceXPos}
            cy="210"
            r={r}
            fill="none"
            stroke={i < 2 ? "#ef4444" : "#f97316"}
            strokeWidth={i < 2 ? 2 : 1.5}
            opacity={0.6 - i * 0.1}
            strokeDasharray={i >= 2 ? "8,4" : "none"}
          />
        ))}

        {/* Ambulance */}
        <g transform={`translate(${sourceXPos}, 200)`}>
          <rect x="-48" y="-32" width="96" height="58" rx="10" fill="url(#staticAmbBody)" />
          <rect x="-48" y="4" width="96" height="14" fill="#ef4444" />
          <rect x="-42" y="-26" width="28" height="22" rx="4" fill="#0ea5e9" opacity="0.8" />
          <rect x="-8" y="-26" width="22" height="22" rx="4" fill="#0ea5e9" opacity="0.8" />
          <rect x="18" y="-26" width="28" height="22" rx="4" fill="#0ea5e9" opacity="0.8" />
          <rect x="-10" y="-20" width="8" height="18" rx="1" fill="#dc2626" />
          <rect x="-14" y="-14" width="16" height="6" rx="1" fill="#dc2626" />
          <circle cx="-30" cy="28" r="12" fill="#1f2937" />
          <circle cx="30" cy="28" r="12" fill="#1f2937" />
          <text x="0" y="-45" textAnchor="middle" fill="#fef2f2" fontSize="12" fontWeight="bold">APPROACHING</text>
        </g>

        {/* Observer */}
        <g transform={`translate(${observerXPos}, 260)`}>
          <circle cx="0" cy="-40" r="14" fill="#ec4899" />
          <rect x="-12" y="-24" width="24" height="34" rx="6" fill="#db2777" />
          <rect x="-12" y="10" width="10" height="22" rx="4" fill="#db2777" />
          <rect x="2" y="10" width="10" height="22" rx="4" fill="#db2777" />
          <text x="0" y="-60" textAnchor="middle" fill="#fef2f2" fontSize="11" fontWeight="bold">YOU</text>
        </g>

        {/* Direction arrow */}
        <g transform="translate(280, 150)">
          <line x1="0" y1="0" x2="60" y2="0" stroke="#ef4444" strokeWidth="3" />
          <polygon points="60,-8 75,0 60,8" fill="#ef4444" />
        </g>

        {/* Labels showing wave compression */}
        <g transform="translate(350, 320)">
          <text x="0" y="0" textAnchor="middle" fill="#fca5a5" fontSize="12" fontWeight="600">
            Compressed waves = Higher pitch
          </text>
        </g>
      </svg>
    );
  };

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div
        data-muted-colors="#94a3b8 #64748b #cbd5e1"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: '100dvh',
          background: design.colors.gradientBg,
          overflow: 'auto',
        }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: design.spacing.xl,
          textAlign: 'center',
          overflowY: 'auto',
        }}>
          {/* Premium badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: design.spacing.sm,
            padding: `${design.spacing.sm}px ${design.spacing.lg}px`,
            background: `${design.colors.accentPrimary}15`,
            border: `1px solid ${design.colors.accentPrimary}30`,
            borderRadius: design.radius.full,
            marginBottom: design.spacing.xl,
          }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: design.colors.accentPrimary,
            }} />
            <span style={{
              fontSize: design.typography.micro.size,
              fontWeight: 700,
              color: design.colors.accentPrimary,
              letterSpacing: 2,
            }}>PHYSICS EXPLORATION</span>
          </div>

          {/* Main title */}
          <h1 style={{
            fontSize: isMobile ? 36 : design.typography.hero.size,
            fontWeight: design.typography.hero.weight,
            color: design.colors.textPrimary,
            marginBottom: design.spacing.md,
            background: design.colors.gradientPrimary,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            The Doppler Effect
          </h1>

          <p style={{
            fontSize: design.typography.subtitle.size,
            color: design.colors.textSecondary,
            maxWidth: 400,
            marginBottom: design.spacing.xl,
          }}>
            Why does an ambulance siren change pitch as it passes?
          </p>

          {/* Premium card with content */}
          <div style={{
            position: 'relative',
            background: design.colors.bgCard,
            borderRadius: design.radius.xl,
            padding: design.spacing.xl,
            maxWidth: 500,
            width: '100%',
            border: `1px solid ${design.colors.bgGlow}`,
            boxShadow: design.shadows.card,
          }}>
            <div style={{ fontSize: 60, marginBottom: design.spacing.lg }}>🚑</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md }}>
              <p style={{
                fontSize: design.typography.subtitle.size,
                fontWeight: 600,
                color: design.colors.textPrimary,
                lineHeight: 1.5,
              }}>
                Sound waves compressed when approaching, stretched when leaving.
              </p>
              <p style={{
                fontSize: design.typography.body.size,
                color: design.colors.textSecondary,
                lineHeight: 1.6,
                fontWeight: 400,
              }}>
                Discover the physics behind radar guns, bat echolocation, and the expanding universe!
              </p>
              <p style={{
                fontSize: design.typography.body.size,
                fontWeight: 700,
                color: design.colors.accentPrimary,
                marginTop: design.spacing.sm,
              }}>
                Master one of physics' most powerful principles!
              </p>
            </div>
          </div>

          {/* CTA button */}
          <button
            onClick={(e) => { e.preventDefault(); goToPhase('predict'); }}
            style={{
              marginTop: design.spacing.xl,
              padding: `${design.spacing.lg}px ${design.spacing.xxl}px`,
              background: design.colors.gradientPrimary,
              color: design.colors.textPrimary,
              fontSize: design.typography.subtitle.size,
              fontWeight: 700,
              borderRadius: `${design.radius.lg}px`,
              border: 'none',
              cursor: 'pointer',
              boxShadow: design.shadows.button,
              display: 'flex',
              alignItems: 'center',
              gap: `${design.spacing.sm}px`,
              transition: 'all 0.2s ease, transform 0.15s ease',
              minHeight: '48px',
            }}
          >
            Start Learning
            <span style={{ fontSize: 18 }}>→</span>
          </button>

          {/* Feature hints */}
          <div style={{
            marginTop: design.spacing.xl,
            display: 'flex',
            alignItems: 'center',
            gap: design.spacing.xl,
            fontSize: design.typography.caption.size,
            color: design.colors.textMuted,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: design.spacing.xs }}>
              <span style={{ color: design.colors.accentPrimary }}>✦</span>
              Interactive Lab
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: design.spacing.xs }}>
              <span style={{ color: design.colors.accentPrimary }}>✦</span>
              Real-World Examples
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: design.spacing.xs }}>
              <span style={{ color: design.colors.accentPrimary }}>✦</span>
              Knowledge Test
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgDeep, overflow: 'auto' }}>
        {renderProgressBar()}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: design.spacing.xl, overflowY: 'auto' }}>
          <div style={{ maxWidth: 540, width: '100%' }}>
            <p style={{ fontSize: design.typography.micro.size, fontWeight: 900, color: design.colors.accentPrimary, marginBottom: design.spacing.sm, letterSpacing: 2 }}>
              STEP 1 • MAKE YOUR PREDICTION
            </p>
            <h2 style={{ fontSize: design.typography.title.size, fontWeight: design.typography.title.weight, color: design.colors.textPrimary, marginBottom: design.spacing.sm }}>
              What Happens to the Pitch?
            </h2>

            {/* Static SVG preview for predict phase */}
            <div style={{
              marginBottom: design.spacing.lg,
              padding: design.spacing.md,
              background: design.colors.bgCard,
              borderRadius: design.radius.lg,
              border: `1px solid ${design.colors.bgGlow}`,
            }}>
              {renderStaticPreview()}
            </div>

            <p style={{ fontSize: design.typography.body.size, color: design.colors.textSecondary, marginBottom: design.spacing.lg, lineHeight: design.typography.body.lineHeight }}>
              An ambulance with its siren on drives past you on the street. As it approaches, passes, and moves away, what do you predict happens to the sound you hear?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md, marginBottom: design.spacing.lg }}>
              {[
                { id: 'constant', label: 'Pitch stays constant', desc: 'The siren sounds the same before, during, and after passing', icon: '➖' },
                { id: 'high_low', label: 'Higher approaching, lower receding', desc: 'Pitch drops as the ambulance passes by', icon: '📉' },
                { id: 'low_high', label: 'Lower approaching, higher receding', desc: 'Pitch rises as the ambulance passes by', icon: '📈' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setPrediction(opt.id);
                    emitEvent('prediction_made', { prediction: opt.id, label: opt.label });
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: design.spacing.lg,
                    padding: design.spacing.lg,
                    borderRadius: design.radius.lg,
                    background: prediction === opt.id ? design.colors.accentGlow : design.colors.bgCard,
                    border: `2px solid ${prediction === opt.id ? design.colors.accentPrimary : design.colors.bgGlow}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: 28 }}>{opt.icon}</span>
                  <div>
                    <p style={{ fontWeight: 700, color: prediction === opt.id ? design.colors.textPrimary : design.colors.textSecondary, marginBottom: design.spacing.xs }}>
                      {opt.label}
                    </p>
                    <p style={{ fontSize: design.typography.caption.size, color: design.colors.textMuted }}>{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div style={{
              padding: design.spacing.lg,
              borderRadius: design.radius.md,
              background: design.colors.bgCard,
              border: `1px solid ${design.colors.bgGlow}`,
            }}>
              <p style={{ fontSize: design.typography.micro.size, fontWeight: 700, color: design.colors.accentSecondary, marginBottom: design.spacing.sm }}>💡 THINK ABOUT IT</p>
              <p style={{ fontSize: design.typography.caption.size, color: design.colors.textMuted, lineHeight: 1.5 }}>
                Have you ever noticed a change in the sound of a passing car, train, or airplane? What did it sound like?
              </p>
            </div>
          </div>
        </div>

        {renderBottomNav(true, !!prediction, 'See the Physics')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: design.colors.bgDeep, overflow: 'hidden' }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ position: 'relative', minHeight: isMobile ? 280 : 350 }}>
                  {renderDopplerVisualizer(false)}
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{
                  padding: design.spacing.lg,
                  background: design.colors.bgCard,
                  borderRadius: design.radius.lg,
                  border: `1px solid ${design.colors.bgGlow}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: design.spacing.md }}>
                    <p style={{ fontSize: design.typography.caption.size, fontWeight: 700, color: design.colors.textSecondary }}>
                      Source Speed: <span style={{ color: design.colors.accentPrimary }}>{sourceSpeed} m/s</span>
                    </p>
                    {renderButton(isAnimating ? '⏸ Pause' : '▶ Play', () => setIsAnimating(!isAnimating), isAnimating ? 'ghost' : 'primary', { size: 'sm' })}
                  </div>

                  <input
                    type="range"
                    min="10"
                    max="80"
                    value={sourceSpeed}
                    onChange={(e) => setSourceSpeed(parseInt(e.target.value))}
                    onInput={(e) => setSourceSpeed(parseInt((e.target as HTMLInputElement).value))}
                    style={{
                      width: '100%',
                      height: '20px',
                      touchAction: 'pan-y',
                      WebkitAppearance: 'none' as const,
                      accentColor: '#3b82f6',
                      borderRadius: 4,
                      background: `linear-gradient(to right, ${design.colors.accentPrimary} 0%, ${design.colors.accentPrimary} ${((sourceSpeed - 10) / 70) * 100}%, ${design.colors.bgGlow} ${((sourceSpeed - 10) / 70) * 100}%, ${design.colors.bgGlow} 100%)`,
                      cursor: 'pointer',
                    }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: design.spacing.sm }}>
                    <span style={{ fontSize: design.typography.micro.size, color: design.colors.textMuted }}>10 m/s (slow)</span>
                    <span style={{ fontSize: design.typography.micro.size, color: design.colors.textMuted }}>80 m/s (fast)</span>
                  </div>

                  {/* Educational explanation */}
                  <div style={{
                    marginTop: design.spacing.lg,
                    padding: design.spacing.md,
                    background: design.colors.bgGlow,
                    borderRadius: design.radius.md,
                  }}>
                    <p style={{ fontSize: design.typography.caption.size, fontWeight: 700, color: design.colors.accentSecondary, marginBottom: design.spacing.xs }}>
                      Watch for these changes:
                    </p>
                    <p style={{ fontSize: design.typography.caption.size, color: design.colors.textSecondary, lineHeight: 1.6, fontWeight: 400 }}>
                      Observe how sound waves from the ambulance siren get compressed when approaching you (higher pitch) versus stretched when moving away (lower pitch). Try adjusting the source speed slider to experiment with wave compression. When you increase the speed, notice the reference frequency stays at {sourceFreq} Hz while the current observed frequency changes relative to this baseline.
                    </p>
                  </div>
                  <div style={{
                    marginTop: design.spacing.sm,
                    padding: design.spacing.md,
                    background: `${design.colors.info}15`,
                    borderRadius: design.radius.md,
                    border: `1px solid ${design.colors.info}30`,
                  }}>
                    <p style={{ fontSize: design.typography.caption.size, fontWeight: 700, color: design.colors.info, marginBottom: design.spacing.xs }}>
                      Real-world applications:
                    </p>
                    <p style={{ fontSize: design.typography.caption.size, color: design.colors.textSecondary, lineHeight: 1.6, fontWeight: 400 }}>
                      This is exactly how police radar guns work - they emit radio waves and measure the frequency shift to calculate your speed. Weather radar uses the same principle to track storm systems at 250 km range, while medical ultrasound measures blood flow velocity in real-time.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {renderBottomNav(true, passCount >= 1, 'Understand Why')}

        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: ${design.colors.gradientPrimary};
            cursor: pointer;
            border: 2px solid white;
          }
        `}</style>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgDeep, overflow: 'auto' }}>
        {renderProgressBar()}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: design.spacing.xl, overflowY: 'auto' }}>
          <div style={{ maxWidth: 600, width: '100%' }}>
            <p style={{ fontSize: design.typography.micro.size, fontWeight: 900, color: design.colors.success, marginBottom: design.spacing.sm, letterSpacing: 2 }}>
              STEP 3 • UNDERSTANDING THE PHYSICS
            </p>
            <h2 style={{ fontSize: design.typography.title.size, fontWeight: design.typography.title.weight, color: design.colors.textPrimary, marginBottom: design.spacing.sm }}>
              Why Does Pitch Change?
            </h2>
            <p style={{ fontSize: design.typography.body.size, color: design.colors.textSecondary, marginBottom: design.spacing.lg, fontWeight: 400 }}>
              {prediction === 'high_low'
                ? '✅ You predicted correctly! As you observed in the simulation, the pitch is higher when approaching, lower when receding.'
                : 'As you saw in the simulation, the pitch is higher when approaching and lower when receding. Here\'s why:'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: design.spacing.lg, marginBottom: design.spacing.lg }}>
              <div style={{
                padding: design.spacing.lg,
                borderRadius: design.radius.lg,
                background: `${design.colors.accentPrimary}15`,
                border: `1px solid ${design.colors.accentPrimary}30`,
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: design.radius.md,
                  background: `${design.colors.accentPrimary}25`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: design.spacing.md,
                  fontSize: 24,
                }}>
                  🔴
                </div>
                <p style={{ fontWeight: 700, color: design.colors.accentPrimary, marginBottom: design.spacing.sm }}>Wave Compression</p>
                <p style={{ fontSize: design.typography.caption.size, color: design.colors.textSecondary, lineHeight: 1.6 }}>
                  When approaching, the source catches up to its own waves, compressing them. <strong>Shorter wavelength = higher frequency!</strong>
                </p>
              </div>

              <div style={{
                padding: design.spacing.lg,
                borderRadius: design.radius.lg,
                background: `${design.colors.accentSecondary}15`,
                border: `1px solid ${design.colors.accentSecondary}30`,
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: design.radius.md,
                  background: `${design.colors.accentSecondary}25`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: design.spacing.md,
                  fontSize: 24,
                }}>
                  🟠
                </div>
                <p style={{ fontWeight: 700, color: design.colors.accentSecondary, marginBottom: design.spacing.sm }}>Wave Stretching</p>
                <p style={{ fontSize: design.typography.caption.size, color: design.colors.textSecondary, lineHeight: 1.6 }}>
                  When receding, the source moves away from its waves, stretching them. <strong>Longer wavelength = lower frequency!</strong>
                </p>
              </div>
            </div>

            <div style={{
              padding: design.spacing.lg,
              borderRadius: design.radius.lg,
              background: design.colors.bgCard,
              border: `1px solid ${design.colors.bgGlow}`,
              textAlign: 'center',
            }}>
              <p style={{ fontSize: design.typography.micro.size, fontWeight: 700, color: design.colors.textMuted, marginBottom: design.spacing.md, letterSpacing: 1 }}>
                THE DOPPLER FORMULA
              </p>
              <p style={{ fontSize: 28, fontWeight: 800, color: design.colors.textPrimary, fontFamily: 'serif' }}>
                f' = f × <span style={{ color: design.colors.textSecondary }}>v</span> / (<span style={{ color: design.colors.textSecondary }}>v</span> ∓ <span style={{ color: design.colors.accentPrimary }}>v<sub>src</sub></span>)
              </p>
              <p style={{ fontSize: design.typography.caption.size, color: design.colors.textMuted, marginTop: design.spacing.md }}>
                − when approaching (higher pitch), + when receding (lower pitch)
              </p>
            </div>
          </div>
        </div>

        {renderBottomNav(true, true, 'Add Observer Motion')}
      </div>
    );
  }

  // TWIST_PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgDeep, overflow: 'auto' }}>
        {renderProgressBar()}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: design.spacing.xl, overflowY: 'auto' }}>
          <div style={{ maxWidth: 540, width: '100%' }}>
            <p style={{ fontSize: design.typography.micro.size, fontWeight: 900, color: design.colors.warning, marginBottom: design.spacing.sm, letterSpacing: 2 }}>
              STEP 4 • NEW VARIABLE
            </p>
            <h2 style={{ fontSize: design.typography.title.size, fontWeight: design.typography.title.weight, color: design.colors.textPrimary, marginBottom: design.spacing.sm }}>
              What if YOU Are Moving Too?
            </h2>
            <p style={{ fontSize: design.typography.body.size, color: design.colors.textSecondary, marginBottom: design.spacing.lg, lineHeight: design.typography.body.lineHeight, fontWeight: 400 }}>
              Now imagine you're walking TOWARD the approaching ambulance. How does YOUR motion affect the pitch you hear?
            </p>

            {/* Static SVG for twist_predict */}
            <div style={{
              padding: design.spacing.md,
              borderRadius: design.radius.lg,
              background: design.colors.bgCard,
              marginBottom: design.spacing.lg,
              border: `1px solid ${design.colors.bgGlow}`,
            }}>
              <svg viewBox="0 0 400 150" style={{ width: '100%', maxHeight: 150 }} preserveAspectRatio="xMidYMid meet">
                {/* Background */}
                <rect width="400" height="150" fill="#0f0a08" />
                <rect x="0" y="100" width="400" height="50" fill="#4a5568" />

                {/* Ambulance moving right */}
                <g transform="translate(100, 85)">
                  <rect x="-30" y="-20" width="60" height="35" rx="6" fill="#f1f5f9" />
                  <rect x="-30" y="0" width="60" height="8" fill="#ef4444" />
                  <circle cx="-18" cy="17" r="8" fill="#1f2937" />
                  <circle cx="18" cy="17" r="8" fill="#1f2937" />
                  <text x="0" y="-30" textAnchor="middle" fill="#ef4444" fontSize="11" fontWeight="bold">30 m/s →</text>
                </g>

                {/* Observer moving left */}
                <g transform="translate(280, 85)">
                  <circle cx="0" cy="-20" r="10" fill="#ec4899" />
                  <rect x="-8" y="-10" width="16" height="24" rx="4" fill="#db2777" />
                  <text x="0" y="-40" textAnchor="middle" fill="#f97316" fontSize="11" fontWeight="bold">← 5 m/s</text>
                </g>

                {/* Arrows showing motion */}
                <line x1="140" y1="70" x2="180" y2="70" stroke="#ef4444" strokeWidth="2" />
                <polygon points="180,66 190,70 180,74" fill="#ef4444" />
                <line x1="260" y1="70" x2="220" y2="70" stroke="#f97316" strokeWidth="2" />
                <polygon points="220,66 210,70 220,74" fill="#f97316" />

                <text x="200" y="140" textAnchor="middle" fill="#fca5a5" fontSize="11" fontWeight="600">Both motions toward each other</text>
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md }}>
              {[
                { id: 'less', label: 'Less frequency shift', desc: 'Your motion partially cancels the ambulance\'s effect', icon: '⬇️' },
                { id: 'same', label: 'Same frequency shift', desc: 'Only source motion matters, not observer', icon: '➡️' },
                { id: 'more', label: 'Even more frequency shift', desc: 'Both motions add together!', icon: '⬆️' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setTwistPrediction(opt.id);
                    emitEvent('twist_prediction_made', { prediction: opt.id });
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: design.spacing.lg,
                    padding: design.spacing.lg,
                    borderRadius: design.radius.lg,
                    background: twistPrediction === opt.id ? `${design.colors.warning}20` : design.colors.bgCard,
                    border: `2px solid ${twistPrediction === opt.id ? design.colors.warning : design.colors.bgGlow}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 28 }}>{opt.icon}</span>
                  <div>
                    <p style={{ fontWeight: 700, color: twistPrediction === opt.id ? design.colors.textPrimary : design.colors.textSecondary }}>
                      {opt.label}
                    </p>
                    <p style={{ fontSize: design.typography.caption.size, color: design.colors.textMuted }}>{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {renderBottomNav(true, !!twistPrediction, 'Test Your Prediction')}
      </div>
    );
  }

  // TWIST_PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgDeep, overflow: 'auto' }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '16px', paddingBottom: '16px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ position: 'relative', minHeight: isMobile ? 280 : 350 }}>
                  {renderDopplerVisualizer(true)}
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{
                  padding: design.spacing.lg,
                  borderRadius: design.radius.md,
                  background: `${design.colors.accentSecondary}15`,
                  border: `1px solid ${design.colors.accentSecondary}30`,
                  marginBottom: design.spacing.md,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: design.spacing.sm }}>
                    <span style={{ fontSize: design.typography.caption.size, fontWeight: 700, color: design.colors.accentSecondary }}>
                      Observer Speed (toward source)
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: design.colors.textPrimary }}>
                      {observerSpeed} m/s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={observerSpeed}
                    onChange={(e) => setObserverSpeed(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      height: 8,
                      borderRadius: 4,
                      background: `linear-gradient(to right, ${design.colors.accentSecondary} 0%, ${design.colors.accentSecondary} ${(observerSpeed / 40) * 100}%, ${design.colors.bgGlow} ${(observerSpeed / 40) * 100}%, ${design.colors.bgGlow} 100%)`,
                      appearance: 'none',
                      cursor: 'pointer',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: design.spacing.sm, textAlign: 'center' }}>
                  <div style={{ padding: design.spacing.md, borderRadius: design.radius.sm, background: design.colors.bgGlow }}>
                    <p style={{ fontSize: design.typography.micro.size, color: design.colors.textMuted }}>Approaching</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: design.colors.accentPrimary }}>{Math.round(observedFreqApproaching)} Hz</p>
                  </div>
                  <div style={{ padding: design.spacing.md, borderRadius: design.radius.sm, background: design.colors.bgGlow }}>
                    <p style={{ fontSize: design.typography.micro.size, color: design.colors.textMuted }}>Total Shift</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: design.colors.warning }}>±{Math.round(observedFreqApproaching - sourceFreq)} Hz</p>
                  </div>
                  <div style={{ padding: design.spacing.md, borderRadius: design.radius.sm, background: design.colors.bgGlow, gridColumn: '1 / -1' }}>
                    <p style={{ fontSize: design.typography.micro.size, color: design.colors.textMuted }}>Receding</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: design.colors.accentSecondary }}>{Math.round(observedFreqReceding)} Hz</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {renderBottomNav(true, observerSpeed > 5, 'See the Full Formula')}
      </div>
    );
  }

  // TWIST_REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgDeep, overflow: 'auto' }}>
        {renderProgressBar()}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: design.spacing.xl, overflowY: 'auto' }}>
          <div style={{ maxWidth: 600, width: '100%' }}>
            <p style={{ fontSize: design.typography.micro.size, fontWeight: 900, color: design.colors.accentSecondary, marginBottom: design.spacing.sm, letterSpacing: 2 }}>
              STEP 6 • COMPLETE UNDERSTANDING
            </p>
            <h2 style={{ fontSize: design.typography.title.size, fontWeight: design.typography.title.weight, color: design.colors.textPrimary, marginBottom: design.spacing.sm }}>
              The Full Doppler Formula
            </h2>
            <p style={{ fontSize: design.typography.body.size, color: design.colors.textSecondary, marginBottom: design.spacing.lg }}>
              {twistPrediction === 'more'
                ? '✅ Correct! Both motions add together for maximum shift.'
                : 'Both source AND observer motion affect the frequency!'}
            </p>

            <div style={{
              padding: design.spacing.xl,
              borderRadius: design.radius.xl,
              background: `linear-gradient(135deg, ${design.colors.accentPrimary}15 0%, ${design.colors.accentSecondary}15 100%)`,
              border: `1px solid ${design.colors.accentPrimary}30`,
              textAlign: 'center',
              marginBottom: design.spacing.lg,
            }}>
              <p style={{ fontSize: design.typography.micro.size, fontWeight: 700, color: design.colors.accentSecondary, marginBottom: design.spacing.lg, letterSpacing: 1 }}>
                COMPLETE DOPPLER FORMULA
              </p>
              <p style={{ fontSize: 26, fontWeight: 800, color: design.colors.textPrimary, fontFamily: 'serif' }}>
                f' = f × (<span style={{ color: design.colors.textSecondary }}>v</span> ± <span style={{ color: design.colors.accentSecondary }}>v<sub>obs</sub></span>) / (<span style={{ color: design.colors.textSecondary }}>v</span> ∓ <span style={{ color: design.colors.accentPrimary }}>v<sub>src</sub></span>)
              </p>
              <p style={{ fontSize: design.typography.caption.size, color: design.colors.textMuted, marginTop: design.spacing.lg }}>
                + numerator: observer approaches | − denominator: source approaches
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: design.spacing.md, marginBottom: design.spacing.lg }}>
              <div style={{ padding: design.spacing.lg, borderRadius: design.radius.md, background: design.colors.bgCard, textAlign: 'center' }}>
                <p style={{ fontSize: design.typography.caption.size, fontWeight: 700, color: design.colors.accentPrimary, marginBottom: design.spacing.sm }}>Source Motion</p>
                <p style={{ fontSize: design.typography.micro.size, color: design.colors.textSecondary }}>Changes wavelength <em>in the medium</em></p>
              </div>
              <div style={{ padding: design.spacing.lg, borderRadius: design.radius.md, background: design.colors.bgCard, textAlign: 'center' }}>
                <p style={{ fontSize: design.typography.caption.size, fontWeight: 700, color: design.colors.accentSecondary, marginBottom: design.spacing.sm }}>Observer Motion</p>
                <p style={{ fontSize: design.typography.micro.size, color: design.colors.textSecondary }}>Changes rate of wave <em>sampling</em></p>
              </div>
            </div>

            <div style={{
              padding: design.spacing.lg,
              borderRadius: design.radius.md,
              background: design.colors.bgCard,
              border: `1px solid ${design.colors.bgGlow}`,
            }}>
              <p style={{ fontSize: design.typography.micro.size, fontWeight: 700, color: design.colors.warning, marginBottom: design.spacing.sm }}>🤯 INTERESTING ASYMMETRY</p>
              <p style={{ fontSize: design.typography.caption.size, color: design.colors.textSecondary, lineHeight: 1.5 }}>
                For the same speed, source motion creates MORE shift than observer motion! At 30 m/s: source approaching gives ~10% higher pitch, but observer approaching gives ~9%. The physics is subtly different!
              </p>
            </div>
          </div>
        </div>

        {renderBottomNav(true, true, 'Real-World Applications')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Doppler Effect"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  if (phase === 'transfer') {
    const app = applications[activeApp];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgDeep, overflow: 'auto' }}>
        {renderProgressBar()}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: design.spacing.lg, overflowY: 'auto' }}>
          <p style={{ fontSize: design.typography.micro.size, fontWeight: 900, color: design.colors.info, marginBottom: design.spacing.sm, letterSpacing: 2 }}>
            STEP 7 • REAL-WORLD APPLICATIONS
          </p>
          <h2 style={{ fontSize: isMobile ? 20 : design.typography.title.size, fontWeight: design.typography.title.weight, color: design.colors.textPrimary, marginBottom: design.spacing.lg }}>
            Doppler Effect in Action
          </h2>

          {/* Tab buttons */}
          <div style={{ display: 'flex', gap: design.spacing.sm, marginBottom: design.spacing.lg, overflowX: 'auto', paddingBottom: design.spacing.xs }}>
            {applications.map((a, i) => {
              const isUnlocked = i === 0 || completedApps.has(i - 1);
              const isCompleted = completedApps.has(i);
              return (
                <button
                  key={a.id}
                  onClick={() => {
                    if (!isUnlocked) return;
                    setActiveApp(i);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: design.spacing.sm,
                    padding: `${design.spacing.sm}px ${design.spacing.lg}px`,
                    borderRadius: design.radius.md,
                    background: activeApp === i ? design.colors.gradientPrimary : isCompleted ? `${design.colors.success}20` : design.colors.bgCard,
                    border: `1px solid ${activeApp === i ? 'transparent' : isCompleted ? design.colors.success : design.colors.bgGlow}`,
                    color: activeApp === i ? 'white' : isCompleted ? design.colors.success : design.colors.textSecondary,
                    fontWeight: 700,
                    fontSize: design.typography.caption.size,
                    cursor: isUnlocked ? 'pointer' : 'not-allowed',
                    opacity: isUnlocked ? 1 : 0.5,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                  }}
                >
                  <span>{isCompleted ? '✓' : a.icon}</span>
                  <span>{isMobile ? a.id : a.title}</span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div style={{
            flex: 1,
            background: design.colors.bgCard,
            borderRadius: design.radius.xl,
            padding: design.spacing.lg,
            overflow: 'auto',
          }}>
            {/* SVG Graphic */}
            <div style={{
              marginBottom: design.spacing.lg,
              borderRadius: design.radius.lg,
              background: design.colors.bgGlow,
              padding: design.spacing.md,
            }}>
              {renderAppGraphic(app.id)}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: design.spacing.lg, marginBottom: design.spacing.lg }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: design.radius.lg,
                background: design.colors.accentGlow,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
              }}>
                {app.icon}
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: design.colors.textPrimary, marginBottom: design.spacing.xs }}>
                  {app.title}
                </h3>
                <p style={{ fontSize: design.typography.caption.size, color: design.colors.textSecondary }}>{app.description}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md }}>
              {/* Detailed introduction */}
              <div style={{ padding: design.spacing.lg, borderRadius: design.radius.md, background: design.colors.bgGlow }}>
                <p style={{ fontSize: design.typography.micro.size, fontWeight: 700, color: design.colors.info, marginBottom: design.spacing.sm }}>📖 OVERVIEW</p>
                <p style={{ fontSize: design.typography.body.size, color: design.colors.textSecondary, lineHeight: 1.6, fontWeight: 400 }}>
                  The Doppler effect is fundamental to many technologies we use every day. From police radar guns measuring vehicle speeds to weather systems tracking storm movement, from medical imaging measuring blood flow to astronomers discovering the expanding universe - all rely on the same principle you explored: the relationship between motion and wave frequency.
                </p>
              </div>

              <div style={{ padding: design.spacing.lg, borderRadius: design.radius.md, background: design.colors.bgGlow }}>
                <p style={{ fontSize: design.typography.micro.size, fontWeight: 700, color: design.colors.accentSecondary, marginBottom: design.spacing.sm }}>🔬 THE PHYSICS</p>
                <p style={{ fontSize: design.typography.body.size, color: design.colors.textSecondary, lineHeight: 1.6, fontWeight: 400 }}>{app.physics}</p>
              </div>

              {/* Statistics section */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: design.spacing.sm,
              }}>
                <div style={{
                  padding: design.spacing.md,
                  borderRadius: design.radius.md,
                  background: design.colors.bgGlow,
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: design.colors.accentPrimary }}>
                    24 GHz
                  </p>
                  <p style={{ fontSize: design.typography.micro.size, color: design.colors.textMuted }}>
                    Radar frequency
                  </p>
                </div>
                <div style={{
                  padding: design.spacing.md,
                  borderRadius: design.radius.md,
                  background: design.colors.bgGlow,
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: design.colors.accentSecondary }}>
                    3000 m
                  </p>
                  <p style={{ fontSize: design.typography.micro.size, color: design.colors.textMuted }}>
                    Range
                  </p>
                </div>
                <div style={{
                  padding: design.spacing.md,
                  borderRadius: design.radius.md,
                  background: design.colors.bgGlow,
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: design.colors.warning }}>
                    300 ms
                  </p>
                  <p style={{ fontSize: design.typography.micro.size, color: design.colors.textMuted }}>
                    Detection time
                  </p>
                </div>
              </div>

              <div style={{
                padding: design.spacing.md,
                borderRadius: design.radius.md,
                background: `${design.colors.accentPrimary}15`,
                border: `1px solid ${design.colors.accentPrimary}30`,
                textAlign: 'center',
              }}>
                <p style={{ fontSize: design.typography.micro.size, fontWeight: 700, color: design.colors.accentPrimary, marginBottom: design.spacing.xs }}>KEY FORMULA</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: design.colors.textPrimary, fontFamily: 'monospace' }}>
                  {app.formula}
                </p>
              </div>

              {/* Got It / Continue Button */}
              <div style={{ marginTop: design.spacing.md }}>
                {!completedApps.has(activeApp) ? (
                  <button
                    onClick={() => {
                      playSound('click');
                      const newCompleted = new Set(completedApps);
                      newCompleted.add(activeApp);
                      setCompletedApps(newCompleted);
                      emitEvent('app_explored', { appId: app.id, appIndex: activeApp });
                      if (activeApp < applications.length - 1) {
                        setTimeout(() => setActiveApp(activeApp + 1), 300);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: design.spacing.md,
                      borderRadius: design.radius.md,
                      background: design.colors.gradientPrimary,
                      border: 'none',
                      color: design.colors.textPrimary,
                      fontWeight: 700,
                      fontSize: design.typography.body.size,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: design.spacing.sm,
                    }}
                  >
                    Got It
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.sm }}>
                    <div style={{
                      padding: design.spacing.md,
                      borderRadius: design.radius.md,
                      background: `${design.colors.success}20`,
                      border: `1px solid ${design.colors.success}`,
                      color: design.colors.success,
                      fontWeight: 700,
                      textAlign: 'center',
                    }}>
                      ✓ Completed
                    </div>
                    {activeApp < applications.length - 1 && (
                      <button
                        onClick={() => {
                          playSound('click');
                          setActiveApp(activeApp + 1);
                        }}
                        style={{
                          width: '100%',
                          padding: design.spacing.sm,
                          borderRadius: design.radius.md,
                          background: design.colors.bgGlow,
                          border: `1px solid ${design.colors.bgGlow}`,
                          color: design.colors.textSecondary,
                          fontWeight: 600,
                          fontSize: design.typography.caption.size,
                          cursor: 'pointer',
                        }}
                      >
                        Next App →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {renderBottomNav(true, completedApps.size >= applications.length, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const score = testAnswers.reduce((acc, ans, i) => acc + (testQuestions[i].options[ans as number]?.correct ? 1 : 0), 0);
      const percentage = Math.round((score / testQuestions.length) * 100);
      const passed = percentage >= 70;

      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgDeep, overflow: 'auto' }}>
          {renderProgressBar()}

          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: design.spacing.xl,
            overflowY: 'auto',
          }}>
            {/* Score summary */}
            <div style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: passed ? design.colors.success : design.colors.warning,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: design.spacing.lg,
              boxShadow: `0 0 40px ${passed ? design.colors.success : design.colors.warning}50`,
            }}>
              <span style={{ fontSize: 50 }}>{passed ? '🏆' : '📚'}</span>
            </div>

            <h2 style={{ fontSize: 32, fontWeight: 900, color: design.colors.textPrimary, marginBottom: design.spacing.sm, textAlign: 'center' }}>
              {percentage >= 90 ? 'Outstanding!' : percentage >= 70 ? 'Great Job!' : 'Keep Learning!'}
            </h2>

            <p style={{ fontSize: 48, fontWeight: 900, color: design.colors.accentPrimary, marginBottom: design.spacing.sm }}>
              {score}/{testQuestions.length}
            </p>

            <p style={{ fontSize: 16, color: design.colors.textSecondary, marginBottom: design.spacing.lg, textAlign: 'center' }}>
              {percentage >= 90
                ? 'You\'ve mastered the Doppler effect!'
                : percentage >= 70
                ? 'Solid understanding of Doppler physics!'
                : 'Review the concepts and try again!'}
            </p>

            {/* Answer Review Section */}
            <div style={{
              width: '100%',
              maxWidth: 600,
              marginBottom: design.spacing.xl,
            }}>
              <h3 style={{
                fontSize: design.typography.subtitle.size,
                fontWeight: 700,
                color: design.colors.textPrimary,
                marginBottom: design.spacing.md,
                textAlign: 'center',
              }}>
                Your Answer Review
              </h3>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: design.spacing.sm,
                maxHeight: 300,
                overflowY: 'auto',
                padding: design.spacing.sm,
              }}>
                {testQuestions.slice(0, 10).map((q, i) => {
                  const userAnswer = testAnswers[i];
                  const isCorrect = userAnswer !== null && q.options[userAnswer]?.correct;
                  const correctIndex = q.options.findIndex(opt => opt.correct);
                  const correctOpt = q.options[correctIndex];
                  const userOpt = userAnswer !== null ? q.options[userAnswer] : null;
                  return (
                    <div
                      key={i}
                      style={{
                        padding: design.spacing.md,
                        borderRadius: design.radius.md,
                        background: 'rgba(30,41,59,0.5)',
                        borderLeft: `4px solid ${isCorrect ? design.colors.success : design.colors.accentPrimary}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: design.spacing.sm, marginBottom: design.spacing.xs }}>
                        <span style={{ fontSize: 18 }}>{isCorrect ? '\u2705' : '\u274c'}</span>
                        <span style={{
                          fontSize: design.typography.caption.size,
                          fontWeight: 700,
                          color: design.colors.textPrimary,
                        }}>
                          Q{i + 1}: {q.question || q.text}
                        </span>
                      </div>
                      {!isCorrect && userOpt && (
                        <p style={{
                          fontSize: design.typography.micro.size,
                          color: design.colors.accentPrimary,
                          margin: `${design.spacing.xs}px 0`,
                        }}>
                          Your answer: {userOpt.text}
                        </p>
                      )}
                      <p style={{
                        fontSize: design.typography.micro.size,
                        color: design.colors.success,
                        margin: `${design.spacing.xs}px 0`,
                      }}>
                        Correct: {correctOpt?.text}
                      </p>
                      {q.explanation && (
                        <div style={{ marginTop: design.spacing.xs, padding: `${design.spacing.sm}px ${design.spacing.md}px`, borderRadius: design.radius.sm, background: 'rgba(245,158,11,0.1)', borderLeft: '3px solid #f59e0b' }}>
                          <p style={{ fontSize: design.typography.micro.size, color: '#fbbf24' }}><strong>Why?</strong> {q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {renderButton(passed ? 'Complete Lesson' : 'Try Again', () => {
              if (passed) {
                goToPhase('mastery');
              } else {
                setTestSubmitted(false);
                setTestIndex(0);
                setTestAnswers(Array(testQuestions.length).fill(null));
              }
            }, 'primary', { size: 'lg' })}
          </div>
        </div>
      );
    }

    const q = testQuestions[testIndex];
    const selected = testAnswers[testIndex];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgDeep, overflow: 'auto' }}>
        {renderProgressBar()}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: design.spacing.lg, overflowY: 'auto' }}>
          <div style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}>
            {/* Test introduction */}
            <div style={{
              padding: design.spacing.md,
              marginBottom: design.spacing.lg,
              background: `${design.colors.accentPrimary}10`,
              borderRadius: design.radius.md,
              border: `1px solid ${design.colors.accentPrimary}30`,
            }}>
              <p style={{ fontSize: design.typography.caption.size, color: design.colors.textSecondary, lineHeight: 1.5, fontWeight: 400 }}>
                Apply your understanding of the Doppler effect to real-world scenarios. Each question tests your knowledge of how wave frequency changes with motion - from ambulance sirens to radar guns, weather tracking to astronomical observations.
              </p>
            </div>

            {/* Progress */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: design.spacing.lg }}>
              <p style={{ fontSize: design.typography.micro.size, fontWeight: 900, color: design.colors.accentPrimary, letterSpacing: 2 }}>
                QUESTION {testIndex + 1} OF {testQuestions.length}
              </p>
              <div style={{ display: 'flex', gap: 4 }}>
                {testQuestions.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: testAnswers[i] !== null ? design.colors.success : i === testIndex ? design.colors.accentPrimary : design.colors.bgGlow,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Scenario */}
            <div style={{
              padding: design.spacing.lg,
              borderRadius: design.radius.md,
              background: design.colors.bgCard,
              marginBottom: design.spacing.lg,
            }}>
              <p style={{ fontSize: design.typography.micro.size, fontWeight: 700, color: design.colors.accentSecondary, marginBottom: design.spacing.sm }}>📋 SCENARIO</p>
              <p style={{ fontSize: design.typography.body.size, color: design.colors.textSecondary, lineHeight: 1.6, fontWeight: 400 }}>{q.scenario}</p>
            </div>

            {/* Question */}
            <h3 style={{ fontSize: isMobile ? 18 : 20, fontWeight: 800, color: design.colors.textPrimary, marginBottom: design.spacing.lg }}>
              {q.question}
            </h3>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.sm }}>
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const newAnswers = [...testAnswers];
                    newAnswers[testIndex] = i;
                    setTestAnswers(newAnswers);
                  }}
                  style={{
                    padding: design.spacing.lg,
                    borderRadius: design.radius.md,
                    background: selected === i ? design.colors.accentGlow : design.colors.bgCard,
                    border: `2px solid ${selected === i ? design.colors.accentPrimary : design.colors.bgGlow}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  <p style={{
                    fontSize: design.typography.body.size,
                    fontWeight: 600,
                    color: selected === i ? design.colors.textPrimary : design.colors.textSecondary,
                  }}>
                    {opt.text}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: design.spacing.lg,
          borderTop: `1px solid ${design.colors.bgGlow}`,
          background: design.colors.bgCard,
        }}>
          {renderButton('← Previous', () => testIndex > 0 && setTestIndex(testIndex - 1), 'ghost', { disabled: testIndex === 0 })}

          {testIndex < testQuestions.length - 1 ? (
            renderButton('Next →', () => selected !== null && setTestIndex(testIndex + 1), 'primary', { disabled: selected === null })
          ) : (
            renderButton('Submit Test', () => {
              if (testAnswers.every(a => a !== null)) {
                const computedScore = testAnswers.reduce((acc, ans, i) => acc + (testQuestions[i].options[ans as number]?.correct ? 1 : 0), 0);
                setTestSubmitted(true);
                emitEvent('game_completed', { score: computedScore, total: testQuestions.length });
                emitEvent('test_answered', {
                  score: computedScore,
                  total: testQuestions.length
                });
              }
            }, 'primary', { disabled: !testAnswers.every(a => a !== null) })
          )}
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: design.colors.gradientBg,
        position: 'relative',
        overflow: 'auto',
      }}>
        {/* Confetti */}
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: 10,
              height: 10,
              background: [design.colors.accentPrimary, design.colors.accentSecondary, design.colors.success, design.colors.warning, design.colors.info][i % 5],
              borderRadius: 2,
              animation: `confetti-fall 3s ease-out ${Math.random() * 2}s infinite`,
              opacity: 0.8,
            }}
          />
        ))}

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
          zIndex: 1,
        }}>
          <div style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: design.colors.gradientPrimary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: design.spacing.lg,
            boxShadow: design.shadows.glow,
            animation: 'float 3s ease-in-out infinite',
          }}>
            <span style={{ fontSize: 60 }}>🏆</span>
          </div>

          <h1 style={{
            fontSize: isMobile ? 32 : design.typography.hero.size,
            fontWeight: design.typography.hero.weight,
            marginBottom: design.spacing.md,
            background: design.colors.gradientPrimary,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Doppler Master!
          </h1>

          <p style={{
            fontSize: design.typography.subtitle.size,
            color: design.colors.textSecondary,
            maxWidth: 500,
            lineHeight: design.typography.subtitle.lineHeight,
            marginBottom: design.spacing.xl,
          }}>
            You've mastered how motion affects wave frequency! From ambulance sirens to cosmic redshift, radar guns to bat echolocation — you now understand one of physics' most powerful principles.
          </p>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: design.spacing.md,
            justifyContent: 'center',
            marginBottom: design.spacing.xl,
          }}>
            {['Wave Compression', 'Doppler Formula', 'Observer Motion', 'Real Applications'].map((item, i) => (
              <div key={i} style={{
                padding: `${design.spacing.sm}px ${design.spacing.lg}px`,
                borderRadius: design.radius.full,
                background: design.colors.bgCard,
                fontSize: design.typography.caption.size,
                fontWeight: 600,
                color: design.colors.textSecondary,
              }}>
                ✓ {item}
              </div>
            ))}
          </div>

          {/* Fixed Complete Game button */}
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 24px', background: 'rgba(15,23,42,0.95)', borderTop: '1px solid rgba(71,85,105,0.3)', zIndex: 50 }}>
            <button
              onClick={() => {
                emitEvent('mastery_achieved', { game: 'doppler_effect' });
                window.location.href = '/games';
              }}
              style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', fontSize: '18px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.5px' }}
            >
              Complete Game
            </button>
          </div>
        </div>

        <style>{`
          @keyframes confetti-fall {
            0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
        `}</style>
      </div>
    );
  }

  // Default fallback for invalid phases - show hook
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '100dvh',
      background: design.colors.gradientBg,
      overflow: 'auto',
      alignItems: 'center',
      justifyContent: 'center',
      padding: design.spacing.xl,
    }}>
      {renderProgressBar()}
      <p style={{ color: design.colors.textPrimary, fontSize: design.typography.body.size }}>
        Loading Doppler Effect simulation...
      </p>
      <button
        onClick={() => goToPhase('hook')}
        style={{
          marginTop: design.spacing.lg,
          padding: `${design.spacing.md}px ${design.spacing.xl}px`,
          background: design.colors.gradientPrimary,
          color: design.colors.textPrimary,
          borderRadius: `${design.radius.md}px`,
          border: 'none',
          cursor: 'pointer',
          fontWeight: 700,
        }}
      >
        Start Learning
      </button>
    </div>
  );
};

export default DopplerEffectRenderer;
