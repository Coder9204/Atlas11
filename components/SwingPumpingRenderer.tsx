import React, { useState, useEffect, useCallback } from 'react';

interface SwingPumpingRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const realWorldApps = [
  {
    icon: '🔬',
    title: 'Parametric Amplifiers',
    short: 'Amplifying signals by pumping parameters',
    tagline: 'When changing conditions creates gain',
    description: 'Parametric amplifiers boost weak signals by periodically varying a circuit parameter like capacitance. The same physics that pumps a swing high applies to amplifying radio and quantum signals.',
    connection: 'Just as pumping a swing at twice its natural frequency adds energy, parametric amplifiers pump a circuit parameter at twice the signal frequency to achieve gain.',
    howItWorks: 'A varactor diode\'s capacitance is modulated by a pump signal at 2f. Energy transfers from pump to signal. In quantum systems, Josephson junctions provide parametric amplification near the quantum limit.',
    stats: [
      { value: '20dB', label: 'Typical gain', icon: '📈' },
      { value: '0.5K', label: 'Quantum noise temp', icon: '❄️' },
      { value: '10GHz', label: 'Operating frequency', icon: '📡' }
    ],
    examples: ['Radio telescopes', 'Quantum computing', 'Radar receivers', 'Satellite communications'],
    companies: ['Low Noise Factory', 'Quantum Microwave', 'CalTech', 'IBM Quantum'],
    futureImpact: 'Quantum-limited parametric amplifiers will enable the readout of millions of qubits needed for practical quantum computers.',
    color: '#8b5cf6'
  },
  {
    icon: '🛸',
    title: 'Space Tethers',
    short: 'Orbital maneuvers through momentum transfer',
    tagline: 'Climbing to orbit on a rope',
    description: 'Space tethers can change spacecraft orbits by exchanging momentum, similar to how a swinging person transfers energy. Electrodynamic tethers interact with Earth\'s magnetic field for propulsion.',
    connection: 'A rotating tether system acts like a giant swing. Timing the release of a payload at the right phase can boost or lower orbits, applying parametric resonance principles to orbital mechanics.',
    howItWorks: 'Rotating tethers spin to create centrifugal force. Payloads attach at one end, released at the top of rotation for a velocity boost. Electrodynamic tethers push against the magnetic field using induced current.',
    stats: [
      { value: '10km', label: 'Typical tether length', icon: '📏' },
      { value: '1km/s', label: 'Delta-V possible', icon: '🚀' },
      { value: '90%', label: 'Fuel savings potential', icon: '⛽' }
    ],
    examples: ['Orbital debris removal', 'Moon cargo delivery', 'Deorbit systems', 'Inter-orbital transfer'],
    companies: ['Tethers Unlimited', 'NASA', 'ESA', 'JAXA'],
    futureImpact: 'Spinning tether systems could dramatically reduce the cost of reaching orbit and enable affordable Mars missions by eliminating most chemical propellant.',
    color: '#3b82f6'
  },
  {
    icon: '⚡',
    title: 'MEMS Oscillators',
    short: 'Timing devices through mechanical resonance',
    tagline: 'Microscopic pendulums keeping time',
    description: 'MEMS oscillators use tiny mechanical structures vibrating at precise frequencies for timing in electronics. Parametric excitation helps maintain these oscillations with minimal power.',
    connection: 'MEMS resonators behave like miniature pendulums or swings. Parametric pumping at twice the resonant frequency sustains oscillation while filtering out noise at other frequencies.',
    howItWorks: 'Silicon microstructures resonate at MHz frequencies. Electrostatic actuation drives motion. Parametric excitation modulates spring constant. Phase-locked loops maintain frequency accuracy.',
    stats: [
      { value: '32kHz-100MHz', label: 'Frequency range', icon: '🎵' },
      { value: '1ppm', label: 'Frequency accuracy', icon: '🎯' },
      { value: '1uW', label: 'Power consumption', icon: '🔋' }
    ],
    examples: ['Smartphone timing', 'IoT sensors', 'Wearable devices', 'Automotive electronics'],
    companies: ['SiTime', 'Analog Devices', 'Microchip', 'Murata'],
    futureImpact: 'Parametrically pumped MEMS will enable atomic-clock-like accuracy in consumer devices, revolutionizing GPS, 5G timing, and distributed systems.',
    color: '#f59e0b'
  },
  {
    icon: '🌊',
    title: 'Wave Energy Converters',
    short: 'Harvesting ocean energy through resonance',
    tagline: 'Riding the waves for power',
    description: 'Wave energy devices use parametric resonance to efficiently extract power from ocean waves. Tuning the device to resonate with wave frequencies maximizes energy capture.',
    connection: 'Like pumping a swing in time with its motion, wave energy converters tune their natural frequency to match dominant wave periods. Parametric resonance can amplify the response.',
    howItWorks: 'Floating buoys or oscillating water columns resonate with wave periods. Power take-off systems convert mechanical motion to electricity. Active tuning adjusts to changing sea states.',
    stats: [
      { value: '2TW', label: 'Global wave power', icon: '🌊' },
      { value: '30%', label: 'Capture efficiency', icon: '📊' },
      { value: '100kW', label: 'Per device output', icon: '⚡' }
    ],
    examples: ['Pelamis wave farm', 'Oscillating buoys', 'Overtopping devices', 'Oscillating water columns'],
    companies: ['Ocean Power Technologies', 'Wello', 'CorPower', 'Carnegie Clean Energy'],
    futureImpact: 'Parametrically tuned wave farms will provide reliable baseload renewable energy to coastal communities, complementing wind and solar.',
    color: '#22c55e'
  }
];

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#ec4899',
  accentGlow: 'rgba(236, 72, 153, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  swing: '#f59e0b',
  person: '#3b82f6',
  energy: '#10b981',
};

