import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

interface TunedMassDamperRendererProps {
  phase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  gamePhase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#e2e8f0', // Changed from #94a3b8 for better contrast (brightness >= 180)
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f97316',
  accentGlow: 'rgba(249, 115, 22, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  building: '#3b82f6',
  damper: '#ef4444',
  ground: '#475569',
};

const realWorldApps = [
  {
    icon: '🏙️',
    title: 'Taipei 101 Pendulum',
    short: 'World\'s largest tuned mass damper',
    tagline: 'A 730-ton ball of stability',
    description: 'Taipei 101 houses a 730-ton steel sphere suspended between the 87th and 92nd floors. During typhoons, it swings up to 1.5 meters, visibly counteracting building sway and reducing movement by 40%.',
    connection: 'The pendulum\'s natural frequency is tuned to match the building\'s resonant frequency. When the building sways right, the mass swings left, canceling the motion.',
    howItWorks: 'Eight steel cables suspend the sphere, with hydraulic dampers controlling its motion. The mass absorbs energy from building oscillations, converting kinetic energy to heat.',
    stats: [
      { value: '730t', label: 'Damper mass', icon: '⚖️' },
      { value: '40%', label: 'Motion reduction', icon: '📉' },
      { value: '1.5m', label: 'Max swing', icon: '📏' }
    ],
    examples: ['Taipei 101', 'Shanghai Tower', 'One WTC', 'Citigroup Center'],
    companies: ['Motioneering', 'Thornton Tomasetti', 'RWDI', 'Arup'],
    futureImpact: 'Active mass dampers with AI control will respond before vibrations build up.',
    color: '#3B82F6'
  },
  {
    icon: '🌉',
    title: 'Bridge Vibration Control',
    short: 'Stopping dangerous oscillations',
    tagline: 'Learning from Tacoma Narrows',
    description: 'After the Tacoma Narrows collapse, engineers added tuned mass dampers to vulnerable bridges. The Millennium Bridge in London required emergency dampers after pedestrians caused dangerous swaying.',
    connection: 'Bridges have resonant frequencies that can match wind gusts or footsteps. TMDs absorb energy at these specific frequencies.',
    howItWorks: 'Multiple smaller TMDs target different vibration modes. Pendulum dampers suit vertical oscillations; horizontal dampers address lateral sway. Passive systems require no power.',
    stats: [
      { value: '37', label: 'Millennium Bridge TMDs', icon: '🔢' },
      { value: '2.5Hz', label: 'Walking frequency', icon: '👣' },
      { value: '90%', label: 'Vibration reduction', icon: '📉' }
    ],
    examples: ['Millennium Bridge', 'Solferino Footbridge', 'Pedro Arrupe Bridge', 'Suspension bridges'],
    companies: ['Gerb', 'Taylor Devices', 'Maurer', 'Freyssinet'],
    futureImpact: 'Shape-memory alloy dampers will self-tune to changing conditions.',
    color: '#10B981'
  },
  {
    icon: '⚡',
    title: 'Power Line Dampers',
    short: 'Preventing cable galloping',
    tagline: 'Those dumbbell shapes save lives',
    description: 'Stockbridge dampers on power lines prevent aeolian vibration and galloping - dangerous oscillations that can bring down lines. Each dumbbell-shaped damper is tuned to a specific span length.',
    connection: 'Wind creates vortex shedding that excites cables at their natural frequency. Damper weights oscillate out of phase, absorbing vibrational energy.',
    howItWorks: 'Weights on flexible messenger cables clamp to power lines. As the line vibrates, weights oscillate and dissipate energy through material hysteresis. Multiple dampers cover different frequency ranges.',
    stats: [
      { value: '5-150Hz', label: 'Damped frequency range', icon: '🎵' },
      { value: '90%', label: 'Fatigue reduction', icon: '📉' },
      { value: '50yr', label: 'Damper lifespan', icon: '⏰' }
    ],
    examples: ['Transmission lines', 'Guy wires', 'Cable-stayed bridges', 'Aerial cables'],
    companies: ['PLP', 'AFL', 'Preformed Line Products', 'Hubbell'],
    futureImpact: 'Smart dampers with sensors will report line health and predict failures.',
    color: '#F59E0B'
  },
  {
    icon: '🏭',
    title: 'Industrial Machinery',
    short: 'Smooth operation at any speed',
    tagline: 'Killing vibration at the source',
    description: 'Rotating machinery like turbines, compressors, and engines use dynamic absorbers to prevent resonance at operating speeds. Without damping, vibration destroys bearings and structures.',
    connection: 'Machinery passes through resonant frequencies during startup. TMDs prevent damage during these critical transitions.',
    howItWorks: 'Absorbers mount directly on vibrating components. Spring-mass systems are tuned to problematic frequencies. Viscous or friction dampers dissipate energy.',
    stats: [
      { value: '±3%', label: 'Tuning precision needed', icon: '🎯' },
      { value: '10x', label: 'Bearing life extension', icon: '⏰' },
      { value: '30dB', label: 'Vibration reduction', icon: '📉' }
    ],
    examples: ['Gas turbines', 'Reciprocating compressors', 'Machine tools', 'Vehicle drivetrains'],
    companies: ['LORD', 'Vibracoustic', 'ContiTech', 'Trelleborg'],
    futureImpact: 'Active electromagnetic dampers will adapt in real-time to changing operating conditions.',
    color: '#8B5CF6'
  }
];

interface BuildingState {
  x: number;        // Building displacement
  v: number;        // Building velocity
  damperX: number;  // Damper displacement relative to building
  damperV: number;  // Damper velocity relative to building
}

