import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// CAPACITANCE - GOLD STANDARD RENDERER
// ============================================================================
// Physics: C = Q/V (definition), C = ε₀εᵣA/d (parallel plate)
// Key concept: Capacitance measures charge storage per unit voltage
// Energy: U = ½CV² = ½QV = ½Q²/C
// Units: Farads (F) = Coulombs per Volt (C/V)
// ============================================================================

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'parameter_changed'
  | 'capacitance_calculated'
  | 'charging_started'
  | 'charging_complete'
  | 'discharged'
  | 'dielectric_changed'
  | 'energy_calculated'
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

interface Props {
  onGameEvent?: (event: { type: GameEventType; data?: Record<string, unknown> }) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

const CapacitanceRenderer: React.FC<Props> = ({
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
  const [plateArea, setPlateArea] = useState(50); // cm²
  const [plateSeparation, setPlateSeparation] = useState(5); // mm
  const [appliedVoltage, setAppliedVoltage] = useState(12); // V
  const [isCharging, setIsCharging] = useState(false);
  const [chargeProgress, setChargeProgress] = useState(0);
  const [dielectricConstant, setDielectricConstant] = useState(1); // Air = 1
  const [showCharges, setShowCharges] = useState(true);
  const [showFieldLines, setShowFieldLines] = useState(true);

  // Constants
  const epsilon0 = 8.854e-12; // F/m

  // Refs
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // ==================== CALCULATIONS ====================
  const areaM2 = plateArea * 1e-4; // convert cm² to m²
  const separationM = plateSeparation * 1e-3; // convert mm to m
  const capacitance = (epsilon0 * dielectricConstant * areaM2) / separationM * 1e12; // pF
  const storedCharge = capacitance * appliedVoltage; // pC
  const storedEnergy = 0.5 * capacitance * 1e-12 * appliedVoltage * appliedVoltage * 1e6; // µJ
  const electricField = appliedVoltage / separationM; // V/m

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

  // Charging animation
  useEffect(() => {
    if (!isCharging) return;

    const interval = setInterval(() => {
      setChargeProgress(prev => {
        if (prev >= 100) {
          setIsCharging(false);
          if (onGameEvent) {
            onGameEvent({ type: 'charging_complete', data: { charge: storedCharge, energy: storedEnergy } });
          }
          return 100;
        }
        return prev + 5;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isCharging, storedCharge, storedEnergy, onGameEvent]);

  // ==================== AUDIO ====================
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'complete' | 'charge' | 'discharge') => {
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
        case 'success':
          oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.3);
          break;
        case 'failure':
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
        case 'charge':
          oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.3);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.3);
          break;
        case 'discharge':
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.2);
          break;
      }
    } catch {
      // Audio not available
    }
  }, []);

  // ==================== NAVIGATION (DUAL DEBOUNCE) ====================
  const goToPhase = useCallback((newPhase: number) => {
    // DUAL DEBOUNCE: Both time check AND flag check
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;  // Time-based debounce
    if (navigationLockRef.current) return;          // Flag-based debounce

    lastClickRef.current = now;
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

  // ==================== EVENT HANDLERS ====================
  const handlePrediction = useCallback((prediction: string) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'B' ? 'success' : 'failure');

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
    playSound(prediction === 'C' ? 'success' : 'failure');

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

  const startCharging = useCallback(() => {
    setChargeProgress(0);
    setIsCharging(true);
    playSound('charge');

    if (onGameEvent) {
      onGameEvent({ type: 'charging_started', data: { voltage: appliedVoltage, capacitance } });
    }
  }, [appliedVoltage, capacitance, onGameEvent, playSound]);

  const discharge = useCallback(() => {
    setChargeProgress(0);
    setIsCharging(false);
    playSound('discharge');

    if (onGameEvent) {
      onGameEvent({ type: 'discharged' });
    }
  }, [onGameEvent, playSound]);

  // ==================== TEST DATA ====================
  const testQuestions: TestQuestion[] = [
    {
      scenario: "An engineer needs to design a parallel plate capacitor with exactly 100 pF capacitance using plates of 10 cm² area in air.",
      question: "What plate separation should they use?",
      options: [
        { text: "0.885 mm", correct: true },
        { text: "8.85 mm", correct: false },
        { text: "0.0885 mm", correct: false },
        { text: "88.5 mm", correct: false }
      ],
      explanation: "C = ε₀A/d, so d = ε₀A/C = (8.854×10⁻¹² × 10×10⁻⁴)/(100×10⁻¹²) = 8.854×10⁻⁴ m = 0.885 mm."
    },
    {
      scenario: "A 47μF capacitor in a power supply is charged to 25V and needs to be discharged safely before servicing.",
      question: "How much energy must be safely dissipated?",
      options: [
        { text: "0.59 mJ", correct: false },
        { text: "14.7 mJ", correct: true },
        { text: "1.18 J", correct: false },
        { text: "0.59 J", correct: false }
      ],
      explanation: "U = ½CV² = ½ × 47×10⁻⁶ × 25² = ½ × 47×10⁻⁶ × 625 = 14.7×10⁻³ J = 14.7 mJ."
    },
    {
      scenario: "A capacitor stores 50μC of charge when connected to a 10V battery. It's then connected to a 20V battery.",
      question: "How much charge does it store now?",
      options: [
        { text: "25 μC", correct: false },
        { text: "50 μC", correct: false },
        { text: "100 μC", correct: true },
        { text: "200 μC", correct: false }
      ],
      explanation: "C = Q/V = 50μC/10V = 5μF. At 20V: Q = CV = 5μF × 20V = 100μC. Charge is proportional to voltage for fixed capacitance."
    },
    {
      scenario: "A smartphone touchscreen uses a capacitive sensor with air gap. The user's finger approaches, effectively inserting a dielectric (εᵣ ≈ 80 for water/tissue).",
      question: "What happens to the local capacitance when the finger approaches?",
      options: [
        { text: "Decreases significantly", correct: false },
        { text: "Stays exactly the same", correct: false },
        { text: "Increases significantly", correct: true },
        { text: "Becomes zero", correct: false }
      ],
      explanation: "The finger acts as a dielectric with high permittivity. C = ε₀εᵣA/d, so capacitance increases dramatically. This change is what the touchscreen detects."
    },
    {
      scenario: "A defibrillator charges a 32μF capacitor to 5000V for a cardiac shock.",
      question: "How much energy is delivered to the patient (assuming no losses)?",
      options: [
        { text: "80 J", correct: false },
        { text: "400 J", correct: true },
        { text: "160 J", correct: false },
        { text: "800 J", correct: false }
      ],
      explanation: "U = ½CV² = ½ × 32×10⁻⁶ × 5000² = ½ × 32×10⁻⁶ × 25×10⁶ = 400 J. This is a typical defibrillator energy level."
    },
    {
      scenario: "A camera flash uses a 1000μF capacitor charged to 300V. The flash duration is 1 millisecond.",
      question: "What is the average power output during the flash?",
      options: [
        { text: "45 W", correct: false },
        { text: "450 W", correct: false },
        { text: "4,500 W", correct: false },
        { text: "45,000 W (45 kW)", correct: true }
      ],
      explanation: "U = ½CV² = ½ × 1000×10⁻⁶ × 300² = 45 J. P = U/t = 45 J / 0.001 s = 45,000 W. This is why we use capacitors - batteries can't deliver this power!"
    },
    {
      scenario: "Two identical capacitors (each 10μF) are connected first in series, then in parallel.",
      question: "What is the ratio of parallel capacitance to series capacitance?",
      options: [
        { text: "1:1 (they're equal)", correct: false },
        { text: "2:1", correct: false },
        { text: "4:1", correct: true },
        { text: "1:2", correct: false }
      ],
      explanation: "Series: 1/C_s = 1/10 + 1/10 = 2/10, so C_s = 5μF. Parallel: C_p = 10 + 10 = 20μF. Ratio = 20/5 = 4:1."
    },
    {
      scenario: "A capacitor is charged and then disconnected from the battery. A dielectric slab (εᵣ = 4) is then inserted between the plates.",
      question: "What happens to the voltage across the capacitor?",
      options: [
        { text: "Voltage increases by 4×", correct: false },
        { text: "Voltage decreases to 1/4", correct: true },
        { text: "Voltage stays the same", correct: false },
        { text: "Voltage becomes zero", correct: false }
      ],
      explanation: "With the battery disconnected, Q is constant. C increases by 4× with dielectric. Since V = Q/C, voltage decreases to 1/4 of original value."
    },
    {
      scenario: "An electric vehicle uses supercapacitors for regenerative braking. The capacitor bank is rated at 100F, 48V.",
      question: "How much braking energy can be captured?",
      options: [
        { text: "4.8 kJ", correct: false },
        { text: "115.2 kJ", correct: true },
        { text: "2.4 kJ", correct: false },
        { text: "230.4 kJ", correct: false }
      ],
      explanation: "U = ½CV² = ½ × 100 × 48² = ½ × 100 × 2304 = 115,200 J = 115.2 kJ. Enough to significantly extend range!"
    },
    {
      scenario: "A DRAM memory cell uses a tiny capacitor (~30 fF) charged to 1V to store a binary '1'. The capacitor loses charge over time due to leakage.",
      question: "If the capacitor must maintain at least 15 fC to be read as '1', how often must it be refreshed?",
      options: [
        { text: "Every nanosecond", correct: false },
        { text: "Every microsecond", correct: false },
        { text: "Every millisecond (actual: ~64ms)", correct: true },
        { text: "Every second", correct: false }
      ],
      explanation: "Initial charge Q = CV = 30fF × 1V = 30fC. Must maintain 15fC (50%). Real DRAM refreshes every 64ms due to leakage currents. This is why DRAM needs constant power!"
    }
  ];

  const transferApps: TransferApp[] = [
    {
      icon: "📸",
      title: "Camera Flash & Strobe",
      short: "Flash",
      tagline: "Instant light from stored energy",
      description: "Camera flashes use capacitors to store energy slowly from a battery, then release it in a brilliant burst of light lasting milliseconds.",
      connection: "Capacitors can discharge their stored energy (U = ½CV²) extremely quickly, delivering kilowatts of power from a small battery that can only supply watts.",
      howItWorks: [
        "Battery slowly charges a large capacitor (1000μF typical)",
        "Capacitor reaches full voltage (300V typical)",
        "Flash tube ionizes when triggered",
        "All stored energy dumps through tube in ~1ms",
        "Light output peaks at thousands of watts"
      ],
      stats: [
        { value: "45 J", label: "Energy/Flash" },
        { value: "45 kW", label: "Peak Power" },
        { value: "1 ms", label: "Duration" },
        { value: "3s", label: "Recharge Time" }
      ],
      examples: [
        "DSLR camera flashes",
        "Studio strobe lights",
        "Xenon emergency strobes",
        "Photographic speed lights"
      ],
      companies: ["Canon", "Nikon", "Profoto", "Godox"],
      futureImpact: "LED flash technology is replacing xenon in phones, but professional photography still relies on capacitor-powered strobes for their unmatched power density.",
      color: "from-amber-600 to-yellow-600"
    },
    {
      icon: "💓",
      title: "Defibrillators",
      short: "Defib",
      tagline: "Life-saving electrical pulses",
      description: "Defibrillators charge a capacitor to high voltage, then deliver a precisely shaped pulse to restart a heart in cardiac arrest.",
      connection: "The capacitor stores exactly the right amount of energy (200-400J) and delivers it in a controlled waveform. Direct battery power couldn't provide the required current.",
      howItWorks: [
        "Capacitor charges to 1000-5000V over several seconds",
        "Operator confirms delivery is needed",
        "Discharge circuit shapes the pulse waveform",
        "Energy delivered through paddles in ~10ms",
        "Biphasic waveform more effective than monophasic"
      ],
      stats: [
        { value: "200-400 J", label: "Energy" },
        { value: "5000 V", label: "Max Voltage" },
        { value: "10 ms", label: "Pulse Time" },
        { value: "50 A", label: "Peak Current" }
      ],
      examples: [
        "Hospital defibrillators",
        "Automated External Defibrillators (AEDs)",
        "Implantable Cardioverter-Defibrillators (ICDs)",
        "Emergency ambulance units"
      ],
      companies: ["Philips", "Zoll", "Medtronic", "Physio-Control"],
      futureImpact: "Smaller, smarter ICDs with longer battery life are being developed. AI-assisted AEDs can now guide untrained users through the rescue process.",
      color: "from-red-600 to-pink-600"
    },
    {
      icon: "📱",
      title: "Touchscreens",
      short: "Touch",
      tagline: "Capacitance-based interaction",
      description: "Capacitive touchscreens detect your finger by measuring changes in capacitance across a grid of electrodes under the glass.",
      connection: "Your finger is conductive (mostly water), so approaching the screen adds capacitance to nearby electrodes. The processor detects these tiny changes (femtofarads) to locate touches.",
      howItWorks: [
        "Grid of transparent electrodes beneath glass",
        "Controller continuously measures capacitance at each node",
        "Finger approach increases local capacitance",
        "Multiple simultaneous touches detected (multi-touch)",
        "Changes as small as 0.1 pF are measured"
      ],
      stats: [
        { value: "~5 pF", label: "Baseline C" },
        { value: "0.1-1 pF", label: "Touch ΔC" },
        { value: "240 Hz", label: "Scan Rate" },
        { value: "10+", label: "Touch Points" }
      ],
      examples: [
        "Smartphones and tablets",
        "Laptop trackpads",
        "ATM machines",
        "Interactive kiosks"
      ],
      companies: ["Synaptics", "Cypress", "Atmel", "Goodix"],
      futureImpact: "Pressure-sensitive displays can detect how hard you press. In-display fingerprint sensors use capacitive imaging for secure biometric authentication.",
      color: "from-blue-600 to-cyan-600"
    },
    {
      icon: "🚗",
      title: "Supercapacitors in EVs",
      short: "SuperCap",
      tagline: "Rapid energy capture and release",
      description: "Supercapacitors complement batteries in electric vehicles, capturing braking energy instantly and providing power bursts for acceleration.",
      connection: "Supercapacitors have huge capacitance (thousands of Farads) through electrochemical double layers. They charge/discharge in seconds vs hours for batteries, with millions of cycle life.",
      howItWorks: [
        "Regenerative braking generates electricity",
        "Supercapacitors absorb energy in seconds",
        "Energy released during acceleration",
        "Battery handles steady-state power needs",
        "Hybrid system optimizes both components"
      ],
      stats: [
        { value: "3000 F", label: "Cell Capacity" },
        { value: "1M+", label: "Cycle Life" },
        { value: "10 kW/kg", label: "Power Density" },
        { value: "5 Wh/kg", label: "Energy Density" }
      ],
      examples: [
        "Formula E regenerative braking",
        "Hybrid city buses",
        "Start-stop vehicle systems",
        "Grid frequency stabilization"
      ],
      companies: ["Maxwell", "Skeleton", "Eaton", "Ioxus"],
      futureImpact: "Hybrid supercapacitor-battery systems promise EVs that charge in minutes. Graphene supercapacitors may achieve battery-like energy density with supercapacitor speed.",
      color: "from-green-600 to-emerald-600"
    }
  ];

  // ==================== SCORE CALCULATION ====================
  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  };

  // ==================== RENDER CAPACITOR ====================
  const renderCapacitor = (size: number = 300, showAnimation: boolean = true) => {
    const plateHeight = (plateArea / 100) * 120 + 40;
    const separation = (plateSeparation / 10) * 80 + 20;
    const chargeCount = Math.floor(chargeProgress / 10);

    return (
      <svg width={size} height={size} viewBox="0 0 300 300" className="mx-auto">
        <rect x="0" y="0" width="300" height="300" fill="#0f172a" rx="12" />

        {/* Battery/Power source */}
        <rect x="20" y="130" width="30" height="40" fill="#374151" stroke="#4b5563" strokeWidth="2" rx="3" />
        <text x="35" y="155" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="bold">+</text>
        <text x="35" y="168" textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="bold">−</text>
        <text x="35" y="185" textAnchor="middle" fill="#94a3b8" fontSize="8">{appliedVoltage}V</text>

        {/* Wires */}
        <path d="M50,140 L80,140 L80,100 L120,100" fill="none" stroke="#ef4444" strokeWidth="2" />
        <path d="M50,160 L80,160 L80,200 L120,200" fill="none" stroke="#3b82f6" strokeWidth="2" />

        {/* Left plate (positive) */}
        <rect
          x="120"
          y={150 - plateHeight/2}
          width="8"
          height={plateHeight}
          fill="#dc2626"
          stroke="#ef4444"
          strokeWidth="2"
        />

        {/* Right plate (negative) */}
        <rect
          x={120 + 8 + separation}
          y={150 - plateHeight/2}
          width="8"
          height={plateHeight}
          fill="#2563eb"
          stroke="#3b82f6"
          strokeWidth="2"
        />

        {/* Dielectric */}
        {dielectricConstant > 1 && (
          <rect
            x="128"
            y={150 - plateHeight/2 + 5}
            width={separation}
            height={plateHeight - 10}
            fill={dielectricConstant > 50 ? "#22c55e" : dielectricConstant > 5 ? "#a855f7" : "#f59e0b"}
            opacity="0.3"
            rx="2"
          />
        )}

        {/* Charges on plates */}
        {showCharges && showAnimation && Array.from({ length: chargeCount }).map((_, i) => {
          const yPos = 150 - plateHeight/2 + 15 + (i % 6) * 20;
          return (
            <g key={i}>
              <circle cx="124" cy={yPos} r="4" fill="#fbbf24" />
              <text x="124" y={yPos + 3} textAnchor="middle" fill="#000" fontSize="8" fontWeight="bold">+</text>
              <circle cx={120 + 8 + separation + 4} cy={yPos} r="4" fill="#60a5fa" />
              <text x={120 + 8 + separation + 4} y={yPos + 3} textAnchor="middle" fill="#000" fontSize="8" fontWeight="bold">−</text>
            </g>
          );
        })}

        {/* Electric field lines */}
        {showFieldLines && showAnimation && chargeProgress > 50 && (
          <g opacity="0.4">
            {[0, 1, 2].map(i => (
              <line
                key={i}
                x1="130"
                y1={130 + i * 20}
                x2={120 + separation}
                y2={130 + i * 20}
                stroke="#fbbf24"
                strokeWidth="1"
                strokeDasharray="4 2"
                markerEnd="url(#arrowE)"
              />
            ))}
          </g>
        )}

        {/* Wire to complete circuit */}
        <path d={`M${128 + separation},100 L${180 + separation},100 L${180 + separation},200 L${128 + separation},200`}
              fill="none" stroke="#6b7280" strokeWidth="2" strokeDasharray="4 4" />

        {/* Labels */}
        <text x="124" y="250" textAnchor="middle" fill="#94a3b8" fontSize="10">+Q</text>
        <text x={124 + separation} y="250" textAnchor="middle" fill="#94a3b8" fontSize="10">−Q</text>

        {/* Separation indicator */}
        <line x1="128" y1="270" x2={128 + separation} y2="270" stroke="#94a3b8" strokeWidth="1" />
        <line x1="128" y1="265" x2="128" y2="275" stroke="#94a3b8" strokeWidth="1" />
        <line x1={128 + separation} y1="265" x2={128 + separation} y2="275" stroke="#94a3b8" strokeWidth="1" />
        <text x={128 + separation/2} y="285" textAnchor="middle" fill="#94a3b8" fontSize="9">d = {plateSeparation}mm</text>

        <defs>
          <marker id="arrowE" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
            <path d="M0,0 L0,4 L6,2 z" fill="#fbbf24" />
          </marker>
        </defs>
      </svg>
    );
  };

  // ==================== PHASE RENDERERS ====================
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-cyan-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
        The Electric Sandwich
      </h1>

      <p className="text-lg md:text-xl text-slate-400 max-w-xl mb-8 leading-relaxed">
        How do two metal plates store enormous amounts of electrical energy?
      </p>

      {/* Premium card with capacitor animation */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl p-8 max-w-2xl border border-slate-700/50 shadow-2xl shadow-cyan-500/5 mb-8">
        <svg viewBox="0 0 300 180" className="w-full max-w-sm mx-auto mb-6">
          {/* Capacitor plates */}
          <rect x="80" y="30" width="15" height="120" fill="#ef4444" rx="3" />
          <rect x="180" y="30" width="15" height="120" fill="#3b82f6" rx="3" />

          {/* Charges */}
          {[0,1,2,3,4].map(i => (
            <g key={i}>
              <circle cx="92" cy={50 + i*22} r="8" fill="#fbbf24" />
              <text x="92" y={54 + i*22} textAnchor="middle" fill="#000" fontSize="12">+</text>
              <circle cx="185" cy={50 + i*22} r="8" fill="#60a5fa" />
              <text x="185" y={54 + i*22} textAnchor="middle" fill="#000" fontSize="12">−</text>
            </g>
          ))}

          {/* Electric field arrows */}
          {[0,1,2].map(i => (
            <path key={i} d={`M105,${60 + i*30} L170,${60 + i*30}`}
                  fill="none" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#hookArrow)" opacity="0.6" />
          ))}

          {/* Energy symbol */}
          <text x="145" y="165" textAnchor="middle" fill="#22c55e" fontSize="14" fontWeight="bold">E = ½CV²</text>

          <defs>
            <marker id="hookArrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#fbbf24" />
            </marker>
          </defs>
        </svg>

        <p className="text-xl text-slate-200 mb-4 leading-relaxed">
          Two metal plates separated by a gap can store <span className="text-cyan-400">enormous amounts of electrical energy</span>!
        </p>

        <p className="text-lg text-amber-400 font-medium mb-4">
          How does this "electric sandwich" work?
        </p>

        <p className="text-slate-400">
          From camera flashes to touchscreens to defibrillators — <span className="text-cyan-400 font-semibold">capacitors</span> are everywhere!
        </p>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="group relative px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-2">
          Explore Capacitors
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Subtle hint text */}
      <p className="mt-6 text-sm text-slate-500">
        Discover the physics of electrical energy storage
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
          A capacitor has two parallel metal plates. If you <span className="text-cyan-400 font-bold">double the plate area</span> while keeping the distance between plates the same:
        </p>
        <svg viewBox="0 0 300 120" className="w-full max-w-sm mx-auto">
          {/* Small plates */}
          <g transform="translate(50, 10)">
            <rect x="0" y="20" width="6" height="60" fill="#dc2626" />
            <rect x="30" y="20" width="6" height="60" fill="#2563eb" />
            <text x="18" y="100" textAnchor="middle" fill="#94a3b8" fontSize="10">Original</text>
          </g>

          {/* Arrow */}
          <text x="130" y="55" fill="#94a3b8" fontSize="20">→</text>

          {/* Large plates */}
          <g transform="translate(180, 10)">
            <rect x="0" y="0" width="6" height="100" fill="#dc2626" />
            <rect x="30" y="0" width="6" height="100" fill="#2563eb" />
            <text x="18" y="115" textAnchor="middle" fill="#22c55e" fontSize="10">2× Area</text>
          </g>
        </svg>
        <p className="text-lg text-cyan-400 font-medium mt-4">
          What happens to the capacitance?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Capacitance stays the same — area doesn\'t matter' },
          { id: 'B', text: 'Capacitance doubles — more area means more charge storage' },
          { id: 'C', text: 'Capacitance halves — bigger plates are less efficient' },
          { id: 'D', text: 'Capacitance quadruples — it\'s proportional to area squared' }
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
            ✓ Correct! Capacitance is <span className="text-cyan-400">directly proportional</span> to plate area!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            C = ε₀A/d — More area means more room for charges to accumulate, so capacitance increases linearly with area.
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
          >
            Build a Capacitor →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-4">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-4`}>
        Capacitor Lab
      </h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
        {renderCapacitor(isMobile ? 280 : 300, true)}

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-xl font-bold text-cyan-400">{capacitance.toFixed(2)}</div>
            <div className="text-xs text-slate-400">Capacitance (pF)</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-xl font-bold text-amber-400">{(storedCharge * chargeProgress / 100).toFixed(1)}</div>
            <div className="text-xs text-slate-400">Charge (pC)</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-xl font-bold text-emerald-400">{(storedEnergy * chargeProgress / 100).toFixed(3)}</div>
            <div className="text-xs text-slate-400">Energy (µJ)</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-xl font-bold text-purple-400">{(electricField / 1000).toFixed(1)}</div>
            <div className="text-xs text-slate-400">Field (kV/m)</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 w-full max-w-2xl mb-6">
        <div className="bg-slate-800/70 rounded-xl p-4">
          <div className="flex justify-between mb-2">
            <span className="text-slate-300">Plate Area (A)</span>
            <span className="text-cyan-400 font-bold">{plateArea} cm²</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={plateArea}
            onChange={(e) => setPlateArea(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

        <div className="bg-slate-800/70 rounded-xl p-4">
          <div className="flex justify-between mb-2">
            <span className="text-slate-300">Plate Separation (d)</span>
            <span className="text-amber-400 font-bold">{plateSeparation} mm</span>
          </div>
          <input
            type="range"
            min="1"
            max="20"
            value={plateSeparation}
            onChange={(e) => setPlateSeparation(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        <div className="bg-slate-800/70 rounded-xl p-4">
          <div className="flex justify-between mb-2">
            <span className="text-slate-300">Applied Voltage (V)</span>
            <span className="text-emerald-400 font-bold">{appliedVoltage} V</span>
          </div>
          <input
            type="range"
            min="1"
            max="50"
            value={appliedVoltage}
            onChange={(e) => setAppliedVoltage(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onMouseDown={(e) => { e.preventDefault(); startCharging(); }}
          disabled={isCharging}
          className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
            isCharging ? 'bg-slate-600 text-slate-400' : 'bg-cyan-600 hover:bg-cyan-500 text-white'
          }`}
        >
          ⚡ {isCharging ? 'Charging...' : 'Charge'}
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); discharge(); }}
          className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold transition-colors"
        >
          Discharge
        </button>
      </div>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-cyan-400 mb-3">The Capacitance Formula</h3>
        <div className="text-center text-2xl text-white mb-3 font-mono">
          C = ε₀ × A / d
        </div>
        <div className="text-sm text-slate-300 space-y-1">
          <p>• <strong>C</strong> = Capacitance (Farads) — how much charge per volt</p>
          <p>• <strong>ε₀</strong> = 8.854 × 10⁻¹² F/m (permittivity of free space)</p>
          <p>• <strong>A</strong> = Plate area (larger area → more C)</p>
          <p>• <strong>d</strong> = Separation (smaller gap → more C)</p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
      >
        Review the Concepts →
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>
        Understanding Capacitance
      </h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">⚡ What Capacitors Do</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Store electric charge on two conducting plates</li>
            <li>• Create an electric field between the plates</li>
            <li>• Store energy in that electric field</li>
            <li>• Release energy much faster than batteries</li>
            <li>• Block DC current but pass AC signals</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-amber-400 mb-3">📐 Key Relationships</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• <strong>C = Q/V</strong> — definition of capacitance</li>
            <li>• <strong>C = ε₀A/d</strong> — geometry formula</li>
            <li>• <strong>U = ½CV²</strong> — stored energy</li>
            <li>• <strong>U = ½QV = Q²/2C</strong> — alternative forms</li>
            <li>• Series: 1/C_total = Σ(1/C_i)</li>
            <li>• Parallel: C_total = ΣC_i</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">🔋 Why Capacitors vs Batteries?</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-cyan-400 font-semibold mb-2">Capacitors Excel At:</p>
              <ul className="text-xs text-slate-300 space-y-1">
                <li>• Rapid charge/discharge (microseconds)</li>
                <li>• High power delivery (kilowatts)</li>
                <li>• Millions of charge cycles</li>
                <li>• Temperature tolerance</li>
              </ul>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-amber-400 font-semibold mb-2">Batteries Excel At:</p>
              <ul className="text-xs text-slate-300 space-y-1">
                <li>• High energy density (Wh/kg)</li>
                <li>• Steady power over hours</li>
                <li>• Portable power sources</li>
                <li>• Lower cost per Wh stored</li>
              </ul>
            </div>
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
        The Dielectric Mystery
      </h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <svg viewBox="0 0 280 140" className="w-full max-w-sm mx-auto mb-4">
          {/* Capacitor plates */}
          <rect x="80" y="30" width="8" height="80" fill="#dc2626" />
          <rect x="180" y="30" width="8" height="80" fill="#2563eb" />

          {/* Glass sheet being inserted */}
          <rect x="110" y="25" width="50" height="90" fill="#22c55e" opacity="0.4" stroke="#22c55e" strokeWidth="2" rx="3" />
          <text x="135" y="75" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="bold">Glass</text>

          {/* Arrow showing insertion */}
          <path d="M135,5 L135,20" stroke="#22c55e" strokeWidth="2" markerEnd="url(#twistArrow)" />

          <defs>
            <marker id="twistArrow" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
              <path d="M0,0 L0,4 L6,2 z" fill="#22c55e" />
            </marker>
          </defs>
        </svg>

        <p className="text-lg text-slate-300 mb-4">
          You slide a sheet of glass (or plastic, or ceramic) between the capacitor plates — <span className="text-amber-400">without touching them</span>.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          What happens to the capacitance?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Capacitance decreases — the glass blocks the electric field' },
          { id: 'B', text: 'Capacitance stays the same — only metal plates matter' },
          { id: 'C', text: 'Capacitance increases — the dielectric enhances charge storage!' },
          { id: 'D', text: 'The capacitor short-circuits — insulators conduct at high voltage' }
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
            ✓ Surprising but true! A <span className="text-purple-400">dielectric</span> INCREASES capacitance!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            The dielectric molecules polarize, creating opposing charges that partially cancel the electric field. This allows MORE charge to accumulate on the plates!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
          >
            Explore Dielectrics →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-4`}>
        Dielectric Materials
      </h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
        {renderCapacitor(isMobile ? 280 : 300, true)}

        <div className="mt-4 grid grid-cols-2 gap-4 text-center">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-400">{dielectricConstant}</div>
            <div className="text-xs text-slate-400">Dielectric Constant (εᵣ)</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-cyan-400">{capacitance.toFixed(2)} pF</div>
            <div className="text-xs text-slate-400">Capacitance</div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl w-full mb-6">
        <h3 className="text-lg font-semibold text-purple-400 mb-3">Select Dielectric Material:</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { name: 'Vacuum/Air', k: 1, color: 'bg-slate-600' },
            { name: 'Paper', k: 3, color: 'bg-amber-600' },
            { name: 'Glass', k: 7, color: 'bg-emerald-600' },
            { name: 'Ceramic', k: 200, color: 'bg-purple-600' }
          ].map(mat => (
            <button
              key={mat.name}
              onMouseDown={(e) => { e.preventDefault(); setDielectricConstant(mat.k); }}
              className={`p-3 rounded-lg text-center transition-all ${
                dielectricConstant === mat.k
                  ? `${mat.color} text-white ring-2 ring-white`
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <div className="font-semibold text-sm">{mat.name}</div>
              <div className="text-xs opacity-80">εᵣ = {mat.k}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-purple-400 mb-3">How Dielectrics Work</h3>
        <ul className="space-y-2 text-slate-300 text-sm">
          <li>• <strong>Polarization:</strong> Dielectric molecules align with the electric field</li>
          <li>• <strong>Opposing Field:</strong> Aligned dipoles create a field opposing the main field</li>
          <li>• <strong>Net Effect:</strong> Weaker field between plates → same voltage → more charge!</li>
          <li>• <strong>Formula:</strong> C = εᵣ × ε₀ × A / d</li>
        </ul>
        <p className="text-cyan-400 mt-4 text-sm">
          The dielectric constant εᵣ multiplies the capacitance! High-κ ceramics can have εᵣ {'>'} 10,000!
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Review Dielectrics →
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-6`}>
        Key Discovery: Dielectrics
      </h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4">Dielectrics Supercharge Capacitors!</h3>
        <div className="space-y-4 text-slate-300">
          <p>Inserting an insulating material (dielectric) between capacitor plates:</p>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Molecules in the dielectric polarize (+ and − ends align)</li>
            <li>This creates a partial cancellation of the electric field</li>
            <li>Reduced field → plates can hold MORE charge at same voltage</li>
            <li>Capacitance multiplied by dielectric constant εᵣ</li>
          </ol>
          <div className="bg-slate-800/50 rounded-lg p-4 mt-4 text-center">
            <p className="text-2xl font-mono text-white">C = εᵣ × ε₀ × A / d</p>
            <p className="text-xs text-slate-400 mt-2">Full capacitance formula with dielectric</p>
          </div>
          <p className="text-emerald-400 font-medium mt-4">
            This is why real capacitors use dielectrics — to pack more capacitance into small spaces!
          </p>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-cyan-400 mb-2">Common Dielectric Materials</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-slate-900/50 rounded-lg p-2">
            <div className="font-bold text-amber-400">Air</div>
            <div className="text-slate-400">εᵣ = 1.0006</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2">
            <div className="font-bold text-amber-400">Teflon</div>
            <div className="text-slate-400">εᵣ = 2.1</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2">
            <div className="font-bold text-emerald-400">Glass</div>
            <div className="text-slate-400">εᵣ = 5-10</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2">
            <div className="font-bold text-purple-400">Ceramic</div>
            <div className="text-slate-400">εᵣ = 12-10,000</div>
          </div>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
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

      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {transferApps.map((app, index) => (
          <button
            key={index}
            onMouseDown={(e) => { e.preventDefault(); setActiveAppIndex(index); }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppIndex === index
                ? 'bg-cyan-600 text-white'
                : completedApps.has(index)
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.icon} {app.short}
          </button>
        ))}
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-3xl w-full">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{transferApps[activeAppIndex].icon}</span>
          <div>
            <h3 className="text-xl font-bold text-white">{transferApps[activeAppIndex].title}</h3>
            <p className="text-cyan-400 text-sm">{transferApps[activeAppIndex].tagline}</p>
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
                  <div className="text-cyan-400 font-bold">{stat.value}</div>
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
          className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
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
                <p className="text-cyan-400 text-sm italic">{q.scenario}</p>
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
                        ? 'bg-cyan-600 text-white'
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
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500'
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
                ? 'Excellent! You\'ve mastered capacitance!'
                : 'Keep studying! Review the concepts and try again.'}
            </p>
          </div>

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
              className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
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
      <div className="bg-gradient-to-br from-cyan-900/50 via-blue-900/50 to-purple-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">⚡</div>
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-white mb-4`}>
          Capacitance Master!
        </h1>
        <p className="text-xl text-slate-300 mb-6">
          You've mastered the physics of electrical energy storage!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">📐</div>
            <p className="text-sm text-slate-300">C = ε₀εᵣA/d</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🔋</div>
            <p className="text-sm text-slate-300">U = ½CV²</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🧲</div>
            <p className="text-sm text-slate-300">Dielectrics</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">📱</div>
            <p className="text-sm text-slate-300">Applications</p>
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
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-600/3 rounded-full blur-3xl" />

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-medium text-cyan-400">Capacitance</span>
          <div className="flex gap-1.5">
            {phaseNames.map((name, i) => (
              <button
                key={i}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(i); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === i ? 'bg-cyan-500 w-6' : phase > i ? 'bg-emerald-500 w-2' : 'bg-slate-600 w-2'
                }`}
                title={name}
              />
            ))}
          </div>
          <span className="text-sm text-slate-400 font-medium">{phaseNames[phase]}</span>
        </div>
      </div>

      <div className="relative z-10 pt-16 pb-8">
        {renderPhase()}
      </div>
    </div>
  );
};

export default CapacitanceRenderer;
