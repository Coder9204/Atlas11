'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// Types
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
const PHASE_ORDER: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Hook', predict: 'Predict', play: 'Play', review: 'Review', twist_predict: 'Twist Predict',
  twist_play: 'Twist Play', twist_review: 'Twist Review', transfer: 'Transfer', test: 'Test', mastery: 'Mastery'
};

interface CavitationRendererProps {
  currentPhase?: Phase;
  gamePhase?: Phase;
  onPhaseComplete?: (phase: Phase) => void;
  onGameEvent?: (event: { type: string; data?: Record<string, unknown> }) => void;
}

const CavitationRenderer: React.FC<CavitationRendererProps> = ({ currentPhase, gamePhase, onPhaseComplete, onGameEvent }) => {
  const initialPhase = currentPhase ?? gamePhase ?? 'hook';
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const { isMobile } = useViewport();
const [hookStep, setHookStep] = useState(0);
  const [showCollapse, setShowCollapse] = useState(false);
  const [bubbleSize, setBubbleSize] = useState(30);
  const collapseAnimRef = useRef<number>();

  const [prediction, setPrediction] = useState<string | null>(null);
  const [showPredictResult, setShowPredictResult] = useState(false);

  // Play phase - pressure chart
  const [pressure, setPressure] = useState(50);

  // Twist
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistResult, setShowTwistResult] = useState(false);
  const [shrimpStrike, setShrimpStrike] = useState(false);
  const [showSecondBubble, setShowSecondBubble] = useState(false);

  // Transfer
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set([0]));

  // Test
  const [testAnswers, setTestAnswers] = useState<number[]>([]);
  const [showTestResults, setShowTestResults] = useState(false);
  const [selectedTestAnswer, setSelectedTestAnswer] = useState<number | null>(null);
  const [showAnswerFeedback, setShowAnswerFeedback] = useState(false);

  const navigationLockRef = useRef(false);

  // Phase sync
  useEffect(() => {
    const targetPhase = currentPhase ?? gamePhase;
    if (targetPhase !== undefined && targetPhase !== phase) {
      setPhase(targetPhase);
    }
  }, [currentPhase, gamePhase, phase]);

  // Hook bubble collapse
  useEffect(() => {
    if (!showCollapse) return;
    const collapse = () => {
      setBubbleSize(prev => {
        if (prev <= 2) return 0;
        return prev * 0.85;
      });
      collapseAnimRef.current = requestAnimationFrame(collapse);
    };
    collapseAnimRef.current = requestAnimationFrame(collapse);
    return () => { if (collapseAnimRef.current) cancelAnimationFrame(collapseAnimRef.current); };
  }, [showCollapse]);

  const goToPhase = useCallback((newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setPhase(newPhase);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    onPhaseComplete?.(newPhase);
    setTimeout(() => { navigationLockRef.current = false; }, 50);
  }, [onPhaseComplete]);

  const goToNextPhase = useCallback(() => {
    const currentIndex = PHASE_ORDER.indexOf(phase);
    if (currentIndex < PHASE_ORDER.length - 1) {
      goToPhase(PHASE_ORDER[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const goToPrevPhase = useCallback(() => {
    const currentIndex = PHASE_ORDER.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(PHASE_ORDER[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // Mantis shrimp strike
  const triggerShrimpStrike = () => {
    setShrimpStrike(true);
    setTimeout(() => { setShowSecondBubble(true); }, 200);
    setTimeout(() => { setShrimpStrike(false); setShowSecondBubble(false); }, 1500);
  };

  // Test questions
  const testQuestions = [
    { question: "Cavitation occurs when local pressure drops below the liquid's vapor pressure. A ship propeller spins at high RPM, creating low-pressure zones on the suction side of each blade. What happens when pressure drops below vapor pressure?",
      options: [{ text: "The water freezes instantly due to pressure change", correct: false }, { text: "Vapor bubbles form in the low-pressure zone", correct: true }, { text: "The propeller speeds up automatically", correct: false }, { text: "Nothing happens at normal temperatures", correct: false }],
      explanation: "When local pressure drops below vapor pressure, liquid water transitions to vapor, forming bubbles. This phase change is the defining event of cavitation." },
    { question: "During cavitation, vapor bubbles collapse violently when they move into higher-pressure regions. The collapse creates extreme local conditions. Why is cavitation damage so severe on metal surfaces?",
      options: [{ text: "The bubbles contain corrosive chemicals", correct: false }, { text: "Collapse creates extreme local temperatures (5,000\u00b0C) and pressures (1,000 atm) that erode metal", correct: true }, { text: "Air dissolved in water oxidizes the metal", correct: false }, { text: "Bubbles expand until the metal breaks", correct: false }],
      explanation: "Bubble collapse concentrates energy into a tiny volume, generating extreme local temperatures (~5,000C) and pressures (~1,000 atm) that progressively pit and erode even hardened steel." },
    { question: "Where do cavitation bubbles typically form on a propeller blade? Consider where the pressure is lowest during operation.",
      options: [{ text: "At the center hub where rotation is slowest", correct: false }, { text: "On the low-pressure (suction) side of blades where flow velocity is highest", correct: true }, { text: "Only at the very tips of the blades", correct: false }, { text: "On the shaft bearing surfaces", correct: false }],
      explanation: "By Bernoulli's principle, the fastest-moving fluid on the suction side of the blade has the lowest pressure, making it the first region to drop below vapor pressure." },
    { question: "The mantis shrimp strikes at 23 m/s with 10,000 g acceleration. This creates a cavitation bubble between its claw and the prey. How does this biological cavitation help the shrimp?",
      options: [{ text: "It heats the water to cook the prey", correct: false }, { text: "The collapsing bubble delivers a second strike, stunning prey even if the punch misses", correct: true }, { text: "It creates a chemical reaction that dissolves shells", correct: false }, { text: "It generates an electrical discharge", correct: false }],
      explanation: "The cavitation bubble collapse delivers a second shockwave impact after the initial punch, effectively giving the shrimp a double strike that can stun or kill prey even on a near-miss." },
    { question: "Scientists have measured the temperature at the center of a collapsing cavitation bubble. What approximate temperature is reached during collapse?",
      options: [{ text: "100\u00b0C (boiling point of water)", correct: false }, { text: "500\u00b0C (typical oven temperature)", correct: false }, { text: "5,000\u00b0C or higher (comparable to the sun's surface)", correct: true }, { text: "Only ambient room temperature", correct: false }],
      explanation: "The rapid adiabatic compression of gas inside the collapsing bubble can reach temperatures of 5,000C or more, comparable to the surface of the sun." },
    { question: "Sonoluminescence is a phenomenon observed during cavitation bubble collapse. Light is emitted from the collapsing bubble due to extreme conditions. What is sonoluminescence?",
      options: [{ text: "Sound waves reflecting off bubble surfaces", correct: false }, { text: "Light emitted from collapsing cavitation bubbles due to extreme compression heating", correct: true }, { text: "Ultrasound imaging of internal organs", correct: false }, { text: "Laser light focused through water", correct: false }],
      explanation: "The extreme temperatures and pressures during collapse ionize gas inside the bubble, producing a brief flash of light. This sound-to-light conversion is called sonoluminescence." },
    { question: "A pump engineer notices cavitation damage on impeller blades. Consider the relationship between pressure, speed, and cavitation threshold. What should they do to prevent cavitation?",
      options: [{ text: "Run the pump faster to push bubbles through", correct: false }, { text: "Increase suction pressure (NPSH) or reduce pump speed to keep pressure above vapor pressure", correct: true }, { text: "Heat the liquid to increase vapor pressure", correct: false }, { text: "Add air bubbles to cushion the collapse", correct: false }],
      explanation: "Increasing Net Positive Suction Head (NPSH) or reducing speed keeps local pressures above the vapor pressure threshold, preventing bubble formation in the first place." },
    { question: "Ship propellers sometimes produce audible noise that sailors describe as 'singing' or 'crackling'. What causes this characteristic sound?",
      options: [{ text: "Vibration of the motor bearings only", correct: false }, { text: "Cavitation bubble collapse creates acoustic shock waves", correct: true }, { text: "Wind passing over the hull surface", correct: false }, { text: "Resonance of the hull plates", correct: false }],
      explanation: "Each bubble collapse produces a micro-shockwave. Millions of collapses per second create the characteristic crackling or singing noise associated with cavitating propellers." },
    { question: "Ultrasonic cleaning devices are used in jewelry stores and hospitals. They use high-frequency sound waves (20-400 kHz) to create cavitation in cleaning fluid. How does this clean surfaces?",
      options: [{ text: "The sound waves heat the water to sterilization temperature", correct: false }, { text: "Cavitation bubbles implode against surfaces, scrubbing away contaminants at the microscopic level", correct: true }, { text: "The ultrasound dissolves dirt through chemical reactions", correct: false }, { text: "Magnetic particles in the fluid attract contaminants", correct: false }],
      explanation: "Ultrasonic waves create alternating pressure zones. Bubbles form in low-pressure zones and collapse against surfaces in high-pressure zones, producing microscopic jets that blast away contaminants." },
    { question: "After years of operation, a pump impeller is removed for inspection. The damage pattern from cavitation is distinctive. What does cavitation damage typically look like on a metal surface?",
      options: [{ text: "Smooth, uniform rust coating", correct: false }, { text: "Pitted, cratered surface with material removal (resembling tiny explosions)", correct: true }, { text: "Clean, polished wear marks", correct: false }, { text: "Color change without material loss", correct: false }],
      explanation: "Each bubble collapse removes a tiny amount of material through micro-jet impact, leaving a characteristic pitted, cratered surface that looks like a landscape of tiny explosions." }
  ];

  // Transfer applications
  const applications = [
    {
      icon: "\ud83d\udea2", title: "Ship Propellers", short: "Marine cavitation",
      tagline: "The destroyer of blades",
      description: "Ship propellers operating at high speeds create low-pressure zones that trigger cavitation, eroding blade surfaces over time. Naval engineers design blade geometries to minimize pressure drops below the cavitation threshold.",
      connection: "Fast-moving blades create suction that drops pressure below water's vapor pressure, forming bubbles that collapse violently against the metal surface, causing progressive erosion.",
      howItWorks: "Engineers use CFD to model pressure distributions. By optimizing blade geometry, pitch angles, and rotation speeds, they keep local pressures above the cavitation threshold.",
      stats: [
        { label: "Bubble Collapse Pressure", value: "Up to 1,500 MPa" },
        { label: "Erosion Rate", value: "0.1-5 mm/year" },
        { label: "Efficiency Loss", value: "15-30% when cavitating" }
      ],
      examples: ["Container ship propellers with skewed blade designs", "Submarine propellers optimized for silent operation", "High-speed ferry water jet impellers", "Tugboat propellers for high-thrust operation"],
      companies: ["W\u00e4rtsil\u00e4", "MAN Energy Solutions", "Rolls-Royce Marine", "Kongsberg Maritime"],
      futureImpact: "Advanced composite materials and AI-driven design optimization are enabling propellers that self-adjust pitch in real-time, virtually eliminating cavitation.",
      color: "#3B82F6"
    },
    {
      icon: "\ud83e\udd90", title: "Mantis Shrimp", short: "Nature's weapon",
      tagline: "Punching with physics",
      description: "Mantis shrimp strike so fast they create cavitation bubbles. When prey survives the punch, the bubble collapse delivers a second blow! The strike accelerates at 10,000 g.",
      connection: "The shrimp's club accelerates at 10,000 g, fast enough to create a vacuum wake that forms a cavitation bubble between claw and prey.",
      howItWorks: "The strike creates localized low pressure. Water vaporizes, then the bubble collapses with force sufficient to crack shells \u2014 even if the initial punch misses entirely.",
      stats: [
        { label: "Strike Speed", value: "23 m/s" },
        { label: "Acceleration", value: "10,000 g" },
        { label: "Bubble Temperature", value: "4,700\u00b0C" }
      ],
      examples: ["Peacock mantis shrimp (smashers)", "Spearing mantis shrimp", "Pistol shrimp (similar mechanism)", "Snapping shrimp colonies"],
      companies: ["DARPA biomimetics", "Academic research labs", "Aquarium conservation", "Materials science institutes"],
      futureImpact: "Researchers study mantis shrimp to develop impact-resistant materials and underwater acoustic systems.",
      color: "#10B981"
    },
    {
      icon: "\ud83d\udd0a", title: "Ultrasonic Cleaning", short: "Bubble scrubbing",
      tagline: "Cleaning with cavitation",
      description: "Ultrasonic cleaners generate millions of tiny cavitation bubbles that implode against surfaces, scrubbing away contamination at the molecular level without damaging delicate parts.",
      connection: "High-frequency sound waves (20-400 kHz) create rapid pressure cycles that nucleate and collapse bubbles thousands of times per second in the cleaning fluid.",
      howItWorks: "Piezoelectric transducers vibrate at ultrasonic frequencies, creating alternating high and low pressure zones. Bubbles form in low-pressure zones and collapse in high-pressure zones.",
      stats: [
        { label: "Frequency Range", value: "20-400 kHz" },
        { label: "Bubble Size", value: "10-150 \u03bcm" },
        { label: "Cleaning Time", value: "2-15 minutes" }
      ],
      examples: ["Jewelry cleaning", "Medical instrument sterilization", "Semiconductor wafer cleaning", "Dental tool maintenance"],
      companies: ["Branson Ultrasonics", "Crest Ultrasonics", "Elma Schmidbauer", "L&R Manufacturing"],
      futureImpact: "AI-controlled frequency sweeping optimizes cavitation intensity for specific materials, enabling damage-free cleaning of nanotechnology components.",
      color: "#8B5CF6"
    },
    {
      icon: "\ud83c\udfe5", title: "Medical Lithotripsy", short: "Therapeutic cavitation",
      tagline: "Shattering stones without surgery",
      description: "Extracorporeal Shock Wave Lithotripsy (ESWL) uses focused acoustic waves to create cavitation inside kidney stones, fragmenting them into passable pieces without surgical intervention.",
      connection: "Shock waves focused on kidney stones create intense pressure gradients. Cavitation bubbles nucleate within the stone and collapse asymmetrically, generating microjets that fragment it.",
      howItWorks: "An electromagnetic source generates shock waves outside the body. Acoustic lenses focus them to converge at the stone location. Repeated cavitation events progressively break the stone.",
      stats: [
        { label: "Success Rate", value: "70-90% for stones < 2cm" },
        { label: "Shock Waves", value: "2,000-4,000 per session" },
        { label: "Treatment Duration", value: "30-60 minutes" }
      ],
      examples: ["Calcium oxalate kidney stone fragmentation", "Ureteral stone treatment", "Gallstone lithotripsy", "Salivary gland stone treatment"],
      companies: ["Dornier MedTech", "Boston Scientific", "Olympus Corporation", "Storz Medical"],
      futureImpact: "Histotripsy uses precisely controlled cavitation clouds to mechanically destroy tumors with unprecedented precision, replacing many surgical procedures.",
      color: "#EF4444"
    }
  ];

  // Handle test answer - single click advances immediately
  const handleTestAnswer = (answer: number) => {
    setTestAnswers(prev => [...prev, answer]);
  };

  const calculateScore = (): number => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index]?.options[answer]?.correct ? 1 : 0);
    }, 0);
  };

  // Pressure-cavitation curve data points
  const getCurvePoints = (pressureVal: number) => {
    const points: { x: number; y: number }[] = [];
    const vbW = 500;
    const vbH = 340;
    const padL = 60;
    const padR = 40;
    const padT = 30;
    const padB = 50;
    const plotW = vbW - padL - padR;
    const plotH = vbH - padT - padB;

    // Cavitation intensity curve: below vapor pressure = high intensity
    const vaporPressure = 2.3; // kPa
    const maxPressure = 200; // kPa
    const numPts = 20;

    for (let i = 0; i <= numPts; i++) {
      const frac = i / numPts;
      const p = frac * maxPressure;
      // Cavitation intensity: exponential rise as pressure drops below vapor pressure
      let intensity: number;
      if (p < vaporPressure) {
        intensity = 100;
      } else if (p < vaporPressure * 5) {
        intensity = 100 * Math.exp(-0.5 * (p - vaporPressure));
      } else {
        intensity = 100 * Math.exp(-0.5 * (vaporPressure * 5 - vaporPressure)) * Math.exp(-0.02 * (p - vaporPressure * 5));
      }
      intensity = Math.max(0, Math.min(100, intensity));

      const x = padL + frac * plotW;
      const y = padT + (1 - intensity / 100) * plotH;
      points.push({ x, y });
    }
    return points;
  };

  // Get current marker position based on pressure slider
  const getMarkerPosition = (pressureVal: number) => {
    const vbW = 500;
    const vbH = 340;
    const padL = 60;
    const padR = 40;
    const padT = 30;
    const padB = 50;
    const plotW = vbW - padL - padR;
    const plotH = vbH - padT - padB;

    const maxPressure = 200;
    const vaporPressure = 2.3;
    const frac = pressureVal / 100;
    const p = frac * maxPressure;

    let intensity: number;
    if (p < vaporPressure) {
      intensity = 100;
    } else if (p < vaporPressure * 5) {
      intensity = 100 * Math.exp(-0.5 * (p - vaporPressure));
    } else {
      intensity = 100 * Math.exp(-0.5 * (vaporPressure * 5 - vaporPressure)) * Math.exp(-0.02 * (p - vaporPressure * 5));
    }
    intensity = Math.max(0, Math.min(100, intensity));

    const x = padL + frac * plotW;
    const y = padT + (1 - intensity / 100) * plotH;
    return { x, y, intensity, p };
  };

  // Render functions (NOT components)
  const renderNavDots = () => {
    const currentIndex = PHASE_ORDER.indexOf(phase);
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid rgba(51, 65, 85, 0.5)', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', maxWidth: '800px', margin: '0 auto' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>Cavitation</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {PHASE_ORDER.map((p, i) => (
              <button
                key={p}
                aria-label={phaseLabels[p]}
                onClick={() => goToPhase(p)}
                onPointerDown={() => goToPhase(p)}
                style={{
                  cursor: 'pointer',
                  borderRadius: '9999px',
                  width: phase === p ? '20px' : '8px',
                  height: '8px',
                  transition: 'all 0.3s ease',
                  background: phase === p ? '#60a5fa' : currentIndex > i ? '#10b981' : '#334155',
                  border: 'none',
                  padding: 0,
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#60a5fa' }}>{phaseLabels[phase]}</span>
        </div>
      </div>
    );
  };

  const renderBottomBar = (onNext: () => void, disabled: boolean = false, label: string = "Continue") => {
    const currentIndex = PHASE_ORDER.indexOf(phase);
    const canGoBack = currentIndex > 0;

    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #334155', backgroundColor: '#0f172a', gap: '12px', marginTop: '16px', borderRadius: '0 0 12px 12px' }}>
        <button
          onClick={canGoBack ? goToPrevPhase : undefined}
          onPointerDown={canGoBack ? goToPrevPhase : undefined}
          style={{ padding: '10px 20px', borderRadius: '10px', fontWeight: 600, fontSize: '14px', backgroundColor: '#1e293b', color: 'rgba(226, 232, 240, 1)', border: '1px solid #334155', cursor: canGoBack ? 'pointer' : 'not-allowed', opacity: canGoBack ? 1 : 0.3, minHeight: '44px' }}
        >
          \u2190 Back
        </button>
        <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 500 }}>{currentIndex + 1} / {PHASE_ORDER.length}</span>
        <button
          onClick={!disabled ? onNext : undefined}
          onPointerDown={!disabled ? onNext : undefined}
          disabled={disabled}
          style={{ padding: '10px 20px', borderRadius: '10px', fontWeight: 600, fontSize: '14px', background: disabled ? '#333' : 'linear-gradient(135deg, #3b82f6, #06b6d4)', color: disabled ? '#cbd5e1' : '#f8fafc', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, minHeight: '44px' }}
        >
          {label} \u2192
        </button>
      </div>
    );
  };

  // HOOK PHASE
  const renderHook = () => (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '28px', fontWeight: 700 }}>Explosive Bubbles</h1>
        <p style={{ margin: 0, color: '#cbd5e1', fontSize: '14px' }}>When water boils... and implodes</p>
      </div>

      <div style={{ background: '#0f172a', borderRadius: '16px', padding: '24px', marginBottom: '20px', textAlign: 'center' }}>
        {hookStep === 0 && (
          <>
            <p style={{ color: '#f8fafc', fontSize: '18px', lineHeight: 1.6, marginBottom: '24px' }}>
              A bubble forms in fast-moving water. Then it <span style={{ color: '#ef4444' }}>collapses violently</span>...
              Inside that collapse: temperatures hotter than the <span style={{ color: '#f59e0b' }}>surface of the sun</span>. Let's discover how cavitation works!
            </p>

            <svg width="300" height="180" viewBox="0 0 300 180" style={{ margin: '0 auto', display: 'block' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Cavitation visualization">
              <defs>
                <linearGradient id="hookWater" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#0c4a6e" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
                <radialGradient id="hookBubble" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.3" />
                </radialGradient>
                <radialGradient id="hookFlash" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fef3c7" />
                  <stop offset="100%" stopColor="#ef4444" />
                </radialGradient>
                <filter id="hookGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <rect x="0" y="0" width="300" height="180" fill="url(#hookWater)" rx="10" />
              <g transform="translate(150, 90)">
                {bubbleSize > 0 ? (
                  <>
                    <circle r={bubbleSize} fill="url(#hookBubble)" stroke="#93c5fd" strokeWidth="1" strokeOpacity="0.5" />
                    <ellipse cx={-bubbleSize * 0.25} cy={-bubbleSize * 0.25} rx={bubbleSize * 0.25} ry={bubbleSize * 0.15} fill="#fff" opacity="0.7" />
                  </>
                ) : (
                  <>
                    <circle r="5" fill="url(#hookFlash)" filter="url(#hookGlow)">
                      <animate attributeName="r" values="5;50;0" dur="0.5s" fill="freeze" />
                    </circle>
                    {[1, 2, 3].map(i => (
                      <circle key={i} r={8 * i} fill="none" stroke={`rgba(251, 191, 36, ${0.6 / i})`} strokeWidth={3 - i * 0.5}>
                        <animate attributeName="r" values={`${8*i};${50+12*i}`} dur="0.4s" fill="freeze" />
                      </circle>
                    ))}
                  </>
                )}
              </g>
            </svg>

            {bubbleSize === 0 && (
              <p style={{ textAlign: 'center', color: '#ef4444', fontSize: '18px', fontWeight: 600, margin: '8px 0 0 0' }}>5,000\u00b0C!</p>
            )}

            <button
              onClick={() => setShowCollapse(true)}
              onPointerDown={() => setShowCollapse(true)}
              disabled={showCollapse}
              style={{ marginTop: '16px', padding: '12px 28px', fontSize: '16px', background: showCollapse ? '#444' : 'linear-gradient(135deg, #ef4444, #f97316)', color: '#f8fafc', border: 'none', borderRadius: '10px', cursor: showCollapse ? 'not-allowed' : 'pointer' }}
            >
              Collapse Bubble
            </button>
          </>
        )}

        {hookStep === 1 && (
          <>
            <p style={{ color: '#f8fafc', fontSize: '20px', lineHeight: 1.6, marginBottom: '20px' }}>
              This is <span style={{ color: '#3b82f6' }}>cavitation</span> \u2014 when low pressure makes water "boil" into vapor bubbles.
            </p>
            <p style={{ color: '#cbd5e1', fontSize: '16px', lineHeight: 1.6, marginBottom: '20px' }}>
              When those bubbles hit higher pressure, they collapse with devastating force. This is how cavitation works in the real world.
            </p>
            <div style={{ background: '#020617', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: '#ef4444', fontSize: '16px', margin: 0 }}>
                Collapsing bubbles can erode <strong>solid steel</strong>, punch through <strong>ship propellers</strong>, and even emit <strong>light</strong> (sonoluminescence)!
              </p>
            </div>
          </>
        )}
      </div>

      {hookStep === 0 ? (
        renderBottomBar(() => {
          setHookStep(1);
        }, false, "Continue")
      ) : (
        renderBottomBar(() => goToNextPhase())
      )}
    </div>
  );

  // PREDICT PHASE
  const renderPredict = () => (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '28px', fontWeight: 700 }}>Make a Prediction</h1>
        <p style={{ margin: 0, color: '#cbd5e1', fontSize: '14px' }}>Think about what will happen during cavitation</p>
      </div>

      <div style={{ background: '#0f172a', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
        <p style={{ color: '#f8fafc', fontSize: '17px', lineHeight: 1.6, marginBottom: '12px' }}>
          Imagine a vapor bubble forming in fast-moving water. The surrounding liquid pressure suddenly increases, causing the bubble to collapse in less than a microsecond.
        </p>
        <p style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
          Think about what happens when all that energy concentrates into a tiny point. What extreme condition would you expect?
        </p>

        <svg width="100%" height="120" viewBox="0 0 500 120" style={{ marginBottom: '20px' }} preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="predBubble" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.3" />
            </radialGradient>
            <radialGradient id="predFlash" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="100%" stopColor="#ef4444" />
            </radialGradient>
          </defs>
          {[0, 1, 2, 3, 4].map(i => {
            const x = 60 + i * 100;
            const size = 30 - i * 6;
            return (
              <g key={i} transform={`translate(${x}, 50)`}>
                {i < 4 ? (
                  <circle r={size} fill="url(#predBubble)" />
                ) : (
                  <>
                    <circle r={3} fill="url(#predFlash)" />
                    <circle r="15" fill="none" stroke="#fbbf24" strokeWidth="2" opacity="0.6" />
                    <circle r="25" fill="none" stroke="#f97316" strokeWidth="1.5" opacity="0.4" />
                  </>
                )}
                <text x="0" y="45" fill="#cbd5e1" fontSize="11" textAnchor="middle">t={i}</text>
              </g>
            );
          })}
          <text x="250" y="110" fill="#cbd5e1" fontSize="12" textAnchor="middle">Time progression \u2192 Bubble collapse sequence</text>
        </svg>

        <p style={{ color: '#f8fafc', fontSize: '18px', fontWeight: 600, marginBottom: '16px', textAlign: 'center' }}>
          What extreme condition is created at the collapse center?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { value: 'cold', label: 'Extreme cold \u2014 rapid expansion absorbs heat' },
            { value: 'hot', label: 'Extreme heat \u2014 compression creates 5,000\u00b0C+' },
            { value: 'vacuum', label: 'Perfect vacuum \u2014 all matter expelled' },
            { value: 'nothing', label: 'Nothing special \u2014 just water filling the void' }
          ].map(option => (
            <button
              key={option.value}
              onClick={() => setPrediction(option.value)}
              onPointerDown={() => setPrediction(option.value)}
              style={{ padding: '16px 20px', fontSize: '15px', background: prediction === option.value ? 'rgba(59, 130, 246, 0.15)' : '#020617', color: prediction === option.value ? '#3b82f6' : '#cbd5e1', border: `2px solid ${prediction === option.value ? '#3b82f6' : '#333'}`, borderRadius: '12px', cursor: 'pointer', textAlign: 'left' }}
            >
              {option.label}
            </button>
          ))}
        </div>

        {prediction && !showPredictResult && (
          <button
            onClick={() => setShowPredictResult(true)}
            onPointerDown={() => setShowPredictResult(true)}
            style={{ marginTop: '20px', padding: '14px 28px', width: '100%', background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', color: '#f8fafc', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '16px', fontWeight: 600 }}
          >
            Lock In Prediction
          </button>
        )}

        {showPredictResult && (
          <div style={{ marginTop: '20px', padding: '20px', background: prediction === 'hot' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(249, 115, 22, 0.15)', borderRadius: '12px', border: `2px solid ${prediction === 'hot' ? '#10b981' : '#f97316'}` }}>
            {prediction === 'hot' ? (
              <>
                <p style={{ color: '#10b981', fontSize: '18px', fontWeight: 600, margin: '0 0 12px 0' }}>\u2713 Exactly right!</p>
                <p style={{ color: '#f8fafc', margin: 0, lineHeight: 1.6 }}>The collapse compresses vapor so violently it reaches 5,000\u00b0C and pressures up to 1,000 atmospheres.</p>
              </>
            ) : (
              <>
                <p style={{ color: '#f97316', fontSize: '18px', fontWeight: 600, margin: '0 0 12px 0' }}>Surprising answer!</p>
                <p style={{ color: '#f8fafc', margin: 0, lineHeight: 1.6 }}>The rapid compression creates extreme heat \u2014 up to 5,000\u00b0C! This is why cavitation erodes metal.</p>
              </>
            )}
          </div>
        )}
      </div>

      {renderBottomBar(() => goToNextPhase(), !prediction)}
    </div>
  );

  // PLAY PHASE - Pressure-Cavitation Chart
  const renderPlay = () => {
    const curvePoints = getCurvePoints(pressure);
    const marker = getMarkerPosition(pressure);
    const pathD = curvePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    // Determine cavitation state
    const cavitationState = marker.p < 2.3 ? 'severe' : marker.p < 11.5 ? 'moderate' : 'none';
    const stateColor = cavitationState === 'severe' ? '#ef4444' : cavitationState === 'moderate' ? '#f59e0b' : '#10b981';
    const stateLabel = cavitationState === 'severe' ? 'Severe Cavitation!' : cavitationState === 'moderate' ? 'Moderate Cavitation' : 'No Cavitation (Safe)';

    // Reference values
    const vaporPressureLine = 60 + (2.3 / 200) * 400;

    return (
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '28px', fontWeight: 700 }}>Cavitation Pressure Lab</h1>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '14px' }}>Observe how pressure determines cavitation intensity. Try adjusting the slider and watch how the chart demonstrates the relationship.</p>
        </div>

        {/* Side-by-side layout */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '20px',
          width: '100%',
          alignItems: isMobile ? 'center' : 'flex-start',
        }}>
          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
        <div style={{ background: '#0f172a', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
          <svg width="100%" height="340" viewBox="0 0 500 340" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="curveStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="30%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Background */}
            <rect x="0" y="0" width="500" height="340" fill="#020617" rx="12" />

            {/* Grid group */}
            <g className="grid-lines">
              {[0, 25, 50, 75, 100].map(pct => {
                const y = 30 + (1 - pct / 100) * 260;
                return <line key={`gy-${pct}`} x1="60" y1={y} x2="460" y2={y} stroke="rgba(148, 163, 184, 0.15)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />;
              })}
              {[0, 25, 50, 75, 100].map(pct => {
                const x = 60 + pct / 100 * 400;
                return <line key={`gx-${pct}`} x1={x} y1="30" x2={x} y2="290" stroke="rgba(148, 163, 184, 0.15)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />;
              })}
            </g>

            {/* Axes group */}
            <g className="axes">
              <line x1="60" y1="30" x2="60" y2="290" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="1" />
              <line x1="60" y1="290" x2="460" y2="290" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="1" />
            </g>

            {/* Y-axis labels */}
            <g className="y-labels">
              <text x="48" y="35" fill="#94a3b8" fontSize="11" textAnchor="end">100%</text>
              <text x="48" y="165" fill="#94a3b8" fontSize="11" textAnchor="end">50%</text>
              <text x="48" y="293" fill="#94a3b8" fontSize="11" textAnchor="end">0%</text>
            </g>

            {/* X-axis labels */}
            <g className="x-labels">
              <text x="60" y="310" fill="#94a3b8" fontSize="11" textAnchor="middle">0</text>
              <text x="260" y="310" fill="#94a3b8" fontSize="11" textAnchor="middle">100</text>
              <text x="460" y="310" fill="#94a3b8" fontSize="11" textAnchor="middle">200</text>
            </g>

            {/* Axis titles */}
            <text x="10" y="80" fill="#94a3b8" fontSize="11" textAnchor="start" transform="rotate(-90, 10, 80)">Intensity</text>
            <text x="260" y="330" fill="#94a3b8" fontSize="11" textAnchor="middle">Pressure (kPa)</text>

            {/* Vapor pressure reference */}
            <g className="reference">
              <line x1={vaporPressureLine} y1="30" x2={vaporPressureLine} y2="290" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.7" />
              <text x={vaporPressureLine + 5} y="58" fill="#ef4444" fontSize="11" textAnchor="start">Pv=2.3kPa</text>
            </g>

            {/* Data layer */}
            <g className="data">
              <path d={`${pathD} L ${curvePoints[curvePoints.length-1].x.toFixed(1)} 290 L 60 290 Z`} fill="url(#curveFill)" />
              <path d={pathD} fill="none" stroke="url(#curveStroke)" strokeWidth="3" strokeLinecap="round" />
            </g>

            {/* Interactive marker */}
            <g className="marker">
              <circle cx={marker.x} cy={marker.y} r={8} fill={stateColor} filter="url(#glow)" stroke="#fff" strokeWidth={2}>
                <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
              </circle>
              <text x={Math.min(marker.x + 14, 420)} y={Math.max(marker.y - 18, 48)} fill={stateColor} fontSize="11" fontWeight="600">
                {marker.p.toFixed(1)}kPa {marker.intensity.toFixed(0)}%
              </text>
            </g>

            {/* Zone indicators */}
            <g className="zones">
              <rect x="62" y="5" width={Math.max(0, vaporPressureLine - 64)} height="12" fill="#ef4444" opacity="0.2" rx="3" />
              <text x={(62 + vaporPressureLine) / 2} y="14" fill="#ef4444" fontSize="11" textAnchor="middle">Danger</text>
              <rect x={vaporPressureLine + 2} y="5" width={456 - vaporPressureLine} height="12" fill="#10b981" opacity="0.2" rx="3" />
              <text x={(vaporPressureLine + 462) / 2} y="14" fill="#10b981" fontSize="11" textAnchor="middle">Safe</text>
            </g>
          </svg>

          {/* Current reading display */}
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', padding: '12px', marginTop: '8px', background: '#020617', borderRadius: '8px' }}>
            <div>
              <span style={{ color: '#cbd5e1', fontSize: '12px' }}>Current Pressure</span>
              <div style={{ color: '#f8fafc', fontSize: '18px', fontWeight: 700 }}>{marker.p.toFixed(1)} kPa</div>
            </div>
            <div>
              <span style={{ color: '#cbd5e1', fontSize: '12px' }}>Cavitation Intensity</span>
              <div style={{ color: stateColor, fontSize: '18px', fontWeight: 700 }}>{marker.intensity.toFixed(0)}%</div>
            </div>
            <div>
              <span style={{ color: '#cbd5e1', fontSize: '12px' }}>Status vs Reference</span>
              <div style={{ color: stateColor, fontSize: '14px', fontWeight: 600 }}>{stateLabel}</div>
            </div>
          </div>

          </div>
          </div>
          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          {/* Slider */}
          <div style={{ marginTop: '0px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#f8fafc', fontSize: '14px', fontWeight: 600 }}>Pressure Level</span>
              <span style={{ color: stateColor, fontSize: '14px' }}>{marker.p.toFixed(1)} kPa</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={pressure}
              onChange={(e) => setPressure(Number(e.target.value))}
              style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1' }}>
              <span>Low (vacuum)</span>
              <span style={{ color: '#f59e0b' }}>Vapor pressure threshold</span>
              <span>High (safe)</span>
            </div>
          </div>

          {/* Physics explanation */}
          <div style={{ marginTop: '20px', padding: '16px', background: '#020617', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <p style={{ color: '#60a5fa', fontSize: '14px', fontWeight: 600, margin: '0 0 8px 0' }}>Key Physics Formula:</p>
            <p style={{ color: '#cbd5e1', fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              Cavitation Number: \u03c3 = (P\u2080 \u2212 P\u1d65) \u00f7 (\u00bd \u00d7 \u03c1 \u00d7 V\u00b2)<br/>
              When \u03c3 drops below the critical value, cavitation begins. Lower pressure = more bubbles = more damage.
            </p>
          </div>

          {/* Real-world relevance */}
          <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(249, 115, 22, 0.08)', borderRadius: '12px', borderLeft: '4px solid #f97316' }}>
            <p style={{ color: '#f97316', fontSize: '14px', fontWeight: 600, margin: '0 0 8px 0' }}>Why This Matters (Real-World Impact):</p>
            <p style={{ color: '#cbd5e1', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
              Ship propellers, pumps, and turbines suffer billions of dollars in cavitation damage annually. The relationship: Higher speed = Lower pressure = More cavitation = More damage.
            </p>
          </div>
        </div>
        </div>

        {renderBottomBar(() => goToNextPhase())}
      </div>
    );
  };

  // REVIEW PHASE
  const renderReview = () => (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '28px', fontWeight: 700 }}>Cavitation Physics Review</h1>
        <p style={{ margin: 0, color: '#cbd5e1', fontSize: '14px' }}>Understanding the complete picture</p>
      </div>

      <div style={{ background: '#0f172a', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
        <p style={{ color: '#f8fafc', fontSize: '16px', lineHeight: 1.7, marginBottom: '20px' }}>
          As you observed in the experiment, cavitation intensity increases dramatically when pressure drops below the vapor pressure threshold. Your prediction about the collapse conditions demonstrates the key principle: because the bubble collapse concentrates energy into a microscopic volume, it generates extreme temperatures.
        </p>

        <div style={{ display: 'grid', gap: '16px' }}>
          {[
            { title: "1. Bubble Formation", text: "When local pressure drops below vapor pressure (~2.3 kPa for water at 20\u00b0C), water 'boils' into vapor bubbles \u2014 this shows that cavitation is proportional to the pressure deficit.", color: '#60a5fa' },
            { title: "2. Bubble Growth", text: "In the low-pressure zone, bubbles expand as more liquid vaporizes. The relationship is: Lower pressure = Larger bubbles = More stored energy.", color: '#3b82f6' },
            { title: "3. Violent Collapse", text: "When bubbles move to higher pressure regions, they collapse in microseconds. The formula for collapse pressure is P_collapse \u221d (P_ambient \u2212 P_vapor) \u00d7 compression ratio.", color: '#f59e0b' },
            { title: "4. Extreme Conditions", text: "The result: temperatures reaching ~5,000\u00b0C and pressures up to 1,000 atm. The equation E = \u00bd \u00d7 m \u00d7 v\u00b2 explains the kinetic energy of the inrushing liquid.", color: '#ef4444' }
          ].map((item, i) => (
            <div key={i} style={{ padding: '16px', background: `rgba(${item.color === '#60a5fa' ? '96,165,250' : item.color === '#3b82f6' ? '59,130,246' : item.color === '#f59e0b' ? '245,158,11' : '239,68,68'}, 0.08)`, borderRadius: '12px', borderLeft: `4px solid ${item.color}` }}>
              <p style={{ color: item.color, fontWeight: 600, margin: '0 0 8px 0', fontSize: '15px' }}>{item.title}</p>
              <p style={{ color: '#cbd5e1', margin: 0, fontSize: '14px', lineHeight: 1.5 }}>{item.text}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
          <p style={{ color: '#f59e0b', fontWeight: 600, margin: '0 0 8px 0', fontSize: '15px' }}>Sonoluminescence: Light from Sound</p>
          <p style={{ color: '#cbd5e1', margin: 0, fontSize: '14px', lineHeight: 1.6 }}>
            Some collapsing bubbles emit brief flashes of light! The extreme compression heats gases to plasma temperatures, causing them to glow. This phenomenon demonstrates the equation E = k \u00d7 T\u2074 for thermal radiation.
          </p>
        </div>

        <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(6,182,212,0.08))', borderLeft: '4px solid #3b82f6', borderRadius: '0 12px 12px 0', marginTop: '20px' }}>
          <p style={{ margin: 0, color: '#f8fafc', lineHeight: 1.6, fontSize: '15px' }}>
            Key insight: Cavitation converts kinetic energy of flow into extreme local conditions \u2014 temperatures rivaling the sun's surface, concentrated into points smaller than a pinhead. The observation confirms your prediction about collapse energy.
          </p>
        </div>
      </div>

      {renderBottomBar(() => goToNextPhase())}
    </div>
  );

  // TWIST PREDICT
  const renderTwistPredict = () => (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '28px', fontWeight: 700 }}>Nature's Weapon</h1>
        <p style={{ margin: 0, color: '#cbd5e1', fontSize: '14px' }}>The mantis shrimp's secret</p>
      </div>

      <div style={{ background: '#0f172a', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
        <p style={{ color: '#f8fafc', fontSize: '17px', lineHeight: 1.6, marginBottom: '24px' }}>
          The mantis shrimp punches at 23 m/s with 10,000 g acceleration. This creates a cavitation bubble. Watch what happens next \u2014 a new twist on cavitation physics.
        </p>

        <svg width="100%" height="200" viewBox="0 0 500 200" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="twpShrimpBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="100%" stopColor="#be123c" />
            </linearGradient>
            <radialGradient id="twpSnail" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#d6d3d1" />
              <stop offset="100%" stopColor="#57534e" />
            </radialGradient>
            <linearGradient id="twpStrike" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="500" height="200" fill="#0c4a6e" opacity="0.4" rx="12" />

          {/* Shrimp */}
          <g transform="translate(100, 90)">
            <ellipse cx="0" cy="0" rx="35" ry="18" fill="url(#twpShrimpBody)" stroke="#be123c" strokeWidth="1" />
            <ellipse cx="-12" cy="-6" rx="12" ry="6" fill="#fda4af" opacity="0.5" />
            <circle cx="-25" cy="-12" r="5" fill="#4ade80" />
            <path d="M 25 0 L 80 -30 L 75 0 L 80 30 L 25 0 Z" fill="#fb7185" stroke="#e11d48" strokeWidth="1" />
          </g>

          {/* Strike beam */}
          <line x1="160" y1="90" x2="290" y2="90" stroke="url(#twpStrike)" strokeWidth="6" />

          {/* Speed lines */}
          {[0, 1, 2].map(i => (
            <React.Fragment key={i}>
              <line x1={170 + i * 30} y1={78 - i * 4} x2={185 + i * 30} y2={78 - i * 4} stroke="#fbbf24" strokeWidth="2" opacity={0.5 - i * 0.1} />
              <line x1={170 + i * 30} y1={102 + i * 4} x2={185 + i * 30} y2={102 + i * 4} stroke="#fbbf24" strokeWidth="2" opacity={0.5 - i * 0.1} />
            </React.Fragment>
          ))}

          {/* Prey */}
          <g transform="translate(350, 90)">
            <ellipse cx="0" cy="0" rx="40" ry="35" fill="url(#twpSnail)" stroke="#57534e" strokeWidth="2" />
            <path d="M 0 -30 Q 20 -15 10 0 Q 5 20 -5 10 Q -15 0 -8 -30" fill="none" stroke="#44403c" strokeWidth="2" opacity="0.5" />
          </g>

          {/* Question */}
          <text x="250" y="170" fill="#06b6d4" fontSize="24" textAnchor="middle" fontWeight="bold">?</text>

          {/* Labels */}
          <text x="100" y="30" fill="#cbd5e1" fontSize="12" textAnchor="middle">Mantis Shrimp</text>
          <text x="250" y="55" fill="#fbbf24" fontSize="12" textAnchor="middle">23 m/s Strike Speed</text>
          <text x="350" y="30" fill="#cbd5e1" fontSize="12" textAnchor="middle">Prey (Snail)</text>
        </svg>

        <p style={{ color: '#f8fafc', fontSize: '18px', fontWeight: 600, marginTop: '16px', marginBottom: '16px', textAlign: 'center' }}>
          If the initial punch misses, what does the cavitation bubble collapse do?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { value: 'nothing', label: 'Nothing \u2014 bubbles are harmless in biological systems' },
            { value: 'second', label: 'Delivers a SECOND strike \u2014 the collapse hits the prey!' },
            { value: 'defense', label: 'Creates a defensive bubble shield around the shrimp' },
            { value: 'distraction', label: 'Just makes noise to distract and disorient prey' }
          ].map(option => (
            <button
              key={option.value}
              onClick={() => setTwistPrediction(option.value)}
              onPointerDown={() => setTwistPrediction(option.value)}
              style={{ padding: '14px 18px', fontSize: '14px', background: twistPrediction === option.value ? 'rgba(59, 130, 246, 0.15)' : '#020617', color: twistPrediction === option.value ? '#3b82f6' : '#cbd5e1', border: `2px solid ${twistPrediction === option.value ? '#3b82f6' : '#333'}`, borderRadius: '10px', cursor: 'pointer', textAlign: 'left' }}
            >
              {option.label}
            </button>
          ))}
        </div>

        {twistPrediction && !showTwistResult && (
          <button
            onClick={() => setShowTwistResult(true)}
            onPointerDown={() => setShowTwistResult(true)}
            style={{ marginTop: '20px', padding: '14px 28px', width: '100%', background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', color: '#f8fafc', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '16px', fontWeight: 600 }}
          >
            Lock In Prediction
          </button>
        )}

        {showTwistResult && (
          <div style={{ marginTop: '20px', padding: '20px', background: twistPrediction === 'second' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(249, 115, 22, 0.15)', borderRadius: '12px', border: `2px solid ${twistPrediction === 'second' ? '#10b981' : '#f97316'}` }}>
            <p style={{ color: twistPrediction === 'second' ? '#10b981' : '#f97316', margin: 0, lineHeight: 1.6 }}>
              <strong>{twistPrediction === 'second' ? '\u2713 Exactly!' : 'Incredible answer!'}</strong> The mantis shrimp evolved to weaponize cavitation! Even if the punch misses, the collapsing bubble delivers a second impact \u2014 a "phantom punch" that can stun or kill prey!
            </p>
          </div>
        )}
      </div>

      {renderBottomBar(() => goToNextPhase(), !showTwistResult)}
    </div>
  );

  // TWIST PLAY
  const renderTwistPlay = () => (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '28px', fontWeight: 700 }}>Mantis Shrimp Strike</h1>
        <p style={{ margin: 0, color: '#cbd5e1', fontSize: '14px' }}>Watch the double impact</p>
      </div>

      {/* Side-by-side layout */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : '20px',
        width: '100%',
        alignItems: isMobile ? 'center' : 'flex-start',
      }}>
        <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
      <div style={{ background: '#0f172a', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
        <svg width="100%" height="220" viewBox="0 0 500 220" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="tpWater" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0c4a6e" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <linearGradient id="tpShrimpBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="100%" stopColor="#be123c" />
            </linearGradient>
            <radialGradient id="tpSnail" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#d6d3d1" />
              <stop offset="100%" stopColor="#57534e" />
            </radialGradient>
            <radialGradient id="tpFlash" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="tpCollapse" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#ef4444" />
            </radialGradient>
            <filter id="tpGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <rect x="0" y="0" width="500" height="220" fill="url(#tpWater)" rx="12" />

          {/* Grid lines for reference */}
          {[55, 110, 165].map(y => (
            <line key={`tpg-${y}`} x1="20" y1={y} x2="480" y2={y} stroke="rgba(148,163,184,0.1)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
          ))}

          {/* Labels */}
          <text x="120" y="25" fill="#cbd5e1" fontSize="12" textAnchor="middle">Mantis Shrimp</text>
          <text x="370" y="25" fill="#cbd5e1" fontSize="12" textAnchor="middle">Prey Target</text>
          <text x="250" y="210" fill="#cbd5e1" fontSize="12" textAnchor="middle">Cavitation Zone</text>

          {/* Shrimp */}
          <g transform={`translate(${shrimpStrike ? 170 : 100}, 110)`}>
            <ellipse cx="-30" cy="0" rx="40" ry="20" fill="url(#tpShrimpBody)" stroke="#be123c" strokeWidth="1" />
            <circle cx="-50" cy="-15" r="6" fill="#4ade80" />
            <g transform={shrimpStrike ? 'translate(60, 0)' : ''}>
              <path d="M 0 -10 L 60 -30 L 70 0 L 60 30 L 0 10 Z" fill="#fb7185" stroke="#e11d48" strokeWidth="1" />
            </g>
          </g>

          {/* Prey */}
          <g transform="translate(370, 110)">
            <ellipse cx="0" cy="0" rx="40" ry="35" fill="url(#tpSnail)" stroke="#57534e" strokeWidth="2" />
            <path d="M 0 -30 Q 20 -15 10 0 Q 5 25 -5 10 Q -15 0 -8 -30" fill="none" stroke="#44403c" strokeWidth="2" opacity="0.5" />
            {showSecondBubble && (
              <g>
                <path d="M 15 -30 L 25 -10 L 20 10 L 30 30" stroke="#ef4444" strokeWidth="2" fill="none" />
              </g>
            )}
          </g>

          {/* Impact flash */}
          {shrimpStrike && !showSecondBubble && (
            <g transform="translate(280, 110)">
              <circle r="20" fill="url(#tpFlash)" filter="url(#tpGlow)">
                <animate attributeName="r" values="5;25" dur="0.15s" fill="freeze" />
              </circle>
            </g>
          )}

          {/* Cavitation collapse */}
          {showSecondBubble && (
            <g transform="translate(310, 110)">
              <circle r="12" fill="url(#tpCollapse)" filter="url(#tpGlow)">
                <animate attributeName="r" values="25;12" dur="0.3s" fill="freeze" />
              </circle>
              {[1, 2, 3].map(i => (
                <circle key={i} r={12 * i} fill="none" stroke={i === 1 ? '#fbbf24' : '#ef4444'} strokeWidth={3 - i * 0.7} opacity={0.6 / i}>
                  <animate attributeName="r" values={`${5*i};${35+10*i}`} dur="0.35s" fill="freeze" />
                </circle>
              ))}
            </g>
          )}

          {/* Speed indicator */}
          {shrimpStrike && (
            <g transform="translate(200, 55)">
              <rect x="0" y="0" width="100" height="24" rx="12" fill="#1e293b" opacity="0.8" />
              <text x="50" y="16" fill="#fbbf24" fontSize="12" textAnchor="middle" fontWeight="600">23 m/s</text>
            </g>
          )}
        </svg>
      </div>
        </div>
        <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>

        <button
          onClick={triggerShrimpStrike}
          onPointerDown={triggerShrimpStrike}
          disabled={shrimpStrike}
          style={{ width: '100%', marginTop: '12px', padding: '14px', background: shrimpStrike ? '#444' : 'linear-gradient(135deg, #f97316, #ef4444)', color: '#f8fafc', border: 'none', borderRadius: '10px', cursor: shrimpStrike ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: 600 }}
        >
          Trigger Strike!
        </button>

        <div style={{ marginTop: '20px', padding: '16px', background: '#020617', borderRadius: '12px' }}>
          <p style={{ color: '#10b981', fontWeight: 600, margin: '0 0 8px 0' }}>Double Impact Weapon:</p>
          <ol style={{ margin: 0, paddingLeft: '20px', color: '#cbd5e1', fontSize: '14px', lineHeight: 1.8 }}>
            <li><strong>Strike 1:</strong> Physical punch at 23 m/s</li>
            <li><strong>Cavitation:</strong> Low-pressure wake forms vapor bubble</li>
            <li><strong>Strike 2:</strong> Bubble collapse delivers second impact!</li>
          </ol>
        </div>
      </div>
      </div>

      {renderBottomBar(() => goToNextPhase())}
    </div>
  );

  // TWIST REVIEW
  const renderTwistReview = () => (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '28px', fontWeight: 700 }}>Biomimetic Inspiration</h1>
        <p style={{ margin: 0, color: '#cbd5e1', fontSize: '14px' }}>Learning from nature</p>
      </div>

      <div style={{ background: '#0f172a', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
        {[
          { title: "The Mantis Shrimp's Advantages", text: "Fastest punch in the animal kingdom (23 m/s). Even if it misses, the cavitation bubble stuns prey. Its club is made of a unique material that resists its own impact force!", color: '#f97316' },
          { title: "Research Applications", text: "Scientists study mantis shrimp to develop: impact-resistant body armor, underwater acoustic weapons, and materials that withstand extreme repeated stress.", color: '#3b82f6' },
          { title: "Pistol Shrimp: The Sound Maker", text: "The pistol shrimp creates cavitation with its claw snap \u2014 producing a 210 decibel shockwave! Colonies are so loud they interfere with submarine sonar.", color: '#10b981' }
        ].map((item, i) => (
          <div key={i} style={{ padding: '20px', background: '#020617', borderRadius: '12px', marginBottom: i < 2 ? '16px' : 0 }}>
            <p style={{ color: item.color, fontWeight: 600, margin: '0 0 8px 0' }}>{item.title}</p>
            <p style={{ color: '#cbd5e1', fontSize: '14px', margin: 0, lineHeight: 1.6 }}>{item.text}</p>
          </div>
        ))}
      </div>

      {renderBottomBar(() => goToNextPhase())}
    </div>
  );

  // TRANSFER PHASE
  const renderTransfer = () => {
    const app = applications[activeApp];
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '28px', fontWeight: 700 }}>Real-World Applications</h1>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '14px' }}>Industry examples of cavitation physics</p>
        </div>

        <div style={{ background: '#0f172a', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
          <p style={{ color: '#cbd5e1', fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>
            Application {activeApp + 1} of {applications.length} \u2014 Explore how companies and engineers use cavitation
          </p>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '8px' }}>
            {applications.map((a, i) => (
              <button
                key={i}
                onClick={() => { if (completedApps.has(i)) setActiveApp(i); }}
                onPointerDown={() => { if (completedApps.has(i)) setActiveApp(i); }}
                style={{ padding: '10px 16px', background: activeApp === i ? a.color : completedApps.has(i) ? '#020617' : '#1a1a1a', color: activeApp === i ? '#fff' : completedApps.has(i) ? a.color : '#444', border: `2px solid ${completedApps.has(i) ? a.color : '#333'}`, borderRadius: '10px', cursor: completedApps.has(i) ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap', fontSize: '14px', fontWeight: activeApp === i ? 600 : 400, opacity: completedApps.has(i) ? 1 : 0.5 }}
              >
                {a.icon} {a.short}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '36px' }}>{app.icon}</span>
            <div>
              <h3 style={{ margin: 0, color: app.color, fontSize: '22px' }}>{app.title}</h3>
              <p style={{ margin: 0, color: '#cbd5e1', fontSize: '14px' }}>{app.tagline}</p>
            </div>
          </div>

          <p style={{ color: '#f8fafc', fontSize: '15px', lineHeight: 1.6, marginBottom: '16px' }}>{app.description}</p>

          <div style={{ padding: '16px', background: `rgba(${app.color === '#3B82F6' ? '59,130,246' : app.color === '#10B981' ? '16,185,129' : app.color === '#8B5CF6' ? '139,92,246' : '239,68,68'}, 0.1)`, borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ color: app.color, fontWeight: 600, margin: '0 0 8px 0', fontSize: '14px' }}>Physics Connection:</p>
            <p style={{ color: '#cbd5e1', margin: 0, fontSize: '14px', lineHeight: 1.5 }}>{app.connection}</p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <p style={{ color: '#f8fafc', fontWeight: 600, margin: '0 0 8px 0', fontSize: '14px' }}>How It Works:</p>
            <p style={{ color: '#cbd5e1', margin: 0, fontSize: '14px', lineHeight: 1.6 }}>{app.howItWorks}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ padding: '12px', background: '#020617', borderRadius: '10px' }}>
              <p style={{ color: app.color, fontWeight: 600, margin: '0 0 6px 0', fontSize: '13px' }}>Key Stats:</p>
              <ul style={{ margin: 0, paddingLeft: '16px', color: '#cbd5e1', fontSize: '12px' }}>
                {app.stats.map((stat, i) => <li key={i}>{stat.label}: {stat.value}</li>)}
              </ul>
            </div>
            <div style={{ padding: '12px', background: '#020617', borderRadius: '10px' }}>
              <p style={{ color: app.color, fontWeight: 600, margin: '0 0 6px 0', fontSize: '13px' }}>Examples:</p>
              <ul style={{ margin: 0, paddingLeft: '16px', color: '#cbd5e1', fontSize: '12px' }}>
                {app.examples.slice(0, 3).map((ex, i) => <li key={i}>{ex}</li>)}
              </ul>
            </div>
          </div>

          <div style={{ padding: '14px', background: '#020617', borderRadius: '10px', borderLeft: `4px solid ${app.color}` }}>
            <p style={{ color: '#f8fafc', fontWeight: 600, margin: '0 0 4px 0', fontSize: '13px' }}>Future Impact:</p>
            <p style={{ color: '#cbd5e1', margin: 0, fontSize: '13px', lineHeight: 1.5 }}>{app.futureImpact}</p>
          </div>

          <button
            onClick={() => {
              if (activeApp < applications.length - 1) {
                const next = activeApp + 1;
                setCompletedApps(prev => new Set([...prev, next]));
                setActiveApp(next);
              } else {
                setCompletedApps(prev => new Set([...prev, activeApp]));
              }
            }}
            onPointerDown={() => {
              if (activeApp < applications.length - 1) {
                const next = activeApp + 1;
                setCompletedApps(prev => new Set([...prev, next]));
                setActiveApp(next);
              } else {
                setCompletedApps(prev => new Set([...prev, activeApp]));
              }
            }}
            style={{ marginTop: '20px', padding: '12px 24px', width: '100%', background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: 600 }}
          >
            {activeApp < applications.length - 1 ? `Got It! Next: ${applications[activeApp + 1].title}` : 'Got It!'}
          </button>

          {completedApps.size >= applications.length && (
            <button
              onClick={() => goToNextPhase()}
              onPointerDown={() => goToNextPhase()}
              style={{ marginTop: '12px', padding: '14px 24px', width: '100%', background: 'linear-gradient(135deg, #3b82f6, #f97316)', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', fontWeight: 700 }}
            >
              Take the Test \u2192
            </button>
          )}
        </div>

        {renderBottomBar(() => goToNextPhase(), completedApps.size < applications.length)}
      </div>
    );
  };

  // TEST PHASE
  const renderTest = () => {
    const currentQuestion = testAnswers.length;
    const isComplete = currentQuestion >= testQuestions.length;

    return (
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '28px', fontWeight: 700 }}>Knowledge Check</h1>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '14px' }}>Question {Math.min(currentQuestion + 1, testQuestions.length)} of {testQuestions.length}</p>
        </div>

        <div style={{ background: '#0f172a', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
          {!isComplete ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ color: '#3b82f6', fontSize: '18px', fontWeight: 700 }}>Question {currentQuestion + 1} of {testQuestions.length}</span>
              </div>

              <p style={{ color: '#f8fafc', fontSize: '16px', lineHeight: 1.6, marginBottom: '24px' }}>
                {testQuestions[currentQuestion].question}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {testQuestions[currentQuestion].options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => handleTestAnswer(i)}
                    onPointerDown={() => handleTestAnswer(i)}
                    style={{
                      padding: '14px 18px',
                      fontSize: '14px',
                      background: '#020617',
                      color: '#f8fafc',
                      border: '2px solid #333',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      minHeight: '44px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {option.text}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
                {testQuestions.map((_, i) => (
                  <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: i < currentQuestion ? (testQuestions[i].options[testAnswers[i]]?.correct ? '#10b981' : '#ef4444') : i === currentQuestion ? '#3b82f6' : '#333' }} />
                ))}
              </div>
            </>
          ) : (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '48px', fontWeight: 700, color: calculateScore() >= 7 ? '#10b981' : calculateScore() >= 5 ? '#f59e0b' : '#ef4444' }}>
                  {calculateScore()}/{testQuestions.length}
                </div>
                <p style={{ color: '#e2e8f0', margin: 0 }}>
                  {calculateScore() >= 8 ? "Cavitation Expert!" : calculateScore() >= 6 ? "Great understanding!" : "Keep studying bubble physics!"}
                </p>
              </div>

              <div style={{ padding: '16px' }}>
                <h3 style={{ color: '#f8fafc', fontSize: '18px', marginBottom: '16px' }}>Answer Key:</h3>
                {testQuestions.map((q, idx) => {
                  const userAnswer = testAnswers[idx];
                  const correctOption = q.options.find(o => o.correct);
                  const isCorrect = q.options[userAnswer]?.correct;
                  return (
                    <div key={idx} style={{ background: 'rgba(30, 41, 59, 0.9)', margin: '12px 0', padding: '16px', borderRadius: '10px', borderLeft: `4px solid ${isCorrect ? '#10b981' : '#ef4444'}` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ color: isCorrect ? '#10b981' : '#ef4444', fontSize: '18px', flexShrink: 0 }}>{isCorrect ? '\u2713' : '\u2717'}</span>
                        <span style={{ color: '#f8fafc', fontSize: '14px', fontWeight: 600 }}>Q{idx + 1}. {q.question}</span>
                      </div>
                      {!isCorrect && (<div style={{ marginLeft: '26px', marginBottom: '6px' }}><span style={{ color: '#ef4444', fontSize: '13px' }}>Your answer: </span><span style={{ color: '#64748b', fontSize: '13px' }}>{q.options[userAnswer]?.text}</span></div>)}
                      <div style={{ marginLeft: '26px', marginBottom: '8px' }}><span style={{ color: '#10b981', fontSize: '13px' }}>Correct answer: </span><span style={{ color: '#94a3b8', fontSize: '13px' }}>{correctOption?.text}</span></div>
                      <div style={{ marginLeft: '26px', background: 'rgba(245, 158, 11, 0.1)', padding: '8px 12px', borderRadius: '8px' }}><span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 600 }}>Why? </span><span style={{ color: '#94a3b8', fontSize: '12px', lineHeight: '1.5' }}>{q.explanation}</span></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {isComplete && renderBottomBar(() => { onGameEvent?.({ type: 'game_completed', data: { score: calculateScore(), total: testQuestions.length } }); goToNextPhase(); }, false, "Complete Journey")}
      </div>
    );
  };

  // MASTERY PHASE
  const renderMastery = () => {
    const score = calculateScore();
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(96,165,250,0.15), rgba(239,68,68,0.15))', borderRadius: '20px', padding: '32px', textAlign: 'center', marginBottom: '20px', border: '2px solid rgba(59,130,246,0.3)' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>💥🎓</div>
          <h1 style={{ color: '#f8fafc', margin: '0 0 8px 0', fontSize: '28px', fontWeight: 700 }}>Cavitation Master!</h1>
          <p style={{ color: '#cbd5e1', margin: '0 0 24px 0', fontSize: '16px' }}>You understand the explosive physics of collapsing bubbles</p>

          <div style={{ display: 'inline-block', padding: '16px 32px', background: '#0f172a', borderRadius: '12px', marginBottom: '24px' }}>
            <div style={{ color: '#ef4444', fontSize: '36px', fontWeight: 700 }}>{score}/{testQuestions.length}</div>
            <div style={{ color: '#cbd5e1', fontSize: '14px' }}>Final Score</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', textAlign: 'left' }}>
            {[
              { title: "Vapor Pressure", text: "Low pressure creates bubbles" },
              { title: "Violent Collapse", text: "5,000\u00b0C, 1,000 atm" },
              { title: "Nature's Weapon", text: "Mantis shrimp uses it!" }
            ].map((item, i) => (
              <div key={i} style={{ padding: '16px', background: '#0f172a', borderRadius: '12px' }}>
                <p style={{ color: '#f8fafc', fontWeight: 600, margin: '0 0 4px 0', fontSize: '14px' }}>{item.title}</p>
                <p style={{ color: '#cbd5e1', margin: 0, fontSize: '12px' }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(6,182,212,0.08))', borderLeft: '4px solid #3b82f6', borderRadius: '0 12px 12px 0' }}>
          <p style={{ margin: 0, color: '#f8fafc', lineHeight: 1.6, fontSize: '15px' }}>
            From ship propellers to medical treatments, cavitation demonstrates how extreme physics can emerge from something as simple as a bubble!
          </p>
        </div>
      </div>
    );
  };

  // Main phase render
  const renderPhase = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return (
          <TransferPhaseView
          conceptName="Cavitation"
          applications={applications}
          onComplete={() => goToPhase('test')}
          isMobile={isMobile}
          />
        );
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#f8fafc' }}>
      {renderNavDots()}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {renderPhase()}
        </div>
      </div>
    </div>
  );
};

export default CavitationRenderer;
