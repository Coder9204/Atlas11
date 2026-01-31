'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// =============================================================================
// ADIABATIC HEATING RENDERER - Compression Heats, Expansion Cools
// =============================================================================
// Game 133: Explore how compressing gas heats it without adding heat energy,
// and how expansion cools it - the thermodynamic magic of adiabatic processes.
// =============================================================================

interface AdiabaticHeatingRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

interface TestQuestion {
  id: number;
  scenario: string;
  question: string;
  options: { id: string; text: string; correct?: boolean }[];
  explanation: string;
}

interface TransferApp {
  icon: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  howItWorks: string;
  stats: { value: string; label: string }[];
  examples: string[];
  companies: string[];
  futureImpact: string;
  color: string;
}

interface Molecule {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const AdiabaticHeatingRenderer: React.FC<AdiabaticHeatingRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [showTestResults, setShowTestResults] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation states
  const [compressionRatio, setCompressionRatio] = useState(1);
  const [processSpeed, setProcessSpeed] = useState(100);
  const [temperature, setTemperature] = useState(300);
  const [pressure, setPressure] = useState(1);
  const [volume, setVolume] = useState(100);
  const [molecules, setMolecules] = useState<Molecule[]>([]);
  const [pvHistory, setPvHistory] = useState<{p: number, v: number}[]>([]);
  const [showHeatFlow, setShowHeatFlow] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Initialize molecules
  useEffect(() => {
    const initMolecules: Molecule[] = Array.from({ length: 30 }, () => ({
      x: 50 + Math.random() * 200,
      y: 50 + Math.random() * 100,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4
    }));
    setMolecules(initMolecules);
  }, []);

