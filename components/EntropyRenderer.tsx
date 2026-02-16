'use client';

import React, { useState, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Entropy & The Second Law of Thermodynamics - Complete 10-Phase Game
// ─────────────────────────────────────────────────────────────────────────────

export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
    'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
    'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
    'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected';
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface EntropyRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST QUESTIONS
// ─────────────────────────────────────────────────────────────────────────────
const testQuestions = [
  {
    scenario: "A chemist places a drop of dye in a glass of still water. Without stirring, the dye gradually spreads throughout the entire glass over the course of an hour.",
    question: "Why does the dye spread on its own without any external force?",
    options: [
      { id: 'a', text: "A) The dye molecules are attracted to water molecules" },
      { id: 'b', text: "B) Random thermal motion explores all possible arrangements, and spread states vastly outnumber concentrated states", correct: true },
      { id: 'c', text: "C) Gravity pulls the dye downward through the water" },
      { id: 'd', text: "D) Water currents from temperature differences carry the dye" }
    ],
    explanation: "Entropy drives diffusion. With billions of molecules in random motion, the number of ways to arrange molecules in a spread-out state is astronomically larger than concentrated states. The system naturally evolves toward the most probable (highest entropy) configuration."
  },
  {
    scenario: "A hot cup of coffee sits on a table. After 30 minutes, its temperature drops from 80C to room temperature (22C), while the room's temperature remains essentially unchanged.",
    question: "How does this process relate to the Second Law of Thermodynamics?",
    options: [
      { id: 'a', text: "A) Heat flowed from cold to hot, which always happens spontaneously" },
      { id: 'b', text: "B) Energy was destroyed as the coffee cooled" },
      { id: 'c', text: "C) Total entropy increased as heat spread from the concentrated hot source to the cooler surroundings", correct: true },
      { id: 'd', text: "D) The coffee violated thermodynamics by losing energy without work" }
    ],
    explanation: "Heat spontaneously flows from hot to cold because this increases total entropy. The entropy lost by the coffee (Q/T_hot) is less than the entropy gained by the room (Q/T_cold), so net entropy increases. This is the essence of the Second Law."
  },
  {
    scenario: "A physicist proposes a device that takes heat from the ocean and converts 100% of it into electricity with no other effects.",
    question: "Why is this device impossible according to thermodynamics?",
    options: [
      { id: 'a', text: "A) The ocean doesn't contain enough thermal energy" },
      { id: 'b', text: "B) It violates the Kelvin-Planck statement: you cannot convert heat entirely to work in a cycle", correct: true },
      { id: 'c', text: "C) Salt in the ocean blocks thermal energy extraction" },
      { id: 'd', text: "D) It would require infinite ocean surface area" }
    ],
    explanation: "The Kelvin-Planck statement of the Second Law states it is impossible to construct a device that operates in a cycle and produces no effect other than extracting heat from a reservoir and performing an equivalent amount of work. Some heat must always be rejected."
  },
  {
    scenario: "A refrigerator keeps food cold inside (4C) while the kitchen stays warm (25C). The refrigerator seems to move heat from cold to hot.",
    question: "Does this violate the Second Law of Thermodynamics?",
    options: [
      { id: 'a', text: "A) Yes, heat cannot flow from cold to hot under any circumstances" },
      { id: 'b', text: "B) No, because work input creates more entropy in the surroundings than is removed from the food", correct: true },
      { id: 'c', text: "C) Refrigerators are exempt from thermodynamic laws" },
      { id: 'd', text: "D) The food actually generates heat that the refrigerator removes" }
    ],
    explanation: "Refrigerators use work (electricity) to pump heat from cold to hot. The work generates additional entropy that more than compensates for the local entropy decrease inside the fridge. Total entropy of fridge + kitchen + power plant always increases."
  },
  {
    scenario: "A deck of 52 cards is perfectly ordered by suit and rank. After shuffling it thoroughly 1000 times, a player checks if the deck has returned to its original order.",
    question: "What is the probability of finding the original order after random shuffling?",
    options: [
      { id: 'a', text: "A) Exactly 1 in 1000 (one shuffle could restore order)" },
      { id: 'b', text: "B) Impossible - shuffling can only create disorder" },
      { id: 'c', text: "C) About 1 in 8 x 10^67 - possible but vanishingly improbable", correct: true },
      { id: 'd', text: "D) 50% - either it is in order or it is not" }
    ],
    explanation: "There are 52! = 8 x 10^67 possible arrangements. The original order is just ONE of these. While physically possible, the probability is so small that in the entire history of the universe, no randomly shuffled deck has ever returned to perfect order."
  },
  {
    scenario: "Living cells maintain highly organized internal structures - proteins fold precisely, DNA replicates accurately, and organelles stay compartmentalized.",
    question: "How do living organisms create and maintain this order without violating the Second Law?",
    options: [
      { id: 'a', text: "A) Life operates outside the laws of thermodynamics" },
      { id: 'b', text: "B) Organisms consume low-entropy food and export high-entropy waste, increasing net universal entropy", correct: true },
      { id: 'c', text: "C) Quantum effects allow cells to temporarily reverse entropy" },
      { id: 'd', text: "D) Evolution has optimized cells to store entropy for later release" }
    ],
    explanation: "Organisms are open systems that import free energy (low-entropy sunlight or food) and export entropy (heat, CO2, waste). A human produces about 100W of heat - pure entropy export. Life creates local order by accelerating global disorder."
  },
  {
    scenario: "A computer programmer wants to understand the thermodynamic cost of computation. The computer erases 1 gigabyte of data by overwriting it with zeros.",
    question: "According to Landauer's principle, what must happen when information is erased?",
    options: [
      { id: 'a', text: "A) Nothing - information is abstract and has no physical cost" },
      { id: 'b', text: "B) At least kT x ln(2) joules of heat must be released per bit erased", correct: true },
      { id: 'c', text: "C) The processor must cool down to absorb the information" },
      { id: 'd', text: "D) Erased data is stored in a quantum vacuum state" }
    ],
    explanation: "Landauer's principle connects information theory to thermodynamics. Erasing 1 bit reduces computational entropy, which must be compensated by releasing at least kT x ln(2) = 3 x 10^-21 J as heat. For 1 GB, that is about 2 x 10^-11 J minimum."
  },
  {
    scenario: "At the Big Bang, the universe began in an extremely low-entropy state - hot, dense, and remarkably uniform. 13.8 billion years later, we have stars, galaxies, planets, and life.",
    question: "How does the current structured universe represent higher entropy than the uniform early universe?",
    options: [
      { id: 'a', text: "A) It does not - the current universe has lower entropy due to organized structures" },
      { id: 'b', text: "B) Gravity makes clumped matter the high-entropy state; uniform distribution was actually low-entropy", correct: true },
      { id: 'c', text: "C) The universe's entropy has not changed since the Big Bang" },
      { id: 'd', text: "D) Black holes absorbed all the entropy from the early universe" }
    ],
    explanation: "For gravitating systems, uniform distribution is LOW entropy! Gravity reverses our usual intuition. Clumping matter releases gravitational potential energy as heat, increasing total entropy. Black holes represent maximum entropy."
  },
  {
    scenario: "An ice cube at 0C is placed in a glass of water at 0C. After several hours, the ice has completely melted, but the water temperature remains at 0C throughout.",
    question: "If temperature stayed constant, how did entropy change during melting?",
    options: [
      { id: 'a', text: "A) Entropy stayed constant since temperature did not change" },
      { id: 'b', text: "B) Entropy decreased because solid ice is more ordered than liquid water" },
      { id: 'c', text: "C) Entropy increased because liquid molecules have more possible arrangements than crystalline ice", correct: true },
      { id: 'd', text: "D) Entropy is undefined during phase transitions" }
    ],
    explanation: "Even at constant temperature, entropy changes during phase transitions. Delta S = Q/T = latent heat / 273K is positive for melting. Liquid water molecules can arrange themselves in many more ways than the rigid crystal lattice of ice."
  },
  {
    scenario: "A physicist measures the efficiency of various heat engines: car engine (25%), coal power plant (40%), combined-cycle gas turbine (60%), and a theoretical Carnot engine operating between 600K and 300K.",
    question: "What is the maximum possible efficiency for ANY heat engine operating between 600K and 300K?",
    options: [
      { id: 'a', text: "A) 100% if perfectly designed" },
      { id: 'b', text: "B) 60% matching the best current technology" },
      { id: 'c', text: "C) 50% set by the Carnot efficiency limit (1 - T_cold/T_hot)", correct: true },
      { id: 'd', text: "D) 75% with future superconducting materials" }
    ],
    explanation: "The Carnot efficiency = 1 - T_cold/T_hot = 1 - 300/600 = 50% is the absolute maximum for ANY heat engine. This is not a technology limit but a fundamental law: extracting work from heat requires rejecting some heat to maintain entropy balance."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '\u{1F525}',
    title: 'Heat Engines & Power Generation',
    short: 'Why no engine can be 100% efficient',
    tagline: 'Entropy sets the ultimate efficiency limit',
    description: 'Every power plant, car engine, and jet turbine is fundamentally limited by entropy. The Carnot efficiency shows that some heat must always be rejected to a cold reservoir - this is not a design flaw but a law of nature. Heat engines have powered civilization since the Industrial Revolution, and understanding their entropy limits is essential for engineering better energy systems.',
    connection: 'The particle mixing you observed shows why heat flows from hot to cold. Converting that heat flow into useful work requires maintaining temperature differences, and entropy demands its tax in the form of waste heat.',
    howItWorks: 'Heat engines operate between hot (T_H) and cold (T_C) reservoirs. Maximum efficiency = 1 - T_C/T_H. A coal plant at 800K exhausting to 300K has max efficiency of 62.5%. Real friction and irreversibilities reduce this to about 40%.',
    stats: [
      { value: '40%', label: 'Best coal plant efficiency', icon: '\u{1F3ED}' },
      { value: '62%', label: 'Combined cycle gas turbine', icon: '\u26A1' },
      { value: '25%', label: 'Car engine typical', icon: '\u{1F697}' }
    ],
    examples: ['Nuclear power plants (33% efficient)', 'Jet engines (35-40%)', 'Steam locomotives (6-9%)', 'Modern gas turbines (>60%)'],
    companies: ['GE Power', 'Siemens Energy', 'Mitsubishi Power', 'Rolls-Royce'],
    futureImpact: 'Supercritical CO2 cycles and combined heat-and-power systems will push efficiencies toward 70%, but can never exceed the Carnot limit.',
    color: '#EF4444'
  },
  {
    icon: '\u{1F9EC}',
    title: 'Biology & Life Systems',
    short: 'How life fights entropy locally',
    tagline: 'Living organisms are entropy-exporting machines',
    description: 'Life seems to defy entropy by creating incredible order - DNA replication, protein folding, cell division. But organisms survive by consuming low-entropy energy (food, sunlight) and exporting high-entropy waste (heat, CO2). A human body produces about 100 watts of waste heat continuously, which represents a massive entropy increase in the surroundings that more than compensates for the internal biological order.',
    connection: 'Just as your simulation showed local order being possible while total entropy increases, cells maintain internal order by paying an entropy tax to their environment. A human body exports about 100 watts of heat.',
    howItWorks: 'ATP hydrolysis provides the free energy for ordering processes. Photosynthesis captures low-entropy photons. Metabolism breaks down ordered food molecules, releasing energy and producing disordered waste products.',
    stats: [
      { value: '100W', label: 'Human heat output', icon: '\u{1F321}' },
      { value: '10^14', label: 'Cells in human body', icon: '\u{1F52C}' },
      { value: '40%', label: 'Metabolic efficiency', icon: '\u26A1' }
    ],
    examples: ['ATP synthesis powers all cellular work', 'Protein folding driven by hydrophobic effect', 'DNA repair mechanisms', 'Photosynthesis captures order from light'],
    companies: ['Moderna', 'Genentech', 'Illumina', 'CRISPR Therapeutics'],
    futureImpact: 'Understanding cellular thermodynamics will enable synthetic biology, anti-aging therapies, and artificial cells that harvest entropy gradients.',
    color: '#10B981'
  },
  {
    icon: '\u{1F4BB}',
    title: 'Information & Computing',
    short: 'The thermodynamic cost of bits',
    tagline: 'Information is physical and obeys thermodynamics',
    description: 'Landauer proved that erasing information has a minimum energy cost: kT x ln(2) per bit. This connects Shannon entropy (information theory) to Boltzmann entropy (thermodynamics), showing that computation is inherently physical. Modern data centers consume about 1% of global electricity, and the thermodynamic limits of computing will become increasingly important as we scale artificial intelligence systems.',
    connection: 'When you observed particles mixing, information about their original positions was lost. That lost information corresponds to increased entropy. Similarly, erasing computer memory destroys information and must release heat.',
    howItWorks: 'Reversible computing can theoretically avoid Landauer limit, but irreversible operations (AND, OR gates) erase information. Modern CPUs waste millions of times the theoretical minimum, but approaching this limit is a path to ultra-efficient computing.',
    stats: [
      { value: '3x10^-21 J', label: 'Landauer limit per bit', icon: '\u{1F522}' },
      { value: '1%', label: 'Global electricity for data centers', icon: '\u{1F3E2}' },
      { value: '10^21', label: 'Bits stored globally', icon: '\u{1F4BE}' }
    ],
    examples: ['Data center cooling (massive entropy export)', 'Quantum computing approaches reversibility', 'Maxwell demon thought experiment', 'DNA as information storage'],
    companies: ['Intel', 'NVIDIA', 'IBM', 'Google'],
    futureImpact: 'Reversible computing and thermodynamically-optimized AI will enable computing power limited only by heat dissipation, not transistor density.',
    color: '#3B82F6'
  },
  {
    icon: '\u{1F30C}',
    title: 'Cosmology & Time Arrow',
    short: 'Why time flows forward',
    tagline: 'Entropy defines past from future',
    description: 'The Second Law is the ONLY fundamental physics law that distinguishes past from future. The universe began in a remarkably low-entropy state (Big Bang) and has been increasing ever since. This entropy gradient gives time its direction. Every memory you have, every aging process, every star burning hydrogen - all are manifestations of the universe moving from its improbable initial state toward thermodynamic equilibrium.',
    connection: 'Your simulation showed irreversibility - mixed particles never spontaneously separate. This same principle explains why eggs break but never unbreak, why we remember the past not the future, and why the universe ages.',
    howItWorks: 'Gravity makes uniformity low-entropy. The smooth early universe was actually highly ordered. As matter clumps into stars and galaxies, entropy increases. The heat death is maximum entropy - uniform temperature, no gradients, no work possible.',
    stats: [
      { value: '10^88', label: 'Universe entropy (Boltzmann units)', icon: '\u{1F30D}' },
      { value: '10^120', label: 'Black hole max entropy', icon: '\u{1F573}' },
      { value: '10^100 yr', label: 'Time to heat death', icon: '\u23F1' }
    ],
    examples: ['Cosmic microwave background uniformity', 'Black holes maximize entropy', 'Why we age in one direction', 'Memory formation is entropy increase'],
    companies: ['NASA', 'ESA', 'CERN', 'LIGO'],
    futureImpact: 'Understanding cosmological entropy may explain why the Big Bang was low-entropy, potentially revealing pre-Big-Bang physics or multiverse connections.',
    color: '#8B5CF6'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const EntropyRenderer: React.FC<EntropyRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Play phase sliders
  const [particleCount, setParticleCount] = useState(30);
  const [temperature, setTemperature] = useState(350);

  // Twist play sliders
  const [hotTemp, setHotTemp] = useState(600);
  const [coldTemp, setColdTemp] = useState(300);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [answerConfirmed, setAnswerConfirmed] = useState(false);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  const isNavigating = useRef(false);

  const colors = {
    bgPrimary: '#0a0a0f',
    bgCard: '#1a1a24',
    bgDark: '#0f0f18',
    accent: '#8B5CF6',
    accentDark: '#6D28D9',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    hot: '#EF4444',
    cold: '#3B82F6',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: 'rgba(148,163,184,0.7)',
  };

  const typo = {
    h1: { fontSize: '32px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: '26px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: '20px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: '16px', fontWeight: 400 as const, lineHeight: 1.6 },
    small: { fontSize: '14px', fontWeight: 400 as const, lineHeight: 1.5 },
  };

  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'Twist Predict',
    twist_play: 'Twist Explore',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    setPhase(p);
    setAnswerConfirmed(false);
    if (onGameEvent) {
      onGameEvent({ eventType: 'phase_changed', gameType: 'entropy', gameTitle: 'Entropy & Thermodynamics', details: { phase: p }, timestamp: Date.now() });
    }
    setTimeout(() => { isNavigating.current = false; }, 200);
  }, [onGameEvent]);

  const nextPhase = useCallback(() => {
    const idx = validPhases.indexOf(phase);
    if (idx < validPhases.length - 1) goToPhase(validPhases[idx + 1]);
  }, [phase, goToPhase]);

  const prevPhase = useCallback(() => {
    const idx = validPhases.indexOf(phase);
    if (idx > 0) goToPhase(validPhases[idx - 1]);
  }, [phase, goToPhase]);

  // Slider style
  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '20px',
    touchAction: 'pan-y',
    WebkitAppearance: 'none',
    accentColor: '#3b82f6',
  };

  // Entropy calculation helpers
  const calcEntropy = (T: number) => {
    const kB = 1.38e-23;
    const omega = Math.pow(T / 100, particleCount);
    return kB * Math.log(Math.max(omega, 1));
  };

  const entropyValue = calcEntropy(temperature);
  const carnotEfficiency = hotTemp > coldTemp ? (1 - coldTemp / hotTemp) * 100 : 0;

  // Confirm answer for test
  const confirmAnswer = () => {
    setAnswerConfirmed(true);
    const correctIdx = testQuestions[currentQuestion].options.findIndex(o => o.correct);
    if (onGameEvent) {
      onGameEvent({
        eventType: testAnswers[currentQuestion] === correctIdx ? 'correct_answer' : 'incorrect_answer',
        gameType: 'entropy', gameTitle: 'Entropy & Thermodynamics',
        details: { question: currentQuestion, answer: testAnswers[currentQuestion] },
        timestamp: Date.now()
      });
    }
  };

  const handleNextQuestion = () => {
    setAnswerConfirmed(false);
    setCurrentQuestion(prev => Math.min(prev + 1, 9));
  };

  const handleSubmitTest = () => {
    const score = testAnswers.reduce((acc, ans, i) => {
      const correctIdx = testQuestions[i].options.findIndex(o => o.correct);
      return acc + (ans === correctIdx ? 1 : 0);
    }, 0);
    setTestScore(score);
    setTestSubmitted(true);
    if (onGameEvent) {
      onGameEvent({ eventType: 'game_completed', gameType: 'entropy', gameTitle: 'Entropy & Thermodynamics', details: { score, total: 10 }, timestamp: Date.now() });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PROGRESS BAR (fixed top)
  // ─────────────────────────────────────────────────────────────────────────
  const renderProgressBar = () => (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '44px', background: colors.bgDark, zIndex: 1000, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
      <span style={{ fontSize: '20px', marginRight: '10px' }}>{'\u{1F3B2}'}</span>
      <span style={{ color: colors.textPrimary, fontWeight: 600, fontSize: '14px', flex: 1 }}>Entropy</span>
      <span style={{ color: colors.textMuted, fontSize: '12px' }}>
        {phaseLabels[phase]} ({validPhases.indexOf(phase) + 1}/{validPhases.length})
      </span>
      <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: `${((validPhases.indexOf(phase) + 1) / validPhases.length) * 100}%`, background: `linear-gradient(90deg, ${colors.accent}, #EC4899)` }} />
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // BOTTOM NAV BAR (fixed bottom with Back/Next)
  // ─────────────────────────────────────────────────────────────────────────
  const renderNavBar = () => {
    const isTestActive = phase === 'test' && !testSubmitted;
    return (
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 24px', background: colors.bgDark, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1000 }}>
        {validPhases.indexOf(phase) > 0 ? (
          <button onClick={prevPhase} style={{ padding: '10px 20px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: colors.textSecondary, cursor: 'pointer', fontSize: '14px' }}>
            Back
          </button>
        ) : <div />}
        <button
          onClick={nextPhase}
          disabled={isTestActive}
          style={{
            padding: '10px 28px', borderRadius: '8px', border: 'none',
            background: isTestActive ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg, ${colors.accent}, ${colors.accentDark})`,
            color: 'white', fontWeight: 600, cursor: isTestActive ? 'not-allowed' : 'pointer', fontSize: '15px',
            opacity: isTestActive ? 0.4 : 1,
          }}
        >
          Next
        </button>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // NAV DOTS
  // ─────────────────────────────────────────────────────────────────────────
  const renderNavDots = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px 0' }}>
      {validPhases.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          aria-label={phaseLabels[p]}
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: validPhases.indexOf(phase) >= i ? colors.accent : 'rgba(255,255,255,0.15)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // SVG VISUALIZATION - Entropy vs Temperature/Microstates
  // ─────────────────────────────────────────────────────────────────────────
  const renderEntropySVG = (width: number = 460, height: number = 300, interactive: boolean = true) => {
    const pad = { top: 30, right: 30, bottom: 50, left: 60 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    // Generate entropy curve: S = k * N * ln(T/T0)
    const numPoints = 30;
    const points: { x: number; y: number; temp: number; entropy: number }[] = [];
    for (let i = 0; i <= numPoints; i++) {
      const t = 100 + (i / numPoints) * 800;
      const s = particleCount * Math.log(t / 100);
      points.push({
        temp: t,
        entropy: s,
        x: pad.left + (i / numPoints) * plotW,
        y: pad.top + plotH - (s / (particleCount * Math.log(9))) * plotH,
      });
    }

    // Build path string with many L x y segments
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }

    // Interactive point
    const interT = temperature;
    const interS = particleCount * Math.log(interT / 100);
    const interX = pad.left + ((interT - 100) / 800) * plotW;
    const interY = pad.top + plotH - (interS / (particleCount * Math.log(9))) * plotH;

    // Area path
    const areaD = pathD + ` L ${points[points.length - 1].x} ${pad.top + plotH} L ${points[0].x} ${pad.top + plotH} Z`;

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: '100%', background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="entropyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.cold} />
            <stop offset="50%" stopColor={colors.accent} />
            <stop offset="100%" stopColor={colors.hot} />
          </linearGradient>
          <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.accent} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors.accent} stopOpacity="0.02" />
          </linearGradient>
          <radialGradient id="pointGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.accent} stopOpacity="0.6" />
            <stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Grid lines group */}
        <g id="grid-lines">
          {[0.25, 0.5, 0.75].map(frac => (
            <line key={`hg${frac}`} x1={pad.left} y1={pad.top + plotH * frac} x2={pad.left + plotW} y2={pad.top + plotH * frac} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" opacity="0.3" />
          ))}
          {[0.25, 0.5, 0.75].map(frac => (
            <line key={`vg${frac}`} x1={pad.left + plotW * frac} y1={pad.top} x2={pad.left + plotW * frac} y2={pad.top + plotH} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" opacity="0.3" />
          ))}
        </g>

        {/* Axes group */}
        <g id="axes">
          <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + plotH} stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <line x1={pad.left} y1={pad.top + plotH} x2={pad.left + plotW} y2={pad.top + plotH} stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          {/* Tick marks on x-axis */}
          <line x1={pad.left + plotW * 0.25} y1={pad.top + plotH - 4} x2={pad.left + plotW * 0.25} y2={pad.top + plotH + 4} stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <line x1={pad.left + plotW * 0.5} y1={pad.top + plotH - 4} x2={pad.left + plotW * 0.5} y2={pad.top + plotH + 4} stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <line x1={pad.left + plotW * 0.75} y1={pad.top + plotH - 4} x2={pad.left + plotW * 0.75} y2={pad.top + plotH + 4} stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
        </g>

        {/* Labels group */}
        <g id="labels">
          <text x={width / 2} y={height - 8} textAnchor="middle" fill={colors.textSecondary} fontSize="13" fontWeight="600">Temperature (K)</text>
          <text x="14" y={height / 2} textAnchor="middle" fill={colors.textSecondary} fontSize="13" fontWeight="600" transform={`rotate(-90, 14, ${height / 2})`}>Entropy (S)</text>
          <text x={pad.left} y={pad.top + plotH + 18} textAnchor="middle" fill={colors.textMuted} fontSize="11">100</text>
          <text x={pad.left + plotW * 0.5} y={pad.top + plotH + 18} textAnchor="middle" fill={colors.textMuted} fontSize="11">500</text>
          <text x={pad.left + plotW} y={pad.top + plotH + 18} textAnchor="middle" fill={colors.textMuted} fontSize="11">900</text>
          <text x={pad.left - 8} y={pad.top + plotH} textAnchor="end" fill={colors.textMuted} fontSize="11">0</text>
          <text x={pad.left - 8} y={pad.top + 5} textAnchor="end" fill={colors.textMuted} fontSize="11">Max</text>
          <text x={pad.left + plotW * 0.7} y={pad.top + 20} fill={colors.accent} fontSize="12" fontWeight="600">
            S = k_B {'\u00D7'} ln({'\u03A9'})
          </text>
          <text x={pad.left + plotW * 0.7} y={pad.top + 36} fill={colors.textMuted} fontSize="11">
            N = {particleCount} particles
          </text>
          <text x={pad.left + 10} y={pad.top + 20} fill={colors.warning} fontSize="12" fontWeight="600">
            T = {temperature}K
          </text>
        </g>

        {/* Data group */}
        <g id="data-curves">
          <path d={areaD} fill="url(#areaGrad)" />
          <path d={pathD} fill="none" stroke="url(#entropyGrad)" strokeWidth="3" strokeLinecap="round" />
          {/* Reference line for equilibrium */}
          <rect x={pad.left} y={pad.top + plotH * 0.1} width={plotW} height="1" fill={colors.accent} opacity="0.15" rx="1" />
        </g>

        {/* Interactive point group */}
        {interactive && (
          <g id="interactive-point">
            <circle cx={interX} cy={interY} r={16} fill="url(#pointGlow)" />
            <circle cx={interX} cy={interY} r={8} fill={colors.accent} filter="url(#glow)" stroke="#fff" strokeWidth={2} />
            <line x1={interX} y1={interY} x2={interX} y2={pad.top + plotH} stroke={colors.accent} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
          </g>
        )}
      </svg>
    );
  };

  // Heat flow SVG for twist phases
  const renderHeatFlowSVG = (width: number = 460, height: number = 300) => {
    const pad = { top: 30, right: 30, bottom: 50, left: 60 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const eff = carnotEfficiency;

    // Efficiency curve as function of T_cold/T_hot
    const numPoints = 30;
    let pathD = '';
    for (let i = 0; i <= numPoints; i++) {
      const ratio = i / numPoints;
      const effVal = (1 - ratio) * 100;
      const x = pad.left + ratio * plotW;
      const y = pad.top + plotH - (effVal / 100) * plotH;
      pathD += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }

    // Current operating point
    const curRatio = coldTemp / hotTemp;
    const curX = pad.left + curRatio * plotW;
    const curY = pad.top + plotH - (eff / 100) * plotH;

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: '100%', background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="effGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.success} />
            <stop offset="100%" stopColor={colors.error} />
          </linearGradient>
          <linearGradient id="effArea" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.success} stopOpacity="0.25" />
            <stop offset="100%" stopColor={colors.success} stopOpacity="0.02" />
          </linearGradient>
          <filter id="glow2">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Grid */}
        {[0.25, 0.5, 0.75].map(frac => (
          <line key={`hg2${frac}`} x1={pad.left} y1={pad.top + plotH * frac} x2={pad.left + plotW} y2={pad.top + plotH * frac} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" opacity="0.3" />
        ))}
        {[0.25, 0.5, 0.75].map(frac => (
          <line key={`vg2${frac}`} x1={pad.left + plotW * frac} y1={pad.top} x2={pad.left + plotW * frac} y2={pad.top + plotH} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" opacity="0.3" />
        ))}

        {/* Axes */}
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + plotH} stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
        <line x1={pad.left} y1={pad.top + plotH} x2={pad.left + plotW} y2={pad.top + plotH} stroke="rgba(255,255,255,0.4)" strokeWidth="1" />

        {/* Axis labels */}
        <text x={width / 2} y={height - 8} textAnchor="middle" fill={colors.textSecondary} fontSize="13" fontWeight="600">Temperature Ratio (T_cold / T_hot)</text>
        <text x="14" y={height / 2} textAnchor="middle" fill={colors.textSecondary} fontSize="13" fontWeight="600" transform={`rotate(-90, 14, ${height / 2})`}>Efficiency (%)</text>

        {/* Tick labels */}
        <text x={pad.left} y={pad.top + plotH + 18} textAnchor="middle" fill={colors.textMuted} fontSize="11">0</text>
        <text x={pad.left + plotW} y={pad.top + plotH + 18} textAnchor="middle" fill={colors.textMuted} fontSize="11">1.0</text>
        <text x={pad.left - 8} y={pad.top + plotH} textAnchor="end" fill={colors.textMuted} fontSize="11">0%</text>
        <text x={pad.left - 8} y={pad.top + 5} textAnchor="end" fill={colors.textMuted} fontSize="11">100%</text>

        {/* Area under curve */}
        <path d={pathD + ` L ${pad.left + plotW} ${pad.top + plotH} L ${pad.left} ${pad.top + plotH} Z`} fill="url(#effArea)" />

        {/* Efficiency curve */}
        <path d={pathD} fill="none" stroke="url(#effGrad)" strokeWidth="3" strokeLinecap="round" />

        {/* Labels */}
        <text x={pad.left + 10} y={pad.top + 20} fill={colors.success} fontSize="12" fontWeight="600">
          Carnot: {'\u03B7'} = 1 - T_c/T_h
        </text>
        <text x={pad.left + plotW - 10} y={pad.top + 20} textAnchor="end" fill={colors.warning} fontSize="12" fontWeight="600">
          {eff.toFixed(1)}% max
        </text>

        {/* Interactive point */}
        <circle cx={curX} cy={curY} r={8} fill={colors.success} filter="url(#glow2)" stroke="#fff" strokeWidth={2} />
        <line x1={curX} y1={curY} x2={curX} y2={pad.top + plotH} stroke={colors.success} strokeDasharray="3 3" opacity="0.5" />
      </svg>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE RENDERS
  // ═══════════════════════════════════════════════════════════════════════════

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '600px', margin: '24px auto 0', textAlign: 'center', padding: '0 16px' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>{'\u{1F3B2}\u{1F525}\u2744\uFE0F'}</div>
            <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
              Entropy: The Arrow of Time
            </h1>
            <p style={{ ...typo.body, color: '#e2e8f0', marginBottom: '32px' }}>
              Discover why eggs break but never unbreak. Why does coffee cool but never spontaneously heat up? The answer lies in <span style={{ color: colors.accent }}>entropy</span> - the measure of disorder that gives time its direction. Explore how the Second Law of Thermodynamics governs everything from mixing particles to the fate of the universe.
            </p>
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '16px', marginBottom: '24px', border: `1px solid rgba(255,255,255,0.1)` }}>
              {renderEntropySVG(440, 260, false)}
            </div>
            <p style={{ ...typo.small, color: colors.textMuted, fontStyle: 'italic', marginBottom: '24px' }}>
              "The second law of thermodynamics holds, I think, the supreme position among the laws of Nature." - Sir Arthur Eddington
            </p>
            <button onClick={nextPhase} style={{ padding: '16px 32px', borderRadius: '12px', border: 'none', background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentDark})`, color: 'white', fontWeight: 700, fontSize: '18px', cursor: 'pointer' }}>
              Start Exploring
            </button>
            {renderNavDots()}
          </div>
        </div>
        {renderNavBar()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', label: 'Yes, if we wait long enough particles will spontaneously separate' },
      { id: 'b', label: 'No, it is physically impossible for particles to separate' },
      { id: 'c', label: 'It is possible but so improbable it essentially never happens', correct: true },
      { id: 'd', label: 'Only at absolute zero temperature' }
    ];

    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '600px', margin: '24px auto 0', padding: '0 16px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Make Your Prediction
            </h2>
            <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '24px', textAlign: 'center' }}>
              Phase 2 of 10: Predict
            </p>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '16px', marginBottom: '16px', border: `1px solid rgba(255,255,255,0.1)` }}>
              {renderEntropySVG(420, 220, false)}
            </div>

            <p style={{ ...typo.body, color: colors.textPrimary, textAlign: 'center', marginBottom: '20px' }}>
              After removing a barrier, hot and cold particles mix together. Could they ever spontaneously <span style={{ color: colors.accent }}>separate back</span> into their original arrangement?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setPrediction(opt.id)}
                  disabled={prediction !== null}
                  style={{
                    background: prediction === opt.id ? (opt.correct ? `${colors.success}22` : `${colors.error}22`) : colors.bgCard,
                    border: `2px solid ${prediction === opt.id ? (opt.correct ? colors.success : colors.error) : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '10px', padding: '14px 16px', textAlign: 'left',
                    cursor: prediction ? 'default' : 'pointer',
                  }}
                >
                  <span style={{ color: colors.accent, fontWeight: 700, marginRight: '8px' }}>{opt.id.toUpperCase()}.</span>
                  <span style={{ color: colors.textPrimary }}>{opt.label}</span>
                </button>
              ))}
            </div>

            {prediction && (
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}`, marginBottom: '16px' }}>
                <p style={{ ...typo.body, color: options.find(o => o.id === prediction)?.correct ? colors.success : colors.error, fontWeight: 600, marginBottom: '8px' }}>
                  {options.find(o => o.id === prediction)?.correct ? '\u2713 Correct!' : '\u2717 Not quite!'}
                </p>
                <p style={{ ...typo.small, color: colors.textSecondary }}>
                  The answer is C: It is statistically forbidden, not physically impossible. With enough particles, the probability of spontaneous separation is so astronomically small (less than 1 in 10^20 for just 100 particles) that it essentially never happens.
                </p>
              </div>
            )}
            {renderNavDots()}
          </div>
        </div>
        {renderNavBar()}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    const entropyDisplay = (particleCount * Math.log(temperature / 100)).toFixed(2);
    const microstates = Math.round(Math.pow(temperature / 100, Math.min(particleCount, 10)));

    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '600px', margin: '24px auto 0', padding: '0 16px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Entropy Laboratory
            </h2>
            <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '16px', textAlign: 'center' }}>
              Phase 3 of 10: Experiment - Adjust the sliders to observe how entropy changes
            </p>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '16px', marginBottom: '20px', border: `1px solid rgba(255,255,255,0.1)` }}>
              {renderEntropySVG(460, 300, true)}
            </div>

            {/* Sliders */}
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '16px', border: `1px solid rgba(255,255,255,0.1)` }}>
              <label style={{ display: 'block', color: colors.textPrimary, fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>
                Temperature: {temperature} K (Kelvin)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: colors.textMuted, fontSize: '12px' }}>100 K</span>
                <input
                  type="range"
                  min="100"
                  max="900"
                  value={temperature}
                  onChange={(e) => setTemperature(parseInt(e.target.value))}
                  style={sliderStyle}
                  aria-label="Temperature"
                />
                <span style={{ color: colors.textMuted, fontSize: '12px' }}>900 K</span>
              </div>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '16px', border: `1px solid rgba(255,255,255,0.1)` }}>
              <label style={{ display: 'block', color: colors.textPrimary, fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>
                Number of Particles: {particleCount}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: colors.textMuted, fontSize: '12px' }}>5</span>
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={particleCount}
                  onChange={(e) => setParticleCount(parseInt(e.target.value))}
                  style={sliderStyle}
                  aria-label="Number of Particles"
                />
                <span style={{ color: colors.textMuted, fontSize: '12px' }}>60</span>
              </div>
            </div>

            {/* Calculated values */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '10px', padding: '14px', textAlign: 'center', border: `1px solid ${colors.accent}30` }}>
                <div style={{ color: colors.accent, fontWeight: 700, fontSize: '20px' }}>{entropyDisplay}</div>
                <div style={{ color: colors.textMuted, fontSize: '12px' }}>Entropy (S)</div>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '10px', padding: '14px', textAlign: 'center', border: `1px solid ${colors.warning}30` }}>
                <div style={{ color: colors.warning, fontWeight: 700, fontSize: '20px' }}>{microstates.toLocaleString()}</div>
                <div style={{ color: colors.textMuted, fontSize: '12px' }}>Microstates ({'\u03A9'})</div>
              </div>
            </div>

            {/* Formula */}
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', textAlign: 'center', marginBottom: '16px', border: `1px solid ${colors.accent}33` }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '10px' }}>Boltzmann Entropy Formula</h3>
              <div style={{ fontSize: '24px', color: colors.textPrimary, fontFamily: 'serif', marginBottom: '8px' }}>
                S = k_B {'\u00D7'} ln({'\u03A9'})
              </div>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                When you increase temperature, particles gain kinetic energy and explore more arrangements. Because the number of microstates grows exponentially, entropy increases logarithmically. Try adjusting the temperature slider to see how the entropy curve responds - notice how higher temperature always means higher entropy.
              </p>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '16px', border: `1px solid ${colors.success}33` }}>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                <strong style={{ color: colors.success }}>What to observe:</strong> As temperature rises, molecules move faster and explore more configurations. Slide the temperature control to see how entropy is affected. The interactive point on the graph tracks your current temperature setting. More particles means exponentially more possible arrangements. This is important because it applies to real-world engineering - this is why no heat engine can ever be 100% efficient, and why industry designs power plants to maximize temperature differences.
              </p>
            </div>
            {renderNavDots()}
          </div>
        </div>
        {renderNavBar()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '600px', margin: '24px auto 0', padding: '0 16px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Understanding Entropy
            </h2>
            <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '20px', textAlign: 'center' }}>
              Phase 4 of 10: Review
            </p>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '20px', border: `1px solid ${colors.accent}` }}>
              <p style={{ ...typo.small, color: '#e2e8f0', margin: 0 }}>
                {prediction ? (
                  <>You predicted that particles {prediction === 'c' ? 'could theoretically separate but with vanishingly small probability' : prediction === 'a' ? 'would eventually separate' : prediction === 'b' ? 'could never separate' : 'would only separate at absolute zero'}.
                  {prediction === 'c' ? ' That is exactly right!' : ' The answer is actually about probability, not impossibility.'}</>
                ) : (
                  <>As you observed in the experiment, your prediction about particle behavior connects directly to the Second Law. The observation that mixed particles never spontaneously separate demonstrates statistical irreversibility - not physical impossibility, but overwhelming probability.</>
                )}
              </p>
            </div>

            {[
              { icon: '\u{1F4CA}', title: 'What is Entropy?', color: colors.accent, points: ['A measure of disorder or randomness in a system', 'Counts the number of microscopic arrangements (microstates)', 'S = k_B \u00D7 ln(\u03A9) - Boltzmann famous formula', 'Higher entropy = more possible configurations', 'Nature spontaneously moves toward maximum entropy'] },
              { icon: '\u2696\uFE0F', title: 'The Second Law', color: colors.hot, points: ['Total entropy of an isolated system never decreases', '\u0394S_universe >= 0 (always!)', 'Processes tend toward thermodynamic equilibrium', 'Heat spontaneously flows from hot to cold', 'Gives time its arrow - distinguishes past from future'] },
              { icon: '\u{1F3B2}', title: 'Statistical Mechanics', color: colors.cold, points: ['Ordered states have few microstates (improbable)', 'Disordered states have many microstates (probable)', 'For 100 particles: approximately 10^30 arrangements', 'Probability of original order: essentially zero', 'Disorder wins by overwhelming statistics'] },
              { icon: '\u{1F525}', title: 'Heat & Temperature', color: colors.warning, points: ['\u0394S = Q/T for reversible heat transfer', 'Adding heat increases molecular motion', 'More motion = more possible arrangements', 'Heat flows to maximize total entropy', 'This is why 100% efficient heat engines are impossible'] }
            ].map((concept, i) => (
              <div key={i} style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '12px', border: `1px solid ${concept.color}33` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '24px' }}>{concept.icon}</span>
                  <h3 style={{ ...typo.h3, color: concept.color, margin: 0 }}>{concept.title}</h3>
                </div>
                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                  {concept.points.map((point, j) => (
                    <li key={j} style={{ ...typo.small, color: '#e2e8f0', marginBottom: '4px' }}>{point}</li>
                  ))}
                </ul>
              </div>
            ))}
            {renderNavDots()}
          </div>
        </div>
        {renderNavBar()}
      </div>
    );
  }

  // TWIST_PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', label: 'Yes - refrigerators violate the Second Law' },
      { id: 'b', label: 'No - they export MORE entropy to surroundings than they remove from inside', correct: true },
      { id: 'c', label: 'They only work because electricity is ordered energy' },
      { id: 'd', label: 'The Second Law does not apply to machines' }
    ];

    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '600px', margin: '24px auto 0', padding: '0 16px' }}>
            <h2 style={{ ...typo.h2, color: '#06B6D4', marginBottom: '8px', textAlign: 'center' }}>
              The Twist Challenge
            </h2>
            <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '24px', textAlign: 'center' }}>
              Phase 5 of 10: New Variable
            </p>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '20px', marginBottom: '20px', border: `1px solid rgba(255,255,255,0.1)` }}>
              <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '16px' }}>{'\u2744\uFE0F\u{1F50C}\u{1F525}'}</div>
              {renderHeatFlowSVG(420, 240)}
              <p style={{ ...typo.body, color: colors.textPrimary, textAlign: 'center', marginTop: '12px' }}>
                Your refrigerator keeps food cold (4C) while the kitchen stays warm (25C). Heat is flowing from <span style={{ color: colors.cold }}>cold</span> to <span style={{ color: colors.hot }}>hot</span>!
              </p>
              <p style={{ ...typo.body, color: '#06B6D4', textAlign: 'center', fontWeight: 600 }}>
                Does this violate the Second Law of Thermodynamics?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setTwistPrediction(opt.id)}
                  disabled={twistPrediction !== null}
                  style={{
                    background: twistPrediction === opt.id ? (opt.correct ? `${colors.success}22` : `${colors.error}22`) : colors.bgCard,
                    border: `2px solid ${twistPrediction === opt.id ? (opt.correct ? colors.success : colors.error) : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '10px', padding: '14px 16px', textAlign: 'left',
                    cursor: twistPrediction ? 'default' : 'pointer',
                  }}
                >
                  <span style={{ color: '#06B6D4', fontWeight: 700, marginRight: '8px' }}>{opt.id.toUpperCase()}.</span>
                  <span style={{ color: colors.textPrimary }}>{opt.label}</span>
                </button>
              ))}
            </div>

            {twistPrediction && (
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}`, marginBottom: '16px' }}>
                <p style={{ ...typo.body, color: colors.success, fontWeight: 600, marginBottom: '8px' }}>
                  {options.find(o => o.id === twistPrediction)?.correct ? '\u2713 Correct!' : '\u2717 Not quite!'} The key insight:
                </p>
                <p style={{ ...typo.small, color: colors.textSecondary }}>
                  Refrigerators use electrical work to pump heat uphill. The work input generates MORE entropy (waste heat dumped into your kitchen) than the entropy removed from inside. Total entropy still increases!
                </p>
              </div>
            )}
            {renderNavDots()}
          </div>
        </div>
        {renderNavBar()}
      </div>
    );
  }

  // TWIST_PLAY PHASE
  if (phase === 'twist_play') {
    const deltaS = hotTemp > coldTemp ? (1 / coldTemp - 1 / hotTemp).toFixed(5) : '0';

    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '600px', margin: '24px auto 0', padding: '0 16px' }}>
            <h2 style={{ ...typo.h2, color: '#06B6D4', marginBottom: '8px', textAlign: 'center' }}>
              Carnot Efficiency Explorer
            </h2>
            <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '16px', textAlign: 'center' }}>
              Phase 6 of 10: Heat Flow - Adjust the temperature sliders to explore efficiency limits
            </p>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '16px', marginBottom: '20px', border: `1px solid rgba(255,255,255,0.1)` }}>
              {renderHeatFlowSVG(460, 300)}
            </div>

            {/* Temperature sliders */}
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '12px', border: `1px solid ${colors.hot}30` }}>
              <label style={{ display: 'block', color: colors.hot, fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>
                Hot Reservoir Temperature: {hotTemp}K
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: colors.textMuted, fontSize: '12px' }}>300</span>
                <input
                  type="range" min="300" max="1200" value={hotTemp}
                  onChange={(e) => setHotTemp(Math.max(parseInt(e.target.value), coldTemp + 10))}
                  style={sliderStyle} aria-label="Hot Reservoir Temperature"
                />
                <span style={{ color: colors.textMuted, fontSize: '12px' }}>1200</span>
              </div>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '16px', border: `1px solid ${colors.cold}30` }}>
              <label style={{ display: 'block', color: colors.cold, fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>
                Cold Reservoir Temperature: {coldTemp}K
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: colors.textMuted, fontSize: '12px' }}>100</span>
                <input
                  type="range" min="100" max="600" value={coldTemp}
                  onChange={(e) => setColdTemp(Math.min(parseInt(e.target.value), hotTemp - 10))}
                  style={sliderStyle} aria-label="Cold Reservoir Temperature"
                />
                <span style={{ color: colors.textMuted, fontSize: '12px' }}>600</span>
              </div>
            </div>

            {/* Results */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '10px', padding: '12px', textAlign: 'center', border: `1px solid ${colors.accent}30` }}>
                <div style={{ color: colors.accent, fontWeight: 700, fontSize: '18px' }}>{carnotEfficiency.toFixed(1)}%</div>
                <div style={{ color: colors.textMuted, fontSize: '11px' }}>Max Efficiency</div>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '10px', padding: '12px', textAlign: 'center', border: `1px solid ${colors.success}30` }}>
                <div style={{ color: colors.success, fontWeight: 700, fontSize: '18px' }}>+{deltaS}</div>
                <div style={{ color: colors.textMuted, fontSize: '11px' }}>{'\u0394'}S (net)</div>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '10px', padding: '12px', textAlign: 'center', border: `1px solid ${colors.warning}30` }}>
                <div style={{ color: colors.warning, fontWeight: 700, fontSize: '18px' }}>{hotTemp - coldTemp}K</div>
                <div style={{ color: colors.textMuted, fontSize: '11px' }}>Temperature Gap</div>
              </div>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '16px', textAlign: 'center', border: `1px solid #06B6D4` }}>
              <div style={{ fontSize: '20px', fontFamily: 'serif', color: colors.textPrimary, marginBottom: '6px' }}>
                {'\u03B7'} = 1 - T_cold / T_hot
              </div>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                When you increase the hot temperature or decrease the cold temperature, the Carnot efficiency rises. Because the entropy gained by the cold side (Q/T_cold) exceeds the entropy lost by the hot side (Q/T_hot), net entropy always increases. This is why no engine can convert 100% of heat into work.
              </p>
            </div>
            {renderNavDots()}
          </div>
        </div>
        {renderNavBar()}
      </div>
    );
  }

  // TWIST_REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '600px', margin: '24px auto 0', padding: '0 16px' }}>
            <h2 style={{ ...typo.h2, color: '#06B6D4', marginBottom: '8px', textAlign: 'center' }}>
              The Deep Insight
            </h2>
            <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '20px', textAlign: 'center' }}>
              Phase 7 of 10: Deep Understanding
            </p>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '20px', border: `1px solid #06B6D4` }}>
              <h3 style={{ ...typo.h3, color: '#06B6D4', marginBottom: '16px', textAlign: 'center' }}>
                Order CAN Be Created - At a Cost!
              </h3>
              <p style={{ ...typo.body, color: '#e2e8f0', marginBottom: '16px' }}>
                The Second Law does not forbid local decreases in entropy. It just demands payment. Every ordered structure in the universe exists because something else became more disordered to pay the entropy bill.
              </p>

              {[
                { icon: '\u2744\uFE0F', title: 'Refrigerator', desc: 'Uses work to pump heat from cold to hot. Entropy dumped outside exceeds entropy removed inside.' },
                { icon: '\u{1F331}', title: 'Plant Growth', desc: 'Captures low-entropy sunlight, builds ordered structures, releases heat to environment.' },
                { icon: '\u{1F3ED}', title: 'Manufacturing', desc: 'Creates ordered products by consuming free energy and generating waste heat.' },
                { icon: '\u{1F9E0}', title: 'Thinking', desc: 'Your brain maintains order by dissipating about 20W of heat. Thoughts cost entropy!' }
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '24px' }}>{item.icon}</span>
                  <div>
                    <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>{item.title}</div>
                    <div style={{ ...typo.small, color: colors.textSecondary }}>{item.desc}</div>
                  </div>
                </div>
              ))}

              <div style={{ background: `${colors.success}15`, borderRadius: '8px', padding: '16px', marginTop: '16px', textAlign: 'center' }}>
                <p style={{ ...typo.body, color: colors.success, fontWeight: 600, margin: 0 }}>
                  {'\u0394'}S_local + {'\u0394'}S_environment {'\u2265'} 0
                </p>
                <p style={{ ...typo.small, color: '#e2e8f0', marginTop: '8px' }}>
                  The entropy bill always gets paid!
                </p>
              </div>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', textAlign: 'center', marginBottom: '16px', border: `1px solid ${colors.accent}` }}>
              <h4 style={{ ...typo.h3, color: colors.accent, marginBottom: '8px' }}>Free Energy: The Useful Metric</h4>
              <div style={{ fontSize: '24px', fontFamily: 'serif', color: colors.textPrimary, marginBottom: '8px' }}>
                G = H - T {'\u00D7'} S
              </div>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                Gibbs free energy (G) combines enthalpy (H) and entropy (S). Negative {'\u0394'}G means a process is spontaneous!
              </p>
            </div>
            {renderNavDots()}
          </div>
        </div>
        {renderNavBar()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allCompleted = completedApps.every(c => c);

    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '700px', margin: '24px auto 0', padding: '0 16px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '20px', textAlign: 'center' }}>
              App {selectedApp + 1} of 4 ({completedApps.filter(c => c).length}/4 explored)
            </p>

            {/* App selector tabs */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {realWorldApps.map((a, i) => (
                <button key={i} onClick={() => setSelectedApp(i)} style={{
                  background: selectedApp === i ? app.color : colors.bgCard,
                  color: selectedApp === i ? 'white' : colors.textSecondary,
                  border: `2px solid ${completedApps[i] ? colors.success : selectedApp === i ? app.color : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '10px', padding: '8px 14px', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px',
                }}>
                  <span>{a.icon}</span>
                  <span>{a.short}</span>
                  {completedApps[i] && <span>{'\u2713'}</span>}
                </button>
              ))}
            </div>

            {/* App content card */}
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '16px', border: `1px solid ${app.color}44` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <span style={{ fontSize: '40px' }}>{app.icon}</span>
                <div>
                  <h3 style={{ ...typo.h3, color: 'white', margin: 0 }}>{app.title}</h3>
                  <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
                </div>
              </div>

              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>{app.description}</p>

              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '14px', marginBottom: '12px' }}>
                <h4 style={{ ...typo.small, color: colors.accent, fontWeight: 700, marginBottom: '6px' }}>Connection to Entropy:</h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.connection}</p>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '14px', marginBottom: '12px' }}>
                <h4 style={{ ...typo.small, color: '#06B6D4', fontWeight: 700, marginBottom: '6px' }}>How It Works:</h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.howItWorks}</p>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                {app.stats.map((stat, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', marginBottom: '2px' }}>{stat.icon}</div>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: '15px' }}>{stat.value}</div>
                    <div style={{ color: colors.textMuted, fontSize: '11px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Examples and companies */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px' }}>
                  <h4 style={{ ...typo.small, color: colors.success, fontWeight: 700, marginBottom: '6px' }}>Examples:</h4>
                  <ul style={{ margin: 0, paddingLeft: '14px' }}>
                    {app.examples.map((ex, i) => (
                      <li key={i} style={{ ...typo.small, color: colors.textMuted, marginBottom: '2px', fontSize: '12px' }}>{ex}</li>
                    ))}
                  </ul>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px' }}>
                  <h4 style={{ ...typo.small, color: colors.warning, fontWeight: 700, marginBottom: '6px' }}>Key Companies:</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {app.companies.map((company, i) => (
                      <span key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '3px 7px', borderRadius: '4px', fontSize: '12px', color: colors.textSecondary }}>{company}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ background: `${app.color}15`, borderRadius: '8px', padding: '14px', marginBottom: '12px' }}>
                <h4 style={{ ...typo.small, color: app.color, fontWeight: 700, marginBottom: '6px' }}>Future Impact:</h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.futureImpact}</p>
              </div>

              {/* Got It button */}
              {!completedApps[selectedApp] ? (
                <button
                  onClick={() => {
                    const newCompleted = [...completedApps];
                    newCompleted[selectedApp] = true;
                    setCompletedApps(newCompleted);
                  }}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
                    background: `linear-gradient(135deg, ${colors.success}, #059669)`,
                    color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '15px',
                  }}
                >
                  Got It - Next Application
                </button>
              ) : (
                <div style={{ textAlign: 'center', color: colors.success, fontWeight: 600, padding: '10px' }}>
                  {'\u2713'} Completed
                </div>
              )}
            </div>

            {allCompleted && (
              <button
                onClick={nextPhase}
                style={{
                  width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
                  background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentDark})`,
                  color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '16px', marginBottom: '16px',
                }}
              >
                Take the Test
              </button>
            )}
            {renderNavDots()}
          </div>
        </div>
        {renderNavBar()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    // RESULTS
    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
            <div style={{ maxWidth: '600px', margin: '24px auto 0', padding: '0 16px' }}>
              <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
                Test Complete!
              </h2>

              <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '32px', textAlign: 'center', marginBottom: '24px', border: `1px solid ${testScore >= 7 ? colors.success : colors.warning}` }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                  {testScore >= 9 ? '\u{1F3C6}' : testScore >= 7 ? '\u{1F389}' : testScore >= 5 ? '\u{1F4DA}' : '\u{1F4AA}'}
                </div>
                <h3 style={{ ...typo.h2, color: testScore >= 7 ? colors.success : colors.warning, marginBottom: '8px' }}>
                  You scored {testScore}/10
                </h3>
                <p style={{ ...typo.body, color: colors.textSecondary }}>
                  {testScore >= 9 ? 'Outstanding! You truly understand entropy!' :
                   testScore >= 7 ? 'Great job! You have solid understanding!' :
                   testScore >= 5 ? 'Good effort! Review the concepts and try again.' :
                   'Keep learning! Entropy takes time to master.'}
                </p>
              </div>

              {/* Answer review */}
              <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '24px' }}>
                {testQuestions.map((q, i) => {
                  const correctIdx = q.options.findIndex(o => o.correct);
                  const isCorrect = testAnswers[i] === correctIdx;
                  return (
                    <div key={i} style={{ background: colors.bgCard, borderRadius: '10px', padding: '14px', marginBottom: '10px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                      <p style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600, marginBottom: '6px' }}>
                        {isCorrect ? '\u2713' : '\u2717'} {i + 1}. {q.question}
                      </p>
                      {!isCorrect && (
                        <p style={{ ...typo.small, color: colors.success, marginBottom: '4px' }}>
                          Correct: {q.options[correctIdx].text}
                        </p>
                      )}
                      <p style={{ ...typo.small, color: colors.textMuted, fontStyle: 'italic' }}>{q.explanation}</p>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                {testScore >= 7 ? (
                  <button onClick={nextPhase} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: 'none', background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentDark})`, color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                    Claim Your Mastery Badge!
                  </button>
                ) : (
                  <button onClick={() => { setTestSubmitted(false); setTestAnswers(Array(10).fill(null)); setCurrentQuestion(0); setAnswerConfirmed(false); goToPhase('review'); }} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: 'none', background: `linear-gradient(135deg, ${colors.warning}, ${colors.error})`, color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                    Review & Try Again
                  </button>
                )}
                <button onClick={() => goToPhase('hook')} style={{ padding: '14px 20px', borderRadius: '10px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: colors.textSecondary, cursor: 'pointer' }}>
                  Return to Dashboard
                </button>
              </div>
              {renderNavDots()}
            </div>
          </div>
          {renderNavBar()}
        </div>
      );
    }

    // ACTIVE QUIZ
    const currentQ = testQuestions[currentQuestion];
    const correctIdx = currentQ.options.findIndex(o => o.correct);

    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '600px', margin: '24px auto 0', padding: '0 16px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Knowledge Assessment
            </h2>
            <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '16px', textAlign: 'center' }}>
              Question {currentQuestion + 1} of 10
            </p>

            {/* Question progress dots */}
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '20px' }}>
              {testQuestions.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: currentQuestion === i ? '20px' : '10px',
                    height: '10px',
                    borderRadius: '5px',
                    background: testAnswers[i] !== null ? colors.success : currentQuestion === i ? colors.accent : 'rgba(255,255,255,0.15)',
                    transition: 'all 0.2s ease',
                  }}
                />
              ))}
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '20px', marginBottom: '16px', border: `1px solid rgba(255,255,255,0.1)` }}>
              {/* Scenario */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
                <p style={{ ...typo.small, color: colors.accent, fontStyle: 'italic', margin: 0 }}>
                  {currentQ.scenario}
                </p>
              </div>

              {/* Question */}
              <p style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600, marginBottom: '14px' }}>
                {currentQ.question}
              </p>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentQ.options.map((opt, optIdx) => {
                  const isSelected = testAnswers[currentQuestion] === optIdx;
                  const isCorrectOpt = opt.correct === true;

                  let bg = colors.bgCard;
                  let borderColor = 'rgba(255,255,255,0.1)';
                  if (answerConfirmed) {
                    if (isCorrectOpt) { bg = `${colors.success}22`; borderColor = colors.success; }
                    else if (isSelected && !isCorrectOpt) { bg = `${colors.error}22`; borderColor = colors.error; }
                  } else if (isSelected) {
                    bg = `${colors.accent}22`; borderColor = colors.accent;
                  }

                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        if (!answerConfirmed) {
                          const newAnswers = [...testAnswers];
                          newAnswers[currentQuestion] = optIdx;
                          setTestAnswers(newAnswers);
                        }
                      }}
                      style={{
                        background: bg,
                        border: `2px solid ${borderColor}`,
                        borderRadius: '10px', padding: '12px 14px', textAlign: 'left',
                        cursor: answerConfirmed ? 'default' : 'pointer',
                        opacity: answerConfirmed && !isCorrectOpt && !isSelected ? 0.5 : 1,
                      }}
                    >
                      <span style={{ ...typo.small, color: colors.textPrimary }}>{opt.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Feedback after confirming */}
              {answerConfirmed && (
                <div style={{
                  background: testAnswers[currentQuestion] === correctIdx ? `${colors.success}15` : `${colors.error}15`,
                  padding: '14px', borderRadius: '10px', marginTop: '12px',
                  border: `1px solid ${testAnswers[currentQuestion] === correctIdx ? colors.success : colors.error}`,
                }}>
                  <p style={{ ...typo.small, color: testAnswers[currentQuestion] === correctIdx ? colors.success : colors.error, fontWeight: 700, marginBottom: '6px' }}>
                    {testAnswers[currentQuestion] === correctIdx ? '\u2713 Correct!' : `\u2717 The correct answer is ${currentQ.options[correctIdx].text.split(')')[0]})`}
                  </p>
                  <p style={{ ...typo.small, color: colors.textSecondary }}>{currentQ.explanation}</p>
                </div>
              )}
            </div>

            {/* Confirm / Next / Submit */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              {!answerConfirmed ? (
                <button
                  onClick={confirmAnswer}
                  disabled={testAnswers[currentQuestion] === null}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '10px', border: 'none',
                    background: testAnswers[currentQuestion] !== null ? colors.accent : 'rgba(255,255,255,0.1)',
                    color: 'white', fontWeight: 600,
                    cursor: testAnswers[currentQuestion] !== null ? 'pointer' : 'not-allowed',
                    opacity: testAnswers[currentQuestion] !== null ? 1 : 0.5,
                  }}
                >
                  Confirm Answer
                </button>
              ) : currentQuestion < 9 ? (
                <button
                  onClick={handleNextQuestion}
                  style={{ flex: 1, padding: '14px', borderRadius: '10px', border: 'none', background: colors.accent, color: 'white', fontWeight: 600, cursor: 'pointer' }}
                >
                  Next Question
                </button>
              ) : (
                <button
                  onClick={handleSubmitTest}
                  style={{ flex: 1, padding: '14px', borderRadius: '10px', border: 'none', background: colors.success, color: 'white', fontWeight: 600, cursor: 'pointer' }}
                >
                  Submit Test
                </button>
              )}
            </div>
            {renderNavDots()}
          </div>
        </div>
        {renderNavBar()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '500px', margin: '24px auto 0', textAlign: 'center', padding: '0 16px' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>{'\u{1F3B2}\u{1F3C6}'}</div>
            <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
              Entropy Master!
            </h1>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
              Congratulations! You have mastered the Second Law of Thermodynamics and understand why disorder always wins. You scored {testScore}/10 on the knowledge assessment.
            </p>

            <div style={{ background: colors.bgCard, padding: '24px', borderRadius: '16px', marginBottom: '24px', border: `1px solid ${colors.success}30` }}>
              <p style={{ ...typo.h1, color: colors.success }}>{testScore} / 10</p>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                You have demonstrated mastery of entropy, the Second Law, Carnot efficiency, and the arrow of time!
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
              {[
                { icon: '\u{1F4CA}', label: 'Microstates' },
                { icon: '\u2696\uFE0F', label: 'Second Law' },
                { icon: '\u23F0', label: 'Arrow of Time' },
                { icon: '\u{1F525}', label: 'Free Energy' }
              ].map((badge, i) => (
                <div key={i} style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.accent}44` }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>{badge.icon}</div>
                  <div style={{ ...typo.small, color: colors.textSecondary }}>{badge.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered</h3>
              <ul style={{ color: colors.textSecondary, lineHeight: '2.2', paddingLeft: '16px' }}>
                <li><strong style={{ color: colors.textPrimary }}>Boltzmann Entropy:</strong> S = k_B {'\u00D7'} ln({'\u03A9'})</li>
                <li><strong style={{ color: colors.textPrimary }}>Second Law:</strong> {'\u0394'}S_universe {'\u2265'} 0</li>
                <li><strong style={{ color: colors.textPrimary }}>Carnot Efficiency:</strong> {'\u03B7'} = 1 - T_cold/T_hot</li>
                <li><strong style={{ color: colors.textPrimary }}>Free Energy:</strong> G = H - T {'\u00D7'} S</li>
                <li><strong style={{ color: colors.textPrimary }}>Arrow of Time:</strong> Entropy gives time its direction</li>
              </ul>
            </div>

            <button onClick={() => goToPhase('hook')} style={{ padding: '14px 28px', borderRadius: '12px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: colors.textSecondary, cursor: 'pointer', fontWeight: 600 }}>
              Explore Again
            </button>
            {renderNavDots()}
          </div>
        </div>
        {renderNavBar()}
      </div>
    );
  }

  return null;
};

export default EntropyRenderer;