const TunedMassDamperRenderer: React.FC<TunedMassDamperRendererProps> = ({
  phase: inputPhase,
  gamePhase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Normalize phase - default to hook for invalid phases
  // Accept both 'phase' and 'gamePhase' props for compatibility
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const externalPhase = gamePhase || inputPhase;
  const normalizedInputPhase: Phase | null = externalPhase && validPhases.includes(externalPhase as Phase) ? externalPhase as Phase : null;

  // Internal phase management for self-managing navigation
  const [internalPhase, setInternalPhase] = useState<Phase>('hook');
  // Use external prop if explicitly provided (for testing), otherwise use internal state
  const phase = normalizedInputPhase || internalPhase;

  // Simulation state
  const [building, setBuilding] = useState<BuildingState>({
    x: 0,
    v: 0,
    damperX: 0,
    damperV: 0,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);

  // Game parameters
  const [damperEnabled, setDamperEnabled] = useState(true);
  const [earthquakeFreq, setEarthquakeFreq] = useState(0.7);
  const [earthquakeAmplitude, setEarthquakeAmplitude] = useState(0.5);
  const [damperTuning, setDamperTuning] = useState(0.8); // 1.0 = perfectly tuned

  // Max amplitude tracking
  const [maxBuildingAmplitude, setMaxBuildingAmplitude] = useState(0);

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
  const [currentTransferApp, setCurrentTransferApp] = useState(0);

  // Physics constants
  const buildingMass = 1000;  // Building mass
  const damperMass = 50;      // ~5% of building mass
  const buildingK = 1000;     // Building stiffness
  const damperK = buildingK * (damperMass / buildingMass) * damperTuning; // Tuned spring constant
  const buildingC = 10;       // Building damping
  const damperC = 20;         // Damper damping

  // Use refs to avoid infinite re-render loops in animation
  const maxBuildingAmplitudeRef = useRef(0);
  const timeRef = useRef(0);

  // Physics simulation
  const updatePhysics = useCallback((dt: number, state: BuildingState, t: number): BuildingState => {
    // Ground acceleration (earthquake)
    const groundAcc = earthquakeAmplitude * Math.sin(2 * Math.PI * earthquakeFreq * t);

    // Building equation of motion
    let buildingAcc = -buildingK / buildingMass * state.x - buildingC / buildingMass * state.v;
    buildingAcc += groundAcc;

    // Add damper force to building (reaction force)
    if (damperEnabled) {
      const damperForce = damperK * state.damperX + damperC * state.damperV;
      buildingAcc += damperForce / buildingMass;
    }

    // Damper equation of motion (relative to building)
    let damperAcc = 0;
    if (damperEnabled) {
      damperAcc = -damperK / damperMass * state.damperX - damperC / damperMass * state.damperV;
      damperAcc -= buildingAcc; // Pseudo-force from building acceleration
    }

    // Integration
    const newV = state.v + buildingAcc * dt;
    const newX = state.x + newV * dt;
    const newDamperV = state.damperV + damperAcc * dt;
    const newDamperX = state.damperX + newDamperV * dt;

    // Track max amplitude via ref to avoid dependency cycle
    if (Math.abs(newX) > maxBuildingAmplitudeRef.current) {
      maxBuildingAmplitudeRef.current = Math.abs(newX);
      setMaxBuildingAmplitude(Math.abs(newX));
    }

    return {
      x: newX,
      v: newV,
      damperX: newDamperX,
      damperV: newDamperV,
    };
  }, [earthquakeFreq, earthquakeAmplitude, damperEnabled, damperK, damperC, buildingK, buildingC, buildingMass, damperMass]);

  // Animation loop - use timeRef to avoid time in deps (prevents infinite re-mount cycle)
  useEffect(() => {
    if (!isPlaying) return;

    const dt = 0.01;
    const interval = setInterval(() => {
      timeRef.current += dt;
      setBuilding(prev => updatePhysics(dt, prev, timeRef.current));
      setTime(timeRef.current);
    }, 10);

    return () => clearInterval(interval);
  }, [isPlaying, updatePhysics]);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    timeRef.current = 0;
    maxBuildingAmplitudeRef.current = 0;
    setTime(0);
    setIsPlaying(false);
    setMaxBuildingAmplitude(0);
    setBuilding({
      x: 0,
      v: 0,
      damperX: 0,
      damperV: 0,
    });
  }, []);

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

  const predictions = [
    { id: 'amplify', label: 'The heavy mass makes the building shake more' },
    { id: 'reduce', label: 'The heavy mass reduces the building\'s shaking' },
    { id: 'nothing', label: 'The mass doesn\'t affect the building at all' },
    { id: 'break', label: 'The mass crashes through the floor' },
  ];

  const twistPredictions = [
    { id: 'worse', label: 'The damper makes building motion worse' },
    { id: 'same', label: 'The damper still works equally well' },
    { id: 'less', label: 'The damper is less effective but still helps' },
    { id: 'no_effect', label: 'The damper stops working entirely' },
  ];

  const transferApplications = [
    {
      title: 'Taipei 101 Pendulum',
      description: 'Taipei 101 has a 730-ton steel sphere suspended as a tuned mass damper. It can sway over a meter during typhoons, visibly countering the building\'s motion.',
      stats: '730t mass · 40% motion reduction · 1.5m max swing',
      question: 'Why is Taipei 101\'s damper designed as a pendulum instead of a spring?',
      answer: 'A pendulum\'s frequency depends only on length, making it easy to tune to the building\'s period. The enormous mass and gravity provide restoring force without needing giant springs.',
    },
    {
      title: 'Power Line Stockbridge Dampers',
      description: 'The dumbbell-shaped weights you see on power lines are Stockbridge dampers that prevent galloping - dangerous oscillations from wind.',
      stats: '90% fatigue reduction · 50yr lifespan · 5–150Hz range',
      question: 'How do small Stockbridge dampers protect long spans of power lines?',
      answer: 'Each damper is tuned to absorb energy at the natural frequency of that span. The masses oscillate out of phase with the cable, transferring kinetic energy to heat through internal friction.',
    },
    {
      title: 'Car Engine Mounts',
      description: 'Modern cars use hydraulic engine mounts with tuned mass damper properties to isolate vibration from the passenger cabin.',
      stats: '±3% tuning precision · 10x bearing life · 30dB reduction',
      question: 'Why do engine mounts need to be "tuned" rather than just using soft rubber?',
      answer: 'The engine vibrates at specific frequencies (based on RPM). Tuned mounts target these frequencies for maximum absorption. Too soft would allow the engine to bounce; too stiff would transmit all vibration.',
    },
    {
      title: 'Concert Hall Acoustics',
      description: 'Concert halls use tuned absorbers (Helmholtz resonators) to dampen specific frequencies that would otherwise create boomy acoustics.',
      stats: '37 dampers · 90% vibration reduction · 2.5Hz walking frequency',
      question: 'How is a Helmholtz resonator similar to a tuned mass damper?',
      answer: 'Both are resonant systems tuned to a specific frequency. The TMD has a mass on a spring; the Helmholtz resonator has air in a cavity. When the environment vibrates at that frequency, the absorber oscillates and dissipates energy.',
    },
  ];

  const testQuestions = [
    {
      question: 'A skyscraper experiences dangerous swaying during earthquakes and windstorms. Engineers propose installing a tuned mass damper. What is the primary purpose of a tuned mass damper?',
      options: [
        { text: 'To add weight to stabilize the building', correct: false },
        { text: 'To absorb vibration energy at specific frequencies', correct: true },
        { text: 'To make the building more rigid', correct: false },
        { text: 'To provide emergency power', correct: false },
      ],
    },
    {
      question: 'Why must a tuned mass damper\'s frequency match the building\'s natural frequency?',
      options: [
        { text: 'So they don\'t collide during earthquakes', correct: false },
        { text: 'So energy transfers efficiently (resonance)', correct: true },
        { text: 'Building codes require it', correct: false },
        { text: 'It\'s just easier to manufacture that way', correct: false },
      ],
    },
    {
      question: 'When the building sways left, which way does a well-tuned damper move?',
      options: [
        { text: 'Left (same direction)', correct: false },
        { text: 'Right (opposite direction)', correct: true },
        { text: 'Up', correct: false },
        { text: 'It doesn\'t move', correct: false },
      ],
    },
    {
      question: 'What happens if the damper is mis-tuned (wrong frequency)?',
      options: [
        { text: 'It works even better', correct: false },
        { text: 'It becomes less effective or even amplifies motion', correct: true },
        { text: 'Nothing changes', correct: false },
        { text: 'It falls off the building', correct: false },
      ],
    },
    {
      question: 'An engineer designs a TMD for a 10,000-ton building. The damper needs to be effective but not prohibitively expensive. Typical tuned mass dampers are what percentage of building mass?',
      options: [
        { text: '0.1-0.5%', correct: false },
        { text: '1-5%', correct: true },
        { text: '10-20%', correct: false },
        { text: '50%', correct: false },
      ],
    },
    {
      question: 'How does the damper\'s internal damping (friction) help?',
      options: [
        { text: 'It prevents the damper from moving', correct: false },
        { text: 'It converts kinetic energy to heat', correct: true },
        { text: 'It makes the damper heavier', correct: false },
        { text: 'It holds the damper in place', correct: false },
      ],
    },
    {
      question: 'Why are tuned mass dampers typically placed near the top of buildings?',
      options: [
        { text: 'It\'s cheaper to install there', correct: false },
        { text: 'Maximum displacement occurs at the top', correct: true },
        { text: 'They need fresh air', correct: false },
        { text: 'To be visible to the public', correct: false },
      ],
    },
    {
      question: 'What would happen with zero damping in the TMD system?',
      options: [
        { text: 'Perfect energy absorption', correct: false },
        { text: 'The damper would oscillate indefinitely at resonance', correct: true },
        { text: 'The building would stop moving', correct: false },
        { text: 'Nothing different would happen', correct: false },
      ],
    },
    {
      question: 'Active tuned mass dampers use sensors and motors to:',
      options: [
        { text: 'Replace the heavy mass', correct: false },
        { text: 'Adjust response in real-time for better performance', correct: true },
        { text: 'Generate electricity from building motion', correct: false },
        { text: 'Change the building\'s shape', correct: false },
      ],
    },
    {
      question: 'Why might a building need multiple tuned mass dampers?',
      options: [
        { text: 'One for each floor', correct: false },
        { text: 'Different modes vibrate at different frequencies', correct: true },
        { text: 'For aesthetic reasons', correct: false },
        { text: 'Regulations require redundancy', correct: false },
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
    const height = 450;
    const groundY = height - 60;
    const buildingWidth = 100;
    const buildingHeight = 280;
    const buildingBaseX = width / 2 - buildingWidth / 2;

    // Scale displacement for visualization
    const visualScale = 100;
    const buildingOffset = building.x * visualScale;
    const damperOffset = building.damperX * visualScale * 0.5;

    // Earthquake indicator
    const groundShake = Math.sin(2 * Math.PI * earthquakeFreq * time) * earthquakeAmplitude * 20;

    // Calculate oscillation trail positions for visualization
    const trailPositions = Array.from({ length: 8 }, (_, i) => {
      const t = time - i * 0.05;
      return Math.sin(2 * Math.PI * earthquakeFreq * Math.max(0, t)) * earthquakeAmplitude * visualScale * 0.3;
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: '#020617', borderRadius: '12px', maxWidth: '550px' }}
        >
          {/* ============================================= */}
          {/* COMPREHENSIVE DEFS SECTION - Premium Graphics */}
          {/* ============================================= */}
          <defs>
            {/* === LINEAR GRADIENTS WITH 4-6 COLOR STOPS === */}

            {/* Premium night sky gradient with atmospheric depth */}
            <linearGradient id="tmdSkyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0c1929" />
              <stop offset="25%" stopColor="#0f2744" />
              <stop offset="50%" stopColor="#1a365d" />
              <stop offset="75%" stopColor="#1e3a5f" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Premium building steel/glass gradient */}
            <linearGradient id="tmdBuildingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="20%" stopColor="#2563eb" />
              <stop offset="40%" stopColor="#1d4ed8" />
              <stop offset="60%" stopColor="#2563eb" />
              <stop offset="80%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>

            {/* Building highlight for glass effect */}
            <linearGradient id="tmdBuildingHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.4" />
              <stop offset="15%" stopColor="#60a5fa" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.1" />
              <stop offset="85%" stopColor="#1d4ed8" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#1e40af" stopOpacity="0.4" />
            </linearGradient>

            {/* Ground/foundation gradient with depth */}
            <linearGradient id="tmdGroundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="20%" stopColor="#475569" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="80%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* TMD mass metallic gradient */}
            <linearGradient id="tmdMassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="25%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="75%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>

            {/* Spring gradient */}
            <linearGradient id="tmdSpringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="25%" stopColor="#facc15" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="75%" stopColor="#ca8a04" />
              <stop offset="100%" stopColor="#a16207" />
            </linearGradient>

            {/* Earthquake wave gradient */}
            <linearGradient id="tmdEarthquakeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0" />
              <stop offset="25%" stopColor="#fb923c" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#fdba74" stopOpacity="1" />
              <stop offset="75%" stopColor="#fb923c" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
            </linearGradient>

            {/* Amplitude indicator gradient */}
            <linearGradient id="tmdAmplitudeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="33%" stopColor="#22c55e" />
              <stop offset="66%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Window glow gradient */}
            <linearGradient id="tmdWindowGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#fde68a" stopOpacity="0.7" />
              <stop offset="70%" stopColor="#fbbf24" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.2" />
            </linearGradient>

            {/* === RADIAL GRADIENTS FOR MASS/DEPTH EFFECTS === */}

            {/* TMD mass radial depth */}
            <radialGradient id="tmdMassRadial" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="30%" stopColor="#ef4444" />
              <stop offset="60%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </radialGradient>

            {/* Building ambient glow */}
            <radialGradient id="tmdBuildingAmbient" cx="50%" cy="0%" r="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#1d4ed8" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
            </radialGradient>

            {/* Earthquake epicenter radial */}
            <radialGradient id="tmdEpicenterGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#ea580c" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#c2410c" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#9a3412" stopOpacity="0" />
            </radialGradient>

            {/* Star/city light glow */}
            <radialGradient id="tmdStarGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="30%" stopColor="#fef3c7" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#fef3c7" stopOpacity="0" />
            </radialGradient>

            {/* === GLOW FILTERS USING feGaussianBlur + feMerge === */}

            {/* TMD Mass glow filter */}
            <filter id="tmdMassGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#ef4444" floodOpacity="0.6" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Building glow filter */}
            <filter id="tmdBuildingGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor="#3b82f6" floodOpacity="0.4" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Earthquake wave glow */}
            <filter id="tmdQuakeGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor="#f97316" floodOpacity="0.7" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Window inner glow */}
            <filter id="tmdWindowInnerGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feFlood floodColor="#fbbf24" floodOpacity="0.5" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Spring metallic shine */}
            <filter id="tmdSpringShine" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feFlood floodColor="#fde047" floodOpacity="0.4" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Displacement indicator glow */}
            <filter id="tmdIndicatorGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft shadow for depth */}
            <filter id="tmdSoftShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="3" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* ============================================= */}
          {/* BACKGROUND AND ATMOSPHERE                    */}
          {/* ============================================= */}

          {/* Night sky with gradient */}
          <rect width={width} height={height} fill="url(#tmdSkyGradient)" />

          {/* Stars for atmosphere */}
          {[...Array(15)].map((_, i) => (
            <circle
              key={`star-${i}`}
              cx={30 + (i * 31) % (width - 60)}
              cy={15 + (i * 17) % 60}
              r={0.5 + (i % 3) * 0.3}
              fill="url(#tmdStarGlow)"
              opacity={0.4 + (i % 4) * 0.15}
            >
              <animate
                attributeName="opacity"
                values={`${0.3 + (i % 3) * 0.2};${0.6 + (i % 3) * 0.2};${0.3 + (i % 3) * 0.2}`}
                dur={`${2 + (i % 3)}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}

          {/* Distant city silhouette */}
          <g opacity="0.3">
            {[20, 70, 110, 150, 320, 370, 420, 460].map((x, i) => (
              <rect
                key={`city-${i}`}
                x={x}
                y={groundY - 30 - (i % 4) * 15}
                width={25 + (i % 3) * 10}
                height={30 + (i % 4) * 15}
                fill="#1e293b"
                rx={2}
              />
            ))}
          </g>

          {/* ============================================= */}
          {/* GROUND WITH EARTHQUAKE EFFECTS               */}
          {/* ============================================= */}
          <g transform={`translate(${isPlaying ? groundShake : 0}, 0)`}>
            {/* Main ground layer */}
            <rect x={0} y={groundY} width={width} height={60} fill="url(#tmdGroundGradient)" />

            {/* Ground surface line */}
            <line x1={0} y1={groundY} x2={width} y2={groundY} stroke="#64748b" strokeWidth={2} />

            {/* Soil texture lines */}
            {[...Array(8)].map((_, i) => (
              <line
                key={`soil-${i}`}
                x1={i * 65}
                y1={groundY + 15}
                x2={i * 65 + 40}
                y2={groundY + 25}
                stroke="#475569"
                strokeWidth={1}
                opacity={0.5}
              />
            ))}

            {/* Earthquake waves animation */}
            {isPlaying && (
              <g filter="url(#tmdQuakeGlow)">
                {[...Array(5)].map((_, i) => {
                  const waveOffset = (time * 3 + i * 0.4) % 2;
                  const waveX = width / 2 + (waveOffset - 1) * width;
                  return (
                    <ellipse
                      key={`wave-${i}`}
                      cx={waveX}
                      cy={groundY + 10}
                      rx={30 + waveOffset * 60}
                      ry={5 + waveOffset * 3}
                      fill="none"
                      stroke="url(#tmdEarthquakeGradient)"
                      strokeWidth={2}
                      opacity={1 - waveOffset * 0.5}
                    />
                  );
                })}

                {/* Epicenter indicator */}
                <circle
                  cx={width / 2}
                  cy={groundY + 30}
                  r={15}
                  fill="url(#tmdEpicenterGlow)"
                >
                  <animate
                    attributeName="r"
                    values="10;20;10"
                    dur="0.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            )}
          </g>

          {/* ============================================= */}
          {/* BUILDING WITH PREMIUM GRAPHICS               */}
          {/* ============================================= */}
          <g transform={`translate(${buildingOffset}, 0)`} filter="url(#tmdSoftShadow)">
            {/* Building ambient glow */}
            <ellipse
              cx={buildingBaseX + buildingWidth / 2}
              cy={groundY - buildingHeight / 2}
              rx={buildingWidth * 1.2}
              ry={buildingHeight * 0.6}
              fill="url(#tmdBuildingAmbient)"
            />

            {/* Main building structure */}
            <rect
              x={buildingBaseX}
              y={groundY - buildingHeight}
              width={buildingWidth}
              height={buildingHeight}
              fill="url(#tmdBuildingGradient)"
              stroke="#60a5fa"
              strokeWidth={2}
              rx={4}
              filter="url(#tmdBuildingGlow)"
            />

            {/* Glass highlight overlay */}
            <rect
              x={buildingBaseX}
              y={groundY - buildingHeight}
              width={buildingWidth}
              height={buildingHeight}
              fill="url(#tmdBuildingHighlight)"
              rx={4}
            />

            {/* Building edge highlights */}
            <line
              x1={buildingBaseX + 2}
              y1={groundY - buildingHeight + 4}
              x2={buildingBaseX + 2}
              y2={groundY - 4}
              stroke="#93c5fd"
              strokeWidth={1}
              opacity={0.5}
            />

            {/* Windows with glow effect */}
            {[0, 1, 2, 3, 4, 5, 6].map((floor) => (
              <g key={floor}>
                {/* Left window */}
                <rect
                  x={buildingBaseX + 12}
                  y={groundY - buildingHeight + 45 + floor * 34}
                  width={18}
                  height={24}
                  fill="#0c4a6e"
                  rx={2}
                />
                <rect
                  x={buildingBaseX + 14}
                  y={groundY - buildingHeight + 47 + floor * 34}
                  width={14}
                  height={20}
                  fill={floor % 3 === 0 ? "url(#tmdWindowGlow)" : "#1e3a5f"}
                  rx={1}
                  filter={floor % 3 === 0 ? "url(#tmdWindowInnerGlow)" : undefined}
                />

                {/* Right window */}
                <rect
                  x={buildingBaseX + buildingWidth - 30}
                  y={groundY - buildingHeight + 45 + floor * 34}
                  width={18}
                  height={24}
                  fill="#0c4a6e"
                  rx={2}
                />
                <rect
                  x={buildingBaseX + buildingWidth - 28}
                  y={groundY - buildingHeight + 47 + floor * 34}
                  width={14}
                  height={20}
                  fill={floor % 2 === 1 ? "url(#tmdWindowGlow)" : "#1e3a5f"}
                  rx={1}
                  filter={floor % 2 === 1 ? "url(#tmdWindowInnerGlow)" : undefined}
                />

                {/* Floor divider line */}
                <line
                  x1={buildingBaseX + 5}
                  y1={groundY - buildingHeight + 40 + floor * 34}
                  x2={buildingBaseX + buildingWidth - 5}
                  y2={groundY - buildingHeight + 40 + floor * 34}
                  stroke="#1e40af"
                  strokeWidth={1}
                  opacity={0.5}
                />
              </g>
            ))}

            {/* Roof detail */}
            <rect
              x={buildingBaseX - 3}
              y={groundY - buildingHeight - 8}
              width={buildingWidth + 6}
              height={12}
              fill="#1e3a8a"
              rx={3}
            />
            <rect
              x={buildingBaseX + buildingWidth / 2 - 8}
              y={groundY - buildingHeight - 20}
              width={16}
              height={15}
              fill="#334155"
              rx={2}
            />

            {/* ============================================= */}
            {/* TMD (TUNED MASS DAMPER) SYSTEM               */}
            {/* ============================================= */}
            {damperEnabled && (
              <g transform={`translate(${damperOffset}, 0)`}>
                {/* TMD housing/frame */}
                <rect
                  x={buildingBaseX + 8}
                  y={groundY - buildingHeight + 8}
                  width={buildingWidth - 16}
                  height={35}
                  fill="rgba(15, 23, 42, 0.8)"
                  stroke="#475569"
                  strokeWidth={1}
                  rx={4}
                />

                {/* Track/rail system */}
                <rect
                  x={buildingBaseX + 12}
                  y={groundY - buildingHeight + 30}
                  width={buildingWidth - 24}
                  height={4}
                  fill="#334155"
                  rx={2}
                />
                <line
                  x1={buildingBaseX + 14}
                  y1={groundY - buildingHeight + 32}
                  x2={buildingBaseX + buildingWidth - 14}
                  y2={groundY - buildingHeight + 32}
                  stroke="#64748b"
                  strokeWidth={1}
                />

                {/* Left spring with coil visualization */}
                <g filter="url(#tmdSpringShine)">
                  {[...Array(6)].map((_, i) => (
                    <line
                      key={`spring-l-${i}`}
                      x1={buildingBaseX + 15 + i * 5}
                      y1={groundY - buildingHeight + 22 + (i % 2) * 6}
                      x2={buildingBaseX + 20 + i * 5}
                      y2={groundY - buildingHeight + 22 + ((i + 1) % 2) * 6}
                      stroke="url(#tmdSpringGradient)"
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                  ))}
                </g>

                {/* Right spring with coil visualization */}
                <g filter="url(#tmdSpringShine)">
                  {[...Array(6)].map((_, i) => (
                    <line
                      key={`spring-r-${i}`}
                      x1={buildingBaseX + buildingWidth - 45 + i * 5}
                      y1={groundY - buildingHeight + 22 + (i % 2) * 6}
                      x2={buildingBaseX + buildingWidth - 40 + i * 5}
                      y2={groundY - buildingHeight + 22 + ((i + 1) % 2) * 6}
                      stroke="url(#tmdSpringGradient)"
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                  ))}
                </g>

                {/* TMD Mass block */}
                <rect
                  x={buildingBaseX + buildingWidth / 2 - 18}
                  y={groundY - buildingHeight + 12}
                  width={36}
                  height={22}
                  fill="url(#tmdMassRadial)"
                  stroke="#fca5a5"
                  strokeWidth={1.5}
                  rx={4}
                  filter="url(#tmdMassGlow)"
                />

                {/* Mass label */}
                <text
                  x={buildingBaseX + buildingWidth / 2}
                  y={groundY - buildingHeight + 27}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={11}
                  fontWeight="bold"
                >
                  TMD
                </text>

                {/* Mass indicator dots (wheel bearings) */}
                <circle
                  cx={buildingBaseX + buildingWidth / 2 - 10}
                  cy={groundY - buildingHeight + 32}
                  r={3}
                  fill="#64748b"
                  stroke="#94a3b8"
                  strokeWidth={1}
                />
                <circle
                  cx={buildingBaseX + buildingWidth / 2 + 10}
                  cy={groundY - buildingHeight + 32}
                  r={3}
                  fill="#64748b"
                  stroke="#94a3b8"
                  strokeWidth={1}
                />
              </g>
            )}
          </g>

          {/* ============================================= */}
          {/* OSCILLATION VISUALIZATION                    */}
          {/* ============================================= */}
          {isPlaying && (
            <g opacity={0.6}>
              {/* Building oscillation trail */}
              {trailPositions.map((pos, i) => (
                <line
                  key={`trail-${i}`}
                  x1={width / 2 + pos}
                  y1={groundY - buildingHeight - 35 + i * 3}
                  x2={width / 2 + (trailPositions[i + 1] || pos)}
                  y2={groundY - buildingHeight - 35 + (i + 1) * 3}
                  stroke={colors.warning}
                  strokeWidth={2 - i * 0.2}
                  opacity={1 - i * 0.1}
                />
              ))}

              {/* Current position indicator */}
              <circle
                cx={width / 2 + buildingOffset}
                cy={groundY - buildingHeight - 35}
                r={6}
                fill={colors.warning}
                filter="url(#tmdIndicatorGlow)"
              >
                <animate
                  attributeName="r"
                  values="5;7;5"
                  dur="0.5s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          )}

          {/* ============================================= */}
          {/* DISPLACEMENT INDICATOR                       */}
          {/* ============================================= */}
          <g>
            {/* Reference center line */}
            <line
              x1={width / 2}
              y1={groundY - buildingHeight - 50}
              x2={width / 2}
              y2={groundY - buildingHeight - 25}
              stroke={colors.textMuted}
              strokeWidth={1}
              strokeDasharray="3,3"
            />

            {/* Displacement arrow */}
            <line
              x1={width / 2}
              y1={groundY - buildingHeight - 40}
              x2={width / 2 + buildingOffset}
              y2={groundY - buildingHeight - 40}
              stroke={colors.warning}
              strokeWidth={3}
              filter="url(#tmdIndicatorGlow)"
            />

            {/* Arrow head */}
            {Math.abs(buildingOffset) > 2 && (
              <polygon
                points={`${width / 2 + buildingOffset},${groundY - buildingHeight - 40} ${width / 2 + buildingOffset - (buildingOffset > 0 ? 8 : -8)},${groundY - buildingHeight - 45} ${width / 2 + buildingOffset - (buildingOffset > 0 ? 8 : -8)},${groundY - buildingHeight - 35}`}
                fill={colors.warning}
              />
            )}

            {/* Displacement label */}
            <text
              x={width / 2}
              y={groundY - buildingHeight - 55}
              textAnchor="middle"
              fill={colors.textMuted}
              fontSize={11}
              fontWeight="bold"
            >
              Building Displacement
            </text>
          </g>

          {/* ============================================= */}
          {/* AMPLITUDE COMPARISON INDICATORS              */}
          {/* ============================================= */}
          <g transform={`translate(${width - 80}, 80)`}>
            {/* Background panel */}
            <rect
              x={-10}
              y={-15}
              width={85}
              height={120}
              fill="rgba(15, 23, 42, 0.9)"
              stroke="#334155"
              strokeWidth={1}
              rx={6}
            />

            {/* Title */}
            <text
              x={32}
              y={0}
              textAnchor="middle"
              fill={colors.textSecondary}
              fontSize={11}
              fontWeight="bold"
            >
              AMPLITUDE
            </text>

            {/* Amplitude bar background */}
            <rect
              x={0}
              y={10}
              width={65}
              height={12}
              fill="#1e293b"
              rx={3}
            />

            {/* Amplitude bar fill */}
            <rect
              x={0}
              y={10}
              width={Math.min(65, maxBuildingAmplitude * 650)}
              height={12}
              fill="url(#tmdAmplitudeGradient)"
              rx={3}
            />

            {/* Amplitude value — moved to y=60 to avoid text overlap with legend texts at y=13/33 */}
            <text
              x={32}
              y={60}
              textAnchor="middle"
              fill={colors.textPrimary}
              fontSize={14}
              fontWeight="bold"
            >
              {(maxBuildingAmplitude * 100).toFixed(1)}
            </text>

            {/* Status indicator */}
            <circle
              cx={10}
              cy={70}
              r={5}
              fill={damperEnabled ? colors.success : colors.error}
            >
              {isPlaying && (
                <animate
                  attributeName="opacity"
                  values="0.5;1;0.5"
                  dur="1s"
                  repeatCount="indefinite"
                />
              )}
            </circle>
            <text
              x={20}
              y={73}
              fill={colors.textSecondary}
              fontSize={11}
            >
              TMD: {damperEnabled ? 'ON' : 'OFF'}
            </text>

            {/* Tuning indicator */}
            <text
              x={0}
              y={90}
              fill={colors.textMuted}
              fontSize={11}
            >
              Tuning: {(damperTuning * 100).toFixed(0)}%
            </text>
            <rect
              x={0}
              y={94}
              width={65}
              height={4}
              fill="#1e293b"
              rx={2}
            />
            <rect
              x={0}
              y={94}
              width={65 * damperTuning / 1.5}
              height={4}
              fill={damperTuning === 1.0 ? colors.success : colors.warning}
              rx={2}
            />
          </g>

          {/* ============================================= */}
          {/* LEGEND                                       */}
          {/* ============================================= */}
          <g transform={`translate(15, 20)`}>
            {/* Legend background */}
            <rect
              x={-5}
              y={-5}
              width={95}
              height={damperEnabled ? 55 : 35}
              fill="rgba(15, 23, 42, 0.9)"
              stroke="#334155"
              strokeWidth={1}
              rx={6}
            />

            {/* Building legend */}
            <rect x={0} y={2} width={14} height={14} fill="url(#tmdBuildingGradient)" rx={2} />
            <text x={20} y={13} fill={colors.textSecondary} fontSize={11}>Building</text>

            {/* TMD legend */}
            {damperEnabled && (
              <>
                <rect x={0} y={22} width={14} height={14} fill="url(#tmdMassRadial)" rx={2} />
                <text x={20} y={33} fill={colors.textSecondary} fontSize={11}>TMD Mass</text>
              </>
            )}

            {/* Earthquake indicator in legend */}
            {isPlaying && (
              <g transform={`translate(0, ${damperEnabled ? 40 : 20})`}>
                <circle cx={7} cy={7} r={5} fill="url(#tmdEpicenterGlow)">
                  <animate
                    attributeName="r"
                    values="4;6;4"
                    dur="0.5s"
                    repeatCount="indefinite"
                  />
                </circle>
                <text x={20} y={10} fill={colors.warning} fontSize={11}>Earthquake Active</text>
              </g>
            )}
          </g>

          {/* Frequency display — always visible so slider changes update SVG */}
          <text
            x={15}
            y={height - 15}
            fill={colors.textMuted}
            fontSize={11}
          >
            Earthquake Freq: {earthquakeFreq.toFixed(1)} Hz {isPlaying ? '(active)' : ''}
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: 'none',
                background: isPlaying
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: isPlaying
                  ? '0 4px 15px rgba(239, 68, 68, 0.4)'
                  : '0 4px 15px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              {isPlaying ? 'Stop Earthquake' : 'Start Earthquake'}
            </button>
            <button
              onClick={resetSimulation}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease',
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
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <label style={{ color: colors.textSecondary }}>
          <input
            type="checkbox"
            checked={damperEnabled}
            onChange={(e) => {
              setDamperEnabled(e.target.checked);
              resetSimulation();
            }}
            style={{ marginRight: '8px' }}
          />
          Damper Enabled
        </label>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Earthquake Frequency: {earthquakeFreq.toFixed(1)} Hz
        </label>
        <input
          type="range"
          min="0.3"
          max="2.0"
          step="0.1"
          value={earthquakeFreq}
          onChange={(e) => setEarthquakeFreq(parseFloat(e.target.value))}
          onInput={(e) => setEarthquakeFreq(parseFloat((e.target as HTMLInputElement).value))}
          style={{ width: '100%', accentColor: colors.accent, appearance: 'auto', WebkitAppearance: 'slider-horizontal', touchAction: 'pan-y', height: '20px' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: colors.textMuted, marginTop: '4px' }}>
          <span>0.3 Hz</span>
          <span>2.0 Hz</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Damper Tuning: {(damperTuning * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min="0.5"
          max="1.5"
          step="0.1"
          value={damperTuning}
          onChange={(e) => {
            setDamperTuning(parseFloat(e.target.value));
            resetSimulation();
          }}
          onInput={(e) => {
            setDamperTuning(parseFloat((e.target as HTMLInputElement).value));
            resetSimulation();
          }}
          style={{ width: '100%', accentColor: colors.accent, appearance: 'auto', WebkitAppearance: 'slider-horizontal', touchAction: 'pan-y', height: '20px' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: colors.textMuted }}>
          <span>Mis-tuned</span>
          <span>Perfect (100%)</span>
          <span>Mis-tuned</span>
        </div>
      </div>

      <div style={{
        background: 'rgba(249, 115, 22, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Building natural frequency: ~1.0 Hz
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          {damperTuning === 1.0 ? '✓ Damper perfectly tuned!' : `Damper ${damperTuning > 1 ? 'too stiff' : 'too soft'}`}
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '8px', fontFamily: 'monospace' }}>
          ω = √(k/m)
        </div>
      </div>
    </div>
  );

  const navPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const navPhaseLabels = ['Introduction', 'Predict', 'Play', 'Review', 'Twist Predict', 'Twist Play', 'Twist Review', 'Transfer', 'Test', 'Mastery'];

  const renderNavDots = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '8px 16px', background: colors.bgDark, borderBottom: `1px solid rgba(255,255,255,0.1)` }}>
      {navPhases.map((p, i) => (
        <button
          key={p}
          aria-label={navPhaseLabels[i]}
          onClick={() => setInternalPhase(p)}
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            border: 'none',
            background: phase === p ? colors.accent : 'rgba(255,255,255,0.3)',
            cursor: 'pointer',
            padding: 0,
            transition: 'background 0.2s',
          }}
        />
      ))}
    </div>
  );

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string, showBack: boolean = true) => (
    <nav style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: `1px solid rgba(255,255,255,0.1)`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 1001,
    }} aria-label="Game navigation">
      {showBack ? (
        <button
          onClick={() => {
            // Back button behavior - could be handled by parent
            if (onPhaseComplete) {
              // Signal to go back (parent handles this)
            }
          }}
          aria-label="Go back"
          style={{
            padding: '12px 24px',
            minHeight: '44px',
            borderRadius: '8px',
            border: `1px solid ${colors.textSecondary}`,
            background: 'transparent',
            color: colors.textSecondary,
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          Back
        </button>
      ) : (
        <div />
      )}
      <button
        onClick={onPhaseComplete}
        disabled={disabled && !canProceed}
        style={{
          padding: '12px 32px',
          minHeight: '44px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textSecondary,
          fontWeight: 700,
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
        }}
      >
        {buttonText}
      </button>
    </nav>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              🏗️ The Giant Pendulum Inside a Skyscraper
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px', fontWeight: 400 }}>
              Why do engineers put 730-ton steel balls in tall buildings?
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
                Taipei 101, once the world's tallest building, has a massive golden sphere
                suspended near its top floor. During typhoons, you can watch it sway!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                This is a tuned mass damper - and it fights earthquakes with physics.
              </p>
            </div>

            <div style={{
              background: 'rgba(249, 115, 22, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                💡 Start the earthquake and watch how the building responds!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction →', false)}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>📋 What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A skyscraper with a heavy mass (red box) mounted on springs at the top floor.
              When an earthquake hits, the ground shakes and the building sways.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              🤔 What effect does the heavy mass on top have?
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
                    background: prediction === p.id ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
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
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore the Tuned Mass Damper</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Compare building motion with and without the damper
            </p>
          </div>

          {/* Observation Guidance */}
          <div style={{
            background: 'rgba(59, 130, 246, 0.15)',
            margin: '0 16px 16px 16px',
            padding: '12px 16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.building}`,
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, fontWeight: 400 }}>
              <strong style={{ color: colors.textPrimary, fontWeight: 600 }}>Observe:</strong> Watch how the TMD (red mass) moves in the opposite direction to the building. This counter-motion absorbs vibration energy. When you increase the earthquake frequency near 1.0 Hz (the building's natural frequency), the amplitude increases dramatically - this is resonance.
            </p>
          </div>

          {/* Side-by-side layout: SVG left, controls right */}


          <div style={{


            display: 'flex',


            flexDirection: isMobile ? 'column' : 'row',


            gap: isMobile ? '12px' : '20px',


            width: '100%',


            alignItems: isMobile ? 'center' : 'flex-start',


          }}>


            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


              {renderVisualization(true)}


            </div>


            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


              {renderControls()}


            </div>


          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Physics Concepts:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Resonance:</strong> Every structure has a natural frequency at which it vibrates most easily. When forced vibrations match this frequency, the amplitude grows dramatically.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Tuned Mass Damper (TMD):</strong> A secondary mass-spring system tuned to the structure's natural frequency. It oscillates out of phase, absorbing energy and reducing the structure's motion.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Why This Matters:</strong> TMDs protect skyscrapers from earthquakes and wind, bridges from pedestrian-induced vibrations, and power lines from dangerous oscillations. Taipei 101's 730-ton damper reduces building sway by 40%, making it habitable during typhoons.
            </p>
            <h4 style={{ color: colors.accent, marginBottom: '8px', marginTop: '16px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Toggle damper on/off - compare max amplitude</li>
              <li>Set frequency to 1.0 Hz (resonance) for dramatic effect</li>
              <li>Try different tuning values - see what happens</li>
              <li>Watch the damper move opposite to the building</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review →')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'reduce';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
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
              {wasCorrect
                ? 'You predicted correctly! The tuned mass damper reduces the building\'s shaking dramatically by absorbing vibration energy.'
                : 'The tuned mass damper reduces the building\'s shaking dramatically! Your prediction suggested otherwise, but the TMD actually absorbs energy from the building.'}
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🎓 How Tuned Mass Dampers Work</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Resonance Transfer:</strong> The damper
                is tuned to the building's natural frequency because energy transfers most efficiently between oscillators at the same frequency. When the building sways, energy transfers
                to the damper, making it move instead. This is why frequency matching is crucial.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Opposite Motion:</strong> The damper
                always moves opposite to the building. When the building sways left, the damper moves
                right, counteracting the motion.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Energy Dissipation:</strong> Internal
                damping converts the damper's kinetic energy into heat. The building's energy is
                literally absorbed and dissipated by the damper.
              </p>
              <div style={{
                background: 'rgba(249, 115, 22, 0.1)',
                padding: '12px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '13px',
                marginTop: '12px',
              }}>
                <strong style={{ color: colors.textPrimary }}>Tuning Condition:</strong><br />
                <div style={{ marginTop: '8px', color: colors.textPrimary }}>
                  ω<sub>damper</sub> = ω<sub>building</sub>
                </div>
                <div style={{ marginTop: '4px', fontSize: '12px' }}>
                  where ω = √(k/m) is the natural frequency
                </div>
              </div>
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
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>🔄 The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What if the damper is mis-tuned (wrong frequency)?
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
              Imagine the damper springs are too stiff or too soft, so its natural
              frequency doesn't match the building's. It's no longer "tuned."
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              🤔 With a mis-tuned damper, what happens?
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
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Mis-Tuned Damper</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust the tuning and see how it affects damper performance
            </p>
          </div>

          {/* Observation Guidance */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.15)',
            margin: '0 16px 16px 16px',
            padding: '12px 16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
              <strong style={{ color: colors.textPrimary }}>Observe:</strong> Move the tuning slider away from 100% and watch how the building amplitude changes. The damper becomes less effective when mis-tuned.
            </p>
          </div>

          {/* Side-by-side layout: SVG left, controls right */}


          <div style={{


            display: 'flex',


            flexDirection: isMobile ? 'column' : 'row',


            gap: isMobile ? '12px' : '20px',


            width: '100%',


            alignItems: isMobile ? 'center' : 'flex-start',


          }}>


            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


              {renderVisualization(true)}


            </div>


            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


              {renderControls()}


            </div>


          </div>

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Mis-tuning reduces effectiveness dramatically! In extreme cases, a poorly
              tuned damper can even make motion worse by adding energy at the wrong phase.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation →')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'worse' || twistPrediction === 'less';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
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
              Mis-tuned dampers are less effective and can even amplify motion!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>🔬 The Importance of Tuning</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Phase Relationship:</strong> A perfectly
                tuned damper moves exactly opposite to the building (180° out of phase). When mis-tuned,
                this phase relationship shifts, reducing cancellation.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Resonance Matters:</strong> Energy
                transfer between oscillators is most efficient at resonance. Off-resonance, the
                damper can't absorb as much energy from the building.
              </p>
              <p>
                This is why modern "active" TMDs use sensors and motors to adjust tuning in
                real-time as building properties change with temperature and loading!
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
      <TransferPhaseView
        conceptName="Tuned Mass Damper"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
      />
    );
  }

  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Tuned mass dampers protect structures around the world
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
              Complete all 4 applications to unlock the test ({transferCompleted.size}/4 completed)
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
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '8px' }}>
                {app.description}
              </p>
              <p style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '12px', fontFamily: 'monospace' }}>
                {app.stats}
              </p>
              <div style={{
                background: 'rgba(249, 115, 22, 0.1)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '8px',
              }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                  {app.question}
                </p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{
                    padding: '8px 16px',
                    minHeight: '44px',
                    borderRadius: '6px',
                    border: `1px solid ${colors.accent}`,
                    background: colors.accent,
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold',
                  }}
                >
                  Got It - Reveal Answer
                </button>
              ) : (
                <div>
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    padding: '12px',
                    borderRadius: '8px',
                    borderLeft: `3px solid ${colors.success}`,
                    marginBottom: '12px',
                  }}>
                    <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                  </div>
                  {index < transferApplications.length - 1 && !transferCompleted.has(index + 1) && (
                    <button
                      onClick={() => {
                        // Scroll to next application
                        const nextElement = document.getElementById(`transfer-app-${index + 1}`);
                        if (nextElement) nextElement.scrollIntoView({ behavior: 'smooth' });
                      }}
                      style={{
                        padding: '8px 16px',
                        minHeight: '44px',
                        borderRadius: '6px',
                        border: 'none',
                        background: colors.accent,
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 'bold',
                      }}
                    >
                      Got It - Next Application
                    </button>
                  )}
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
          {renderNavDots()}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
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
                {testScore >= 8 ? 'You\'ve mastered tuned mass dampers!' : 'Review the material and try again.'}
              </p>
              <p style={{ color: colors.textMuted, fontSize: '13px', marginTop: '8px', fontWeight: 400 }}>Test Complete!</p>
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
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary, fontWeight: 'bold' }}>
                Question {currentTestQuestion + 1} of {testQuestions.length}
              </span>
            </div>
            <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '16px', fontWeight: 400 }}>
              Test your understanding of tuned mass dampers — how they work, why frequency matching matters, and how engineers apply them in buildings, bridges, and machinery.
            </p>

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
                      ? 'rgba(249, 115, 22, 0.2)'
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
                Next
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
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
              You've mastered tuned mass dampers and structural dynamics
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
              <li>Resonance and energy transfer between oscillators</li>
              <li>Phase relationships in vibration control</li>
              <li>Importance of frequency tuning</li>
              <li>Energy dissipation through damping</li>
              <li>Real-world structural engineering applications</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(249, 115, 22, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🚀 Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Modern "smart" buildings use arrays of active TMDs with real-time control,
              multiple TMDs for different modes, and even liquid sloshing dampers. The
              same principles now protect bridges, wind turbines, and even space telescopes!
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

export default TunedMassDamperRenderer;
