import React, { useState, useEffect, useCallback, useMemo } from 'react';
import TransferPhaseView from './TransferPhaseView';

const realWorldApps = [
  {
    icon: '🎬',
    title: 'Film & Video Production',
    short: 'Creating smooth motion in cinema',
    tagline: 'Making movies move naturally',
    description: 'Film cameras capture 24 frames per second, which can create aliasing artifacts when filming rotating objects. Directors and cinematographers must carefully control shutter angles and frame rates to achieve the desired motion blur and avoid the wagon wheel effect in car chases and action sequences.',
    connection: 'The wagon wheel effect demonstrates temporal aliasing - when the sampling rate (frame rate) is insufficient to capture the true motion of periodic objects. Understanding this helps filmmakers choose appropriate frame rates and shutter speeds.',
    howItWorks: 'When a wheel rotates at a frequency close to the frame rate, each frame captures the spokes in nearly the same position, creating the illusion of slow or reversed motion. Motion blur from longer exposures can help mask this effect.',
    stats: [
      { value: '24fps', label: 'Standard cinema rate', icon: '🎥' },
      { value: '$95B', label: 'Global film market', icon: '📈' },
      { value: '180°', label: 'Standard shutter angle', icon: '🔄' }
    ],
    examples: ['Car commercial filming', 'Western movie stagecoaches', 'Helicopter rotor footage', 'Music video production'],
    companies: ['ARRI', 'RED Digital Cinema', 'Sony Pictures', 'Panavision'],
    futureImpact: 'High frame rate (HFR) cinema at 48-120fps is reducing aliasing artifacts, with directors like Peter Jackson pioneering new visual storytelling techniques.',
    color: '#E11D48'
  },
  {
    icon: '🔬',
    title: 'Stroboscopic Measurement',
    short: 'Non-contact RPM measurement',
    tagline: 'Freezing motion to measure speed',
    description: 'Stroboscopes use the wagon wheel effect intentionally to measure rotation speeds without physical contact. By adjusting the strobe frequency until a rotating object appears stationary, technicians can precisely determine RPM for machinery maintenance and quality control.',
    connection: 'When strobe frequency matches rotation frequency, the object appears frozen due to temporal aliasing. This deliberate application of the wagon wheel effect enables precise speed measurement.',
    howItWorks: 'A stroboscope flashes light at adjustable frequencies. When the flash rate synchronizes with the rotation rate, each flash illuminates the object in the same position, making it appear stationary. The flash frequency then equals the rotation frequency.',
    stats: [
      { value: '500K+', label: 'Industrial units in use', icon: '⚡' },
      { value: '±0.02%', label: 'Measurement accuracy', icon: '🎯' },
      { value: '100K', label: 'Max RPM measurable', icon: '🚀' }
    ],
    examples: ['Turbine blade inspection', 'Motor speed verification', 'Printing press calibration', 'Vibration analysis'],
    companies: ['Monarch Instruments', 'Shimpo', 'Checkline', 'FLIR Systems'],
    futureImpact: 'Digital stroboscopes with automatic frequency matching and smartphone integration are making precision measurements accessible to smaller manufacturers.',
    color: '#2563EB'
  },
  {
    icon: '🎮',
    title: 'Video Game Graphics',
    short: 'Rendering realistic motion',
    tagline: 'Smooth gameplay at any frame rate',
    description: 'Game engines must handle temporal aliasing when rendering rotating objects like wheels and propellers. Modern games implement motion blur, temporal anti-aliasing, and variable refresh rates to create smooth visuals regardless of frame rate.',
    connection: 'Games render discrete frames just like cameras capture them. Fast-rotating objects can exhibit the same wagon wheel aliasing, requiring special rendering techniques to maintain visual fidelity.',
    howItWorks: 'Game engines accumulate motion information across frames and apply motion blur based on velocity vectors. Temporal anti-aliasing (TAA) blends frames together, and adaptive sync technologies match display refresh to frame rate.',
    stats: [
      { value: '144Hz', label: 'Gaming monitor refresh', icon: '🖥️' },
      { value: '$180B', label: 'Gaming market size', icon: '📈' },
      { value: '60fps', label: 'Console standard', icon: '🎯' }
    ],
    examples: ['Racing game tire rendering', 'Flight simulator propellers', 'Spinning weapon effects', 'Vehicle combat games'],
    companies: ['Epic Games', 'Unity', 'NVIDIA', 'AMD'],
    futureImpact: 'Ray-traced motion blur and AI-powered frame interpolation will virtually eliminate temporal aliasing in next-generation gaming.',
    color: '#7C3AED'
  },
  {
    icon: '🏭',
    title: 'Industrial Safety Monitoring',
    short: 'Preventing machinery accidents',
    tagline: 'Seeing the invisible dangers',
    description: 'Security cameras and safety systems monitoring rotating machinery must account for aliasing effects. A fan or blade appearing stationary due to camera frame rate synchronization could mask dangerous rotation, requiring careful camera selection and configuration.',
    connection: 'Safety systems relying on visual monitoring can be deceived by the wagon wheel effect. Understanding aliasing is critical for designing reliable machine guarding and lockout/tagout verification systems.',
    howItWorks: 'Industrial cameras use randomized shutter timing, multiple frame rates, or continuous sensors to avoid false readings. Some systems add detection algorithms that identify aliasing patterns.',
    stats: [
      { value: '2.3M', label: 'Workplace injuries/year', icon: '⚠️' },
      { value: '$170B', label: 'Injury costs annually', icon: '💰' },
      { value: '98%', label: 'Preventable accidents', icon: '🛡️' }
    ],
    examples: ['Fan blade monitoring', 'Turbine safety systems', 'Conveyor inspection', 'Lockout verification cameras'],
    companies: ['Honeywell', 'Siemens', 'Rockwell Automation', 'ABB'],
    futureImpact: 'AI-powered computer vision systems are learning to detect and compensate for aliasing artifacts, making automated safety monitoring more reliable.',
    color: '#DC2626'
  }
];

interface WagonWheelAliasingRendererProps {
  gamePhase?: string;
  phase?: string;
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const phaseOrder = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'] as const;
type Phase = typeof phaseOrder[number];

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  wheel: '#3b82f6',
  spoke: '#64748b',
  sample: '#ef4444',
};

