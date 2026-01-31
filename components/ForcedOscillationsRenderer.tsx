'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// FORCED OSCILLATIONS & RESONANCE - GOLD STANDARD IMPLEMENTATION
// Physics: m(d²x/dt²) + c(dx/dt) + kx = F₀cos(ωt)
// Natural frequency: ω₀ = √(k/m)
// Resonance: maximum amplitude when ω ≈ ω₀
// Amplitude: A = F₀ / √[(k - mω²)² + (cω)²]
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'frequency_adjusted'
  | 'driving_started'
  | 'resonance_achieved'
  | 'amplitude_measured'
  | 'twist_prediction_made'
  | 'app_explored'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved';

interface TestQuestion {
  scenario: string;
  question: string;
  options: { text: string; correct: boolean }[];
  explanation: string;
}

interface TransferApp {
  icon: React.ReactNode;
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
  onGameEvent?: (event: { type: GameEventType; data?: Record<string, unknown> }) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

const ForcedOscillationsRenderer: React.FC<Props> = ({
  onGameEvent,
  gamePhase,
  onPhaseComplete
}) => {
  const [phase, setPhase] = useState<Phase>(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  });
  const [isMobile, setIsMobile] = useState(false);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Physics simulation states
  const [drivingFrequency, setDrivingFrequency] = useState(0.5); // ω (ratio to ω₀)
  const [naturalFrequency] = useState(1.0); // ω₀ normalized
  const [damping] = useState(0.1); // ζ
  const [displacement, setDisplacement] = useState(0);
  const [time, setTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [isAtResonance, setIsAtResonance] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);

  // Sync with external gamePhase prop
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Responsive check
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

