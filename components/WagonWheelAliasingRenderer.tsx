import React, { useState, useEffect, useCallback } from 'react';

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
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#e2e8f0', // Changed from #94a3b8 for better contrast
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

const phaseOrder = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'] as const;

const WagonWheelAliasingRenderer: React.FC<WagonWheelAliasingRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
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

  // Calculate apparent motion
  const getApparentSpeed = useCallback(() => {
    // Degrees per frame at true speed
    const degreesPerFrame = (rotationSpeed * 360) / frameRate;
    // Spoke spacing in degrees
    const spokeSpacing = 360 / numSpokes;
    // Aliased movement per frame (modulo spoke spacing)
    let apparentPerFrame = degreesPerFrame % spokeSpacing;
    // If more than half spoke spacing, it appears to go backward
    if (apparentPerFrame > spokeSpacing / 2) {
      apparentPerFrame = apparentPerFrame - spokeSpacing;
    }
    // Convert back to apparent rotations per second
    return (apparentPerFrame * frameRate) / 360;
  }, [rotationSpeed, frameRate, numSpokes]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setTime(prev => prev + 1 / 60);
      setTrueAngle(prev => (prev + rotationSpeed * 360 / 60) % 360);

      // Sample at frame rate
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
      question: 'What causes the wagon-wheel effect in video?',
      options: [
        { text: 'The wheel actually reverses direction', correct: false },
        { text: 'Temporal aliasing from discrete frame sampling', correct: true },
        { text: 'An optical illusion in the human eye', correct: false },
        { text: 'Motion blur averaging', correct: false },
      ],
    },
    {
      question: 'A wheel with 8 spokes spinning at 8 rotations/second filmed at 8 fps will appear:',
      options: [
        { text: 'Spinning very fast forward', correct: false },
        { text: 'Spinning backward', correct: false },
        { text: 'Stationary (frozen)', correct: true },
        { text: 'Blurred', correct: false },
      ],
    },
    {
      question: 'If a wheel appears to spin backward on video, the true rotation is:',
      options: [
        { text: 'Actually backward', correct: false },
        { text: 'Forward, but slightly less than a spoke spacing per frame', correct: false },
        { text: 'Forward, but slightly more than a spoke spacing per frame', correct: true },
        { text: 'Zero - the wheel is stopped', correct: false },
      ],
    },
    {
      question: 'The Nyquist theorem states that to avoid aliasing, you must sample at:',
      options: [
        { text: 'The same frequency as the signal', correct: false },
        { text: 'At least twice the signal frequency', correct: true },
        { text: 'Half the signal frequency', correct: false },
        { text: 'Any frequency works', correct: false },
      ],
    },
    {
      question: 'Increasing frame rate while wheel speed stays constant will:',
      options: [
        { text: 'Always make the wheel appear faster', correct: false },
        { text: 'Change the apparent motion, possibly reducing aliasing', correct: true },
        { text: 'Have no effect on apparent motion', correct: false },
        { text: 'Always reverse the apparent direction', correct: false },
      ],
    },
    {
      question: 'The wagon wheel effect can also occur in real life under:',
      options: [
        { text: 'Any lighting conditions', correct: false },
        { text: 'Flickering light sources (strobes, some LEDs)', correct: true },
        { text: 'Only in complete darkness', correct: false },
        { text: 'Only in bright sunlight', correct: false },
      ],
    },
    {
      question: 'When filming a car wheel at highway speed, why might it appear nearly stationary?',
      options: [
        { text: 'The car is going slow', correct: false },
        { text: 'Motion blur averages everything out', correct: false },
        { text: 'Frame rate nearly matches spoke passage rate', correct: true },
        { text: 'The camera is broken', correct: false },
      ],
    },
    {
      question: 'Aliasing in the wagon wheel effect is similar to:',
      options: [
        { text: 'Color mixing in painting', correct: false },
        { text: 'Beat frequencies in audio', correct: true },
        { text: 'Lens distortion', correct: false },
        { text: 'Depth of field effects', correct: false },
      ],
    },
    {
      question: 'To show true wheel motion without aliasing at 30 fps, the wheel should spin at most:',
      options: [
        { text: '30 rotations per second', correct: false },
        { text: '15 rotations per second (Nyquist limit)', correct: true },
        { text: '60 rotations per second', correct: false },
        { text: 'Speed doesn\'t matter', correct: false },
      ],
    },
    {
      question: 'In old Western movies, stagecoach wheels often appeared to spin backward because:',
      options: [
        { text: 'They filmed in reverse', correct: false },
        { text: 'The horses were trained that way', correct: false },
        { text: 'Low frame rates caused aliasing with wheel rotation', correct: true },
        { text: 'It was a special effect', correct: false },
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
    const width = 700;
    const height = 400;
    const wheelRadius = 75;
    const apparentSpeed = getApparentSpeed();

    // Calculate apparent angle based on sampled frames
    const apparentAngle = sampledAngles.length > 0 ? sampledAngles[sampledAngles.length - 1] : 0;

    // Determine motion direction for coloring
    const motionDirection = apparentSpeed > 0.1 ? 'forward' : apparentSpeed < -0.1 ? 'backward' : 'stopped';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: colors.bgDark, borderRadius: '12px', maxWidth: '700px' }}
        >
          <defs>
            {/* Premium wheel rim gradient - metallic finish */}
            <linearGradient id="wwaWheelRim" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="25%" stopColor="#94a3b8" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="75%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* Inner wheel hub gradient */}
            <radialGradient id="wwaWheelHub" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#cbd5e1" />
              <stop offset="40%" stopColor="#64748b" />
              <stop offset="70%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1e293b" />
            </radialGradient>

            {/* Sampled wheel rim - red tinted */}
            <linearGradient id="wwaSampledRim" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#991b1b" />
              <stop offset="25%" stopColor="#dc2626" />
              <stop offset="50%" stopColor="#f87171" />
              <stop offset="75%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>

            {/* Sampled wheel hub */}
            <radialGradient id="wwaSampledHub" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="40%" stopColor="#ef4444" />
              <stop offset="70%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#450a0a" />
            </radialGradient>

            {/* Spoke gradient - silver steel */}
            <linearGradient id="wwaSpokeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="30%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="70%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Camera body gradient */}
            <linearGradient id="wwaCameraBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="20%" stopColor="#1f2937" />
              <stop offset="50%" stopColor="#111827" />
              <stop offset="80%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>

            {/* Camera lens gradient */}
            <radialGradient id="wwaCameraLens" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#3b82f6" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#1e40af" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#1e3a8a" stopOpacity="1" />
            </radialGradient>

            {/* Frame capture flash */}
            <radialGradient id="wwaFrameFlash" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
              <stop offset="40%" stopColor="#facc15" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#eab308" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ca8a04" stopOpacity="0" />
            </radialGradient>

            {/* Direction arrow gradient - forward (green) */}
            <linearGradient id="wwaArrowForward" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>

            {/* Direction arrow gradient - backward (red) */}
            <linearGradient id="wwaArrowBackward" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f87171" />
            </linearGradient>

            {/* Stopped indicator gradient */}
            <linearGradient id="wwaStoppedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>

            {/* Background gradient */}
            <linearGradient id="wwaLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="50%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Tire rubber gradient */}
            <linearGradient id="wwaTireRubber" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1c1917" />
              <stop offset="30%" stopColor="#292524" />
              <stop offset="50%" stopColor="#1c1917" />
              <stop offset="70%" stopColor="#292524" />
              <stop offset="100%" stopColor="#0c0a09" />
            </linearGradient>

            {/* Wheel glow filter - true motion */}
            <filter id="wwaWheelGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Sampled wheel glow filter */}
            <filter id="wwaSampledGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Camera flash glow */}
            <filter id="wwaFlashGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Text glow filter */}
            <filter id="wwaTextGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Arrow glow filter */}
            <filter id="wwaArrowGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Sampling line pattern */}
            <pattern id="wwaSamplingPattern" width="8" height="8" patternUnits="userSpaceOnUse">
              <rect width="8" height="8" fill="none" />
              <line x1="0" y1="8" x2="8" y2="0" stroke="#fbbf24" strokeWidth="1" strokeOpacity="0.5" />
            </pattern>

            {/* Grid pattern for background */}
            <pattern id="wwaGridPattern" width="30" height="30" patternUnits="userSpaceOnUse">
              <rect width="30" height="30" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
          </defs>

          {/* Background */}
          <rect width={width} height={height} fill="url(#wwaLabBg)" />
          <rect width={width} height={height} fill="url(#wwaGridPattern)" />

          {/* Title area */}
          <text x={width / 2} y={28} textAnchor="middle" fill={colors.accent} fontSize={18} fontWeight="bold" filter="url(#wwaTextGlow)">
            Wagon Wheel Aliasing Demonstration
          </text>

          {/* === TRUE WHEEL SECTION (Left) === */}
          <g transform={`translate(160, 185)`}>
            {/* Section label */}
            <text x={0} y={-wheelRadius - 32} textAnchor="middle" fill={colors.textPrimary} fontSize={13} fontWeight="bold">
              ACTUAL
            </text>
            <text x={0} y={-wheelRadius - 20} textAnchor="middle" fill={colors.textSecondary} fontSize={11}>
              True Motion
            </text>

            {/* Outer tire */}
            <circle cx={0} cy={0} r={wheelRadius + 12} fill="url(#wwaTireRubber)" filter="url(#wwaWheelGlow)" />

            {/* Wheel rim */}
            <circle cx={0} cy={0} r={wheelRadius} fill="none" stroke="url(#wwaWheelRim)" strokeWidth={8} />

            {/* Inner rim detail */}
            <circle cx={0} cy={0} r={wheelRadius - 12} fill="none" stroke="#475569" strokeWidth={2} />

            {/* Hub */}
            <circle cx={0} cy={0} r={20} fill="url(#wwaWheelHub)" />
            <circle cx={0} cy={0} r={8} fill="#1e293b" />
            <circle cx={0} cy={0} r={4} fill="#64748b" />

            {/* Spokes with gradient */}
            {Array.from({ length: numSpokes }).map((_, i) => {
              const angle = (trueAngle + i * 360 / numSpokes) * Math.PI / 180;
              const x2 = (wheelRadius - 14) * Math.cos(angle);
              const y2 = (wheelRadius - 14) * Math.sin(angle);
              const x1 = 18 * Math.cos(angle);
              const y1 = 18 * Math.sin(angle);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="url(#wwaSpokeGradient)"
                  strokeWidth={5}
                  strokeLinecap="round"
                />
              );
            })}

            {/* Rotation indicator arrow (curved) */}
            <g transform={`rotate(${trueAngle})`}>
              <path
                d={`M ${wheelRadius + 25} -10 A ${wheelRadius + 25} ${wheelRadius + 25} 0 0 1 ${wheelRadius + 25} 10`}
                fill="none"
                stroke="url(#wwaArrowForward)"
                strokeWidth={3}
                strokeLinecap="round"
                filter="url(#wwaArrowGlow)"
              />
              <polygon
                points={`${wheelRadius + 25},15 ${wheelRadius + 20},5 ${wheelRadius + 30},5`}
                fill="url(#wwaArrowForward)"
              />
            </g>

            {/* Speed display */}
            <rect x={-50} y={wheelRadius + 28} width={100} height={24} rx={6} fill="rgba(16, 185, 129, 0.2)" stroke={colors.success} strokeWidth={1} />
            <text x={0} y={wheelRadius + 45} textAnchor="middle" fill={colors.success} fontSize={12} fontWeight="bold">
              {rotationSpeed.toFixed(1)} rot/s
            </text>

            {/* Interactive marker - reference spoke */}
            <circle
              cx={(wheelRadius - 14) * Math.cos(0)}
              cy={(wheelRadius - 14) * Math.sin(0)}
              r={8}
              fill={colors.success}
              opacity={0.6}
              filter="url(#wwaWheelGlow)"
            />
          </g>

          {/* === CAMERA / SAMPLING VISUALIZATION (Center) === */}
          <g transform={`translate(${width / 2}, 185)`}>
            {/* Camera body */}
            <rect x={-25} y={-60} width={50} height={35} rx={6} fill="url(#wwaCameraBody)" stroke="#4b5563" strokeWidth={1.5} />
            <rect x={-20} y={-55} width={40} height={25} rx={4} fill="#0f172a" />

            {/* Camera lens */}
            <circle cx={0} cy={-42} r={12} fill="url(#wwaCameraLens)" stroke="#1e40af" strokeWidth={2} />
            <circle cx={-4} cy={-46} r={3} fill="rgba(255,255,255,0.3)" />

            {/* Recording indicator */}
            <circle cx={18} cy={-55} r={4} fill={isPlaying ? "#ef4444" : "#6b7280"}>
              {isPlaying && (
                <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
              )}
            </circle>

            {/* Frame rate display panel */}
            <rect x={-50} y={-20} width={100} height={45} rx={6} fill="rgba(30, 41, 59, 0.9)" stroke="#475569" strokeWidth={1} />
            <text x={0} y={-3} textAnchor="middle" fill={colors.accent} fontSize={11} fontWeight="bold">
              FRAME RATE
            </text>
            <text x={0} y={15} textAnchor="middle" fill={colors.textPrimary} fontSize={15} fontWeight="bold">
              {frameRate} fps
            </text>

            {/* Sampling timeline visualization */}
            <g transform="translate(0, 60)">
              <rect x={-60} y={-8} width={120} height={38} rx={4} fill="rgba(15, 23, 42, 0.8)" stroke="#334155" strokeWidth={1} />
              <text x={0} y={5} textAnchor="middle" fill={colors.textMuted} fontSize={11}>
                SAMPLES PER SECOND
              </text>
              {/* Sampling ticks */}
              {Array.from({ length: Math.min(frameRate / 4, 12) }).map((_, i) => (
                <rect
                  key={i}
                  x={-55 + i * (110 / Math.min(frameRate / 4, 12))}
                  y={13}
                  width={3}
                  height={12}
                  fill={colors.accent}
                  opacity={0.7 + (i % 2) * 0.3}
                />
              ))}
            </g>

            {/* Camera flash effect when playing */}
            {isPlaying && (
              <circle cx={0} cy={-42} r={20} fill="url(#wwaFrameFlash)" filter="url(#wwaFlashGlow)" opacity={0.6}>
                <animate attributeName="opacity" values="0.6;0.1;0.6" dur={`${1000 / frameRate}ms`} repeatCount="indefinite" />
              </circle>
            )}
          </g>

          {/* === SAMPLED/APPARENT WHEEL (Right) === */}
          <g transform={`translate(540, 185)`}>
            {/* Section label */}
            <text x={0} y={-wheelRadius - 32} textAnchor="middle" fill={colors.textPrimary} fontSize={13} fontWeight="bold">
              APPARENT
            </text>
            <text x={0} y={-wheelRadius - 20} textAnchor="middle" fill={colors.textSecondary} fontSize={11}>
              Camera View
            </text>

            {/* Outer tire - red tinted */}
            <circle cx={0} cy={0} r={wheelRadius + 12} fill="url(#wwaTireRubber)" filter="url(#wwaSampledGlow)" />

            {/* Wheel rim - sampled version */}
            <circle cx={0} cy={0} r={wheelRadius} fill="none" stroke="url(#wwaSampledRim)" strokeWidth={8} />

            {/* Inner rim detail */}
            <circle cx={0} cy={0} r={wheelRadius - 12} fill="none" stroke="#991b1b" strokeWidth={2} />

            {/* Hub - sampled */}
            <circle cx={0} cy={0} r={20} fill="url(#wwaSampledHub)" />
            <circle cx={0} cy={0} r={8} fill="#450a0a" />
            <circle cx={0} cy={0} r={4} fill="#ef4444" />

            {/* Spokes with gradient */}
            {Array.from({ length: numSpokes }).map((_, i) => {
              const angle = (apparentAngle + i * 360 / numSpokes) * Math.PI / 180;
              const x2 = (wheelRadius - 14) * Math.cos(angle);
              const y2 = (wheelRadius - 14) * Math.sin(angle);
              const x1 = 18 * Math.cos(angle);
              const y1 = 18 * Math.sin(angle);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="url(#wwaSpokeGradient)"
                  strokeWidth={5}
                  strokeLinecap="round"
                />
              );
            })}

            {/* Apparent rotation indicator - changes based on direction */}
            {motionDirection === 'forward' && (
              <g transform={`rotate(${apparentAngle})`} filter="url(#wwaArrowGlow)">
                <path
                  d={`M ${wheelRadius + 25} -10 A ${wheelRadius + 25} ${wheelRadius + 25} 0 0 1 ${wheelRadius + 25} 10`}
                  fill="none"
                  stroke="url(#wwaArrowForward)"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                <polygon
                  points={`${wheelRadius + 25},15 ${wheelRadius + 20},5 ${wheelRadius + 30},5`}
                  fill="url(#wwaArrowForward)"
                />
              </g>
            )}
            {motionDirection === 'backward' && (
              <g transform={`rotate(${apparentAngle})`} filter="url(#wwaArrowGlow)">
                <path
                  d={`M ${wheelRadius + 25} 10 A ${wheelRadius + 25} ${wheelRadius + 25} 0 0 0 ${wheelRadius + 25} -10`}
                  fill="none"
                  stroke="url(#wwaArrowBackward)"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                <polygon
                  points={`${wheelRadius + 25},-15 ${wheelRadius + 20},-5 ${wheelRadius + 30},-5`}
                  fill="url(#wwaArrowBackward)"
                />
              </g>
            )}
            {motionDirection === 'stopped' && (
              <g>
                <rect x={wheelRadius + 15} y={-12} width={20} height={24} rx={4} fill="url(#wwaStoppedGradient)" filter="url(#wwaArrowGlow)" />
                <rect x={wheelRadius + 20} y={-6} width={4} height={12} fill="#0f172a" />
                <rect x={wheelRadius + 26} y={-6} width={4} height={12} fill="#0f172a" />
              </g>
            )}

            {/* Apparent speed display */}
            <rect
              x={-60}
              y={wheelRadius + 28}
              width={120}
              height={24}
              rx={6}
              fill={motionDirection === 'forward' ? 'rgba(16, 185, 129, 0.2)' : motionDirection === 'backward' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}
              stroke={motionDirection === 'forward' ? colors.success : motionDirection === 'backward' ? colors.error : colors.warning}
              strokeWidth={1}
            />
            <text
              x={0}
              y={wheelRadius + 45}
              textAnchor="middle"
              fill={motionDirection === 'forward' ? colors.success : motionDirection === 'backward' ? colors.error : colors.warning}
              fontSize={11}
              fontWeight="bold"
            >
              {motionDirection === 'stopped' ? 'STOPPED' : `${Math.abs(apparentSpeed).toFixed(1)} rot/s ${motionDirection === 'backward' ? 'BACK' : ''}`}
            </text>

            {/* Interactive marker - sampled spoke */}
            <circle
              cx={(wheelRadius - 14) * Math.cos((apparentAngle * Math.PI) / 180)}
              cy={(wheelRadius - 14) * Math.sin((apparentAngle * Math.PI) / 180)}
              r={8}
              fill={colors.error}
              opacity={0.8}
              filter="url(#wwaSampledGlow)"
            />
          </g>

          {/* === BOTTOM INFO PANEL === */}
          <g transform={`translate(${width / 2}, ${height - 30})`}>
            <rect x={-280} y={-30} width={560} height={60} rx={8} fill="rgba(30, 41, 59, 0.95)" stroke="#475569" strokeWidth={1} />

            {/* Left info: Spoke spacing */}
            <g transform="translate(-200, -5)">
              <text x={0} y={0} textAnchor="middle" fill={colors.textMuted} fontSize={11}>SPOKE SPACING</text>
              <text x={0} y={18} textAnchor="middle" fill={colors.textSecondary} fontSize={13} fontWeight="bold">{(360 / numSpokes).toFixed(0)}deg</text>
            </g>

            {/* Center info: Movement per frame */}
            <g transform="translate(0, -5)">
              <text x={0} y={0} textAnchor="middle" fill={colors.textMuted} fontSize={11}>MOVEMENT/FRAME</text>
              <text x={0} y={18} textAnchor="middle" fill={colors.accent} fontSize={13} fontWeight="bold">{((rotationSpeed * 360) / frameRate).toFixed(1)}deg</text>
            </g>

            {/* Right info: Aliased movement */}
            <g transform="translate(200, -5)">
              <text x={0} y={0} textAnchor="middle" fill={colors.textMuted} fontSize={11}>ALIASED SHIFT</text>
              <text
                x={0}
                y={18}
                textAnchor="middle"
                fill={motionDirection === 'forward' ? colors.success : motionDirection === 'backward' ? colors.error : colors.warning}
                fontSize={13}
                fontWeight="bold"
              >
                {(() => {
                  const degreesPerFrame = (rotationSpeed * 360) / frameRate;
                  const spokeSpacing = 360 / numSpokes;
                  let apparentPerFrame = degreesPerFrame % spokeSpacing;
                  if (apparentPerFrame > spokeSpacing / 2) {
                    apparentPerFrame = apparentPerFrame - spokeSpacing;
                  }
                  return `${apparentPerFrame >= 0 ? '+' : ''}${apparentPerFrame.toFixed(1)}deg`;
                })()}
              </text>
            </g>
          </g>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                padding: '14px 28px',
                borderRadius: '10px',
                border: 'none',
                background: isPlaying
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '15px',
                boxShadow: isPlaying
                  ? '0 4px 20px rgba(239, 68, 68, 0.4)'
                  : '0 4px 20px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={resetSimulation}
              style={{
                padding: '14px 28px',
                borderRadius: '10px',
                border: `2px solid ${colors.accent}`,
                background: 'rgba(245, 158, 11, 0.1)',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '15px',
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
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          True Rotation Speed: {rotationSpeed.toFixed(1)} rotations/sec
        </label>
        <input
          type="range"
          min="1"
          max="15"
          step="0.5"
          value={rotationSpeed}
          onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
          style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Camera Frame Rate: {frameRate} fps
        </label>
        <input
          type="range"
          min="10"
          max="60"
          step="1"
          value={frameRate}
          onChange={(e) => setFrameRate(parseInt(e.target.value))}
          style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
        />
      </div>

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', marginBottom: '4px' }}>
          Apparent speed: {getApparentSpeed().toFixed(2)} rot/s
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          {getApparentSpeed() > 0 ? '→ Forward motion' : getApparentSpeed() < 0 ? '← Backward motion (aliased!)' : '⏸ Appears frozen'}
        </div>
      </div>
    </div>
  );

  const currentPhaseIndex = phaseOrder.indexOf(phase as typeof phaseOrder[number]);

  const renderNavBar = () => (
    <nav
      aria-label="Game navigation"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        padding: '12px 24px',
        background: colors.bgDark,
        borderBottom: `1px solid rgba(255,255,255,0.1)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1001,
      }}
    >
      <button
        onClick={() => {
          if (currentPhaseIndex > 0) {
            // Navigate back - this would need parent handling
          }
        }}
        aria-label="Back"
        style={{
          padding: '8px 16px',
          minHeight: '44px',
          borderRadius: '8px',
          border: `1px solid ${colors.textMuted}`,
          background: 'transparent',
          color: currentPhaseIndex === 0 ? 'rgba(255,255,255,0.3)' : colors.textPrimary,
          cursor: currentPhaseIndex === 0 ? 'not-allowed' : 'pointer',
          fontSize: '14px',
        }}
        disabled={currentPhaseIndex === 0}
      >
        Back
      </button>

      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {phaseOrder.map((p, i) => {
          const getPhaseLabel = (phase: string) => {
            if (phase === 'hook') return 'explore';
            if (phase === 'predict') return 'predict';
            if (phase === 'play') return 'experiment';
            if (phase === 'review') return 'review';
            if (phase === 'twist_predict') return 'predict';
            if (phase === 'twist_play') return 'experiment';
            if (phase === 'twist_review') return 'review';
            if (phase === 'transfer') return 'apply';
            if (phase === 'test') return 'quiz';
            if (phase === 'mastery') return 'mastery';
            return phase;
          };
          return (
            <button
              key={p}
              aria-label={getPhaseLabel(p)}
              onClick={() => {
                // Navigation dot click - would need parent handling
              }}
              style={{
                width: '10px',
                height: '10px',
                minHeight: '10px',
                borderRadius: '50%',
                border: 'none',
                background: i === currentPhaseIndex ? colors.accent : i < currentPhaseIndex ? colors.success : 'rgba(148,163,184,0.7)',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          );
        })}
      </div>

      <button
        onClick={onPhaseComplete}
        aria-label="Next"
        style={{
          padding: '8px 16px',
          minHeight: '44px',
          borderRadius: '8px',
          border: 'none',
          background: colors.accent,
          color: 'white',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
        }}
      >
        Next
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
        top: '68px',
        left: 0,
        right: 0,
        height: '4px',
        background: 'rgba(255,255,255,0.1)',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: `${((currentPhaseIndex + 1) / phaseOrder.length) * 100}%`,
          height: '100%',
          background: colors.accent,
          transition: 'width 0.3s ease',
        }}
      />
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
      zIndex: 1001,
    }}>
      <button
        onClick={onPhaseComplete}
        disabled={disabled && !canProceed}
        style={{
          padding: '12px 32px',
          minHeight: '44px',
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, paddingTop: '48px' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              🎬 The Backward Wheel
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Can motion look reversed even if it isn't?
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
                Watch any car commercial or Western movie: sometimes the wheels seem to spin
                backward, slow down, or even freeze while the car moves forward!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                This is the wagon-wheel effect - a consequence of how cameras sample time.
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                💡 Adjust the rotation speed and watch what the "camera" sees!
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, paddingTop: '48px' }}>
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
              Left: the true wheel motion (continuous). Right: what a camera captures
              by taking snapshots at a fixed frame rate. The wheel has 8 spokes.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              🤔 When you film a fast-spinning wheel, what might you see?
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
                    background: prediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, paddingTop: '48px' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Temporal Aliasing</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust speed and frame rate to see backward, frozen, and forward motion
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
              <li>Set speed to exactly match spoke rate ÷ fps → frozen!</li>
              <li>Slightly faster → slow backward motion</li>
              <li>Slightly slower → slow forward motion</li>
              <li>Change frame rate - aliasing changes!</li>
            </ul>
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, paddingTop: '48px' }}>
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
              The wheel can appear to spin backward, stop, or spin forward at the wrong speed!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🎓 The Physics of Aliasing</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Discrete Sampling:</strong> Cameras don't
                see continuous motion - they take snapshots at fixed intervals. If a spoke moves almost
                exactly one spoke-spacing between frames, it looks like a tiny motion (possibly backward).
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Nyquist Limit:</strong> To accurately
                capture motion, you need to sample at least twice as fast as the fastest frequency.
                Violating this creates aliasing - false apparent frequencies.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Spoke Ambiguity:</strong> Because spokes
                are identical, the camera can't tell if a spoke moved forward 340° or backward 20°!
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, paddingTop: '48px' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>🔄 The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What if you change the frame rate while keeping wheel speed constant?
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
              The wheel spins at a constant rate. You switch from filming at 24 fps to 30 fps.
              The true motion is unchanged.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, paddingTop: '48px' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Frame Rate Effects</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Keep wheel speed fixed and change only the frame rate
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
              Changing frame rate completely changes the apparent motion - it might reverse,
              speed up, slow down, or freeze at specific rates!
            </p>
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, paddingTop: '48px' }}>
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
              Changing frame rate completely changes the apparent motion!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>🔬 Sampling Determines Perception</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Different Frame Rates, Different Results:</strong> The
                same true motion can appear as forward, backward, or frozen depending entirely on
                how often you sample it.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>LED Lighting Effect:</strong> This is
                why filming under LED or fluorescent lights (which flicker at 50/60 Hz) can create
                additional aliasing effects - you're effectively getting strobed sampling!
              </p>
              <p>
                Filmmakers sometimes adjust shutter speed or use ND filters to control motion blur
                and minimize these aliasing artifacts.
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, paddingTop: '48px' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              🌍 Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Temporal aliasing affects video, measurement, and perception
            </p>
          </div>

          {transferApplications.map((app, index) => (
            <div key={index} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>✓</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>💭 {app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))} style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px' }}>Reveal Answer</button>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
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
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, paddingTop: '48px' }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{ background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', margin: '16px', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>{testScore >= 8 ? '🎉 Excellent!' : '📚 Keep Learning!'}</h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, paddingTop: '48px' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (<div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>{opt.text}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>← Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer' }}>Next →</button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer' }}>Submit Test</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, paddingTop: '48px' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered temporal aliasing and the wagon-wheel effect</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🎓 Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Discrete sampling creates aliasing artifacts</li>
              <li>Nyquist limit for accurate motion capture</li>
              <li>Frame rate determines apparent motion</li>
              <li>LED flicker and stroboscopic effects</li>
            </ul>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game →')}
      </div>
    );
  }

  return null;
};

export default WagonWheelAliasingRenderer;