  // Molecule animation with temperature-dependent speed
  useEffect(() => {
    const animate = () => {
      setMolecules(prev => {
        const speedFactor = Math.sqrt(temperature / 300);
        const containerWidth = 50 + (volume / 100) * 200;

        return prev.map(mol => {
          let newX = mol.x + mol.vx * speedFactor;
          let newY = mol.y + mol.vy * speedFactor;
          let newVx = mol.vx;
          let newVy = mol.vy;

          if (newX < 50 || newX > containerWidth) {
            newVx = -newVx;
            newX = Math.max(50, Math.min(containerWidth, newX));
          }
          if (newY < 50 || newY > 150) {
            newVy = -newVy;
            newY = Math.max(50, Math.min(150, newY));
          }

          newVx += (Math.random() - 0.5) * 0.2;
          newVy += (Math.random() - 0.5) * 0.2;

          const maxSpeed = 5 * speedFactor;
          const speed = Math.sqrt(newVx * newVx + newVy * newVy);
          if (speed > maxSpeed) {
            newVx = (newVx / speed) * maxSpeed;
            newVy = (newVy / speed) * maxSpeed;
          }

          return { x: newX, y: newY, vx: newVx, vy: newVy };
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [temperature, volume]);

  // Calculate thermodynamic state
  useEffect(() => {
    const gamma = 1.4;
    const baseVolume = 100 / compressionRatio;
    const adiabaticFactor = processSpeed / 100;

    const adiabaticTempRatio = Math.pow(compressionRatio, (gamma - 1) * adiabaticFactor);
    const newTemp = 300 * adiabaticTempRatio;

    const adiabaticPressureRatio = Math.pow(compressionRatio, gamma * adiabaticFactor);
    const isothermalPressureRatio = compressionRatio;
    const effectivePressureRatio = isothermalPressureRatio + (adiabaticPressureRatio - isothermalPressureRatio) * adiabaticFactor;

    setVolume(baseVolume);
    setTemperature(newTemp);
    setPressure(effectivePressureRatio);
    setShowHeatFlow(processSpeed < 50);

    setPvHistory(prev => {
      const newPoint = { p: effectivePressureRatio, v: baseVolume };
      const history = [...prev, newPoint].slice(-50);
      return history;
    });
  }, [compressionRatio, processSpeed]);

  const playSound = useCallback((soundType: 'correct' | 'incorrect' | 'complete' | 'transition' | 'compress') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      const frequencies: Record<string, number[]> = {
        correct: [523, 659, 784],
        incorrect: [200, 150],
        complete: [523, 659, 784, 1047],
        transition: [440, 550],
        compress: [200, 300, 400, 300, 200]
      };

      const freqs = frequencies[soundType] || [440];
      oscillator.frequency.setValueAtTime(freqs[0], ctx.currentTime);
      freqs.forEach((freq, i) => {
        oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
      });

      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio not supported
    }
  }, []);

  const handlePrediction = (prediction: string) => {
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    const isCorrect = prediction === 'B';
    playSound(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect && onCorrectAnswer) onCorrectAnswer();
    if (!isCorrect && onIncorrectAnswer) onIncorrectAnswer();
  };

  const handleTwistPrediction = (prediction: string) => {
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    const isCorrect = prediction === 'C';
    playSound(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect && onCorrectAnswer) onCorrectAnswer();
    if (!isCorrect && onIncorrectAnswer) onIncorrectAnswer();
  };

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setShowTestResults(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  const handleAppComplete = (appIndex: number) => {
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
  };

  const testQuestions: TestQuestion[] = [
    {
      id: 1,
      scenario: "You use a bicycle pump to inflate a tire. After pumping vigorously, you notice the pump barrel feels hot.",
      question: "What is the primary cause of this heating?",
      options: [
        { id: 'a', text: 'Friction between the piston and barrel' },
        { id: 'b', text: 'Work done on the gas compresses it adiabatically, converting work to internal energy', correct: true },
        { id: 'c', text: 'Heat conducted from your hands' },
        { id: 'd', text: 'Chemical reactions in the air' }
      ],
      explanation: "When you compress air quickly, there's no time for heat to escape. The work you do on the gas increases its internal energy (and temperature) directly - this is adiabatic heating."
    },
    {
      id: 2,
      scenario: "A diesel engine compresses air with a compression ratio of 20:1 before fuel is injected.",
      question: "Why does this compression ignite the fuel without a spark plug?",
      options: [
        { id: 'a', text: 'The fuel is highly volatile' },
        { id: 'b', text: 'Friction generates sparks' },
        { id: 'c', text: 'Adiabatic compression raises air temperature above fuel ignition point (~500C)', correct: true },
        { id: 'd', text: 'Electric discharge from static buildup' }
      ],
      explanation: "In diesel engines, 20:1 compression raises air temperature to about 700-900C through adiabatic heating, exceeding diesel fuel's autoignition temperature."
    },
    {
      id: 3,
      scenario: "A weather balloon rises from sea level to high altitude.",
      question: "What happens to the air inside the balloon as it rises?",
      options: [
        { id: 'a', text: 'It heats up because it is closer to the sun' },
        { id: 'b', text: 'Temperature stays constant' },
        { id: 'c', text: 'It cools as it expands due to lower external pressure', correct: true },
        { id: 'd', text: 'The air inside doesn\'t change' }
      ],
      explanation: "As the balloon rises, external pressure drops. The air inside expands to equalize pressure, doing work on the balloon. This adiabatic expansion cools the gas."
    },
    {
      id: 4,
      scenario: "A scuba diver descends rapidly from the surface to 30 meters depth.",
      question: "What happens to air in the diver's buoyancy compensator (BC) during descent?",
      options: [
        { id: 'a', text: 'It expands and cools' },
        { id: 'b', text: 'It compresses and heats slightly', correct: true },
        { id: 'c', text: 'Temperature remains constant because water absorbs heat' },
        { id: 'd', text: 'Air liquefies under pressure' }
      ],
      explanation: "At 30m, pressure is 4 atm. Air in the BC compresses, and if fast enough, heats adiabatically."
    },
    {
      id: 5,
      scenario: "You're comparing slow compression and fast compression of the same amount of gas to the same final volume.",
      question: "Which process results in higher final pressure?",
      options: [
        { id: 'a', text: 'Slow compression (isothermal)' },
        { id: 'b', text: 'Fast compression (adiabatic)', correct: true },
        { id: 'c', text: 'Both give the same pressure' },
        { id: 'd', text: 'It depends on the type of gas' }
      ],
      explanation: "Adiabatic compression gives higher final pressure because temperature rises too. From PV = nRT, higher T at same V means higher P."
    },
    {
      id: 6,
      scenario: "Foehn winds occur when moist air rises over a mountain, loses moisture, then descends on the other side.",
      question: "Why are foehn winds warm and dry on the lee side?",
      options: [
        { id: 'a', text: 'The mountain absorbs moisture and releases heat' },
        { id: 'b', text: 'Rising air cools adiabatically (dropping rain), descending air heats adiabatically (now dry)', correct: true },
        { id: 'c', text: 'Friction with the mountain heats the air' },
        { id: 'd', text: 'The sun heats the lee side more' }
      ],
      explanation: "As moist air rises, it cools adiabatically (~6C/km when saturated). Water condenses. On descent, now-dry air warms faster (~10C/km)."
    },
    {
      id: 7,
      scenario: "A refrigerator uses a compressor to compress refrigerant gas.",
      question: "What role does adiabatic heating play in the refrigeration cycle?",
      options: [
        { id: 'a', text: 'It makes the refrigerator less efficient (waste heat)' },
        { id: 'b', text: 'Compression heats the refrigerant so it can reject heat to the room', correct: true },
        { id: 'c', text: 'It has no role - refrigerators work by magic' },
        { id: 'd', text: 'It cools the inside directly' }
      ],
      explanation: "Compressing refrigerant heats it above room temperature, allowing it to dump heat via the condenser coils."
    },
    {
      id: 8,
      scenario: "You open a pressurized can of compressed air used for cleaning electronics.",
      question: "Why does the can get cold when you use it?",
      options: [
        { id: 'a', text: 'The propellant is already cold' },
        { id: 'b', text: 'Chemical reactions absorb heat' },
        { id: 'c', text: 'Rapid expansion of gas cools it adiabatically', correct: true },
        { id: 'd', text: 'Evaporating liquid absorbs heat' }
      ],
      explanation: "As compressed gas escapes, it expands rapidly. This adiabatic expansion converts internal energy to kinetic energy, cooling the remaining gas."
    },
    {
      id: 9,
      scenario: "The First Law of Thermodynamics states: ΔU = Q - W",
      question: "For an adiabatic process (Q = 0), what determines the change in internal energy?",
      options: [
        { id: 'a', text: 'Temperature change' },
        { id: 'b', text: 'Pressure change' },
        { id: 'c', text: 'Work done on or by the gas (ΔU = -W)', correct: true },
        { id: 'd', text: 'Volume change' }
      ],
      explanation: "When Q = 0, the First Law becomes ΔU = -W. Compression (W < 0) increases internal energy; expansion (W > 0) decreases it."
    },
    {
      id: 10,
      scenario: "Two identical containers of ideal gas are compressed from V to V/2. One is insulated (adiabatic), the other is in contact with a heat bath (isothermal).",
      question: "Which process requires more work input?",
      options: [
        { id: 'a', text: 'Isothermal compression' },
        { id: 'b', text: 'Adiabatic compression', correct: true },
        { id: 'c', text: 'Both require the same work' },
        { id: 'd', text: 'Depends on the gas type' }
      ],
      explanation: "Adiabatic compression requires more work because the gas heats up, increasing pressure faster. The adiabatic curve is steeper on a PV diagram."
    }
  ];

  const transferApps: TransferApp[] = [
    {
      icon: "🚗",
      title: "Diesel Engines",
      short: "Diesel",
      tagline: "Compression ignition without spark plugs",
      description: "Diesel engines use extreme compression (15-25:1) to heat air above fuel's autoignition temperature.",
      connection: "Adiabatic compression raises air from ~300K to ~900K. At these temperatures, injected diesel fuel spontaneously combusts.",
      howItWorks: "Intake draws air. Compression heats air adiabatically. Fuel injection causes combustion. Power stroke extracts work.",
      stats: [
        { value: "20:1", label: "Compression ratio" },
        { value: "900K", label: "Peak temperature" },
        { value: "45%", label: "Efficiency" },
        { value: "25%", label: "Fuel savings" }
      ],
      examples: ["Heavy trucks", "Ships", "Construction equipment", "Some cars"],
      companies: ["Cummins", "Detroit Diesel", "MAN", "Volvo"],
      futureImpact: "Advanced diesel with exhaust treatment remains crucial for freight.",
      color: "from-amber-600 to-orange-600"
    },
    {
      icon: "🌤",
      title: "Weather Systems",
      short: "Weather",
      tagline: "Adiabatic processes drive atmospheric dynamics",
      description: "Rising and falling air parcels change temperature adiabatically, creating clouds and wind patterns.",
      connection: "Air rising cools at ~10C/km (dry) or ~6C/km (saturated). Cooling causes condensation; descent causes warming.",
      howItWorks: "Solar heating creates convection. Rising air expands and cools. Condensation forms clouds. Descending air warms.",
      stats: [
        { value: "10C/km", label: "Dry adiabatic rate" },
        { value: "6C/km", label: "Moist rate" },
        { value: "100%", label: "Cloud driver" },
        { value: "Global", label: "Scale" }
      ],
      examples: ["Mountain rainfall", "Foehn winds", "Thunderstorms", "Trade winds"],
      companies: ["NOAA", "Met Office", "ECMWF", "AccuWeather"],
      futureImpact: "Better understanding improves climate models and weather prediction.",
      color: "from-sky-600 to-blue-600"
    },
    {
      icon: "❄️",
      title: "Refrigeration",
      short: "Cooling",
      tagline: "Moving heat uphill with compression and expansion",
      description: "Refrigerators use adiabatic compression and expansion to move heat from cold to hot regions.",
      connection: "Compressing refrigerant heats it above ambient. Expanding it cools it below target temperature.",
      howItWorks: "Compressor raises pressure/temperature. Condenser rejects heat. Expansion valve cools refrigerant. Evaporator absorbs heat.",
      stats: [
        { value: "3-5", label: "COP" },
        { value: "300%+", label: "Efficiency" },
        { value: "20%", label: "Of electricity" },
        { value: "-40C", label: "Minimum" }
      ],
      examples: ["Refrigerators", "Air conditioning", "Heat pumps", "Industrial chillers"],
      companies: ["Carrier", "Daikin", "LG", "Trane"],
      futureImpact: "Heat pumps are 3-5x more efficient than electric heating.",
      color: "from-cyan-600 to-teal-600"
    },
    {
      icon: "🤿",
      title: "Scuba Diving",
      short: "Diving",
      tagline: "Pressure changes affect divers at depth",
      description: "Divers experience adiabatic effects when breathing compressed air and during pressure changes.",
      connection: "Rapidly filling tanks causes adiabatic heating. Gas expanding in regulators cools.",
      howItWorks: "Air is compressed into tanks (heating). At depth, regulators deliver air at ambient pressure. Ascending, dissolved gases expand.",
      stats: [
        { value: "4 atm", label: "At 30m" },
        { value: "200 bar", label: "Tank pressure" },
        { value: "18m/min", label: "Max ascent" },
        { value: "50C+", label: "Tank heat" }
      ],
      examples: ["Recreational diving", "Commercial diving", "Underwater construction", "Research diving"],
      companies: ["PADI", "Aqualung", "Scubapro", "Mares"],
      futureImpact: "Better understanding improves dive computers and decompression schedules.",
      color: "from-blue-600 to-indigo-600"
    }
  ];

  const renderPVDiagram = () => {
    const width = 280;
    const height = 180;
    const padding = 40;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxWidth: '300px', height: 'auto' }}>
        <defs>
          <linearGradient id="pvBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </defs>

        <rect width={width} height={height} fill="url(#pvBg)" rx="8" />

        {[1, 2, 3, 4].map(i => (
          <React.Fragment key={i}>
            <line x1={padding + i * 40} y1={padding} x2={padding + i * 40} y2={height - padding} stroke="#334155" strokeWidth="0.5" />
            <line x1={padding} y1={padding + i * 25} x2={width - padding} y2={padding + i * 25} stroke="#334155" strokeWidth="0.5" />
          </React.Fragment>
        ))}

        <line x1={padding} y1={padding} x2={padding} y2={height - padding + 10} stroke="#64748b" strokeWidth="2" />
        <line x1={padding - 10} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#64748b" strokeWidth="2" />

        <text x={padding - 5} y={padding - 10} fill="#94a3b8" fontSize="10" textAnchor="middle">P</text>
        <text x={width - padding + 10} y={height - padding + 5} fill="#94a3b8" fontSize="10">V</text>

        <path
          d={`M${padding + 160},${padding + 10} Q${padding + 100},${padding + 50} ${padding + 20},${padding + 100}`}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeDasharray="4 2"
          opacity="0.5"
        />
        <text x={padding + 165} y={padding + 20} fill="#3b82f6" fontSize="8" opacity="0.7">Isothermal</text>

        <path
          d={`M${padding + 160},${padding + 5} Q${padding + 90},${padding + 35} ${padding + 20},${padding + 100}`}
          fill="none"
          stroke="#ef4444"
          strokeWidth="2"
        />
        <text x={padding + 165} y={padding + 5} fill="#ef4444" fontSize="8">Adiabatic</text>

        <circle
          cx={padding + (100 - volume) * 1.6 + 20}
          cy={padding + 100 - pressure * 9}
          r="6"
          fill={processSpeed > 50 ? '#ef4444' : '#3b82f6'}
          stroke="white"
          strokeWidth="2"
        />

        {pvHistory.length > 1 && (
          <path
            d={`M${pvHistory.map((pt, i) =>
              `${i === 0 ? '' : 'L'}${padding + (100 - pt.v) * 1.6 + 20},${padding + 100 - pt.p * 9}`
            ).join(' ')}`}
            fill="none"
            stroke="#22c55e"
            strokeWidth="1.5"
            opacity="0.7"
          />
        )}
      </svg>
    );
  };

  const renderPistonVisualization = () => {
    const containerWidth = 50 + (volume / 100) * 200;
    const tempColor = temperature < 350 ? '#3b82f6' : temperature < 500 ? '#f59e0b' : '#ef4444';

    return (
      <svg viewBox="0 0 320 200" style={{ width: '100%', maxWidth: '400px', height: 'auto' }}>
        <defs>
          <linearGradient id="piston" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <linearGradient id="cylinder" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>

        <rect width="320" height="200" fill="#020617" rx="8" />
        <rect x="40" y="40" width="230" height="120" fill="url(#cylinder)" stroke="#475569" strokeWidth="2" rx="4" />

        <rect
          x="45"
          y="45"
          width={containerWidth - 45}
          height="110"
          fill={tempColor}
          opacity="0.2"
          rx="2"
        />

        {molecules.map((mol, i) => (
          <circle
            key={i}
            cx={Math.min(mol.x, containerWidth - 5)}
            cy={mol.y}
            r="4"
            fill={tempColor}
            opacity="0.8"
          />
        ))}

        <rect
          x={containerWidth - 5}
          y="43"
          width="20"
          height="114"
          fill="url(#piston)"
          stroke="#64748b"
          strokeWidth="1"
          rx="2"
        />

        <rect
          x={containerWidth + 15}
          y="90"
          width={280 - containerWidth}
          height="20"
          fill="#64748b"
          rx="2"
        />

        {showHeatFlow && (
          <g>
            <path d="M160,165 L160,185" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#heatArrow)" />
            <path d="M180,165 L180,185" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#heatArrow)" />
            <text x="170" y="198" fill="#3b82f6" fontSize="10" textAnchor="middle">Heat escapes</text>
            <defs>
              <marker id="heatArrow" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                <path d="M0,0 L0,4 L6,2 z" fill="#3b82f6" />
              </marker>
            </defs>
          </g>
        )}

        <text x="160" y="25" fill="#94a3b8" fontSize="12" textAnchor="middle">
          {processSpeed > 50 ? 'Fast (Adiabatic)' : 'Slow (Isothermal)'}
        </text>
      </svg>
    );
  };

  const renderHook = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px 16px', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '9999px', marginBottom: '32px' }}>
        <span style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }} />
        <span style={{ fontSize: '14px', fontWeight: 500, color: '#ef4444', letterSpacing: '0.05em' }}>THERMODYNAMICS</span>
      </div>