  const playSound = useCallback((type: 'oscillate' | 'resonance' | 'transition' | 'correct' | 'incorrect' | 'complete') => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    switch (type) {
      case 'oscillate':
        oscillator.frequency.setValueAtTime(220 + drivingFrequency * 200, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
        break;
      case 'resonance':
        oscillator.frequency.setValueAtTime(440, ctx.currentTime);
        oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(440, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.4);
        break;
      case 'transition':
        oscillator.frequency.setValueAtTime(600, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
        break;
      case 'correct':
        oscillator.frequency.setValueAtTime(523, ctx.currentTime);
        oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        break;
      case 'incorrect':
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        oscillator.frequency.setValueAtTime(150, ctx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        break;
      case 'complete':
        oscillator.frequency.setValueAtTime(440, ctx.currentTime);
        oscillator.frequency.setValueAtTime(554, ctx.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.2);
        oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.5);
        break;
    }
  }, [drivingFrequency]);

  // Calculate steady-state amplitude for forced oscillation
  const calculateAmplitude = useCallback((omega: number, omega0: number, zeta: number) => {
    // A = F₀ / √[(ω₀² - ω²)² + (2ζω₀ω)²]
    // Normalized: F₀ = 1, so amplitude shows relative response
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
        const omega = drivingFrequency * naturalFrequency;
        const A = calculateAmplitude(omega, naturalFrequency, damping);
        setAmplitude(A);

        // Check for resonance (within 10% of natural frequency)
        const atResonance = Math.abs(drivingFrequency - 1.0) < 0.15;
        if (atResonance && !isAtResonance) {
          setIsAtResonance(true);
          playSound('resonance');
        } else if (!atResonance && isAtResonance) {
          setIsAtResonance(false);
        }

        // Steady-state response: x(t) = A * cos(ωt - φ)
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
  }, [isAnimating, drivingFrequency, naturalFrequency, damping, calculateAmplitude, playSound, isAtResonance]);

  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    if (onGameEvent) {
      onGameEvent({ type: 'phase_change', data: { phase: newPhase } });
    }
    if (onPhaseComplete) {
      onPhaseComplete(newPhase);
    }
  }, [playSound, onGameEvent, onPhaseComplete]);

  const handlePrediction = useCallback((prediction: string) => {
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'C' ? 'correct' : 'incorrect');
    if (onGameEvent) {
      onGameEvent({ type: 'prediction_made', data: { prediction, correct: prediction === 'C' } });
    }
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'B' ? 'correct' : 'incorrect');
    if (onGameEvent) {
      onGameEvent({ type: 'twist_prediction_made', data: { prediction, correct: prediction === 'B' } });
    }
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
    if (onGameEvent) {
      onGameEvent({ type: 'test_answered', data: { questionIndex, answerIndex } });
    }
  }, [onGameEvent]);

  const handleAppComplete = useCallback((appIndex: number) => {
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    if (onGameEvent) {
      onGameEvent({ type: 'app_explored', data: { appIndex } });
    }
  }, [playSound, onGameEvent]);

  const startSimulation = useCallback(() => {
    setTime(0);
    setDisplacement(0);
    setIsAnimating(true);
    if (onGameEvent) {
      onGameEvent({ type: 'simulation_started', data: { drivingFrequency } });
    }
  }, [drivingFrequency, onGameEvent]);

  const stopSimulation = useCallback(() => {
    setIsAnimating(false);
  }, []);

  const handleFrequencyChange = useCallback((value: number) => {
    setDrivingFrequency(value);
    if (onGameEvent) {
      onGameEvent({ type: 'frequency_adjusted', data: { frequency: value } });
    }
  }, [onGameEvent]);

  // Test questions with scenarios and explanations
  const testQuestions: TestQuestion[] = [
    {
      scenario: "A child on a swing is being pushed by their parent at regular intervals.",
      question: "For the swing to go highest, when should the parent push?",
      options: [
        { text: "At random times for variety", correct: false },
        { text: "As fast as possible", correct: false },
        { text: "At the swing's natural frequency (once per swing cycle)", correct: true },
        { text: "Very slowly, once every few swings", correct: false }
      ],
      explanation: "Maximum energy transfer (resonance) occurs when the driving frequency matches the natural frequency. Pushing once per complete swing cycle builds up amplitude efficiently."
    },
    {
      scenario: "An opera singer shatters a wine glass by singing at a specific pitch.",
      question: "Why does only that particular pitch break the glass?",
      options: [
        { text: "It's the loudest note the singer can produce", correct: false },
        { text: "It matches the glass's natural resonant frequency", correct: true },
        { text: "High pitches always break glass", correct: false },
        { text: "The singer applies more force at that note", correct: false }
      ],
      explanation: "Glass has a natural frequency. When sound at that exact frequency hits the glass, resonance causes oscillations to build up until the stress exceeds the glass's breaking point."
    },
    {
      scenario: "The Tacoma Narrows Bridge famously collapsed in 1940 during moderate winds.",
      question: "What caused the bridge to oscillate so violently?",
      options: [
        { text: "The wind was too strong", correct: false },
        { text: "The bridge was too heavy", correct: false },
        { text: "Wind vortices matched the bridge's natural frequency (resonance)", correct: true },
        { text: "An earthquake occurred simultaneously", correct: false }
      ],
      explanation: "Wind vortex shedding created a periodic force that matched the bridge's torsional natural frequency. This resonance caused oscillations to grow until structural failure."
    },
    {
      scenario: "You're tuning a radio to find your favorite station at 101.5 MHz.",
      question: "What physical principle allows the radio to select just that frequency?",
      options: [
        { text: "Magnetic filtering", correct: false },
        { text: "Electrical resonance in an LC circuit tuned to 101.5 MHz", correct: true },
        { text: "Digital signal processing", correct: false },
        { text: "Sound wave interference", correct: false }
      ],
      explanation: "The radio's tuning circuit (LC circuit) has an adjustable natural frequency. When tuned to 101.5 MHz, only that frequency causes resonance and gets amplified while others are suppressed."
    },
    {
      scenario: "A car's engine is running at certain RPMs and the steering wheel vibrates annoyingly.",
      question: "Why does this vibration only occur at specific engine speeds?",
      options: [
        { text: "The engine is misfiring at those speeds", correct: false },
        { text: "The tires are unbalanced", correct: false },
        { text: "Engine vibration frequency matches a structural resonance", correct: true },
        { text: "The fuel mixture is wrong", correct: false }
      ],
      explanation: "Car components have natural frequencies. When engine RPM creates vibrations matching these frequencies, resonance amplifies the oscillations. Changing RPM moves away from resonance."
    },
    {
      scenario: "An MRI machine uses precise radio waves to image the body.",
      question: "MRI works by exploiting resonance of:",
      options: [
        { text: "Body tissue vibrations", correct: false },
        { text: "Sound waves in the machine", correct: false },
        { text: "Hydrogen nuclei (protons) in a magnetic field", correct: true },
        { text: "X-ray frequencies", correct: false }
      ],
      explanation: "MRI uses Nuclear Magnetic Resonance. Hydrogen nuclei precess at specific frequencies in magnetic fields. RF pulses at these resonant frequencies cause energy absorption that's detected to create images."
    },
    {
      scenario: "Musicians playing together notice that certain notes make the room 'ring'.",
      question: "These 'room modes' occur because:",
      options: [
        { text: "The musicians are playing too loudly", correct: false },
        { text: "Sound waves resonate with the room's dimensions", correct: true },
        { text: "The instruments are out of tune", correct: false },
        { text: "Echo from the walls", correct: false }
      ],
      explanation: "Rooms have natural acoustic frequencies based on their dimensions. When musical notes match these frequencies, standing waves form, causing certain frequencies to be amplified (room resonance)."
    },
    {
      scenario: "In the amplitude response curve for a forced oscillator, you increase damping.",
      question: "What happens to the resonance peak?",
      options: [
        { text: "It gets taller and narrower", correct: false },
        { text: "It gets shorter and wider", correct: true },
        { text: "It shifts to a higher frequency", correct: false },
        { text: "It disappears completely", correct: false }
      ],
      explanation: "Higher damping reduces the maximum amplitude at resonance and broadens the peak. With very high damping, the system barely resonates at all. Low damping gives sharp, tall resonance peaks."
    },
    {
      scenario: "A washing machine 'walks' across the floor during the spin cycle but not at other times.",
      question: "This happens because:",
      options: [
        { text: "The load is unbalanced at all speeds", correct: false },
        { text: "The spin speed passes through the machine's resonant frequency", correct: true },
        { text: "The floor is uneven", correct: false },
        { text: "The machine is too light", correct: false }
      ],
      explanation: "During spin-up, the rotation frequency passes through resonant frequencies of the machine on its mounts. At these specific speeds, vibrations are amplified. Manufacturers try to accelerate quickly through these ranges."
    },
    {
      scenario: "Soldiers crossing a bridge are told to break step rather than march in unison.",
      question: "This order prevents:",
      options: [
        { text: "Soldiers from getting tired", correct: false },
        { text: "Resonance from synchronized footsteps collapsing the bridge", correct: true },
        { text: "The bridge from getting dirty", correct: false },
        { text: "Noise complaints from nearby residents", correct: false }
      ],
      explanation: "Synchronized marching creates a periodic force. If this frequency matches the bridge's natural frequency, resonance can build oscillations to dangerous levels. Breaking step removes the periodic driving force."
    }
  ];

  // Transfer applications
  const transferApps: TransferApp[] = [
    {
      icon: (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect x="8" y="8" width="48" height="48" rx="8" fill="#1e293b" stroke="#3b82f6" strokeWidth="2"/>
          <circle cx="32" cy="32" r="16" fill="none" stroke="#3b82f6" strokeWidth="2"/>
          <circle cx="32" cy="32" r="8" fill="none" stroke="#60a5fa" strokeWidth="1.5"/>
          <path d="M32 16 V12 M32 52 V48 M16 32 H12 M52 32 H48" stroke="#3b82f6" strokeWidth="2"/>
          <path d="M40 32 C40 36.4 36.4 40 32 40 C27.6 40 24 36.4 24 32" stroke="#22c55e" strokeWidth="2"/>
          <circle cx="32" cy="28" r="2" fill="#ef4444"/>
        </svg>
      ),
      title: "Bridges",
      short: "Bridges",
      tagline: "Engineering structures to avoid catastrophic resonance",
      description: "Modern bridge design carefully considers natural frequencies to prevent resonance disasters like the Tacoma Narrows collapse.",
      connection: "Bridges have natural vibration frequencies. When wind vortices, traffic, or pedestrians create forces at these frequencies, dangerous resonance can occur.",
      howItWorks: "Engineers calculate bridge natural frequencies and design structures to avoid matching common excitation frequencies. Dampers and aerodynamic shaping help dissipate resonant energy.",
      stats: [
        { value: "0.1-2 Hz", label: "Typical bridge frequencies" },
        { value: "40 mph", label: "Tacoma wind speed" },
        { value: "~0.2 Hz", label: "Critical frequency" },
        { value: "1000+ tons", label: "Bridge dampers" }
      ],
      examples: [
        "Tacoma Narrows Bridge collapse (1940)",
        "Millennium Bridge wobble (2000)",
        "Tuned mass dampers on suspension bridges",
        "Aerodynamic deck designs"
      ],
      companies: ["Arup", "AECOM", "WSP", "Mott MacDonald", "Thornton Tomasetti"],
      futureImpact: "Smart bridges with embedded sensors will detect and actively counteract resonance in real-time, making structures safer and more resilient.",
      color: "from-blue-600 to-indigo-600"
    },
    {
      icon: (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect x="20" y="8" width="24" height="48" rx="2" fill="#1e293b" stroke="#f59e0b" strokeWidth="2"/>
          <path d="M28 56 L36 56" stroke="#f59e0b" strokeWidth="3"/>
          <circle cx="32" cy="20" r="4" fill="#f59e0b"/>
          <path d="M32 24 L32 36" stroke="#f59e0b" strokeWidth="2"/>
          <path d="M24 36 Q32 44, 40 36" stroke="#f59e0b" strokeWidth="2" fill="none"/>
          <path d="M24 36 Q32 28, 40 36" stroke="#f59e0b" strokeWidth="2" fill="none"/>
          <ellipse cx="32" cy="36" rx="12" ry="6" fill="#f59e0b" opacity="0.2"/>
        </svg>
      ),
      title: "Tuning Forks",
      short: "Tuning Forks",
      tagline: "Precise frequency standards through resonance",
      description: "Tuning forks produce pure tones because they resonate at a single, precise natural frequency determined by their dimensions.",
      connection: "When struck, a tuning fork vibrates at its natural frequency. The prong shape ensures only one mode resonates strongly, producing a pure tone.",
      howItWorks: "The fork's mass and stiffness determine its natural frequency (f = √(k/m)). When struck, energy excites this mode, and the fork resonates, producing sound waves at that frequency.",
      stats: [
        { value: "440 Hz", label: "Standard A4 pitch" },
        { value: "99.99%", label: "Frequency purity" },
        { value: "Q > 1000", label: "Quality factor" },
        { value: "30+ sec", label: "Sustain time" }
      ],
      examples: [
        "Musical instrument tuning",
        "Quartz crystal oscillators in watches",
        "Medical diagnostic tools",
        "Frequency calibration standards"
      ],
      companies: ["Wittner", "John Walker & Co", "Ragg", "Peterson Tuners", "Seiko"],
      futureImpact: "Nano-scale resonators based on the same principles enable ultra-precise sensors for medical diagnostics and environmental monitoring.",
      color: "from-amber-600 to-orange-600"
    },
    {
      icon: (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect x="4" y="20" width="56" height="32" rx="4" fill="#1e293b" stroke="#64748b" strokeWidth="2"/>
          <ellipse cx="32" cy="36" rx="20" ry="12" fill="none" stroke="#f59e0b" strokeWidth="2"/>
          <ellipse cx="32" cy="36" rx="12" ry="7" fill="none" stroke="#fbbf24" strokeWidth="1.5"/>
          <path d="M20 28 L44 28" stroke="#64748b" strokeWidth="1"/>
          <path d="M20 44 L44 44" stroke="#64748b" strokeWidth="1"/>
          <circle cx="16" cy="12" r="4" fill="#22c55e"/>
          <circle cx="32" cy="10" r="4" fill="#f59e0b"/>
          <circle cx="48" cy="12" r="4" fill="#ef4444"/>
          <path d="M16 16 L16 20 M32 14 L32 20 M48 16 L48 20" stroke="#64748b" strokeWidth="1"/>
        </svg>
      ),
      title: "MRI Machines",
      short: "MRI Machines",
      tagline: "Nuclear magnetic resonance reveals body's secrets",
      description: "MRI machines use nuclear magnetic resonance of hydrogen atoms to create detailed images of soft tissue without radiation.",
      connection: "Hydrogen nuclei (protons) in magnetic fields precess at the Larmor frequency. RF pulses at this exact resonant frequency cause energy absorption that's detectable.",
      howItWorks: "Strong magnets align hydrogen nuclei. RF coils transmit pulses at the resonant frequency, causing nuclei to absorb energy and 'flip.' As they relax back, they emit RF signals. Different tissues relax at different rates, creating contrast.",
      stats: [
        { value: "1.5-7 T", label: "Magnetic field strength" },
        { value: "~64 MHz", label: "RF frequency at 1.5T" },
        { value: "<1 mm", label: "Spatial resolution" },
        { value: "20-60 min", label: "Typical scan time" }
      ],
      examples: [
        "Brain tumor detection",
        "Cardiac imaging without contrast",
        "Spinal cord injury assessment",
        "Sports medicine joint imaging"
      ],
      companies: ["Siemens Healthineers", "GE Healthcare", "Philips", "Canon Medical", "Hitachi"],
      futureImpact: "Higher field strengths (7T+) and AI-enhanced reconstruction will enable faster scans with finer detail, potentially replacing many CT and X-ray procedures.",
      color: "from-purple-600 to-pink-600"
    },
    {
      icon: (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <path d="M32 8 L32 56" stroke="#64748b" strokeWidth="2"/>
          <path d="M20 12 L44 12" stroke="#94a3b8" strokeWidth="4"/>
          <ellipse cx="32" cy="40" rx="16" ry="8" fill="#3b82f6" opacity="0.3"/>
          <path d="M16 40 Q32 48, 48 40" stroke="#3b82f6" strokeWidth="2"/>
          <path d="M16 40 Q32 32, 48 40" stroke="#3b82f6" strokeWidth="2"/>
          <circle cx="32" cy="20" r="4" fill="#f59e0b"/>
          <path d="M28 20 L20 20 L20 32" stroke="#f59e0b" strokeWidth="2"/>
          <path d="M36 20 L44 20 L44 32" stroke="#f59e0b" strokeWidth="2"/>
          <path d="M18 56 L46 56" stroke="#64748b" strokeWidth="2"/>
        </svg>
      ),
      title: "Musical Instruments",
      short: "Musical Instruments",
      tagline: "Making strings and air columns sing",
      description: "Every acoustic instrument relies on resonance to amplify vibrations and create rich, sustained tones.",
      connection: "Strings, air columns, and instrument bodies have natural frequencies. When vibrations match these frequencies, resonance amplifies the sound dramatically.",
      howItWorks: "A guitar string vibrates at multiple frequencies. The guitar body resonates with these frequencies, coupling the small string vibration to large air pressure waves. Resonance chambers in violins, pianos, and wind instruments serve similar amplification roles.",
      stats: [
        { value: "27-4200 Hz", label: "Piano range" },
        { value: "~10 dB", label: "Body amplification" },
        { value: "Q = 100-1000", label: "String quality factor" },
        { value: "~340 m/s", label: "Sound speed in air" }
      ],
      examples: [
        "Violin bodies shaped for optimal resonance",
        "Piano soundboards coupling string vibrations",
        "Wind instrument bore design",
        "Organ pipes tuned by length"
      ],
      companies: ["Steinway & Sons", "Yamaha", "Stradivarius (historical)", "Gibson", "Martin Guitar"],
      futureImpact: "Computational acoustics and 3D printing enable instruments optimized for specific resonance properties, creating new sounds impossible with traditional manufacturing.",
      color: "from-emerald-600 to-teal-600"
    }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      const correct = testQuestions[index].options.findIndex(opt => opt.correct);
      return score + (answer === correct ? 1 : 0);
    }, 0);
  };

  const getFrequencyLabel = (ratio: number): string => {
    if (ratio < 0.85) return 'Below Resonance';
    if (ratio > 1.15) return 'Above Resonance';
    return 'At Resonance!';
  };

  const getFrequencyColor = (ratio: number): string => {
    if (ratio < 0.85) return 'text-blue-400';
    if (ratio > 1.15) return 'text-amber-400';
    return 'text-red-400';
  };

  // ============================================================================
  // RENDER FUNCTIONS FOR EACH PHASE
  // ============================================================================

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      {/* Premium Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 mb-6">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-red-400 text-sm font-medium">Wave Physics</span>
      </div>

      {/* Gradient Title */}
      <h1 className={`${isMobile ? 'text-3xl' : 'text-4xl'} font-bold bg-gradient-to-r from-red-400 via-orange-400 to-amber-400 bg-clip-text text-transparent mb-3`}>
        Why Do Opera Singers Break Glass?
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg mb-8 max-w-md">
        Discover the power of resonance and natural frequencies
      </p>

      {/* Premium Card */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 max-w-2xl shadow-2xl">
        <svg width={isMobile ? 280 : 400} height={isMobile ? 180 : 220} className="mx-auto">
          <defs>
            <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.6"/>
              <stop offset="50%" stopColor="#93c5fd" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.6"/>
            </linearGradient>
          </defs>

          {/* Wine glass */}
          <path
            d={`M${isMobile ? 140 : 200} ${isMobile ? 40 : 60}
               Q${isMobile ? 100 : 140} ${isMobile ? 40 : 60}, ${isMobile ? 100 : 140} ${isMobile ? 80 : 100}
               Q${isMobile ? 100 : 140} ${isMobile ? 120 : 140}, ${isMobile ? 130 : 180} ${isMobile ? 120 : 140}
               L${isMobile ? 130 : 180} ${isMobile ? 160 : 180}
               L${isMobile ? 110 : 150} ${isMobile ? 160 : 180}
               L${isMobile ? 150 : 210} ${isMobile ? 160 : 180}
               L${isMobile ? 150 : 210} ${isMobile ? 120 : 140}
               Q${isMobile ? 180 : 260} ${isMobile ? 120 : 140}, ${isMobile ? 180 : 260} ${isMobile ? 80 : 100}
               Q${isMobile ? 180 : 260} ${isMobile ? 40 : 60}, ${isMobile ? 140 : 200} ${isMobile ? 40 : 60}`}
            fill="url(#glassGrad)"
            stroke="#60a5fa"
            strokeWidth="2"
          />

          {/* Sound waves */}
          {[0, 1, 2].map(i => (
            <path
              key={i}
              d={`M${isMobile ? 40 + i * 15 : 60 + i * 20} ${isMobile ? 80 : 100}
                 Q${isMobile ? 40 + i * 15 : 60 + i * 20} ${isMobile ? 60 : 80}, ${isMobile ? 50 + i * 15 : 75 + i * 20} ${isMobile ? 60 : 80}
                 Q${isMobile ? 40 + i * 15 : 60 + i * 20} ${isMobile ? 100 : 120}, ${isMobile ? 50 + i * 15 : 75 + i * 20} ${isMobile ? 100 : 120}`}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              opacity={0.7 - i * 0.2}
            />
          ))}

          {/* Singer */}
          <circle cx={isMobile ? 20 : 30} cy={isMobile ? 70 : 90} r={isMobile ? 12 : 15} fill="#fcd9b6"/>
          <ellipse cx={isMobile ? 20 : 30} cy={isMobile ? 100 : 130} rx={isMobile ? 10 : 12} ry={isMobile ? 20 : 25} fill="#ec4899"/>
          <ellipse cx={isMobile ? 20 : 30} cy={isMobile ? 78 : 100} rx="4" ry="3" fill="#1e293b"/>

          {/* Vibration lines on glass */}
          <path d={`M${isMobile ? 115 : 160} ${isMobile ? 70 : 90} L${isMobile ? 110 : 155} ${isMobile ? 65 : 85}`} stroke="#ef4444" strokeWidth="2"/>
          <path d={`M${isMobile ? 165 : 240} ${isMobile ? 70 : 90} L${isMobile ? 170 : 245} ${isMobile ? 65 : 85}`} stroke="#ef4444" strokeWidth="2"/>
        </svg>

        <p className="text-xl text-slate-300 mt-6 mb-4">
          A trained opera singer can shatter a wine glass using only their voice!
        </p>
        <p className="text-lg text-red-400 font-medium">
          What makes one specific pitch so destructive?
        </p>
      </div>

      {/* Premium CTA Button */}
      <button
        onClick={() => goToPhase('predict')}
        style={{ zIndex: 10 }}
        className="group mt-8 px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white text-lg font-semibold rounded-2xl hover:from-red-500 hover:to-orange-500 transition-all duration-300 shadow-lg hover:shadow-red-500/25 hover:scale-[1.02] flex items-center gap-2"
      >
        Discover Resonance
        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>

      {/* Subtle Hint */}
      <p className="mt-4 text-slate-500 text-sm">
        Tap to begin your exploration
      </p>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          You push a child on a swing. You can push at any rhythm you choose--fast, slow, or matching the swing's natural back-and-forth motion.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          Which pushing rhythm makes the swing go highest?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Push as fast as possible for maximum energy input' },
          { id: 'B', text: 'Push very slowly for gentle, controlled motion' },
          { id: 'C', text: 'Match your pushes to the swing\'s natural frequency' },
          { id: 'D', text: 'Push at random times to keep the child guessing' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            style={{ zIndex: 10 }}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'C'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'C'
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>
      {showPredictionFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            Correct! This is <span className="text-red-400">RESONANCE</span>--maximum response when driving frequency matches natural frequency!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            Each push adds energy at exactly the right moment, building up amplitude dramatically.
          </p>
          <button
            onClick={() => goToPhase('play')}
            style={{ zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all duration-300"
          >
            Explore Resonance
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Forced Oscillation Lab</h2>

      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4 w-full max-w-2xl">
        {/* Visualization */}
        <svg width="100%" height="200" viewBox="0 0 400 200" className="mb-4">
          {/* Ceiling with driving motor */}
          <rect x="0" y="0" width="400" height="25" fill="#374151"/>
          <pattern id="motorPattern" width="20" height="20" patternUnits="userSpaceOnUse">
            <line x1="0" y1="20" x2="20" y2="0" stroke="#4b5563" strokeWidth="2"/>
          </pattern>
          <rect x="0" y="0" width="400" height="25" fill="url(#motorPattern)"/>

          {/* Driving mechanism */}
          <circle cx="200" cy="15" r="10" fill="#ef4444"/>
          <line
            x1="200"
            y1="15"
            x2={200 + Math.cos(time * drivingFrequency * 5) * 8}
            y2={15 + Math.sin(time * drivingFrequency * 5) * 8}
            stroke="#fbbf24"
            strokeWidth="3"
          />

          {/* Spring (length varies with displacement) */}
          <path
            d={`M200 25 ${Array.from({length: 8}, (_, i) =>
              `Q ${180 + (i % 2) * 40} ${30 + i * (70 + displacement * 0.3) / 8}, 200 ${35 + (i + 1) * (70 + displacement * 0.3) / 8}`
            ).join(' ')}`}
            stroke="#f59e0b"
            strokeWidth="3"
            fill="none"
          />

          {/* Mass */}
          <rect
            x="170"
            y={95 + displacement * 0.5}
            width="60"
            height="40"
            rx="5"
            fill={isAtResonance ? '#ef4444' : '#3b82f6'}
            className={isAtResonance ? 'animate-pulse' : ''}
          />
          <text x="200" y={120 + displacement * 0.5} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
            {displacement.toFixed(0)}
          </text>

          {/* Resonance indicator */}
          {isAtResonance && (
            <text x="300" y="80" fill="#ef4444" fontSize="14" fontWeight="bold" className="animate-pulse">
              RESONANCE!
            </text>
          )}

          {/* Amplitude graph */}
          <rect x="20" y="40" width="100" height="120" fill="#0f172a" rx="5"/>
          <text x="70" y="55" textAnchor="middle" fill="#64748b" fontSize="8">Amplitude Response</text>

          {/* Draw amplitude curve */}
          <path
            d={`M30 150 ${Array.from({length: 80}, (_, i) => {
              const omega = (i / 80) * 2;
              const A = 1 / Math.sqrt(Math.pow(1 - omega * omega, 2) + Math.pow(2 * 0.1 * omega, 2));
              const y = 150 - Math.min(A * 15, 90);
              return `L${30 + i} ${y}`;
            }).join(' ')}`}
            stroke="#3b82f6"
            strokeWidth="1.5"
            fill="none"
          />

          {/* Current frequency indicator */}
          <line
            x1={30 + drivingFrequency * 40}
            y1="60"
            x2={30 + drivingFrequency * 40}
            y2="155"
            stroke="#ef4444"
            strokeWidth="2"
            strokeDasharray="4"
          />
          <circle cx={30 + drivingFrequency * 40} cy={150 - Math.min(amplitude * 15, 90)} r="4" fill="#ef4444"/>

          <text x="70" y="165" textAnchor="middle" fill="#64748b" fontSize="8">omega/omega_0</text>
        </svg>

        {/* Controls */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-slate-400 text-sm block mb-2">
              Driving Frequency (omega/omega_0): <span className={`font-bold ${getFrequencyColor(drivingFrequency)}`}>
                {drivingFrequency.toFixed(2)} - {getFrequencyLabel(drivingFrequency)}
              </span>
            </label>
            <input
              type="range"
              min="0.2"
              max="2.0"
              step="0.05"
              value={drivingFrequency}
              onChange={(e) => handleFrequencyChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Low omega</span>
              <span>omega = omega_0 (Resonance)</span>
              <span>High omega</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => isAnimating ? stopSimulation() : startSimulation()}
              style={{ zIndex: 10 }}
              className={`p-4 rounded-xl font-semibold transition-colors ${
                isAnimating
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isAnimating ? 'Stop' : 'Start Driving'}
            </button>
            <div className="p-4 rounded-xl bg-slate-700/50 text-center">
              <div className={`text-2xl font-bold ${isAtResonance ? 'text-red-400' : 'text-white'}`}>
                {amplitude.toFixed(1)}x
              </div>
              <div className="text-sm text-slate-400">Amplitude</div>
            </div>
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl w-full">
        <h3 className="text-lg font-semibold text-red-400 mb-3">Resonance Physics:</h3>
        <div className="grid gap-3 text-sm text-slate-300">
          <div className={`flex items-start gap-3 p-2 rounded-lg ${drivingFrequency < 0.85 ? 'bg-blue-900/30 border border-blue-500/50' : ''}`}>
            <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">omega &lt; omega_0</span>
            <p><strong>Below resonance:</strong> Mass follows driving force in phase. Low amplitude.</p>
          </div>
          <div className={`flex items-start gap-3 p-2 rounded-lg ${Math.abs(drivingFrequency - 1.0) < 0.15 ? 'bg-red-900/30 border border-red-500/50' : ''}`}>
            <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">omega ~ omega_0</span>
            <p><strong>At resonance:</strong> Maximum energy transfer! Amplitude peaks dramatically.</p>
          </div>
          <div className={`flex items-start gap-3 p-2 rounded-lg ${drivingFrequency > 1.15 ? 'bg-amber-900/30 border border-amber-500/50' : ''}`}>
            <span className="bg-amber-600 text-white px-2 py-1 rounded text-xs font-bold">omega &gt; omega_0</span>
            <p><strong>Above resonance:</strong> Mass moves opposite to driving force. Amplitude drops.</p>
          </div>
        </div>
      </div>

      <button
        onClick={() => goToPhase('review')}
        style={{ zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all duration-300"
      >
        Review the Concepts
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding Forced Oscillations</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-red-900/50 to-orange-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-red-400 mb-3">The Equation of Motion</h3>
          <div className="bg-slate-900/50 rounded-lg p-3 mb-3 font-mono text-center text-sm">
            <span className="text-white">m(d^2x/dt^2) + c(dx/dt) + kx = F_0*cos(omega*t)</span>
          </div>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>Left side: The oscillator (mass, damping, spring)</li>
            <li>Right side: External driving force at frequency omega</li>
            <li>Natural frequency: <strong>omega_0 = sqrt(k/m)</strong></li>
            <li>System eventually oscillates at omega (driving frequency)</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-purple-400 mb-3">Amplitude Response</h3>
          <div className="bg-slate-900/50 rounded-lg p-3 mb-3 font-mono text-center text-sm">
            <span className="text-white">A = F_0 / sqrt[(k-m*omega^2)^2 + (c*omega)^2]</span>
          </div>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>Peak amplitude when omega ~ omega_0 (denominator minimized)</li>
            <li>Higher damping (c) reduces peak and broadens it</li>
            <li>Lower damping = sharper, taller resonance peak</li>
            <li>At resonance: A_max ~ F_0/(c*omega_0)</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">Why Resonance is Powerful</h3>
          <div className="text-slate-300 text-sm space-y-2">
            <p><strong>Energy accumulation:</strong> At resonance, each driving cycle adds energy at exactly the right moment (in phase with velocity).</p>
            <p><strong>Quality Factor Q:</strong> Measures how sharp the resonance is. Q = omega_0/(2*zeta*omega_0) = 1/(2*zeta)</p>
            <div className="bg-slate-900/50 rounded-lg p-3 my-2 font-mono text-center">
              <span className="text-white">Higher Q = Sharper resonance = More selective</span>
            </div>
            <p className="text-red-400 mt-3">
              This is why a singer must hit exactly the right note--glass has high Q, so only one precise frequency causes resonance!
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() => goToPhase('twist_predict')}
        style={{ zIndex: 10 }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Discover a Surprising Twist
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">The Twist Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          The Tacoma Narrows Bridge collapsed spectacularly in 1940, twisting and oscillating in moderate winds (about 40 mph)--not even a storm!
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          The wind was steady, not gusting. How did steady wind cause oscillations?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The wind was simply too strong for the bridge design' },
          { id: 'B', text: 'Vortex shedding created periodic forces at the bridge\'s resonant frequency' },
          { id: 'C', text: 'An earthquake happened at the same time' },
          { id: 'D', text: 'Truck traffic caused the vibrations' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            style={{ zIndex: 10 }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'B'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'B'
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            Correct! Vortex shedding turned steady wind into a periodic driving force!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            When wind flows past an object, it creates alternating vortices (like a flag waving). This periodic force matched the bridge's natural frequency--catastrophic resonance!
          </p>
          <button
            onClick={() => goToPhase('twist_play')}
            style={{ zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
          >
            See How It Happens
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-4">Vortex-Induced Vibration</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-6 max-w-3xl">
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-cyan-400 mb-2 text-center">Vortex Shedding</h3>
          <svg width="200" height="120" className="mx-auto">
            {/* Wind arrows */}
            {[0, 1, 2].map(i => (
              <path key={i} d={`M10 ${40 + i * 20} L30 ${40 + i * 20}`} stroke="#60a5fa" strokeWidth="2" markerEnd="url(#windArrow)"/>
            ))}

            {/* Cylinder/bridge section */}
            <rect x="50" y="30" width="20" height="60" rx="10" fill="#64748b"/>

            {/* Vortices */}
            <ellipse cx="95" cy="45" rx="15" ry="12" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4"/>
            <ellipse cx="95" cy="75" rx="15" ry="12" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4"/>
            <ellipse cx="140" cy="50" rx="12" ry="10" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4"/>
            <ellipse cx="140" cy="70" rx="12" ry="10" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4"/>

            {/* Rotation arrows */}
            <path d="M85 45 A10,10 0 1 1 105 45" fill="none" stroke="#ef4444" strokeWidth="1.5" markerEnd="url(#vortexArrow)"/>
            <path d="M105 75 A10,10 0 1 1 85 75" fill="none" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#vortexArrow2)"/>

            <defs>
              <marker id="windArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#60a5fa"/>
              </marker>
              <marker id="vortexArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#ef4444"/>
              </marker>
              <marker id="vortexArrow2" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#3b82f6"/>
              </marker>
            </defs>

            <text x="100" y="110" textAnchor="middle" fill="#94a3b8" fontSize="10">Alternating pressure = periodic force</text>
          </svg>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-red-400 mb-2 text-center">Resonance Buildup</h3>
          <svg width="200" height="120" className="mx-auto">
            {/* Growing oscillation */}
            <path
              d="M20 60 Q40 30, 60 60 Q80 90, 100 60 Q120 20, 140 60 Q160 100, 180 60"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
            />

            {/* Amplitude envelope */}
            <path d="M20 60 Q100 10, 180 30" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4"/>
            <path d="M20 60 Q100 110, 180 90" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4"/>

            {/* Labels */}
            <text x="100" y="25" textAnchor="middle" fill="#f59e0b" fontSize="8">Amplitude grows!</text>
            <text x="100" y="110" textAnchor="middle" fill="#94a3b8" fontSize="10">Time</text>
          </svg>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-purple-400 mb-3">The Strouhal Number:</h3>
        <div className="bg-slate-900/50 rounded-lg p-3 mb-3 font-mono text-center">
          <span className="text-white">f = St * V / D</span>
        </div>
        <ul className="space-y-2 text-slate-300 text-sm">
          <li><strong>f</strong> = vortex shedding frequency</li>
          <li><strong>St ~ 0.2</strong> for cylinders (Strouhal number)</li>
          <li><strong>V</strong> = wind velocity</li>
          <li><strong>D</strong> = characteristic dimension (bridge deck width)</li>
        </ul>
        <p className="text-red-400 mt-4 text-sm">
          At Tacoma Narrows, 40 mph wind created vortices at ~0.2 Hz--matching the bridge's torsional natural frequency exactly!
        </p>
      </div>

      <button
        onClick={() => goToPhase('twist_review')}
        style={{ zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Review This Discovery
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">Key Discovery</h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4">Resonance Can Be Hidden!</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            Even when a force appears steady or random, resonance can occur if:
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <h4 className="text-red-400 font-semibold mb-2">Hidden Periodic Forces:</h4>
              <ul className="space-y-1">
                <li>Vortex shedding from wind</li>
                <li>Rotating machinery imbalance</li>
                <li>Synchronized walking/marching</li>
                <li>Electrical grid frequency (50/60 Hz)</li>
              </ul>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <h4 className="text-emerald-400 font-semibold mb-2">Prevention Methods:</h4>
              <ul className="space-y-1">
                <li>Add damping to reduce peak</li>
                <li>Detune natural frequency</li>
                <li>Break up vortex patterns</li>
                <li>Active vibration control</li>
              </ul>
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4 mt-4">
            <h4 className="text-amber-400 font-semibold mb-2">The Q Factor (Quality Factor):</h4>
            <p className="text-sm mb-2">Q measures how "sharp" the resonance peak is:</p>
            <div className="font-mono text-center bg-slate-800/50 rounded p-2 mb-2">
              Q = omega_0 / (damping bandwidth)
            </div>
            <ul className="text-sm space-y-1">
              <li><strong>High Q (1000+):</strong> Very sharp peak, dangerous for bridges/glass</li>
              <li><strong>Low Q (10-100):</strong> Broad peak, safer but less selective</li>
              <li><strong>Tacoma Narrows:</strong> High Q made small periodic forces catastrophic</li>
            </ul>
          </div>
          <p className="text-emerald-400 font-medium mt-4 text-center">
            Engineers must always ask: "What periodic forces might my system encounter?"
          </p>
        </div>
      </div>

      <button
        onClick={() => goToPhase('transfer')}
        style={{ zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all duration-300"
      >
        Explore Real-World Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>

      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {transferApps.map((app, index) => (
          <button
            key={index}
            onClick={() => setActiveAppTab(index)}
            style={{ zIndex: 10 }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppTab === index
                ? `bg-gradient-to-r ${app.color} text-white`
                : completedApps.has(index)
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.short}
          </button>
        ))}
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16">{transferApps[activeAppTab].icon}</div>
          <div>
            <h3 className="text-xl font-bold text-white">{transferApps[activeAppTab].title}</h3>
            <p className="text-red-400 text-sm">{transferApps[activeAppTab].tagline}</p>
          </div>
        </div>

        <p className="text-slate-300 mb-4">{transferApps[activeAppTab].description}</p>

        <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-semibold text-red-400 mb-2">Resonance Connection:</h4>
          <p className="text-slate-400 text-sm">{transferApps[activeAppTab].connection}</p>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-semibold text-emerald-400 mb-2">How It Works:</h4>
          <p className="text-slate-400 text-sm">{transferApps[activeAppTab].howItWorks}</p>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {transferApps[activeAppTab].stats.map((stat, i) => (
            <div key={i} className="bg-slate-900/50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-white">{stat.value}</div>
              <div className="text-xs text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-amber-400 mb-2">Examples:</h4>
            <ul className="text-xs text-slate-400 space-y-1">
              {transferApps[activeAppTab].examples.map((ex, i) => (
                <li key={i}>{ex}</li>
              ))}
            </ul>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-purple-400 mb-2">Leading Companies:</h4>
            <div className="flex flex-wrap gap-1">
              {transferApps[activeAppTab].companies.map((co, i) => (
                <span key={i} className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded">{co}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-slate-900/50 to-slate-800/50 rounded-lg p-3 border border-slate-600">
          <h4 className="text-sm font-semibold text-pink-400 mb-1">Future Impact:</h4>
          <p className="text-xs text-slate-400">{transferApps[activeAppTab].futureImpact}</p>
        </div>

        {!completedApps.has(activeAppTab) && (
          <button
            onClick={() => handleAppComplete(activeAppTab)}
            style={{ zIndex: 10 }}
            className="mt-4 w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
          >
            Mark as Understood
          </button>
        )}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">
          {transferApps.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`}
            />
          ))}
        </div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>

      {completedApps.size >= 4 && (
        <button
          onClick={() => goToPhase('test')}
          style={{ zIndex: 10 }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all duration-300"
        >
          Take the Knowledge Test
        </button>
      )}
    </div>
  );

  const renderTest = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Knowledge Assessment</h2>

      {!showTestResults ? (
        <div className="space-y-6 max-w-2xl w-full">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-xs text-red-400 mb-2 italic">{q.scenario}</div>
              <p className="text-white font-medium mb-3">
                {qIndex + 1}. {q.question}
              </p>
              <div className="grid gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onClick={() => handleTestAnswer(qIndex, oIndex)}
                    style={{ zIndex: 10 }}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={() => {
              setShowTestResults(true);
              if (onGameEvent) {
                onGameEvent({ type: 'test_completed', data: { score: calculateScore() } });
              }
            }}
            style={{ zIndex: 10 }}
            disabled={testAnswers.includes(-1)}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              testAnswers.includes(-1)
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-500 hover:to-orange-500'
            }`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🎉' : '📚'}</div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Score: {calculateScore()}/10
            </h3>
            <p className="text-slate-300">
              {calculateScore() >= 7
                ? 'Excellent! You\'ve mastered forced oscillations and resonance!'
                : 'Keep studying! Review the concepts and try again.'}
            </p>
          </div>

          {/* Show explanations */}
          <div className="space-y-4 mb-6">
            {testQuestions.map((q, qIndex) => {
              const correctIndex = q.options.findIndex(opt => opt.correct);
              const userCorrect = testAnswers[qIndex] === correctIndex;
              return (
                <div key={qIndex} className={`p-3 rounded-lg ${userCorrect ? 'bg-emerald-900/30' : 'bg-red-900/30'}`}>
                  <p className="text-sm text-white font-medium mb-1">Q{qIndex + 1}: {userCorrect ? 'Correct' : 'Incorrect'}</p>
                  <p className="text-xs text-slate-400">{q.explanation}</p>
                </div>
              );
            })}
          </div>

          {calculateScore() >= 7 ? (
            <button
              onClick={() => {
                goToPhase('mastery');
                if (onGameEvent) {
                  onGameEvent({ type: 'mastery_achieved', data: { score: calculateScore() } });
                }
              }}
              style={{ zIndex: 10 }}
              className="w-full px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
            >
              Claim Your Mastery Badge
            </button>
          ) : (
            <button
              onClick={() => { setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase('review'); }}
              style={{ zIndex: 10 }}
              className="w-full px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all duration-300"
            >
              Review & Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-red-900/50 via-orange-900/50 to-amber-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">🎵</div>
        <h1 className="text-3xl font-bold text-white mb-4">Resonance Master!</h1>
        <p className="text-xl text-slate-300 mb-6">
          You've mastered the physics of forced oscillations and resonance!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🌉</div>
            <p className="text-sm text-slate-300">Bridge Engineering</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🎵</div>
            <p className="text-sm text-slate-300">Tuning Forks</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🏥</div>
            <p className="text-sm text-slate-300">MRI Imaging</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🎸</div>
            <p className="text-sm text-slate-300">Musical Instruments</p>
          </div>
        </div>

        <div className="bg-slate-800/70 rounded-xl p-4 mb-6">
          <p className="text-red-400 text-sm">
            Key Insight: Resonance occurs when driving frequency matches natural frequency, causing maximum amplitude response.
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => goToPhase('hook')}
            style={{ zIndex: 10 }}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
          >
            Explore Again
          </button>
        </div>
      </div>
    </div>
  );

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

  const phaseLabels: Record<Phase, string> = {
    hook: 'Hook',
    predict: 'Predict',
    play: 'Explore',
    review: 'Review',
    twist_predict: 'Twist',
    twist_play: 'Twist Lab',
    twist_review: 'Twist Review',
    transfer: 'Apply',
    test: 'Test',
    mastery: 'Mastery'
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium Background Layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-950/50 via-transparent to-orange-950/50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/20 via-transparent to-transparent" />

      {/* Ambient Glow Circles */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
      <div className="absolute top-3/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-900/70 border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-slate-400`}>Forced Oscillations & Resonance</span>
          <div className="flex gap-1.5 items-center">
            {phaseOrder.map((p) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p ? 'bg-red-500 w-6' : phaseOrder.indexOf(phase) > phaseOrder.indexOf(p) ? 'bg-red-500 w-2' : 'bg-slate-600 w-2'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-500`}>{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 pt-14 pb-8">
        {renderPhase()}
      </div>
    </div>
  );
};

export default ForcedOscillationsRenderer;
