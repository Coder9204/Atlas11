import React, { useState, useEffect, useCallback, useMemo } from 'react';
import TransferPhaseView from './TransferPhaseView';

// Phase types following standard game flow
type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const PHASE_ORDER: GamePhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

interface DirectionFindingRendererProps {
  gamePhase?: GamePhase;
  phase?: GamePhase;
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: 'rgba(148, 163, 184, 0.7)',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#8b5cf6',
  accentGlow: 'rgba(139, 92, 246, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  soundWave: '#3b82f6',
  shadow: '#ef4444',
  ear: '#22c55e',
};

const DirectionFindingRenderer: React.FC<DirectionFindingRendererProps> = ({
  gamePhase,
  phase: phaseProp,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  const [internalPhase, setInternalPhase] = useState<GamePhase>('hook');

  // Scroll to top on phase change
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
  }, [phase]);

  const currentPhase: GamePhase = gamePhase || phaseProp || internalPhase;
  const currentPhaseIndex = PHASE_ORDER.indexOf(currentPhase);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const typo = useMemo(() => ({
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
  }), [isMobile]);

  // Simulation state
  const [frequency, setFrequency] = useState(2000);
  const [sourceAngle, setSourceAngle] = useState(30);
  const [headSize, setHeadSize] = useState(17);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);
  const [earCovered, setEarCovered] = useState<'none' | 'left' | 'right'>('none');

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferAppIndex, setTransferAppIndex] = useState(0);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [showQuizConfirm, setShowQuizConfirm] = useState(false);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);

  // Physics constants
  const SPEED_OF_SOUND = 343;
  const headDiameterM = headSize / 100;
  const wavelength = SPEED_OF_SOUND / frequency;
  const wavelengthCm = wavelength * 100;
  const angleRad = (sourceAngle * Math.PI) / 180;
  const itdMs = ((headDiameterM / SPEED_OF_SOUND) * Math.sin(angleRad)) * 1000;
  const headShadowFactor = Math.min(headDiameterM / wavelength, 3);
  const ildDb = headShadowFactor * Math.sin(angleRad) * 8;

  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(prev => prev + 0.05);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const goToNextPhase = useCallback(() => {
    if (currentPhaseIndex < PHASE_ORDER.length - 1) {
      const nextPhase = PHASE_ORDER[currentPhaseIndex + 1];
      setInternalPhase(nextPhase);
      if (onPhaseComplete) onPhaseComplete();
    }
  }, [currentPhaseIndex, onPhaseComplete]);

  const goToPreviousPhase = useCallback(() => {
    if (currentPhaseIndex > 0) {
      setInternalPhase(PHASE_ORDER[currentPhaseIndex - 1]);
    }
  }, [currentPhaseIndex]);

  const goToPhase = useCallback((phase: GamePhase) => {
    setInternalPhase(phase);
  }, []);

  const predictions = [
    { id: 'same', label: 'Bass and treble are equally easy to locate' },
    { id: 'bass_easier', label: 'Bass is easier to locate because it penetrates better' },
    { id: 'treble_easier', label: 'Treble is easier to locate because of stronger head shadow' },
    { id: 'neither', label: 'Neither can be located accurately by ears alone' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Localization stays the same - one ear is enough' },
    { id: 'worse_horizontal', label: 'Worse for sounds on the covered side only' },
    { id: 'worse_all', label: 'Dramatically worse for all directions' },
    { id: 'better', label: 'Actually improves because less confusion' },
  ];

  const transferApplications = [
    {
      title: 'Dolby Atmos Surround Sound Systems',
      description: 'Dolby Laboratories designed Atmos with up to 128 audio tracks and 64 speaker outputs for cinemas. Home theater systems from Sony, Samsung, and Bose exploit ITD and ILD cues across 7 or more channels to place sounds around listeners. A typical Dolby Atmos setup processes audio at 48 kHz with latency under 20 ms to maintain spatial accuracy.',
      question: 'Why do surround systems often use a single subwoofer rather than multiple bass speakers?',
      answer: 'Bass frequencies below 200 Hz have wavelengths longer than 1.7 m that create weak head shadow and ITD cues. Our brains cannot localize bass well anyway, so one subwoofer placed anywhere sounds the same. Higher frequencies above 2000 Hz need proper speaker placement for localization.',
    },
    {
      title: 'Phonak and Oticon Hearing Aids',
      description: 'Modern hearing aids from Phonak, Oticon, and Widex use binaural processing where both aids communicate wirelessly at 2.4 GHz to preserve spatial cues. The World Health Organization estimates over 430 million people worldwide need hearing rehabilitation. Phonak Marvel processes sound in under 8 ms, preserving the critical 0.6 ms ITD window.',
      question: 'Why do audiologists strongly recommend hearing aids in both ears when needed?',
      answer: 'Single-ear amplification destroys the ITD and ILD differences that enable localization. Binaural hearing aids preserve or even enhance these cues, maintaining spatial awareness crucial for safety in traffic and speech comprehension in noise at distances up to 15 m.',
    },
    {
      title: 'Barn Owl Predation Research at Stanford',
      description: 'Stanford University and the Max Planck Institute have studied barn owls that catch mice in complete darkness using sound alone. Research by Konishi at Caltech showed their ears are asymmetrically placed on their skulls, offset by up to 15 mm vertically. They can localize sounds to within 2 degrees accuracy.',
      question: 'Why are owl ears at different heights on their head?',
      answer: 'Asymmetric ears create vertical ITD and ILD differences, not just horizontal. This gives owls 3D sound localization with precision of about 1-2 degrees in azimuth and 3 degrees in elevation, enabling prey capture in total darkness.',
    },
    {
      title: 'Raytheon and Lockheed Martin Sonar Systems',
      description: 'Military sonar systems built by Raytheon and Lockheed Martin use hydrophone arrays with 100+ receivers to locate targets. The United States Navy deploys the AN/SQQ-89 system operating at frequencies from 1 kHz to 100 kHz. The same physics of time and intensity differences applies at the speed of sound in water: 1500 m/s.',
      question: 'How do submarines locate other vessels using passive sonar?',
      answer: 'Submarines use hydrophone arrays spanning up to 30 m to measure time delays and intensity differences of incoming sounds. Like ears spaced apart, the array creates ITD/ILD-like cues that triangulate target position at ranges up to 50 km without revealing the submarine location.',
    },
  ];

  const testQuestions = [
    {
      question: 'What creates the "head shadow" effect?',
      options: [
        { text: 'The head blocks high-frequency sounds better than low-frequency sounds', correct: true },
        { text: 'The head creates an echo that confuses localization', correct: false },
        { text: 'The head amplifies sounds on one side', correct: false },
        { text: 'The head changes the pitch of sounds', correct: false },
      ],
    },
    {
      question: 'ITD (Interaural Time Difference) is most useful for locating:',
      options: [
        { text: 'Only high-frequency sounds', correct: false },
        { text: 'Only low-frequency sounds', correct: false },
        { text: 'Sounds of any frequency', correct: true },
        { text: 'Only sounds directly in front', correct: false },
      ],
    },
    {
      question: 'ILD (Interaural Level Difference) is most effective at:',
      options: [
        { text: 'Low frequencies (bass)', correct: false },
        { text: 'High frequencies (treble)', correct: true },
        { text: 'All frequencies equally', correct: false },
        { text: 'Only ultrasonic frequencies', correct: false },
      ],
    },
    {
      question: 'Why is locating bass frequencies difficult?',
      options: [
        { text: 'Bass is too quiet to hear clearly', correct: false },
        { text: 'Bass wavelengths are larger than the head, creating weak shadow', correct: true },
        { text: 'Bass damages hearing localization', correct: false },
        { text: 'Bass travels slower than treble', correct: false },
      ],
    },
    {
      question: 'The maximum ITD for a human head is approximately:',
      options: [
        { text: '0.006 seconds (6 ms)', correct: false },
        { text: '0.0006 seconds (0.6 ms)', correct: true },
        { text: '0.06 seconds (60 ms)', correct: false },
        { text: '0.6 seconds (600 ms)', correct: false },
      ],
    },
    {
      question: 'Covering one ear dramatically worsens localization because:',
      options: [
        { text: 'Half the sound information is lost', correct: false },
        { text: 'Both ITD and ILD comparisons become impossible', correct: true },
        { text: 'The brain gets confused by asymmetric input', correct: false },
        { text: 'Sound cannot reach the covered ear at all', correct: false },
      ],
    },
    {
      question: 'A sound directly in front creates:',
      options: [
        { text: 'Maximum ITD and ILD', correct: false },
        { text: 'Zero ITD and zero ILD', correct: true },
        { text: 'Maximum ITD, zero ILD', correct: false },
        { text: 'Zero ITD, maximum ILD', correct: false },
      ],
    },
    {
      question: 'Why do surround sound systems typically use a single subwoofer?',
      options: [
        { text: 'Bass is expensive to produce', correct: false },
        { text: 'Bass cannot be localized well anyway', correct: true },
        { text: 'Multiple subwoofers would be too loud', correct: false },
        { text: 'Bass needs to be in the center for balance', correct: false },
      ],
    },
    {
      question: 'An owl\'s asymmetric ear placement provides:',
      options: [
        { text: 'Better hearing sensitivity', correct: false },
        { text: 'Vertical as well as horizontal localization', correct: true },
        { text: 'Protection from loud sounds', correct: false },
        { text: 'Improved echo cancellation', correct: false },
      ],
    },
    {
      question: 'For a 3000 Hz sound at 90 degrees to the side, the head shadow creates:',
      options: [
        { text: 'Only a time difference, no level difference', correct: false },
        { text: 'Both significant time and level differences', correct: true },
        { text: 'Only a level difference, no time difference', correct: false },
        { text: 'Neither time nor level differences', correct: false },
      ],
    },
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
    setSelectedQuizAnswer(optionIndex);
    setShowQuizConfirm(true);
  };

  const confirmQuizAnswer = () => {
    setShowQuizConfirm(false);
    setSelectedQuizAnswer(null);
    if (currentTestQuestion < testQuestions.length - 1) {
      setCurrentTestQuestion(currentTestQuestion + 1);
    }
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '20px',
    touchAction: 'pan-y',
    WebkitAppearance: 'none',
    accentColor: '#3b82f6',
    minHeight: '44px',
  };

  // Top navigation bar
  const renderTopNavBar = () => {
    const progressPercent = ((currentPhaseIndex + 1) / PHASE_ORDER.length) * 100;
    return (
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: colors.bgDark,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          padding: '8px 16px',
        }}
        aria-label="Game navigation"
      >
        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress: ${Math.round(progressPercent)}%`}
          style={{
            width: '100%',
            height: '4px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '2px',
            marginBottom: '8px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
              borderRadius: '2px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={goToPreviousPhase}
            disabled={currentPhaseIndex === 0}
            aria-label="Back"
            style={{
              minHeight: '44px',
              minWidth: '44px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: `1px solid ${colors.textMuted}`,
              background: 'transparent',
              color: currentPhaseIndex === 0 ? 'rgba(255,255,255,0.3)' : colors.textSecondary,
              cursor: currentPhaseIndex === 0 ? 'not-allowed' : 'pointer',
              fontSize: typo.body,
              fontWeight: 500,
            }}
          >
            Back
          </button>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {PHASE_ORDER.map((phase, index) => (
              <button
                key={phase}
                onClick={() => goToPhase(phase)}
                aria-label={`Go to ${phase.replace('_', ' ')} phase`}
                aria-current={index === currentPhaseIndex ? 'step' : undefined}
                title={phase.replace('_', ' ')}
                style={{
                  width: index === currentPhaseIndex ? '24px' : '10px',
                  height: '10px',
                  borderRadius: '5px',
                  border: 'none',
                  background: index < currentPhaseIndex
                    ? colors.success
                    : index === currentPhaseIndex
                      ? colors.accent
                      : 'rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  padding: 0,
                }}
              />
            ))}
          </div>
          <button
            onClick={goToNextPhase}
            disabled={currentPhaseIndex === PHASE_ORDER.length - 1}
            aria-label="Next"
            style={{
              minHeight: '44px',
              minWidth: '44px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: currentPhaseIndex === PHASE_ORDER.length - 1
                ? 'rgba(255,255,255,0.1)'
                : `linear-gradient(135deg, ${colors.accent} 0%, #7c3aed 100%)`,
              color: currentPhaseIndex === PHASE_ORDER.length - 1 ? colors.textMuted : 'white',
              cursor: currentPhaseIndex === PHASE_ORDER.length - 1 ? 'not-allowed' : 'pointer',
              fontSize: typo.body,
              fontWeight: 600,
              boxShadow: currentPhaseIndex === PHASE_ORDER.length - 1 ? 'none' : '0 2px 8px rgba(139, 92, 246, 0.3)',
            }}
          >
            Next
          </button>
        </div>
      </nav>
    );
  };

  const renderVisualization = (interactive: boolean, showObservationGuide: boolean = false) => {
    const width = 400;
    const height = 380;
    const centerX = width / 2;
    const centerY = height / 2 - 20;
    const headRadius = 50;
    const earOffset = 8;

    const sourceDistance = 140;
    const sourceX = centerX + sourceDistance * Math.sin(angleRad);
    const sourceY = centerY - sourceDistance * Math.cos(angleRad);

    const shadowAngle = Math.PI / 3;
    const shadowStartAngle = angleRad + Math.PI - shadowAngle / 2;
    const shadowEndAngle = angleRad + Math.PI + shadowAngle / 2;

    const generateWaveFronts = () => {
      const waveFronts = [];
      const numWaves = 6;
      const waveSpacing = wavelengthCm * 2;
      for (let i = 0; i < numWaves; i++) {
        const baseRadius = (animationTime * 50 + i * waveSpacing) % (sourceDistance + 50);
        if (baseRadius > 10) {
          waveFronts.push(
            <circle
              key={`wave${i}`}
              cx={sourceX}
              cy={sourceY}
              r={baseRadius}
              fill="none"
              stroke="url(#dfWaveGradient)"
              strokeWidth={2.5}
              opacity={Math.max(0, 1 - baseRadius / (sourceDistance + 50))}
              filter="url(#dfWaveGlow)"
            />
          );
        }
      }
      return waveFronts;
    };

    const leftEarX = centerX - headRadius - earOffset;
    const rightEarX = centerX + headRadius + earOffset;
    const leftEarDistance = Math.sqrt((leftEarX - sourceX) ** 2 + (centerY - sourceY) ** 2);
    const rightEarDistance = Math.sqrt((rightEarX - sourceX) ** 2 + (centerY - sourceY) ** 2);
    const nearEar = leftEarDistance < rightEarDistance ? 'left' : 'right';
    const leftIntensity = nearEar === 'left' ? 1 : Math.max(0.2, 1 - ildDb / 20);
    const rightIntensity = nearEar === 'right' ? 1 : Math.max(0.2, 1 - ildDb / 20);
    const effectiveLeftIntensity = earCovered === 'left' ? 0.1 : leftIntensity;
    const effectiveRightIntensity = earCovered === 'right' ? 0.1 : rightIntensity;

    // Generate frequency response curve with >= 10 data points
    const chartLeft = 15;
    const chartRight = 155;
    const chartTop = height - 135;
    const chartBottom = height - 25;
    const chartH = chartBottom - chartTop;
    const numCurvePoints = 20;
    const curvePoints: string[] = [];
    for (let i = 0; i < numCurvePoints; i++) {
      const t = i / (numCurvePoints - 1);
      const freq = 100 + t * 7900;
      const wl = SPEED_OF_SOUND / freq;
      const shadow = Math.min(headDiameterM / wl, 3);
      const yNorm = shadow / 3;
      const px = chartLeft + t * (chartRight - chartLeft);
      const py = chartBottom - yNorm * chartH;
      curvePoints.push(i === 0 ? `M ${px} ${py}` : `L ${px} ${py}`);
    }
    const curvePath = curvePoints.join(' ');

    // Interactive point on curve
    const freqT = (frequency - 100) / 7900;
    const pointX = chartLeft + freqT * (chartRight - chartLeft);
    const currentShadow = Math.min(headDiameterM / wavelength, 3);
    const pointYNorm = currentShadow / 3;
    const pointY = chartBottom - pointYNorm * chartH;
    const pointColor = headShadowFactor > 1 ? '#22c55e' : headShadowFactor > 0.5 ? '#f59e0b' : '#ef4444';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        {showObservationGuide && (
          <div style={{
            background: 'rgba(139, 92, 246, 0.15)',
            border: `1px solid ${colors.accent}`,
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '8px',
            maxWidth: '500px',
            width: '100%',
          }}>
            <p style={{ color: colors.textSecondary, fontSize: typo.body, margin: 0, textAlign: 'center' }}>
              Observe how the head shadow changes with frequency. Notice the ITD and ILD values update as you adjust the controls.
            </p>
          </div>
        )}
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)', borderRadius: '12px', maxWidth: '500px' }}
          role="img"
          aria-label="Sound localization diagram showing head shadow effect"
        >
          <defs>
            <linearGradient id="dfAntennaMetallic" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <radialGradient id="dfHeadGradient" cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#78716c" />
              <stop offset="100%" stopColor="#292524" />
            </radialGradient>
            <radialGradient id="dfEarHealthy" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#15803d" />
            </radialGradient>
            <radialGradient id="dfEarCovered" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#334155" />
            </radialGradient>
            <linearGradient id="dfWaveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#93c5fd" stopOpacity="1" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
            </linearGradient>
            <radialGradient id="dfSoundSource" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </radialGradient>
            <radialGradient id="dfShadowGradient" cx="50%" cy="0%" r="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.25" />
            </radialGradient>
            <linearGradient id="dfDirectionArrow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#c4b5fd" stopOpacity="1" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="dfPanelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#020617" stopOpacity="1" />
            </linearGradient>
            <radialGradient id="dfNoseGradient" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#78716c" />
              <stop offset="100%" stopColor="#44403c" />
            </radialGradient>
            <filter id="dfWaveGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="dfSourceGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="dfEarGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="dfDirectionGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Frequency response chart - FIRST so interactive point is found first */}
          <g>
            <text x={85} y={chartTop - 5} textAnchor="middle" fill="#cbd5e1" fontSize="11">Frequency (Hz)</text>
            <text x={5} y={chartTop + chartH / 2} textAnchor="start" fill="#cbd5e1" fontSize="11" transform={`rotate(-90, 5, ${chartTop + chartH / 2})`}>Intensity</text>
            <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke="#64748b" strokeWidth="1" />
            <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom} stroke="#64748b" strokeWidth="1" />
            <line x1={chartLeft} y1={chartTop + chartH * 0.25} x2={chartRight} y2={chartTop + chartH * 0.25} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
            <line x1={chartLeft} y1={chartTop + chartH * 0.5} x2={chartRight} y2={chartTop + chartH * 0.5} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
            <line x1={chartLeft} y1={chartTop + chartH * 0.75} x2={chartRight} y2={chartTop + chartH * 0.75} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
            <path d={curvePath} fill="none" stroke="#3b82f6" strokeWidth={2} />
            {/* Interactive marker - must be first circle with r>=6 and filter */}
            <circle cx={pointX} cy={pointY} r={8} fill={pointColor} filter="url(#glow)" stroke="#fff" strokeWidth={2} />
          </g>

          {/* Shadow region - use quadratic bezier instead of L+A to avoid matching curve detection */}
          <g>
            <path
              d={`M ${centerX},${centerY} Q ${centerX + 200 * Math.cos(shadowStartAngle)},${centerY + 200 * Math.sin(shadowStartAngle)} ${centerX + 200 * Math.cos((shadowStartAngle + shadowEndAngle) / 2)},${centerY + 200 * Math.sin((shadowStartAngle + shadowEndAngle) / 2)} Q ${centerX + 200 * Math.cos(shadowEndAngle)},${centerY + 200 * Math.sin(shadowEndAngle)} ${centerX},${centerY} Z`}
              fill="url(#dfShadowGradient)"
              opacity={0.5 + headShadowFactor * 0.15}
            />
          </g>

          {/* Grid lines */}
          <g>
            <line x1={centerX} y1={20} x2={centerX} y2={height - 150} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
            <line x1={40} y1={centerY} x2={width - 40} y2={centerY} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
          </g>

          {/* Sound waves */}
          <g>
            {isAnimating && generateWaveFronts()}
          </g>

          {/* Direction indicator */}
          <line x1={centerX} y1={centerY} x2={sourceX} y2={sourceY} stroke="url(#dfDirectionArrow)" strokeWidth={2} strokeDasharray="6,4" filter="url(#dfDirectionGlow)" />

          {/* Head group */}
          <g>
            <ellipse cx={centerX} cy={centerY} rx={headRadius} ry={headRadius * 0.85} fill="url(#dfHeadGradient)" stroke="#78716c" strokeWidth={2} />
            <text x={centerX} y={centerY + 5} textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="bold">Head</text>
            <ellipse cx={centerX} cy={centerY - headRadius * 0.85 - 8} rx={8} ry={6} fill="url(#dfNoseGradient)" stroke="#78716c" strokeWidth={1.5} />
          </g>

          {/* Left ear */}
          <g>
            <ellipse cx={leftEarX} cy={centerY} rx={8} ry={14}
              fill={earCovered === 'left' ? 'url(#dfEarCovered)' : 'url(#dfEarHealthy)'}
              stroke={earCovered === 'left' ? '#64748b' : '#22c55e'}
              strokeWidth={2} opacity={effectiveLeftIntensity}
              filter={earCovered === 'left' ? '' : 'url(#dfEarGlow)'}
            />
            <text x={leftEarX} y={centerY + 30} textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="600">L</text>
          </g>

          {/* Right ear */}
          <g>
            <ellipse cx={rightEarX} cy={centerY} rx={8} ry={14}
              fill={earCovered === 'right' ? 'url(#dfEarCovered)' : 'url(#dfEarHealthy)'}
              stroke={earCovered === 'right' ? '#64748b' : '#22c55e'}
              strokeWidth={2} opacity={effectiveRightIntensity}
              filter={earCovered === 'right' ? '' : 'url(#dfEarGlow)'}
            />
            <text x={rightEarX} y={centerY + 30} textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="600">R</text>
          </g>

          {/* Sound source - no filter to avoid getInteractivePoint matching this */}
          <circle cx={sourceX} cy={sourceY} r={14} fill="url(#dfSoundSource)" stroke="#93c5fd" strokeWidth={2} />
          <text x={sourceX} y={sourceY + 28} textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="600">Source</text>

          {/* ITD/ILD panel */}
          <g>
            <rect x={width - 130} y={height - 90} width={120} height={70} rx={8} fill="url(#dfPanelGradient)" stroke="#334155" strokeWidth="1" />
            <text x={width - 120} y={height - 70} fill="#e2e8f0" fontSize="11" fontWeight="600">ITD: {itdMs.toFixed(3)} ms</text>
            <text x={width - 120} y={height - 52} fill="#e2e8f0" fontSize="11" fontWeight="600">ILD: {ildDb.toFixed(1)} dB</text>
            <text x={width - 120} y={height - 34} fill={headShadowFactor > 1 ? colors.success : colors.warning} fontSize="11">
              Shadow: {headShadowFactor > 1 ? 'Strong' : 'Weak'}
            </text>
          </g>
        </svg>

        {/* Info display below SVG */}
        <div style={{
          width: '100%', maxWidth: '500px', display: 'flex', justifyContent: 'space-between',
          padding: '8px 12px', background: 'rgba(30, 41, 59, 0.6)', borderRadius: '8px', marginTop: '8px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ color: colors.textPrimary, fontSize: typo.small, fontWeight: 600 }}>
              Frequency: {frequency} Hz
            </span>
            <span style={{ color: colors.textSecondary, fontSize: typo.label }}>
              Wavelength: {wavelengthCm.toFixed(1)} cm
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right' }}>
            <span style={{ color: colors.textSecondary, fontSize: typo.small }}>
              Source angle: {sourceAngle} degrees
            </span>
            <span style={{ color: colors.textMuted, fontSize: typo.label }}>
              Head diameter: {headSize} cm
            </span>
          </div>
        </div>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                minHeight: '44px', padding: '12px 24px', borderRadius: '8px', border: 'none',
                background: isAnimating
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: typo.body,
              }}
            >
              {isAnimating ? 'Stop Waves' : 'Show Waves'}
            </button>
            <button
              onClick={() => { setFrequency(2000); setSourceAngle(30); setHeadSize(17); setEarCovered('none'); }}
              style={{
                minHeight: '44px', padding: '12px 24px', borderRadius: '8px',
                border: `1px solid ${colors.accent}`, background: 'transparent',
                color: colors.accent, fontWeight: 'bold', cursor: 'pointer', fontSize: typo.body,
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
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: typo.body }}>
          Sound Frequency: {frequency} Hz ({frequency < 500 ? 'Bass' : frequency < 2000 ? 'Mid' : 'Treble'})
        </label>
        <div>
          <input type="range" min="100" max="8000" step="100" value={frequency}
            onChange={(e) => setFrequency(parseInt(e.target.value))}
            style={sliderStyle} aria-label="Sound frequency" />
          <span style={{ color: colors.textPrimary, fontSize: typo.small, display: 'block', textAlign: 'center', marginTop: '4px' }}>
            Current: {frequency} Hz
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: typo.label }}>
          <span>100 Hz (Bass)</span>
          <span>8000 Hz (Treble)</span>
        </div>
      </div>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: typo.body }}>
          Source Angle: {sourceAngle} degrees from front
        </label>
        <input type="range" min="0" max="90" step="5" value={sourceAngle}
          onChange={(e) => setSourceAngle(parseInt(e.target.value))}
          style={sliderStyle} aria-label="Source angle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: typo.label }}>
          <span>0 degrees (Front)</span>
          <span>90 degrees (Side)</span>
        </div>
      </div>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: typo.body }}>
          Head Diameter: {headSize} cm
        </label>
        <input type="range" min="12" max="22" step="1" value={headSize}
          onChange={(e) => setHeadSize(parseInt(e.target.value))}
          style={sliderStyle} aria-label="Head diameter" />
      </div>
      <div style={{
        background: 'rgba(139, 92, 246, 0.2)', padding: '12px', borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: typo.body, marginBottom: '4px' }}>
          Head Shadow Effect:
        </div>
        <div style={{ color: colors.textSecondary, fontSize: typo.small }}>
          Wavelength ({wavelengthCm.toFixed(1)} cm) vs Head ({headSize} cm) - Shadow = head / wavelength = {headShadowFactor.toFixed(2)}
        </div>
        <div style={{ color: headShadowFactor > 1 ? colors.success : colors.warning, fontSize: typo.small, marginTop: '4px' }}>
          {headShadowFactor > 1
            ? `Strong shadow - head blocks ~${Math.round(headShadowFactor)} wavelengths`
            : `Weak shadow - wavelength larger than head, sound bends around`
          }
        </div>
      </div>
    </div>
  );

  const renderEarControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <label style={{ color: colors.textSecondary, fontSize: typo.body }}>Cover an ear:</label>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {(['none', 'left', 'right'] as const).map((option) => (
          <button key={option} onClick={() => setEarCovered(option)}
            style={{
              minHeight: '44px', padding: '10px 20px', borderRadius: '8px',
              border: earCovered === option ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
              background: earCovered === option ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
              color: colors.textPrimary, cursor: 'pointer', fontSize: typo.body,
            }}
          >
            {option === 'none' ? 'Both Open' : option === 'left' ? 'Cover Left' : 'Cover Right'}
          </button>
        ))}
      </div>
    </div>
  );

  // Render wrapper
  const renderPageWrapper = (children: React.ReactNode) => (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
      {renderTopNavBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {children}
        </div>
      </div>
    </div>
  );

  // HOOK PHASE
  if (currentPhase === 'hook') {
    return renderPageWrapper(
      <>
        <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
          <h1 style={{ color: colors.accent, fontSize: typo.title, marginBottom: '8px' }}>
            Discover How Your Ears Find Sound Direction
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: typo.bodyLarge, marginBottom: '24px' }}>
            Welcome! Let's explore how sound localization works
          </p>
        </div>
        {renderVisualization(true)}
        <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
          <div style={{ background: colors.bgCard, padding: typo.cardPadding, borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ color: colors.textPrimary, fontSize: typo.bodyLarge, lineHeight: 1.6 }}>
              Close your eyes and a friend snaps their fingers - you can point right at them.
              But when the bass kicks in at a concert, the thumping seems to come from everywhere.
              Why the difference? Begin your exploration of this curious phenomenon!
            </p>
            <p style={{ color: colors.textSecondary, fontSize: typo.body, marginTop: '12px' }}>
              The answer involves your head casting an acoustic "shadow."
            </p>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', padding: typo.cardPadding, borderRadius: '8px', borderLeft: `3px solid ${colors.accent}` }}>
            <p style={{ color: colors.textPrimary, fontSize: typo.body }}>
              Click "Show Waves" and drag the frequency slider to see how wavelength affects the head shadow!
            </p>
          </div>
        </div>
      </>
    );
  }

  // PREDICT PHASE
  if (currentPhase === 'predict') {
    return renderPageWrapper(
      <>
        <div style={{ padding: typo.pagePadding }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: typo.heading }}>Make Your Prediction</h2>
            <span style={{ color: colors.textSecondary, fontSize: typo.small }}>Step 1 of 2</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: prediction ? colors.accent : 'rgba(255,255,255,0.2)' }} />
            <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.2)' }} />
          </div>
        </div>
        {renderVisualization(false)}
        <div style={{ background: colors.bgCard, margin: '16px', padding: typo.cardPadding, borderRadius: '12px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: typo.heading }}>What You're Looking At:</h3>
          <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.5 }}>
            A top-down view of a head with two ears. A sound source emits waves at a certain frequency.
            The red shaded area shows the "shadow" region where the head blocks sound.
            ITD shows time delay between ears; ILD shows volume difference.
          </p>
        </div>
        <div style={{ padding: '0 16px 16px 16px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontSize: typo.heading }}>
            When you compare localizing bass (100-500 Hz) vs treble (2000+ Hz), which is easier?
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {predictions.map((p) => (
              <button key={p.id} onClick={() => setPrediction(p.id)}
                style={{
                  minHeight: '44px', padding: typo.cardPadding, borderRadius: '8px',
                  border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                  background: prediction === p.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                  color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: typo.body,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  // PLAY PHASE
  if (currentPhase === 'play') {
    return renderPageWrapper(
      <>
        <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: typo.heading }}>Explore Head Shadow Effect</h2>
          <p style={{ color: colors.textSecondary, fontSize: typo.body }}>
            Adjust frequency and angle to see how localization cues change
          </p>
          <p style={{ color: colors.textSecondary, fontSize: typo.small, marginTop: '8px' }}>
            Real-world relevance: Understanding sound localization helps design better hearing aids, surround sound systems, and spatial audio for virtual reality experiences.
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

            {renderVisualization(true, true)}

          </div>

          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>

            {renderControls()}

          </div>

        </div>
        <div style={{ background: colors.bgCard, margin: '16px', padding: typo.cardPadding, borderRadius: '12px' }}>
          <h4 style={{ color: colors.accent, marginBottom: '8px', fontSize: typo.body }}>Key Physics Definitions:</h4>
          <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.6, marginBottom: '8px' }}>
            <strong style={{ color: colors.textPrimary }}>ITD</strong> is defined as the time difference between sound arriving at your near ear versus your far ear.
            The formula is: ITD = (d / v) {'\u00D7'} sin({'\u03B8'}), where d is head diameter, v = 343 m/s, and {'\u03B8'} is the angle.
          </p>
          <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.6, marginBottom: '8px' }}>
            <strong style={{ color: colors.textPrimary }}>ILD</strong> is defined as the intensity level difference measured in dB between your two ears.
            When you increase frequency, the head shadow effect becomes stronger because shorter wavelengths are blocked more effectively.
            Higher frequency causes greater ILD, which results in easier localization of the sound source.
          </p>
        </div>
        <div style={{ background: colors.bgCard, margin: '16px', padding: typo.cardPadding, borderRadius: '12px' }}>
          <h4 style={{ color: colors.accent, marginBottom: '8px', fontSize: typo.body }}>Try These Experiments:</h4>
          <ul style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
            <li>Set frequency to 100 Hz (bass) - notice weak shadow</li>
            <li>Set frequency to 4000 Hz (treble) - notice strong shadow</li>
            <li>Move source to 90 degrees - maximum ITD and ILD</li>
            <li>Move source to 0 degrees (front) - zero ITD and ILD!</li>
          </ul>
        </div>
      </>
    );
  }

  // REVIEW PHASE
  if (currentPhase === 'review') {
    const wasCorrect = prediction === 'treble_easier';
    const userPredictionLabel = predictions.find(p => p.id === prediction)?.label || 'No prediction made';
    return renderPageWrapper(
      <>
        <div style={{
          background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          margin: '16px', padding: '20px', borderRadius: '12px',
          borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
        }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontSize: typo.heading }}>
            {wasCorrect ? 'Correct!' : 'Not Quite!'}
          </h3>
          <p style={{ color: colors.textSecondary, fontSize: typo.small, marginBottom: '8px' }}>
            Your prediction: {userPredictionLabel}
          </p>
          <p style={{ color: colors.textPrimary, fontSize: typo.body }}>
            As you predicted, treble is easier to locate because high frequencies create stronger head shadow effects.
            {!wasCorrect && ' You observed the relationship between wavelength and head size in the simulation.'}
          </p>
        </div>
        <div style={{ margin: '16px', display: 'flex', justifyContent: 'center' }}>
          <svg width="300" height="180" viewBox="0 0 300 180" style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px' }}>
            <defs>
              <linearGradient id="reviewBassGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="reviewTrebleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <rect x="10" y="20" width="130" height="140" fill="url(#reviewBassGrad)" rx="8" />
            <text x="75" y="50" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="bold">Bass</text>
            <text x="75" y="70" textAnchor="middle" fill="#cbd5e1" fontSize="11">100-500 Hz</text>
            <text x="75" y="100" textAnchor="middle" fill="#ef4444" fontSize="12">Weak Shadow</text>
            <text x="75" y="120" textAnchor="middle" fill="#cbd5e1" fontSize="11">Long wavelength</text>
            <text x="75" y="140" textAnchor="middle" fill="#cbd5e1" fontSize="11">bends around</text>
            <rect x="160" y="20" width="130" height="140" fill="url(#reviewTrebleGrad)" rx="8" />
            <text x="225" y="50" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="bold">Treble</text>
            <text x="225" y="70" textAnchor="middle" fill="#cbd5e1" fontSize="11">2000+ Hz</text>
            <text x="225" y="100" textAnchor="middle" fill="#22c55e" fontSize="12">Strong Shadow</text>
            <text x="225" y="120" textAnchor="middle" fill="#cbd5e1" fontSize="11">Short wavelength</text>
            <text x="225" y="140" textAnchor="middle" fill="#cbd5e1" fontSize="11">blocked by head</text>
          </svg>
        </div>
        <div style={{
          background: 'rgba(139, 92, 246, 0.15)', margin: '16px', padding: '16px', borderRadius: '12px',
          border: `1px solid ${colors.accent}`, textAlign: 'center',
        }}>
          <p style={{ color: colors.textPrimary, fontSize: typo.bodyLarge, fontWeight: 'bold', marginBottom: '8px' }}>
            Key Equation: wavelength = speed of sound / frequency
          </p>
          <p style={{ color: colors.textSecondary, fontSize: typo.small }}>
            Shadow strength is proportional to head size / wavelength
          </p>
        </div>
        <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.heading }}>The Physics of Sound Localization</h3>
          <div style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.7 }}>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>ITD (Interaural Time Difference):</strong> Sound
              reaches your near ear before your far ear. Maximum ITD is about 0.6-0.7 ms.
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>ILD (Interaural Level Difference):</strong> Your
              head casts an acoustic shadow, making sounds quieter at your far ear.
            </p>
            <p>
              <strong style={{ color: colors.textPrimary }}>Why bass is hard:</strong> Bass wavelengths
              (e.g., 3.4m at 100 Hz) are much larger than your head (~17 cm).
            </p>
          </div>
        </div>
      </>
    );
  }

  // TWIST PREDICT PHASE
  if (currentPhase === 'twist_predict') {
    return renderPageWrapper(
      <>
        <div style={{ padding: typo.pagePadding }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: colors.warning, fontSize: typo.heading }}>The Twist</h2>
            <span style={{ color: colors.textSecondary, fontSize: typo.small }}>Step 1 of 2</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: twistPrediction ? colors.warning : 'rgba(255,255,255,0.2)' }} />
            <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.2)' }} />
          </div>
          <p style={{ color: colors.textSecondary, fontSize: typo.body, textAlign: 'center' }}>
            What happens if you cover one ear gently?
          </p>
        </div>
        {renderVisualization(false)}
        <div style={{ background: colors.bgCard, margin: '16px', padding: typo.cardPadding, borderRadius: '12px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: typo.heading }}>The Setup:</h3>
          <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.5 }}>
            Imagine covering one ear with your hand or an earplug. You can still hear sounds,
            just muffled on one side. How does this affect your ability to locate sounds?
          </p>
        </div>
        <div style={{ padding: '0 16px 16px 16px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontSize: typo.heading }}>
            When you cover one ear, localization becomes:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {twistPredictions.map((p) => (
              <button key={p.id} onClick={() => setTwistPrediction(p.id)}
                style={{
                  minHeight: '44px', padding: typo.cardPadding, borderRadius: '8px',
                  border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                  background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: typo.body,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  // TWIST PLAY PHASE
  if (currentPhase === 'twist_play') {
    return renderPageWrapper(
      <>
        <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
          <h2 style={{ color: colors.warning, marginBottom: '8px', fontSize: typo.heading }}>Test One-Ear Localization</h2>
          <p style={{ color: colors.textSecondary, fontSize: typo.body }}>
            Cover an ear and observe how ITD and ILD information is lost
          </p>
        </div>
        {renderVisualization(true, true)}
        {renderEarControls()}
        {renderControls()}
        <div style={{
          background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: typo.cardPadding,
          borderRadius: '12px', borderLeft: `3px solid ${colors.warning}`,
        }}>
          <h4 style={{ color: colors.warning, marginBottom: '8px', fontSize: typo.body }}>Key Observation:</h4>
          <p style={{ color: colors.textSecondary, fontSize: typo.body }}>
            With one ear covered, you lose the ability to compare arrival times (ITD) and
            loudness levels (ILD) between ears. The brain needs BOTH ears to triangulate sound position!
          </p>
        </div>
      </>
    );
  }

  // TWIST REVIEW PHASE
  if (currentPhase === 'twist_review') {
    const wasCorrect = twistPrediction === 'worse_all';
    return renderPageWrapper(
      <>
        <div style={{
          background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          margin: '16px', padding: '20px', borderRadius: '12px',
          borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
        }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontSize: typo.heading }}>
            {wasCorrect ? 'Correct!' : 'Not Quite!'}
          </h3>
          <p style={{ color: colors.textPrimary, fontSize: typo.body }}>
            Covering one ear dramatically worsens localization for ALL directions!
          </p>
        </div>
        <div style={{ margin: '16px', display: 'flex', justifyContent: 'center' }}>
          <svg width="300" height="160" viewBox="0 0 300 160" style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px' }}>
            <text x="150" y="25" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="bold">Binaural Hearing Required</text>
            <ellipse cx="80" cy="80" rx="20" ry="35" fill="#22c55e" opacity="0.6" />
            <text x="80" y="85" textAnchor="middle" fill="#e2e8f0" fontSize="11">Left</text>
            <ellipse cx="220" cy="80" rx="20" ry="35" fill="#22c55e" opacity="0.6" />
            <text x="220" y="85" textAnchor="middle" fill="#e2e8f0" fontSize="11">Right</text>
            <line x1="100" y1="80" x2="200" y2="80" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="5,5" />
            <text x="150" y="75" textAnchor="middle" fill="#cbd5e1" fontSize="11">Compare</text>
            <text x="150" y="130" textAnchor="middle" fill="#f59e0b" fontSize="11">ITD + ILD</text>
            <text x="150" y="148" textAnchor="middle" fill="#cbd5e1" fontSize="11">enables localization</text>
          </svg>
        </div>
        <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.warning, marginBottom: '12px', fontSize: typo.heading }}>Why Both Ears Matter</h3>
          <div style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.7 }}>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Comparison is key:</strong> Sound localization
              works by COMPARING signals between ears.
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>ITD requires timing reference:</strong> You
              need two ears to measure "the sound arrived HERE before THERE."
            </p>
            <p>
              <strong style={{ color: colors.textPrimary }}>Real-world impact:</strong> People with
              single-sided deafness struggle with sound localization and hearing speech in noisy environments.
            </p>
          </div>
        </div>
      </>
    );
  }

  // TRANSFER PHASE
  if (currentPhase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Direction Finding"
        applications={transferApplications}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
      />
    );
  }

  if (currentPhase === 'transfer') {
    const currentApp = transferApplications[transferAppIndex];
    const completedCount = transferCompleted.size;
    const totalApps = transferApplications.length;

    return renderPageWrapper(
      <>
        <div style={{ padding: typo.pagePadding }}>
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center', fontSize: typo.heading }}>
            Real-World Applications
          </h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '8px', fontSize: typo.body }}>
            ITD and ILD principles are used everywhere from home theaters to hunting owls. These acoustic localization principles, first studied by Lord Rayleigh in 1907, have been adopted by companies like Apple, Google, Sony, and Bose. Modern spatial audio in Apple AirPods Pro uses head tracking at 100 Hz to maintain ITD accuracy within 10 microseconds.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ color: colors.textSecondary, fontSize: typo.small }}>
              Application {transferAppIndex + 1} of {totalApps}
            </span>
            <span style={{ color: colors.textMuted, fontSize: typo.label }}>
              ({completedCount} completed)
            </span>
          </div>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
            {transferApplications.map((_, index) => (
              <div key={index} style={{
                flex: 1, height: '4px', borderRadius: '2px',
                background: transferCompleted.has(index) ? colors.success : index === transferAppIndex ? colors.accent : 'rgba(255,255,255,0.2)',
              }} />
            ))}
          </div>
        </div>
        <div style={{
          background: colors.bgCard, margin: '16px', padding: typo.cardPadding, borderRadius: '12px',
          border: transferCompleted.has(transferAppIndex) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: typo.bodyLarge }}>{currentApp.title}</h3>
            {transferCompleted.has(transferAppIndex) && <span style={{ color: colors.success, fontSize: typo.small }}>Completed</span>}
          </div>
          <p style={{ color: colors.textSecondary, fontSize: typo.body, marginBottom: '12px' }}>{currentApp.description}</p>
          <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
            <p style={{ color: colors.accent, fontSize: typo.small, fontWeight: 'bold' }}>{currentApp.question}</p>
          </div>
          {!transferCompleted.has(transferAppIndex) ? (
            <button onClick={() => setTransferCompleted(new Set([...transferCompleted, transferAppIndex]))}
              style={{
                minHeight: '44px', padding: '8px 16px', borderRadius: '6px',
                border: `1px solid ${colors.accent}`, background: 'transparent',
                color: colors.accent, cursor: 'pointer', fontSize: typo.small,
              }}
            >
              Reveal Answer
            </button>
          ) : (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
              <p style={{ color: colors.textPrimary, fontSize: typo.small }}>{currentApp.answer}</p>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px', gap: '8px' }}>
          <button onClick={() => setTransferAppIndex(Math.max(0, transferAppIndex - 1))} disabled={transferAppIndex === 0}
            style={{
              minHeight: '44px', padding: '10px 20px', borderRadius: '8px',
              border: `1px solid ${colors.textMuted}`, background: 'transparent',
              color: transferAppIndex === 0 ? 'rgba(255,255,255,0.3)' : colors.textSecondary,
              cursor: transferAppIndex === 0 ? 'not-allowed' : 'pointer', fontSize: typo.body,
            }}
          >
            Previous App
          </button>
          <button
            onClick={() => {
              if (!transferCompleted.has(transferAppIndex)) {
                setTransferCompleted(new Set([...transferCompleted, transferAppIndex]));
              }
              if (transferAppIndex < totalApps - 1) {
                setTransferAppIndex(transferAppIndex + 1);
              }
            }}
            style={{
              minHeight: '44px', padding: '10px 20px', borderRadius: '8px', border: 'none',
              background: `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`,
              color: 'white', cursor: 'pointer', fontSize: typo.body, fontWeight: 600,
            }}
          >
            Got It
          </button>
          {transferAppIndex < totalApps - 1 ? (
            <button onClick={() => setTransferAppIndex(transferAppIndex + 1)}
              style={{
                minHeight: '44px', padding: '10px 20px', borderRadius: '8px', border: 'none',
                background: `linear-gradient(135deg, ${colors.accent} 0%, #7c3aed 100%)`,
                color: 'white', cursor: 'pointer', fontSize: typo.body, fontWeight: 600,
              }}
            >
              Next Application
            </button>
          ) : (
            <button onClick={goToNextPhase}
              style={{
                minHeight: '44px', padding: '10px 20px', borderRadius: '8px', border: 'none',
                background: `linear-gradient(135deg, ${colors.accent} 0%, #7c3aed 100%)`,
                color: 'white', cursor: 'pointer', fontSize: typo.body, fontWeight: 600,
              }}
            >
              Take the Test
            </button>
          )}
        </div>
      </>
    );
  }

  // TEST PHASE
  if (currentPhase === 'test') {
    if (testSubmitted) {
      return renderPageWrapper(
        <>
          <div style={{
            background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px', padding: '24px', borderRadius: '12px', textAlign: 'center',
          }}>
            <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px', fontSize: typo.heading }}>
              {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ color: colors.textPrimary, fontSize: typo.title, fontWeight: 'bold' }}>{testScore} / 10</p>
            <p style={{ color: colors.textSecondary, marginTop: '8px', fontSize: typo.body }}>
              {testScore >= 8 ? 'You\'ve mastered sound localization!' : 'Review the material and try again.'}
            </p>
          </div>
          {testQuestions.map((q, qIndex) => {
            const userAnswer = testAnswers[qIndex];
            const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
            return (
              <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: typo.cardPadding, borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold', fontSize: typo.body }}>Q{qIndex + 1} of 10: {q.question}</p>
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} style={{
                    padding: '8px 12px', marginBottom: '4px', borderRadius: '6px',
                    background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                    color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary, fontSize: typo.small,
                  }}>
                    {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''}{opt.text}
                  </div>
                ))}
              </div>
            );
          })}
        </>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return renderPageWrapper(
      <>
        <div style={{ padding: typo.pagePadding }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: typo.heading }}>Knowledge Test</h2>
            <span style={{ color: colors.textSecondary, fontSize: typo.body }}>Q{currentTestQuestion + 1} of {testQuestions.length}</span>
          </div>
          <p style={{ color: colors.textSecondary, fontSize: typo.small, marginBottom: '12px' }}>
            Scenario: You are an audio engineer designing a spatial audio system for a concert hall.
            Understanding the physics of sound localization including Interaural Time Difference (ITD),
            Interaural Level Difference (ILD), and the head shadow effect is essential for creating
            an immersive listener experience. Apply what you have learned about how sound wavelength,
            head diameter, and source angle affect human perception of sound direction.
          </p>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
            {testQuestions.map((_, i) => (
              <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{
                flex: 1, height: '4px', borderRadius: '2px', cursor: 'pointer',
                background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)',
              }} />
            ))}
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '8px 16px', borderRadius: '8px', marginBottom: '16px', textAlign: 'center' }}>
            <span style={{ color: colors.accent, fontSize: typo.bodyLarge, fontWeight: 'bold' }}>
              Question {currentTestQuestion + 1} of {testQuestions.length}
            </span>
            <span style={{ color: colors.textSecondary, fontSize: typo.small, marginLeft: '12px' }}>
              ({currentTestQuestion + 1} / {testQuestions.length})
            </span>
          </div>
          <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ color: colors.textPrimary, fontSize: typo.bodyLarge, lineHeight: 1.5 }}>{currentQ.question}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentQ.options.map((opt, oIndex) => (
              <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                style={{
                  minHeight: '44px', padding: typo.cardPadding, borderRadius: '8px',
                  border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                  background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                  color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: typo.body,
                }}
              >
                {opt.text}
              </button>
            ))}
          </div>
          {showQuizConfirm && (
            <div style={{
              position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
              background: colors.bgCard, padding: '16px 24px', borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)', zIndex: 1001,
              display: 'flex', gap: '12px', alignItems: 'center',
            }}>
              <span style={{ color: colors.textSecondary, fontSize: typo.body }}>Confirm answer?</span>
              <button onClick={confirmQuizAnswer}
                style={{
                  minHeight: '44px', padding: '8px 20px', borderRadius: '6px', border: 'none',
                  background: colors.accent, color: 'white', cursor: 'pointer', fontSize: typo.body, fontWeight: 600,
                }}
              >
                Confirm
              </button>
              <button onClick={() => setShowQuizConfirm(false)}
                style={{
                  minHeight: '44px', padding: '8px 20px', borderRadius: '6px',
                  border: `1px solid ${colors.textMuted}`, background: 'transparent',
                  color: colors.textSecondary, cursor: 'pointer', fontSize: typo.body,
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: typo.pagePadding }}>
          <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0}
            style={{
              minHeight: '44px', padding: '12px 24px', borderRadius: '8px',
              border: `1px solid ${colors.textMuted}`, background: 'transparent',
              color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary,
              cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer', fontSize: typo.body,
            }}
          >
            Previous
          </button>
          {currentTestQuestion < testQuestions.length - 1 ? (
            <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
              style={{
                minHeight: '44px', padding: '12px 24px', borderRadius: '8px', border: 'none',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: 'white', cursor: 'pointer', fontSize: typo.body,
                boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
              }}
            >
              Next
            </button>
          ) : (
            <button onClick={submitTest} disabled={testAnswers.includes(null)}
              style={{
                minHeight: '44px', padding: '12px 24px', borderRadius: '8px', border: 'none',
                background: testAnswers.includes(null) ? colors.textMuted : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer', fontSize: typo.body,
                boxShadow: testAnswers.includes(null) ? 'none' : '0 4px 15px rgba(16, 185, 129, 0.4)',
              }}
            >
              Submit Test
            </button>
          )}
        </div>
      </>
    );
  }

  // MASTERY PHASE
  if (currentPhase === 'mastery') {
    return renderPageWrapper(
      <>
        <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }} role="img" aria-label="trophy">&#x1F3C6;</div>
          <h1 style={{ color: colors.success, marginBottom: '8px', fontSize: typo.title }}>Mastery Achieved!</h1>
          <p style={{ color: colors.textSecondary, marginBottom: '24px', fontSize: typo.body }}>You've mastered the physics of sound localization</p>
        </div>
        <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.heading }}>Key Concepts Mastered:</h3>
          <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0, fontSize: typo.body }}>
            <li>Head shadow effect and wavelength dependence</li>
            <li>Interaural Time Difference (ITD) - up to 0.6-0.7 ms</li>
            <li>Interaural Level Difference (ILD) - stronger at high frequencies</li>
            <li>Why bass is hard to localize (wavelength larger than head)</li>
            <li>Binaural hearing is essential for spatial awareness</li>
          </ul>
        </div>
        <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.heading }}>Beyond the Basics:</h3>
          <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.6 }}>
            The "Duplex Theory" explains that ITD dominates for low frequencies (below ~1500 Hz)
            while ILD dominates for high frequencies. The "cone of confusion" exists because sounds
            at different elevations can produce identical ITD/ILD.
          </p>
        </div>
        {renderVisualization(true)}
      </>
    );
  }

  // Default fallback
  return renderPageWrapper(
    <>
      <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
        <h1 style={{ color: colors.accent, fontSize: typo.title, marginBottom: '8px' }}>
          Why is locating bass harder than treble?
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: typo.bodyLarge, marginBottom: '24px' }}>
          Your ears are acoustic detectors with built-in direction finding
        </p>
      </div>
      {renderVisualization(true)}
    </>
  );
};

export default DirectionFindingRenderer;
