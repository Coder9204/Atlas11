'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

const realWorldApps = [
   {
      icon: '🏛️',
      title: 'Roman Aqueduct Engineering',
      short: 'Ancient inverted siphons',
      tagline: 'Crossing valleys without pumps',
      description: 'Romans built inverted siphons to carry aqueduct water across valleys. Water flowed down one side and up the other, using atmospheric pressure to push water over obstacles up to 50 meters high.',
      connection: 'Roman siphons demonstrate the same physics as modern siphons: atmospheric pressure pushes water up the ascending leg while gravity pulls it down the descending leg.',
      howItWorks: 'A sealed pipe connects two points at different elevations. Water entering the high side creates a continuous column that atmospheric pressure pushes through the low point and up to the outlet.',
      stats: [
         { value: '50m', label: 'Maximum depth', icon: '📏' },
         { value: '10km', label: 'Longest Roman siphon', icon: '🏗️' },
         { value: '2000 yrs', label: 'Technology age', icon: '📅' }
      ],
      examples: ['Lyon aqueducts', 'Pergamon water system', 'Aspendos aqueduct', 'Constantinople supply'],
      companies: ['Roman Empire engineering corps', 'Modern civil engineers', 'Archaeological researchers'],
      futureImpact: 'Gravity-fed siphon systems remain relevant for irrigation and water supply in developing regions without reliable electricity.',
      color: '#92400E'
   },
   {
      icon: '🚽',
      title: 'Toilet Flush Systems',
      short: 'Self-starting siphons',
      tagline: 'The hidden siphon in every bathroom',
      description: 'Modern toilets use a siphon mechanism to empty the bowl. When water level rises high enough, it starts a siphon in the trapway that pulls all the water and waste out, then breaks automatically.',
      connection: 'The toilet trapway is a self-priming siphon. Flushing raises the water level to start the siphon, and the specific geometry ensures it breaks cleanly when the bowl empties.',
      howItWorks: 'The flush valve releases tank water rapidly, raising bowl level above the trapway crown. This starts a siphon that empties the bowl. Air entering through the flush valve breaks the siphon cleanly.',
      stats: [
         { value: '1.6 gal', label: 'Modern flush volume', icon: '💧' },
         { value: '2-3 sec', label: 'Siphon duration', icon: '⏱️' },
         { value: '4B', label: 'Daily flushes worldwide', icon: '🌍' }
      ],
      examples: ['Residential toilets', 'Commercial fixtures', 'Marine heads', 'Aircraft lavatories'],
      companies: ['TOTO', 'Kohler', 'American Standard', 'Duravit'],
      futureImpact: 'Vacuum-assist and dual-flush systems reduce water consumption while maintaining siphon effectiveness.',
      color: '#3B82F6'
   },
   {
      icon: '🍷',
      title: 'Wine Racking and Transfer',
      short: 'Gentle liquid handling',
      tagline: 'Moving wine without pumps',
      description: 'Winemakers use siphons to transfer wine between containers without disturbing sediment. The gentle gravity-powered flow avoids oxidation and agitation that mechanical pumps might cause.',
      connection: 'Wine siphoning is a classic application: the outlet must be below the source, the tube must be primed, and the siphon breaks when air enters or levels equalize.',
      howItWorks: 'A sanitized tube is filled with water or wine to prime it. One end goes into the source container above the sediment line, the other into a lower receiving vessel. Gravity does the rest.',
      stats: [
         { value: '1-2 gal/min', label: 'Typical flow rate', icon: '🍷' },
         { value: '<1 ppm', label: 'Oxygen pickup', icon: '💨' },
         { value: '5-10', label: 'Rackings per wine', icon: '🔄' }
      ],
      examples: ['Home winemaking', 'Commercial wineries', 'Brewery transfers', 'Laboratory work'],
      companies: ['Fermtech', 'Buon Vino', 'All American', 'Della Toffola'],
      futureImpact: 'Automated racking systems use sensors to detect sediment and control siphon operation without human intervention.',
      color: '#7C3AED'
   },
   {
      icon: '🏥',
      title: 'Medical Chest Drainage',
      short: 'Thoracic siphons save lives',
      tagline: 'Draining fluid with gravity',
      description: 'Chest tubes use water-seal drainage systems that combine siphon action with one-way valves. Gravity pulls fluid and air from the chest cavity while preventing backflow that could collapse the lung.',
      connection: 'The water seal acts as a one-way valve, allowing fluid and air to exit via siphon action while preventing air from entering the chest when the patient inhales.',
      howItWorks: 'A tube from the chest connects to a collection chamber with a water seal. Negative pressure in the chest pushes fluid out, and gravity pulls it into the collection container below patient level.',
      stats: [
         { value: '-20 cmH2O', label: 'Typical suction', icon: '📉' },
         { value: '48-72 hrs', label: 'Typical duration', icon: '⏱️' },
         { value: '1M+', label: 'Annual procedures', icon: '🏥' }
      ],
      examples: ['Pneumothorax treatment', 'Post-surgery drainage', 'Pleural effusion', 'Trauma care'],
      companies: ['Atrium', 'Teleflex', 'BD', 'Medela'],
      futureImpact: 'Digital chest drainage systems with electronic monitoring are replacing traditional water-seal units.',
      color: '#10B981'
   }
];

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