interface SwingState {
  theta: number;
  omega: number;
  length: number;
  isPumping: boolean;
  pumpPhase: 'up' | 'down' | 'idle';
}

const SwingPumpingRenderer: React.FC<SwingPumpingRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [swing, setSwing] = useState<SwingState>({
    theta: 0.3,
    omega: 0,
    length: 1.5,
    isPumping: false,
    pumpPhase: 'idle',
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [maxAmplitude, setMaxAmplitude] = useState(0.3);

  // Game parameters
  const [pumpMode, setPumpMode] = useState<'none' | 'correct' | 'wrong'>('none');
  const [autoPump, setAutoPump] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistResult, setShowTwistResult] = useState(false);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
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

  // Physics constants
  const g = 9.81;
  const baseLength = 1.5;
  const pumpAmount = 0.2; // How much length changes during pump

  // Physics simulation with parametric pumping
  const updatePhysics = useCallback((dt: number, state: SwingState): SwingState => {
    // Parametric resonance: changing length at the right time adds energy
    let newLength = baseLength;
    let newPumpPhase: 'up' | 'down' | 'idle' = 'idle';

    if (pumpMode === 'correct' || (autoPump && pumpMode !== 'wrong')) {
      // Correct pumping: stand up (shorten) at extremes, squat (lengthen) at bottom
      if (Math.abs(state.theta) > 0.7 * Math.abs(maxAmplitude)) {
        // At extremes - stand up (shorten pendulum)
        newLength = baseLength - pumpAmount;
        newPumpPhase = 'up';
      } else if (Math.abs(state.theta) < 0.3 * Math.abs(maxAmplitude)) {
        // At bottom - squat down (lengthen pendulum)
        newLength = baseLength + pumpAmount;
        newPumpPhase = 'down';
      }
    } else if (pumpMode === 'wrong') {
      // Wrong pumping: opposite timing
      if (Math.abs(state.theta) > 0.7 * Math.abs(maxAmplitude)) {
        // At extremes - squat (wrong!)
        newLength = baseLength + pumpAmount;
        newPumpPhase = 'down';
      } else if (Math.abs(state.theta) < 0.3 * Math.abs(maxAmplitude)) {
        // At bottom - stand (wrong!)
        newLength = baseLength - pumpAmount;
        newPumpPhase = 'up';
      }
    }

    // Angular momentum conservation when length changes
    // L = m * r² * ω is conserved, so ω₂ = ω₁ * (r₁/r₂)²
    const lengthRatio = state.length / newLength;
    const newOmega = state.omega * lengthRatio * lengthRatio;

    // Equation of motion: d²θ/dt² = -(g/L)sin(θ)
    const alpha = -(g / newLength) * Math.sin(state.theta);
    const damping = 0.002;

    const omega = newOmega * (1 - damping) + alpha * dt;
    const theta = state.theta + omega * dt;

    // Track max amplitude
    if (Math.abs(theta) > maxAmplitude) {
      setMaxAmplitude(Math.abs(theta));
    }

    return {
      theta,
      omega,
      length: newLength,
      isPumping: newPumpPhase !== 'idle',
      pumpPhase: newPumpPhase,
    };
  }, [pumpMode, autoPump, maxAmplitude, g, baseLength, pumpAmount]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const dt = 0.016;
    const interval = setInterval(() => {
      setSwing(prev => updatePhysics(dt, prev));
      setTime(prev => prev + dt);
    }, 16);

    return () => clearInterval(interval);
  }, [isPlaying, updatePhysics]);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    setTime(0);
    setIsPlaying(false);
    setMaxAmplitude(0.3);
    setSwing({
      theta: 0.3,
      omega: 0,
      length: baseLength,
      isPumping: false,
      pumpPhase: 'idle',
    });
  }, [baseLength]);

  // Calculate energy
  const getEnergy = useCallback(() => {
    const m = 1;
    const v = swing.length * swing.omega;
    const KE = 0.5 * m * v * v;
    const PE = m * g * swing.length * (1 - Math.cos(swing.theta));
    return { KE, PE, total: KE + PE };
  }, [swing, g]);

  const predictions = [
    { id: 'always', label: 'Stand up at any time during the swing' },
    { id: 'bottom', label: 'Stand up when passing through the bottom' },
    { id: 'extremes', label: 'Stand up at the highest points (extremes)' },
    { id: 'never', label: 'Pumping doesn\'t work - you need a push' },
  ];

  const twistPredictions = [
    { id: 'stops', label: 'The swing will slow down and eventually stop' },
    { id: 'faster', label: 'The swing will speed up even more' },
    { id: 'same', label: 'No difference - timing doesn\'t matter' },
    { id: 'breaks', label: 'The swing motion becomes unstable' },
  ];

  const transferApplications = [
    {
      title: 'Earthquake Building Resonance',
      description: 'Some earthquake frequencies match building natural frequencies. The ground acts like a "pump" adding energy to the building\'s oscillation.',
      question: 'Why do some buildings survive earthquakes while neighbors collapse?',
      answer: 'Buildings with natural frequencies matching the earthquake\'s dominant frequency experience parametric resonance, amplifying oscillations. Engineers tune building frequencies to avoid common earthquake frequencies.',
    },
    {
      title: 'Laser Cooling of Atoms',
      description: 'Physicists use carefully timed laser pulses to remove energy from atoms, cooling them to near absolute zero - essentially "reverse pumping".',
      question: 'How is laser cooling related to swing pumping?',
      answer: 'Both involve transferring energy at specific phases of oscillation. In pumping, energy is added at the right time. In laser cooling, photon absorption and emission are timed to remove energy from atomic motion.',
    },
    {
      title: 'Surfboard Pumping',
      description: 'Surfers pump their boards to generate speed by shifting weight in sync with the wave - similar to pumping a swing but on a moving surface.',
      question: 'When should a surfer shift their weight to gain the most speed?',
      answer: 'Shift weight forward on the downward part of the pump and backward on the upward part. This matches the phase relationship of swing pumping - timing weight shifts to add energy to the wave-riding motion.',
    },
    {
      title: 'Radio Receivers',
      description: 'AM radio uses parametric amplification. A varying capacitor (like changing swing length) amplifies weak radio signals when varied at twice the signal frequency.',
      question: 'Why must the "pump" frequency be twice the signal frequency in parametric amplifiers?',
      answer: 'Just like standing twice per swing cycle (once at each extreme), the parametric pumping needs two energy inputs per oscillation cycle to constructively add energy at the right phase.',
    },
  ];

  const testQuestions = [
    {
      question: 'To pump a swing effectively, when should you stand up (raise your center of mass)?',
      options: [
        { text: 'When passing through the lowest point', correct: false },
        { text: 'At the highest points of the swing', correct: true },
        { text: 'Continuously throughout the motion', correct: false },
        { text: 'Only when moving forward', correct: false },
      ],
    },
    {
      question: 'Why does standing up at the extremes add energy to a swing?',
      options: [
        { text: 'You push against the air', correct: false },
        { text: 'Angular momentum conservation increases speed when radius decreases', correct: true },
        { text: 'Gravity pulls harder on a standing person', correct: false },
        { text: 'The chains become tighter', correct: false },
      ],
    },
    {
      question: 'What is "parametric resonance"?',
      options: [
        { text: 'Resonance that only works with certain parameters', correct: false },
        { text: 'Energy addition by periodically changing a system parameter', correct: true },
        { text: 'The natural frequency of a parametric equation', correct: false },
        { text: 'Resonance between two parameters of motion', correct: false },
      ],
    },
    {
      question: 'If you pump a swing at the wrong phase (stand at bottom, squat at extremes), what happens?',
      options: [
        { text: 'The swing still speeds up, just more slowly', correct: false },
        { text: 'The swing slows down and loses energy', correct: true },
        { text: 'Nothing changes - timing doesn\'t matter', correct: false },
        { text: 'The swing becomes unstable', correct: false },
      ],
    },
    {
      question: 'How many times should you pump (stand and squat) per complete swing cycle?',
      options: [
        { text: 'Once per cycle', correct: false },
        { text: 'Twice per cycle (once at each extreme)', correct: true },
        { text: 'Four times per cycle', correct: false },
        { text: 'Continuously throughout', correct: false },
      ],
    },
    {
      question: 'What physical principle explains why shortening the pendulum increases angular velocity?',
      options: [
        { text: 'Energy conservation', correct: false },
        { text: 'Conservation of angular momentum (L = Iω)', correct: true },
        { text: 'Newton\'s third law', correct: false },
        { text: 'Conservation of linear momentum', correct: false },
      ],
    },
    {
      question: 'Why do children learn to pump swings without understanding physics?',
      options: [
        { text: 'They have natural physics intuition', correct: false },
        { text: 'Trial and error reinforces the correct phase relationship', correct: true },
        { text: 'Adults teach them the correct timing', correct: false },
        { text: 'Swings are designed to enforce correct pumping', correct: false },
      ],
    },
    {
      question: 'In parametric oscillators, energy is typically added at what frequency relative to natural oscillation?',
      options: [
        { text: 'Same frequency', correct: false },
        { text: 'Twice the natural frequency', correct: true },
        { text: 'Half the natural frequency', correct: false },
        { text: 'Any frequency works', correct: false },
      ],
    },
    {
      question: 'What limits how high a pumped swing can go?',
      options: [
        { text: 'The swing can only go up to 90 degrees', correct: false },
        { text: 'Air resistance and energy lost each cycle exceed energy added', correct: true },
        { text: 'The chains become too tense', correct: false },
        { text: 'Human legs can only push so hard', correct: false },
      ],
    },
    {
      question: 'Which everyday action is most similar to swing pumping?',
      options: [
        { text: 'Bouncing on a trampoline', correct: false },
        { text: 'Walking up stairs', correct: false },
        { text: 'Pumping a skateboard on a halfpipe', correct: true },
        { text: 'Jumping rope', correct: false },
      ],
    },
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  const renderVisualization = (interactive: boolean) => {
    const width = 500;
    const height = 420;
    const pivotY = 70;
    const scale = 110;

    // Calculate swing position
    const swingLength = swing.length * scale;
    const seatX = width / 2 + swingLength * Math.sin(swing.theta);
    const seatY = pivotY + swingLength * Math.cos(swing.theta);

    // Person dimensions based on pump phase
    const isStanding = swing.pumpPhase === 'up';
    const personHeight = isStanding ? 55 : 38;

    // Energy display
    const energy = getEnergy();
    const maxPossibleEnergy = energy.total * 3; // Scale for display
    const energyPercent = Math.min(100, 100 * energy.total / maxPossibleEnergy);

    // Calculate swing angle for visual feedback
    const angleInDegrees = swing.theta * 180 / Math.PI;
    const maxAngleDegrees = maxAmplitude * 180 / Math.PI;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: colors.bgDark, borderRadius: '12px', maxWidth: '550px' }}
        >
          {/* === COMPREHENSIVE DEFS SECTION === */}
          <defs>
            {/* Premium sky gradient with 6 color stops for depth */}
            <linearGradient id="swpmpSkyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0c1929" />
              <stop offset="20%" stopColor="#122136" />
              <stop offset="40%" stopColor="#1a2f4a" />
              <stop offset="60%" stopColor="#162842" />
              <stop offset="80%" stopColor="#0f1f35" />
              <stop offset="100%" stopColor="#0a1628" />
            </linearGradient>

            {/* Premium metal frame gradient with depth */}
            <linearGradient id="swpmpFrameMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="25%" stopColor="#475569" />
              <stop offset="50%" stopColor="#5a6a7d" />
              <stop offset="75%" stopColor="#3d4c5e" />
              <stop offset="100%" stopColor="#2d3a4a" />
            </linearGradient>

            {/* Frame highlight gradient */}
            <linearGradient id="swpmpFrameHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="30%" stopColor="#64748b" />
              <stop offset="70%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Chain metal gradient */}
            <linearGradient id="swpmpChainMetal" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#71717a" />
              <stop offset="30%" stopColor="#a1a1aa" />
              <stop offset="50%" stopColor="#d4d4d8" />
              <stop offset="70%" stopColor="#a1a1aa" />
              <stop offset="100%" stopColor="#71717a" />
            </linearGradient>

            {/* Premium swing seat gradient with wood effect */}
            <linearGradient id="swpmpSeatWood" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="25%" stopColor="#d97706" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>

            {/* Seat edge highlight */}
            <linearGradient id="swpmpSeatHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#92400e" stopOpacity="0.1" />
            </linearGradient>

            {/* Person body gradient - shirt */}
            <linearGradient id="swpmpShirtGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="30%" stopColor="#2563eb" />
              <stop offset="70%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>

            {/* Person pants gradient */}
            <linearGradient id="swpmpPantsGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Skin tone radial gradient for head */}
            <radialGradient id="swpmpSkinHead" cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="40%" stopColor="#fcd34d" />
              <stop offset="80%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </radialGradient>

            {/* Skin tone for hands */}
            <radialGradient id="swpmpSkinHand" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="60%" stopColor="#fcd34d" />
              <stop offset="100%" stopColor="#fbbf24" />
            </radialGradient>

            {/* Energy bar gradient */}
            <linearGradient id="swpmpEnergyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="40%" stopColor="#34d399" />
              <stop offset="60%" stopColor="#6ee7b7" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            {/* Amplitude indicator gradient */}
            <linearGradient id="swpmpAmplitudeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="50%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>

            {/* Ground gradient with depth */}
            <linearGradient id="swpmpGroundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="30%" stopColor="#1e293b" />
              <stop offset="70%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Shadow beneath swing */}
            <radialGradient id="swpmpSwingShadow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#000000" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#000000" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>

            {/* Pump indicator glow (stand - green) */}
            <radialGradient id="swpmpStandGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
              <stop offset="40%" stopColor="#10b981" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>

            {/* Pump indicator glow (squat - orange) */}
            <radialGradient id="swpmpSquatGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="1" />
              <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>

            {/* === GLOW FILTERS === */}
            {/* Soft glow filter for energy effects */}
            <filter id="swpmpSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Strong glow filter for indicators */}
            <filter id="swpmpStrongGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Subtle shadow filter */}
            <filter id="swpmpDropShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="shadow" />
              <feOffset dx="2" dy="2" in="shadow" result="offsetShadow" />
              <feMerge>
                <feMergeNode in="offsetShadow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Metal shine filter */}
            <filter id="swpmpMetalShine" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* === BACKGROUND === */}
          <rect width={width} height={height} fill="url(#swpmpSkyGradient)" />

          {/* Subtle grid pattern for depth */}
          <pattern id="swpmpGrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <rect width="30" height="30" fill="none" stroke="#1e3a5f" strokeWidth="0.3" strokeOpacity="0.3" />
          </pattern>
          <rect width={width} height={height - 50} fill="url(#swpmpGrid)" />

          {/* === SWING FRAME STRUCTURE === */}
          <g filter="url(#swpmpDropShadow)">
            {/* Left A-frame leg */}
            <polygon
              points={`${width/2 - 8},${pivotY - 5} ${width/2 - 75},${pivotY + 45} ${width/2 - 65},${pivotY + 45}`}
              fill="url(#swpmpFrameMetal)"
              stroke="#64748b"
              strokeWidth="1"
            />
            {/* Right A-frame leg */}
            <polygon
              points={`${width/2 + 8},${pivotY - 5} ${width/2 + 75},${pivotY + 45} ${width/2 + 65},${pivotY + 45}`}
              fill="url(#swpmpFrameMetal)"
              stroke="#64748b"
              strokeWidth="1"
            />

            {/* Cross beam (top bar) */}
            <rect x={width/2 - 85} y={pivotY + 38} width={170} height={10} rx={3} fill="url(#swpmpFrameHighlight)" stroke="#475569" strokeWidth="1" />

            {/* Frame feet (stabilizers) */}
            <rect x={width/2 - 80} y={pivotY + 45} width={25} height={6} rx={2} fill="#475569" />
            <rect x={width/2 + 55} y={pivotY + 45} width={25} height={6} rx={2} fill="#475569" />

            {/* Top pivot assembly */}
            <rect x={width/2 - 25} y={pivotY - 15} width={50} height={20} rx={5} fill="url(#swpmpFrameMetal)" stroke="#64748b" strokeWidth="1" />
            <ellipse cx={width/2} cy={pivotY} rx={12} ry={8} fill="#334155" stroke="#475569" strokeWidth="1.5" />
            <circle cx={width/2} cy={pivotY} r={5} fill="#1e293b" stroke="#64748b" strokeWidth="1" />
          </g>

          {/* === SWING CHAINS === */}
          <g filter="url(#swpmpMetalShine)">
            {/* Left chain */}
            <line
              x1={width/2 - 12} y1={pivotY + 2}
              x2={seatX - 12} y2={seatY - 3}
              stroke="url(#swpmpChainMetal)"
              strokeWidth={4}
              strokeLinecap="round"
            />
            <line
              x1={width/2 - 12} y1={pivotY + 2}
              x2={seatX - 12} y2={seatY - 3}
              stroke="#d4d4d8"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeDasharray="8 6"
            />

            {/* Right chain */}
            <line
              x1={width/2 + 12} y1={pivotY + 2}
              x2={seatX + 12} y2={seatY - 3}
              stroke="url(#swpmpChainMetal)"
              strokeWidth={4}
              strokeLinecap="round"
            />
            <line
              x1={width/2 + 12} y1={pivotY + 2}
              x2={seatX + 12} y2={seatY - 3}
              stroke="#d4d4d8"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeDasharray="8 6"
            />
          </g>

          {/* === SWING SEAT === */}
          <g transform={`translate(${seatX}, ${seatY})`}>
            {/* Seat shadow */}
            <ellipse cx={0} cy={8} rx={22} ry={5} fill="rgba(0,0,0,0.3)" />

            {/* Main seat */}
            <rect x={-20} y={-5} width={40} height={10} rx={3} fill="url(#swpmpSeatWood)" stroke="#92400e" strokeWidth="1" />

            {/* Seat highlight */}
            <rect x={-18} y={-4} width={36} height={4} rx={2} fill="url(#swpmpSeatHighlight)" />

            {/* Seat texture lines */}
            <line x1={-15} y1={-3} x2={-15} y2={4} stroke="#92400e" strokeWidth="0.5" strokeOpacity="0.5" />
            <line x1={-5} y1={-3} x2={-5} y2={4} stroke="#92400e" strokeWidth="0.5" strokeOpacity="0.5" />
            <line x1={5} y1={-3} x2={5} y2={4} stroke="#92400e" strokeWidth="0.5" strokeOpacity="0.5" />
            <line x1={15} y1={-3} x2={15} y2={4} stroke="#92400e" strokeWidth="0.5" strokeOpacity="0.5" />
          </g>

          {/* === PERSON ON SWING === */}
          <g transform={`translate(${seatX}, ${seatY})`}>
            {/* Person shadow on ground */}
            <ellipse
              cx={0}
              cy={height - seatY - 35}
              rx={25 + Math.abs(swing.theta) * 10}
              ry={8}
              fill="url(#swpmpSwingShadow)"
            />

            {/* Legs */}
            <rect x={-10} y={-personHeight + 18} width={8} height={personHeight - 16} rx={3} fill="url(#swpmpPantsGradient)" />
            <rect x={2} y={-personHeight + 18} width={8} height={personHeight - 16} rx={3} fill="url(#swpmpPantsGradient)" />

            {/* Shoes */}
            <ellipse cx={-6} cy={2} rx={6} ry={4} fill="#1e293b" />
            <ellipse cx={6} cy={2} rx={6} ry={4} fill="#1e293b" />

            {/* Body/Torso */}
            <rect x={-12} y={-personHeight - 8} width={24} height={28} rx={5} fill="url(#swpmpShirtGradient)" stroke="#1d4ed8" strokeWidth="0.5" />

            {/* Shirt collar detail */}
            <path
              d={`M -6 ${-personHeight - 8} Q 0 ${-personHeight - 3} 6 ${-personHeight - 8}`}
              fill="none"
              stroke="#1e40af"
              strokeWidth="2"
            />

            {/* Arms holding chains */}
            <line x1={-10} y1={-personHeight - 2} x2={-14} y2={-personHeight - 25} stroke="url(#swpmpSkinHand)" strokeWidth={5} strokeLinecap="round" />
            <line x1={10} y1={-personHeight - 2} x2={14} y2={-personHeight - 25} stroke="url(#swpmpSkinHand)" strokeWidth={5} strokeLinecap="round" />

            {/* Hands */}
            <circle cx={-14} cy={-personHeight - 27} r={4} fill="url(#swpmpSkinHand)" />
            <circle cx={14} cy={-personHeight - 27} r={4} fill="url(#swpmpSkinHand)" />

            {/* Head */}
            <circle cx={0} cy={-personHeight - 20} r={12} fill="url(#swpmpSkinHead)" stroke="#f59e0b" strokeWidth="0.5" />

            {/* Hair */}
            <ellipse cx={0} cy={-personHeight - 28} rx={10} ry={6} fill="#451a03" />

            {/* Face details */}
            <circle cx={-4} cy={-personHeight - 22} r={1.5} fill="#1e293b" /> {/* Left eye */}
            <circle cx={4} cy={-personHeight - 22} r={1.5} fill="#1e293b" /> {/* Right eye */}
            <path
              d={`M -3 ${-personHeight - 16} Q 0 ${-personHeight - 14} 3 ${-personHeight - 16}`}
              fill="none"
              stroke="#92400e"
              strokeWidth="1.5"
              strokeLinecap="round"
            /> {/* Smile */}
          </g>

          {/* === PUMP INDICATOR === */}
          {swing.isPumping && (
            <g transform={`translate(${seatX + 55}, ${seatY - personHeight - 10})`}>
              {/* Glow background */}
              <circle
                cx={0} cy={0} r={25}
                fill={swing.pumpPhase === 'up' ? 'url(#swpmpStandGlow)' : 'url(#swpmpSquatGlow)'}
                filter="url(#swpmpStrongGlow)"
              />

              {/* Indicator box */}
              <rect
                x={-35} y={-12}
                width={70} height={24}
                rx={6}
                fill={swing.pumpPhase === 'up' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(245, 158, 11, 0.9)'}
                stroke={swing.pumpPhase === 'up' ? '#34d399' : '#fbbf24'}
                strokeWidth="2"
              />

              {/* Arrow and text */}
              <text
                x={0}
                y={5}
                textAnchor="middle"
                fill="white"
                fontSize={14}
                fontWeight="bold"
                fontFamily="system-ui, sans-serif"
              >
                {swing.pumpPhase === 'up' ? '↑ STAND' : '↓ SQUAT'}
              </text>
            </g>
          )}

          {/* === GROUND === */}
          <rect x={0} y={height - 50} width={width} height={50} fill="url(#swpmpGroundGradient)" />

          {/* Ground texture */}
          <ellipse cx={width/2} cy={height - 50} rx={120} ry={15} fill="#334155" />
          <ellipse cx={width/2} cy={height - 48} rx={100} ry={10} fill="#3d4c5e" />

          {/* Grass tufts */}
          {[80, 150, 200, 300, 350, 420].map((x, i) => (
            <g key={i} transform={`translate(${x}, ${height - 50})`}>
              <path d="M0,0 Q-3,-8 -1,-12 M0,0 Q0,-10 1,-14 M0,0 Q3,-8 2,-11" stroke="#166534" strokeWidth="1.5" fill="none" />
            </g>
          ))}

          {/* === ENERGY/AMPLITUDE INDICATOR PANEL === */}
          <g transform={`translate(15, ${height - 45})`}>
            {/* Panel background */}
            <rect x={0} y={0} width={180} height={40} rx={8} fill="rgba(15, 23, 42, 0.9)" stroke="#334155" strokeWidth="1" />

            {/* Energy section */}
            <text x={10} y={14} fill={colors.textMuted} fontSize={10} fontWeight="bold" fontFamily="system-ui, sans-serif">ENERGY</text>
            <rect x={10} y={18} width={75} height={12} rx={4} fill="rgba(255,255,255,0.1)" />
            <rect
              x={10} y={18}
              width={Math.max(5, 75 * energyPercent / 100)}
              height={12}
              rx={4}
              fill="url(#swpmpEnergyGradient)"
              filter="url(#swpmpSoftGlow)"
            />

            {/* Amplitude section */}
            <text x={95} y={14} fill={colors.textMuted} fontSize={10} fontWeight="bold" fontFamily="system-ui, sans-serif">AMPLITUDE</text>
            <rect x={95} y={18} width={75} height={12} rx={4} fill="rgba(255,255,255,0.1)" />
            <rect
              x={95} y={18}
              width={Math.max(5, Math.min(75, maxAngleDegrees * 1.5))}
              height={12}
              rx={4}
              fill="url(#swpmpAmplitudeGradient)"
              filter="url(#swpmpSoftGlow)"
            />
          </g>

          {/* === ANGLE/STATS DISPLAY === */}
          <g transform={`translate(${width - 120}, ${height - 45})`}>
            <rect x={0} y={0} width={105} height={40} rx={8} fill="rgba(15, 23, 42, 0.9)" stroke="#334155" strokeWidth="1" />

            <text x={10} y={16} fill={colors.textSecondary} fontSize={11} fontFamily="system-ui, sans-serif">
              Angle: <tspan fill={colors.textPrimary} fontWeight="bold">{angleInDegrees.toFixed(1)}°</tspan>
            </text>
            <text x={10} y={32} fill={colors.textSecondary} fontSize={11} fontFamily="system-ui, sans-serif">
              Max: <tspan fill="#f472b6" fontWeight="bold">{maxAngleDegrees.toFixed(0)}°</tspan>
            </text>
          </g>

          {/* === TITLE LABEL === */}
          <text
            x={width/2} y={25}
            textAnchor="middle"
            fill={colors.textPrimary}
            fontSize={16}
            fontWeight="bold"
            fontFamily="system-ui, sans-serif"
            opacity={0.9}
          >
            Swing Pumping Simulation
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isPlaying ? colors.error : colors.success,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={resetSimulation}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Pumping Mode:
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { mode: 'none' as const, label: 'No Pumping' },
            { mode: 'correct' as const, label: 'Correct Timing' },
            { mode: 'wrong' as const, label: 'Wrong Timing' },
          ].map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => {
                setPumpMode(mode);
                resetSimulation();
              }}
              style={{
                padding: '10px 16px',
                borderRadius: '6px',
                border: 'none',
                background: pumpMode === mode ? colors.accent : 'rgba(255,255,255,0.1)',
                color: pumpMode === mode ? 'white' : colors.textSecondary,
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        background: 'rgba(236, 72, 153, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', marginBottom: '4px' }}>
          Time: {time.toFixed(1)}s
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          {pumpMode === 'correct' && 'Energy is being added! Watch the amplitude grow.'}
          {pumpMode === 'wrong' && 'Energy is being removed! Watch the amplitude shrink.'}
          {pumpMode === 'none' && 'Swing oscillates with slight damping.'}
        </div>
      </div>
    </div>
  );

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: `1px solid rgba(255,255,255,0.1)`,
      display: 'flex',
      justifyContent: 'flex-end',
      zIndex: 1000,
    }}>
      <button
        onClick={onPhaseComplete}
        disabled={disabled && !canProceed}
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              🎢 The Self-Propelled Swing
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              How do you pump a swing higher without anyone pushing?
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Every child learns to pump a swing - stand, squat, stand, squat. But why does this work?
                No one pushes you, yet you go higher and higher!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                The secret lies in precise timing and a physics principle called parametric resonance.
              </p>
            </div>

            <div style={{
              background: 'rgba(236, 72, 153, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                💡 Can you figure out when you should stand up to go higher?
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction →')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>📋 What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A person on a swing. They can stand up (raise their center of mass) or squat down
              (lower it). The energy bar shows the total mechanical energy in the swing system.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              🤔 To pump the swing higher, when should you stand up?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(236, 72, 153, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction →')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Swing Pumping</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Compare correct vs wrong timing to see parametric resonance in action
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>🔬 Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>"No Pumping" - natural oscillation with damping</li>
              <li>"Correct Timing" - stand at extremes, squat at bottom</li>
              <li>"Wrong Timing" - the opposite (energy removed!)</li>
              <li>Watch the amplitude and energy bar change</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review →')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'extremes';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? '✓ Correct!' : '✗ Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              You should stand up at the highest points (extremes) of the swing!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🎓 The Physics of Pumping</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Angular Momentum Conservation:</strong> When
                you stand up (shorten the pendulum), angular momentum L = Iω must stay constant. Since
                I decreases (closer to pivot), ω must increase - you speed up!
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Why at the Extremes?</strong> At the extremes,
                you have maximum potential energy. Standing up converts some gravitational PE into kinetic
                energy. At the bottom, you already have max KE - squatting stores energy for the next pump.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Parametric Resonance:</strong> This is called
                parametric pumping because you change a parameter (length) at twice the natural frequency
                to add energy with each cycle.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist! →')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>🔄 The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What if you pump with exactly wrong timing?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>📋 The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Instead of standing at the extremes and squatting at the bottom, imagine doing
              the exact opposite: squat at the extremes, stand at the bottom.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              🤔 What happens with this reversed timing?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction →')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Wrong Timing</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Compare correct timing vs wrong timing and observe the energy changes
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>💡 Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Watch what happens to the amplitude with "Wrong Timing" - you're actually
              removing energy from the system! This is called parametric damping.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation →')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'stops';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? '✓ Correct!' : '✗ Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Wrong timing causes the swing to slow down and lose energy!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>🔬 Parametric Damping</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Phase Matters:</strong> When you do work
                against the motion instead of with it, you remove energy. Standing at the bottom means
                your muscle work fights the swing's motion rather than enhancing it.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Practical Application:</strong> This principle
                is used in vibration damping. By changing stiffness at the right phase, engineers can
                remove unwanted oscillations from structures.
              </p>
              <p>
                This is why children quickly learn the correct timing - wrong timing feels "off" because
                you're working against the natural motion!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge →')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              🌍 Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Parametric resonance appears in surprising places
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
              Complete all 4 applications to unlock the test
            </p>
          </div>

          {transferApplications.map((app, index) => (
            <div
              key={index}
              style={{
                background: colors.bgCard,
                margin: '16px',
                padding: '16px',
                borderRadius: '12px',
                border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
                {transferCompleted.has(index) && (
                  <span style={{ color: colors.success }}>✓</span>
                )}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>
                {app.description}
              </p>
              <div style={{
                background: 'rgba(236, 72, 153, 0.1)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '8px',
              }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                  💭 {app.question}
                </p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: `1px solid ${colors.accent}`,
                    background: 'transparent',
                    color: colors.accent,
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Reveal Answer
                </button>
              ) : (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '12px',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${colors.success}`,
                }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test →')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 8 ? '🎉 Excellent!' : '📚 Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>
                {testScore} / 10
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You\'ve mastered parametric resonance!' : 'Review the material and try again.'}
              </p>
            </div>

            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;

              return (
                <div
                  key={qIndex}
                  style={{
                    background: colors.bgCard,
                    margin: '16px',
                    padding: '16px',
                    borderRadius: '12px',
                    borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
                  }}
                >
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>
                    {qIndex + 1}. {q.question}
                  </p>
                  {q.options.map((opt, oIndex) => (
                    <div
                      key={oIndex}
                      style={{
                        padding: '8px 12px',
                        marginBottom: '4px',
                        borderRadius: '6px',
                        background: opt.correct
                          ? 'rgba(16, 185, 129, 0.2)'
                          : userAnswer === oIndex
                          ? 'rgba(239, 68, 68, 0.2)'
                          : 'transparent',
                        color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary,
                      }}
                    >
                      {opt.correct ? '✓' : userAnswer === oIndex ? '✗' : '○'} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery →' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>
                {currentTestQuestion + 1} / {testQuestions.length}
              </span>
            </div>

            <div style={{
              display: 'flex',
              gap: '4px',
              marginBottom: '24px',
            }}>
              {testQuestions.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentTestQuestion(i)}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: testAnswers[i] !== null
                      ? colors.accent
                      : i === currentTestQuestion
                      ? colors.textMuted
                      : 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>

            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>
                {currentQ.question}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button
                  key={oIndex}
                  onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: testAnswers[currentTestQuestion] === oIndex
                      ? `2px solid ${colors.accent}`
                      : '1px solid rgba(255,255,255,0.2)',
                    background: testAnswers[currentTestQuestion] === oIndex
                      ? 'rgba(236, 72, 153, 0.2)'
                      : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.textMuted}`,
                background: 'transparent',
                color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              ← Previous
            </button>

            {currentTestQuestion < testQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={submitTest}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null) ? colors.textMuted : colors.success,
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
              You've mastered parametric resonance and swing pumping
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🎓 Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Parametric resonance through parameter variation</li>
              <li>Angular momentum conservation in pumping</li>
              <li>Correct phase timing for energy addition</li>
              <li>Parametric damping with wrong phase</li>
              <li>Applications from swings to radio amplifiers</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(236, 72, 153, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🚀 Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Parametric amplification is used in quantum computing to amplify
              signals without adding noise, in MEMS accelerometers for smartphones,
              and even proposed for spacecraft propulsion using solar sails with
              oscillating tilt!
            </p>
          </div>

          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game →')}
      </div>
    );
  }

  return null;
};

export default SwingPumpingRenderer;