const WagonWheelAliasingRenderer: React.FC<WagonWheelAliasingRendererProps> = ({
  gamePhase,
  phase: phaseProp,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Self-managing phase state
  const resolveInitialPhase = (): Phase => {
    const raw = gamePhase || phaseProp || 'hook';
    return (phaseOrder as readonly string[]).includes(raw) ? (raw as Phase) : 'hook';
  };

  const [currentPhase, setCurrentPhase] = useState<Phase>(resolveInitialPhase);

  // Sync with external prop changes
  useEffect(() => {
    const raw = gamePhase || phaseProp;
    if (raw && (phaseOrder as readonly string[]).includes(raw)) {
      setCurrentPhase(raw as Phase);
    }
  }, [gamePhase, phaseProp]);

  const phase = currentPhase;

  // Navigation
  const navigateToPhase = useCallback((p: Phase) => {
    setCurrentPhase(p);
  }, []);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) {
      setCurrentPhase(phaseOrder[idx + 1]);
    }
    if (onPhaseComplete) onPhaseComplete();
  }, [phase, onPhaseComplete]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) {
      setCurrentPhase(phaseOrder[idx - 1]);
    }
  }, [phase]);

  // Simulation state
  const [trueAngle, setTrueAngle] = useState(0);
  const [sampledAngles, setSampledAngles] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);

  // Parameters
  const [rotationSpeed, setRotationSpeed] = useState(5); // rotations per second
  const [frameRate, setFrameRate] = useState(24); // frames per second
  const numSpokes = 8;

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [questionConfirmed, setQuestionConfirmed] = useState(false);

  // Calculate apparent motion - memoized for performance
  const getApparentSpeed = useMemo(() => {
    const degreesPerFrame = (rotationSpeed * 360) / frameRate;
    const spokeSpacing = 360 / numSpokes;
    let apparentPerFrame = degreesPerFrame % spokeSpacing;
    if (apparentPerFrame > spokeSpacing / 2) {
      apparentPerFrame = apparentPerFrame - spokeSpacing;
    }
    return (apparentPerFrame * frameRate) / 360;
  }, [rotationSpeed, frameRate, numSpokes]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTime(prev => prev + 1 / 60);
      setTrueAngle(prev => (prev + rotationSpeed * 360 / 60) % 360);
      const frameInterval = 1 / frameRate;
      const currentFrame = Math.floor(time / frameInterval);
      const sampledAngle = (currentFrame * rotationSpeed * 360 / frameRate) % 360;
      setSampledAngles(prev => {
        const newAngles = [...prev, sampledAngle];
        if (newAngles.length > 20) newAngles.shift();
        return newAngles;
      });
    }, 1000 / 60);
    return () => clearInterval(interval);
  }, [isPlaying, rotationSpeed, frameRate, time]);

  const resetSimulation = () => {
    setTime(0);
    setTrueAngle(0);
    setSampledAngles([]);
    setIsPlaying(false);
  };

  const currentPhaseIndex = phaseOrder.indexOf(phase);

  const predictions = [
    { id: 'forward', label: 'The wheel always appears to spin forward' },
    { id: 'backward', label: 'The wheel can appear to spin backward or even stop' },
    { id: 'blur', label: 'The wheel becomes a blur at high speeds' },
    { id: 'invisible', label: 'The spokes become invisible' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'The apparent motion stays the same' },
    { id: 'faster', label: 'The wheel appears to spin faster' },
    { id: 'different', label: 'The apparent motion changes direction or speed' },
    { id: 'blur', label: 'The wheel becomes blurred' },
  ];

  const transferApplications = [
    {
      title: 'Helicopter Rotors on Video',
      description: 'Helicopter blades often appear stationary, slowly rotating, or even bending in videos due to rolling shutter combined with aliasing.',
      question: 'Why do helicopter blades sometimes look bent or wavy in phone videos?',
      answer: 'The blade moves significantly during the time the sensor scans down the frame (rolling shutter). Combined with aliasing, different parts of the blade are captured at different positions, creating wave-like distortions.',
    },
    {
      title: 'LED Lighting and Cameras',
      description: 'LED lights flicker at the AC frequency (50/60 Hz). When camera frame rates interact with this, banding or strobing effects appear.',
      question: 'Why do some videos show rolling bands across LED-lit scenes?',
      answer: 'The LED\'s on/off cycle (often 100-120 Hz) doesn\'t sync with the camera\'s frame rate. Some frames capture more "on" time than others, creating brightness variations that roll across the image.',
    },
    {
      title: 'Music Visualization',
      description: 'Some music visualizers show waveforms that appear to move slowly even when the frequency is high - this is intentional aliasing for aesthetics.',
      question: 'How do audio visualizers make high-frequency waves visible?',
      answer: 'They sample the audio at rates that create aliasing, folding high frequencies into lower, visible ones. This is similar to how the wagon wheel effect makes fast rotation visible as slow motion.',
    },
    {
      title: 'Stroboscopic Tachometers',
      description: 'Stroboscopes measure rotation speed by flashing light until a spinning object appears stationary.',
      question: 'How does a stroboscope measure RPM without contact?',
      answer: 'When the strobe frequency matches the rotation frequency (or a multiple), the object appears frozen. By reading the strobe frequency when this happens, you get the RPM directly.',
    },
  ];

  const testQuestions = [
    {
      question: 'A) A car wheel with 8 spokes spins at 5 rotations/second filmed at 24fps. Temporal aliasing causes:',
      scenario: 'You are filming a car driving past at highway speed. The wheel has 8 evenly-spaced spokes.',
      options: [
        { text: 'A) The wheel actually reverses direction', correct: false },
        { text: 'B) Temporal aliasing from discrete frame sampling', correct: true },
        { text: 'C) An optical illusion in the human eye', correct: false },
        { text: 'D) Motion blur averaging the spokes', correct: false },
      ],
    },
    {
      question: 'B) A wheel with 8 spokes spinning at 8 rotations/second filmed at 8 fps will appear:',
      scenario: 'You set up a camera at exactly 8 frames per second. A wagon wheel with 8 spokes spins at exactly 8 rotations per second.',
      options: [
        { text: 'A) Spinning very fast forward', correct: false },
        { text: 'B) Spinning backward rapidly', correct: false },
        { text: 'C) Stationary or frozen', correct: true },
        { text: 'D) Blurred beyond recognition', correct: false },
      ],
    },
    {
      question: 'C) If a wheel appears to spin backward on video, the true rotation is:',
      scenario: 'Watching a car commercial, you notice the wheels appear to spin backward while the car moves forward.',
      options: [
        { text: 'A) Actually backward', correct: false },
        { text: 'B) Forward, but slightly less than a spoke spacing per frame', correct: false },
        { text: 'C) Forward, but slightly more than a spoke spacing per frame', correct: true },
        { text: 'D) Zero — the wheel is stopped', correct: false },
      ],
    },
    {
      question: 'D) The Nyquist theorem states that to avoid aliasing, sampling rate must be:',
      scenario: 'A signal processing engineer is designing a camera system to capture wheel motion without aliasing artifacts.',
      options: [
        { text: 'A) The same frequency as the signal', correct: false },
        { text: 'B) At least twice the signal frequency', correct: true },
        { text: 'C) Half the signal frequency', correct: false },
        { text: 'D) Any frequency works equally well', correct: false },
      ],
    },
    {
      question: 'E) Increasing frame rate while wheel speed stays constant will:',
      scenario: 'A cinematographer switches from 24fps to 60fps while filming the same spinning wheel.',
      options: [
        { text: 'A) Always make the wheel appear faster', correct: false },
        { text: 'B) Change the apparent motion, possibly reducing aliasing', correct: true },
        { text: 'C) Have no effect on apparent motion', correct: false },
        { text: 'D) Always reverse the apparent direction', correct: false },
      ],
    },
    {
      question: 'F) The wagon wheel effect can also occur in real life under:',
      scenario: 'You notice a fan blade appearing to spin slowly under certain lighting conditions in an office.',
      options: [
        { text: 'A) Any lighting conditions whatsoever', correct: false },
        { text: 'B) Flickering light sources like strobes or some LEDs', correct: true },
        { text: 'C) Only in complete darkness', correct: false },
        { text: 'D) Only in bright direct sunlight', correct: false },
      ],
    },
    {
      question: 'G) When filming a car wheel at highway speed, why might it appear nearly stationary?',
      scenario: 'You film a sports car driving at 120 km/h. Its 18-inch wheel appears nearly frozen in your 24fps video.',
      options: [
        { text: 'A) The car is actually going slow', correct: false },
        { text: 'B) Motion blur averages everything out', correct: false },
        { text: 'C) Frame rate nearly matches spoke passage rate', correct: true },
        { text: 'D) The camera is broken', correct: false },
      ],
    },
    {
      question: 'H) Aliasing in the wagon wheel effect is most similar to:',
      scenario: 'A physicist is explaining wagon wheel aliasing to students using an analogy from acoustics.',
      options: [
        { text: 'A) Color mixing in painting', correct: false },
        { text: 'B) Beat frequencies in audio signals', correct: true },
        { text: 'C) Lens distortion effects', correct: false },
        { text: 'D) Depth of field blur', correct: false },
      ],
    },
    {
      question: 'I) To show true wheel motion without aliasing at 30fps, the wheel should spin at most:',
      scenario: 'A safety engineer needs to configure a 30fps industrial camera to reliably detect if a wheel is spinning.',
      options: [
        { text: 'A) 30 rotations per second', correct: false },
        { text: 'B) 15 rotations per second (Nyquist limit)', correct: true },
        { text: 'C) 60 rotations per second', correct: false },
        { text: 'D) Speed doesn\'t matter for detection', correct: false },
      ],
    },
    {
      question: 'J) In old Western movies, stagecoach wheels often appeared to spin backward because:',
      scenario: 'A film historian is studying why stagecoach wheels in 1950s Western movies often appear to spin the wrong direction.',
      options: [
        { text: 'A) They filmed scenes in reverse', correct: false },
        { text: 'B) The horses were trained for backward wheel spin', correct: false },
        { text: 'C) Low frame rates caused aliasing with wheel rotation', correct: true },
        { text: 'D) It was an intentional special effect', correct: false },
      ],
    },
  ];

  const handleTestAnswer = useCallback((questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  }, [testAnswers]);

  const submitTest = useCallback(() => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
    else if (score < 8 && onIncorrectAnswer) onIncorrectAnswer();
  }, [testAnswers, onCorrectAnswer, onIncorrectAnswer]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Derived values (memoized)
  const apparentSpeed = getApparentSpeed;
  const apparentAngle = useMemo(() => {
    return sampledAngles.length > 0 ? sampledAngles[sampledAngles.length - 1] : 0;
  }, [sampledAngles]);

  const motionDirection = useMemo(() => {
    return apparentSpeed > 0.1 ? 'forward' : apparentSpeed < -0.1 ? 'backward' : 'stopped';
  }, [apparentSpeed]);

  // Interactive point Y position for speed comparison chart
  const interactivePointY = useMemo(() => {
    const chartHeight = 110;
    if (apparentSpeed >= 0) {
      return chartHeight - (Math.abs(apparentSpeed) / 15) * chartHeight;
    }
    return chartHeight;
  }, [apparentSpeed]);

  const renderVisualization = (interactive: boolean) => {
    const width = 700;
    const height = 480;
    const wheelRadius = 65;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', maxWidth: '700px', margin: '0 auto' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: colors.bgDark, borderRadius: '12px', maxWidth: '700px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
        >
          <defs>
            <linearGradient id="wwaWheelRim" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <radialGradient id="wwaWheelHub" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#cbd5e1" />
              <stop offset="60%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1e293b" />
            </radialGradient>
            <linearGradient id="wwaSampledRim" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#991b1b" />
              <stop offset="50%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>
            <radialGradient id="wwaSampledHub" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="60%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#450a0a" />
            </radialGradient>
            <linearGradient id="wwaSpokeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
            <linearGradient id="wwaCameraBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="50%" stopColor="#111827" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>
            <radialGradient id="wwaCameraLens" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#1e40af" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#1e3a8a" stopOpacity="1" />
            </radialGradient>
            <linearGradient id="wwaArrowForward" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
            <linearGradient id="wwaArrowBackward" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#f87171" />
            </linearGradient>
            <linearGradient id="wwaStoppedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
            <linearGradient id="wwaLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="100%" stopColor="#0a0f1a" />
            </linearGradient>
            <linearGradient id="wwaTireRubber" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1c1917" />
              <stop offset="50%" stopColor="#292524" />
              <stop offset="100%" stopColor="#0c0a09" />
            </linearGradient>
            <filter id="wwaWheelGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="wwaSampledGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="wwaTextGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="wwaArrowGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <pattern id="wwaGridPattern" width="30" height="30" patternUnits="userSpaceOnUse">
              <rect width="30" height="30" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
          </defs>

          {/* Background */}
          <rect width={width} height={height} fill="url(#wwaLabBg)" />
          <rect width={width} height={height} fill="url(#wwaGridPattern)" />

          {/* Title */}
          <text x={width / 2} y={22} textAnchor="middle" fill={colors.accent} fontSize={14} fontWeight="bold" filter="url(#wwaTextGlow)">
            Wagon Wheel Aliasing — Temporal Sampling Visualization
          </text>

          {/* Formula display - absolute coords */}
          <rect x={width / 2 - 195} y={38} width={390} height={22} rx={5} fill="rgba(30, 41, 59, 0.9)" stroke="#475569" strokeWidth={1} />
          <text x={width / 2} y={53} textAnchor="middle" fill={colors.textPrimary} fontSize={11} fontFamily="monospace">
            apparent_speed = (true_speed × 360 / fps) mod spoke_spacing
          </text>

          {/* Interactive speed indicator - tracks rotationSpeed directly for slider response */}
          <circle
            cx={30}
            cy={430 - ((rotationSpeed - 1) / 14) * 150}
            r={7}
            fill={colors.success}
            stroke="white"
            strokeWidth={2}
            filter="url(#wwaTextGlow)"
          />

          {/* TRUE WHEEL label - absolute coords to avoid overlap with SAMPLED WHEEL */}
          <text x={148} y={175 - wheelRadius - 16} textAnchor="middle" fill={colors.textPrimary} fontSize={12} fontWeight="bold">
            TRUE WHEEL
          </text>
          <text x={148} y={175 - wheelRadius - 2} textAnchor="middle" fill={colors.textMuted} fontSize={11}>
            Actual rotation
          </text>

          {/* === TRUE WHEEL SECTION (Left) === */}
          <g transform="translate(148, 175)">

            <circle cx={0} cy={0} r={wheelRadius + 10} fill="url(#wwaTireRubber)" filter="url(#wwaWheelGlow)" />
            <circle cx={0} cy={0} r={wheelRadius} fill="none" stroke="url(#wwaWheelRim)" strokeWidth={7} />
            <circle cx={0} cy={0} r={wheelRadius - 10} fill="none" stroke="#475569" strokeWidth={1.5} />
            <circle cx={0} cy={0} r={18} fill="url(#wwaWheelHub)" />
            <circle cx={0} cy={0} r={7} fill="#1e293b" />
            <circle cx={0} cy={0} r={3} fill="#64748b" />

            {Array.from({ length: numSpokes }).map((_, i) => {
              const angle = (trueAngle + i * 360 / numSpokes) * Math.PI / 180;
              const x2 = (wheelRadius - 12) * Math.cos(angle);
              const y2 = (wheelRadius - 12) * Math.sin(angle);
              const x1 = 16 * Math.cos(angle);
              const y1 = 16 * Math.sin(angle);
              return (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="url(#wwaSpokeGradient)" strokeWidth={4} strokeLinecap="round" />
              );
            })}

            <g transform={`rotate(${trueAngle})`}>
              <path d={`M ${wheelRadius + 20} -8 A ${wheelRadius + 20} ${wheelRadius + 20} 0 0 1 ${wheelRadius + 20} 8`}
                fill="none" stroke="url(#wwaArrowForward)" strokeWidth={2.5} strokeLinecap="round" filter="url(#wwaArrowGlow)" />
              <polygon points={`${wheelRadius + 20},12 ${wheelRadius + 16},4 ${wheelRadius + 24},4`} fill="url(#wwaArrowForward)" />
            </g>

            <rect x={-40} y={wheelRadius + 18} width={80} height={20} rx={5} fill="rgba(16, 185, 129, 0.2)" stroke={colors.success} strokeWidth={1} />

            {/* Interactive marker - reference spoke end */}
            <circle
              cx={(wheelRadius - 12) * Math.cos(trueAngle * Math.PI / 180)}
              cy={(wheelRadius - 12) * Math.sin(trueAngle * Math.PI / 180)}
              r={8}
              fill={colors.success}
              stroke="white"
              strokeWidth={2}
              opacity={0.85}
              filter="url(#wwaWheelGlow)"
            />
          </g>
          {/* True wheel speed label - absolute coords */}
          <text x={148} y={175 + wheelRadius + 31} textAnchor="middle" fill={colors.success} fontSize={12} fontWeight="bold">
            {rotationSpeed.toFixed(1)} r/s
          </text>

          {/* === CAMERA / SAMPLING VISUALIZATION (Center) === */}
          <g transform={`translate(${width / 2}, 155)`}>
            <rect x={-22} y={-52} width={44} height={32} rx={5} fill="url(#wwaCameraBody)" stroke="#4b5563" strokeWidth={1.5} />
            <rect x={-17} y={-47} width={34} height={22} rx={3} fill="#0f172a" />
            <circle cx={0} cy={-35} r={10} fill="url(#wwaCameraLens)" stroke="#1e40af" strokeWidth={1.5} />
            <circle cx={-3} cy={-38} r={2.5} fill="rgba(255,255,255,0.3)" />

            <circle cx={15} cy={-48} r={3.5} fill={isPlaying ? "#ef4444" : "#6b7280"}>
              {isPlaying && <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />}
            </circle>

          </g>
          {/* Camera labels - absolute coords to avoid overlaps */}
          <text x={width / 2} y={155 + 5} textAnchor="middle" fill={colors.accent} fontSize={11} fontWeight="bold">CAMERA</text>
          <rect x={width / 2 - 42} y={155 + 14} width={84} height={36} rx={5} fill="rgba(30, 41, 59, 0.9)" stroke="#475569" strokeWidth={1} />
          <text x={width / 2} y={155 + 24} textAnchor="middle" fill={colors.accent} fontSize={11} fontWeight="bold">FRAME RATE</text>
          <text x={width / 2} y={155 + 44} textAnchor="middle" fill={colors.textPrimary} fontSize={13} fontWeight="bold">{frameRate} fps</text>
          <rect x={width / 2 - 50} y={155 + 60} width={100} height={32} rx={4} fill="rgba(15, 23, 42, 0.8)" stroke="#334155" strokeWidth={1} />
          <text x={width / 2} y={155 + 72} textAnchor="middle" fill={colors.textMuted} fontSize={11}>SAMPLING RATE</text>
          <text x={width / 2} y={155 + 87} textAnchor="middle" fill={colors.textSecondary} fontSize={11}>{frameRate} samples/sec</text>

          {/* SAMPLED WHEEL label - absolute coords to avoid overlap with TRUE WHEEL */}
          <text x={552} y={175 - wheelRadius - 16} textAnchor="middle" fill={colors.textPrimary} fontSize={12} fontWeight="bold">
            SAMPLED WHEEL
          </text>
          <text x={552} y={175 - wheelRadius - 2} textAnchor="middle" fill={colors.textMuted} fontSize={11}>
            Camera perception
          </text>

          {/* === SAMPLED/APPARENT WHEEL (Right) === */}
          <g transform="translate(552, 175)">

            <circle cx={0} cy={0} r={wheelRadius + 10} fill="url(#wwaTireRubber)" filter="url(#wwaSampledGlow)" />
            <circle cx={0} cy={0} r={wheelRadius} fill="none" stroke="url(#wwaSampledRim)" strokeWidth={7} />
            <circle cx={0} cy={0} r={wheelRadius - 10} fill="none" stroke="#991b1b" strokeWidth={1.5} />
            <circle cx={0} cy={0} r={18} fill="url(#wwaSampledHub)" />
            <circle cx={0} cy={0} r={7} fill="#450a0a" />
            <circle cx={0} cy={0} r={3} fill="#ef4444" />

            {Array.from({ length: numSpokes }).map((_, i) => {
              const angle = (apparentAngle + i * 360 / numSpokes) * Math.PI / 180;
              const x2 = (wheelRadius - 12) * Math.cos(angle);
              const y2 = (wheelRadius - 12) * Math.sin(angle);
              const x1 = 16 * Math.cos(angle);
              const y1 = 16 * Math.sin(angle);
              return (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="url(#wwaSpokeGradient)" strokeWidth={4} strokeLinecap="round" />
              );
            })}

            {motionDirection === 'forward' && (
              <g transform={`rotate(${apparentAngle})`} filter="url(#wwaArrowGlow)">
                <path d={`M ${wheelRadius + 20} -8 A ${wheelRadius + 20} ${wheelRadius + 20} 0 0 1 ${wheelRadius + 20} 8`}
                  fill="none" stroke="url(#wwaArrowForward)" strokeWidth={2.5} strokeLinecap="round" />
                <polygon points={`${wheelRadius + 20},12 ${wheelRadius + 16},4 ${wheelRadius + 24},4`} fill="url(#wwaArrowForward)" />
              </g>
            )}
            {motionDirection === 'backward' && (
              <g transform={`rotate(${apparentAngle})`} filter="url(#wwaArrowGlow)">
                <path d={`M ${wheelRadius + 20} 8 A ${wheelRadius + 20} ${wheelRadius + 20} 0 0 0 ${wheelRadius + 20} -8`}
                  fill="none" stroke="url(#wwaArrowBackward)" strokeWidth={2.5} strokeLinecap="round" />
                <polygon points={`${wheelRadius + 20},-12 ${wheelRadius + 16},-4 ${wheelRadius + 24},-4`} fill="url(#wwaArrowBackward)" />
              </g>
            )}
            {motionDirection === 'stopped' && (
              <g>
                <rect x={wheelRadius + 12} y={-10} width={18} height={20} rx={3} fill="url(#wwaStoppedGradient)" filter="url(#wwaArrowGlow)" />
                <rect x={wheelRadius + 15} y={-5} width={3.5} height={10} fill="#0f172a" />
                <rect x={wheelRadius + 21} y={-5} width={3.5} height={10} fill="#0f172a" />
              </g>
            )}

            <rect x={-44} y={wheelRadius + 18} width={88} height={20} rx={5}
              fill={motionDirection === 'forward' ? 'rgba(16, 185, 129, 0.2)' : motionDirection === 'backward' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}
              stroke={motionDirection === 'forward' ? colors.success : motionDirection === 'backward' ? colors.error : colors.warning}
              strokeWidth={1} />

            {/* Interactive marker that moves with slider changes */}
            <circle
              cx={(wheelRadius - 12) * Math.cos((apparentAngle * Math.PI) / 180)}
              cy={(wheelRadius - 12) * Math.sin((apparentAngle * Math.PI) / 180)}
              r={9}
              fill={colors.error}
              stroke="white"
              strokeWidth={2}
              opacity={0.9}
              filter="url(#wwaSampledGlow)"
            />
          </g>
          {/* Sampled wheel speed label - absolute coords */}
          <text x={552} y={175 + wheelRadius + 31} textAnchor="middle"
            fill={motionDirection === 'forward' ? colors.success : motionDirection === 'backward' ? colors.error : colors.warning}
            fontSize={12} fontWeight="bold">
            {motionDirection === 'stopped' ? 'STOPPED' : `${Math.abs(apparentSpeed).toFixed(1)} r/s${motionDirection === 'backward' ? ' ←' : ''}`}
          </text>

          {/* === SPEED COMPARISON CHART === */}
          <g transform="translate(88, 350)">
            <text x={120} y={-14} textAnchor="middle" fill={colors.textSecondary} fontSize={12} fontWeight="bold">
              Speed Comparison Chart
            </text>

            {/* Grid lines with strokeDasharray */}
            <line x1={0} y1={0} x2={240} y2={0} stroke={colors.textMuted} strokeWidth={0.5} strokeDasharray="4 4" opacity="0.3" />
            <line x1={0} y1={55} x2={240} y2={55} stroke={colors.textMuted} strokeWidth={0.5} strokeDasharray="4 4" opacity="0.3" />
            <line x1={0} y1={110} x2={240} y2={110} stroke={colors.textMuted} strokeWidth={0.5} strokeDasharray="4 4" opacity="0.3" />

            {/* Y-axis */}
            <line x1={0} y1={0} x2={0} y2={110} stroke={colors.textMuted} strokeWidth={1} />
            <text x={-8} y={4} textAnchor="end" fill={colors.textMuted} fontSize={11}>15</text>
            <text x={-8} y={58} textAnchor="end" fill={colors.textMuted} fontSize={11}>7.5</text>
            <text x={-8} y={113} textAnchor="end" fill={colors.textMuted} fontSize={11}>0</text>
            <text x={-22} y={85} textAnchor="middle" fill={colors.textMuted} fontSize={11} transform="rotate(-90, -22, 85)">r/s</text>

            {/* X-axis */}
            <line x1={0} y1={110} x2={240} y2={110} stroke={colors.textMuted} strokeWidth={1} />

            {/* True speed bar */}
            <rect x={30} y={110 - (rotationSpeed / 15) * 110} width={70} height={(rotationSpeed / 15) * 110}
              fill={colors.success} opacity={0.75} />
            <text x={65} y={128} textAnchor="middle" fill={colors.textPrimary} fontSize={11}>True</text>

            {/* Apparent speed bar */}
            {apparentSpeed >= 0 ? (
              <rect x={140} y={110 - (Math.abs(apparentSpeed) / 15) * 110} width={70}
                height={(Math.abs(apparentSpeed) / 15) * 110} fill={colors.error} opacity={0.75} />
            ) : (
              <>
                <rect x={140} y={110} width={70} height={Math.min((Math.abs(apparentSpeed) / 15) * 110, 110)}
                  fill={colors.warning} opacity={0.75} />
                <text x={175} y={143} textAnchor="middle" fill={colors.warning} fontSize={11}>backward</text>
              </>
            )}
            <text x={175} y={128} textAnchor="middle" fill={colors.textPrimary} fontSize={11}>Sampled</text>

            {/* Interactive marker on apparent speed bar - moves visibly with slider */}
            <circle
              cx={175}
              cy={interactivePointY}
              r={7}
              fill={colors.accent}
              stroke="white"
              strokeWidth={2}
              filter="url(#wwaTextGlow)"
            />
          </g>

          {/* === BOTTOM INFO PANEL === */}
          {/* Bottom info panel - absolute coordinates */}
          <rect x={475 - 150} y={380} width={310} height={80} rx={8} fill="rgba(30, 41, 59, 0.95)" stroke="#475569" strokeWidth={1} />
          {/* Spoke spacing */}
          <text x={475 - 90} y={380 + 12} textAnchor="middle" fill={colors.textMuted} fontSize={11} fontWeight="bold">SPOKE</text>
          <text x={475 - 90} y={380 + 26} textAnchor="middle" fill={colors.textMuted} fontSize={11} fontWeight="bold">SPACING</text>
          <text x={475 - 90} y={380 + 47} textAnchor="middle" fill={colors.textSecondary} fontSize={14} fontWeight="bold">{(360 / numSpokes).toFixed(0)}°</text>
          {/* Degrees per frame */}
          <text x={475 + 10} y={380 + 12} textAnchor="middle" fill={colors.textMuted} fontSize={11} fontWeight="bold">DEG/FRAME</text>
          <text x={475 + 10} y={380 + 26} textAnchor="middle" fill={colors.textMuted} fontSize={11} fontWeight="bold">SHIFT</text>
          <text x={475 + 10} y={380 + 47} textAnchor="middle" fill={colors.accent} fontSize={14} fontWeight="bold">{((rotationSpeed * 360) / frameRate).toFixed(1)}°</text>
          {/* Alias shift */}
          <text x={475 + 115} y={380 + 12} textAnchor="middle" fill={colors.textMuted} fontSize={11} fontWeight="bold">ALIAS</text>
          <text x={475 + 115} y={380 + 26} textAnchor="middle" fill={colors.textMuted} fontSize={11} fontWeight="bold">RESULT</text>
          <text x={475 + 115} y={380 + 47} textAnchor="middle"
            fill={motionDirection === 'forward' ? colors.success : motionDirection === 'backward' ? colors.error : colors.warning}
            fontSize={14} fontWeight="bold">
            {(() => {
              const degreesPerFrame = (rotationSpeed * 360) / frameRate;
              const spokeSpacing = 360 / numSpokes;
              let apparentPerFrame = degreesPerFrame % spokeSpacing;
              if (apparentPerFrame > spokeSpacing / 2) apparentPerFrame = apparentPerFrame - spokeSpacing;
              return `${apparentPerFrame >= 0 ? '+' : ''}${apparentPerFrame.toFixed(1)}°`;
            })()}
          </text>
          {/* Direction label */}
          <text x={475 + 10} y={380 + 70} textAnchor="middle" fill={motionDirection === 'stopped' ? colors.warning : motionDirection === 'backward' ? colors.error : colors.success} fontSize={11} fontWeight="bold">
            {motionDirection === 'stopped' ? '⏸ Appears frozen' : motionDirection === 'backward' ? '← Backward (aliased!)' : '→ Forward'}
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: 'none',
                background: isPlaying
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                boxShadow: isPlaying ? '0 4px 16px rgba(239, 68, 68, 0.4)' : '0 4px 16px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              {isPlaying ? '⏸ Pause Animation' : '▶ Play Animation'}
            </button>
            <button
              onClick={resetSimulation}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: `2px solid ${colors.accent}`,
                background: 'rgba(245, 158, 11, 0.1)',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                transition: 'all 0.2s ease',
              }}
            >
              ↺ Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '700px', margin: '0 auto' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
          True Rotation Speed: <span style={{ color: colors.accent }}>{rotationSpeed.toFixed(1)}</span> rotations/sec
        </label>
        <input
          type="range"
          min="1"
          max="15"
          step="0.5"
          value={rotationSpeed}
          onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
          style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px', marginTop: '2px' }}>
          <span>1 r/s</span><span>8 r/s (spoke rate)</span><span>15 r/s</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
          Camera Frame Rate: <span style={{ color: colors.accent }}>{frameRate}</span> fps
        </label>
        <input
          type="range"
          min="10"
          max="60"
          step="1"
          value={frameRate}
          onChange={(e) => setFrameRate(parseInt(e.target.value))}
          style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px', marginTop: '2px' }}>
          <span>10 fps</span><span>24 fps (cinema)</span><span>60 fps</span>
        </div>
      </div>

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '14px', marginBottom: '4px', fontWeight: '600', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
          Apparent speed: <span style={{ color: colors.accent }}>{apparentSpeed.toFixed(2)}</span> rot/s
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.5' }}>
          {apparentSpeed > 0 ? '→ Forward motion (aliased to slower forward)' : apparentSpeed < 0 ? '← Backward motion (aliased backwards!)' : '⏸ Appears frozen (perfect aliasing!)'}
        </div>
      </div>
    </div>
  );

  const renderNavBar = () => (
    <nav
      aria-label="Game navigation"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        padding: '10px 20px',
        background: colors.bgDark,
        borderBottom: `1px solid rgba(255,255,255,0.1)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1001,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      <button
        onClick={goBack}
        aria-label="Back"
        disabled={currentPhaseIndex === 0}
        style={{
          padding: '8px 16px',
          minHeight: '44px',
          borderRadius: '8px',
          border: `1px solid ${colors.textMuted}`,
          background: 'transparent',
          color: currentPhaseIndex === 0 ? 'rgba(148,163,184,0.4)' : colors.textPrimary,
          cursor: currentPhaseIndex === 0 ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          transition: 'all 0.2s ease',
        }}
      >
        ← Back
      </button>

      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
        {phaseOrder.map((p, i) => {
          const getPhaseLabel = (ph: string) => {
            if (ph === 'hook') return 'explore';
            if (ph === 'predict') return 'predict';
            if (ph === 'play') return 'experiment';
            if (ph === 'review') return 'review';
            if (ph === 'twist_predict') return 'predict twist';
            if (ph === 'twist_play') return 'experiment twist';
            if (ph === 'twist_review') return 'review twist';
            if (ph === 'transfer') return 'transfer';
            if (ph === 'test') return 'test';
            if (ph === 'mastery') return 'transfer mastery';
            return ph;
          };
          return (
            <button
              key={p}
              aria-label={getPhaseLabel(p)}
              onClick={() => navigateToPhase(p)}
              style={{
                width: '10px',
                height: '10px',
                minHeight: '10px',
                borderRadius: '50%',
                border: 'none',
                background: i === currentPhaseIndex ? colors.accent : i < currentPhaseIndex ? colors.success : 'rgba(148,163,184,0.7)',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.2s ease',
              }}
            />
          );
        })}
      </div>

      <button
        onClick={phase === 'test' && !testSubmitted ? undefined : goNext}
        disabled={phase === 'test' && !testSubmitted}
        aria-label="Next"
        style={{
          padding: '8px 16px',
          minHeight: '44px',
          borderRadius: '8px',
          border: 'none',
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          cursor: 'pointer',
          fontSize: '14px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontWeight: 'bold',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 8px rgba(245,158,11,0.4)',
        }}
      >
        {phase === 'test' && !testSubmitted ? '→' : 'Next →'}
      </button>
    </nav>
  );

  const renderProgressBar = () => (
    <div
      role="progressbar"
      aria-valuenow={currentPhaseIndex + 1}
      aria-valuemin={1}
      aria-valuemax={phaseOrder.length}
      aria-label={`Progress: phase ${currentPhaseIndex + 1} of ${phaseOrder.length}`}
      style={{
        position: 'fixed',
        top: '52px',
        left: 0,
        right: 0,
        height: '3px',
        background: 'rgba(255,255,255,0.1)',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: `${((currentPhaseIndex + 1) / phaseOrder.length) * 100}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #f59e0b, #10b981)',
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  );

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => {
    // In test phase, the bottom bar Next should be disabled
    const isTestPhase = phase === 'test' && !testSubmitted;
    const effectiveDisabled = isTestPhase ? true : (disabled && !canProceed);
    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '14px 24px',
        background: colors.bgDark,
        borderTop: `1px solid rgba(255,255,255,0.1)`,
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 1001,
        boxShadow: '0 -2px 8px rgba(0,0,0,0.3)',
      }}>
        <button
          onClick={effectiveDisabled ? undefined : goNext}
          disabled={effectiveDisabled}
          style={{
            padding: '12px 32px',
            minHeight: '44px',
            borderRadius: '8px',
            border: 'none',
            background: canProceed && !effectiveDisabled
              ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
              : 'rgba(255,255,255,0.1)',
            color: canProceed && !effectiveDisabled ? 'white' : 'rgba(148,163,184,0.7)',
            fontWeight: 'bold',
            cursor: effectiveDisabled ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            opacity: effectiveDisabled ? 0.5 : 1,
            transition: 'all 0.2s ease',
            boxShadow: canProceed && !effectiveDisabled ? '0 4px 16px rgba(245,158,11,0.3)' : 'none',
          }}
        >
          {buttonText}
        </button>
      </div>
    );
  };

  // Common page wrapper
  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: colors.bgPrimary,
    paddingTop: '56px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif',
  };

  const scrollStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    paddingBottom: '100px',
    paddingTop: '56px',
  };

  const maxWidthStyle: React.CSSProperties = {
    maxWidth: '800px',
    margin: '0 auto',
    width: '100%',
    padding: '0 16px',
  };

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={pageStyle}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={scrollStyle}>
          <div style={{ ...maxWidthStyle, padding: '24px 16px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px', fontWeight: '800', lineHeight: '1.3', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              🎬 The Backward Wheel
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '16px', lineHeight: '1.6', fontWeight: '400' }}>
              Can motion look reversed even if it isn't?
            </p>
            <p style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' }}>
              Explore how cameras sample time and why the wagon-wheel effect demonstrates temporal aliasing — a fundamental concept in signal processing, film, and engineering.
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ ...maxWidthStyle, padding: '16px' }}>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: '1.7', margin: 0, fontWeight: '400' }}>
                Watch any car commercial or Western movie: sometimes the wheels seem to spin
                backward, slow down, or even freeze while the car moves forward!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px', lineHeight: '1.6', margin: '12px 0 0 0' }}>
                This is the <strong style={{ color: colors.accent }}>wagon-wheel effect</strong> — a consequence of how cameras sample continuous motion in discrete frames.
              </p>
            </div>

            <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '16px', borderRadius: '8px', borderLeft: `3px solid ${colors.accent}` }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px', margin: 0, lineHeight: '1.6' }}>
                💡 <strong>How to explore:</strong> Adjust the rotation speed and frame rate sliders above to see how the camera perceives motion differently from reality!
              </p>
            </div>

            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <button
                onClick={goNext}
                style={{
                  padding: '16px 40px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4)',
                  transition: 'all 0.2s ease',
                }}
              >
                Start Discovery →
              </button>
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
      <div style={pageStyle}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={scrollStyle}>
          {renderVisualization(false)}
          <div style={{ ...maxWidthStyle, padding: '16px' }}>
            <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: '16px', fontWeight: '700', lineHeight: '1.4' }}>📋 What You're Looking At:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
                Left: the <strong style={{ color: colors.success }}>true wheel motion</strong> (continuous). Right: what a <strong style={{ color: colors.error }}>camera captures</strong> by taking discrete snapshots at a fixed frame rate. The wheel has 8 spokes.
              </p>
            </div>

            <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontSize: '16px', fontWeight: '700', lineHeight: '1.4' }}>
              🤔 Predict what you'll observe when filming a fast-spinning wheel:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.15)',
                    background: prediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30,41,59,0.5)',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    lineHeight: '1.5',
                    transition: 'all 0.15s ease',
                    boxShadow: prediction === p.id ? '0 2px 8px rgba(245,158,11,0.2)' : 'none',
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
      <div style={pageStyle}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={scrollStyle}>
          <div style={{ ...maxWidthStyle, padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: '22px', fontWeight: '700', lineHeight: '1.4', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              Explore Temporal Aliasing
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
              This visualization shows how discrete sampling causes apparent motion to differ from true motion.
              Adjust the speed and frame rate to observe backward, frozen, and forward aliasing effects.
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

          <div style={{ ...maxWidthStyle, padding: '16px' }}>
            <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h4 style={{ color: colors.accent, marginBottom: '8px', fontSize: '15px', fontWeight: '700', lineHeight: '1.4' }}>🔬 Try These Experiments:</h4>
              <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
                <li>Set speed to <strong style={{ color: colors.accent }}>exactly match spoke rate ÷ fps</strong> → appears frozen!</li>
                <li><strong>Slightly faster</strong> → slow backward motion (aliased!)</li>
                <li><strong>Slightly slower</strong> → slow forward motion</li>
                <li>Change frame rate — aliasing changes completely!</li>
              </ul>
            </div>

            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: `1px solid rgba(59,130,246,0.3)` }}>
              <h4 style={{ color: '#3b82f6', marginBottom: '8px', fontSize: '15px', fontWeight: '700', lineHeight: '1.4' }}>📐 The Formula:</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
                <strong style={{ color: colors.textPrimary, fontFamily: 'monospace' }}>apparent_speed = (true_speed × 360° / fps) mod spoke_spacing</strong>
              </p>
              <p style={{ color: colors.textMuted, fontSize: '13px', lineHeight: '1.6', margin: '8px 0 0 0' }}>
                This equation calculates how much each spoke appears to move per frame, modulo the angular spacing between spokes. When this value exceeds half a spoke spacing, motion appears reversed. This is important in film production, industrial safety, and signal processing engineering.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', border: `2px solid ${colors.success}` }}>
                <div style={{ color: colors.success, fontWeight: 'bold', marginBottom: '6px', fontSize: '14px' }}>✓ True Motion</div>
                <div style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.5' }}>
                  Continuous rotation at {rotationSpeed.toFixed(1)} r/s
                </div>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', border: `2px solid ${colors.error}` }}>
                <div style={{ color: colors.error, fontWeight: 'bold', marginBottom: '6px', fontSize: '14px' }}>✗ Sampled Motion</div>
                <div style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.5' }}>
                  Appears as {Math.abs(apparentSpeed).toFixed(1)} r/s {apparentSpeed < 0 ? 'backward' : apparentSpeed > 0.1 ? 'forward' : 'frozen'}
                </div>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review →')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'backward';

    return (
      <div style={pageStyle}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={scrollStyle}>
          <div style={{ ...maxWidthStyle, padding: '16px' }}>
            <div style={{
              background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              padding: '20px',
              borderRadius: '12px',
              borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
              marginBottom: '16px',
            }}>
              <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontSize: '18px', fontWeight: '700', lineHeight: '1.4' }}>
                {wasCorrect ? '✓ Correct! You observed the aliasing effect.' : '✗ Not Quite — Here\'s What You Observed!'}
              </h3>
              <p style={{ color: colors.textPrimary, margin: 0, lineHeight: '1.6', fontSize: '14px' }}>
                As you saw in the experiment, the wheel can appear to spin backward, stop, or spin forward at the wrong speed — all due to temporal aliasing.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <svg width="100%" height="280" viewBox="0 0 600 280" preserveAspectRatio="xMidYMid meet"
                style={{ background: colors.bgDark, borderRadius: '12px', maxWidth: '600px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
                <defs>
                  <marker id="arrowhead-review" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                    <polygon points="0 0, 10 3, 0 6" fill={colors.accent} />
                  </marker>
                  <linearGradient id="reviewBg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#030712" />
                    <stop offset="100%" stopColor="#0a0f1a" />
                  </linearGradient>
                </defs>
                <rect width="600" height="280" fill="url(#reviewBg)" />

                <text x={300} y={25} textAnchor="middle" fill={colors.accent} fontSize={14} fontWeight="bold">Aliasing Visualization — Time vs. Apparent Position</text>

                <line x1={50} y1={150} x2={540} y2={150} stroke={colors.textMuted} strokeWidth={1.5} markerEnd="url(#arrowhead-review)" />
                <text x={555} y={154} fill={colors.textMuted} fontSize={11}>time</text>

                <path d="M 50 150 Q 90 105, 130 150 T 210 150 T 290 150 T 370 150 T 450 150 T 530 150"
                  fill="none" stroke={colors.success} strokeWidth={2} />
                <text x={52} y={92} fill={colors.success} fontSize={12} fontWeight="bold">True continuous motion</text>

                {[130, 210, 290, 370, 450].map((x, i) => (
                  <circle key={i} cx={x} cy={150} r={5} fill={colors.error} />
                ))}
                <text x={295} y={172} textAnchor="middle" fill={colors.error} fontSize={11}>Camera samples (discrete frames)</text>

                <path d="M 130 150 L 210 145 L 290 140 L 370 135 L 450 130"
                  fill="none" stroke={colors.warning} strokeWidth={2} strokeDasharray="5,5" />
                <text x={295} y={215} textAnchor="middle" fill={colors.warning} fontSize={12} fontWeight="bold">Apparent motion (aliased — appears backward!)</text>

                <text x={300} y={255} textAnchor="middle" fill={colors.textMuted} fontSize={11} fontStyle="italic">
                  Same rotation → Different perceived motion due to discrete sampling
                </text>
              </svg>
            </div>

            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: '17px', fontWeight: '700', lineHeight: '1.4' }}>🎓 The Physics: Why Aliasing Happens</h3>
              <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Discrete Sampling:</strong> Cameras don't
                  see continuous motion — they take snapshots at fixed intervals. As you observed in the experiment, if a spoke moves almost
                  exactly one spoke-spacing between frames, it looks like a tiny motion (possibly backward).
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>The Formula:</strong> apparent_speed = (speed × 360°/fps) <strong>mod</strong> (360°/spokes). When the result exceeds half a spoke spacing, the direction is perceived as reversed. This relationship × = aliasing_shift demonstrates why certain speed/fps combinations create specific illusions.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Nyquist Limit:</strong> To accurately
                  capture motion, you need to sample at least <em>twice</em> as fast as the fastest periodic element.
                  Violating this theorem creates aliasing — false apparent frequencies that result in perceived backward motion.
                </p>
                <p style={{ margin: 0 }}>
                  <strong style={{ color: colors.textPrimary }}>Spoke Ambiguity:</strong> Because spokes
                  are identical, the camera can't distinguish if a spoke moved forward 340° or backward 20° — the observation matches both possibilities.
                </p>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue →')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={pageStyle}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={scrollStyle}>
          <div style={{ ...maxWidthStyle, padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px', fontSize: '22px', fontWeight: '700', lineHeight: '1.4' }}>🔄 The Twist</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
              What if you change the frame rate while keeping wheel speed constant? Watch and think about what will happen.
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{ ...maxWidthStyle, padding: '16px' }}>
            <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: '16px', fontWeight: '700', lineHeight: '1.4' }}>📋 The Setup:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
                The wheel spins at a constant rate. You switch from filming at 24 fps to 30 fps.
                The true motion is unchanged. Observe the different variable: only the frame rate changes.
              </p>
            </div>

            <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontSize: '16px', fontWeight: '700', lineHeight: '1.4' }}>
              🤔 With a different frame rate, what happens to the apparent motion?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.15)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30,41,59,0.5)',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    lineHeight: '1.5',
                    transition: 'all 0.15s ease',
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
      <div style={pageStyle}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={scrollStyle}>
          <div style={{ ...maxWidthStyle, padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px', fontSize: '22px', fontWeight: '700', lineHeight: '1.4' }}>Test Frame Rate Effects</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
              Keep wheel speed fixed and change only the frame rate to observe how sampling frequency affects apparent motion
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

          <div style={{ ...maxWidthStyle, padding: '16px' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '16px', borderRadius: '12px', borderLeft: `3px solid ${colors.warning}` }}>
              <h4 style={{ color: colors.warning, marginBottom: '8px', fontSize: '15px', fontWeight: '700', lineHeight: '1.4' }}>💡 Key Observation:</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
                Changing frame rate completely changes the apparent motion — it might reverse direction,
                speed up, slow down, or freeze at specific rates! The frequency relationship = fps determines which alias we observe.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation →')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'different';

    return (
      <div style={pageStyle}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={scrollStyle}>
          <div style={{ ...maxWidthStyle, padding: '16px' }}>
            <div style={{
              background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              padding: '20px',
              borderRadius: '12px',
              borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
              marginBottom: '16px',
            }}>
              <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontSize: '18px', fontWeight: '700', lineHeight: '1.4' }}>
                {wasCorrect ? '✓ Correct!' : '✗ Not Quite!'}
              </h3>
              <p style={{ color: colors.textPrimary, margin: 0, lineHeight: '1.6', fontSize: '14px' }}>
                Changing frame rate completely changes the apparent motion!
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <svg width="100%" height="270" viewBox="0 0 600 270" preserveAspectRatio="xMidYMid meet"
                style={{ background: colors.bgDark, borderRadius: '12px', maxWidth: '600px' }}>
                <defs>
                  <linearGradient id="twistBg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#030712" />
                    <stop offset="100%" stopColor="#0a0f1a" />
                  </linearGradient>
                </defs>
                <rect width="600" height="270" fill="url(#twistBg)" />
                <text x={300} y={24} textAnchor="middle" fill={colors.warning} fontSize={14} fontWeight="bold">Frame Rate Impact on Perceived Motion</text>

                <g transform="translate(40, 55)">
                  <text x={0} y={0} fill={colors.textPrimary} fontSize={12} fontWeight="bold">24 fps sampling:</text>
                  <circle cx={50} cy={28} r={3.5} fill={colors.accent} />
                  <circle cx={120} cy={28} r={3.5} fill={colors.accent} />
                  <circle cx={190} cy={28} r={3.5} fill={colors.accent} />
                  <circle cx={260} cy={28} r={3.5} fill={colors.accent} />
                  <path d="M 50 28 L 120 33 L 190 38 L 260 43" stroke={colors.error} strokeWidth={2} fill="none" strokeDasharray="4,3" />
                  <text x={310} y={33} fill={colors.error} fontSize={11} fontWeight="bold">Appears backward</text>
                </g>

                <g transform="translate(40, 140)">
                  <text x={0} y={0} fill={colors.textPrimary} fontSize={12} fontWeight="bold">30 fps sampling:</text>
                  <circle cx={40} cy={28} r={3.5} fill={colors.accent} />
                  <circle cx={88} cy={28} r={3.5} fill={colors.accent} />
                  <circle cx={136} cy={28} r={3.5} fill={colors.accent} />
                  <circle cx={184} cy={28} r={3.5} fill={colors.accent} />
                  <circle cx={232} cy={28} r={3.5} fill={colors.accent} />
                  <path d="M 40 28 L 88 23 L 136 18 L 184 23 L 232 28" stroke={colors.success} strokeWidth={2} fill="none" strokeDasharray="4,3" />
                  <text x={280} y={33} fill={colors.success} fontSize={11} fontWeight="bold">Appears forward</text>
                </g>

                <text x={300} y={235} textAnchor="middle" fill={colors.textMuted} fontSize={11} fontStyle="italic">
                  Same true rotation speed → Different perceived motion at each frame rate
                </text>
                <text x={300} y={252} textAnchor="middle" fill={colors.textMuted} fontSize={11}>
                  relationship: apparent = f(true_speed, frame_rate, spoke_count)
                </text>
              </svg>
            </div>

            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ color: colors.warning, marginBottom: '12px', fontSize: '17px', fontWeight: '700', lineHeight: '1.4' }}>🔬 Sampling Determines Perception</h3>
              <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Different Frame Rates, Different Results:</strong> The
                  same true motion can appear as forward, backward, or frozen depending entirely on
                  how often you sample it.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>LED Lighting Effect:</strong> This is
                  why filming under LED or fluorescent lights (which flicker at 50/60 Hz) can create
                  additional aliasing effects — you're effectively getting strobed sampling!
                </p>
                <p style={{ margin: 0 }}>
                  Filmmakers sometimes adjust shutter speed or use ND filters to control motion blur
                  and minimize these aliasing artifacts.
                </p>
              </div>
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
        conceptName="Wagon Wheel Aliasing"
        applications={realWorldApps}
        onComplete={() => setCurrentPhase('test')}
        isMobile={isMobile}
        colors={colors}
      />
    );
  }

  if (phase === 'transfer') {
    return (
      <div style={pageStyle}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={scrollStyle}>
          <div style={{ ...maxWidthStyle, padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center', fontSize: '22px', fontWeight: '700', lineHeight: '1.4' }}>
              🌍 Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px', fontSize: '14px', lineHeight: '1.6' }}>
              Temporal aliasing affects video production, precision measurement, and industrial safety. Explore these 4 industry examples with real statistics from companies like ARRI, Honeywell, and NVIDIA.
            </p>

            {transferApplications.map((app, index) => (
              <div key={index} style={{
                background: colors.bgCard,
                marginBottom: '16px',
                padding: '16px',
                borderRadius: '12px',
                border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
                boxShadow: transferCompleted.has(index) ? `0 0 12px rgba(16,185,129,0.2)` : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ color: colors.textPrimary, fontSize: '16px', margin: 0, fontWeight: '700', lineHeight: '1.4' }}>{app.title}</h3>
                  {transferCompleted.has(index) && <span style={{ color: colors.success, fontSize: '18px' }}>✓</span>}
                </div>
                <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px', lineHeight: '1.6' }}>{app.description}</p>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                  <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold', margin: 0, lineHeight: '1.5' }}>💭 {app.question}</p>
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
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Got It
                  </button>
                ) : (
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                    <p style={{ color: colors.textPrimary, fontSize: '13px', margin: 0, lineHeight: '1.6' }}>{app.answer}</p>
                  </div>
                )}
              </div>
            ))}

            {/* Industry statistics section */}
            <div style={{ background: 'rgba(59,130,246,0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.3)', marginBottom: '16px' }}>
              <h3 style={{ color: '#3b82f6', marginBottom: '12px', fontSize: '16px', fontWeight: '700', lineHeight: '1.4' }}>📊 Industry Statistics</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {realWorldApps[0].stats.map((stat, i) => (
                  <div key={i} style={{ textAlign: 'center', background: 'rgba(30,41,59,0.8)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                    <div style={{ color: colors.accent, fontWeight: 'bold', fontSize: '16px', lineHeight: '1.3' }}>{stat.value}</div>
                    <div style={{ color: colors.textMuted, fontSize: '11px', lineHeight: '1.4', marginTop: '2px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '12px', color: colors.textMuted, fontSize: '12px', lineHeight: '1.5' }}>
                Sources: ARRI, RED Digital Cinema, Monarch Instruments (500K+ industrial stroboscopes at ±0.02% accuracy), Honeywell ($170B annual injury costs), NVIDIA (144Hz gaming, $180B market).
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test →')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={pageStyle}>
          {renderNavBar()}
          {renderProgressBar()}
          <div style={scrollStyle}>
            <div style={{ ...maxWidthStyle, padding: '16px' }}>
              <div style={{
                background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                padding: '24px',
                borderRadius: '12px',
                textAlign: 'center',
                marginBottom: '16px',
                border: `2px solid ${testScore >= 8 ? colors.success : colors.error}`,
              }}>
                <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px', fontSize: '22px', fontWeight: '700', lineHeight: '1.4' }}>
                  {testScore >= 8 ? '🎉 Excellent!' : '📚 Keep Learning!'}
                </h2>
                <p style={{ color: colors.textMuted, fontSize: '14px', margin: '4px 0' }}>You scored:</p>
                <p style={{ color: colors.textPrimary, fontSize: '28px', fontWeight: 'bold', margin: '8px 0' }}>{testScore} / 10</p>
                <p style={{ color: colors.textSecondary, margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                  {testScore >= 8 ? 'Outstanding mastery of temporal aliasing!' : 'Review the material and try again to improve your score.'}
                </p>
              </div>

              <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontSize: '16px', fontWeight: '700', lineHeight: '1.4' }}>📊 Answer Review</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                  {testQuestions.map((q, qIndex) => {
                    const userAnswer = testAnswers[qIndex];
                    const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
                    return (
                      <div key={qIndex} style={{
                        width: '40px', height: '40px', borderRadius: '8px',
                        background: isCorrect ? colors.success : colors.error,
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px', fontWeight: 'bold',
                      }}>
                        {isCorrect ? '✓' : '✗'}
                      </div>
                    );
                  })}
                </div>
              </div>

              {testQuestions.map((q, qIndex) => {
                const userAnswer = testAnswers[qIndex];
                const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
                return (
                  <div key={qIndex} style={{
                    background: colors.bgCard, marginBottom: '12px', padding: '16px', borderRadius: '12px',
                    borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
                    border: `1px solid rgba(255,255,255,0.1)`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                      <div style={{
                        width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                        background: isCorrect ? colors.success : colors.error,
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: 'bold',
                      }}>
                        {isCorrect ? '✓' : '✗'}
                      </div>
                      <p style={{ color: colors.textPrimary, fontWeight: 'bold', margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                        Question {qIndex + 1}: {q.question}
                      </p>
                    </div>
                    {q.options.map((opt, oIndex) => (
                      <div key={oIndex} style={{
                        padding: '6px 10px', marginBottom: '3px', borderRadius: '5px', fontSize: '13px', lineHeight: '1.5',
                        background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                        color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary,
                      }}>
                        {opt.correct ? '✓' : userAnswer === oIndex ? '✗' : '○'} {opt.text}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, padding: '14px 24px',
            background: colors.bgDark, borderTop: `1px solid rgba(255,255,255,0.1)`,
            display: 'flex', justifyContent: 'space-between', zIndex: 1001,
          }}>
            <button
              onClick={() => { setTestSubmitted(false); setTestAnswers(new Array(10).fill(null)); setCurrentTestQuestion(0); setTestScore(0); }}
              style={{
                padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.accent}`,
                background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '14px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontWeight: 'bold', transition: 'all 0.2s ease',
              }}
            >
              ↺ Try Again
            </button>
            <button
              onClick={goNext}
              style={{
                padding: '12px 24px', borderRadius: '8px', border: 'none',
                background: testScore >= 8 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'rgba(255,255,255,0.1)',
                color: testScore >= 8 ? 'white' : colors.textMuted,
                cursor: testScore >= 8 ? 'pointer' : 'not-allowed',
                fontSize: '14px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontWeight: 'bold', transition: 'all 0.2s ease',
              }}
            >
              {testScore >= 8 ? 'Complete Mastery →' : 'Review Material'}
            </button>
          </div>
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={pageStyle}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={scrollStyle}>
          <div style={{ ...maxWidthStyle, padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: '700', margin: 0, lineHeight: '1.4' }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary, fontSize: '15px', fontWeight: '600' }}>
                Question {currentTestQuestion + 1} of {testQuestions.length}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '3px', marginBottom: '20px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{
                  flex: 1, height: '4px', borderRadius: '2px', cursor: 'pointer',
                  background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)',
                }} />
              ))}
            </div>
            {currentQ.scenario && (
              <div style={{ background: 'rgba(59,130,246,0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px', border: '1px solid rgba(59,130,246,0.3)' }}>
                <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0, lineHeight: '1.6', fontStyle: 'italic' }}>
                  📍 Scenario: {currentQ.scenario}
                </p>
              </div>
            )}
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: '1.6', margin: 0, fontWeight: '500' }}>
                {currentQ.question}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                  style={{
                    padding: '14px 16px', borderRadius: '8px', textAlign: 'left', cursor: 'pointer',
                    border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.15)',
                    background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30,41,59,0.5)',
                    color: colors.textPrimary, fontSize: '14px', lineHeight: '1.5',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    transition: 'all 0.15s ease',
                    boxShadow: testAnswers[currentTestQuestion] === oIndex ? '0 2px 8px rgba(245,158,11,0.2)' : 'none',
                  }}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          {testAnswers[currentTestQuestion] !== null && !questionConfirmed && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 16px', maxWidth: '800px', margin: '0 auto' }}>
              <button
                onClick={() => setQuestionConfirmed(true)}
                style={{
                  padding: '10px 24px', borderRadius: '8px', border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white', cursor: 'pointer', fontSize: '14px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontWeight: 'bold', transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
                }}>
                Confirm Answer
              </button>
            </div>
          )}
          {questionConfirmed && (
            <div style={{ ...maxWidthStyle, padding: '8px 16px' }}>
              <div style={{
                background: currentQ.options[testAnswers[currentTestQuestion]!]?.correct
                  ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                padding: '12px 16px', borderRadius: '8px',
                borderLeft: `3px solid ${currentQ.options[testAnswers[currentTestQuestion]!]?.correct ? colors.success : colors.error}`,
                marginBottom: '8px',
              }}>
                {currentQ.options[testAnswers[currentTestQuestion]!]?.correct ? (
                  <p style={{ color: colors.success, margin: 0, fontSize: '14px', fontWeight: '600' }}>
                    ✓ Correct! The correct answer is {currentQ.options.find(o => o.correct)?.text}.
                  </p>
                ) : (
                  <p style={{ color: colors.error, margin: 0, fontSize: '14px', fontWeight: '600' }}>
                    ✗ Not quite. The correct answer is: {currentQ.options.find(o => o.correct)?.text}.
                    Because temporal aliasing occurs when the sampling rate is insufficient to capture true motion.
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    setQuestionConfirmed(false);
                    if (currentTestQuestion < testQuestions.length - 1) {
                      setCurrentTestQuestion(currentTestQuestion + 1);
                    } else {
                      submitTest();
                    }
                  }}
                  style={{
                    padding: '10px 24px', borderRadius: '8px', border: 'none',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: 'white', cursor: 'pointer', fontSize: '14px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontWeight: 'bold', transition: 'all 0.2s ease',
                  }}>
                  {currentTestQuestion < testQuestions.length - 1 ? 'Next Question →' : 'Submit Test ✓'}
                </button>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 16px', maxWidth: '800px', margin: '0 auto' }}>
            <button onClick={() => { setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1)); setQuestionConfirmed(false); }}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '10px 20px', borderRadius: '8px',
                border: `1px solid ${colors.textMuted}`, background: 'transparent',
                color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontWeight: '600', transition: 'all 0.2s ease',
              }}>
              ← Back
            </button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => { setCurrentTestQuestion(currentTestQuestion + 1); setQuestionConfirmed(false); }}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white', cursor: 'pointer', fontSize: '14px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontWeight: 'bold', transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
                }}>
                Next Question →
              </button>
            ) : (
              <button onClick={submitTest}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  background: testAnswers.includes(null)
                    ? 'rgba(255,255,255,0.1)'
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  fontSize: '14px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontWeight: 'bold', transition: 'all 0.2s ease',
                  opacity: testAnswers.includes(null) ? 0.5 : 1,
                }}>
                Submit Test ✓
              </button>
            )}
          </div>
        </div>
        {/* Bottom bar is present but disabled during active test */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, padding: '14px 24px',
          background: colors.bgDark, borderTop: `1px solid rgba(255,255,255,0.1)`,
          display: 'flex', justifyContent: 'flex-end', zIndex: 1001,
        }}>
          <button
            disabled={true}
            style={{
              padding: '12px 32px', minHeight: '44px', borderRadius: '8px', border: 'none',
              background: 'rgba(255,255,255,0.1)', color: 'rgba(148,163,184,0.7)',
              fontWeight: 'bold', cursor: 'not-allowed', fontSize: '16px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              opacity: 0.4,
            }}
          >
            Next →
          </button>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={pageStyle}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={scrollStyle}>
          <div style={{ ...maxWidthStyle, padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px', fontSize: '28px', fontWeight: '800', lineHeight: '1.3', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              Mastery Achieved!
            </h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px', fontSize: '16px', lineHeight: '1.6', fontWeight: '400' }}>
              You've mastered temporal aliasing and the wagon-wheel effect — a concept used in film, engineering, and signal processing worldwide.
            </p>
          </div>
          <div style={{ ...maxWidthStyle, padding: '0 16px 16px 16px' }}>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: '17px', fontWeight: '700', lineHeight: '1.4' }}>🎓 Key Concepts Mastered:</h3>
              <ul style={{ color: colors.textSecondary, lineHeight: '1.8', paddingLeft: '20px', margin: 0, fontSize: '14px' }}>
                <li>Discrete sampling creates temporal aliasing artifacts</li>
                <li>Nyquist limit: sample at ≥ 2× the highest frequency to avoid aliasing</li>
                <li>Frame rate determines apparent motion — not just clarity</li>
                <li>LED flicker (50/60 Hz) and stroboscopic effects follow the same mathematics</li>
                <li>Formula: apparent = (speed × 360°/fps) mod spoke_spacing</li>
              </ul>
            </div>
            {renderVisualization(true)}
          </div>
        </div>
        {renderBottomBar(false, true, 'Complete Game →')}
      </div>
    );
  }

  // Fallback (should not reach here)
  return (
    <div style={pageStyle}>
      {renderNavBar()}
      {renderProgressBar()}
      <div style={scrollStyle}>
        <div style={{ ...maxWidthStyle, padding: '24px 16px', textAlign: 'center' }}>
          <p style={{ color: colors.textSecondary, fontSize: '16px', lineHeight: '1.6' }}>Loading...</p>
        </div>
      </div>
    </div>
  );
};

export default WagonWheelAliasingRenderer;
