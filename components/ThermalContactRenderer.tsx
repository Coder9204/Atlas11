"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

// Game event interface for AI coach integration
interface GameEvent {
  type: string;
  data?: Record<string, unknown>;
  timestamp: number;
  phase: string;
}

// String-based phases for game progression
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
const PHASE_ORDER: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Hook', predict: 'Predict', play: 'Lab', review: 'Review', twist_predict: 'Twist Predict',
  twist_play: 'Twist Lab', twist_review: 'Twist Review', transfer: 'Transfer', test: 'Test', mastery: 'Mastery'
};

// Props interface
interface ThermalContactRendererProps {
  onBack?: () => void;
  onPhaseComplete?: (phase: Phase) => void;
}

// Interface types
type InterfaceType = "air_gap" | "bare_contact" | "thermal_paste";

interface InterfaceOption {
  type: InterfaceType;
  name: string;
  conductivity: number;
  color: string;
  description: string;
}

const interfaceOptions: InterfaceOption[] = [
  {
    type: "air_gap",
    name: "Air Gap (1mm)",
    conductivity: 0.026,
    color: "#e3f2fd",
    description: "Air trapped between surfaces"
  },
  {
    type: "bare_contact",
    name: "Bare Metal Contact",
    conductivity: 2.5,
    color: "#90a4ae",
    description: "Direct contact with microscopic air pockets"
  },
  {
    type: "thermal_paste",
    name: "Thermal Paste",
    conductivity: 8.5,
    color: "#bdbdbd",
    description: "Paste fills gaps, maximizing contact"
  }
];