interface SiphonRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const SiphonRenderer: React.FC<SiphonRendererProps> = ({ phase, onPhaseComplete, onCorrectAnswer, onIncorrectAnswer }) => {
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

  // Prime the siphon
  const primeSiphon = () => {
    if (waterLevel <= 0) return;
    setSiphonPrimed(true);
    playSound('transition');
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
      options: [
        { text: "Suction from the tube", correct: false },
        { text: "Gravity pulling the water chain", correct: false },
        { text: "Atmospheric pressure difference", correct: true },
        { text: "Capillary action", correct: false }
      ]
    },
    {
      question: "To start a siphon, you must first:",
      options: [
        { text: "Create a vacuum in the tube", correct: false },
        { text: "Fill the tube with liquid (prime it)", correct: true },
        { text: "Heat the water", correct: false },
        { text: "Seal both ends", correct: false }
      ]
    },
    {
      question: "Where does the water exit need to be relative to the source?",
      options: [
        { text: "Above the source", correct: false },
        { text: "At the same level", correct: false },
        { text: "Below the source surface", correct: true },
        { text: "Position doesn't matter", correct: false }
      ]
    },
    {
      question: "What is the maximum height water can be siphoned over at sea level?",
      options: [
        { text: "Any height", correct: false },
        { text: "About 10 meters", correct: true },
        { text: "About 1 meter", correct: false },
        { text: "About 100 meters", correct: false }
      ]
    },
    {
      question: "Why does a siphon FAIL in a perfect vacuum?",
      options: [
        { text: "Water freezes", correct: false },
        { text: "No atmospheric pressure to push water up", correct: true },
        { text: "Gravity doesn't work", correct: false },
        { text: "Water evaporates", correct: false }
      ]
    },
    {
      question: "If an air bubble enters a working siphon, what happens?",
      options: [
        { text: "Flow increases", correct: false },
        { text: "Nothing changes", correct: false },
        { text: "Flow stops (siphon breaks)", correct: true },
        { text: "Bubble dissolves", correct: false }
      ]
    },
    {
      question: "Why does siphon flow rate increase with greater height difference?",
      options: [
        { text: "More suction", correct: false },
        { text: "Greater pressure differential", correct: true },
        { text: "Wider tube", correct: false },
        { text: "Hotter water", correct: false }
      ]
    },
    {
      question: "Ancient Romans used siphons for:",
      options: [
        { text: "Making wine only", correct: false },
        { text: "Aqueducts crossing valleys", correct: true },
        { text: "Heating baths", correct: false },
        { text: "Weapons", correct: false }
      ]
    },
    {
      question: "A gasoline siphon stops working when:",
      options: [
        { text: "Gas runs out or outlet rises above inlet", correct: true },
        { text: "Temperature drops", correct: false },
        { text: "It gets too fast", correct: false },
        { text: "The tube is too long horizontally", correct: false }
      ]
    },
    {
      question: "The scientific principle behind siphons is best explained by:",
      options: [
        { text: "Bernoulli only", correct: false },
        { text: "Atmospheric pressure pushing, gravity pulling", correct: true },
        { text: "Surface tension", correct: false },
        { text: "Cohesion only", correct: false }
      ]
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
    water: '#3B82F6'
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
      <div style={{
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(12px)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '12px 16px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#94a3b8' }}>Siphon</span>
          <span style={{ fontSize: '14px', color: '#64748b' }}>{phaseLabels[phase]}</span>
        </div>
        {/* Premium phase dots */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          {phaseOrder.map((p, i) => (
            <div
              key={p}
              style={{
                height: '8px',
                width: phase === p ? '24px' : '8px',
                borderRadius: '4px',
                background: i < currentPhaseIndex ? '#10B981' : phase === p ? colors.primary : '#334155',
                boxShadow: phase === p ? `0 0 12px ${colors.primary}50` : 'none',
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
        onPointerDown={!disabled ? onNext : undefined}
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
        onPointerEnter={(e) => {
          if (!disabled) e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onPointerLeave={(e) => {
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
        }}>Water Uphill?</h1>
        <p style={{ margin: 0, color: colors.textSecondary, fontSize: '14px' }}>The magic of siphons</p>
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
              Water always flows downhill, right?<br/>
              Yet with a simple tube, you can make water flow <span style={{ color: colors.water }}>UP and over</span> an obstacle!
            </p>

            <svg width="320" height="200" viewBox="0 0 320 200" style={{ margin: '0 auto', display: 'block' }}>
              <defs>
                {/* Premium water gradient with depth */}
                <linearGradient id="siphWaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
                  <stop offset="30%" stopColor="#3b82f6" stopOpacity="0.85" />
                  <stop offset="60%" stopColor="#2563eb" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.75" />
                </linearGradient>

                {/* Tank metal gradient */}
                <linearGradient id="siphTankMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4b5563" />
                  <stop offset="25%" stopColor="#374151" />
                  <stop offset="50%" stopColor="#4b5563" />
                  <stop offset="75%" stopColor="#374151" />
                  <stop offset="100%" stopColor="#1f2937" />
                </linearGradient>

                {/* Tube gradient with transparency */}
                <linearGradient id="siphTubeOuter" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6b7280" />
                  <stop offset="30%" stopColor="#9ca3af" />
                  <stop offset="50%" stopColor="#d1d5db" stopOpacity="0.6" />
                  <stop offset="70%" stopColor="#9ca3af" />
                  <stop offset="100%" stopColor="#6b7280" />
                </linearGradient>

                <linearGradient id="siphTubeInner" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#374151" stopOpacity="0.5" />
                  <stop offset="50%" stopColor="#1f2937" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#374151" stopOpacity="0.5" />
                </linearGradient>

                {/* Flow water in tube */}
                <linearGradient id="siphFlowWater" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#0ea5e9" stopOpacity="1" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.9" />
                </linearGradient>

                {/* Glow filters */}
                <filter id="siphWaterGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <filter id="siphDropletGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Arrow glow for height difference */}
                <filter id="siphArrowGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Radial gradient for droplets */}
                <radialGradient id="siphDroplet" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#7dd3fc" />
                  <stop offset="50%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0284c7" />
                </radialGradient>
              </defs>

              {/* Upper tank */}
              <rect x="30" y="60" width="80" height="80" rx="5" fill="url(#siphTankMetal)" stroke="#1f2937" strokeWidth="2" />
              <rect x="35" y="70" width="70" height={showSiphonFlow ? 50 : 65} fill="url(#siphWaterGrad)" filter="url(#siphWaterGlow)" />

              {/* Lower tank */}
              <rect x="210" y="120" width="80" height="60" rx="5" fill="url(#siphTankMetal)" stroke="#1f2937" strokeWidth="2" />
              <rect x="215" y={showSiphonFlow ? 140 : 165} width="70" height={showSiphonFlow ? 35 : 10} fill="url(#siphWaterGrad)" filter="url(#siphWaterGlow)" />

              {/* Siphon tube - outer with transparency effect */}
              <path
                d="M 100 80 Q 100 30 160 30 Q 220 30 220 80 L 220 130"
                fill="none"
                stroke="url(#siphTubeOuter)"
                strokeWidth="10"
                strokeLinecap="round"
              />
              {/* Siphon tube - inner */}
              <path
                d="M 100 80 Q 100 30 160 30 Q 220 30 220 80 L 220 130"
                fill="none"
                stroke="url(#siphTubeInner)"
                strokeWidth="6"
                strokeLinecap="round"
              />

              {/* Water in tube when flowing */}
              {showSiphonFlow && (
                <>
                  <path
                    d="M 100 80 Q 100 30 160 30 Q 220 30 220 80 L 220 130"
                    fill="none"
                    stroke="url(#siphFlowWater)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    filter="url(#siphWaterGlow)"
                  />
                  {/* Flow droplets with glow */}
                  <circle cx="220" cy="145" r="5" fill="url(#siphDroplet)" filter="url(#siphDropletGlow)">
                    <animate attributeName="cy" values="130;155" dur="0.5s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="220" cy="135" r="4" fill="url(#siphDroplet)" filter="url(#siphDropletGlow)">
                    <animate attributeName="cy" values="130;155" dur="0.5s" begin="0.25s" repeatCount="indefinite" />
                  </circle>
                </>
              )}

              {/* Height difference arrow with glow */}
              <g filter="url(#siphArrowGlow)">
                <line x1="280" y1="80" x2="280" y2="140" stroke={colors.warning} strokeWidth="2" />
                <polygon points="280,80 275,90 285,90" fill={colors.warning} />
                <polygon points="280,140 275,130 285,130" fill={colors.warning} />
              </g>
            </svg>

            {/* Labels moved outside SVG */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', padding: '0 20px' }}>
              <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Source</span>
              <span style={{ fontSize: typo.small, color: colors.primary }}>Apex (highest point)</span>
              <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Destination</span>
            </div>
            <div style={{ textAlign: 'right', paddingRight: '10px', marginTop: '4px' }}>
              <span style={{ fontSize: typo.small, color: colors.warning }}>Δh</span>
            </div>

            <button
              onPointerDown={() => {
                setShowSiphonFlow(true);
                playSound('transition');
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
                onPointerDown={() => setHookStep(1)}
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

      {hookStep === 1 && renderBottomBar(() => onPhaseComplete?.())}
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
          <defs>
            {/* Reuse gradient IDs with predict prefix */}
            <linearGradient id="siphPredictWater" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#3b82f6" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#2563eb" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.75" />
            </linearGradient>

            <linearGradient id="siphPredictTank" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="50%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            <linearGradient id="siphPredictTube" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="50%" stopColor="#9ca3af" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#6b7280" />
            </linearGradient>

            <radialGradient id="siphPredictDroplet" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="100%" stopColor="#0284c7" />
            </radialGradient>

            <filter id="siphPredictGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Before */}
          <g transform="translate(50, 0)">
            <rect x="20" y="50" width="60" height="60" fill="url(#siphPredictTank)" rx="3" stroke="#1f2937" strokeWidth="1" />
            <rect x="23" y="60" width="54" height="47" fill="url(#siphPredictWater)" filter="url(#siphPredictGlow)" />
            <path d="M 75 70 Q 75 35 100 35 Q 125 35 125 70 L 125 100" fill="none" stroke="url(#siphPredictTube)" strokeWidth="5" strokeLinecap="round" />
            <circle cx="125" cy="105" r="5" fill="url(#siphPredictDroplet)" filter="url(#siphPredictGlow)">
              <animate attributeName="cy" values="100;115" dur="0.4s" repeatCount="indefinite" />
            </circle>
            <line x1="90" y1="60" x2="130" y2="60" stroke={colors.warning} strokeWidth="1" strokeDasharray="3,2" />
          </g>

          {/* After */}
          <g transform="translate(220, 0)">
            <rect x="20" y="50" width="60" height="60" fill="url(#siphPredictTank)" rx="3" stroke="#1f2937" strokeWidth="1" />
            <rect x="23" y="60" width="54" height="47" fill="url(#siphPredictWater)" filter="url(#siphPredictGlow)" />
            <path d="M 75 70 Q 75 35 100 35 Q 125 35 125 50" fill="none" stroke="url(#siphPredictTube)" strokeWidth="5" strokeLinecap="round" />
            <line x1="90" y1="60" x2="130" y2="60" stroke={colors.warning} strokeWidth="1" strokeDasharray="3,2" />
            <text x="125" y="45" fill={colors.accent} fontSize="18">?</text>
          </g>
        </svg>

        {/* Labels moved outside SVG */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '16px' }}>
          <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Before</span>
          <span style={{ fontSize: typo.small, color: colors.textSecondary }}>After (Outlet raised!)</span>
        </div>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: typo.small, color: colors.warning }}>Water level</span>
        </div>

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
              onPointerDown={() => {
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
            onPointerDown={() => {
              setShowPredictResult(true);
              playSound(prediction === 'stops' ? 'success' : 'failure');
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

      {showPredictResult && renderBottomBar(() => onPhaseComplete?.())}
    </div>
  );

  // Play Phase
  const renderPlay = () => {
    const heightDiff = upperTankHeight - lowerTankHeight;
    const canFlow = heightDiff > 0 && siphonPrimed && waterLevel > 0;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        paddingTop: '48px',
        paddingBottom: '100px'
      }}>
        <div style={{ padding: isMobile ? '16px' : '24px' }}>
          {renderProgressBar()}
          {renderSectionHeader("🎮", "Siphon Simulator", "Control the height difference")}
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingLeft: isMobile ? '16px' : '24px',
          paddingRight: isMobile ? '16px' : '24px',
          paddingBottom: '80px',
          paddingTop: '44px'
        }}>
          <div style={{
            background: colors.card,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '20px'
          }}>
          {/* Siphon visualization */}
          <div style={{ background: colors.background, borderRadius: '12px', padding: '10px', marginBottom: '16px' }}>
            <svg width="100%" height="220" viewBox="0 0 400 220">
              <defs>
                {/* Premium water gradient with depth */}
                <linearGradient id="siphPlayWater" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.95" />
                  <stop offset="25%" stopColor="#3b82f6" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#2563eb" stopOpacity="0.85" />
                  <stop offset="75%" stopColor="#1d4ed8" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#1e40af" stopOpacity="0.75" />
                </linearGradient>

                {/* Tank metal gradient */}
                <linearGradient id="siphPlayTank" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4b5563" />
                  <stop offset="25%" stopColor="#374151" />
                  <stop offset="50%" stopColor="#4b5563" />
                  <stop offset="75%" stopColor="#374151" />
                  <stop offset="100%" stopColor="#1f2937" />
                </linearGradient>

                {/* Tube outer gradient with transparency */}
                <linearGradient id="siphPlayTubeOuter" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6b7280" />
                  <stop offset="25%" stopColor="#9ca3af" />
                  <stop offset="50%" stopColor="#d1d5db" stopOpacity="0.5" />
                  <stop offset="75%" stopColor="#9ca3af" />
                  <stop offset="100%" stopColor="#6b7280" />
                </linearGradient>

                {/* Tube inner/flowing water */}
                <linearGradient id="siphPlayFlowWater" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
                  <stop offset="30%" stopColor="#0ea5e9" stopOpacity="1" />
                  <stop offset="70%" stopColor="#0ea5e9" stopOpacity="1" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.9" />
                </linearGradient>

                {/* Inactive tube gradient */}
                <linearGradient id="siphPlayTubeInactive" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#374151" stopOpacity="0.5" />
                  <stop offset="50%" stopColor="#1f2937" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#374151" stopOpacity="0.5" />
                </linearGradient>

                {/* Flow particle gradient */}
                <radialGradient id="siphPlayParticle" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#7dd3fc" />
                  <stop offset="40%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0284c7" />
                </radialGradient>

                {/* Scale line gradient */}
                <linearGradient id="siphPlayScale" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#6b7280" />
                  <stop offset="100%" stopColor="#374151" />
                </linearGradient>

                {/* Glow filters */}
                <filter id="siphPlayWaterGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <filter id="siphPlayFlowGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <filter id="siphPlayParticleGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Height scale */}
              <line x1="20" y1="30" x2="20" y2="200" stroke="url(#siphPlayScale)" strokeWidth="2" />
              {[0, 25, 50, 75, 100].map(h => (
                <g key={h}>
                  <line x1="15" y1={200 - h * 1.5} x2="25" y2={200 - h * 1.5} stroke="#6b7280" strokeWidth="1" />
                </g>
              ))}

              {/* Upper tank */}
              <g transform={`translate(80, ${200 - upperTankHeight - 50})`}>
                <rect x="0" y="0" width="70" height="50" rx="4" fill="url(#siphPlayTank)" stroke="#1f2937" strokeWidth="2" />
                <rect x="3" y={50 - waterLevel * 0.45} width="64" height={waterLevel * 0.45} fill="url(#siphPlayWater)" filter="url(#siphPlayWaterGlow)" />
              </g>

              {/* Lower tank */}
              <g transform={`translate(250, ${200 - lowerTankHeight - 40})`}>
                <rect x="0" y="0" width="70" height="40" rx="4" fill="url(#siphPlayTank)" stroke="#1f2937" strokeWidth="2" />
                <rect x="3" y={40 - (100 - waterLevel) * 0.35} width="64" height={Math.max(0, (100 - waterLevel) * 0.35)} fill="url(#siphPlayWater)" filter="url(#siphPlayWaterGlow)" />
              </g>

              {/* Siphon tube */}
              {(() => {
                const sourceY = 200 - upperTankHeight - 25;
                const destY = 200 - lowerTankHeight - 20;
                const apexY = Math.min(sourceY, destY) - 40;

                return (
                  <>
                    {/* Outer tube with transparency effect */}
                    <path
                      d={`M 145 ${sourceY} Q 145 ${apexY} 200 ${apexY} Q 255 ${apexY} 255 ${destY}`}
                      fill="none"
                      stroke="url(#siphPlayTubeOuter)"
                      strokeWidth="12"
                      strokeLinecap="round"
                    />
                    {/* Inner tube / water */}
                    <path
                      d={`M 145 ${sourceY} Q 145 ${apexY} 200 ${apexY} Q 255 ${apexY} 255 ${destY}`}
                      fill="none"
                      stroke={canFlow ? 'url(#siphPlayFlowWater)' : 'url(#siphPlayTubeInactive)'}
                      strokeWidth="7"
                      strokeLinecap="round"
                      filter={canFlow ? 'url(#siphPlayFlowGlow)' : undefined}
                    />
                    {/* Flow animation particle */}
                    {canFlow && (
                      <circle r="5" fill="url(#siphPlayParticle)" filter="url(#siphPlayParticleGlow)">
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
            </svg>

            {/* Labels moved outside SVG */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 40px 0' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: typo.small, color: colors.textSecondary, display: 'block' }}>Source Tank</span>
                <span style={{ fontSize: typo.body, color: colors.text, fontWeight: '600' }}>{waterLevel.toFixed(0)}%</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: typo.small, color: heightDiff > 0 ? colors.success : colors.accent }}>
                  Δh = {heightDiff > 0 ? '+' : ''}{heightDiff}
                </span>
                <span style={{ fontSize: typo.label, color: colors.textSecondary, display: 'block' }}>
                  {heightDiff > 0 ? 'Will flow' : 'No flow'}
                </span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: typo.small, color: colors.textSecondary, display: 'block' }}>Destination</span>
              </div>
            </div>
            {canFlow && (
              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <span style={{ fontSize: typo.body, color: colors.water, fontWeight: '600' }}>
                  Flow rate: {flowRate.toFixed(1)} units/s
                </span>
              </div>
            )}
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
                style={{
                  width: '100%',
                  height: '20px',
                  accentColor: '#3b82f6',
                  touchAction: 'pan-y',
                  WebkitAppearance: 'none'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textSecondary, marginTop: '4px' }}>
                <span>20</span>
                <span>100</span>
              </div>
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
                style={{
                  width: '100%',
                  height: '20px',
                  accentColor: '#3b82f6',
                  touchAction: 'pan-y',
                  WebkitAppearance: 'none'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textSecondary, marginTop: '4px' }}>
                <span>10</span>
                <span>90</span>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onPointerDown={primeSiphon}
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
                onPointerDown={resetSiphon}
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

        {renderBottomBar(() => onPhaseComplete?.())}
        </div>
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
          <svg width="100%" height="100" viewBox="0 0 400 100">
            <defs>
              {/* Siphon tube gradient */}
              <linearGradient id="siphReviewTube" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
                <stop offset="30%" stopColor="#0ea5e9" />
                <stop offset="70%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.9" />
              </linearGradient>

              {/* Flow arrow gradient */}
              <linearGradient id="siphReviewArrow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={colors.primary} stopOpacity="0.5" />
                <stop offset="50%" stopColor={colors.primary} />
                <stop offset="100%" stopColor={colors.primary} stopOpacity="0.8" />
              </linearGradient>

              {/* Pressure point gradients */}
              <radialGradient id="siphReviewPressureHigh" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#fca5a5" />
                <stop offset="100%" stopColor="#ef4444" />
              </radialGradient>

              <radialGradient id="siphReviewPressureLow" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#fde047" />
                <stop offset="100%" stopColor="#eab308" />
              </radialGradient>

              <radialGradient id="siphReviewPressureOut" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#6ee7b7" />
                <stop offset="100%" stopColor="#10b981" />
              </radialGradient>

              {/* Glow filters */}
              <filter id="siphReviewTubeGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="siphReviewPointGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="siphReviewArrowGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Arrow marker */}
              <marker id="siphReviewFlowArrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <path d="M0,0 L0,6 L9,3 z" fill={colors.primary} />
              </marker>
            </defs>

            {/* Siphon profile with glow */}
            <path d="M 50 70 Q 50 30 150 30 Q 250 30 250 50 L 350 80" fill="none" stroke="url(#siphReviewTube)" strokeWidth="5" strokeLinecap="round" filter="url(#siphReviewTubeGlow)" />

            {/* Pressure points with glow */}
            <circle cx="50" cy="70" r="7" fill="url(#siphReviewPressureHigh)" filter="url(#siphReviewPointGlow)" />
            <circle cx="150" cy="30" r="7" fill="url(#siphReviewPressureLow)" filter="url(#siphReviewPointGlow)" />
            <circle cx="350" cy="80" r="7" fill="url(#siphReviewPressureOut)" filter="url(#siphReviewPointGlow)" />

            {/* Flow arrow with glow */}
            <line x1="100" y1="50" x2="290" y2="65" stroke="url(#siphReviewArrow)" strokeWidth="2" markerEnd="url(#siphReviewFlowArrow)" filter="url(#siphReviewArrowGlow)" />
          </svg>

          {/* Labels moved outside SVG */}
          <div style={{ textAlign: 'center', marginTop: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: typo.body, color: colors.text, fontWeight: '600' }}>Pressure Along the Siphon</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px' }}>
            <span style={{ fontSize: typo.small, color: colors.accent }}>P_atm + pgh</span>
            <span style={{ fontSize: typo.small, color: colors.warning }}>P_low (apex)</span>
            <span style={{ fontSize: typo.small, color: colors.success }}>P_atm</span>
          </div>
        </div>

        {renderKeyTakeaway("A siphon is driven by atmospheric pressure pushing water into the tube and gravity pulling it out — creating continuous flow without any pump!")}
      </div>

      {renderBottomBar(() => onPhaseComplete?.())}
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
          <defs>
            {/* Wall gradient */}
            <linearGradient id="siphTwistWall" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="30%" stopColor="#6b7280" />
              <stop offset="70%" stopColor="#6b7280" />
              <stop offset="100%" stopColor="#4b5563" />
            </linearGradient>

            {/* Tank gradient */}
            <linearGradient id="siphTwistTank" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="50%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* Water gradient */}
            <linearGradient id="siphTwistWater" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.75" />
            </linearGradient>

            {/* Dashed tube gradient */}
            <linearGradient id="siphTwistTube" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#9ca3af" />
              <stop offset="50%" stopColor="#d1d5db" />
              <stop offset="100%" stopColor="#9ca3af" />
            </linearGradient>

            {/* Height marker gradient */}
            <linearGradient id="siphTwistHeight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="siphTwistWaterGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="siphTwistHeightGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Wall with gradient */}
          <rect x="175" y="20" width="50" height="120" fill="url(#siphTwistWall)" rx="2" />

          {/* Source tank */}
          <rect x="40" y="90" width="50" height="40" fill="url(#siphTwistTank)" rx="3" stroke="#1f2937" strokeWidth="1" />
          <rect x="43" y="95" width="44" height="32" fill="url(#siphTwistWater)" filter="url(#siphTwistWaterGlow)" />

          {/* Destination tank */}
          <rect x="310" y="100" width="50" height="30" fill="url(#siphTwistTank)" rx="3" stroke="#1f2937" strokeWidth="1" />

          {/* Very high siphon - dashed */}
          <path d="M 85 100 Q 85 10 200 10 Q 315 10 315 105" fill="none" stroke="url(#siphTwistTube)" strokeWidth="5" strokeDasharray="8,4" strokeLinecap="round" />

          {/* Height markers with glow */}
          <g filter="url(#siphTwistHeightGlow)">
            <line x1="380" y1="100" x2="380" y2="10" stroke="url(#siphTwistHeight)" strokeWidth="2" />
            <polygon points="380,10 375,20 385,20" fill={colors.accent} />
            <polygon points="380,100 375,90 385,90" fill={colors.accent} />
          </g>
        </svg>

        {/* Labels moved outside SVG */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', padding: '0 30px' }}>
          <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Source</span>
          <span style={{ fontSize: typo.small, color: colors.textSecondary }}>TALL WALL</span>
          <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Destination</span>
        </div>
        <div style={{ textAlign: 'right', paddingRight: '10px' }}>
          <span style={{ fontSize: typo.small, color: colors.accent }}>?? m</span>
        </div>

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
              onPointerDown={() => {
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
            onPointerDown={() => {
              setShowTwistResult(true);
              playSound(twistPrediction === '10m' ? 'success' : 'failure');
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

      {showTwistResult && renderBottomBar(() => onPhaseComplete?.())}
    </div>
  );

  // Twist Play Phase
  const renderTwistPlay = () => {
    const works = siphonWorks(apexHeight, vacuumMode);

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        paddingTop: '48px',
        paddingBottom: '100px'
      }}>
        <div style={{ padding: isMobile ? '16px' : '24px' }}>
          {renderProgressBar()}
          {renderSectionHeader("🎮", "Height Limit Lab", "Find the breaking point")}
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingLeft: isMobile ? '16px' : '24px',
          paddingRight: isMobile ? '16px' : '24px',
          paddingBottom: '80px',
          paddingTop: '44px'
        }}>

        <div style={{
          background: colors.card,
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          {/* Visualization */}
          <div style={{ background: colors.background, borderRadius: '12px', padding: '10px', marginBottom: '16px' }}>
            <svg width="100%" height="200" viewBox="0 0 400 200">
              <defs>
                {/* Water gradient */}
                <linearGradient id="siphTwistPlayWater" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.95" />
                  <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.8" />
                </linearGradient>

                {/* Tank gradient */}
                <linearGradient id="siphTwistPlayTank" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4b5563" />
                  <stop offset="50%" stopColor="#374151" />
                  <stop offset="100%" stopColor="#1f2937" />
                </linearGradient>

                {/* Working tube gradient */}
                <linearGradient id="siphTwistPlayTubeWork" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
                  <stop offset="30%" stopColor="#0ea5e9" />
                  <stop offset="70%" stopColor="#0ea5e9" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.9" />
                </linearGradient>

                {/* Broken tube gradient */}
                <linearGradient id="siphTwistPlayTubeBroken" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f87171" stopOpacity="0.5" />
                  <stop offset="50%" stopColor="#ef4444" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity="0.5" />
                </linearGradient>

                {/* Scale gradient */}
                <linearGradient id="siphTwistPlayScale" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#6b7280" />
                  <stop offset="100%" stopColor="#374151" />
                </linearGradient>

                {/* Critical line gradient */}
                <linearGradient id="siphTwistPlayCritical" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#ef4444" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.3" />
                </linearGradient>

                {/* Status indicator gradients */}
                <radialGradient id="siphTwistPlayStatusOk" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#6ee7b7" />
                  <stop offset="100%" stopColor="#10b981" />
                </radialGradient>

                <radialGradient id="siphTwistPlayStatusFail" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#fca5a5" />
                  <stop offset="100%" stopColor="#ef4444" />
                </radialGradient>

                {/* Bubble gradient */}
                <radialGradient id="siphTwistPlayBubble" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#e5e7eb" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#d1d5db" stopOpacity="0.5" />
                </radialGradient>

                {/* Vacuum indicator gradient */}
                <linearGradient id="siphTwistPlayVacuum" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0.3" />
                </linearGradient>

                {/* Glow filters */}
                <filter id="siphTwistPlayWaterGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <filter id="siphTwistPlayTubeGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <filter id="siphTwistPlayStatusGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <filter id="siphTwistPlayBubbleGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Height scale */}
              <line x1="30" y1="180" x2="30" y2="20" stroke="url(#siphTwistPlayScale)" strokeWidth="2" />
              {[0, 5, 10, 15, 20].map(h => (
                <g key={h}>
                  <line x1="25" y1={180 - h * 8} x2="35" y2={180 - h * 8} stroke="#6b7280" strokeWidth="1" />
                </g>
              ))}

              {/* Critical line at 10m with glow */}
              <line x1="35" y1={180 - 10 * 8} x2="380" y2={180 - 10 * 8} stroke="url(#siphTwistPlayCritical)" strokeWidth="2" strokeDasharray="8,4" />

              {/* Ground/water level - Source tank */}
              <rect x="50" y="160" width="100" height="30" fill="url(#siphTwistPlayTank)" rx="4" stroke="#1f2937" strokeWidth="1" />
              <rect x="55" y="165" width="90" height="20" fill="url(#siphTwistPlayWater)" filter="url(#siphTwistPlayWaterGlow)" />

              {/* Siphon tube with variable apex */}
              <path
                d={`M 145 165 Q 145 ${180 - apexHeight * 8} 200 ${180 - apexHeight * 8} Q 255 ${180 - apexHeight * 8} 255 175`}
                fill="none"
                stroke={works ? 'url(#siphTwistPlayTubeWork)' : 'url(#siphTwistPlayTubeBroken)'}
                strokeWidth="8"
                strokeLinecap="round"
                filter="url(#siphTwistPlayTubeGlow)"
              />

              {/* Destination tank */}
              <rect x="250" y="170" width="80" height="25" fill="url(#siphTwistPlayTank)" rx="4" stroke="#1f2937" strokeWidth="1" />

              {/* Status at apex with glow */}
              <g transform={`translate(200, ${175 - apexHeight * 8})`}>
                <circle r="12" fill={works ? 'url(#siphTwistPlayStatusOk)' : 'url(#siphTwistPlayStatusFail)'} filter="url(#siphTwistPlayStatusGlow)" />
              </g>

              {/* Vacuum indicator */}
              {vacuumMode && (
                <g transform="translate(300, 50)">
                  <rect x="-35" y="-18" width="70" height="36" rx="8" fill="url(#siphTwistPlayVacuum)" stroke={colors.secondary} strokeWidth="1" />
                </g>
              )}

              {/* Bubble if broken */}
              {!works && !vacuumMode && (
                <g transform={`translate(200, ${180 - apexHeight * 8})`}>
                  <circle r="10" fill="url(#siphTwistPlayBubble)" filter="url(#siphTwistPlayBubbleGlow)" />
                </g>
              )}
            </svg>

            {/* Labels moved outside SVG */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 20px 0' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                {[0, 5, 10, 15, 20].map(h => (
                  <span key={h} style={{ fontSize: typo.label, color: h === 10 ? colors.accent : colors.textSecondary }}>{h}m</span>
                ))}
              </div>
              <span style={{ fontSize: typo.small, color: colors.accent }}>Max ~10.3m</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 40px 0' }}>
              <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Source</span>
              <span style={{ fontSize: typo.body, color: colors.text, fontWeight: '600' }}>{apexHeight}m apex {works ? '(OK)' : '(FAIL)'}</span>
              <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Destination</span>
            </div>
            {vacuumMode && (
              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <span style={{ fontSize: typo.body, color: colors.secondary, fontWeight: '600' }}>VACUUM MODE</span>
              </div>
            )}
            {!works && !vacuumMode && (
              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <span style={{ fontSize: typo.small, color: colors.accent }}>Vapor bubble formed!</span>
              </div>
            )}
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
                style={{
                  width: '100%',
                  height: '20px',
                  accentColor: '#3b82f6',
                  touchAction: 'pan-y',
                  WebkitAppearance: 'none'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textSecondary, marginTop: '4px' }}>
                <span>1m</span>
                <span style={{ color: colors.accent }}>← Limit ~10m →</span>
                <span>15m</span>
              </div>
            </div>

            {/* Vacuum mode toggle */}
            <button
              onPointerDown={() => setVacuumMode(!vacuumMode)}
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

          {/* Observation guidance */}
          <div style={{
            marginTop: '16px',
            padding: '16px',
            background: `${colors.primary}15`,
            borderRadius: '12px',
            border: `1px solid ${colors.primary}30`
          }}>
            <p style={{ color: colors.primary, fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0' }}>
              👁️ What to Watch:
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
              Adjust the apex height slider and observe how the status indicator at the tube's peak changes from green (works) to red (broken) at around 10 meters. Notice the water tube color changes too. Try enabling vacuum mode to see what happens when there's no atmospheric pressure.
            </p>
          </div>

          {/* Before/After comparison */}
          <div style={{
            marginTop: '16px',
            padding: '16px',
            background: colors.background,
            borderRadius: '12px',
            border: `1px solid ${works ? colors.success : colors.accent}30`
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0' }}>
              📊 Before vs Current:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
              <div>
                <p style={{ color: colors.textSecondary, fontSize: '12px', margin: '0 0 4px 0' }}>Low apex (5m):</p>
                <p style={{ color: colors.success, fontSize: '13px', margin: 0 }}>✓ Always works</p>
              </div>
              <div>
                <p style={{ color: colors.textSecondary, fontSize: '12px', margin: '0 0 4px 0' }}>Current ({apexHeight}m):</p>
                <p style={{ color: works ? colors.success : colors.accent, fontSize: '13px', margin: 0 }}>
                  {works ? '✓ Works fine' : '✗ Siphon broken'}
                </p>
              </div>
            </div>
          </div>

          {/* Color legend */}
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: colors.background,
            borderRadius: '12px',
            border: '1px solid #444'
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: '600', margin: '0 0 6px 0' }}>
              🎨 Color Guide:
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }}></div>
                <span style={{ fontSize: '11px', color: colors.textSecondary }}>Green = Working siphon</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }}></div>
                <span style={{ fontSize: '11px', color: colors.textSecondary }}>Red = Broken/Failed</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6' }}></div>
                <span style={{ fontSize: '11px', color: colors.textSecondary }}>Blue = Water flow</span>
              </div>
            </div>
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

        {renderBottomBar(() => onPhaseComplete?.())}
        </div>
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

      {renderBottomBar(() => onPhaseComplete?.())}
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
              onPointerDown={() => {
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
            onPointerDown={() => {
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
                    onPointerDown={() => handleTestAnswer(i)}
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
                    onPointerEnter={(e) => {
                      e.currentTarget.style.borderColor = colors.primary;
                      e.currentTarget.style.background = `${colors.primary}10`;
                    }}
                    onPointerLeave={(e) => {
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
                onPointerDown={() => {
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
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/3 rounded-full blur-3xl" />

      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Siphon Physics</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p, i) => (
              <div
                key={p}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-cyan-400 w-6 shadow-lg shadow-cyan-400/30'
                    : currentPhaseIndex > i
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2'
                }`}
              />
            ))}
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

export default SiphonRenderer;
