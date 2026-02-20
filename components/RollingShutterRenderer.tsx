import React, { useState, useEffect, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

const realWorldApps = [
  {
    icon: '📱',
    title: 'Smartphone Camera Design',
    short: 'Understanding rolling shutter helps engineers and users minimize distortion artifacts',
    tagline: 'Why your phone warps fast motion',
    description: 'Every smartphone camera uses a CMOS rolling shutter that scans the image line by line. Fast-moving objects or camera shake during this scan creates characteristic distortions - propellers become curved, guitars strings wobble, and buildings lean during quick pans. Camera engineers work to minimize readout time while users learn to avoid problematic shots.',
    connection: 'This game teaches exactly how sequential line readout creates rolling shutter distortion - the physics behind artifacts you see in everyday phone photos.',
    howItWorks: 'CMOS sensors read pixels row by row, taking 10-30ms to scan the full frame. Objects moving during this time are captured at different positions in different rows. The result: straight objects appear curved or tilted. Faster readout speeds and computational correction reduce but do not eliminate the effect.',
    stats: [
      { value: '10-30ms', label: 'Typical readout time', icon: '⏱️' },
      { value: '12-200 MP', label: 'Phone sensor resolution', icon: '📸' },
      { value: '1.4B', label: 'Smartphones sold yearly', icon: '📱' }
    ],
    examples: ['iPhone cameras', 'Samsung Galaxy', 'Google Pixel', 'OnePlus cameras'],
    companies: ['Apple', 'Samsung', 'Sony Semiconductor', 'OmniVision'],
    futureImpact: 'Stacked CMOS sensors with global shutter capability may eventually eliminate rolling shutter artifacts in smartphones.',
    color: '#3B82F6'
  },
  {
    icon: '🎬',
    title: 'Cinema Camera Technology',
    short: 'Professional cameras balance rolling shutter with dynamic range and resolution',
    tagline: 'The art of motion picture capture',
    description: 'Cinema cameras face rolling shutter tradeoffs more acutely than phones. Large sensors with high dynamic range take longer to read out. Directors of photography must understand these limitations when planning shots with fast motion or quick camera movements. Premium cameras minimize skew through faster electronics.',
    connection: 'The rolling shutter physics demonstrated in this game explains why cinematographers avoid certain shots and choose cameras based on readout speed.',
    howItWorks: 'Cinema sensors prioritize image quality (14+ stops dynamic range) over readout speed. Larger pixels accumulate more light but take longer to read. Camera movement during readout creates the jello effect where the whole frame wobbles. Mechanical shutters can reduce but not eliminate the issue.',
    stats: [
      { value: '8-15ms', label: 'Pro cinema readout', icon: '🎥' },
      { value: '14+ stops', label: 'Dynamic range target', icon: '📊' },
      { value: '$50K+', label: 'High-end cinema camera', icon: '💰' }
    ],
    examples: ['ARRI Alexa', 'RED V-Raptor', 'Sony Venice', 'Blackmagic URSA'],
    companies: ['ARRI', 'RED Digital', 'Sony Professional', 'Blackmagic Design'],
    futureImpact: 'Global shutter cinema sensors are emerging that eliminate rolling shutter while maintaining the dynamic range cinematographers require.',
    color: '#8B5CF6'
  },
  {
    icon: '🚁',
    title: 'Drone Aerial Photography',
    short: 'Drone cameras must handle vibration and motion that exacerbate rolling shutter',
    tagline: 'Stable images from unstable platforms',
    description: 'Drone cameras face extreme rolling shutter challenges. High-frequency propeller vibration, rapid altitude changes, and fast yaw movements all occur during frame capture. Gimbal stabilization helps but cannot eliminate rolling shutter artifacts when the drone itself moves quickly. Premium drones use mechanical or global shutters.',
    connection: 'This game shows how object motion during scan creates distortion - explaining why drone footage of propellers and fast maneuvers often shows artifacts.',
    howItWorks: 'Drone camera gimbals stabilize pointing direction but cannot stop the rolling shutter from seeing different parts of the scene at different times during rapid maneuvers. Mechanical shutters (like DJI Phantom 4 Pro) or global shutter sensors eliminate the problem at the source.',
    stats: [
      { value: '10,000+ RPM', label: 'Drone propeller speed', icon: '🔄' },
      { value: '1-2ms', label: 'Global shutter readout', icon: '⚡' },
      { value: '$1.5B', label: 'Consumer drone market', icon: '🚀' }
    ],
    examples: ['DJI Mavic 3 Pro', 'DJI Phantom 4 Pro', 'Autel Evo II Pro', 'Skydio 2+'],
    companies: ['DJI', 'Autel Robotics', 'Skydio', 'Parrot'],
    futureImpact: 'Affordable global shutter sensors will become standard in drones, enabling artifact-free capture of the fastest aerial maneuvers.',
    color: '#10B981'
  },
  {
    icon: '🔬',
    title: 'Machine Vision Systems',
    short: 'Industrial cameras require global shutters for accurate measurement of moving parts',
    tagline: 'Where distortion means defects',
    description: 'Factory machine vision systems inspect products moving on conveyor belts at high speed. Rolling shutter would distort measurements, causing false rejects or missed defects. Industrial cameras almost universally use global shutters that capture the entire frame simultaneously, ensuring accurate dimensional measurement.',
    connection: 'The rolling shutter distortion physics in this game explains why industrial inspection systems require global shutter sensors.',
    howItWorks: 'Global shutter sensors expose and store all pixels simultaneously, then read them out. While readout is still sequential, the image represents a single instant in time. This eliminates motion distortion but requires more complex sensor design with storage elements at each pixel.',
    stats: [
      { value: '<1μs', label: 'Global shutter exposure', icon: '📷' },
      { value: '100%', label: 'Inspection accuracy required', icon: '✓' },
      { value: '$100B', label: 'Industrial automation market', icon: '🏭' }
    ],
    examples: ['PCB inspection', 'Pharmaceutical packaging', 'Automotive assembly', 'Food inspection'],
    companies: ['Cognex', 'Keyence', 'Basler', 'FLIR (Teledyne)'],
    futureImpact: 'AI-powered vision systems combined with faster global shutter sensors will enable real-time inspection at ever-higher production speeds.',
    color: '#F59E0B'
  }
];

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

interface RollingShutterRendererProps {
  phase?: Phase;
  gamePhase?: string;
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// Premium color palette matching design system
const colors = {
  primary: '#10b981', // emerald-500 for scan line
  primaryDark: '#059669', // emerald-600
  accent: '#ec4899', // pink-500
  accentDark: '#db2777', // pink-600
  warning: '#f59e0b', // amber-500
  success: '#10b981', // emerald-500
  danger: '#ef4444', // red-500
  bgDark: '#020617', // slate-950
  bgCard: '#0f172a', // slate-900
  bgCardLight: '#1e293b', // slate-800
  border: '#334155', // slate-700
  textPrimary: '#f8fafc', // slate-50
  textSecondary: '#94a3b8', // slate-400
  textMuted: '#64748b', // slate-500
  propeller: '#3b82f6', // blue-500
  propellerLight: '#60a5fa', // blue-400
  scanline: '#10b981', // emerald-500
  sensor: '#06b6d4', // cyan-500
  sensorDark: '#0891b2', // cyan-600
};

const RollingShutterRenderer: React.FC<RollingShutterRendererProps> = ({
  phase: externalPhase,
  gamePhase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Internal phase management for self-managing mode
  const [internalPhase, setInternalPhase] = useState<Phase>('hook');
  let phase = (externalPhase || (gamePhase as Phase) || internalPhase) as Phase;

  // Default to hook if phase is invalid
  if (!phaseOrder.includes(phase)) {
    phase = 'hook';
  }

  const [rotationSpeed, setRotationSpeed] = useState(10);
  const [scanSpeed, setScanSpeed] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [showScanline, setShowScanline] = useState(true);

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Navigation functions for self-managing mode
  const handleNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      const nextPhase = phaseOrder[currentIndex + 1];
      setInternalPhase(nextPhase);
    }
    if (onPhaseComplete) {
      onPhaseComplete();
    }
  }, [phase, onPhaseComplete]);

  const handleBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      const prevPhase = phaseOrder[currentIndex - 1];
      setInternalPhase(prevPhase);
    }
  }, [phase]);

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

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTime(prev => prev + 0.016);
    }, 16);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const predictions = [
    { id: 'normal', label: 'The propeller looks normal, just spinning' },
    { id: 'blur', label: 'The propeller becomes a blur' },
    { id: 'curved', label: 'The straight blades appear curved or bent' },
    { id: 'invisible', label: 'The propeller becomes invisible' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Objects stay straight' },
    { id: 'tilt', label: 'Vertical objects appear tilted/slanted' },
    { id: 'stretch', label: 'Objects appear stretched' },
    { id: 'shrink', label: 'Objects appear compressed' },
  ];

  const transferApplications = [
    {
      title: 'Helicopter Blades in Photos',
      description: 'Phone photos of helicopters often show impossibly bent or wavy rotor blades due to rolling shutter.',
      question: 'Why do helicopter blades look like they\'re made of rubber in phone photos?',
      answer: 'The blade moves significantly during the time the sensor scans from top to bottom. Each row captures the blade at a different position, creating a curved appearance from straight blades.',
    },
    {
      title: 'Guitar String Vibration',
      description: 'Videos of vibrating guitar strings show strange wobbly patterns that don\'t match the actual vibration.',
      question: 'Why do guitar strings appear to wobble in waves on video?',
      answer: 'The string vibrates many times during one frame\'s scan. Different scan lines capture different phases of vibration, creating an apparent wave pattern from simple back-and-forth motion.',
    },
    {
      title: 'Flash Photography Bands',
      description: 'Photos taken with flash during rolling shutter can show partial illumination - only part of the image is lit.',
      question: 'Why might only half your photo be properly lit with flash?',
      answer: 'If flash duration is shorter than the scan time, only the rows being scanned during the flash get illuminated. The rest of the frame sees no light.',
    },
    {
      title: 'Sports Photography',
      description: 'Golf clubs and baseball bats can appear bent in phone photos due to their speed during the swing.',
      question: 'How do sports photographers avoid rolling shutter artifacts?',
      answer: 'They use cameras with global shutters (all pixels exposed simultaneously) or very fast rolling shutters. Some cameras also have electronic flash sync to minimize the effect.',
    },
  ];

  const testQuestions = [
    {
      question: 'What causes rolling shutter distortion?',
      options: [
        { text: 'The lens bending light incorrectly', correct: false },
        { text: 'Sequential row-by-row sensor scanning', correct: true },
        { text: 'Motion blur from long exposure', correct: false },
        { text: 'Digital compression artifacts', correct: false },
      ],
    },
    {
      question: 'A spinning propeller appears bent because:',
      options: [
        { text: 'The propeller is actually flexible', correct: false },
        { text: 'Different rows capture different blade positions', correct: true },
        { text: 'The camera lens is distorted', correct: false },
        { text: 'Wind bends the blades', correct: false },
      ],
    },
    {
      question: 'When you pan a camera quickly to the right, vertical objects appear:',
      options: [
        { text: 'Perfectly vertical', correct: false },
        { text: 'Tilted (leaning)', correct: true },
        { text: 'Stretched horizontally', correct: false },
        { text: 'Blurred only', correct: false },
      ],
    },
    {
      question: 'Global shutter differs from rolling shutter because:',
      options: [
        { text: 'It\'s slower', correct: false },
        { text: 'All pixels are exposed simultaneously', correct: true },
        { text: 'It only works in low light', correct: false },
        { text: 'It\'s only used in film cameras', correct: false },
      ],
    },
    {
      question: 'The direction of rolling shutter distortion depends on:',
      options: [
        { text: 'The camera brand', correct: false },
        { text: 'The direction of motion relative to scan direction', correct: true },
        { text: 'The color of the object', correct: false },
        { text: 'The focal length only', correct: false },
      ],
    },
    {
      question: 'Faster rolling shutter scan speeds result in:',
      options: [
        { text: 'More distortion', correct: false },
        { text: 'Less distortion', correct: true },
        { text: 'Different colors', correct: false },
        { text: 'No change', correct: false },
      ],
    },
    {
      question: 'Which device typically has more rolling shutter issues?',
      options: [
        { text: 'Professional cinema camera', correct: false },
        { text: 'Smartphone camera', correct: true },
        { text: 'DSLR with mechanical shutter', correct: false },
        { text: 'Film camera', correct: false },
      ],
    },
    {
      question: 'Rolling shutter can cause problems with:',
      options: [
        { text: 'Still subjects only', correct: false },
        { text: 'Fast-moving subjects and camera motion', correct: true },
        { text: 'Only very slow motion', correct: false },
        { text: 'Only objects far away', correct: false },
      ],
    },
    {
      question: 'The "jello effect" in video is caused by:',
      options: [
        { text: 'Camera shake combined with rolling shutter', correct: true },
        { text: 'Poor video compression', correct: false },
        { text: 'Low frame rate', correct: false },
        { text: 'Incorrect white balance', correct: false },
      ],
    },
    {
      question: 'To minimize rolling shutter in video, you should:',
      options: [
        { text: 'Use maximum zoom', correct: false },
        { text: 'Move the camera more quickly', correct: false },
        { text: 'Use a camera with faster readout or global shutter', correct: true },
        { text: 'Decrease the frame rate', correct: false },
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
      if (testAnswers[i] !== null && q.options[testAnswers[i]].correct) score++;
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  // Render premium SVG defs with gradients and filters
  const renderSVGDefs = () => (
    <defs>
      {/* === LINEAR GRADIENTS === */}

      {/* Camera body metallic gradient */}
      <linearGradient id="rshutCameraMetal" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#475569" />
        <stop offset="25%" stopColor="#334155" />
        <stop offset="50%" stopColor="#1e293b" />
        <stop offset="75%" stopColor="#334155" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>

      {/* Sensor chip gradient with depth */}
      <linearGradient id="rshutSensorChip" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0891b2" />
        <stop offset="20%" stopColor="#06b6d4" />
        <stop offset="50%" stopColor="#22d3ee" />
        <stop offset="80%" stopColor="#06b6d4" />
        <stop offset="100%" stopColor="#0891b2" />
      </linearGradient>

      {/* Propeller blade gradient for metallic sheen */}
      <linearGradient id="rshutBladeMetal" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#1e40af" />
        <stop offset="20%" stopColor="#3b82f6" />
        <stop offset="50%" stopColor="#60a5fa" />
        <stop offset="80%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1e40af" />
      </linearGradient>

      {/* Scan line active gradient */}
      <linearGradient id="rshutScanActive" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
        <stop offset="15%" stopColor="#34d399" stopOpacity="0.8" />
        <stop offset="50%" stopColor="#6ee7b7" stopOpacity="1" />
        <stop offset="85%" stopColor="#34d399" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
      </linearGradient>

      {/* Background lab gradient */}
      <linearGradient id="rshutLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#020617" />
        <stop offset="30%" stopColor="#0f172a" />
        <stop offset="70%" stopColor="#0a0f1a" />
        <stop offset="100%" stopColor="#020617" />
      </linearGradient>

      {/* Distortion comparison gradient - normal side */}
      <linearGradient id="rshutNormalBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#064e3b" stopOpacity="0.3" />
        <stop offset="50%" stopColor="#022c22" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#064e3b" stopOpacity="0.3" />
      </linearGradient>

      {/* Distortion comparison gradient - distorted side */}
      <linearGradient id="rshutDistortedBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#7f1d1d" stopOpacity="0.3" />
        <stop offset="50%" stopColor="#450a0a" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0.3" />
      </linearGradient>

      {/* === RADIAL GRADIENTS === */}

      {/* Propeller hub metallic radial */}
      <radialGradient id="rshutHubMetal" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="40%" stopColor="#64748b" />
        <stop offset="70%" stopColor="#475569" />
        <stop offset="100%" stopColor="#334155" />
      </radialGradient>

      {/* Sensor pixel glow effect */}
      <radialGradient id="rshutPixelGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#22d3ee" stopOpacity="1" />
        <stop offset="30%" stopColor="#06b6d4" stopOpacity="0.8" />
        <stop offset="60%" stopColor="#0891b2" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#0e7490" stopOpacity="0" />
      </radialGradient>

      {/* Active scan row highlight */}
      <radialGradient id="rshutRowActive" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
        <stop offset="50%" stopColor="#34d399" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#6ee7b7" stopOpacity="0" />
      </radialGradient>

      {/* Lens glass effect */}
      <radialGradient id="rshutLensGlass" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.2" />
        <stop offset="40%" stopColor="#7dd3fc" stopOpacity="0.1" />
        <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.15" />
      </radialGradient>

      {/* === GLOW FILTERS === */}

      {/* Scan line glow filter */}
      <filter id="rshutScanGlow" x="-50%" y="-200%" width="200%" height="500%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Propeller motion blur */}
      <filter id="rshutBladeGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Hub center glow */}
      <filter id="rshutHubGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Pixel hit glow */}
      <filter id="rshutPixelHitGlow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Soft inner glow for sensor */}
      <filter id="rshutSensorInnerGlow">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>

      {/* Text shadow filter */}
      <filter id="rshutTextShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.5" />
      </filter>

      {/* === PATTERNS === */}

      {/* Sensor pixel grid pattern */}
      <pattern id="rshutPixelGrid" width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill="none" />
        <rect x="0.5" y="0.5" width="7" height="7" fill="#0e7490" stroke="#155e75" strokeWidth="0.5" rx="0.5" />
      </pattern>

      {/* Lab background grid */}
      <pattern id="rshutLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.4" />
      </pattern>
    </defs>
  );

  const renderVisualization = (interactive: boolean) => {
    const width = 700;
    const height = 400;
    const propRadius = 70;
    const numBlades = 3;
    const scanY = showScanline ? (time * scanSpeed * 8) % 200 : -1;

    // Sensor area dimensions
    const sensorX = 480;
    const sensorY = 80;
    const sensorWidth = 180;
    const sensorHeight = 200;

    // Calculate blade positions with rolling shutter distortion
    const renderDistortedPropeller = (centerX: number, centerY: number, distorted: boolean = true) => {
      const blades = [];
      for (let b = 0; b < numBlades; b++) {
        const points = [];

        for (let r = 0; r <= propRadius; r += 2) {
          let angle;
          if (distorted) {
            // Each radius point captured at different time
            const rowTime = time - (r / (scanSpeed * 6)) * 0.08;
            angle = (b * 360 / numBlades) + (rowTime * rotationSpeed * 360);
          } else {
            // No distortion - all points at same time
            angle = (b * 360 / numBlades) + (time * rotationSpeed * 360);
          }
          const rad = (angle * Math.PI) / 180;
          const x = centerX + r * Math.sin(rad);
          const y = centerY - r * Math.cos(rad);
          points.push(`${x},${y}`);
        }

        blades.push(
          <polyline
            key={`blade-${b}-${distorted ? 'dist' : 'norm'}`}
            points={points.join(' ')}
            fill="none"
            stroke="url(#rshutBladeMetal)"
            strokeWidth={10}
            strokeLinecap="round"
            filter="url(#rshutBladeGlow)"
          />
        );
      }
      return blades;
    };

    // Render sensor grid with active scan row
    const renderSensorGrid = () => {
      const rows = [];
      const rowCount = 25;
      const rowHeight = sensorHeight / rowCount;
      const activeRow = Math.floor((scanY / 200) * rowCount);

      for (let i = 0; i < rowCount; i++) {
        const isActive = showScanline && i === activeRow;
        const isScanned = showScanline && i < activeRow;

        rows.push(
          <rect
            key={`sensor-row-${i}`}
            x={sensorX + 2}
            y={sensorY + i * rowHeight + 2}
            width={sensorWidth - 4}
            height={rowHeight - 1}
            fill={isActive ? 'url(#rshutRowActive)' : isScanned ? 'rgba(6,182,212,0.3)' : 'rgba(14,116,144,0.15)'}
            stroke={isActive ? '#10b981' : '#155e75'}
            strokeWidth={isActive ? 1.5 : 0.3}
            rx={1}
          />
        );
      }
      return rows;
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)',
            borderRadius: '16px',
            maxWidth: '800px',
            border: `1px solid ${colors.border}`
          }}
        >
          {/* Premium SVG definitions */}
          {renderSVGDefs()}

          {/* Background with grid pattern */}
          <rect width={width} height={height} fill="url(#rshutLabBg)" />
          <rect width={width} height={height} fill="url(#rshutLabGrid)" />

          {/* Distortion level indicator bar with interactive point */}
          {(() => {
            const barX = 20;
            const barY = height - 90;
            const barWidth = width - 40;
            const distortionFraction = (rotationSpeed - 1) / 29; // 0..1 based on rotationSpeed
            const pointX = barX + distortionFraction * barWidth;
            return (
              <g>
                {/* Reference line (dashed grid line) */}
                <line x1={barX} y1={barY} x2={barX + barWidth} y2={barY}
                  stroke={colors.border} strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
                {/* Interactive point showing distortion level */}
                <circle
                  cx={pointX}
                  cy={barY}
                  r={7}
                  fill={colors.accent}
                  stroke="#fff"
                  strokeWidth={2}
                  filter="url(#rshutHubGlow)"
                />
              </g>
            );
          })()}

          {/* === LEFT SIDE: SPINNING PROPELLER === */}
          <g>
            {/* Section label */}
            <text
              x={180} y={35}
              fill={colors.textPrimary}
              fontSize={14}
              fontWeight="700"
              textAnchor="middle"
              filter="url(#rshutTextShadow)"
            >
              Spinning Propeller
            </text>
            <text
              x={180} y={52}
              fill={colors.textMuted}
              fontSize={11}
              textAnchor="middle"
            >
              3-blade at {rotationSpeed} rotations/sec
            </text>

            {/* Propeller mount/stand */}
            <rect x={170} y={280} width={20} height={60} rx={3} fill="url(#rshutCameraMetal)" />
            <rect x={160} y={330} width={40} height={12} rx={3} fill="#1e293b" />

            {/* Propeller hub with metallic effect */}
            <circle
              cx={180} cy={180} r={20}
              fill="url(#rshutHubMetal)"
              stroke="#64748b"
              strokeWidth={2}
              filter="url(#rshutHubGlow)"
            />
            <circle cx={180} cy={180} r={8} fill="#1e293b" />
            <circle cx={180} cy={180} r={4} fill="#475569" />

            {/* Distorted propeller blades */}
            {renderDistortedPropeller(180, 180, true)}

            {/* Motion indicator arcs */}
            <path
              d={`M 180 ${180 - propRadius - 20} A ${propRadius + 20} ${propRadius + 20} 0 0 1 ${180 + propRadius + 20} 180`}
              fill="none"
              stroke={colors.accent}
              strokeWidth={1.5}
              strokeDasharray="4 6"
              opacity={0.4}
            />
          </g>

          {/* === ARROW SHOWING LIGHT PATH === */}
          <g>
            <defs>
              <marker id="rshutArrowHead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill={colors.sensor} />
              </marker>
            </defs>
            <line
              x1={280} y1={180}
              x2={460} y2={180}
              stroke={colors.sensor}
              strokeWidth={2}
              strokeDasharray="8 4"
              markerEnd="url(#rshutArrowHead)"
              opacity={0.6}
            />
            <text x={370} y={170} fill={colors.sensor} fontSize={11} textAnchor="middle">Light rays</text>
          </g>

          {/* === CENTER: CAMERA SENSOR VISUALIZATION === */}
          <g>
            {/* Section label */}
            <text
              x={sensorX + sensorWidth/2} y={35}
              fill={colors.textPrimary}
              fontSize={14}
              fontWeight="700"
              textAnchor="middle"
              filter="url(#rshutTextShadow)"
            >
              CMOS Sensor
            </text>
            <text
              x={sensorX + sensorWidth/2} y={52}
              fill={colors.textMuted}
              fontSize={11}
              textAnchor="middle"
            >
              Row-by-row readout ({scanSpeed}% speed)
            </text>

            {/* Sensor housing/frame */}
            <rect
              x={sensorX - 15} y={sensorY - 15}
              width={sensorWidth + 30} height={sensorHeight + 50}
              rx={8}
              fill="url(#rshutCameraMetal)"
              stroke="#475569"
              strokeWidth={2}
            />

            {/* Sensor chip base */}
            <rect
              x={sensorX - 5} y={sensorY - 5}
              width={sensorWidth + 10} height={sensorHeight + 10}
              rx={4}
              fill="#0c4a6e"
              stroke="url(#rshutSensorChip)"
              strokeWidth={2}
            />

            {/* Sensor active area with pixel grid */}
            <rect
              x={sensorX} y={sensorY}
              width={sensorWidth} height={sensorHeight}
              rx={2}
              fill="url(#rshutPixelGrid)"
              filter="url(#rshutSensorInnerGlow)"
            />

            {/* Sensor rows with scan animation */}
            {renderSensorGrid()}

            {/* Active scan line with glow */}
            {showScanline && scanY >= 0 && scanY < 200 && (
              <g>
                <rect
                  x={sensorX - 10}
                  y={sensorY + scanY - 2}
                  width={sensorWidth + 20}
                  height={4}
                  fill="url(#rshutScanActive)"
                  filter="url(#rshutScanGlow)"
                />
                {/* Scan line bright center */}
                <line
                  x1={sensorX}
                  y1={sensorY + scanY}
                  x2={sensorX + sensorWidth}
                  y2={sensorY + scanY}
                  stroke="#6ee7b7"
                  strokeWidth={2}
                  filter="url(#rshutScanGlow)"
                />
              </g>
            )}

            {/* Scan direction indicator */}
            <g transform={`translate(${sensorX + sensorWidth + 25}, ${sensorY + sensorHeight/2})`}>
              <line x1={0} y1={-60} x2={0} y2={60} stroke={colors.scanline} strokeWidth={2} />
              <polygon points="0,60 -6,48 6,48" fill={colors.scanline} />
              {/* Tick marks on scan axis */}
              <line x1={-5} y1={-40} x2={5} y2={-40} stroke={colors.scanline} strokeWidth={1} opacity={0.7} />
              <line x1={-5} y1={0} x2={5} y2={0} stroke={colors.scanline} strokeWidth={1} opacity={0.7} />
              <line x1={-5} y1={40} x2={5} y2={40} stroke={colors.scanline} strokeWidth={1} opacity={0.7} />
              <text x={12} y={-36} fill="#e2e8f0" fontSize={11} fontWeight="600">SCAN</text>
              <text x={12} y={-23} fill="#94a3b8" fontSize={11}>rate</text>
              <text x={12} y={50} fill="#94a3b8" fontSize={11}>Top→Bottom</text>
            </g>

            {/* Status indicators */}
            <g transform={`translate(${sensorX + 10}, ${sensorY + sensorHeight + 22})`}>
              <circle cx={0} cy={0} r={4} fill={isPlaying ? colors.success : colors.textMuted}>
                {isPlaying && (
                  <animate attributeName="opacity" values="1;0.4;1" dur="0.8s" repeatCount="indefinite" />
                )}
              </circle>
              <text x={10} y={4} fill={isPlaying ? colors.success : colors.textMuted} fontSize={11}>
                {isPlaying ? 'SCANNING' : 'PAUSED'}
              </text>
            </g>
          </g>

          {/* === BOTTOM INFO BAR === */}
          <g transform={`translate(20, ${height - 45})`}>
            <rect
              x={0} y={0}
              width={width - 40} height={35}
              rx={8}
              fill="rgba(30,41,59,0.8)"
              stroke={colors.border}
              strokeWidth={1}
            />
            {/* Tick marks on info bar for visual reference */}
            <line x1={210} y1={5} x2={210} y2={30} stroke={colors.border} strokeWidth={1} opacity={0.6} />
            <line x1={420} y1={5} x2={420} y2={30} stroke={colors.border} strokeWidth={1} opacity={0.6} />

            {/* Info items - using y=18 to avoid overlap with header texts at y=35/52 */}
            <text x={20} y={18} fill={colors.accent} fontSize={12} fontWeight="700">
              Rolling Shutter Effect
            </text>
            <text x={220} y={18} fill="#e2e8f0" fontSize={12}>
              Rotation: {rotationSpeed} Hz
            </text>
            <text x={430} y={18} fill="#e2e8f0" fontSize={11}>
              Scan: {scanSpeed}%
            </text>
          </g>
        </svg>

        {/* Interactive controls */}
        {interactive && (
          <div style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            padding: '12px',
            background: colors.bgCard,
            borderRadius: '12px',
            border: `1px solid ${colors.border}`
          }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                padding: '12px 28px',
                borderRadius: '10px',
                border: 'none',
                background: isPlaying
                  ? `linear-gradient(135deg, ${colors.danger} 0%, #dc2626 100%)`
                  : `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`,
                color: 'white',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: isPlaying
                  ? `0 4px 20px ${colors.danger}40`
                  : `0 4px 20px ${colors.success}40`,
                transition: 'all 0.2s ease'
              }}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={() => { setTime(0); setIsPlaying(false); }}
              style={{
                padding: '12px 28px',
                borderRadius: '10px',
                border: `2px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render comparison visualization showing distorted vs non-distorted
  const renderComparisonVisualization = () => {
    const width = 700;
    const height = 320;
    const propRadius = 55;
    const numBlades = 3;

    const renderPropeller = (centerX: number, centerY: number, distorted: boolean) => {
      const blades = [];
      for (let b = 0; b < numBlades; b++) {
        const points = [];

        for (let r = 0; r <= propRadius; r += 2) {
          let angle;
          if (distorted) {
            const rowTime = time - (r / (scanSpeed * 6)) * 0.08;
            angle = (b * 360 / numBlades) + (rowTime * rotationSpeed * 360);
          } else {
            angle = (b * 360 / numBlades) + (time * rotationSpeed * 360);
          }
          const rad = (angle * Math.PI) / 180;
          const x = centerX + r * Math.sin(rad);
          const y = centerY - r * Math.cos(rad);
          points.push(`${x},${y}`);
        }

        blades.push(
          <polyline
            key={`compare-blade-${b}-${distorted ? 'dist' : 'norm'}`}
            points={points.join(' ')}
            fill="none"
            stroke={distorted ? '#ef4444' : '#10b981'}
            strokeWidth={8}
            strokeLinecap="round"
            filter="url(#rshutBladeGlow)"
          />
        );
      }
      return blades;
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)',
            borderRadius: '16px',
            maxWidth: '800px',
            border: `1px solid ${colors.border}`
          }}
        >
          {renderSVGDefs()}

          {/* Background */}
          <rect width={width} height={height} fill="url(#rshutLabBg)" />

          {/* Divider line */}
          <line x1={width/2} y1={40} x2={width/2} y2={height - 20} stroke={colors.border} strokeWidth={2} strokeDasharray="8 4" />

          {/* === LEFT: GLOBAL SHUTTER (Normal) === */}
          <g>
            {/* Background tint */}
            <rect x={10} y={40} width={width/2 - 20} height={height - 60} rx={12} fill="url(#rshutNormalBg)" />

            {/* Title */}
            <text x={width/4} y={30} fill={colors.success} fontSize={14} fontWeight="700" textAnchor="middle">
              Global Shutter (Actual)
            </text>

            {/* Hub */}
            <circle cx={width/4} cy={170} r={16} fill="url(#rshutHubMetal)" stroke="#10b981" strokeWidth={2} filter="url(#rshutHubGlow)" />
            <circle cx={width/4} cy={170} r={6} fill="#1e293b" />

            {/* Propeller */}
            {renderPropeller(width/4, 170, false)}

            {/* Description */}
            <text x={width/4} y={270} fill={colors.textSecondary} fontSize={11} textAnchor="middle">
              All pixels captured at same instant
            </text>
            <text x={width/4} y={288} fill={colors.success} fontSize={11} textAnchor="middle" fontWeight="600">
              Straight blades (reality)
            </text>
          </g>

          {/* === RIGHT: ROLLING SHUTTER (Distorted) === */}
          <g>
            {/* Background tint */}
            <rect x={width/2 + 10} y={40} width={width/2 - 20} height={height - 60} rx={12} fill="url(#rshutDistortedBg)" />

            {/* Title */}
            <text x={3*width/4} y={30} fill={colors.danger} fontSize={14} fontWeight="700" textAnchor="middle">
              Rolling Shutter (Camera)
            </text>

            {/* Hub */}
            <circle cx={3*width/4} cy={170} r={16} fill="url(#rshutHubMetal)" stroke="#ef4444" strokeWidth={2} filter="url(#rshutHubGlow)" />
            <circle cx={3*width/4} cy={170} r={6} fill="#1e293b" />

            {/* Distorted propeller */}
            {renderPropeller(3*width/4, 170, true)}

            {/* Scan line indicator */}
            {showScanline && (
              <g>
                <line
                  x1={width/2 + 30}
                  y1={70 + ((time * scanSpeed * 8) % 180)}
                  x2={width - 30}
                  y2={70 + ((time * scanSpeed * 8) % 180)}
                  stroke="url(#rshutScanActive)"
                  strokeWidth={3}
                  filter="url(#rshutScanGlow)"
                />
              </g>
            )}

            {/* Description */}
            <text x={3*width/4} y={270} fill={colors.textSecondary} fontSize={11} textAnchor="middle">
              Rows captured at different times
            </text>
            <text x={3*width/4} y={288} fill={colors.danger} fontSize={11} textAnchor="middle" fontWeight="600">
              Bent/curved blades (artifact)
            </text>
          </g>

          {/* VS indicator */}
          <circle cx={width/2} cy={170} r={20} fill={colors.bgCard} stroke={colors.border} strokeWidth={2} />
          <text x={width/2} y={175} fill={colors.textPrimary} fontSize={12} fontWeight="700" textAnchor="middle">VS</text>
        </svg>

        {/* Play controls */}
        <div style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
          padding: '12px',
          background: colors.bgCard,
          borderRadius: '12px',
          border: `1px solid ${colors.border}`
        }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              background: isPlaying
                ? `linear-gradient(135deg, ${colors.danger} 0%, #dc2626 100%)`
                : `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`,
              color: 'white',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            {isPlaying ? 'Pause' : 'Play Comparison'}
          </button>
        </div>
      </div>
    );
  };

  const renderControls = () => (
    <div style={{
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      background: colors.bgCard,
      borderRadius: '12px',
      margin: '0 16px',
      border: `1px solid ${colors.border}`
    }}>
      {/* Propeller Speed Control */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <label style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: '600' }}>
            Propeller Rotation Speed
          </label>
          <span style={{
            color: colors.propeller,
            fontSize: '14px',
            fontWeight: '700',
            padding: '4px 10px',
            background: 'rgba(59,130,246,0.15)',
            borderRadius: '6px'
          }}>
            {rotationSpeed} rot/s
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="30"
          step="1"
          value={rotationSpeed}
          onChange={(e) => setRotationSpeed(parseInt(e.target.value))}
          onInput={(e) => setRotationSpeed(parseInt((e.target as HTMLInputElement).value))}
          style={{
            width: '100%',
            height: '16px',
            borderRadius: '4px',
            cursor: 'pointer',
            accentColor: colors.propeller,
            touchAction: 'pan-y'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
          <span style={{ color: '#94a3b8', fontSize: '10px' }}>Slow</span>
          <span style={{ color: '#94a3b8', fontSize: '10px' }}>Fast</span>
        </div>
      </div>

      {/* Scan Speed Control */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <label style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: '600' }}>
            Sensor Scan Speed
          </label>
          <span style={{
            color: colors.scanline,
            fontSize: '14px',
            fontWeight: '700',
            padding: '4px 10px',
            background: 'rgba(16,185,129,0.15)',
            borderRadius: '6px'
          }}>
            {scanSpeed}%
          </span>
        </div>
        <input
          type="range"
          min="10"
          max="100"
          step="10"
          value={scanSpeed}
          onChange={(e) => setScanSpeed(parseInt(e.target.value))}
          onInput={(e) => setScanSpeed(parseInt((e.target as HTMLInputElement).value))}
          style={{
            width: '100%',
            height: '16px',
            borderRadius: '4px',
            cursor: 'pointer',
            accentColor: colors.scanline,
            touchAction: 'pan-y'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
          <span style={{ color: '#e2e8f0', fontSize: '10px' }}>Slow (more distortion)</span>
          <span style={{ color: '#e2e8f0', fontSize: '10px' }}>Fast (less distortion)</span>
        </div>
      </div>

      {/* Scanline Toggle */}
      <label style={{
        display: 'flex',
        alignItems: 'center',
        color: '#e2e8f0',
        cursor: 'pointer',
        padding: '10px 12px',
        borderRadius: '8px',
        background: showScanline ? 'rgba(16,185,129,0.1)' : 'transparent',
        border: `1px solid ${showScanline ? colors.scanline : colors.border}`,
        transition: 'all 0.2s ease'
      }}>
        <input
          type="checkbox"
          checked={showScanline}
          onChange={(e) => setShowScanline(e.target.checked)}
          style={{ marginRight: '10px', width: '18px', height: '18px', accentColor: colors.scanline }}
        />
        <span style={{ fontSize: '13px', color: '#e2e8f0' }}>Show scan line animation</span>
      </label>

      {/* Tip box */}
      <div style={{
        background: `linear-gradient(135deg, rgba(236,72,153,0.15) 0%, rgba(168,85,247,0.1) 100%)`,
        padding: '14px',
        borderRadius: '10px',
        borderLeft: `4px solid ${colors.accent}`
      }}>
        <div style={{ color: colors.accent, fontSize: '11px', fontWeight: '700', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Pro Tip
        </div>
        <div style={{ color: '#e2e8f0', fontSize: '12px', lineHeight: '1.5' }}>
          Try setting rotation to <strong style={{ color: colors.propeller }}>25 rot/s</strong> and scan to <strong style={{ color: colors.scanline }}>20%</strong> to see extreme blade bending!
        </div>
      </div>
    </div>
  );

  const renderNavDots = () => {
    const phaseLabels = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '8px 0', position: 'absolute', top: 0, left: 0, right: 0, height: 0, overflow: 'hidden' }}>
        {phaseLabels.map((label, i) => (
          <button
            key={label}
            aria-label={label}
            title={label}
            onClick={() => setInternalPhase(label as Phase)}
            style={{
              width: '8px', height: '8px', borderRadius: '50%', border: 'none', padding: 0,
              background: i === currentIndex ? colors.accent : colors.border,
              cursor: 'pointer', opacity: 0, pointerEvents: 'none'
            }}
          />
        ))}
      </div>
    );
  };

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => {
    const currentIndex = phaseOrder.indexOf(phase);
    const showBack = currentIndex > 0 && phase !== 'hook';
    const progress = ((currentIndex + 1) / phaseOrder.length) * 100;

    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.bgDark,
        borderTop: `1px solid ${colors.border}`,
        zIndex: 1000,
        backdropFilter: 'blur(8px)'
      }}>
        {/* Progress bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${progress}%`,
          height: '3px',
          background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`,
          transition: 'width 0.3s ease'
        }} />

        <div style={{
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px'
        }}>
          {showBack ? (
            <button
              onClick={handleBack}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                background: colors.bgCard,
                color: colors.textSecondary,
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                minHeight: '44px'
              }}
            >
              ← Back
            </button>
          ) : <div />}

          <button
            onClick={onPhaseComplete || handleNext}
            disabled={disabled && !canProceed}
            style={{
              padding: '14px 36px',
              borderRadius: '12px',
              border: 'none',
              background: canProceed
                ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
                : colors.bgCardLight,
              color: canProceed ? 'white' : colors.textMuted,
              fontWeight: '700',
              cursor: canProceed ? 'pointer' : 'not-allowed',
              fontSize: '15px',
              boxShadow: canProceed ? `0 4px 20px ${colors.accent}40` : 'none',
              transition: 'all 0.2s ease',
              minHeight: '44px'
            }}
          >
            {buttonText}
          </button>
        </div>
      </div>
    );
  };

  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgDark, position: 'relative' }}>
        {renderNavDots()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {/* Hero header */}
          <div style={{ padding: '28px 24px 20px', textAlign: 'center' }}>
            {/* Category badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'rgba(236,72,153,0.12)',
              border: '1px solid rgba(236,72,153,0.25)',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '12px' }}>📷</span>
              <span style={{ fontSize: '11px', fontWeight: '700', color: colors.accent, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Digital Photography
              </span>
            </div>

            {/* Main title with gradient */}
            <h1 style={{
              fontSize: isMobile ? '26px' : '34px',
              fontWeight: '800',
              color: colors.textPrimary,
              marginBottom: '12px',
              lineHeight: 1.15,
              letterSpacing: '-0.02em'
            }}>
              The Bendy{' '}
              <span style={{
                background: 'linear-gradient(135deg, #ec4899 0%, #3b82f6 50%, #10b981 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>Propeller</span>
            </h1>

            <p style={{
              color: '#e2e8f0',
              fontSize: isMobile ? '15px' : '17px',
              marginBottom: '6px',
              lineHeight: 1.5,
              fontWeight: 400
            }}>
              Discover why straight spinning blades look curved on phones.
            </p>
          </div>

          {/* Main visualization */}
          <div style={{ padding: '0 16px' }}>
            {renderVisualization(true)}
          </div>

          {/* Info cards */}
          <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              background: `linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.bgCardLight}40 100%)`,
              padding: '18px',
              borderRadius: '14px',
              border: `1px solid ${colors.border}`
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '15px', lineHeight: 1.7, marginBottom: '12px' }}>
                Film a <strong style={{ color: colors.propeller }}>helicopter</strong>, <strong style={{ color: colors.propeller }}>propeller</strong>, or <strong style={{ color: colors.propeller }}>fan</strong> with your phone. The blades look bent, wobbly, even rubber-like!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.6 }}>
                This is the <strong style={{ color: colors.scanline }}>rolling shutter effect</strong> - your camera reads pixels line by line, not all at once.
              </p>
            </div>

            {/* Quick facts */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px'
            }}>
              {[
                { icon: '⚡', label: '5 min', desc: 'Quick learn' },
                { icon: '🔬', label: 'Interactive', desc: 'Lab simulation' },
                { icon: '📱', label: 'Real-world', desc: 'Phone cameras' }
              ].map((item, i) => (
                <div key={i} style={{
                  padding: '12px 8px',
                  background: colors.bgCardLight,
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '18px', marginBottom: '4px' }}>{item.icon}</div>
                  <div style={{ color: colors.textPrimary, fontSize: '12px', fontWeight: '700' }}>{item.label}</div>
                  <div style={{ color: colors.textMuted, fontSize: '10px' }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: Make a Prediction')}
      </div>
    );
  }

  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgDark }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {/* Header */}
          <div style={{ padding: '20px 16px 12px', textAlign: 'center' }}>
            <span style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '12px',
              background: 'rgba(168,85,247,0.15)',
              color: '#a855f7',
              fontSize: '11px',
              fontWeight: '700',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Prediction Phase
            </span>
            <h2 style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: '700' }}>Make Your Prediction</h2>
          </div>

          <div style={{ padding: '0 16px' }}>
            {renderVisualization(false)}
          </div>

          {/* Info box */}
          <div style={{
            background: `linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.bgCardLight}40 100%)`,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: '14px', fontWeight: '700' }}>
              What You're Looking At:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.6 }}>
              A 3-blade propeller spinning. The camera sensor scans from top to bottom (<span style={{ color: colors.scanline, fontWeight: '600' }}>green line</span>), capturing one row at a time. Each row "sees" the blade at a different moment.
            </p>
          </div>

          {/* Question and options */}
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '14px', fontSize: '15px', fontWeight: '600', lineHeight: 1.4 }}>
              What happens to straight blades when filmed with a rolling shutter?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px 18px',
                    borderRadius: '12px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                    background: prediction === p.id
                      ? 'linear-gradient(135deg, rgba(236,72,153,0.2) 0%, rgba(236,72,153,0.05) 100%)'
                      : colors.bgCard,
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    lineHeight: 1.4,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction')}
      </div>
    );
  }

  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgDark }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {/* Header */}
          <div style={{ padding: '20px 16px 12px', textAlign: 'center' }}>
            <span style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '12px',
              background: 'rgba(16,185,129,0.15)',
              color: colors.scanline,
              fontSize: '11px',
              fontWeight: '700',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Interactive Lab
            </span>
            <h2 style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: '700', marginBottom: '6px' }}>
              Explore Rolling Shutter
            </h2>
            <p style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 400 }}>
              Adjust parameters to see how distortion changes
            </p>
          </div>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            padding: '0 16px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              {renderVisualization(true)}
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Real-time calculated values display */}
              <div style={{
                marginBottom: '12px',
                display: 'flex',
                flexDirection: 'row',
                gap: '10px',
              }}>
                <div style={{ flex: 1, background: colors.bgCard, borderRadius: '10px', padding: '12px', border: `1px solid ${colors.border}`, textAlign: 'center' }}>
                  <div style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Rotation Rate</div>
                  <div style={{ color: colors.propeller, fontSize: '20px', fontWeight: '700' }}>{rotationSpeed} Hz</div>
                </div>
                <div style={{ flex: 1, background: colors.bgCard, borderRadius: '10px', padding: '12px', border: `1px solid ${colors.border}`, textAlign: 'center' }}>
                  <div style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Distortion Factor</div>
                  <div style={{ color: colors.accent, fontSize: '20px', fontWeight: '700' }}>{(rotationSpeed / scanSpeed).toFixed(2)} ×</div>
                </div>
                <div style={{ flex: 1, background: colors.bgCard, borderRadius: '10px', padding: '12px', border: `1px solid ${colors.border}`, textAlign: 'center' }}>
                  <div style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Scan Speed</div>
                  <div style={{ color: colors.scanline, fontSize: '20px', fontWeight: '700' }}>{scanSpeed}%</div>
                </div>
              </div>

              {renderControls()}
            </div>
          </div>

          {/* How It Works - Cause and Effect */}
          <div style={{
            background: `linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.bgCardLight}40 100%)`,
            margin: '16px',
            padding: '18px',
            borderRadius: '14px',
            border: `1px solid ${colors.border}`
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '12px', fontSize: '14px', fontWeight: '700' }}>
              How It Works - Cause and Effect
            </h4>
            <div style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.6, marginBottom: '14px' }}>
              <p style={{ marginBottom: '10px' }}>
                <strong style={{ color: colors.textPrimary }}>When you increase rotation speed:</strong> The blade moves more between scan lines, causing greater distortion. Each row captures the blade at a different position, making straight blades appear curved.
              </p>
              <p style={{ marginBottom: '10px' }}>
                <strong style={{ color: colors.textPrimary }}>When you decrease scan speed:</strong> The sensor takes longer to scan top-to-bottom, giving the blade more time to move. This increases the difference between positions captured in each row, creating more pronounced bending.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>As scan speed increases:</strong> The sensor captures the frame faster, reducing the time the blade has to move during capture. This minimizes positional differences between rows, reducing distortion.
              </p>
            </div>
          </div>

          {/* Why This Matters - Real World Relevance */}
          <div style={{
            background: `linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.05) 100%)`,
            margin: '0 16px 16px',
            padding: '18px',
            borderRadius: '14px',
            border: `1px solid rgba(59,130,246,0.3)`
          }}>
            <h4 style={{ color: colors.propeller, marginBottom: '12px', fontSize: '14px', fontWeight: '700' }}>
              Why This Matters
            </h4>
            <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.6, marginBottom: '10px' }}>
              Every smartphone camera and most video cameras use rolling shutter CMOS sensors. This affects your everyday photos and videos:
            </p>
            <ul style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.7, paddingLeft: '24px', marginBottom: '12px' }}>
              <li style={{ marginBottom: '8px' }}>
                <strong style={{ color: colors.textPrimary }}>Helicopter blades and propellers</strong> appear impossibly bent in phone photos, not because they're flexible, but because the sensor captures different positions at different times.
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong style={{ color: colors.textPrimary }}>Quick camera pans</strong> make buildings lean (the "jello effect"), as vertical structures are captured progressively while the camera moves.
              </li>
              <li>
                <strong style={{ color: colors.textPrimary }}>Sports photography with phones</strong> shows bent golf clubs and baseball bats mid-swing - the faster the motion, the more extreme the distortion.
              </li>
            </ul>
            <p style={{ color: '#cbd5e1', fontSize: '13px', fontStyle: 'italic' }}>
              Professional cameras minimize this with faster readout speeds or global shutters that capture all pixels simultaneously, eliminating the time difference that causes distortion.
            </p>
          </div>

          {/* Experiments card */}
          <div style={{
            background: `linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.bgCardLight}40 100%)`,
            margin: '0 16px 16px',
            padding: '18px',
            borderRadius: '14px',
            border: `1px solid ${colors.border}`
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '12px', fontSize: '14px', fontWeight: '700' }}>
              Try These Experiments:
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { icon: '🔥', text: 'High rotation + slow scan = extreme bending', color: colors.danger },
                { icon: '⚡', text: 'Fast scan = minimal distortion', color: colors.scanline },
                { icon: '👁️', text: 'Watch how the scanline captures different positions', color: colors.sensor }
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  background: colors.bgCardLight,
                  borderRadius: '8px'
                }}>
                  <span style={{ fontSize: '16px' }}>{item.icon}</span>
                  <span style={{ color: '#e2e8f0', fontSize: '13px' }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  if (phase === 'review') {
    const wasCorrect = prediction === 'curved';
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgDark }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {/* Result banner */}
          <div style={{
            background: wasCorrect
              ? 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.05) 100%)'
              : 'linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0.05) 100%)',
            margin: '16px',
            padding: '20px',
            borderRadius: '14px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.danger}`
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.danger, marginBottom: '8px', fontSize: '18px', fontWeight: '700' }}>
              {wasCorrect ? '✓ Correct!' : '✗ Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary, fontSize: '14px', lineHeight: 1.6 }}>
              Straight blades appear <strong style={{ color: colors.accent }}>curved</strong> because each row captures a different blade position!
            </p>
          </div>

          {/* Comparison visualization */}
          <div style={{ padding: '0 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: '700', marginBottom: '12px', textAlign: 'center' }}>
              See the Difference
            </h3>
            {renderComparisonVisualization()}
          </div>

          {/* Explanation card */}
          <div style={{
            background: `linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.bgCardLight}40 100%)`,
            margin: '16px',
            padding: '20px',
            borderRadius: '14px',
            border: `1px solid ${colors.border}`
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '16px', fontSize: '16px', fontWeight: '700' }}>
              How Rolling Shutter Works
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{
                  width: '36px', height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(6,182,212,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: colors.sensor, fontSize: '16px' }}>1</span>
                </div>
                <div>
                  <p style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Sequential Scanning</p>
                  <p style={{ color: colors.textSecondary, fontSize: '12px', lineHeight: 1.5 }}>CMOS sensors read pixels row by row, taking time to scan the full frame. During this time, fast objects move.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{
                  width: '36px', height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(16,185,129,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: colors.scanline, fontSize: '16px' }}>2</span>
                </div>
                <div>
                  <p style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Time Offset</p>
                  <p style={{ color: colors.textSecondary, fontSize: '12px', lineHeight: 1.5 }}>The top of the image is captured before the bottom. A spinning blade is at different angles at different scan positions.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{
                  width: '36px', height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(236,72,153,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: colors.accent, fontSize: '16px' }}>3</span>
                </div>
                <div>
                  <p style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>The Result</p>
                  <p style={{ color: colors.textSecondary, fontSize: '12px', lineHeight: 1.5 }}>Each row "stitches together" a different moment, creating curved appearances from straight objects.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mathematical Relationship */}
          <div style={{
            background: `linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.05) 100%)`,
            margin: '0 16px 16px',
            padding: '20px',
            borderRadius: '14px',
            border: `1px solid rgba(59,130,246,0.3)`
          }}>
            <h3 style={{ color: colors.propeller, marginBottom: '14px', fontSize: '16px', fontWeight: '700' }}>
              The Math Behind It
            </h3>
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              padding: '16px',
              borderRadius: '10px',
              marginBottom: '14px',
              textAlign: 'center',
              fontFamily: 'monospace'
            }}>
              <div style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '8px' }}>
                <strong>Angular Displacement</strong> = <strong style={{ color: colors.propeller }}>ω</strong> × <strong style={{ color: colors.scanline }}>Δt</strong>
              </div>
              <div style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.6 }}>
                ω = rotation speed (radians/s) <br />
                Δt = time between scan lines (seconds)
              </div>
            </div>
            <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.6, marginBottom: '10px' }}>
              <strong style={{ color: colors.textPrimary }}>Distortion is proportional to:</strong> The faster the object rotates and the slower the scan, the greater the angular change between captured rows, creating more pronounced curvature.
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', lineHeight: 1.5, fontStyle: 'italic' }}>
              Example: At 30 rotations/sec (188 rad/s) with 20ms scan time, a blade moves ~73° between top and bottom rows, creating extreme visible bending.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist!')}
      </div>
    );
  }

  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgDark }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {/* Header */}
          <div style={{ padding: '20px 16px 12px', textAlign: 'center' }}>
            <span style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '12px',
              background: 'rgba(245,158,11,0.15)',
              color: colors.warning,
              fontSize: '11px',
              fontWeight: '700',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              The Twist
            </span>
            <h2 style={{ color: colors.warning, fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>
              Camera Motion
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              What if you pan the camera quickly to the side?
            </p>
          </div>

          <div style={{ padding: '0 16px' }}>
            {renderVisualization(false)}
          </div>

          {/* Setup info */}
          <div style={{
            background: `linear-gradient(135deg, rgba(245,158,11,0.1) 0%, ${colors.bgCard} 100%)`,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            border: `1px solid rgba(245,158,11,0.3)`
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: '14px', fontWeight: '700' }}>
              The Setup:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.6 }}>
              Instead of filming a spinning object, you quickly <strong style={{ color: colors.warning }}>pan (sweep)</strong> your camera to the right while filming stationary vertical objects like <strong>buildings</strong> or <strong>poles</strong>.
            </p>
          </div>

          {/* Prediction options */}
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '14px', fontSize: '15px', fontWeight: '600', lineHeight: 1.4 }}>
              What happens to vertical objects when you pan quickly?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '16px 18px',
                    borderRadius: '12px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : `1px solid ${colors.border}`,
                    background: twistPrediction === p.id
                      ? 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(245,158,11,0.05) 100%)'
                      : colors.bgCard,
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    lineHeight: 1.4,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgDark }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {/* Header */}
          <div style={{ padding: '20px 16px 12px', textAlign: 'center' }}>
            <span style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '12px',
              background: 'rgba(245,158,11,0.15)',
              color: colors.warning,
              fontSize: '11px',
              fontWeight: '700',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Experiment
            </span>
            <h2 style={{ color: colors.warning, fontSize: '20px', fontWeight: '700', marginBottom: '6px' }}>
              Test Camera Panning
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '13px' }}>
              Visualize how panning creates skew
            </p>
          </div>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            padding: '0 16px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              {renderVisualization(true)}
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {renderControls()}
            </div>
          </div>

          {/* Key observation */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 100%)',
            margin: '16px',
            padding: '18px',
            borderRadius: '14px',
            borderLeft: `4px solid ${colors.warning}`
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '10px', fontSize: '14px', fontWeight: '700' }}>
              Key Observation
            </h4>
            <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.6 }}>
              When panning, the scene moves across the sensor. <strong style={{ color: colors.textPrimary }}>Top rows</strong> capture the scene at one position, <strong style={{ color: colors.textPrimary }}>bottom rows</strong> at another - creating a slant or <strong style={{ color: colors.warning }}>"skew"</strong> effect!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'tilt';
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgDark }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {/* Result banner */}
          <div style={{
            background: wasCorrect
              ? 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.05) 100%)'
              : 'linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0.05) 100%)',
            margin: '16px',
            padding: '20px',
            borderRadius: '14px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.danger}`
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.danger, marginBottom: '8px', fontSize: '18px', fontWeight: '700' }}>
              {wasCorrect ? '✓ Correct!' : '✗ Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary, fontSize: '14px', lineHeight: 1.6 }}>
              Vertical objects appear <strong style={{ color: colors.warning }}>tilted</strong> when you pan the camera!
            </p>
          </div>

          {/* Jello effect explanation */}
          <div style={{
            background: `linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.bgCardLight}40 100%)`,
            margin: '16px',
            padding: '20px',
            borderRadius: '14px',
            border: `1px solid ${colors.border}`
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '16px', fontSize: '16px', fontWeight: '700' }}>
              The Jello Effect
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{
                  width: '36px', height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(245,158,11,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ fontSize: '18px' }}>↔️</span>
                </div>
                <div>
                  <p style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Skew from Panning</p>
                  <p style={{ color: colors.textSecondary, fontSize: '12px', lineHeight: 1.5 }}>
                    When the camera pans right, the scene appears to move left. Top rows capture the scene before it's moved as far as bottom rows.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{
                  width: '36px', height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(236,72,153,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ fontSize: '18px' }}>🍮</span>
                </div>
                <div>
                  <p style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Jello Effect</p>
                  <p style={{ color: colors.textSecondary, fontSize: '12px', lineHeight: 1.5 }}>
                    With vibration or handheld shake, the scene appears to wobble like jello as the camera's position changes during scan time.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Visual comparison tip */}
          <div style={{
            background: 'rgba(6,182,212,0.1)',
            margin: '16px',
            padding: '14px',
            borderRadius: '10px',
            borderLeft: `3px solid ${colors.sensor}`
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '12px', lineHeight: 1.5 }}>
              <strong style={{ color: colors.sensor }}>Pro Tip:</strong> Drone footage often shows the jello effect when vibrations reach the camera sensor during flight.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge')}
      </div>
    );
  }

  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Rolling Shutter"
        applications={realWorldApps}
        onComplete={() => nextPhase()}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
      />
    );
  }

  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgDark }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {/* Header */}
          <div style={{ padding: '20px 16px 12px', textAlign: 'center' }}>
            <span style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '12px',
              background: 'rgba(6,182,212,0.15)',
              color: colors.sensor,
              fontSize: '11px',
              fontWeight: '700',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Real-World
            </span>
            <h2 style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: '700', marginBottom: '6px' }}>
              Applications
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '13px' }}>
              Rolling shutter affects all CMOS cameras
            </p>
            {/* Progress indicator */}
            <div style={{
              marginTop: '12px',
              padding: '8px 16px',
              background: colors.bgCard,
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ color: colors.textMuted, fontSize: '12px' }}>Completed:</span>
              <span style={{ color: colors.success, fontSize: '14px', fontWeight: '700' }}>
                {transferCompleted.size} / 4
              </span>
            </div>
          </div>

          {/* Application cards */}
          {transferApplications.map((app, index) => (
            <div
              key={index}
              style={{
                background: `linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.bgCardLight}40 100%)`,
                margin: '12px 16px',
                padding: '18px',
                borderRadius: '14px',
                border: transferCompleted.has(index) ? `2px solid ${colors.success}` : `1px solid ${colors.border}`,
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: '700' }}>{app.title}</h3>
                {transferCompleted.has(index) && (
                  <span style={{
                    padding: '4px 10px',
                    background: 'rgba(16,185,129,0.15)',
                    borderRadius: '12px',
                    color: colors.success,
                    fontSize: '11px',
                    fontWeight: '700'
                  }}>
                    Completed
                  </span>
                )}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '14px', lineHeight: 1.5 }}>{app.description}</p>

              {/* Stats display from realWorldApps */}
              {realWorldApps[index] && realWorldApps[index].stats && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  marginBottom: '14px'
                }}>
                  {realWorldApps[index].stats.map((stat, i) => (
                    <div key={i} style={{
                      background: colors.bgCardLight,
                      padding: '10px',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '14px', marginBottom: '2px' }}>{stat.icon}</div>
                      <div style={{ color: colors.accent, fontSize: '14px', fontWeight: '700', marginBottom: '2px' }}>
                        {stat.value}
                      </div>
                      <div style={{ color: colors.textMuted, fontSize: '10px' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Question box */}
              <div style={{
                background: 'rgba(236,72,153,0.08)',
                padding: '14px',
                borderRadius: '10px',
                marginBottom: '12px',
                borderLeft: `3px solid ${colors.accent}`
              }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: '600', lineHeight: 1.4 }}>
                  {app.question}
                </p>
              </div>

              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.accent}`,
                    background: 'transparent',
                    color: colors.accent,
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Got It
                </button>
              ) : (
                <div style={{
                  background: 'rgba(16,185,129,0.08)',
                  padding: '14px',
                  borderRadius: '10px',
                  borderLeft: `3px solid ${colors.success}`
                }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px', lineHeight: 1.6 }}>{app.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgDark }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            {/* Score banner */}
            <div style={{
              background: testScore >= 8
                ? 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.05) 100%)'
                : 'linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0.05) 100%)',
              margin: '16px',
              padding: '28px',
              borderRadius: '16px',
              textAlign: 'center',
              border: `2px solid ${testScore >= 8 ? colors.success : colors.danger}`
            }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.danger, fontSize: '24px', marginBottom: '8px' }}>
                {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '36px', fontWeight: '800' }}>
                {testScore} / 10
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '8px' }}>
                {testScore >= 8 ? 'You have mastered rolling shutter!' : 'Review the material and try again.'}
              </p>
            </div>

            {/* Questions review */}
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div
                  key={qIndex}
                  style={{
                    background: `linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.bgCardLight}40 100%)`,
                    margin: '12px 16px',
                    padding: '16px',
                    borderRadius: '12px',
                    borderLeft: `4px solid ${isCorrect ? colors.success : colors.danger}`
                  }}
                >
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: '600', fontSize: '14px' }}>
                    {qIndex + 1}. {q.question}
                  </p>
                  {q.options.map((opt, oIndex) => (
                    <div
                      key={oIndex}
                      style={{
                        padding: '10px 14px',
                        marginBottom: '6px',
                        borderRadius: '8px',
                        background: opt.correct
                          ? 'rgba(16,185,129,0.15)'
                          : userAnswer === oIndex
                            ? 'rgba(239,68,68,0.15)'
                            : 'transparent',
                        color: opt.correct
                          ? colors.success
                          : userAnswer === oIndex
                            ? colors.danger
                            : colors.textMuted,
                        fontSize: '13px'
                      }}
                    >
                      {opt.correct ? '✓' : userAnswer === oIndex ? '✗' : '○'} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgDark }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px 16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: '700' }}>Knowledge Test</h2>
              <span style={{
                padding: '6px 14px',
                background: colors.bgCard,
                borderRadius: '20px',
                color: colors.textSecondary,
                fontSize: '13px',
                fontWeight: '600'
              }}>
                Question {currentTestQuestion + 1} of 10
              </span>
            </div>

            {/* Progress bar */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentTestQuestion(i)}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    background: testAnswers[i] !== null
                      ? colors.accent
                      : i === currentTestQuestion
                        ? colors.textMuted
                        : colors.bgCardLight,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                />
              ))}
            </div>

            {/* Question card */}
            <div style={{
              background: `linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.bgCardLight}40 100%)`,
              padding: '20px',
              borderRadius: '14px',
              marginBottom: '18px',
              border: `1px solid ${colors.border}`
            }}>
              {/* Scenario context */}
              <div style={{
                background: 'rgba(59,130,246,0.1)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '14px',
                borderLeft: `3px solid ${colors.propeller}`
              }}>
                <p style={{ color: colors.textSecondary, fontSize: '12px', lineHeight: 1.6, marginBottom: '6px' }}>
                  <strong style={{ color: colors.propeller }}>SCENARIO:</strong> Consider the rolling shutter effect we explored with spinning propellers and camera scans. A CMOS camera sensor reads pixels row by row from top to bottom, taking 10-30ms to scan the full frame. Fast-moving objects captured during this scan appear distorted.
                </p>
                <p style={{ color: '#cbd5e1' , fontSize: '12px', lineHeight: 1.5 }}>
                  {currentTestQuestion < 3 ? 'Remember how the sensor scans row-by-row, capturing different moments in time. Each horizontal row is read sequentially, so objects moving between scans appear in different positions across rows.' :
                   currentTestQuestion < 6 ? 'Think about how motion during the scan creates the distortion effect. The faster the object moves relative to the scan speed, the greater the apparent distortion in the captured image.' :
                   'Apply your understanding of rolling shutter to real-world camera situations. Consider how readout time, object velocity, and global shutter alternatives affect image quality.'}
                </p>
              </div>
              <p style={{ color: colors.textPrimary, fontSize: '15px', lineHeight: 1.5, fontWeight: '500' }}>
                {currentQ.question}
              </p>
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button
                  key={oIndex}
                  onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                  style={{
                    padding: '16px 18px',
                    borderRadius: '12px',
                    border: testAnswers[currentTestQuestion] === oIndex
                      ? `2px solid ${colors.accent}`
                      : `1px solid ${colors.border}`,
                    background: testAnswers[currentTestQuestion] === oIndex
                      ? 'linear-gradient(135deg, rgba(236,72,153,0.2) 0%, rgba(236,72,153,0.05) 100%)'
                      : colors.bgCard,
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    lineHeight: 1.4,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px 16px', gap: '12px' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '14px 24px',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                background: 'transparent',
                color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary,
                fontWeight: '600',
                fontSize: '14px',
                opacity: currentTestQuestion === 0 ? 0.5 : 1,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              Previous
            </button>
            {currentTestQuestion < 9 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '14px 28px',
                  borderRadius: '10px',
                  background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`,
                  border: 'none',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: `0 4px 16px ${colors.accent}30`
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={submitTest}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '14px 28px',
                  borderRadius: '10px',
                  background: testAnswers.includes(null)
                    ? colors.bgCardLight
                    : `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`,
                  border: 'none',
                  color: testAnswers.includes(null) ? colors.textMuted : 'white',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  boxShadow: testAnswers.includes(null) ? 'none' : `0 4px 16px ${colors.success}30`
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

  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgDark }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {/* Hero celebration */}
          <div style={{ padding: '32px 24px 24px', textAlign: 'center' }}>
            {/* Trophy with glow effect */}
            <div style={{
              width: '100px',
              height: '100px',
              margin: '0 auto 20px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.05) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 40px rgba(16,185,129,0.3), 0 0 80px rgba(16,185,129,0.15)'
            }}>
              <span style={{ fontSize: '50px' }}>🏆</span>
            </div>

            <h1 style={{
              color: colors.success,
              fontSize: isMobile ? '26px' : '32px',
              fontWeight: '800',
              marginBottom: '10px'
            }}>
              Mastery Achieved!
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: 1.5 }}>
              You've mastered rolling shutter effects
            </p>
          </div>

          {/* Key concepts card */}
          <div style={{
            background: `linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.bgCardLight}40 100%)`,
            margin: '0 16px 20px',
            padding: '20px',
            borderRadius: '16px',
            border: `1px solid ${colors.border}`
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '16px', fontSize: '16px', fontWeight: '700' }}>
              Key Concepts Mastered
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { icon: '📷', text: 'Sequential row-by-row sensor scanning', color: colors.sensor },
                { icon: '⏱️', text: 'Time offset creates spatial distortion', color: colors.warning },
                { icon: '🍮', text: 'Jello effect from camera shake', color: colors.accent },
                { icon: '✅', text: 'Global shutter as the solution', color: colors.success }
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 14px',
                  background: colors.bgCardLight,
                  borderRadius: '10px',
                  borderLeft: `3px solid ${item.color}`
                }}>
                  <span style={{ fontSize: '20px' }}>{item.icon}</span>
                  <span style={{ color: colors.textPrimary, fontSize: '14px' }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Final visualization */}
          <div style={{ padding: '0 16px 16px' }}>
            <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '12px' }}>
              Continue experimenting with the simulation below
            </p>
            {renderVisualization(true)}
          </div>

          {/* Achievement badge */}
          <div style={{
            margin: '0 16px',
            padding: '16px',
            background: 'linear-gradient(135deg, rgba(236,72,153,0.1) 0%, rgba(168,85,247,0.1) 100%)',
            borderRadius: '12px',
            border: `1px solid rgba(236,72,153,0.3)`,
            textAlign: 'center'
          }}>
            <p style={{ color: colors.accent, fontSize: '12px', fontWeight: '700', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Achievement Unlocked
            </p>
            <p style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: '600' }}>
              Rolling Shutter Expert
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  // This should never be reached because we default to 'hook' above
  return null;
};

export default RollingShutterRenderer;
