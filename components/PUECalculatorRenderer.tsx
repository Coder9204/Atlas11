'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// -----------------------------------------------------------------------------
// PUE Calculator - Complete 10-Phase Learning Game
// Understanding Power Usage Effectiveness in Data Centers
// -----------------------------------------------------------------------------

// Game event interface for AI coach integration
interface GameEvent {
  type: 'phase_change' | 'prediction' | 'interaction' | 'completion';
  phase?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

interface PUECalculatorRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound utility for feedback
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
      click: { freq: 600, duration: 0.1, type: 'sine' },
      success: { freq: 800, duration: 0.2, type: 'sine' },
      failure: { freq: 300, duration: 0.3, type: 'sine' },
      transition: { freq: 500, duration: 0.15, type: 'sine' },
      complete: { freq: 900, duration: 0.4, type: 'sine' }
    };
    const sound = sounds[type];
    oscillator.frequency.value = sound.freq;
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch { /* Audio not available */ }
};

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// -----------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: "A data center manager notices their facility uses 2000 kW total while IT equipment draws 1000 kW. They need to report efficiency to leadership.",
    question: "What is this data center's PUE?",
    options: [
      { id: 'a', label: "0.5 - meaning the facility is very efficient" },
      { id: 'b', label: "2.0 - meaning for every 1W of IT power, there's 1W of overhead", correct: true },
      { id: 'c', label: "1000 - the overhead power in kW" },
      { id: 'd', label: "3000 - total power plus IT power" }
    ],
    explanation: "PUE = Total Facility Power / IT Equipment Power = 2000 kW / 1000 kW = 2.0. This means for every watt powering IT, another watt goes to cooling, lighting, and other overhead. A PUE of 2.0 is considered average."
  },
  {
    scenario: "Google reports their data centers achieve an average PUE of 1.10. A competitor has a PUE of 1.50. Both facilities have 100 MW of IT load.",
    question: "How much more total power does the competitor use annually?",
    options: [
      { id: 'a', label: "40 MW more continuously - that's $35M+ per year at $0.10/kWh", correct: true },
      { id: 'b', label: "0.4 MW more - a negligible difference" },
      { id: 'c', label: "They use the same power - PUE doesn't affect total consumption" },
      { id: 'd', label: "Google uses more power because lower PUE means more efficiency hardware" }
    ],
    explanation: "Google: 100 MW × 1.10 = 110 MW total. Competitor: 100 MW × 1.50 = 150 MW total. Difference: 40 MW. Annual cost: 40,000 kW × 8760 hours × $0.10 = $35 million. This shows why hyperscalers obsess over PUE."
  },
  {
    scenario: "A facility in Phoenix, Arizona (average temp 35°C) and one in Iceland (average temp 5°C) both want to achieve PUE under 1.2.",
    question: "Why does the Iceland facility have a significant advantage?",
    options: [
      { id: 'a', label: "Iceland has cheaper electricity" },
      { id: 'b', label: "Cold outside air enables 'free cooling' without running energy-intensive chillers", correct: true },
      { id: 'c', label: "Phoenix has stricter environmental regulations" },
      { id: 'd', label: "Iceland facilities can use smaller servers" }
    ],
    explanation: "Free cooling uses cold outside air (typically below 18°C) instead of mechanical chillers. Since cooling is often 30-50% of overhead power, eliminating or reducing chiller operation dramatically improves PUE. Nordic data centers regularly achieve PUE below 1.1."
  },
  {
    scenario: "An engineer is comparing UPS systems: one with 92% efficiency and another with 97% efficiency for a 10 MW IT load.",
    question: "What's the annual power savings from choosing the more efficient UPS?",
    options: [
      { id: 'a', label: "About $44,000 per year" },
      { id: 'b', label: "About $438,000 per year", correct: true },
      { id: 'c', label: "About $4.4 million per year" },
      { id: 'd', label: "Efficiency doesn't matter for UPS systems" }
    ],
    explanation: "92% UPS wastes 8% = 800 kW. 97% UPS wastes 3% = 300 kW. Savings: 500 kW × 8760 hours × $0.10/kWh = $438,000/year. UPS efficiency directly impacts PUE and operating costs."
  },
  {
    scenario: "A data center's cooling system currently maintains servers at 20°C inlet temperature. ASHRAE guidelines allow up to 27°C.",
    question: "What happens if they raise the setpoint to 25°C?",
    options: [
      { id: 'a', label: "Nothing changes - cooling power is constant" },
      { id: 'b', label: "PUE improves because less cooling is needed for the higher temperature differential", correct: true },
      { id: 'c', label: "PUE gets worse because servers work harder" },
      { id: 'd', label: "Servers will fail immediately" }
    ],
    explanation: "Higher inlet temperatures reduce the temperature differential between outside air and supply air, enabling more free cooling hours and reducing chiller load. Google famously runs at 27°C to maximize efficiency. Modern servers are designed to handle these temperatures."
  },
  {
    scenario: "A legacy enterprise data center has PUE of 2.5. They want to improve it. Current layout has mixed hot and cold air throughout.",
    question: "What's the most impactful first step?",
    options: [
      { id: 'a', label: "Replace all servers with newer models" },
      { id: 'b', label: "Install hot/cold aisle containment to prevent air mixing", correct: true },
      { id: 'c', label: "Move to a colder climate" },
      { id: 'd', label: "Turn off the air conditioning" }
    ],
    explanation: "Hot/cold aisle containment is often the best ROI improvement. When hot exhaust air mixes with cold supply air, the cooling system works harder to achieve target temperatures. Containment can improve PUE by 0.2-0.5 with relatively low investment."
  },
  {
    scenario: "Facebook's Lulea, Sweden data center reports using outside air for cooling 95% of the year. The facility is near the Arctic Circle.",
    question: "What PUE range would you expect this facility to achieve?",
    options: [
      { id: 'a', label: "PUE around 1.05-1.10 due to minimal mechanical cooling needs", correct: true },
      { id: 'b', label: "PUE around 1.50 - climate doesn't help much" },
      { id: 'c', label: "PUE around 2.00 - heating is needed instead of cooling" },
      { id: 'd', label: "PUE below 1.0 - they generate excess power" }
    ],
    explanation: "Free cooling for 95% of hours eliminates most mechanical cooling overhead. These Nordic facilities achieve some of the lowest PUEs in the industry (1.06-1.10). The only overhead is fans, power distribution, and brief periods of supplemental cooling."
  },
  {
    scenario: "A company is planning a new 50 MW data center. Improving PUE from 1.5 to 1.3 would cost $10 million in better cooling infrastructure.",
    question: "What's the payback period for this investment?",
    options: [
      { id: 'a', label: "About 1-2 years", correct: true },
      { id: 'b', label: "About 10-15 years" },
      { id: 'c', label: "Never - efficiency investments don't pay back" },
      { id: 'd', label: "About 50 years" }
    ],
    explanation: "At PUE 1.5: 50 MW × 1.5 = 75 MW total. At PUE 1.3: 50 MW × 1.3 = 65 MW total. Savings: 10 MW × 8760 hours × $0.10 = $8.76 million/year. Payback: $10M / $8.76M = ~14 months. Efficiency investments often have excellent ROI."
  },
  {
    scenario: "A colocation provider advertises 'N+1 redundancy' on all cooling systems, meaning they have one extra unit than needed.",
    question: "How does redundancy affect PUE?",
    options: [
      { id: 'a', label: "Improves PUE - more efficient with backup" },
      { id: 'b', label: "Worsens PUE - redundant equipment uses power even when idle", correct: true },
      { id: 'c', label: "No effect - redundant units are completely off" },
      { id: 'd', label: "Depends entirely on outside temperature" }
    ],
    explanation: "Redundant systems typically run at partial load for reliability, consuming power even when not needed for primary cooling. This is a tradeoff between reliability (uptime SLAs) and efficiency. Some facilities use 'catcher' units that only activate on failure."
  },
  {
    scenario: "AI training workloads generate 3x more heat per rack than traditional servers. A data center designed for traditional servers wants to add AI clusters.",
    question: "What's the biggest challenge for maintaining their current PUE?",
    options: [
      { id: 'a', label: "AI workloads need faster internet" },
      { id: 'b', label: "Cooling systems designed for lower density can't handle concentrated heat loads", correct: true },
      { id: 'c', label: "AI servers use different power plugs" },
      { id: 'd', label: "Software incompatibility with existing systems" }
    ],
    explanation: "Traditional air cooling struggles above 20-30 kW per rack. AI training racks can exceed 100 kW. Without upgrading to liquid cooling or rear-door heat exchangers, the facility must run cooling harder (worse PUE) or limit density. This is driving the shift to liquid cooling."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '☁️',
    title: 'Hyperscale Cloud Providers',
    short: 'Efficiency at massive scale',
    tagline: 'Every 0.01 PUE improvement saves millions',
    description: 'Google, Microsoft, Meta, and Amazon operate data centers consuming over 100 megawatts each. At this scale, a PUE improvement of just 0.1 saves tens of millions of dollars annually and reduces carbon footprint significantly.',
    connection: 'The PUE formula you learned (Total Power / IT Power) directly determines how much of their electricity bill actually powers computation versus overhead.',
    howItWorks: 'Custom facility designs optimize every component: AI-controlled cooling, custom servers designed for specific temperature ranges, waste heat recovery, and strategic location selection for free cooling.',
    stats: [
      { value: '1.10', label: 'Google average PUE', icon: '📊' },
      { value: '$10B+', label: 'Annual power costs', icon: '💰' },
      { value: '100MW+', label: 'Single facility size', icon: '⚡' }
    ],
    examples: ['Google data centers', 'Microsoft Azure facilities', 'Meta AI training centers', 'Amazon AWS regions'],
    companies: ['Google', 'Microsoft', 'Meta', 'Amazon'],
    futureImpact: 'AI workloads are driving PUE optimization with direct liquid cooling and immersion cooling technologies.',
    color: '#3B82F6'
  },
  {
    icon: '❄️',
    title: 'Nordic Free Cooling Pioneers',
    short: 'Using nature as air conditioning',
    tagline: 'Cold climates enable record-low PUE',
    description: 'Data centers in Sweden, Finland, Norway, and Iceland leverage year-round cold temperatures to achieve near-theoretical-minimum PUE. These facilities use outside air directly, eliminating energy-intensive mechanical cooling.',
    connection: 'Free cooling dramatically reduces the cooling overhead component in PUE. When outside air is cold enough, the only cooling energy needed is for fans to move air.',
    howItWorks: 'Outside air is filtered, humidified if needed, and directed through server racks. Waste heat is often captured for district heating, turning overhead into a revenue stream.',
    stats: [
      { value: '1.07', label: 'Best achieved PUE', icon: '🏆' },
      { value: '95%', label: 'Free cooling hours', icon: '❄️' },
      { value: '40%', label: 'Power cost savings', icon: '⚡' }
    ],
    examples: ['Facebook Lulea, Sweden', 'Google Hamina, Finland', 'Verne Global Iceland', 'Microsoft underwater datacenter'],
    companies: ['Facebook', 'Google', 'Apple', 'Microsoft'],
    futureImpact: 'Subsea, underground, and Arctic data centers may push PUE even closer to 1.0.',
    color: '#06B6D4'
  },
  {
    icon: '🏢',
    title: 'Enterprise Data Center Upgrades',
    short: 'Legacy facility transformation',
    tagline: 'Old infrastructure, new efficiency',
    description: 'Corporate data centers built 10-20 years ago typically have PUE of 1.8-2.5. Retrofitting with modern cooling, containment, and power distribution can achieve dramatic improvements without building new facilities.',
    connection: 'Understanding where power goes (cooling, UPS losses, lighting) guides investment decisions. The PUE breakdown reveals which upgrades will have the biggest impact.',
    howItWorks: 'Hot/cold aisle containment, variable speed fans, efficient UPS systems, raised floor optimization, and blanking panels prevent energy waste from air mixing and over-provisioning.',
    stats: [
      { value: '1.8', label: 'Typical legacy PUE', icon: '📊' },
      { value: '25%', label: 'Achievable savings', icon: '💰' },
      { value: '2 yrs', label: 'Typical payback', icon: '⏱️' }
    ],
    examples: ['Bank data centers', 'Hospital computing facilities', 'University HPC clusters', 'Government data centers'],
    companies: ['Schneider Electric', 'Vertiv', 'Eaton', 'Emerson'],
    futureImpact: 'Edge computing will bring efficient modular designs closer to end users.',
    color: '#8B5CF6'
  },
  {
    icon: '💧',
    title: 'Liquid Cooling Revolution',
    short: 'Beyond air cooling limits',
    tagline: 'Water removes heat 3500x better than air',
    description: 'AI training clusters and high-performance computing exceed what air cooling can handle efficiently. Liquid cooling directly contacts heat sources, enabling higher density and lower PUE in heat-intensive workloads.',
    connection: 'Traditional PUE assumes air cooling overhead. Liquid cooling fundamentally changes the equation by removing heat more efficiently and enabling waste heat capture.',
    howItWorks: 'Cold plates attached to CPUs and GPUs circulate water or specialized coolant. Rear-door heat exchangers capture exhaust heat. Immersion cooling submerges entire servers in non-conductive fluid.',
    stats: [
      { value: '3500x', label: 'Better than air', icon: '💧' },
      { value: '50%', label: 'Cooling energy reduction', icon: '⚡' },
      { value: '100kW+', label: 'Per rack enabled', icon: '🔥' }
    ],
    examples: ['NVIDIA DGX SuperPOD', 'Microsoft Project Natick', 'Cerebras CS-2 systems', 'Intel Gaudi clusters'],
    companies: ['NVIDIA', 'Asetek', 'CoolIT', 'LiquidCool Solutions'],
    futureImpact: 'AI scaling will make liquid cooling standard, potentially with PUE approaching 1.02-1.05.',
    color: '#10B981'
  }
];

