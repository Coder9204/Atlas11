'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

interface LaminarTurbulentRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const LaminarTurbulentRenderer: React.FC<LaminarTurbulentRendererProps> = ({ phase, onPhaseComplete, onCorrectAnswer, onIncorrectAnswer }) => {
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

  // Web Audio API sound
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete' = 'click') => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const freqMap = { click: 440, success: 600, failure: 300, transition: 520, complete: 700 };
      oscillator.frequency.value = freqMap[type];
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch {}
  }, []);

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

  // Test questions
  const testQuestions = [
    {
      question: "What primarily determines whether flow is laminar or turbulent?",
      options: [
        { text: "Fluid color", correct: false },
        { text: "Reynolds number (Re = ρvD/μ)", correct: true },
        { text: "Pipe material", correct: false },
        { text: "Fluid temperature only", correct: false }
      ]
    },
    {
      question: "You turn on a faucet slowly — the water stream is clear. What happens when you turn it up high?",
      options: [
        { text: "Stream stays clear but faster", correct: false },
        { text: "Stream becomes white and chaotic", correct: true },
        { text: "Stream gets thinner", correct: false },
        { text: "No change in appearance", correct: false }
      ]
    },
    {
      question: "Which flow type has LOWER drag for most shapes?",
      options: [
        { text: "Turbulent - energy helps it slide", correct: false },
        { text: "Laminar - smooth, orderly motion", correct: true },
        { text: "They have equal drag", correct: false },
        { text: "Depends on color", correct: false }
      ]
    },
    {
      question: "What is the critical Reynolds number for pipe flow transition?",
      options: [
        { text: "Re ≈ 100", correct: false },
        { text: "Re ≈ 2300", correct: true },
        { text: "Re ≈ 10,000", correct: false },
        { text: "Re ≈ 1,000,000", correct: false }
      ]
    },
    {
      question: "Why does adding honey to water change its flow behavior?",
      options: [
        { text: "Honey adds color", correct: false },
        { text: "Higher viscosity raises critical Re threshold", correct: true },
        { text: "Honey is lighter", correct: false },
        { text: "No effect on flow", correct: false }
      ]
    },
    {
      question: "Golf ball dimples work by:",
      options: [
        { text: "Making the ball heavier", correct: false },
        { text: "Triggering turbulent boundary layer (less drag)", correct: true },
        { text: "Increasing laminar flow", correct: false },
        { text: "Aesthetic only", correct: false }
      ]
    },
    {
      question: "Blood flow in arteries is usually:",
      options: [
        { text: "Always turbulent - heart pumps hard", correct: false },
        { text: "Laminar, except in diseased vessels", correct: true },
        { text: "Random chaos", correct: false },
        { text: "Only turbulent in veins", correct: false }
      ]
    },
    {
      question: "To keep flow laminar in a pipe, you should:",
      options: [
        { text: "Increase velocity", correct: false },
        { text: "Decrease pipe diameter", correct: false },
        { text: "Increase viscosity or decrease velocity", correct: true },
        { text: "Make pipe rougher", correct: false }
      ]
    },
    {
      question: "Why do Formula 1 cars have smooth underbodies?",
      options: [
        { text: "Weight reduction", correct: false },
        { text: "Maintain laminar airflow for less drag", correct: true },
        { text: "Aesthetic design", correct: false },
        { text: "Easier to clean", correct: false }
      ]
    },
    {
      question: "The transition from laminar to turbulent is:",
      options: [
        { text: "Gradual and predictable", correct: false },
        { text: "Sudden and sensitive to disturbances", correct: true },
        { text: "Impossible to predict", correct: false },
        { text: "Only occurs in gases", correct: false }
      ]
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
  const handleTestAnswer = (answerIndex: number) => {
    playSound('click');
    const currentQuestion = testAnswers.length;
    const isCorrect = testQuestions[currentQuestion].options[answerIndex].correct;

    if (isCorrect) {
      onCorrectAnswer?.();
    } else {
      onIncorrectAnswer?.();
    }

    setTestAnswers(prev => [...prev, answerIndex]);
  };

  // Calculate test score
  const calculateScore = (): number => {
    return testAnswers.reduce((score, answerIndex, questionIndex) => {
      return score + (testQuestions[questionIndex].options[answerIndex].correct ? 1 : 0);
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

  // Phase labels for display
  const phaseLabels: Record<string, string> = {
    hook: 'Hook',
    predict: 'Predict',
    play: 'Lab',
    review: 'Review',
    twist_predict: 'Twist Predict',
    twist_play: 'Twist Lab',
    twist_review: 'Twist Review',
    transfer: 'Transfer',
    test: 'Test',
    mastery: 'Mastery'
  };

  const phaseOrder = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const currentPhaseIndex = phaseOrder.indexOf(phase);

  // Helper render functions
  const renderProgressBar = () => {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '20px' }}>
        {phaseOrder.map((p, i) => (
          <div
            key={p}
            style={{
              height: '4px',
              flex: 1,
              borderRadius: '2px',
              background: i <= currentPhaseIndex ? `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})` : '#333',
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

            <svg width="340" height="240" viewBox="0 0 340 240" style={{ margin: '0 auto', display: 'block' }}>
              <defs>
                {/* Premium faucet metal gradient */}
                <linearGradient id="lamtFaucetMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#9ca3af" />
                  <stop offset="25%" stopColor="#6b7280" />
                  <stop offset="50%" stopColor="#4b5563" />
                  <stop offset="75%" stopColor="#6b7280" />
                  <stop offset="100%" stopColor="#9ca3af" />
                </linearGradient>

                {/* Faucet spout gradient */}
                <linearGradient id="lamtFaucetSpout" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#6b7280" />
                  <stop offset="40%" stopColor="#4b5563" />
                  <stop offset="100%" stopColor="#374151" />
                </linearGradient>

                {/* Laminar water gradient */}
                <linearGradient id="lamtLaminarWater" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.9" />
                  <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.7" />
                  <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#0891b2" stopOpacity="0.5" />
                </linearGradient>

                {/* Turbulent water gradient */}
                <linearGradient id="lamtTurbulentWater" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.9" />
                  <stop offset="30%" stopColor="#fde68a" stopOpacity="0.8" />
                  <stop offset="70%" stopColor="#fcd34d" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.6" />
                </linearGradient>

                {/* Water droplet glow */}
                <radialGradient id="lamtDropletGlow" cx="50%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#e0f2fe" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                </radialGradient>

                {/* Sink basin gradient */}
                <linearGradient id="lamtSinkBasin" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1f2937" />
                  <stop offset="50%" stopColor="#111827" />
                  <stop offset="100%" stopColor="#030712" />
                </linearGradient>

                {/* Water ripple effect */}
                <radialGradient id="lamtWaterRipple" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
                  <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
                </radialGradient>

                {/* Glow filter */}
                <filter id="lamtWaterGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Bubble filter */}
                <filter id="lamtBubbleFilter" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="1" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Background */}
              <rect width="340" height="240" fill="#0a0f1a" />

              {/* Wall tile pattern */}
              <pattern id="lamtTilePattern" width="30" height="30" patternUnits="userSpaceOnUse">
                <rect width="30" height="30" fill="#111827" stroke="#1f2937" strokeWidth="0.5" />
              </pattern>
              <rect x="0" y="0" width="340" height="180" fill="url(#lamtTilePattern)" />

              {/* Premium Faucet Assembly */}
              <g transform="translate(170, 0)">
                {/* Wall mount plate */}
                <rect x="-50" y="5" width="100" height="20" rx="4" fill="url(#lamtFaucetMetal)" />
                <rect x="-45" y="8" width="90" height="14" rx="3" fill="#374151" opacity="0.3" />

                {/* Faucet body */}
                <rect x="-35" y="20" width="70" height="25" rx="6" fill="url(#lamtFaucetMetal)" />
                <ellipse cx="0" cy="32" rx="30" ry="10" fill="#4b5563" opacity="0.3" />

                {/* Handle */}
                <g transform="translate(-45, 25)">
                  <rect x="0" y="0" width="15" height="8" rx="2" fill="#374151" />
                  <rect x="2" y="-12" width="11" height="14" rx="2" fill="url(#lamtFaucetMetal)" />
                  <circle cx="7.5" cy="-6" r="4" fill="#1f2937" />
                </g>

                {/* Spout */}
                <path d="M -15 45 L -15 55 Q -15 65 0 65 L 0 55 Q -5 55 -5 50 L -5 45 Z" fill="url(#lamtFaucetSpout)" />
                <ellipse cx="-7" cy="65" rx="8" ry="4" fill="#374151" />
                <ellipse cx="-7" cy="65" rx="5" ry="2.5" fill="#1f2937" />
              </g>

              {/* Water stream */}
              {faucetFlow === 0 ? (
                <g>
                  <text x="170" y="120" fill={colors.textSecondary} fontSize="14" textAnchor="middle" fontWeight="500">
                    Adjust the faucet
                  </text>
                  <text x="170" y="140" fill={colors.textSecondary} fontSize="12" textAnchor="middle" opacity="0.7">
                    Use the slider below
                  </text>
                </g>
              ) : faucetFlow < 50 ? (
                // Laminar flow - smooth, glassy stream
                <g>
                  {/* Main laminar stream with glow */}
                  <path
                    d="M 158 70 Q 158 110 156 150 Q 155 170 154 195 L 166 195 Q 167 170 168 150 Q 170 110 170 70 Z"
                    fill="url(#lamtLaminarWater)"
                    filter="url(#lamtWaterGlow)"
                  />
                  {/* Glassy highlight */}
                  <path
                    d="M 161 75 Q 161 110 160 150 L 162 150 Q 163 110 163 75 Z"
                    fill="#ffffff"
                    opacity="0.4"
                  />

                  {/* Ripples in sink */}
                  <ellipse cx="160" cy="198" rx="15" ry="4" fill="url(#lamtWaterRipple)">
                    <animate attributeName="rx" values="15;20;15" dur="1s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0.2;0.5" dur="1s" repeatCount="indefinite" />
                  </ellipse>

                  {/* Label */}
                  <g transform="translate(240, 110)">
                    <rect x="0" y="-12" width="80" height="35" rx="6" fill={colors.laminar} opacity="0.15" />
                    <text x="40" y="5" fill={colors.laminar} fontSize="13" textAnchor="middle" fontWeight="600">Laminar</text>
                    <text x="40" y="18" fill={colors.textSecondary} fontSize="10" textAnchor="middle">Smooth, clear</text>
                  </g>
                </g>
              ) : (
                // Turbulent flow - chaotic, aerated stream
                <g>
                  {/* Chaotic turbulent stream */}
                  <path
                    d="M 153 70 Q 148 90 145 110 Q 140 130 138 150 Q 135 170 130 195 L 190 195 Q 185 170 182 150 Q 180 130 177 110 Q 174 90 175 70 Z"
                    fill="url(#lamtTurbulentWater)"
                    opacity="0.8"
                  >
                    <animate attributeName="d" values="M 153 70 Q 148 90 145 110 Q 140 130 138 150 Q 135 170 130 195 L 190 195 Q 185 170 182 150 Q 180 130 177 110 Q 174 90 175 70 Z; M 155 70 Q 145 90 148 110 Q 138 130 142 150 Q 132 170 135 195 L 185 195 Q 188 170 178 150 Q 182 130 175 110 Q 178 90 173 70 Z; M 153 70 Q 148 90 145 110 Q 140 130 138 150 Q 135 170 130 195 L 190 195 Q 185 170 182 150 Q 180 130 177 110 Q 174 90 175 70 Z" dur="0.3s" repeatCount="indefinite" />
                  </path>

                  {/* White foam/bubbles effect */}
                  <g filter="url(#lamtBubbleFilter)">
                    {[
                      {x: 150, y: 85, r: 4}, {x: 165, y: 95, r: 3}, {x: 155, y: 110, r: 5},
                      {x: 168, y: 125, r: 3}, {x: 148, y: 135, r: 4}, {x: 172, y: 145, r: 3},
                      {x: 145, y: 155, r: 5}, {x: 175, y: 165, r: 4}, {x: 155, y: 175, r: 3},
                      {x: 140, y: 180, r: 4}, {x: 180, y: 185, r: 3}
                    ].map((bubble, i) => (
                      <circle
                        key={i}
                        cx={bubble.x}
                        cy={bubble.y}
                        r={bubble.r}
                        fill="url(#lamtDropletGlow)"
                      >
                        <animate attributeName="cx" values={`${bubble.x};${bubble.x + (i % 2 === 0 ? 8 : -8)};${bubble.x}`} dur={`${0.2 + i * 0.05}s`} repeatCount="indefinite" />
                        <animate attributeName="cy" values={`${bubble.y};${bubble.y + 10};${bubble.y}`} dur={`${0.3 + i * 0.03}s`} repeatCount="indefinite" />
                      </circle>
                    ))}
                  </g>

                  {/* Splashing in sink */}
                  <ellipse cx="160" cy="198" rx="35" ry="8" fill="url(#lamtWaterRipple)">
                    <animate attributeName="rx" values="35;45;35" dur="0.3s" repeatCount="indefinite" />
                  </ellipse>
                  {/* Splash droplets */}
                  {[{x: 130, y: 190}, {x: 190, y: 188}, {x: 145, y: 185}, {x: 175, y: 183}].map((drop, i) => (
                    <circle key={i} cx={drop.x} cy={drop.y} r="2" fill="#67e8f9" opacity="0.6">
                      <animate attributeName="cy" values={`${drop.y};${drop.y - 15};${drop.y}`} dur={`${0.4 + i * 0.1}s`} repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.6;0.2;0.6" dur={`${0.4 + i * 0.1}s`} repeatCount="indefinite" />
                    </circle>
                  ))}

                  {/* Label */}
                  <g transform="translate(240, 110)">
                    <rect x="0" y="-12" width="80" height="35" rx="6" fill={colors.turbulent} opacity="0.15" />
                    <text x="40" y="5" fill={colors.turbulent} fontSize="13" textAnchor="middle" fontWeight="600">Turbulent</text>
                    <text x="40" y="18" fill={colors.textSecondary} fontSize="10" textAnchor="middle">Chaotic, white</text>
                  </g>
                </g>
              )}

              {/* Sink basin */}
              <rect x="80" y="195" width="180" height="35" rx="4" fill="url(#lamtSinkBasin)" stroke="#374151" strokeWidth="1" />
              <rect x="85" y="200" width="170" height="25" rx="3" fill="#0a0f1a" />

              {/* Drain */}
              <circle cx="170" cy="215" r="8" fill="#030712" stroke="#1f2937" strokeWidth="1" />
              <circle cx="170" cy="215" r="4" fill="#111827" />
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
                  playSound('click');
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

      {hookStep === 1 && renderBottomBar(() => onPhaseComplete?.())}
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
                playSound('click');
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
              playSound(prediction === 'water' ? 'success' : 'failure');
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

      {showPredictResult && renderBottomBar(() => onPhaseComplete?.())}
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
          {/* Premium pipe visualization with dye */}
          <div style={{ background: colors.background, borderRadius: '12px', padding: '10px', marginBottom: '16px' }}>
            <svg width="100%" height="280" viewBox="0 0 500 280">
              {/* Premium SVG Definitions */}
              <defs>
                {/* Premium pipe wall gradient - metallic steel look */}
                <linearGradient id="lamtPipeWall" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#6b7280" />
                  <stop offset="15%" stopColor="#4b5563" />
                  <stop offset="50%" stopColor="#374151" />
                  <stop offset="85%" stopColor="#4b5563" />
                  <stop offset="100%" stopColor="#6b7280" />
                </linearGradient>

                {/* Pipe interior gradient - dark with depth */}
                <linearGradient id="lamtPipeInterior" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1f2937" />
                  <stop offset="20%" stopColor="#111827" />
                  <stop offset="50%" stopColor="#030712" />
                  <stop offset="80%" stopColor="#111827" />
                  <stop offset="100%" stopColor="#1f2937" />
                </linearGradient>

                {/* Laminar flow gradient - smooth cyan */}
                <linearGradient id="lamtLaminarFlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
                  <stop offset="30%" stopColor="#06b6d4" stopOpacity="0.6" />
                  <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.3" />
                </linearGradient>

                {/* Turbulent flow gradient - energetic orange */}
                <linearGradient id="lamtTurbulentFlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fb923c" stopOpacity="0.3" />
                  <stop offset="30%" stopColor="#f97316" stopOpacity="0.6" />
                  <stop offset="70%" stopColor="#ea580c" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#fb923c" stopOpacity="0.3" />
                </linearGradient>

                {/* Transition flow gradient - warning yellow */}
                <linearGradient id="lamtTransitionFlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fde047" stopOpacity="0.3" />
                  <stop offset="30%" stopColor="#facc15" stopOpacity="0.6" />
                  <stop offset="70%" stopColor="#eab308" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#fde047" stopOpacity="0.3" />
                </linearGradient>

                {/* Dye injector gradient */}
                <linearGradient id="lamtDyeInjector" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>

                {/* Particle glow radial gradient */}
                <radialGradient id="lamtParticleGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
                  <stop offset="40%" stopColor="#22d3ee" stopOpacity="0.8" />
                  <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
                </radialGradient>

                {/* Turbulent particle glow */}
                <radialGradient id="lamtTurbulentParticleGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fdba74" stopOpacity="1" />
                  <stop offset="40%" stopColor="#fb923c" stopOpacity="0.8" />
                  <stop offset="70%" stopColor="#f97316" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
                </radialGradient>

                {/* Reynolds number indicator gradient */}
                <linearGradient id="lamtReynoldsIndicator" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="33%" stopColor="#4ade80" />
                  <stop offset="50%" stopColor="#facc15" />
                  <stop offset="75%" stopColor="#fb923c" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>

                {/* Transition zone gradient */}
                <linearGradient id="lamtTransitionZone" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#facc15" stopOpacity="0.1" />
                  <stop offset="50%" stopColor="#fb923c" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#facc15" stopOpacity="0.1" />
                </linearGradient>

                {/* Pipe end cap gradient */}
                <radialGradient id="lamtPipeEndCap" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#4b5563" />
                  <stop offset="60%" stopColor="#374151" />
                  <stop offset="100%" stopColor="#1f2937" />
                </radialGradient>

                {/* Glow filter for particles */}
                <filter id="lamtParticleBlur" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="2" />
                </filter>

                {/* Glow filter with merge for bright particles */}
                <filter id="lamtGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Inner shadow for pipe depth */}
                <filter id="lamtInnerShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
                  <feOffset dx="0" dy="2" result="offsetBlur" />
                  <feComposite in="SourceGraphic" in2="offsetBlur" operator="over" />
                </filter>

                {/* Laboratory background gradient */}
                <linearGradient id="lamtLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#030712" />
                  <stop offset="50%" stopColor="#0a0f1a" />
                  <stop offset="100%" stopColor="#030712" />
                </linearGradient>

                {/* Grid pattern for lab feel */}
                <pattern id="lamtLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.4" />
                </pattern>
              </defs>

              {/* Laboratory background */}
              <rect width="500" height="280" fill="url(#lamtLabBg)" />
              <rect width="500" height="280" fill="url(#lamtLabGrid)" />

              {/* Title and flow type indicator */}
              <text x="250" y="22" fill={colors.text} fontSize="14" textAnchor="middle" fontWeight="700" style={{ letterSpacing: '1px' }}>
                {flowType.toUpperCase()} FLOW REGIME
              </text>

              {/* Reynolds Number Indicator Bar */}
              <g transform="translate(50, 35)">
                {/* Background track */}
                <rect x="0" y="0" width="400" height="12" rx="6" fill="#1f2937" stroke="#374151" strokeWidth="1" />

                {/* Gradient fill */}
                <rect x="1" y="1" width="398" height="10" rx="5" fill="url(#lamtReynoldsIndicator)" opacity="0.3" />

                {/* Zone markers */}
                <line x1="80" y1="0" x2="80" y2="12" stroke="#4ade80" strokeWidth="1" opacity="0.6" />
                <line x1="160" y1="0" x2="160" y2="12" stroke="#facc15" strokeWidth="1" opacity="0.6" />
                <text x="40" y="24" fill="#22d3ee" fontSize="8" textAnchor="middle">Laminar</text>
                <text x="120" y="24" fill="#facc15" fontSize="8" textAnchor="middle">Transition</text>
                <text x="280" y="24" fill="#f97316" fontSize="8" textAnchor="middle">Turbulent</text>

                {/* Current Re indicator */}
                {(() => {
                  const rePosition = Math.min(395, Math.max(5, (Re / 10000) * 400));
                  return (
                    <g transform={`translate(${rePosition}, 6)`}>
                      <circle r="8" fill={flowType === 'laminar' ? colors.laminar : flowType === 'turbulent' ? colors.turbulent : colors.warning} filter="url(#lamtGlowFilter)" />
                      <circle r="5" fill="#fff" />
                      <text y="22" fill={flowType === 'laminar' ? colors.laminar : flowType === 'turbulent' ? colors.turbulent : colors.warning} fontSize="10" textAnchor="middle" fontWeight="700">
                        Re = {Re.toFixed(0)}
                      </text>
                    </g>
                  );
                })()}
              </g>

              {/* Main Pipe Assembly */}
              <g transform="translate(25, 100)">
                {/* Pipe inlet end cap */}
                <ellipse cx="15" cy="45" rx="12" ry="50" fill="url(#lamtPipeEndCap)" />
                <ellipse cx="15" cy="45" rx="8" ry="42" fill="#030712" />

                {/* Top pipe wall */}
                <rect x="15" y="0" width="430" height="12" fill="url(#lamtPipeWall)" />
                <rect x="15" y="10" width="430" height="2" fill="#1f2937" />

                {/* Bottom pipe wall */}
                <rect x="15" y="78" width="430" height="12" fill="url(#lamtPipeWall)" />
                <rect x="15" y="78" width="430" height="2" fill="#6b7280" />

                {/* Pipe interior */}
                <rect x="15" y="12" width="430" height="66" fill="url(#lamtPipeInterior)" />

                {/* Transition zone indicator (if in transition) */}
                {flowType === 'transition' && (
                  <rect x="180" y="12" width="100" height="66" fill="url(#lamtTransitionZone)">
                    <animate attributeName="opacity" values="0.3;0.6;0.3" dur="1.5s" repeatCount="indefinite" />
                  </rect>
                )}

                {/* Flow streamlines based on type */}
                {flowType === 'laminar' ? (
                  // Laminar: smooth parallel flow lines with velocity profile
                  <>
                    {[20, 30, 40, 50, 60, 70].map((y, i) => {
                      const distFromCenter = Math.abs(y - 45);
                      const velocity = 1 - (distFromCenter / 35) * 0.6;
                      return (
                        <g key={i}>
                          <line
                            x1="25"
                            y1={y}
                            x2="440"
                            y2={y}
                            stroke="url(#lamtLaminarFlow)"
                            strokeWidth={2 + velocity * 2}
                            opacity={0.4 + velocity * 0.3}
                          />
                          {/* Animated flow arrows */}
                          {[0, 1, 2, 3, 4].map((j) => (
                            <polygon
                              key={j}
                              points={`${80 + j * 90},${y - 3} ${90 + j * 90},${y} ${80 + j * 90},${y + 3}`}
                              fill={colors.laminar}
                              opacity={0.6}
                            >
                              <animate
                                attributeName="transform"
                                type="translate"
                                values={`0,0; ${velocity * 20},0; 0,0`}
                                dur={`${1.5 - velocity * 0.5}s`}
                                repeatCount="indefinite"
                              />
                            </polygon>
                          ))}
                        </g>
                      );
                    })}
                  </>
                ) : flowType === 'turbulent' ? (
                  // Turbulent: chaotic eddies and vortices
                  <>
                    {Array.from({ length: 12 }).map((_, i) => {
                      const baseY = 18 + i * 5;
                      const seed = i * 17;
                      return (
                        <path
                          key={i}
                          d={`M 25 ${baseY}
                             Q ${60 + (seed % 20)} ${baseY + ((seed * 3) % 15) - 7} ${100} ${baseY + ((seed * 5) % 10) - 5}
                             Q ${150 + (seed % 15)} ${baseY + ((seed * 7) % 20) - 10} ${200} ${baseY + ((seed * 2) % 12) - 6}
                             Q ${260 + (seed % 25)} ${baseY + ((seed * 4) % 18) - 9} ${320} ${baseY + ((seed * 6) % 14) - 7}
                             Q ${370 + (seed % 18)} ${baseY + ((seed * 8) % 16) - 8} ${440} ${baseY + ((seed * 3) % 10) - 5}`}
                          fill="none"
                          stroke="url(#lamtTurbulentFlow)"
                          strokeWidth="1.5"
                          opacity="0.5"
                        >
                          <animate
                            attributeName="d"
                            values={`M 25 ${baseY} Q ${60 + (seed % 20)} ${baseY + ((seed * 3) % 15) - 7} ${100} ${baseY + ((seed * 5) % 10) - 5} Q ${150 + (seed % 15)} ${baseY + ((seed * 7) % 20) - 10} ${200} ${baseY + ((seed * 2) % 12) - 6} Q ${260 + (seed % 25)} ${baseY + ((seed * 4) % 18) - 9} ${320} ${baseY + ((seed * 6) % 14) - 7} Q ${370 + (seed % 18)} ${baseY + ((seed * 8) % 16) - 8} ${440} ${baseY + ((seed * 3) % 10) - 5};
                                    M 25 ${baseY + 3} Q ${65 + (seed % 22)} ${baseY + ((seed * 4) % 16) - 5} ${105} ${baseY + ((seed * 6) % 12) - 3} Q ${155 + (seed % 18)} ${baseY + ((seed * 8) % 22) - 8} ${205} ${baseY + ((seed * 3) % 14) - 4} Q ${265 + (seed % 28)} ${baseY + ((seed * 5) % 20) - 7} ${325} ${baseY + ((seed * 7) % 16) - 5} Q ${375 + (seed % 20)} ${baseY + ((seed * 9) % 18) - 6} ${440} ${baseY + ((seed * 4) % 12) - 3};
                                    M 25 ${baseY} Q ${60 + (seed % 20)} ${baseY + ((seed * 3) % 15) - 7} ${100} ${baseY + ((seed * 5) % 10) - 5} Q ${150 + (seed % 15)} ${baseY + ((seed * 7) % 20) - 10} ${200} ${baseY + ((seed * 2) % 12) - 6} Q ${260 + (seed % 25)} ${baseY + ((seed * 4) % 18) - 9} ${320} ${baseY + ((seed * 6) % 14) - 7} Q ${370 + (seed % 18)} ${baseY + ((seed * 8) % 16) - 8} ${440} ${baseY + ((seed * 3) % 10) - 5}`}
                            dur={`${0.8 + (i % 3) * 0.2}s`}
                            repeatCount="indefinite"
                          />
                        </path>
                      );
                    })}
                    {/* Turbulent eddies/vortices */}
                    {[120, 220, 320, 400].map((x, i) => (
                      <circle
                        key={i}
                        cx={x}
                        cy={35 + (i % 3) * 15}
                        r={8 + (i % 2) * 4}
                        fill="none"
                        stroke={colors.turbulent}
                        strokeWidth="1"
                        opacity="0.3"
                      >
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          values={`0 ${x} ${35 + (i % 3) * 15}; 360 ${x} ${35 + (i % 3) * 15}`}
                          dur={`${1 + i * 0.3}s`}
                          repeatCount="indefinite"
                        />
                      </circle>
                    ))}
                  </>
                ) : (
                  // Transition: wavy, unstable flow
                  <>
                    {[25, 35, 45, 55, 65].map((y, i) => (
                      <path
                        key={i}
                        d={`M 25 ${y}
                           Q 80 ${y + (i % 2 === 0 ? 8 : -8)} 140 ${y}
                           Q 200 ${y + (i % 2 === 0 ? -6 : 6)} 260 ${y}
                           Q 320 ${y + (i % 2 === 0 ? 10 : -10)} 380 ${y}
                           Q 420 ${y + (i % 2 === 0 ? -5 : 5)} 440 ${y}`}
                        fill="none"
                        stroke="url(#lamtTransitionFlow)"
                        strokeWidth="2"
                        opacity="0.5"
                      >
                        <animate
                          attributeName="d"
                          values={`M 25 ${y} Q 80 ${y + (i % 2 === 0 ? 8 : -8)} 140 ${y} Q 200 ${y + (i % 2 === 0 ? -6 : 6)} 260 ${y} Q 320 ${y + (i % 2 === 0 ? 10 : -10)} 380 ${y} Q 420 ${y + (i % 2 === 0 ? -5 : 5)} 440 ${y};
                                  M 25 ${y} Q 80 ${y + (i % 2 === 0 ? -6 : 6)} 140 ${y} Q 200 ${y + (i % 2 === 0 ? 10 : -10)} 260 ${y} Q 320 ${y + (i % 2 === 0 ? -8 : 8)} 380 ${y} Q 420 ${y + (i % 2 === 0 ? 6 : -6)} 440 ${y};
                                  M 25 ${y} Q 80 ${y + (i % 2 === 0 ? 8 : -8)} 140 ${y} Q 200 ${y + (i % 2 === 0 ? -6 : 6)} 260 ${y} Q 320 ${y + (i % 2 === 0 ? 10 : -10)} 380 ${y} Q 420 ${y + (i % 2 === 0 ? -5 : 5)} 440 ${y}`}
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </path>
                    ))}
                  </>
                )}

                {/* Dye particles with glow effect */}
                {showDyeInjection && dyeParticles.map(p => (
                  <g key={p.id}>
                    <circle
                      cx={p.x - 25}
                      cy={p.y - 55}
                      r={6}
                      fill={flowType === 'turbulent' ? 'url(#lamtTurbulentParticleGlow)' : 'url(#lamtParticleGlow)'}
                      filter="url(#lamtParticleBlur)"
                    />
                    <circle
                      cx={p.x - 25}
                      cy={p.y - 55}
                      r={3}
                      fill={flowType === 'turbulent' ? colors.turbulent : flowType === 'laminar' ? colors.laminar : colors.warning}
                      filter="url(#lamtGlowFilter)"
                    />
                  </g>
                ))}

                {/* Pipe outlet end cap */}
                <ellipse cx="445" cy="45" rx="12" ry="50" fill="url(#lamtPipeEndCap)" />
                <ellipse cx="445" cy="45" rx="8" ry="42" fill="#0a0f1a" />
              </g>

              {/* Premium Dye Injector Assembly */}
              {showDyeInjection && (
                <g transform="translate(25, 120)">
                  {/* Injector body */}
                  <rect x="-8" y="-15" width="22" height="55" rx="4" fill="url(#lamtDyeInjector)" stroke="#a78bfa" strokeWidth="1" />
                  <rect x="-3" y="-10" width="12" height="45" rx="2" fill="#1e1b4b" opacity="0.5" />

                  {/* Nozzle */}
                  <rect x="14" y="15" width="12" height="8" rx="2" fill="#6d28d9" />
                  <ellipse cx="26" cy="19" rx="3" ry="4" fill="#8b5cf6" />

                  {/* Dye level indicator */}
                  <rect x="0" y="0" width="6" height="30" rx="1" fill="#030712" />
                  <rect x="1" y="10" width="4" height="19" rx="1" fill="#a78bfa">
                    <animate attributeName="height" values="19;15;19" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="y" values="10;14;10" dur="2s" repeatCount="indefinite" />
                  </rect>

                  {/* Label */}
                  <text x="4" y="52" fill="#a78bfa" fontSize="8" textAnchor="middle" fontWeight="600">DYE</text>
                </g>
              )}

              {/* Flow direction arrow */}
              <g transform="translate(250, 255)">
                <line x1="-60" y1="0" x2="60" y2="0" stroke={colors.textSecondary} strokeWidth="2" />
                <polygon points="60,-6 75,0 60,6" fill={colors.textSecondary} />
                <text x="0" y="18" fill={colors.textSecondary} fontSize="10" textAnchor="middle">Flow Direction</text>
              </g>

              {/* Scale/legend */}
              <g transform="translate(420, 240)">
                <rect x="0" y="0" width="70" height="35" rx="4" fill="#111827" stroke="#1f2937" />
                <circle cx="15" cy="12" r="4" fill={colors.laminar} />
                <text x="25" y="15" fill={colors.textSecondary} fontSize="8">Laminar</text>
                <circle cx="15" cy="26" r="4" fill={colors.turbulent} />
                <text x="25" y="29" fill={colors.textSecondary} fontSize="8">Turbulent</text>
              </g>
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

        {renderBottomBar(() => onPhaseComplete?.())}
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

        {/* Premium Visual comparison */}
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: colors.background,
          borderRadius: '12px'
        }}>
          <p style={{ color: colors.text, fontWeight: '600', margin: '0 0 12px 0', textAlign: 'center' }}>
            Dye Test Comparison
          </p>
          <svg width="100%" height="140" viewBox="0 0 450 140">
            <defs>
              {/* Premium pipe gradients for review */}
              <linearGradient id="lamtReviewPipeWall" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#6b7280" />
                <stop offset="30%" stopColor="#4b5563" />
                <stop offset="70%" stopColor="#374151" />
                <stop offset="100%" stopColor="#4b5563" />
              </linearGradient>
              <linearGradient id="lamtReviewPipeInner" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1f2937" />
                <stop offset="50%" stopColor="#0a0f1a" />
                <stop offset="100%" stopColor="#1f2937" />
              </linearGradient>
              <radialGradient id="lamtReviewDyeGlowLam" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="1" />
                <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="lamtReviewDyeGlowTrans" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fde047" stopOpacity="1" />
                <stop offset="60%" stopColor="#facc15" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="lamtReviewDyeGlowTurb" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fb923c" stopOpacity="1" />
                <stop offset="60%" stopColor="#f97316" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
              </radialGradient>
              <filter id="lamtReviewGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Laminar Flow Pipe */}
            <g transform="translate(10, 10)">
              {/* Pipe structure */}
              <rect x="0" y="0" width="130" height="8" rx="2" fill="url(#lamtReviewPipeWall)" />
              <rect x="0" y="52" width="130" height="8" rx="2" fill="url(#lamtReviewPipeWall)" />
              <rect x="0" y="8" width="130" height="44" fill="url(#lamtReviewPipeInner)" />

              {/* Smooth laminar dye line */}
              <line x1="10" y1="30" x2="120" y2="30" stroke={colors.laminar} strokeWidth="4" filter="url(#lamtReviewGlow)" />
              <line x1="10" y1="30" x2="120" y2="30" stroke="#67e8f9" strokeWidth="2" />

              {/* Animated particles */}
              {[20, 45, 70, 95].map((x, i) => (
                <circle key={i} cx={x} cy="30" r="3" fill="url(#lamtReviewDyeGlowLam)">
                  <animate attributeName="cx" values={`${x};${x + 15};${x}`} dur="2s" repeatCount="indefinite" />
                </circle>
              ))}

              {/* Label */}
              <rect x="30" y="68" width="70" height="20" rx="4" fill={colors.laminar} opacity="0.2" />
              <text x="65" y="82" fill={colors.laminar} fontSize="11" textAnchor="middle" fontWeight="600">LAMINAR</text>
              <text x="65" y="100" fill={colors.textSecondary} fontSize="9" textAnchor="middle">Re &lt; 2000</text>
            </g>

            {/* Transition Flow Pipe */}
            <g transform="translate(160, 10)">
              {/* Pipe structure */}
              <rect x="0" y="0" width="130" height="8" rx="2" fill="url(#lamtReviewPipeWall)" />
              <rect x="0" y="52" width="130" height="8" rx="2" fill="url(#lamtReviewPipeWall)" />
              <rect x="0" y="8" width="130" height="44" fill="url(#lamtReviewPipeInner)" />

              {/* Wavy transition dye line */}
              <path d="M 10 30 Q 30 20 50 30 Q 70 40 90 30 Q 110 20 120 30" fill="none" stroke={colors.warning} strokeWidth="4" filter="url(#lamtReviewGlow)">
                <animate attributeName="d" values="M 10 30 Q 30 20 50 30 Q 70 40 90 30 Q 110 20 120 30; M 10 30 Q 30 40 50 30 Q 70 20 90 30 Q 110 40 120 30; M 10 30 Q 30 20 50 30 Q 70 40 90 30 Q 110 20 120 30" dur="1.5s" repeatCount="indefinite" />
              </path>

              {/* Animated particles spreading */}
              {[25, 55, 85].map((x, i) => (
                <g key={i}>
                  <circle cx={x} cy="28" r="3" fill="url(#lamtReviewDyeGlowTrans)">
                    <animate attributeName="cy" values="28;32;28" dur={`${1 + i * 0.2}s`} repeatCount="indefinite" />
                  </circle>
                  <circle cx={x + 10} cy="32" r="2" fill="url(#lamtReviewDyeGlowTrans)">
                    <animate attributeName="cy" values="32;26;32" dur={`${1.2 + i * 0.2}s`} repeatCount="indefinite" />
                  </circle>
                </g>
              ))}

              {/* Label */}
              <rect x="25" y="68" width="80" height="20" rx="4" fill={colors.warning} opacity="0.2" />
              <text x="65" y="82" fill={colors.warning} fontSize="11" textAnchor="middle" fontWeight="600">TRANSITION</text>
              <text x="65" y="100" fill={colors.textSecondary} fontSize="9" textAnchor="middle">2000 - 4000</text>
            </g>

            {/* Turbulent Flow Pipe */}
            <g transform="translate(310, 10)">
              {/* Pipe structure */}
              <rect x="0" y="0" width="130" height="8" rx="2" fill="url(#lamtReviewPipeWall)" />
              <rect x="0" y="52" width="130" height="8" rx="2" fill="url(#lamtReviewPipeWall)" />
              <rect x="0" y="8" width="130" height="44" fill="url(#lamtReviewPipeInner)" />

              {/* Chaotic turbulent dye */}
              <path d="M 10 25 Q 20 40 35 20 Q 50 45 65 25 Q 80 50 95 30 Q 110 15 120 35" fill="none" stroke={colors.turbulent} strokeWidth="3" filter="url(#lamtReviewGlow)">
                <animate attributeName="d" values="M 10 25 Q 20 40 35 20 Q 50 45 65 25 Q 80 50 95 30 Q 110 15 120 35; M 10 35 Q 20 15 35 40 Q 50 20 65 45 Q 80 25 95 40 Q 110 50 120 25; M 10 25 Q 20 40 35 20 Q 50 45 65 25 Q 80 50 95 30 Q 110 15 120 35" dur="0.8s" repeatCount="indefinite" />
              </path>

              {/* Scattered turbulent particles */}
              {[20, 40, 60, 80, 100].map((x, i) => (
                <g key={i}>
                  <circle cx={x} cy={25 + (i % 3) * 10} r="4" fill="url(#lamtReviewDyeGlowTurb)">
                    <animate attributeName="cy" values={`${25 + (i % 3) * 10};${35 - (i % 2) * 15};${25 + (i % 3) * 10}`} dur={`${0.5 + i * 0.1}s`} repeatCount="indefinite" />
                    <animate attributeName="cx" values={`${x};${x + (i % 2 === 0 ? 5 : -5)};${x}`} dur={`${0.6 + i * 0.1}s`} repeatCount="indefinite" />
                  </circle>
                </g>
              ))}

              {/* Eddy visualization */}
              <circle cx="50" cy="30" r="12" fill="none" stroke={colors.turbulent} strokeWidth="1" opacity="0.4">
                <animateTransform attributeName="transform" type="rotate" values="0 50 30; 360 50 30" dur="1s" repeatCount="indefinite" />
              </circle>
              <circle cx="90" cy="35" r="8" fill="none" stroke={colors.turbulent} strokeWidth="1" opacity="0.3">
                <animateTransform attributeName="transform" type="rotate" values="360 90 35; 0 90 35" dur="0.8s" repeatCount="indefinite" />
              </circle>

              {/* Label */}
              <rect x="25" y="68" width="80" height="20" rx="4" fill={colors.turbulent} opacity="0.2" />
              <text x="65" y="82" fill={colors.turbulent} fontSize="11" textAnchor="middle" fontWeight="600">TURBULENT</text>
              <text x="65" y="100" fill={colors.textSecondary} fontSize="9" textAnchor="middle">Re &gt; 4000</text>
            </g>
          </svg>
        </div>

        {renderKeyTakeaway("The Reynolds number determines flow character by comparing how hard fluid pushes (inertia) vs how much it resists (viscosity).")}
      </div>

      {renderBottomBar(() => onPhaseComplete?.())}
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
              playSound(twistPrediction === 'dimpled' ? 'success' : 'failure');
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

      {showTwistResult && renderBottomBar(() => onPhaseComplete?.())}
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

        {/* Premium Flow visualization */}
        <div style={{ background: colors.background, borderRadius: '12px', padding: '10px', marginBottom: '16px' }}>
          <svg width="100%" height="240" viewBox="0 0 500 240">
            <defs>
              {/* Premium sphere gradient */}
              <radialGradient id="lamtSphereGrad" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#9ca3af" />
                <stop offset="40%" stopColor="#6b7280" />
                <stop offset="80%" stopColor="#4b5563" />
                <stop offset="100%" stopColor="#374151" />
              </radialGradient>

              {/* Dimpled sphere gradient */}
              <radialGradient id="lamtDimpledSphereGrad" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#fafafa" />
                <stop offset="30%" stopColor="#e5e7eb" />
                <stop offset="70%" stopColor="#d1d5db" />
                <stop offset="100%" stopColor="#9ca3af" />
              </radialGradient>

              {/* Streamlined body gradient */}
              <linearGradient id="lamtStreamlinedGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#9ca3af" />
                <stop offset="30%" stopColor="#6b7280" />
                <stop offset="70%" stopColor="#4b5563" />
                <stop offset="100%" stopColor="#6b7280" />
              </linearGradient>

              {/* Flat plate gradient */}
              <linearGradient id="lamtFlatPlateGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4b5563" />
                <stop offset="50%" stopColor="#6b7280" />
                <stop offset="100%" stopColor="#4b5563" />
              </linearGradient>

              {/* Laminar boundary layer */}
              <linearGradient id="lamtBLLaminar" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0.2" />
              </linearGradient>

              {/* Turbulent boundary layer */}
              <linearGradient id="lamtBLTurbulent" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fb923c" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#f97316" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#ea580c" stopOpacity="0.2" />
              </linearGradient>

              {/* Large wake gradient */}
              <radialGradient id="lamtLargeWake" cx="20%" cy="50%" r="80%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#dc2626" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
              </radialGradient>

              {/* Small wake gradient */}
              <radialGradient id="lamtSmallWake" cx="20%" cy="50%" r="80%">
                <stop offset="0%" stopColor="#4ade80" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#22c55e" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
              </radialGradient>

              {/* Air flow gradient */}
              <linearGradient id="lamtAirFlow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.2" />
              </linearGradient>

              {/* Glow filters */}
              <filter id="lamtBLGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Wake blur filter */}
              <filter id="lamtWakeBlur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="8" />
              </filter>

              {/* Dimple pattern */}
              <pattern id="lamtDimplePattern" width="12" height="12" patternUnits="userSpaceOnUse">
                <circle cx="6" cy="6" r="3" fill="#9ca3af" />
              </pattern>

              {/* Wind tunnel background */}
              <linearGradient id="lamtWindTunnel" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#111827" />
                <stop offset="50%" stopColor="#0a0f1a" />
                <stop offset="100%" stopColor="#111827" />
              </linearGradient>
            </defs>

            {/* Wind tunnel background */}
            <rect width="500" height="240" fill="url(#lamtWindTunnel)" />

            {/* Grid lines for wind tunnel feel */}
            {[20, 60, 100, 140, 180, 220].map((y, i) => (
              <line key={i} x1="0" y1={y} x2="500" y2={y} stroke="#1f2937" strokeWidth="0.5" opacity="0.3" />
            ))}

            {/* Incoming flow arrows */}
            {[40, 80, 120, 160, 200].map((y, i) => (
              <g key={i}>
                <line x1="10" y1={y} x2="70" y2={y} stroke="url(#lamtAirFlow)" strokeWidth="2" />
                <polygon points="70,-4 82,0 70,4" transform={`translate(0, ${y})`} fill="#22d3ee" opacity="0.6">
                  <animate attributeName="transform" values={`translate(0, ${y}); translate(10, ${y}); translate(0, ${y})`} dur="1.5s" repeatCount="indefinite" />
                </polygon>
              </g>
            ))}

            {/* Title */}
            <text x="250" y="20" fill={colors.text} fontSize="12" textAnchor="middle" fontWeight="600" style={{ letterSpacing: '1px' }}>
              {objectShape === 'sphere' ? 'BOUNDARY LAYER COMPARISON' : objectShape === 'streamlined' ? 'STREAMLINED AERODYNAMICS' : 'BLUFF BODY FLOW'}
            </text>

            {/* Object and flow pattern */}
            {objectShape === 'sphere' && (
              <>
                {/* Smooth Sphere - Left Side */}
                <g transform="translate(130, 120)">
                  {/* Incoming flow streamlines curving around */}
                  {[-50, -30, -10, 10, 30, 50].map((offset, i) => (
                    <path
                      key={i}
                      d={`M -60 ${offset} Q -45 ${offset} -40 ${offset * 0.8} Q -35 ${offset * 0.6} -30 ${offset * 0.3}`}
                      fill="none"
                      stroke={colors.laminar}
                      strokeWidth="1"
                      opacity="0.4"
                    />
                  ))}

                  {/* Sphere with premium gradient */}
                  <circle r="45" fill="url(#lamtSphereGrad)" />
                  <ellipse rx="30" ry="8" transform="translate(-10, -20) rotate(-20)" fill="#fff" opacity="0.15" />

                  {/* Laminar boundary layer - separates early */}
                  <path
                    d="M -45 0 Q -52 -25 -38 -42 Q -10 -55 20 -48 Q 40 -35 42 -10"
                    fill="none"
                    stroke="url(#lamtBLLaminar)"
                    strokeWidth="3"
                    strokeDasharray="6,3"
                    filter="url(#lamtBLGlow)"
                  />
                  <text x="-60" y="-55" fill={colors.laminar} fontSize="8" fontWeight="600">Laminar BL</text>

                  {/* Separation point indicator */}
                  <circle cx="42" cy="-10" r="4" fill={colors.accent} filter="url(#lamtBLGlow)">
                    <animate attributeName="r" values="4;6;4" dur="1s" repeatCount="indefinite" />
                  </circle>
                  <text x="55" y="-5" fill={colors.accent} fontSize="7">Separation</text>

                  {/* Large wake */}
                  <ellipse cx="85" cy="0" rx="70" ry="55" fill="url(#lamtLargeWake)" filter="url(#lamtWakeBlur)" />

                  {/* Wake eddies */}
                  {[{x: 70, y: -20, r: 12}, {x: 90, y: 15, r: 15}, {x: 110, y: -5, r: 10}].map((eddy, i) => (
                    <circle key={i} cx={eddy.x} cy={eddy.y} r={eddy.r} fill="none" stroke={colors.accent} strokeWidth="1" opacity="0.3">
                      <animateTransform attributeName="transform" type="rotate" values={`0 ${eddy.x} ${eddy.y}; 360 ${eddy.x} ${eddy.y}`} dur={`${1.5 + i * 0.3}s`} repeatCount="indefinite" />
                    </circle>
                  ))}

                  {/* Label */}
                  <rect x="-55" y="55" width="110" height="24" rx="4" fill={colors.accent} opacity="0.15" />
                  <text y="70" fill={colors.accent} fontSize="10" textAnchor="middle" fontWeight="600">SMOOTH BALL</text>
                  <text y="82" fill={colors.textSecondary} fontSize="8" textAnchor="middle">Early separation = Large drag</text>
                </g>

                {/* VS indicator */}
                <text x="250" y="125" fill={colors.textSecondary} fontSize="14" textAnchor="middle" fontWeight="700">VS</text>

                {/* Dimpled Sphere - Right Side */}
                <g transform="translate(370, 120)">
                  {/* Incoming flow streamlines */}
                  {[-50, -30, -10, 10, 30, 50].map((offset, i) => (
                    <path
                      key={i}
                      d={`M -60 ${offset} Q -45 ${offset} -40 ${offset * 0.7} Q -35 ${offset * 0.4} -30 ${offset * 0.1}`}
                      fill="none"
                      stroke={colors.turbulent}
                      strokeWidth="1"
                      opacity="0.4"
                    />
                  ))}

                  {/* Dimpled sphere */}
                  <circle r="40" fill="url(#lamtDimpledSphereGrad)" />

                  {/* Visible dimples */}
                  {Array.from({ length: 16 }).map((_, i) => {
                    const angle = (i * Math.PI * 2) / 16;
                    const r = 28;
                    return (
                      <circle
                        key={i}
                        cx={r * Math.cos(angle)}
                        cy={r * Math.sin(angle)}
                        r="4"
                        fill="#9ca3af"
                        stroke="#6b7280"
                        strokeWidth="0.5"
                      />
                    );
                  })}
                  {Array.from({ length: 8 }).map((_, i) => {
                    const angle = (i * Math.PI * 2) / 8 + Math.PI / 8;
                    const r = 18;
                    return (
                      <circle
                        key={i + 16}
                        cx={r * Math.cos(angle)}
                        cy={r * Math.sin(angle)}
                        r="3"
                        fill="#9ca3af"
                        stroke="#6b7280"
                        strokeWidth="0.5"
                      />
                    );
                  })}
                  <ellipse rx="25" ry="6" transform="translate(-8, -18) rotate(-20)" fill="#fff" opacity="0.2" />

                  {/* Turbulent boundary layer - stays attached longer */}
                  <path
                    d="M -40 0 Q -48 -22 -35 -38 Q -8 -50 22 -42 Q 38 -28 40 -5 Q 42 20 35 35"
                    fill="none"
                    stroke="url(#lamtBLTurbulent)"
                    strokeWidth="3"
                    filter="url(#lamtBLGlow)"
                  />
                  <text x="-55" y="-48" fill={colors.turbulent} fontSize="8" fontWeight="600">Turbulent BL</text>

                  {/* Later separation point */}
                  <circle cx="35" cy="35" r="4" fill={colors.success} filter="url(#lamtBLGlow)">
                    <animate attributeName="r" values="4;6;4" dur="1s" repeatCount="indefinite" />
                  </circle>
                  <text x="50" y="40" fill={colors.success} fontSize="7">Late Sep.</text>

                  {/* Small wake */}
                  <ellipse cx="60" cy="5" rx="35" ry="28" fill="url(#lamtSmallWake)" filter="url(#lamtWakeBlur)" />

                  {/* Label */}
                  <rect x="-55" y="55" width="110" height="24" rx="4" fill={colors.success} opacity="0.15" />
                  <text y="70" fill={colors.success} fontSize="10" textAnchor="middle" fontWeight="600">DIMPLED BALL</text>
                  <text y="82" fill={colors.textSecondary} fontSize="8" textAnchor="middle">Late separation = 50% less drag!</text>
                </g>
              </>
            )}

            {objectShape === 'streamlined' && (
              <g transform="translate(250, 120)">
                {/* Incoming flow */}
                {[-60, -40, -20, 0, 20, 40, 60].map((offset, i) => (
                  <path
                    key={i}
                    d={`M -150 ${offset} Q -100 ${offset} -85 ${offset * 0.9} Q -70 ${offset * 0.7} -50 ${offset * 0.5}`}
                    fill="none"
                    stroke={colors.success}
                    strokeWidth="1.5"
                    opacity="0.4"
                  />
                ))}

                {/* Streamlined body */}
                <ellipse rx="100" ry="30" fill="url(#lamtStreamlinedGrad)" />
                <ellipse rx="70" ry="10" transform="translate(-15, -12)" fill="#fff" opacity="0.15" />

                {/* Attached boundary layer all around */}
                <path
                  d="M -100 0 Q -110 -25 -85 -38 Q -30 -45 30 -42 Q 85 -38 100 -8 Q 105 0 100 8 Q 85 38 30 42 Q -30 45 -85 38 Q -110 25 -100 0"
                  fill="none"
                  stroke={colors.success}
                  strokeWidth="2"
                  opacity="0.6"
                  filter="url(#lamtBLGlow)"
                />

                {/* Minimal wake */}
                <ellipse cx="115" cy="0" rx="20" ry="12" fill="url(#lamtSmallWake)" filter="url(#lamtWakeBlur)" />

                {/* Flow continues smoothly */}
                {[-20, 0, 20].map((offset, i) => (
                  <path
                    key={i}
                    d={`M 100 ${offset * 0.3} Q 120 ${offset * 0.5} 150 ${offset * 0.8} Q 180 ${offset} 220 ${offset}`}
                    fill="none"
                    stroke={colors.success}
                    strokeWidth="1"
                    opacity="0.3"
                  />
                ))}

                {/* Label */}
                <rect x="-80" y="50" width="160" height="28" rx="4" fill={colors.success} opacity="0.15" />
                <text y="65" fill={colors.success} fontSize="11" textAnchor="middle" fontWeight="600">STREAMLINED - OPTIMAL</text>
                <text y="78" fill={colors.textSecondary} fontSize="9" textAnchor="middle">Flow stays attached - Minimal drag</text>
              </g>
            )}

            {objectShape === 'flat' && (
              <g transform="translate(250, 120)">
                {/* Incoming flow hitting plate */}
                {[-60, -30, 0, 30, 60].map((offset, i) => (
                  <path
                    key={i}
                    d={`M -150 ${offset} L -20 ${offset}`}
                    fill="none"
                    stroke={colors.primary}
                    strokeWidth="1.5"
                    opacity="0.4"
                  />
                ))}

                {/* Flat plate */}
                <rect x="-15" y="-60" width="30" height="120" rx="3" fill="url(#lamtFlatPlateGrad)" />
                <rect x="-10" y="-55" width="5" height="110" fill="#9ca3af" opacity="0.3" />

                {/* Immediate separation and massive wake */}
                <path
                  d="M 15 -60 Q 30 -70 50 -65 Q 100 -50 120 0 Q 100 50 50 65 Q 30 70 15 60"
                  fill="none"
                  stroke={colors.accent}
                  strokeWidth="2"
                  strokeDasharray="4,2"
                />

                {/* Massive chaotic wake */}
                <ellipse cx="90" cy="0" rx="90" ry="70" fill="url(#lamtLargeWake)" filter="url(#lamtWakeBlur)" />

                {/* Large eddies in wake */}
                {[
                  {x: 60, y: -30, r: 18}, {x: 100, y: 20, r: 22}, {x: 80, y: -10, r: 15},
                  {x: 130, y: -15, r: 12}, {x: 110, y: 35, r: 16}
                ].map((eddy, i) => (
                  <circle key={i} cx={eddy.x} cy={eddy.y} r={eddy.r} fill="none" stroke={colors.accent} strokeWidth="1.5" opacity="0.4">
                    <animateTransform attributeName="transform" type="rotate" values={`0 ${eddy.x} ${eddy.y}; ${i % 2 === 0 ? 360 : -360} ${eddy.x} ${eddy.y}`} dur={`${1 + i * 0.2}s`} repeatCount="indefinite" />
                  </circle>
                ))}

                {/* Separation points marked */}
                <circle cx="15" cy="-60" r="4" fill={colors.accent} filter="url(#lamtBLGlow)">
                  <animate attributeName="r" values="4;6;4" dur="0.8s" repeatCount="indefinite" />
                </circle>
                <circle cx="15" cy="60" r="4" fill={colors.accent} filter="url(#lamtBLGlow)">
                  <animate attributeName="r" values="4;6;4" dur="0.8s" repeatCount="indefinite" />
                </circle>

                {/* Label */}
                <rect x="-80" y="80" width="160" height="28" rx="4" fill={colors.accent} opacity="0.15" />
                <text y="95" fill={colors.accent} fontSize="11" textAnchor="middle" fontWeight="600">FLAT PLATE - WORST</text>
                <text y="108" fill={colors.textSecondary} fontSize="9" textAnchor="middle">Immediate separation - Maximum drag</text>
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

      {renderBottomBar(() => onPhaseComplete?.())}
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

      {renderBottomBar(() => onPhaseComplete?.())}
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
              playSound('success');
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

      {completedApps.size === applications.length && renderBottomBar(() => onPhaseComplete?.())}
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
                {testQuestions.map((q, i) => (
                  <div
                    key={i}
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: i < currentQuestion
                        ? (testQuestions[i].options[testAnswers[i]].correct ? colors.success : colors.accent)
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
                      borderLeft: `4px solid ${q.options[testAnswers[i]].correct ? colors.success : colors.accent}`
                    }}
                  >
                    <p style={{ color: colors.text, margin: '0 0 8px 0', fontSize: '13px', fontWeight: '500' }}>
                      {i + 1}. {q.question}
                    </p>
                    <p style={{
                      color: q.options[testAnswers[i]].correct ? colors.success : colors.accent,
                      margin: '0 0 4px 0',
                      fontSize: '12px'
                    }}>
                      Your answer: {q.options[testAnswers[i]].text}
                      {q.options[testAnswers[i]].correct ? ' ✓' : ` ✗ (Correct: ${q.options.find(o => o.correct)?.text})`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {showTestResults && renderBottomBar(() => onPhaseComplete?.(), false, "Complete Journey")}
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
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Laminar vs Turbulent Flow</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p, i) => (
              <div
                key={p}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-blue-400 w-6 shadow-lg shadow-blue-400/30'
                    : currentPhaseIndex > i
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2'
                }`}
              />
            ))}
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

export default LaminarTurbulentRenderer;
