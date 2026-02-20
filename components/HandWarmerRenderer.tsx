'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ─────────────────────────────────────────────────────────────────────────────
// Hand Warmer Physics - Complete 10-Phase Game
// Exothermic reactions: Iron oxidation and sodium acetate crystallization
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

interface HandWarmerRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound utility
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

// Crystallization sound effect
const playCrystallizeSound = () => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const bufferSize = audioContext.sampleRate * 0.3;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 0.5) * 0.3;
    }
    const noise = audioContext.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 2;
    noise.connect(filter);
    filter.connect(audioContext.destination);
    noise.start();
  } catch { /* Audio not available */ }
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ─────────────────────────────────────────────────────────────────────────────
const testQuestions = [
  {
    scenario: "You're at a winter sports event and pull out a reusable hand warmer. It's a clear liquid pouch at room temperature (20C). You click the metal disc inside, and within seconds the liquid turns solid and heats up to 54C.",
    question: "What is the source of the heat energy released?",
    options: [
      { id: 'a', label: "A tiny battery hidden inside the pouch" },
      { id: 'b', label: "Chemical reaction that consumes the liquid permanently" },
      { id: 'c', label: "Latent heat released when the supercooled liquid crystallizes", correct: true },
      { id: 'd', label: "Friction energy from flexing the metal disc" }
    ],
    explanation: "Sodium acetate releases 264 kJ/kg of latent heat during crystallization. The liquid was 'supercooled' - held below its freezing point without solidifying. The metal disc creates a nucleation site that triggers rapid crystallization."
  },
  {
    scenario: "A scientist stores sodium acetate solution at room temperature (20C) even though its melting point is 54C. This means the liquid is 34C below where it should freeze, yet it remains liquid.",
    question: "What allows sodium acetate to exist as a liquid below its freezing point?",
    options: [
      { id: 'a', label: "The container's pressure keeps it liquid" },
      { id: 'b', label: "Without nucleation sites, crystals cannot form (supercooling)", correct: true },
      { id: 'c', label: "Special additives prevent freezing" },
      { id: 'd', label: "The solution has no true freezing point" }
    ],
    explanation: "Supercooling occurs when a liquid is cooled below its freezing point without crystallizing. The liquid needs a 'seed' - a nucleation site - to start the crystallization process. The metal disc provides this trigger."
  },
  {
    scenario: "You compare two hand warmers: a disposable iron-based warmer and a reusable sodium acetate warmer. The disposable one stays warm for 8 hours, while the reusable one only lasts 45 minutes.",
    question: "Why does the chemical (iron) warmer last so much longer?",
    options: [
      { id: 'a', label: "Iron warmers store more energy per gram" },
      { id: 'b', label: "The oxidation reaction proceeds slowly and steadily over hours", correct: true },
      { id: 'c', label: "Sodium acetate warmers waste energy through radiation" },
      { id: 'd', label: "Iron warmers are always larger in size" }
    ],
    explanation: "Iron oxidation (4Fe + 3O2 -> 2Fe2O3) is a slow, sustained reaction controlled by oxygen diffusion through the porous warmer. Phase change warmers release their latent heat quickly during the rapid crystallization event."
  },
  {
    scenario: "When manufacturing disposable hand warmers, engineers add salt (NaCl) to the iron powder mixture even though salt doesn't produce heat itself.",
    question: "What role does salt play in iron oxidation warmers?",
    options: [
      { id: 'a', label: "Salt provides additional heat energy" },
      { id: 'b', label: "Salt acts as a catalyst, speeding up the oxidation reaction", correct: true },
      { id: 'c', label: "Salt absorbs moisture to prevent corrosion" },
      { id: 'd', label: "Salt is just filler to reduce costs" }
    ],
    explanation: "Salt acts as a catalyst and electrolyte, creating an electrochemical cell that dramatically accelerates iron oxidation. The salt is not consumed - it facilitates electron transfer between iron and oxygen, making the reaction fast enough to produce useful heat."
  },
  {
    scenario: "After using a reusable hand warmer, you want to reset it. The instructions say to boil it in water for 10 minutes, then let it cool slowly.",
    question: "Why does boiling reset the hand warmer?",
    options: [
      { id: 'a', label: "Boiling adds new energy that can be released later" },
      { id: 'b', label: "Heat dissolves the crystals back into liquid solution", correct: true },
      { id: 'c', label: "Boiling kills bacteria that would prevent crystallization" },
      { id: 'd', label: "Steam pressure reshapes the metal disc" }
    ],
    explanation: "Boiling (100C) is well above the melting point (54C), so the solid sodium acetate dissolves back into liquid. Cooling slowly without disturbance allows the liquid to supercool below its freezing point without crystallizing, storing the latent heat for later release."
  },
  {
    scenario: "During the crystallization of a sodium acetate hand warmer, you notice that once it starts at the metal disc, the crystal formation spreads extremely rapidly throughout the entire pouch.",
    question: "What causes this rapid chain-reaction crystallization?",
    options: [
      { id: 'a', label: "The metal disc heats up and melts nearby solution" },
      { id: 'b', label: "Each new crystal becomes a nucleation site for neighbors", correct: true },
      { id: 'c', label: "Air bubbles spread through the liquid" },
      { id: 'd', label: "Pressure waves from the disc click propagate outward" }
    ],
    explanation: "Crystallization is autocatalytic - each newly formed crystal provides nucleation sites for neighboring supercooled liquid. This creates a rapid chain reaction where the crystallization front spreads at several centimeters per second through the pouch."
  },
  {
    scenario: "A chemical engineer is designing a new hand warmer and needs to calculate how much heat a 100g sodium acetate warmer will release. The latent heat of fusion is 264 kJ/kg.",
    question: "How much heat energy will be released during complete crystallization?",
    options: [
      { id: 'a', label: "264 kJ" },
      { id: 'b', label: "26.4 kJ", correct: true },
      { id: 'c', label: "2.64 kJ" },
      { id: 'd', label: "2640 kJ" }
    ],
    explanation: "Energy = mass x latent heat = 0.1 kg x 264 kJ/kg = 26.4 kJ. This is enough energy to heat 100g of water by about 63C, or keep your hands warm for 30-60 minutes through gradual heat loss to the environment."
  },
  {
    scenario: "An emergency responder is treating a hypothermia victim and has both types of hand warmers available: disposable iron-based and reusable sodium acetate warmers.",
    question: "Which type would be better for rapid initial warming, and why?",
    options: [
      { id: 'a', label: "Iron warmer - it gets hotter overall" },
      { id: 'b', label: "Either type - they produce the same heat" },
      { id: 'c', label: "Sodium acetate - it releases heat faster during crystallization", correct: true },
      { id: 'd', label: "Iron warmer - it lasts longer" }
    ],
    explanation: "Phase change warmers release their heat rapidly during crystallization (minutes), providing quick warming. Iron warmers release heat slowly over hours. For emergency hypothermia treatment, rapid heat delivery is critical, making sodium acetate warmers better for initial warming."
  },
  {
    scenario: "When storing disposable iron hand warmers, the packages are vacuum-sealed or stored in airtight containers. Once opened, they begin warming immediately.",
    question: "Why must iron warmers be kept sealed until use?",
    options: [
      { id: 'a', label: "To prevent moisture from rusting the iron" },
      { id: 'b', label: "To keep oxygen away, which would start the exothermic reaction", correct: true },
      { id: 'c', label: "To maintain sterility of the contents" },
      { id: 'd', label: "To prevent the salt catalyst from absorbing humidity" }
    ],
    explanation: "Iron oxidation requires oxygen: 4Fe + 3O2 -> 2Fe2O3 + heat. Without oxygen, no reaction occurs. The sealed package creates an oxygen-free environment until the user is ready. Opening exposes the iron to air, starting the heat-producing oxidation."
  },
  {
    scenario: "A materials scientist is comparing the temperature profiles of both warmer types. The sodium acetate warmer jumps quickly to 54C then slowly cools, while the iron warmer gradually rises to 50C and maintains that temperature for hours.",
    question: "What fundamental principle explains why the sodium acetate warmer stays at exactly 54C during crystallization?",
    options: [
      { id: 'a', label: "The chemical bonds limit maximum temperature" },
      { id: 'b', label: "Temperature stays constant during phase change (latent heat)", correct: true },
      { id: 'c', label: "The plastic pouch acts as a thermostat" },
      { id: 'd', label: "Heat loss to the environment matches heat production" }
    ],
    explanation: "During phase change, temperature remains constant as energy goes into changing the state rather than changing temperature. The latent heat is released at the melting/freezing point (54C for sodium acetate) until all material has crystallized, then cooling begins."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🏕️',
    title: 'Outdoor Recreation & Survival',
    short: 'Portable heat for wilderness adventures',
    tagline: 'From ski slopes to emergency kits',
    description: 'Hand warmer technology powers portable heating solutions for outdoor enthusiasts. Iron oxidation warmers provide 8-12 hours of steady heat for hunters, hikers, and winter sports. Reusable crystallization warmers offer quick emergency heat in survival situations.',
    connection: 'The iron oxidation reaction (4Fe + 3O2 -> Fe2O3 + heat) you explored provides the sustained, steady warmth needed for all-day outdoor activities. Phase change warmers offer rapid heating for emergencies.',
    howItWorks: 'Disposable warmers use porous pouches that control oxygen diffusion rate, regulating heat output. Salt catalysts and activated carbon optimize reaction kinetics. Reusable warmers are reset by boiling, allowing hundreds of uses.',
    stats: [
      { value: '$450M', label: 'US market size', icon: '💰' },
      { value: '100%', label: 'Reusable resets', icon: '♻️' },
      { value: '30W', label: 'Heat output', icon: '⚡' }
    ],
    examples: ['Toe warmers for skiing', 'Hand warmers for ice fishing', 'Body warmers for hunting', 'Emergency survival kits'],
    companies: ['HotHands', 'Grabber', 'Zippo', 'Heat Factory'],
    futureImpact: 'Next-generation warmers incorporate graphene for faster heat distribution and bio-based iron sources for sustainability.',
    color: '#22c55e'
  },
  {
    icon: '🏥',
    title: 'Medical Heat Therapy',
    short: 'Therapeutic warmth for healing',
    tagline: 'Controlled heat for pain relief',
    description: 'Medical applications use the precise temperature control of phase change materials for therapeutic heat therapy. Sodium acetate warmers provide safe, consistent 54C heat ideal for muscle pain relief, while iron warmers offer extended low-level heat for chronic conditions.',
    connection: 'The constant temperature during phase change that you observed is critical for medical use. Unlike heating pads that can overheat, phase change warmers naturally regulate at their melting point, preventing burns while delivering consistent therapy.',
    howItWorks: 'Medical warmers use the same chemistry with enhanced safety features. Air-activated wraps provide sustained heat for chronic pain. Instant crystallization packs deliver rapid warming for acute injuries or post-surgical warming.',
    stats: [
      { value: '$3.2B', label: 'Heat therapy market', icon: '📊' },
      { value: '40C', label: 'Therapeutic temp', icon: '🌡️' },
      { value: '25%', label: 'Pain reduction', icon: '📉' }
    ],
    examples: ['ThermaCare wraps', 'Post-surgical warming', 'Menstrual pain relief', 'Physical therapy'],
    companies: ['ThermaCare', 'Sunbeam', 'Carex Health', 'Medela'],
    futureImpact: 'Smart warmers with embedded temperature sensors provide precise feedback for optimal therapeutic effect.',
    color: '#3b82f6'
  },
  {
    icon: '🍱',
    title: 'Self-Heating Food Packaging',
    short: 'Hot meals anywhere',
    tagline: 'No microwave needed',
    description: 'Self-heating food containers use exothermic reactions to warm meals without external power. Military MREs, emergency rations, and consumer convenience products use calcium oxide-water reactions or iron oxidation to heat food to serving temperature.',
    connection: 'The exothermic chemistry you explored directly applies to food warming. Understanding reaction rates helps engineers design systems that heat food to 70C in 15 minutes without overcooking or creating hot spots.',
    howItWorks: 'A separate heating chamber contains reactants (often CaO + H2O or iron oxidation systems). Activating the heater starts the reaction, transferring heat through the container wall to warm the food compartment. Insulation maintains temperature.',
    stats: [
      { value: '$890M', label: 'Self-heating market', icon: '📈' },
      { value: '15 min', label: 'Heating time', icon: '⏰' },
      { value: '70C', label: 'Serving temp', icon: '🔥' }
    ],
    examples: ['Military MRE heaters', 'Self-heating coffee', 'Emergency food kits', 'Baby bottle warmers'],
    companies: ['Heatgen', 'HotCan', 'Luxfer Magtech', 'Crown Holdings'],
    futureImpact: 'Biodegradable heating elements and improved insulation are making self-heating food more sustainable and practical for everyday use.',
    color: '#f97316'
  },
  {
    icon: '🔋',
    title: 'Battery Thermal Management',
    short: 'Optimal temperature for batteries',
    tagline: 'Cold weather EV range extension',
    description: 'Electric vehicle batteries lose 40% of their range in extreme cold. Phase change materials and exothermic warmers keep battery packs at optimal operating temperature (20-40C), ensuring reliable performance and extended lifespan in all weather conditions.',
    connection: 'Phase change materials absorb excess heat during charging (melting) and release it when cold (crystallizing), buffering temperature swings. This is the same latent heat storage principle you explored with sodium acetate.',
    howItWorks: 'Battery thermal management systems embed phase change materials around cells to absorb heat spikes and release warmth in cold. Some systems use resistive or exothermic heating for pre-conditioning in extreme cold before driving.',
    stats: [
      { value: '40%', label: 'Cold weather range loss', icon: '📉' },
      { value: '20-40C', label: 'Optimal Li-ion temp', icon: '🌡️' },
      { value: '$8.5B', label: '2028 market size', icon: '💵' }
    ],
    examples: ['Tesla battery conditioning', 'Drone cold weather ops', 'Grid storage thermal', 'Phone thermal management'],
    companies: ['Tesla', 'LG Energy Solution', 'CATL', 'Panasonic'],
    futureImpact: 'Advanced phase change composites with tunable melting points will enable precise thermal management for next-generation solid-state batteries.',
    color: '#8b5cf6'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const HandWarmerRenderer: React.FC<HandWarmerRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Phase change warmer simulation
  const [warmerState, setWarmerState] = useState<'liquid' | 'crystallizing' | 'solid'>('liquid');
  const [temperature, setTemperature] = useState(20);
  const [crystalProgress, setCrystalProgress] = useState(0);
  const [crystalPoints, setCrystalPoints] = useState<{ x: number; y: number; size: number }[]>([]);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [discClicked, setDiscClicked] = useState(false);

  // Chemical warmer simulation
  const [ironPowder, setIronPowder] = useState(50);
  const [saltConcentration, setSaltConcentration] = useState(50);
  const [oxygenAvailability, setOxygenAvailability] = useState(50);
  const [chemicalTemp, setChemicalTemp] = useState(20);
  const [reactionProgress, setReactionProgress] = useState(0);
  const [isReacting, setIsReacting] = useState(false);

  // Twist phase state
  const [warmerType, setWarmerType] = useState<'phase' | 'chemical'>('phase');
  const [twistTemperature, setTwistTemperature] = useState(20);
  const [twistState, setTwistState] = useState<'inactive' | 'active' | 'depleted'>('inactive');
  const [energyRemaining, setEnergyRemaining] = useState(100);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Navigation ref
  const isNavigating = useRef(false);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => (f + 1) % 360);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Crystallization animation
  useEffect(() => {
    if (warmerState !== 'crystallizing') return;
    const interval = setInterval(() => {
      setCrystalProgress(p => {
        if (p >= 100) {
          setWarmerState('solid');
          return 100;
        }
        return p + 2;
      });
      if (crystalProgress < 100) {
        setCrystalPoints(prev => [
          ...prev,
          { x: 100 + Math.random() * 200, y: 80 + Math.random() * 100, size: 2 + Math.random() * 6 }
        ]);
      }
      setTemperature(t => Math.min(54, t + 1.5));
    }, 100);
    return () => clearInterval(interval);
  }, [warmerState, crystalProgress]);

  // Chemical reaction simulation
  useEffect(() => {
    if (!isReacting || reactionProgress >= 100) return;
    const interval = setInterval(() => {
      const ironFactor = ironPowder / 100;
      const saltFactor = 0.5 + saltConcentration / 200;
      const oxygenFactor = oxygenAvailability / 100;
      const reactionRate = ironFactor * saltFactor * oxygenFactor * 2;
      setReactionProgress(p => {
        const newProgress = Math.min(100, p + reactionRate);
        if (newProgress >= 100) setIsReacting(false);
        return newProgress;
      });
      const maxTemp = 20 + 35 * ironFactor * oxygenFactor;
      setChemicalTemp(t => {
        const target = 20 + (maxTemp - 20) * (reactionProgress / 100);
        return t + (target - t) * 0.1;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isReacting, reactionProgress, ironPowder, saltConcentration, oxygenAvailability]);

  // Twist simulation
  useEffect(() => {
    if (twistState !== 'active') return;
    const interval = setInterval(() => {
      if (warmerType === 'chemical') {
        setTwistTemperature(t => {
          if (energyRemaining > 80) return Math.min(50, t + 1);
          if (energyRemaining > 20) return Math.max(35, Math.min(50, t));
          return Math.max(20, t - 0.5);
        });
        setEnergyRemaining(e => {
          const newE = e - 0.3;
          if (newE <= 0) { setTwistState('depleted'); return 0; }
          return newE;
        });
      } else {
        setTwistTemperature(t => {
          if (energyRemaining > 10) return Math.min(54, t + 2);
          return Math.max(20, t - 0.5);
        });
        setEnergyRemaining(e => {
          const newE = e - 0.8;
          if (newE <= 0) { setTwistState('depleted'); return 0; }
          return newE;
        });
      }
    }, 100);
    return () => clearInterval(interval);
  }, [twistState, warmerType, energyRemaining]);

  // Cooling after crystallization
  useEffect(() => {
    if (warmerState !== 'solid' || temperature <= 25) return;
    const interval = setInterval(() => {
      setTemperature(t => Math.max(25, t - 0.3));
    }, 200);
    return () => clearInterval(interval);
  }, [warmerState, temperature]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F97316', // Orange
    accentGlow: 'rgba(249, 115, 22, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Review',
    twist_predict: 'Explore Variable',
    twist_play: 'Explore Experiment',
    twist_review: 'Explore Review',
    transfer: 'Transfer Apply',
    test: 'Quiz Test',
    mastery: 'Mastery'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'hand-warmer',
        gameTitle: 'Hand Warmer Physics',
        details: { phase: p },
        timestamp: Date.now()
      });
    }
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Helper functions
  const getTempColor = (temp: number): string => {
    if (temp < 25) return '#3b82f6';
    if (temp < 35) return '#22c55e';
    if (temp < 45) return '#eab308';
    if (temp < 52) return '#f97316';
    return '#ef4444';
  };

  const activateWarmer = () => {
    if (warmerState !== 'liquid') return;
    setDiscClicked(true);
    playCrystallizeSound();
    setTimeout(() => setWarmerState('crystallizing'), 300);
  };

  const resetWarmer = () => {
    setWarmerState('liquid');
    setTemperature(20);
    setCrystalProgress(0);
    setCrystalPoints([]);
    setDiscClicked(false);
    playSound('click');
  };

  const startChemicalReaction = () => {
    if (isReacting) return;
    setIsReacting(true);
    setReactionProgress(0);
    setChemicalTemp(20);
    playSound('click');
  };

  const resetChemicalWarmer = () => {
    setIsReacting(false);
    setReactionProgress(0);
    setChemicalTemp(20);
    playSound('click');
  };

  const resetTwist = () => {
    setTwistState('inactive');
    setTwistTemperature(20);
    setEnergyRemaining(100);
  };

  // Navigation bar component - fixed position at top with z-index
  const renderNavBar = () => (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      background: colors.bgPrimary,
      borderBottom: `1px solid ${colors.border}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    }}>
      {/* Progress bar */}
      <div style={{
        height: '4px',
        background: colors.bgSecondary,
      }}>
        <div style={{
          height: '100%',
          width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
          background: `linear-gradient(90deg, ${colors.accent}, ${colors.warning})`,
          transition: 'width 0.3s ease',
        }} />
      </div>
      {/* Phase info */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 16px',
      }}>
        <span style={{ ...typo.small, color: '#e2e8f0' }}>
          {phaseLabels[phase]}
        </span>
        <span style={{ ...typo.small, color: '#e2e8f0' }}>
          Phase {phaseOrder.indexOf(phase) + 1} of {phaseOrder.length}
        </span>
      </div>
    </nav>
  );

  // Navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px 0',
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            width: phase === p ? '32px' : '12px',
            minHeight: '44px',
            borderRadius: '6px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0',
          }}
          aria-label={phaseLabels[p]}
        >
          <span style={{
            display: 'block',
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            transition: 'all 0.3s ease',
          }} />
        </button>
      ))}
    </div>
  );

  // Bottom navigation bar with Back and Next buttons
  const renderBottomNav = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const canGoBack = currentIndex > 0;
    const canGoNext = currentIndex < phaseOrder.length - 1;

    return (
      <div style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: colors.bgPrimary,
        borderTop: `1px solid ${colors.border}`,
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <button
          onClick={() => canGoBack && goToPhase(phaseOrder[currentIndex - 1])}
          disabled={!canGoBack}
          style={{
            padding: '12px 24px',
            borderRadius: '10px',
            border: `1px solid ${colors.border}`,
            background: 'transparent',
            color: canGoBack ? 'rgba(148, 163, 184, 0.7)' : 'rgba(107, 114, 128, 0.5)',
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            fontWeight: 600,
            minHeight: '44px',
            opacity: canGoBack ? 1 : 0.5,
          }}
        >
          Back
        </button>
        {renderNavDots()}
        <button
          onClick={() => canGoNext && goToPhase(phaseOrder[currentIndex + 1])}
          disabled={!canGoNext}
          style={{
            padding: '12px 24px',
            borderRadius: '10px',
            border: 'none',
            background: canGoNext ? colors.accent : colors.border,
            color: 'white',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            fontWeight: 600,
            minHeight: '44px',
            opacity: canGoNext ? 1 : 0.5,
          }}
        >
          Next
        </button>
      </div>
    );
  };

  // Primary button style - with minHeight 44px for touch targets
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #ea580c)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
    minHeight: '44px',
  };

  // Slider component
  const renderSlider = (label: string, value: number, setValue: (v: number) => void, min: number, max: number, unit: string, color: string) => (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)' }}>{label}</span>
        <span style={{ ...typo.small, color, fontWeight: 600 }}>{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(parseInt(e.target.value))}
        style={{
          width: '100%',
          height: '20px',
          borderRadius: '4px',
          cursor: 'pointer',
          appearance: 'none',
          WebkitAppearance: 'none',
          accentColor: '#3b82f6',
          touchAction: 'pan-y',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
        <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{min}{unit}</span>
        <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{max}{unit}</span>
      </div>
    </div>
  );

  // Hand Warmer SVG Visualization - shows temperature vs time chart and warmer state
  const WarmerVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 300 : 360;
    const isLiquid = warmerState === 'liquid';
    const isCrystallizing = warmerState === 'crystallizing';
    const isSolid = warmerState === 'solid';
    // Mass affects energy released (latent heat = mass * 264 kJ/kg)
    const massKg = ironPowder / 1000;
    const energyKJ = (massKg * 264).toFixed(2);
    // Salt affects max temperature
    const maxTempDisplay = Math.round(20 + (saltConcentration / 100) * 34);
    // Chart area dimensions
    const chartX = 70;
    const chartY = 30;
    const chartW = width - 95;
    const chartH = height - 120;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px', display: 'block' }}>
        <defs>
          <radialGradient id="liquidGrad" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.8" />
          </radialGradient>
          <radialGradient id="crystalGrad" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.75" />
          </radialGradient>
          <radialGradient id="solidGrad" cx="45%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#64748b" stopOpacity="0.75" />
          </radialGradient>
          <linearGradient id="heatWaveGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fef3c7" stopOpacity="0" />
          </linearGradient>
          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Chart background */}
        <rect x={chartX} y={chartY} width={chartW} height={chartH} fill={colors.bgSecondary} rx="4" />

        {/* Grid layer */}
        <g opacity="0.4">
          {[0, 1, 2, 3, 4].map(i => {
            const y = chartY + chartH - (i / 4) * chartH;
            return <line key={`hg${i}`} x1={chartX} y1={y} x2={chartX + chartW} y2={y} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />;
          })}
          {[0, 1, 2, 3].map(i => {
            const x = chartX + (i / 3) * chartW;
            return <line key={`vg${i}`} x1={x} y1={chartY} x2={x} y2={chartY + chartH} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />;
          })}
        </g>

        {/* Axes layer */}
        <g>
          <line x1={chartX} y1={chartY} x2={chartX} y2={chartY + chartH} stroke="#94a3b8" strokeWidth="1.5" />
          <line x1={chartX} y1={chartY + chartH} x2={chartX + chartW} y2={chartY + chartH} stroke="#94a3b8" strokeWidth="1.5" />
        </g>

        {/* Axis labels */}
        <text x="10" y={chartY + chartH / 2} textAnchor="middle" fill="#94a3b8" fontSize="11" transform={`rotate(-90, 10, ${chartY + chartH / 2})`}>Temp (°C)</text>
        <text x={chartX + chartW / 2} y={height - 8} textAnchor="middle" fill="#94a3b8" fontSize="11">Time</text>

        {/* Y axis tick labels */}
        <g>
          <text x={chartX - 5} y={chartY + 11} textAnchor="end" fill="#94a3b8" fontSize="11">{maxTempDisplay}C</text>
          <text x={chartX - 5} y={chartY + chartH / 2 + 4} textAnchor="end" fill="#94a3b8" fontSize="11">{Math.round((20 + maxTempDisplay) / 2)}C</text>
          <text x={chartX - 5} y={chartY + chartH} textAnchor="end" fill="#94a3b8" fontSize="11">20C</text>
        </g>

        {/* Temperature curve based on state */}
        {isLiquid && (
          <polyline
            points={`${chartX},${chartY + chartH - (0 / (maxTempDisplay - 20)) * chartH} ${chartX + chartW * 0.3},${chartY + chartH - (0 / (maxTempDisplay - 20)) * chartH}`}
            fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round"
          />
        )}
        {isCrystallizing && (
          <polyline
            points={`${chartX},${chartY + chartH} ${chartX + chartW * 0.2},${chartY + chartH} ${chartX + chartW * 0.3},${chartY + chartH - ((maxTempDisplay - 20) / (maxTempDisplay - 20)) * chartH} ${chartX + chartW * 0.6},${chartY + chartH - ((maxTempDisplay - 20) / (maxTempDisplay - 20)) * chartH} ${chartX + chartW * 0.7},${chartY + chartH - ((crystalProgress / 100) * (maxTempDisplay - 20) / (maxTempDisplay - 20)) * chartH}`}
            fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round"
          />
        )}
        {isSolid && (
          <polyline
            points={`${chartX},${chartY + chartH} ${chartX + chartW * 0.15},${chartY + chartH} ${chartX + chartW * 0.25},${chartY + 5} ${chartX + chartW * 0.55},${chartY + 5} ${chartX + chartW},${chartY + chartH - 20}`}
            fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round"
          />
        )}

        {/* Phase change plateau label */}
        {isSolid && <text x={chartX + chartW * 0.3} y={chartY - 4} fill="#f59e0b" fontSize="11" textAnchor="middle">Phase change plateau</text>}

        {/* Warmer mini visualization */}
        <g transform={`translate(${chartX + chartW - 60}, ${chartY + 10})`}>
          <ellipse cx="0" cy="0" rx={15 + ironPowder / 10} ry={10 + ironPowder / 15}
            fill={isLiquid ? 'url(#liquidGrad)' : isCrystallizing ? 'url(#crystalGrad)' : 'url(#solidGrad)'}
            stroke="#475569" strokeWidth="1.5" />
          <circle cx="0" cy="0" r={4} fill="#64748b" stroke={discClicked ? '#f59e0b' : '#94a3b8'} strokeWidth="1.5" filter="url(#glowFilter)" style={{ cursor: isLiquid ? 'pointer' : 'default' }} onClick={isLiquid ? activateWarmer : undefined} />
        </g>

        {/* Formula */}
        <text x={chartX + chartW / 2} y={chartY + chartH + 22} textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">E = m × Lf = {ironPowder}g × 264 kJ/kg = {energyKJ} kJ</text>

        {/* Temperature display */}
        <text x={chartX + 6} y={chartY + chartH + 40} fill={getTempColor(temperature)} fontSize="12" fontWeight="bold">T = {temperature.toFixed(0)}°C</text>

        {/* State label */}
        <text x={chartX + chartW} y={chartY + chartH + 40} textAnchor="end" fill={isLiquid ? '#38bdf8' : isCrystallizing ? '#f59e0b' : '#e2e8f0'} fontSize="11">
          {isLiquid ? 'Supercooled Liquid' : isCrystallizing ? `Crystallizing ${crystalProgress.toFixed(0)}%` : 'Crystal (Solid)'}
        </text>

        {/* Heat waves */}
        {temperature > 30 && (
          <g filter="url(#glowFilter)">
            {[0, 1, 2].map(i => {
              const offset = (animationFrame + i * 20) % 40;
              const baseX = chartX + chartW - 100 + i * 20;
              return (
                <path key={i}
                  d={`M ${baseX} ${chartY + 30 - offset} Q ${baseX + 5} ${chartY + 22 - offset} ${baseX} ${chartY + 14 - offset}`}
                  fill="none" stroke="#ef4444" strokeWidth="2" opacity={(40 - offset) / 40} strokeLinecap="round" />
              );
            })}
          </g>
        )}
      </svg>
    );
  };

  // Chemical Warmer Visualization
  const ChemicalWarmerVisualization = () => {
    const width = isMobile ? 320 : 400;
    const height = isMobile ? 180 : 200;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <radialGradient id="ironGrad" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#475569" />
          </radialGradient>
          <radialGradient id="rustGrad" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#92400e" />
          </radialGradient>
          <radialGradient id="oxygenGrad" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </radialGradient>
        </defs>

        {/* Warmer pouch */}
        <rect x="30" y="20" width={width - 60} height={height - 60} fill="#334155" stroke="#475569" strokeWidth="2" rx="12" />
        <rect x="40" y="30" width={width - 80} height={height - 80} fill="#1e293b" rx="8" />

        {/* Particles */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2 + (isReacting ? animationFrame / 20 : 0);
          const radius = 35 + (isReacting ? Math.sin(animationFrame / 10 + i) * 5 : 0);
          const cx = width / 2 + Math.cos(angle) * radius;
          const cy = height / 2 + Math.sin(angle) * radius * 0.6;
          const isRusted = reactionProgress > (i + 1) * 10;

          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={isRusted ? 10 : 8}
              fill={isRusted ? 'url(#rustGrad)' : 'url(#ironGrad)'}
              opacity={0.9}
            />
          );
        })}

        {/* Oxygen particles when reacting */}
        {isReacting && Array.from({ length: 4 }).map((_, i) => {
          const angle = (i / 4) * Math.PI * 2 + animationFrame / 15;
          const radius = 55 - (reactionProgress * 0.2);
          return (
            <circle
              key={`o2-${i}`}
              cx={width / 2 + Math.cos(angle) * radius}
              cy={height / 2 + Math.sin(angle) * radius * 0.6}
              r={5}
              fill="url(#oxygenGrad)"
              opacity={0.7}
            />
          );
        })}

        {/* Heat waves when reacting */}
        {isReacting && reactionProgress > 20 && (
          <g>
            {[0, 1, 2].map(i => {
              const offset = (animationFrame + i * 20) % 40;
              const baseX = width / 2 - 30 + i * 30;
              return (
                <path
                  key={i}
                  d={`M ${baseX} ${25 - offset} Q ${baseX + 5} ${18 - offset} ${baseX} ${11 - offset}`}
                  fill="none"
                  stroke={colors.warning}
                  strokeWidth="2"
                  opacity={(40 - offset) / 40}
                  strokeLinecap="round"
                />
              );
            })}
          </g>
        )}

        {/* Temperature and status */}
        <text x={width / 2} y={height - 25} textAnchor="middle" fill={getTempColor(chemicalTemp)} fontSize="14" fontWeight="bold">
          {chemicalTemp.toFixed(1)}C
        </text>
        <text x={width / 2} y={height - 8} textAnchor="middle" fill={colors.textMuted} fontSize="10">
          4Fe + 3O2 = 2Fe2O3 + heat
        </text>
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>

        <div style={{ fontSize: '64px', marginBottom: '24px', animation: 'pulse 2s infinite' }}>
          🧤🔥
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          The Magic Hand Warmer
        </h1>

        <p style={{ ...typo.body, color: '#e2e8f0', maxWidth: '600px', marginBottom: '32px' }}>
          "A clear liquid pouch at room temperature. Click a tiny metal disc, and INSTANT heat - warm enough to hold for an hour. Where does all that <span style={{ color: colors.accent }}>thermal energy</span> come from?"
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typo.small, color: '#e2e8f0', fontStyle: 'italic' }}>
            "The energy was there all along - stored invisibly in the liquid's molecular structure. Crystallization releases 264 kJ per kilogram of stored thermal energy."
          </p>
          <p style={{ ...typo.small, color: '#e2e8f0', marginTop: '8px' }}>
            — Thermodynamics of Phase Change Materials
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Discover Phase Change Energy
        </button>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'A hidden battery inside the pouch powers a heating element' },
      { id: 'b', text: 'Chemical reaction permanently consumes the liquid' },
      { id: 'c', text: 'Latent heat released when supercooled liquid crystallizes', correct: true },
    ];

    const predictWidth = isMobile ? 320 : 400;
    const predictHeight = isMobile ? 180 : 200;

    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderNavBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>Make Your Prediction</p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A reusable hand warmer contains clear liquid at 20C. You click the metal disc, and it instantly heats to 54C while turning solid. Where does the heat come from?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width={predictWidth} height={predictHeight} viewBox={`0 0 ${predictWidth} ${predictHeight}`} style={{ background: colors.bgSecondary, borderRadius: '12px' }}>
              <defs>
                <radialGradient id="predictLiquidGrad" cx="40%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
                  <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.8" />
                </radialGradient>
                <radialGradient id="predictHotGrad" cx="45%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#fcd34d" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.75" />
                </radialGradient>
              </defs>
              {/* Before state - liquid */}
              <ellipse cx={predictWidth * 0.25} cy={predictHeight * 0.5} rx="60" ry="40" fill="url(#predictLiquidGrad)" stroke="#475569" strokeWidth="2" />
              <circle cx={predictWidth * 0.25} cy={predictHeight * 0.5 - 5} r="8" fill="#64748b" stroke="#94a3b8" strokeWidth="1" />
              <text x={predictWidth * 0.25} y={predictHeight * 0.85} textAnchor="middle" fill="#e2e8f0" fontSize="12">Liquid (20C)</text>
              {/* Arrow */}
              <text x={predictWidth * 0.5} y={predictHeight * 0.5} textAnchor="middle" fill={colors.accent} fontSize="20">Click Disc</text>
              <path d={`M ${predictWidth * 0.37} ${predictHeight * 0.5} L ${predictWidth * 0.63} ${predictHeight * 0.5}`} stroke={colors.accent} strokeWidth="2" markerEnd="url(#arrowhead)" />
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill={colors.accent} />
                </marker>
              </defs>
              {/* After state - solid/hot */}
              <ellipse cx={predictWidth * 0.75} cy={predictHeight * 0.5} rx="60" ry="40" fill="url(#predictHotGrad)" stroke="#f59e0b" strokeWidth="2" />
              <text x={predictWidth * 0.75} y={predictHeight * 0.85} textAnchor="middle" fill="#fcd34d" fontSize="12">Hot Solid (54C)</text>
              <text x={predictWidth * 0.75} y={predictHeight * 0.3} textAnchor="middle" fill="#ef4444" fontSize="14">?</text>
            </svg>
            <p style={{ ...typo.small, color: '#e2e8f0', marginTop: '12px' }}>
              Where does the heat energy come from?
            </p>
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
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                  color: prediction === opt.id ? 'white' : '#e2e8f0',
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>{opt.text}</span>
              </button>
            ))}
          </div>

          {prediction && (
            <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryButtonStyle}>
              Test My Prediction
            </button>
          )}
        </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderNavBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Phase Change Hand Warmer Lab
          </h2>
          <p style={{ ...typo.body, color: '#e2e8f0', textAlign: 'center', marginBottom: '24px' }}>
            Click the metal disc to trigger crystallization and release latent heat. Watch how the temperature changes when the reaction is triggered.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <WarmerVisualization />
                </div>
              </div>

              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {/* Sliders for physics parameters */}
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ ...typo.small, color: '#e2e8f0', marginBottom: '8px', fontWeight: 600 }}>Adjust Parameters</h4>
                  {renderSlider('Warmer Mass (g)', ironPowder, setIronPowder, 20, 150, 'g', colors.accent)}
                  {renderSlider('Salt Catalyst (%)', saltConcentration, setSaltConcentration, 0, 100, '%', colors.warning)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '16px' }}>
                  {warmerState === 'liquid' && (
                    <button
                      onClick={activateWarmer}
                      style={{
                        ...primaryButtonStyle,
                        background: `linear-gradient(135deg, #0ea5e9, #0284c7)`,
                      }}
                    >
                      Click Metal Disc
                    </button>
                  )}
                  {warmerState !== 'liquid' && (
                    <button
                      onClick={resetWarmer}
                      style={{
                        padding: '12px 24px',
                        borderRadius: '10px',
                        border: `1px solid ${colors.border}`,
                        background: 'transparent',
                        color: colors.textSecondary,
                        cursor: 'pointer',
                        fontWeight: 600,
                        minHeight: '44px',
                      }}
                    >
                      Boil to Reset (Reusable)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Legend panel */}
          <div style={{
            background: colors.bgCard,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>Legend</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '16px', height: '16px', background: '#38bdf8', borderRadius: '4px' }} />
                <span style={{ ...typo.small, color: '#e2e8f0' }}>Supercooled Liquid</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '16px', height: '16px', background: '#fcd34d', borderRadius: '4px' }} />
                <span style={{ ...typo.small, color: '#e2e8f0' }}>Crystallizing</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '16px', height: '16px', background: '#cbd5e1', borderRadius: '4px' }} />
                <span style={{ ...typo.small, color: '#e2e8f0' }}>Solid Crystal</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '16px', height: '16px', background: '#ef4444', borderRadius: '4px' }} />
                <span style={{ ...typo.small, color: '#e2e8f0' }}>Heat Released</span>
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
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '8px' }}>Key Physics</h3>
            <p style={{ ...typo.body, color: '#e2e8f0', margin: 0 }}>
              <strong>Latent Heat of Fusion:</strong> 264 kJ/kg is released during crystallization. This energy = mass x latent heat.
              <br />
              <strong>Supercooling:</strong> Liquid below freezing point (54C) without crystals. When you increase the temperature, this causes the crystallization to start.
              <br />
              <strong>Nucleation:</strong> Metal disc provides seed for crystal formation.
            </p>
          </div>

          <div style={{
            background: `${colors.success}11`,
            border: `1px solid ${colors.success}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '8px' }}>Real-World Relevance</h3>
            <p style={{ ...typo.body, color: '#e2e8f0', margin: 0 }}>
              This same phase-change technology is important in industry. It powers emergency thermal packs in hospitals, heat storage systems for solar energy, and battery thermal management in electric vehicles. Understanding latent heat helps engineers design more efficient heating and cooling solutions.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Science
          </button>
        </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const predictionOptions: Record<string, string> = {
      a: 'A hidden battery inside the pouch powers a heating element',
      b: 'Chemical reaction permanently consumes the liquid',
      c: 'Latent heat released when supercooled liquid crystallizes',
    };
    const userPrediction = prediction ? predictionOptions[prediction] : null;
    const wasCorrect = prediction === 'c';
    const reviewWidth = isMobile ? 320 : 400;
    const reviewHeight = isMobile ? 150 : 180;

    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderNavBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
          {userPrediction && (
            <div style={{
              background: wasCorrect ? `${colors.success}22` : `${colors.warning}22`,
              border: `1px solid ${wasCorrect ? colors.success : colors.warning}44`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.small, color: wasCorrect ? colors.success : colors.warning, margin: 0 }}>
                {wasCorrect ? 'You predicted correctly!' : 'You predicted:'} {userPrediction}. As you observed in the experiment, the heat comes from latent energy stored in the supercooled liquid.
              </p>
            </div>
          )}

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            What You Observed in the Experiment
          </h2>

          {/* Review SVG visualization */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <svg width={reviewWidth} height={reviewHeight} viewBox={`0 0 ${reviewWidth} ${reviewHeight}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
              <defs>
                <linearGradient id="reviewEnergyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              <line x1="50" y1="20" x2="50" y2={reviewHeight - 20} stroke="#2a2a3a" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
              <line x1={reviewWidth / 2} y1="20" x2={reviewWidth / 2} y2={reviewHeight - 20} stroke="#2a2a3a" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
              <line x1={reviewWidth - 50} y1="20" x2={reviewWidth - 50} y2={reviewHeight - 20} stroke="#2a2a3a" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
              <line x1="40" y1="55" x2={reviewWidth - 10} y2="55" stroke="#2a2a3a" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
              <line x1="40" y1="90" x2={reviewWidth - 10} y2="90" stroke="#2a2a3a" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
              {/* Axes */}
              <line x1="50" y1="20" x2="50" y2={reviewHeight - 25} stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="50" y1={reviewHeight - 25} x2={reviewWidth - 10} y2={reviewHeight - 25} stroke="#94a3b8" strokeWidth="1.5" />
              {/* Axis labels */}
              <text x="14" y={reviewHeight / 2} textAnchor="middle" fill="#94a3b8" fontSize="10" transform={`rotate(-90, 14, ${reviewHeight/2})`}>Temp (C)</text>
              <text x={reviewWidth / 2} y={reviewHeight - 8} textAnchor="middle" fill="#94a3b8" fontSize="10">Time</text>
              {/* Temperature curve */}
              <polyline
                points={`55,${reviewHeight - 30} 70,${reviewHeight - 30} 100,${reviewHeight - 70} 130,${reviewHeight - 70} 130,${reviewHeight - 70} 160,${reviewHeight - 40} ${reviewWidth - 20},${reviewHeight - 30}`}
                fill="none" stroke="#f97316" strokeWidth="2" />
              {/* Formula */}
              <text x={reviewWidth / 2} y="18" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">E = m × Lf = 264 kJ/kg</text>
              {/* Labels */}
              <text x="58" y={reviewHeight - 35} fill="#3b82f6" fontSize="10">20C</text>
              <text x="130" y={reviewHeight - 72} fill="#f97316" fontSize="10">54C</text>
              <text x="102" y={reviewHeight - 60} fill="#e2e8f0" fontSize="9">Phase change</text>
            </svg>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: '#e2e8f0' }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Latent Heat of Fusion</strong> - The key principle that explains the warmer. Energy is stored in the liquid's molecular structure. The formula: E = m × Lf = 264 kJ/kg shows exactly how much thermal energy is released.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <span style={{ color: colors.accent }}>Crystallization (liquid to solid)</span>: Releases energy because molecules lock into an ordered crystal structure, releasing their stored potential energy as heat.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <span style={{ color: '#3b82f6' }}>Melting (solid to liquid)</span>: Absorbs energy to break molecular bonds. This is why boiling resets the warmer - it demonstrates the reversible nature of phase change.
              </p>
              <p>
                <strong style={{ color: colors.warning }}>Supercooling</strong>: Without a nucleation site, the liquid can't crystallize due to the lack of a seed crystal. This insight explains why the disc click triggers the reaction.
              </p>
            </div>
          </div>

          <div style={{
            background: `${colors.success}11`,
            border: `1px solid ${colors.success}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>
              Energy Calculation
            </h3>
            <p style={{ ...typo.body, color: '#e2e8f0', marginBottom: '8px' }}>
              For a 100g sodium acetate warmer:
            </p>
            <p style={{ ...typo.h3, color: colors.textPrimary, fontFamily: 'monospace' }}>
              E = m x Lf = 0.1 kg x 264 kJ/kg = 26.4 kJ
            </p>
            <p style={{ ...typo.small, color: '#e2e8f0', marginTop: '8px' }}>
              Enough to heat 100g of water by 63C, or keep hands warm for 30-60 minutes.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore the Comparison
          </button>
        </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Phase-change warmers - crystals release heat slowly' },
      { id: 'b', text: 'Chemical (iron) warmers - slow oxidation lasts hours', correct: true },
      { id: 'c', text: 'Both last about the same time' },
    ];

    const twistPredictWidth = isMobile ? 320 : 400;
    const twistPredictHeight = isMobile ? 150 : 180;

    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderNavBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: Two Types of Hand Warmers
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Which type of hand warmer provides heat for LONGER?
          </h2>

          {/* SVG comparison graphic */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <svg width={twistPredictWidth} height={twistPredictHeight} viewBox={`0 0 ${twistPredictWidth} ${twistPredictHeight}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
              {/* Phase change warmer */}
              <ellipse cx={twistPredictWidth * 0.25} cy={twistPredictHeight * 0.4} rx="50" ry="35" fill="#38bdf8" stroke="#0ea5e9" strokeWidth="2" />
              <text x={twistPredictWidth * 0.25} y={twistPredictHeight * 0.7} textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="bold">Phase-Change</text>
              <text x={twistPredictWidth * 0.25} y={twistPredictHeight * 0.85} textAnchor="middle" fill="#e2e8f0" fontSize="9">30-60 min?</text>
              {/* vs */}
              <text x={twistPredictWidth * 0.5} y={twistPredictHeight * 0.45} textAnchor="middle" fill={colors.warning} fontSize="16" fontWeight="bold">VS</text>
              {/* Chemical warmer */}
              <rect x={twistPredictWidth * 0.75 - 50} y={twistPredictHeight * 0.4 - 30} width="100" height="60" fill="#475569" stroke="#64748b" strokeWidth="2" rx="8" />
              <circle cx={twistPredictWidth * 0.75} cy={twistPredictHeight * 0.4} r="8" fill="#f97316" />
              <text x={twistPredictWidth * 0.75} y={twistPredictHeight * 0.7} textAnchor="middle" fill={colors.accent} fontSize="11" fontWeight="bold">Chemical</text>
              <text x={twistPredictWidth * 0.75} y={twistPredictHeight * 0.85} textAnchor="middle" fill="#e2e8f0" fontSize="9">6-12 hours?</text>
            </svg>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                style={{
                  background: twistPrediction === opt.id ? `${colors.warning}22` : colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
                  color: twistPrediction === opt.id ? 'white' : '#e2e8f0',
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>{opt.text}</span>
              </button>
            ))}
          </div>

          {twistPrediction && (
            <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryButtonStyle}>
              Compare Both Types
            </button>
          )}
        </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderNavBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Iron Oxidation vs Phase Change
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Compare the two hand warmer technologies
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
          }}>
          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* SVG Visualization */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <svg width="480" height="200" viewBox="0 0 480 200" style={{ background: colors.bgSecondary, borderRadius: '12px', maxWidth: '100%' }}>
                <defs>
                  <linearGradient id="tempBarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                <g opacity="0.3">
                  <line x1="60" y1="20" x2="60" y2="160" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                  <line x1="180" y1="20" x2="180" y2="160" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                  <line x1="300" y1="20" x2="300" y2="160" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                  <line x1="420" y1="20" x2="420" y2="160" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                  <line x1="40" y1="60" x2="460" y2="60" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                  <line x1="40" y1="110" x2="460" y2="110" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                </g>
                {/* Y Axis */}
                <line x1="40" y1="20" x2="40" y2="170" stroke="#94a3b8" strokeWidth="1.5" />
                {/* X Axis */}
                <line x1="40" y1="170" x2="460" y2="170" stroke="#94a3b8" strokeWidth="1.5" />
                {/* Axis labels */}
                <text x="16" y="100" textAnchor="middle" fill="#94a3b8" fontSize="11" transform="rotate(-90, 16, 100)">Temp °C</text>
                <text x="250" y="190" textAnchor="middle" fill="#94a3b8" fontSize="11">Time →</text>
                {/* Temperature bar - phase warmer */}
                <rect x="70" y={170 - Math.min(140, (twistTemperature - 20) * 4)} width="60" height={Math.min(140, (twistTemperature - 20) * 4)}
                  fill={warmerType === 'phase' ? '#3b82f6' : '#2a2a3a'} rx="4" />
                {/* Temperature bar - chemical warmer */}
                <rect x="160" y={170 - Math.min(140, (twistTemperature - 20) * 3)} width="60" height={Math.min(140, (twistTemperature - 20) * 3)}
                  fill={warmerType === 'chemical' ? '#f97316' : '#2a2a3a'} rx="4" />
                {/* Energy remaining bar */}
                <rect x="280" y={20 + (1 - energyRemaining / 100) * 140} width="60" height={energyRemaining * 1.4}
                  fill={energyRemaining > 50 ? '#10b981' : energyRemaining > 20 ? '#f59e0b' : '#ef4444'} rx="4" />
                {/* Labels */}
                <text x="100" y="185" textAnchor="middle" fill="#e2e8f0" fontSize="11">Phase</text>
                <text x="190" y="185" textAnchor="middle" fill="#e2e8f0" fontSize="11">Chemical</text>
                <text x="310" y="185" textAnchor="middle" fill="#e2e8f0" fontSize="11">Energy %</text>
                {/* Temperature values */}
                <text x="100" y={165 - Math.min(140, (twistTemperature - 20) * 4)} textAnchor="middle" fill={getTempColor(twistTemperature)} fontSize="11" fontWeight="bold">{twistTemperature.toFixed(0)}°C</text>
                {/* Energy value */}
                <text x="310" y={15 + (1 - energyRemaining / 100) * 140} textAnchor="middle" fill="#10b981" fontSize="11" fontWeight="bold">{energyRemaining.toFixed(0)}%</text>
                {/* Formula */}
                <text x="400" y="50" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">E = m × Lf</text>
                <text x="400" y="68" textAnchor="middle" fill="#94a3b8" fontSize="11">{warmerType === 'phase' ? '264 kJ/kg' : '~100 kJ/kg'}</text>
              </svg>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {twistState === 'inactive' && (
                <button
                  onClick={() => {
                    setTwistState('active');
                    if (warmerType === 'phase') playCrystallizeSound();
                    else playSound('click');
                  }}
                  style={primaryButtonStyle}
                >
                  {warmerType === 'phase' ? 'Click Disc' : 'Open Air Vent'}
                </button>
              )}
              {twistState !== 'inactive' && (
                <button
                  onClick={resetTwist}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.border}`,
                    background: 'transparent',
                    color: colors.textSecondary,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {warmerType === 'phase' ? 'Boil to Reset' : 'Discard (Single-Use)'}
                </button>
              )}
            </div>
          </div>
          </div>

          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
            <button
              onClick={() => { setWarmerType('phase'); resetTwist(); }}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: 'none',
                background: warmerType === 'phase' ? '#3b82f6' : colors.bgCard,
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Phase-Change (Reusable)
            </button>
            <button
              onClick={() => { setWarmerType('chemical'); resetTwist(); }}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: 'none',
                background: warmerType === 'chemical' ? colors.accent : colors.bgCard,
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Chemical (Disposable)
            </button>
          </div>

          {/* Comparison table */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <div style={{
              background: warmerType === 'phase' ? `#3b82f622` : colors.bgCard,
              border: `1px solid ${warmerType === 'phase' ? '#3b82f6' : colors.border}`,
              borderRadius: '12px',
              padding: '16px',
            }}>
              <h4 style={{ ...typo.small, color: '#3b82f6', fontWeight: 600, marginBottom: '8px' }}>Phase-Change</h4>
              <ul style={{ ...typo.small, color: colors.textSecondary, margin: 0, paddingLeft: '16px' }}>
                <li>Heats to 54C quickly</li>
                <li>Duration: 30-60 min</li>
                <li>Reusable (boil to reset)</li>
                <li>Latent heat release</li>
              </ul>
            </div>
            <div style={{
              background: warmerType === 'chemical' ? `${colors.accent}22` : colors.bgCard,
              border: `1px solid ${warmerType === 'chemical' ? colors.accent : colors.border}`,
              borderRadius: '12px',
              padding: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, fontWeight: 600, marginBottom: '8px' }}>Chemical</h4>
              <ul style={{ ...typo.small, color: colors.textSecondary, margin: 0, paddingLeft: '16px' }}>
                <li>Heats to ~50C slowly</li>
                <li>Duration: 6-12 hours</li>
                <li>Single-use (disposable)</li>
                <li>Chemical reaction energy</li>
              </ul>
            </div>
          </div>
          </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Difference
          </button>
        </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderNavBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why Chemical Warmers Last Longer
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚗️</span>
                <h3 style={{ ...typo.h3, color: colors.accent, margin: 0 }}>Iron Oxidation Reaction</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
                <code style={{ background: colors.bgSecondary, padding: '4px 8px', borderRadius: '4px' }}>
                  4Fe + 3O2 → 2Fe2O3 + heat
                </code>
              </p>
              <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                The reaction rate is controlled by oxygen diffusion through the porous pouch. Slow, steady heat for 6-12 hours.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>❄️</span>
                <h3 style={{ ...typo.h3, color: '#3b82f6', margin: 0 }}>Phase Change</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
                <code style={{ background: colors.bgSecondary, padding: '4px 8px', borderRadius: '4px' }}>
                  Lf = 264 kJ/kg at 54C
                </code>
              </p>
              <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                All latent heat releases rapidly during crystallization. Intense heat but shorter duration (30-60 min).
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>
                Choose the Right Warmer
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: '0 0 4px 0' }}>Quick warming, short trips:</p>
                  <p style={{ ...typo.small, color: '#3b82f6', fontWeight: 600, margin: 0 }}>Phase-change (reusable)</p>
                </div>
                <div>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: '0 0 4px 0' }}>All-day outdoor activity:</p>
                  <p style={{ ...typo.small, color: colors.accent, fontWeight: 600, margin: 0 }}>Chemical (disposable)</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications
          </button>
        </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Hand Warmer"
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
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderNavBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
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
                  {a.title.split(' ').slice(0, 2).join(' ')}
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

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              {app.description}
            </p>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                Connection to Hand Warmer Physics:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '16px',
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

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '8px',
            }}>
              <h4 style={{ ...typo.small, color: '#3b82f6', marginBottom: '8px', fontWeight: 600 }}>
                How It Works:
              </h4>
              <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', margin: 0 }}>
                {app.howItWorks}
              </p>
            </div>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '12px',
            }}>
              <h4 style={{ ...typo.small, color: colors.success, marginBottom: '6px', fontWeight: 600 }}>
                Future Impact:
              </h4>
              <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', margin: 0 }}>
                {app.futureImpact}
              </p>
            </div>
          </div>

          {allAppsCompleted ? (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test
            </button>
          ) : (
            <button
              onClick={() => {
                playSound('click');
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
              }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Got It
            </button>
          )}
        </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {renderNavBar()}

          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '16px' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>
              {passed ? '🎉' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand hand warmer thermodynamics!'
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Complete Lesson
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
                Review & Try Again
              </button>
            )}
          </div>
          </div>

          {renderBottomNav()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderNavBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
          {/* Progress */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>
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
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              {question.scenario}
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
                onClick={() => {
                  playSound('click');
                  const newAnswers = [...testAnswers];
                  newAnswers[currentQuestion] = opt.id;
                  setTestAnswers(newAnswers);
                }}
                style={{
                  background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '10px',
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
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
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => {
                  const score = testAnswers.reduce((acc, ans, i) => {
                    const correct = testQuestions[i].options.find(o => o.correct)?.id;
                    return acc + (ans === correct ? 1 : 0);
                  }, 0);
                  setTestScore(score);
                  setTestSubmitted(true);
                  playSound(score >= 7 ? 'complete' : 'failure');
                }}
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
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>

        <div style={{ fontSize: '100px', marginBottom: '24px', animation: 'bounce 1s infinite' }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Hand Warmer Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand the thermodynamics of phase change and exothermic reactions in hand warmer technology.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            You Learned:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'Latent heat of fusion (264 kJ/kg for sodium acetate)',
              'Supercooling and nucleation phenomena',
              'Iron oxidation reaction: 4Fe + 3O2 → 2Fe2O3',
              'Salt as a catalyst in chemical reactions',
              'Phase-change vs chemical warmer tradeoffs',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
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
            Return to Dashboard
          </a>
        </div>

        </div>

        {renderBottomNav()}
      </div>
    );
  }

  return null;
};

export default HandWarmerRenderer;
