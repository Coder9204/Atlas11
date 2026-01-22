import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// ELECTRIC POTENTIAL (VOLTAGE) - GOLD STANDARD RENDERER
// ============================================================================
// Physics: V = W/q (work per unit charge), V = kq/r (point charge potential)
// Key concept: Electric potential is the potential energy per unit charge
// Relationship: E = -dV/dr (field is negative gradient of potential)
// Units: Volts (V) = Joules per Coulomb (J/C)
// ============================================================================

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
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

const ElectricPotentialRenderer: React.FC<Props> = ({
  onGameEvent,
  currentPhase = 0,
  onPhaseComplete
}) => {
  // ==================== STATE ====================
  const [phase, setPhase] = useState(currentPhase);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppIndex, setActiveAppIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [sourceCharges, setSourceCharges] = useState<SourceCharge[]>([
    { id: 1, x: 200, y: 200, q: 5 }
  ]);
  const [testChargePos, setTestChargePos] = useState({ x: 300, y: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [showEquipotentials, setShowEquipotentials] = useState(true);
  const [showFieldLines, setShowFieldLines] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<'single' | 'dipole' | 'parallel'>('single');
  const [plateVoltage, setPlateVoltage] = useState(100); // V for parallel plates
  const [animating, setAnimating] = useState(false);

  // Constants
  const k = 8.99e9; // Coulomb's constant N⋅m²/C²

  // Refs
  const navigationLockRef = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // ==================== EFFECTS ====================
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    playSound('click');

    setPhase(newPhase);
    if (onPhaseComplete && newPhase > phase) {
      onPhaseComplete(phase);
    }

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 400);
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

  const calculateWork = useCallback((x1: number, y1: number, x2: number, y2: number, q: number): number => {
    // W = q × ΔV = q × (V_initial - V_final)
    const V1 = calculatePotential(x1, y1);
    const V2 = calculatePotential(x2, y2);
    const q_C = q * 1e-6;
    return q_C * (V1 - V2);
  }, [calculatePotential]);

  // Current potential and field at test charge
  const currentPotential = calculatePotential(testChargePos.x, testChargePos.y);
  const currentField = calculateField(testChargePos.x, testChargePos.y);

  // ==================== EVENT HANDLERS ====================
  const handlePrediction = useCallback((prediction: string) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'B' ? 'correct' : 'incorrect');

    if (onGameEvent) {
      onGameEvent({
        type: 'prediction_made',
        data: { prediction, correct: prediction === 'B' }
      });
    }

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [onGameEvent, playSound]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'C' ? 'correct' : 'incorrect');

    if (onGameEvent) {
      onGameEvent({
        type: 'prediction_made',
        data: { prediction, correct: prediction === 'C', twist: true }
      });
    }

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [onGameEvent, playSound]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

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

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [onGameEvent, playSound]);

  const handleAppComplete = useCallback((appIndex: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');

    if (onGameEvent) {
      onGameEvent({
        type: 'app_explored',
        data: { appIndex, appTitle: transferApps[appIndex].title }
      });
    }

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [onGameEvent, playSound]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
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
        { text: "250 J", correct: false },
        { text: "1000 μJ (1 mJ)", correct: true },
        { text: "500 J", correct: false },
        { text: "2500 J", correct: false }
      ],
      explanation: "U = qV = (2×10⁻⁶ C)(500 V) = 1×10⁻³ J = 1 mJ. Potential energy equals charge times potential."
    },
    {
      scenario: "An electron is released from rest at a point where V = -100V and moves to a point where V = 0V.",
      question: "How much kinetic energy does the electron gain?",
      options: [
        { text: "100 eV", correct: true },
        { text: "-100 eV", correct: false },
        { text: "0 eV (no change)", correct: false },
        { text: "1.6×10⁻¹⁷ J", correct: false }
      ],
      explanation: "ΔKE = -qΔV = -(-e)(0-(-100)) = +100 eV. The electron gains 100 eV of kinetic energy as it moves to higher potential."
    },
    {
      scenario: "A +5μC charge creates an electric potential field. You measure V = 900 kV at a distance r from the charge.",
      question: "What is the distance r from the charge?",
      options: [
        { text: "1 cm", correct: false },
        { text: "5 cm", correct: true },
        { text: "10 cm", correct: false },
        { text: "50 cm", correct: false }
      ],
      explanation: "V = kq/r, so r = kq/V = (8.99×10⁹)(5×10⁻⁶)/(9×10⁵) = 0.05 m = 5 cm."
    },
    {
      scenario: "A capacitor has two parallel plates separated by 2mm with a voltage difference of 200V between them.",
      question: "What is the magnitude of the electric field between the plates?",
      options: [
        { text: "100 V/m", correct: false },
        { text: "400 V/m", correct: false },
        { text: "100,000 V/m", correct: true },
        { text: "200 V/m", correct: false }
      ],
      explanation: "E = V/d = 200 V / 0.002 m = 100,000 V/m. The field is uniform between parallel plates."
    },
    {
      scenario: "A proton and an electron start from rest between two charged plates. The potential difference is 1000V.",
      question: "Which particle gains more kinetic energy?",
      options: [
        { text: "The proton (it's heavier)", correct: false },
        { text: "The electron (it's lighter)", correct: false },
        { text: "Both gain the same energy", correct: true },
        { text: "Neither gains energy", correct: false }
      ],
      explanation: "Both gain KE = |q|ΔV = (1.6×10⁻¹⁹)(1000) = 1000 eV. Energy depends on charge and potential difference, not mass."
    },
    {
      scenario: "A test charge is moved along an equipotential surface from point A to point B.",
      question: "How much work is done by the electric field during this movement?",
      options: [
        { text: "Maximum work (moving with field)", correct: false },
        { text: "Depends on the path taken", correct: false },
        { text: "Zero (same potential)", correct: true },
        { text: "Negative work (against field)", correct: false }
      ],
      explanation: "W = qΔV. Along an equipotential, ΔV = 0, so W = 0. No work is done moving along equipotential surfaces."
    },
    {
      scenario: "Two point charges (+4μC and -4μC) form a dipole, separated by 10cm.",
      question: "What is the potential at the exact midpoint between them?",
      options: [
        { text: "Very high positive", correct: false },
        { text: "Very high negative", correct: false },
        { text: "Zero", correct: true },
        { text: "Undefined (divide by zero)", correct: false }
      ],
      explanation: "At the midpoint, the distance to each charge is equal. V = k(+q)/r + k(-q)/r = 0. The potentials cancel exactly."
    },
    {
      scenario: "A Van de Graaff generator charges a metal sphere to 500,000V. A person touches the sphere.",
      question: "Why might the spark be harmless despite the high voltage?",
      options: [
        { text: "High voltage always means high current", correct: false },
        { text: "The human body is a perfect insulator", correct: false },
        { text: "Limited charge means limited energy transfer", correct: true },
        { text: "Voltage doesn't affect the human body", correct: false }
      ],
      explanation: "Energy = qV. While V is high, the stored charge q is very small (limited capacitance), so total energy is small. It's the energy, not voltage alone, that determines harm."
    },
    {
      scenario: "A battery maintains a constant 12V between its terminals. When current flows, charges move from the negative to positive terminal through the battery.",
      question: "What does the battery do to these charges?",
      options: [
        { text: "Nothing - charges flow naturally", correct: false },
        { text: "Provides energy to increase their potential", correct: true },
        { text: "Removes energy from them", correct: false },
        { text: "Changes their mass", correct: false }
      ],
      explanation: "The battery does work on charges to raise their potential energy by 12 eV per electron (or 12 J per Coulomb). This is the EMF of the battery."
    },
    {
      scenario: "Lightning occurs when the potential difference between a cloud and the ground exceeds about 100 million volts across a 1km gap.",
      question: "What is the approximate electric field strength that causes air to break down and conduct?",
      options: [
        { text: "1,000 V/m", correct: false },
        { text: "10,000 V/m", correct: false },
        { text: "100,000 V/m (100 kV/m)", correct: true },
        { text: "1,000,000,000 V/m", correct: false }
      ],
      explanation: "E = V/d = 10⁸ V / 10³ m = 10⁵ V/m = 100 kV/m. Air breaks down at approximately 3 MV/m at sea level, but lightning occurs through stepped leaders at lower average fields."
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
      title: "Capacitors & Energy Storage",
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
        "Defibrillator charge storage"
      ],
      companies: ["Maxwell", "Murata", "Vishay", "TDK"],
      futureImpact: "Hybrid capacitor-battery systems enable regenerative braking in vehicles and grid-scale frequency regulation for renewable energy.",
      color: "from-yellow-600 to-amber-600"
    },
    {
      icon: "🖥️",
      title: "Electron Beam Technology",
      short: "E-Beams",
      tagline: "Accelerating electrons with potential",
      description: "Electron beam systems use high voltage differences to accelerate electrons to precise energies for displays, welding, lithography, and scientific instruments.",
      connection: "Electrons accelerated through potential difference V gain kinetic energy KE = eV. A 30kV potential gives electrons energies useful for welding; 100kV enables transmission electron microscopy.",
      howItWorks: [
        "Electrons are emitted from a heated cathode",
        "High voltage accelerates electrons: KE = eV",
        "Magnetic or electric fields focus and steer the beam",
        "Controlled energy deposition at the target"
      ],
      stats: [
        { value: "30-150kV", label: "E-beam Welding" },
        { value: "200-300kV", label: "TEM Microscope" },
        { value: "10-50kV", label: "Lithography" },
        { value: "0.999c", label: "Near Light Speed" }
      ],
      examples: [
        "Electron microscopes (SEM, TEM)",
        "Semiconductor lithography",
        "Electron beam welding",
        "CRT displays (historical)"
      ],
      companies: ["JEOL", "FEI/Thermo Fisher", "Hitachi", "Carl Zeiss"],
      futureImpact: "Advanced e-beam lithography enables sub-10nm chip manufacturing, while electron microscopy approaches atomic resolution for materials science.",
      color: "from-blue-600 to-cyan-600"
    },
    {
      icon: "💡",
      title: "Photomultiplier Tubes",
      short: "PMTs",
      tagline: "Amplifying single photons",
      description: "Photomultiplier tubes use cascading potential differences to amplify single-photon detection events into measurable electrical signals, enabling sensitive light detection.",
      connection: "Each dynode stage is held at progressively higher potential, accelerating electrons between stages. The potential difference determines energy gain and secondary emission yield.",
      howItWorks: [
        "Photon strikes photocathode, releasing one electron",
        "Electron accelerated by potential difference to first dynode",
        "Impact releases multiple secondary electrons",
        "Cascade through 10-14 dynode stages amplifies signal 10⁶-10⁸×"
      ],
      stats: [
        { value: "10⁸", label: "Gain Factor" },
        { value: "1-2kV", label: "Operating V" },
        { value: "ns", label: "Response Time" },
        { value: "1 photon", label: "Detection" }
      ],
      examples: [
        "Medical PET/CT scanners",
        "Neutrino detectors (Super-K)",
        "Astronomy telescopes",
        "Radiation detection"
      ],
      companies: ["Hamamatsu", "Photonis", "ET Enterprises", "Burle"],
      futureImpact: "Silicon photomultipliers (SiPMs) are replacing traditional PMTs with solid-state alternatives, enabling compact medical imaging and quantum optics experiments.",
      color: "from-purple-600 to-violet-600"
    }
  ];

  // ==================== SCORE CALCULATION ====================
  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  };

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
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      {/* Premium Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <span className="text-amber-400 text-sm font-medium">Electromagnetic Physics</span>
      </div>

      {/* Gradient Title */}
      <h1 className={`${isMobile ? 'text-3xl' : 'text-4xl'} font-bold bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent mb-3`}>
        Electric Potential
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg mb-8 max-w-md">
        Discover the energy landscape that drives electric current
      </p>

      {/* Premium Card */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 max-w-2xl shadow-2xl">
        <svg viewBox="0 0 400 300" className="w-full max-w-md mx-auto mb-6">
          {/* Background gradient showing potential */}
          <defs>
            <radialGradient id="potentialGrad" cx="30%" cy="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.2" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="400" height="300" fill="url(#potentialGrad)" rx="15" />

          {/* Positive charge */}
          <circle cx="100" cy="150" r="25" fill="#ef4444" stroke="#fff" strokeWidth="3" />
          <text x="100" y="158" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">+</text>

          {/* Equipotential lines (circles) */}
          <circle cx="100" cy="150" r="60" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="5,5" opacity="0.6" />
          <circle cx="100" cy="150" r="100" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="5,5" opacity="0.4" />
          <circle cx="100" cy="150" r="140" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="5,5" opacity="0.2" />

          {/* Test charge showing potential energy */}
          <circle cx="260" cy="150" r="15" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
          <text x="260" y="156" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">q</text>

          {/* Work arrow */}
          <path d="M240,150 L140,150" fill="none" stroke="#22c55e" strokeWidth="3" markerEnd="url(#arrowHead)" />
          <text x="190" y="135" textAnchor="middle" fill="#22c55e" fontSize="14" fontWeight="bold">Work = qΔV</text>

          {/* Labels */}
          <text x="100" y="200" textAnchor="middle" fill="#f59e0b" fontSize="12">High V</text>
          <text x="320" y="200" textAnchor="middle" fill="#22c55e" fontSize="12">Low V</text>

          <defs>
            <marker id="arrowHead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#22c55e" />
            </marker>
          </defs>
        </svg>

        <p className="text-xl text-slate-300 mb-4">
          Why does a ball roll downhill? Gravity creates a potential energy landscape!
        </p>
        <p className="text-lg text-amber-400 font-medium">
          Electric charges do the same thing - they "roll" from high to low electric potential!
        </p>
        <p className="text-slate-400 mt-4">
          Just like height determines gravitational potential, <span className="text-amber-400">voltage</span> determines electric potential energy per charge.
        </p>
      </div>

      {/* Premium CTA Button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="group mt-8 px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-lg font-semibold rounded-2xl hover:from-amber-500 hover:to-orange-500 transition-all duration-300 shadow-lg hover:shadow-amber-500/25 hover:scale-[1.02] flex items-center gap-2"
      >
        Explore Electric Potential
        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>

      {/* Subtle Hint */}
      <p className="mt-4 text-slate-500 text-sm">
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
        <svg viewBox="0 0 300 150" className="w-full max-w-sm mx-auto">
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
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
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
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            ✓ Correct! The charge gains kinetic energy as it "falls" to lower potential!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            ΔKE = q × ΔV = q × (V_A - V_B) = q × 1000V. The potential energy converts to kinetic energy.
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all duration-300"
          >
            Explore the Simulation →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-4">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-4`}>
        Electric Potential Lab
      </h2>

      {/* Configuration selector */}
      <div className="flex gap-2 mb-4 flex-wrap justify-center">
        {[
          { id: 'single', label: 'Single Charge' },
          { id: 'dipole', label: 'Dipole' },
          { id: 'parallel', label: 'Parallel Plates' }
        ].map(config => (
          <button
            key={config.id}
            onMouseDown={(e) => {
              e.preventDefault();
              setSelectedConfig(config.id as 'single' | 'dipole' | 'parallel');
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedConfig === config.id
                ? 'bg-amber-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {config.label}
          </button>
        ))}
      </div>

      {/* Main simulation */}
      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
        <svg
          ref={svgRef}
          viewBox="0 0 400 400"
          className={`${isMobile ? 'w-[320px] h-[320px]' : 'w-[400px] h-[400px]'} cursor-crosshair`}
          onMouseMove={handleMouseMove}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => setIsDragging(false)}
        >
          {/* Background with potential coloring */}
          <rect x="0" y="0" width="400" height="400" fill="#1e293b" rx="15" />

          {/* Potential heat map */}
          {Array.from({ length: 20 }).map((_, i) =>
            Array.from({ length: 20 }).map((_, j) => {
              const x = 10 + i * 20;
              const y = 10 + j * 20;
              const V = calculatePotential(x, y);
              return (
                <rect
                  key={`${i}-${j}`}
                  x={x - 10}
                  y={y - 10}
                  width="20"
                  height="20"
                  fill={getPotentialColor(V)}
                  opacity="0.3"
                />
              );
            })
          )}

          {/* Parallel plates */}
          {selectedConfig === 'parallel' && (
            <>
              <rect x="95" y="50" width="10" height="300" fill="#ef4444" rx="2" />
              <rect x="295" y="50" width="10" height="300" fill="#3b82f6" rx="2" />
              <text x="100" y="40" textAnchor="middle" fill="#ef4444" fontSize="12">+{plateVoltage}V</text>
              <text x="300" y="40" textAnchor="middle" fill="#3b82f6" fontSize="12">0V</text>
            </>
          )}

          {/* Equipotential lines */}
          {showEquipotentials && generateEquipotentials().map((line, i) => (
            <g key={i}>
              {line.points.length >= 2 && (
                <path
                  d={selectedConfig === 'parallel'
                    ? `M${line.points[0].x},${line.points[0].y} L${line.points[1].x},${line.points[1].y}`
                    : `M${line.points.map(p => `${p.x},${p.y}`).join(' L')}`
                  }
                  fill="none"
                  stroke={line.V > 0 ? '#ef4444' : line.V < 0 ? '#3b82f6' : '#fff'}
                  strokeWidth="1"
                  strokeDasharray="4,4"
                  opacity="0.6"
                />
              )}
            </g>
          ))}

          {/* Source charges */}
          {sourceCharges.map(charge => (
            <g key={charge.id}>
              <circle
                cx={charge.x}
                cy={charge.y}
                r="20"
                fill={charge.q > 0 ? '#ef4444' : '#3b82f6'}
                stroke="#fff"
                strokeWidth="2"
              />
              <text
                x={charge.x}
                y={charge.y + 6}
                textAnchor="middle"
                fill="white"
                fontSize="18"
                fontWeight="bold"
              >
                {charge.q > 0 ? '+' : '−'}
              </text>
            </g>
          ))}

          {/* Test charge - draggable */}
          <g
            style={{ cursor: 'grab' }}
            onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
            onTouchStart={(e) => { e.preventDefault(); setIsDragging(true); }}
          >
            <circle
              cx={testChargePos.x}
              cy={testChargePos.y}
              r="15"
              fill="#22c55e"
              stroke="#fff"
              strokeWidth="2"
              opacity="0.9"
            />
            <text
              x={testChargePos.x}
              y={testChargePos.y + 5}
              textAnchor="middle"
              fill="white"
              fontSize="12"
              fontWeight="bold"
            >
              +q
            </text>
          </g>

          {/* Potential readout at test charge */}
          <rect
            x={testChargePos.x + 20}
            y={testChargePos.y - 30}
            width="90"
            height="25"
            fill="#1e293b"
            stroke="#64748b"
            rx="5"
            opacity="0.9"
          />
          <text
            x={testChargePos.x + 65}
            y={testChargePos.y - 12}
            textAnchor="middle"
            fill="#f59e0b"
            fontSize="11"
            fontWeight="bold"
          >
            V = {formatVoltage(currentPotential)}
          </text>
        </svg>

        {/* Controls */}
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          <button
            onMouseDown={(e) => { e.preventDefault(); setShowEquipotentials(!showEquipotentials); }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              showEquipotentials ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300'
            }`}
          >
            Equipotentials {showEquipotentials ? 'ON' : 'OFF'}
          </button>
          {selectedConfig === 'parallel' && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">Voltage:</span>
              <input
                type="range"
                min="10"
                max="500"
                value={plateVoltage}
                onChange={(e) => setPlateVoltage(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-amber-400 text-sm font-medium">{plateVoltage}V</span>
            </div>
          )}
        </div>
      </div>

      {/* Data display */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mb-4">
        <div className="bg-slate-800/70 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-amber-400">{formatVoltage(currentPotential)}</div>
          <div className="text-xs text-slate-400">Potential at test charge</div>
        </div>
        <div className="bg-slate-800/70 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-cyan-400">{(currentField.E / 1000).toFixed(0)} kV/m</div>
          <div className="text-xs text-slate-400">Field strength</div>
        </div>
        <div className="bg-slate-800/70 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-emerald-400">{testChargePos.x.toFixed(0)}, {testChargePos.y.toFixed(0)}</div>
          <div className="text-xs text-slate-400">Position (px)</div>
        </div>
        <div className="bg-slate-800/70 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-purple-400">+1 μC</div>
          <div className="text-xs text-slate-400">Test charge</div>
        </div>
      </div>

      {/* Key insight */}
      <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-bold text-amber-400 mb-2">Key Insight</h3>
        <p className="text-slate-300 text-sm">
          <strong>Equipotential surfaces</strong> are always perpendicular to electric field lines.
          Moving along an equipotential requires <strong>no work</strong> because ΔV = 0!
        </p>
        <p className="text-cyan-400 text-sm mt-2">
          V = kq/r for a point charge. Potential decreases as 1/r (slower than field's 1/r²).
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all duration-300"
      >
        Review the Concepts →
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>
        Understanding Electric Potential
      </h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-amber-400 mb-3">⚡ What is Electric Potential?</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• <strong>V = W/q</strong>: Work per unit charge to move from infinity</li>
            <li>• <strong>V = U/q</strong>: Potential energy per unit charge</li>
            <li>• Measured in Volts (V) = Joules per Coulomb</li>
            <li>• Positive charges create positive potential</li>
            <li>• Only <strong>potential differences</strong> (ΔV) are physically meaningful</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">🔋 Point Charge Potential</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• <strong>V = kq/r</strong> for a point charge</li>
            <li>• k = 8.99 × 10⁹ N⋅m²/C²</li>
            <li>• Potential is a <strong>scalar</strong> (no direction)</li>
            <li>• Potentials from multiple charges simply add</li>
            <li>• V → 0 as r → ∞ (reference point at infinity)</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-purple-400 mb-3">🔄 Relationship to Electric Field</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• <strong>E = -dV/dr</strong>: Field is negative gradient of potential</li>
            <li>• Field points from high V to low V</li>
            <li>• For uniform field: <strong>E = V/d</strong></li>
            <li>• Equipotentials ⊥ field lines (always)</li>
            <li>• Closer equipotentials = stronger field</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">💡 Energy & Work</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• <strong>W = qΔV</strong>: Work done by field on charge</li>
            <li>• <strong>U = qV</strong>: Potential energy of charge at V</li>
            <li>• Positive charge gains KE moving to lower V</li>
            <li>• Electron gains KE moving to higher V</li>
            <li>• 1 eV = energy gained by e⁻ through 1V</li>
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
            <div className="text-emerald-400 font-mono text-sm">W = qΔV</div>
            <div className="text-xs text-slate-500 mt-1">Work done</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-purple-400 font-mono text-sm">E = V/d</div>
            <div className="text-xs text-slate-500 mt-1">Uniform field</div>
          </div>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Discover a Surprising Twist →
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-6`}>
        The Twist Challenge
      </h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <svg viewBox="0 0 300 200" className="w-full max-w-sm mx-auto mb-4">
          {/* Hollow conductor */}
          <ellipse cx="150" cy="100" rx="100" ry="80" fill="none" stroke="#f59e0b" strokeWidth="8" />
          <ellipse cx="150" cy="100" rx="85" ry="65" fill="#1e293b" />

          {/* Charges on surface */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * 2 * Math.PI;
            const x = 150 + 95 * Math.cos(angle);
            const y = 100 + 75 * Math.sin(angle);
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="6" fill="#ef4444" />
                <text x={x} y={y + 3} textAnchor="middle" fill="white" fontSize="8">+</text>
              </g>
            );
          })}

          {/* Test point inside */}
          <circle cx="150" cy="100" r="8" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
          <text x="150" y="103" textAnchor="middle" fill="white" fontSize="8">?</text>

          <text x="150" y="180" textAnchor="middle" fill="#94a3b8" fontSize="12">Charged hollow conductor</text>
        </svg>

        <p className="text-lg text-slate-300 mb-4">
          A hollow metal sphere is charged to +10,000V on its outer surface. All the charge resides on the outside.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          What is the electric potential <strong>inside</strong> the hollow sphere?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Zero volts (no charge inside means no potential)' },
          { id: 'B', text: 'Higher than the surface (charge "concentrates" in center)' },
          { id: 'C', text: 'Same as the surface (+10,000V everywhere inside)' },
          { id: 'D', text: 'Varies with position (maximum at center)' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
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
            ✓ Correct! The potential is constant throughout the interior!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            Even though E = 0 inside, the potential equals the surface value everywhere inside. This is because V doesn't depend on E, but on the integral of E from infinity - and that's the same for all interior points!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
          >
            Explore This Further →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-4`}>
        Potential Inside Conductors
      </h2>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <svg viewBox="0 0 400 300" className="w-full max-w-md mx-auto">
          {/* Background */}
          <rect x="0" y="0" width="400" height="300" fill="#1e293b" rx="15" />

          {/* Equipotential lines outside */}
          <ellipse cx="200" cy="150" rx="180" ry="140" fill="none" stroke="#22c55e" strokeWidth="1" strokeDasharray="4,4" opacity="0.3" />
          <ellipse cx="200" cy="150" rx="150" ry="120" fill="none" stroke="#22c55e" strokeWidth="1" strokeDasharray="4,4" opacity="0.4" />
          <ellipse cx="200" cy="150" rx="120" ry="95" fill="none" stroke="#22c55e" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />

          {/* Conductor shell */}
          <ellipse cx="200" cy="150" rx="90" ry="70" fill="#f59e0b" opacity="0.3" />
          <ellipse cx="200" cy="150" rx="90" ry="70" fill="none" stroke="#f59e0b" strokeWidth="6" />

          {/* Interior - same potential (highlighted) */}
          <ellipse cx="200" cy="150" rx="70" ry="55" fill="#f59e0b" opacity="0.15" />
          <text x="200" y="145" textAnchor="middle" fill="#f59e0b" fontSize="14" fontWeight="bold">V = V₀</text>
          <text x="200" y="165" textAnchor="middle" fill="#f59e0b" fontSize="11">everywhere inside</text>

          {/* Surface charges */}
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i / 16) * 2 * Math.PI;
            const x = 200 + 90 * Math.cos(angle);
            const y = 150 + 70 * Math.sin(angle);
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="5" fill="#ef4444" />
                <text x={x} y={y + 3} textAnchor="middle" fill="white" fontSize="7">+</text>
              </g>
            );
          })}

          {/* Labels */}
          <text x="350" y="50" textAnchor="end" fill="#22c55e" fontSize="10">Lower V</text>
          <text x="200" y="250" textAnchor="middle" fill="#f59e0b" fontSize="10">Surface: V = V₀</text>

          {/* E = 0 inside indicator */}
          <text x="200" y="185" textAnchor="middle" fill="#ef4444" fontSize="10">E = 0</text>
        </svg>
      </div>

      <div className="grid md:grid-cols-2 gap-4 max-w-2xl mb-6">
        <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-xl p-4">
          <h3 className="text-lg font-bold text-amber-400 mb-2">Why is V constant inside?</h3>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>• E = 0 inside a conductor (charges redistribute)</li>
            <li>• E = -dV/dr, so if E = 0, then dV/dr = 0</li>
            <li>• No change in V means V is constant</li>
            <li>• Interior connects to surface: V_inside = V_surface</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-xl p-4">
          <h3 className="text-lg font-bold text-purple-400 mb-2">The Faraday Cage Effect</h3>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>• Shields interior from external fields</li>
            <li>• Used in electronics, MRI rooms, cars during lightning</li>
            <li>• Even mesh conductors provide shielding</li>
            <li>• Critical for electromagnetic compatibility (EMC)</li>
          </ul>
        </div>
      </div>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-cyan-400 mb-2">The Counterintuitive Truth</h3>
        <p className="text-slate-300 text-sm">
          You might expect the potential to be highest at the center of a charged sphere, like pressure in a balloon. But electric potential doesn't work that way! The potential is determined by the work needed to bring a test charge from infinity—and that's the same whether you stop at the surface or continue to the center (since E = 0 inside, no additional work is done).
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Review This Discovery →
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-6`}>
        Key Discovery: Conductors and Potential
      </h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4">Three Key Facts About Conductors</h3>
        <div className="space-y-4 text-slate-300">
          <div className="flex items-start gap-3">
            <div className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold shrink-0">1</div>
            <p><strong>E = 0 inside</strong>: Free charges redistribute until the internal field vanishes completely.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold shrink-0">2</div>
            <p><strong>V = constant inside</strong>: Since E = -∇V, zero field means no potential gradient. The entire conductor is an equipotential.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold shrink-0">3</div>
            <p><strong>All charge on surface</strong>: Excess charge resides entirely on the outer surface of the conductor.</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-amber-400 mb-3">Practical Applications</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-lg mb-1">🚗</div>
            <div className="text-slate-300">Cars protect occupants from lightning (Faraday cage)</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-lg mb-1">🔬</div>
            <div className="text-slate-300">MRI rooms shielded from external EM interference</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-lg mb-1">📱</div>
            <div className="text-slate-300">Electronic device shielding prevents interference</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-lg mb-1">⚡</div>
            <div className="text-slate-300">High-voltage equipment safety enclosures</div>
          </div>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all duration-300"
      >
        Explore Real-World Applications →
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-4">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>
        Real-World Applications
      </h2>

      {/* App selector tabs */}
      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {transferApps.map((app, index) => (
          <button
            key={index}
            onMouseDown={(e) => { e.preventDefault(); setActiveAppIndex(index); }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppIndex === index
                ? 'bg-amber-600 text-white'
                : completedApps.has(index)
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.icon} {app.short}
          </button>
        ))}
      </div>

      {/* Active app display */}
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-3xl w-full">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{transferApps[activeAppIndex].icon}</span>
          <div>
            <h3 className="text-xl font-bold text-white">{transferApps[activeAppIndex].title}</h3>
            <p className="text-amber-400 text-sm">{transferApps[activeAppIndex].tagline}</p>
          </div>
        </div>

        <p className="text-slate-300 mb-4">{transferApps[activeAppIndex].description}</p>

        <div className={`bg-gradient-to-r ${transferApps[activeAppIndex].color} bg-opacity-20 rounded-xl p-4 mb-4`}>
          <h4 className="font-semibold text-white mb-2">Physics Connection</h4>
          <p className="text-slate-200 text-sm">{transferApps[activeAppIndex].connection}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <h4 className="font-semibold text-cyan-400 mb-2">How It Works</h4>
            <ul className="text-sm text-slate-300 space-y-1">
              {transferApps[activeAppIndex].howItWorks.map((step, i) => (
                <li key={i}>• {step}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-emerald-400 mb-2">Key Numbers</h4>
            <div className="grid grid-cols-2 gap-2">
              {transferApps[activeAppIndex].stats.map((stat, i) => (
                <div key={i} className="bg-slate-900/50 rounded-lg p-2 text-center">
                  <div className="text-amber-400 font-bold">{stat.value}</div>
                  <div className="text-xs text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {transferApps[activeAppIndex].companies.map((company, i) => (
            <span key={i} className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">
              {company}
            </span>
          ))}
        </div>

        <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
          <h4 className="font-semibold text-purple-400 mb-1 text-sm">Future Impact</h4>
          <p className="text-slate-400 text-xs">{transferApps[activeAppIndex].futureImpact}</p>
        </div>

        {!completedApps.has(activeAppIndex) && (
          <button
            onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppIndex); }}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-colors"
          >
            ✓ Mark as Understood
          </button>
        )}
      </div>

      {/* Progress indicator */}
      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">
          {transferApps.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`}
            />
          ))}
        </div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>

      {completedApps.size >= 4 && (
        <button
          onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all duration-300"
        >
          Take the Knowledge Test →
        </button>
      )}
    </div>
  );

  const renderTest = () => (
    <div className="flex flex-col items-center p-4">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>
        Knowledge Assessment
      </h2>

      {!showTestResults ? (
        <div className="space-y-6 max-w-2xl w-full">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
              <div className="bg-slate-900/50 rounded-lg p-3 mb-3">
                <p className="text-amber-400 text-sm italic">{q.scenario}</p>
              </div>
              <p className="text-white font-medium mb-3">
                {qIndex + 1}. {q.question}
              </p>
              <div className="grid gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(qIndex, oIndex); }}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setShowTestResults(true);
              playSound(calculateScore() >= 7 ? 'complete' : 'incorrect');
            }}
            disabled={testAnswers.includes(-1)}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              testAnswers.includes(-1)
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-500 hover:to-orange-500'
            }`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="max-w-2xl w-full">
          <div className="bg-slate-800/50 rounded-2xl p-6 text-center mb-6">
            <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🎉' : '📚'}</div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Score: {calculateScore()}/10
            </h3>
            <p className="text-slate-300 mb-4">
              {calculateScore() >= 7
                ? 'Excellent! You\'ve mastered electric potential!'
                : 'Keep studying! Review the concepts and try again.'}
            </p>
          </div>

          {/* Show explanations */}
          <div className="space-y-4 mb-6">
            {testQuestions.map((q, qIndex) => {
              const isCorrect = q.options[testAnswers[qIndex]]?.correct;
              return (
                <div
                  key={qIndex}
                  className={`rounded-xl p-4 ${isCorrect ? 'bg-emerald-900/30 border border-emerald-600' : 'bg-red-900/30 border border-red-600'}`}
                >
                  <p className="text-white font-medium mb-2">
                    {qIndex + 1}. {q.question}
                  </p>
                  <p className={`text-sm mb-2 ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                    Your answer: {q.options[testAnswers[qIndex]]?.text}
                    {isCorrect ? ' ✓' : ' ✗'}
                  </p>
                  <p className="text-slate-400 text-sm">{q.explanation}</p>
                </div>
              );
            })}
          </div>

          {calculateScore() >= 7 ? (
            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(9); }}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
            >
              Claim Your Mastery Badge →
            </button>
          ) : (
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                setShowTestResults(false);
                setTestAnswers(Array(10).fill(-1));
                goToPhase(3);
              }}
              className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all duration-300"
            >
              Review & Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-amber-900/50 via-orange-900/50 to-yellow-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">⚡</div>
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-white mb-4`}>
          Electric Potential Master!
        </h1>
        <p className="text-xl text-slate-300 mb-6">
          You've mastered the physics of electric potential and voltage!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🔋</div>
            <p className="text-sm text-slate-300">V = kq/r</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">⚡</div>
            <p className="text-sm text-slate-300">E = -dV/dr</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">💡</div>
            <p className="text-sm text-slate-300">W = qΔV</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🛡️</div>
            <p className="text-sm text-slate-300">V = const inside conductor</p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(0); }}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
          >
            ↺ Explore Again
          </button>
        </div>
      </div>
    </div>
  );

  // ==================== PHASE ROUTER ====================
  const renderPhase = () => {
    switch (phase) {
      case 0: return renderHook();
      case 1: return renderPredict();
      case 2: return renderPlay();
      case 3: return renderReview();
      case 4: return renderTwistPredict();
      case 5: return renderTwistPlay();
      case 6: return renderTwistReview();
      case 7: return renderTransfer();
      case 8: return renderTest();
      case 9: return renderMastery();
      default: return renderHook();
    }
  };

  const phaseNames = [
    'Hook', 'Predict', 'Explore', 'Review',
    'Twist', 'Twist Explore', 'Twist Review',
    'Apply', 'Test', 'Mastery'
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium Background Layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-950/50 via-transparent to-orange-950/50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent" />

      {/* Ambient Glow Circles */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
      <div className="absolute top-3/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-900/70 border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-slate-400`}>Electric Potential</span>
          <div className="flex gap-1.5 items-center">
            {phaseNames.map((name, i) => (
              <button
                key={i}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(i); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === i ? 'bg-amber-500 w-6' : phase > i ? 'bg-amber-500 w-2' : 'bg-slate-600 w-2'
                }`}
                title={name}
              />
            ))}
          </div>
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-500`}>{phaseNames[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 pt-14 pb-8">
        {renderPhase()}
      </div>
    </div>
  );
};

export default ElectricPotentialRenderer;
