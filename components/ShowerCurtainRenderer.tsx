'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

const realWorldApps = [
   {
      icon: '✈️',
      title: 'Aircraft Wing Design',
      short: 'Lift from pressure difference',
      tagline: 'Bernoulli keeps planes flying',
      description: 'Aircraft wings generate lift through the same pressure principle as the shower curtain effect. Air flows faster over the curved upper surface, creating lower pressure that pulls the wing upward.',
      connection: 'Just as faster-moving water droplets create low pressure that pulls the shower curtain inward, faster air over a wing creates low pressure that generates lift.',
      howItWorks: 'The wings curved upper surface forces air to travel a longer path, speeding up the flow. By Bernoullis principle, this faster flow has lower pressure than the slower flow beneath, creating a net upward force.',
      stats: [
         { value: '30%', label: 'Pressure reduction', icon: '📉' },
         { value: '600mph', label: 'Cruise speed', icon: '✈️' },
         { value: '~1M lbs', label: 'Max lift (747)', icon: '⬆️' }
      ],
      examples: ['Commercial aviation', 'Fighter jets', 'Helicopter rotors', 'Wind turbine blades'],
      companies: ['Boeing', 'Airbus', 'Lockheed Martin', 'GE Aviation'],
      futureImpact: 'Morphing wing designs will dynamically adjust shape to optimize pressure distribution for different flight conditions.',
      color: '#3B82F6'
   },
   {
      icon: '🏎️',
      title: 'Race Car Aerodynamics',
      short: 'Downforce for grip',
      tagline: 'Inverted wings push cars down',
      description: 'Formula 1 cars use inverted airfoils to create downforce, pushing the car onto the track. This is the shower curtain effect in reverse: low pressure below the wing pulls the car toward the ground.',
      connection: 'The same Bernoulli principle that pulls shower curtains inward creates downforce on race cars. Air accelerating under the car and around wings creates low pressure zones.',
      howItWorks: 'Front and rear wings are shaped like inverted aircraft wings. Ground effect tunnels under the car accelerate air to very high speeds, creating extreme low pressure that sucks the car to the track.',
      stats: [
         { value: '5,000 lbs', label: 'F1 downforce', icon: '⬇️' },
         { value: '200mph', label: 'Speeds achieved', icon: '🏁' },
         { value: '5G', label: 'Cornering force', icon: '🔄' }
      ],
      examples: ['Formula 1', 'IndyCar', 'Le Mans prototypes', 'NASCAR drafting'],
      companies: ['Ferrari', 'Mercedes AMG', 'Red Bull Racing', 'McLaren'],
      futureImpact: 'Active aerodynamics with computer-controlled surfaces will optimize downforce in real-time based on track conditions.',
      color: '#EF4444'
   },
   {
      icon: '🌬️',
      title: 'HVAC Ventilation',
      short: 'Air entrainment systems',
      tagline: 'Moving air efficiently',
      description: 'Building ventilation systems use the entrainment principle to distribute conditioned air. High-velocity supply jets entrain room air, multiplying the effective airflow without additional fan power.',
      connection: 'Just as falling water droplets entrain surrounding air in a shower, HVAC diffusers use high-velocity jets to pull room air into the airstream, creating efficient mixing.',
      howItWorks: 'Ceiling diffusers discharge air at high velocity. This jet entrains surrounding room air, creating an induction ratio of 10:1 or more. The mixed air reaches occupants at comfortable velocities.',
      stats: [
         { value: '10:1', label: 'Induction ratio', icon: '🔄' },
         { value: '68-76°F', label: 'Comfort range', icon: '🌡️' },
         { value: '20%', label: 'Energy savings', icon: '⚡' }
      ],
      examples: ['Office buildings', 'Hospitals', 'Clean rooms', 'Data centers'],
      companies: ['Trane', 'Carrier', 'Johnson Controls', 'Daikin'],
      futureImpact: 'Personalized ventilation systems will use entrainment to deliver fresh air directly to occupants while reducing overall system airflow.',
      color: '#10B981'
   },
   {
      icon: '⛽',
      title: 'Carburetor Fuel Mixing',
      short: 'Venturi-powered engines',
      tagline: 'Air speed draws fuel in',
      description: 'Classic carburetors use the Venturi effect to draw fuel into the airstream. Air accelerating through a narrow throat creates low pressure that pulls fuel from the bowl - the same principle as the shower curtain.',
      connection: 'The carburetor venturi is a direct application of Bernoullis principle. Fast-moving air in the throat creates low pressure that entrains fuel, just as fast-moving water droplets entrain air in a shower.',
      howItWorks: 'Incoming air accelerates through a venturi throat. The pressure drop draws fuel through a jet into the airstream. Throttle position controls airflow, and fuel mixture adjusts automatically with engine demand.',
      stats: [
         { value: '14.7:1', label: 'Stoichiometric ratio', icon: '⚖️' },
         { value: '~5 psi', label: 'Venturi vacuum', icon: '📉' },
         { value: '100+ yrs', label: 'Technology age', icon: '📅' }
      ],
      examples: ['Classic cars', 'Small engines', 'Aircraft piston engines', 'Motorcycles'],
      companies: ['Holley', 'Edelbrock', 'Weber', 'Mikuni'],
      futureImpact: 'While fuel injection has replaced carburetors in most applications, the Venturi principle lives on in industrial atomizers and spray systems.',
      color: '#F59E0B'
   }
];

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
              <defs>
                {/* Premium water flow gradient */}
                <linearGradient id="showWaterFlow" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.9" />
                  <stop offset="25%" stopColor="#60a5fa" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.7" />
                  <stop offset="75%" stopColor="#2563eb" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.5" />
                </linearGradient>

                {/* Curtain fabric gradient */}
                <linearGradient id="showCurtainFabric" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fca5a5" />
                  <stop offset="20%" stopColor="#f87171" />
                  <stop offset="50%" stopColor="#ef4444" />
                  <stop offset="80%" stopColor="#dc2626" />
                  <stop offset="100%" stopColor="#b91c1c" />
                </linearGradient>

                {/* Shower enclosure background */}
                <linearGradient id="showEnclosureBg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e3a5f" />
                  <stop offset="50%" stopColor="#0f2744" />
                  <stop offset="100%" stopColor="#0a1929" />
                </linearGradient>

                {/* Chrome metal gradient for shower head and rod */}
                <linearGradient id="showChromeMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#9ca3af" />
                  <stop offset="30%" stopColor="#6b7280" />
                  <stop offset="50%" stopColor="#9ca3af" />
                  <stop offset="70%" stopColor="#4b5563" />
                  <stop offset="100%" stopColor="#374151" />
                </linearGradient>

                {/* Water droplet glow */}
                <radialGradient id="showWaterDropGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#93c5fd" stopOpacity="1" />
                  <stop offset="40%" stopColor="#60a5fa" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </radialGradient>

                {/* Glow filter for water */}
                <filter id="showWaterGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Curtain glow filter */}
                <filter id="showCurtainGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Person silhouette gradient */}
                <radialGradient id="showPersonGrad" cx="50%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#6b7280" />
                  <stop offset="100%" stopColor="#374151" />
                </radialGradient>
              </defs>

              {/* Bathroom frame with premium gradient */}
              <rect x="50" y="20" width="200" height="180" fill="url(#showEnclosureBg)" rx="5" />

              {/* Shower head with chrome effect */}
              <rect x="120" y="25" width="60" height="15" fill="url(#showChromeMetal)" rx="3" />
              <ellipse cx="150" cy="45" rx="25" ry="8" fill="url(#showChromeMetal)" />

              {/* Water droplets with glow */}
              {showerOn && Array.from({ length: 15 }).map((_, i) => (
                <circle
                  key={i}
                  cx={125 + (i % 5) * 12}
                  cy={60 + (i * 20) % 120}
                  r={2.5}
                  fill="url(#showWaterDropGlow)"
                  filter="url(#showWaterGlow)"
                >
                  <animate
                    attributeName="cy"
                    values={`${60 + (i * 20) % 120};${180}`}
                    dur={`${0.5 + Math.random() * 0.5}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              ))}

              {/* Person silhouette with gradient */}
              <g transform="translate(150, 130)">
                <ellipse cx="0" cy="-50" rx="15" ry="18" fill="url(#showPersonGrad)" />
                <ellipse cx="0" cy="0" rx="25" ry="40" fill="url(#showPersonGrad)" />
              </g>

              {/* Shower curtain with fabric gradient and glow */}
              <path
                d={`M 70 40 Q ${70 + curtainBulge} 100 ${70 + curtainBulge * 1.2} 160 Q ${70 + curtainBulge * 0.8} 180 70 195`}
                fill="none"
                stroke="url(#showCurtainFabric)"
                strokeWidth="5"
                filter="url(#showCurtainGlow)"
              />
              <path
                d={`M 230 40 Q ${230 - curtainBulge} 100 ${230 - curtainBulge * 1.2} 160 Q ${230 - curtainBulge * 0.8} 180 230 195`}
                fill="none"
                stroke="url(#showCurtainFabric)"
                strokeWidth="5"
                filter="url(#showCurtainGlow)"
              />

              {/* Curtain rod with chrome effect */}
              <line x1="50" y1="40" x2="250" y2="40" stroke="url(#showChromeMetal)" strokeWidth="5" />
            </svg>

            {/* Labels moved outside SVG using typo system */}
            {showerOn && curtainBulge > 10 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', padding: '0 20px' }}>
                <span style={{ color: colors.accent, fontSize: typo.small, fontWeight: 600 }}>Blowing in!</span>
                <span style={{ color: colors.accent, fontSize: typo.small, fontWeight: 600 }}>Blowing in!</span>
              </div>
            )}

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
          <defs>
            {/* Shower enclosure gradient */}
            <linearGradient id="showPredictEnclosure" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="50%" stopColor="#0f2744" />
              <stop offset="100%" stopColor="#0a1929" />
            </linearGradient>

            {/* Curtain gradient */}
            <linearGradient id="showPredictCurtain" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="50%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Low pressure glow */}
            <radialGradient id="showPredictLowP" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </radialGradient>

            {/* High pressure glow */}
            <radialGradient id="showPredictHighP" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
            </radialGradient>

            {/* Curtain glow filter */}
            <filter id="showPredictCurtainGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <marker id="showPredictArrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#fbbf24" />
            </marker>
          </defs>

          {/* Shower enclosure cross-section with gradient */}
          <rect x="100" y="20" width="200" height="80" fill="url(#showPredictEnclosure)" rx="5" />

          {/* Pressure zones with radial gradients */}
          <ellipse cx="200" cy="60" rx="60" ry="35" fill="url(#showPredictLowP)" />
          <ellipse cx="60" cy="60" rx="35" ry="30" fill="url(#showPredictHighP)" />
          <ellipse cx="340" cy="60" rx="35" ry="30" fill="url(#showPredictHighP)" />

          {/* Curtains bulging in with gradient and glow */}
          <path d="M 100 30 Q 130 60 100 90" fill="none" stroke="url(#showPredictCurtain)" strokeWidth="4" filter="url(#showPredictCurtainGlow)" />
          <path d="M 300 30 Q 270 60 300 90" fill="none" stroke="url(#showPredictCurtain)" strokeWidth="4" filter="url(#showPredictCurtainGlow)" />

          {/* Arrows showing curtain movement with animation */}
          <line x1="75" y1="60" x2="95" y2="60" stroke="#fbbf24" strokeWidth="2.5" markerEnd="url(#showPredictArrow)">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" />
          </line>
          <line x1="325" y1="60" x2="305" y2="60" stroke="#fbbf24" strokeWidth="2.5" markerEnd="url(#showPredictArrow)">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" />
          </line>
        </svg>

        {/* Pressure labels moved outside SVG */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', padding: '0 20px' }}>
          <span style={{ color: colors.highPressure, fontSize: typo.small, fontWeight: 600, textAlign: 'center' }}>HIGH<br/>Pressure</span>
          <span style={{ color: colors.lowPressure, fontSize: typo.small, fontWeight: 600, textAlign: 'center' }}>LOW<br/>Pressure</span>
          <span style={{ color: colors.highPressure, fontSize: typo.small, fontWeight: 600, textAlign: 'center' }}>HIGH<br/>Pressure</span>
        </div>

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
              <defs>
                {/* Premium water flow gradient - warm/cool based on temp */}
                <linearGradient id="showPlayWaterFlow" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={waterTemp > 40 ? '#fca5a5' : '#93c5fd'} stopOpacity="0.9" />
                  <stop offset="30%" stopColor={waterTemp > 40 ? '#f87171' : '#60a5fa'} stopOpacity="0.8" />
                  <stop offset="60%" stopColor={waterTemp > 40 ? '#ef4444' : '#3b82f6'} stopOpacity="0.7" />
                  <stop offset="100%" stopColor={waterTemp > 40 ? '#dc2626' : '#2563eb'} stopOpacity="0.5" />
                </linearGradient>

                {/* Curtain fabric gradient */}
                <linearGradient id="showPlayCurtainFabric" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fca5a5" />
                  <stop offset="25%" stopColor="#f87171" />
                  <stop offset="50%" stopColor="#ef4444" />
                  <stop offset="75%" stopColor="#dc2626" />
                  <stop offset="100%" stopColor="#b91c1c" />
                </linearGradient>

                {/* Shower enclosure background */}
                <linearGradient id="showPlayEnclosureBg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#0f2744" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#0a1929" stopOpacity="0.4" />
                </linearGradient>

                {/* Chrome metal gradient */}
                <linearGradient id="showPlayChromeMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#9ca3af" />
                  <stop offset="30%" stopColor="#6b7280" />
                  <stop offset="50%" stopColor="#9ca3af" />
                  <stop offset="70%" stopColor="#4b5563" />
                  <stop offset="100%" stopColor="#374151" />
                </linearGradient>

                {/* Low pressure zone gradient */}
                <radialGradient id="showLowPressureZone" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
                </radialGradient>

                {/* High pressure zone gradient */}
                <radialGradient id="showHighPressureZone" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
                  <stop offset="50%" stopColor="#ea580c" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#c2410c" stopOpacity="0" />
                </radialGradient>

                {/* Air flow gradient */}
                <linearGradient id="showAirFlowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#00d4ff" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#00d4ff" stopOpacity="0.1" />
                </linearGradient>

                {/* Convection gradient for hot air */}
                <linearGradient id="showConvectionGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#ff6b6b" stopOpacity="0.1" />
                  <stop offset="50%" stopColor="#ff6b6b" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#ff6b6b" stopOpacity="0.8" />
                </linearGradient>

                {/* Water droplet glow */}
                <filter id="showPlayWaterGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Curtain glow */}
                <filter id="showPlayCurtainGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Pressure field glow */}
                <filter id="showPressureGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Arrow marker for Bernoulli effect */}
                <marker id="showArrowMarker" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#00d4ff" />
                </marker>

                <marker id="showPressureArrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#fbbf24" />
                </marker>
              </defs>

              {/* Shower enclosure with premium gradient */}
              <rect x="100" y="20" width="200" height="180" fill="url(#showPlayEnclosureBg)" rx="5" />

              {/* Pressure fields with premium gradients */}
              {showPressureField && waterFlow > 0 && (
                <>
                  {/* Low pressure inside */}
                  <ellipse cx="200" cy="110" rx={60 + bulge} ry="70" fill="url(#showLowPressureZone)" filter="url(#showPressureGlow)" />

                  {/* High pressure outside */}
                  <ellipse cx="60" cy="110" rx="40" ry="50" fill="url(#showHighPressureZone)" filter="url(#showPressureGlow)" />
                  <ellipse cx="340" cy="110" rx="40" ry="50" fill="url(#showHighPressureZone)" filter="url(#showPressureGlow)" />

                  {/* Bernoulli effect arrows - pressure pushing curtain inward */}
                  <line x1="50" y1="110" x2="85" y2="110" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#showPressureArrow)" opacity="0.7">
                    <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.5s" repeatCount="indefinite" />
                  </line>
                  <line x1="350" y1="110" x2="315" y2="110" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#showPressureArrow)" opacity="0.7">
                    <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.5s" repeatCount="indefinite" />
                  </line>
                </>
              )}

              {/* Shower head with chrome effect */}
              <rect x="170" y="25" width="60" height="12" fill="url(#showPlayChromeMetal)" rx="3" />
              <ellipse cx="200" cy="42" rx="25" ry="8" fill="url(#showPlayChromeMetal)" />

              {/* Water droplets with gradient and glow */}
              {waterFlow > 0 && Array.from({ length: Math.floor(waterFlow / 5) }).map((_, i) => (
                <circle
                  key={i}
                  cx={175 + (i % 5) * 10}
                  cy={50 + (i * 15) % 130}
                  r={2}
                  fill="url(#showPlayWaterFlow)"
                  filter="url(#showPlayWaterGlow)"
                >
                  <animate
                    attributeName="cy"
                    values={`${50 + (i * 15) % 130};${195}`}
                    dur={`${0.3 + Math.random() * 0.3}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              ))}

              {/* Air flow streamlines */}
              {showAirflow && waterFlow > 0 && (
                <g>
                  {/* Downward air entrainment streamlines */}
                  {[165, 185, 200, 215, 235].map((x, i) => (
                    <g key={i}>
                      <line
                        x1={x}
                        y1="55"
                        x2={x}
                        y2="160"
                        stroke="url(#showAirFlowGrad)"
                        strokeWidth="2"
                        strokeDasharray="8,4"
                        markerEnd="url(#showArrowMarker)"
                      >
                        <animate attributeName="stroke-dashoffset" values="0;-12" dur="0.8s" repeatCount="indefinite" />
                      </line>
                    </g>
                  ))}

                  {/* Recirculating vortex paths */}
                  <path
                    d="M 130 180 Q 110 140 130 100 Q 150 70 180 65"
                    fill="none"
                    stroke={colors.secondary}
                    strokeWidth="1.5"
                    strokeDasharray="4,3"
                    opacity="0.6"
                  >
                    <animate attributeName="stroke-dashoffset" values="0;-7" dur="1s" repeatCount="indefinite" />
                  </path>
                  <path
                    d="M 270 180 Q 290 140 270 100 Q 250 70 220 65"
                    fill="none"
                    stroke={colors.secondary}
                    strokeWidth="1.5"
                    strokeDasharray="4,3"
                    opacity="0.6"
                  >
                    <animate attributeName="stroke-dashoffset" values="0;-7" dur="1s" repeatCount="indefinite" />
                  </path>
                </g>
              )}

              {/* Curtains with fabric gradient and glow */}
              <path
                d={`M 100 40 Q ${100 + bulge * 0.8} 90 ${100 + bulge} 130 Q ${100 + bulge * 0.6} 170 100 195`}
                fill="none"
                stroke="url(#showPlayCurtainFabric)"
                strokeWidth="5"
                filter="url(#showPlayCurtainGlow)"
              />
              <path
                d={`M 300 40 Q ${300 - bulge * 0.8} 90 ${300 - bulge} 130 Q ${300 - bulge * 0.6} 170 300 195`}
                fill="none"
                stroke="url(#showPlayCurtainFabric)"
                strokeWidth="5"
                filter="url(#showPlayCurtainGlow)"
              />

              {/* Curtain rod with chrome effect */}
              <line x1="90" y1="40" x2="310" y2="40" stroke="url(#showPlayChromeMetal)" strokeWidth="5" />

              {/* Temperature/convection indicator with premium styling */}
              {waterTemp > 40 && waterFlow > 0 && (
                <g>
                  <path d="M 200 50 Q 175 25 200 5 Q 225 25 200 50" fill="none" stroke="url(#showConvectionGrad)" strokeWidth="2" opacity="0.7">
                    <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" />
                  </path>
                  <path d="M 185 55 Q 165 35 185 15" fill="none" stroke="url(#showConvectionGrad)" strokeWidth="1.5" opacity="0.5">
                    <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2.5s" repeatCount="indefinite" />
                  </path>
                  <path d="M 215 55 Q 235 35 215 15" fill="none" stroke="url(#showConvectionGrad)" strokeWidth="1.5" opacity="0.5">
                    <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2.5s" repeatCount="indefinite" />
                  </path>
                </g>
              )}
            </svg>

            {/* Labels moved outside SVG using typo system */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '8px', padding: '0 8px' }}>
              {/* Pressure and airflow labels */}
              {showPressureField && waterFlow > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                  <span style={{ color: colors.lowPressure, fontSize: typo.label, fontWeight: 600 }}>Low P (inside)</span>
                  <span style={{ color: colors.highPressure, fontSize: typo.label, fontWeight: 600 }}>High P (outside)</span>
                </div>
              )}
              {showAirflow && waterFlow > 0 && (
                <span style={{ color: colors.primary, fontSize: typo.label, fontWeight: 600 }}>Air dragged down</span>
              )}
              {waterTemp > 40 && waterFlow > 0 && (
                <span style={{ color: colors.accent, fontSize: typo.label, fontWeight: 600 }}>Hot air rising</span>
              )}
              {/* Effect indicators */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                <span style={{ color: colors.text, fontSize: typo.label, fontWeight: 600 }}>Effects:</span>
                <span style={{ color: colors.primary, fontSize: typo.label }}>Flow: {flowEffect.toFixed(1)}</span>
                <span style={{ color: colors.accent, fontSize: typo.label }}>Temp: {tempEffect.toFixed(1)}</span>
                <span style={{ color: colors.warning, fontSize: typo.label }}>Total: {(flowEffect + tempEffect).toFixed(1)}</span>
              </div>
            </div>
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
          <defs>
            {/* Cold shower gradient */}
            <linearGradient id="showTwistColdBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="50%" stopColor="#164e63" />
              <stop offset="100%" stopColor="#0f2744" />
            </linearGradient>

            {/* Hot shower gradient */}
            <linearGradient id="showTwistHotBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7f1d1d" />
              <stop offset="50%" stopColor="#991b1b" />
              <stop offset="100%" stopColor="#450a0a" />
            </linearGradient>

            {/* Cold glow */}
            <radialGradient id="showTwistColdGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="1" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
            </radialGradient>

            {/* Hot glow */}
            <radialGradient id="showTwistHotGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fca5a5" stopOpacity="1" />
              <stop offset="50%" stopColor="#ef4444" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
            </radialGradient>

            {/* Glow filter */}
            <filter id="showTwistGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Cold shower with gradient */}
          <g transform="translate(100, 60)">
            <rect x="-40" y="-40" width="80" height="80" fill="url(#showTwistColdBg)" rx="8" />
            <circle cx="0" cy="0" r="12" fill="url(#showTwistColdGlow)" filter="url(#showTwistGlow)">
              <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="0" cy="0" r="5" fill="#22d3ee" />
          </g>
          {/* Hot shower with gradient */}
          <g transform="translate(300, 60)">
            <rect x="-40" y="-40" width="80" height="80" fill="url(#showTwistHotBg)" rx="8" />
            <circle cx="0" cy="0" r="12" fill="url(#showTwistHotGlow)" filter="url(#showTwistGlow)">
              <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="0" cy="0" r="5" fill="#ef4444" />
          </g>
          <text x="200" y="65" fill={colors.textSecondary} fontSize="16" fontWeight="600" textAnchor="middle">vs</text>
        </svg>

        {/* Temperature labels moved outside SVG */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '16px' }}>
          <span style={{ color: colors.primary, fontSize: typo.small, fontWeight: 600 }}>Cold (15°C)</span>
          <span style={{ color: colors.accent, fontSize: typo.small, fontWeight: 600 }}>Hot (45°C)</span>
        </div>

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
          <svg width="100%" height="180" viewBox="0 0 400 180">
            <defs>
              {/* Cold enclosure gradient */}
              <linearGradient id="showTwistPlayColdBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#164e63" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#0f2744" stopOpacity="0.6" />
              </linearGradient>

              {/* Hot enclosure gradient */}
              <linearGradient id="showTwistPlayHotBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7f1d1d" stopOpacity="0.5" />
                <stop offset="50%" stopColor="#991b1b" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#450a0a" stopOpacity="0.5" />
              </linearGradient>

              {/* Water gradient - cold */}
              <linearGradient id="showTwistPlayColdWater" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.5" />
              </linearGradient>

              {/* Water gradient - hot */}
              <linearGradient id="showTwistPlayHotWater" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#f87171" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.5" />
              </linearGradient>

              {/* Curtain gradient */}
              <linearGradient id="showTwistPlayCurtain" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fca5a5" />
                <stop offset="25%" stopColor="#f87171" />
                <stop offset="50%" stopColor="#ef4444" />
                <stop offset="75%" stopColor="#dc2626" />
                <stop offset="100%" stopColor="#b91c1c" />
              </linearGradient>

              {/* Chrome metal gradient */}
              <linearGradient id="showTwistPlayChrome" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#9ca3af" />
                <stop offset="50%" stopColor="#6b7280" />
                <stop offset="100%" stopColor="#4b5563" />
              </linearGradient>

              {/* Air flow gradient */}
              <linearGradient id="showTwistPlayAirFlow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#00d4ff" stopOpacity="0.2" />
              </linearGradient>

              {/* Convection gradient */}
              <linearGradient id="showTwistPlayConvection" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#ff6b6b" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#ff6b6b" stopOpacity="0.8" />
              </linearGradient>

              {/* Glow filters */}
              <filter id="showTwistPlayWaterGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="showTwistPlayCurtainGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Arrow marker */}
              <marker id="showTwistPlayArrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#00d4ff" />
              </marker>
            </defs>

            {/* Shower enclosure with temperature-based gradient */}
            <rect x="100" y="15" width="200" height="145" fill={tempMode === 'hot' ? 'url(#showTwistPlayHotBg)' : 'url(#showTwistPlayColdBg)'} rx="5" />

            {/* Shower head with chrome effect */}
            <ellipse cx="200" cy="28" rx="25" ry="8" fill="url(#showTwistPlayChrome)" />

            {/* Water droplets with gradient and glow */}
            {Array.from({ length: 12 }).map((_, i) => (
              <circle
                key={i}
                cx={175 + (i % 5) * 10}
                cy={38 + (i * 12) % 90}
                r={2}
                fill={tempMode === 'hot' ? 'url(#showTwistPlayHotWater)' : 'url(#showTwistPlayColdWater)'}
                filter="url(#showTwistPlayWaterGlow)"
              >
                <animate
                  attributeName="cy"
                  values={`${38 + (i * 12) % 90};${150}`}
                  dur={`${0.3 + Math.random() * 0.3}s`}
                  repeatCount="indefinite"
                />
              </circle>
            ))}

            {/* Entrainment arrows (both modes) */}
            {[170, 200, 230].map((x, i) => (
              <line
                key={i}
                x1={x}
                y1="45"
                x2={x}
                y2="130"
                stroke="url(#showTwistPlayAirFlow)"
                strokeWidth="2"
                strokeDasharray="6,3"
                markerEnd="url(#showTwistPlayArrow)"
              >
                <animate attributeName="stroke-dashoffset" values="0;-9" dur="0.8s" repeatCount="indefinite" />
              </line>
            ))}

            {/* Convection arrows (hot only) with premium styling */}
            {tempMode === 'hot' && (
              <g>
                <path d="M 200 45 Q 175 20 200 5 Q 225 20 200 45" fill="none" stroke="url(#showTwistPlayConvection)" strokeWidth="2.5">
                  <animate attributeName="opacity" values="0.5;0.9;0.5" dur="2s" repeatCount="indefinite" />
                </path>
                <path d="M 180 60 Q 155 30 180 10" fill="none" stroke="url(#showTwistPlayConvection)" strokeWidth="1.5" opacity="0.6">
                  <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2.5s" repeatCount="indefinite" />
                </path>
                <path d="M 220 60 Q 245 30 220 10" fill="none" stroke="url(#showTwistPlayConvection)" strokeWidth="1.5" opacity="0.6">
                  <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2.5s" repeatCount="indefinite" />
                </path>
              </g>
            )}

            {/* Curtains with fabric gradient and glow - more bulge for hot */}
            {(() => {
              const bulge = tempMode === 'hot' ? 35 : 20;
              return (
                <>
                  <path
                    d={`M 100 35 Q ${100 + bulge * 0.8} 70 ${100 + bulge} 100 Q ${100 + bulge * 0.6} 135 100 155`}
                    fill="none"
                    stroke="url(#showTwistPlayCurtain)"
                    strokeWidth="5"
                    filter="url(#showTwistPlayCurtainGlow)"
                  />
                  <path
                    d={`M 300 35 Q ${300 - bulge * 0.8} 70 ${300 - bulge} 100 Q ${300 - bulge * 0.6} 135 300 155`}
                    fill="none"
                    stroke="url(#showTwistPlayCurtain)"
                    strokeWidth="5"
                    filter="url(#showTwistPlayCurtainGlow)"
                  />
                </>
              );
            })()}
          </svg>

          {/* Labels moved outside SVG using typo system */}
          <div style={{ textAlign: 'center', marginTop: '8px' }}>
            <span style={{
              color: colors.text,
              fontSize: typo.body,
              fontWeight: 600,
              padding: '6px 16px',
              background: tempMode === 'hot' ? `${colors.accent}20` : `${colors.primary}20`,
              borderRadius: '8px',
              border: `1px solid ${tempMode === 'hot' ? colors.accent : colors.primary}40`
            }}>
              Curtain bulge: {tempMode === 'hot' ? 'HIGH' : 'MODERATE'}
            </span>
          </div>
          {tempMode === 'hot' && (
            <div style={{ textAlign: 'center', marginTop: '6px' }}>
              <span style={{ color: colors.accent, fontSize: typo.small }}>Rising hot air</span>
            </div>
          )}
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
