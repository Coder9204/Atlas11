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

interface CavitationRendererProps {
  currentPhase?: Phase;
  onPhaseComplete?: (phase: Phase) => void;
}

// Bubble type
interface Bubble {
  id: number;
  x: number;
  y: number;
  radius: number;
  growing: boolean;
  collapsing: boolean;
  collapsed: boolean;
}

const CavitationRenderer: React.FC<CavitationRendererProps> = ({ currentPhase, onPhaseComplete }) => {
  // Phase management
  const [phase, setPhase] = useState<Phase>(currentPhase ?? 'hook');

  // Hook phase
  const [hookStep, setHookStep] = useState(0);
  const [showCollapse, setShowCollapse] = useState(false);
  const [bubbleSize, setBubbleSize] = useState(30);
  const collapseAnimRef = useRef<number>();

  // Predict phase
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showPredictResult, setShowPredictResult] = useState(false);

  // Play phase - propeller simulator
  const [propellerSpeed, setPropellerSpeed] = useState(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [damageLevel, setDamageLevel] = useState(0);
  const [propellerAngle, setPropellerAngle] = useState(0);
  const bubbleIdRef = useRef(0);
  const animationRef = useRef<number>();

  // Twist phase - mantis shrimp
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistResult, setShowTwistResult] = useState(false);
  const [shrimpStrike, setShrimpStrike] = useState(false);
  const [showSecondBubble, setShowSecondBubble] = useState(false);

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

  // Premium Design System
  const colors = {
    primary: '#3b82f6',       // blue-500 (water)
    primaryDark: '#2563eb',   // blue-600
    accent: '#f97316',        // orange-500 (damage/heat)
    secondary: '#06b6d4',     // cyan-500
    success: '#10b981',       // emerald-500
    danger: '#ef4444',        // red-500
    warning: '#f59e0b',       // amber-500
    bgDark: '#020617',        // slate-950
    bgCard: '#0f172a',        // slate-900
    bgCardLight: '#1e293b',   // slate-800
    textPrimary: '#f8fafc',   // slate-50
    textSecondary: '#94a3b8', // slate-400
    textMuted: '#64748b',     // slate-500
    border: '#334155',        // slate-700
    borderLight: '#475569',   // slate-600
    // Theme-specific
    bubble: '#60a5fa',        // blue-400
    collapse: '#ef4444',      // red-500
    propeller: '#94a3b8',     // slate-400
  };

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

  // Hook phase bubble collapse animation
  useEffect(() => {
    if (!showCollapse) return;

    const collapse = () => {
      setBubbleSize(prev => {
        if (prev <= 2) {
          playSound('click');
          return 0;
        }
        return prev * 0.85;
      });
      collapseAnimRef.current = requestAnimationFrame(collapse);
    };

    collapseAnimRef.current = requestAnimationFrame(collapse);
    return () => {
      if (collapseAnimRef.current) cancelAnimationFrame(collapseAnimRef.current);
    };
  }, [showCollapse]);

  // Propeller animation and cavitation
  useEffect(() => {
    if (propellerSpeed === 0) return;

    const animate = () => {
      // Rotate propeller
      setPropellerAngle(prev => (prev + propellerSpeed) % 360);

      // Generate cavitation bubbles at high speed
      if (propellerSpeed > 50 && Math.random() < propellerSpeed / 200) {
        const angle = Math.random() * 360 * Math.PI / 180;
        const radius = 50 + Math.random() * 30;
        const newBubble: Bubble = {
          id: bubbleIdRef.current++,
          x: 200 + radius * Math.cos(angle),
          y: 120 + radius * Math.sin(angle),
          radius: 3 + Math.random() * 5,
          growing: true,
          collapsing: false,
          collapsed: false
        };
        setBubbles(prev => [...prev.slice(-30), newBubble]);
      }

      // Animate existing bubbles
      setBubbles(prev => prev.map(b => {
        if (b.collapsed) return b;

        if (b.growing) {
          const newRadius = b.radius + 0.3;
          if (newRadius > 12) {
            return { ...b, growing: false, collapsing: true };
          }
          return { ...b, radius: newRadius };
        }

        if (b.collapsing) {
          const newRadius = b.radius * 0.8;
          if (newRadius < 1) {
            // Bubble collapsed - add damage
            if (propellerSpeed > 70) {
              setDamageLevel(d => Math.min(100, d + 0.5));
            }
            // Sound removed - too frequent in animation loop
            return { ...b, radius: 0, collapsed: true };
          }
          return { ...b, radius: newRadius };
        }

        return b;
      }).filter(b => !b.collapsed || Math.random() > 0.1));

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [propellerSpeed]);

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

  // Emit game events (for logging/analytics)
  const emitEvent = useCallback(
    (type: string, data?: Record<string, unknown>) => {
      console.debug('Game event:', { type, data, timestamp: Date.now(), phase: phaseLabels[phase] });
    },
    [phase]
  );

  // Mantis shrimp strike animation
  const triggerShrimpStrike = () => {
    setShrimpStrike(true);
    playSound('transition');

    setTimeout(() => {
      setShowSecondBubble(true);
      playSound('click');
    }, 200);

    setTimeout(() => {
      setShrimpStrike(false);
      setShowSecondBubble(false);
    }, 1500);
  };

  // Test questions
  const testQuestions = [
    {
      question: "Cavitation occurs when local pressure drops below:",
      options: [{ text: "Atmospheric pressure", correct: false }, { text: "The liquid's vapor pressure", correct: true }, { text: "Zero pressure", correct: false }, { text: "The critical pressure", correct: false }]
    },
    {
      question: "Why is cavitation damage so severe?",
      options: [{ text: "Bubbles are toxic", correct: false }, { text: "Collapse creates extreme local temperatures and pressures", correct: true }, { text: "Air corrodes metal", correct: false }, { text: "Bubbles are radioactive", correct: false }]
    },
    {
      question: "Where do cavitation bubbles typically form on a propeller?",
      options: [{ text: "On the hub", correct: false }, { text: "On the low-pressure (suction) side of blades", correct: true }, { text: "At the tips only", correct: false }, { text: "On the shaft", correct: false }]
    },
    {
      question: "The mantis shrimp's strike creates cavitation by:",
      options: [{ text: "Heating the water", correct: false }, { text: "Moving its claw so fast it creates low pressure", correct: true }, { text: "Chemical reaction", correct: false }, { text: "Electrical discharge", correct: false }]
    },
    {
      question: "At what approximate temperature can the center of a collapsing bubble reach?",
      options: [{ text: "100°C", correct: false }, { text: "500°C", correct: false }, { text: "5,000°C or higher", correct: true }, { text: "Only room temperature", correct: false }]
    },
    {
      question: "Sonoluminescence is:",
      options: [{ text: "Sound from collapsing bubbles", correct: false }, { text: "Light emitted from collapsing bubbles", correct: true }, { text: "Ultrasound imaging", correct: false }, { text: "Laser-induced cavitation", correct: false }]
    },
    {
      question: "To prevent cavitation in a pump, you should:",
      options: [{ text: "Run it faster", correct: false }, { text: "Increase suction pressure or reduce speed", correct: true }, { text: "Use hotter liquid", correct: false }, { text: "Add air bubbles", correct: false }]
    },
    {
      question: "Why do ship propellers sometimes make a 'singing' noise?",
      options: [{ text: "Motor vibration only", correct: false }, { text: "Cavitation bubble collapse creates sound", correct: true }, { text: "Wind noise", correct: false }, { text: "Hull resonance", correct: false }]
    },
    {
      question: "Ultrasonic cleaning uses cavitation to:",
      options: [{ text: "Heat the water", correct: false }, { text: "Create bubbles that scrub surfaces", correct: true }, { text: "Dissolve dirt chemically", correct: false }, { text: "Magnetize particles", correct: false }]
    },
    {
      question: "Cavitation damage appears as:",
      options: [{ text: "Rust spots", correct: false }, { text: "Pitted, cratered surface (looks like tiny explosions)", correct: true }, { text: "Smooth wear", correct: false }, { text: "Color change only", correct: false }]
    }
  ];

  // Real-world applications
  const applications = [
    {
      icon: "🚢",
      title: "Ship Propellers",
      short: "Marine cavitation",
      tagline: "The destroyer of blades",
      description: "Ship propellers operating at high speeds create low-pressure zones that trigger cavitation, eroding blade surfaces over time.",
      connection: "Fast-moving blades create suction that drops pressure below water's vapor pressure, forming bubbles that collapse violently against the metal.",
      howItWorks: "Engineers design propeller shapes to minimize low-pressure peaks. Slower rotation with larger blades often prevents cavitation better than fast small propellers.",
      stats: ["Bubble collapse: up to 1000 atm", "Erosion rate: mm per year", "Efficiency loss: 10-30%"],
      examples: ["Container ships", "Submarines", "Speedboats", "Water jet drives"],
      companies: ["Wärtsilä", "MAN Energy", "Rolls-Royce Marine", "Caterpillar Marine"],
      futureImpact: "Advanced blade coatings and AI-optimized propeller shapes minimize cavitation while maximizing efficiency.",
      color: "#3B82F6"
    },
    {
      icon: "🦐",
      title: "Mantis Shrimp",
      short: "Nature's weapon",
      tagline: "Punching with physics",
      description: "Mantis shrimp strike so fast they create cavitation bubbles. When prey survives the punch, the bubble collapse delivers a second blow!",
      connection: "The shrimp's club accelerates at 10,000 g, fast enough to create a vacuum wake that forms a cavitation bubble.",
      howItWorks: "The strike creates localized low pressure. Water vaporizes, then the bubble collapses with enough force to crack shells — even if the initial punch misses.",
      stats: ["Strike speed: 23 m/s", "Acceleration: 10,000 g", "Bubble temp: ~4,700°C"],
      examples: ["Peacock mantis shrimp", "Spearing mantis shrimp", "Pistol shrimp (similar)", "Snapping shrimp"],
      companies: ["DARPA research", "Biomimetics labs", "Aquarium industry"],
      futureImpact: "Researchers study mantis shrimp to develop impact-resistant materials and underwater acoustic weapons.",
      color: "#10B981"
    },
    {
      icon: "🧹",
      title: "Ultrasonic Cleaning",
      short: "Bubble scrubbing",
      tagline: "Cleaning with cavitation",
      description: "Ultrasonic cleaners generate millions of tiny cavitation bubbles that implode against surfaces, scrubbing away contamination.",
      connection: "High-frequency sound waves create rapid pressure cycles that nucleate and collapse bubbles thousands of times per second.",
      howItWorks: "Transducers vibrate at 20-40 kHz, creating alternating high and low pressure zones. Bubbles form in low-pressure zones and collapse in high-pressure zones, releasing energy.",
      stats: ["Frequency: 20-400 kHz", "Bubble size: 10-100 μm", "Cleans in minutes"],
      examples: ["Jewelry cleaning", "Medical instrument sterilization", "Electronics manufacturing", "Dental tools"],
      companies: ["Branson", "Elma", "Crest Ultrasonics", "L&R"],
      futureImpact: "Targeted cavitation could revolutionize drug delivery and non-invasive surgery.",
      color: "#8B5CF6"
    },
    {
      icon: "💊",
      title: "Medical Applications",
      short: "Therapeutic cavitation",
      tagline: "Healing with bubbles",
      description: "Controlled cavitation is used medically for lithotripsy (kidney stones), drug delivery, and tumor ablation.",
      connection: "Focused ultrasound creates cavitation at precise locations inside the body, breaking up stones or releasing drugs from microbubbles.",
      howItWorks: "Acoustic waves converge at a focal point, creating intense pressure oscillations. Controlled cavitation shatters kidney stones or opens cell membranes for drug delivery.",
      stats: ["Lithotripsy: 90% success rate", "Focus precision: <1mm", "Treatment time: 30-60 min"],
      examples: ["Kidney stone treatment", "Tumor ablation", "Blood-brain barrier opening", "Targeted drug delivery"],
      companies: ["Boston Scientific", "Insightec", "Philips Healthcare", "SonaCare"],
      futureImpact: "Histotripsy uses cavitation to mechanically destroy tumors without heat — a revolutionary non-invasive surgery technique.",
      color: "#EF4444"
    }
  ];

  // Handle test answer
  const handleTestAnswer = (answer: number) => {
    playSound('transition');
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
    bubble: '#60A5FA',
    collapse: '#F97316'
  };

  // Helper render functions
  const renderProgressBar = () => {
    const currentIndex = PHASE_ORDER.indexOf(phase);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '20px' }}>
        {PHASE_ORDER.map((p, i) => (
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

  // Real-world applications for Transfer phase
  const realWorldApps = [
    {
      icon: "🚢",
      title: "Ship Propeller Design",
      short: "Marine engineering solutions",
      tagline: "Protecting vessels from invisible destruction",
      description: "Naval architects and marine engineers design propellers that minimize cavitation damage while maximizing thrust efficiency. Cavitation on ship propellers causes pitting, erosion, and can reduce a propeller's lifespan from decades to just years if not properly managed.",
      connection: "When propeller blades spin rapidly, they create low-pressure zones on their surfaces. If pressure drops below water's vapor pressure, cavitation bubbles form and collapse against the metal, causing progressive erosion damage.",
      howItWorks: "Engineers use computational fluid dynamics (CFD) to model pressure distributions across blade surfaces. By optimizing blade geometry, pitch angles, and rotation speeds, they can keep local pressures above the cavitation threshold while maintaining propulsive efficiency.",
      stats: [
        { label: "Bubble Collapse Pressure", value: "Up to 1,500 MPa" },
        { label: "Erosion Rate", value: "0.1-5 mm/year" },
        { label: "Efficiency Loss", value: "15-30% when cavitating" }
      ],
      examples: [
        "Container ship propellers with skewed blade designs",
        "Submarine propellers optimized for silent operation",
        "High-speed ferry water jet impellers",
        "Tugboat propellers designed for high-thrust, low-speed operation"
      ],
      companies: ["Wärtsilä", "MAN Energy Solutions", "Rolls-Royce Marine", "Kongsberg Maritime", "Schottel"],
      futureImpact: "Advanced composite materials and AI-driven design optimization are enabling propellers that self-adjust pitch in real-time, virtually eliminating cavitation while maximizing fuel efficiency and reducing underwater noise pollution.",
      color: "#3B82F6"
    },
    {
      icon: "🔊",
      title: "Ultrasonic Cleaning",
      short: "Industrial precision cleaning",
      tagline: "Millions of microscopic scrub brushes",
      description: "Ultrasonic cleaners harness controlled cavitation to remove contaminants from intricate surfaces that traditional cleaning cannot reach. From surgical instruments to aerospace components, cavitation bubbles provide unparalleled cleaning at the microscopic level.",
      connection: "High-frequency sound waves create rapid pressure oscillations in cleaning fluid. During low-pressure phases, microscopic cavitation bubbles nucleate. During high-pressure phases, these bubbles implode violently, releasing energy that dislodges contaminants.",
      howItWorks: "Piezoelectric transducers convert electrical energy into ultrasonic vibrations (typically 20-400 kHz). These vibrations propagate through the cleaning solution, creating millions of cavitation events per second. The implosion energy scrubs surfaces at the molecular level without damaging delicate parts.",
      stats: [
        { label: "Frequency Range", value: "20-400 kHz" },
        { label: "Cavitation Bubbles", value: "10-150 micrometers" },
        { label: "Cleaning Time", value: "2-15 minutes typical" }
      ],
      examples: [
        "Surgical instrument sterilization in hospitals",
        "Semiconductor wafer cleaning in chip fabrication",
        "Carburetor and fuel injector restoration",
        "Jewelry and watchmaking precision cleaning"
      ],
      companies: ["Branson Ultrasonics", "Crest Ultrasonics", "Elma Schmidbauer", "L&R Manufacturing", "Kemet International"],
      futureImpact: "Next-generation ultrasonic systems use AI-controlled frequency sweeping to optimize cavitation intensity for specific materials and contaminants, enabling damage-free cleaning of increasingly delicate nanotechnology components.",
      color: "#8B5CF6"
    },
    {
      icon: "🏥",
      title: "Kidney Stone Treatment",
      short: "Lithotripsy medical therapy",
      tagline: "Shattering stones without surgery",
      description: "Extracorporeal Shock Wave Lithotripsy (ESWL) uses focused acoustic waves to create cavitation bubbles inside kidney stones, fragmenting them into passable pieces. This non-invasive procedure has revolutionized urology, eliminating the need for surgery in most cases.",
      connection: "Shock waves focused on kidney stones create intense pressure gradients. These pressure differentials nucleate cavitation bubbles within and around the stone. When bubbles collapse asymmetrically against the stone surface, they generate microjets that erode and fragment it.",
      howItWorks: "An electromagnetic or piezoelectric source generates shock waves outside the body. These waves are focused using acoustic lenses or reflectors to converge at the kidney stone location (guided by X-ray or ultrasound imaging). Repeated cavitation events progressively break the stone into fragments small enough to pass naturally.",
      stats: [
        { label: "Success Rate", value: "70-90% for stones <2cm" },
        { label: "Shock Waves", value: "2,000-4,000 per session" },
        { label: "Treatment Duration", value: "30-60 minutes" }
      ],
      examples: [
        "Calcium oxalate kidney stone fragmentation",
        "Ureteral stone treatment for blocked urinary flow",
        "Gallstone lithotripsy (less common application)",
        "Salivary gland stone (sialolith) treatment"
      ],
      companies: ["Dornier MedTech", "Boston Scientific", "Olympus Corporation", "Richard Wolf GmbH", "Storz Medical"],
      futureImpact: "Histotripsy, an emerging technique, uses precisely controlled cavitation clouds to mechanically destroy tumors and kidney stones with unprecedented precision, potentially replacing many surgical procedures with completely non-invasive treatments.",
      color: "#EF4444"
    },
    {
      icon: "⚙️",
      title: "Hydraulic Pump Protection",
      short: "Fluid power system design",
      tagline: "Keeping industrial muscles healthy",
      description: "Hydraulic systems power everything from excavators to aircraft. Cavitation in pumps, valves, and actuators causes noise, vibration, erosion, and catastrophic failures. Engineers design systems to prevent the pressure drops that trigger destructive cavitation.",
      connection: "When hydraulic fluid flows through restrictions or around sharp corners, local pressure can drop below the fluid's vapor pressure. Cavitation bubbles form in these low-pressure zones and collapse downstream when pressure recovers, eroding pump components and valve seats.",
      howItWorks: "Engineers prevent hydraulic cavitation through multiple strategies: maintaining adequate inlet pressure (NPSH), using properly sized suction lines, avoiding air ingestion, controlling fluid temperature, and selecting appropriate fluid viscosity. Pump designs incorporate anti-cavitation grooves and optimized flow passages.",
      stats: [
        { label: "Damage Threshold", value: "Pressure drops >25% below vapor pressure" },
        { label: "Noise Increase", value: "10-20 dB when cavitating" },
        { label: "Pump Life Reduction", value: "Up to 90% if uncorrected" }
      ],
      examples: [
        "Excavator hydraulic system optimization",
        "Aircraft flight control actuator protection",
        "Industrial press hydraulic circuit design",
        "Injection molding machine pump systems"
      ],
      companies: ["Parker Hannifin", "Bosch Rexroth", "Eaton Hydraulics", "Danfoss"],
      futureImpact: "Smart hydraulic systems with embedded sensors detect early cavitation signatures and automatically adjust operating parameters, predicting and preventing failures before they occur while optimizing energy efficiency.",
      color: "#F59E0B"
    }
  ];

  // PHASE RENDERS

  // Hook Phase
  const renderHook = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("💥", "Explosive Bubbles", "When water boils... and implodes")}

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
              A bubble forms in fast-moving water. Then it <span style={{ color: colors.collapse }}>collapses violently</span>...<br/>
              Inside that collapse: temperatures hotter than the <span style={{ color: colors.warning }}>surface of the sun</span>.
            </p>

            <svg width="300" height="180" viewBox="0 0 300 180" style={{ margin: '0 auto', display: 'block' }}>
              <defs>
                {/* Premium water gradient with depth */}
                <linearGradient id="cavWaterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#0c4a6e" />
                  <stop offset="30%" stopColor="#0369a1" />
                  <stop offset="60%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#0c4a6e" />
                </linearGradient>

                {/* Bubble gradient with glass effect */}
                <radialGradient id="cavBubbleGradient" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.9" />
                  <stop offset="40%" stopColor="#60a5fa" stopOpacity="0.6" />
                  <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.2" />
                </radialGradient>

                {/* Bubble inner glow */}
                <radialGradient id="cavBubbleInner" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.8" />
                  <stop offset="60%" stopColor="#60a5fa" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.3" />
                </radialGradient>

                {/* Collapse flash gradient */}
                <radialGradient id="cavCollapseFlash" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fef3c7" />
                  <stop offset="30%" stopColor="#fbbf24" />
                  <stop offset="60%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#ef4444" />
                </radialGradient>

                {/* Shock wave gradient */}
                <radialGradient id="cavShockWave" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#f97316" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                </radialGradient>

                {/* Bubble glow filter */}
                <filter id="cavBubbleGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Collapse glow filter */}
                <filter id="cavCollapseGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Water background with gradient */}
              <rect x="0" y="0" width="300" height="180" fill="url(#cavWaterGradient)" rx="10" />

              {/* Subtle water caustics */}
              <g opacity="0.15">
                {[0, 1, 2].map(i => (
                  <ellipse key={i} cx={80 + i * 70} cy={30 + i * 15} rx={40} ry={15} fill="#7dd3fc">
                    <animate attributeName="opacity" values="0.1;0.3;0.1" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
                  </ellipse>
                ))}
              </g>

              {/* Bubble */}
              <g transform="translate(150, 90)">
                {bubbleSize > 0 ? (
                  <>
                    {/* Outer glow */}
                    <circle
                      r={bubbleSize * 1.2}
                      fill="url(#cavBubbleGradient)"
                      opacity="0.3"
                      filter="url(#cavBubbleGlow)"
                    />
                    {/* Main bubble with gradient */}
                    <circle
                      r={bubbleSize}
                      fill="url(#cavBubbleGradient)"
                      stroke="#93c5fd"
                      strokeWidth="1"
                      strokeOpacity="0.5"
                    />
                    {/* Inner bubble layer */}
                    <circle
                      r={bubbleSize * 0.7}
                      fill="url(#cavBubbleInner)"
                    />
                    {/* Highlight shine */}
                    <ellipse
                      cx={-bubbleSize * 0.25}
                      cy={-bubbleSize * 0.25}
                      rx={bubbleSize * 0.25}
                      ry={bubbleSize * 0.15}
                      fill="#fff"
                      opacity="0.7"
                    />
                    {/* Secondary shine */}
                    <ellipse
                      cx={bubbleSize * 0.15}
                      cy={bubbleSize * 0.2}
                      rx={bubbleSize * 0.1}
                      ry={bubbleSize * 0.06}
                      fill="#fff"
                      opacity="0.4"
                    />
                  </>
                ) : (
                  <>
                    {/* Collapse flash with gradient */}
                    <circle r="5" fill="url(#cavCollapseFlash)" filter="url(#cavCollapseGlow)">
                      <animate attributeName="r" values="5;50;0" dur="0.5s" fill="freeze" />
                      <animate attributeName="opacity" values="1;0.6;0" dur="0.5s" fill="freeze" />
                    </circle>
                    {/* Shock waves with gradient */}
                    {[1, 2, 3, 4].map(i => (
                      <circle key={i} r={8 * i} fill="none" stroke={`rgba(251, 191, 36, ${0.6 / i})`} strokeWidth={3 - i * 0.5}>
                        <animate attributeName="r" values={`${8*i};${50+12*i}`} dur="0.4s" fill="freeze" />
                        <animate attributeName="opacity" values={`${0.7/i};0`} dur="0.4s" fill="freeze" />
                      </circle>
                    ))}
                    {/* Central bright flash */}
                    <circle r="3" fill="#fef3c7">
                      <animate attributeName="r" values="3;0" dur="0.3s" fill="freeze" />
                    </circle>
                  </>
                )}
              </g>
            </svg>
            {/* Labels outside SVG */}
            {bubbleSize > 20 && !showCollapse && (
              <p style={{ textAlign: 'center', color: colors.textSecondary, fontSize: typo.small, margin: '8px 0 0 0' }}>
                Vapor bubble (low pressure zone)
              </p>
            )}
            {bubbleSize === 0 && (
              <p style={{ textAlign: 'center', color: colors.collapse, fontSize: typo.bodyLarge, fontWeight: 600, margin: '8px 0 0 0' }}>
                5,000°C!
              </p>
            )}

            <button
              onMouseDown={() => {
                setShowCollapse(true);
              }}
              disabled={showCollapse}
              style={{
                marginTop: '16px',
                padding: '12px 28px',
                fontSize: '16px',
                background: showCollapse ? '#444' : `linear-gradient(135deg, ${colors.collapse}, ${colors.accent})`,
                color: colors.text,
                border: 'none',
                borderRadius: '10px',
                cursor: showCollapse ? 'not-allowed' : 'pointer',
                opacity: showCollapse ? 0.7 : 1
              }}
            >
              💥 Collapse Bubble
            </button>

            {bubbleSize === 0 && (
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
              This is <span style={{ color: colors.primary }}>cavitation</span> — when low pressure makes water "boil" into vapor bubbles.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '16px', lineHeight: 1.6, marginBottom: '20px' }}>
              When those bubbles hit higher pressure, they collapse with <strong>devastating force</strong>.
            </p>
            <div style={{
              background: colors.background,
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '16px'
            }}>
              <p style={{ color: colors.collapse, fontSize: '16px', margin: 0 }}>
                Collapsing bubbles can erode <strong>solid steel</strong>,<br/>
                punch through <strong>ship propellers</strong>,<br/>
                and even emit <strong>light</strong> (sonoluminescence)!
              </p>
            </div>

            {renderKeyTakeaway("Cavitation happens when water moves so fast that pressure drops below its boiling point — even at room temperature!")}
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
      {renderSectionHeader("🔮", "Make a Prediction", "What happens at the bubble collapse point?")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px'
      }}>
        <p style={{ color: colors.text, fontSize: '17px', lineHeight: 1.6, marginBottom: '24px' }}>
          A vapor bubble collapses in less than a microsecond. The energy concentrates into a tiny point.
        </p>

        <svg width="100%" height="100" viewBox="0 0 400 100" style={{ marginBottom: '20px' }}>
          <defs>
            {/* Bubble gradient for collapse sequence */}
            <radialGradient id="cavSeqBubble" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.3" />
            </radialGradient>
            {/* Collapse gradient */}
            <radialGradient id="cavSeqCollapse" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="40%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#ef4444" />
            </radialGradient>
            {/* Collapse glow */}
            <filter id="cavSeqGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Sequence of collapse */}
          {[0, 1, 2, 3, 4].map((i) => {
            const x = 50 + i * 75;
            const size = 25 - i * 5;
            return (
              <g key={i} transform={`translate(${x}, 50)`}>
                {i < 4 ? (
                  <>
                    {/* Bubble with gradient */}
                    <circle r={size} fill="url(#cavSeqBubble)" />
                    {/* Highlight */}
                    <ellipse cx={-size * 0.2} cy={-size * 0.2} rx={size * 0.2} ry={size * 0.12} fill="#fff" opacity="0.6" />
                  </>
                ) : (
                  <>
                    {/* Collapse with glow */}
                    <circle r={3} fill="url(#cavSeqCollapse)" filter="url(#cavSeqGlow)" />
                    {/* Shock waves */}
                    <circle r="15" fill="none" stroke="#fbbf24" strokeWidth="2" opacity="0.6" />
                    <circle r="25" fill="none" stroke="#f97316" strokeWidth="1.5" opacity="0.4" />
                    <circle r="35" fill="none" stroke="#ef4444" strokeWidth="1" opacity="0.2" />
                  </>
                )}
              </g>
            );
          })}
          {/* Arrow line showing progression */}
          <line x1="40" y1="85" x2="360" y2="85" stroke={colors.textMuted} strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
        </svg>
        {/* Labels outside SVG */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 30px', marginBottom: '16px' }}>
          <span style={{ color: colors.textSecondary, fontSize: typo.small }}>t=0</span>
          <span style={{ color: colors.textSecondary, fontSize: typo.small }}>Time →</span>
          <span style={{ color: colors.collapse, fontSize: typo.small, fontWeight: 600 }}>Collapse!</span>
        </div>

        <p style={{ color: colors.text, fontSize: '18px', fontWeight: '600', marginBottom: '16px', textAlign: 'center' }}>
          What extreme condition is created at the collapse center?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { value: 'cold', label: 'Extreme cold — rapid expansion absorbs heat', color: colors.primary },
            { value: 'hot', label: 'Extreme heat — compression creates 5000°C+', color: colors.collapse },
            { value: 'vacuum', label: 'Perfect vacuum — all matter expelled', color: colors.secondary },
            { value: 'nothing', label: 'Nothing special — just water filling the void', color: colors.textSecondary }
          ].map(option => (
            <button
              key={option.value}
              onMouseDown={() => {
                setPrediction(option.value);
                playSound('click');
                emitEvent('prediction', { predicted: option.value, question: 'collapse_result' });
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
              playSound(prediction === 'hot' ? 'success' : 'failure');
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
            background: prediction === 'hot' ? `${colors.success}20` : `${colors.accent}20`,
            borderRadius: '12px',
            border: `2px solid ${prediction === 'hot' ? colors.success : colors.accent}`
          }}>
            {prediction === 'hot' ? (
              <>
                <p style={{ color: colors.success, fontSize: '18px', fontWeight: '600', margin: '0 0 12px 0' }}>
                  ✓ Exactly right!
                </p>
                <p style={{ color: colors.text, margin: 0, lineHeight: 1.6 }}>
                  The collapse compresses the vapor so violently that it reaches 5,000°C and pressures up to 1,000 atmospheres — hot enough to emit light!
                </p>
              </>
            ) : (
              <>
                <p style={{ color: colors.accent, fontSize: '18px', fontWeight: '600', margin: '0 0 12px 0' }}>
                  Surprising answer!
                </p>
                <p style={{ color: colors.text, margin: 0, lineHeight: 1.6 }}>
                  The rapid compression creates extreme heat — up to 5,000°C! This is why cavitation can erode metal: each bubble collapse is like a tiny explosion.
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
  const renderPlay = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("🎮", "Propeller Cavitation", "See the damage in action")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        {/* Propeller visualization */}
        <div style={{ background: 'linear-gradient(180deg, #0c4a6e 0%, #1e3a5f 100%)', borderRadius: '12px', padding: '10px', marginBottom: '16px' }}>
          <svg width="100%" height="240" viewBox="0 0 400 240">
            <defs>
              {/* Premium water gradient */}
              <linearGradient id="cavPlayWater" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0c4a6e" />
                <stop offset="40%" stopColor="#0369a1" />
                <stop offset="70%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#0c4a6e" />
              </linearGradient>

              {/* Metallic hub gradient */}
              <radialGradient id="cavHubMetal" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="40%" stopColor="#64748b" />
                <stop offset="70%" stopColor="#475569" />
                <stop offset="100%" stopColor="#334155" />
              </radialGradient>

              {/* Propeller blade metallic gradient */}
              <linearGradient id="cavBladeMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#cbd5e1" />
                <stop offset="25%" stopColor="#94a3b8" />
                <stop offset="50%" stopColor="#64748b" />
                <stop offset="75%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>

              {/* Low pressure zone gradient */}
              <radialGradient id="cavLowPressure" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
              </radialGradient>

              {/* Cavitation bubble gradient */}
              <radialGradient id="cavPlayBubble" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
              </radialGradient>

              {/* Collapsing bubble gradient */}
              <radialGradient id="cavPlayCollapse" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fef3c7" />
                <stop offset="40%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f97316" />
              </radialGradient>

              {/* Damage bar gradient */}
              <linearGradient id="cavDamageBar" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="50%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>

              {/* Bubble glow filter */}
              <filter id="cavPlayBubbleGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Collapse glow filter */}
              <filter id="cavPlayCollapseGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Metal shine filter */}
              <filter id="cavMetalShine" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="1" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Water background */}
            <rect x="0" y="0" width="400" height="240" fill="url(#cavPlayWater)" rx="10" />

            {/* Subtle water caustics */}
            <g opacity="0.1">
              {[0, 1, 2, 3].map(i => (
                <ellipse key={i} cx={50 + i * 100} cy={30 + (i % 2) * 20} rx={35} ry={12} fill="#7dd3fc">
                  <animate attributeName="opacity" values="0.05;0.15;0.05" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                </ellipse>
              ))}
            </g>

            {/* Pressure zones visualization */}
            {propellerSpeed > 20 && (
              <g transform="translate(200, 120)" opacity={Math.min(propellerSpeed / 100, 0.6)}>
                {/* High pressure (downstream) */}
                <ellipse cx="100" cy="0" rx="40" ry="60" fill="#22c55e" opacity="0.2" />
                {/* Low pressure (upstream/suction side) */}
                <ellipse cx="-20" cy="0" rx="50" ry="70" fill="#3b82f6" opacity="0.3" />
              </g>
            )}

            {/* Propeller hub with metallic finish */}
            <g transform={`translate(200, 120) rotate(${propellerAngle})`}>
              {/* Hub shadow */}
              <circle r="22" fill="#1e293b" opacity="0.5" transform="translate(2, 2)" />
              {/* Hub body */}
              <circle r="20" fill="url(#cavHubMetal)" stroke="#475569" strokeWidth="1" filter="url(#cavMetalShine)" />
              {/* Hub highlight */}
              <ellipse cx="-5" cy="-5" rx="8" ry="6" fill="#cbd5e1" opacity="0.4" />
              {/* Center bolt */}
              <circle r="5" fill="#334155" stroke="#1e293b" strokeWidth="1" />

              {/* Premium blades with metallic gradient */}
              {[0, 120, 240].map((angle, i) => (
                <g key={i} transform={`rotate(${angle})`}>
                  {/* Blade shadow */}
                  <path
                    d="M 15 -8 Q 60 -22 82 -5 Q 67 7 15 10 Z"
                    fill="#0f172a"
                    opacity="0.4"
                    transform="translate(2, 2)"
                  />
                  {/* Blade body */}
                  <path
                    d="M 15 -8 Q 60 -20 80 -5 Q 65 5 15 8 Z"
                    fill="url(#cavBladeMetal)"
                    stroke="#64748b"
                    strokeWidth="0.5"
                    filter="url(#cavMetalShine)"
                  />
                  {/* Blade edge highlight */}
                  <path
                    d="M 20 -6 Q 55 -15 75 -5"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    opacity="0.5"
                  />
                  {/* Low pressure zone indicator with gradient */}
                  {propellerSpeed > 30 && (
                    <ellipse
                      cx="50"
                      cy="-14"
                      rx={15 + propellerSpeed / 10}
                      ry={6 + propellerSpeed / 25}
                      fill="url(#cavLowPressure)"
                      opacity={Math.min(propellerSpeed / 150, 0.8)}
                    />
                  )}
                </g>
              ))}
            </g>

            {/* Cavitation bubbles with premium styling */}
            {bubbles.map(b => (
              <g key={b.id}>
                {b.collapsing ? (
                  <>
                    {/* Collapsing bubble with glow */}
                    <circle
                      cx={b.x}
                      cy={b.y}
                      r={b.radius}
                      fill="url(#cavPlayCollapse)"
                      filter="url(#cavPlayCollapseGlow)"
                    />
                    {/* Shock ring */}
                    <circle
                      cx={b.x}
                      cy={b.y}
                      r={b.radius * 1.5}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="1"
                      opacity="0.5"
                    />
                  </>
                ) : (
                  <>
                    {/* Growing bubble with glow */}
                    <circle
                      cx={b.x}
                      cy={b.y}
                      r={b.radius}
                      fill="url(#cavPlayBubble)"
                      filter="url(#cavPlayBubbleGlow)"
                    />
                    {/* Bubble highlight */}
                    <ellipse
                      cx={b.x - b.radius * 0.2}
                      cy={b.y - b.radius * 0.2}
                      rx={b.radius * 0.25}
                      ry={b.radius * 0.15}
                      fill="#fff"
                      opacity="0.6"
                    />
                  </>
                )}
              </g>
            ))}

            {/* Damage indicator with gradient */}
            {damageLevel > 0 && (
              <g transform="translate(280, 15)">
                <rect x="0" y="0" width="105" height="20" fill="#1e293b" rx="4" stroke="#334155" strokeWidth="1" />
                <rect x="2" y="2" width={damageLevel} height="16" fill="url(#cavDamageBar)" rx="3" />
              </g>
            )}
          </svg>
          {/* Labels outside SVG */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px 0', alignItems: 'center' }}>
            <span style={{ color: colors.textPrimary, fontSize: typo.small, fontWeight: 600 }}>
              Speed: {propellerSpeed} RPM
            </span>
            <span style={{
              color: propellerSpeed > 70 ? colors.accent : propellerSpeed > 50 ? colors.warning : colors.success,
              fontSize: typo.small,
              fontWeight: 600
            }}>
              {propellerSpeed < 30 ? 'No cavitation' :
               propellerSpeed < 70 ? 'Minor cavitation' :
               'Severe cavitation!'}
            </span>
            {damageLevel > 0 && (
              <span style={{ color: colors.accent, fontSize: typo.small, fontWeight: 600 }}>
                Damage: {damageLevel.toFixed(0)}%
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: colors.text, fontSize: '14px', fontWeight: '600' }}>Propeller Speed</span>
            <span style={{
              color: propellerSpeed > 70 ? colors.accent : propellerSpeed > 50 ? colors.warning : colors.success,
              fontSize: '14px'
            }}>
              {propellerSpeed} RPM
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={propellerSpeed}
            onChange={(e) => setPropellerSpeed(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: propellerSpeed > 70 ? colors.accent : propellerSpeed > 50 ? colors.warning : colors.success
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: colors.textSecondary }}>
            <span>Off</span>
            <span>Safe zone</span>
            <span style={{ color: colors.warning }}>Cavitation zone</span>
          </div>
        </div>

        {/* Reset button */}
        <button
          onMouseDown={() => {
            setDamageLevel(0);
            setBubbles([]);
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
          Reset Damage
        </button>

        {/* Physics explanation */}
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: colors.background,
          borderRadius: '12px',
          border: `1px solid ${colors.bubble}30`
        }}>
          <p style={{ color: colors.bubble, fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0' }}>
            Where cavitation occurs:
          </p>
          <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
            Fast-moving blade surfaces create low-pressure zones (suction side).
            When pressure drops below ~2.3 kPa (water's vapor pressure at 20°C), water boils into vapor bubbles.
          </p>
        </div>
      </div>

      {renderKeyTakeaway("Propeller cavitation occurs at high speeds when blade suction creates pressure below water's vapor pressure. Each bubble collapse chips away at the metal!")}

      {damageLevel > 30 && renderBottomBar(() => goToNextPhase())}
    </div>
  );

  // Review Phase
  const renderReview = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("📚", "Cavitation Physics", "The complete picture")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'grid', gap: '16px' }}>
          {[
            {
              title: "1. Bubble Formation",
              text: "When local pressure drops below vapor pressure (~2.3 kPa for water at 20°C), water 'boils' into vapor bubbles — even at room temperature!",
              color: colors.bubble,
              icon: "○"
            },
            {
              title: "2. Bubble Growth",
              text: "In the low-pressure zone, bubbles expand as more liquid vaporizes into them. Size can reach several millimeters.",
              color: colors.primary,
              icon: "◯"
            },
            {
              title: "3. Violent Collapse",
              text: "When bubbles move to higher pressure regions, they collapse in microseconds. Water rushes inward at extreme speeds.",
              color: colors.warning,
              icon: "⊙"
            },
            {
              title: "4. Extreme Conditions",
              text: "Collapse center: ~5,000°C, ~1,000 atm pressure, jets reaching 100+ m/s. This erodes even hardened steel!",
              color: colors.collapse,
              icon: "💥"
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

        {/* Sonoluminescence note */}
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: `${colors.warning}15`,
          borderRadius: '12px',
          border: `1px solid ${colors.warning}30`
        }}>
          <p style={{ color: colors.warning, fontWeight: '600', margin: '0 0 8px 0', fontSize: '15px' }}>
            ✨ Sonoluminescence: Light from Sound
          </p>
          <p style={{ color: colors.textSecondary, margin: 0, fontSize: '14px', lineHeight: 1.6 }}>
            Some collapsing bubbles emit brief flashes of light! The extreme compression heats gases to plasma temperatures,
            causing them to glow. This mysterious phenomenon is still being studied.
          </p>
        </div>

        {renderKeyTakeaway("Cavitation converts the kinetic energy of flow into extreme local conditions — temperatures rivaling the sun's surface, concentrated into points smaller than a pinhead.")}
      </div>

      {renderBottomBar(() => goToNextPhase())}
    </div>
  );

  // Twist Predict Phase
  const renderTwistPredict = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("🔄", "Nature's Weapon", "The mantis shrimp's secret")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px'
      }}>
        <p style={{ color: colors.text, fontSize: '17px', lineHeight: 1.6, marginBottom: '24px' }}>
          The mantis shrimp punches so fast (23 m/s acceleration at 10,000 g) that it creates a cavitation bubble.
          What happens when the bubble collapses?
        </p>

        <svg width="100%" height="140" viewBox="0 0 400 140" style={{ marginBottom: '20px' }}>
          <defs>
            {/* Shrimp body gradient */}
            <linearGradient id="cavShrimpBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="30%" stopColor="#f43f5e" />
              <stop offset="70%" stopColor="#e11d48" />
              <stop offset="100%" stopColor="#be123c" />
            </linearGradient>
            {/* Shrimp claw gradient */}
            <linearGradient id="cavShrimpClaw" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fda4af" />
              <stop offset="50%" stopColor="#fb7185" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
            {/* Snail shell gradient */}
            <radialGradient id="cavSnailShell" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#d6d3d1" />
              <stop offset="30%" stopColor="#a8a29e" />
              <stop offset="60%" stopColor="#78716c" />
              <stop offset="100%" stopColor="#57534e" />
            </radialGradient>
            {/* Strike energy gradient */}
            <linearGradient id="cavStrikeEnergy" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0" />
              <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </linearGradient>
            {/* Question glow filter */}
            <filter id="cavQuestionGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Strike arrow marker */}
            <marker id="cavStrikeArrow" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
              <polygon points="0 0, 12 4, 0 8" fill="#fbbf24" />
            </marker>
          </defs>

          {/* Water background subtle */}
          <rect x="0" y="0" width="400" height="140" fill="#0c4a6e" opacity="0.3" rx="8" />

          {/* Shrimp claw */}
          <g transform="translate(80, 70)">
            {/* Body shadow */}
            <ellipse cx="2" cy="2" rx="30" ry="15" fill="#1e293b" opacity="0.4" />
            {/* Body */}
            <ellipse cx="0" cy="0" rx="30" ry="15" fill="url(#cavShrimpBody)" stroke="#be123c" strokeWidth="1" />
            {/* Body highlight */}
            <ellipse cx="-8" cy="-5" rx="10" ry="5" fill="#fda4af" opacity="0.5" />
            {/* Claw */}
            <path d="M 25 0 L 70 -12 L 66 0 L 70 12 L 25 0 Z" fill="url(#cavShrimpClaw)" stroke="#f43f5e" strokeWidth="1" />
            {/* Claw highlight */}
            <path d="M 30 -2 L 60 -8" stroke="#fecdd3" strokeWidth="2" opacity="0.6" />
          </g>

          {/* Target snail */}
          <g transform="translate(280, 70)">
            {/* Shell shadow */}
            <ellipse cx="3" cy="3" rx="35" ry="30" fill="#1e293b" opacity="0.4" />
            {/* Shell body */}
            <ellipse cx="0" cy="0" rx="35" ry="30" fill="url(#cavSnailShell)" stroke="#57534e" strokeWidth="2" />
            {/* Shell spiral pattern */}
            <path d="M 0 -15 Q 15 -10 10 0 Q 5 10 -5 5 Q -12 0 -8 -8" fill="none" stroke="#44403c" strokeWidth="2" opacity="0.5" />
            {/* Shell highlight */}
            <ellipse cx="-10" cy="-10" rx="12" ry="8" fill="#e7e5e4" opacity="0.4" />
          </g>

          {/* Strike energy beam */}
          <line x1="125" y1="70" x2="230" y2="70" stroke="url(#cavStrikeEnergy)" strokeWidth="6" />
          <line x1="130" y1="70" x2="225" y2="70" stroke="#fbbf24" strokeWidth="3" markerEnd="url(#cavStrikeArrow)" />

          {/* Speed lines */}
          {[0, 1, 2].map(i => (
            <line key={i} x1={140 + i * 25} y1={60 - i * 5} x2={155 + i * 25} y2={60 - i * 5} stroke="#fbbf24" strokeWidth="2" opacity={0.5 - i * 0.1} />
          ))}
          {[0, 1, 2].map(i => (
            <line key={i} x1={140 + i * 25} y1={80 + i * 5} x2={155 + i * 25} y2={80 + i * 5} stroke="#fbbf24" strokeWidth="2" opacity={0.5 - i * 0.1} />
          ))}

          {/* Question mark with glow */}
          <text x="200" y="115" fill="#06b6d4" fontSize="28" textAnchor="middle" fontWeight="bold" filter="url(#cavQuestionGlow)">?</text>
        </svg>
        {/* Labels outside SVG */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 40px', marginBottom: '16px' }}>
          <span style={{ color: colors.textSecondary, fontSize: typo.small }}>Mantis shrimp claw</span>
          <span style={{ color: colors.warning, fontSize: typo.small, fontWeight: 600 }}>23 m/s strike!</span>
          <span style={{ color: colors.textSecondary, fontSize: typo.small }}>Prey (snail)</span>
        </div>

        <p style={{ color: colors.text, fontSize: '18px', fontWeight: '600', marginBottom: '16px', textAlign: 'center' }}>
          If the initial punch misses, what does the cavitation bubble collapse do?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { value: 'nothing', label: 'Nothing — bubbles are harmless', color: colors.textSecondary },
            { value: 'second', label: 'Delivers a SECOND strike — the collapse hits the prey!', color: colors.success },
            { value: 'defense', label: 'Creates a defensive shield', color: colors.primary },
            { value: 'distraction', label: 'Just makes noise to distract', color: colors.secondary }
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
              playSound(twistPrediction === 'second' ? 'success' : 'failure');
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
            background: twistPrediction === 'second' ? `${colors.success}20` : `${colors.accent}20`,
            borderRadius: '12px',
            border: `2px solid ${twistPrediction === 'second' ? colors.success : colors.accent}`
          }}>
            {twistPrediction === 'second' ? (
              <p style={{ color: colors.success, margin: 0 }}>
                <strong>✓ Exactly!</strong> The mantis shrimp evolved to weaponize cavitation! Even if the punch misses, the collapsing bubble delivers a second impact — a "phantom punch" that can stun or kill prey!
              </p>
            ) : (
              <p style={{ color: colors.accent, margin: 0 }}>
                <strong>Incredible answer!</strong> The bubble collapse acts as a second strike! The mantis shrimp evolved to weaponize cavitation — the collapsing bubble can crack shells even when the physical punch misses.
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
      {renderSectionHeader("🎮", "Mantis Shrimp Strike", "Watch the double impact")}

      <div style={{
        background: colors.card,
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        {/* Strike animation */}
        <div style={{ background: 'linear-gradient(180deg, #0c4a6e 0%, #1e3a5f 100%)', borderRadius: '12px', padding: '10px', marginBottom: '16px' }}>
          <svg width="100%" height="200" viewBox="0 0 400 200">
            <defs>
              {/* Water gradient */}
              <linearGradient id="cavTwistWater" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0c4a6e" />
                <stop offset="50%" stopColor="#0369a1" />
                <stop offset="100%" stopColor="#0c4a6e" />
              </linearGradient>
              {/* Shrimp body gradient */}
              <linearGradient id="cavTwistShrimpBody" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="40%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#be123c" />
              </linearGradient>
              {/* Shrimp claw gradient */}
              <linearGradient id="cavTwistClaw" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fda4af" />
                <stop offset="50%" stopColor="#fb7185" />
                <stop offset="100%" stopColor="#e11d48" />
              </linearGradient>
              {/* Snail gradient */}
              <radialGradient id="cavTwistSnail" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#d6d3d1" />
                <stop offset="40%" stopColor="#a8a29e" />
                <stop offset="100%" stopColor="#57534e" />
              </radialGradient>
              {/* Impact flash gradient */}
              <radialGradient id="cavImpactFlash" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fef3c7" />
                <stop offset="40%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>
              {/* Cavitation collapse gradient */}
              <radialGradient id="cavTwistCollapse" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fef3c7" />
                <stop offset="30%" stopColor="#fbbf24" />
                <stop offset="60%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ef4444" />
              </radialGradient>
              {/* Eye glow */}
              <radialGradient id="cavEyeGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="60%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#15803d" />
              </radialGradient>
              {/* Impact glow filter */}
              <filter id="cavImpactGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Cavitation glow filter */}
              <filter id="cavTwistGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Water background */}
            <rect x="0" y="0" width="400" height="200" fill="url(#cavTwistWater)" rx="10" />

            {/* Water caustics */}
            <g opacity="0.1">
              {[0, 1, 2].map(i => (
                <ellipse key={i} cx={60 + i * 120} cy={25} rx={40} ry={12} fill="#7dd3fc">
                  <animate attributeName="opacity" values="0.05;0.15;0.05" dur={`${2 + i * 0.4}s`} repeatCount="indefinite" />
                </ellipse>
              ))}
            </g>

            {/* Motion blur lines when striking */}
            {shrimpStrike && (
              <g opacity="0.6">
                {[0, 1, 2, 3].map(i => (
                  <line key={i} x1={90 + i * 15} y1={90 + (i % 2) * 20} x2={120 + i * 15} y2={90 + (i % 2) * 20}
                    stroke="#fbbf24" strokeWidth="2" opacity={0.5 - i * 0.1} />
                ))}
              </g>
            )}

            {/* Mantis shrimp */}
            <g transform={`translate(${shrimpStrike ? 140 : 80}, 100)`}>
              {/* Body shadow */}
              <ellipse cx="-28" cy="3" rx="40" ry="20" fill="#1e293b" opacity="0.4" />
              {/* Body with gradient */}
              <ellipse cx="-30" cy="0" rx="40" ry="20" fill="url(#cavTwistShrimpBody)" stroke="#be123c" strokeWidth="1" />
              {/* Body highlight */}
              <ellipse cx="-40" cy="-8" rx="15" ry="7" fill="#fda4af" opacity="0.5" />
              {/* Eyes with glow */}
              <circle cx="-50" cy="-15" r="8" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
              <circle cx="-50" cy="-15" r="5" fill="url(#cavEyeGlow)" />
              <circle cx="-51" cy="-16" r="2" fill="#fff" opacity="0.8" />
              {/* Club/claw with gradient */}
              <g transform={shrimpStrike ? 'translate(60, 0)' : ''}>
                {/* Claw shadow */}
                <path d="M 2 -8 L 62 -13 L 72 2 L 62 17 L 2 12 Z" fill="#1e293b" opacity="0.4" />
                {/* Claw body */}
                <path d="M 0 -10 L 60 -15 L 70 0 L 60 15 L 0 10 Z" fill="url(#cavTwistClaw)" stroke="#e11d48" strokeWidth="1.5" />
                {/* Claw highlight */}
                <path d="M 5 -6 L 55 -10" stroke="#fecdd3" strokeWidth="2" opacity="0.6" />
              </g>
            </g>

            {/* Prey (snail) */}
            <g transform="translate(280, 100)">
              {/* Shell shadow */}
              <ellipse cx="3" cy="3" rx="35" ry="30" fill="#1e293b" opacity="0.4" />
              {/* Shell with gradient */}
              <ellipse cx="0" cy="0" rx="35" ry="30" fill="url(#cavTwistSnail)" stroke="#57534e" strokeWidth="2" />
              {/* Shell spiral */}
              <path d="M 0 -15 Q 15 -10 10 0 Q 5 10 -5 5 Q -12 0 -8 -8" fill="none" stroke="#44403c" strokeWidth="2" opacity="0.5" />
              {/* Shell highlight */}
              <ellipse cx="-10" cy="-10" rx="12" ry="8" fill="#e7e5e4" opacity="0.4" />
              {/* Antenna */}
              <path d="M -10 -20 Q 0 -35 10 -20" fill="none" stroke="#78716c" strokeWidth="2" />
              {/* Crack effect when hit */}
              {showSecondBubble && (
                <g>
                  <path d="M 15 -10 L 25 -5 L 20 5 L 30 10" stroke="#ef4444" strokeWidth="2" fill="none" />
                  <path d="M 18 -15 L 22 -8" stroke="#ef4444" strokeWidth="1.5" fill="none" />
                </g>
              )}
            </g>

            {/* First impact flash */}
            {shrimpStrike && !showSecondBubble && (
              <g transform="translate(210, 100)">
                <circle r="20" fill="url(#cavImpactFlash)" filter="url(#cavImpactGlow)">
                  <animate attributeName="r" values="5;25" dur="0.15s" fill="freeze" />
                </circle>
                {/* Impact rays */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
                  <line key={angle}
                    x1={Math.cos(angle * Math.PI / 180) * 10}
                    y1={Math.sin(angle * Math.PI / 180) * 10}
                    x2={Math.cos(angle * Math.PI / 180) * 30}
                    y2={Math.sin(angle * Math.PI / 180) * 30}
                    stroke="#fbbf24"
                    strokeWidth="2"
                    opacity="0.7"
                  >
                    <animate attributeName="opacity" values="0.8;0" dur="0.2s" fill="freeze" />
                  </line>
                ))}
              </g>
            )}

            {/* Cavitation bubble formation and collapse */}
            {showSecondBubble && (
              <g transform="translate(235, 100)">
                {/* Collapsing bubble with gradient */}
                <circle r="8" fill="url(#cavTwistCollapse)" filter="url(#cavTwistGlow)">
                  <animate attributeName="r" values="25;8" dur="0.3s" fill="freeze" />
                </circle>
                {/* Multiple shock waves */}
                {[1, 2, 3].map(i => (
                  <circle key={i} r={10 * i} fill="none" stroke={i === 1 ? '#fbbf24' : i === 2 ? '#f97316' : '#ef4444'} strokeWidth={3 - i * 0.7} opacity={0.7 / i}>
                    <animate attributeName="r" values={`${5*i};${35+10*i}`} dur="0.35s" fill="freeze" />
                    <animate attributeName="opacity" values={`${0.8/i};0`} dur="0.35s" fill="freeze" />
                  </circle>
                ))}
                {/* Central flash */}
                <circle r="3" fill="#fef3c7">
                  <animate attributeName="r" values="5;0" dur="0.2s" fill="freeze" />
                </circle>
              </g>
            )}

            {/* Speed indicator */}
            {shrimpStrike && (
              <g transform="translate(100, 50)">
                <rect x="0" y="0" width="100" height="24" rx="12" fill="#1e293b" opacity="0.8" />
                <text x="50" y="16" fill="#fbbf24" fontSize="11" textAnchor="middle" fontWeight="600">
                  23 m/s • 10,000 g
                </text>
              </g>
            )}
          </svg>
          {/* Labels outside SVG */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 40px 0' }}>
            <span style={{ color: colors.textSecondary, fontSize: typo.small }}>Mantis Shrimp</span>
            {shrimpStrike && !showSecondBubble && (
              <span style={{ color: colors.warning, fontSize: typo.body, fontWeight: 700 }}>PUNCH!</span>
            )}
            {showSecondBubble && (
              <span style={{ color: colors.collapse, fontSize: typo.body, fontWeight: 700 }}>CAVITATION!</span>
            )}
            <span style={{ color: colors.textSecondary, fontSize: typo.small }}>
              Prey {showSecondBubble && <span style={{ color: colors.accent, fontWeight: 600 }}>CRACK!</span>}
            </span>
          </div>
        </div>

        <button
          onMouseDown={triggerShrimpStrike}
          disabled={shrimpStrike}
          style={{
            width: '100%',
            padding: '14px',
            background: shrimpStrike ? '#444' : `linear-gradient(135deg, ${colors.accent}, ${colors.collapse})`,
            color: colors.text,
            border: 'none',
            borderRadius: '10px',
            cursor: shrimpStrike ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          🦐 Trigger Strike!
        </button>

        {/* Explanation */}
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: colors.background,
          borderRadius: '12px'
        }}>
          <p style={{ color: colors.success, fontWeight: '600', margin: '0 0 8px 0' }}>
            Double Impact Weapon:
          </p>
          <ol style={{ margin: 0, paddingLeft: '20px', color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8 }}>
            <li><strong>Strike 1:</strong> Physical punch at 23 m/s</li>
            <li><strong>Cavitation:</strong> Low-pressure wake forms vapor bubble</li>
            <li><strong>Strike 2:</strong> Bubble collapse delivers second impact!</li>
          </ol>
        </div>
      </div>

      {renderKeyTakeaway("The mantis shrimp evolved to weaponize cavitation — its strike is so fast that even the 'shadow' (collapsing bubble) can crack shells!")}

      {renderBottomBar(() => goToNextPhase())}
    </div>
  );

  // Twist Review Phase
  const renderTwistReview = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("🔬", "Biomimetic Inspiration", "Learning from nature")}

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
              🦐 The Mantis Shrimp's Advantages
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              Fastest punch in the animal kingdom (23 m/s). Even if it misses, the cavitation bubble stuns prey.
              Its club is made of a unique material that resists its own impact force!
            </p>
          </div>

          <div style={{
            padding: '20px',
            background: colors.background,
            borderRadius: '12px'
          }}>
            <p style={{ color: colors.primary, fontWeight: '600', margin: '0 0 8px 0' }}>
              🔬 Research Applications
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              Scientists study mantis shrimp to develop: impact-resistant body armor, underwater acoustic weapons,
              and new materials that can withstand extreme repeated stress.
            </p>
          </div>

          <div style={{
            padding: '20px',
            background: colors.background,
            borderRadius: '12px'
          }}>
            <p style={{ color: colors.success, fontWeight: '600', margin: '0 0 8px 0' }}>
              🐚 Pistol Shrimp: The Sound Maker
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              The pistol shrimp creates cavitation with its claw snap — producing a 210 decibel shockwave!
              Colonies of snapping shrimp are so loud they can interfere with submarine sonar.
            </p>
          </div>
        </div>

        {renderKeyTakeaway("Nature discovered cavitation weapons millions of years ago. Now engineers study these animals to design better materials and tools.")}
      </div>

      {renderBottomBar(() => goToNextPhase())}
    </div>
  );

  // Transfer Phase
  const renderTransfer = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {renderProgressBar()}
      {renderSectionHeader("🌍", "Cavitation Applications", "Destruction and creation")}

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
                  {calculateScore() >= 8 ? "Cavitation Expert!" :
                   calculateScore() >= 6 ? "Great understanding!" :
                   "Keep studying bubble physics!"}
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
          background: `linear-gradient(135deg, ${colors.bubble}20, ${colors.collapse}20)`,
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
                background: [colors.primary, colors.secondary, colors.accent, colors.success, colors.bubble][i % 5],
                borderRadius: i % 2 === 0 ? '50%' : '2px',
                left: `${Math.random() * 100}%`,
                top: '-20px',
                animation: `fall ${2 + Math.random() * 2}s linear infinite`,
                animationDelay: `${Math.random() * 2}s`,
                opacity: 0.8
              }}
            />
          ))}

          <div style={{ fontSize: '64px', marginBottom: '16px' }}>💥🎓</div>

          <h2 style={{ color: colors.text, margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700' }}>
            Cavitation Master!
          </h2>

          <p style={{ color: colors.textSecondary, margin: '0 0 24px 0', fontSize: '16px' }}>
            You understand the explosive physics of collapsing bubbles
          </p>

          <div style={{
            display: 'inline-block',
            padding: '16px 32px',
            background: colors.card,
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <div style={{ color: colors.collapse, fontSize: '36px', fontWeight: '700' }}>
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
              { icon: "○", title: "Vapor Pressure", text: "Low pressure creates bubbles" },
              { icon: "💥", title: "Violent Collapse", text: "5,000°C, 1,000 atm" },
              { icon: "🦐", title: "Nature's Weapon", text: "Mantis shrimp uses it!" }
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

        {renderKeyTakeaway("From ship propellers to medical treatments, cavitation demonstrates how extreme physics can emerge from something as simple as a bubble!")}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            💥 You now understand one of fluid dynamics' most violent phenomena!
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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Cavitation</span>
          <div className="flex items-center gap-1.5">
            {PHASE_ORDER.map((p, i) => {
              const currentIndex = PHASE_ORDER.indexOf(phase);
              return (
                <button
                  key={p}
                  onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    phase === p
                      ? 'bg-blue-400 w-6 shadow-lg shadow-blue-400/30'
                      : currentIndex > i
                        ? 'bg-emerald-500 w-2'
                        : 'bg-slate-700 w-2 hover:bg-slate-600'
                  }`}
                />
              );
            })}
          </div>
          <span className="text-sm font-medium text-blue-400">{phaseLabels[phase]}</span>
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

export default CavitationRenderer;
