import React, { useState, useEffect, useCallback, useRef } from 'react';

// Gold standard: Union type for game events
type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'simulation_stopped'
  | 'parameter_changed'
  | 'length_adjusted'
  | 'amplitude_adjusted'
  | 'energy_tracked'
  | 'milestone_reached'
  | 'twist_prediction_made'
  | 'app_explored'
  | 'app_completed'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved';

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

// Gold standard: Numeric phases 0-9
interface Props {
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
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
  stats: string[];
  examples: string[];
  companies: string[];
  futureImpact: string;
  color: string;
}

const SimpleHarmonicMotionRenderer: React.FC<Props> = ({ onGameEvent, currentPhase = 0, onPhaseComplete }) => {
  // Gold standard: Numeric phase system 0-9
  const [phase, setPhase] = useState<number>(currentPhase);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppIndex, setActiveAppIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [isAnimating, setIsAnimating] = useState(false);
  const [pendulumAngle, setPendulumAngle] = useState(30); // degrees
  const [angularVelocity, setAngularVelocity] = useState(0);
  const [time, setTime] = useState(0);
  const [amplitude, setAmplitude] = useState(30); // degrees
  const [length, setLength] = useState(1.5); // meters
  const [showEnergyBars, setShowEnergyBars] = useState(true);
  const [trailPoints, setTrailPoints] = useState<{x: number, y: number, t: number}[]>([]);

  // Teaching milestones
  const [milestones, setMilestones] = useState({
    observedOscillation: false,
    changedLength: false,
    changedAmplitude: false,
    understoodPeriod: false,
    trackedEnergy: false
  });

  // Navigation refs
  const isNavigating = useRef(false);
  const animationRef = useRef<number | null>(null);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sound utility
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'complete' | 'swing' | 'transition') => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
        click: { freq: 600, duration: 0.1, type: 'sine' },
        success: { freq: 800, duration: 0.2, type: 'sine' },
        failure: { freq: 300, duration: 0.3, type: 'sawtooth' },
        complete: { freq: 1000, duration: 0.3, type: 'sine' },
        swing: { freq: 200, duration: 0.05, type: 'sine' },
        transition: { freq: 500, duration: 0.15, type: 'sine' }
      };

      const sound = sounds[type] || sounds.click;
      oscillator.frequency.value = sound.freq;
      oscillator.type = sound.type;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + sound.duration);
    } catch {
      // Audio not available
    }
  }, []);

  // Gold standard: Phase navigation with 400ms debouncing
  const goToPhase = useCallback((newPhase: number) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('click');

    // Call onPhaseComplete for completed phase before moving
    if (newPhase > phase) {
      onPhaseComplete?.(phase);
    }

    setPhase(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase } });
    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [playSound, onGameEvent, phase, onPhaseComplete]);

  // Physics constants
  const g = 9.81; // m/s²

  // Calculate period: T = 2π√(L/g)
  const period = 2 * Math.PI * Math.sqrt(length / g);
  const frequency = 1 / period;
  const angularFrequency = 2 * Math.PI / period;

  // Animation loop for pendulum
  useEffect(() => {
    if (!isAnimating) return;

    let lastTime = performance.now();
    const dt = 0.016; // 60fps timestep

    const animate = (currentTime: number) => {
      const elapsed = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      setTime(t => t + elapsed);

      // Simple harmonic motion: θ(t) = A * cos(ωt)
      // For small angles, this is accurate
      const angleRadians = (amplitude * Math.PI / 180) * Math.cos(angularFrequency * (time + elapsed));
      const angleDegrees = angleRadians * 180 / Math.PI;

      setPendulumAngle(angleDegrees);
      setAngularVelocity(-angularFrequency * (amplitude * Math.PI / 180) * Math.sin(angularFrequency * (time + elapsed)));

      // Track position for wave trail
      setTrailPoints(prev => {
        const newPoint = { x: time + elapsed, y: angleDegrees, t: time + elapsed };
        const filtered = [...prev, newPoint].filter(p => p.t > time + elapsed - 5);
        return filtered.slice(-200);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, amplitude, angularFrequency, time]);

  // Calculate energies
  const maxPE = 0.5 * (amplitude * Math.PI / 180) ** 2; // Normalized
  const currentAngleRad = pendulumAngle * Math.PI / 180;
  const potentialEnergy = 0.5 * currentAngleRad ** 2;
  const kineticEnergy = maxPE - potentialEnergy;
  const pePercent = maxPE > 0 ? (potentialEnergy / maxPE) * 100 : 0;
  const kePercent = maxPE > 0 ? (kineticEnergy / maxPE) * 100 : 0;

  // Event handlers
  const handlePrediction = useCallback((prediction: string) => {
    if (isNavigating.current) return;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'B' ? 'success' : 'failure');
    onGameEvent?.({ type: 'prediction_made', data: { prediction, correct: prediction === 'B' } });
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    if (isNavigating.current) return;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'C' ? 'success' : 'failure');
    onGameEvent?.({ type: 'twist_prediction_made', data: { prediction, correct: prediction === 'C' } });
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    if (isNavigating.current) return;
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
    playSound('click');
    onGameEvent?.({ type: 'test_answered', data: { questionIndex, answerIndex } });
  }, [playSound, onGameEvent]);

  const handleAppComplete = useCallback((appIndex: number) => {
    if (isNavigating.current) return;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    onGameEvent?.({ type: 'app_completed', data: { appIndex } });
  }, [playSound, onGameEvent]);

  const startAnimation = useCallback(() => {
    setTime(0);
    setTrailPoints([]);
    setPendulumAngle(amplitude);
    setAngularVelocity(0);
    setIsAnimating(true);
    if (!milestones.observedOscillation) {
      setMilestones(m => ({ ...m, observedOscillation: true }));
      onGameEvent?.({ type: 'milestone_reached', data: { milestone: 'observedOscillation' } });
    }
    onGameEvent?.({ type: 'simulation_started', data: { amplitude, length } });
  }, [amplitude, length, milestones.observedOscillation, onGameEvent]);

  const stopAnimation = useCallback(() => {
    setIsAnimating(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    onGameEvent?.({ type: 'simulation_stopped', data: {} });
  }, [onGameEvent]);

  const handleLengthChange = useCallback((newLength: number) => {
    setLength(newLength);
    if (!milestones.changedLength) {
      setMilestones(m => ({ ...m, changedLength: true }));
      onGameEvent?.({ type: 'milestone_reached', data: { milestone: 'changedLength' } });
    }
    onGameEvent?.({ type: 'parameter_changed', data: { parameter: 'length', value: newLength } });
  }, [milestones.changedLength, onGameEvent]);

  const handleAmplitudeChange = useCallback((newAmplitude: number) => {
    setAmplitude(newAmplitude);
    if (!milestones.changedAmplitude) {
      setMilestones(m => ({ ...m, changedAmplitude: true }));
      onGameEvent?.({ type: 'milestone_reached', data: { milestone: 'changedAmplitude' } });
    }
    onGameEvent?.({ type: 'parameter_changed', data: { parameter: 'amplitude', value: newAmplitude } });
  }, [milestones.changedAmplitude, onGameEvent]);

  // Test questions
  const testQuestions: TestQuestion[] = [
    {
      scenario: "A grandfather clock uses a pendulum that swings back and forth every 2 seconds to keep accurate time.",
      question: "What determines the period of the pendulum's swing?",
      options: [
        { text: "The mass of the pendulum bob", correct: false },
        { text: "The length of the pendulum", correct: true },
        { text: "How hard you push it initially", correct: false },
        { text: "The color of the pendulum", correct: false }
      ],
      explanation: "The period T = 2π√(L/g) depends only on the pendulum's length and gravitational acceleration. Mass and initial amplitude (for small angles) don't affect the period!"
    },
    {
      scenario: "A child is swinging on a playground swing. Their parent wants them to swing faster (higher frequency).",
      question: "What should the child do to increase the swing frequency?",
      options: [
        { text: "Swing their legs to go higher", correct: false },
        { text: "Move to a swing with shorter chains", correct: true },
        { text: "Add weight by holding a backpack", correct: false },
        { text: "Push off harder from the ground", correct: false }
      ],
      explanation: "Frequency = 1/T, and T = 2π√(L/g). A shorter pendulum (shorter chains) has a shorter period and therefore higher frequency. Amplitude and mass don't change the frequency for small oscillations."
    },
    {
      scenario: "An engineer is designing a metronome for musicians that needs to tick at exactly 120 beats per minute (2 Hz).",
      question: "Using T = 2π√(L/g), what length pendulum is needed?",
      options: [
        { text: "About 0.062 meters (6.2 cm)", correct: true },
        { text: "About 0.25 meters (25 cm)", correct: false },
        { text: "About 1 meter (100 cm)", correct: false },
        { text: "About 2 meters (200 cm)", correct: false }
      ],
      explanation: "For f=2Hz, T=0.5s. Using T=2π√(L/g): 0.5=2π√(L/9.81), solving gives L=0.062m. Short pendulums swing fast!"
    },
    {
      scenario: "A pendulum is swinging back and forth. At the moment it reaches its maximum displacement (highest point in swing)...",
      question: "What is the relationship between kinetic and potential energy at this point?",
      options: [
        { text: "Maximum kinetic energy, minimum potential energy", correct: false },
        { text: "Maximum potential energy, minimum (zero) kinetic energy", correct: true },
        { text: "Both kinetic and potential energy are at their maximum", correct: false },
        { text: "Both kinetic and potential energy are zero", correct: false }
      ],
      explanation: "At maximum displacement, the pendulum momentarily stops (v=0, so KE=0) and is at its highest point (maximum PE). Energy continuously converts between KE and PE."
    },
    {
      scenario: "You're timing a pendulum and notice it completes 10 full swings in 25 seconds.",
      question: "What is the frequency of this pendulum?",
      options: [
        { text: "0.25 Hz", correct: false },
        { text: "0.4 Hz", correct: true },
        { text: "2.5 Hz", correct: false },
        { text: "10 Hz", correct: false }
      ],
      explanation: "Period T = 25s/10 swings = 2.5 seconds per swing. Frequency f = 1/T = 1/2.5 = 0.4 Hz (0.4 complete oscillations per second)."
    },
    {
      scenario: "A simple pendulum on Earth has a period of 2 seconds. The same pendulum is taken to the Moon where gravity is 1/6 of Earth's.",
      question: "What happens to the pendulum's period on the Moon?",
      options: [
        { text: "It decreases to about 0.82 seconds", correct: false },
        { text: "It stays exactly 2 seconds", correct: false },
        { text: "It increases to about 4.9 seconds", correct: true },
        { text: "The pendulum won't swing on the Moon", correct: false }
      ],
      explanation: "T = 2π√(L/g). With g reduced to g/6, T_moon = 2π√(L/(g/6)) = √6 × T_earth ≈ 2.45 × 2s ≈ 4.9s. Weaker gravity means slower swinging!"
    },
    {
      scenario: "The position of a simple harmonic oscillator follows x(t) = A·cos(ωt), where A is amplitude and ω is angular frequency.",
      question: "If you double the angular frequency ω, what happens to the period?",
      options: [
        { text: "Period doubles", correct: false },
        { text: "Period is cut in half", correct: true },
        { text: "Period stays the same", correct: false },
        { text: "Period becomes zero", correct: false }
      ],
      explanation: "Period T = 2π/ω. If ω doubles, T becomes half: T_new = 2π/(2ω) = T/2. Angular frequency and period are inversely related."
    },
    {
      scenario: "A mass on a spring oscillates up and down. The spring constant k = 100 N/m and the mass m = 0.25 kg.",
      question: "Using T = 2π√(m/k), what is the period of oscillation?",
      options: [
        { text: "About 0.1 seconds", correct: false },
        { text: "About 0.31 seconds", correct: true },
        { text: "About 1 second", correct: false },
        { text: "About 6.28 seconds", correct: false }
      ],
      explanation: "T = 2π√(m/k) = 2π√(0.25/100) = 2π√(0.0025) = 2π × 0.05 = 0.314 seconds. This is a fast-vibrating system!"
    },
    {
      scenario: "You're designing a car's suspension system. Each shock absorber has a spring constant of 50,000 N/m, and the car's mass per wheel is 400 kg.",
      question: "Approximately how many oscillations per second will the car bounce at?",
      options: [
        { text: "About 0.3 Hz", correct: false },
        { text: "About 1.8 Hz", correct: true },
        { text: "About 10 Hz", correct: false },
        { text: "About 50 Hz", correct: false }
      ],
      explanation: "T = 2π√(m/k) = 2π√(400/50000) = 2π√(0.008) = 0.56s. Frequency f = 1/0.56 ≈ 1.8 Hz. This is a comfortable bounce rate for passengers!"
    },
    {
      scenario: "The equation for simple harmonic motion can be written as x(t) = A·cos(2πft + φ), where φ is the phase angle.",
      question: "If φ = π/2, how does this change the motion compared to φ = 0?",
      options: [
        { text: "The amplitude becomes larger", correct: false },
        { text: "The frequency increases", correct: false },
        { text: "The motion starts at x=0 instead of x=A", correct: true },
        { text: "The motion reverses direction", correct: false }
      ],
      explanation: "cos(θ + π/2) = -sin(θ), so with φ=π/2, x(0)=A·cos(π/2)=0. The oscillation starts at the equilibrium position moving in one direction, rather than starting at maximum displacement."
    }
  ];

  // Transfer applications
  const transferApps: TransferApp[] = [
    {
      icon: "⏰",
      title: "Precision Timekeeping",
      short: "Clocks",
      tagline: "The heartbeat of accurate time",
      description: "Pendulum clocks revolutionized timekeeping by using SHM's constant period. Today, quartz crystals vibrate at precise frequencies using the same principles.",
      connection: "The period of a pendulum depends only on its length (not amplitude), making it ideal for consistent timekeeping. Modern quartz watches use crystal oscillators vibrating at exactly 32,768 Hz.",
      howItWorks: "A pendulum swings with period T=2π√(L/g). Since g and L are constant, T is constant. Each swing releases exactly one gear tooth, advancing the clock hands uniformly.",
      stats: [
        "Pendulum clocks accurate to 1 second per year",
        "Quartz crystals vibrate at 32,768 Hz exactly",
        "Atomic clocks use cesium oscillations at 9.2 GHz",
        "GPS satellites need nanosecond timing precision"
      ],
      examples: [
        "Grandfather clocks with 1-meter pendulums (2-second period)",
        "Quartz wristwatches with tiny tuning fork crystals",
        "Atomic clocks in GPS satellites",
        "Metronomes for musicians keeping tempo"
      ],
      companies: ["Rolex", "Seiko", "National Institute of Standards and Technology", "Apple Watch"],
      futureImpact: "Optical atomic clocks using laser-trapped atoms will achieve accuracy of 1 second error over the age of the universe, enabling tests of fundamental physics.",
      color: "from-amber-600 to-yellow-600"
    },
    {
      icon: "🚗",
      title: "Vehicle Suspension Systems",
      short: "Suspension",
      tagline: "Smooth rides through oscillation control",
      description: "Car suspensions use springs and dampers that follow SHM principles to absorb road bumps and keep passengers comfortable while maintaining tire contact.",
      connection: "Each wheel's suspension is a mass-spring system with natural frequency f = (1/2π)√(k/m). Engineers tune this frequency to avoid resonance with road irregularities.",
      howItWorks: "When a car hits a bump, the suspension compresses and oscillates. Shock absorbers (dampers) dissipate energy to prevent continuous bouncing. The system is tuned for comfort (1-2 Hz).",
      stats: [
        "Typical car suspension frequency: 1-2 Hz",
        "Active suspension adjusts 1000+ times per second",
        "Formula 1 cars experience up to 5g vertical forces",
        "Magnetic dampers respond in 5 milliseconds"
      ],
      examples: [
        "MacPherson strut suspension in most sedans",
        "Air suspension in luxury vehicles like Mercedes S-Class",
        "Active magnetic suspension in Cadillac's MagneRide",
        "Motorcycle front fork springs"
      ],
      companies: ["Bose", "Tesla", "BWI Group", "ZF Friedrichshafen"],
      futureImpact: "AI-controlled predictive suspension will read the road ahead using cameras and pre-adjust damping, virtually eliminating felt bumps.",
      color: "from-blue-600 to-cyan-600"
    },
    {
      icon: "🌉",
      title: "Structural Engineering",
      short: "Buildings",
      tagline: "Keeping structures stable against vibrations",
      description: "Buildings and bridges have natural frequencies. Engineers must design structures to avoid resonance with wind, earthquakes, and foot traffic.",
      connection: "Every structure has a natural frequency f = (1/2π)√(k/m). If external forces match this frequency (resonance), oscillations amplify dangerously.",
      howItWorks: "Tuned mass dampers are massive pendulums installed in skyscrapers. When wind makes the building sway at its natural frequency, the damper oscillates opposite, canceling the motion.",
      stats: [
        "Taipei 101's damper weighs 730 tons",
        "Millennium Bridge swayed at 1 Hz from footsteps",
        "Tacoma Narrows Bridge collapsed from 0.2 Hz resonance",
        "Earthquake frequencies typically 0.1-10 Hz"
      ],
      examples: [
        "Taipei 101's giant pendulum damper",
        "Shanghai Tower's eddy-current damper",
        "London Millennium Bridge's horizontal dampers",
        "Base isolators in earthquake-prone buildings"
      ],
      companies: ["ARUP", "Thornton Tomasetti", "Motioneering", "Taylor Devices"],
      futureImpact: "Smart buildings will have active damping systems that sense vibrations and counteract them in real-time using AI-controlled mass dampers.",
      color: "from-slate-600 to-zinc-600"
    },
    {
      icon: "🎵",
      title: "Musical Instruments",
      short: "Music",
      tagline: "Vibrations creating harmony",
      description: "Every musical note is a specific frequency of vibration. Strings, air columns, and membranes all follow SHM principles to create the sounds we hear.",
      connection: "A guitar string vibrates at f = (1/2L)√(T/μ), where L is length, T is tension, and μ is mass per length. Changing any of these changes the pitch.",
      howItWorks: "When you pluck a string, it oscillates at its fundamental frequency plus harmonics (integer multiples). The combination of these frequencies creates the instrument's unique timbre.",
      stats: [
        "Concert A = 440 Hz exactly",
        "Piano strings can exceed 200 lbs tension",
        "Human hearing range: 20 Hz to 20,000 Hz",
        "Bass notes can be felt below 100 Hz"
      ],
      examples: [
        "Guitar strings (adjustable tension and length)",
        "Piano hammers striking tensioned strings",
        "Wind instruments with air column resonance",
        "Tuning forks vibrating at specific frequencies"
      ],
      companies: ["Yamaha", "Steinway", "Fender", "Martin Guitar"],
      futureImpact: "Electronic instruments will use perfect mathematical models of SHM to synthesize any instrument sound with unprecedented realism and control.",
      color: "from-purple-600 to-pink-600"
    }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index]?.options[answer]?.correct ? 1 : 0);
    }, 0);
  };

  // Render helper functions (NOT components)
  const renderPendulum = (width: number, height: number, showLabels: boolean = true) => {
    const pivotX = width / 2;
    const pivotY = 40;
    const pendulumLength = Math.min(height - 100, 250) * (length / 2);
    const bobRadius = 20;

    const angleRad = pendulumAngle * Math.PI / 180;
    const bobX = pivotX + pendulumLength * Math.sin(angleRad);
    const bobY = pivotY + pendulumLength * Math.cos(angleRad);

    // Calculate velocities for display
    const tangentialVelocity = Math.abs(angularVelocity) * pendulumLength;

    return (
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id="pendulumRodGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <linearGradient id="bobGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <filter id="bobShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="3" dy="3" stdDeviation="3" floodOpacity="0.3" />
          </filter>
          <linearGradient id="equilibriumGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={width} height={height} fill="#0f172a" rx="12" />

        {/* Grid lines */}
        {[...Array(10)].map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * height/10} x2={width} y2={i * height/10} stroke="#1e293b" strokeWidth="1" />
        ))}
        {[...Array(10)].map((_, i) => (
          <line key={`v${i}`} x1={i * width/10} y1="0" x2={i * width/10} y2={height} stroke="#1e293b" strokeWidth="1" />
        ))}

        {/* Equilibrium line */}
        <line
          x1={pivotX} y1={pivotY}
          x2={pivotX} y2={pivotY + pendulumLength + 40}
          stroke="url(#equilibriumGrad)"
          strokeWidth="2"
          strokeDasharray="8 4"
        />

        {/* Arc showing swing range */}
        <path
          d={`M ${pivotX + pendulumLength * Math.sin(-amplitude * Math.PI / 180)},${pivotY + pendulumLength * Math.cos(amplitude * Math.PI / 180)} A ${pendulumLength},${pendulumLength} 0 0,1 ${pivotX + pendulumLength * Math.sin(amplitude * Math.PI / 180)},${pivotY + pendulumLength * Math.cos(amplitude * Math.PI / 180)}`}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeDasharray="4 4"
          opacity="0.4"
        />

        {/* Pivot mount */}
        <rect x={pivotX - 30} y="10" width="60" height="20" fill="#475569" rx="4" />
        <circle cx={pivotX} cy={pivotY} r="8" fill="#64748b" stroke="#94a3b8" strokeWidth="2" />

        {/* Pendulum rod */}
        <line
          x1={pivotX} y1={pivotY}
          x2={bobX} y2={bobY}
          stroke="url(#pendulumRodGrad)"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Bob */}
        <circle
          cx={bobX}
          cy={bobY}
          r={bobRadius}
          fill="url(#bobGradient)"
          filter="url(#bobShadow)"
          stroke="#b45309"
          strokeWidth="2"
        />

        {/* Highlight on bob */}
        <circle cx={bobX - 6} cy={bobY - 6} r="6" fill="white" opacity="0.3" />

        {/* Velocity arrow */}
        {tangentialVelocity > 0.1 && (
          <g>
            <defs>
              <marker id="velocityArrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <path d="M0,0 L0,6 L9,3 z" fill="#ef4444" />
              </marker>
            </defs>
            <line
              x1={bobX}
              y1={bobY}
              x2={bobX + Math.sign(-angularVelocity) * Math.min(tangentialVelocity * 30, 50) * Math.cos(angleRad)}
              y2={bobY + Math.sign(-angularVelocity) * Math.min(tangentialVelocity * 30, 50) * Math.sin(angleRad)}
              stroke="#ef4444"
              strokeWidth="3"
              markerEnd="url(#velocityArrow)"
            />
          </g>
        )}

        {/* Labels */}
        {showLabels && (
          <>
            {/* Angle label */}
            <text x={pivotX + 45} y={pivotY + 30} fill="#94a3b8" fontSize="12" fontFamily="monospace">
              θ = {pendulumAngle.toFixed(1)}°
            </text>

            {/* Length label */}
            <text x={pivotX + 20} y={pivotY + pendulumLength/2} fill="#94a3b8" fontSize="12" fontFamily="monospace">
              L = {length.toFixed(2)}m
            </text>

            {/* Period info */}
            <text x="15" y={height - 45} fill="#22c55e" fontSize="14" fontWeight="bold">
              Period: T = {period.toFixed(3)}s
            </text>
            <text x="15" y={height - 25} fill="#3b82f6" fontSize="14" fontWeight="bold">
              Frequency: f = {frequency.toFixed(3)} Hz
            </text>
          </>
        )}
      </svg>
    );
  };

  const renderEnergyBars = (width: number) => (
    <div className="bg-slate-800/50 rounded-xl p-4" style={{ width }}>
      <h4 className="text-sm font-semibold text-slate-300 mb-3">Energy Distribution</h4>

      {/* Kinetic Energy */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-red-400">Kinetic Energy (KE)</span>
          <span className="text-red-400">{kePercent.toFixed(0)}%</span>
        </div>
        <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-100"
            style={{ width: `${kePercent}%` }}
          />
        </div>
      </div>

      {/* Potential Energy */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-blue-400">Potential Energy (PE)</span>
          <span className="text-blue-400">{pePercent.toFixed(0)}%</span>
        </div>
        <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-100"
            style={{ width: `${pePercent}%` }}
          />
        </div>
      </div>

      {/* Total Energy */}
      <div className="flex justify-between text-xs text-emerald-400 pt-2 border-t border-slate-600">
        <span>Total Energy</span>
        <span>100% (Conserved)</span>
      </div>
    </div>
  );

  const renderWaveGraph = (width: number, height: number) => {
    const padding = 30;
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;

    // Generate sine wave points
    const points: string[] = [];
    const numPoints = 200;
    for (let i = 0; i <= numPoints; i++) {
      const t = (i / numPoints) * 4 * Math.PI;
      const x = padding + (i / numPoints) * graphWidth;
      const y = padding + graphHeight/2 - (amplitude/45) * graphHeight/2 * Math.cos(t);
      points.push(`${x},${y}`);
    }

    // Current position marker
    const currentT = (time % (4 * Math.PI / angularFrequency)) * angularFrequency;
    const markerX = padding + (currentT / (4 * Math.PI)) * graphWidth;
    const markerY = padding + graphHeight/2 - (pendulumAngle/45) * graphHeight/2;

    return (
      <svg width={width} height={height}>
        <defs>
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={width} height={height} fill="#0f172a" rx="8" />

        {/* Grid */}
        <line x1={padding} y1={padding + graphHeight/2} x2={width - padding} y2={padding + graphHeight/2} stroke="#334155" strokeWidth="1" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#334155" strokeWidth="1" />

        {/* Sine wave */}
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke="url(#waveGradient)"
          strokeWidth="2"
        />

        {/* Current position marker */}
        {isAnimating && (
          <circle cx={markerX} cy={markerY} r="6" fill="#f59e0b" stroke="#fbbf24" strokeWidth="2" />
        )}

        {/* Labels */}
        <text x={width/2} y={height - 8} fill="#94a3b8" fontSize="12" textAnchor="middle">Time (t)</text>
        <text x="12" y={height/2} fill="#94a3b8" fontSize="12" transform={`rotate(-90, 12, ${height/2})`} textAnchor="middle">θ (degrees)</text>

        {/* Equation */}
        <text x={width - padding} y="20" fill="#22c55e" fontSize="11" textAnchor="end" fontFamily="monospace">
          θ(t) = A·cos(ωt)
        </text>
      </svg>
    );
  };

  // Phase render functions
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6 text-center">
      {/* Premium Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-6">
        <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-amber-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>
      {/* Gradient Title */}
      <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl md:text-4xl'} font-bold mb-4 bg-gradient-to-r from-white via-amber-100 to-yellow-200 bg-clip-text text-transparent`}>The Rhythm of the Universe</h1>

      <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl p-4 md:p-8 max-w-2xl border border-white/10">
        <div className="mb-6">
          {renderPendulum(isMobile ? 280 : 350, isMobile ? 250 : 300, false)}
        </div>

        <p className="text-lg md:text-xl text-slate-300 mb-4">
          A pendulum swings back and forth with perfect regularity, regardless of how high you release it!
        </p>

        <p className="text-base md:text-lg text-cyan-400 font-medium mb-6">
          What determines how fast a pendulum swings?
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onMouseDown={(e) => { e.preventDefault(); isAnimating ? stopAnimation() : startAnimation(); }}
            className={`px-6 py-3 ${isAnimating ? 'bg-red-600 hover:bg-red-500' : 'bg-amber-600 hover:bg-amber-500'} text-white font-semibold rounded-xl transition-colors`}
          >
            {isAnimating ? '⏸ Stop' : '▶ Start Pendulum'}
          </button>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="mt-8 px-8 py-4 bg-gradient-to-r from-amber-600 to-yellow-600 text-white text-lg font-semibold rounded-xl hover:from-amber-500 hover:to-yellow-500 transition-all duration-300 shadow-lg hover:shadow-amber-500/30"
      >
        Discover the Secret →
      </button>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>Make Your Prediction</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 max-w-2xl mb-6">
        <p className="text-base md:text-lg text-slate-300 mb-4">
          A grandfather clock has a pendulum that swings every 2 seconds. You want to make it swing faster.
        </p>
        <p className="text-base md:text-lg text-cyan-400 font-medium">
          What would change the pendulum's period (swing time)?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Increasing the mass of the bob' },
          { id: 'B', text: 'Shortening the pendulum length' },
          { id: 'C', text: 'Pulling it back farther before releasing' },
          { id: 'D', text: 'Pushing it harder when releasing' }
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
            ✓ The length is the key! The period formula is T = 2π√(L/g)
          </p>
          <p className="text-slate-400 text-sm mt-2">
            Surprisingly, mass and amplitude don't affect the period for small angles!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-yellow-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-yellow-500 transition-all duration-300"
          >
            Explore the Physics →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-4`}>Pendulum Laboratory</h2>

      <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'} gap-4 max-w-4xl w-full`}>
        {/* Pendulum visualization */}
        <div className="bg-slate-800/50 rounded-2xl p-4">
          {renderPendulum(isMobile ? 300 : 350, isMobile ? 280 : 320)}

          <div className="flex justify-center gap-3 mt-4">
            <button
              onMouseDown={(e) => { e.preventDefault(); isAnimating ? stopAnimation() : startAnimation(); }}
              className={`px-4 py-2 ${isAnimating ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white font-semibold rounded-lg transition-colors`}
            >
              {isAnimating ? '⏸ Stop' : '▶ Start'}
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); setShowEnergyBars(!showEnergyBars); }}
              className={`px-4 py-2 ${showEnergyBars ? 'bg-blue-600' : 'bg-slate-600'} hover:opacity-80 text-white font-semibold rounded-lg transition-colors`}
            >
              ⚡ Energy
            </button>
          </div>
        </div>

        {/* Controls and info */}
        <div className="space-y-4">
          {/* Length slider */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Pendulum Length: {length.toFixed(2)} m
            </label>
            <input
              type="range"
              min="0.25"
              max="2.5"
              step="0.05"
              value={length}
              onChange={(e) => handleLengthChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0.25m (Fast)</span>
              <span>2.5m (Slow)</span>
            </div>
          </div>

          {/* Amplitude slider */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Release Angle: {amplitude}°
            </label>
            <input
              type="range"
              min="5"
              max="45"
              step="1"
              value={amplitude}
              onChange={(e) => handleAmplitudeChange(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>5° (Small)</span>
              <span>45° (Large)</span>
            </div>
          </div>

          {/* Energy bars */}
          {showEnergyBars && renderEnergyBars(isMobile ? 300 : 320)}
        </div>
      </div>

      {/* Wave graph */}
      <div className="mt-6 w-full max-w-4xl">
        <h3 className="text-lg font-semibold text-slate-300 mb-2">Position vs Time Graph</h3>
        {renderWaveGraph(isMobile ? 320 : 700, 150)}
      </div>

      {/* Key insight */}
      <div className="bg-gradient-to-r from-amber-900/40 to-yellow-900/40 rounded-xl p-4 mt-6 max-w-2xl">
        <h3 className="text-lg font-semibold text-amber-400 mb-2">Key Discovery</h3>
        <p className="text-slate-300 text-sm">
          <strong>Period T = 2π√(L/g)</strong> — The period depends only on length and gravity, not on mass or amplitude (for small angles). This is why pendulum clocks are so reliable!
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-yellow-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-yellow-500 transition-all duration-300"
      >
        Review the Concepts →
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>Simple Harmonic Motion Explained</h2>

      <div className="grid md:grid-cols-2 gap-4 max-w-4xl">
        <div className="bg-gradient-to-br from-amber-900/50 to-yellow-900/50 rounded-2xl p-5">
          <h3 className="text-lg font-bold text-amber-400 mb-3">📐 The Mathematics</h3>
          <div className="space-y-2 text-slate-300 text-sm">
            <p><strong>Position:</strong> θ(t) = A·cos(ωt)</p>
            <p><strong>Period:</strong> T = 2π√(L/g)</p>
            <p><strong>Frequency:</strong> f = 1/T = (1/2π)√(g/L)</p>
            <p><strong>Angular frequency:</strong> ω = 2πf = √(g/L)</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-5">
          <h3 className="text-lg font-bold text-cyan-400 mb-3">⚡ Energy Conservation</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• At maximum displacement: 100% PE, 0% KE</li>
            <li>• At equilibrium: 0% PE, 100% KE</li>
            <li>• Total energy = KE + PE = constant</li>
            <li>• Energy oscillates between forms</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-5">
          <h3 className="text-lg font-bold text-emerald-400 mb-3">🔄 Restoring Force</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Force always points toward equilibrium</li>
            <li>• F = -mg·sin(θ) ≈ -mg·θ (small angles)</li>
            <li>• Proportional to displacement</li>
            <li>• Creates the oscillating motion</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-5">
          <h3 className="text-lg font-bold text-purple-400 mb-3">🎯 Key Properties</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Period independent of amplitude</li>
            <li>• Period independent of mass</li>
            <li>• Sinusoidal motion (cosine wave)</li>
            <li>• Isochronism: all swings take equal time</li>
          </ul>
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
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-6`}>🌟 The Twist Challenge</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 max-w-2xl mb-6">
        <p className="text-base md:text-lg text-slate-300 mb-4">
          Galileo supposedly discovered pendulum isochronism by watching a chandelier swing in the Pisa Cathedral. He timed it with his pulse!
        </p>
        <p className="text-base md:text-lg text-cyan-400 font-medium">
          What happens to the period if you swing a pendulum with a VERY large angle (like 90°)?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The period stays exactly the same' },
          { id: 'B', text: 'The period becomes shorter (faster swings)' },
          { id: 'C', text: 'The period becomes longer (slower swings)' },
          { id: 'D', text: 'The pendulum stops oscillating' }
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
            ✓ The period actually increases for large angles!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            The simple formula T = 2π√(L/g) only works for small angles. At large angles, the period is longer. This is because sin(θ) ≠ θ for large angles.
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
          >
            Explore This Effect →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => {
    // Calculate period correction for large angles
    const angleRad = amplitude * Math.PI / 180;
    const correctionFactor = 1 + (1/16) * angleRad ** 2 + (11/3072) * angleRad ** 4;
    const actualPeriod = period * correctionFactor;

    return (
      <div className="flex flex-col items-center p-4 md:p-6">
        <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-4`}>Large Angle Effects</h2>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mb-6">
          <div className="bg-slate-800/50 rounded-2xl p-4">
            <h3 className="text-lg font-semibold text-cyan-400 mb-2">Period Comparison</h3>

            {/* Visual comparison */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-emerald-400">Small angle formula</span>
                  <span className="text-emerald-400">{period.toFixed(3)}s</span>
                </div>
                <div className="h-6 bg-slate-700 rounded overflow-hidden">
                  <div
                    className="h-full bg-emerald-500/70"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-amber-400">Actual (at {amplitude}°)</span>
                  <span className="text-amber-400">{actualPeriod.toFixed(3)}s</span>
                </div>
                <div className="h-6 bg-slate-700 rounded overflow-hidden">
                  <div
                    className="h-full bg-amber-500/70"
                    style={{ width: `${(actualPeriod / period) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <p className="text-slate-400 text-sm mt-3">
              Difference: +{((correctionFactor - 1) * 100).toFixed(1)}%
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-4">
            <h3 className="text-lg font-semibold text-purple-400 mb-2">Why This Happens</h3>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li>• Small angle: sin(θ) ≈ θ (linear approximation)</li>
              <li>• Large angle: sin(θ) &lt; θ (restoring force weaker)</li>
              <li>• Weaker force = slower return = longer period</li>
              <li>• At 90°: period is ~18% longer than predicted</li>
            </ul>

            <div className="mt-3 p-3 bg-purple-900/30 rounded-lg">
              <p className="text-xs text-slate-400">Full formula (elliptic integral):</p>
              <p className="text-sm text-purple-300 font-mono">
                T = 2π√(L/g) × [1 + ¼sin²(θ₀/2) + ...]
              </p>
            </div>
          </div>
        </div>

        {/* Interactive angle slider */}
        <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 rounded-xl p-4 max-w-md w-full">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Try different release angles: {amplitude}°
          </label>
          <input
            type="range"
            min="5"
            max="85"
            step="5"
            value={amplitude}
            onChange={(e) => handleAmplitudeChange(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>5° (Very small)</span>
            <span>85° (Almost horizontal)</span>
          </div>
        </div>

        <button
          onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
        >
          Review Discovery →
        </button>
      </div>
    );
  };

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-6`}>🌟 Key Discovery</h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4">The Limits of Simple Harmonic Motion</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            Simple Harmonic Motion is an <strong>idealization</strong> that works beautifully for small oscillations:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Pendulums with small angles (&lt;15°)</li>
            <li>Springs within their elastic limit</li>
            <li>Systems without friction or damping</li>
          </ul>
          <p className="text-amber-400 font-medium mt-4">
            Real systems often deviate from perfect SHM, but the model remains incredibly useful for understanding oscillatory motion!
          </p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-yellow-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-yellow-500 transition-all duration-300"
      >
        Explore Real-World Applications →
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>Real-World Applications</h2>

      {/* App tabs */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        {transferApps.map((app, index) => (
          <button
            key={index}
            onMouseDown={(e) => { e.preventDefault(); setActiveAppIndex(index); }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppIndex === index
                ? `bg-gradient-to-r ${app.color} text-white`
                : completedApps.has(index)
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.icon} {app.short}
          </button>
        ))}
      </div>

      {/* Active app content */}
      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 max-w-3xl w-full">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{transferApps[activeAppIndex].icon}</span>
          <div>
            <h3 className="text-xl font-bold text-white">{transferApps[activeAppIndex].title}</h3>
            <p className="text-sm text-slate-400">{transferApps[activeAppIndex].tagline}</p>
          </div>
        </div>

        <p className="text-slate-300 mb-4">{transferApps[activeAppIndex].description}</p>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-900/50 rounded-xl p-3">
            <h4 className="text-sm font-semibold text-cyan-400 mb-2">Physics Connection</h4>
            <p className="text-slate-400 text-sm">{transferApps[activeAppIndex].connection}</p>
          </div>

          <div className="bg-slate-900/50 rounded-xl p-3">
            <h4 className="text-sm font-semibold text-amber-400 mb-2">How It Works</h4>
            <p className="text-slate-400 text-sm">{transferApps[activeAppIndex].howItWorks}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-900/50 rounded-xl p-3">
            <h4 className="text-sm font-semibold text-emerald-400 mb-2">Key Stats</h4>
            <ul className="text-slate-400 text-sm space-y-1">
              {transferApps[activeAppIndex].stats.map((stat, i) => (
                <li key={i}>• {stat}</li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-900/50 rounded-xl p-3">
            <h4 className="text-sm font-semibold text-purple-400 mb-2">Examples</h4>
            <ul className="text-slate-400 text-sm space-y-1">
              {transferApps[activeAppIndex].examples.map((ex, i) => (
                <li key={i}>• {ex}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-xl p-3 mb-4">
          <h4 className="text-sm font-semibold text-pink-400 mb-2">Industry Leaders</h4>
          <div className="flex flex-wrap gap-2">
            {transferApps[activeAppIndex].companies.map((company, i) => (
              <span key={i} className="px-3 py-1 bg-slate-800 rounded-full text-slate-300 text-sm">
                {company}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-3">
          <h4 className="text-sm font-semibold text-blue-400 mb-2">Future Impact</h4>
          <p className="text-slate-400 text-sm">{transferApps[activeAppIndex].futureImpact}</p>
        </div>

        {!completedApps.has(activeAppIndex) && (
          <button
            onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppIndex); }}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors w-full"
          >
            ✓ Mark as Understood
          </button>
        )}
      </div>

      {/* Progress */}
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
          className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-yellow-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-yellow-500 transition-all duration-300"
        >
          Take the Knowledge Test →
        </button>
      )}
    </div>
  );

  const renderTest = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>Knowledge Assessment</h2>

      {!showTestResults ? (
        <div className="space-y-4 max-w-2xl w-full">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-slate-400 text-sm italic mb-2">{q.scenario}</p>
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
                        ? 'bg-amber-600 text-white'
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
              onGameEvent?.({ type: 'test_completed', data: { score: calculateScore() } });
            }}
            disabled={testAnswers.includes(-1)}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              testAnswers.includes(-1)
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white hover:from-amber-500 hover:to-yellow-500'
            }`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="max-w-2xl w-full">
          <div className="bg-slate-800/50 rounded-2xl p-6 text-center mb-6">
            <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🎉' : '📚'}</div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Score: {calculateScore()}/10
            </h3>
            <p className="text-slate-300 mb-6">
              {calculateScore() >= 7
                ? 'Excellent! You\'ve mastered Simple Harmonic Motion!'
                : 'Keep studying! Review the concepts and try again.'}
            </p>

            {calculateScore() >= 7 ? (
              <button
                onMouseDown={(e) => { e.preventDefault(); goToPhase(9); }}
                className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
              >
                Claim Your Mastery Badge →
              </button>
            ) : (
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowTestResults(false);
                  setTestAnswers(Array(10).fill(-1));
                  goToPhase(3);
                }}
                className="px-8 py-4 bg-gradient-to-r from-amber-600 to-yellow-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-yellow-500 transition-all duration-300"
              >
                Review & Try Again
              </button>
            )}
          </div>

          {/* Show explanations */}
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-slate-300">Review Answers:</h4>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = q.options[userAnswer]?.correct;
              return (
                <div key={qIndex} className={`p-4 rounded-xl ${isCorrect ? 'bg-emerald-900/30 border border-emerald-600' : 'bg-red-900/30 border border-red-600'}`}>
                  <p className="text-sm text-slate-400 mb-1">Q{qIndex + 1}: {q.question}</p>
                  <p className={`text-sm ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                    Your answer: {q.options[userAnswer]?.text}
                  </p>
                  {!isCorrect && (
                    <p className="text-sm text-emerald-400">
                      Correct: {q.options.find(o => o.correct)?.text}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-2">{q.explanation}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6 text-center">
      <div className="bg-gradient-to-br from-amber-900/50 via-yellow-900/50 to-orange-900/50 rounded-3xl p-6 md:p-8 max-w-2xl">
        <div className="text-7xl md:text-8xl mb-6">⏱️</div>
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-white mb-4`}>
          Simple Harmonic Motion Master!
        </h1>
        <p className="text-lg md:text-xl text-slate-300 mb-6">
          You've mastered the fundamental physics of oscillations and waves!
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-3">
            <div className="text-2xl mb-1">📐</div>
            <p className="text-xs text-slate-300">Period Formula</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3">
            <div className="text-2xl mb-1">⚡</div>
            <p className="text-xs text-slate-300">Energy Conservation</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3">
            <div className="text-2xl mb-1">📊</div>
            <p className="text-xs text-slate-300">Sine Waves</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3">
            <div className="text-2xl mb-1">⏰</div>
            <p className="text-xs text-slate-300">Timekeeping</p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setPhase(0);
              setShowPredictionFeedback(false);
              setSelectedPrediction(null);
              setTwistPrediction(null);
              setShowTwistFeedback(false);
              setTestAnswers(Array(10).fill(-1));
              setShowTestResults(false);
              setCompletedApps(new Set());
              onGameEvent?.({ type: 'mastery_achieved', data: {} });
            }}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
          >
            ↺ Explore Again
          </button>
        </div>
      </div>
    </div>
  );

  // Gold standard: Numeric phase labels (0-9)
  const phaseLabels: Record<number, string> = {
    0: 'Hook',
    1: 'Predict',
    2: 'Explore',
    3: 'Review',
    4: 'Twist',
    5: 'Twist Lab',
    6: 'Discovery',
    7: 'Apply',
    8: 'Test',
    9: 'Mastery'
  };

  const phases: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/3 rounded-full blur-3xl" />

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-slate-400`}>
            Simple Harmonic Motion
          </span>
          {/* Premium phase dots */}
          <div className="flex items-center gap-1.5">
            {phases.map((p, i) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-amber-400 w-6 shadow-lg shadow-amber-400/30'
                    : phases.indexOf(phase) > i
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-500`}>
            {phaseLabels[phase]}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 pt-14 pb-8">
        {phase === 0 && renderHook()}
        {phase === 1 && renderPredict()}
        {phase === 2 && renderPlay()}
        {phase === 3 && renderReview()}
        {phase === 4 && renderTwistPredict()}
        {phase === 5 && renderTwistPlay()}
        {phase === 6 && renderTwistReview()}
        {phase === 7 && renderTransfer()}
        {phase === 8 && renderTest()}
        {phase === 9 && renderMastery()}
      </div>
    </div>
  );
};

export default SimpleHarmonicMotionRenderer;
