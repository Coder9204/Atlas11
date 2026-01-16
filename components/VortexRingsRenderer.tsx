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

interface VortexRingsRendererProps {
  onEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Vortex ring type
interface VortexRing {
  id: number;
  x: number;
  y: number;
  radius: number;
  coreRadius: number;
  speed: number;
  rotation: number;
  opacity: number;
}

const VortexRingsRenderer: React.FC<VortexRingsRendererProps> = ({ onEvent, gamePhase }) => {
  // Phase management
  const [phase, setPhase] = useState<Phase>('hook');

  // Hook phase
  const [hookStep, setHookStep] = useState(0);
  const [showSmokeRing, setShowSmokeRing] = useState(false);

  // Predict phase
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showPredictResult, setShowPredictResult] = useState(false);

  // Play phase - vortex ring generator
  const [rings, setRings] = useState<VortexRing[]>([]);
  const [pulseSize, setPulseSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [launching, setLaunching] = useState(false);
  const [trialResults, setTrialResults] = useState<{size: string, speed: number}[]>([]);
  const ringIdRef = useRef(0);
  const animationRef = useRef<number>();

  // Twist phase - ring collisions
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistResult, setShowTwistResult] = useState(false);
  const [collisionMode, setCollisionMode] = useState<'chase' | 'headon'>('chase');
  const [collisionRings, setCollisionRings] = useState<VortexRing[]>([]);
  const collisionAnimRef = useRef<number>();

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

