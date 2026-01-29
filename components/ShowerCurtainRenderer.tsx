'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'parameter_changed'
  | 'twist_prediction_made'
  | 'app_explored'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved';

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

// String-based phases for game progression
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
const PHASE_ORDER: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Hook', predict: 'Predict', play: 'Lab', review: 'Review', twist_predict: 'Twist Predict',
  twist_play: 'Twist Lab', twist_review: 'Twist Review', transfer: 'Transfer', test: 'Test', mastery: 'Mastery'
};

interface ShowerCurtainRendererProps {
  currentPhase?: Phase;
  onPhaseComplete?: (phase: Phase) => void;
}

const ShowerCurtainRenderer: React.FC<ShowerCurtainRendererProps> = ({ currentPhase, onPhaseComplete }) => {
  // Phase management
  const [phase, setPhase] = useState<Phase>(currentPhase ?? 'hook');

  // Hook phase
  const [hookStep, setHookStep] = useState(0);
  const [showerOn, setShowerOn] = useState(false);
  const [curtainBulge, setCurtainBulge] = useState(0);

  // Predict phase
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showPredictResult, setShowPredictResult] = useState(false);

  // Play phase - shower simulator
  const [waterFlow, setWaterFlow] = useState(0);
  const [waterTemp, setWaterTemp] = useState(40);
  const [showPressureField, setShowPressureField] = useState(true);
  const [showAirflow, setShowAirflow] = useState(true);

  // Twist phase - cold vs hot
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistResult, setShowTwistResult] = useState(false);
  const [tempMode, setTempMode] = useState<'cold' | 'hot'>('hot');

  // Transfer phase
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set([0]));

  // Test phase
  const [testAnswers, setTestAnswers] = useState<number[]>([]);
  const [showTestResults, setShowTestResults] = useState(false);

  // UI state
  const [isMobile, setIsMobile] = useState(false);
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);
  const animationRef = useRef<number>();

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Phase sync
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

  // Hook phase curtain animation
  useEffect(() => {
    if (!showerOn) {
      setCurtainBulge(0);
      return;
    }

    const animate = () => {
      setCurtainBulge(prev => {
        const target = 30;
        const diff = target - prev;
        return prev + diff * 0.1 + Math.sin(Date.now() / 500) * 2;
      });
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [showerOn]);

  // Calculate curtain bulge based on flow and temp
  const calculateBulge = (): number => {
    const flowEffect = waterFlow * 0.4;
    const tempEffect = waterTemp > 30 ? (waterTemp - 20) * 0.2 : 0;
    return flowEffect + tempEffect + Math.sin(Date.now() / 500) * 2;
  };

  // Sound utility
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

  // Phase navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onPhaseComplete]);

  const goToNextPhase = useCallback(() => {
    const currentIndex = PHASE_ORDER.indexOf(phase);
    if (currentIndex < PHASE_ORDER.length - 1) {
      goToPhase(PHASE_ORDER[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Test questions
  const testQuestions = [
    {
      question: "What causes the shower curtain to blow inward?",
      options: [{ text: "Water pushing it", correct: false }, { text: "Low pressure inside from air entrainment", correct: true }, { text: "High pressure inside", correct: false }, { text: "Magnetic force", correct: false }]
    },
    {
      question: "Bernoulli's principle states that faster-moving air has:",
      options: [{ text: "Higher pressure", correct: false }, { text: "Lower pressure", correct: true }, { text: "Same pressure", correct: false }, { text: "More temperature", correct: false }]
    },
    {
      question: "What is 'entrainment' in fluid dynamics?",
      options: [{ text: "Heating a fluid", correct: false }, { text: "Moving fluid drags surrounding fluid along", correct: true }, { text: "Fluid compression", correct: false }, { text: "Fluid freezing", correct: false }]
    },
    {
      question: "Hot showers cause MORE curtain movement because:",
      options: [{ text: "Hot water is heavier", correct: false }, { text: "Rising hot air creates additional convection currents", correct: true }, { text: "Cold curtain attracts heat", correct: false }, { text: "Hot water has more pressure", correct: false }]
    },
    {
      question: "The shower curtain effect is used in which engineering application?",
      options: [{ text: "Only bathrooms", correct: false }, { text: "Venturi tubes and atomizers", correct: true }, { text: "Electrical circuits", correct: false }, { text: "Building foundations", correct: false }]
    },
    {
      question: "Why does a passing truck 'suck' you toward it?",
      options: [{ text: "Magnetic attraction", correct: false }, { text: "Low pressure in the truck's wake (entrainment)", correct: true }, { text: "Gravity increase", correct: false }, { text: "Static electricity", correct: false }]
    },
    {
      question: "A spray bottle uses entrainment to:",
      options: [{ text: "Heat the liquid", correct: false }, { text: "Mix air into the spray stream", correct: false }, { text: "Draw liquid up the tube by low pressure", correct: true }, { text: "Change liquid color", correct: false }]
    },
    {
      question: "Which would cause the LEAST shower curtain movement?",
      options: [{ text: "Hot, high-flow shower", correct: false }, { text: "Cold, high-flow shower", correct: false }, { text: "Cold, low-flow shower", correct: true }, { text: "Hot, low-flow shower", correct: false }]
    },
    {
      question: "A horizontal vortex forms in the shower because:",
      options: [{ text: "Earth's rotation", correct: false }, { text: "Water drops drag air down, which then recirculates", correct: true }, { text: "Soap creates vortices", correct: false }, { text: "Curtain spinning", correct: false }]
    },
    {
      question: "Heavy shower curtains with magnets at the bottom help because:",
      options: [{ text: "They conduct electricity", correct: false }, { text: "Weight and attachment resist the pressure difference", correct: true }, { text: "Magnets repel water", correct: false }, { text: "They heat up faster", correct: false }]
    }
  ];

  // Real-world applications
  const applications = [
    {
      icon: "💨",
      title: "Venturi Effect",
      short: "Fluid acceleration",
      tagline: "Speed up, pressure down",
      description: "The Venturi effect uses a constriction to speed up fluid flow, creating low pressure that can draw in other fluids or particles.",
      connection: "Same principle as shower curtain: faster flow creates lower pressure, which draws surrounding material inward.",
      howItWorks: "A tube narrows, forcing fluid to speed up (continuity). By Bernoulli's principle, this faster flow has lower pressure, which can suction other materials.",
      stats: ["Pressure drop: up to 90%", "Used in carburetors, atomizers", "Flow speedup: proportional to area reduction"],
      examples: ["Carburetor fuel mixing", "Spray paint guns", "Vacuum ejectors", "Laboratory aspirators"],
      companies: ["Industrial atomizer manufacturers", "HVAC systems", "Chemical processing"],
      futureImpact: "Advanced Venturi systems are used in green energy applications for water treatment without pumps.",
      color: "#3B82F6"
    },
    {
      icon: "🚄",
      title: "Train Aerodynamics",
      short: "Platform safety",
      tagline: "Stand behind the yellow line",
      description: "Fast-moving trains create low-pressure zones that can pull bystanders toward the tracks — entrainment at dangerous scales.",
      connection: "The train's movement entrains surrounding air, creating a pressure differential that pulls objects toward the train's wake.",
      howItWorks: "Air flows around the train, speeding up along its sides. This creates low pressure that can exert significant force on nearby objects and people.",
      stats: ["Forces: up to 100+ Newtons", "Danger zone: within 1 meter", "High-speed trains: most dangerous"],
      examples: ["Platform safety lines", "High-speed rail design", "Subway ventilation", "Wind barriers"],
      companies: ["Railway operators worldwide", "Siemens Mobility", "Alstom", "CRRC"],
      futureImpact: "Smart platform barriers and aerodynamic train designs reduce entrainment dangers.",
      color: "#EF4444"
    },
    {
      icon: "🏥",
      title: "Medical Nebulizers",
      short: "Drug delivery",
      tagline: "Breathing in medicine",
      description: "Nebulizers use the Venturi effect to atomize liquid medications into fine mists that patients can inhale directly into their lungs.",
      connection: "Compressed air creates low pressure via Venturi effect, drawing liquid up and breaking it into tiny droplets.",
      howItWorks: "High-velocity air jet passes over a liquid reservoir. The low pressure draws liquid into the airstream, which breaks it into microscopic droplets.",
      stats: ["Droplet size: 1-5 micrometers", "Delivery efficiency: 10-20%", "Treatment time: 5-15 minutes"],
      examples: ["Asthma treatment", "COPD medication", "Cystic fibrosis therapy", "General anesthesia"],
      companies: ["Philips Respironics", "PARI", "DeVilbiss Healthcare", "Omron"],
      futureImpact: "Mesh nebulizers and smart inhalers improve drug delivery efficiency using refined entrainment principles.",
      color: "#10B981"
    },
    {
      icon: "🏭",
      title: "Industrial Mixing",
      short: "Jet mixing",
      tagline: "Stirring without stirrers",
      description: "Industrial processes use jet mixing and entrainment to combine fluids without moving mechanical parts.",
      connection: "High-velocity jets entrain surrounding fluid, creating efficient mixing through the same pressure-driven flow as the shower curtain effect.",
      howItWorks: "A high-speed jet of fluid enters a larger volume. Entrainment draws surrounding fluid into the jet, creating thorough mixing.",
      stats: ["Mixing efficiency: 90%+", "No moving parts", "Energy efficient vs mechanical mixing"],
      examples: ["Chemical reactors", "Wastewater treatment", "Food processing", "Paint mixing"],
      companies: ["GEA Group", "Alfa Laval", "SPX Flow", "Silverson"],
      futureImpact: "CFD-optimized jet designs maximize mixing while minimizing energy consumption.",
      color: "#8B5CF6"
    }
  ];

  // Handle test answer
  const handleTestAnswer = (answer: number) => {
    playSound('click');
    setTestAnswers(prev => [...prev, answer]);
  };

  // Calculate test score
  const calculateScore = (): number => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
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
    water: '#60A5FA',
    lowPressure: '#22D3EE',
    highPressure: '#F97316'
  };

  // Helper render functions
  const renderProgressBar = () => {
    const currentIndex = PHASE_ORDER.indexOf(phase);
    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(12px)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '12px 16px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#94a3b8' }}>Shower Curtain</span>
          <span style={{ fontSize: '14px', color: '#64748b' }}>{phaseLabels[phase]}</span>
        </div>
        {/* Premium phase dots */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          {PHASE_ORDER.map((p, i) => (
            <div
              key={p}
              style={{
                height: '8px',
                width: i === currentIndex ? '24px' : '8px',
                borderRadius: '4px',
                background: i < currentIndex ? '#10B981' : i === currentIndex ? colors.primary : '#334155',
                boxShadow: i === currentIndex ? `0 0 12px ${colors.primary}50` : 'none',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>
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
      {/* Premium Badge */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: `${colors.primary}15`,
          border: `1px solid ${colors.primary}30`,
          borderRadius: '9999px'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            background: colors.primary,
            borderRadius: '50%',
            animation: 'pulse 2s infinite'
          }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: colors.primary, letterSpacing: '0.05em' }}>PHYSICS EXPLORATION</span>
        </div>
      </div>
      {/* Gradient Title */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{
          fontSize: isMobile ? '28px' : '36px',
          fontWeight: 900,
          background: `linear-gradient(to right, ${colors.text}, ${colors.primary}, ${colors.secondary})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: '0 0 8px 0'
        }}>The Clingy Curtain</h1>
        <p style={{ margin: 0, color: colors.textSecondary, fontSize: '14px' }}>Why shower curtains attack you</p>
      </div>

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
              You turn on the shower. Within seconds, the curtain starts <span style={{ color: colors.accent }}>blowing inward</span>,
              trying to stick to your legs!
            </p>

            <svg width="300" height="220" viewBox="0 0 300 220" style={{ margin: '0 auto', display: 'block' }}>
              {/* Bathroom frame */}
              <rect x="50" y="20" width="200" height="180" fill="#222" rx="5" />

              {/* Shower head */}
              <rect x="120" y="25" width="60" height="15" fill="#888" rx="3" />
              <ellipse cx="150" cy="45" rx="25" ry="8" fill="#666" />

              {/* Water droplets */}
              {showerOn && Array.from({ length: 15 }).map((_, i) => (
                <circle
                  key={i}
                  cx={125 + (i % 5) * 12}
                  cy={60 + (i * 20) % 120}
                  r={2}
                  fill={colors.water}
                  opacity="0.6"
                >
                  <animate
                    attributeName="cy"
                    values={`${60 + (i * 20) % 120};${180}`}
                    dur={`${0.5 + Math.random() * 0.5}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              ))}

              {/* Person silhouette */}
              <g transform="translate(150, 130)">
                <ellipse cx="0" cy="-50" rx="15" ry="18" fill="#555" />
                <ellipse cx="0" cy="0" rx="25" ry="40" fill="#555" />
              </g>

              {/* Shower curtain */}
              <path
                d={`M 70 40 Q ${70 + curtainBulge} 100 ${70 + curtainBulge * 1.2} 160 Q ${70 + curtainBulge * 0.8} 180 70 195`}
                fill="none"
                stroke="#ff9999"
                strokeWidth="4"
                opacity="0.8"
              />
              <path
                d={`M 230 40 Q ${230 - curtainBulge} 100 ${230 - curtainBulge * 1.2} 160 Q ${230 - curtainBulge * 0.8} 180 230 195`}
                fill="none"
                stroke="#ff9999"
                strokeWidth="4"
                opacity="0.8"
              />

              {/* Curtain rod */}
              <line x1="50" y1="40" x2="250" y2="40" stroke="#666" strokeWidth="4" />

              {/* Labels */}
              {showerOn && curtainBulge > 10 && (
                <>
                  <text x="40" y="130" fill={colors.accent} fontSize="10" textAnchor="end">Blowing in!</text>
                  <text x="260" y="130" fill={colors.accent} fontSize="10" textAnchor="start">Blowing in!</text>
                </>
              )}
            </svg>

            <button
              onMouseDown={() => {
                setShowerOn(true);
                playSound('transition');
              }}
              disabled={showerOn}
              style={{
                marginTop: '16px',
                padding: '12px 28px',
                fontSize: '16px',
                background: showerOn ? '#444' : `linear-gradient(135deg, ${colors.water}, ${colors.secondary})`,
                color: colors.text,
                border: 'none',
                borderRadius: '10px',
                cursor: showerOn ? 'not-allowed' : 'pointer',
                opacity: showerOn ? 0.7 : 1
              }}
            >
              🚿 Turn On Shower
            </button>

            {showerOn && curtainBulge > 20 && (
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
              🤔 Why does the curtain blow <span style={{ color: colors.primary }}>INWARD</span>?
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '16px', lineHeight: 1.6, marginBottom: '20px' }}>
              You'd expect it to blow outward from the spray, but it does the opposite!
            </p>
            <div style={{
              background: colors.background,
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '16px'
            }}>
              <p style={{ color: colors.lowPressure, fontSize: '16px', margin: 0 }}>
                The answer involves <strong>air pressure</strong> and <strong>entrainment</strong> —
                the falling water drags air with it, creating a low-pressure zone inside!
              </p>
            </div>

            {renderKeyTakeaway("Fast-moving fluids create low pressure (Bernoulli's principle). The shower spray entrains air, lowering pressure inside and pulling the curtain inward!")}
          </>
        )}
      </div>

      {hookStep === 1 && renderBottomBar(() => goToNextPhase())}
    </div>
  );

  // Predict Phase
  const renderPredict = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("🔮", "Make a Prediction", "What creates the pressure difference?")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px'
      }}>
        <p style={{ color: colors.text, fontSize: '17px', lineHeight: 1.6, marginBottom: '24px' }}>
          The shower curtain blows inward, meaning pressure is <span style={{ color: colors.lowPressure }}>lower inside</span> than outside.
          What causes this pressure difference?
        </p>

        <svg width="100%" height="120" viewBox="0 0 400 120" style={{ marginBottom: '20px' }}>
          {/* Shower enclosure cross-section */}
          <rect x="100" y="20" width="200" height="80" fill="#222" rx="5" />

          {/* Pressure indicators */}
          <g transform="translate(70, 60)">
            <text fill={colors.highPressure} fontSize="12" textAnchor="middle">HIGH</text>
            <text y="15" fill={colors.highPressure} fontSize="10" textAnchor="middle">Pressure</text>
          </g>
          <g transform="translate(200, 60)">
            <text fill={colors.lowPressure} fontSize="12" textAnchor="middle">LOW</text>
            <text y="15" fill={colors.lowPressure} fontSize="10" textAnchor="middle">Pressure</text>
          </g>
          <g transform="translate(330, 60)">
            <text fill={colors.highPressure} fontSize="12" textAnchor="middle">HIGH</text>
            <text y="15" fill={colors.highPressure} fontSize="10" textAnchor="middle">Pressure</text>
          </g>

          {/* Curtains bulging in */}
          <path d="M 100 30 Q 130 60 100 90" fill="none" stroke="#ff9999" strokeWidth="3" />
          <path d="M 300 30 Q 270 60 300 90" fill="none" stroke="#ff9999" strokeWidth="3" />

          {/* Arrows showing curtain movement */}
          <line x1="80" y1="60" x2="95" y2="60" stroke={colors.warning} strokeWidth="2" markerEnd="url(#arrowP)" />
          <line x1="320" y1="60" x2="305" y2="60" stroke={colors.warning} strokeWidth="2" markerEnd="url(#arrowP)" />
          <defs>
            <marker id="arrowP" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill={colors.warning} />
            </marker>
          </defs>
        </svg>

        <p style={{ color: colors.text, fontSize: '18px', fontWeight: '600', marginBottom: '16px', textAlign: 'center' }}>
          What PRIMARILY causes the low pressure inside?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { value: 'entrainment', label: 'Entrainment — falling water drags air down, creating low pressure', color: colors.success },
            { value: 'hot', label: 'Hot air rising — heat escapes upward, sucking curtain in', color: colors.warning },
            { value: 'push', label: 'Water spray pushing air out the bottom', color: colors.primary },
            { value: 'static', label: 'Static electricity between water and curtain', color: colors.secondary }
          ].map(option => (
            <button
              key={option.value}
              onMouseDown={() => {
                setPrediction(option.value);
                playSound('click');
                console.debug('Game event:', { type: 'prediction_made', data: { predicted: option.value, question: 'cause' } });
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
              playSound(prediction === 'entrainment' ? 'success' : 'failure');
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
            background: prediction === 'entrainment' ? `${colors.success}20` : `${colors.primary}20`,
            borderRadius: '12px',
            border: `2px solid ${prediction === 'entrainment' ? colors.success : colors.primary}`
          }}>
            {prediction === 'entrainment' ? (
              <>
                <p style={{ color: colors.success, fontSize: '18px', fontWeight: '600', margin: '0 0 12px 0' }}>
                  ✓ Correct!
                </p>
                <p style={{ color: colors.text, margin: 0, lineHeight: 1.6 }}>
                  Air entrainment is the primary cause! Falling water droplets drag air molecules downward, creating a low-pressure zone that pulls the curtain inward.
                </p>
              </>
            ) : (
              <>
                <p style={{ color: colors.primary, fontSize: '18px', fontWeight: '600', margin: '0 0 12px 0' }}>
                  {prediction === 'hot' ? "Partially correct!" : "Interesting guess!"}
                </p>
                <p style={{ color: colors.text, margin: 0, lineHeight: 1.6 }}>
                  {prediction === 'hot'
                    ? "Heat convection is a factor, but entrainment is primary! Cold showers also cause curtain movement. The main driver is air being dragged by falling water."
                    : "The main cause is entrainment — falling water drags surrounding air molecules downward, creating low pressure inside the shower."}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {showPredictResult && renderBottomBar(() => goToNextPhase())}
    </div>
  );

  // Play Phase
  const renderPlay = () => {
    const bulge = calculateBulge();
    const flowEffect = waterFlow * 0.4;
    const tempEffect = waterTemp > 30 ? (waterTemp - 20) * 0.2 : 0;

    return (
      <div style={{ padding: isMobile ? '16px' : '24px' }}>
        {renderProgressBar()}
        {renderSectionHeader("🎮", "Shower Simulator", "Control flow and temperature")}

        <div style={{
          background: colors.card,
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          {/* Shower visualization */}
          <div style={{ background: colors.background, borderRadius: '12px', padding: '10px', marginBottom: '16px' }}>
            <svg width="100%" height="220" viewBox="0 0 400 220">
              {/* Shower enclosure */}
              <rect x="100" y="20" width="200" height="180" fill="#1a3a5c" rx="5" opacity="0.3" />

              {/* Pressure fields */}
              {showPressureField && waterFlow > 0 && (
                <>
                  {/* Low pressure inside */}
                  <ellipse cx="200" cy="110" rx={60 + bulge} ry="70" fill={colors.lowPressure} opacity="0.15" />
                  <text x="200" y="110" fill={colors.lowPressure} fontSize="11" textAnchor="middle" opacity="0.8">
                    Low P
                  </text>

                  {/* High pressure outside */}
                  <ellipse cx="60" cy="110" rx="40" ry="50" fill={colors.highPressure} opacity="0.15" />
                  <ellipse cx="340" cy="110" rx="40" ry="50" fill={colors.highPressure} opacity="0.15" />
                </>
              )}

              {/* Shower head */}
              <rect x="170" y="25" width="60" height="12" fill="#888" rx="3" />
              <ellipse cx="200" cy="42" rx="25" ry="8" fill="#666" />

              {/* Water droplets */}
              {waterFlow > 0 && Array.from({ length: Math.floor(waterFlow / 5) }).map((_, i) => (
                <circle
                  key={i}
                  cx={175 + (i % 5) * 10}
                  cy={50 + (i * 15) % 130}
                  r={1.5}
                  fill={waterTemp > 40 ? '#ff9999' : colors.water}
                  opacity="0.7"
                >
                  <animate
                    attributeName="cy"
                    values={`${50 + (i * 15) % 130};${195}`}
                    dur={`${0.3 + Math.random() * 0.3}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              ))}

              {/* Air flow arrows */}
              {showAirflow && waterFlow > 0 && (
                <g opacity="0.6">
                  {/* Downward air entrainment */}
                  {[165, 200, 235].map((x, i) => (
                    <line key={i} x1={x} y1="60" x2={x} y2="150" stroke={colors.primary} strokeWidth="1.5" strokeDasharray="5,3">
                      <animate attributeName="y1" values="60;80;60" dur="1s" repeatCount="indefinite" />
                      <animate attributeName="y2" values="150;170;150" dur="1s" repeatCount="indefinite" />
                    </line>
                  ))}
                  <text x="200" y="175" fill={colors.primary} fontSize="9" textAnchor="middle">Air dragged down</text>

                  {/* Recirculating vortex */}
                  <path
                    d="M 140 180 Q 120 140 140 100 Q 160 80 200 80"
                    fill="none"
                    stroke={colors.secondary}
                    strokeWidth="1"
                    strokeDasharray="3,2"
                  />
                </g>
              )}

              {/* Curtains */}
              <path
                d={`M 100 40 Q ${100 + bulge * 0.8} 90 ${100 + bulge} 130 Q ${100 + bulge * 0.6} 170 100 195`}
                fill="none"
                stroke="#ff9999"
                strokeWidth="4"
                opacity="0.9"
              />
              <path
                d={`M 300 40 Q ${300 - bulge * 0.8} 90 ${300 - bulge} 130 Q ${300 - bulge * 0.6} 170 300 195`}
                fill="none"
                stroke="#ff9999"
                strokeWidth="4"
                opacity="0.9"
              />

              {/* Curtain rod */}
              <line x1="90" y1="40" x2="310" y2="40" stroke="#666" strokeWidth="4" />

              {/* Temperature/convection indicator */}
              {waterTemp > 40 && waterFlow > 0 && (
                <g>
                  <path d="M 200 50 Q 180 30 200 10 Q 220 30 200 50" fill="none" stroke={colors.accent} strokeWidth="1" opacity="0.5" />
                  <text x="200" y="5" fill={colors.accent} fontSize="8" textAnchor="middle">Hot air rising</text>
                </g>
              )}

              {/* Effect indicators */}
              <g transform="translate(320, 30)">
                <text fill={colors.text} fontSize="10">Effects:</text>
                <text y="15" fill={colors.primary} fontSize="9">Flow: {flowEffect.toFixed(1)}</text>
                <text y="28" fill={colors.accent} fontSize="9">Temp: {tempEffect.toFixed(1)}</text>
                <text y="41" fill={colors.warning} fontSize="9">Total: {(flowEffect + tempEffect).toFixed(1)}</text>
              </g>
            </svg>
          </div>

          {/* Controls */}
          <div style={{ display: 'grid', gap: '16px' }}>
            {/* Water flow slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: colors.text, fontSize: '14px', fontWeight: '600' }}>Water Flow</span>
                <span style={{ color: colors.water, fontSize: '14px' }}>{waterFlow}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={waterFlow}
                onChange={(e) => setWaterFlow(Number(e.target.value))}
                style={{ width: '100%', accentColor: colors.water }}
              />
            </div>

            {/* Temperature slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: colors.text, fontSize: '14px', fontWeight: '600' }}>Water Temperature</span>
                <span style={{ color: waterTemp > 40 ? colors.accent : colors.primary, fontSize: '14px' }}>{waterTemp}°C</span>
              </div>
              <input
                type="range"
                min="10"
                max="50"
                value={waterTemp}
                onChange={(e) => setWaterTemp(Number(e.target.value))}
                style={{ width: '100%', accentColor: waterTemp > 40 ? colors.accent : colors.primary }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: colors.textSecondary }}>
                <span>Cold</span>
                <span>Warm</span>
                <span>Hot</span>
              </div>
            </div>

            {/* Toggle buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onMouseDown={() => setShowPressureField(!showPressureField)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: showPressureField ? colors.lowPressure : colors.background,
                  color: showPressureField ? colors.background : colors.textSecondary,
                  border: `1px solid ${showPressureField ? colors.lowPressure : '#444'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                {showPressureField ? '✓' : '○'} Pressure Field
              </button>
              <button
                onMouseDown={() => setShowAirflow(!showAirflow)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: showAirflow ? colors.primary : colors.background,
                  color: showAirflow ? colors.background : colors.textSecondary,
                  border: `1px solid ${showAirflow ? colors.primary : '#444'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                {showAirflow ? '✓' : '○'} Air Flow
              </button>
            </div>
          </div>

          {/* Physics note */}
          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: colors.background,
            borderRadius: '12px',
            border: `1px solid ${colors.lowPressure}30`
          }}>
            <p style={{ color: colors.lowPressure, fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0' }}>
              Two effects combine:
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
              <strong>1. Entrainment:</strong> Water droplets drag air down → low pressure<br/>
              <strong>2. Convection:</strong> Hot air rises → cool air rushes in from bottom<br/>
              Both create lower pressure inside than outside!
            </p>
          </div>
        </div>

        {renderKeyTakeaway("Higher flow = more entrainment. Higher temperature = more convection. Both effects combine to create the pressure difference that pulls the curtain inward!")}

        {waterFlow > 50 && renderBottomBar(() => goToNextPhase())}
      </div>
    );
  };

  // Review Phase
  const renderReview = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("📚", "Entrainment Physics", "How moving fluids create low pressure")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'grid', gap: '16px' }}>
          {[
            {
              title: "1. Bernoulli's Principle",
              text: "Fast-moving fluid has lower pressure. Water droplets create fast-moving air → lower pressure inside the shower.",
              color: colors.primary,
              icon: "⚡"
            },
            {
              title: "2. Entrainment",
              text: "Moving fluid drags surrounding fluid with it. Falling water droplets drag air molecules downward.",
              color: colors.success,
              icon: "↓"
            },
            {
              title: "3. Horizontal Vortex",
              text: "Air dragged down must recirculate, creating a rotating vortex. This sustains the low-pressure core.",
              color: colors.secondary,
              icon: "🌀"
            },
            {
              title: "4. Thermal Convection",
              text: "Hot showers add another effect: rising steam draws cool air in from below, enhancing the pressure drop.",
              color: colors.accent,
              icon: "🔥"
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

        {/* The debate */}
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: colors.background,
          borderRadius: '12px'
        }}>
          <p style={{ color: colors.warning, fontWeight: '600', margin: '0 0 8px 0', fontSize: '15px' }}>
            🔬 Scientific Debate
          </p>
          <p style={{ color: colors.textSecondary, margin: 0, fontSize: '14px', lineHeight: 1.6 }}>
            Scientists have proposed multiple mechanisms! David Schmidt's CFD analysis found the horizontal vortex model
            best explains the effect. But likely all factors contribute — entrainment, Bernoulli, convection, and vortex dynamics.
          </p>
        </div>

        {renderKeyTakeaway("The shower curtain effect demonstrates entrainment — moving fluids drag surrounding fluids, creating pressure differences. This same principle is used in spray bottles, jet mixers, and more!")}
      </div>

      {renderBottomBar(() => goToNextPhase())}
    </div>
  );

  // Twist Predict Phase
  const renderTwistPredict = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("🔄", "Cold vs Hot", "Does temperature matter?")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px'
      }}>
        <p style={{ color: colors.text, fontSize: '17px', lineHeight: 1.6, marginBottom: '24px' }}>
          You test with a COLD shower (15°C) vs a HOT shower (45°C), same water flow rate.
        </p>

        <svg width="100%" height="120" viewBox="0 0 400 120" style={{ marginBottom: '20px' }}>
          {/* Cold shower */}
          <g transform="translate(100, 60)">
            <rect x="-40" y="-40" width="80" height="80" fill="#1a3a5c" rx="5" />
            <circle cx="0" cy="0" r="5" fill={colors.primary} />
            <text y="55" fill={colors.primary} fontSize="11" textAnchor="middle">Cold (15°C)</text>
          </g>
          {/* Hot shower */}
          <g transform="translate(300, 60)">
            <rect x="-40" y="-40" width="80" height="80" fill="#3a1a1a" rx="5" />
            <circle cx="0" cy="0" r="5" fill={colors.accent} />
            <text y="55" fill={colors.accent} fontSize="11" textAnchor="middle">Hot (45°C)</text>
          </g>
          <text x="200" y="60" fill={colors.textSecondary} fontSize="14" textAnchor="middle">vs</text>
        </svg>

        <p style={{ color: colors.text, fontSize: '18px', fontWeight: '600', marginBottom: '16px', textAlign: 'center' }}>
          Which causes MORE curtain movement?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { value: 'hot', label: 'Hot shower — convection adds to entrainment effect', color: colors.accent },
            { value: 'cold', label: 'Cold shower — denser air creates more pressure difference', color: colors.primary },
            { value: 'same', label: 'Same — only water flow matters, not temperature', color: colors.textSecondary }
          ].map(option => (
            <button
              key={option.value}
              onMouseDown={() => {
                setTwistPrediction(option.value);
                playSound('click');
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
              playSound(twistPrediction === 'hot' ? 'success' : 'failure');
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
            background: twistPrediction === 'hot' ? `${colors.success}20` : `${colors.primary}20`,
            borderRadius: '12px',
            border: `2px solid ${twistPrediction === 'hot' ? colors.success : colors.primary}`
          }}>
            {twistPrediction === 'hot' ? (
              <p style={{ color: colors.success, margin: 0 }}>
                <strong>✓ Correct!</strong> Hot showers cause more curtain movement! Rising hot air creates additional convection currents that draw cool air in from the sides, adding to the entrainment effect.
              </p>
            ) : (
              <p style={{ color: colors.primary, margin: 0 }}>
                <strong>Good thinking, but hot wins!</strong> While cold air is denser, hot showers add thermal convection (rising steam/hot air). This creates additional air currents that enhance the low-pressure effect.
              </p>
            )}
          </div>
        )}
      </div>

      {showTwistResult && renderBottomBar(() => goToNextPhase())}
    </div>
  );

  // Twist Play Phase
  const renderTwistPlay = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("🎮", "Temperature Comparison", "See the difference")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        {/* Mode selector */}
        <div style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
          {(['cold', 'hot'] as const).map(mode => (
            <button
              key={mode}
              onMouseDown={() => setTempMode(mode)}
              style={{
                flex: 1,
                padding: '12px',
                background: tempMode === mode ? (mode === 'hot' ? colors.accent : colors.primary) : colors.background,
                color: tempMode === mode ? colors.background : colors.textSecondary,
                border: `1px solid ${tempMode === mode ? (mode === 'hot' ? colors.accent : colors.primary) : '#444'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: tempMode === mode ? '600' : '400'
              }}
            >
              {mode === 'cold' ? '❄️ Cold (15°C)' : '🔥 Hot (45°C)'}
            </button>
          ))}
        </div>

        {/* Visualization */}
        <div style={{ background: colors.background, borderRadius: '12px', padding: '10px', marginBottom: '16px' }}>
          <svg width="100%" height="200" viewBox="0 0 400 200">
            {/* Shower enclosure */}
            <rect x="100" y="20" width="200" height="160" fill={tempMode === 'hot' ? '#3a2a2a' : '#2a2a3a'} rx="5" />

            {/* Shower head */}
            <ellipse cx="200" cy="35" rx="25" ry="8" fill="#666" />

            {/* Water droplets */}
            {Array.from({ length: 12 }).map((_, i) => (
              <circle
                key={i}
                cx={175 + (i % 5) * 10}
                cy={45 + (i * 12) % 100}
                r={1.5}
                fill={tempMode === 'hot' ? '#ff9999' : colors.water}
                opacity="0.7"
              >
                <animate
                  attributeName="cy"
                  values={`${45 + (i * 12) % 100};${170}`}
                  dur={`${0.3 + Math.random() * 0.3}s`}
                  repeatCount="indefinite"
                />
              </circle>
            ))}

            {/* Entrainment arrows (both) */}
            {[170, 200, 230].map((x, i) => (
              <line key={i} x1={x} y1="50" x2={x} y2="140" stroke={colors.primary} strokeWidth="1" strokeDasharray="4,2" opacity="0.5" />
            ))}

            {/* Convection arrows (hot only) */}
            {tempMode === 'hot' && (
              <g>
                <path d="M 200 50 Q 180 30 200 15 Q 220 30 200 50" fill="none" stroke={colors.accent} strokeWidth="1.5" opacity="0.6" />
                <path d="M 180 70 Q 160 40 180 20" fill="none" stroke={colors.accent} strokeWidth="1" opacity="0.4" />
                <path d="M 220 70 Q 240 40 220 20" fill="none" stroke={colors.accent} strokeWidth="1" opacity="0.4" />
                <text x="200" y="8" fill={colors.accent} fontSize="9" textAnchor="middle">Rising hot air</text>
              </g>
            )}

            {/* Curtains - more bulge for hot */}
            {(() => {
              const bulge = tempMode === 'hot' ? 35 : 20;
              return (
                <>
                  <path
                    d={`M 100 40 Q ${100 + bulge * 0.8} 80 ${100 + bulge} 110 Q ${100 + bulge * 0.6} 150 100 175`}
                    fill="none"
                    stroke="#ff9999"
                    strokeWidth="4"
                  />
                  <path
                    d={`M 300 40 Q ${300 - bulge * 0.8} 80 ${300 - bulge} 110 Q ${300 - bulge * 0.6} 150 300 175`}
                    fill="none"
                    stroke="#ff9999"
                    strokeWidth="4"
                  />
                </>
              );
            })()}

            {/* Labels */}
            <text x="200" y="195" fill={colors.text} fontSize="12" textAnchor="middle" fontWeight="600">
              Curtain bulge: {tempMode === 'hot' ? 'HIGH' : 'MODERATE'}
            </text>
          </svg>
        </div>

        {/* Explanation */}
        <div style={{
          padding: '16px',
          background: tempMode === 'hot' ? `${colors.accent}15` : `${colors.primary}15`,
          borderRadius: '12px',
          border: `1px solid ${tempMode === 'hot' ? colors.accent : colors.primary}30`
        }}>
          {tempMode === 'hot' ? (
            <>
              <p style={{ color: colors.accent, fontWeight: '600', margin: '0 0 8px 0' }}>
                🔥 Hot Shower Effect:
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
                <strong>Entrainment:</strong> Water drags air down (same as cold)<br/>
                <strong>PLUS Convection:</strong> Hot air rises, drawing cool air in from sides<br/>
                <strong>Result:</strong> Stronger low pressure, more curtain movement!
              </p>
            </>
          ) : (
            <>
              <p style={{ color: colors.primary, fontWeight: '600', margin: '0 0 8px 0' }}>
                ❄️ Cold Shower Effect:
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
                <strong>Entrainment only:</strong> Water drags air down<br/>
                <strong>No convection:</strong> Cold air doesn't rise<br/>
                <strong>Result:</strong> Less total air movement, moderate curtain effect
              </p>
            </>
          )}
        </div>
      </div>

      {renderKeyTakeaway("Hot showers create stronger curtain effects because thermal convection adds to mechanical entrainment — two pressure-lowering mechanisms instead of one!")}

      {renderBottomBar(() => goToNextPhase())}
    </div>
  );

  // Twist Review Phase
  const renderTwistReview = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("🔬", "Practical Solutions", "How to beat the clingy curtain")}

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
              ✓ Weighted Curtains
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              Heavy curtains or ones with magnets/weights at the bottom resist the inward force.
              The added mass increases inertia, requiring more force to move.
            </p>
          </div>

          <div style={{
            padding: '20px',
            background: colors.background,
            borderRadius: '12px'
          }}>
            <p style={{ color: colors.primary, fontWeight: '600', margin: '0 0 8px 0' }}>
              🚿 Curved Curtain Rods
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              Bowed-out rods give the curtain more room before it reaches you.
              Even with the same bulge, there's more clearance.
            </p>
          </div>

          <div style={{
            padding: '20px',
            background: colors.background,
            borderRadius: '12px'
          }}>
            <p style={{ color: colors.secondary, fontWeight: '600', margin: '0 0 8px 0' }}>
              🧊 Colder Showers
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              Cooler water reduces the convection component, but still has entrainment.
              Not the most comfortable solution!
            </p>
          </div>

          <div style={{
            padding: '20px',
            background: colors.background,
            borderRadius: '12px'
          }}>
            <p style={{ color: colors.warning, fontWeight: '600', margin: '0 0 8px 0' }}>
              🪟 Glass Doors
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              Rigid enclosures don't move regardless of pressure differences.
              The pressure still exists, but the door doesn't flex!
            </p>
          </div>
        </div>

        {renderKeyTakeaway("Understanding the physics helps design solutions: add weight, increase clearance, reduce temperature, or use rigid materials to counter the pressure differential.")}
      </div>

      {renderBottomBar(() => goToNextPhase())}
    </div>
  );

  // Transfer Phase
  const renderTransfer = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("🌍", "Entrainment in Engineering", "Beyond the bathroom")}

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
                  playSound('click');
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
              playSound('transition');
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

      {completedApps.size === applications.length && renderBottomBar(() => goToNextPhase())}
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
                    {option.text}
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
                        ? (testQuestions[i].options[testAnswers[i]]?.correct ? colors.success : colors.accent)
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
                  playSound('success');
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
                   "Keep studying entrainment!"}
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
                      borderLeft: `4px solid ${q.options[testAnswers[i]]?.correct ? colors.success : colors.accent}`
                    }}
                  >
                    <p style={{ color: colors.text, margin: '0 0 8px 0', fontSize: '13px', fontWeight: '500' }}>
                      {i + 1}. {q.question}
                    </p>
                    <p style={{
                      color: q.options[testAnswers[i]]?.correct ? colors.success : colors.accent,
                      margin: '0 0 4px 0',
                      fontSize: '12px'
                    }}>
                      Your answer: {q.options[testAnswers[i]]?.text}
                      {q.options[testAnswers[i]]?.correct ? ' ✓' : ` ✗ (Correct: ${q.options.find(o => o.correct)?.text})`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {showTestResults && renderBottomBar(() => goToNextPhase(), false, "Complete Journey")}
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
          background: `linear-gradient(135deg, ${colors.lowPressure}20, ${colors.secondary}20)`,
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
                background: [colors.primary, colors.secondary, colors.accent, colors.success, colors.lowPressure][i % 5],
                borderRadius: i % 2 === 0 ? '50%' : '2px',
                left: `${Math.random() * 100}%`,
                top: '-20px',
                animation: `fall ${2 + Math.random() * 2}s linear infinite`,
                animationDelay: `${Math.random() * 2}s`,
                opacity: 0.8
              }}
            />
          ))}

          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🚿🎓</div>

          <h2 style={{ color: colors.text, margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700' }}>
            Entrainment Expert!
          </h2>

          <p style={{ color: colors.textSecondary, margin: '0 0 24px 0', fontSize: '16px' }}>
            You understand why shower curtains misbehave
          </p>

          <div style={{
            display: 'inline-block',
            padding: '16px 32px',
            background: colors.card,
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <div style={{ color: colors.lowPressure, fontSize: '36px', fontWeight: '700' }}>
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
              { icon: "⚡", title: "Bernoulli", text: "Fast flow = low pressure" },
              { icon: "↓", title: "Entrainment", text: "Moving fluid drags nearby fluid" },
              { icon: "🔥", title: "Convection", text: "Hot air adds to the effect" }
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

        {renderKeyTakeaway("From shower curtains to medical nebulizers, entrainment and the Bernoulli effect shape countless devices and phenomena in our daily lives!")}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            🚿 You'll never look at a shower curtain the same way again!
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
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/3 rounded-full blur-3xl" />

      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Shower Curtain Effect</span>
          <div className="flex items-center gap-1.5">
            {PHASE_ORDER.map((p, i) => {
              const currentIndex = PHASE_ORDER.indexOf(phase);
              return (
                <button
                  key={p}
                  onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    phase === p
                      ? 'bg-cyan-400 w-6 shadow-lg shadow-cyan-400/30'
                      : currentIndex > i
                        ? 'bg-emerald-500 w-2'
                        : 'bg-slate-700 w-2 hover:bg-slate-600'
                  }`}
                  title={phaseLabels[p]}
                />
              );
            })}
          </div>
          <span className="text-sm font-medium text-cyan-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: isMobile ? '8px' : '16px'
        }}>
          {renderPhase()}
        </div>
      </div>
    </div>
  );
};

export default ShowerCurtainRenderer;
