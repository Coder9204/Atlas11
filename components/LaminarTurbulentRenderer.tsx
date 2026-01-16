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

interface LaminarTurbulentRendererProps {
  onEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

const LaminarTurbulentRenderer: React.FC<LaminarTurbulentRendererProps> = ({ onEvent, gamePhase }) => {
  // Phase management
  const [phase, setPhase] = useState<Phase>('hook');

  // Hook phase
  const [hookStep, setHookStep] = useState(0);
  const [faucetFlow, setFaucetFlow] = useState(0);

  // Predict phase
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showPredictResult, setShowPredictResult] = useState(false);

  // Play phase - flow simulator
  const [flowVelocity, setFlowVelocity] = useState(0.5);
  const [pipeDiameter, setPipeDiameter] = useState(2);
  const [fluidViscosity, setFluidViscosity] = useState(1);
  const [showDyeInjection, setShowDyeInjection] = useState(true);
  const [dyeParticles, setDyeParticles] = useState<{x: number, y: number, id: number}[]>([]);
  const dyeIdRef = useRef(0);
  const animationRef = useRef<number>();

  // Twist phase - boundary layers
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistResult, setShowTwistResult] = useState(false);
  const [objectShape, setObjectShape] = useState<'sphere' | 'streamlined' | 'flat'>('sphere');

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

  // Calculate Reynolds number
  const calculateReynolds = (velocity: number, diameter: number, viscosity: number): number => {
    const density = 1000; // water kg/m³
    // Re = ρvD/μ
    return (density * velocity * diameter) / (viscosity * 1000);
  };

  // Get flow type based on Reynolds number
  const getFlowType = (Re: number): 'laminar' | 'transition' | 'turbulent' => {
    if (Re < 2000) return 'laminar';
    if (Re < 4000) return 'transition';
    return 'turbulent';
  };

  // Dye particle animation
  useEffect(() => {
    if (!showDyeInjection) return;

    const Re = calculateReynolds(flowVelocity, pipeDiameter, fluidViscosity);
    const flowType = getFlowType(Re);

    const animate = () => {
      // Add new particles
      if (Math.random() < 0.3) {
        const newParticle = {
          id: dyeIdRef.current++,
          x: 50,
          y: 100 + (Math.random() - 0.5) * 20
        };
        setDyeParticles(prev => [...prev.slice(-50), newParticle]);
      }

      // Update particle positions
      setDyeParticles(prev => prev.map(p => {
        let newY = p.y;

        if (flowType === 'turbulent') {
          // Chaotic motion
          newY += (Math.random() - 0.5) * 15;
        } else if (flowType === 'transition') {
          // Some waviness
          newY += (Math.random() - 0.5) * 5;
        }
        // Laminar: particles stay in lanes

        return {
          ...p,
          x: p.x + flowVelocity * 3 + 1,
          y: Math.max(70, Math.min(130, newY))
        };
      }).filter(p => p.x < 400));

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [flowVelocity, pipeDiameter, fluidViscosity, showDyeInjection]);

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

  // Test questions
  const testQuestions = [
    {
      question: "What primarily determines whether flow is laminar or turbulent?",
      options: ["Fluid color", "Reynolds number (Re = ρvD/μ)", "Pipe material", "Fluid temperature only"],
      correct: 1
    },
    {
      question: "You turn on a faucet slowly — the water stream is clear. What happens when you turn it up high?",
      options: ["Stream stays clear but faster", "Stream becomes white and chaotic", "Stream gets thinner", "No change in appearance"],
      correct: 1
    },
    {
      question: "Which flow type has LOWER drag for most shapes?",
      options: ["Turbulent - energy helps it slide", "Laminar - smooth, orderly motion", "They have equal drag", "Depends on color"],
      correct: 1
    },
    {
      question: "What is the critical Reynolds number for pipe flow transition?",
      options: ["Re ≈ 100", "Re ≈ 2300", "Re ≈ 10,000", "Re ≈ 1,000,000"],
      correct: 1
    },
    {
      question: "Why does adding honey to water change its flow behavior?",
      options: ["Honey adds color", "Higher viscosity raises critical Re threshold", "Honey is lighter", "No effect on flow"],
      correct: 1
    },
    {
      question: "Golf ball dimples work by:",
      options: ["Making the ball heavier", "Triggering turbulent boundary layer (less drag)", "Increasing laminar flow", "Aesthetic only"],
      correct: 1
    },
    {
      question: "Blood flow in arteries is usually:",
      options: ["Always turbulent - heart pumps hard", "Laminar, except in diseased vessels", "Random chaos", "Only turbulent in veins"],
      correct: 1
    },
    {
      question: "To keep flow laminar in a pipe, you should:",
      options: ["Increase velocity", "Decrease pipe diameter", "Increase viscosity or decrease velocity", "Make pipe rougher"],
      correct: 2
    },
    {
      question: "Why do Formula 1 cars have smooth underbodies?",
      options: ["Weight reduction", "Maintain laminar airflow for less drag", "Aesthetic design", "Easier to clean"],
      correct: 1
    },
    {
      question: "The transition from laminar to turbulent is:",
      options: ["Gradual and predictable", "Sudden and sensitive to disturbances", "Impossible to predict", "Only occurs in gases"],
      correct: 1
    }
  ];

  // Real-world applications
  const applications = [
    {
      icon: "🚿",
      title: "Plumbing Design",
      short: "Pipe flow",
      tagline: "Keeping water flowing smoothly",
      description: "Engineers design water supply systems to maintain laminar flow where possible, minimizing energy loss and noise.",
      connection: "Reynolds number determines pipe sizing. Too small = turbulent = high friction losses and noisy pipes.",
      howItWorks: "By calculating Re for expected flow rates, engineers select pipe diameters that keep Re < 2300 for quiet, efficient systems. Larger pipes = lower velocity = lower Re.",
      stats: ["Laminar friction: ~16/Re", "Turbulent friction: ~0.02-0.05", "Energy loss: v² relationship"],
      examples: ["Home water supply", "Industrial pipelines", "HVAC ducts", "Medical IV tubing"],
      companies: ["Grundfos", "Pentair", "Victaulic", "Uponor"],
      futureImpact: "Smart pipe systems with variable flow control optimize for laminar conditions, reducing pumping energy by 30%.",
      color: "#3B82F6"
    },
    {
      icon: "✈️",
      title: "Aircraft Design",
      short: "Drag reduction",
      tagline: "The laminar flow holy grail",
      description: "Maintaining laminar flow over aircraft surfaces dramatically reduces drag — a key goal for fuel efficiency.",
      connection: "Laminar boundary layers have much lower skin friction. Transition to turbulent increases drag significantly.",
      howItWorks: "Smooth surfaces, careful pressure gradients, and suction systems keep boundary layers laminar longer. Even small contamination (bugs, rivets) can trigger transition.",
      stats: ["Laminar drag: 1× baseline", "Turbulent drag: 3-5× higher", "Fuel savings: up to 15%"],
      examples: ["Boeing 787 wings", "Glider designs", "Laminar flow nacelles", "Natural laminar airfoils"],
      companies: ["Boeing", "Airbus", "NASA", "DLR"],
      futureImpact: "Hybrid laminar flow control with boundary layer suction could revolutionize long-range aircraft efficiency.",
      color: "#10B981"
    },
    {
      icon: "⚽",
      title: "Sports Equipment",
      short: "Ball aerodynamics",
      tagline: "Dimples, seams, and spin",
      description: "Golf balls, soccer balls, and baseballs are designed with specific surface textures that manipulate flow transition.",
      connection: "Counterintuitively, triggering turbulent boundary layers REDUCES drag on blunt objects by delaying flow separation.",
      howItWorks: "Golf ball dimples create turbulent boundary layer that stays attached longer, reducing wake size. Smooth balls have earlier separation and more drag!",
      stats: ["Golf ball drag: 50% less with dimples", "Cricket seam: 20% swing effect", "Soccer ball panels: affects trajectory"],
      examples: ["Golf ball dimples", "Baseball seams", "Soccer panel design", "Tennis ball fuzz"],
      companies: ["Titleist", "Nike", "Adidas", "Wilson"],
      futureImpact: "Computational fluid dynamics enables precision-engineered surface textures for optimal performance in all sports.",
      color: "#F59E0B"
    },
    {
      icon: "❤️",
      title: "Cardiovascular Health",
      short: "Blood flow",
      tagline: "When turbulence means trouble",
      description: "Normal blood flow is laminar. Turbulence in arteries is a sign of disease and can be heard with a stethoscope.",
      connection: "Arterial plaques narrow vessels, increasing local velocity and Reynolds number, triggering turbulent flow (bruit sounds).",
      howItWorks: "Doctors listen for turbulent flow sounds ('bruits') as indicators of arterial blockages. Normal arteries maintain laminar flow even at high cardiac output.",
      stats: ["Normal Re: ~1000-2000", "Turbulent bruit: Re > 4000", "Detection: stethoscope or ultrasound"],
      examples: ["Carotid artery screening", "Heart valve assessment", "Aneurysm detection", "Artificial heart design"],
      companies: ["Medtronic", "St. Jude Medical", "Philips Healthcare", "GE Healthcare"],
      futureImpact: "AI-powered acoustic analysis can detect early arterial disease through subtle changes in flow sounds.",
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
    laminar: '#22D3EE',
    turbulent: '#F97316'
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
      {renderSectionHeader("🌊", "Two Types of Flow", "Laminar vs turbulent")}

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
              Turn on a faucet just slightly — the water stream is <span style={{ color: colors.laminar }}>clear and glassy</span>.<br/>
              Crank it up high — it becomes <span style={{ color: colors.turbulent }}>white and chaotic</span>.
            </p>

            <svg width="300" height="200" viewBox="0 0 300 200" style={{ margin: '0 auto', display: 'block' }}>
              {/* Faucet */}
              <rect x="120" y="10" width="60" height="30" rx="5" fill="#666" />
              <rect x="140" y="40" width="20" height="20" rx="3" fill="#555" />

              {/* Water stream */}
              {faucetFlow === 0 ? (
                <text x="150" y="120" fill={colors.textSecondary} fontSize="14" textAnchor="middle">
                  Adjust the faucet →
                </text>
              ) : faucetFlow < 50 ? (
                // Laminar flow - smooth stream
                <>
                  <path
                    d={`M 145 60 Q 145 130 143 180 L 157 180 Q 155 130 155 60 Z`}
                    fill={colors.laminar}
                    opacity="0.6"
                  />
                  <text x="200" y="120" fill={colors.laminar} fontSize="12">Laminar</text>
                  <text x="200" y="135" fill={colors.textSecondary} fontSize="10">Smooth, clear</text>
                </>
              ) : (
                // Turbulent flow - chaotic stream
                <>
                  <path
                    d={`M 140 60 Q ${135 + Math.random() * 10} 90 ${130 + Math.random() * 15} 120
                       Q ${125 + Math.random() * 20} 150 ${120 + Math.random() * 25} 180
                       L ${150 + Math.random() * 25} 180
                       Q ${155 + Math.random() * 20} 150 ${160 + Math.random() * 15} 120
                       Q ${165 + Math.random() * 10} 90 160 60 Z`}
                    fill={colors.turbulent}
                    opacity="0.7"
                  />
                  {/* Bubbles/droplets */}
                  {[1,2,3,4,5].map(i => (
                    <circle
                      key={i}
                      cx={130 + Math.random() * 40}
                      cy={80 + Math.random() * 80}
                      r={2 + Math.random() * 3}
                      fill="#fff"
                      opacity="0.5"
                    />
                  ))}
                  <text x="200" y="120" fill={colors.turbulent} fontSize="12">Turbulent</text>
                  <text x="200" y="135" fill={colors.textSecondary} fontSize="10">Chaotic, white</text>
                </>
              )}
            </svg>

            {/* Faucet control */}
            <div style={{ marginTop: '16px' }}>
              <span style={{ color: colors.textSecondary, fontSize: '14px' }}>Faucet: </span>
              <input
                type="range"
                min="0"
                max="100"
                value={faucetFlow}
                onChange={(e) => {
                  setFaucetFlow(Number(e.target.value));
                  playSound(200 + Number(e.target.value) * 3, 0.05, 'sine', 0.1);
                }}
                style={{ width: '150px', accentColor: faucetFlow < 50 ? colors.laminar : colors.turbulent }}
              />
              <span style={{ color: colors.textSecondary, fontSize: '14px', marginLeft: '10px' }}>
                {faucetFlow === 0 ? 'Off' : faucetFlow < 50 ? 'Low' : 'High'}
              </span>
            </div>

            {faucetFlow > 0 && (
              <button
                onMouseDown={() => setHookStep(1)}
                style={{
                  marginTop: '20px',
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
              🤔 What changed? Just the <span style={{ color: colors.primary }}>speed</span>.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '16px', lineHeight: 1.6, marginBottom: '20px' }}>
              Same water, same pipe, same faucet — but the flow fundamentally transformed.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              textAlign: 'left'
            }}>
              <div style={{
                padding: '16px',
                background: `${colors.laminar}15`,
                borderRadius: '12px',
                border: `2px solid ${colors.laminar}`
              }}>
                <p style={{ color: colors.laminar, fontWeight: '600', margin: '0 0 8px 0' }}>Laminar Flow</p>
                <p style={{ color: colors.textSecondary, margin: 0, fontSize: '14px' }}>
                  Smooth parallel layers sliding past each other
                </p>
              </div>
              <div style={{
                padding: '16px',
                background: `${colors.turbulent}15`,
                borderRadius: '12px',
                border: `2px solid ${colors.turbulent}`
              }}>
                <p style={{ color: colors.turbulent, fontWeight: '600', margin: '0 0 8px 0' }}>Turbulent Flow</p>
                <p style={{ color: colors.textSecondary, margin: 0, fontSize: '14px' }}>
                  Chaotic eddies and mixing in all directions
                </p>
              </div>
            </div>

            {renderKeyTakeaway("The transition between laminar and turbulent flow is controlled by the Reynolds number — a ratio of inertial to viscous forces.")}
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
      {renderSectionHeader("🔮", "Make a Prediction", "When does flow become turbulent?")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px'
      }}>
        <p style={{ color: colors.text, fontSize: '17px', lineHeight: 1.6, marginBottom: '24px' }}>
          You have two identical pipes. One carries water, the other honey.<br/>
          Both flow at the same velocity.
        </p>

        <svg width="100%" height="120" viewBox="0 0 400 120" style={{ marginBottom: '20px' }}>
          {/* Water pipe */}
          <g transform="translate(100, 35)">
            <rect x="-60" y="-15" width="120" height="30" rx="5" fill="#333" />
            <rect x="-55" y="-10" width="110" height="20" fill={colors.laminar} opacity="0.4" />
            <text y="35" fill={colors.laminar} fontSize="12" textAnchor="middle">Water (thin)</text>
          </g>
          {/* Honey pipe */}
          <g transform="translate(300, 35)">
            <rect x="-60" y="-15" width="120" height="30" rx="5" fill="#333" />
            <rect x="-55" y="-10" width="110" height="20" fill={colors.warning} opacity="0.6" />
            <text y="35" fill={colors.warning} fontSize="12" textAnchor="middle">Honey (thick)</text>
          </g>
          <text x="200" y="100" fill={colors.textSecondary} fontSize="13" textAnchor="middle">Same velocity, same pipe size</text>
        </svg>

        <p style={{ color: colors.text, fontSize: '18px', fontWeight: '600', marginBottom: '16px', textAlign: 'center' }}>
          Which flow is more likely to become turbulent?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { value: 'water', label: 'Water — lower viscosity allows more chaos', color: colors.laminar },
            { value: 'honey', label: 'Honey — thickness creates more friction', color: colors.warning },
            { value: 'same', label: 'Same — velocity alone determines turbulence', color: colors.textSecondary }
          ].map(option => (
            <button
              key={option.value}
              onMouseDown={() => {
                setPrediction(option.value);
                playSound(330, 0.1, 'sine', 0.2);
                emitEvent('prediction', { predicted: option.value, question: 'viscosity_effect' });
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
              playSound(prediction === 'water' ? 600 : 300, 0.3, 'sine', 0.3);
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
            background: prediction === 'water' ? `${colors.success}20` : `${colors.primary}20`,
            borderRadius: '12px',
            border: `2px solid ${prediction === 'water' ? colors.success : colors.primary}`
          }}>
            {prediction === 'water' ? (
              <>
                <p style={{ color: colors.success, fontSize: '18px', fontWeight: '600', margin: '0 0 12px 0' }}>
                  ✓ Exactly right!
                </p>
                <p style={{ color: colors.text, margin: 0, lineHeight: 1.6 }}>
                  Water becomes turbulent more easily! Lower viscosity means less "stickiness" to dampen chaotic motion.
                </p>
              </>
            ) : (
              <>
                <p style={{ color: colors.primary, fontSize: '18px', fontWeight: '600', margin: '0 0 12px 0' }}>
                  Good thinking, but it's water!
                </p>
                <p style={{ color: colors.text, margin: 0, lineHeight: 1.6 }}>
                  Honey's high viscosity acts like a damper, suppressing turbulent fluctuations.
                  Water's low viscosity allows chaos to develop more easily.
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
    const Re = calculateReynolds(flowVelocity, pipeDiameter, fluidViscosity);
    const flowType = getFlowType(Re);

    return (
      <div style={{ padding: isMobile ? '16px' : '24px' }}>
        {renderProgressBar()}
        {renderSectionHeader("🎮", "Reynolds Number Lab", "Control flow conditions")}

        <div style={{
          background: colors.card,
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          {/* Pipe visualization with dye */}
          <div style={{ background: colors.background, borderRadius: '12px', padding: '10px', marginBottom: '16px' }}>
            <svg width="100%" height="150" viewBox="0 0 400 150">
              {/* Pipe walls */}
              <rect x="40" y="65" width="320" height="70" rx="5" fill="#333" />
              <rect x="45" y="70" width="310" height="60" fill="#1a1a1a" />

              {/* Flow streamlines based on type */}
              {flowType === 'laminar' ? (
                // Laminar: parallel lines
                [80, 90, 100, 110, 120].map((y, i) => (
                  <line
                    key={i}
                    x1="50"
                    y1={y}
                    x2="350"
                    y2={y}
                    stroke={colors.laminar}
                    strokeWidth="1"
                    opacity="0.4"
                  />
                ))
              ) : flowType === 'turbulent' ? (
                // Turbulent: chaotic paths
                Array.from({ length: 8 }).map((_, i) => {
                  const baseY = 75 + i * 8;
                  const path = `M 50 ${baseY} ${Array.from({ length: 10 }).map((_, j) =>
                    `L ${50 + j * 30} ${baseY + (Math.random() - 0.5) * 30}`
                  ).join(' ')}`;
                  return (
                    <path
                      key={i}
                      d={path}
                      fill="none"
                      stroke={colors.turbulent}
                      strokeWidth="1"
                      opacity="0.4"
                    />
                  );
                })
              ) : (
                // Transition: wavy lines
                [85, 100, 115].map((y, i) => (
                  <path
                    key={i}
                    d={`M 50 ${y} Q 100 ${y + 5} 150 ${y} Q 200 ${y - 5} 250 ${y} Q 300 ${y + 5} 350 ${y}`}
                    fill="none"
                    stroke={colors.warning}
                    strokeWidth="1.5"
                    opacity="0.5"
                  />
                ))
              )}

              {/* Dye particles */}
              {showDyeInjection && dyeParticles.map(p => (
                <circle
                  key={p.id}
                  cx={p.x}
                  cy={p.y}
                  r={3}
                  fill={flowType === 'turbulent' ? colors.turbulent : flowType === 'laminar' ? colors.laminar : colors.warning}
                  opacity="0.8"
                />
              ))}

              {/* Dye injector */}
              {showDyeInjection && (
                <g transform="translate(45, 100)">
                  <rect x="-10" y="-10" width="15" height="20" fill={colors.secondary} rx="2" />
                  <text x="-2" y="25" fill={colors.textSecondary} fontSize="9" textAnchor="middle">Dye</text>
                </g>
              )}

              {/* Labels */}
              <text x="200" y="22" fill={colors.text} fontSize="12" textAnchor="middle" fontWeight="600">
                {flowType.toUpperCase()} FLOW
              </text>
              <text x="200" y="40" fill={flowType === 'laminar' ? colors.laminar : flowType === 'turbulent' ? colors.turbulent : colors.warning} fontSize="11" textAnchor="middle">
                Re = {Re.toFixed(0)}
              </text>
            </svg>
          </div>

          {/* Controls */}
          <div style={{ display: 'grid', gap: '16px' }}>
            {/* Velocity slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: colors.text, fontSize: '14px', fontWeight: '600' }}>Flow Velocity (v)</span>
                <span style={{ color: colors.primary, fontSize: '14px' }}>{flowVelocity.toFixed(1)} m/s</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={flowVelocity}
                onChange={(e) => setFlowVelocity(Number(e.target.value))}
                style={{ width: '100%', accentColor: colors.primary }}
              />
            </div>

            {/* Diameter slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: colors.text, fontSize: '14px', fontWeight: '600' }}>Pipe Diameter (D)</span>
                <span style={{ color: colors.secondary, fontSize: '14px' }}>{pipeDiameter.toFixed(1)} cm</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={pipeDiameter}
                onChange={(e) => setPipeDiameter(Number(e.target.value))}
                style={{ width: '100%', accentColor: colors.secondary }}
              />
            </div>

            {/* Viscosity slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: colors.text, fontSize: '14px', fontWeight: '600' }}>Fluid Viscosity (μ)</span>
                <span style={{ color: colors.warning, fontSize: '14px' }}>{fluidViscosity.toFixed(1)}× water</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="50"
                step="0.5"
                value={fluidViscosity}
                onChange={(e) => setFluidViscosity(Number(e.target.value))}
                style={{ width: '100%', accentColor: colors.warning }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: colors.textSecondary }}>
                <span>Water</span>
                <span>Oil</span>
                <span>Honey</span>
              </div>
            </div>

            {/* Dye toggle */}
            <button
              onMouseDown={() => setShowDyeInjection(!showDyeInjection)}
              style={{
                padding: '10px 16px',
                background: showDyeInjection ? colors.secondary : colors.background,
                color: showDyeInjection ? colors.background : colors.textSecondary,
                border: `1px solid ${showDyeInjection ? colors.secondary : '#444'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              {showDyeInjection ? '✓' : '○'} Dye Injection Visualization
            </button>
          </div>

          {/* Reynolds number explanation */}
          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: colors.background,
            borderRadius: '12px',
            border: `1px solid ${flowType === 'laminar' ? colors.laminar : flowType === 'turbulent' ? colors.turbulent : colors.warning}30`
          }}>
            <p style={{ color: colors.text, fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0' }}>
              Reynolds Number: Re = ρvD/μ
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '13px', margin: '0 0 8px 0' }}>
              Re &lt; 2000: Laminar | 2000-4000: Transition | Re &gt; 4000: Turbulent
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: `${flowType === 'laminar' ? colors.laminar : flowType === 'turbulent' ? colors.turbulent : colors.warning}20`,
              borderRadius: '8px'
            }}>
              <span style={{
                color: flowType === 'laminar' ? colors.laminar : flowType === 'turbulent' ? colors.turbulent : colors.warning,
                fontSize: '24px',
                fontWeight: '700'
              }}>
                Re = {Re.toFixed(0)}
              </span>
              <span style={{ color: colors.textSecondary, fontSize: '13px' }}>
                → {flowType.charAt(0).toUpperCase() + flowType.slice(1)} Flow
              </span>
            </div>
          </div>
        </div>

        {renderKeyTakeaway("Reynolds number predicts flow regime: higher velocity or larger pipes → higher Re → turbulence. Higher viscosity → lower Re → laminar.")}

        {renderBottomBar(() => goToPhase('review'))}
      </div>
    );
  };

  // Review Phase
  const renderReview = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("📚", "Flow Regimes Explained", "Why transitions happen")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'grid', gap: '16px' }}>
          {[
            {
              title: "Laminar Flow (Re < 2000)",
              text: "Fluid moves in smooth, parallel layers. Viscous forces dominate, dampening any disturbances. Predictable, efficient.",
              color: colors.laminar,
              icon: "〰️"
            },
            {
              title: "Transition Zone (2000-4000)",
              text: "Flow is unstable — small disturbances can trigger turbulence. Flow may flip between states.",
              color: colors.warning,
              icon: "🌀"
            },
            {
              title: "Turbulent Flow (Re > 4000)",
              text: "Chaotic eddies at all scales. Inertial forces dominate. Much higher friction and mixing.",
              color: colors.turbulent,
              icon: "💥"
            },
            {
              title: "The Reynolds Number Balance",
              text: "Re = Inertial forces / Viscous forces = ρvD/μ. High Re means inertia wins → turbulence.",
              color: colors.secondary,
              icon: "⚖️"
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

        {/* Visual comparison */}
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: colors.background,
          borderRadius: '12px'
        }}>
          <p style={{ color: colors.text, fontWeight: '600', margin: '0 0 12px 0', textAlign: 'center' }}>
            Dye Test Comparison
          </p>
          <svg width="100%" height="100" viewBox="0 0 400 100">
            {/* Laminar */}
            <g transform="translate(0, 0)">
              <rect x="10" y="20" width="120" height="60" rx="5" fill="#222" />
              <line x1="25" y1="50" x2="115" y2="50" stroke={colors.laminar} strokeWidth="3" />
              <text x="70" y="95" fill={colors.laminar} fontSize="11" textAnchor="middle">Laminar</text>
            </g>
            {/* Transition */}
            <g transform="translate(140, 0)">
              <rect x="10" y="20" width="120" height="60" rx="5" fill="#222" />
              <path d="M 25 50 Q 50 35 70 50 Q 90 65 115 50" fill="none" stroke={colors.warning} strokeWidth="3" />
              <text x="70" y="95" fill={colors.warning} fontSize="11" textAnchor="middle">Transition</text>
            </g>
            {/* Turbulent */}
            <g transform="translate(280, 0)">
              <rect x="10" y="20" width="120" height="60" rx="5" fill="#222" />
              <path d="M 25 40 Q 35 60 50 35 Q 65 70 80 45 Q 95 60 115 50" fill="none" stroke={colors.turbulent} strokeWidth="3" />
              <circle cx="70" cy="50" r="15" fill={colors.turbulent} opacity="0.3" />
              <text x="70" y="95" fill={colors.turbulent} fontSize="11" textAnchor="middle">Turbulent</text>
            </g>
          </svg>
        </div>

        {renderKeyTakeaway("The Reynolds number determines flow character by comparing how hard fluid pushes (inertia) vs how much it resists (viscosity).")}
      </div>

      {renderBottomBar(() => goToPhase('twist_predict'))}
    </div>
  );

  // Twist Predict Phase
  const renderTwistPredict = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("🔄", "The Golf Ball Paradox", "When turbulence helps")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px'
      }}>
        <p style={{ color: colors.text, fontSize: '17px', lineHeight: 1.6, marginBottom: '24px' }}>
          Golf balls have 300-500 dimples. A smooth golf ball would be more "aerodynamic," right?
        </p>

        <svg width="100%" height="120" viewBox="0 0 400 120" style={{ marginBottom: '20px' }}>
          {/* Smooth ball */}
          <g transform="translate(100, 60)">
            <circle r="35" fill="#fff" />
            <text y="55" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Smooth ball</text>
          </g>
          {/* Dimpled ball */}
          <g transform="translate(300, 60)">
            <circle r="35" fill="#fff" />
            {/* Dimples */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30) * Math.PI / 180;
              const r = 25;
              return (
                <circle
                  key={i}
                  cx={r * Math.cos(angle)}
                  cy={r * Math.sin(angle)}
                  r={4}
                  fill="#ddd"
                />
              );
            })}
            <text y="55" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Dimpled ball</text>
          </g>
          <text x="200" y="60" fill={colors.textSecondary} fontSize="14" textAnchor="middle">vs</text>
        </svg>

        <p style={{ color: colors.text, fontSize: '18px', fontWeight: '600', marginBottom: '16px', textAlign: 'center' }}>
          Which ball flies farther?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { value: 'smooth', label: 'Smooth — less surface friction, less drag', color: colors.laminar },
            { value: 'dimpled', label: 'Dimpled — roughness creates some benefit', color: colors.turbulent },
            { value: 'same', label: 'Same distance — shape matters, not surface', color: colors.textSecondary }
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
              playSound(twistPrediction === 'dimpled' ? 600 : 300, 0.3, 'sine', 0.3);
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
            background: twistPrediction === 'dimpled' ? `${colors.success}20` : `${colors.accent}20`,
            borderRadius: '12px',
            border: `2px solid ${twistPrediction === 'dimpled' ? colors.success : colors.accent}`
          }}>
            {twistPrediction === 'dimpled' ? (
              <p style={{ color: colors.success, margin: 0 }}>
                <strong>✓ Counterintuitive but correct!</strong> Dimpled balls fly nearly TWICE as far! The dimples trigger a turbulent boundary layer that stays attached longer, reducing the wake and overall drag.
              </p>
            ) : (
              <p style={{ color: colors.accent, margin: 0 }}>
                <strong>Surprising answer!</strong> Dimpled balls actually fly nearly twice as far! Counterintuitively, the "rougher" surface creates LESS drag by triggering turbulent boundary layers.
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
      {renderSectionHeader("🎮", "Boundary Layer Lab", "See why dimples work")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        {/* Shape selector */}
        <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {(['sphere', 'streamlined', 'flat'] as const).map(shape => (
            <button
              key={shape}
              onMouseDown={() => setObjectShape(shape)}
              style={{
                padding: '10px 20px',
                background: objectShape === shape ? colors.primary : colors.background,
                color: objectShape === shape ? colors.background : colors.textSecondary,
                border: `1px solid ${objectShape === shape ? colors.primary : '#444'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: objectShape === shape ? '600' : '400'
              }}
            >
              {shape === 'sphere' ? '⚽ Sphere' : shape === 'streamlined' ? '🛩️ Streamlined' : '📦 Flat Plate'}
            </button>
          ))}
        </div>

        {/* Flow visualization */}
        <div style={{ background: colors.background, borderRadius: '12px', padding: '10px', marginBottom: '16px' }}>
          <svg width="100%" height="200" viewBox="0 0 400 200">
            {/* Flow arrows coming in */}
            {[40, 80, 120, 160].map((y, i) => (
              <line key={i} x1="20" y1={y} x2="80" y2={y} stroke={colors.primary} strokeWidth="1.5" opacity="0.4" />
            ))}

            {/* Object and flow pattern */}
            {objectShape === 'sphere' && (
              <g transform="translate(150, 100)">
                {/* Smooth sphere boundary layer */}
                <circle r="40" fill="#666" />
                {/* Laminar BL - separates early */}
                <path
                  d="M -40 0 Q -50 -30 -30 -50 Q 0 -60 30 -50 Q 40 -30 35 0
                     Q 30 30 10 60 L -10 60 Q -30 30 -35 0"
                  fill="none"
                  stroke={colors.laminar}
                  strokeWidth="2"
                  strokeDasharray="4,2"
                />
                {/* Wake */}
                <ellipse cx="80" cy="0" rx="60" ry="50" fill={colors.accent} opacity="0.2" />
                <text x="80" y="5" fill={colors.accent} fontSize="10" textAnchor="middle">Large wake</text>
                <text y="70" fill={colors.text} fontSize="11" textAnchor="middle">Smooth: Early separation</text>

                {/* Second ball with dimples for comparison */}
                <g transform="translate(200, 0)">
                  <circle r="35" fill="#666" />
                  {/* Dimples */}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <circle key={i} cx={25 * Math.cos(i * Math.PI / 4)} cy={25 * Math.sin(i * Math.PI / 4)} r={3} fill="#555" />
                  ))}
                  {/* Turbulent BL - stays attached longer */}
                  <path
                    d="M -35 0 Q -40 -25 -25 -40 Q 0 -50 25 -40 Q 38 -20 38 0
                       Q 38 20 25 35 Q 10 45 -5 40"
                    fill="none"
                    stroke={colors.turbulent}
                    strokeWidth="2"
                  />
                  {/* Smaller wake */}
                  <ellipse cx="55" cy="0" rx="30" ry="25" fill={colors.success} opacity="0.2" />
                  <text x="55" y="5" fill={colors.success} fontSize="9" textAnchor="middle">Small wake</text>
                  <text y="70" fill={colors.text} fontSize="11" textAnchor="middle">Dimpled: Late separation</text>
                </g>
              </g>
            )}

            {objectShape === 'streamlined' && (
              <g transform="translate(200, 100)">
                {/* Streamlined shape */}
                <ellipse rx="80" ry="25" fill="#666" />
                {/* Attached flow all the way */}
                <path
                  d="M -80 0 Q -90 -20 -70 -35 Q 0 -40 70 -35 Q 90 -20 85 0
                     Q 90 20 70 35 Q 0 40 -70 35 Q -90 20 -85 0"
                  fill="none"
                  stroke={colors.success}
                  strokeWidth="2"
                />
                {/* Tiny wake */}
                <ellipse cx="95" cy="0" rx="15" ry="10" fill={colors.success} opacity="0.2" />
                <text y="55" fill={colors.text} fontSize="11" textAnchor="middle">Streamlined: Minimal separation</text>
              </g>
            )}

            {objectShape === 'flat' && (
              <g transform="translate(200, 100)">
                {/* Flat plate */}
                <rect x="-10" y="-50" width="20" height="100" fill="#666" />
                {/* Immediate separation */}
                <path
                  d="M -10 -50 L -30 -50 L -30 50 L -10 50"
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth="2"
                />
                {/* Massive wake */}
                <ellipse cx="60" cy="0" rx="70" ry="60" fill={colors.accent} opacity="0.3" />
                <text x="60" y="5" fill={colors.accent} fontSize="11" textAnchor="middle">Huge wake</text>
                <text y="80" fill={colors.text} fontSize="11" textAnchor="middle">Flat: Immediate separation</text>
              </g>
            )}
          </svg>
        </div>

        {/* Explanation */}
        <div style={{
          padding: '16px',
          background: colors.background,
          borderRadius: '12px',
          border: `1px solid ${colors.turbulent}30`
        }}>
          <p style={{ color: colors.turbulent, fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0' }}>
            The Boundary Layer Trick:
          </p>
          <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
            {objectShape === 'sphere' ? (
              "Dimples trigger a turbulent boundary layer that has more momentum near the surface. This energized layer stays attached longer around the curve, reducing the wake size and overall drag by ~50%!"
            ) : objectShape === 'streamlined' ? (
              "Streamlined shapes avoid the need for boundary layer tricks — the gentle curves allow flow to stay attached naturally. Best drag performance overall."
            ) : (
              "Flat plates face immediate separation regardless of boundary layer state. Turbulent BL can't help much here — the shape is simply bad for aerodynamics."
            )}
          </p>
        </div>
      </div>

      {renderKeyTakeaway("For blunt objects, turbulent boundary layers stay attached longer, reducing wake size and drag — that's why golf balls have dimples!")}

      {renderBottomBar(() => goToPhase('twist_review'))}
    </div>
  );

  // Twist Review Phase
  const renderTwistReview = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("🔬", "Drag & Flow Summary", "When turbulence helps vs hurts")}

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
            <p style={{ color: colors.success, fontWeight: '600', margin: '0 0 8px 0' }}>
              ✓ Turbulence HELPS (blunt objects):
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              Golf balls, soccer balls, cyclists' helmets — turbulent BL delays separation, reducing pressure drag.
              The small increase in skin friction is far outweighed by reduced wake drag.
            </p>
          </div>

          <div style={{
            padding: '20px',
            background: colors.background,
            borderRadius: '12px'
          }}>
            <p style={{ color: colors.accent, fontWeight: '600', margin: '0 0 8px 0' }}>
              ✗ Turbulence HURTS (streamlined objects):
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              Aircraft wings, submarines, race cars — for these shapes, laminar flow already stays attached.
              Triggering turbulence only adds skin friction drag with no wake benefit.
            </p>
          </div>

          <div style={{
            padding: '20px',
            background: colors.background,
            borderRadius: '12px'
          }}>
            <p style={{ color: colors.primary, fontWeight: '600', margin: '0 0 8px 0' }}>
              ⚖️ The Design Trade-off:
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              Engineers must balance: Can we streamline the shape? If not, would triggering turbulence reduce wake drag more than it adds friction drag?
            </p>
          </div>
        </div>

        {renderKeyTakeaway("The relationship between turbulence and drag depends on shape. For blunt objects, turbulence reduces total drag. For streamlined shapes, laminar flow wins.")}
      </div>

      {renderBottomBar(() => goToPhase('transfer'))}
    </div>
  );

  // Transfer Phase
  const renderTransfer = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("🌍", "Flow Physics in Action", "From pipes to arteries")}

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
                  {calculateScore() >= 8 ? "Fluid Dynamics Expert!" :
                   calculateScore() >= 6 ? "Great understanding!" :
                   "Keep studying flow physics!"}
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
          background: `linear-gradient(135deg, ${colors.laminar}20, ${colors.turbulent}20)`,
          borderRadius: '20px',
          padding: '32px',
          textAlign: 'center',
          marginBottom: '20px',
          border: `2px solid ${colors.primary}50`,
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
                background: [colors.primary, colors.secondary, colors.accent, colors.success, colors.laminar][i % 5],
                borderRadius: i % 2 === 0 ? '50%' : '2px',
                left: `${Math.random() * 100}%`,
                top: '-20px',
                animation: `fall ${2 + Math.random() * 2}s linear infinite`,
                animationDelay: `${Math.random() * 2}s`,
                opacity: 0.8
              }}
            />
          ))}

          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🌊🎓</div>

          <h2 style={{ color: colors.text, margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700' }}>
            Flow Master!
          </h2>

          <p style={{ color: colors.textSecondary, margin: '0 0 24px 0', fontSize: '16px' }}>
            You understand the physics of laminar and turbulent flow
          </p>

          <div style={{
            display: 'inline-block',
            padding: '16px 32px',
            background: colors.card,
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <div style={{ color: colors.primary, fontSize: '36px', fontWeight: '700' }}>
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
              { icon: "⚖️", title: "Reynolds Number", text: "Re = ρvD/μ predicts flow type" },
              { icon: "〰️", title: "Laminar Flow", text: "Smooth layers, Re < 2000" },
              { icon: "⚽", title: "Dimple Effect", text: "Turbulent BL reduces blunt drag" }
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

        {renderKeyTakeaway("From faucets to aircraft to your arteries — understanding flow transitions is essential to engineering and medicine alike!")}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            🌊 You now see the invisible dance between order and chaos in every flowing fluid!
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

export default LaminarTurbulentRenderer;
