import React, { useState, useEffect, useCallback } from 'react';

interface CycloidMotionRendererProps {
  phase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  gamePhase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const PHASES = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'] as const;
type PhaseType = typeof PHASES[number];

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#cbd5e1', // Changed from #94a3b8 for better contrast (brightness >= 180)
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#06b6d4',
  accentGlow: 'rgba(6, 182, 212, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  wheel: '#3b82f6',
  point: '#ef4444',
  cycloid: '#10b981',
  ground: '#475569',
  // High contrast primary action colors
  primaryAction: '#22d3ee', // Brighter cyan for primary actions
  primaryActionHover: '#67e8f9',
};

const CycloidMotionRenderer: React.FC<CycloidMotionRendererProps> = ({
  phase: phaseProp,
  gamePhase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Use gamePhase if provided, otherwise phase, default to 'hook'
  const getValidPhase = (p: string | undefined): PhaseType => {
    if (p && PHASES.includes(p as PhaseType)) {
      return p as PhaseType;
    }
    return 'hook';
  };

  const initialPhase = getValidPhase(gamePhase || phaseProp);
  const [currentPhase, setCurrentPhase] = useState<PhaseType>(initialPhase);

  // Update phase when props change
  useEffect(() => {
    const newPhase = getValidPhase(gamePhase || phaseProp);
    setCurrentPhase(newPhase);
  }, [gamePhase, phaseProp]);

  const phase = currentPhase;
  const currentPhaseIndex = PHASES.indexOf(phase);

  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Typography system
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

  // Simulation state
  const [theta, setTheta] = useState(0);  // Rotation angle
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);

  // Game parameters
  const [showTrace, setShowTrace] = useState(true);
  const [tracePointRadius, setTracePointRadius] = useState(1.0);  // 1.0 = rim, 0.5 = midpoint, 0 = center
  const [sliderValue, setSliderValue] = useState(100);  // 0-100 range for slider
  const [showVelocityVectors, setShowVelocityVectors] = useState(false);

  // Trace history
  const [tracePoints, setTracePoints] = useState<{x: number, y: number}[]>([]);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistResult, setShowTwistResult] = useState(false);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTransferApp, setCurrentTransferApp] = useState(0);
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [confirmedAnswers, setConfirmedAnswers] = useState<boolean[]>(new Array(10).fill(false));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Wheel properties
  const wheelRadius = 50;
  const groundY = 300;
  const startX = 80;

  // Calculate positions
  const getWheelCenter = useCallback((angle: number) => {
    const x = startX + wheelRadius * angle;
    const y = groundY - wheelRadius;
    return { x, y };
  }, [startX, wheelRadius, groundY]);

  const getPointOnWheel = useCallback((angle: number, radiusFraction: number) => {
    const center = getWheelCenter(angle);
    const r = wheelRadius * radiusFraction;
    return {
      x: center.x + r * Math.sin(angle),
      y: center.y + r * Math.cos(angle),
    };
  }, [getWheelCenter, wheelRadius]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const speed = 1.5;
    const interval = setInterval(() => {
      setTheta(prev => {
        const newTheta = prev + 0.05 * speed;
        // Add to trace if enabled
        if (showTrace && newTheta < 15) {
          const point = getPointOnWheel(newTheta, tracePointRadius);
          setTracePoints(pts => [...pts, point]);
        }
        return newTheta;
      });
      setTime(prev => prev + 0.05);
    }, 30);

    return () => clearInterval(interval);
  }, [isPlaying, showTrace, tracePointRadius, getPointOnWheel]);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    setTime(0);
    setIsPlaying(false);
    setTheta(0);
    setTracePoints([]);
  }, []);

  // Calculate velocity at point
  const getVelocityAtPoint = useCallback((angle: number, radiusFraction: number) => {
    // For rolling without slipping, v_cm = ω * R
    // Point velocity = v_cm + ω × r
    const omega = 1.5; // Angular velocity (rad/s)
    const vcm = omega * wheelRadius;

    // Velocity components
    const vx = vcm + omega * wheelRadius * radiusFraction * Math.cos(angle);
    const vy = -omega * wheelRadius * radiusFraction * Math.sin(angle);

    return { vx, vy, speed: Math.sqrt(vx * vx + vy * vy) };
  }, [wheelRadius]);

  const predictions = [
    { id: 'circle', label: 'A circle - it just goes around and around' },
    { id: 'straight', label: 'A straight line - it moves with the wheel' },
    { id: 'cycloid', label: 'A looping curve that touches the ground periodically' },
    { id: 'wave', label: 'A smooth wave pattern' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'The same cycloid curve' },
    { id: 'smaller', label: 'A smaller, tighter loop' },
    { id: 'curtate', label: 'A wavy curve that doesn\'t touch the ground' },
    { id: 'prolate', label: 'A curve with extended loops below the wheel' },
  ];

  const transferApplications = [
    {
      title: 'Train Wheel Engineering at BNSF Railway',
      description: 'At BNSF Railway, engineers study cycloid motion to understand the train wheel paradox. Train wheel flanges extend about 25mm below the rail surface. When a train travels at 100 km/h, the bottom of the flange actually moves backward relative to the ground at speeds up to 15 km/h!',
      question: 'How can part of a moving train move backward?',
      answer: 'Points below the wheel\'s contact point have negative velocity relative to ground. The flange at radius r > R traces a prolate cycloid, momentarily moving backward. This principle is used by Union Pacific, CSX Transportation, and Norfolk Southern for wheel design optimization. About 85% of rail wear occurs at the flange-rail interface.',
    },
    {
      title: 'Bicycle Dynamics at Shimano Research',
      description: 'Shimano and SRAM engineers study valve stem motion for wheel balancing. On a bicycle traveling at 30 km/h, the valve traces a cycloid path, reaching 60 km/h at the top (2x wheel center speed) while instantaneously stopping at ground contact.',
      question: 'When is the valve moving fastest? When is it stationary?',
      answer: 'The valve is stationary when touching the ground (instantaneous zero velocity). It\'s fastest at the top, moving at 2x the bike\'s speed! This principle is why high-speed camera footage at Trek and Specialized shows the top of a rolling wheel appears blurred while the bottom is sharp. Over 500 million bicycles use this principle worldwide.',
    },
    {
      title: 'Tautochrone Problem - Huygens Clock Design',
      description: 'In 1673, Christiaan Huygens discovered that a ball rolling on a cycloid takes exactly the same time regardless of starting height. This discovery led to the development of precision clocks at companies like Rolex and Patek Philippe, achieving accuracy within 2 seconds per day.',
      question: 'Why does a ball rolling on a cycloid take the same time regardless of starting height?',
      answer: 'The cycloid\'s curve exactly compensates for different starting positions. Higher starts have steeper initial slopes (up to 90 degrees), accelerating the ball more. The math works out to equal time for all starting points - about 1.57 seconds for a 1-meter cycloid under Earth\'s gravity (9.8 m/s²). This isochronous property is used in seismographs by organizations like USGS.',
    },
    {
      title: 'Cycloidal Gear Manufacturing at Nabtesco',
      description: 'Nabtesco Corporation, the world\'s leading manufacturer of precision gears, produces over 60% of the cycloidal reducers used in industrial robots. Companies like FANUC, ABB, and KUKA rely on these gears for robotic arm joints, achieving positioning accuracy of 0.01mm.',
      question: 'Why do cycloidal gears produce smooth motion?',
      answer: 'Cycloidal curves arise from rolling motion. When gear teeth are shaped as cycloids, they mesh with pure rolling contact - achieving 95% efficiency compared to 80% for standard gears. This technology is crucial for the $50 billion industrial robotics industry, with applications in Tesla\'s Gigafactories and Amazon\'s fulfillment centers.',
    },
  ];

  const testQuestions = [
    {
      question: 'A scientist at NASA is studying the motion of Mars rover wheels. As the wheel rolls across the Martian surface without slipping, what curve does a point on the wheel\'s rim trace?',
      options: [
        { text: 'A) Circle - the point simply rotates around the center', correct: false },
        { text: 'B) Cycloid - a looping curve with cusps at ground contact', correct: true },
        { text: 'C) Parabola - similar to a projectile path', correct: false },
        { text: 'D) Sine wave - a smooth oscillating pattern', correct: false },
      ],
    },
    {
      question: 'An automotive engineer at Tesla is designing regenerative braking. They need to understand "rolling without slipping." Which definition correctly describes this fundamental concept?',
      options: [
        { text: 'A) The wheel spins freely without touching ground', correct: false },
        { text: 'B) The contact point has zero velocity relative to ground', correct: true },
        { text: 'C) The wheel doesn\'t rotate at all during motion', correct: false },
        { text: 'D) There is no friction between wheel and ground', correct: false },
      ],
    },
    {
      question: 'A bicycle racer is analyzing their wheel dynamics at 40 km/h. At what point on the rolling wheel is velocity momentarily zero relative to the ground?',
      options: [
        { text: 'A) At the center (hub) of the wheel', correct: false },
        { text: 'B) At the top of the wheel', correct: false },
        { text: 'C) At the contact point with ground', correct: true },
        { text: 'D) Nowhere - all points are always moving forward', correct: false },
      ],
    },
    {
      question: 'A high-speed camera at Shimano research lab films a wheel whose center moves at speed v. How fast is the top of the wheel moving relative to the ground?',
      options: [
        { text: 'A) v (same as center) - all points move together', correct: false },
        { text: 'B) 2v (twice the center speed)', correct: true },
        { text: 'C) v/2 (half the center speed)', correct: false },
        { text: 'D) 0 (it\'s stationary like the bottom)', correct: false },
      ],
    },
    {
      question: 'A Rolex watchmaker is designing precision escapement mechanisms. They study a "curtate cycloid." What is this curve?',
      options: [
        { text: 'A) A cycloid traced by a point inside the wheel rim (r < R)', correct: true },
        { text: 'B) A cycloid traced by a point outside the wheel (r > R)', correct: false },
        { text: 'C) A cycloid traced very slowly at low angular velocity', correct: false },
        { text: 'D) A cycloid traced on a curved rather than flat surface', correct: false },
      ],
    },
    {
      question: 'An MIT physics student observes that a cycloid has a "cusp" (pointed corner) at the bottom. Why does this sharp point form?',
      options: [
        { text: 'A) The wheel bounces slightly at this point', correct: false },
        { text: 'B) The tracing point has zero velocity here', correct: true },
        { text: 'C) Friction creates a sharp corner in the path', correct: false },
        { text: 'D) It\'s an optical illusion from the camera angle', correct: false },
      ],
    },
    {
      question: 'A robotics engineer at FANUC is calculating motor requirements. For a wheel of radius R = 0.5m moving with angular velocity ω = 4 rad/s, what is the center velocity v_center?',
      options: [
        { text: 'A) ωR = 2 m/s', correct: true },
        { text: 'B) ω/R = 8 rad/m', correct: false },
        { text: 'C) 2ωR = 4 m/s', correct: false },
        { text: 'D) ω + R = 4.5 units (mixed)', correct: false },
      ],
    },
    {
      question: 'In 1696, Johann Bernoulli posed the brachistochrone problem. A ball must roll from point A to lower point B. The fastest path is related to the cycloid because:',
      options: [
        { text: 'A) Cycloids are actually straight lines in disguise', correct: false },
        { text: 'B) An inverted cycloid minimizes travel time under gravity', correct: true },
        { text: 'C) Wheels naturally roll in cycloid paths', correct: false },
        { text: 'D) Cycloids conserve more energy than other paths', correct: false },
      ],
    },
    {
      question: 'A sports photographer at the Tour de France uses a 1/500s shutter. When photographing a bicycle wheel rolling at 50 km/h, which part would appear sharpest in the image?',
      options: [
        { text: 'A) The top of the wheel - moving fastest', correct: false },
        { text: 'B) The hub at the center - rotation axis', correct: false },
        { text: 'C) The bottom (contact point) - momentarily stationary', correct: true },
        { text: 'D) All parts appear equally blurred', correct: false },
      ],
    },
    {
      question: 'A surveyor\'s wheel has radius R = 0.159m (circumference = 1m). After exactly one complete rotation, what distance has the wheel traveled along the ground?',
      options: [
        { text: 'A) 2πR = 1m (one circumference)', correct: true },
        { text: 'B) πR = 0.5m (half circumference)', correct: false },
        { text: 'C) R = 0.159m (one radius)', correct: false },
        { text: 'D) No consistent relationship exists', correct: false },
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
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  // Navigation functions
  const goToNextPhase = () => {
    const nextIndex = currentPhaseIndex + 1;
    if (nextIndex < PHASES.length) {
      setCurrentPhase(PHASES[nextIndex]);
    }
    if (onPhaseComplete) onPhaseComplete();
  };

  const goToPrevPhase = () => {
    const prevIndex = currentPhaseIndex - 1;
    if (prevIndex >= 0) {
      setCurrentPhase(PHASES[prevIndex]);
    }
  };

  const goToPhase = (index: number) => {
    if (index >= 0 && index < PHASES.length) {
      setCurrentPhase(PHASES[index]);
    }
  };

  // Navigation bar component - fixed at TOP
  const renderNavBar = () => (
    <nav
      aria-label="Game navigation"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        padding: '12px 16px',
        background: colors.bgDark,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <button
        onClick={goToPrevPhase}
        disabled={currentPhaseIndex === 0}
        aria-label="Back"
        style={{
          padding: '10px 20px',
          minHeight: '44px',
          minWidth: '44px',
          borderRadius: '8px',
          border: `1px solid ${colors.textMuted}`,
          background: 'transparent',
          color: currentPhaseIndex === 0 ? colors.textMuted : colors.textSecondary,
          cursor: currentPhaseIndex === 0 ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          fontSize: '14px',
        }}
      >
        Back
      </button>

      {/* Progress bar */}
      <div
        role="progressbar"
        aria-valuenow={currentPhaseIndex + 1}
        aria-valuemin={1}
        aria-valuemax={PHASES.length}
        aria-label={`Progress: phase ${currentPhaseIndex + 1} of ${PHASES.length}`}
        style={{
          display: 'flex',
          gap: '4px',
          flex: 1,
          maxWidth: '300px',
          margin: '0 16px',
        }}
      >
        {PHASES.map((p, i) => (
          <button
            key={p}
            onClick={() => goToPhase(i)}
            aria-label={`Go to ${p} phase`}
            aria-current={i === currentPhaseIndex ? 'step' : undefined}
            style={{
              flex: 1,
              height: '8px',
              borderRadius: '4px',
              background: i < currentPhaseIndex
                ? colors.success
                : i === currentPhaseIndex
                ? colors.accent
                : 'rgba(255,255,255,0.2)',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              minWidth: '20px',
            }}
          />
        ))}
      </div>

      <button
        onClick={goToNextPhase}
        aria-label="Next"
        disabled={phase === 'test' && !testSubmitted}
        style={{
          padding: '10px 20px',
          minHeight: '44px',
          minWidth: '44px',
          borderRadius: '8px',
          border: 'none',
          background: (phase === 'test' && !testSubmitted)
            ? colors.textMuted
            : `linear-gradient(135deg, ${colors.primaryAction}, ${colors.accent})`,
          color: 'white',
          cursor: (phase === 'test' && !testSubmitted) ? 'not-allowed' : 'pointer',
          opacity: (phase === 'test' && !testSubmitted) ? 0.4 : 1,
          fontWeight: 'bold',
          fontSize: '14px',
          transition: 'all 0.2s ease',
          boxShadow: (phase === 'test' && !testSubmitted) ? 'none' : '0 2px 8px rgba(6, 182, 212, 0.3)',
        }}
      >
        Next
      </button>
    </nav>
  );

  const renderVisualization = (interactive: boolean) => {
    const width = 500;
    const height = 380;

    // Use a display angle so the visualization shows a meaningful state
    // when the slider changes (at theta=0, advance to show a partial roll)
    const displayTheta = theta === 0 ? Math.PI * 0.5 + tracePointRadius * Math.PI : theta;
    const center = getWheelCenter(displayTheta);
    const tracingPoint = getPointOnWheel(displayTheta, tracePointRadius);
    const velocity = getVelocityAtPoint(displayTheta, tracePointRadius);

    // Color mapping based on tracePointRadius
    const radiusColor = tracePointRadius >= 0.8 ? '#ef4444' : tracePointRadius >= 0.4 ? '#f59e0b' : '#3b82f6';

    return (
      <div key="viz-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          key="main-svg"
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: colors.bgDark, borderRadius: '12px', maxWidth: '550px' }}
          role="img"
          aria-label="Cycloid motion visualization showing a wheel rolling on a surface with a tracing point"
        >
          {/* Premium defs section with gradients and filters */}
          <defs>
            {/* Background gradient */}
            <linearGradient id="cycBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="30%" stopColor="#0a0f1a" />
              <stop offset="70%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Ground surface gradient with texture effect */}
            <linearGradient id="cycGroundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="15%" stopColor="#334155" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="85%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Ground surface line highlight */}
            <linearGradient id="cycGroundLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#64748b" stopOpacity="0.3" />
              <stop offset="25%" stopColor="#94a3b8" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#cbd5e1" stopOpacity="1" />
              <stop offset="75%" stopColor="#94a3b8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#64748b" stopOpacity="0.3" />
            </linearGradient>

            {/* Wheel 3D gradient - radial for depth */}
            <radialGradient id="cycWheelGradient" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.6" />
              <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#2563eb" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.2" />
            </radialGradient>

            {/* Wheel rim gradient */}
            <linearGradient id="cycWheelRim" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="25%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="75%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>

            {/* Wheel hub gradient */}
            <radialGradient id="cycWheelHub" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1e40af" />
            </radialGradient>

            {/* Spoke gradient */}
            <linearGradient id="cycSpokeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.5" />
            </linearGradient>

            {/* Cycloid trace gradient */}
            <linearGradient id="cycTraceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="25%" stopColor="#34d399" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#6ee7b7" stopOpacity="0.9" />
              <stop offset="75%" stopColor="#34d399" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.5" />
            </linearGradient>

            {/* Tracing point gradient - radial glow */}
            <radialGradient id="cycPointGradient" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="40%" stopColor="#f87171" />
              <stop offset="70%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </radialGradient>

            {/* Velocity arrow gradients */}
            <linearGradient id="cycVelocityYellow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            <linearGradient id="cycVelocityGreen" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            {/* Contact indicator gradient */}
            <radialGradient id="cycContactGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#f87171" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>

            {/* Ground texture pattern */}
            <pattern id="cycGroundTexture" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" />
              <circle cx="2" cy="2" r="0.5" fill="#475569" fillOpacity="0.3" />
              <circle cx="12" cy="8" r="0.3" fill="#64748b" fillOpacity="0.2" />
              <circle cx="6" cy="15" r="0.4" fill="#475569" fillOpacity="0.25" />
              <circle cx="17" cy="12" r="0.3" fill="#64748b" fillOpacity="0.2" />
            </pattern>

            {/* Arrow markers with gradients */}
            <marker id="cycArrowYellow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="url(#cycVelocityYellow)" />
            </marker>
            <marker id="cycArrowGreen" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="url(#cycVelocityGreen)" />
            </marker>

            {/* Tracing point glow filter */}
            <filter id="cycPointGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#ef4444" floodOpacity="0.7" />
              <feComposite in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Wheel glow filter */}
            <filter id="cycWheelGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor="#3b82f6" floodOpacity="0.4" />
              <feComposite in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Trace path glow filter */}
            <filter id="cycTraceGlow" x="-10%" y="-50%" width="120%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feFlood floodColor="#10b981" floodOpacity="0.5" />
              <feComposite in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Hub glow filter */}
            <filter id="cycHubGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Contact pulse glow */}
            <filter id="cycContactPulse" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#ef4444" floodOpacity="0.6" />
              <feComposite in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Premium background */}
          <rect width={width} height={height} fill="url(#cycBgGradient)" />

          {/* Grid lines for visual reference */}
          {[0.25, 0.5, 0.75].map(frac => (
            <line key={`hgrid-${frac}`} x1={0} y1={groundY * frac} x2={width} y2={groundY * frac} stroke="#334155" strokeWidth={0.5} opacity={0.4} strokeDasharray="4,4" />
          ))}
          {[0.2, 0.4, 0.6, 0.8].map(frac => (
            <line key={`vgrid-${frac}`} x1={width * frac} y1={0} x2={width * frac} y2={groundY} stroke="#334155" strokeWidth={0.5} opacity={0.4} strokeDasharray="4,4" />
          ))}

          {/* Tick marks along X axis */}
          {[100, 200, 300, 400].map(x => (
            <line key={`tick-${x}`} x1={x} y1={groundY - 4} x2={x} y2={groundY + 4} stroke="#64748b" strokeWidth={1} opacity={0.6} />
          ))}

          {/* Axis labels */}
          <text x={width / 2} y={groundY + 45} fill={colors.textMuted} fontSize="11" textAnchor="middle">Distance (horizontal position)</text>
          <text x={12} y={groundY / 2} fill={colors.textMuted} fontSize="11" textAnchor="middle" transform={`rotate(-90, 12, ${groundY / 2})`}>Height (velocity reference)</text>

          {/* Subtle grid pattern for depth */}
          <pattern id="cycGrid" width="25" height="25" patternUnits="userSpaceOnUse">
            <rect width="25" height="25" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.2" />
          </pattern>
          <rect width={width} height={groundY} fill="url(#cycGrid)" />

          {/* Ground with texture */}
          <rect x={0} y={groundY} width={width} height={80} fill="url(#cycGroundGradient)" />
          <rect x={0} y={groundY} width={width} height={80} fill="url(#cycGroundTexture)" />

          {/* Ground surface highlight line */}
          <line x1={0} y1={groundY} x2={width} y2={groundY} stroke="url(#cycGroundLine)" strokeWidth={3} />
          <line x1={0} y1={groundY + 1} x2={width} y2={groundY + 1} stroke="#1e293b" strokeWidth={1} />

          {/* Ground label */}
          <text x={width - 10} y={groundY + 20} fill={colors.textSecondary} fontSize="12" textAnchor="end">Ground Surface</text>

          {/* Trace path with gradient and glow */}
          {showTrace && tracePoints.length > 1 && (
            <path
              d={`M ${tracePoints[0].x} ${tracePoints[0].y} ${tracePoints.map(p => `L ${p.x} ${p.y}`).join(' ')}`}
              fill="none"
              stroke="url(#cycTraceGradient)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#cycTraceGlow)"
            />
          )}

          {/* Static cycloid preview - always visible */}
          <g>
            <path
              d={Array.from({ length: 100 }, (_, i) => {
                const t = (i / 100) * 4 * Math.PI;
                const x = startX + wheelRadius * (t - Math.sin(t) * tracePointRadius);
                const y = groundY - wheelRadius * (1 - Math.cos(t) * tracePointRadius);
                return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
              }).join(' ')}
              fill="none"
              stroke={colors.cycloid}
              strokeWidth={1.5}
              strokeDasharray="6,4"
              opacity={0.5}
            />
            <text x={startX + 10} y={30} fill={colors.cycloid} fontSize="11" opacity={0.7}>Cycloid Path (r={tracePointRadius.toFixed(1)}R)</text>
            {/* Reference baseline cycloid for comparison */}
            <path
              d={Array.from({ length: 100 }, (_, i) => {
                const t = (i / 100) * 4 * Math.PI;
                const x = startX + wheelRadius * (t - Math.sin(t));
                const y = groundY - wheelRadius * (1 - Math.cos(t));
                return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
              }).join(' ')}
              fill="none"
              stroke={colors.cycloid}
              strokeWidth={0.8}
              strokeDasharray="2,3"
              opacity={tracePointRadius < 0.9 ? 0.25 : 0}
            />
          </g>

          {/* Wheel outer glow */}
          <circle
            cx={center.x}
            cy={center.y}
            r={wheelRadius + 2}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={1}
            opacity={0.3}
            filter="url(#cycWheelGlow)"
          />

          {/* Wheel with 3D gradient fill */}
          <circle
            cx={center.x}
            cy={center.y}
            r={wheelRadius}
            fill="url(#cycWheelGradient)"
            stroke="url(#cycWheelRim)"
            strokeWidth={4}
          />

          {/* Wheel label */}
          <text x={center.x} y={center.y - wheelRadius - 15} fill={colors.textSecondary} fontSize="12" textAnchor="middle">Rolling Wheel (r={tracePointRadius.toFixed(1)}R)</text>

          {/* Wheel inner ring for depth */}
          <circle
            cx={center.x}
            cy={center.y}
            r={wheelRadius - 5}
            fill="none"
            stroke="#60a5fa"
            strokeWidth={1}
            opacity={0.3}
          />

          {/* Wheel spokes with gradient */}
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const spokeAngle = theta + (i * Math.PI) / 3;
            return (
              <line
                key={i}
                x1={center.x}
                y1={center.y}
                x2={center.x + wheelRadius * Math.sin(spokeAngle)}
                y2={center.y + wheelRadius * Math.cos(spokeAngle)}
                stroke="url(#cycSpokeGradient)"
                strokeWidth={3}
                strokeLinecap="round"
              />
            );
          })}

          {/* Center hub with gradient and glow */}
          <circle
            cx={center.x}
            cy={center.y}
            r={8}
            fill="url(#cycWheelHub)"
            filter="url(#cycHubGlow)"
          />
          <circle
            cx={center.x}
            cy={center.y}
            r={4}
            fill="#93c5fd"
          />
          <text x={center.x - 15} y={center.y + 20} fill={colors.textSecondary} fontSize="11" textAnchor="end">Center</text>

          {/* Tracing point with premium glow */}
          <circle
            cx={tracingPoint.x}
            cy={tracingPoint.y}
            r={10}
            fill={radiusColor}
            filter="url(#cycPointGlow)"
          />
          {/* Inner highlight on tracing point */}
          <circle
            cx={tracingPoint.x - 2}
            cy={tracingPoint.y - 2}
            r={3}
            fill="#fecaca"
            opacity={0.6}
          />
          {/* Tracing point label */}
          <text x={tracingPoint.x + 15} y={tracingPoint.y - 18} fill={radiusColor} fontSize="11" fontWeight="bold">Tracing Point (r={tracePointRadius.toFixed(1)}R)</text>

          {/* Velocity vectors with gradients */}
          {showVelocityVectors && (
            <g>
              {/* Center velocity */}
              <line
                x1={center.x}
                y1={center.y}
                x2={center.x + 35}
                y2={center.y}
                stroke="url(#cycVelocityYellow)"
                strokeWidth={3}
                strokeLinecap="round"
                markerEnd="url(#cycArrowYellow)"
              />
              <text x={center.x + 40} y={center.y - 5} fill="#fbbf24" fontSize="11">v_center</text>

              {/* Point velocity */}
              <line
                x1={tracingPoint.x}
                y1={tracingPoint.y}
                x2={tracingPoint.x + velocity.vx / 3}
                y2={tracingPoint.y + velocity.vy / 3}
                stroke="url(#cycVelocityGreen)"
                strokeWidth={3}
                strokeLinecap="round"
                markerEnd="url(#cycArrowGreen)"
              />
              <text x={tracingPoint.x + velocity.vx / 3 + 5} y={tracingPoint.y + velocity.vy / 3} fill="#34d399" fontSize="11">v_point</text>
            </g>
          )}

          {/* Ground contact indicator with pulse effect */}
          {tracePointRadius === 1 && Math.abs(Math.cos(theta) - 1) < 0.1 && (
            <g>
              <circle
                cx={tracingPoint.x}
                cy={groundY}
                r={15}
                fill="url(#cycContactGlow)"
                filter="url(#cycContactPulse)"
              />
              <circle
                cx={tracingPoint.x}
                cy={groundY}
                r={12}
                fill="none"
                stroke="#f87171"
                strokeWidth={2}
                opacity={0.7}
              />
              <text x={tracingPoint.x} y={groundY + 30} fill="#f87171" fontSize="11" textAnchor="middle">Contact Point (v=0)</text>
            </g>
          )}
        </svg>

        {/* Legend section */}
        <div
          aria-label="Legend"
          style={{
            display: 'flex',
            gap: isMobile ? '12px' : '20px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            padding: '8px 16px',
            background: 'rgba(30, 41, 59, 0.6)',
            borderRadius: '8px',
            maxWidth: '500px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #60a5fa, #2563eb)'
            }} />
            <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Wheel center - moves in straight line</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f87171, #dc2626)',
              boxShadow: '0 0 6px rgba(239, 68, 68, 0.5)'
            }} />
            <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Tracing point - follows cycloid path</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '16px',
              height: '3px',
              borderRadius: '2px',
              background: 'linear-gradient(90deg, #10b981, #6ee7b7, #10b981)'
            }} />
            <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Cycloid path - curve traced by point</span>
          </div>
        </div>

        {/* Speed display moved outside SVG - comparison layout */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: '16px',
          padding: '8px 16px',
          background: 'rgba(6, 182, 212, 0.1)',
          borderRadius: '6px',
          border: '1px solid rgba(6, 182, 212, 0.2)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontSize: typo.label, color: colors.textMuted }}>Reference (center)</span>
            <span style={{ fontSize: typo.body, color: colors.textSecondary }}>
              <strong style={{ color: '#3b82f6' }}>1.0</strong> units
            </span>
          </div>
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontSize: typo.label, color: colors.textMuted }}>Current point (r={tracePointRadius.toFixed(2)}R)</span>
            <span style={{ fontSize: typo.body, color: colors.textSecondary }}>
              <strong style={{ color: radiusColor }}>{velocity.speed.toFixed(1)}</strong> units
            </span>
          </div>
        </div>

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
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: isPlaying
                  ? '0 4px 15px rgba(239, 68, 68, 0.3)'
                  : '0 4px 15px rgba(16, 185, 129, 0.3)',
              }}
            >
              {isPlaying ? 'Pause' : 'Roll'}
            </button>
            <button
              onClick={resetSimulation}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'rgba(6, 182, 212, 0.1)',
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
    <div style={{
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      background: 'rgba(30, 41, 59, 0.8)',
      borderRadius: '12px',
      margin: '0 16px',
      border: '1px solid rgba(6, 182, 212, 0.2)'
    }}>
      <h4 style={{ color: colors.textPrimary, margin: 0, fontWeight: 600, fontSize: '16px' }}>Controls</h4>
      <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <label style={{ color: colors.textSecondary, fontSize: '14px', display: 'block', marginBottom: '8px' }}>Radius: {sliderValue}% ({tracePointRadius === 1 ? 'Rim' : tracePointRadius >= 0.5 ? 'Midpoint' : tracePointRadius === 0 ? 'Center' : 'Inner'})</label>
        <input type="range" min={0} max={100} value={sliderValue} onChange={(e) => { setSliderValue(Number(e.target.value)); setTracePointRadius(Number(e.target.value) / 100); }} style={{ touchAction: 'pan-y', width: '100%', height: '20px', cursor: 'pointer', accentColor: colors.accent }} aria-label="Tracing point radius slider" />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textMuted, marginTop: '4px' }}><span>0</span><span>100</span></div>
      </div>

      <div style={{
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        background: 'rgba(15, 23, 42, 0.6)',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <label style={{ color: colors.textSecondary, display: 'flex', alignItems: 'center', minHeight: '44px', fontWeight: 400 }}>
          <input
            type="checkbox"
            checked={showTrace}
            onChange={(e) => setShowTrace(e.target.checked)}
            style={{ marginRight: '8px', width: '20px', height: '20px' }}
          />
          Show trace path
        </label>
        <label style={{ color: colors.textSecondary, display: 'flex', alignItems: 'center', minHeight: '44px', fontWeight: 400 }}>
          <input
            type="checkbox"
            checked={showVelocityVectors}
            onChange={(e) => setShowVelocityVectors(e.target.checked)}
            style={{ marginRight: '8px', width: '20px', height: '20px' }}
          />
          Show velocity vectors
        </label>
      </div>

      <div style={{
        background: 'rgba(6, 182, 212, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: 400 }}>
          {tracePointRadius === 1 && 'Rim point traces a true cycloid with cusps.'}
          {tracePointRadius > 0 && tracePointRadius < 1 && 'Inner point traces a curtate cycloid (wavy, no cusps).'}
          {tracePointRadius === 0 && 'Center traces a straight line (no curve).'}
        </div>
      </div>
    </div>
  );

  // Page wrapper as inline function (not a component, to avoid remount on re-render)
  const wrapPage = (children: React.ReactNode) => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
      {renderNavBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '80px', transition: 'all 0.3s ease' }}>
        {children}
      </div>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      wrapPage(<>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px', fontWeight: 700 }}>
            The Dancing Point
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px', fontWeight: 400 }}>
            Let's explore what happens when a wheel rolls - what path does a point trace?
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
              When a wheel rolls, its center moves in a straight line. But a point on the rim?
              It dances through the air, tracing one of mathematics' most beautiful curves.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
              This curve - the cycloid - has fascinated mathematicians for 400 years.
            </p>
          </div>

          <div style={{
            background: 'rgba(6, 182, 212, 0.2)',
            padding: '16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
              Watch the red point as the wheel rolls!
            </p>
          </div>
        </div>
      </>)
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const answeredCount = prediction ? 1 : 0;
    const totalQuestions = 1;

    return (
      wrapPage(<>
        {/* Progress indicator */}
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            Progress: {answeredCount} of {totalQuestions} prediction made
          </p>
        </div>

        {renderVisualization(false)}

        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '16px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
            A wheel with a red point marked on its rim. The wheel will roll along the ground
            without slipping (no skidding). The green dashed line shows a preview of the path.
          </p>
        </div>

        <div style={{ padding: '0 16px 16px 16px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
            What shape does the red point trace as the wheel rolls?
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {predictions.map((p) => (
              <button
                key={p.id}
                onClick={() => setPrediction(p.id)}
                style={{
                  padding: '16px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                  background: prediction === p.id ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
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
      </>)
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      wrapPage(<>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore the Cycloid</h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            Watch how different points on the wheel trace different curves
          </p>
        </div>

        {/* Observation guidance */}
        <div style={{
          background: 'rgba(6, 182, 212, 0.15)',
          margin: '0 16px 16px 16px',
          padding: '12px 16px',
          borderRadius: '8px',
          borderLeft: `3px solid ${colors.accent}`,
        }}>
          <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
            <strong style={{ color: colors.accent }}>Observe:</strong> Notice how the tracing point slows down near the ground and speeds up at the top. This is the key to understanding rolling motion!
          </p>
        </div>

        {/* Real-world relevance callout */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          margin: '0 16px 16px 16px',
          padding: '12px 16px',
          borderRadius: '8px',
          borderLeft: `3px solid ${colors.success}`,
        }}>
          <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
            <strong style={{ color: colors.success }}>Why This Matters:</strong> Understanding cycloid motion is important in real-world engineering applications - from designing gear teeth to calculating the fastest descent paths used in roller coaster design.
          </p>
        </div>

        {renderVisualization(true)}

        <div style={{
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          background: 'rgba(30, 41, 59, 0.8)',
          borderRadius: '12px',
          margin: '0 16px',
          border: '1px solid rgba(6, 182, 212, 0.2)'
        }}>
          <h4 style={{ color: colors.textPrimary, margin: 0, fontWeight: 600, fontSize: '16px' }}>Controls</h4>
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <label style={{ color: colors.textSecondary, fontSize: '14px', display: 'block', marginBottom: '8px' }}>Radius: {sliderValue}% ({tracePointRadius === 1 ? 'Rim' : tracePointRadius >= 0.5 ? 'Midpoint' : tracePointRadius === 0 ? 'Center' : 'Inner'})</label>
            <input type="range" min={0} max={100} value={sliderValue} onChange={(e) => { setSliderValue(Number(e.target.value)); setTracePointRadius(Number(e.target.value) / 100); }} style={{ touchAction: 'pan-y', width: '100%', height: '20px', cursor: 'pointer', accentColor: colors.accent }} aria-label="Tracing point radius slider" />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textMuted, marginTop: '4px' }}><span>0</span><span>100</span></div>
          </div>
        </div>

        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '16px',
          borderRadius: '12px',
        }}>
          <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
          <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
            <li>Rim point (1.0) - true cycloid with cusps</li>
            <li>Midpoint (0.5) - curtate cycloid (wavy)</li>
            <li>Center (0.0) - straight line!</li>
            <li>Enable velocity to see speed changes</li>
          </ul>
        </div>
      </>)
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'cycloid';

    return (
      wrapPage(<>
        <div style={{
          background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
        }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
            {wasCorrect ? 'Your prediction was correct!' : 'Not quite what you predicted!'}
          </h3>
          <p style={{ color: colors.textPrimary }}>
            As you observed, the point traces a cycloid - a looping curve that touches the ground at regular intervals!
          </p>
        </div>

        {/* SVG diagram for review */}
        <div style={{ margin: '16px', display: 'flex', justifyContent: 'center' }}>
          <svg width="300" height="150" viewBox="0 0 300 150" style={{ background: colors.bgDark, borderRadius: '8px' }}>
            <text x="150" y="20" fill={colors.textSecondary} fontSize="12" textAnchor="middle">Velocity Distribution on Rolling Wheel</text>
            <circle cx="150" cy="85" r="40" fill="none" stroke={colors.wheel} strokeWidth="2" />
            <circle cx="150" cy="85" r="4" fill={colors.wheel} />
            <text x="165" y="88" fill={colors.textSecondary} fontSize="11">v = omega * R</text>
            {/* Top arrow - 2v */}
            <line x1="150" y1="45" x2="200" y2="45" stroke={colors.success} strokeWidth="2" markerEnd="url(#arrowG)" />
            <text x="205" y="48" fill={colors.success} fontSize="11">2v (top)</text>
            {/* Bottom point - 0 */}
            <circle cx="150" cy="125" r="4" fill={colors.error} />
            <text x="165" y="140" fill={colors.error} fontSize="11">v = 0 (contact)</text>
            <defs>
              <marker id="arrowG" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill={colors.success} />
              </marker>
            </defs>
          </svg>
        </div>

        {/* Key Insight Callout */}
        <div style={{
          background: 'rgba(6, 182, 212, 0.15)',
          margin: '16px',
          padding: '16px 20px',
          borderRadius: '12px',
          border: `2px solid ${colors.accent}`,
          boxShadow: '0 0 20px rgba(6, 182, 212, 0.2)',
          transition: 'all 0.3s ease',
        }}>
          <h4 style={{ color: colors.primaryAction, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>&#128161;</span> Key Insight
          </h4>
          <p style={{ color: colors.textPrimary, fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
            The cycloid is the <strong>only curve</strong> where a point on a rolling wheel touches the ground with zero velocity. This creates the distinctive "cusp" shape at each contact point!
          </p>
        </div>

        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Understanding Rolling Without Slipping</h3>
          <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>The Constraint:</strong> For rolling without
              slipping, the contact point has zero velocity relative to the ground. The wheel doesn't
              skid - it "grips" the surface.
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Velocity Distribution:</strong> The bottom
              of the wheel is momentarily stationary, while the top moves at 2x the center's speed.
              This creates the characteristic looping path.
            </p>
            <p>
              <strong style={{ color: colors.textPrimary }}>The Cusp:</strong> When the rim point touches
              the ground, it has zero velocity - creating a sharp "cusp" in the curve. This is unique
              to the true cycloid!
            </p>
          </div>
        </div>

        {/* Step tracker for progressive disclosure */}
        <div style={{
          margin: '16px',
          padding: '12px 16px',
          background: 'rgba(30, 41, 59, 0.6)',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          alignItems: 'center',
        }}>
          <span style={{ color: colors.textMuted, fontSize: '12px' }}>Step 4 of 10:</span>
          <span style={{ color: colors.textSecondary, fontSize: '13px' }}>Review complete - ready for the twist!</span>
        </div>
      </>)
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const answeredCount = twistPrediction ? 1 : 0;
    const totalQuestions = 1;

    return (
      wrapPage(<>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
          <p style={{ color: colors.textSecondary }}>
            What if we track a point inside the wheel, not on the rim?
          </p>
          <p style={{ color: colors.textMuted, fontSize: '14px', marginTop: '8px' }}>
            Progress: {answeredCount} of {totalQuestions} prediction made
          </p>
        </div>

        {renderVisualization(false)}

        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '16px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
            Imagine moving the red point inward - halfway between the rim and the center.
            This point still rotates with the wheel but at a smaller radius.
          </p>
        </div>

        <div style={{ padding: '0 16px 16px 16px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
            What curve does an interior point trace?
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {twistPredictions.map((p) => (
              <button
                key={p.id}
                onClick={() => setTwistPrediction(p.id)}
                style={{
                  padding: '16px',
                  minHeight: '44px',
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
      </>)
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      wrapPage(<>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Point Position</h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            Move the tracing point to different radii
          </p>
        </div>

        {/* Observation guidance */}
        <div style={{
          background: 'rgba(245, 158, 11, 0.15)',
          margin: '0 16px 16px 16px',
          padding: '12px 16px',
          borderRadius: '8px',
          borderLeft: `3px solid ${colors.warning}`,
        }}>
          <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
            <strong style={{ color: colors.warning }}>Observe:</strong> Compare curves at different radii. Notice how interior points never touch the ground - they trace smooth waves instead of cusped cycloids!
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
          <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            Interior points never touch the ground, so they trace smooth waves (curtate cycloid)
            instead of curves with cusps. Only the rim creates the true cycloid!
          </p>
        </div>
      </>)
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'curtate';

    return (
      wrapPage(<>
        <div style={{
          background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
        }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
            {wasCorrect ? 'Correct!' : 'Not Quite!'}
          </h3>
          <p style={{ color: colors.textPrimary }}>
            Interior points trace a "curtate cycloid" - a smooth wave that never touches the ground!
          </p>
        </div>

        {/* SVG diagram for twist review */}
        <div style={{ margin: '16px', display: 'flex', justifyContent: 'center' }}>
          <svg width="350" height="120" viewBox="0 0 350 120" style={{ background: colors.bgDark, borderRadius: '8px' }}>
            <text x="175" y="15" fill={colors.textSecondary} fontSize="11" textAnchor="middle">The Cycloid Family</text>
            {/* True cycloid */}
            <path d="M 20 80 Q 50 20 80 80 Q 110 20 140 80" fill="none" stroke={colors.cycloid} strokeWidth="2" />
            <text x="80" y="100" fill={colors.cycloid} fontSize="11" textAnchor="middle">Cycloid (r=R)</text>
            {/* Curtate cycloid */}
            <path d="M 150 70 Q 180 40 210 70 Q 240 40 270 70" fill="none" stroke={colors.warning} strokeWidth="2" />
            <text x="210" y="100" fill={colors.warning} fontSize="11" textAnchor="middle">Curtate (r&lt;R)</text>
            {/* Labels */}
            <circle cx="80" cy="80" r="3" fill={colors.error} />
            <text x="80" y="115" fill={colors.textMuted} fontSize="11" textAnchor="middle">cusp</text>
          </svg>
        </div>

        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.warning, marginBottom: '12px' }}>The Cycloid Family</h3>
          <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Cycloid:</strong> Traced by a point on
              the rim (r = R). Has cusps where velocity = 0.
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Curtate Cycloid:</strong> Traced by a
              point inside (r {"<"} R). Smooth waves, never touches ground.
            </p>
            <p>
              <strong style={{ color: colors.textPrimary }}>Prolate Cycloid:</strong> Traced by a
              point outside the wheel (like a train wheel flange, r {">"} R). Loops that dip below
              the rolling surface!
            </p>
          </div>
        </div>
      </>)
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const currentApp = transferApplications[currentTransferApp];
    const completedCount = transferCompleted.size;
    const totalApps = transferApplications.length;

    return (
      wrapPage(<>
        <div style={{ padding: '16px' }}>
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
            Cycloids appear in surprising places across engineering, physics, and manufacturing
          </p>
          {/* Progress indicator */}
          <p style={{ color: colors.textMuted, fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>
            Progress: Application {currentTransferApp + 1} of {totalApps} ({completedCount} completed)
          </p>
        </div>

        {/* Overview of cycloid applications */}
        <div style={{
          background: 'rgba(6, 182, 212, 0.1)',
          margin: '0 16px 16px 16px',
          padding: '16px',
          borderRadius: '8px',
          borderLeft: `3px solid ${colors.accent}`,
        }}>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
            The cycloid curve, first studied by Galileo in 1599, has been called the Helen of Geometry due to the fierce debates it inspired among mathematicians. Today, cycloid motion principles are critical in industries worth over $200 billion globally, from precision watchmaking at Rolex and Patek Philippe to industrial robotics at FANUC and ABB. Train wheels at BNSF Railway, bicycle dynamics at Shimano, and gear manufacturing at Nabtesco Corporation all rely on understanding how points on rolling wheels trace these remarkable curves. The fundamental equation x = R(t - sin t), y = R(1 - cos t) describes one of the most elegant curves in mathematics.
          </p>
        </div>

        {/* Current application card */}
        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
          border: transferCompleted.has(currentTransferApp) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px' }}>{currentApp.title}</h3>
            {transferCompleted.has(currentTransferApp) && (
              <span style={{ color: colors.success, fontSize: '20px' }}>&#10003;</span>
            )}
          </div>
          <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '16px', lineHeight: 1.6 }}>
            {currentApp.description}
          </p>
          <div style={{
            background: 'rgba(6, 182, 212, 0.1)',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '12px',
          }}>
            <p style={{ color: colors.accent, fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
              {currentApp.question}
            </p>
          </div>

          {!transferCompleted.has(currentTransferApp) ? (
            <button
              onClick={() => setTransferCompleted(new Set([...transferCompleted, currentTransferApp]))}
              style={{
                padding: '12px 20px',
                minHeight: '44px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              Reveal Answer
            </button>
          ) : (
            <>
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '12px',
                borderRadius: '8px',
                borderLeft: `3px solid ${colors.success}`,
                marginBottom: '12px',
              }}>
                <p style={{ color: colors.textPrimary, fontSize: '14px', lineHeight: 1.6 }}>{currentApp.answer}</p>
              </div>
              <button
                onClick={() => {
                  if (currentTransferApp < transferApplications.length - 1) {
                    setCurrentTransferApp(currentTransferApp + 1);
                  }
                }}
                style={{
                  padding: '12px 20px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.success,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                Got It
              </button>
            </>
          )}
        </div>

        {/* Navigation between apps */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px 16px 16px', gap: '12px' }}>
          <button
            onClick={() => setCurrentTransferApp(Math.max(0, currentTransferApp - 1))}
            disabled={currentTransferApp === 0}
            style={{
              padding: '12px 20px',
              minHeight: '44px',
              borderRadius: '8px',
              border: `1px solid ${colors.textMuted}`,
              background: 'transparent',
              color: currentTransferApp === 0 ? colors.textMuted : colors.textSecondary,
              cursor: currentTransferApp === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            Previous App
          </button>

          {currentTransferApp < totalApps - 1 ? (
            <button
              onClick={() => setCurrentTransferApp(currentTransferApp + 1)}
              style={{
                padding: '12px 20px',
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
              Next App
            </button>
          ) : (
            <button
              onClick={goToNextPhase}
              disabled={completedCount < totalApps}
              style={{
                padding: '12px 20px',
                minHeight: '44px',
                borderRadius: '8px',
                border: 'none',
                background: completedCount >= totalApps ? colors.success : colors.textMuted,
                color: 'white',
                cursor: completedCount >= totalApps ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              Got It - Continue
            </button>
          )}
        </div>

        {/* App indicator dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '8px' }}>
          {transferApplications.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentTransferApp(i)}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                border: 'none',
                background: transferCompleted.has(i)
                  ? colors.success
                  : i === currentTransferApp
                  ? colors.accent
                  : 'rgba(255,255,255,0.3)',
                cursor: 'pointer',
                padding: 0,
              }}
              aria-label={`Go to application ${i + 1}`}
            />
          ))}
        </div>
      </>)
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        wrapPage(<>
          <div style={{
            background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center',
          }}>
            <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
              {testScore >= 8 ? 'Excellent! Test Complete!' : 'Test Complete! Keep Learning!'}
            </h2>
            <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>
              You scored {testScore} / 10
            </p>
            <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
              {testScore >= 8 ? 'You\'ve mastered cycloid motion!' : 'Review the material and try again.'}
            </p>
          </div>

          {/* Answer review */}
          <div style={{ padding: '0 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>Answer Review:</h3>
          </div>
          {testQuestions.map((q, qIndex) => {
            const userAnswer = testAnswers[qIndex];
            const isCorrect = userAnswer !== null && q.options[userAnswer].correct;

            return (
              <div
                key={qIndex}
                style={{
                  background: colors.bgCard,
                  margin: '8px 16px',
                  padding: '16px',
                  borderRadius: '12px',
                  borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{
                    color: isCorrect ? colors.success : colors.error,
                    fontSize: '18px',
                    fontWeight: 'bold',
                  }}>
                    {isCorrect ? '✓' : '✗'}
                  </span>
                  <span style={{ color: colors.textMuted, fontSize: '12px' }}>Q{qIndex + 1}</span>
                </div>
                <p style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: '14px' }}>
                  {q.question}
                </p>
                {q.options.map((opt, oIndex) => (
                  <div
                    key={oIndex}
                    style={{
                      padding: '6px 10px',
                      marginBottom: '4px',
                      borderRadius: '6px',
                      background: opt.correct
                        ? 'rgba(16, 185, 129, 0.2)'
                        : userAnswer === oIndex
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'transparent',
                      color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textMuted,
                      fontSize: '13px',
                    }}
                  >
                    {opt.correct ? '✓' : userAnswer === oIndex ? '✗' : '○'} {opt.text}
                  </div>
                ))}
              </div>
            );
          })}
        </>)
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    const answeredCount = testAnswers.filter(a => a !== null).length;

    return (
      wrapPage(<>
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
            <span style={{ color: colors.textSecondary, fontWeight: 'bold' }}>
              Question {currentTestQuestion + 1} of {testQuestions.length}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{
            display: 'flex',
            gap: '4px',
            marginBottom: '16px',
          }}>
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
                    : 'rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>

          {/* Progress text */}
          <p style={{ color: colors.textMuted, fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>
            Progress: {answeredCount} of {testQuestions.length} questions answered
          </p>

          <div style={{
            background: colors.bgCard,
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '16px',
          }}>
            <p style={{ color: colors.accent, fontSize: '14px', marginBottom: '8px', fontWeight: 'bold' }}>
              Q{currentTestQuestion + 1} of {testQuestions.length}
            </p>
            <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>
              {currentQ.question}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentQ.options.map((opt, oIndex) => {
              const isSelected = testAnswers[currentTestQuestion] === oIndex;
              const isConfirmed = confirmedAnswers[currentTestQuestion];
              const isCorrectOption = opt.correct;

              let optionBg = 'transparent';
              let optionBorder = '1px solid rgba(255,255,255,0.2)';
              let optionColor = colors.textPrimary;

              if (isConfirmed) {
                if (isCorrectOption) {
                  optionBg = 'rgba(16, 185, 129, 0.2)';
                  optionBorder = `2px solid ${colors.success}`;
                  optionColor = colors.success;
                } else if (isSelected) {
                  optionBg = 'rgba(239, 68, 68, 0.2)';
                  optionBorder = `2px solid ${colors.error}`;
                  optionColor = colors.error;
                }
              } else if (isSelected) {
                optionBg = 'rgba(6, 182, 212, 0.2)';
                optionBorder = `2px solid ${colors.accent}`;
              }

              return (
                <button
                  key={oIndex}
                  onClick={() => !isConfirmed && handleTestAnswer(currentTestQuestion, oIndex)}
                  disabled={isConfirmed}
                  style={{
                    padding: '16px',
                    minHeight: '44px',
                    borderRadius: '8px',
                    border: optionBorder,
                    background: optionBg,
                    color: optionColor,
                    cursor: isConfirmed ? 'default' : 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  {isConfirmed && isCorrectOption && '✓ '}
                  {isConfirmed && isSelected && !isCorrectOption && '✗ '}
                  {opt.text}
                </button>
              );
            })}
          </div>

          {/* Check Answer button */}
          {testAnswers[currentTestQuestion] !== null && !confirmedAnswers[currentTestQuestion] && (
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <button
                onClick={() => {
                  const newConfirmed = [...confirmedAnswers];
                  newConfirmed[currentTestQuestion] = true;
                  setConfirmedAnswers(newConfirmed);
                }}
                style={{
                  padding: '12px 24px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${colors.warning}, #d97706)`,
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px',
                }}
              >
                Check Answer
              </button>
            </div>
          )}

          {/* Feedback after confirmation */}
          {confirmedAnswers[currentTestQuestion] && (
            <div style={{
              margin: '16px',
              padding: '16px',
              borderRadius: '8px',
              background: currentQ.options[testAnswers[currentTestQuestion]!]?.correct
                ? 'rgba(16, 185, 129, 0.2)'
                : 'rgba(239, 68, 68, 0.2)',
              borderLeft: `4px solid ${currentQ.options[testAnswers[currentTestQuestion]!]?.correct ? colors.success : colors.error}`,
            }}>
              <p style={{
                color: currentQ.options[testAnswers[currentTestQuestion]!]?.correct ? colors.success : colors.error,
                fontWeight: 'bold',
                marginBottom: '8px',
              }}>
                {currentQ.options[testAnswers[currentTestQuestion]!]?.correct ? '✓ Correct!' : '✗ Incorrect'}
              </p>
              {!currentQ.options[testAnswers[currentTestQuestion]!]?.correct && (
                <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                  The correct answer is: {currentQ.options.find(o => o.correct)?.text}
                </p>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
          <button
            onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
            disabled={currentTestQuestion === 0}
            style={{
              padding: '12px 24px',
              minHeight: '44px',
              borderRadius: '8px',
              border: `1px solid ${colors.textMuted}`,
              background: 'transparent',
              color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary,
              cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            &#8592; Previous
          </button>

          {currentTestQuestion < testQuestions.length - 1 ? (
            <button
              onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
              disabled={!confirmedAnswers[currentTestQuestion]}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: 'none',
                background: confirmedAnswers[currentTestQuestion] ? colors.accent : colors.textMuted,
                color: 'white',
                cursor: confirmedAnswers[currentTestQuestion] ? 'pointer' : 'not-allowed',
              }}
            >
              Next Question &#8594;
            </button>
          ) : (
            <button
              onClick={submitTest}
              disabled={!confirmedAnswers.every(c => c)}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: 'none',
                background: confirmedAnswers.every(c => c) ? colors.success : colors.textMuted,
                color: 'white',
                cursor: confirmedAnswers.every(c => c) ? 'pointer' : 'not-allowed',
              }}
            >
              Submit Test
            </button>
          )}
        </div>
      </>)
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      wrapPage(<>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>&#127942;</div>
          <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
          <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
            You've mastered cycloid motion and rolling without slipping
          </p>
        </div>

        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
          <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
            <li>Rolling without slipping constraint (v = omega R)</li>
            <li>Velocity distribution on a rolling wheel</li>
            <li>The cycloid curve and its properties</li>
            <li>Curtate and prolate cycloids</li>
            <li>Applications from trains to the brachistochrone</li>
          </ul>
        </div>

        <div style={{
          background: 'rgba(6, 182, 212, 0.2)',
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
            The cycloid was called "the Helen of geometry" because of the mathematical
            feuds it inspired. It's the solution to both the brachistochrone (fastest
            descent) and tautochrone (equal time) problems - a remarkable mathematical
            coincidence that connects rolling motion to optimal paths!
          </p>
        </div>

        {renderVisualization(true)}
      </>)
    );
  }

  // Default fallback - should never reach here, but return hook phase content
  return (
    wrapPage(<>
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
          The Dancing Point
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: '18px' }}>
          What path does a point on a rolling wheel actually trace?
        </p>
      </div>
      {renderVisualization(true)}
    </>)
  );
};

export default CycloidMotionRenderer;
