'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ===============================================================================
// TYPES & INTERFACES
// ===============================================================================
interface CapacitiveTouchRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

interface TouchPoint {
  x: number;
  y: number;
  capacitance: number;
}

const realWorldApps = [
  {
    icon: '📱',
    title: 'Smartphone Touchscreens',
    short: 'Multi-touch displays',
    tagline: 'How your phone knows where you touch',
    description: 'Every smartphone uses capacitive touch technology to detect finger positions with millimeter precision. The screen senses changes in its electric field when your conductive finger approaches.',
    connection: 'Your finger acts as a conductor, coupling capacitively to the sensor grid. The touch controller measures capacitance changes at each grid intersection to locate multiple simultaneous touches.',
    howItWorks: 'A grid of transparent ITO (indium tin oxide) electrodes sits behind the glass. The controller sends AC signals and measures how much charge couples to your finger at each intersection.',
    stats: [
      { value: '10+', label: 'Simultaneous touches', icon: '👆' },
      { value: '240Hz', label: 'Touch sample rate', icon: '⚡' },
      { value: '< 1mm', label: 'Position accuracy', icon: '🎯' }
    ],
    examples: ['iPhone displays', 'Android phones', 'Tablets', 'Smart watches'],
    companies: ['Apple', 'Samsung', 'Synaptics', 'Goodix'],
    futureImpact: 'Under-display fingerprint sensors and force-sensing displays are extending capacitive technology to new dimensions of interaction.',
    color: '#3B82F6'
  },
  {
    icon: '🎹',
    title: 'Touch-Sensitive Instruments',
    short: 'Expressive digital music',
    tagline: 'Velocity and pressure through capacitance',
    description: 'Modern MIDI controllers and digital pianos use capacitive sensing to detect not just which key you press, but how fast and hard - enabling expressive musical performance.',
    connection: 'The rate of capacitance change indicates velocity (how fast you struck). Some instruments measure the total capacitance change to infer pressure for continuous expression control.',
    howItWorks: 'Conductive pads under each key sense finger approach before physical contact. The slope of the capacitance curve gives velocity. Continuous sensing enables aftertouch pressure control.',
    stats: [
      { value: '127', label: 'Velocity levels', icon: '🎵' },
      { value: '< 5ms', label: 'Latency', icon: '⚡' },
      { value: '16', label: 'Polyphonic aftertouch', icon: '🎹' }
    ],
    examples: ['Roli Seaboard', 'Ableton Push', 'Native Instruments', 'Sensel Morph'],
    companies: ['Roli', 'Ableton', 'Native Instruments', 'Sensel'],
    futureImpact: 'Capacitive sensing combined with pressure and position tracking is enabling entirely new musical instruments with unprecedented expressiveness.',
    color: '#8B5CF6'
  },
  {
    icon: '🚗',
    title: 'Automotive Touch Controls',
    short: 'Car interior interfaces',
    tagline: 'Touch panels replacing buttons',
    description: 'Modern vehicles use capacitive touch for climate controls, infotainment, and steering wheel buttons. The technology enables sleek designs with fewer mechanical parts to fail.',
    connection: 'Capacitive sensors work through automotive-grade glass and plastic overlays. Proximity detection can wake controls as your hand approaches, providing a preview before touch.',
    howItWorks: 'Projected capacitive sensors beneath the display surface detect fingers through thick glass. Haptic feedback motors simulate button clicks. Glove detection modes increase sensitivity.',
    stats: [
      { value: '15"+', label: 'Display sizes', icon: '📺' },
      { value: '-40°C', label: 'Operating range', icon: '❄️' },
      { value: '15 year', label: 'Reliability target', icon: '🔧' }
    ],
    examples: ['Tesla touchscreens', 'BMW iDrive', 'Mercedes MBUX', 'Lucid interface'],
    companies: ['Tesla', 'Continental', 'Bosch', 'Visteon'],
    futureImpact: 'Gesture recognition above the display surface and haptic feedback are making capacitive car controls safer and more intuitive for drivers.',
    color: '#10B981'
  },
  {
    icon: '💧',
    title: 'Liquid Level Sensing',
    short: 'Non-contact fluid detection',
    tagline: 'Measuring liquids through container walls',
    description: 'Capacitive sensors can detect liquid levels through non-metallic container walls. This enables sealed, hygienic sensing for medical, food, and industrial applications.',
    connection: 'Liquids have different dielectric constants than air. A capacitive sensor on the outside of a container detects the liquid level by measuring how the capacitance changes with fill level.',
    howItWorks: 'Electrodes on the container exterior form a capacitor with the liquid inside as part of the dielectric. As liquid level rises, capacitance increases proportionally. No contact with fluid needed.',
    stats: [
      { value: '± 1mm', label: 'Level accuracy', icon: '📏' },
      { value: '100%', label: 'Sealed container', icon: '🔒' },
      { value: '10+ year', label: 'Sensor lifetime', icon: '⏰' }
    ],
    examples: ['Medical IV bags', 'Coffee makers', 'Industrial tanks', 'Dishwasher salt'],
    companies: ['Siemens', 'Endress+Hauser', 'Sensata', 'TE Connectivity'],
    futureImpact: 'Smart containers with embedded capacitive sensors will enable automated inventory tracking and prevent running out of essential supplies.',
    color: '#F59E0B'
  }
];

// ===============================================================================
// CONSTANTS
// ===============================================================================
const TEST_QUESTIONS = [
  {
    question: 'What does your finger change when touching a capacitive screen?',
    options: [
      { text: 'The screen temperature', correct: false },
      { text: 'The local capacitance in the touch grid', correct: true },
      { text: 'The screen brightness', correct: false },
      { text: 'The electrical resistance', correct: false }
    ]
  },
  {
    question: 'Why don\'t regular gloves work on touchscreens?',
    options: [
      { text: 'They\'re too thick to press hard enough', correct: false },
      { text: 'They block the capacitive coupling with your body', correct: true },
      { text: 'They create static electricity', correct: false },
      { text: 'The screen can\'t sense warmth through them', correct: false }
    ]
  },
  {
    question: 'How does the screen know WHERE you touched?',
    options: [
      { text: 'A camera watches your finger', correct: false },
      { text: 'Pressure sensors under the glass', correct: false },
      { text: 'Grid of electrodes detects which intersection changed', correct: true },
      { text: 'Sound waves bounce off your finger', correct: false }
    ]
  },
  {
    question: 'Why can capacitive screens detect multiple touches?',
    options: [
      { text: 'Multiple pressure sensors', correct: false },
      { text: 'Each touch point changes capacitance at a different grid location', correct: true },
      { text: 'The screen has multiple layers', correct: false },
      { text: 'The CPU is very fast', correct: false }
    ]
  },
  {
    question: 'What is the difference between mutual capacitance and self-capacitance touchscreens?',
    options: [
      { text: 'Mutual capacitance measures between X-Y electrode pairs; self-capacitance measures each electrode individually', correct: true },
      { text: 'Self-capacitance is newer and always better', correct: false },
      { text: 'Mutual capacitance only works with styluses', correct: false },
      { text: 'There is no difference, they are the same technology', correct: false }
    ]
  },
  {
    question: 'Why do capacitive styluses need a conductive tip or active electronics?',
    options: [
      { text: 'To make the stylus heavier for better control', correct: false },
      { text: 'To create the same capacitive coupling effect as a finger', correct: true },
      { text: 'To generate heat that the screen detects', correct: false },
      { text: 'To produce clicking sounds for feedback', correct: false }
    ]
  },
  {
    question: 'What property of the human body makes capacitive touchscreens work?',
    options: [
      { text: 'Body temperature', correct: false },
      { text: 'Skin texture and fingerprints', correct: false },
      { text: 'The body is electrically conductive (contains water and ions)', correct: true },
      { text: 'Magnetic fields from blood flow', correct: false }
    ]
  },
  {
    question: 'When you touch a capacitive screen, what physically happens to the electric field?',
    options: [
      { text: 'The field is completely blocked', correct: false },
      { text: 'The field lines are distorted and some terminate on your finger', correct: true },
      { text: 'The field reverses direction', correct: false },
      { text: 'Nothing happens to the field, only pressure matters', correct: false }
    ]
  },
  {
    question: 'Why do capacitive touchscreens work through thin glass but not thick glass?',
    options: [
      { text: 'Thin glass is more conductive', correct: false },
      { text: 'The capacitive coupling weakens with distance; thick glass puts finger too far from electrodes', correct: true },
      { text: 'Thick glass absorbs all the electricity', correct: false },
      { text: 'The screen cannot see through thick glass', correct: false }
    ]
  },
  {
    question: 'What advantage does projected capacitive touch (PCT) have over older resistive touchscreens?',
    options: [
      { text: 'PCT is cheaper to manufacture', correct: false },
      { text: 'PCT supports multi-touch, is more durable, and works without pressure', correct: true },
      { text: 'Resistive screens cannot detect any touch', correct: false },
      { text: 'PCT screens are always smaller', correct: false }
    ]
  }
];

const TRANSFER_APPS = [
  {
    title: 'Smartphones & Tablets',
    description: 'Projected capacitive touch (PCT) enables multi-touch gestures like pinch-to-zoom with incredible precision.',
    icon: '📱'
  },
  {
    title: 'Touch Gloves',
    description: 'Conductive threads in fingertips allow capacitive coupling through the glove material.',
    icon: '🧤'
  },
  {
    title: 'Stylus Pens',
    description: 'Active styluses have conductive tips or electronics that mimic finger capacitance for drawing.',
    icon: '✏️'
  },
  {
    title: 'Car Touchscreens',
    description: 'Infotainment systems use capacitive touch. Some new cars add haptic feedback for "button" feel.',
    icon: '🚗'
  }
];

