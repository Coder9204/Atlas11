'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// DAMPED OSCILLATIONS - GOLD STANDARD IMPLEMENTATION
// Physics: m(d²x/dt²) + c(dx/dt) + kx = 0
// Damping ratio: ζ = c / (2√(mk))
// Underdamped (ζ<1): oscillates with decay
// Critically damped (ζ=1): fastest return without oscillation
// Overdamped (ζ>1): slow return without oscillation
// ============================================================================

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'damping_adjusted'
  | 'mass_released'
  | 'regime_changed'
  | 'displacement_measured'
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
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

const DampedOscillationsRenderer: React.FC<Props> = ({
  onGameEvent,
  currentPhase,
  onPhaseComplete
}) => {
  // Phase: 0=hook, 1=predict, 2=play, 3=review, 4=twist_predict, 5=twist_play, 6=twist_review, 7=transfer, 8=test, 9=mastery
  const [phase, setPhase] = useState(currentPhase ?? 0);
  const [isMobile, setIsMobile] = useState(false);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Animation states
  const [dampingRatio, setDampingRatio] = useState(0.2); // ζ
  const [displacement, setDisplacement] = useState(100); // Initial position
  const [isAnimating, setIsAnimating] = useState(false);
  const [time, setTime] = useState(0);
  const [regime, setRegime] = useState<'under' | 'critical' | 'over'>('under');

  const navigationLockRef = useRef(false);
  const lastInteractionRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Responsive check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const playSound = useCallback((type: 'bounce' | 'settle' | 'transition' | 'correct' | 'incorrect' | 'complete') => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    switch (type) {
      case 'bounce':
        oscillator.frequency.setValueAtTime(300, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
        break;
      case 'settle':
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
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
  }, []);

  // Calculate displacement based on damping regime
  const calculateDisplacement = useCallback((t: number, zeta: number, x0: number) => {
    const omega_n = 2; // Natural frequency

    if (zeta < 1) {
      // Underdamped: x(t) = A * e^(-ζω_n*t) * cos(ω_d*t + φ)
      const omega_d = omega_n * Math.sqrt(1 - zeta * zeta);
      return x0 * Math.exp(-zeta * omega_n * t) * Math.cos(omega_d * t);
    } else if (zeta === 1) {
      // Critically damped: x(t) = (A + Bt) * e^(-ω_n*t)
      return x0 * (1 + omega_n * t) * Math.exp(-omega_n * t);
    } else {
      // Overdamped: x(t) = A*e^(s1*t) + B*e^(s2*t)
      const s1 = -omega_n * (zeta - Math.sqrt(zeta * zeta - 1));
      const s2 = -omega_n * (zeta + Math.sqrt(zeta * zeta - 1));
      const A = x0 * s2 / (s2 - s1);
      const B = -x0 * s1 / (s2 - s1);
      return A * Math.exp(s1 * t) + B * Math.exp(s2 * t);
    }
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setTime(prev => {
        const newTime = prev + 0.05;
        const newDisp = calculateDisplacement(newTime, dampingRatio, 100);
        setDisplacement(newDisp);

        // Check for crossing zero (underdamped only)
        if (dampingRatio < 1 && Math.abs(newDisp) < 5 && newTime > 0.5) {
          playSound('bounce');
        }

        // Stop when settled
        if (Math.abs(newDisp) < 1 && newTime > 2) {
          setIsAnimating(false);
          playSound('settle');
          return newTime;
        }

        if (newTime > 15) {
          setIsAnimating(false);
          playSound('settle');
          return newTime;
        }

        return newTime;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isAnimating, dampingRatio, calculateDisplacement, playSound]);

  // Update regime when damping changes
  useEffect(() => {
    if (dampingRatio < 0.95) {
      setRegime('under');
    } else if (dampingRatio > 1.05) {
      setRegime('over');
    } else {
      setRegime('critical');
    }
  }, [dampingRatio]);

  const goToPhase = useCallback((newPhase: number) => {
    const now = Date.now();
    if (now - lastInteractionRef.current < 400) return;
    if (navigationLockRef.current) return;
    lastInteractionRef.current = now;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    if (onGameEvent) {
      onGameEvent({ type: 'phase_change', data: { phase: newPhase } });
    }
    if (onPhaseComplete) {
      onPhaseComplete(newPhase);
    }
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onGameEvent, onPhaseComplete]);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastInteractionRef.current < 400) return;
    lastInteractionRef.current = now;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'B' ? 'correct' : 'incorrect');
    if (onGameEvent) {
      onGameEvent({ type: 'prediction_made', data: { prediction, correct: prediction === 'B' } });
    }
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastInteractionRef.current < 400) return;
    lastInteractionRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'C' ? 'correct' : 'incorrect');
    if (onGameEvent) {
      onGameEvent({ type: 'twist_prediction_made', data: { prediction, correct: prediction === 'C' } });
    }
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const now = Date.now();
    if (now - lastInteractionRef.current < 400) return;
    lastInteractionRef.current = now;
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
    const now = Date.now();
    if (now - lastInteractionRef.current < 400) return;
    lastInteractionRef.current = now;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    if (onGameEvent) {
      onGameEvent({ type: 'app_explored', data: { appIndex } });
    }
  }, [playSound, onGameEvent]);

  const startSimulation = useCallback(() => {
    setTime(0);
    setDisplacement(100);
    setIsAnimating(true);
    if (onGameEvent) {
      onGameEvent({ type: 'simulation_started', data: { dampingRatio, regime } });
    }
  }, [dampingRatio, regime, onGameEvent]);

  const handleDampingChange = useCallback((value: number) => {
    setDampingRatio(value);
    if (onGameEvent) {
      onGameEvent({ type: 'damping_adjusted', data: { dampingRatio: value } });
    }
  }, [onGameEvent]);

  // Test questions with scenarios and explanations
  const testQuestions: TestQuestion[] = [
    {
      scenario: "A car drives over a speed bump, compressing its suspension springs.",
      question: "What type of damping do car suspensions typically use?",
      options: [
        { text: "No damping - to feel every bump", correct: false },
        { text: "Underdamped - for a slightly bouncy ride", correct: false },
        { text: "Critically damped - to return quickly without bouncing", correct: true },
        { text: "Overdamped - for maximum stability", correct: false }
      ],
      explanation: "Car suspensions are designed to be critically damped (or slightly underdamped for sportier feel). Critical damping returns the car to equilibrium fastest without oscillating, providing comfort and control."
    },
    {
      scenario: "You pull down on a mass attached to a spring and release it in a system with ζ = 0.3.",
      question: "How will the mass behave after release?",
      options: [
        { text: "Return directly to equilibrium without oscillating", correct: false },
        { text: "Oscillate with decreasing amplitude until it stops", correct: true },
        { text: "Oscillate forever with constant amplitude", correct: false },
        { text: "Move extremely slowly toward equilibrium", correct: false }
      ],
      explanation: "With ζ = 0.3 (less than 1), the system is underdamped. The mass oscillates back and forth with exponentially decreasing amplitude due to energy loss through damping."
    },
    {
      scenario: "An engineer designs a door closer with a very high damping coefficient.",
      question: "With ζ = 3, how will the door behave?",
      options: [
        { text: "Slam shut quickly", correct: false },
        { text: "Oscillate back and forth before closing", correct: false },
        { text: "Close very slowly without oscillating", correct: true },
        { text: "Stay exactly where you leave it", correct: false }
      ],
      explanation: "With ζ = 3 (overdamped), the door returns to closed position without oscillating, but very slowly. The high damping resists motion, making the closure take much longer than critical damping."
    },
    {
      scenario: "A seismometer must stop oscillating quickly after detecting an earthquake.",
      question: "Which damping ratio allows the instrument to settle fastest?",
      options: [
        { text: "ζ = 0.1 (very underdamped)", correct: false },
        { text: "ζ = 0.5 (moderately underdamped)", correct: false },
        { text: "ζ = 1.0 (critically damped)", correct: true },
        { text: "ζ = 5.0 (heavily overdamped)", correct: false }
      ],
      explanation: "Critical damping (ζ = 1) is the 'sweet spot' that returns to equilibrium in the minimum possible time without any overshoot. Both higher and lower values take longer to settle."
    },
    {
      scenario: "In the equation m(d²x/dt²) + c(dx/dt) + kx = 0, you increase the damping coefficient c.",
      question: "What happens to the damping ratio ζ?",
      options: [
        { text: "It decreases", correct: false },
        { text: "It stays the same", correct: false },
        { text: "It increases", correct: true },
        { text: "It becomes negative", correct: false }
      ],
      explanation: "The damping ratio ζ = c / (2√(mk)). Since c is in the numerator, increasing c directly increases ζ. This means more damping coefficient leads to higher damping ratio."
    },
    {
      scenario: "A grandfather clock pendulum swings in air with very light damping.",
      question: "Why does the pendulum eventually stop if not wound?",
      options: [
        { text: "Air resistance removes energy each swing (underdamped decay)", correct: true },
        { text: "Gravity pulls it to rest", correct: false },
        { text: "The spring wears out", correct: false },
        { text: "It runs out of momentum", correct: false }
      ],
      explanation: "Air resistance acts as light damping (ζ << 1), slowly removing energy each oscillation. The amplitude decreases exponentially until the pendulum stops. The clock mechanism adds energy to compensate."
    },
    {
      scenario: "A diving board vibrates after a diver jumps off.",
      question: "The board oscillates several times before stopping. This indicates:",
      options: [
        { text: "The board is critically damped", correct: false },
        { text: "The board is overdamped", correct: false },
        { text: "The board is underdamped", correct: true },
        { text: "The board has no damping", correct: false }
      ],
      explanation: "Multiple oscillations with decreasing amplitude is the signature of an underdamped system (ζ < 1). The board has inherent material damping, but it's not enough to prevent oscillation."
    },
    {
      scenario: "An analog meter needle moves to show a new reading.",
      question: "Why do quality meters have ζ ≈ 0.7 rather than ζ = 1?",
      options: [
        { text: "To make readings more dramatic", correct: false },
        { text: "One small overshoot helps the eye track the final position", correct: true },
        { text: "Critical damping is too expensive", correct: false },
        { text: "They couldn't achieve critical damping", correct: false }
      ],
      explanation: "Slightly underdamped response (ζ ≈ 0.7) creates one small overshoot that helps users identify exactly where the needle settles. Pure critical damping can make it hard to see when movement stops."
    },
    {
      scenario: "You're designing a building's earthquake dampers in a seismic zone.",
      question: "What happens if you accidentally make them overdamped?",
      options: [
        { text: "The building responds too slowly to ground motion", correct: true },
        { text: "The building oscillates dangerously", correct: false },
        { text: "The dampers work perfectly", correct: false },
        { text: "The building becomes more rigid", correct: false }
      ],
      explanation: "Overdamped systems respond slowly. During an earthquake, if dampers are overdamped, the building can't dissipate energy fast enough and may experience larger forces. Near-critical damping is optimal."
    },
    {
      scenario: "A smartphone screen protector absorbs impact when you drop your phone.",
      question: "The protector works by providing:",
      options: [
        { text: "More mass to slow the fall", correct: false },
        { text: "Damping to absorb and dissipate impact energy", correct: true },
        { text: "Spring force to bounce the phone", correct: false },
        { text: "Friction against your hand", correct: false }
      ],
      explanation: "Screen protectors (especially with shock-absorbing layers) provide damping that converts impact kinetic energy into heat. This reduces the peak force transmitted to the screen, preventing cracks."
    }
  ];

  // Transfer applications
  const transferApps: TransferApp[] = [
    {
      icon: (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect x="8" y="40" width="48" height="16" rx="4" fill="#3b82f6"/>
          <rect x="12" y="44" width="8" height="8" rx="4" fill="#1e293b"/>
          <rect x="44" y="44" width="8" height="8" rx="4" fill="#1e293b"/>
          <rect x="10" y="20" width="44" height="20" rx="2" fill="#64748b"/>
          <path d="M16 36 V24 M24 36 V28 M32 36 V26 M40 36 V30 M48 36 V24" stroke="#22c55e" strokeWidth="2"/>
          <rect x="4" y="52" width="10" height="8" rx="2" fill="#1e293b"/>
          <rect x="50" y="52" width="10" height="8" rx="2" fill="#1e293b"/>
        </svg>
      ),
      title: "Automotive Suspension Systems",
      short: "Car Suspension",
      tagline: "Turning bumpy roads into smooth rides",
      description: "Every car relies on damped oscillation principles to provide a comfortable, controlled ride over uneven surfaces.",
      connection: "Car shock absorbers are carefully tuned dampers that work with springs to dissipate road vibration energy.",
      howItWorks: "When a wheel hits a bump, the spring compresses storing energy. The shock absorber (damper) converts this energy to heat through fluid friction. The system is designed near critical damping so the car returns to level quickly without bouncing.",
      stats: [
        { value: "~0.7-1.0", label: "Damping ratio range" },
        { value: "200-400", label: "Damping N·s/m typical" },
        { value: "1-2 sec", label: "Settling time target" },
        { value: "85%", label: "Energy absorbed per cycle" }
      ],
      examples: [
        "MacPherson strut systems in most passenger cars",
        "Double-wishbone suspensions in sports cars",
        "Air suspension with electronic damping control",
        "Motorcycle mono-shock rear suspension"
      ],
      companies: ["Bilstein", "KYB", "Monroe", "Öhlins", "Fox Racing Shox"],
      futureImpact: "Active and semi-active suspension systems use real-time damping adjustment (magnetorheological fluids) to optimize ride quality and handling for every road condition.",
      color: "from-blue-600 to-indigo-600"
    },
    {
      icon: (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect x="4" y="48" width="56" height="12" rx="2" fill="#64748b"/>
          <rect x="8" y="44" width="48" height="4" fill="#94a3b8"/>
          <rect x="4" y="8" width="56" height="36" rx="4" fill="#1e293b" stroke="#64748b" strokeWidth="2"/>
          <path d="M16 30 L16 20 L24 20 M40 20 L48 20 L48 30 M48 36 L48 38 L40 38 M24 38 L16 38 L16 36" stroke="#f59e0b" strokeWidth="2"/>
          <circle cx="32" cy="28" r="8" fill="#ef4444" opacity="0.3"/>
          <circle cx="32" cy="28" r="4" fill="#ef4444"/>
          <path d="M8 52 L8 56 L12 56" stroke="#22c55e" strokeWidth="2"/>
          <path d="M56 52 L56 56 L52 56" stroke="#22c55e" strokeWidth="2"/>
        </svg>
      ),
      title: "Building Earthquake Dampers",
      short: "Seismic Dampers",
      tagline: "Protecting skyscrapers from seismic destruction",
      description: "Tall buildings use massive damping systems to absorb earthquake energy and prevent structural damage.",
      connection: "Buildings are essentially giant mass-spring-damper systems. Earthquake dampers add controlled energy dissipation.",
      howItWorks: "Tuned Mass Dampers (TMDs) are huge masses (often hundreds of tons) suspended in buildings. When the building sways, the mass moves opposite, providing damping. Viscous dampers between floors also dissipate energy through fluid friction.",
      stats: [
        { value: "300-700", label: "Tons (TMD mass)" },
        { value: "10-40%", label: "Sway reduction" },
        { value: "$1-5M", label: "System cost" },
        { value: "~0.8-1.0", label: "Target damping ratio" }
      ],
      examples: [
        "Taipei 101's 730-ton pendulum damper",
        "Citigroup Center's 400-ton TMD",
        "Shanghai Tower's eddy current damper",
        "Yokohama Landmark Tower's active mass damper"
      ],
      companies: ["Motioneering", "Taylor Devices", "Damptech", "THK", "Maurer SE"],
      futureImpact: "Smart damping systems with AI-controlled actuators will predict earthquake motion and actively adjust damping in real-time, potentially reducing structural stress by over 50%.",
      color: "from-amber-600 to-orange-600"
    },
    {
      icon: (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect x="8" y="4" width="48" height="56" rx="8" fill="#1e293b" stroke="#64748b" strokeWidth="2"/>
          <rect x="12" y="8" width="40" height="32" rx="4" fill="#0f172a"/>
          <circle cx="32" cy="50" r="4" fill="#64748b"/>
          <path d="M20 28 Q26 20 32 28 Q38 36 44 28" stroke="#22c55e" strokeWidth="2" fill="none"/>
          <path d="M20 24 L20 32" stroke="#64748b" strokeWidth="1"/>
          <path d="M44 24 L44 32" stroke="#64748b" strokeWidth="1"/>
          <text x="32" y="18" textAnchor="middle" fill="#64748b" fontSize="6">ACCEL</text>
        </svg>
      ),
      title: "Smartphone Accelerometers",
      short: "MEMS Sensors",
      tagline: "Sensing motion in microscopic springs",
      description: "Every smartphone contains tiny damped oscillators that detect motion, orientation, and acceleration.",
      connection: "MEMS accelerometers use microscopic mass-spring-damper systems to measure acceleration forces.",
      howItWorks: "A tiny proof mass (micrometers scale) is suspended by silicon springs. When you move the phone, the mass deflects. Capacitive plates measure this displacement. Squeeze-film air damping provides near-critical damping for fast, accurate response.",
      stats: [
        { value: "~100 μm", label: "Proof mass size" },
        { value: "0.5-0.8", label: "Typical damping ratio" },
        { value: "±16g", label: "Measurement range" },
        { value: "1-10 kHz", label: "Bandwidth" }
      ],
      examples: [
        "Screen rotation detection in phones",
        "Step counting in fitness trackers",
        "Airbag deployment sensors in cars",
        "Drone stabilization systems"
      ],
      companies: ["Bosch Sensortec", "STMicroelectronics", "InvenSense (TDK)", "Analog Devices", "NXP"],
      futureImpact: "Next-generation MEMS with active damping control will enable sub-millimeter positioning for AR glasses, gesture recognition, and medical implants that detect heartbeat irregularities.",
      color: "from-emerald-600 to-teal-600"
    },
    {
      icon: (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <ellipse cx="32" cy="32" rx="28" ry="28" fill="#1e293b" stroke="#64748b" strokeWidth="2"/>
          <circle cx="32" cy="32" r="20" fill="none" stroke="#94a3b8" strokeWidth="1"/>
          <circle cx="32" cy="32" r="12" fill="none" stroke="#94a3b8" strokeWidth="1"/>
          <path d="M32 12 L32 20" stroke="#ef4444" strokeWidth="2"/>
          <path d="M32 44 L32 52" stroke="#94a3b8" strokeWidth="2"/>
          <path d="M12 32 L20 32" stroke="#94a3b8" strokeWidth="2"/>
          <path d="M44 32 L52 32" stroke="#94a3b8" strokeWidth="2"/>
          <circle cx="32" cy="32" r="3" fill="#f59e0b"/>
          <path d="M32 32 L40 20" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      title: "Precision Instrument Movements",
      short: "Meter Damping",
      tagline: "Making needles settle where you need them",
      description: "Analog meters, scales, and gauges use carefully calibrated damping to display readings quickly and accurately.",
      connection: "The meter needle is a torsional oscillator. Damping ensures it settles on the correct reading without bouncing.",
      howItWorks: "Analog meters use either air damping (a vane moving in an enclosed chamber), fluid damping (silicone oil), or eddy current damping (aluminum disk in magnetic field). The damping is tuned to ζ ≈ 0.6-0.8 for optimal response.",
      stats: [
        { value: "0.6-0.8", label: "Optimal damping ratio" },
        { value: "0.5-2 sec", label: "Settling time" },
        { value: "1-5%", label: "Allowable overshoot" },
        { value: "Class 0.5", label: "Accuracy class" }
      ],
      examples: [
        "Analog multimeters and ammeters",
        "Precision laboratory balances",
        "Pressure gauges in industrial systems",
        "Speedometers in classic cars"
      ],
      companies: ["Simpson Electric", "Mettler Toledo", "WIKA", "Yokogawa", "Fluke"],
      futureImpact: "While digital displays dominate, high-reliability applications (aircraft, nuclear plants) still use analog meters with advanced damping for their failure-safe operation and electromagnetic immunity.",
      color: "from-purple-600 to-pink-600"
    }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      const correct = testQuestions[index].options.findIndex(opt => opt.correct);
      return score + (answer === correct ? 1 : 0);
    }, 0);
  };

  const getRegimeLabel = (z: number): string => {
    if (z < 0.95) return 'Underdamped';
    if (z > 1.05) return 'Overdamped';
    return 'Critically Damped';
  };

  const getRegimeColor = (z: number): string => {
    if (z < 0.95) return 'text-cyan-400';
    if (z > 1.05) return 'text-amber-400';
    return 'text-emerald-400';
  };

  // ============================================================================
  // RENDER FUNCTIONS FOR EACH PHASE
  // ============================================================================

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-cyan-400 tracking-wide">MECHANICS</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
        Why Don't Car Rides Feel Like Trampolines?
      </h1>
      <p className="text-lg md:text-xl text-slate-400 max-w-xl mb-8 leading-relaxed">
        The hidden physics of smooth suspension
      </p>

      {/* Premium card */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl p-8 max-w-2xl border border-slate-700/50 shadow-2xl shadow-cyan-500/5 mb-8">
        <svg width={isMobile ? 280 : 400} height={isMobile ? 180 : 220} className="mx-auto">
          <defs>
            <linearGradient id="roadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#374151"/>
              <stop offset="100%" stopColor="#1f2937"/>
            </linearGradient>
            <linearGradient id="carGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6"/>
              <stop offset="100%" stopColor="#1d4ed8"/>
            </linearGradient>
          </defs>

          {/* Road */}
          <rect x="0" y={isMobile ? 160 : 200} width={isMobile ? 280 : 400} height="20" fill="url(#roadGrad)"/>
          <rect x="0" y={isMobile ? 160 : 200} width={isMobile ? 280 : 400} height="3" fill="#fbbf24"/>

          {/* Bump */}
          <ellipse cx={isMobile ? 140 : 200} cy={isMobile ? 160 : 200} rx="30" ry="10" fill="#4b5563"/>

          {/* Car body */}
          <g transform={`translate(${isMobile ? 100 : 150}, ${isMobile ? 100 : 120})`}>
            {/* Body */}
            <rect x="0" y="20" width="80" height="30" rx="5" fill="url(#carGrad)"/>
            <rect x="15" y="0" width="50" height="25" rx="5" fill="#60a5fa"/>

            {/* Windows */}
            <rect x="20" y="5" width="18" height="15" rx="2" fill="#bfdbfe"/>
            <rect x="42" y="5" width="18" height="15" rx="2" fill="#bfdbfe"/>

            {/* Wheels */}
            <circle cx="15" cy="50" r="12" fill="#1f2937"/>
            <circle cx="15" cy="50" r="6" fill="#64748b"/>
            <circle cx="65" cy="50" r="12" fill="#1f2937"/>
            <circle cx="65" cy="50" r="6" fill="#64748b"/>

            {/* Suspension springs */}
            <path d="M15 35 Q10 40, 15 45 Q20 40, 15 35" stroke="#f59e0b" strokeWidth="2" fill="none"/>
            <path d="M65 35 Q60 40, 65 45 Q70 40, 65 35" stroke="#f59e0b" strokeWidth="2" fill="none"/>
          </g>

          {/* Motion arrows */}
          <path d={`M${isMobile ? 60 : 80} ${isMobile ? 130 : 160} L${isMobile ? 80 : 110} ${isMobile ? 130 : 160}`} stroke="#22c55e" strokeWidth="3" markerEnd="url(#arrowGreen)"/>

          <defs>
            <marker id="arrowGreen" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#22c55e"/>
            </marker>
          </defs>
        </svg>

        <p className="text-lg text-slate-300 mt-6 mb-4">
          Springs compress when you hit bumps, but why doesn't your car keep bouncing up and down for minutes?
        </p>
        <p className="text-base text-cyan-400 font-medium">
          What invisible force turns oscillation into smooth motion?
        </p>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="group relative px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-2">
          Discover the Physics
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>
      <p className="mt-6 text-sm text-slate-500">Explore damping and energy dissipation</p>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          You pull a mass down on a spring and release it. The spring wants to oscillate forever, but after a few bounces, it stops.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          What mechanism removes energy from the oscillating system?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Gravity eventually overcomes the spring force' },
          { id: 'B', text: 'Damping forces convert kinetic energy to heat' },
          { id: 'C', text: 'The spring loses its elasticity over time' },
          { id: 'D', text: 'Air pressure pushes the mass to equilibrium' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'B'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'B'
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
            ✓ Correct! <span className="text-cyan-400">Damping</span> is the key to stopping oscillations!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            Dampers convert kinetic energy to heat through friction (in shock absorbers) or fluid resistance.
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
          >
            Explore the Physics →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Damped Oscillation Lab</h2>

      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4 w-full max-w-2xl">
        {/* Visualization */}
        <svg width="100%" height="200" viewBox="0 0 400 200" className="mb-4">
          {/* Ceiling */}
          <rect x="0" y="0" width="400" height="20" fill="#374151"/>
          <pattern id="ceilingPattern" width="20" height="20" patternUnits="userSpaceOnUse">
            <line x1="0" y1="20" x2="20" y2="0" stroke="#4b5563" strokeWidth="2"/>
          </pattern>
          <rect x="0" y="0" width="400" height="20" fill="url(#ceilingPattern)"/>

          {/* Spring */}
          <path
            d={`M200 20 ${Array.from({length: 10}, (_, i) =>
              `Q ${180 + (i % 2) * 40} ${25 + i * (100 - displacement * 0.4) / 10}, 200 ${30 + (i + 1) * (100 - displacement * 0.4) / 10}`
            ).join(' ')}`}
            stroke="#f59e0b"
            strokeWidth="3"
            fill="none"
          />

          {/* Damper */}
          <rect x="230" y="20" width="20" height={60 - displacement * 0.3} fill="#64748b"/>
          <rect x="225" y={60 - displacement * 0.3} width="30" height="20" fill="#94a3b8"/>

          {/* Mass */}
          <rect
            x="170"
            y={100 - displacement * 0.4}
            width="60"
            height="40"
            rx="5"
            fill={regime === 'under' ? '#06b6d4' : regime === 'critical' ? '#22c55e' : '#f59e0b'}
          />
          <text x="200" y={125 - displacement * 0.4} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
            {displacement.toFixed(0)}
          </text>

          {/* Equilibrium line */}
          <line x1="140" y1="100" x2="260" y2="100" stroke="#64748b" strokeWidth="1" strokeDasharray="4"/>
          <text x="270" y="104" fill="#64748b" fontSize="10">Equilibrium</text>

          {/* Graph */}
          <rect x="300" y="40" width="90" height="120" fill="#0f172a" rx="5"/>
          <line x1="310" y1="100" x2="380" y2="100" stroke="#374151" strokeWidth="1"/>
          <line x1="345" y1="50" x2="345" y2="150" stroke="#374151" strokeWidth="1"/>

          {/* Graph curve based on regime */}
          {regime === 'under' && (
            <path d="M310 70 Q320 130, 330 70 Q340 100, 350 70 Q360 90, 370 80 Q375 95, 380 90"
                  stroke="#06b6d4" strokeWidth="2" fill="none"/>
          )}
          {regime === 'critical' && (
            <path d="M310 70 Q340 85, 370 95 Q380 98, 380 100"
                  stroke="#22c55e" strokeWidth="2" fill="none"/>
          )}
          {regime === 'over' && (
            <path d="M310 70 Q330 75, 350 85 Q370 93, 380 98"
                  stroke="#f59e0b" strokeWidth="2" fill="none"/>
          )}

          <text x="345" y="170" textAnchor="middle" fill="#64748b" fontSize="8">Time →</text>
        </svg>

        {/* Controls */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-slate-400 text-sm block mb-2">
              Damping Ratio (ζ): <span className={`font-bold ${getRegimeColor(dampingRatio)}`}>
                {dampingRatio.toFixed(2)} - {getRegimeLabel(dampingRatio)}
              </span>
            </label>
            <input
              type="range"
              min="0.05"
              max="2.0"
              step="0.05"
              value={dampingRatio}
              onChange={(e) => handleDampingChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Underdamped</span>
              <span>Critical</span>
              <span>Overdamped</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onMouseDown={(e) => { e.preventDefault(); startSimulation(); }}
              disabled={isAnimating}
              className="p-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 text-white font-semibold transition-colors"
            >
              {isAnimating ? 'Oscillating...' : '▶ Release Mass'}
            </button>
            <div className="p-4 rounded-xl bg-slate-700/50 text-center">
              <div className="text-2xl font-bold text-white">{time.toFixed(1)}s</div>
              <div className="text-sm text-slate-400">Elapsed Time</div>
            </div>
          </div>
        </div>
      </div>

      {/* Regime explanation */}
      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl w-full">
        <h3 className="text-lg font-semibold text-cyan-400 mb-3">The Three Damping Regimes:</h3>
        <div className="grid gap-3 text-sm text-slate-300">
          <div className={`flex items-start gap-3 p-2 rounded-lg ${regime === 'under' ? 'bg-cyan-900/30 border border-cyan-500/50' : ''}`}>
            <span className="bg-cyan-600 text-white px-2 py-1 rounded text-xs font-bold">ζ &lt; 1</span>
            <p><strong>Underdamped:</strong> Oscillates with decreasing amplitude. Lower ζ = more oscillations.</p>
          </div>
          <div className={`flex items-start gap-3 p-2 rounded-lg ${regime === 'critical' ? 'bg-emerald-900/30 border border-emerald-500/50' : ''}`}>
            <span className="bg-emerald-600 text-white px-2 py-1 rounded text-xs font-bold">ζ = 1</span>
            <p><strong>Critically Damped:</strong> Returns to equilibrium fastest without oscillating. The sweet spot!</p>
          </div>
          <div className={`flex items-start gap-3 p-2 rounded-lg ${regime === 'over' ? 'bg-amber-900/30 border border-amber-500/50' : ''}`}>
            <span className="bg-amber-600 text-white px-2 py-1 rounded text-xs font-bold">ζ &gt; 1</span>
            <p><strong>Overdamped:</strong> Returns slowly without oscillating. Higher ζ = slower return.</p>
          </div>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
      >
        Review the Concepts →
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding Damped Oscillations</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">📐 The Governing Equation</h3>
          <div className="bg-slate-900/50 rounded-lg p-3 mb-3 font-mono text-center">
            <span className="text-white">m(d²x/dt²) + c(dx/dt) + kx = 0</span>
          </div>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• <strong>m</strong> = mass (inertia)</li>
            <li>• <strong>c</strong> = damping coefficient (resistance)</li>
            <li>• <strong>k</strong> = spring constant (stiffness)</li>
            <li>• The damping term c(dx/dt) opposes velocity</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">⚖️ The Damping Ratio</h3>
          <div className="bg-slate-900/50 rounded-lg p-3 mb-3 font-mono text-center">
            <span className="text-white">ζ = c / (2√(mk))</span>
          </div>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• ζ &lt; 1: Underdamped (oscillates)</li>
            <li>• ζ = 1: Critically damped (fastest return)</li>
            <li>• ζ &gt; 1: Overdamped (sluggish)</li>
            <li>• Engineers tune ζ for desired response</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-purple-400 mb-3">🔋 Energy Dissipation</h3>
          <div className="text-slate-300 text-sm space-y-2">
            <p><strong>Without Damping:</strong> Energy oscillates forever between kinetic (½mv²) and potential (½kx²)</p>
            <p><strong>With Damping:</strong> Energy is continuously removed by the damping force:</p>
            <div className="bg-slate-900/50 rounded-lg p-3 my-2 font-mono text-center">
              <span className="text-white">Power dissipated = c × v²</span>
            </div>
            <p className="text-cyan-400 mt-3">
              This power becomes heat in shock absorbers, electrical resistance in eddy-current dampers, or sound in acoustic dampers.
            </p>
          </div>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Discover a Surprising Twist →
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">The Twist Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          You're designing a precision measuring instrument (like a voltmeter needle). The needle must move to show new readings, then settle quickly.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          Why do engineers often choose ζ ≈ 0.7 instead of exactly ζ = 1?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Critical damping is too expensive to achieve precisely' },
          { id: 'B', text: 'Underdamping allows the needle to move faster' },
          { id: 'C', text: 'A slight overshoot helps users see exactly where the needle settles' },
          { id: 'D', text: 'Overdamping looks more professional' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'C'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'C'
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
            ✓ The slight overshoot is actually useful!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            Human perception benefits from seeing one small overshoot—it helps us identify exactly where the needle settles. This is called "optimal damping" for visual instruments.
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
          >
            See the Difference →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-4">Optimal vs. Critical Damping</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-6 max-w-3xl">
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-emerald-400 mb-2 text-center">Critical Damping (ζ = 1)</h3>
          <svg width="200" height="150" className="mx-auto">
            {/* Graph background */}
            <rect x="20" y="10" width="160" height="120" fill="#0f172a" rx="5"/>
            <line x1="30" y1="70" x2="170" y2="70" stroke="#374151" strokeWidth="1"/>

            {/* Target value line */}
            <line x1="30" y1="40" x2="170" y2="40" stroke="#22c55e" strokeWidth="1" strokeDasharray="4"/>
            <text x="175" y="44" fill="#22c55e" fontSize="8">Target</text>

            {/* Response curve - critical damping */}
            <path d="M30 100 Q60 60, 90 45 Q120 42, 150 40 L170 40"
                  stroke="#22c55e" strokeWidth="2" fill="none"/>

            {/* Needle indicator */}
            <circle cx="170" cy="40" r="4" fill="#22c55e"/>

            <text x="100" y="140" textAnchor="middle" fill="#94a3b8" fontSize="10">Approaches smoothly, hard to see when it stops</text>
          </svg>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-cyan-400 mb-2 text-center">Optimal Damping (ζ ≈ 0.7)</h3>
          <svg width="200" height="150" className="mx-auto">
            {/* Graph background */}
            <rect x="20" y="10" width="160" height="120" fill="#0f172a" rx="5"/>
            <line x1="30" y1="70" x2="170" y2="70" stroke="#374151" strokeWidth="1"/>

            {/* Target value line */}
            <line x1="30" y1="40" x2="170" y2="40" stroke="#06b6d4" strokeWidth="1" strokeDasharray="4"/>
            <text x="175" y="44" fill="#06b6d4" fontSize="8">Target</text>

            {/* Response curve - slight overshoot */}
            <path d="M30 100 Q50 55, 80 35 Q100 30, 120 38 Q140 42, 160 40 L170 40"
                  stroke="#06b6d4" strokeWidth="2" fill="none"/>

            {/* Overshoot indicator */}
            <circle cx="95" cy="33" r="3" fill="#f59e0b"/>
            <text x="95" y="25" textAnchor="middle" fill="#f59e0b" fontSize="8">Overshoot!</text>

            <text x="100" y="140" textAnchor="middle" fill="#94a3b8" fontSize="10">Overshoot helps eye track final position</text>
          </svg>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-purple-400 mb-3">The 4% Overshoot Rule:</h3>
        <ul className="space-y-2 text-slate-300 text-sm">
          <li>• At ζ ≈ 0.7, overshoot is about 4-5% of the step change</li>
          <li>• This is small enough not to mislead, but visible enough to help</li>
          <li>• Rise time is actually faster than critical damping!</li>
          <li>• Used in control systems, meters, and human-machine interfaces</li>
        </ul>
        <p className="text-cyan-400 mt-4 text-sm">
          This demonstrates that "optimal" depends on the application. For machines reading values, ζ = 1 is best. For humans watching needles, ζ ≈ 0.7 is preferred!
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Review This Discovery →
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">Key Discovery</h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4">Context Determines "Optimal" Damping!</h3>
        <div className="space-y-4 text-slate-300">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <h4 className="text-emerald-400 font-semibold mb-2">Use Critical (ζ = 1):</h4>
              <ul className="space-y-1">
                <li>• Automated control systems</li>
                <li>• Digital sensor readings</li>
                <li>• Robotic positioning</li>
                <li>• Emergency shutoffs</li>
              </ul>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <h4 className="text-cyan-400 font-semibold mb-2">Use Slight Under (ζ ≈ 0.7):</h4>
              <ul className="space-y-1">
                <li>• Analog meter needles</li>
                <li>• User interface animations</li>
                <li>• Vehicle suspension feel</li>
                <li>• Audio speaker response</li>
              </ul>
            </div>
          </div>
          <p className="text-emerald-400 font-medium mt-4 text-center">
            Engineering is about choosing the right trade-off for each situation!
          </p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
      >
        Explore Real-World Applications →
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
            onMouseDown={(e) => { e.preventDefault(); setActiveAppTab(index); }}
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
            <p className="text-cyan-400 text-sm">{transferApps[activeAppTab].tagline}</p>
          </div>
        </div>

        <p className="text-slate-300 mb-4">{transferApps[activeAppTab].description}</p>

        <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-semibold text-cyan-400 mb-2">Physics Connection:</h4>
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
                <li key={i}>• {ex}</li>
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
            onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }}
            className="mt-4 w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
          >
            ✓ Mark as Understood
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
          onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
        >
          Take the Knowledge Test →
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
              <div className="text-xs text-cyan-400 mb-2 italic">{q.scenario}</div>
              <p className="text-white font-medium mb-3">
                {qIndex + 1}. {q.question}
              </p>
              <div className="grid gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(qIndex, oIndex); }}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? 'bg-cyan-600 text-white'
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
            onMouseDown={(e) => {
              e.preventDefault();
              setShowTestResults(true);
              if (onGameEvent) {
                onGameEvent({ type: 'test_completed', data: { score: calculateScore() } });
              }
            }}
            disabled={testAnswers.includes(-1)}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              testAnswers.includes(-1)
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500'
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
                ? 'Excellent! You\'ve mastered damped oscillations!'
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
                  <p className="text-sm text-white font-medium mb-1">Q{qIndex + 1}: {userCorrect ? '✓' : '✗'}</p>
                  <p className="text-xs text-slate-400">{q.explanation}</p>
                </div>
              );
            })}
          </div>

          {calculateScore() >= 7 ? (
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                goToPhase(9);
                if (onGameEvent) {
                  onGameEvent({ type: 'mastery_achieved', data: { score: calculateScore() } });
                }
              }}
              className="w-full px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
            >
              Claim Your Mastery Badge →
            </button>
          ) : (
            <button
              onMouseDown={(e) => { e.preventDefault(); setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase(3); }}
              className="w-full px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
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
      <div className="bg-gradient-to-br from-cyan-900/50 via-blue-900/50 to-purple-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">🎛️</div>
        <h1 className="text-3xl font-bold text-white mb-4">Damped Oscillations Master!</h1>
        <p className="text-xl text-slate-300 mb-6">
          You've mastered the physics of damped oscillations and energy dissipation!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">📉</div>
            <p className="text-sm text-slate-300">Damping Ratio</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">⚡</div>
            <p className="text-sm text-slate-300">Energy Dissipation</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🚗</div>
            <p className="text-sm text-slate-300">Suspension Design</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🏗️</div>
            <p className="text-sm text-slate-300">Seismic Protection</p>
          </div>
        </div>

        <div className="bg-slate-800/70 rounded-xl p-4 mb-6">
          <p className="text-cyan-400 text-sm">
            Key Insight: The damping ratio ζ = c / (2√(mk)) determines whether systems oscillate (ζ&lt;1), settle fast (ζ=1), or move sluggishly (ζ&gt;1).
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(0); }}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
          >
            ↺ Explore Again
          </button>
        </div>
      </div>
    </div>
  );

  const renderPhase = () => {
    switch (phase) {
      case 0: return renderHook();
      case 1: return renderPredict();
      case 2: return renderPlay();
      case 3: return renderReview();
      case 4: return renderTwistPredict();
      case 5: return renderTwistPlay();
      case 6: return renderTwistReview();
      case 7: return renderTransfer();
      case 8: return renderTest();
      case 9: return renderMastery();
      default: return renderHook();
    }
  };

  const phaseLabels = ['Hook', 'Predict', 'Explore', 'Review', 'Twist', 'Twist Lab', 'Twist Review', 'Apply', 'Test', 'Mastery'];

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-600/3 rounded-full blur-3xl" />

      {/* Premium progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-medium text-cyan-400">Damped Oscillations</span>
          <div className="flex gap-1.5">
            {phaseLabels.map((_, i) => (
              <button
                key={i}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(i); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === i
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-400 w-6 shadow-lg shadow-cyan-500/50'
                    : phase > i
                    ? 'bg-emerald-500 w-2'
                    : 'bg-slate-600 w-2 hover:bg-slate-500'
                }`}
                title={phaseLabels[i]}
              />
            ))}
          </div>
          <span className="text-sm text-slate-400 font-medium">{phaseLabels[phase]}</span>
        </div>
      </div>

      <div className="relative z-10 pt-16 pb-8">
        {renderPhase()}
      </div>
    </div>
  );
};

export default DampedOscillationsRenderer;
