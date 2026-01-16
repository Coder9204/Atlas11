import React, { useState, useRef, useEffect } from 'react';

// GameEvent interface for AI coach integration
interface GameEvent {
  type: 'prediction' | 'observation' | 'phase_complete' | 'misconception' | 'mastery';
  phase: string;
  data: Record<string, unknown>;
  timestamp: number;
}

// Sound utility function
const playSound = (frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch (e) {
    console.log('Audio not available');
  }
};

// Phase types
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const isValidPhase = (phase: string): phase is Phase => {
  return ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'].includes(phase);
};

interface WingLiftRendererProps {
  onEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

const WingLiftRenderer: React.FC<WingLiftRendererProps> = ({ onEvent, gamePhase }) => {
  // Phase management
  const [phase, setPhase] = useState<Phase>('hook');

  // Hook phase
  const [hookStep, setHookStep] = useState(0);
  const [showAirflow, setShowAirflow] = useState(false);

  // Predict phase
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showPredictResult, setShowPredictResult] = useState(false);

  // Play phase - wing simulator
  const [angleOfAttack, setAngleOfAttack] = useState(5);
  const [airspeed, setAirspeed] = useState(50);
  const [showPressure, setShowPressure] = useState(true);
  const [liftHistory, setLiftHistory] = useState<{angle: number, lift: number}[]>([]);

