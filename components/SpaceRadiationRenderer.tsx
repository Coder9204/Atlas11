'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Space Radiation & Bit Flips - Complete 10-Phase Game
// Why triple-redundancy exists: Ionizing particles cause SEUs in space computers
// -----------------------------------------------------------------------------

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

interface SpaceRadiationRendererProps {
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

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// -----------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: "A satellite in geostationary orbit experiences an unexplained reboot every few weeks. Ground engineers find corrupted values in the flight computer's memory just before each reset.",
    question: "What is the most likely cause of these memory corruptions?",
    options: [
      { id: 'a', label: "Overheating from solar radiation damaging the chips" },
      { id: 'b', label: "High-energy particles (cosmic rays, solar protons) causing single-event upsets", correct: true },
      { id: 'c', label: "Electromagnetic interference from onboard radios" },
      { id: 'd', label: "Manufacturing defects in the memory chips" }
    ],
    explanation: "In space, high-energy particles from cosmic rays and solar events constantly bombard electronics. When these particles pass through a memory cell, they can deposit enough charge to flip a bit from 0 to 1 or vice versa - a Single Event Upset (SEU). Without Earth's atmosphere and magnetic field for protection, these events occur frequently."
  },
  {
    scenario: "NASA is selecting memory technology for the Mars 2040 mission. The journey will take 9 months with no possibility of hardware repairs. They're comparing standard DRAM vs radiation-hardened SRAM.",
    question: "Why would NASA pay 100x more for radiation-hardened memory?",
    options: [
      { id: 'a', label: "Rad-hard memory is faster than standard memory" },
      { id: 'b', label: "Rad-hard memory cells have larger capacitance and resistant transistor geometries that require more energy to flip", correct: true },
      { id: 'c', label: "Standard memory cannot function in the cold of space" },
      { id: 'd', label: "Rad-hard memory has built-in encryption for security" }
    ],
    explanation: "Radiation-hardened memory uses larger transistors with more charge storage, making them harder to upset. They also use special manufacturing processes (SOI - Silicon on Insulator) that isolate transistors from charge deposition. This dramatically reduces SEU rates, critical for missions where a single bit flip could be catastrophic."
  },
  {
    scenario: "The Curiosity rover uses three identical processors running the same calculations. If two agree and one disagrees, the odd one out is reset and resynchronized.",
    question: "What is this fault-tolerance technique called?",
    options: [
      { id: 'a', label: "Dual modular redundancy (DMR)" },
      { id: 'b', label: "Triple modular redundancy (TMR) with voting", correct: true },
      { id: 'c', label: "Error correcting codes (ECC)" },
      { id: 'd', label: "Parity checking" }
    ],
    explanation: "Triple Modular Redundancy (TMR) runs three copies of critical systems and uses a voter circuit to select the majority result. If radiation corrupts one processor's output, the other two will still agree on the correct answer. TMR can tolerate any single-point failure, but costs 3x the hardware and power."
  },
  {
    scenario: "A chip designer notices that their 7nm processor experiences 10x more bit flips than their older 45nm design, even with the same radiation shielding.",
    question: "Why are smaller process nodes more susceptible to radiation effects?",
    options: [
      { id: 'a', label: "Smaller transistors run hotter and heat causes bit flips" },
      { id: 'b', label: "Smaller transistors store less charge, so less energy is needed to flip their state", correct: true },
      { id: 'c', label: "The smaller wires act as antennas picking up radiation" },
      { id: 'd', label: "7nm chips use different semiconductor materials" }
    ],
    explanation: "As transistors shrink, they hold less charge (fewer electrons represent a 0 or 1). A cosmic ray deposits roughly the same amount of charge regardless of transistor size, but that fixed charge is more likely to flip a smaller transistor. This is why cutting-edge consumer chips often can't be used in space without extensive mitigation."
  },
  {
    scenario: "A spacecraft uses ECC memory that can correct single-bit errors. However, the mission experiences a sudden burst of solar activity, and multiple bits flip in the same memory word simultaneously.",
    question: "What happens when multiple bits in the same ECC word are corrupted?",
    options: [
      { id: 'a', label: "ECC automatically corrects all errors regardless of count" },
      { id: 'b', label: "Standard ECC (SECDED) can detect but not correct multi-bit errors, triggering an alert", correct: true },
      { id: 'c', label: "The errors cancel each other out" },
      { id: 'd', label: "ECC prevents multiple bits from ever flipping together" }
    ],
    explanation: "Standard SECDED (Single Error Correct, Double Error Detect) ECC can only correct single-bit errors. When multiple bits flip in the same word, ECC can detect that something is wrong but cannot determine which bits to fix. This is why spacecraft often combine ECC with memory scrubbing and TMR for critical systems."
  },
  {
    scenario: "During a solar storm, the ISS temporarily powers down non-essential computers and puts critical systems into a protective 'safe mode' with reduced functionality.",
    question: "Why is reducing activity during solar storms an effective protection strategy?",
    options: [
      { id: 'a', label: "Fewer active transistors means fewer targets for radiation, and reduced operations mean errors are less likely to propagate", correct: true },
      { id: 'b', label: "The computers generate a magnetic field when running that attracts particles" },
      { id: 'c', label: "Solar storms only affect computers that are actively processing data" },
      { id: 'd', label: "Shutting down computers makes them immune to radiation" }
    ],
    explanation: "An active transistor storing data is vulnerable to being flipped. By reducing active circuits and putting systems in known-safe states, fewer bits can be corrupted. Additionally, running minimal operations means if an error does occur, there's less chance it will affect critical calculations before being detected."
  },
  {
    scenario: "A commercial satellite operator discovers their fleet experiences 3x more bit flips during certain times of year despite consistent solar activity.",
    question: "What orbital factor could cause this seasonal variation in bit flip rates?",
    options: [
      { id: 'a', label: "Temperature changes as the satellite moves closer to and farther from the sun" },
      { id: 'b', label: "The satellite's orbit passes through the South Atlantic Anomaly (SAA) more frequently during those periods", correct: true },
      { id: 'c', label: "Space dust is denser at certain times of year" },
      { id: 'd', label: "The satellite's solar panels interfere with memory when angled differently" }
    ],
    explanation: "The South Atlantic Anomaly is a region where Earth's inner Van Allen radiation belt comes closest to the surface. Satellites passing through the SAA experience dramatically higher radiation levels. Orbital mechanics can cause satellites to pass through this region more or less frequently depending on their orbital parameters and time of year."
  },
  {
    scenario: "A fault-tolerant spacecraft computer uses 'memory scrubbing' - periodically reading all memory locations and rewriting them even when the data isn't being used.",
    question: "Why is memory scrubbing essential for long-duration space missions?",
    options: [
      { id: 'a', label: "It defragments memory for better performance" },
      { id: 'b', label: "It detects and corrects accumulated single-bit errors before a second error makes them uncorrectable", correct: true },
      { id: 'c', label: "It keeps memory cells warm to prevent damage" },
      { id: 'd', label: "It creates backup copies of important data" }
    ],
    explanation: "ECC can correct single-bit errors, but if a second bit flips in the same word before the first is corrected, the data is lost. Memory scrubbing proactively reads all memory, triggering ECC correction on any single-bit errors before they can accumulate. This is critical for missions lasting months or years."
  },
  {
    scenario: "Engineers testing a spacecraft discover that energetic particles occasionally cause 'single event latchups' (SEL) - when a parasitic circuit path forms and draws excessive current, potentially destroying the chip.",
    question: "How do spacecraft protect against single event latchups?",
    options: [
      { id: 'a', label: "By using only low-power processors" },
      { id: 'b', label: "By adding current limiters and automatic power cycling to affected components", correct: true },
      { id: 'c', label: "By shielding chips with gold plating" },
      { id: 'd', label: "SELs cannot be protected against" }
    ],
    explanation: "Single Event Latchups can be destructive if current isn't limited quickly. Spacecraft use current-limiting circuits that detect abnormal power draw and automatically power-cycle the affected component before damage occurs. Radiation-hardened chips are also designed with guard rings and layout techniques to prevent latchup from occurring."
  },
  {
    scenario: "The James Webb Space Telescope operates at the L2 Lagrange point, 1.5 million km from Earth, where it's exposed to the full solar wind and cosmic ray environment without Earth's protection.",
    question: "Why did JWST engineers choose this challenging location despite the radiation risks?",
    options: [
      { id: 'a', label: "L2 has actually less radiation than low Earth orbit" },
      { id: 'b', label: "The scientific benefits of a stable thermal environment and continuous viewing outweigh the radiation challenges, which can be mitigated", correct: true },
      { id: 'c', label: "The telescope's gold mirrors reflect radiation away from electronics" },
      { id: 'd', label: "The cosmic microwave background at L2 provides natural shielding" }
    ],
    explanation: "L2 provides a stable thermal environment (critical for infrared observations) and allows continuous observation without Earth blocking the view. While radiation is higher, engineers designed robust fault tolerance: radiation-hardened processors, ECC memory, TMR for critical functions, and sophisticated autonomous recovery capabilities."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🛰️',
    title: 'Satellite Communications',
    short: 'Keeping global communications reliable',
    tagline: 'When a bit flip means a dropped call',
    description: 'Communication satellites in geostationary orbit (36,000 km) relay phone calls, TV broadcasts, and internet data. These satellites must operate for 15+ years with zero maintenance, surviving continuous bombardment by solar particles and cosmic rays.',
    connection: 'A bit flip in the routing tables could misdirect thousands of phone calls. A corrupted packet could cause video glitches seen by millions. TMR and ECC ensure data integrity across billions of transmissions daily.',
    howItWorks: 'Modern comsats use radiation-hardened processors with TMR for critical control systems. Payload processors handling user data employ aggressive ECC and automatic error recovery. Solar storm events trigger safe modes to protect sensitive circuits.',
    stats: [
      { value: '15+ yrs', label: 'Mission lifetime', icon: '⏱️' },
      { value: '10^15', label: 'Bits processed/day', icon: '📡' },
      { value: '<10^-12', label: 'Allowed error rate', icon: '🎯' }
    ],
    examples: ['Starlink satellites', 'DirectTV broadcasts', 'GPS constellation', 'Military SATCOM'],
    companies: ['SpaceX', 'Lockheed Martin', 'Boeing', 'Northrop Grumman'],
    futureImpact: 'Mega-constellations of thousands of satellites will require even more sophisticated autonomous fault handling.',
    color: '#3B82F6'
  },
  {
    icon: '🚀',
    title: 'Deep Space Exploration',
    short: 'Voyager to Mars and beyond',
    tagline: 'No tech support at 20 billion kilometers',
    description: 'Deep space probes like Voyager, New Horizons, and Mars rovers operate in extreme radiation environments for decades. With communication delays of hours, these spacecraft must autonomously detect and correct radiation-induced errors.',
    connection: 'Voyager 1, launched in 1977, still operates at 24 billion km from Earth. Its vintage 1970s processors have survived countless cosmic ray hits thanks to careful redundancy design. A single uncorrected bit flip could end a 47-year mission.',
    howItWorks: 'Deep space probes use multiple redundant computers (often 2-4 copies), rad-hard memory, and extensive error detection. They implement "safe mode" protocols that automatically stabilize the spacecraft if the main computer becomes corrupted, then attempt recovery.',
    stats: [
      { value: '47 yrs', label: 'Voyager 1 mission', icon: '🛸' },
      { value: '24B km', label: 'From Earth', icon: '🌍' },
      { value: '22 hrs', label: 'Signal round-trip', icon: '📻' }
    ],
    examples: ['Voyager 1 & 2', 'New Horizons', 'Perseverance Rover', 'Juno at Jupiter'],
    companies: ['NASA JPL', 'ESA', 'JAXA', 'ISRO'],
    futureImpact: 'Future interstellar probes will need to operate autonomously for centuries with no possibility of repair or reprogramming.',
    color: '#8B5CF6'
  },
  {
    icon: '🧑‍🚀',
    title: 'Human Spaceflight',
    short: 'Keeping astronauts alive',
    tagline: 'Where computer failure means life or death',
    description: 'Life support systems, navigation computers, and spacecraft controls for crewed missions must be absolutely reliable. The International Space Station and future lunar/Mars missions depend on fault-tolerant computing.',
    connection: 'The ISS uses multiple redundant flight computers that vote on every critical decision. A radiation-induced error in life support or attitude control could be catastrophic. TMR ensures no single failure can endanger the crew.',
    howItWorks: 'The ISS uses triple-redundant Multiplexer/Demultiplexer (MDM) computers for critical functions. Each MDM contains multiple processor cards that vote. Ground controllers continuously monitor for anomalies, and the crew can manually override computer decisions.',
    stats: [
      { value: '24 yrs', label: 'ISS operational', icon: '🏠' },
      { value: '0', label: 'Acceptable failures', icon: '⚠️' },
      { value: '52', label: 'Onboard computers', icon: '💻' }
    ],
    examples: ['International Space Station', 'SpaceX Dragon', 'Orion capsule', 'Lunar Gateway'],
    companies: ['NASA', 'SpaceX', 'Boeing', 'ESA'],
    futureImpact: 'Mars missions with 20-minute communication delays will require unprecedented autonomous fault handling.',
    color: '#10B981'
  },
  {
    icon: '🔬',
    title: 'Particle Physics Experiments',
    short: 'Computing in artificial radiation storms',
    tagline: 'Designing chips to survive the LHC',
    description: 'Particle accelerators like CERN\'s Large Hadron Collider create some of the most intense radiation environments on Earth. Detectors placed just meters from particle collisions must survive radiation levels similar to deep space.',
    connection: 'The ATLAS and CMS detectors at the LHC contain millions of radiation-hardened sensor chips. These chips must correctly record particle collisions happening 40 million times per second, despite constant radiation bombardment.',
    howItWorks: 'LHC detectors use custom ASICs designed with radiation-tolerant techniques: enclosed transistor layouts, TMR for critical logic, and self-correcting architectures. Regular calibration and on-the-fly error correction maintain data quality.',
    stats: [
      { value: '40M/s', label: 'Collision rate', icon: '💥' },
      { value: '10^15', label: 'Particles detected/year', icon: '🔬' },
      { value: '150M', label: 'Sensor channels', icon: '📊' }
    ],
    examples: ['ATLAS detector', 'CMS detector', 'Belle II', 'Nuclear reactor monitoring'],
    companies: ['CERN', 'Fermilab', 'KEK', 'SLAC'],
    futureImpact: 'Next-generation accelerators will require even more radiation-tolerant electronics for frontier physics.',
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const SpaceRadiationRenderer: React.FC<SpaceRadiationRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Memory simulation state
  const [memoryBits, setMemoryBits] = useState<number[]>(Array(32).fill(0).map(() => Math.random() > 0.5 ? 1 : 0));
  const [protectionMode, setProtectionMode] = useState<'none' | 'ecc' | 'tmr'>('none');
  const [faultRate, setFaultRate] = useState(0.5); // faults per second
  const [processNode, setProcessNode] = useState(45); // nm
  const [animationFrame, setAnimationFrame] = useState(0);
  const [bitFlipPositions, setBitFlipPositions] = useState<number[]>([]);
  const [correctedBits, setCorrectedBits] = useState<number[]>([]);
  const [totalErrors, setTotalErrors] = useState(0);
  const [correctedErrors, setCorrectedErrors] = useState(0);
  const [uncorrectedErrors, setUncorrectedErrors] = useState(0);
  const [missionTime, setMissionTime] = useState(0); // seconds
  const [missionSuccess, setMissionSuccess] = useState(true);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);

  // TMR state (three copies of memory for voting)
  const [tmrMemory1, setTmrMemory1] = useState<number[]>([]);
  const [tmrMemory2, setTmrMemory2] = useState<number[]>([]);
  const [tmrMemory3, setTmrMemory3] = useState<number[]>([]);
  const [tmrVotes, setTmrVotes] = useState<number[]>([]);

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
      setAnimationFrame(f => f + 1);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Fault injection simulation
  useEffect(() => {
    if (!isSimulationRunning || (phase !== 'play' && phase !== 'twist_play')) return;

    const adjustedFaultRate = phase === 'twist_play'
      ? faultRate * (45 / processNode) * (45 / processNode) // Smaller nodes = more faults (quadratic)
      : faultRate;

    const faultTimer = setInterval(() => {
      setMissionTime(t => t + 1);

      // Random fault injection based on rate
      if (Math.random() < adjustedFaultRate / 10) {
        const faultPosition = Math.floor(Math.random() * 32);
        setTotalErrors(e => e + 1);

        if (protectionMode === 'none') {
          // No protection - bit flips and corrupts data
          setMemoryBits(prev => {
            const newBits = [...prev];
            newBits[faultPosition] = newBits[faultPosition] ^ 1;
            return newBits;
          });
          setBitFlipPositions(prev => [...prev, faultPosition]);
          setUncorrectedErrors(e => e + 1);

          // Check for mission failure (too many errors)
          if (Math.random() < 0.3) {
            setMissionSuccess(false);
          }
        } else if (protectionMode === 'ecc') {
          // ECC - can correct single bit errors
          setBitFlipPositions(prev => [...prev, faultPosition]);
          setCorrectedBits(prev => [...prev, faultPosition]);
          setCorrectedErrors(e => e + 1);

          // ECC has a small chance of multi-bit error during high radiation
          if (adjustedFaultRate > 1 && Math.random() < 0.1) {
            setUncorrectedErrors(e => e + 1);
            setMemoryBits(prev => {
              const newBits = [...prev];
              newBits[faultPosition] = newBits[faultPosition] ^ 1;
              return newBits;
            });
          }
        } else if (protectionMode === 'tmr') {
          // TMR - voting corrects single system failures
          setBitFlipPositions(prev => [...prev, faultPosition]);

          // Flip bit in one of the three copies
          const copyToCorrupt = Math.floor(Math.random() * 3);
          if (copyToCorrupt === 0) {
            setTmrMemory1(prev => {
              const newBits = [...prev];
              newBits[faultPosition] = newBits[faultPosition] ^ 1;
              return newBits;
            });
          } else if (copyToCorrupt === 1) {
            setTmrMemory2(prev => {
              const newBits = [...prev];
              newBits[faultPosition] = newBits[faultPosition] ^ 1;
              return newBits;
            });
          } else {
            setTmrMemory3(prev => {
              const newBits = [...prev];
              newBits[faultPosition] = newBits[faultPosition] ^ 1;
              return newBits;
            });
          }

          // Voting always corrects (unless 2+ copies corrupted)
          setCorrectedBits(prev => [...prev, faultPosition]);
          setCorrectedErrors(e => e + 1);
        }

        // Clear visual indicators after short delay
        setTimeout(() => {
          setBitFlipPositions([]);
          setCorrectedBits([]);
        }, 500);
      }
    }, 100);

    return () => clearInterval(faultTimer);
  }, [isSimulationRunning, phase, faultRate, processNode, protectionMode]);

  // Initialize TMR memory when mode changes
  useEffect(() => {
    if (protectionMode === 'tmr') {
      setTmrMemory1([...memoryBits]);
      setTmrMemory2([...memoryBits]);
      setTmrMemory3([...memoryBits]);
    }
  }, [protectionMode, memoryBits]);

  // Calculate TMR votes
  useEffect(() => {
    if (protectionMode === 'tmr' && tmrMemory1.length > 0) {
      const votes = tmrMemory1.map((bit, i) => {
        const sum = bit + (tmrMemory2[i] || 0) + (tmrMemory3[i] || 0);
        return sum >= 2 ? 1 : 0; // Majority vote
      });
      setTmrVotes(votes);
    }
  }, [tmrMemory1, tmrMemory2, tmrMemory3, protectionMode]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F59E0B', // Orange/gold for radiation theme
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
    bitZero: '#374151',
    bitOne: '#3B82F6',
    radiation: '#F59E0B',
    corrected: '#10B981',
    corrupted: '#EF4444',
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
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Process Node Lab',
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
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, []);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    setMemoryBits(Array(32).fill(0).map(() => Math.random() > 0.5 ? 1 : 0));
    setBitFlipPositions([]);
    setCorrectedBits([]);
    setTotalErrors(0);
    setCorrectedErrors(0);
    setUncorrectedErrors(0);
    setMissionTime(0);
    setMissionSuccess(true);
    setIsSimulationRunning(false);
  }, []);

  // Calculate mission success probability based on settings
  const calculateMissionSuccessProbability = useCallback(() => {
    const baseFaultRate = phase === 'twist_play'
      ? faultRate * (45 / processNode) * (45 / processNode)
      : faultRate;

    let successProb = 1;
    const missionDuration = 1000; // simulated mission time
    const expectedFaults = baseFaultRate * missionDuration / 10;

    if (protectionMode === 'none') {
      // Without protection, any fault can cause failure
      successProb = Math.exp(-expectedFaults * 0.3);
    } else if (protectionMode === 'ecc') {
      // ECC protects against single-bit errors
      successProb = Math.exp(-expectedFaults * 0.03);
    } else if (protectionMode === 'tmr') {
      // TMR protects against single-system failures
      successProb = Math.exp(-expectedFaults * 0.003);
    }

    return Math.max(0, Math.min(100, successProb * 100));
  }, [faultRate, processNode, protectionMode, phase]);

  // Memory visualization component
  const MemoryVisualization = () => {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: '4px',
        padding: '16px',
        background: colors.bgSecondary,
        borderRadius: '12px',
      }}>
        {memoryBits.map((bit, i) => {
          const isFlipping = bitFlipPositions.includes(i);
          const isCorrected = correctedBits.includes(i);

          return (
            <div
              key={i}
              style={{
                width: isMobile ? '28px' : '36px',
                height: isMobile ? '28px' : '36px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '12px' : '14px',
                fontWeight: 700,
                fontFamily: 'monospace',
                background: isFlipping
                  ? (isCorrected ? colors.corrected : colors.corrupted)
                  : (bit === 1 ? colors.bitOne : colors.bitZero),
                color: colors.textPrimary,
                border: `1px solid ${isFlipping ? (isCorrected ? colors.corrected : colors.corrupted) : colors.border}`,
                boxShadow: isFlipping ? `0 0 8px ${isCorrected ? colors.corrected : colors.corrupted}` : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {bit}
            </div>
          );
        })}
      </div>
    );
  };

  // TMR Memory Visualization
  const TMRVisualization = () => {
    const renderMemoryRow = (memory: number[], label: string, color: string) => (
      <div style={{ marginBottom: '8px' }}>
        <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>{label}</div>
        <div style={{
          display: 'flex',
          gap: '2px',
          flexWrap: 'wrap',
        }}>
          {memory.slice(0, 16).map((bit, i) => {
            const originalBit = memoryBits[i];
            const isCorrupted = bit !== originalBit;

            return (
              <div
                key={i}
                style={{
                  width: isMobile ? '18px' : '22px',
                  height: isMobile ? '18px' : '22px',
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? '10px' : '11px',
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  background: isCorrupted ? colors.corrupted : color,
                  color: colors.textPrimary,
                  border: `1px solid ${isCorrupted ? colors.corrupted : colors.border}`,
                }}
              >
                {bit}
              </div>
            );
          })}
        </div>
      </div>
    );

    return (
      <div style={{
        padding: '16px',
        background: colors.bgSecondary,
        borderRadius: '12px',
      }}>
        {renderMemoryRow(tmrMemory1, 'Copy 1', colors.bitOne)}
        {renderMemoryRow(tmrMemory2, 'Copy 2', '#8B5CF6')}
        {renderMemoryRow(tmrMemory3, 'Copy 3', '#EC4899')}
        <div style={{
          marginTop: '12px',
          padding: '8px',
          background: colors.success + '22',
          borderRadius: '8px',
          border: `1px solid ${colors.success}33`,
        }}>
          <div style={{ ...typo.small, color: colors.success, marginBottom: '4px' }}>Voted Output (Majority)</div>
          <div style={{
            display: 'flex',
            gap: '2px',
            flexWrap: 'wrap',
          }}>
            {tmrVotes.slice(0, 16).map((bit, i) => (
              <div
                key={i}
                style={{
                  width: isMobile ? '18px' : '22px',
                  height: isMobile ? '18px' : '22px',
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? '10px' : '11px',
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  background: colors.success,
                  color: colors.textPrimary,
                }}
              >
                {bit}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Cosmic ray animation
  const CosmicRayAnimation = () => {
    const rays = Array(5).fill(0).map((_, i) => ({
      x: (animationFrame * 3 + i * 60) % 400,
      y: (animationFrame * 2 + i * 40) % 200,
      size: 2 + Math.random() * 3,
    }));

    return (
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          opacity: 0.6,
        }}
      >
        {rays.map((ray, i) => (
          <g key={i}>
            <circle
              cx={ray.x}
              cy={ray.y}
              r={ray.size}
              fill={colors.radiation}
              opacity={0.8}
            />
            <line
              x1={ray.x - 10}
              y1={ray.y - 10}
              x2={ray.x}
              y2={ray.y}
              stroke={colors.radiation}
              strokeWidth="1"
              opacity={0.5}
            />
          </g>
        ))}
      </svg>
    );
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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
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

  // Bottom navigation bar
  const renderBottomNav = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const canGoBack = currentIndex > 0;
    const canGoNext = currentIndex < phaseOrder.length - 1;

    // Don't show during test phase
    if (phase === 'test' && !testSubmitted) return null;

    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.bgCard,
        borderTop: `1px solid ${colors.border}`,
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 50,
      }}>
        <button
          onClick={() => canGoBack && goToPhase(phaseOrder[currentIndex - 1])}
          disabled={!canGoBack}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: 'transparent',
            color: canGoBack ? colors.textSecondary : colors.textMuted,
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: 500,
            opacity: canGoBack ? 1 : 0.5,
          }}
        >
          ← Back
        </button>

        {canGoNext && (
          <button
            onClick={() => nextPhase()}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: colors.accent,
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            Next →
          </button>
        )}
      </div>
    );
  };

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #D97706)`,
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

  // Animation keyframes
  const keyframes = `
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.1); opacity: 0.8; }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 5px ${colors.accent}; }
      50% { box-shadow: 0 0 20px ${colors.accent}; }
    }
    @keyframes flash {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `;

  // -----------------------------------------------------------------------------
  // PHASE RENDERS
  // -----------------------------------------------------------------------------

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
        <style>{keyframes}</style>

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s ease-in-out infinite',
        }}>
          ☢️🛰️
        </div>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Space Radiation & Bit Flips
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Is space radiation just <span style={{ color: colors.radiation }}>dangerous to humans</span>? Or is it also attacking the computers that keep spacecraft alive?"
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
            "Every hour, cosmic rays flip hundreds of bits in a typical spacecraft's memory. Without protection, the computer would crash within days. With proper design, missions like Voyager have survived for 47 years."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            — NASA Jet Propulsion Laboratory
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Discover Why Spacecraft Survive
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Cosmic rays pass through electronics without any effect' },
      { id: 'b', text: 'Cosmic rays deposit charge in transistors, potentially flipping stored bits' },
      { id: 'c', text: 'Cosmic rays only affect solar panels, not computer chips' },
    ];

    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: colors.bgPrimary,
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <style>{keyframes}</style>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '100px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 24px' }}>
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

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              When a high-energy cosmic ray passes through a computer chip, what happens?
            </h2>

          {/* SVG Visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <svg viewBox="0 0 600 300" style={{ width: '100%', maxWidth: '600px', height: 'auto', display: 'block', margin: '0 auto' }}>
              <defs>
                <linearGradient id="chipBg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
                <filter id="shadowFilter">
                  <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.3"/>
                </filter>
              </defs>

              {/* Cosmic Ray */}
              <g>
                <line x1="100" y1="20" x2="200" y2="120" stroke={colors.radiation} strokeWidth="4" opacity="0.8" />
                <circle cx="200" cy="120" r="6" fill={colors.radiation} />
                <text x="100" y="15" fill={colors.radiation} fontSize="14" fontWeight="600">Cosmic Ray</text>
                <text x="100" y="35" fill={colors.textMuted} fontSize="11">(High Energy)</text>
              </g>

              {/* Memory Chip */}
              <rect x="180" y="110" width="240" height="140" rx="12" fill="url(#chipBg)" stroke={colors.border} strokeWidth="2" filter="url(#shadowFilter)" />
              <text x="300" y="135" textAnchor="middle" fill={colors.textSecondary} fontSize="13" fontWeight="600">Memory Chip</text>

              {/* Memory bits */}
              <g>
                <rect x="210" y="160" width="30" height="30" rx="4" fill={colors.bitOne} stroke={colors.border} />
                <text x="225" y="182" textAnchor="middle" fill="white" fontSize="16" fontWeight="700" fontFamily="monospace">1</text>

                <rect x="250" y="160" width="30" height="30" rx="4" fill={colors.bitZero} stroke={colors.border} />
                <text x="265" y="182" textAnchor="middle" fill="white" fontSize="16" fontWeight="700" fontFamily="monospace">0</text>

                <rect x="290" y="160" width="30" height="30" rx="4" fill={colors.bitOne} stroke={colors.border} />
                <text x="305" y="182" textAnchor="middle" fill="white" fontSize="16" fontWeight="700" fontFamily="monospace">1</text>

                <rect x="330" y="160" width="30" height="30" rx="4" fill={colors.bitOne} stroke={colors.error} strokeWidth="2" />
                <text x="345" y="182" textAnchor="middle" fill={colors.error} fontSize="20" fontWeight="700">?</text>

                <rect x="370" y="160" width="30" height="30" rx="4" fill={colors.bitZero} stroke={colors.border} />
                <text x="385" y="182" textAnchor="middle" fill="white" fontSize="16" fontWeight="700" fontFamily="monospace">0</text>
              </g>

              <text x="300" y="215" textAnchor="middle" fill={colors.textMuted} fontSize="12">
                What happens to the fourth bit?
              </text>

              {/* Question mark indicator */}
              <g>
                <circle cx="470" y="180" r="25" fill={colors.accent + '22'} stroke={colors.accent} strokeWidth="2" />
                <text x="470" y="192" textAnchor="middle" fill={colors.accent} fontSize="28" fontWeight="700">?</text>
              </g>

              <text x="300" y="280" textAnchor="middle" fill={colors.textSecondary} fontSize="14" fontStyle="italic">
                Make your prediction below
              </text>
            </svg>
          </div>

          {/* Options */}
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
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                  color: prediction === opt.id ? 'white' : colors.textSecondary,
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
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              See the Reality
            </button>
          )}
          </div>
        </div>

        {renderBottomNav()}
        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Fault Injection Simulation
  if (phase === 'play') {
    const missionSuccessProb = calculateMissionSuccessProbability();

    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: colors.bgPrimary,
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <style>{keyframes}</style>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '100px',
        }}>
          <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Radiation Fault Injection Lab
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Watch how cosmic rays corrupt memory. <strong style={{ color: colors.accent }}>As radiation intensity increases, more bits flip.</strong> ECC and TMR protection schemes automatically detect and correct errors, keeping the mission alive.
            </p>

            {/* SVG Visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.small, color: colors.textMuted, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Memory Corruption Visualization
              </h3>

              <svg
                viewBox="0 0 800 400"
                style={{ width: '100%', maxWidth: '800px', height: 'auto', display: 'block' }}
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <linearGradient id="memoryGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={colors.bitOne} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={colors.bitOne} stopOpacity="0.1" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <linearGradient id="chipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1e293b" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>
                </defs>

                {/* Spacecraft */}
                <g>
                  <rect x="50" y="50" width="300" height="200" rx="20" fill="url(#chipGrad)" stroke={colors.border} strokeWidth="2" />
                  <text x="200" y="85" textAnchor="middle" fill={colors.textSecondary} fontSize="14" fontWeight="600">
                    Spacecraft Computer
                  </text>

                  {/* Memory cells grid */}
                  {memoryBits.slice(0, 16).map((bit, i) => {
                    const row = Math.floor(i / 8);
                    const col = i % 8;
                    const isFlipping = bitFlipPositions.includes(i);
                    const isCorrected = correctedBits.includes(i);
                    return (
                      <g key={i}>
                        <rect
                          x={80 + col * 28}
                          y={110 + row * 45}
                          width="24"
                          height="24"
                          rx="4"
                          fill={isFlipping ? (isCorrected ? colors.corrected : colors.corrupted) : (bit === 1 ? colors.bitOne : colors.bitZero)}
                          stroke={isFlipping ? (isCorrected ? colors.corrected : colors.corrupted) : colors.border}
                          strokeWidth={isFlipping ? "2" : "1"}
                          filter={isFlipping ? "url(#glow)" : "none"}
                        />
                        <text
                          x={92 + col * 28}
                          y={127 + row * 45}
                          textAnchor="middle"
                          fill="white"
                          fontSize="12"
                          fontWeight="700"
                          fontFamily="monospace"
                        >
                          {bit}
                        </text>
                      </g>
                    );
                  })}
                </g>

                {/* Cosmic rays - varies with radiation intensity */}
                <g>
                  {[...Array(Math.ceil(faultRate * 5))].map((_, i) => (
                    <g key={i}>
                      <line
                        x1={100 + i * 80}
                        y1={isSimulationRunning && animationFrame % 20 < 10 ? 0 : -20}
                        x2={120 + i * 80}
                        y2={isSimulationRunning && animationFrame % 20 < 10 ? 80 : 60}
                        stroke={colors.radiation}
                        strokeWidth="3"
                        opacity={isSimulationRunning ? 0.7 : 0.3}
                      />
                      <circle
                        cx={120 + i * 80}
                        cy={80}
                        r="4"
                        fill={colors.radiation}
                        filter="url(#glow)"
                        opacity={isSimulationRunning ? 1 : 0.3}
                      />
                    </g>
                  ))}
                  {/* Intensity indicator */}
                  <text x="400" y="30" fill={colors.radiation} fontSize="12" fontWeight="600">
                    Intensity: {(faultRate * 10).toFixed(1)}/10
                  </text>
                </g>

                {/* Protection Mode Indicator */}
                <g>
                  <rect x="420" y="50" width="330" height="200" rx="20" fill="url(#chipGrad)" stroke={colors.border} strokeWidth="2" />
                  <text x="585" y="85" textAnchor="middle" fill={colors.textSecondary} fontSize="14" fontWeight="600">
                    Protection: {protectionMode === 'none' ? 'None' : protectionMode === 'ecc' ? 'ECC' : 'TMR'}
                  </text>

                  {protectionMode === 'none' && (
                    <text x="585" y="150" textAnchor="middle" fill={colors.error} fontSize="16">
                      ⚠️ No Protection
                    </text>
                  )}

                  {protectionMode === 'ecc' && (
                    <g>
                      <rect x="480" y="120" width="200" height="40" rx="8" fill={colors.warning + '22'} stroke={colors.warning} strokeWidth="2" />
                      <text x="580" y="145" textAnchor="middle" fill={colors.warning} fontSize="14" fontWeight="600">
                        Single-bit correction active
                      </text>
                    </g>
                  )}

                  {protectionMode === 'tmr' && (
                    <g>
                      <circle cx="520" cy="140" r="15" fill={colors.success + '44'} stroke={colors.success} strokeWidth="2" />
                      <circle cx="585" cy="140" r="15" fill={colors.success + '44'} stroke={colors.success} strokeWidth="2" />
                      <circle cx="650" cy="140" r="15" fill={colors.success + '44'} stroke={colors.success} strokeWidth="2" />
                      <text x="585" y="180" textAnchor="middle" fill={colors.success} fontSize="12">
                        Triple redundancy voting
                      </text>
                    </g>
                  )}

                  {/* Stats */}
                  <text x="460" y="220" fill={colors.textMuted} fontSize="12">
                    Errors: {totalErrors} | Corrected: {correctedErrors}
                  </text>
                </g>

                {/* Legend */}
                <g>
                  <text x="50" y="290" fill={colors.textMuted} fontSize="12" fontWeight="600">Legend:</text>
                  <rect x="50" y="300" width="20" height="20" rx="4" fill={colors.bitZero} stroke={colors.border} />
                  <text x="75" y="315" fill={colors.textSecondary} fontSize="12">Bit = 0</text>

                  <rect x="150" y="300" width="20" height="20" rx="4" fill={colors.bitOne} stroke={colors.border} />
                  <text x="175" y="315" fill={colors.textSecondary} fontSize="12">Bit = 1</text>

                  <rect x="250" y="300" width="20" height="20" rx="4" fill={colors.corrupted} stroke={colors.corrupted} strokeWidth="2" filter="url(#glow)" />
                  <text x="275" y="315" fill={colors.textSecondary} fontSize="12">Corrupted</text>

                  <rect x="370" y="300" width="20" height="20" rx="4" fill={colors.corrected} stroke={colors.corrected} strokeWidth="2" filter="url(#glow)" />
                  <text x="395" y="315" fill={colors.textSecondary} fontSize="12">Corrected</text>

                  <line x1="550" y1="305" x2="570" y2="315" stroke={colors.radiation} strokeWidth="3" opacity="0.7" />
                  <text x="575" y="315" fill={colors.textSecondary} fontSize="12">Cosmic Ray</text>
                </g>

                <text x="50" y="360" fill={colors.textMuted} fontSize="14" fontStyle="italic">
                  Key Insight: {protectionMode === 'none' ? 'Without protection, each radiation hit causes permanent data corruption.' :
                    protectionMode === 'ecc' ? 'ECC detects and fixes single-bit errors automatically.' :
                    'TMR uses voting — if one copy is corrupted, the other two outvote it.'}
                </text>
              </svg>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              {isSimulationRunning && <CosmicRayAnimation />}

              {/* Protection Mode Selector */}
              <div>
                <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '12px' }}>
                  <strong>Protection Mode:</strong> Choose how the spacecraft defends against radiation
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'none', label: 'No Protection', color: colors.error },
                    { id: 'ecc', label: 'ECC Memory', color: colors.warning },
                    { id: 'tmr', label: 'Triple Redundancy (TMR)', color: colors.success },
                  ].map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => {
                        playSound('click');
                        setProtectionMode(mode.id as 'none' | 'ecc' | 'tmr');
                        resetSimulation();
                      }}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '8px',
                        border: `2px solid ${protectionMode === mode.id ? mode.color : colors.border}`,
                        background: protectionMode === mode.id ? mode.color + '22' : 'transparent',
                        color: protectionMode === mode.id ? mode.color : colors.textSecondary,
                        cursor: 'pointer',
                        fontWeight: protectionMode === mode.id ? 600 : 400,
                        fontSize: '14px',
                      }}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fault Rate Slider */}
              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}><strong>Radiation Intensity:</strong> Solar storms vs deep space</span>
                  <span style={{ ...typo.small, color: colors.radiation, fontWeight: 600 }}>
                    {faultRate.toFixed(1)} faults/sec ({faultRate < 0.3 ? 'Low' : faultRate < 0.7 ? 'Medium' : 'High'})
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={faultRate}
                  onChange={(e) => setFaultRate(parseFloat(e.target.value))}
                  onInput={(e) => setFaultRate(parseFloat((e.target.value)))}
                  style={{
                    width: '100%',
                    height: '20px',
                    borderRadius: '4px',
                    background: `linear-gradient(to right, ${colors.success}, ${colors.warning}, ${colors.error})`,
                    cursor: 'pointer',
                    accentColor: colors.radiation,
                    touchAction: 'pan-y',
                    WebkitAppearance: 'none',
                  } as React.CSSProperties}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.success }}>0.1 Low</span>
                  <span style={{ ...typo.small, color: colors.error }}>1.0 High</span>
                </div>
              </div>

              {/* Formula Display */}
              <div style={{
                background: `${colors.accent}11`,
                borderRadius: '8px',
                padding: '12px',
                marginTop: '16px',
                border: `1px solid ${colors.accent}33`,
              }}>
                <p style={{ ...typo.small, color: colors.accent, marginBottom: '4px', fontWeight: 600 }}>
                  Error Rate Formula:
                </p>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  color: colors.textPrimary,
                  marginBottom: '4px',
                }}>
                  P(failure) = 1 - e<sup>-λt</sup>
                </div>
                <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                  Where λ = fault rate × (1/Q<sub>crit</sub>), and protection reduces λ by 10x (ECC) or 100x (TMR)
                </p>
              </div>

              {/* Statistics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
                marginTop: '20px',
              }}>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.textPrimary }}>{totalErrors}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Total Events</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.success }}>{correctedErrors}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Corrected</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.error }}>{uncorrectedErrors}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Corrupted</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: missionSuccessProb > 90 ? colors.success : missionSuccessProb > 50 ? colors.warning : colors.error }}>
                    {missionSuccessProb.toFixed(0)}%
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Success Prob.</div>
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
                <button
                  onClick={() => {
                    playSound('click');
                    setIsSimulationRunning(!isSimulationRunning);
                  }}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isSimulationRunning ? colors.error : colors.success,
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                  }}
                >
                  {isSimulationRunning ? 'Stop Simulation' : 'Start Radiation'}
                </button>
                <button
                  onClick={() => {
                    playSound('click');
                    resetSimulation();
                  }}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    background: 'transparent',
                    color: colors.textSecondary,
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Educational Hint */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.accent }}>Try this:</strong> Start with "No Protection" and high radiation. Watch bits flip red and stay corrupted. Then switch to ECC — see how it detects and fixes single-bit errors. Finally, try TMR for maximum reliability!
              </p>
            </div>
          </div>
        </div>

        {renderBottomNav()}
        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const options = [
      { id: 'a', text: 'Cosmic rays pass through electronics without any effect' },
      { id: 'b', text: 'Cosmic rays deposit charge in transistors, potentially flipping stored bits' },
      { id: 'c', text: 'Cosmic rays only affect solar panels, not computer chips' },
    ];

    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: colors.bgPrimary,
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <style>{keyframes}</style>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '100px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
              The Physics of Single Event Upsets
            </h2>

            {/* Connection to prediction */}
            <div style={{
              background: prediction === 'b' ? `${colors.success}22` : `${colors.warning}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${prediction === 'b' ? colors.success : colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: prediction === 'b' ? colors.success : colors.textSecondary, margin: 0 }}>
                {prediction === 'b'
                  ? '✓ You predicted correctly! Cosmic rays DO deposit charge in transistors and flip bits.'
                  : `You predicted: "${options.find(o => o.id === prediction)?.text}". Here's what actually happens...`}
              </p>
            </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>
              How Cosmic Rays Flip Bits
            </h3>

            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                When a high-energy particle (cosmic ray or solar proton) passes through silicon, it ionizes atoms along its path, creating a trail of free electrons and holes. This is the <strong>mechanism</strong> you observed in the simulation.
              </p>

              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                textAlign: 'center',
              }}>
                <div style={{ fontFamily: 'monospace', fontSize: isMobile ? '14px' : '16px', color: colors.textPrimary }}>
                  Particle → Si atoms → e⁻ + holes → Charge injection → <span style={{ color: colors.error }}>Bit Flip</span>
                </div>
              </div>

              <p style={{ marginBottom: '16px' }}>
                If enough charge (called the <strong style={{ color: colors.accent }}>critical charge Q<sub>crit</sub></strong>) is deposited in a memory cell, it can change a stored 0 to 1 or vice versa. This is a <strong style={{ color: colors.error }}>Single Event Upset (SEU)</strong>.
              </p>

              {/* Formula */}
              <div style={{
                background: `${colors.accent}11`,
                borderRadius: '8px',
                padding: '16px',
                marginTop: '16px',
                border: `1px solid ${colors.accent}33`,
              }}>
                <p style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                  Critical Charge Formula:
                </p>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: isMobile ? '16px' : '18px',
                  color: colors.textPrimary,
                  textAlign: 'center',
                  marginBottom: '8px',
                }}>
                  Q<sub>crit</sub> = C × V<sub>DD</sub>
                </div>
                <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                  Where C is the node capacitance and V<sub>DD</sub> is the supply voltage. Smaller transistors have lower C, making them more vulnerable.
                </p>
              </div>

              <div style={{
                background: `${colors.accent}11`,
                borderRadius: '8px',
                padding: '16px',
                marginTop: '16px',
                border: `1px solid ${colors.accent}33`,
              }}>
                <p style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                  SEU Rate Relationship:
                </p>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: isMobile ? '16px' : '18px',
                  color: colors.textPrimary,
                  textAlign: 'center',
                  marginBottom: '8px',
                }}>
                  SEU Rate ∝ Flux × Cross-section / Q<sub>crit</sub>
                </div>
                <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                  Error rate increases with particle flux and sensitive area, but decreases with higher critical charge (better shielding).
                </p>
              </div>
            </div>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>
              Space Radiation Environment
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '16px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                padding: '16px',
                borderRadius: '8px',
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>☀️</div>
                <h4 style={{ ...typo.small, color: colors.radiation, fontWeight: 600 }}>Solar Particle Events</h4>
                <p style={{ ...typo.small, color: colors.textMuted }}>
                  Protons from solar flares can increase radiation levels by 1000x during storms
                </p>
              </div>
              <div style={{
                background: colors.bgSecondary,
                padding: '16px',
                borderRadius: '8px',
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>✨</div>
                <h4 style={{ ...typo.small, color: colors.radiation, fontWeight: 600 }}>Galactic Cosmic Rays</h4>
                <p style={{ ...typo.small, color: colors.textMuted }}>
                  High-energy particles from outside our solar system - constant background flux
                </p>
              </div>
              <div style={{
                background: colors.bgSecondary,
                padding: '16px',
                borderRadius: '8px',
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🧲</div>
                <h4 style={{ ...typo.small, color: colors.radiation, fontWeight: 600 }}>Van Allen Belts</h4>
                <p style={{ ...typo.small, color: colors.textMuted }}>
                  Trapped particles around Earth - satellites must pass through carefully
                </p>
              </div>
              <div style={{
                background: colors.bgSecondary,
                padding: '16px',
                borderRadius: '8px',
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚛️</div>
                <h4 style={{ ...typo.small, color: colors.radiation, fontWeight: 600 }}>Secondary Particles</h4>
                <p style={{ ...typo.small, color: colors.textMuted }}>
                  Shielding can create showers of secondary particles - sometimes worse than no shield!
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore Process Node Effects
          </button>
          </div>
        </div>

        {renderBottomNav()}
        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Smaller transistors are more resistant because they present smaller targets' },
      { id: 'b', text: 'Smaller transistors are more vulnerable because they hold less charge' },
      { id: 'c', text: 'Transistor size has no effect on radiation sensitivity' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}
        <style>{keyframes}</style>

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Challenge: Process Node Size
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Modern chips use 7nm or 5nm transistors instead of older 45nm. How does this affect radiation sensitivity?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <svg viewBox="0 0 600 300" style={{ width: '100%', maxWidth: '600px', height: 'auto', display: 'block', margin: '0 auto' }}>
              <defs>
                <linearGradient id="trans45" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={colors.bitOne} />
                  <stop offset="100%" stopColor={colors.success} />
                </linearGradient>
                <linearGradient id="trans7" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={colors.error} />
                  <stop offset="100%" stopColor={colors.warning} />
                </linearGradient>
              </defs>

              {/* 45nm transistor */}
              <g>
                <rect x="80" y="80" width="160" height="160" rx="12" fill="url(#trans45)" stroke={colors.border} strokeWidth="2" />
                <text x="160" y="170" textAnchor="middle" fill="white" fontSize="48" fontWeight="700">45</text>
                <text x="160" y="195" textAnchor="middle" fill="white" fontSize="14" opacity="0.9">nm</text>
                <text x="160" y="260" textAnchor="middle" fill={colors.textSecondary} fontSize="13">2007 Technology</text>
                <text x="160" y="278" textAnchor="middle" fill={colors.textMuted} fontSize="11">Larger charge capacity</text>
              </g>

              {/* VS */}
              <text x="300" y="165" textAnchor="middle" fill={colors.textMuted} fontSize="24" fontWeight="600">VS</text>

              {/* 7nm transistor */}
              <g>
                <rect x="360" y="110" width="100" height="100" rx="8" fill="url(#trans7)" stroke={colors.border} strokeWidth="2" />
                <text x="410" y="165" textAnchor="middle" fill="white" fontSize="32" fontWeight="700">7</text>
                <text x="410" y="185" textAnchor="middle" fill="white" fontSize="12" opacity="0.9">nm</text>
                <text x="410" y="235" textAnchor="middle" fill={colors.textSecondary} fontSize="13">2020 Technology</text>
                <text x="410" y="253" textAnchor="middle" fill={colors.textMuted} fontSize="11">Less charge = more vulnerable</text>
              </g>

              {/* Cosmic ray impact illustration */}
              <g>
                <line x1="40" y1="30" x2="160" y2="100" stroke={colors.radiation} strokeWidth="3" opacity="0.6" />
                <circle cx="160" cy="100" r="5" fill={colors.radiation} />
                <text x="40" y="25" fill={colors.radiation} fontSize="12">Cosmic Ray</text>
              </g>

              <g>
                <line x1="500" y1="30" x2="410" y2="120" stroke={colors.radiation} strokeWidth="3" opacity="0.6" />
                <circle cx="410" cy="120" r="5" fill={colors.radiation} />
                <text x="500" y="25" fill={colors.radiation} fontSize="12" textAnchor="end">Same Energy</text>
              </g>
            </svg>
            <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginTop: '16px' }}>
              Same particle energy hits different size transistors. Which is more vulnerable?
            </p>
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
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
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
              onClick={() => {
                playSound('success');
                resetSimulation();
                nextPhase();
              }}
              style={primaryButtonStyle}
            >
              Experiment with Node Size
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE - Process Node Size Effects
  if (phase === 'twist_play') {
    const missionSuccessProb = calculateMissionSuccessProbability();
    const effectiveFaultRate = faultRate * (45 / processNode) * (45 / processNode);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}
        <style>{keyframes}</style>

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Process Node Sensitivity Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            See how transistor size affects radiation vulnerability
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            position: 'relative',
          }}>
            {isSimulationRunning && <CosmicRayAnimation />}

            <MemoryVisualization />

            {/* Process Node Slider */}
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}><strong>Process Node Size (Transistor Size):</strong> Smaller = less charge storage</span>
                <span style={{ ...typo.small, color: processNode <= 10 ? colors.error : processNode <= 22 ? colors.warning : colors.success, fontWeight: 600 }}>
                  {processNode}nm
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="45"
                step="1"
                value={processNode}
                onChange={(e) => setProcessNode(parseInt(e.target.value))}
                onInput={(e) => setProcessNode(parseInt((e.target as HTMLInputElement).value))}
                style={{
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, ${colors.error}, ${colors.warning}, ${colors.success})`,
                  cursor: 'pointer',
                  accentColor: colors.warning,
                  touchAction: 'pan-y',
                  WebkitAppearance: 'none',
                } as React.CSSProperties}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.error }}>5nm Modern</span>
                <span style={{ ...typo.small, color: colors.success }}>45nm Old</span>
              </div>
            </div>

            {/* Protection Mode Selector */}
            <div style={{ marginTop: '20px' }}>
              <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '12px' }}>
                Protection Mode:
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 'none', label: 'None', color: colors.error },
                  { id: 'ecc', label: 'ECC', color: colors.warning },
                  { id: 'tmr', label: 'TMR', color: colors.success },
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      playSound('click');
                      setProtectionMode(mode.id as 'none' | 'ecc' | 'tmr');
                      resetSimulation();
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: `2px solid ${protectionMode === mode.id ? mode.color : colors.border}`,
                      background: protectionMode === mode.id ? mode.color + '22' : 'transparent',
                      color: protectionMode === mode.id ? mode.color : colors.textSecondary,
                      cursor: 'pointer',
                      fontWeight: protectionMode === mode.id ? 600 : 400,
                      fontSize: '14px',
                    }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Statistics */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              marginTop: '20px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.radiation }}>{effectiveFaultRate.toFixed(1)}x</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Relative Rate</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.success }}>{correctedErrors}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Corrected</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.error }}>{uncorrectedErrors}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Corrupted</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: missionSuccessProb > 90 ? colors.success : missionSuccessProb > 50 ? colors.warning : colors.error }}>
                  {missionSuccessProb.toFixed(0)}%
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Success</div>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
              <button
                onClick={() => {
                  playSound('click');
                  setIsSimulationRunning(!isSimulationRunning);
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isSimulationRunning ? colors.error : colors.success,
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                {isSimulationRunning ? 'Stop' : 'Start Radiation'}
              </button>
              <button
                onClick={() => {
                  playSound('click');
                  resetSimulation();
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Formula Display */}
          <div style={{
            background: `${colors.accent}11`,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
            border: `1px solid ${colors.accent}33`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
              Process Node Scaling Formula:
            </p>
            <div style={{
              fontFamily: 'monospace',
              fontSize: '14px',
              color: colors.textPrimary,
              marginBottom: '4px',
            }}>
              SEU Rate ∝ (45nm / Node Size)²
            </div>
            <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
              Smaller transistors have less critical charge (Q<sub>crit</sub> ∝ Node Size), so fault rate increases quadratically.
            </p>
          </div>

          {/* Observation prompt */}
          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.accent }}>Notice:</strong> At 7nm, the fault rate is ~40x higher than at 45nm! This is why spacecraft often use older, "space-qualified" technology instead of cutting-edge consumer chips.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); setIsSimulationRunning(false); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Learn About Tradeoffs
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}
        <style>{keyframes}</style>

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Protection Tradeoffs in Space
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>💾</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>ECC Memory</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: colors.success + '22', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ ...typo.small, color: colors.success, fontWeight: 600 }}>Pros</div>
                  <ul style={{ ...typo.small, color: colors.textSecondary, margin: '8px 0 0 16px' }}>
                    <li>~12% memory overhead</li>
                    <li>Automatic correction</li>
                    <li>Low power cost</li>
                  </ul>
                </div>
                <div style={{ background: colors.error + '22', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ ...typo.small, color: colors.error, fontWeight: 600 }}>Cons</div>
                  <ul style={{ ...typo.small, color: colors.textSecondary, margin: '8px 0 0 16px' }}>
                    <li>Only fixes 1-bit errors</li>
                    <li>Multi-bit = detected only</li>
                    <li>Needs scrubbing</li>
                  </ul>
                </div>
              </div>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>3️⃣</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Triple Modular Redundancy</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: colors.success + '22', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ ...typo.small, color: colors.success, fontWeight: 600 }}>Pros</div>
                  <ul style={{ ...typo.small, color: colors.textSecondary, margin: '8px 0 0 16px' }}>
                    <li>Tolerates any single failure</li>
                    <li>Real-time correction</li>
                    <li>Handles hardware faults too</li>
                  </ul>
                </div>
                <div style={{ background: colors.error + '22', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ ...typo.small, color: colors.error, fontWeight: 600 }}>Cons</div>
                  <ul style={{ ...typo.small, color: colors.textSecondary, margin: '8px 0 0 16px' }}>
                    <li>3x hardware cost</li>
                    <li>3x power consumption</li>
                    <li>3x mass (critical in space!)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🛡️</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Radiation Hardened Chips</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: colors.success + '22', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ ...typo.small, color: colors.success, fontWeight: 600 }}>Pros</div>
                  <ul style={{ ...typo.small, color: colors.textSecondary, margin: '8px 0 0 16px' }}>
                    <li>100-1000x fewer SEUs</li>
                    <li>No software changes</li>
                    <li>Proven flight heritage</li>
                  </ul>
                </div>
                <div style={{ background: colors.error + '22', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ ...typo.small, color: colors.error, fontWeight: 600 }}>Cons</div>
                  <ul style={{ ...typo.small, color: colors.textSecondary, margin: '8px 0 0 16px' }}>
                    <li>10-100x cost</li>
                    <li>Years behind consumer tech</li>
                    <li>Limited selection</li>
                  </ul>
                </div>
              </div>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>💡</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Real Spacecraft Strategy</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Most spacecraft use a <strong>layered approach</strong>: rad-hard processors for critical functions (attitude control, power management), commercial processors with heavy ECC/TMR for science data, and software-based error detection throughout. This balances cost, performance, and reliability.
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
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: colors.bgPrimary,
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <style>{keyframes}</style>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '100px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
              Real-World Applications
            </h2>

            <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '24px' }}>
              Explored {completedApps.filter(c => c).length} of {realWorldApps.length} applications
            </p>

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
                    fontSize: '10px',
                    lineHeight: '18px',
                  }}>
                    OK
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
                Why Radiation Hardening Matters:
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

            {/* Got It button */}
            <button
              onClick={() => {
                playSound('click');
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
              }}
              disabled={completedApps[selectedApp]}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: completedApps[selectedApp] ? colors.success : app.color,
                color: 'white',
                cursor: completedApps[selectedApp] ? 'default' : 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                opacity: completedApps[selectedApp] ? 0.7 : 1,
              }}
            >
              {completedApps[selectedApp] ? '✓ Understood' : 'Got It'}
            </button>
          </div>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test
            </button>
          )}
          </div>
        </div>

        {renderBottomNav()}
        {renderNavDots()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: colors.bgPrimary,
          overflow: 'hidden',
        }}>
          {renderProgressBar()}
          <style>{keyframes}</style>

          <div style={{
            flex: 1,
            overflowY: 'auto',
            paddingTop: '60px',
            paddingBottom: '100px',
          }}>
            <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 24px' }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{
                  fontSize: '80px',
                  marginBottom: '24px',
                }}>
                  {passed ? '🛰️' : '📚'}
                </div>
                <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                  {passed ? 'Mission Success!' : 'Needs More Training'}
                </h2>
                <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                  {testScore} / 10
                </p>
                <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                  {passed
                    ? 'You\'ve mastered Space Radiation and Fault Tolerance!'
                    : 'Review the concepts and try again.'}
                </p>
              </div>

              {/* Answer Review */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
                  Answer Review
                </h3>
                {testQuestions.map((q, i) => {
                  const userAnswer = testAnswers[i];
                  const correctAnswer = q.options.find(o => o.correct)?.id;
                  const isCorrect = userAnswer === correctAnswer;
                  return (
                    <div
                      key={i}
                      style={{
                        background: colors.bgCard,
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '12px',
                        border: `2px solid ${isCorrect ? colors.success : colors.error}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: isCorrect ? colors.success : colors.error,
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '18px',
                        }}>
                          {isCorrect ? '✓' : '✗'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                            Question {i + 1}
                          </p>
                          <p style={{ ...typo.small, color: colors.textPrimary, margin: 0, fontWeight: 600 }}>
                            {q.question}
                          </p>
                        </div>
                      </div>

                      {!isCorrect && (
                        <div style={{ marginTop: '12px' }}>
                          <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>
                            Your answer: {q.options.find(o => o.id === userAnswer)?.label}
                          </p>
                          <p style={{ ...typo.small, color: colors.success, marginBottom: '8px' }}>
                            Correct answer: {q.options.find(o => o.id === correctAnswer)?.label}
                          </p>
                          <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
                            {q.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ textAlign: 'center' }}>
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
          </div>

          {renderBottomNav()}
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}
        <style>{keyframes}</style>

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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

        {renderNavDots()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
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
        <style>{keyframes}</style>

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'float 3s ease-in-out infinite',
        }}>
          🛰️☢️
        </div>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Radiation Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how space radiation causes bit flips and why triple-redundancy keeps spacecraft alive for decades.
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
              'How cosmic rays cause Single Event Upsets',
              'ECC memory for single-bit correction',
              'Triple Modular Redundancy voting',
              'Process node size effects on vulnerability',
              'Real spacecraft protection strategies',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>OK</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={() => {
              resetSimulation();
              goToPhase('hook');
            }}
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

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default SpaceRadiationRenderer;