// Phase type and order
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Explore Twist',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const PUECalculatorRenderer: React.FC<PUECalculatorRendererProps> = ({ onGameEvent, gamePhase }) => {
  // Get initial phase from prop or default to 'hook'
  const getInitialPhase = (): Phase => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  // Core state
  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const { isMobile } = useViewport();
// Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Prediction state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Play phase state - PUE simulation
  const [itLoad, setItLoad] = useState(1000); // kW
  const [coolingEfficiency, setCoolingEfficiency] = useState(50); // percent (higher = less cooling overhead)
  const [upsEfficiency, setUpsEfficiency] = useState(92); // percent
  const [lightingPower, setLightingPower] = useState(20); // kW

  // Twist phase state - free cooling
  const [outdoorTemp, setOutdoorTemp] = useState(25); // Celsius
  const [useFreeCooling, setUseFreeCooling] = useState(false);

  // Transfer phase state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Test phase state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Animation state
  const [animationFrame, setAnimationFrame] = useState(0);

  // Sync phase with gamePhase prop changes
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Mobile detection
// Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(f => (f + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Responsive typography
  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
  };

  // Premium color palette
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#10B981', // Emerald for energy/efficiency theme
    accentGlow: 'rgba(16, 185, 129, 0.3)',
    secondary: '#06B6D4', // Cyan for cooling
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
  };

  // Emit game event helper
  const emitGameEvent = useCallback((type: GameEvent['type'], data?: Record<string, unknown>) => {
    if (onGameEvent) {
      onGameEvent({ type, phase, data, timestamp: Date.now() });
    }
  }, [onGameEvent, phase]);

  // Navigation functions with debouncing
  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;
    lastClickRef.current = now;
    isNavigating.current = true;

    playSound('transition');
    setPhase(p);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    emitGameEvent('phase_change', { from: phase, to: p });

    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [emitGameEvent, phase]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // Calculate PUE metrics
  const calcPUEMetrics = useCallback(() => {
    const itPower = itLoad;

    // Cooling power calculation — outdoor temp always affects efficiency
    let coolingMultiplier = (100 - coolingEfficiency) / 100 + 0.3;
    if (useFreeCooling && outdoorTemp < 18) {
      coolingMultiplier *= 0.3; // Free cooling reduces mechanical cooling by 70%
    } else if (useFreeCooling && outdoorTemp < 25) {
      coolingMultiplier *= 0.6; // Partial free cooling
    } else {
      // Without free cooling, outdoor temp still influences cooling load slightly
      // (higher outdoor temp = harder for chillers to reject heat = more power)
      coolingMultiplier *= (1 + (outdoorTemp - 20) * 0.005);
    }
    const coolingPower = itPower * coolingMultiplier;

    // UPS losses
    const upsLossPower = itPower * ((100 - upsEfficiency) / 100);

    // Misc power
    const miscPower = lightingPower;

    // Total facility power
    const totalPower = itPower + coolingPower + upsLossPower + miscPower;

    // PUE calculation
    const pue = totalPower / itPower;

    // Annual energy and cost
    const annualKWh = totalPower * 24 * 365;
    const annualCost = annualKWh * 0.10;
    const wastedEnergy = (totalPower - itPower) * 24 * 365;
    const wastedCost = wastedEnergy * 0.10;

    return {
      itPower,
      coolingPower,
      upsLossPower,
      miscPower,
      totalPower,
      pue,
      annualKWh,
      annualCost,
      wastedEnergy,
      wastedCost,
      efficiencyRating: pue < 1.2 ? 'Excellent' : pue < 1.5 ? 'Good' : pue < 2.0 ? 'Average' : 'Poor'
    };
  }, [itLoad, coolingEfficiency, upsEfficiency, lightingPower, outdoorTemp, useFreeCooling]);

  const metrics = calcPUEMetrics();

  // Get PUE color based on value
  const getPUEColor = (pue: number) => {
    if (pue < 1.2) return '#22c55e';
    if (pue < 1.5) return '#84cc16';
    if (pue < 2.0) return '#eab308';
    return '#ef4444';
  };

  // Handle test answer
  const handleTestAnswer = (questionIndex: number, answerId: string) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = answerId;
    setTestAnswers(newAnswers);
    playSound('click');
  };

  // Submit test
  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      const correctOption = q.options.find(opt => opt.correct);
      if (testAnswers[i] === correctOption?.id) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    emitGameEvent('game_completed', { score: score, total: testQuestions.length });
    playSound(score >= 7 ? 'success' : 'failure');
    emitGameEvent('completion', { score, total: 10 });
  };

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #059669)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
    WebkitTapHighlightColor: 'transparent',
  };

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 100,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.secondary})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px 0',
    }}>
      {phaseOrder.map((p) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: phase === p ? colors.accent : 'rgba(148,163,184,0.7)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            WebkitTapHighlightColor: 'transparent',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Bottom navigation bar
  const renderBottomBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === phaseOrder.length - 1;
    const isTestActive = phase === 'test' && !testSubmitted;
    return (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '12px 20px', background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex', justifyContent: 'space-between', gap: '12px',
        zIndex: 200,
      }}>
        <button
          onClick={() => !isFirst && goToPhase(phaseOrder[currentIndex - 1])}
          disabled={isFirst}
          style={{
            padding: '10px 20px', borderRadius: '8px', minHeight: '44px',
            border: `1px solid ${isFirst ? colors.border : colors.textMuted}`,
            background: 'transparent',
            color: isFirst ? colors.textMuted : colors.textPrimary,
            cursor: isFirst ? 'not-allowed' : 'pointer',
            fontWeight: 600, fontSize: '14px', opacity: isFirst ? 0.4 : 1,
          }}
        >← Back</button>
        {!isLast && (
          <button
            onClick={() => !isTestActive && nextPhase()}
            disabled={isTestActive}
            style={{
              ...primaryButtonStyle,
              padding: '10px 24px', fontSize: '14px', minHeight: '44px', flex: 1, maxWidth: '240px',
              opacity: isTestActive ? 0.4 : 1,
              cursor: isTestActive ? 'not-allowed' : 'pointer',
            }}
          >Next →</button>
        )}
      </div>
    );
  };

  // PUE Visualization SVG
  const PUEVisualization = () => {
    const width = isMobile ? 340 : 500;
    const height = isMobile ? 320 : 360;
    const barHeight = 200;
    const itHeight = Math.max(8, (metrics.itPower / metrics.totalPower) * barHeight * 0.8);
    const coolingHeight = Math.max(8, (metrics.coolingPower / metrics.totalPower) * barHeight * 0.8);
    const upsHeight = Math.max(4, (metrics.upsLossPower / metrics.totalPower) * barHeight * 0.8);
    const miscHeight = Math.max(4, (metrics.miscPower / metrics.totalPower) * barHeight * 0.8);

    // Outdoor temp influence on cooling bar color (always visible)
    const coolingBarColor = outdoorTemp < 18 ? '#06b6d4' : outdoorTemp < 25 ? '#3b82f6' : '#6366f1';

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="P U E Calculator visualization">
        <defs>
          <linearGradient id="pueItGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#4ade80" />
          </linearGradient>
          <linearGradient id="pueCoolingGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={coolingBarColor} />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
          <linearGradient id="pueUpsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <filter id="pueGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="pueDropShadow" x="-5%" y="-5%" width="110%" height="110%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Background energy flow path */}
        <path
          d={`M 20,${height/2} Q ${width/4},${height/3} ${width/2},${height/2} Q ${width*3/4},${height*2/3} ${width-20},${height/2}`}
          fill="none" stroke="#1e293b" strokeWidth="2" strokeDasharray="6,4"
        />
        {/* Power efficiency arc path */}
        <path
          d={`M ${width - 120},${50 + 100} A 60,60 0 0,1 ${width - 20},${50 + 100}`}
          fill="none" stroke="#374151" strokeWidth="1" opacity="0.5"
        />

        {/* Grid lines for reference — x1=20 to x2=width-20 spans full width */}
        {[0, 50, 100, 150, 200].map(y => (
          <line key={y} x1="20" y1={50 + y} x2={width - 20} y2={50 + y} stroke="#2a2a3a" strokeWidth="1" strokeDasharray="4,4" />
        ))}
        {/* Right-side tick marks for scale reference — ensures content spans >= 30% width */}
        {[0, 50, 100, 150, 200].map(y => (
          <rect key={`tick-${y}`} x={width - 25} y={48 + y} width="5" height="4" fill="#2a2a3a" rx="1" />
        ))}

        {/* Title */}
        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Data Center Power Flow
        </text>

        {/* Power flow diagram */}
        <g transform="translate(20, 45)">
          {/* Utility input */}
          <rect x="0" y="30" width="80" height="50" fill="#1f2937" stroke="#374151" strokeWidth="2" rx="5" filter="url(#pueDropShadow)" />
          <text x="40" y="52" textAnchor="middle" fontSize="11" fill="#e5e7eb" fontWeight="bold">Utility</text>
          <text x="40" y="70" textAnchor="middle" fontSize="12" fill="#fbbf24">{metrics.totalPower.toFixed(0)} kW</text>
          {/* Flow arrow */}
          <line x1="80" y1="55" x2="100" y2="55" stroke="#374151" strokeWidth="2" />
          <polygon points="100,50 110,55 100,60" fill="#374151" />
        </g>

        {/* Power breakdown stacked bars */}
        <g transform={`translate(${width/2 - 80}, 50)`}>
          <text x="80" y="0" textAnchor="middle" fontSize="11" fill={colors.textSecondary}>Power Breakdown</text>

          {/* Stacked bar segments */}
          <rect x="55" y="15" width="50" height={itHeight} fill="url(#pueItGrad)" filter="url(#pueDropShadow)" />
          <rect x="55" y={15 + itHeight} width="50" height={coolingHeight} fill="url(#pueCoolingGrad)" filter="url(#pueDropShadow)" />
          <rect x="55" y={15 + itHeight + coolingHeight} width="50" height={upsHeight} fill="url(#pueUpsGrad)" />
          <rect x="55" y={15 + itHeight + coolingHeight + upsHeight} width="50" height={miscHeight} fill="#6b7280" />

          {/* Labels positioned to avoid overlap — offset alternating right/left */}
          <line x1="105" y1={15 + itHeight/2} x2="120" y2={15 + itHeight/2} stroke="#4ade80" strokeWidth="1" />
          <text x="122" y={15 + itHeight/2 + 4} fontSize="11" fill="#4ade80">IT</text>
          <line x1="105" y1={15 + itHeight + coolingHeight/2} x2="120" y2={15 + itHeight + coolingHeight/2} stroke="#60a5fa" strokeWidth="1" />
          <text x="122" y={15 + itHeight + coolingHeight/2 + 4} fontSize="11" fill="#60a5fa">Cool</text>
          <line x1="55" y1={15 + itHeight + coolingHeight + upsHeight/2} x2="40" y2={15 + itHeight + coolingHeight + upsHeight/2} stroke="#f97316" strokeWidth="1" />
          <text x="0" y={15 + itHeight + coolingHeight + upsHeight/2 + 4} fontSize="11" fill="#f97316">UPS</text>
        </g>

        {/* PUE Gauge */}
        <g transform={`translate(${width - 100}, 50)`}>
          <circle cx="40" cy="50" r="40" fill="#1f2937" stroke="#374151" strokeWidth="2" />
          <circle cx="40" cy="50" r="30" fill="none" stroke="#374151" strokeWidth="6" />
          <circle
            cx="40" cy="50" r="30"
            fill="none"
            stroke={getPUEColor(metrics.pue)}
            strokeWidth="6"
            strokeDasharray={`${Math.max(0, (1 - (metrics.pue - 1) / 2)) * 188} 188`}
            transform="rotate(-90, 40, 50)"
          />
          <text x="40" y="25" textAnchor="middle" fontSize="18" fill="white" fontWeight="bold">{metrics.pue.toFixed(2)}</text>
          <text x="40" y="90" textAnchor="middle" fontSize="11" fill={colors.textSecondary}>PUE</text>
          <text x="40" y="107" textAnchor="middle" fontSize="11" fill={getPUEColor(metrics.pue)} fontWeight="bold">{metrics.efficiencyRating}</text>
        </g>

        {/* Outdoor temp indicator — always shown, changes based on temp value */}
        <g transform={`translate(20, ${height - 90})`}>
          <rect x="0" y="0" width={Math.max(20, Math.min(120, (outdoorTemp + 10) * 2.4))} height="12" rx="3"
            fill={outdoorTemp < 18 ? '#06b6d4' : outdoorTemp < 25 ? '#3b82f6' : '#ef4444'} opacity="0.8" />
          <text x="0" y="39" fontSize="11" fill={colors.textSecondary}>Outdoor: {outdoorTemp}°C</text>
        </g>

        {/* Formula */}
        <rect x="20" y={height - 65} width={width - 40} height="30" fill="#1f2937" rx="5" />
        <text x={width/2} y={height - 44} textAnchor="middle" fontSize="12" fill="#e5e7eb" fontWeight="bold">
          PUE = {metrics.totalPower.toFixed(0)} / {metrics.itPower.toFixed(0)} = {metrics.pue.toFixed(2)}
        </text>

        {/* Annual cost */}
        <text x={width/2} y={height - 15} textAnchor="middle" fontSize="11" fill="#fbbf24">
          Annual Cost: ${(metrics.annualCost / 1000000).toFixed(2)}M | Waste: ${(metrics.wastedCost / 1000000).toFixed(2)}M
        </text>

        {/* Free cooling indicator */}
        {useFreeCooling && (
          <g transform={`translate(20, ${height - 45})`}>
            <rect x="0" y="0" width="120" height="20" fill={outdoorTemp < 25 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(107, 114, 128, 0.2)'} rx="5" />
            <text x="60" y="14" textAnchor="middle" fontSize="11" fill={outdoorTemp < 25 ? '#22c55e' : '#9ca3af'}>
              Free Cooling: {outdoorTemp < 18 ? 'FULL' : outdoorTemp < 25 ? 'PARTIAL' : 'OFF'}
            </text>
          </g>
        )}
        {/* Interactive efficiency indicator point */}
        <circle
          cx={20 + ((itLoad - 100) / 4900) * (width - 40)}
          cy={height / 2 - 20}
          r="10"
          fill={getPUEColor(metrics.pue)}
          filter="url(#pueGlow)"
          opacity="0.9"
        />
      </svg>
    );
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)` }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingLeft: '24px', paddingRight: '24px', textAlign: 'center' }}>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>
        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          ⚡🏢📊
        </div>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          PUE: Power Usage Effectiveness
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textPrimary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          A data center's servers need <span style={{ color: colors.accent }}>1 megawatt</span> of power. But the electric bill shows <span style={{ color: colors.warning }}>1.5 megawatts</span>. Where does the extra 500kW go?
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typo.small, color: colors.textPrimary, fontStyle: 'italic' }}>
            "PUE is the single most important metric in data center operations. Google's obsession with driving it from 1.2 to 1.1 saves them hundreds of millions of dollars annually."
          </p>
          <p style={{ ...typo.small, color: colors.textPrimary, marginTop: '8px' }}>
            — Data Center Efficiency Principles
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: '16px',
          marginBottom: '32px',
          maxWidth: '600px',
          width: '100%',
        }}>
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🖥️</div>
            <div style={{ color: colors.accent, fontWeight: 'bold' }}>IT Load</div>
            <div style={{ color: colors.textPrimary, fontSize: '12px' }}>The useful work</div>
          </div>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>❄️</div>
            <div style={{ color: colors.secondary, fontWeight: 'bold' }}>Cooling</div>
            <div style={{ color: colors.textPrimary, fontSize: '12px' }}>30-50% overhead</div>
          </div>
          <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔌</div>
            <div style={{ color: colors.warning, fontWeight: 'bold' }}>Power Loss</div>
            <div style={{ color: colors.textPrimary, fontSize: '12px' }}>UPS, distribution</div>
          </div>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore PUE
        </button>

        {renderNavDots()}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'PUE of 0.67 - the facility is very efficient' },
      { id: 'b', text: 'PUE of 1.5 - for every 1W of IT, there\'s 0.5W of overhead', correct: true },
      { id: 'c', text: 'PUE of 500 - representing the 500kW of waste' },
      { id: 'd', text: 'PUE of 2500 - the sum of all power' },
    ];

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
            A data center has IT equipment using 1000 kW. The total facility power is 1500 kW. What is the PUE?
          </h2>

          {/* Static SVG showing PUE formula */}
          <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
            <svg width="100%" height="150" viewBox="0 0 500 150" style={{ display: 'block' }} preserveAspectRatio="xMidYMid meet">
              <defs>
                <filter id="pueGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <linearGradient id="pueBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={colors.accent} stopOpacity="0.8" />
                  <stop offset="67%" stopColor={colors.secondary} stopOpacity="0.7" />
                  <stop offset="100%" stopColor={colors.warning} stopOpacity="0.6" />
                </linearGradient>
              </defs>
              {/* Anchor marks */}
              <rect x="10" y="8" width="4" height="4" fill={colors.border} opacity="0.5" />
              <rect x="486" y="8" width="4" height="4" fill={colors.border} opacity="0.5" />
              {/* Total power bar */}
              <g id="total-bar">
                <rect x="30" y="35" width="440" height="40" rx="6" fill="url(#pueBarGrad)" opacity="0.8" />
                <text x="250" y="60" fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontWeight="700">Total: 1500 kW</text>
                <circle cx="30" cy="55" r="8" fill={colors.accent} opacity="0.5" filter="url(#pueGlow)" />
                <circle cx="470" cy="55" r="8" fill={colors.warning} opacity="0.5" filter="url(#pueGlow)" />
              </g>
              {/* IT power segment */}
              <g id="it-bar">
                <rect x="30" y="85" width="293" height="30" rx="4" fill={colors.accent} opacity="0.7" />
                <text x="176" y="104" fill={colors.textPrimary} fontSize="12" textAnchor="middle" fontWeight="600">IT: 1000 kW</text>
              </g>
              {/* Overhead segment */}
              <g id="overhead-bar">
                <rect x="323" y="85" width="147" height="30" rx="4" fill={colors.error} opacity="0.6" />
                <text x="396" y="104" fill={colors.textPrimary} fontSize="11" textAnchor="middle" fontWeight="600">Overhead: 500 kW</text>
              </g>
              {/* PUE label */}
              <g id="pue-label">
                <text x="250" y="135" fill={colors.warning} fontSize="13" textAnchor="middle" fontWeight="700">PUE = 1500 / 1000 = ???</text>
                <path d="M 30 130 L 470 130" stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" fill="none" opacity="0.4" />
              </g>
            </svg>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setPrediction(opt.id); }}
                style={{
                  background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  minHeight: '44px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                  color: prediction === opt.id ? 'white' : colors.textPrimary,
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

          {prediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Test My Prediction
            </button>
          )}
        </div>
        {renderNavDots()}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            PUE Calculator Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
            The visualization displays how data center power is distributed across IT load, cooling, UPS losses, and misc overhead.
            Adjust parameters to see their effect on PUE and energy costs.
          </p>
          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            PUE is the industry-standard measure of data center energy efficiency — it matters because cooling and overhead can double your electricity bill.
            Engineers design for PUE below 1.5; world-class facilities achieve 1.1. This ratio is calculated as Total Facility Power / IT Equipment Power.
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            marginBottom: '24px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <PUEVisualization />
                </div>

                {/* Key stats */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                }}>
                  <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ ...typo.h3, color: getPUEColor(metrics.pue) }}>{metrics.pue.toFixed(2)}</div>
                    <div style={{ ...typo.small, color: colors.textPrimary }}>PUE</div>
                  </div>
                  <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ ...typo.h3, color: colors.warning }}>{((metrics.pue - 1) * 100).toFixed(0)}%</div>
                    <div style={{ ...typo.small, color: colors.textPrimary }}>Overhead</div>
                  </div>
                  <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ ...typo.h3, color: colors.error }}>${(metrics.wastedCost / 1000000).toFixed(2)}M</div>
                    <div style={{ ...typo.small, color: colors.textPrimary }}>Wasted/Year</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* IT Load slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ ...typo.small, color: colors.textPrimary }}>IT Load</label>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{itLoad} kW</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="5000"
                  step="100"
                  value={itLoad}
                  onChange={(e) => setItLoad(parseInt(e.target.value))}
                  style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
                />
              </div>

              {/* Cooling efficiency slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ ...typo.small, color: colors.textPrimary }}>Cooling Efficiency</label>
                  <span style={{ ...typo.small, color: colors.secondary, fontWeight: 600 }}>{coolingEfficiency}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="90"
                  value={coolingEfficiency}
                  onChange={(e) => setCoolingEfficiency(parseInt(e.target.value))}
                  style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
                />
              </div>

              {/* UPS efficiency slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ ...typo.small, color: colors.textPrimary }}>UPS Efficiency</label>
                  <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{upsEfficiency}%</span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="99"
                  value={upsEfficiency}
                  onChange={(e) => setUpsEfficiency(parseInt(e.target.value))}
                  style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
                />
              </div>

              {/* Lighting/misc slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ ...typo.small, color: colors.textPrimary }}>Lighting & Misc</label>
                  <span style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>{lightingPower} kW</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={lightingPower}
                  onChange={(e) => setLightingPower(parseInt(e.target.value))}
                  style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
                />
              </div>
            </div>
          </div>

          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Experiments to Try:</h4>
            <ul style={{ color: colors.textPrimary, paddingLeft: '20px', margin: 0, ...typo.small }}>
              <li>Maximize cooling efficiency - watch PUE approach 1.2</li>
              <li>Lower UPS efficiency to 85% - see the power loss impact</li>
              <li>Scale IT load to 5000 kW - see annual costs explode</li>
            </ul>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
          </button>
        </div>
        {renderNavDots()}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'b';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, ...typo.h3 }}>
              {wasCorrect ? 'Correct!' : 'Not quite!'}
            </h3>
            <p style={{ ...typo.body, color: colors.textPrimary }}>
              As you observed in the experiment, PUE = Total Facility Power / IT Equipment Power = 1500 kW / 1000 kW = <strong>1.5</strong>
            </p>
            <p style={{ ...typo.small, color: colors.textPrimary, marginTop: '8px' }}>
              This means for every 1 watt powering IT equipment, there's 0.5 watts of overhead (cooling, power distribution, lighting, etc.).
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '16px', ...typo.h3 }}>The PUE Formula</h3>
            <div style={{
              background: colors.bgSecondary,
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center',
              marginBottom: '16px',
            }}>
              <div style={{ fontSize: '24px', color: colors.textPrimary, fontWeight: 'bold' }}>
                PUE = Total Facility Power / IT Equipment Power
              </div>
            </div>
            <ul style={{ color: colors.textPrimary, lineHeight: 2, paddingLeft: '20px', ...typo.body }}>
              <li><strong style={{ color: colors.accent }}>PUE = 1.0</strong> - Perfect efficiency (theoretical minimum)</li>
              <li><strong style={{ color: colors.success }}>PUE = 1.1-1.2</strong> - Excellent (hyperscale data centers)</li>
              <li><strong style={{ color: '#84cc16' }}>PUE = 1.2-1.5</strong> - Good (modern facilities)</li>
              <li><strong style={{ color: colors.warning }}>PUE = 1.5-2.0</strong> - Average (typical enterprise)</li>
              <li><strong style={{ color: colors.error }}>PUE {'>'}  2.0</strong> - Poor (legacy facilities)</li>
            </ul>
          </div>

          <div style={{
            background: `${colors.secondary}11`,
            border: `1px solid ${colors.secondary}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ color: colors.secondary, marginBottom: '12px', ...typo.h3 }}>
              Where Does Overhead Power Go?
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '12px' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '12px', borderRadius: '8px' }}>
                <strong>Cooling (30-50%)</strong>
                <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>HVAC, chillers, fans</p>
              </div>
              <div style={{ background: 'rgba(249, 115, 22, 0.2)', padding: '12px', borderRadius: '8px' }}>
                <strong>Power Distribution (5-15%)</strong>
                <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>UPS, transformers</p>
              </div>
              <div style={{ background: 'rgba(107, 114, 128, 0.2)', padding: '12px', borderRadius: '8px' }}>
                <strong>Lighting (1-3%)</strong>
                <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>Facility illumination</p>
              </div>
              <div style={{ background: 'rgba(168, 85, 247, 0.2)', padding: '12px', borderRadius: '8px' }}>
                <strong>Other (2-5%)</strong>
                <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>Security, fire suppression</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Discover the Free Cooling Twist
          </button>
        </div>
        {renderNavDots()}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'PUE can drop dramatically (from 1.5 to 1.1) since cooling is the biggest overhead', correct: true },
      { id: 'b', text: 'PUE slightly improves (maybe 0.1 better)' },
      { id: 'c', text: 'No change - servers still need the same amount of cooling' },
      { id: 'd', text: 'PUE gets worse - outdoor air contains humidity problems' },
    ];

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>
          <div style={{
            background: `${colors.secondary}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.secondary}44`,
          }}>
            <p style={{ ...typo.small, color: colors.secondary, margin: 0 }}>
              New Variable: Free Cooling
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
            A data center in a cold climate (average 10°C outdoors) decides to use "free cooling" - using cold outside air instead of running energy-intensive chillers.
          </h2>

          <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
            <svg width="100%" height="150" viewBox="0 0 500 150" style={{ display: 'block' }} preserveAspectRatio="xMidYMid meet">
              <defs>
                <filter id="freeCoolGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <linearGradient id="tempGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={colors.secondary} stopOpacity="0.8" />
                  <stop offset="100%" stopColor={colors.accent} stopOpacity="0.8" />
                </linearGradient>
              </defs>
              {/* Anchor marks */}
              <rect x="10" y="8" width="4" height="4" fill={colors.border} opacity="0.5" />
              <rect x="486" y="8" width="4" height="4" fill={colors.border} opacity="0.5" />
              {/* Cold climate block */}
              <g id="climate-block">
                <rect x="30" y="35" width="120" height="80" rx="10" fill={colors.bgSecondary} stroke={colors.secondary} strokeWidth="2" />
                <text x="90" y="65" fill={colors.textPrimary} fontSize="13" textAnchor="middle" fontWeight="700">Cold Climate</text>
                <text x="90" y="85" fill={colors.secondary} fontSize="18" textAnchor="middle" fontWeight="800">10°C</text>
                <circle cx="90" cy="105" r="6" fill={colors.secondary} opacity="0.5" filter="url(#freeCoolGlow)" />
              </g>
              {/* Arrow */}
              <g id="arrow1">
                <path d="M 155 75 L 195 75" stroke={colors.accent} strokeWidth="2" fill="none" strokeDasharray="4 4" />
                <path d="M 190 70 L 200 75 L 190 80" fill={colors.accent} />
              </g>
              {/* Free cooling block */}
              <g id="freecool-block">
                <rect x="200" y="35" width="120" height="80" rx="10" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="2" />
                <text x="260" y="65" fill={colors.textPrimary} fontSize="12" textAnchor="middle" fontWeight="700">Free Cooling</text>
                <text x="260" y="85" fill={colors.accent} fontSize="14" textAnchor="middle" fontWeight="800">No Chillers!</text>
                <path d="M 220 100 Q 260 90 300 100" stroke={colors.accent} strokeWidth="2" fill="none" strokeDasharray="3 3" />
              </g>
              {/* Arrow */}
              <g id="arrow2">
                <path d="M 325 75 L 365 75" stroke={colors.warning} strokeWidth="2" fill="none" strokeDasharray="4 4" />
                <path d="M 360 70 L 370 75 L 360 80" fill={colors.warning} />
              </g>
              {/* PUE impact block */}
              <g id="pue-impact-block">
                <rect x="370" y="35" width="110" height="80" rx="10" fill={colors.bgSecondary} stroke={colors.warning} strokeWidth="2" strokeDasharray="4 4" />
                <text x="425" y="65" fill={colors.textPrimary} fontSize="12" textAnchor="middle" fontWeight="700">PUE Impact</text>
                <text x="425" y="90" fill={colors.warning} fontSize="20" textAnchor="middle" fontWeight="800">???</text>
              </g>
              {/* Grid line */}
              <line x1="30" y1="128" x2="480" y2="128" stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
            </svg>
          </div>

          <p style={{ ...typo.body, color: colors.secondary, textAlign: 'center', marginBottom: '24px' }}>
            What happens to their PUE?
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                style={{
                  background: twistPrediction === opt.id ? `${colors.secondary}22` : colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? colors.secondary : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: twistPrediction === opt.id ? colors.secondary : colors.bgSecondary,
                  color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

          {twistPrediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Explore Free Cooling
            </button>
          )}
        </div>
        {renderNavDots()}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Free Cooling Demonstration
          </h2>
          <p style={{ ...typo.body, color: colors.textPrimary, textAlign: 'center', marginBottom: '24px' }}>
            Toggle free cooling and adjust outdoor temperature to see the impact
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            marginBottom: '24px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <PUEVisualization />
                </div>

                {/* Status display */}
                <div style={{
                  background: useFreeCooling && outdoorTemp < 25 ? 'rgba(34, 197, 94, 0.1)' : colors.bgSecondary,
                  border: `1px solid ${useFreeCooling && outdoorTemp < 25 ? colors.accent : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', textAlign: 'center' }}>
                    <div>
                      <div style={{ ...typo.h2, color: getPUEColor(metrics.pue) }}>{metrics.pue.toFixed(2)}</div>
                      <div style={{ ...typo.small, color: colors.textPrimary }}>Current PUE</div>
                    </div>
                    <div>
                      <div style={{ ...typo.h2, color: colors.accent }}>${(metrics.annualCost / 1000000).toFixed(2)}M</div>
                      <div style={{ ...typo.small, color: colors.textPrimary }}>Annual Cost</div>
                    </div>
                  </div>
                  <p style={{ ...typo.small, color: colors.textPrimary, textAlign: 'center', marginTop: '12px' }}>
                    {useFreeCooling && outdoorTemp < 18
                      ? "Full free cooling active! Mechanical cooling nearly eliminated."
                      : useFreeCooling && outdoorTemp < 25
                      ? "Partial free cooling active. Hybrid operation reducing chiller load."
                      : "Standard mechanical cooling in use."}
                  </p>
                </div>
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Free cooling toggle */}
              <button
                onClick={() => { setUseFreeCooling(!useFreeCooling); playSound('click'); }}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '12px',
                  border: `2px solid ${useFreeCooling ? colors.accent : colors.border}`,
                  background: useFreeCooling ? `${colors.accent}22` : colors.bgSecondary,
                  color: useFreeCooling ? colors.accent : colors.textSecondary,
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '16px',
                  marginBottom: '20px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {useFreeCooling ? '✓ Free Cooling ENABLED' : 'Free Cooling DISABLED'}
              </button>

              {/* Outdoor temperature slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ ...typo.small, color: colors.textPrimary }}>Outdoor Temperature</label>
                  <span style={{ ...typo.small, color: colors.secondary, fontWeight: 600 }}>{outdoorTemp}°C</span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="40"
                  value={outdoorTemp}
                  onChange={(e) => setOutdoorTemp(parseInt(e.target.value))}
                  style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <label style={{ ...typo.small, color: colors.textPrimary }}>-10°C</label>
                  <label style={{ ...typo.small, color: colors.textPrimary }}>40°C</label>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            background: `${colors.secondary}11`,
            border: `1px solid ${colors.secondary}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <h4 style={{ color: colors.secondary, marginBottom: '8px' }}>Experiment:</h4>
            <ul style={{ color: colors.textPrimary, paddingLeft: '20px', margin: 0, ...typo.small }}>
              <li>Enable free cooling, set temp to -5°C - watch PUE plummet!</li>
              <li>Raise temp to 35°C - free cooling becomes ineffective</li>
              <li>Find the "crossover point" where free cooling starts helping</li>
            </ul>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Impact
          </button>
        </div>
        {renderNavDots()}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'a';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, ...typo.h3 }}>
              {wasCorrect ? 'Excellent insight!' : 'The impact is bigger than you might think!'}
            </h3>
            <p style={{ ...typo.body }}>
              Free cooling can reduce mechanical cooling by <strong>70-90%</strong>. Since cooling is typically 30-50% of all overhead, this can drop PUE from 1.5+ to below 1.2!
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>❄️</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Free Cooling Physics</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textPrimary, margin: 0 }}>
                Cold outside air (below ~18°C) can directly cool servers without running energy-intensive chillers. Only fan power is needed to move air through the facility. This eliminates the compressor work that dominates cooling energy use.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🌍</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Climate Impact on PUE</h3>
              </div>
              <ul style={{ ...typo.body, color: colors.textPrimary, margin: 0, paddingLeft: '20px' }}>
                <li><strong>Nordic countries:</strong> 95%+ free cooling hours, PUE 1.05-1.10</li>
                <li><strong>Northern US/Europe:</strong> 50-70% free cooling, PUE 1.2-1.4</li>
                <li><strong>Hot climates:</strong> Limited to night/winter, PUE 1.4-1.8</li>
              </ul>
            </div>

            <div style={{
              background: `${colors.accent}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.accent}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>💰</span>
                <h3 style={{ ...typo.h3, color: colors.accent, margin: 0 }}>Real-World Examples</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textPrimary, margin: 0 }}>
                Facebook's Lulea, Sweden data center achieves PUE of 1.07 using Arctic air. Google's Hamina, Finland facility uses Baltic Sea water cooling. These sites save tens of millions annually compared to hot-climate locations.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications
          </button>
        </div>
        {renderNavDots()}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="P U E Calculator"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Real-World Applications
          </h2>

          {/* App selector */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '24px',
          }}>
            {realWorldApps.map((a, i) => (
              <button
                key={i}
                onClick={() => {
                  playSound('click');
                  setSelectedApp(i);
                  const newCompleted = [...completedApps];
                  newCompleted[i] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{
                  background: selectedApp === i ? `${a.color}22` : colors.bgCard,
                  border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  position: 'relative',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {completedApps[i] && (
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: colors.success,
                    color: 'white',
                    fontSize: '12px',
                    lineHeight: '18px',
                  }}>
                    ✓
                  </div>
                )}
                <div style={{ fontSize: '28px', marginBottom: '4px' }}>{a.icon}</div>
                <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 500 }}>
                  {a.short}
                </div>
              </button>
            ))}
          </div>

          {/* Selected app details */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            borderLeft: `4px solid ${app.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '48px' }}>{app.icon}</span>
              <div>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
              </div>
            </div>

            <p style={{ ...typo.body, color: colors.textPrimary, marginBottom: '16px' }}>
              {app.description}
            </p>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                How PUE Connects:
              </h4>
              <p style={{ ...typo.small, color: colors.textPrimary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                  <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '16px' }}>
              <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px' }}>Companies:</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {app.companies.map((company, i) => (
                  <span key={i} style={{
                    background: `${app.color}22`,
                    color: app.color,
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                  }}>
                    {company}
                  </span>
                ))}
              </div>
            </div>

            {(app as unknown as Record<string, string>).howItWorks && (
              <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px', marginTop: '16px' }}>
                <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 700 }}>How It Works:</h4>
                <p style={{ ...typo.small, color: colors.textPrimary, margin: 0 }}>{(app as unknown as Record<string, string>).howItWorks}</p>
              </div>
            )}

            {(app as unknown as Record<string, string>).futureImpact && (
              <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px', marginTop: '8px' }}>
                <h4 style={{ ...typo.small, color: colors.success, marginBottom: '8px', fontWeight: 700 }}>Future Impact:</h4>
                <p style={{ ...typo.small, color: colors.textPrimary, margin: 0 }}>{(app as unknown as Record<string, string>).futureImpact}</p>
              </div>
            )}
          </div>

          <div style={{
            background: colors.bgSecondary,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.small, color: colors.textPrimary }}>
              Progress: {completedApps.filter(c => c).length}/4 applications explored
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
              {completedApps.map((completed, i) => (
                <div key={i} style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: completed ? colors.success : colors.border,
                }} />
              ))}
            </div>
          </div>

          {/* Got It button for the current app - always visible */}
          <button
            onClick={() => {
              playSound('click');
              const nextApp = (selectedApp + 1) % realWorldApps.length;
              setSelectedApp(nextApp);
              const newCompleted = [...completedApps];
              newCompleted[nextApp] = true;
              setCompletedApps(newCompleted);
            }}
            style={{
              ...primaryButtonStyle,
              width: '100%',
              marginBottom: '12px',
              background: 'linear-gradient(135deg, #1a1a24, #2a2a3a)',
              border: `1px solid ${colors.border}`,
            }}
          >
            Got It — Next App →
          </button>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test
            </button>
          )}
        </div>
        {renderNavDots()}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>
              {passed ? '🏆' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textPrimary, marginBottom: '32px' }}>
              {passed
                ? 'You understand PUE and data center efficiency!'
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Claim Your Mastery Badge
              </button>
            ) : (
              <button
                onClick={() => {
                  setTestSubmitted(false);
                  setTestAnswers(Array(10).fill(null));
                  setCurrentQuestion(0);
                  setTestScore(0);
                  goToPhase('hook');
                }}
                style={primaryButtonStyle}
              >
                Review and Try Again
              </button>
            )}
          </div>
          {renderNavDots()}
          </div>
          {renderBottomBar()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>
          {/* Progress */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <span style={{ ...typo.small, color: colors.textPrimary }}>
              Question {currentQuestion + 1} of 10
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: i === currentQuestion
                    ? colors.accent
                    : testAnswers[i]
                      ? colors.success
                      : colors.border,
                }} />
              ))}
            </div>
          </div>

          {/* Scenario */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, fontWeight: 600, margin: '0 0 8px 0' }}>
              Scenario Context:
            </p>
            <p style={{ ...typo.small, color: colors.textPrimary, margin: 0 }}>
              {question.scenario}
            </p>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: '8px 0 0 0' }}>
              Use PUE = Total Facility Power / IT Equipment Power to analyze data center efficiency.
            </p>
          </div>

          {/* Question */}
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
            {question.question}
          </h3>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {question.options.map(opt => (
              <button
                key={opt.id}
                onClick={() => handleTestAnswer(currentQuestion, opt.id)}
                style={{
                  background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '10px',
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                  color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '24px',
                  marginRight: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.small }}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white',
                  cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={submitTest}
                disabled={testAnswers.some(a => a === null)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: 'white',
                  cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>

        {renderNavDots()}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)` }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px', textAlign: 'center' }}>

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          PUE Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textPrimary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand Power Usage Effectiveness - the key metric driving data center efficiency worldwide.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            Key Concepts Mastered:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'PUE = Total Power / IT Power',
              'Lower PUE = Better Efficiency',
              'Cooling is the biggest overhead',
              'Free cooling uses cold outside air',
              'Location dramatically affects PUE',
              'Small improvements = Millions saved',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
                <span style={{ ...typo.small, color: colors.textPrimary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          marginBottom: '32px',
          maxWidth: '400px',
          width: '100%',
        }}>
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
            <div style={{ color: colors.accent, fontWeight: 'bold', ...typo.small }}>PUE Formula</div>
          </div>
          <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>❄️</div>
            <div style={{ color: colors.secondary, fontWeight: 'bold', ...typo.small }}>Free Cooling</div>
          </div>
          <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>💰</div>
            <div style={{ color: colors.warning, fontWeight: 'bold', ...typo.small }}>Cost Impact</div>
          </div>
          <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🌍</div>
            <div style={{ color: '#a855f7', fontWeight: 'bold', ...typo.small }}>Climate Effects</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={() => goToPhase('hook')}
            style={{
              padding: '14px 28px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.textSecondary,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Play Again
          </button>
          <a
            href="/"
            style={{
              ...primaryButtonStyle,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Continue Learning
          </a>
        </div>

        {renderNavDots()}
        </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  return null;
};

export default PUECalculatorRenderer;