  // Twist phase - stall
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistResult, setShowTwistResult] = useState(false);
  const [stallAngle, setStallAngle] = useState(5);
  const [isStalled, setIsStalled] = useState(false);

  // Transfer phase
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set([0]));

  // Test phase
  const [testAnswers, setTestAnswers] = useState<number[]>([]);
  const [showTestResults, setShowTestResults] = useState(false);

  // UI state
  const [isMobile, setIsMobile] = useState(false);
  const navigationLockRef = useRef(false);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize from gamePhase prop
  useEffect(() => {
    if (gamePhase && isValidPhase(gamePhase)) {
      setPhase(gamePhase);
    }
  }, [gamePhase]);

  // Check for stall in twist phase
  useEffect(() => {
    setIsStalled(stallAngle > 15);
  }, [stallAngle]);

  // Emit events
  const emitEvent = (type: GameEvent['type'], data: Record<string, unknown>) => {
    if (onEvent) {
      onEvent({ type, phase, data, timestamp: Date.now() });
    }
  };

  // Phase navigation
  const goToPhase = (newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    playSound(440, 0.15, 'sine', 0.2);
    setPhase(newPhase);
    emitEvent('phase_complete', { from: phase, to: newPhase });
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  };

  // Calculate lift coefficient (simplified model)
  const calculateLiftCoefficient = (angle: number): number => {
    // Lift increases roughly linearly until stall (~15 degrees)
    if (angle < 0) return angle * 0.05;
    if (angle <= 15) return angle * 0.1;
    // After stall, lift drops dramatically
    return 1.5 - (angle - 15) * 0.15;
  };

  // Calculate total lift force
  const calculateLift = (angle: number, speed: number): number => {
    const Cl = calculateLiftCoefficient(angle);
    const rho = 1.225; // air density
    const area = 20; // wing area m²
    // L = ½ρv²ClA
    return 0.5 * rho * Math.pow(speed, 2) * Cl * area;
  };

  // Record lift measurement
  const recordMeasurement = () => {
    const lift = calculateLift(angleOfAttack, airspeed);
    setLiftHistory(prev => [...prev, { angle: angleOfAttack, lift }]);
    playSound(500, 0.1, 'sine', 0.2);
  };

  // Test questions
  const testQuestions = [
    {
      question: "What is the PRIMARY reason wings generate lift?",
      options: ["Air travels farther over curved top", "Wing deflects air downward (Newton's 3rd law)", "Bernoulli effect alone", "Suction from low pressure"],
      correct: 1
    },
    {
      question: "A flat plate tilted into the wind can generate lift. Why?",
      options: ["Flat plates can't generate lift", "It still deflects air downward", "Bernoulli effect on flat surfaces", "Air pressure equalizes"],
      correct: 1
    },
    {
      question: "What is 'angle of attack'?",
      options: ["Angle of wing tilt on the plane", "Angle between wing and oncoming airflow", "Angle of aircraft nose", "Wing curvature angle"],
      correct: 1
    },
    {
      question: "Why does a wing stall at high angles of attack?",
      options: ["Too much lift breaks the wing", "Air can't follow the curved surface - separates", "Engine can't provide enough thrust", "Bernoulli effect reverses"],
      correct: 1
    },
    {
      question: "The 'equal transit time' theory (air meeting at trailing edge) is:",
      options: ["The main explanation for lift", "A useful approximation", "Completely false - air doesn't meet up", "Only true for symmetric wings"],
      correct: 2
    },
    {
      question: "To increase lift without changing speed, a pilot should:",
      options: ["Increase angle of attack (until near stall)", "Make the wing thinner", "Reduce air density", "Decrease wing area"],
      correct: 0
    },
    {
      question: "Why do planes need longer runways in hot weather?",
      options: ["Engines overheat and lose power", "Lower air density means less lift", "Hot tires have less grip", "Pilots react slower in heat"],
      correct: 1
    },
    {
      question: "Flaps extend during landing to:",
      options: ["Create more drag only", "Increase wing area and camber for more lift at low speed", "Reduce stall angle", "Cool the brakes"],
      correct: 1
    },
    {
      question: "An inverted (upside-down) plane can still fly because:",
      options: ["Special symmetric wings", "Adjusting angle of attack still deflects air", "Bernoulli works in reverse", "Impossible - planes can't fly inverted"],
      correct: 1
    },
    {
      question: "The lift equation L = ½ρv²C_L A shows that doubling speed:",
      options: ["Doubles lift", "Quadruples lift", "Halves lift", "No effect on lift"],
      correct: 1
    }
  ];

  // Real-world applications
  const applications = [
    {
      icon: "✈️",
      title: "Commercial Aviation",
      short: "Airliners",
      tagline: "Moving 4 billion passengers yearly",
      description: "Commercial aircraft wing design optimizes lift-to-drag ratio for fuel efficiency while ensuring safe operation across diverse conditions.",
      connection: "Understanding lift physics allows engineers to design wings that generate maximum lift with minimum drag, reducing fuel consumption by up to 15%.",
      howItWorks: "Modern wings use complex airfoil shapes, winglets, and variable geometry (flaps/slats) to optimize lift coefficient across takeoff, cruise, and landing phases.",
      stats: ["Boeing 787: 32:1 lift-to-drag", "Cruise lift: ~500,000 lbs", "Fuel savings: 20% vs older designs"],
      examples: ["Boeing 787 Dreamliner", "Airbus A350", "Regional jets", "Cargo aircraft"],
      companies: ["Boeing", "Airbus", "Embraer", "Bombardier"],
      futureImpact: "Next-gen wings with morphing surfaces and laminar flow control could improve efficiency by another 30%.",
      color: "#3B82F6"
    },
    {
      icon: "🏎️",
      title: "Race Car Aerodynamics",
      short: "Downforce",
      tagline: "Lift in reverse",
      description: "Formula 1 and sports cars use inverted wing profiles to push the car down, increasing tire grip for faster cornering.",
      connection: "Same physics as aircraft wings but inverted — deflecting air upward creates downforce instead of lift.",
      howItWorks: "Front and rear wings, floor tunnels, and diffusers work together to generate up to 3x the car's weight in downforce at high speed, allowing cornering at 5+ G.",
      stats: ["F1 downforce: 3.5× car weight", "Cornering: 5G lateral", "Top speed loss: 15% for grip gain"],
      examples: ["F1 cars", "Le Mans prototypes", "Supercars", "IndyCar"],
      companies: ["Ferrari", "Red Bull Racing", "McLaren", "Porsche"],
      futureImpact: "Active aero systems adjust wing angles in real-time for optimal downforce vs. drag balance.",
      color: "#EF4444"
    },
    {
      icon: "🦅",
      title: "Bird Flight",
      short: "Natural wings",
      tagline: "100 million years of R&D",
      description: "Birds evolved highly efficient wing designs with variable geometry, allowing everything from hovering to high-speed diving.",
      connection: "Bird wings change shape continuously — adjusting camber, area, and angle of attack for different flight phases.",
      howItWorks: "Feathers act as individual control surfaces. Birds can slot their primary feathers to reduce stall, adjust wing sweep, and create micro-vortices for efficiency.",
      stats: ["Albatross: 20:1 glide ratio", "Swift: 100+ km/h cruise", "Hummingbird: 80 wingbeats/sec"],
      examples: ["Soaring eagles", "Diving falcons", "Hovering hummingbirds", "Migrating geese"],
      companies: ["Biomimetics research", "Drone developers", "Nature documentarians"],
      futureImpact: "Biomimetic drones with bird-like adaptive wings could revolutionize small aircraft efficiency.",
      color: "#10B981"
    },
    {
      icon: "🚁",
      title: "Helicopter Rotors",
      short: "Spinning wings",
      tagline: "Wings that go in circles",
      description: "Helicopter blades are rotating wings that generate lift through the same aerodynamic principles, but with unique challenges.",
      connection: "Each rotor blade is an airfoil generating lift. By varying pitch (angle of attack), the helicopter controls lift direction.",
      howItWorks: "The rotor disc creates a pressure differential. Collective pitch changes overall lift; cyclic pitch tilts the rotor disc for directional flight. Retreating blade stall limits speed.",
      stats: ["Rotor tip: 400+ mph", "Blade loading: 50+ lb/ft²", "Max speed limited: ~250 mph"],
      examples: ["Military helicopters", "Medical evacuation", "News helicopters", "Heavy lift operations"],
      companies: ["Sikorsky", "Bell", "Airbus Helicopters", "Leonardo"],
      futureImpact: "Compound helicopters and eVTOL aircraft combine rotor lift with wing lift for higher speeds.",
      color: "#8B5CF6"
    }
  ];

  // Handle test answer
  const handleTestAnswer = (answer: number) => {
    playSound(300, 0.1, 'sine', 0.2);
    setTestAnswers(prev => [...prev, answer]);
  };

  // Calculate test score
  const calculateScore = (): number => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (answer === testQuestions[index].correct ? 1 : 0);
    }, 0);
  };

  // Premium color palette
  const colors = {
    background: '#0F0F1A',
    card: '#1A1A2E',
    primary: '#00D4FF',
    secondary: '#7B68EE',
    accent: '#FF6B6B',
    success: '#4ADE80',
    warning: '#FBBF24',
    text: '#FFFFFF',
    textSecondary: '#A0AEC0',
    lift: '#22D3EE'
  };

  // Helper render functions
  const renderProgressBar = () => {
    const phases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    const currentIndex = phases.indexOf(phase);

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '20px' }}>
        {phases.map((p, i) => (
          <div
            key={p}
            style={{
              height: '4px',
              flex: 1,
              borderRadius: '2px',
              background: i <= currentIndex ? `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})` : '#333',
              transition: 'all 0.3s ease'
            }}
          />
        ))}
      </div>
    );
  };

  const renderBottomBar = (onNext: () => void, disabled: boolean = false, label: string = "Continue") => (
    <div style={{
      marginTop: '24px',
      display: 'flex',
      justifyContent: 'flex-end',
      paddingTop: '16px',
      borderTop: `1px solid ${colors.card}`
    }}>
      <button
        onMouseDown={!disabled ? onNext : undefined}
        disabled={disabled}
        style={{
          padding: '14px 32px',
          fontSize: '16px',
          fontWeight: '600',
          border: 'none',
          borderRadius: '12px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: disabled ? '#333' : `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
          color: colors.text,
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s ease',
          transform: disabled ? 'none' : 'translateY(0)',
        }}
        onMouseEnter={(e) => {
          if (!disabled) e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        {label} →
      </button>
    </div>
  );

  const renderKeyTakeaway = (text: string) => (
    <div style={{
      padding: '16px 20px',
      background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`,
      borderLeft: `4px solid ${colors.primary}`,
      borderRadius: '0 12px 12px 0',
      marginTop: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span style={{ fontSize: '20px' }}>💡</span>
        <p style={{ margin: 0, color: colors.text, lineHeight: 1.6, fontSize: '15px' }}>{text}</p>
      </div>
    </div>
  );

  const renderSectionHeader = (emoji: string, title: string, subtitle?: string) => (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: subtitle ? '4px' : 0 }}>
        <span style={{ fontSize: '28px' }}>{emoji}</span>
        <h2 style={{ margin: 0, color: colors.text, fontSize: isMobile ? '22px' : '26px', fontWeight: '700' }}>{title}</h2>
      </div>
      {subtitle && (
        <p style={{ margin: 0, color: colors.textSecondary, fontSize: '14px', marginLeft: '44px' }}>{subtitle}</p>
      )}
    </div>
  );

  // Render wing airfoil SVG
  const renderWingSVG = (angle: number, showPressureField: boolean, width: number = 350, height: number = 200) => {
    const cx = width / 2;
    const cy = height / 2;
    const wingLength = 150;

    // Airfoil shape (NACA-like profile)
    const getAirfoilPath = (angle: number) => {
      const rad = (angle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      // Control points for airfoil shape
      const points = [
        { x: -wingLength/2, y: 0 },           // Leading edge
        { x: -wingLength/4, y: -15 },         // Upper front
        { x: wingLength/4, y: -8 },           // Upper rear
        { x: wingLength/2, y: 0 },            // Trailing edge
        { x: wingLength/4, y: 5 },            // Lower rear
        { x: -wingLength/4, y: 3 },           // Lower front
      ];

      // Rotate points
      const rotated = points.map(p => ({
        x: cx + p.x * cos - p.y * sin,
        y: cy + p.x * sin + p.y * cos
      }));

      return `M ${rotated[0].x} ${rotated[0].y}
              C ${rotated[1].x} ${rotated[1].y}, ${rotated[2].x} ${rotated[2].y}, ${rotated[3].x} ${rotated[3].y}
              C ${rotated[4].x} ${rotated[4].y}, ${rotated[5].x} ${rotated[5].y}, ${rotated[0].x} ${rotated[0].y}`;
    };

    // Streamlines
    const getStreamlines = (angle: number) => {
      const rad = (angle * Math.PI) / 180;
      const lines = [];

      for (let y = -60; y <= 60; y += 20) {
        const deflection = y < 0 ? -angle * 0.5 : angle * 0.3;
        lines.push({
          y1: cy + y,
          deflection,
          isAbove: y < 0
        });
      }
      return lines;
    };

    const Cl = calculateLiftCoefficient(angle);
    const lift = calculateLift(angle, airspeed);
    const isStallCondition = angle > 15;

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <marker id="flowArrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={colors.primary} opacity="0.6" />
          </marker>
          <marker id="liftArrow" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={colors.lift} />
          </marker>
          <linearGradient id="wingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#666" />
            <stop offset="50%" stopColor="#888" />
            <stop offset="100%" stopColor="#666" />
          </linearGradient>
        </defs>

        {/* Pressure field visualization */}
        {showPressureField && !isStallCondition && (
          <>
            {/* Low pressure above (blue) */}
            <ellipse
              cx={cx}
              cy={cy - 40}
              rx={80}
              ry={25}
              fill={colors.primary}
              opacity="0.15"
              transform={`rotate(${angle}, ${cx}, ${cy})`}
            />
            <text
              x={cx}
              y={cy - 50}
              fill={colors.primary}
              fontSize="11"
              textAnchor="middle"
              transform={`rotate(${angle}, ${cx}, ${cy})`}
            >
              Low Pressure
            </text>

            {/* High pressure below (red) */}
            <ellipse
              cx={cx}
              cy={cy + 35}
              rx={70}
              ry={20}
              fill={colors.accent}
              opacity="0.15"
              transform={`rotate(${angle}, ${cx}, ${cy})`}
            />
            <text
              x={cx}
              y={cy + 55}
              fill={colors.accent}
              fontSize="11"
              textAnchor="middle"
              transform={`rotate(${angle}, ${cx}, ${cy})`}
            >
              High Pressure
            </text>
          </>
        )}

        {/* Streamlines */}
        {getStreamlines(angle).map((line, i) => {
          const separation = isStallCondition && line.isAbove;
          return (
            <g key={i}>
              <path
                d={separation
                  ? `M 30 ${line.y1} Q ${cx - 30} ${line.y1 + line.deflection} ${cx} ${line.y1 + line.deflection - 10}
                     M ${cx + 20} ${line.y1 + line.deflection + 20} Q ${cx + 60} ${line.y1 + line.deflection + 30} ${width - 30} ${line.y1 + 10}`
                  : `M 30 ${line.y1} Q ${cx} ${line.y1 + line.deflection} ${width - 30} ${line.y1 + line.deflection * 0.5}`
                }
                fill="none"
                stroke={separation ? colors.accent : colors.primary}
                strokeWidth="1.5"
                opacity={separation ? "0.5" : "0.4"}
                strokeDasharray={separation ? "4,4" : "none"}
                markerEnd="url(#flowArrow)"
              />
            </g>
          );
        })}

        {/* Stall turbulence */}
        {isStallCondition && (
          <g>
            {Array.from({ length: 8 }).map((_, i) => {
              const x = cx + 30 + Math.random() * 60;
              const y = cy - 30 + Math.random() * 40;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={3 + Math.random() * 5}
                  fill="none"
                  stroke={colors.accent}
                  strokeWidth="1"
                  opacity="0.5"
                />
              );
            })}
            <text x={cx + 60} y={cy - 50} fill={colors.accent} fontSize="12" fontWeight="600">
              STALL!
            </text>
          </g>
        )}

        {/* Wing airfoil */}
        <path
          d={getAirfoilPath(angle)}
          fill="url(#wingGrad)"
          stroke="#444"
          strokeWidth="2"
        />

        {/* Lift vector */}
        {Cl > 0 && (
          <g>
            <line
              x1={cx}
              y1={cy}
              x2={cx}
              y2={cy - Math.min(Cl * 50, 80)}
              stroke={colors.lift}
              strokeWidth="3"
              markerEnd="url(#liftArrow)"
            />
            <text
              x={cx + 15}
              y={cy - 30}
              fill={colors.lift}
              fontSize="12"
              fontWeight="600"
            >
              Lift
            </text>
          </g>
        )}

        {/* Angle indicator */}
        <g transform={`translate(50, ${cy})`}>
          <line x1="0" y1="0" x2="40" y2="0" stroke={colors.textSecondary} strokeWidth="1" strokeDasharray="4,2" />
          <line
            x1="0"
            y1="0"
            x2={40 * Math.cos(-angle * Math.PI / 180)}
            y2={40 * Math.sin(-angle * Math.PI / 180)}
            stroke={colors.warning}
            strokeWidth="2"
          />
          <text x="45" y="4" fill={colors.warning} fontSize="11">{angle}°</text>
        </g>

        {/* Airspeed indicator */}
        <text x="20" y="20" fill={colors.textSecondary} fontSize="11">
          Airspeed: {airspeed} m/s
        </text>

        {/* Lift value */}
        <text x="20" y={height - 15} fill={colors.lift} fontSize="12" fontWeight="600">
          Lift: {lift.toFixed(0)} N {isStallCondition ? '(STALLED)' : ''}
        </text>
      </svg>
    );
  };

  // PHASE RENDERS

  // Hook Phase
  const renderHook = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("✈️", "How Planes Fly", "The real physics of lift")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        {hookStep === 0 && (
          <>
            <p style={{ color: colors.text, fontSize: '18px', lineHeight: 1.6, marginBottom: '24px' }}>
              A massive jet weighing 500,000 lbs floats through the sky.<br/>
              <span style={{ color: colors.primary }}>What invisible force holds it up?</span>
            </p>

            <svg width="300" height="180" viewBox="0 0 300 180" style={{ margin: '0 auto', display: 'block' }}>
              {/* Sky background */}
              <rect x="0" y="0" width="300" height="180" fill="#1a1a2e" />

              {/* Clouds */}
              <ellipse cx="50" cy="150" rx="30" ry="15" fill="#333" opacity="0.5" />
              <ellipse cx="250" cy="140" rx="40" ry="18" fill="#333" opacity="0.5" />

              {/* Simplified airplane */}
              <g transform="translate(150, 80)">
                {/* Fuselage */}
                <ellipse cx="0" cy="0" rx="60" ry="12" fill="#888" />
                {/* Wings */}
                <path d="M -20 0 L -80 20 L -80 25 L -10 5" fill="#666" />
                <path d="M -20 0 L -80 -20 L -80 -25 L -10 -5" fill="#666" />
                {/* Tail */}
                <path d="M 50 0 L 70 -20 L 65 -20 L 55 0" fill="#666" />
                {/* Cockpit */}
                <ellipse cx="-50" cy="0" rx="15" ry="10" fill="#4a90d9" opacity="0.6" />
              </g>

              {/* Airflow lines */}
              {showAirflow && (
                <>
                  {[-40, -20, 0, 20, 40].map((y, i) => (
                    <path
                      key={i}
                      d={`M 20 ${80 + y} Q 150 ${80 + y * 0.5} 280 ${90 + y * 0.3}`}
                      fill="none"
                      stroke={colors.primary}
                      strokeWidth="1.5"
                      opacity="0.5"
                    />
                  ))}
                  {/* Lift arrow */}
                  <line x1="150" y1="80" x2="150" y2="30" stroke={colors.lift} strokeWidth="3" />
                  <polygon points="150,25 145,35 155,35" fill={colors.lift} />
                  <text x="160" y="40" fill={colors.lift} fontSize="12" fontWeight="600">Lift</text>
                </>
              )}

              {/* Weight arrow */}
              <line x1="150" y1="100" x2="150" y2="140" stroke={colors.accent} strokeWidth="2" strokeDasharray="4,2" />
              <text x="160" y="135" fill={colors.accent} fontSize="11">Weight</text>
            </svg>

            <button
              onMouseDown={() => {
                setShowAirflow(true);
                playSound(400, 0.3, 'sine', 0.3);
              }}
              style={{
                marginTop: '16px',
                padding: '12px 28px',
                fontSize: '16px',
                background: `linear-gradient(135deg, ${colors.lift}, ${colors.secondary})`,
                color: colors.text,
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
            >
              🌊 Show Airflow
            </button>

            {showAirflow && (
              <button
                onMouseDown={() => setHookStep(1)}
                style={{
                  marginTop: '16px',
                  marginLeft: '12px',
                  padding: '12px 24px',
                  background: colors.primary,
                  color: colors.background,
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Continue →
              </button>
            )}
          </>
        )}

        {hookStep === 1 && (
          <>
            <p style={{ color: colors.text, fontSize: '20px', lineHeight: 1.6, marginBottom: '20px' }}>
              🤔 You may have heard: <em>"Air travels farther over the curved top, so it speeds up..."</em>
            </p>
            <div style={{
              background: `${colors.accent}20`,
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '16px',
              border: `1px solid ${colors.accent}50`
            }}>
              <p style={{ color: colors.accent, fontSize: '16px', margin: 0 }}>
                ⚠️ This "equal transit time" explanation is <strong>a myth!</strong>
              </p>
            </div>
            <p style={{ color: colors.textSecondary, fontSize: '16px', lineHeight: 1.6, marginBottom: '20px' }}>
              Air molecules don't know they need to "meet up" at the trailing edge.<br/>
              The real answer involves <span style={{ color: colors.primary }}>Newton's Third Law</span>.
            </p>

            {renderKeyTakeaway("Wings generate lift primarily by deflecting air downward. Push air down → air pushes wing up!")}
          </>
        )}
      </div>

      {hookStep === 1 && renderBottomBar(() => goToPhase('predict'))}
    </div>
  );

  // Predict Phase
  const renderPredict = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("🔮", "Make a Prediction", "What matters most for lift?")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px'
      }}>
        <p style={{ color: colors.text, fontSize: '17px', lineHeight: 1.6, marginBottom: '24px' }}>
          A pilot wants to generate more lift without going faster.<br/>
          What should they do?
        </p>

        <svg width="100%" height="140" viewBox="0 0 400 140" style={{ marginBottom: '20px' }}>
          {/* Flat wing */}
          <g transform="translate(100, 70)">
            <line x1="-50" y1="0" x2="50" y2="0" stroke="#888" strokeWidth="6" />
            <text y="30" fill={colors.textSecondary} fontSize="12" textAnchor="middle">Level wing</text>
          </g>
          {/* Tilted wing */}
          <g transform="translate(300, 70) rotate(-10)">
            <line x1="-50" y1="0" x2="50" y2="0" stroke="#888" strokeWidth="6" />
            <text y="40" fill={colors.primary} fontSize="12" textAnchor="middle" transform="rotate(10)">Tilted up?</text>
          </g>
          <text x="200" y="70" fill={colors.textSecondary} fontSize="14" textAnchor="middle">→</text>
        </svg>

        <p style={{ color: colors.text, fontSize: '18px', fontWeight: '600', marginBottom: '16px', textAlign: 'center' }}>
          What's the most effective way to increase lift?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { value: 'angle', label: 'Increase angle of attack (tilt wing into airflow)', color: colors.primary },
            { value: 'curve', label: 'Make the wing more curved on top', color: colors.secondary },
            { value: 'area', label: 'Make the wing bigger', color: colors.success },
            { value: 'smooth', label: 'Make the wing smoother', color: colors.warning }
          ].map(option => (
            <button
              key={option.value}
              onMouseDown={() => {
                setPrediction(option.value);
                playSound(330, 0.1, 'sine', 0.2);
                emitEvent('prediction', { predicted: option.value, question: 'increase_lift' });
              }}
              style={{
                padding: '16px 20px',
                fontSize: '15px',
                background: prediction === option.value ? `${option.color}20` : colors.background,
                color: prediction === option.value ? option.color : colors.textSecondary,
                border: `2px solid ${prediction === option.value ? option.color : '#333'}`,
                borderRadius: '12px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        {prediction && !showPredictResult && (
          <button
            onMouseDown={() => {
              setShowPredictResult(true);
              playSound(prediction === 'angle' ? 600 : 300, 0.3, 'sine', 0.3);
            }}
            style={{
              marginTop: '20px',
              padding: '14px 28px',
              width: '100%',
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
              color: colors.text,
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            Lock In Prediction
          </button>
        )}

        {showPredictResult && (
          <div style={{
            marginTop: '20px',
            padding: '20px',
            background: prediction === 'angle' ? `${colors.success}20` : `${colors.primary}20`,
            borderRadius: '12px',
            border: `2px solid ${prediction === 'angle' ? colors.success : colors.primary}`
          }}>
            {prediction === 'angle' ? (
              <>
                <p style={{ color: colors.success, fontSize: '18px', fontWeight: '600', margin: '0 0 12px 0' }}>
                  ✓ Exactly right!
                </p>
                <p style={{ color: colors.text, margin: 0, lineHeight: 1.6 }}>
                  Increasing angle of attack is the pilot's primary control for lift. It deflects more air downward!
                </p>
              </>
            ) : (
              <>
                <p style={{ color: colors.primary, fontSize: '18px', fontWeight: '600', margin: '0 0 12px 0' }}>
                  Good thought, but there's a better answer!
                </p>
                <p style={{ color: colors.text, margin: 0, lineHeight: 1.6 }}>
                  While {prediction === 'curve' ? 'camber' : prediction === 'area' ? 'wing area' : 'smoothness'} matters,
                  the quickest way to change lift is <strong>angle of attack</strong> — how steeply the wing meets the air.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {showPredictResult && renderBottomBar(() => goToPhase('play'))}
    </div>
  );

  // Play Phase
  const renderPlay = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("🎮", "Wing Simulator", "Adjust angle of attack and see lift change")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        {/* Wing visualization */}
        <div style={{ background: colors.background, borderRadius: '12px', padding: '10px', marginBottom: '16px' }}>
          {renderWingSVG(angleOfAttack, showPressure)}
        </div>

        {/* Controls */}
        <div style={{ display: 'grid', gap: '16px' }}>
          {/* Angle of attack slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: colors.text, fontSize: '14px', fontWeight: '600' }}>Angle of Attack</span>
              <span style={{ color: colors.warning, fontSize: '14px' }}>{angleOfAttack}°</span>
            </div>
            <input
              type="range"
              min="-5"
              max="25"
              value={angleOfAttack}
              onChange={(e) => setAngleOfAttack(Number(e.target.value))}
              style={{ width: '100%', accentColor: colors.warning }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textSecondary }}>
              <span>-5°</span>
              <span style={{ color: colors.accent }}>Stall zone →</span>
              <span>25°</span>
            </div>
          </div>

          {/* Airspeed slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: colors.text, fontSize: '14px', fontWeight: '600' }}>Airspeed</span>
              <span style={{ color: colors.primary, fontSize: '14px' }}>{airspeed} m/s</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              value={airspeed}
              onChange={(e) => setAirspeed(Number(e.target.value))}
              style={{ width: '100%', accentColor: colors.primary }}
            />
          </div>

          {/* Toggle pressure field */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onMouseDown={() => setShowPressure(!showPressure)}
              style={{
                padding: '8px 16px',
                background: showPressure ? colors.primary : colors.background,
                color: showPressure ? colors.background : colors.textSecondary,
                border: `1px solid ${showPressure ? colors.primary : '#444'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              {showPressure ? '✓' : '○'} Show Pressure Fields
            </button>

            <button
              onMouseDown={recordMeasurement}
              style={{
                padding: '8px 16px',
                background: `linear-gradient(135deg, ${colors.lift}, ${colors.secondary})`,
                color: colors.text,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600'
              }}
            >
              📊 Record Measurement
            </button>
          </div>
        </div>

        {/* Measurement history */}
        {liftHistory.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <p style={{ color: colors.text, fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Measurements:</p>
            <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
              {liftHistory.map((m, i) => (
                <div key={i} style={{
                  padding: '6px 12px',
                  background: colors.background,
                  borderRadius: '6px',
                  fontSize: '12px'
                }}>
                  <span style={{ color: colors.warning }}>{m.angle}°</span>
                  <span style={{ color: colors.textSecondary }}> → </span>
                  <span style={{ color: colors.lift }}>{m.lift.toFixed(0)}N</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lift equation */}
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: colors.background,
          borderRadius: '12px',
          border: `1px solid ${colors.lift}30`
        }}>
          <p style={{ color: colors.lift, fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0' }}>
            Lift Equation:
          </p>
          <p style={{ color: colors.text, fontSize: '16px', fontFamily: 'monospace', margin: '0 0 8px 0' }}>
            L = ½ρv²C<sub>L</sub>A
          </p>
          <p style={{ color: colors.textSecondary, fontSize: '12px', margin: 0 }}>
            ρ = air density | v = velocity | C<sub>L</sub> = lift coefficient (depends on angle) | A = wing area
          </p>
        </div>
      </div>

      {renderKeyTakeaway("Lift increases with angle of attack until stall (~15°). Doubling speed quadruples lift (v² relationship)!")}

      {liftHistory.length >= 3 && renderBottomBar(() => goToPhase('review'))}
    </div>
  );

  // Review Phase
  const renderReview = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("📚", "How Wings Really Work", "The complete picture")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'grid', gap: '16px' }}>
          {[
            {
              title: "1. Newton's Third Law (Primary)",
              text: "Wing deflects air downward → air pushes wing upward. This is the fundamental cause of lift!",
              color: colors.success,
              icon: "⬇️⬆️"
            },
            {
              title: "2. Pressure Difference",
              text: "Curved upper surface + angle creates faster airflow on top → lower pressure above wing.",
              color: colors.primary,
              icon: "📊"
            },
            {
              title: "3. Angle of Attack",
              text: "Tilting the wing increases deflection AND pressure difference. Main pilot control for lift.",
              color: colors.warning,
              icon: "📐"
            },
            {
              title: "4. Circulation Theory",
              text: "Air circulates around the wing, adding to top-surface velocity — mathematically complete explanation.",
              color: colors.secondary,
              icon: "🔄"
            }
          ].map((item, i) => (
            <div key={i} style={{
              padding: '16px',
              background: `${item.color}10`,
              borderRadius: '12px',
              borderLeft: `4px solid ${item.color}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '20px' }}>{item.icon}</span>
                <p style={{ color: item.color, fontWeight: '600', margin: 0, fontSize: '15px' }}>
                  {item.title}
                </p>
              </div>
              <p style={{ color: colors.textSecondary, margin: 0, fontSize: '14px', lineHeight: 1.5, paddingLeft: '30px' }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>

        {/* Myth busting */}
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: `${colors.accent}15`,
          borderRadius: '12px',
          border: `1px solid ${colors.accent}30`
        }}>
          <p style={{ color: colors.accent, fontWeight: '600', margin: '0 0 8px 0', fontSize: '15px' }}>
            ❌ Common Misconception: "Equal Transit Time"
          </p>
          <p style={{ color: colors.textSecondary, margin: 0, fontSize: '14px', lineHeight: 1.6 }}>
            The idea that air must "meet up" at the trailing edge is FALSE. Air actually travels <em>faster</em> over the top than "equal transit time" would predict.
            Flat plates can generate lift too — no curve needed!
          </p>
        </div>

        {renderKeyTakeaway("Wings generate lift by deflecting air downward (Newton) and creating pressure differences (Bernoulli). Both views are correct and complementary!")}
      </div>

      {renderBottomBar(() => goToPhase('twist_predict'))}
    </div>
  );

  // Twist Predict Phase
  const renderTwistPredict = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("🔄", "Stall!", "When lift suddenly fails")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px'
      }}>
        <p style={{ color: colors.text, fontSize: '17px', lineHeight: 1.6, marginBottom: '24px' }}>
          A pilot keeps increasing angle of attack for more lift.<br/>
          At some point, something dramatic happens...
        </p>

        <svg width="100%" height="120" viewBox="0 0 400 120">
          {/* Wing at high angle */}
          <g transform="translate(200, 60) rotate(-20)">
            <path
              d="M -60 0 C -40 -15, 40 -8, 60 0 C 40 5, -40 3, -60 0"
              fill="#888"
              stroke="#666"
              strokeWidth="2"
            />
          </g>

          {/* Separated flow */}
          <path
            d="M 80 50 Q 150 30 200 25 M 210 35 Q 240 50 280 60"
            fill="none"
            stroke={colors.accent}
            strokeWidth="2"
            strokeDasharray="5,3"
          />

          {/* Turbulent region */}
          {[0, 1, 2, 3, 4].map(i => (
            <circle
              key={i}
              cx={220 + i * 15}
              cy={40 + Math.sin(i) * 10}
              r={4}
              fill="none"
              stroke={colors.accent}
              strokeWidth="1"
            />
          ))}

          <text x="250" y="90" fill={colors.accent} fontSize="14" fontWeight="600">Stall!</text>
        </svg>

        <p style={{ color: colors.text, fontSize: '18px', fontWeight: '600', marginBottom: '16px', textAlign: 'center' }}>
          What happens during a stall?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { value: 'sudden', label: 'Lift suddenly drops — airflow separates from wing', color: colors.accent },
            { value: 'gradual', label: 'Lift gradually decreases — smooth transition', color: colors.primary },
            { value: 'reverse', label: 'Lift reverses — wing pushes down', color: colors.secondary },
            { value: 'nothing', label: 'Nothing special — lift just levels off', color: colors.warning }
          ].map(option => (
            <button
              key={option.value}
              onMouseDown={() => {
                setTwistPrediction(option.value);
                playSound(330, 0.1, 'sine', 0.2);
              }}
              style={{
                padding: '14px 18px',
                fontSize: '14px',
                background: twistPrediction === option.value ? `${option.color}20` : colors.background,
                color: twistPrediction === option.value ? option.color : colors.textSecondary,
                border: `2px solid ${twistPrediction === option.value ? option.color : '#333'}`,
                borderRadius: '10px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        {twistPrediction && !showTwistResult && (
          <button
            onMouseDown={() => {
              setShowTwistResult(true);
              playSound(twistPrediction === 'sudden' ? 600 : 300, 0.3, 'sine', 0.3);
            }}
            style={{
              marginTop: '20px',
              padding: '14px 28px',
              width: '100%',
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
              color: colors.text,
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            Lock In Prediction
          </button>
        )}

        {showTwistResult && (
          <div style={{
            marginTop: '20px',
            padding: '20px',
            background: twistPrediction === 'sudden' ? `${colors.success}20` : `${colors.accent}20`,
            borderRadius: '12px',
            border: `2px solid ${twistPrediction === 'sudden' ? colors.success : colors.accent}`
          }}>
            {twistPrediction === 'sudden' ? (
              <p style={{ color: colors.success, margin: 0 }}>
                <strong>✓ Correct!</strong> Stall is sudden and dangerous. At critical angle (~15°), airflow can't follow the wing's curve — it separates, creating turbulence and dramatic lift loss!
              </p>
            ) : (
              <p style={{ color: colors.accent, margin: 0 }}>
                <strong>Not quite!</strong> Stall is actually sudden and dramatic. The airflow separates from the wing surface, causing an abrupt loss of lift. This is why stalls are dangerous!
              </p>
            )}
          </div>
        )}
      </div>

      {showTwistResult && renderBottomBar(() => goToPhase('twist_play'))}
    </div>
  );

  // Twist Play Phase
  const renderTwistPlay = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("🎮", "Stall Simulator", "Find the critical angle")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        {/* Stall visualization */}
        <div style={{ background: colors.background, borderRadius: '12px', padding: '10px', marginBottom: '16px' }}>
          {renderWingSVG(stallAngle, true, 350, 200)}
        </div>

        {/* Angle slider */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: colors.text, fontSize: '14px', fontWeight: '600' }}>Angle of Attack</span>
            <span style={{ color: isStalled ? colors.accent : colors.warning, fontSize: '14px', fontWeight: '600' }}>
              {stallAngle}° {isStalled ? '— STALLED!' : ''}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="25"
            value={stallAngle}
            onChange={(e) => {
              const newAngle = Number(e.target.value);
              setStallAngle(newAngle);
              if (newAngle > 15 && stallAngle <= 15) {
                playSound(200, 0.5, 'sawtooth', 0.3);
              }
            }}
            style={{ width: '100%', accentColor: isStalled ? colors.accent : colors.warning }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textSecondary }}>
            <span>0°</span>
            <span style={{ color: colors.accent }}>← Critical angle (~15°) →</span>
            <span>25°</span>
          </div>
        </div>

        {/* Lift vs Angle chart */}
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: colors.background,
          borderRadius: '12px'
        }}>
          <p style={{ color: colors.text, fontSize: '14px', fontWeight: '600', margin: '0 0 12px 0' }}>
            Lift Coefficient vs Angle:
          </p>
          <svg width="100%" height="120" viewBox="0 0 300 120">
            {/* Axes */}
            <line x1="40" y1="100" x2="280" y2="100" stroke={colors.textSecondary} strokeWidth="1" />
            <line x1="40" y1="100" x2="40" y2="20" stroke={colors.textSecondary} strokeWidth="1" />

            {/* Labels */}
            <text x="160" y="115" fill={colors.textSecondary} fontSize="10" textAnchor="middle">Angle of Attack</text>
            <text x="20" y="60" fill={colors.textSecondary} fontSize="10" textAnchor="middle" transform="rotate(-90, 20, 60)">C_L</text>

            {/* Lift curve */}
            <path
              d="M 40 100 L 40 100 Q 100 50 160 30 L 180 35 Q 220 45 260 70"
              fill="none"
              stroke={colors.lift}
              strokeWidth="2"
            />

            {/* Stall region */}
            <rect x="160" y="20" width="100" height="80" fill={colors.accent} opacity="0.1" />
            <text x="210" y="90" fill={colors.accent} fontSize="9">Stall region</text>

            {/* Current position marker */}
            <circle
              cx={40 + (stallAngle / 25) * 240}
              cy={isStalled ? 50 + (stallAngle - 15) * 3 : 100 - stallAngle * 4.5}
              r="5"
              fill={isStalled ? colors.accent : colors.success}
            />

            {/* Critical angle line */}
            <line x1="160" y1="20" x2="160" y2="100" stroke={colors.accent} strokeWidth="1" strokeDasharray="4,2" />
            <text x="160" y="15" fill={colors.accent} fontSize="9" textAnchor="middle">15°</text>
          </svg>
        </div>

        {/* Stall explanation */}
        {isStalled && (
          <div style={{
            marginTop: '16px',
            padding: '16px',
            background: `${colors.accent}15`,
            borderRadius: '12px',
            border: `1px solid ${colors.accent}30`
          }}>
            <p style={{ color: colors.accent, fontWeight: '600', margin: '0 0 8px 0' }}>
              ⚠️ Flow Separation!
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              At high angles, air can't follow the wing's curve. It separates, creating turbulent eddies.
              Lift plummets while drag spikes. This is why pilots must avoid stalling!
            </p>
          </div>
        )}
      </div>

      {renderKeyTakeaway("Stall occurs when airflow separates from the wing (~15° angle). Lift suddenly drops — a critical danger in aviation!")}

      {renderBottomBar(() => goToPhase('twist_review'))}
    </div>
  );

  // Twist Review Phase
  const renderTwistReview = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("🔬", "Stall Recovery", "Understanding the danger")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'grid', gap: '16px' }}>
          <div style={{
            padding: '20px',
            background: colors.background,
            borderRadius: '12px'
          }}>
            <p style={{ color: colors.accent, fontWeight: '600', margin: '0 0 8px 0' }}>
              ⚠️ Why Stalls Are Dangerous
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              Stalls often happen during slow flight (takeoff/landing) when there's little altitude to recover.
              The sudden lift loss can cause the aircraft to drop rapidly.
            </p>
          </div>

          <div style={{
            padding: '20px',
            background: colors.background,
            borderRadius: '12px'
          }}>
            <p style={{ color: colors.success, fontWeight: '600', margin: '0 0 8px 0' }}>
              ✓ Stall Recovery
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              To recover: push the nose DOWN (reduce angle of attack), add power, and let airspeed build.
              Counterintuitively, you must point down to go up!
            </p>
          </div>

          <div style={{
            padding: '20px',
            background: colors.background,
            borderRadius: '12px'
          }}>
            <p style={{ color: colors.primary, fontWeight: '600', margin: '0 0 8px 0' }}>
              🛡️ Stall Prevention Features
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              Modern aircraft have: stick shakers (vibration warning), stick pushers (automatic nose-down),
              and slats/flaps that delay stall to higher angles.
            </p>
          </div>
        </div>

        {renderKeyTakeaway("Stall recovery requires reducing angle of attack — even if that means pointing the nose down to regain airflow over the wings.")}
      </div>

      {renderBottomBar(() => goToPhase('transfer'))}
    </div>
  );

  // Transfer Phase
  const renderTransfer = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("🌍", "Lift Physics Everywhere", "From planes to race cars")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        {/* App navigation */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          overflowX: 'auto',
          paddingBottom: '8px'
        }}>
          {applications.map((app, i) => (
            <button
              key={i}
              onMouseDown={() => {
                if (completedApps.has(i)) {
                  setActiveApp(i);
                  playSound(400 + i * 50, 0.1, 'sine', 0.2);
                }
              }}
              style={{
                padding: '10px 16px',
                background: activeApp === i ? app.color : completedApps.has(i) ? colors.background : '#1a1a1a',
                color: activeApp === i ? '#fff' : completedApps.has(i) ? app.color : '#444',
                border: `2px solid ${completedApps.has(i) ? app.color : '#333'}`,
                borderRadius: '10px',
                cursor: completedApps.has(i) ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap',
                fontSize: '14px',
                fontWeight: activeApp === i ? '600' : '400',
                opacity: completedApps.has(i) ? 1 : 0.5
              }}
            >
              {app.icon} {app.short}
            </button>
          ))}
        </div>

        {/* Active application content */}
        {(() => {
          const app = applications[activeApp];
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '36px' }}>{app.icon}</span>
                <div>
                  <h3 style={{ margin: 0, color: app.color, fontSize: '22px' }}>{app.title}</h3>
                  <p style={{ margin: 0, color: colors.textSecondary, fontSize: '14px' }}>{app.tagline}</p>
                </div>
              </div>

              <p style={{ color: colors.text, fontSize: '15px', lineHeight: 1.6, marginBottom: '16px' }}>
                {app.description}
              </p>

              <div style={{
                padding: '16px',
                background: `${app.color}15`,
                borderRadius: '12px',
                marginBottom: '16px'
              }}>
                <p style={{ color: app.color, fontWeight: '600', margin: '0 0 8px 0', fontSize: '14px' }}>
                  🔗 Physics Connection:
                </p>
                <p style={{ color: colors.textSecondary, margin: 0, fontSize: '14px', lineHeight: 1.5 }}>
                  {app.connection}
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ color: colors.text, fontWeight: '600', margin: '0 0 8px 0', fontSize: '14px' }}>
                  ⚙️ How It Works:
                </p>
                <p style={{ color: colors.textSecondary, margin: 0, fontSize: '14px', lineHeight: 1.6 }}>
                  {app.howItWorks}
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ padding: '12px', background: colors.background, borderRadius: '10px' }}>
                  <p style={{ color: app.color, fontWeight: '600', margin: '0 0 6px 0', fontSize: '13px' }}>📊 Key Stats:</p>
                  <ul style={{ margin: 0, paddingLeft: '16px', color: colors.textSecondary, fontSize: '12px' }}>
                    {app.stats.map((stat, i) => <li key={i}>{stat}</li>)}
                  </ul>
                </div>

                <div style={{ padding: '12px', background: colors.background, borderRadius: '10px' }}>
                  <p style={{ color: app.color, fontWeight: '600', margin: '0 0 6px 0', fontSize: '13px' }}>💡 Examples:</p>
                  <ul style={{ margin: 0, paddingLeft: '16px', color: colors.textSecondary, fontSize: '12px' }}>
                    {app.examples.slice(0, 3).map((ex, i) => <li key={i}>{ex}</li>)}
                  </ul>
                </div>
              </div>

              <div style={{
                padding: '14px',
                background: colors.background,
                borderRadius: '10px',
                borderLeft: `4px solid ${app.color}`
              }}>
                <p style={{ color: colors.text, fontWeight: '600', margin: '0 0 4px 0', fontSize: '13px' }}>
                  🔮 Future Impact:
                </p>
                <p style={{ color: colors.textSecondary, margin: 0, fontSize: '13px', lineHeight: 1.5 }}>
                  {app.futureImpact}
                </p>
              </div>
            </div>
          );
        })()}

        {/* Next app button */}
        {activeApp < applications.length - 1 && (
          <button
            onMouseDown={() => {
              const next = activeApp + 1;
              setCompletedApps(prev => new Set([...prev, next]));
              setActiveApp(next);
              playSound(500, 0.15, 'sine', 0.2);
            }}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              width: '100%',
              background: `linear-gradient(135deg, ${applications[activeApp + 1].color}, ${colors.secondary})`,
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600'
            }}
          >
            Next: {applications[activeApp + 1].icon} {applications[activeApp + 1].title} →
          </button>
        )}
      </div>

      {completedApps.size === applications.length && renderBottomBar(() => goToPhase('test'))}
    </div>
  );

  // Test Phase
  const renderTest = () => {
    const currentQuestion = testAnswers.length;
    const isComplete = currentQuestion >= testQuestions.length;

    return (
      <div style={{ padding: isMobile ? '16px' : '24px' }}>
        {renderProgressBar()}
        {renderSectionHeader("📝", "Knowledge Check", `Question ${Math.min(currentQuestion + 1, testQuestions.length)} of ${testQuestions.length}`)}

        <div style={{
          background: colors.card,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px'
        }}>
          {!isComplete && !showTestResults ? (
            <>
              <p style={{
                color: colors.text,
                fontSize: '17px',
                lineHeight: 1.6,
                marginBottom: '24px'
              }}>
                {testQuestions[currentQuestion].question}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {testQuestions[currentQuestion].options.map((option, i) => (
                  <button
                    key={i}
                    onMouseDown={() => handleTestAnswer(i)}
                    style={{
                      padding: '14px 18px',
                      fontSize: '14px',
                      background: colors.background,
                      color: colors.text,
                      border: `2px solid #333`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = colors.primary;
                      e.currentTarget.style.background = `${colors.primary}10`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#333';
                      e.currentTarget.style.background = colors.background;
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {/* Progress dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
                {testQuestions.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: i < currentQuestion
                        ? (testAnswers[i] === testQuestions[i].correct ? colors.success : colors.accent)
                        : i === currentQuestion
                          ? colors.primary
                          : '#333'
                    }}
                  />
                ))}
              </div>
            </>
          ) : !showTestResults ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: colors.text, fontSize: '18px', marginBottom: '20px' }}>
                Test complete! Ready to see your results?
              </p>
              <button
                onMouseDown={() => {
                  setShowTestResults(true);
                  playSound(600, 0.3, 'sine', 0.3);
                }}
                style={{
                  padding: '14px 32px',
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                  color: colors.text,
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                Show Results
              </button>
            </div>
          ) : (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{
                  fontSize: '48px',
                  fontWeight: '700',
                  color: calculateScore() >= 7 ? colors.success : calculateScore() >= 5 ? colors.warning : colors.accent
                }}>
                  {calculateScore()}/{testQuestions.length}
                </div>
                <p style={{ color: colors.textSecondary, margin: 0 }}>
                  {calculateScore() >= 8 ? "Aerodynamics Expert!" :
                   calculateScore() >= 6 ? "Good understanding!" :
                   "Keep studying lift physics!"}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {testQuestions.map((q, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '14px',
                      background: colors.background,
                      borderRadius: '10px',
                      borderLeft: `4px solid ${testAnswers[i] === q.correct ? colors.success : colors.accent}`
                    }}
                  >
                    <p style={{ color: colors.text, margin: '0 0 8px 0', fontSize: '13px', fontWeight: '500' }}>
                      {i + 1}. {q.question}
                    </p>
                    <p style={{
                      color: testAnswers[i] === q.correct ? colors.success : colors.accent,
                      margin: '0 0 4px 0',
                      fontSize: '12px'
                    }}>
                      Your answer: {q.options[testAnswers[i]]}
                      {testAnswers[i] === q.correct ? ' ✓' : ` ✗ (Correct: ${q.options[q.correct]})`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {showTestResults && renderBottomBar(() => goToPhase('mastery'), false, "Complete Journey")}
      </div>
    );
  };

  // Mastery Phase
  const renderMastery = () => {
    const score = calculateScore();

    return (
      <div style={{ padding: isMobile ? '16px' : '24px' }}>
        {renderProgressBar()}

        <div style={{
          background: `linear-gradient(135deg, ${colors.lift}20, ${colors.secondary}20)`,
          borderRadius: '20px',
          padding: '32px',
          textAlign: 'center',
          marginBottom: '20px',
          border: `2px solid ${colors.lift}50`,
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Confetti effect */}
          {score >= 7 && Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: '10px',
                height: '10px',
                background: [colors.primary, colors.secondary, colors.accent, colors.success, colors.lift][i % 5],
                borderRadius: i % 2 === 0 ? '50%' : '2px',
                left: `${Math.random() * 100}%`,
                top: '-20px',
                animation: `fall ${2 + Math.random() * 2}s linear infinite`,
                animationDelay: `${Math.random() * 2}s`,
                opacity: 0.8
              }}
            />
          ))}

          <div style={{ fontSize: '64px', marginBottom: '16px' }}>✈️🎓</div>

          <h2 style={{ color: colors.text, margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700' }}>
            Certified Aerodynamicist!
          </h2>

          <p style={{ color: colors.textSecondary, margin: '0 0 24px 0', fontSize: '16px' }}>
            You've mastered the real physics of how wings generate lift
          </p>

          <div style={{
            display: 'inline-block',
            padding: '16px 32px',
            background: colors.card,
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <div style={{ color: colors.lift, fontSize: '36px', fontWeight: '700' }}>
              {score}/{testQuestions.length}
            </div>
            <div style={{ color: colors.textSecondary, fontSize: '14px' }}>Final Score</div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: '16px',
            textAlign: 'left'
          }}>
            {[
              { icon: "⬇️", title: "Newton's 3rd", text: "Deflect air down → lift up" },
              { icon: "📐", title: "Angle of Attack", text: "Primary pilot lift control" },
              { icon: "⚠️", title: "Stall", text: "Flow separation = sudden lift loss" }
            ].map((item, i) => (
              <div key={i} style={{
                padding: '16px',
                background: colors.card,
                borderRadius: '12px'
              }}>
                <span style={{ fontSize: '24px' }}>{item.icon}</span>
                <p style={{ color: colors.text, fontWeight: '600', margin: '8px 0 4px 0', fontSize: '14px' }}>
                  {item.title}
                </p>
                <p style={{ color: colors.textSecondary, margin: 0, fontSize: '12px' }}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          @keyframes fall {
            to {
              transform: translateY(500px) rotate(360deg);
              opacity: 0;
            }
          }
        `}</style>

        {renderKeyTakeaway("Wings generate lift by deflecting air and creating pressure differences — now you understand the physics that keeps millions of people aloft every day!")}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            ✈️ From commercial aviation to racing downforce, lift physics shapes our world of motion!
          </p>
        </div>
      </div>
    );
  };

  // Main render
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
    <div style={{
      minHeight: '100vh',
      background: colors.background,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: isMobile ? '8px' : '16px'
      }}>
        {renderPhase()}
      </div>
    </div>
  );
};

export default WingLiftRenderer;
