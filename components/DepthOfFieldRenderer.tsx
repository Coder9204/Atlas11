'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ============================================================================
// DEPTH OF FIELD RENDERER - Complete 10-Phase Learning Game
// Discover how aperture, distance, and focus create blur in photography
// ============================================================================

export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
    'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
    'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
    'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected';
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface DepthOfFieldRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: 'rgba(148, 163, 184, 0.7)',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#6366f1',
  accentDark: '#4f46e5',
  accentGlow: 'rgba(99, 102, 241, 0.4)',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  lens: '#60a5fa',
  focus: '#22c55e',
  blur: '#f472b6',
};

// Sound utility
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
      click: { freq: 600, duration: 0.1, type: 'sine' },
      success: { freq: 800, duration: 0.2, type: 'sine' },
      failure: { freq: 300, duration: 0.3, type: 'sine' },
      transition: { freq: 500, duration: 0.15, type: 'sine' },
      complete: { freq: 900, duration: 0.4, type: 'sine' }
    };
    const sound = sounds[type];
    oscillator.frequency.value = sound.freq;
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch { /* Audio not available */ }
};

const DepthOfFieldRenderer: React.FC<DepthOfFieldRendererProps> = ({
  onGameEvent,
  gamePhase,
}) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<Phase, string> = {
    hook: 'Hook', predict: 'Predict', play: 'Experiment Play', review: 'Review',
    twist_predict: 'Twist Predict', twist_play: 'Twist Play', twist_review: 'Twist Review',
    transfer: 'Real-World Transfer', test: 'Knowledge Test', mastery: 'Mastery Complete'
  };

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [isMobile, setIsMobile] = useState(false);
  const isNavigating = useRef(false);

  // Play phase state
  const [apertureSize, setApertureSize] = useState(50);
  const [subjectDistance, setSubjectDistance] = useState(80);
  const [focusDistance, setFocusDistance] = useState(120);

  // Predict state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());

  // Test state
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testScore, setTestScore] = useState(0);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [answerConfirmed, setAnswerConfirmed] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Sync with external gamePhase changes
  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    setAnswerConfirmed(false);
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, []);

  const nextPhase = useCallback(() => {
    const idx = validPhases.indexOf(phase);
    if (idx < validPhases.length - 1) goToPhase(validPhases[idx + 1]);
  }, [phase, goToPhase]);

  const prevPhase = useCallback(() => {
    const idx = validPhases.indexOf(phase);
    if (idx > 0) goToPhase(validPhases[idx - 1]);
  }, [phase, goToPhase]);

  // Typography
  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 700 as const, lineHeight: '1.2' },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700 as const, lineHeight: '1.3' },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600 as const, lineHeight: '1.3' },
    body: { fontSize: isMobile ? '15px' : '17px', lineHeight: '1.6' },
    small: { fontSize: isMobile ? '13px' : '14px', lineHeight: '1.5' },
  };

  // Physics calculations
  const getBlurAmount = useCallback((objectDist: number) => {
    const focusError = Math.abs(1 / objectDist - 1 / focusDistance);
    return apertureSize * focusError * 500;
  }, [focusDistance, apertureSize]);

  // Handle test answer
  const handleTestAnswer = useCallback((questionIndex: number, optionIndex: number) => {
    if (answerConfirmed) return;
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  }, [testAnswers, answerConfirmed]);

  const confirmAnswer = useCallback(() => {
    setAnswerConfirmed(true);
    const correctIdx = testQuestions[currentTestQuestion].options.findIndex(o => o.correct);
    if (testAnswers[currentTestQuestion] === correctIdx) {
      playSound('success');
    } else {
      playSound('failure');
    }
  }, [currentTestQuestion, testAnswers]);

  const handleNextQuestion = useCallback(() => {
    setAnswerConfirmed(false);
    if (currentTestQuestion < 9) {
      setCurrentTestQuestion(currentTestQuestion + 1);
    }
  }, [currentTestQuestion]);

  const handleSubmitTest = useCallback(() => {
    const score = testAnswers.reduce((acc, ans, i) => {
      const correctIdx = testQuestions[i].options.findIndex(o => o.correct);
      return acc + (ans === correctIdx ? 1 : 0);
    }, 0);
    setTestScore(score);
    setTestSubmitted(true);
    playSound(score >= 7 ? 'complete' : 'failure');
  }, [testAnswers]);

  // Button styles
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentDark})`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
  };

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '20px',
    touchAction: 'pan-y' as const,
    WebkitAppearance: 'none' as const,
    accentColor: '#3b82f6',
  };

  // Predictions
  const predictions = [
    { id: 'aperture', label: 'Aperture size (f-number) has the biggest effect on background blur' },
    { id: 'distance', label: 'Distance to the subject matters most for creating blur' },
    { id: 'focal', label: 'Focal length of the lens is the dominant factor' },
    { id: 'sensor', label: 'Sensor size determines how much blur you get' },
  ];

  const twistPredictions = [
    { id: 'decrease', label: 'Background blur decreases (tree becomes sharper)' },
    { id: 'increase', label: 'Background blur increases (tree becomes more blurred)' },
    { id: 'same', label: 'Background blur stays exactly the same' },
    { id: 'disappear', label: 'The tree disappears from the frame entirely' },
  ];

  // Transfer applications
  const realWorldApps = [
    {
      icon: '📷',
      short: 'Portrait',
      title: 'Portrait Photography',
      tagline: 'Where focus meets artistry',
      color: '#a855f7',
      description: 'Portrait photography leverages shallow depth of field to separate subjects from their backgrounds, creating the iconic "bokeh" effect that makes professional portraits stand out. By using wide apertures (f/1.4 to f/2.8) and careful distance management, photographers can transform distracting backgrounds into creamy, aesthetically pleasing blur that draws all attention to the subject. The circle of confusion from out-of-focus background points creates smooth, overlapping disks of light that produce the characteristic painterly quality of professional portraits. This technique has been refined over decades of optical engineering.',
      connection: 'The depth of field simulation demonstrates exactly how aperture size and subject distance work together to create portrait blur. A wider aperture (lower f-number) creates larger circles of confusion for out-of-focus areas, producing smoother bokeh.',
      stats: [
        { icon: '🔭', value: '85 mm', label: 'Classic portrait focal length' },
        { icon: '📏', value: '95%', label: 'Subject isolation at f/1.4' },
        { icon: '🎯', value: '$2 billion', label: 'Annual portrait photography market' },
      ],
      examples: [
        'Wedding photography with bride sharp against blurred venue backgrounds',
        'Headshot photography for actors with creamy studio bokeh',
        'Pet photography using shallow depth to emphasize eyes and expressions',
      ],
    },
    {
      icon: '🔬',
      short: 'Macro',
      title: 'Macro & Scientific Photography',
      tagline: 'Where millimeters become mountains',
      color: '#22c55e',
      description: 'Macro photography pushes depth of field to its absolute limits. At extreme magnifications, the depth of field can shrink to fractions of a millimeter, making focus precision absolutely critical. This razor-thin focus plane creates stunning images where tiny subjects emerge from completely abstract, blurred surroundings. Scientific and medical imaging relies on these same optical principles for microscopy and diagnostic applications. Focus stacking (combining 50-200 images) is often required to achieve full sharpness across an entire insect or mineral specimen.',
      connection: 'At macro distances, the circle of confusion grows rapidly for any point not precisely at the focus distance, resulting in razor-thin depth of field measured in millimeters or less.',
      stats: [
        { icon: '🔍', value: '2 mm', label: 'Typical macro depth of field' },
        { icon: '📐', value: '200 nm', label: 'Smallest resolvable feature' },
        { icon: '📸', value: '50%', label: 'Focus overlap per stack image' },
      ],
      examples: [
        'Insect photography revealing compound eye structures in sharp detail',
        'Semiconductor inspection imaging chip features at nanometer scales',
        'Medical pathology slides capturing tissue structures for diagnosis',
      ],
    },
    {
      icon: '🎬',
      short: 'Cinema',
      title: 'Cinematography & Film',
      tagline: 'Guiding eyes through motion',
      color: '#f59e0b',
      description: 'Cinematographers use depth of field as a powerful storytelling tool, controlling exactly where audiences look within each frame. The technique of "pulling focus" (rack focus) smoothly transitions focus between subjects at different distances, creating dramatic reveals and emotional connections that have defined the visual language of cinema for over a century. Large-format cinema cameras with sensors ranging from Super 35 to IMAX achieve the signature shallow depth of field that separates movies from amateur video recordings.',
      connection: 'This simulation shows why cinema cameras use large sensors and fast lenses: to achieve shallow depth of field that isolates subjects from backgrounds.',
      stats: [
        { icon: '🎥', value: '$75000', label: 'Professional cinema lens set cost' },
        { icon: '💰', value: '24 mm', label: 'Common cinema sensor width' },
        { icon: '🎞️', value: '330 ms', label: 'Focus pull reaction time' },
      ],
      examples: [
        'Rack focus from foreground character to approaching threat in thrillers',
        'Shallow DOF close-ups isolating actors from busy set environments',
        'Split diopter shots keeping two focal planes sharp simultaneously',
      ],
    },
    {
      icon: '📱',
      short: 'Phone',
      title: 'Smartphone Computational Photography',
      tagline: 'Making physics optional with AI',
      color: '#06b6d4',
      description: 'Smartphone cameras face a fundamental physics problem: their tiny sensors (around 1/2.3 inch) and short focal lengths (typically 4-7mm) create naturally deep depth of field, making everything sharp regardless of aperture. Computational photography solves this by using AI and depth sensing to artificially blur backgrounds, simulating the optical bokeh of much larger cameras entirely through software. Modern Portrait Modes using LIDAR sensors and machine learning can now rival professional cameras in many scenarios. AI models trained on millions of images segment subjects from backgrounds.',
      connection: 'This simulation explains why phones struggle with natural bokeh: small sensors require short focal lengths, which creates large depth of field regardless of aperture.',
      stats: [
        { icon: '📏', value: '7 mm', label: 'Typical smartphone focal length' },
        { icon: '🎯', value: '95%', label: 'AI subject segmentation accuracy' },
        { icon: '🧠', value: '$500 billion', label: 'Smartphone camera market value' },
      ],
      examples: [
        'Portrait Mode on iPhones separating subjects from backgrounds',
        'Google Pixel computational bokeh using machine learning depth estimation',
        'Cinematic Mode applying rack focus to video in real-time',
      ],
    },
  ];

  // Test questions
  const testQuestions = [
    {
      scenario: 'A photography student is studying optics and wants to understand what physically creates the blur in out-of-focus areas of a photograph. They have been experimenting with different lenses and noticed that some images have sharp subjects against smooth, creamy backgrounds while others keep everything in focus.',
      question: 'What is the primary optical phenomenon that determines depth of field?',
      options: [
        { text: 'A) The resolution of the camera sensor', correct: false },
        { text: 'B) The circle of confusion formed by out-of-focus light rays', correct: true },
        { text: 'C) The shutter speed setting', correct: false },
        { text: 'D) The ISO sensitivity of the camera', correct: false },
      ],
    },
    {
      scenario: 'A portrait photographer wants to capture a headshot with beautifully blurred background.',
      question: 'Which aperture setting should they choose for maximum background blur?',
      options: [
        { text: 'A) f/16 for maximum sharpness throughout the image', correct: false },
        { text: 'B) f/8 as a balanced middle ground', correct: false },
        { text: 'C) f/1.8 for widest opening and shallowest depth of field', correct: true },
        { text: 'D) f/22 to capture more detail in every part of the frame', correct: false },
      ],
    },
    {
      scenario: 'A landscape photographer wants everything from nearby wildflowers to distant peaks to be sharp.',
      question: 'What camera settings and technique should they use?',
      options: [
        { text: 'A) Wide aperture (f/2.8) focused on infinity for distant sharpness', correct: false },
        { text: 'B) Narrow aperture (f/11-f/16) focused at hyperfocal distance', correct: true },
        { text: 'C) Any aperture with focus set on the closest flowers', correct: false },
        { text: 'D) Maximum aperture with image stabilization enabled', correct: false },
      ],
    },
    {
      scenario: 'A macro photographer shooting a tiny insect at 1:1 magnification notices even at f/16, only a thin slice is in focus.',
      question: 'Why is depth of field so extremely shallow in macro photography?',
      options: [
        { text: 'A) Macro lenses have inherently defective optics', correct: false },
        { text: 'B) The close focusing distance dramatically increases circle of confusion size', correct: true },
        { text: 'C) Small subjects always appear blurry due to their size', correct: false },
        { text: 'D) Camera sensors struggle to resolve objects at close distances', correct: false },
      ],
    },
    {
      scenario: 'A smartphone user wonders why Portrait Mode uses computational processing while a DSLR creates natural blur.',
      question: 'Why do smartphones struggle to create optical background blur like DSLRs?',
      options: [
        { text: 'A) Smartphone cameras have lower megapixel counts', correct: false },
        { text: 'B) Tiny sensors require short focal lengths creating deep depth of field', correct: true },
        { text: 'C) Smartphones only use digital zoom instead of optical zoom', correct: false },
        { text: 'D) Phone camera apps are not optimized for bokeh effects', correct: false },
      ],
    },
    {
      scenario: 'A photographer wants to maximize DOF in a landscape shot using a 35mm lens at f/11.',
      question: 'What is hyperfocal distance and how does it maximize depth of field?',
      options: [
        { text: 'A) Focusing on the closest object in the frame', correct: false },
        { text: 'B) Focusing at infinity to ensure distant mountains are sharp', correct: false },
        { text: 'C) Focusing at a calculated distance where everything from half that distance to infinity appears sharp', correct: true },
        { text: 'D) Using autofocus to automatically find the optimal focus point', correct: false },
      ],
    },
    {
      scenario: 'An optical engineer must specify the maximum acceptable circle of confusion for a sensor.',
      question: 'What determines the acceptable circle of confusion size for a camera system?',
      options: [
        { text: 'A) The maximum aperture of the lens', correct: false },
        { text: 'B) The sensor size, expected viewing distance, and print size', correct: true },
        { text: 'C) The shutter speed range of the camera', correct: false },
        { text: 'D) The focal length of the lens', correct: false },
      ],
    },
    {
      scenario: 'A cinematographer needs to shift audience attention between actors mid-shot without cutting.',
      question: 'What technique uses depth of field to guide viewer attention in cinema?',
      options: [
        { text: 'A) Zooming between subjects during the shot', correct: false },
        { text: 'B) Rack focus or focus pulling to smoothly transition between subjects', correct: true },
        { text: 'C) Changing the aperture while filming', correct: false },
        { text: 'D) Moving the camera closer to subjects', correct: false },
      ],
    },
    {
      scenario: 'An architect photographer uses a tilt-shift lens to keep an entire building facade sharp.',
      question: 'How do tilt-shift lenses manipulate depth of field differently?',
      options: [
        { text: 'A) They use larger apertures to gather more light', correct: false },
        { text: 'B) They tilt the focus plane using the Scheimpflug principle', correct: true },
        { text: 'C) They digitally extend depth of field through in-lens processing', correct: false },
        { text: 'D) They mechanically reduce the circle of confusion size', correct: false },
      ],
    },
    {
      scenario: 'A wildlife photographer notices a 600mm lens produces much more background blur than a 50mm at same f/4.',
      question: 'Why do longer focal length lenses create more background blur at the same aperture?',
      options: [
        { text: 'A) Longer lenses have larger glass elements that collect more light', correct: false },
        { text: 'B) Physically larger aperture openings and perspective compression magnify blur', correct: true },
        { text: 'C) Telephoto lenses have special coatings that enhance blur', correct: false },
        { text: 'D) The blur is an optical illusion caused by narrow field of view', correct: false },
      ],
    },
  ];

  // Progress bar
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: '4px', zIndex: 2000,
      background: 'rgba(255,255,255,0.1)',
    }}>
      <div style={{
        height: '100%',
        width: `${((validPhases.indexOf(phase) + 1) / validPhases.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Nav dots
  const renderNavDots = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px 0' }}>
      {validPhases.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: validPhases.indexOf(phase) >= i ? colors.accent : colors.bgCard,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Nav bar
  const renderNavBar = (showBack: boolean = true) => (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      zIndex: 1000,
    }}>
      {showBack && validPhases.indexOf(phase) > 0 ? (
        <button
          onClick={prevPhase}
          style={{
            padding: '12px 24px', borderRadius: '8px',
            border: `1px solid ${colors.textMuted}`,
            background: 'transparent', color: colors.textSecondary,
            cursor: 'pointer', fontSize: '14px',
          }}
        >
          Back
        </button>
      ) : <div />}
      <button
        onClick={nextPhase}
        style={{
          padding: '12px 32px', borderRadius: '8px', border: 'none',
          background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentDark})`,
          color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px',
        }}
      >
        Next
      </button>
    </div>
  );

  // ============================================================================
  // SVG VISUALIZATION - Depth of Field Ray Diagram
  // ============================================================================
  const renderVisualization = () => {
    const width = 500;
    const height = 340;
    const lensX = width * 0.5;
    const lensY = height * 0.45;
    const sensorX = width * 0.85;
    const apertureRadius = apertureSize * 0.25;
    const subjectX = 40 + (subjectDistance / 200) * (lensX - 60);
    const focusedObjX = 40 + (focusDistance / 200) * (lensX - 60);
    const subjectBlur = getBlurAmount(subjectDistance);
    const subjectInFocus = Math.abs(subjectDistance - focusDistance) < 15;

    // DOF curve: shows how blur changes with distance
    const dofCurvePoints: string[] = [];
    const chartX = 30;
    const chartY = height - 130;
    const chartW = width - 60;
    const chartH = 100;

    // Use fixed normalization so aperture changes visibly affect point position
    // Max possible blur: aperture=100, distance=30, focus=200 -> 100 * |1/30-1/200| * 500 = 100 * 0.0283 * 500 = 1417
    const fixedMaxBlur = 150;

    for (let i = 0; i <= 20; i++) {
      const dist = 30 + (i / 20) * 170;
      const b = getBlurAmount(dist);
      const normalizedBlur = Math.min(1, b / fixedMaxBlur);
      const px = chartX + (i / 20) * chartW;
      const py = chartY + chartH - normalizedBlur * chartH;
      dofCurvePoints.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`);
    }

    // Current position on DOF curve
    const currentDistNorm = (subjectDistance - 30) / 170;
    const currentX = chartX + currentDistNorm * chartW;
    const currentBlurNorm = Math.min(1, subjectBlur / fixedMaxBlur);
    const currentY = chartY + chartH - currentBlurNorm * chartH;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Depth of field ray diagram simulation">
        <defs>
          <linearGradient id="dofLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0a0f1a" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#0a0f1a" />
          </linearGradient>
          <radialGradient id="dofLensGlass" cx="30%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0e7490" stopOpacity="0.1" />
          </radialGradient>
          <linearGradient id="dofLensMetal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <linearGradient id="dofFocusPlane" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0" />
            <stop offset="50%" stopColor="#4ade80" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="dofSubjectGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={subjectInFocus ? '#86efac' : '#fcd34d'} stopOpacity="1" />
            <stop offset="100%" stopColor={subjectInFocus ? '#22c55e' : '#f59e0b'} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="dofCoCGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f472b6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#be185d" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="dofRayIn" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="dofRayFocused" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4ade80" stopOpacity="1" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="dofRayBlurred" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f472b6" stopOpacity="1" />
            <stop offset="100%" stopColor="#db2777" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="dofChartGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="dofLensGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="dofBokehBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>

        {/* Background */}
        <rect width={width} height={height} fill="url(#dofLabBg)" rx="8" />

        {/* Grid lines */}
        <line x1="30" y1={lensY} x2={width - 30} y2={lensY} stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
        <line x1={lensX} y1="20" x2={lensX} y2={lensY + 40} stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
        <line x1="30" y1={lensY - 40} x2={width - 30} y2={lensY - 40} stroke="#475569" strokeWidth="0.3" strokeDasharray="4 4" opacity="0.3" />
        <line x1="30" y1={lensY + 40} x2={width - 30} y2={lensY + 40} stroke="#475569" strokeWidth="0.3" strokeDasharray="4 4" opacity="0.3" />

        {/* Chart grid lines */}
        <line x1={chartX} y1={chartY} x2={chartX + chartW} y2={chartY} stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
        <line x1={chartX} y1={chartY + chartH} x2={chartX + chartW} y2={chartY + chartH} stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
        <line x1={chartX} y1={chartY + chartH * 0.25} x2={chartX + chartW} y2={chartY + chartH * 0.25} stroke="#475569" strokeWidth="0.3" strokeDasharray="4 4" opacity="0.3" />
        <line x1={chartX} y1={chartY + chartH * 0.5} x2={chartX + chartW} y2={chartY + chartH * 0.5} stroke="#475569" strokeWidth="0.3" strokeDasharray="4 4" opacity="0.3" />
        <line x1={chartX} y1={chartY + chartH * 0.75} x2={chartX + chartW} y2={chartY + chartH * 0.75} stroke="#475569" strokeWidth="0.3" strokeDasharray="4 4" opacity="0.3" />

        {/* Focus plane */}
        <rect x={focusedObjX - 2} y={lensY - 60} width="4" height="120" fill="url(#dofFocusPlane)" opacity="0.5" />

        {/* Lens body */}
        <g>
          <ellipse cx={lensX} cy={lensY} rx="16" ry={apertureRadius + 30} fill="url(#dofLensMetal)" stroke="#1e293b" strokeWidth="2" />
          <ellipse cx={lensX} cy={lensY} rx="10" ry={apertureRadius + 20} fill="url(#dofLensGlass)" filter="url(#dofLensGlow)" stroke="#67e8f9" strokeWidth="1" strokeOpacity="0.5" />
          <ellipse cx={lensX} cy={lensY} rx="3" ry={apertureRadius} fill="#030712" stroke="#3f3f3f" strokeWidth="2" />
        </g>

        {/* Sensor */}
        <g>
          <rect x={sensorX - 4} y={lensY - 70} width="8" height="140" fill="#374151" stroke="#6b7280" strokeWidth="1" rx="2" />
        </g>

        {/* Background tree (always out of focus) */}
        <g transform={`translate(30, ${lensY})`} filter="url(#dofBokehBlur)">
          <line x1="0" y1="0" x2="0" y2="-35" stroke="#166534" strokeWidth="4" strokeLinecap="round" />
          <circle cx="0" cy="-45" r="15" fill="#22c55e" opacity="0.4" />
        </g>

        {/* Subject (person) */}
        <g transform={`translate(${subjectX}, ${lensY})`}>
          <circle cx="0" cy="-30" r="12" fill="url(#dofSubjectGlow)" />
          <circle cx="0" cy="-30" r="8" fill={subjectInFocus ? '#4ade80' : '#fbbf24'} />
          <line x1="0" y1="-18" x2="0" y2="10" stroke={subjectInFocus ? '#22c55e' : '#f59e0b'} strokeWidth="3" strokeLinecap="round" />
          <line x1="-12" y1="-6" x2="12" y2="-6" stroke={subjectInFocus ? '#22c55e' : '#f59e0b'} strokeWidth="3" strokeLinecap="round" />
          <line x1="-6" y1="10" x2="-10" y2="25" stroke={subjectInFocus ? '#22c55e' : '#f59e0b'} strokeWidth="2" strokeLinecap="round" />
          <line x1="6" y1="10" x2="10" y2="25" stroke={subjectInFocus ? '#22c55e' : '#f59e0b'} strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Ray cone from subject through lens */}
        <g>
          <line x1={subjectX} y1={lensY - 25} x2={lensX} y2={lensY - apertureRadius} stroke="url(#dofRayIn)" strokeWidth="1.5" />
          <line x1={subjectX} y1={lensY - 25} x2={lensX} y2={lensY + apertureRadius} stroke="url(#dofRayIn)" strokeWidth="1.5" />
          {subjectInFocus ? (
            <g>
              <line x1={lensX} y1={lensY - apertureRadius} x2={sensorX} y2={lensY - 15} stroke="url(#dofRayFocused)" strokeWidth="1.5" />
              <line x1={lensX} y1={lensY + apertureRadius} x2={sensorX} y2={lensY - 15} stroke="url(#dofRayFocused)" strokeWidth="1.5" />
              <circle cx={sensorX} cy={lensY - 15} r="4" fill="#4ade80" filter="url(#glow)" />
            </g>
          ) : (
            <g>
              <line x1={lensX} y1={lensY - apertureRadius} x2={sensorX} y2={lensY - 15 - subjectBlur / 3} stroke="url(#dofRayBlurred)" strokeWidth="1.5" />
              <line x1={lensX} y1={lensY + apertureRadius} x2={sensorX} y2={lensY - 15 + subjectBlur / 3} stroke="url(#dofRayBlurred)" strokeWidth="1.5" />
              <ellipse cx={sensorX} cy={lensY - 15} rx="4" ry={Math.max(5, subjectBlur / 3)} fill="url(#dofCoCGradient)" />
            </g>
          )}
        </g>

        {/* Labels inside SVG */}
        <text x="30" y="18" fill={colors.textPrimary} fontSize="12" fontWeight="600">Depth of Field Ray Diagram</text>
        <text x={subjectX} y={lensY + 40} fill={colors.textSecondary} fontSize="11" textAnchor="middle">Subject</text>
        <text x={lensX} y={lensY + 40} fill={colors.textSecondary} fontSize="11" textAnchor="middle">Lens</text>
        <text x={sensorX} y={lensY + 40} fill={colors.textSecondary} fontSize="11" textAnchor="middle">Sensor</text>
        <text x={focusedObjX} y={lensY - 65} fill="#4ade80" fontSize="11" textAnchor="middle">Focus Plane</text>
        <text x={width / 2} y={lensY + 55} fill={colors.textMuted} fontSize="11" textAnchor="middle">Distance → | Aperture f/{(100 / apertureSize).toFixed(1)}</text>

        {/* DOF Chart */}
        <g>
          <text x={chartX + chartW / 2} y={chartY + 12} fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="600">Blur vs Distance</text>
          <text x={chartX - 5} y={chartY + 8} fill={colors.textMuted} fontSize="11" textAnchor="end">High</text>
          <text x={chartX - 5} y={chartY + chartH} fill={colors.textMuted} fontSize="11" textAnchor="end">Low</text>
          <text x={chartX + chartW / 2} y={chartY + chartH + 14} fill={colors.textMuted} fontSize="11" textAnchor="middle">Distance</text>

          {/* Chart axes */}
          <line x1={chartX} y1={chartY} x2={chartX} y2={chartY + chartH} stroke="#64748b" strokeWidth="1" />
          <line x1={chartX} y1={chartY + chartH} x2={chartX + chartW} y2={chartY + chartH} stroke="#64748b" strokeWidth="1" />

          {/* DOF curve path with 21 points */}
          <path d={dofCurvePoints.join(' ')} fill="none" stroke="url(#dofChartGrad)" strokeWidth="2.5" strokeLinecap="round" />

          {/* Interactive point on curve */}
          <circle cx={currentX} cy={currentY} r={8} fill={colors.accent} stroke="#fff" strokeWidth={2} filter="url(#glow)" />
        </g>

        {/* Legend */}
        <g>
          <circle cx={width - 140} cy="15" r="4" fill="#4ade80" />
          <text x={width - 132} y="19" fill={colors.textSecondary} fontSize="11">In Focus</text>
          <circle cx={width - 70} cy="15" r="4" fill="#f472b6" />
          <text x={width - 62} y="19" fill={colors.textSecondary} fontSize="11">Blurred</text>
        </g>
      </svg>
    );
  };

  // ============================================================================
  // PHASE RENDERS
  // ============================================================================

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '24px', textAlign: 'center', marginTop: '20px' }}>
            <div style={{ fontSize: '72px', marginBottom: '24px' }}>📸</div>
            <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
              Why Do Professional Photos Have That Dreamy Blur?
            </h1>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px', maxWidth: '600px', margin: '0 auto 24px', fontWeight: 400 }}>
              You have seen it a thousand times: a portrait where the person is razor-sharp but the background melts into smooth, creamy blur. Your phone tries to fake it. But what is actually happening with light to create this effect?
            </p>
          </div>

          {renderVisualization()}

          <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                The answer lies in something photographers call the <span style={{ color: colors.blur, fontWeight: 600 }}>circle of confusion</span> - how light rays spread when they do not converge perfectly on the camera sensor.
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <button onClick={nextPhase} style={primaryButtonStyle}>
                Discover Depth of Field
              </button>
            </div>
          </div>
        </div>
        {renderNavDots()}
        {renderNavBar(false)}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ maxWidth: '600px', margin: '24px auto 0', padding: '0 16px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: '16px' }}>
              Make Your Prediction
            </h2>

            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '24px', border: `1px solid rgba(255,255,255,0.1)` }}>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
                You want to photograph a flower with a beautifully blurred background. You have three options: open your aperture wider, move closer, or use a longer lens.
              </p>
              <p style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>
                Which single factor has the BIGGEST direct effect on background blur?
              </p>
            </div>

            {renderVisualization()}

            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {predictions.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => { playSound('click'); setPrediction(p.id); }}
                  style={{
                    background: prediction === p.id ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${prediction === p.id ? colors.accent : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '10px', padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%', background: prediction === p.id ? colors.accent : colors.bgDark, color: prediction === p.id ? 'white' : colors.textSecondary, textAlign: 'center', lineHeight: '24px', marginRight: '10px', fontSize: '12px', fontWeight: 700 }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span style={{ ...typo.small, color: colors.textPrimary }}>{p.label}</span>
                </button>
              ))}
            </div>

            {prediction && (
              <div style={{ marginTop: '16px', background: prediction === 'aperture' ? `${colors.success}15` : `${colors.warning}15`, padding: '16px', borderRadius: '12px', border: `1px solid ${prediction === 'aperture' ? colors.success : colors.warning}` }}>
                <p style={{ ...typo.body, color: prediction === 'aperture' ? colors.success : colors.warning, fontWeight: 700, marginBottom: '8px' }}>
                  {prediction === 'aperture' ? 'Correct!' : 'Good thinking, but not quite!'}
                </p>
                <p style={{ ...typo.small, color: colors.textSecondary }}>
                  Aperture has the most direct effect on depth of field. A wider aperture (like f/1.8) creates a larger cone of rays, forming a larger blur disk (circle of confusion) for out-of-focus objects. All factors matter, but aperture is the most powerful tool!
                </p>
                <button onClick={nextPhase} style={{ ...primaryButtonStyle, marginTop: '12px' }}>
                  See the Ray Diagram
                </button>
              </div>
            )}
          </div>
        </div>
        {renderNavDots()}
        {renderNavBar()}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    const subjectInFocus = Math.abs(subjectDistance - focusDistance) < 15;
    const cocSize = (apertureSize * Math.abs(1 / subjectDistance - 1 / focusDistance) * 500).toFixed(1);

    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ maxWidth: '700px', margin: '24px auto 0', padding: '0 16px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
              Depth of Field Lab
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Adjust aperture, subject distance, and focus to see how blur circles form on the sensor.
            </p>

            <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '8px', padding: '12px', marginBottom: '16px', textAlign: 'center' }}>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                <strong>Observe:</strong> Use the sliders below to adjust aperture, subject distance, and focus. Watch how the blur circles change size on the sensor. The <span style={{ color: colors.blur }}>circle of confusion</span> determines whether a point appears sharp or blurred.
              </p>
            </div>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                {renderVisualization()}
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>

            {/* Cause-effect explanation */}
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', margin: '16px 0', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.textPrimary }}>Because</strong> the aperture is set to f/{(100 / apertureSize).toFixed(1)}, the cone of light is {apertureSize > 60 ? 'wide' : apertureSize > 30 ? 'medium' : 'narrow'}. {subjectInFocus ? 'The subject is in the focus zone, so rays converge to a sharp point on the sensor.' : `The subject is ${Math.abs(subjectDistance - focusDistance)} units from the focus plane, creating a circle of confusion of ${cocSize} units.`}
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                Circle of Confusion = Aperture × |1/ObjectDist - 1/FocusDist| × 500
              </p>
            </div>

            {/* Key terms */}
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '8px' }}>Key Terms</h3>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '6px' }}>
                <strong style={{ color: colors.textPrimary }}>Depth of Field (DOF):</strong> The range of distances where objects appear acceptably sharp in the photograph.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '6px' }}>
                <strong style={{ color: colors.textPrimary }}>Circle of Confusion (CoC):</strong> The blur disk formed on the sensor when a point of light is not perfectly focused.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                <strong style={{ color: colors.textPrimary }}>F-Number:</strong> Focal length divided by aperture diameter. Lower f-number = wider aperture = shallower DOF.
              </p>
            </div>

            {/* Why it matters */}
            <div style={{ background: `${colors.warning}15`, borderRadius: '12px', padding: '16px', marginBottom: '16px', border: `1px solid ${colors.warning}30` }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '8px' }}>Why This Matters</h3>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                Understanding depth of field is essential for any photographer, cinematographer, or optical engineer. It determines whether a portrait has creamy background blur or a landscape has everything in focus. Professional cameras costing $15,000-75,000 are designed specifically to control this physics precisely.
              </p>
            </div>

            {/* Real-time calculated values */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', color: colors.warning, fontWeight: 700 }}>f/{(100 / apertureSize).toFixed(1)}</div>
                <div style={{ fontSize: '11px', color: colors.textMuted }}>Aperture</div>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', color: colors.focus, fontWeight: 700 }}>{cocSize}</div>
                <div style={{ fontSize: '11px', color: colors.textMuted }}>CoC Size</div>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', color: subjectInFocus ? colors.focus : colors.blur, fontWeight: 700 }}>
                  {subjectInFocus ? 'Sharp' : 'Blurred'}
                </div>
                <div style={{ fontSize: '11px', color: colors.textMuted }}>Status</div>
              </div>
            </div>

            {/* Sliders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
              <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px' }}>
                <label style={{ ...typo.small, color: colors.warning, display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                  Aperture: f/{(100 / apertureSize).toFixed(1)} {apertureSize > 60 ? '(Wide - Shallow DOF)' : apertureSize > 30 ? '(Medium)' : '(Small - Deep DOF)'}
                </label>
                <input type="range" min="10" max="100" value={apertureSize}
                  onChange={(e) => setApertureSize(Number(e.target.value))}
                  style={sliderStyle} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', color: colors.textSecondary }}>Small (f/10)</span>
                  <span style={{ fontSize: '11px', color: colors.textSecondary }}>Large (f/1)</span>
                </div>
              </div>
              <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px' }}>
                <label style={{ ...typo.small, color: colors.focus, display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                  Subject Distance: {subjectDistance}
                </label>
                <input type="range" min="30" max="190" value={subjectDistance}
                  onChange={(e) => setSubjectDistance(Number(e.target.value))}
                  style={sliderStyle} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', color: colors.textSecondary }}>Min 30</span>
                  <span style={{ fontSize: '11px', color: colors.textSecondary }}>Max 190</span>
                </div>
              </div>
              <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px' }}>
                <label style={{ ...typo.small, color: colors.accent, display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                  Focus Distance: {focusDistance}
                </label>
                <input type="range" min="30" max="190" value={focusDistance}
                  onChange={(e) => setFocusDistance(Number(e.target.value))}
                  style={sliderStyle} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', color: colors.textSecondary }}>Min 30</span>
                  <span style={{ fontSize: '11px', color: colors.textSecondary }}>Max 190</span>
                </div>
              </div>
            </div>

            {/* Comparison before/after */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: `${colors.focus}15`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.focus}30` }}>
                <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>Wide Aperture (f/1.4)</h4>
                <p style={{ fontSize: '12px', color: colors.textSecondary }}>Shallow DOF, creamy background blur, ideal for portraits. Only a thin slice is sharp.</p>
              </div>
              <div style={{ background: `${colors.lens}15`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.lens}30` }}>
                <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>Narrow Aperture (f/16)</h4>
                <p style={{ fontSize: '12px', color: colors.textSecondary }}>Deep DOF, everything sharp, ideal for landscapes. Maximum depth of field.</p>
              </div>
            </div>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button onClick={nextPhase} style={primaryButtonStyle}>
                Understand the Physics
              </button>
            </div>
          </div>
        </div>
        {renderNavDots()}
        {renderNavBar()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ maxWidth: '700px', margin: '24px auto 0', padding: '0 16px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: '16px' }}>
              The Physics of Depth of Field
            </h2>

            {/* Connect to prediction */}
            <div style={{ background: `${colors.accent}15`, borderRadius: '12px', padding: '16px', marginBottom: '16px', border: `1px solid ${colors.accent}30` }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '8px' }}>Your Prediction Was...</h3>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                {prediction === 'aperture'
                  ? 'Correct! You predicted that aperture has the biggest effect on background blur. The physics confirms this: the aperture diameter directly controls the cone of light rays, which determines the circle of confusion size.'
                  : 'You predicted something other than aperture. The key insight is that aperture directly controls the cone of light, which is the primary factor in creating the circle of confusion and thus background blur. Let us see why!'}
              </p>
            </div>

            {/* Key formula with multiply symbol */}
            <div style={{ background: `${colors.warning}15`, margin: '0 0 16px', padding: '16px', borderRadius: '12px', borderLeft: `3px solid ${colors.warning}`, textAlign: 'center' }}>
              <p style={{ ...typo.small, color: colors.warning, marginBottom: '8px', fontWeight: 700 }}>Key Relationship:</p>
              <p style={{ fontSize: '18px', color: colors.textPrimary, fontFamily: 'serif', margin: '8px 0' }}>
                CoC = A × |1/d - 1/f| (Circle of Confusion formula)
              </p>
              <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', margin: 0 }}>
                Where A = aperture diameter, d = object distance, f = focus distance
              </p>
              <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', margin: '4px 0 0' }}>
                DOF proportional to f-number² × distance² (deeper DOF with smaller aperture)
              </p>
            </div>

            {/* Physics cards */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', border: `1px solid ${colors.blur}30` }}>
                <h3 style={{ ...typo.h3, color: colors.blur, marginBottom: '8px' }}>Circle of Confusion</h3>
                <p style={{ ...typo.small, color: colors.textSecondary }}>
                  When a point is out of focus, light does not converge to a single point on the sensor. Instead it forms a disk. If this disk is small enough, we perceive it as sharp. Larger disks appear blurred.
                </p>
              </div>
              <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', border: `1px solid ${colors.warning}30` }}>
                <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '8px' }}>F-Number Explained</h3>
                <p style={{ ...typo.small, color: colors.textSecondary }}>
                  f-number = focal length / aperture diameter. A lower f-number means a wider physical opening, creating a larger cone of light and bigger blur circles for out-of-focus areas.
                </p>
              </div>
            </div>

            {/* Aperture comparison */}
            <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px', textAlign: 'center' }}>Aperture vs Depth of Field</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div style={{ background: colors.bgDark, padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', color: colors.success, fontWeight: 700 }}>f/1.4</div>
                  <p style={{ ...typo.small, color: colors.textSecondary }}>Wide aperture, very shallow DOF, maximum blur</p>
                </div>
                <div style={{ background: colors.bgDark, padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', color: colors.warning, fontWeight: 700 }}>f/8</div>
                  <p style={{ ...typo.small, color: colors.textSecondary }}>Medium aperture, moderate DOF, balanced</p>
                </div>
                <div style={{ background: colors.bgDark, padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', color: colors.accent, fontWeight: 700 }}>f/22</div>
                  <p style={{ ...typo.small, color: colors.textSecondary }}>Narrow aperture, very deep DOF, everything sharp</p>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button onClick={nextPhase} style={primaryButtonStyle}>See the Twist</button>
            </div>
          </div>
        </div>
        {renderNavDots()}
        {renderNavBar()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ maxWidth: '600px', margin: '24px auto 0', padding: '0 16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <span style={{ background: `${colors.secondary}22`, border: `1px solid ${colors.secondary}`, borderRadius: '20px', padding: '4px 16px', color: colors.secondary, fontSize: '14px' }}>THE TWIST</span>
            </div>
            <h2 style={{ ...typo.h2, color: colors.secondary, textAlign: 'center', marginBottom: '16px' }}>
              Distance Matters More Than You Think!
            </h2>

            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '24px', border: `1px solid rgba(255,255,255,0.1)` }}>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
                You are photographing a person with a tree 10 meters behind them. Without changing your aperture, you walk closer (from 3m to 1.5m) and refocus on their face.
              </p>
              <p style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>
                What happens to the background tree blur?
              </p>
            </div>

            {renderVisualization()}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
              {twistPredictions.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => { playSound('click'); setTwistPrediction(p.id); }}
                  style={{
                    background: twistPrediction === p.id ? `${colors.secondary}22` : colors.bgCard,
                    border: `2px solid ${twistPrediction === p.id ? colors.secondary : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '10px', padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%', background: twistPrediction === p.id ? colors.secondary : colors.bgDark, color: twistPrediction === p.id ? 'white' : colors.textSecondary, textAlign: 'center', lineHeight: '24px', marginRight: '10px', fontSize: '12px', fontWeight: 700 }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span style={{ ...typo.small, color: colors.textPrimary }}>{p.label}</span>
                </button>
              ))}
            </div>

            {twistPrediction && (
              <div style={{ marginTop: '16px', background: twistPrediction === 'increase' ? `${colors.success}15` : `${colors.warning}15`, padding: '16px', borderRadius: '12px', border: `1px solid ${twistPrediction === 'increase' ? colors.success : colors.warning}` }}>
                <p style={{ ...typo.body, color: twistPrediction === 'increase' ? colors.success : colors.warning, fontWeight: 700, marginBottom: '8px' }}>
                  {twistPrediction === 'increase' ? 'Exactly right!' : 'Surprising, is it not?'}
                </p>
                <p style={{ ...typo.small, color: colors.textSecondary }}>
                  Moving closer to the subject while maintaining focus on them dramatically increases background blur! The angular difference between subject and background increases, making the background optically farther and creating larger circles of confusion.
                </p>
                <button onClick={nextPhase} style={{ ...primaryButtonStyle, marginTop: '12px' }}>
                  Experiment With This
                </button>
              </div>
            )}
          </div>
        </div>
        {renderNavDots()}
        {renderNavBar()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ maxWidth: '700px', margin: '24px auto 0', padding: '0 16px' }}>
            <h2 style={{ ...typo.h2, color: colors.secondary, textAlign: 'center', marginBottom: '8px' }}>
              Distance and Background Blur
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Keep aperture constant. Move the subject closer while keeping it in focus. Watch the background blur intensify!
            </p>

            <div style={{ background: `${colors.secondary}15`, border: `1px solid ${colors.secondary}40`, borderRadius: '8px', padding: '12px', marginBottom: '16px', textAlign: 'center' }}>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                <strong>Observe:</strong> Use the sliders to move the subject closer or farther. Notice how the background blur changes even without adjusting aperture.
              </p>
            </div>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                {renderVisualization()}
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            {/* Sliders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px', marginBottom: '16px' }}>
              <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px' }}>
                <label style={{ ...typo.small, color: colors.warning, display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                  Aperture: f/{(100 / apertureSize).toFixed(1)}
                </label>
                <input type="range" min="10" max="100" value={apertureSize}
                  onChange={(e) => setApertureSize(Number(e.target.value))}
                  style={sliderStyle} />
              </div>
              <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px' }}>
                <label style={{ ...typo.small, color: colors.focus, display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                  Subject Distance: {subjectDistance}
                </label>
                <input type="range" min="30" max="190" value={subjectDistance}
                  onChange={(e) => { setSubjectDistance(Number(e.target.value)); setFocusDistance(Number(e.target.value)); }}
                  style={sliderStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: `${colors.success}15`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.success}30` }}>
                <h4 style={{ ...typo.small, color: colors.success, fontWeight: 700, marginBottom: '8px' }}>Subject Closer (30-80)</h4>
                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                  <li style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px' }}>Subject fills more frame</li>
                  <li style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px' }}>Background blur increases dramatically</li>
                  <li style={{ fontSize: '12px', color: colors.textSecondary }}>More professional portrait look</li>
                </ul>
              </div>
              <div style={{ background: `${colors.lens}15`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.lens}30` }}>
                <h4 style={{ ...typo.small, color: colors.lens, fontWeight: 700, marginBottom: '8px' }}>Subject Farther (150-190)</h4>
                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                  <li style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px' }}>Subject smaller in frame</li>
                  <li style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px' }}>Background blur decreases</li>
                  <li style={{ fontSize: '12px', color: colors.textSecondary }}>Deeper effective DOF</li>
                </ul>
              </div>
            </div>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button onClick={nextPhase} style={primaryButtonStyle}>Review the Discovery</button>
            </div>
          </div>
        </div>
        {renderNavDots()}
        {renderNavBar()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ maxWidth: '700px', margin: '24px auto 0', padding: '0 16px' }}>
            <h2 style={{ ...typo.h2, color: colors.secondary, textAlign: 'center', marginBottom: '16px' }}>
              Key Discovery: Three Paths to Blur
            </h2>

            <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px', textAlign: 'center' }}>Three Ways to Increase Background Blur</h3>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '8px' }}>
                <div style={{ background: colors.bgDark, padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', color: colors.textPrimary, fontWeight: 700 }}>1</div>
                  <h4 style={{ ...typo.small, color: colors.warning, fontWeight: 700, marginBottom: '4px' }}>Open Aperture</h4>
                  <p style={{ fontSize: '12px', color: colors.textSecondary }}>f/2.8 to f/1.4, larger cone = bigger blur circles</p>
                </div>
                <div style={{ background: colors.bgDark, padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', color: colors.textPrimary, fontWeight: 700 }}>2</div>
                  <h4 style={{ ...typo.small, color: colors.success, fontWeight: 700, marginBottom: '4px' }}>Move Closer</h4>
                  <p style={{ fontSize: '12px', color: colors.textSecondary }}>3m to 1m, increases angular difference to background</p>
                </div>
                <div style={{ background: colors.bgDark, padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', color: colors.textPrimary, fontWeight: 700 }}>3</div>
                  <h4 style={{ ...typo.small, color: colors.lens, fontWeight: 700, marginBottom: '4px' }}>Longer Lens</h4>
                  <p style={{ fontSize: '12px', color: colors.textSecondary }}>50mm to 200mm, larger physical aperture at same f-number</p>
                </div>
              </div>
            </div>

            <div style={{ background: `${colors.secondary}15`, borderRadius: '12px', padding: '16px', marginBottom: '16px', border: `1px solid ${colors.secondary}30` }}>
              <h4 style={{ ...typo.small, color: colors.secondary, fontWeight: 700, marginBottom: '8px' }}>Pro Tip: Combine All Three!</h4>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                Professional portrait photographers use all three factors: an 85mm lens (longer focal length) at f/1.4 (wide aperture) from about 2 meters (close distance). This combination creates maximum subject isolation with beautifully smooth background blur.
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button onClick={nextPhase} style={primaryButtonStyle}>Real-World Applications</button>
            </div>
          </div>
        </div>
        {renderNavDots()}
        {renderNavBar()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Depth Of Field"
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
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = transferCompleted.size >= 4;

    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '24px 16px 16px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              Depth of field principles power industries worth billions of dollars
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center' }}>
              Explore all 4 applications to continue
            </p>
          </div>

          {/* App selector */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', margin: '0 16px 16px' }}>
            {realWorldApps.map((a, i) => (
              <button
                key={i}
                onClick={() => {
                  playSound('click');
                  setSelectedApp(i);
                }}
                style={{
                  background: selectedApp === i ? `${a.color}22` : colors.bgCard,
                  border: `2px solid ${selectedApp === i ? a.color : transferCompleted.has(i) ? colors.success : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '12px', padding: '12px 4px', cursor: 'pointer', textAlign: 'center', position: 'relative',
                }}
              >
                {transferCompleted.has(i) && (
                  <div style={{ position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px', borderRadius: '50%', background: colors.success, color: 'white', fontSize: '12px', lineHeight: '18px' }}>
                    ✓
                  </div>
                )}
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>{a.icon}</div>
                <div style={{ fontSize: '10px', color: colors.textPrimary, fontWeight: 500 }}>{a.short}</div>
              </button>
            ))}
          </div>

          {/* Selected app details */}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${app.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '48px' }}>{app.icon}</span>
              <div>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
              </div>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              {app.description}
            </p>

            <div style={{ background: colors.bgDark, borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                How This Connects:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{ background: colors.bgDark, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', marginBottom: '2px' }}>{stat.icon}</div>
                  <div style={{ fontSize: '14px', color: app.color, fontWeight: 700 }}>{stat.value}</div>
                  <div style={{ fontSize: '10px', color: colors.textMuted }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: colors.bgDark, borderRadius: '8px', padding: '12px' }}>
              <h4 style={{ ...typo.small, color: colors.textSecondary, marginBottom: '6px', fontWeight: 600 }}>Examples:</h4>
              <ul style={{ margin: 0, paddingLeft: '16px' }}>
                {app.examples.map((ex, i) => (
                  <li key={i} style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '2px' }}>{ex}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Got It / Continue buttons */}
          <div style={{ padding: '0 16px 16px' }}>
            {!allAppsCompleted && selectedApp < realWorldApps.length - 1 && (
              <button
                onClick={() => {
                  playSound('click');
                  const nextIdx = selectedApp + 1;
                  setTransferCompleted(new Set([...transferCompleted, selectedApp]));
                  setSelectedApp(nextIdx);
                }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Got It - Next Application
              </button>
            )}
            {!allAppsCompleted && selectedApp === realWorldApps.length - 1 && (
              <button
                onClick={() => {
                  playSound('click');
                  setTransferCompleted(new Set([...transferCompleted, selectedApp]));
                }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Continue
              </button>
            )}
            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Take the Test
              </button>
            )}
          </div>

          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Application {selectedApp + 1} of {realWorldApps.length}
          </p>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
            <div style={{ maxWidth: '600px', margin: '24px auto 0', textAlign: 'center', padding: '0 16px' }}>
              <div style={{ fontSize: '80px', marginBottom: '24px' }}>{passed ? '🏆' : '📚'}</div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Test Complete!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: '4px 0' }}>You Scored</p>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '8px 0' }}>{testScore} / 10</p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                {passed ? 'You understand depth of field!' : 'Review the concepts and try again.'}
              </p>

              {passed ? (
                <button onClick={nextPhase} style={primaryButtonStyle}>
                  Complete Lesson
                </button>
              ) : (
                <button
                  onClick={() => {
                    setTestSubmitted(false);
                    setTestAnswers(new Array(10).fill(null));
                    setCurrentTestQuestion(0);
                    setTestScore(0);
                    setAnswerConfirmed(false);
                    goToPhase('hook');
                  }}
                  style={primaryButtonStyle}
                >
                  Review and Try Again
                </button>
              )}
            </div>
          </div>
          {renderNavDots()}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ maxWidth: '700px', margin: '24px auto 0', padding: '0 16px' }}>
            {/* Progress indicator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Knowledge Test</h2>
              <span style={{ ...typo.small, color: colors.textSecondary }}>
                Question {currentTestQuestion + 1} of 10
              </span>
            </div>

            {/* Scenario */}
            <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', marginBottom: '16px', borderLeft: `3px solid ${colors.accent}` }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {currentQ.scenario}
              </p>
            </div>

            {/* Question */}
            <div style={{ background: colors.bgDark, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ ...typo.body, color: colors.textPrimary, margin: 0, fontWeight: 600 }}>{currentQ.question}</p>
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {currentQ.options.map((opt, oIndex) => {
                const isSelected = testAnswers[currentTestQuestion] === oIndex;
                const correctIdx = currentQ.options.findIndex(o => o.correct);
                const isCorrect = oIndex === correctIdx;

                let borderColor = 'rgba(255,255,255,0.1)';
                let bg = colors.bgCard;
                if (answerConfirmed) {
                  if (isCorrect) { borderColor = colors.success; bg = `${colors.success}22`; }
                  else if (isSelected) { borderColor = colors.error; bg = `${colors.error}22`; }
                } else if (isSelected) {
                  borderColor = colors.accent;
                  bg = `${colors.accent}22`;
                }

                return (
                  <button
                    key={oIndex}
                    onClick={() => { if (!answerConfirmed) { playSound('click'); handleTestAnswer(currentTestQuestion, oIndex); } }}
                    disabled={answerConfirmed}
                    style={{
                      background: bg,
                      border: `2px solid ${borderColor}`,
                      borderRadius: '10px', padding: '14px 16px', textAlign: 'left',
                      cursor: answerConfirmed ? 'default' : 'pointer',
                      opacity: answerConfirmed && !isCorrect && !isSelected ? 0.5 : 1,
                    }}
                  >
                    <span style={{ ...typo.small, color: colors.textPrimary }}>{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Explanation after confirming */}
            {answerConfirmed && (() => {
              const correctIdx = currentQ.options.findIndex(o => o.correct);
              const isCorrectAnswer = testAnswers[currentTestQuestion] === correctIdx;
              const explanations = [
                'The circle of confusion is the fundamental optical phenomenon. Because light rays from out-of-focus points do not converge perfectly on the sensor, they form blur disks whose size determines perceived sharpness.',
                'A wider aperture (lower f-number like f/1.8) creates a larger cone of light rays. Because the cone is wider, out-of-focus points spread into larger circles of confusion, producing shallower depth of field.',
                'The hyperfocal distance technique maximizes depth of field. Because a narrow aperture at the calculated focus point places both near and far objects within acceptable sharpness, the entire scene appears in focus.',
                'At macro distances, the circle of confusion grows extremely fast. Because the subject is so close, even tiny deviations from the focus plane create massive blur disks, resulting in razor-thin depth of field.',
                'Smartphones have tiny sensors requiring short focal lengths. Because short focal lengths create deep depth of field naturally, phones cannot produce optical bokeh and must rely on computational photography.',
                'Hyperfocal distance is the closest focus distance at which infinity is still acceptably sharp. Because focusing here makes everything from half the hyperfocal distance to infinity appear in focus, it maximizes DOF.',
                'The acceptable circle of confusion depends on sensor size, viewing distance, and print size. Because these factors determine how much blur is perceptible, they define the quality threshold for a camera system.',
                'Rack focus (focus pulling) smoothly transitions focus between subjects. Because shallow depth of field keeps only one distance sharp at a time, shifting focus guides the viewer\'s attention like a visual spotlight.',
                'Tilt-shift lenses tilt the focus plane using the Scheimpflug principle. Because the lens plane, focus plane, and sensor plane must intersect at a common line, tilting the lens can align the focus plane with the subject.',
                'Longer focal lengths create physically larger aperture openings at the same f-number. Because a 600mm f/4 lens has a 150mm opening versus 12.5mm for 50mm f/4, the blur circles are proportionally larger.',
              ];
              return (
                <div style={{ background: isCorrectAnswer ? `${colors.success}15` : `${colors.error}15`, padding: '16px', borderRadius: '12px', marginBottom: '16px', border: `1px solid ${isCorrectAnswer ? colors.success : colors.error}` }}>
                  <p style={{ ...typo.small, color: isCorrectAnswer ? colors.success : colors.error, fontWeight: 700, marginBottom: '8px' }}>
                    {isCorrectAnswer ? 'Correct!' : `The correct answer is ${String.fromCharCode(65 + correctIdx)}).`}
                  </p>
                  <p style={{ ...typo.small, color: colors.textSecondary, fontWeight: 400 }}>
                    {explanations[currentTestQuestion]}
                  </p>
                </div>
              );
            })()}

            {/* Confirm / Next / Submit */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {!answerConfirmed ? (
                <button
                  onClick={confirmAnswer}
                  disabled={testAnswers[currentTestQuestion] === null}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '10px', border: 'none',
                    background: testAnswers[currentTestQuestion] !== null ? colors.accent : 'rgba(255,255,255,0.1)',
                    color: 'white', fontWeight: 600,
                    cursor: testAnswers[currentTestQuestion] !== null ? 'pointer' : 'not-allowed',
                  }}
                >
                  Confirm Answer
                </button>
              ) : currentTestQuestion < 9 ? (
                <button
                  onClick={handleNextQuestion}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '10px', border: 'none',
                    background: colors.accent, color: 'white', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Next Question
                </button>
              ) : (
                <button
                  onClick={handleSubmitTest}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '10px', border: 'none',
                    background: colors.success, color: 'white', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Submit Test
                </button>
              )}
            </div>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ maxWidth: '600px', margin: '24px auto 0', textAlign: 'center', padding: '0 16px' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>🏆</div>
            <h2 style={{ ...typo.h2, color: colors.success, marginBottom: '16px' }}>
              Depth of Field Master!
            </h2>
            <div style={{ background: colors.bgCard, padding: '24px', borderRadius: '16px', marginBottom: '24px', border: `1px solid ${colors.success}30` }}>
              <p style={{ ...typo.h1, color: colors.success }}>{testScore} / 10</p>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                You have demonstrated mastery of how aperture, distance, and focus interact to create depth of field effects in photography and optical systems!
              </p>
            </div>

            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '24px', textAlign: 'left' }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered</h3>
              <ul style={{ color: colors.textSecondary, lineHeight: '2.2', paddingLeft: '16px' }}>
                <li><strong style={{ color: colors.textPrimary }}>Circle of Confusion:</strong> The blur disk formed by out-of-focus light</li>
                <li><strong style={{ color: colors.textPrimary }}>Aperture Effect:</strong> Wider aperture = shallower depth of field</li>
                <li><strong style={{ color: colors.textPrimary }}>Distance Effect:</strong> Closer subject = more background blur</li>
                <li><strong style={{ color: colors.textPrimary }}>Focal Length:</strong> Longer lens = larger physical aperture</li>
                <li><strong style={{ color: colors.textPrimary }}>Hyperfocal Distance:</strong> Maximizing DOF for landscapes</li>
                <li><strong style={{ color: colors.textPrimary }}>Computational Photography:</strong> AI-powered bokeh simulation</li>
              </ul>
            </div>

            <div style={{ background: `${colors.secondary}15`, padding: '16px', borderRadius: '12px', marginBottom: '24px', textAlign: 'left', border: `1px solid ${colors.secondary}30` }}>
              <h4 style={{ ...typo.small, color: colors.secondary, fontWeight: 700, marginBottom: '8px' }}>Next Steps</h4>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                Try experimenting with your camera or phone manual mode. Practice shooting at f/1.8 vs f/8, or moving closer and further from subjects while maintaining focus. The more you practice, the more intuitive depth of field control becomes!
              </p>
            </div>
          </div>
        </div>
        {renderNavDots()}
        {renderNavBar()}
      </div>
    );
  }

  // Default fallback
  return (
    <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <h1 style={{ color: colors.textPrimary }}>Depth of Field</h1>
          <button onClick={() => goToPhase('hook')} style={primaryButtonStyle}>Start</button>
        </div>
      </div>
      {renderNavDots()}
      {renderNavBar()}
    </div>
  );
};

export default DepthOfFieldRenderer;