      <h1 style={{ fontSize: isMobile ? '28px' : '40px', fontWeight: 700, marginBottom: '16px', background: 'linear-gradient(to right, #ffffff, #fca5a5, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Adiabatic Heating
      </h1>
      <p style={{ fontSize: '18px', color: '#94a3b8', maxWidth: '400px', marginBottom: '32px' }}>
        Can squeezing air change temperature without <span style={{ color: '#ef4444', fontWeight: 600 }}>"adding heat"</span>?
      </p>

      <div style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.8))', borderRadius: '24px', padding: '32px', maxWidth: '500px', width: '100%', border: '1px solid rgba(71, 85, 105, 0.5)', marginBottom: '32px' }}>
        <p style={{ fontSize: '16px', color: '#e2e8f0', marginBottom: '16px' }}>
          Pump up a bicycle tire and the <span style={{ color: '#ef4444' }}>pump gets HOT</span> - but you're not adding any heat source!
        </p>
        <p style={{ fontSize: '14px', color: '#94a3b8' }}>
          Where does this heat come from? And why do diesel engines ignite fuel just by squeezing air?
        </p>
      </div>

      <div style={{
        background: 'rgba(239, 68, 68, 0.2)',
        padding: '16px',
        borderRadius: '8px',
        borderLeft: '3px solid #ef4444',
      }}>
        <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
          Click "Make a Prediction" below to discover the physics!
        </p>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '24px' }}>Make Your Prediction</h2>

      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '600px', marginBottom: '24px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
        <p style={{ fontSize: '16px', color: '#cbd5e1', marginBottom: '16px' }}>
          You rapidly compress a gas to half its volume in an insulated container (no heat can enter or leave).
        </p>
        <p style={{ fontSize: '16px', color: '#ef4444', fontWeight: 500 }}>
          What happens to the temperature of the gas?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '500px' }}>
        {[
          { id: 'A', text: 'Temperature stays the same (no heat added)' },
          { id: 'B', text: 'Temperature increases (work converts to internal energy)' },
          { id: 'C', text: 'Temperature decreases (compression cools things)' },
          { id: 'D', text: 'Temperature becomes undefined (gas liquefies)' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            style={{
              padding: '16px',
              borderRadius: '12px',
              textAlign: 'left',
              transition: 'all 0.3s',
              background: showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'B' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                : showPredictionFeedback && option.id === 'B'
                  ? 'rgba(34, 197, 94, 0.3)'
                  : 'rgba(51, 65, 85, 0.5)',
              border: showPredictionFeedback && (selectedPrediction === option.id || option.id === 'B')
                ? option.id === 'B' ? '2px solid #22c55e' : '2px solid #ef4444'
                : '2px solid transparent',
              cursor: showPredictionFeedback ? 'default' : 'pointer',
              color: '#e2e8f0'
            }}
          >
            <span style={{ fontWeight: 700, color: 'white' }}>{option.id}.</span>
            <span style={{ marginLeft: '8px' }}>{option.text}</span>
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '12px', maxWidth: '500px' }}>
          <p style={{ color: '#22c55e', fontWeight: 600 }}>
            {selectedPrediction === 'B' ? 'Correct!' : 'Surprising!'} Temperature INCREASES!
          </p>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '8px' }}>
            From the First Law: ΔU = Q - W. With Q = 0 (adiabatic) and W &lt; 0 (work done ON gas), we get ΔU &gt; 0. More internal energy means higher temperature!
          </p>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Adiabatic Lab</h2>
      <p style={{ color: '#94a3b8', marginBottom: '24px' }}>Explore compression and expansion with PV diagrams</p>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '24px', width: '100%', maxWidth: '700px' }}>
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
          {renderPistonVisualization()}
        </div>
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
          {renderPVDiagram()}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '500px', marginBottom: '24px' }}>
        <div style={{ background: 'rgba(51, 65, 85, 0.5)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#cbd5e1', fontSize: '14px' }}>Compression Ratio</span>
            <span style={{ color: '#ef4444', fontWeight: 700 }}>{compressionRatio}:1</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={compressionRatio}
            onChange={(e) => setCompressionRatio(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#ef4444' }}
          />
        </div>

        <div style={{ background: 'rgba(51, 65, 85, 0.5)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#cbd5e1', fontSize: '14px' }}>Process Speed</span>
            <span style={{ color: processSpeed > 50 ? '#ef4444' : '#3b82f6', fontWeight: 700 }}>
              {processSpeed > 50 ? 'Fast (Adiabatic)' : 'Slow (Isothermal)'}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={processSpeed}
            onChange={(e) => setProcessSpeed(Number(e.target.value))}
            style={{ width: '100%', accentColor: processSpeed > 50 ? '#ef4444' : '#3b82f6' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', width: '100%', maxWidth: '500px', marginBottom: '24px' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', padding: '16px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '24px' }}>{temperature.toFixed(0)} K</div>
          <div style={{ color: '#94a3b8', fontSize: '12px' }}>Temperature</div>
        </div>
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', padding: '16px', textAlign: 'center', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <div style={{ color: '#3b82f6', fontWeight: 700, fontSize: '24px' }}>{pressure.toFixed(1)} atm</div>
          <div style={{ color: '#94a3b8', fontSize: '12px' }}>Pressure</div>
        </div>
        <div style={{ background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', padding: '16px', textAlign: 'center', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
          <div style={{ color: '#22c55e', fontWeight: 700, fontSize: '24px' }}>{volume.toFixed(0)}%</div>
          <div style={{ color: '#94a3b8', fontSize: '12px' }}>Volume</div>
        </div>
      </div>
    </div>
  );

  const renderReview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '24px' }}>Why Adiabatic Heating Works</h2>

      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', width: '100%', marginBottom: '24px', textAlign: 'center', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
        <h3 style={{ color: '#f59e0b', fontWeight: 600, marginBottom: '12px' }}>First Law of Thermodynamics</h3>
        <div style={{ fontFamily: 'monospace', fontSize: '24px', color: 'white', marginBottom: '12px' }}>
          ΔU = Q - W
        </div>
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>
          Change in internal energy = Heat added - Work done by gas
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', width: '100%', marginBottom: '24px' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.1))', borderRadius: '16px', padding: '20px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <h3 style={{ color: '#ef4444', fontWeight: 600, marginBottom: '12px' }}>Adiabatic (Q = 0)</h3>
          <div style={{ fontFamily: 'monospace', color: 'white', marginBottom: '12px' }}>ΔU = -W</div>
          <ul style={{ color: '#cbd5e1', fontSize: '14px', listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ marginBottom: '8px' }}>No heat exchange (fast or insulated)</li>
            <li style={{ marginBottom: '8px' }}>Compression: Temperature RISES</li>
            <li>Expansion: Temperature FALLS</li>
          </ul>
        </div>

        <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.1))', borderRadius: '16px', padding: '20px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <h3 style={{ color: '#3b82f6', fontWeight: 600, marginBottom: '12px' }}>Isothermal (ΔT = 0)</h3>
          <div style={{ fontFamily: 'monospace', color: 'white', marginBottom: '12px' }}>Q = W</div>
          <ul style={{ color: '#cbd5e1', fontSize: '14px', listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ marginBottom: '8px' }}>Heat flows in/out as needed</li>
            <li style={{ marginBottom: '8px' }}>ΔU = 0 (constant temperature)</li>
            <li>Requires slow process for heat transfer</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6', marginBottom: '24px' }}>The Twist: Speed Matters!</h2>

      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '600px', marginBottom: '24px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
        <p style={{ fontSize: '16px', color: '#cbd5e1', marginBottom: '16px' }}>
          You compress gas to half volume two different ways: very fast and very slow.
        </p>
        <p style={{ fontSize: '16px', color: '#f59e0b', fontWeight: 500 }}>
          How do the final temperatures compare?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '500px' }}>
        {[
          { id: 'A', text: 'Same final temperature (same compression)' },
          { id: 'B', text: 'Slow compression gives higher temperature (more time to heat)' },
          { id: 'C', text: 'Fast compression gives higher temperature (heat can\'t escape)' },
          { id: 'D', text: 'Temperature depends on gas type, not speed' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            style={{
              padding: '16px',
              borderRadius: '12px',
              textAlign: 'left',
              transition: 'all 0.3s',
              background: showTwistFeedback && twistPrediction === option.id
                ? option.id === 'C' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                : showTwistFeedback && option.id === 'C'
                  ? 'rgba(34, 197, 94, 0.3)'
                  : 'rgba(51, 65, 85, 0.5)',
              border: showTwistFeedback && (twistPrediction === option.id || option.id === 'C')
                ? option.id === 'C' ? '2px solid #22c55e' : '2px solid #ef4444'
                : '2px solid transparent',
              cursor: showTwistFeedback ? 'default' : 'pointer',
              color: '#e2e8f0'
            }}
          >
            <span style={{ fontWeight: 700, color: 'white' }}>{option.id}.</span>
            <span style={{ marginLeft: '8px' }}>{option.text}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '12px', maxWidth: '500px' }}>
          <p style={{ color: '#22c55e', fontWeight: 600 }}>
            {twistPrediction === 'C' ? 'Exactly!' : 'That\'s the key insight!'} Fast = Hotter!
          </p>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '8px' }}>
            Fast compression is adiabatic - all work becomes internal energy. Slow compression allows heat to leak out to surroundings.
          </p>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6', marginBottom: '8px' }}>Fast vs Slow Compression</h2>
      <p style={{ color: '#94a3b8', marginBottom: '24px' }}>See how speed affects the final state</p>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px', width: '100%', maxWidth: '700px', marginBottom: '24px' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <h3 style={{ color: '#ef4444', fontWeight: 600, marginBottom: '12px', textAlign: 'center' }}>Fast (Adiabatic)</h3>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Heat transfer:</span>
              <span style={{ color: '#ef4444' }}>Q = 0</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Temperature:</span>
              <span style={{ color: '#ef4444' }}>RISES</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Final pressure:</span>
              <span style={{ color: '#ef4444' }}>Higher</span>
            </div>
          </div>
        </div>

        <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <h3 style={{ color: '#3b82f6', fontWeight: 600, marginBottom: '12px', textAlign: 'center' }}>Slow (Isothermal)</h3>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Heat transfer:</span>
              <span style={{ color: '#3b82f6' }}>Q = W (escapes)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Temperature:</span>
              <span style={{ color: '#3b82f6' }}>CONSTANT</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Final pressure:</span>
              <span style={{ color: '#3b82f6' }}>Lower</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6', marginBottom: '24px' }}>Key Discovery</h2>

      <div style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(239, 68, 68, 0.1))', borderRadius: '16px', padding: '24px', width: '100%', marginBottom: '24px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
        <h3 style={{ color: 'white', fontWeight: 700, fontSize: '20px', marginBottom: '16px', textAlign: 'center' }}>
          Heat Leakage Changes Everything
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '32px' }}>⚡</div>
            <div>
              <p style={{ color: '#ef4444', fontWeight: 600 }}>Fast Compression</p>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>No time for heat to escape → All work becomes internal energy → Hot!</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '32px' }}>🐌</div>
            <div>
              <p style={{ color: '#3b82f6', fontWeight: 600 }}>Slow Compression</p>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>Heat escapes as fast as it's generated → Temperature stays constant</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Real-World Applications</h2>
      <p style={{ color: '#94a3b8', marginBottom: '24px' }}>Adiabatic processes power modern technology</p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {transferApps.map((app, index) => (
          <button
            key={index}
            onClick={() => setActiveAppTab(index)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              background: activeAppTab === index
                ? 'linear-gradient(to right, #ef4444, #dc2626)'
                : completedApps.has(index)
                  ? 'rgba(34, 197, 94, 0.2)'
                  : 'rgba(51, 65, 85, 0.5)',
              color: 'white',
              transition: 'all 0.3s'
            }}
          >
            {app.icon} {isMobile ? app.short : app.title}
          </button>
        ))}
      </div>

      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '600px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontSize: '32px' }}>{transferApps[activeAppTab].icon}</span>
          <div>
            <h3 style={{ color: 'white', fontWeight: 700, fontSize: '18px' }}>{transferApps[activeAppTab].title}</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>{transferApps[activeAppTab].tagline}</p>
          </div>
        </div>

        <p style={{ color: '#cbd5e1', marginBottom: '16px', fontSize: '14px' }}>{transferApps[activeAppTab].description}</p>

        <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <h4 style={{ color: '#f59e0b', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>Physics Connection</h4>
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>{transferApps[activeAppTab].connection}</p>
        </div>

        {!completedApps.has(activeAppTab) && (
          <button
            onClick={() => handleAppComplete(activeAppTab)}
            style={{ width: '100%', padding: '12px', background: 'linear-gradient(to right, #ef4444, #dc2626)', color: 'white', fontWeight: 600, borderRadius: '8px', border: 'none', cursor: 'pointer' }}
          >
            Mark as Understood
          </button>
        )}
      </div>

      <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#94a3b8', fontSize: '14px' }}>Progress:</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {transferApps.map((_, i) => (
            <div
              key={i}
              style={{ width: '12px', height: '12px', borderRadius: '50%', background: completedApps.has(i) ? '#22c55e' : '#475569' }}
            />
          ))}
        </div>
        <span style={{ color: '#94a3b8', fontSize: '14px' }}>{completedApps.size}/{transferApps.length}</span>
      </div>
    </div>
  );

  const renderTest = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '24px' }}>Knowledge Test</h2>

      {!showTestResults ? (
        <div style={{ width: '100%', maxWidth: '600px' }}>
          {testQuestions.map((q, qIndex) => (
            <div key={q.id} style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '20px', marginBottom: '16px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                <p style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>{q.scenario}</p>
              </div>
              <p style={{ color: 'white', fontWeight: 500, marginBottom: '12px' }}>{qIndex + 1}. {q.question}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {q.options.map((opt, oIndex) => (
                  <button
                    key={opt.id}
                    onClick={() => handleTestAnswer(qIndex, oIndex)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      textAlign: 'left',
                      fontSize: '14px',
                      border: 'none',
                      cursor: 'pointer',
                      background: testAnswers[qIndex] === oIndex ? 'rgba(239, 68, 68, 0.3)' : 'rgba(51, 65, 85, 0.5)',
                      color: '#e2e8f0',
                      transition: 'all 0.2s'
                    }}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={submitTest}
            disabled={testAnswers.includes(null)}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '16px',
              border: 'none',
              cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
              background: testAnswers.includes(null) ? 'rgba(71, 85, 105, 0.5)' : 'linear-gradient(to right, #ef4444, #dc2626)',
              color: testAnswers.includes(null) ? '#64748b' : 'white',
              marginTop: '16px'
            }}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: '600px' }}>
          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>{testScore >= 8 ? '🎉' : '📚'}</div>
            <h3 style={{ color: 'white', fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
              Score: {testScore}/10
            </h3>
            <p style={{ color: '#94a3b8' }}>
              {testScore >= 8 ? 'Excellent! You understand adiabatic processes!' : 'Keep learning! Review and try again.'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {testQuestions.map((q, i) => {
              const userAnswer = testAnswers[i];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={q.id} style={{ padding: '16px', borderRadius: '12px', background: isCorrect ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: isCorrect ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>{i + 1}. {q.question}</p>
                  <p style={{ color: isCorrect ? '#22c55e' : '#ef4444', fontWeight: 500, fontSize: '14px' }}>
                    {isCorrect ? 'Correct!' : `Incorrect. Correct: ${q.options.find(o => o.correct)?.text}`}
                  </p>
                  <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '8px' }}>{q.explanation}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px', textAlign: 'center' }}>
      <div style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.1))', borderRadius: '24px', padding: '32px', maxWidth: '500px' }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔥</div>
        <h1 style={{ color: 'white', fontSize: '28px', fontWeight: 700, marginBottom: '16px' }}>Thermodynamics Master!</h1>
        <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '24px' }}>
          You've mastered adiabatic heating and the First Law of Thermodynamics!
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
            <p style={{ color: '#94a3b8', fontSize: '12px' }}>PV Diagrams</p>
            <p style={{ color: '#ef4444', fontSize: '14px', fontWeight: 600 }}>Mastered</p>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚡</div>
            <p style={{ color: '#94a3b8', fontSize: '12px' }}>Adiabatic</p>
            <p style={{ color: '#ef4444', fontSize: '14px', fontWeight: 600 }}>Processes</p>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🚗</div>
            <p style={{ color: '#94a3b8', fontSize: '12px' }}>Diesel Engines</p>
            <p style={{ color: '#ef4444', fontSize: '14px', fontWeight: 600 }}>Understood</p>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>❄️</div>
            <p style={{ color: '#94a3b8', fontSize: '12px' }}>Refrigeration</p>
            <p style={{ color: '#ef4444', fontSize: '14px', fontWeight: 600 }}>Cycles</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      minHeight: '72px',
      background: 'rgba(30, 41, 59, 0.98)',
      borderTop: '1px solid rgba(148, 163, 184, 0.2)',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
      padding: '16px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <button
        onClick={onPhaseComplete}
        disabled={disabled && !canProceed}
        style={{
          marginLeft: 'auto',
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? '#ef4444' : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : '#94a3b8',
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // Phase routing
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0f1a' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderHook()}
        </div>
        {renderBottomBar(false, true, 'Make a Prediction')}
      </div>
    );
  }

  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0f1a' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderPredict()}
        </div>
        {renderBottomBar(true, !!selectedPrediction, 'Test My Prediction')}
      </div>
    );
  }

  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0f1a' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderPlay()}
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  if (phase === 'review') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0f1a' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderReview()}
        </div>
        {renderBottomBar(false, true, 'Next: A Twist!')}
      </div>
    );
  }

  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0f1a' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderTwistPredict()}
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0f1a' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderTwistPlay()}
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  if (phase === 'twist_review') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0f1a' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderTwistReview()}
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge')}
      </div>
    );
  }

  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0f1a' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderTransfer()}
        </div>
        {renderBottomBar(completedApps.size < 4, completedApps.size >= 4, 'Take the Test')}
      </div>
    );
  }

  if (phase === 'test') {
    if (showTestResults) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0f1a' }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            {renderTest()}
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0f1a' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderTest()}
        </div>
      </div>
    );
  }

  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0f1a' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderMastery()}
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default AdiabaticHeatingRenderer;