export default function ThermalContactRenderer({
  onBack,
  onPhaseComplete,
}: ThermalContactRendererProps) {
  // Core state
  const [phase, setPhase] = useState<Phase>('hook');
  const [showExplanation, setShowExplanation] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<Record<number, number>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [currentApp, setCurrentApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [showConfetti, setShowConfetti] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // ─────────────────────────────────────────────────────────────────────────
  // PREMIUM DESIGN SYSTEM (matches WaveParticleDuality template)
  // ─────────────────────────────────────────────────────────────────────────
  const colors = {
    primary: '#ef4444',       // red-500 (heat theme)
    primaryDark: '#dc2626',   // red-600
    accent: '#3b82f6',        // blue-500 (cold theme)
    secondary: '#f97316',     // orange-500
    success: '#10b981',       // emerald-500
    danger: '#ef4444',        // red-500
    warning: '#f59e0b',       // amber-500
    bgDark: '#020617',        // slate-950
    bgCard: '#0f172a',        // slate-900
    bgCardLight: '#1e293b',   // slate-800
    textPrimary: '#f8fafc',   // slate-50
    textSecondary: '#94a3b8', // slate-400
    textMuted: '#64748b',     // slate-500
    border: '#334155',        // slate-700
    borderLight: '#475569',   // slate-600
  };

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
    elementGap: isMobile ? '8px' : '12px'
  };

  // Game-specific state
  const [interfaceType, setInterfaceType] = useState<InterfaceType>("bare_contact");
  const [hotBlockTemp, setHotBlockTemp] = useState(80);
  const [coldBlockTemp, setColdBlockTemp] = useState(20);
  const [simRunning, setSimRunning] = useState(false);
  const [simTime, setSimTime] = useState(0);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [showMicroscopic, setShowMicroscopic] = useState(false);

  // Interactive controls
  const [initialHotTemp, setInitialHotTemp] = useState(80);
  const [initialColdTemp, setInitialColdTemp] = useState(20);
  const [blockMaterial, setBlockMaterial] = useState<'copper' | 'aluminum' | 'steel'>('copper');
  const [interfaceThickness, setInterfaceThickness] = useState(0.5); // mm
  const [showPhysicsPanel, setShowPhysicsPanel] = useState(true);
  const [tempHistory, setTempHistory] = useState<{hot: number, cold: number}[]>([]);

  // Twist state - CPU cooling comparison
  const [cpuTemp, setCpuTemp] = useState(90);
  const [coolerType, setCoolerType] = useState<"no_paste" | "with_paste">("no_paste");
  const [cpuSimRunning, setCpuSimRunning] = useState(false);

  // Sound utility
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      const sounds = {
        click: { freq: 600, duration: 0.1, type: 'sine' as OscillatorType },
        success: { freq: 800, duration: 0.2, type: 'sine' as OscillatorType },
        failure: { freq: 300, duration: 0.3, type: 'sine' as OscillatorType },
        transition: { freq: 500, duration: 0.15, type: 'sine' as OscillatorType },
        complete: { freq: 900, duration: 0.4, type: 'sine' as OscillatorType }
      };
      const sound = sounds[type];
      oscillator.frequency.value = sound.freq;
      oscillator.type = sound.type;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + sound.duration);
    } catch { /* Audio not available */ }
  }, []);

  // Emit game events (for logging/analytics)
  const emitEvent = useCallback(
    (type: string, data?: Record<string, unknown>) => {
      // Event logging placeholder - can be connected to analytics
      console.debug('Game event:', { type, data, timestamp: Date.now(), phase: phaseLabels[phase] });
    },
    [phase]
  );

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame((f) => (f + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Heat transfer simulation
  useEffect(() => {
    if (!simRunning) return;

    const currentInterface = interfaceOptions.find(o => o.type === interfaceType);
    const interfaceConductivity = currentInterface?.conductivity || 1;
    const materialK = materialConductivities[blockMaterial];

    // Effective conductivity considers both interface and material
    // Thicker interface = more resistance
    const thicknessEffect = 1 / (1 + interfaceThickness * 0.5);
    const effectiveConductivity = (interfaceConductivity * materialK / 100) * thicknessEffect;

    const interval = setInterval(() => {
      setSimTime((t) => t + 1);

      // Heat transfer rate proportional to conductivity and temp difference
      const heatRate = effectiveConductivity * 0.002;
      const tempDiff = hotBlockTemp - coldBlockTemp;

      if (tempDiff > 1) {
        const hotNew = Math.max(coldBlockTemp, hotBlockTemp - heatRate * tempDiff);
        const coldNew = Math.min(hotBlockTemp, coldBlockTemp + heatRate * tempDiff);
        setHotBlockTemp(hotNew);
        setColdBlockTemp(coldNew);

        // Record temperature history for graph
        setTempHistory(prev => [...prev.slice(-50), { hot: hotNew, cold: coldNew }]);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [simRunning, interfaceType, hotBlockTemp, coldBlockTemp, blockMaterial, interfaceThickness]);

  // CPU cooling simulation
  useEffect(() => {
    if (!cpuSimRunning) return;

    const coolingRate = coolerType === "with_paste" ? 3.0 : 0.5;

    const interval = setInterval(() => {
      setCpuTemp((t) => {
        const targetTemp = coolerType === "with_paste" ? 45 : 75;
        const diff = t - targetTemp;
        if (Math.abs(diff) < 0.5) return targetTemp;
        return t - diff * coolingRate * 0.02;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [cpuSimRunning, coolerType]);

  // Material thermal conductivities (W/m-K)
  const materialConductivities = {
    copper: 400,
    aluminum: 205,
    steel: 50
  };

  // Start simulation
  const startSim = () => {
    setHotBlockTemp(initialHotTemp);
    setColdBlockTemp(initialColdTemp);
    setSimTime(0);
    setTempHistory([{ hot: initialHotTemp, cold: initialColdTemp }]);
    setSimRunning(true);
    playSound("click");
    emitEvent("simulation_started", { interfaceType, blockMaterial, interfaceThickness });
  };

  // Reset simulation
  const resetSim = () => {
    setSimRunning(false);
    setHotBlockTemp(80);
    setColdBlockTemp(20);
    setSimTime(0);
  };

  // Navigate to phase
  const goToPhase = useCallback(
    (newPhase: Phase) => {
      if (navigationLockRef.current) return;
      const now = Date.now();
      if (now - lastClickRef.current < 200) return;
      lastClickRef.current = now;

      navigationLockRef.current = true;
      playSound("transition");
      setPhase(newPhase);
      setShowExplanation(false);
      onPhaseComplete?.(newPhase);

      setTimeout(() => {
        navigationLockRef.current = false;
      }, 400);
    },
    [playSound, onPhaseComplete]
  );

  const goToNextPhase = useCallback(() => {
    const currentIndex = PHASE_ORDER.indexOf(phase);
    if (currentIndex < PHASE_ORDER.length - 1) {
      goToPhase(PHASE_ORDER[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Test questions
  const testQuestions = [
    {
      question: "What causes thermal contact resistance?",
      options: [
        { text: "The materials repelling each other", correct: false },
        { text: "Microscopic air gaps between imperfectly smooth surfaces", correct: true },
        { text: "Magnetic fields at the interface", correct: false },
        { text: "Chemical reactions between surfaces", correct: false }
      ]
    },
    {
      question: "Why is air such a poor thermal conductor?",
      options: [
        { text: "Air is too cold", correct: false },
        { text: "Air molecules are far apart, limiting heat transfer by collision", correct: true },
        { text: "Air absorbs heat instead of conducting it", correct: false },
        { text: "Air is invisible", correct: false }
      ]
    },
    {
      question: "Thermal paste works by:",
      options: [
        { text: "Generating its own heat", correct: false },
        { text: "Cooling surfaces chemically", correct: false },
        { text: "Filling microscopic gaps to displace air", correct: true },
        { text: "Increasing the air gap", correct: false }
      ]
    },
    {
      question: "What happens if you use too much thermal paste?",
      options: [
        { text: "Better cooling", correct: false },
        { text: "No difference", correct: false },
        { text: "Excess paste can act as an insulating layer", correct: true },
        { text: "The CPU runs faster", correct: false }
      ]
    },
    {
      question: "Thermal conductivity of copper is ~400 W/m-K. Air is ~0.026 W/m-K. Copper conducts heat:",
      options: [
        { text: "About 4 times better", correct: false },
        { text: "About 150 times better", correct: false },
        { text: "About 15,000 times better", correct: true },
        { text: "About the same", correct: false }
      ]
    },
    {
      question: "When mounting a CPU cooler, you should apply thermal paste:",
      options: [
        { text: "In a thick layer covering the entire IHS", correct: false },
        { text: "A thin layer or small amount in the center", correct: true },
        { text: "Only on the cooler, never on the CPU", correct: false },
        { text: "No paste is needed with modern coolers", correct: false }
      ]
    },
    {
      question: "Why do heat sinks have flat, polished bases?",
      options: [
        { text: "For aesthetics", correct: false },
        { text: "To minimize air gaps when contacting the heat source", correct: true },
        { text: "To reflect heat radiation", correct: false },
        { text: "Flat bases are cheaper to make", correct: false }
      ]
    },
    {
      question: "Thermal pads (used for VRMs, M.2 drives) differ from paste because:",
      options: [
        { text: "Pads are better conductors", correct: false },
        { text: "Pads bridge larger gaps and are easier to apply", correct: true },
        { text: "Pads don't need contact pressure", correct: false },
        { text: "Pads are cheaper", correct: false }
      ]
    },
    {
      question: "In the formula Q = kA(T1-T2)/d, what does 'd' represent?",
      options: [
        { text: "Density", correct: false },
        { text: "Diameter", correct: false },
        { text: "Thickness/distance through which heat flows", correct: true },
        { text: "Duration", correct: false }
      ]
    },
    {
      question: "A laptop throttles (slows down) when hot. Better thermal paste could help by:",
      options: [
        { text: "Making the CPU generate less heat", correct: false },
        { text: "Reducing thermal resistance to the cooler, lowering CPU temperature", correct: true },
        { text: "Making the fan spin faster", correct: false },
        { text: "Cooling the battery", correct: false }
      ]
    }
  ];

  // Real-world applications
  const applications = [
    {
      title: "Computer CPU Cooling",
      description:
        "CPUs generate 65-300W in a tiny area. Thermal paste between the CPU and heatsink is critical. Poor contact can mean 20-30C higher temps, causing throttling or damage. Premium pastes use silver or diamond particles.",
      icon: "cpu"
    },
    {
      title: "LED Lighting",
      description:
        "High-power LEDs convert 30-50% of energy to heat. Thermal interface materials bond LED chips to heat sinks. Without proper thermal management, LEDs dim rapidly and fail early. Star boards use thermal adhesive.",
      icon: "led"
    },
    {
      title: "Electric Vehicle Batteries",
      description:
        "EV battery packs use thermal pads between cells and cooling plates. Uniform thermal contact ensures even cell temperatures, maximizing range, charging speed, and battery lifespan. Gap fillers accommodate manufacturing tolerances.",
      icon: "battery"
    },
    {
      title: "Spacecraft Electronics",
      description:
        "In space, there's no air for convection. Electronics rely entirely on conduction to radiators. Thermal interface materials and bolted joints must be perfect - there's no repair possible once launched.",
      icon: "satellite"
    }
  ];

  // Calculate score
  const handleTestSubmit = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (q.options[testAnswers[i]]?.correct) score++;
    });
    setTestScore(score);
    setTestSubmitted(true);
    emitEvent("test_submitted", { score, total: testQuestions.length });

    if (score >= 7) {
      playSound("complete");
    } else {
      playSound("failure");
    }
  };

  // Get temperature color
  const getTempColor = (temp: number): string => {
    if (temp < 30) return "#3b82f6";
    if (temp < 45) return "#22c55e";
    if (temp < 60) return "#eab308";
    if (temp < 75) return "#f97316";
    return "#ef4444";
  };

  // Render heat transfer visualization with premium SVG graphics
  const renderHeatTransfer = () => {
    const currentInterface = interfaceOptions.find(o => o.type === interfaceType);

    return (
      <div className="flex flex-col items-center">
        <svg viewBox="0 0 400 320" className="w-full max-w-md mx-auto">
          {/* Premium SVG Definitions */}
          <defs>
            {/* Hot block gradient - warm reds/oranges with 5 color stops */}
            <linearGradient id="thermHotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="25%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="75%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            {/* Cold block gradient - cool blues with 5 color stops */}
            <linearGradient id="thermColdGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="25%" stopColor="#7dd3fc" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="75%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>

            {/* Heat transfer/flow gradient - orange to red */}
            <linearGradient id="thermTransferGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="25%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="75%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>

            {/* Interface gradients */}
            <linearGradient id="thermAirGapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" />
              <stop offset="50%" stopColor="#bfdbfe" />
              <stop offset="100%" stopColor="#93c5fd" />
            </linearGradient>

            <linearGradient id="thermBareContactGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#cbd5e1" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>

            <linearGradient id="thermPasteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e5e7eb" />
              <stop offset="50%" stopColor="#9ca3af" />
              <stop offset="100%" stopColor="#6b7280" />
            </linearGradient>

            {/* Premium background gradient */}
            <linearGradient id="thermBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Hot glow filter */}
            <filter id="thermHotGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Cold glow filter */}
            <filter id="thermColdGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Heat particle glow */}
            <filter id="thermParticleGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Radial heat glow for hot block */}
            <radialGradient id="thermHotRadial" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#f97316" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>

            {/* Radial cool glow for cold block */}
            <radialGradient id="thermColdRadial" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Premium dark lab background */}
          <rect width="400" height="320" fill="url(#thermBgGrad)" />

          {/* Hot block (left) with premium gradient */}
          <g transform="translate(50, 80)">
            {/* Hot glow effect behind block */}
            <ellipse cx="60" cy="75" rx="80" ry="90" fill="url(#thermHotRadial)" />

            <rect
              width="120"
              height="150"
              fill="url(#thermHotGrad)"
              stroke="#fbbf24"
              strokeWidth={2}
              rx={8}
              filter="url(#thermHotGlow)"
            />

            {/* Inner highlight */}
            <rect
              x="5"
              y="5"
              width="110"
              height="140"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={1}
              rx={6}
            />

            {/* Heat energy visualization - animated particles */}
            {simRunning && hotBlockTemp > coldBlockTemp + 5 && (
              <g filter="url(#thermParticleGlow)">
                {[0, 1, 2, 3, 4].map((i) => (
                  <circle
                    key={i}
                    cx={90 + (animationFrame / 5 + i * 20) % 100}
                    cy={30 + i * 25}
                    r={5}
                    fill="url(#thermTransferGrad)"
                    opacity={0.8}
                  />
                ))}
              </g>
            )}
          </g>

          {/* Interface gap with gradient */}
          <g transform="translate(170, 80)">
            <rect
              width="60"
              height="150"
              fill={
                interfaceType === "air_gap" ? "url(#thermAirGapGrad)" :
                interfaceType === "bare_contact" ? "url(#thermBareContactGrad)" :
                "url(#thermPasteGrad)"
              }
              stroke="#475569"
              strokeWidth={2}
              rx={2}
            />

            {/* Show microscopic detail if enabled */}
            {showMicroscopic && interfaceType !== "thermal_paste" && (
              <g>
                {/* Rough surface representation */}
                {[...Array(10)].map((_, i) => (
                  <g key={i}>
                    {/* Left surface bumps */}
                    <rect
                      x={0}
                      y={15 + i * 14}
                      width={5 + Math.random() * 10}
                      height={10}
                      fill="#64748b"
                      rx={1}
                    />
                    {/* Right surface bumps */}
                    <rect
                      x={45 - Math.random() * 10}
                      y={15 + i * 14}
                      width={5 + Math.random() * 10}
                      height={10}
                      fill="#64748b"
                      rx={1}
                    />
                    {/* Air pocket */}
                    {interfaceType === "air_gap" && (
                      <circle
                        cx={30}
                        cy={20 + i * 14}
                        r={4}
                        fill="rgba(96,165,250,0.4)"
                        stroke="rgba(96,165,250,0.6)"
                        strokeWidth={0.5}
                      />
                    )}
                  </g>
                ))}
              </g>
            )}

            {/* Thermal paste fills gaps - premium look */}
            {interfaceType === "thermal_paste" && (
              <rect x={5} y={5} width={50} height={140} fill="url(#thermPasteGrad)" rx={3} />
            )}
          </g>

          {/* Cold block (right) with premium gradient */}
          <g transform="translate(230, 80)">
            {/* Cold glow effect behind block */}
            <ellipse cx="60" cy="75" rx="80" ry="90" fill="url(#thermColdRadial)" />

            <rect
              width="120"
              height="150"
              fill="url(#thermColdGrad)"
              stroke="#38bdf8"
              strokeWidth={2}
              rx={8}
              filter="url(#thermColdGlow)"
            />

            {/* Inner highlight */}
            <rect
              x="5"
              y="5"
              width="110"
              height="140"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={1}
              rx={6}
            />
          </g>

          {/* Heat flow arrows with gradient */}
          {simRunning && hotBlockTemp > coldBlockTemp + 2 && (
            <g transform="translate(200, 155)" filter="url(#thermParticleGlow)">
              {[0, 1, 2].map((i) => {
                const offset = (animationFrame / 3 + i * 15) % 50;
                const conductivity = currentInterface?.conductivity || 1;
                const opacity = Math.min(1, conductivity / 5);
                return (
                  <polygon
                    key={i}
                    points={`${-15 + offset},0 ${-5 + offset},-8 ${-5 + offset},-3 ${10 + offset},-3 ${10 + offset},-8 ${20 + offset},0 ${10 + offset},8 ${10 + offset},3 ${-5 + offset},3 ${-5 + offset},8`}
                    fill="url(#thermTransferGrad)"
                    opacity={opacity * (1 - offset / 50)}
                  />
                );
              })}
            </g>
          )}

          {/* Temperature display boxes */}
          <g transform="translate(110, 145)">
            <rect x="-35" y="-18" width="70" height="36" rx="6" fill="rgba(0,0,0,0.5)" stroke="#fbbf24" strokeWidth="1" />
            <text x="0" y="6" textAnchor="middle" fill="#fef3c7" fontSize="18" fontWeight="bold">
              {hotBlockTemp.toFixed(1)}°
            </text>
          </g>
          <g transform="translate(290, 145)">
            <rect x="-35" y="-18" width="70" height="36" rx="6" fill="rgba(0,0,0,0.5)" stroke="#38bdf8" strokeWidth="1" />
            <text x="0" y="6" textAnchor="middle" fill="#e0f2fe" fontSize="18" fontWeight="bold">
              {coldBlockTemp.toFixed(1)}°
            </text>
          </g>
        </svg>

        {/* Labels outside SVG using typo system for responsive typography */}
        <div className="w-full max-w-md mx-auto mt-2 px-2">
          <div className="flex justify-between items-center mb-2">
            <span style={{ fontSize: typo.small, color: colors.primary }} className="font-semibold">
              HOT BLOCK
            </span>
            <span style={{ fontSize: typo.label, color: colors.textSecondary }}>
              {currentInterface?.name}
            </span>
            <span style={{ fontSize: typo.small, color: colors.accent }} className="font-semibold">
              COLD BLOCK
            </span>
          </div>
          <div className="text-center space-y-1">
            <p style={{ fontSize: typo.small, color: colors.textSecondary }}>
              Temperature Difference: <span style={{ color: colors.textPrimary, fontWeight: 600 }}>{(hotBlockTemp - coldBlockTemp).toFixed(1)}°C</span>
            </p>
            <p style={{ fontSize: typo.label, color: colors.textMuted }}>
              Time: {(simTime / 10).toFixed(1)}s | Heat Flow: {((hotBlockTemp - coldBlockTemp) * (currentInterface?.conductivity || 1) * 0.1).toFixed(1)} W | k = {currentInterface?.conductivity} W/m-K
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Render CPU cooling visualization with premium SVG graphics
  const renderCPUCooling = () => {
    return (
      <div className="flex flex-col items-center">
        <svg viewBox="0 0 400 270" className="w-full max-w-md mx-auto">
          {/* Premium SVG Definitions for CPU Cooling */}
          <defs>
            {/* CPU gradient based on temperature */}
            <linearGradient id="thermCpuHotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="25%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="75%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            <linearGradient id="thermCpuCoolGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d9f99d" />
              <stop offset="50%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>

            {/* Motherboard gradient - premium PCB look */}
            <linearGradient id="thermPcbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#166534" />
              <stop offset="50%" stopColor="#15803d" />
              <stop offset="100%" stopColor="#14532d" />
            </linearGradient>

            {/* Heat sink metal gradient */}
            <linearGradient id="thermHeatsinkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="30%" stopColor="#64748b" />
              <stop offset="70%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Heat sink fin gradient */}
            <linearGradient id="thermFinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#cbd5e1" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>

            {/* Thermal paste gradient */}
            <linearGradient id="thermPasteInterfaceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d1d5db" />
              <stop offset="50%" stopColor="#9ca3af" />
              <stop offset="100%" stopColor="#d1d5db" />
            </linearGradient>

            {/* Air gap gradient */}
            <linearGradient id="thermAirInterfaceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#dbeafe" />
              <stop offset="50%" stopColor="#bfdbfe" />
              <stop offset="100%" stopColor="#dbeafe" />
            </linearGradient>

            {/* Heat flow particle gradient */}
            <radialGradient id="thermHeatParticle" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.5" />
            </radialGradient>

            {/* CPU glow filter */}
            <filter id="thermCpuGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Heat particle glow */}
            <filter id="thermHeatFlowGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Temperature bar gradient */}
            <linearGradient id="thermTempBarGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="40%" stopColor="#eab308" />
              <stop offset="70%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Background gradient */}
            <linearGradient id="thermCpuBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>

          {/* Premium background */}
          <rect width="400" height="270" fill="url(#thermCpuBgGrad)" />

          {/* Motherboard with premium PCB look */}
          <g transform="translate(50, 180)">
            <rect width="300" height="70" fill="url(#thermPcbGrad)" stroke="#22c55e" strokeWidth={1} rx={4} />
            {/* PCB traces */}
            {[...Array(6)].map((_, i) => (
              <line
                key={i}
                x1={20 + i * 50}
                y1="10"
                x2={20 + i * 50}
                y2="60"
                stroke="#4ade80"
                strokeWidth="1"
                opacity="0.3"
              />
            ))}
          </g>

          {/* CPU with dynamic gradient based on temperature */}
          <g transform="translate(150, 140)">
            <rect
              width="100"
              height="40"
              fill={cpuTemp > 60 ? "url(#thermCpuHotGrad)" : "url(#thermCpuCoolGrad)"}
              stroke={cpuTemp > 80 ? "#ef4444" : cpuTemp > 60 ? "#f97316" : "#22c55e"}
              strokeWidth={2}
              rx={4}
              filter="url(#thermCpuGlow)"
            />
            {/* CPU die highlight */}
            <rect x="35" y="10" width="30" height="20" fill="rgba(255,255,255,0.1)" rx={2} />
          </g>

          {/* Thermal interface */}
          <g transform="translate(155, 135)">
            <rect
              width="90"
              height="5"
              fill={coolerType === "with_paste" ? "url(#thermPasteInterfaceGrad)" : "url(#thermAirInterfaceGrad)"}
              stroke={coolerType === "with_paste" ? "#9ca3af" : "#60a5fa"}
              strokeWidth={0.5}
              rx={1}
            />
          </g>

          {/* Heat sink base */}
          <g transform="translate(140, 55)">
            <rect width="120" height="80" fill="url(#thermHeatsinkGrad)" stroke="#64748b" strokeWidth={1} rx={4} />
          </g>

          {/* Heat sink fins with premium gradient */}
          {[...Array(8)].map((_, i) => (
            <rect
              key={i}
              x={145 + i * 14}
              y="15"
              width="10"
              height="40"
              fill="url(#thermFinGrad)"
              stroke="#475569"
              strokeWidth={0.5}
              rx={2}
            />
          ))}

          {/* Heat flow visualization */}
          {cpuSimRunning && (
            <g filter="url(#thermHeatFlowGlow)">
              {[0, 1, 2].map((i) => {
                const y = 130 - (animationFrame / 2 + i * 20) % 80;
                const baseOpacity = coolerType === "with_paste" ? 0.9 : 0.35;
                const opacity = baseOpacity * (1 - (130 - y) / 80);
                return (
                  <circle
                    key={i}
                    cx={170 + i * 30}
                    cy={y}
                    r={6}
                    fill="url(#thermHeatParticle)"
                    opacity={opacity}
                  />
                );
              })}
            </g>
          )}

          {/* Temperature indicator bar */}
          <g transform="translate(330, 60)">
            <rect x={0} y={0} width={40} height={130} fill="#0f172a" stroke="#334155" strokeWidth={1} rx={6} />
            {/* Temperature fill */}
            <rect
              x={5}
              y={125 - Math.min(120, (cpuTemp - 30) * 2)}
              width={30}
              height={Math.min(120, (cpuTemp - 30) * 2)}
              fill="url(#thermTempBarGrad)"
              rx={4}
            />
            {/* Temperature markers */}
            <line x1="2" y1="5" x2="8" y2="5" stroke="#64748b" strokeWidth="1" />
            <line x1="2" y1="65" x2="8" y2="65" stroke="#64748b" strokeWidth="1" />
            <line x1="2" y1="125" x2="8" y2="125" stroke="#64748b" strokeWidth="1" />
          </g>
        </svg>

        {/* Labels outside SVG using typo system */}
        <div className="w-full max-w-md mx-auto mt-2 px-2">
          <div className="flex justify-between items-center mb-2">
            <span style={{
              fontSize: typo.body,
              color: coolerType === "with_paste" ? colors.success : colors.danger,
              fontWeight: 600
            }}>
              {coolerType === "with_paste" ? "WITH Thermal Paste" : "WITHOUT Thermal Paste"}
            </span>
            <span style={{
              fontSize: typo.heading,
              color: cpuTemp > 80 ? colors.danger : cpuTemp > 60 ? colors.warning : colors.success,
              fontWeight: 700
            }}>
              {cpuTemp.toFixed(0)}°C
            </span>
          </div>
          {coolerType === "no_paste" && (
            <p style={{ fontSize: typo.small, color: colors.danger }} className="text-center mb-1 font-semibold animate-pulse">
              AIR GAPS BLOCKING HEAT TRANSFER!
            </p>
          )}
          <p style={{
            fontSize: typo.body,
            color: cpuTemp > 80 ? colors.danger : cpuTemp > 60 ? colors.warning : colors.success,
            textAlign: 'center',
            fontWeight: 500
          }}>
            {cpuTemp > 80 ? "THROTTLING! Too Hot!" : cpuTemp > 60 ? "Warm - Reduced Performance" : "Cool - Full Performance"}
          </p>
        </div>
      </div>
    );
  };

  // Render hook phase
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-red-400 tracking-wide">HEAT TRANSFER PHYSICS</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-red-100 to-blue-200 bg-clip-text text-transparent">
        The Hidden Heat Barrier
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover why microscopic gaps can block the flow of thermal energy
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-blue-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-6">
            <span className="inline-block">&#128293;</span>
            <span className="mx-2">&#8596;&#65039;</span>
            <span className="inline-block">&#10052;&#65039;</span>
          </div>

          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              You press two metal blocks together - one hot, one cold. Heat should
              flow freely between them, right?
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              But something invisible is blocking the way. Even "smooth" surfaces have a secret that
              makes heat transfer surprisingly difficult.
            </p>
            <div className="pt-2">
              <p className="text-base text-red-400 font-semibold">
                Why does your computer need thermal paste?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToNextPhase(); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-red-500 to-orange-500 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-red-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Discover Thermal Contact
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-red-400">&#10022;</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-red-400">&#10022;</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-red-400">&#10022;</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  // Render predict phase
  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          Two polished metal blocks (hot and cold) are pressed firmly together.
          Under a microscope, the "smooth" surfaces are actually rough, with
          tiny peaks and valleys. Only the peaks actually touch.
        </p>
        <p className="text-lg text-red-400 font-medium">
          What fills the tiny gaps between the surfaces?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: "nothing", text: "Nothing - it's a vacuum" },
          { id: "air", text: "Air - a poor thermal conductor" },
          { id: "metal", text: "Metal flows to fill the gaps" },
          { id: "heat", text: "Heat itself fills the gaps" }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={() => {
              setPrediction(option.id);
              playSound("click");
              emitEvent("prediction_made", { prediction: option.id });
            }}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              prediction === option.id
                ? option.id === "air" ? "bg-emerald-600/40 border-2 border-emerald-400" : "bg-red-600/40 border-2 border-red-400"
                : "bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent"
            }`}
          >
            <span className="text-slate-200">{option.text}</span>
          </button>
        ))}
      </div>

      {prediction && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className={`font-semibold ${prediction === "air" ? "text-emerald-400" : "text-red-400"}`}>
            {prediction === "air"
              ? "Correct! The gaps are filled with air, which is a terrible thermal conductor!"
              : "Not quite - the gaps are actually filled with air, a poor thermal conductor."}
          </p>
          <button
            onMouseDown={() => goToNextPhase()}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl"
          >
            Test Your Prediction
          </button>
        </div>
      )}
    </div>
  );

  // Render play phase
  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Thermal Contact Experiment</h2>
      <p className="text-slate-400 mb-6 text-center max-w-md">
        Adjust parameters and compare heat transfer through different interfaces!
      </p>

      {/* Interactive Controls Panel */}
      <div className="bg-slate-800/50 rounded-xl p-4 mb-4 w-full max-w-md border border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-white text-sm">⚙️ Experiment Controls</h4>
          <button
            onClick={() => setShowPhysicsPanel(!showPhysicsPanel)}
            className="text-slate-400 hover:text-white text-xs"
            style={{ zIndex: 10 }}
          >
            {showPhysicsPanel ? 'Hide' : 'Show'}
          </button>
        </div>

        {showPhysicsPanel && (
          <div className="space-y-4">
            {/* Hot Block Temperature */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">Hot Block Initial Temp</span>
                <span className="text-red-400 font-mono">{initialHotTemp}°C</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                value={initialHotTemp}
                onChange={(e) => setInitialHotTemp(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                disabled={simRunning}
              />
            </div>

            {/* Cold Block Temperature */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">Cold Block Initial Temp</span>
                <span className="text-blue-400 font-mono">{initialColdTemp}°C</span>
              </div>
              <input
                type="range"
                min="-10"
                max="40"
                value={initialColdTemp}
                onChange={(e) => setInitialColdTemp(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                disabled={simRunning}
              />
            </div>

            {/* Block Material Selector */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">Block Material</span>
                <span className="text-amber-400 font-mono">{materialConductivities[blockMaterial]} W/m-K</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['copper', 'aluminum', 'steel'] as const).map(mat => (
                  <button
                    key={mat}
                    onClick={() => setBlockMaterial(mat)}
                    disabled={simRunning}
                    className={`p-2 rounded-lg text-xs font-medium capitalize transition-all ${
                      blockMaterial === mat
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                    style={{ zIndex: 10 }}
                  >
                    {mat}
                  </button>
                ))}
              </div>
            </div>

            {/* Interface Thickness */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">Interface Thickness</span>
                <span className="text-purple-400 font-mono">{interfaceThickness.toFixed(1)} mm</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={interfaceThickness}
                onChange={(e) => setInterfaceThickness(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                disabled={simRunning}
              />
            </div>

            {/* Temperature Graph */}
            {tempHistory.length > 1 && (
              <div className="pt-2 border-t border-slate-700">
                <div className="text-xs text-slate-400 mb-1">Temperature History</div>
                <svg viewBox="0 0 200 60" className="w-full h-16 bg-slate-900/50 rounded">
                  {/* Grid lines */}
                  <line x1="0" y1="30" x2="200" y2="30" stroke="#374151" strokeWidth="0.5" strokeDasharray="2,2" />

                  {/* Hot temp line */}
                  <polyline
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    points={tempHistory.map((t, i) => `${i * (200 / Math.max(tempHistory.length - 1, 1))},${60 - (t.hot - initialColdTemp) / (initialHotTemp - initialColdTemp + 1) * 60}`).join(' ')}
                  />

                  {/* Cold temp line */}
                  <polyline
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    points={tempHistory.map((t, i) => `${i * (200 / Math.max(tempHistory.length - 1, 1))},${60 - (t.cold - initialColdTemp) / (initialHotTemp - initialColdTemp + 1) * 60}`).join(' ')}
                  />
                </svg>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 mb-6">
        {renderHeatTransfer()}

        <div className="flex gap-2 mt-4">
          {!simRunning ? (
            <button
              onClick={startSim}
              className="flex-1 py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-500"
              style={{ zIndex: 10 }}
            >
              🔥 Start Heat Transfer
            </button>
          ) : (
            <button
              onClick={resetSim}
              className="flex-1 py-3 bg-slate-600 text-white rounded-lg font-bold hover:bg-slate-500"
              style={{ zIndex: 10 }}
            >
              Reset
            </button>
          )}
          <button
            onClick={() => setShowMicroscopic(!showMicroscopic)}
            className={`px-4 py-3 rounded-lg font-medium ${
              showMicroscopic
                ? "bg-purple-600 text-white"
                : "bg-slate-700 text-slate-300"
            }`}
            style={{ zIndex: 10 }}
          >
            🔬
          </button>
        </div>
      </div>

      {/* Interface selector */}
      <div className="bg-slate-800/50 rounded-xl p-4 mb-6 w-full max-w-md">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Interface Type:
        </label>
        <div className="grid grid-cols-3 gap-2">
          {interfaceOptions.map((opt) => (
            <button
              key={opt.type}
              onClick={() => {
                setInterfaceType(opt.type);
                resetSim();
              }}
              className={`p-2 rounded-lg text-sm transition-all ${
                interfaceType === opt.type
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
              style={{ zIndex: 10 }}
            >
              {opt.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {interfaceOptions.find(o => o.type === interfaceType)?.description}
        </p>
      </div>

      {/* Thermal conductivity comparison */}
      <div className="bg-blue-900/30 p-4 rounded-xl border border-blue-600/30 mb-6 w-full max-w-md">
        <h3 className="font-bold text-blue-400 mb-2">Thermal Conductivity (W/m-K)</h3>
        <div className="space-y-2">
          {[
            { name: "Air", k: 0.026, width: 1 },
            { name: "Bare Contact", k: 2.5, width: 10 },
            { name: "Thermal Paste", k: 8.5, width: 35 },
            { name: "Copper", k: 400, width: 100 },
          ].map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <span className="w-24 text-sm text-slate-300">{item.name}</span>
              <div className="flex-1 bg-slate-700 rounded-full h-4">
                <div
                  className="bg-blue-500 h-4 rounded-full"
                  style={{ width: `${item.width}%` }}
                />
              </div>
              <span className="text-xs w-12 text-slate-400">{item.k}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onMouseDown={() => goToNextPhase()}
        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl"
      >
        Learn the Science
      </button>
    </div>
  );

  // Render review phase
  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Thermal Contact Resistance</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-red-900/40 to-orange-900/40 rounded-2xl p-6 border border-red-600/30">
          <h3 className="text-xl font-bold text-red-400 mb-3">&#128300; The Microscopic Problem</h3>
          <p className="text-slate-300 text-sm mb-2">
            Even "smooth" surfaces are rough at the microscale. When pressed together:
          </p>
          <ul className="text-sm space-y-1 text-slate-300">
            <li>Only ~1-2% of the area actually touches</li>
            <li>The rest is filled with AIR (k = 0.026 W/m-K)</li>
            <li>Air is ~15,000x worse at conducting heat than copper!</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 rounded-2xl p-6 border border-blue-600/30">
          <h3 className="text-xl font-bold text-blue-400 mb-3">&#129521; The Solution</h3>
          <p className="text-slate-300 text-sm mb-2">
            Thermal paste/grease fills the air gaps:
          </p>
          <ul className="text-sm space-y-1 text-slate-300">
            <li>Displaces air (bad conductor) with paste (better)</li>
            <li>Even though paste isn't as good as metal, it's 300x better than air</li>
            <li>Reduces thermal resistance by 50-80%</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 rounded-2xl p-6 border border-emerald-600/30 md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">&#128208; Fourier's Law</h3>
          <div className="font-mono text-center text-lg text-emerald-400 mb-2">
            Q = k x A x (T1 - T2) / d
          </div>
          <p className="text-slate-300 text-sm">
            Heat flow (Q) depends on conductivity (k), area (A), temperature
            difference, and thickness (d). Better interface = higher effective k.
          </p>
        </div>
      </div>

      {prediction === "air" && (
        <div className="mt-6 p-4 bg-emerald-900/30 rounded-xl border border-emerald-600 max-w-xl">
          <p className="text-emerald-400 font-semibold">
            Correct! The gaps are filled with air, which is a terrible thermal conductor. That's why we use thermal paste!
          </p>
        </div>
      )}

      <button
        onMouseDown={() => goToNextPhase()}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
      >
        Ready for a Twist?
      </button>
    </div>
  );

  // Render twist predict phase
  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">&#128187; The CPU Twist</h2>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A CPU generates 100W of heat in an area smaller than your thumbnail.
          A heat sink is mounted on top. What happens if you forget the thermal paste?
        </p>
        <p className="text-lg text-amber-400 font-medium">
          Without thermal paste, the CPU temperature will be:
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: "same", text: "About the same - metal-to-metal contact is fine" },
          { id: "higher", text: "Much higher - air gaps act as insulation" },
          { id: "lower", text: "Actually lower - paste slows heat transfer" },
          { id: "varies", text: "It depends on the weather" }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={() => {
              setTwistPrediction(option.id);
              playSound("click");
              emitEvent("twist_prediction_made", { prediction: option.id });
            }}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              twistPrediction === option.id
                ? option.id === "higher" ? "bg-emerald-600/40 border-2 border-emerald-400" : "bg-purple-600/40 border-2 border-purple-400"
                : "bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent"
            }`}
          >
            <span className="text-slate-200">{option.text}</span>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className={`font-semibold ${twistPrediction === "higher" ? "text-emerald-400" : "text-amber-400"}`}>
            {twistPrediction === "higher"
              ? "Correct! Without thermal paste, air gaps act as insulation, causing 20-30C higher temperatures!"
              : "Not quite - air gaps act as insulation, causing much higher temperatures!"}
          </p>
          <button
            onMouseDown={() => goToNextPhase()}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
          >
            Test CPU Cooling
          </button>
        </div>
      )}
    </div>
  );

  // Render twist play phase
  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">CPU Thermal Paste Test</h2>
      <p className="text-slate-400 mb-6">Compare CPU cooling with and without thermal paste!</p>

      {/* Cooler type selector */}
      <div className="flex gap-2 mb-6">
        <button
          onMouseDown={() => {
            setCoolerType("no_paste");
            setCpuTemp(90);
            setCpuSimRunning(false);
          }}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            coolerType === "no_paste"
              ? "bg-red-600 text-white"
              : "bg-slate-700 text-slate-300"
          }`}
        >
          No Paste
        </button>
        <button
          onMouseDown={() => {
            setCoolerType("with_paste");
            setCpuTemp(90);
            setCpuSimRunning(false);
          }}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            coolerType === "with_paste"
              ? "bg-emerald-600 text-white"
              : "bg-slate-700 text-slate-300"
          }`}
        >
          With Paste
        </button>
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 mb-6">
        {renderCPUCooling()}

        <button
          onMouseDown={() => {
            setCpuTemp(90);
            setCpuSimRunning(true);
          }}
          disabled={cpuSimRunning}
          className={`w-full mt-4 py-3 rounded-lg font-bold ${
            cpuSimRunning
              ? "bg-slate-600 text-slate-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-500"
          }`}
        >
          {cpuSimRunning ? "Cooling..." : "Start CPU Load"}
        </button>
      </div>

      {/* Comparison results */}
      <div className="grid grid-cols-2 gap-4 max-w-xl mb-6">
        <div className="bg-red-900/30 p-4 rounded-xl border border-red-600/30">
          <h4 className="font-bold text-red-400 text-sm mb-2">Without Paste</h4>
          <p className="text-lg font-bold text-red-400">~75-85C</p>
          <p className="text-xs text-slate-400">Throttling likely</p>
        </div>
        <div className="bg-emerald-900/30 p-4 rounded-xl border border-emerald-600/30">
          <h4 className="font-bold text-emerald-400 text-sm mb-2">With Paste</h4>
          <p className="text-lg font-bold text-emerald-400">~45-55C</p>
          <p className="text-xs text-slate-400">Full performance</p>
        </div>
      </div>

      <div className="bg-purple-900/30 p-4 rounded-xl border border-purple-600/30 mb-6 max-w-xl">
        <p className="text-purple-300 text-sm">
          &#128161; Proper thermal paste application can reduce temperatures by 20-30C!
        </p>
      </div>

      <button
        onMouseDown={() => goToNextPhase()}
        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
      >
        See Explanation
      </button>
    </div>
  );

  // Render twist review phase
  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Why Thermal Paste is Critical</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-red-900/40 to-orange-900/40 rounded-2xl p-6 border border-red-600/30">
          <h3 className="text-xl font-bold text-red-400 mb-3">&#10060; Without Thermal Paste</h3>
          <ul className="text-slate-300 text-sm space-y-1">
            <li>Air gaps trap heat on the CPU surface</li>
            <li>Only peak-to-peak contact (1-2% of area)</li>
            <li>CPU reaches 75-85C or higher</li>
            <li>Throttling reduces performance by 20-50%</li>
            <li>Risk of thermal shutdown or damage</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 rounded-2xl p-6 border border-emerald-600/30">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">&#10003; With Thermal Paste</h3>
          <ul className="text-slate-300 text-sm space-y-1">
            <li>Paste fills all microscopic gaps</li>
            <li>Effective 100% thermal contact</li>
            <li>CPU stays at 45-55C under load</li>
            <li>Full boost clocks maintained</li>
            <li>Longer CPU lifespan</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 rounded-2xl p-6 border border-blue-600/30 md:col-span-2">
          <h3 className="text-xl font-bold text-blue-400 mb-3">&#127919; Application Tips</h3>
          <ul className="text-slate-300 text-sm space-y-1">
            <li>Pea-sized dot in center, or thin X pattern</li>
            <li>Mounting pressure spreads it evenly</li>
            <li>Too much = thick insulating layer (bad)</li>
            <li>Too little = air gaps remain (bad)</li>
            <li>Replace every 3-5 years (paste dries out)</li>
          </ul>
        </div>
      </div>

      {twistPrediction === "higher" && (
        <div className="mt-6 p-4 bg-emerald-900/30 rounded-xl border border-emerald-600 max-w-xl">
          <p className="text-emerald-400 font-semibold">
            Correct! Without thermal paste, air gaps act as insulation,
            causing 20-30C higher temperatures and performance throttling.
          </p>
        </div>
      )}

      <button
        onMouseDown={() => goToNextPhase()}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-teal-600 to-blue-600 text-white font-semibold rounded-xl"
      >
        See Real-World Applications
      </button>
    </div>
  );

  // Render transfer phase
  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Thermal Contact in the Real World</h2>

      <div className="space-y-4 max-w-2xl w-full">
        {applications.map((app, index) => (
          <div
            key={index}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              completedApps.has(index)
                ? "bg-emerald-900/30 border-emerald-600"
                : currentApp === index
                ? "bg-blue-900/30 border-blue-600"
                : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
            }`}
            onMouseDown={() => {
              if (!completedApps.has(index)) {
                setCurrentApp(index);
                playSound("click");
              }
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">
                {app.icon === "cpu" && "&#128187;"}
                {app.icon === "led" && "&#128161;"}
                {app.icon === "battery" && "&#128267;"}
                {app.icon === "satellite" && "&#128752;"}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white">{app.title}</h3>
                  {completedApps.has(index) && (
                    <span className="text-emerald-400">&#10003;</span>
                  )}
                </div>
                {(currentApp === index || completedApps.has(index)) && (
                  <p className="text-slate-300 text-sm mt-2">{app.description}</p>
                )}
              </div>
            </div>

            {currentApp === index && !completedApps.has(index) && (
              <button
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const newCompleted = new Set(completedApps);
                  newCompleted.add(index);
                  setCompletedApps(newCompleted);
                  playSound("success");

                  if (newCompleted.size < applications.length) {
                    const nextIncomplete = applications.findIndex(
                      (_, i) => !newCompleted.has(i)
                    );
                    setCurrentApp(nextIncomplete);
                  }
                }}
                className="mt-3 w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500"
              >
                Got It!
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">
          {applications.map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`} />
          ))}
        </div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>

      {completedApps.size === applications.length && (
        <button
          onMouseDown={() => goToNextPhase()}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
        >
          Take the Quiz
        </button>
      )}
    </div>
  );

  // Render test phase
  const renderTest = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Test Your Knowledge</h2>

      {!testSubmitted ? (
        <div className="space-y-6 max-w-2xl w-full">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
              <p className="font-medium text-white mb-3">
                {qIndex + 1}. {q.question}
              </p>
              <div className="grid gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onMouseDown={() => {
                      setTestAnswers((prev) => ({ ...prev, [qIndex]: oIndex }));
                      playSound("click");
                    }}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50"
                    }`}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(testAnswers).length === testQuestions.length && (
            <button
              onMouseDown={handleTestSubmit}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold text-lg"
            >
              Submit Answers
            </button>
          )}
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center">
          <div className="text-6xl mb-4">{testScore >= 7 ? "&#127881;" : "&#128218;"}</div>
          <h3 className="text-2xl font-bold text-white mb-2">
            {testScore} / {testQuestions.length}
          </h3>
          <p className="text-slate-300 mb-6">
            {testScore >= 7
              ? "Excellent! You understand thermal contact!"
              : "Review the concepts and try again!"}
          </p>

          {testScore >= 7 ? (
            <button
              onMouseDown={() => goToNextPhase()}
              className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold rounded-xl"
            >
              Claim Your Mastery!
            </button>
          ) : (
            <button
              onMouseDown={() => {
                setTestSubmitted(false);
                setTestAnswers({});
                goToPhase('review');
              }}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
            >
              Review and Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  // Render mastery phase
  const renderMastery = () => {
    if (!showConfetti) {
      setShowConfetti(true);
      playSound("complete");
      emitEvent("mastery_achieved", {});
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center relative">
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random()}s`,
                  fontSize: `${12 + Math.random() * 12}px`,
                }}
              >
                {["&#128187;", "&#128293;", "&#10052;&#65039;", "&#11088;", "&#10024;"][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </div>
        )}

        <div className="relative bg-gradient-to-br from-red-900/50 via-orange-900/50 to-blue-900/50 rounded-3xl p-8 max-w-2xl border border-orange-600/30">
          <div className="text-8xl mb-6">&#127942;</div>
          <h1 className="text-3xl font-bold text-white mb-4">Thermal Contact Master!</h1>

          <p className="text-xl text-slate-300 mb-6">You've mastered thermal contact resistance and heat transfer!</p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl mb-2">&#128300;</div>
              <p className="text-sm text-slate-300">Microscopic Gaps</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl mb-2">&#129521;</div>
              <p className="text-sm text-slate-300">Thermal Paste</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl mb-2">&#128187;</div>
              <p className="text-sm text-slate-300">CPU Cooling</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl mb-2">&#128208;</div>
              <p className="text-sm text-slate-300">Fourier's Law</p>
            </div>
          </div>

          <div className="p-4 bg-blue-900/30 rounded-xl border border-blue-600/30 mb-6">
            <p className="text-blue-300">
              &#128187; Next time you build a PC, you'll know exactly why that tiny
              tube of thermal paste is so important!
            </p>
          </div>

          {onBack && (
            <button
              onMouseDown={onBack}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl"
            >
              Back to Games
            </button>
          )}
        </div>
      </div>
    );
  };

  // Main render
  const renderPhase = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Thermal Contact</span>
          <div className="flex items-center gap-1.5">
            {PHASE_ORDER.map((p, i) => {
              const currentIndex = PHASE_ORDER.indexOf(phase);
              return (
                <button
                  key={p}
                  onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    phase === p
                      ? 'bg-red-400 w-6 shadow-lg shadow-red-400/30'
                      : currentIndex > i
                        ? 'bg-emerald-500 w-2'
                        : 'bg-slate-700 w-2 hover:bg-slate-600'
                  }`}
                  title={phaseLabels[p]}
                />
              );
            })}
          </div>
          <span className="text-sm font-medium text-red-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
}
