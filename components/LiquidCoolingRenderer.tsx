'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface LiquidCoolingRendererProps {
  phase?: Phase;
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const LiquidCoolingRenderer: React.FC<LiquidCoolingRendererProps> = ({
  phase: externalPhase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer
}) => {
  const [phase, setPhase] = useState<Phase>(externalPhase || 'hook');
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Game-specific state
  const [coolantType, setCoolantType] = useState<'air' | 'water' | 'oil' | 'twophase'>('water');
  const [flowRate, setFlowRate] = useState(5); // L/min
  const [heatLoad, setHeatLoad] = useState(500); // Watts
  const [inletTemp, setInletTemp] = useState(25); // Celsius
  const [showFlowMode, setShowFlowMode] = useState<'laminar' | 'turbulent'>('turbulent');
  const [animationFrame, setAnimationFrame] = useState(0);

  const lastClickRef = useRef(0);

  useEffect(() => {
    if (externalPhase && externalPhase !== phase) {
      setPhase(externalPhase);
    }
  }, [externalPhase, phase]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(f => (f + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

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

  // Coolant properties
  const coolantProps: Record<string, { cp: number; k: number; name: string; color: string; hMultiplier: number }> = {
    air: { cp: 1.005, k: 0.026, name: 'Air', color: '#94a3b8', hMultiplier: 1 },
    water: { cp: 4.186, k: 0.60, name: 'Water', color: '#3b82f6', hMultiplier: 25 },
    oil: { cp: 2.0, k: 0.15, name: 'Mineral Oil', color: '#eab308', hMultiplier: 8 },
    twophase: { cp: 100, k: 0.80, name: 'Two-Phase (3M Novec)', color: '#a855f7', hMultiplier: 100 } // Effective Cp with phase change
  };

  // Calculate heat transfer metrics
  const calcCoolingMetrics = useCallback(() => {
    const props = coolantProps[coolantType];
    const massFlowRate = flowRate * 0.001 / 60; // Convert L/min to kg/s (approx for water)

    // Q = m_dot * Cp * deltaT -> deltaT = Q / (m_dot * Cp)
    // For air, need to account for much lower density
    const densityFactor = coolantType === 'air' ? 0.001 : 1;
    const effectiveMassFlow = massFlowRate * densityFactor * 1000;

    const deltaT = heatLoad / (effectiveMassFlow * props.cp * 1000);
    const outletTemp = inletTemp + deltaT;

    // Heat transfer coefficient (simplified)
    const flowFactor = showFlowMode === 'turbulent' ? 3 : 1;
    const heatTransferCoeff = props.hMultiplier * flowFactor * 100; // W/(m2*K)

    // Relative cooling capacity
    const coolingCapacity = effectiveMassFlow * props.cp;
    const maxCoolingCapacity = 10 * 4.186; // Reference: 10 L/min water
    const relativeCapacity = (coolingCapacity / maxCoolingCapacity) * 100;

    return {
      deltaT: Math.min(deltaT, 100),
      outletTemp: Math.min(outletTemp, 125),
      heatTransferCoeff,
      relativeCapacity: Math.min(relativeCapacity, 200),
      coolantName: props.name,
      coolantColor: props.color,
      thermalConductivity: props.k,
      specificHeat: props.cp
    };
  }, [coolantType, flowRate, heatLoad, inletTemp, showFlowMode]);

  const metrics = calcCoolingMetrics();

  const goToNextPhase = useCallback(() => {
    const phases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    const currentIndex = phases.indexOf(phase);
    if (currentIndex < phases.length - 1) {
      setPhase(phases[currentIndex + 1]);
      playSound('transition');
    }
  }, [phase, playSound]);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'C' ? 'success' : 'failure');
  }, [playSound]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'B' ? 'success' : 'failure');
  }, [playSound]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
  }, []);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
  }, [playSound]);

  const testQuestions = [
    { question: "Water's specific heat capacity is approximately:", options: [{ text: "1.0 J/(g*K)", correct: false }, { text: "4.2 J/(g*K)", correct: true }, { text: "0.24 J/(g*K)", correct: false }, { text: "10 J/(g*K)", correct: false }] },
    { question: "Why is water ~25x better than air for cooling?", options: [{ text: "Water is colder", correct: false }, { text: "Higher specific heat and thermal conductivity", correct: true }, { text: "Water is blue", correct: false }, { text: "Water flows faster", correct: false }] },
    { question: "The heat transfer formula Q = m_dot * Cp * deltaT shows that:", options: [{ text: "Higher flow rate allows lower deltaT for same heat removal", correct: true }, { text: "Temperature doesn't affect heat transfer", correct: false }, { text: "Mass flow doesn't matter", correct: false }, { text: "Only Cp matters", correct: false }] },
    { question: "Thermal conductivity (k) measures:", options: [{ text: "How fast a fluid flows", correct: false }, { text: "How well heat conducts through a material", correct: true }, { text: "The color of the coolant", correct: false }, { text: "The pressure drop", correct: false }] },
    { question: "Turbulent flow is better for heat transfer because:", options: [{ text: "It's quieter", correct: false }, { text: "It mixes the fluid, breaking up thermal boundary layers", correct: true }, { text: "It uses less energy", correct: false }, { text: "It's more predictable", correct: false }] },
    { question: "Two-phase cooling (boiling) is superior because:", options: [{ text: "It looks cool", correct: false }, { text: "Latent heat of vaporization absorbs massive energy at constant temp", correct: true }, { text: "It's cheaper", correct: false }, { text: "It's simpler", correct: false }] },
    { question: "Direct-to-chip liquid cooling involves:", options: [{ text: "Submerging the whole server in liquid", correct: false }, { text: "Cold plates attached directly to CPUs/GPUs with liquid flowing through", correct: true }, { text: "Spraying liquid on the motherboard", correct: false }, { text: "Using liquid-filled heatsinks with no flow", correct: false }] },
    { question: "Immersion cooling uses:", options: [{ text: "Water sprayed on servers", correct: false }, { text: "Servers submerged in dielectric (non-conductive) fluid", correct: true }, { text: "Ice blocks in the data center", correct: false }, { text: "Liquid nitrogen", correct: false }] },
    { question: "The Reynolds number determines:", options: [{ text: "The color of the fluid", correct: false }, { text: "Whether flow is laminar or turbulent", correct: true }, { text: "The temperature of the fluid", correct: false }, { text: "The cost of cooling", correct: false }] },
    { question: "Heat pipes work by:", options: [{ text: "Pumping water through tubes", correct: false }, { text: "Using capillary action and phase change to move heat with no pump", correct: true }, { text: "Using fans inside the pipe", correct: false }, { text: "Conducting heat through solid copper", correct: false }] }
  ];

  const applications = [
    { title: "Direct-to-Chip Cooling", icon: "💧", description: "Cold plates on CPUs/GPUs with circulating water can handle 300-1000W per chip. Used by IBM, Dell, and others for HPC.", details: "Water carries 25x more heat than air per volume - enabling denser server racks." },
    { title: "Immersion Cooling", icon: "🛁", description: "Servers fully submerged in dielectric fluid (like 3M Novec). All components cooled simultaneously.", details: "Enables PUE below 1.05 and can handle 100kW+ per rack!" },
    { title: "Rear-Door Heat Exchangers", icon: "🚪", description: "Liquid-cooled doors on rack backs capture heat before it enters the room. Retrofit-friendly.", details: "Can capture 50-100% of rack heat without modifying servers." },
    { title: "Two-Phase Immersion", icon: "🔥", description: "Dielectric fluid boils at chip surface, vapor rises, condenses, and drips back. No pumps needed!", details: "Boiling provides incredibly high heat transfer coefficients." }
  ];

  const calculateScore = () => testAnswers.reduce((score, answer, index) => score + (testQuestions[index].options[answer]?.correct ? 1 : 0), 0);

  const getTempColor = (temp: number) => {
    if (temp < 40) return '#22c55e';
    if (temp < 60) return '#eab308';
    if (temp < 80) return '#f97316';
    return '#ef4444';
  };

  const renderLiquidCoolingVisualization = () => {
    const props = coolantProps[coolantType];

    return (
      <svg viewBox="0 0 500 320" className="w-full max-w-2xl mx-auto">
        <defs>
          <linearGradient id="coolantGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={props.color} stopOpacity="0.8" />
            <stop offset="100%" stopColor={getTempColor(metrics.outletTemp)} stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="heatGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>

        {/* Heat source (CPU/GPU) */}
        <rect x="180" y="100" width="140" height="80" fill="url(#heatGrad)" stroke="#ef4444" strokeWidth="2" rx="5" />
        <text x="250" y="130" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">Heat Source</text>
        <text x="250" y="150" textAnchor="middle" fontSize="14" fill="white">{heatLoad}W</text>
        <text x="250" y="170" textAnchor="middle" fontSize="10" fill="white">{metrics.outletTemp.toFixed(1)}C surface</text>

        {/* Cold plate / cooling block */}
        <rect x="170" y="80" width="160" height="20" fill="#374151" stroke="#4b5563" strokeWidth="2" rx="3" />
        <text x="250" y="95" textAnchor="middle" fontSize="10" fill="#e5e7eb">Cold Plate</text>

        {/* Inlet pipe */}
        <path d="M50,90 L170,90" stroke={props.color} strokeWidth="12" fill="none" strokeLinecap="round" />
        <text x="110" y="75" textAnchor="middle" fontSize="10" fill={props.color}>Inlet {inletTemp}C</text>

        {/* Coolant flow animation - inlet */}
        {[...Array(5)].map((_, i) => {
          const x = 60 + ((animationFrame * (flowRate / 3) + i * 25) % 110);
          return (
            <circle key={`in-${i}`} cx={x} cy={90} r={4} fill="white" opacity={0.6} />
          );
        })}

        {/* Outlet pipe */}
        <path d="M330,90 L450,90" stroke={getTempColor(metrics.outletTemp)} strokeWidth="12" fill="none" strokeLinecap="round" />
        <text x="390" y="75" textAnchor="middle" fontSize="10" fill={getTempColor(metrics.outletTemp)}>Outlet {metrics.outletTemp.toFixed(1)}C</text>

        {/* Coolant flow animation - outlet */}
        {[...Array(5)].map((_, i) => {
          const x = 340 + ((animationFrame * (flowRate / 3) + i * 25) % 110);
          return (
            <circle key={`out-${i}`} cx={x} cy={90} r={4} fill="white" opacity={0.6} />
          );
        })}

        {/* Two-phase bubbles if applicable */}
        {coolantType === 'twophase' && (
          <>
            {[...Array(8)].map((_, i) => {
              const x = 190 + (i % 4) * 35;
              const y = 85 - ((animationFrame + i * 15) % 30);
              const size = 3 + Math.sin(animationFrame / 10 + i) * 2;
              return (
                <circle key={`bubble-${i}`} cx={x} cy={y} r={size} fill="white" opacity={0.7} />
              );
            })}
            <text x="250" y="65" textAnchor="middle" fontSize="9" fill="#a855f7">Boiling at surface!</text>
          </>
        )}

        {/* Flow pattern visualization */}
        <rect x="40" y="200" width="180" height="100" fill="#1f2937" rx="5" />
        <text x="130" y="220" textAnchor="middle" fontSize="11" fill="#e5e7eb" fontWeight="bold">Flow Pattern</text>

        {showFlowMode === 'laminar' ? (
          <>
            {[0, 1, 2, 3, 4].map(i => (
              <path key={i} d={`M60,${240 + i * 12} L200,${240 + i * 12}`} stroke={props.color} strokeWidth="2" opacity={0.6} />
            ))}
            <text x="130" y="295" textAnchor="middle" fontSize="10" fill="#9ca3af">Laminar: Parallel layers, poor mixing</text>
          </>
        ) : (
          <>
            {[0, 1, 2, 3, 4].map(i => {
              const offset = Math.sin(animationFrame / 5 + i) * 10;
              return (
                <path
                  key={i}
                  d={`M60,${250 + i * 8} Q100,${250 + i * 8 + offset} 130,${250 + i * 8} Q160,${250 + i * 8 - offset} 200,${250 + i * 8}`}
                  stroke={props.color}
                  strokeWidth="2"
                  fill="none"
                  opacity={0.6}
                />
              );
            })}
            <text x="130" y="295" textAnchor="middle" fontSize="10" fill="#22c55e">Turbulent: Mixing improves heat transfer!</text>
          </>
        )}

        {/* Metrics panel */}
        <rect x="260" y="200" width="220" height="100" fill="#1f2937" rx="5" />
        <text x="370" y="220" textAnchor="middle" fontSize="11" fill="#e5e7eb" fontWeight="bold">{metrics.coolantName} Properties</text>
        <text x="270" y="240" fontSize="10" fill="#9ca3af">Specific Heat: {metrics.specificHeat.toFixed(2)} J/(g*K)</text>
        <text x="270" y="258" fontSize="10" fill="#9ca3af">Conductivity: {metrics.thermalConductivity.toFixed(3)} W/(m*K)</text>
        <text x="270" y="276" fontSize="10" fill="#9ca3af">Heat Transfer: {metrics.heatTransferCoeff.toFixed(0)} W/(m2*K)</text>
        <text x="270" y="294" fontSize="10" fill={metrics.relativeCapacity > 100 ? '#22c55e' : metrics.relativeCapacity > 50 ? '#eab308' : '#ef4444'}>
          Relative Capacity: {metrics.relativeCapacity.toFixed(0)}%
        </text>

        {/* Formula */}
        <text x="250" y="30" textAnchor="middle" fontSize="12" fill="#22d3ee" fontWeight="bold">Q = m_dot x Cp x deltaT</text>
        <text x="250" y="50" textAnchor="middle" fontSize="10" fill="#9ca3af">
          {heatLoad}W = flow x {metrics.specificHeat.toFixed(1)} x {metrics.deltaT.toFixed(1)}C
        </text>
      </svg>
    );
  };

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-purple-400 tracking-wide">DATA CENTER PHYSICS</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-purple-100 to-blue-200 bg-clip-text text-transparent">
        Liquid Cooling Heat Transfer
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Why is water 25x better at cooling than air?
      </p>

      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-6">💧 🔥 ❄️</div>

          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              A 500W GPU generates as much heat as a small space heater!
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              Air cooling struggles to keep up. But run water through a cold plate and temperatures drop dramatically. Why?
            </p>
            <div className="pt-2">
              <p className="text-base text-purple-400 font-semibold">
                It's all about specific heat capacity and thermal conductivity!
              </p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => { onPhaseComplete?.(); goToNextPhase(); }}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-purple-500 to-blue-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Explore Liquid Cooling
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          To remove 500W of heat with a 5C temperature rise, you need a certain mass flow rate. Water's specific heat is 4.2 J/(g*K), while air's is 1.0 J/(g*K).
        </p>
        <p className="text-cyan-400">Why can water remove the same heat with much less mass flow?</p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Water is denser than air' },
          { id: 'B', text: 'Water is colder than air' },
          { id: 'C', text: 'Water has 4x higher specific heat - it absorbs more energy per degree' },
          { id: 'D', text: 'Water flows faster than air' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'C' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'C' ? 'bg-emerald-600/40 border-2 border-emerald-400'
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
            Correct! Water's high specific heat (4.2 vs 1.0 J/gK) means it can absorb 4x more energy per gram per degree. Combined with higher density and thermal conductivity, water is ~25x more effective!
          </p>
          <button
            onClick={() => { onPhaseComplete?.(); goToNextPhase(); }}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl"
          >
            Explore Heat Transfer
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Liquid Cooling Lab</h2>
      <p className="text-slate-400 mb-4">Compare different coolants and see heat transfer in action!</p>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-2xl">
        {renderLiquidCoolingVisualization()}
      </div>

      <div className="grid gap-4 w-full max-w-2xl mb-4">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Coolant Type</label>
          <div className="grid grid-cols-4 gap-2">
            {(['air', 'water', 'oil', 'twophase'] as const).map(type => (
              <button
                key={type}
                onClick={() => setCoolantType(type)}
                className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
                  coolantType === type ? 'text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                }`}
                style={{ backgroundColor: coolantType === type ? coolantProps[type].color : undefined, WebkitTapHighlightColor: 'transparent' }}
              >
                {coolantProps[type].name}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Flow Rate: {flowRate} L/min</label>
          <input type="range" min="1" max="20" value={flowRate} onChange={(e) => setFlowRate(parseInt(e.target.value))} className="w-full accent-purple-500" />
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Heat Load: {heatLoad}W</label>
          <input type="range" min="100" max="1000" step="50" value={heatLoad} onChange={(e) => setHeatLoad(parseInt(e.target.value))} className="w-full accent-orange-500" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setShowFlowMode(showFlowMode === 'laminar' ? 'turbulent' : 'laminar')}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={`p-3 rounded-xl font-medium transition-colors ${
              showFlowMode === 'turbulent' ? 'bg-emerald-600 text-white' : 'bg-slate-600 text-white'
            }`}
          >
            {showFlowMode === 'turbulent' ? 'Turbulent Flow' : 'Laminar Flow'}
          </button>
          <div className="bg-slate-600 p-3 rounded-xl text-center">
            <span className="text-sm text-slate-300">Delta T: </span>
            <span className="font-bold" style={{ color: getTempColor(metrics.outletTemp) }}>{metrics.deltaT.toFixed(1)}C</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => { onPhaseComplete?.(); goToNextPhase(); }}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl"
      >
        Learn the Science
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">The Science of Liquid Cooling</h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-purple-400 mb-3">Specific Heat Capacity (Cp)</h3>
          <p className="text-slate-300 text-sm mb-2">Energy to raise 1g by 1C:</p>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>- Water: 4.18 J/(g*K)</li>
            <li>- Air: 1.01 J/(g*K)</li>
            <li>- Oil: ~2.0 J/(g*K)</li>
          </ul>
          <p className="text-purple-400 text-sm mt-2">Water absorbs 4x more heat per mass!</p>
        </div>
        <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">Thermal Conductivity (k)</h3>
          <p className="text-slate-300 text-sm mb-2">How fast heat conducts (W/mK):</p>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>- Water: 0.60 W/(m*K)</li>
            <li>- Air: 0.026 W/(m*K)</li>
            <li>- Copper: 400 W/(m*K)</li>
          </ul>
          <p className="text-cyan-400 text-sm mt-2">Water conducts heat 23x faster than air!</p>
        </div>
        <div className="bg-gradient-to-br from-orange-900/50 to-red-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-orange-400 mb-3">The Heat Transfer Equation</h3>
          <div className="font-mono text-center text-lg text-white mb-2">Q = m_dot x Cp x deltaT</div>
          <p className="text-slate-300 text-sm">Heat removed equals mass flow rate times specific heat times temperature difference. Higher Cp means less flow needed for the same heat removal!</p>
        </div>
      </div>
      <button
        onClick={() => { onPhaseComplete?.(); goToNextPhase(); }}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
      >
        Discover a Surprising Twist
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">The Two-Phase Twist</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          Water is great, but there's something even better: two-phase cooling where the liquid BOILS at the chip surface. The vapor rises, condenses, and drips back down.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          Why is boiling even more effective than liquid flow?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Vapor moves faster than liquid' },
          { id: 'B', text: 'The latent heat of vaporization absorbs massive energy at constant temperature' },
          { id: 'C', text: 'Bubbles provide better mixing' },
          { id: 'D', text: 'Boiling is louder, so heat escapes as sound' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400'
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
            Correct! Water's latent heat of vaporization is 2260 J/g - that's 540x more than heating water by 1C! Phase change absorbs enormous energy while keeping temperature constant at the boiling point.
          </p>
          <button
            onClick={() => { onPhaseComplete?.(); goToNextPhase(); }}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
          >
            Explore Two-Phase Cooling
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Two-Phase Cooling Demo</h2>
      <p className="text-slate-400 mb-4">Compare regular liquid cooling to two-phase (boiling) systems!</p>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-2xl">
        {renderLiquidCoolingVisualization()}
      </div>

      <div className="grid gap-4 w-full max-w-2xl mb-4">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setCoolantType('water')}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={`p-4 rounded-xl font-medium transition-colors ${
              coolantType === 'water' ? 'bg-blue-600 text-white' : 'bg-slate-600 text-white'
            }`}
          >
            Water (Single Phase)
          </button>
          <button
            onClick={() => setCoolantType('twophase')}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={`p-4 rounded-xl font-medium transition-colors ${
              coolantType === 'twophase' ? 'bg-purple-600 text-white' : 'bg-slate-600 text-white'
            }`}
          >
            Two-Phase (3M Novec)
          </button>
        </div>

        <div className={`p-4 rounded-xl ${coolantType === 'twophase' ? 'bg-purple-900/30' : 'bg-blue-900/30'}`}>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold" style={{ color: getTempColor(metrics.outletTemp) }}>
                {metrics.deltaT.toFixed(1)}C
              </div>
              <div className="text-sm text-slate-300">Temperature Rise</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">
                {metrics.heatTransferCoeff.toFixed(0)}
              </div>
              <div className="text-sm text-slate-300">Heat Transfer Coeff</div>
            </div>
          </div>
          <p className="text-sm text-slate-300 mt-3 text-center">
            {coolantType === 'twophase'
              ? "Boiling provides massive heat transfer - liquid stays at constant temp during phase change!"
              : "Single-phase: temperature rises as liquid absorbs heat."}
          </p>
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Heat Load: {heatLoad}W</label>
          <input type="range" min="100" max="1000" step="50" value={heatLoad} onChange={(e) => setHeatLoad(parseInt(e.target.value))} className="w-full accent-orange-500" />
        </div>
      </div>

      <button
        onClick={() => { onPhaseComplete?.(); goToNextPhase(); }}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
      >
        See Explanation
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Why Two-Phase is Revolutionary</h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-purple-400 mb-3">Latent Heat vs Sensible Heat</h3>
          <p className="text-slate-300 text-sm">
            Sensible heat: Q = m*Cp*deltaT (temp changes)<br/>
            Latent heat: Q = m*L (temp stays constant!)<br/><br/>
            Water's L = 2260 J/g vs Cp*deltaT = 4.2 J/(g*C).<br/>
            One gram boiling absorbs as much heat as heating 540g by 1C!
          </p>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">Benefits of Two-Phase</h3>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>- Constant temperature operation</li>
            <li>- Much higher heat transfer coefficients</li>
            <li>- No pump needed (thermosyphon)</li>
            <li>- Self-regulating: more heat = more boiling</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-blue-400 mb-3">Immersion Cooling in Practice</h3>
          <p className="text-slate-300">Modern two-phase immersion uses fluids like 3M Novec that boil at 34-61C (safe for electronics). Servers sit in tanks of this fluid. Heat causes boiling, vapor rises to a condenser, and liquid drips back. PUE can drop below 1.05!</p>
        </div>
      </div>
      <button
        onClick={() => { onPhaseComplete?.(); goToNextPhase(); }}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl"
      >
        Explore Real-World Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>
      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {applications.map((app, index) => (
          <button
            key={index}
            onClick={() => setActiveAppTab(index)}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppTab === index ? 'bg-purple-600 text-white'
              : completedApps.has(index) ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.icon} {app.title.split(' ')[0]}
          </button>
        ))}
      </div>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{applications[activeAppTab].icon}</span>
          <h3 className="text-xl font-bold text-white">{applications[activeAppTab].title}</h3>
        </div>
        <p className="text-lg text-slate-300 mb-3">{applications[activeAppTab].description}</p>
        <p className="text-sm text-slate-400">{applications[activeAppTab].details}</p>
        {!completedApps.has(activeAppTab) && (
          <button
            onClick={() => handleAppComplete(activeAppTab)}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium"
          >
            Mark as Understood
          </button>
        )}
      </div>
      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">{applications.map((_, i) => (<div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`} />))}</div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>
      {completedApps.size >= 4 && (
        <button
          onClick={() => { onPhaseComplete?.(); goToNextPhase(); }}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl"
        >
          Take the Knowledge Test
        </button>
      )}
    </div>
  );

  const renderTest = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Knowledge Assessment</h2>
      {!showTestResults ? (
        <div className="space-y-6 max-w-2xl w-full">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-white font-medium mb-3">{qIndex + 1}. {q.question}</p>
              <div className="grid gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onClick={() => handleTestAnswer(qIndex, oIndex)}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${testAnswers[qIndex] === oIndex ? 'bg-purple-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={() => setShowTestResults(true)}
            disabled={testAnswers.includes(-1)}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={`w-full py-4 rounded-xl font-semibold text-lg ${testAnswers.includes(-1) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'}`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center">
          <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🎉' : '📚'}</div>
          <h3 className="text-2xl font-bold text-white mb-2">Score: {calculateScore()}/10</h3>
          <p className="text-slate-300 mb-6">{calculateScore() >= 7 ? 'Excellent! You\'ve mastered liquid cooling!' : 'Keep studying! Review and try again.'}</p>
          {calculateScore() >= 7 ? (
            <button
              onClick={() => { onCorrectAnswer?.(); onPhaseComplete?.(); goToNextPhase(); }}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
            >
              Claim Your Mastery Badge
            </button>
          ) : (
            <button
              onClick={() => { setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); onIncorrectAnswer?.(); }}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl"
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
      <div className="bg-gradient-to-br from-purple-900/50 via-blue-900/50 to-cyan-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">💧</div>
        <h1 className="text-3xl font-bold text-white mb-4">Liquid Cooling Master!</h1>
        <p className="text-xl text-slate-300 mb-6">You've mastered liquid cooling heat transfer!</p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🌡️</div><p className="text-sm text-slate-300">Specific Heat</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">⚡</div><p className="text-sm text-slate-300">Conductivity</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🔥</div><p className="text-sm text-slate-300">Two-Phase Cooling</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🛁</div><p className="text-sm text-slate-300">Immersion</p></div>
        </div>
        <button
          onClick={() => onPhaseComplete?.()}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl"
        >
          Complete
        </button>
      </div>
    </div>
  );

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
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="relative pt-8 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default LiquidCoolingRenderer;
