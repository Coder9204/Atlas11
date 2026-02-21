'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// ============================================================================
// ELECTRIC POTENTIAL (VOLTAGE) - GOLD STANDARD RENDERER
// ============================================================================
// Physics: V = W/q (work per unit charge), V = kq/r (point charge potential)
// Key concept: Electric potential is the potential energy per unit charge
// Relationship: E = -dV/dr (field is negative gradient of potential)
// Units: Volts (V) = Joules per Coulomb (J/C)
// ============================================================================

// Phase type - 10-phase structure per spec
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Review',
  twist_predict: 'Twist Predict',
  twist_play: 'Twist Play',
  twist_review: 'Twist Review',
  transfer: 'Transfer',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'parameter_changed'
  | 'potential_calculated'
  | 'equipotential_drawn'
  | 'charge_placed'
  | 'test_charge_moved'
  | 'work_calculated'
  | 'field_visualized'
  | 'app_explored'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved';

interface TestQuestion {
  scenario: string;
  question: string;
  options: { text: string; correct: boolean }[];
  explanation: string;
}

interface TransferApp {
  icon: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  howItWorks: string[];
  stats: { value: string; label: string }[];
  examples: string[];
  companies: string[];
  futureImpact: string;
  color: string;
}

interface SourceCharge {
  id: number;
  x: number;
  y: number;
  q: number; // charge in μC
}

interface Props {
  onGameEvent?: (event: { type: GameEventType; data?: Record<string, unknown> }) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

const realWorldApps = [
  {
    icon: '🔋',
    title: 'Battery Technology',
    short: 'Storing electrical energy',
    tagline: 'Voltage difference drives current',
    description: 'Batteries create a potential difference (voltage) between terminals through electrochemical reactions. This voltage represents the energy available per unit charge to do electrical work.',
    connection: 'Battery voltage is the potential difference V = W/q between terminals. A 12V battery provides 12 joules of energy per coulomb of charge. Higher voltage means more energy per electron.',
    howItWorks: 'Chemical reactions at electrodes create charge separation. Lithium ions moving from anode to cathode through electrolyte create potential difference. Connecting a load allows current to flow.',
    stats: [
      { value: '3.7V', label: 'Li-ion cell voltage', icon: '🔋' },
      { value: '250 Wh/kg', label: 'Energy density', icon: '⚡' },
      { value: '1000+', label: 'Charge cycles', icon: '🔄' }
    ],
    examples: ['Phone batteries', 'EV battery packs', 'Grid storage', 'Laptop batteries'],
    companies: ['CATL', 'LG Energy', 'Panasonic', 'Samsung SDI'],
    futureImpact: 'Solid-state batteries and new chemistries promise higher voltage cells, greater energy density, and faster charging for next-generation EVs and devices.',
    color: '#10B981'
  },
  {
    icon: '💓',
    title: 'Electrocardiography (ECG)',
    short: 'Heart electrical monitoring',
    tagline: 'Mapping cardiac potentials',
    description: 'ECG machines measure potential differences across the heart as it beats. The changing voltage patterns reveal heart rhythm, conduction pathways, and potential problems.',
    connection: 'Heart muscle cells create potential differences during depolarization and repolarization. ECG electrodes measure these millivolt-level potentials at different points on the body surface.',
    howItWorks: 'Ion channels opening create potential waves that spread across the heart. Skin electrodes detect these potentials. The ECG displays voltage vs time, with distinct P, QRS, and T waves.',
    stats: [
      { value: '1 mV', label: 'QRS amplitude', icon: '📊' },
      { value: '12', label: 'Standard leads', icon: '📍' },
      { value: '60-100', label: 'Normal heart rate', icon: '💓' }
    ],
    examples: ['Hospital monitors', 'Smartwatches', 'Stress tests', 'Holter monitors'],
    companies: ['Philips', 'GE Healthcare', 'Apple', 'Medtronic'],
    futureImpact: 'AI-powered ECG analysis can detect subtle patterns indicating disease risk years before symptoms appear, enabling preventive intervention.',
    color: '#EF4444'
  },
  {
    icon: '🧠',
    title: 'Neural Signal Recording',
    short: 'Brain-computer interfaces',
    tagline: 'Reading thoughts through potentials',
    description: 'Brain-computer interfaces measure the tiny voltage changes from neuron activity. Arrays of electrodes map potential across brain regions, enabling control of prosthetics and computers.',
    connection: 'Neurons create action potentials (~100mV) as ions flow through channels. Extracellular electrodes detect the superposition of many neurons. Processing reveals neural intent.',
    howItWorks: 'Microelectrode arrays implanted in motor cortex detect potential changes when thinking about movement. Algorithms decode neural patterns into control signals for robotic arms or cursors.',
    stats: [
      { value: '100 μV', label: 'Signal amplitude', icon: '📊' },
      { value: '1000+', label: 'Electrode channels', icon: '🔌' },
      { value: '90%+', label: 'Decoding accuracy', icon: '🎯' }
    ],
    examples: ['Neuralink', 'Utah arrays', 'EEG headsets', 'Cochlear implants'],
    companies: ['Neuralink', 'Blackrock Neurotech', 'Synchron', 'Paradromics'],
    futureImpact: 'Higher-density electrode arrays and better algorithms may restore natural movement and even enable direct brain-to-brain communication.',
    color: '#8B5CF6'
  },
  {
    icon: '⚡',
    title: 'Capacitor Energy Storage',
    short: 'Instant power delivery',
    tagline: 'Storing charge at high potential',
    description: 'Capacitors store energy by maintaining charge separation at a potential difference. Energy stored is E = ½CV², making high voltage critical for energy density.',
    connection: 'A capacitor stores energy proportional to voltage squared. Doubling voltage quadruples stored energy. Supercapacitors use large surface area to achieve high capacitance at moderate voltage.',
    howItWorks: 'Charge accumulates on separated conductive plates. The potential difference V = Q/C determines stored energy. Dielectric material between plates increases capacitance and breakdown voltage.',
    stats: [
      { value: '3000 F', label: 'Supercap capacitance', icon: '⚡' },
      { value: '5 Wh/kg', label: 'Energy density', icon: '🔋' },
      { value: '1M cycles', label: 'Cycle life', icon: '🔄' }
    ],
    examples: ['Camera flash', 'Regenerative braking', 'Grid stabilization', 'Backup power'],
    companies: ['Maxwell', 'Skeleton', 'Panasonic', 'KEMET'],
    futureImpact: 'Hybrid battery-supercapacitor systems combine the energy density of batteries with the power density and cycle life of capacitors.',
    color: '#F59E0B'
  }
];

const ElectricPotentialRenderer: React.FC<Props> = ({
  onGameEvent,
  gamePhase,
  onPhaseComplete
}) => {
  // ==================== STATE ====================
  const [phase, setPhase] = useState<Phase>(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  });
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppIndex, setActiveAppIndex] = useState(0);
  const { isMobile } = useViewport();
