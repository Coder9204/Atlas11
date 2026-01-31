import React, { useState, useEffect, useCallback, useRef } from 'react';

interface LiftForceRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const LiftForceRenderer: React.FC<LiftForceRendererProps> = ({ phase, onPhaseComplete, onCorrectAnswer, onIncorrectAnswer }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Lift force parameters
  const [airspeed, setAirspeed] = useState(150); // km/h (0-300)
  const [angleOfAttack, setAngleOfAttack] = useState(5); // degrees (-5 to 20)
  const [wingArea, setWingArea] = useState(20); // m^2 (10-40)
  const [airDensity, setAirDensity] = useState(1.225); // kg/m^3 (0.5-1.5)

  // Twist phase parameters
  const [airfoilShape, setAirfoilShape] = useState<'flat' | 'cambered' | 'symmetric'>('cambered');
  const [flapsDeployed, setFlapsDeployed] = useState(false);
  const [slatsDeployed, setSlatsDeployed] = useState(false);
  const [groundEffect, setGroundEffect] = useState(false);

  // Animation
  const [animationFrame, setAnimationFrame] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  const lastClickRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Mobile detection
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

  // Animation loop for streamlines
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const playSound = useCallback((soundType: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      const sounds: Record<string, { freq: number; type: OscillatorType; duration: number }> = {
        'correct': { freq: 880, type: 'sine', duration: 0.15 },
        'incorrect': { freq: 220, type: 'square', duration: 0.3 },
        'complete': { freq: 587, type: 'sine', duration: 0.2 },
        'transition': { freq: 440, type: 'sine', duration: 0.1 }
      };

      const sound = sounds[soundType] || sounds['transition'];
      oscillator.frequency.value = sound.freq;
      oscillator.type = sound.type;
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + sound.duration);
      oscillator.start();
      oscillator.stop(ctx.currentTime + sound.duration);
    } catch (e) {
      console.log(`Sound: ${soundType}`);
    }
  }, []);

  // Calculate lift coefficient based on angle of attack
  const calculateCl = useCallback((aoa: number, shape: string, flaps: boolean, slats: boolean) => {
    // Base Cl curve approximation
    let cl = 0;
    const stallAngle = slats ? 18 : 15;

    if (aoa < stallAngle) {
      // Linear region: Cl ~ 0.1 * aoa for cambered airfoil
      const clSlope = shape === 'flat' ? 0.08 : shape === 'symmetric' ? 0.1 : 0.11;
      const clZero = shape === 'cambered' ? 0.3 : 0;
      cl = clSlope * aoa + clZero;
    } else {
      // Post-stall: Cl drops
      cl = 1.5 - (aoa - stallAngle) * 0.1;
    }

    // Flaps increase Cl
    if (flaps) cl += 0.5;

    return Math.max(0, Math.min(cl, 2.5));
  }, []);

  // Calculate drag coefficient
  const calculateCd = useCallback((aoa: number, cl: number) => {
    // Parasitic + induced drag
    const cd0 = 0.02; // Parasitic drag
    const k = 0.04; // Induced drag factor
    return cd0 + k * cl * cl + 0.001 * Math.abs(aoa);
  }, []);

  // Calculate lift force: L = 0.5 * rho * v^2 * A * Cl
  const calculateLift = useCallback(() => {
    const v = airspeed / 3.6; // Convert km/h to m/s
    const cl = calculateCl(angleOfAttack, airfoilShape, flapsDeployed, slatsDeployed);
    let lift = 0.5 * airDensity * v * v * wingArea * cl;

    // Ground effect increases lift by ~10-30%
    if (groundEffect) lift *= 1.2;

    return lift;
  }, [airspeed, angleOfAttack, wingArea, airDensity, airfoilShape, flapsDeployed, slatsDeployed, groundEffect, calculateCl]);

  // Calculate drag force
  const calculateDrag = useCallback(() => {
    const v = airspeed / 3.6;
    const cl = calculateCl(angleOfAttack, airfoilShape, flapsDeployed, slatsDeployed);
    const cd = calculateCd(angleOfAttack, cl);
    return 0.5 * airDensity * v * v * wingArea * cd;
  }, [airspeed, angleOfAttack, wingArea, airDensity, airfoilShape, flapsDeployed, slatsDeployed, calculateCl, calculateCd]);

  // Check for stall
  const isStalling = useCallback(() => {
    const stallAngle = slatsDeployed ? 18 : 15;
    return angleOfAttack >= stallAngle;
  }, [angleOfAttack, slatsDeployed]);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'B' ? 'correct' : 'incorrect');
  }, [playSound]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'C' ? 'correct' : 'incorrect');
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

  const testQuestions = [
    {
      question: "What is the lift equation?",
      options: [
        { text: "L = m * g", correct: false },
        { text: "L = 0.5 * rho * v^2 * A * Cl", correct: true },
        { text: "L = F * d", correct: false },
        { text: "L = P * A", correct: false }
      ]
    },
    {
      question: "If you double the airspeed, lift increases by:",
      options: [
        { text: "2 times", correct: false },
        { text: "4 times", correct: true },
        { text: "8 times", correct: false },
        { text: "Stays the same", correct: false }
      ]
    },
    {
      question: "What happens at the stall angle?",
      options: [
        { text: "Lift suddenly increases", correct: false },
        { text: "Flow separates and lift drops dramatically", correct: true },
        { text: "The wing breaks", correct: false },
        { text: "Drag becomes zero", correct: false }
      ]
    },
    {
      question: "Cambered airfoils compared to symmetric ones:",
      options: [
        { text: "Generate less lift", correct: false },
        { text: "Generate lift even at zero angle of attack", correct: true },
        { text: "Have no advantages", correct: false },
        { text: "Are only used on rockets", correct: false }
      ]
    },
    {
      question: "What do flaps do?",
      options: [
        { text: "Reduce lift for faster landing", correct: false },
        { text: "Increase lift coefficient for slower flight", correct: true },
        { text: "Only reduce drag", correct: false },
        { text: "Control yaw direction", correct: false }
      ]
    },
    {
      question: "Ground effect causes:",
      options: [
        { text: "Decreased lift near the ground", correct: false },
        { text: "Increased lift near the ground", correct: true },
        { text: "No change in lift", correct: false },
        { text: "Instant stall", correct: false }
      ]
    },
    {
      question: "Leading edge slats help by:",
      options: [
        { text: "Reducing wing area", correct: false },
        { text: "Delaying stall to higher angles of attack", correct: true },
        { text: "Increasing speed", correct: false },
        { text: "Reducing fuel consumption", correct: false }
      ]
    },
    {
      question: "Higher air density results in:",
      options: [
        { text: "More lift for the same speed", correct: true },
        { text: "Less lift for the same speed", correct: false },
        { text: "No change in lift", correct: false },
        { text: "Automatic stall", correct: false }
      ]
    },
    {
      question: "Induced drag is caused by:",
      options: [
        { text: "Friction with the air", correct: false },
        { text: "Wingtip vortices from lift generation", correct: true },
        { text: "Engine exhaust", correct: false },
        { text: "Gravity", correct: false }
      ]
    },
    {
      question: "At high altitude, to maintain the same lift you need to:",
      options: [
        { text: "Fly slower", correct: false },
        { text: "Fly faster or increase angle of attack", correct: true },
        { text: "Reduce wing area", correct: false },
        { text: "Turn off the engines", correct: false }
      ]
    }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (answer !== -1 && testQuestions[index].options[answer].correct ? 1 : 0);
    }, 0);
  };

  // Render airfoil with streamlines - Premium SVG graphics
  const renderAirfoilVisualization = (width: number = 500, height: number = 300, showControls: boolean = false) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const chordLength = 150;
    const lift = calculateLift();
    const drag = calculateDrag();
    const cl = calculateCl(angleOfAttack, airfoilShape, flapsDeployed, slatsDeployed);
    const stalling = isStalling();

    // Scale forces for visualization
    const liftScale = Math.min(lift / 50000, 1) * 80;
    const dragScale = Math.min(drag / 10000, 1) * 50;

    // Generate airfoil path based on shape
    const getAirfoilPath = () => {
      const startX = centerX - chordLength / 2;
      const endX = centerX + chordLength / 2;

      if (airfoilShape === 'flat') {
        const thickness = 8;
        return `M ${startX} ${centerY}
                L ${endX} ${centerY - thickness/2}
                L ${endX} ${centerY + thickness/2}
                L ${startX} ${centerY} Z`;
      } else if (airfoilShape === 'symmetric') {
        const maxThickness = 15;
        return `M ${startX} ${centerY}
                Q ${centerX - 20} ${centerY - maxThickness} ${centerX + 20} ${centerY - maxThickness * 0.8}
                Q ${endX - 20} ${centerY - maxThickness * 0.3} ${endX} ${centerY}
                Q ${endX - 20} ${centerY + maxThickness * 0.3} ${centerX + 20} ${centerY + maxThickness * 0.8}
                Q ${centerX - 20} ${centerY + maxThickness} ${startX} ${centerY} Z`;
      } else {
        // Cambered
        const maxThickness = 18;
        const camber = 8;
        return `M ${startX} ${centerY}
                Q ${centerX - 30} ${centerY - maxThickness - camber} ${centerX + 10} ${centerY - maxThickness * 0.7 - camber}
                Q ${endX - 30} ${centerY - maxThickness * 0.2} ${endX} ${centerY + 2}
                Q ${endX - 20} ${centerY + maxThickness * 0.4} ${centerX + 10} ${centerY + maxThickness * 0.6}
                Q ${centerX - 30} ${centerY + maxThickness * 0.8} ${startX} ${centerY} Z`;
      }
    };

    // Generate streamlines with pressure-based coloring
    const generateStreamlines = () => {
      const lines = [];
      const numLines = 10;
      const speedFactor = airspeed / 150;

      for (let i = 0; i < numLines; i++) {
        const yOffset = (i - numLines / 2) * 22;
        const isUpper = yOffset < 0;
        const deflection = isUpper ? -angleOfAttack * 0.8 : angleOfAttack * 0.3;
        const flowOffset = (animationFrame * speedFactor * 3) % 100;

        // Disturbed flow during stall
        const turbulence = stalling && isUpper ? Math.sin(animationFrame * 0.3 + i) * 15 : 0;

        const pathD = `M ${centerX - 200 + flowOffset} ${centerY + yOffset}
                       Q ${centerX - 50} ${centerY + yOffset + deflection + turbulence}
                         ${centerX + 50} ${centerY + yOffset + deflection * 1.5 + turbulence}
                       Q ${centerX + 100} ${centerY + yOffset + deflection + turbulence}
                         ${centerX + 200 + flowOffset} ${centerY + yOffset + deflection * 0.5}`;

        // Use pressure-based gradient for streamlines
        const gradientId = isUpper ? 'liftStreamlineUpper' : 'liftStreamlineLower';

        lines.push(
          <path
            key={`stream-${i}`}
            d={pathD}
            fill="none"
            stroke={stalling && isUpper ? 'url(#liftStallGradient)' : `url(#${gradientId})`}
            strokeWidth={2}
            strokeOpacity={0.8}
            strokeDasharray={stalling && isUpper ? "8,4" : "none"}
            filter={stalling && isUpper ? undefined : "url(#liftStreamGlow)"}
          />
        );
      }
      return lines;
    };

    return (
      <svg width={width} height={height} className="overflow-visible">
        {/* Comprehensive defs section with premium gradients and filters */}
        <defs>
          {/* Background gradient */}
          <linearGradient id="liftBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#020617" />
            <stop offset="25%" stopColor="#0a0f1a" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="75%" stopColor="#0a0f1a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* Premium airfoil body gradient - 3D metallic effect */}
          <linearGradient id="liftAirfoilBody" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="15%" stopColor="#cbd5e1" />
            <stop offset="35%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#64748b" />
            <stop offset="75%" stopColor="#475569" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>

          {/* Airfoil highlight gradient */}
          <linearGradient id="liftAirfoilHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0" />
            <stop offset="20%" stopColor="#f1f5f9" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="80%" stopColor="#f1f5f9" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0" />
          </linearGradient>

          {/* Upper surface low pressure gradient (blue tones) */}
          <radialGradient id="liftLowPressure" cx="50%" cy="100%" r="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
            <stop offset="30%" stopColor="#2563eb" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#1d4ed8" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#1e40af" stopOpacity="0" />
          </radialGradient>

          {/* Lower surface high pressure gradient (red/orange tones) */}
          <radialGradient id="liftHighPressure" cx="50%" cy="0%" r="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.5" />
            <stop offset="30%" stopColor="#dc2626" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#b91c1c" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#991b1b" stopOpacity="0" />
          </radialGradient>

          {/* Streamline gradient for upper surface (faster flow = blue) */}
          <linearGradient id="liftStreamlineUpper" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
            <stop offset="25%" stopColor="#3b82f6" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#2563eb" stopOpacity="0.9" />
            <stop offset="75%" stopColor="#3b82f6" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.3" />
          </linearGradient>

          {/* Streamline gradient for lower surface (slower flow = cyan) */}
          <linearGradient id="liftStreamlineLower" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
            <stop offset="25%" stopColor="#06b6d4" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#0891b2" stopOpacity="0.8" />
            <stop offset="75%" stopColor="#06b6d4" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.3" />
          </linearGradient>

          {/* Stall turbulence gradient */}
          <linearGradient id="liftStallGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.4" />
            <stop offset="25%" stopColor="#f87171" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#ef4444" stopOpacity="0.9" />
            <stop offset="75%" stopColor="#dc2626" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.4" />
          </linearGradient>

          {/* Lift force arrow gradient (green) */}
          <linearGradient id="liftForceGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#166534" />
            <stop offset="30%" stopColor="#16a34a" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="70%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#86efac" />
          </linearGradient>

          {/* Drag force arrow gradient (red) */}
          <linearGradient id="liftDragGradient" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#7f1d1d" />
            <stop offset="30%" stopColor="#b91c1c" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="70%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#fca5a5" />
          </linearGradient>

          {/* Flaps/slats gradient */}
          <linearGradient id="liftControlSurface" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="30%" stopColor="#4b5563" />
            <stop offset="70%" stopColor="#374151" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>

          {/* Ground gradient */}
          <linearGradient id="liftGroundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="50%" stopColor="#1f2937" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>

          {/* Stall warning gradient */}
          <linearGradient id="liftStallWarning" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7f1d1d" />
            <stop offset="20%" stopColor="#991b1b" />
            <stop offset="50%" stopColor="#dc2626" />
            <stop offset="80%" stopColor="#991b1b" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>

          {/* Glow filters */}
          <filter id="liftStreamGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="liftForceGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="liftAirfoilGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="liftPressureGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="liftStallPulse" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Arrow markers with gradients */}
          <marker id="liftArrowLift" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto">
            <path d="M0,0 L0,8 L12,4 z" fill="url(#liftForceGradient)" />
          </marker>
          <marker id="liftArrowDrag" markerWidth="12" markerHeight="12" refX="2" refY="4" orient="auto">
            <path d="M12,0 L12,8 L0,4 z" fill="url(#liftDragGradient)" />
          </marker>
        </defs>

        {/* Premium background */}
        <rect x="0" y="0" width={width} height={height} fill="url(#liftBgGradient)" rx="12" />

        {/* Subtle grid pattern */}
        <pattern id="liftGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
        </pattern>
        <rect x="0" y="0" width={width} height={height} fill="url(#liftGrid)" rx="12" />

        {/* Ground for ground effect */}
        {groundEffect && (
          <g>
            <rect x="0" y={height - 35} width={width} height="35" fill="url(#liftGroundGradient)" />
            <line x1="0" y1={height - 35} x2={width} y2={height - 35} stroke="#4b5563" strokeWidth="2" />
            {/* Ground effect vortex indicators */}
            {[0.2, 0.4, 0.6, 0.8].map((pos, i) => (
              <ellipse
                key={`vortex-${i}`}
                cx={width * pos}
                cy={height - 20}
                rx={15}
                ry={8}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1"
                strokeOpacity={0.3}
                strokeDasharray="4,4"
              />
            ))}
          </g>
        )}

        {/* Streamlines */}
        <g transform={`rotate(${-angleOfAttack}, ${centerX}, ${centerY})`}>
          {generateStreamlines()}
        </g>

        {/* Airfoil with rotation for angle of attack */}
        <g transform={`rotate(${-angleOfAttack}, ${centerX}, ${centerY})`}>
          {/* Upper surface pressure zone with glow */}
          <ellipse
            cx={centerX}
            cy={centerY - 30}
            rx={chordLength * 0.45}
            ry={25 + cl * 10}
            fill="url(#liftLowPressure)"
            filter="url(#liftPressureGlow)"
          />
          {/* Lower surface pressure zone with glow */}
          <ellipse
            cx={centerX}
            cy={centerY + 25}
            rx={chordLength * 0.4}
            ry={18 + cl * 5}
            fill="url(#liftHighPressure)"
            filter="url(#liftPressureGlow)"
          />

          {/* Airfoil body with 3D gradient */}
          <path
            d={getAirfoilPath()}
            fill="url(#liftAirfoilBody)"
            stroke="#94a3b8"
            strokeWidth="1.5"
            filter="url(#liftAirfoilGlow)"
          />
          {/* Airfoil highlight overlay */}
          <path
            d={getAirfoilPath()}
            fill="url(#liftAirfoilHighlight)"
            stroke="none"
          />

          {/* Flaps */}
          {flapsDeployed && (
            <g transform={`translate(${centerX + chordLength * 0.3}, ${centerY})`}>
              <rect
                x="0"
                y="-4"
                width="32"
                height="10"
                fill="url(#liftControlSurface)"
                stroke="#6b7280"
                strokeWidth="1"
                rx="2"
                transform="rotate(25)"
              />
              {/* Flap hinge */}
              <circle cx="0" cy="0" r="3" fill="#4b5563" stroke="#6b7280" />
            </g>
          )}

          {/* Slats */}
          {slatsDeployed && (
            <g transform={`translate(${centerX - chordLength * 0.45}, ${centerY - 5})`}>
              <rect
                x="-18"
                y="-6"
                width="22"
                height="8"
                fill="url(#liftControlSurface)"
                stroke="#6b7280"
                strokeWidth="1"
                rx="2"
                transform="rotate(-10)"
              />
              {/* Slat gap indicator */}
              <line x1="-5" y1="-2" x2="-5" y2="4" stroke="#06b6d4" strokeWidth="2" strokeOpacity="0.5" />
            </g>
          )}
        </g>

        {/* Force vectors with premium styling */}
        <g transform={`translate(${centerX}, ${centerY})`}>
          {/* Lift vector (upward) with glow */}
          {liftScale > 5 && (
            <g filter="url(#liftForceGlow)">
              <line
                x1="0"
                y1="0"
                x2="0"
                y2={-liftScale}
                stroke="url(#liftForceGradient)"
                strokeWidth="6"
                strokeLinecap="round"
                markerEnd="url(#liftArrowLift)"
              />
            </g>
          )}

          {/* Drag vector (backward) with glow */}
          {dragScale > 3 && (
            <g filter="url(#liftForceGlow)">
              <line
                x1="0"
                y1="0"
                x2={-dragScale}
                y2="0"
                stroke="url(#liftDragGradient)"
                strokeWidth="4"
                strokeLinecap="round"
                markerEnd="url(#liftArrowDrag)"
              />
            </g>
          )}

          {/* Center point indicator */}
          <circle cx="0" cy="0" r="4" fill="#f8fafc" stroke="#64748b" strokeWidth="1" />
        </g>

        {/* Stall warning with pulsing effect */}
        {stalling && (
          <g filter="url(#liftStallPulse)">
            <rect
              x={width / 2 - 70}
              y="12"
              width="140"
              height="32"
              fill="url(#liftStallWarning)"
              rx="6"
              stroke="#fca5a5"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>
    );
  };

  // Render labels outside SVG using typo system
  const renderVisualizationLabels = (lift: number, drag: number, stalling: boolean) => (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: `${typo.elementGap} ${typo.cardPadding}`,
      marginTop: typo.elementGap
    }}>
      {/* Lift label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '12px',
          height: '12px',
          background: 'linear-gradient(135deg, #22c55e, #4ade80)',
          borderRadius: '3px'
        }} />
        <span style={{ fontSize: typo.small, color: '#22c55e', fontWeight: 600 }}>
          Lift: {(lift / 1000).toFixed(1)} kN
        </span>
      </div>

      {/* Drag label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '12px',
          height: '12px',
          background: 'linear-gradient(135deg, #ef4444, #f87171)',
          borderRadius: '3px'
        }} />
        <span style={{ fontSize: typo.small, color: '#ef4444', fontWeight: 600 }}>
          Drag: {(drag / 1000).toFixed(2)} kN
        </span>
      </div>

      {/* Stall indicator */}
      {stalling && (
        <div style={{
          padding: '4px 12px',
          background: 'linear-gradient(135deg, #dc2626, #991b1b)',
          borderRadius: '6px',
          animation: 'pulse 1s ease-in-out infinite'
        }}>
          <span style={{ fontSize: typo.small, color: '#fff', fontWeight: 700 }}>
            STALL WARNING
          </span>
        </div>
      )}
    </div>
  );

  // Render legend outside SVG
  const renderVisualizationLegend = () => (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: typo.elementGap,
      padding: typo.cardPadding,
      background: 'rgba(30, 41, 59, 0.6)',
      borderRadius: '8px',
      marginTop: typo.elementGap
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ width: '10px', height: '10px', background: '#3b82f6', borderRadius: '50%' }} />
        <span style={{ fontSize: typo.label, color: '#94a3b8' }}>Low Pressure</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%' }} />
        <span style={{ fontSize: typo.label, color: '#94a3b8' }}>High Pressure</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ width: '20px', height: '2px', background: 'linear-gradient(90deg, #3b82f6, #2563eb)' }} />
        <span style={{ fontSize: typo.label, color: '#94a3b8' }}>Upper Streamlines</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ width: '20px', height: '2px', background: 'linear-gradient(90deg, #06b6d4, #0891b2)' }} />
        <span style={{ fontSize: typo.label, color: '#94a3b8' }}>Lower Streamlines</span>
      </div>
    </div>
  );

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] py-8 px-6">
      {/* Premium badge */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
        <span className="text-cyan-400/80 text-sm font-medium tracking-wide uppercase">Aerodynamics</span>
      </div>

      {/* Gradient title */}
      <h1 className="text-4xl md:text-5xl font-bold text-center mb-3 bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
        The Physics of Flight
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg md:text-xl text-center mb-8 max-w-lg">
        How do wings generate lift to keep aircraft in the sky?
      </p>

      {/* Premium card */}
      <div className="w-full max-w-2xl backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
        <div className="flex justify-center mb-2">
          {renderAirfoilVisualization(450, 250)}
        </div>
        {renderVisualizationLegend()}
        <p className="text-gray-300 text-center leading-relaxed mt-4">
          Watch how air flows around an airfoil, creating pressure differences that generate lift!
        </p>
      </div>

      {/* CTA Button */}
      <button
        onClick={() => onPhaseComplete?.()}
        style={{ position: 'relative', zIndex: 10 }}
        className="group px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 flex items-center gap-2"
      >
        Discover How Wings Work
        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>

      {/* Hint text */}
      <p className="text-slate-500 text-sm mt-6">
        Learn the lift equation: L = 0.5 * rho * v^2 * A * Cl
      </p>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          An airplane wing is moving through the air. What primarily causes the upward lift force?
        </p>
        {renderAirfoilVisualization(400, 200)}
        {renderVisualizationLegend()}
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Air pushing up from below the wing' },
          { id: 'B', text: 'Lower pressure above the wing than below due to faster airflow' },
          { id: 'C', text: 'The engine pushing the plane up' },
          { id: 'D', text: 'Gravity pulling the air down' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            style={{ position: 'relative', zIndex: 10 }}
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
            Correct! The curved shape of the wing makes air travel faster over the top, creating <span className="text-cyan-400">lower pressure</span> that generates lift!
          </p>
          <button
            onClick={() => onPhaseComplete?.()}
            style={{ position: 'relative', zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
          >
            Explore the Physics
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => {
    const lift = calculateLift();
    const drag = calculateDrag();
    const cl = calculateCl(angleOfAttack, airfoilShape, flapsDeployed, slatsDeployed);
    const stalling = isStalling();

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Lift Force Laboratory</h2>

        {/* Main visualization */}
        <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
          {renderAirfoilVisualization(isMobile ? 350 : 500, isMobile ? 220 : 300)}
          {renderVisualizationLabels(lift, drag, stalling)}
          {renderVisualizationLegend()}
        </div>

        {/* Real-time calculations display */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 w-full max-w-3xl">
          <div className="bg-gradient-to-br from-emerald-900/40 to-green-900/40 rounded-xl p-3 text-center border border-emerald-500/20">
            <div className="text-2xl font-bold text-green-400">{(lift / 1000).toFixed(1)} kN</div>
            <div className="text-xs text-slate-400">Lift Force</div>
          </div>
          <div className="bg-gradient-to-br from-red-900/40 to-rose-900/40 rounded-xl p-3 text-center border border-red-500/20">
            <div className="text-2xl font-bold text-red-400">{(drag / 1000).toFixed(2)} kN</div>
            <div className="text-xs text-slate-400">Drag Force</div>
          </div>
          <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 rounded-xl p-3 text-center border border-cyan-500/20">
            <div className="text-2xl font-bold text-cyan-400">{cl.toFixed(2)}</div>
            <div className="text-xs text-slate-400">Lift Coefficient (Cl)</div>
          </div>
          <div className={`rounded-xl p-3 text-center border ${stalling ? 'bg-gradient-to-br from-red-900/50 to-rose-900/50 border-red-500/40' : 'bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border-emerald-500/20'}`}>
            <div className={`text-2xl font-bold ${stalling ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
              {stalling ? 'STALL!' : 'Normal'}
            </div>
            <div className="text-xs text-slate-400">Flight Status</div>
          </div>
        </div>

        {/* Interactive sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mb-6">
          {/* Airspeed slider */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <label className="flex justify-between text-sm text-slate-300 mb-2">
              <span>Airspeed</span>
              <span className="text-cyan-400 font-mono">{airspeed} km/h</span>
            </label>
            <input
              type="range"
              min="0"
              max="300"
              value={airspeed}
              onChange={(e) => setAirspeed(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              style={{ position: 'relative', zIndex: 10 }}
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0</span>
              <span>300 km/h</span>
            </div>
          </div>

          {/* Angle of attack slider */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <label className="flex justify-between text-sm text-slate-300 mb-2">
              <span>Angle of Attack</span>
              <span className={`font-mono ${stalling ? 'text-red-400' : 'text-cyan-400'}`}>{angleOfAttack}deg</span>
            </label>
            <input
              type="range"
              min="-5"
              max="20"
              value={angleOfAttack}
              onChange={(e) => setAngleOfAttack(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              style={{ position: 'relative', zIndex: 10 }}
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>-5deg</span>
              <span className="text-red-400">Stall: 15deg+</span>
              <span>20deg</span>
            </div>
          </div>

          {/* Wing area slider */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <label className="flex justify-between text-sm text-slate-300 mb-2">
              <span>Wing Area</span>
              <span className="text-cyan-400 font-mono">{wingArea} m2</span>
            </label>
            <input
              type="range"
              min="10"
              max="40"
              value={wingArea}
              onChange={(e) => setWingArea(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              style={{ position: 'relative', zIndex: 10 }}
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>10 m2</span>
              <span>40 m2</span>
            </div>
          </div>

          {/* Air density slider */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <label className="flex justify-between text-sm text-slate-300 mb-2">
              <span>Air Density (altitude)</span>
              <span className="text-cyan-400 font-mono">{airDensity.toFixed(3)} kg/m3</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.01"
              value={airDensity}
              onChange={(e) => setAirDensity(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              style={{ position: 'relative', zIndex: 10 }}
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>High Alt (0.5)</span>
              <span>Sea Level (1.225)</span>
              <span>Dense (1.5)</span>
            </div>
          </div>
        </div>

        {/* Lift equation display */}
        <div className="bg-gradient-to-r from-cyan-900/40 to-blue-900/40 rounded-xl p-4 max-w-3xl w-full mb-6">
          <h3 className="text-lg font-semibold text-cyan-400 mb-2">Lift Equation</h3>
          <div className="text-center text-white font-mono text-lg mb-2">
            L = 0.5 * rho * v2 * A * Cl
          </div>
          <div className="text-center text-slate-300 text-sm">
            L = 0.5 * {airDensity.toFixed(3)} * ({(airspeed/3.6).toFixed(1)})2 * {wingArea} * {cl.toFixed(2)} = <span className="text-green-400 font-bold">{(lift/1000).toFixed(1)} kN</span>
          </div>
        </div>

        <button
          onClick={() => onPhaseComplete?.()}
          style={{ position: 'relative', zIndex: 10 }}
          className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
        >
          Review the Concepts
        </button>
      </div>
    );
  };

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding Lift Force</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">The Lift Equation</h3>
          <div className="bg-slate-900/50 rounded-lg p-3 mb-3 font-mono text-center text-cyan-300">
            L = 0.5 * rho * V2 * A * Cl
          </div>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li><strong>L</strong> = Lift force (Newtons)</li>
            <li><strong>rho</strong> = Air density (kg/m3)</li>
            <li><strong>V</strong> = Airspeed (m/s)</li>
            <li><strong>A</strong> = Wing area (m2)</li>
            <li><strong>Cl</strong> = Lift coefficient</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-blue-900/50 to-indigo-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-3">Key Insights</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>Lift increases with the <strong>square</strong> of velocity</li>
            <li>Double the speed = 4x the lift!</li>
            <li>Higher altitude = lower density = less lift</li>
            <li>Angle of attack increases Cl until stall</li>
            <li>Stall occurs when flow separates from the wing</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">Bernoulli's Principle</h3>
          <div className="text-slate-300 text-sm space-y-2">
            <p>Air flows faster over the curved top of the wing, creating <strong>lower pressure</strong>.</p>
            <p>The pressure difference between bottom (high) and top (low) creates an upward force.</p>
            <p className="text-cyan-400 mt-3">
              This is why cambered (curved) airfoils generate more lift than flat plates - they accelerate the air more efficiently!
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() => onPhaseComplete?.()}
        style={{ position: 'relative', zIndex: 10 }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Discover Advanced Concepts
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">The Twist Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          An airplane needs to land at a slow speed, but slower speed means less lift. How do pilots maintain enough lift during landing?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'They increase angle of attack dangerously close to stall' },
          { id: 'B', text: 'They use larger engines to push harder' },
          { id: 'C', text: 'They deploy flaps and slats to increase lift coefficient' },
          { id: 'D', text: 'They make the wings bigger during landing' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            style={{ position: 'relative', zIndex: 10 }}
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
            Correct! Flaps and slats change the wing shape to increase Cl, allowing slow-speed flight!
          </p>
          <button
            onClick={() => onPhaseComplete?.()}
            style={{ position: 'relative', zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
          >
            Explore High-Lift Devices
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => {
    const lift = calculateLift();
    const drag = calculateDrag();
    const cl = calculateCl(angleOfAttack, airfoilShape, flapsDeployed, slatsDeployed);
    const stalling = isStalling();
    const stallAngle = slatsDeployed ? 18 : 15;

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-purple-400 mb-4">Advanced Aerodynamics Lab</h2>

        {/* Visualization */}
        <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
          {renderAirfoilVisualization(isMobile ? 350 : 500, isMobile ? 220 : 300)}
          {renderVisualizationLabels(lift, drag, stalling)}
          {renderVisualizationLegend()}
        </div>

        {/* Stats display */}
        <div className="grid grid-cols-3 gap-4 mb-6 w-full max-w-2xl">
          <div className="bg-gradient-to-br from-emerald-900/40 to-green-900/40 rounded-xl p-3 text-center border border-emerald-500/20">
            <div className="text-xl font-bold text-green-400">{(lift / 1000).toFixed(1)} kN</div>
            <div className="text-xs text-slate-400">Lift</div>
          </div>
          <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 rounded-xl p-3 text-center border border-cyan-500/20">
            <div className="text-xl font-bold text-cyan-400">{cl.toFixed(2)}</div>
            <div className="text-xs text-slate-400">Cl</div>
          </div>
          <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-xl p-3 text-center border border-amber-500/20">
            <div className="text-xl font-bold text-amber-400">{stallAngle}deg</div>
            <div className="text-xs text-slate-400">Stall Angle</div>
          </div>
        </div>

        {/* Airfoil shape selector */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-4 w-full max-w-2xl">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Airfoil Shape</h3>
          <div className="grid grid-cols-3 gap-2">
            {(['flat', 'symmetric', 'cambered'] as const).map((shape) => (
              <button
                key={shape}
                onClick={() => setAirfoilShape(shape)}
                style={{ position: 'relative', zIndex: 10 }}
                className={`p-3 rounded-lg font-medium transition-all ${
                  airfoilShape === shape
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {shape.charAt(0).toUpperCase() + shape.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {airfoilShape === 'flat' && 'Flat plate - minimal lift at zero angle'}
            {airfoilShape === 'symmetric' && 'Symmetric - good for aerobatics, zero lift at zero angle'}
            {airfoilShape === 'cambered' && 'Cambered - generates lift even at zero angle of attack'}
          </p>
        </div>

        {/* High-lift devices */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 w-full max-w-2xl">
          <button
            onClick={() => setFlapsDeployed(!flapsDeployed)}
            style={{ position: 'relative', zIndex: 10 }}
            className={`p-4 rounded-xl font-medium transition-all ${
              flapsDeployed
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <div className="text-lg mb-1">Flaps</div>
            <div className="text-xs opacity-80">{flapsDeployed ? 'Deployed (+0.5 Cl)' : 'Retracted'}</div>
          </button>

          <button
            onClick={() => setSlatsDeployed(!slatsDeployed)}
            style={{ position: 'relative', zIndex: 10 }}
            className={`p-4 rounded-xl font-medium transition-all ${
              slatsDeployed
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <div className="text-lg mb-1">Slats</div>
            <div className="text-xs opacity-80">{slatsDeployed ? 'Deployed (+3deg stall)' : 'Retracted'}</div>
          </button>

          <button
            onClick={() => setGroundEffect(!groundEffect)}
            style={{ position: 'relative', zIndex: 10 }}
            className={`p-4 rounded-xl font-medium transition-all ${
              groundEffect
                ? 'bg-amber-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <div className="text-lg mb-1">Ground Effect</div>
            <div className="text-xs opacity-80">{groundEffect ? 'Active (+20% lift)' : 'High Altitude'}</div>
          </button>
        </div>

        {/* Angle of attack control */}
        <div className="bg-slate-800/50 rounded-xl p-4 w-full max-w-2xl mb-6">
          <label className="flex justify-between text-sm text-slate-300 mb-2">
            <span>Angle of Attack</span>
            <span className={`font-mono ${stalling ? 'text-red-400' : 'text-cyan-400'}`}>{angleOfAttack}deg</span>
          </label>
          <input
            type="range"
            min="-5"
            max="20"
            value={angleOfAttack}
            onChange={(e) => setAngleOfAttack(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            style={{ position: 'relative', zIndex: 10 }}
          />
          <div className="flex justify-between text-xs mt-1">
            <span className="text-slate-500">-5deg</span>
            <span className={slatsDeployed ? 'text-amber-400' : 'text-red-400'}>Stall: {stallAngle}deg</span>
            <span className="text-slate-500">20deg</span>
          </div>
        </div>

        {/* Explanation */}
        <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-xl p-4 max-w-2xl mb-6">
          <h3 className="text-lg font-bold text-purple-400 mb-2">High-Lift Devices</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li><strong>Flaps:</strong> Increase camber and wing area, boosting Cl for slow flight</li>
            <li><strong>Slats:</strong> Leading edge devices that delay flow separation, increasing stall angle</li>
            <li><strong>Ground Effect:</strong> Near the ground, wingtip vortices are reduced, increasing efficiency</li>
          </ul>
        </div>

        <button
          onClick={() => onPhaseComplete?.()}
          style={{ position: 'relative', zIndex: 10 }}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
        >
          Review Advanced Concepts
        </button>
      </div>
    );
  };

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">Key Discoveries</h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4">Controlling Lift</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            Pilots and engineers have multiple ways to control lift beyond just speed:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li><strong>Flaps:</strong> Increase camber for more lift at low speeds</li>
            <li><strong>Slats:</strong> Delay stall for higher angle of attack capability</li>
            <li><strong>Airfoil Design:</strong> Cambered vs symmetric for different applications</li>
            <li><strong>Ground Effect:</strong> Reduced induced drag near surfaces</li>
          </ol>
          <p className="text-emerald-400 font-medium mt-4">
            Understanding these principles allows aircraft to fly safely across a wide range of speeds!
          </p>
        </div>
      </div>

      <button
        onClick={() => onPhaseComplete?.()}
        style={{ position: 'relative', zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
      >
        Explore Real-World Applications
      </button>
    </div>
  );

  const applications = [
    {
      title: "Commercial Aviation",
      icon: "PLANE",
      description: "Boeing 747 wings generate over 400,000 lbs of lift at cruise.",
      details: "Commercial aircraft use complex flap systems with multiple segments. The 747 has leading edge flaps, triple-slotted trailing edge flaps, and spoilers for lift control.",
    },
    {
      title: "Formula 1 Racing",
      icon: "F1",
      description: "F1 cars use inverted wings to push the car DOWN onto the track.",
      details: "At 200 mph, an F1 car generates enough downforce to theoretically drive upside down on a ceiling. The wings are airfoils mounted upside down!",
    },
    {
      title: "Birds & Nature",
      icon: "BIRD",
      description: "Birds adjust their wing shape constantly during flight.",
      details: "Eagles can change their wing camber, area, and angle of attack in real-time. Owls have special feathers that reduce turbulence for silent flight.",
    },
    {
      title: "Wind Turbines",
      icon: "WIND",
      description: "Turbine blades are airfoils that convert wind to rotation.",
      details: "Modern wind turbine blades use the same lift principles - the pressure difference creates a force that spins the turbine to generate electricity.",
    }
  ];

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>

      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {applications.map((app, index) => (
          <button
            key={index}
            onClick={() => setActiveAppTab(index)}
            style={{ position: 'relative', zIndex: 10 }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppTab === index
                ? 'bg-cyan-600 text-white'
                : completedApps.has(index)
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.title.split(' ')[0]}
          </button>
        ))}
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{applications[activeAppTab].icon}</span>
          <h3 className="text-xl font-bold text-white">{applications[activeAppTab].title}</h3>
        </div>

        <p className="text-lg text-slate-300 mt-4 mb-3">
          {applications[activeAppTab].description}
        </p>
        <p className="text-sm text-slate-400">
          {applications[activeAppTab].details}
        </p>

        {!completedApps.has(activeAppTab) && (
          <button
            onClick={() => handleAppComplete(activeAppTab)}
            style={{ position: 'relative', zIndex: 10 }}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
          >
            Mark as Understood
          </button>
        )}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">
          {applications.map((_, i) => (
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
          onClick={() => onPhaseComplete?.()}
          style={{ position: 'relative', zIndex: 10 }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
        >
          Take the Knowledge Test
        </button>
      )}
    </div>
  );

  const renderTest = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Knowledge Assessment</h2>

      {!showTestResults ? (
        <div className="space-y-6 max-w-2xl w-full">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-white font-medium mb-3">
                {qIndex + 1}. {q.question}
              </p>
              <div className="grid gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onClick={() => handleTestAnswer(qIndex, oIndex)}
                    style={{ position: 'relative', zIndex: 10 }}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? 'bg-cyan-600 text-white'
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
            onClick={() => setShowTestResults(true)}
            style={{ position: 'relative', zIndex: 10 }}
            disabled={testAnswers.includes(-1)}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              testAnswers.includes(-1)
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500'
            }`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center">
          <div className="text-6xl mb-4">{calculateScore() >= 7 ? 'Success!' : 'Keep Learning'}</div>
          <h3 className="text-2xl font-bold text-white mb-2">
            Score: {calculateScore()}/10
          </h3>
          <p className="text-slate-300 mb-6">
            {calculateScore() >= 7
              ? 'Excellent! You\'ve mastered the physics of lift!'
              : 'Keep studying! Review the concepts and try again.'}
          </p>

          {calculateScore() >= 7 ? (
            <button
              onClick={() => { onCorrectAnswer?.(); onPhaseComplete?.(); }}
              style={{ position: 'relative', zIndex: 10 }}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
            >
              Claim Your Mastery Badge
            </button>
          ) : (
            <button
              onClick={() => { setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); onIncorrectAnswer?.(); }}
              style={{ position: 'relative', zIndex: 10 }}
              className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
            >
              Review & Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-cyan-900/50 via-blue-900/50 to-indigo-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">MASTERY</div>
        <h1 className="text-3xl font-bold text-white mb-4">Aerodynamics Master!</h1>
        <p className="text-xl text-slate-300 mb-6">
          You've mastered the physics of lift and aerodynamic forces!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">Lift</div>
            <p className="text-sm text-slate-300">L = 0.5*rho*v2*A*Cl</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">Airfoils</div>
            <p className="text-sm text-slate-300">Pressure Distribution</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">Stall</div>
            <p className="text-sm text-slate-300">Flow Separation</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">Control</div>
            <p className="text-sm text-slate-300">Flaps & Slats</p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => onPhaseComplete?.()}
            style={{ position: 'relative', zIndex: 10 }}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
          >
            Complete Game
          </button>
        </div>
      </div>
    </div>
  );

  const renderPhase = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Ambient background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="pt-8 pb-8 relative z-10">
        {renderPhase()}
      </div>
    </div>
  );
};

export default LiftForceRenderer;
