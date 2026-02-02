'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Entropy & The Second Law of Thermodynamics - Complete 10-Phase Game
// Why disorder always wins and time flows in one direction
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

// Sound utility
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete' | 'barrier' | 'mix') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const sounds: Record<string, { freq: number; duration: number; type: OscillatorType; freq2?: number }> = {
      click: { freq: 600, duration: 0.1, type: 'sine' },
      success: { freq: 523, duration: 0.2, type: 'sine', freq2: 659 },
      failure: { freq: 200, duration: 0.3, type: 'sine' },
      transition: { freq: 440, duration: 0.15, type: 'sine', freq2: 550 },
      complete: { freq: 523, duration: 0.4, type: 'sine', freq2: 784 },
      barrier: { freq: 150, duration: 0.2, type: 'square' },
      mix: { freq: 300, duration: 0.3, type: 'sine', freq2: 400 }
    };
    const sound = sounds[type];
    oscillator.frequency.value = sound.freq;
    if (sound.freq2) {
      oscillator.frequency.setValueAtTime(sound.freq, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(sound.freq2, audioContext.currentTime + sound.duration / 2);
    }
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch { /* Audio not available */ }
};

// ─────────────────────────────────────────────────────────────────────────────
// PARTICLE INTERFACE
// ─────────────────────────────────────────────────────────────────────────────
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'hot' | 'cold';
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ─────────────────────────────────────────────────────────────────────────────
const testQuestions = [
  {
    scenario: "A chemist places a drop of dye in a glass of still water. Without stirring, the dye gradually spreads throughout the entire glass over the course of an hour.",
    question: "Why does the dye spread on its own without any external force?",
    options: [
      { id: 'a', label: "The dye molecules are attracted to water molecules" },
      { id: 'b', label: "Random thermal motion explores all possible arrangements, and spread states vastly outnumber concentrated states", correct: true },
      { id: 'c', label: "Gravity pulls the dye downward through the water" },
      { id: 'd', label: "Water currents from temperature differences carry the dye" }
    ],
    explanation: "Entropy drives diffusion. With billions of molecules in random motion, the number of ways to arrange molecules in a spread-out state is astronomically larger than concentrated states. The system naturally evolves toward the most probable (highest entropy) configuration."
  },
  {
    scenario: "A hot cup of coffee sits on a table. After 30 minutes, its temperature drops from 80C to room temperature (22C), while the room's temperature remains essentially unchanged.",
    question: "How does this process relate to the Second Law of Thermodynamics?",
    options: [
      { id: 'a', label: "Heat flowed from cold to hot, which always happens spontaneously" },
      { id: 'b', label: "Energy was destroyed as the coffee cooled" },
      { id: 'c', label: "Total entropy increased as heat spread from the concentrated hot source to the cooler surroundings", correct: true },
      { id: 'd', label: "The coffee violated thermodynamics by losing energy without work" }
    ],
    explanation: "Heat spontaneously flows from hot to cold because this increases total entropy. The entropy lost by the coffee (Q/T_hot) is less than the entropy gained by the room (Q/T_cold), so net entropy increases. This is the essence of the Second Law."
  },
  {
    scenario: "A physicist proposes a device that takes heat from the ocean (a cold reservoir) and converts 100% of it into electricity with no other effects.",
    question: "Why is this device impossible according to thermodynamics?",
    options: [
      { id: 'a', label: "The ocean doesn't contain enough thermal energy" },
      { id: 'b', label: "It violates the Kelvin-Planck statement: you cannot convert heat entirely to work in a cycle", correct: true },
      { id: 'c', label: "Salt in the ocean blocks thermal energy extraction" },
      { id: 'd', label: "It would require infinite ocean surface area" }
    ],
    explanation: "The Kelvin-Planck statement of the Second Law states it's impossible to construct a device that operates in a cycle and produces no effect other than extracting heat from a reservoir and performing an equivalent amount of work. Some heat must always be rejected."
  },
  {
    scenario: "A refrigerator keeps food cold inside (4C) while the kitchen stays warm (25C). The refrigerator seems to move heat from cold to hot.",
    question: "Does this violate the Second Law of Thermodynamics?",
    options: [
      { id: 'a', label: "Yes, heat cannot flow from cold to hot under any circumstances" },
      { id: 'b', label: "No, because work input creates more entropy in the surroundings than is removed from the food", correct: true },
      { id: 'c', label: "Refrigerators are exempt from thermodynamic laws" },
      { id: 'd', label: "The food actually generates heat that the refrigerator removes" }
    ],
    explanation: "Refrigerators use work (electricity) to pump heat from cold to hot. The work generates additional entropy that more than compensates for the local entropy decrease inside the fridge. Total entropy of fridge + kitchen + power plant always increases."
  },
  {
    scenario: "A deck of 52 cards is perfectly ordered by suit and rank. After shuffling it thoroughly 1000 times, a player checks if the deck has returned to its original order.",
    question: "What's the probability of finding the original order after random shuffling?",
    options: [
      { id: 'a', label: "Exactly 1 in 1000 (one shuffle could restore order)" },
      { id: 'b', label: "Impossible - shuffling can only create disorder" },
      { id: 'c', label: "About 1 in 8x10^67 - possible but vanishingly improbable", correct: true },
      { id: 'd', label: "50% - either it's in order or it's not" }
    ],
    explanation: "There are 52! = 8x10^67 possible arrangements. The original order is just ONE of these. While physically possible, the probability is so small that in the entire history of the universe, no randomly shuffled deck has ever returned to perfect order. This is 'statistical irreversibility.'"
  },
  {
    scenario: "Living cells maintain highly organized internal structures - proteins fold precisely, DNA replicates accurately, and organelles stay compartmentalized.",
    question: "How do living organisms create and maintain this order without violating the Second Law?",
    options: [
      { id: 'a', label: "Life operates outside the laws of thermodynamics" },
      { id: 'b', label: "Organisms consume low-entropy food and export high-entropy waste, increasing net universal entropy", correct: true },
      { id: 'c', label: "Quantum effects allow cells to temporarily reverse entropy" },
      { id: 'd', label: "Evolution has optimized cells to store entropy for later release" }
    ],
    explanation: "Organisms are open systems that import free energy (low-entropy sunlight or food) and export entropy (heat, CO2, waste). A human produces about 100W of heat - pure entropy export. Life creates local order by accelerating global disorder."
  },
  {
    scenario: "A computer programmer wants to understand the thermodynamic cost of computation. The computer erases 1 gigabyte of data by overwriting it with zeros.",
    question: "According to Landauer's principle, what must happen when information is erased?",
    options: [
      { id: 'a', label: "Nothing - information is abstract and has no physical cost" },
      { id: 'b', label: "At least kT*ln(2) joules of heat must be released per bit erased", correct: true },
      { id: 'c', label: "The computer's processor must cool down to absorb the information" },
      { id: 'd', label: "Erased data is stored in a quantum vacuum state" }
    ],
    explanation: "Landauer's principle connects information theory to thermodynamics. Erasing 1 bit reduces computational entropy, which must be compensated by releasing at least kT*ln(2) = 3x10^-21 J as heat. For 1 GB, that's about 2x10^-11 J minimum - actual computers waste millions of times more."
  },
  {
    scenario: "At the Big Bang, the universe began in an extremely low-entropy state - hot, dense, and remarkably uniform. 13.8 billion years later, we have stars, galaxies, planets, and life.",
    question: "How does the current structured universe represent higher entropy than the uniform early universe?",
    options: [
      { id: 'a', label: "It doesn't - the current universe has lower entropy due to organized structures" },
      { id: 'b', label: "Gravity makes clumped matter the high-entropy state; uniform distribution was actually low-entropy", correct: true },
      { id: 'c', label: "The universe's entropy hasn't changed since the Big Bang" },
      { id: 'd', label: "Black holes absorbed all the entropy from the early universe" }
    ],
    explanation: "For gravitating systems, uniform distribution is LOW entropy! Gravity reverses our usual intuition. Clumping matter releases gravitational potential energy as heat, increasing total entropy. Black holes represent maximum entropy - the end state of gravitational collapse."
  },
  {
    scenario: "An ice cube at 0C is placed in a glass of water at 0C. After several hours, the ice has completely melted, but the water temperature remains at 0C throughout.",
    question: "If temperature stayed constant, how did entropy change during melting?",
    options: [
      { id: 'a', label: "Entropy stayed constant since temperature didn't change" },
      { id: 'b', label: "Entropy decreased because solid ice is more ordered than liquid water" },
      { id: 'c', label: "Entropy increased because liquid molecules have more possible arrangements than crystalline ice", correct: true },
      { id: 'd', label: "Entropy is undefined during phase transitions" }
    ],
    explanation: "Even at constant temperature, entropy changes during phase transitions. Delta S = Q/T = latent heat / 273K is positive for melting. Liquid water molecules can arrange themselves in many more ways than the rigid crystal lattice of ice, so melting increases entropy."
  },
  {
    scenario: "A physicist measures the efficiency of various heat engines: car engine (25%), coal power plant (40%), combined-cycle gas turbine (60%), and a theoretical Carnot engine operating between 600K and 300K.",
    question: "What is the maximum possible efficiency for ANY heat engine operating between 600K and 300K?",
    options: [
      { id: 'a', label: "100% if perfectly designed" },
      { id: 'b', label: "60% matching the best current technology" },
      { id: 'c', label: "50% set by the Carnot efficiency limit (1 - T_cold/T_hot)", correct: true },
      { id: 'd', label: "75% with future superconducting materials" }
    ],
    explanation: "The Carnot efficiency = 1 - T_cold/T_hot = 1 - 300/600 = 50% is the absolute maximum for ANY heat engine. This isn't a technology limit but a fundamental law: extracting work from heat requires rejecting some heat to maintain entropy balance. The Second Law sets this ceiling."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🔥',
    title: 'Heat Engines & Power Generation',
    short: 'Why no engine can be 100% efficient',
    tagline: 'Entropy sets the ultimate efficiency limit',
    description: 'Every power plant, car engine, and jet turbine is fundamentally limited by entropy. The Carnot efficiency shows that some heat must always be rejected to a cold reservoir - this is not a design flaw but a law of nature.',
    connection: 'The particle mixing you observed shows why heat flows from hot to cold. Converting that heat flow into useful work requires maintaining temperature differences, and entropy demands its "tax" in the form of waste heat.',
    howItWorks: 'Heat engines operate between hot (T_H) and cold (T_C) reservoirs. Maximum efficiency = 1 - T_C/T_H. A coal plant at 800K exhausting to 300K has max efficiency of 62.5%. Real friction and irreversibilities reduce this to ~40%.',
    stats: [
      { value: '40%', label: 'Best coal plant efficiency', icon: '🏭' },
      { value: '62%', label: 'Combined cycle gas turbine', icon: '⚡' },
      { value: '25%', label: 'Car engine typical', icon: '🚗' }
    ],
    examples: ['Nuclear power plants (33% efficient)', 'Jet engines (35-40%)', 'Steam locomotives (6-9%)', 'Modern gas turbines (>60%)'],
    companies: ['GE Power', 'Siemens Energy', 'Mitsubishi Power', 'Rolls-Royce'],
    futureImpact: 'Supercritical CO2 cycles and combined heat-and-power systems will push efficiencies toward 70%, but can never exceed the Carnot limit.',
    color: '#EF4444'
  },
  {
    icon: '🧬',
    title: 'Biology & Life Systems',
    short: 'How life fights entropy locally by accelerating it globally',
    tagline: 'Living organisms are entropy-exporting machines',
    description: 'Life seems to defy entropy by creating incredible order - DNA replication, protein folding, cell division. But organisms survive by consuming low-entropy energy (food, sunlight) and exporting high-entropy waste (heat, CO2).',
    connection: 'Just as your simulation showed local order being possible while total entropy increases, cells maintain internal order by paying an "entropy tax" to their environment. A human body exports about 100 watts of heat.',
    howItWorks: 'ATP hydrolysis provides the free energy for ordering processes. Photosynthesis captures low-entropy photons. Metabolism breaks down ordered food molecules, releasing energy and producing disordered waste products.',
    stats: [
      { value: '100W', label: 'Human heat output', icon: '🌡️' },
      { value: '10^14', label: 'Cells in human body', icon: '🔬' },
      { value: '40%', label: 'Metabolic efficiency', icon: '⚡' }
    ],
    examples: ['ATP synthesis powers all cellular work', 'Protein folding driven by hydrophobic effect', 'DNA repair mechanisms', 'Photosynthesis captures order from light'],
    companies: ['Moderna', 'Genentech', 'Illumina', 'CRISPR Therapeutics'],
    futureImpact: 'Understanding cellular thermodynamics will enable synthetic biology, anti-aging therapies, and artificial cells that harvest entropy gradients.',
    color: '#10B981'
  },
  {
    icon: '💻',
    title: 'Information & Computing',
    short: 'The thermodynamic cost of bits',
    tagline: 'Information is physical and obeys thermodynamics',
    description: 'Landauer proved that erasing information has a minimum energy cost: kT*ln(2) per bit. This connects Shannon entropy (information theory) to Boltzmann entropy (thermodynamics), showing that computation is inherently physical.',
    connection: 'When you observed particles mixing, information about their original positions was lost. That lost information corresponds to increased entropy. Similarly, erasing computer memory destroys information and must release heat.',
    howItWorks: 'Reversible computing can theoretically avoid Landauer\'s limit, but irreversible operations (AND, OR gates) erase information. Modern CPUs waste millions of times the theoretical minimum, but approaching this limit is a path to ultra-efficient computing.',
    stats: [
      { value: '3x10^-21 J', label: 'Landauer limit/bit', icon: '🔢' },
      { value: '1%', label: 'Global electricity for data centers', icon: '🏢' },
      { value: '10^21', label: 'Bits stored globally', icon: '💾' }
    ],
    examples: ['Data center cooling (massive entropy export)', 'Quantum computing approaches reversibility', 'Maxwell\'s demon thought experiment', 'DNA as information storage'],
    companies: ['Intel', 'NVIDIA', 'IBM', 'Google'],
    futureImpact: 'Reversible computing and thermodynamically-optimized AI will enable computing power limited only by heat dissipation, not transistor density.',
    color: '#3B82F6'
  },
  {
    icon: '🌌',
    title: 'Cosmology & Time\'s Arrow',
    short: 'Why time flows forward',
    tagline: 'Entropy defines past from future',
    description: 'The Second Law is the ONLY fundamental physics law that distinguishes past from future. The universe began in a remarkably low-entropy state (Big Bang) and has been increasing ever since. This entropy gradient gives time its direction.',
    connection: 'Your simulation showed irreversibility - mixed particles never spontaneously separate. This same principle explains why eggs break but never unbreak, why we remember the past not the future, and why the universe ages.',
    howItWorks: 'Gravity makes uniformity low-entropy. The smooth early universe was actually highly ordered. As matter clumps into stars and galaxies, entropy increases. The "heat death" is maximum entropy - uniform temperature, no gradients, no work possible.',
    stats: [
      { value: '10^88', label: 'Universe entropy (Boltzmann units)', icon: '🌍' },
      { value: '10^120', label: 'Black hole max entropy', icon: '🕳️' },
      { value: '10^100 yr', label: 'Time to heat death', icon: '⏱️' }
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
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Particle simulation state
  const [particles, setParticles] = useState<Particle[]>([]);
  const [barrierRemoved, setBarrierRemoved] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [particleCount, setParticleCount] = useState(30);
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Twist phase - heat flow
  const [hotTemp, setHotTemp] = useState(400); // K
  const [coldTemp, setColdTemp] = useState(300); // K
  const [heatFlowing, setHeatFlowing] = useState(false);
  const [heatTransferred, setHeatTransferred] = useState(0);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Animation refs
  const animationRef = useRef<number | null>(null);
  const isNavigating = useRef(false);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#8B5CF6', // Purple for entropy theme
    accentGlow: 'rgba(139, 92, 246, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    hot: '#EF4444',
    cold: '#3B82F6',
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

  // Initialize particles
  const initializeParticles = useCallback((count: number, separated: boolean = true) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const isHot = separated ? i < count / 2 : Math.random() > 0.5;
      newParticles.push({
        x: separated ? (isHot ? 15 + Math.random() * 35 : 50 + Math.random() * 35) : 15 + Math.random() * 70,
        y: 15 + Math.random() * 70,
        vx: (Math.random() - 0.5) * (isHot ? 3 : 1.5),
        vy: (Math.random() - 0.5) * (isHot ? 3 : 1.5),
        type: isHot ? 'hot' : 'cold'
      });
    }
    return newParticles;
  }, []);

  // Calculate entropy (mixing entropy)
  const calculateEntropy = useCallback(() => {
    if (particles.length === 0) return 0;
    const leftHot = particles.filter(p => p.x < 50 && p.type === 'hot').length;
    const leftCold = particles.filter(p => p.x < 50 && p.type === 'cold').length;
    const rightHot = particles.filter(p => p.x >= 50 && p.type === 'hot').length;
    const rightCold = particles.filter(p => p.x >= 50 && p.type === 'cold').length;

    // Simplified mixing entropy
    const total = particles.length;
    const hotFrac = particles.filter(p => p.type === 'hot').length / total;
    const coldFrac = 1 - hotFrac;

    // Calculate spatial mixing
    const leftTotal = leftHot + leftCold;
    const rightTotal = rightHot + rightCold;

    if (leftTotal === 0 || rightTotal === 0) return hotFrac > 0 && coldFrac > 0 ? 0.5 : 0;

    const leftMix = leftTotal > 0 ? -((leftHot/leftTotal) * Math.log((leftHot/leftTotal) + 0.001) + (leftCold/leftTotal) * Math.log((leftCold/leftTotal) + 0.001)) : 0;
    const rightMix = rightTotal > 0 ? -((rightHot/rightTotal) * Math.log((rightHot/rightTotal) + 0.001) + (rightCold/rightTotal) * Math.log((rightCold/rightTotal) + 0.001)) : 0;

    return (leftMix * leftTotal + rightMix * rightTotal) / total;
  }, [particles]);

  // Calculate microstates (simplified)
  const calculateMicrostates = useCallback(() => {
    const n = particles.length;
    if (n === 0) return 1;
    const k = particles.filter(p => p.x < 50).length;
    if (k === 0 || k === n) return 1;
    // Simplified binomial coefficient
    const logOmega = n * Math.log(n) - k * Math.log(k) - (n - k) * Math.log(n - k);
    return Math.min(Math.round(Math.exp(Math.min(logOmega, 20))), 1000000);
  }, [particles]);

  // Initialize particles on mount and count change
  useEffect(() => {
    setParticles(initializeParticles(particleCount, true));
    setBarrierRemoved(false);
    setTimeElapsed(0);
    setIsSimulating(false);
  }, [particleCount, initializeParticles]);

  // Particle animation loop
  useEffect(() => {
    if (!isSimulating) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const animate = () => {
      setParticles(prev => {
        return prev.map(p => {
          let newX = p.x + p.vx;
          let newY = p.y + p.vy;
          let newVx = p.vx;
          let newVy = p.vy;

          // Wall collisions
          if (newX < 5 || newX > 95) {
            newVx = -newVx;
            newX = Math.max(5, Math.min(95, newX));
          }
          if (newY < 5 || newY > 95) {
            newVy = -newVy;
            newY = Math.max(5, Math.min(95, newY));
          }

          // Barrier collision (if not removed)
          if (!barrierRemoved) {
            if (p.x < 50 && newX >= 50) {
              newVx = -newVx;
              newX = 49;
            } else if (p.x >= 50 && newX < 50) {
              newVx = -newVx;
              newX = 51;
            }
          }

          // Add small random perturbations for realistic thermal motion
          newVx += (Math.random() - 0.5) * 0.1;
          newVy += (Math.random() - 0.5) * 0.1;

          // Limit max velocity
          const speed = Math.sqrt(newVx * newVx + newVy * newVy);
          const maxSpeed = p.type === 'hot' ? 4 : 2.5;
          if (speed > maxSpeed) {
            newVx = (newVx / speed) * maxSpeed;
            newVy = (newVy / speed) * maxSpeed;
          }

          return { ...p, x: newX, y: newY, vx: newVx, vy: newVy };
        });
      });

      setTimeElapsed(prev => prev + 1);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSimulating, barrierRemoved]);

  // Heat flow simulation for twist phase
  useEffect(() => {
    if (!heatFlowing) return;

    const interval = setInterval(() => {
      setHotTemp(prev => {
        const newTemp = prev - 0.5;
        if (newTemp <= coldTemp + 10) {
          setHeatFlowing(false);
          return coldTemp + 10;
        }
        return newTemp;
      });
      setColdTemp(prev => Math.min(prev + 0.3, hotTemp - 10));
      setHeatTransferred(prev => prev + 1);
    }, 100);

    return () => clearInterval(interval);
  }, [heatFlowing, coldTemp, hotTemp]);

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Challenge',
    twist_play: 'Heat Flow',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
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
        gameType: 'entropy',
        gameTitle: 'Entropy & Thermodynamics',
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

  // Reset simulation
  const resetSimulation = useCallback(() => {
    setParticles(initializeParticles(particleCount, true));
    setBarrierRemoved(false);
    setTimeElapsed(0);
    setIsSimulating(false);
  }, [particleCount, initializeParticles]);

  // Remove barrier
  const removeBarrier = useCallback(() => {
    setBarrierRemoved(true);
    playSound('barrier');
    setIsSimulating(true);
  }, []);

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
        background: `linear-gradient(90deg, ${colors.accent}, #EC4899)`,
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
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #EC4899)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
  };

  // Particle Visualization Component
  const ParticleVisualization = ({ width = 320, height = 280 }: { width?: number; height?: number }) => {
    const entropy = calculateEntropy();
    const microstates = calculateMicrostates();
    const scale = width / 100;

    return (
      <div style={{ textAlign: 'center' }}>
        <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }}>
          <defs>
            <radialGradient id="hotParticle" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
            </radialGradient>
            <radialGradient id="coldParticle" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </radialGradient>
            <filter id="particleGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Container background */}
          <rect x="10" y="30" width={width - 20} height={height - 80} rx="8" fill="#0f172a" stroke={colors.border} strokeWidth="2" />

          {/* Barrier */}
          {!barrierRemoved && (
            <rect x={width/2 - 3} y="35" width="6" height={height - 90} rx="2" fill="#64748b" />
          )}

          {/* Barrier removed indicator */}
          {barrierRemoved && (
            <line x1={width/2} y1="35" x2={width/2} y2={height - 55} stroke={colors.border} strokeWidth="1" strokeDasharray="4,4" />
          )}

          {/* Particles */}
          {particles.map((p, i) => (
            <circle
              key={i}
              cx={10 + p.x * (width - 20) / 100}
              cy={30 + p.y * (height - 80) / 100}
              r={isMobile ? 4 : 5}
              fill={p.type === 'hot' ? 'url(#hotParticle)' : 'url(#coldParticle)'}
              filter="url(#particleGlow)"
            />
          ))}

          {/* Labels */}
          <text x={width * 0.25} y="20" textAnchor="middle" fill={colors.hot} fontSize="12" fontWeight="600">
            Hot ({particles.filter(p => p.x < 50 && p.type === 'hot').length})
          </text>
          <text x={width * 0.75} y="20" textAnchor="middle" fill={colors.cold} fontSize="12" fontWeight="600">
            Cold ({particles.filter(p => p.x >= 50 && p.type === 'cold').length})
          </text>

          {/* Stats bar */}
          <rect x="10" y={height - 40} width={width - 20} height="35" rx="6" fill={colors.bgSecondary} />
          <text x="20" y={height - 18} fill={colors.textSecondary} fontSize="11">
            S = {entropy.toFixed(2)}
          </text>
          <text x={width/2} y={height - 18} textAnchor="middle" fill={colors.textSecondary} fontSize="11">
            Omega = {microstates.toLocaleString()}
          </text>
          <text x={width - 20} y={height - 18} textAnchor="end" fill={colors.textSecondary} fontSize="11">
            t = {timeElapsed}
          </text>
        </svg>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🎲🔥❄️
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Entropy: The Arrow of Time
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Why do eggs break but never unbreak? Why does coffee cool but never spontaneously heat up? The answer lies in a single quantity: <span style={{ color: colors.accent }}>entropy</span> - the measure of disorder that gives time its direction."
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <ParticleVisualization width={isMobile ? 280 : 340} height={220} />

          <p style={{ ...typo.small, color: colors.textSecondary, marginTop: '16px', fontStyle: 'italic' }}>
            "The second law of thermodynamics holds, I think, the supreme position among the laws of Nature." - Sir Arthur Eddington
          </p>
        </div>

        <button
          onClick={() => {
            playSound('click');
            nextPhase();
          }}
          style={primaryButtonStyle}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          Discover Why Disorder Wins
        </button>

        {renderNavDots()}
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
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        paddingTop: '48px',
      }}>
        {renderProgressBar()}

        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
          Make Your Prediction
        </h2>
        <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '24px' }}>
          Phase 2 of 10: Predict
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '600px',
          width: '100%',
          marginBottom: '24px',
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px' }}>🔴🔴</div>
              <div style={{ color: colors.hot, fontWeight: 600 }}>Hot Side</div>
            </div>
            <div style={{ fontSize: '24px', color: colors.textMuted, alignSelf: 'center' }}>+</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px' }}>🔵🔵</div>
              <div style={{ color: colors.cold, fontWeight: 600 }}>Cold Side</div>
            </div>
            <div style={{ fontSize: '24px', color: colors.textMuted, alignSelf: 'center' }}>=</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px' }}>🔴🔵</div>
              <div style={{ color: colors.accent, fontWeight: 600 }}>Mixed</div>
            </div>
          </div>

          <p style={{ ...typo.body, color: colors.textPrimary, textAlign: 'center' }}>
            After removing the barrier, hot and cold particles mix together. Could they ever spontaneously <span style={{ color: colors.accent }}>separate back</span> into their original arrangement?
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '600px', width: '100%' }}>
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                setPrediction(opt.id);
                playSound(opt.correct ? 'success' : 'failure');
                if (onGameEvent) {
                  onGameEvent({
                    eventType: opt.correct ? 'correct_answer' : 'incorrect_answer',
                    gameType: 'entropy',
                    gameTitle: 'Entropy & Thermodynamics',
                    details: { prediction: opt.id },
                    timestamp: Date.now()
                  });
                }
              }}
              style={{
                background: prediction === opt.id
                  ? (opt.correct ? colors.success + '33' : colors.error + '33')
                  : colors.bgCard,
                border: `2px solid ${prediction === opt.id ? (opt.correct ? colors.success : colors.error) : colors.border}`,
                borderRadius: '12px',
                padding: '16px 20px',
                textAlign: 'left',
                cursor: prediction ? 'default' : 'pointer',
                transition: 'all 0.2s ease',
              }}
              disabled={prediction !== null}
            >
              <span style={{ color: colors.accent, fontWeight: 700, marginRight: '8px' }}>{opt.id.toUpperCase()}.</span>
              <span style={{ color: colors.textPrimary }}>{opt.label}</span>
            </button>
          ))}
        </div>

        {prediction && (
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginTop: '24px',
            maxWidth: '600px',
            width: '100%',
            border: `1px solid ${options.find(o => o.id === prediction)?.correct ? colors.success : colors.error}`,
          }}>
            <p style={{ ...typo.body, color: options.find(o => o.id === prediction)?.correct ? colors.success : colors.error, fontWeight: 600, marginBottom: '8px' }}>
              {options.find(o => o.id === prediction)?.correct ? 'Correct!' : 'Not quite!'}
            </p>
            <p style={{ ...typo.small, color: colors.textSecondary }}>
              The answer is C: It is <strong>statistically forbidden</strong>, not physically impossible. With enough particles, the probability of spontaneous separation is so astronomically small (less than 1 in 10^20 for just 100 particles) that it essentially never happens in the lifetime of the universe.
            </p>
            <button
              onClick={() => {
                playSound('click');
                nextPhase();
              }}
              style={{ ...primaryButtonStyle, marginTop: '16px', width: '100%' }}
            >
              Explore the Simulation
            </button>
          </div>
        )}

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        paddingTop: '48px',
      }}>
        {renderProgressBar()}

        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>
          Entropy Laboratory
        </h2>
        <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '24px' }}>
          Phase 3 of 10: Experiment
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          border: `1px solid ${colors.border}`,
        }}>
          <ParticleVisualization width={isMobile ? 300 : 400} height={isMobile ? 260 : 300} />
        </div>

        {/* Controls */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '16px',
          maxWidth: '500px',
          width: '100%',
          marginBottom: '24px',
        }}>
          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}` }}>
            <label style={{ ...typo.small, color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
              Particles: {particleCount}
            </label>
            <input
              type="range"
              min="10"
              max="60"
              value={particleCount}
              onChange={(e) => setParticleCount(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: colors.accent }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                if (!barrierRemoved) {
                  removeBarrier();
                } else {
                  setIsSimulating(!isSimulating);
                }
              }}
              style={{
                flex: 1,
                background: isSimulating ? colors.error : colors.success,
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '16px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {!barrierRemoved ? '🚀 Remove Barrier' : isSimulating ? '⏸️ Pause' : '▶️ Play'}
            </button>
            <button
              onClick={resetSimulation}
              style={{
                flex: 1,
                background: colors.bgCard,
                color: colors.textPrimary,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                padding: '16px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ↺ Reset
            </button>
          </div>
        </div>

        {/* Formula Display */}
        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '20px',
          maxWidth: '500px',
          width: '100%',
          marginBottom: '24px',
          border: `1px solid ${colors.accent}33`,
          textAlign: 'center',
        }}>
          <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
            Boltzmann's Entropy Formula
          </h3>
          <div style={{ fontSize: '24px', color: colors.textPrimary, fontFamily: 'serif', marginBottom: '8px' }}>
            S = k<sub>B</sub> ln(Omega)
          </div>
          <p style={{ ...typo.small, color: colors.textSecondary }}>
            Entropy (S) equals Boltzmann's constant times the natural log of microstates (Omega).
            More ways to arrange = higher entropy!
          </p>
        </div>

        <button
          onClick={() => {
            playSound('click');
            nextPhase();
          }}
          style={primaryButtonStyle}
        >
          Understand the Physics
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const concepts = [
      {
        icon: '📊',
        title: 'What is Entropy?',
        color: colors.accent,
        points: [
          'A measure of disorder or randomness in a system',
          'Counts the number of microscopic arrangements (microstates)',
          'S = k_B * ln(Omega) - Boltzmann\'s famous formula',
          'Higher entropy = more possible configurations',
          'Nature spontaneously moves toward maximum entropy'
        ]
      },
      {
        icon: '⚖️',
        title: 'The Second Law',
        color: colors.hot,
        points: [
          'Total entropy of an isolated system never decreases',
          'Delta S_universe >= 0 (always!)',
          'Processes tend toward thermodynamic equilibrium',
          'Heat spontaneously flows from hot to cold',
          'Gives time its "arrow" - distinguishes past from future'
        ]
      },
      {
        icon: '🎲',
        title: 'Statistical Mechanics',
        color: colors.cold,
        points: [
          'Ordered states have few microstates (improbable)',
          'Disordered states have many microstates (probable)',
          'For 100 particles: ~10^30 arrangements',
          'Probability of original order: essentially zero',
          'Disorder wins by overwhelming statistics!'
        ]
      },
      {
        icon: '🔥',
        title: 'Heat & Temperature',
        color: colors.warning,
        points: [
          'Delta S = Q/T for reversible heat transfer',
          'Adding heat increases molecular motion',
          'More motion = more possible arrangements',
          'Heat flows to maximize total entropy',
          'This is why 100% efficient heat engines are impossible'
        ]
      }
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        paddingTop: '48px',
      }}>
        {renderProgressBar()}

        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>
          Understanding Entropy
        </h2>
        <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '24px' }}>
          Phase 4 of 10: Review
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '16px',
          maxWidth: '800px',
          width: '100%',
          marginBottom: '32px',
        }}>
          {concepts.map((concept, i) => (
            <div key={i} style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '20px',
              border: `1px solid ${concept.color}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '28px' }}>{concept.icon}</span>
                <h3 style={{ ...typo.h3, color: concept.color, margin: 0 }}>{concept.title}</h3>
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {concept.points.map((point, j) => (
                  <li key={j} style={{ ...typo.small, color: colors.textSecondary, marginBottom: '6px' }}>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            playSound('click');
            nextPhase();
          }}
          style={primaryButtonStyle}
        >
          Ready for a Twist?
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST_PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', label: 'Yes - refrigerators violate the Second Law' },
      { id: 'b', label: 'No - they export MORE entropy to surroundings than they remove from inside', correct: true },
      { id: 'c', label: 'They only work because electricity is "ordered energy"' },
      { id: 'd', label: 'The Second Law doesn\'t apply to machines' }
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        paddingTop: '48px',
      }}>
        {renderProgressBar()}

        <h2 style={{ ...typo.h2, color: '#06B6D4', marginBottom: '8px', textAlign: 'center' }}>
          The Twist Challenge
        </h2>
        <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '24px' }}>
          Phase 5 of 10: New Variable
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '600px',
          width: '100%',
          marginBottom: '24px',
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '16px' }}>❄️🔌🔥</div>
          <p style={{ ...typo.body, color: colors.textPrimary, textAlign: 'center', marginBottom: '16px' }}>
            Your refrigerator keeps food cold (4C) while the kitchen stays warm (25C). Heat is flowing from <span style={{ color: colors.cold }}>cold</span> to <span style={{ color: colors.hot }}>hot</span>!
          </p>
          <p style={{ ...typo.body, color: '#06B6D4', textAlign: 'center', fontWeight: 600 }}>
            Doesn't this violate the Second Law of Thermodynamics?
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '600px', width: '100%' }}>
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                setTwistPrediction(opt.id);
                playSound(opt.correct ? 'success' : 'failure');
              }}
              style={{
                background: twistPrediction === opt.id
                  ? (opt.correct ? colors.success + '33' : colors.error + '33')
                  : colors.bgCard,
                border: `2px solid ${twistPrediction === opt.id ? (opt.correct ? colors.success : colors.error) : colors.border}`,
                borderRadius: '12px',
                padding: '16px 20px',
                textAlign: 'left',
                cursor: twistPrediction ? 'default' : 'pointer',
                transition: 'all 0.2s ease',
              }}
              disabled={twistPrediction !== null}
            >
              <span style={{ color: '#06B6D4', fontWeight: 700, marginRight: '8px' }}>{opt.id.toUpperCase()}.</span>
              <span style={{ color: colors.textPrimary }}>{opt.label}</span>
            </button>
          ))}
        </div>

        {twistPrediction && (
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginTop: '24px',
            maxWidth: '600px',
            width: '100%',
            border: `1px solid ${colors.success}`,
          }}>
            <p style={{ ...typo.body, color: colors.success, fontWeight: 600, marginBottom: '8px' }}>
              The key insight!
            </p>
            <p style={{ ...typo.small, color: colors.textSecondary }}>
              Refrigerators use electrical work to pump heat "uphill." The work input generates MORE entropy (waste heat dumped into your kitchen) than the entropy removed from inside. Total entropy still increases!
            </p>
            <button
              onClick={() => {
                playSound('click');
                nextPhase();
              }}
              style={{ ...primaryButtonStyle, marginTop: '16px', width: '100%' }}
            >
              Explore Local Order
            </button>
          </div>
        )}

        {renderNavDots()}
      </div>
    );
  }

  // TWIST_PLAY PHASE
  if (phase === 'twist_play') {
    const efficiency = hotTemp > coldTemp ? (1 - coldTemp / hotTemp) * 100 : 0;
    const entropyChange = heatTransferred > 0 ? (heatTransferred / coldTemp - heatTransferred / hotTemp).toFixed(3) : '0.000';

    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        paddingTop: '48px',
      }}>
        {renderProgressBar()}

        <h2 style={{ ...typo.h2, color: '#06B6D4', marginBottom: '8px' }}>
          Local Order, Global Disorder
        </h2>
        <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '24px' }}>
          Phase 6 of 10: Heat Flow
        </p>

        {/* Heat Flow Visualization */}
        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', alignItems: 'center' }}>
            {/* Hot Reservoir */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '12px',
                background: `linear-gradient(180deg, ${colors.hot}88 0%, ${colors.hot}44 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${colors.hot}`,
                marginBottom: '8px',
              }}>
                <span style={{ fontSize: '32px' }}>🔥</span>
              </div>
              <div style={{ ...typo.h3, color: colors.hot }}>{hotTemp.toFixed(0)}K</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Hot Reservoir</div>
            </div>

            {/* Arrow showing heat flow */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', color: heatFlowing ? colors.warning : colors.textMuted }}>
                {heatFlowing ? '⚡➡️⚡' : '➡️'}
              </div>
              <div style={{ ...typo.small, color: colors.textSecondary, marginTop: '8px' }}>
                Q = {heatTransferred} units
              </div>
            </div>

            {/* Cold Reservoir */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '12px',
                background: `linear-gradient(180deg, ${colors.cold}88 0%, ${colors.cold}44 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${colors.cold}`,
                marginBottom: '8px',
              }}>
                <span style={{ fontSize: '32px' }}>❄️</span>
              </div>
              <div style={{ ...typo.h3, color: colors.cold }}>{coldTemp.toFixed(0)}K</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Cold Reservoir</div>
            </div>
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginTop: '24px',
          }}>
            <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
              <div style={{ ...typo.h3, color: colors.accent }}>{efficiency.toFixed(1)}%</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Max Carnot Efficiency</div>
            </div>
            <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
              <div style={{ ...typo.h3, color: colors.success }}>+{entropyChange}</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Delta S (net)</div>
            </div>
            <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
              <div style={{ ...typo.h3, color: colors.warning }}>{(hotTemp - coldTemp).toFixed(0)}K</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Temperature Gap</div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
        }}>
          <button
            onClick={() => {
              setHeatFlowing(true);
              playSound('mix');
            }}
            disabled={heatFlowing || hotTemp <= coldTemp + 20}
            style={{
              background: heatFlowing ? colors.textMuted : colors.success,
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '16px 24px',
              fontWeight: 700,
              cursor: heatFlowing ? 'default' : 'pointer',
              opacity: heatFlowing || hotTemp <= coldTemp + 20 ? 0.5 : 1,
            }}
          >
            {heatFlowing ? 'Heat Flowing...' : 'Start Heat Flow'}
          </button>
          <button
            onClick={() => {
              setHotTemp(400);
              setColdTemp(300);
              setHeatFlowing(false);
              setHeatTransferred(0);
            }}
            style={{
              background: colors.bgCard,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              padding: '16px 24px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>

        {/* Key Insight */}
        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '20px',
          maxWidth: '500px',
          width: '100%',
          border: `1px solid #06B6D4`,
          marginBottom: '24px',
        }}>
          <h3 style={{ ...typo.h3, color: '#06B6D4', marginBottom: '12px' }}>Key Insight</h3>
          <p style={{ ...typo.small, color: colors.textSecondary }}>
            Heat naturally flows from hot to cold. The entropy <em>gained</em> by the cold reservoir (Q/T_cold) is GREATER than the entropy <em>lost</em> by the hot reservoir (Q/T_hot). Net entropy always increases!
          </p>
          <div style={{ textAlign: 'center', marginTop: '12px', fontFamily: 'serif', fontSize: '18px', color: colors.textPrimary }}>
            Delta S = Q/T_cold - Q/T_hot &gt; 0
          </div>
        </div>

        <button
          onClick={() => {
            playSound('click');
            nextPhase();
          }}
          style={primaryButtonStyle}
        >
          Understand the Discovery
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST_REVIEW PHASE
  if (phase === 'twist_review') {
    const insights = [
      { icon: '❄️', title: 'Refrigerator', desc: 'Uses work to pump heat from cold to hot. Entropy dumped outside exceeds entropy removed inside.' },
      { icon: '🌱', title: 'Plant Growth', desc: 'Captures low-entropy sunlight, builds ordered structures, releases heat to environment.' },
      { icon: '🏭', title: 'Manufacturing', desc: 'Creates ordered products by consuming free energy and generating waste heat.' },
      { icon: '🧠', title: 'Thinking', desc: 'Your brain maintains order by dissipating ~20W of heat. Thoughts cost entropy!' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        paddingTop: '48px',
      }}>
        {renderProgressBar()}

        <h2 style={{ ...typo.h2, color: '#06B6D4', marginBottom: '8px' }}>
          The Deep Insight
        </h2>
        <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '24px' }}>
          Phase 7 of 10: Deep Understanding
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '600px',
          width: '100%',
          marginBottom: '24px',
          border: `1px solid #06B6D4`,
        }}>
          <h3 style={{ ...typo.h3, color: '#06B6D4', marginBottom: '16px', textAlign: 'center' }}>
            Order CAN Be Created - At a Cost!
          </h3>
          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
            The Second Law doesn't forbid local decreases in entropy. It just demands payment:
          </p>

          <div style={{ display: 'grid', gap: '12px' }}>
            {insights.map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
              }}>
                <span style={{ fontSize: '24px' }}>{item.icon}</span>
                <div>
                  <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>{item.title}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            background: colors.success + '22',
            borderRadius: '8px',
            padding: '16px',
            marginTop: '20px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.success, fontWeight: 600, margin: 0 }}>
              In every case: Delta S_local + Delta S_environment &gt;= 0
            </p>
            <p style={{ ...typo.small, color: colors.textSecondary, marginTop: '8px' }}>
              The entropy bill always gets paid!
            </p>
          </div>
        </div>

        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '20px',
          maxWidth: '500px',
          width: '100%',
          marginBottom: '24px',
          border: `1px solid ${colors.accent}`,
          textAlign: 'center',
        }}>
          <h4 style={{ ...typo.h3, color: colors.accent, marginBottom: '8px' }}>Free Energy: The Useful Metric</h4>
          <div style={{ fontSize: '24px', fontFamily: 'serif', color: colors.textPrimary, marginBottom: '8px' }}>
            G = H - TS
          </div>
          <p style={{ ...typo.small, color: colors.textSecondary }}>
            Gibbs free energy (G) combines enthalpy (H) and entropy (S). Negative Delta G means a process is spontaneous - it will happen on its own!
          </p>
        </div>

        <button
          onClick={() => {
            playSound('click');
            nextPhase();
          }}
          style={primaryButtonStyle}
        >
          Explore Real-World Applications
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        paddingTop: '48px',
      }}>
        {renderProgressBar()}

        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>
          Real-World Applications
        </h2>
        <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '24px' }}>
          Phase 8 of 10: Transfer ({completedApps.filter(c => c).length}/4 explored)
        </p>

        {/* App selector tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {realWorldApps.map((a, i) => (
            <button
              key={i}
              onClick={() => setSelectedApp(i)}
              style={{
                background: selectedApp === i ? app.color : colors.bgCard,
                color: selectedApp === i ? 'white' : colors.textSecondary,
                border: `2px solid ${completedApps[i] ? colors.success : selectedApp === i ? app.color : colors.border}`,
                borderRadius: '12px',
                padding: '10px 16px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>{a.icon}</span>
              <span>{a.short}</span>
              {completedApps[i] && <span>✓</span>}
            </button>
          ))}
        </div>

        {/* App content */}
        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '700px',
          width: '100%',
          marginBottom: '24px',
          border: `1px solid ${app.color}44`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <span style={{ fontSize: '48px' }}>{app.icon}</span>
            <div>
              <h3 style={{ ...typo.h3, color: 'white', margin: 0 }}>{app.title}</h3>
              <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
            </div>
          </div>

          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
            {app.description}
          </p>

          <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <h4 style={{ ...typo.small, color: colors.accent, fontWeight: 700, marginBottom: '8px' }}>Connection to Entropy:</h4>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.connection}</p>
          </div>

          <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <h4 style={{ ...typo.small, color: '#06B6D4', fontWeight: 700, marginBottom: '8px' }}>How It Works:</h4>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.howItWorks}</p>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
            {app.stats.map((stat, i) => (
              <div key={i} style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                <div style={{ ...typo.h3, color: 'white', fontSize: '18px' }}>{stat.value}</div>
                <div style={{ ...typo.small, color: colors.textMuted, fontSize: '11px' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Examples & Companies */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px' }}>
              <h4 style={{ ...typo.small, color: colors.success, fontWeight: 700, marginBottom: '8px' }}>Examples:</h4>
              <ul style={{ margin: 0, paddingLeft: '16px' }}>
                {app.examples.map((ex, i) => (
                  <li key={i} style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>{ex}</li>
                ))}
              </ul>
            </div>
            <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px' }}>
              <h4 style={{ ...typo.small, color: colors.warning, fontWeight: 700, marginBottom: '8px' }}>Key Companies:</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {app.companies.map((company, i) => (
                  <span key={i} style={{
                    background: colors.bgCard,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    ...typo.small,
                    color: colors.textSecondary,
                  }}>{company}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Future Impact */}
          <div style={{ background: `${app.color}22`, borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ ...typo.small, color: app.color, fontWeight: 700, marginBottom: '8px' }}>Future Impact:</h4>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.futureImpact}</p>
          </div>

          {!completedApps[selectedApp] && (
            <button
              onClick={() => {
                playSound('success');
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
              }}
              style={{
                width: '100%',
                marginTop: '16px',
                background: colors.success,
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Mark as Explored ✓
            </button>
          )}
        </div>

        {allCompleted && (
          <button
            onClick={() => {
              playSound('click');
              nextPhase();
            }}
            style={primaryButtonStyle}
          >
            Take the Knowledge Test
          </button>
        )}

        {renderNavDots()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    const currentQ = testQuestions[currentQuestion];
    const answeredCount = testAnswers.filter(a => a !== null).length;
    const allAnswered = answeredCount === 10;

    if (testSubmitted) {
      const score = testAnswers.reduce((acc, answer, i) => {
        const correct = testQuestions[i].options.find(o => o.correct)?.id;
        return acc + (answer === correct ? 1 : 0);
      }, 0);

      return (
        <div style={{
          minHeight: '100vh',
          background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '24px',
          paddingTop: '48px',
        }}>
          {renderProgressBar()}

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Test Results
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center',
            marginBottom: '24px',
            border: `1px solid ${score >= 7 ? colors.success : colors.warning}`,
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>
              {score >= 9 ? '🏆' : score >= 7 ? '🎉' : score >= 5 ? '📚' : '💪'}
            </div>
            <h3 style={{ ...typo.h2, color: score >= 7 ? colors.success : colors.warning, marginBottom: '8px' }}>
              {score}/10 Correct
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              {score >= 9 ? 'Outstanding! You truly understand entropy!' :
               score >= 7 ? 'Great job! You have solid understanding!' :
               score >= 5 ? 'Good effort! Review the concepts and try again.' :
               'Keep learning! Entropy takes time to master.'}
            </p>
          </div>

          {/* Review answers */}
          <div style={{ maxWidth: '600px', width: '100%', marginBottom: '24px' }}>
            {testQuestions.map((q, i) => {
              const correct = q.options.find(o => o.correct)?.id;
              const isCorrect = testAnswers[i] === correct;
              return (
                <div key={i} style={{
                  background: colors.bgCard,
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '12px',
                  borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
                }}>
                  <p style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600, marginBottom: '8px' }}>
                    {i + 1}. {q.question}
                  </p>
                  <p style={{ ...typo.small, color: isCorrect ? colors.success : colors.error, marginBottom: '4px' }}>
                    Your answer: {q.options.find(o => o.id === testAnswers[i])?.label}
                  </p>
                  {!isCorrect && (
                    <p style={{ ...typo.small, color: colors.success, marginBottom: '4px' }}>
                      Correct: {q.options.find(o => o.correct)?.label}
                    </p>
                  )}
                  <p style={{ ...typo.small, color: colors.textMuted, fontStyle: 'italic' }}>
                    {q.explanation}
                  </p>
                </div>
              );
            })}
          </div>

          {score >= 7 ? (
            <button
              onClick={() => {
                playSound('complete');
                nextPhase();
              }}
              style={primaryButtonStyle}
            >
              Claim Your Mastery Badge!
            </button>
          ) : (
            <button
              onClick={() => {
                setTestSubmitted(false);
                setTestAnswers(Array(10).fill(null));
                setCurrentQuestion(0);
                goToPhase('review');
              }}
              style={{
                ...primaryButtonStyle,
                background: `linear-gradient(135deg, ${colors.warning}, ${colors.error})`,
              }}
            >
              Review & Try Again
            </button>
          )}

          {renderNavDots()}
        </div>
      );
    }

    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        paddingTop: '48px',
      }}>
        {renderProgressBar()}

        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>
          Knowledge Assessment
        </h2>
        <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '24px' }}>
          Question {currentQuestion + 1} of 10 ({answeredCount} answered)
        </p>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '24px' }}>
          {testQuestions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQuestion(i)}
              style={{
                width: currentQuestion === i ? '24px' : '12px',
                height: '12px',
                borderRadius: '6px',
                border: 'none',
                background: testAnswers[i] !== null ? colors.success : currentQuestion === i ? colors.accent : colors.border,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </div>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '600px',
          width: '100%',
          marginBottom: '24px',
          border: `1px solid ${colors.border}`,
        }}>
          {/* Scenario */}
          <div style={{
            background: colors.bgSecondary,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <p style={{ ...typo.small, color: colors.accent, fontStyle: 'italic', margin: 0 }}>
              {currentQ.scenario}
            </p>
          </div>

          {/* Question */}
          <p style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600, marginBottom: '16px' }}>
            {currentQ.question}
          </p>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {currentQ.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  playSound('click');
                  const newAnswers = [...testAnswers];
                  newAnswers[currentQuestion] = opt.id;
                  setTestAnswers(newAnswers);
                }}
                style={{
                  background: testAnswers[currentQuestion] === opt.id ? colors.accent + '33' : colors.bgSecondary,
                  border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '10px',
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ color: colors.accent, fontWeight: 700, marginRight: '8px' }}>
                  {opt.id.toUpperCase()}.
                </span>
                <span style={{ color: colors.textPrimary }}>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            style={{
              background: colors.bgCard,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              padding: '14px 24px',
              fontWeight: 600,
              cursor: currentQuestion === 0 ? 'default' : 'pointer',
              opacity: currentQuestion === 0 ? 0.5 : 1,
            }}
          >
            Previous
          </button>

          {currentQuestion < 9 ? (
            <button
              onClick={() => setCurrentQuestion(Math.min(9, currentQuestion + 1))}
              style={{
                background: colors.accent,
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '14px 24px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={() => {
                if (allAnswered) {
                  playSound('complete');
                  const score = testAnswers.reduce((acc, answer, i) => {
                    const correct = testQuestions[i].options.find(o => o.correct)?.id;
                    return acc + (answer === correct ? 1 : 0);
                  }, 0);
                  setTestScore(score);
                  setTestSubmitted(true);
                }
              }}
              disabled={!allAnswered}
              style={{
                background: allAnswered ? colors.success : colors.textMuted,
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '14px 24px',
                fontWeight: 600,
                cursor: allAnswered ? 'pointer' : 'default',
                opacity: allAnswered ? 1 : 0.5,
              }}
            >
              Submit Test
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, #1a0a2e 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          background: `linear-gradient(135deg, ${colors.accent}22, #EC489922)`,
          borderRadius: '24px',
          padding: '48px 32px',
          maxWidth: '500px',
          border: `2px solid ${colors.accent}`,
          boxShadow: `0 0 60px ${colors.accentGlow}`,
        }}>
          <div style={{
            fontSize: '80px',
            marginBottom: '24px',
            animation: 'bounce 1s infinite',
          }}>
            🎲🏆
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Entropy Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
            You have mastered the Second Law of Thermodynamics and understand why disorder always wins!
          </p>

          {/* Achievement badges */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            marginBottom: '32px',
          }}>
            {[
              { icon: '📊', label: 'Microstates' },
              { icon: '⚖️', label: 'Second Law' },
              { icon: '⏰', label: 'Arrow of Time' },
              { icon: '🔥', label: 'Free Energy' },
            ].map((badge, i) => (
              <div key={i} style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '16px',
                border: `1px solid ${colors.accent}44`,
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{badge.icon}</div>
                <div style={{ ...typo.small, color: colors.textSecondary }}>{badge.label}</div>
              </div>
            ))}
          </div>

          {/* Boltzmann's formula celebration */}
          <div style={{
            background: colors.bgSecondary,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <div style={{ fontSize: '28px', fontFamily: 'serif', color: colors.accent, marginBottom: '8px' }}>
              S = k<sub>B</sub> ln(Omega)
            </div>
            <p style={{ ...typo.small, color: colors.textMuted }}>
              You understand the most profound equation in thermodynamics!
            </p>
          </div>

          <button
            onClick={() => goToPhase('hook')}
            style={{
              background: colors.bgCard,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              padding: '14px 28px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Explore Again
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default EntropyRenderer;