// ===============================================================================
// MAIN COMPONENT
// ===============================================================================
const CapacitiveTouchRenderer: React.FC<CapacitiveTouchRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer
}) => {
  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Premium Design System
  const colors = {
    primary: '#06b6d4',       // cyan-500
    primaryDark: '#0891b2',   // cyan-600
    accent: '#8b5cf6',        // violet-500 (for electric/capacitance)
    secondary: '#3b82f6',     // blue-500
    success: '#10b981',       // emerald-500
    danger: '#ef4444',        // red-500
    warning: '#f59e0b',       // amber-500
    bgDark: '#020617',        // slate-950
    bgCard: '#0f172a',        // slate-900
    bgCardLight: '#1e293b',   // slate-800
    textPrimary: '#f8fafc',   // slate-50
    textSecondary: '#94a3b8', // slate-400
    textMuted: '#64748b',     // slate-500
    border: '#334155',        // slate-700
    borderLight: '#475569',   // slate-600
    // Theme-specific
    electric: '#a78bfa',      // violet-400
    touchPoint: '#22d3ee',    // cyan-400
    gridLine: '#334155',      // slate-700
  };

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

  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(TEST_QUESTIONS.length).fill(null));
  const [showTestResults, setShowTestResults] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Simulation state
  const [touchPoints, setTouchPoints] = useState<TouchPoint[]>([]);
  const [isFingerMode, setIsFingerMode] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [touchMode, setTouchMode] = useState<'finger' | 'glove' | 'capacitiveGlove'>('finger');

  // Interactive slider states for play phase
  const [fingerDistance, setFingerDistance] = useState(5); // 0 to 10mm
  const [dielectricConstant, setDielectricConstant] = useState(3.9); // Glass ~3.9, Air ~1
  const [electrodeSpacing, setElectrodeSpacing] = useState(2); // 1 to 5mm
  const [touchThreshold] = useState(0.5); // Detection threshold (normalized)

  // Multi-touch simulation states for twist_play phase
  const [multiTouchPoints, setMultiTouchPoints] = useState<{x: number; y: number; id: number}[]>([]);
  const [gestureMode, setGestureMode] = useState<'single' | 'pinch' | 'spread' | 'rotate'>('single');
  const [pinchScale, setPinchScale] = useState(1);
  const [rotationAngle, setRotationAngle] = useState(0);

  const lastClickRef = useRef(0);
  const svgRef = useRef<SVGSVGElement>(null);

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
    } catch { /* Audio not available */ }
  }, []);

  const handleSvgTouch = (e: React.PointerEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const points: TouchPoint[] = [];

    if ('touches' in e) {
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const x = ((touch.clientX - rect.left) / rect.width) * 400;
        const y = ((touch.clientY - rect.top) / rect.height) * 280;
        points.push({
          x, y,
          capacitance: isFingerMode || touchMode === 'finger' || touchMode === 'capacitiveGlove' ? 1 : 0
        });
      }
    } else {
      const x = ((e.clientX - rect.left) / rect.width) * 400;
      const y = ((e.clientY - rect.top) / rect.height) * 280;
      points.push({
        x, y,
        capacitance: isFingerMode || touchMode === 'finger' || touchMode === 'capacitiveGlove' ? 1 : 0
      });
    }
    setTouchPoints(points);
  };

  const handleTouchEnd = () => setTouchPoints([]);

  useEffect(() => {
    if (phase === 'play') {
      setTouchPoints([]);
      setIsFingerMode(true);
      setShowGrid(true);
    }
    if (phase === 'twist_play') {
      setTouchPoints([]);
      setTouchMode('finger');
    }
  }, [phase]);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'B' ? 'success' : 'failure');
  }, [playSound]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'B' ? 'success' : 'failure');
  }, [playSound]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
  }, []);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
  }, [playSound]);

  const submitTest = () => {
    let score = 0;
    TEST_QUESTIONS.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setShowTestResults(true);
    if (score >= 3 && onCorrectAnswer) onCorrectAnswer();
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

  const renderTouchScreen = (mode: 'finger' | 'glove' | 'capacitiveGlove' = 'finger', points: TouchPoint[]) => {
    const gridSize = 8;
    const cellWidth = 400 / gridSize;
    const cellHeight = 280 / gridSize;

    return (
      <div style={{ position: 'relative' }}>
        <svg
          ref={svgRef}
          viewBox="0 0 400 280"
          className="w-full h-56 cursor-pointer touch-none"
          onPointerDown={handleSvgTouch}
          onPointerMove={(e) => e.buttons && handleSvgTouch(e)}
          onPointerUp={handleTouchEnd}
          onPointerLeave={handleTouchEnd}
          onTouchStart={handleSvgTouch}
          onTouchMove={handleSvgTouch}
          onTouchEnd={handleTouchEnd}
        >
          <defs>
            {/* Premium glass screen gradient */}
            <linearGradient id="capScreenGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="25%" stopColor="#0f2847" />
              <stop offset="50%" stopColor="#0a1929" />
              <stop offset="75%" stopColor="#0f2847" />
              <stop offset="100%" stopColor="#1e3a5f" />
            </linearGradient>

            {/* Glass reflection overlay */}
            <linearGradient id="capGlassReflection" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
              <stop offset="20%" stopColor="#ffffff" stopOpacity="0.05" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.1" />
            </linearGradient>

            {/* Finger gradient - warm skin tones */}
            <radialGradient id="capFingerGrad" cx="40%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#fcd5ce" />
              <stop offset="30%" stopColor="#f8b4a8" />
              <stop offset="60%" stopColor="#e8998d" />
              <stop offset="85%" stopColor="#d68878" />
              <stop offset="100%" stopColor="#c47b6b" />
            </radialGradient>

            {/* Glove gradient - fabric texture */}
            <radialGradient id="capGloveGrad" cx="40%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="35%" stopColor="#4b5563" />
              <stop offset="70%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </radialGradient>

            {/* Capacitive glove gradient - with conductive threads */}
            <radialGradient id="capTouchGloveGrad" cx="40%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="25%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#4b5563" />
              <stop offset="75%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </radialGradient>

            {/* Touch point glow - cyan electric */}
            <radialGradient id="capTouchGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="1" />
              <stop offset="30%" stopColor="#06b6d4" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#0891b2" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0e7490" stopOpacity="0" />
            </radialGradient>

            {/* No-detection glow - red warning */}
            <radialGradient id="capNoTouchGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f87171" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#ef4444" stopOpacity="0.5" />
              <stop offset="70%" stopColor="#dc2626" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
            </radialGradient>

            {/* Electric field gradient */}
            <linearGradient id="capFieldLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0" />
              <stop offset="30%" stopColor="#8b5cf6" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#7c3aed" stopOpacity="1" />
              <stop offset="70%" stopColor="#8b5cf6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
            </linearGradient>

            {/* Electrode X gradient - horizontal */}
            <linearGradient id="capElectrodeX" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.3" />
            </linearGradient>

            {/* Electrode Y gradient - vertical */}
            <linearGradient id="capElectrodeY" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#15803d" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#22c55e" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#15803d" stopOpacity="0.3" />
            </linearGradient>

            {/* Grid node gradient */}
            <radialGradient id="capGridNode" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="60%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#374151" />
            </radialGradient>

            {/* Activated node gradient */}
            <radialGradient id="capActiveNode" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="40%" stopColor="#22d3ee" />
              <stop offset="70%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0891b2" />
            </radialGradient>

            {/* Touch glow filter */}
            <filter id="capTouchBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Electric field glow filter */}
            <filter id="capFieldGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Finger shadow filter */}
            <filter id="capFingerShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.4" />
            </filter>

            {/* Capacitive grid pattern */}
            <pattern id="capGridPattern" width={cellWidth} height={cellHeight} patternUnits="userSpaceOnUse">
              <rect width={cellWidth} height={cellHeight} fill="none" stroke="#1e3a5f" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* Premium glass screen background */}
          <rect width="400" height="280" fill="url(#capScreenGlass)" rx="8" />

          {/* Capacitive grid pattern overlay */}
          <rect width="400" height="280" fill="url(#capGridPattern)" rx="8" />

          {/* Glass reflection layer */}
          <rect width="400" height="280" fill="url(#capGlassReflection)" rx="8" />

          {/* Electrode grid visualization */}
          {showGrid && (
            <g>
              {/* Horizontal electrodes (X) */}
              {[...Array(gridSize + 1)].map((_, i) => (
                <line key={`h${i}`} x1="0" y1={i * cellHeight} x2="400" y2={i * cellHeight} stroke="url(#capElectrodeX)" strokeWidth="1.5" />
              ))}
              {/* Vertical electrodes (Y) */}
              {[...Array(gridSize + 1)].map((_, i) => (
                <line key={`v${i}`} x1={i * cellWidth} y1="0" x2={i * cellWidth} y2="280" stroke="url(#capElectrodeY)" strokeWidth="1.5" />
              ))}
              {/* Grid intersection nodes */}
              {[...Array(gridSize + 1)].map((_, i) =>
                [...Array(gridSize + 1)].map((_, j) => (
                  <circle key={`n${i}-${j}`} cx={i * cellWidth} cy={j * cellHeight} r="3" fill="url(#capGridNode)" />
                ))
              )}
            </g>
          )}

          {/* Touch points with premium graphics */}
          {points.map((point, idx) => {
            const gridX = Math.round(point.x / cellWidth);
            const gridY = Math.round(point.y / cellHeight);
            const detected = point.capacitance > 0;
            const fingerGradient = mode === 'finger' ? 'url(#capFingerGrad)'
              : mode === 'capacitiveGlove' ? 'url(#capTouchGloveGrad)'
              : 'url(#capGloveGrad)';

            return (
              <g key={idx}>
                {/* Touch point glow effect */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={detected ? 35 : 28}
                  fill={detected ? "url(#capTouchGlow)" : "url(#capNoTouchGlow)"}
                  filter="url(#capTouchBlur)"
                />

                {/* Activated grid nodes when detected */}
                {detected && showGrid && (
                  <g>
                    {[-1, 0, 1].map(dx =>
                      [-1, 0, 1].map(dy => {
                        const nx = gridX + dx;
                        const ny = gridY + dy;
                        if (nx >= 0 && nx <= gridSize && ny >= 0 && ny <= gridSize) {
                          const dist = Math.sqrt(dx * dx + dy * dy);
                          const intensity = 1 - dist * 0.3;
                          return (
                            <circle
                              key={`effect-${dx}-${dy}`}
                              cx={nx * cellWidth}
                              cy={ny * cellHeight}
                              r={6 + intensity * 2}
                              fill="url(#capActiveNode)"
                              opacity={intensity}
                              className="animate-pulse"
                            />
                          );
                        }
                        return null;
                      })
                    )}
                    {/* Electric field lines radiating from touch point */}
                    {[...Array(12)].map((_, i) => {
                      const angle = (i / 12) * Math.PI * 2;
                      const length = 35;
                      return (
                        <line
                          key={`field-${i}`}
                          x1={point.x}
                          y1={point.y}
                          x2={point.x + Math.cos(angle) * length}
                          y2={point.y + Math.sin(angle) * length}
                          stroke="url(#capFieldLine)"
                          strokeWidth="2"
                          strokeDasharray="6,3"
                          filter="url(#capFieldGlow)"
                          className="animate-pulse"
                        />
                      );
                    })}
                  </g>
                )}

                {/* Finger/glove representation with premium styling */}
                <ellipse
                  cx={point.x}
                  cy={point.y - 15}
                  rx="18"
                  ry="25"
                  fill={fingerGradient}
                  stroke={detected ? "#22d3ee" : "#ef4444"}
                  strokeWidth="2"
                  filter="url(#capFingerShadow)"
                />

                {/* Conductive thread highlight for touch gloves */}
                {mode === 'capacitiveGlove' && (
                  <ellipse
                    cx={point.x}
                    cy={point.y + 5}
                    rx="12"
                    ry="8"
                    fill="none"
                    stroke="#67e8f9"
                    strokeWidth="2"
                    strokeDasharray="4,2"
                  />
                )}

                {/* Status indicator badge */}
                <rect
                  x={point.x - 35}
                  y={point.y + 35}
                  width="70"
                  height="22"
                  rx="6"
                  fill={detected ? '#059669' : '#dc2626'}
                  stroke={detected ? '#10b981' : '#ef4444'}
                  strokeWidth="1"
                />
              </g>
            );
          })}

          {/* Screen bezel effect */}
          <rect
            width="400"
            height="280"
            fill="none"
            rx="8"
            stroke="url(#capScreenGlass)"
            strokeWidth="3"
          />
        </svg>

        {/* Text labels outside SVG using typo system */}
        {points.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: colors.textMuted,
            fontSize: typo.body,
            textAlign: 'center',
            pointerEvents: 'none'
          }}>
            Touch or click anywhere!
          </div>
        )}

        {points.map((point, idx) => {
          const detected = point.capacitance > 0;
          const svgWidth = 400;
          const svgHeight = 280;
          const containerWidth = 100; // percentage
          return (
            <div key={`label-${idx}`} style={{
              position: 'absolute',
              top: `${((point.y + 35 + 5) / svgHeight) * 100}%`,
              left: `${(point.x / svgWidth) * containerWidth}%`,
              transform: 'translateX(-50%)',
              color: '#ffffff',
              fontSize: typo.small,
              fontWeight: 'bold',
              textAlign: 'center',
              pointerEvents: 'none',
              width: '70px'
            }}>
              {detected ? 'DETECTED' : 'NO SIGNAL'}
            </div>
          );
        })}

        {points.length > 0 && points[0].capacitance > 0 && (
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(31, 41, 55, 0.95)',
            borderRadius: '6px',
            padding: '8px 12px',
            pointerEvents: 'none',
            border: `1px solid ${colors.border}`
          }}>
            <div style={{ color: colors.textSecondary, fontSize: typo.label, marginBottom: '2px' }}>Position</div>
            <div style={{ color: colors.touchPoint, fontSize: typo.small, fontWeight: 'bold' }}>
              ({Math.round(points[0].x)}, {Math.round(points[0].y)})
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCapacitorDiagram = () => (
    <div style={{ position: 'relative' }}>
      <svg viewBox="0 0 300 150" className="w-full h-32">
        <defs>
          {/* Background gradient */}
          <linearGradient id="capDiagramBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="50%" stopColor="#0a0f1a" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* Capacitor plate gradient */}
          <linearGradient id="capPlateGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1d4ed8" />
            <stop offset="30%" stopColor="#3b82f6" />
            <stop offset="70%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>

          {/* Electric field gradient */}
          <linearGradient id="capEFieldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#4ade80" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.3" />
          </linearGradient>

          {/* Dielectric gradient */}
          <linearGradient id="capDielectricGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.4" />
          </linearGradient>

          {/* Finger gradient for diagram */}
          <radialGradient id="capDiagramFinger" cx="40%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#fcd5ce" />
            <stop offset="40%" stopColor="#f8b4a8" />
            <stop offset="70%" stopColor="#e8998d" />
            <stop offset="100%" stopColor="#d68878" />
          </radialGradient>

          {/* Field glow filter */}
          <filter id="capDiagramFieldGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width="300" height="150" fill="url(#capDiagramBg)" rx="8" />

        {/* Traditional Capacitor section */}
        <g transform="translate(50, 20)">
          {/* Capacitor plates */}
          <rect x="15" y="25" width="10" height="70" rx="2" fill="url(#capPlateGrad)" />
          <rect x="75" y="25" width="10" height="70" rx="2" fill="url(#capPlateGrad)" />

          {/* Dielectric gap */}
          <rect x="30" y="35" width="40" height="50" fill="url(#capDielectricGrad)" stroke="#fbbf24" strokeWidth="1" strokeDasharray="3,2" rx="2" />

          {/* Electric field lines */}
          {[40, 50, 60, 70].map((y, i) => (
            <line key={i} x1="28" y1={y} x2="72" y2={y} stroke="url(#capEFieldGrad)" strokeWidth="2" strokeDasharray="4,3" filter="url(#capDiagramFieldGlow)" />
          ))}
        </g>

        {/* Touchscreen + Finger section */}
        <g transform="translate(180, 20)">
          {/* Screen electrode */}
          <rect x="15" y="25" width="10" height="70" rx="2" fill="url(#capPlateGrad)" />

          {/* Finger representation */}
          <ellipse cx="80" cy="60" rx="22" ry="32" fill="url(#capDiagramFinger)" stroke="#f87171" strokeWidth="2" />

          {/* Electric field lines curving to finger */}
          <path d="M 28 45 Q 55 45 72 50" fill="none" stroke="url(#capEFieldGrad)" strokeWidth="2" strokeDasharray="4,3" filter="url(#capDiagramFieldGlow)" />
          <path d="M 28 60 Q 55 60 72 60" fill="none" stroke="url(#capEFieldGrad)" strokeWidth="2" strokeDasharray="4,3" filter="url(#capDiagramFieldGlow)" />
          <path d="M 28 75 Q 55 75 72 70" fill="none" stroke="url(#capEFieldGrad)" strokeWidth="2" strokeDasharray="4,3" filter="url(#capDiagramFieldGlow)" />
        </g>
      </svg>

      {/* Text labels outside SVG */}
      <div style={{
        position: 'absolute',
        top: '8px',
        left: '50px',
        width: '100px',
        textAlign: 'center',
        color: colors.textSecondary,
        fontSize: typo.label,
        fontWeight: 500
      }}>
        Traditional Capacitor
      </div>
      <div style={{
        position: 'absolute',
        bottom: '8px',
        left: '50px',
        width: '100px',
        textAlign: 'center',
        color: colors.textMuted,
        fontSize: typo.label
      }}>
        2 plates, 1 gap
      </div>
      <div style={{
        position: 'absolute',
        top: '55%',
        left: '95px',
        color: '#fbbf24',
        fontSize: typo.label,
        fontWeight: 500
      }}>
        Gap
      </div>

      <div style={{
        position: 'absolute',
        top: '8px',
        right: '20px',
        width: '100px',
        textAlign: 'center',
        color: colors.textSecondary,
        fontSize: typo.label,
        fontWeight: 500
      }}>
        Touchscreen + Finger
      </div>
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '195px',
        color: '#60a5fa',
        fontSize: typo.label
      }}>
        Screen
      </div>
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '30px',
        color: '#fca5a5',
        fontSize: typo.label
      }}>
        Finger
      </div>
      <div style={{
        position: 'absolute',
        top: '38%',
        right: '60px',
        color: '#4ade80',
        fontSize: typo.label,
        fontWeight: 500
      }}>
        E-field
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

  // ===============================================================================
  // TEST QUESTIONS - Scenario-based multiple choice questions
  // ===============================================================================
  const testQuestions = [
    {
      scenario: "You're using your smartphone to send a text message. When your finger touches the glass screen, the phone instantly knows exactly where you tapped.",
      question: "How does a capacitive touchscreen detect your finger's location?",
      options: [
        { id: 'a', label: 'A camera beneath the screen photographs your finger' },
        { id: 'b', label: 'Your finger changes the local electric field at the electrode grid intersection', correct: true },
        { id: 'c', label: 'Pressure sensors detect the force of your tap' },
        { id: 'd', label: 'Heat from your finger activates thermal sensors' }
      ],
      explanation: "Capacitive touchscreens use a grid of transparent electrodes. Your conductive finger couples with the electric field, changing the capacitance at that grid location. The controller chip measures these changes to pinpoint touch coordinates."
    },
    {
      scenario: "On a cold winter day, you try to answer an urgent phone call while wearing your wool gloves, but the touchscreen doesn't respond to your taps.",
      question: "Why do regular gloves prevent capacitive touchscreen interaction?",
      options: [
        { id: 'a', label: 'The gloves are too thick to press hard enough on the screen' },
        { id: 'b', label: 'Glove material blocks the capacitive coupling between your finger and the electrodes', correct: true },
        { id: 'c', label: 'Cold temperatures disable the touchscreen sensor' },
        { id: 'd', label: 'Static electricity from the gloves interferes with the display' }
      ],
      explanation: "Capacitive touch requires electrical coupling between your conductive body and the screen's electrodes. Insulating materials like wool or leather block this coupling. Special touchscreen gloves have conductive threads woven into the fingertips to restore the connection."
    },
    {
      scenario: "A graphic designer uses pinch-to-zoom on their tablet while simultaneously rotating an image with two fingers. The device tracks both touch points precisely.",
      question: "How can capacitive screens detect and track multiple simultaneous touches?",
      options: [
        { id: 'a', label: 'The screen rapidly switches between detecting each finger one at a time' },
        { id: 'b', label: 'Each touch creates a distinct capacitance change at a different grid intersection', correct: true },
        { id: 'c', label: 'Multiple pressure sensors activate under each finger' },
        { id: 'd', label: 'The CPU calculates likely touch positions from a single sensor reading' }
      ],
      explanation: "In mutual capacitance (projected capacitive) screens, the controller scans all X-Y electrode intersections. Each finger creates a measurable capacitance change at its location, allowing independent tracking of 10+ simultaneous touch points."
    },
    {
      scenario: "An engineer is choosing between surface capacitive and projected capacitive (PCT) technology for a new interactive museum kiosk that will see heavy public use.",
      question: "What is the key advantage of projected capacitive over surface capacitive touchscreens?",
      options: [
        { id: 'a', label: 'Projected capacitive is significantly cheaper to manufacture' },
        { id: 'b', label: 'Projected capacitive supports multi-touch and works through thicker protective glass', correct: true },
        { id: 'c', label: 'Surface capacitive has better color reproduction' },
        { id: 'd', label: 'Surface capacitive screens are more energy efficient' }
      ],
      explanation: "Projected capacitive (PCT) uses embedded electrode grids that can sense through 2-3mm of cover glass, enabling robust protective layers for public kiosks. PCT's mutual capacitance scanning enables multi-touch, while surface capacitive only detects single touches."
    },
    {
      scenario: "After washing dishes, you try to use your phone with wet hands. The touchscreen behaves erratically, registering phantom touches and missing your actual taps.",
      question: "Why does water cause problems for capacitive touchscreens?",
      options: [
        { id: 'a', label: 'Water is heavier than air and presses down on the screen' },
        { id: 'b', label: 'Water conducts electricity and creates false capacitance changes across the screen', correct: true },
        { id: 'c', label: 'Water droplets refract light and confuse optical sensors' },
        { id: 'd', label: 'Wet skin loses all electrical conductivity' }
      ],
      explanation: "Water is conductive and has a high dielectric constant. Droplets create their own capacitance changes that the screen interprets as touches. Additionally, water can create conductive bridges between your finger and unintended areas, causing erratic behavior."
    },
    {
      scenario: "An artist wants to draw precise lines on their tablet but finds their finger too imprecise. They're researching stylus options and wondering why some work on capacitive screens while others don't.",
      question: "What enables an active stylus to work with capacitive touchscreens?",
      options: [
        { id: 'a', label: 'The stylus tip is made of hard plastic that presses the screen firmly' },
        { id: 'b', label: 'The stylus contains electronics that generate signals mimicking finger capacitance', correct: true },
        { id: 'c', label: 'A magnet in the stylus attracts the screen electrodes' },
        { id: 'd', label: 'The stylus emits infrared light detected by screen sensors' }
      ],
      explanation: "Active styluses contain circuitry that generates electrical signals coupling with the screen's electrodes, just like a finger would. Some also transmit pressure and tilt data. Passive capacitive styluses use conductive tips that transfer your body's capacitance."
    },
    {
      scenario: "A factory automation engineer notices that touchscreen control panels near high-voltage motors occasionally register false touches or become unresponsive.",
      question: "How can electromagnetic interference (EMI) affect capacitive touchscreen performance?",
      options: [
        { id: 'a', label: 'EMI permanently magnetizes the screen electrodes' },
        { id: 'b', label: 'EMI induces noise signals that the controller misinterprets as touch events', correct: true },
        { id: 'c', label: 'EMI causes the display backlight to flicker' },
        { id: 'd', label: 'EMI has no effect on capacitive screens since they use DC signals' }
      ],
      explanation: "Capacitive touch controllers measure tiny charge changes (femtofarads). Strong EMI from motors, welders, or power lines can induce electrical noise that overwhelms legitimate touch signals, causing false triggers or missed touches. Industrial touchscreens use heavy shielding and noise filtering."
    },
    {
      scenario: "A smartphone manufacturer is designing a new touch controller chip that needs to scan a 1920x1080 touch sensor array at 240Hz while consuming minimal power.",
      question: "What is the primary challenge in designing high-performance capacitive touch controller chips?",
      options: [
        { id: 'a', label: 'Making the chip physically small enough to fit in a phone' },
        { id: 'b', label: 'Balancing rapid scanning speed, measurement sensitivity, and power consumption', correct: true },
        { id: 'c', label: 'Ensuring the chip can withstand high temperatures' },
        { id: 'd', label: 'Programming the chip to recognize different finger sizes' }
      ],
      explanation: "Touch controllers must rapidly scan thousands of electrode intersections while detecting femtofarad-level capacitance changes. Higher scan rates improve responsiveness but increase power draw. Advanced controllers use adaptive scanning, sensing only active areas at high rates while idle regions scan slowly."
    },
    {
      scenario: "A luxury car manufacturer wants their dashboard touchscreen to detect when a finger is approaching, before physical contact, to display helpful UI hints.",
      question: "How can capacitive touchscreens implement hover detection?",
      options: [
        { id: 'a', label: 'An infrared proximity sensor mounted beside the screen detects approaching objects' },
        { id: 'b', label: 'The electric field extends above the screen surface, detecting capacitance changes before contact', correct: true },
        { id: 'c', label: 'A tiny radar module measures finger distance' },
        { id: 'd', label: 'The screen camera performs gesture recognition' }
      ],
      explanation: "The electric field from screen electrodes extends several millimeters above the glass. By using highly sensitive controllers and signal processing, hover detection senses the approaching finger's capacitive effect before physical contact, enabling gesture previews and 3D interaction."
    },
    {
      scenario: "A company is deploying touchscreen kiosks in an outdoor environment where users may wear thick work gloves and the screens will be exposed to rain, dust, and extreme temperatures.",
      question: "Which touchscreen technology modification is most critical for reliable industrial outdoor use?",
      options: [
        { id: 'a', label: 'Using a brighter display backlight' },
        { id: 'b', label: 'Implementing glove mode with increased sensitivity and advanced water rejection algorithms', correct: true },
        { id: 'c', label: 'Adding a physical keyboard backup' },
        { id: 'd', label: 'Installing a roof to protect from rain' }
      ],
      explanation: "Industrial capacitive screens use tunable sensitivity ('glove mode') to detect touches through thick gloves by amplifying signal gain. Water rejection algorithms distinguish rain droplets from intentional touches by analyzing touch shape, duration, and capacitance patterns. Ruggedized cover glass resists scratches and impacts."
    }
  ];

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-cyan-400 tracking-wide">PHYSICS EXPLORATION</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
              The Invisible Touch
            </h1>
            <p className="text-lg text-slate-400 max-w-md mb-10">
              How does your phone know exactly where you touched?
            </p>
            <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 rounded-3xl" />
              <div className="relative">
                <div className="text-6xl mb-6">📱👆</div>
                <div className="mt-4 space-y-4">
                  <p className="text-xl text-white/90 font-medium leading-relaxed">
                    Your phone screen isn&apos;t pressing any buttons. It&apos;s just smooth glass.
                  </p>
                  <p className="text-lg text-slate-400 leading-relaxed">
                    Yet it knows exactly where your finger is, and can track 10 fingers at once!
                  </p>
                  <div className="pt-2">
                    <p className="text-base text-cyan-400 font-semibold">
                      The secret: your body is a conductor!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
            <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
              <p className="text-lg text-slate-300 mb-4">
                A capacitive touchscreen has a grid of electrodes under the glass.
                What does your finger actually change when you touch the screen?
              </p>
            </div>
            <div className="grid gap-3 w-full max-w-xl">
              {[
                { id: 'A', text: 'It presses a tiny button at that location' },
                { id: 'B', text: 'It changes the local electric field/capacitance' },
                { id: 'C', text: 'It heats the glass and a sensor detects warmth' },
                { id: 'D', text: 'It reflects light back to a camera' }
              ].map(option => (
                <button
                  key={option.id}
                  onPointerDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
                  disabled={showPredictionFeedback}
                  className={`p-4 rounded-xl text-left transition-all duration-300 ${
                    showPredictionFeedback && selectedPrediction === option.id
                      ? option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                      : showPredictionFeedback && option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400'
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
                  Correct! Your finger changes the local capacitance in the touch grid!
                </p>
              </div>
            )}
          </div>
        </div>
        {renderBottomBar(true, !!selectedPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // Calculate capacitance based on C = εA/d formula
  const calculateCapacitance = (distance: number, dielectric: number, spacing: number) => {
    // Normalize values for visualization
    const baseArea = 1 / spacing; // Smaller spacing = larger effective area
    const capacitance = (dielectric * baseArea) / Math.max(distance, 0.1);
    return Math.min(capacitance, 10); // Cap at 10 for visualization
  };

  const currentCapacitance = calculateCapacitance(fingerDistance, dielectricConstant, electrodeSpacing);
  const isDetected = currentCapacitance > touchThreshold * 10;

  // Render interactive capacitance visualization SVG
  const renderCapacitanceVisualization = () => {
    const normalizedCapacitance = Math.min(currentCapacitance / 10, 1);
    const fingerY = 30 + (fingerDistance / 10) * 80; // Finger position based on distance
    const fieldIntensity = isDetected ? normalizedCapacitance : 0.1;

    return (
      <div style={{ position: 'relative' }}>
        <svg viewBox="0 0 400 200" className="w-full h-48">
          <defs>
            {/* Premium background gradient */}
            <linearGradient id="capVizBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="30%" stopColor="#0a1628" />
              <stop offset="70%" stopColor="#0a1628" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Premium electrode gradient with metallic look */}
            <linearGradient id="capVizElectrode" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="25%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="75%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>

            {/* Glass layer gradient with depth */}
            <linearGradient id="capVizGlass" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.4" />
              <stop offset="30%" stopColor="#93c5fd" stopOpacity="0.25" />
              <stop offset="70%" stopColor="#60a5fa" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.15" />
            </linearGradient>

            {/* Finger gradient - warm skin tones */}
            <radialGradient id="capVizFinger" cx="40%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#fcd5ce" />
              <stop offset="25%" stopColor="#f8b4a8" />
              <stop offset="50%" stopColor="#e8998d" />
              <stop offset="75%" stopColor="#d68878" />
              <stop offset="100%" stopColor="#c47b6b" />
            </radialGradient>

            {/* Electric field gradient with glow */}
            <linearGradient id="capVizField" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={fieldIntensity * 0.3} />
              <stop offset="40%" stopColor="#4ade80" stopOpacity={fieldIntensity * 0.7} />
              <stop offset="60%" stopColor="#86efac" stopOpacity={fieldIntensity * 0.9} />
              <stop offset="100%" stopColor="#4ade80" stopOpacity={fieldIntensity * 0.5} />
            </linearGradient>

            {/* Capacitance meter gradient - detected */}
            <linearGradient id="capVizMeterGreen" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#15803d" />
              <stop offset="30%" stopColor="#16a34a" />
              <stop offset="60%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#4ade80" />
            </linearGradient>

            {/* Capacitance meter gradient - not detected */}
            <linearGradient id="capVizMeterGray" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="50%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#6b7280" />
            </linearGradient>

            {/* Status badge gradients */}
            <linearGradient id="capVizStatusGreen" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>

            <linearGradient id="capVizStatusRed" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            {/* Distance indicator gradient */}
            <linearGradient id="capVizDistance" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.3" />
            </linearGradient>

            {/* Field glow filter */}
            <filter id="capVizFieldGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Finger shadow filter */}
            <filter id="capVizFingerShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="2" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.5" />
            </filter>

            {/* Meter glow filter */}
            <filter id="capVizMeterGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Premium background */}
          <rect width="400" height="200" fill="url(#capVizBg)" rx="8" />

          {/* Subtle grid pattern */}
          <pattern id="capVizGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e3a5f" strokeWidth="0.3" strokeOpacity="0.4" />
          </pattern>
          <rect width="400" height="200" fill="url(#capVizGrid)" rx="8" />

          {/* Glass layer with premium styling */}
          <rect x="50" y="130" width="250" height="22" fill="url(#capVizGlass)" rx="3" />
          <rect x="50" y="130" width="250" height="22" fill="none" stroke="#93c5fd" strokeWidth="1" strokeOpacity="0.6" rx="3" />
          {/* Glass reflection highlight */}
          <rect x="52" y="132" width="246" height="4" fill="white" fillOpacity="0.1" rx="2" />

          {/* Electrode grid with metallic look */}
          <rect x="50" y="152" width="250" height="12" fill="url(#capVizElectrode)" rx="2" />
          {/* Electrode segments */}
          {[...Array(10)].map((_, i) => (
            <rect key={i} x={55 + i * 25} y="154" width="20" height="8" fill="none" stroke="#60a5fa" strokeWidth="0.5" strokeOpacity="0.4" rx="1" />
          ))}

          {/* Electric field lines - dynamic curved paths */}
          {isDetected && [...Array(9)].map((_, i) => {
            const startX = 80 + i * 25;
            const controlOffset = (Math.sin(i * 0.8) * 15);
            return (
              <g key={i}>
                <path
                  d={`M ${startX} 130 Q ${startX + controlOffset} ${(fingerY + 130) / 2} ${startX + controlOffset * 0.5} ${fingerY + 22}`}
                  fill="none"
                  stroke="url(#capVizField)"
                  strokeWidth={2.5 * fieldIntensity}
                  strokeDasharray="6,4"
                  filter="url(#capVizFieldGlow)"
                  className="animate-pulse"
                />
                {/* Field termination point */}
                <circle
                  cx={startX + controlOffset * 0.5}
                  cy={fingerY + 22}
                  r={4 * fieldIntensity}
                  fill="#4ade80"
                  opacity={fieldIntensity * 0.8}
                  filter="url(#capVizFieldGlow)"
                />
              </g>
            );
          })}

          {/* Finger representation with premium styling */}
          <ellipse
            cx="175"
            cy={fingerY}
            rx="35"
            ry="22"
            fill="url(#capVizFinger)"
            stroke={isDetected ? "#22c55e" : "#ef4444"}
            strokeWidth="3"
            filter="url(#capVizFingerShadow)"
          />
          {/* Fingernail highlight */}
          <ellipse
            cx="175"
            cy={fingerY - 8}
            rx="15"
            ry="8"
            fill="white"
            fillOpacity="0.15"
          />

          {/* Distance indicator with arrow markers */}
          <line x1="220" y1={fingerY + 22} x2="220" y2="128" stroke="url(#capVizDistance)" strokeWidth="2" strokeDasharray="5,3" />
          {/* Arrow heads */}
          <polygon points={`215,${fingerY + 22} 225,${fingerY + 22} 220,${fingerY + 28}`} fill="#f59e0b" opacity="0.8" />
          <polygon points="215,128 225,128 220,122" fill="#f59e0b" opacity="0.8" />

          {/* Capacitance meter with premium styling */}
          <rect x="320" y="20" width="65" height="105" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
          {/* Meter inner frame */}
          <rect x="325" y="35" width="55" height="75" rx="4" fill="#1e293b" />

          {/* Capacitance bar */}
          <rect
            x="332"
            y={102 - normalizedCapacitance * 60}
            width="41"
            height={Math.max(normalizedCapacitance * 60, 2)}
            fill={isDetected ? "url(#capVizMeterGreen)" : "url(#capVizMeterGray)"}
            rx="3"
            filter={isDetected ? "url(#capVizMeterGlow)" : undefined}
          />

          {/* Threshold line */}
          <line x1="328" y1={102 - touchThreshold * 60} x2="378" y2={102 - touchThreshold * 60} stroke="#f59e0b" strokeWidth="2" strokeDasharray="4,2" />

          {/* Detection status badge */}
          <rect
            x="320"
            y="130"
            width="65"
            height="24"
            rx="6"
            fill={isDetected ? "url(#capVizStatusGreen)" : "url(#capVizStatusRed)"}
            stroke={isDetected ? "#4ade80" : "#f87171"}
            strokeWidth="1"
          />

          {/* Frame border */}
          <rect width="400" height="200" fill="none" stroke="#334155" strokeWidth="2" rx="8" />
        </svg>

        {/* Text labels outside SVG using typo system */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '15px',
          color: colors.touchPoint,
          fontSize: typo.body,
          fontFamily: 'monospace',
          fontWeight: 'bold'
        }}>
          C = εA/d
        </div>
        <div style={{
          position: 'absolute',
          top: '28px',
          left: '15px',
          color: colors.textSecondary,
          fontSize: typo.small
        }}>
          Capacitance: {currentCapacitance.toFixed(2)} (norm)
        </div>

        {/* Glass label */}
        <div style={{
          position: 'absolute',
          top: '68%',
          left: '175px',
          transform: 'translateX(-50%)',
          color: '#93c5fd',
          fontSize: typo.label,
          textAlign: 'center'
        }}>
          Glass (ε = {dielectricConstant.toFixed(1)})
        </div>

        {/* Electrode label */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '175px',
          transform: 'translateX(-50%)',
          color: '#60a5fa',
          fontSize: typo.label,
          textAlign: 'center'
        }}>
          Electrode Grid (spacing: {electrodeSpacing}mm)
        </div>

        {/* Distance label */}
        <div style={{
          position: 'absolute',
          top: `${((fingerY + 130) / 2 / 200) * 100}%`,
          left: '240px',
          color: '#fbbf24',
          fontSize: typo.small,
          fontWeight: 'bold'
        }}>
          {fingerDistance.toFixed(1)}mm
        </div>

        {/* Meter label */}
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '25px',
          color: colors.textSecondary,
          fontSize: typo.label,
          textAlign: 'center',
          width: '55px'
        }}>
          C
        </div>

        {/* Threshold label */}
        <div style={{
          position: 'absolute',
          top: `${((102 - touchThreshold * 60 - 8) / 200) * 100}%`,
          right: '10px',
          color: '#f59e0b',
          fontSize: typo.label
        }}>
          Threshold
        </div>

        {/* Status label */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          right: '25px',
          color: '#ffffff',
          fontSize: typo.label,
          fontWeight: 'bold',
          width: '55px',
          textAlign: 'center'
        }}>
          {isDetected ? "DETECTED" : "NO SIGNAL"}
        </div>
      </div>
    );
  };

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Capacitive Touch Simulator</h2>

            {/* Interactive Visualization */}
            <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-2xl">
              {renderCapacitanceVisualization()}
            </div>

            {/* Range Sliders */}
            <div className="bg-slate-800/50 rounded-2xl p-6 mb-4 w-full max-w-2xl space-y-6">
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">Adjust Parameters</h3>

              {/* Finger Distance Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-slate-300 font-medium">Finger Distance from Screen</label>
                  <span className="text-cyan-400 font-mono">{fingerDistance.toFixed(1)} mm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={fingerDistance}
                  onChange={(e) => setFingerDistance(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  style={{ zIndex: 10 }}
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>0mm (touching)</span>
                  <span>10mm (far)</span>
                </div>
              </div>

              {/* Dielectric Constant Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-slate-300 font-medium">Dielectric Constant (ε)</label>
                  <span className="text-cyan-400 font-mono">ε = {dielectricConstant.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.1"
                  value={dielectricConstant}
                  onChange={(e) => setDielectricConstant(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                  style={{ zIndex: 10 }}
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>1.0 (Air)</span>
                  <span>3.9 (Glass)</span>
                  <span>10.0 (High-k)</span>
                </div>
              </div>

              {/* Electrode Spacing Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-slate-300 font-medium">Electrode Spacing</label>
                  <span className="text-cyan-400 font-mono">{electrodeSpacing.toFixed(1)} mm</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.1"
                  value={electrodeSpacing}
                  onChange={(e) => setElectrodeSpacing(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  style={{ zIndex: 10 }}
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>1mm (dense)</span>
                  <span>5mm (sparse)</span>
                </div>
              </div>
            </div>

            {/* Touch Grid Demo */}
            <div className="bg-slate-800/50 rounded-2xl p-6 mb-4 w-full max-w-2xl">
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">Touch Grid Demo</h3>
              {renderTouchScreen(isFingerMode ? 'finger' : 'glove', touchPoints)}
            </div>

            {/* Control Buttons */}
            <div className="flex justify-center gap-4 mb-6">
              <button
                onClick={() => { setIsFingerMode(true); setTouchPoints([]); }}
                style={{ zIndex: 10 }}
                className={`px-4 py-2 rounded-lg font-bold ${isFingerMode ? 'bg-cyan-600 text-white' : 'bg-slate-600 text-slate-300'}`}
              >
                Bare Finger
              </button>
              <button
                onClick={() => setShowGrid(!showGrid)}
                style={{ zIndex: 10 }}
                className={`px-4 py-2 rounded-lg font-bold ${showGrid ? 'bg-green-600 text-white' : 'bg-slate-600 text-slate-300'}`}
              >
                {showGrid ? 'Hide' : 'Show'} Grid
              </button>
              <button
                onClick={() => { setFingerDistance(5); setDielectricConstant(3.9); setElectrodeSpacing(2); }}
                style={{ zIndex: 10 }}
                className="px-4 py-2 rounded-lg font-bold bg-amber-600 text-white"
              >
                Reset Values
              </button>
            </div>

            {/* Physics Explanation */}
            <div className="bg-gradient-to-r from-blue-900/40 to-cyan-900/40 rounded-xl p-4 max-w-2xl w-full mb-6">
              <p className="text-slate-300 text-center">
                <span className="text-cyan-400 font-bold">C = εA/d</span> - Capacitance increases when:
                dielectric constant (ε) increases, electrode area (A) increases, or distance (d) decreases.
                {isDetected ?
                  <span className="text-green-400 block mt-2">Touch detected! Capacitance exceeds threshold.</span> :
                  <span className="text-red-400 block mt-2">Move finger closer to trigger detection.</span>
                }
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Your Finger Is a Capacitor Plate!</h2>
            <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl space-y-4">
              <div className="p-4 bg-cyan-900/30 rounded-lg border border-cyan-600">
                <h3 className="text-cyan-400 font-bold mb-2">The Capacitive Principle</h3>
                <p className="text-slate-300">
                  Your body is conductive (mostly water + ions). When your finger approaches the screen,
                  it forms a <span className="text-yellow-400 font-bold">capacitor</span> with the electrode grid.
                </p>
              </div>
              {renderCapacitorDiagram()}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <h4 className="text-blue-400 font-bold mb-2">X-Y Grid</h4>
                  <ul className="text-slate-300 text-sm space-y-1">
                    <li>Horizontal electrodes (X)</li>
                    <li>Vertical electrodes (Y)</li>
                    <li>Intersections form sensing points</li>
                  </ul>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <h4 className="text-green-400 font-bold mb-2">Detection</h4>
                  <ul className="text-slate-300 text-sm space-y-1">
                    <li>Controller scans each intersection</li>
                    <li>Measures charge/discharge time</li>
                    <li>Finger = slower discharge = detected!</li>
                  </ul>
                </div>
              </div>
              <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
                <p className="text-yellow-300">
                  <strong>Multi-Touch:</strong> Each grid intersection is independent!
                  10 fingers = 10 different locations with changed capacitance.
                </p>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist!')}
      </div>
    );
  }

  // Handle adding/removing multi-touch points in grid
  const handleGridClick = (e: React.PointerEvent<SVGSVGElement>) => {
    if (gestureMode !== 'single') return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 400;
    const y = ((e.clientY - rect.top) / rect.height) * 280;

    setMultiTouchPoints(prev => {
      if (prev.length >= 5) {
        return [...prev.slice(1), { x, y, id: Date.now() }];
      }
      return [...prev, { x, y, id: Date.now() }];
    });
  };

  // Render multi-touch capacitance grid visualization
  const renderMultiTouchGrid = () => {
    const gridSize = 8;
    const cellWidth = 400 / gridSize;
    const cellHeight = 280 / gridSize;

    // Generate multi-touch points based on gesture mode
    const getGesturePoints = () => {
      const centerX = 200;
      const centerY = 140;
      const baseDistance = 60 * pinchScale;

      switch (gestureMode) {
        case 'pinch':
          return [
            { x: centerX - baseDistance, y: centerY, id: 1 },
            { x: centerX + baseDistance, y: centerY, id: 2 }
          ];
        case 'spread':
          return [
            { x: centerX - baseDistance * 1.5, y: centerY - baseDistance * 0.5, id: 1 },
            { x: centerX + baseDistance * 1.5, y: centerY + baseDistance * 0.5, id: 2 }
          ];
        case 'rotate':
          const angle1 = rotationAngle * Math.PI / 180;
          const angle2 = angle1 + Math.PI;
          return [
            { x: centerX + Math.cos(angle1) * 70, y: centerY + Math.sin(angle1) * 70, id: 1 },
            { x: centerX + Math.cos(angle2) * 70, y: centerY + Math.sin(angle2) * 70, id: 2 }
          ];
        default:
          return multiTouchPoints.length > 0 ? multiTouchPoints : [{ x: centerX, y: centerY, id: 1 }];
      }
    };

    const activePoints = gestureMode === 'single' ? (multiTouchPoints.length > 0 ? multiTouchPoints : []) : getGesturePoints();

    // Calculate capacitance grid values based on touch points
    const getGridCapacitance = (gridX: number, gridY: number) => {
      let totalCapacitance = 0;
      activePoints.forEach(point => {
        const dist = Math.sqrt(
          Math.pow((gridX * cellWidth) - point.x, 2) +
          Math.pow((gridY * cellHeight) - point.y, 2)
        );
        // Capacitance falls off with distance
        const contribution = Math.max(0, 1 - dist / 80);
        totalCapacitance += contribution;
      });
      return Math.min(totalCapacitance, 1);
    };

    return (
      <div style={{ position: 'relative' }}>
        <svg
          viewBox="0 0 400 280"
          className="w-full h-64 cursor-pointer touch-none"
          onClick={handleGridClick}
          style={{ zIndex: 10 }}
        >
          <defs>
            {/* Premium background gradient */}
            <linearGradient id="capMultiBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0a0f1e" />
              <stop offset="50%" stopColor="#111827" />
              <stop offset="100%" stopColor="#0a0f1e" />
            </linearGradient>

            {/* Cell heatmap gradient - low intensity */}
            <linearGradient id="capCellLow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="50%" stopColor="#1e40af" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#1e3a5f" />
            </linearGradient>

            {/* Cell heatmap gradient - high intensity */}
            <linearGradient id="capCellHigh" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="30%" stopColor="#06b6d4" />
              <stop offset="70%" stopColor="#0891b2" />
              <stop offset="100%" stopColor="#0e7490" />
            </linearGradient>

            {/* Multi-touch finger gradient */}
            <radialGradient id="capMultiFinger" cx="40%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#fcd5ce" />
              <stop offset="30%" stopColor="#f8b4a8" />
              <stop offset="60%" stopColor="#e8998d" />
              <stop offset="85%" stopColor="#d68878" />
              <stop offset="100%" stopColor="#c47b6b" />
            </radialGradient>

            {/* Field line gradient */}
            <linearGradient id="capMultiField" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#22c55e" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#4ade80" stopOpacity="0.2" />
            </linearGradient>

            {/* Ripple gradient */}
            <radialGradient id="capRippleGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
              <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
            </radialGradient>

            {/* Gesture line gradient - pinch */}
            <linearGradient id="capPinchLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="1" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.3" />
            </linearGradient>

            {/* Rotation arc gradient */}
            <linearGradient id="capRotateArc" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#a855f7" stopOpacity="1" />
              <stop offset="100%" stopColor="#c084fc" stopOpacity="0.3" />
            </linearGradient>

            {/* Touch glow filter */}
            <filter id="capMultiTouchGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Field glow filter */}
            <filter id="capMultiFieldGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Finger shadow */}
            <filter id="capMultiFingerShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="1" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Premium background */}
          <rect width="400" height="280" fill="url(#capMultiBg)" rx="8" />

          {/* Capacitance Grid Visualization with heatmap */}
          {[...Array(gridSize)].map((_, i) =>
            [...Array(gridSize)].map((_, j) => {
              const capacitance = getGridCapacitance(i + 0.5, j + 0.5);
              const isActive = capacitance > 0.3;
              return (
                <g key={`cell-${i}-${j}`}>
                  {/* Cell background with gradient based on intensity */}
                  <rect
                    x={i * cellWidth + 2}
                    y={j * cellHeight + 2}
                    width={cellWidth - 4}
                    height={cellHeight - 4}
                    fill={isActive ? `rgba(6, 182, 212, ${capacitance * 0.7})` : 'url(#capCellLow)'}
                    stroke={isActive ? "#22d3ee" : "#334155"}
                    strokeWidth={isActive ? 2 : 0.5}
                    rx="4"
                    filter={isActive ? "url(#capMultiTouchGlow)" : undefined}
                  />
                  {/* Inner glow for active cells */}
                  {isActive && (
                    <rect
                      x={i * cellWidth + 5}
                      y={j * cellHeight + 5}
                      width={cellWidth - 10}
                      height={cellHeight - 10}
                      fill="none"
                      stroke="#67e8f9"
                      strokeWidth="1"
                      strokeOpacity={capacitance * 0.5}
                      rx="2"
                    />
                  )}
                </g>
              );
            })
          )}

          {/* Premium electrode grid lines */}
          {[...Array(gridSize + 1)].map((_, i) => (
            <g key={`lines-${i}`}>
              <line x1="0" y1={i * cellHeight} x2="400" y2={i * cellHeight} stroke="#3b82f6" strokeWidth="1.5" opacity="0.4" />
              <line x1={i * cellWidth} y1="0" x2={i * cellWidth} y2="280" stroke="#22c55e" strokeWidth="1.5" opacity="0.4" />
              {/* Grid intersection highlights */}
              {[...Array(gridSize + 1)].map((_, j) => (
                <circle key={`node-${i}-${j}`} cx={i * cellWidth} cy={j * cellHeight} r="2" fill="#4b5563" />
              ))}
            </g>
          ))}

          {/* Touch points with premium graphics */}
          {activePoints.map((point, idx) => (
            <g key={`touch-${point.id}`}>
              {/* Outer ripple effect */}
              <circle
                cx={point.x}
                cy={point.y}
                r="45"
                fill="url(#capRippleGrad)"
                className="animate-ping"
              />

              {/* Inner ripple */}
              <circle
                cx={point.x}
                cy={point.y}
                r="35"
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2"
                strokeOpacity="0.5"
                className="animate-pulse"
              />

              {/* Electric field lines with glow */}
              {[...Array(10)].map((_, i) => {
                const angle = (i / 10) * Math.PI * 2;
                const length = 45;
                return (
                  <line
                    key={`field-${idx}-${i}`}
                    x1={point.x}
                    y1={point.y}
                    x2={point.x + Math.cos(angle) * length}
                    y2={point.y + Math.sin(angle) * length}
                    stroke="url(#capMultiField)"
                    strokeWidth="2"
                    strokeDasharray="5,4"
                    filter="url(#capMultiFieldGlow)"
                    className="animate-pulse"
                  />
                );
              })}

              {/* Finger representation with premium styling */}
              <ellipse
                cx={point.x}
                cy={point.y}
                rx="22"
                ry="26"
                fill="url(#capMultiFinger)"
                stroke="#22d3ee"
                strokeWidth="3"
                filter="url(#capMultiFingerShadow)"
              />

              {/* Fingernail highlight */}
              <ellipse
                cx={point.x}
                cy={point.y - 8}
                rx="10"
                ry="6"
                fill="white"
                fillOpacity="0.2"
              />
            </g>
          ))}

          {/* Gesture indicator - Pinch */}
          {gestureMode === 'pinch' && activePoints.length >= 2 && (
            <g>
              <line
                x1={activePoints[0].x}
                y1={activePoints[0].y}
                x2={activePoints[1].x}
                y2={activePoints[1].y}
                stroke="url(#capPinchLine)"
                strokeWidth="3"
                strokeDasharray="8,4"
                filter="url(#capMultiFieldGlow)"
              />
              {/* Arrow indicators at ends */}
              <circle cx={activePoints[0].x} cy={activePoints[0].y} r="5" fill="#f59e0b" />
              <circle cx={activePoints[1].x} cy={activePoints[1].y} r="5" fill="#f59e0b" />
            </g>
          )}

          {/* Gesture indicator - Rotate arc */}
          {gestureMode === 'rotate' && activePoints.length >= 2 && (
            <g>
              <circle cx="200" cy="140" r="70" fill="none" stroke="url(#capRotateArc)" strokeWidth="2" strokeDasharray="6,4" />
              {/* Rotation direction arrow */}
              <path
                d={`M 200 70 A 70 70 0 0 1 ${200 + 70 * Math.sin(rotationAngle * Math.PI / 180)} ${140 - 70 * Math.cos(rotationAngle * Math.PI / 180)}`}
                fill="none"
                stroke="#a855f7"
                strokeWidth="3"
                filter="url(#capMultiFieldGlow)"
              />
            </g>
          )}

          {/* Status display badge */}
          <rect x="10" y="248" width="130" height="28" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="1" />

          {/* Frame border */}
          <rect width="400" height="280" fill="none" stroke="#334155" strokeWidth="2" rx="8" />
        </svg>

        {/* Text labels outside SVG using typo system */}
        {/* Touch count label */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '18px',
          color: colors.touchPoint,
          fontSize: typo.small,
          fontWeight: 'bold'
        }}>
          Touch Points: {activePoints.length}
        </div>

        {/* Gesture mode labels */}
        {gestureMode === 'pinch' && activePoints.length >= 2 && (
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#f59e0b',
            fontSize: typo.body,
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            Pinch Gesture - Distance: {Math.round(pinchScale * 100)}%
          </div>
        )}

        {gestureMode === 'spread' && activePoints.length >= 2 && (
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#4ade80',
            fontSize: typo.body,
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            Spread Gesture - Zoom In
          </div>
        )}

        {gestureMode === 'rotate' && activePoints.length >= 2 && (
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#a855f7',
            fontSize: typo.body,
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            Rotate Gesture - Angle: {rotationAngle}deg
          </div>
        )}

        {/* Finger number labels */}
        {activePoints.map((point, idx) => (
          <div
            key={`label-${point.id}`}
            style={{
              position: 'absolute',
              top: `${(point.y / 280) * 100}%`,
              left: `${(point.x / 400) * 100}%`,
              transform: 'translate(-50%, -50%)',
              color: '#1f2937',
              fontSize: typo.small,
              fontWeight: 'bold',
              pointerEvents: 'none'
            }}
          >
            {idx + 1}
          </div>
        ))}

        {activePoints.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: colors.textMuted,
            fontSize: typo.body,
            textAlign: 'center',
            pointerEvents: 'none'
          }}>
            Select a gesture or tap to add points
          </div>
        )}
      </div>
    );
  };

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
            <h2 className="text-2xl font-bold text-amber-400 mb-6">The Glove Problem</h2>
            <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
              <p className="text-lg text-slate-300 mb-4">
                Regular winter gloves don&apos;t work on touchscreens. Why not?
              </p>
            </div>
            <div className="grid gap-3 w-full max-w-xl">
              {[
                { id: 'A', text: 'Gloves are too thick to press hard enough' },
                { id: 'B', text: 'Insulating material blocks capacitive coupling' },
                { id: 'C', text: 'Gloves create too much static electricity' },
                { id: 'D', text: 'The screen needs to sense body heat' }
              ].map(option => (
                <button
                  key={option.id}
                  onPointerDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
                  disabled={showTwistFeedback}
                  className={`p-4 rounded-xl text-left transition-all duration-300 ${
                    showTwistFeedback && twistPrediction === option.id
                      ? option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                      : showTwistFeedback && option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400'
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
                  Exactly! Insulating fabric blocks the capacitive coupling between your body and the screen!
                </p>
              </div>
            )}
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-amber-400 mb-4">Multi-Touch & Gesture Recognition</h2>

            {/* Multi-Touch Grid Visualization */}
            <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-2xl">
              <h3 className="text-lg font-semibold text-cyan-400 mb-3">Capacitance Grid Heatmap</h3>
              {renderMultiTouchGrid()}
            </div>

            {/* Gesture Mode Selection */}
            <div className="bg-slate-800/50 rounded-2xl p-6 mb-4 w-full max-w-2xl">
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">Gesture Simulation</h3>
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                <button
                  onClick={() => { setGestureMode('single'); setMultiTouchPoints([]); }}
                  style={{ zIndex: 10 }}
                  className={`px-4 py-2 rounded-lg font-bold text-sm ${gestureMode === 'single' ? 'bg-cyan-600 text-white' : 'bg-slate-600 text-slate-300'}`}
                >
                  Single Touch
                </button>
                <button
                  onClick={() => { setGestureMode('pinch'); setPinchScale(1); }}
                  style={{ zIndex: 10 }}
                  className={`px-4 py-2 rounded-lg font-bold text-sm ${gestureMode === 'pinch' ? 'bg-amber-600 text-white' : 'bg-slate-600 text-slate-300'}`}
                >
                  Pinch (Zoom Out)
                </button>
                <button
                  onClick={() => { setGestureMode('spread'); setPinchScale(1.5); }}
                  style={{ zIndex: 10 }}
                  className={`px-4 py-2 rounded-lg font-bold text-sm ${gestureMode === 'spread' ? 'bg-green-600 text-white' : 'bg-slate-600 text-slate-300'}`}
                >
                  Spread (Zoom In)
                </button>
                <button
                  onClick={() => { setGestureMode('rotate'); setRotationAngle(0); }}
                  style={{ zIndex: 10 }}
                  className={`px-4 py-2 rounded-lg font-bold text-sm ${gestureMode === 'rotate' ? 'bg-purple-600 text-white' : 'bg-slate-600 text-slate-300'}`}
                >
                  Rotate
                </button>
              </div>

              {/* Gesture-specific sliders */}
              {gestureMode === 'pinch' && (
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between items-center">
                    <label className="text-slate-300 font-medium">Pinch Distance</label>
                    <span className="text-amber-400 font-mono">{Math.round(pinchScale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="2"
                    step="0.05"
                    value={pinchScale}
                    onChange={(e) => setPinchScale(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    style={{ zIndex: 10 }}
                  />
                  <p className="text-xs text-slate-500 text-center">Move slider to simulate pinch-to-zoom gesture</p>
                </div>
              )}

              {gestureMode === 'rotate' && (
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between items-center">
                    <label className="text-slate-300 font-medium">Rotation Angle</label>
                    <span className="text-purple-400 font-mono">{rotationAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="5"
                    value={rotationAngle}
                    onChange={(e) => setRotationAngle(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    style={{ zIndex: 10 }}
                  />
                  <p className="text-xs text-slate-500 text-center">Rotate two fingers to change image orientation</p>
                </div>
              )}

              {gestureMode === 'single' && (
                <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-slate-300 text-sm text-center">
                    Click on the grid above to add touch points (up to 5). Each point affects nearby capacitance cells.
                  </p>
                  {multiTouchPoints.length > 0 && (
                    <button
                      onClick={() => setMultiTouchPoints([])}
                      style={{ zIndex: 10 }}
                      className="mt-2 w-full py-2 bg-red-600 text-white rounded-lg font-medium"
                    >
                      Clear All Points
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Original Touch Mode Demo */}
            <div className="bg-slate-800/50 rounded-2xl p-6 mb-4 w-full max-w-2xl">
              <h3 className="text-lg font-semibold text-amber-400 mb-4">Finger vs Glove Comparison</h3>
              {renderTouchScreen(touchMode, touchPoints)}
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => { setTouchMode('finger'); setTouchPoints([]); }}
                  style={{ zIndex: 10 }}
                  className={`px-4 py-2 rounded-lg font-bold text-sm ${touchMode === 'finger' ? 'bg-green-600 text-white' : 'bg-slate-600 text-slate-300'}`}
                >
                  Bare Finger
                </button>
                <button
                  onClick={() => { setTouchMode('glove'); setTouchPoints([]); }}
                  style={{ zIndex: 10 }}
                  className={`px-4 py-2 rounded-lg font-bold text-sm ${touchMode === 'glove' ? 'bg-red-600 text-white' : 'bg-slate-600 text-slate-300'}`}
                >
                  Regular Glove
                </button>
                <button
                  onClick={() => { setTouchMode('capacitiveGlove'); setTouchPoints([]); }}
                  style={{ zIndex: 10 }}
                  className={`px-4 py-2 rounded-lg font-bold text-sm ${touchMode === 'capacitiveGlove' ? 'bg-cyan-600 text-white' : 'bg-slate-600 text-slate-300'}`}
                >
                  Touch Glove
                </button>
              </div>
              <div className={`mt-4 p-4 rounded-lg border ${touchMode === 'glove' ? 'bg-red-900/30 border-red-600' : 'bg-green-900/30 border-green-600'}`}>
                <p className={`text-center ${touchMode === 'glove' ? 'text-red-300' : 'text-green-300'}`}>
                  {touchMode === 'finger' && <><span className="font-bold">Bare Finger:</span> Conductive! Forms capacitor with screen.</>}
                  {touchMode === 'glove' && <><span className="font-bold">Regular Glove:</span> Insulating fabric blocks capacitive coupling.</>}
                  {touchMode === 'capacitiveGlove' && <><span className="font-bold">Touch Glove:</span> Conductive threads connect your finger to the tip!</>}
                </p>
              </div>
            </div>

            {/* How Multi-Touch Works Explanation */}
            <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 rounded-xl p-4 max-w-2xl w-full mb-6">
              <h4 className="text-amber-400 font-bold mb-2">How Multi-Touch Works</h4>
              <p className="text-slate-300 text-sm">
                Projected Capacitive Touch (PCT) screens use a grid of X-Y electrodes. When multiple fingers touch,
                each creates a capacitance change at different grid intersections. The controller scans all intersections
                rapidly to track each touch point independently, enabling gestures like pinch-to-zoom and rotate.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-amber-400 mb-6">Making Gloves Work</h2>
            <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl space-y-4">
              <div className="p-4 bg-red-900/30 rounded-lg border border-red-600">
                <h3 className="text-red-400 font-bold mb-2">The Problem</h3>
                <p className="text-slate-300">
                  Wool, cotton, and synthetic fabrics are <span className="text-yellow-400 font-bold">electrical insulators</span>.
                  They block the capacitive coupling between your conductive body and the screen electrodes.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <h4 className="text-cyan-400 font-bold mb-2">Touch Gloves</h4>
                  <ul className="text-slate-300 text-sm space-y-1">
                    <li>Conductive threads (silver, copper)</li>
                    <li>Woven into fingertips</li>
                    <li>Connect skin to glove surface</li>
                  </ul>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <h4 className="text-purple-400 font-bold mb-2">Active Styluses</h4>
                  <ul className="text-slate-300 text-sm space-y-1">
                    <li>Battery-powered electronics</li>
                    <li>Generate their own signal</li>
                    <li>Works with any material</li>
                  </ul>
                </div>
              </div>
              <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
                <p className="text-yellow-300 text-sm">
                  <strong>Life Hack:</strong> In emergencies, a small piece of aluminum foil or a sausage (!)
                  can conduct enough to trigger a touchscreen.
                </p>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>
            <div className="flex gap-2 mb-6 flex-wrap justify-center">
              {TRANSFER_APPS.map((app, index) => (
                <button
                  key={index}
                  onPointerDown={(e) => { e.preventDefault(); setActiveAppTab(index); }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeAppTab === index ? 'bg-blue-600 text-white'
                    : completedApps.has(index) ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {app.icon} {app.title.split(' ')[0]}
                </button>
              ))}
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{TRANSFER_APPS[activeAppTab].icon}</span>
                <h3 className="text-xl font-bold text-white">{TRANSFER_APPS[activeAppTab].title}</h3>
              </div>
              <p className="text-lg text-slate-300 mt-4">{TRANSFER_APPS[activeAppTab].description}</p>
              {!completedApps.has(activeAppTab) && (
                <button onPointerDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }} className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium">
                  Mark as Understood
                </button>
              )}
            </div>
            <div className="mt-6 flex items-center gap-2">
              <span className="text-slate-400">Progress:</span>
              <div className="flex gap-1">{TRANSFER_APPS.map((_, i) => (<div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`} />))}</div>
              <span className="text-slate-400">{completedApps.size}/4</span>
            </div>
          </div>
        </div>
        {renderBottomBar(completedApps.size < 4, completedApps.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (showTestResults) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mx-auto mt-8 text-center">
              <div className="text-6xl mb-4">{testScore >= 3 ? '🎉' : '📚'}</div>
              <h3 className="text-2xl font-bold text-white mb-2">Score: {testScore}/{TEST_QUESTIONS.length}</h3>
              <p className="text-slate-300 mb-6">{testScore >= 3 ? 'Excellent! You understand capacitive touch!' : 'Keep studying! Review and try again.'}</p>
            </div>
            {TEST_QUESTIONS.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4 max-w-2xl mx-auto mt-4" style={{ borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p className="text-white font-medium mb-3">{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className={`p-2 rounded mb-1 ${opt.correct ? 'bg-emerald-900/30 text-emerald-400' : userAnswer === oIndex ? 'bg-red-900/30 text-red-400' : 'text-slate-400'}`}>
                      {opt.correct ? '✓' : userAnswer === oIndex ? '✗' : '○'} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 3, testScore >= 3 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Knowledge Assessment</h2>
            <div className="space-y-6 max-w-2xl w-full">
              {TEST_QUESTIONS.map((q, qIndex) => (
                <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-white font-medium mb-3">{qIndex + 1}. {q.question}</p>
                  <div className="grid gap-2">
                    {q.options.map((option, oIndex) => (
                      <button
                        key={oIndex}
                        onPointerDown={(e) => { e.preventDefault(); handleTestAnswer(qIndex, oIndex); }}
                        className={`p-3 rounded-lg text-left text-sm transition-all ${testAnswers[qIndex] === oIndex ? 'bg-blue-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}
                      >
                        {option.text}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onPointerDown={(e) => { e.preventDefault(); submitTest(); }}
                disabled={testAnswers.includes(null)}
                className={`w-full py-4 rounded-xl font-semibold text-lg ${testAnswers.includes(null) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'}`}
              >
                Submit Answers
              </button>
            </div>
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
          <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
            <div className="bg-gradient-to-br from-blue-900/50 via-cyan-900/50 to-teal-900/50 rounded-3xl p-8 max-w-2xl">
              <div className="text-8xl mb-6">📱</div>
              <h1 className="text-3xl font-bold text-white mb-4">Capacitive Touch Master!</h1>
              <p className="text-xl text-slate-300 mb-6">You&apos;ve mastered capacitive touch technology!</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">👆</div><p className="text-sm text-slate-300">Touch Detection</p></div>
                <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🧤</div><p className="text-sm text-slate-300">Glove Science</p></div>
                <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">📐</div><p className="text-sm text-slate-300">X-Y Grid</p></div>
                <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">⚡</div><p className="text-sm text-slate-300">Capacitance</p></div>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default CapacitiveTouchRenderer;
