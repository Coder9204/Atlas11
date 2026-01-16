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

interface SiphonRendererProps {
  onEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

const SiphonRenderer: React.FC<SiphonRendererProps> = ({ onEvent, gamePhase }) => {
  // Phase management
  const [phase, setPhase] = useState<Phase>('hook');

  // Hook phase
  const [hookStep, setHookStep] = useState(0);
  const [showSiphonFlow, setShowSiphonFlow] = useState(false);

  // Predict phase
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showPredictResult, setShowPredictResult] = useState(false);

  // Play phase - siphon simulator
  const [upperTankHeight, setUpperTankHeight] = useState(80);
  const [lowerTankHeight, setLowerTankHeight] = useState(30);
  const [siphonPrimed, setSiphonPrimed] = useState(false);
  const [waterLevel, setWaterLevel] = useState(100);
  const [flowRate, setFlowRate] = useState(0);
  const animationRef = useRef<number>();

  // Twist phase - max height
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistResult, setShowTwistResult] = useState(false);
  const [apexHeight, setApexHeight] = useState(5);
  const [vacuumMode, setVacuumMode] = useState(false);

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

  // Siphon flow animation
  useEffect(() => {
    if (!siphonPrimed || waterLevel <= 0) {
      setFlowRate(0);
      return;
    }

    const heightDiff = upperTankHeight - lowerTankHeight;
    if (heightDiff <= 0) {
      setFlowRate(0);
      return;
    }

    // Flow rate proportional to sqrt of height difference
    const rate = Math.sqrt(heightDiff) * 0.5;
    setFlowRate(rate);

    const animate = () => {
      setWaterLevel(prev => {
        const newLevel = prev - rate * 0.1;
        if (newLevel <= 0) {
          setSiphonPrimed(false);
          return 0;
        }
        return newLevel;
      });
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [siphonPrimed, upperTankHeight, lowerTankHeight, waterLevel]);

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

  // Prime the siphon
  const primeSiphon = () => {
    if (waterLevel <= 0) return;
    setSiphonPrimed(true);
    playSound(200, 0.5, 'sine', 0.3);
  };

  // Reset siphon
  const resetSiphon = () => {
    setSiphonPrimed(false);
    setWaterLevel(100);
    setFlowRate(0);
  };

  // Check if apex is too high (siphon breaks)
  const siphonWorks = (apex: number, inVacuum: boolean): boolean => {
    // In normal atmosphere, max ~10.3m
    // In vacuum, siphon doesn't work at all (no atmospheric pressure)
    if (inVacuum) return false;
    return apex <= 10;
  };

  // Test questions
  const testQuestions = [
    {
      question: "What drives water flow through a siphon?",
      options: ["Suction from the tube", "Gravity pulling the water chain", "Atmospheric pressure difference", "Capillary action"],
      correct: 2
    },
    {
      question: "To start a siphon, you must first:",
      options: ["Create a vacuum in the tube", "Fill the tube with liquid (prime it)", "Heat the water", "Seal both ends"],
      correct: 1
    },
    {
      question: "Where does the water exit need to be relative to the source?",
      options: ["Above the source", "At the same level", "Below the source surface", "Position doesn't matter"],
      correct: 2
    },
    {
      question: "What is the maximum height water can be siphoned over at sea level?",
      options: ["Any height", "About 10 meters", "About 1 meter", "About 100 meters"],
      correct: 1
    },
    {
      question: "Why does a siphon FAIL in a perfect vacuum?",
      options: ["Water freezes", "No atmospheric pressure to push water up", "Gravity doesn't work", "Water evaporates"],
      correct: 1
    },
    {
      question: "If an air bubble enters a working siphon, what happens?",
      options: ["Flow increases", "Nothing changes", "Flow stops (siphon breaks)", "Bubble dissolves"],
      correct: 2
    },
    {
      question: "Why does siphon flow rate increase with greater height difference?",
      options: ["More suction", "Greater pressure differential", "Wider tube", "Hotter water"],
      correct: 1
    },
    {
      question: "Ancient Romans used siphons for:",
      options: ["Making wine only", "Aqueducts crossing valleys", "Heating baths", "Weapons"],
      correct: 1
    },
    {
      question: "A gasoline siphon stops working when:",
      options: ["Gas runs out or outlet rises above inlet", "Temperature drops", "It gets too fast", "The tube is too long horizontally"],
      correct: 0
    },
    {
      question: "The scientific principle behind siphons is best explained by:",
      options: ["Bernoulli only", "Atmospheric pressure pushing, gravity pulling", "Surface tension", "Cohesion only"],
      correct: 1
    }
  ];

  // Real-world applications
  const applications = [
    {
      icon: "🏛️",
      title: "Roman Aqueducts",
      short: "Ancient engineering",
      tagline: "Crossing valleys without pumps",
      description: "Romans used inverted siphons to carry water across valleys, allowing aqueducts to maintain flow without continuous downhill slope.",
      connection: "When an aqueduct encountered a valley, a siphon (called an 'inverted siphon') carried water down and back up the other side.",
      howItWorks: "Water entering the high side creates pressure that pushes water up the other side. The inlet must be higher than the outlet for continuous flow.",
      stats: ["Longest Roman siphon: 3km", "Max depth: 120m below grade", "Pressure: up to 12 atm"],
      examples: ["Pont du Gard approach", "Aspendos aqueduct", "Lyon's Roman aqueducts", "Constantinople water system"],
      companies: ["Historical engineering", "Archaeological studies", "Modern civil engineering"],
      futureImpact: "Understanding ancient siphon engineering informs modern gravity-fed water systems in developing regions.",
      color: "#8B4513"
    },
    {
      icon: "⛽",
      title: "Fuel Transfer",
      short: "Gas siphoning",
      tagline: "Moving liquids without pumps",
      description: "Siphons enable gravity-powered fuel transfer between tanks, useful in emergencies, agriculture, and marine applications.",
      connection: "Starting the siphon (priming) and maintaining the height differential allows continuous fuel flow without electrical power.",
      howItWorks: "A primed tube connects a higher tank to a lower container. Atmospheric pressure on the source pushes fuel through while gravity pulls it down.",
      stats: ["Flow rate: 1-5 L/min typical", "No power required", "Self-priming pumps exist"],
      examples: ["Emergency fuel transfer", "Boat fuel tanks", "Farm equipment", "Automotive repair"],
      companies: ["Scepter", "Hopkins", "Shaker Siphon", "GasTapper"],
      futureImpact: "Safety siphons with one-way valves prevent accidental ingestion — a major improvement over mouth-starting.",
      color: "#F59E0B"
    },
    {
      icon: "🐟",
      title: "Aquarium Maintenance",
      short: "Water changes",
      tagline: "Cleaning without disturbance",
      description: "Aquarium siphons (gravel vacuums) use the siphon principle to remove debris and perform water changes without stressing fish.",
      connection: "The siphon creates gentle suction at the gravel level while draining water to a bucket below the tank.",
      howItWorks: "The wide intake tube stirs gravel while the narrow hose drains water. Height difference between tank and bucket controls flow rate.",
      stats: ["Typical change: 10-25% weekly", "Flow: adjustable by pinching", "No electricity needed"],
      examples: ["Python water changer", "Gravel vacuums", "Breeding tank cleaning", "Pond maintenance"],
      companies: ["Python", "Aqueon", "Marina", "Lee's"],
      futureImpact: "Battery-powered siphon starters make aquarium maintenance easier without the traditional mouth-priming method.",
      color: "#06B6D4"
    },
    {
      icon: "🏥",
      title: "Medical Drainage",
      short: "Surgical drains",
      tagline: "Gravity-assisted healing",
      description: "Medical siphon drains use gravity and pressure differentials to remove fluid from wounds, cavities, and surgical sites.",
      connection: "Positioning the collection bag below the wound creates a siphon effect that continuously drains accumulated fluids.",
      howItWorks: "A tube from the wound site connects to a collection bag placed lower than the patient. Gravity and tissue pressure drive drainage.",
      stats: ["Drain rates: 10-500 mL/day", "Duration: days to weeks", "Prevents infection buildup"],
      examples: ["Jackson-Pratt drains", "Chest tubes", "Wound VAC systems", "Urinary catheters"],
      companies: ["Cardinal Health", "Medela", "Teleflex", "Cook Medical"],
      futureImpact: "Smart drains with sensors monitor output and alert clinicians to complications automatically.",
      color: "#EF4444"
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
    water: '#3B82F6'
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

  // PHASE RENDERS

  // Hook Phase
  const renderHook = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("🪣", "Water Uphill?", "The magic of siphons")}

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
              Water always flows downhill, right?<br/>
              Yet with a simple tube, you can make water flow <span style={{ color: colors.water }}>UP and over</span> an obstacle!
            </p>

            <svg width="320" height="200" viewBox="0 0 320 200" style={{ margin: '0 auto', display: 'block' }}>
              {/* Upper tank */}
              <rect x="30" y="60" width="80" height="80" rx="5" fill="#333" stroke="#444" strokeWidth="2" />
              <rect x="35" y="70" width="70" height={showSiphonFlow ? 50 : 65} fill={colors.water} opacity="0.7" />
              <text x="70" y="55" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Source</text>

              {/* Lower tank */}
              <rect x="210" y="120" width="80" height="60" rx="5" fill="#333" stroke="#444" strokeWidth="2" />
              <rect x="215" y={showSiphonFlow ? 140 : 165} width="70" height={showSiphonFlow ? 35 : 10} fill={colors.water} opacity="0.7" />
              <text x="250" y="115" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Destination</text>

              {/* Siphon tube */}
              <path
                d="M 100 80 Q 100 30 160 30 Q 220 30 220 80 L 220 130"
                fill="none"
                stroke="#666"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <path
                d="M 100 80 Q 100 30 160 30 Q 220 30 220 80 L 220 130"
                fill="none"
                stroke="#888"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* Water in tube when flowing */}
              {showSiphonFlow && (
                <>
                  <path
                    d="M 100 80 Q 100 30 160 30 Q 220 30 220 80 L 220 130"
                    fill="none"
                    stroke={colors.water}
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.8"
                  />
                  {/* Flow droplets */}
                  <circle cx="220" cy="145" r="4" fill={colors.water}>
                    <animate attributeName="cy" values="130;155" dur="0.5s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="220" cy="135" r="3" fill={colors.water}>
                    <animate attributeName="cy" values="130;155" dur="0.5s" begin="0.25s" repeatCount="indefinite" />
                  </circle>
                </>
              )}

              {/* Apex label */}
              <text x="160" y="20" fill={colors.primary} fontSize="10" textAnchor="middle">↑ Apex (highest point)</text>

              {/* Height difference arrow */}
              <line x1="280" y1="80" x2="280" y2="140" stroke={colors.warning} strokeWidth="2" />
              <polygon points="280,80 275,90 285,90" fill={colors.warning} />
              <polygon points="280,140 275,130 285,130" fill={colors.warning} />
              <text x="295" y="115" fill={colors.warning} fontSize="10">Δh</text>
            </svg>

            <button
              onMouseDown={() => {
                setShowSiphonFlow(true);
                playSound(300, 0.5, 'sine', 0.3);
              }}
              style={{
                marginTop: '16px',
                padding: '12px 28px',
                fontSize: '16px',
                background: `linear-gradient(135deg, ${colors.water}, ${colors.secondary})`,
                color: colors.text,
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
            >
              💧 Start Siphon
            </button>

            {showSiphonFlow && (
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
              🤔 How does water flow <span style={{ color: colors.primary }}>UP</span> that tube?
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '16px', lineHeight: 1.6, marginBottom: '20px' }}>
              There's no pump. No motor. Just a tube full of water connecting two containers.
            </p>
            <div style={{
              background: colors.background,
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '16px'
            }}>
              <p style={{ color: colors.water, fontSize: '18px', margin: 0 }}>
                The atmosphere is doing the pushing!<br/>
                <span style={{ fontSize: '14px', color: colors.textSecondary }}>
                  101,325 Pascals of air pressure — enough to push water 10 meters high!
                </span>
              </p>
            </div>

            {renderKeyTakeaway("Siphons work because atmospheric pressure pushes water up into the tube, while gravity pulls it down the other side. No pumping required!")}
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
      {renderSectionHeader("🔮", "Make a Prediction", "What happens if...?")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px'
      }}>
        <p style={{ color: colors.text, fontSize: '17px', lineHeight: 1.6, marginBottom: '24px' }}>
          A siphon is flowing steadily. You raise the outlet end so it's now <span style={{ color: colors.accent }}>higher than the water surface</span> in the source tank.
        </p>

        <svg width="100%" height="150" viewBox="0 0 400 150" style={{ marginBottom: '20px' }}>
          {/* Before */}
          <g transform="translate(50, 0)">
            <text x="60" y="15" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Before</text>
            <rect x="20" y="50" width="60" height="60" fill="#333" rx="3" />
            <rect x="23" y="60" width="54" height="47" fill={colors.water} opacity="0.6" />
            <path d="M 75 70 Q 75 35 100 35 Q 125 35 125 70 L 125 100" fill="none" stroke="#666" strokeWidth="4" />
            <circle cx="125" cy="105" r="4" fill={colors.water}>
              <animate attributeName="cy" values="100;115" dur="0.4s" repeatCount="indefinite" />
            </circle>
            <line x1="90" y1="60" x2="130" y2="60" stroke={colors.warning} strokeWidth="1" strokeDasharray="3,2" />
            <text x="140" y="63" fill={colors.warning} fontSize="9">Water level</text>
          </g>

          {/* After */}
          <g transform="translate(220, 0)">
            <text x="60" y="15" fill={colors.textSecondary} fontSize="11" textAnchor="middle">After</text>
            <rect x="20" y="50" width="60" height="60" fill="#333" rx="3" />
            <rect x="23" y="60" width="54" height="47" fill={colors.water} opacity="0.6" />
            <path d="M 75 70 Q 75 35 100 35 Q 125 35 125 50" fill="none" stroke="#666" strokeWidth="4" />
            <text x="145" y="60" fill={colors.accent} fontSize="10">Outlet raised!</text>
            <line x1="90" y1="60" x2="130" y2="60" stroke={colors.warning} strokeWidth="1" strokeDasharray="3,2" />
            <text x="125" y="45" fill={colors.accent} fontSize="18">?</text>
          </g>
        </svg>

        <p style={{ color: colors.text, fontSize: '18px', fontWeight: '600', marginBottom: '16px', textAlign: 'center' }}>
          What happens to the siphon?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { value: 'stops', label: 'Flow stops — outlet must be below source', color: colors.success },
            { value: 'reverse', label: 'Flow reverses — water goes back into source', color: colors.primary },
            { value: 'continues', label: 'Flow continues — momentum keeps it going', color: colors.warning },
            { value: 'faster', label: 'Flow increases — suction pulls harder', color: colors.accent }
          ].map(option => (
            <button
              key={option.value}
              onMouseDown={() => {
                setPrediction(option.value);
                playSound(330, 0.1, 'sine', 0.2);
                emitEvent('prediction', { predicted: option.value, question: 'outlet_raised' });
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
              playSound(prediction === 'stops' ? 600 : 300, 0.3, 'sine', 0.3);
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
            background: prediction === 'stops' ? `${colors.success}20` : `${colors.primary}20`,
            borderRadius: '12px',
            border: `2px solid ${prediction === 'stops' ? colors.success : colors.primary}`
          }}>
            {prediction === 'stops' ? (
              <>
                <p style={{ color: colors.success, fontSize: '18px', fontWeight: '600', margin: '0 0 12px 0' }}>
                  ✓ Correct!
                </p>
                <p style={{ color: colors.text, margin: 0, lineHeight: 1.6 }}>
                  A siphon only works when the outlet is below the source water surface. Once they're equal or reversed, flow stops!
                </p>
              </>
            ) : (
              <>
                <p style={{ color: colors.primary, fontSize: '18px', fontWeight: '600', margin: '0 0 12px 0' }}>
                  Good thinking, but flow stops!
                </p>
                <p style={{ color: colors.text, margin: 0, lineHeight: 1.6 }}>
                  A siphon requires the outlet to be lower than the source surface. When you raise the outlet above, there's no pressure differential to drive flow.
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
  const renderPlay = () => {
    const heightDiff = upperTankHeight - lowerTankHeight;
    const canFlow = heightDiff > 0 && siphonPrimed && waterLevel > 0;

    return (
      <div style={{ padding: isMobile ? '16px' : '24px' }}>
        {renderProgressBar()}
        {renderSectionHeader("🎮", "Siphon Simulator", "Control the height difference")}

        <div style={{
          background: colors.card,
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          {/* Siphon visualization */}
          <div style={{ background: colors.background, borderRadius: '12px', padding: '10px', marginBottom: '16px' }}>
            <svg width="100%" height="220" viewBox="0 0 400 220">
              {/* Height scale */}
              <line x1="20" y1="30" x2="20" y2="200" stroke="#444" strokeWidth="1" />
              {[0, 25, 50, 75, 100].map(h => (
                <g key={h}>
                  <line x1="15" y1={200 - h * 1.5} x2="25" y2={200 - h * 1.5} stroke="#444" strokeWidth="1" />
                  <text x="10" y={205 - h * 1.5} fill={colors.textSecondary} fontSize="8" textAnchor="end">{h}</text>
                </g>
              ))}
              <text x="12" y="20" fill={colors.textSecondary} fontSize="9" textAnchor="middle">Height</text>

              {/* Upper tank */}
              <g transform={`translate(80, ${200 - upperTankHeight - 50})`}>
                <rect x="0" y="0" width="70" height="50" rx="3" fill="#333" stroke="#444" strokeWidth="2" />
                <rect x="3" y={50 - waterLevel * 0.45} width="64" height={waterLevel * 0.45} fill={colors.water} opacity="0.7" />
                <text x="35" y="-8" fill={colors.textSecondary} fontSize="10" textAnchor="middle">Source Tank</text>
                <text x="35" y={waterLevel > 50 ? 20 : 60} fill={colors.text} fontSize="9" textAnchor="middle">{waterLevel.toFixed(0)}%</text>
              </g>

              {/* Lower tank */}
              <g transform={`translate(250, ${200 - lowerTankHeight - 40})`}>
                <rect x="0" y="0" width="70" height="40" rx="3" fill="#333" stroke="#444" strokeWidth="2" />
                <rect x="3" y={40 - (100 - waterLevel) * 0.35} width="64" height={Math.max(0, (100 - waterLevel) * 0.35)} fill={colors.water} opacity="0.7" />
                <text x="35" y="-8" fill={colors.textSecondary} fontSize="10" textAnchor="middle">Destination</text>
              </g>

              {/* Siphon tube */}
              {(() => {
                const sourceY = 200 - upperTankHeight - 25;
                const destY = 200 - lowerTankHeight - 20;
                const apexY = Math.min(sourceY, destY) - 40;

                return (
                  <>
                    <path
                      d={`M 145 ${sourceY} Q 145 ${apexY} 200 ${apexY} Q 255 ${apexY} 255 ${destY}`}
                      fill="none"
                      stroke="#666"
                      strokeWidth="10"
                      strokeLinecap="round"
                    />
                    <path
                      d={`M 145 ${sourceY} Q 145 ${apexY} 200 ${apexY} Q 255 ${apexY} 255 ${destY}`}
                      fill="none"
                      stroke={canFlow ? colors.water : '#444'}
                      strokeWidth="6"
                      strokeLinecap="round"
                      opacity={canFlow ? 0.8 : 0.3}
                    />
                    {/* Flow animation */}
                    {canFlow && (
                      <circle r="4" fill={colors.water}>
                        <animateMotion
                          dur={`${2 / Math.max(0.5, flowRate)}s`}
                          repeatCount="indefinite"
                          path={`M 145 ${sourceY} Q 145 ${apexY} 200 ${apexY} Q 255 ${apexY} 255 ${destY + 15}`}
                        />
                      </circle>
                    )}
                  </>
                );
              })()}

              {/* Height difference indicator */}
              {heightDiff !== 0 && (
                <g transform="translate(350, 100)">
                  <text x="0" y="0" fill={heightDiff > 0 ? colors.success : colors.accent} fontSize="11" textAnchor="middle">
                    Δh = {heightDiff > 0 ? '+' : ''}{heightDiff}
                  </text>
                  <text x="0" y="15" fill={colors.textSecondary} fontSize="9" textAnchor="middle">
                    {heightDiff > 0 ? 'Will flow ✓' : 'No flow ✗'}
                  </text>
                </g>
              )}

              {/* Flow rate display */}
              {canFlow && (
                <text x="200" y="210" fill={colors.water} fontSize="12" textAnchor="middle" fontWeight="600">
                  Flow rate: {flowRate.toFixed(1)} units/s
                </text>
              )}
            </svg>
          </div>

          {/* Controls */}
          <div style={{ display: 'grid', gap: '16px' }}>
            {/* Upper tank height */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: colors.text, fontSize: '14px', fontWeight: '600' }}>Source Height</span>
                <span style={{ color: colors.water, fontSize: '14px' }}>{upperTankHeight}</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={upperTankHeight}
                onChange={(e) => setUpperTankHeight(Number(e.target.value))}
                style={{ width: '100%', accentColor: colors.water }}
              />
            </div>

            {/* Lower tank height */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: colors.text, fontSize: '14px', fontWeight: '600' }}>Destination Height</span>
                <span style={{ color: colors.secondary, fontSize: '14px' }}>{lowerTankHeight}</span>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                value={lowerTankHeight}
                onChange={(e) => setLowerTankHeight(Number(e.target.value))}
                style={{ width: '100%', accentColor: colors.secondary }}
              />
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onMouseDown={primeSiphon}
                disabled={siphonPrimed || waterLevel <= 0 || heightDiff <= 0}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: siphonPrimed || waterLevel <= 0 || heightDiff <= 0 ? '#333' : `linear-gradient(135deg, ${colors.water}, ${colors.secondary})`,
                  color: colors.text,
                  border: 'none',
                  borderRadius: '10px',
                  cursor: siphonPrimed || waterLevel <= 0 || heightDiff <= 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  opacity: siphonPrimed || waterLevel <= 0 || heightDiff <= 0 ? 0.5 : 1
                }}
              >
                {siphonPrimed ? '✓ Flowing' : '💧 Prime Siphon'}
              </button>

              <button
                onMouseDown={resetSiphon}
                style={{
                  padding: '12px 20px',
                  background: 'transparent',
                  color: colors.textSecondary,
                  border: `1px solid ${colors.textSecondary}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Status message */}
          {heightDiff <= 0 && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: `${colors.accent}15`,
              borderRadius: '10px',
              border: `1px solid ${colors.accent}30`
            }}>
              <p style={{ color: colors.accent, margin: 0, fontSize: '14px' }}>
                ⚠️ Destination must be lower than source for siphon to work!
              </p>
            </div>
          )}

          {/* Physics note */}
          <div style={{
            marginTop: '16px',
            padding: '16px',
            background: colors.background,
            borderRadius: '12px',
            border: `1px solid ${colors.water}30`
          }}>
            <p style={{ color: colors.water, fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0' }}>
              Flow rate ∝ √(height difference)
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>
              Greater height difference = higher pressure differential = faster flow
            </p>
          </div>
        </div>

        {renderKeyTakeaway("Siphon flow requires: 1) Primed tube (full of liquid), 2) Outlet below source surface. Flow rate depends on height difference!")}

        {renderBottomBar(() => goToPhase('review'))}
      </div>
    );
  };

  // Review Phase
  const renderReview = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("📚", "How Siphons Work", "The complete physics")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'grid', gap: '16px' }}>
          {[
            {
              title: "1. Atmospheric Pressure",
              text: "Air pressure (101 kPa at sea level) pushes down on the source water surface, forcing water up into the tube.",
              color: colors.primary,
              icon: "⬇️"
            },
            {
              title: "2. Gravity Pull",
              text: "Water in the downward leg is pulled by gravity. This creates a pressure drop at the apex, driving continuous flow.",
              color: colors.success,
              icon: "⬇️"
            },
            {
              title: "3. Continuous Chain",
              text: "The liquid column acts as a chain — water entering at the top is 'pulled' by water falling out the bottom.",
              color: colors.water,
              icon: "🔗"
            },
            {
              title: "4. Height Requirement",
              text: "Outlet must be below source surface. The flow rate depends on this height difference (Torricelli's law).",
              color: colors.warning,
              icon: "📏"
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

        {/* Pressure diagram */}
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: colors.background,
          borderRadius: '12px'
        }}>
          <p style={{ color: colors.text, fontWeight: '600', margin: '0 0 12px 0', textAlign: 'center' }}>
            Pressure Along the Siphon
          </p>
          <svg width="100%" height="100" viewBox="0 0 400 100">
            {/* Siphon profile */}
            <path d="M 50 70 Q 50 30 150 30 Q 250 30 250 50 L 350 80" fill="none" stroke={colors.water} strokeWidth="3" />

            {/* Pressure labels */}
            <circle cx="50" cy="70" r="5" fill={colors.accent} />
            <text x="50" y="90" fill={colors.accent} fontSize="10" textAnchor="middle">P_atm + ρgh</text>

            <circle cx="150" cy="30" r="5" fill={colors.warning} />
            <text x="150" y="15" fill={colors.warning} fontSize="10" textAnchor="middle">P_low (apex)</text>

            <circle cx="350" cy="80" r="5" fill={colors.success} />
            <text x="350" y="95" fill={colors.success} fontSize="10" textAnchor="middle">P_atm</text>

            {/* Flow arrow */}
            <line x1="100" y1="50" x2="300" y2="65" stroke={colors.primary} strokeWidth="2" markerEnd="url(#flowArrow)" />
          </svg>
        </div>

        {renderKeyTakeaway("A siphon is driven by atmospheric pressure pushing water into the tube and gravity pulling it out — creating continuous flow without any pump!")}
      </div>

      {renderBottomBar(() => goToPhase('twist_predict'))}
    </div>
  );

  // Twist Predict Phase
  const renderTwistPredict = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("🔄", "The Height Limit", "How high can a siphon go?")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px'
      }}>
        <p style={{ color: colors.text, fontSize: '17px', lineHeight: 1.6, marginBottom: '24px' }}>
          You want to siphon water over a very tall wall. If the apex of the siphon tube gets too high...
        </p>

        <svg width="100%" height="140" viewBox="0 0 400 140" style={{ marginBottom: '20px' }}>
          {/* Wall */}
          <rect x="175" y="20" width="50" height="120" fill="#555" />
          <text x="200" y="85" fill={colors.textSecondary} fontSize="10" textAnchor="middle" transform="rotate(-90, 200, 85)">TALL WALL</text>

          {/* Source */}
          <rect x="40" y="90" width="50" height="40" fill="#333" rx="3" />
          <rect x="43" y="95" width="44" height="32" fill={colors.water} opacity="0.6" />

          {/* Destination */}
          <rect x="310" y="100" width="50" height="30" fill="#333" rx="3" />

          {/* Very high siphon */}
          <path d="M 85 100 Q 85 10 200 10 Q 315 10 315 105" fill="none" stroke="#888" strokeWidth="4" strokeDasharray="5,3" />

          {/* Height markers */}
          <line x1="380" y1="100" x2="380" y2="10" stroke={colors.accent} strokeWidth="1" />
          <text x="390" y="55" fill={colors.accent} fontSize="10">?? m</text>
        </svg>

        <p style={{ color: colors.text, fontSize: '18px', fontWeight: '600', marginBottom: '16px', textAlign: 'center' }}>
          Is there a maximum height for siphoning water?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { value: 'unlimited', label: 'No limit — siphons work at any height', color: colors.primary },
            { value: '10m', label: 'About 10 meters — then water "breaks"', color: colors.success },
            { value: '100m', label: 'About 100 meters — very high', color: colors.secondary },
            { value: '1m', label: 'Only about 1 meter — very limited', color: colors.warning }
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
              playSound(twistPrediction === '10m' ? 600 : 300, 0.3, 'sine', 0.3);
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
            background: twistPrediction === '10m' ? `${colors.success}20` : `${colors.accent}20`,
            borderRadius: '12px',
            border: `2px solid ${twistPrediction === '10m' ? colors.success : colors.accent}`
          }}>
            {twistPrediction === '10m' ? (
              <p style={{ color: colors.success, margin: 0 }}>
                <strong>✓ Exactly right!</strong> At about 10.3 meters, atmospheric pressure can no longer support the water column. The water "breaks" and the siphon fails — this is why barometers use ~10m water columns!
              </p>
            ) : (
              <p style={{ color: colors.accent, margin: 0 }}>
                <strong>Interesting guess!</strong> The limit is actually about 10 meters. At this height, atmospheric pressure (101 kPa) equals the weight of the water column (ρgh). Above this, a vacuum forms and the siphon breaks!
              </p>
            )}
          </div>
        )}
      </div>

      {showTwistResult && renderBottomBar(() => goToPhase('twist_play'))}
    </div>
  );

  // Twist Play Phase
  const renderTwistPlay = () => {
    const works = siphonWorks(apexHeight, vacuumMode);

    return (
      <div style={{ padding: isMobile ? '16px' : '24px' }}>
        {renderProgressBar()}
        {renderSectionHeader("🎮", "Height Limit Lab", "Find the breaking point")}

        <div style={{
          background: colors.card,
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          {/* Visualization */}
          <div style={{ background: colors.background, borderRadius: '12px', padding: '10px', marginBottom: '16px' }}>
            <svg width="100%" height="200" viewBox="0 0 400 200">
              {/* Height scale */}
              <line x1="30" y1="180" x2="30" y2="20" stroke="#444" strokeWidth="1" />
              {[0, 5, 10, 15, 20].map(h => (
                <g key={h}>
                  <line x1="25" y1={180 - h * 8} x2="35" y2={180 - h * 8} stroke="#444" strokeWidth="1" />
                  <text x="20" y={183 - h * 8} fill={colors.textSecondary} fontSize="9" textAnchor="end">{h}m</text>
                </g>
              ))}

              {/* Critical line at 10m */}
              <line x1="35" y1={180 - 10 * 8} x2="380" y2={180 - 10 * 8} stroke={colors.accent} strokeWidth="1" strokeDasharray="5,3" />
              <text x="385" y={183 - 10 * 8} fill={colors.accent} fontSize="9">Max ≈ 10.3m</text>

              {/* Ground/water level */}
              <rect x="50" y="160" width="100" height="30" fill="#333" rx="3" />
              <rect x="55" y="165" width="90" height="20" fill={colors.water} opacity="0.6" />
              <text x="100" y="155" fill={colors.textSecondary} fontSize="10" textAnchor="middle">Source</text>

              {/* Siphon tube with variable apex */}
              <path
                d={`M 145 165 Q 145 ${180 - apexHeight * 8} 200 ${180 - apexHeight * 8} Q 255 ${180 - apexHeight * 8} 255 175`}
                fill="none"
                stroke={works ? colors.water : colors.accent}
                strokeWidth="6"
                opacity={works ? 0.8 : 0.4}
              />

              {/* Destination */}
              <rect x="250" y="170" width="80" height="25" fill="#333" rx="3" />

              {/* Status at apex */}
              <g transform={`translate(200, ${175 - apexHeight * 8})`}>
                <circle r="10" fill={works ? colors.success : colors.accent} opacity="0.3" />
                <text y="4" fill={works ? colors.success : colors.accent} fontSize="14" textAnchor="middle">
                  {works ? '✓' : '✗'}
                </text>
              </g>

              {/* Apex height label */}
              <text x="200" y={160 - apexHeight * 8} fill={colors.text} fontSize="11" textAnchor="middle" fontWeight="600">
                {apexHeight}m apex
              </text>

              {/* Vacuum indicator */}
              {vacuumMode && (
                <g transform="translate(300, 50)">
                  <rect x="-30" y="-15" width="60" height="30" rx="5" fill={colors.secondary} opacity="0.3" />
                  <text y="5" fill={colors.secondary} fontSize="11" textAnchor="middle">VACUUM</text>
                </g>
              )}

              {/* Bubble if broken */}
              {!works && !vacuumMode && (
                <g transform={`translate(200, ${180 - apexHeight * 8})`}>
                  <circle r="8" fill="#fff" opacity="0.5" />
                  <text y="25" fill={colors.accent} fontSize="9" textAnchor="middle">Vapor bubble!</text>
                </g>
              )}
            </svg>
          </div>

          {/* Controls */}
          <div style={{ display: 'grid', gap: '16px' }}>
            {/* Apex height slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: colors.text, fontSize: '14px', fontWeight: '600' }}>Siphon Apex Height</span>
                <span style={{ color: works ? colors.success : colors.accent, fontSize: '14px' }}>{apexHeight} meters</span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                value={apexHeight}
                onChange={(e) => setApexHeight(Number(e.target.value))}
                style={{ width: '100%', accentColor: works ? colors.success : colors.accent }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: colors.textSecondary }}>
                <span>1m</span>
                <span style={{ color: colors.accent }}>← Limit ~10m →</span>
                <span>15m</span>
              </div>
            </div>

            {/* Vacuum mode toggle */}
            <button
              onMouseDown={() => setVacuumMode(!vacuumMode)}
              style={{
                padding: '12px 16px',
                background: vacuumMode ? colors.secondary : colors.background,
                color: vacuumMode ? colors.background : colors.textSecondary,
                border: `1px solid ${vacuumMode ? colors.secondary : '#444'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {vacuumMode ? '✓ In Vacuum (no atmosphere)' : '○ In Vacuum (no atmosphere)'}
            </button>
          </div>

          {/* Explanation */}
          <div style={{
            marginTop: '16px',
            padding: '16px',
            background: works ? `${colors.success}15` : `${colors.accent}15`,
            borderRadius: '12px',
            border: `1px solid ${works ? colors.success : colors.accent}30`
          }}>
            {vacuumMode ? (
              <p style={{ color: colors.secondary, margin: 0, fontSize: '14px' }}>
                <strong>In a vacuum:</strong> No atmospheric pressure to push water up! Siphons CANNOT work in vacuum at any height. This proves that "chain tension" alone isn't enough — we need the atmosphere.
              </p>
            ) : works ? (
              <p style={{ color: colors.success, margin: 0, fontSize: '14px' }}>
                <strong>Siphon works!</strong> Atmospheric pressure (101 kPa) can support a water column up to ~10.3m. Your {apexHeight}m apex is within limits.
              </p>
            ) : (
              <p style={{ color: colors.accent, margin: 0, fontSize: '14px' }}>
                <strong>Siphon breaks!</strong> At {apexHeight}m, the pressure at the apex drops below water's vapor pressure. A bubble forms, breaking the liquid chain!
              </p>
            )}
          </div>
        </div>

        {renderKeyTakeaway("Siphon height is limited by atmospheric pressure: P_atm = ρgh → h_max ≈ 10.3m for water at sea level. In vacuum, siphons don't work at all!")}

        {renderBottomBar(() => goToPhase('twist_review'))}
      </div>
    );
  };

  // Twist Review Phase
  const renderTwistReview = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("🔬", "Siphon Limits Explained", "Why 10 meters?")}

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
            <p style={{ color: colors.primary, fontWeight: '600', margin: '0 0 8px 0' }}>
              📐 The 10-Meter Calculation
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              P_atm = ρ × g × h<br/>
              101,325 Pa = 1000 kg/m³ × 9.8 m/s² × h<br/>
              h = <strong>10.33 meters</strong>
            </p>
          </div>

          <div style={{
            padding: '20px',
            background: colors.background,
            borderRadius: '12px'
          }}>
            <p style={{ color: colors.warning, fontWeight: '600', margin: '0 0 8px 0' }}>
              ⚠️ What Happens Above the Limit
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              At the apex, pressure drops to near zero (vacuum). Water vaporizes, forming a bubble that breaks the liquid chain. The siphon "cavitates."
            </p>
          </div>

          <div style={{
            padding: '20px',
            background: colors.background,
            borderRadius: '12px'
          }}>
            <p style={{ color: colors.success, fontWeight: '600', margin: '0 0 8px 0' }}>
              🌍 Real-World Implications
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              This is why suction pumps can't lift water more than ~10m. For deeper wells, we use submersible pumps that push from below rather than suck from above.
            </p>
          </div>
        </div>

        {renderKeyTakeaway("The 10-meter siphon limit comes directly from atmospheric pressure. This same physics explains why Torricelli invented the barometer and why deep wells need special pumps.")}
      </div>

      {renderBottomBar(() => goToPhase('transfer'))}
    </div>
  );

  // Transfer Phase
  const renderTransfer = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("🌍", "Siphons in Action", "Ancient to modern applications")}

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
                  {calculateScore() >= 8 ? "Siphon Expert!" :
                   calculateScore() >= 6 ? "Great understanding!" :
                   "Keep studying fluid mechanics!"}
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
          background: `linear-gradient(135deg, ${colors.water}20, ${colors.secondary}20)`,
          borderRadius: '20px',
          padding: '32px',
          textAlign: 'center',
          marginBottom: '20px',
          border: `2px solid ${colors.water}50`,
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
                background: [colors.primary, colors.secondary, colors.accent, colors.success, colors.water][i % 5],
                borderRadius: i % 2 === 0 ? '50%' : '2px',
                left: `${Math.random() * 100}%`,
                top: '-20px',
                animation: `fall ${2 + Math.random() * 2}s linear infinite`,
                animationDelay: `${Math.random() * 2}s`,
                opacity: 0.8
              }}
            />
          ))}

          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🪣🎓</div>

          <h2 style={{ color: colors.text, margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700' }}>
            Siphon Master!
          </h2>

          <p style={{ color: colors.textSecondary, margin: '0 0 24px 0', fontSize: '16px' }}>
            You understand how to move water uphill without a pump
          </p>

          <div style={{
            display: 'inline-block',
            padding: '16px 32px',
            background: colors.card,
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <div style={{ color: colors.water, fontSize: '36px', fontWeight: '700' }}>
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
              { icon: "⬇️", title: "Atmospheric Push", text: "101 kPa drives water up" },
              { icon: "📏", title: "10m Limit", text: "P = ρgh sets max height" },
              { icon: "🔗", title: "Liquid Chain", text: "Primed tube carries flow" }
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

        {renderKeyTakeaway("From Roman aqueducts to aquarium cleaning, siphons demonstrate how atmospheric pressure and gravity combine to move fluids without any external power!")}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            💧 You now understand the ancient physics that still moves water around the world today!
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

export default SiphonRenderer;
