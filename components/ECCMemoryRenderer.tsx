'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// ECC Memory (Error Correcting Code) - Complete 10-Phase Game
// How computers detect and correct bit errors using Hamming codes
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

interface ECCMemoryRendererProps {
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
    scenario: "A data center experiences a server crash and upon investigation, engineers find that a single bit in RAM was flipped, causing corrupted data to be written to the database.",
    question: "How could ECC memory have prevented this failure?",
    options: [
      { id: 'a', label: "By backing up the data to disk every millisecond" },
      { id: 'b', label: "By detecting the single-bit error and automatically correcting it before use", correct: true },
      { id: 'c', label: "By running the RAM at a lower frequency to prevent errors" },
      { id: 'd', label: "By encrypting the data so errors would be obvious" }
    ],
    explanation: "ECC memory uses Hamming codes to add parity bits that can detect which specific bit flipped. With SECDED (Single Error Correct, Double Error Detect), the memory controller automatically corrects single-bit errors without any software intervention, preventing data corruption."
  },
  {
    scenario: "A spacecraft traveling to Mars uses radiation-hardened memory. Despite shielding, cosmic rays occasionally flip bits in the computer's RAM.",
    question: "Why are cosmic rays particularly dangerous for computer memory in space?",
    options: [
      { id: 'a', label: "Cosmic rays generate heat that melts memory chips" },
      { id: 'b', label: "High-energy particles can change the charge state of memory cells, flipping bits", correct: true },
      { id: 'c', label: "Cosmic rays interfere with the clock signal" },
      { id: 'd', label: "Radiation corrodes the metal traces in memory chips" }
    ],
    explanation: "Cosmic rays are high-energy particles that can deposit enough charge in a memory cell to flip its state from 0 to 1 or vice versa. These 'soft errors' don't damage the hardware but corrupt data. In space, without Earth's atmosphere and magnetic field for protection, these events happen frequently."
  },
  {
    scenario: "A company is building a new gaming PC and must choose between ECC and non-ECC RAM. The ECC option costs 20% more and runs slightly slower.",
    question: "Why do most consumer PCs use non-ECC memory despite the risk of bit errors?",
    options: [
      { id: 'a', label: "Consumer CPUs cannot physically process ECC signals" },
      { id: 'b', label: "Bit errors in consumer PCs are rare and usually just cause a crash rather than silent corruption", correct: true },
      { id: 'c', label: "Non-ECC memory is more reliable than ECC" },
      { id: 'd', label: "Operating systems cannot utilize ECC features" }
    ],
    explanation: "At sea level, soft errors in RAM are relatively rare (roughly 1 per GB per month). For consumers, a rare crash is acceptable and cheaper than ECC. However, servers running 24/7 with hundreds of GB of RAM face much higher cumulative risk, making ECC essential for data integrity."
  },
  {
    scenario: "An engineer examines a memory module and notices it has 9 chips instead of the usual 8. The extra chip stores parity information.",
    question: "What is the fundamental trade-off of adding ECC capability to memory?",
    options: [
      { id: 'a', label: "ECC memory requires more physical chips and memory bandwidth for the extra parity bits", correct: true },
      { id: 'b', label: "ECC memory can only store numbers, not text" },
      { id: 'c', label: "ECC memory must be replaced twice as often" },
      { id: 'd', label: "ECC memory cannot be used with solid-state drives" }
    ],
    explanation: "ECC memory stores extra parity bits alongside data bits (typically 8 ECC bits per 64 data bits). This requires additional memory chips and slightly more bandwidth. The memory controller must also perform extra calculations for encoding and decoding, adding a small latency."
  },
  {
    scenario: "A Hamming(7,4) code stores 4 data bits using 7 total bits. The encoded word 1011010 is received, but one bit has flipped.",
    question: "How does the Hamming code identify which bit is corrupted?",
    options: [
      { id: 'a', label: "By comparing to a backup copy stored elsewhere" },
      { id: 'b', label: "By checking multiple overlapping parity groups and combining their results", correct: true },
      { id: 'c', label: "By measuring the voltage level of each bit" },
      { id: 'd', label: "By running the data through a cryptographic hash function" }
    ],
    explanation: "Hamming codes use multiple parity bits, each covering a different subset of data bits. When an error occurs, some parity checks fail while others pass. The pattern of failures (called the 'syndrome') uniquely identifies which bit position is wrong, allowing correction."
  },
  {
    scenario: "A server administrator sees an alert: 'Correctable ECC error detected and corrected in DIMM slot A2.' The server continues running normally.",
    question: "Should the administrator be concerned about this single correctable error?",
    options: [
      { id: 'a', label: "No, ECC corrected it automatically so everything is fine" },
      { id: 'b', label: "Yes, increasing correctable errors can indicate a failing memory module", correct: true },
      { id: 'c', label: "Yes, the data was permanently corrupted" },
      { id: 'd', label: "No, this is how ECC is supposed to test itself" }
    ],
    explanation: "While single correctable errors are normal and automatically fixed, a pattern of increasing errors (especially from one DIMM) often indicates the memory module is degrading. Proactive replacement before uncorrectable multi-bit errors occur can prevent data loss."
  },
  {
    scenario: "A database server uses memory scrubbing, which periodically reads all memory locations and writes them back. This happens even when the memory isn't being actively used.",
    question: "Why would a server waste resources reading and rewriting memory that isn't being used?",
    options: [
      { id: 'a', label: "To keep the RAM chips warm and prevent thermal damage" },
      { id: 'b', label: "To detect and correct single-bit errors before a second error makes them uncorrectable", correct: true },
      { id: 'c', label: "To defragment the memory for better performance" },
      { id: 'd', label: "To test the memory controller's speed" }
    ],
    explanation: "SECDED can only correct single-bit errors. If a bit error accumulates in unused memory and a second error occurs in the same word before it's accessed, the data becomes uncorrectable. Memory scrubbing proactively reads all memory to trigger ECC correction before errors accumulate."
  },
  {
    scenario: "A research paper reports that at high altitudes (like Denver at 5,280 feet), computers experience roughly 3x more soft errors than at sea level.",
    question: "What causes higher error rates at altitude?",
    options: [
      { id: 'a', label: "Thinner air conducts electricity differently" },
      { id: 'b', label: "Less atmospheric shielding allows more cosmic ray particles to reach electronics", correct: true },
      { id: 'c', label: "Lower air pressure causes memory chips to expand" },
      { id: 'd', label: "Higher UV radiation degrades the plastic packaging" }
    ],
    explanation: "Earth's atmosphere acts as a shield against cosmic rays. At higher altitudes, there's less atmosphere above to absorb or scatter incoming particles. This is why servers in mountain locations and especially aircraft/spacecraft have significantly higher bit error rates."
  },
  {
    scenario: "Intel's Chipkill technology groups ECC protection across multiple memory chips. If an entire DRAM chip fails, the system can still reconstruct the data.",
    question: "How is Chipkill more robust than standard ECC?",
    options: [
      { id: 'a', label: "It uses faster memory chips that are less likely to fail" },
      { id: 'b', label: "It distributes bits across chips so no single chip failure loses more than one bit per ECC word", correct: true },
      { id: 'c', label: "It keeps three backup copies of all data" },
      { id: 'd', label: "It runs memory at half speed for extra reliability" }
    ],
    explanation: "Standard ECC might have all bits of an ECC word on one chip. If that chip fails, multiple bits in the same word are corrupted, exceeding SECDED's capability. Chipkill interleaves bits across chips, ensuring a complete chip failure only affects one bit per ECC word, which can be corrected."
  },
  {
    scenario: "A quantum computer researcher explains that future quantum computers will need even more sophisticated error correction because qubits are extremely sensitive to disturbance.",
    question: "What makes error correction in quantum computers more challenging than in classical ECC memory?",
    options: [
      { id: 'a', label: "Quantum computers run at absolute zero where ECC doesn't work" },
      { id: 'b', label: "Measuring a qubit to check for errors can itself change the qubit's state", correct: true },
      { id: 'c', label: "Qubits are too small to attach parity bits" },
      { id: 'd', label: "Quantum computers cannot store the number 0" }
    ],
    explanation: "In classical computing, we can freely read bits to check parity. In quantum computing, measurement collapses the quantum state, destroying the information we're trying to protect. Quantum error correction uses entanglement and indirect measurement techniques to detect errors without disturbing the data qubits."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🖥️',
    title: 'Server & Data Centers',
    short: 'Protecting critical enterprise data',
    tagline: 'Where downtime costs millions per hour',
    description: 'Enterprise servers use ECC memory as a fundamental requirement for data integrity. With hundreds of gigabytes of RAM running 24/7, the probability of bit errors affecting critical data becomes significant without protection.',
    connection: 'ECC memory prevents silent data corruption that could lead to incorrect financial calculations, corrupted database records, or security vulnerabilities. A single undetected bit flip in a banking transaction could mean millions in errors.',
    howItWorks: 'Server-grade ECC uses SECDED with 72 bits per word (64 data + 8 ECC). Memory controllers continuously check and correct errors during normal operations. Advanced systems use Chipkill to survive entire chip failures.',
    stats: [
      { value: '99.999%', label: 'Uptime requirement', icon: '⬆️' },
      { value: '1 in 10^15', label: 'Target error rate', icon: '🎯' },
      { value: '$5.6M', label: 'Hourly downtime cost', icon: '💰' }
    ],
    examples: ['Google data centers', 'Amazon AWS servers', 'Wall Street trading systems', 'Hospital record systems'],
    companies: ['Dell', 'HPE', 'Lenovo', 'Supermicro'],
    futureImpact: 'Persistent memory (like Intel Optane) blurs the line between RAM and storage, making ECC even more critical as memory becomes permanent.',
    color: '#3B82F6'
  },
  {
    icon: '🚀',
    title: 'Aerospace & Space Systems',
    short: 'Computing in harsh radiation environments',
    tagline: 'When a reboot means mission failure',
    description: 'Spacecraft, satellites, and high-altitude aircraft face intense radiation that causes frequent bit flips. ECC and more advanced techniques like triple modular redundancy are essential for mission success.',
    connection: 'Outside Earth\'s protective atmosphere and magnetic field, cosmic rays constantly bombard electronics. A single bit error in navigation code could send a spacecraft off course with no way to recover.',
    howItWorks: 'Space systems use radiation-hardened memory with heavy ECC, often combined with TMR (running calculations three times and voting). Regular memory scrubbing corrects accumulated errors before they become uncorrectable.',
    stats: [
      { value: '100x', label: 'Higher error rate vs Earth', icon: '☢️' },
      { value: '30+ years', label: 'Voyager mission duration', icon: '🛸' },
      { value: '$0', label: 'Repair budget in space', icon: '🔧' }
    ],
    examples: ['Mars Perseverance rover', 'James Webb Space Telescope', 'Starlink satellites', 'International Space Station'],
    companies: ['NASA', 'SpaceX', 'Boeing', 'Lockheed Martin'],
    futureImpact: 'Long-duration missions to Mars and beyond will require ever more sophisticated error correction as electronics age over multi-year journeys.',
    color: '#8B5CF6'
  },
  {
    icon: '🏥',
    title: 'Medical & Scientific Computing',
    short: 'Where accuracy is life-critical',
    tagline: 'Every bit could affect patient outcomes',
    description: 'Medical imaging systems, radiation therapy machines, and scientific instruments require absolute data integrity. A bit error in an MRI image could hide a tumor; an error in treatment dosing could be fatal.',
    connection: 'ECC ensures that when a doctor examines a CT scan, every pixel represents actual patient data, not random corruption. Scientific experiments costing millions cannot afford to have results corrupted by memory errors.',
    howItWorks: 'Medical devices use ECC RAM combined with redundant storage and extensive self-testing. Many systems require certification proving their error-handling capabilities before treating patients.',
    stats: [
      { value: '0', label: 'Acceptable diagnostic errors', icon: '🎯' },
      { value: 'FDA', label: 'Regulatory oversight', icon: '📋' },
      { value: '1 billion', label: 'Calculations per scan', icon: '🧮' }
    ],
    examples: ['MRI machines', 'CT scanners', 'Linear accelerators', 'Genome sequencers'],
    companies: ['GE Healthcare', 'Siemens', 'Philips', 'Illumina'],
    futureImpact: 'AI-assisted diagnosis will require even more reliable computing as machine learning models process medical images and recommend treatments.',
    color: '#10B981'
  },
  {
    icon: '🚗',
    title: 'Automotive & Transportation',
    short: 'Safety-critical systems on wheels',
    tagline: 'When your car cannot afford to crash (literally)',
    description: 'Modern vehicles contain dozens of computers controlling everything from brakes to steering. Autonomous vehicles elevate the stakes further, requiring absolute reliability in perception and decision-making systems.',
    connection: 'A bit error in an autonomous vehicle\'s object detection could misclassify a pedestrian as empty space. ECC memory in safety-critical automotive systems is part of the ISO 26262 functional safety standard.',
    howItWorks: 'Automotive-grade ECUs (Electronic Control Units) use ECC memory rated for extreme temperatures and vibration. Redundant systems cross-check each other, with failsafe modes if disagreements occur.',
    stats: [
      { value: 'ASIL-D', label: 'Highest safety level', icon: '🛡️' },
      { value: '100M', label: 'Lines of code per car', icon: '💻' },
      { value: '-40 to 125°C', label: 'Operating temp range', icon: '🌡️' }
    ],
    examples: ['Tesla Autopilot', 'Waymo self-driving cars', 'Anti-lock braking systems', 'Flight control computers'],
    companies: ['Tesla', 'Waymo', 'Mobileye', 'NVIDIA'],
    futureImpact: 'Full autonomy (Level 5) will require unprecedented reliability—systems must handle billions of miles without a safety-critical memory error.',
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ECCMemoryRenderer: React.FC<ECCMemoryRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // ECC Visualization state
  const [dataBits, setDataBits] = useState<number[]>([1, 0, 1, 1]); // 4 data bits (D1, D2, D3, D4)
  const [errorPosition, setErrorPosition] = useState<number | null>(null);
  const [showSyndrome, setShowSyndrome] = useState(false);
  const [eccEnabled, setEccEnabled] = useState(true);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [correctionAnimating, setCorrectionAnimating] = useState(false);

  // Double error for twist
  const [secondErrorPosition, setSecondErrorPosition] = useState<number | null>(null);

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

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#06B6D4', // Cyan for digital/tech feel
    accentGlow: 'rgba(6, 182, 212, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
    bitZero: '#374151',
    bitOne: '#06B6D4',
    parity: '#8B5CF6',
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
    twist_play: 'Double Error Lab',
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

  // Calculate Hamming(7,4) parity bits
  // Bit positions: P1(1), P2(2), D1(3), P3(4), D2(5), D3(6), D4(7)
  const calculateParityBits = useCallback((data: number[]): number[] => {
    const [d1, d2, d3, d4] = data;
    // P1 covers positions 1,3,5,7 (binary: xxx1) -> P1, D1, D2, D4
    const p1 = d1 ^ d2 ^ d4;
    // P2 covers positions 2,3,6,7 (binary: xx1x) -> P2, D1, D3, D4
    const p2 = d1 ^ d3 ^ d4;
    // P3 covers positions 4,5,6,7 (binary: x1xx) -> P3, D2, D3, D4
    const p3 = d2 ^ d3 ^ d4;
    return [p1, p2, p3];
  }, []);

  // Build the full 7-bit codeword
  const buildCodeword = useCallback((data: number[], parity: number[]): number[] => {
    // Position: 1=P1, 2=P2, 3=D1, 4=P3, 5=D2, 6=D3, 7=D4
    return [parity[0], parity[1], data[0], parity[2], data[1], data[2], data[3]];
  }, []);

  // Apply error(s) to codeword
  const applyErrors = useCallback((codeword: number[], errPos: number | null, errPos2: number | null): number[] => {
    const result = [...codeword];
    if (errPos !== null && errPos >= 0 && errPos < 7) {
      result[errPos] = result[errPos] ^ 1;
    }
    if (errPos2 !== null && errPos2 >= 0 && errPos2 < 7) {
      result[errPos2] = result[errPos2] ^ 1;
    }
    return result;
  }, []);

  // Calculate syndrome from received codeword
  const calculateSyndrome = useCallback((received: number[]): number => {
    // Check each parity group
    const s1 = received[0] ^ received[2] ^ received[4] ^ received[6]; // positions 1,3,5,7
    const s2 = received[1] ^ received[2] ^ received[5] ^ received[6]; // positions 2,3,6,7
    const s3 = received[3] ^ received[4] ^ received[5] ^ received[6]; // positions 4,5,6,7
    // Syndrome = S3*4 + S2*2 + S1 (gives position of error, 0 if no error)
    return s3 * 4 + s2 * 2 + s1;
  }, []);

  // Get current state
  const parityBits = calculateParityBits(dataBits);
  const originalCodeword = buildCodeword(dataBits, parityBits);
  const receivedCodeword = applyErrors(originalCodeword, errorPosition, secondErrorPosition);
  const syndrome = calculateSyndrome(receivedCodeword);
  const hasError = syndrome !== 0;
  const errorCount = (errorPosition !== null ? 1 : 0) + (secondErrorPosition !== null ? 1 : 0);
  const canCorrect = errorCount <= 1;

  // Correct the error
  const correctedCodeword = [...receivedCodeword];
  if (hasError && canCorrect && syndrome > 0 && syndrome <= 7) {
    correctedCodeword[syndrome - 1] = correctedCodeword[syndrome - 1] ^ 1;
  }

  // Extract data from codeword
  const extractData = (cw: number[]): number[] => [cw[2], cw[4], cw[5], cw[6]];
  const correctedData = extractData(correctedCodeword);
  const dataIntact = JSON.stringify(correctedData) === JSON.stringify(dataBits);

  // Toggle a bit (introduce error)
  const toggleBit = (position: number) => {
    if (phase === 'play') {
      if (errorPosition === position) {
        setErrorPosition(null);
      } else {
        setErrorPosition(position);
      }
      setShowSyndrome(true);
      playSound('click');
    } else if (phase === 'twist_play') {
      // Allow two errors
      if (errorPosition === position) {
        setErrorPosition(secondErrorPosition);
        setSecondErrorPosition(null);
      } else if (secondErrorPosition === position) {
        setSecondErrorPosition(null);
      } else if (errorPosition === null) {
        setErrorPosition(position);
      } else if (secondErrorPosition === null) {
        setSecondErrorPosition(position);
      }
      setShowSyndrome(true);
      playSound('click');
    }
  };

  // Reset errors
  const resetErrors = () => {
    setErrorPosition(null);
    setSecondErrorPosition(null);
    setShowSyndrome(false);
    playSound('click');
  };

  // Animate correction
  const animateCorrection = () => {
    if (!hasError || !canCorrect) return;
    setCorrectionAnimating(true);
    playSound('success');
    setTimeout(() => {
      setCorrectionAnimating(false);
      setErrorPosition(null);
      setSecondErrorPosition(null);
    }, 1500);
  };

  // Bit visualization component
  const BitDisplay = ({
    value,
    position,
    label,
    isParity = false,
    isError = false,
    isCorrecting = false,
    onClick
  }: {
    value: number;
    position: number;
    label: string;
    isParity?: boolean;
    isError?: boolean;
    isCorrecting?: boolean;
    onClick?: () => void;
  }) => {
    const baseColor = isParity ? colors.parity : (value === 1 ? colors.bitOne : colors.bitZero);
    const displayColor = isError ? colors.error : isCorrecting ? colors.success : baseColor;

    return (
      <button
        onClick={onClick}
        style={{
          width: isMobile ? '40px' : '50px',
          height: isMobile ? '50px' : '60px',
          borderRadius: '8px',
          border: `2px solid ${isError ? colors.error : isParity ? colors.parity : colors.border}`,
          background: displayColor + (value === 1 ? '' : '44'),
          color: colors.textPrimary,
          fontSize: isMobile ? '18px' : '22px',
          fontWeight: 700,
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
          boxShadow: isError ? `0 0 12px ${colors.error}` : isCorrecting ? `0 0 12px ${colors.success}` : 'none',
          animation: isCorrecting ? 'pulse 0.5s ease infinite' : 'none',
        }}
      >
        <span>{value}</span>
        <span style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 400 }}>{label}</span>
      </button>
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

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #0891B2)`,
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
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 5px ${colors.accent}; }
      50% { box-shadow: 0 0 20px ${colors.accent}; }
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
          animation: 'float 3s ease-in-out infinite',
        }}>
          <span style={{ marginRight: '8px' }}>1</span>
          <span style={{ color: colors.error }}>0</span>
          <span>1</span>
          <span>1</span>
        </div>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Error Correcting Code Memory
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Cosmic rays are constantly flipping bits in your computer's memory. How does critical infrastructure stay reliable when <span style={{ color: colors.error }}>random bit flips</span> are unavoidable?"
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
            "At 35,000 feet, a laptop experiences 100x more bit errors than at sea level. At the International Space Station, it's 1000x. Yet spacecraft computers run for decades without data corruption."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            — Richard Hamming, Bell Labs (inventor of Hamming codes)
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Learn the Magic of ECC
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Store multiple copies of each bit and use majority voting' },
      { id: 'b', text: 'Add extra "parity" bits that encode information about the data bits' },
      { id: 'c', text: 'Run memory at a lower voltage to make bits more stable' },
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
            If a single bit randomly flips in memory, how can a computer detect AND fix the error?
          </h2>

          {/* Visual demonstration */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{
                padding: '12px 20px',
                background: colors.bitOne,
                borderRadius: '8px',
                fontSize: '24px',
                fontWeight: 700,
                color: 'white'
              }}>1</div>
              <div style={{
                padding: '12px 20px',
                background: colors.bitZero,
                borderRadius: '8px',
                fontSize: '24px',
                fontWeight: 700,
                color: 'white'
              }}>0</div>
              <div style={{
                padding: '12px 20px',
                background: colors.bitOne,
                borderRadius: '8px',
                fontSize: '24px',
                fontWeight: 700,
                color: 'white'
              }}>1</div>
              <div style={{
                padding: '12px 20px',
                background: colors.bitOne,
                borderRadius: '8px',
                fontSize: '24px',
                fontWeight: 700,
                color: 'white'
              }}>1</div>
            </div>
            <div style={{ fontSize: '24px', margin: '12px 0' }}>Cosmic Ray Strike!</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <div style={{
                padding: '12px 20px',
                background: colors.bitOne,
                borderRadius: '8px',
                fontSize: '24px',
                fontWeight: 700,
                color: 'white'
              }}>1</div>
              <div style={{
                padding: '12px 20px',
                background: colors.error,
                borderRadius: '8px',
                fontSize: '24px',
                fontWeight: 700,
                color: 'white',
                boxShadow: `0 0 12px ${colors.error}`
              }}>1</div>
              <div style={{
                padding: '12px 20px',
                background: colors.bitOne,
                borderRadius: '8px',
                fontSize: '24px',
                fontWeight: 700,
                color: 'white'
              }}>1</div>
              <div style={{
                padding: '12px 20px',
                background: colors.bitOne,
                borderRadius: '8px',
                fontSize: '24px',
                fontWeight: 700,
                color: 'white'
              }}>1</div>
            </div>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '12px' }}>
              The second bit flipped from 0 to 1. How can the computer know?
            </p>
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
              style={primaryButtonStyle}
            >
              See How It Works
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Hamming Code Visualization
  if (phase === 'play') {
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
            Hamming Code in Action
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Click any bit to simulate a cosmic ray flipping it. Watch how ECC detects and locates the error.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Original Data */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ ...typo.small, color: colors.textMuted, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Original Data: {dataBits.join('')}
              </h3>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {dataBits.map((bit, i) => (
                  <BitDisplay
                    key={`data-${i}`}
                    value={bit}
                    position={i}
                    label={`D${i + 1}`}
                    isParity={false}
                  />
                ))}
              </div>
            </div>

            {/* Encoded Codeword */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ ...typo.small, color: colors.textMuted, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Encoded Codeword (click to flip a bit):
              </h3>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {receivedCodeword.map((bit, i) => {
                  const isParity = i === 0 || i === 1 || i === 3;
                  const label = isParity
                    ? `P${i === 0 ? 1 : i === 1 ? 2 : 3}`
                    : `D${i === 2 ? 1 : i === 4 ? 2 : i === 5 ? 3 : 4}`;
                  const isError = (errorPosition === i) || (secondErrorPosition === i);
                  const isCorrecting = correctionAnimating && syndrome - 1 === i;

                  return (
                    <BitDisplay
                      key={`code-${i}`}
                      value={bit}
                      position={i}
                      label={label}
                      isParity={isParity}
                      isError={isError}
                      isCorrecting={isCorrecting}
                      onClick={() => toggleBit(i)}
                    />
                  );
                })}
              </div>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px', textAlign: 'center' }}>
                Purple = Parity bits | Cyan = Data bits
              </p>
            </div>

            {/* Syndrome Analysis */}
            {showSyndrome && (
              <div style={{
                background: hasError ? `${colors.error}11` : `${colors.success}11`,
                border: `1px solid ${hasError ? colors.error : colors.success}33`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
              }}>
                <h3 style={{ ...typo.h3, color: hasError ? colors.error : colors.success, marginBottom: '12px' }}>
                  {hasError ? 'Error Detected!' : 'No Errors'}
                </h3>
                {hasError && (
                  <div style={{ ...typo.body, color: colors.textSecondary }}>
                    <p>Syndrome = {syndrome} (binary: {syndrome.toString(2).padStart(3, '0')})</p>
                    <p>This means the error is at position {syndrome}</p>
                    {canCorrect ? (
                      <p style={{ color: colors.success, marginTop: '8px' }}>
                        Single-bit error can be corrected by flipping bit {syndrome}
                      </p>
                    ) : (
                      <p style={{ color: colors.error, marginTop: '8px' }}>
                        Multiple errors detected - cannot correct automatically!
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Controls */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {hasError && canCorrect && !correctionAnimating && (
                <button
                  onClick={animateCorrection}
                  style={{
                    ...primaryButtonStyle,
                    background: `linear-gradient(135deg, ${colors.success}, #059669)`,
                  }}
                >
                  Correct Error
                </button>
              )}
              <button
                onClick={resetErrors}
                style={{
                  padding: '14px 28px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                Reset
              </button>
            </div>
          </div>

          {/* How it works hint */}
          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.accent }}>Try it:</strong> Click different bits to see how the syndrome changes. The syndrome value tells you exactly which bit is wrong!
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Math
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
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
            How Hamming Codes Find Errors
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>
              The Genius of Overlapping Parity
            </h3>

            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                Each parity bit covers a specific subset of positions:
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ background: colors.bgSecondary, padding: '12px', borderRadius: '8px' }}>
                  <strong style={{ color: colors.parity }}>P1</strong> checks positions 1, 3, 5, 7 (binary ends in 1)
                </div>
                <div style={{ background: colors.bgSecondary, padding: '12px', borderRadius: '8px' }}>
                  <strong style={{ color: colors.parity }}>P2</strong> checks positions 2, 3, 6, 7 (binary has 1 in second place)
                </div>
                <div style={{ background: colors.bgSecondary, padding: '12px', borderRadius: '8px' }}>
                  <strong style={{ color: colors.parity }}>P3</strong> checks positions 4, 5, 6, 7 (binary has 1 in third place)
                </div>
              </div>

              <p style={{ marginBottom: '16px' }}>
                When an error occurs at position N, the parity checks that include N will fail. The pattern of failures spells out N in binary!
              </p>

              <div style={{
                background: `${colors.success}11`,
                border: `1px solid ${colors.success}33`,
                borderRadius: '8px',
                padding: '12px',
              }}>
                <p style={{ margin: 0 }}>
                  <strong style={{ color: colors.success }}>Example:</strong> If position 5 has an error, P1 fails (5 has bit 1 set), P3 fails (5 has bit 4 set), but P2 passes.
                  The syndrome is 101 binary = 5 decimal. That's the error location!
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
              SECDED: Single Error Correct, Double Error Detect
            </h3>

            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                Real ECC memory adds one more parity bit covering ALL positions. This enables:
              </p>
              <ul style={{ marginLeft: '20px' }}>
                <li style={{ marginBottom: '8px' }}>
                  <strong style={{ color: colors.success }}>Single errors:</strong> Syndrome is non-zero, overall parity is wrong. Correct the bit at syndrome position.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong style={{ color: colors.warning }}>Double errors:</strong> Syndrome is non-zero, but overall parity is correct. We know there are 2 errors but can't fix them.
                </li>
                <li>
                  <strong style={{ color: colors.textMuted }}>No errors:</strong> Syndrome is zero, overall parity is correct.
                </li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            What About Multiple Errors?
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'ECC can still correct both errors since it knows which bits changed' },
      { id: 'b', text: 'ECC detects something is wrong but cannot correct it—it can only raise an alarm' },
      { id: 'c', text: 'The errors cancel out and the data appears correct' },
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
              New Challenge: Double Bit Error
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            What happens if TWO bits flip at the same time?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              Cosmic rays sometimes hit multiple cells, or a memory cell might be failing and cause multiple errors before being detected.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <div style={{
                padding: '12px 20px',
                background: colors.error,
                borderRadius: '8px',
                fontSize: '24px',
                fontWeight: 700,
                color: 'white',
                boxShadow: `0 0 12px ${colors.error}`
              }}>0</div>
              <div style={{
                padding: '12px 20px',
                background: colors.bitZero,
                borderRadius: '8px',
                fontSize: '24px',
                fontWeight: 700,
                color: 'white'
              }}>0</div>
              <div style={{
                padding: '12px 20px',
                background: colors.error,
                borderRadius: '8px',
                fontSize: '24px',
                fontWeight: 700,
                color: 'white',
                boxShadow: `0 0 12px ${colors.error}`
              }}>0</div>
              <div style={{
                padding: '12px 20px',
                background: colors.bitOne,
                borderRadius: '8px',
                fontSize: '24px',
                fontWeight: 700,
                color: 'white'
              }}>1</div>
            </div>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '12px' }}>
              Two bits have flipped. Can ECC save the day?
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
                setErrorPosition(null);
                setSecondErrorPosition(null);
                nextPhase();
              }}
              style={primaryButtonStyle}
            >
              Test Double Errors
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE - Double Error Demonstration
  if (phase === 'twist_play') {
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
            Double Error Challenge
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Click TWO different bits to see what happens with multiple errors
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Encoded Codeword */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ ...typo.small, color: colors.textMuted, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Click two bits to introduce double error:
              </h3>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {receivedCodeword.map((bit, i) => {
                  const isParity = i === 0 || i === 1 || i === 3;
                  const label = isParity
                    ? `P${i === 0 ? 1 : i === 1 ? 2 : 3}`
                    : `D${i === 2 ? 1 : i === 4 ? 2 : i === 5 ? 3 : 4}`;
                  const isError = (errorPosition === i) || (secondErrorPosition === i);

                  return (
                    <BitDisplay
                      key={`code-${i}`}
                      value={bit}
                      position={i}
                      label={label}
                      isParity={isParity}
                      isError={isError}
                      onClick={() => toggleBit(i)}
                    />
                  );
                })}
              </div>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px', textAlign: 'center' }}>
                Errors introduced: {errorCount} / 2
              </p>
            </div>

            {/* Analysis */}
            {errorCount === 2 && (
              <div style={{
                background: `${colors.error}11`,
                border: `1px solid ${colors.error}33`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
              }}>
                <h3 style={{ ...typo.h3, color: colors.error, marginBottom: '12px' }}>
                  Double Error Detected!
                </h3>
                <div style={{ ...typo.body, color: colors.textSecondary }}>
                  <p>Syndrome = {syndrome} (points to position {syndrome}, but that's wrong!)</p>
                  <p style={{ marginTop: '8px' }}>
                    With SECDED, the system knows there are 2 errors because the overall parity check would indicate the syndrome is misleading.
                    <strong style={{ color: colors.warning }}> The data cannot be automatically corrected</strong>, but the system can raise an alarm and request a re-read from backup or trigger a system halt.
                  </p>
                </div>
              </div>
            )}

            {errorCount === 1 && (
              <div style={{
                background: `${colors.warning}11`,
                border: `1px solid ${colors.warning}33`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
              }}>
                <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
                  One error so far. Click another bit to see what happens with two errors!
                </p>
              </div>
            )}

            {/* Controls */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={resetErrors}
                style={{
                  padding: '14px 28px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                Reset
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              playSound('success');
              setErrorPosition(null);
              setSecondErrorPosition(null);
              nextPhase();
            }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Learn About Memory Scrubbing
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
            Protecting Against Multi-Bit Errors
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>Memory Scrubbing</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Memory Scrubbing</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                The memory controller periodically reads ALL memory and writes it back. This triggers ECC correction on any single-bit errors <span style={{ color: colors.success }}>before a second error can accumulate</span> in the same word.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>Chipkill</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Chipkill / Advanced ECC</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Intel and AMD enterprise systems spread each ECC word across multiple memory chips. If an entire DRAM chip fails, <span style={{ color: colors.success }}>only one bit per word is affected</span>, which SECDED can still correct.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>TMR</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Triple Modular Redundancy</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                The most critical systems (spacecraft, nuclear plants) run <span style={{ color: colors.warning }}>three independent computers</span> and vote on the result. Even if one is completely corrupted, the other two will agree on the correct answer.
              </p>
            </div>

            <div style={{
              background: `${colors.accent}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.accent}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>Soft Errors</span>
                <h3 style={{ ...typo.h3, color: colors.accent, margin: 0 }}>Why Errors Happen</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>Cosmic rays:</strong> High-energy particles from space. <br />
                <strong>Alpha particles:</strong> From trace uranium in chip packaging. <br />
                <strong>Electrical noise:</strong> Interference from nearby circuits. <br />
                Rate: ~1 error per GB per month at sea level; 100x more at aircraft altitude.
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
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}
        <style>{keyframes}</style>

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
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
                How ECC Helps:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
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
          minHeight: '100vh',
          background: colors.bgPrimary,
          padding: '24px',
        }}>
          {renderProgressBar()}
          <style>{keyframes}</style>

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '1010' : '???'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Error-Free!' : 'Needs Correction'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You\'ve mastered Error Correcting Codes!'
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
          1 0 1 1
        </div>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          ECC Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how Error Correcting Codes protect data integrity and why they're essential for reliable computing.
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
              'How Hamming codes use parity bits',
              'Syndrome calculation to locate errors',
              'SECDED: Single Error Correct, Double Error Detect',
              'Memory scrubbing prevents error accumulation',
              'Real-world applications from servers to spacecraft',
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

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default ECCMemoryRenderer;