const [testScore, setTestScore] = useState(0);
  const [testIndex, setTestIndex] = useState(0);
  const [showTestExplanation, setShowTestExplanation] = useState(false);

  // Simulation state
  const [sourceCharges, setSourceCharges] = useState<SourceCharge[]>([
    { id: 1, x: 200, y: 200, q: 5 }
  ]);
  const [testChargePos, setTestChargePos] = useState({ x: 300, y: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [showEquipotentials, setShowEquipotentials] = useState(true);
  const [selectedConfig, setSelectedConfig] = useState<'single' | 'dipole' | 'parallel'>('single');
  const [plateVoltage, setPlateVoltage] = useState(100); // V for parallel plates

  // Constants
  const k = 8.99e9; // Coulomb's constant N⋅m²/C²

  // Refs
  const svgRef = useRef<SVGSVGElement>(null);

  // ==================== EFFECTS ====================
// Sync phase with gamePhase prop
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

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

  useEffect(() => {
    if (onGameEvent) {
      onGameEvent({ type: 'phase_change', data: { phase } });
    }
  }, [phase, onGameEvent]);

  useEffect(() => {
    // Update source charges based on configuration
    if (selectedConfig === 'single') {
      setSourceCharges([{ id: 1, x: 200, y: 200, q: 5 }]);
    } else if (selectedConfig === 'dipole') {
      setSourceCharges([
        { id: 1, x: 150, y: 200, q: 5 },
        { id: 2, x: 250, y: 200, q: -5 }
      ]);
    } else {
      setSourceCharges([]); // Parallel plates use different visualization
    }
  }, [selectedConfig]);

  // ==================== AUDIO ====================
  const playSound = useCallback((type: 'click' | 'correct' | 'incorrect' | 'complete' | 'whoosh') => {
    try {
      const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      switch (type) {
        case 'click':
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.1);
          break;
        case 'correct':
          oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.3);
          break;
        case 'incorrect':
          oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.2);
          break;
        case 'complete':
          oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(554.37, audioContext.currentTime + 0.15);
          oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.3);
          oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.45);
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.6);
          break;
        case 'whoosh':
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.2);
          break;
      }
    } catch {
      // Audio not available
    }
  }, []);

  // ==================== NAVIGATION ====================
  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('click');
    const currentIndex = phaseOrder.indexOf(phase);
    const newIndex = phaseOrder.indexOf(newPhase);

    setPhase(newPhase);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    if (onPhaseComplete && newIndex > currentIndex) {
      onPhaseComplete(phase);
    }
  }, [phase, onPhaseComplete, playSound]);

  // ==================== PHYSICS CALCULATIONS ====================
  const calculatePotential = useCallback((x: number, y: number): number => {
    if (selectedConfig === 'parallel') {
      // Uniform field between parallel plates
      // V decreases linearly from left to right
      const plateLeft = 100;
      const plateRight = 300;
      if (x <= plateLeft) return plateVoltage;
      if (x >= plateRight) return 0;
      return plateVoltage * (1 - (x - plateLeft) / (plateRight - plateLeft));
    }

    let V = 0;
    sourceCharges.forEach(charge => {
      const dx = x - charge.x;
      const dy = y - charge.y;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r < 15) return; // Avoid singularity at charge location

      // V = kq/r, convert μC to C and pixels to meters
      const q_C = charge.q * 1e-6;
      const r_m = r * 0.001; // Assume 1 pixel = 1mm
      V += k * q_C / r_m;
    });
    return V;
  }, [sourceCharges, selectedConfig, plateVoltage]);

  const calculateField = useCallback((x: number, y: number): { Ex: number; Ey: number; E: number } => {
    if (selectedConfig === 'parallel') {
      // Uniform field between plates
      const E = plateVoltage / 0.2; // 200mm separation
      return { Ex: -E, Ey: 0, E };
    }

    let Ex = 0;
    let Ey = 0;
    sourceCharges.forEach(charge => {
      const dx = x - charge.x;
      const dy = y - charge.y;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r < 15) return;

      const q_C = charge.q * 1e-6;
      const r_m = r * 0.001;
      const E_mag = k * Math.abs(q_C) / (r_m * r_m);
      const direction = charge.q > 0 ? 1 : -1;
      Ex += direction * E_mag * (dx / r);
      Ey += direction * E_mag * (dy / r);
    });
    const E = Math.sqrt(Ex * Ex + Ey * Ey);
    return { Ex, Ey, E };
  }, [sourceCharges, selectedConfig, plateVoltage]);

  // Current potential and field at test charge
  const currentPotential = calculatePotential(testChargePos.x, testChargePos.y);
  const currentField = calculateField(testChargePos.x, testChargePos.y);

  // ==================== EVENT HANDLERS ====================
  const handlePrediction = useCallback((prediction: string) => {
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'B' ? 'correct' : 'incorrect');

    if (onGameEvent) {
      onGameEvent({
        type: 'prediction_made',
        data: { prediction, correct: prediction === 'B' }
      });
    }
  }, [onGameEvent, playSound]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'C' ? 'correct' : 'incorrect');

    if (onGameEvent) {
      onGameEvent({
        type: 'prediction_made',
        data: { prediction, correct: prediction === 'C', twist: true }
      });
    }
  }, [onGameEvent, playSound]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
    playSound('click');

    if (onGameEvent) {
      onGameEvent({
        type: 'test_answered',
        data: { questionIndex, answerIndex }
      });
    }
  }, [onGameEvent, playSound]);

  const handleAppComplete = useCallback((appIndex: number) => {
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');

    if (onGameEvent) {
      onGameEvent({
        type: 'app_explored',
        data: { appIndex, appTitle: transferApps[appIndex].title }
      });
    }
  }, [onGameEvent, playSound]);

  const handleMouseMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setTestChargePos({
      x: Math.max(20, Math.min(380, x)),
      y: Math.max(20, Math.min(380, y))
    });

    if (onGameEvent) {
      onGameEvent({
        type: 'test_charge_moved',
        data: { x, y, potential: calculatePotential(x, y) }
      });
    }
  }, [isDragging, calculatePotential, onGameEvent]);

  const handleTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (!isDragging || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    setTestChargePos({
      x: Math.max(20, Math.min(380, x)),
      y: Math.max(20, Math.min(380, y))
    });
  }, [isDragging]);

  // ==================== TEST DATA ====================
  const testQuestions: TestQuestion[] = [
    {
      scenario: "A scientist places a +2μC charge at a point where the electric potential is 500V.",
      question: "What is the potential energy of the charge at this location?",
      options: [
        { text: "250 joules total", correct: false },
        { text: "1 millijoule (1 mJ)", correct: true },
        { text: "500 joules total", correct: false },
        { text: "2500 joules total", correct: false }
      ],
      explanation: "U = qV = (2×10⁻⁶ C)(500 V) = 1×10⁻³ J = 1 mJ. Potential energy equals charge times potential."
    },
    {
      scenario: "An electron is released from rest at V = -100V and moves to V = 0V.",
      question: "How much kinetic energy does the electron gain?",
      options: [
        { text: "100 electron-volts gained", correct: true },
        { text: "Negative 100 electron-volts", correct: false },
        { text: "Zero electron-volts", correct: false },
        { text: "1.6 × 10⁻¹⁷ joules", correct: false }
      ],
      explanation: "ΔKE = -qΔV = -(-e)(0-(-100)) = +100 eV. The electron gains 100 eV of kinetic energy."
    },
    {
      scenario: "A +5μC charge creates an electric potential field. You measure V = 900 kV at distance r.",
      question: "What is the distance r from the charge?",
      options: [
        { text: "About 1 centimeter", correct: false },
        { text: "About 5 centimeters", correct: true },
        { text: "About 10 centimeters", correct: false },
        { text: "About 50 centimeters", correct: false }
      ],
      explanation: "V = kq/r, so r = kq/V = (8.99×10⁹)(5×10⁻⁶)/(9×10⁵) = 0.05 m = 5 cm."
    },
    {
      scenario: "A capacitor has two parallel plates separated by 2mm with 200V between them.",
      question: "What is the magnitude of the electric field between the plates?",
      options: [
        { text: "100 volts per meter", correct: false },
        { text: "400 volts per meter", correct: false },
        { text: "100,000 volts per meter", correct: true },
        { text: "200 volts per meter", correct: false }
      ],
      explanation: "E = V/d = 200 V / 0.002 m = 100,000 V/m. The field is uniform between parallel plates."
    },
    {
      scenario: "A proton and electron start from rest between two plates with 1000V potential difference.",
      question: "Which particle gains more kinetic energy?",
      options: [
        { text: "The proton because it is heavier", correct: false },
        { text: "The electron because it is lighter", correct: false },
        { text: "Both gain exactly the same energy", correct: true },
        { text: "Neither gains any energy at all", correct: false }
      ],
      explanation: "Both gain KE = |q|ΔV = (1.6×10⁻¹⁹)(1000) = 1000 eV. Energy depends on charge and potential, not mass."
    },
    {
      scenario: "A test charge is moved along an equipotential surface from point A to point B.",
      question: "How much work is done by the electric field?",
      options: [
        { text: "Maximum work with field", correct: false },
        { text: "Depends on path taken", correct: false },
        { text: "Zero because same potential", correct: true },
        { text: "Negative work against field", correct: false }
      ],
      explanation: "W = qΔV. Along an equipotential, ΔV = 0, so W = 0. No work is done moving along equipotential surfaces."
    },
    {
      scenario: "Two charges (+4μC and -4μC) form a dipole separated by 10cm.",
      question: "What is the potential at the exact midpoint?",
      options: [
        { text: "Very high positive potential", correct: false },
        { text: "Very high negative potential", correct: false },
        { text: "Exactly zero at midpoint", correct: true },
        { text: "Undefined at that location", correct: false }
      ],
      explanation: "At the midpoint, distance to each charge is equal. V = k(+q)/r + k(-q)/r = 0."
    },
    {
      scenario: "A Van de Graaff generator charges a sphere to 500,000V. A person touches it.",
      question: "Why might the spark be harmless despite high voltage?",
      options: [
        { text: "High voltage means high current", correct: false },
        { text: "Human body is a perfect insulator", correct: false },
        { text: "Limited charge means limited energy", correct: true },
        { text: "Voltage has no effect on body", correct: false }
      ],
      explanation: "Energy = qV. While V is high, stored charge q is very small, so total energy is small."
    },
    {
      scenario: "A 12V battery maintains constant voltage between terminals as current flows.",
      question: "What does the battery do to charges passing through?",
      options: [
        { text: "Nothing — charges flow naturally", correct: false },
        { text: "Raises their electric potential", correct: true },
        { text: "Removes energy from charges", correct: false },
        { text: "Changes the charge of electrons", correct: false }
      ],
      explanation: "The battery does work on charges to raise their potential energy by 12 eV per electron."
    },
    {
      scenario: "Lightning: potential difference of 100 million volts across a 1km gap ionizes air.",
      question: "What is the approximate breakdown electric field?",
      options: [
        { text: "About 1,000 volts per meter", correct: false },
        { text: "About 10,000 volts per meter", correct: false },
        { text: "About 100,000 volts per meter", correct: true },
        { text: "About 1 billion volts per meter", correct: false }
      ],
      explanation: "E = V/d = 10⁸ V / 10³ m = 10⁵ V/m = 100 kV/m."
    }
  ];

  const transferApps: TransferApp[] = [
    {
      icon: "🔋",
      title: "Batteries & Power Supplies",
      short: "Batteries",
      tagline: "Portable potential difference",
      description: "Batteries create a constant potential difference (voltage) between terminals through chemical reactions, enabling portable electronic devices and electric vehicles.",
      connection: "A battery uses chemical energy to maintain a fixed electric potential difference between its terminals, creating the 'electrical pressure' that pushes current through circuits.",
      howItWorks: [
        "Chemical reactions at electrodes create excess electrons at one terminal",
        "This creates a potential difference (EMF) between positive and negative terminals",
        "When connected in a circuit, electrons flow from low to high potential through the battery",
        "The battery does work on charges, increasing their potential energy"
      ],
      stats: [
        { value: "1.5V", label: "AA Battery" },
        { value: "400V", label: "EV Battery" },
        { value: "3.7V", label: "Li-ion Cell" },
        { value: "12V", label: "Car Battery" }
      ],
      examples: [
        "Smartphone lithium-ion batteries",
        "Tesla 400V battery packs",
        "Lead-acid car batteries",
        "Pacemaker nuclear batteries"
      ],
      companies: ["Tesla", "Panasonic", "CATL", "Samsung SDI"],
      futureImpact: "Solid-state batteries promise higher energy density and faster charging, while sodium-ion batteries offer cheaper alternatives for grid storage.",
      color: "from-green-600 to-emerald-600"
    },
    {
      icon: "⚡",
      title: "Defibrillators & Medical",
      short: "Defibrillators",
      tagline: "Life-saving voltage pulses",
      description: "Defibrillators use high-voltage capacitors to deliver controlled electrical shocks that restore normal heart rhythm during cardiac emergencies.",
      connection: "The capacitor stores energy U = ½CV², then releases it as a controlled voltage pulse. The potential difference drives current through the heart to reset electrical activity.",
      howItWorks: [
        "Capacitor charges to 1000-3000V over several seconds",
        "Energy stored reaches 200-360 Joules",
        "Discharge delivers current through chest in milliseconds",
        "Potential difference drives synchronized depolarization of heart muscle"
      ],
      stats: [
        { value: "1-3 kV", label: "Voltage" },
        { value: "200-360 J", label: "Energy" },
        { value: "10-20 ms", label: "Pulse Duration" },
        { value: "30-50 A", label: "Peak Current" }
      ],
      examples: [
        "AED devices in public spaces",
        "Hospital defibrillators",
        "Implantable cardioverter-defibrillators (ICDs)",
        "Pacemakers with defibrillation capability"
      ],
      companies: ["Philips", "Medtronic", "Boston Scientific", "ZOLL"],
      futureImpact: "Smaller, smarter devices with AI-guided shock delivery and wearable defibrillators for high-risk patients.",
      color: "from-red-600 to-pink-600"
    },
    {
      icon: "⚡",
      title: "Van de Graaff Generators",
      short: "Van de Graaff",
      tagline: "Million-volt demonstrations",
      description: "Van de Graaff generators use mechanical charge separation to create extremely high voltages, demonstrating electrostatic principles and powering particle accelerators.",
      connection: "Charge is continuously transferred to a metal sphere, raising its potential V = kQ/r. The larger the sphere, the more charge it can hold at a given potential before breakdown.",
      howItWorks: [
        "Rubber belt picks up charge from lower electrode",
        "Belt transports charge to hollow metal sphere",
        "Charge accumulates on outer surface of sphere",
        "Potential rises until limited by air breakdown (~3 MV/m)"
      ],
      stats: [
        { value: "500 kV", label: "Teaching Model" },
        { value: "5-15 MV", label: "Research Models" },
        { value: "3 MV/m", label: "Air Breakdown" },
        { value: "~100 μA", label: "Typical Current" }
      ],
      examples: [
        "Physics classroom demonstrations",
        "Tandem Van de Graaff accelerators",
        "Nuclear physics research",
        "X-ray generation for medical imaging"
      ],
      companies: ["National Electrostatics Corp", "HVEE", "MIT", "BNL"],
      futureImpact: "Modern electrostatic accelerators enable nuclear medicine isotope production and materials analysis.",
      color: "from-purple-600 to-violet-600"
    },
    {
      icon: "💡",
      title: "Capacitor Energy Storage",
      short: "Capacitors",
      tagline: "Storing charge at controlled potential",
      description: "Capacitors store electric potential energy by accumulating charge on conductive plates separated by an insulator, enabling rapid energy release in electronics.",
      connection: "A capacitor stores energy by maintaining a potential difference between its plates: U = ½CV². The stored energy depends on both capacitance and the square of voltage.",
      howItWorks: [
        "Charge accumulates on parallel conductive plates",
        "A uniform electric field forms between the plates: E = V/d",
        "Energy is stored in the electric field: U = ½CV²",
        "Discharge releases stored energy rapidly when circuit closes"
      ],
      stats: [
        { value: "μF-mF", label: "Typical Range" },
        { value: "3000F", label: "Supercapacitor" },
        { value: "1-50kV", label: "HV Capacitors" },
        { value: "μs", label: "Discharge Time" }
      ],
      examples: [
        "Camera flash capacitors",
        "Computer RAM memory cells",
        "Supercapacitor hybrid buses",
        "Power supply filtering"
      ],
      companies: ["Maxwell", "Murata", "Vishay", "TDK"],
      futureImpact: "Hybrid capacitor-battery systems enable regenerative braking in vehicles and grid-scale frequency regulation for renewable energy.",
      color: "from-yellow-600 to-amber-600"
    }
  ];

  // ==================== SCORE CALCULATION ====================
  const calculateScore = useCallback(() => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  }, [testAnswers, testQuestions]);

  // ==================== RENDER HELPERS ====================
  const formatVoltage = (v: number): string => {
    const absV = Math.abs(v);
    if (absV >= 1e9) return (v / 1e9).toFixed(1) + ' GV';
    if (absV >= 1e6) return (v / 1e6).toFixed(1) + ' MV';
    if (absV >= 1e3) return (v / 1e3).toFixed(1) + ' kV';
    if (absV >= 1) return v.toFixed(1) + ' V';
    if (absV >= 1e-3) return (v * 1e3).toFixed(1) + ' mV';
    return (v * 1e6).toFixed(1) + ' μV';
  };

  const getPotentialColor = (v: number): string => {
    // Normalize to color range
    const maxV = 1e6; // 1 MV reference
    const normalized = Math.tanh(v / maxV); // -1 to 1

    if (normalized > 0) {
      const intensity = Math.min(255, Math.floor(normalized * 255));
      return `rgb(${intensity}, ${Math.floor(intensity * 0.3)}, ${Math.floor(intensity * 0.3)})`;
    } else {
      const intensity = Math.min(255, Math.floor(-normalized * 255));
      return `rgb(${Math.floor(intensity * 0.3)}, ${Math.floor(intensity * 0.3)}, ${intensity})`;
    }
  };

  // Generate equipotential lines
  const generateEquipotentials = useCallback(() => {
    const lines: { V: number; points: { x: number; y: number }[] }[] = [];

    if (selectedConfig === 'parallel') {
      // Vertical lines for parallel plates
      for (let i = 0; i <= 4; i++) {
        const x = 100 + i * 50;
        const V = plateVoltage * (1 - i / 4);
        lines.push({ V, points: [{ x, y: 50 }, { x, y: 350 }] });
      }
    } else {
      // Contour lines for point charges
      const potentials = [1e6, 5e5, 2e5, 1e5, 5e4, -5e4, -1e5, -2e5, -5e5, -1e6];
      potentials.forEach(targetV => {
        const points: { x: number; y: number }[] = [];
        // March around to find contour
        for (let angle = 0; angle < 360; angle += 5) {
          for (let r = 20; r < 180; r += 2) {
            const center = selectedConfig === 'single'
              ? { x: 200, y: 200 }
              : { x: 200, y: 200 };
            const x = center.x + r * Math.cos(angle * Math.PI / 180);
            const y = center.y + r * Math.sin(angle * Math.PI / 180);
            if (x < 20 || x > 380 || y < 20 || y > 380) continue;

            const V = calculatePotential(x, y);
            if (Math.abs(V - targetV) < Math.abs(targetV) * 0.1) {
              points.push({ x, y });
              break;
            }
          }
        }
        if (points.length > 5) {
          lines.push({ V: targetV, points });
        }
      });
    }
    return lines;
  }, [selectedConfig, plateVoltage, calculatePotential]);

  // ==================== PHASE RENDERERS ====================
  const renderHook = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '600px', padding: '48px 24px', textAlign: 'center' }}>
      {/* Premium Badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '9999px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', marginBottom: '24px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
        <span style={{ color: '#fbbf24', fontSize: '14px', fontWeight: 500 }}>Electromagnetic Physics</span>
      </div>

      {/* Title */}
      <h1 style={{ fontSize: isMobile ? '30px' : '36px', fontWeight: 800, lineHeight: 1.2, color: '#f59e0b', marginBottom: '12px', fontFamily: theme.fontFamily }}>
        Electric Potential
      </h1>

      {/* Subtitle */}
      <p style={{ fontSize: '17px', fontWeight: 400, lineHeight: 1.6, color: 'rgba(148, 163, 184, 0.8)', maxWidth: '500px', marginBottom: '32px' }}>
        Discover the energy landscape that drives electric current
      </p>

      {/* Premium Card */}
      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '24px', padding: isMobile ? '24px' : '32px', maxWidth: '700px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <svg viewBox="0 0 400 300" style={{ width: '100%', margin: '0 auto 24px', display: 'block' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Electric Potential visualization">
          <defs>
            {/* Premium background gradient showing potential field */}
            <radialGradient id="epotHookBg" cx="25%" cy="50%" r="80%">
              <stop offset="0%" stopColor="#dc2626" stopOpacity="0.7" />
              <stop offset="25%" stopColor="#f97316" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.3" />
              <stop offset="75%" stopColor="#22c55e" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.1" />
            </radialGradient>

            {/* Source charge gradient with glow */}
            <radialGradient id="epotHookSource" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="30%" stopColor="#f97316" />
              <stop offset="60%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#991b1b" />
            </radialGradient>

            {/* Test charge gradient */}
            <radialGradient id="epotHookTest" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="40%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1e40af" />
            </radialGradient>

            {/* Equipotential line gradient */}
            <linearGradient id="epotHookEqui" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0.1" />
            </linearGradient>

            {/* Work arrow gradient */}
            <linearGradient id="epotHookArrow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>

            {/* Source charge glow filter */}
            <filter id="epotHookGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#f97316" floodOpacity="0.5" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Test charge glow */}
            <filter id="epotHookTestGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor="#3b82f6" floodOpacity="0.4" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Arrow marker */}
            <marker id="epotHookArrowHead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#22c55e" />
            </marker>
          </defs>

          {/* Premium background */}
          <rect x="0" y="0" width="400" height="300" fill="#0f172a" rx="15" />
          <rect x="0" y="0" width="400" height="300" fill="url(#epotHookBg)" rx="15" />

          {/* Equipotential lines with gradient glow */}
          <circle cx="100" cy="150" r="55" fill="none" stroke="url(#epotHookEqui)" strokeWidth="2" strokeDasharray="6,4" opacity="0.7" />
          <circle cx="100" cy="150" r="90" fill="none" stroke="url(#epotHookEqui)" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.5" />
          <circle cx="100" cy="150" r="130" fill="none" stroke="url(#epotHookEqui)" strokeWidth="1" strokeDasharray="6,4" opacity="0.3" />

          {/* Positive source charge with glow */}
          <g filter="url(#epotHookGlow)">
            <circle cx="100" cy="150" r="28" fill="url(#epotHookSource)" stroke="#fff" strokeWidth="3" />
            <circle cx="92" cy="142" r="7" fill="#fff" opacity="0.25" />
          </g>

          {/* Test charge with glow */}
          <g filter="url(#epotHookTestGlow)">
            <circle cx="260" cy="150" r="17" fill="url(#epotHookTest)" stroke="#fff" strokeWidth="2" />
            <circle cx="254" cy="144" r="4" fill="#fff" opacity="0.3" />
          </g>

          {/* Work arrow with gradient */}
          <path d="M238,150 L145,150" fill="none" stroke="url(#epotHookArrow)" strokeWidth="4" markerEnd="url(#epotHookArrowHead)" />
        </svg>

        {/* Labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 32px' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444', display: 'block' }}>+Q Source</span>
            <span style={{ fontSize: '12px', color: '#fbbf24' }}>High V</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#22c55e' }}>Work = qDelta V</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#60a5fa', display: 'block' }}>Test q</span>
            <span style={{ fontSize: '12px', color: '#22c55e' }}>Low V</span>
          </div>
        </div>

        <p style={{ fontSize: '18px', fontWeight: 500, lineHeight: 1.5, color: '#cbd5e1', marginBottom: '16px' }}>
          Why does a ball roll downhill? Gravity creates a potential energy landscape!
        </p>
        <p style={{ fontSize: '16px', fontWeight: 600, lineHeight: 1.5, color: '#f59e0b' }}>
          Electric charges do the same thing - they "roll" from high to low electric potential!
        </p>
        <p style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.6, color: '#94a3b8', marginTop: '16px' }}>
          Just like height determines gravitational potential, <span style={{ color: '#f59e0b' }}>voltage</span> determines electric potential energy per charge.
        </p>
      </div>

      {/* Premium CTA Button */}
      <button
        onClick={() => goToPhase('predict')}
        style={{
          background: 'linear-gradient(135deg, #d97706, #ea580c)',
          color: '#ffffff',
          border: 'none',
          padding: '16px 32px',
          borderRadius: '16px',
          fontSize: '18px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(217, 119, 6, 0.3)',
          transition: 'all 0.3s ease',
          marginTop: '32px',
          fontFamily: theme.fontFamily,
        }}
      >
        Explore Electric Potential
      </button>

      <p style={{ marginTop: '16px', fontSize: '14px', fontWeight: 400, lineHeight: 1.5, color: 'rgba(100, 116, 139, 0.8)' }}>
        Tap to begin your exploration
      </p>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>
        Make Your Prediction
      </h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A positive test charge is released from rest at point A (high potential) and moves freely to point B (low potential).
        </p>
        <svg viewBox="0 0 300 150" className="w-full max-w-sm mx-auto" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="300" height="150" fill="#1e293b" rx="10" />
          {/* Potential gradient background */}
          <linearGradient id="vGrad">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.5" />
          </linearGradient>
          <rect x="30" y="50" width="240" height="60" fill="url(#vGrad)" rx="5" />

          {/* Points A and B */}
          <circle cx="60" cy="80" r="15" fill="#ef4444" stroke="#fff" strokeWidth="2" />
          <text x="60" y="85" textAnchor="middle" fill="white" fontWeight="bold">A</text>
          <text x="60" y="130" textAnchor="middle" fill="#ef4444" fontSize="12">V = 1000V</text>

          <circle cx="240" cy="80" r="15" fill="#22c55e" stroke="#fff" strokeWidth="2" />
          <text x="240" y="85" textAnchor="middle" fill="white" fontWeight="bold">B</text>
          <text x="240" y="130" textAnchor="middle" fill="#22c55e" fontSize="12">V = 0V</text>

          {/* Arrow */}
          <path d="M85,80 L215,80" fill="none" stroke="white" strokeWidth="2" markerEnd="url(#arr)" />

          <defs>
            <marker id="arr" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="white" />
            </marker>
          </defs>
        </svg>
        <p className="text-cyan-400 font-medium mt-4">
          What happens to the charge's kinetic energy as it moves from A to B?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The charge slows down (loses kinetic energy)' },
          { id: 'B', text: 'The charge speeds up (gains kinetic energy)' },
          { id: 'C', text: 'The charge maintains constant speed' },
          { id: 'D', text: 'The charge stops at the midpoint' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            style={{ zIndex: 10, minHeight: '44px' }}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'B'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'B'
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span style={{ color: '#e2e8f0' }} className="ml-2">{option.text}</span>
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            Correct! The charge gains kinetic energy as it "falls" to lower potential!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            Delta KE = q x Delta V = q x (V_A - V_B) = q x 1000V. The potential energy converts to kinetic energy.
          </p>
          <button
            onClick={() => goToPhase('play')}
            style={{ zIndex: 10, minHeight: '44px' }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all duration-300"
          >
            Explore the Simulation
          </button>
        </div>
      )}
    </div>
  );

  // Generate electric field vectors for visualization
  const generateFieldVectors = useCallback(() => {
    const vectors: { x: number; y: number; Ex: number; Ey: number; E: number }[] = [];
    const spacing = 40;
    for (let i = 1; i < 10; i++) {
      for (let j = 1; j < 10; j++) {
        const x = i * spacing;
        const y = j * spacing;
        // Skip if too close to source charges
        let tooClose = false;
        sourceCharges.forEach(charge => {
          const dx = x - charge.x;
          const dy = y - charge.y;
          if (Math.sqrt(dx * dx + dy * dy) < 35) tooClose = true;
        });
        if (!tooClose) {
          const field = calculateField(x, y);
          vectors.push({ x, y, ...field });
        }
      }
    }
    return vectors;
  }, [sourceCharges, calculateField]);

  const renderPlay = () => {
    // Generate potential curve path for the graph - uses space-separated coords with 20+ L points
    const generatePotentialCurve = () => {
      const points: string[] = [];
      const graphLeft = 60;
      const graphRight = 380;
      const graphTop = 60;
      const graphBottom = 340;
      const numPoints = 25;
      for (let i = 0; i <= numPoints; i++) {
        const frac = i / numPoints;
        const sampleX = 50 + frac * 300;
        const V = calculatePotential(sampleX, 200);
        const clampedV = Math.max(-1e6, Math.min(1e6, V));
        const normalizedV = Math.tanh(clampedV / 5e5);
        const px = graphLeft + frac * (graphRight - graphLeft);
        const py = (graphTop + graphBottom) / 2 - normalizedV * ((graphBottom - graphTop) / 2 - 10);
        points.push(`${px.toFixed(1)} ${py.toFixed(1)}`);
      }
      return `M ${points[0]} ${points.slice(1).map(p => `L ${p}`).join(' ')}`;
    };

    // Interactive marker position on the curve
    const markerFrac = (plateVoltage - 10) / (500 - 10);
    const markerX = 60 + markerFrac * 320;
    const markerSampleX = 50 + markerFrac * 300;
    const markerV = calculatePotential(markerSampleX, 200);
    const markerClampedV = Math.max(-1e6, Math.min(1e6, markerV));
    const markerNormV = Math.tanh(markerClampedV / 5e5);
    const markerY = 200 - markerNormV * 130;

    return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700, lineHeight: 1.3, color: '#ffffff', marginBottom: '16px', fontFamily: theme.fontFamily }}>
        Electric Potential Lab
      </h2>

      <p style={{ fontSize: '15px', fontWeight: 400, lineHeight: 1.6, color: '#e2e8f0', textAlign: 'center', marginBottom: '8px', maxWidth: '600px' }}>
        Observe how the potential curve changes as you adjust the slider. This graph illustrates how V = kq/r represents energy per unit charge. When you increase voltage, the curve rises because higher voltage causes stronger potential.
      </p>
      <p style={{ fontSize: '13px', fontWeight: 400, lineHeight: 1.5, color: '#94a3b8', textAlign: 'center', marginBottom: '16px', maxWidth: '600px' }}>
        This is important in real-world technology: electric potential is used in batteries, capacitors, and medical devices where voltage differences drive current flow.
      </p>

      {/* SVG Title */}
      <div style={{ fontSize: '16px', fontWeight: 600, color: '#f59e0b', marginBottom: '8px', textAlign: 'center' }}>Electric Potential vs Distance</div>

      {/* Side-by-side layout */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : '20px',
        width: '100%',
        alignItems: isMobile ? 'center' : 'flex-start',
        maxWidth: '900px',
      }}>
      <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
      {/* Main SVG Graph */}
      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px', marginBottom: '16px', border: '1px solid rgba(71, 85, 105, 0.5)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', width: '100%' }}>
        <svg viewBox="0 0 420 400" style={{ width: '100%', display: 'block' }} preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="epotCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <radialGradient id="epotMarkerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
            <filter id="epotGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="epotShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Background */}
          <rect x="0" y="0" width="420" height="400" fill="#0f172a" rx="12" />

          {/* Grid lines group */}
          <g opacity="0.5">
          {[100, 150, 200, 250, 300].map(y => (
            <line key={`gy-${y}`} x1="60" y1={y} x2="380" y2={y} stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5" />
          ))}
          {[100, 150, 200, 250, 300, 350].map(x => (
            <line key={`gx-${x}`} x1={x} y1="60" x2={x} y2="340" stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5" />
          ))}
          </g>

          {/* Axes */}
          <line x1="60" y1="340" x2="380" y2="340" stroke="#94a3b8" strokeWidth="2" />
          <line x1="60" y1="60" x2="60" y2="340" stroke="#94a3b8" strokeWidth="2" />

          {/* Y axis label */}
          <text x="12" y="54" fill="#f59e0b" fontSize="12" fontWeight="600" textAnchor="start">V</text>

          {/* X axis label */}
          <text x="220" y="390" fill="#94a3b8" fontSize="12" fontWeight="600" textAnchor="middle">Distance (mm)</text>

          {/* Y axis tick labels */}
          <text x="52" y="72" fill="#94a3b8" fontSize="11" textAnchor="end">+High</text>
          <text x="52" y="198" fill="#94a3b8" fontSize="11" textAnchor="end">0</text>
          <text x="52" y="336" fill="#94a3b8" fontSize="11" textAnchor="end">-Low</text>

          {/* X axis tick labels */}
          <text x="70" y="358" fill="#94a3b8" fontSize="11" textAnchor="middle">0</text>
          <text x="220" y="358" fill="#94a3b8" fontSize="11" textAnchor="middle">150</text>
          <text x="370" y="358" fill="#94a3b8" fontSize="11" textAnchor="middle">300</text>

          {/* Potential curve path - space-separated, 25+ L points */}
          <path
            d={generatePotentialCurve()}
            fill="none"
            stroke="url(#epotCurveGrad)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Reference zero line */}
          <line x1="60" y1="200" x2="380" y2="200" stroke="#64748b" strokeWidth="1" strokeDasharray="6 4" opacity="0.6" />
          <text x="385" y="204" fill="#64748b" fontSize="11">V=0</text>

          {/* Interactive marker circle - moves with slider */}
          <g filter="url(#epotGlowFilter)">
            <circle cx={markerX} cy={markerY} r="20" fill="url(#epotMarkerGlow)" />
            <circle cx={markerX} cy={markerY} r="8" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
            <circle cx={markerX} cy={markerY} r="14" fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.4">
              <animate attributeName="r" values="12;16;12" dur="2s" repeatCount="indefinite" />
            </circle>
          </g>

          {/* Marker label - positioned below marker to avoid overlap */}
          <text x={Math.min(markerX, 340)} y={Math.min(markerY + 28, 330)} fill="#f59e0b" fontSize="11" fontWeight="700" textAnchor="middle">{formatVoltage(markerV)}</text>

          {/* Source charge label */}
          <text x="80" y="88" fill="#ef4444" fontSize="12" fontWeight="600">Source: +Q</text>

          {/* Test charge label */}
          <text x="280" y="88" fill="#22c55e" fontSize="12" fontWeight="600">Test: +q</text>

          {/* Formula - placed in separate area to avoid overlap */}
          <text x="210" y="30" fill="#fbbf24" fontSize="12" fontWeight="600" textAnchor="middle">V = kq/r | F = qE | E = -dV/dr</text>

          {/* Legend panel */}
          <g filter="url(#epotShadow)">
            <rect x="260" y="100" width="110" height="60" fill="#0f172a" stroke="#334155" strokeWidth="1" rx="6" opacity="0.9" />
            <circle cx="276" cy="118" r="5" fill="#f59e0b" />
            <text x="288" y="122" fill="#e2e8f0" fontSize="11">Potential curve</text>
            <circle cx="276" cy="138" r="5" fill="#22c55e" stroke="#fff" strokeWidth="1" />
            <text x="288" y="142" fill="#e2e8f0" fontSize="11">Marker position</text>
            <line x1="270" y1="152" x2="282" y2="152" stroke="#64748b" strokeDasharray="4 2" />
            <text x="288" y="156" fill="#e2e8f0" fontSize="11">Zero reference</text>
          </g>
        </svg>
      </div>
      </div>

      <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
      {/* Slider controls */}
      <div style={{ width: '100%', marginBottom: '16px' }}>
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label htmlFor="voltageSlider" style={{ fontSize: '14px', fontWeight: 600, color: '#f59e0b' }}>Source Voltage</label>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>{plateVoltage}V</span>
          </div>
          <input
            id="voltageSlider"
            type="range"
            min="10"
            max="500"
            value={plateVoltage}
            onInput={(e) => setPlateVoltage(Number((e.target as HTMLInputElement).value))}
            onChange={(e) => setPlateVoltage(Number(e.target.value))}
            role="slider"
            aria-label="Voltage"
            aria-valuemin={10}
            aria-valuemax={500}
            aria-valuenow={plateVoltage}
            style={{ width: '100%', height: '20px', cursor: 'pointer', accentColor: '#f59e0b', touchAction: 'pan-y', WebkitAppearance: 'none', appearance: 'none' as never }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            <span>10 (Min)</span>
            <span>500 (Max)</span>
          </div>
        </div>
      </div>

      {/* Configuration selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { id: 'single', label: 'Single Charge' },
          { id: 'dipole', label: 'Dipole' },
          { id: 'parallel', label: 'Parallel Plates' }
        ].map(config => (
          <button
            key={config.id}
            onClick={() => setSelectedConfig(config.id as 'single' | 'dipole' | 'parallel')}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              background: selectedConfig === config.id ? 'linear-gradient(135deg, #f59e0b, #ea580c)' : 'rgba(51, 65, 85, 0.8)',
              color: selectedConfig === config.id ? '#ffffff' : '#94a3b8',
            }}
          >
            {config.label}
          </button>
        ))}
      </div>

      {/* Data display - comparison layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', width: '100%', maxWidth: '500px', marginBottom: '16px' }}>
        <div style={{ background: 'rgba(30, 41, 59, 0.7)', borderRadius: '12px', padding: '12px', textAlign: 'center', border: '1px solid rgba(71, 85, 105, 0.5)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 400, lineHeight: 1.5 }}>Current Potential</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b' }}>{formatVoltage(currentPotential)}</div>
        </div>
        <div style={{ background: 'rgba(30, 41, 59, 0.7)', borderRadius: '12px', padding: '12px', textAlign: 'center', border: '1px solid rgba(71, 85, 105, 0.5)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 400, lineHeight: 1.5 }}>Reference: baseline</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#06b6d4' }}>{(currentField.E / 1000).toFixed(0)} kV/m</div>
        </div>
        <div style={{ background: 'rgba(30, 41, 59, 0.7)', borderRadius: '12px', padding: '12px', textAlign: 'center', border: '1px solid rgba(71, 85, 105, 0.5)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 400, lineHeight: 1.5 }}>Position</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#22c55e' }}>{testChargePos.x.toFixed(0)}, {testChargePos.y.toFixed(0)}</div>
        </div>
        <div style={{ background: 'rgba(30, 41, 59, 0.7)', borderRadius: '12px', padding: '12px', textAlign: 'center', border: '1px solid rgba(71, 85, 105, 0.5)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 400, lineHeight: 1.5 }}>Test Charge</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#a855f7' }}>+1 μC</div>
        </div>
      </div>

      {/* Key insight card */}
      <div style={{ background: 'linear-gradient(135deg, rgba(120, 53, 15, 0.4), rgba(154, 52, 18, 0.4))', borderRadius: '12px', padding: '16px', maxWidth: '500px', width: '100%', border: '1px solid rgba(245, 158, 11, 0.3)', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f59e0b', marginBottom: '8px', lineHeight: 1.3 }}>Key Insight</h3>
        <p style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.6, color: '#cbd5e1' }}>
          <strong>Equipotential surfaces</strong> are perpendicular to field lines. Moving along an equipotential requires <strong>no work</strong> (W = q x 0 = 0). V = kq/r for point charges.
        </p>
        <p style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.6, color: '#06b6d4', marginTop: '8px' }}>
          Formula: V = kq/r | E = -dV/dr | W = q x Delta V
        </p>
      </div>
      </div>
      </div>

      <button
        onClick={() => goToPhase('review')}
        style={{
          padding: '14px 28px',
          borderRadius: '12px',
          border: 'none',
          background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '16px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 20px rgba(245, 158, 11, 0.3)',
        }}
      >
        Review the Concepts
      </button>
    </div>
    );
  };

  const renderReview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700, lineHeight: 1.3, color: '#ffffff', marginBottom: '24px', fontFamily: theme.fontFamily }}>
        Understanding Electric Potential
      </h2>

      {/* Reference user's prediction */}
      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px', marginBottom: '24px', maxWidth: '700px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
        <p style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: 400, lineHeight: 1.6 }}>
          {selectedPrediction === 'B'
            ? "You correctly predicted that a positive charge gains kinetic energy moving from high to low potential - your prediction was right!"
            : "Your prediction showed good thinking. Remember: a positive charge gains kinetic energy when moving from high to low potential, converting potential energy to kinetic energy."}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-amber-400 mb-3">What is Electric Potential?</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li><strong>V = W/q</strong>: Work per unit charge to move from infinity</li>
            <li><strong>V = U/q</strong>: Potential energy per unit charge</li>
            <li>Measured in Volts (V) = Joules per Coulomb</li>
            <li>Positive charges create positive potential</li>
            <li>Only <strong>potential differences</strong> (Delta V) are physically meaningful</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">Point Charge Potential</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li><strong>V = kq/r</strong> for a point charge</li>
            <li>k = 8.99 x 10^9 N m^2/C^2</li>
            <li>Potential is a <strong>scalar</strong> (no direction)</li>
            <li>Potentials from multiple charges simply add</li>
            <li>V approaches 0 as r approaches infinity (reference point at infinity)</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-purple-400 mb-3">Relationship to Electric Field</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li><strong>E = -dV/dr</strong>: Field is negative gradient of potential</li>
            <li>Field points from high V to low V</li>
            <li>For uniform field: <strong>E = V/d</strong></li>
            <li>Equipotentials are perpendicular to field lines (always)</li>
            <li>Closer equipotentials = stronger field</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">Energy and Work</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li><strong>W = q Delta V</strong>: Work done by field on charge</li>
            <li><strong>U = qV</strong>: Potential energy of charge at V</li>
            <li>Positive charge gains KE moving to lower V</li>
            <li>Electron gains KE moving to higher V</li>
            <li>1 eV = energy gained by e- through 1V</li>
          </ul>
        </div>
      </div>

      <div className="mt-6 bg-slate-800/50 rounded-2xl p-6 max-w-4xl">
        <h3 className="text-lg font-bold text-white mb-3">Quick Reference</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-amber-400 font-mono text-sm">V = kq/r</div>
            <div className="text-xs text-slate-500 mt-1">Point charge</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-cyan-400 font-mono text-sm">E = -dV/dr</div>
            <div className="text-xs text-slate-500 mt-1">Field-potential</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-emerald-400 font-mono text-sm">W = q Delta V</div>
            <div className="text-xs text-slate-500 mt-1">Work done</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-purple-400 font-mono text-sm">E = V/d</div>
            <div className="text-xs text-slate-500 mt-1">Uniform field</div>
          </div>
        </div>
      </div>

      <button
        onClick={() => goToPhase('twist_predict')}
        style={{ zIndex: 10, minHeight: '44px' }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Discover a Surprising Twist
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-6`}>
        The Twist Challenge
      </h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A 9V battery is connected to a circuit. You measure the potential at various points.
        </p>
        <svg viewBox="0 0 300 200" className="w-full max-w-sm mx-auto mb-4" preserveAspectRatio="xMidYMid meet">
          {/* Battery symbol */}
          <rect x="50" y="60" width="10" height="80" fill="#ef4444" />
          <rect x="70" y="75" width="10" height="50" fill="#3b82f6" />

          {/* Wire connections */}
          <line x1="55" y1="60" x2="55" y2="40" stroke="#f59e0b" strokeWidth="3" />
          <line x1="55" y1="40" x2="250" y2="40" stroke="#f59e0b" strokeWidth="3" />
          <line x1="250" y1="40" x2="250" y2="160" stroke="#f59e0b" strokeWidth="3" />
          <line x1="250" y1="160" x2="55" y2="160" stroke="#f59e0b" strokeWidth="3" />
          <line x1="75" y1="140" x2="75" y2="160" stroke="#f59e0b" strokeWidth="3" />

          {/* Resistor */}
          <rect x="140" y="35" width="40" height="10" fill="#64748b" />

          {/* Labels */}
          <text x="55" y="110" textAnchor="middle" fill="#ef4444" fontSize="11">+9V</text>
          <text x="75" y="110" textAnchor="middle" fill="#3b82f6" fontSize="11">0V</text>
          <text x="160" y="25" textAnchor="middle" fill="#64748b" fontSize="11">Resistor</text>

          {/* Question marks at different points */}
          <circle cx="100" cy="40" r="10" fill="#f59e0b" opacity="0.5" />
          <text x="100" y="44" textAnchor="middle" fill="white" fontSize="12">A</text>

          <circle cx="200" cy="40" r="10" fill="#f59e0b" opacity="0.5" />
          <text x="200" y="44" textAnchor="middle" fill="white" fontSize="12">B</text>

          <circle cx="200" cy="160" r="10" fill="#f59e0b" opacity="0.5" />
          <text x="200" y="164" textAnchor="middle" fill="white" fontSize="12">C</text>
        </svg>

        <p className="text-lg text-cyan-400 font-medium">
          What is the potential difference (voltage) across the resistor?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: '0V - All points in a circuit have the same potential' },
          { id: 'B', text: '4.5V - Half the battery voltage' },
          { id: 'C', text: '9V - The full battery voltage appears across the resistor' },
          { id: 'D', text: '18V - Voltage doubles through the resistor' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            style={{ zIndex: 10, minHeight: '44px' }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'C'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'C'
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            Correct! The full 9V appears across the resistor in a simple circuit!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            In a series circuit with one resistor, all the voltage drop occurs across that resistor. The wires have negligible resistance, so there's no voltage drop along them.
          </p>
          <button
            onClick={() => goToPhase('twist_play')}
            style={{ zIndex: 10, minHeight: '44px' }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
          >
            Explore Voltage in Circuits
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-4`}>
        Potential Difference in Circuits
      </h2>

      {/* Side-by-side layout */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : '20px',
        width: '100%',
        alignItems: isMobile ? 'center' : 'flex-start',
        maxWidth: '900px',
      }}>
      <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-6">
        <svg viewBox="0 0 400 300" className="w-full max-w-md mx-auto" preserveAspectRatio="xMidYMid meet">
          {/* Background */}
          <rect x="0" y="0" width="400" height="300" fill="#1e293b" rx="15" />

          {/* Battery */}
          <rect x="40" y="100" width="15" height="100" fill="#ef4444" />
          <rect x="60" y="120" width="15" height="60" fill="#3b82f6" />
          <text x="55" y="90" textAnchor="middle" fill="#ef4444" fontSize="12">+9V</text>
          <text x="55" y="240" textAnchor="middle" fill="#3b82f6" fontSize="12">0V (ref)</text>

          {/* Top wire - high potential */}
          <line x1="47" y1="100" x2="47" y2="50" stroke="#ef4444" strokeWidth="4" />
          <line x1="47" y1="50" x2="350" y2="50" stroke="#ef4444" strokeWidth="4" />
          <line x1="350" y1="50" x2="350" y2="120" stroke="#ef4444" strokeWidth="4" />

          {/* Resistor 1 */}
          <rect x="330" y="120" width="40" height="60" fill="#64748b" stroke="#94a3b8" strokeWidth="2" rx="3" />
          <text x="350" y="155" textAnchor="middle" fill="white" fontSize="11">R1</text>

          {/* Middle wire */}
          <line x1="350" y1="180" x2="350" y2="200" stroke="#f59e0b" strokeWidth="4" />
          <line x1="350" y1="200" x2="200" y2="200" stroke="#f59e0b" strokeWidth="4" />

          {/* Resistor 2 */}
          <rect x="180" y="170" width="40" height="60" fill="#64748b" stroke="#94a3b8" strokeWidth="2" rx="3" />
          <text x="200" y="205" textAnchor="middle" fill="white" fontSize="11">R2</text>

          {/* Bottom wire - low potential */}
          <line x1="200" y1="230" x2="200" y2="250" stroke="#3b82f6" strokeWidth="4" />
          <line x1="200" y1="250" x2="47" y2="250" stroke="#3b82f6" strokeWidth="4" />
          <line x1="67" y1="200" x2="67" y2="250" stroke="#3b82f6" strokeWidth="4" />

          {/* Voltage labels */}
          <circle cx="200" cy="50" r="15" fill="#ef4444" opacity="0.3" />
          <text x="200" y="55" textAnchor="middle" fill="#ef4444" fontSize="11">9V</text>

          <circle cx="350" cy="200" r="15" fill="#f59e0b" opacity="0.3" />
          <text x="350" y="205" textAnchor="middle" fill="#f59e0b" fontSize="11">4.5V</text>

          <circle cx="200" cy="250" r="15" fill="#3b82f6" opacity="0.3" />
          <text x="200" y="255" textAnchor="middle" fill="#3b82f6" fontSize="11">0V</text>

          {/* Voltage drop annotations */}
          <text x="380" y="150" fill="#22c55e" fontSize="11">Delta V = 4.5V</text>
          <text x="140" y="200" fill="#22c55e" fontSize="11">Delta V = 4.5V</text>
        </svg>
      </div>
      </div>

      <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
      <div className="space-y-4 mb-6">
        <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-xl p-4">
          <h3 className="text-lg font-bold text-amber-400 mb-2">Voltage = Potential Difference</h3>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>Voltage is always measured BETWEEN two points</li>
            <li>Delta V = V_A - V_B (difference in electric potential)</li>
            <li>A battery creates and maintains a potential difference</li>
            <li>Current flows from high to low potential</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-xl p-4">
          <h3 className="text-lg font-bold text-purple-400 mb-2">Kirchhoff's Voltage Law</h3>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>Sum of voltages around any closed loop = 0</li>
            <li>Energy gained from battery = Energy lost in resistors</li>
            <li>9V = 4.5V + 4.5V (in the example above)</li>
            <li>This is conservation of energy!</li>
          </ul>
        </div>

      <div className="bg-slate-800/70 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-cyan-400 mb-2">The Key Insight</h3>
        <p className="text-slate-300 text-sm">
          Electric potential at a single point has no physical meaning by itself - only the DIFFERENCE in potential (voltage) between two points matters. That's why we always need a reference point (like ground = 0V). A 9V battery doesn't have "9 volts" - it maintains a 9V DIFFERENCE between its terminals.
        </p>
      </div>
      </div>
      </div>
      </div>

      <button
        onClick={() => goToPhase('twist_review')}
        style={{ zIndex: 10, minHeight: '44px' }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Review This Discovery
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-6`}>
        Key Discovery: Voltage as Potential Difference
      </h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4">Three Key Facts About Voltage</h3>
        <div className="space-y-4 text-slate-300">
          <div className="flex items-start gap-3">
            <div className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold shrink-0">1</div>
            <p><strong>Voltage = Potential Difference</strong>: Always measured between two points, never at a single point.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold shrink-0">2</div>
            <p><strong>Energy per Charge</strong>: 1 Volt = 1 Joule per Coulomb. Voltage tells us how much energy each coulomb of charge gains or loses.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold shrink-0">3</div>
            <p><strong>Drives Current</strong>: Voltage is the "electrical pressure" that pushes current through circuits. No voltage difference = no current flow.</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-amber-400 mb-3">Real-World Voltage Examples</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-2xl mb-1">🔌</div>
            <div className="text-amber-400 font-bold">120-240V AC</div>
            <div className="text-slate-400">Home outlets</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-2xl mb-1">⚡</div>
            <div className="text-amber-400 font-bold">300,000,000 V</div>
            <div className="text-slate-400">Lightning strike</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-2xl mb-1">💊</div>
            <div className="text-amber-400 font-bold">70 mV</div>
            <div className="text-slate-400">Neuron membrane</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-2xl mb-1">🚗</div>
            <div className="text-amber-400 font-bold">400-800V</div>
            <div className="text-slate-400">EV battery packs</div>
          </div>
        </div>
      </div>

      <button
        onClick={() => goToPhase('transfer')}
        style={{ zIndex: 10, minHeight: '44px' }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all duration-300"
      >
        Explore Real-World Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700, lineHeight: 1.3, color: '#ffffff', marginBottom: '24px' }}>
        Real-World Applications
      </h2>

      {/* App selector tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {transferApps.map((app, index) => (
          <button
            key={index}
            onClick={() => setActiveAppIndex(index)}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              fontWeight: 600,
              transition: 'all 0.3s ease',
              border: completedApps.has(index) ? '1px solid #22c55e' : 'none',
              background: activeAppIndex === index ? 'linear-gradient(135deg, #f59e0b, #ea580c)' : completedApps.has(index) ? 'rgba(34, 197, 94, 0.2)' : '#334155',
              color: activeAppIndex === index ? '#fff' : completedApps.has(index) ? '#22c55e' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {app.icon} {app.short}
          </button>
        ))}
      </div>

      {/* Scroll container with all app cards */}
      <div style={{ overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', flex: 1, width: '100%', maxWidth: '700px' }}>
        {transferApps.map((app, appIdx) => (
          <div key={appIdx} style={{
            display: activeAppIndex === appIdx ? 'block' : 'none',
            background: 'rgba(30, 41, 59, 0.5)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(71, 85, 105, 0.5)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '32px' }}>{app.icon}</span>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', lineHeight: 1.3 }}>{app.title}</h3>
                <p style={{ fontSize: '14px', color: '#f59e0b', fontWeight: 500 }}>{app.tagline}</p>
              </div>
            </div>

            <p style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.6, color: '#cbd5e1', marginBottom: '16px' }}>{app.description}</p>

            <div style={{ background: 'rgba(30, 58, 138, 0.3)', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#60a5fa', marginBottom: '8px' }}>Physics Connection</h4>
              <p style={{ fontSize: '13px', fontWeight: 400, lineHeight: 1.5, color: '#cbd5e1' }}>{app.connection}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#06b6d4', marginBottom: '8px' }}>How It Works</h4>
                <ul style={{ fontSize: '13px', color: '#cbd5e1', margin: 0, paddingLeft: '16px' }}>
                  {app.howItWorks.map((step, i) => (
                    <li key={i} style={{ marginBottom: '4px', lineHeight: 1.5 }}>{step}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#22c55e', marginBottom: '8px' }}>Key Numbers</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {app.stats.map((stat, i) => (
                    <div key={i} style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#f59e0b' }}>{stat.value}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              {app.companies.map((company, i) => (
                <span key={i} style={{ padding: '4px 8px', background: 'rgba(51, 65, 85, 0.5)', borderRadius: '6px', fontSize: '12px', color: '#cbd5e1' }}>
                  {company}
                </span>
              ))}
            </div>

            {!completedApps.has(appIdx) && (
              <button
                onClick={() => handleAppComplete(appIdx)}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #22c55e, #0d9488)',
                  transition: 'all 0.3s ease',
                  fontSize: '14px',
                }}
              >
                Got It! Mark as Understood
              </button>
            )}
            {completedApps.has(appIdx) && (
              <div style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: 600, textAlign: 'center', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', border: '1px solid #22c55e' }}>
                Completed
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Progress indicator */}
      <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ color: '#94a3b8', fontSize: '14px' }}>Progress:</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {transferApps.map((_, i) => (
            <div key={i} style={{ width: '12px', height: '12px', borderRadius: '50%', background: completedApps.has(i) ? '#22c55e' : '#334155' }} />
          ))}
        </div>
        <span style={{ color: '#94a3b8', fontSize: '14px' }}>{completedApps.size}/{transferApps.length}</span>
      </div>

      {/* Continue button to test phase */}
      <button
        onClick={() => goToPhase('test')}
        style={{
          marginTop: '24px',
          padding: '16px 32px',
          borderRadius: '12px',
          border: 'none',
          background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '16px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 20px rgba(245, 158, 11, 0.3)',
        }}
      >
        Continue to Knowledge Test
      </button>
    </div>
  );

  const renderTest = () => {
    const optionLabels = ['A', 'B', 'C', 'D'];

    if (showTestResults) {
      const passed = testScore >= 7;
      return (
        <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>{passed ? '🎉' : '📚'}</div>
            <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
              {passed ? 'Test Complete!' : 'Keep Learning!'}
            </h2>
            <p style={{ fontSize: '36px', fontWeight: 800, color: passed ? '#10b981' : '#f59e0b', margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ fontSize: '16px', color: '#94a3b8', marginBottom: '24px' }}>
              {passed ? 'You scored ' + testScore + '/10 - Excellent! You\'ve mastered electric potential!' : 'You scored ' + testScore + '/10 - Review the concepts and try again.'}
            </p>
          </div>

          {/* Answer review with scrollable container */}
          <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '24px' }}>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== -1 && q.options[userAnswer]?.correct;
              return (
                <div
                  key={qIndex}
                  style={{
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '12px',
                    background: isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${isCorrect ? '#10b981' : '#ef4444'}`,
                  }}
                >
                  <p style={{ color: '#ffffff', fontWeight: 600, marginBottom: '8px' }}>
                    Question {qIndex + 1}: {q.question}
                  </p>
                  <p style={{ fontSize: '14px', color: isCorrect ? '#10b981' : '#ef4444', marginBottom: '4px' }}>
                    {isCorrect ? '✓' : '✗'} Your answer: {userAnswer !== -1 ? q.options[userAnswer]?.text : 'Not answered'}
                    {isCorrect ? ' (Correct)' : ' (Incorrect)'}
                  </p>
                  {!isCorrect && (
                    <p style={{ fontSize: '14px', color: '#10b981', marginBottom: '4px' }}>
                      Correct answer: {q.options.find(o => o.correct)?.text}
                    </p>
                  )}
                  <p style={{ fontSize: '13px', color: '#94a3b8' }}>{q.explanation}</p>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => {
              if (passed) {
                goToPhase('mastery');
              } else {
                setShowTestResults(false);
                setTestAnswers(Array(10).fill(-1));
                setTestIndex(0);
                setShowTestExplanation(false);
                goToPhase('review');
              }
            }}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: passed ? 'linear-gradient(135deg, #10b981, #0d9488)' : 'linear-gradient(135deg, #f59e0b, #ea580c)',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {passed ? 'Claim Your Mastery Badge' : 'Review and Try Again'}
          </button>
        </div>
      );
    }

    const q = testQuestions[testIndex];
    const selected = testAnswers[testIndex];
    const isCorrect = selected !== -1 && q.options[selected]?.correct;

    return (
      <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
        {/* Knowledge assessment header */}
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', marginBottom: '8px', textAlign: 'center' }}>
          Electric Potential Knowledge Assessment
        </h2>
        <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '20px', textAlign: 'center', lineHeight: 1.5 }}>
          Test your understanding of electric potential, voltage, equipotential surfaces, and energy stored in electric fields. Apply the formulas V = kq/r and U = qV to solve real physics scenarios.
        </p>

        {/* Question counter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(148, 163, 184, 0.8)' }}>Question</span>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b' }}>{testIndex + 1}</span>
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#e2e8f0' }}>of 10</span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {testQuestions.map((_, i) => (
              <div key={i} style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: i === testIndex ? '#f59e0b' : testAnswers[i] !== -1 ? '#10b981' : '#334155',
              }} />
            ))}
          </div>
        </div>

        {/* Scenario */}
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px', marginBottom: '16px', borderLeft: '3px solid #f59e0b' }}>
          <p style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.5, color: '#e2e8f0', margin: 0, fontStyle: 'italic' }}>{q.scenario}</p>
        </div>

        <h3 style={{ fontSize: '20px', fontWeight: 700, lineHeight: 1.3, color: '#ffffff', marginBottom: '20px' }}>{q.question}</h3>

        {/* Answer options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {q.options.map((opt, i) => {
            let borderColor = '#334155';
            let bgColor = 'rgba(30, 41, 59, 0.5)';
            if (showTestExplanation) {
              if (opt.correct) { borderColor = '#10b981'; bgColor = 'rgba(16, 185, 129, 0.15)'; }
              else if (selected === i && !opt.correct) { borderColor = '#ef4444'; bgColor = 'rgba(239, 68, 68, 0.15)'; }
            } else if (selected === i) {
              borderColor = '#f59e0b'; bgColor = 'rgba(245, 158, 11, 0.15)';
            }
            return (
              <button
                key={i}
                onClick={() => {
                  if (!showTestExplanation) {
                    handleTestAnswer(testIndex, i);
                  }
                }}
                disabled={showTestExplanation}
                style={{
                  background: bgColor,
                  border: `2px solid ${borderColor}`,
                  borderRadius: '10px',
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: showTestExplanation ? 'default' : 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 400, lineHeight: 1.5 }}>
                  {optionLabels[i]}) {opt.text}
                </span>
              </button>
            );
          })}
        </div>

        {/* Explanation after checking */}
        {showTestExplanation && (
          <div style={{
            background: isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${isCorrect ? '#10b981' : '#ef4444'}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: isCorrect ? '#10b981' : '#ef4444', marginBottom: '8px' }}>
              {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </p>
            <p style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.5, color: '#94a3b8', margin: 0 }}>{q.explanation}</p>
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {!showTestExplanation && selected !== -1 && (
            <button
              onClick={() => {
                playSound(isCorrect ? 'success' : 'incorrect');
                setShowTestExplanation(true);
              }}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                background: '#f59e0b',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
            >
              Check Answer
            </button>
          )}

          {showTestExplanation && testIndex < 9 && (
            <button
              onClick={() => {
                setTestIndex(testIndex + 1);
                setShowTestExplanation(false);
              }}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                background: '#f59e0b',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
            >
              Next Question
            </button>
          )}

          {showTestExplanation && testIndex === 9 && (
            <button
              onClick={() => {
                const score = testAnswers.reduce((acc, ans, i) => {
                  if (ans === -1) return acc;
                  return acc + (testQuestions[i].options[ans]?.correct ? 1 : 0);
                }, 0);
                setTestScore(score);
                setShowTestResults(true);
                playSound(score >= 7 ? 'complete' : 'incorrect');
              }}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981, #0d9488)',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
            >
              See Results
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-amber-900/50 via-orange-900/50 to-yellow-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">⚡</div>
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-white mb-4`}>
          Electric Potential Master!
        </h1>
        <p className="text-xl text-slate-300 mb-6">
          Congratulations! You've mastered the physics of electric potential and voltage!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🔋</div>
            <p className="text-sm text-slate-300">V = kq/r</p>
            <p className="text-xs text-slate-500">Point charge potential</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">⚡</div>
            <p className="text-sm text-slate-300">E = -dV/dr</p>
            <p className="text-xs text-slate-500">Field-potential relation</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">💡</div>
            <p className="text-sm text-slate-300">W = q Delta V</p>
            <p className="text-xs text-slate-500">Work and energy</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🔌</div>
            <p className="text-sm text-slate-300">Voltage = Delta V</p>
            <p className="text-xs text-slate-500">Potential difference</p>
          </div>
        </div>

        <div className="bg-slate-800/70 rounded-xl p-4 mb-6">
          <h3 className="text-lg font-bold text-amber-400 mb-2">You've Learned:</h3>
          <ul className="text-sm text-slate-300 space-y-1 text-left">
            <li>How electric potential describes energy per unit charge</li>
            <li>The relationship between potential and electric field</li>
            <li>How voltage drives current in circuits</li>
            <li>Real-world applications from batteries to defibrillators</li>
          </ul>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => goToPhase('hook')}
            style={{ zIndex: 10, minHeight: '44px' }}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
          >
            Explore Again
          </button>
        </div>
      </div>
    </div>
  );

  // ==================== PHASE ROUTER ====================
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
          conceptName="Electric Potential"
          applications={realWorldApps}
          onComplete={() => goToPhase('test')}
          isMobile={isMobile}
          colors={colors}
          typo={typo}
          playSound={playSound}
          />
        );
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  const currentPhaseIndex = phaseOrder.indexOf(phase);
  const isFirstPhase = currentPhaseIndex === 0;
  const isLastPhase = currentPhaseIndex === phaseOrder.length - 1;
  const canAdvance = !isLastPhase && phase !== 'test';

  const renderBottomNav = () => (
    <nav style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 20px',
      borderTop: '1px solid rgba(71, 85, 105, 0.5)',
      background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(12px)',
      zIndex: 1000,
    }}>
      <button
        onClick={() => !isFirstPhase && goToPhase(phaseOrder[currentPhaseIndex - 1])}
        style={{
          minHeight: '48px',
          padding: '12px 20px',
          borderRadius: '10px',
          border: '1px solid rgba(71, 85, 105, 0.5)',
          background: 'transparent',
          color: isFirstPhase ? 'rgba(148, 163, 184, 0.4)' : '#e2e8f0',
          cursor: isFirstPhase ? 'not-allowed' : 'pointer',
          opacity: isFirstPhase ? 0.4 : 1,
          transition: 'all 0.3s ease',
          fontWeight: 600,
          fontFamily: theme.fontFamily,
          fontSize: '14px',
        }}
      >
        Back
      </button>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {phaseOrder.map((p, i) => (
          <button
            key={p}
            onClick={() => goToPhase(p)}
            aria-label={phaseLabels[p]}
            title={phaseLabels[p]}
            style={{
              minHeight: '44px',
              minWidth: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: '0',
            }}
          >
            <span style={{
              width: p === phase ? '20px' : '10px',
              height: '10px',
              borderRadius: '5px',
              background: p === phase ? '#f59e0b' : i < currentPhaseIndex ? '#22c55e' : '#334155',
              transition: 'all 0.3s ease',
              display: 'block',
            }} />
          </button>
        ))}
      </div>
      <button
        onClick={() => canAdvance && goToPhase(phaseOrder[currentPhaseIndex + 1])}
        style={{
          minHeight: '48px',
          padding: '12px 20px',
          borderRadius: '10px',
          border: 'none',
          background: canAdvance ? 'linear-gradient(135deg, #f59e0b, #ea580c)' : '#334155',
          color: '#ffffff',
          cursor: canAdvance ? 'pointer' : 'not-allowed',
          opacity: canAdvance ? 1 : 0.4,
          transition: 'all 0.3s ease',
          fontWeight: 600,
          fontFamily: theme.fontFamily,
          fontSize: '14px',
        }}
        disabled={!canAdvance}
      >
        Next
      </button>
    </nav>
  );

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(180deg, #0a0f1a 0%, #0f172a 50%, #0a0f1a 100%)',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: theme.fontFamily,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Progress bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', maxWidth: '900px', margin: '0 auto' }}>
          <span style={{ fontSize: isMobile ? '12px' : '14px', fontWeight: 600, color: '#e2e8f0' }}>Electric Potential</span>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {phaseOrder.map((p, i) => (
              <div
                key={p}
                onClick={() => goToPhase(p)}
                style={{
                  width: phase === p ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: phase === p ? '#f59e0b' : currentPhaseIndex > i ? '#f59e0b' : '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: isMobile ? '12px' : '14px', color: '#e2e8f0' }}>{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content - scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', position: 'relative', zIndex: 10 }}>
        {renderPhase()}
      </div>

      {renderBottomNav()}
    </div>
  );
};

export default ElectricPotentialRenderer;