  // Animation loop for vortex rings
  useEffect(() => {
    const animate = () => {
      setRings(prev => {
        const updated = prev.map(ring => ({
          ...ring,
          x: ring.x + ring.speed,
          rotation: ring.rotation + 5,
          opacity: ring.x > 350 ? Math.max(0, ring.opacity - 0.02) : ring.opacity
        })).filter(ring => ring.opacity > 0 && ring.x < 500);
        return updated;
      });
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Collision animation
  useEffect(() => {
    if (collisionRings.length === 0) return;

    const animate = () => {
      setCollisionRings(prev => {
        if (prev.length < 2) return prev;

        const [ring1, ring2] = prev;
        let newRing1 = { ...ring1 };
        let newRing2 = { ...ring2 };

        if (collisionMode === 'chase') {
          // Leapfrog effect: trailing ring catches up, passes through
          const distance = ring2.x - ring1.x;
          if (distance > 50) {
            // Before interaction
            newRing1.x += ring1.speed;
            newRing2.x += ring2.speed;
          } else if (distance > 0) {
            // During interaction - speeds swap as they pass through
            newRing1.x += ring1.speed * 1.5;
            newRing2.x += ring2.speed * 0.5;
            // Sizes exchange
            newRing1.radius = Math.max(15, ring1.radius - 0.3);
            newRing2.radius = Math.min(40, ring2.radius + 0.3);
          } else {
            // After passing
            newRing1.x += ring1.speed * 1.2;
            newRing2.x += ring2.speed * 0.8;
          }
        } else {
          // Head-on: rings expand and combine
          newRing1.x += ring1.speed;
          newRing2.x += ring2.speed;
          const separation = Math.abs(ring1.x - ring2.x);
          if (separation < 40) {
            newRing1.radius += 0.5;
            newRing2.radius += 0.5;
            newRing1.opacity -= 0.01;
            newRing2.opacity -= 0.01;
          }
        }

        newRing1.rotation += 5;
        newRing2.rotation += 5;

        return [newRing1, newRing2].filter(r => r.opacity > 0 && r.x > -50 && r.x < 450);
      });
      collisionAnimRef.current = requestAnimationFrame(animate);
    };
    collisionAnimRef.current = requestAnimationFrame(animate);
    return () => {
      if (collisionAnimRef.current) cancelAnimationFrame(collisionAnimRef.current);
    };
  }, [collisionRings.length, collisionMode]);

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

  // Calculate ring velocity based on radius
  const calculateRingSpeed = (radius: number): number => {
    // v ≈ Γ/(4πR) × ln(8R/a) - smaller rings are faster
    const coreRadius = radius * 0.2;
    const circulation = 100; // arbitrary constant
    return (circulation / (4 * Math.PI * radius)) * Math.log(8 * radius / coreRadius);
  };

  // Launch a vortex ring
  const launchRing = () => {
    if (launching) return;
    setLaunching(true);
    playSound(200, 0.3, 'sine', 0.3);

    const radius = pulseSize === 'small' ? 15 : pulseSize === 'medium' ? 25 : 40;
    const speed = calculateRingSpeed(radius);

    const newRing: VortexRing = {
      id: ringIdRef.current++,
      x: 50,
      y: 150,
      radius,
      coreRadius: radius * 0.2,
      speed,
      rotation: 0,
      opacity: 1
    };

    setRings(prev => [...prev, newRing]);

    // Record trial result
    setTimeout(() => {
      setTrialResults(prev => [...prev, { size: pulseSize, speed: speed.toFixed(2) as unknown as number }]);
      setLaunching(false);
    }, 500);
  };

  // Start collision demonstration
  const startCollision = () => {
    const ring1: VortexRing = {
      id: ringIdRef.current++,
      x: collisionMode === 'chase' ? 50 : 50,
      y: 150,
      radius: 25,
      coreRadius: 5,
      speed: collisionMode === 'chase' ? 3 : 2,
      rotation: 0,
      opacity: 1
    };

    const ring2: VortexRing = {
      id: ringIdRef.current++,
      x: collisionMode === 'chase' ? 120 : 350,
      y: 150,
      radius: 25,
      coreRadius: 5,
      speed: collisionMode === 'chase' ? 1.5 : -2,
      rotation: 0,
      opacity: 1
    };

    setCollisionRings([ring1, ring2]);
    playSound(180, 0.4, 'sine', 0.3);
  };

  // Test questions
  const testQuestions = [
    {
      question: "You blow a small, tight smoke ring and a large, loose one. Which travels faster?",
      options: ["Large ring - more momentum", "Same speed - equal puff", "Small ring - higher induced velocity", "Depends on smoke density"],
      correct: 2
    },
    {
      question: "What gives a vortex ring its self-propulsion?",
      options: ["Initial push continues forever", "Rotating fluid induces forward flow", "Surrounding air pushes it", "Pressure difference front to back"],
      correct: 1
    },
    {
      question: "Dolphins blow bubble rings. Why do the rings rise AND move forward?",
      options: ["Dolphin pushes them", "Buoyancy + self-propulsion", "Water currents only", "Bubble expansion"],
      correct: 1
    },
    {
      question: "Two vortex rings chase each other. What happens when the fast one catches up?",
      options: ["They merge into one big ring", "They bounce apart", "Leapfrog - they pass through each other", "Both disappear"],
      correct: 2
    },
    {
      question: "Why do artillery 'vortex cannons' create rings instead of just air blasts?",
      options: ["Circular openings force rotation", "Explosives spin naturally", "Random coincidence", "Sound waves create rings"],
      correct: 0
    },
    {
      question: "A vortex ring's core spins. What direction relative to motion?",
      options: ["Same direction as travel", "Perpendicular, rolling like a donut", "Against travel direction", "No spin, just translation"],
      correct: 1
    },
    {
      question: "Why do smoke rings eventually fade and slow down?",
      options: ["Gravity pulls them down", "Viscosity dissipates rotation", "They run out of energy", "Air absorbs the smoke"],
      correct: 1
    },
    {
      question: "How does the heart's left ventricle efficiently fill?",
      options: ["Simple suction", "Vortex ring forms, swirling blood inward", "Passive pressure", "Muscle pumping only"],
      correct: 1
    },
    {
      question: "Volcanic eruptions sometimes produce massive rings. What determines their size?",
      options: ["Crater diameter only", "Eruption velocity only", "Both opening size and pulse characteristics", "Temperature of gases"],
      correct: 2
    },
    {
      question: "To make a vortex ring travel farther, you should:",
      options: ["Make it bigger and slower", "Make it smaller and faster", "Add more smoke", "Blow harder without changing size"],
      correct: 1
    }
  ];

  // Real-world applications
  const applications = [
    {
      icon: "🎯",
      title: "Vortex Cannons",
      short: "Air pulse weapons",
      tagline: "From toys to crowd control",
      description: "Vortex cannons fire concentrated air pulses that maintain their structure over distance, delivering impact without projectiles.",
      connection: "The toroidal vortex structure keeps energy concentrated instead of dispersing like a normal air blast.",
      howItWorks: "A flexible membrane or piston rapidly compresses air through a circular opening. The edge friction creates rotation, forming a stable ring that travels coherently.",
      stats: ["Range: 10-50 meters", "Speed: 30-100 km/h", "Maintains shape for seconds"],
      examples: ["AirZooka toys", "Crowd dispersal devices", "Festival confetti launchers", "Special effects"],
      companies: ["AirZooka", "Vortex", "Industrial SFX"],
      futureImpact: "Non-lethal defense systems and theatrical effects use vortex ring physics for precise, ranged air delivery.",
      color: "#FF6B6B"
    },
    {
      icon: "🐬",
      title: "Marine Propulsion",
      short: "Jellyfish & squid",
      tagline: "Nature's jet engines",
      description: "Jellyfish and squid produce vortex rings with each pulse, achieving remarkable efficiency in underwater locomotion.",
      connection: "By generating ring vortices, these creatures push water more efficiently than simple jets, with less energy waste.",
      howItWorks: "Muscle contraction expels water through an opening, forming vortex rings. The ring's self-induced velocity adds to propulsive thrust while minimizing turbulent mixing losses.",
      stats: ["Jellyfish: 80% efficient", "Squid: 8 m/s bursts", "Heart: 65% fill efficiency"],
      examples: ["Jellyfish propulsion", "Squid escape jets", "Fish tail vortex wakes", "Heart ventricle filling"],
      companies: ["Festo (bionic jellyfish)", "Navy research", "Cardiac device makers"],
      futureImpact: "Biomimetic underwater vehicles copy vortex-based propulsion for silent, efficient AUVs and submarines.",
      color: "#4ECDC4"
    },
    {
      icon: "🌋",
      title: "Volcanic Eruptions",
      short: "Natural giant rings",
      tagline: "Earth's smoke signals",
      description: "Explosive volcanic eruptions can generate massive vortex rings visible from miles away, scaling the physics to extreme sizes.",
      connection: "The same fluid dynamics that create smoke rings also work at 100-meter scales with volcanic gases and ash.",
      howItWorks: "Rapid gas expansion through the crater opening creates circulation. The hot, buoyant gases rise while the ring structure keeps them coherent far longer than dispersed plumes.",
      stats: ["Mt. Etna: 200m diameter", "Rise: 1000m before dispersing", "Duration: several minutes"],
      examples: ["Mt. Etna's famous rings", "Stromboli eruptions", "Eyjafjallajökull 2010", "Anak Krakatau"],
      companies: ["USGS", "Volcanic observatories", "Climate researchers"],
      futureImpact: "Understanding volcanic vortex dynamics helps predict ash dispersal for aviation safety.",
      color: "#FF8C00"
    },
    {
      icon: "❤️",
      title: "Cardiac Flow",
      short: "Heart vortices",
      tagline: "Your heart makes rings",
      description: "Blood entering the heart's ventricles forms vortex rings that optimize filling efficiency and minimize energy loss.",
      connection: "The vortex ring pattern helps blood swirl smoothly into position for ejection, rather than sloshing chaotically.",
      howItWorks: "As the mitral valve opens, blood jets through and curls into a ring vortex. This swirling motion redirects flow toward the outlet, preloading the ventricle for efficient pumping.",
      stats: ["Fill time: ~500ms", "Efficiency gain: 20-30%", "Ring diameter: 2-3cm"],
      examples: ["Left ventricle filling", "Artificial heart design", "Valve replacement optimization", "Heart failure diagnosis"],
      companies: ["Medtronic", "Abbott", "Edwards Lifesciences"],
      futureImpact: "MRI flow imaging detects abnormal vortex patterns as early heart disease indicators.",
      color: "#E91E63"
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
    ring: '#6366F1'
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

  // Render single vortex ring SVG
  const renderRingSVG = (ring: VortexRing, offsetX: number = 0) => {
    const particles = 12;
    return (
      <g key={ring.id} transform={`translate(${ring.x + offsetX}, ${ring.y})`} opacity={ring.opacity}>
        {/* Ring core - donut shape */}
        <ellipse
          cx="0"
          cy="0"
          rx={ring.radius}
          ry={ring.radius * 0.3}
          fill="none"
          stroke={colors.ring}
          strokeWidth="3"
          opacity="0.8"
        />
        {/* Spinning particles around core */}
        {Array.from({ length: particles }).map((_, i) => {
          const angle = (ring.rotation + (i * 360 / particles)) * Math.PI / 180;
          const x = ring.radius * Math.cos(angle);
          const y = (ring.radius * 0.3) * Math.sin(angle);
          const scale = 0.5 + 0.5 * Math.sin(angle);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={3 * scale}
              fill={colors.primary}
              opacity={0.6 + 0.4 * scale}
            />
          );
        })}
        {/* Velocity arrow */}
        <line
          x1={ring.radius + 10}
          y1="0"
          x2={ring.radius + 25}
          y2="0"
          stroke={colors.success}
          strokeWidth="2"
          markerEnd="url(#arrowhead)"
          opacity="0.6"
        />
      </g>
    );
  };

  // PHASE RENDERS

  // Hook Phase
  const renderHook = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("💨", "Air Donuts", "The physics of smoke rings")}

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
              Blow a smoke ring, and it doesn't just disperse like breath.<br/>
              It <span style={{ color: colors.primary }}>holds its shape</span> and <span style={{ color: colors.accent }}>travels across the room</span>.
            </p>

            <svg width="300" height="200" viewBox="0 0 300 200" style={{ margin: '0 auto', display: 'block' }}>
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill={colors.success} />
                </marker>
              </defs>

              {/* Person's head outline */}
              <circle cx="40" cy="100" r="25" fill="#444" />
              <circle cx="55" cy="100" r="5" fill="#666" /> {/* Mouth */}

              {/* Smoke ring traveling */}
              {showSmokeRing ? (
                <>
                  <ellipse cx="180" cy="100" rx="40" ry="15" fill="none" stroke={colors.ring} strokeWidth="8" opacity="0.7" />
                  <ellipse cx="180" cy="100" rx="40" ry="15" fill="none" stroke={colors.primary} strokeWidth="2" opacity="0.9" />
                  {/* Direction arrow */}
                  <line x1="230" y1="100" x2="270" y2="100" stroke={colors.success} strokeWidth="2" markerEnd="url(#arrowhead)" />
                  <text x="250" y="130" fill={colors.textSecondary} fontSize="12">traveling</text>
                </>
              ) : (
                <>
                  <ellipse cx="80" cy="100" rx="15" ry="6" fill="none" stroke={colors.ring} strokeWidth="4" opacity="0.5" />
                  <text x="150" y="100" fill={colors.textSecondary} fontSize="14" textAnchor="middle">Click to blow a ring</text>
                </>
              )}
            </svg>

            <button
              onMouseDown={() => {
                setShowSmokeRing(true);
                playSound(180, 0.5, 'sine', 0.3);
              }}
              style={{
                marginTop: '16px',
                padding: '12px 28px',
                fontSize: '16px',
                background: `linear-gradient(135deg, ${colors.ring}, ${colors.secondary})`,
                color: colors.text,
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
            >
              💨 Blow Ring
            </button>

            {showSmokeRing && (
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
              🤔 How does a ring of air <span style={{ color: colors.primary }}>push itself forward</span>?
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '16px', lineHeight: 1.6, marginBottom: '20px' }}>
              There's no fan behind it. No wind. Yet it glides steadily through still air.
            </p>
            <div style={{
              background: colors.background,
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '16px'
            }}>
              <p style={{ color: colors.accent, fontSize: '18px', margin: 0 }}>
                The secret: it's a <strong>self-propelling vortex</strong> — air rotating around a donut shape.
              </p>
            </div>

            {renderKeyTakeaway("Vortex rings are nature's self-driving vehicles — their rotation creates their own forward motion!")}
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
      {renderSectionHeader("🔮", "Make a Prediction", "Think about ring size and speed")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px'
      }}>
        <p style={{ color: colors.text, fontSize: '17px', lineHeight: 1.6, marginBottom: '24px' }}>
          Imagine you blow two smoke rings — one <span style={{ color: colors.primary }}>small and tight</span>, one <span style={{ color: colors.accent }}>large and loose</span>.
        </p>

        <svg width="100%" height="150" viewBox="0 0 400 150" style={{ marginBottom: '20px' }}>
          {/* Small ring */}
          <g transform="translate(120, 75)">
            <ellipse rx="20" ry="8" fill="none" stroke={colors.primary} strokeWidth="4" />
            <text y="40" fill={colors.primary} fontSize="14" textAnchor="middle">Small Ring</text>
          </g>
          {/* Large ring */}
          <g transform="translate(280, 75)">
            <ellipse rx="45" ry="18" fill="none" stroke={colors.accent} strokeWidth="4" />
            <text y="50" fill={colors.accent} fontSize="14" textAnchor="middle">Large Ring</text>
          </g>
          {/* VS */}
          <text x="200" y="80" fill={colors.textSecondary} fontSize="16" textAnchor="middle">vs</text>
        </svg>

        <p style={{ color: colors.text, fontSize: '18px', fontWeight: '600', marginBottom: '16px', textAlign: 'center' }}>
          Which ring travels faster through the air?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { value: 'small', label: 'Small ring — tight rotation means faster movement', color: colors.primary },
            { value: 'large', label: 'Large ring — more air means more momentum', color: colors.accent },
            { value: 'same', label: 'Same speed — size doesn\'t affect velocity', color: colors.secondary }
          ].map(option => (
            <button
              key={option.value}
              onMouseDown={() => {
                setPrediction(option.value);
                playSound(330, 0.1, 'sine', 0.2);
                emitEvent('prediction', { predicted: option.value, question: 'ring_speed' });
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
              playSound(prediction === 'small' ? 600 : 300, 0.3, 'sine', 0.3);
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
            background: prediction === 'small' ? `${colors.success}20` : `${colors.accent}20`,
            borderRadius: '12px',
            border: `2px solid ${prediction === 'small' ? colors.success : colors.accent}`
          }}>
            {prediction === 'small' ? (
              <>
                <p style={{ color: colors.success, fontSize: '18px', fontWeight: '600', margin: '0 0 12px 0' }}>
                  ✓ Correct thinking!
                </p>
                <p style={{ color: colors.text, margin: 0, lineHeight: 1.6 }}>
                  Smaller rings do travel faster! The induced velocity from the rotation is inversely proportional to the ring radius.
                </p>
              </>
            ) : (
              <>
                <p style={{ color: colors.accent, fontSize: '18px', fontWeight: '600', margin: '0 0 12px 0' }}>
                  Interesting guess! Let's explore...
                </p>
                <p style={{ color: colors.text, margin: 0, lineHeight: 1.6 }}>
                  Actually, smaller rings travel faster! More momentum doesn't help — tighter rotation creates faster self-propulsion.
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
      {renderSectionHeader("🎮", "Vortex Ring Lab", "Launch rings and measure their speed")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        {/* Ring launcher visualization */}
        <svg width="100%" height="200" viewBox="0 0 400 200" style={{ background: colors.background, borderRadius: '12px' }}>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={colors.success} />
            </marker>
            <linearGradient id="cannonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#444" />
              <stop offset="100%" stopColor="#666" />
            </linearGradient>
          </defs>

          {/* Vortex cannon */}
          <rect x="20" y="120" width="50" height="60" rx="5" fill="url(#cannonGrad)" />
          <ellipse cx="70" cy="150" rx="8" ry="20" fill="#333" />
          <text x="45" y="105" fill={colors.textSecondary} fontSize="10" textAnchor="middle">Cannon</text>

          {/* Distance markers */}
          {[100, 200, 300].map(x => (
            <g key={x}>
              <line x1={x} y1="180" x2={x} y2="190" stroke={colors.textSecondary} strokeWidth="1" />
              <text x={x} y="198" fill={colors.textSecondary} fontSize="9" textAnchor="middle">{x - 50}cm</text>
            </g>
          ))}

          {/* Render active rings */}
          {rings.map(ring => renderRingSVG(ring))}

          {/* Launch effect */}
          {launching && (
            <circle cx="70" cy="150" r="15" fill={colors.primary} opacity="0.5">
              <animate attributeName="r" from="15" to="30" dur="0.3s" />
              <animate attributeName="opacity" from="0.5" to="0" dur="0.3s" />
            </circle>
          )}
        </svg>

        {/* Controls */}
        <div style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <span style={{ color: colors.textSecondary, fontSize: '13px', marginRight: '8px' }}>Ring Size:</span>
            {(['small', 'medium', 'large'] as const).map(size => (
              <button
                key={size}
                onMouseDown={() => setPulseSize(size)}
                style={{
                  padding: '8px 14px',
                  margin: '0 4px',
                  background: pulseSize === size ? colors.primary : colors.background,
                  color: pulseSize === size ? colors.background : colors.textSecondary,
                  border: `1px solid ${pulseSize === size ? colors.primary : '#444'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: pulseSize === size ? '600' : '400'
                }}
              >
                {size.charAt(0).toUpperCase() + size.slice(1)}
              </button>
            ))}
          </div>

          <button
            onMouseDown={launchRing}
            disabled={launching}
            style={{
              padding: '12px 24px',
              background: launching ? '#444' : `linear-gradient(135deg, ${colors.ring}, ${colors.secondary})`,
              color: colors.text,
              border: 'none',
              borderRadius: '10px',
              cursor: launching ? 'not-allowed' : 'pointer',
              fontSize: '15px',
              fontWeight: '600'
            }}
          >
            💨 Launch Ring
          </button>

          <button
            onMouseDown={() => {
              setRings([]);
              setTrialResults([]);
            }}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              color: colors.textSecondary,
              border: `1px solid ${colors.textSecondary}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Clear
          </button>
        </div>

        {/* Results table */}
        {trialResults.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <p style={{ color: colors.text, fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Trial Results:</p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: '8px'
            }}>
              {trialResults.map((result, i) => (
                <div key={i} style={{
                  padding: '8px 12px',
                  background: colors.background,
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: colors.textSecondary, fontSize: '11px' }}>{result.size}</div>
                  <div style={{ color: colors.primary, fontSize: '16px', fontWeight: '600' }}>
                    {typeof result.speed === 'number' ? result.speed.toFixed(1) : result.speed} m/s
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Physics explanation */}
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: colors.background,
          borderRadius: '12px',
          border: `1px solid ${colors.ring}30`
        }}>
          <p style={{ color: colors.ring, fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0' }}>
            Why smaller = faster?
          </p>
          <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
            Ring velocity ≈ Γ/(4πR) — inversely proportional to radius R.<br/>
            Tighter rotation concentrates the induced velocity, propelling the ring faster.
          </p>
        </div>
      </div>

      {renderKeyTakeaway("Small, tight vortex rings travel faster because the induced velocity from rotation scales inversely with ring radius.")}

      {trialResults.length >= 3 && renderBottomBar(() => goToPhase('review'))}
    </div>
  );

  // Review Phase
  const renderReview = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("📚", "How Vortex Rings Work", "The physics of self-propulsion")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px'
      }}>
        <svg width="100%" height="220" viewBox="0 0 400 220">
          {/* Ring cross-section */}
          <g transform="translate(200, 110)">
            {/* Outer ring shape */}
            <ellipse rx="80" ry="30" fill="none" stroke={colors.ring} strokeWidth="3" opacity="0.5" />

            {/* Cross-section circles showing rotation */}
            <g transform="translate(-80, 0)">
              <circle r="15" fill={colors.primary} opacity="0.3" />
              <path d="M 0 -15 A 15 15 0 0 1 0 15" fill="none" stroke={colors.success} strokeWidth="2" markerEnd="url(#arrowhead)" />
              <text y="35" fill={colors.textSecondary} fontSize="10" textAnchor="middle">Core spin</text>
            </g>

            <g transform="translate(80, 0)">
              <circle r="15" fill={colors.primary} opacity="0.3" />
              <path d="M 0 15 A 15 15 0 0 1 0 -15" fill="none" stroke={colors.success} strokeWidth="2" markerEnd="url(#arrowhead)" />
              <text y="35" fill={colors.textSecondary} fontSize="10" textAnchor="middle">Core spin</text>
            </g>

            {/* Induced velocity arrow */}
            <line x1="100" y1="0" x2="160" y2="0" stroke={colors.accent} strokeWidth="3" markerEnd="url(#arrowhead)" />
            <text x="130" y="-15" fill={colors.accent} fontSize="12" textAnchor="middle">Travel</text>

            {/* Center label */}
            <text y="0" fill={colors.text} fontSize="11" textAnchor="middle">Air flows through center</text>
          </g>

          {/* Labels */}
          <text x="200" y="30" fill={colors.text} fontSize="14" textAnchor="middle" fontWeight="600">
            Vortex Ring Cross-Section
          </text>
        </svg>

        <div style={{ display: 'grid', gap: '16px', marginTop: '20px' }}>
          {[
            { title: "1. Donut of Spin", text: "Air rotates around the ring's circular core — like a spinning donut.", color: colors.primary },
            { title: "2. Induced Velocity", text: "The spinning pulls air through the center, pushing the ring forward — self-propulsion!", color: colors.success },
            { title: "3. Size vs Speed", text: "v ∝ 1/R — smaller radius means tighter rotation and faster forward velocity.", color: colors.accent },
            { title: "4. Stability", text: "The toroidal shape is stable — rings maintain coherence far longer than turbulent jets.", color: colors.ring }
          ].map((item, i) => (
            <div key={i} style={{
              padding: '16px',
              background: `${item.color}10`,
              borderRadius: '12px',
              borderLeft: `4px solid ${item.color}`
            }}>
              <p style={{ color: item.color, fontWeight: '600', margin: '0 0 4px 0', fontSize: '14px' }}>
                {item.title}
              </p>
              <p style={{ color: colors.textSecondary, margin: 0, fontSize: '13px', lineHeight: 1.5 }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>

        {renderKeyTakeaway("Vortex rings are self-propelled by their own rotation — the spinning core induces forward airflow, creating motion without external force.")}
      </div>

      {renderBottomBar(() => goToPhase('twist_predict'))}
    </div>
  );

  // Twist Predict Phase
  const renderTwistPredict = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("🔄", "Ring Collisions", "What happens when rings meet?")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px'
      }}>
        <p style={{ color: colors.text, fontSize: '17px', lineHeight: 1.6, marginBottom: '24px' }}>
          A fast, small ring catches up to a slower, larger ring traveling the same direction.
          What happens when they meet?
        </p>

        <svg width="100%" height="120" viewBox="0 0 400 120">
          {/* Fast ring (behind) */}
          <g transform="translate(100, 60)">
            <ellipse rx="20" ry="8" fill="none" stroke={colors.primary} strokeWidth="4" />
            <line x1="30" y1="0" x2="60" y2="0" stroke={colors.success} strokeWidth="2" markerEnd="url(#arrowhead)" />
            <text y="-20" fill={colors.primary} fontSize="11" textAnchor="middle">Fast</text>
          </g>

          {/* Slow ring (ahead) */}
          <g transform="translate(250, 60)">
            <ellipse rx="35" ry="14" fill="none" stroke={colors.accent} strokeWidth="4" />
            <line x1="45" y1="0" x2="65" y2="0" stroke={colors.success} strokeWidth="2" markerEnd="url(#arrowhead)" opacity="0.5" />
            <text y="-25" fill={colors.accent} fontSize="11" textAnchor="middle">Slow</text>
          </g>

          <text x="175" y="100" fill={colors.textSecondary} fontSize="12" textAnchor="middle">What happens?</text>
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
          {[
            { value: 'merge', label: 'They merge into one bigger ring', color: colors.ring },
            { value: 'bounce', label: 'They bounce off each other', color: colors.warning },
            { value: 'leapfrog', label: 'They pass through each other (leapfrog)', color: colors.success },
            { value: 'destroy', label: 'They break apart into turbulence', color: colors.accent }
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
              playSound(twistPrediction === 'leapfrog' ? 600 : 300, 0.3, 'sine', 0.3);
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
            background: twistPrediction === 'leapfrog' ? `${colors.success}20` : `${colors.accent}20`,
            borderRadius: '12px',
            border: `2px solid ${twistPrediction === 'leapfrog' ? colors.success : colors.accent}`
          }}>
            {twistPrediction === 'leapfrog' ? (
              <p style={{ color: colors.success, margin: 0 }}>
                <strong>✓ Exactly!</strong> Vortex rings can pass through each other in a mesmerizing "leapfrog" motion — each one alternately shrinking and speeding up, then expanding and slowing down!
              </p>
            ) : (
              <p style={{ color: colors.accent, margin: 0 }}>
                <strong>Surprising answer!</strong> They actually leapfrog! The trailing ring shrinks and accelerates through the leading ring, which expands and slows. Then they swap roles repeatedly!
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
      {renderSectionHeader("🎮", "Ring Collision Lab", "Watch rings interact")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        {/* Collision mode selector */}
        <div style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
          {(['chase', 'headon'] as const).map(mode => (
            <button
              key={mode}
              onMouseDown={() => {
                setCollisionMode(mode);
                setCollisionRings([]);
              }}
              style={{
                padding: '10px 20px',
                background: collisionMode === mode ? colors.primary : colors.background,
                color: collisionMode === mode ? colors.background : colors.textSecondary,
                border: `1px solid ${collisionMode === mode ? colors.primary : '#444'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: collisionMode === mode ? '600' : '400'
              }}
            >
              {mode === 'chase' ? '🏃 Chase (Leapfrog)' : '💥 Head-On'}
            </button>
          ))}
        </div>

        {/* Collision visualization */}
        <svg width="100%" height="180" viewBox="0 0 400 180" style={{ background: colors.background, borderRadius: '12px' }}>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={colors.success} />
            </marker>
          </defs>

          {/* Render collision rings */}
          {collisionRings.map((ring, i) => (
            <g key={ring.id} transform={`translate(${ring.x}, ${ring.y})`} opacity={ring.opacity}>
              <ellipse
                rx={ring.radius}
                ry={ring.radius * 0.3}
                fill="none"
                stroke={i === 0 ? colors.primary : colors.accent}
                strokeWidth="4"
              />
              {Array.from({ length: 8 }).map((_, j) => {
                const angle = (ring.rotation + j * 45) * Math.PI / 180;
                const x = ring.radius * Math.cos(angle);
                const y = (ring.radius * 0.3) * Math.sin(angle);
                return (
                  <circle
                    key={j}
                    cx={x}
                    cy={y}
                    r={2}
                    fill={i === 0 ? colors.primary : colors.accent}
                    opacity="0.7"
                  />
                );
              })}
            </g>
          ))}

          {/* Instructions if no rings */}
          {collisionRings.length === 0 && (
            <text x="200" y="90" fill={colors.textSecondary} fontSize="14" textAnchor="middle">
              Click "Start Collision" to see {collisionMode === 'chase' ? 'leapfrog' : 'head-on'} interaction
            </text>
          )}
        </svg>

        <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
          <button
            onMouseDown={startCollision}
            style={{
              padding: '12px 24px',
              background: `linear-gradient(135deg, ${colors.ring}, ${colors.secondary})`,
              color: colors.text,
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600'
            }}
          >
            🎬 Start Collision
          </button>

          <button
            onMouseDown={() => setCollisionRings([])}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              color: colors.textSecondary,
              border: `1px solid ${colors.textSecondary}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Reset
          </button>
        </div>

        {/* Explanation */}
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: colors.background,
          borderRadius: '12px',
          border: `1px solid ${colors.ring}30`
        }}>
          {collisionMode === 'chase' ? (
            <>
              <p style={{ color: colors.ring, fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0' }}>
                Leapfrog Effect:
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
                When a faster ring catches a slower one, the trailing ring shrinks (speeds up) and passes through.
                The leading ring expands (slows down). Then they swap roles! This can repeat indefinitely.
              </p>
            </>
          ) : (
            <>
              <p style={{ color: colors.ring, fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0' }}>
                Head-On Collision:
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
                When rings collide head-on, they expand outward and eventually break apart into turbulence.
                The rotations partially cancel, and the coherent structure is lost.
              </p>
            </>
          )}
        </div>
      </div>

      {renderKeyTakeaway("Vortex rings can pass through each other! The 'leapfrog' effect shows how they exchange size and speed without breaking apart.")}

      {renderBottomBar(() => goToPhase('twist_review'))}
    </div>
  );

  // Twist Review Phase
  const renderTwistReview = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("🔬", "Ring Interaction Physics", "Why leapfrog works")}

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
              🔄 Mutual Influence
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              Each ring's rotation induces velocity in nearby fluid — including the other ring.
              When the fast ring approaches, it pushes the slow ring's inner edge, making it expand.
            </p>
          </div>

          <div style={{
            padding: '20px',
            background: colors.background,
            borderRadius: '12px'
          }}>
            <p style={{ color: colors.success, fontWeight: '600', margin: '0 0 8px 0' }}>
              ↔️ Size-Speed Exchange
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              As the trailing ring passes through, it contracts (speeding up) while the other expands (slowing down).
              Total circulation is conserved — they just trade characteristics!
            </p>
          </div>

          <div style={{
            padding: '20px',
            background: colors.background,
            borderRadius: '12px'
          }}>
            <p style={{ color: colors.accent, fontWeight: '600', margin: '0 0 8px 0' }}>
              🎭 Role Reversal
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              Now the former slow ring is small and fast, while the former fast ring is large and slow.
              The leapfrog continues as they keep swapping roles!
            </p>
          </div>
        </div>

        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: `linear-gradient(135deg, ${colors.ring}15, ${colors.secondary}15)`,
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <p style={{ color: colors.text, fontSize: '15px', margin: 0 }}>
            This phenomenon demonstrates <strong>vortex reconnection</strong> — rings can interact,
            pass through each other, or combine, all governed by circulation conservation.
          </p>
        </div>

        {renderKeyTakeaway("Vortex rings exchange properties through mutual induction — demonstrating how rotational flows interact without colliding like solid objects.")}
      </div>

      {renderBottomBar(() => goToPhase('transfer'))}
    </div>
  );

  // Transfer Phase
  const renderTransfer = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("🌍", "Real-World Vortex Rings", "From toys to hearts")}

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
                  {calculateScore() >= 8 ? "Vortex Master!" :
                   calculateScore() >= 6 ? "Great understanding!" :
                   "Keep learning about fluid dynamics!"}
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
          background: `linear-gradient(135deg, ${colors.ring}20, ${colors.secondary}20)`,
          borderRadius: '20px',
          padding: '32px',
          textAlign: 'center',
          marginBottom: '20px',
          border: `2px solid ${colors.ring}50`,
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
                background: [colors.primary, colors.secondary, colors.accent, colors.success, colors.ring][i % 5],
                borderRadius: i % 2 === 0 ? '50%' : '2px',
                left: `${Math.random() * 100}%`,
                top: '-20px',
                animation: `fall ${2 + Math.random() * 2}s linear infinite`,
                animationDelay: `${Math.random() * 2}s`,
                opacity: 0.8
              }}
            />
          ))}

          <div style={{ fontSize: '64px', marginBottom: '16px' }}>💨🎓</div>

          <h2 style={{ color: colors.text, margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700' }}>
            Vortex Ring Master!
          </h2>

          <p style={{ color: colors.textSecondary, margin: '0 0 24px 0', fontSize: '16px' }}>
            You've mastered the physics of self-propelling air donuts
          </p>

          <div style={{
            display: 'inline-block',
            padding: '16px 32px',
            background: colors.card,
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <div style={{ color: colors.ring, fontSize: '36px', fontWeight: '700' }}>
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
              { icon: "🔄", title: "Self-Propulsion", text: "Rotation induces forward velocity" },
              { icon: "📏", title: "Size Matters", text: "Small rings travel faster than large" },
              { icon: "🐸", title: "Leapfrog Effect", text: "Rings can pass through each other" }
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

        {renderKeyTakeaway("From smoke rings to heart valves, vortex ring physics explains how rotating fluid structures propel themselves through their environment.")}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            🌀 You now understand the fluid dynamics that power everything from jellyfish to volcanic eruptions!
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

export default VortexRingsRenderer;
